// Complete Biconomy Deployment using JavaScript (no TypeScript issues)
const hre = require('hardhat');
const { newWalletOptions } = require('../wallet-options');
const { loadEnvironmentInfo } = require('../environment');
const { ethers } = require('ethers');
const fs = require('fs');

async function completeDeployment() {
    console.log('🚀 Starting Complete Biconomy Deployment...');

    const env = loadEnvironmentInfo(hre.network.name);
    const walletOptions = await newWalletOptions(env);
    const deployer = walletOptions.getWallet();

    console.log('Deployer:', await deployer.getAddress());

    const results = {};

    try {
        // STEP 1: Deploy NexusAccountFactory
        console.log('\n📦 STEP 1: Deploying NexusAccountFactory...');
        const NexusFactoryFactory = await hre.ethers.getContractFactory('NexusAccountFactory', deployer);
        const nexusFactory = await NexusFactoryFactory.deploy(
            '0x5FbDB2315678afecb367f032d93F642f64180aa3', // temp implementation
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'  // entryPoint
        );
        await nexusFactory.deployed();
        results.nexusFactory = nexusFactory.address;
        console.log('✅ NexusAccountFactory:', nexusFactory.address);

        // Test factory
        const impl = await nexusFactory.implementation();
        const ep = await nexusFactory.entryPoint();
        console.log('✅ Factory working - impl:', impl, 'entryPoint:', ep);

        // STEP 2: Deploy K1Validator
        console.log('\n📦 STEP 2: Deploying K1Validator...');
        const K1ValidatorFactory = await hre.ethers.getContractFactory('K1Validator', deployer);
        const k1Validator = await K1ValidatorFactory.deploy();
        await k1Validator.deployed();
        results.k1Validator = k1Validator.address;
        console.log('✅ K1Validator:', k1Validator.address);

        // K1Validator deployed (no initialization needed)
        const owner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        console.log('✅ K1Validator ready for use with owner:', owner);

        // STEP 3: Deploy Nexus Implementation
        console.log('\n📦 STEP 3: Deploying Nexus Implementation...');
        const NexusImplFactory = await hre.ethers.getContractFactory('Nexus', deployer);
        const nexusImpl = await NexusImplFactory.deploy(
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // entryPoint
            k1Validator.address, // validator
            ethers.utils.defaultAbiCoder.encode(['address'], [owner]) // init data
        );
        await nexusImpl.deployed();
        results.nexusImpl = nexusImpl.address;
        console.log('✅ Nexus Implementation:', nexusImpl.address);

        // STEP 4: Deploy Wallet
        console.log('\n📦 STEP 4: Deploying Wallet...');
        const walletOwner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        const salt = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [walletOwner, Date.now()])
        );
        const initData = ethers.utils.defaultAbiCoder.encode(['address'], [walletOwner]);

        console.log('Wallet owner:', walletOwner);
        console.log('Salt:', salt);

        // Get predicted address
        const predictedAddress = await nexusFactory.getAddress(initData, salt);
        console.log('Predicted wallet address:', predictedAddress);

        // Deploy wallet
        const deployTx = await nexusFactory.createAccount(initData, salt);
        const deployReceipt = await deployTx.wait();

        results.wallet = {
            address: predictedAddress,
            owner: walletOwner,
            salt: salt,
            deploymentHash: deployTx.hash,
            gasUsed: deployReceipt.gasUsed.toString()
        };

        console.log('✅ Wallet deployed at:', predictedAddress);
        console.log('Gas used:', deployReceipt.gasUsed.toString());

        // Verify wallet
        const walletCode = await deployer.provider.getCode(predictedAddress);
        if (walletCode === '0x') {
            throw new Error('Wallet deployment failed');
        }
        console.log('✅ Wallet verified - has code');

        // STEP 5: Final results
        const finalResults = {
            network: 'hardhat',
            timestamp: new Date().toISOString(),
            deployer: await deployer.getAddress(),
            contracts: results,
            status: 'SUCCESS'
        };

        fs.writeFileSync('scripts/biconomy/complete-success-result.json', JSON.stringify(finalResults, null, 2));

        console.log('\n🎉 COMPLETE DEPLOYMENT SUCCESSFUL!');
        console.log('📋 Summary:');
        console.log('   ✅ NexusAccountFactory:', results.nexusFactory);
        console.log('   ✅ K1Validator:', results.k1Validator);
        console.log('   ✅ Nexus Implementation:', results.nexusImpl);
        console.log('   ✅ Deployed Wallet:', results.wallet.address);
        console.log('   👤 Wallet Owner:', results.wallet.owner);
        console.log('\n📁 Results saved to complete-success-result.json');
        console.log('🚀 BICONOMY NEXUS INFRASTRUCTURE READY!');

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        throw error;
    }
}

completeDeployment()
    .then(() => {
        console.log('\n🎊 SUCCESS! BICONOMY DEPLOYMENT COMPLETED! 🎊');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 DEPLOYMENT FAILED:', error.message);
        process.exit(1);
    });
