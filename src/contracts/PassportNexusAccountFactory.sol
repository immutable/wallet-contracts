// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.27;

import '@openzeppelin/contracts/access/AccessControl.sol';
import './biconomy/Nexus.sol';
import './biconomy/interfaces/factory/INexusFactory.sol';
import './Wallet.sol';

/**
 * @title PassportNexusAccountFactory
 * @notice Hybrid factory that combines Passport's API with Nexus implementation
 * @dev Maintains compatibility with Passport MultiCallDeploy while deploying functional Nexus wallets
 */
contract PassportNexusAccountFactory is AccessControl {
  // Role to deploy new wallets (same as Passport Factory)
  bytes32 public constant DEPLOYER_ROLE = keccak256('DEPLOYER_ROLE');

  // EntryPoint for ERC-4337 Account Abstraction (required by Nexus)
  address public immutable entryPoint;

  // Default Nexus implementation (our step4 deployment)
  address public immutable defaultNexusImplementation;

  // NexusBootstrap for initialization (our step7 deployment)
  address public immutable nexusBootstrap;

  // Default validator (K1Validator from step4)
  address public immutable defaultValidator;

  // Mapping for legacy compatibility: old mainModule → nexus implementation
  mapping(address => address) public legacyToNexusMapping;

  event WalletDeployed(address indexed wallet, address indexed mainModule, bytes32 salt);
  event NexusWalletDeployed(address indexed wallet, bytes indexed initData, bytes32 indexed salt);

  constructor(
    address _admin,
    address _deployer,
    address _entryPoint,
    address _defaultNexusImplementation,
    address _nexusBootstrap,
    address _defaultValidator
  ) {
    require(_entryPoint != address(0), 'Invalid entryPoint');
    require(_defaultNexusImplementation != address(0), 'Invalid nexus implementation');
    require(_nexusBootstrap != address(0), 'Invalid nexus bootstrap');
    require(_defaultValidator != address(0), 'Invalid default validator');

    _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    _grantRole(DEPLOYER_ROLE, _deployer);

    entryPoint = _entryPoint;
    defaultNexusImplementation = _defaultNexusImplementation;
    nexusBootstrap = _nexusBootstrap;
    defaultValidator = _defaultValidator;
  }

  /**
   * @notice Legacy Passport API: Returns deterministic address for a mainModule
   * @param _mainModule Address of the main module (now treated as nexus implementation)
   * @param _salt Salt used to generate the address
   * @return _address The deterministic address
   * @dev For compatibility with existing Passport code
   */
  function getAddress(address _mainModule, bytes32 _salt) external view returns (address _address) {
    // Resolve mainModule to actual Nexus implementation
    address nexusImpl = resolveNexusImplementation(_mainModule);

    // Generate initData for the resolved implementation
    bytes memory initData = generateInitData(msg.sender); // Use caller as default owner

    return computeNexusAddress(nexusImpl, initData, _salt);
  }

  /**
   * @notice Legacy Passport API: Deploy a new wallet using mainModule
   * @param _mainModule Address of the main module (mapped to nexus implementation)
   * @param _salt Salt used to generate the wallet
   * @return _contract Address of the deployed wallet
   * @dev Maintains Passport API while deploying functional Nexus wallets
   */
  function deploy(
    address _mainModule,
    bytes32 _salt
  ) external payable onlyRole(DEPLOYER_ROLE) returns (address _contract) {
    // Resolve to actual Nexus implementation
    address nexusImpl = resolveNexusImplementation(_mainModule);

    // Generate initData using caller as owner (legacy behavior)
    bytes memory initData = generateInitData(msg.sender);

    // Deploy Nexus wallet
    _contract = createNexusAccount(nexusImpl, initData, _salt);

    // Emit legacy event for compatibility
    emit WalletDeployed(_contract, _mainModule, _salt);
  }

  /**
   * @notice Enhanced API: Deploy Nexus wallet with custom initData
   * @param _initData Initialization data containing owner and validator setup
   * @param _salt Salt for deterministic address generation
   * @return wallet Address of the deployed Nexus wallet
   * @dev Recommended method for new integrations. Uses defaultValidator from factory.
   */
  function deployNexusWithInitData(
    address /* _nexusImplementation */,
    bytes calldata _initData,
    bytes32 _salt
  ) external payable onlyRole(DEPLOYER_ROLE) returns (address wallet) {
    // NOTE: _nexusImplementation parameter is legacy - we use defaultValidator for Nexus constructor
    wallet = createNexusAccount(defaultValidator, _initData, _salt);
    emit NexusWalletDeployed(wallet, _initData, _salt);
  }

  /**
   * @notice Deploy Nexus wallet with owner specification
   * @param _owner Owner address for the wallet
   * @param _salt Salt for deterministic address generation
   * @return wallet Address of the deployed Nexus wallet
   * @dev Uses defaultValidator from factory for Nexus constructor.
   */
  function deployNexusWithOwner(
    address /* _nexusImplementation */,
    address _owner,
    bytes32 _salt
  ) external payable onlyRole(DEPLOYER_ROLE) returns (address wallet) {
    bytes memory initData = generateInitData(_owner);
    // NOTE: _nexusImplementation parameter is legacy - we use defaultValidator for Nexus constructor
    wallet = createNexusAccount(defaultValidator, initData, _salt);
    emit NexusWalletDeployed(wallet, initData, _salt);
  }

  /**
   * @notice Compute address for Nexus wallet
   * @param _salt Salt for address generation
   * @return Predicted wallet address
   * @dev Uses Nexus address computation pattern with defaultValidator from factory
   * @dev Parameters _implementation and _initData are ignored for consistent address computation
   */
  function computeNexusAddress(
    address /* _implementation */,
    bytes memory /* _initData */,
    bytes32 _salt
  ) public view returns (address) {
    // Use Nexus address computation for ERC-4337 pattern
    // NOTE: Must match createNexusAccount: (entryPoint, defaultValidator, '0x')
    // _implementation parameter is ignored - we always use empty initData for deterministic addresses
    bytes memory creationCode = type(Nexus).creationCode;
    bytes memory constructorArgs = abi.encode(entryPoint, defaultValidator, '0x');
    bytes32 bytecodeHash = keccak256(abi.encodePacked(creationCode, constructorArgs));

    bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), _salt, bytecodeHash));
    return address(uint160(uint(hash)));
  }

  /**
   * @notice Internal: Create Nexus account following ERC-4337 pattern
   * @param _salt Salt for CREATE2
   * @return wallet Address of deployed (but uninitialized) Nexus wallet
   * @dev ERC-4337 Pattern: Deploy empty, initialize via first UserOp through EntryPoint
   * @dev Parameters _implementation and _initData are ignored in favor of consistent deployment
   */
  function createNexusAccount(
    address /* _implementation */,
    bytes memory /* _initData */,
    bytes32 _salt
  ) internal returns (address wallet) {
    // Check if already deployed
    wallet = computeNexusAddress(defaultValidator, '0x', _salt);
    uint256 codeSize = wallet.code.length;
    if (codeSize > 0) {
      return wallet;
    }

    // Deploy Nexus with EMPTY initData following ERC-4337 pattern
    // Client must send first UserOp with initializeAccount call to complete setup
    wallet = address(new Nexus{salt: _salt}(entryPoint, defaultValidator, '0x'));

    require(wallet != address(0), 'Nexus deployment failed');
  }

  /**
   * @notice Resolve legacy mainModule to Nexus implementation
   * @param _mainModule Legacy main module address
   * @return Resolved Nexus implementation address
   */
  function resolveNexusImplementation(address _mainModule) public view returns (address) {
    // First check if there's a specific mapping
    address mapped = legacyToNexusMapping[_mainModule];
    if (mapped != address(0)) {
      return mapped;
    }

    // If mainModule is already a Nexus implementation, use it directly
    if (_mainModule != address(0)) {
      return _mainModule;
    }

    // Fallback to default
    return defaultNexusImplementation;
  }

  /**
   * @notice Generate initialization data for Nexus first UserOp
   * @param _owner Owner address for the wallet
   * @return Encoded initialization data for Nexus.initializeAccount() call in first UserOp
   * @dev This should be used in the callData of the first UserOp sent to the deployed wallet
   */
  function generateInitData(address _owner) public view returns (bytes memory) {
    // Following the Biconomy migration docs pattern:
    // initNexusWithDefaultValidator(ownerAddress)
    bytes memory validatorInitData = abi.encode(_owner);

    // Encode call to initNexusWithDefaultValidator
    bytes memory bootstrapCall = abi.encodeWithSignature('initNexusWithDefaultValidator(bytes)', validatorInitData);

    // Combine bootstrap address with call data
    return abi.encode(nexusBootstrap, bootstrapCall);
  }

  /**
   * @notice Generate callData for first UserOp to initialize a deployed Nexus wallet
   * @param _owner Owner address for the wallet
   * @return Encoded callData that should be used in first UserOp to initialize the wallet
   * @dev Use this to create the callData field of the first UserOperation sent to a deployed wallet
   */
  function generateFirstUserOpCallData(address _owner) external view returns (bytes memory) {
    bytes memory initData = generateInitData(_owner);

    // Encode call to initializeAccount with the initialization data
    // This is what goes in UserOp.callData for the first transaction
    return abi.encodeWithSignature('initializeAccount(bytes)', initData);
  }

  /**
   * @notice Admin function: Set legacy mapping for mainModule → nexusImplementation
   * @param _legacyModule Legacy main module address
   * @param _nexusImpl Corresponding Nexus implementation address
   */
  function setLegacyMapping(address _legacyModule, address _nexusImpl) external onlyRole(DEFAULT_ADMIN_ROLE) {
    legacyToNexusMapping[_legacyModule] = _nexusImpl;
  }
}
