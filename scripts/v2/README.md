# V2 Deployment Steps

This directory contains the deployment scripts for the V2 wallet infrastructure, specifically designed to deploy `MainModuleDynamicAuthV2.sol` and related contracts.

## Overview

The V2 deployment follows the same pattern as the original deployment but includes support for ERC-4337 EntryPoint integration and enhanced module management capabilities in `MainModuleDynamicAuthV2`.

## Prerequisites

The smart contract wallets require 3 ledgers for deployment:

1. **Passport Nonce Reserver** - `0x5780B22CCd5830595C9EC79a8E273ee83Be79d17`
2. **Deployment Key** - `0xdDA0d9448Ebe3eA43aFecE5Fa6401F5795c19333`
3. **Privileged Key** - `0x0E2D55943f4EF07c336C12A85d083c20FF189182`

These keys use different account indexes on the ledger. Remember to adjust the `accountIndex` in the `WalletOptions` constructor.

## Environment Variables

Before starting the deployment, ensure the following environment variables are set:

### Required for all steps:
- `MULTICALL_ADMIN_PUB_KEY` - Admin public key for MultiCallDeploy
- `FACTORY_ADMIN_PUB_KEY` - Admin public key for Factory
- `WALLET_IMPL_LOCATOR_ADMIN` - Admin for LatestWalletImplLocator
- `WALLET_IMPL_CHANGER_ADMIN` - Admin who can change wallet implementation
- `SIGNER_ROOT_ADMIN_PUB_KEY` - Root admin for ImmutableSigner
- `SIGNER_ADMIN_PUB_KEY` - Admin for ImmutableSigner
- `DEPLOYER_CONTRACT_ADDRESS` - Address of the OwnableCreate2Deployer contract

### V2 Specific:
- `ENTRY_POINT_ADDRESS` - **REQUIRED** - The ERC-4337 EntryPoint contract address (chain-specific)

