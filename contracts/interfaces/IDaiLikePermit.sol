// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IDaiLikePermit
/// @notice DAI-like permit interface
interface IDaiLikePermit {
    /// @notice Approve or revoke spending using DAI-like permit
    /// @param holder Token holder address
    /// @param spender Spender address
    /// @param nonce Current nonce
    /// @param expiry Expiration timestamp
    /// @param allowed True to approve, false to revoke
    /// @param v ECDSA v
    /// @param r ECDSA r
    /// @param s ECDSA s
    function permit(
        address holder,
        address spender,
        uint256 nonce,
        uint256 expiry,
        bool allowed,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
