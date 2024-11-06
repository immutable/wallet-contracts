# Steps for deploying

The smart contract wallets require 3 ledgers for deployment. The first ledger uses the Passport nonce reserver. The second ledger is a deployment ledger, and the third ledger is the priviledged transaction multisig ledger. The corresponding ledgers are labelled in each step.

The ledgers used in the deployment have the following public keys;

* Passport Nonce Reserver - `0x5780B22CCd5830595C9EC79a8E273ee83Be79d17`
* Deployment Key - `0xdDA0d9448Ebe3eA43aFecE5Fa6401F5795c19333`
* Priviledged Key - `0x0E2D55943f4EF07c336C12A85d083c20FF189182`

These keys use different account indexes on the ledger. Remember to adjust the `accountIndex` in the `WalletOptions`
constructor.

## Step 1

Startup a Hardhat node if testing locally.

## Step 2

Transfer funds to the 3 ledgers used for the procedure. ~10 IMX will suffice for the operation.

## Step 3

Deploy the `OwnableCreate2Deployer` contract using the deployment ledger. Remember to set the correct owner of the
contract during the deployment. For example the contract can be deployed using the command below;

`forge create --rpc-url <http://127.0.0.1:8545> --constructor-args "<ADDRESS_OF_LEDGER_ACCOUNT>" --legacy --hd-path "m/44'/60'/0'/0/0" src/OwnableCreate2Deployer.sol:OwnableCreate2Deployer`

The contract factory repo is located [here](https://github.com/immutable/contract-deployer). Please note that you
shouldn't deploy the contract factory for Testnet, or Mainnet. Instead use the pre-existing deployments, the
addresses for which are located [here](https://github.com/immutable/contract-deployer/blob/main/README.md#deployed-addresses).

Set the value of DEPLOYER_CONTRACT_ADDRESS in the environment to equal the address of the OwnableCreate2Deployer
contract deployed above.

## Step 4

Set the deployer key to be a unique value for the run. The deployer key is used by the CREATE2 contract factory
to determine the address of the deployed contract. The deployer key can be found in the `getSaltFromKey` function
in the `contract.ts` file.

## Step 5

Create a `.env` file. Use the `env.example` as a template. Set the following values in the `.env`

* Set the DEPLOYER_CONTRACT_ADDRESS to match the address of the OwnableCreate2Deployer factory.
* Set the MULTICALL_ADMIN_PUB_KEY and FACTORY_ADMIN_PUB_KEY to match the address of the address of the privileged transaction multisig. This address for reference should be `0x0E2D55943f4EF07c336C12A85d083c20FF189182`.

## Execution steps

### `step0.ts`

In this step we deploy the `MultiCallDeploy` only. We use the standard deployment key (Orange key) for this deployment, as the address of the MultiCallDeploy strictly does
not need to be the same across all the environments.

* Set the value of RELAYER_SUBMITTER_EOA_PUB_KEY to match the EOA of the primary Relayer submitter. The Submitter EOA is granted execute permission on the MultiCallDeploy.
* Set the value of MULTICALL_ADMIN_PUB_KEY
* Set the `accountIndex` to 0 in `wallet-options.ts`.
* Execute the command `npx hardhat run scripts/step0.ts --network <ENV>`

### `step1.ts`

In this step we deploy the `Factory` contract. We use the Passport Nonce reserver
in this step because we want the `Factory` contract to have the same address across all our chains, as
this address is used to produce a deterministic counter factual address for the smart contract wallets across
all the chains.

* Set the value of RELAYER_SUBMITTER_EOA_PUB_KEY to match the EOA of the primary Relayer submitter.
* Set the value of the FACTORY_ADMIN_PUB_KEY to the privileged mulstisig pub key (Purple ledger)
* Set the value of `multiCallDeployAddress` to match the address of the contract deployed in Step0.
* Set the `accountIndex` to 10 in `wallet-options.ts`.
* Execute the command `npx hardhat run scripts/step1.ts --network <ENV>`

### `step2.ts`

In this step we deploy the contract that tracks the location of the latest wallet implementation. As this step
just uses the CREATE2 contract factory we use the standard deployment key (Orange Key!!!).

* Set the value of DEPLOYER_CONTRACT_ADDRESS to the address of the CREATE2 factory contract.
* Set the value of WALLET_IMPL_LOCATOR_ADMIN, and WALLET_IMPL_CHANGER_ADMIN environment variables to the public key of the Privileged key.
* Set the `accountIndex` to 0.
* Execute the command `npx hardhat run scripts/step2.ts --network <ENV>`

### `step3.ts`

In this step we deploy the startup wallet. This wallet address is used to generate the CFA, and hence like the Factory uses a Passport nonce reserver key.

* Set the `accountIndex` to 10.
* WARNING: COPY the `LatestWalletImplLocator` address into the `step3.ts` script from step2.
* Execute the command `npx hardhat run scripts/step3.ts --network <ENV>`

### `step4.ts`

In this step we deploy the `MainModuleDynamicAuth` module, and it should use the standard deployment key (Orange Key!!!)

* Set the `accountIndex` to 0.
* WARNING: COPY the `FactoryAddress` address into the `step4.ts` script from step1.
* WARNING: COPY the `StartupWalletImpl` address into the `step4.ts` script from step3.
* Execute the command `npx hardhat run scripts/step4.ts --network <ENV>`

### `step5.ts`

In this step we deploy the Signer contract, which is also used to generate the CFA, and hence like the Factory, and
Startup wallet implementation, we use the Passport nonce reserver key (Black Key!!!) in this step.

* Set the `accountIndex` to 10.
* Set the SIGNER_ROOT_ADMIN_PUB_KEY to the Privileged public key.
* Set the SIGNER_ADMIN_PUB_KEY to the relevant Breakglass public key.
* Set the IMMUTABLE_SIGNER_PUB_KEY
* Execute the command `npx hardhat run scripts/step5.ts --network <ENV>`

### `step6.ts`

In this step we point the `LatestWalletImplLocator` to the `MainModuleDynamicAuth` module address. In this step
we use the privileged deployment key (Purple Key!!!), as we gave this key authority to alter the implementation address in `step2.ts`.
above.

* Set the `accountIndex` to 10.
* WARNING: COPY the `MainModuleDynamicAuth` address into the `step6.ts` script from step4.
* WARNING: COPY the `LatestWalletImplLocator` address into the `step6.ts` script from step2.
* Execute the command `npx hardhat run scripts/step6.ts --network <ENV>`

## Update Relayer and Passport Environment

Edit the `.env`, and `deployment.yaml` environment files in the Relayer for the relevant environment.

* DEPLOY_AND_EXECUTE_ADDRESS to equal the address of the `MultiCallDeploy`
* FACTORY_ADDRESS to equal the address of the `Factory`
* MAIN_MODULE_ADDRESS to equal the address of the `StartupWalletImpl`
* IMMUTABLE_SIGNER_CONTRACT_ADDRESS to equal the address of the `ImmutableSigner`

Edit the `deployment.yaml` environment files in the Passport MR service for the relevant environment.

* WALLET_FACTORY_ADDRESS to equal the address of the `Factory`
* WALLET_IMPLEMENTATION_MODULE_ADDRESS to equal the address of the `StartupWalletImpl`
* IMMUTABLE_SIGNER_ADDRESS to equal the address of the `ImmutableSigner`
