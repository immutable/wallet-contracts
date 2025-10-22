/**
 * WalletDetector - Detects if wallet has been migrated to Nexus
 */

import { JsonRpcProvider } from 'ethers';
import { NexusConfig, WalletDetectionResult, WalletType } from './types';

export class WalletDetector {
    private provider: JsonRpcProvider;
    private nexusImplementation: string;
    private cache: Map<string, WalletDetectionResult>;
    private debug: boolean;

    constructor(rpcUrl: string, nexusImplementation: string, debug: boolean = false) {
        this.provider = new JsonRpcProvider(rpcUrl);
        this.nexusImplementation = nexusImplementation.toLowerCase();
        this.cache = new Map();
        this.debug = debug;
    }

    /**
     * Detects wallet type by checking implementation address in storage
     */
    async detectWalletType(walletAddress: string): Promise<WalletDetectionResult> {
        // Check cache first
        const cached = this.cache.get(walletAddress.toLowerCase());
        if (cached) {
            if (this.debug) {
                console.log(`[WalletDetector] Cache hit for ${walletAddress}: ${cached.type}`);
            }
            return cached;
        }

        try {
            // Read implementation address from storage slot
            // Passport wallets store implementation at storage[walletAddress]
            const implSlot = await this.provider.getStorage(walletAddress, walletAddress);

            if (!implSlot || implSlot === '0x' || implSlot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                if (this.debug) {
                    console.log(`[WalletDetector] No implementation found for ${walletAddress} - likely not deployed`);
                }

                const result: WalletDetectionResult = {
                    type: WalletType.UNKNOWN,
                    address: walletAddress,
                    timestamp: Date.now(),
                };

                this.cache.set(walletAddress.toLowerCase(), result);
                return result;
            }

            // Extract address from storage slot (last 20 bytes)
            const implAddress = '0x' + implSlot.slice(-40);
            const normalizedImplAddress = implAddress.toLowerCase();

            if (this.debug) {
                console.log(`[WalletDetector] Implementation at ${walletAddress}: ${implAddress}`);
                console.log(`[WalletDetector] Nexus implementation: ${this.nexusImplementation}`);
            }

            // Check if implementation is Nexus
            const isNexus = normalizedImplAddress === this.nexusImplementation;

            const walletType = isNexus ? WalletType.MIGRATED_NEXUS : WalletType.NATIVE_PASSPORT;

            const result: WalletDetectionResult = {
                type: walletType,
                address: walletAddress,
                implementation: implAddress,
                timestamp: Date.now(),
            };

            // Cache result
            this.cache.set(walletAddress.toLowerCase(), result);

            if (this.debug) {
                console.log(`[WalletDetector] ✅ Detected ${walletAddress}: ${walletType}`);
            }

            return result;
        } catch (error) {
            console.error(`[WalletDetector] Error detecting wallet type for ${walletAddress}:`, error);

            const result: WalletDetectionResult = {
                type: WalletType.UNKNOWN,
                address: walletAddress,
                timestamp: Date.now(),
            };

            return result;
        }
    }

    /**
     * Clears the cache for a specific wallet or all wallets
     */
    clearCache(walletAddress?: string): void {
        if (walletAddress) {
            this.cache.delete(walletAddress.toLowerCase());
            if (this.debug) {
                console.log(`[WalletDetector] Cache cleared for ${walletAddress}`);
            }
        } else {
            this.cache.clear();
            if (this.debug) {
                console.log('[WalletDetector] Cache cleared for all wallets');
            }
        }
    }

    /**
     * Gets cached result if available
     */
    getCached(walletAddress: string): WalletDetectionResult | undefined {
        return this.cache.get(walletAddress.toLowerCase());
    }
}

