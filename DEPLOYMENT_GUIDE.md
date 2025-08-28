# ERC-7579 Enhanced Proxy Pattern Deployment Guide

This guide provides comprehensive instructions for deploying the ERC-7579 enhanced proxy pattern implementation.

## 🎯 Overview

The enhanced proxy pattern solves the contract size limitation while maintaining ERC-7579 compliance:

- **Original Contract**: 66,977 bytes (❌ 172% over 24KB limit)
- **Minimal Implementation**: 24,119 bytes (✅ Under 24KB limit)
- **Size Reduction**: 64% smaller, fully ERC-7579 compliant

## 🏗️ Architecture

```
Factory.sol → WalletProxy.yul → ERC7579MainModuleMinimal.sol (24KB)
                                        ↓
                              [Delegates to external modules]
                                        ↓
                    ImmutableValidator + ImmutableExecutor + etc.
```

## 📋 Prerequisites

### Environment Setup

1. **Node.js**: Version 16+ (Hardhat compatibility)
2. **Dependencies**: Install required packages

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Variables**: Create `.env` file

   ```bash
   # Network configuration
   PRIVATE_KEY=your_private_key_here
   INFURA_API_KEY=your_infura_key_here

   # Deployment configuration
   DEPLOYMENT_TYPE=minimal  # or 'libraries'
   UPDATE_FACTORY=false     # Set to true to update Factory
   NEW_IMPLEMENTATION_ADDRESS=  # Set after deployment

   # Gas configuration
   GAS_PRICE=20000000000    # 20 gwei
   GAS_LIMIT=8000000        # 8M gas limit
   ```

### Network Configuration

Update `hardhat.config.ts` with your network settings:

```typescript
networks: {
  mainnet: {
    url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: [process.env.PRIVATE_KEY],
    gasPrice: parseInt(process.env.GAS_PRICE || '20000000000'),
  },
  goerli: {
    url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: [process.env.PRIVATE_KEY],
    gasPrice: parseInt(process.env.GAS_PRICE || '10000000000'),
  }
}
```

## 🚀 Deployment Process

### Phase 1: Core Deployment

#### Step 1: Compile Contracts

```bash
npx hardhat compile
```

**Validation Checklist:**

- ✅ All contracts compile successfully
- ✅ No size warnings for ERC7579MainModuleMinimal
- ✅ Library dependencies resolved

#### Step 2: Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test suites
npx hardhat test tests/ERC7579MinimalImplementation.spec.ts
npx hardhat test tests/ERC7579EnhancedProxyIntegration.spec.ts
```

**Expected Results:**

- ✅ Contract size under 24KB
- ✅ ERC-7579 compliance validated
- ✅ Proxy pattern compatibility confirmed

#### Step 3: Deploy to Testnet

```bash
# Deploy to Goerli testnet
npx hardhat run scripts/deploy-erc7579-enhanced-proxy.ts --network goerli
```

**Deployment Output:**

```
🚀 Starting ERC-7579 Enhanced Proxy Deployment on goerli
📍 Deployer address: 0x...

📦 Step 1: Deploying ERC7579MainModuleMinimal...
✅ Implementation deployed at: 0x...
📏 Implementation size: 24,119 bytes
🎯 Size compliance: ✅ Under 24KB

📦 Step 2: Deploying external modules...
✅ Validator deployed at: 0x...
✅ Executor deployed at: 0x...
✅ FallbackHandler deployed at: 0x...
✅ Hook deployed at: 0x...

🔍 Step 3: Validating deployment...
📋 Account ID: immutable.erc7579.v1
🔧 Module support - Validator: true, Executor: true
⚡ Execution mode support - Single: true
🔍 ERC-165 support: true
✅ New implementation validation passed

