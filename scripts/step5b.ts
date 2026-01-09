// scripts/step5b.ts
import * as fs from 'fs';
import { ethers } from 'hardhat';
import { waitForInput } from './helper-functions';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';

// Clone wallet-contracts-v3 repo
// cd wallet-contracts-v3
// forge build src/

// Path to the compiled artifact from wallet-contracts-v3 repo
const STAGE1_MODULE_ARTIFACT_PATH = process.env.STAGE1_MODULE_ARTIFACT || 
  '/path_to/wallet-contracts-v3/out/Stage1Module.sol/Stage1Module.json';

async function step5b(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo((await ethers.provider.getNetwork()).name);
  const { network } = env;

  // Load artifact from external v3 repo
  const artifact = JSON.parse(fs.readFileSync(STAGE1_MODULE_ARTIFACT_PATH, 'utf8'));
  
  const factoryAddress = '0x8Fa5088dF65855E0DaF87FA6591659893b24871d';
  const entryPointAddress = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
  const immutableSignerAddress = '0xcff469E561D9dCe5B1185CD2AC1Fa961F8fbDe61';
  const startupWalletImplAddress = '0x8FD900677aabcbB368e0a27566cCd0C7435F1926';

  console.log(`[${network}] Deploying Stage1Module from external artifact...`);
  console.log(`[${network}] Artifact path: ${STAGE1_MODULE_ARTIFACT_PATH}`);
  console.log(`[${network}] Factory: ${factoryAddress}`);
  console.log(`[${network}] EntryPoint: ${entryPointAddress}`);
  console.log(`[${network}] ImmutableSigner: ${immutableSignerAddress}`);
  console.log(`[${network}] StartupWalletImpl: ${startupWalletImplAddress}`);

  await waitForInput();

  const wallets: WalletOptions = await newWalletOptions(env);
  const signer = wallets.getWallet();

  // Deploy using bytecode from external artifact
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode.object,
    signer
  );

  const stage1Module = await factory.deploy(
    factoryAddress,
    entryPointAddress,
    immutableSignerAddress,
    startupWalletImplAddress
  );
  await stage1Module.deployed();

  console.log(`[${network}] Stage1Module deployed to: ${stage1Module.address}`);

  fs.writeFileSync('step5b.json', JSON.stringify({
    stage1Module: stage1Module.address,
  }, null, 2));

  return env;
}

step5b()
  .then((env) => console.log('Done!'))
  .catch(console.error);
