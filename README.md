# HD Wallet Manager - Standalone Frontend Application

A complete standalone frontend application for managing HD wallets on the Polygon network with advanced MultiTransceiver capabilities.

## 🚀 Features

- **🌐 Pure Frontend**: No backend server required - runs entirely in your browser
- **🔐 HD Wallet Generation**: Generate wallets from seed phrase with custom derivation paths
- **💰 Balance Checking**: Check Native POL and USDT balances in real-time
- **🔄 MultiTransceiver System**: 
  - **Multi-Send**: Send tokens from 1 wallet to multiple wallets
  - **Multi-Receive**: Collect tokens from multiple wallets to 1 wallet
  - **Gas Estimation**: Calculate transaction costs before execution
  - **Transaction History**: Track all transactions with detailed logs
- **📊 Excel Export**: Export wallet data and transaction history
- **🎨 Modern UI**: Beautiful Bootstrap 5 interface with smooth animations

## 📁 Project Structure

```
hd_wallet_manager/
├── frontend/
│   ├── index.html              # Main application file
│   ├── README.md               # Frontend-specific documentation
│   ├── styles/
│   │   └── main.css            # Custom styling with gradients
│   ├── scripts/
│   │   ├── wallet-manager.js   # Core HD wallet management
│   │   ├── multi-transceiver.js # Multi-transaction handling
│   │   ├── ui-controller.js    # UI management and interactions
│   │   └── main.js             # Application initialization
│   └── static/                 # Static assets (future use)
└── README.md                   # This file
```

## 🎯 Quick Start

1. **📂 Open Application**
   ```bash
   # Simply open the HTML file in your browser
   open frontend/index.html
   # or double-click the file
   ```

2. **🔑 Initialize Wallet Manager**
   - Enter your 12-24 word seed phrase
   - Optionally specify custom RPC URL
   - Click "Initialize"

3. **💼 Generate Wallets**
   - Set derivation path range (default: 0-9 for 10 wallets)
   - Click "1. Generate Wallets"

4. **💳 Check Balances**
   - Click "2. Check Balances"
   - View Native POL and USDT balances

5. **🔄 Use MultiTransceiver**
   - Click "3. MultiTransceiver"
   - Choose Multi-Send or Multi-Receive mode
   - Execute multi-wallet transactions

6. **📥 Export Data**
   - Click "4. Save to Excel"
   - Download comprehensive reports

## 🛠 Technology Stack

### Frontend Dependencies (CDN)
- **Web3.js 4.2.0**: Ethereum/Polygon blockchain interactions
- **BIP39**: Mnemonic phrase validation and seed generation
- **HDKey**: Hierarchical deterministic wallet derivation
- **Bootstrap 5.1.3**: Responsive UI framework
- **Font Awesome 6.0**: Beautiful icons
- **SheetJS**: Excel file generation

### Blockchain Integration
- **Polygon Network**: Native POL and USDT token support
- **HD Wallets**: BIP44 derivation paths (`m/44'/60'/0'/0/{index}`)
- **Gas Optimization**: Smart gas estimation with 20% buffer

## 🔒 Security Features

- **🔐 Client-Side Only**: Private keys never leave your browser
- **🛡️ Memory-Only Storage**: No persistent storage of sensitive data
- **✅ Transaction Validation**: Comprehensive validation before execution
- **🔍 Balance Verification**: Real-time balance checks before transactions

## 📱 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full Support | Recommended |
| Edge | ✅ Full Support | Recommended |
| Firefox | ✅ Full Support | All features work |
| Safari | ✅ Full Support | iOS 14.5+ required |

## 🎮 Usage Guide

### MultiTransceiver Modes

#### 🔄 Multi-Send (1 → Many)
Perfect for:
- Distributing tokens to multiple wallets
- Airdrops and batch payments
- Splitting funds across wallets

**Process:**
1. Select sender wallet
2. Choose multiple receiver wallets
3. Set amount per receiver
4. Calculate gas fees
5. Execute transaction

#### 🔄 Multi-Receive (Many → 1)
Perfect for:
- Consolidating funds from multiple wallets
- Collecting tokens into main wallet
- Centralizing assets

**Process:**
1. Select receiver wallet
2. Choose multiple sender wallets
3. Set amount per sender
4. Calculate gas fees
5. Execute transaction

### Supported Tokens

| Token | Type | Contract Address |
|-------|------|------------------|
| POL | Native | Native Polygon token |
| USDT | ERC20 | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |

### Derivation Path Configuration

- **Standard Path**: `m/44'/60'/0'/0/{index}`
- **Index Range**: 0-999 (maximum 100 wallets per session)
- **Custom Ranges**: Support for any start/end index combination

## 🚨 Important Security Warnings

⚠️ **Critical Security Notes:**
- Never share your seed phrase with anyone
- Ensure you're using a secure, private browser environment
- Always verify transaction details before execution
- Keep your seed phrase backed up securely offline
- This tool is for educational and personal use

## 🛠 Troubleshooting

### Common Issues

1. **Invalid Seed Phrase**
   - Ensure 12, 15, 18, 21, or 24 words
   - Check for spelling errors
   - Verify word list compatibility

2. **Connection Failed**
   - Check internet connectivity
   - Try different RPC URL
   - Verify network isn't blocked

3. **Balance Check Failed**
   - Network congestion
   - RPC rate limiting
   - Invalid wallet addresses

4. **Transaction Failed**
   - Insufficient balance for amount + gas
   - Network congestion
   - Invalid recipient addresses

### Debug Information
- Open browser console (F12) for detailed error logs
- Check network tab for failed requests
- Verify wallet addresses are valid

## 📈 Future Enhancements

- [ ] Support for additional ERC20 tokens
- [ ] Multi-network support (Ethereum, BSC, etc.)
- [ ] Advanced transaction scheduling
- [ ] Portfolio tracking and analytics
- [ ] Mobile-responsive improvements
- [ ] Offline mode capabilities

## 📄 License

This project is for educational and personal use. Use at your own risk and responsibility.

## 🤝 Contributing

This is a standalone frontend application. To contribute:
1. Fork the repository
2. Make your changes in the `frontend/` directory
3. Test thoroughly in multiple browsers
4. Submit a pull request

## 📞 Support

For issues or questions:
1. Check the browser console for error messages
2. Review the troubleshooting section
3. Verify your browser compatibility
4. Ensure your seed phrase is valid

---

**⚡ Ready to manage your HD wallets? Open `frontend/index.html` and get started!** 