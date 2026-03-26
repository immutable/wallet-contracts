/**
 * Types for PassportNexusAdapter
 */

import { Signer } from 'ethers';

/**
 * EIP-1193 Provider interface (compatible with Passport)
 */
export interface EIP1193Provider {
    request(args: { method: string; params?: any[] }): Promise<any>;
    on?(event: string, listener: (...args: any[]) => void): void;
    removeListener?(event: string, listener: (...args: any[]) => void): void;
    isPassport?: boolean;
}

/**
 * Request arguments for EIP-1193 request method
 */
export interface RequestArguments {
    method: string;
    params?: any[];
}

/**
 * Transaction request format (eth_sendTransaction params)
 */
export interface TransactionRequest {
    from: string;
    to?: string;
    value?: string | bigint;
    data?: string;
    gas?: string | bigint;
    gasPrice?: string | bigint;
    maxFeePerGas?: string | bigint;
    maxPriorityFeePerGas?: string | bigint;
    nonce?: string | number;
    chainId?: number;
}

/**
 * Wallet type detection result
 */
export enum WalletType {
    NATIVE_PASSPORT = 'NATIVE_PASSPORT',
    MIGRATED_NEXUS = 'MIGRATED_NEXUS',
    UNKNOWN = 'UNKNOWN',
}

/**
 * Configuration for Nexus flow
 */
export interface NexusConfig {
    /** Nexus implementation address to check against */
    nexusImplementation: string;
    /** RPC URL for the target chain */
    rpcUrl: string;
    /** Biconomy bundler URL */
    bundlerUrl: string;
    /** Optional: Paymaster URL for gas sponsorship */
    paymasterUrl?: string;
    /** Optional: Chain ID (defaults to provider's chainId) */
    chainId?: number;
}

/**
 * Configuration for PassportNexusAdapter
 */
export interface PassportNexusAdapterConfig {
    /** Nexus configuration for routing migrated wallets */
    nexusConfig: NexusConfig;
    /** Signer for signing transactions/UserOps */
    signer: Signer;
    /** Enable debug logging */
    debug?: boolean;
}

/**
 * Wallet detection result with metadata
 */
export interface WalletDetectionResult {
    type: WalletType;
    address: string;
    implementation?: string;
    timestamp: number;
}

/**
 * Transaction execution result
 */
export interface TransactionResult {
    hash: string;
    walletType: WalletType;
    executionPath: 'PASSPORT' | 'NEXUS';
    timestamp: number;
}

