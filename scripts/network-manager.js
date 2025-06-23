/**
 * Network Manager
 * Handles loading networks from chainlist.org and network switching functionality
 */

class NetworkManager {
    constructor() {
        this.networks = [];
        this.filteredNetworks = [];
        this.currentNetwork = CURRENT_NETWORK;
        this.searchTimeout = null;
        this.isLoading = false;
    }

    /**
     * Initialize the network manager
     */
    async init() {
        try {
            // Small delay to ensure UI controller is loaded
            if (typeof uiController === 'undefined') {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            await this.loadChainlistNetworks();
            this.updateCurrentNetworkDisplay();
        } catch (error) {
            console.warn('Failed to load chainlist networks, using legacy networks:', error);
            this.networks = Object.values(LEGACY_NETWORKS);
            this.filteredNetworks = [...this.networks];
            this.currentNetwork = LEGACY_NETWORKS.mainnet;
            this.updateCurrentNetworkDisplay();
        }
    }

    /**
     * Load networks from chainlist.org API
     */
    async loadChainlistNetworks() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            // Use uiController if available, otherwise console log
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast('Loading networks from chainlist.org...', 'info');
            } else {
                console.log('Loading networks from chainlist.org...');
            }
            
            const response = await fetch(CHAINLIST_API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.processChainlistData(data);
            
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast(`Loaded ${this.networks.length} networks successfully!`, 'success');
            } else {
                console.log(`Loaded ${this.networks.length} networks successfully!`);
            }
        } catch (error) {
            console.error('Failed to load chainlist networks:', error);
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast('Failed to load network list. Using default networks.', 'warning');
            } else {
                console.warn('Failed to load network list. Using default networks.');
            }
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Process chainlist data and convert to our network format
     */
    processChainlistData(chainlistData) {
        const networks = [];
        
        chainlistData.forEach(network => {
            // Skip networks without RPC endpoints
            if (!network.rpc || network.rpc.length === 0) return;
            
            // Skip deprecated or disabled networks
            if (network.status === 'deprecated' || network.status === 'disabled') return;

            const processedNetwork = {
                name: network.name,
                chainId: network.chainId,
                rpcUrl: NetworkUtils.getBestRpcUrl(network.rpc),
                explorerUrl: network.explorers?.[0]?.url || '',
                nativeCurrency: {
                    symbol: network.nativeCurrency?.symbol || 'ETH',
                    decimals: network.nativeCurrency?.decimals || 18
                },
                usdtAddress: NetworkUtils.getUSDTAddress(network.chainId),
                type: NetworkUtils.isTestnet(network) ? 'testnet' : 'mainnet',
                icon: NetworkUtils.getNetworkIcon(network),
                chain: network.chain || 'UNKNOWN',
                shortName: network.shortName || network.name,
                infoURL: network.infoURL || '',
                faucets: network.faucets || []
            };

            networks.push(processedNetwork);
        });

        // Sort networks by popularity (mainnet first, then by chain ID)
        networks.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'mainnet' ? -1 : 1;
            }
            return a.chainId - b.chainId;
        });

        // Add legacy networks at the beginning for better UX
        const legacyNetworks = Object.values(LEGACY_NETWORKS);
        this.networks = [...legacyNetworks, ...networks.filter(n => 
            !legacyNetworks.some(ln => ln.chainId === n.chainId)
        )];
        
        this.filteredNetworks = [...this.networks];
        AVAILABLE_NETWORKS = [...this.networks];
    }

    /**
     * Search networks based on query
     */
    searchNetworks(query, includeTestnets = true) {
        if (!query.trim()) {
            this.filteredNetworks = includeTestnets ? 
                this.networks : 
                this.networks.filter(n => n.type === 'mainnet');
            return;
        }

        const searchTerm = query.toLowerCase();
        this.filteredNetworks = this.networks.filter(network => {
            const matchesSearch = 
                (network.name && network.name.toLowerCase().includes(searchTerm)) ||
                (network.chain && network.chain.toLowerCase().includes(searchTerm)) ||
                (network.shortName && network.shortName.toLowerCase().includes(searchTerm)) ||
                (network.chainId && network.chainId.toString().includes(searchTerm));

            return matchesSearch && (includeTestnets || network.type === 'mainnet');
        });
    }

    /**
     * Get filtered networks (limited for UI performance)
     */
    getFilteredNetworks(limit = 20) {
        return this.filteredNetworks.slice(0, limit);
    }

    /**
     * Switch to a network by chain ID
     */
    async switchToNetwork(chainId) {
        const network = this.networks.find(n => n.chainId === parseInt(chainId));
        if (!network) {
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast(`Network with chain ID ${chainId} not found`, 'error');
            } else {
                console.error(`Network with chain ID ${chainId} not found`);
            }
            return false;
        }

        // Security validation for network switching
        if (network.rpcUrl) {
            const rpcValidation = NetworkSecurity.validateRpcUrl(network.rpcUrl);
            if (!rpcValidation.valid) {
                if (typeof uiController !== 'undefined' && uiController.showToast) {
                    uiController.showToast(`Network security check failed: ${rpcValidation.error}`, 'error');
                } else {
                    console.error(`Network security check failed: ${rpcValidation.error}`);
                }
                return false;
            }
            
            if (rpcValidation.warning) {
                const proceed = confirm(`Network Warning: ${rpcValidation.warning}\n\nDo you want to continue?`);
                if (!proceed) {
                    return false;
                }
            }
        }

        try {
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast(`Switching to ${network.name}...`, 'info');
            } else {
                console.log(`Switching to ${network.name}...`);
            }
            
            // Update current network
            this.currentNetwork = network;
            CURRENT_NETWORK = network;
            
            // Update UI
            this.updateCurrentNetworkDisplay();
            
            // Clear existing wallets and balances if wallet manager is initialized
            if (typeof walletManager !== 'undefined' && walletManager !== null && walletManager.wallets) {
                walletManager.wallets = [];
                
                // Clear UI display
                if (typeof uiController !== 'undefined' && uiController.clearDisplay) {
                    uiController.clearDisplay();
                }
                
                if (typeof uiController !== 'undefined' && uiController.showToast) {
                    uiController.showToast(`Switched to ${network.name}. Please re-initialize with your seed phrase.`, 'info');
                } else {
                    console.log(`Switched to ${network.name}. Please re-initialize with your seed phrase.`);
                }
            } else {
                // No wallet manager yet, just show success
                if (typeof uiController !== 'undefined' && uiController.showToast) {
                    uiController.showToast(`Switched to ${network.name}`, 'success');
                } else {
                    console.log(`Switched to ${network.name}`);
                }
            }
            
            // Hide search results
            this.hideSearchResults();
            
            return true;
        } catch (error) {
            console.error('Failed to switch network:', error);
            if (typeof uiController !== 'undefined' && uiController.showToast) {
                uiController.showToast(`Failed to switch to ${network.name}`, 'error');
            } else {
                console.error(`Failed to switch to ${network.name}`);
            }
            return false;
        }
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
     * Update the current network display in UI
     */
    updateCurrentNetworkDisplay() {
        const currentNetworkBadge = document.getElementById('currentNetwork');
        const currentRPC = document.getElementById('currentRPC');
        const currentChainId = document.getElementById('currentChainId');
        const currentCurrency = document.getElementById('currentCurrency');

        if (currentNetworkBadge) {
            const iconHtml = this.getIconHtml(this.currentNetwork.icon);
            currentNetworkBadge.innerHTML = `${iconHtml}${this.currentNetwork.name}`;
            currentNetworkBadge.className = `badge bg-${this.currentNetwork.type}`;
        }

        if (currentRPC) {
            currentRPC.textContent = this.currentNetwork.rpcUrl;
        }

        if (currentChainId) {
            currentChainId.textContent = `Chain ID: ${this.currentNetwork.chainId}`;
        }

        if (currentCurrency) {
            currentCurrency.textContent = this.currentNetwork.nativeCurrency?.symbol || 'ETH';
        }

        // Update quick network buttons
        this.updateQuickNetworkButtons();
    }

    /**
     * Update quick network buttons active state
     */
    updateQuickNetworkButtons() {
        const quickButtons = document.querySelectorAll('.quick-network-buttons .btn');
        quickButtons.forEach(btn => {
            const chainId = parseInt(btn.getAttribute('data-chain-id') || btn.getAttribute('onclick')?.match(/\d+/)?.[0]);
            if (chainId === this.currentNetwork.chainId) {
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
                
                return `
                    <div class="network-search-result" onclick="networkManager.switchToNetwork(${network.chainId})">
                        <div class="network-result-info">
                            ${iconHtml}
                            <div class="network-result-details">
                                <h6>${network.name}</h6>
                                <small>Chain ID: ${network.chainId} • ${network.nativeCurrency?.symbol || 'ETH'}</small>
                            </div>
                        </div>
                        <div class="network-result-chain ${network.type === 'testnet' ? 'network-result-testnet' : ''}">
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
        const network = this.currentNetwork;
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
                                    <tr><td><strong>Native Currency:</strong></td><td>${network.nativeCurrency?.symbol || 'ETH'}</td></tr>
                                    ${network.shortName ? `<tr><td><strong>Short Name:</strong></td><td>${network.shortName}</td></tr>` : ''}
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>Endpoints</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>RPC URL:</strong></td><td class="text-break">${network.rpcUrl}</td></tr>
                                    ${network.explorerUrl ? `<tr><td><strong>Explorer:</strong></td><td><a href="${network.explorerUrl}" target="_blank" class="text-break">${network.explorerUrl}</a></td></tr>` : ''}
                                    ${network.usdtAddress ? `<tr><td><strong>USDT Address:</strong></td><td class="text-break font-monospace">${network.usdtAddress}</td></tr>` : ''}
                                </table>
                                ${network.infoURL ? `<p><strong>More Info:</strong> <a href="${network.infoURL}" target="_blank">${network.infoURL}</a></p>` : ''}
                            </div>
                        </div>
                        ${network.faucets && network.faucets.length > 0 ? `
                            <div class="mt-3">
                                <h6>Faucets (for testnet):</h6>
                                <ul class="list-unstyled">
                                    ${network.faucets.map(faucet => `<li><a href="${faucet}" target="_blank">${faucet}</a></li>`).join('')}
                                </ul>
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
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }
}

// Initialize network manager
const networkManager = new NetworkManager();

// Global functions for HTML event handlers
function searchNetworks() {
    const query = document.getElementById('networkSearchInput').value;
    const includeTestnets = document.getElementById('includeTestnets').checked;
    
    // Clear previous timeout
    if (networkManager.searchTimeout) {
        clearTimeout(networkManager.searchTimeout);
    }
    
    // Debounce search
    networkManager.searchTimeout = setTimeout(() => {
        networkManager.searchNetworks(query, includeTestnets);
        const results = networkManager.getFilteredNetworks();
        
        if (query.trim()) {
            networkManager.showSearchResults(results);
        } else {
            networkManager.hideSearchResults();
        }
    }, 300);
}

function loadChainlistNetworks() {
    const btn = document.getElementById('refreshNetworksBtn');
    const icon = btn.querySelector('i');
    
    icon.className = 'fas fa-spinner fa-spin';
    btn.disabled = true;
    
    networkManager.loadChainlistNetworks()
        .finally(() => {
            icon.className = 'fas fa-sync-alt';
            btn.disabled = false;
        });
}

function switchToQuickNetwork(chainId) {
    networkManager.switchToNetwork(chainId);
}

function showNetworkDetails() {
    networkManager.showNetworkDetails();
}

// Hide search results when clicking outside
document.addEventListener('click', (e) => {
    const searchContainer = document.querySelector('.network-search-section');
    if (searchContainer && !searchContainer.contains(e.target)) {
        networkManager.hideSearchResults();
    }
});

// Prevent hiding when clicking inside search results
document.addEventListener('click', (e) => {
    if (e.target.closest('#networkSearchResults')) {
        e.stopPropagation();
    }
});

// Clear search input shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('networkSearchInput');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.value = '';
            searchNetworks();
        }
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NetworkManager, networkManager };
} 