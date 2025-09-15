// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {LibAppStorage} from "./LibAppStorage.sol";
import {IPermit2} from "../interfaces/IPermit2.sol";
import {IDaiLikePermit} from "../interfaces/IDaiLikePermit.sol";

/// @notice Permit2 interface for token approvals
// External interfaces moved to src/interfaces/

/// @title LibPermit
/// @notice Library for handling EIP-2612 and Permit2 functionality
/// @dev Provides unified interface for different permit standards
library LibPermit {

    /// @notice Execute permit for EIP-2612 or DAI tokens
    /// @param token Token address
    /// @param owner Token owner
    /// @param permit Permit signature data
    function makeTokenPermit(address token, address owner, bytes calldata permit) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (IERC20(token).allowance(owner, s.permit2) == type(uint256).max) return;
        _safePermit(IERC20(token), owner, s.permit2, permit);
    }

    /// @notice Execute Permit2 approval
    /// @param token Token address
    /// @param owner Token owner
    /// @param amount Amount to approve
    /// @param permit2Data Permit2 signature data
    function makePermit2(address token, address owner, uint256 amount, bytes calldata permit2Data) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        IPermit2.PackedAllowance memory allowanceData = IPermit2(s.permit2).allowance(owner, token, address(this));

        if (amount <= allowanceData.amount && allowanceData.expiration >= block.timestamp) return;
        _safePermit(IERC20(token), owner, address(this), permit2Data);
    }

    /// @notice Transfer tokens using Permit2
    /// @param token Token address
    /// @param owner Token owner
    /// @param to Recipient address
    /// @param amount Amount to transfer
    function transferPayment(address token, address owner, address to, uint256 amount) internal {
        if (amount > 0) {
            LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
            if (amount > type(uint160).max) revert InputOverflow();
            IPermit2(s.permit2).transferFrom(owner, to, uint160(amount), token);
        }
    }

    /// @notice Safe permit execution with error handling
    /// @param token Token contract
    /// @param owner Token owner
    /// @param permit Permit signature data
    function _safePermit(IERC20 token, address owner, address spender, bytes calldata permit) private {
        if (!_tryPermit(token, owner, spender, permit)) revert PermitFailed();
    }

    /// @notice Try permit execution
    /// @param token Token contract
    /// @param owner Token owner
    /// @param spender Spender address
    /// @param permit Permit signature data
    function _tryPermit(
        IERC20 token,
        address owner,
        address spender,
        bytes calldata permit
    ) private returns (bool success) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        address permit2Address = s.permit2;
        bytes4 permitLengthError = PermitLengthError.selector;
        // load function selectors
        bytes4 permitSelector = IERC20Permit.permit.selector;
        bytes4 daiPermitSelector = IDaiLikePermit.permit.selector;
        bytes4 permit2Selector = IPermit2.permit.selector;
        assembly ("memory-safe") {
            let ptr := mload(0x40)

            switch permit.length
            // Compact IERC20Permit (value,uint32 deadline,r,vs)
            case 100 {
                mstore(ptr, permitSelector)
                mstore(add(ptr, 0x04), owner)
                mstore(add(ptr, 0x24), spender)
                {
                    let deadline := shr(224, calldataload(add(permit.offset, 0x20)))
                    let vs := calldataload(add(permit.offset, 0x44))
                    calldatacopy(add(ptr, 0x44), permit.offset, 0x20)
                    mstore(add(ptr, 0x64), sub(deadline, 1))
                    mstore(add(ptr, 0x84), add(27, shr(255, vs)))
                    calldatacopy(add(ptr, 0xa4), add(permit.offset, 0x24), 0x20)
                    mstore(add(ptr, 0xc4), shr(1, shl(1, vs)))
                }
                success := call(gas(), token, 0, ptr, 0xe4, 0, 0)
            }
            // Compact IDaiLikePermit (uint32 nonce,uint32 expiry,r,vs)
            case 72 {
                mstore(ptr, daiPermitSelector)
                mstore(add(ptr, 0x04), owner)
                mstore(add(ptr, 0x24), spender)
                {
                    let expiry := shr(224, calldataload(add(permit.offset, 0x04)))
                    let vs := calldataload(add(permit.offset, 0x28))
                    mstore(add(ptr, 0x44), shr(224, calldataload(permit.offset)))
                    mstore(add(ptr, 0x64), sub(expiry, 1))
                    mstore(add(ptr, 0x84), 1)
                    mstore(add(ptr, 0xa4), add(27, shr(255, vs)))
                    calldatacopy(add(ptr, 0xc4), add(permit.offset, 0x08), 0x20)
                    mstore(add(ptr, 0xe4), shr(1, shl(1, vs)))
                }
                success := call(gas(), token, 0, ptr, 0x104, 0, 0)
            }
            // Standard IERC20Permit
            case 224 {
                mstore(ptr, permitSelector)
                calldatacopy(add(ptr, 0x04), permit.offset, permit.length)
                success := call(gas(), token, 0, ptr, 0xe4, 0, 0)
            }
            // Standard IDaiLikePermit
            case 256 {
                mstore(ptr, daiPermitSelector)
                calldatacopy(add(ptr, 0x04), permit.offset, permit.length)
                success := call(gas(), token, 0, ptr, 0x104, 0, 0)
            }
            // Compact Permit2 (uint160 amount,uint32 expiration,uint32 nonce,uint32 sigDeadline,r,vs)
            case 96 {
                mstore(ptr, permit2Selector)
                mstore(add(ptr, 0x04), owner)
                mstore(add(ptr, 0x24), token)
                calldatacopy(add(ptr, 0x50), permit.offset, 0x14)
                mstore(add(ptr, 0x64), and(0xffffffffffff, sub(shr(224, calldataload(add(permit.offset, 0x14))), 1)))
                mstore(add(ptr, 0x84), shr(224, calldataload(add(permit.offset, 0x18))))
                mstore(add(ptr, 0xa4), spender)
                mstore(add(ptr, 0xc4), and(0xffffffffffff, sub(shr(224, calldataload(add(permit.offset, 0x1c))), 1)))
                mstore(add(ptr, 0xe4), 0x100)
                mstore(add(ptr, 0x104), 0x40)
                calldatacopy(add(ptr, 0x124), add(permit.offset, 0x20), 0x20)
                calldatacopy(add(ptr, 0x144), add(permit.offset, 0x40), 0x20)
                success := call(gas(), permit2Address, 0, ptr, 0x164, 0, 0)
            }
            // Standard Permit2
            case 352 {
                mstore(ptr, permit2Selector)
                calldatacopy(add(ptr, 0x04), permit.offset, permit.length)
                success := call(gas(), permit2Address, 0, ptr, 0x164, 0, 0)
            }
            default {
                mstore(ptr, permitLengthError)
                revert(ptr, 4)
            }
        }
    }

    function _tryCompactPermit(
        IERC20 token,
        address owner,
        address spender,
        bytes calldata permit
    ) private returns (bool success) {
        bytes4 permitSelector = IERC20Permit.permit.selector;
        
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(ptr, permitSelector)
            mstore(add(ptr, 0x04), owner)
            mstore(add(ptr, 0x24), spender)

            {
                let deadline := shr(224, calldataload(add(permit.offset, 0x20)))
                let vs := calldataload(add(permit.offset, 0x44))

                calldatacopy(add(ptr, 0x44), permit.offset, 0x20)
                mstore(add(ptr, 0x64), sub(deadline, 1))
                mstore(add(ptr, 0x84), add(27, shr(255, vs)))
                calldatacopy(add(ptr, 0xa4), add(permit.offset, 0x24), 0x20)
                mstore(add(ptr, 0xc4), shr(1, shl(1, vs)))
            }

            success := call(gas(), token, 0, ptr, 0xe4, 0, 0)
        }
    }

    function _tryStandardPermit(IERC20 token, bytes calldata permit) private returns (bool success) {
        bytes4 permitSelector = IERC20Permit.permit.selector;
        
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(ptr, permitSelector)
            calldatacopy(add(ptr, 0x04), permit.offset, permit.length)
            success := call(gas(), token, 0, ptr, 0xe4, 0, 0)
        }
    }

    function _tryDaiPermit(IERC20 token, bytes calldata permit) private returns (bool success) {
        bytes4 daiPermitSelector = IDaiLikePermit.permit.selector;
        
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(ptr, daiPermitSelector)
            calldatacopy(add(ptr, 0x04), permit.offset, permit.length)
            success := call(gas(), token, 0, ptr, 0x104, 0, 0)
        }
    }

    function _tryPermit2(bytes calldata permit) private returns (bool success) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        bytes4 permit2Selector = IPermit2.permit.selector;
        
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(ptr, permit2Selector)
            calldatacopy(add(ptr, 0x04), permit.offset, permit.length)
            success := call(gas(), sload(add(s.slot, 22)), 0, ptr, add(permit.length, 0x04), 0, 0)
        }
    }

    error PermitFailed();
    error PermitLengthError();
    error InputOverflow();
}
