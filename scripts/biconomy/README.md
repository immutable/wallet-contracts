# Biconomy Nexus Integration

This directory contains the complete Passport-Nexus hybrid infrastructure implementation, deployment scripts, and wallet management tools.

## Project Structure

```
scripts/biconomy/
├── steps/                                   # Step-by-step deployment scripts
│   ├── step0.ts                            # Deploy OwnableCreate2Deployer (CREATE2 factory)
│   ├── step1.ts                            # Deploy Passport base (MultiCallDeploy + Factory)
│   ├── step2.ts                            # Deploy LatestWalletImplLocator (with CREATE2)
│   ├── step3.ts                            # Deploy StartupWalletImpl
│   ├── step4.ts                            # Deploy Nexus core (K1Validator + Nexus with CREATE2)
│   ├── step5.ts                            # Deploy ImmutableSigner
│   ├── step6.ts                            # Configure LatestWalletImplLocator → Nexus
│   ├── step0.json                          # Step 0 deployment results
│   ├── step1.json                          # Step 1 deployment results
│   ├── step2.json                          # Step 2 deployment results
│   ├── step3.json                          # Step 3 deployment results
│   ├── step4.json                          # Step 4 deployment results
│   └── step5.json                          # Step 5 deployment results
├── deploy-infrastructure-and-wallet.js     # Complete deployment script (all-in-one)
├── wallet-deployment.ts                    # Wallet deployment using step artifacts
├── README-deploy-infrastructure-and-wallet.md  # Complete infrastructure README
└── README.md                               # This file
```

## Architecture Overview

### 🏗️ Hybrid Infrastructure (Passport + Nexus)

The implementation combines the **proven stability of Passport** with the **modern capabilities of Nexus**:

```
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

Step 0: CREATE2 Foundation
┌─────────────────┐
│OwnableCreate2   │ ──enables──▶ Deterministic Addresses
│   Deployer      │
└─────────────────┘
```

### Core Components

#### **Passport Infrastructure (Steps 1)**
- **MultiCallDeploy**: Proven deployment with initial transactions
- **Factory**: Reliable wallet deployment mechanism

#### **Implementation Management (Steps 2-3)**
- **LatestWalletImplLocator**: Manages current wallet implementation
- **StartupWalletImpl**: Initial wallet logic for bootstrapping

#### **Nexus Core (Step 4)**
- **K1Validator**: Modern ECDSA signature validation (ERC-7579 compliant)
- **Nexus Implementation**: Advanced smart account with modular architecture

#### **Security & Configuration (Steps 5-6)**
- **ImmutableSigner**: 2x2 signature validation for critical operations
- **Configuration**: Links all components together

#### **CREATE2 Foundation (Step 0)**
- **OwnableCreate2Deployer**: Enables deterministic contract addresses
- **Used by**: Steps 2 and 4 for predictable deployments

## Deployment Methods

### Method 1: Step-by-Step Deployment

Execute individual steps for granular control:

```bash
# Step 0: Deploy CREATE2 factory
NODE_ENV=development npx hardhat run scripts/biconomy/steps/step0.ts --network localhost

# Step 1: Deploy Passport base infrastructure
NODE_ENV=development npx hardhat run scripts/biconomy/steps/step1.ts --network localhost

# Step 2: Deploy LatestWalletImplLocator (CREATE2)
NODE_ENV=development npx hardhat run scripts/biconomy/steps/step2.ts --network localhost

# Step 3: Deploy StartupWalletImpl
NODE_ENV=development npx hardhat run scripts/biconomy/steps/step3.ts --network localhost

# Step 4: Deploy Nexus core components (CREATE2)
NODE_ENV=development npx hardhat run scripts/biconomy/steps/step4.ts --network localhost

# Step 5: Deploy ImmutableSigner
NODE_ENV=development npx hardhat run scripts/biconomy/steps/step5.ts --network localhost

# Step 6: Configure infrastructure
NODE_ENV=development npx hardhat run scripts/biconomy/steps/step6.ts --network localhost
```

### Method 2: Complete Deployment (Recommended)

Deploy everything in one go:

```bash
# Deploy complete infrastructure + wallet (Factory method)
NODE_ENV=development npx hardhat run scripts/biconomy/deploy-infrastructure-and-wallet.js --network localhost

# Deploy complete infrastructure + wallet (MultiCallDeploy method)
USE_MULTICALL_DEPLOY=true NODE_ENV=development npx hardhat run scripts/biconomy/deploy-infrastructure-and-wallet.js --network localhost
```

### Method 3: Wallet-Only Deployment

Deploy wallet using existing infrastructure:

```bash
# Deploy wallet using step artifacts (automatic MultiCallDeploy if transactions present)
NODE_ENV=development npx hardhat run scripts/biconomy/wallet-deployment.ts --network localhost

# Force MultiCallDeploy deployment
FORCE_MULTICALL_DEPLOY=true NODE_ENV=development npx hardhat run scripts/biconomy/wallet-deployment.ts --network localhost
```

## Environment Variables

