// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { LibDiamond } from "./libraries/LibDiamond.sol";
import { LibAppStorage } from "./libraries/LibAppStorage.sol";
import { IDiamondLoupe } from "./interfaces/IDiamondLoupe.sol";
import { IDiamondCut } from "./interfaces/IDiamondCut.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IExecutionFacet } from "./interfaces/facets/IExecutionFacet.sol";
import { IAdminFacet } from "./interfaces/facets/IAdminFacet.sol";
import { IPausable } from "./interfaces/IPausable.sol";
import { IMulticall } from "./interfaces/IMulticall.sol";
import { IWhitelistFacet } from "./interfaces/facets/IWhitelistFacet.sol";
import { IAccessControlEnumerable } from "@openzeppelin/contracts/access/extensions/IAccessControlEnumerable.sol";

/// @title DiamondInit
/// @notice Contract used to initialize the Diamond proxy state
/// @dev This contract is called during the diamond cut to set up initial state
contract DiamondInit {
    /// @notice Emitted when the Diamond is initialized
    event DiamondInitialized();

    /// @notice Initialize the Diamond with initial configuration
    function init() external {
        // Add the supported interfaces
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Core Diamond interfaces
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

        // Facet interfaces
        ds.supportedInterfaces[type(IExecutionFacet).interfaceId] = true;
        ds.supportedInterfaces[type(IAdminFacet).interfaceId] = true;
        ds.supportedInterfaces[type(IWhitelistFacet).interfaceId] = true;
        ds.supportedInterfaces[type(IPausable).interfaceId] = true;
        ds.supportedInterfaces[type(IMulticall).interfaceId] = true;
        ds.supportedInterfaces[type(IAccessControlEnumerable).interfaceId] = true;

        // Note: Role initialization is now handled by AdminFacet.initialize()
        // using OpenZeppelin's AccessControl instead of custom storage

        // Note: Pause state is now handled by OpenZeppelin Pausable in AdminFacet (defaults to unpaused)

        emit DiamondInitialized();
    }
}
