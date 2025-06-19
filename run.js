#!/usr/bin/env node
/**
 * Main launcher for HD Wallet Manager
 * Allows users to choose between CLI and web UI interfaces
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function printBanner() {
    console.log(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║                    HD WALLET MANAGER                          ║
    ║                   for Polygon Network                         ║
    ║                                                               ║
    ║     Manage 10 HD wallets with USDT and POL token support     ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    `);
}

function printMenu() {
    console.log(`
    📋 Please choose an option:
    
    1. 🖥️  Web UI (Browser Interface)
    2. 💻 Command Line Interface (CLI)
    3. 🔧 Test POL Contract
    4. ❌ Exit
    `);
}

function validateChoice(choice) {
    const validChoices = ['1', '2', '3', '4'];
    return validChoices.includes(choice.trim());
}

function runWebUI() {
    console.log('\n🚀 Starting Web UI...');
    console.log('The web interface will open in your browser.');
    console.log('Use Ctrl+C to stop the server when you\'re done.\n');
    
    const webUIPath = path.join(__dirname, 'backend', 'web_ui.js');
    const webUIProcess = spawn('node', [webUIPath], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
    
    webUIProcess.on('error', (error) => {
        console.error(`❌ Error starting web UI: ${error.message}`);
        console.error('Make sure you have installed the dependencies with: npm install');
        process.exit(1);
    });
    
    webUIProcess.on('exit', (code) => {
        console.log(`\n🔄 Web UI server stopped (exit code: ${code})`);
        if (code !== 0) {
            console.log('There may have been an error. Check the logs above.');
        }
        process.exit(code);
    });
}

function runCLI() {
    console.log('\n💻 Starting Command Line Interface...');
    console.log('You will be prompted to enter your seed phrase and other details.\n');
    
    const cliPath = path.join(__dirname, 'backend', 'hd_wallet_manager.js');
    const cliProcess = spawn('node', [cliPath], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
    
    cliProcess.on('error', (error) => {
        console.error(`❌ Error starting CLI: ${error.message}`);
        console.error('Make sure you have installed the dependencies with: npm install');
        process.exit(1);
    });
    
    cliProcess.on('exit', (code) => {
        console.log(`\n🔄 CLI process completed (exit code: ${code})`);
        if (code !== 0) {
            console.log('There may have been an error. Check the logs above.');
        }
        process.exit(code);
    });
}

function testPOLContract() {
    console.log('\n🔧 Testing POL Contract...');
    console.log('This will test different POL contract addresses to find the working one.\n');
    
    const testPath = path.join(__dirname, 'backend', 'test_pol_contract.js');
    const testProcess = spawn('node', [testPath], {
        stdio: 'inherit',
        cwd: process.cwd()
    });
    
    testProcess.on('error', (error) => {
        console.error(`❌ Error running contract test: ${error.message}`);
        console.error('Make sure you have installed the dependencies with: npm install');
        process.exit(1);
    });
    
    testProcess.on('exit', (code) => {
        console.log(`\n🔄 Contract test completed (exit code: ${code})`);
        if (code !== 0) {
            console.log('There may have been an error. Check the logs above.');
        }
        process.exit(code);
    });
}

function handleChoice(choice) {
    switch (choice.trim()) {
        case '1':
            rl.close();
            runWebUI();
            break;
            
        case '2':
            rl.close();
            runCLI();
            break;
            
        case '3':
            rl.close();
            testPOLContract();
            break;
            
        case '4':
            console.log('\n👋 Goodbye!');
            rl.close();
            process.exit(0);
            break;
            
        default:
            console.log('❌ Invalid choice. Please enter 1, 2, 3, or 4.');
            askForChoice();
            break;
    }
}

function askForChoice() {
    rl.question('Enter your choice (1-4): ', (answer) => {
        if (validateChoice(answer)) {
            handleChoice(answer);
        } else {
            console.log('❌ Invalid choice. Please enter 1, 2, 3, or 4.');
            askForChoice();
        }
    });
}

function checkDependencies() {
    console.log('🔍 Checking dependencies...');
    
    try {
        // Check if node_modules exists
        const fs = require('fs');
        const backendPath = path.join(__dirname, 'backend');
        const nodeModulesPath = path.join(backendPath, 'node_modules');
        
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('❌ Dependencies not installed.');
            console.log('Please run the following commands:');
            console.log('  cd backend');
            console.log('  npm install');
            console.log('');
            process.exit(1);
        }
        
        console.log('✅ Dependencies found.');
        
    } catch (error) {
        console.log('⚠️  Could not check dependencies, but continuing...');
    }
}

function main() {
    printBanner();
    
    // Check if we're in the right directory
    const fs = require('fs');
    const backendPath = path.join(__dirname, 'backend');
    
    if (!fs.existsSync(backendPath)) {
        console.log('❌ Error: backend directory not found.');
        console.log('Please make sure you\'re running this script from the project root directory.');
        process.exit(1);
    }
    
    // Check dependencies
    checkDependencies();
    
    console.log('🎯 HD Wallet Manager is ready to use!');
    console.log('');
    console.log('💡 Features:');
    console.log('   • Generate 10 HD wallets from seed phrase');
    console.log('   • Check USDT and POL balances on Polygon network');
    console.log('   • Consolidate USDT from all wallets to wallet 1');
    console.log('   • Export detailed Excel reports');
    console.log('   • Modern web interface with real-time updates');
    console.log('');
    
    printMenu();
    askForChoice();
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye!');
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Goodbye!');
    rl.close();
    process.exit(0);
});

// Start the application
if (require.main === module) {
    main();
}

module.exports = {
    printBanner,
    printMenu,
    runWebUI,
    runCLI,
    testPOLContract
}; 