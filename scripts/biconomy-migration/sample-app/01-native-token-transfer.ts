/**
 * 01-native-token-transfer.ts
 * 
 * Sample App - Scenario 1: Native Token Transfer (ETH)
 * 
 * Demonstrates how to send native ETH from a migrated Nexus wallet using:
 * - Biconomy AbstractJS SDK
 * - ERC-4337 UserOperations
 * - Optional gas sponsorship via paymaster
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
    getExplorerUrl,
    printTestSummary,
    getRequiredEnv,
} from "./utils";

async function nativeTokenTransfer() {
    console.log("🧪 Sample App - Scenario 1: Native Token Transfer\n");
    printSeparator();

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const { network } = config;

    console.log("\n📋 Configuration:");
    console.log(`  Network: ${network.name} (${network.chainId})`);
    console.log(`  Scenario: Native ETH Transfer`);
    console.log(`  Gas Sponsorship: ${process.env.PAYMASTER_API_KEY ? "✅ Enabled" : "❌ Disabled"}\n`);
    printSeparator();

    // ============================================================================
    // LOAD WALLET & OWNER
    // ============================================================================

    printSection("STEP 1: Load Migrated Wallet");

    const wallet = loadMigratedWallet();
    printWalletInfo(wallet);

    const owner = loadOwnerAccount();
    console.log(`  Owner Signer: ${owner.address}\n`);

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
    // NOTE: Paymaster not needed for this test (no gas sponsorship required)
    // See script 05 for gas sponsorship example
    const paymasterApiKey = undefined; // Disabled - not using gas sponsorship

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
    // SEND NATIVE TOKEN (ETH)
    // ============================================================================

    printSection("STEP 4: Send Native Token Transfer");

    const recipient = owner.address; // Send back to owner for testing
    const amount = parseEther("0.00001"); // 0.00001 ETH

    console.log("  Transaction Details:");
    console.log(`    From:   ${wallet.walletAddress}`);
    console.log(`    To:     ${recipient}`);
    console.log(`    Amount: 0.00001 ETH\n`);

    console.log("  📤 Sending UserOperation...\n");

    const startTime = Date.now();

    // Send UserOperation
    const userOpHash = await clients.bundlerClient.sendUserOperation({
        calls: [
            {
                to: recipient,
                value: amount,
                data: "0x",
            },
        ],
    });

    // Wait for transaction
    const receipt = await waitForUserOp(
        clients.bundlerClient,
        userOpHash,
        "ETH Transfer"
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

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
    console.log(`  Spent:   ${(Number(spent) / 1e18).toFixed(6)} ETH\n`);
    printSeparator();

    // ============================================================================
    // SAVE RESULT & SUMMARY
    // ============================================================================

    const result = {
        scenario: "Native Token Transfer",
        timestamp: new Date().toISOString(),
        wallet: wallet.walletAddress,
        recipient: recipient,
        amount: "0.00001 ETH",
        userOpHash: userOpHash,
        txHash: receipt.receipt.transactionHash,
        success: receipt.success,
        duration: `${duration}s`,
        explorer: getExplorerUrl(receipt.receipt.transactionHash, network.chainId),
    };

    saveTestResult("01-result.json", result);

    printTestSummary("Native Token Transfer", receipt.success, {
        "Duration": `${duration}s`,
        "TX Hash": receipt.receipt.transactionHash,
        "Explorer": result.explorer,
    });
}

nativeTokenTransfer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error.message || error);
        process.exit(1);
    });
