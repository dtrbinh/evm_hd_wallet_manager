#!/usr/bin/env node
/**
 * Simple launcher for HD Wallet Manager Web UI
 * Starts the web server on the configured host and port
 */

const { server } = require('./web_ui');

console.log('Starting HD Wallet Manager Web UI...');
console.log('Use Ctrl+C to stop the server');

// The server is already started in web_ui.js
// This file is just for convenience and to match the Python structure 