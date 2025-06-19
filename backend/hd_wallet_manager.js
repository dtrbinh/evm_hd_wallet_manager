#!/usr/bin/env node
/**
 * HD Wallet Manager for Polygon Network
 * Manages 10 HD wallets, checks USDT and POL balances, and transfers USDT to wallet 1
 */

const { Web3 } = require('web3');
const bip39 = require('bip39');
const HDKey = require('hdkey');
const ExcelJS = require('exceljs');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} - ${level.toUpperCase()} - ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: process.env.LOG_FILE || 'hd_wallet_manager.log' }),
        new winston.transports.Console()
    ]
});

class HDWalletManager {
    constructor(seedPhrase, rpcUrl = null) {
        /**
         * Initialize HD Wallet Manager
         * @param {string} seedPhrase - 12, 15, 18, 21, or 24 word mnemonic phrase
         * @param {string} rpcUrl - Polygon RPC URL (defaults to environment variable or Polygon RPC)
         */
        this.seedPhrase = seedPhrase;
        this.rpcUrl = rpcUrl || process.env.MATIC_RPC_URL || "https://polygon-rpc.com";
        this.web3 = new Web3(this.rpcUrl);
        
        // Token addresses on Polygon (configurable via environment)
        this.usdtAddress = process.env.USDT_CONTRACT_ADDRESS || "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
        this.polAddress = process.env.POL_CONTRACT_ADDRESS || "0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6";
        
        // ERC20 ABI (simplified)
        this.erc20Abi = [
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "symbol",
                "outputs": [{"name": "", "type": "string"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "name",
                "outputs": [{"name": "", "type": "string"}],
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
            }
        ];
        
        // Initialize wallets array
        this.wallets = [];
        this.logData = [];
        
        // Configuration from environment variables
        this.gasPriceMultiplier = parseFloat(process.env.GAS_PRICE_MULTIPLIER || '1.1');
        this.transactionTimeout = parseInt(process.env.TRANSACTION_TIMEOUT || '300');
        this.defaultGasLimit = parseInt(process.env.DEFAULT_GAS_LIMIT || '65000');
        this.gasBuffer = parseFloat(process.env.GAS_BUFFER || '0.001');
        
        logger.info("HD Wallet Manager initialized");
        
        // Verify contract addresses on initialization
        this.verifyContracts();
    }
    
    async verifyContracts() {
        /**
         * Verify that contract addresses are valid and deployed
         */
        logger.info("Verifying contract addresses...");
        
        const contractsToVerify = [
            ["USDT", this.usdtAddress],
            ["POL", this.polAddress]
        ];
        
        for (const [name, address] of contractsToVerify) {
            try {
                // Check if contract exists
                const contractCode = await this.web3.eth.getCode(address);
                if (contractCode === '0x') {
                    logger.error(`❌ ${name} contract not found at ${address}`);
                    continue;
                }
                
                // Try to call contract functions
                const contract = new this.web3.eth.Contract(this.erc20Abi, address);
                const symbol = await contract.methods.symbol().call();
                const decimals = await contract.methods.decimals().call();
                
                logger.info(`✅ ${name} contract verified at ${address} - Symbol: ${symbol}, Decimals: ${decimals}`);
                
            } catch (error) {
                logger.error(`❌ ${name} contract verification failed at ${address}: ${error.message}`);
                
                // Suggest alternative addresses for POL
                if (name === "POL") {
                    logger.info("💡 Alternative POL addresses to try:");
                    logger.info("   - WMATIC: 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
                    logger.info("   - Update POL_CONTRACT_ADDRESS in .env file");
                }
            }
        }
    }
    
    generateWallets(count = 10) {
        /**
         * Generate HD wallets from seed phrase
         * @param {number} count - Number of wallets to generate (default: 10)
         * @returns {Array} List of wallet objects with address and private key
         */
        logger.info(`Generating ${count} HD wallets...`);
        
        // Validate mnemonic
        if (!bip39.validateMnemonic(this.seedPhrase)) {
            throw new Error("Invalid seed phrase");
        }
        
        const seed = bip39.mnemonicToSeedSync(this.seedPhrase);
        const hdKey = HDKey.fromMasterSeed(seed);
        
        const wallets = [];
        for (let i = 0; i < count; i++) {
            // Derive wallet for path m/44'/60'/0'/0/{i}
            const derivedKey = hdKey.derive(`m/44'/60'/0'/0/${i}`);
            const privateKey = derivedKey.privateKey;
            const address = this.web3.eth.accounts.privateKeyToAccount('0x' + privateKey.toString('hex')).address;
            
            const walletInfo = {
                index: i + 1,
                address: address,
                privateKey: '0x' + privateKey.toString('hex'),
                path: `m/44'/60'/0'/0/${i}`
            };
            wallets.push(walletInfo);
            
            logger.info(`Generated wallet ${i + 1}: ${walletInfo.address}`);
        }
        
        this.wallets = wallets;
        return wallets;
    }
    
    async getTokenBalance(walletAddress, tokenAddress) {
        /**
         * Get token balance for a wallet with enhanced error handling
         * @param {string} walletAddress - Wallet address to check
         * @param {string} tokenAddress - Token contract address
         * @returns {Object} {balance: number|null, decimals: number|null}
         */
        const maxRetries = parseInt(process.env.MAX_RETRIES || '3');
        const retryDelay = parseInt(process.env.RETRY_DELAY || '2');
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Create contract instance
                const contract = new this.web3.eth.Contract(this.erc20Abi, tokenAddress);
                
                // First check if the contract exists
                const contractCode = await this.web3.eth.getCode(tokenAddress);
                if (contractCode === '0x') {
                    logger.error(`No contract found at address ${tokenAddress}`);
                    return { balance: null, decimals: null };
                }
                
                // Get balance and decimals
                const balance = await contract.methods.balanceOf(walletAddress).call();
                const decimals = await contract.methods.decimals().call();
                
                const normalizedBalance = parseFloat(balance) / Math.pow(10, parseInt(decimals));
                logger.debug(`Successfully got token balance for ${walletAddress}: ${balance} (decimals: ${decimals})`);
                return { balance: normalizedBalance, decimals: parseInt(decimals) };
                
            } catch (error) {
                const errorMsg = error.message.toLowerCase();
                
                if (errorMsg.includes('contract function') || errorMsg.includes('not deployed')) {
                    logger.error(`Contract issue for ${tokenAddress}: ${error.message}`);
                    // Don't retry for contract deployment issues
                    return { balance: null, decimals: null };
                } else if (errorMsg.includes('connection') || errorMsg.includes('timeout')) {
                    logger.warn(`Network issue on attempt ${attempt + 1}/${maxRetries} for ${walletAddress}: ${error.message}`);
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
                        continue;
                    }
                } else {
                    logger.error(`Error getting token balance for ${walletAddress} on attempt ${attempt + 1}: ${error.message}`);
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
                        continue;
                    }
                }
            }
        }
        
        logger.error(`Failed to get token balance for ${walletAddress} after ${maxRetries} attempts`);
        return { balance: null, decimals: null };
    }
    
    async getNativePolBalance(walletAddress) {
        /**
         * Get native POL balance for a wallet using web3.eth.getBalance()
         * @param {string} walletAddress - Wallet address to check
         * @returns {Object} {balance: number|null}
         */
        const maxRetries = parseInt(process.env.MAX_RETRIES || '3');
        const retryDelay = parseInt(process.env.RETRY_DELAY || '2');
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const balanceWei = await this.web3.eth.getBalance(walletAddress);
                const balancePol = parseFloat(this.web3.utils.fromWei(balanceWei, 'ether'));
                
                logger.debug(`Successfully got native POL balance for ${walletAddress}: ${balancePol} POL`);
                return { balance: balancePol };
                
            } catch (error) {
                const errorMsg = error.message.toLowerCase();
                
                if (errorMsg.includes('connection') || errorMsg.includes('timeout')) {
                    logger.warn(`Network issue on attempt ${attempt + 1}/${maxRetries} for ${walletAddress}: ${error.message}`);
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
                        continue;
                    }
                } else {
                    logger.error(`Error getting native POL balance for ${walletAddress} on attempt ${attempt + 1}: ${error.message}`);
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
                        continue;
                    }
                }
            }
        }
        
        logger.error(`Failed to get native POL balance for ${walletAddress} after ${maxRetries} attempts`);
        return { balance: null };
    }
    
    async checkAllBalances() {
        /**
         * Check native POL and USDT balances for all wallets
         * @returns {Array} List of balance information for each wallet
         */
        logger.info("Checking native POL and USDT balances for all wallets...");
        
        const balanceData = [];
        for (const wallet of this.wallets) {
            // Get native POL balance using web3.eth.getBalance()
            const nativePolResult = await this.getNativePolBalance(wallet.address);
            
            // Get USDT token balance using ERC20 contract
            const usdtResult = await this.getTokenBalance(wallet.address, this.usdtAddress);
            
            const balanceInfo = {
                wallet_index: wallet.index,
                address: wallet.address,
                native_pol_balance: nativePolResult.balance,  // Native POL using web3.eth.getBalance()
                usdt_balance: usdtResult.balance,             // USDT token using contract
                timestamp: new Date().toISOString()
            };
            
            balanceData.push(balanceInfo);
            
            // Log with proper null handling
            const nativePolStr = nativePolResult.balance !== null ? nativePolResult.balance.toFixed(6) : "null";
            const usdtStr = usdtResult.balance !== null ? usdtResult.balance.toFixed(2) : "null";
            logger.info(`Wallet ${wallet.index}: Native POL=${nativePolStr}, USDT=${usdtStr}`);
        }
        
        return balanceData;
    }


    

    
    async saveLogsToExcel(filename = null) {
        /**
         * Save all logs to Excel file
         * @param {string} filename - Output filename
         */
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            filename = `hd_wallet_logs_${timestamp}.xlsx`;
        }
        
        logger.info(`Saving logs to ${filename}...`);
        
        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1: Wallet Information
        const walletSheet = workbook.addWorksheet('Wallets');
        walletSheet.columns = [
            { header: 'Index', key: 'index', width: 10 },
            { header: 'Address', key: 'address', width: 45 },
            { header: 'Path', key: 'path', width: 20 }
        ];
        
        this.wallets.forEach(wallet => {
            walletSheet.addRow({
                index: wallet.index,
                address: wallet.address,
                path: wallet.path
            });
        });
        
        // Sheet 2: Balance Information
        if (this.balanceData && this.balanceData.length > 0) {
            const balanceSheet = workbook.addWorksheet('Balances');
            balanceSheet.columns = [
                { header: 'Wallet Index', key: 'wallet_index', width: 12 },
                { header: 'Address', key: 'address', width: 45 },
                { header: 'USDT Balance', key: 'usdt_balance', width: 15 },
                { header: 'POL Balance', key: 'pol_balance', width: 15 },
                { header: 'Timestamp', key: 'timestamp', width: 25 }
            ];
            
            this.balanceData.forEach(balance => {
                balanceSheet.addRow(balance);
            });
        }
        
        // Sheet 3: Transfer Results
        if (this.transferResults && this.transferResults.length > 0) {
            const transferSheet = workbook.addWorksheet('Transfers');
            transferSheet.columns = [
                { header: 'From Wallet', key: 'from_wallet', width: 12 },
                { header: 'To Wallet', key: 'to_wallet', width: 12 },
                { header: 'USDT Amount', key: 'usdt_amount', width: 15 },
                { header: 'Gas Estimate (MATIC)', key: 'gas_estimate_matic', width: 20 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Timestamp', key: 'timestamp', width: 25 }
            ];
            
            this.transferResults.forEach(transfer => {
                transferSheet.addRow(transfer);
            });
        }
        
        // Sheet 4: Summary
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 20 }
        ];
        
        const successfulTransfers = this.transferResults ? 
            this.transferResults.filter(r => r.status === 'success') : [];
        const failedTransfers = this.transferResults ? 
            this.transferResults.filter(r => r.status !== 'success') : [];
        
        summarySheet.addRows([
            { metric: 'Total Wallets', value: this.wallets.length },
            { metric: 'Total USDT Transferred', value: successfulTransfers.reduce((sum, r) => sum + (r.usdt_amount || 0), 0) },
            { metric: 'Successful Transfers', value: successfulTransfers.length },
            { metric: 'Failed Transfers', value: failedTransfers.length },
            { metric: 'Total Gas Used (MATIC)', value: (this.transferResults || []).reduce((sum, r) => sum + (r.gas_estimate_matic || 0), 0) },
            { metric: 'Timestamp', value: new Date().toISOString() }
        ]);
        
        await workbook.xlsx.writeFile(filename);
        logger.info(`Logs saved successfully to ${filename}`);
    }
    

}

