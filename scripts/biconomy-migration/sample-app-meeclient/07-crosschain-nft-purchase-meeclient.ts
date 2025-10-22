/**
 * 07-crosschain-nft-purchase-meeclient.ts
 * 
 * Cross-chain NFT purchase demonstration using MEE Client.
 * 
 * ADVANCED USE CASE:
 * - Purchase NFTs on multiple chains in a single transaction
 * - Example: Buy NFT on Base AND Optimism simultaneously
 * - Single quote/signature for the entire cross-chain bundle
 * - Demonstrates MEE Client's power for complex cross-chain workflows
 * 
 * NEW FEATURE (not in legacy sample-app):
 * - Cross-chain NFT marketplace integration
 * - Atomic cross-chain NFT purchases
 * - Single user confirmation for multi-chain NFT buys
 * 
 * NOTE: This is a TEMPLATE/DEMONSTRATION script.
 * To execute real purchases, replace mock orders with real Seaport orders.
 */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, parseEther, type Hex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, optimism } from "viem/chains";
import { createMeeClient, toMultichainNexusAccount, getMEEVersion, MEEVersion } from "@biconomy/abstractjs";

// Seaport 1.5 contract address (same on all chains)
const SEAPORT_ADDRESS = "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC" as `0x${string}`;

// Seaport ABI (minimal - just fulfillOrder function)
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

