/**
 * nexus-client.ts
 * 
 * Factory functions to create Nexus account and clients (Bundler, Paymaster)
 */

import {
    createBicoBundlerClient,
    createBicoPaymasterClient,
    toNexusAccount,
    getMEEVersion,
    MEEVersion,
} from "@biconomy/abstractjs";
import { http } from "viem";
import { baseSepolia, base } from "viem/chains";
import type { PrivateKeyAccount } from "viem/accounts";
import { ethers } from "hardhat";

export interface NexusClientConfig {
    owner: PrivateKeyAccount;
    walletAddress: string;
    rpcUrl: string;
    bundlerUrl: string;
    paymasterApiKey?: string;
    version?: MEEVersion;
}

export interface NexusClients {
    account: any;
    bundlerClient: any;
    paymasterClient?: any;
    version: MEEVersion;
}

/**
 * Creates a complete set of Nexus clients (Account + Bundler + Paymaster)
 * 
 * @param config Configuration for creating clients
 * @returns Object containing all initialized clients
 */
export async function createNexusClients(config: NexusClientConfig): Promise<NexusClients> {
    const {
        owner,
        walletAddress,
        rpcUrl,
        bundlerUrl,
        paymasterApiKey,
        version = MEEVersion.V2_2_0, // Default to experimental v2.2.0
    } = config;

    // Get version info
    const versionConfig = getMEEVersion(version);

    // Auto-detect network
    const network = await ethers.provider.getNetwork();
    const viemChain = network.chainId === 8453 ? base : baseSepolia;

    console.log("🚀 Creating Nexus Account (AbstractJS)...");
    console.log(`  Network: ${viemChain.name} (${network.chainId})`);
    console.log(`  MEE Version: ${version}`);
    console.log(`  Account ID: ${versionConfig.accountId}\n`);

    // Create Nexus account
    const nexusAccount = await toNexusAccount({
        signer: owner,
        chainConfiguration: {
            chain: viemChain,
            // CRITICAL: Don't pass rpcUrl to http()!
            // Passing rpcUrl causes SDK to include factory/factoryData in UserOps
            // which triggers AA10 error for already-deployed wallets
            transport: http(), // Let SDK use default Hardhat provider
            version: versionConfig, // Use versionConfig object, not version enum
        },
        accountAddress: walletAddress as `0x${string}`,
        // NOTE: Don't use deployedOnChains - SDK auto-detects if wallet is deployed!
    });

    console.log(`  ✅ Nexus account created`);
    console.log(`  Address: ${nexusAccount.address}\n`);

    // Create bundler client
    console.log("🚀 Creating Bundler Client...");
    const bundlerClient = createBicoBundlerClient({
        account: nexusAccount,
        transport: http(bundlerUrl),
    });
    console.log(`  ✅ Bundler client created\n`);

    // Create paymaster client (optional)
    let paymasterClient = undefined;
    if (paymasterApiKey) {
        console.log("🚀 Creating Paymaster Client...");
        const chainId = baseSepolia.id;
        paymasterClient = createBicoPaymasterClient({
            transport: http(`https://paymaster.biconomy.io/api/v2/${chainId}/${paymasterApiKey}`),
        });
        console.log(`  ✅ Paymaster client created`);
        console.log(`  API Key: ${paymasterApiKey.substring(0, 10)}...\n`);
    }

    return {
        account: nexusAccount,
        bundlerClient,
        paymasterClient,
        version,
    };
}

/**
 * Creates only bundler client (without paymaster)
 * Useful for scenarios that don't need gas sponsorship
 */
export async function createBundlerOnly(config: Omit<NexusClientConfig, 'paymasterApiKey'>): Promise<{
    account: any;
    bundlerClient: any;
}> {
    const clients = await createNexusClients(config);
    return {
        account: clients.account,
        bundlerClient: clients.bundlerClient,
    };
}

/**
 * Prints client configuration info
 */
export function printClientInfo(config: NexusClientConfig): void {
    console.log("📋 Client Configuration:");
    console.log(`  Owner EOA: ${config.owner.address}`);
    console.log(`  Wallet:    ${config.walletAddress}`);
    console.log(`  Bundler:   ${config.bundlerUrl}`);
    console.log(`  Paymaster: ${config.paymasterApiKey ? "✅ Enabled" : "❌ Disabled"}\n`);
}

