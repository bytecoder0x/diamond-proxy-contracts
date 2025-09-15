// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {BaseFacet} from "./BaseFacet.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";

/// @title DiamondCutFacet
/// @notice Diamond Cut Facet implementation (ERC-2535)
/// @dev Allows adding, replacing, and removing facets and functions
contract DiamondCutFacet is IDiamondCut, BaseFacet {
    /// @inheritdoc IDiamondCut
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        // Bootstrap: if AccessControl's hasRole is not yet added, allow diamondCut
        // Otherwise, enforce DEFAULT_ADMIN_ROLE via BaseFacet
        bytes4 hasRoleSel = bytes4(keccak256("hasRole(bytes32,address)"));
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address hasRoleFacet = ds.selectorToFacetAndPosition[hasRoleSel].facetAddress;
        if (hasRoleFacet != address(0)) {
            if (!_hasRole(LibAppStorage.DEFAULT_ADMIN_ROLE, msg.sender)) {
                revert LibAppStorage.NotAuthorized();
            }
        }
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}
