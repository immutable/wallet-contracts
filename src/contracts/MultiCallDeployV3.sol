// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "./interfaces/IFactory.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @notice Interface for V3 wallet execute function
 */
interface IV3Wallet {
    function execute(bytes calldata _payload, bytes calldata _signature) external;
}

/**
 * @title MultiCallDeployV3
 * @notice Contract for deploying and executing transactions on V3 wallets
 * @dev V3 version that accepts bytes payload instead of Transaction[]
 */
contract MultiCallDeployV3 is AccessControl {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    /**
     * @notice Constructor
     * @param _admin address with admin role
     * @param _executor address with executor role
     */
    constructor(address _admin, address _executor) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _executor);
    }

    /**
     * @notice Deploy wallet, upgrade it to Stage 2, then execute user transaction     * 
     * @param cfa counter factual address of the wallet
     * @param _mainModule Address of the main module to be used by the wallet
     * @param _salt Salt used to generate the address (should be final imageHash)
     * @param factory address of the factory contract
     * @param _bootstrapPayload V3 encoded payload containing updateImageHash transaction (always required)
     * @param _bootstrapSignature Immutable-only signature for bootstrap (always required)
     * @param _userPayload V3 encoded payload containing user's transaction
     * @param _userSignature EOA + Immutable signature for user transaction
     */
    function deployBootstrapAndExecute(
        address cfa,
        address _mainModule,
        bytes32 _salt,
        address factory,
        bytes calldata _bootstrapPayload,
        bytes calldata _bootstrapSignature // TODO not used after wallet is deployed, to improve
        bytes calldata _userPayload,
        bytes calldata _userSignature
    ) external onlyRole(EXECUTOR_ROLE) {
        // Get code size at CFA
        uint32 size;
        assembly {
            size := extcodesize(cfa)
        }

        if (size == 0) {            
            // 1. Deploy wallet
            address wallet = IFactory(factory).deploy(_mainModule, _salt);
            require(cfa == wallet, "MultiCallDeployV3: deployed address does not match CFA");

            // 2. Bootstrap transaction (updateImageHash) - signed by Immutable-only
            IV3Wallet(wallet).execute(_bootstrapPayload, _bootstrapSignature);

            // 3. Actual transaction - signed by EOA + Immutable
            IV3Wallet(wallet).execute(_userPayload, _userSignature);
        } else {
            IV3Wallet(cfa).execute(_userPayload, _userSignature);
        }
    }
}

