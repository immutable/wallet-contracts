import { BytesLike, Contract, ContractFactory, utils } from 'ethers';

import { EnvironmentInfo } from './environment';
import { newContractFactory } from './helper-functions';
import { WalletOptions } from './wallet-options';
import ContractDeployerInterface from './abi/OwnableCreate2Deployer.json';

// Key for the salt, use this to change the address of the contract

/**
 * We use the key to generate a salt to generate a deterministic address for
 * the contract that isn't dependent on the nonce of the contract deployer account.
*/
const getSaltFromKey = (): string => {
  let key: string = 'relayer-deployer-key-99';
  return utils.keccak256(utils.defaultAbiCoder.encode(['string'], [key]));
};

/**
 * Load the OwnableCreate2Deployer 
 */
const loadDeployerContract = async (env: EnvironmentInfo, walletOptions: WalletOptions): Promise<Contract> => {
  console.log(`walletOptions.getWallet().getAddress()`, walletOptions.getWallet().getAddress());
  return new Contract(env.deployerContractAddress, ContractDeployerInterface.abi, walletOptions.getWallet());
}

/**
 * Deploy the contract using the OwnableCreate2Deployer contract.
 */
export async function deployContractViaCREATE2(
  env: EnvironmentInfo,
  walletsOptions: WalletOptions,
  contractName: string,
  constructorArgs: Array<string | undefined>): Promise<Contract> {

  const salt: string = getSaltFromKey();
  console.log(`[${env.network}] Salt: ${salt}`);
  const deployer: Contract = await loadDeployerContract(env, walletsOptions);
  console.log(`[${env.network}] Deployer: ${deployer.address}`);
  const contractFactory: ContractFactory = await newContractFactory(walletsOptions.getWallet(), contractName);
  console.log(`[${env.network}] Contract Factory: ${await contractFactory.signer?.getAddress()}`);
  const bytecode: BytesLike | undefined = contractFactory.getDeployTransaction(...constructorArgs).data;
  console.log(`[${env.network}] Bytecode: ${bytecode}`);

  console.log(`[${env.network}] Deploying contract...`);
  // Deploy the contract
  let tx = await deployer.deploy(bytecode, salt, {
    gasLimit: 30000000,
    maxFeePerGas: 10000000000,
    maxPriorityFeePerGas: 10000000000,
  });
  console.log(`[${env.network}] Transaction: ${JSON.stringify(tx)}`);
  const receipt = await tx.wait();
  console.log(`[${env.network}] Receipt: ${JSON.stringify(receipt)}`);

  // Calculate the address the contract is deployed to, and attach to return it
  const contractAddress = await deployer.deployedAddress(bytecode, await walletsOptions.getWallet().getAddress(), salt);
  console.log(`[${env.network}] Deployed ${contractName} to ${contractAddress}`);

  return contractFactory.attach(contractAddress);
}

/**
 * Deploy the contract via a wallet
 */
export async function deployContract(
  env: EnvironmentInfo,
  walletsOptions: WalletOptions,
  contractName: string,
  constructorArgs: Array<string | undefined>): Promise<Contract> {
  const contractFactory: ContractFactory = await newContractFactory(walletsOptions.getWallet(), contractName);
  const contract: Contract = await contractFactory.connect(walletsOptions.getWallet()).deploy(...constructorArgs, {
    gasLimit: 30000000,
    maxFeePerGas: 10000000000,
    maxPriorityFeePerGas: 10000000000,
  });
  console.log(`[${env.network}] Deployed ${contractName} to ${contract.address}`);
  return contract;
}