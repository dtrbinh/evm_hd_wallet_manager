/**
 * UI Controller Class
 * Manages all user interface interactions and updates
 */
class UIController {
    constructor() {
        this.walletManager = null;
        this.multiTransceiver = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the UI controller
     */
    initialize() {
        this.setupEventListeners();
        this.setupTableResizing();
        this.updateWalletCount();
        console.log('UI Controller initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Transaction mode toggle
        document.addEventListener('change', (e) => {
            if (e.target.name === 'transactionMode') {
                this.toggleTransactionMode(e.target.value);
                this.updateTransactionSummary();
            }
        });

        // Amount input changes
        document.addEventListener('input', (e) => {
            if (e.target.id === 'amountPerReceiver' || e.target.id === 'amountPerSender') {
                this.updateTransactionSummary();
            }
        });
        
        // Setup transaction progress event listeners
        this.setupTransactionProgressEventListeners();
    }

    /**
     * Setup transaction progress dialog event listeners
     */
    setupTransactionProgressEventListeners() {
        // Close button
        const closeBtn = document.getElementById('transactionProgressClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideTransactionProgress();
            });
        }
        
        // Minimize button
        const minimizeBtn = document.getElementById('transactionProgressMinimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.minimizeTransactionProgress();
            });
        }
        
        // Minimized view click to restore
        const minimizedView = document.getElementById('transactionProgressMinimized');
        if (minimizedView) {
            minimizedView.addEventListener('click', () => {
                this.showTransactionProgressFromMinimized();
            });
        }
        
        // Cancel button (placeholder for future implementation)
        const cancelBtn = document.getElementById('transactionProgressCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // TODO: Implement transaction cancellation
                console.log('Transaction cancellation not yet implemented');
            });
        }
        
        // Close on overlay click (outside dialog)
        const overlay = document.getElementById('transactionProgressOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideTransactionProgress();
                }
            });
        }
    }

    /**
     * Update wallet count based on derivation path range
     */
    updateWalletCount() {
        const startIndex = parseInt(document.getElementById('startIndex').value) || 0;
        const endIndex = parseInt(document.getElementById('endIndex').value) || 0;
        
        if (endIndex < startIndex) {
            document.getElementById('endIndex').value = startIndex;
            return this.updateWalletCount();
        }
        
        const count = endIndex - startIndex + 1;
        const maxWallets = 100;
        
        if (count > maxWallets) {
            alert(`Maximum ${maxWallets} wallets allowed. Adjusting end index.`);
            document.getElementById('endIndex').value = startIndex + maxWallets - 1;
            return this.updateWalletCount();
        }
        
        document.getElementById('walletCount').value = count;
    }



    /**
     * Update wallets table
     */
    updateWalletsTable(wallets) {
        const tbody = document.getElementById('walletsTableBody');
        tbody.innerHTML = '';
        
        wallets.forEach(wallet => {
            const row = tbody.insertRow();
            row.id = `wallet-row-${wallet.index}`;
            
            // Format balances
            const polBalance = this.formatBalance(wallet.native_pol_balance);
            const usdtBalance = this.formatBalance(wallet.usdt_balance);
            const timestamp = wallet.timestamp ? new Date(wallet.timestamp).toLocaleString() : 'Never';
            
            row.innerHTML = `
                <td>${wallet.index}</td>
                <td class="address-cell" title="${wallet.address}">
                    <span class="address-truncated">${this.truncateAddress(wallet.address, 20)}</span>
                    <span class="address-full">${wallet.address}</span>
                </td>
                <td><small>${wallet.path}</small></td>
                <td class="${this.getBalanceClass(wallet.native_pol_balance)}" id="pol-balance-${wallet.index}">${polBalance}</td>
                <td class="${this.getBalanceClass(wallet.usdt_balance)}" id="usdt-balance-${wallet.index}">${usdtBalance}</td>
                <td id="timestamp-${wallet.index}"><small>${timestamp}</small></td>
            `;
        });
        
        document.getElementById('walletsCard').style.display = 'block';
    }

    /**
     * Update a single wallet row in the table
     */
    updateSingleWalletRow(wallet, status = 'completed') {
        const row = document.getElementById(`wallet-row-${wallet.index}`);
        if (!row) return;

        const polBalanceCell = document.getElementById(`pol-balance-${wallet.index}`);
        const usdtBalanceCell = document.getElementById(`usdt-balance-${wallet.index}`);
        const timestampCell = document.getElementById(`timestamp-${wallet.index}`);

        if (status === 'checking') {
            // Show loading state
            if (polBalanceCell) {
                polBalanceCell.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                polBalanceCell.className = '';
            }
            if (usdtBalanceCell) {
                usdtBalanceCell.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                usdtBalanceCell.className = '';
            }
            if (timestampCell) {
                timestampCell.innerHTML = '<small>Checking...</small>';
            }
            
            // Add loading animation to row
            row.classList.add('table-warning');
        } else {
            // Update with actual data
            const polBalance = this.formatBalance(wallet.native_pol_balance);
            const usdtBalance = this.formatBalance(wallet.usdt_balance);
            const timestamp = wallet.timestamp ? new Date(wallet.timestamp).toLocaleString() : 'Never';

            if (polBalanceCell) {
                polBalanceCell.textContent = polBalance;
                polBalanceCell.className = this.getBalanceClass(wallet.native_pol_balance);
            }
            if (usdtBalanceCell) {
                usdtBalanceCell.textContent = usdtBalance;
                usdtBalanceCell.className = this.getBalanceClass(wallet.usdt_balance);
            }
            if (timestampCell) {
                timestampCell.innerHTML = `<small>${timestamp}</small>`;
            }

            // Remove loading state and add success/error state
            row.classList.remove('table-warning');
            if (status === 'completed') {
                row.classList.add('table-success');
                setTimeout(() => row.classList.remove('table-success'), 2000);
            } else if (status === 'error') {
                row.classList.add('table-danger');
                setTimeout(() => row.classList.remove('table-danger'), 3000);
            }
        }
    }

    /**
     * Format balance for display
     */
    formatBalance(balance) {
        if (balance === null || balance === undefined) {
            return '-';
        }
        if (balance === 'error') {
            return 'error';
        }
        if (typeof balance === 'number') {
            return balance.toFixed(6);
        }
        return balance.toString();
    }

    /**
     * Get CSS class for balance display
     */
    getBalanceClass(balance) {
        if (balance === 'error') {
            return 'balance-error';
        }
        if (typeof balance === 'number') {
            return balance > 0 ? 'balance-positive' : 'balance-zero';
        }
        return '';
    }

    /**
     * Update totals section
     */
    updateTotals(totals) {
        document.getElementById('totalWallets').textContent = totals.wallet_count;
        document.getElementById('totalNativePol').textContent = totals.total_native_pol.toFixed(6);
        document.getElementById('totalUsdt').textContent = totals.total_usdt.toFixed(6);
        
        document.getElementById('totalsSection').style.display = 'block';
    }

    /**
     * Populate wallet dropdowns for MultiTransceiver
     */
    populateWalletDropdowns(wallets) {
        const senderSelect = document.getElementById('senderWallet');
        const receiverSelect = document.getElementById('receiverWallet');
        
        // Clear existing options
        senderSelect.innerHTML = '<option value="">Select sender wallet...</option>';
        receiverSelect.innerHTML = '<option value="">Select receiver wallet...</option>';
        
        wallets.forEach(wallet => {
            // Format balances for display
            const polBalance = (wallet.native_pol_balance !== null && wallet.native_pol_balance !== undefined && wallet.native_pol_balance !== 'error') ? 
                parseFloat(wallet.native_pol_balance).toFixed(4) : 'N/A';
            const usdtBalance = (wallet.usdt_balance !== null && wallet.usdt_balance !== undefined && wallet.usdt_balance !== 'error') ? 
                parseFloat(wallet.usdt_balance).toFixed(4) : 'N/A';
            
            const balanceInfo = `(POL: ${polBalance}, USDT: ${usdtBalance})`;
            const option = `<option value="${wallet.index}">${wallet.index}. ${wallet.address} ${balanceInfo}</option>`;
            senderSelect.innerHTML += option;
            receiverSelect.innerHTML += option;
        });
    }

    /**
     * Populate wallet checkboxes for MultiTransceiver
     */
    populateWalletCheckboxes(wallets) {
        const receiverDiv = document.getElementById('receiverWallets');
        const senderDiv = document.getElementById('senderWallets');
        
        let receiverHTML = '';
        let senderHTML = '';
        
        wallets.forEach(wallet => {
            // Format balances for display
            const polBalance = (wallet.native_pol_balance !== null && wallet.native_pol_balance !== undefined && wallet.native_pol_balance !== 'error') ? 
                parseFloat(wallet.native_pol_balance).toFixed(4) : 'N/A';
            const usdtBalance = (wallet.usdt_balance !== null && wallet.usdt_balance !== undefined && wallet.usdt_balance !== 'error') ? 
                parseFloat(wallet.usdt_balance).toFixed(4) : 'N/A';
            
            // Create styled balance badges
            const balanceInfo = `
                <div class="generated-wallet-balances">
                    <span class="balance-item pol-balance">POL: ${polBalance}</span>
                    <span class="balance-item usdt-balance">USDT: ${usdtBalance}</span>
                </div>
            `;
            
            const checkboxHTML = `
                <div class="generated-wallet-item">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${wallet.index}" id="receiver_${wallet.index}" onchange="uiController.updateTransactionSummary()">
                        <label class="form-check-label" for="receiver_${wallet.index}">
                            <strong>Wallet ${wallet.index}</strong><br>
                            <small class="text-muted generated-wallet-address">${wallet.address}</small>
                            ${balanceInfo}
                        </label>
                    </div>
                </div>
            `;
            
            const senderCheckboxHTML = `
                <div class="generated-wallet-item">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${wallet.index}" id="sender_${wallet.index}" onchange="uiController.updateTransactionSummary()">
                        <label class="form-check-label" for="sender_${wallet.index}">
                            <strong>Wallet ${wallet.index}</strong><br>
                            <small class="text-muted generated-wallet-address">${wallet.address}</small>
                            ${balanceInfo}
                        </label>
                    </div>
                </div>
            `;
            
            receiverHTML += checkboxHTML;
            senderHTML += senderCheckboxHTML;
        });
        
        receiverDiv.innerHTML = receiverHTML;
        senderDiv.innerHTML = senderHTML;
    }

    /**
     * Toggle between multi-send and multi-receive modes
     */
    toggleTransactionMode(mode) {
        const multiSendSection = document.getElementById('multiSendSection');
        const multiReceiveSection = document.getElementById('multiReceiveSection');
        
        if (mode === 'multi-send') {
            multiSendSection.style.display = 'block';
            multiReceiveSection.style.display = 'none';
        } else {
            multiSendSection.style.display = 'none';
            multiReceiveSection.style.display = 'block';
        }
    }

    /**
     * Update transaction summary
     */
    updateTransactionSummary() {
        const mode = document.querySelector('input[name="transactionMode"]:checked')?.value;
        if (!mode) return;
        
        let selectedCount = 0;
        let amount = 0;
        let totalAmount = 0;
        
        if (mode === 'multi-send') {
            // Count both generated wallets and custom receivers
            const selectedGeneratedWallets = document.querySelectorAll('#receiverWallets input:checked');
            const selectedCustomReceivers = document.querySelectorAll('#customReceivers input:checked');
            selectedCount = selectedGeneratedWallets.length + selectedCustomReceivers.length;
            amount = parseFloat(document.getElementById('amountPerReceiver').value) || 0;
        } else {
            const selectedSenders = document.querySelectorAll('#senderWallets input:checked');
            selectedCount = selectedSenders.length;
            amount = parseFloat(document.getElementById('amountPerSender').value) || 0;
        }
        
        totalAmount = selectedCount * amount;
        
        document.getElementById('selectedWalletsCount').textContent = selectedCount;
        document.getElementById('totalAmount').textContent = totalAmount.toFixed(6);
        
        // Reset gas fee calculation
        document.getElementById('estimatedGasFee').textContent = 'Click Calculate Gas';
        document.getElementById('totalCost').textContent = totalAmount.toFixed(6);
        document.getElementById('executeTransactionBtn').disabled = true;
    }

    /**
     * Update transaction history table
     */
    updateTransactionHistoryTable(transactions) {
        const tbody = document.getElementById('transactionHistoryBody');
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            const statusClass = tx.status === 'success' ? 'text-success' : 
                              tx.status === 'failed' ? 'text-danger' : 'text-warning';
            
            // Get explorer URL based on transaction's network (chainId)
            let explorerUrl = NETWORKS.mainnet.explorerUrl; // Default to mainnet
            
            if (tx.chainId) {
                // Find the correct network based on chainId
                if (tx.chainId === 137) {
                    explorerUrl = NETWORKS.mainnet.explorerUrl;
                } else if (tx.chainId === 80002) {
                    explorerUrl = NETWORKS.testnet.explorerUrl;
                } else {
                    // Try to find by chainId in NETWORKS object
                    const networkKey = Object.keys(NETWORKS).find(key => 
                        NETWORKS[key].chainId === tx.chainId
                    );
                    if (networkKey) {
                        explorerUrl = NETWORKS[networkKey].explorerUrl;
                    }
                }
                console.log(`Transaction ${tx.tx_hash ? tx.tx_hash.substring(0, 10) : 'N/A'}: Chain ID ${tx.chainId} → Explorer: ${explorerUrl}`);
            } else if (tx.network) {
                // Fallback: determine by network name
                if (tx.network.includes('Testnet') || tx.network.includes('Amoy')) {
                    explorerUrl = NETWORKS.testnet.explorerUrl;
                } else if (tx.network.includes('Mainnet') || tx.network.includes('Polygon')) {
                    explorerUrl = NETWORKS.mainnet.explorerUrl;
                }
                console.log(`Transaction ${tx.tx_hash ? tx.tx_hash.substring(0, 10) : 'N/A'}: Network ${tx.network} → Explorer: ${explorerUrl}`);
            }
            
            const txHashDisplay = tx.tx_hash ? 
                `<a href="${explorerUrl}/tx/${tx.tx_hash}" target="_blank" class="text-decoration-none" title="View on ${explorerUrl.includes('amoy') ? 'Amoy Testnet' : 'Polygon'} Explorer">
                    ${tx.tx_hash.substring(0, 10)}...
                </a>` : 'N/A';
            
            // Network badge for transaction
            const networkBadge = tx.network ? 
                `<span class="badge ${tx.network.includes('Testnet') ? 'bg-testnet' : 'bg-mainnet'}" style="font-size: 10px;" title="Chain ID: ${tx.chainId || 'Unknown'}">
                    ${tx.network.includes('Testnet') ? 'Testnet' : 'Mainnet'}
                </span>` : 
                '<span class="badge bg-secondary" style="font-size: 10px;">Unknown</span>';

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${tx.type}</td>
                <td>${tx.from}</td>
                <td>${tx.to}</td>
                <td>${tx.token}</td>
                <td>${tx.amount.toFixed(6)}</td>
                <td>${tx.gas_fee.toFixed(6)} POL</td>
                <td><span class="${statusClass}">${tx.status}</span></td>
                <td>${networkBadge}</td>
                <td>${txHashDisplay}</td>
                <td><small>${new Date(tx.timestamp).toLocaleString()}</small></td>
            `;
        });
        
        if (transactions.length > 0) {
            document.getElementById('transactionHistoryCard').style.display = 'block';
        }
    }

    /**
     * Show step controls
     */
    showStepControls() {
        document.getElementById('stepControls').style.display = 'block';
        this.isInitialized = true;
    }

    /**
     * Add fade-in animation to elements
     */
    addFadeInAnimation(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('fade-in');
        }
    }

    /**
     * Truncate address for display
     */
    truncateAddress(address, length = 10) {
        if (!address) return '';
        return address.length > length ? 
            `${address.substring(0, length)}...${address.substring(address.length - 4)}` : 
            address;
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Failed to copy', 'error');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 250px;';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * Validate form inputs (deprecated - use SecurityUtils.validateSeedPhrase instead)
     */
    validateSeedPhrase(seedPhrase) {
        console.warn('UIController.validateSeedPhrase is deprecated. Use SecurityUtils.validateSeedPhrase instead.');
        return SecurityUtils.validateSeedPhrase(seedPhrase);
    }
    
    /**
     * Sanitize user input before processing
     */
    sanitizeInput(input, type = 'text') {
        return SecurityUtils.sanitizeInput(input, type);
    }

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    /**
     * Get relative time string
     */
    getRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    }

    /**
     * Clear wallet display when switching networks
     */
    clearDisplay() {
        // Clear wallet table
        const tbody = document.getElementById('walletsTableBody');
        if (tbody) {
            tbody.innerHTML = '';
        }
        
        // Hide cards
        const walletsCard = document.getElementById('walletsCard');
        const totalsSection = document.getElementById('totalsSection');
        const transactionHistoryCard = document.getElementById('transactionHistoryCard');
        const stepControls = document.getElementById('stepControls');
        
        if (walletsCard) walletsCard.style.display = 'none';
        if (totalsSection) totalsSection.style.display = 'none';
        if (transactionHistoryCard) transactionHistoryCard.style.display = 'none';
        if (stepControls) stepControls.style.display = 'none';
        
        // Reset totals
        const elements = ['totalWallets', 'totalNativePol', 'totalUsdt'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        
        // Reset transaction history
        const transactionHistoryBody = document.getElementById('transactionHistoryBody');
        if (transactionHistoryBody) {
            transactionHistoryBody.innerHTML = '';
        }
        
        // Reset progress
        this.hideFullscreenLoading();
        
        console.log('Display cleared for network switch');
    }

    /**
     * Show full-screen loading overlay
     */
    showFullscreenLoading(text = 'Loading...', subtext = 'Please wait', progress = 0) {
        const overlay = document.getElementById('fullscreenLoading');
        const loadingText = document.getElementById('loadingText');
        const loadingSubtext = document.getElementById('loadingSubtext');
        const progressBar = document.getElementById('loadingProgressBar');
        
        if (overlay) {
            loadingText.textContent = text;
            loadingSubtext.textContent = subtext;
            progressBar.style.width = progress + '%';
            overlay.classList.add('show');
        }
    }

    /**
     * Update full-screen loading progress
     */
    updateFullscreenLoading(text, subtext = '', progress = null) {
        const loadingText = document.getElementById('loadingText');
        const loadingSubtext = document.getElementById('loadingSubtext');
        const progressBar = document.getElementById('loadingProgressBar');
        
        if (loadingText) loadingText.textContent = text;
        if (loadingSubtext && subtext) loadingSubtext.textContent = subtext;
        if (progressBar && progress !== null) {
            progressBar.style.width = progress + '%';
        }
    }

    /**
     * Hide full-screen loading overlay
     */
    hideFullscreenLoading() {
        const overlay = document.getElementById('fullscreenLoading');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    /**
     * Show transaction progress dialog
     */
    showTransactionProgress(mode, totalTransactions) {
        const overlay = document.getElementById('transactionProgressOverlay');
        const title = document.querySelector('.transaction-progress-title');
        const current = document.getElementById('transactionProgressCurrent');
        const details = document.getElementById('transactionProgressDetails');
        const progressText = document.getElementById('transactionProgressText');
        const progressCount = document.getElementById('transactionProgressCount');
        const progressBar = document.getElementById('transactionProgressBarFill');
        
        // Reset stats
        document.getElementById('transactionProgressSuccessful').textContent = '0';
        document.getElementById('transactionProgressFailed').textContent = '0';
        document.getElementById('transactionProgressGasFee').textContent = '0.000';
        
        // Clear log
        const log = document.getElementById('transactionProgressLog');
        log.innerHTML = '';
        
        // Set initial state
        title.innerHTML = `<i class="fas fa-exchange-alt"></i> ${mode === 'multi-send' ? 'Multi-Send' : 'Multi-Receive'} Progress`;
        current.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing transactions...';
        details.textContent = `Initializing ${mode} process for ${totalTransactions} transactions`;
        progressText.textContent = '0%';
        progressCount.textContent = `0 / ${totalTransactions}`;
        progressBar.style.width = '0%';
        
        // Show overlay
        overlay.classList.add('show');
        
        // Add log entry
        this.addTransactionProgressLog('info', 'Transaction process started');
        
        // Store state
        this.transactionProgressState = {
            mode,
            totalTransactions,
            currentTransaction: 0,
            successful: 0,
            failed: 0,
            totalGas: 0,
            isMinimized: false
        };
    }

    /**
     * Update transaction progress
     */
    updateTransactionProgress(message, details = '', transactionIndex = null) {
        if (!this.transactionProgressState) return;
        
        const current = document.getElementById('transactionProgressCurrent');
        const detailsEl = document.getElementById('transactionProgressDetails');
        const progressText = document.getElementById('transactionProgressText');
        const progressCount = document.getElementById('transactionProgressCount');
        const progressBar = document.getElementById('transactionProgressBarFill');
        
        // Update current transaction index if provided
        if (transactionIndex !== null) {
            this.transactionProgressState.currentTransaction = transactionIndex;
        }
        
        // Calculate progress
        const progress = Math.round((this.transactionProgressState.currentTransaction / this.transactionProgressState.totalTransactions) * 100);
        
        // Update UI
        if (current) current.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        if (detailsEl) detailsEl.textContent = details;
        if (progressText) progressText.textContent = `${progress}%`;
        if (progressCount) progressCount.textContent = `${this.transactionProgressState.currentTransaction} / ${this.transactionProgressState.totalTransactions}`;
        if (progressBar) progressBar.style.width = `${progress}%`;
        
        // Update minimized view
        const minimizedText = document.getElementById('transactionProgressMinimizedText');
        if (minimizedText) {
            minimizedText.textContent = `${message} (${progress}%)`;
        }
        
        // Add log entry
        this.addTransactionProgressLog('info', `${message} - ${details}`);
    }

    /**
     * Update transaction result
     */
    updateTransactionResult(success, txHash, gasFee, error = null) {
        if (!this.transactionProgressState) return;
        
        if (success) {
            this.transactionProgressState.successful++;
            this.addTransactionProgressLog('success', `Transaction successful: ${txHash ? txHash.substring(0, 20) + '...' : 'N/A'}`);
        } else {
            this.transactionProgressState.failed++;
            this.addTransactionProgressLog('error', `Transaction failed: ${error || 'Unknown error'}`);
        }
        
        this.transactionProgressState.totalGas += gasFee;
        
        // Update stats
        const successfulEl = document.getElementById('transactionProgressSuccessful');
        const failedEl = document.getElementById('transactionProgressFailed');
        const gasFeeEl = document.getElementById('transactionProgressGasFee');
        
        if (successfulEl) successfulEl.textContent = this.transactionProgressState.successful;
        if (failedEl) failedEl.textContent = this.transactionProgressState.failed;
        if (gasFeeEl) gasFeeEl.textContent = this.transactionProgressState.totalGas.toFixed(6);
    }

    /**
     * Complete transaction progress
     */
    completeTransactionProgress(isError = false, errorMessage = null) {
        if (!this.transactionProgressState) return;
        
        const current = document.getElementById('transactionProgressCurrent');
        const details = document.getElementById('transactionProgressDetails');
        const progressText = document.getElementById('transactionProgressText');
        const progressBar = document.getElementById('transactionProgressBarFill');
        const cancelBtn = document.getElementById('transactionProgressCancel');
        
        const { successful, failed, totalTransactions } = this.transactionProgressState;
        
        if (isError) {
            // Update error state
            current.innerHTML = '<i class="fas fa-exclamation-circle text-danger"></i> Transaction process failed!';
            details.textContent = errorMessage || 'An error occurred during transaction processing';
            
            // Update minimized view
            const minimizedText = document.getElementById('transactionProgressMinimizedText');
            if (minimizedText) {
                minimizedText.textContent = 'Transaction failed';
            }
            
            // Add error log entry
            this.addTransactionProgressLog('error', `Process failed: ${errorMessage || 'Unknown error'}`);
        } else {
            // Update final state
            current.innerHTML = '<i class="fas fa-check-circle text-success"></i> Transaction process completed!';
            details.textContent = `Completed: ${successful} successful, ${failed} failed out of ${totalTransactions} transactions`;
            progressText.textContent = '100%';
            progressBar.style.width = '100%';
            
            // Update minimized view
            const minimizedText = document.getElementById('transactionProgressMinimizedText');
            if (minimizedText) {
                minimizedText.textContent = `Completed: ${successful}/${totalTransactions} successful`;
            }
            
            // Add final log entry
            this.addTransactionProgressLog('info', `Process completed: ${successful} successful, ${failed} failed`);
        }
        
        // Enable close button, disable cancel
        if (cancelBtn) cancelBtn.disabled = true;
        
        // Auto-hide after 5 seconds if minimized
        if (this.transactionProgressState.isMinimized) {
            setTimeout(() => {
                this.hideTransactionProgressMinimized();
            }, 5000);
        }
    }

    /**
     * Add log entry to transaction progress
     */
    addTransactionProgressLog(type, message) {
        const log = document.getElementById('transactionProgressLog');
        if (!log) return;
        
        const entry = document.createElement('div');
        entry.className = `transaction-progress-log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const typeLabel = type.toUpperCase();
        entry.innerHTML = `<strong>[${typeLabel}]</strong> ${timestamp}: ${message}`;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight; // Auto-scroll to bottom
    }

    /**
     * Hide transaction progress dialog
     */
    hideTransactionProgress() {
        const overlay = document.getElementById('transactionProgressOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
        this.transactionProgressState = null;
    }

    /**
     * Minimize transaction progress dialog
     */
    minimizeTransactionProgress() {
        const overlay = document.getElementById('transactionProgressOverlay');
        const minimized = document.getElementById('transactionProgressMinimized');
        
        if (overlay) overlay.classList.remove('show');
        if (minimized) minimized.style.display = 'flex';
        
        if (this.transactionProgressState) {
            this.transactionProgressState.isMinimized = true;
        }
    }

    /**
     * Show transaction progress from minimized state
     */
    showTransactionProgressFromMinimized() {
        const overlay = document.getElementById('transactionProgressOverlay');
        const minimized = document.getElementById('transactionProgressMinimized');
        
        if (minimized) minimized.style.display = 'none';
        if (overlay) overlay.classList.add('show');
        
        if (this.transactionProgressState) {
            this.transactionProgressState.isMinimized = false;
        }
    }

    /**
     * Hide minimized transaction progress
     */
    hideTransactionProgressMinimized() {
        const minimized = document.getElementById('transactionProgressMinimized');
        if (minimized) minimized.style.display = 'none';
        this.transactionProgressState = null;
    }

    /**
     * Setup table column resizing
     */
    setupTableResizing() {
        let isResizing = false;
        let currentColumn = null;
        let startX = 0;
        let startWidth = 0;

        // Add event listeners to column resizers
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('column-resizer')) {
                isResizing = true;
                currentColumn = e.target.parentElement;
                startX = e.pageX;
                startWidth = currentColumn.offsetWidth;
                
                e.target.classList.add('resizing');
                document.body.style.cursor = 'col-resize';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isResizing && currentColumn) {
                const diff = e.pageX - startX;
                const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
                currentColumn.style.width = newWidth + 'px';
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isResizing) {
                isResizing = false;
                if (currentColumn) {
                    const resizer = currentColumn.querySelector('.column-resizer');
                    if (resizer) resizer.classList.remove('resizing');
                }
                currentColumn = null;
                document.body.style.cursor = '';
            }
        });

        // Prevent text selection during resize
        document.addEventListener('selectstart', (e) => {
            if (isResizing) e.preventDefault();
        });
    }
}