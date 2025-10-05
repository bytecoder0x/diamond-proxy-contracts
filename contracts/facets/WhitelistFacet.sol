// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { LibAppStorage } from "../libraries/LibAppStorage.sol";
import { BaseFacet } from "./BaseFacet.sol";

/// @title WhitelistFacet
/// @notice Manages whitelisted targets and selectors for the Diamond
/// @dev Provides granular control over which contracts and functions can be called
/// @dev Pause functionality is now handled by AdminFacet using OpenZeppelin Pausable
contract WhitelistFacet is BaseFacet {
    using LibAppStorage for LibAppStorage.AppStorage;

    /// @notice Emitted when a selector is (un)whitelisted for a target
    /// @param target Target contract address
    /// @param selector Function selector
    /// @param whitelisted Whether the selector is whitelisted
    event SelectorWhitelisted(address indexed target, bytes4 indexed selector, bool indexed whitelisted);

    /// @notice Add a selector to the whitelist for a target
    /// @param target Target contract address
    /// @param selector Function selector to whitelist
    function addWhitelistedSelector(
        address target,
        bytes4 selector
    ) external onlyRole(LibAppStorage.WHITELIST_MANAGER_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (target == address(0)) revert LibAppStorage.ZeroAddress();
        if (selector == bytes4(0)) revert LibAppStorage.InvalidSelector();

        s.whitelistedSelectors[target][selector] = true;
        emit SelectorWhitelisted(target, selector, true);
    }

    /// @notice Remove a selector from the whitelist for a target
    /// @param target Target contract address
    /// @param selector Function selector to remove
    function removeWhitelistedSelector(
        address target,
        bytes4 selector
    ) external onlyRole(LibAppStorage.WHITELIST_MANAGER_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.whitelistedSelectors[target][selector] = false;
        emit SelectorWhitelisted(target, selector, false);
    }

    /// @notice Batch add multiple selectors for targets to the whitelist
    /// @param targets Array of target contract addresses
    /// @param selectors Array of function selectors (must match targets length)
    function addWhitelistedSelectorsBatch(
        address[] calldata targets,
        bytes4[] calldata selectors
    ) external onlyRole(LibAppStorage.WHITELIST_MANAGER_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (targets.length != selectors.length) revert LibAppStorage.ArrayLengthMismatch();

        for (uint256 i = 0; i < targets.length; ++i) {
            address target = targets[i];
            bytes4 selector = selectors[i];

            if (target == address(0)) revert LibAppStorage.ZeroAddress();
            if (selector == bytes4(0)) revert LibAppStorage.InvalidSelector();

            s.whitelistedSelectors[target][selector] = true;
            emit SelectorWhitelisted(target, selector, true);
        }
    }

    /// @notice Batch remove multiple selectors for targets from the whitelist
    /// @param targets Array of target contract addresses
    /// @param selectors Array of function selectors (must match targets length)
    function removeWhitelistedSelectorsBatch(
        address[] calldata targets,
        bytes4[] calldata selectors
    ) external onlyRole(LibAppStorage.WHITELIST_MANAGER_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (targets.length != selectors.length) revert LibAppStorage.ArrayLengthMismatch();

        for (uint256 i = 0; i < targets.length; ++i) {
            address target = targets[i];
            bytes4 selector = selectors[i];

            if (target == address(0)) revert LibAppStorage.ZeroAddress();
            if (selector == bytes4(0)) revert LibAppStorage.InvalidSelector();

            s.whitelistedSelectors[target][selector] = false;
            emit SelectorWhitelisted(target, selector, false);
        }
    }

    /// @notice Check if a selector is whitelisted for a target
    /// @param target Target contract address
    /// @param selector Function selector
    /// @return True if selector is whitelisted for target
    function isWhitelistedSelector(address target, bytes4 selector) public view returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.whitelistedSelectors[target][selector];
    }
}
