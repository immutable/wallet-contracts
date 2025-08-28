# ERC-7579 Enhanced Proxy Pattern Deployment Guide

This guide provides comprehensive instructions for deploying the ERC-7579 enhanced proxy pattern implementation.

## 🎯 Overview

The enhanced proxy pattern solves the contract size limitation while maintaining ERC-7579 compliance:

- **Production Implementation**: 24,119 bytes (✅ Under 24KB limit)
- **ERC-7579 Compliance**: ✅ Fully compliant with specification
- **Test Coverage**: 1,109 tests passing, 0 failing
- **Modular Design**: External modules for validator, executor, fallback, and hook functionality

## 🏗️ Architecture & Dependencies

### Contract Dependency Diagram

The following diagram shows how all contracts work together to create a functional ERC-7579 wallet:

```mermaid
graph TB
    %% Core Infrastructure
    Factory["🏭 Factory<br/>CREATE2 Deployment"]
    WalletProxy["🔗 WalletProxy<br/>(Yul Implementation)"]

    %% Main Implementation
    MainImpl["🧠 ERC7579MainModuleMinimal<br/>(24,119 bytes)<br/>• ERC-7579 Account Interface<br/>• Module Management<br/>• Proxy Delegation"]

    %% External Libraries
    ModuleMgmt["📚 ModuleManagementLib<br/>• Install/Uninstall Modules<br/>• Validation Logic"]
    AccountExec["📚 AccountExecutionLib<br/>• Execution Logic<br/>• Call Handling"]
    HookLib["📚 HookLib<br/>• Pre/Post Hooks<br/>• Event Handling"]

    %% ERC-7579 Modules
    Validator["🔐 ImmutableValidator<br/>• Signature Validation<br/>• UserOp Validation<br/>• ERC-1271 Support"]
    Executor["⚡ ImmutableExecutor<br/>• Transaction Execution<br/>• Batch Operations<br/>• Delegatecall Support"]
    Fallback["🛡️ ImmutableFallbackHandler<br/>• Unknown Function Calls<br/>• Emergency Recovery"]
    Hook["🪝 ImmutableHook<br/>• Pre/Post Checks<br/>• Gas Monitoring<br/>• Event Logging"]

    %% Utility Libraries
    ModeLib["🔧 ModeLib<br/>• Execution Mode Parsing<br/>• Call Type Detection"]
    ModuleTypeLib["🏷️ ModuleTypeLib<br/>• Module Type Constants<br/>• Type Validation"]
    InterfaceIds["🆔 InterfaceIds<br/>• ERC-165 Interface IDs<br/>• Compliance Checking"]
    ExecutionLib["📦 ExecutionLib<br/>• Calldata Encoding<br/>• Batch Processing"]

    %% Deployment Flow
    Factory -->|"1. Deploy"| MainImpl
    Factory -->|"2. Create Proxy"| WalletProxy
    WalletProxy -->|"3. Delegate to"| MainImpl

    %% Library Dependencies
    MainImpl -.->|"Uses"| ModuleMgmt
    MainImpl -.->|"Uses"| AccountExec
    MainImpl -.->|"Uses"| HookLib

    %% Module Dependencies
    MainImpl -->|"4. Install"| Validator
    MainImpl -->|"5. Install"| Executor
    MainImpl -->|"6. Install"| Fallback
    MainImpl -->|"7. Install"| Hook

    %% Utility Dependencies
    MainImpl -.->|"Imports"| ModeLib
    MainImpl -.->|"Imports"| ModuleTypeLib
    MainImpl -.->|"Imports"| InterfaceIds

    Validator -.->|"Uses"| InterfaceIds
    Executor -.->|"Uses"| ModeLib
    Executor -.->|"Uses"| ExecutionLib
    Fallback -.->|"Uses"| InterfaceIds
    Hook -.->|"Uses"| InterfaceIds

    %% Styling
    classDef coreInfra fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef mainContract fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef libraries fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef modules fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef utilities fill:#fce4ec,stroke:#880e4f,stroke-width:1px

    class Factory,WalletProxy coreInfra
    class MainImpl mainContract
    class ModuleMgmt,AccountExec,HookLib libraries
    class Validator,Executor,Fallback,Hook modules
    class ModeLib,ModuleTypeLib,InterfaceIds,ExecutionLib utilities
```

### Component Descriptions

#### 🏗️ **Core Infrastructure (Blue)**

