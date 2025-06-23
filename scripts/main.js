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
document.addEventListener('DOMContentLoaded', async function() {
    Logger.info('HD Wallet Manager starting...');
    
    // Initialize UI Controller
    uiController = new UIController();
    uiController.initialize();
    
    // Make UI controller available globally for multi-transceiver
    window.uiController = uiController;
    
    // Set up global progress update function (deprecated - using full-screen loading now)
    window.updateProgressMessage = function(message) {
        Logger.debug('Progress', message);
    };
    
    // Network manager will be initialized after constants are loaded
    Logger.success('Application initialized successfully');
});

/**
 * Initialize wallet manager
 */
async function initializeWalletManager() {
    try {
        // Rate limiting check
        const rateLimitCheck = SecurityUtils.rateLimitCheck('wallet_init', 5, 300000); // 5 attempts per 5 minutes
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return;
        }
        
        const seedPhrase = document.getElementById('seedPhrase').value.trim();
        const rpcUrl = document.getElementById('rpcUrl').value.trim();
        
        // Enhanced seed phrase validation using security utils
        const validation = SecurityUtils.validateSeedPhrase(seedPhrase);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }
        
        // Validate RPC URL if provided
        if (rpcUrl) {
            const rpcValidation = NetworkSecurity.validateRpcUrl(rpcUrl);
            if (!rpcValidation.valid) {
                alert('RPC URL Error: ' + rpcValidation.error);
                return;
            }
            if (rpcValidation.warning) {
                if (!confirm('RPC URL Warning: ' + rpcValidation.warning + '\n\nDo you want to continue?')) {
                    return;
                }
            }
        }
        
        uiController.showFullscreenLoading('Initializing Wallet Manager', 'Connecting to blockchain network...', 10);
        
        // Create wallet manager instance
        walletManager = new HDWalletManager();
        
        // Get current network configuration
        const manager = networkManager || window.networkManager;
        let currentNetworkConfig = CURRENT_NETWORK;
        
        // Initialize network manager if available and needed
        if (manager && (!manager.networks || !manager.networks.length)) {
            try {
                await manager.init();
                currentNetworkConfig = manager.getCurrentNetwork();
            } catch (error) {
                console.warn('NetworkManager initialization failed, using global current network:', error);
            }
        } else if (manager) {
            currentNetworkConfig = manager.getCurrentNetwork();
        }
        
        // Debug network configuration
        Logger.debug('Init', `Network: ${currentNetworkConfig?.name} (Chain ID: ${currentNetworkConfig?.chainId})`);
        
        // Initialize with current network using sanitized seed phrase
        const result = await walletManager.initialize(validation.sanitized || seedPhrase, rpcUrl || currentNetworkConfig.rpcUrl || currentNetworkConfig?.rpc?.[0]);
        
        if (result.success) {
            // Create multi-transceiver instance
            multiTransceiver = new MultiTransceiver(walletManager);
            
            // Update network display to reflect the correct network
            if (manager && manager.updateCurrentNetworkDisplay) {
                manager.updateCurrentNetworkDisplay();
            }
            
            uiController.updateFullscreenLoading('Wallet Manager Initialized!', `Ready to generate wallets on ${result.network.name}`, 100);
            uiController.showStepControls();
            setTimeout(() => uiController.hideFullscreenLoading(), 1000);
            
            uiController.showToast(`Wallet manager initialized successfully on ${result.network.name}!`, 'success');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        Logger.error('Initialization failed', error);
        uiController.hideFullscreenLoading();
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
        
        // Debug current network state
        Logger.debug('Generate', `Using ${walletManager.getCurrentNetwork()?.name} (Chain ID: ${walletManager.currentChainId})`);
        
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
        Logger.error('Wallet generation failed', error);
        uiController.hideFullscreenLoading();
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
        
        // Debug current network state
        Logger.debug('Balance', `Checking on ${walletManager.getCurrentNetwork()?.name} (Chain ID: ${walletManager.currentChainId})`);
        
        // Force refresh USDT address for current network
        walletManager.usdtAddress = NetworkUtils.getUSDTAddress(walletManager.currentChainId);
        
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
                
                // Show progress
                Logger.debug('Balance', `Progress: ${completedWallets}/${totalWallets} wallets completed`);
                
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
                        Logger.error(`Wallet ${wallet.index} balance check failed`, error);
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
        
        Logger.success('Balance check completed for all wallets');
        
    } catch (error) {
        Logger.error('Balance check failed', error);
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
        
        // Initialize custom receivers UI
        updateCustomReceiversUI();
        
        // Initialize gas fee UI
        initializeGasFeeUI();
        
        // Add Enter key listener for custom receiver inputs
        const addressInput = document.getElementById('customReceiverAddress');
        const labelInput = document.getElementById('customReceiverLabel');
        
        const handleEnterKey = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addCustomReceiver();
            }
        };
        
        if (addressInput) {
            addressInput.removeEventListener('keypress', handleEnterKey);
            addressInput.addEventListener('keypress', handleEnterKey);
        }
        
        if (labelInput) {
            labelInput.removeEventListener('keypress', handleEnterKey);
            labelInput.addEventListener('keypress', handleEnterKey);
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('multiTransceiverModal'));
        modal.show();
        
    } catch (error) {
        Logger.error('MultiTransceiver open failed', error);
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
        let selectedReceivers = [];
        let amount = 0;
        
        if (mode === 'multi-send') {
            // Get all selected receivers (both generated wallets and custom addresses)
            selectedReceivers = getAllSelectedReceivers();
            selectedWallets = selectedReceivers.filter(r => r.type === 'generated').map(r => r.index);
            amount = parseFloat(document.getElementById('amountPerReceiver').value) || 0;
            
            if (selectedReceivers.length === 0) {
                alert('Please select at least one receiver (generated wallet or custom address)');
                return;
            }
        } else {
            const selectedSenders = document.querySelectorAll('#senderWallets input:checked');
            selectedWallets = Array.from(selectedSenders).map(cb => parseInt(cb.value));
            amount = parseFloat(document.getElementById('amountPerSender').value) || 0;
            
            if (selectedWallets.length === 0) {
                alert('Please select at least one sender wallet');
                return;
            }
        }
        
        if (amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        document.getElementById('estimatedGasFee').textContent = 'Calculating...';
        
        const transactionCount = mode === 'multi-send' ? selectedReceivers.length : selectedWallets.length;
        
        // Get current gas configuration
        const gasConfig = getCurrentGasConfig();
        
        const gasEstimate = await multiTransceiver.estimateMultiTransactionGas(
            mode, 
            token, 
            transactionCount, 
            amount,
            gasConfig
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
        
        // Get current gas configuration first
        const gasConfig = getCurrentGasConfig();
        
        let selectedWallets = [];
        let selectedReceivers = [];
        let amount = 0;
        let senderWallet = null;
        let receiverWallet = null;
        
        if (mode === 'multi-send') {
            senderWallet = parseInt(document.getElementById('senderWallet').value);
            // Get all selected receivers (both generated wallets and custom addresses)
            selectedReceivers = getAllSelectedReceivers();
            selectedWallets = selectedReceivers.filter(r => r.type === 'generated').map(r => r.index);
            amount = parseFloat(document.getElementById('amountPerReceiver').value) || 0;
        } else {
            receiverWallet = parseInt(document.getElementById('receiverWallet').value);
            const selectedSenders = document.querySelectorAll('#senderWallets input:checked');
            selectedWallets = Array.from(selectedSenders).map(cb => parseInt(cb.value));
            amount = parseFloat(document.getElementById('amountPerSender').value) || 0;
        }
        
        // Validate parameters - update to use selectedReceivers for multi-send
        const params = {
            mode,
            token,
            senderWallet,
            receiverWallet,
            selectedWallets,
            selectedReceivers: mode === 'multi-send' ? selectedReceivers : undefined,
            amount,
            gasConfig
        };
        
        const validation = multiTransceiver.validateTransactionParams(params);
        if (!validation.valid) {
            alert('Validation failed:\n' + validation.errors.join('\n'));
            return;
        }
        
        // Enhanced transaction confirmation with security checks
        const sampleTransaction = {
            from: mode === 'multi-send' ? 
                walletManager.getWallet(senderWallet)?.address : 
                walletManager.getWallet(selectedWallets[0])?.address,
            to: mode === 'multi-send' ? 
                (selectedReceivers && selectedReceivers[0] ? selectedReceivers[0].address : walletManager.getWallet(selectedWallets[0])?.address) :
                walletManager.getWallet(receiverWallet)?.address,
            amount: amount,
            token: token,
            network: walletManager.getCurrentNetwork().name,
            gasConfig: gasConfig
        };
        
        const confirmResult = await TransactionSecurity.confirmTransaction(sampleTransaction);
        if (!confirmResult) {
            return;
        }
        
        const transactionCount = mode === 'multi-send' ? selectedReceivers.length : selectedWallets.length;
        if (!confirm(`Execute ${mode} transaction for ${transactionCount} ${mode === 'multi-send' ? 'receivers' : 'wallets'}?\n\nTotal amount: ${(amount * transactionCount).toFixed(6)} ${token}`)) {
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
        
        const result = walletManager.exportToExcel();
        
        if (result.success) {
            uiController.showToast(`Excel file saved: ${result.filename}`, 'success');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error saving Excel:', error);
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
 * Legacy network toggle function - now handled by NetworkManager
 * This function is kept for backward compatibility but delegates to the new system
 */
async function toggleNetwork() {
    console.warn('toggleNetwork() is deprecated. Network switching is now handled by NetworkManager.');
    
    // For backward compatibility, we can try to switch between Polygon mainnet and testnet
    if (networkManager.currentNetwork.chainId === 137) {
        // Switch to Polygon testnet
        await networkManager.switchToNetwork(80002);
    } else {
        // Switch to Polygon mainnet
        await networkManager.switchToNetwork(137);
    }
}

/**
 * Update RPC URL field based on current network (legacy function)
 */
function updateRpcUrlField(targetNetwork) {
    const rpcUrlInput = document.getElementById('rpcUrl');
    if (!rpcUrlInput) return;
    
    // Try to get network manager from different sources
    const manager = networkManager || window.networkManager;
    let currentNetwork = null;
    
    if (manager && manager.currentNetwork) {
        currentNetwork = manager.currentNetwork;
    } else if (CURRENT_NETWORK) {
        currentNetwork = CURRENT_NETWORK;
    } else if (targetNetwork && LEGACY_NETWORKS[targetNetwork]) {
        currentNetwork = LEGACY_NETWORKS[targetNetwork];
    }
    
    if (currentNetwork) {
        const rpcUrl = currentNetwork.rpcUrl || currentNetwork.getAllRpcUrls?.()?.[0] || '';
        rpcUrlInput.placeholder = rpcUrl;
        
        // Only update the value if it's empty or contains a default network URL
        const currentValue = rpcUrlInput.value.trim();
        if (!currentValue || 
            Object.values(LEGACY_NETWORKS).some(net => currentValue === net.rpcUrl)) {
            rpcUrlInput.value = '';
        }
    }
}

/**
 * Update network display information (legacy function - now handled by NetworkManager)
 */
function updateNetworkDisplay() {
    console.warn('updateNetworkDisplay() is deprecated. Use networkManager.updateCurrentNetworkDisplay() instead.');
    if (typeof networkManager !== 'undefined' && networkManager && networkManager.updateCurrentNetworkDisplay) {
        networkManager.updateCurrentNetworkDisplay();
    }
}

/**
 * Custom receivers management
 */
let customReceivers = [];

/**
 * Add a custom receiver address
 */
function addCustomReceiver() {
    const addressInput = document.getElementById('customReceiverAddress');
    const labelInput = document.getElementById('customReceiverLabel');
    
    if (!addressInput || !labelInput) {
        console.error('Custom receiver input elements not found');
        return;
    }
    
    // Sanitize inputs
    const address = SecurityUtils.sanitizeInput(addressInput.value, 'address');
    const label = SecurityUtils.sanitizeInput(labelInput.value.trim() || `Custom-${customReceivers.length + 1}`, 'text');
    
    // Validate address
    if (!address) {
        uiController.showToast('Please enter a wallet address', 'warning');
        return;
    }
    
    if (!SecurityUtils.validateEthereumAddress(address)) {
        uiController.showToast('Please enter a valid Ethereum address', 'error');
        return;
    }
    
    // Check for duplicates
    if (customReceivers.some(receiver => receiver.address.toLowerCase() === address.toLowerCase())) {
        uiController.showToast('This address has already been added', 'warning');
        return;
    }
    
    // Add to custom receivers list
    const customReceiver = {
        id: `custom_${Date.now()}`,
        address: address,
        label: label
    };
    
    customReceivers.push(customReceiver);
    
    // Clear inputs
    addressInput.value = '';
    labelInput.value = '';
    
    // Update UI
    updateCustomReceiversUI();
    uiController.updateTransactionSummary();
    
    uiController.showToast(`Added custom receiver: ${label}`, 'success');
}

/**
 * Remove a custom receiver
 */
function removeCustomReceiver(receiverId) {
    customReceivers = customReceivers.filter(receiver => receiver.id !== receiverId);
    updateCustomReceiversUI();
    uiController.updateTransactionSummary();
    uiController.showToast('Custom receiver removed', 'info');
}

/**
 * Update custom receivers UI
 */
function updateCustomReceiversUI() {
    const customReceiversDiv = document.getElementById('customReceivers');
    if (!customReceiversDiv) return;
    
    if (customReceivers.length === 0) {
        customReceiversDiv.innerHTML = '<p class="text-muted small mb-0">No custom receivers added</p>';
        return;
    }
    
    let html = '';
    customReceivers.forEach(receiver => {
        html += `
            <div class="custom-receiver-item">
                <div class="form-check d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <input class="form-check-input me-2" type="checkbox" value="${receiver.id}" 
                               id="${receiver.id}" onchange="uiController.updateTransactionSummary()">
                        <label class="form-check-label" for="${receiver.id}">
                            <strong>${receiver.label}</strong><br>
                            <small class="text-muted custom-receiver-address">${receiver.address}</small>
                        </label>
                    </div>
                    <button class="btn btn-outline-danger btn-sm" onclick="removeCustomReceiver('${receiver.id}')" 
                            title="Remove this receiver">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    customReceiversDiv.innerHTML = html;
}

/**
 * Get all selected receivers (both generated wallets and custom addresses)
 */
function getAllSelectedReceivers() {
    const selectedReceivers = [];
    
    // Get selected generated wallets
    const generatedWalletCheckboxes = document.querySelectorAll('#receiverWallets input:checked');
    generatedWalletCheckboxes.forEach(checkbox => {
        const walletIndex = parseInt(checkbox.value);
        const wallet = walletManager.getWallet(walletIndex);
        if (wallet) {
            selectedReceivers.push({
                type: 'generated',
                index: walletIndex,
                address: wallet.address,
                label: `Wallet ${walletIndex}`
            });
        }
    });
    
    // Get selected custom receivers
    const customReceiverCheckboxes = document.querySelectorAll('#customReceivers input:checked');
    customReceiverCheckboxes.forEach(checkbox => {
        const receiverId = checkbox.value;
        const customReceiver = customReceivers.find(r => r.id === receiverId);
        if (customReceiver) {
            selectedReceivers.push({
                type: 'custom',
                id: receiverId,
                address: customReceiver.address,
                label: customReceiver.label
            });
        }
    });
    
    return selectedReceivers;
}

/**
 * Validate Ethereum address
 */
function isValidEthereumAddress(address) {
    if (!address || typeof address !== 'string') {
        return false;
    }
    
    // Check if it's a valid hex string of 42 characters (including 0x prefix)
    const hexRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!hexRegex.test(address)) {
        return false;
    }
    
    // Additional validation using ethers if available
    try {
        if (typeof ethers !== 'undefined' && ethers.utils && ethers.utils.isAddress) {
            return ethers.utils.isAddress(address);
        }
    } catch (error) {
        console.warn('Ethers address validation failed, using regex validation:', error);
    }
    
    return true;
}

/**
 * Clear all custom receivers
 */
function clearCustomReceivers() {
    customReceivers = [];
    updateCustomReceiversUI();
    uiController.updateTransactionSummary();
}

/**
 * Toggle seed phrase visibility
 */
function toggleSeedPhraseVisibility() {
    const seedPhraseInput = document.getElementById('seedPhrase');
    const toggleButton = document.getElementById('seedPhraseToggle');
    const toggleIcon = document.getElementById('seedPhraseToggleIcon');
    
    if (!seedPhraseInput || !toggleButton || !toggleIcon) {
        console.error('Seed phrase toggle elements not found');
        return;
    }
    
    const isCurrentlyObscured = seedPhraseInput.classList.contains('obscured') || 
                               seedPhraseInput.style.webkitTextSecurity === 'disc';
    
    if (isCurrentlyObscured) {
        // Show text
        seedPhraseInput.style.webkitTextSecurity = 'none';
        seedPhraseInput.style.fontFamily = 'inherit';
        seedPhraseInput.style.letterSpacing = 'normal';
        seedPhraseInput.classList.remove('obscured');
        seedPhraseInput.classList.add('visible');
        
        // Change icon to eye-slash
        toggleIcon.className = 'fas fa-eye-slash';
        toggleButton.title = 'Hide seed phrase';
    } else {
        // Hide text
        seedPhraseInput.style.webkitTextSecurity = 'disc';
        seedPhraseInput.style.fontFamily = 'text-security-disc, monospace';
        seedPhraseInput.style.letterSpacing = '2px';
        seedPhraseInput.classList.remove('visible');
        seedPhraseInput.classList.add('obscured');
        
        // Change icon to eye
        toggleIcon.className = 'fas fa-eye';
        toggleButton.title = 'Show seed phrase';
    }
}

/**
 * Initialize Gas Fee UI
 */
function initializeGasFeeUI() {
    try {
        // Load current network gas price
        loadCurrentNetworkGasPrice();
        
        // Setup event listeners for gas mode toggle
        const gasModeRadios = document.querySelectorAll('input[name="gasMode"]');
        gasModeRadios.forEach(radio => {
            radio.addEventListener('change', handleGasModeChange);
        });
        
        // Setup event listeners for gas settings changes
        const gasInputs = [
            'gasSpeedPreset', 'gasPriceMultiplier', 'customGasPrice', 
            'customGasLimit', 'customPriorityFee'
        ];
        
        gasInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('input', updateGasPreview);
                element.addEventListener('change', updateGasPreview);
            }
        });
        
        // Initial gas preview update
        updateGasPreview();
        
    } catch (error) {
        console.error('Error initializing gas fee UI:', error);
    }
}

/**
 * Handle gas mode change (Auto/Custom)
 */
function handleGasModeChange() {
    const gasMode = document.querySelector('input[name="gasMode"]:checked').value;
    const autoSection = document.getElementById('autoGasSection');
    const customSection = document.getElementById('customGasSection');
    const gasModeDisplay = document.getElementById('gasModeDisplay');
    
    if (gasMode === 'auto') {
        autoSection.style.display = 'block';
        customSection.style.display = 'none';
        gasModeDisplay.textContent = 'Auto';
    } else {
        autoSection.style.display = 'none';
        customSection.style.display = 'block';
        gasModeDisplay.textContent = 'Custom';
        
        // Load network estimates when switching to custom mode
        loadNetworkGasEstimates();
    }
    
    updateGasPreview();
}

/**
 * Load current network gas price
 */
async function loadCurrentNetworkGasPrice() {
    try {
        if (!walletManager || !walletManager.web3) {
            document.getElementById('networkGasPrice').textContent = 'Not connected';
            return;
        }
        
        const gasPrice = await walletManager.web3.eth.getGasPrice();
        const gasPriceGwei = parseFloat(walletManager.web3.utils.fromWei(gasPrice, 'gwei'));
        
        document.getElementById('networkGasPrice').textContent = gasPriceGwei.toFixed(1);
        
        // Update gas preview
        updateGasPreview();
        
    } catch (error) {
        console.error('Error loading network gas price:', error);
        document.getElementById('networkGasPrice').textContent = 'Error';
    }
}

/**
 * Load network gas estimates for custom mode
 */
async function loadNetworkGasEstimates() {
    try {
        if (!walletManager || !walletManager.web3) {
            uiController.showToast('Wallet not connected', 'warning');
            return;
        }
        
        // Get current network gas price
        const gasPrice = await walletManager.web3.eth.getGasPrice();
        const gasPriceGwei = parseFloat(walletManager.web3.utils.fromWei(gasPrice, 'gwei'));
        
        // Set recommended values
        document.getElementById('customGasPrice').value = gasPriceGwei.toFixed(1);
        document.getElementById('customGasLimit').value = '21000'; // Default for POL
        document.getElementById('customPriorityFee').value = '2.0'; // Standard tip
        
        updateGasPreview();
        
        uiController.showToast('Network gas estimates loaded', 'success');
        
    } catch (error) {
        console.error('Error loading network gas estimates:', error);
        uiController.showToast('Failed to load gas estimates: ' + error.message, 'error');
    }
}

/**
 * Update gas preview and display
 */
function updateGasPreview() {
    try {
        const gasMode = document.querySelector('input[name="gasMode"]:checked').value;
        let gasPrice, gasLimit;
        
        if (gasMode === 'auto') {
            // Auto mode calculations
            const networkGasText = document.getElementById('networkGasPrice').textContent;
            const networkGas = parseFloat(networkGasText) || 20; // Default fallback
            
            const speedPreset = document.getElementById('gasSpeedPreset').value;
            const multiplier = parseFloat(document.getElementById('gasPriceMultiplier').value) || 1.2;
            
            // Apply speed preset multipliers
            let speedMultiplier = 1.0;
            switch (speedPreset) {
                case 'slow':
                    speedMultiplier = 0.8;
                    break;
                case 'standard':
                    speedMultiplier = 1.0;
                    break;
                case 'fast':
                    speedMultiplier = 1.5;
                    break;
            }
            
            gasPrice = networkGas * multiplier * speedMultiplier;
            gasLimit = 21000; // Default for POL transfers
            
        } else {
            // Custom mode values
            gasPrice = parseFloat(document.getElementById('customGasPrice').value) || 20;
            gasLimit = parseInt(document.getElementById('customGasLimit').value) || 21000;
        }
        
        // Update display
        document.getElementById('effectiveGasPrice').textContent = gasPrice.toFixed(1);
        document.getElementById('effectiveGasLimit').textContent = gasLimit.toLocaleString();
        
        // Calculate cost per transaction
        const costPerTx = (gasPrice * gasLimit) / 1e9; // Convert from Gwei to POL
        
        if (gasMode === 'custom') {
            document.getElementById('customGasCostPreview').textContent = costPerTx.toFixed(6);
        }
        
        // Reset gas fee calculation if values changed
        document.getElementById('estimatedGasFee').textContent = 'Click Calculate Gas';
        document.getElementById('executeTransactionBtn').disabled = true;
        
    } catch (error) {
        console.error('Error updating gas preview:', error);
    }
}

/**
 * Get current gas configuration for transactions
 */
function getCurrentGasConfig() {
    const gasMode = document.querySelector('input[name="gasMode"]:checked').value;
    
    if (gasMode === 'auto') {
        const networkGasText = document.getElementById('networkGasPrice').textContent;
        const networkGas = parseFloat(networkGasText) || 20;
        
        const speedPreset = document.getElementById('gasSpeedPreset').value;
        const multiplier = parseFloat(document.getElementById('gasPriceMultiplier').value) || 1.2;
        
        let speedMultiplier = 1.0;
        switch (speedPreset) {
            case 'slow':
                speedMultiplier = 0.8;
                break;
            case 'standard':
                speedMultiplier = 1.0;
                break;
            case 'fast':
                speedMultiplier = 1.5;
                break;
        }
        
        return {
            mode: 'auto',
            gasPrice: networkGas * multiplier * speedMultiplier,
            gasLimit: 21000, // Will be adjusted based on token type
            priorityFee: 2.0 // Standard tip
        };
    } else {
        return {
            mode: 'custom',
            gasPrice: parseFloat(document.getElementById('customGasPrice').value) || 20,
            gasLimit: parseInt(document.getElementById('customGasLimit').value) || 21000,
            priorityFee: parseFloat(document.getElementById('customPriorityFee').value) || 2.0
        };
    }
}



// Global error handler
window.addEventListener('error', function(e) {
    // Skip null errors and minor script errors
    if (!e.error || e.error === null || e.message === 'Script error.') {
        return;
    }
    
    console.error('Global error:', e.error);
    if (uiController && typeof uiController.showToast === 'function') {
        uiController.showToast('An unexpected error occurred', 'error');
    }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    // Skip null rejections
    if (!e.reason || e.reason === null) {
        return;
    }
    
    console.error('Unhandled promise rejection:', e.reason);
    if (uiController && typeof uiController.showToast === 'function') {
        uiController.showToast('An unexpected error occurred', 'error');
    }
});

console.log('Main script loaded successfully');

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize network configuration
        console.log('Initializing EVM HD Wallet Manager...');
        
        // Load networks from chainlist.org API using the new Network class
        const networkResult = await NetworkUtils.loadNetworksFromChainlist();
        
        if (networkResult.success) {
            console.log(`Successfully loaded ${networkResult.count} networks from chainlist.org`);
            console.log('Default network set to:', CURRENT_NETWORK.name, '(Chain ID:', CURRENT_NETWORK.chainId, ')');
            
            // Verify Polygon Mainnet is the default
            if (CURRENT_NETWORK.chainId === 137) {
                console.log('✓ Polygon Mainnet correctly set as default network');
            } else {
                console.warn('⚠ Default network is not Polygon Mainnet, current:', CURRENT_NETWORK.name);
            }
            
            if (typeof uiController !== 'undefined' && uiController) {
                uiController.showToast(`Loaded ${networkResult.count} networks. Default: ${CURRENT_NETWORK.name}`, 'success');
            }
        } else if (networkResult.fallback) {
            console.log('Using fallback networks due to API failure');
            console.log('Fallback default network:', CURRENT_NETWORK.name, '(Chain ID:', CURRENT_NETWORK.chainId, ')');
            
            if (typeof uiController !== 'undefined' && uiController) {
                uiController.showToast(`Using fallback networks. Default: ${CURRENT_NETWORK.name}`, 'warning');
            }
        } else {
            throw new Error(networkResult.error || 'Failed to load networks');
        }
        
        // Initialize NetworkManager if available
        if (typeof NetworkManager !== 'undefined') {
            try {
                console.log('Creating NetworkManager instance...');
                window.networkManager = new NetworkManager();
                
                // Also set the global networkManager variable for backward compatibility
                if (typeof networkManager !== 'undefined') {
                    networkManager = window.networkManager;
                }
                
                const result = await window.networkManager.init();
                
                if (result.success) {
                    console.log(`NetworkManager initialized successfully with ${result.networksCount} networks`);
                    console.log('NetworkManager is ready for search operations');
                    
                    // Ensure Polygon Mainnet is active
                    const currentNetwork = window.networkManager.getCurrentNetwork();
                    if (currentNetwork && currentNetwork.chainId !== 137) {
                        console.log('Switching to Polygon Mainnet as default...');
                        await window.networkManager.switchToNetwork(137);
                    }
                } else {
                    console.error('NetworkManager initialization failed:', result.error);
                }
            } catch (nmError) {
                console.error('NetworkManager initialization failed:', nmError);
            }
        } else {
            console.warn('NetworkManager class not available');
        }
        
        console.log('EVM HD Wallet Manager initialized successfully');
        
        // Show success message
        if (typeof uiController !== 'undefined' && uiController) {
            uiController.showToast('Application initialized successfully', 'success');
        }
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show error message to user
        if (typeof uiController !== 'undefined' && uiController) {
            uiController.showToast('Failed to initialize application: ' + error.message, 'error');
        }
        
        // Try to continue with legacy networks as last resort
        try {
            console.log('Attempting to use legacy networks as fallback...');
            if (typeof LEGACY_NETWORKS !== 'undefined') {
                CURRENT_NETWORK = LEGACY_NETWORKS.mainnet;
                console.log('Using legacy networks as final fallback');
            }
        } catch (fallbackError) {
            console.error('Even legacy fallback failed:', fallbackError);
        }
    }
}); 