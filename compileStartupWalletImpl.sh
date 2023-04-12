# Copyright (c) Immutable Pty Ltd 2018 - 2023
# Generates bytecode for StartupWalletImpl that is stored in StartupWalletFactory.sol
solc src/contracts/startup/StartupWalletImpl.sol  --no-cbor-metadata --optimize --optimize-runs=1000 --bin

