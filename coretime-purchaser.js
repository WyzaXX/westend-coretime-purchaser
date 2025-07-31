#!/usr/bin/env node

import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { wnd, wndAssethub } from "@polkadot-api/descriptors";
import { getPolkadotSigner } from "polkadot-api/signer";
import { mnemonicToMiniSecret, sr25519PairFromSeed, cryptoWaitReady, encodeAddress } from "@polkadot/util-crypto";
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

// For coretime chain, we'll use a dynamic client without typed descriptors
// since we need broker pallet functionality

// Configuration
const CONFIG = {
  WESTEND_RELAY_RPC: 'wss://westend-rpc.polkadot.io',
  WESTEND_ASSET_HUB_RPC: 'wss://westend-asset-hub-rpc.polkadot.io',
  WESTEND_CORETIME_RPC: 'wss://westend-coretime-rpc.polkadot.io',
  ASSET_HUB_PARA_ID: 1000,
  CORETIME_PARA_ID: 1005,
};

class CoretimePurchaser {
  constructor(walletInput, derivationPath = null) {
    this.walletInput = walletInput;
    this.derivationPath = derivationPath;
    this.relayClient = null;
    this.assetHubClient = null;
    this.coretimeClient = null;
    this.relayApi = null;
    this.assetHubApi = null;
    this.coretimeApi = null;
    this.signer = null;
    this.account = null;
  }

  async initialize() {
    console.log('🚀 Initializing Westend Coretime Purchaser...');
    
    // Initialize crypto
    await cryptoWaitReady();
    
    // Setup signer from mnemonic
    console.log('🔑 Loading wallet from mnemonic...');
    
    // Convert mnemonic to seed first, then derive if needed
    const seed = mnemonicToMiniSecret(this.walletInput);
    let keyPair = sr25519PairFromSeed(seed);
    
    // If derivation path is specified, we need to use the keyring for derivation
    if (this.derivationPath) {
      const keyring = new Keyring({ type: 'sr25519' });
      const derivedAccount = keyring.addFromMnemonic(`${this.walletInput}${this.derivationPath}`);
      // Use the derived account's keypair
      keyPair = {
        publicKey: derivedAccount.publicKey,
        sign: (data) => derivedAccount.sign(data)
      };
    }
    
    // Create signing function
    const sign = (data) => {
      const { signature } = keyPair.sign(data);
      return signature;
    };
    
    this.signer = getPolkadotSigner(keyPair.publicKey, "Sr25519", sign);
    
    // Also create a polkadot.js keyring account for coretime transactions
    const keyring2 = new Keyring({ type: 'sr25519' });
    const mnemonicForKeyring = this.derivationPath ? `${this.walletInput}${this.derivationPath}` : this.walletInput;
    this.keyringAccount = keyring2.addFromMnemonic(mnemonicForKeyring);
    
    this.account = { 
      address: encodeAddress(keyPair.publicKey, 42), // Westend SS58 format (42)
      publicKey: keyPair.publicKey,
      polkadotSigner: this.signer,
      keyringAccount: this.keyringAccount
    };
    
    console.log(`📋 Account: ${this.account.address}`);
    if (this.derivationPath) {
      console.log(`🛤️  Derivation path: ${this.derivationPath}`);
    }

    // Connect to chains
    await this.connectToChains();
  }

  async connectToChains() {
    console.log('🔌 Connecting to Westend Relay Chain...');
    this.relayClient = createClient(getWsProvider(CONFIG.WESTEND_RELAY_RPC));
    this.relayApi = this.relayClient.getTypedApi(wnd);
    
    console.log('🔌 Connecting to Westend Asset Hub...');
    this.assetHubClient = createClient(getWsProvider(CONFIG.WESTEND_ASSET_HUB_RPC));
    this.assetHubApi = this.assetHubClient.getTypedApi(wndAssethub);
    
    console.log('🔌 Connecting to Westend Coretime Chain...');
    // Use polkadot.js API for coretime to access broker pallet
    const coretimeProvider = new WsProvider(CONFIG.WESTEND_CORETIME_RPC);
    this.coretimeApi = await ApiPromise.create({ provider: coretimeProvider });
    
    console.log('✅ Connected to all three chains');
  }

