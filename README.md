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

| Option | Description |
|--------|-------------|
| `--dry-run` | Simulate the purchase without real transactions |
| `--skip-bridge` | Skip bridging funds (use when you already have WND on Coretime chain) |
| `--check-regions` | Only check your coretime regions (no purchase) |

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

## Contributing

This tool is designed for Westend testnet. For production use on Polkadot, update the RPC endpoints and chain configurations.

## License

MIT License - see LICENSE file for details.