// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title MockFacet2
/// @notice Simple mock facet2 for testing
contract MockFacet2 {
    /// @notice Returns a constant value
    /// @return two The constant 2
    function mockFunction() external pure returns (uint256) {
        return 2;
    }
}
