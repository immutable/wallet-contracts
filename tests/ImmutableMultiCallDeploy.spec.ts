import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { addressOf, encodeImageHash, encodeMetaTransactionsData, walletMultiSign } from './utils/helpers'

describe('Wallet Factory', function () {
  let salts: string[] = []

  async function setupFactoryFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, acc1] = await ethers.getSigners()

    const WalletFactory = await ethers.getContractFactory('Factory')
    const factory = await WalletFactory.deploy(owner.address, await owner.getAddress())

    const MainModule = await ethers.getContractFactory('MainModuleMock')
    const mainModule = await MainModule.deploy(factory.address)

    const CustomModule = await ethers.getContractFactory('CustomModule')
    const customModule = await CustomModule.deploy()

    const MultiCall = await ethers.getContractFactory("MultiCallDeploy")
    const multiCall = await MultiCall.deploy();

    const deployerRole = await factory.DEPLOYER_ROLE();
    await factory.connect(owner).grantRole(deployerRole, multiCall.address);

    salts = [
      encodeImageHash(1, [{ weight: 1, address: owner.address }]),
      encodeImageHash(1, [{ weight: 1, address: acc1.address }]),
      encodeImageHash(2, [
        { weight: 1, address: owner.address },
        { weight: 1, address: acc1.address }
      ]),
      encodeImageHash(3, [
        { weight: 2, address: owner.address },
        { weight: 1, address: acc1.address }
      ])
    ]

    return {
      owner,
      acc1,
      factory,
      mainModule,
      customModule,
      multiCall
    }
  }


  describe('MutliCall deploy and exeute', function () {
    it('Should deploy and execute transfers', async function () {
      const owner_a = new ethers.Wallet(ethers.utils.randomBytes(32))
      const salt = encodeImageHash(1, [{ weight: 1, address: owner_a.address }])
      const { factory, mainModule, multiCall, acc1, owner } = await loadFixture(setupFactoryFixture)

      // CFA
      const cfa = addressOf(factory.address, mainModule.address, salt);

      // Mint tokens
      const Token = await ethers.getContractFactory("ERC20Mock");
      const token = await Token.connect(owner).deploy();

      // Transfer tokens to CFA
      await token.connect(owner).transfer(cfa, ethers.utils.parseEther("5"));
      expect(await token.balanceOf(cfa)).to.equal(ethers.utils.parseEther("5"));

      // Network ID
      const networkId = (await ethers.provider.getNetwork()).chainId

      // Wallet TX
      const optimalGasLimit = ethers.constants.Two.pow(21)

      // We don't want delegate call here as the state is contained to the ERC20 contract
      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: optimalGasLimit,
        target: token.address,
        value: ethers.constants.Zero,
        data: token.interface.encodeFunctionData('transfer', [acc1.address, ethers.utils.parseEther("2.5")])
      }

      // Signing
      const data = encodeMetaTransactionsData(cfa, [transaction], networkId, ethers.constants.Zero)
      const sig = walletMultiSign([{weight: 1, owner: owner_a}], 1, data, false)

      // Execution
      await multiCall.connect(acc1).deployAndExecute(cfa, mainModule.address, salt, factory.address, [transaction], 0, sig);
      expect(await token.balanceOf(cfa)).to.equal(ethers.utils.parseEther("2.5"));

      // Transfer remaining, resign Tx with incremented nonce
      const dataTwo = encodeMetaTransactionsData(cfa, [transaction], networkId, 1)
      const sigTwo = walletMultiSign([{weight: 1, owner: owner_a}], 1, dataTwo, false)
      await multiCall.connect(acc1).deployAndExecute(cfa, mainModule.address, salt, factory.address, [transaction], 1, sigTwo);
      expect(await token.balanceOf(cfa)).to.equal(0);
    })
  })
})
