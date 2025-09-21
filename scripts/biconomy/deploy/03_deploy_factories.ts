import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const K1Validator = await deployments.get("K1Validator");
    const Nexus = await deployments.get("Nexus");
    const NexusBootstrap = await deployments.get("NexusBootstrap");

    const K1ValidatorFactory = await deploy("K1ValidatorFactory", {
        from: deployer,
        args: [K1Validator.address],
        log: true,
    });

    const NexusAccountFactory = await deploy("NexusAccountFactory", {
        from: deployer,
        args: [Nexus.address, ENTRY_POINT_ADDRESS],
        log: true,
    });

    const NexusProxy = await deploy("NexusProxy", {
        from: deployer,
        args: [NexusBootstrap.address],
        log: true,
    });

    console.log("K1ValidatorFactory deployed at:", K1ValidatorFactory.address);
    console.log("NexusAccountFactory deployed at:", NexusAccountFactory.address);
    console.log("NexusProxy deployed at:", NexusProxy.address);
};

export default func;
func.tags = ["Factories"];
func.dependencies = ["K1Validator", "Nexus", "NexusBootstrap"];
