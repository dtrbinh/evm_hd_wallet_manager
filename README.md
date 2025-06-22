# Ethereum HD Wallet Manager - Standalone Frontend

A complete standalone frontend application for managing HD wallets on Ethereum-compatible networks (Polygon) with advanced MultiTransceiver capabilities and network switching.

## Features

- **Pure Frontend**: No backend server required - runs entirely in the browser
- **Ethereum Compatible**: Supports Ethereum-compatible networks with HD wallet generation
- **Network Switching**: Toggle between Polygon Mainnet and Amoy Testnet with live switching
- **HD Wallet Generation**: Generate wallets from seed phrase with custom derivation paths
- **Progressive Balance Checking**: Real-time balance updates with visual feedback
- **Advanced MultiTransceiver System**: 
  - Multi-Send: Send tokens from 1 wallet to multiple wallets
  - Multi-Receive: Collect tokens from multiple wallets to 1 wallet
  - Full-screen progress dialog with real-time transaction tracking
  - Gas estimation and comprehensive transaction history
- **Excel Export**: Export wallet data and transaction history with network metadata
- **Modern UI**: Beautiful glass-morphism design with animations and responsive layout
- **Resizable Tables**: Interactive table columns with drag-to-resize functionality

## Quick Start

1. **Open the application**: Simply open `index.html` in your web browser
2. **Select network**: Choose between Polygon Mainnet or Amoy Testnet
3. **Enter seed phrase**: Input your 12-24 word mnemonic
4. **Initialize**: Click "Initialize" to set up the wallet manager
5. **Generate wallets**: Use custom derivation path ranges
6. **Check balances**: Get current POL and USDT balances with progressive updates
7. **Use MultiTransceiver**: Execute multi-wallet transactions with real-time progress tracking

## Example Seed Phrase

For testing purposes, you can use this example seed phrase:

```
detail tumble lawsuit health feature trap security invest cart veteran lawn purse
```

⚠️ **Warning**: This is a publicly available seed phrase for testing only. Never use this for real funds or mainnet transactions. Always generate your own secure seed phrase for actual use.

## File Structure

```
ethereum_hd_wallet_manager/
├── index.html              # Main application file
├── README.md               # This documentation
├── styles/
│   └── main.css            # Custom styling with glass-morphism design
├── scripts/
│   ├── constants.js        # Centralized network configurations
│   ├── wallet-manager.js   # Core wallet management with network switching
│   ├── multi-transceiver.js # Multi-transaction handling with progress tracking
│   ├── ui-controller.js    # Advanced UI management with full-screen dialogs
│   └── main.js             # Application initialization and orchestration
└── static/                 # Static assets (if any)
```

## Dependencies

All dependencies are loaded via CDN:
- **Web3.js 4.2.0**: Blockchain interactions and smart contract calls
- **Ethers.js 6.14.4**: HD wallet generation and cryptographic utilities
- **Bootstrap 5.1.3**: Responsive UI framework
- **Font Awesome 6.0**: Professional icons
- **SheetJS**: Excel export functionality with network metadata

## Security Notes

⚠️ **Important Security Warnings**:
- Never share your seed phrase with anyone
- This application runs locally in your browser - ensure you're using a secure environment
- Private keys are handled in memory only and never transmitted over the network
- Always verify transaction details before execution
- Use testnet for testing and learning

## Browser Compatibility

- **Chrome/Edge**: Full support with all features
- **Firefox**: Full support with all features
- **Safari**: Full support (iOS 14.5+ for mobile)

## Network Support

### Supported Networks
- **Polygon Mainnet**: Production network (Chain ID: 137)
  - RPC: https://polygon-rpc.com
  - Explorer: https://polygonscan.com
  - USDT Contract: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F

- **Polygon Amoy Testnet**: Test network (Chain ID: 80002)
  - RPC: https://polygon-amoy-bor-rpc.publicnode.com
  - Explorer: https://amoy.polygonscan.com
  - USDT Contract: 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582

### Network Switching
- **Live Network Switching**: Switch between networks without reloading
- **Automatic Wallet Regeneration**: Wallets are regenerated for the new network
- **Transaction History Preservation**: Transaction history is maintained across network switches
- **Network-Aware Links**: Transaction hash links open the correct explorer

## Usage

