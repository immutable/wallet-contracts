import * as hre from 'hardhat';
import { Contract, ContractFactory, utils } from 'ethers';
import { newContractFactory } from '../helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';

/**
 * Step 6 - V2 Deployment
 **/
async function step6(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress, } = env;
  const mainModuleDynamicAuthV2Address = '0x38D64731246b62fd7A79731ff1cC4D579aA420D0';
  const walletImplLocatorContractAddress = '0x09BfBa65266e35b7Aa481Ee6fddbE4bA8845C8Af';

  console.log(`[${network}] Starting V2 deployment...`);
  console.log(`[${network}] mainModuleDynamicAuthV2 address ${mainModuleDynamicAuthV2Address}`);
  console.log(`[${network}] walletImplLocatorContract address ${walletImplLocatorContractAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWallet().getAddress()}`
  );

  // --- Step 6: Deployed using alternate wallet
  // Set implementation address on impl locator to dynamic module auth V2 addr
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), 'LatestWalletImplLocator');
  const walletImplLocator: Contract = contractFactory.attach(walletImplLocatorContractAddress);
  const tx = await walletImplLocator
    .connect(wallets.getWallet())
    .changeWalletImplementation(mainModuleDynamicAuthV2Address, {
      gasLimit: 30000000,
      maxFeePerGas: 10000000000,
      maxPriorityFeePerGas: 10000000000,
    });
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to V2: ${mainModuleDynamicAuthV2Address}`);

  return env;
}

// Call primary function
step6()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
