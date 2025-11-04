// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IWhitelistFacet
/// @notice Interface for whitelist management functions exposed by WhitelistFacet
interface IWhitelistFacet {
    /// @notice Add a selector to the whitelist for a target
    /// @param target Target contract address
    /// @param selector Function selector to whitelist
    function addWhitelistedSelector(address target, bytes4 selector) external;

    /// @notice Remove a selector from the whitelist for a target
    /// @param target Target contract address
    /// @param selector Function selector to remove
    function removeWhitelistedSelector(address target, bytes4 selector) external;

    /// @notice Batch add multiple selectors for targets to the whitelist
    /// @param targets Array of target contract addresses
    /// @param selectors Array of function selectors (must match targets length)
    function addWhitelistedSelectorsBatch(address[] calldata targets, bytes4[] calldata selectors) external;

    /// @notice Batch remove multiple selectors for targets from the whitelist
    /// @param targets Array of target contract addresses
    /// @param selectors Array of function selectors (must match targets length)
    function removeWhitelistedSelectorsBatch(address[] calldata targets, bytes4[] calldata selectors) external;

    /// @notice Check if a selector is whitelisted for a target
    /// @param target Target contract address
    /// @param selector Function selector
    /// @return True if selector is whitelisted for target
    function isWhitelistedSelector(address target, bytes4 selector) external view returns (bool);
}


