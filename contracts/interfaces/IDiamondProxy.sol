// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IDiamondLoupe } from "./IDiamondLoupe.sol";
import { IDiamondCut } from "./IDiamondCut.sol";
import { IExecutionFacet } from "./facets/IExecutionFacet.sol";

/// @title IDiamondProxy
/// @notice Main interface for the Diamond Proxy SaaS solution
/// @dev Combines all facet interfaces for external integration
interface IDiamondProxy is IDiamondLoupe, IDiamondCut, IExecutionFacet {
    // ============ Whitelist Interface ============

    /// @notice Add a whitelisted selector for a target
    /// @param target Target contract address
    /// @param selector Function selector
    function addWhitelistedSelector(address target, bytes4 selector) external;
    /// @notice Batch add whitelisted selectors
    /// @param targets Target contract addresses
    /// @param selectors Function selectors
    function addWhitelistedSelectorsBatch(address[] calldata targets, bytes4[] calldata selectors) external;
    /// @notice Remove a whitelisted selector
    /// @param target Target contract address
    /// @param selector Function selector
    function removeWhitelistedSelector(address target, bytes4 selector) external;
    /// @notice Batch remove whitelisted selectors
    /// @param targets Target contract addresses
    /// @param selectors Function selectors
    function removeWhitelistedSelectorsBatch(address[] calldata targets, bytes4[] calldata selectors) external;
    /// @notice Check if a selector is whitelisted for a target
    /// @param target Target contract address
    /// @param selector Function selector
    /// @return True if whitelisted
    function isWhitelistedSelector(address target, bytes4 selector) external view returns (bool);

    // ============ Admin Interface ============

    // OpenZeppelin AccessControl functions
    /// @notice Grant role
    /// @param role Role id
    /// @param account Account to grant
    function grantRole(bytes32 role, address account) external;
    /// @notice Revoke role
    /// @param role Role id
    /// @param account Account to revoke
    function revokeRole(bytes32 role, address account) external;
    /// @notice Check role membership
    /// @param role Role id
    /// @param account Account
    /// @return True if has role
    function hasRole(bytes32 role, address account) external view returns (bool);
    /// @notice Get role admin
    /// @param role Role id
    /// @return Admin role id
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    /// @notice Get role member by index
    /// @param role Role id
    /// @param index Member index
    /// @return Member address
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    /// @notice Get number of members for role
    /// @param role Role id
    /// @return Count of members
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    /// @notice ERC165 support check
    /// @param interfaceId Interface id
    /// @return True if supported
    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    // OpenZeppelin Pausable functions
    /// @notice Returns whether the contract is paused
    /// @return True if paused
    function paused() external view returns (bool);
    /// @notice Pause the contract
    function pause() external;
    /// @notice Unpause the contract
    function unpause() external;

    // OpenZeppelin Multicall function
    /// @notice Execute multiple calls in a single transaction
    /// @param data Array of calldata payloads
    /// @return results Array of return data
    function multicall(bytes[] calldata data) external returns (bytes[] memory results);

    // Custom admin functions
    /// @notice Emergency pause/unpause
    /// @param _paused True to pause, false to unpause
    function emergencyPause(bool _paused) external;
    /// @notice Emergency rescue tokens
    /// @param token Token address
    /// @param to Recipient address
    /// @param amount Amount to rescue
    function emergencyRescue(address token, address to, uint256 amount) external;
    /// @notice Initialize core roles and config
    /// @param admin Admin address
    /// @param permit2 Permit2 address
    function initialize(address admin, address permit2) external;
    /// @notice Get Permit2 address
    /// @return Permit2 address
    function getPermit2() external view returns (address);
    /// @notice Set treasury address
    /// @param _treasury Treasury address
    function setTreasury(address _treasury) external;
    /// @notice Get treasury address
    /// @return Treasury address
    function getTreasury() external view returns (address);
    /// @notice Emergency withdraw multiple ERC20 tokens
    /// @param tokens Token addresses
    function emergencyWithdrawErc20(address[] memory tokens) external;
    /// @notice Emergency withdraw ETH
    function emergencyWithdrawEth() external;

    // ERC-173 style ownership (immutable functions on the diamond)
    /// @notice Returns the immutable diamond owner
    /// @return ownerAddress Address of the immutable owner
    function owner() external view returns (address);
}
