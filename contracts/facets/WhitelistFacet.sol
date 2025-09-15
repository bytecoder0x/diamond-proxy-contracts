// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {BaseFacet} from "./BaseFacet.sol";

/// @title WhitelistFacet
/// @notice Manages whitelisted targets and selectors for the Diamond
/// @dev Provides granular control over which contracts and functions can be called
/// @dev Pause functionality is now handled by AdminFacet using OpenZeppelin Pausable
contract WhitelistFacet is BaseFacet {
    using LibAppStorage for LibAppStorage.AppStorage;


    // Events
    event TargetWhitelisted(address indexed target, bool whitelisted);
    event SelectorWhitelisted(address indexed target, bytes4 indexed selector, bool whitelisted);

    // Custom errors
    error ArrayLengthMismatch();


    /// @notice Add a selector to the whitelist for a target
    /// @param target Target contract address
    /// @param selector Function selector to whitelist
    function addWhitelistedSelector(address target, bytes4 selector) external onlyRole(LibAppStorage.WHITELIST_MANAGER_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (target == address(0)) revert LibAppStorage.ZeroAddress();
        if (selector == bytes4(0)) revert LibAppStorage.InvalidSelector();
        
        s.whitelistedSelectors[target][selector] = true;
        emit SelectorWhitelisted(target, selector, true);
    }

    /// @notice Remove a selector from the whitelist for a target
    /// @param target Target contract address
    /// @param selector Function selector to remove
    function removeWhitelistedSelector(address target, bytes4 selector) external onlyRole(LibAppStorage.WHITELIST_MANAGER_ROLE) {
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
        if (targets.length != selectors.length) revert ArrayLengthMismatch();
        
        for (uint256 i = 0; i < targets.length; i++) {
            address target = targets[i];
            bytes4 selector = selectors[i];
            
            if (target == address(0)) revert LibAppStorage.ZeroAddress();
            if (selector == bytes4(0)) revert LibAppStorage.InvalidSelector();
            
            s.whitelistedSelectors[target][selector] = true;
            emit SelectorWhitelisted(target, selector, true);
        }
    }

    /// @notice Check if a target is whitelisted
    /// @param target Target contract address
    /// @return True if target is whitelisted
    function isWhitelistedTarget(address target) public view returns (bool) {
        (bool success, bytes memory result) = address(this).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", LibAppStorage.WHITELISTED_TARGET_ROLE, target)
        );
        return success && result.length > 0 && abi.decode(result, (bool));
    }

    /// @notice Check if a selector is whitelisted for a target
    /// @param target Target contract address
    /// @param selector Function selector
    /// @return True if selector is whitelisted for target
    function isWhitelistedSelector(address target, bytes4 selector) external view returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.whitelistedSelectors[target][selector];
    }

    /// @notice Check if a call to target with selector is allowed
    /// @param target Target contract address
    /// @param selector Function selector
    /// @return True if call is allowed
    function isCallAllowed(address target, bytes4 selector) external view returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Check if target is whitelisted via role
        if (!isWhitelistedTarget(target)) return false;
        
        // Check if selector is whitelisted for this target
        return s.whitelistedSelectors[target][selector];
    }

}