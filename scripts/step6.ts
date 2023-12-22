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
  const { network, signerAddress, } = env;
  const mainModuleDynamicAuthAddress = '0x38D64731246b62fd7A79731ff1cC4D579aA420D0';
  const walletImplLocatorContractAddress = '0x09BfBa65266e35b7Aa481Ee6fddbE4bA8845C8Af';

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] mainModuleDynamicAuth address ${mainModuleDynamicAuthAddress}`);
  console.log(`[${network}] walletImplLocatorContract address ${walletImplLocatorContractAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWallet().getAddress()}`
  );

  // --- Step 6: Deployed using alternate wallet
  // Set implementation address on impl locator to dynamic module auth addr
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), 'LatestWalletImplLocator');
  const walletImplLocator: Contract = contractFactory.attach(walletImplLocatorContractAddress);
  const tx = await walletImplLocator
    .connect(wallets.getWallet())
    .changeWalletImplementation(mainModuleDynamicAuthAddress, {
      gasLimit: 30000000,
      maxFeePerGas: 10000000000,
      maxPriorityFeePerGas: 10000000000,
    });
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
