// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";

/// @title BaseFacet
/// @notice Base contract for all facets that need access control
/// @dev Provides access control functionality by delegating to AdminFacet
abstract contract BaseFacet {
    using LibAppStorage for LibAppStorage.AppStorage;

    /// @notice Check if an account has a role by calling AdminFacet
    /// @param role Role hash
    /// @param account Account to check
    /// @return True if the account has the role
    function _hasRole(bytes32 role, address account) internal view returns (bool) {
        // Call AdminFacet's hasRole function through delegatecall
        (bool success, bytes memory result) = address(this).staticcall(
            abi.encodeWithSelector(IAccessControl.hasRole.selector, role, account)
        );
        
        if (success && result.length > 0) {
            return abi.decode(result, (bool));
        }
        
        return false;
    }

    /// @notice Modifier to check if caller has required role
    /// @param role Role hash required
    modifier onlyRole(bytes32 role) {
        if (!_hasRole(role, msg.sender)) {
            revert LibAppStorage.NotAuthorized();
        }
        _;
    }

}

