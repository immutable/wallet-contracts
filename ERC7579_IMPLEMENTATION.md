# ERC-7579 Implementation for Passport Smart Contract Wallet

This document describes the ERC-7579 compliance implementation added to the MainModuleDynamicAuth contract.

## Overview

ERC-7579 is a standard for modular smart accounts that defines interfaces for different types of modules:

- **Validators** (Type 1): Responsible for signature validation
- **Executors** (Type 2): Handle transaction execution logic
- **Fallback** (Type 3): Provide fallback functionality
- **Hooks** (Type 4): Execute before/after transactions

Our implementation focuses on the **Validator** module type, which is the minimum requirement for ERC-7579 compliance.

## Implementation Details

### Files Added/Modified

1. **`src/contracts/interfaces/IERC7579Module.sol`** - New interface file containing:

   - `IModule` - Base interface for all ERC-7579 modules
   - `IValidator` - Specific interface for validator modules
   - `PackedUserOperation` - Struct for ERC-4337 UserOperations

2. **`src/contracts/modules/MainModuleDynamicAuth.sol`** - Extended to implement:
   - `IValidator` interface
   - ERC-7579 compliance methods

### Key Functions Implemented

#### IModule Interface

```solidity
function moduleType() external pure returns (uint256)
```

- Returns `1` indicating this is a Validator module

```solidity
function isInitialized(address account) external view returns (bool)
```

- Checks if the module is initialized for a given account
- Returns `true` if the account has a valid image hash or is the contract itself

#### IValidator Interface

```solidity
function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash) external returns (uint256)
```

- Validates ERC-4337 UserOperations
- Uses existing `_signatureValidation` logic
- Returns `0` for valid signatures, `1` for invalid

```solidity
function isValidSignatureWithSender(address sender, bytes32 hash, bytes calldata signature) external view returns (bytes4)
```

- ERC-1271 signature validation with sender context
- Ensures sender matches the wallet address
- Delegates to existing `isValidSignature` implementation

### Integration with Existing Architecture

The ERC-7579 implementation leverages the existing Passport wallet architecture:

1. **Signature Validation**: Uses the existing multi-signature validation logic from `ModuleAuth`
2. **Storage**: Utilizes the existing `ModuleStorage` and `ImageHashKey` system
3. **ERC-1271 Support**: Builds on the existing ERC-1271 implementation
4. **Interface Support**: Extends the existing `supportsInterface` method

### Compatibility

- **Backward Compatible**: All existing functionality remains unchanged
- **ERC-4337 Ready**: Supports Account Abstraction through `validateUserOp`
- **ERC-1271 Compliant**: Maintains existing signature validation standards
- **Modular**: Can be extended with additional ERC-7579 module types

### Testing

A comprehensive test suite (`tests/ERC7579Compliance.spec.ts`) verifies:

- Correct module type identification
- Interface support detection
- UserOperation validation
- Signature validation with sender context
- Proper rejection of invalid senders

## Usage Example

```solidity
// Deploy the module
MainModuleDynamicAuth module = new MainModuleDynamicAuth(factory, startup);

// Check if it's a validator
require(module.moduleType() == 1, "Not a validator");

// Validate a UserOperation
uint256 result = module.validateUserOp(userOp, userOpHash);
require(result == 0, "Invalid signature");

// Validate signature with sender context
bytes4 magicValue = module.isValidSignatureWithSender(
    walletAddress,
    messageHash,
    signature
);
require(magicValue == 0x1626ba7e, "Invalid signature");
```

## Benefits

1. **Interoperability**: Compatible with ERC-7579 ecosystem
2. **Future-Proof**: Ready for modular smart account standards
3. **Account Abstraction**: Supports ERC-4337 UserOperations
4. **Minimal Changes**: Leverages existing codebase with minimal modifications
5. **Standards Compliance**: Follows established ERC standards

## Next Steps

To achieve full ERC-7579 compliance, consider implementing:

- **Executor modules** for custom transaction logic
- **Hook modules** for pre/post transaction processing
- **Fallback modules** for handling unknown function calls
- **Module management** for installing/uninstalling modules dynamically

This implementation provides the foundation for a fully modular smart account system while maintaining compatibility with the existing Passport wallet architecture.




