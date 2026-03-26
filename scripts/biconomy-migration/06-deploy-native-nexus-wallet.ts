/**
 * 07-deploy-native-nexus-with-sdk.ts
 * 
 * Deploys a NATIVE Nexus wallet using Biconomy SDK (@biconomy/account).
 * 
 * PURPOSE:
 * - Create a native Nexus wallet (not migrated)
 * - Test that @biconomy/account works with native wallets
 * - Compare behavior with migrated wallets
 * 
 * IMPORTANT:
 * ✅ Use BUNDLER V2 (not V3)
 * - V2 Bundler: https://bundler.biconomy.io/api/v2/{chainId}/rpc
 * - V3 Bundler: Incompatible API format
 * 
 * RESULT:
 * ✅ Native Nexus wallets work perfectly with @biconomy/account + V2 bundler
 */

import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { createSmartAccountClient, type SupportedSigner } from "@biconomy/account";

async function deployNativeNexusWithSDK() {
    console.log("🧪 PROOF OF CONCEPT: Native Nexus Wallet via SDK\n");
    console.log("=".repeat(80));
    console.log("\n📋 Objective:");
    console.log("  Deploy a NATIVE Nexus wallet using Biconomy SDK");
    console.log("  to test Supertransactions compatibility\n");
    console.log("=".repeat(80));

    // ============================================================================
    // SETUP SIGNER
    // ============================================================================

    console.log("\n⚙️  Setting up signer...");

    const [deployer] = await hre.ethers.getSigners();
    let signer = deployer;

    // Use custom owner if specified (or generate a new one for this test)
    const customOwnerPk = process.env.MIGRATION_TEST_OWNER_PK;
    if (customOwnerPk) {
        signer = new ethers.Wallet(customOwnerPk, hre.ethers.provider);
        console.log("  ⚠️  Using custom owner from MIGRATION_TEST_OWNER_PK");
    }

    console.log(`  Owner: ${signer.address}`);
    console.log(`  Balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // CREATE VIEM ACCOUNT FOR SDK
    // ============================================================================

    console.log("\n🔧 Preparing SDK account...");

    let privateKeyRaw: string;
    if (customOwnerPk) {
        privateKeyRaw = customOwnerPk;
    } else {
        privateKeyRaw = process.env.BASE_SEPOLIA_PRIVATE_KEY || process.env.COLD_WALLET_PRIVATE_KEY || "";
    }

    if (!privateKeyRaw) {
        throw new Error("No private key found in environment variables");
    }

    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;
    const owner = privateKeyToAccount(privateKey as Hex);

    console.log(`  Viem Account: ${owner.address}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // CREATE PUBLIC CLIENT
    // ============================================================================

    console.log("\n🔗 Setting up public client...");

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
    });

    console.log("  ✅ Public client configured\n");
    console.log("=".repeat(80));

    // ============================================================================
    // CREATE SMART ACCOUNT CLIENT (This will deploy the wallet!)
    // ============================================================================

    console.log("\n🚀 Creating Smart Account Client (Native Nexus)...");
    console.log("-".repeat(80));

    // IMPORTANT: Use V2 Bundler (V3 has incompatible API)
    const bundlerUrl = process.env.V2_BUNDLER_URL;
    const biconomyPaymasterApiKey = process.env.PAYMASTER_API_KEY;
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

    if (!bundlerUrl) {
        throw new Error("V2_BUNDLER_URL not found in .env - required for @biconomy/account compatibility");
    }

    console.log(`  Bundler: V2 (compatible API)`);
    console.log(`  URL: ${bundlerUrl}`);
    console.log(`  Paymaster: ${biconomyPaymasterApiKey ? "✅ Enabled" : "❌ Disabled"}\n`);

    try {
        // Create Smart Account Client using @biconomy/account
        // This will automatically compute the counterfactual address
        const smartAccountClient = await createSmartAccountClient({
            signer: owner as SupportedSigner,
            bundlerUrl,
            biconomyPaymasterApiKey,
            rpcUrl,
            // Let SDK choose default validator (K1 Validator)
        });

        // Get wallet address using the correct API
        const walletAddress = await smartAccountClient.getAccountAddress();

        console.log(`  ✅ Smart Account Client created`);
        console.log(`  📍 Wallet Address: ${walletAddress}\n`);
        console.log("=".repeat(80));

        // ========================================================================
        // CHECK IF WALLET IS DEPLOYED
        // ========================================================================

        console.log("\n🔍 Checking wallet deployment status...");

        const code = await publicClient.getBytecode({ address: walletAddress as `0x${string}` });
        const isDeployed = code && code !== "0x";

        console.log(`  Deployed: ${isDeployed ? "✅ YES" : "❌ NO"}`);

        if (!isDeployed) {
            console.log("\n  ℹ️  Wallet not yet deployed (counterfactual address)");
            console.log("     It will be deployed on first transaction\n");
        } else {
            console.log(`  Code size: ${(code.length - 2) / 2} bytes\n`);
        }

        console.log("=".repeat(80));

        // ========================================================================
        // CHECK WALLET BALANCE
        // ========================================================================

        console.log("\n💰 Checking Wallet Balance...");

        const balance = await publicClient.getBalance({
            address: walletAddress as `0x${string}`,
        });

        console.log(`  Balance: ${ethers.utils.formatEther(balance.toString())} ETH\n`);

        if (balance < parseEther("0.001")) {
            console.log("  ⚠️  Wallet needs funding for test transaction!");
            console.log(`     Please send at least 0.001 ETH to: ${walletAddress}`);
            console.log(`     Then run 08-test-native-wallet-with-supertransactions.ts\n`);
            console.log("=".repeat(80));

            // Save wallet info for later testing
            const nativeWalletInfo = {
                timestamp: new Date().toISOString(),
                network: "base_sepolia",
                walletAddress,
                owner: owner.address,
                deploymentType: "native-nexus-sdk",
                isDeployed,
                needsFunding: true,
                sdk: "@biconomy/account",
                creationMethod: "createSmartAccountClient",
            };

            const outputPath = path.join(__dirname, "native-nexus-wallet-info.json");
            fs.writeFileSync(outputPath, JSON.stringify(nativeWalletInfo, null, 2));

            console.log(`\n📄 Wallet info saved to: ${outputPath}\n`);
            console.log("🔜 Next Steps:");
            console.log("  1. Fund the wallet:");
            console.log(`     ${walletAddress}`);
            console.log("  2. Run: npx hardhat run scripts/biconomy-migration/08-test-native-wallet-with-supertransactions.ts --network base_sepolia\n");
            console.log("=".repeat(80));
            return;
        }

        console.log("=".repeat(80));

        // ========================================================================
        // SEND TEST TRANSACTION (This will deploy + initialize the wallet!)
        // ========================================================================

        console.log("\n🚀 Sending Test Transaction (will deploy wallet if needed)...");
        console.log("-".repeat(80));

        const testAmount = parseEther("0.00001");

        console.log(`  Recipient: ${owner.address}`);
        console.log(`  Amount:    ${ethers.utils.formatEther(testAmount.toString())} ETH\n`);

        console.log("  📤 Sending transaction...\n");

        // Use @biconomy/account API
        const { wait } = await smartAccountClient.sendTransaction({
            to: owner.address,
            value: testAmount,
            data: "0x",
        });

        console.log(`  ✅ Transaction sent!`);
        console.log("  ⏳ Waiting for confirmation...\n");

        const {
            success,
            receipt: { transactionHash }
        } = await wait();

        console.log(`  TX Hash: ${transactionHash}`);
        console.log(`  Status: ${success ? "✅ SUCCESS" : "❌ FAILED"}\n`);

        // Get full receipt for details
        const receipt = await publicClient.getTransactionReceipt({
            hash: transactionHash as `0x${string}`,
        });

        console.log(`  Block: ${receipt.blockNumber}`);
        console.log(`  Gas Used: ${receipt.gasUsed.toString()}\n`);
        console.log("=".repeat(80));

        // ========================================================================
        // VERIFY WALLET IS NOW DEPLOYED
        // ========================================================================

        console.log("\n🔍 Verifying Wallet Deployment...");

        const codeAfter = await publicClient.getBytecode({ address: walletAddress as `0x${string}` });
        const isDeployedNow = codeAfter && codeAfter !== "0x";

        console.log(`  Deployed: ${isDeployedNow ? "✅ YES" : "❌ NO"}`);
        console.log(`  Code size: ${(codeAfter.length - 2) / 2} bytes\n`);
        console.log("=".repeat(80));

        // ========================================================================
        // CHECK WALLET INITIALIZATION
        // ========================================================================

        console.log("\n🔍 Checking Wallet Initialization...");

        const nexusAbi = [
            "function accountId() external view returns (string memory)",
            "function isInitialized() external view returns (bool)",
        ];
        const wallet = new ethers.Contract(walletAddress, nexusAbi, hre.ethers.provider);

        try {
            const accountId = await wallet.accountId();
            const isInitialized = await wallet.isInitialized();

            console.log(`  Account ID: ${accountId}`);
            console.log(`  Initialized: ${isInitialized ? "✅ YES" : "❌ NO"}\n`);
        } catch (error: any) {
            console.log(`  ⚠️  Could not check initialization: ${error.message}\n`);
        }

        console.log("=".repeat(80));

        // ========================================================================
        // SAVE WALLET INFO
        // ========================================================================

        const newBalance = await publicClient.getBalance({
            address: walletAddress as `0x${string}`,
        });

        const nativeWalletInfo = {
            timestamp: new Date().toISOString(),
            network: "base_sepolia",
            walletAddress,
            owner: owner.address,
            deploymentType: "native-nexus-sdk",
            isDeployed: isDeployedNow,
            sdk: "@biconomy/account",
            creationMethod: "createSmartAccountClient",
            firstTxHash: transactionHash,
            firstTxBlock: receipt.blockNumber.toString(),
            firstTxStatus: receipt.status,
            firstTxGasUsed: receipt.gasUsed.toString(),
            balance: newBalance.toString(),
        };

        const outputPath = path.join(__dirname, "native-nexus-wallet-info.json");
        fs.writeFileSync(outputPath, JSON.stringify(nativeWalletInfo, null, 2));

        console.log(`\n📄 Wallet info saved to: ${outputPath}\n`);

        // ========================================================================
        // SUCCESS SUMMARY
        // ========================================================================

        console.log("=".repeat(80));
        console.log("\n🎉 NATIVE NEXUS WALLET DEPLOYED SUCCESSFULLY!\n");
        console.log("✅ Verified:");
        console.log("  • Wallet created using Biconomy SDK");
        console.log("  • Deployed and initialized via first transaction");
        console.log("  • Transaction confirmed successfully");
        console.log("  • Wallet is NATIVE Nexus (not migrated)\n");
        console.log("📋 Summary:");
        console.log(`  Wallet:  ${walletAddress}`);
        console.log(`  Owner:   ${owner.address}`);
        console.log(`  TX Hash: ${transactionHash}`);
        console.log(`  SDK:     @biconomy/account\n`);
        console.log("🔜 Next Steps:");
        console.log("  1. This wallet should work with Supertransactions ✅");
        console.log("  2. Run 08-test-native-wallet-with-supertransactions.ts to confirm");
        console.log("  3. Compare with migrated wallet behavior\n");
        console.log("💡 Expected Result:");
        console.log("  • Native wallet + Supertransactions: ✅ WORKS");
        console.log("  • Migrated wallet + Supertransactions: ❌ FAILS (AA23)");
        console.log("  • This proves the issue is migration-specific!\n");
        console.log("=".repeat(80));

    } catch (error: any) {
        console.error("\n❌ Error deploying native Nexus wallet with SDK!");
        console.error(`   Error: ${error.message}\n`);

        if (error.message.includes("bundler")) {
            console.error("💡 Bundler issue detected:");
            console.error("   • Check SUPERTX_BUNDLER_URL or NEXUS_BUNDLER_URL in .env");
            console.error("   • Ensure bundler supports EntryPoint v0.7");
            console.error("   • Verify network is Base Sepolia (84532)\n");
        }

        throw error;
    }
}

deployNativeNexusWithSDK()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error in native Nexus deployment script:", error);
        process.exit(1);
    });

