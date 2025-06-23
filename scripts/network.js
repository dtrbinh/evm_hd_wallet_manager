/**
 * Network Class
 * Represents a blockchain network with all its properties and methods
 * Based on chainlist.org API structure
 */
class Network {
    constructor(networkData) {
        // Validate required fields
        if (!networkData || typeof networkData !== 'object') {
            throw new Error('Network data must be a valid object');
        }
        
        if (!networkData.chainId || typeof networkData.chainId !== 'number') {
            throw new Error('Network must have a valid chainId');
        }

        // Core network properties from chainlist.org API
        this.name = networkData.name || 'Unknown Network';
        this.chainId = networkData.chainId;
        this.chain = networkData.chain || '';
        this.icon = networkData.icon || null;
        this.rpc = Array.isArray(networkData.rpc) ? networkData.rpc : [];
        this.features = Array.isArray(networkData.features) ? networkData.features : [];
        this.faucets = Array.isArray(networkData.faucets) ? networkData.faucets : [];
        this.nativeCurrency = networkData.nativeCurrency || { name: 'Ether', symbol: 'ETH', decimals: 18 };
        this.infoURL = networkData.infoURL || '';
        this.shortName = networkData.shortName || '';
        this.networkId = networkData.networkId || networkData.chainId;
        this.explorers = Array.isArray(networkData.explorers) ? networkData.explorers : [];
        this.parent = networkData.parent || null;
        this.title = networkData.title || this.name;

        // Computed properties
        this.type = this._determineNetworkType();
        this.rpcUrl = this._getBestRpcUrl();
        this.usdtAddress = this._getUSDTAddress();
        this.iconUrl = this._getIconUrl();
        this.isTestnet = this.type === 'testnet';
        this.isMainnet = this.type === 'mainnet';
        
        // Additional metadata
        this.createdAt = new Date();
        this.lastUpdated = new Date();
    }

    /**
     * Determine if network is testnet based on name and features
     * @private
     */
    _determineNetworkType() {
        const testnetKeywords = [
            'test', 'testnet', 'sepolia', 'goerli', 'ropsten', 'kovan', 'rinkeby',
            'amoy', 'mumbai', 'fuji', 'chapel', 'dev', 'development', 'staging'
        ];
        
        const nameCheck = this.name.toLowerCase();
        const chainCheck = this.chain.toLowerCase();
        const shortNameCheck = this.shortName.toLowerCase();
        
        const isTestnet = testnetKeywords.some(keyword => 
            nameCheck.includes(keyword) || 
            chainCheck.includes(keyword) || 
            shortNameCheck.includes(keyword)
        );
        
        return isTestnet ? 'testnet' : 'mainnet';
    }

    /**
     * Get the best RPC URL from available endpoints
     * @private
     */
    _getBestRpcUrl() {
        if (!this.rpc || this.rpc.length === 0) {
            return null;
        }

        // Helper function to extract URL from RPC entry
        const getRpcUrl = (rpc) => {
            if (typeof rpc === 'string') return rpc;
            if (typeof rpc === 'object' && rpc.url) return rpc.url;
            return null;
        };

        // Filter out invalid entries
        const validRpcs = this.rpc.filter(rpc => {
            const url = getRpcUrl(rpc);
            return url && 
                   url.startsWith('http') && 
                   !url.includes('${') && 
                   !url.includes('YOUR_API_KEY') &&
                   !url.includes('INFURA_API_KEY') &&
                   !url.includes('ALCHEMY_API_KEY') &&
                   !url.includes('demo'); // Exclude demo endpoints
        });

        if (validRpcs.length === 0) return null;

        // Prioritize non-tracking, open source RPCs
        const priorityRpc = validRpcs.find(rpc => 
            typeof rpc === 'object' && 
            rpc.tracking === 'none' && 
            rpc.isOpenSource === true
        );
        if (priorityRpc) return getRpcUrl(priorityRpc);

        // Fallback to any non-tracking RPC
        const nonTrackingRpc = validRpcs.find(rpc => 
            typeof rpc === 'object' && rpc.tracking === 'none'
        );
        if (nonTrackingRpc) return getRpcUrl(nonTrackingRpc);

        // Last resort: use the first valid RPC
        return getRpcUrl(validRpcs[0]);
    }

