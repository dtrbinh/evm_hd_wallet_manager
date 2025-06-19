#!/usr/bin/env node
/**
 * Environment Setup Script for HD Wallet Manager
 * Creates and configures the environment file for Node.js version
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Default environment template
const ENV_TEMPLATE = `# HD Wallet Manager Environment Configuration
# This file contains configuration for the Node.js version

# =============================================================================
# POLYGON NETWORK CONFIGURATION
# =============================================================================

# Polygon RPC URL (choose one or add your own)
# Free options:
MATIC_RPC_URL=https://polygon-rpc.com
# MATIC_RPC_URL=https://rpc-mainnet.matic.network
# MATIC_RPC_URL=https://rpc-mainnet.maticvigil.com
# MATIC_RPC_URL=https://rpc-mainnet.matic.quiknode.pro

# Paid/Premium options (replace YOUR-PROJECT-ID with actual ID):
# MATIC_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID
# MATIC_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# =============================================================================
# TOKEN CONTRACT ADDRESSES (Polygon Mainnet)
# =============================================================================

# USDT (Tether USD) on Polygon
USDT_CONTRACT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F

# POL (Polygon Ecosystem Token) - Updated token
POL_CONTRACT_ADDRESS=0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6

# Alternative POL addresses (uncomment if the above doesn't work):
# POL_CONTRACT_ADDRESS=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270  # WMATIC
# POL_CONTRACT_ADDRESS=0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0  # Legacy MATIC

# =============================================================================
# GAS AND TRANSACTION SETTINGS
# =============================================================================

# Gas price multiplier (1.1 = 10% above estimated gas price)
GAS_PRICE_MULTIPLIER=1.1

# Default gas limit for token transfers
DEFAULT_GAS_LIMIT=65000

# Transaction timeout in seconds
TRANSACTION_TIMEOUT=300

# Gas buffer for safety (in MATIC)
GAS_BUFFER=0.001

# Maximum retry attempts for failed requests
MAX_RETRIES=3

# Delay between retries (in seconds)
RETRY_DELAY=2

# =============================================================================
# WEB UI CONFIGURATION
# =============================================================================

# Web UI server settings
WEB_UI_HOST=127.0.0.1
WEB_UI_PORT=5000

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Log file location
LOG_FILE=hd_wallet_manager.log

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# Enable/disable debug mode (set to false in production)
DEBUG_MODE=true

# Session timeout (in seconds)
SESSION_TIMEOUT=3600

# =============================================================================
# NOTES
# =============================================================================

# 1. Never commit this file to version control if it contains sensitive data
# 2. For production use, consider using more secure RPC endpoints
# 3. Test the POL contract address with: node backend/test_pol_contract.js
# 4. Update contract addresses if tokens are migrated
# 5. Adjust gas settings based on network congestion
`;

function printBanner() {
    console.log(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║               HD WALLET MANAGER SETUP                         ║
    ║                Environment Configuration                       ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    `);
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function checkExistingEnv() {
    const envPath = path.join(__dirname, 'backend', 'env.config');
    
    if (fs.existsSync(envPath)) {
        console.log('⚠️  Environment file already exists at backend/env.config');
        const overwrite = await askQuestion('Do you want to overwrite it? (y/N): ');
        
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
            console.log('👍 Keeping existing environment file.');
            return false;
        }
    }
    
    return true;
}

async function getRPCUrl() {
    console.log('\n📡 RPC Endpoint Configuration');
    console.log('Choose your Polygon RPC endpoint:');
    console.log('1. https://polygon-rpc.com (Free, recommended)');
    console.log('2. https://rpc-mainnet.matic.network (Free)');
    console.log('3. https://rpc-mainnet.maticvigil.com (Free)');
    console.log('4. Custom RPC URL');
    
    const choice = await askQuestion('\nEnter your choice (1-4) or press Enter for default: ');
    
    switch (choice.trim()) {
        case '1':
        case '':
            return 'https://polygon-rpc.com';
        case '2':
            return 'https://rpc-mainnet.matic.network';
        case '3':
            return 'https://rpc-mainnet.maticvigil.com';
        case '4':
            const customUrl = await askQuestion('Enter your custom RPC URL: ');
            return customUrl.trim() || 'https://polygon-rpc.com';
        default:
            console.log('Invalid choice, using default.');
            return 'https://polygon-rpc.com';
    }
}

async function getContractAddresses() {
    console.log('\n📄 Token Contract Configuration');
    console.log('Current contract addresses:');
    console.log('- USDT: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F');
    console.log('- POL: 0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6');
    
    const useDefault = await askQuestion('\nUse default contract addresses? (Y/n): ');
    
    if (useDefault.toLowerCase() === 'n' || useDefault.toLowerCase() === 'no') {
        const usdtAddress = await askQuestion('Enter USDT contract address: ');
        const polAddress = await askQuestion('Enter POL contract address: ');
        
        return {
            usdt: usdtAddress.trim() || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            pol: polAddress.trim() || '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6'
        };
    }
    
    return {
        usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        pol: '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6'
    };
}

async function getWebUISettings() {
    console.log('\n🌐 Web UI Configuration');
    
    const host = await askQuestion('Web UI host (default: 127.0.0.1): ');
    const port = await askQuestion('Web UI port (default: 5000): ');
    
    return {
        host: host.trim() || '127.0.0.1',
        port: port.trim() || '5000'
    };
}

function createEnvFile(config) {
    const envPath = path.join(__dirname, 'backend', 'env.config');
    
    // Create backend directory if it doesn't exist
    const backendDir = path.dirname(envPath);
    if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir, { recursive: true });
    }
    
    // Customize the template with user preferences
    let envContent = ENV_TEMPLATE;
    
    // Replace RPC URL
    envContent = envContent.replace(
        'MATIC_RPC_URL=https://polygon-rpc.com',
        `MATIC_RPC_URL=${config.rpcUrl}`
    );
    
    // Replace contract addresses
    envContent = envContent.replace(
        'USDT_CONTRACT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        `USDT_CONTRACT_ADDRESS=${config.contracts.usdt}`
    );
    
    envContent = envContent.replace(
        'POL_CONTRACT_ADDRESS=0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6',
        `POL_CONTRACT_ADDRESS=${config.contracts.pol}`
    );
    
    // Replace web UI settings
    envContent = envContent.replace(
        'WEB_UI_HOST=127.0.0.1',
        `WEB_UI_HOST=${config.webUI.host}`
    );
    
    envContent = envContent.replace(
        'WEB_UI_PORT=5000',
        `WEB_UI_PORT=${config.webUI.port}`
    );
    
    // Write the file
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Environment file created at: ${envPath}`);
}

function printInstructions() {
    console.log('\n📋 Next Steps:');
    console.log('1. Install dependencies:');
    console.log('   cd backend && npm install');
    console.log('');
    console.log('2. Test the configuration:');
    console.log('   node backend/test_pol_contract.js');
    console.log('');
    console.log('3. Start the application:');
    console.log('   node run.js');
    console.log('');
    console.log('📝 Configuration file location: backend/env.config');
    console.log('🔧 You can edit this file manually to adjust settings');
    console.log('');
    console.log('🚨 Important: Never commit environment files with sensitive data to version control!');
}

async function main() {
    printBanner();
    
    console.log('This script will help you set up the environment configuration for HD Wallet Manager.');
    console.log('You can customize the settings or use the defaults.\n');
    
    try {
        // Check if environment file already exists
        const shouldContinue = await checkExistingEnv();
        if (!shouldContinue) {
            rl.close();
            return;
        }
        
        // Get user preferences
        const rpcUrl = await getRPCUrl();
        const contracts = await getContractAddresses();
        const webUI = await getWebUISettings();
        
        // Create configuration object
        const config = {
            rpcUrl,
            contracts,
            webUI
        };
        
        console.log('\n📋 Configuration Summary:');
        console.log(`RPC URL: ${config.rpcUrl}`);
        console.log(`USDT Contract: ${config.contracts.usdt}`);
        console.log(`POL Contract: ${config.contracts.pol}`);
        console.log(`Web UI: http://${config.webUI.host}:${config.webUI.port}`);
        
        const confirm = await askQuestion('\nCreate environment file with these settings? (Y/n): ');
        
        if (confirm.toLowerCase() !== 'n' && confirm.toLowerCase() !== 'no') {
            createEnvFile(config);
            printInstructions();
        } else {
            console.log('👍 Environment setup cancelled.');
        }
        
    } catch (error) {
        console.error(`❌ Error during setup: ${error.message}`);
    } finally {
        rl.close();
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Setup cancelled.');
    rl.close();
    process.exit(0);
});

// Start the setup
if (require.main === module) {
    main();
}

module.exports = {
    ENV_TEMPLATE,
    createEnvFile,
    printBanner
}; 