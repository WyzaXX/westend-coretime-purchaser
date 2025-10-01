#!/usr/bin/env node

import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { wnd } from "@polkadot-api/descriptors";
import { getPolkadotSigner } from "polkadot-api/signer";
import {
  mnemonicGenerate,
  mnemonicToMiniSecret,
  sr25519PairFromSeed,
  cryptoWaitReady,
  encodeAddress,
} from "@polkadot/util-crypto";
import { Keyring } from "@polkadot/keyring";
import fs from "fs";
import path from "path";

// ╔══════════════════════════════════════════════════════════════════╗
// ║                    NETWORK SELECTION                             ║
// ║                                                                  ║
// ║  CHANGE THIS LINE TO SWITCH BETWEEN NETWORKS:                    ║
// ║  • "WESTEND" - 10 WND per request, transfer 9.9 WND              ║
// ║  • "PASEO"   - 5000 PAS per request, transfer 4990 PAS           ║
// ╚══════════════════════════════════════════════════════════════════╝
const SELECTED_NETWORK = "WESTEND";

// ========================================
// NETWORK CONFIGURATIONS
// ========================================
const NETWORKS = {
  WESTEND: {
    NAME: "Westend",
    RPC: "wss://westend-rpc.polkadot.io",
    TOKEN: "WND",
    DECIMALS: 12,
    SS58_PREFIX: 42,
    FAUCET_URL: "https://faucet.polkadot.io/westend",
    FAUCET_AMOUNT: 10,
    TRANSFER_AMOUNT: 9.9,
    CHAIN_DESCRIPTOR: "wnd",
  },
  PASEO: {
    NAME: "Paseo",
    RPC: "wss://paseo-rpc.dwellir.com",
    TOKEN: "PAS",
    DECIMALS: 10,
    SS58_PREFIX: 0,
    FAUCET_URL: "https://faucet.polkadot.io/paseo",
    FAUCET_AMOUNT: 5000,
    TRANSFER_AMOUNT: 4990,
    CHAIN_DESCRIPTOR: null,
  },
};

// ========================================
// ACTIVE CONFIGURATION
// ========================================
const NETWORK = NETWORKS[SELECTED_NETWORK];

const CONFIG = {
  NETWORK_NAME: NETWORK.NAME,
  RELAY_RPC: NETWORK.RPC,
  TOKEN_SYMBOL: NETWORK.TOKEN,
  TOKEN_DECIMALS: NETWORK.DECIMALS,
  SS58_PREFIX: NETWORK.SS58_PREFIX,
  FAUCET_URL: NETWORK.FAUCET_URL,
  FAUCET_AMOUNT: NETWORK.FAUCET_AMOUNT,
  CHAIN_DESCRIPTOR: NETWORK.CHAIN_DESCRIPTOR,
  TARGET_ADDRESS:
    SELECTED_NETWORK === "PASEO"
      ? "1KQ1s1swo5xhHKrtoxq7875QkbJrU5gJASHP3MsmMutnXaw"
      : "5CP6sXkp61pVFkKLwAupxyGvZ8bfAAXYDfhoDkNXDGtNcBfR",
  NUM_ACCOUNTS: 50,
  TRANSFER_AMOUNT: NETWORK.TRANSFER_AMOUNT,
  ACCOUNTS_FILE: `faucet-accounts-${NETWORK.NAME.toLowerCase()}.json`,
  ADDRESSES_FILE: `faucet-addresses-${NETWORK.NAME.toLowerCase()}.txt`,
  DELAY_BETWEEN_TRANSFERS: 3000,
};

class FaucetFarmer {
  constructor() {
    this.relayClient = null;
    this.relayApi = null;
    this.accounts = [];
  }

  async initialize() {
    console.log(`🚀 Initializing ${CONFIG.NETWORK_NAME} Faucet Farmer...`);
    await cryptoWaitReady();

    console.log(`🔌 Connecting to ${CONFIG.NETWORK_NAME} Relay Chain...`);
    this.relayClient = createClient(getWsProvider(CONFIG.RELAY_RPC));

    if (CONFIG.CHAIN_DESCRIPTOR) {
      this.relayApi = this.relayClient.getTypedApi(wnd);
    } else {
      this.relayApi = this.relayClient.getUntypedApi();
    }

    console.log(`✅ Connected to ${CONFIG.NETWORK_NAME} Relay Chain`);
  }

