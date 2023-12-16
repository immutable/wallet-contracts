# Steps for deploying to hardhat

1. Startup a Hardhat node.
2. Transfer funds to the ledger.
3. Deploy the `OwnableCreate2Deployer` contract using the ledger. The Ledger is now the owner of the contract, and the
only entity allowed to call the deploy function on the contract;
    1. forge create --rpc-url <http://127.0.0.1:8545> --constructor-args "<ADDRESS_OF_LEDGER_ACCOUNT>" --legacy --hd-path "m/44'/60'/0'/0/0" src/OwnableCreate2Deployer.sol:OwnableCreate2Deployer.
4. Set the value of DEPLOYER_CONTRACT_ADDRESS in the environment to equal the address of the OwnableCreate2Deployer contract deployed of step 3 above.
5. Set the deployer key to be a unique value for the run.
6. Execute the command `npx npm run deployToLocal`
    1. IMPORTANT: Remember to copy the correct `.env.X` file into `.env` before execution.
7. Edit the following environment variables in the Relayer in the `.env.local` and `local-deployment.yaml` files
    1. DEPLOY_AND_EXECUTE_ADDRESS to equal the address of the `MultiCallDeploy`
    2. FACTORY_ADDRESS to equal the address of the `Factory`
    3. MAIN_MODULE_ADDRESS to equal the address of the `StartupWalletImpl`
    4. IMMUTABLE_SIGNER_CONTRACT_ADDRESS to equal the address of the `ImmutableSigner`

# Steps for deploying to Devnet

1. If the `OwnableCreate2Deployer` contract has not been deployed, deploy it using the ledger. The Ledger is now the owner of the contract, and the
only entity allowed to call the deploy function on the contract;
    1. forge create --rpc-url <https://rpc.dev.immutable.com> --constructor-args "<ADDRESS_OF_LEDGER_ACCOUNT>" --legacy --hd-path "m/44'/60'/0'/0/0" src/OwnableCreate2Deployer.sol:OwnableCreate2Deployer.
2. Set the value of DEPLOYER_CONTRACT_ADDRESS in the environment to equal the address of the OwnableCreate2Deployer contract deployed of step 1 above.
3. Set the deployer key to be a unique value for the run.
4. Execute the command `npx npm run deployToDevnet`.
    1. IMPORTANT: Remember to copy the correct `.env.X` file into `.env` before execution.
5. Edit the following environment variables in the Relayer in the `.env.local` and `local-deployment.yaml` files
    1. DEPLOY_AND_EXECUTE_ADDRESS to equal the address of the `MultiCallDeploy`
    2. FACTORY_ADDRESS to equal the address of the `Factory`
    3. MAIN_MODULE_ADDRESS to equal the address of the `StartupWalletImpl`
    4. IMMUTABLE_SIGNER_CONTRACT_ADDRESS to equal the address of the `ImmutableSigner`
