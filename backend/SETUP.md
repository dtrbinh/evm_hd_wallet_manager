# HD Wallet Manager Environment Setup

This guide explains how to configure environment variables for the HD Wallet Manager project.

## Quick Setup

1. **Rename the configuration file**:
   ```bash
   mv env.config .env
   ```

2. **Edit the `.env` file** with your preferred settings:
   ```bash
   nano .env
   ```

## Environment Variables

### Required Configuration

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `MATIC_RPC_URL` | Polygon RPC endpoint | `https://polygon-rpc.com` |
| `USDT_CONTRACT_ADDRESS` | USDT token contract address | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| `POL_CONTRACT_ADDRESS` | POL token contract address | `0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6` |

### Optional Configuration

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | `INFO` |
| `TRANSACTION_TIMEOUT` | Transaction timeout in seconds | `300` |
| `GAS_PRICE_MULTIPLIER` | Gas price multiplier for faster transactions | `1.1` |
| `WEB_UI_HOST` | Web UI host address | `0.0.0.0` |
| `WEB_UI_PORT` | Web UI port number | `5001` |
| `WEB_UI_DEBUG` | Enable Flask debug mode | `False` |
| `SECRET_KEY` | Flask secret key for sessions | `hd-wallet-manager-secret-key-2024` |
| `DEFAULT_GAS_LIMIT` | Default gas limit for transactions | `65000` |
| `GAS_BUFFER` | Extra MATIC buffer for gas calculations | `0.001` |

## RPC Endpoints

### Free Public RPCs
- `https://polygon-rpc.com` (Default)
- `https://rpc-mainnet.maticvigil.com`
- `https://rpc.ankr.com/polygon`

### Paid Services (Recommended for Production)
- **Infura**: `https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY`
- **Alchemy**: `https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY`
- **QuickNode**: `https://your-endpoint.polygon-mainnet.quiknode.pro/`

## Token Addresses

### Verified Contract Addresses on Polygon
- **USDT (Tether)**: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- **POL (Polygon)**: `0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6`

> ⚠️ **Important**: Always verify contract addresses before use. These addresses are for Polygon Mainnet only.

## Security Notes

1. **Never commit `.env` files** to version control
2. **Change the default SECRET_KEY** in production
3. **Use private RPC endpoints** for production applications
4. **Keep your seed phrases secure** and never store them in environment files

## Example Configuration

```env
# Production Configuration Example
MATIC_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
USDT_CONTRACT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
POL_CONTRACT_ADDRESS=0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6

LOG_LEVEL=INFO
TRANSACTION_TIMEOUT=300
GAS_PRICE_MULTIPLIER=1.2

WEB_UI_HOST=127.0.0.1
WEB_UI_PORT=5000
WEB_UI_DEBUG=False
SECRET_KEY=your-secure-secret-key-here

DEFAULT_GAS_LIMIT=70000
GAS_BUFFER=0.002
```

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**:
   - Try alternative RPC endpoints
   - Check your internet connection
   - Verify API keys for paid services

2. **POL Contract Errors** (Could not transact with/call contract function):
   - Run the contract tester: `cd backend && python test_pol_contract.py`
   - Try alternative POL addresses:
     - WMATIC: `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270`
     - Alternative POL: `0x6ad0a8D30BE8B3Af20CCC84Ca90FC87e1E4B20A6`
   - Check if your RPC endpoint is fully synced
   - Verify you're connected to Polygon mainnet (Chain ID: 137)

3. **Gas Estimation Errors**:
   - Increase `GAS_PRICE_MULTIPLIER`
   - Adjust `DEFAULT_GAS_LIMIT`
   - Increase `GAS_BUFFER`

4. **Web UI Not Starting**:
   - Check if port is available
   - Verify `WEB_UI_HOST` and `WEB_UI_PORT` settings
   - Try different port numbers

### Verification Commands

```bash
# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://polygon-rpc.com

# Expected response for Polygon: {"jsonrpc":"2.0","id":1,"result":"0x89"}

# Test POL contract addresses
cd backend && python test_pol_contract.py

# Create .env file from template
cd backend && cp env.config .env
```

## Next Steps

After configuring your environment:

1. Run the application: `python run.py`
2. Choose Web UI or CLI interface
3. Enter your seed phrase (never store it in files)
4. Monitor the logs for any configuration issues 