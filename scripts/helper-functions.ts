import { ethers as hardhat } from 'hardhat';

import { WalletOptions } from './wallet-options';
import { ContractFactory, Signer } from 'ethers';

/**
 * newContractFactory connects a wallet to the respective contract
 * factory for use by the caller.
 */
export async function newContractFactory(signer: Signer, contractName: string): Promise<ContractFactory> {
  return (await hardhat.getContractFactory(contractName)).connect(signer);
}
