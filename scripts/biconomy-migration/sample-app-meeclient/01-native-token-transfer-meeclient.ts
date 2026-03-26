/**
 * 01-native-token-transfer-meeclient.ts
 * 
 * Native ETH transfer using MEE Client (createMeeClient).
 * 
 * MIGRATED FROM: sample-app/01-native-token-transfer.ts
 * IMPROVEMENTS:
 * - Uses MEE Client instead of legacy bundler/paymaster
 * - Gas sponsorship via Biconomy (automatic)
 * - Simplified API (no manual bundler/paymaster setup)
 * - Entry Point v0.7.0 compatible
 */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { createMeeClient, toMultichainNexusAccount, getMEEVersion, MEEVersion } from "@biconomy/abstractjs";

async function nativeTokenTransferMeeClient() {
    console.log("🧪 Native ETH Transfer - MEE Client\n");
    console.log("=".repeat(80));
    console.log("📋 Network: Base Mainnet (8453)");
    console.log("📋 API: createMeeClient() + toMultichainNexusAccount()");
    console.log("📋 Sponsorship: Biconomy hosted\n");
    console.log("=".repeat(80));

    // ============================================================================
    // WALLET INFO
    // ============================================================================

    const walletAddress = "0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6" as `0x${string}`;
    const ownerAddress = "0xeDC117090236293afEBb179260e8B9dd5bffe4dC" as `0x${string}`;

    console.log("\n📋 Migrated Wallet:");
    console.log("-".repeat(80));
    console.log(`  Address: ${walletAddress}`);
    console.log(`  Owner:   ${ownerAddress}`);
    console.log(`  Type:    Passport → Nexus (migrated)\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // SETUP SIGNER
    // ============================================================================

    console.log("\n⚙️  Setting up signer...");

    const privateKeyRaw = process.env.MIGRATION_TEST_OWNER_PK;

    if (!privateKeyRaw) {
        throw new Error("MIGRATION_TEST_OWNER_PK not found in .env");
    }

    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;
    const viemAccount = privateKeyToAccount(privateKey as Hex);

    console.log(`  Owner EOA: ${viemAccount.address}`);

    if (viemAccount.address.toLowerCase() !== ownerAddress.toLowerCase()) {
        throw new Error(
            `Signer mismatch! Expected ${ownerAddress}, got ${viemAccount.address}`
        );
    }

    console.log("  ✅ Signer configured\n");
    console.log("=".repeat(80));

    // ============================================================================
    // SETUP PUBLIC CLIENT
    // ============================================================================

    console.log("\n🔗 Setting up public client...");

    const rpcUrl = process.env.BASE_MAINNET_ENDPOINT || "https://mainnet.base.org";

    const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
    });

    console.log("  ✅ Public client configured\n");
    console.log("=".repeat(80));

    // ============================================================================
    // CHECK WALLET BALANCE
    // ============================================================================

    console.log("\n💰 Checking Wallet Balance...");

    const balance = await publicClient.getBalance({
        address: walletAddress,
    });

    console.log(`  Balance: ${ethers.utils.formatEther(balance.toString())} ETH\n`);

    if (balance < parseEther("0.00002")) {
        throw new Error("Insufficient balance in wallet");
    }

    console.log("=".repeat(80));

    // ============================================================================
    // CREATE MEE CLIENT
    // ============================================================================

    console.log("\n🚀 Creating MEE Client...");

    const apiKey = process.env.SUPERTX_API_KEY;
    if (!apiKey) {
        throw new Error("SUPERTX_API_KEY not found in .env");
    }

    console.log(`  API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`  Chain: Base Mainnet (${base.id})`);
    console.log(`  Account: ${walletAddress}\n`);

    try {
        // Create Nexus account
        const nexusAccount = await toMultichainNexusAccount({
            signer: viemAccount,
            chainConfigurations: [{
                chain: base,
                transport: http(rpcUrl),
                version: getMEEVersion(MEEVersion.V2_1_0),
            }],
            accountAddress: walletAddress,
        });

        console.log("  ✅ Multichain Nexus Account created");

        // Create MEE Client
        const meeClient = await createMeeClient({
            account: nexusAccount,
            apiKey: apiKey,
        });

        console.log("  ✅ MEE Client created\n");
        console.log("=".repeat(80));

        // ========================================================================
        // SEND NATIVE ETH TRANSFER
        // ========================================================================

        console.log("\n🚀 Sending Native ETH Transfer...");

        const testAmount = parseEther("0.00001");
        const recipientAddress = "0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B" as `0x${string}`; // Native Nexus wallet

        console.log(`  From:      ${walletAddress}`);
        console.log(`  To:        ${recipientAddress}`);
        console.log(`  Amount:    ${ethers.utils.formatEther(testAmount.toString())} ETH`);
        console.log(`  Sponsored: YES (Biconomy)\n`);

        console.log("  📋 Building quote with gas sponsorship...");

        const quote = await meeClient.getQuote({
            sponsorship: true,
            instructions: [
                {
                    calls: [
                        {
                            to: recipientAddress,
                            value: testAmount,
                        },
                    ],
                    chainId: base.id,
                },
            ],
        });

        console.log("  ✅ Quote received!\n");

        console.log("  🖊️  Signing quote...");
        const signedQuote = await meeClient.signQuote({ quote });
        console.log("  ✅ Quote signed!\n");

        console.log("  📤 Executing signed quote...");
        const result = await meeClient.executeSignedQuote({ signedQuote });
        const hash = result.hash;

        console.log(`  ✅ Transaction submitted!`);
        console.log(`  Supertransaction Hash: ${hash}\n`);

        console.log("  ⏳ Waiting for confirmation...\n");

        const receipt = await meeClient.waitForSupertransactionReceipt({ hash: hash as `0x${string}` });

        const isSuccess = receipt.transactionStatus === "MINED_SUCCESS" ||
            (receipt.userOps && receipt.userOps.every((op: any) =>
                op.executionStatus === "MINED_SUCCESS"
            ));

        console.log(`  Status: ${isSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
        console.log(`  Transaction Status: ${receipt.transactionStatus || "N/A"}\n`);

        // Show UserOp details
        if (receipt.userOps && receipt.userOps.length > 0) {
            console.log(`  📊 UserOps executed: ${receipt.userOps.length}`);
            receipt.userOps.forEach((op: any, idx: number) => {
                console.log(`    UserOp #${idx + 1}:`);
                console.log(`      Execution Status: ${op.executionStatus || "N/A"}`);
                console.log(`      TX Hash: ${op.executionData || "N/A"}`);
            });
            console.log();
        }

        // Show explorer links
        if (receipt.explorerLinks && receipt.explorerLinks.length > 0) {
            console.log(`  🔗 Explorer Links:`);
            receipt.explorerLinks.forEach((link: string) => {
                console.log(`    ${link}`);
            });
            console.log();
        }

        console.log("=".repeat(80));

        // ========================================================================
        // SAVE RESULT
        // ========================================================================

        const resultData = {
            timestamp: new Date().toISOString(),
            network: "base-mainnet",
            chainId: base.id,
            wallet: walletAddress,
            owner: ownerAddress,
            type: "native-token-transfer",
            supertxHash: hash,
            success: isSuccess,
            transactionStatus: receipt.transactionStatus,
            userOpsCount: receipt.userOps?.length || 0,
            blockchainTxHashes: receipt.receipts?.map((r: any) => r.transactionHash) || [],
            explorerLinks: receipt.explorerLinks || [],
            sponsored: true,
            testAmount: testAmount.toString(),
            recipient: recipientAddress,
        };

        const resultPath = path.join(__dirname, "01-result.json");
        fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));

        console.log(`\n📄 Result saved to: ${resultPath}\n`);

        console.log("=".repeat(80));
        if (isSuccess) {
            console.log("\n🎉 NATIVE ETH TRANSFER: SUCCESS!\n");
            console.log("✅ MEE Client works perfectly!");
            console.log("✅ Gas sponsorship working");
            console.log("✅ UserOps confirmed on-chain");
            console.log(`✅ Supertransaction: ${hash}\n`);
        } else {
            console.log("\n⚠️  NATIVE ETH TRANSFER: NEEDS INVESTIGATION\n");
        }
        console.log("=".repeat(80));

    } catch (error: any) {
        console.log("\n❌ Test Failed!");
        console.log(`   Error: ${error.message}\n`);
        console.log("=".repeat(80));
        throw error;
    }
}

nativeTokenTransferMeeClient()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test Failed!");
        console.error(`   Error: ${error.message}\n`);
        process.exit(1);
    });

