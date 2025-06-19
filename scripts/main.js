/**
 * Main Application Script
 * Initializes all components and provides global functions
 */

// Global variables
let walletManager = null;
let multiTransceiver = null;
let uiController = null;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('HD Wallet Manager starting...');
    
    // Initialize UI Controller
    uiController = new UIController();
    uiController.initialize();
    
    // Set up global progress update function
    window.updateProgressMessage = function(message) {
        uiController.showProgress(message);
    };
    
    // Initialize network display
    updateNetworkDisplay();
    
    console.log('Application initialized successfully');
});

/**
 * Initialize wallet manager
 */
async function initializeWalletManager() {
    try {
        const seedPhrase = document.getElementById('seedPhrase').value.trim();
        const rpcUrl = document.getElementById('rpcUrl').value.trim();
        
        // Validate seed phrase
        const validation = uiController.validateSeedPhrase(seedPhrase);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }
        
        uiController.showFullscreenLoading('Initializing Wallet Manager', 'Connecting to blockchain network...', 10);
        
        // Create wallet manager instance
        walletManager = new HDWalletManager();
        
        // Check current network switch state and set network before initialization
        const networkSwitch = document.getElementById('networkSwitch');
        const targetNetwork = networkSwitch && networkSwitch.checked ? 'testnet' : 'mainnet';
        
        // Switch to the selected network if it's not the default
        if (targetNetwork !== DEFAULT_NETWORK) {
            console.log(`Setting wallet manager to ${targetNetwork} before initialization`);
            walletManager.switchNetwork(targetNetwork);
        }
        
        // Initialize
        const result = await walletManager.initialize(seedPhrase, rpcUrl || null);
        
        if (result.success) {
            // Create multi-transceiver instance
            multiTransceiver = new MultiTransceiver(walletManager);
            
            // Update network display to reflect the correct network
            updateNetworkDisplay();
            
            uiController.updateFullscreenLoading('Wallet Manager Initialized!', `Ready to generate wallets on ${result.network.name}`, 100);
            uiController.showStepControls();
            setTimeout(() => uiController.hideFullscreenLoading(), 1000);
            
            uiController.showToast(`Wallet manager initialized successfully on ${result.network.name}!`, 'success');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        uiController.showError(error.message);
        uiController.showToast('Initialization failed: ' + error.message, 'error');
    }
}

/**
 * Generate HD wallets
 */
async function generateWallets() {
    try {
        if (!walletManager || !walletManager.isInitialized) {
            alert('Please initialize the wallet manager first');
            return;
        }
        
        const startIndex = parseInt(document.getElementById('startIndex').value) || 0;
        const endIndex = parseInt(document.getElementById('endIndex').value) || 9;
        const count = endIndex - startIndex + 1;
        
        // Validate range
        if (endIndex < startIndex) {
            alert('End index must be greater than or equal to start index');
            return;
        }
        
        if (count > 100) {
            alert('Maximum 100 wallets allowed');
            return;
        }
        
        uiController.showFullscreenLoading('Generating HD Wallets', `Creating ${count} wallets from seed phrase...`, 20);
        
        const wallets = walletManager.generateWallets(count, startIndex, endIndex);
        
        // Format for display
        const walletsForDisplay = wallets.map(wallet => ({
            ...wallet,
            native_pol_balance: null,
            usdt_balance: null,
            timestamp: null
        }));
        
        uiController.updateWalletsTable(walletsForDisplay);
        uiController.updateFullscreenLoading('Wallets Generated Successfully!', `${wallets.length} wallets ready for use`, 100);
        setTimeout(() => uiController.hideFullscreenLoading(), 1000);
        
        uiController.showToast(`Generated ${wallets.length} wallets successfully!`, 'success');
        
    } catch (error) {
        console.error('Error generating wallets:', error);
        uiController.showError(error.message);
        uiController.showToast('Failed to generate wallets: ' + error.message, 'error');
    }
}

/**
 * Check balances for all wallets (progressive update)
 */