    /**
     * Get USDT contract address for this network
     * @private
     */
    _getUSDTAddress() {
        const usdtAddresses = {
            1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',     // Ethereum Mainnet
            137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',   // Polygon Mainnet (USDT)
            56: '0x55d398326f99059fF775485246999027B3197955',    // BSC Mainnet
            43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // Avalanche
            250: '0x049d68029688eAbF473097a2fC38ef61633A3C7A',   // Fantom
            42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum One
            10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',    // Optimism
            8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base
            // Testnets
            11155111: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia
            80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',   // Polygon Amoy
            97: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',      // BSC Testnet
            421614: '0xf08A50178dfcDe18524640EA6618a1f965821715',  // Arbitrum Sepolia
            11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'  // Optimism Sepolia
        };
        
        return usdtAddresses[this.chainId] || null;
    }

    /**
     * Get network icon URL
     * @private
     */
    _getIconUrl() {
        if (!this.icon) return null;
        
        // If it's already a full URL, return as is
        if (this.icon.startsWith('http')) {
            return this.icon;
        }
        
        // Use LlamaO.fi icons for chainlist icons
        return `https://icons.llamao.fi/icons/chains/rsz_${this.icon}.jpg`;
    }

    /**
     * Get FontAwesome icon class for this network
     */
    getFontAwesomeIcon() {
        // For testnets, use flask icon
        if (this.isTestnet) {
            return 'fas fa-flask';
        }
        
        // Mapping based on chain or currency symbol
        const iconMap = {
            'ETH': 'fab fa-ethereum',
            'BNB': 'fas fa-coins',
            'MATIC': 'fas fa-gem',
            'POL': 'fas fa-gem',
            'AVAX': 'fas fa-mountain',
            'FTM': 'fas fa-ghost',
            'ARB': 'fas fa-layer-group',
            'OP': 'fas fa-circle',
            'BASE': 'fas fa-cube',
            'POLYGON': 'fas fa-gem',
            'BSC': 'fas fa-coins',
            'ARBITRUM': 'fas fa-layer-group',
            'OPTIMISM': 'fas fa-circle',
            'RONIN': 'fas fa-gamepad',
            'HYPE': 'fas fa-bolt'
        };
        
        const symbol = this.nativeCurrency.symbol?.toUpperCase();
        const chain = this.chain?.toUpperCase();
        
        return iconMap[symbol] || iconMap[chain] || 'fas fa-globe';
    }

    /**
     * Get all available RPC URLs
     */
    getAllRpcUrls() {
        return this.rpc.map(rpc => {
            if (typeof rpc === 'string') return rpc;
            if (typeof rpc === 'object' && rpc.url) return rpc.url;
            return null;
        }).filter(url => url !== null);
    }

    /**
     * Get RPC URLs with metadata
     */
    getRpcDetails() {
        return this.rpc.map(rpc => {
            if (typeof rpc === 'string') {
                return {
                    url: rpc,
                    tracking: 'unknown',
                    isOpenSource: null,
                    isWebSocket: rpc.startsWith('wss://')
                };
            }
            
            if (typeof rpc === 'object' && rpc.url) {
                return {
                    url: rpc.url,
                    tracking: rpc.tracking || 'unknown',
                    isOpenSource: rpc.isOpenSource || null,
                    isWebSocket: rpc.url.startsWith('wss://')
                };
            }
            
            return null;
        }).filter(rpc => rpc !== null);
    }

    /**
     * Check if network supports EIP-1559 (type 2 transactions)
     */
    supportsEIP1559() {
        return this.features.some(feature => 
            typeof feature === 'object' ? feature.name === 'EIP1559' : feature === 'EIP1559'
        );
    }

    /**
     * Check if network supports EIP-155 (replay protection)
     */
    supportsEIP155() {
        return this.features.some(feature => 
            typeof feature === 'object' ? feature.name === 'EIP155' : feature === 'EIP155'
        );
    }

    /**
     * Get primary block explorer
     */
    getPrimaryExplorer() {
        if (!this.explorers || this.explorers.length === 0) return null;
        return this.explorers[0];
    }

    /**
     * Get all block explorers
     */
    getAllExplorers() {
        return this.explorers || [];
    }

    /**
     * Check if this is a Layer 2 network
     */
    isLayer2() {
        return this.parent && this.parent.type === 'L2';
    }

    /**
     * Get parent chain information
     */
    getParentChain() {
        return this.parent || null;
    }

