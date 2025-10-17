/**
 * test-helpers.ts
 * 
 * Common utility functions for test scenarios
 */

import { ethers } from "hardhat";
import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";

/**
 * Creates a public client for Base (auto-detects mainnet/testnet)
 */
export function createBaseSepoliaClient(rpcUrl?: string) {
    // Auto-detect network from hardhat provider
    const network = ethers.provider.network;
    const isMainnet = network?.chainId === 8453;

    return createPublicClient({
        chain: isMainnet ? base : baseSepolia,
        transport: http(rpcUrl || (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org")),
    });
}

/**
 * Loads private key from environment and creates account
 */
export function loadOwnerAccount() {
    let privateKeyRaw = process.env.MIGRATION_TEST_OWNER_PK;
    if (!privateKeyRaw) {
        privateKeyRaw = process.env.BASE_SEPOLIA_PRIVATE_KEY || process.env.COLD_WALLET_PRIVATE_KEY;
    }

    if (!privateKeyRaw) {
        throw new Error(
            "Private key not found in environment.\n" +
            "Please set one of: MIGRATION_TEST_OWNER_PK, BASE_SEPOLIA_PRIVATE_KEY, COLD_WALLET_PRIVATE_KEY"
        );
    }

    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;
    return privateKeyToAccount(privateKey as `0x${string}`);
}

/**
 * Validates that owner matches expected address
 */
export function validateOwner(ownerAddress: string, expectedAddress: string): void {
    if (ownerAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        throw new Error(
            `Signer mismatch!\n` +
            `  Expected: ${expectedAddress}\n` +
            `  Got:      ${ownerAddress}`
        );
    }
}

/**
 * Checks and prints wallet balance
 */
export async function checkBalance(
    publicClient: any,
    address: string,
    label: string = "Balance"
): Promise<bigint> {
    // Use ethers provider directly for correct network
    const balance = await ethers.provider.getBalance(address);
    const balanceBigInt = BigInt(balance.toString());

    console.log(`  ${label}: ${ethers.utils.formatEther(balance)} ETH`);
    return balanceBigInt;
}

/**
 * Checks if wallet has sufficient balance
 */
export async function ensureSufficientBalance(
    publicClient: any,
    address: string,
    minBalance: bigint = 0n
): Promise<void> {
    // Use ethers provider directly for correct network
    const balance = await ethers.provider.getBalance(address);
    const balanceBigInt = BigInt(balance.toString());

    if (balanceBigInt <= minBalance) {
        throw new Error(
            `Insufficient balance!\n` +
            `  Address: ${address}\n` +
            `  Balance: ${ethers.utils.formatEther(balance)} ETH\n` +
            `  Required: ${ethers.utils.formatEther(minBalance.toString())} ETH`
        );
    }
}

/**
 * Waits for UserOperation receipt and prints result
 */
export async function waitForUserOp(
    bundlerClient: any,
    userOpHash: string,
    label: string = "Transaction"
): Promise<any> {
    console.log(`  ✅ UserOp Hash: ${userOpHash}`);
    console.log(`  ⏳ Waiting for ${label.toLowerCase()} confirmation...\n`);

    const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
    });

    console.log(`  ✅ ${label} confirmed!`);
    console.log(`  TX Hash: ${receipt.receipt.transactionHash}`);
    console.log(`  Block:   ${receipt.receipt.blockNumber}`);
    console.log(`  Status:  ${receipt.success ? "✅ SUCCESS" : "❌ FAILED"}\n`);

    return receipt;
}

/**
 * Saves test result to JSON file
 */
export function saveTestResult(filename: string, data: any): void {
    const resultPath = path.join(__dirname, "..", filename);
    fs.writeFileSync(resultPath, JSON.stringify(data, null, 2));
    console.log(`  Result saved to: ${filename}\n`);
}

/**
 * Prints separator line
 */
export function printSeparator(): void {
    console.log("=".repeat(80));
}

/**
 * Prints section header
 */
export function printSection(title: string): void {
    console.log("\n" + "=".repeat(80));
    console.log(title);
    console.log("=".repeat(80) + "\n");
}

/**
 * Formats duration in seconds
 */
export function formatDuration(startTime: number, endTime: number): string {
    const duration = (endTime - startTime) / 1000;
    return `${duration.toFixed(2)}s`;
}

/**
 * Gets explorer URL for transaction
 */
export function getExplorerUrl(txHash: string, chainId: number = 84532): string {
    const explorers: { [key: number]: string } = {
        84532: "https://sepolia.basescan.org", // Base Sepolia
        8453: "https://basescan.org",          // Base Mainnet
    };

    const explorer = explorers[chainId] || explorers[84532];
    return `${explorer}/tx/${txHash}`;
}

/**
 * Prints test summary
 */
export function printTestSummary(
    scenarioName: string,
    success: boolean,
    details?: Record<string, any>
): void {
    printSeparator();
    console.log(`\n${success ? "✅" : "❌"} TEST ${success ? "COMPLETED SUCCESSFULLY" : "FAILED"}!\n`);
    console.log(`  Scenario: ${scenarioName}`);

    if (details) {
        Object.entries(details).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    }

    console.log();
    printSeparator();
}

/**
 * Gets environment variable or throws error
 */
export function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Required environment variable not found: ${name}`);
    }
    return value;
}

/**
 * Gets optional environment variable with default
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
    return process.env[name] || defaultValue;
}

