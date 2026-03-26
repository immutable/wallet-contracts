import { deployments, ethers, run, network } from "hardhat";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Contract, Signer } from "ethers";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
declare const hre: HardhatRuntimeEnvironment;

// Endereço do EntryPoint v0.7
const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

async function main() {
    console.log("Starting Nexus infrastructure deployment...");

    const signers = await ethers.getSigners();
    const deployer = signers[0];
    console.log(`Deployer address: ${await deployer.getAddress()}`);

    const deployOptions = {
        from: await deployer.getAddress(),
        deterministicDeployment: true,
    };

    // Step 1: Deploy K1Validator
    const K1Validator = await deployments.deploy("K1Validator", {
        ...deployOptions,
        args: []
    });
    console.log(`K1Validator deployed at: ${K1Validator.address}`);

    // Initialize K1Validator
    const k1ValidatorFactory = await ethers.getContractFactory("K1Validator");
    const k1ValidatorContract = k1ValidatorFactory.attach(K1Validator.address);
    try {
        const ownerAddress = await deployer.getAddress();
        const initData = ethers.utils.hexConcat([
            ownerAddress,
            // Não adicionamos safe senders por enquanto
        ]);
        const initK1ValidatorTx = await k1ValidatorContract.onInstall(initData);
        await initK1ValidatorTx.wait();
        console.log("K1Validator initialized");
    } catch (error: any) {
        if (error.message.includes("ModuleAlreadyInitialized")) {
            console.log("K1Validator already initialized");
        } else {
            throw error;
        }
    }

    // Step 2: Deploy Nexus Implementation
    const nexusFactory = await ethers.getContractFactory("NexusTestImpl");
    const ownerAddress = await deployer.getAddress();
    const validatorInitData = ethers.utils.hexConcat([ownerAddress]);
    const Nexus = await nexusFactory.deploy(
        ENTRY_POINT_ADDRESS,
        K1Validator.address,
        validatorInitData, // Passa o owner como initData para o K1Validator
        {
            gasLimit: 30000000
        }
    );
    await Nexus.deployed();
    console.log(`Nexus deployed at: ${Nexus.address}`);

    // Step 3: Deploy NexusBootstrap
    const NexusBootstrap = await deployments.deploy("NexusBootstrap", {
        ...deployOptions,
        args: [K1Validator.address, validatorInitData]
    });
    console.log(`NexusBootstrap deployed at: ${NexusBootstrap.address}`);

    // Step 4: Deploy K1ValidatorFactory
    const K1ValidatorFactory = await deployments.deploy("K1ValidatorFactory", {
        ...deployOptions,
        args: [K1Validator.address],
    });
    console.log(`K1ValidatorFactory deployed at: ${K1ValidatorFactory.address}`);

    // Step 5: Deploy NexusAccountFactory
    const NexusAccountFactory = await deployments.deploy("NexusAccountFactoryTest", {
        ...deployOptions,
        args: [Nexus.address, ENTRY_POINT_ADDRESS],
    });
    console.log(`NexusAccountFactory deployed at: ${NexusAccountFactory.address}`);

    // Step 6: Deploy NexusProxy
    const NexusProxy = await deployments.deploy("NexusProxy", {
        ...deployOptions,
        args: [NexusBootstrap.address, "0x"],
    });
    console.log(`NexusProxy deployed at: ${NexusProxy.address}`);

    // Verify contracts if not on local network
    if (!network.name.includes("local")) {
        console.log("\nVerifying contracts on Etherscan...");
        try {
            await run("verify:verify", {
                address: K1Validator.address,
                constructorArguments: [],
            });
            await run("verify:verify", {
                address: Nexus.address,
                constructorArguments: [ENTRY_POINT_ADDRESS, K1Validator.address, "0x"],
            });
            await run("verify:verify", {
                address: NexusBootstrap.address,
                constructorArguments: [],
            });
            await run("verify:verify", {
                address: K1ValidatorFactory.address,
                constructorArguments: [K1Validator.address],
            });
            await run("verify:verify", {
                address: NexusAccountFactory.address,
                constructorArguments: [Nexus.address, ENTRY_POINT_ADDRESS],
            });
            await run("verify:verify", {
                address: NexusProxy.address,
                constructorArguments: [NexusBootstrap.address],
            });
        } catch (error) {
            console.error("Error verifying contracts:", error);
        }
    }

    console.log("\nDeployment Summary:");
    console.log("------------------");
    console.log(`Nexus Implementation: ${Nexus.address}`);
    console.log(`Nexus Bootstrap: ${NexusBootstrap.address}`);
    console.log(`K1 Validator: ${K1Validator.address}`);
    console.log(`K1 Validator Factory: ${K1ValidatorFactory.address}`);
    console.log(`Nexus Account Factory: ${NexusAccountFactory.address}`);
    console.log(`Nexus Proxy: ${NexusProxy.address}`);

    console.log("\nNexus infrastructure deployment completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });