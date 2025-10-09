import * as fs from 'fs';
import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';
import { deployContract } from '../contract';
import { newContractFactory } from '../helper-functions';
import { ethers, Wallet } from 'ethers';


// Addresses that need to be pre-determined
// 1. Factory
// 2. StartupWalletImpl
// 3. SignerContract

/**
 * Step 1 - V2 Deployment.
 **/
async function step1(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, submitterAddress, signerAddress, } = env;
  const multiCallAdminPubKey = process.env.MULTICALL_ADMIN_PUB_KEY;
  const factoryAdminPubKey = process.env.FACTORY_ADMIN_PUB_KEY;

  // Read addresses from previous deployment steps
  const step0Data = JSON.parse(fs.readFileSync('scripts/v2/step0.json', 'utf8'));
  
  const immutableSignerAddress = step0Data.immutableSigner;

  console.log(`[${network}] Starting V2 deployment...`);
  console.log(`[${network}] Submitter address ${submitterAddress}`);
  console.log(`[${network}] Signer address ${signerAddress}`);
  console.log(`[${network}] multiCallAdminPubKey ${multiCallAdminPubKey}`);
  console.log(`[${network}] factoryAdminPubKey ${factoryAdminPubKey}`);
  console.log(`[${network}] immutableSignerAddress ${immutableSignerAddress}`);

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);

  // --- STEP 1: Deployed using Passport Nonce Reserver.
  
  const centralSignerPrivateKey = process.env.CENTRAL_SIGNER_PRIVATE_KEY;
  const centralSignerAddress = await new Wallet(centralSignerPrivateKey as string).getAddress();
  console.log(`[${network}] Central signer address derived from private key: ${centralSignerAddress.toString()}`);

  // Deploy multi call deploy (PNR)
  const multiCallDeploy = await deployContract(env, wallets, 'MultiCallDeploy', [multiCallAdminPubKey, submitterAddress]);

  // Deploy signed multi call deploy
  const signedMultiCallDeploy = await deployContract(env, wallets, 'SignedMultiCallDeploy', [centralSignerAddress.toString(), multiCallDeploy.address]);

  // Deploy factory with multi call deploy address as deployer role EST (PNR)
  const factory = await deployContract(env, wallets, 'Factory', [factoryAdminPubKey, multiCallDeploy.address]);

  // Grant executor role to SignedMultiCallDeploy on MultiCallDeploy
  console.log(`[${network}] Granting executor role to SignedMultiCallDeploy...`);
  const contractFactory = await newContractFactory(wallets.getWallet(), 'MultiCallDeploy');
  const multiCallDeployContract = await contractFactory.attach(multiCallDeploy.address);
  
  // Check if SignedMultiCallDeploy already has the executor role
  const executorRole = await multiCallDeployContract.EXECUTOR_ROLE();
  const hasExecutorRole = await multiCallDeployContract.hasRole(executorRole, signedMultiCallDeploy.address);
  
  if (!hasExecutorRole) {
    console.log(`[${network}] Granting EXECUTOR_ROLE to SignedMultiCallDeploy: ${signedMultiCallDeploy.address}`);
    const grantTx = await multiCallDeployContract.grantExecutorRole(signedMultiCallDeploy.address);
    await grantTx.wait();
    console.log(`[${network}] ✅ EXECUTOR_ROLE granted to SignedMultiCallDeploy`);
  } else {
    console.log(`[${network}] ✅ SignedMultiCallDeploy already has EXECUTOR_ROLE`);
  }

  fs.writeFileSync('scripts/v2/step1.json', JSON.stringify({
    multiCallAdminPubKey: multiCallAdminPubKey,
    factoryAdminPubKey: factoryAdminPubKey,
    signerAddress: signerAddress,
    multiCallDeploy: multiCallDeploy.address,
    signedMultiCallDeploy: signedMultiCallDeploy.address,
    factory: factory.address,
  }, null, 1));

  return env;
}

// Call primary function
step1()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] V2 Contracts deployment successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
