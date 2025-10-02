import * as fs from 'fs';
import * as hre from 'hardhat';
import { Contract, ContractFactory, utils } from 'ethers';
import { newContractFactory } from '../helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';

/**
 * Step 5 - V2 Deployment
 **/
async function step5(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress, } = env;

  // Read addresses from previous deployment steps
  const step4Data = JSON.parse(fs.readFileSync('scripts/v2/step4.json', 'utf8'));
  const step2Data = JSON.parse(fs.readFileSync('scripts/v2/step2.json', 'utf8'));
  
  const mainModuleDynamicAuthV2Address = step4Data.mainModuleDynamicAuthV2;
  const walletImplLocatorContractAddress = step2Data.latestWalletImplLocator;

  console.log(`[${network}] Starting V2 deployment...`);
  console.log(`[${network}] mainModuleDynamicAuthV2 address ${mainModuleDynamicAuthV2Address}`);
  console.log(`[${network}] walletImplLocatorContract address ${walletImplLocatorContractAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWallet().getAddress()}`
  );

  // --- Step 5: Deployed using alternate wallet
  // Set implementation address on impl locator to dynamic module auth V2 addr
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), 'LatestWalletImplLocator');
  const walletImplLocator: Contract = contractFactory.attach(walletImplLocatorContractAddress);
  const tx = await walletImplLocator
    .connect(wallets.getWallet())
    .changeWalletImplementation(mainModuleDynamicAuthV2Address, {
      gasLimit: process.env.GAS_LIMIT,
      maxFeePerGas: process.env.MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS,
    });
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to V2: ${mainModuleDynamicAuthV2Address}`);

  return env;
}

// Call primary function
step5()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
