// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { LibDiamond } from "./libraries/LibDiamond.sol";
import { IDiamondCut } from "./interfaces/IDiamondCut.sol";

/// @title Diamond
/// @notice Main Diamond contract implementing ERC-2535 Diamond Standard
/// @dev This is the main proxy contract that delegates calls to facets
contract Diamond {
    error FunctionNotFound(bytes4 _functionSelector);

    /// @notice Constructs the Diamond and sets up initial diamond cut capability
    /// @param _contractOwner Address of the initial immutable owner stored in diamond storage
    /// @param _diamondCutFacet Address of the facet that exposes `diamondCut`
    constructor(address _contractOwner, address _diamondCutFacet) {
        // Set immutable contract owner in diamond storage
        LibDiamond.setContractOwner(_contractOwner);
        // Add the diamondCut external function from the diamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: _diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    /// @notice Fallback function delegates unknown calls to the appropriate facet
    /// @dev Uses inline assembly to perform an efficient delegatecall to the facet
    fallback() external payable {
        // solhint-disable-line no-complex-fallback
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        // solhint-disable no-inline-assembly
        assembly {
            ds.slot := position
        }
        // get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        if (facet == address(0)) {
            revert FunctionNotFound(msg.sig);
        }
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
        // solhint-enable no-inline-assembly
    }

    /// @notice Receive function to accept ETH transfers
    receive() external payable {}

    // ERC-173 style ownership (immutable functions on the diamond)

    /// @notice Returns the immutable diamond owner
    /// @return ownerAddress Address of the immutable owner
    function owner() external view returns (address ownerAddress) {
        return LibDiamond.contractOwner();
    }

    /// @notice Transfers immutable ownership to a new owner
    /// @param _newOwner Address of the new owner
    function transferOwnership(address _newOwner) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }
}
