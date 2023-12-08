/**
 * Keeping original functions as a reference.
 */
import { ethers } from 'ethers';
import { ethers as hardhat } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

export async function deployFactory(
  deployer: SignerWithAddress,
  adminAddr: string,
  deployerAddr: string
): Promise<ethers.Contract> {
  const Factory = await hardhat.getContractFactory('Factory');
  return await Factory.connect(deployer).deploy(adminAddr, deployerAddr);
}

export async function deployWalletImplLocator(
  deployer: SignerWithAddress,
  adminAddr: string,
  implChangerAddr: string
): Promise<ethers.Contract> {
  const LatestWalletImplLocator = await hardhat.getContractFactory('LatestWalletImplLocator');
  return await LatestWalletImplLocator.connect(deployer).deploy(adminAddr, implChangerAddr);
}

export async function deployStartUp(
  deployer: SignerWithAddress,
  walletImplLocatorAddr: string
): Promise<ethers.Contract> {
  const StartupWalletImplImpl = await hardhat.getContractFactory('StartupWalletImpl');
  return await StartupWalletImplImpl.connect(deployer).deploy(walletImplLocatorAddr);
}

export async function deployMainModule(
  deployer: SignerWithAddress,
  factoryAddr: string,
  startUpAddr: string
): Promise<ethers.Contract> {
  const MainModuleDynamicAuth = await hardhat.getContractFactory('MainModuleDynamicAuth');
  return await MainModuleDynamicAuth.connect(deployer).deploy(factoryAddr, startUpAddr);
}

export async function deployImmutableSigner(
  deployer: SignerWithAddress,
  rootAdminAddr: string,
  signerAdminAddr: string,
  signerAddr?: string
): Promise<ethers.Contract> {
  const ImmutableSigner = await hardhat.getContractFactory('ImmutableSigner');
  return await ImmutableSigner.connect(deployer).deploy(rootAdminAddr, signerAdminAddr, signerAddr);
}

export async function deployMultiCallDeploy(
  deployer: SignerWithAddress,
  adminAddr: string,
  executorAddr?: string
): Promise<ethers.Contract> {
  const MultiCallDeploy = await hardhat.getContractFactory('MultiCallDeploy');
  return await MultiCallDeploy.connect(deployer).deploy(adminAddr, executorAddr, {});
}
