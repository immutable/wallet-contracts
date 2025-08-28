import * as hre from 'hardhat';
import { Contract } from 'ethers';
import { EnvironmentInfo, loadEnvironmentInfo } from './environment';
import { newWalletOptions, WalletOptions } from './wallet-options';
import { waitForInput } from './helper-functions';

/**
 * Factory Update Script for ERC-7579 Enhanced Proxy Pattern
 * 
 * This script updates the existing Factory contract to use the new
 * ERC7579MainModuleMinimal implementation while maintaining compatibility
 * with existing wallets.
 */

interface FactoryUpdateResult {
  factoryAddress: string;
  oldImplementation: string;
  newImplementation: string;
  updateMethod: 'direct' | 'new_factory' | 'manual';
  success: boolean;
  transactionHash?: string;
  gasUsed?: string;
  network: string;
  timestamp: number;
}

async function updateFactoryImplementation(): Promise<FactoryUpdateResult> {
  const env = loadEnvironmentInfo(hre.network.name);
  const { network, signerAddress } = env;
  
  console.log(`\n🏭 Factory Update for ERC-7579 Enhanced Proxy Pattern`);
  console.log(`🌐 Network: ${network}`);
  console.log(`👤 Signer: ${signerAddress}`);
  
  // Get deployment parameters
  const newImplementationAddress = process.env.NEW_IMPLEMENTATION_ADDRESS;
  const factoryAddress = env.factoryAddress;
  
  if (!newImplementationAddress) {
    throw new Error('NEW_IMPLEMENTATION_ADDRESS environment variable is required');
  }
  
  if (!factoryAddress) {
    throw new Error('Factory address not found in environment configuration');
  }
  
  console.log(`📍 Factory address: ${factoryAddress}`);
  console.log(`🔄 New implementation: ${newImplementationAddress}`);
  
  const wallets: WalletOptions = await newWalletOptions(env);
  
  // Step 1: Analyze current Factory contract
  console.log('\n🔍 Step 1: Analyzing current Factory contract...');
  
  let factory: Contract;
  let factoryArtifact: any;
  
  try {
    // Try to get the Factory contract
    factoryArtifact = await hre.artifacts.readArtifact('Factory');
    factory = await hre.ethers.getContractAt('Factory', factoryAddress);
    
    console.log('✅ Factory contract found and connected');
  } catch (error) {
    console.log('❌ Could not connect to Factory contract:', error);
    throw error;
  }
  
  // Step 2: Check current implementation
  console.log('\n📋 Step 2: Checking current implementation...');
  
  let currentImplementation = 'UNKNOWN';
  try {
    // This depends on your Factory contract's interface
    // Common patterns:
    if (factory.implementation) {
      currentImplementation = await factory.implementation();
    } else if (factory.getImplementation) {
      currentImplementation = await factory.getImplementation();
    } else {
      console.log('⚠️  Factory does not expose current implementation');
    }
    
    console.log(`📍 Current implementation: ${currentImplementation}`);
  } catch (error) {
    console.log('⚠️  Could not read current implementation:', error);
  }
  
  // Step 3: Validate new implementation
  console.log('\n✅ Step 3: Validating new implementation...');
  
  try {
    const newImpl = await hre.ethers.getContractAt('ERC7579MainModuleMinimal', newImplementationAddress);
    
    // Test basic functionality
    const accountId = await newImpl.accountId();
    const supportsERC165 = await newImpl.supportsInterface('0x01ffc9a7');
    
    console.log(`📋 New implementation account ID: ${accountId}`);
    console.log(`🔍 ERC-165 support: ${supportsERC165}`);
    console.log('✅ New implementation validation passed');
    
  } catch (error) {
    console.log('❌ New implementation validation failed:', error);
    throw error;
  }
  
  // Step 4: Determine update method
  console.log('\n🔧 Step 4: Determining update method...');
  
  let updateMethod: 'direct' | 'new_factory' | 'manual' = 'manual';
  let canUpdate = false;
  
  try {
    // Check if Factory has update functions
    const factoryInterface = new hre.ethers.utils.Interface(factoryArtifact.abi);
    
    if (factoryInterface.getFunction('updateImplementation')) {
      updateMethod = 'direct';
      canUpdate = true;
      console.log('✅ Factory supports direct implementation updates');
    } else {
      console.log('⚠️  Factory does not support direct updates');
      console.log('   Options: 1) Deploy new Factory, 2) Manual update process');
    }
  } catch (error) {
    console.log('⚠️  Could not determine update method:', error);
  }
  
  // Step 5: Perform update
  console.log('\n🚀 Step 5: Performing update...');
  
  let result: FactoryUpdateResult = {
    factoryAddress,
    oldImplementation: currentImplementation,
    newImplementation: newImplementationAddress,
    updateMethod,
    success: false,
    network,
    timestamp: Date.now()
  };
  
  if (updateMethod === 'direct' && canUpdate) {
    console.log('⏳ Executing direct update...');
    
    await waitForInput();
    
    try {
      const tx = await factory.updateImplementation(newImplementationAddress);
      const receipt = await tx.wait();
      
      result.success = true;
      result.transactionHash = tx.hash;
      result.gasUsed = receipt.gasUsed.toString();
      
      console.log('✅ Factory updated successfully!');
      console.log(`📄 Transaction hash: ${tx.hash}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
    } catch (error) {
      console.log('❌ Direct update failed:', error);
      result.success = false;
    }
    
  } else {
    console.log('📋 Manual update process required:');
    console.log('');
    console.log('Option 1: Deploy New Factory');
    console.log('1. Deploy new Factory contract with new implementation address');
    console.log('2. Update deployment scripts to use new Factory address');
    console.log('3. Existing wallets continue using old Factory/implementation');
    console.log('4. New wallets use new Factory/implementation');
    console.log('');
    console.log('Option 2: Governance/Admin Update');
    console.log('1. Use governance process to update Factory (if supported)');
    console.log('2. Call admin functions to change implementation');
    console.log('3. Coordinate with multisig/timelock if required');
    console.log('');
    console.log('Option 3: Gradual Migration');
    console.log('1. Deploy new Factory alongside existing one');
    console.log('2. Gradually migrate users to new Factory');
    console.log('3. Eventually deprecate old Factory');
    
    result.updateMethod = 'manual';
    result.success = false; // Not automatically updated
  }
  
  // Step 6: Validation and next steps
  if (result.success) {
    console.log('\n🔍 Step 6: Validating update...');
    
    try {
      const updatedImplementation = await factory.implementation();
      if (updatedImplementation.toLowerCase() === newImplementationAddress.toLowerCase()) {
        console.log('✅ Update validation successful');
        console.log(`📍 Factory now uses: ${updatedImplementation}`);
      } else {
        console.log('❌ Update validation failed');
        console.log(`Expected: ${newImplementationAddress}`);
        console.log(`Actual: ${updatedImplementation}`);
      }
    } catch (error) {
      console.log('⚠️  Could not validate update:', error);
    }
  }
  
  // Step 7: Display next steps
  console.log('\n🎯 Next Steps:');
  
  if (result.success) {
    console.log('✅ Factory update completed successfully!');
    console.log('1. Test wallet deployment with new implementation');
    console.log('2. Verify ERC-7579 functionality');
    console.log('3. Monitor gas costs and performance');
    console.log('4. Update documentation and deployment guides');
  } else {
    console.log('⚠️  Manual intervention required:');
    console.log('1. Choose appropriate update method from options above');
    console.log('2. Coordinate with team/governance as needed');
    console.log('3. Test thoroughly before production deployment');
    console.log('4. Plan migration strategy for existing users');
  }
  
  console.log('\n📊 Update Summary:');
  console.log(`🏭 Factory: ${factoryAddress}`);
  console.log(`🔄 Method: ${updateMethod}`);
  console.log(`📍 Old implementation: ${currentImplementation}`);
  console.log(`📍 New implementation: ${newImplementationAddress}`);
  console.log(`✅ Success: ${result.success}`);
  console.log(`🌐 Network: ${network}`);
  
  return result;
}

// Helper function to deploy new Factory if needed
async function deployNewFactory(implementationAddress: string): Promise<string> {
  const env = loadEnvironmentInfo(hre.network.name);
  const wallets: WalletOptions = await newWalletOptions(env);
  
  console.log('\n🏭 Deploying new Factory with ERC-7579 implementation...');
  
  try {
    const Factory = await hre.ethers.getContractFactory('Factory');
    const factory = await Factory.deploy(implementationAddress);
    await factory.deployed();
    
    console.log(`✅ New Factory deployed at: ${factory.address}`);
    console.log(`📍 Implementation: ${implementationAddress}`);
    
    return factory.address;
  } catch (error) {
    console.log('❌ New Factory deployment failed:', error);
    throw error;
  }
}

// Helper function to create migration plan
function createMigrationPlan(): void {
  console.log('\n📋 ERC-7579 Migration Plan:');
  console.log('');
  console.log('Phase 1: Preparation');
  console.log('- ✅ Deploy ERC7579MainModuleMinimal');
  console.log('- ✅ Deploy external modules');
  console.log('- ⏳ Update Factory (current step)');
  console.log('- ⏳ Test on testnet');
  console.log('');
  console.log('Phase 2: Gradual Rollout');
  console.log('- ⏳ Deploy to mainnet');
  console.log('- ⏳ New wallets use ERC-7579 implementation');
  console.log('- ⏳ Existing wallets continue with current implementation');
  console.log('- ⏳ Monitor performance and gas costs');
  console.log('');
  console.log('Phase 3: Full Migration (Optional)');
  console.log('- ⏳ Provide upgrade path for existing wallets');
  console.log('- ⏳ Deprecate old implementation');
  console.log('- ⏳ Full ERC-7579 ecosystem');
}

// Main function
async function main(): Promise<void> {
  try {
    console.log('🏭 Factory Update for ERC-7579 Enhanced Proxy Pattern');
    console.log('='.repeat(60));
    
    createMigrationPlan();
    
    const result = await updateFactoryImplementation();
    
    // Save result
    const resultFile = `factory-update-${result.network}-${result.timestamp}.json`;
    require('fs').writeFileSync(resultFile, JSON.stringify(result, null, 2));
    console.log(`💾 Update result saved to: ${resultFile}`);
    
    if (result.success) {
      console.log('\n🎉 Factory update completed successfully!');
    } else {
      console.log('\n⚠️  Manual intervention required for Factory update');
    }
    
  } catch (error) {
    console.error('❌ Factory update failed:', error);
    process.exit(1);
  }
}

// Export functions
export {
  updateFactoryImplementation,
  deployNewFactory,
  createMigrationPlan,
  FactoryUpdateResult
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