### 1. Network Selection & Initialization
- Use the network toggle to select Mainnet or Testnet
- Enter your 12-24 word seed phrase
- Optionally specify custom RPC URL
- Click "Initialize" to connect to the selected network

### 2. Wallet Generation
- Set start/end index for derivation paths (default: 0-9, max: 100 wallets)
- Click "1. Generate Wallets"
- View generated wallet addresses and derivation paths

### 3. Progressive Balance Checking
- Click "2. Check Balances"
- Watch real-time balance updates with visual feedback
- View progressive totals and completion status
- See Native POL and USDT balances with error handling

### 4. Advanced MultiTransceiver
- Click "3. MultiTransceiver"
- Choose Multi-Send or Multi-Receive mode
- Select wallets using interactive checkboxes
- Configure transaction amount and token type
- Calculate comprehensive gas fees
- Execute with full-screen progress tracking

### 5. Data Export
- Click "4. Save to Excel"
- Download wallet data with network information
- Export transaction history with network metadata

## MultiTransceiver Features

### Multi-Send (1 → Many)
- Select one sender wallet with balance validation
- Choose multiple receiver wallets
- Set amount per receiver with automatic total calculation
- Real-time gas estimation and balance checking

### Multi-Receive (Many → 1)
- Select one receiver wallet
- Choose multiple sender wallets with balance validation
- Set amount per sender
- Controlled transaction execution with nonce management

### Progress Tracking
- **Full-Screen Progress Dialog**: Immersive transaction tracking
- **Real-Time Updates**: Live progress bar and transaction counter
- **Transaction Statistics**: Success/failed counts and gas usage
- **Detailed Logging**: Color-coded transaction logs with timestamps
- **Minimize/Restore**: Continue using the app while transactions run
- **Network-Aware**: Transaction history includes network information

## Advanced Features

### Table Management
- **Resizable Columns**: Drag column borders to adjust widths
- **Address Tooltips**: Hover to see full addresses
- **Progressive Updates**: Individual wallet rows update in real-time
- **Visual Feedback**: Color-coded states for loading, success, and errors

### User Experience
- **Glass-Morphism Design**: Modern translucent UI elements
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Toast Notifications**: Non-intrusive feedback messages
- **Loading States**: Full-screen loading with progress indicators
- **Error Handling**: Comprehensive error messages and recovery

## Configuration

### Supported Tokens
- **Native POL**: Polygon's native token (gas token)
- **USDT**: Tether USD with network-specific contract addresses

### Derivation Paths
- **Standard**: `m/44'/60'/0'/0/{index}` (Ethereum standard)
- **Custom Ranges**: 0-999 index range (max 100 wallets per session)
- **Path Display**: Visual derivation path information

## Troubleshooting

### Common Issues

1. **"Invalid seed phrase"**
   - Ensure exactly 12, 15, 18, 21, or 24 words
   - Check for typos and extra spaces
   - Use standard BIP39 word list

2. **"Network connection failed"**
   - Check internet connection
   - Try switching networks
   - Use custom RPC URL if default fails

3. **"Balance check errors"**
   - Network connectivity issues
   - RPC rate limiting (try again after a moment)
   - Invalid contract addresses

4. **"Transaction failures"**
   - Insufficient balance for amount + gas fees
   - Network congestion (increase gas price)
   - Nonce conflicts (wait and retry)

5. **"Progress dialog not updating"**
   - Check browser console for errors
   - Ensure JavaScript is enabled
   - Try refreshing the page

### Browser Console
Open browser console (F12) for detailed error messages and debugging information.

### Network Issues
- **Mainnet**: Use for production with real tokens
- **Testnet**: Use for testing with free test tokens
- **RPC Issues**: Try alternative RPC URLs if provided ones fail

## Development Notes

### Architecture
- **Modular Design**: Separate files for wallet management, UI, and transactions
- **Event-Driven**: Reactive UI updates based on transaction events
- **State Management**: Centralized state with proper cleanup
- **Error Boundaries**: Comprehensive error handling and user feedback

### Performance
- **Controlled Concurrency**: Batch processing to avoid RPC overload
- **Progressive Loading**: Non-blocking UI updates
- **Memory Management**: Proper cleanup of transaction states

## License

This project is for educational and personal use. Use at your own risk.

## Support

For issues or questions:
1. Check the browser console (F12) for detailed error messages
2. Verify network connectivity and RPC endpoints
3. Ensure you're using a supported browser
4. Try switching networks if issues persist 