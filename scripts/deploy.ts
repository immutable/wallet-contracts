import { ethers } from 'hardhat'
import {Factory, Factory__factory, ImmutableSigner, ImmutableSigner__factory, LatestWalletImplLocator, LatestWalletImplLocator__factory, MainModuleDynamicAuth, MainModuleDynamicAuth__factory, MultiCallDeploy, MultiCallDeploy__factory, StartupWalletImpl, StartupWalletImpl__factory} from "../src/gen/adapter/index"

async function deploy() {
    // get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
  
    // check account balance
    console.log(
      "Account balance:",
      ethers.utils.formatEther(await deployer.getBalance())
    );
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