# Environment Setup for Biconomy Deployment

Before running the deployment steps, you need to configure the following environment variables:

## Step 1 - Factory and MultiCallDeploy
```bash
# Admin address for MultiCallDeploy
export MULTICALL_ADMIN_PUB_KEY=0x...

# Admin address for NexusAccountFactory
export FACTORY_ADMIN_PUB_KEY=0x...
```

## Step 2 - LatestWalletImplLocator
```bash
# Admin address for LatestWalletImplLocator
export WALLET_IMPL_LOCATOR_ADMIN=0x...

# Address that can change the implementation
export WALLET_IMPL_CHANGER_ADMIN=0x...
```

## Step 4 - Nexus Core
```bash
# ERC-4337 EntryPoint address
export ENTRY_POINT_ADDRESS=0x...

# K1Validator address
export DEFAULT_VALIDATOR_ADDRESS=0x...
```

## Step 5 - ImmutableSigner
```bash
# Root admin for ImmutableSigner
export SIGNER_ROOT_ADMIN_PUB_KEY=0x...

# Admin for ImmutableSigner
export SIGNER_ADMIN_PUB_KEY=0x...
```

## Step 6 - Transaction Parameters
```bash
# Gas limit for implementation update
export GAS_LIMIT=1000000

# Max fee per gas (in wei)
export MAX_FEE_PER_GAS=100000000000

# Max priority fee per gas (in wei)
export MAX_PRIORITY_FEE_PER_GAS=2000000000
```

## Verification
After setting up the environment variables, run the check script:
```bash
npx ts-node scripts/biconomy/steps/check-env.ts
```

## Notes
- All address variables should be in the format `0x...`
- Gas parameters may need adjustment based on network conditions
- Make sure to have appropriate permissions for all admin addresses
- The K1Validator should be deployed before running step 4
