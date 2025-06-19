/**
 * HD Wallet Manager Class
 * Handles wallet generation, balance checking, and blockchain interactions
 */
class HDWalletManager {
    constructor() {
        this.web3 = null;
        this.wallets = [];
        this.isInitialized = false;
        this.seedPhrase = '';
        this.currentNetwork = DEFAULT_NETWORK;
        
        // Use centralized network configurations
        this.networks = NETWORKS;
        
        // Current network config
        this.rpcUrl = this.networks[this.currentNetwork].rpcUrl;
        this.usdtAddress = this.networks[this.currentNetwork].usdtAddress;
        
        // Use centralized ERC20 ABI
        this.erc20Abi = ERC20_ABI;
        
        // Use centralized app settings
        this.gasPriceMultiplier = APP_SETTINGS.gasPriceMultiplier;
    }

    /**
     * Switch between mainnet and testnet
     */
    switchNetwork(network) {
        if (!this.networks[network]) {
            throw new Error(`Unknown network: ${network}`);
        }
        
        const oldNetwork = this.currentNetwork;
        this.currentNetwork = network;
        this.rpcUrl = this.networks[network].rpcUrl;
        this.usdtAddress = this.networks[network].usdtAddress;
        
        // Reset initialization status to force re-initialization with new network
        this.isInitialized = false;
        this.web3 = null;
        
        // Clear existing wallets since they're for the old network
        this.wallets = [];
        
        console.log(`Switched from ${this.networks[oldNetwork].name} to ${this.networks[network].name}`);
        
        return {
            success: true,
            network: this.networks[network],
            message: `Switched to ${this.networks[network].name}`
        };
    }

    /**
     * Get current network information
     */
    getCurrentNetwork() {
        return this.networks[this.currentNetwork];
    }

    /**
     * Force refresh Web3 connection (useful after network switch)
     */
    async refreshConnection() {
        if (!this.isInitialized) {
            throw new Error('Wallet manager not initialized');
        }
        
        try {
            // Create new Web3 instance with current network
            this.web3 = new Web3(this.rpcUrl);
            
            // Test connection
            const blockNumber = await this.web3.eth.getBlockNumber();
            console.log(`Refreshed connection to ${this.networks[this.currentNetwork].name} - Block: ${blockNumber}`);
            
            return {
                success: true,
                message: `Connection refreshed to ${this.networks[this.currentNetwork].name}`,
                blockNumber: blockNumber
            };
        } catch (error) {
            console.error('Connection refresh error:', error);
            this.isInitialized = false;
            this.web3 = null;
            throw error;
        }
    }

