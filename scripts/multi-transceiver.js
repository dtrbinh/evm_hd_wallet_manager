/**
 * MultiTransceiver Class
 * Handles multi-send and multi-receive transactions
 */
class MultiTransceiver {
    constructor(walletManager) {
        this.walletManager = walletManager;
        this.transactionHistory = [];
    }

    /**
     * Estimate gas fees for multi-transaction
     */
    async estimateMultiTransactionGas(mode, token, transactionCount, amount) {
        try {
            return await this.walletManager.estimateGas(token, transactionCount);
        } catch (error) {
            console.error('Error estimating multi-transaction gas:', error);
            throw error;
        }
    }

    /**
     * Check if wallets have sufficient balance for multi-receive
     */
    async checkMultiReceiveBalances(selectedWallets, amount, token) {
        const insufficientWallets = [];
        
        for (const walletIndex of selectedWallets) {
            const wallet = this.walletManager.getWallet(walletIndex);
            if (!wallet) {
                insufficientWallets.push({
                    index: walletIndex,
                    error: 'Wallet not found'
                });
                continue;
            }
            
            try {
                if (token === 'POL') {
                    const balance = await this.walletManager.web3.eth.getBalance(wallet.address);
                    const balanceEth = parseFloat(this.walletManager.web3.utils.fromWei(balance, 'ether'));
                    if (balanceEth < amount) {
                        insufficientWallets.push({
                            index: walletIndex,
                            address: wallet.address,
                            required: amount,
                            available: balanceEth.toFixed(6),
                            error: `Insufficient POL balance`
                        });
                    }
                } else if (token === 'USDT') {
                    const contract = new this.walletManager.web3.eth.Contract(
                        this.walletManager.erc20Abi, 
                        this.walletManager.usdtAddress
                    );
                    const balance = await contract.methods.balanceOf(wallet.address).call();
                    const balanceFormatted = parseFloat(balance) / Math.pow(10, 6);
                    if (balanceFormatted < amount) {
                        insufficientWallets.push({
                            index: walletIndex,
                            address: wallet.address,
                            required: amount,
                            available: balanceFormatted.toFixed(6),
                            error: `Insufficient USDT balance`
                        });
                    }
                }
            } catch (error) {
                insufficientWallets.push({
                    index: walletIndex,
                    address: wallet.address,
                    error: `Balance check failed: ${error.message}`
                });
            }
        }
        
        return insufficientWallets;
    }

