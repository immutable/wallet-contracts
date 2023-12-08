import * as path from 'path';
import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers, Contract, ContractFactory } from 'ethers';
import { ethers as hardhat } from 'hardhat';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newContractFactory } from './helper-functions';
import { newLedgerWalletOptions, WalletOptions } from './types';

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
  // TODO: Check with James if these should be the same for Mainnet
  let multiCallAdminPubKey = '0x575be326c482a487add43974e0eaf232e3366e13';
  let factoryAdminPubKey = '0xddb70ddcd14dbd57ae18ec591f47454e4fc818bb';
  let walletImplLocatorAdmin = '0xb49c99a17776c10350c2be790e13d4d8dfb1c578';
  let signerRootAdminPubKey = '0x65af83f71a05d7f6d06ef9a57c9294b4128ccc2c';
  let signerAdminPubKey = '0x69d09644159e7327dbfd0af9a66f8e332c593e79';

  // Required private keys:
  // 1. Deployer
  // 2. walletImplLocatorChanger
  const [contractDeployer, walletImplLocatorImplChanger] = await hardhat.getSigners();

  // Setup wallet
  const walletOptions: WalletOptions = newLedgerWalletOptions(0);

  // TOTAL deployment cost = 0.009766773 GWEI = 0.000000000009766773 ETHER
  // Deployments with esimated gas costs (GWEI)
  console.log(`[${network}] Deploying contracts...`);

  // 1. Deploy multi call deploy
  // EST gas cost: 0.001561956
  // const multiCallDeploy = await deployMultiCallDeploy(
  //   contractDeployer,
  //   multiCallAdminPubKey,
  //   environment.submitterAddress
  // );
  // await multiCallDeploy.deployTransaction.wait();
  const multiCallDeployCF: ContractFactory = await newContractFactory(walletOptions, 'MultiCallDeploy');
  const multiCallDeploy: Contract = await multiCallDeployCF.deploy(multiCallAdminPubKey, submitterAddress, {});
  await multiCallDeploy.deployTransaction.wait();
  console.log(`[${network}] Multi Call Deploy deployed to: ${multiCallDeploy.address}`);

  // 2. Deploy factory with multi call deploy address as deployer role EST
  // EST gas cost: 0.001239658
  // const factory = await deployFactory(
  //   contractDeployer,
  //   factoryAdminPubKey,
  //   multiCallDeploy.address
  // );
  // await factory.deployTransaction.wait();
  // console.log(
  //   `Factory deployed to: ${ factory.address } with hash ${ factory.deployTransaction.hash } `
  // );
  const factoryCF: ContractFactory = await newContractFactory(walletOptions, 'Factory');
  const factory: Contract = await factoryCF.deploy(factoryAdminPubKey, multiCallDeploy.address);
  await factory.deployTransaction.wait();
  console.log(`[${network}] Factory deployed to: ${factory.address}`);

  // 3. Deploy wallet impl locator
  // EST gas cost: 0.001021586
  // const walletImplLocator = await deployWalletImplLocator(
  //   contractDeployer,
  //   walletImplLocatorAdmin,
  //   walletImplLocatorImplChanger.address
  // );
  // await walletImplLocator.deployTransaction.wait();
  // console.log(
  //   `Wallet Implementation Locator deployed to: ${ walletImplLocator.address } with hash ${ walletImplLocator.deployTransaction.hash } `
  // );
  const walletImplLocatorCF: ContractFactory = await newContractFactory(walletOptions, 'LatestWalletImplLocator');
  const walletImplLocator: Contract = await walletImplLocatorCF.deploy(
    walletImplLocatorAdmin,
    walletImplLocatorImplChanger.address
  );
  await walletImplLocator.deployTransaction.wait();
  console.log(`[${network}] Wallet Implementation Locator deployed to: ${walletImplLocator.address}`);

  // 4. Deploy startup wallet impl
  // EST gas cost: 0.000175659
  // const startupWalletImpl = await deployStartUp(
  //   contractDeployer,
  //   walletImplLocator.address
  // );
  // await startupWalletImpl.deployTransaction.wait();
  // console.log(
  //   `Startup Wallet Impl deployed to: ${ startupWalletImpl.address } with hash ${ startupWalletImpl.deployTransaction.hash } `
  // );
  const startupWalletImplCF: ContractFactory = await newContractFactory(walletOptions, 'StartupWalletImpl');
  const startupWalletImpl: Contract = await startupWalletImplCF.deploy(walletImplLocator.address);
  await startupWalletImpl.deployTransaction.wait();
  console.log(`[${network}] Startup Wallet Implementation deployed to: ${startupWalletImpl.address}`);

  // 5. Deploy main module dynamic auth
  // EST gas cost: 0.003911813
  // const mainModule = await deployMainModule(
  //   contractDeployer,
  //   factory.address,
  //   startupWalletImpl.address
  // );
  // await mainModule.deployTransaction.wait();
  // console.log(
  //   `Main Module Dynamic Auth deployed to: ${ mainModule.address } with hash ${ mainModule.deployTransaction.hash } `
  // );
  const mainModuleCF: ContractFactory = await newContractFactory(walletOptions, 'MainModuleDynamicAuth');
  const mainModule: Contract = await mainModuleCF.deploy(factory.address, startupWalletImpl.address);
  await mainModule.deployTransaction.wait();
  console.log(`[${network}] Main Module Dynamic Auth deployed to: ${mainModule.address}`);

  // 6. Deploy immutable signer
  // EST gas cost: 0.001856101
  // const immutableSigner = await deployImmutableSigner(
  //   contractDeployer,
  //   signerRootAdminPubKey,
  //   signerAdminPubKey,
  //   environment.signerAddress
  // );
  // await immutableSigner.deployTransaction.wait();
  // console.log('Finished deploying contracts');
  const immutableSignerCF: ContractFactory = await newContractFactory(walletOptions, 'ImmutableSigner');
  const immutableSigner: Contract = await immutableSignerCF.deploy(
    signerRootAdminPubKey,
    signerAdminPubKey,
    signerAddress
  );
  await immutableSigner.deployTransaction.wait();
  console.log(`[${network}] Immutable Signer deployed to: ${immutableSigner.address}`);

  // Fund the implementation changer
  // WARNING: If the deployment fails at this step, DO NOT RERUN without commenting out the code a prior which deploys
  // the contracts.
  // TODO: Code below can be improved by calculating the amount that is required to be transferred.
  // const fundingTx = await contractDeployer.sendTransaction({
  //   to: await walletImplLocatorImplChanger.getAddress(),
  //   value: ethers.utils.parseEther('10')
  // });
  // await fundingTx.wait();
  if (walletOptions.useLedger) {
    const ledger = walletOptions.ledger!;
    const fundingTx = await ledger.sendTransaction({
      to: await walletImplLocatorImplChanger.getAddress(),
      value: ethers.utils.parseEther('10')
    });
    await fundingTx.wait();
    console.log(`[${network}] Transfered funds to the wallet locator implementer changer with hash ${fundingTx.hash} `);
  } else {
    const fundingTx = await contractDeployer.sendTransaction({
      to: await walletImplLocatorImplChanger.getAddress(),
      value: ethers.utils.parseEther('10')
    });
    await fundingTx.wait();
    console.log(`[${network}] Transfered funds to the wallet locator implementer changer with hash ${fundingTx.hash} `);
  }

  // Set implementation address on impl locator to dynamic module auth addr
  const tx = await walletImplLocator
    .connect(walletImplLocatorImplChanger)
    .changeWalletImplementation(mainModule.address);
  await tx.wait();
  console.log('[${network}] Wallet Impl Locator implementation changed to: ', mainModule.address);

  // Output JSON file with addresses and role addresses
  const JSONOutput = {
    FactoryAddress: factory.address,
    WalletImplLocatorAddress: walletImplLocator.address,
    StartupWalletImplAddress: startupWalletImpl.address,
    MainModuleDynamicAuthAddress: mainModule.address,
    ImmutableSignerContractAddress: immutableSigner.address,
    MultiCallDeployAddress: multiCallDeploy.address,
    DeployerAddress: contractDeployer.address,
    FactoryAdminAddress: factoryAdminPubKey,
    FactoryDeployerAddress: environment.submitterAddress,
    WalletImplLocatorAdminAddress: walletImplLocatorAdmin,
    WalletImplLocatorImplChangerAddress: walletImplLocatorImplChanger.address,
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
