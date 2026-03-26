/**
 * 05-gas-sponsorship.ts
 * 
 * Sample App - Scenario 5: Gas Sponsorship
 * 
 * Demonstrates gas sponsorship where the application pays for users' transaction costs:
 * - Biconomy Paymaster integration
 * - Users don't need native tokens (ETH)
 * - Fully gasless experience
 * - Perfect for onboarding new users
 * 
 * NOTE: Requires PAYMASTER_API_KEY in .env and funded paymaster account
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
    waitForUserOp,
    saveTestResult,
    printSeparator,
    printSection,
    formatDuration,
    getExplorerUrl,
    printTestSummary,
    getRequiredEnv,
} from "./utils";

async function gasSponsorship() {
    console.log("🧪 Sample App - Scenario 5: Gas Sponsorship\n");
    printSeparator();

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const { network, paymaster } = config;

    console.log("\n📋 Configuration:");
    console.log(`  Network: ${network.name} (${network.chainId})`);
    console.log(`  Paymaster: ${paymaster.gasTank.address}\n`);

    console.log("💡 What is Gas Sponsorship?");
    console.log("  ✅ Application pays for users' gas fees");
    console.log("  ✅ Users don't need native tokens (ETH)");
    console.log("  ✅ Fully gasless experience");
    console.log("  ✅ Perfect for Web2-like onboarding\n");

    const paymasterApiKey = process.env.PAYMASTER_API_KEY;
    if (!paymasterApiKey) {
        console.log("  ⚠️  WARNING: PAYMASTER_API_KEY not found in .env!");
        console.log("  Gas sponsorship will be DISABLED.");
        console.log("  User wallet will pay its own gas.\n");
    } else {
        console.log("  ✅ Paymaster configured - gas sponsorship ENABLED\n");
    }

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

    const clients = await createNexusClients({
        owner,
        walletAddress: wallet.walletAddress,
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || network.rpcUrl,
        bundlerUrl,
        paymasterApiKey, // This enables gas sponsorship if set
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
    if (paymasterApiKey) {
        console.log("  💡 With gas sponsorship enabled:");
        console.log("    - User doesn't need ETH for gas fees");
        console.log("    - Paymaster covers all transaction costs");
        console.log("    - Perfect for new users with empty wallets\n");
    } else {
        console.log("  💡 Without gas sponsorship:");
        console.log("    - User wallet will pay for its own gas");
        console.log("    - ETH balance will decrease by gas cost\n");
    }

    printSeparator();

    // ============================================================================
    // SEND SPONSORED TRANSACTION
    // ============================================================================

    printSection("STEP 4: Send Sponsored Transaction");

    const recipient = owner.address;
    const amount = parseEther("0.00001"); // 0.00001 ETH

    console.log("  Transaction Details:");
    console.log(`    From:   ${wallet.walletAddress}`);
    console.log(`    To:     ${recipient}`);
    console.log(`    Amount: 0.00001 ETH`);
    console.log(`    Gas:    ${paymasterApiKey ? "✅ Sponsored by paymaster" : "❌ Paid by user"}\n`);

    console.log("  📤 Sending UserOperation...\n");

    const startTime = Date.now();

    // Send UserOperation (paymaster automatically used if configured)
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
        "Sponsored Transfer"
    );

    const endTime = Date.now();
    const duration = formatDuration(startTime, endTime);

    printSeparator();

    // ============================================================================
    // CHECK FINAL BALANCE & ANALYZE GAS
    // ============================================================================

    printSection("STEP 5: Verify Final Balance & Gas Analysis");

    const finalBalance = await checkBalance(
        publicClient,
        wallet.walletAddress,
        "Final Balance"
    );

    const balanceChange = initialBalance - finalBalance;
    const transferAmount = parseFloat("0.00001");
    const totalSpent = parseFloat((Number(balanceChange) / 1e18).toFixed(6));
    const gasSpent = totalSpent - transferAmount;

    console.log(`  Change:  -${totalSpent.toFixed(6)} ETH\n`);

    console.log("  💡 Cost Breakdown:");
    console.log(`    Transfer Amount: ${transferAmount.toFixed(6)} ETH`);
    console.log(`    Gas Cost:        ${gasSpent.toFixed(6)} ETH`);

    if (paymasterApiKey) {
        console.log(`    \n    ✅ Gas was sponsored by paymaster!`);
        console.log(`    ✅ User only paid for the transfer (${transferAmount.toFixed(6)} ETH)`);
        console.log(`    ✅ App covered the gas cost (~${gasSpent.toFixed(6)} ETH)\n`);
    } else {
        console.log(`    \n    ⚠️  User paid for both transfer AND gas`);
        console.log(`    Total cost to user: ${totalSpent.toFixed(6)} ETH\n`);
    }

    printSeparator();

    // ============================================================================
    // SPONSORSHIP BENEFITS SUMMARY
    // ============================================================================

    if (paymasterApiKey) {
        printSection("🎯 Gas Sponsorship Benefits");

        console.log("  For Users:");
        console.log("    ✅ No need to buy/bridge native tokens");
        console.log("    ✅ Can transact with empty wallets");
        console.log("    ✅ Web2-like experience (no gas complexity)");
        console.log("    ✅ Faster onboarding\n");

        console.log("  For Applications:");
        console.log("    ✅ Higher conversion rates");
        console.log("    ✅ Better user retention");
        console.log("    ✅ Predictable costs");
        console.log("    ✅ Competitive advantage\n");

        console.log("  Technical:");
        console.log("    ✅ ERC-4337 compliant");
        console.log("    ✅ Works with any UserOperation");
        console.log("    ✅ Configurable spending limits");
        console.log("    ✅ Easy integration\n");

        printSeparator();
    }

    // ============================================================================
    // SAVE RESULT & SUMMARY
    // ============================================================================

    const result = {
        scenario: "Gas Sponsorship",
        timestamp: new Date().toISOString(),
        wallet: wallet.walletAddress,
        recipient: recipient,
        amount: "0.00001 ETH",
        gasSponsorship: {
            enabled: !!paymasterApiKey,
            paymasterUsed: !!paymasterApiKey,
            gasCostSponsoredByApp: paymasterApiKey ? `~${gasSpent.toFixed(6)} ETH` : "0 ETH",
        },
        balanceChange: {
            initial: (Number(initialBalance) / 1e18).toFixed(6) + " ETH",
            final: (Number(finalBalance) / 1e18).toFixed(6) + " ETH",
            spent: totalSpent.toFixed(6) + " ETH",
        },
        userOpHash: userOpHash,
        txHash: receipt.receipt.transactionHash,
        success: receipt.success,
        duration: duration,
        explorer: getExplorerUrl(receipt.receipt.transactionHash, network.chainId),
    };

    saveTestResult("05-result.json", result);

    printTestSummary("Gas Sponsorship", receipt.success, {
        "Sponsorship": paymasterApiKey ? "✅ ENABLED" : "❌ DISABLED",
        "Duration": duration,
        "Gas Paid By": paymasterApiKey ? "Application (Paymaster)" : "User Wallet",
        "TX Hash": receipt.receipt.transactionHash,
        "Explorer": result.explorer,
    });
}

gasSponsorship()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error.message || error);
        process.exit(1);
    });
