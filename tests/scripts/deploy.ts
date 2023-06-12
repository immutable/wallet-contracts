import path = require('path');
import fs = require('fs');
import hre = require('hardhat')
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'ethers';
import { ethers as hardhat } from 'hardhat'
const { expect } = require('chai');

const outputPath = path.join(__dirname, './deploy_output.json');
let deployer : SignerWithAddress;

async function deploy() {
    // Required private keys:
    // 1. Deployer
    // 2. walletImplLocatorChanger
    // Get signers for each role
    const [
        contractDeployer,
        factoryAdmin, 
        factoryDeployer,
        walletImplLocatorAdmin,
        walletImplLocatorImplChanger,
        signerRootAdmin,
        signerAdmin,
        signer, // Immutable signer
        multiCallAdmin,
        multiCallExectutor, // Submitter EOA
    ] = await hardhat.getSigners();

    deployer = contractDeployer;
    // TOTAL deployment cost = 0.009766773 GWEI = 0.000000000009766773 ETHER
    // Deployments with esimated gas costs (GWEI)
    console.log("Deploying contracts...");
    // 1. Deploy multi call deploy 
    // EST gas cost: 0.001561956
    const multiCallDeploy = await deployMultiCallDeploy(multiCallAdmin.address, multiCallExectutor.address);
    console.log("Multi Call Deploy deployed to: ", multiCallDeploy.address);
    // 2. Deploy factory with multi call deploy address as deployer role EST
    // EST gas cost: 0.001239658
    const factory = await deployFactory(factoryAdmin.address, multiCallDeploy.address);
    console.log("Factory deployed to: ", factory.address)
    // 3. Deploy wallet impl locator
    // EST gas cost: 0.001021586
    const walletImplLocator = await deployWalletImplLocator(walletImplLocatorAdmin.address, walletImplLocatorImplChanger.address);
    console.log("Wallet Implentation Locator deployed to: ", walletImplLocator.address);
    // 4. Deploy startup wallet impl
    // EST gas cost: 0.000175659
    const startupWalletImpl = await deployStartUp(walletImplLocator.address);
    console.log("Startup Wallet Impl deployed to: ", startupWalletImpl.address);
    // 5. Deploy main module dynamic auth
    // EST gas cost: 0.003911813
    const mainModule = await deployMainModule(factory.address, startupWalletImpl.address);
    console.log("Main Module Dynamic Auth deployed to: ", mainModule.address)
    // 6. Deploy immutable signer
    // EST gas cost: 0.001856101
    const immutableSigner = await deployImmutableSigner(signerRootAdmin.address, signerAdmin.address, signer.address);
    console.log("Immutable Signer deployed to: ", immutableSigner.address);
    console.log("Finished deploying contracts")

    // Set implementation address on impl locator to dyanmic module auth addr
    const tx = await walletImplLocator.connect(walletImplLocatorImplChanger).changeWalletImplementation(mainModule.address);
    await tx.wait();
    console.log("Wallet Implentation Locator implementation changed to: ", mainModule.address);


    // Output JSON file with addresses and role addresses
    let chainID = (await ethers.getDefaultProvider().getNetwork()).chainId;
    const JSONOutput = {
        chainID: chainID,
        FactoryAddress: factory.address,
        WalletImplLocatorAddress: walletImplLocator.address,
        StartupWalletImplAddress: startupWalletImpl.address,
        MainModuleDynamicAuthAddress: mainModule.address,
        ImmutableSignerAddress: immutableSigner.address,
        MultiCallDeployAddress: multiCallDeploy.address,
        DeployerAddress: deployer.address,
        FactoryAdminAddress: factoryAdmin.address,
        FactoryDeployerAddress: factoryDeployer.address,
        WalletImplLocatorAdminAddress: walletImplLocatorAdmin.address,
        WalletImplLocatorImplChangerAddress: walletImplLocatorImplChanger.address,
        SignerRootAdminAddress: signerRootAdmin.address,
        SignerAdminAddress: signerAdmin.address,
        SignerAddress: signer.address,
        MultiCallAdminAddress: multiCallAdmin.address,
        MultiCallExecutorAddress: multiCallExectutor.address,
    }
    fs.writeFileSync(outputPath, JSON.stringify(JSONOutput, null, 1));

    // Verify contracts on etherscan
    console.log("Verifying contracts on etherscan...");
    await verifyContract(multiCallDeploy.address, [multiCallAdmin.address, multiCallExectutor.address]);
    console.log("Multi Call Deploy verified")
    await verifyContract(factory.address,  [factoryAdmin.address, factoryDeployer.address]);
    console.log("Factory verified")
    await verifyContract(walletImplLocator.address, [walletImplLocatorAdmin.address, walletImplLocatorImplChanger.address]);
    console.log("Wallet Implentation Locator verified")
    await verifyContract(startupWalletImpl.address, [walletImplLocator.address]);
    console.log("Startup Wallet Impl verified")
    await verifyContract(mainModule.address, [factory.address, startupWalletImpl.address]);
    console.log("Main Module Dynamic Auth verified")
    await verifyContract(immutableSigner.address, [signerRootAdmin.address, signerAdmin.address, signer.address]);
    console.log("Immutable Signer verified")
}

