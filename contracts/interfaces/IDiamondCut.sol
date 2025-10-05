// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IDiamondCut
/// @notice Interface for Diamond Facet management (ERC-2535)
/// @dev Add/replace/remove any number of functions and optionally execute a function with delegatecall
interface IDiamondCut {
    enum FacetCutAction {
        Add,
        Replace,
        Remove
    }

    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    /// @notice Emitted when a diamond cut is executed
    /// @param _diamondCut Facet cuts
    /// @param _init Init target address
    /// @param _calldata Calldata to execute
    event DiamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata);

    /// @notice Add/replace/remove any number of functions and optionally execute a function with delegatecall
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external;
}
