/**
 * Security Utilities for EVM HD Wallet Manager
 * Comprehensive security functions for input validation, sanitization, and protection
 */

class SecurityUtils {
    /**
     * Sanitize user input based on type
     */
    static sanitizeInput(input, type = 'text') {
        if (!input || typeof input !== 'string') return '';
        
        // Remove potentially dangerous characters
        let sanitized = input.trim();
        
        switch (type) {
            case 'seedPhrase':
                // Only allow alphanumeric and spaces for seed phrases
                sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
                // Normalize multiple spaces to single space
                sanitized = sanitized.replace(/\s+/g, ' ');
                break;
            case 'address':
                // Only allow hex characters for addresses
                sanitized = sanitized.replace(/[^0-9a-fA-Fx]/g, '');
                // Ensure 0x prefix
                if (sanitized && !sanitized.startsWith('0x')) {
                    sanitized = '0x' + sanitized;
                }
                break;
            case 'amount':
                // Only allow numbers and decimal point
                sanitized = sanitized.replace(/[^0-9.]/g, '');
                // Ensure only one decimal point
                const parts = sanitized.split('.');
                if (parts.length > 2) {
                    sanitized = parts[0] + '.' + parts.slice(1).join('');
                }
                break;
            case 'url':
                // Basic URL validation and sanitization
                try {
                    const url = new URL(sanitized);
                    // Only allow http/https protocols
                    if (!['http:', 'https:'].includes(url.protocol)) {
                        return '';
                    }
                    sanitized = url.toString();
                } catch {
                    return '';
                }
                break;
            case 'number':
                // Only allow numbers
                sanitized = sanitized.replace(/[^0-9]/g, '');
                break;
            default:
                // General HTML escape
                sanitized = sanitized
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;')
                    .replace(/\//g, '&#x2F;');
        }
        
        return sanitized;
    }
    
    /**
     * Enhanced Ethereum address validation with checksum
     */
    static validateEthereumAddress(address) {
        if (!address || typeof address !== 'string') return false;
        
        // Sanitize first
        address = this.sanitizeInput(address, 'address');
        
        // Basic format check
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
        
        // Checksum validation using ethers
        try {
            if (typeof ethers !== 'undefined' && ethers.utils && ethers.utils.getAddress) {
                ethers.utils.getAddress(address);
                return true;
            }
        } catch {
            return false;
        }
        
        return true;
    }
    
    /**
     * Rate limiting to prevent abuse
     */
    static rateLimitCheck(key, maxRequests = 10, timeWindow = 60000) {
        try {
            const now = Date.now();
            const storageKey = `rateLimit_${key}`;
            const requests = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            // Clean old requests
            const validRequests = requests.filter(time => now - time < timeWindow);
            
            if (validRequests.length >= maxRequests) {
                const retryAfter = timeWindow - (now - validRequests[0]);
                return { 
                    allowed: false, 
                    retryAfter: Math.ceil(retryAfter / 1000),
                    message: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 1000)} seconds.`
                };
            }
            
            validRequests.push(now);
            localStorage.setItem(storageKey, JSON.stringify(validRequests));
            
            return { allowed: true };
        } catch (error) {
            console.warn('Rate limit check failed:', error);
            return { allowed: true }; // Fail open
        }
    }
    
    /**
     * Validate seed phrase with enhanced security
     */
    static validateSeedPhrase(seedPhrase) {
        if (!seedPhrase || typeof seedPhrase !== 'string') {
            return { valid: false, error: 'Seed phrase is required' };
        }
        
        // Sanitize input
        const sanitized = this.sanitizeInput(seedPhrase, 'seedPhrase');
        if (sanitized !== seedPhrase.trim()) {
            return { valid: false, error: 'Seed phrase contains invalid characters' };
        }
        
        const words = sanitized.split(/\s+/);
        
        // Check word count
        if (![12, 15, 18, 21, 24].includes(words.length)) {
            return { valid: false, error: 'Seed phrase must be 12, 15, 18, 21, or 24 words' };
        }
        
        // Check for duplicate words (potential typo)
        const uniqueWords = new Set(words);
        if (uniqueWords.size !== words.length) {
            return { valid: false, error: 'Seed phrase contains duplicate words' };
        }
        
        // Check minimum word length
        if (words.some(word => word.length < 3)) {
            return { valid: false, error: 'Seed phrase words must be at least 3 characters' };
        }
        
        // Validate using ethers.js
        try {
            if (typeof ethers !== 'undefined' && ethers.Mnemonic && ethers.Mnemonic.fromPhrase) {
                ethers.Mnemonic.fromPhrase(sanitized);
                return { valid: true, sanitized };
            }
        } catch (error) {
            return { valid: false, error: 'Invalid seed phrase - please check your words' };
        }
        
        return { valid: false, error: 'Unable to validate seed phrase' };
    }
    
    /**
     * Secure random number generation
     */
    static secureRandom(length = 32) {
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
            // Fallback for older browsers
            console.warn('Secure random generation not available, using fallback');
            return Array.from({length}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
        }
    }
}

/**
 * Phishing Protection Class
 */
class PhishingProtection {
    static init() {
        this.verifyDomain();
        this.checkSSL();
        this.detectTampering();
        this.setupIntegrityChecks();
    }
    
    static verifyDomain() {
        const allowedDomains = [
            'dtrbinh.github.io',
            'localhost',
            '127.0.0.1',
            '0.0.0.0'
        ];
        
        const currentDomain = window.location.hostname;
        
        if (!allowedDomains.includes(currentDomain)) {
            this.showSecurityWarning('DOMAIN WARNING', 
                `You are accessing this application from an unauthorized domain: ${currentDomain}. 
                This could be a phishing attempt! Only use the official domain: dtrbinh.github.io`);
            return false;
        }
        
        return true;
    }
    
    static checkSSL() {
        if (window.location.protocol !== 'https:' && 
            !['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)) {
            this.showSecurityWarning('SSL WARNING', 
                'This site is not using HTTPS. Your data may not be secure!');
            return false;
        }
        return true;
    }
    
    static detectTampering() {
        // Check for suspicious scripts
        const scripts = document.querySelectorAll('script');
        const suspiciousPatterns = [
            'malicious', 'keylogger', 'stealer', 'phishing', 'hack',
            'bitcoin', 'wallet-stealer', 'crypto-stealer'
        ];
        
        const suspiciousScripts = Array.from(scripts).filter(script => {
            const src = (script.src || '').toLowerCase();
            const content = (script.textContent || '').toLowerCase();
            
            return suspiciousPatterns.some(pattern => 
                src.includes(pattern) || content.includes(pattern)
            );
        });
        
        if (suspiciousScripts.length > 0) {
            this.showSecurityWarning('TAMPERING DETECTED', 
                'Suspicious scripts detected! This site may have been compromised.');
            return false;
        }
        
        return true;
    }
    
    static setupIntegrityChecks() {
        // Monitor for DOM modifications that could indicate tampering
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') {
                                const src = node.src || '';
                                if (src && !this.isAllowedScript(src)) {
                                    this.showSecurityWarning('SCRIPT INJECTION', 
                                        'Unauthorized script detected and blocked!');
                                    node.remove();
                                }
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
    
    static isAllowedScript(src) {
        const allowedDomains = [
            'cdn.jsdelivr.net',
            'cdnjs.cloudflare.com',
            'dtrbinh.github.io'
        ];
        
        try {
            const url = new URL(src);
            return allowedDomains.some(domain => url.hostname.includes(domain));
        } catch {
            return false;
        }
    }
    
    static showSecurityWarning(title, message) {
        // Create modal warning
        const warningHTML = `
            <div class="modal fade" id="securityWarningModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-danger">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle"></i> ${title}
                            </h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-danger">
                                <strong>SECURITY ALERT:</strong><br>
                                ${message}
                            </div>
                            <p><strong>Recommended actions:</strong></p>
                            <ul>
                                <li>Close this tab immediately</li>
                                <li>Visit the official site: <code>https://dtrbinh.github.io/evm_hd_wallet_manager/</code></li>
                                <li>Never enter your seed phrase on suspicious sites</li>
                            </ul>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-danger" onclick="window.close()">Close Tab</button>
                            <a href="https://dtrbinh.github.io/evm_hd_wallet_manager/" class="btn btn-success">Go to Official Site</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', warningHTML);
        
        // Show modal
        if (typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(document.getElementById('securityWarningModal'));
            modal.show();
        } else {
            alert(`${title}: ${message}`);
        }
    }
}

/**
 * Session Security Manager
 */
class SessionSecurity {
    constructor() {
        this.maxIdleTime = 30 * 60 * 1000; // 30 minutes
        this.lastActivity = Date.now();
        this.warningTime = 25 * 60 * 1000; // 25 minutes - show warning
        this.hasWarned = false;
        this.setupActivityMonitoring();
    }
    
    setupActivityMonitoring() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
        
        // Check for idle timeout every minute
        this.intervalId = setInterval(() => {
            this.checkIdleTimeout();
        }, 60000);
    }
    
    updateActivity() {
        this.lastActivity = Date.now();
        this.hasWarned = false;
        
        // Hide warning if shown
        const warningModal = document.getElementById('sessionWarningModal');
        if (warningModal) {
            warningModal.remove();
        }
    }
    
    checkIdleTimeout() {
        const now = Date.now();
        const idleTime = now - this.lastActivity;
        
        if (idleTime > this.maxIdleTime) {
            this.handleIdleTimeout();
        } else if (idleTime > this.warningTime && !this.hasWarned) {
            this.showIdleWarning();
            this.hasWarned = true;
        }
    }
    
    showIdleWarning() {
        const remainingTime = Math.ceil((this.maxIdleTime - (Date.now() - this.lastActivity)) / 1000);
        
        const warningHTML = `
            <div class="modal fade" id="sessionWarningModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-clock"></i> Session Timeout Warning
                            </h5>
                        </div>
                        <div class="modal-body">
                            <p>Your session will expire in <strong id="countdown">${remainingTime}</strong> seconds due to inactivity.</p>
                            <p>Click "Stay Active" to continue your session, or your sensitive data will be cleared for security.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="sessionSecurity.extendSession()">
                                <i class="fas fa-refresh"></i> Stay Active
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', warningHTML);
        
        if (typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(document.getElementById('sessionWarningModal'));
            modal.show();
            
            // Update countdown
            const countdownElement = document.getElementById('countdown');
            const countdownInterval = setInterval(() => {
                const remaining = Math.ceil((this.maxIdleTime - (Date.now() - this.lastActivity)) / 1000);
                if (countdownElement && remaining > 0) {
                    countdownElement.textContent = remaining;
                } else {
                    clearInterval(countdownInterval);
                }
            }, 1000);
        }
    }
    
    extendSession() {
        this.updateActivity();
        const warningModal = document.getElementById('sessionWarningModal');
        if (warningModal) {
            warningModal.remove();
        }
    }
    
    handleIdleTimeout() {
        // Clear sensitive data
        this.clearSensitiveData();
        
        // Show timeout message
        alert('Session expired due to inactivity. Your sensitive data has been cleared for security.');
        
        // Reset application state
        this.resetApplication();
    }
    
    clearSensitiveData() {
        try {
            // Clear wallet manager data
            if (window.walletManager) {
                window.walletManager.clearSensitiveData();
            }
            
            // Clear form fields
            const sensitiveFields = ['seedPhrase', 'rpcUrl'];
            sensitiveFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = '';
                }
            });
            
            // Clear localStorage sensitive data
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('wallet') || key.includes('seed') || key.includes('private'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
        } catch (error) {
            console.error('Error clearing sensitive data:', error);
        }
    }
    
    resetApplication() {
        // Reset global variables
        window.walletManager = null;
        window.multiTransceiver = null;
        
        // Hide step controls
        if (window.uiController) {
            window.uiController.hideStepControls();
        }
        
        // Clear tables
        const walletsTableBody = document.querySelector('#walletsTable tbody');
        if (walletsTableBody) {
            walletsTableBody.innerHTML = '';
        }
    }
    
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}

/**
 * Secure Memory Manager
 */
class SecureMemoryManager {
    constructor() {
        this.sensitiveData = new Map();
        this.setupCleanupHandlers();
    }
    
    storeSensitiveData(key, data) {
        // Store with automatic cleanup
        this.sensitiveData.set(key, data);
        
        // Clear after 30 minutes of inactivity
        setTimeout(() => {
            this.clearSensitiveData(key);
        }, 30 * 60 * 1000);
    }
    
    getSensitiveData(key) {
        return this.sensitiveData.get(key);
    }
    
    clearSensitiveData(key) {
        if (this.sensitiveData.has(key)) {
            const data = this.sensitiveData.get(key);
            
            // Overwrite memory (JavaScript limitation - best effort)
            if (typeof data === 'string') {
                // Create new string with random data
                const randomData = Array(data.length).fill(0).map(() => 
                    String.fromCharCode(Math.floor(Math.random() * 256))
                ).join('');
                
                // Attempt to overwrite (limited effectiveness in JS)
                try {
                    data.replace(/.*/g, randomData);
                } catch (e) {
                    // String replacement might fail, that's okay
                }
            }
            
            this.sensitiveData.delete(key);
        }
    }
    
    setupCleanupHandlers() {
        // Clear sensitive data on page unload
        window.addEventListener('beforeunload', () => {
            this.clearAllSensitiveData();
        });
        
        // Clear on visibility change (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Don't clear immediately, but schedule cleanup
                setTimeout(() => {
                    if (document.hidden) {
                        this.clearAllSensitiveData();
                    }
                }, 5 * 60 * 1000); // 5 minutes
            }
        });
    }
    
    clearAllSensitiveData() {
        for (const key of this.sensitiveData.keys()) {
            this.clearSensitiveData(key);
        }
    }
}

/**
 * Transaction Security Validator
 */
class TransactionSecurity {
    static validateTransaction(transaction) {
        const warnings = [];
        const errors = [];
        
        // Amount validation
        if (!transaction.amount || transaction.amount <= 0) {
            errors.push('Amount must be positive');
        }
        
        if (transaction.amount > 1000000) {
            warnings.push('Amount is unusually large - please double-check');
        }
        
        // Address validation
        if (!SecurityUtils.validateEthereumAddress(transaction.to)) {
            errors.push('Invalid recipient address');
        }
        
        // Gas price validation
        if (transaction.gasPrice && transaction.gasPrice > 1000000000000) {
            warnings.push('Gas price is unusually high');
        }
        
        // Check for common scam addresses
        const scamAddresses = [
            '0x0000000000000000000000000000000000000000', // Burn address
            '0x000000000000000000000000000000000000dead', // Dead address
        ];
        
        if (scamAddresses.includes(transaction.to.toLowerCase())) {
            errors.push('WARNING: Recipient address is flagged as potentially dangerous');
        }
        
        // Check for self-send (might be intentional but worth warning)
        if (transaction.from && transaction.from.toLowerCase() === transaction.to.toLowerCase()) {
            warnings.push('You are sending to the same address (self-transfer)');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    static async confirmTransaction(transaction) {
        const validation = this.validateTransaction(transaction);
        
        if (!validation.isValid) {
            alert('Transaction validation failed:\n' + validation.errors.join('\n'));
            return false;
        }
        
        let confirmMessage = `⚠️ TRANSACTION CONFIRMATION ⚠️

Please verify these details carefully:

To: ${transaction.to}
Amount: ${transaction.amount} ${transaction.token}
Network: ${transaction.network}
${transaction.gasPrice ? `Gas Price: ${transaction.gasPrice} wei` : ''}`;

        if (validation.warnings.length > 0) {
            confirmMessage += `\n\n⚠️ WARNINGS:\n${validation.warnings.join('\n')}`;
        }
        
        confirmMessage += `\n\n🔒 SECURITY REMINDER:
- Double-check the recipient address
- Verify the amount is correct
- Ensure you're on the right network
- This transaction cannot be reversed

Do you want to proceed with this transaction?`;
        
        return confirm(confirmMessage);
    }
}

/**
 * Network Security Validator
 */
class NetworkSecurity {
    static validateRpcUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Only allow HTTPS (except localhost)
            if (urlObj.protocol !== 'https:' && 
                !['localhost', '127.0.0.1', '0.0.0.0'].includes(urlObj.hostname)) {
                return { valid: false, error: 'RPC URL must use HTTPS for security' };
            }
            
            // Block known malicious domains
            const blockedDomains = [
                'malicious-rpc.com',
                'fake-ethereum.org',
                'scam-rpc.net',
                'phishing-node.com'
            ];
            
            if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
                return { valid: false, error: 'RPC URL is blocked for security reasons' };
            }
            
            // Warn about suspicious patterns
            const suspiciousPatterns = ['free-eth', 'get-rich', 'double-crypto'];
            if (suspiciousPatterns.some(pattern => urlObj.hostname.includes(pattern))) {
                return { 
                    valid: true, 
                    warning: 'RPC URL looks suspicious - please verify it\'s legitimate' 
                };
            }
            
            return { valid: true };
        } catch {
            return { valid: false, error: 'Invalid URL format' };
        }
    }
    
    static async testRpcConnection(url, timeout = 5000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'RPC Error');
            }
            
            return { 
                success: true, 
                blockNumber: data.result,
                latency: Date.now() - performance.now()
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.name === 'AbortError' ? 'Connection timeout' : error.message 
            };
        }
    }
}

// Initialize security on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize phishing protection
    PhishingProtection.init();
    
    // Initialize session security
    window.sessionSecurity = new SessionSecurity();
    
    // Initialize secure memory manager
    window.secureMemoryManager = new SecureMemoryManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecurityUtils,
        PhishingProtection,
        SessionSecurity,
        SecureMemoryManager,
        TransactionSecurity,
        NetworkSecurity
    };
} 