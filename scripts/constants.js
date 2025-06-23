/**
 * Application Constants
 * Centralized configuration for network settings, contract addresses, and ABIs
 * Now using the Network class from chainlist.org API
 */

// Dynamic networks from chainlist.org using Network class
let AVAILABLE_NETWORKS = [];
let NETWORKS = {}; // Will be populated from chainlist API
let CURRENT_NETWORK = null; // Will be set after loading networks

// Chainlist API URL
const CHAINLIST_API_URL = 'https://chainlist.org/rpcs.json';

// Default network configuration
const DEFAULT_NETWORK_CHAIN_ID = 137; // Polygon Mainnet
const DEFAULT_TESTNET_CHAIN_ID = 80002; // Polygon Amoy Testnet

// Create default Polygon Mainnet using Network class
const DEFAULT_NETWORK = Network.createPolygonMainnet();

// Legacy networks for backward compatibility (now using Network class)
const LEGACY_NETWORKS = {
    mainnet: DEFAULT_NETWORK,
    testnet: new Network({
        name: 'Polygon Amoy Testnet',
        chain: 'Polygon',
        icon: 'polygon',
        rpc: [
            { url: 'https://polygon-amoy-bor-rpc.publicnode.com', tracking: 'none' },
            { url: 'https://rpc-amoy.polygon.technology', tracking: 'none' },
            { url: 'https://polygon-amoy.drpc.org', tracking: 'none' }
        ],
        features: [
            { name: 'EIP155' },
            { name: 'EIP1559' }
        ],
        faucets: ['https://faucet.polygon.technology/'],
        nativeCurrency: {
            name: 'POL',
            symbol: 'POL',
            decimals: 18
        },
        infoURL: 'https://polygon.technology/',
        shortName: 'amoy',
        chainId: 80002,
        networkId: 80002,
        explorers: [
            {
                name: 'PolygonScan Amoy',
                url: 'https://amoy.polygonscan.com',
                standard: 'EIP3091'
            }
        ]
    })
};

// Common USDT contract addresses for different networks
const COMMON_USDT_ADDRESSES = {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon Mainnet (USDT)
    56: '0x55d398326f99059fF775485246999027B3197955', // BSC Mainnet
    43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // Avalanche
    250: '0x049d68029688eAbF473097a2fC38ef61633A3C7A', // Fantom
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum One
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Optimism
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    // Testnets
    11155111: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia
    80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy
    97: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // BSC Testnet
    421614: '0xf08A50178dfcDe18524640EA6618a1f965821715', // Arbitrum Sepolia
    11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' // Optimism Sepolia
};

/**
 * Network utility functions (updated to work with Network class)
 */
