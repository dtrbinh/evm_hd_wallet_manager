#!/usr/bin/env node
/**
 * Web UI for HD Wallet Manager - Express.js version
 * Provides web interface for managing HD wallets on Polygon network
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const HDWalletManager = require('./hd_wallet_manager');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (templates)
app.use('/static', express.static(path.join(__dirname, '../frontend')));

// Global variables
let walletManager = null;
let connectedClients = 0;

// Utility function to emit progress updates
function emitProgress(message, percentage = null) {
    console.log(`[Progress] ${message}`);
    io.emit('progress', { message, percentage });
}

// Routes

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/templates/index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        connected_clients: connectedClients,
        has_wallet_manager: walletManager !== null
    });
});

// Initialize wallet manager
app.post('/api/initialize', async (req, res) => {
    try {
        const { seed_phrase, rpc_url } = req.body;
        
        if (!seed_phrase || seed_phrase.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Seed phrase is required'
            });
        }
        
        emitProgress("Initializing HD Wallet Manager...", 10);
        
        // Initialize wallet manager
        walletManager = new HDWalletManager(seed_phrase.trim(), rpc_url || null);
        
        emitProgress("HD Wallet Manager initialized successfully!", 100);
        
        res.json({
            success: true,
            message: 'Wallet manager initialized successfully'
        });
        
    } catch (error) {
        console.error('Error initializing wallet manager:', error);
        emitProgress(`Error: ${error.message}`, null);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate HD wallets with custom derivation path range
app.post('/api/generate-wallets', async (req, res) => {
    try {
        if (!walletManager) {
            return res.status(400).json({
                success: false,
                error: 'Wallet manager not initialized. Please initialize first.'
            });
        }
        
        const { start_index = 0, end_index = 9, count = 10 } = req.body;
        
        // Validate inputs
        const startIdx = parseInt(start_index);
        const endIdx = parseInt(end_index);
        const walletCount = parseInt(count);
        
        if (endIdx < startIdx) {
            return res.status(400).json({
                success: false,
                error: 'End index must be greater than or equal to start index'
            });
        }
        
        if (walletCount > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 wallets allowed'
            });
        }
        
        emitProgress("Generating HD wallets...", 20);
        
        const wallets = walletManager.generateWallets(walletCount, startIdx, endIdx);
        
        // Format wallets for frontend (without private keys for security)
        const safeWallets = wallets.map(wallet => ({
            index: wallet.index,
            address: wallet.address,
            path: wallet.path
        }));
        
        emitProgress(`Generated ${wallets.length} HD wallets successfully!`, 100);
        
        res.json({
            success: true,
            data: safeWallets
        });
        
    } catch (error) {
        console.error('Error generating wallets:', error);
        emitProgress(`Error: ${error.message}`, null);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check balances for all wallets and return wallets with balance data
app.post('/api/check-balances', async (req, res) => {
    try {
        if (!walletManager || !walletManager.wallets || walletManager.wallets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No wallets available. Please generate wallets first.'
            });
        }
        
        emitProgress("Checking balances for all wallets...", 30);
        
        const balanceData = await walletManager.checkAllBalances();
        
        // Combine wallet info with balance data, showing 'error' for failed balance checks
        const walletsWithBalances = walletManager.wallets.map(wallet => {
            const balanceInfo = balanceData.find(b => b.wallet_index === wallet.index) || {};
            return {
                index: wallet.index,
                address: wallet.address,
                path: wallet.path,
                native_pol_balance: balanceInfo.native_pol_balance !== null ? balanceInfo.native_pol_balance : 'error',
                usdt_balance: balanceInfo.usdt_balance !== null ? balanceInfo.usdt_balance : 'error',
                timestamp: balanceInfo.timestamp || new Date().toISOString()
            };
        });
        
        emitProgress("Balance checking completed!", 100);
        
        res.json({
            success: true,
            wallets: walletsWithBalances
        });
        
    } catch (error) {
        console.error('Error checking balances:', error);
        emitProgress(`Error: ${error.message}`, null);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get balance totals
app.get('/api/get-totals', async (req, res) => {
    try {
        if (!walletManager || !walletManager.wallets || walletManager.wallets.length === 0) {
            return res.json({
                success: true,
                totals: {
                    wallet_count: 0,
                    total_native_pol: 0,
                    total_usdt: 0,
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Get current balance data
        const balanceData = await walletManager.checkAllBalances();
        
        // Calculate totals (excluding null and error values)
        const totalNativePol = balanceData
            .filter(b => b.native_pol_balance !== null && typeof b.native_pol_balance === 'number')
            .reduce((sum, b) => sum + (b.native_pol_balance || 0), 0);
            
        const totalUsdt = balanceData
            .filter(b => b.usdt_balance !== null && typeof b.usdt_balance === 'number')
            .reduce((sum, b) => sum + (b.usdt_balance || 0), 0);
        
        res.json({
            success: true,
            totals: {
                wallet_count: walletManager.wallets.length,
                total_native_pol: totalNativePol,
                total_usdt: totalUsdt,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error getting totals:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});



// Save logs to Excel
app.post('/api/save-logs', async (req, res) => {
    try {
        if (!walletManager) {
            return res.status(400).json({
                success: false,
                error: 'Wallet manager not initialized.'
            });
        }
        
        const { filename } = req.body;
        
        emitProgress("Saving logs to Excel...", 80);
        
        await walletManager.saveLogsToExcel(filename);
        
        emitProgress("Logs saved successfully!", 100);
        
        res.json({
            success: true,
            message: 'Logs saved to Excel file successfully'
        });
        
    } catch (error) {
        console.error('Error saving logs:', error);
        emitProgress(`Error: ${error.message}`, null);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get current wallets (without balances)
app.get('/api/get-wallets', (req, res) => {
    try {
        if (!walletManager || !walletManager.wallets) {
            return res.json({
                success: true,
                wallets: []
            });
        }
        
        // Return wallets without balance data
        const wallets = walletManager.wallets.map(wallet => ({
            index: wallet.index,
            address: wallet.address,
            path: wallet.path,
            native_pol_balance: null,
            usdt_balance: null,
            timestamp: null
        }));
        
        res.json({
            success: true,
            wallets: wallets
        });
        
    } catch (error) {
        console.error('Error getting wallets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});





// Get current status
app.get('/api/get-status', (req, res) => {
    try {
        res.json({
            success: true,
            running: false,
            progress: 0,
            current_step: 'Idle',
            message: 'Ready',
            has_wallet_manager: walletManager !== null,
            wallet_count: walletManager?.wallets?.length || 0
        });
        
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Estimate gas fees for multi-transaction
app.post('/api/estimate-multi-gas', async (req, res) => {
    try {
        if (!walletManager || !walletManager.wallets || walletManager.wallets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No wallets available. Please generate wallets first.'
            });
        }
        
        const { mode, token, selected_wallets, amount } = req.body;
        
        if (!mode || !token || !selected_wallets || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }
        
        const selectedWalletIndices = selected_wallets.map(w => parseInt(w));
        const transactionAmount = parseFloat(amount);
        const transactionCount = selectedWalletIndices.length;
        
        // Estimate gas for each transaction
        const gasEstimate = await walletManager.estimateMultiTransactionGas(
            mode, 
            token, 
            transactionCount, 
            transactionAmount
        );
        
        res.json({
            success: true,
            transaction_count: transactionCount,
            gas_per_transaction: gasEstimate.gasPerTransaction,
            total_gas_fee: gasEstimate.totalGasFee,
            total_amount: transactionAmount * transactionCount
        });
        
    } catch (error) {
        console.error('Error estimating multi-transaction gas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Execute multi-transaction
app.post('/api/execute-multi-transaction', async (req, res) => {
    try {
        if (!walletManager || !walletManager.wallets || walletManager.wallets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No wallets available. Please generate wallets first.'
            });
        }
        
        const { mode, token, sender_wallet, receiver_wallet, selected_wallets, amount } = req.body;
        
        if (!mode || !token || !selected_wallets || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }
        
        emitProgress("Executing multi-transaction...", 10);
        
        const result = await walletManager.executeMultiTransaction({
            mode,
            token,
            senderWallet: sender_wallet ? parseInt(sender_wallet) : null,
            receiverWallet: receiver_wallet ? parseInt(receiver_wallet) : null,
            selectedWallets: selected_wallets.map(w => parseInt(w)),
            amount: parseFloat(amount)
        });
        
        emitProgress("Multi-transaction completed!", 100);
        
        res.json({
            success: true,
            transactions: result.transactions,
            total_gas_used: result.totalGasUsed,
            successful_transactions: result.successfulTransactions,
            failed_transactions: result.failedTransactions
        });
        
    } catch (error) {
        console.error('Error executing multi-transaction:', error);
        emitProgress(`Error: ${error.message}`, null);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    connectedClients++;
    console.log(`Client connected. Total clients: ${connectedClients}`);
    
    // Send welcome message
    socket.emit('connected', {
        message: 'Connected to HD Wallet Manager',
        timestamp: new Date().toISOString()
    });
    
    socket.on('disconnect', () => {
        connectedClients--;
        console.log(`Client disconnected. Total clients: ${connectedClients}`);
    });
    
    // Handle ping/pong for connection monitoring
    socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
const PORT = process.env.WEB_UI_PORT || 5000;
const HOST = process.env.WEB_UI_HOST || '127.0.0.1';

server.listen(PORT, HOST, () => {
    console.log('=== HD Wallet Manager Web UI (Node.js) ===');
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Environment configuration:');
    console.log(`  - RPC URL: ${process.env.MATIC_RPC_URL || 'Default Polygon RPC'}`);
    console.log(`  - USDT Contract: ${process.env.USDT_CONTRACT_ADDRESS || 'Default'}`);
    console.log(`  - POL Contract: ${process.env.POL_CONTRACT_ADDRESS || 'Default'}`);
    console.log('\nOpen your browser and navigate to the URL above to use the web interface.');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

module.exports = { app, server, io }; 