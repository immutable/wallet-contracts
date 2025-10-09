import * as hre from 'hardhat';
import { Contract, ContractFactory, ContractFunction, Transaction } from 'ethers';
import promptSync from 'prompt-sync';

import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newContractFactory, waitForInput } from './helper-functions';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * GrantDeployerRole grants the `DEPLOYER_ROLE` to a given address. This function can only
 * be invoked by the wallet with the `DEFAULT_ADMIN_ROLE` role.
 **/
async function grantDeployerRole(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  const factoryContractAddress = process.env.FACTORY_CONTRACT_ADDRESS;
  const prompt = promptSync();

  if (!factoryContractAddress) {
    throw new Error('FACTORY_CONTRACT_ADDRESS environment variable is required');
  }

  // Setup wallet with default admin role
  const wallets: WalletOptions = await newWalletOptions(env);

  // Attach to contract
  const contractName = "Factory";
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), contractName);

  console.log(`[${network}] Confirm contract address ${factoryContractAddress} ...`);
  const factory: Contract = await contractFactory.attach(factoryContractAddress);

  // Obtain the deployer role reference
  const deployerRole = await factory.DEPLOYER_ROLE();
  console.log(`[${network}] Deployer role ${deployerRole}`);

  // Get the address to grant the role to
  let newAddress = prompt(`[${network}] Enter the address to grant DEPLOYER_ROLE to: `);
  console.log(`[${network}] Confirm new address ${newAddress} ...`);

  await waitForInput();
  
  if (!newAddress) {
    throw new Error('No address provided for role grant');
  }
  
  console.log(`[${network}] Granting deployer role to ${newAddress} ...`);

  // Only grant the role if the wallet does not already have access to this role.
  const isDeployer = await factory.hasRole(deployerRole, newAddress.trim());
  if (!isDeployer) {
    const tx = await factory.grantRole(deployerRole, newAddress.trim());
    await tx.wait();
    console.log(`[${network}] Deployer role granted to ${newAddress}`);
  } else {
    console.log(`[${network}] ${newAddress} already has the deployer role`);
  }

  return env;
}

// Call primary function
grantDeployerRole()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Grant successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
