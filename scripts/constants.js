/**
 * Application Constants
 * Centralized configuration for network settings, contract addresses, and ABIs
 */

// Legacy Network Configurations (kept for backward compatibility)
const LEGACY_NETWORKS = {
    mainnet: {
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: 137,
        usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        explorerUrl: 'https://polygonscan.com',
        nativeCurrency: { symbol: 'POL', decimals: 18 },
        type: 'mainnet',
        icon: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg'
    },
    testnet: {
        name: 'Polygon Amoy Testnet',
        rpcUrl: 'https://polygon-amoy-bor-rpc.publicnode.com',
        chainId: 80002,
        usdtAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
        explorerUrl: 'https://amoy.polygonscan.com',
        nativeCurrency: { symbol: 'POL', decimals: 18 },
        type: 'testnet',
        icon: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg'
    }
};

// Dynamic networks from chainlist.org
let AVAILABLE_NETWORKS = [];
let NETWORKS = { ...LEGACY_NETWORKS }; // Start with legacy networks
let CURRENT_NETWORK = LEGACY_NETWORKS.mainnet;

// Chainlist API
const CHAINLIST_API_URL = 'https://chainlist.org/rpcs.json';

// Common USDT contract addresses for different networks
const COMMON_USDT_ADDRESSES = {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon Mainnet
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

// Default network
const DEFAULT_NETWORK = 'mainnet';

/**
 * Network utility functions
 */
const NetworkUtils = {
    // Get USDT address for a chain ID
    getUSDTAddress: (chainId) => {
        return COMMON_USDT_ADDRESSES[chainId] || null;
    },
    
    // Determine if network is testnet based on name/chain
    isTestnet: (network) => {
        const testnetKeywords = ['test', 'sepolia', 'goerli', 'amoy', 'mumbai', 'fuji', 'chapel'];
        const name = network.name.toLowerCase();
        return testnetKeywords.some(keyword => name.includes(keyword));
    },
    
    // Get network icon based on chain
    getNetworkIcon: (network) => {
        const isTestnet = NetworkUtils.isTestnet(network);
        
        // For testnets, use flask icon as fallback
        if (isTestnet && !network.icon) {
            return 'fas fa-flask';
        }
        
        // If network has an icon from chainlist, use LlamaO.fi
        if (network.icon) {
            return `https://icons.llamao.fi/icons/chains/rsz_${network.icon}.jpg`;
        }
        
        // Fallback to FontAwesome icons based on chain
        const chainIcons = {
            'ETH': 'fab fa-ethereum',
            'BNB': 'fas fa-coins',
            'MATIC': 'fas fa-gem',
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
    
    // Get best RPC URL from a network's RPC list
    getBestRpcUrl: (rpcList) => {
        if (!rpcList || rpcList.length === 0) return null;
        
        // Helper function to extract URL from RPC entry
        const getRpcUrl = (rpc) => {
            if (typeof rpc === 'string') return rpc;
            if (typeof rpc === 'object' && rpc.url) return rpc.url;
            return null;
        };
        
        // Filter out invalid entries
        const validRpcs = rpcList.filter(rpc => {
            const url = getRpcUrl(rpc);
            return url && url.startsWith('http') && !url.includes('${') && !url.includes('YOUR_API_KEY');
        });
        
        if (validRpcs.length === 0) return null;
        
        // Prioritize non-tracking, open source RPCs
        const priorityRpc = validRpcs.find(rpc => 
            typeof rpc === 'object' && rpc.tracking === 'none' && rpc.isOpenSource === true
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
};

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
} 