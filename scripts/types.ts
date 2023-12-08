import { ethers as hardhat } from 'hardhat';
import { Signer } from 'ethers';
import { LedgerSigner } from './ledger-signer';
import { EnvironmentInfo } from './environment';

/**
 * WalletOptions is used as a helper type by the newContractFactory function
 * which used the following type to configure the connect function.
 */
export interface WalletOptions {
  useLedger: boolean;
  ledgerAccountIndex?: string;
  ledger?: LedgerSigner;
  programaticWallet?: Signer;
}

/**
 * Create either a programmatic wallet or a ledger depending on the environment network.
 * We will use a programmatic wallet in all scenarios except for Mainnet.
 */
export function newWalletOptions(env: EnvironmentInfo, accountIndex: number, signer: Signer): WalletOptions {
  if (env.network == 'mainnet') {
    console.log(`[${env.network}] Using ledger for operations...`);
    return newLedgerWalletOptions(accountIndex);
  }

  console.log(`[${env.network}] Using programmatic wallet for operations...`);
  return newProgrammaticWalletOptions(signer);
}

function newLedgerWalletOptions(accountIndex: number): WalletOptions {
  const derivationPath = `m/44'/60'/${accountIndex.toString()}'/0/0`;
  return {
    useLedger: true,
    ledgerAccountIndex: accountIndex.toString(),
    ledger: new LedgerSigner(hardhat.provider, derivationPath)
  };
}

function newProgrammaticWalletOptions(signer: Signer): WalletOptions {
  return {
    useLedger: false,
    programaticWallet: signer
  };
}
