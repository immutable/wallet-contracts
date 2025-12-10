# Immutable Wallet Contracts - Bootstrap Flow (v1) Threat Model

## Introduction

This threat model document for the Bootstrap Flow feature in the [Immutable Wallet Contracts](https://github.com/immutable/wallet-contracts) has been created in preparation for internal and external audits.

**PR Reference:** [#74 - feat: ID-4134: Support Bootstrap Flow for Wallet Initial Transaction](https://github.com/immutable/wallet-contracts/pull/74)

**Date:** December 2024

**Author:** Passport Team

---

## Table of Contents

1. [Rationale](#rationale)
2. [Threat Model Scope](#threat-model-scope)
3. [Background](#background)
4. [Architecture](#architecture)
5. [Code Changes Summary](#code-changes-summary)
6. [Attack Surfaces](#attack-surfaces)
7. [Perceived Attackers](#perceived-attackers)
8. [Attack Mitigation](#attack-mitigation)
9. [Security Considerations](#security-considerations)
10. [Test Coverage](#test-coverage)
11. [Conclusion](#conclusion)

---

## Rationale

### Pre-Change Behavior

When a new wallet is created in the existing system, the image hash (representing the wallet's signer configuration) needs to be stored before transactions can be validated. In the absence of a stored imageHash, the first transaction is validated by:

1. Recalculating the CREATE2 address of the wallet using the imageHash as the salt
2. Retrieving the imageHash from the signed message and payload
3. Verifying that the calculated address (CFA) matches the deployed wallet address
4. If matched, storing the imageHash and using it to validate subsequent transactions

### The Problem

Currently in the Immutable zkEVM chain, the primary wallet owner/signer identity is stored by a 3rd party and accessed via their Trusted Execution Environment (TEE). In a multi-chain world, Immutable potentially integrates with different infrastructure providers across chains, leading to different signers.

**Key Issue:** The primary wallet owner/signer influences the Counterfactual Address (CFA), i.e., the user's Passport wallet address. Since we need to preserve the same CFA across chains, the current model of validating the first transaction by verifying the recalculated wallet CFA against the deployed wallet address **does not work** when the signer differs across chains.

### Post-Change Behavior (Bootstrap Flow)

This PR introduces a special validation path for the wallet's first transaction:

1. A new wallet's first transaction is submitted with a signature from the **Immutable Signer contract**
2. During signature validation, the wallet contract checks:
   - If the current nonce is 1 (meaning this is the first transaction, since nonce was 0 before increment)
   - If the Immutable Signer contract address is among the signers in the signature
3. If both conditions are met, the signature is automatically approved, and the computed image hash is stored
4. Subsequent transactions follow the standard validation path, checking against the stored image hash

---

## Threat Model Scope

The threat model is limited to the following Solidity files and their modifications in branch `feat/ID-4134-support-bootstrap-flow-v2`:

### Primary Contract Changes

| Contract | File Path | Change Type |
|----------|-----------|-------------|
| `ModuleAuthDynamic` | `src/contracts/modules/commons/ModuleAuthDynamic.sol` | **Major modification** |
| `ModuleAuth` | `src/contracts/modules/commons/ModuleAuth.sol` | Minor modification (visibility changes) |
| `MainModuleDynamicAuth` | `src/contracts/modules/MainModuleDynamicAuth.sol` | Constructor change |

### Supporting Files

| File | Change Type |
|------|-------------|
| `MainModuleMockV1.sol` | Constructor update |
| `MainModuleMockV2.sol` | Constructor update |
| `MainModuleMockV3.sol` | Constructor update |
| `scripts/deploy.ts` | Deployment order change |
| `scripts/step4.ts` | Immutable signer address added |

---

## Background

### Existing Architecture

The Immutable wallet system is based on [0xSequence's smart contract wallet](https://github.com/0xsequence/wallet-contracts) with modifications for:

- **Factory contract** with better counterfactual address support
- **MainModuleDynamicAuth** to support wallets that can update their list of signers
- **StartupWallet** as a temporary main wallet module placeholder
- **MultiCallDeploy** for bundling SCW deployment with the first transaction
- **ImmutableSigner** as a simplified SCW for key rotation without changing the main wallet signer

### Previous Audits

The following previous audits provide context:
- [Quantstamp Arcadeum Report (2021)](https://github.com/0xsequence/wallet-contracts/tree/master/audits)
- [Halborn Audit (September 2023)](./202309_Halborn_Final.pdf)
- [Audit Background Document](./202309_audit_background.md)

---

## Architecture

### Bootstrap Flow Sequence Diagram

```
┌─────────────┐     ┌───────────────-┐     ┌─────────────────┐     ┌──────────────────────-┐
│   Client    │     │ MultiCallDeploy│     │  WalletProxy    │     │ MainModuleDynamicAuth │
└──────┬──────┘     └───────┬───────-┘     └────────┬────────┘     └──────────┬───────────-┘
       │                    │                       │                         │
       │ 1. deployAndExecute│                       │                         │
       │───────────────────>│                       │                         │
       │                    │                       │                         │
       │                    │ 2. deploy()           │                         │
       │                    │─────────────────────->│                         │
       │                    │                       │                         │
       │                    │ 3. execute()          │                         │
       │                    │─────────────────────->│                         │
       │                    │                       │                         │
       │                    │                       │ 4. delegatecall         │
       │                    │                       │────────────────────────>│
       │                    │                       │                         │
       │                    │                       │     5. _validateNonce() │
       │                    │                       │     (increments to 1)   │
       │                    │                       │                         │
       │                    │                       │     6. _signatureValidation()
       │                    │                       │     - Check nonce == 1  │
       │                    │                       │     - Check ImmutableSigner present
       │                    │                       │     - Store imageHash   │
       │                    │                       │                         │
       │                    │                       │     7. Execute txn      │
       │                    │                       │<────────────────────────│
       │<──────────────────────────────────────────────────────────────────────
```

### Key Components

1. **ImmutableSigner Contract** (`IMMUTABLE_SIGNER_CONTRACT`):
   - Stored as an immutable variable in `ModuleAuthDynamic`
   - Used to identify trusted first-transaction signers
   - Cannot be `address(0)` (validated in constructor)

2. **Nonce Check**:
   - First transaction validation triggers when `currentNonce == 1`
   - Nonce is incremented by `_validateNonce()` BEFORE signature validation
   - Therefore, checking for `1` indicates this was originally nonce `0`

3. **Image Hash Storage**:
   - On successful bootstrap, the computed `imageHash` is stored
   - Subsequent transactions validate against the stored hash

---

## Code Changes Summary

### 1. `ModuleAuthDynamic.sol` - Major Changes

#### New State Variables

```solidity
address public immutable IMMUTABLE_SIGNER_CONTRACT;
```

#### New Struct for Stack Optimization

```solidity
struct SignatureValidationState {
    uint256 rindex;
    bytes32 imageHash;
    uint256 totalWeight;
    bool immutableSignerContractFound;
}
```

#### Constructor Changes

```solidity
constructor(address _factory, address _startupWalletImpl, address _immutableSignerContract) {
    require(_immutableSignerContract != address(0), "ModuleAuthDynamic#constructor: INVALID_SIGNER_ADDRESS");
    // ... existing code ...
    IMMUTABLE_SIGNER_CONTRACT = _immutableSignerContract;
}
```

#### New Signature Validation Logic

The `_signatureValidationWithUpdateCheck` function now:

1. Tracks whether `IMMUTABLE_SIGNER_CONTRACT` is found among signers
2. Checks if `currentNonce == 1` AND `immutableSignerContractFound`
3. If bootstrap conditions are met, returns `(true, true, imageHash)` - auto-approving the transaction

**Critical Code Path (Lines 155-165):**

```solidity
(bool verified, bool needsUpdate) = _isValidImage(state.imageHash);

uint256 currentNonce = uint256(ModuleStorage.readBytes32Map(NonceKey.NONCE_KEY, bytes32(uint256(0))));
if (currentNonce == 1 && state.immutableSignerContractFound && verified) {
    return (true, true, state.imageHash);
}

return ((state.totalWeight >= threshold && verified), needsUpdate, state.imageHash);
```

### 2. `ModuleAuth.sol` - Visibility Changes

```solidity
// Changed from private to internal
uint256 internal constant FLAG_SIGNATURE = 0;
uint256 internal constant FLAG_ADDRESS = 1;
uint256 internal constant FLAG_DYNAMIC_SIGNATURE = 2;

// Added virtual modifier
function _signatureValidation(...) internal virtual override returns (bool)
function _signatureValidationWithUpdateCheck(...) internal view virtual returns (bool, bool, bytes32)
```

### 3. `MainModuleDynamicAuth.sol` - Constructor Update

```solidity
constructor(address _factory, address _startupWalletImpl, address _immutableSignerContract) 
    ModuleAuthDynamic(_factory, _startupWalletImpl, _immutableSignerContract) { }
```

---

## Attack Surfaces

### 1. Externally Visible Functions

#### Functions that Change State

| Function | Contract | Access Control | Security Impact |
|----------|----------|----------------|-----------------|
| `execute(Transaction[], uint256, bytes)` | `ModuleCalls` | Signature validation | **HIGH** - Entry point for all wallet transactions |

#### Functions that Do Not Change State (View/Pure)

| Function | Contract | Notes |
|----------|----------|-------|
| `IMMUTABLE_SIGNER_CONTRACT()` | `ModuleAuthDynamic` | Returns immutable signer address |
| `FACTORY()` | `ModuleAuthDynamic` | Returns factory address |
| `INIT_CODE_HASH()` | `ModuleAuthDynamic` | Returns init code hash |
| `nonce()` | `ModuleCalls` | Returns current nonce |

### 2. Bootstrap Condition Attack Surface

The bootstrap validation path is gated by THREE conditions that must ALL be true:

| Condition | Variable | Attack Vector |
|-----------|----------|---------------|
| Nonce is 1 | `currentNonce == 1` | Can only be exploited on first transaction |
| ImmutableSigner present | `immutableSignerContractFound` | Requires signature from ImmutableSigner |
| Valid image hash | `verified` | Must match CREATE2 deployment salt |

### 3. Immutable Variables

| Variable | Set In | Modifiable | Risk |
|----------|--------|------------|------|
| `IMMUTABLE_SIGNER_CONTRACT` | Constructor | **Never** | LOW - Cannot be changed after deployment |
| `FACTORY` | Constructor | **Never** | LOW |
| `INIT_CODE_HASH` | Constructor | **Never** | LOW |

### 4. Storage Slots

| Storage Key | Purpose | Write Access |
|-------------|---------|--------------|
| `NonceKey.NONCE_KEY` | Nonce tracking | Internal (incremented per transaction) |
| `ImageHashKey.IMAGE_HASH_KEY` | Image hash storage | Internal (via `updateImageHashInternal`) |

---

## Perceived Attackers

### 1. External Attacker

An attacker with no special access who can:
- Submit transactions to the network
- Deploy contracts
- Monitor mempool and blockchain state
- Attempt to front-run transactions

### 2. Compromised ImmutableSigner Key

An attacker who has compromised the private key used by the ImmutableSigner contract. This could occur through:
- Spear phishing attacks
- Server compromise
- Insider threat

### 3. Malicious Relayer

A relayer service that:
- Has access to signed transactions
- Can delay, reorder, or drop transactions
- Cannot forge signatures but can manipulate transaction ordering

### 4. Immutable zkEVM Block Proposer

A block proposer who can:
- Manipulate `block.timestamp` within narrow limits
- Order transactions within a block
- Potentially censor transactions

### 5. Insider Threat

An Immutable employee who:
- Has access to deployment keys or administrative roles
- Knows internal architecture and security controls
- May be coerced or bribed

---

## Attack Mitigation

### Attack 1: Unauthorized Bootstrap Transaction

**Threat:** An attacker attempts to bootstrap a wallet with their own signer configuration.

**Attack Vector:**
1. Deploy a wallet via Factory
2. Submit a first transaction with attacker-controlled signers
3. Attempt to bypass ImmutableSigner requirement

**Mitigation:**
- The bootstrap path requires `IMMUTABLE_SIGNER_CONTRACT` to be present in the signature
- ImmutableSigner validates against its own stored signer (controlled by Immutable)
- Attacker cannot forge a valid ImmutableSigner signature

**Code Reference:**
```solidity
if (addr == IMMUTABLE_SIGNER_CONTRACT) {
    state.immutableSignerContractFound = true;
}
// ...
if (currentNonce == 1 && state.immutableSignerContractFound && verified) {
    return (true, true, state.imageHash);
}
```

### Attack 2: Replay Bootstrap on Second Transaction

**Threat:** An attacker replays the bootstrap signature on a subsequent transaction.

**Attack Vector:**
1. Observe a valid bootstrap transaction
2. Attempt to replay after the first transaction

**Mitigation:**
- The nonce check (`currentNonce == 1`) ensures bootstrap only works on the first transaction
- After the first transaction, nonce becomes ≥2
- Standard signature validation (threshold check) applies for subsequent transactions

**Residual Risk:** LOW - Nonce mechanism is well-tested and inherited from 0xSequence

### Attack 3: ImmutableSigner Key Compromise

**Threat:** An attacker compromises the ImmutableSigner's private key.

**Attack Vector:**
1. Compromise ImmutableSigner key through phishing/server pwn
2. Sign bootstrap transactions for any wallet
3. Take control of user wallets during their first transaction

**Mitigation:**
- ImmutableSigner uses role-based access control for key rotation
- Key rotation can be performed without affecting wallet addresses
- Monitoring and detection of unauthorized signatures
- Regular key rotation cadence

**Residual Risk:** MEDIUM - Key compromise would allow unauthorized bootstrap

**Detection:** Monitor `PrimarySignerUpdated` events and validate bootstrap transactions against expected patterns.

### Attack 4: Front-Running Bootstrap Transaction

**Threat:** An attacker front-runs the legitimate bootstrap transaction.

**Attack Vector:**
1. Monitor mempool for bootstrap transactions
2. Submit competing transaction with higher gas
3. Attempt to bootstrap with different configuration

**Mitigation:**
- Bootstrap requires valid ImmutableSigner signature
- Attacker cannot obtain ImmutableSigner signature for their configuration
- Even if front-run, the attacker cannot forge the required signature

**Residual Risk:** LOW - Signature requirement prevents exploitation

### Attack 5: Threshold Bypass on Bootstrap

**Threat:** An attacker exploits the bootstrap path to bypass threshold requirements.

**Attack Vector:**
1. Create wallet with threshold 2 (user + ImmutableSigner)
2. Bootstrap with only ImmutableSigner signature
3. Execute transactions without user signature

**Mitigation:**
- Bootstrap path requires `verified` to be true
- `_isValidImage()` validates that the imageHash matches the CREATE2 salt used for deployment
- The wallet address is tied to the complete signer configuration
- Changing signers would change the wallet address

**Code Reference:**
```solidity
if (currentNonce == 1 && state.immutableSignerContractFound && verified) {
    return (true, true, state.imageHash);
}
```

**Important Note:** The `verified` check in the bootstrap condition ensures the image hash is valid. However, the `totalWeight >= threshold` check is bypassed during bootstrap. This is **intentional** - it allows the ImmutableSigner alone to bootstrap wallets where the user's signer might be different across chains.

**Residual Risk:** MEDIUM - By design, bootstrap allows ImmutableSigner to set up the wallet. This trust in ImmutableSigner must be understood.

### Attack 6: Zero Address ImmutableSigner

**Threat:** Deploy `MainModuleDynamicAuth` with `address(0)` as ImmutableSigner.

**Attack Vector:**
1. Deploy MainModule with `_immutableSignerContract = address(0)`
2. Any signature that includes `address(0)` would trigger bootstrap

**Mitigation:**
- Constructor validates that `_immutableSignerContract != address(0)`
- Deployment will revert if zero address is provided

**Code Reference:**
```solidity
require(_immutableSignerContract != address(0), "ModuleAuthDynamic#constructor: INVALID_SIGNER_ADDRESS");
```

---

## Security Considerations

### Design Decisions

1. **Immutable IMMUTABLE_SIGNER_CONTRACT:**
   - Once deployed, the ImmutableSigner address cannot be changed
   - This provides strong guarantees but requires new deployment for changes

2. **Nonce-Based Bootstrap Detection:**
   - Using `nonce == 1` is elegant but couples with internal implementation
   - The nonce is incremented by `_validateNonce()` before signature validation
   - This ordering is critical and must be maintained in future changes

3. **Threshold Bypass During Bootstrap:**
   - Bootstrap intentionally bypasses the `totalWeight >= threshold` check
   - This is by design to enable cross-chain signer flexibility
   - Security relies entirely on ImmutableSigner trust

---

## Test Coverage

### New Test File: `ModuleAuthDynamic.spec.ts`

The following test scenarios are covered:

| Test Category | Test Case | Status |
|---------------|-----------|--------|
| Constructor validation | IMMUTABLE_SIGNER_CONTRACT is set correctly | ✅ |
| Bootstrap flow | First transaction with ImmutableSigner only | ✅ |
| Bootstrap flow | First transaction with ImmutableSigner as part of multi-sig | ✅ |
| Negative cases | Bootstrap fails without ImmutableSigner | ✅ |
| Negative cases | Bootstrap only works on first transaction | ✅ |
| Subsequent transactions | Standard validation path after bootstrap | ✅ |
| Edge cases | Zero address validation in constructor | ✅ |

### Updated Test Files

| Test File | Changes |
|-----------|---------|
| `ERC165.spec.ts` | Updated for new constructor signature |
| `ImmutableDeployment.spec.ts` | Updated error messages and constructor |
| `ImmutableStartup.spec.ts` | Updated for ImmutableSigner integration |

---

## Conclusion

This threat model has presented the architecture of the Bootstrap Flow feature, determined attack surfaces introduced by the changes to `ModuleAuthDynamic`, and identified possible attackers and their capabilities. It has walked through each attack surface—including the bootstrap condition gates, immutable signer detection, and nonce-based first-transaction validation—and based on the attacker profiles, determined how the attacks are mitigated. The analysis confirms that the bootstrap flow relies on the security of the ImmutableSigner contract and its key management, with appropriate safeguards in place to prevent unauthorized wallet initialization.

---

## Appendix

### A. File Diff Summary

```
Modified files:
- src/contracts/modules/commons/ModuleAuthDynamic.sol (+120 lines)
- src/contracts/modules/commons/ModuleAuth.sol (visibility changes)
- src/contracts/modules/MainModuleDynamicAuth.sol (constructor update)
- src/contracts/mocks/MainModuleMockV1.sol (constructor update)
- src/contracts/mocks/MainModuleMockV2.sol (constructor update)
- src/contracts/mocks/MainModuleMockV3.sol (constructor update)
- scripts/deploy.ts (deployment order change)
- scripts/step4.ts (immutable signer address)
- tests/* (various test updates)

New files:
- tests/ModuleAuthDynamic.spec.ts (new test file)
```

### B. Related Documentation

- [Existing Audit Background](./202309_audit_background.md)
- [0xSequence Wallet Contracts](https://github.com/0xsequence/wallet-contracts)
- [Immutable Passport Documentation](https://www.immutable.com/products/passport)
