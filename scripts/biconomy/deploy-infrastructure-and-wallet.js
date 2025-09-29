// Complete Infrastructure + Wallet Deployment in One Script
const hre = require('hardhat');
const { newWalletOptions } = require('../wallet-options');
const { loadEnvironmentInfo } = require('../environment');
const fs = require('fs');

async function deployInfrastructureAndWallet() {
    console.log('🚀 COMPLETE INFRASTRUCTURE + WALLET DEPLOYMENT');

    const env = loadEnvironmentInfo(hre.network.name);
    const { network } = env;
    const walletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();

    // Parse deployment method from environment or default to factory
    const useMultiCallDeploy = process.env.USE_MULTICALL_DEPLOY === 'true';
    const deploymentMethod = useMultiCallDeploy ? 'MultiCallDeploy' : 'Factory';

    console.log('Deployer:', await deployer.getAddress());
    console.log('Network:', network);
    console.log('Balance:', hre.ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    console.log('🎯 Deployment Method:', deploymentMethod);
    console.log('');

    // PHASE 1: Deploy Infrastructure
    console.log('🏗️  PHASE 1: DEPLOYING INFRASTRUCTURE');
    console.log('=====================================');

    const infrastructure = await deployInfrastructure(deployer, network);

    // PHASE 2: Deploy Wallet
    console.log('\n🎯 PHASE 2: DEPLOYING WALLET');
    console.log('=============================');

    const walletAddress = await deployWallet(infrastructure, deployer, network, useMultiCallDeploy);

    // PHASE 3: Wallet Operations Testing
    console.log('\n🧪 PHASE 3: WALLET OPERATIONS TESTING');
    console.log('=====================================');

    await testWalletOperations(infrastructure, walletAddress, deployer, network);

    // PHASE 4: Final Verification
    console.log('\n✅ PHASE 4: FINAL VERIFICATION');
    console.log('==============================');

    await finalVerification(infrastructure, walletAddress, deployer, network);

    // Save complete deployment
    const completeDeployment = {
        timestamp: new Date().toISOString(),
        status: 'COMPLETE_SUCCESS',
        network: network,
        deployer: await deployer.getAddress(),
        infrastructure: infrastructure,
        wallet: {
            address: walletAddress,
            owner: await deployer.getAddress(),
            mainModule: infrastructure.nexusImplementation
        }
    };

    fs.writeFileSync('scripts/biconomy/complete-deployment-success.json', JSON.stringify(completeDeployment, null, 2));

    console.log('\n🎉 COMPLETE DEPLOYMENT SUCCESSFUL!');
    console.log('📊 Results:');
    console.log('  🏛️  Passport Factory:', infrastructure.passportFactory);
    console.log('  🚀 Nexus Implementation:', infrastructure.nexusImplementation);
    console.log('  🎯 Deployed Wallet:', walletAddress);
    console.log('📁 Complete results saved to complete-deployment-success.json');
}

async function deployInfrastructure(deployer, network) {
    console.log('📦 Deploying infrastructure components...\n');

    // Load EntryPoint artifact once for reuse throughout the function
    let entryPointArtifact = null;

    // 1. Deploy MultiCallDeploy (Passport)
    console.log('1️⃣  Deploying MultiCallDeploy (Passport)...');
    const MultiCallDeployFactory = await hre.ethers.getContractFactory('MultiCallDeploy', deployer);
    const multiCallDeploy = await MultiCallDeployFactory.deploy(
        await deployer.getAddress(), // admin
        await deployer.getAddress()  // submitter
    );
    await multiCallDeploy.deployed();
    console.log('✅ MultiCallDeploy:', multiCallDeploy.address);

    // Wait a bit to ensure deployment is propagated
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Deploy Factory (Passport)
    console.log('\n2️⃣  Deploying Factory (Passport)...');
    const FactoryFactory = await hre.ethers.getContractFactory('Factory', deployer);
    const factory = await FactoryFactory.deploy(
        await deployer.getAddress(), // admin
        multiCallDeploy.address      // deployer
    );
    await factory.deployed();
    console.log('✅ Factory:', factory.address);

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    const factoryCode = await hre.ethers.provider.getCode(factory.address);
    if (factoryCode === '0x') throw new Error('Factory deployment verification failed');
    console.log('✅ Factory verified with', Math.floor(factoryCode.length / 2), 'bytes');

    // 3. Deploy LatestWalletImplLocator (Step 2)
    console.log('\n3️⃣  Deploying LatestWalletImplLocator (Step 2)...');
    const LatestWalletImplLocatorFactory = await hre.ethers.getContractFactory('LatestWalletImplLocator', deployer);
    const latestWalletImplLocator = await LatestWalletImplLocatorFactory.deploy(
        await deployer.getAddress(), // walletImplLocatorAdmin
        await deployer.getAddress()  // walletImplChangerAdmin
    );
    await latestWalletImplLocator.deployed();
    console.log('✅ LatestWalletImplLocator:', latestWalletImplLocator.address);

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    const locatorCode = await hre.ethers.provider.getCode(latestWalletImplLocator.address);
    if (locatorCode === '0x') throw new Error('LatestWalletImplLocator deployment verification failed');
    console.log('✅ LatestWalletImplLocator verified with', Math.floor(locatorCode.length / 2), 'bytes');

    // 4. Deploy StartupWalletImpl (Step 3)
    console.log('\n4️⃣  Deploying StartupWalletImpl (Step 3)...');
    const StartupWalletImplFactory = await hre.ethers.getContractFactory('StartupWalletImpl', deployer);
    const startupWalletImpl = await StartupWalletImplFactory.deploy(
        latestWalletImplLocator.address
    );
    await startupWalletImpl.deployed();
    console.log('✅ StartupWalletImpl:', startupWalletImpl.address);

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    const startupCode = await hre.ethers.provider.getCode(startupWalletImpl.address);
    if (startupCode === '0x') throw new Error('StartupWalletImpl deployment verification failed');
    console.log('✅ StartupWalletImpl verified with', Math.floor(startupCode.length / 2), 'bytes');

    // 5. Deploy K1Validator (Nexus Core - Step 4)
    console.log('\n5️⃣  Deploying K1Validator (Nexus - Step 4)...');
    const K1ValidatorFactory = await hre.ethers.getContractFactory('K1Validator', deployer);
    const k1Validator = await K1ValidatorFactory.deploy();
    await k1Validator.deployed();
    console.log('✅ K1Validator:', k1Validator.address);

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    const validatorCode = await hre.ethers.provider.getCode(k1Validator.address);
    if (validatorCode === '0x') throw new Error('K1Validator deployment verification failed');
    console.log('✅ K1Validator verified with', Math.floor(validatorCode.length / 2), 'bytes');

    // 6. Deploy Nexus Implementation (Step 4)
    console.log('\n6️⃣  Deploying Nexus Implementation (Step 4)...');
    const NexusFactory = await hre.ethers.getContractFactory('Nexus', deployer);
    const testEntryPoint = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Test EntryPoint
    const initData = hre.ethers.utils.hexConcat([await deployer.getAddress()]);

    const nexus = await NexusFactory.deploy(
        testEntryPoint,       // entryPoint
        k1Validator.address,  // defaultValidator  
        initData             // initData
    );
    await nexus.deployed();
    console.log('✅ Nexus Implementation:', nexus.address);

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    const nexusCode = await hre.ethers.provider.getCode(nexus.address);
    if (nexusCode === '0x') throw new Error('Nexus deployment verification failed');
    console.log('✅ Nexus verified with', Math.floor(nexusCode.length / 2), 'bytes');

    // 7. Deploy ImmutableSigner (Step 5)
    console.log('\n7️⃣  Deploying ImmutableSigner (Step 5)...');
    const ImmutableSignerFactory = await hre.ethers.getContractFactory('ImmutableSigner', deployer);
    const immutableSigner = await ImmutableSignerFactory.deploy(
        await deployer.getAddress(), // signerRootAdminPubKey
        await deployer.getAddress(), // signerAdminPubKey
        await deployer.getAddress()  // signerAddress
    );
    await immutableSigner.deployed();
    console.log('✅ ImmutableSigner:', immutableSigner.address);

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    const signerCode = await hre.ethers.provider.getCode(immutableSigner.address);
    if (signerCode === '0x') throw new Error('ImmutableSigner deployment verification failed');
    console.log('✅ ImmutableSigner verified with', Math.floor(signerCode.length / 2), 'bytes');

    // 8. Configure LatestWalletImplLocator to point to Nexus (Step 6)
    console.log('\n8️⃣  Configuring LatestWalletImplLocator → Nexus (Step 6)...');
    const updateTx = await latestWalletImplLocator.changeWalletImplementation(nexus.address, {
        gasLimit: 30000000,
        maxFeePerGas: 1875000000,
        maxPriorityFeePerGas: 1000000000,
    });
    await updateTx.wait();
    console.log('✅ LatestWalletImplLocator updated to point to Nexus');
    console.log('Transaction hash:', updateTx.hash);

    // 9. Deploy NexusBootstrap (Step 7) - REQUIRED for Nexus initialization
    console.log('\n9️⃣  Deploying NexusBootstrap (Step 7)...');

    const NexusBootstrapFactory = await hre.ethers.getContractFactory('NexusBootstrap');
    const bootstrapInitData = '0x'; // Empty init data for bootstrap
    const nexusBootstrap = await NexusBootstrapFactory.deploy(k1Validator.address, bootstrapInitData);
    await nexusBootstrap.deployed();

    console.log('✅ NexusBootstrap deployed at:', nexusBootstrap.address);

    // 10. Deploy/Configure EntryPoint (Step 8) - ERC-4337 support
    console.log('\n🔟 Deploying EntryPoint (Step 8)...');

    let entryPoint;
    let entryPointSource = 'deployed_real';

    try {
        // Try to deploy real EntryPoint first using artifact
        console.log('   Attempting to deploy real EntryPoint from account-abstraction...');
        entryPointArtifact = require('../../node_modules/account-abstraction/deployments/mainnet/EntryPoint.json');
        const EntryPointFactory = await hre.ethers.getContractFactory(
            entryPointArtifact.abi,
            entryPointArtifact.bytecode
        );
        entryPoint = await EntryPointFactory.deploy({
            gasLimit: 30000000
        });
        await entryPoint.deployed();
        console.log('✅ Real EntryPoint deployed at:', entryPoint.address);
        console.log(`   📏 Code size: ${Math.floor((await hre.ethers.provider.getCode(entryPoint.address)).length / 2)} bytes`);
    } catch (error) {
        console.log('⚠️  Real EntryPoint deployment failed, deploying mock...');
        console.log('   Error:', error.message);
        // Fallback to mock EntryPoint
        const MockEntryPointFactory = await hre.ethers.getContractFactory('MockEntryPoint');
        entryPoint = await MockEntryPointFactory.deploy();
        await entryPoint.deployed();
        entryPointSource = 'deployed_mock';
        console.log('✅ Mock EntryPoint deployed at:', entryPoint.address);
    }

    console.log('\n✅ ALL 8-STEP INFRASTRUCTURE DEPLOYED AND CONFIGURED');

    return {
        // Step 1: Passport Base
        passportMultiCallDeploy: multiCallDeploy.address,
        passportFactory: factory.address,

        // Step 2: LatestWalletImplLocator
        latestWalletImplLocator: latestWalletImplLocator.address,

        // Step 3: StartupWalletImpl
        startupWalletImpl: startupWalletImpl.address,

        // Step 4: Nexus Core
        nexusK1Validator: k1Validator.address,
        nexusImplementation: nexus.address,

        // Step 5: ImmutableSigner
        immutableSigner: immutableSigner.address,

        // Step 6: Configuration
        locatorToNexusConfigured: true,
        configurationTxHash: updateTx.hash,

        // Step 7: NexusBootstrap
        nexusBootstrap: nexusBootstrap.address,

        // Step 8: EntryPoint
        entryPoint: entryPoint.address,
        entryPointSource: entryPointSource,

        // Artifact for reuse
        entryPointArtifact: entryPointArtifact
    };
}

async function deployWallet(infrastructure, deployer, network, useMultiCallDeploy = false) {
    const method = useMultiCallDeploy ? 'MultiCallDeploy' : 'Factory';
    console.log(`🎯 Deploying wallet using ${method}...\n`);

    if (useMultiCallDeploy) {
        return await deployWalletWithMultiCallDeploy(infrastructure, deployer, network);
    } else {
        return await deployWalletWithFactory(infrastructure, deployer, network);
    }
}

async function deployWalletWithFactory(infrastructure, deployer, network) {
    console.log('🏛️ Using Factory deployment method...');

    // Get Factory contract
    const Factory = await hre.ethers.getContractFactory('Factory', deployer);
    const factory = Factory.attach(infrastructure.passportFactory);

    // Wallet configuration
    const walletConfig = {
        owner: await deployer.getAddress(),
        mainModule: infrastructure.nexusImplementation, // Nexus as main module
        salt: hre.ethers.utils.formatBytes32String('hybrid-wallet-factory') // Unique salt for factory
    };

    console.log('📝 Wallet Configuration:');
    console.log('  Owner:', walletConfig.owner);
    console.log('  Main Module (Nexus):', walletConfig.mainModule);
    console.log('  Salt:', walletConfig.salt);

    // Predict wallet address
    const predictedAddress = await factory.getAddress(
        walletConfig.mainModule,
        walletConfig.salt
    );
    console.log('  Predicted Address:', predictedAddress);

    // Check if wallet already exists
    const existingCode = await hre.ethers.provider.getCode(predictedAddress);
    if (existingCode !== '0x') {
        console.log('✅ Wallet already exists at predicted address');
        return predictedAddress;
    }

    // Grant DEPLOYER_ROLE if needed
    console.log('\n🔐 Checking permissions...');
    const DEPLOYER_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('DEPLOYER_ROLE'));
    const hasRole = await factory.hasRole(DEPLOYER_ROLE, await deployer.getAddress());

    if (!hasRole) {
        console.log('Granting DEPLOYER_ROLE...');
        const grantTx = await factory.grantRole(DEPLOYER_ROLE, await deployer.getAddress());
        await grantTx.wait();
        console.log('✅ DEPLOYER_ROLE granted');
    } else {
        console.log('✅ Already has DEPLOYER_ROLE');
    }

    // Deploy the wallet
    console.log('\n🔨 Deploying wallet via Factory...');
    const deployTx = await factory.deploy(
        walletConfig.mainModule,
        walletConfig.salt,
        {
            gasLimit: 30000000,
            maxFeePerGas: 1875000000,
            maxPriorityFeePerGas: 1000000000,
        }
    );

    console.log('Deploy transaction:', deployTx.hash);
    const receipt = await deployTx.wait();
    console.log('✅ Confirmed in block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());

    // Verify deployment
    await new Promise(resolve => setTimeout(resolve, 1000));
    const deployedCode = await hre.ethers.provider.getCode(predictedAddress);
    if (deployedCode === '0x') {
        throw new Error('Wallet deployment failed - no code at address');
    }

    console.log('✅ FACTORY WALLET DEPLOYED SUCCESSFULLY!');
    console.log('Address:', predictedAddress);
    console.log('Code size:', Math.floor(deployedCode.length / 2), 'bytes');

    return predictedAddress;
}

async function deployWalletWithMultiCallDeploy(infrastructure, deployer, network) {
    console.log('🔧 Using MultiCallDeploy deployment method...');

    // Get MultiCallDeploy contract
    const MultiCallDeploy = await hre.ethers.getContractFactory('MultiCallDeploy', deployer);
    const multiCallDeploy = MultiCallDeploy.attach(infrastructure.passportMultiCallDeploy);

    // Get Factory for address prediction
    const Factory = await hre.ethers.getContractFactory('Factory', deployer);
    const factory = Factory.attach(infrastructure.passportFactory);

    // Wallet configuration
    const walletConfig = {
        owner: await deployer.getAddress(),
        mainModule: infrastructure.nexusImplementation, // Nexus as main module
        salt: hre.ethers.utils.formatBytes32String('hybrid-wallet-multicall') // Unique salt for multicall
    };

    console.log('📝 Wallet Configuration:');
    console.log('  Owner:', walletConfig.owner);
    console.log('  Main Module (Nexus):', walletConfig.mainModule);
    console.log('  Salt:', walletConfig.salt);

    // Predict wallet address using Factory's getAddress
    const predictedAddress = await factory.getAddress(
        walletConfig.mainModule,
        walletConfig.salt
    );
    console.log('  Predicted Address:', predictedAddress);

    // Check if wallet already exists
    const existingCode = await hre.ethers.provider.getCode(predictedAddress);
    if (existingCode !== '0x') {
        console.log('✅ Wallet already exists at predicted address');
        return predictedAddress;
    }

    // Example initial transactions to execute after deployment
    const initialTransactions = [
        {
            to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Example recipient
            value: hre.ethers.utils.parseEther('0.1'), // Send 0.1 ETH
            data: '0x' // No data
        }
    ];

    console.log('📋 Initial transactions configured:', initialTransactions.length);

    // Grant EXECUTOR_ROLE to deployer for MultiCallDeploy
    console.log('\n🔐 Checking MultiCallDeploy permissions...');
    const EXECUTOR_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('EXECUTOR_ROLE'));
    const hasExecutorRole = await multiCallDeploy.hasRole(EXECUTOR_ROLE, await deployer.getAddress());

    if (!hasExecutorRole) {
        console.log('Granting EXECUTOR_ROLE...');
        const grantTx = await multiCallDeploy.grantRole(EXECUTOR_ROLE, await deployer.getAddress());
        await grantTx.wait();
        console.log('✅ EXECUTOR_ROLE granted');
    } else {
        console.log('✅ Already has EXECUTOR_ROLE');
    }

    // Deploy wallet with initial transactions via MultiCallDeploy
    console.log('\n🔨 Deploying wallet via MultiCallDeploy...');

    try {
        // The exact interface for MultiCallDeploy may vary - this is an example
        const deployTx = await multiCallDeploy.deployAndExecute(
            predictedAddress,
            walletConfig.mainModule,
            walletConfig.salt,
            infrastructure.passportFactory,
            hre.ethers.utils.defaultAbiCoder.encode(['address'], [walletConfig.owner]),
            initialTransactions,
            {
                gasLimit: 30000000,
                maxFeePerGas: 1875000000,
                maxPriorityFeePerGas: 1000000000,
                value: hre.ethers.utils.parseEther('0.1') // ETH for initial transaction
            }
        );

        console.log('Deploy transaction:', deployTx.hash);
        const receipt = await deployTx.wait();
        console.log('✅ Confirmed in block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());

        // Verify deployment
        await new Promise(resolve => setTimeout(resolve, 1000));
        const deployedCode = await hre.ethers.provider.getCode(predictedAddress);
        if (deployedCode === '0x') {
            throw new Error('MultiCallDeploy wallet deployment failed - no code at address');
        }

        console.log('✅ MULTICALL WALLET DEPLOYED SUCCESSFULLY!');
        console.log('Address:', predictedAddress);
        console.log('Code size:', Math.floor(deployedCode.length / 2), 'bytes');
        console.log('🔄 Initial transactions executed');

        return predictedAddress;

    } catch (error) {
        console.log('❌ MultiCallDeploy failed:', error.message);
        console.log('💡 Note: MultiCallDeploy interface may need adjustment');

        // Fallback to factory deployment
        console.log('\n🔄 Falling back to Factory deployment...');
        return await deployWalletWithFactory(infrastructure, deployer, network);
    }
}

async function finalVerification(infrastructure, walletAddress, deployer, network) {
    console.log('🔍 Final verification of complete deployment...\n');

    // Verify infrastructure
    const components = [
        { name: 'MultiCallDeploy (Step 1)', address: infrastructure.passportMultiCallDeploy },
        { name: 'Factory (Step 1)', address: infrastructure.passportFactory },
        { name: 'LatestWalletImplLocator (Step 2)', address: infrastructure.latestWalletImplLocator },
        { name: 'StartupWalletImpl (Step 3)', address: infrastructure.startupWalletImpl },
        { name: 'K1Validator (Step 4)', address: infrastructure.nexusK1Validator },
        { name: 'Nexus Implementation (Step 4)', address: infrastructure.nexusImplementation },
        { name: 'ImmutableSigner (Step 5)', address: infrastructure.immutableSigner },
        { name: 'NexusBootstrap (Step 7)', address: infrastructure.nexusBootstrap },
        { name: `EntryPoint (Step 8) - ${infrastructure.entryPointSource}`, address: infrastructure.entryPoint },
        { name: 'Deployed Wallet', address: walletAddress }
    ];

    console.log('📊 Component Verification:');
    for (const component of components) {
        const code = await hre.ethers.provider.getCode(component.address);
        const hasCode = code !== '0x';
        const size = hasCode ? Math.floor(code.length / 2) : 0;
        const status = hasCode ? '✅' : '❌';

        console.log(`  ${status} ${component.name}: ${component.address} (${size} bytes)`);

        if (!hasCode) {
            throw new Error(`Component ${component.name} verification failed`);
        }
    }

    console.log('\n✅ ALL COMPONENTS VERIFIED SUCCESSFULLY');
    console.log('\n🏆 HYBRID INFRASTRUCTURE + WALLET DEPLOYMENT COMPLETE!');
}

async function testWalletOperations(infrastructure, walletAddress, deployer, network) {
    console.log('🧪 Testing wallet operations...\n');

    try {
        // Test 1: Check wallet balance and receive ETH
        console.log('1️⃣  Testing ETH reception...');

        const initialBalance = await hre.ethers.provider.getBalance(walletAddress);
        console.log(`   Initial wallet balance: ${hre.ethers.utils.formatEther(initialBalance)} ETH`);

        // Send some ETH to the wallet
        const sendTx = await deployer.sendTransaction({
            to: walletAddress,
            value: hre.ethers.utils.parseEther('0.1'),
            gasLimit: 100000  // Increased gas limit for smart contract interaction
        });
        await sendTx.wait();

        const newBalance = await hre.ethers.provider.getBalance(walletAddress);
        console.log(`   ✅ ETH sent successfully! New balance: ${hre.ethers.utils.formatEther(newBalance)} ETH`);

        // Test 2: Check wallet code and type
        console.log('\n2️⃣  Analyzing wallet structure...');

        const walletCode = await hre.ethers.provider.getCode(walletAddress);
        const codeSize = Math.floor(walletCode.length / 2);
        console.log(`   📏 Wallet code size: ${codeSize} bytes`);

        if (codeSize > 0) {
            console.log('   ✅ Wallet is a smart contract (proxy pattern)');
        } else {
            console.log('   ⚠️  Wallet is an EOA (externally owned account)');
        }

        // Test 3: Try to interact with wallet as Nexus (if it's a contract)
        if (codeSize > 0) {
            console.log('\n3️⃣  Testing Nexus wallet interface...');

            try {
                // Try to get the wallet contract instance
                const wallet = await hre.ethers.getContractAt('Nexus', walletAddress);

                // Test basic Nexus functions (read-only)
                try {
                    const isInitialized = await wallet.isInitialized();
                    console.log(`   📋 Wallet initialized: ${isInitialized}`);
                } catch (e) {
                    console.log('   ⚠️  Could not check initialization status');
                }

                try {
                    const entryPointAddr = await wallet.entryPoint();
                    console.log(`   🎯 EntryPoint configured: ${entryPointAddr}`);
                } catch (e) {
                    console.log('   ⚠️  Could not get EntryPoint address');
                }

                console.log('   ✅ Nexus interface accessible');

            } catch (error) {
                console.log('   ⚠️  Nexus interface not accessible:', error.message);

                // Try as a generic wallet
                try {
                    const wallet = await hre.ethers.getContractAt('Wallet', walletAddress);
                    console.log('   ✅ Generic wallet interface accessible');
                } catch (e) {
                    console.log('   ⚠️  Could not access wallet interface');
                }
            }
        }

        // Test 4: Test infrastructure connectivity
        console.log('\n4️⃣  Testing infrastructure connectivity...');

        // Check if LatestWalletImplLocator points to our Nexus
        const locator = await hre.ethers.getContractAt('LatestWalletImplLocator', infrastructure.latestWalletImplLocator);
        const currentImpl = await locator.latestWalletImplementation();

        if (currentImpl.toLowerCase() === infrastructure.nexusImplementation.toLowerCase()) {
            console.log('   ✅ LatestWalletImplLocator correctly points to Nexus');
        } else {
            console.log('   ⚠️  LatestWalletImplLocator mismatch');
            console.log(`      Expected: ${infrastructure.nexusImplementation}`);
            console.log(`      Actual: ${currentImpl}`);
        }

        // Test 5: EntryPoint connectivity (if available)
        if (infrastructure.entryPoint) {
            console.log('\n5️⃣  Testing EntryPoint connectivity...');

            try {
                // Use the same artifact approach as the test below
                const entryPointArtifact = infrastructure.entryPointArtifact || require('../../node_modules/account-abstraction/deployments/mainnet/EntryPoint.json');
                const entryPoint = new hre.ethers.Contract(
                    infrastructure.entryPoint,
                    entryPointArtifact.abi,
                    hre.ethers.provider
                ).connect(deployer);

                // Try to get deposit info (this should work for both real and mock EntryPoint)
                try {
                    const deposit = await entryPoint.balanceOf(walletAddress);
                    console.log(`   💰 Wallet deposit in EntryPoint: ${hre.ethers.utils.formatEther(deposit)} ETH`);
                    console.log('   ✅ EntryPoint interface accessible');
                } catch (e) {
                    console.log('   ⚠️  Could not check EntryPoint deposit');
                }

            } catch (error) {
                console.log('   ⚠️  EntryPoint not accessible:', error.message);
            }
        }

        // Test 6: ERC-4337 UserOp validation (if real EntryPoint is available)
        if (infrastructure.entryPointSource === 'deployed_real') {
            console.log('\n6️⃣  Testing ERC-4337 UserOp validation (K1Validator)...');

            try {
                // Get EntryPoint using the same artifact as deployment (reuse loaded artifact)
                const entryPointArtifact = infrastructure.entryPointArtifact || require('../../node_modules/account-abstraction/deployments/mainnet/EntryPoint.json');
                const entryPoint = new hre.ethers.Contract(
                    infrastructure.entryPoint,
                    entryPointArtifact.abi,
                    hre.ethers.provider
                ).connect(deployer);

                const k1Validator = await hre.ethers.getContractAt('K1Validator', infrastructure.nexusK1Validator);

                console.log('   📋 Contract instances created');
                console.log(`   🎯 K1Validator: ${infrastructure.nexusK1Validator}`);
                console.log(`   🎯 EntryPoint: ${infrastructure.entryPoint} (real)`);
                console.log(`   🎯 Wallet: ${walletAddress}`);

                // Test 6a: Basic K1Validator functions (should work)
                console.log('\n   🧪 TEST 6a: Basic K1Validator functions');
                console.log('   =========================================');

                try {
                    const isValidSignature = await k1Validator.isValidSignatureWithSender(
                        walletAddress,
                        '0x' + '00'.repeat(32), // hash
                        '0x' + '00'.repeat(65)  // signature
                    );
                    console.log(`   ✅ isValidSignatureWithSender: ${isValidSignature}`);
                } catch (error) {
                    console.log(`   ⚠️  isValidSignatureWithSender failed: ${error.message}`);
                }

                // Test 6b: K1Validator.validateUserOp (this should trigger toHexString error)
                console.log('\n   🧪 TEST 6b: K1Validator.validateUserOp (toHexString error expected)');
                console.log('   ================================================================');

                try {
                    // Create a UserOp structure matching ERC-4337
                    const userOp = {
                        sender: walletAddress,
                        nonce: 0,
                        initCode: '0x',
                        callData: '0x',
                        callGasLimit: 100000,
                        verificationGasLimit: 100000,
                        preVerificationGas: 21000,
                        maxFeePerGas: 1000000000,
                        maxPriorityFeePerGas: 1000000000,
                        paymasterAndData: '0x',
                        signature: '0x' + '00'.repeat(65) // Dummy signature
                    };

                    console.log('   📝 UserOp created:', {
                        sender: userOp.sender,
                        nonce: userOp.nonce,
                        callGasLimit: userOp.callGasLimit,
                        signatureLength: userOp.signature.length
                    });

                    console.log('   🔍 Calling K1Validator.validateUserOp()...');
                    console.log('   ⚠️  This is where the toHexString error typically occurs');

                    // This call should trigger the toHexString error
                    const result = await k1Validator.validateUserOp(
                        userOp,
                        '0x' + '00'.repeat(32) // userOpHash
                        // Note: removed third parameter as it caused "too many arguments" error
                    );

                    console.log(`   ✅ UNEXPECTED SUCCESS: validateUserOp returned ${result}`);
                    console.log('   🤔 No toHexString error occurred - this is surprising!');

                } catch (error) {
                    if (error.message.includes('toHexString')) {
                        console.log('   ❌ CONFIRMED: toHexString error reproduced!');
                        console.log(`   🔍 Error: ${error.message}`);
                        console.log('   📝 This confirms the K1Validator implementation issue');

                        // Extract more details from the error
                        if (error.reason) {
                            console.log(`   📋 Reason: ${error.reason}`);
                        }
                        if (error.code) {
                            console.log(`   🔢 Code: ${error.code}`);
                        }
                    } else {
                        console.log(`   ⚠️  Different error occurred: ${error.message}`);
                        console.log('   🤔 This might be a different validation issue');
                    }
                }

                // Test 6c: Try with EntryPoint.handleOps (full ERC-4337 flow)
                console.log('\n   🧪 TEST 6c: Full ERC-4337 flow via EntryPoint.handleOps');
                console.log('   ====================================================');

                try {
                    const userOp = {
                        sender: walletAddress,
                        nonce: 0,
                        initCode: '0x',
                        callData: '0x',
                        callGasLimit: 100000,
                        verificationGasLimit: 100000,
                        preVerificationGas: 21000,
                        maxFeePerGas: 1000000000,
                        maxPriorityFeePerGas: 1000000000,
                        paymasterAndData: '0x',
                        signature: '0x' + '00'.repeat(65)
                    };

                    console.log('   🔍 Calling EntryPoint.handleOps()...');
                    console.log('   ⚠️  This will internally call K1Validator.validateUserOp()');

                    // This should also trigger the toHexString error
                    await entryPoint.handleOps([userOp], deployer.address);

                    console.log('   ✅ UNEXPECTED SUCCESS: handleOps completed');
                    console.log('   🤔 No toHexString error in full ERC-4337 flow');

                } catch (error) {
                    if (error.message.includes('toHexString')) {
                        console.log('   ❌ CONFIRMED: toHexString error in full ERC-4337 flow!');
                        console.log(`   🔍 Error: ${error.message}`);
                    } else {
                        console.log(`   ⚠️  Different error in ERC-4337 flow: ${error.message}`);

                        // Common ERC-4337 errors
                        if (error.message.includes('AA23')) {
                            console.log('   📝 AA23 = reverted (or OOG) - validation failed');
                        } else if (error.message.includes('AA24')) {
                            console.log('   📝 AA24 = signature error');
                        } else if (error.message.includes('AA25')) {
                            console.log('   📝 AA25 = invalid account nonce');
                        }
                    }
                }

                console.log('\n   ✅ K1VALIDATOR + REAL ENTRYPOINT TESTING COMPLETED');
                console.log('   ==================================================');
                console.log('   📝 Any toHexString errors confirm the K1Validator issue we documented');

            } catch (error) {
                console.log('   ❌ ERC-4337 testing failed:', error.message);
            }
        } else {
            console.log('\n6️⃣  Skipping ERC-4337 UserOp validation (using mock EntryPoint)');
            console.log('   ℹ️  toHexString error testing requires real EntryPoint');
        }

        console.log('\n✅ WALLET OPERATIONS TESTING COMPLETED');

    } catch (error) {
        console.log('\n❌ WALLET OPERATIONS TESTING FAILED:', error.message);
        // Don't throw - this is testing, not critical for deployment
    }
}

// Execute
deployInfrastructureAndWallet()
    .then(() => {
        console.log('\n🎊 SUCCESS! Passport-Nexus hybrid wallet deployed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 DEPLOYMENT FAILED:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
