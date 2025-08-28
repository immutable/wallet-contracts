import { expect } from 'chai';
import { artifacts } from 'hardhat';

describe('ERC7579 Contract Size Analysis', function () {
  it('should compare contract sizes', async function () {
    const originalArtifact = await artifacts.readArtifact('ERC7579MainModuleModular');
    const optimizedArtifact = await artifacts.readArtifact('ERC7579MainModuleOptimized');
    const minimalArtifact = await artifacts.readArtifact('ERC7579MainModuleMinimal');
    
    const originalSize = (originalArtifact.bytecode.length - 2) / 2;
    const optimizedSize = (optimizedArtifact.bytecode.length - 2) / 2;
    const minimalSize = (minimalArtifact.bytecode.length - 2) / 2;
    
    console.log('\n📏 Contract Size Comparison:');
    console.log(`Original (ERC7579MainModuleModular): ${originalSize.toLocaleString()} bytes`);
    console.log(`Optimized (with libraries): ${optimizedSize.toLocaleString()} bytes`);
    console.log(`Minimal (ultra-optimized): ${minimalSize.toLocaleString()} bytes`);
    console.log(`24KB Limit: ${(24576).toLocaleString()} bytes`);
    
    console.log('\n📊 Size Reductions:');
    console.log(`Optimized vs Original: ${(originalSize - optimizedSize).toLocaleString()} bytes (${((originalSize - optimizedSize) / originalSize * 100).toFixed(1)}%)`);
    console.log(`Minimal vs Original: ${(originalSize - minimalSize).toLocaleString()} bytes (${((originalSize - minimalSize) / originalSize * 100).toFixed(1)}%)`);
    console.log(`Minimal vs Optimized: ${(optimizedSize - minimalSize).toLocaleString()} bytes (${((optimizedSize - minimalSize) / optimizedSize * 100).toFixed(1)}%)`);
    
    console.log('\n✅ Size Compliance:');
    console.log(`Original under 24KB: ${originalSize < 24576 ? '✅' : '❌'}`);
    console.log(`Optimized under 24KB: ${optimizedSize < 24576 ? '✅' : '❌'}`);
    console.log(`Minimal under 24KB: ${minimalSize < 24576 ? '✅' : '❌'}`);
    
    // The minimal version should definitely be under the limit
    expect(minimalSize).to.be.lessThan(24576);
  });
});
