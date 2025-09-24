import { ethers as hardhat } from 'hardhat';
import { Signer, Wallet } from 'ethers';
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
    // console.log(`[${env.network}] Using ledger for operations...`);
    this.useLedger = false;

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
  // 1. coldWallet (DEPLOYER_PRIV_KEY)
  // 2. walletImplLocatorChanger (WALLET_IMPL_CHANGER_PRIV_KEY)

  if (!process.env.COLD_WALLET_PRIVATE_KEY) {
    throw new Error('DEPLOYER_PRIV_KEY environment variable is required');
  }

  if (!process.env.WALLET_IMPL_LOCATOR_IMPL_CHANGER_PRIVATE_KEY) {
    throw new Error('WALLET_IMPL_CHANGER_PRIV_KEY environment variable is required');
  }

  const coldWallet = new Wallet(process.env.COLD_WALLET_PRIVATE_KEY, hardhat.provider as any);
  const walletImplLocatorImplChanger = new Wallet(process.env.WALLET_IMPL_LOCATOR_IMPL_CHANGER_PRIVATE_KEY, hardhat.provider as any);

  return new WalletOptions(env, coldWallet, walletImplLocatorImplChanger);
}
