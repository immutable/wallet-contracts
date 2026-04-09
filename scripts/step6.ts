import * as fs from 'fs';
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
  const mainModuleDynamicAuthAddress = '0xC2d54E4D795469f8616612CC343af078A892F36F';
  const walletImplLocatorContractAddress = '0xDB4b8F9D2C0C731A345a405b6335b3750d197b6C';

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
      gasLimit: 1_000_000,
      maxFeePerGas: 30000000000,
      maxPriorityFeePerGas: 1000000000,
    });
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to: ${mainModuleDynamicAuthAddress}`);

  fs.writeFileSync('step6.json', JSON.stringify({
    mainModuleDynamicAuth: mainModuleDynamicAuthAddress,
    walletImplLocatorContractAddress: walletImplLocatorContractAddress,
    signerAddress: signerAddress,
  }, null, 1));

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