Common EntryPoint addresses:
- Ethereum Mainnet: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- Polygon: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- Arbitrum: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- Optimism: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`

## Preparation Steps

### Step 1: Setup Environment
Create a `.env` file using the provided template and set all required environment variables.

### Step 2: Fund Ledgers
Transfer funds to the 3 ledgers used for the procedure. ~10 IMX will suffice for the operation.

### Step 3: Deploy OwnableCreate2Deployer (if needed)
Deploy the `OwnableCreate2Deployer` contract using the deployment ledger for local/testnet environments. For mainnet, use pre-existing deployments.

```bash
forge create --rpc-url <RPC_URL> --constructor-args "<ADDRESS_OF_LEDGER_ACCOUNT>" --legacy --hd-path "m/44'/60'/0'/0/0" src/OwnableCreate2Deployer.sol:OwnableCreate2Deployer
```

## Deployment Steps

### Step 1: Deploy Core Infrastructure
Deploys `MultiCallDeploy` and `Factory` contracts using Passport Nonce Reserver.

- **Ledger**: Passport Nonce Reserver (`accountIndex`: 10)
- **Command**: `npx hardhat run scripts/v2/step1.ts --network <ENV>`
- **Output**: `scripts/v2/step1.json`

**Contracts deployed:**
- MultiCallDeploy
- Factory

### Step 2: Deploy Wallet Implementation Locator
Deploys the contract that tracks the location of the latest wallet implementation using CREATE2 factory.

- **Ledger**: Standard deployment key (`accountIndex`: 0)
- **Command**: `npx hardhat run scripts/v2/step2.ts --network <ENV>`
- **Output**: `scripts/v2/step2.json`

**Contracts deployed:**
- LatestWalletImplLocator

### Step 3: Deploy Startup Wallet
Deploys the startup wallet implementation using Passport Nonce Reserver for deterministic addressing.

- **Ledger**: Passport Nonce Reserver (`accountIndex`: 10)
- **Command**: `npx hardhat run scripts/v2/step3.ts --network <ENV>`
- **Output**: `scripts/v2/step3.json`
- **⚠️ WARNING**: Copy the `LatestWalletImplLocator` address from step2.json into step3.ts

**Contracts deployed:**
- StartupWalletImpl

### Step 4: Deploy MainModuleDynamicAuthV2
Deploys the V2 main module with ERC-4337 support using CREATE2 factory.

- **Ledger**: Standard deployment key (`accountIndex`: 0)
- **Command**: `npx hardhat run scripts/v2/step4.ts --network <ENV>`
- **Output**: `scripts/v2/step4.json`
- **⚠️ WARNING**: Copy addresses from previous steps:
  - `Factory` address from step1.json
  - `StartupWalletImpl` address from step3.json
- **⚠️ CRITICAL**: Ensure `ENTRY_POINT_ADDRESS` environment variable is set

**Contracts deployed:**
- MainModuleDynamicAuthV2

**V2 Constructor Parameters:**
- `anEntryPoint`: Read from `ENTRY_POINT_ADDRESS` environment variable
- `defaultValidator`: Set to `address(0)`
- `initData`: Empty bytes (`0x`)
- `_factory`: Factory address from step1
- `_startup`: StartupWalletImpl address from step3

### Step 5: Deploy Immutable Signer
Deploys the signer contract using Passport Nonce Reserver for deterministic addressing.

- **Ledger**: Passport Nonce Reserver (`accountIndex`: 10)
- **Command**: `npx hardhat run scripts/v2/step5.ts --network <ENV>`
- **Output**: `scripts/v2/step5.json`

**Contracts deployed:**
- ImmutableSigner

### Step 6: Update Implementation Pointer
Points the `LatestWalletImplLocator` to the V2 main module using the privileged deployment key.

- **Ledger**: Privileged deployment key (`accountIndex`: 10)
- **Command**: `npx hardhat run scripts/v2/step6.ts --network <ENV>`
- **⚠️ WARNING**: Copy addresses from previous steps:
  - `MainModuleDynamicAuthV2` address from step4.json
  - `LatestWalletImplLocator` address from step2.json

## Post-Deployment Configuration

### Update Relayer Environment
Edit the `.env` and `deployment.yaml` files in the Relayer for the relevant environment:

- `DEPLOY_AND_EXECUTE_ADDRESS` = MultiCallDeploy address
- `FACTORY_ADDRESS` = Factory address
- `MAIN_MODULE_ADDRESS` = StartupWalletImpl address
- `IMMUTABLE_SIGNER_CONTRACT_ADDRESS` = ImmutableSigner address

### Update Passport Environment
Edit the `deployment.yaml` files in the Passport MR service:

- `WALLET_FACTORY_ADDRESS` = Factory address
- `WALLET_IMPLEMENTATION_MODULE_ADDRESS` = StartupWalletImpl address
- `IMMUTABLE_SIGNER_ADDRESS` = ImmutableSigner address

## Key Differences from V1

1. **MainModuleDynamicAuthV2 Constructor**: Requires additional parameters for ERC-4337 support:
   - EntryPoint address (configurable via environment)
   - Default validator (set to address(0))
   - Initialization data (empty bytes)

2. **Enhanced Capabilities**: V2 includes:
   - ERC-4337 Account Abstraction support
   - Advanced module management
   - Hook system for pre/post execution
   - Emergency uninstall mechanisms
   - ERC-7739 signature validation support

3. **Environment Configuration**: Requires `ENTRY_POINT_ADDRESS` to be set for chain-specific EntryPoint contracts.

## Troubleshooting

### Common Issues:

1. **Missing ENTRY_POINT_ADDRESS**: Ensure the environment variable is set before running step4.
2. **Address Mismatches**: Double-check that addresses are correctly copied between steps.
3. **Gas Estimation**: If transactions fail, try increasing gas limits in the deployment scripts.
4. **Ledger Account Index**: Ensure the correct `accountIndex` is set in `WalletOptions` for each step.

### Verification:

After deployment, verify that:
1. All contracts are deployed to expected addresses
2. LatestWalletImplLocator points to MainModuleDynamicAuthV2
3. Factory can create wallets using the new implementation
4. EntryPoint integration works correctly

## Output Files

All deployment artifacts are saved in the `scripts/v2/` directory:
- `step1.json` - MultiCallDeploy and Factory addresses
- `step2.json` - LatestWalletImplLocator address
- `step3.json` - StartupWalletImpl address
- `step4.json` - MainModuleDynamicAuthV2 address and constructor parameters
- `step5.json` - ImmutableSigner address
