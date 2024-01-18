import { ethers, network } from 'hardhat'

// Fork network @ https://rpc.testnet.immutable.com/
// Attach contract at LatestWalletImplLocator
// Get MainModuleDynamicAuth address
// Deploy MainModuleDynamicAuth (with console logs)
// Get code at the newly deployed MainModuleDynamicAuth (w/ logs)
// Set the code at the MainModuleDynamicAuth to be the newly deployed MainModuleDynamicAuth (w/ logs)
// Do signature verification
// inspect console.log lines

async function main() {
  // Get signature values
  const typedHash = '0x0b8f209be8d541a4ded6b82c0414aac2cee9cb89f19518b6ee1502ba555cb16c'
  const messageSubDigest = '0xede3e129db20579573bccededc094e9a0f3cb8c8df59bbf3526eb7072bffa6f3'
  const packedAggregateSignature =
    '0x000202011b1d383526a2815d26550eb314b5d7e0551327330043c9d1d1d25201bd592da3eb99a5c4568105a79c168b93eebe2444ddf1f7a61174394b2b8616ba8ce9aae7741e2131caf66b80773f3557e18ec0d93a68a17090cb1b010300014f84dcc8d9fe6c2d8ed83d2edc01cc1fc81e29a6a75bce6301072b3e30f972b744f259055466795f372eb5d82c5314a781209c827c634fd3435d617ce58639481c02'
  const relayerSig =
    '0xc9d1d1d25201bd592da3eb99a5c4568105a79c168b93eebe2444ddf1f7a61174394b2b8616ba8ce9aae7741e2131caf66b80773f3557e18ec0d93a68a17090cb1b01'

  // Recover signer
  const signer = await ethers.getContractFactory('SignerCheck')
  const signerDeployed = await signer.deploy()
  await signerDeployed.deployed()
  const signerRet = await signerDeployed.recover(messageSubDigest, relayerSig)

  // Verify supplied signature against Immutable signer
  const immutableSignerAddr = '0x1B1D383526A2815d26550eb314B5d7e055132733'
  const immutableSigner = await ethers.getContractAt('ImmutableSigner', immutableSignerAddr)
  const immutableSignerPubKey = await immutableSigner.primarySigner()

  // Verify returned signer against Immutable signer
  if (signerRet !== immutableSignerPubKey) {
    console.log('Signer mismatch')
    process.exit(0)
  }

  // Set addresses
  const scwAddr = '0x3878cadc6a521dceb1f46599913ce726c430a8e1'
  const factoryAddr = '0x55b9d1cd803d5acA8ea23ccd96f6a756DED9f5a9'
  const startupAddr = '0x8df826438e652f7124fe07F413fA3556cd57edB5'
  const walletImplLocatorAddr = '0x657d339b8616033fee25f66ea1d00c3f30b14171'

  // Get MainModuleDynamicAuth address
  const walletImplLocator = await ethers.getContractAt('LatestWalletImplLocator', walletImplLocatorAddr)
  const mainModuleAddr = await walletImplLocator.latestWalletImplementation()

  // Deploy new MainModuleDynamicAuthLog
  const ModuleLog = await ethers.getContractFactory('MainModuleDynamicAuthLog')
  const moduleLog = await ModuleLog.deploy(factoryAddr, startupAddr)
  await moduleLog.deployed()

  // Get code for logging
  const modLogCode = await ethers.provider.getCode(moduleLog.address)

  // Get address for main module
  const walletProxy = await ethers.getContractAt('IWalletProxy', scwAddr)

  // Set code
  //   await network.provider.send('hardhat_setCode', [mainModuleAddr, modLogCode])
//   await network.provider.send('hardhat_setStorageAt', [scwAddr, scwAddr, moduleLog.address])
  //   await network.provider.send('hardhat_mine', ["0x100"])
//   console.log('MAIN MODULE ADDDR: ', moduleLog.address)
  console.log("STORAGE AT: ", await ethers.provider.getStorageAt(scwAddr, scwAddr));
  console.log('PROXY IMPLEMENTATION: ', await walletProxy.PROXY_getImplementation())
  const implementationValue = "0x0000000000000000000000000" + moduleLog.address.substring(2);
  console.log("MOD CODE ADDR: ", "0x0000000000000000000000000" + moduleLog.address.substring(2))
  console.log('Equal ', modLogCode == (await ethers.provider.getCode(mainModuleAddr)))

  // Verify code update
  const newCode = await ethers.provider.getCode(mainModuleAddr)
  if (newCode !== modLogCode) {
    console.log('Code not updated')
    process.exit(0)
  }

  // Do signature verification
  // Attatch to SCW
  const moduleAuth = await ethers.getContractAt('ModuleAuth', scwAddr)
  //   Verify 2-of-2 signature
  const magicValue = await moduleAuth['isValidSignature(bytes32,bytes)'](typedHash, packedAggregateSignature)

  console.log('MAGIC VALUE', magicValue)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
