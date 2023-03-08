import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  addressOf,
  encodeImageHash,
  multiSignAndExecuteMetaTx,
  signAndExecuteMetaTx,
} from "./utils/helpers";
import { CustomModule__factory } from "../typechain-types";

describe("Wallet Factory", function () {
  let salts: string[] = [];

  async function setupFactoryFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, acc1] = await ethers.getSigners();

    const WalletFactory = await ethers.getContractFactory("WalletFactory");
    const factory = await WalletFactory.deploy();

    const MainModule = await ethers.getContractFactory("MainModuleMock");
    const mainModule = await MainModule.deploy(factory.address);

    const CustomModule = await ethers.getContractFactory("CustomModule");
    const customModule = await CustomModule.deploy();

    salts = [
      encodeImageHash(1, [{ weight: 1, address: owner.address }]),
      encodeImageHash(1, [{ weight: 1, address: acc1.address }]),
      encodeImageHash(2, [
        { weight: 1, address: owner.address },
        { weight: 1, address: acc1.address },
      ]),
      encodeImageHash(3, [
        { weight: 2, address: owner.address },
        { weight: 1, address: acc1.address },
      ]),
    ];

    return {
      owner,
      acc1,
      factory,
      mainModule,
      customModule,
    };
  }

  describe("getAddress", function () {
    it("Should return deterministic contract address", async function () {
      const { factory, mainModule } = await loadFixture(setupFactoryFixture);
      for (const salt of salts) {
        expect(await factory.getAddress(mainModule.address, salt)).to.equal(
          addressOf(factory.address, mainModule.address, salt)
        );
      }
    });

    it("Should depend on all parameters and generate no collisions", async function () {
      const { factory, mainModule, customModule } = await loadFixture(setupFactoryFixture);

      // Call getAddress() with different addresses and different salts
      const addresses = await Promise.all(
        [mainModule.address, customModule.address].flatMap((address) =>
          salts.map(async (salt) => factory.getAddress(address, salt))
        )
      );

      const addressSet = new Set(addresses);

      // Results should have no duplicates
      expect(addressSet.size).to.equal(addresses.length);
    });
  });

  describe("deploy", function () {
    it("Should not be able to interact with an undeployed contract", async function () {
      const { owner, factory, mainModule } = await loadFixture(
        setupFactoryFixture
      );
      // revert on attempt to call nonce() on undeployed contract
      await expect(
        (
          await ethers.getContractAt(
            "MainModuleMock",
            addressOf(
              factory.address,
              mainModule.address,
              encodeImageHash(1, [{ weight: 1, address: owner.address }])
            )
          )
        ).nonce()
      ).to.be.revertedWithoutReason();
    });

    it("Should deploy wallets to the expected address", async function () {
      const { factory, mainModule } = await loadFixture(setupFactoryFixture);

      for (const salt of salts) {
        expect(await factory.deploy(mainModule.address, salt))
          .to.emit(factory, "WalletDeployed")
          .withArgs(
            addressOf(factory.address, mainModule.address, salt),
            mainModule.address,
            salt
          );

        const deployedContract = await ethers.getContractAt(
          "MainModuleMock",
          addressOf(factory.address, mainModule.address, salt)
        );
        // initial wallet nonce = 0
        expect(await deployedContract.nonce()).to.equal(0);
      }
    });

    it("Should be able to deploy with a custom module", async function () {
      const { owner, factory, customModule } = await loadFixture(
        setupFactoryFixture
      );

      const salt = encodeImageHash(1, [{ weight: 1, address: owner.address }]);
      expect(await factory.deploy(customModule.address, salt))
        .to.emit(factory, "WalletDeployed")
        .withArgs(
          addressOf(factory.address, customModule.address, salt),
          customModule.address,
          salt
        );
      const contract = CustomModule__factory.connect(
        addressOf(factory.address, customModule.address, salt),
        owner
      );

      // check functionality
      await contract.setStr("new_string");
      expect(await contract.getStr()).to.equal("new_string");
    });

    it("Should not be able to deploy multiple wallets with the same salt", async function () {
      const { acc1, factory, mainModule } = await loadFixture(
        setupFactoryFixture
      );
      const salt = encodeImageHash(1, [{ weight: 1, address: acc1.address }]);

      expect(await factory.deploy(mainModule.address, salt))
        .to.emit(factory, "WalletDeployed")
        .withArgs(
          addressOf(factory.address, mainModule.address, salt),
          mainModule.address,
          salt
        );

      await expect(factory.deploy(mainModule.address, salt)).to.be.revertedWith(
        "WalletFactory: deployment failed"
      );
    });

    it("Should generate contracts with independent storage (i.e.: delegatecall)", async function () {
      const { owner, acc1, factory, customModule } = await loadFixture(
        setupFactoryFixture
      );

      const salts = [
        encodeImageHash(1, [{ weight: 1, address: owner.address }]),
        encodeImageHash(1, [{ weight: 1, address: acc1.address }])
      ];

      // Deploy two contracts pointing to the same implementation
      await Promise.all(salts.map(async salt => factory.deploy(customModule.address, salt)));

      const contracts = salts.map(salt => CustomModule__factory.connect(
        addressOf(factory.address, customModule.address, salt),
        owner
      ));

      // Set the string stored in each contract to their address
      await Promise.all(contracts.map(async contract => contract.setStr(contract.address)));

      for (const contract of contracts) {
        expect(await contract.getStr()).to.equal(contract.address);
      }
    });
  });

  describe("ownable", function () {
    it("Should not be able to deploy if not owner", async function () {
      const { acc1, factory, mainModule } = await loadFixture(
        setupFactoryFixture
      );
      await expect(
        factory
          .connect(acc1)
          .deploy(
            mainModule.address,
            encodeImageHash(1, [{ weight: 1, address: acc1.address }])
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not change generated addresses after changing ownership", async function () {
      const { acc1, factory, mainModule } = await loadFixture(
        setupFactoryFixture
      );
      const salt = encodeImageHash(1, [{ weight: 1, address: acc1.address }]);
      await factory.transferOwnership(acc1.address);
      expect(await factory.connect(acc1).deploy(mainModule.address, salt))
        .to.emit(factory, "WalletDeployed")
        .withArgs(
          addressOf(factory.address, mainModule.address, salt),
          mainModule.address,
          salt
        );
    });
  });

  describe("wallet", function () {
    const initNonce = ethers.constants.Zero;
    const transaction = {
      delegateCall: false,
      revertOnError: true,
      gasLimit: ethers.constants.Two.pow(21),
      target: ethers.constants.AddressZero,
      value: ethers.constants.Zero,
      data: [],
    };

    it("Should be able to send a transaction from a deployed wallet", async function () {
      const { factory, mainModule } = await loadFixture(setupFactoryFixture);

      const acc = ethers.Wallet.createRandom();
      const salt = encodeImageHash(1, [{ weight: 1, address: acc.address }]);
      await factory.deploy(mainModule.address, salt);
      const wallet = await ethers.getContractAt(
        "MainModuleMock",
        addressOf(factory.address, mainModule.address, salt)
      );

      const networkId = (await ethers.provider.getNetwork()).chainId;
      // check wallet nonce before and after transaction
      expect((await wallet.nonce()).toNumber()).to.equal(0);
      await signAndExecuteMetaTx(
        wallet,
        acc,
        [transaction],
        networkId,
        initNonce
      );
      expect((await wallet.nonce()).toNumber()).to.equal(1);
    });

    it("Should not be able to send a transaction with invalid signer", async function () {
      const { factory, mainModule } = await loadFixture(setupFactoryFixture);

      const acc = ethers.Wallet.createRandom();
      const invalidSigner = ethers.Wallet.createRandom();
      const salt = encodeImageHash(1, [{ weight: 1, address: acc.address }]);
      await factory.deploy(mainModule.address, salt);
      const wallet = await ethers.getContractAt(
        "MainModuleMock",
        addressOf(factory.address, mainModule.address, salt)
      );

      const networkId = (await ethers.provider.getNetwork()).chainId;
      await expect(
        signAndExecuteMetaTx(
          wallet,
          invalidSigner,
          [transaction],
          networkId,
          initNonce
        )
      ).to.be.revertedWith("ModuleCalls#execute: INVALID_SIGNATURE");
    });

    it("Should be able to send a 2 of 2 multisig transaction", async function () {
      const { factory, mainModule } = await loadFixture(setupFactoryFixture);

      const signer1 = ethers.Wallet.createRandom();
      const signer2 = ethers.Wallet.createRandom();
      const salt = encodeImageHash(2, [
        { weight: 1, address: signer1.address },
        { weight: 1, address: signer2.address },
      ]);
      await factory.deploy(mainModule.address, salt);
      const wallet = await ethers.getContractAt(
        "MainModuleMock",
        addressOf(factory.address, mainModule.address, salt)
      );

      const networkId = (await ethers.provider.getNetwork()).chainId;
      // check wallet nonce before and after transaction
      expect((await wallet.nonce()).toNumber()).to.equal(0);
      await multiSignAndExecuteMetaTx(
        wallet,
        [
          {
            weight: 1,
            owner: signer1,
          },
          {
            weight: 1,
            owner: signer2,
          },
        ],
        2,
        [transaction],
        networkId,
        initNonce
      );
      expect((await wallet.nonce()).toNumber()).to.equal(1);
    });

    it("Should not be able to send a 2 of 2 multisig transaction with one invalid signer", async function () {
      const { factory, mainModule } = await loadFixture(setupFactoryFixture);

      const signer1 = ethers.Wallet.createRandom();
      const signer2 = ethers.Wallet.createRandom();
      const salt = encodeImageHash(2, [
        { weight: 1, address: signer1.address },
        { weight: 1, address: signer2.address },
      ]);
      await factory.deploy(mainModule.address, salt);
      const wallet = await ethers.getContractAt(
        "MainModuleMock",
        addressOf(factory.address, mainModule.address, salt)
      );

      const networkId = (await ethers.provider.getNetwork()).chainId;
      await expect(
        multiSignAndExecuteMetaTx(
          wallet,
          [
            {
              weight: 1,
              owner: signer1,
            },
            {
              weight: 1,
              owner: signer1, // invalid signer
            },
          ],
          2,
          [transaction],
          networkId,
          initNonce
        )
      ).to.be.revertedWith("ModuleCalls#execute: INVALID_SIGNATURE");
    });

    it("Should be able to upgrade a 2 of 2 multisig wallet to a custom module", async function () {
      const { factory, mainModule, customModule } = await loadFixture(
        setupFactoryFixture
      );

      const signer1 = ethers.Wallet.createRandom();
      const signer2 = ethers.Wallet.createRandom();
      const salt = encodeImageHash(2, [
        { weight: 1, address: signer1.address },
        { weight: 1, address: signer2.address },
      ]);
      await factory.deploy(mainModule.address, salt);
      const originalWallet = await ethers.getContractAt(
        "MainModuleMock",
        addressOf(factory.address, mainModule.address, salt)
      );

      const networkId = (await ethers.provider.getNetwork()).chainId;

      // upgrade implementation tx
      const transaction = {
        delegateCall: false,
        revertOnError: true,
        gasLimit: ethers.constants.Two.pow(21),
        target: originalWallet.address,
        value: ethers.constants.Zero,
        data: originalWallet.interface.encodeFunctionData(
          "updateImplementation",
          [customModule.address]
        ),
      };
      await multiSignAndExecuteMetaTx(
        originalWallet,
        [
          {
            weight: 1,
            owner: signer1,
          },
          {
            weight: 1,
            owner: signer2,
          },
        ],
        2,
        [transaction],
        networkId,
        initNonce
      );
      // check functionality
      const updatedWallet = await ethers.getContractAt(
        "CustomModule",
        addressOf(factory.address, mainModule.address, salt) // still generate using the original module address
      );
      expect(updatedWallet.address).to.equal(originalWallet.address); // wallet address remains unchanged
      await updatedWallet.setStr("new_string");
      expect(await updatedWallet.getStr()).to.equal("new_string");
      await expect(originalWallet.nonce()).to.be.revertedWithoutReason(); // original wallet functions no longer exposed
    });
  });
});
