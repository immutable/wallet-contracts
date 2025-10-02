# Wallet Deployment with SignedMultiCallDeploy

This document describes the new wallet deployment workflow using `SignedMultiCallDeploy` instead of calling `MultiCallDeploy` directly.

## Overview

The `SignedMultiCallDeploy` contract sits in front of the `MultiCallDeploy` contract and requires a provenance signature from a trusted central party to ensure that wallet deployment requests are authorized.

## Key Changes from Original Workflow

### 1. Contract Usage
- **Original**: Direct call to `MultiCallDeploy.deployAndExecute()`
- **New**: Call to `SignedMultiCallDeploy.deployAndExecuteWithSignature()`

### 2. Required Parameters
- **Original**: Only wallet owner signatures
- **New**: Both wallet owner signatures AND central executor signature

### 3. Environment Variables
- **New Requirement**: `CENTRAL_SIGNER_PRIVATE_KEY` environment variable must be set

## Script: `wallet-deployment-with-signed-multicall.ts`

### Prerequisites

1. **Environment Variable**: Set `CENTRAL_SIGNER_PRIVATE_KEY` in your environment
2. **Deployment Steps**: Ensure steps 1, 3, 7, and 8 have been completed
3. **Whitelisting**: SignedMultiCallDeploy must be whitelisted as an executor on MultiCallDeploy

### Usage

```bash
# Set the required environment variable
export CENTRAL_SIGNER_PRIVATE_KEY="0x..."

# Run the deployment script
npx hardhat run scripts/v2/wallet-deployment-with-signed-multicall.ts --network <network>
```

### How It Works

1. **Load Deployment Artifacts**: Loads contract addresses from previous deployment steps
2. **Generate Wallet Configuration**: Creates a random owner for the new wallet
3. **Create Bootstrap Transaction**: Prepares the `initializeAccount` call with bootstrap data
4. **Generate Wallet Owner Signature**: Signs the transaction with the wallet owner's private key
5. **Generate Central Executor Signature**: Signs the call data with the central executor's private key
6. **Execute Deployment**: Calls `SignedMultiCallDeploy.deployAndExecuteWithSignature()`
7. **Verify Results**: Checks that the wallet was deployed and modules were installed

### Signature Generation Process

#### Wallet Owner Signature
- Uses the same process as the original script
- Signs the meta-transaction data with the wallet owner's private key
- Uses the `walletMultiSign` helper function

#### Central Executor Signature
- Encodes the call data that will be made to `MultiCallDeploy.deployAndExecute()`
- Creates a hash of the call data
- Signs the hash with the central executor's private key
- This signature proves that the central party authorized this specific deployment

### Key Differences from Original Script

1. **Contract Interface**: Uses `SignedMultiCallDeploy` instead of `MultiCallDeploy`
2. **Function Call**: Calls `deployAndExecuteWithSignature()` instead of `deployAndExecute()`
3. **Additional Signature**: Requires and generates a central executor signature
4. **Artifact Loading**: Loads `signedMultiCallDeploy` address from step1.json
5. **Event Monitoring**: Looks for `MultiCallDeployInvocationSuccess` event

### Error Handling

The script includes comprehensive error handling:
- Validates that `CENTRAL_SIGNER_PRIVATE_KEY` is set
- Checks that all required contracts exist
- Performs static calls before execution
- Provides detailed error messages and debugging information

### Events to Monitor

- `ModuleInstalled`: Indicates successful module installation via bootstrap
- `MultiCallDeployInvocationSuccess`: Indicates successful execution by SignedMultiCallDeploy
- Standard wallet deployment events

## Security Considerations

1. **Central Executor Key**: The `CENTRAL_SIGNER_PRIVATE_KEY` must be kept secure
2. **Whitelisting**: Only whitelisted addresses can call `SignedMultiCallDeploy`
3. **Signature Validation**: Both wallet owner and central executor signatures are validated
4. **Provenance**: The central executor signature provides provenance for the deployment request

## Troubleshooting

### Common Issues

1. **Missing Environment Variable**: Ensure `CENTRAL_SIGNER_PRIVATE_KEY` is set
2. **Contract Not Found**: Verify that all deployment steps have been completed
3. **Signature Validation Failed**: Check that the central executor key matches the signer in SignedMultiCallDeploy
4. **Gas Estimation Failed**: This is often normal - the script will proceed with a high gas limit

### Debug Information

The script provides extensive debug information:
- Contract existence checks
- Signature generation details
- Static call results
- Gas estimation results
- Event monitoring
- Post-execution verification

## Example Output

```
[hardhat] Starting wallet deployment with SignedMultiCallDeploy...
[hardhat] 🎲 Generated random owner: 0x...
[hardhat] Generated salt: 0x...
[hardhat] Counterfactual address: 0x...
[hardhat] 🔐 Generating wallet owner signature with nonce: 0
[hardhat] ✅ Generated wallet owner signature (length: 132): 0x...
[hardhat] Central executor address: 0x...
[hardhat] 📋 Central executor signature details:
[hardhat]   - Call data length: 1234
[hardhat]   - Call data hash: 0x...
[hardhat]   - Executor signature: 0x...
[hardhat] 🚀 About to call deployAndExecuteWithSignature:
[hardhat] 📡 Deployment transaction hash: 0x...
[hardhat] ✅ Transaction confirmed in block: 12345
[hardhat] 🎉 MultiCallDeployInvocationSuccess event found - SignedMultiCallDeploy executed successfully
[hardhat] 🎉 ModuleInstalled events found: 2
[hardhat] ✅ Wallet deployed and bootstrap initialization executed via SignedMultiCallDeploy!
```

