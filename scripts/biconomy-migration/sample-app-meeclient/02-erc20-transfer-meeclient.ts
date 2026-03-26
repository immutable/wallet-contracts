/**
 * 02-erc20-transfer-meeclient.ts
 * 
 * ERC20 token transfer using MEE Client (createMeeClient).
 * 
 * MIGRATED FROM: sample-app/02-erc20-transfer.ts
 * IMPROVEMENTS:
 * - Uses MEE Client instead of legacy bundler/paymaster
 * - Gas sponsorship via Biconomy (automatic)
 * - Simplified API (no manual bundler/paymaster setup)
 * - Entry Point v0.7.0 compatible
 */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, parseUnits, type Hex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { createMeeClient, toMultichainNexusAccount, getMEEVersion, MEEVersion } from "@biconomy/abstractjs";

async function erc20TransferMeeClient() {
    console.log("🧪 ERC20 Token Transfer - MEE Client\n");
    console.log("=".repeat(80));
    console.log("📋 Network: Base Mainnet (8453)");
    console.log("📋 Token: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)");
    console.log("📋 API: createMeeClient() + toMultichainNexusAccount()");
    console.log("📋 Sponsorship: Biconomy hosted\n");
    console.log("=".repeat(80));

    // ============================================================================
    // WALLET INFO
    // ============================================================================

    const walletAddress = "0x846A51Ac27990D255Eaa0a732A9411F21cAF91b6" as `0x${string}`;
    const ownerAddress = "0xeDC117090236293afEBb179260e8B9dd5bffe4dC" as `0x${string}`;

    // USDC on Base Mainnet
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;
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
    // CHECK USDC BALANCE
    // ============================================================================

    console.log("\n💰 Checking USDC Balance...");

    const erc20Abi = [
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)",
        "function symbol() external view returns (string)",
    ];

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const usdcContract = new ethers.Contract(usdcAddress, erc20Abi, provider);

    const balance = await usdcContract.balanceOf(walletAddress);
    const symbol = await usdcContract.symbol();

    console.log(`  Balance: ${ethers.utils.formatUnits(balance, usdcDecimals)} ${symbol}\n`);

    if (balance.lt(ethers.utils.parseUnits("0.1", usdcDecimals))) {
        throw new Error("Insufficient USDC balance in wallet");
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
        // SEND ERC20 TRANSFER
        // ========================================================================

        console.log("\n🚀 Sending ERC20 Transfer...");

        const transferAmount = parseUnits("0.01", usdcDecimals); // 0.01 USDC
        const recipientAddress = "0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B" as `0x${string}`; // Native Nexus wallet

        console.log(`  From:      ${walletAddress}`);
        console.log(`  To:        ${recipientAddress}`);
        console.log(`  Amount:    ${ethers.utils.formatUnits(transferAmount, usdcDecimals)} ${symbol}`);
        console.log(`  Token:     ${usdcAddress}`);
        console.log(`  Sponsored: YES (Biconomy)\n`);

        // Encode ERC20 transfer function call
        const transferData = encodeFunctionData({
            abi: [{
                name: "transfer",
                type: "function",
                inputs: [
                    { name: "to", type: "address" },
                    { name: "amount", type: "uint256" },
                ],
                outputs: [{ name: "", type: "bool" }],
                stateMutability: "nonpayable",
            }],
            functionName: "transfer",
            args: [recipientAddress, transferAmount],
        });

        console.log("  📋 Building quote with gas sponsorship...");

        const quote = await meeClient.getQuote({
            sponsorship: true,
            instructions: [
                {
                    calls: [
                        {
                            to: usdcAddress,
                            data: transferData,
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
        // VERIFY TRANSFER
        // ========================================================================

        console.log("\n🔍 Verifying Transfer...");

        const newBalance = await usdcContract.balanceOf(walletAddress);
        const recipientBalance = await usdcContract.balanceOf(recipientAddress);

        console.log(`  Wallet Balance After:    ${ethers.utils.formatUnits(newBalance, usdcDecimals)} ${symbol}`);
        console.log(`  Recipient Balance After: ${ethers.utils.formatUnits(recipientBalance, usdcDecimals)} ${symbol}\n`);

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
            type: "erc20-transfer",
            supertxHash: hash,
            success: isSuccess,
            transactionStatus: receipt.transactionStatus,
            userOpsCount: receipt.userOps?.length || 0,
            blockchainTxHashes: receipt.receipts?.map((r: any) => r.transactionHash) || [],
            explorerLinks: receipt.explorerLinks || [],
            sponsored: true,
            token: {
                address: usdcAddress,
                symbol: symbol,
                amount: transferAmount.toString(),
                decimals: usdcDecimals,
            },
            recipient: recipientAddress,
            balanceBefore: balance.toString(),
            balanceAfter: newBalance.toString(),
        };

        const resultPath = path.join(__dirname, "02-result.json");
        fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2));

        console.log(`\n📄 Result saved to: ${resultPath}\n`);

        console.log("=".repeat(80));
        if (isSuccess) {
            console.log("\n🎉 ERC20 TRANSFER: SUCCESS!\n");
            console.log("✅ MEE Client works perfectly!");
            console.log("✅ Gas sponsorship working");
            console.log("✅ USDC transfer confirmed on-chain");
            console.log(`✅ Supertransaction: ${hash}\n`);
        } else {
            console.log("\n⚠️  ERC20 TRANSFER: NEEDS INVESTIGATION\n");
        }
        console.log("=".repeat(80));

    } catch (error: any) {
        console.log("\n❌ Test Failed!");
        console.log(`   Error: ${error.message}\n`);
        console.log("=".repeat(80));
        throw error;
    }
}

erc20TransferMeeClient()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test Failed!");
        console.error(`   Error: ${error.message}\n`);
        process.exit(1);
    });

