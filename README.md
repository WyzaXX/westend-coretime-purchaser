# Westend Coretime Purchaser

A command-line tool for purchasing coretime on the Westend Coretime Chain using Polkadot API.

## Features

- ✅ **Complete Coretime Purchase Flow** - From funding to region purchase
- ✅ **Cross-Chain Bridging** - Automatic WND transfers from Asset Hub/Relay to Coretime
- ✅ **Real-time Pricing** - Shows current coretime prices with leadin calculations
- ✅ **Sale Validation** - Checks availability, timing, and price limits
- ✅ **Region Management** - Check your purchased coretime regions
- ✅ **Derivation Path Support** - Use derived accounts (//0, //1, //Alice, etc.)
- ✅ **Dry Run Mode** - Test purchases without real transactions
- ✅ **Skip Bridge Option** - Use when you already have funds on Coretime chain

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd westend-coretime-purchaser

# Install dependencies
npm install
```

## Usage

### Basic Purchase

```bash
# Purchase coretime with 1.5 WND limit
node coretime-purchaser.js "your twelve word mnemonic phrase here" 1.5

# With derivation path
node coretime-purchaser.js "your mnemonic" 1.5 //0

# Dry run (no real transactions)
node coretime-purchaser.js "your mnemonic" 1.5 --dry-run
```

### Advanced Options

```bash
# Skip bridging (when you already have WND on Coretime chain)
node coretime-purchaser.js "your mnemonic" 1.5 --skip-bridge

# Check your purchased regions
node coretime-purchaser.js "your mnemonic" --check-regions

# Check regions for derived account
node coretime-purchaser.js "your mnemonic" --check-regions //0

# Combine options
node coretime-purchaser.js "your mnemonic" 1.5 //0 --skip-bridge --dry-run
```

## Command Line Options

| Option            | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `--dry-run`       | Simulate the purchase without real transactions                       |
| `--skip-bridge`   | Skip bridging funds (use when you already have WND on Coretime chain) |
| `--check-regions` | Only check your coretime regions (no purchase)                        |

## Derivation Paths

The tool supports standard Substrate derivation paths:

- `//0`, `//1`, `//2` - Numbered accounts
- `//Alice`, `//Bob` - Named accounts
- `//stash`, `//controller` - Role-based accounts
- `//0///password` - Hard derivation with password

Each derivation path creates a completely different account with its own address and balances.

## Examples

### 1. First Time Purchase

```bash
# Test first with dry run
node coretime-purchaser.js "word1 word2 ... word12" 1.5 --dry-run

# Real purchase (will auto-bridge funds if needed)
node coretime-purchaser.js "word1 word2 ... word12" 1.5
```

### 2. When You Already Have Funds

```bash
# Skip bridging if you already have 50 WND on Coretime chain
node coretime-purchaser.js "word1 word2 ... word12" 1.5 --skip-bridge
```

### 3. Check Your Regions

```bash
# See what coretime you own
node coretime-purchaser.js "word1 word2 ... word12" --check-regions
```

## What You'll See

### Successful Purchase

```
🚀 Initializing Westend Coretime Purchaser...
🔑 Loading wallet from mnemonic...
📋 Account: 5EUL22FHLsvQTFmhN7C8tVwj2ZRNVL6iQvS2pG95A9kvvGbe
✅ Connected to all three chains

💰 Checking WND balance on Asset Hub...
   Free Balance: 5.0000 WND

📊 Fetching Sale Information...
   Cores Available: 2/9
   Current price: 0.0500 WND
✅ Ready to purchase! Current price: 0.0500 WND

🛒 Attempting to purchase coretime...
🎉 Purchase successful!
```

### Region Check

```
🔍 Checking your coretime regions...
   📦 Found 1 region(s):

   Region 1:
      Begin: 339902
      Core: 5
      Mask: 0xffffffffffffffffffffffffffffffffffff
      Paid: 0.0500 WND
```

## How It Works

1. **Initialization** - Sets up wallet and connects to Westend chains
2. **Balance Check** - Verifies you have sufficient WND
3. **Bridging** - Transfers WND to Coretime chain if needed
4. **Sale Validation** - Checks current sale status and pricing
5. **Purchase** - Executes the coretime purchase via Broker pallet
6. **Confirmation** - Shows purchase success and region details

## Supported Chains

- **Westend Relay Chain** - For cross-chain transfers
- **Westend Asset Hub** - Primary source of WND tokens
- **Westend Coretime Chain** - Where coretime is purchased

## Error Handling

The tool provides detailed error messages for common issues:

- `TooEarly` - Sale hasn't started yet (still in interlude phase)
- `SoldOut` - All cores have been sold
- `Overpriced` - Current price exceeds your price limit
- `Unavailable` - No cores available for sale
- `NoSales` - No active sale period

## Requirements

- Node.js 18+
- WND tokens on Westend Asset Hub or Relay Chain
- Valid mnemonic seed phrase

## Security

- Never share your mnemonic phrase
- Use dry-run mode to test before real transactions
- The tool never stores or transmits your private keys
- All operations are performed locally

## Troubleshooting

### Common Issues

1. **"Invalid bip39 mnemonic"** - Check your mnemonic is exactly 12 words
2. **"Insufficient balance"** - Fund your account on Asset Hub or Relay Chain
3. **"No active sale"** - Wait for next coretime sale period
4. **"Connection timeout"** - Check internet connection and try again

### Getting Help

```bash
# Show usage help
node coretime-purchaser.js
```

---

## Faucet Farmer

The faucet farmer automates requesting WND from the Westend faucet across multiple accounts and consolidating the funds to a single target address.

### Features

- 🤖 **Account Management** - Manages 50 accounts with persistent storage
- 💰 **Fund Consolidation** - Transfers funds to a target address automatically
- 📊 **Balance Tracking** - Monitors all account balances in real-time
- 💾 **Persistent Storage** - Saves account information locally
- 📋 **Address Export** - Exports addresses for easy faucet requests

### Official Faucet Information

The [official Polkadot Westend faucet](https://faucet.polkadot.io/westend) provides:

- **10 WND per request** to Westend Relay Chain (website claims 100 but actual is 10)
- **24-hour rate limit** per account
- **Requires captcha** (manual process, no automation possible)

### Usage

```bash
# Show complete workflow and instructions
npm run farm-workflow
# or
node faucet-farmer.js workflow

# Export addresses for manual faucet requests
npm run export-addresses
# or
node faucet-farmer.js export

# Check balances of all accounts
npm run check-balances
# or
node faucet-farmer.js check

# Transfer funds from all accounts to target
npm run transfer-all
# or
node faucet-farmer.js transfer
```

### Configuration

Edit the `CONFIG` object in `faucet-farmer.js` to customize:

```javascript
const CONFIG = {
  WESTEND_RELAY_RPC: "wss://westend-rpc.polkadot.io",
  TARGET_ADDRESS: "5CP6sXkp61pVFkKLwAupxyGvZ8bfAAXYDfhoDkNXDGtNcBfR", // Change to your address
  NUM_ACCOUNTS: 50, // Number of accounts to farm with
  FAUCET_AMOUNT: 10, // Actual amount received (website says 100 but gives 10)
  TRANSFER_AMOUNT: 9.9, // Amount to transfer per account (WND)
  DELAY_BETWEEN_TRANSFERS: 3000, // 3 seconds between transfers
};
```

### How It Works

1. **Account Generation** - Creates 50 accounts with unique mnemonics (first run only)
2. **Address Export** - Exports addresses to a text file for easy copy-paste
3. **Manual Faucet Requests** - You visit https://faucet.polkadot.io/westend and request for each address (receives 10 WND, captcha required)
4. **Balance Check** - Verifies funds arrived in each account
5. **Fund Transfer** - Transfers 9.9 WND from each account to the target address
6. **Summary** - Shows success/failure counts and total amount transferred

### Account Storage

Accounts are stored in `faucet-accounts.json` with the following structure:

```json
{
  "accounts": [
    {
      "id": 1,
      "mnemonic": "word1 word2 ... word12",
      "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "balance": "10000000000000",
      "lastFaucetRequest": "2025-09-30T12:34:56.789Z"
    }
  ]
}
```

**⚠️ IMPORTANT:** Keep `faucet-accounts.json` secure as it contains account mnemonics!

### Expected Output

**Step 1: Export addresses**

```bash
$ npm run export-addresses

🚀 Initializing Westend Faucet Farmer...
✅ Connected to Westend Relay Chain

📋 Exporting addresses for manual faucet requests...
✅ Exported 50 addresses to faucet-addresses.txt

💡 Faucet Information:
   • URL: https://faucet.polkadot.io/westend
   • Amount per request: 10 WND (actual received)
   • Rate limit: Once every 24 hours per account
   • Requires: Captcha completion

🎯 First 5 addresses to start with:
   5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
   5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty
   ...
```

**Step 2: Check balances (after requesting faucet)**

```bash
$ npm run check-balances

💰 Checking balances for all accounts...

📊 Balance Summary:
   Accounts with funds: 48/50
   Total balance: 480.0000 WND
   Average per account: 9.6000 WND
```

**Step 3: Transfer to target**

```bash
$ npm run transfer-all

💸 Transferring funds from all accounts to target...
   Target: 5CP6sXkp61pVFkKLwAupxyGvZ8bfAAXYDfhoDkNXDGtNcBfR

   💸 Transferring 9.9 WND from Account 1...
      ✅ Transfer successful from Account 1
   ...

📊 Transfer Summary:
   ✅ Successful: 48
   ❌ Failed: 0
   💰 Total transferred: 475.2000 WND
```

### Timing

- **Manual Faucet Requests**: Variable (depends on how fast you complete captchas)
- **Balance Checks**: ~30 seconds
- **Transfers**: ~3 minutes for 50 accounts (3 seconds delay per transfer)
- **Total**: Depends on manual faucet request speed

### Limitations

- Manual process required due to captcha (no full automation possible)
- 24-hour rate limit per account (can only request once per day)
- Actual faucet amount is 10 WND despite website claiming 100 WND
- Transaction fees are ~0.1 WND per transfer (hence 9.9 WND instead of 10 WND)
- Existential deposit requirements mean not all funds can be transferred
- With 50 accounts, expect to receive ~495 WND total (50 × 9.9 WND)

### Troubleshooting

**Faucet requests failing:**

- Wait a few hours before retrying (faucet has rate limits)
- Check https://faucet.polkadot.io/ is accessible

**Transfers failing:**

- Ensure accounts have sufficient balance (>9.9 WND)
- Check network connectivity
- Wait for faucet transactions to finalize before transferring

---

## Contributing

This tool is designed for Westend testnet. For production use on Polkadot, update the RPC endpoints and chain configurations.

## License

MIT License - see LICENSE file for details.
