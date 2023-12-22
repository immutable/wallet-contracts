import * as readline from 'readline';
import { ethers as hardhat } from 'hardhat';
import { ContractFactory, Signer } from 'ethers';

/**
 * newContractFactory connects a wallet to the respective contract
 * factory for use by the caller.
 */
export async function newContractFactory(signer: Signer, contractName: string): Promise<ContractFactory> {
  return (await hardhat.getContractFactory(contractName)).connect(signer);
}

export async function waitForInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const it = rl[Symbol.asyncIterator]();
  await it.next();
}