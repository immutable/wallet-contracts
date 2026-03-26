/**
 * 04-invisible-signing.ts
 * 
 * Sample App - Scenario 4: Invisible Signing
 * 
 * Demonstrates "invisible signing" - executing transactions without requiring
 * user interaction for each operation. This is achieved through:
 * - Smart account abstraction (Nexus wallet)
 * - Pre-authorized owner key
 * - Automated transaction signing via AbstractJS
 * 
 * Use cases:
 * - Backend automation
 * - Batch operations
 * - Scheduled transactions
 * - Gasless UX (users don't see wallet popups)
 * 
 * REFACTORED: Now uses helper utilities for cleaner code
 */

import { parseEther } from "viem";
import config from "./config.json";
import {
    loadMigratedWallet,
    printWalletInfo,
    loadOwnerAccount,
    validateOwner,
    createBaseSepoliaClient,
    createNexusClients,
    checkBalance,
    ensureSufficientBalance,
    waitForUserOp,
    saveTestResult,
    printSeparator,
    printSection,
    formatDuration,
    getExplorerUrl,
    printTestSummary,
    getRequiredEnv,
} from "./utils";

interface TransactionRecord {
    index: number;
    userOpHash: string;
    txHash: string;
    amount: string;
    duration: string;
    success: boolean;
}