async function crosschainNftPurchaseMeeClient() {
    console.log("🧪 Cross-Chain NFT Purchase - MEE Client\n");
    console.log("=".repeat(80));
    console.log("📋 Chains: Base Mainnet (8453) + Optimism Mainnet (10)");
    console.log("📋 Marketplace: OpenSea/Seaport 1.5");
    console.log("📋 API: createMeeClient() + toMultichainNexusAccount()");
    console.log("📋 Use Case: Buy NFTs on 2 chains in 1 transaction\n");
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
    // ⚠️  IMPORTANT: THIS IS A DEMONSTRATION
    // ============================================================================

    console.log("\n⚠️  IMPORTANT NOTICE:");
    console.log("-".repeat(80));
    console.log("  This script demonstrates CROSS-CHAIN NFT PURCHASE capability.");
    console.log("  It uses MOCK data to show the structure and flow.");
    console.log("  \n  To execute REAL cross-chain NFT purchases:");
    console.log("  1. Fetch real Seaport orders from Base AND Optimism");
    console.log("  2. Replace mock orders with real order parameters");
    console.log("  3. Ensure wallet has sufficient ETH on BOTH chains");
    console.log("  4. Execute and confirm NFT ownership on both chains\n");
    console.log("=".repeat(80));

    // ============================================================================
    // MOCK SEAPORT ORDERS (REPLACE WITH REAL ORDERS!)
    // ============================================================================

    const fulfillerConduitKey = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

    // Mock order for Base
    const baseOrder = {
        offerer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        zone: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        offer: [
            {
                itemType: 2, // ERC721
                token: "0x0000000000000000000000000000000000000000" as `0x${string}`, // NFT contract on Base
                identifierOrCriteria: BigInt(100), // Token ID
                startAmount: BigInt(1),
                endAmount: BigInt(1),
            },
        ],
        consideration: [
            {
                itemType: 0, // ETH
                token: "0x0000000000000000000000000000000000000000" as `0x${string}`,
                identifierOrCriteria: BigInt(0),
                startAmount: parseEther("0.001"), // NFT price on Base
                endAmount: parseEther("0.001"),
                recipient: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            },
        ],
        orderType: 0,
        startTime: BigInt(Math.floor(Date.now() / 1000) - 3600),
        endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
        zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        salt: BigInt(0),
        conduitKey: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        totalOriginalConsiderationItems: BigInt(1),
    };

    // Mock order for Optimism
    const optimismOrder = {
        offerer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        zone: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        offer: [
            {
                itemType: 2, // ERC721
                token: "0x0000000000000000000000000000000000000000" as `0x${string}`, // NFT contract on Optimism
                identifierOrCriteria: BigInt(200), // Token ID
                startAmount: BigInt(1),
                endAmount: BigInt(1),
            },
        ],
        consideration: [
            {
                itemType: 0, // ETH
                token: "0x0000000000000000000000000000000000000000" as `0x${string}`,
                identifierOrCriteria: BigInt(0),
                startAmount: parseEther("0.002"), // NFT price on Optimism
                endAmount: parseEther("0.002"),
                recipient: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            },
        ],
        orderType: 0,
        startTime: BigInt(Math.floor(Date.now() / 1000) - 3600),
        endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
        zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        salt: BigInt(0),
        conduitKey: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        totalOriginalConsiderationItems: BigInt(1),
    };

    console.log("\n📋 Mock Orders:");
    console.log("-".repeat(80));
    console.log("  BASE NFT:");
    console.log(`    Contract: ${baseOrder.offer[0].token}`);
    console.log(`    Token ID: ${baseOrder.offer[0].identifierOrCriteria}`);
    console.log(`    Price:    ${ethers.utils.formatEther(baseOrder.consideration[0].startAmount)} ETH`);
    console.log();
    console.log("  OPTIMISM NFT:");
    console.log(`    Contract: ${optimismOrder.offer[0].token}`);
    console.log(`    Token ID: ${optimismOrder.offer[0].identifierOrCriteria}`);
    console.log(`    Price:    ${ethers.utils.formatEther(optimismOrder.consideration[0].startAmount)} ETH`);
    console.log();
    console.log("  ⚠️  This is MOCK data - replace with real orders to execute!\n");
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
    // SETUP PUBLIC CLIENTS FOR BOTH CHAINS
    // ============================================================================

    console.log("\n🔗 Setting up public clients...");

    const baseRpcUrl = process.env.BASE_MAINNET_ENDPOINT || "https://mainnet.base.org";
    const optimismRpcUrl = process.env.OPTIMISM_MAINNET_ENDPOINT || "https://mainnet.optimism.io";

    const basePublicClient = createPublicClient({
        chain: base,
        transport: http(baseRpcUrl),
    });

    const optimismPublicClient = createPublicClient({
        chain: optimism,
        transport: http(optimismRpcUrl),
    });

    console.log("  ✅ Base client configured");
    console.log("  ✅ Optimism client configured\n");
    console.log("=".repeat(80));

    // ============================================================================
    // CHECK WALLET BALANCES ON BOTH CHAINS
    // ============================================================================

    console.log("\n💰 Checking Wallet Balances...");

    const baseBalance = await basePublicClient.getBalance({
        address: walletAddress,
    });

    const optimismBalance = await optimismPublicClient.getBalance({
        address: walletAddress,
    });

    const baseRequired = baseOrder.consideration[0].startAmount;
    const optimismRequired = optimismOrder.consideration[0].startAmount;

    console.log(`  Base:     ${ethers.utils.formatEther(baseBalance.toString())} ETH (need ${ethers.utils.formatEther(baseRequired)} ETH)`);
    console.log(`  Optimism: ${ethers.utils.formatEther(optimismBalance.toString())} ETH (need ${ethers.utils.formatEther(optimismRequired)} ETH)\n`);

    console.log("=".repeat(80));

    // ============================================================================
    // CREATE MEE CLIENT WITH MULTICHAIN SUPPORT
    // ============================================================================

    console.log("\n🚀 Creating Multichain MEE Client...");

    const apiKey = process.env.SUPERTX_API_KEY;
    if (!apiKey) {
        throw new Error("SUPERTX_API_KEY not found in .env");
    }

    console.log(`  API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`  Chains: Base (${base.id}) + Optimism (${optimism.id})`);
    console.log(`  Account: ${walletAddress}\n`);

    try {
        const nexusAccount = await toMultichainNexusAccount({
            signer: viemAccount,
            chainConfigurations: [
                {
                    chain: base,
                    transport: http(baseRpcUrl),
                    version: getMEEVersion(MEEVersion.V2_1_0),
                },
                {
                    chain: optimism,
                    transport: http(optimismRpcUrl),
                    version: getMEEVersion(MEEVersion.V2_1_0),
                },
            ],
            accountAddress: walletAddress,
        });

        console.log("  ✅ Multichain Nexus Account created (Base + Optimism)");

        const meeClient = await createMeeClient({
            account: nexusAccount,
            apiKey: apiKey,
        });

        console.log("  ✅ MEE Client created\n");
        console.log("=".repeat(80));

        // ========================================================================
        // ENCODE SEAPORT CALLS FOR BOTH CHAINS
        // ========================================================================

        console.log("\n📋 Encoding Seaport fulfillOrder calls...");

        const baseFulfillOrderData = encodeFunctionData({
            abi: seaportAbi,
            functionName: "fulfillOrder",
            args: [baseOrder, fulfillerConduitKey],
        });

        const optimismFulfillOrderData = encodeFunctionData({
            abi: seaportAbi,
            functionName: "fulfillOrder",
            args: [optimismOrder, fulfillerConduitKey],
        });

        console.log("  ✅ Base call data encoded");
        console.log("  ✅ Optimism call data encoded\n");
        console.log("=".repeat(80));

        // ========================================================================
        // EXECUTE CROSS-CHAIN NFT PURCHASES
        // ========================================================================

        console.log("\n🚀 Executing Cross-Chain NFT Purchases...");
        console.log("-".repeat(80));

        console.log(`  Wallet:    ${walletAddress}`);
        console.log(`  Seaport:   ${SEAPORT_ADDRESS}`);
        console.log(`  Base NFT:  ${ethers.utils.formatEther(baseRequired)} ETH`);
        console.log(`  OP NFT:    ${ethers.utils.formatEther(optimismRequired)} ETH`);
        console.log(`  Total:     ${ethers.utils.formatEther(baseRequired + optimismRequired)} ETH (across 2 chains)\n`);

        console.log("  ⚠️  WARNING: This will attempt to execute with MOCK data!");
        console.log("     The transactions will likely FAIL unless you provide real order data.\n");

        console.log("  📋 Building cross-chain quote...");

        const quote = await meeClient.getQuote({
            sponsorship: true, // Gas sponsorship (user still pays for NFT values)
            instructions: [
                // Instruction 1: Base NFT purchase
                {
                    calls: [
                        {
                            to: SEAPORT_ADDRESS,
                            value: baseRequired,
                            data: baseFulfillOrderData,
                        },
                    ],
                    chainId: base.id,
                },
                // Instruction 2: Optimism NFT purchase
                {
                    calls: [
                        {
                            to: SEAPORT_ADDRESS,
                            value: optimismRequired,
                            data: optimismFulfillOrderData,
                        },
                    ],
                    chainId: optimism.id,
                },
            ],
        });

        console.log("  ✅ Cross-chain quote received\n");

        console.log("  🖊️  Signing quote (single signature for both NFTs)...");
        const signedQuote = await meeClient.signQuote({ quote });
        console.log("  ✅ Quote signed\n");

        console.log("  📤 Executing cross-chain transactions...");
        const result = await meeClient.executeSignedQuote({ signedQuote });
        const hash = result.hash;

        console.log(`  ✅ Cross-chain transaction submitted!`);
        console.log(`  Supertransaction Hash: ${hash}\n`);

        console.log("  ⏳ Waiting for confirmation on BOTH chains...\n");

        const receipt = await meeClient.waitForSupertransactionReceipt({ hash: hash as `0x${string}` });

        const isSuccess = receipt.transactionStatus === "MINED_SUCCESS" ||
            (receipt.userOps && receipt.userOps.every((op: any) =>
                op.executionStatus === "MINED_SUCCESS"
            ));

        console.log(`  Status: ${isSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
        console.log(`  Transaction Status: ${receipt.transactionStatus || "N/A"}\n`);

        if (receipt.userOps && receipt.userOps.length > 0) {
            console.log(`  📊 UserOps executed: ${receipt.userOps.length} (across ${receipt.userOps.length} chains)`);
            receipt.userOps.forEach((op: any, idx: number) => {
                const chainName = idx === 0 ? "Base" : "Optimism";
                console.log(`    UserOp #${idx + 1} (${chainName}):`);
                console.log(`      Execution Status: ${op.executionStatus || "N/A"}`);
                console.log(`      TX Hash: ${op.executionData || "N/A"}`);
            });
            console.log();
        }

        if (receipt.explorerLinks && receipt.explorerLinks.length > 0) {
            console.log(`  🔗 Explorer Links (${receipt.explorerLinks.length} chains):`);
            receipt.explorerLinks.forEach((link: string) => {
                const chainName = link.includes("basescan") ? "Base" : "Optimism";
                console.log(`    [${chainName}] ${link}`);
            });
            console.log();
        }

        console.log("=".repeat(80));

        // ========================================================================
        // SAVE RESULT
        // ========================================================================

        const resultData = {
            timestamp: new Date().toISOString(),
            type: "cross-chain-nft-purchase",
            wallet: walletAddress,
            owner: ownerAddress,
            supertxHash: hash,
            success: isSuccess,
            transactionStatus: receipt.transactionStatus,
            userOpsCount: receipt.userOps?.length || 0,
            marketplace: "Seaport 1.5",
            seaportAddress: SEAPORT_ADDRESS,
            nfts: [
                {
                    chain: "base",
                    chainId: base.id,
                    contract: baseOrder.offer[0].token,
                    tokenId: baseOrder.offer[0].identifierOrCriteria.toString(),
                    price: ethers.utils.formatEther(baseRequired),
                    blockchainTxHash: receipt.receipts?.[0]?.transactionHash || null,
                },
                {
                    chain: "optimism",
                    chainId: optimism.id,
                    contract: optimismOrder.offer[0].token,
                    tokenId: optimismOrder.offer[0].identifierOrCriteria.toString(),
                    price: ethers.utils.formatEther(optimismRequired),
                    blockchainTxHash: receipt.receipts?.[1]?.transactionHash || null,
                },
            ],
            explorerLinks: receipt.explorerLinks || [],
            sponsored: false,
            note: "This was executed with MOCK data - replace with real orders for actual NFT purchases",
        };

        const resultPath = path.join(__dirname, "07-result.json");
        fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));

        console.log(`\n📄 Result saved to: ${resultPath}\n`);

        console.log("=".repeat(80));
        if (isSuccess) {
            console.log("\n🎉 CROSS-CHAIN NFT PURCHASE: TRANSACTIONS SUCCESSFUL!\n");
            console.log("✅ Seaport orders fulfilled on Base AND Optimism");
            console.log("✅ Single signature for both NFT purchases");
            console.log("✅ MEE Client cross-chain execution confirmed");
            console.log(`✅ Supertransaction: ${hash}\n`);
            console.log("⚠️  NOTE: If this was MOCK data, the NFT transfers may have failed.");
            console.log("   Check transaction details on both chains to confirm NFT ownership.\n");
        } else {
            console.log("\n⚠️  CROSS-CHAIN NFT PURCHASE: TRANSACTIONS FAILED\n");
            console.log("   This is expected if using MOCK order data.");
            console.log("   Replace with real Seaport orders to execute actual purchases.\n");
        }
        console.log("=".repeat(80));

        // ========================================================================
        // KEY ADVANTAGES OF CROSS-CHAIN NFT PURCHASE
        // ========================================================================

        console.log("\n💡 Key Advantages of Cross-Chain NFT Purchase:\n");
        console.log("1. ✅ Single Transaction:");
        console.log("   - User signs ONCE for NFTs on multiple chains");
        console.log("   - No need to switch networks or sign multiple times\n");
        console.log("2. ✅ Atomic Execution:");
        console.log("   - All purchases execute together");
        console.log("   - Either all succeed or all revert (atomic bundle)\n");
        console.log("3. ✅ Gas Optimization:");
        console.log("   - Gas sponsorship can cover costs on all chains");
        console.log("   - User only pays for NFTs, not gas\n");
        console.log("4. ✅ Superior UX:");
        console.log("   - No network switching");
        console.log("   - No wallet approval for each chain");
        console.log("   - Single confirmation screen in UI\n");
        console.log("=".repeat(80));

    } catch (error: any) {
        console.log("\n❌ Test Failed!");
        console.log(`   Error: ${error.message}\n`);
        console.log("=".repeat(80));
        throw error;
    }
}

crosschainNftPurchaseMeeClient()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test Failed!");
        console.error(`   Error: ${error.message}\n`);
        process.exit(1);
    });

