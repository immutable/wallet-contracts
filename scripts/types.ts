import { ethers as hardhat } from 'hardhat';

import { LedgerSigner } from './ledger-signer';

/**
 * WalletOptions is used as a helper type by the newContractFactory function
 * which used the following type to configure the connect function.
 */
export interface WalletOptions {
  useLedger: boolean;
  ledgerAccountIndex?: string;
  ledger?: LedgerSigner;
  programaticWallet?: string;
}

export function newLedgerWalletOptions(accountIndex: number): WalletOptions {
  const derivationPath = `m/44'/60'/${accountIndex.toString()}'/0/0`;
  return {
    useLedger: true,
    ledgerAccountIndex: accountIndex.toString(),
    ledger: new LedgerSigner(hardhat.provider, derivationPath)
  };
}