async function checkBalances() {
    try {
        if (!walletManager || !walletManager.wallets || walletManager.wallets.length === 0) {
            alert('Please generate wallets first');
            return;
        }
        
        const totalWallets = walletManager.wallets.length;
        let completedWallets = 0;
        let errorCount = 0;
        
        // Show toast notification
        uiController.showToast(`Starting balance check for ${totalWallets} wallets...`, 'info');
        
        // Progress callback function
        const onProgress = (walletIndex, status, walletData) => {
            if (status === 'checking') {
                // Update UI to show loading state for this wallet
                uiController.updateSingleWalletRow({ index: walletIndex }, 'checking');
            } else if (status === 'completed' || status === 'error') {
                // Update UI with the wallet data
                uiController.updateSingleWalletRow(walletData, status);
                
                completedWallets++;
                if (status === 'error') {
                    errorCount++;
                }
                
                // Update totals in real-time
                const totals = walletManager.getTotals();
                uiController.updateTotals(totals);
                
                // Show progress in console
                console.log(`Balance check progress: ${completedWallets}/${totalWallets} wallets completed`);
                
                // Show completion toast when all wallets are done
                if (completedWallets === totalWallets) {
                    const successCount = totalWallets - errorCount;
                    if (errorCount === 0) {
                        uiController.showToast(`Balance check completed! All ${totalWallets} wallets updated successfully.`, 'success');
                    } else {
                        uiController.showToast(`Balance check completed! ${successCount} successful, ${errorCount} failed.`, 'warning');
                    }
                }
            }
        };
        
        // Check balances for all wallets concurrently (but with controlled concurrency)
        const concurrencyLimit = 3; // Check 3 wallets at a time to avoid overwhelming the RPC
        const walletPromises = [];
        
        for (let i = 0; i < walletManager.wallets.length; i += concurrencyLimit) {
            const batch = walletManager.wallets.slice(i, i + concurrencyLimit);
            
            const batchPromises = batch.map(wallet => 
                walletManager.checkSingleWalletBalance(wallet.index, onProgress)
                    .catch(error => {
                        console.error(`Failed to check wallet ${wallet.index}:`, error);
                        // Return error result to maintain consistency
                        return {
                            index: wallet.index,
                            address: wallet.address,
                            path: wallet.path,
                            native_pol_balance: 'error',
                            usdt_balance: 'error',
                            timestamp: new Date().toISOString()
                        };
                    })
            );
            
            walletPromises.push(...batchPromises);
            
            // Wait for current batch to complete before starting next batch
            await Promise.all(batchPromises);
            
            // Small delay between batches to be nice to the RPC
            if (i + concurrencyLimit < walletManager.wallets.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Wait for all promises to complete
        await Promise.all(walletPromises);
        
        console.log('Balance check completed for all wallets');
        
    } catch (error) {
        console.error('Error checking balances:', error);
        uiController.showToast('Failed to check balances: ' + error.message, 'error');
    }
}

/**
 * Open MultiTransceiver modal
 */
async function openMultiTransceiver() {
    try {
        if (!walletManager || !walletManager.isInitialized) {
            alert('Please initialize the wallet manager first');
            return;
        }
        
        if (!walletManager.wallets || walletManager.wallets.length === 0) {
            alert('Please generate wallets first');
            return;
        }
        
        // Get current wallets with balance data
        let walletsWithBalances = walletManager.getWallets();
        
        // Try to get fresh balance data if available
        if (walletManager.wallets.some(w => w.nativePol !== null || w.usdt !== null)) {
            walletsWithBalances = walletManager.getWallets();
        }
        
        // Populate wallet selections
        uiController.populateWalletDropdowns(walletsWithBalances);
        uiController.populateWalletCheckboxes(walletsWithBalances);
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('multiTransceiverModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error opening MultiTransceiver:', error);
        uiController.showToast('Error opening MultiTransceiver: ' + error.message, 'error');
    }
}

/**
 * Calculate gas fees for multi-transaction
 */
async function calculateGasFees() {
    try {
        const mode = document.querySelector('input[name="transactionMode"]:checked').value;
        const token = mode === 'multi-send' ? 
            document.getElementById('tokenToSend').value : 
            document.getElementById('tokenToReceive').value;
        
        let selectedWallets = [];
        let amount = 0;
        
        if (mode === 'multi-send') {
            const selectedReceivers = document.querySelectorAll('#receiverWallets input:checked');
            selectedWallets = Array.from(selectedReceivers).map(cb => parseInt(cb.value));
            amount = parseFloat(document.getElementById('amountPerReceiver').value) || 0;
        } else {
            const selectedSenders = document.querySelectorAll('#senderWallets input:checked');
            selectedWallets = Array.from(selectedSenders).map(cb => parseInt(cb.value));
            amount = parseFloat(document.getElementById('amountPerSender').value) || 0;
        }
        
        if (selectedWallets.length === 0 || amount <= 0) {
            alert('Please select wallets and enter amount');
            return;
        }
        
        document.getElementById('estimatedGasFee').textContent = 'Calculating...';
        
        const gasEstimate = await multiTransceiver.estimateMultiTransactionGas(
            mode, 
            token, 
            selectedWallets.length, 
            amount
        );
        
        const gasFee = gasEstimate.totalGasFee;
        const totalAmount = parseFloat(document.getElementById('totalAmount').textContent);
        const totalCost = token === 'POL' ? totalAmount + gasFee : totalAmount;
        
        document.getElementById('estimatedGasFee').textContent = gasFee.toFixed(6) + ' POL';
        document.getElementById('totalCost').textContent = totalCost.toFixed(6) + (token === 'POL' ? ' POL' : ` ${token} + ${gasFee.toFixed(6)} POL`);
        document.getElementById('executeTransactionBtn').disabled = false;
        
    } catch (error) {
        document.getElementById('estimatedGasFee').textContent = 'Error calculating gas';
        console.error('Gas calculation error:', error);
        uiController.showToast('Error calculating gas fees: ' + error.message, 'error');
    }
}

/**
 * Execute multi-transaction
 */
async function executeMultiTransaction() {
    try {
        const mode = document.querySelector('input[name="transactionMode"]:checked').value;
        const token = mode === 'multi-send' ? 
            document.getElementById('tokenToSend').value : 
            document.getElementById('tokenToReceive').value;
        
        let selectedWallets = [];
        let amount = 0;
        let senderWallet = null;
        let receiverWallet = null;
        
        if (mode === 'multi-send') {
            senderWallet = parseInt(document.getElementById('senderWallet').value);
            const selectedReceivers = document.querySelectorAll('#receiverWallets input:checked');
            selectedWallets = Array.from(selectedReceivers).map(cb => parseInt(cb.value));
            amount = parseFloat(document.getElementById('amountPerReceiver').value) || 0;
        } else {
            receiverWallet = parseInt(document.getElementById('receiverWallet').value);
            const selectedSenders = document.querySelectorAll('#senderWallets input:checked');
            selectedWallets = Array.from(selectedSenders).map(cb => parseInt(cb.value));
            amount = parseFloat(document.getElementById('amountPerSender').value) || 0;
        }
        
        // Validate parameters
        const params = {
            mode,
            token,
            senderWallet,
            receiverWallet,
            selectedWallets,
            amount
        };
        
        const validation = multiTransceiver.validateTransactionParams(params);
        if (!validation.valid) {
            alert('Validation failed:\n' + validation.errors.join('\n'));
            return;
        }
        
        if (!confirm(`Execute ${mode} transaction for ${selectedWallets.length} wallets?\n\nTotal amount: ${(amount * selectedWallets.length).toFixed(6)} ${token}`)) {
            return;
        }
        
        // Disable button and show progress
        document.getElementById('executeTransactionBtn').disabled = true;
        document.getElementById('executeTransactionBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Show transaction progress dialog
        uiController.showTransactionProgress(mode, selectedWallets.length);
        
        // Close the multi-transceiver modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('multiTransceiverModal'));
        modal.hide();
        
        const result = await multiTransceiver.executeMultiTransaction(params);
        
        // Complete the progress dialog
        uiController.completeTransactionProgress();
        
        // Update transaction history
        uiController.updateTransactionHistoryTable(multiTransceiver.getTransactionHistory());
        
        // Refresh balances
        await checkBalances();
        
        const successMessage = `Multi-transaction completed!\nSuccessful: ${result.successfulTransactions}\nFailed: ${result.failedTransactions}\nTotal gas used: ${result.totalGasUsed.toFixed(6)} POL`;
        uiController.showToast(`Multi-transaction completed: ${result.successfulTransactions}/${selectedWallets.length} successful`, 'success');
        
    } catch (error) {
        console.error('Transaction execution error:', error);
        
        // Hide progress dialog on error
        if (uiController.transactionProgressState) {
            uiController.hideTransactionProgress();
        }
        
        uiController.showError(error.message);
        uiController.showToast('Transaction failed: ' + error.message, 'error');
    } finally {
        document.getElementById('executeTransactionBtn').disabled = false;
        document.getElementById('executeTransactionBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Execute Transaction';
    }
}

/**
 * Save wallet data to Excel
 */
async function saveToExcel() {
    try {
        if (!walletManager || !walletManager.wallets || walletManager.wallets.length === 0) {
            alert('No wallet data to export');
            return;
        }
        
        uiController.showProgress('Generating Excel file...', 80);
        
        const result = walletManager.exportToExcel();
        
        if (result.success) {
            uiController.showProgress('Excel file saved successfully!', 100);
            uiController.hideProgress();
            uiController.showToast(`Excel file saved: ${result.filename}`, 'success');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error saving Excel:', error);
        uiController.showError(error.message);
        uiController.showToast('Failed to save Excel file: ' + error.message, 'error');
    }
}

/**
 * Update wallet count (global function for HTML onchange)
 */
function updateWalletCount() {
    if (uiController) {
        uiController.updateWalletCount();
    }
}

/**
 * Export transaction history
 */
function exportTransactionHistory() {
    try {
        if (!multiTransceiver || multiTransceiver.getTransactionHistory().length === 0) {
            alert('No transaction history to export');
            return;
        }
        
        const result = multiTransceiver.exportTransactionHistory();
        
        if (result.success) {
            uiController.showToast(`Transaction history exported: ${result.filename}`, 'success');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error exporting transaction history:', error);
        uiController.showToast('Failed to export transaction history: ' + error.message, 'error');
    }
}

/**
 * Clear transaction history
 */
function clearTransactionHistory() {
    if (!multiTransceiver) return;
    
    if (confirm('Are you sure you want to clear all transaction history?')) {
        multiTransceiver.clearTransactionHistory();
        document.getElementById('transactionHistoryCard').style.display = 'none';
        uiController.showToast('Transaction history cleared', 'info');
    }
}

/**
 * Copy address to clipboard
 */
function copyAddress(address) {
    if (uiController) {
        uiController.copyToClipboard(address);
    }
}

/**
 * Refresh balances
 */
async function refreshBalances() {
    await checkBalances();
}

/**
 * Show transaction statistics
 */
function showTransactionStats() {
    if (!multiTransceiver) {
        alert('No transaction data available');
        return;
    }
    
    const stats = multiTransceiver.getTransactionStats();
    
    let message = `Transaction Statistics:\n\n`;
    message += `Total Transactions: ${stats.total}\n`;
    message += `Successful: ${stats.successful}\n`;
    message += `Failed: ${stats.failed}\n`;
    message += `Success Rate: ${stats.successRate}%\n`;
    message += `Total Gas Used: ${stats.totalGas} POL\n\n`;
    
    if (Object.keys(stats.tokenStats).length > 0) {
        message += `Token Statistics:\n`;
        Object.entries(stats.tokenStats).forEach(([token, data]) => {
            message += `${token}: ${data.count} transactions, ${data.amount.toFixed(6)} total amount, ${data.gas.toFixed(6)} POL gas\n`;
        });
    }
    
    alert(message);
}

/**
 * Toggle between mainnet and testnet
 */
async function toggleNetwork() {
    try {
        const networkSwitch = document.getElementById('networkSwitch');
        const targetNetwork = networkSwitch.checked ? 'testnet' : 'mainnet';
        
        // If wallet manager exists, switch its network
        if (walletManager) {
            // Store wallet generation parameters before switching
            const hadWallets = walletManager.wallets && walletManager.wallets.length > 0;
            const walletCount = hadWallets ? walletManager.wallets.length : 0;
            const startIndex = 0; // Default start index
            const endIndex = walletCount > 0 ? walletCount - 1 : 9; // Default end index
            
            const result = walletManager.switchNetwork(targetNetwork);
            if (result.success) {
                // Re-initialize wallet manager with new network if seed phrase is available
                const seedPhrase = document.getElementById('seedPhrase').value.trim();
                if (seedPhrase) {
                    uiController.showFullscreenLoading('Switching Network', `Connecting to ${result.network.name}...`, 20);
                    
                    // Re-initialize with new network
                    const initResult = await walletManager.initialize(seedPhrase);
                    if (initResult.success) {
                        // Ensure Web3 connection is properly refreshed for the new network
                        await walletManager.refreshConnection();
                        
                        // Preserve transaction history before recreating multi-transceiver
                        const existingHistory = multiTransceiver ? multiTransceiver.getTransactionHistory() : [];
                        
                        // Re-create multi-transceiver instance
                        multiTransceiver = new MultiTransceiver(walletManager);
                        
                        // Restore transaction history
                        if (existingHistory.length > 0) {
                            multiTransceiver.transactionHistory = existingHistory;
                            console.log(`Preserved ${existingHistory.length} transaction history entries across network switch`);
                        }
                        
                        // If there were wallets before, regenerate them for the new network
                        if (hadWallets) {
                            uiController.updateFullscreenLoading('Regenerating Wallets', `Creating ${walletCount} wallets for ${result.network.name}...`, 60);
                            
                            // Regenerate wallets with the same parameters
                            const wallets = walletManager.generateWallets(walletCount, startIndex, endIndex);
                            uiController.updateWalletsTable(wallets);
                            uiController.showStepControls();
                            
                            // Show totals section with cleared balances
                            document.getElementById('totalsSection').style.display = 'block';
                            uiController.updateTotals({
                                wallet_count: walletCount,
                                total_native_pol: 0,
                                total_usdt: 0,
                                timestamp: new Date().toISOString()
                            });
                        }
                        
                        uiController.updateFullscreenLoading('Network Switch Complete!', `Connected to ${result.network.name}`, 100);
                        uiController.showStepControls();
                        setTimeout(() => uiController.hideFullscreenLoading(), 1000);
                        
                        uiController.showToast(`Switched to ${result.network.name} and re-initialized`, 'success');
                    } else {
                        throw new Error(initResult.error);
                    }
                } else {
                    // Just clear display if no seed phrase
                    uiController.clearDisplay();
                    uiController.showToast(result.message + ' - Please re-initialize with seed phrase', 'info');
                }
                
                // Update UI
                updateNetworkDisplay();
                
                console.log('Network switched successfully:', result.network.name);
            }
        } else {
            // Just update display if no wallet manager yet
            updateNetworkDisplay();
            
            // Update RPC URL field to match selected network
            updateRpcUrlField(targetNetwork);
            
            uiController.showToast(`Switched to ${targetNetwork === 'testnet' ? 'Testnet' : 'Mainnet'}`, 'info');
        }
        
    } catch (error) {
        console.error('Error switching network:', error);
        
        // Revert switch position on error
        const networkSwitch = document.getElementById('networkSwitch');
        networkSwitch.checked = !networkSwitch.checked;
        
        if (uiController) {
            uiController.showError(error.message);
            uiController.showToast('Failed to switch network: ' + error.message, 'error');
        } else {
            alert('Failed to switch network: ' + error.message);
        }
    }
}

/**
 * Update RPC URL field based on selected network
 */
function updateRpcUrlField(targetNetwork) {
    const rpcUrlInput = document.getElementById('rpcUrl');
    if (rpcUrlInput && NETWORKS[targetNetwork]) {
        rpcUrlInput.placeholder = NETWORKS[targetNetwork].rpcUrl;
        // Only update the value if it's empty or contains a default network URL
        const currentValue = rpcUrlInput.value.trim();
        if (!currentValue || 
            currentValue === NETWORKS.mainnet.rpcUrl || 
            currentValue === NETWORKS.testnet.rpcUrl) {
            rpcUrlInput.value = '';
        }
    }
}

/**
 * Update network display information
 */
function updateNetworkDisplay() {
    const networkSwitch = document.getElementById('networkSwitch');
    const currentNetworkEl = document.getElementById('currentNetwork');
    const currentRPCEl = document.getElementById('currentRPC');
    const currentChainIdEl = document.getElementById('currentChainId');
    
    if (!networkSwitch || !currentNetworkEl || !currentRPCEl || !currentChainIdEl) {
        return;
    }
    
    const isTestnet = networkSwitch.checked;
    
    if (walletManager) {
        const network = walletManager.getCurrentNetwork();
        const icon = isTestnet ? 'fas fa-flask' : 'fas fa-globe';
        currentNetworkEl.innerHTML = `<i class="${icon} me-1"></i>${network.name}`;
        currentNetworkEl.className = `badge ${isTestnet ? 'bg-testnet' : 'bg-mainnet'}`;
        currentRPCEl.textContent = network.rpcUrl;
        currentChainIdEl.textContent = `Chain ID: ${network.chainId}`;
    } else {
        // Default display when no wallet manager
        const networkKey = isTestnet ? 'testnet' : 'mainnet';
        const networkConfig = NETWORKS[networkKey];
        const icon = isTestnet ? 'fas fa-flask' : 'fas fa-globe';
        
        currentNetworkEl.innerHTML = `<i class="${icon} me-1"></i>${networkConfig.name}`;
        currentNetworkEl.className = `badge ${isTestnet ? 'bg-testnet' : 'bg-mainnet'}`;
        currentRPCEl.textContent = networkConfig.rpcUrl;
        currentChainIdEl.textContent = `Chain ID: ${networkConfig.chainId}`;
    }
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    if (uiController) {
        uiController.showToast('An unexpected error occurred', 'error');
    }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    if (uiController) {
        uiController.showToast('An unexpected error occurred', 'error');
    }
});

console.log('Main script loaded successfully'); 