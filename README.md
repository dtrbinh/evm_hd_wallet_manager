# HD Wallet Manager for Polygon Network

A Node.js application that manages HD wallets derived from a seed phrase, checks balances on the Polygon network, and consolidates USDT tokens to a single wallet.

## Features

- **HD Wallet Generation**: Creates 10 HD wallets from a single seed phrase
- **Balance Checking**: Monitors USDT and POL balances across all wallets
- **Smart Transfer Logic**: Automatically transfers USDT from wallets 2-10 to wallet 1
- **Gas Management**: Handles gas costs with intelligent transaction fee calculation
- **Comprehensive Logging**: Generates detailed Excel reports with multiple sheets
- **Error Handling**: Robust error handling and transaction verification
- **🌐 Web Interface**: Modern web UI with tables and buttons for better usability

## Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher
- A valid 12, 15, 18, 21, or 24-word seed phrase
- Internet connection for Polygon network access

## Installation

1. **Clone or download the project files**

2. **Navigate to the project directory**:
   ```bash
   cd hd_wallet_manager
   ```

3. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

4. **Set up configuration** (optional):
   ```bash
   node ../setup_env.js
   # This will create backend/env.config with your preferred settings
   ```

## Usage

### Quick Start (Recommended)

Use the main launcher to choose your preferred interface:

```bash
node run.js
```

Then select:
- **1. Web UI** - Modern interface with tables and buttons
- **2. Command Line Interface** - Traditional terminal interface
- **3. Test POL Contract** - Test contract addresses
- **4. Exit**

### Option 1: Web Interface

The web interface provides a modern, user-friendly experience:

```bash
# Launch the web UI directly
node backend/web_ui.js

# Or use npm scripts
cd backend
npm start
```

Then open your browser and go to: `http://localhost:5000`

**Web UI Features:**
- 🎨 Beautiful gradient design with Bootstrap 5
- 📊 Interactive data tables for wallets, balances, and transfers
- 🔘 One-click operations and step-by-step controls
- 📈 Real-time progress tracking with progress bars
- 📱 Responsive design that works on all devices
- ⚡ Real-time updates via Socket.IO

### Option 2: Command Line Interface

```bash
# Run the main program
node backend/hd_wallet_manager.js

# Or use npm script
cd backend
npm run wallet
```

### What the Program Does

1. **Generates 10 HD wallets** from your seed phrase using BIP44 derivation path
2. **Checks initial balances** for USDT and POL on all wallets
3. **Consolidates USDT** from wallets 2-10 to wallet 1:
   - Estimates gas costs and transaction fees
   - Transfers USDT directly to wallet 1
   - Handles transaction retry logic automatically
4. **Checks final balances** after all transfers
5. **Generates Excel report** with detailed logs

### Output Files

The program generates several files:

- **Excel Report**: `hd_wallet_logs_YYYYMMDD_HHMMSS.xlsx`
  - **Wallets Sheet**: Wallet addresses and derivation paths
  - **Balances Sheet**: Balance history for all wallets
  - **Transfers Sheet**: Detailed transfer results and status
  - **Summary Sheet**: Overall statistics and metrics

- **Log File**: `hd_wallet_manager.log`
  - Detailed console and file logging
  - Transaction hashes and status updates

## Web UI Guide

### Setup Section

1. **Enter Seed Phrase**: Input your 12, 15, 18, 21, or 24-word mnemonic phrase
2. **RPC URL (Optional)**: Specify a custom Polygon RPC endpoint or leave blank for default
3. **Choose Operation**:
   - **Initialize**: Set up wallet manager
   - **Step-by-step controls**: Manual control over each operation

### Progress Section

The progress section appears automatically when operations are running:

- **Progress Bar**: Visual representation of completion percentage
- **Current Step**: Shows what operation is currently being performed
- **Status Messages**: Success/error information with real-time updates
- **Auto-hide**: Progress section disappears after completion

### Step-by-Step Controls

After initialization, you can use individual controls:

1. **1. Get HD Wallets**: Create 10 HD wallets from your seed phrase
2. **2. Check Balances**: Query USDT and POL balances
3. **3. Consolidate USDT**: Transfer USDT from wallets 2-10 to wallet 1
4. **4. Save Logs**: Generate Excel report with all data

### Data Tables

#### Wallets Table (Combined View)
| Column | Description |
|--------|-------------|
| # | Wallet number (1-10) |
| Address | Full wallet address |
| Derivation Path | HD wallet derivation path |
| USDT | USDT balance (null if error) |
| POL | POL balance (null if error) |
| Updated | Timestamp of last balance check |

#### Transfers Table
| Column | Description |
|--------|-------------|
| From Wallet | Source wallet number |
| To Wallet | Destination wallet number |
| USDT Amount | Amount transferred |
| Gas Estimate | Estimated gas cost in MATIC |
| Status | Transfer status with color indicator |
| Timestamp | When transfer was attempted |

### Totals Summary

The web interface displays real-time totals:
- **Total Wallets**: Number of generated wallets
- **Total USDT**: Sum of all USDT balances (excluding null values)
- **Total POL**: Sum of all POL balances (excluding null values)

## Security Considerations