💾 Deployment result saved to: deployment-erc7579-goerli-[timestamp].json
```

#### Step 4: Validate Deployment

```bash
# Run integration tests against deployed contracts
NEW_IMPLEMENTATION_ADDRESS=0x... npx hardhat test tests/ERC7579EnhancedProxyIntegration.spec.ts --network goerli
```

### Phase 2: Factory Integration

#### Step 5: Update Factory (Optional)

```bash
# Update existing Factory to use new implementation
NEW_IMPLEMENTATION_ADDRESS=0x... npx hardhat run scripts/update-factory-erc7579.ts --network goerli
```

**Factory Update Options:**

**Option A: Direct Update (if supported)**

```bash
# If Factory has updateImplementation() function
UPDATE_FACTORY=true NEW_IMPLEMENTATION_ADDRESS=0x... npx hardhat run scripts/update-factory-erc7579.ts --network goerli
```

**Option B: Deploy New Factory**

```bash
# Deploy new Factory with new implementation
npx hardhat run scripts/deploy-new-factory.ts --network goerli
```

**Option C: Manual Process**

- Use governance/multisig to update Factory
- Coordinate with team for implementation change
- Plan gradual migration strategy

### Phase 3: Production Deployment

#### Step 6: Deploy to Mainnet

```bash
# Deploy to mainnet (after thorough testnet validation)
npx hardhat run scripts/deploy-erc7579-enhanced-proxy.ts --network mainnet
```

**Pre-Mainnet Checklist:**

- ✅ Testnet deployment successful
- ✅ All tests passing
- ✅ Gas costs analyzed and acceptable
- ✅ Security review completed
- ✅ Team approval obtained

## 📊 Deployment Strategies

### Strategy 1: Minimal Implementation (Recommended)

**Pros:**

- ✅ Under 24KB deployment limit
- ✅ Fastest deployment
- ✅ Lowest gas costs
- ✅ Immediate ERC-7579 compliance

**Cons:**

- ⚠️ Simplified execution logic
- ⚠️ Requires external modules for full functionality

**Use Case:** Production deployment where size is critical

### Strategy 2: Library-Based Optimized

**Pros:**

- ✅ More functionality in main contract
- ✅ Better code organization
- ✅ Reusable libraries

**Cons:**

- ❌ Still over 24KB limit
- ❌ Complex deployment (library linking)
- ❌ Higher gas costs

**Use Case:** Development/testing where size limit is not enforced

## 🔧 Configuration Options

### Deployment Configuration

```typescript
// In deployment script
const deploymentConfig = {
  // Implementation type
  implementationType: 'minimal', // or 'optimized'

  // Module deployment
  deployExternalModules: true,
  moduleAddresses: {
    validator: '0x...', // Use existing or deploy new
    executor: '0x...',
    fallbackHandler: '0x...',
    hook: '0x...'
  },

  // Factory integration
  updateFactory: false, // Set to true to update existing Factory
  factoryAddress: '0x...', // Existing Factory address

  // Gas optimization
  gasPrice: 20000000000, // 20 gwei
  gasLimit: 8000000, // 8M gas

  // Validation
  runTests: true,
  validateSize: true,
  validateCompliance: true
};
```

### Network-Specific Settings

```typescript
const networkConfig = {
  mainnet: {
    gasPrice: 25000000000, // 25 gwei
    confirmations: 2,
    timeout: 300000 // 5 minutes
  },
  goerli: {
    gasPrice: 10000000000, // 10 gwei
    confirmations: 1,
    timeout: 120000 // 2 minutes
  },
  hardhat: {
    gasPrice: 8000000000, // 8 gwei
    confirmations: 1,
    timeout: 60000 // 1 minute
  }
};
```

## 🧪 Testing Strategy

### Test Suites

1. **Unit Tests**

   ```bash
   npx hardhat test tests/ERC7579MinimalImplementation.spec.ts
   ```

   - Contract deployment
   - Basic functionality
   - ERC-7579 compliance
   - Size validation

2. **Integration Tests**

   ```bash
   npx hardhat test tests/ERC7579EnhancedProxyIntegration.spec.ts
   ```

   - Full stack deployment
   - Proxy pattern integration
   - Factory interaction
   - Gas efficiency analysis

3. **Size Analysis**
   ```bash
   npx hardhat test tests/ERC7579MinimalSize.spec.ts
   ```
   - Contract size comparison
   - Optimization validation
   - Deployment limit compliance

### Test Environment Setup

```bash
# Local testing
npx hardhat node
# In another terminal:
npx hardhat test --network localhost

