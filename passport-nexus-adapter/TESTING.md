# Testing Guide

## 🧪 How to Test the PassportNexusAdapter

This guide walks you through testing the adapter with the Passport sample-app.

---

## 📋 Prerequisites

1. ✅ Both repositories cloned side-by-side:
   ```
   ~/Projects/immutable/
   ├── wallet-contracts/              ← This repo
   │   └── passport-nexus-adapter/    ← The adapter
   └── ts-immutable-sdk/              ← Passport SDK
       └── packages/passport/sdk-sample-app/
   ```

2. ✅ Node.js v18+ installed
3. ✅ Test wallet with funds on Base Mainnet
4. ✅ Biconomy API keys

---

## 🔧 Setup Steps

### Step 1: Build and Link Adapter

```bash
# Navigate to adapter
cd ~/Projects/immutable/wallet-contracts/passport-nexus-adapter

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link

# Verify link
ls -la $(npm root -g)/@immutable/passport-nexus-adapter
```

### Step 2: Link in Sample App

```bash
# Navigate to sample-app
cd ~/Projects/immutable/ts-immutable-sdk/packages/passport/sdk-sample-app

# Link adapter
npm link @immutable/passport-nexus-adapter

# Verify link
ls -la node_modules/@immutable/passport-nexus-adapter
```

### Step 3: Configure Environment

Create `.env.local` in sample-app:

```bash
# Base Mainnet
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org

# Biconomy
NEXT_PUBLIC_BUNDLER_URL=https://bundler.biconomy.io/api/v3/8453/nJPK7B3ru...
NEXT_PUBLIC_PAYMASTER_URL=https://paymaster.biconomy.io/api/v2/8453/...

# Nexus Configuration
NEXT_PUBLIC_NEXUS_IMPLEMENTATION=0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90

# Test wallet (secure - never commit!)
NEXT_PUBLIC_OWNER_PK=0x...
```

---

## 🎮 Integration Code

### Modify `connectZkEvm` in PassportProvider

Edit `src/context/PassportProvider.tsx` and modify the `connectZkEvm` callback (around line 77):

**BEFORE:**
```typescript
const connectZkEvm = useCallback(async () => {
  setIsLoading(true);
  const provider = await passportClient.connectEvm();
  if (provider) {
    setZkEvmProvider(provider);
    addMessage('ConnectZkEvm', 'Connected');
  } else {
    addMessage('ConnectZkEvm', 'Failed to connect');
  }
  setIsLoading(false);
}, [passportClient, setIsLoading, addMessage]);
```

**AFTER (with Adapter):**
```typescript
const connectZkEvm = useCallback(async () => {
  setIsLoading(true);
  const provider = await passportClient.connectEvm();
  
  if (provider) {
    // 🆕 Wrap provider with adapter for automatic Nexus routing
    try {
      const { PassportNexusAdapter } = await import('@immutable/passport-nexus-adapter');
      const { Wallet } = await import('ethers');
      
      const adapter = new PassportNexusAdapter({
        nexusConfig: {
          nexusImplementation: process.env.NEXT_PUBLIC_NEXUS_IMPLEMENTATION!,
          rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
          bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL!,
          chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453),
        },
        signer: new Wallet(process.env.NEXT_PUBLIC_OWNER_PK!),
        debug: true,
      });
      
      const wrappedProvider = adapter.wrapProvider(provider);
      setZkEvmProvider(wrappedProvider);
      addMessage('ConnectZkEvm', 'Connected (with Nexus adapter)');
    } catch (error) {
      console.error('Failed to wrap provider:', error);
      // Fallback: use original provider if adapter fails
      setZkEvmProvider(provider);
      addMessage('ConnectZkEvm', 'Connected (fallback to native)');
    }
  } else {
    addMessage('ConnectZkEvm', 'Failed to connect');
  }
  
  setIsLoading(false);
}, [passportClient, setIsLoading, addMessage]);
```

### Why This Approach?

| Aspect | Benefit |
|--------|---------|
| ✅ **Uses existing architecture** | Modifies `connectZkEvm` callback, not adding new code |
| ✅ **Lazy loading** | Only loads adapter when user clicks "Connect" |
| ✅ **Fallback safe** | If adapter fails, uses native Passport provider |
| ✅ **No breaking changes** | If adapter not installed, sample-app still works |
| ✅ **Uses existing state** | `zkEvmProvider` already used throughout the app |
| ✅ **Dynamic imports** | Keeps bundle small, loads adapter on demand |

---

## 🚀 Run Tests

### Start Sample App

```bash
cd ~/Projects/immutable/ts-immutable-sdk/packages/passport/sdk-sample-app
npm run dev
```

Open http://localhost:3000

---

## ✅ Test Scenarios

### Test 1: Native Passport Wallet

