import { ethers } from 'hardhat'
import {Factory, Factory__factory, ImmutableSigner, ImmutableSigner__factory, LatestWalletImplLocator, LatestWalletImplLocator__factory, MainModuleDynamicAuth, MainModuleDynamicAuth__factory, MultiCallDeploy, MultiCallDeploy__factory, StartupWalletImpl, StartupWalletImpl__factory} from "../src/gen/adapter/index"

async function deploy() {
    // Get signers for each role
    const [
        factoryAdmin, 
        factoryDeployer,
        walletImplLocatorAdmin,
        walletImplLocatorImplChanger,
        signerRootAdmin,
        signerAdmin,
        signer, // Immutable signer
        multiCallAdmin,
        multiCallDeployer,
    ] = await ethers.getSigners();


    // Setup flow
    // 1. Deploy factory
    const factory = await deployFactory(factoryAdmin.address, factoryDeployer.address);
    console.log("step 1")
    // 2. Deploy wallet impl locator
    const walletImplLocator = await deployWalletImplLocator(walletImplLocatorAdmin.address, walletImplLocatorImplChanger.address);
    // 3. Deploy startup wallet impl
    const startupWalletImpl = await deployStartUp(walletImplLocator.address);
    // 4. Deploy main module dynamic auth
    const mainModule = await deployMainModule(factory.address, startupWalletImpl.address);
    // 5. Set implementation address on impl locator to dyanmic module auth addr
    const tx = await walletImplLocator.connect(walletImplLocatorImplChanger).changeWalletImplementation(mainModule.address);
    await tx.wait();
    console.log("Step 5");
    // 6. Deploy immutable signer
    const immutableSigner = await deployImmutableSigner(signerRootAdmin.address, signerAdmin.address, signer.address);
    // 7. Deploy multi call deploy
    const multiCallDeploy = await deployMultiCallDeploy(multiCallAdmin.address, multiCallDeployer.address);
    
    // Output JSON file with addresses and role addresses
}

async function deployFactory(adminAddr : string, deployerAddr : string) : Promise<Factory> {
    return await new Factory__factory().deploy(adminAddr, deployerAddr);
}

async function deployWalletImplLocator(adminAddr : string, implChangerAddr : string) : Promise<LatestWalletImplLocator> {
    return await new LatestWalletImplLocator__factory().deploy(adminAddr, implChangerAddr);
}

async function deployStartUp(walletImplLocatorAddr : string ) : Promise<StartupWalletImpl>  {
    return await new StartupWalletImpl__factory().deploy(walletImplLocatorAddr);
}

async function deployMainModule(factoryAddr : string, startUpAddr : string) : Promise<MainModuleDynamicAuth> {
    return await new MainModuleDynamicAuth__factory().deploy(factoryAddr, startUpAddr);
}

async function deployImmutableSigner(rootAdminAddr : string, signerAdminAddr : string, signerAddr : string) : Promise<ImmutableSigner> {
    return await new ImmutableSigner__factory().deploy(rootAdminAddr, signerAdminAddr, signerAddr);
}

async function deployMultiCallDeploy(adminAddr : string, executorAddr : string) : Promise<MultiCallDeploy> {
    return await new MultiCallDeploy__factory().deploy(adminAddr, executorAddr);
}

deploy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});