/**
 * 02-erc20-transfer.ts
 * 
 * Sample App - Scenario 2: ERC20 Token Transfer
 * 
 * Demonstrates how to transfer ERC20 tokens (e.g., USDC) from a migrated Nexus wallet using:
 * - Biconomy AbstractJS SDK
 * - ERC20 transfer() function call
 * - Optional gas sponsorship via paymaster
 * 
 * REFACTORED: Now uses helper utilities for cleaner code
 */

import { encodeFunctionData, parseUnits } from "viem";
import config from "./config.json";
import {
    loadMigratedWallet,
    printWalletInfo,
    loadOwnerAccount,
    validateOwner,
    createBaseSepoliaClient,
    createNexusClients,
    waitForUserOp,
    saveTestResult,
    printSeparator,
    printSection,
    getExplorerUrl,
    printTestSummary,
    getRequiredEnv,
} from "./utils";

// ERC20 ABI (minimal) - using proper ABI format for viem
const erc20Abi = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "transfer",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "decimals",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint8" }],
    },
    {
        name: "symbol",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "string" }],
    },
] as const;

async function erc20Transfer() {
    console.log("🧪 Sample App - Scenario 2: ERC20 Token Transfer\n");
    printSeparator();

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const { network, testTokens } = config;

    // Using USDC on Base Sepolia
    const tokenAddress = testTokens.usdc;
    const tokenDecimals = 6; // USDC has 6 decimals
    const tokenSymbol = "USDC";

    console.log("\n📋 Configuration:");
    console.log(`  Network: ${network.name} (${network.chainId})`);
    console.log(`  Token: ${tokenSymbol} (${tokenAddress})`);
    console.log(`  Decimals: ${tokenDecimals}`);
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
    const paymasterApiKey = process.env.PAYMASTER_API_KEY;

    const clients = await createNexusClients({
        owner,
        walletAddress: wallet.walletAddress,
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || network.rpcUrl,
        bundlerUrl,
        paymasterApiKey,
    });

    printSeparator();

    // ============================================================================
    // CHECK INITIAL TOKEN BALANCE
    // ============================================================================

    printSection("STEP 3: Check Initial Token Balance");

    const initialBalance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [wallet.walletAddress as `0x${string}`],
    });

    const formattedInitial = (Number(initialBalance) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals);
    console.log(`  Initial Balance: ${formattedInitial} ${tokenSymbol}\n`);

    if (initialBalance === 0n) {
        console.log(`  ⚠️  WARNING: Wallet has no ${tokenSymbol}!`);
        console.log(`  Send some ${tokenSymbol} to the wallet before running this script.\n`);
        throw new Error("Insufficient token balance");
    }

    console.log("  ✅ Sufficient balance confirmed\n");
    printSeparator();

    // ============================================================================
    // TRANSFER ERC20 TOKEN
    // ============================================================================

    printSection("STEP 4: Send ERC20 Token Transfer");

    const recipient = owner.address; // Send back to owner for testing
    const amount = parseUnits("0.1", tokenDecimals); // 0.1 USDC

    console.log("  Transaction Details:");
    console.log(`    From:   ${wallet.walletAddress}`);
    console.log(`    To:     ${recipient}`);
    console.log(`    Token:  ${tokenSymbol}`);
    console.log(`    Amount: 0.1 ${tokenSymbol}\n`);

    // Encode ERC20 transfer call
    const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient as `0x${string}`, amount],
    });

    console.log("  📤 Sending UserOperation...\n");

    const startTime = Date.now();

    // Send UserOperation
    const userOpHash = await clients.bundlerClient.sendUserOperation({
        calls: [
            {
                to: tokenAddress as `0x${string}`,
                value: 0n,
                data: transferData,
            },
        ],
    });

    // Wait for transaction
    const receipt = await waitForUserOp(
        clients.bundlerClient,
        userOpHash,
        "ERC20 Transfer"
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    printSeparator();

    // ============================================================================
    // CHECK FINAL TOKEN BALANCE
    // ============================================================================

    printSection("STEP 5: Verify Final Token Balance");

    const finalBalance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [wallet.walletAddress as `0x${string}`],
    });

    const formattedFinal = (Number(finalBalance) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals);
    const sent = (Number(initialBalance - finalBalance) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals);

    console.log(`  Initial: ${formattedInitial} ${tokenSymbol}`);
    console.log(`  Final:   ${formattedFinal} ${tokenSymbol}`);
    console.log(`  Sent:    ${sent} ${tokenSymbol}\n`);
    printSeparator();

    // ============================================================================
    // SAVE RESULT & SUMMARY
    // ============================================================================

    const result = {
        scenario: "ERC20 Token Transfer",
        timestamp: new Date().toISOString(),
        wallet: wallet.walletAddress,
        token: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
        },
        recipient: recipient,
        amount: `0.1 ${tokenSymbol}`,
        userOpHash: userOpHash,
        txHash: receipt.receipt.transactionHash,
        success: receipt.success,
        duration: `${duration}s`,
        explorer: getExplorerUrl(receipt.receipt.transactionHash, network.chainId),
    };

    saveTestResult("02-result.json", result);

    printTestSummary("ERC20 Token Transfer", receipt.success, {
        "Token": tokenSymbol,
        "Amount": `0.1 ${tokenSymbol}`,
        "Duration": `${duration}s`,
        "TX Hash": receipt.receipt.transactionHash,
        "Explorer": result.explorer,
    });
}

erc20Transfer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error.message || error);
        process.exit(1);
    });
