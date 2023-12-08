import { ethers as hardhat } from 'hardhat';

import { WalletOptions } from './types';
import { ContractFactory } from 'ethers';

/**
 * newContractFactory connects a wallet to the respective contract
 * factory for use by the caller.
 */
export async function newContractFactory(walletOptions: WalletOptions, contractName: string): Promise<ContractFactory> {
  return walletOptions.useLedger
    ? (await hardhat.getContractFactory(contractName)).connect(walletOptions.ledger!)
    : (await hardhat.getContractFactory(contractName)).connect(walletOptions.programaticWallet!);
}
