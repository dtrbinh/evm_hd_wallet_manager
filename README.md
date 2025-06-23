# EVM HD Wallet Manager

[![Live Demo](https://img.shields.io/badge/Live%20Demo-dtrbinh.github.io-blue?style=for-the-badge&logo=github)](https://dtrbinh.github.io/evm_hd_wallet_manager/)
[![GitHub](https://img.shields.io/badge/GitHub-dtrbinh%2Fevm__hd__wallet__manager-black?style=for-the-badge&logo=github)](https://github.com/dtrbinh/evm_hd_wallet_manager)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> **Professional Multi-Chain Cryptocurrency Wallet Manager**  
> Supporting 1000+ EVM-compatible blockchain networks with advanced HD wallet generation, multi-transaction capabilities, and comprehensive network management.

## 🚀 **Live Application**

**🌐 [https://dtrbinh.github.io/evm_hd_wallet_manager/](https://dtrbinh.github.io/evm_hd_wallet_manager/)**

*No installation required - runs entirely in your browser!*

---

## ✨ **Key Features**

### 🔗 **Multi-Chain Support**
- **1000+ EVM Networks**: Comprehensive support via [chainlist.org](https://chainlist.org) integration
- **Popular Networks**: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, and many more
- **Live Network Switching**: Switch between networks without page reload
- **Auto RPC Optimization**: Intelligent RPC endpoint selection and fallback handling

### 💼 **HD Wallet Management**
- **Seed Phrase Import**: Support for 12-24 word mnemonic phrases
- **Custom Derivation Paths**: Standard Ethereum paths with customizable ranges
- **Batch Generation**: Generate up to 100 wallets per session
- **Real-time Balance Checking**: Progressive balance updates with visual feedback

### 🔄 **Advanced MultiTransceiver**
- **Multi-Send (1 → Many)**: Send tokens from one wallet to multiple recipients
- **Multi-Receive (Many → 1)**: Collect tokens from multiple wallets to one destination
- **Real-time Progress Tracking**: Full-screen progress dialog with live updates
- **Gas Estimation**: Comprehensive gas fee calculation and optimization
- **Transaction History**: Complete transaction logging with network metadata

### 🎨 **Modern User Interface**
- **Glass-morphism Design**: Beautiful translucent UI with modern aesthetics
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Interactive Tables**: Resizable columns with drag-to-resize functionality
- **Progressive Web App**: PWA capabilities for app-like experience

---

## 🎯 **Quick Start**

### **1. Access the Application**
Visit: **[https://dtrbinh.github.io/evm_hd_wallet_manager/](https://dtrbinh.github.io/evm_hd_wallet_manager/)**

### **2. Network Selection**
- Search from 1000+ EVM-compatible networks
- Use quick access buttons for popular networks
- Toggle testnet inclusion as needed

### **3. Wallet Setup**
- Enter your 12-24 word seed phrase
- Set derivation path range (default: 0-9)
- Click "Initialize" to connect

### **4. Wallet Operations**
1. **Generate Wallets** - Create HD wallets from seed phrase
2. **Check Balances** - Get real-time native and token balances
3. **MultiTransceiver** - Execute batch transactions
4. **Export Data** - Download wallet data and transaction history

---

## 🔧 **Technical Specifications**

### **Architecture**
```
📁 Project Structure
├── 🌐 index.html              # Main application (SEO optimized)
├── 📋 README.md               # Project documentation
├── 🤖 robots.txt              # Search engine crawling rules
├── 🗺️ sitemap.xml             # Site structure for SEO
├── 📡 feed.xml                # RSS feed for updates
├── 🎨 styles/
│   └── main.css               # Modern glass-morphism design
├── ⚙️ scripts/
│   ├── constants.js           # Network configurations & utilities
│   ├── network-manager.js     # Chainlist.org integration
│   ├── wallet-manager.js      # HD wallet management
│   ├── multi-transceiver.js   # Batch transaction handling
│   ├── ui-controller.js       # Advanced UI management
│   └── main.js                # Application orchestration
└── 📦 static/
    ├── 🎯 icons/              # PWA icons and favicons
    └── 🖼️ assets/             # Additional static resources
```

### **Dependencies (CDN)**
- **Web3.js 4.2.0** - Blockchain interactions and smart contracts
- **Ethers.js 6.14.4** - HD wallet generation and cryptographic utilities
- **Bootstrap 5.1.3** - Responsive UI framework
- **Font Awesome 6.0** - Professional icon library
- **SheetJS** - Excel export functionality

### **Browser Compatibility**
- ✅ **Chrome/Edge** - Full support with all features
- ✅ **Firefox** - Full support with all features  
- ✅ **Safari** - Full support (iOS 14.5+ for mobile)

---

## 🌐 **Network Support**

### **Featured Networks**
| Network | Chain ID | Type | Status |
|---------|----------|------|--------|
| Ethereum Mainnet | 1 | Mainnet | ✅ Active |
| Polygon | 137 | Mainnet | ✅ Active |
| Binance Smart Chain | 56 | Mainnet | ✅ Active |
| Arbitrum One | 42161 | L2 | ✅ Active |
| Optimism | 10 | L2 | ✅ Active |
| Base | 8453 | L2 | ✅ Active |
| **+1000 more networks** | Various | All Types | ✅ Active |

### **Network Features**
- 🔍 **Advanced Search** - Search by name, chain ID, or network type
- 🏷️ **Network Icons** - Visual network identification with blockchain logos
- 🔄 **Live Switching** - Change networks without losing wallet state
- 🧪 **Testnet Support** - Toggle between mainnet and testnet environments
- ⚡ **Quick Access** - One-click access to popular networks

---

## 💡 **Usage Examples**

### **Example: Multi-Send Transaction**
```javascript
// Scenario: Send 0.01 ETH from 1 wallet to 5 recipients
1. Select Ethereum Mainnet
2. Generate wallets (0-5 range)
3. Choose Multi-Send mode
4. Select sender wallet with sufficient balance
5. Select 5 receiver wallets
6. Set amount: 0.01 ETH per recipient
7. Calculate gas fees
8. Execute transaction with real-time tracking
```

### **Example: Multi-Receive Collection**
```javascript
// Scenario: Collect tokens from multiple wallets to main wallet
1. Select desired network (e.g., Polygon)
2. Choose Multi-Receive mode
3. Select main wallet as receiver
4. Select multiple sender wallets
5. Set collection amount per wallet
6. Execute batch collection with progress tracking
```

---

## 🔒 **Security & Best Practices**

### **Security Features**
- 🔐 **Client-Side Only** - Private keys never leave your browser
- 🚫 **No Data Transmission** - All operations performed locally
- 🛡️ **Memory-Only Storage** - Private keys stored only in memory
- 🔍 **Transaction Verification** - Always verify transaction details before execution

### **⚠️ Important Security Warnings**
- Never share your seed phrase with anyone
- Always use testnet for learning and experimentation
- Verify transaction details before execution
- Use hardware wallets for large amounts
- Keep your seed phrase backed up securely

### **🧪 Testing Seed Phrase**
For testing purposes only:
```
detail tumble lawsuit health feature trap security invest cart veteran lawn purse
```
**⚠️ WARNING**: This is a public seed phrase. Never use for real funds!

---

## 🚀 **Advanced Features**

### **MultiTransceiver Capabilities**
- **Batch Processing** - Handle multiple transactions efficiently
- **Gas Optimization** - Intelligent gas price calculation
- **Progress Tracking** - Real-time transaction status updates
- **Error Handling** - Comprehensive error recovery and reporting
- **Transaction History** - Complete audit trail with network metadata

### **User Experience Enhancements**
- **Glass-morphism UI** - Modern translucent design elements
- **Responsive Design** - Seamless experience across all devices
- **Progressive Loading** - Non-blocking UI updates
- **Toast Notifications** - Non-intrusive user feedback
- **Keyboard Navigation** - Full accessibility support

### **Data Management**
- **Excel Export** - Comprehensive wallet and transaction data export
- **Resizable Tables** - Customizable column widths
- **Real-time Updates** - Live balance and status updates
- **Search & Filter** - Advanced data filtering capabilities

---

## 🛠️ **Development & Deployment**

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/dtrbinh/evm_hd_wallet_manager.git

# Navigate to project directory
cd evm_hd_wallet_manager

# Open in browser (no build process required)
open index.html
```

### **Deployment**
The application is automatically deployed via GitHub Pages:
- **Production URL**: https://dtrbinh.github.io/evm_hd_wallet_manager/
- **Auto-deployment**: Every push to main branch
- **CDN Optimization**: Static assets served via GitHub's CDN

---

## 📊 **SEO & Performance**

### **SEO Optimizations**
- ✅ **Meta Tags** - Comprehensive SEO meta information
- ✅ **Open Graph** - Optimized social media sharing
- ✅ **Structured Data** - Rich snippets for search engines
- ✅ **Sitemap** - Complete site structure mapping
- ✅ **RSS Feed** - Content syndication for updates

### **Performance Features**
- ⚡ **Fast Loading** - Optimized assets and CDN delivery
- 📱 **Mobile Optimized** - Progressive Web App capabilities
- 🔄 **Caching** - Intelligent browser caching strategies
- 🗜️ **Compression** - Gzip compression for faster delivery

---

## 🐛 **Troubleshooting**

### **Common Issues**

<details>
<summary><strong>Invalid Seed Phrase Error</strong></summary>

- Ensure exactly 12, 15, 18, 21, or 24 words
- Check for typos and extra spaces
- Use standard BIP39 word list
- Verify seed phrase format
</details>

<details>
<summary><strong>Network Connection Failed</strong></summary>

- Check internet connection
- Try switching to different network
- Use custom RPC URL if default fails
- Clear browser cache and cookies
</details>

<details>
<summary><strong>Transaction Failures</strong></summary>

- Verify sufficient balance for amount + gas fees
- Check network congestion (increase gas price)
- Ensure no nonce conflicts (wait and retry)
- Verify recipient addresses are valid
</details>

<details>
<summary><strong>Balance Check Errors</strong></summary>

- Network connectivity issues
- RPC rate limiting (wait and retry)
- Invalid token contract addresses
- Try alternative RPC endpoints
</details>

### **Debug Information**
Open browser console (F12) for detailed error messages and debugging information.

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 **Author**

**dtrbinh**
- 🌐 **Live Demo**: [dtrbinh.github.io/evm_hd_wallet_manager](https://dtrbinh.github.io/evm_hd_wallet_manager/)
- 📧 **GitHub**: [@dtrbinh](https://github.com/dtrbinh)
- 🐦 **Twitter**: [@dtrbinh](https://twitter.com/dtrbinh)

---

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⭐ **Show Your Support**

If this project helped you, please consider giving it a ⭐ on [GitHub](https://github.com/dtrbinh/evm_hd_wallet_manager)!

---

## 📈 **Project Stats**

![GitHub Stars](https://img.shields.io/github/stars/dtrbinh/evm_hd_wallet_manager?style=social)
![GitHub Forks](https://img.shields.io/github/forks/dtrbinh/evm_hd_wallet_manager?style=social)
![GitHub Issues](https://img.shields.io/github/issues/dtrbinh/evm_hd_wallet_manager)
![GitHub Last Commit](https://img.shields.io/github/last-commit/dtrbinh/evm_hd_wallet_manager)

---

<div align="center">

**Built with ❤️ by [dtrbinh](https://github.com/dtrbinh)**

*Professional Multi-Chain Cryptocurrency Wallet Manager*

[🌐 **Try it now**](https://dtrbinh.github.io/evm_hd_wallet_manager/) • [📚 **Documentation**](README.md) • [🐛 **Report Bug**](https://github.com/dtrbinh/evm_hd_wallet_manager/issues) • [💡 **Request Feature**](https://github.com/dtrbinh/evm_hd_wallet_manager/issues)

</div> 