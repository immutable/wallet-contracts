# Biconomy Nexus Sample App

This sample app demonstrates various use cases for migrated Passport → Nexus wallets using Biconomy's AbstractJS SDK.

## ✅ **What Works**

All scenarios use **`@biconomy/abstractjs`** which has been extensively tested and works perfectly with:
- ✅ Migrated Passport → Nexus wallets
- ✅ Native Nexus wallets
- ✅ Gas sponsorship via Biconomy Paymaster
- ✅ ERC-4337 UserOperations

## 🎯 **Test Scenarios**

### **Phase 1: Single Chain (Base Sepolia)**

| Script | Scenario | Status |
|--------|----------|--------|
| `01-native-token-transfer.ts` | ETH transfer using Nexus | ✅ Ready |
| `02-erc20-transfer.ts` | ERC20 token transfer | 🚧 TODO |
| `03-nft-purchase-seaport.ts` | NFT purchase via Seaport | 🚧 TODO |
| `04-invisible-signing.ts` | Invisible signing (no UI popup) | 🚧 TODO |
| `05-gas-sponsorship.ts` | Gas sponsorship with paymaster | 🚧 TODO |

### **Phase 2: Multi-Chain (Future)**

- Cross-chain token transfers
- Cross-chain NFT operations
- Multi-chain gas sponsorship

## 🚀 **Quick Start**

### **Prerequisites**

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values:
# - MIGRATION_TEST_OWNER_PK (for testing)
# - BASE_SEPOLIA_RPC_URL
# - PAYMASTER_API_KEY (Biconomy)
# - NEXUS_BUNDLER_URL (V3 bundler)
```

### **Run Test Scenarios**

```bash
# 1. Native token transfer (ETH)
MIGRATION_TEST_OWNER_PK=0x... npx hardhat run scripts/biconomy-migration/sample-app/01-native-token-transfer.ts --network base_sepolia

# 2. ERC20 transfer
MIGRATION_TEST_OWNER_PK=0x... npx hardhat run scripts/biconomy-migration/sample-app/02-erc20-transfer.ts --network base_sepolia

# 3. NFT purchase via Seaport
MIGRATION_TEST_OWNER_PK=0x... npx hardhat run scripts/biconomy-migration/sample-app/03-nft-purchase-seaport.ts --network base_sepolia

# 4. Invisible signing
MIGRATION_TEST_OWNER_PK=0x... npx hardhat run scripts/biconomy-migration/sample-app/04-invisible-signing.ts --network base_sepolia

# 5. Gas sponsorship
MIGRATION_TEST_OWNER_PK=0x... npx hardhat run scripts/biconomy-migration/sample-app/05-gas-sponsorship.ts --network base_sepolia
```

## 📚 **Key Learnings from Migration**

### **✅ What We Know Works:**

1. **AbstractJS SDK (`@biconomy/abstractjs`)**
   - Perfect for migrated wallets
   - Full ERC-4337 support
   - Gas sponsorship via paymaster
   - Custom nonce management

2. **Nonce Preservation**
   - EntryPoint nonce (key=0) is preserved across migration
   - Passport's internal nonce is NOT preserved (expected)
   - No security issues with nonce reset

3. **Address Preservation**
   - Wallet address remains constant
   - Balance preserved
   - Transaction history preserved

### **❌ Known Limitations:**

1. **Supertransactions SDK (`@biconomy/account`)**
   - ❌ AA23 validation error with migrated wallets
   - ✅ Works with native Nexus wallets only
   - **Recommendation:** Use `@biconomy/abstractjs` for migrations

2. **Supertransactions REST API**
   - ❌ Base Sepolia (84532) not supported
   - ✅ Works with mainnet chains (e.g., Arbitrum 42161)
   - Awaiting Biconomy team response

## 🔧 **Configuration**

See `config.json` for:
- Network settings (Base Sepolia)
- Contract addresses (Nexus, Factory, Validators)
- Bundler URLs (V2 and V3)
- Test token addresses

## 📖 **Documentation References**

- [Biconomy AbstractJS Docs](https://docs.biconomy.io/abstractjs)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Seaport Protocol](https://docs.opensea.io/reference/seaport-overview)
- [Migration Guide](../README.md)

## 🐛 **Troubleshooting**

### **Common Issues:**

1. **"Wallet not initialized"**
   - Run migration script first: `03-migrate-passport-to-nexus.ts`

2. **"Insufficient funds for gas"**
   - Ensure wallet has ETH on Base Sepolia
   - Or enable gas sponsorship via paymaster

3. **"AA23 validation error"**
   - You're using `@biconomy/account` instead of `@biconomy/abstractjs`
   - Switch to AbstractJS SDK

## 🎯 **Next Steps**

- [ ] Complete Phase 1 (single chain scenarios)
- [ ] Test with production wallets
- [ ] Expand to Phase 2 (multi-chain)
- [ ] Build frontend demo app

