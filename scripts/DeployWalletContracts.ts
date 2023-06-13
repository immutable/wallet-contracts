import * as path from 'path';
import * as fs from 'fs';
import * as hre from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'ethers';
import { ethers as hardhat } from 'hardhat'
const { expect } = require('chai');
require('dotenv').config();

const outputPath = path.join(__dirname, './deploy_output.json');
let deployer : SignerWithAddress;

async function deploy() {
    if (typeof process.env.ETHERSCAN_API_KEY === 'undefined') {
        throw new Error('Etherscan API KEY has not been defined');
    }

    // /dev/imx-evm-relayer/EOA_SUBMITTER
    let relayerSubmitterEOAPubKey = "0xBC52cE84FceFd2D941D1127608D6Cf598f9633d3"
    // /dev/imx-evm-relayer/IMMUTABLE_SIGNER_CONTRACT
    let immutableSignerPubKey = "0x1cE50560686b1297B6311F36B47dbe5d6E04D0f8"
    let multiCallAdminPubKey = "0x4226dBE2CBe6Be478315d5ffb29D3FE9256fdE2d"
    let factoryAdminPubKey = "0xB50dF46bFAeBB3Fb58CBb6B6B70A76A823d1c4d7"
    let walletImplLocatorAdmin = "0x6918973Aa3A3689eE017aF7F77B08015952cE368"
    let signerRootAdminPubKey = "0x1768555FAC0920e2EA769cA5299AB6eD4E212bFe"
    let signerAdminPubKey = "0xB72297fa1839FA4aB4553aeCAB6A2b1C979DF512"

    // Required private keys:
    // 1. Deployer
    // 2. walletImplLocatorChanger
    const [
        contractDeployer,
        walletImplLocatorImplChanger, 
    ] = await hardhat.getSigners();
    deployer = contractDeployer;

    // TOTAL deployment cost = 0.009766773 GWEI = 0.000000000009766773 ETHER
    // Deployments with esimated gas costs (GWEI)
    console.log("Deploying contracts...");
    // 1. Deploy multi call deploy 
    // EST gas cost: 0.001561956
    const multiCallDeploy = await deployMultiCallDeploy(multiCallAdminPubKey, relayerSubmitterEOAPubKey);
    console.log("Multi Call Deploy deployed to: ", multiCallDeploy.address);
    // 2. Deploy factory with multi call deploy address as deployer role EST
    // EST gas cost: 0.001239658
    const factory = await deployFactory(factoryAdminPubKey, multiCallDeploy.address);
    console.log("Factory deployed to: ", factory.address)
    // 3. Deploy wallet impl locator
    // EST gas cost: 0.001021586
    const walletImplLocator = await deployWalletImplLocator(walletImplLocatorAdmin, walletImplLocatorImplChanger.address);
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
    const immutableSigner = await deployImmutableSigner(signerRootAdminPubKey, signerAdminPubKey, immutableSignerPubKey);
    console.log("Immutable Signer deployed to: ", immutableSigner.address);
    console.log("Finished deploying contracts")

    // Set implementation address on impl locator to dyanmic module auth addr
    const tx = await walletImplLocator.connect(walletImplLocatorImplChanger).changeWalletImplementation(mainModule.address);
    await tx.wait();
    console.log("Wallet Implentation Locator implementation changed to: ", mainModule.address);


    // Output JSON file with addresses and role addresses
    const JSONOutput = {
        FactoryAddress: factory.address,
        WalletImplLocatorAddress: walletImplLocator.address,
        StartupWalletImplAddress: startupWalletImpl.address,
        MainModuleDynamicAuthAddress: mainModule.address,
        ImmutableSignerContractAddress: immutableSigner.address,
        MultiCallDeployAddress: multiCallDeploy.address,
        DeployerAddress: deployer.address,
        FactoryAdminAddress: factoryAdminPubKey,
        FactoryDeployerAddress: relayerSubmitterEOAPubKey,
        WalletImplLocatorAdminAddress: walletImplLocatorAdmin,
        WalletImplLocatorImplChangerAddress: walletImplLocatorImplChanger.address,
        SignerRootAdminAddress: signerRootAdminPubKey,
        SignerAdminAddress: signerAdminPubKey,
        ImmutableSignerAddress: immutableSignerPubKey,
        MultiCallAdminAddress: multiCallAdminPubKey,
        MultiCallExecutorAddress: relayerSubmitterEOAPubKey,
    }
    fs.writeFileSync(outputPath, JSON.stringify(JSONOutput, null, 1));

    // Verify contracts on etherscan
    console.log("Verifying contracts on etherscan...");
    await verifyContract(multiCallDeploy.address, [multiCallAdminPubKey, relayerSubmitterEOAPubKey]);
    await verifyContract(factory.address,  [factoryAdminPubKey, multiCallDeploy.address]);
    await verifyContract(walletImplLocator.address, [walletImplLocatorAdmin, walletImplLocatorImplChanger.address]);
    await verifyContract(startupWalletImpl.address, [walletImplLocator.address]);
    await verifyContract(mainModule.address, [factory.address, startupWalletImpl.address], true, "contracts/modules/MainModuleDynamicAuth.sol:MainModuleDynamicAuth");
    await verifyContract(immutableSigner.address, [signerRootAdminPubKey, signerAdminPubKey, relayerSubmitterEOAPubKey]);
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

async function verifyContract(contractAddr : string, constructorArgs : any[], requiesContractPath : boolean = false, contractPath : string = "") {
    try {
        if (requiesContractPath) {
            await hre.run("verify:verify", {
                contract: contractPath,
                address: contractAddr,
                constructorArguments: constructorArgs,
            });
        } else {
            await hre.run("verify:verify", {
                address: contractAddr,
                constructorArguments: constructorArgs,
            });
        }
    } catch (error) {
        expect(error.message.toLowerCase().includes('already verified')).to.be.equal(true);
    }
  
}

deploy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});