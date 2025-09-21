import { encodeFunctionData, encodeAbiParameters, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
    createSmartAccountClient as createV2Client,
    PaymasterMode
} from "@biconomy/account";
import {
    createBicoBundlerClient,
    toNexusAccount,
    getMEEVersion,
    MEEVersion
} from "@biconomy/abstractjs";
import { loadConfig } from "./config";
import { MigrationResult, MigrationContext, ValidationResult } from "./types";

async function setupV2Account(): Promise<MigrationContext> {
    const config = loadConfig();

    // Connect to EOA
    const eoaAccount = privateKeyToAccount(config.eoaPrivateKey as `0x${string}`);
    const client = createWalletClient({
        account: eoaAccount,
        chain: config.chain,
        transport: http(),
    });

    // Connect to V2 smart account
    const V2Account = await createV2Client({
        signer: client,
        biconomyPaymasterApiKey: config.paymasterApiKey,
        bundlerUrl: config.v2BundlerUrl,
    });

    const accountAddress = await V2Account.getAccountAddress();

    return {
        account: V2Account,
        accountAddress: accountAddress as `0x${string}`,
    };
}

async function validateAndDeployIfNeeded(context: MigrationContext): Promise<ValidationResult> {
    try {
        const isDeployed = await context.account.isAccountDeployed();

        if (!isDeployed) {
            console.log("Account not deployed, deploying now...");

            const deploymentResponse = await context.account.sendTransaction([
                {
                    to: context.accountAddress,
                    value: 0n,
                    data: "0x",
                },
            ]);

            const { transactionHash } = await deploymentResponse.waitForTxHash();
            console.log("V2 account deployment transaction hash:", transactionHash);
        }
        console.log("Account already deployed, proceeding with migration");

        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: error instanceof Error ? error.message : "Unknown error during validation"
        };
    }
}

async function performMigration(context: MigrationContext): Promise<MigrationResult> {
    const config = loadConfig();

    try {
        // Step 1: Update implementation to Nexus
        console.log("Preparing update implementation to Nexus...");
        const updateImplementationCalldata = encodeFunctionData({
            abi: [{
                name: "updateImplementation",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [{ type: "address", name: "newImplementation" }],
                outputs: []
            }],
            functionName: "updateImplementation",
            args: [config.nexusImplementationAddress as `0x${string}`],
        });

        const updateImplementationTransaction = {
            to: context.accountAddress,
            data: updateImplementationCalldata,
        };

        // Step 2: Initialize Nexus Account
        console.log("Preparing initialize Nexus account...");

        // Prepare initialization data for the validator
        const initData = encodeFunctionData({
            abi: [{
                name: "initNexusWithDefaultValidator",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [{ type: "bytes", name: "data" }],
                outputs: []
            }],
            functionName: "initNexusWithDefaultValidator",
            args: [config.eoaAddress as `0x${string}`]
        });

        // Encode bootstrap data
        const initDataWithBootstrap = encodeAbiParameters(
            [
                { name: "bootstrap", type: "address" },
                { name: "initData", type: "bytes" },
            ],
            [config.nexusBootstrapAddress as `0x${string}`, initData]
        );

        // Create initializeAccount calldata
        const initializeNexusCalldata = encodeFunctionData({
            abi: [
                {
                    name: "initializeAccount",
                    type: "function",
                    stateMutability: "nonpayable",
                    inputs: [{ type: "bytes", name: "data" }],
                    outputs: []
                }
            ],
            functionName: "initializeAccount",
            args: [initDataWithBootstrap],
        });

        const initializeNexusTransaction = {
            to: context.accountAddress,
            data: initializeNexusCalldata,
        };

        // Send both transactions in a batch
        console.log("Sending migration transaction...");
        const migrateToNexusResponse = await context.account.sendTransaction(
            [updateImplementationTransaction, initializeNexusTransaction],
            {
                paymasterServiceData: { mode: PaymasterMode.SPONSORED }
            }
        );

        const { transactionHash } = await migrateToNexusResponse.waitForTxHash();
        console.log("Migration transaction hash:", transactionHash);
        console.log("Migration completed successfully");

        return {
            originalAddress: context.accountAddress,
            success: true,
            transactionHash
        };
        // Send migration transactions
        /*const migrationResponse = await context.account.sendTransaction(
            [{
                to: context.accountAddress,
                data: updateImplementationCalldata,
            }, {
                to: context.accountAddress,
                data: initData,
            }],
            {
                paymasterServiceData: { mode: PaymasterMode.SPONSORED }
            }
        );

        const { transactionHash } = await migrationResponse.waitForTxHash();

        return {
            originalAddress: context.accountAddress,
            success: true,
            transactionHash
        };
        */
    } catch (error) {
        return {
            originalAddress: context.accountAddress,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error during migration"
        };
    }
}

async function verifyMigration(accountAddress: string): Promise<boolean> {
    const config = loadConfig();
    const eoaAccount = privateKeyToAccount(config.eoaPrivateKey as `0x${string}`);

    try {
        const nexusAccount = createBicoBundlerClient({
            account: await toNexusAccount({
                signer: eoaAccount,
                chainConfiguration: {
                    chain: config.chain,
                    transport: http(),
                    version: getMEEVersion(MEEVersion.V2_1_0)
                },
                accountAddress: accountAddress as `0x${string}`,
            }),
            transport: http(config.nexusBundlerUrl),
        });

        // Send test transaction
        const testHash = await nexusAccount.sendUserOperation({
            calls: [{
                to: config.eoaAddress as `0x${string}`,
                value: parseEther("0.00000001"),
            }],
        });

        const receipt = await nexusAccount.waitForUserOperationReceipt({ hash: testHash });
        return receipt.success;
    } catch (error) {
        console.error("Verification failed:", error);
        return false;
    }
}

async function main() {
    try {
        // Setup
        console.log("Setting up V2 account...");
        const context = await setupV2Account();
        console.log("Account address:", context.accountAddress);

        // Validate and deploy if needed
        console.log("Validating account...");
        const validation = await validateAndDeployIfNeeded(context);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.error}`);
        }

        // Perform migration
        console.log("Performing migration...");
        const migrationResult = await performMigration(context);
        if (!migrationResult.success) {
            throw new Error(`Migration failed: ${migrationResult.error}`);
        }
        console.log("Migration transaction hash:", migrationResult.transactionHash);

        // Verify migration
        console.log("Verifying migration...");
        const isVerified = await verifyMigration(context.accountAddress);
        if (!isVerified) {
            throw new Error("Migration verification failed");
        }

        console.log("Migration completed successfully!");
        return migrationResult;
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

// Run migration
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { main as migrateToBiconomy };