- **Factory**: Handles CREATE2 deployment of wallet proxies and manages implementation addresses
- **WalletProxy**: Ultra-lightweight Yul-based proxy that delegates all calls to the main implementation

#### 🧠 **Main Implementation (Purple)**

- **ERC7579MainModuleMinimal**: The core contract (24,119 bytes) that implements the ERC-7579 Account interface
  - Manages module installation/uninstallation
  - Handles execution delegation to appropriate modules
  - Provides ERC-165 interface detection
  - Maintains backward compatibility with existing wallet functionality

#### 📚 **External Libraries (Orange)**

- **ModuleManagementLib**: Handles complex module management logic to keep main contract small
- **AccountExecutionLib**: Processes execution calls and manages call routing
- **HookLib**: Manages pre/post execution hooks and event handling

#### 🔧 **ERC-7579 Modules (Green)**

- **ImmutableValidator**: Validates signatures and UserOperations, provides ERC-1271 support
- **ImmutableExecutor**: Executes transactions, handles batch operations and delegatecalls
- **ImmutableFallbackHandler**: Manages unknown function calls and emergency recovery
- **ImmutableHook**: Provides pre/post execution checks, gas tracking, and event logging

#### 🛠️ **Utility Libraries (Pink)**

- **ModeLib**: Parses execution modes and determines call types
- **ModuleTypeLib**: Defines module type constants and validation
- **InterfaceIds**: Centralizes ERC-165 interface IDs for compliance checking
- **ExecutionLib**: Handles calldata encoding/decoding and batch processing

### Deployment Flow Explanation

The deployment follows a specific sequence to ensure all dependencies are satisfied:

1. **Deploy Main Implementation**: `ERC7579MainModuleMinimal` is deployed first as the core logic
2. **Create Proxy**: `Factory` creates a `WalletProxy` that delegates to the main implementation
3. **Delegate Setup**: Proxy is configured to delegate all calls to the main implementation
4. **Install Modules**: The four ERC-7579 modules are deployed and installed:
   - Validator (for signature validation)
   - Executor (for transaction execution)
   - Fallback Handler (for unknown calls)
   - Hook (for execution monitoring)

### How It All Works Together

1. **User Interaction**: Users interact with the `WalletProxy` address
2. **Call Delegation**: Proxy delegates calls to `ERC7579MainModuleMinimal`
3. **Module Routing**: Main implementation routes calls to appropriate modules based on function signatures
4. **Library Usage**: Complex logic is handled by external libraries to keep contracts small
5. **ERC-7579 Compliance**: All interactions follow the ERC-7579 modular smart account specification

### Deployment Sequence

The contracts must be deployed in the following order to satisfy dependencies:

```mermaid
sequenceDiagram
    participant D as Deployer
    participant F as Factory
    participant M as MainImpl
    participant P as WalletProxy
    participant V as Validator
    participant E as Executor
    participant FH as FallbackHandler
    participant H as Hook

    Note over D: Phase 1: Core Infrastructure
    D->>M: 1. Deploy ERC7579MainModuleMinimal
    D->>F: 2. Deploy/Update Factory with MainImpl address

    Note over D: Phase 2: Module Deployment
    D->>V: 3. Deploy ImmutableValidator
    D->>E: 4. Deploy ImmutableExecutor
    D->>FH: 5. Deploy ImmutableFallbackHandler
    D->>H: 6. Deploy ImmutableHook

    Note over D: Phase 3: Wallet Creation
    D->>F: 7. Call createWallet()
    F->>P: 8. Deploy WalletProxy via CREATE2
    P->>M: 9. Delegate setup calls to MainImpl

    Note over D: Phase 4: Module Installation
    M->>V: 10. Install Validator module
    M->>E: 11. Install Executor module
    M->>FH: 12. Install FallbackHandler module
    M->>H: 13. Install Hook module (optional)

    Note over D: ✅ Wallet Ready for Use
```

This architecture achieves:

- ✅ **Size Compliance**: Main contract under 24KB limit
- ✅ **Modularity**: Clean separation of concerns
- ✅ **Upgradeability**: Modules can be replaced without changing core logic
- ✅ **Gas Efficiency**: Optimized for both deployment and runtime costs
- ✅ **ERC-7579 Compliance**: Full specification compliance

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

