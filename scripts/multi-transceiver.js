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
     * Execute multi-transaction (multi-send or multi-receive)
     */
    async executeMultiTransaction(params) {
        const { mode, token, senderWallet, receiverWallet, selectedWallets, amount } = params;
        
        console.log(`Executing ${mode} transaction: ${token}, amount: ${amount}, wallets: ${selectedWallets.length}`);
        
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
                
                for (const receiverIndex of selectedWallets) {
                    const receiver = this.walletManager.getWallet(receiverIndex);
                    if (!receiver) {
                        console.warn(`Receiver wallet ${receiverIndex} not found, skipping`);
                        continue;
                    }
                    
                    // Show progress
                    this.updateProgress(`Sending ${amount} ${token} to wallet ${receiver.index}...`);
                    
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
                    
                    if (txResult.success) {
                        successfulTransactions++;
                    } else {
                        failedTransactions++;
                    }
                    
                    totalGasUsed += txResult.gasFee;
                    
                    // Small delay between transactions to avoid nonce issues
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } else if (mode === 'multi-receive') {
                // Multiple senders to one receiver
                const receiver = this.walletManager.getWallet(receiverWallet);
                if (!receiver) {
                    throw new Error('Receiver wallet not found');
                }
                
                for (const senderIndex of selectedWallets) {
                    const sender = this.walletManager.getWallet(senderIndex);
                    if (!sender) {
                        console.warn(`Sender wallet ${senderIndex} not found, skipping`);
                        continue;
                    }
                    
                    // Show progress
                    this.updateProgress(`Receiving ${amount} ${token} from wallet ${sender.index}...`);
                    
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
                    
                    if (txResult.success) {
                        successfulTransactions++;
                    } else {
                        failedTransactions++;
                    }
                    
                    totalGasUsed += txResult.gasFee;
                    
                    // Small delay between transactions to avoid nonce issues
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            console.log(`Multi-transaction completed: ${successfulTransactions} successful, ${failedTransactions} failed`);
            
            return {
                transactions,
                successfulTransactions,
                failedTransactions,
                totalGasUsed
            };
            
        } catch (error) {
            console.error(`Error executing multi-transaction: ${error.message}`);
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
    updateProgress(message) {
        console.log(`MultiTransceiver: ${message}`);
        // This method can be overridden by the UI controller
        if (window.updateProgressMessage) {
            window.updateProgressMessage(message);
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