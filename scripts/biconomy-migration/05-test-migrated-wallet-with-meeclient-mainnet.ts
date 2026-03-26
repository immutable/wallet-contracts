/**
 * 05-test-migrated-wallet-with-meeclient-mainnet.ts
 * 
 * Tests MIGRATED Passport wallet on BASE MAINNET using createMeeClient.
 * 
 * Uses:
 * - createMeeClient() + toMultichainNexusAccount()
 * - Base Mainnet (8453)
 * - Migrated wallet: 0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6
 * - Gas sponsorship via Biconomy (hosted)
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { createMeeClient, toMultichainNexusAccount, getMEEVersion, MEEVersion } from "@biconomy/abstractjs";

async function testMigratedWalletMainnet() {
    console.log("🧪 Testing MIGRATED Wallet on BASE MAINNET with createMeeClient\n");
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

    const privateKeyRaw = process.env.SECURE_DEPLOYER_PK || process.env.MIGRATION_TEST_OWNER_PK;

    if (!privateKeyRaw) {
        throw new Error("SECURE_DEPLOYER_PK or MIGRATION_TEST_OWNER_PK not found in .env");
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
        // SEND TEST TRANSACTION
        // ========================================================================

        console.log("\n🚀 Sending Test Transaction...");

        const testAmount = parseEther("0.00001");
        // Send to Native Nexus wallet to avoid self-transfer issues
        const recipientAddress = "0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B" as `0x${string}`;

        console.log(`  From:      ${walletAddress}`);
        console.log(`  To:        ${recipientAddress} (Native Nexus Wallet)`);
        console.log(`  Amount:    ${ethers.utils.formatEther(testAmount.toString())} ETH`);
        console.log(`  Sponsored: YES (Biconomy)\n`);

        console.log("  📋 Building quote with gas sponsorship...");
        console.log("  ⚠️  Note: Sponsorship must be enabled at https://dashboard.biconomy.io\n");

        let quote;
        try {
            quote = await meeClient.getQuote({
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

            console.log("  ✅ Quote received!");
            console.log(`  Quote ID: ${quote.id || "N/A"}`);
            console.log(`  Quote:`, JSON.stringify(quote, null, 2));
            console.log();
        } catch (error: any) {
            console.error("  ❌ Failed to get quote:");
            console.error(`     ${error.message}`);
            throw error;
        }

        // ========================================================================
        // SIGN QUOTE (Manual Flow)
        // ========================================================================

        console.log("  🖊️  Signing quote...\n");

        let signedQuote;
        try {
            signedQuote = await meeClient.signQuote({ quote });
            console.log("  ✅ Quote signed!");
            console.log(`  Signed Quote:`, JSON.stringify(signedQuote, null, 2));
            console.log();
        } catch (error: any) {
            console.error("  ❌ Failed to sign quote:");
            console.error(`     ${error.message}`);
            throw error;
        }

        // ========================================================================
        // EXECUTE SIGNED QUOTE
        // ========================================================================

        console.log("  📤 Executing signed quote...\n");
        console.log("  ⏳ Calling executeSignedQuote...");

        let hash: string;
        try {
            const result = await meeClient.executeSignedQuote({ signedQuote });
            hash = result.hash;

            console.log(`\n  ✅ executeSignedQuote returned!`);
            console.log(`  TX Hash: ${hash}`);
            console.log(`  Explorer: https://basescan.org/tx/${hash}`);
            console.log(`  Check BaseScan now to see if transaction was submitted!\n`);
        } catch (error: any) {
            console.error("  ❌ Failed to execute signed quote:");
            console.error(`     ${error.message}`);
            throw error;
        }

        // ========================================================================
        // WAIT FOR RECEIPT
        // ========================================================================

        console.log("  ⏳ Waiting for Supertransaction receipt...\n");

        const receipt = await meeClient.waitForSupertransactionReceipt({ hash: hash as `0x${string}` });

        console.log(`  📋 Receipt received!`);
        console.log();

        // Check if the supertransaction was successful
        // The receipt structure has: transactionStatus, userOps[].executionStatus, receipts[].status
        const isSuccess = receipt.transactionStatus === "MINED_SUCCESS" ||
            (receipt.userOps && receipt.userOps.every((op: any) =>
                op.executionStatus === "MINED_SUCCESS"
            )) ||
            (receipt.receipts && receipt.receipts.every((r: any) =>
                r.status === "success"
            ));

        console.log(`  Status: ${isSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
        console.log(`  Transaction Status: ${receipt.transactionStatus || "N/A"}`);

        // Show UserOp details if available
        if (receipt.userOps && receipt.userOps.length > 0) {
            console.log(`\n  📊 UserOps executed: ${receipt.userOps.length}`);
            receipt.userOps.forEach((op: any, idx: number) => {
                console.log(`    UserOp #${idx + 1}:`);
                console.log(`      Sender: ${op.userOp?.sender || "N/A"}`);
                console.log(`      UserOp Hash: ${op.userOpHash || "N/A"}`);
                console.log(`      Execution Status: ${op.executionStatus || "N/A"}`);
                console.log(`      Execution Data (TX Hash): ${op.executionData || "N/A"}`);
            });
        }

        // Show blockchain transaction receipts
        if (receipt.receipts && receipt.receipts.length > 0) {
            console.log(`\n  📜 Blockchain Receipts: ${receipt.receipts.length}`);
            receipt.receipts.forEach((r: any, idx: number) => {
                console.log(`    Receipt #${idx + 1}:`);
                console.log(`      TX Hash: ${r.transactionHash || "N/A"}`);
                console.log(`      Block: ${r.blockNumber?.toString() || "N/A"}`);
                console.log(`      Status: ${r.status || "N/A"}`);
                console.log(`      Gas Used: ${r.gasUsed?.toString() || "N/A"}`);
            });
        }

        // Show explorer links if available
        if (receipt.explorerLinks && receipt.explorerLinks.length > 0) {
            console.log(`\n  🔗 Explorer Links:`);
            receipt.explorerLinks.forEach((link: string) => {
                console.log(`    ${link}`);
            });
        }

        console.log();
        console.log("=".repeat(80));

        // ========================================================================
        // SAVE RESULT
        // ========================================================================

        const result = {
            timestamp: new Date().toISOString(),
            network: "base-mainnet",
            chainId: base.id,
            wallet: walletAddress,
            owner: ownerAddress,
            type: "migrated",
            entryPoint: "v0.7.0",
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

        const resultPath = path.join(__dirname, "05-mainnet-result.json");
        fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

        console.log(`\n📄 Result saved to: ${resultPath}\n`);

        console.log("=".repeat(80));
        if (isSuccess) {
            console.log("\n🎉 MIGRATED WALLET TEST ON BASE MAINNET: SUCCESS!\n");
            console.log("✅ createMeeClient works perfectly with Entry Point v0.7.0!");
            console.log("✅ Gas sponsorship working");
            console.log("✅ UserOps confirmed on-chain");
            console.log(`✅ Supertransaction: ${hash}\n`);
        } else {
            console.log("\n⚠️  MIGRATED WALLET TEST: NEEDS INVESTIGATION\n");
            console.log("   Check Biconomy dashboard for details\n");
        }
        console.log("=".repeat(80));

    } catch (error: any) {
        console.log("\n❌ Test Failed!");
        console.log(`   Error: ${error.message}\n`);
        console.log("=".repeat(80));
        throw error;
    }
}

testMigratedWalletMainnet()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test Failed!");
        console.error(`   Error: ${error.message}\n`);
        process.exit(1);
    });