  async checkAssetHubBalance() {
    console.log('\n💰 Checking WND balance on Asset Hub...');
    
    const account = await this.assetHubApi.query.System.Account.getValue(this.account.address);
    const freeBalance = account.data.free.toString();
    const existentialDeposit = (await this.assetHubApi.constants.Balances.ExistentialDeposit()).toString();
    
    console.log(`   Free Balance: ${this.formatBalance(freeBalance)} WND`);
    console.log(`   Existential Deposit: ${this.formatBalance(existentialDeposit)} WND`);
    
    return {
      free: freeBalance,
      existentialDeposit: existentialDeposit
    };
  }

  async checkRelayBalance() {
    console.log('\n💰 Checking WND balance on Relay Chain...');
    
    const account = await this.relayApi.query.System.Account.getValue(this.account.address);
    const freeBalance = account.data.free.toString();
    const existentialDeposit = (await this.relayApi.constants.Balances.ExistentialDeposit()).toString();
    
    console.log(`   Free Balance: ${this.formatBalance(freeBalance)} WND`);
    console.log(`   Existential Deposit: ${this.formatBalance(existentialDeposit)} WND`);
    
    return {
      free: freeBalance,
      existentialDeposit: existentialDeposit
    };
  }

  async checkCoretimeBalance() {
    console.log('\n💰 Checking WND balance on Coretime Chain...');
    
    try {
      const { data: balance } = await this.coretimeApi.query.system.account(this.account.address);
      const freeBalance = balance.free.toString();
      
      console.log(`   Free Balance: ${this.formatBalance(freeBalance)} WND`);
      
      return freeBalance;
    } catch (error) {
      console.log('   ⚠️  Could not fetch Coretime balance (chain may be connecting)');
      console.log(`   Error: ${error.message}`);
      return '0';
    }
  }

  async transferFromAssetHubToCoretime(amount) {
    console.log(`\n🌉 Transferring ${this.formatBalance(amount)} WND from Asset Hub to Coretime Chain...`);
    
    // Check if we have sufficient balance on Asset Hub
    const assetHubBalance = await this.checkAssetHubBalance();
    const requiredAmount = parseFloat(amount) + parseFloat(assetHubBalance.existentialDeposit);
    
    if (parseFloat(assetHubBalance.free) < requiredAmount) {
      console.log(`❌ Insufficient balance on Asset Hub. Need ${this.formatBalance(requiredAmount.toString())} WND but have ${this.formatBalance(assetHubBalance.free)} WND`);
      console.log('💡 Please fund your account on Westend Asset Hub first');
      return false;
    }

    try {
      // Create proper XCM transfer using the working approach from the React example
      const dest = {
        parents: 1,
        interior: {
          X1: {
            Parachain: CONFIG.CORETIME_PARA_ID
          }
        }
      };

      const beneficiary = {
        parents: 0,
        interior: {
          X1: {
            AccountId32: {
              network: undefined,
              id: this.account.publicKey
            }
          }
        }
      };

      const assets = [{
        id: {
          parents: 1,
          interior: "Here"
        },
        fun: {
          Fungible: BigInt(amount)
        }
      }];

      // Use the transfer_assets approach from the working React example
      const tx = this.assetHubApi.tx.PolkadotXcm.transfer_assets({
        dest: { V4: dest },
        beneficiary: { V4: beneficiary },
        assets: { V4: assets },
        fee_asset_item: 0,
        weight_limit: "Unlimited"
      });

      await this.submitTransaction(tx, 'XCM Transfer from Asset Hub to Coretime');
      
      // Wait a bit for the transfer to complete
      console.log('⏳ Waiting for transfer to complete...');
      await this.sleep(30000);
      
      return true;
    } catch (error) {
      console.error('❌ Transfer from Asset Hub failed:', error.message);
      console.error('Full error:', error);
      return false;
    }
  }