async function deployFactory(adminAddr : string, deployerAddr : string) : Promise<ethers.Contract> {
    const Factory = await hardhat.getContractFactory("Factory");
    const gasCost = await ethers.getDefaultProvider().estimateGas(Factory.getDeployTransaction(adminAddr, deployerAddr));
    console.log(ethers.utils.formatUnits(gasCost, "gwei"));
    return await Factory.connect(deployer).deploy(adminAddr, deployerAddr);
}

async function deployWalletImplLocator(adminAddr : string, implChangerAddr : string) :  Promise<ethers.Contract> {
    const LatestWalletImplLocator = await hardhat.getContractFactory("LatestWalletImplLocator");
    const gasCost = await ethers.getDefaultProvider().estimateGas(LatestWalletImplLocator.getDeployTransaction(adminAddr, implChangerAddr));
    console.log(ethers.utils.formatUnits(gasCost, "gwei"));
    return await LatestWalletImplLocator.connect(deployer).deploy(adminAddr, implChangerAddr);
}

async function deployStartUp(walletImplLocatorAddr : string ) : Promise<ethers.Contract> {
    const StartupWalletImplImpl = await hardhat.getContractFactory("StartupWalletImpl");
    const gasCost = await ethers.getDefaultProvider().estimateGas(StartupWalletImplImpl.getDeployTransaction(walletImplLocatorAddr));
    console.log(ethers.utils.formatUnits(gasCost, "gwei"));
    return await StartupWalletImplImpl.connect(deployer).deploy(walletImplLocatorAddr);
}

async function deployMainModule(factoryAddr : string, startUpAddr : string) : Promise<ethers.Contract>{
    const MainModuleDynamicAuth = await hardhat.getContractFactory("MainModuleDynamicAuth");
    const gasCost = await ethers.getDefaultProvider().estimateGas(MainModuleDynamicAuth.getDeployTransaction(factoryAddr, startUpAddr));
    console.log(ethers.utils.formatUnits(gasCost, "gwei"));
    return await MainModuleDynamicAuth.connect(deployer).deploy(factoryAddr, startUpAddr);
}

async function deployImmutableSigner(rootAdminAddr : string, signerAdminAddr : string, signerAddr : string) : Promise<ethers.Contract> {
    const ImmutableSigner = await hardhat.getContractFactory("ImmutableSigner");
    const gasCost = await ethers.getDefaultProvider().estimateGas(ImmutableSigner.getDeployTransaction(rootAdminAddr, signerAdminAddr, signerAddr));
    console.log(ethers.utils.formatUnits(gasCost, "gwei"));
    return await ImmutableSigner.connect(deployer).deploy(rootAdminAddr, signerAdminAddr, signerAddr);
}

async function deployMultiCallDeploy(adminAddr : string, executorAddr : string) : Promise<ethers.Contract> {
    const MultiCallDeploy = await hardhat.getContractFactory("MultiCallDeploy");
    const gasCost = await ethers.getDefaultProvider().estimateGas(MultiCallDeploy.getDeployTransaction(adminAddr, executorAddr));
    console.log(ethers.utils.formatUnits(gasCost, "gwei"));
    return await MultiCallDeploy.connect(deployer).deploy(adminAddr, executorAddr);
}

async function verifyContract(contractAddr : string, constructorArgs : string[]) {
    try {
        await hre.run("verify:verify", {
            address: contractAddr,
            constructorArguments: constructorArgs,
        });
    } catch (error) {
        expect(error.message.toLowerCase().includes('already verified')).to.be.equal(true);
    }
  
}

deploy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});