/**
 * Integration Example with Passport Sample App
 * 
 * Shows how to integrate PassportNexusAdapter in the Passport sample app
 */

import React, { useEffect, useState } from 'react';
import { usePassport } from '../context/PassportProvider';
import { PassportNexusAdapter } from '@immutable/passport-nexus-adapter';
import { Wallet } from 'ethers';

// Add to your PassportProvider context or hooks
export function usePassportWithNexus() {
    const [wrappedProvider, setWrappedProvider] = useState<any>(null);
    const { passport } = usePassport();

    useEffect(() => {
        async function setupAdapter() {
            if (!passport) return;

            // 1. Get Passport EVM provider
            const passportProvider = await passport.connectEvm();

            // 2. Create signer (you should get this from your auth flow)
            // For demo purposes, we're using a hardcoded wallet
            // In production, derive this from user's authentication
            const signer = new Wallet(process.env.NEXT_PUBLIC_OWNER_PK!);

            // 3. Create adapter
            const adapter = new PassportNexusAdapter({
                nexusConfig: {
                    nexusImplementation: '0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90',
                    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
                    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL!,
                    paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL,
                    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453),
                },
                signer,
                debug: process.env.NODE_ENV === 'development',
            });

            // 4. Wrap provider
            const wrapped = adapter.wrapProvider(passportProvider);
            setWrappedProvider(wrapped);
        }

        setupAdapter();
    }, [passport]);

    return { provider: wrappedProvider };
}

// Example usage in a component
export function TransferButton() {
    const { provider } = usePassportWithNexus();
    const [loading, setLoading] = useState(false);

    const handleTransfer = async () => {
        if (!provider) {
            alert('Provider not ready');
            return;
        }

        setLoading(true);

        try {
            // Get accounts
            const accounts = await provider.request({
                method: 'eth_requestAccounts',
            });

            // Send transaction
            // Adapter automatically detects if wallet is migrated and routes accordingly
            const txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: accounts[0],
                    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                    value: '0x9184e72a000', // 0.00001 ETH
                }],
            });

            alert(`Transaction sent: ${txHash}`);
        } catch (error) {
            console.error('Transfer failed:', error);
            alert(`Transfer failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button onClick={handleTransfer} disabled={loading || !provider}>
            {loading ? 'Sending...' : 'Transfer ETH'}
        </button>
    );
}

/**
 * How to integrate in existing sample-app:
 * 
 * 1. Install adapter:
 *    npm install @immutable/passport-nexus-adapter
 * 
 * 2. In your PassportProvider context, wrap the provider:
 *    const passportProvider = await passport.connectEvm();
 *    const adapter = new PassportNexusAdapter({...config});
 *    const wrappedProvider = adapter.wrapProvider(passportProvider);
 *    // Use wrappedProvider everywhere instead of passportProvider
 * 
 * 3. All existing components work without changes!
 *    - Transfer IMX
 *    - Transfer ERC20
 *    - NFT Transfer
 *    - Seaport purchases
 *    - etc.
 * 
 * The adapter transparently routes to Nexus when wallet is migrated.
 */

