// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IMulticallFacet
/// @notice Interface for multicall functionality
interface IMulticall {
    /// @notice Execute multiple calls in a single transaction
    /// @param data Array of calldata payloads
    /// @return results Array of return data for each call
    function multicall(bytes[] calldata data) external returns (bytes[] memory results);
}


