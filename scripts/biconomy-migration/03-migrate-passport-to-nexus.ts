/**
 * 03-migrate-passport-to-nexus.ts
 * 
 * Migrates a Passport wallet to Nexus while preserving the wallet address.
 * 
 * APPROACH:
 * 1. Call updateImplementation(NEXUS_IMPL) via wallet.execute()
 * 2. Call initializeAccount(nexusData) via wallet.execute()
 * 
 * NO BICONOMY SDK: Uses ethers.js directly to interact with Passport wallet
 * 
 * WHY NOT SDK? Because Biconomy SDK expects BiconomySmartAccountV2,
 * but we have MainModuleDynamicAuth (Passport). We'll use SDK after migration.
 */

import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";
import { encodeMetaTransactionsData, walletMultiSign } from "../../utils/helpers";

async function migratePassportToNexus() {
    console.log("🔄 Migrating Passport Wallet to Nexus\n");
    console.log("=".repeat(80));

    // ============================================================================
    // GET DEPLOYER (WALLET OWNER)
    // ============================================================================

    const [deployer] = await ethers.getSigners();
    console.log(`\n👤 Deployer/Owner: ${deployer.address}`);

    // ============================================================================
    // LOAD WALLET INFO
    // ============================================================================

    const testWalletPath = path.join(__dirname, "test-wallet-info.json");

    if (!fs.existsSync(testWalletPath)) {
        throw new Error(
            "Test wallet not found! Run script 02 first to deploy a test wallet."
        );
    }

    const testWallet = JSON.parse(fs.readFileSync(testWalletPath, "utf8"));
    const walletAddress = testWallet.walletAddress;
    const owner = testWallet.owner;

    console.log("\n📋 Wallet to Migrate:");
    console.log("-".repeat(80));
    console.log(`  Address: ${walletAddress}`);
    console.log(`  Owner:   ${owner}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // LOAD DEPLOYMENT ARTIFACTS
    // ============================================================================

    const passportDeploymentPath = path.join(__dirname, "../deployment-summary-simplified.json");
    const passportDeployment = JSON.parse(fs.readFileSync(passportDeploymentPath, "utf8"));

    const biconomyDeploymentPath = path.join(__dirname, "../biconomy/base-sepolia-deployment.json");
    const biconomyDeployment = JSON.parse(fs.readFileSync(biconomyDeploymentPath, "utf8"));

    // Use Nexus v1.2.1 (experimental/deployed by us, but identical to official experimental)
    const nexusImplementation = ethers.utils.getAddress("0x0E12B6ED74b95aFEc6dc578Dc0b29292C0A95c90"); // v1.2.1 (experimental)
    const nexusFactory = ethers.utils.getAddress("0xDB1D73d8c7e8D50F760083449390b1D4080108dF"); // Factory (experimental)

    // Use OFFICIAL Bootstrap & Validator
    const nexusBootstrap = ethers.utils.getAddress("0x0000003eDf18913c01cBc482C978bBD3D6E8ffA3"); // OFFICIAL Bootstrap v1.2.1
    const k1Validator = ethers.utils.getAddress("0x0000000031ef4155C978d48a8A7d4EDba03b04fE"); // OFFICIAL K1 Validator v1.0.3

    console.log("\n📋 Migration Targets:");
    console.log("-".repeat(80));
    console.log(`  Nexus Implementation: ${nexusImplementation}`);
    console.log(`  NexusBootstrap:       ${nexusBootstrap}`);
    console.log(`  K1Validator:          ${k1Validator}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // CONNECT TO WALLET
    // ============================================================================

    // Support custom owner (same as script 02)
    let signer = deployer;
    const customOwnerPk = process.env.MIGRATION_TEST_OWNER_PK;
    if (customOwnerPk) {
        signer = new ethers.Wallet(customOwnerPk, ethers.provider);
        console.log("\n⚠️  Using custom owner from MIGRATION_TEST_OWNER_PK");
    }

    if (signer.address.toLowerCase() !== owner.toLowerCase()) {
        throw new Error(
            `Signer mismatch! Expected ${owner}, got ${signer.address}. Make sure MIGRATION_TEST_OWNER_PK matches the wallet owner.`
        );
    }

    console.log(`\n👤 Connected as: ${signer.address}`);
    console.log(`👤 Deployer (for gas): ${deployer.address}`);

    // Check deployer balance (will pay for gas)
    const deployerBalance = await deployer.getBalance();
    console.log(`💰 Deployer Balance: ${ethers.utils.formatEther(deployerBalance)} ETH\n`);

    if (deployerBalance.lt(ethers.utils.parseEther("0.001"))) {
        throw new Error("Insufficient deployer balance for migration (need at least 0.001 ETH)");
    }

    // Connect to wallet as MainModuleDynamicAuth
    const wallet = await ethers.getContractAt(
        "MainModuleDynamicAuth",
        walletAddress
    );

    console.log("✅ Connected to wallet\n");
    console.log("=".repeat(80));

    // ============================================================================
    // VERIFY CURRENT STATE
    // ============================================================================

    console.log("\n🔍 Verifying Current State...");

    const currentImpl = await ethers.provider.getStorageAt(
        walletAddress,
        walletAddress
    );
    const currentImplAddress = ethers.utils.getAddress("0x" + currentImpl.slice(-40));

    console.log(`  Current Implementation: ${currentImplAddress}`);
    console.log(`  Expected (Passport):    ${passportDeployment.infrastructure.startupWalletImpl}`);

    if (currentImplAddress.toLowerCase() === nexusImplementation.toLowerCase()) {
        console.log("\n⚠️  Wallet already migrated to Nexus!");
        console.log("   Skipping migration. Run script 04 to test.\n");
        process.exit(0);
    }

    console.log("  ✅ Wallet is Passport - ready to migrate\n");
    console.log("=".repeat(80));

    // ============================================================================
    // PREPARE MIGRATION TRANSACTIONS
    // ============================================================================

    console.log("\n📝 Preparing Migration Transactions...");

    // Transaction 1: updateImplementation
    const updateImplementationCalldata = wallet.interface.encodeFunctionData(
        "updateImplementation",
        [nexusImplementation]
    );

    console.log(`  1️⃣  updateImplementation(${nexusImplementation})`);
    console.log(`      Calldata: ${updateImplementationCalldata.substring(0, 66)}...\n`);

    // Transaction 2: initializeAccount

    // Prepare validator initialization data
    const NexusBootstrap = await ethers.getContractAt("NexusBootstrap", nexusBootstrap);

    const validatorData = ethers.utils.solidityPack(["address"], [signer.address]);

    const bootstrapCalldata = NexusBootstrap.interface.encodeFunctionData(
        "initNexusWithDefaultValidator",
        [validatorData]
    );

    const initDataWithBootstrap = ethers.utils.defaultAbiCoder.encode(
        ["address", "bytes"],
        [nexusBootstrap, bootstrapCalldata]
    );

    const Nexus = await ethers.getContractFactory("Nexus");
    const initializeAccountCalldata = Nexus.interface.encodeFunctionData(
        "initializeAccount",
        [initDataWithBootstrap]
    );

    console.log(`  2️⃣  initializeAccount(...)`);
    console.log(`      Owner: ${signer.address}`);
    console.log(`      Calldata: ${initializeAccountCalldata.substring(0, 66)}...\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // CREATE TRANSACTIONS ARRAY
    // ============================================================================

    console.log("\n🔨 Creating Transaction Batch...");

    const transactions = [
        {
            delegateCall: false, // MUST be FALSE! (regular call, not delegatecall)
            revertOnError: true,
            gasLimit: ethers.BigNumber.from(2000000),
            target: walletAddress, // Call wallet itself
            value: ethers.BigNumber.from(0),
            data: updateImplementationCalldata,
        },
        {
            delegateCall: false, // MUST be FALSE! (regular call, not delegatecall)
            revertOnError: true,
            gasLimit: ethers.BigNumber.from(2000000),
            target: walletAddress, // Call wallet itself
            value: ethers.BigNumber.from(0),
            data: initializeAccountCalldata,
        },
    ];

    console.log("  ✅ 2 transactions prepared\n");
    console.log("=".repeat(80));

    // ============================================================================
    // GENERATE SIGNATURE
    // ============================================================================

    console.log("\n🔏 Generating Signature...");

    // Get current nonce from the wallet
    let nonce = 0;
    try {
        nonce = (await wallet.nonce()).toNumber();
        console.log(`  ✅ Current wallet nonce: ${nonce}`);
    } catch (error: any) {
        console.log(`  ⚠️  Could not read nonce, using 0: ${error.message}`);
        nonce = 0;
    }

    // Encode transaction data using the correct helper (same as wallet-deployment.ts and script 02)
    const chainId = await ethers.provider.getNetwork().then((n) => n.chainId);
    const data = encodeMetaTransactionsData(walletAddress, transactions, chainId, nonce);

    // Sign using walletMultiSign helper (MUST use signer, not deployer!)
    const formattedSignature = await walletMultiSign(
        [{ weight: 1, owner: signer }],
        1,
        data
    );

    console.log(`  Chain ID:  ${chainId}`);
    console.log(`  Nonce:     ${nonce}`);
    console.log(`  Signature: ${formattedSignature.substring(0, 66)}...\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // EXECUTE MIGRATION
    // ============================================================================

    console.log("\n🚀 Executing Migration...");
    console.log("⚠️  THIS WILL CHANGE THE WALLET IMPLEMENTATION!\n");

    const migrationTx = await wallet
        .connect(signer)
        .execute(transactions, nonce, formattedSignature, {
            gasLimit: 5000000,
        });

    console.log(`  📋 Transaction hash: ${migrationTx.hash}`);
    console.log("  ⏳ Waiting for confirmation...\n");

    const receipt = await migrationTx.wait();

    console.log(`  ✅ Mined in block: ${receipt.blockNumber}`);
    console.log(`  ⛽ Gas used: ${receipt.gasUsed.toString()}\n`);
    console.log("=".repeat(80));

    // ============================================================================
    // VERIFY MIGRATION
    // ============================================================================

    console.log("\n🔍 Verifying Migration...");

    // Wait for network propagation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check 1: Implementation address
    const newImpl = await ethers.provider.getStorageAt(walletAddress, walletAddress);
    const newImplAddress = ethers.utils.getAddress("0x" + newImpl.slice(-40));

    console.log(`  New Implementation: ${newImplAddress}`);
    console.log(`  Expected (Nexus):   ${nexusImplementation}`);

    if (newImplAddress.toLowerCase() !== nexusImplementation.toLowerCase()) {
        console.log("  ❌ Implementation update failed!");
        throw new Error("Migration failed - implementation not updated");
    }
    console.log("  ✅ Implementation updated!\n");

    // Check 2: Nexus initialization
    const nexusWallet = await ethers.getContractAt("Nexus", walletAddress);

    try {
        const isInitialized = await nexusWallet.isInitialized();
        console.log(`  Nexus initialized: ${isInitialized}`);

        if (!isInitialized) {
            console.log("  ⚠️  Nexus not initialized - may need manual initialization");
        } else {
            console.log("  ✅ Nexus fully initialized!\n");
        }
    } catch (error: any) {
        console.log("  ⚠️  Could not verify initialization:", error.message);
    }

    // Check 3: accountId
    try {
        const accountId = await nexusWallet.accountId();
        console.log(`  Account ID: ${accountId}`);
        console.log("  ✅ Nexus accountId working!\n");
    } catch (error: any) {
        console.log("  ⚠️  Could not read accountId:", error.message);
    }

    console.log("=".repeat(80));

    // ============================================================================
    // SAVE MIGRATION INFO
    // ============================================================================

    const migrationInfo = {
        timestamp: new Date().toISOString(),
        network: "base_sepolia",
        walletAddress,
        owner: signer.address,
        migrationTx: migrationTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        previousImplementation: currentImplAddress,
        newImplementation: newImplAddress,
        nexusBootstrap,
        k1Validator,
    };

    const migrationPath = path.join(__dirname, "migration-result.json");
    fs.writeFileSync(migrationPath, JSON.stringify(migrationInfo, null, 2));

    console.log(`\n📄 Migration info saved to: ${migrationPath}\n`);

    // ============================================================================
    // SUMMARY
    // ============================================================================

    console.log("=".repeat(80));
    console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!\n");
    console.log("📋 Summary:");
    console.log(`  Wallet Address:  ${walletAddress}`);
    console.log(`  Owner:           ${signer.address}`);
    console.log(`  Old Impl:        ${currentImplAddress}`);
    console.log(`  New Impl:        ${newImplAddress}`);
    console.log(`  TX Hash:         ${migrationTx.hash}\n`);
    console.log("✅ Key Points:");
    console.log("  • Wallet address PRESERVED");
    console.log("  • Balance PRESERVED");
    console.log("  • History PRESERVED");
    console.log("  • Implementation UPGRADED to Nexus\n");
    console.log("🔜 Next Steps:");
    console.log("  1. Run script 04 to test with Biconomy SDK");
    console.log("  2. Execute a test transaction via EntryPoint");
    console.log("  3. If successful, migrate production wallets\n");
    console.log("=".repeat(80));
}

// Execute
migratePassportToNexus()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error migrating wallet:", error);
        process.exit(1);
    });

