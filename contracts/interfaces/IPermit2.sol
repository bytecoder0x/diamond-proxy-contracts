// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

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

    function transferFrom(address user, address spender, uint160 amount, address token) external;
    function permit(address owner, PermitSingle memory permitSingle, bytes calldata signature) external;
    function allowance(address user, address token, address spender) external view returns (PackedAllowance memory);
}
