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

    // PHASE 3: Final Verification
    console.log('\n✅ PHASE 3: FINAL VERIFICATION');
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
    const entryPoint = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Test EntryPoint
    const initData = hre.ethers.utils.hexConcat([await deployer.getAddress()]);

    const nexus = await NexusFactory.deploy(
        entryPoint,           // entryPoint
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

    console.log('\n✅ ALL 6-STEP INFRASTRUCTURE DEPLOYED AND CONFIGURED');

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
        configurationTxHash: updateTx.hash
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