  async loadOrGenerateAccounts() {
    console.log(
      `\n📋 Loading or generating ${CONFIG.NUM_ACCOUNTS} accounts...`
    );

    if (fs.existsSync(CONFIG.ACCOUNTS_FILE)) {
      console.log(`   Loading accounts from ${CONFIG.ACCOUNTS_FILE}...`);
      const data = JSON.parse(fs.readFileSync(CONFIG.ACCOUNTS_FILE, "utf-8"));
      this.accounts = data.accounts;
      console.log(`   ✅ Loaded ${this.accounts.length} accounts`);
    } else {
      console.log(`   Generating ${CONFIG.NUM_ACCOUNTS} new accounts...`);
      for (let i = 0; i < CONFIG.NUM_ACCOUNTS; i++) {
        const mnemonic = mnemonicGenerate(12);
        const seed = mnemonicToMiniSecret(mnemonic);
        const keyPair = sr25519PairFromSeed(seed);
        const address = encodeAddress(keyPair.publicKey, CONFIG.SS58_PREFIX);

        this.accounts.push({
          id: i + 1,
          mnemonic,
          address,
          balance: 0,
          lastFaucetRequest: null,
        });

        if ((i + 1) % 10 === 0) {
          console.log(`   Generated ${i + 1}/${CONFIG.NUM_ACCOUNTS} accounts`);
        }
      }

      this.saveAccounts();
      console.log(`   ✅ Generated and saved ${this.accounts.length} accounts`);
    }

    console.log(`\n📊 Account Summary:`);
    this.accounts.slice(0, 3).forEach((acc) => {
      console.log(`   Account ${acc.id}: ${acc.address}`);
    });
    console.log(`   ... and ${this.accounts.length - 3} more accounts`);
  }

  saveAccounts() {
    fs.writeFileSync(
      CONFIG.ACCOUNTS_FILE,
      JSON.stringify(
        {
          network: CONFIG.NETWORK_NAME,
          accounts: this.accounts,
        },
        null,
        2
      )
    );
  }

  async checkBalance(address) {
    try {
      const account = await this.relayApi.query.System.Account.getValue(
        address
      );
      return account.data.free.toString();
    } catch (error) {
      console.log(`   ⚠️  Could not fetch balance for ${address}`);
      return "0";
    }
  }

  exportAddressesForFaucet() {
    console.log(`\n📋 Exporting addresses for manual faucet requests...`);

    const addresses = this.accounts.map((acc) => acc.address);
    const outputFile = CONFIG.ADDRESSES_FILE;

    fs.writeFileSync(outputFile, addresses.join("\n"));

    console.log(`\n✅ Exported ${addresses.length} addresses to ${outputFile}`);
    console.log(`\n💡 Faucet Information:`);
    console.log(`   • Network: ${CONFIG.NETWORK_NAME}`);
    console.log(`   • URL: ${CONFIG.FAUCET_URL}`);
    console.log(
      `   • Amount per request: ${CONFIG.FAUCET_AMOUNT} ${CONFIG.TOKEN_SYMBOL}`
    );
    console.log(`   • Rate limit: Once every 24 hours per account`);
    console.log(`   • Requires: Captcha completion`);
    console.log(`\n📝 Instructions:`);
    console.log(`   1. Go to ${CONFIG.FAUCET_URL}`);
    console.log(`   2. Select "Westend" network (Relay Chain)`);
    console.log(`   3. Paste each address from ${outputFile}`);
    console.log(`   4. Complete the captcha and submit`);
    console.log(`   5. Wait for confirmation before next address`);
    console.log(`\n🎯 First 5 addresses to start with:\n`);

    this.accounts.slice(0, 5).forEach((acc) => {
      console.log(`   ${acc.address}`);
    });
    console.log(
      `\n   ... and ${this.accounts.length - 5} more in ${outputFile}`
    );

    console.log(`\n💡 Tips:`);
    console.log(
      `   • Use multiple browser windows/tabs to speed up the process`
    );
    console.log(`   • Each account can request once per 24 hours`);
    console.log(
      `   • After requesting all, wait 2-3 minutes then run: npm run check-balances`
    );
    console.log(
      `   • Expected total: ${
        CONFIG.NUM_ACCOUNTS * CONFIG.FAUCET_AMOUNT
      } WND (~${
        CONFIG.NUM_ACCOUNTS * CONFIG.TRANSFER_AMOUNT
      } WND after transfers)\n`
    );
  }

