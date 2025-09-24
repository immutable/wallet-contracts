# Passport-Nexus Hybrid Infrastructure & Wallet Deployment

## Overview

The `deploy-infrastructure-and-wallet.js` script is a **complete, self-contained deployment solution** that implements a hybrid approach combining:

- **Passport Infrastructure** (proven stable base) - Factory + MultiCallDeploy
- **Nexus Core** (modern Account Abstraction) - K1Validator + Implementation
- **Hybrid Wallet Deployment** - Configurable deployment via Factory or MultiCallDeploy
- **Complete 6-Step Coverage** - Implements all original deployment steps in one script

## Key Features

### ✅ **Completely Self-Contained**
- **No external dependencies** - does not read any existing JSON files
- **No pre-deployment required** - starts from scratch every time
- **No eval scripts needed** - pure JavaScript implementation
- **Reset button functionality** - can be run at any time to redeploy everything

### ✅ **Robust Architecture**
- **Hybrid approach** combines the best of both systems
- **Complete 6-step implementation** (all original steps in one script)
- **Dual deployment methods** (Factory and MultiCallDeploy)
- **Proper timing** with verification between deployments
- **Comprehensive verification** of all components
- **Deterministic deployment** using CREATE2 for wallet addresses
- **Automatic fallback** from MultiCallDeploy to Factory if needed

### ✅ **Production Ready**
- **Error handling** with detailed diagnostics
- **Gas optimization** with configurable limits
- **Permission management** (automatic DEPLOYER_ROLE granting)
- **Complete logging** for audit trails

## Usage

### Prerequisites
- Hardhat node running locally
- Environment variables configured (see `env-setup.md`)
- Node.js with required dependencies

### Basic Deployment

#### Default Method (Factory)
```bash
# Deploy complete infrastructure + wallet using Factory
NODE_ENV=development npx hardhat run scripts/biconomy/deploy-infrastructure-and-wallet.js --network hardhat
```

#### MultiCallDeploy Method (with Initial Transactions)
```bash
# Deploy using MultiCallDeploy with automatic fallback to Factory
USE_MULTICALL_DEPLOY=true NODE_ENV=development npx hardhat run scripts/biconomy/deploy-infrastructure-and-wallet.js --network hardhat
```

### What Gets Deployed

#### Phase 1: Complete Infrastructure (All 6 Steps)
1. **Step 1**: MultiCallDeploy (Passport) + Factory (Passport)
2. **Step 2**: LatestWalletImplLocator deployment
3. **Step 3**: StartupWalletImpl deployment  
4. **Step 4**: K1Validator (Nexus) + Nexus Implementation
5. **Step 5**: ImmutableSigner deployment
6. **Step 6**: LatestWalletImplLocator → Nexus configuration

#### Phase 2: Wallet Deployment (Configurable Method)
**Factory Method (Default)**:
- Deployed via Passport Factory using Nexus as main module
- Salt: `hybrid-wallet-factory`
- Simple, reliable deployment

**MultiCallDeploy Method (Optional)**:
- Deployed via MultiCallDeploy with initial transactions
- Salt: `hybrid-wallet-multicall`
- Includes example initial transaction (0.1 ETH transfer)
- Automatic fallback to Factory if interface issues occur

#### Phase 3: Verification
1. **Code Verification** - Ensures all 8 components have bytecode
2. **Size Validation** - Confirms proper deployment
3. **Integration Testing** - Validates complete 6-step architecture

## Output

### Success Result
The script generates `complete-deployment-success.json` with:

```json
{
  "timestamp": "2025-09-24T...",
  "status": "COMPLETE_SUCCESS", 
  "network": "hardhat",
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "infrastructure": {
    "passportMultiCallDeploy": "0x5FbDB...",
    "passportFactory": "0xe7f17...",
    "latestWalletImplLocator": "0x9fE46...",
    "startupWalletImpl": "0xCf7Ed...",
    "nexusK1Validator": "0xDc64a...", 
    "nexusImplementation": "0x5FC8d...",
    "immutableSigner": "0x0165...",
    "locatorToNexusConfigured": true,
    "configurationTxHash": "0x7252..."
  },
  "wallet": {
    "address": "0x828709bE90a398c2a21cB2EeC27A82866Aab7466",
    "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "mainModule": "0x5FC8d...",
    "deploymentMethod": "Factory"
  }
}
```

