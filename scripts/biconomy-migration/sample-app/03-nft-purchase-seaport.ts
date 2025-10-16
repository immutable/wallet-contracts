/**
 * 03-nft-purchase-seaport.ts
 * 
 * Sample App - Scenario 3: NFT Purchase via Seaport
 * 
 * Demonstrates how to purchase an NFT using Seaport protocol from a migrated Nexus wallet:
 * - Biconomy AbstractJS SDK
 * - Seaport fulfillOrder() call
 * - Optional gas sponsorship via paymaster
 * 
 * NOTE: This is a template. To execute real NFT purchases:
 * 1. Get a Seaport order from OpenSea API or marketplace
 * 2. Update the order parameters in the script
 * 3. Ensure wallet has sufficient funds (ETH or WETH)
 * 
 * REFACTORED: Now uses helper utilities for cleaner code
 */

import { encodeFunctionData, parseEther } from "viem";
import config from "./config.json";
import {
    loadMigratedWallet,
    printWalletInfo,
    loadOwnerAccount,
    validateOwner,
    createBaseSepoliaClient,
    createNexusClients,
    checkBalance,
    saveTestResult,
    printSeparator,
    printSection,
    printTestSummary,
    getRequiredEnv,
} from "./utils";

async function nftPurchaseSeaport() {
    console.log("🧪 Sample App - Scenario 3: NFT Purchase via Seaport\n");
    printSeparator();

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const { network, testNFT } = config;

    // Seaport contract address (Base Sepolia)
    const seaportAddress = testNFT.seaport;

    console.log("\n📋 Configuration:");
    console.log(`  Network: ${network.name} (${network.chainId})`);
    console.log(`  Seaport: ${seaportAddress}`);
    console.log(`  Mode: TEMPLATE (no real order)\n`);

    console.log("  ⚠️  NOTE: This is a template script!");
    console.log("  To execute real NFT purchases:");
    console.log("    1. Get a Seaport order from OpenSea API");
    console.log("    2. Update order parameters in this script");
    console.log("    3. Ensure wallet has sufficient ETH/WETH\n");
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
    // CHECK WALLET BALANCE
    // ============================================================================

    printSection("STEP 3: Check Wallet Balance");

    const balance = await checkBalance(
        publicClient,
        wallet.walletAddress,
        "ETH Balance"
    );

    console.log();
    if (balance === 0n) {
        console.log("  ⚠️  WARNING: Wallet has no ETH!");
        console.log("  Send ETH to wallet before purchasing NFTs.\n");
    }

    printSeparator();

    // ============================================================================
    // PREPARE SEAPORT ORDER (TEMPLATE)
    // ============================================================================

    printSection("STEP 4: Seaport Order Structure (Template)");

    console.log("  📦 Example Seaport fulfillOrder() Structure:\n");

    // Seaport ABI (fulfillOrder function)
    const seaportAbi = [
        {
            name: "fulfillOrder",
            type: "function",
            stateMutability: "payable",
            inputs: [
                {
                    name: "order",
                    type: "tuple",
                    components: [
                        { name: "offerer", type: "address" },
                        { name: "zone", type: "address" },
                        {
                            name: "offer",
                            type: "tuple[]",
                            components: [
                                { name: "itemType", type: "uint8" },
                                { name: "token", type: "address" },
                                { name: "identifierOrCriteria", type: "uint256" },
                                { name: "startAmount", type: "uint256" },
                                { name: "endAmount", type: "uint256" },
                            ],
                        },
                        {
                            name: "consideration",
                            type: "tuple[]",
                            components: [
                                { name: "itemType", type: "uint8" },
                                { name: "token", type: "address" },
                                { name: "identifierOrCriteria", type: "uint256" },
                                { name: "startAmount", type: "uint256" },
                                { name: "endAmount", type: "uint256" },
                                { name: "recipient", type: "address" },
                            ],
                        },
                        { name: "orderType", type: "uint8" },
                        { name: "startTime", type: "uint256" },
                        { name: "endTime", type: "uint256" },
                        { name: "zoneHash", type: "bytes32" },
                        { name: "salt", type: "uint256" },
                        { name: "conduitKey", type: "bytes32" },
                        { name: "totalOriginalConsiderationItems", type: "uint256" },
                    ],
                },
                { name: "fulfillerConduitKey", type: "bytes32" },
            ],
            outputs: [{ name: "fulfilled", type: "bool" }],
        },
    ] as const;

    console.log("  ✅ Seaport ABI loaded (fulfillOrder)\n");

    // Placeholder order structure (for demonstration)
    console.log("  📝 Order Components:");
    console.log("    - offerer: NFT seller address");
    console.log("    - offer: NFT being sold (itemType, token, tokenId)");
    console.log("    - consideration: Payment details (ETH/WETH amount, recipient)");
    console.log("    - orderType: 0=Full Open, 1=Partial Open, etc.");
    console.log("    - startTime/endTime: Order validity period");
    console.log("    - signature: Order signature from seller\n");

    printSeparator();

    // ============================================================================
    // TEMPLATE MODE - NO EXECUTION
    // ============================================================================

    printSection("STEP 5: NFT Purchase (Template Mode)");

    console.log("  ⚠️  Skipping actual purchase - no real order provided\n");

    console.log("  📚 To execute a real NFT purchase:\n");
    console.log("  1. Get order from OpenSea Seaport API:");
    console.log("     https://docs.opensea.io/reference/retrieve-orders\n");

    console.log("  2. Parse the order response:\n");
    console.log("     ```typescript");
    console.log("     const order = {");
    console.log("       offerer: orderData.parameters.offerer,");
    console.log("       zone: orderData.parameters.zone,");
    console.log("       offer: orderData.parameters.offer,");
    console.log("       consideration: orderData.parameters.consideration,");
    console.log("       // ... other parameters");
    console.log("     };");
    console.log("     ```\n");

    console.log("  3. Encode and send UserOperation:\n");
    console.log("     ```typescript");
    console.log("     const fulfillOrderData = encodeFunctionData({");
    console.log("       abi: seaportAbi,");
    console.log("       functionName: 'fulfillOrder',");
    console.log("       args: [order, fulfillerConduitKey],");
    console.log("     });");
    console.log("");
    console.log("     const userOpHash = await bundlerClient.sendUserOperation({");
    console.log("       calls: [{");
    console.log("         to: seaportAddress,");
    console.log("         value: nftPrice, // ETH price");
    console.log("         data: fulfillOrderData,");
    console.log("       }],");
    console.log("     });");
    console.log("     ```\n");

    console.log("  4. Wait for confirmation:");
    console.log("     ```typescript");
    console.log("     const receipt = await bundlerClient.waitForUserOperationReceipt({");
    console.log("       hash: userOpHash,");
    console.log("     });");
    console.log("     ```\n");

    printSeparator();

    // ============================================================================
    // SAVE RESULT & SUMMARY
    // ============================================================================

    const result = {
        scenario: "NFT Purchase via Seaport",
        timestamp: new Date().toISOString(),
        wallet: wallet.walletAddress,
        seaportAddress: seaportAddress,
        mode: "TEMPLATE",
        note: "No real order executed - template mode only",
        instructions: {
            step1: "Get Seaport order from OpenSea API",
            step2: "Parse order parameters",
            step3: "Encode fulfillOrder call",
            step4: "Send UserOperation with ETH value",
            step5: "Wait for receipt and verify NFT transfer",
        },
    };

    saveTestResult("03-result.json", result);

    printTestSummary("NFT Purchase via Seaport (Template)", true, {
        "Mode": "Template (no execution)",
        "Seaport": seaportAddress,
        "Note": "Update script with real order to execute",
    });
}

nftPurchaseSeaport()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error.message || error);
        process.exit(1);
    });
