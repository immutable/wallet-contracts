import * as hre from 'hardhat';
import { Contract, ContractFactory } from 'ethers';

import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newContractFactory } from '../helper-functions';
import { newWalletOptions, WalletOptions } from '../wallet-options';

/**
 * Check the primarySigner value from the deployed ImmutableSigner contract
 */
async function checkPrimarySigner(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  
  console.log(`[${network}] Checking primarySigner from deployed ImmutableSigner contract...`);
  
  // Load deployment artifacts
  const step0 = JSON.parse(require('fs').readFileSync('scripts/v2/step0.json', 'utf8'));
  
  const immutableSignerAddress = step0.immutableSigner;
  const expectedSignerAddress = step0.signerAddress;
  
  console.log(`[${network}] ImmutableSigner contract address: ${immutableSignerAddress}`);
  console.log(`[${network}] Expected signer address (from step0.json): ${expectedSignerAddress}`);
  
  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  
  // Attach to contract
  const contractName = "ImmutableSigner";
  const contractFactory: ContractFactory = await newContractFactory(wallets.getWallet(), contractName);
  
  console.log(`[${network}] Attaching to ImmutableSigner contract at ${immutableSignerAddress}...`);
  const immutableSigner: Contract = await contractFactory.attach(immutableSignerAddress);
  
  // Check that the contract is attached by reading its address and logging it
  console.log(`[${network}] Successfully attached to ImmutableSigner at address: ${immutableSigner.address}`);
  
  try {
    // Get the primarySigner value
    const primarySigner = await immutableSigner.primarySigner();
    console.log(`[${network}] Primary signer from contract: ${primarySigner}`);
    
    // Compare with expected value
    if (primarySigner.toLowerCase() === expectedSignerAddress.toLowerCase()) {
      console.log(`[${network}] ✅ Primary signer matches expected value`);
    } else {
      console.log(`[${network}] ❌ Primary signer does NOT match expected value`);
      console.log(`[${network}] Expected: ${expectedSignerAddress}`);
      console.log(`[${network}] Got: ${primarySigner}`);
    }
    
  } catch (error) {
    console.log(`[${network}] ❌ Error calling primarySigner(): ${error.message}`);
  }
  
  console.log(`\n[${network}] === Summary ===`);
  console.log(`[${network}] The primarySigner value should match the signerAddress from step0.json`);
  console.log(`[${network}] If they don't match, there might be a deployment issue.`);
  console.log(`[${network}] Expected signer address: ${expectedSignerAddress}`);
  console.log(`[${network}] Corresponding private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  
  return env;
}

// Call primary function
checkPrimarySigner()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Primary signer check completed...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
