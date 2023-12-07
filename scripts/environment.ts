import * as path from 'path';
import { UnknownEnvironmentError } from './errors';
import dotenv from 'dotenv';

export interface EnvironmentInfo {
  submitterAddress?: string;
  signerAddress?: string;
  outputPath: string;
}

/**
 * Loads the relevant .env file, and also sets the location of the output file.
 **/
export function loadEnvironmentInfo(hreNetworkName: string): EnvironmentInfo {
  switch (hreNetworkName) {
    case 'devnet':
      dotenv.config({ path: '.env.devnet' });
      return {
        submitterAddress: process.env.RELAYER_SUBMITTER_EOA_PUB_KEY,
        signerAddress: process.env.IMMUTABLE_SIGNER_PUB_KEY,
        outputPath: path.join(__dirname, './deploy_output_devnet.json')
      };
    case 'testnet':
      dotenv.config({ path: '.env.testnet' });
      return {
        submitterAddress: process.env.RELAYER_SUBMITTER_EOA_PUB_KEY,
        signerAddress: process.env.IMMUTABLE_SIGNER_PUB_KEY,
        outputPath: path.join(__dirname, './deploy_output_testnet.json')
      };
    case 'mainnet':
      dotenv.config({ path: '.env.mainnet' });
      return {
        submitterAddress: process.env.RELAYER_SUBMITTER_EOA_PUB_KEY,
        signerAddress: process.env.IMMUTABLE_SIGNER_PUB_KEY,
        outputPath: path.join(__dirname, './deploy_output_mainnet.json')
      };
    default:
      throw new UnknownEnvironmentError(`${hreNetworkName} is an unknown environment`);
  }
}