  async checkAllBalances() {
    console.log(`\n💰 Checking balances for all accounts...`);

    let totalBalance = BigInt(0);
    let accountsWithFunds = 0;

    for (const account of this.accounts) {
      const balance = await this.checkBalance(account.address);
      account.balance = balance;
      totalBalance += BigInt(balance);

      if (BigInt(balance) > BigInt(0)) {
        accountsWithFunds++;
      }
    }

    this.saveAccounts();

    console.log(`\n📊 Balance Summary:`);
    console.log(
      `   Accounts with funds: ${accountsWithFunds}/${this.accounts.length}`
    );
    console.log(
      `   Total balance: ${this.formatBalance(totalBalance.toString())} WND`
    );
    console.log(
      `   Average per account: ${this.formatBalance(
        (totalBalance / BigInt(this.accounts.length)).toString()
      )} WND`
    );

    return { totalBalance, accountsWithFunds };
  }

  async transferToTarget(mnemonic, fromAddress, accountId) {
    try {
      const keyring = new Keyring({ type: "sr25519" });
      const keyringAccount = keyring.addFromMnemonic(mnemonic);

      const sign = (data) => {
        return keyringAccount.sign(data);
      };

      const signer = getPolkadotSigner(
        keyringAccount.publicKey,
        "Sr25519",
        sign
      );

      const balance = await this.checkBalance(fromAddress);
      const balanceBigInt = BigInt(balance);
      const transferAmount = BigInt(
        Math.floor(CONFIG.TRANSFER_AMOUNT * Math.pow(10, 12))
      );

      if (balanceBigInt < transferAmount) {
        console.log(
          `      ⚠️  Insufficient balance in Account ${accountId} (${this.formatBalance(
            balance
          )} WND)`
        );
        return false;
      }

      console.log(
        `   💸 Transferring ${CONFIG.TRANSFER_AMOUNT} WND from Account ${accountId}...`
      );

      const tx = this.relayApi.tx.Balances.transfer_keep_alive({
        dest: {
          type: "Id",
          value: CONFIG.TARGET_ADDRESS,
        },
        value: transferAmount,
      });

      await new Promise((resolve, reject) => {
        tx.signSubmitAndWatch(signer).subscribe({
          next: (event) => {
            if (event.type === "finalized") {
              if (event.ok) {
                console.log(
                  `      ✅ Transfer successful from Account ${accountId}`
                );
                resolve(true);
              } else {
                console.log(
                  `      ❌ Transfer failed from Account ${accountId}`
                );
                reject(new Error("Transfer failed"));
              }
            }
          },
          error: (error) => {
            console.log(
              `      ❌ Transfer error from Account ${accountId}: ${error.message}`
            );
            reject(error);
          },
        });
      });

      return true;
    } catch (error) {
      console.log(
        `      ❌ Transfer error from Account ${accountId}: ${error.message}`
      );
      return false;
    }
  }

