# Wallet Deployment with Bootstrap Initialization

This directory contains scripts for deploying smart contract wallets with ERC-7579 module support using the NexusBootstrap initialization pattern.

## Overview

The `wallet-deployment-with-bootstrap.ts` script demonstrates a complete wallet deployment flow that:

1. **Deploys a new wallet instance** using a randomly generated owner address to ensure unique deployment
2. **Initializes the wallet** with validator and executor modules via the NexusBootstrap contract
3. **Verifies the deployment** and confirms that modules are properly installed and initialized

The script uses the `MultiCallDeploy.deployAndExecute()` method to deploy the wallet and execute the bootstrap initialization in a single atomic transaction.

## Prerequisites

Before running the deployment script, ensure you have completed the following deployment steps:

- **Step 1**: Deploy Factory and MultiCallDeploy contracts
- **Step 2**: Deploy LatestWalletImplLocator contract
- **Step 3**: Deploy MainModuleDynamicAuthV2 (startup wallet implementation)
- **Step 4**: Set LatestWalletImplLocator to point to MainModuleDynamicAuthV2
- **Step 5**: Deploy ImmutableSigner contract
- **Step 6**: (If needed) Update wallet implementation locator for new deployments
- **Step 7**: Deploy NexusBootstrap contract
- **Step 8**: Deploy MockValidator and MockExecutor modules

The script will automatically load the deployed contract addresses from the corresponding step JSON files.

## Setup Instructions

### 1. Environment Configuration

Copy the environment template and configure your deployment settings:

```bash
cp .env.deployment .env
```

Update the `.env` file with your configuration:

```env
DEPLOYER_CONTRACT_ADDRESS=0x1dBEF46DF2AF1b3ab2C34186e2FFce209b26FBE5

MULTICALL_ADMIN_PUB_KEY=<PUB_KEY>

....
```

For the purposes of testing, a single Ethereum key pair is sufficient. Replace <PUB_KEY> with the EOA address and <PRIV_KEY> with the private key of the EOA.

For Base Sepolia, the DEPLOYER_CONTRACT_ADDRESS, MULTICALLDEPLOY_CONTRACT_ADDRESS, ENTRY_POINT_ADDRESS, FACTORY_CONTRACT_ADDRESS are latest as of 19/Sep/2025

### 2. Network Configuration

Update the `hardhat.config.ts` file to include your target network configuration. For Base Sepolia:

```typescript
networks: {
  base_sepolia: {
    url: process.env.BASE_SEPOLIA_RPC_URL,  // <---- Update this URL
    accounts: []
  }
}
```

### 3. Module Configuration

Update the module addresses in `step8.json` with your deployed validator and executor contracts:

**step8.json:**
```json
{
  "mockValidator": "0x_your_validator_address",
  "mockExecutor": "0x_your_executor_address"
}
```

## Running the Deployment

Execute the wallet deployment script:

```bash
npx hardhat run scripts/v2/wallet-deployment-with-bootstrap.ts --network base_sepolia
```

## What the Script Does

### Deployment Process

1. **Generates Random Owner**: Creates a new random Ethereum address to serve as the wallet owner, ensuring each deployment is unique
2. **Calculates Counterfactual Address**: Determines the wallet's address before deployment using CREATE2
3. **Prepares Bootstrap Configuration**: Sets up validator and executor module configurations for initialization
4. **Creates Meta-Transaction**: Builds a transaction where the wallet calls its own `initializeAccount` function
5. **Generates Signature**: Signs the meta-transaction using the random owner's private key
6. **Executes Deployment**: Calls `MultiCallDeploy.deployAndExecute()` to deploy and initialize the wallet atomically

### Bootstrap Initialization

The bootstrap process uses `NexusBootstrap.initNexusNoRegistry()` to:

- Install the MockValidator module with the wallet owner as the authorized signer
- Install the MockExecutor module for transaction execution
- Configure the wallet to support ERC-7579 module types

### Verification

After deployment, the script verifies:

- Wallet contract is deployed and has code
- Wallet is properly initialized
- Validator and executor modules are installed
- Modules are initialized and functional

## Output

Upon successful execution, you'll see:

```
[base_sepolia] Wallet deployment with bootstrap initialization completed successfully!
[base_sepolia] Wallet address: 0x...
[base_sepolia] Bootstrap address: 0x...
[base_sepolia] Validator address: 0x...
[base_sepolia] Executor address: 0x...
```

The deployed wallet will be fully functional with:
- A random owner address (private key displayed in output)
- Installed and initialized validator module
- Installed and initialized executor module
- Support for ERC-7579 module management

## Troubleshooting

### Common Issues

1. **Missing deployment artifacts**: Ensure all prerequisite steps (1, 3, 7, 8) have been completed
2. **Insufficient gas**: The script uses high gas limits, but complex bootstrap operations may require adjustment
3. **Network configuration**: Verify RPC URL and private key are correctly configured
4. **Module addresses**: Ensure validator and executor addresses in step JSON files are correct

### Debug Information

The script provides detailed logging including:
- Contract existence verification
- Gas estimation and transaction details
- Event logs from the bootstrap process
- Module installation status
- Final wallet state verification

For additional debugging, check the transaction hash output and examine the events on your network's block explorer.
