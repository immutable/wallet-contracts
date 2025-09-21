import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const K1Validator = await deploy("K1Validator", {
        from: deployer,
        args: [],
        log: true,
    });

    const k1ValidatorContract = await hre.ethers.getContractAt("K1Validator", K1Validator.address);
    try {
        const initK1ValidatorTx = await k1ValidatorContract.onInstall(deployer);
        await initK1ValidatorTx.wait();
        console.log("K1Validator initialized");
    } catch (error: any) {
        if (error.message.includes("ModuleAlreadyInitialized")) {
            console.log("K1Validator already initialized");
        } else {
            throw error;
        }
    }
};

export default func;
func.tags = ["K1Validator"];