⚠️ **IMPORTANT SECURITY WARNINGS**:

1. **Never share your seed phrase** with anyone or any application
2. **Run this program on a secure, private computer**
3. **Verify the source code** before running with real funds
4. **Start with small amounts** to test the functionality
5. **Keep your seed phrase backup safe** and offline
6. **Consider using a testnet** first to verify everything works

## Configuration Options

### Environment File

Create and customize your environment using:

```bash
node setup_env.js
```

Or manually create `backend/env.config` with these settings:

```env
# Polygon Network Configuration
MATIC_RPC_URL=https://polygon-rpc.com

# Token Contract Addresses
USDT_CONTRACT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
POL_CONTRACT_ADDRESS=0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6

# Gas and Transaction Settings
GAS_PRICE_MULTIPLIER=1.1
DEFAULT_GAS_LIMIT=65000
TRANSACTION_TIMEOUT=300
MAX_RETRIES=3
RETRY_DELAY=2

# Web UI Configuration
WEB_UI_HOST=127.0.0.1
WEB_UI_PORT=5000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=hd_wallet_manager.log
```

### RPC URLs

You can use different Polygon RPC endpoints:

- **Default**: `https://polygon-rpc.com`
- **Alternative**: `https://rpc-mainnet.matic.network`
- **Alternative**: `https://rpc-mainnet.maticvigil.com`
- **Paid**: `https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID`
- **Paid**: `https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY`

## Token Addresses

The program uses these token addresses on Polygon:

- **USDT**: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- **POL**: `0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6`

### Alternative POL Addresses

If the default POL address doesn't work, try these alternatives:

- **WMATIC**: `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270`
- **Legacy MATIC**: `0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0`

## Testing POL Contract

Use the built-in contract tester to verify POL token addresses:

```bash
node backend/test_pol_contract.js

# Or use the interactive launcher
node run.js
# Then select option 3: "Test POL Contract"
```

This will test multiple POL contract addresses and recommend the best one to use.

## Error Handling

The program handles various error scenarios:

- **Contract Issues**: Verifies contract deployment and accessibility
- **Network Issues**: Retries failed requests with exponential backoff
- **Transaction Failures**: Logs detailed error information with retry logic
- **Invalid Addresses**: Validates wallet addresses before operations
- **Null Balance Handling**: Gracefully handles failed balance queries

## Troubleshooting

### Common Issues

1. **"Connection refused"**: Check your internet connection and RPC URL
2. **"Contract not deployed"**: Verify contract addresses or test alternatives
3. **"Invalid seed phrase"**: Verify your seed phrase is correct and complete
4. **"Transaction failed"**: Check Polygon network status and gas prices
5. **Dependencies missing**: Run `npm install` in the backend directory

### Getting Help

- Check the log file for detailed error messages
- Use the POL contract tester: `node backend/test_pol_contract.js`
- Verify your seed phrase is correct
- Check Polygon network status
- Try alternative RPC endpoints

## Development

### Project Structure

```
hd_wallet_manager/
├── run.js                     # Main launcher script
├── setup_env.js              # Environment setup script
├── README.md                 # This file
├── backend/
│   ├── package.json          # Node.js dependencies
│   ├── hd_wallet_manager.js  # Main application
│   ├── web_ui.js            # Web interface (Express.js)
│   ├── run_web_ui.js        # Web UI launcher
│   ├── test_pol_contract.js # Contract testing utility
│   ├── env.config           # Environment configuration
│   └── SETUP.md             # Setup instructions
└── frontend/
    └── templates/
        └── index.html       # Web UI template
```

### Dependencies

- `web3`: Ethereum/Web3 interaction for blockchain operations
- `bip39`: Mnemonic phrase generation and validation
- `hdkey`: HD wallet key derivation
- `express`: Web framework for REST API
- `socket.io`: Real-time communication for web UI
- `exceljs`: Excel file generation and manipulation
- `winston`: Logging framework
- `dotenv`: Environment variable management
- `cors`: Cross-origin resource sharing

### NPM Scripts

```bash
# Install dependencies
npm install

# Start web UI server
npm start

# Run CLI wallet manager
npm run wallet

# Test POL contract addresses
npm test

# Development with auto-restart
npm run dev
```

## API Endpoints

The web UI exposes these REST API endpoints:

- `GET /` - Serve main HTML page
- `GET /health` - Health check endpoint
- `POST /api/init` - Initialize wallet manager
- `POST /api/generate-wallets` - Generate HD wallets
- `POST /api/check-balances` - Check token balances
- `GET /api/get-totals` - Get balance totals
- `POST /api/consolidate-usdt` - Consolidate USDT transfers
- `POST /api/save-logs` - Save logs to Excel
- `GET /api/wallets` - Get current wallets (debug)
- `POST /api/test` - Test endpoint (debug)

## WebSocket Events

Real-time communication via Socket.IO:

- `connected` - Client connection established
- `progress` - Progress updates with percentage and message
- `ping/pong` - Connection heartbeat

## License

This project is for educational and personal use. Use at your own risk.

## Disclaimer

This software is provided "as is" without warranty. Cryptocurrency transactions involve risk. Always verify transactions and test with small amounts first. The authors are not responsible for any financial losses. 