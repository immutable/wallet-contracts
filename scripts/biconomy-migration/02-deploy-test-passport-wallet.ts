/**
 * 02-deploy-test-passport-wallet.ts
 * 
 * Deploys a test Passport wallet on Base Sepolia for migration testing.
 * This wallet will be used to verify the migration process before applying
 * it to production wallets.
 * 
 * APPROACH: Uses the SAME approach as scripts/wallet-deployment.ts
 * 
 * NO BICONOMY SDK: Uses ethers.js directly
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { addressOf, encodeImageHash, encodeMetaTransactionsData, walletMultiSign } from "../../utils/helpers";

async function deployTestPassportWallet() {
    console.log("🚀 Deploying Test Passport Wallet\n");
    console.log("=".repeat(80));

    // ============================================================================
    // LOAD DEPLOYMENT ARTIFACTS
    // ============================================================================

    const deploymentPath = path.join(__dirname, "../deployment-summary-simplified.json");
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const artifacts = {
        factory: deployment.infrastructure.factory,
        multiCallDeploy: deployment.infrastructure.multiCallDeploy,
        startupWalletImpl: deployment.infrastructure.startupWalletImpl,
        mainModule: deployment.infrastructure.mainModuleDynamicAuth,
    };

    console.log("\n📋 Using Deployment Artifacts:");
    console.log("-".repeat(80));
    console.log(`  Factory:           ${artifacts.factory}`);
    console.log(`  MultiCallDeploy:   ${artifacts.multiCallDeploy}`);
    console.log(`  StartupWalletImpl: ${artifacts.startupWalletImpl}`);
    console.log(`  MainModule:        ${artifacts.mainModule}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // SETUP WALLET OWNER
    // ============================================================================

    const [deployer] = await ethers.getSigners();
    console.log(`\n👤 Test Wallet Owner: ${deployer.address}`);

    const balance = await deployer.getBalance();
    console.log(`💰 Owner Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    if (balance.lt(ethers.utils.parseEther("0.01"))) {
        throw new Error("Insufficient balance for deployment (need at least 0.01 ETH)");
    }

    // ============================================================================
    // WALLET CONFIGURATION (same format as wallet-deployment.ts)
    // ============================================================================

    const walletConfig = {
        threshold: 1,
        owners: [
            {
                weight: 1,
                address: deployer.address,
            }
        ],
    };

    console.log("📝 Wallet Configuration:");
    console.log(`  - Owners: ${walletConfig.owners.length}`);
    console.log(`  - Threshold: ${walletConfig.threshold}\n`);

    // ============================================================================
    // GENERATE SALT AND CALCULATE CFA (same as wallet-deployment.ts)
    // ============================================================================

    // Generate wallet salt from owner configuration
    const salt = encodeImageHash(walletConfig.threshold, walletConfig.owners);
    console.log(`🔐 Generated salt (imageHash): ${salt}`);

    // Calculate counterfactual address (CFA)
    // IMPORTANT: Must use startupWalletImpl, not mainModule!
    const cfa = addressOf(
        artifacts.factory,
        artifacts.startupWalletImpl,
        salt
    );

    console.log(`🎯 Counterfactual address: ${cfa}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // FUNDING STEP (from wallet-deployment.ts lines 232-264)
    // ============================================================================

    console.log("\n💰 Funding CFA Before Deployment...");

    // Fund the CFA with some ETH so it can execute transactions
    const fundAmount = ethers.utils.parseEther("0.001");

    const deployerBalance = await deployer.getBalance();
    if (deployerBalance.lt(fundAmount)) {
        throw new Error("Deployer does not have enough ETH to fund the wallet");
    }

    console.log(`  Funding ${cfa} with ${ethers.utils.formatEther(fundAmount)} ETH`);

    const fundTx = await deployer.sendTransaction({
        to: cfa,
        value: fundAmount,
    });

    await fundTx.wait();
    console.log(`  ✅ CFA funded successfully\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // PREPARE INITIALIZATION DATA (same as wallet-deployment.ts)
    // ============================================================================

    console.log("\n📝 Preparing Initialization Data...");

    // OPTION B (COMMENTED): Create updateImageHash transaction to initialize the wallet
    // const MainModuleDynamicAuth = await ethers.getContractFactory("MainModuleDynamicAuth");
    // const updateImageHashCalldata = MainModuleDynamicAuth.interface.encodeFunctionData(
    //     "updateImageHash",
    //     [imageHash] // IMPORTANT: Use imageHash, not salt!
    // );
    // console.log(`  UpdateImageHash Calldata: ${updateImageHashCalldata.substring(0, 66)}...\n`);

    // OPTION A (ACTIVE): Simple ETH transfer (updateImageHash happens automatically during signature validation)
    // Create transactions array - simple ETH transfer like wallet-deployment.ts
    const transactions = [
        {
            delegateCall: false,
            revertOnError: true,
            gasLimit: ethers.BigNumber.from(200000), // 200K gas for simple transfer
            target: deployer.address, // Transfer back to deployer
            value: ethers.utils.parseEther("0.0001"), // 0.0001 ETH
            data: new Uint8Array([]), // Empty data for simple transfer
        },
    ];

    console.log(`  Transaction: ETH transfer to ${deployer.address}`);
    console.log(`  Amount: 0.0001 ETH\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // GENERATE SIGNATURE (same as wallet-deployment.ts)
    // ============================================================================

    console.log("\n🔏 Generating Signature...");

    const nonce = 0;
    const networkId = await ethers.provider.getNetwork().then((n) => n.chainId);

    // Encode transactions data - IMPORTANT: Correct parameter order!
    const data = encodeMetaTransactionsData(cfa, transactions, networkId, nonce);

    // Sign with wallet owner
    const signature = await walletMultiSign(
        [{ weight: walletConfig.threshold, owner: deployer }],
        walletConfig.threshold,
        data
    );

    console.log(`  Network ID: ${networkId}`);
    console.log(`  Nonce: ${nonce}`);
    console.log(`  Signature: ${signature.substring(0, 66)}...\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // DEPLOY WALLET VIA MULTICALL DEPLOY
    // ============================================================================

    console.log("\n🔨 Deploying Wallet...");

    const multiCallDeploy = await ethers.getContractAt(
        "MultiCallDeploy",
        artifacts.multiCallDeploy
    );

    console.log(`  Using MultiCallDeploy: ${multiCallDeploy.address}`);
    console.log(`  Target CFA: ${cfa}\n`);

    const deployTx = await multiCallDeploy.deployAndExecute(
        cfa,
        artifacts.startupWalletImpl, // IMPORTANT: Use startupWalletImpl
        salt, // Use imageHash as salt
        artifacts.factory,
        transactions,
        nonce,
        signature,
        {
            gasLimit: 5000000,
        }
    );

    console.log(`  📋 Transaction hash: ${deployTx.hash}`);
    console.log("  ⏳ Waiting for confirmation...\n");

    const receipt = await deployTx.wait();

    console.log(`  ✅ Mined in block: ${receipt.blockNumber}`);
    console.log(`  ⛽ Gas used: ${receipt.gasUsed.toString()}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // VERIFY DEPLOYMENT
    // ============================================================================

    console.log("\n🔍 Verifying Deployment...");

    // Wait for network propagation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const deployedCode = await ethers.provider.getCode(cfa);
    const codeSize = Math.floor(deployedCode.length / 2) - 1;

    console.log(`  Code size: ${codeSize} bytes`);

    if (codeSize < 50) {
        throw new Error("Deployment failed - code too small");
    }

    console.log("  ✅ Wallet deployed successfully!\n");

    // Verify implementation address
    const implementationSlot = await ethers.provider.getStorageAt(cfa, cfa);
    const implementationAddress = ethers.utils.getAddress(
        "0x" + implementationSlot.slice(-40)
    );

    console.log(`  Implementation: ${implementationAddress}`);
    console.log(`  Expected:       ${artifacts.startupWalletImpl}`);

    if (implementationAddress.toLowerCase() !== artifacts.startupWalletImpl.toLowerCase()) {
        console.log("  ⚠️  Implementation mismatch!");
    } else {
        console.log("  ✅ Implementation correct!\n");
    }

    // Check balance
    const walletBalance = await ethers.provider.getBalance(cfa);
    console.log(`  Balance: ${ethers.utils.formatEther(walletBalance)} ETH\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // SAVE TEST WALLET INFO
    // ============================================================================

    const testWalletInfo = {
        timestamp: new Date().toISOString(),
        network: "base_sepolia",
        walletAddress: cfa,
        owner: deployer.address,
        imageHash: salt,
        implementationAddress,
        deploymentTx: deployTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        walletConfig,
    };

    const infoPath = path.join(__dirname, "test-wallet-info.json");
    fs.writeFileSync(infoPath, JSON.stringify(testWalletInfo, null, 2));

    console.log(`\n📄 Test wallet info saved to: ${infoPath}\n`);

    // ============================================================================
    // SUMMARY
    // ============================================================================

    console.log("=".repeat(80));
    console.log("\n🎉 TEST WALLET DEPLOYED SUCCESSFULLY!\n");
    console.log("📋 Summary:");
    console.log(`  Address:        ${cfa}`);
    console.log(`  Owner:          ${deployer.address}`);
    console.log(`  Implementation: ${implementationAddress}`);
    console.log(`  Balance:        ${ethers.utils.formatEther(walletBalance)} ETH`);
    console.log(`  TX Hash:        ${deployTx.hash}\n`);
    console.log("🔜 Next Steps:");
    console.log("  1. Fund this wallet with a small amount of ETH (optional)");
    console.log("  2. Run script 03 to migrate to Nexus");
    console.log("  3. Run script 04 to test with Biconomy SDK\n");
    console.log("=".repeat(80));
}

// Execute
deployTestPassportWallet()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error deploying test wallet:", error);
        process.exit(1);
    });
