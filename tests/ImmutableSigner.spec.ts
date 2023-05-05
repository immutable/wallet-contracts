import { ethers as hardhat, expect } from 'hardhat'
import { ethers } from 'ethers'
import { keccak256, randomBytes, toUtf8Bytes } from 'ethers/lib/utils'
import { ImmutableSigner, ImmutableSigner__factory } from '../src'
import { ethSign } from './utils'

describe('ImmutableSigner', () => {
    let deployerEOA: ethers.Signer
    let rootAdminEOA: ethers.Signer
    let signerAdminEOA: ethers.Signer
    let signerEOA: ethers.Signer
    let rolloverSignerEOA: ethers.Signer
    let randomEOA: ethers.Signer

    let immutableSigner: ImmutableSigner

    const ERC1271_OK = "0x1626ba7e"
    const ERC1271_INVALID = "0x00000000"

    beforeEach(async () => {
        ;[deployerEOA, rootAdminEOA, signerAdminEOA, signerEOA, rolloverSignerEOA, randomEOA] = await hardhat.getSigners()

        immutableSigner = await new ImmutableSigner__factory()
            .connect(deployerEOA)
            .deploy(
                await rootAdminEOA.getAddress(),
                await signerAdminEOA.getAddress(),
                await signerEOA.getAddress()
            )
    })

    describe('isValidSignature', () => {
        it('Should return ERC1271_MAGICVALUE_BYTES32 for a hash signed by the primary signer', async () => {
            const data = "0x00"
            const hash = keccak256(data)
            const signature = ethSign(signerEOA as ethers.Wallet, hash, true)

            expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_OK)
        })

        it('Should return 0 for a hash signed by a random signer', async () => {
            const data = "0x00"
            const hash = keccak256(data)
            const signature = ethSign(randomEOA as ethers.Wallet, hash, true)

            expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_INVALID)
        })

        it('Should return 0 for a hash signed by an unregistered rollover signer', async () => {
            const data = "0x00"
            const hash = keccak256(data)
            const signature = ethSign(rolloverSignerEOA as ethers.Wallet, hash, true)

            expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_INVALID)
        })

        it('Should return 0 for a random 32 byte array', async () => {
            const data = randomBytes(32)
            const hash = keccak256(data)
            const signature = ethSign(rolloverSignerEOA as ethers.Wallet, hash, true)

            expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_INVALID)
        })

        it('Should return 0 for a random 16 byte array', async () => {
            const data = randomBytes(16)
            const hash = keccak256(data)
            const signature = ethSign(rolloverSignerEOA as ethers.Wallet, hash, true)

            expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_INVALID)
        })

        it('Should return 0 for a 0 byte array', async () => {
            const data = []
            const hash = keccak256(data)
            const signature = ethSign(rolloverSignerEOA as ethers.Wallet, hash, true)

            expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_INVALID)
        })
    })

    describe('updateSigner', () => {
        it('Should immediately update the primary signer', async () => {
            const data = "0x00"
            const hash = keccak256(data)

            const randomEOASignature = ethSign(randomEOA as ethers.Wallet, hash, true)

            await immutableSigner.connect(signerAdminEOA).updateSigner(await randomEOA.getAddress())

            expect(await immutableSigner.isValidSignature(hash, randomEOASignature)).to.equal(ERC1271_OK)
        })

        it('Should immediately expire the previous primary signer', async () => {
            const data = "0x00"
            const hash = keccak256(data)

            const signerEOASignature = ethSign(signerEOA as ethers.Wallet, hash, true)

            await immutableSigner.connect(signerAdminEOA).updateSigner(await randomEOA.getAddress())

            expect(await immutableSigner.isValidSignature(hash, signerEOASignature)).to.equal(ERC1271_INVALID)
        })

        it('Should immediately expire the previous rollover signer', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            // Set a rollover signer and make sure it's valid
            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(
                await signerEOA.getAddress(),
                await rolloverSignerEOA.getAddress(),
                timestamp + 2
            )

            const data = "0x00"
            const hash = keccak256(data)
            const signerEOASignature = ethSign(signerEOA as ethers.Wallet, hash, true)
            expect(await immutableSigner.isValidSignature(hash, signerEOASignature)).to.equal(ERC1271_OK)

            // Still within the valid time range
            await hardhat.provider.send("evm_setNextBlockTimestamp", [timestamp + 2])
            await immutableSigner.connect(signerAdminEOA).updateSigner(await randomEOA.getAddress())
            expect(await immutableSigner.isValidSignature(hash, signerEOASignature)).to.equal(ERC1271_INVALID)
        })

        it('Should not allow changes from EOAs without SIGNER_ADMIN_ROLE', async () => {
            const randomAddress = (await randomEOA.getAddress()).toLowerCase()

            await expect(immutableSigner.connect(randomEOA).updateSigner(await randomEOA.getAddress(), { gasLimit: 300_000 }))
                .to.be.revertedWith(`AccessControl: account ${randomAddress} is missing role ${keccak256(toUtf8Bytes("SIGNER_ADMIN_ROLE"))}`)
        })
    })

    describe('updateSignerWithRolloverPeriod(address, address, uint256)', () => {
        it('Should allow both the new signer and the rollover signer to be used', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(
                await randomEOA.getAddress(),
                await rolloverSignerEOA.getAddress(),
                timestamp + 2
            )

            const data = "0x00"
            const hash = keccak256(data)
            const randomEOASignature = ethSign(randomEOA as ethers.Wallet, hash, true)
            const rolloverSignerEOASignature = ethSign(rolloverSignerEOA as ethers.Wallet, hash, true)

            // Within the valid time range
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            expect(await immutableSigner.isValidSignature(hash, randomEOASignature)).to.equal(ERC1271_OK)
            expect(await immutableSigner.isValidSignature(hash, rolloverSignerEOASignature)).to.equal(ERC1271_OK)
        })

        it('Should expire the rollover signer after the specified timestamp', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(
                await randomEOA.getAddress(),
                await rolloverSignerEOA.getAddress(),
                timestamp + 1
            )

            const data = "0x00"
            const hash = keccak256(data)
            const rolloverSignerEOASignature = ethSign(rolloverSignerEOA as ethers.Wallet, hash, true)

            // After the valid time range
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            expect(await immutableSigner.isValidSignature(hash, rolloverSignerEOASignature)).to.equal(ERC1271_INVALID)
        })

        it('Should allow the primary signer after the specified rollover timestamp', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(
                await randomEOA.getAddress(),
                await rolloverSignerEOA.getAddress(),
                timestamp + 1
            )

            const data = "0x00"
            const hash = keccak256(data)
            const randomEOASignature = ethSign(randomEOA as ethers.Wallet, hash, true)

            // After the valid time range
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            expect(await immutableSigner.isValidSignature(hash, randomEOASignature)).to.equal(ERC1271_OK)
        })

        it('Should not allow signers other than the primary and rollover to be used during rollover', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(
                await randomEOA.getAddress(),
                await rolloverSignerEOA.getAddress(),
                timestamp + 2
            )

            const data = "0x00"
            const hash = keccak256(data)

            const signatures = [
                ethSign(deployerEOA as ethers.Wallet, hash, true),
                ethSign(rootAdminEOA as ethers.Wallet, hash, true),
                ethSign(signerAdminEOA as ethers.Wallet, hash, true),
            ]

            // Within rollover
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            for (const signature of signatures) {
                expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_INVALID)
            }
        })
    })

    describe('updateSignerWithRolloverPeriod(address, uint256)', () => {
        it('Should allow both the new signer and the rollover signer to be used', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(await randomEOA.getAddress(), 2)

            const data = "0x00"
            const hash = keccak256(data)
            const randomEOASignature = ethSign(randomEOA as ethers.Wallet, hash, true)
            const signerEOASignature = ethSign(signerEOA as ethers.Wallet, hash, true)

            // Within the valid time range
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            expect(await immutableSigner.isValidSignature(hash, randomEOASignature)).to.equal(ERC1271_OK)
            expect(await immutableSigner.isValidSignature(hash, signerEOASignature)).to.equal(ERC1271_OK)
        })

        it('Should expire the rollover signer after the specified timestamp', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(await randomEOA.getAddress(), 1)

            const data = "0x00"
            const hash = keccak256(data)
            const signerEOASignature = ethSign(signerEOA as ethers.Wallet, hash, true)

            // After the valid time range
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            expect(await immutableSigner.isValidSignature(hash, signerEOASignature)).to.equal(ERC1271_INVALID)
        })

        it('Should allow the primary signer after the specified rollover timestamp', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(await randomEOA.getAddress(), 1)

            const data = "0x00"
            const hash = keccak256(data)
            const randomEOASignature = ethSign(randomEOA as ethers.Wallet, hash, true)

            // After the valid time range
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            expect(await immutableSigner.isValidSignature(hash, randomEOASignature)).to.equal(ERC1271_OK)
        })

        it('Should not allow signers other than the primary and rollover to be used during rollover', async () => {
            const timestamp = (await hardhat.provider.getBlock(await hardhat.provider.getBlockNumber())).timestamp

            await immutableSigner.connect(signerAdminEOA).updateSignerWithRolloverPeriod(await randomEOA.getAddress(), 2)

            const data = "0x00"
            const hash = keccak256(data)

            const signatures = [
                ethSign(deployerEOA as ethers.Wallet, hash, true),
                ethSign(rootAdminEOA as ethers.Wallet, hash, true),
                ethSign(signerAdminEOA as ethers.Wallet, hash, true),
            ]

            // Within rollover
            await hardhat.provider.send("evm_mine", [timestamp + 2])
            for (const signature of signatures) {
                expect(await immutableSigner.isValidSignature(hash, signature)).to.equal(ERC1271_INVALID)
            }
        })
    })
})
