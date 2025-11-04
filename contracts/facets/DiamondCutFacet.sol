// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import { LibDiamond } from "../libraries/LibDiamond.sol";

/// @title DiamondCutFacet
/// @notice Diamond Cut Facet implementation (ERC-2535)
/// @dev Allows adding, replacing, and removing facets and functions
contract DiamondCutFacet is IDiamondCut {
    /// @inheritdoc IDiamondCut
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external override {
        // Enforce immutable owner-only upgrades (fail-closed)
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}