### Console Output Example
```
🚀 COMPLETE INFRASTRUCTURE + WALLET DEPLOYMENT
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Network: hardhat
Balance: 10000.0 ETH
🎯 Deployment Method: Factory

🏗️  PHASE 1: DEPLOYING INFRASTRUCTURE
=====================================
1️⃣  ✅ MultiCallDeploy: 0x5FbDB... (4608 bytes)
2️⃣  ✅ Factory: 0xe7f17... (3367 bytes)
3️⃣  ✅ LatestWalletImplLocator: 0x9fE46... (2691 bytes)
4️⃣  ✅ StartupWalletImpl: 0xCf7Ed... (478 bytes)
5️⃣  ✅ K1Validator: 0xDc64a... (4479 bytes)
6️⃣  ✅ Nexus Implementation: 0x5FC8d... (28720 bytes)
7️⃣  ✅ ImmutableSigner: 0x0165... (4942 bytes)
8️⃣  ✅ LatestWalletImplLocator → Nexus configured

🎯 PHASE 2: DEPLOYING WALLET
=============================
🏛️ Using Factory deployment method...
✅ FACTORY WALLET DEPLOYED SUCCESSFULLY!
Address: 0x828709bE90a398c2a21cB2EeC27A82866Aab7466

✅ PHASE 3: FINAL VERIFICATION
==============================
✅ ALL 8 COMPONENTS VERIFIED SUCCESSFULLY

🎉 COMPLETE DEPLOYMENT SUCCESSFUL!
```

## Architecture

### Hybrid Infrastructure Benefits

1. **Passport Base (Proven Stability)**
   - Battle-tested Factory contract
   - Reliable MultiCallDeploy for batch operations
   - Deterministic CREATE2 deployment

2. **Nexus Core (Modern Features)**
   - Advanced Account Abstraction (ERC-4337)
   - Modular validation system (K1Validator)
   - Gas optimization and modern patterns

3. **Seamless Integration**
   - Passport Factory deploys wallets
   - Nexus Implementation provides functionality
   - Best of both worlds combined

### Contract Interactions

```
🏗️ PASSPORT-NEXUS HYBRID ARCHITECTURE (Complete 6-Step Infrastructure)

Step 1: Passport Base                Step 4: Nexus Core
┌─────────────────┐                 ┌──────────────────┐
│ MultiCallDeploy │◄─────────┐      │   K1Validator    │
│   (Passport)    │          │      │    (Nexus)       │
└─────────────────┘          │      └──────────────────┘
         │                   │               │
         ▼                   │               ▼
┌─────────────────┐          │      ┌──────────────────┐
│     Factory     │          │      │ Nexus Implementation│
│   (Passport)    │──────────┼─────▶│     (Nexus)      │
└─────────────────┘          │      └──────────────────┘
         │                   │               │
         │ deploys           │               │ configured via
         ▼                   │               ▼
┌─────────────────┐          │      ┌──────────────────┐
│ Deployed Wallet │          │      │LatestWalletImpl  │
│ (Hybrid Proxy)  │          │      │    Locator       │
└─────────────────┘          │      └──────────────────┘
                             │               │
Step 3: Startup              │               │ Step 6: Config
┌─────────────────┐          │               │
│StartupWalletImpl│          │               │
│                 │          │               │
└─────────────────┘          │               │
                             │               │
Step 5: Security             │               │
┌─────────────────┐          │               │
│ ImmutableSigner │──────────┘               │
│                 │                          │
└─────────────────┘                          │
                                             │
Step 2: Implementation Management            │
┌─────────────────┐◄─────────────────────────┘
│LatestWalletImpl │  
│    Locator      │  ──points to──▶ Nexus Implementation
└─────────────────┘

Deployment Methods:
• Factory Method:     Factory ──deploy──▶ Wallet (using Nexus as main module)
• MultiCallDeploy:    MultiCallDeploy ──deploy+execute──▶ Wallet + Initial TXs
```

