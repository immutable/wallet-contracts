import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers as hardhat } from 'hardhat';

import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { deployContractViaCREATE2 } from './contract';

/**
 * main function deploys all the SCW infrastructure.
 **/
async function main(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, submitterAddress, signerAddress } = env;

  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Submitter address ${submitterAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);

  // Administration accounts
  let multiCallAdminPubKey = '0x575be326c482a487add43974e0eaf232e3366e13';
  let factoryAdminPubKey = '0xddb70ddcd14dbd57ae18ec591f47454e4fc818bb';
  let walletImplLocatorAdmin = '0xb49c99a17776c10350c2be790e13d4d8dfb1c578';
  let signerRootAdminPubKey = '0x65af83f71a05d7f6d06ef9a57c9294b4128ccc2c';
  let signerAdminPubKey = '0x69d09644159e7327dbfd0af9a66f8e332c593e79';

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWalletImplLocatorChanger().getAddress()}`
  );

  console.log(`[${network}] Deploying contracts...`);

  // Key for the salt, use this to change the address of the contract
  let key: string = 'relayer-deployer-key-1';

  // --- STEP 1: Deployed using Passport Nonce Reserver.
  // 1. Deploy multi call deploy (PNR)
  const multiCallDeploy = await deployContractViaCREATE2(env, wallets, 'MultiCallDeploy', [multiCallAdminPubKey, submitterAddress]);

  // 2. Deploy factory with multi call deploy address as deployer role EST (PNR)
  const factory = await deployContractViaCREATE2(env, wallets, 'Factory', [factoryAdminPubKey, multiCallDeploy.address]);

  // --- Step 2: Deployed using CREATE2 Factory
  // 3. Deploy wallet impl locator (CFC)
  const walletImplLocator = await deployContractViaCREATE2(env, wallets, 'LatestWalletImplLocator', [
    walletImplLocatorAdmin, await wallets.getWalletImplLocatorChanger().getAddress()
  ]);

  // --- Step 3: Deployed using Passport Nonce Reserver.
  // 4. Deploy startup wallet impl (PNR)
  const startupWalletImpl = await deployContractViaCREATE2(env, wallets, 'StartupWalletImpl', [walletImplLocator.address]);

  // --- Step 4: Deployed using CREATE2 Factory.
  // 5. Deploy main module dynamic auth (CFC)
  const mainModuleDynamicAuth = await deployContractViaCREATE2(env, wallets, 'MainModuleDynamicAuth', [factory.address, startupWalletImpl.address]);

  // --- Step 5: Deployed using Passport Nonce Reserver.
  // 6. Deploy immutable signer (PNR)
  const immutableSigner = await deployContractViaCREATE2(env, wallets, 'ImmutableSigner', [signerRootAdminPubKey, signerAdminPubKey, signerAddress]);

  // --- Step 6: Deployed using alternate wallet (?)
  // Fund the implementation changer
  // WARNING: If the deployment fails at this step, DO NOT RERUN without commenting out the code a prior which deploys the contracts.
  const fundingTx = await wallets.getWallet().sendTransaction({
    to: await wallets.getWalletImplLocatorChanger().getAddress(),
    value: hardhat.utils.parseEther('10'),
    gasLimit: 30000000,
    maxFeePerGas: 10000000000,
    maxPriorityFeePerGas: 10000000000,
  });
  await fundingTx.wait();
  console.log(`[${network}] Transfered funds to the wallet locator implementer changer with hash ${fundingTx.hash}`);

  // Set implementation address on impl locator to dynamic module auth addr
  const tx = await walletImplLocator
    .connect(wallets.getWalletImplLocatorChanger())
    .changeWalletImplementation(mainModuleDynamicAuth.address);
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to: ${mainModuleDynamicAuth.address}`);

  // Output JSON file with addresses and role addresses
  const jsonOutput = {
    FactoryAddress: factory.address,
    WalletImplLocatorAddress: walletImplLocator.address,
    StartupWalletImplAddress: startupWalletImpl.address,
    MainModuleDynamicAuthAddress: mainModuleDynamicAuth.address,
    ImmutableSignerContractAddress: immutableSigner.address,
    MultiCallDeployAddress: multiCallDeploy.address,
    DeployerAddress: await wallets.getWallet().getAddress(),
    FactoryAdminAddress: factoryAdminPubKey,
    FactoryDeployerAddress: env.submitterAddress,
    WalletImplLocatorAdminAddress: walletImplLocatorAdmin,
    WalletImplLocatorImplChangerAddress: await wallets.getWalletImplLocatorChanger().getAddress(),
    SignerRootAdminAddress: signerRootAdminPubKey,
    SignerAdminAddress: signerAdminPubKey,
    ImmutableSignerAddress: env.signerAddress,
    MultiCallAdminAddress: multiCallAdminPubKey,
    MultiCallExecutorAddress: env.submitterAddress
  };

  fs.writeFileSync("deploy_output.json", JSON.stringify(jsonOutput, null, 1));

  return env;
}

// Call primary function
main()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
