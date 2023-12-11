import { ethers as hardhat } from 'hardhat';
import { Signer } from 'ethers';
import { LedgerSigner } from './ledger-signer';
import { EnvironmentInfo } from './environment';

const mainnetEnv = 'mainnet';

/**
 * WalletOptions is used as a helper type by the newContractFactory function
 * which used the following type to configure the connect function.
 */
export class WalletOptions {
  useLedger: boolean;
  private contractDeployerLedger: LedgerSigner;
  private walletImplLocatorImplChangerLedger: LedgerSigner;
  private contractDeployer: Signer;
  private walletImplLocatorImplChanger: Signer;

  constructor(env: EnvironmentInfo, contractDeployer: Signer, walletImplLocatorImplChanger: Signer) {
    if (env.network == mainnetEnv || env.network == 'localhost') {
      console.log(`[${env.network}] Using ledger for operations...`);
      this.useLedger = true;
    } else {
      console.log(`[${env.network}] Using programmatic wallets for operations...`);
      this.useLedger = false;
    }

    // Setup the 2 ledgers
    const accountIndex0 = 0;
    const derivationPath0 = `m/44'/60'/${accountIndex0.toString()}'/0/0`;
    this.contractDeployerLedger = new LedgerSigner(hardhat.provider, derivationPath0);
    const accountIndex1 = 1;
    const derivationPath1 = `m/44'/60'/${accountIndex1.toString()}'/0/0`;
    this.walletImplLocatorImplChangerLedger = new LedgerSigner(hardhat.provider, derivationPath1);

    // Setup the 2 programmatic wallets
    this.contractDeployer = contractDeployer;
    this.walletImplLocatorImplChanger = walletImplLocatorImplChanger;
  }

  public getContractDeployer(): Signer {
    return this.useLedger ? this.contractDeployerLedger : this.contractDeployer;
  }

  public getWalletImplLocatorChanger(): Signer {
    return this.useLedger ? this.walletImplLocatorImplChangerLedger : this.walletImplLocatorImplChanger;
  }
}

/**
 * Create either a programmatic wallet or a ledger depending on the environment network.
 * We will use a programmatic wallet in all scenarios except for Mainnet.
 */
export async function newWalletOptions(env: EnvironmentInfo): Promise<WalletOptions> {
  // Required private keys:
  // 1. Deployer
  // 2. walletImplLocatorChanger
  const [contractDeployer, walletImplLocatorImplChanger]: Signer[] = await hardhat.getSigners();
  return new WalletOptions(env, contractDeployer, walletImplLocatorImplChanger);
}
