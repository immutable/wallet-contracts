# Steps for execution using hardhat locally

1. Startup a Hardhat node.
2. Transfer funds to the ledger.
3. Deploy the OwnableCreate2Deployer contract using the ledger. The Ledger is now the owner of the contract, and the
only entity allowed to call the deploy function on the contract;
    1. forge create --rpc-url <http://127.0.0.1:8545> --constructor-args "<ADDRESS_OF_OWNER>" -l --hd-path "m/44'/60'/0'/0/0" src/OwnableCreate2Deployer.sol:OwnableCreate2Deployer.
4. Set the value of DEPLOYER_CONTRACT_ADDRESS in the environment to equal the address of the OwnableCreate2Deployer contract deployed of step 3 above.
5. Set the deployer key to be a unique value for the run.
contract.
