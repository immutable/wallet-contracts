// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ERC7579MainModuleMinimal} from "../modules/ERC7579MainModuleMinimal.sol";

/**
 * @title TestAccount
 * @notice Test version of ERC7579MainModuleMinimal that allows direct module installation for testing
 * @dev Only for testing purposes - bypasses onlySelf restriction
 */
contract TestAccount is ERC7579MainModuleMinimal {
    
    constructor(address _factory) ERC7579MainModuleMinimal(_factory) {}
    
    /**
     * @notice Test-only function to install modules without self-call restriction
     * @param moduleTypeId The type of module to install
     * @param module The module address
     * @param data Initialization data
     */
    function testInstallModule(uint256 moduleTypeId, address module, bytes calldata data) 
        external 
    {
        require(moduleTypeId > 0 && moduleTypeId < 5, "TYPE");
        require(!_modules[moduleTypeId][module], "EXISTS");
        
        _modules[moduleTypeId][module] = true;
        _moduleList[moduleTypeId].push(module);
        
        emit ModuleInstalled(moduleTypeId, module);
    }
    
    /**
     * @notice Test-only function to uninstall modules without self-call restriction
     * @param moduleTypeId The type of module to uninstall
     * @param module The module address
     * @param data Deinitialization data
     */
    function testUninstallModule(uint256 moduleTypeId, address module, bytes calldata data) 
        external 
    {
        require(_modules[moduleTypeId][module], "NOT_FOUND");
        require(!(moduleTypeId == 1 && _moduleList[1].length == 1), "LAST");
        
        _modules[moduleTypeId][module] = false;
        _removeModule(moduleTypeId, module);
        
        emit ModuleUninstalled(moduleTypeId, module);
    }
}
