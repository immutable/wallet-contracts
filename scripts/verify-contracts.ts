import * as hre from 'hardhat';
import { expect } from 'chai';

export async function verifyContract(
  contractAddr: string,
  constructorArgs: any[],
  requiesContractPath: boolean = false,
  contractPath: string = ''
) {
  try {
    if (requiesContractPath) {
      await hre.run('verify:verify', {
        contract: contractPath,
        address: contractAddr,
        constructorArguments: constructorArgs
      });
    } else {
      await hre.run('verify:verify', {
        address: contractAddr,
        constructorArguments: constructorArgs
      });
    }
  } catch (error) {
    expect(error.message.toLowerCase().includes('already verified')).to.be.equal(true);
  }
}
