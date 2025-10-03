// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibPermit} from "../libraries/LibPermit.sol";
import {IPermit2} from "../interfaces/IPermit2.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";

/// @title ExecutionFacet
/// @notice Generic execution facet for whitelisted contract calls
/// @dev Handles token transfers, approvals, and external calls with slippage protection
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import {BaseFacet} from "./BaseFacet.sol";
import {IExecutionFacet} from "../interfaces/facets/IExecutionFacet.sol";

contract ExecutionFacet is IExecutionFacet, EIP712Upgradeable, NoncesUpgradeable, ReentrancyGuardUpgradeable, BaseFacet {
    using SafeERC20 for IERC20;
    using Address for address;
    using LibAppStorage for LibAppStorage.AppStorage;

    bytes4 public constant TRANSFER_FROM_SELECTOR = 0xa85e59e4;

    /// @dev EIP-712 typehash for Swap execution with fee
    /// keccak256(
    /// "Swap(address owner,address target,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOutMin,address recipient,address gasFeeToken,uint256 gasFeeAmount,uint256 nonce,uint256 deadline,bytes32 callData)"
    /// )
    bytes32 public constant SIGNED_SWAP_CALL_TYPEHASH = 0x5920ea0bb4824da9c3fbd9a09667b5d360c30ccf190a57e91874c99b00c90784;

    /// @dev EIP-712 typehash for Transfer execution with fee
    /// keccak256(
    /// "Transfer(address owner,address token,uint256 amount,address recipient,address gasFeeToken,uint256 gasFeeAmount,uint256 nonce,uint256 deadline)"
    /// )
    bytes32 public constant SIGNED_TRANSFER_CALL_TYPEHASH = 0x522026e92108289de322fe17f741d35e85cd9e1eeee7688e165675eb683cd7bd;


    /// @notice Initialize EIP712 and Nonces for this facet (versioned)
    function initializeExecutionRelay() external reinitializer(2) onlyRole(LibAppStorage.DEFAULT_ADMIN_ROLE) {
        __EIP712_init("DiamondProxy", "1");
        __Nonces_init();
    }


    /// @notice Relay a single signed swap call with optional fee in a different token
    function relaySignedSwapCall(
        address owner,
        ExecuteSwapCallParams calldata params,
        RelayMeta calldata relayMeta
    ) external nonReentrant whenNotPaused onlyRole(LibAppStorage.OPERATOR_ROLE) {
        _validateCall(params.target, params.tokenIn, params.callData);
        _verifyAndConsumeSwap(owner, params, relayMeta.feeToken, relayMeta.feeAmount, relayMeta.nonce, relayMeta.deadline, relayMeta.signature);
        if (params.tokenIn == address(0)) revert LibAppStorage.ZeroAddress();
        _collectFee(owner, relayMeta.feeToken, relayMeta.feeAmount, relayMeta.feeTokenPermitData, relayMeta.feePermit2Data);
        _executeSwapForOwner(owner, params);
        bytes4 selector = bytes4(params.callData[:4]);
        emit RelayExecuted(owner, msg.sender, params.target, selector);
    }

    /// @notice Relay a single signed transfer call with optional fee in a different token
    function relaySignedTransferCall(
        address owner,
        ExecuteTransferParams calldata params,
        RelayMeta calldata relayMeta
    ) external nonReentrant whenNotPaused onlyRole(LibAppStorage.OPERATOR_ROLE) {
        _verifyAndConsumeTransfer(owner, params, relayMeta.feeToken, relayMeta.feeAmount, relayMeta.nonce, relayMeta.deadline, relayMeta.signature);
        if (params.token == address(0)) revert LibAppStorage.ZeroAddress();
        _collectFee(owner, relayMeta.feeToken, relayMeta.feeAmount, relayMeta.feeTokenPermitData, relayMeta.feePermit2Data);
        _executeTransferForOwner(owner, params);
        emit RelayExecuted(owner, msg.sender, params.token, TRANSFER_FROM_SELECTOR);
    }


    function nonces(address owner) 
        public 
        view 
        override(NoncesUpgradeable, IExecutionFacet) 
        returns (uint256) 
    {
        return super.nonces(owner);
    }

    function _verifyAndConsumeSwap(
        address owner,
        ExecuteSwapCallParams calldata params,
        address feeToken,
        uint256 feeAmount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        bytes32 structHash = keccak256(
            abi.encode(
                SIGNED_SWAP_CALL_TYPEHASH,
                owner,
                params.target,
                params.tokenIn,
                params.tokenOut,
                params.amountIn,
                params.amountOutMin,
                params.recipient,
                feeToken,
                feeAmount,
                nonce,
                deadline,
                keccak256(params.callData)
            )
        );
        _verifyAndConsume(owner, structHash, nonce, deadline, signature);
    }

    function _verifyAndConsumeTransfer(
        address owner,
        ExecuteTransferParams calldata params,
        address feeToken,
        uint256 feeAmount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        bytes32 structHash = keccak256(
            abi.encode(
                SIGNED_TRANSFER_CALL_TYPEHASH,
                owner,
                params.token,
                params.amount,
                params.recipient,
                feeToken,
                feeAmount,
                nonce,
                deadline
            )
        );
        _verifyAndConsume(owner, structHash, nonce, deadline, signature);
    }

    function _verifyAndConsume(
        address owner,
        bytes32 structHash,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        if (owner == address(0)) revert LibAppStorage.ZeroAddress();
        if (block.timestamp > deadline) revert LibAppStorage.CallFailed();
        uint256 current = nonces(owner);
        if (nonce != current) revert LibAppStorage.CallFailed();

        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != owner) revert LibAppStorage.NotAuthorized();

        _useCheckedNonce(owner, nonce);
    }

    // _validateBatchArgs removed; multicall handles array length externally

    function _collectFee(
        address owner,
        address feeToken,
        uint256 feeAmount,
        bytes calldata feeTokenPermitData,
        bytes calldata feePermit2Data
    ) internal {
        if (feeAmount == 0) return;
        if (feeToken == address(0)) revert LibAppStorage.ZeroAddress();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        address treasury = s.treasury;
        if (treasury == address(0)) revert LibAppStorage.ZeroAddress();
        LibPermit.transferFromWithPermit(feeToken, owner, treasury, feeAmount, feeTokenPermitData, feePermit2Data);
        emit FeeCollected(owner, feeToken, feeAmount, treasury);
    }

    function _executeSwapForOwner(address owner, ExecuteSwapCallParams calldata params) internal {
        uint256 balanceBefore = _getBalance(params.tokenOut, params.recipient);
        if (params.amountIn > 0) {
            LibPermit.transferFromWithPermit(params.tokenIn, owner, address(this), params.amountIn, params.tokenPermitData, params.permit2Data);
            _approveToken(params.tokenIn, params.target, params.amountIn);
        }
        (bool callSuccess, bytes memory retData) = params.target.call(params.callData);
        if (!callSuccess) {
            // refund input to owner and emit failure while keeping collected fee
            if (params.amountIn > 0) {
                IERC20(params.tokenIn).safeTransfer(owner, params.amountIn);
            }
            emit SwapCallFailed(owner, params.target, params.tokenIn, params.amountIn, params.tokenOut, params.recipient, retData);
            return;
        }
        uint256 balanceAfter = _getBalance(params.tokenOut, params.recipient);
        uint256 amountOut = balanceAfter - balanceBefore;
        if (amountOut < params.amountOutMin) {
            revert LibAppStorage.SlippageExceeded();
        }
        emit SwapCallExecuted(
            owner,
            params.target,
            params.tokenIn,
            params.amountIn,
            params.tokenOut,
            amountOut,
            params.recipient
        );
    }

    function _executeTransferForOwner(address owner, ExecuteTransferParams calldata params) internal {
        // TRANSFER_FROM_SELECTOR is always whitelisted
        LibPermit.transferFromWithPermit(params.token, owner, params.recipient, params.amount, params.tokenPermitData, params.permit2Data);
        emit TransferCallExecuted(owner, params.token, params.amount, params.recipient);
    }

    /// @notice Validate that the target and selector are whitelisted
    /// @param target Target contract address
    /// @param callData Call data containing the selector
    function _validateCall(address target, address tokenIn, bytes calldata callData) internal view {
        if (target == address(0)) revert LibAppStorage.ZeroAddress();
        if (tokenIn == address(0)) revert LibAppStorage.ZeroAddress();
        if (msg.value > 0) revert LibAppStorage.ETHValueNotAllowed();

        if (callData.length < 4) revert LibAppStorage.InvalidSelector();
        bytes4 selector = bytes4(callData[:4]);
        
        _validateCallSelector(target, selector);
    }

    // Check if target is whitelisted via role OR specific selector is whitelisted
    function _validateCallSelector(address target, bytes4 selector) internal view {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();

        if (!s.whitelistedSelectors[target][selector]) {
            revert LibAppStorage.SelectorNotWhitelisted();
        }
    }

    /// @notice Approve token to target contract
    /// @param token Token address
    /// @param target Target contract address
    /// @param amount Amount to approve
    function _approveToken(address token, address target, uint256 amount) internal {
        IERC20 tokenContract = IERC20(token);
        uint256 currentAllowance = tokenContract.allowance(address(this), target);
        
        if (currentAllowance < amount) {
            // First reset to 0 if needed (some tokens require this)
            if (currentAllowance > 0) {
                tokenContract.forceApprove(target, 0);
            }
            tokenContract.forceApprove(target, amount);
        }
    }

    /// @notice Get token or ETH balance
    /// @param token Token address (address(0) for ETH)
    /// @param account Account address
    /// @return Balance amount
    function _getBalance(address token, address account) internal view returns (uint256) {
        if (token == address(0)) {
            return account.balance;
        } else {
            return IERC20(token).balanceOf(account);
        }
    }

}
