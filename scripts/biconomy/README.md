# Biconomy Integration

This directory contains all the necessary code for integrating with Biconomy's Nexus infrastructure and migrating existing smart accounts.

## Project Structure

```
scripts/biconomy/
├── deploy/              # Nexus infrastructure deployment
│   ├── contracts/      # Core Nexus contracts
│   │   ├── Nexus.sol           # Main implementation
│   │   ├── K1Validator.sol     # ECDSA validator
│   │   ├── NexusBootstrap.sol  # Bootstrap module
│   │   └── NexusProxy.sol      # Proxy contract
│   ├── factories/      # Contract factories
│   │   ├── K1ValidatorFactory.sol    # Creates new validators
│   │   └── NexusAccountFactory.sol   # Creates new accounts
│   └── .env           # Environment variables
└── migrations/         # Smart Account migration
    ├── config.ts      # Configuration and environment setup
    ├── migrate.ts     # Migration script
    └── types.ts       # TypeScript types
```

## Architecture Overview

### Core Components
1. **Nexus Implementation**
   - Main smart account logic
   - Handles transaction execution and validation
   - Supports modular upgrades

2. **K1Validator**
   - ECDSA signature validation
   - Transaction security checks
   - Access control management

3. **Bootstrap Module**
   - Initial account setup
   - Module installation
   - Configuration management

4. **Proxy Contract**
   - Upgradeable architecture
   - Delegate calls to implementation
   - State management

### Factory System
1. **K1ValidatorFactory**
   - Creates new validator instances
   - Ensures validator consistency
   - Manages validator deployments

2. **NexusAccountFactory**
   - Deterministic account creation (CREATE2)
   - Links accounts with validators
   - Manages account initialization

## Setup

1. Clone Biconomy Nexus repository (v1.2.1):
```bash
git clone -b deploy-v1.2.1 https://github.com/bcnmy/nexus.git
```

2. Install dependencies:
```bash
npm install @biconomy/account @biconomy/abstractjs viem --legacy-peer-deps
```

2. Configure environment variables:
```bash
cp deploy/.env.example deploy/.env
# Edit .env with your values
```

## Deployment Process

The deployment process consists of two main steps:

1. **Deploy Nexus Infrastructure**
   - Run deployment scripts from `deploy/scripts/`
   - This sets up the core Nexus contracts
   - Only needs to be done once per chain

2. **Migrate Smart Accounts**
   - Run migration scripts from `migrations/`
   - This updates existing accounts to use Nexus
   - Needs to be done for each smart account

## Environment Variables

### For Deployment
- `DEPLOYER_PRIV_KEY`: Private key for deployment
- `DEPLOYER_CONTRACT_ADDRESS`: Address of the deployer contract
- `ETHERSCAN_API_KEY`: API key for contract verification

### Network Configuration
- `BASE_SEPOLIA_ENDPOINT`: Base Sepolia RPC endpoint
- `CHAIN_ID`: Network chain ID
- `GAS_PRICE`: (Optional) Custom gas price in gwei
- `MAX_FEE`: (Optional) Max fee for EIP-1559 networks
- `PRIORITY_FEE`: (Optional) Priority fee for EIP-1559 networks

### For Migration
- `V2_BUNDLER_URL`: Biconomy V2 bundler URL
- `NEXUS_BUNDLER_URL`: Biconomy Nexus bundler URL
- `PAYMASTER_API_KEY`: Biconomy paymaster API key

## Gas Configuration

The deployment script automatically handles gas configuration based on the network:

### EIP-1559 Networks (Base, Arbitrum)
- Uses `maxFeePerGas` and `maxPriorityFeePerGas`
- Automatically calculates based on network conditions
- Can be overridden via environment variables

### Legacy Networks
- Uses `gasPrice`
- Automatically fetches from network
- Can be overridden via environment variables

## Usage

1. First, deploy Nexus infrastructure:
```bash
npx hardhat run scripts/biconomy/deploy/deploy.ts --network base_sepolia
```

2. Then, migrate smart accounts:
```bash
npx hardhat run scripts/biconomy/migrations/migrate.ts --network base_sepolia
```

## Important Notes

- Always test migrations on testnet first
- Ensure sufficient gas funds in paymaster
- Monitor transaction status during migration
- Keep track of migrated accounts
