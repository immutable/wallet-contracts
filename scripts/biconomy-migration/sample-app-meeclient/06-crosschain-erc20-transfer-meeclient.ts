/**
 * 04-crosschain-erc20-transfer-meeclient.ts
 * 
 * Cross-chain ERC20 token transfer using MEE Client.
 * Sends USDC on Base AND Optimism in a single Supertransaction.
 * 
 * NEW FEATURE:
 * - Demonstrates MEE Client's cross-chain ERC20 capabilities
 * - Multiple token transfers across different chains
 * - Single quote/signature for entire cross-chain bundle
 * - Automatic gas sponsorship across all chains
 */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, parseUnits, type Hex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, optimism } from "viem/chains";
import { createMeeClient, toMultichainNexusAccount, getMEEVersion, MEEVersion } from "@biconomy/abstractjs";

async function crosschainErc20TransferMeeClient() {
    console.log("🧪 Cross-Chain ERC20 Transfer - MEE Client\n");
    console.log("=".repeat(80));
    console.log("📋 Chains: Base Mainnet (8453) + Optimism Mainnet (10)");
    console.log("📋 Token: USDC (native on both chains)");
    console.log("📋 API: createMeeClient() + toMultichainNexusAccount()");
    console.log("📋 Sponsorship: Biconomy hosted (all chains)\n");
    console.log("=".repeat(80));

    // ============================================================================
    // WALLET INFO
    // ============================================================================

    const walletAddress = "0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6" as `0x${string}`;
    const ownerAddress = "0xeDC117090236293afEBb179260e8B9dd5bffe4dC" as `0x${string}`;

    // USDC addresses (native on both chains)
    const baseUsdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;
    const optimismUsdcAddress = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as `0x${string}`;
    const usdcDecimals = 6;

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
    // CHECK USDC BALANCES ON BOTH CHAINS
    // ============================================================================

    console.log("\n💰 Checking USDC Balances...");

    const erc20Abi = [
        "function balanceOf(address account) external view returns (uint256)",
        "function symbol() external view returns (string)",
    ];

    // Base USDC
    const baseUsdcContract = new ethers.Contract(
        baseUsdcAddress,
        erc20Abi,
        new ethers.providers.JsonRpcProvider(baseRpcUrl)
    );

    // Optimism USDC
    const optimismUsdcContract = new ethers.Contract(
        optimismUsdcAddress,
        erc20Abi,
        new ethers.providers.JsonRpcProvider(optimismRpcUrl)
    );

    const baseBalance = await baseUsdcContract.balanceOf(walletAddress);
    const optimismBalance = await optimismUsdcContract.balanceOf(walletAddress);
    const symbol = await baseUsdcContract.symbol();

    console.log(`  Base:     ${ethers.utils.formatUnits(baseBalance, usdcDecimals)} ${symbol}`);
    console.log(`  Optimism: ${ethers.utils.formatUnits(optimismBalance, usdcDecimals)} ${symbol}\n`);

    if (baseBalance.lt(ethers.utils.parseUnits("0.02", usdcDecimals))) {
        throw new Error("Insufficient USDC balance on Base");
    }

    if (optimismBalance.lt(ethers.utils.parseUnits("0.02", usdcDecimals))) {
        throw new Error("Insufficient USDC balance on Optimism");
    }

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
        // Create Multichain Nexus account with both chains
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

        // Create MEE Client
        const meeClient = await createMeeClient({
            account: nexusAccount,
            apiKey: apiKey,
        });

        console.log("  ✅ MEE Client created\n");
        console.log("=".repeat(80));

        // ========================================================================
        // SEND CROSS-CHAIN ERC20 TRANSFER
        // ========================================================================

        console.log("\n🚀 Sending Cross-Chain ERC20 Transfer...");

        const transferAmount = parseUnits("0.01", usdcDecimals); // 0.01 USDC per chain
        const recipientAddress = "0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B" as `0x${string}`; // Native Nexus wallet

        console.log(`  From:      ${walletAddress}`);
        console.log(`  To:        ${recipientAddress}`);
        console.log(`  Amount:    ${ethers.utils.formatUnits(transferAmount, usdcDecimals)} ${symbol} (per chain)`);
        console.log(`  Chains:    Base + Optimism`);
        console.log(`  Sponsored: YES (Biconomy)\n`);

        // Encode ERC20 transfer function call
        const transferAbi = [{
            name: "transfer",
            type: "function",
            inputs: [
                { name: "to", type: "address" },
                { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
        }];

        const baseTransferData = encodeFunctionData({
            abi: transferAbi,
            functionName: "transfer",
            args: [recipientAddress, transferAmount],
        });

        const optimismTransferData = encodeFunctionData({
            abi: transferAbi,
            functionName: "transfer",
            args: [recipientAddress, transferAmount],
        });

        console.log("  📋 Building cross-chain quote with gas sponsorship...");

        const quote = await meeClient.getQuote({
            sponsorship: true,
            instructions: [
                // Instruction 1: Base Mainnet USDC transfer
                {
                    calls: [
                        {
                            to: baseUsdcAddress,
                            data: baseTransferData,
                        },
                    ],
                    chainId: base.id,
                },
                // Instruction 2: Optimism Mainnet USDC transfer
                {
                    calls: [
                        {
                            to: optimismUsdcAddress,
                            data: optimismTransferData,
                        },
                    ],
                    chainId: optimism.id,
                },
            ],
        });

        console.log("  ✅ Cross-chain quote received!\n");

        console.log("  🖊️  Signing quote...");
        const signedQuote = await meeClient.signQuote({ quote });
        console.log("  ✅ Quote signed!\n");

        console.log("  📤 Executing signed quote (cross-chain)...");
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

        // Show UserOp details (one per chain)
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

        // Show explorer links (one per chain)
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
        // VERIFY BALANCES ON BOTH CHAINS
        // ========================================================================

        console.log("\n🔍 Verifying USDC Balances...");

        const newBaseBalance = await baseUsdcContract.balanceOf(walletAddress);
        const newOptimismBalance = await optimismUsdcContract.balanceOf(walletAddress);

        console.log(`  Base Before:     ${ethers.utils.formatUnits(baseBalance, usdcDecimals)} ${symbol}`);
        console.log(`  Base After:      ${ethers.utils.formatUnits(newBaseBalance, usdcDecimals)} ${symbol}`);
        console.log(`  Optimism Before: ${ethers.utils.formatUnits(optimismBalance, usdcDecimals)} ${symbol}`);
        console.log(`  Optimism After:  ${ethers.utils.formatUnits(newOptimismBalance, usdcDecimals)} ${symbol}\n`);

        console.log("=".repeat(80));

        // ========================================================================
        // SAVE RESULT
        // ========================================================================

        const resultData = {
            timestamp: new Date().toISOString(),
            type: "cross-chain-erc20-transfer",
            wallet: walletAddress,
            owner: ownerAddress,
            supertxHash: hash,
            success: isSuccess,
            transactionStatus: receipt.transactionStatus,
            userOpsCount: receipt.userOps?.length || 0,
            chains: [
                {
                    name: "base",
                    chainId: base.id,
                    tokenAddress: baseUsdcAddress,
                    blockchainTxHash: receipt.receipts?.[0]?.transactionHash || null,
                    balanceBefore: baseBalance.toString(),
                    balanceAfter: newBaseBalance.toString(),
                },
                {
                    name: "optimism",
                    chainId: optimism.id,
                    tokenAddress: optimismUsdcAddress,
                    blockchainTxHash: receipt.receipts?.[1]?.transactionHash || null,
                    balanceBefore: optimismBalance.toString(),
                    balanceAfter: newOptimismBalance.toString(),
                },
            ],
            explorerLinks: receipt.explorerLinks || [],
            sponsored: true,
            token: {
                symbol: symbol,
                amount: transferAmount.toString(),
                decimals: usdcDecimals,
            },
            recipient: recipientAddress,
        };

        const resultPath = path.join(__dirname, "04-result.json");
        fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));

        console.log(`\n📄 Result saved to: ${resultPath}\n`);

        console.log("=".repeat(80));
        if (isSuccess) {
            console.log("\n🎉 CROSS-CHAIN ERC20 TRANSFER: SUCCESS!\n");
            console.log("✅ MEE Client cross-chain works perfectly!");
            console.log("✅ Gas sponsorship on BOTH chains");
            console.log("✅ USDC transfers confirmed on Base AND Optimism");
            console.log(`✅ Supertransaction: ${hash}\n`);
        } else {
            console.log("\n⚠️  CROSS-CHAIN ERC20 TRANSFER: NEEDS INVESTIGATION\n");
        }
        console.log("=".repeat(80));

    } catch (error: any) {
        console.log("\n❌ Test Failed!");
        console.log(`   Error: ${error.message}\n`);
        console.log("=".repeat(80));
        throw error;
    }
}

crosschainErc20TransferMeeClient()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test Failed!");
        console.error(`   Error: ${error.message}\n`);
        process.exit(1);
    });

