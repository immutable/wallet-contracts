# Wallet Factory

![Diagram](diagram.png "Wallet Factory")

A simple factory contract for deploying [Sequence](https://sequence.xyz/) wallets.

Based off [Sequence's Factory implementation](https://github.com/0xsequence/wallet-contracts/blob/master/src/contracts/Factory.sol), with some modifications:

- Added a check for successful wallet deployments (original implementation does not revert upon unsuccessful deployments)
- Added a `WalletDeployed` event to be emitted upon successful wallet deployments
- Imported OpenZeppelin's Ownable module and added an `onlyOwner` modifier to the `deployWallet` function
- Added a view function `getAddress` to return the deterministic address of a wallet, given the salt