    /**
     * Initialize the wallet manager
     */
    async initialize(seedPhrase, rpcUrl = null) {
        try {
            if (!seedPhrase || seedPhrase.trim() === '') {
                throw new Error('Seed phrase is required');
            }

            // Validate seed phrase using ethers.js v6
            try {
                ethers.Mnemonic.fromPhrase(seedPhrase.trim());
            } catch (e) {
                throw new Error('Invalid seed phrase');
            }

            this.seedPhrase = seedPhrase.trim();
            
            // Use provided RPC URL or current network's RPC URL
            if (rpcUrl) {
                this.rpcUrl = rpcUrl;
            }

            // Initialize Web3 with current network's RPC
            this.web3 = new Web3(this.rpcUrl);
            
            // Test connection
            const blockNumber = await this.web3.eth.getBlockNumber();
            console.log(`Connected to ${this.networks[this.currentNetwork].name} - Block: ${blockNumber}`);
            
            this.isInitialized = true;
            console.log(`HD Wallet Manager initialized successfully on ${this.networks[this.currentNetwork].name}`);
            
            return { 
                success: true, 
                message: `Wallet manager initialized on ${this.networks[this.currentNetwork].name}`,
                network: this.networks[this.currentNetwork]
            };
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.isInitialized = false;
            this.web3 = null;
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate HD wallets from seed phrase
     */
    generateWallets(count = 10, startIndex = 0, endIndex = 9) {
        try {
            if (!this.isInitialized) {
                throw new Error('Wallet manager not initialized');
            }

            // Clear existing wallets
            this.wallets = [];

            // Generate HD wallet from mnemonic using ethers.js v6
            const mnemonic = ethers.Mnemonic.fromPhrase(this.seedPhrase);

            // Generate wallets
            for (let i = startIndex; i <= endIndex; i++) {
                const derivationPath = `${APP_SETTINGS.derivationPathPrefix}${i}`;
                const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, derivationPath);
                
                const privateKey = wallet.privateKey;
                const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
                
                this.wallets.push({
                    index: this.wallets.length + 1,
                    address: account.address,
                    privateKey: privateKey,
                    path: derivationPath,
                    nativePol: null,
                    usdt: null,
                    timestamp: null
                });
            }

            console.log(`Generated ${this.wallets.length} HD wallets`);
            return this.wallets.map(w => ({
                index: w.index,
                address: w.address,
                path: w.path
            }));

        } catch (error) {
            console.error('Error generating wallets:', error);
            throw error;
        }
    }

    /**
     * Check balance for a single wallet
     */
    async checkSingleWalletBalance(walletIndex, onProgress = null) {
        try {
            if (!this.isInitialized || this.wallets.length === 0) {
                throw new Error('No wallets available');
            }

            const wallet = this.wallets.find(w => w.index === walletIndex);
            if (!wallet) {
                throw new Error(`Wallet with index ${walletIndex} not found`);
            }

            try {
                // Notify progress start
                if (onProgress) {
                    onProgress(walletIndex, 'checking', null);
                }

                // Check Native POL balance
                const polBalance = await this.web3.eth.getBalance(wallet.address);
                const polBalanceEth = this.web3.utils.fromWei(polBalance, 'ether');
                
                // Check USDT balance
                const usdtContract = new this.web3.eth.Contract(this.erc20Abi, this.usdtAddress);
                const usdtBalance = await usdtContract.methods.balanceOf(wallet.address).call();
                const usdtBalanceFormatted = parseFloat(usdtBalance) / Math.pow(10, 6); // USDT has 6 decimals
                
                // Update wallet object
                wallet.nativePol = parseFloat(polBalanceEth);
                wallet.usdt = usdtBalanceFormatted;
                wallet.timestamp = new Date().toISOString();
                
                const result = {
                    index: wallet.index,
                    address: wallet.address,
                    path: wallet.path,
                    native_pol_balance: parseFloat(polBalanceEth),
                    usdt_balance: usdtBalanceFormatted,
                    timestamp: wallet.timestamp
                };

                // Notify progress completion
                if (onProgress) {
                    onProgress(walletIndex, 'completed', result);
                }

                return result;
                
            } catch (error) {
                console.error(`Error checking balance for wallet ${wallet.index}:`, error);
                
                // Update wallet with error state
                wallet.nativePol = 'error';
                wallet.usdt = 'error';
                wallet.timestamp = new Date().toISOString();
                
                const result = {
                    index: wallet.index,
                    address: wallet.address,
                    path: wallet.path,
                    native_pol_balance: 'error',
                    usdt_balance: 'error',
                    timestamp: wallet.timestamp
                };

                // Notify progress error
                if (onProgress) {
                    onProgress(walletIndex, 'error', result);
                }

                return result;
            }

        } catch (error) {
            console.error('Error in checkSingleWalletBalance:', error);
            throw error;
        }
    }

    /**
     * Check balances for all wallets (legacy method - kept for compatibility)
     */
    async checkAllBalances() {
        try {
            if (!this.isInitialized || this.wallets.length === 0) {
                throw new Error('No wallets available');
            }

            const results = [];
            
            for (const wallet of this.wallets) {
                const result = await this.checkSingleWalletBalance(wallet.index);
                results.push(result);
            }

            console.log('Balance check completed for all wallets');
            return results;

        } catch (error) {
            console.error('Error checking balances:', error);
            throw error;
        }
    }

    /**
     * Get wallet by index
     */
    getWallet(index) {
        return this.wallets.find(w => w.index === index);
    }

    /**
     * Get all wallets (safe format without private keys)
     */
    getWallets() {
        return this.wallets.map(wallet => ({
            index: wallet.index,
            address: wallet.address,
            path: wallet.path,
            native_pol_balance: wallet.nativePol,
            usdt_balance: wallet.usdt,
            timestamp: wallet.timestamp
        }));
    }

    /**
     * Calculate totals
     */
    getTotals() {
        const validWallets = this.wallets.filter(w => 
            typeof w.nativePol === 'number' && typeof w.usdt === 'number'
        );

        const totalNativePol = validWallets.reduce((sum, w) => sum + w.nativePol, 0);
        const totalUsdt = validWallets.reduce((sum, w) => sum + w.usdt, 0);

        return {
            wallet_count: this.wallets.length,
            total_native_pol: totalNativePol,
            total_usdt: totalUsdt,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Estimate gas for transaction
     */
    async estimateGas(token, transactionCount) {
        try {
            let gasPerTransaction = 21000; // Default for POL transfer
            
            if (token === 'USDT') {
                gasPerTransaction = 65000; // ERC20 transfer
            }
            
            const gasPrice = await this.web3.eth.getGasPrice();
            const adjustedGasPrice = Math.floor(parseFloat(gasPrice) * this.gasPriceMultiplier);
            
            const gasCostPerTransaction = (gasPerTransaction * adjustedGasPrice) / Math.pow(10, 18);
            const totalGasFee = gasCostPerTransaction * transactionCount;
            
            return {
                gasPerTransaction: gasCostPerTransaction,
                totalGasFee: totalGasFee,
                gasPrice: adjustedGasPrice,
                gasLimit: gasPerTransaction
            };
            
        } catch (error) {
            console.error('Error estimating gas:', error);
            throw error;
        }
    }

    /**
     * Execute single transaction
     */
    async executeTransaction(fromWalletIndex, toAddress, amount, token) {
        try {
            const fromWallet = this.getWallet(fromWalletIndex);
            if (!fromWallet) {
                throw new Error('Sender wallet not found');
            }

            let txHash = null;
            let gasFee = 0;

            if (token === 'POL') {
                // Native POL transfer
                const gasPrice = await this.web3.eth.getGasPrice();
                const adjustedGasPrice = Math.floor(parseFloat(gasPrice) * this.gasPriceMultiplier);
                const gasLimit = 21000;

                const tx = {
                    from: fromWallet.address,
                    to: toAddress,
                    value: this.web3.utils.toWei(amount.toString(), 'ether'),
                    gas: gasLimit,
                    gasPrice: adjustedGasPrice,
                    nonce: await this.web3.eth.getTransactionCount(fromWallet.address)
                };

                const signedTx = await this.web3.eth.accounts.signTransaction(tx, fromWallet.privateKey);
                const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

                txHash = receipt.transactionHash;
                gasFee = (gasLimit * adjustedGasPrice) / Math.pow(10, 18);

                console.log(`POL transfer successful: ${txHash}`);
                return { success: true, txHash, gasFee };

            } else if (token === 'USDT') {
                // USDT token transfer
                const contract = new this.web3.eth.Contract(this.erc20Abi, this.usdtAddress);
                const amountWei = Math.floor(amount * Math.pow(10, 6)); // USDT has 6 decimals

                const gasPrice = await this.web3.eth.getGasPrice();
                const adjustedGasPrice = Math.floor(parseFloat(gasPrice) * this.gasPriceMultiplier);
                const gasLimit = 65000;

                const tx = {
                    from: fromWallet.address,
                    to: this.usdtAddress,
                    data: contract.methods.transfer(toAddress, amountWei.toString()).encodeABI(),
                    gas: gasLimit,
                    gasPrice: adjustedGasPrice,
                    nonce: await this.web3.eth.getTransactionCount(fromWallet.address)
                };

                const signedTx = await this.web3.eth.accounts.signTransaction(tx, fromWallet.privateKey);
                const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

                txHash = receipt.transactionHash;
                gasFee = (gasLimit * adjustedGasPrice) / Math.pow(10, 18);

                console.log(`USDT transfer successful: ${txHash}`);
                return { success: true, txHash, gasFee };
            }

        } catch (error) {
            console.error('Transaction failed:', error);
            return { success: false, txHash: null, gasFee: 0, error: error.message };
        }
    }

    /**
     * Export wallet data to Excel
     */
    exportToExcel() {
        try {
            const wb = XLSX.utils.book_new();
            
            // Wallets sheet
            const walletsData = this.wallets.map(wallet => ({
                'Index': wallet.index,
                'Address': wallet.address,
                'Derivation Path': wallet.path,
                'Native POL': typeof wallet.nativePol === 'number' ? wallet.nativePol.toFixed(6) : wallet.nativePol,
                'USDT': typeof wallet.usdt === 'number' ? wallet.usdt.toFixed(6) : wallet.usdt,
                'Last Updated': wallet.timestamp || 'Never'
            }));
            
            const walletsWs = XLSX.utils.json_to_sheet(walletsData);
            XLSX.utils.book_append_sheet(wb, walletsWs, 'Wallets');
            
            // Totals sheet
            const totals = this.getTotals();
            const totalsData = [
                { 'Metric': 'Total Wallets', 'Value': totals.wallet_count },
                { 'Metric': 'Total Native POL', 'Value': totals.total_native_pol.toFixed(6) },
                { 'Metric': 'Total USDT', 'Value': totals.total_usdt.toFixed(6) },
                { 'Metric': 'Export Date', 'Value': totals.timestamp }
            ];
            
            const totalsWs = XLSX.utils.json_to_sheet(totalsData);
            XLSX.utils.book_append_sheet(wb, totalsWs, 'Summary');
            
            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `hd_wallet_manager_${timestamp}.xlsx`;
            
            // Download file
            XLSX.writeFile(wb, filename);
            
            console.log(`Excel file exported: ${filename}`);
            return { success: true, filename };
            
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return { success: false, error: error.message };
        }
    }
} 