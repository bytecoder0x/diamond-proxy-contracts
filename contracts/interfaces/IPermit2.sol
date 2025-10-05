// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IPermit2
/// @notice Permit2 interface for token approvals
interface IPermit2 {
    struct PermitDetails {
        address token;
        uint160 amount;
        uint48 expiration;
        uint48 nonce;
    }

    struct PermitSingle {
        PermitDetails details;
        address spender;
        uint256 sigDeadline;
    }

    struct PackedAllowance {
        uint160 amount;
        uint48 expiration;
        uint48 nonce;
    }

    /// @notice Transfer tokens with Permit2 allowance
    /// @param user Token owner
    /// @param spender Spender
    /// @param amount Amount to transfer
    /// @param token Token address
    function transferFrom(address user, address spender, uint160 amount, address token) external;
    /// @notice Approve spending via Permit2 signature
    /// @param owner Token owner
    /// @param permitSingle Permit details
    /// @param signature ECDSA signature
    function permit(address owner, PermitSingle memory permitSingle, bytes calldata signature) external;
    /// @notice Get current packed allowance
    /// @param user Token owner
    /// @param token Token address
    /// @param spender Spender address
    /// @return PackedAllowance struct
    function allowance(address user, address token, address spender) external view returns (PackedAllowance memory);
}
