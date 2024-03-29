import * as hre from 'hardhat';
import { Contract, ContractFactory, ContractFunction, Transaction } from 'ethers';
import promptSync from 'prompt-sync';

import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newContractFactory, waitForInput } from './helper-functions';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * GrantExecutorRole grants the `EXECUTOR` role to a given address. This function can only
 * be invoked by the wallet with the `DEFAULT_ADMIN_ROLE` role.
 **/
async function grantExecutorRole(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, multiCallDeployContractAddress } = env;
  const prompt = promptSync();

  // Setup wallet with default admin role
  const wallets: WalletOptions = await newWalletOptions(env);

  // Attach to contract
  const contractName = "MultiCallDeploy";
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), contractName);

  console.log(`[${network}] Confirm contract address ${multiCallDeployContractAddress} ...`);
  const multiCallDeploy: Contract = await contractFactory.attach(multiCallDeployContractAddress);

  // Obtain the executor role reference
  const executorRole = await multiCallDeploy.EXECUTOR_ROLE();
  console.log(`[${network}] Executor role ${executorRole}`);

  const newAddress = prompt(`[${network}] New address to be added to the executor role: `);
  console.log(`[${network}] Confirm new address ${newAddress} ...`);

  await waitForInput();

  // Only grant the role if the wallet does not already have access to this to this role.
  const isExecutor = await multiCallDeploy.hasRole(executorRole, newAddress.trim());
  if (!isExecutor) {
    const tx = await multiCallDeploy.grantExecutorRole(newAddress.trim());
    await tx.wait();
    console.log(`[${network}] Executor role granted to ${newAddress}`);
  } else {
    console.log(`[${network}] ${newAddress} already has the executor role`);
  }

  return env;
}

// Call primary function
grantExecutorRole()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Grant successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
