/**
 * Basic Usage Example
 * 
 * Shows how to wrap a Passport provider with PassportNexusAdapter
 */

import { passport } from '@imtbl/sdk';
import { Wallet } from 'ethers';
import { PassportNexusAdapter } from '@immutable/passport-nexus-adapter';

async function main() {
    // 1. Initialize Passport (existing code - no changes)
    const passportInstance = new passport.Passport({
        clientId: 'your-client-id',
        redirectUri: 'http://localhost:3000/callback',
        logoutRedirectUri: 'http://localhost:3000',
        audience: 'platform_api',
        scope: 'openid offline_access email transact',
    });

    // 2. Get Passport EVM provider (existing code)
    const passportProvider = passportInstance.connectEvm();

    // 3. Create signer (user's EOA)
    const signer = new Wallet('0x...your-private-key');

    // 4. Create adapter with Nexus config
    const adapter = new PassportNexusAdapter({
        nexusConfig: {
            nexusImplementation: '0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90', // Nexus impl address
            rpcUrl: 'https://mainnet.base.org',
            bundlerUrl: 'https://bundler.biconomy.io/api/v3/84531/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44',
            paymasterUrl: 'https://paymaster.biconomy.io/api/v2/84531/...',
            chainId: 8453, // Base Mainnet
        },
        signer,
        debug: true, // Enable debug logging
    });

    // 5. Wrap Passport provider
    const wrappedProvider = adapter.wrapProvider(passportProvider);

    // 6. Use wrapped provider normally
    // The adapter will automatically route to Nexus if wallet is migrated
    const accounts = await wrappedProvider.request({
        method: 'eth_requestAccounts',
    });

    console.log('Connected accounts:', accounts);

    // 7. Send transaction (automatically routed)
    const txHash = await wrappedProvider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: accounts[0],
            to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            value: '0x9184e72a000', // 0.00001 ETH
            data: '0x',
        }],
    });

    console.log('Transaction hash:', txHash);
    console.log('✅ Transaction routed and executed successfully!');
}

main().catch(console.error);

