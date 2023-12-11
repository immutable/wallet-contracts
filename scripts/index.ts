import * as path from 'path';
import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers, Contract, ContractFactory, Signer } from 'ethers';
import { ethers as hardhat } from 'hardhat';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newContractFactory } from './helper-functions';
import { newWalletOptions, WalletOptions } from './wallet-options';

/**
 * main function deploys all the SCW infrastructure.
 **/
async function main(): Promise<EnvironmentInfo> {
  const environment = loadEnvironmentInfo(hre.network.name);
  const { network, submitterAddress, signerAddress, outputPath } = environment;

  console.log('');
  console.log(`[${network}] Starting deployment...`);
  console.log(`[${network}] Submitter address ${submitterAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);
  console.log(`[${network}] Output ${outputPath}`);

  // Administration accounts
  let multiCallAdminPubKey = '0x575be326c482a487add43974e0eaf232e3366e13';
  let factoryAdminPubKey = '0xddb70ddcd14dbd57ae18ec591f47454e4fc818bb';

  // CHANGEME: When deploying to mainnet, this address needs to match the second address from the wallet
  let walletImplLocatorAdmin = '0xb49c99a17776c10350c2be790e13d4d8dfb1c578';
  let signerRootAdminPubKey = '0x65af83f71a05d7f6d06ef9a57c9294b4128ccc2c';
  let signerAdminPubKey = '0x69d09644159e7327dbfd0af9a66f8e332c593e79';

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(environment);
  //console.log(`[${network}] Contract Deployer Address: ${await wallets.getContractDeployer().getAddress()}`);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWalletImplLocatorChanger().getAddress()}`
  );

  // TOTAL deployment cost = 0.009766773 GWEI = 0.000000000009766773 ETHER
  // Deployments with esimated gas costs (GWEI)
  console.log(`[${network}] Deploying contracts...`);

  // 1. Deploy multi call deploy
  // EST gas cost: 0.001561956
  const multiCallDeployCF: ContractFactory = await newContractFactory(wallets.getContractDeployer(), 'MultiCallDeploy');
  const multiCallDeploy: Contract = await multiCallDeployCF.deploy(multiCallAdminPubKey, submitterAddress, {});
  await multiCallDeploy.deployTransaction.wait();
  console.log(`[${network}] Multi Call Deploy deployed to: ${multiCallDeploy.address}`);

  // 2. Deploy factory with multi call deploy address as deployer role EST
  // EST gas cost: 0.001239658
  const factoryCF: ContractFactory = await newContractFactory(wallets.getContractDeployer(), 'Factory');
  const factory: Contract = await factoryCF.deploy(factoryAdminPubKey, multiCallDeploy.address);
  await factory.deployTransaction.wait();
  console.log(`[${network}] Factory deployed to: ${factory.address}`);

  // 3. Deploy wallet impl locator
  // EST gas cost: 0.001021586
  const walletImplLocatorCF: ContractFactory = await newContractFactory(
    wallets.getContractDeployer(),
    'LatestWalletImplLocator'
  );
  const walletImplLocator: Contract = await walletImplLocatorCF.deploy(
    walletImplLocatorAdmin,
    await wallets.getWalletImplLocatorChanger().getAddress()
  );
  await walletImplLocator.deployTransaction.wait();
  console.log(`[${network}] Wallet Implementation Locator deployed to: ${walletImplLocator.address}`);

  // 4. Deploy startup wallet impl
  // EST gas cost: 0.000175659
  const startupWalletImplCF: ContractFactory = await newContractFactory(
    wallets.getContractDeployer(),
    'StartupWalletImpl'
  );
  const startupWalletImpl: Contract = await startupWalletImplCF.deploy(walletImplLocator.address);
  await startupWalletImpl.deployTransaction.wait();
  console.log(`[${network}] Startup Wallet Implementation deployed to: ${startupWalletImpl.address}`);

  // 5. Deploy main module dynamic auth
  // EST gas cost: 0.003911813
  const mainModuleCF: ContractFactory = await newContractFactory(
    wallets.getContractDeployer(),
    'MainModuleDynamicAuth'
  );
  const mainModule: Contract = await mainModuleCF.deploy(factory.address, startupWalletImpl.address);
  await mainModule.deployTransaction.wait();
  console.log(`[${network}] Main Module Dynamic Auth deployed to: ${mainModule.address}`);

  // 6. Deploy immutable signer
  // EST gas cost: 0.001856101
  const immutableSignerCF: ContractFactory = await newContractFactory(wallets.getContractDeployer(), 'ImmutableSigner');
  const immutableSigner: Contract = await immutableSignerCF.deploy(
    signerRootAdminPubKey,
    signerAdminPubKey,
    signerAddress
  );
  await immutableSigner.deployTransaction.wait();
  console.log(`[${network}] Immutable Signer deployed to: ${immutableSigner.address}`);

  // Fund the implementation changer
  // WARNING: If the deployment fails at this step, DO NOT RERUN without commenting out the code a prior which deploys the contracts.
  // TODO: Code below can be improved by calculating the amount that is required to be transferred.
  const fundingTx = await wallets.getContractDeployer().sendTransaction({
    to: await wallets.getWalletImplLocatorChanger().getAddress(),
    value: ethers.utils.parseEther('10')
  });
  await fundingTx.wait();
  console.log(`[${network}] Transfered funds to the wallet locator implementer changer with hash ${fundingTx.hash}`);

  // Set implementation address on impl locator to dynamic module auth addr
  const tx = await walletImplLocator
    .connect(wallets.getWalletImplLocatorChanger())
    .changeWalletImplementation(mainModule.address);
  await tx.wait();
  console.log(`[${network}] Wallet Impl Locator implementation changed to: ${mainModule.address}`);

  // Output JSON file with addresses and role addresses
  const JSONOutput = {
    FactoryAddress: factory.address,
    WalletImplLocatorAddress: walletImplLocator.address,
    StartupWalletImplAddress: startupWalletImpl.address,
    MainModuleDynamicAuthAddress: mainModule.address,
    ImmutableSignerContractAddress: immutableSigner.address,
    MultiCallDeployAddress: multiCallDeploy.address,
    DeployerAddress: await wallets.getContractDeployer().getAddress(),
    FactoryAdminAddress: factoryAdminPubKey,
    FactoryDeployerAddress: environment.submitterAddress,
    WalletImplLocatorAdminAddress: walletImplLocatorAdmin,
    WalletImplLocatorImplChangerAddress: await wallets.getWalletImplLocatorChanger().getAddress(),
    SignerRootAdminAddress: signerRootAdminPubKey,
    SignerAdminAddress: signerAdminPubKey,
    ImmutableSignerAddress: environment.signerAddress,
    MultiCallAdminAddress: multiCallAdminPubKey,
    MultiCallExecutorAddress: environment.submitterAddress
  };

  fs.writeFileSync(environment.outputPath, JSON.stringify(JSONOutput, null, 1));

  return environment;
}

// Call primary function
main()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
  })
  .catch(err => {
    console.error(err.message);
    process.exitCode = 1;
  });
