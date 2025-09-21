import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const NexusBootstrap = await deploy("NexusBootstrap", {
        from: deployer,
        args: [],
        log: true,
    });

    console.log("NexusBootstrap deployed at:", NexusBootstrap.address);
};

export default func;
func.tags = ["NexusBootstrap"];
