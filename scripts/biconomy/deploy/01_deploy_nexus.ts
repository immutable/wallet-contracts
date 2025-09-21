import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const ENTRY_POINT_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const K1Validator = await deployments.get("K1Validator");

    const Nexus = await deploy("Nexus", {
        from: deployer,
        args: [
            ENTRY_POINT_ADDRESS,
            K1Validator.address,
            "0x" // Empty init data
        ],
        log: true,
    });

    console.log("Nexus deployed at:", Nexus.address);
};

export default func;
func.tags = ["Nexus"];
func.dependencies = ["K1Validator"];