1. Login to sample-app
2. Connect wallet (not migrated)
3. Go to "ZkEvm Workflow"
4. Select "Transfer IMX" or "Transfer ERC20"
5. Execute transaction

**Expected:**
- ✅ Console log: `[PassportNexusAdapter] Wallet type: NATIVE_PASSPORT`
- ✅ Console log: `[PassportNexusAdapter] 🏛️ Routing to Passport native flow`
- ✅ Transaction executed via Passport

### Test 2: Migrated Nexus Wallet

1. Login to sample-app
2. Connect wallet (already migrated to Nexus)
3. Go to "ZkEvm Workflow"
4. Select "Transfer IMX" or "Transfer ERC20"
5. Execute transaction

**Expected:**
- ✅ Console log: `[PassportNexusAdapter] Wallet type: MIGRATED_NEXUS`
- ✅ Console log: `[PassportNexusAdapter] 📦 Routing to Nexus flow (AbstractJS + Bundler)`
- ✅ Transaction executed via Nexus + Biconomy

### Test 3: All Transaction Types

Test with migrated wallet:

- ✅ Transfer IMX
- ✅ Transfer ERC20
- ✅ Default Transaction
- ✅ NFT Transfer
- ✅ NFT Approval
- ✅ Seaport Listing
- ✅ Spending Cap Approval

All should route to Nexus automatically!

---

## 🐛 Debugging

### Enable Debug Logging

Set `debug: true` in adapter config:

```typescript
const adapter = new PassportNexusAdapter({
  // ...
  debug: true, // ← Enable detailed logs
});
```

### Check Detection

```typescript
// After wrapping provider
const detection = await adapter.getCachedWalletType(walletAddress);
console.log('Cached detection:', detection);
```

### Clear Cache (After Migration)

```typescript
// If you migrate a wallet during testing
adapter.clearCache(walletAddress);
```

---

## 📊 Expected Output

### Console Logs (Native Passport)

```
[PassportNexusAdapter] 🔍 Transaction detected
[PassportNexusAdapter] From: 0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6
[PassportNexusAdapter] To: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
[WalletDetector] Implementation at 0x846A51...: 0x7838C041DfbFE80adE919aB6ec9EA10E124eE8ea
[WalletDetector] ✅ Detected 0x846A51...: NATIVE_PASSPORT
[PassportNexusAdapter] Wallet type: NATIVE_PASSPORT
[PassportNexusAdapter] 🏛️ Routing to Passport native flow
[PassportNexusAdapter] ✅ Passport execution complete: 0x123...
```

### Console Logs (Migrated Nexus)

```
[PassportNexusAdapter] 🔍 Transaction detected
[PassportNexusAdapter] From: 0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6
[PassportNexusAdapter] To: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
[WalletDetector] Implementation at 0x846A51...: 0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90
[WalletDetector] ✅ Detected 0x846A51...: MIGRATED_NEXUS
[PassportNexusAdapter] Wallet type: MIGRATED_NEXUS
[PassportNexusAdapter] 📦 Routing to Nexus flow (AbstractJS + Bundler)
[NexusExecutor] 🚀 Executing via Nexus (ERC-4337)...
[NexusExecutor] Viem account: 0xeDC117...
[NexusExecutor] Chain: Base (8453)
[NexusExecutor] Nexus account created: 0x846A51...
[NexusExecutor] ✅ UserOp submitted: 0xabc...
[NexusExecutor] ✅ Transaction mined: 0x456...
[PassportNexusAdapter] ✅ Nexus execution complete: 0x456...
```

---

## 🎉 Success Criteria

- ✅ Adapter detects wallet type correctly
- ✅ Native Passport wallets use Passport flow
- ✅ Migrated Nexus wallets use AbstractJS flow
- ✅ All transaction types work
- ✅ Confirmation UI appears for both flows
- ✅ No breaking changes to existing code

---

## 🆘 Common Issues

### Issue: "Cannot find module '@immutable/passport-nexus-adapter'"

**Solution:**
```bash
# Re-link adapter
cd passport-nexus-adapter && npm link
cd ../ts-immutable-sdk/packages/passport/sdk-sample-app && npm link @immutable/passport-nexus-adapter
```

### Issue: "Signer does not expose private key"

**Solution:** Make sure you're using `ethers.Wallet`, not other signer types.

### Issue: Adapter always uses Passport flow

**Solution:** Check that `NEXT_PUBLIC_NEXUS_IMPLEMENTATION` matches the actual implementation address of your migrated wallet.

---

## 📝 Next Steps

After successful testing:

1. ✅ Document test results
2. ✅ Create demo video
3. ✅ Prepare PR for Passport SDK (if integrating natively)
4. ✅ Publish to NPM (if standalone package)
5. ✅ Update Milestone 2 documentation

---

**Happy Testing!** 🚀

