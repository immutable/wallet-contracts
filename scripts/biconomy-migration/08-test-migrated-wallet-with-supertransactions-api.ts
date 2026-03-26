/**
 * 09-test-migrated-wallet-with-rest-api.ts
 * 
 * Test the MIGRATED wallet using Biconomy Supertransaction API
 * https://docs.biconomy.io/supertransaction-api
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";

async function testMigratedWalletWithSupertransactionAPI() {
    console.log("🧪 Testing EOA Mode with Supertransaction API\n");
    console.log("=".repeat(80));
    console.log("\n📋 Using: https://docs.biconomy.io/supertransaction-api");
    console.log("📋 Mode: EOA (using EOA owner funds)\n");
    console.log("=".repeat(80));

    // ============================================================================
    // LOAD WALLET INFO
    // ============================================================================

    // Native Nexus wallet - DESTINATION
    const nativeWallet = "0xF04fF8e30816858dc4ec5436d3e148D1B9D84b6B";

    // Migrated wallet
    const walletInfoPath = path.join(__dirname, "test-wallet-info.json");

    if (!fs.existsSync(walletInfoPath)) {
        throw new Error("test-wallet-info.json not found. Run 02-deploy-test-passport-wallet.ts first");
    }

    const walletInfo = JSON.parse(fs.readFileSync(walletInfoPath, "utf8"));
    const migratedWallet = walletInfo.walletAddress;

    console.log("\n📋 Test Setup:");
    console.log("-".repeat(80));
    console.log(`  Mode:              EOA`);
    console.log(`  Funding Source:    EOA Owner`);
    console.log(`  Destination:       Native Nexus Wallet`);
    console.log(`  Owner:             ${walletInfo.owner}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // SETUP SIGNER
    // ============================================================================

    const ownerPk = process.env.MIGRATION_TEST_OWNER_PK;
    if (!ownerPk) {
        throw new Error("MIGRATION_TEST_OWNER_PK not set");
    }

    const owner = new ethers.Wallet(ownerPk, ethers.provider);
    console.log(`\n👤 Owner: ${owner.address}\n`);

    // ============================================================================
    // CHECK BALANCES
    // ============================================================================

    const ownerBalance = await ethers.provider.getBalance(owner.address);
    const nativeBalance = await ethers.provider.getBalance(nativeWallet);
    const migratedBalance = await ethers.provider.getBalance(migratedWallet);

    console.log("\n💰 Balances:");
    console.log("-".repeat(80));
    console.log(`  EOA Owner:         ${ethers.utils.formatEther(ownerBalance)} ETH ⭐ (funding source)`);
    console.log(`  Native Wallet:     ${ethers.utils.formatEther(nativeBalance)} ETH`);
    console.log(`  Migrated Wallet:   ${ethers.utils.formatEther(migratedBalance)} ETH\n`);

    const amountWei = "10000000000000"; // 0.00001 ETH in wei
    const requiredAmount = ethers.utils.parseEther("0.0001"); // Need extra for fees

    if (ownerBalance.lt(requiredAmount)) {
        throw new Error(`Insufficient balance in EOA owner. Need at least ${ethers.utils.formatEther(requiredAmount)} ETH`);
    }

    // ============================================================================
    // PREPARE TRANSFER TRANSACTION
    // ============================================================================

    console.log("📝 Preparing ETH Transfer (EOA Mode):");
    console.log("-".repeat(80));
    console.log(`  Funding Source:  EOA Owner (${owner.address})`);
    console.log(`  Destination:     Native Wallet (${nativeWallet})`);
    console.log(`  Amount:          0.00001 ETH`);
    console.log(`  Method:          forward() via ETH Forwarder`);
    console.log(`  Fee Payment:     ETH from EOA\n`);

    // ============================================================================
    // STEP 1: GET QUOTE FROM SUPERTRANSACTION API
    // ============================================================================

    const SUPERTRANSACTION_API = "https://api.biconomy.io/v1";
    const CHAIN_ID = 8453; // Base Mainnet
    const ETH_FORWARDER = "0x000000Afe527A978Ecb761008Af475cfF04132a1"; // Official ETH Forwarder

    console.log("🔍 Step 1: Getting Quote from Supertransaction API...");
    console.log("-".repeat(80));
    console.log(`  Using /instructions/build with forward()\n`);

    // Use /instructions/build with forward() for native ETH transfer
    // Reference: https://docs.biconomy.io/supertransaction-api/endpoints/build#token-transfer
    // Using EOA mode (funds from EOA owner)
    // Reference: https://docs.biconomy.io/supertransaction-api/execution-modes/choose-execution-mode#eoa
    const quoteRequest = {
        mode: "eoa",
        ownerAddress: owner.address,
        fundingTokens: [{
            tokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH
            chainId: CHAIN_ID,
            amount: amountWei // Amount to use from EOA
        }],
        composeFlows: [
            {
                type: "/instructions/build",
                data: {
                    functionSignature: "function forward(address recipient)",
                    args: [nativeWallet], // Recipient: native wallet
                    to: ETH_FORWARDER, // ETH Forwarder contract
                    chainId: CHAIN_ID,
                    value: amountWei, // Amount to forward
                    gasLimit: "300000"
                }
            }
        ]
    };

    console.log("📤 Quote Request:");
    console.log(JSON.stringify(quoteRequest, null, 2));

    // Get Supertransaction API Key from environment
    const apiKey = process.env.SUPERTX_API_KEY;
    if (!apiKey) {
        throw new Error("SUPERTX_API_KEY not set in .env");
    }

    console.log(`\n🔑 Using Supertransaction API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

    let quoteResponse;
    try {
        const response = await fetch(`${SUPERTRANSACTION_API}/quote`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey  // ← API Key header!
            },
            body: JSON.stringify(quoteRequest)
        });

        quoteResponse = await response.json();

        if (!response.ok) {
            console.log("\n❌ Quote request failed!");
            console.log("Response:", JSON.stringify(quoteResponse, null, 2));
            return;
        }

        console.log("\n✅ Quote received!");
        console.log("Quote Response:");
        console.log(JSON.stringify(quoteResponse, null, 2));
        console.log();

    } catch (error: any) {
        console.log("❌ Error getting quote:", error.message);
        return;
    }

    // ============================================================================
    // STEP 2: SIGN PAYLOAD
    // ============================================================================

    console.log("=".repeat(80));
    console.log("🔏 Step 2: Signing Payload...");
    console.log("-".repeat(80));

    if (!quoteResponse.data || !quoteResponse.data.payloads) {
        console.log("❌ No payloads found in quote response");
        return;
    }

    const payloads = quoteResponse.data.payloads;
    const signatures: any[] = [];

    for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        console.log(`\n📝 Signing payload ${i + 1}/${payloads.length}...`);
        console.log(`  Chain ID: ${payload.chainId}`);
        console.log(`  Payload:  ${payload.data.substring(0, 66)}...`);

        try {
            const signature = await owner.signMessage(ethers.utils.arrayify(payload.data));

            signatures.push({
                chainId: payload.chainId,
                signature: signature
            });

            console.log(`  ✅ Signature: ${signature.substring(0, 66)}...`);
        } catch (error: any) {
            console.log(`  ❌ Error signing payload: ${error.message}`);
            return;
        }
    }

    console.log(`\n✅ All ${signatures.length} payload(s) signed successfully!\n`);

    // ============================================================================
    // STEP 3: EXECUTE WORKFLOW
    // ============================================================================

    console.log("=".repeat(80));
    console.log("🚀 Step 3: Executing Workflow...");
    console.log("-".repeat(80));

    const executeRequest = {
        workflowId: quoteResponse.data.workflowId,
        signatures: signatures
    };

    console.log("📤 Execute Request:");
    console.log(JSON.stringify(executeRequest, null, 2));

    let executeResponse;
    try {
        const response = await fetch(`${SUPERTRANSACTION_API}/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey  // ← API Key header!
            },
            body: JSON.stringify(executeRequest)
        });

        executeResponse = await response.json();

        if (!response.ok) {
            console.log("\n❌ Execution failed!");
            console.log("Response:", JSON.stringify(executeResponse, null, 2));

            if (executeResponse.error?.message?.includes("AA23")) {
                console.log("\n💡 AA23 Error detected!");
                console.log("   This confirms the issue with migrated wallets + Supertransactions");
                console.log("   Recommendation: Use @biconomy/abstractjs for migrated wallets");
            }

            return;
        }

        console.log("\n✅ Workflow executed!");
        console.log("Execute Response:");
        console.log(JSON.stringify(executeResponse, null, 2));

        // ============================================================================
        // STEP 4: TRACK EXECUTION
        // ============================================================================

        if (executeResponse.data?.workflowId) {
            console.log("\n" + "=".repeat(80));
            console.log("⏳ Step 4: Tracking Workflow Execution...");
            console.log("-".repeat(80));
            console.log(`\nWorkflow ID: ${executeResponse.data.workflowId}`);
            console.log("Tracking URL: https://dashboard.biconomy.io/workflow/" + executeResponse.data.workflowId);

            // Poll for status
            let attempts = 0;
            const maxAttempts = 30;

            while (attempts < maxAttempts) {
                attempts++;

                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s

                try {
                    const statusResponse = await fetch(
                        `${SUPERTRANSACTION_API}/workflow/${executeResponse.data.workflowId}/status`
                    );

                    const statusData = await statusResponse.json();

                    console.log(`\n[Attempt ${attempts}/${maxAttempts}] Status: ${statusData.data?.status || "UNKNOWN"}`);

                    if (statusData.data?.status === "COMPLETED") {
                        console.log("\n✅ Workflow completed successfully!");
                        console.log("Transaction Details:");
                        console.log(JSON.stringify(statusData.data, null, 2));
                        break;
                    } else if (statusData.data?.status === "FAILED") {
                        console.log("\n❌ Workflow failed!");
                        console.log("Failure Details:");
                        console.log(JSON.stringify(statusData.data, null, 2));
                        break;
                    }

                } catch (error: any) {
                    console.log(`  ⚠️  Error checking status: ${error.message}`);
                }
            }

            if (attempts >= maxAttempts) {
                console.log("\n⏱️  Workflow still pending after 90s");
                console.log("   Check status manually at: https://dashboard.biconomy.io");
            }
        }

    } catch (error: any) {
        console.log("❌ Error executing workflow:", error.message);
        return;
    }

    // ============================================================================
    // VERIFY BALANCE CHANGE
    // ============================================================================

    console.log("\n" + "=".repeat(80));
    console.log("🔍 Verifying Balance Change...");
    console.log("-".repeat(80));

    const newBalance = await ethers.provider.getBalance(walletAddress);
    const difference = balance.sub(newBalance);

    console.log(`  Balance before: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`  Balance after:  ${ethers.utils.formatEther(newBalance)} ETH`);
    console.log(`  Difference:     ${ethers.utils.formatEther(difference)} ETH\n`);

    if (difference.gt(0)) {
        console.log("✅ Balance decreased - transaction likely executed!\n");
    } else {
        console.log("⚠️  Balance unchanged - transaction may have failed\n");
    }

    // ============================================================================
    // SAVE RESULTS
    // ============================================================================

    const resultsPath = path.join(__dirname, "supertransaction-api-test-result.json");

    const results = {
        timestamp: new Date().toISOString(),
        network: "base",
        chainId: CHAIN_ID,
        wallet: walletAddress,
        owner: owner.address,
        test: "supertransaction-api",
        quoteRequest,
        quoteResponse,
        executeRequest,
        executeResponse,
        balanceBefore: ethers.utils.formatEther(balance),
        balanceAfter: ethers.utils.formatEther(newBalance),
        difference: ethers.utils.formatEther(difference)
    };

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log("=".repeat(80));
    console.log(`📄 Results saved to: ${resultsPath}`);
    console.log("=".repeat(80));

    console.log("\n🎉 SUPERTRANSACTION API TEST COMPLETE!\n");
}

testMigratedWalletWithSupertransactionAPI().catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
});
