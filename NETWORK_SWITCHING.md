# Network Switching Guide

The faucet farmer now supports both **Westend** and **Paseo** testnets.

## How to Switch Networks

**Open `faucet-farmer.js` and change line 25:**

```javascript
const SELECTED_NETWORK = "WESTEND";  // Change to "PASEO" for Paseo testnet
```

## Network Configurations

### Westend (Default)
- **Token**: WND
- **RPC**: wss://westend-rpc.polkadot.io
- **Faucet**: https://faucet.polkadot.io/westend
- **Amount per request**: 10 WND
- **Transfer amount**: 9.9 WND
- **Target address**: 5CP6sXkp61pVFkKLwAupxyGvZ8bfAAXYDfhoDkNXDGtNcBfR
- **SS58 Prefix**: 42

### Paseo
- **Token**: PAS
- **RPC**: wss://paseo-rpc.dwellir.com
- **Faucet**: https://faucet.polkadot.io/paseo
- **Amount per request**: 5000 PAS
- **Transfer amount**: 4990 PAS
- **Target address**: 1KQ1s1swo5xhHKrtoxq7875QkbJrU5gJASHP3MsmMutnXaw
- **SS58 Prefix**: 0

## What Changes Automatically

When you switch networks, the following automatically adjust:
- ✅ RPC endpoint
- ✅ Token symbol (WND/PAS) in all output
- ✅ Token decimals (12 for Westend, 10 for Paseo)
- ✅ Address format (SS58 prefix)
- ✅ Faucet URL
- ✅ Faucet amount
- ✅ Transfer amount
- ✅ Target address
- ✅ Account file names (`faucet-accounts-westend.json` / `faucet-accounts-paseo.json`)
- ✅ Address file names (`faucet-addresses-westend.txt` / `faucet-addresses-paseo.txt`)

## Example Usage

### For Westend:
```bash
# Set SELECTED_NETWORK = "WESTEND" in faucet-farmer.js
npm run export-addresses
# Request 10 WND from https://faucet.polkadot.io/westend for each address
npm run check-balances
npm run transfer-all
# Result: ~495 WND consolidated to target
```

### For Paseo:
```bash
# Set SELECTED_NETWORK = "PASEO" in faucet-farmer.js
npm run export-addresses
# Request 5000 PAS from https://faucet.polkadot.io/paseo for each address
npm run check-balances
npm run transfer-all
# Result: ~249,500 PAS consolidated to target (50 accounts × 4990 PAS)
```

## Important Notes

1. **Each network maintains separate account files** - switching networks creates new accounts
2. **You can run both networks simultaneously** by keeping separate account files
3. **All console output adapts** to show the correct network name and token symbol
4. **Only one line needs to change** (line 25) to switch everything