# Fork testing (mainnet fork)
npx hardhat test --network hardhat --fork https://mainnet.infura.io/v3/YOUR_KEY

# Testnet testing
npx hardhat test --network goerli
```

## 📈 Monitoring and Validation

### Post-Deployment Validation

1. **Contract Verification**

   ```bash
   # Verify on Etherscan
   npx hardhat verify --network mainnet DEPLOYED_ADDRESS "CONSTRUCTOR_ARG"
   ```

2. **Functionality Testing**

   ```bash
   # Test basic functions
   npx hardhat run scripts/validate-deployment.ts --network mainnet
   ```

3. **Gas Cost Analysis**
   ```bash
   # Analyze gas usage
   npx hardhat test tests/gas-analysis.spec.ts --network mainnet
   ```

### Monitoring Checklist

- ✅ Contract deployed successfully
- ✅ Size under 24KB limit
- ✅ ERC-7579 functions working
- ✅ Proxy delegation working
- ✅ Module management functional
- ✅ Gas costs acceptable
- ✅ No security issues detected

## 🚨 Troubleshooting

### Common Issues

#### Issue 1: Contract Size Over Limit

```
Error: Contract code size exceeds 24576 bytes
```

**Solution:**

- Use `ERC7579MainModuleMinimal` instead of optimized version
- Remove unused functions
- Optimize string literals
- Use libraries for complex logic

#### Issue 2: Library Linking Errors

```
Error: Missing library addresses for linking
```

**Solution:**

- Deploy libraries first
- Use hardhat-deploy for automatic linking
- Manually specify library addresses

#### Issue 3: Factory Update Fails

```
Error: Factory does not support updateImplementation
```

**Solution:**

- Deploy new Factory with new implementation
- Use governance process for updates
- Plan gradual migration strategy

#### Issue 4: Gas Estimation Errors

```
Error: Gas estimation failed
```

**Solution:**

- Increase gas limit in network config
- Check for revert conditions
- Validate constructor arguments

### Debug Commands

```bash
# Compile with detailed output
npx hardhat compile --show-stack-traces

# Run tests with gas reporting
npx hardhat test --gas-reporter

# Deploy with verbose logging
DEBUG=* npx hardhat run scripts/deploy-erc7579-enhanced-proxy.ts --network goerli

# Validate contract size
npx hardhat run scripts/check-contract-sizes.ts
```

## 📚 Additional Resources

### Documentation

- [ERC-7579 Specification](https://eips.ethereum.org/EIPS/eip-7579)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

### Tools

- [Hardhat](https://hardhat.org/) - Development environment
- [Etherscan](https://etherscan.io/) - Contract verification
- [Tenderly](https://tenderly.co/) - Debugging and monitoring

### Support

- GitHub Issues: [Project Repository]
- Discord: [Community Channel]
- Documentation: [Project Wiki]

---

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ **Size Compliance**: ERC7579MainModuleMinimal under 24KB
- ✅ **ERC-7579 Compliance**: All required functions implemented
- ✅ **Proxy Compatibility**: Works with existing WalletProxy.yul
- ✅ **Factory Integration**: Can deploy through Factory
- ✅ **Module Support**: External modules deployable and functional
- ✅ **Gas Efficiency**: Acceptable deployment and execution costs
- ✅ **Test Coverage**: All tests passing
- ✅ **Production Ready**: Validated on testnet, ready for mainnet

**Congratulations! You now have a production-ready ERC-7579 enhanced proxy pattern implementation! 🚀**
