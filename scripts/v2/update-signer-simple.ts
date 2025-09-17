import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers as hardhat } from 'hardhat';

// Import deployment utilities
import { EnvironmentInfo, loadEnvironmentInfo } from '../environment';
import { newWalletOptions, WalletOptions } from '../wallet-options';

/**
 * Simple script to update the ImmutableSigner
 * 
 * Usage:
 * export NEW_SIGNER_ADDRESS="0x742d35Cc6634C0532925a3b8D6Ac6c7c6b3b5c6"
 * npx hardhat run scripts/v2/update-signer-simple.ts --network <network>
 */
async function updateSigner(): Promise<void> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;
  
  // Get new signer address from environment
  // hardhat accounts[2]
  const newSignerAddress = `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`;
  
  console.log(`[${network}] Updating signer to: ${newSignerAddress}`);
  
  // Setup signer admin wallet
  const walletOptions: WalletOptions = await newWalletOptions(env);
  const signerAdmin = walletOptions.getWallet();
  
  // Load ImmutableSigner contract address
  console.log(`[${network}] Loading step5.json...`);
  const step5 = JSON.parse(fs.readFileSync('scripts/v2/step5.json', 'utf8'));
  const immutableSignerAddress = step5.immutableSigner;
  
  console.log(`[${network}] ImmutableSigner address: ${immutableSignerAddress}`);
  
  if (!immutableSignerAddress) {
    throw new Error('ImmutableSigner address not found in step5.json');
  }
  
  // Get contract instance
  const ImmutableSigner = await hardhat.getContractFactory('ImmutableSigner');
  const immutableSigner = ImmutableSigner.attach(immutableSignerAddress);
  
  // Update the signer
  console.log(`[${network}] Calling updateSigner...`);
  const tx = await immutableSigner
    .connect(signerAdmin)
    .updateSigner(newSignerAddress);
  
  console.log(`[${network}] Transaction: ${tx.hash}`);
  await tx.wait();
  
  // Verify update
  console.log(`[${network}] Verifying signer update...`);
  try {
    const currentSigner = await immutableSigner.primarySigner();
    console.log(`[${network}] ✅ Signer updated successfully: ${currentSigner}`);
  } catch (error) {
    console.error(`[${network}] ❌ Verification failed:`, error.message);
    console.log(`[${network}] Contract address: ${immutableSignerAddress}`);
    
    // Check if contract exists
    const code = await hardhat.provider.getCode(immutableSignerAddress);
    if (code === '0x') {
      console.error(`[${network}] ❌ No contract found at address ${immutableSignerAddress}`);
    } else {
      console.log(`[${network}] Contract exists, but call failed. Check if it's the right contract.`);
    }
    throw error;
  }
}

// Execute the script
updateSigner()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  });