const NetworkUtils = {
    /**
     * Get USDT address for a chain ID
     */
    getUSDTAddress: (chainId) => {
        return COMMON_USDT_ADDRESSES[chainId] || null;
    },
    
    /**
     * Determine if network is testnet based on name/chain
     */
    isTestnet: (network) => {
        if (!network || !network.name) return false;
        
        // If it's a Network class instance, use its method
        if (network instanceof Network) {
            return network.isTestnet;
        }
        
        // Fallback for legacy objects
        const testnetKeywords = ['test', 'sepolia', 'goerli', 'amoy', 'mumbai', 'fuji', 'chapel'];
        const name = network.name.toLowerCase();
        return testnetKeywords.some(keyword => name.includes(keyword));
    },
    
    /**
     * Get network icon based on chain
     */
    getNetworkIcon: (network) => {
        if (!network) return 'fas fa-globe';
        
        // If it's a Network class instance, use its methods
        if (network instanceof Network) {
            return network.iconUrl || network.getFontAwesomeIcon();
        }
        
        // Fallback for legacy objects
        const isTestnet = NetworkUtils.isTestnet(network);
        
        if (isTestnet && !network.icon) {
            return 'fas fa-flask';
        }
        
        if (network.icon) {
            return `https://icons.llamao.fi/icons/chains/rsz_${network.icon}.jpg`;
        }
        
        const chainIcons = {
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
            'OPTIMISM': 'fas fa-circle'
        };
        
        return chainIcons[network.chain?.toUpperCase()] || 'fas fa-globe';
    },
    
    /**
     * Get best RPC URL from a network's RPC list
     */
    getBestRpcUrl: (rpcList) => {
        if (!rpcList || !Array.isArray(rpcList) || rpcList.length === 0) {
            return null;
        }
        
        // Helper function to extract URL from RPC entry
        const getRpcUrl = (rpc) => {
            if (typeof rpc === 'string') return rpc;
            if (typeof rpc === 'object' && rpc.url) return rpc.url;
            return null;
        };
        
        // Filter out invalid entries
        const validRpcs = rpcList.filter(rpc => {
            const url = getRpcUrl(rpc);
            return url && 
                   url.startsWith('http') && 
                   !url.includes('${') && 
                   !url.includes('YOUR_API_KEY') &&
                   !url.includes('INFURA_API_KEY') &&
                   !url.includes('ALCHEMY_API_KEY');
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
    },
    
    /**
     * Load networks from chainlist API and create Network instances
     */
    loadNetworksFromChainlist: async () => {
        try {
            console.log('Loading networks from chainlist.org...');
            
            const response = await fetch(CHAINLIST_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format: expected array');
            }
            
            // Create Network instances from chainlist data
            console.log('Creating Network instances from API data...');
            const networkInstances = Network.fromChainlistArray(data);
            
            // Store all available networks
            AVAILABLE_NETWORKS = networkInstances;
            
            // Find and set up default networks
            const polygonMainnet = Network.findPolygonMainnet(networkInstances);
            const polygonAmoy = networkInstances.find(network => network.chainId === DEFAULT_TESTNET_CHAIN_ID);
            
            if (polygonMainnet) {
                NETWORKS.mainnet = polygonMainnet;
                CURRENT_NETWORK = polygonMainnet;
                console.log('Polygon Mainnet loaded from chainlist:', polygonMainnet.getSummary());
            } else {
                // Fallback to default if not found in chainlist
                NETWORKS.mainnet = DEFAULT_NETWORK;
                CURRENT_NETWORK = DEFAULT_NETWORK;
                console.log('Using fallback Polygon Mainnet');
            }
            
            if (polygonAmoy) {
                NETWORKS.testnet = polygonAmoy;
                console.log('Polygon Amoy Testnet loaded from chainlist:', polygonAmoy.getSummary());
            } else {
                // Fallback to legacy testnet
                NETWORKS.testnet = LEGACY_NETWORKS.testnet;
                console.log('Using fallback Polygon Amoy Testnet');
            }
            
            console.log(`Successfully loaded ${AVAILABLE_NETWORKS.length} networks from chainlist.org`);
            console.log('Current default network:', CURRENT_NETWORK.getSummary());
            
            return { success: true, count: AVAILABLE_NETWORKS.length };
            
        } catch (error) {
            console.error('Failed to load networks from chainlist:', error);
            
            // Fallback to minimal default networks if API fails
            const fallbackNetworks = [LEGACY_NETWORKS.mainnet, LEGACY_NETWORKS.testnet];
            
            AVAILABLE_NETWORKS = fallbackNetworks;
            NETWORKS.mainnet = LEGACY_NETWORKS.mainnet;
            NETWORKS.testnet = LEGACY_NETWORKS.testnet;
            CURRENT_NETWORK = LEGACY_NETWORKS.mainnet;
            
            console.log('Using fallback networks');
            console.log('Default network:', CURRENT_NETWORK.getSummary());
            
            return { success: false, error: error.message, fallback: true };
        }
    },
    
    /**
     * Create a Network instance from legacy network object
     */
    createNetworkFromLegacy: (legacyNetwork) => {
        try {
            return new Network({
                name: legacyNetwork.name,
                chainId: legacyNetwork.chainId,
                chain: legacyNetwork.chain || 'Unknown',
                rpc: [{ url: legacyNetwork.rpcUrl, tracking: 'none' }],
                nativeCurrency: legacyNetwork.nativeCurrency || { symbol: 'ETH', decimals: 18 },
                shortName: legacyNetwork.shortName || legacyNetwork.name.toLowerCase(),
                networkId: legacyNetwork.networkId || legacyNetwork.chainId,
                explorers: legacyNetwork.explorers || [],
                features: [{ name: 'EIP155' }]
            });
        } catch (error) {
            console.warn('Failed to create Network from legacy object:', error);
            return legacyNetwork; // Return original if conversion fails
        }
    },
    
    /**
     * Get network by chain ID (returns Network instance)
     */
    getNetworkByChainId: (chainId) => {
        return AVAILABLE_NETWORKS.find(network => network.chainId === chainId) || null;
    },
    
    /**
     * Search networks by query
     */
    searchNetworks: (query, includeTestnets = true) => {
        if (!query || query.length < 1) {
            return AVAILABLE_NETWORKS.filter(network => 
                includeTestnets || network.isMainnet
            ).slice(0, 20);
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return AVAILABLE_NETWORKS.filter(network => {
            if (!includeTestnets && network.isTestnet) return false;
            
            return network.name.toLowerCase().includes(searchTerm) ||
                   network.chain.toLowerCase().includes(searchTerm) ||
                   network.chainId.toString().includes(searchTerm) ||
                   network.shortName.toLowerCase().includes(searchTerm);
        }).slice(0, 50);
    }
};

// Set initial current network to Polygon Mainnet
CURRENT_NETWORK = DEFAULT_NETWORK;
NETWORKS.mainnet = DEFAULT_NETWORK;
NETWORKS.testnet = LEGACY_NETWORKS.testnet;

// Debug logging to ensure NetworkUtils is properly created
console.log('NetworkUtils object created:', NetworkUtils);
console.log('NetworkUtils.loadNetworksFromChainlist type:', typeof NetworkUtils.loadNetworksFromChainlist);
console.log('NetworkUtils methods:', Object.keys(NetworkUtils));
console.log('Default network (Polygon Mainnet):', DEFAULT_NETWORK.getSummary());

// ERC20 Token ABI (minimal for balance and transfer operations)
const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    }
];

// Application Settings
const APP_SETTINGS = {
    gasPriceMultiplier: 1.1, // 10% buffer for gas price
    derivationPathPrefix: "m/44'/60'/0'/0/", // Ethereum HD derivation path
    maxWalletCount: 1000,
    defaultWalletCount: 10,
    balanceCheckConcurrency: 3, // Number of concurrent balance checks
    transactionTimeout: 30000, // 30 seconds
    retryAttempts: 3
};

// UI Constants
const UI_CONSTANTS = {
    loadingMessages: {
        initializing: 'Initializing Wallet Manager...',
        generating: 'Generating HD Wallets...',
        checkingBalances: 'Checking Wallet Balances...',
        switchingNetwork: 'Switching Network...',
        executing: 'Executing Transactions...'
    },
    toastDuration: 3000,
    animationDuration: 300
};

// Export constants for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        Network,
        NETWORKS,
        LEGACY_NETWORKS,
        AVAILABLE_NETWORKS,
        CURRENT_NETWORK,
        CHAINLIST_API_URL,
        COMMON_USDT_ADDRESSES,
        NetworkUtils,
        DEFAULT_NETWORK,
        ERC20_ABI,
        APP_SETTINGS,
        UI_CONSTANTS
    };
} else {
    // Browser environment - attach to window object
    window.Network = Network;
    window.NETWORKS = NETWORKS;
    window.LEGACY_NETWORKS = LEGACY_NETWORKS;
    window.AVAILABLE_NETWORKS = AVAILABLE_NETWORKS;
    window.CURRENT_NETWORK = CURRENT_NETWORK;
    window.CHAINLIST_API_URL = CHAINLIST_API_URL;
    window.COMMON_USDT_ADDRESSES = COMMON_USDT_ADDRESSES;
    window.NetworkUtils = NetworkUtils;
    window.DEFAULT_NETWORK = DEFAULT_NETWORK;
    window.ERC20_ABI = ERC20_ABI;
    window.APP_SETTINGS = APP_SETTINGS;
    window.UI_CONSTANTS = UI_CONSTANTS;
    
    // Additional debug logging for browser environment
    console.log('Constants loaded in browser. Network class available:', typeof window.Network);
    console.log('Default network available:', window.DEFAULT_NETWORK?.name);
} 