    /**
     * Validate network configuration
     */
    validate() {
        const errors = [];
        
        if (!this.name || this.name.trim() === '') {
            errors.push('Network name is required');
        }
        
        if (!this.chainId || this.chainId <= 0) {
            errors.push('Valid chain ID is required');
        }
        
        if (!this.rpcUrl) {
            errors.push('No valid RPC URL found');
        }
        
        if (!this.nativeCurrency || !this.nativeCurrency.symbol) {
            errors.push('Native currency information is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Convert network to JSON representation
     */
    toJSON() {
        return {
            name: this.name,
            chainId: this.chainId,
            chain: this.chain,
            icon: this.icon,
            rpc: this.rpc,
            features: this.features,
            faucets: this.faucets,
            nativeCurrency: this.nativeCurrency,
            infoURL: this.infoURL,
            shortName: this.shortName,
            networkId: this.networkId,
            explorers: this.explorers,
            parent: this.parent,
            title: this.title,
            type: this.type,
            rpcUrl: this.rpcUrl,
            usdtAddress: this.usdtAddress,
            iconUrl: this.iconUrl,
            isTestnet: this.isTestnet,
            isMainnet: this.isMainnet
        };
    }

    /**
     * Create a display-friendly summary
     */
    getSummary() {
        return {
            name: this.name,
            chainId: this.chainId,
            symbol: this.nativeCurrency.symbol,
            type: this.type,
            rpcUrl: this.rpcUrl,
            explorer: this.getPrimaryExplorer()?.url || 'Not available',
            hasUSDT: !!this.usdtAddress,
            supportsEIP1559: this.supportsEIP1559(),
            isLayer2: this.isLayer2()
        };
    }

    /**
     * Compare with another network
     */
    equals(otherNetwork) {
        if (!(otherNetwork instanceof Network)) return false;
        return this.chainId === otherNetwork.chainId;
    }

    /**
     * Create a copy of this network
     */
    clone() {
        return new Network(this.toJSON());
    }

    /**
     * Update network data
     */
    update(newData) {
        const updatedData = { ...this.toJSON(), ...newData };
        const newNetwork = new Network(updatedData);
        
        // Copy properties to this instance
        Object.assign(this, newNetwork);
        this.lastUpdated = new Date();
        
        return this;
    }

    /**
     * Static method to create Polygon Mainnet (default network)
     */
    static createPolygonMainnet() {
        return new Network({
            name: "Polygon Mainnet",
            chain: "Polygon",
            icon: "polygon",
            rpc: [
                { url: "https://polygon-rpc.com", tracking: "none" },
                { url: "https://rpc.ankr.com/polygon", tracking: "none" },
                { url: "https://polygon.llamarpc.com", tracking: "none" },
                { url: "https://polygon-mainnet.public.blastapi.io", tracking: "limited" },
                { url: "https://polygon.rpc.blxrbdn.com", tracking: "yes" },
                { url: "https://polygon.blockpi.network/v1/rpc/public", tracking: "limited" }
            ],
            features: [
                { name: "EIP155" },
                { name: "EIP1559" }
            ],
            faucets: [],
            nativeCurrency: {
                name: "POL",
                symbol: "POL",
                decimals: 18
            },
            infoURL: "https://polygon.technology/",
            shortName: "matic",
            chainId: 137,
            networkId: 137,
            explorers: [
                {
                    name: "PolygonScan",
                    url: "https://polygonscan.com",
                    standard: "EIP3091"
                }
            ]
        });
    }

    /**
     * Static method to create from chainlist.org API data
     */
    static fromChainlistData(apiData) {
        return new Network(apiData);
    }

    /**
     * Static method to create multiple networks from chainlist.org API response
     */
    static fromChainlistArray(apiArray) {
        if (!Array.isArray(apiArray)) {
            throw new Error('API data must be an array');
        }
        
        return apiArray.map(networkData => {
            try {
                return Network.fromChainlistData(networkData);
            } catch (error) {
                console.warn(`Failed to create network from data:`, networkData, error);
                return null;
            }
        }).filter(network => network !== null);
    }

    /**
     * Static method to find Polygon Mainnet in chainlist data
     */
    static findPolygonMainnet(networks) {
        return networks.find(network => network.chainId === 137) || Network.createPolygonMainnet();
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Network;
} else {
    window.Network = Network;
}

console.log('Network class loaded successfully'); 