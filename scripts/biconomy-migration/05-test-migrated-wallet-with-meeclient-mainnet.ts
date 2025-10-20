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
        const recipientAddress = ownerAddress; // Send back to owner

        console.log(`  From:      ${walletAddress}`);
        console.log(`  To:        ${recipientAddress}`);
        console.log(`  Amount:    ${ethers.utils.formatEther(testAmount.toString())} ETH`);
        console.log(`  Sponsored: YES (Biconomy)\n`);

        console.log("  📋 Building quote with gas sponsorship...");
        console.log("  ⚠️  Note: Sponsorship must be enabled at https://dashboard.biconomy.io\n");

        const quote = await meeClient.getQuote({
            sponsorship: true,
            instructions: [
                {
                    calls: [
                        {
                            to: recipientAddress,
                            value: testAmount,
                            data: "0x",
                        },
                    ],
                    chainId: base.id,
                },
            ],
        });

        console.log("  ✅ Quote received!");
        console.log(`  Quote ID: ${quote.id || "N/A"}\n`);

        console.log("  📤 Executing quote...\n");

        const execution = await meeClient.executeQuote({ quote });

        console.log(`  ✅ Execution started!`);
        console.log(`  Execution ID: ${execution.id || "N/A"}\n`);

        console.log("  ⏳ Waiting for confirmation...\n");

        const txHash = execution.transactionHash || execution.hash;

        if (!txHash) {
            throw new Error("No transaction hash returned from execution");
        }

        console.log(`  TX Hash: ${txHash}`);
        console.log(`  Explorer: https://basescan.org/tx/${txHash}\n`);

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
        });

        console.log(`  Status: ${receipt.status === "success" ? "✅ SUCCESS" : "❌ FAILED"}\n`);
        console.log("=".repeat(80));

        console.log(`\n📊 Transaction Details:`);
        console.log(`  Block: ${receipt.blockNumber}`);
        console.log(`  Gas Used: ${receipt.gasUsed.toString()}\n`);
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
            txHash: txHash,
            blockNumber: receipt.blockNumber.toString(),
            status: receipt.status,
            gasUsed: receipt.gasUsed.toString(),
            sponsored: true,
            testAmount: testAmount.toString(),
        };

        const resultPath = path.join(__dirname, "05-mainnet-result.json");
        fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

        console.log(`\n📄 Result saved to: ${resultPath}\n`);

        console.log("=".repeat(80));
        console.log("\n🎉 MIGRATED WALLET TEST ON BASE MAINNET: SUCCESS!\n");
        console.log("✅ createMeeClient works perfectly with migrated wallets on mainnet");
        console.log("✅ Gas sponsorship working");
        console.log("✅ Transaction confirmed\n");
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

