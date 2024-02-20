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

  private useLedger: boolean;
  private ledger: LedgerSigner;
  private coldWallet: Signer;
  private walletImplLocatorImplChanger: Signer;

  constructor(env: EnvironmentInfo, coldWallet: Signer, walletImplLocatorImplChanger: Signer) {
    console.log(`[${env.network}] Using ledger for operations...`);
    this.useLedger = true;
    const accountIndex0 = 0;
    const derivationPath0 = `m/44'/60'/${accountIndex0.toString()}'/0/0`;
    this.ledger = new LedgerSigner(hardhat.provider, derivationPath0);

    // Setup the 2 programmatic wallets
    this.coldWallet = coldWallet;
    this.walletImplLocatorImplChanger = walletImplLocatorImplChanger;
  }

  public getUseLedger(): boolean {
    return this.useLedger;
  }

  public getWallet(): Signer {
    return this.useLedger ? this.ledger : this.coldWallet;
  }

  public getWalletImplLocatorChanger(): Signer {
    return this.walletImplLocatorImplChanger;
  }
}

/**
 * Create either a programmatic wallet or a ledger depending on the environment network.
 * We will use a programmatic wallet in all scenarios except for Mainnet.
 */
export async function newWalletOptions(env: EnvironmentInfo): Promise<WalletOptions> {
  // Required private keys:
  // 1. coldWallet
  // 2. walletImplLocatorChanger
  const [coldWallet, walletImplLocatorImplChanger]: Signer[] = await hardhat.getSigners();
  return new WalletOptions(env, coldWallet, walletImplLocatorImplChanger);
}