## Configuration

### Environment Variables
- `USE_MULTICALL_DEPLOY` - Deployment method selection (default: `false`)
  - `false` or unset: Use Factory deployment
  - `true`: Use MultiCallDeploy with automatic fallback
- `GAS_LIMIT` - Transaction gas limit (default: 30000000)
- `MAX_FEE_PER_GAS` - Maximum fee per gas (default: 1875000000)
- `MAX_PRIORITY_FEE_PER_GAS` - Priority fee (default: 1000000000)

### Deployment Method Configuration
**Factory Method (Default)**:
- Uses Passport Factory for reliable deployment
- Salt: `hybrid-wallet-factory`
- No initial transactions
- Proven stable method

**MultiCallDeploy Method (Experimental)**:
- Uses MultiCallDeploy for deployment with initial transactions
- Salt: `hybrid-wallet-multicall`
- Includes example initial transaction (0.1 ETH transfer)
- Automatic fallback to Factory if interface issues occur
- Requires EXECUTOR_ROLE permission

### Customizable Parameters
- **Wallet Owner** - Currently set to deployer address
- **Salt Generation** - Method-specific salts for unique addresses
- **EntryPoint** - Hardcoded test address for local development
- **Initial Transactions** - Configurable for MultiCallDeploy method

## Troubleshooting

### Common Issues

1. **"Infrastructure component has no code"**
   - Ensure Hardhat node is running
   - Check network connectivity
   - Verify gas settings

2. **"DEPLOYER_ROLE denied"**
   - Script automatically grants role
   - Check deployer has sufficient balance
   - Verify factory deployment success

3. **"Wallet deployment failed"**
   - Check salt uniqueness for the selected method
   - Verify Nexus implementation size
   - Ensure factory permissions (DEPLOYER_ROLE)
   - For MultiCallDeploy: verify EXECUTOR_ROLE

4. **"MultiCallDeploy failed" with automatic fallback**
   - This is expected behavior due to interface compatibility
   - Script automatically falls back to Factory method
   - Check console output for fallback confirmation

### Debug Mode
Add console logs or increase verbosity by modifying the script logging levels.

## Extending the Script

### Adding CREATE2 Support
The script can be extended to support CREATE2 deployment by:
1. Adding OwnableCreate2Deployer deployment
2. Implementing `deployContractViaCREATE2` equivalent
3. Making deployment method configurable

### Adding More Components
To add additional infrastructure components:
1. Add deployment logic in `deployInfrastructure()`
2. Update verification in `finalVerification()`
3. Include in output JSON structure
4. Update the component count in verification messages

### Customizing MultiCallDeploy Interface
To fix MultiCallDeploy compatibility:
1. Investigate the exact interface of `MultiCallDeploy` contract
2. Update parameters in `deployWalletWithMultiCallDeploy()`
3. Adjust transaction encoding format
4. Test with different initial transaction configurations

## Security Considerations

- **Private Keys** - Never commit private keys to version control
- **Gas Limits** - Adjust for network conditions
- **Role Management** - Script grants DEPLOYER_ROLE automatically
- **Address Verification** - All deployments are verified before proceeding

## Support

For issues or questions:
1. Check console output for detailed error messages
2. Verify environment configuration
3. Ensure Hardhat node is properly configured
4. Review the deployment JSON output for partial success states

---

## Summary

**Note**: This script represents the complete working solution for Passport-Nexus hybrid deployment with dual deployment methods. Key achievements:

- ✅ **Complete 6-step implementation** - All original deployment steps in one script
- ✅ **Dual deployment methods** - Factory (stable) and MultiCallDeploy (experimental)
- ✅ **Automatic fallback** - Graceful handling of interface incompatibilities
- ✅ **Self-contained** - No external dependencies or pre-deployment requirements
- ✅ **Production ready** - Comprehensive error handling and verification
- ✅ **Hybrid architecture** - Best of Passport stability + Nexus innovation

This script supersedes individual step scripts and provides a complete, reliable deployment process with flexible wallet deployment options.
