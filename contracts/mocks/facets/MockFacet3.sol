// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title MockFacet3
/// @notice Simple mock facet3 for testing
contract MockFacet3 {
    /// @notice Returns a constant value
    /// @return one The constant 1
    function firstFunction() external pure returns (uint256) {
        return 1;
    }

    /// @notice Returns a constant value
    /// @return two The constant 2
    function secondFunction() external pure returns (uint256) {
        return 2;
    }

    /// @notice Returns a constant value
    /// @return three The constant 3
    function thirdFunction() external pure returns (uint256) {
        return 3;
    }
}
