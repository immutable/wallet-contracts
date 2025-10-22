# 🎯 Test Wallets for Milestone 2

**Purpose:** These wallets are used to validate the `PassportNexusAdapter` routing logic.

---

## 📊 Wallet Matrix

| # | Type | Wallet Address | Owner | Implementation | Network | Notes |
|---|------|---------------|-------|----------------|---------|-------|
| 1️⃣ | **Migrated Passport→Nexus** | `0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6` | `0xeDC117090236293afEBb179260e8B9dd5bffe4dC` | `0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90` (Nexus) | **Base Mainnet** | ✅ Test migrated Nexus routing |
| 2️⃣ | **Native Passport** | `0x4fDF94c71361aA647E0450b6050a3bf340D84500` | `0x7b3b709F66217a3B02497F1d3bDd504D2bc497EA` | `0x7838C041DfbFE80adE919aB6ec9EA10E124eE8ea` (MainModule) | **Base Mainnet** | ✅ Test Passport routing |
| 3️⃣ | **Native Nexus** | `0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B` | `0xeDC117090236293afEBb179260e8B9dd5bffe4dC` | `0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90` (Nexus) | **Base Mainnet + Sepolia** | ✅ Test native Nexus routing |

---

## 1️⃣ Wallet #1: Migrated Passport→Nexus

### Basic Info
- **Type:** Migrated (Passport → Nexus)
- **Address:** `0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6`
- **Owner:** `0xeDC117090236293afEBb179260e8B9dd5bffe4dC`
- **Network:** Base Mainnet (8453)

### Implementation
- **Current:** `0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90` (Biconomy Nexus)
- **Original:** `0x7838C041DfbFE80adE919aB6ec9EA10E124eE8ea` (MainModuleDynamicAuth)