  async transferFromRelayToCoretime(amount) {
    console.log(`\n🌉 Transferring ${this.formatBalance(amount)} WND from Relay to Coretime Chain...`);
    
    // Check if we have sufficient balance on Relay chain
    const relayBalance = await this.checkRelayBalance();
    const requiredAmount = parseFloat(amount) + parseFloat(relayBalance.existentialDeposit);
    
    if (parseFloat(relayBalance.free) < requiredAmount) {
      console.log(`❌ Insufficient balance on Relay chain. Need ${this.formatBalance(requiredAmount.toString())} WND but have ${this.formatBalance(relayBalance.free)} WND`);
      console.log('💡 Please fund your account on Westend Relay chain first');
      return false;
    }

    try {
      // Create proper XCM transfer to parachain
      const dest = {
        parents: 0,
        interior: {
          X1: {
            Parachain: CONFIG.CORETIME_PARA_ID
          }
        }
      };

      const beneficiary = {
        parents: 0,
        interior: {
          X1: {
            AccountId32: {
              network: undefined,
              id: this.account.publicKey
            }
          }
        }
      };

      const assets = [{
        id: {
          parents: 0,
          interior: "Here"
        },
        fun: {
          Fungible: BigInt(amount)
        }
      }];

      // Use transfer_assets from relay to parachain
      const tx = this.relayApi.tx.XcmPallet.transfer_assets({
        dest: { V4: dest },
        beneficiary: { V4: beneficiary },
        assets: { V4: assets },
        fee_asset_item: 0,
        weight_limit: "Unlimited"
      });

      await this.submitTransaction(tx, 'XCM Transfer from Relay to Coretime');
      
      // Wait a bit for the transfer to complete
      console.log('⏳ Waiting for transfer to complete...');
      await this.sleep(30000);
      
      return true;
    } catch (error) {
      console.error('❌ Transfer from Relay failed:', error.message);
      console.error('Full error:', error);
      return false;
    }
  }

  // Sale Information Module
  async getSaleInfo() {
    console.log('\n📊 Fetching Sale Information...');
    
    try {
      const saleInfo = await this.coretimeApi.query.broker.saleInfo();
      
      if (!saleInfo || saleInfo.isNone) {
        throw new Error('No active sale found');
      }

      const sale = saleInfo.unwrap();
      const currentBlock = await this.relayApi.query.System.Number.getValue();
      
      const saleData = {
        saleStart: sale.saleStart ? sale.saleStart.toNumber() : 0,
        leadinLength: sale.leadinLength ? sale.leadinLength.toNumber() : 0,
        endPrice: sale.price ? sale.price.toString() : '0',
        regionBegin: sale.regionBegin ? sale.regionBegin.toNumber() : 0,
        regionEnd: sale.regionEnd ? sale.regionEnd.toNumber() : 0,
        idealCoresSold: sale.idealCoresSold ? sale.idealCoresSold.toNumber() : 0,
        coresOffered: sale.coresOffered ? sale.coresOffered.toNumber() : 0,
        firstCore: sale.firstCore ? sale.firstCore.toNumber() : 0,
        coresSold: sale.coresSold ? sale.coresSold.toNumber() : 0,
        currentBlock: currentBlock ? Number(currentBlock) : 0
      };

      console.log('📋 Sale Information:');
      console.log(`   Sale Start: ${saleData.saleStart}`);
      console.log(`   Current Block: ${saleData.currentBlock}`);
      console.log(`   Leadin Length: ${saleData.leadinLength}`);
      console.log(`   End Price: ${this.formatBalance(saleData.endPrice)} WND`);
      console.log(`   Cores Available: ${saleData.coresOffered - saleData.coresSold}/${saleData.coresOffered}`);
      console.log(`   Region: ${saleData.regionBegin} - ${saleData.regionEnd}`);

      return saleData;
    } catch (error) {
      console.error('Sale info query error:', error.message);
      throw new Error(`Failed to fetch sale information: ${error.message}`);
    }
  }

  calculateCurrentPrice(saleInfo) {
    const { saleStart, leadinLength, endPrice, currentBlock } = saleInfo;
    
    if (currentBlock < saleStart) {
      return null; // Still in interlude phase
    }

    const blocksIntoLeadin = Math.min(currentBlock - saleStart, leadinLength);
    const progress = blocksIntoLeadin / leadinLength; // 0 to 1
    
    // Linear leadin formula: price = (2 - progress) * regular_price
    const factor = 2 - progress;
    const currentPrice = Math.floor(parseFloat(endPrice) * factor);
    
    console.log(`\n💹 Current Price Calculation:`);
    console.log(`   Progress through leadin: ${(progress * 100).toFixed(2)}%`);
    console.log(`   Price factor: ${factor.toFixed(4)}`);
    console.log(`   Current price: ${this.formatBalance(currentPrice)} WND`);
    
    return currentPrice.toString();
  }

