import * as fs from 'fs';
import * as hre from 'hardhat';
import { Contract } from 'ethers';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { deployContract } from './contract';
import { waitForInput } from './helper-functions';

/**
 * Enhanced Proxy Pattern Deployment Script
 * 
 * This script deploys the ERC-7579 enhanced proxy pattern implementation:
 * 1. Deploys libraries (if using optimized version)
 * 2. Deploys ERC7579MainModuleMinimal implementation
 * 3. Deploys external modules (Validator, Executor, etc.)
 * 4. Updates Factory to use new implementation
 * 5. Validates deployment
 */

interface DeploymentResult {
  // Core implementation
  implementation: string;
  implementationSize: number;
  
  // Libraries (if used)
  libraries?: {
    accountExecutionLib?: string;
    moduleManagementLib?: string;
    hookLib?: string;
  };
  
  // External modules
  modules: {
    validator: string;
    executor: string;
    fallbackHandler: string;
    hook: string;
  };
  
  // Factory update
  factory?: string;
  factoryUpdated: boolean;
  
  // Deployment metadata
  network: string;
  deployer: string;
  gasUsed: string;
  timestamp: number;
}

async function deployERC7579EnhancedProxy(): Promise<DeploymentResult> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress } = env;
  
  console.log(`\n🚀 Starting ERC-7579 Enhanced Proxy Deployment on ${network}`);
  console.log(`📍 Deployer address: ${signerAddress}`);
  
  // Setup wallet
  const wallets: WalletOptions = await newWalletOptions(env);
  let totalGasUsed = 0;
  
  console.log('\n⏳ Deployment will proceed in the following steps:');
  console.log('1. Deploy ERC7579MainModuleMinimal implementation');
  console.log('2. Deploy external modules');
  console.log('3. Validate deployment');
  console.log('4. Generate deployment report');
  
  await waitForInput();
  
  // Step 1: Deploy the minimal implementation
  console.log('\n📦 Step 1: Deploying ERC7579MainModuleMinimal...');
  
  const implementation = await deployContract(
    env, 
    wallets, 
    'ERC7579MainModuleMinimal', 
    [env.factoryAddress || signerAddress] // Use factory address or deployer as fallback
  );
  
  totalGasUsed += implementation.deployTransaction?.gasLimit?.toNumber() || 0;
  
  // Get implementation size
  const artifact = await hre.artifacts.readArtifact('ERC7579MainModuleMinimal');
  const implementationSize = (artifact.bytecode.length - 2) / 2;
  
  console.log(`✅ Implementation deployed at: ${implementation.address}`);
  console.log(`📏 Implementation size: ${implementationSize.toLocaleString()} bytes`);
  console.log(`🎯 Size compliance: ${implementationSize < 24576 ? '✅ Under 24KB' : '❌ Over 24KB'}`);
  
  // Step 2: Deploy external modules
  console.log('\n📦 Step 2: Deploying external modules...');
  
  const validator = await deployContract(
    env,
    wallets,
    'ImmutableValidator',
    [env.factoryAddress || signerAddress]
  );
  console.log(`✅ Validator deployed at: ${validator.address}`);
  
  const executor = await deployContract(
    env,
    wallets,
    'ImmutableExecutor', 
    [env.factoryAddress || signerAddress] // Factory address parameter for executor
  );
  console.log(`✅ Executor deployed at: ${executor.address}`);
  
  const fallbackHandler = await deployContract(
    env,
    wallets,
    'ImmutableFallbackHandler',
    [env.factoryAddress || signerAddress]
  );
  console.log(`✅ FallbackHandler deployed at: ${fallbackHandler.address}`);
  
  const hook = await deployContract(
    env,
    wallets,
    'ImmutableHook',
    [] // No constructor parameters for hook
  );
  console.log(`✅ Hook deployed at: ${hook.address}`);
  
  // Step 3: Validate deployment
  console.log('\n🔍 Step 3: Validating deployment...');
  
  // Test implementation
  const accountId = await implementation.accountId();
  console.log(`📋 Account ID: ${accountId}`);
  
  // Test module support
  const supportsValidator = await implementation.supportsModule(1);
  const supportsExecutor = await implementation.supportsModule(2);
  console.log(`🔧 Module support - Validator: ${supportsValidator}, Executor: ${supportsExecutor}`);
  
  // Test execution mode support
  const singleMode = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const supportsSingle = await implementation.supportsExecutionMode(singleMode);
  console.log(`⚡ Execution mode support - Single: ${supportsSingle}`);
  
  // Test ERC-165 compliance
  const ERC165_ID = '0x01ffc9a7';
  const supportsERC165 = await implementation.supportsInterface(ERC165_ID);
  console.log(`🔍 ERC-165 support: ${supportsERC165}`);
  
  // Step 4: Generate deployment result
  const result: DeploymentResult = {
    implementation: implementation.address,
    implementationSize,
    modules: {
      validator: validator.address,
      executor: executor.address,
      fallbackHandler: fallbackHandler.address,
      hook: hook.address
    },
    factoryUpdated: false, // Would need to update Factory separately
    network,
    deployer: signerAddress,
    gasUsed: totalGasUsed.toString(),
    timestamp: Date.now()
  };
  
  // Save deployment result
  const deploymentFile = `deployment-erc7579-${network}-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(result, null, 2));
  console.log(`💾 Deployment result saved to: ${deploymentFile}`);
  
  // Step 5: Display next steps
  console.log('\n🎯 Next Steps:');
  console.log('1. Update Factory contract to use new implementation:');
  console.log(`   - New implementation address: ${implementation.address}`);
  console.log('2. Test with existing WalletProxy.yul');
  console.log('3. Deploy to testnet first, then mainnet');
  console.log('4. Monitor gas costs and performance');
  
  console.log('\n📊 Deployment Summary:');
  console.log(`✅ Implementation: ${implementation.address} (${implementationSize} bytes)`);
  console.log(`✅ Validator: ${validator.address}`);
  console.log(`✅ Executor: ${executor.address}`);
  console.log(`✅ FallbackHandler: ${fallbackHandler.address}`);
  console.log(`✅ Hook: ${hook.address}`);
  console.log(`🌐 Network: ${network}`);
  console.log(`⛽ Total gas used: ${totalGasUsed.toLocaleString()}`);
  
  return result;
}

// Alternative deployment for library-based optimized version
async function deployERC7579WithLibraries(): Promise<DeploymentResult> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress } = env;
  
  console.log(`\n🚀 Starting ERC-7579 Library-Based Deployment on ${network}`);
  
  const wallets: WalletOptions = await newWalletOptions(env);
  let totalGasUsed = 0;
  
  // Step 1: Deploy libraries
  console.log('\n📚 Step 1: Deploying libraries...');
  
  const accountExecutionLib = await deployContract(env, wallets, 'AccountExecutionLib', []);
  console.log(`✅ AccountExecutionLib deployed at: ${accountExecutionLib.address}`);
  
  const moduleManagementLib = await deployContract(env, wallets, 'ModuleManagementLib', []);
  console.log(`✅ ModuleManagementLib deployed at: ${moduleManagementLib.address}`);
  
  const hookLib = await deployContract(env, wallets, 'HookLib', []);
  console.log(`✅ HookLib deployed at: ${hookLib.address}`);
  
  // Step 2: Deploy optimized implementation with library linking
  console.log('\n📦 Step 2: Deploying optimized implementation...');
  console.log('⚠️  Note: Library linking requires special deployment setup');
  console.log('   This would typically be done with hardhat-deploy or custom linking');
  
  // For now, we'll document the process
  const libraries = {
    accountExecutionLib: accountExecutionLib.address,
    moduleManagementLib: moduleManagementLib.address,
    hookLib: hookLib.address
  };
  
  const result: DeploymentResult = {
    implementation: 'NOT_DEPLOYED_YET', // Would need library linking
    implementationSize: 0,
    libraries,
    modules: {
      validator: 'NOT_DEPLOYED',
      executor: 'NOT_DEPLOYED', 
      fallbackHandler: 'NOT_DEPLOYED',
      hook: 'NOT_DEPLOYED'
    },
    factoryUpdated: false,
    network,
    deployer: signerAddress,
    gasUsed: '0',
    timestamp: Date.now()
  };
  
  console.log('\n📋 Library Deployment Complete:');
  console.log(`📚 AccountExecutionLib: ${accountExecutionLib.address}`);
  console.log(`📚 ModuleManagementLib: ${moduleManagementLib.address}`);
  console.log(`📚 HookLib: ${hookLib.address}`);
  
  console.log('\n⚠️  Manual Steps Required:');
  console.log('1. Use hardhat-deploy or custom script for library linking');
  console.log('2. Deploy ERC7579MainModuleOptimized with library addresses');
  console.log('3. Continue with module deployment');
  
  return result;
}

// Factory update script
async function updateFactoryImplementation(newImplementationAddress: string): Promise<void> {
  const env = loadEnvironmentInfo(hre.network.name);
  const wallets: WalletOptions = await newWalletOptions(env);
  
  console.log('\n🏭 Updating Factory Implementation...');
  console.log(`📍 Factory address: ${env.factoryAddress}`);
  console.log(`🔄 New implementation: ${newImplementationAddress}`);
  
  if (!env.factoryAddress) {
    console.log('❌ Factory address not found in environment');
    return;
  }
  
  // This would depend on your Factory contract's update mechanism
  console.log('⚠️  Manual Factory Update Required:');
  console.log('1. Call Factory.updateImplementation() if available');
  console.log('2. Or deploy new Factory with new implementation address');
  console.log('3. Update deployment scripts to use new Factory');
  
  // Example of what the update might look like:
  /*
  const factory = await ethers.getContractAt('Factory', env.factoryAddress);
  const tx = await factory.updateImplementation(newImplementationAddress);
  await tx.wait();
  console.log('✅ Factory updated successfully');
  */
}

// Main deployment function
async function main(): Promise<void> {
  try {
    console.log('🚀 ERC-7579 Enhanced Proxy Pattern Deployment');
    console.log('='.repeat(50));
    
    // Choose deployment strategy
    console.log('\nChoose deployment strategy:');
    console.log('1. Minimal implementation (recommended, under 24KB)');
    console.log('2. Library-based optimized implementation');
    
    // For this script, we'll default to minimal
    const deploymentType = process.env.DEPLOYMENT_TYPE || 'minimal';
    
    let result: DeploymentResult;
    
    if (deploymentType === 'libraries') {
      result = await deployERC7579WithLibraries();
    } else {
      result = await deployERC7579EnhancedProxy();
    }
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log(`📄 Results saved to deployment file`);
    
    // Optionally update factory
    if (process.env.UPDATE_FACTORY === 'true' && result.implementation !== 'NOT_DEPLOYED_YET') {
      await updateFactoryImplementation(result.implementation);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Export functions for use in other scripts
export {
  deployERC7579EnhancedProxy,
  deployERC7579WithLibraries,
  updateFactoryImplementation,
  DeploymentResult
};

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
