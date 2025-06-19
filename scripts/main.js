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
        
        uiController.showProgress('Initializing wallet manager...', 10);
        
        // Create wallet manager instance
        walletManager = new HDWalletManager();
        
        // Initialize
        const result = await walletManager.initialize(seedPhrase, rpcUrl || null);
        
        if (result.success) {
            // Create multi-transceiver instance
            multiTransceiver = new MultiTransceiver(walletManager);
            
            uiController.showProgress('Wallet manager initialized successfully!', 100);
            uiController.showStepControls();
            uiController.hideProgress();
            
            uiController.showToast('Wallet manager initialized successfully!', 'success');
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
        
        uiController.showProgress('Generating HD wallets...', 20);
        
        const wallets = walletManager.generateWallets(count, startIndex, endIndex);
        
        // Format for display
        const walletsForDisplay = wallets.map(wallet => ({
            ...wallet,
            native_pol_balance: null,
            usdt_balance: null,
            timestamp: null
        }));
        
        uiController.updateWalletsTable(walletsForDisplay);
        uiController.showProgress(`Generated ${wallets.length} HD wallets successfully!`, 100);
        uiController.hideProgress();
        
        uiController.showToast(`Generated ${wallets.length} wallets successfully!`, 'success');
        
    } catch (error) {
        console.error('Error generating wallets:', error);
        uiController.showError(error.message);
        uiController.showToast('Failed to generate wallets: ' + error.message, 'error');
    }
}

/**
 * Check balances for all wallets
 */
async function checkBalances() {
    try {
        if (!walletManager || !walletManager.wallets || walletManager.wallets.length === 0) {
            alert('Please generate wallets first');
            return;
        }
        
        uiController.showProgress('Checking balances for all wallets...', 30);
        
        const walletsWithBalances = await walletManager.checkAllBalances();
        
        uiController.updateWalletsTable(walletsWithBalances);
        
        // Update totals
        const totals = walletManager.getTotals();
        uiController.updateTotals(totals);
        
        uiController.showProgress('Balance checking completed!', 100);
        uiController.hideProgress();
        
        uiController.showToast('Balance check completed successfully!', 'success');
        
    } catch (error) {
        console.error('Error checking balances:', error);
        uiController.showError(error.message);
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
        
        uiController.showProgress('Executing multi-transaction...', 10);
        
        const result = await multiTransceiver.executeMultiTransaction(params);
        
        uiController.showProgress('Multi-transaction completed!', 100);
        
        // Update transaction history
        uiController.updateTransactionHistoryTable(multiTransceiver.getTransactionHistory());
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('multiTransceiverModal'));
        modal.hide();
        
        // Refresh balances
        await checkBalances();
        
        uiController.hideProgress();
        
        const successMessage = `Multi-transaction completed!\nSuccessful: ${result.successfulTransactions}\nFailed: ${result.failedTransactions}\nTotal gas used: ${result.totalGasUsed.toFixed(6)} POL`;
        uiController.showToast('Multi-transaction completed successfully!', 'success');
        alert(successMessage);
        
    } catch (error) {
        console.error('Transaction execution error:', error);
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