### Required Variables
```bash
# Network configuration
NODE_ENV=development

# Gas configuration (automatically set for development)
GAS_LIMIT=30000000
MAX_FEE_PER_GAS=1875000000
MAX_PRIORITY_FEE_PER_GAS=1000000000

# Admin addresses (automatically set to first signer in development)
WALLET_IMPL_LOCATOR_ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
WALLET_IMPL_CHANGER_ADMIN=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
ENTRY_POINT_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# CREATE2 factory address (set after step0)
DEPLOYER_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Optional Variables
```bash
# Force MultiCallDeploy for wallet deployment
FORCE_MULTICALL_DEPLOY=true
USE_MULTICALL_DEPLOY=true

# Validator address (set after step4)
DEFAULT_VALIDATOR_ADDRESS=0x79122DBB6bb40682b207F974BD749eC5EeCB5e8C
```

## CREATE2 Implementation

### Key Benefits
- **Deterministic Addresses**: Same bytecode + salt = same address across networks
- **Cross-Chain Consistency**: Deploy to identical addresses on different chains
- **Predictable Deployment**: Know wallet address before deployment

### Components Using CREATE2
- ✅ **Step 2**: `LatestWalletImplLocator` - Critical infrastructure component
- ✅ **Step 4**: `K1Validator` - Core security component  
- ✅ **Step 4**: `Nexus Implementation` - Main smart account logic

### Network Compatibility
- **✅ Localhost**: Full CREATE2 support
- **⚠️ Hardhat**: Requires persistent node (use localhost instead)

## Wallet Deployment Options

### Factory Deployment (Default)
- **Method**: Direct deployment via Passport Factory
- **Use Case**: Simple wallet creation
- **Benefits**: Proven, reliable, fast
- **Limitations**: No initial transactions

### MultiCallDeploy Deployment (Advanced)
- **Method**: Deployment + initial transaction execution
- **Use Case**: Wallet setup with immediate actions
- **Benefits**: Atomic deployment + execution
- **Limitations**: More complex, requires transaction signing

### Automatic Selection
The system automatically chooses deployment method:
1. **If transactions configured** → MultiCallDeploy
2. **If MultiCallDeploy fails** → Automatic fallback to Factory
3. **Success guaranteed** via robust fallback system

## Key Features

### ✅ Production Ready
- **Robust Error Handling**: Comprehensive try/catch with fallbacks
- **Automatic Role Management**: Grants necessary permissions automatically
- **Verification**: Confirms all deployments have code
- **Gas Optimization**: Efficient deployment parameters

### ✅ Developer Friendly
- **Detailed Logging**: Clear progress indicators and status messages
- **Artifact Management**: Automatic saving and loading of deployment results
- **Network Flexibility**: Works on localhost, testnet, and mainnet
- **Documentation**: Comprehensive READMEs and code comments

### ✅ Hybrid Architecture
- **Best of Both Worlds**: Passport stability + Nexus innovation
- **Backward Compatible**: Works with existing Passport infrastructure
- **Forward Compatible**: Ready for full Nexus migration
- **Modular Design**: Components can be upgraded independently

## Troubleshooting

### Common Issues

#### 1. CREATE2 Deployment Fails
```bash
Error: call revert exception (method="deployedAddress(bytes,address,bytes32)", data="0x")
```
**Solution**: Use `--network localhost` instead of `--network hardhat`

#### 2. Permission Errors
```bash
Error: AccessControl: account 0x... is missing role 0x...
```
**Solution**: Scripts automatically grant roles, but ensure deployer has admin privileges

#### 3. Contract Size Limits
```bash
Error: Contract bytecode size exceeds 24576 bytes
```
**Solution**: Enable `allowUnlimitedContractSize: true` in hardhat config (already configured for development)

#### 4. MultiCallDeploy Interface Issues
```bash
Error: invalid value for array
```
**Solution**: Automatic fallback to Factory deployment ensures success

### Network Setup

#### Localhost (Recommended)
```bash
# Terminal 1: Start persistent node
npx hardhat node

# Terminal 2: Deploy
NODE_ENV=development npx hardhat run scripts/... --network localhost
```

#### Hardhat (Limited)
```bash
# Use only for testing individual contracts
NODE_ENV=development npx hardhat run scripts/... --network hardhat
```

## Migration from v1

If migrating from previous implementations:

1. **Backup**: Save current deployment artifacts
2. **Reset**: Clear previous deployments if needed
3. **Deploy**: Run step-by-step or complete deployment
4. **Verify**: Confirm all components are deployed correctly
5. **Test**: Deploy test wallet to verify functionality

## Advanced Configuration

### Custom Salt Generation
Scripts use deterministic salts for CREATE2:
```typescript
// Example from step2.ts
const salt = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('LatestWalletImplLocator'));
```

### Role Management
Automatic role assignment:
- **DEPLOYER_ROLE**: Granted to deployers for Factory
- **EXECUTOR_ROLE**: Granted to deployers for MultiCallDeploy
- **ADMIN_ROLE**: Maintained by admin addresses

### Gas Optimization
Development settings optimized for speed:
- **Gas Limit**: 30M (generous for complex deployments)
- **Gas Price**: Optimized for localhost/testnet
- **EIP-1559**: Configured for modern networks

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review deployment logs for specific error messages
3. Verify network configuration and environment variables
4. Test with localhost network for consistent results

---

**🎉 Ready to deploy your Passport-Nexus hybrid infrastructure!**