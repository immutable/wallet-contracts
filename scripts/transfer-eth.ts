import * as hre from 'hardhat';
import { ethers } from 'hardhat';

/**
 * Transfer 10 ETH from one address to another on local hardhat node
 */
async function transferEth(): Promise<void> {
  const network = hre.network.name;
  console.log(`[${network}] Starting ETH transfer...`);

  // Hardcoded addresses and private key
  const fromAddress = '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a';
  const toAddress = '0xa3E1E073Cc6C17d28A3A8afbb27d1330a9988b0E';
  const privateKey = '0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1';
  const transferAmount = ethers.utils.parseEther('10'); // 10 ETH

  console.log(`From address: ${fromAddress}`);
  console.log(`To address: ${toAddress}`);
  console.log(`Transfer amount: ${ethers.utils.formatEther(transferAmount)} ETH`);

  // Create wallet from private key
  const wallet = new ethers.Wallet(privateKey, ethers.provider);

  // Check initial balances
  const initialFromBalance = await ethers.provider.getBalance(fromAddress);
  const initialToBalance = await ethers.provider.getBalance(toAddress);

  console.log(`\nInitial balances:`);
  console.log(`From address balance: ${ethers.utils.formatEther(initialFromBalance)} ETH`);
  console.log(`To address balance: ${ethers.utils.formatEther(initialToBalance)} ETH`);

  // Check if sender has enough balance
  if (initialFromBalance.lt(transferAmount)) {
    throw new Error(`Insufficient balance. Required: ${ethers.utils.formatEther(transferAmount)} ETH, Available: ${ethers.utils.formatEther(initialFromBalance)} ETH`);
  }

  // Prepare transaction (let ethers estimate gas automatically)
  const tx = {
    to: toAddress,
    value: transferAmount,
  };

  console.log(`\nEstimating gas...`);
  
  // Estimate gas first
  const estimatedGas = await wallet.estimateGas(tx);
  console.log(`Estimated gas: ${estimatedGas.toString()}`);
  
  // Get current gas price
  const gasPrice = await ethers.provider.getGasPrice();
  console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  
  console.log(`\nSending transaction...`);
  
  // Send transaction
  const txResponse = await wallet.sendTransaction(tx);
  console.log(`Transaction hash: ${txResponse.hash}`);

  // Wait for confirmation
  console.log(`Waiting for confirmation...`);
  const receipt = await txResponse.wait();
  console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

  // Check final balances
  const finalFromBalance = await ethers.provider.getBalance(fromAddress);
  const finalToBalance = await ethers.provider.getBalance(toAddress);

  console.log(`\nFinal balances:`);
  console.log(`From address balance: ${ethers.utils.formatEther(finalFromBalance)} ETH`);
  console.log(`To address balance: ${ethers.utils.formatEther(finalToBalance)} ETH`);

  // Calculate gas used
  const gasUsed = receipt.gasUsed.mul(txResponse.gasPrice || 0);
  console.log(`Gas used: ${ethers.utils.formatEther(gasUsed)} ETH`);

  console.log(`\n✅ Transfer completed successfully!`);
}

// Execute the transfer
transferEth()
  .then(() => {
    console.log('ETH transfer completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during ETH transfer:', error.message);
    process.exit(1);
  });