    /**
     * Execute multi-transaction (multi-send or multi-receive)
     */
    async executeMultiTransaction(params) {
        const { mode, token, senderWallet, receiverWallet, selectedWallets, amount } = params;
        
        console.log(`Executing ${mode} transaction: ${token}, amount: ${amount}, wallets: ${selectedWallets.length}`);
        
        // Pre-check balances for multi-receive
        if (mode === 'multi-receive') {
            console.log('Checking sender wallet balances before starting multi-receive...');
            const insufficientWallets = await this.checkMultiReceiveBalances(selectedWallets, amount, token);
            
            if (insufficientWallets.length > 0) {
                console.error('Insufficient balance detected in sender wallets:', insufficientWallets);
                const errorDetails = insufficientWallets.map(w => 
                    `Wallet ${w.index}: ${w.error}${w.available ? ` (Required: ${w.required}, Available: ${w.available})` : ''}`
                ).join('; ');
                throw new Error(`Cannot proceed with multi-receive. ${errorDetails}`);
            }
            console.log('✓ All sender wallets have sufficient balance');
        }
        
        const transactions = [];
        let successfulTransactions = 0;
        let failedTransactions = 0;
        let totalGasUsed = 0;
        
        try {
            if (mode === 'multi-send') {
                // One sender to multiple receivers
                const sender = this.walletManager.getWallet(senderWallet);
                if (!sender) {
                    throw new Error('Sender wallet not found');
                }
                
                for (let i = 0; i < selectedWallets.length; i++) {
                    const receiverIndex = selectedWallets[i];
                    const receiver = this.walletManager.getWallet(receiverIndex);
                    if (!receiver) {
                        console.warn(`Receiver wallet ${receiverIndex} not found, skipping`);
                        continue;
                    }
                    
                    // Show progress
                    this.updateProgress(`Sending ${amount} ${token} to wallet ${receiver.index}...`, `Transaction ${i + 1}/${selectedWallets.length}`, i + 1);
                    
                    const txResult = await this.walletManager.executeTransaction(
                        sender.index, 
                        receiver.address, 
                        amount, 
                        token
                    );
                    
                    const transaction = {
                        type: 'Multi-Send',
                        from: `Wallet ${sender.index}`,
                        to: `Wallet ${receiver.index}`,
                        fromAddress: sender.address,
                        toAddress: receiver.address,
                        token: token,
                        amount: amount,
                        gas_fee: txResult.gasFee,
                        status: txResult.success ? 'success' : 'failed',
                        tx_hash: txResult.txHash,
                        error: txResult.error || null,
                        network: this.walletManager.getCurrentNetwork().name,
                        chainId: this.walletManager.getCurrentNetwork().chainId,
                        timestamp: new Date().toISOString()
                    };
                    
                    transactions.push(transaction);
                    this.transactionHistory.push(transaction);
                    
                    // Update progress dialog with result
                    this.updateTransactionResult(txResult.success, txResult.txHash, txResult.gasFee, txResult.error);
                    
                    if (txResult.success) {
                        successfulTransactions++;
                        console.log(`✓ Multi-send transaction ${i + 1} successful: ${txResult.txHash}`);
                    } else {
                        failedTransactions++;
                        console.error(`✗ Multi-send transaction ${i + 1} failed: ${txResult.error}`);
                    }
                    
                    totalGasUsed += txResult.gasFee;
                    
                    // Delay between transactions to avoid nonce issues
                    if (i < selectedWallets.length - 1) { // Don't delay after the last transaction
                        console.log(`Waiting 1 second before next transaction...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
            } else if (mode === 'multi-receive') {
                // Multiple senders to one receiver
                const receiver = this.walletManager.getWallet(receiverWallet);
                if (!receiver) {
                    throw new Error('Receiver wallet not found');
                }
                
                console.log(`Starting multi-receive: ${selectedWallets.length} senders → Wallet ${receiver.index} (${receiver.address})`);
                
                for (let i = 0; i < selectedWallets.length; i++) {
                    const senderIndex = selectedWallets[i];
                    const sender = this.walletManager.getWallet(senderIndex);
                    
                    if (!sender) {
                        console.warn(`Sender wallet ${senderIndex} not found, skipping`);
                        continue;
                    }
                    
                    // Show progress
                    this.updateProgress(`Receiving ${amount} ${token} from wallet ${sender.index} (${i + 1}/${selectedWallets.length})...`);
                    
                    console.log(`Multi-receive transaction ${i + 1}/${selectedWallets.length}: Wallet ${sender.index} → Wallet ${receiver.index}`);
                    
                    const txResult = await this.walletManager.executeTransaction(
                        sender.index, 
                        receiver.address, 
                        amount, 
                        token
                    );
                    
                    const transaction = {
                        type: 'Multi-Receive',
                        from: `Wallet ${sender.index}`,
                        to: `Wallet ${receiver.index}`,
                        fromAddress: sender.address,
                        toAddress: receiver.address,
                        token: token,
                        amount: amount,
                        gas_fee: txResult.gasFee,
                        status: txResult.success ? 'success' : 'failed',
                        tx_hash: txResult.txHash,
                        error: txResult.error || null,
                        network: this.walletManager.getCurrentNetwork().name,
                        chainId: this.walletManager.getCurrentNetwork().chainId,
                        timestamp: new Date().toISOString()
                    };
                    
                    transactions.push(transaction);
                    this.transactionHistory.push(transaction);
                    
                    // Update progress dialog with result
                    this.updateTransactionResult(txResult.success, txResult.txHash, txResult.gasFee, txResult.error);
                    
                    if (txResult.success) {
                        successfulTransactions++;
                        console.log(`✓ Multi-receive transaction ${i + 1} successful: ${txResult.txHash}`);
                    } else {
                        failedTransactions++;
                        console.error(`✗ Multi-receive transaction ${i + 1} failed: ${txResult.error}`);
                    }
                    
                    totalGasUsed += txResult.gasFee;
                    
                    // Longer delay between transactions to avoid nonce issues
                    if (i < selectedWallets.length - 1) { // Don't delay after the last transaction
                        console.log(`Waiting 2 seconds before next transaction...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            
            console.log(`Multi-transaction completed: ${successfulTransactions} successful, ${failedTransactions} failed`);
            
            // Complete the progress dialog
            if (window.uiController && window.uiController.completeTransactionProgress) {
                window.uiController.completeTransactionProgress();
            }
            
            return {
                transactions,
                successfulTransactions,
                failedTransactions,
                totalGasUsed
            };
            
        } catch (error) {
            console.error(`Error executing multi-transaction: ${error.message}`);
            
            // Complete the progress dialog with error state
            if (window.uiController && window.uiController.completeTransactionProgress) {
                window.uiController.completeTransactionProgress(true, error.message);
            }
            
            throw error;
        }
    }

    /**
     * Get transaction history
     */
    getTransactionHistory() {
        return this.transactionHistory;
    }

    /**
     * Clear transaction history
     */
    clearTransactionHistory() {
        this.transactionHistory = [];
    }

    /**
     * Export transaction history to Excel
     */
    exportTransactionHistory() {
        try {
            if (this.transactionHistory.length === 0) {
                throw new Error('No transaction history to export');
            }

            const wb = XLSX.utils.book_new();
            
            // Transaction history sheet
            const historyData = this.transactionHistory.map(tx => ({
                'Type': tx.type,
                'From': tx.from,
                'To': tx.to,
                'From Address': tx.fromAddress,
                'To Address': tx.toAddress,
                'Token': tx.token,
                'Amount': tx.amount.toFixed(6),
                'Gas Fee (POL)': tx.gas_fee.toFixed(6),
                'Status': tx.status,
                'TX Hash': tx.tx_hash || 'N/A',
                'Network': tx.network || 'Unknown',
                'Chain ID': tx.chainId || 'Unknown',
                'Error': tx.error || 'N/A',
                'Timestamp': tx.timestamp
            }));
            
            const historyWs = XLSX.utils.json_to_sheet(historyData);
            XLSX.utils.book_append_sheet(wb, historyWs, 'Transaction History');
            
            // Summary sheet
            const successful = this.transactionHistory.filter(tx => tx.status === 'success').length;
            const failed = this.transactionHistory.filter(tx => tx.status === 'failed').length;
            const totalGas = this.transactionHistory.reduce((sum, tx) => sum + tx.gas_fee, 0);
            
            const summaryData = [
                { 'Metric': 'Total Transactions', 'Value': this.transactionHistory.length },
                { 'Metric': 'Successful', 'Value': successful },
                { 'Metric': 'Failed', 'Value': failed },
                { 'Metric': 'Success Rate', 'Value': `${((successful / this.transactionHistory.length) * 100).toFixed(2)}%` },
                { 'Metric': 'Total Gas Used (POL)', 'Value': totalGas.toFixed(6) },
                { 'Metric': 'Export Date', 'Value': new Date().toISOString() }
            ];
            
            const summaryWs = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
            
            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `multi_transaction_history_${timestamp}.xlsx`;
            
            // Download file
            XLSX.writeFile(wb, filename);
            
            console.log(`Transaction history exported: ${filename}`);
            return { success: true, filename };
            
        } catch (error) {
            console.error('Error exporting transaction history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update progress (can be overridden by UI)
     */
    updateProgress(message, details = '', transactionIndex = null) {
        console.log(`MultiTransceiver: ${message}`);
        
        // Use UI controller's transaction progress dialog if available
        if (window.uiController && window.uiController.updateTransactionProgress) {
            window.uiController.updateTransactionProgress(message, details, transactionIndex);
        }
        
        // Fallback to old method
        if (window.updateProgressMessage) {
            window.updateProgressMessage(message);
        }
    }

    /**
     * Update transaction result in progress dialog
     */
    updateTransactionResult(success, txHash, gasFee, error = null) {
        if (window.uiController && window.uiController.updateTransactionResult) {
            window.uiController.updateTransactionResult(success, txHash, gasFee, error);
        }
    }

    /**
     * Validate transaction parameters
     */
    validateTransactionParams(params) {
        const { mode, token, senderWallet, receiverWallet, selectedWallets, amount } = params;
        
        const errors = [];
        
        if (!mode || !['multi-send', 'multi-receive'].includes(mode)) {
            errors.push('Invalid transaction mode');
        }
        
        if (!token || !['POL', 'USDT'].includes(token)) {
            errors.push('Invalid token type');
        }
        
        if (!amount || amount <= 0) {
            errors.push('Amount must be greater than 0');
        }
        
        if (!selectedWallets || selectedWallets.length === 0) {
            errors.push('No wallets selected');
        }
        
        if (mode === 'multi-send' && !senderWallet) {
            errors.push('Sender wallet not selected');
        }
        
        if (mode === 'multi-receive' && !receiverWallet) {
            errors.push('Receiver wallet not selected');
        }
        
        // Check for sufficient balance (basic check)
        if (mode === 'multi-send' && senderWallet) {
            const sender = this.walletManager.getWallet(senderWallet);
            if (sender) {
                const totalAmount = amount * selectedWallets.length;
                const balance = token === 'POL' ? sender.nativePol : sender.usdt;
                
                if (typeof balance === 'number' && balance < totalAmount) {
                    errors.push(`Insufficient ${token} balance. Required: ${totalAmount.toFixed(6)}, Available: ${balance.toFixed(6)}`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get transaction statistics
     */
    getTransactionStats() {
        const total = this.transactionHistory.length;
        const successful = this.transactionHistory.filter(tx => tx.status === 'success').length;
        const failed = this.transactionHistory.filter(tx => tx.status === 'failed').length;
        const totalGas = this.transactionHistory.reduce((sum, tx) => sum + tx.gas_fee, 0);
        
        const tokenStats = {};
        this.transactionHistory.forEach(tx => {
            if (!tokenStats[tx.token]) {
                tokenStats[tx.token] = { count: 0, amount: 0, gas: 0 };
            }
            tokenStats[tx.token].count++;
            tokenStats[tx.token].amount += tx.amount;
            tokenStats[tx.token].gas += tx.gas_fee;
        });
        
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
            totalGas: totalGas.toFixed(6),
            tokenStats
        };
    }
} 