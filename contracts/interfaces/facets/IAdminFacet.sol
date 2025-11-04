// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IAccessControlEnumerable } from "@openzeppelin/contracts/access/extensions/IAccessControlEnumerable.sol";

/// @title IAdminFacet
/// @notice Admin interface for the Diamond: roles and emergency ops
/// @dev Aggregates standard features (AccessControlEnumerable) plus custom admin methods
interface IAdminFacet is IAccessControlEnumerable {
    /// @notice Initialize roles and base config
    /// @param admin Initial admin address
    /// @param permit2 Permit2 contract address
    function initialize(address admin, address permit2) external;

    /// @notice Emergency withdraw ERC20 tokens to treasury
    /// @param tokens Token addresses
    function emergencyWithdrawErc20(address[] calldata tokens) external;
    /// @notice Emergency withdraw ETH to treasury
    function emergencyWithdrawEth() external;

    /// @notice Get Permit2 address
    function getPermit2() external view returns (address permit2Addr);

    /// @notice Set treasury address
    /// @param treasury Treasury address
    function setTreasury(address treasury) external;
    /// @notice Get treasury address
    function getTreasury() external view returns (address treasuryAddr);
}


