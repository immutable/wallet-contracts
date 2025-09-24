import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file from project root
dotenv.config({ path: resolve(__dirname, '../../../.env') });

/**
 * Script to check if all required environment variables are set
 */
const requiredEnvVars = {
    'Step 1': [
        'MULTICALL_ADMIN_PUB_KEY',
        'FACTORY_ADMIN_PUB_KEY'
    ],
    'Step 2': [
        'WALLET_IMPL_LOCATOR_ADMIN',
        'WALLET_IMPL_CHANGER_ADMIN'
    ],
    'Step 4': [
        'ENTRY_POINT_ADDRESS',
        'DEFAULT_VALIDATOR_ADDRESS'
    ],
    'Step 5': [
        'SIGNER_ROOT_ADMIN_PUB_KEY',
        'SIGNER_ADMIN_PUB_KEY'
    ],
    'Step 6': [
        'GAS_LIMIT',
        'MAX_FEE_PER_GAS',
        'MAX_PRIORITY_FEE_PER_GAS'
    ]
};

let hasError = false;

console.log('Checking environment variables from .env file...\n');

for (const [step, vars] of Object.entries(requiredEnvVars)) {
    console.log(`${step}:`);
    for (const varName of vars) {
        const value = process.env[varName];
        if (!value) {
            console.log(`  ❌ ${varName} is not set`);
            hasError = true;
        } else {
            // Mask the full value for security
            const maskedValue = value.length > 10
                ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}`
                : value;
            console.log(`  ✅ ${varName} = ${maskedValue}`);
        }
    }
    console.log('');
}

if (hasError) {
    console.error('\n❌ Some required environment variables are missing');
    console.error('Note: Make sure you have all variables set in your .env file');
    process.exit(1);
} else {
    console.log('\n✅ All required environment variables are set');
    process.exit(0);
}