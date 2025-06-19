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
        this.rpcUrl = 'https://polygon-rpc.com';
        
        // Contract addresses
        this.usdtAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
        
        // ERC20 ABI (minimal for balance and transfer)
        this.erc20Abi = [
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
        
        this.gasPriceMultiplier = 1.2; // 20% buffer for gas price
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
            this.rpcUrl = rpcUrl || this.rpcUrl;

            // Initialize Web3
            this.web3 = new Web3(this.rpcUrl);
            
            // Test connection
            await this.web3.eth.getBlockNumber();
            
            this.isInitialized = true;
            console.log('HD Wallet Manager initialized successfully');
            
            return { success: true, message: 'Wallet manager initialized successfully' };
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.isInitialized = false;
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
                const derivationPath = `m/44'/60'/0'/0/${i}`;
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
     * Check balances for all wallets
     */
    async checkAllBalances() {
        try {
            if (!this.isInitialized || this.wallets.length === 0) {
                throw new Error('No wallets available');
            }

            const results = [];
            
            for (const wallet of this.wallets) {
                try {
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
                    
                    results.push({
                        index: wallet.index,
                        address: wallet.address,
                        path: wallet.path,
                        native_pol_balance: parseFloat(polBalanceEth),
                        usdt_balance: usdtBalanceFormatted,
                        timestamp: wallet.timestamp
                    });
                    
                } catch (error) {
                    console.error(`Error checking balance for wallet ${wallet.index}:`, error);
                    
                    // Update wallet with error state
                    wallet.nativePol = 'error';
                    wallet.usdt = 'error';
                    wallet.timestamp = new Date().toISOString();
                    
                    results.push({
                        index: wallet.index,
                        address: wallet.address,
                        path: wallet.path,
                        native_pol_balance: 'error',
                        usdt_balance: 'error',
                        timestamp: wallet.timestamp
                    });
                }
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