import * as hre from 'hardhat';
import { Contract, ContractFactory, ContractFunction, Transaction } from 'ethers';

import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newContractFactory, waitForInput } from './helper-functions';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * revokeExecutorRole revokes the `EXECUTOR` role to a given address. This function can only
 * be invoked by the wallet with the `DEFAULT_ADMIN_ROLE` role.
 **/
async function revokeExecutorRole(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, multiCallDeployContractAddress } = env;

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

  const newAddress = `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`;
  console.log(`[${network}] Revoking executor role from address ${newAddress} ...`);

  // await waitForInput();

  // Only revoke the role if the wallet currently has access to this role.
  const isExecutor = await multiCallDeploy.hasRole(executorRole, newAddress.trim());
  if (isExecutor) {
    const tx = await multiCallDeploy.revokeRole(executorRole, newAddress.trim());
    await tx.wait();
    console.log(`[${network}] Executor role revoked from ${newAddress}`);
  } else {
    console.log(`[${network}] ${newAddress} does not have the executor role`);
  }

  return env;
}

// Call primary function
revokeExecutorRole()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Revoke successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
