# ERC-7579 Modular Smart Account Deployment Guide

## Overview

Production-ready ERC-7579 implementation with true modular architecture:

- **Core Contract**: 4,770,227 gas (under 24KB limit)
- **Modular Design**: External modules installed dynamically after wallet creation
- **ERC-7579 Compliant**: Full specification compliance

## Architecture

### Components

- **ERC7579MainModuleMinimal**: Core contract with ERC-7579 interface (no modules pre-installed)
- **ImmutableValidator**: Signature validation module
- **ImmutableExecutor**: Transaction execution module
- **ImmutableFallbackHandler**: Unknown function call handler
- **ImmutableHook**: Pre/post execution hooks (optional)

### Deployment Flow

1. Deploy core contract and external modules separately
2. Create wallet proxy via Factory
3. Install modules dynamically after wallet creation

## Prerequisites

```bash
npm install
```

Create `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_key_here
```

## Deployment

### Step 1: Test

```bash
npx hardhat test tests/ERC7579MinimalImplementation.spec.ts
```

### Step 2: Deploy to Testnet

```bash
npx hardhat run scripts/deploy-erc7579-enhanced-proxy.ts --network goerli
```

### Step 3: Deploy to Mainnet

```bash
npx hardhat run scripts/deploy-erc7579-enhanced-proxy.ts --network mainnet
```

## Module Constructor Parameters

```typescript
// Deployment configuration
const moduleParams = {
  validator: [factoryAddress],
  executor: [factoryAddress],
  fallbackHandler: [factoryAddress],
  hook: [] // No parameters
};
```

## Validation

Post-deployment checklist:

- ✅ Contract size under 24KB limit
- ✅ ERC-7579 interface compliance
- ✅ No modules pre-installed (modular approach)
- ✅ All tests passing

## Troubleshooting

### Common Issues

**Contract Size Over Limit**

- Use `ERC7579MainModuleMinimal` (optimized to under 24KB)
- Ensure no modules are hardcoded in constructor

**Test Failures**

- Run `npx hardhat test tests/ERC7579MinimalImplementation.spec.ts`
- Check for ABI ambiguity (use explicit function signatures)
- Verify module constructor parameters

**Gas Estimation Errors**

- Increase gas limit in network config
- Validate constructor arguments

## Success Criteria

Deployment is successful when:

- ✅ Contract size under 24KB limit
- ✅ ERC-7579 interface compliance
- ✅ No modules pre-installed (true modular approach)
- ✅ All tests passing
- ✅ Modules deployable with proper state management