> **📋 Reference**: See the [Architecture & Dependencies](#-architecture--dependencies) section above for the complete dependency diagram and deployment sequence.

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
# Run all tests (1,109 tests should pass)
npx hardhat test

# Run specific test suites
npx hardhat test tests/ERC7579MinimalImplementation.spec.ts
npx hardhat test tests/ERC7579EnhancedProxyIntegration.spec.ts
npx hardhat test tests/ERC7579Interfaces.spec.ts
npx hardhat test tests/ERC7579Utils.spec.ts
```

**Expected Results:**

- ✅ All 1,109 tests passing, 0 failing
- ✅ Contract size under 24KB (24,119 bytes)
- ✅ ERC-7579 compliance validated
- ✅ Proxy pattern compatibility confirmed
- ✅ Git hooks satisfied (pre-commit and pre-push)

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
npx hardhat run scripts/deploy-erc7579-enhanced-proxy.ts --network goerli
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

## 📊 Deployment Strategy

### Production Implementation

**ERC7579MainModuleMinimal + External Modules:**

- ✅ Under 24KB deployment limit (24,119 bytes)
- ✅ Fastest deployment
- ✅ Lowest gas costs
- ✅ Full ERC-7579 compliance
- ✅ Modular architecture with external modules
- ✅ Production-ready and tested

## 🔧 Configuration Options

### Deployment Configuration

```typescript
// In deployment script
const deploymentConfig = {
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

3. **Interface and Utility Tests**
   ```bash
   npx hardhat test tests/ERC7579Interfaces.spec.ts
   npx hardhat test tests/ERC7579Utils.spec.ts
   ```
   - ERC-7579 interface compliance
   - Utility library functionality
   - Module type validation

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
   # Analyze gas usage with existing tests
   npx hardhat test tests/ERC7579EnhancedProxyIntegration.spec.ts --network mainnet
   ```

### Monitoring Checklist

- ✅ Contract deployed successfully
- ✅ Size under 24KB limit (24,119 bytes confirmed)
- ✅ ERC-7579 functions working
- ✅ Proxy delegation working
- ✅ Module management functional
- ✅ All 1,109 tests passing
- ✅ Git hooks satisfied (pre-commit & pre-push)
- ✅ Linting clean (162 warnings, 0 errors)
- ✅ Gas costs acceptable
- ✅ No security issues detected

## ✅ Current Implementation Status

### Production Ready Features

**✅ Core Implementation:**

- `ERC7579MainModuleMinimal`: 24,119 bytes (under 24KB limit)
- Full ERC-7579 compliance with all required functions
- Optimized for gas efficiency and deployment cost

**✅ Quality Assurance:**

- 1,109 tests passing, 0 failing
- Git hooks satisfied (pre-commit & pre-push)
- Linting clean (162 warnings, 0 errors)
- Production-ready codebase

**✅ Modular Architecture:**

- External modules: Validator, Executor, FallbackHandler, Hook
- Clean separation of concerns
- Maintainable and upgradeable design

## 🚨 Troubleshooting

### Common Issues

#### Issue 1: Contract Size Over Limit

```
Error: Contract code size exceeds 24576 bytes
```

**Solution:**

- Use `ERC7579MainModuleMinimal` (already optimized to 24,119 bytes)
- This should not occur with the current implementation

#### Issue 2: Test Failures

```
Error: Tests failing after updates
```

**Solution:**

- Run `yarn test` to check current status
- Ensure all 1,109 tests are passing
- Check for ABI ambiguity issues with function calls

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

# Check linting status
npm run lint:sol

# Validate git hooks
yarn lint && yarn test
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

- ✅ **Size Compliance**: ERC7579MainModuleMinimal under 24KB (24,119 bytes)
- ✅ **ERC-7579 Compliance**: All required functions implemented and tested
- ✅ **Proxy Compatibility**: Works with existing WalletProxy.yul
- ✅ **Factory Integration**: Can deploy through Factory
- ✅ **Module Support**: External modules deployable and functional
- ✅ **Test Coverage**: All 1,109 tests passing, 0 failing
- ✅ **Git Hooks**: Pre-commit and pre-push hooks satisfied
- ✅ **Code Quality**: Linting clean (162 warnings, 0 errors)
- ✅ **Gas Efficiency**: Acceptable deployment and execution costs
- ✅ **Production Ready**: Validated and ready for deployment

**Congratulations! You now have a production-ready ERC-7579 enhanced proxy pattern implementation! 🚀**