  // Purchase Execution Module
  async executePurchase(priceLimit) {
    console.log(`\n🛒 Attempting to purchase coretime with limit: ${this.formatBalance(priceLimit)} WND`);
    
    try {
      const tx = this.coretimeApi.tx.broker.purchase(priceLimit);
      const result = await this.submitCoretimeTransaction(tx, 'Coretime Purchase');
      
      if (result.success) {
        console.log('🎉 Purchase successful!');
        
        // Find the purchase event to get region details
        const purchaseEvent = result.events.find(event => 
          event.event.section === 'broker'
        );
        
        if (purchaseEvent) {
          console.log('📜 Region purchased successfully!');
          console.log(`   Event: ${purchaseEvent.event.method}`);
        }
        
        return result;
      }
    } catch (error) {
      this.handlePurchaseError(error);
      throw error;
    }
  }

  // Region Checking Module
  async checkMyRegions() {
    console.log('\n🔍 Checking your coretime regions...');
    
    try {
      // Get all regions and filter by your account
      const allRegions = await this.coretimeApi.query.broker.regions.entries();
      const myRegions = [];
      
      for (const [key, regionOpt] of allRegions) {
        if (regionOpt.isSome) {
          const region = regionOpt.unwrap();
          if (region.owner.toString() === this.account.address) {
            const regionId = key.args[0];
            myRegions.push({
              regionId: {
                begin: regionId.begin.toNumber(),
                core: regionId.core.toNumber(), 
                mask: regionId.mask.toString()
              },
              owner: region.owner.toString(),
              paid: region.paid ? region.paid.toString() : '0'
            });
          }
        }
      }
      
      if (myRegions.length === 0) {
        console.log('   📭 No regions found for your account');
      } else {
        console.log(`   📦 Found ${myRegions.length} region(s):`);
        myRegions.forEach((region, index) => {
          console.log(`   \n   Region ${index + 1}:`);
          console.log(`      Begin: ${region.regionId.begin}`);
          console.log(`      Core: ${region.regionId.core}`);
          console.log(`      Mask: ${region.regionId.mask}`);
          console.log(`      Paid: ${this.formatBalance(region.paid)} WND`);
        });
      }
      
      return myRegions;
    } catch (error) {
      console.log('   ⚠️  Could not fetch regions');
      console.log(`   Error: ${error.message}`);
      return [];
    }
  }

  async checkWorkplan() {
    console.log('\n⚙️  Checking workplan assignments...');
    
    try {
      const workplan = await this.coretimeApi.query.broker.workplan.entries();
      const myAssignments = [];
      
      for (const [key, assignment] of workplan) {
        // Key is (timeslice, core_index)
        const timeslice = key.args[0].toString();
        const coreIndex = key.args[1].toString();
        
        // Check if assignment involves your account
        if (assignment.toString().includes(this.account.address)) {
          myAssignments.push({
            timeslice,
            coreIndex,
            assignment: assignment.toString()
          });
        }
      }
      
      if (myAssignments.length === 0) {
        console.log('   📭 No workplan assignments found for your account');
      } else {
        console.log(`   ⚡ Found ${myAssignments.length} assignment(s):`);
        myAssignments.forEach((item, index) => {
          console.log(`   Assignment ${index + 1}: Core ${item.coreIndex}, Timeslice ${item.timeslice}`);
        });
      }
      
      return myAssignments;
    } catch (error) {
      console.log('   ⚠️  Could not fetch workplan');
      console.log(`   Error: ${error.message}`);
      return [];
    }
  }

  // Error Handling
  handlePurchaseError(error) {
    console.error('\n❌ Purchase Error:', error.message);
    
    if (error.message.includes('TooEarly')) {
      console.log('💡 Sale hasn\'t started yet (still in interlude phase)');
    } else if (error.message.includes('SoldOut')) {
      console.log('💡 All cores have been sold');
    } else if (error.message.includes('Overpriced')) {
      console.log('💡 Current price exceeds your price limit');
    } else if (error.message.includes('Unavailable')) {
      console.log('💡 No cores available for sale');
    } else if (error.message.includes('NoSales')) {
      console.log('💡 No active sale period');
    } else {
      console.log('💡 Unknown error - check full error details above');
    }
  }

