import path = require('path');
import fs = require('fs');
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'ethers';
import { ethers as hardhat } from 'hardhat'

const outputPath = path.join(__dirname, './deploy_output.json');
let deployer : SignerWithAddress;

async function deploy() {
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
        multiCallDeployer,
    ] = await hardhat.getSigners();

    deployer = contractDeployer;

    // Setup flow
    // 1. Deploy factory
    const factory = await deployFactory(factoryAdmin.address, factoryDeployer.address);
    console.log(factory.address)
    // 2. Deploy wallet impl locator
    const walletImplLocator = await deployWalletImplLocator(walletImplLocatorAdmin.address, walletImplLocatorImplChanger.address);
    // 3. Deploy startup wallet impl
    const startupWalletImpl = await deployStartUp(walletImplLocator.address);
    // 4. Deploy main module dynamic auth
    const mainModule = await deployMainModule(factory.address, startupWalletImpl.address);
    // 5. Set implementation address on impl locator to dyanmic module auth addr
    const tx = await walletImplLocator.connect(walletImplLocatorImplChanger).changeWalletImplementation(mainModule.address);
    await tx.wait();
    // 6. Deploy immutable signer
    const immutableSigner = await deployImmutableSigner(signerRootAdmin.address, signerAdmin.address, signer.address);
    // 7. Deploy multi call deploy
    const multiCallDeploy = await deployMultiCallDeploy(multiCallAdmin.address, multiCallDeployer.address);
    console.log("Finished deploying contracts")

    // Output JSON file with addresses and role addresses
    const JSONOutput = {
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
        MultiCallDeployerAddress: multiCallDeployer.address,
    }
    fs.writeFileSync(outputPath, JSON.stringify(JSONOutput, null, 1));
}

async function deployFactory(adminAddr : string, deployerAddr : string) : Promise<ethers.Contract> {
    const Factory = await hardhat.getContractFactory("Factory");
    return await Factory.connect(deployer).deploy(adminAddr, deployerAddr);
}

async function deployWalletImplLocator(adminAddr : string, implChangerAddr : string) :  Promise<ethers.Contract> {
    const LatestWalletImplLocator = await hardhat.getContractFactory("LatestWalletImplLocator");
    return await LatestWalletImplLocator.connect(deployer).deploy(adminAddr, implChangerAddr);
}

async function deployStartUp(walletImplLocatorAddr : string ) : Promise<ethers.Contract> {
    const StartupWalletImplImpl = await hardhat.getContractFactory("StartupWalletImpl");
    return await StartupWalletImplImpl.connect(deployer).deploy(walletImplLocatorAddr);
}

async function deployMainModule(factoryAddr : string, startUpAddr : string) : Promise<ethers.Contract>{
    const MainModuleDynamicAuth = await hardhat.getContractFactory("MainModuleDynamicAuth");
    return await MainModuleDynamicAuth.connect(deployer).deploy(factoryAddr, startUpAddr);
}

async function deployImmutableSigner(rootAdminAddr : string, signerAdminAddr : string, signerAddr : string) : Promise<ethers.Contract> {
    const ImmutableSigner = await hardhat.getContractFactory("ImmutableSigner");
    return await ImmutableSigner.connect(deployer).deploy(rootAdminAddr, signerAdminAddr, signerAddr);
}

async function deployMultiCallDeploy(adminAddr : string, executorAddr : string) : Promise<ethers.Contract> {
    const MultiCallDeploy = await hardhat.getContractFactory("MultiCallDeploy");
    return await MultiCallDeploy.connect(deployer).deploy(adminAddr, executorAddr);
}

deploy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});