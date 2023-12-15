import * as fs from 'fs';
import * as hre from 'hardhat';
import { Contract, ContractFactory, Signer, utils } from 'ethers';
import { ethers as hardhat } from 'hardhat';

import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newContractFactory } from './helper-functions';
import { newWalletOptions, WalletOptions } from './wallet-options';
import ContractDeployerInterface from './abi/OwnableCreate2Deployer.json';

/**
 * We use the key to generate a salt to generate a deterministic address for
 * the contract that isn't dependent on the nonce of the contract deployer account.
 */
const getSaltFromKey = (key: number) => {
  return utils.keccak256(utils.defaultAbiCoder.encode(['string'], [key.toString()]));
};

/**
 * Load the OwnableCreate2Deployer 
 */
const loadDeployerContract = async (env: EnvironmentInfo, walletOptions: WalletOptions): Promise<Contract> => {
  return new Contract(env.deployerContractAddress, ContractDeployerInterface.abi, walletOptions.getWallet());
}

/**
 * Deploy the contract using the OwnableCreate2Deployer contract.
 */
async function deployContract(
  env: EnvironmentInfo,
  walletsOptions: WalletOptions,
  deployerKey: number,
  contractName: string,
  constructorArgs: Array<string | undefined>): Promise<Contract> {

  let overrides = {
    gasLimit: 30000000
  };

  const salt = getSaltFromKey(deployerKey);
  const deployer = await loadDeployerContract(env, walletsOptions);
  const contractFactory: ContractFactory = await newContractFactory(walletsOptions.getWallet(), contractName);
  const bytecode = contractFactory.getDeployTransaction(...constructorArgs).data;

  // Deploy the contract
  let tx = await deployer.deploy(bytecode, salt, overrides);
  await tx.wait();
  // console.log(`[${env.network}] TX hash: ${tx.hash}`);

  // Calculate the address the contract is deployed to
  const [owner] = await hardhat.getSigners();
  const contractAddress = await deployer.deployedAddress(bytecode, owner.address, salt);
  return contractFactory.attach(contractAddress);
}

/**
 * main function deploys all the SCW infrastructure.
 **/
async function main(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, submitterAddress, signerAddress, outputPath } = env;

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
  const wallets: WalletOptions = await newWalletOptions(env);
  console.log(
    `[${network}] Wallet Impl Locator Changer Address: ${await wallets.getWalletImplLocatorChanger().getAddress()}`
  );

  // TOTAL deployment cost = 0.009766773 GWEI = 0.000000000009766773 ETHER
  // Deployments with esimated gas costs (GWEI)
  console.log(`[${network}] Deploying contracts...`);

  // Key for the salt, use this to change the address of the contract
  let key = 2;

  // 1. Deploy multi call deploy
  const multiCallDeploy = await deployContract(env, wallets, key, 'MultiCallDeploy', [multiCallAdminPubKey, submitterAddress]);
  console.log(`[${network}] MultiCallDeploy address is ${multiCallDeploy.address}`);

  // 2. Deploy factory with multi call deploy address as deployer role EST
  const factory = await deployContract(env, wallets, key, 'Factory', [factoryAdminPubKey, multiCallDeploy.address]);
  console.log(`[${network}] Factory address is ${factory.address}`);

  // 3. Deploy wallet impl locator
  const walletImplLocator = await deployContract(env, wallets, key, 'LatestWalletImplLocator', [
    walletImplLocatorAdmin, await wallets.getWalletImplLocatorChanger().getAddress()
  ]);
  console.log(`[${network}] LatestWalletImplLocator address is ${walletImplLocator.address}`);

  // 4. Deploy startup wallet impl
  const startupWalletImpl = await deployContract(env, wallets, key, 'StartupWalletImpl', [walletImplLocator.address]);
  console.log(`[${network}] StartupWalletImpl address is ${startupWalletImpl.address}`);

  // 5. Deploy main module dynamic auth
  const mainModuleDynamicAuth = await deployContract(env, wallets, key, 'MainModuleDynamicAuth', [factory.address, startupWalletImpl.address]);
  console.log(`[${network}] MainModuleDynamicAuth address is ${mainModuleDynamicAuth.address}`);

  // 6. Deploy immutable signer
  const immutableSigner = await deployContract(env, wallets, key, 'ImmutableSigner', [signerRootAdminPubKey, signerAdminPubKey, signerAddress]);
  console.log(`[${network}] ImmutableSigner address is ${immutableSigner.address}`);

  // Fund the implementation changer
  // WARNING: If the deployment fails at this step, DO NOT RERUN without commenting out the code a prior which deploys the contracts.
  const fundingTx = await wallets.getWallet().sendTransaction({
    to: await wallets.getWalletImplLocatorChanger().getAddress(),
    value: hardhat.utils.parseEther('10'),
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

  fs.writeFileSync(env.outputPath, JSON.stringify(jsonOutput, null, 1));

  return env;
}

// Call primary function
main()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Contracts deployment successful...`);
    process.exit();
  })
  .catch(err => {
    console.error(err.message);
    process.exit();
  });