  // Coretime transaction submitter (uses polkadot.js API)
  async submitCoretimeTransaction(tx, description) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`📤 Submitting ${description}...`);
        
        const unsub = await tx.signAndSend(this.account.keyringAccount, (result) => {
          console.log(`   Status: ${result.status.type}`);
          
          if (result.status.isInBlock) {
            console.log(`   In block: ${result.status.asInBlock}`);
          }
          
          if (result.status.isFinalized) {
            console.log(`   Finalized: ${result.status.asFinalized}`);
            
            const success = !result.events.some(event => 
              this.coretimeApi.events.system.ExtrinsicFailed.is(event.event)
            );
            
            if (success) {
              console.log('✅ Transaction successful!');
              resolve({ success: true, events: result.events });
            } else {
              const errorEvent = result.events.find(event => 
                this.coretimeApi.events.system.ExtrinsicFailed.is(event.event)
              );
              reject(new Error(`Transaction failed: ${errorEvent ? errorEvent.event.data.toString() : 'Unknown error'}`));
            }
            
            unsub();
          }
        });
      } catch (error) {
        console.error('Transaction submission error:', error.message);
        reject(error);
      }
    });
  }

  // Utility functions
  async submitTransaction(tx, description) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`📤 Submitting ${description}...`);
        
        const result = await tx.signSubmitAndWatch(this.signer);
        
        result.subscribe({
          next: (event) => {
            console.log(`   Status: ${event.type}`);
            
            if (event.type === 'finalized') {
              if (event.ok) {
                console.log(`   Finalized in block: ${event.block.hash}`);
                console.log('✅ Transaction successful');
                resolve({ success: true, events: event.events });
              } else {
                reject(new Error(`Transaction failed: ${event.dispatchError}`));
              }
            }
          },
          error: (error) => {
            console.error('Transaction submission error:', error.message);
            reject(error);
          }
        });
      } catch (error) {
        console.error('Transaction submission error:', error.message);
        reject(error);
      }
    });
  }

  formatBalance(balance) {
    const WND_DECIMALS = 12;
    const divisor = Math.pow(10, WND_DECIMALS);
    return (parseFloat(balance) / divisor).toFixed(4);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    if (this.relayClient) this.relayClient.destroy();
    if (this.assetHubClient) this.assetHubClient.destroy();
    if (this.coretimeApi) await this.coretimeApi.disconnect();
    console.log('🔌 Disconnected from chains');
  }
}

