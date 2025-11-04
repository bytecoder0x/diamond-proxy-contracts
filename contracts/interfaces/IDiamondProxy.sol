// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IDiamondLoupe } from "./IDiamondLoupe.sol";
import { IDiamondCut } from "./IDiamondCut.sol";
import { IExecutionFacet } from "./facets/IExecutionFacet.sol";
import { IWhitelistFacet } from "./facets/IWhitelistFacet.sol";
import { IAdminFacet } from "./facets/IAdminFacet.sol";
import { IPausable } from "./IPausable.sol";
import { IMulticall } from "./IMulticall.sol";

/// @title IDiamondProxy
/// @notice Main interface for the Diamond Proxy SaaS solution
/// @dev Combines all facet interfaces for external integration
interface IDiamondProxy is
    IDiamondLoupe,
    IDiamondCut,
    IExecutionFacet,
    IWhitelistFacet,
    IAdminFacet,
    IPausable,
    IMulticall
{
    /// @notice ERC165 support check
    /// @param interfaceId Interface id
    /// @return True if supported
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    // ERC-173 style ownership (immutable functions on the diamond)
    /// @notice Returns the immutable diamond owner
    /// @return ownerAddress Address of the immutable owner
    function owner() external view returns (address);
}
