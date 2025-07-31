# Usage Examples

## Quick Start

### 1. First Time Setup
```bash
# Install dependencies
npm install

# Test with dry run first
node coretime-purchaser.js "your mnemonic here" 1.5 --dry-run
```

### 2. Real Purchase
```bash
# Purchase with automatic bridging
node coretime-purchaser.js "your mnemonic here" 1.5

# Purchase with derivation path
node coretime-purchaser.js "your mnemonic here" 1.5 //0
```

### 3. When You Have Funds Already
```bash
# Skip bridging if you already have WND on Coretime chain
node coretime-purchaser.js "your mnemonic here" 1.5 --skip-bridge
```

### 4. Check Your Regions
```bash
# See what coretime you own
node coretime-purchaser.js "your mnemonic here" --check-regions

# Check specific derived account
node coretime-purchaser.js "your mnemonic here" --check-regions //0
```

## Advanced Usage

### Multiple Derivation Paths
```bash
# Base account
node coretime-purchaser.js "mnemonic" --check-regions

# First derived account  
node coretime-purchaser.js "mnemonic" --check-regions //0

# Second derived account
node coretime-purchaser.js "mnemonic" --check-regions //1

# Named account
node coretime-purchaser.js "mnemonic" --check-regions //Alice
```

### Testing Before Purchase
```bash
# Dry run to see current prices and availability
node coretime-purchaser.js "mnemonic" 2.0 --dry-run

# Output example:
# Current price: 0.0500 WND
# ✅ Ready to purchase! Current price: 0.0500 WND
# 🧪 [DRY-RUN] Would purchase coretime with limit: 2.0000 WND
```

### Batch Operations
```bash
# Check multiple accounts
node coretime-purchaser.js "mnemonic" --check-regions //0
node coretime-purchaser.js "mnemonic" --check-regions //1
node coretime-purchaser.js "mnemonic" --check-regions //2
```

## Expected Output

### Successful Purchase
```
🚀 Initializing Westend Coretime Purchaser...
🔑 Loading wallet from mnemonic...
📋 Account: 5EUL22FHLsvQTFmhN7C8tVwj2ZRNVL6iQvS2pG95A9kvvGbe
✅ Connected to all three chains

💰 Checking WND balance on Asset Hub...
   Free Balance: 5.0000 WND

📊 Fetching Sale Information...
   Sale Start: 27105750
   Current Block: 27120018
   Cores Available: 2/9
   Current price: 0.0500 WND

✅ Ready to purchase! Current price: 0.0500 WND
🛒 Attempting to purchase coretime with limit: 1.5000 WND
📤 Submitting Coretime Purchase...
   Status: Ready
   Status: InBlock
   Status: Finalized
✅ Transaction successful!
🎉 Purchase successful!
```

### Region Check Result
```
🔍 Checking your coretime regions...
   📦 Found 1 region(s):
   
   Region 1:
      Begin: 339902
      Core: 5 
      Mask: 0xffffffffffffffffffffffffffffffffffff
      Paid: 0.0500 WND

⚙️  Checking workplan assignments...
   📭 No workplan assignments found for your account
```

## Common Scenarios

### 1. Price Too High
```bash
node coretime-purchaser.js "mnemonic" 0.5 --dry-run
# Output: ⚠️ Current price (1.2000 WND) exceeds limit (0.5 WND)
# Solution: Wait for price to decrease or increase limit
```

### 2. Sale Not Active
```bash
node coretime-purchaser.js "mnemonic" 1.5 --dry-run
# Output: ⏳ Sale hasn't started yet (still in interlude phase)
# Output: 💡 Sale will start at block 27200000, current block is 27195000
```

### 3. Insufficient Funds
```bash
node coretime-purchaser.js "mnemonic" 5.0
# Output: ❌ Insufficient balance on Asset Hub
# Solution: Fund your account with WND tokens
```

## Tips

- Always use `--dry-run` first to check prices and availability
- Use `--skip-bridge` when you already have WND on Coretime chain
- Check your regions after purchase with `--check-regions`
- Use derivation paths to separate different use cases
- Monitor sale timing - prices decrease during leadin period