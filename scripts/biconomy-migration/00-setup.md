# 🔧 Setup - Biconomy Migration Scripts

## 📋 Overview

This directory contains scripts to migrate Passport wallets to Nexus while preserving their addresses, balances, and transaction history.

## 🎯 Migration Approach

### **Phase 1 & 2: Migration (No Biconomy SDK)**
- Uses **ethers.js directly** to interact with Passport wallets
- Calls `wallet.execute()` with manual signature generation
- Why? Biconomy SDK expects `BiconomySmartAccountV2`, but we have `MainModuleDynamicAuth`

### **Phase 3: Validation (With Biconomy SDK)**
- Uses **@biconomy/abstractjs** to validate migrated wallets
- Calls `toNexusAccount()` and `createBicoBundlerClient()`
- Why? After migration, wallet becomes a valid Nexus account

## 📦 Required Packages

```bash
# Already installed in this project
npm install ethers hardhat @biconomy/abstractjs viem
```

## 🔑 Environment Variables

Add to `.env`:

```bash
# Base Sepolia RPC
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Wallet owner (will be used for signing migration transactions)
MIGRATION_OWNER_PRIVATE_KEY=0x...

# Biconomy Bundler (for post-migration testing)
NEXUS_BUNDLER_URL=https://bundler.biconomy.io/api/v2/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44

# Paymaster (optional, for sponsored transactions)
PAYMASTER_API_KEY=...
```

## 📝 Script Execution Order

1. **01-analyze-storage-layout.ts** - Verify storage compatibility (30 min)
2. **02-deploy-test-passport-wallet.ts** - Deploy test wallet (15 min)
3. **03-migrate-passport-to-nexus.ts** - Execute migration (30 min)
4. **04-test-with-biconomy-abstractjs.ts** - Validate with AbstractJS SDK ✅ (15 min)
5. **05-test-with-supertransactions.ts** - Test Supertransactions ❌ (incompatible)
6. **06-migrate-production-wallet.ts** - Migrate real wallet (30 min)

## ⚠️ Important Notes

- **ALWAYS test with a test wallet first!**
- **Verify storage layout compatibility before migrating production wallets**
- **Keep backup of wallet addresses and private keys**
- **Migration is irreversible without a rollback transaction**

## 🚀 Quick Start

```bash
# 1. Analyze storage layout
npx hardhat run scripts/biconomy-migration/01-analyze-storage-layout.ts --network base_sepolia

# 2. Deploy test wallet
npx hardhat run scripts/biconomy-migration/02-deploy-test-passport-wallet.ts --network base_sepolia

# 3. Migrate test wallet
npx hardhat run scripts/biconomy-migration/03-migrate-passport-to-nexus.ts --network base_sepolia

# 4. Test with Biconomy AbstractJS SDK ✅
npx hardhat run scripts/biconomy-migration/04-test-with-biconomy-abstractjs.ts --network base_sepolia

# 5. Test Supertransactions ❌ (will fail - incompatible)
npx hardhat run scripts/biconomy-migration/05-test-with-supertransactions.ts --network base_sepolia

# 6. Migrate production wallet (after successful testing)
npx hardhat run scripts/biconomy-migration/06-migrate-production-wallet.ts --network base_sepolia
```

## 📚 References

- [Biconomy V2 → Nexus Migration Guide](https://docs.biconomy.io/new/versions-and-migrations/v2-to-nexus)
- [AbstractJS SDK Documentation](https://docs.biconomy.io/)
- [MEE Versions](https://docs.biconomy.io/new/versions-and-migrations/mee-versions)