// Main execution function
async function main() {
  if (process.argv.length < 4 && !process.argv.includes('--check-regions')) {
    console.log('Usage: node coretime-purchaser.js <mnemonic> <price_limit_wnd> [derivation_path] [options]');
    console.log('       node coretime-purchaser.js <mnemonic> --check-regions [derivation_path]');
    console.log('');
    console.log('Examples:');
    console.log('  node coretime-purchaser.js "word1 word2 ... word12" 1.5 //5 --dry-run');
    console.log('  node coretime-purchaser.js "word1 word2 ... word12" 1.5 --skip-bridge');
    console.log('  node coretime-purchaser.js "word1 word2 ... word12" --check-regions //0');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run        Simulate the purchase without real transactions');
    console.log('  --skip-bridge    Skip bridging funds (use when you already have WND on Coretime chain)');
    console.log('  --check-regions  Only check your coretime regions (no purchase)');
    process.exit(1);
  }

  const walletInput = process.argv[2];
  const priceLimitWnd = process.argv.includes('--check-regions') ? 0 : parseFloat(process.argv[3]);
  const isDryRun = process.argv.includes('--dry-run');
  const skipBridge = process.argv.includes('--skip-bridge');
  const checkRegionsOnly = process.argv.includes('--check-regions');
  
  // Check if there's a derivation path (like //0, //1, etc.)
  let derivationPath = null;
  for (let i = 4; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('//')) {
      derivationPath = process.argv[i];
      break;
    }
  }
  
  const priceLimitPlanck = (priceLimitWnd * Math.pow(10, 12)).toString();

  if (isDryRun) {
    console.log('🧪 Running in DRY-RUN mode - no real transactions will be sent\n');
  }
  
  if (skipBridge) {
    console.log('🌉 Bridge skipped - assuming sufficient funds on Coretime chain\n');
  }

  const purchaser = new CoretimePurchaser(walletInput, derivationPath);
  
  try {
    await purchaser.initialize();
    
    // If only checking regions, skip to region check
    if (checkRegionsOnly) {
      console.log('🔍 Region Check Mode - checking your coretime regions only\n');
      await purchaser.checkMyRegions();
      await purchaser.checkWorkplan();
      return;
    }
    
    // 1. Check balances (always check to show current state)
    if (!skipBridge) {
      await purchaser.checkAssetHubBalance();
      await purchaser.checkRelayBalance();
    }
    let coretimeBalance = await purchaser.checkCoretimeBalance();
    
    // 2. Transfer tokens if needed (skip if --skip-bridge is used)
    if (!skipBridge) {
      const minCoretimeBalance = (priceLimitWnd * 1.1 * Math.pow(10, 12)).toString();
      if (parseFloat(coretimeBalance) < parseFloat(minCoretimeBalance)) {
        console.log('\n⚠️  Insufficient balance on Coretime chain, need to transfer funds...');
        const transferAmount = (priceLimitWnd * 2 * Math.pow(10, 12)).toString();
        
        if (isDryRun) {
          console.log('🧪 [DRY-RUN] Would transfer', purchaser.formatBalance(transferAmount), 'WND to Coretime chain');
        } else {
          console.log('💡 Trying transfer from Asset Hub first...');
          let transferSuccess = await purchaser.transferFromAssetHubToCoretime(transferAmount);
          
          if (!transferSuccess) {
            console.log('💡 Asset Hub transfer failed, trying from Relay chain...');
            transferSuccess = await purchaser.transferFromRelayToCoretime(transferAmount);
          }
          
          if (!transferSuccess) {
            console.log('❌ All transfer methods failed. Cannot proceed with purchase.');
            return;
          }
          
          coretimeBalance = await purchaser.checkCoretimeBalance();
          
          // Verify we now have sufficient balance
          if (parseFloat(coretimeBalance) < parseFloat(minCoretimeBalance)) {
            console.log('⚠️  Still insufficient balance after transfer. Please check your balance.');
            return;
          }
        }
      }
    } else {
      console.log('\n💡 Skipping balance transfer check due to --skip-bridge flag');
      console.log('   Make sure you have sufficient funds on Coretime chain!');
    }
    
    // 3. Get sale information and check if we can purchase
    let saleInfo;
    try {
      saleInfo = await purchaser.getSaleInfo();
    } catch (error) {
      console.error('❌ Failed to fetch sale information:', error.message);
      if (error.message.includes('No active sale')) {
        console.log('💡 There may be no active sale period right now');
      }
      return;
    }
    
    const currentPrice = purchaser.calculateCurrentPrice(saleInfo);
    
    if (!currentPrice) {
      console.log('⏳ Sale hasn\'t started yet (still in interlude phase)');
      console.log(`💡 Sale will start at block ${saleInfo.saleStart}, current block is ${saleInfo.currentBlock}`);
      return;
    }
    
    if (parseFloat(currentPrice) > parseFloat(priceLimitPlanck)) {
      console.log(`⚠️  Current price (${purchaser.formatBalance(currentPrice)} WND) exceeds limit (${priceLimitWnd} WND)`);
      console.log('💡 Wait for the price to decrease or increase your price limit');
      return;
    }
    
    console.log(`✅ Ready to purchase! Current price: ${purchaser.formatBalance(currentPrice)} WND`);
    
    // 4. Execute purchase
    try {
      if (isDryRun) {
        console.log(`🧪 [DRY-RUN] Would purchase coretime with limit: ${purchaser.formatBalance(priceLimitPlanck)} WND`);
        console.log(`🧪 [DRY-RUN] Expected price to pay: ${purchaser.formatBalance(currentPrice)} WND`);
        console.log('✅ [DRY-RUN] Purchase simulation successful');
      } else {
        await purchaser.executePurchase(priceLimitPlanck);
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error.message);
      console.error('Full error:', error);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await purchaser.disconnect();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CoretimePurchaser };