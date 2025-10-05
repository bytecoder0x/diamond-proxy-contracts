// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title MockFacet
/// @notice Simple mock facet for testing
contract MockFacet {
    /// @notice Returns a constant value
    /// @return one The constant 1
    function mockFunction() external pure returns (uint256 one) {
        return 1;
    }
}
