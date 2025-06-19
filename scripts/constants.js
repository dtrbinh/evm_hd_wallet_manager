/**
 * Application Constants
 * Centralized configuration for network settings, contract addresses, and ABIs
 */

// Network Configurations
const NETWORKS = {
    mainnet: {
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: 137,
        usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        explorerUrl: 'https://polygonscan.com'
    },
    testnet: {
        name: 'Polygon Amoy Testnet',
        rpcUrl: 'https://rpc-amoy.polygon.technology',
        chainId: 80002,
        usdtAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Mock USDT on testnet
        explorerUrl: 'https://amoy.polygonscan.com'
    }
};

// Default network
const DEFAULT_NETWORK = 'mainnet';

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
    gasPriceMultiplier: 1.2, // 20% buffer for gas price
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
        DEFAULT_NETWORK,
        ERC20_ABI,
        APP_SETTINGS,
        UI_CONSTANTS
    };
} else {
    // Browser environment - attach to window object
    window.NETWORKS = NETWORKS;
    window.DEFAULT_NETWORK = DEFAULT_NETWORK;
    window.ERC20_ABI = ERC20_ABI;
    window.APP_SETTINGS = APP_SETTINGS;
    window.UI_CONSTANTS = UI_CONSTANTS;
} 