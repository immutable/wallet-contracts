/**
 * 03-nft-transfer.ts
 * 
 * Complete NFT flow: Deploy, Mint, and Transfer NFT to migrated wallet
 * 
 * This script demonstrates full NFT interaction using a migrated Passport wallet:
 * 1. Deploy TestNFT contract (ERC721)
 * 2. Mint NFT to deployer
 * 3. Transfer NFT to migrated wallet via Biconomy UserOperation
 * 4. Verify ownership
 * 
 * NOTE: OpenSea Testnet was discontinued in 2024
 * Source: https://support.opensea.io/en/articles/11833955-farewell-testnets
 * 
 * This is why we deploy our own NFT instead of buying via Seaport.
 * 
 * REFACTORED: Unified from nft-flow/01 and nft-flow/02
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { encodeFunctionData } from "viem";
import {
    loadMigratedWallet,
    printWalletInfo,
    loadOwnerAccount,
    validateOwner,
    createNexusClients,
    waitForUserOp,
    printSeparator,
    printSection,
    getExplorerUrl,
    saveTestResult,
    printTestSummary,
    getRequiredEnv,
} from "./utils";

// Minimal ERC721 ABI (viem format)
const ERC721_ABI = [
    {
        name: "safeTransferFrom",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "tokenId", type: "uint256" },
        ],
        outputs: [],
    },
] as const;

async function nftTransfer() {
    console.log("\n🎨 Sample App - Scenario 3: NFT Transfer\n");
    printSeparator();

    // ========================================================================
    // STEP 1: DEPLOY NFT CONTRACT
    // ========================================================================

    printSection("STEP 1: Deploy Test NFT Contract");

    const [deployer] = await ethers.getSigners();
    console.log(`  Deployer: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`  Balance:  ${ethers.utils.formatEther(balance)} ETH\n`);

    const nftName = "Sample App Test NFT";
    const nftSymbol = "SATNFT";
    const baseURI = "ipfs://QmTest/";

    console.log("  NFT Configuration:");
    console.log(`    Name:    ${nftName}`);
    console.log(`    Symbol:  ${nftSymbol}`);
    console.log(`    BaseURI: ${baseURI}\n`);

    console.log("  📤 Deploying TestNFT contract...\n");

    const TestNFT = await ethers.getContractFactory("TestNFT");
    const nft = await TestNFT.deploy(nftName, nftSymbol, baseURI);

    console.log("  ⏳ Waiting for deployment...");
    await nft.deployed();

    console.log(`  ✅ TestNFT deployed to: ${nft.address}\n`);

    console.log("  ⏳ Waiting for confirmations...");
    await nft.deployTransaction.wait(2);
    console.log("  ✅ Confirmed!\n");

    printSeparator();

    // ========================================================================
    // STEP 2: LOAD MIGRATED WALLET
    // ========================================================================

    printSection("STEP 2: Load Migrated Wallet");

    const wallet = loadMigratedWallet();
    printWalletInfo(wallet);

    const owner = loadOwnerAccount();
    console.log(`  Owner Signer: ${owner.address}\n`);

    validateOwner(owner.address, wallet.owner);
    console.log("  ✅ Owner validation passed\n");
    printSeparator();

    // ========================================================================
    // STEP 3: MINT NFT
    // ========================================================================

    printSection("STEP 3: Mint NFT");

    console.log(`  Minting to: ${deployer.address}\n`);

    console.log("  📤 Calling mint()...");
    const mintTx = await nft.connect(deployer).mint(deployer.address);

    console.log(`  ⏳ Waiting for confirmation...`);
    const mintReceipt = await mintTx.wait();

    console.log(`  ✅ NFT Minted!`);
    console.log(`  TX Hash: ${mintReceipt.transactionHash}`);

    // Get the tokenId from the Transfer event
    const transferEvent = mintReceipt.events?.find((e: any) => e.event === "Transfer");
    const tokenId = transferEvent?.args?.tokenId?.toNumber() || 0;
    console.log(`  Token ID: ${tokenId}\n`);

    // Verify ownership
    const ownerOfToken = await nft.ownerOf(tokenId);
    console.log(`  ✅ Verified: NFT #${tokenId} owned by ${ownerOfToken}\n`);
    printSeparator();

    // ========================================================================
    // STEP 4: CREATE BICONOMY CLIENTS
    // ========================================================================

    printSection("STEP 4: Setup Biconomy Clients");

    const bundlerUrl = getRequiredEnv("NEXUS_BUNDLER_URL");
    // IMPORTANT: Don't use paymaster for already-deployed wallets!
    const paymasterApiKey = undefined; // Disabled for migrated wallets

    const clients = await createNexusClients({
        owner,
        walletAddress: wallet.walletAddress,
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
        bundlerUrl,
        paymasterApiKey,
    });

    printSeparator();

    // ========================================================================
    // STEP 5: TRANSFER NFT VIA USEROPERATION
    // ========================================================================

    printSection("STEP 5: Transfer NFT to Migrated Wallet");

    console.log("  Transaction Details:");
    console.log(`    NFT Contract: ${nft.address}`);
    console.log(`    Token ID:     ${tokenId}`);
    console.log(`    From:         ${deployer.address}`);
    console.log(`    To:           ${wallet.walletAddress}\n`);

    // First, approve the migrated wallet to transfer the NFT
    console.log("  📝 Step 5a: Approve wallet to transfer NFT...");
    const approveTx = await nft.connect(deployer).approve(wallet.walletAddress, tokenId);
    await approveTx.wait();
    console.log(`  ✅ Approval granted!\n`);

    // Encode the safeTransferFrom call
    console.log("  📝 Step 5b: Prepare NFT transfer via UserOperation...");

    const transferCallData = encodeFunctionData({
        abi: ERC721_ABI,
        functionName: "safeTransferFrom",
        args: [deployer.address as `0x${string}`, wallet.walletAddress as `0x${string}`, BigInt(tokenId)],
    });

    console.log("  📤 Sending UserOperation (NFT Transfer)...\n");

    const startTime = Date.now();

    const userOpHash = await clients.bundlerClient.sendUserOperation({
        calls: [
            {
                to: nft.address as `0x${string}`,
                value: 0n,
                data: transferCallData,
            },
        ],
    });

    console.log(`  ✅ UserOp Hash: ${userOpHash}`);
    console.log(`  ⏳ Waiting for NFT transfer confirmation...\n`);

    const receipt = await waitForUserOp(clients.bundlerClient, userOpHash, "NFT Transfer");

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    printSeparator();

    // ========================================================================
    // STEP 6: VERIFY NFT OWNERSHIP
    // ========================================================================

    printSection("STEP 6: Verify Final NFT Ownership");

    const finalOwner = await nft.ownerOf(tokenId);
    console.log(`  NFT #${tokenId} Owner: ${finalOwner}\n`);

    if (finalOwner.toLowerCase() === wallet.walletAddress.toLowerCase()) {
        console.log(`  ✅ SUCCESS! NFT is now owned by migrated wallet!\n`);
    } else {
        console.log(`  ❌ ERROR: NFT owner doesn't match!\n`);
    }

    const nftBalance = await nft.balanceOf(wallet.walletAddress);
    console.log(`  Wallet NFT Balance: ${nftBalance.toString()}\n`);

    printSeparator();

    // ========================================================================
    // SAVE RESULT
    // ========================================================================

    const result = {
        scenario: "NFT Transfer",
        timestamp: new Date().toISOString(),
        nftContract: nft.address,
        nftName: nftName,
        nftSymbol: nftSymbol,
        tokenId: tokenId,
        deployer: deployer.address,
        recipient: wallet.walletAddress,
        mintTxHash: mintReceipt.transactionHash,
        transferUserOpHash: userOpHash,
        transferTxHash: receipt.receipt.transactionHash,
        finalOwner: finalOwner,
        success: receipt.success && finalOwner.toLowerCase() === wallet.walletAddress.toLowerCase(),
        duration: `${duration}s`,
        nftExplorer: `${getExplorerUrl("", 84532).replace("/tx/", "")}/nft/${nft.address}/${tokenId}`,
        txExplorer: getExplorerUrl(receipt.receipt.transactionHash, 84532),
    };

    saveTestResult("03-result.json", result);

    printTestSummary("NFT Transfer", result.success, {
        "NFT Contract": nft.address,
        "Token ID": tokenId.toString(),
        "Final Owner": finalOwner,
        "Duration": `${duration}s`,
        "TX Hash": receipt.receipt.transactionHash,
        "View NFT": result.nftExplorer,
    });
}

nftTransfer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ NFT transfer failed:", error.message || error);
        process.exit(1);
    });

