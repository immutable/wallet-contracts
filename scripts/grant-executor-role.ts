import * as hre from 'hardhat';
import { ethers as hardhat } from 'hardhat';
import { Contract, ContractFactory, Signer, Wallet } from 'ethers';
import promptSync from 'prompt-sync';

import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newContractFactory, waitForInput } from './helper-functions';

/**
 * GrantExecutorRole grants the `EXECUTOR` role to a given address. This function can only
 * be invoked by the wallet with the `DEFAULT_ADMIN_ROLE` role. This script should only
 * be used for local and Devnet development. To grant the executor role on Testnet or
 * Mainnet please use BlockScout.
 **/
async function grantExecutorRole(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, multiCallDeployContractAddress } = env;
  const prompt = promptSync();

  // Setup wallet with default admin role
  const multiCallAdminSigner: Signer = new Wallet(env.multiCallAdminPK, hardhat.provider);

  // Attach to contract
  const contractName = "MultiCallDeploy";
  const contractFactory: ContractFactory = await newContractFactory(multiCallAdminSigner, contractName);

  console.log(`[${network}] Confirm contract address ${multiCallDeployContractAddress} ...`);
  const multiCallDeploy: Contract = await contractFactory.attach(multiCallDeployContractAddress);

  // Obtain the executor role reference
  const hasAdminRole = await multiCallDeploy.hasRole(
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    await multiCallAdminSigner.getAddress(),
  );
  console.log(`[${network}] ${await multiCallAdminSigner.getAddress()} has admin role ${hasAdminRole}`);

  const executorRole = await multiCallDeploy.EXECUTOR_ROLE();
  console.log(`[${network}] Executor role ${executorRole}`);

  const newAddress = prompt(`[${network}] New address to be added to the executor role: `);
  console.log(`[${network}] Confirm new address ${newAddress} ...`);

  await waitForInput();

  // Only grant the role if the wallet does not already have access to this to this role.
  const isExecutor = await multiCallDeploy.hasRole(executorRole, newAddress.trim());
  if (!isExecutor) {
    const tx = await multiCallDeploy.grantExecutorRole(newAddress.trim(), {
      maxFeePerGas: hardhat.utils.parseUnits('15', 'gwei'),
      maxPriorityFeePerGas: hardhat.utils.parseUnits('10', 'gwei'),
    });
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
