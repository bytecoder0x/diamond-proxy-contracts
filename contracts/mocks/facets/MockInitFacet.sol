// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { LibDiamond } from "../../libraries/LibDiamond.sol";

/// @title MockInitFacet
/// @notice Simple mock init facet for testing
contract MockInitFacet {
    /// @notice Sets the contract owner to zero address
    /// @dev This will trigger ZeroAddress error in setContractOwner
    function testSetZeroOwner() external {
        // This will trigger ZeroAddress error in setContractOwner
        LibDiamond.setContractOwner(address(0));
    }
}
