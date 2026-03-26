/**
 * NexusExecutor - Handles transaction execution via Biconomy Nexus (ERC-4337)
 */

import { Signer, Contract, ZeroAddress } from 'ethers';
import {
    createBicoBundlerClient,
    createBicoPaymasterClient,
    toNexusAccount,
    getMEEVersion,
    MEEVersion,
} from '@biconomy/abstractjs';
import { http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { NexusConfig, TransactionRequest, TransactionResult, WalletType } from './types';

export class NexusExecutor {
    private config: NexusConfig;
    private signer: Signer;
    private debug: boolean;

    constructor(config: NexusConfig, signer: Signer, debug: boolean = false) {
        this.config = config;
        this.signer = signer;
        this.debug = debug;
    }

    /**
     * Executes transaction via Nexus (AbstractJS + Biconomy Bundler)
     */
    async executeTransaction(txRequest: TransactionRequest): Promise<TransactionResult> {
        if (this.debug) {
            console.log('[NexusExecutor] 🚀 Executing via Nexus (ERC-4337)...');
            console.log('[NexusExecutor] Transaction request:', JSON.stringify(txRequest, null, 2));
        }

        try {
            // 1. Get private key from signer
            const privateKey = await this.getPrivateKey();

            // 2. Determine chain
            const chain = this.getChain();

            // 3. Create viem account
            const viemAccount = privateKeyToAccount(privateKey as `0x${string}`);

            if (this.debug) {
                console.log(`[NexusExecutor] Viem account: ${viemAccount.address}`);
                console.log(`[NexusExecutor] Chain: ${chain.name} (${chain.id})`);
            }

            // 4. Get version config
            const versionConfig = getMEEVersion(MEEVersion.V2_1_0);

            // 5. Create Nexus account
            const nexusAccount = await toNexusAccount({
                signer: viemAccount,
                chainConfiguration: {
                    chain,
                    transport: http(this.config.rpcUrl),
                    version: versionConfig,
                },
                accountAddress: txRequest.from as `0x${string}`,
            });

            if (this.debug) {
                console.log(`[NexusExecutor] Nexus account created: ${nexusAccount.address}`);
            }

            // 6. Create Bundler client
            const bundlerClient = createBicoBundlerClient({
                chain,
                transport: http(this.config.bundlerUrl),
            });

            if (this.debug) {
                console.log('[NexusExecutor] Bundler client created');
            }

            // 7. Create Paymaster client (optional)
            const paymasterClient = this.config.paymasterUrl
                ? createBicoPaymasterClient({
                    transport: http(this.config.paymasterUrl),
                })
                : undefined;

            if (this.debug && paymasterClient) {
                console.log('[NexusExecutor] Paymaster client created');
            }

            // 8. Prepare transaction call
            const call = {
                to: (txRequest.to || ZeroAddress) as `0x${string}`,
                value: BigInt(txRequest.value?.toString() || '0'),
                data: (txRequest.data || '0x') as `0x${string}`,
            };

            if (this.debug) {
                console.log('[NexusExecutor] Call prepared:', call);
            }

            // 9. Send UserOperation
            const userOpHash = await bundlerClient.sendUserOperation({
                account: nexusAccount,
                calls: [call],
                ...(paymasterClient ? { paymaster: paymasterClient } : {}),
            });

            if (this.debug) {
                console.log(`[NexusExecutor] ✅ UserOp submitted: ${userOpHash}`);
            }

            // 10. Wait for receipt
            const receipt = await bundlerClient.waitForUserOperationReceipt({
                hash: userOpHash,
            });

            if (this.debug) {
                console.log(`[NexusExecutor] ✅ Transaction mined: ${receipt.receipt.transactionHash}`);
            }

            return {
                hash: receipt.receipt.transactionHash,
                walletType: WalletType.MIGRATED_NEXUS,
                executionPath: 'NEXUS',
                timestamp: Date.now(),
            };
        } catch (error) {
            console.error('[NexusExecutor] ❌ Error executing via Nexus:', error);
            throw error;
        }
    }

    /**
     * Extracts private key from ethers Signer
     */
    private async getPrivateKey(): Promise<string> {
        if (this.debug) {
            console.log('[NexusExecutor] 🔑 Getting private key from signer...');
            console.log('[NexusExecutor] Signer type:', this.signer.constructor.name);
            console.log('[NexusExecutor] Has privateKey prop:', 'privateKey' in this.signer);
        }

        // @ts-ignore - Access private key from Wallet
        if ('privateKey' in this.signer) {
            // @ts-ignore
            const pk = this.signer.privateKey as string;
            if (this.debug) {
                console.log('[NexusExecutor] ✅ Private key found');
                // Don't log the actual PK, just first few chars
                console.log('[NexusExecutor] PK preview:', pk.substring(0, 10) + '...');
            }
            return pk;
        }

        // Try to get from signMessage (less ideal but works)
        throw new Error('Signer does not expose private key - cannot use with Nexus');
    }

    /**
     * Determines chain based on config
     */
    private getChain() {
        const chainId = this.config.chainId;

        if (chainId === 8453) {
            return base;
        } else if (chainId === 84532) {
            return baseSepolia;
        }

        // Default to base
        return base;
    }
}

