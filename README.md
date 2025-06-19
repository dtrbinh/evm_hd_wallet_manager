# HD Wallet Manager - Standalone Frontend

A complete standalone frontend application for managing HD wallets on the Polygon network with MultiTransceiver capabilities.

## Features

- **Pure Frontend**: No backend server required - runs entirely in the browser
- **HD Wallet Generation**: Generate wallets from seed phrase with custom derivation paths
- **Balance Checking**: Check Native POL and USDT balances
- **MultiTransceiver System**: 
  - Multi-Send: Send tokens from 1 wallet to multiple wallets
  - Multi-Receive: Collect tokens from multiple wallets to 1 wallet
  - Gas estimation and transaction history
- **Excel Export**: Export wallet data and transaction history
- **Modern UI**: Beautiful Bootstrap 5 interface with animations

## Quick Start

1. **Open the application**: Simply open `index.html` in your web browser
2. **Enter seed phrase**: Input your 12-24 word mnemonic
3. **Initialize**: Click "Initialize" to set up the wallet manager
4. **Generate wallets**: Use custom derivation path ranges
5. **Check balances**: Get current POL and USDT balances
6. **Use MultiTransceiver**: Execute multi-wallet transactions

## File Structure

```
hd_wallet_manager/
├── index.html              # Main application file
├── README.md               # This documentation
├── styles/
│   └── main.css            # Custom styling
├── scripts/
│   ├── wallet-manager.js   # Core wallet management
│   ├── multi-transceiver.js # Multi-transaction handling
│   ├── ui-controller.js    # UI management
│   └── main.js             # Application initialization
└── static/                 # Static assets (if any)
```

## Dependencies

All dependencies are loaded via CDN:
- **Web3.js 4.2.0**: Blockchain interactions
- **Ethers.js 6.14.4**: HD wallet generation and crypto utilities
- **Bootstrap 5.1.3**: UI framework
- **Font Awesome 6.0**: Icons
- **SheetJS**: Excel export functionality

## Security Notes

⚠️ **Important Security Warnings**:
- Never share your seed phrase
- This application runs in your browser - ensure you're using a secure environment
- Private keys are handled in memory only and never transmitted
- Always verify transactions before execution

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 14.5+)

## Usage

### 1. Initialization
- Enter your 12-24 word seed phrase
- Optionally specify custom RPC URL
- Click "Initialize"

### 2. Wallet Generation
- Set start/end index for derivation paths (default: 0-9)
- Click "1. Generate Wallets"
- View generated wallet addresses and paths

### 3. Balance Checking
- Click "2. Check Balances"
- View Native POL and USDT balances
- See totals summary

### 4. MultiTransceiver
- Click "3. MultiTransceiver"
- Choose Multi-Send or Multi-Receive mode
- Select wallets and configure transaction
- Calculate gas fees
- Execute transaction

### 5. Export Data
- Click "4. Save to Excel"
- Download wallet data and transaction history

## MultiTransceiver Modes

### Multi-Send (1 → Many)
- Select one sender wallet
- Choose multiple receiver wallets
- Set amount per receiver
- Total cost = (amount × receivers) + gas fees

### Multi-Receive (Many → 1)
- Select one receiver wallet
- Choose multiple sender wallets
- Set amount per sender
- Each sender sends the specified amount

## Configuration

### Supported Networks
- **Polygon Mainnet** (default)
- Custom RPC URLs supported

### Supported Tokens
- **Native POL**: Polygon's native token
- **USDT**: Tether USD (0xc2132D05D31c914a87C6611C10748AEb04B58e8F)

### Derivation Paths
- Standard: `m/44'/60'/0'/0/{index}`
- Custom ranges: 0-999 (max 100 wallets)

## Troubleshooting

### Common Issues

1. **"Invalid seed phrase"**
   - Ensure 12, 15, 18, 21, or 24 words
   - Check for typos

2. **"Connection failed"**
   - Check internet connection
   - Try default RPC or different RPC URL

3. **"Balance check failed"**
   - Network connectivity issues
   - RPC rate limiting

4. **"Transaction failed"**
   - Insufficient balance
   - Network congestion
   - Gas estimation issues

### Browser Console
Check browser console (F12) for detailed error messages.

## License

This project is for educational and personal use. Use at your own risk.

## Support

For issues or questions, check the browser console for detailed error messages. 