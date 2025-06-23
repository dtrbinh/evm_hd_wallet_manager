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
        // REMOVED: this.currentNetworkChainId - now using CURRENT_NETWORK.chainId directly
        
        // Initialize secure memory manager
        this.secureMemory = new SecureMemoryManager();
        
        // Use centralized network configurations
        this.networks = NETWORKS;
        
        // Current network config (will be set after networks are loaded)
        this.rpcUrl = null;
        this.usdtAddress = null;
        
        // Use centralized ERC20 ABI
        this.erc20Abi = ERC20_ABI;
        
        // Use centralized app settings
        this.gasPriceMultiplier = APP_SETTINGS.gasPriceMultiplier;
    }

    /**
     * Get current chain ID (single source of truth)
     */
    get currentChainId() {
        return CURRENT_NETWORK?.chainId || DEFAULT_NETWORK_CHAIN_ID;
    }

    /**
     * Switch network by chain ID
     */
    switchNetwork(chainId) {
        console.log(`🔧 WalletManager.switchNetwork called with chainId: ${chainId}`);
        console.log(`  Current chain ID before switch: ${this.currentChainId}`);
        
        const network = this.getNetworkByChainId(chainId);
        if (!network) {
            const error = `Unknown network with chain ID: ${chainId}`;
            console.error('❌', error);
            throw new Error(error);
        }
        
        console.log(`  Found network: ${network.name} (Chain ID: ${network.chainId})`);
        
        const oldChainId = this.currentChainId;
        
        // **SINGLE SOURCE OF TRUTH: Update global network instead of local variable**
        CURRENT_NETWORK = network;
        
        console.log(`  Updated chain ID: ${oldChainId} → ${this.currentChainId}`);
        
        // Handle both Network class instances and legacy network objects
        if (typeof Network !== 'undefined' && network instanceof Network) {
            this.rpcUrl = network.rpcUrl || NetworkUtils.getBestRpcUrl(network.getAllRpcUrls());
        } else {
            this.rpcUrl = NetworkUtils.getBestRpcUrl(network.rpc || network.getAllRpcUrls?.() || []);
        }
        
        this.usdtAddress = this.getUSDTAddressForNetwork();
        
        // Reset initialization status to force re-initialization with new network
        this.isInitialized = false;
        this.web3 = null;
        
        // Reset USDT validation flag to force re-validation on new network
        this._usdtValidated = false;
        
        // Clear existing wallets since they're for the old network
        this.wallets = [];
        
        console.log(`Switched from chain ID ${oldChainId} to ${network.name} (${chainId})`);
        
        return {
            success: true,
            network: network,
            message: `Switched to ${network.name}`
        };
    }

    /**
     * Get network by chain ID
     */
    getNetworkByChainId(chainId) {
        return AVAILABLE_NETWORKS.find(network => network.chainId === chainId);
    }

    /**
     * Get current network information
     */
    getCurrentNetwork() {
        return CURRENT_NETWORK || this.getNetworkByChainId(this.currentChainId);
    }

    /**
     * Get USDT address for current network based on chain ID
     */
    getUSDTAddressForNetwork() {
        const currentNetwork = this.getCurrentNetwork();
        if (!currentNetwork) {
            console.error('No current network found when getting USDT address');
            return null;
        }
        
        const chainId = currentNetwork.chainId;
        
        // Get USDT address from COMMON_USDT_ADDRESSES based on chain ID
        const usdtAddress = NetworkUtils.getUSDTAddress(chainId);
        
        console.log(`🔧 USDT Address Lookup:`);
        console.log(`  Network: ${currentNetwork.name}`);
        console.log(`  Chain ID: ${chainId}`);
        console.log(`  USDT Address: ${usdtAddress || 'Not configured'}`);
        
        if (usdtAddress) {
            console.log(`✅ USDT address for ${currentNetwork.name} (Chain ID: ${chainId}): ${usdtAddress}`);
        } else {
            console.warn(`⚠️ No USDT address configured for ${currentNetwork.name} (Chain ID: ${chainId})`);
        }
        
        return usdtAddress;
    }

    /**
     * Force refresh all network settings (RPC URL, USDT address, etc.)
     */
    refreshNetworkSettings() {
        const currentNetwork = this.getCurrentNetwork();
        if (!currentNetwork) {
            console.error('No current network found when refreshing network settings');
            return false;
        }
        
        const oldRpcUrl = this.rpcUrl;
        const oldUsdtAddress = this.usdtAddress;
        
        // Refresh RPC URL
        if (typeof Network !== 'undefined' && currentNetwork instanceof Network) {
            this.rpcUrl = currentNetwork.rpcUrl || NetworkUtils.getBestRpcUrl(currentNetwork.getAllRpcUrls());
        } else {
            this.rpcUrl = NetworkUtils.getBestRpcUrl(currentNetwork.rpc || currentNetwork.getAllRpcUrls?.() || []);
        }
        
        // Refresh USDT address directly from NetworkUtils
        this.usdtAddress = NetworkUtils.getUSDTAddress(this.currentChainId);
        
        // Reset validation flag
        this._usdtValidated = false;
        
        console.log(`🔧 Network Settings Refreshed:`);
        console.log(`  Network: ${currentNetwork.name} (Chain ID: ${this.currentChainId})`);
        console.log(`  RPC URL: ${oldRpcUrl} → ${this.rpcUrl}`);
        console.log(`  USDT Address: ${oldUsdtAddress} → ${this.usdtAddress}`);
        
        return true;
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
            const currentNetwork = this.getCurrentNetwork();
            console.log(`Refreshed connection to ${currentNetwork.name} - Block: ${blockNumber}`);
            
            return {
                success: true,
                message: `Connection refreshed to ${currentNetwork.name}`,
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
            
            // Store seed phrase securely
            this.secureMemory.storeSensitiveData('seedPhrase', this.seedPhrase);
            
            // Get current network from chainlist
            const currentNetwork = this.getCurrentNetwork();
            if (!currentNetwork) {
                throw new Error(`Network with chain ID ${this.currentChainId} not found. Please load networks first.`);
            }

            // Use provided RPC URL or current network's RPC URL
            if (rpcUrl) {
                this.rpcUrl = rpcUrl;
            } else {
                // Handle both Network class instances and legacy network objects
                if (typeof Network !== 'undefined' && currentNetwork instanceof Network) {
                    this.rpcUrl = currentNetwork.rpcUrl || NetworkUtils.getBestRpcUrl(currentNetwork.getAllRpcUrls());
                } else {
                    this.rpcUrl = NetworkUtils.getBestRpcUrl(currentNetwork.rpc || currentNetwork.getAllRpcUrls?.() || []);
                }
            }

            // Update USDT address for current network
            this.usdtAddress = this.getUSDTAddressForNetwork();

            // Initialize Web3 with current network's RPC
            this.web3 = new Web3(this.rpcUrl);
            
            // Test connection
            const blockNumber = await this.web3.eth.getBlockNumber();
            console.log(`Connected to ${currentNetwork.name} - Block: ${blockNumber}`);
            
            this.isInitialized = true;
            console.log(`HD Wallet Manager initialized successfully on ${currentNetwork.name}`);
            
            return { 
                success: true, 
                message: `Wallet manager initialized on ${currentNetwork.name}`,
                network: currentNetwork
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

            // **SINGLE SOURCE OF TRUTH: No sync needed - always uses CURRENT_NETWORK.chainId**

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
     * Validate USDT address
     */
    async validateUSDTAddress() {
        try {
            if (!this.web3) return false;
            
            // Only validate if we have a USDT address configured
            if (!this.usdtAddress || this.usdtAddress === '') {
                const currentNetwork = this.getCurrentNetwork();
                console.warn(`No USDT address configured for ${currentNetwork ? currentNetwork.name : 'current network'}`);
                return false;
            }
            
            // Simple validation - check if contract exists
            const contractCode = await this.web3.eth.getCode(this.usdtAddress);
            if (contractCode === '0x') {
                console.warn(`USDT contract not found at ${this.usdtAddress}`);
                return false;
            }
            
            console.log(`USDT contract validated: ${this.usdtAddress}`);
            return true;
        } catch (error) {
            console.error('Error validating USDT address:', error);
            return false;
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

                // Debug logging for network verification
                const currentNetwork = this.getCurrentNetwork();
                console.log(`Checking balance for wallet ${walletIndex} on ${currentNetwork ? currentNetwork.name : 'Unknown Network'}`);
                
                // **SINGLE SOURCE OF TRUTH: Always use CURRENT_NETWORK.chainId directly**
                const currentChainId = this.currentChainId;
                const freshUsdtAddress = NetworkUtils.getUSDTAddress(currentChainId);
                
                console.log(`🔧 USDT Address Direct Lookup:`);
                console.log(`  Current Chain ID: ${currentChainId}`);
                console.log(`  Old USDT Address: ${this.usdtAddress}`);
                console.log(`  Fresh USDT Address: ${freshUsdtAddress}`);
                
                // Force update USDT address
                this.usdtAddress = freshUsdtAddress;
                
                console.log(`Using RPC: ${this.rpcUrl}, USDT Address: ${this.usdtAddress}`);

                // Validate USDT address before checking balances (only do this once per session per network)
                if (!this._usdtValidated) {
                    await this.validateUSDTAddress();
                    this._usdtValidated = true;
                }

                // Check Native POL balance
                const polBalance = await this.web3.eth.getBalance(wallet.address);
                const polBalanceEth = this.web3.utils.fromWei(polBalance, 'ether');
                
                // Check USDT balance with better error handling
                let usdtBalanceFormatted = 0;
                try {
                    if (this.usdtAddress && this.usdtAddress !== '') {
                        // First verify the contract exists by checking if it has code
                        const contractCode = await this.web3.eth.getCode(this.usdtAddress);
                        if (contractCode === '0x') {
                            const currentNetwork = this.getCurrentNetwork();
                            console.warn(`USDT contract not found at ${this.usdtAddress} on ${currentNetwork ? currentNetwork.name : 'current network'}`);
                            usdtBalanceFormatted = 0; // Set to 0 if contract doesn't exist
                        } else {
                            const usdtContract = new this.web3.eth.Contract(this.erc20Abi, this.usdtAddress);
                            const usdtBalance = await usdtContract.methods.balanceOf(wallet.address).call();
                            usdtBalanceFormatted = parseFloat(usdtBalance) / Math.pow(10, 6); // USDT has 6 decimals
                        }
                    } else {
                        const currentNetwork = this.getCurrentNetwork();
                        console.warn(`No USDT address configured for ${currentNetwork ? currentNetwork.name : 'current network'}`);
                        usdtBalanceFormatted = 0;
                    }
                } catch (usdtError) {
                    console.warn(`Failed to check USDT balance for wallet ${wallet.index}:`, usdtError.message);
                    usdtBalanceFormatted = 0; // Default to 0 if USDT check fails
                }
                
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
    async executeTransaction(fromWalletIndex, toAddress, amount, token, gasConfig = null) {
        try {
            const fromWallet = this.getWallet(fromWalletIndex);
            if (!fromWallet) {
                throw new Error('Sender wallet not found');
            }

            console.log(`Executing ${token} transaction from wallet ${fromWalletIndex} (${fromWallet.address}) to ${toAddress}, amount: ${amount}`);

            let txHash = null;
            let gasFee = 0;

            // Validate amount
            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Check sufficient balance before transaction
            if (token === 'POL') {
                const balance = await this.web3.eth.getBalance(fromWallet.address);
                const balanceEth = parseFloat(this.web3.utils.fromWei(balance, 'ether'));
                if (balanceEth < amount) {
                    throw new Error(`Insufficient POL balance. Required: ${amount}, Available: ${balanceEth.toFixed(6)}`);
                }
            } else if (token === 'USDT') {
                if (!this.usdtAddress || this.usdtAddress === '') {
                    const currentNetwork = this.getCurrentNetwork();
                    throw new Error(`USDT is not supported on ${currentNetwork ? currentNetwork.name : 'current network'}`);
                }
                
                // Check if USDT contract exists
                const contractCode = await this.web3.eth.getCode(this.usdtAddress);
                if (contractCode === '0x') {
                    const currentNetwork = this.getCurrentNetwork();
                    throw new Error(`USDT contract not found at ${this.usdtAddress} on ${currentNetwork ? currentNetwork.name : 'current network'}`);
                }
                
                const contract = new this.web3.eth.Contract(this.erc20Abi, this.usdtAddress);
                const balance = await contract.methods.balanceOf(fromWallet.address).call();
                const balanceFormatted = parseFloat(balance) / Math.pow(10, 6);
                if (balanceFormatted < amount) {
                    throw new Error(`Insufficient USDT balance. Required: ${amount}, Available: ${balanceFormatted.toFixed(6)}`);
                }
            }

            if (token === 'POL') {
                // Native POL transfer
                let gasPrice, gasLimit;
                
                if (gasConfig) {
                    // Use custom gas configuration
                    gasPrice = Math.floor(this.web3.utils.toWei(gasConfig.gasPrice.toString(), 'gwei'));
                    gasLimit = gasConfig.gasLimit;
                } else {
                    // Use default gas configuration
                    const networkGasPrice = await this.web3.eth.getGasPrice();
                    gasPrice = Math.floor(parseFloat(networkGasPrice) * this.gasPriceMultiplier);
                    gasLimit = 21000;
                }

                // Get nonce with retry mechanism
                let nonce;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount < maxRetries) {
                    try {
                        nonce = await this.web3.eth.getTransactionCount(fromWallet.address, 'pending');
                        break;
                    } catch (nonceError) {
                        retryCount++;
                        console.warn(`Nonce fetch attempt ${retryCount} failed:`, nonceError.message);
                        if (retryCount >= maxRetries) {
                            throw new Error(`Failed to get nonce after ${maxRetries} attempts: ${nonceError.message}`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    }
                }

                const tx = {
                    from: fromWallet.address,
                    to: toAddress,
                    value: this.web3.utils.toWei(amount.toString(), 'ether'),
                    gas: gasLimit,
                    gasPrice: gasPrice,
                    nonce: nonce
                };
                
                // Add EIP-1559 fields if priority fee is specified
                if (gasConfig && gasConfig.priorityFee > 0) {
                    const priorityFeeWei = this.web3.utils.toWei(gasConfig.priorityFee.toString(), 'gwei');
                    tx.maxPriorityFeePerGas = priorityFeeWei;
                    tx.maxFeePerGas = Math.floor(parseFloat(gasPrice) + parseFloat(priorityFeeWei));
                    delete tx.gasPrice; // Use EIP-1559 format
                }

                console.log(`POL transaction details:`, { from: tx.from, to: tx.to, value: tx.value, nonce: tx.nonce, gasPrice: tx.gasPrice });

                const signedTx = await this.web3.eth.accounts.signTransaction(tx, fromWallet.privateKey);
                const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

                txHash = receipt.transactionHash;
                gasFee = (gasLimit * gasPrice) / Math.pow(10, 18);

                console.log(`POL transfer successful: ${txHash}`);
                return { success: true, txHash, gasFee };

            } else if (token === 'USDT') {
                // USDT token transfer
                const contract = new this.web3.eth.Contract(this.erc20Abi, this.usdtAddress);
                const amountWei = Math.floor(amount * Math.pow(10, 6)); // USDT has 6 decimals

                let gasPrice, gasLimit;
                
                if (gasConfig) {
                    // Use custom gas configuration
                    gasPrice = Math.floor(this.web3.utils.toWei(gasConfig.gasPrice.toString(), 'gwei'));
                    gasLimit = gasConfig.gasLimit;
                } else {
                    // Use default gas configuration
                    const networkGasPrice = await this.web3.eth.getGasPrice();
                    gasPrice = Math.floor(parseFloat(networkGasPrice) * this.gasPriceMultiplier);
                    gasLimit = 65000;
                }

                // Get nonce with retry mechanism
                let nonce;
                let retryCount = 0;
                const maxRetries = 3;
                
                while (retryCount < maxRetries) {
                    try {
                        nonce = await this.web3.eth.getTransactionCount(fromWallet.address, 'pending');
                        break;
                    } catch (nonceError) {
                        retryCount++;
                        console.warn(`Nonce fetch attempt ${retryCount} failed:`, nonceError.message);
                        if (retryCount >= maxRetries) {
                            throw new Error(`Failed to get nonce after ${maxRetries} attempts: ${nonceError.message}`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    }
                }

                const tx = {
                    from: fromWallet.address,
                    to: this.usdtAddress,
                    data: contract.methods.transfer(toAddress, amountWei.toString()).encodeABI(),
                    gas: gasLimit,
                    gasPrice: gasPrice,
                    nonce: nonce
                };
                
                // Add EIP-1559 fields if priority fee is specified
                if (gasConfig && gasConfig.priorityFee > 0) {
                    const priorityFeeWei = this.web3.utils.toWei(gasConfig.priorityFee.toString(), 'gwei');
                    tx.maxPriorityFeePerGas = priorityFeeWei;
                    tx.maxFeePerGas = Math.floor(parseFloat(gasPrice) + parseFloat(priorityFeeWei));
                    delete tx.gasPrice; // Use EIP-1559 format
                }

                console.log(`USDT transaction details:`, { from: tx.from, to: tx.to, amount: amountWei, nonce: tx.nonce, gasPrice: tx.gasPrice });

                const signedTx = await this.web3.eth.accounts.signTransaction(tx, fromWallet.privateKey);
                const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

                txHash = receipt.transactionHash;
                gasFee = (gasLimit * gasPrice) / Math.pow(10, 18);

                console.log(`USDT transfer successful: ${txHash}`);
                return { success: true, txHash, gasFee };
            }

        } catch (error) {
            console.error(`Transaction failed for wallet ${fromWalletIndex}:`, error);
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
    
    /**
     * Clear sensitive data for security
     */
    clearSensitiveData() {
        try {
            // Clear seed phrase
            this.seedPhrase = '';
            
            // Clear private keys from wallets
            this.wallets.forEach(wallet => {
                if (wallet.privateKey) {
                    // Overwrite with random data (best effort in JS)
                    wallet.privateKey = SecurityUtils.secureRandom(64);
                    delete wallet.privateKey;
                }
            });
            
            // Clear secure memory
            if (this.secureMemory) {
                this.secureMemory.clearAllSensitiveData();
            }
            
            // Reset initialization state
            this.isInitialized = false;
            
            console.log('Sensitive data cleared successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Error clearing sensitive data:', error);
            return { success: false, error: error.message };
        }
    }
} 