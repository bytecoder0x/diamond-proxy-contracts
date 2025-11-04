// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IPausable
/// @notice Minimal interface for pause/unpause functionality
/// @dev Intended to be implemented by admin facet to expose pause state and controls
interface IPausable {
    /// @notice Returns current pause state
    /// @return isPaused True if the contract is paused
    function paused() external view returns (bool);

    /// @notice Pause the contract
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;
}


