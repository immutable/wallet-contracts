# Steps for deploying

The smart contract wallets require 3 ledgers for deployment. The first ledger uses the Passport nonce reserver. The second ledger is a deployment ledger, and the third ledger is the priviledged ledger. Some of the steps below need to signed using the Passport nonce reserver, whilst use the standard deployment ledger, and finally the priviledged ledger. The corresponding ledgers are labelled in each step.

The ledgers used in the deployment have the following public keys;

* Passport Nonce Reserver - `0x5780B22CCd5830595C9EC79a8E273ee83Be79d17`
* Deployment Key - `0xdDA0d9448Ebe3eA43aFecE5Fa6401F5795c19333`
* Priviledged Key - `0x0E2D55943f4EF07c336C12A85d083c20FF189182`

## Step 1

Startup a Hardhat node if testing locally.

## Step 2

Transfer funds to the 3 ledgers used for the procedure. ~10 IMX will suffice for the operation.

## Step 3

Deploy the `OwnableCreate2Deployer` contract using the deployment ledger. Remember to set the correct owner of the contract during the deployment. For example the contract can be deployed using the command below;

`forge create --rpc-url <http://127.0.0.1:8545> --constructor-args "<ADDRESS_OF_LEDGER_ACCOUNT>" --legacy --hd-path "m/44'/60'/0'/0/0" src/OwnableCreate2Deployer.sol:OwnableCreate2Deployer`

The contract factory repo is located [here](https://github.com/immutable/contract-deployer). Please note that you shouldn't deploy the contract factory for Testnet, or Mainnet. Instead use the pre-existing deployments, the addresses for which are located [here]().:whilst

Set the value of DEPLOYER_CONTRACT_ADDRESS in the environment to equal the address of the OwnableCreate2Deployer contract deployed above.

## Step 4

Set the deployer key to be a unique value for the run.

## Step 5

Copy the relevant `.env.X` file to `.env`. For example in the case of Devnet `cp .env.devnet .env`

## Execution steps

### `step1.ts`

Use the Passport Nonce Reserver Key

* Execute the command `npx hardhat run scripts/step1.ts --network <ENV>`

### `step2.ts`

Use a deployer key. This key will have privileges to change the implementation address.

* Execute the command `npx hardhat run scripts/step2.ts --network <ENV>`

### `step3.ts`

Use the Passport Nonce Reserver Key

* Execute the command `npx hardhat run scripts/step3.ts --network <ENV>`
  * WARNING: COPY the `LatestWalletImplLocator` address into the `step3.ts` script from step2.

### `step4.ts`

Use a deployer key

* Execute the command `npx hardhat run scripts/step4.ts --network <ENV>`
  * WARNING: COPY the `FactoryAddress` address into the `step4.ts` script from step1.
  * WARNING: COPY the `StartupWalletImpl` address into the `step4.ts` script from step3.

### `step5.ts`

Use the Passport Nonce Reserver Key

* Execute the command `npx hardhat run scripts/step5.ts --network <ENV>`

### `step6.ts`

Use the priviledged key for this step.

* Execute the command `npx hardhat run scripts/step6.ts --network <ENV>`
  * WARNING: COPY the `MainModuleDynamicAuth` address into the `step6.ts` script from step4.
  * WARNING: COPY the `LatestWalletImplLocator` address into the `step6.ts` script from step2.

## Update Relayer and Passport Environment

Edit the following environment variables in the Relayer in the `.env.local` and `local-deployment.yaml` files

* DEPLOY_AND_EXECUTE_ADDRESS to equal the address of the `MultiCallDeploy`
* FACTORY_ADDRESS to equal the address of the `Factory`
* MAIN_MODULE_ADDRESS to equal the address of the `StartupWalletImpl`
* IMMUTABLE_SIGNER_CONTRACT_ADDRESS to equal the address of the `ImmutableSigner`
