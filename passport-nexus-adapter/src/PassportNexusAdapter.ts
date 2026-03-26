/**
 * PassportNexusAdapter - Main adapter class
 * 
 * Wraps Passport EVM provider to automatically route transactions to Nexus
 * when wallet has been migrated.
 */

import { WalletDetector } from './WalletDetector';
import { NexusExecutor } from './NexusExecutor';
import {
    EIP1193Provider,
    PassportNexusAdapterConfig,
    RequestArguments,
    TransactionRequest,
    TransactionResult,
    WalletType,
} from './types';

export class PassportNexusAdapter {
    private walletDetector: WalletDetector;
    private nexusExecutor: NexusExecutor;
    private config: PassportNexusAdapterConfig;
    private originalProvider: EIP1193Provider | null = null;

    constructor(config: PassportNexusAdapterConfig) {
        this.config = config;
        this.walletDetector = new WalletDetector(
            config.nexusConfig.rpcUrl,
            config.nexusConfig.nexusImplementation,
            config.debug || false
        );
        this.nexusExecutor = new NexusExecutor(
            config.nexusConfig,
            config.signer,
            config.debug || false
        );
    }

    /**
     * Wraps a Passport EVM provider with Nexus routing capability
     * 
     * @param provider - The Passport EVM provider to wrap
     * @returns Wrapped provider with Nexus routing
     */
    wrapProvider(provider: EIP1193Provider): EIP1193Provider {
        this.originalProvider = provider;

        // Create proxy to intercept request() calls
        return new Proxy(provider, {
            get: (target, prop) => {
                // Intercept request method
                if (prop === 'request') {
                    return async (args: RequestArguments) => {
                        return await this.handleRequest(args, target);
                    };
                }

                // Pass through all other properties/methods
                return (target as any)[prop];
            },
        });
    }

    /**
     * Core routing logic - handles all EIP-1193 requests
     */
    private async handleRequest(
        args: RequestArguments,
        originalProvider: EIP1193Provider
    ): Promise<any> {
        const { method, params } = args;

        // Only intercept eth_sendTransaction
        if (method !== 'eth_sendTransaction') {
            if (this.config.debug) {
                console.log(`[PassportNexusAdapter] Pass-through method: ${method}`);
            }
            return await originalProvider.request(args);
        }

        // Handle eth_sendTransaction with routing
        return await this.handleTransaction(params || [], originalProvider);
    }

    /**
     * Handles eth_sendTransaction with Passport/Nexus routing
     */
    private async handleTransaction(
        params: any[],
        originalProvider: EIP1193Provider
    ): Promise<string> {
        const txRequest: TransactionRequest = params[0];

        if (!txRequest || !txRequest.from) {
            throw new Error('Invalid transaction request: missing "from" field');
        }

        if (this.config.debug) {
            console.log('[PassportNexusAdapter] 🔍 Transaction detected');
            console.log(`[PassportNexusAdapter] From: ${txRequest.from}`);
            console.log(`[PassportNexusAdapter] To: ${txRequest.to}`);
        }

        // 1. Detect wallet type
        const detection = await this.walletDetector.detectWalletType(txRequest.from);

        if (this.config.debug) {
            console.log(`[PassportNexusAdapter] Wallet type: ${detection.type}`);
        }

        // 2. Route based on wallet type
        if (detection.type === WalletType.MIGRATED_NEXUS) {
            console.log('[PassportNexusAdapter] 📦 Routing to Nexus flow (AbstractJS + Bundler)');

            try {
                const result = await this.nexusExecutor.executeTransaction(txRequest);

                if (this.config.debug) {
                    console.log(`[PassportNexusAdapter] ✅ Nexus execution complete: ${result.hash}`);
                }

                return result.hash;
            } catch (error) {
                console.error('[PassportNexusAdapter] ❌ Nexus execution failed:', error);
                throw error;
            }
        } else if (detection.type === WalletType.NATIVE_PASSPORT) {
            console.log('[PassportNexusAdapter] 🏛️ Routing to Passport native flow');

            try {
                const result = await originalProvider.request({
                    method: 'eth_sendTransaction',
                    params: [txRequest],
                });

                if (this.config.debug) {
                    console.log(`[PassportNexusAdapter] ✅ Passport execution complete: ${result}`);
                }

                return result;
            } catch (error) {
                console.error('[PassportNexusAdapter] ❌ Passport execution failed:', error);
                throw error;
            }
        } else {
            // UNKNOWN wallet - try Passport flow as fallback
            console.warn('[PassportNexusAdapter] ⚠️ Unknown wallet type, using Passport flow as fallback');
            return await originalProvider.request({
                method: 'eth_sendTransaction',
                params: [txRequest],
            });
        }
    }

    /**
     * Clears wallet type cache (useful after migration)
     */
    clearCache(walletAddress?: string): void {
        this.walletDetector.clearCache(walletAddress);
    }

    /**
     * Gets cached wallet detection result
     */
    getCachedWalletType(walletAddress: string) {
        return this.walletDetector.getCached(walletAddress);
    }
}

