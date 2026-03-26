/**
 * wallet-loader.ts
 * 
 * Helper to load migrated wallet information from migration-result.json
 */

import * as fs from "fs";
import * as path from "path";

export interface MigratedWalletInfo {
    walletAddress: string;
    owner: string;
    migrationTxHash?: string;
    timestamp?: string;
    nexusImplementation?: string;
}

/**
 * Loads wallet information from migration-result.json
 * 
 * @throws Error if migration-result.json doesn't exist
 */
export function loadMigratedWallet(): MigratedWalletInfo {
    const migrationPath = path.join(__dirname, "../../migration-result.json");

    if (!fs.existsSync(migrationPath)) {
        throw new Error(
            "migration-result.json not found!\n" +
            "Please run the migration scripts first:\n" +
            "  1. npx hardhat run scripts/biconomy-migration/02-deploy-test-passport-wallet.ts --network base_sepolia\n" +
            "  2. npx hardhat run scripts/biconomy-migration/03-migrate-passport-to-nexus.ts --network base_sepolia"
        );
    }

    const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));

    return {
        walletAddress: migration.walletAddress,
        owner: migration.owner,
        migrationTxHash: migration.migrationTxHash,
        timestamp: migration.timestamp,
        nexusImplementation: migration.nexusImplementation,
    };
}

/**
 * Validates that wallet information is complete
 */
export function validateWalletInfo(wallet: MigratedWalletInfo): void {
    if (!wallet.walletAddress || !wallet.owner) {
        throw new Error("Invalid wallet information in migration-result.json");
    }
}

/**
 * Prints wallet information in a formatted way
 */
export function printWalletInfo(wallet: MigratedWalletInfo): void {
    console.log("📋 Wallet Info:");
    console.log(`  Address: ${wallet.walletAddress}`);
    console.log(`  Owner:   ${wallet.owner}`);
    if (wallet.timestamp) {
        console.log(`  Migrated: ${new Date(wallet.timestamp).toLocaleString()}`);
    }
    if (wallet.migrationTxHash) {
        console.log(`  TX Hash: ${wallet.migrationTxHash}`);
    }
    console.log();
}