// Main function for CLI usage
async function main() {
    console.log("=== HD Wallet Manager for Polygon Network ===");
    console.log();
    
    // Get seed phrase from user
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const seedPhrase = await new Promise(resolve => {
        rl.question("Enter your seed phrase (12, 15, 18, 21, or 24 words): ", resolve);
    });
    
    if (!seedPhrase.trim()) {
        console.log("Error: Seed phrase is required!");
        rl.close();
        return;
    }
    
    // Optional: Custom RPC URL
    const rpcUrl = await new Promise(resolve => {
        rl.question("Enter Polygon RPC URL (press Enter for default): ", resolve);
    });
    
    rl.close();
    
    try {
        // Initialize manager
        const manager = new HDWalletManager(seedPhrase.trim(), rpcUrl.trim() || null);
        
        // Run step-by-step process
        // Step 1: Generate wallets
        manager.generateWallets(10);
        
        // Step 2: Check initial balances
        manager.balanceData = await manager.checkAllBalances();
        
        // Step 3: Save logs to Excel
        await manager.saveLogsToExcel();
        
        console.log("\nProcess completed! Check the generated Excel file for detailed logs.");
        
    } catch (error) {
        console.log(`Error: ${error.message}`);
        logger.error(`Main process error: ${error.message}`);
    }
}

// Export the class for use in other modules
module.exports = HDWalletManager;

// Run main function if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
} 