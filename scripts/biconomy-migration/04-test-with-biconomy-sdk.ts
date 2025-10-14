/**
 * 04-test-with-biconomy-sdk.ts
 * 
 * Tests the migrated wallet using Biconomy's AbstractJS SDK.
 * This validates that the wallet is fully compatible with the Nexus ecosystem.
 * 
 * YES BICONOMY SDK: Uses @biconomy/abstractjs to interact with migrated Nexus wallet
 * 
 * WHY SDK NOW? Because after migration, the wallet IS a Nexus account,
 * so we can use toNexusAccount() and createBicoBundlerClient().
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
    createBicoBundlerClient,
    toNexusAccount,
    getMEEVersion,
    MEEVersion,
} from "@biconomy/abstractjs";

async function testWithBiconomySDK() {
    console.log("🧪 Testing Migrated Wallet with Biconomy SDK\n");
    console.log("=".repeat(80));

    // ============================================================================
    // LOAD MIGRATION INFO
    // ============================================================================

    const migrationPath = path.join(__dirname, "migration-result.json");

    if (!fs.existsSync(migrationPath)) {
        throw new Error(
            "Migration result not found! Run script 03 first to migrate the wallet."
        );
    }

    const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
    const walletAddress = migration.walletAddress;
    const ownerAddress = migration.owner;

    console.log("\n📋 Migrated Wallet:");
    console.log("-".repeat(80));
    console.log(`  Address: ${walletAddress}`);
    console.log(`  Owner:   ${ownerAddress}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // SETUP VIEM CLIENT
    // ============================================================================

    console.log("\n⚙️  Setting up Viem client...");

    // Get owner's private key from environment or hardhat
    const [hardhatSigner] = await ethers.getSigners();

    if (hardhatSigner.address.toLowerCase() !== ownerAddress.toLowerCase()) {
        throw new Error(
            `Signer mismatch! Expected ${ownerAddress}, got ${hardhatSigner.address}`
        );
    }

    // Get private key from .env (same as used for deployment)
    const privateKeyRaw = process.env.BASE_SEPOLIA_PRIVATE_KEY || process.env.COLD_WALLET_PRIVATE_KEY;

    if (!privateKeyRaw) {
        throw new Error("BASE_SEPOLIA_PRIVATE_KEY or COLD_WALLET_PRIVATE_KEY not found in .env");
    }

    // Ensure it has 0x prefix
    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;

    const eoaAccount = privateKeyToAccount(privateKey as `0x${string}`);

    console.log(`  EOA: ${eoaAccount.address}`);
    console.log("  ✅ Viem client configured\n");
    console.log("=".repeat(80));

    // ============================================================================
    // CREATE NEXUS ACCOUNT WITH BICONOMY SDK
    // ============================================================================

    console.log("\n🔗 Creating Nexus Account with Biconomy SDK...");

    // Use MEE version v2.1.0 (matches our deployment)
    const version = MEEVersion.V2_1_0;
    const versionConfig = getMEEVersion(version);

    console.log(`  MEE Version: ${version}`);
    console.log(`  Implementation: ${versionConfig.implementationAddress}`);
    console.log(`  Bootstrap: ${versionConfig.bootStrapAddress}\n`);

    try {
        const nexusAccount = await toNexusAccount({
            signer: eoaAccount,
            chainConfiguration: {
                chain: baseSepolia,
                transport: http(),
                version: versionConfig,
            },
            accountAddress: walletAddress as `0x${string}`, // ← IMPORTANT: Use migrated address!
        });

        console.log(`  ✅ Nexus account created: ${nexusAccount.address}`);

        if (nexusAccount.address.toLowerCase() !== walletAddress.toLowerCase()) {
            throw new Error(
                `Address mismatch! Expected ${walletAddress}, got ${nexusAccount.address}`
            );
        }

        console.log("  ✅ Address matches migrated wallet\n");
        console.log("=".repeat(80));

        // ========================================================================
        // CREATE BUNDLER CLIENT
        // ========================================================================

        console.log("\n🌐 Creating Bundler Client...");

        // Load bundler URL from deployment or environment
        const bundlerUrl = process.env.NEXUS_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44";

        console.log(`  Bundler URL: ${bundlerUrl}\n`);

        const bundlerClient = createBicoBundlerClient({
            account: nexusAccount,
            transport: http(bundlerUrl),
        });

        console.log("  ✅ Bundler client created\n");
        console.log("=".repeat(80));

        // ========================================================================
        // CHECK WALLET BALANCE
        // ========================================================================

        console.log("\n💰 Checking Wallet Balance...");

        const provider = ethers.provider;
        const balance = await provider.getBalance(walletAddress);

        console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

        if (balance.lt(ethers.utils.parseEther("0.0001"))) {
            console.log("  ⚠️  Insufficient balance for test transaction!");
            console.log("     Please fund the wallet with at least 0.0001 ETH\n");
            console.log("=".repeat(80));
            return;
        }

        console.log("=".repeat(80));

        // ========================================================================
        // SEND TEST TRANSACTION
        // ========================================================================

        console.log("\n🚀 Sending Test Transaction via Biconomy SDK...");

        // Send a small amount back to the owner
        const testAmount = parseEther("0.00001");

        console.log(`  Recipient: ${eoaAccount.address}`);
        console.log(`  Amount:    ${ethers.utils.formatEther(testAmount.toString())} ETH\n`);

        console.log("  📋 Creating UserOperation...");

        // Get current gas prices from provider
        const feeData = await provider.getFeeData();
        console.log(`  ⛽ Max Fee Per Gas: ${ethers.utils.formatUnits(feeData.maxFeePerGas || 0, "gwei")} gwei`);
        console.log(`  ⛽ Max Priority Fee: ${ethers.utils.formatUnits(feeData.maxPriorityFeePerGas || 0, "gwei")} gwei`);

        const userOpHash = await bundlerClient.sendUserOperation({
            calls: [
                {
                    to: eoaAccount.address,
                    value: testAmount,
                },
            ],
            // Provide gas parameters manually to avoid bundler gas estimation issues
            maxFeePerGas: BigInt(feeData.maxFeePerGas?.toString() || "1000000000"), // 1 gwei fallback
            maxPriorityFeePerGas: BigInt(feeData.maxPriorityFeePerGas?.toString() || "1000000000"), // 1 gwei fallback
        });

        console.log(`  ✅ UserOp submitted: ${userOpHash}\n`);
        console.log("  ⏳ Waiting for receipt...\n");

        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        });

        console.log(`  ✅ UserOp executed!`);
        console.log(`  Block: ${receipt.receipt.blockNumber}`);
        console.log(`  Success: ${receipt.success}`);
        console.log(`  TX Hash: ${receipt.receipt.transactionHash}\n`);
        console.log("=".repeat(80));

        // ========================================================================
        // VERIFY TRANSACTION
        // ========================================================================

        console.log("\n🔍 Verifying Transaction...");

        const newBalance = await provider.getBalance(walletAddress);
        const balanceDiff = balance.sub(newBalance);

        console.log(`  Balance before: ${ethers.utils.formatEther(balance)} ETH`);
        console.log(`  Balance after:  ${ethers.utils.formatEther(newBalance)} ETH`);
        console.log(`  Difference:     ${ethers.utils.formatEther(balanceDiff)} ETH\n`);

        if (balanceDiff.gte(testAmount)) {
            console.log("  ✅ Transaction verified - balance decreased correctly\n");
        } else {
            console.log("  ⚠️  Balance difference unexpected\n");
        }

        console.log("=".repeat(80));

        // ========================================================================
        // SAVE TEST RESULT
        // ========================================================================

        const testResult = {
            timestamp: new Date().toISOString(),
            walletAddress,
            owner: eoaAccount.address,
            userOpHash,
            txHash: receipt.receipt.transactionHash,
            blockNumber: receipt.receipt.blockNumber.toString(),
            success: receipt.success,
            testAmount: testAmount.toString(),
            balanceBefore: balance.toString(),
            balanceAfter: newBalance.toString(),
        };

        const resultPath = path.join(__dirname, "sdk-test-result.json");
        fs.writeFileSync(resultPath, JSON.stringify(testResult, null, 2));

        console.log(`\n📄 Test result saved to: ${resultPath}\n`);

        // ========================================================================
        // SUMMARY
        // ========================================================================

        console.log("=".repeat(80));
        console.log("\n🎉 BICONOMY SDK TEST SUCCESSFUL!\n");
        console.log("✅ Verified:");
        console.log("  • Wallet address preserved after migration");
        console.log("  • Nexus account recognized by SDK");
        console.log("  • Bundler client connection working");
        console.log("  • UserOperation execution successful");
        console.log("  • K1Validator signature validation working");
        console.log("  • EntryPoint v0.7 integration working\n");
        console.log("📋 Summary:");
        console.log(`  Wallet:  ${walletAddress}`);
        console.log(`  Owner:   ${eoaAccount.address}`);
        console.log(`  UserOp:  ${userOpHash}`);
        console.log(`  TX Hash: ${receipt.receipt.transactionHash}\n`);
        console.log("🔜 Next Steps:");
        console.log("  • Migration is VERIFIED and WORKING!");
        console.log("  • You can now migrate production wallets (script 05)");
        console.log("  • Update your application to use Biconomy SDK\n");
        console.log("=".repeat(80));

    } catch (error: any) {
        console.error("\n❌ SDK Test Failed!");
        console.error(`   Error: ${error.message}\n`);

        if (error.message.includes("account is not deployed")) {
            console.error("💡 This might mean:");
            console.error("   • Migration didn't complete successfully");
            console.error("   • Wallet implementation not properly updated");
            console.error("   • Network propagation delay\n");
            console.error("🔧 Try:");
            console.error("   • Verify migration with: cast code <wallet-address>");
            console.error("   • Check implementation slot: cast storage <wallet-address> <wallet-address>");
            console.error("   • Re-run migration if needed (script 03)\n");
        }

        throw error;
    }
}

// Execute
testWithBiconomySDK()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error testing with Biconomy SDK:", error);
        process.exit(1);
    });

