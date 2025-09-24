# Passport-Nexus Hybrid Infrastructure & Wallet Deployment

## Overview

The `deploy-infrastructure-and-wallet.js` script is a **complete, self-contained deployment solution** that implements a hybrid approach combining:

- **Passport Infrastructure** (proven stable base) - Factory + MultiCallDeploy
- **Nexus Core** (modern Account Abstraction) - K1Validator + Implementation
- **Hybrid Wallet Deployment** - Using Passport Factory with Nexus functionality

## Key Features

### ✅ **Completely Self-Contained**
- **No external dependencies** - does not read any existing JSON files
- **No pre-deployment required** - starts from scratch every time
- **No eval scripts needed** - pure JavaScript implementation
- **Reset button functionality** - can be run at any time to redeploy everything

### ✅ **Robust Architecture**
- **Hybrid approach** combines the best of both systems
- **Proper timing** with verification between deployments
- **Comprehensive verification** of all components
- **Deterministic deployment** using CREATE2 for wallet addresses

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
```bash
# Deploy complete infrastructure + wallet
NODE_ENV=development npx hardhat run scripts/biconomy/deploy-infrastructure-and-wallet.js --network hardhat
```

### What Gets Deployed

#### Phase 1: Infrastructure Components
1. **MultiCallDeploy (Passport)** - Batch transaction execution
2. **Factory (Passport)** - Deterministic wallet deployment
3. **K1Validator (Nexus)** - ECDSA signature validation
4. **Nexus Implementation** - Modern AA smart account

#### Phase 2: Wallet Deployment
1. **Hybrid Wallet** - Deployed via Passport Factory using Nexus as main module
2. **Deterministic Address** - Predictable wallet address using CREATE2
3. **Permission Setup** - Automatic role configuration

#### Phase 3: Verification
1. **Code Verification** - Ensures all contracts have bytecode
2. **Size Validation** - Confirms proper deployment
3. **Integration Testing** - Validates hybrid architecture

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
    "nexusK1Validator": "0x9fE46...", 
    "nexusImplementation": "0xCf7Ed..."
  },
  "wallet": {
    "address": "0x8cba831e033bE660b4B9B36d09D0119AC7754cD5",
    "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "mainModule": "0xCf7Ed..."
  }
}
```

### Console Output Example
```
🚀 COMPLETE INFRASTRUCTURE + WALLET DEPLOYMENT
==============================================
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Network: hardhat
Balance: 10000.0 ETH

🏗️  PHASE 1: DEPLOYING INFRASTRUCTURE
=====================================
✅ MultiCallDeploy: 0x5FbDB... (4608 bytes)
✅ Factory: 0xe7f17... (3367 bytes) 
✅ K1Validator: 0x9fE46... (4479 bytes)
✅ Nexus Implementation: 0xCf7Ed... (28720 bytes)

🎯 PHASE 2: DEPLOYING WALLET
=============================
✅ WALLET DEPLOYED SUCCESSFULLY!
Address: 0x8cba831e033bE660b4B9B36d09D0119AC7754cD5

✅ PHASE 3: FINAL VERIFICATION
==============================
✅ ALL COMPONENTS VERIFIED SUCCESSFULLY

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
┌─────────────────┐    ┌──────────────────┐
│ Passport Factory│───▶│  Nexus Wallet    │
│                 │    │ (Implementation) │
└─────────────────┘    └──────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│ MultiCallDeploy │    │   K1Validator    │
│                 │    │                  │
└─────────────────┘    └──────────────────┘
```

## Configuration

### Environment Variables
- `GAS_LIMIT` - Transaction gas limit (default: 30000000)
- `MAX_FEE_PER_GAS` - Maximum fee per gas (default: 1875000000)
- `MAX_PRIORITY_FEE_PER_GAS` - Priority fee (default: 1000000000)

### Customizable Parameters
- **Wallet Owner** - Currently set to deployer address
- **Salt Generation** - Uses "hybrid-wallet-final" string
- **EntryPoint** - Hardcoded test address for local development

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
   - Check salt uniqueness
   - Verify Nexus implementation size
   - Ensure factory permissions

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

**Note**: This script represents the final working solution for Passport-Nexus hybrid deployment. It supersedes individual step scripts and provides a complete, reliable deployment process.
