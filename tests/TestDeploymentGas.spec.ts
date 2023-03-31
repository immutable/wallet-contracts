import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { addressOf, encodeImageHash } from './utils/helpers'

// run `REPORT_GAS=true npx hardhat test ./tests/TestDeploymentGas.spec.ts` to generate a gas report for this test
describe('Deployment Gas Costs', function () {
  let salts: string[] = []

  async function setupFactoryFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, acc1] = await ethers.getSigners()

    const WalletFactory = await ethers.getContractFactory('Factory')
    const factory = await WalletFactory.deploy(owner.address)

    // Grant deployer role to owner
    await factory.connect(owner).grantRole(await factory.DEPLOYER_ROLE(), await owner.getAddress())

    const MainModule = await ethers.getContractFactory('MainModuleMock')
    const mainModule = await MainModule.deploy(factory.address)

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
      mainModule
    }
  }

  it('Estimate gas for wallet deployment', async function () {
    const { factory, mainModule } = await loadFixture(setupFactoryFixture)

    for (const salt of salts) {
      expect(await factory.deploy(mainModule.address, salt))
        .to.emit(factory, 'WalletDeployed')
        .withArgs(addressOf(factory.address, mainModule.address, salt), mainModule.address, salt)

      // const deployedContract = await ethers.getContractAt('MainModuleMock', addressOf(factory.address, mainModule.address, salt))

      // Retrive implementation from Proxy's storage
      const Proxy = ethers.getContractFactory('Proxy')
      const proxy = (await Proxy).attach(addressOf(factory.address, mainModule.address, salt))
      expect(await proxy.PROXY_getImplementation()).to.be.equal(mainModule.address)
      // initial wallet nonce = 0
      // expect(await deployedContract.nonce()).to.equal(0)
    }
  })
})