  async transferAllToTarget() {
    console.log(`\n💸 Transferring funds from all accounts to target...`);
    console.log(`   Target: ${CONFIG.TARGET_ADDRESS}`);
    console.log(
      `   This will take approximately ${Math.ceil(
        (CONFIG.NUM_ACCOUNTS * CONFIG.DELAY_BETWEEN_TRANSFERS) / 1000 / 60
      )} minutes\n`
    );

    let successCount = 0;
    let failCount = 0;
    let totalTransferred = BigInt(0);

    for (let i = 0; i < this.accounts.length; i++) {
      const account = this.accounts[i];

      if (BigInt(account.balance) === BigInt(0)) {
        console.log(`   ⏭️  Skipping Account ${account.id} (no balance)`);
        continue;
      }

      const success = await this.transferToTarget(
        account.mnemonic,
        account.address,
        account.id
      );

      if (success) {
        successCount++;
        totalTransferred += BigInt(
          Math.floor(CONFIG.TRANSFER_AMOUNT * Math.pow(10, 12))
        );
      } else {
        failCount++;
      }

      if (i < this.accounts.length - 1) {
        await this.sleep(CONFIG.DELAY_BETWEEN_TRANSFERS);
      }
    }

    console.log(`\n📊 Transfer Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(
      `   💰 Total transferred: ${this.formatBalance(
        totalTransferred.toString()
      )} WND`
    );
  }

  async showWorkflow() {
    console.log("\n🌾 Westend Faucet Farming Workflow\n");
    console.log(
      "⚠️  Note: Official faucet requires captcha (manual process)\n"
    );
    console.log("📋 Step-by-Step Process:\n");
    console.log("   Step 1: Export addresses");
    console.log("           → npm run export-addresses\n");
    console.log("   Step 2: Request faucet for each address");
    console.log("           → Go to https://faucet.polkadot.io/westend");
    console.log("           → Complete captcha for each account");
    console.log("           → You'll receive 100 WND per account\n");
    console.log("   Step 3: Verify funds arrived");
    console.log("           → npm run check-balances\n");
    console.log("   Step 4: Consolidate funds to target");
    console.log("           → npm run transfer-all\n");
    console.log("💰 Expected Results:");
    console.log(
      `   • Total from faucet: ${
        CONFIG.NUM_ACCOUNTS * CONFIG.FAUCET_AMOUNT
      } WND`
    );
    console.log(
      `   • Total transferred: ~${
        CONFIG.NUM_ACCOUNTS * CONFIG.TRANSFER_AMOUNT
      } WND`
    );
    console.log(`   • Target address: ${CONFIG.TARGET_ADDRESS}\n`);
  }

  formatBalance(balance) {
    const divisor = Math.pow(10, CONFIG.TOKEN_DECIMALS);
    return (parseFloat(balance) / divisor).toFixed(4);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async disconnect() {
    if (this.relayClient) this.relayClient.destroy();
    console.log(`🔌 Disconnected from ${CONFIG.NETWORK_NAME} Relay Chain`);
  }
}

async function main() {
  const command = process.argv[2];

  if (
    !command ||
    !["workflow", "export", "check", "transfer"].includes(command)
  ) {
    console.log(
      "Westend Faucet Farmer - Manage accounts and consolidate faucet funds"
    );
    console.log("");
    console.log(
      "⚠️  Note: Official Westend faucet requires captcha (manual process)"
    );
    console.log("");
    console.log("Usage: node faucet-farmer.js <command>");
    console.log("");
    console.log("Commands:");
    console.log("  workflow  Show complete farming workflow and instructions");
    console.log(
      "  export    Generate and export addresses for faucet requests"
    );
    console.log("  check     Check balances of all accounts");
    console.log(
      "  transfer  Transfer funds from all accounts to target address"
    );
    console.log("");
    console.log("Configuration:");
    console.log(`  Number of accounts: ${CONFIG.NUM_ACCOUNTS}`);
    console.log(`  Faucet amount: ${CONFIG.FAUCET_AMOUNT} WND per account`);
    console.log(`  Transfer amount: ${CONFIG.TRANSFER_AMOUNT} WND per account`);
    console.log(`  Target address: ${CONFIG.TARGET_ADDRESS}`);
    console.log("");
    process.exit(1);
  }

  const farmer = new FaucetFarmer();

  try {
    if (command === "workflow") {
      await farmer.initialize();
      await farmer.loadOrGenerateAccounts();
      await farmer.showWorkflow();
    } else {
      await farmer.initialize();
      await farmer.loadOrGenerateAccounts();

      switch (command) {
        case "export":
          farmer.exportAddressesForFaucet();
          break;

        case "check":
          await farmer.checkAllBalances();
          break;

        case "transfer":
          await farmer.checkAllBalances();
          await farmer.transferAllToTarget();
          break;
      }
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
    console.error("Full error:", error);
  } finally {
    await farmer.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FaucetFarmer };
