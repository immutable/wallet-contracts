import * as path from 'path';

/**
 * An environment should include the address details for the submitter,
 * and signer address.
 */
export interface EnvironmentInfo {
  submitterAddress: string;
  signerAddress: string;
  deployerContractAddress: string;
  outputPath: string;
  network: string;
}

/**
 * Loads the relevant .env file, and also sets the location of the output file.
 * The following are the only supported environment.
 * 1. local
 * 2. devnet
 * 3. testnet
 * 4. mainnet
 **/
export function loadEnvironmentInfo(hreNetworkName: string): EnvironmentInfo {
  return {
    submitterAddress: process.env.RELAYER_SUBMITTER_EOA_PUB_KEY || '',
    signerAddress: process.env.IMMUTABLE_SIGNER_PUB_KEY || '',
    deployerContractAddress: process.env.DEPLOYER_CONTRACT_ADDRESS || '',
    outputPath: path.join(__dirname, process.env.OUTPUT_FILE_NAME || ''),
    network: hreNetworkName
  };
}
