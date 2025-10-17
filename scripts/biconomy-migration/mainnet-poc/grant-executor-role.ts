import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const deploymentPath = path.join(__dirname, "deployment-summary-base-mainnet.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const [deployer] = await ethers.getSigners();

    console.log("🔑 Granting EXECUTOR_ROLE to Deployer Account\n");
    console.log("=".repeat(80));
    console.log(`MultiCallDeploy: ${deployment.infrastructure.multiCallDeploy}`);
    console.log(`Account:         ${deployer.address}\n`);

    const multiCallDeploy = await ethers.getContractAt(
        "MultiCallDeploy",
        deployment.infrastructure.multiCallDeploy
    );

    const EXECUTOR_ROLE = await multiCallDeploy.EXECUTOR_ROLE();
    console.log(`EXECUTOR_ROLE hash: ${EXECUTOR_ROLE}\n`);

    // Check if already has role
    const hasRole = await multiCallDeploy.hasRole(EXECUTOR_ROLE, deployer.address);

    if (hasRole) {
        console.log("✅ Account already has EXECUTOR_ROLE!\n");
        console.log("=".repeat(80));
        return;
    }

    console.log("⏳ Granting EXECUTOR_ROLE...\n");

    const tx = await multiCallDeploy.grantExecutorRole(deployer.address, {
        gasLimit: 200000,
    });

    console.log(`📋 Transaction hash: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...\n");

    const receipt = await tx.wait();

    console.log(`✅ EXECUTOR_ROLE granted successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

    // Verify
    const hasRoleNow = await multiCallDeploy.hasRole(EXECUTOR_ROLE, deployer.address);
    console.log(`✅ Verification: ${hasRoleNow ? 'SUCCESS' : 'FAILED'}\n`);
    console.log("=".repeat(80));
}

main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
});

