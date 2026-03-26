import { BiconomySmartAccountV2 } from "@biconomy/account";
import { Address } from "viem";

export interface MigrationResult {
    originalAddress: Address;
    success: boolean;
    transactionHash?: string;
    error?: string;
}

export interface MigrationContext {
    account: BiconomySmartAccountV2;
    accountAddress: Address;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}
