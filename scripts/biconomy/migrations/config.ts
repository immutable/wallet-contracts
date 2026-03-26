import { baseSepolia } from "viem/chains";
import { getMEEVersion, MEEVersion } from "@biconomy/abstractjs";
import dotenv from "dotenv";

dotenv.config();

// Use the latest stable version of MEE
const version = MEEVersion.V2_1_0;
const versionConfig = getMEEVersion(version);

export interface BiconomyConfig {
    // Chain and network information
    chain: typeof baseSepolia;

    // EOA credentials
    eoaPrivateKey: string;
    eoaAddress: string;

    // Biconomy infrastructure URLs
    v2BundlerUrl: string;
    nexusBundlerUrl: string;

    // API keys
    paymasterApiKey: string;

    // Nexus contract addresses
    nexusImplementationAddress: string;
    nexusBootstrapAddress: string;
}

// Validate environment variables
function validateEnv(): void {
    const required = [
        "DEPLOYER_PRIV_KEY",
        "DEPLOYER_CONTRACT_ADDRESS",
        "V2_BUNDLER_URL",
        "NEXUS_BUNDLER_URL",
        "PAYMASTER_API_KEY"
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
}

// Load and validate configuration
export function loadConfig(): BiconomyConfig {
    validateEnv();

    return {
        chain: baseSepolia,
        eoaPrivateKey: process.env.DEPLOYER_PRIV_KEY!,
        eoaAddress: process.env.DEPLOYER_CONTRACT_ADDRESS!,
        v2BundlerUrl: process.env.V2_BUNDLER_URL!,
        nexusBundlerUrl: process.env.NEXUS_BUNDLER_URL!,
        paymasterApiKey: process.env.PAYMASTER_API_KEY!,
        nexusImplementationAddress: versionConfig.implementationAddress,
        nexusBootstrapAddress: versionConfig.bootStrapAddress,
    };
}