### Migration Details
- **Transaction:** [`0x9b68eb960d64f6be7d106bd6d561ff0e891c7e842448518ee7c271bb930a1f4d`](https://basescan.org/tx/0x9b68eb960d64f6be7d106bd6d561ff0e891c7e842448518ee7c271bb930a1f4d)
- **Block:** 36961067
- **Date:** October 17, 2025
- **Gas Used:** 99,478

### Test Results (Milestone 1)
✅ All 6 tests passed:
- ✅ Native token transfer
- ✅ ERC20 transfer (USDC)
- ✅ NFT transfer
- ✅ Invisible signing (batch)
- ✅ Gas sponsorship (Paymaster)
- ✅ NFT purchase (OpenSea/Seaport)

### Expected Adapter Behavior
```typescript
WalletDetector.detect() → WalletType.MIGRATED_NEXUS
→ Route to: NexusExecutor
→ Uses: @biconomy/abstractjs + Bundler + Paymaster
```

### BaseScan
[View on BaseScan](https://basescan.org/address/0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6)

---

## 2️⃣ Wallet #2: Native Passport

### Basic Info
- **Type:** Native Passport (NOT migrated)
- **Address:** `0x4fDF94c71361aA647E0450b6050a3bf340D84500`
- **Owner:** `0x7b3b709F66217a3B02497F1d3bDd504D2bc497EA`
- **Private Key (TEST ONLY):** `0x406b76fcb6c62d36478c003f11f537d263cd42171e7ac3f0d66e821398fb4327`
- **Network:** Base Mainnet (8453)

### Implementation
- **Current:** `0x7838C041DfbFE80adE919aB6ec9EA10E124eE8ea` (MainModuleDynamicAuth)
- **Salt (imageHash):** `0xce537158a7e671468d650d3c03f68705c3c84cacad6dace019976994b403c5a7`

### Deployment Details
- **Transaction:** [`0x709ddeab4c5c95a6898a88c0831d075d11061d5ac17db7451bd5c24ffaad8f2d`](https://basescan.org/tx/0x709ddeab4c5c95a6898a88c0831d075d11061d5ac17db7451bd5c24ffaad8f2d)
- **Block:** 37074522
- **Date:** October 20, 2025
- **Gas Used:** 215,716
- **Initial Balance:** 0.0019 ETH

### Expected Adapter Behavior
```typescript
WalletDetector.detect() → WalletType.NATIVE_PASSPORT
→ Route to: originalProvider.request()
→ Uses: Passport SDK's native flow (ModuleCalls)
```

### BaseScan
[View on BaseScan](https://basescan.org/address/0x4fDF94c71361aA647E0450b6050a3bf340D84500)

---

## 3️⃣ Wallet #3: Native Nexus (Multi-Chain)

### Basic Info
- **Type:** Native Nexus (deployed directly with Biconomy SDK)
- **Address:** `0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B`
- **Owner:** `0xeDC117090236293afEBb179260e8B9dd5bffe4dC`
- **Networks:** 
  - ✅ Base Mainnet (8453) - [View on BaseScan](https://basescan.org/address/0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B)
  - ✅ Base Sepolia (84532) - [View on Sepolia BaseScan](https://sepolia.basescan.org/address/0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B)

### Implementation
- **Current:** `0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90` (Biconomy Nexus)
- **Note:** This wallet was NEVER a Passport wallet - deployed natively as Nexus

### Deployment Details (Base Sepolia)
- **SDK:** `@biconomy/account` (createSmartAccountClient)
- **Transaction:** [`0xabd62ade9e007eba42b1d0642d426106271fcbbf258b4fc9777c498f4e700091`](https://sepolia.basescan.org/tx/0xabd62ade9e007eba42b1d0642d426106271fcbbf258b4fc9777c498f4e700091)
- **Block:** 32486448
- **Date:** October 17, 2025
- **Gas Used:** 107,558

### Balances
- **Base Mainnet:** ~0.00197 ETH
- **Base Sepolia:** ~0.00197 ETH

### Expected Adapter Behavior
```typescript
WalletDetector.detect() → WalletType.NATIVE_NEXUS (or MIGRATED_NEXUS)
→ Route to: NexusExecutor
→ Uses: @biconomy/abstractjs + Bundler + Paymaster
```

### Notes
- ✅ Deployed on **BOTH** Base Mainnet and Base Sepolia
- 🎯 Same address across chains (deterministic deployment)
- This wallet validates that the adapter correctly identifies Nexus implementation
- From adapter's perspective, routing is identical to migrated wallet (both use Nexus)
- **Perfect for multi-chain testing!**

---

## 🧪 Testing Strategy

### Test Case 1: Migrated Wallet (Wallet #1)
```typescript
// Should detect as MIGRATED_NEXUS and use Nexus flow
const wallet = '0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6';
const detected = await adapter.detectWalletType(wallet);
expect(detected).toBe(WalletType.MIGRATED_NEXUS);
// Transaction should go through Bundler/Paymaster
```

### Test Case 2: Native Passport (Wallet #2)
```typescript
// Should detect as NATIVE_PASSPORT and use Passport flow
const wallet = '0x4fDF94c71361aA647E0450b6050a3bf340D84500';
const detected = await adapter.detectWalletType(wallet);
expect(detected).toBe(WalletType.NATIVE_PASSPORT);
// Transaction should go through original provider
```

### Test Case 3: Native Nexus (Wallet #3)
```typescript
// Should detect as NATIVE_NEXUS (or MIGRATED_NEXUS) and use Nexus flow
const wallet = '0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B';
const detected = await adapter.detectWalletType(wallet);
expect(detected).toBe(WalletType.NATIVE_NEXUS); // or MIGRATED_NEXUS
// Transaction should go through Bundler/Paymaster
// Note: Base Sepolia testnet
```

---

## 🔧 Environment Variables

Add these to your `.env` when testing:

```bash
# Wallet #1 (Migrated)
MIGRATED_WALLET_ADDRESS=0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6
MIGRATED_WALLET_OWNER_PK=0x35a1c7447678194e7a3781bc195f08f1c0faa869d48f7d59e532f0acaf09fe7a

# Wallet #2 (Native Passport)
NATIVE_PASSPORT_WALLET_ADDRESS=0x4fDF94c71361aA647E0450b6050a3bf340D84500
NATIVE_PASSPORT_OWNER_PK=0x406b76fcb6c62d36478c003f11f537d263cd42171e7ac3f0d66e821398fb4327

# Wallet #3 (Native Nexus - Base Sepolia)
NATIVE_NEXUS_WALLET_ADDRESS=0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B
NATIVE_NEXUS_OWNER_PK=0x35a1c7447678194e7a3781bc195f08f1c0faa869d48f7d59e532f0acaf09fe7a

# Common Configuration (Base Mainnet)
RPC_URL=https://mainnet.base.org
BUNDLER_URL=https://bundler.biconomy.io/api/v3/8453/<api-key>
PAYMASTER_URL=https://paymaster.biconomy.io/api/v2/8453/<api-key>
NEXUS_IMPLEMENTATION=0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90

# Base Sepolia Configuration (for Wallet #3)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_BUNDLER_URL=https://bundler.biconomy.io/api/v3/84532/<api-key>
BASE_SEPOLIA_PAYMASTER_URL=https://paymaster.biconomy.io/api/v2/84532/<api-key>
```

---

## 📚 References

### Passport Infrastructure (Base Mainnet)
- **Factory:** `0xc9E44d5a8758B55D35B6898eFB4769bf626d6843`
- **MultiCallDeploy:** `0xcAbE7b2A52D326eeEe886677DCE6D65df7922115`
- **StartupWalletImpl:** `0x7019dF9993cb0B25539cFcc4924e043972C0015c`
- **MainModuleDynamicAuth:** `0x7838C041DfbFE80adE919aB6ec9EA10E124eE8ea`

### Biconomy Components (Official)
- **Nexus Implementation:** `0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90`
- **Bootstrap:** `0x0000003eDf18913c01cBc482C978bBD3D6E8ffA3`
- **K1Validator:** `0x0000000031ef4155C978d48a8A7d4EDba03b04fE`

### Documentation
- [Milestone 1 Results](./mainnet-poc/MAINNET_POC_RESULTS.md)
- [Milestone 2 Documentation](./MILESTONE2.md)
- [Adapter README](./README.md)
- [Testing Guide](./TESTING.md)

---

**Last Updated:** October 20, 2025  
**Status:** 3/3 wallets available ✅  
**Ready for:** Milestone 2 testing with Passport sample-app

---

## 💡 **Note on Wallet Matrix**

For Milestone 2 testing, we have **3 wallets** that cover all necessary scenarios:

1. **Wallet #1 (Migrated Passport→Nexus)** - Base Mainnet
   - Tests detection of MIGRATED wallet
   - Routes to `NexusExecutor`
   - Originally Passport, now Nexus

2. **Wallet #2 (Native Passport)** - Base Mainnet
   - Tests detection of NATIVE PASSPORT wallet
   - Routes to original provider (Passport SDK)
   - Never migrated

3. **Wallet #3 (Native Nexus)** - Base Sepolia
   - Tests detection of NATIVE NEXUS wallet
   - Routes to `NexusExecutor`
   - Deployed natively as Nexus (never was Passport)

### Key Differences:
- **Wallet #1 vs #3**: Both route to Nexus, but #1 was migrated (has history as Passport) while #3 was always Nexus
- **Network Split**: Wallets #1 and #2 are on Base Mainnet, Wallet #3 is on Base Sepolia
- **Detection Logic**: Adapter should identify all 3 correctly based on implementation address in storage slot 0

