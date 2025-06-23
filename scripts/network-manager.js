/**
 * Network Manager
 * Handles network switching, searching, and management
 */
class NetworkManager {
    constructor() {
        this.networks = [];
        this.currentNetwork = CURRENT_NETWORK;
        this.searchCache = new Map();
        this.lastSearchTime = 0;
    }

    /**
     * Initialize network manager
     */
    async init() {
        try {
            // Load networks from chainlist if not already loaded
            if (AVAILABLE_NETWORKS.length === 0) {
                console.log('Networks not loaded yet, loading from chainlist...');
                await this.loadChainlistNetworks();
            } else {
                console.log(`Using ${AVAILABLE_NETWORKS.length} pre-loaded networks`);
                this.networks = AVAILABLE_NETWORKS;
            }

            // Set default current network if not set
            if (!this.currentNetwork) {
                this.currentNetwork = LEGACY_NETWORKS.mainnet;
                this.updateCurrentNetworkDisplay();
            }

            // Set up legacy networks as fallback
            this.networks = Object.values(LEGACY_NETWORKS);
            
            // Set current network to mainnet by default
            this.currentNetwork = LEGACY_NETWORKS.mainnet;
            this.updateCurrentNetworkDisplay();

            return { success: true, networksCount: this.networks.length };
        } catch (error) {
            console.error('Failed to initialize NetworkManager:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load networks from chainlist API
     */
    async loadChainlistNetworks() {
        try {
            console.log('Loading networks from chainlist.org...');
            const response = await fetch(CHAINLIST_API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const chainlistData = await response.json();
            
            if (!Array.isArray(chainlistData)) {
                throw new Error('Invalid chainlist data format');
            }

            // Process and store networks
            this.networks = this.processChainlistData(chainlistData);
            
            // Update global variables
            AVAILABLE_NETWORKS = this.networks;
            
            console.log(`Loaded ${this.networks.length} networks from chainlist.org`);
            return { success: true, count: this.networks.length };
            
        } catch (error) {
            console.error('Failed to load networks from chainlist:', error);
            
            // Fallback to legacy networks
            this.networks = Object.values(LEGACY_NETWORKS);
            AVAILABLE_NETWORKS = this.networks;
            
            console.log('Using fallback legacy networks');
            return { success: false, error: error.message, fallback: true };
        }
    }

    /**
     * Process chainlist data and return formatted networks
     */
    processChainlistData(chainlistData) {
        console.log('Processing chainlist data into Network instances...');
        
        // Use the Network class to create instances from chainlist data
        const networkInstances = Network.fromChainlistArray(chainlistData);
        
        // Filter out networks without valid RPC URLs
        const validNetworks = networkInstances.filter(network => {
            const validation = network.validate();
            if (!validation.isValid) {
                console.warn(`Invalid network ${network.name}:`, validation.errors);
                return false;
            }
            return true;
        });
        
        console.log(`Processed ${validNetworks.length} valid networks from ${chainlistData.length} total`);
        return validNetworks;
    }

    /**
     * Search networks by name, chain, or chain ID (updated for Network class)
     */
    searchNetworks(query, includeTestnets = true) {
        if (!query || query.length < 1) {
            return this.getFilteredNetworks(20);
        }

        const searchTerm = query.toLowerCase().trim();
        const cacheKey = `${searchTerm}_${includeTestnets}`;
        
        // Return cached results if available and recent
        if (this.searchCache.has(cacheKey) && Date.now() - this.lastSearchTime < 5000) {
            return this.searchCache.get(cacheKey);
        }

        const results = this.networks.filter(network => {
            // Use Network class properties for filtering
            const isTestnet = network instanceof Network ? network.isTestnet : (network.type === 'testnet');
            if (!includeTestnets && isTestnet) return false;
            
            return network.name.toLowerCase().includes(searchTerm) ||
                   network.chain.toLowerCase().includes(searchTerm) ||
                   network.chainId.toString().includes(searchTerm) ||
                   network.shortName.toLowerCase().includes(searchTerm);
        });

        // Cache results
        this.searchCache.set(cacheKey, results);
        this.lastSearchTime = Date.now();

        return results.slice(0, 50); // Limit results
    }

    /**
     * Get filtered networks (popular networks first, updated for Network class)
     */
    getFilteredNetworks(limit = 20) {
        const popularChainIds = [1, 137, 56, 43114, 250, 42161, 10, 8453]; // ETH, Polygon, BSC, Avalanche, Fantom, Arbitrum, Optimism, Base
        const popular = this.networks.filter(n => popularChainIds.includes(n.chainId));
        
        // Use Network class properties for filtering
        const others = this.networks.filter(n => {
            const isMainnet = n instanceof Network ? n.isMainnet : (n.type === 'mainnet');
            return !popularChainIds.includes(n.chainId) && isMainnet;
        });
        
        return [...popular, ...others].slice(0, limit);
    }

    /**
     * Switch to a network by chain ID (updated to work with Network class)
     */
    async switchToNetwork(chainId) {
        try {
            let network = this.networks.find(n => n.chainId === chainId);
            if (!network) {
                // Try to find in AVAILABLE_NETWORKS if not in local networks
                const globalNetwork = AVAILABLE_NETWORKS.find(n => n.chainId === chainId);
                if (!globalNetwork) {
                    throw new Error(`Network with chain ID ${chainId} not found`);
                }
                
                // Add to local networks
                this.networks.push(globalNetwork);
                network = globalNetwork;
            }

            // Ensure we have a Network instance
            if (!(network instanceof Network)) {
                console.log('Converting legacy network to Network instance');
                network = NetworkUtils.createNetworkFromLegacy(network);
            }

            console.log(`Switching to network: ${network.name} (Chain ID: ${chainId})`);

            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast(`Switching to ${network.name}...`, 'info');
            }
            
            // **CRITICAL FIX: Synchronize all network states**
            this.currentNetwork = network;
            CURRENT_NETWORK = network;
            
            // Update NETWORKS global object using Network class properties
            if (network.isMainnet || network.type === 'mainnet') {
                NETWORKS.mainnet = network;
            } else {
                NETWORKS.testnet = network;
            }
            
            // **Synchronize WalletManager network state**
            console.log('🔧 NetworkManager: Checking wallet manager for network switch...');
            console.log('  walletManager exists:', typeof walletManager !== 'undefined');
            console.log('  walletManager is not null:', walletManager !== null);
            console.log('  walletManager current chain ID before:', walletManager?.currentChainId);
            
            if (typeof walletManager !== 'undefined' && walletManager !== null) {
                try {
                    // Use wallet manager's switchNetwork method for proper network switching
                    console.log(`🔧 Calling walletManager.switchNetwork(${chainId})...`);
                    const switchResult = walletManager.switchNetwork(chainId);
                    console.log('🔧 Switch result:', switchResult);
                    
                    if (switchResult.success) {
                        console.log(`✅ WalletManager switched to ${switchResult.network.name}`);
                        console.log('  walletManager chain ID after switch:', walletManager.currentChainId);
                        
                        // Force refresh network settings to ensure everything is up to date
                        if (typeof walletManager.refreshNetworkSettings === 'function') {
                            console.log('🔧 Calling refreshNetworkSettings...');
                            walletManager.refreshNetworkSettings();
                        }
                    } else {
                        console.warn('❌ WalletManager switch failed:', switchResult.message);
                    }
                } catch (walletError) {
                    console.warn('❌ Failed to switch WalletManager network:', walletError);
                    // Fallback: manually update properties (chain ID is now handled by CURRENT_NETWORK)
                    console.log('🔧 Using fallback manual update...');
                    CURRENT_NETWORK = network; // Update global network (single source of truth)
                    walletManager.wallets = [];
                    walletManager.isInitialized = false;
                    walletManager.web3 = null;
                    walletManager.rpcUrl = network.rpcUrl || network.getAllRpcUrls()?.[0];
                    walletManager.usdtAddress = NetworkUtils.getUSDTAddress(chainId);
                    walletManager._usdtValidated = false;
                    console.log('  Fallback: set global network to:', CURRENT_NETWORK.name);
                    console.log('  Fallback: set USDT address to:', walletManager.usdtAddress);
                }
            } else {
                console.warn('⚠️ WalletManager not available during network switch');
            }
            
            // Update UI
            this.updateCurrentNetworkDisplay();
            
            // Clear existing wallet display
            if (typeof uiController !== 'undefined' && uiController.clearDisplay) {
                uiController.clearDisplay();
            }
            
            // Show success message
            const message = walletManager && walletManager.wallets && walletManager.wallets.length > 0 
                ? `Switched to ${network.name}. Please re-initialize with your seed phrase.`
                : `Switched to ${network.name}`;
                
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast(message, 'success');
            }
            
            // Hide search results
            this.hideSearchResults();
            
            console.log(`Successfully switched to ${network.name} (Chain ID: ${chainId})`);
            console.log('Current network states synchronized:', {
                networkManager: this.currentNetwork.name,
                globalCurrent: CURRENT_NETWORK?.name,
                walletManager: walletManager?.getCurrentNetwork()?.name
            });
            
            return true;
        } catch (error) {
            console.error('Failed to switch network:', error);
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast(`Failed to switch network: ${error.message}`, 'error');
            }
            return false;
        }
    }

    /**
     * Get current network (with fallback)
     */
    getCurrentNetwork() {
        return this.currentNetwork || CURRENT_NETWORK || LEGACY_NETWORKS.mainnet;
    }

    /**
     * Get HTML for network icon (handles both image URLs and FontAwesome classes)
     */
    getIconHtml(icon, size = 'small') {
        if (!icon) return '<i class="fas fa-globe me-1"></i>';
        
        // Check if it's an image URL
        if (icon.startsWith('http')) {
            let sizeClass = 'network-icon-small';
            if (size === 'medium') sizeClass = 'network-icon';
            else if (size === 'large') sizeClass = 'network-icon-large';
            
            return `<img src="${icon}" class="${sizeClass} me-1" alt="Network icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                    <i class="fas fa-globe me-1" style="display: none;"></i>`;
        }
        
        // FontAwesome icon
        return `<i class="${icon} me-1"></i>`;
    }

    /**
     * Update the current network display in UI (updated for Network class)
     */
    updateCurrentNetworkDisplay() {
        const network = this.getCurrentNetwork();
        
        const currentNetworkBadge = document.getElementById('currentNetwork');
        const currentRPC = document.getElementById('currentRPC');
        const currentChainId = document.getElementById('currentChainId');
        const currentCurrency = document.getElementById('currentCurrency');

        if (currentNetworkBadge && network) {
            // Use Network class methods for better icon handling
            let iconHtml;
            if (network instanceof Network) {
                iconHtml = this.getIconHtml(network.iconUrl || network.getFontAwesomeIcon());
            } else {
                iconHtml = this.getIconHtml(network.icon);
            }
            
            currentNetworkBadge.innerHTML = `${iconHtml}${network.name}`;
            
            // Use Network class properties for badge styling
            const badgeClass = network instanceof Network 
                ? (network.isTestnet ? 'testnet' : 'mainnet')
                : (network.type || 'mainnet');
            currentNetworkBadge.className = `badge bg-${badgeClass}`;
        }

        if (currentRPC && network) {
            // Use Network class methods for RPC URL
            const rpcUrl = network instanceof Network 
                ? (network.rpcUrl || network.getAllRpcUrls()?.[0] || 'Not available')
                : (network.rpcUrl || network.rpc?.[0] || 'Not available');
            currentRPC.textContent = rpcUrl;
        }

        if (currentChainId && network) {
            currentChainId.textContent = `Chain ID: ${network.chainId}`;
        }

        if (currentCurrency && network) {
            currentCurrency.textContent = network.nativeCurrency?.symbol || 'ETH';
        }

        // Update quick network buttons
        this.updateQuickNetworkButtons();
        
        // Update RPC URL field placeholder
        if (typeof updateRpcUrlField === 'function') {
            const networkType = network instanceof Network 
                ? (network.isTestnet ? 'testnet' : 'mainnet')
                : (network.type || 'mainnet');
            updateRpcUrlField(networkType);
        }
    }

    /**
     * Update quick network buttons active state
     */
    updateQuickNetworkButtons() {
        const network = this.getCurrentNetwork();
        const quickButtons = document.querySelectorAll('.quick-network-buttons .btn');
        
        quickButtons.forEach(btn => {
            const chainId = parseInt(btn.getAttribute('data-chain-id') || btn.getAttribute('onclick')?.match(/\d+/)?.[0]);
            if (chainId === network?.chainId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Show search results dropdown
     */
    showSearchResults(networks) {
        const searchResults = document.getElementById('networkSearchResults');
        if (!searchResults) return;

        if (networks.length === 0) {
            searchResults.innerHTML = '<div class="network-search-empty">No networks found</div>';
        } else {
            searchResults.innerHTML = networks.map(network => {
                let iconHtml;
                if (network.icon && network.icon.startsWith('http')) {
                    iconHtml = `<div class="network-result-icon">
                        <img src="${network.icon}" alt="Network icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                        <i class="fas fa-globe" style="display: none;"></i>
                    </div>`;
                } else {
                    iconHtml = `<div class="network-result-icon">
                        <i class="${network.icon || 'fas fa-globe'}"></i>
                    </div>`;
                }
                
                const isTestnet = network instanceof Network ? network.isTestnet : (network.type === 'testnet');
                
                return `
                    <div class="network-search-result" onclick="switchToQuickNetwork(${network.chainId})">
                        <div class="network-result-info">
                            ${iconHtml}
                            <div class="network-result-details">
                                <h6>${network.name}</h6>
                                <small>Chain ID: ${network.chainId} • ${network.nativeCurrency?.symbol || 'ETH'}</small>
                            </div>
                        </div>
                        <div class="network-result-chain ${isTestnet ? 'network-result-testnet' : ''}">
                            ${network.chain || 'Unknown'}
                        </div>
                    </div>
                `;
            }).join('');
        }

        searchResults.style.display = 'block';
    }

    /**
     * Hide search results dropdown
     */
    hideSearchResults() {
        const searchResults = document.getElementById('networkSearchResults');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }

    /**
     * Show network details modal
     */
    showNetworkDetails() {
        const network = this.getCurrentNetwork();
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title d-flex align-items-center">
                            ${this.getIconHtml(network.icon, 'medium').replace('me-1', 'me-2')}
                            ${network.name} Details
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Network Information</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>Name:</strong></td><td>${network.name || 'Unknown'}</td></tr>
                                    <tr><td><strong>Chain ID:</strong></td><td>${network.chainId || 'Unknown'}</td></tr>
                                    <tr><td><strong>Type:</strong></td><td class="text-capitalize">${network.type || 'mainnet'}</td></tr>
                                    <tr><td><strong>Currency:</strong></td><td>${network.nativeCurrency?.symbol || 'ETH'}</td></tr>
                                    <tr><td><strong>Chain:</strong></td><td>${network.chain || 'Unknown'}</td></tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>Connection Details</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>RPC URL:</strong></td><td class="text-break">${network.rpcUrl || 'Not available'}</td></tr>
                                    <tr><td><strong>USDT Address:</strong></td><td class="text-break">${network.usdtAddress || 'Not available'}</td></tr>
                                </table>
                                
                                ${network.explorers && network.explorers.length > 0 ? `
                                <h6>Block Explorers</h6>
                                <ul class="list-unstyled">
                                    ${network.explorers.map(explorer => `
                                        <li><a href="${explorer.url}" target="_blank" rel="noopener">${explorer.name}</a></li>
                                    `).join('')}
                                </ul>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${network.rpc && network.rpc.length > 1 ? `
                        <div class="mt-3">
                            <h6>Available RPC Endpoints</h6>
                            <div class="list-group">
                                ${network.rpc.slice(0, 5).map(rpc => `
                                    <div class="list-group-item">
                                        <small class="text-break">${typeof rpc === 'string' ? rpc : rpc.url || 'Invalid RPC'}</small>
                                    </div>
                                `).join('')}
                                ${network.rpc.length > 5 ? `<small class="text-muted">... and ${network.rpc.length - 5} more</small>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Clean up modal after it's hidden
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }
}

// Global network manager instance
let networkManager = null;

// NetworkManager will be initialized in main.js
// This ensures proper coordination with the Network class and constants loading

// Global functions for UI interaction
function searchNetworks() {
    const searchInput = document.getElementById('networkSearchInput');
    const includeTestnets = document.getElementById('includeTestnets')?.checked || false;
    
    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }
    
    // Try to get networkManager from different sources
    const manager = networkManager || window.networkManager;
    
    if (!manager) {
        console.warn('Network manager not found or not initialized yet');
        return;
    }
    
    const query = searchInput.value.trim();
    
    if (query.length === 0) {
        manager.hideSearchResults();
        return;
    }
    
    console.log('Searching networks with query:', query, 'includeTestnets:', includeTestnets);
    console.log('NetworkManager has', manager.networks ? manager.networks.length : 0, 'networks loaded');
    
    const results = manager.searchNetworks(query, includeTestnets);
    console.log('Search results:', results.length, 'networks found');
    
    if (results.length === 0) {
        console.log('No networks found. Available networks:', manager.networks?.slice(0, 5).map(n => n.name));
    }
    
    manager.showSearchResults(results);
}

// Load chainlist networks function
async function loadChainlistNetworks() {
    const manager = networkManager || window.networkManager;
    
    if (!manager) {
        console.error('NetworkManager not initialized');
        return;
    }
    
    const result = await manager.loadChainlistNetworks();
    
    if (result.success) {
        console.log(`Loaded ${result.count} networks from chainlist`);
        if (typeof uiController !== 'undefined' && uiController.showToast) {
            uiController.showToast(`Loaded ${result.count} networks`, 'success');
        }
    } else {
        console.error('Failed to load networks:', result.error);
        if (typeof uiController !== 'undefined' && uiController.showToast) {
            uiController.showToast('Failed to load networks', 'error');
        }
    }
}

// Switch to quick network
function switchToQuickNetwork(chainId) {
    const manager = networkManager || window.networkManager;
    
    if (manager) {
        console.log('Switching to network with chain ID:', chainId);
        manager.switchToNetwork(chainId);
    } else {
        console.warn('NetworkManager not available for network switch');
    }
}

// Show network details
function showNetworkDetails() {
    const manager = networkManager || window.networkManager;
    
    if (manager) {
        manager.showNetworkDetails();
    } else {
        console.warn('NetworkManager not available for showing network details');
    }
}

// Hide search results on click outside
document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('.network-search-section');
    if (searchContainer && !searchContainer.contains(event.target)) {
        const manager = networkManager || window.networkManager;
        if (manager) {
            manager.hideSearchResults();
        }
    }
});

// Handle include testnets toggle
document.addEventListener('change', function(event) {
    if (event.target.id === 'includeTestnets') {
        searchNetworks(); // Re-run search with new filter
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NetworkManager, networkManager };
} 