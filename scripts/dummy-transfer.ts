import * as hre from 'hardhat';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { waitForInput } from './helper-functions';

async function dummyTransfer(): Promise<EnvironmentInfo> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network } = env;

  console.log(`[${network}] Consuming nonce, PROCEED WITH CARE!...`);

  await waitForInput();

  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  const signer = wallets.getWallet();
  const signerAddress = await signer.getAddress();

  console.log(`[${env.network}] Starting a 0 value transfer from ${signerAddress} to ${signerAddress}`);

  const tx = await signer.sendTransaction({
    to: signerAddress,
    value: 0,
  })
  await tx.wait();
  console.log(`[${env.network}] Transfer completed with hash ${tx.hash}`);

  return env;
}

// Call primary function
dummyTransfer()
  .then((env: EnvironmentInfo) => {
    console.log(`[${env.network}] Transfer successful...`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });

