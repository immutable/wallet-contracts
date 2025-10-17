# Mainnet POC - Passport to Nexus Migration on Base

[![Status](https://img.shields.io/badge/Status-✅%20COMPLETED-success)]()
[![Network](https://img.shields.io/badge/Network-Base%20Mainnet-blue)]()
[![Tests](https://img.shields.io/badge/Tests-9/9%20Passed-success)]()
[![Budget](https://img.shields.io/badge/Budget-60%25%20Under-success)]()

## 🎯 Objective

Validate the complete flow of deploying Passport infrastructure, creating a Passport wallet, migrating it to Biconomy Nexus, and testing all operations on **Base Mainnet**.

## 📋 Overview

This POC demonstrates:
1. ✅ Deploy complete Passport infrastructure on Base Mainnet
2. ✅ Deploy a Passport wallet using the deployed infrastructure
3. ✅ Migrate Passport wallet to Biconomy Nexus
4. ✅ Test all operations with the migrated Nexus wallet:
   - Native ETH transfers
   - ERC20 (USDC) transfers
   - NFT operations
   - Batch transactions (invisible signing)
   - Gas sponsorship

## 💰 Budget

- **Requested:** $100 ETH on Ethereum L1
- **Bridge to Base:** ~$80 (after bridge fees)
- **Estimated costs:**
  - Passport infra deployment: ~$30
  - Passport wallet deployment: ~$5
  - Migration: ~$5
  - Testing operations: ~$20
  - Buffer: ~$20

## 🔑 Prerequisites

### Required Information

1. **Wallet (Owner EOA):**
   - Address: `0x33De6721Da81c02BE4eCFa14260a30753C50E776`
   - Private Key: Set in `MIGRATION_TEST_OWNER_PK` env var
   - Must have ETH on Base Mainnet

2. **Biconomy API Keys:**
   - Bundler API Key: Set in `BICONOMY_BUNDLER_API_KEY`
   - Paymaster API Key: Set in `BICONOMY_PAYMASTER_API_KEY`

3. **Network:**
   - Base Mainnet (Chain ID: 8453)
   - RPC: https://mainnet.base.org
   - Explorer: https://basescan.org

### Environment Setup

```bash
# .env file
MIGRATION_TEST_OWNER_PK=your_private_key_here  # ⚠️ NEVER COMMIT REAL PRIVATE KEYS!
BICONOMY_BUNDLER_API_KEY=your_bundler_key
BICONOMY_PAYMASTER_API_KEY=your_paymaster_key
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ETHERSCAN_API_KEY=your_basescan_key
```

## 📝 Execution Steps

### Step 0: Pre-Flight Check

```bash
npx hardhat run scripts/biconomy-migration/mainnet-poc/00-pre-flight-check.ts --network base
```

**Verifies:**
- ✅ Wallet has sufficient ETH balance
- ✅ Network configuration is correct
- ✅ API keys are set
- ✅ Biconomy contracts exist on Base
- ✅ All dependencies are ready

---

### Step 1: Deploy Passport Infrastructure

```bash
npx hardhat run scripts/biconomy-migration/mainnet-poc/01-deploy-passport-infra.ts --network base
```

**Deploys:**
- ✅ Create2 Deployer (OwnableCreate2Deployer)
- ✅ Factory (Factory)
- ✅ MultiCallDeploy
- ✅ MainModule
- ✅ MainModuleUpgradable

**Estimated cost:** ~$30
**Duration:** ~10-15 minutes

**Output:** `results/deployments.json`

---

### Step 2: Deploy Passport Wallet

```bash
npx hardhat run scripts/biconomy-migration/02-deploy-test-passport-wallet.ts --network base
```

**Creates:**
- ✅ Passport wallet using deployed infrastructure
- ✅ Initial configuration (owner setup)
- ✅ Test transaction (to verify wallet works)

**Estimated cost:** ~$5
**Duration:** ~5 minutes

**Output:** Updates `results/deployments.json` with wallet address

---

### Step 3: Migrate Passport → Nexus

```bash
npx hardhat run scripts/biconomy-migration/03-migrate-passport-to-nexus.ts --network base
```

**Migration process:**
- ✅ Prepare migration transaction
- ✅ Update wallet implementation to Nexus
- ✅ Enable K1Validator module
- ✅ Verify migration success

**Estimated cost:** ~$5
**Duration:** ~5 minutes

**Output:** Updates `results/deployments.json` with migration status

---

### Step 4: Test Native Transfer

```bash
npx hardhat run scripts/biconomy-migration/sample-app/01-native-token-transfer.ts --network base
```

**Tests:**
- ✅ Send ETH from migrated wallet to recipient
- ✅ Verify transaction on BaseScan
- ✅ Track gas costs

**Estimated cost:** ~$2
**Duration:** ~2 minutes

---

### Step 5: Test ERC20 Transfer

```bash
npx hardhat run scripts/biconomy-migration/sample-app/02-erc20-transfer.ts --network base
```

**Tests:**
- ✅ Transfer USDC from migrated wallet
- ✅ Verify balance changes
- ✅ Track gas costs

**Estimated cost:** ~$3
**Duration:** ~2 minutes

**Note:** Requires USDC. Script will attempt to swap ETH → USDC if needed.

---

### Step 6: Test NFT Transfer

```bash
npx hardhat run scripts/biconomy-migration/sample-app/03-nft-transfer.ts --network base
```

**Tests:**
- ✅ Deploy test NFT contract
- ✅ Mint NFT
- ✅ Transfer NFT to migrated wallet
- ✅ Verify ownership

**Estimated cost:** ~$5
**Duration:** ~5 minutes

---

### Step 7: Test Invisible Signing (Batch)

```bash
npx hardhat run scripts/biconomy-migration/sample-app/04-invisible-signing.ts --network base
```

**Tests:**
- ✅ Batch multiple operations in single UserOp
- ✅ No intermediate user confirmations
- ✅ Verify all operations executed

**Estimated cost:** ~$4
**Duration:** ~3 minutes

---

### Step 8: Test Gas Sponsorship

```bash
npx hardhat run scripts/biconomy-migration/sample-app/05-gas-sponsorship.ts --network base
```

**Tests:**
- ✅ Execute transaction with Biconomy Paymaster
- ✅ Verify gas is sponsored (not paid by wallet)
- ✅ Validate paymaster integration

**Estimated cost:** ~$0 (sponsored)
**Duration:** ~2 minutes

---

### Step 9: Generate Final Report

```bash
# Final report already generated in:
# scripts/biconomy-migration/mainnet-poc/MAINNET_POC_RESULTS.md
```

**Report includes:**
- ✅ Complete cost breakdown
- ✅ All transaction hashes
- ✅ BaseScan links for verification
- ✅ Summary of results
- ✅ All 6 test scenarios (including NFT Purchase via Seaport)

**Output:** `scripts/biconomy-migration/mainnet-poc/MAINNET_POC_RESULTS.md`

---

## 🔍 Verification

All transactions can be verified on BaseScan:
- **Deployments:** https://basescan.org/address/{contract_address}
- **Transactions:** https://basescan.org/tx/{tx_hash}
- **Wallet:** https://basescan.org/address/{wallet_address}

## 📊 Actual Results

| Step | Operation | Actual Cost | Status |
|------|-----------|-------------|--------|
| 1 | Deploy Passport Infra | ~$30 | ✅ **COMPLETED** |
| 2 | Deploy Passport Wallet | ~$2 | ✅ **COMPLETED** |
| 3 | Migrate to Nexus | ~$1 | ✅ **COMPLETED** |
| 4 | Native Transfer | ~$0.50 | ✅ **COMPLETED** |
| 5 | ERC20 Transfer | ~$0.50 | ✅ **COMPLETED** |
| 6 | NFT Transfer | ~$2 | ✅ **COMPLETED** |
| 7 | Batch Transactions | ~$0.50 | ✅ **COMPLETED** |
| 8 | Gas Sponsorship | ~$0 | ✅ **COMPLETED** |
| 9 | NFT Purchase (Seaport) | ~$2.58 | ✅ **COMPLETED** |
| **TOTAL** | | **~$39.58** | **✅ 9/9 PASSED** |

**Budget:** $100 ETH on L1 → Bridged to Base  
**Total Spent:** ~$39.58 (60% under budget!)  
**Success Rate:** 100% (9/9 tests passed)

## 🎯 Success Criteria - ✅ ALL MET!

- ✅ All Passport contracts deployed successfully on Base Mainnet
- ✅ Passport wallet created and functional
- ✅ Migration to Nexus completed without errors
- ✅ All 6 core test scenarios passed (native, ERC20, NFT, batch, paymaster, NFT purchase)
- ✅ Total cost within budget ($39.58 of $100 allocated)
- ✅ All transactions verifiable on BaseScan
- ✅ **BONUS:** NFT purchase via OpenSea/Seaport working!

## 🎉 Results Summary

**POC Status:** ✅ **COMPLETE SUCCESS**

**Deployed Wallet:**
- Address: `0xfFDe4C904E7262b4bdde127f159c3a44584726bC`
- Owner: `0x33De6721Da81c02BE4eCFa14260a30753C50E776`
- Type: Passport → Migrated to Nexus
- Network: Base Mainnet (8453)

**Key Achievements:**
- ✅ Complete Passport infrastructure deployed
- ✅ Successful migration to Biconomy Nexus (ERC-4337)
- ✅ 100% test success rate (9/9 scenarios)
- ✅ Gas sponsorship working perfectly
- ✅ OpenSea/Seaport integration validated
- ✅ 60% under budget

**Detailed Report:** See [MAINNET_POC_RESULTS.md](./MAINNET_POC_RESULTS.md)

## 📞 Support

For issues or questions, refer to:
- Biconomy Docs: https://docs.biconomy.io
- Base Docs: https://docs.base.org
- Passport (Sequence) Docs: https://docs.sequence.xyz

---

**Last Updated:** 2025-10-17  
**Status:** ✅ **COMPLETED - ALL TESTS PASSED**  
**Total Duration:** 2 days (Oct 16-17, 2025)  
**Success Rate:** 100% (9/9 tests passed)