async function invisibleSigning() {
    console.log("🧪 Sample App - Scenario 4: Invisible Signing\n");
    printSeparator();

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const { network } = config;

    console.log("\n📋 Configuration:");
    console.log(`  Network: ${network.name} (${network.chainId})`);
    console.log(`  Concept: Invisible signing (no user prompts)\n`);

    console.log("💡 What is Invisible Signing?");
    console.log("  ✅ Transactions signed programmatically");
    console.log("  ✅ No wallet popup or user interaction");
    console.log("  ✅ Perfect for backend automation");
    console.log("  ✅ Owner key pre-authorized in smart account\n");
    printSeparator();

    // ============================================================================
    // LOAD WALLET & OWNER
    // ============================================================================

    printSection("STEP 1: Load Migrated Wallet");

    const wallet = loadMigratedWallet();
    printWalletInfo(wallet);

    const owner = loadOwnerAccount();
    console.log(`  Owner Signer: ${owner.address}`);
    console.log(`  ✅ Signer configured (no user interaction required)\n`);

    validateOwner(owner.address, wallet.owner);
    console.log("  ✅ Owner validation passed\n");
    printSeparator();

    // ============================================================================
    // CREATE CLIENTS
    // ============================================================================

    printSection("STEP 2: Create Blockchain Clients");

    const publicClient = createBaseSepoliaClient();
    console.log("  ✅ Public client created\n");

    const bundlerUrl = getRequiredEnv("NEXUS_BUNDLER_URL");
    // IMPORTANT: Don't use paymaster for already-deployed wallets!
    const paymasterApiKey = undefined; // Disabled for migrated wallets

    const clients = await createNexusClients({
        owner,
        walletAddress: wallet.walletAddress,
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || network.rpcUrl,
        bundlerUrl,
        paymasterApiKey,
    });

    printSeparator();

    // ============================================================================
    // CHECK INITIAL BALANCE
    // ============================================================================

    printSection("STEP 3: Check Initial Balance");

    const initialBalance = await checkBalance(
        publicClient,
        wallet.walletAddress,
        "Initial Balance"
    );

    console.log();
    await ensureSufficientBalance(publicClient, wallet.walletAddress);
    console.log("  ✅ Sufficient balance confirmed\n");
    printSeparator();

    // ============================================================================
    // EXECUTE MULTIPLE TRANSACTIONS (INVISIBLY)
    // ============================================================================

    printSection("STEP 4: Execute Multiple Transactions (Invisible Signing)");

    const recipient = owner.address;
    const transactionCount = 3;
    const transactions: TransactionRecord[] = [];

    console.log(`  🔄 Executing ${transactionCount} transactions without user prompts...\n`);

    for (let i = 1; i <= transactionCount; i++) {
        console.log(`  ┌─ Transaction ${i}/${transactionCount}`);

        const amount = parseEther("0.00001"); // 0.00001 ETH each

        console.log(`  │  From:   ${wallet.walletAddress}`);
        console.log(`  │  To:     ${recipient}`);
        console.log(`  │  Amount: 0.00001 ETH`);
        console.log(`  │  📤 Sending UserOperation (no popup)...`);

        const startTime = Date.now();

        // Send UserOperation (INVISIBLY - no user prompt!)
        const userOpHash = await clients.bundlerClient.sendUserOperation({
            calls: [
                {
                    to: recipient,
                    value: amount,
                    data: "0x",
                },
            ],
        });

        console.log(`  │  ✅ UserOp: ${userOpHash.substring(0, 20)}...`);
        console.log(`  │  ⏳ Waiting...`);

        // Wait for transaction
        const receipt = await clients.bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        });

        const endTime = Date.now();
        const duration = formatDuration(startTime, endTime);

        console.log(`  │  ✅ Confirmed! (${duration})`);
        console.log(`  │  TX: ${receipt.receipt.transactionHash.substring(0, 20)}...`);
        console.log(`  └─ Status: ${receipt.success ? "✅ SUCCESS" : "❌ FAILED"}\n`);

        transactions.push({
            index: i,
            userOpHash,
            txHash: receipt.receipt.transactionHash,
            amount: "0.00001 ETH",
            duration,
            success: receipt.success,
        });
    }

    printSeparator();

    // ============================================================================
    // CHECK FINAL BALANCE
    // ============================================================================

    printSection("STEP 5: Verify Final Balance");

    const finalBalance = await checkBalance(
        publicClient,
        wallet.walletAddress,
        "Final Balance"
    );

    const spent = initialBalance - finalBalance;
    console.log(`  Spent:   ${(Number(spent) / 1e18).toFixed(6)} ETH`);
    console.log(`  (${transactionCount} transactions + gas fees)\n`);
    printSeparator();

    // ============================================================================
    // SUMMARY
    // ============================================================================

    printSection("📊 Invisible Signing Summary");

    const successCount = transactions.filter(tx => tx.success).length;
    const totalDuration = transactions.reduce((sum, tx) => sum + parseFloat(tx.duration), 0);

    console.log(`  Total Transactions: ${transactionCount}`);
    console.log(`  Successful:         ${successCount}`);
    console.log(`  Failed:             ${transactionCount - successCount}`);
    console.log(`  Total Time:         ${totalDuration.toFixed(2)}s`);
    console.log(`  Avg per TX:         ${(totalDuration / transactionCount).toFixed(2)}s`);
    console.log(`  User Prompts:       0 (fully automated!) 🎯\n`);

    console.log("  🌟 Key Benefits:");
    console.log("    ✅ No wallet popups");
    console.log("    ✅ Backend automation ready");
    console.log("    ✅ Batch operations supported");
    console.log("    ✅ Seamless user experience\n");

    printSeparator();

    // ============================================================================
    // SAVE RESULT & SUMMARY
    // ============================================================================

    const result = {
        scenario: "Invisible Signing",
        timestamp: new Date().toISOString(),
        wallet: wallet.walletAddress,
        transactionCount: transactionCount,
        successCount: successCount,
        userPrompts: 0,
        transactions: transactions.map(tx => ({
            ...tx,
            explorer: getExplorerUrl(tx.txHash, network.chainId),
        })),
        totalTime: `${totalDuration.toFixed(2)}s`,
        averageTime: `${(totalDuration / transactionCount).toFixed(2)}s`,
    };

    saveTestResult("04-result.json", result);

    printTestSummary("Invisible Signing", successCount === transactionCount, {
        "Transactions": `${successCount}/${transactionCount} successful`,
        "Total Time": `${totalDuration.toFixed(2)}s`,
        "User Prompts": "0 (fully automated)",
        "Note": "All transactions executed without user interaction!",
    });
}

invisibleSigning()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error.message || error);
        process.exit(1);
    });
