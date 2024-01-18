import * as path from 'path'
import * as fs from 'fs'
import * as hre from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'ethers'
import { ethers as hardhat } from 'hardhat'
import { expect } from 'chai'
import { arrayify } from 'ethers/lib/utils'
import { addressOf, encodeImageHash } from './utils'

require('dotenv').config()

const outputPath = path.join(__dirname, './deploy_output.json')
const deployPath = path.join(__dirname, './721_deploy_data_mints.json')
let deployer: SignerWithAddress


// 294c4e19c04efff53c34ed7a2997bb9161b0c7f33db3af1148c66eb63d6593a668bb0da9bd32fcc3bbed426d515dff22886245a3583d2e275add28418ca2c63e1b02
async function deploy() {
  const signer = await hardhat.getContractFactory('SignerCheck')
  const signerDeployed = await signer.deploy()
  await signerDeployed.deployed()

  const signerRet = await signerDeployed.recover(
    '0x2dcc0f6e686c3302dc9f615f62761d98cc63e240a5e7d7b85207921b8a385706',
    '0xa9b3a8608b3f49eaeedaa13f60967982a8b40abe3203f027787b125b273f780f669b07583967f86e2ad0f4100094b91586b5d89bde8e6fcd0236f5ece8ffd4391b01'
  )
  console.log('Returned SIGNER (relayer)', signerRet)

  const signerRet2 = await signerDeployed.recover(
    '0x2dcc0f6e686c3302dc9f615f62761d98cc63e240a5e7d7b85207921b8a385706',
    '0x294c4e19c04efff53c34ed7a2997bb9161b0c7f33db3af1148c66eb63d6593a668bb0da9bd32fcc3bbed426d515dff22886245a3583d2e275add28418ca2c63e1b02'
  )
  console.log('Returned SIGNER (passport)', signerRet2)

  let salt = encodeImageHash(2, [{weight: 1, address: "0x0b486c1fdf39d95f2fc03a4eee8b9d3abe35e6fc"}, {weight: 1, address: "0x1B1D383526A2815d26550eb314B5d7e055132733"}])
  console.log(salt)

// PRIMARY SIGNER 0x1cE50560686b1297B6311F36B47dbe5d6E04D0f8
// PRIMARY SIGNER 0x1cE50560686b1297B6311F36B47dbe5d6E04D0f8


  // SANDBOX
  // OLD
  // let passportPubKey = "0x0b486c1fdf39d95f2fc03a4eee8b9d3abe35e6fc"
  // let factoryAddress = "0x55b9d1cd803d5acA8ea23ccd96f6a756DED9f5a9"
  // let mainModuleAddress = "0x8df826438e652f7124fe07F413fA3556cd57edB5"
  // let immutableSignerAddress = "0x1B1D383526A2815d26550eb314B5d7e055132733"

  // let salt = encodeImageHash(2, [{weight: 1, address: passportPubKey}, {weight: 1, address: immutableSignerAddress}])

  // const factory = await hardhat.getContractAt("Factory", factoryAddress);
  // const calculatedCFA = await factory.getAddress(mainModuleAddress, salt);
  // console.log("Calculated CFA", calculatedCFA);

  /// ===== Calculated CFA 0x0aa0bbd0bDe831fD2288Bc397b6b76f73D960650

  // NEW
  // let passportPubKey = "0xe92962f0e190d8a95d2f4037047e012673bc85c5"
  // let factoryAddress = "0x8Fa5088dF65855E0DaF87FA6591659893b24871d"
  // let mainModuleAddress = "0x8FD900677aabcbB368e0a27566cCd0C7435F1926"
  // let immutableSignerAddress = "0xcff469E561D9dCe5B1185CD2AC1Fa961F8fbDe61"

  // let salt = encodeImageHash(2, [{weight: 1, address: passportPubKey}, {weight: 1, address: immutableSignerAddress}])

  // const factory = await hardhat.getContractAt("Factory", factoryAddress);
  // const calculatedCFA = await factory.getAddress(mainModuleAddress, salt);
  // console.log("Calculated CFA", calculatedCFA);

  // ====== Calculated CFA 0x808468eDA6e8d3c601C454123d7a80C4F96C8798

  // let walletAddr = addressOf("0x8Fa5088dF65855E0DaF87FA6591659893b24871d", "0x8FD900677aabcbB368e0a27566cCd0C7435F1926", salt)
  // console.log(walletAddr)

  // const deployedSigner = await hardhat.getContractAt("ImmutableSigner", "0xcff469E561D9dCe5B1185CD2AC1Fa961F8fbDe61");
  // console.log("PRIMARY SIGNER", await deployedSigner.primarySigner());
  // const deployedSignerTwo = await hardhat.getContractAt("ImmutableSigner", "0x1B1D383526A2815d26550eb314B5d7e055132733");
  // console.log("PRIMARY SIGNER", await deployedSignerTwo.primarySigner());

  // const deployedWallet = await hardhat.getContractAt('MainModuleDynamicAuth', '0x3878cadc6a521dceb1f46599913ce726c430a8e1')
  // console.log(
  //   'IS VALID SIG',
  //   await deployedWallet["isValidSignature(bytes32,bytes)"](
  //     '0x0b8f209be8d541a4ded6b82c0414aac2cee9cb89f19518b6ee1502ba555cb16c',
  //     '0x00020201cff469e561d9dce5b1185cd2ac1fa961f8fbde610043c9d1d1d25201bd592da3eb99a5c4568105a79c168b93eebe2444ddf1f7a61174394b2b8616ba8ce9aae7741e2131caf66b80773f3557e18ec0d93a68a17090cb1b010300014f84dcc8d9fe6c2d8ed83d2edc01cc1fc81e29a6a75bce6301072b3e30f972b744f259055466795f372eb5d82c5314a781209c827c634fd3435d617ce58639481c02'
  //   )
  // )
}

deploy().catch(error => {
  console.error(error)
  process.exitCode = 1
})

// Testnet
// PRIMARY SIGNER 0x1cE50560686b1297B6311F36B47dbe5d6E04D0f8
// IS VALID SIG 0x00000000
// Returned SIGNER 0x1cE50560686b1297B6311F36B47dbe5d6E04D0f8