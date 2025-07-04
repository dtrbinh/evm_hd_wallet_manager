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
                Logger.info('Loading networks from chainlist...');
                await this.loadChainlistNetworks();
            } else {
                Logger.info(`Using ${AVAILABLE_NETWORKS.length} pre-loaded networks`);
                this.networks = AVAILABLE_NETWORKS;
            }

            // Set default current network - try to find Polygon Mainnet first
            if (!this.currentNetwork) {
                // Try to find Polygon Mainnet (Chain ID 137) in the loaded networks
                const polygonMainnet = this.networks.find(n => n.chainId === 137);
                if (polygonMainnet) {
                    this.currentNetwork = polygonMainnet;
                    Logger.success('Set Polygon Mainnet as default network');
                } else {
                    // Fallback to legacy mainnet if Polygon not found
                    this.currentNetwork = LEGACY_NETWORKS.mainnet;
                    Logger.warn('Polygon Mainnet not found, using legacy mainnet');
                }
                this.updateCurrentNetworkDisplay();
            }

            Logger.success(`NetworkManager initialized with ${this.networks.length} networks`);
            return { success: true, networksCount: this.networks.length };
        } catch (error) {
            Logger.error('NetworkManager initialization failed', error);
            
            // Fallback to legacy networks only if everything fails
            this.networks = Object.values(LEGACY_NETWORKS);
            this.currentNetwork = LEGACY_NETWORKS.mainnet;
            this.updateCurrentNetworkDisplay();
            
            return { success: false, error: error.message, networksCount: this.networks.length };
        }
    }

    /**
     * Load networks from chainlist API
     */
    async loadChainlistNetworks() {
        try {
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
            
            Logger.success(`Loaded ${this.networks.length} networks from chainlist.org`);
            return { success: true, count: this.networks.length };
            
        } catch (error) {
            Logger.error('Failed to load networks from chainlist', error);
            
            // Fallback to legacy networks
            this.networks = Object.values(LEGACY_NETWORKS);
            AVAILABLE_NETWORKS = this.networks;
            
            Logger.warn('Using fallback legacy networks');
            return { success: false, error: error.message, fallback: true };
        }
    }

    /**
     * Process chainlist data and return formatted networks
     */
    processChainlistData(chainlistData) {
        // Use the Network class to create instances from chainlist data
        const networkInstances = Network.fromChainlistArray(chainlistData);
        
        // Filter out networks without valid RPC URLs
        const validNetworks = networkInstances.filter(network => {
            const validation = network.validate();
            if (!validation.isValid) {
                Logger.debug('Network', `Invalid network ${network.name}: ${validation.errors.join(', ')}`);
                return false;
            }
            return true;
        });
        
        Logger.debug('Network', `Processed ${validNetworks.length} valid networks from ${chainlistData.length} total`);
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
            Logger.debug('Search', 'Using cached results');
            return this.searchCache.get(cacheKey);
        }

        Logger.debug('Search', `Searching ${this.networks.length} networks for "${searchTerm}"`);

        const results = this.networks.filter(network => {
            // Use Network class properties for filtering
            const isTestnet = network instanceof Network ? network.isTestnet : (network.type === 'testnet');
            if (!includeTestnets && isTestnet) return false;
            
            // Safe property access with defaults
            const name = (network.name || '').toLowerCase();
            const chain = (network.chain || '').toLowerCase();
            const chainId = network.chainId ? network.chainId.toString() : '';
            const shortName = (network.shortName || '').toLowerCase();
            
            const matches = name.includes(searchTerm) ||
                           chain.includes(searchTerm) ||
                           chainId.includes(searchTerm) ||
                           shortName.includes(searchTerm);
            
            return matches;
        });

        Logger.debug('Search', `Found ${results.length} matches before caching`);

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
                Logger.debug('Network', 'Converting legacy network to Network instance');
                network = NetworkUtils.createNetworkFromLegacy(network);
            }

            Logger.network(`Switching to ${network.name} (Chain ID: ${chainId})`);

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
            if (typeof walletManager !== 'undefined' && walletManager !== null) {
                try {
                    // Use wallet manager's switchNetwork method for proper network switching
                    const switchResult = walletManager.switchNetwork(chainId);
                    
                    if (switchResult.success) {
                        Logger.success(`WalletManager switched to ${switchResult.network.name}`);
                        
                        // Force refresh network settings to ensure everything is up to date
                        if (typeof walletManager.refreshNetworkSettings === 'function') {
                            walletManager.refreshNetworkSettings();
                        }
                    } else {
                        Logger.warn(`WalletManager switch failed: ${switchResult.message}`);
                    }
                } catch (walletError) {
                    Logger.warn('Failed to switch WalletManager network', walletError);
                    // Fallback: manually update properties (chain ID is now handled by CURRENT_NETWORK)
                    CURRENT_NETWORK = network; // Update global network (single source of truth)
                    walletManager.wallets = [];
                    walletManager.isInitialized = false;
                    walletManager.web3 = null;
                    walletManager.rpcUrl = network.rpcUrl || network.getAllRpcUrls()?.[0];
                    walletManager.usdtAddress = NetworkUtils.getUSDTAddress(chainId);
                    walletManager._usdtValidated = false;
                }
            } else {
                Logger.warn('WalletManager not available during network switch');
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
            
            Logger.success(`Successfully switched to ${network.name} (Chain ID: ${chainId})`);
            
            return true;
        } catch (error) {
            Logger.error('Failed to switch network', error);
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
                // Use Network class methods for better icon handling
                let iconHtml;
                if (network instanceof Network) {
                    // Use Network class icon methods
                    const iconUrl = network.iconUrl;
                    const fontAwesomeIcon = network.getFontAwesomeIcon();
                    
                    if (iconUrl) {
                        iconHtml = `<div class="network-result-icon">
                            <img src="${iconUrl}" alt="${network.name} icon" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                            <i class="${fontAwesomeIcon}" style="display: none;"></i>
                        </div>`;
                    } else {
                        iconHtml = `<div class="network-result-icon">
                            <i class="${fontAwesomeIcon}"></i>
                        </div>`;
                    }
                } else {
                    // Fallback for legacy networks
                    if (network.icon && network.icon.startsWith('http')) {
                        iconHtml = `<div class="network-result-icon">
                            <img src="${network.icon}" alt="${network.name} icon" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                            <i class="fas fa-globe" style="display: none;"></i>
                        </div>`;
                    } else {
                        iconHtml = `<div class="network-result-icon">
                            <i class="${network.icon || 'fas fa-globe'}"></i>
                        </div>`;
                    }
                }
                
                const isTestnet = network instanceof Network ? network.isTestnet : (network.type === 'testnet');
                const chainName = network.chain || 'Unknown';
                const nativeSymbol = network.nativeCurrency?.symbol || 'ETH';
                
                return `
                    <div class="network-search-result" onclick="switchToQuickNetwork(${network.chainId})" 
                         title="Click to switch to ${network.name}">
                        <div class="network-result-info">
                            ${iconHtml}
                            <div class="network-result-details">
                                <h6 class="network-result-name">${network.name}</h6>
                                <small class="network-result-meta">
                                    Chain ID: ${network.chainId} • ${nativeSymbol}
                                    ${network.shortName ? ` • ${network.shortName}` : ''}
                                </small>
                            </div>
                        </div>
                        <div class="network-result-chain ${isTestnet ? 'network-result-testnet' : 'network-result-mainnet'}">
                            ${chainName}
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
        Logger.warn('Search input not found');
        return;
    }
    
    // Try to get networkManager from different sources
    const manager = networkManager || window.networkManager;
    
    if (!manager) {
        Logger.warn('Network manager not found or not initialized yet');
        return;
    }
    
    const query = searchInput.value.trim();
    
    if (query.length === 0) {
        manager.hideSearchResults();
        return;
    }
    
    Logger.debug('Search', `Query: "${query}", Include testnets: ${includeTestnets}, Networks available: ${manager.networks ? manager.networks.length : 0}`);
    
    const results = manager.searchNetworks(query, includeTestnets);
    Logger.debug('Search', `Found ${results.length} results`);
    
    if (results.length === 0 && manager.networks?.length > 0) {
        Logger.debug('Search', `No results found. Sample networks: ${manager.networks.slice(0, 3).map(n => n.name).join(', ')}`);
    }
    
    manager.showSearchResults(results);
}

// Load chainlist networks function
async function loadChainlistNetworks() {
    const manager = networkManager || window.networkManager;
    
    if (!manager) {
        Logger.error('NetworkManager not initialized');
        return;
    }
    
    const result = await manager.loadChainlistNetworks();
    
    if (result.success) {
        Logger.success(`Loaded ${result.count} networks from chainlist`);
        if (typeof uiController !== 'undefined' && uiController.showToast) {
            uiController.showToast(`Loaded ${result.count} networks`, 'success');
        }
    } else {
        Logger.error('Failed to load networks', result.error);
        if (typeof uiController !== 'undefined' && uiController.showToast) {
            uiController.showToast('Failed to load networks', 'error');
        }
    }
}

// Switch to quick network
function switchToQuickNetwork(chainId) {
    const manager = networkManager || window.networkManager;
    
    if (manager) {
        Logger.debug('Network', `Switching to chain ID: ${chainId}`);
        manager.switchToNetwork(chainId);
    } else {
        Logger.warn('NetworkManager not available for network switch');
    }
}

// Show network details
function showNetworkDetails() {
    const manager = networkManager || window.networkManager;
    
    if (manager) {
        manager.showNetworkDetails();
    } else {
        Logger.warn('NetworkManager not available for showing network details');
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