import * as hre from 'hardhat';
import { Contract, ContractFactory, utils } from 'ethers';
import { newContractFactory, waitForInput } from './helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * Step 6
 **/
async function step6(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, submitterAddress, signerAddress, } = env;
  const mainModuleDynamicAuthAddress = '<CHANGE_ME>';
  const walletImplLocatorContractAddress = '<CHANGE_ME>';

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] mainModuleDynamicAuth address ${mainModuleDynamicAuthAddress}`);
  console.log(`[${network}] walletImplLocatorContract address ${walletImplLocatorContractAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWalletImplLocatorChanger().getAddress()}`
  );

  // --- Step 6: Deployed using alternate wallet
  // Fund the implementation changer
  // WARNING: If the deployment fails at this step, DO NOT RERUN without commenting out the code a prior which deploys the contracts.
  const fundingTx = await wallets.getWallet().sendTransaction({
    to: await wallets.getWalletImplLocatorChanger().getAddress(),
    value: utils.parseEther('10'),
    gasLimit: 30000000,
    maxFeePerGas: 10000000000,
    maxPriorityFeePerGas: 10000000000,
  });
  await fundingTx.wait();
  console.log(`[${network}] Transfered funds to the wallet locator implementer changer with hash ${fundingTx.hash}`);

  // Set implementation address on impl locator to dynamic module auth addr
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), 'LatestWalletImplLocator');
  const walletImplLocator: Contract = contractFactory.attach(walletImplLocatorContractAddress);
  const tx = await walletImplLocator
    .connect(wallets.getWalletImplLocatorChanger())
    .changeWalletImplementation(mainModuleDynamicAuthAddress);
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to: ${mainModuleDynamicAuthAddress}`);

  return env;
}

// Call primary function
step6()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
