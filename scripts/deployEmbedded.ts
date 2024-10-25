import { ethers } from 'hardhat';

async function main() {
  const factoryAddr = '0xFaA5c0b14d1bED5C888Ca655B9a8A5911F78eF4A';
  const mainModuleUpgradeable = '0x4222dcA3974E39A8b41c411FeDDE9b09Ae14b911';
  const salt = '<SALT>';

  const factory = await ethers.getContractAt('FactoryEmbedded', factoryAddr);

  const deployTx = await factory.deploy(mainModuleUpgradeable, salt, {
    gasLimit: 30000000,
    maxFeePerGas: 10000000000,
    maxPriorityFeePerGas: 10000000000
  });

  const receipt = await deployTx.wait();
  console.log(receipt);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
