// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { LibAppStorage } from "../libraries/LibAppStorage.sol";
import { LibPermit } from "../libraries/LibPermit.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import { NoncesUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import { BaseFacet } from "./BaseFacet.sol";
import { IExecutionFacet } from "../interfaces/facets/IExecutionFacet.sol";

/// @title ExecutionFacet
/// @notice Generic execution facet for whitelisted contract calls
/// @dev Handles token transfers, approvals, and external calls with slippage protection
contract ExecutionFacet is
    IExecutionFacet,
    EIP712Upgradeable,
    NoncesUpgradeable,
    ReentrancyGuardUpgradeable,
    BaseFacet
{
    using SafeERC20 for IERC20;
    using Address for address;
    using LibAppStorage for LibAppStorage.AppStorage;

    /// @notice ERC20 transferFrom selector used for whitelisting
    bytes4 public constant TRANSFER_FROM_SELECTOR = 0xa85e59e4;

    /// @dev EIP-712 typehash for Swap execution with fee
    /// keccak256(
    /// "Swap(address owner,address target,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOutMin,address recipient,address gasFeeToken,uint256 gasFeeAmount,uint256 nonce,uint256 deadline,bytes callData)"
    /// )
    /// @notice EIP-712 typehash for Swap execution with fee
    bytes32 public constant SIGNED_SWAP_CALL_TYPEHASH =
        0xb5c390911a15210de1dd6be4d5e5cd41bf6ec8a87e867f3459d704e5e63da0f3;

    /// @dev EIP-712 typehash for Transfer execution with fee
    /// keccak256(
    /// "Transfer(address owner,address token,uint256 amount,address recipient,address gasFeeToken,uint256 gasFeeAmount,uint256 nonce,uint256 deadline)"
    /// )
    /// @notice EIP-712 typehash for Transfer execution with fee
    bytes32 public constant SIGNED_TRANSFER_CALL_TYPEHASH =
        0x522026e92108289de322fe17f741d35e85cd9e1eeee7688e165675eb683cd7bd;

    /// @inheritdoc IExecutionFacet
    function initializeExecutionRelay() external reinitializer(2) onlyRole(LibAppStorage.DEFAULT_ADMIN_ROLE) {
        __EIP712_init("DiamondProxy", "1");
        __Nonces_init();
    }

    /// @inheritdoc IExecutionFacet
    function relaySignedSwapCall(
        address owner,
        ExecuteSwapCallParams calldata params,
        RelayMeta calldata relayMeta
    ) external nonReentrant whenNotPaused onlyRole(LibAppStorage.OPERATOR_ROLE) {
        if (params.tokenIn == address(0)) revert LibAppStorage.ZeroAddress();

        // If tokenIn equals feeToken rely solely on the fee allowance check so that,
        // when tokenIn and feeToken the same and permit is needed
        // it is executed exactly once for the shared fee token.
        if (params.tokenIn != relayMeta.feeToken) {
            _requireAllowance(owner, params.tokenIn, params.amountIn, params.tokenPermitData, params.permit2Data);
        }
        _requireAllowance(owner, relayMeta.feeToken, relayMeta.feeAmount, relayMeta.feeTokenPermitData, relayMeta.feePermit2Data);

        _validateCall(params.target, params.tokenIn, params.callData);
        _verifyAndConsumeSwap(
            owner,
            params,
            relayMeta.feeToken,
            relayMeta.feeAmount,
            relayMeta.nonce,
            relayMeta.deadline,
            relayMeta.signature
        );
        _collectFee(
            owner,
            relayMeta.feeToken,
            relayMeta.feeAmount,
            relayMeta.feeTokenPermitData,
            relayMeta.feePermit2Data
        );
        _executeSwapForOwner(owner, params);
        bytes4 selector = bytes4(params.callData[:4]);
        emit RelayExecuted(owner, msg.sender, params.target, selector);
    }

    /// @inheritdoc IExecutionFacet
    function relaySignedTransferCall(
        address owner,
        ExecuteTransferParams calldata params,
        RelayMeta calldata relayMeta
    ) external nonReentrant whenNotPaused onlyRole(LibAppStorage.OPERATOR_ROLE) {
        if (params.token == address(0)) revert LibAppStorage.ZeroAddress();

        // If tokenIn equals feeToken rely solely on the fee allowance check so that,
        // when tokenIn and feeToken the same and permit is needed
        // it is executed exactly once for the shared fee token.
        if (params.token != relayMeta.feeToken) {
            _requireAllowance(owner, params.token, params.amount, params.tokenPermitData, params.permit2Data);
        }
        _requireAllowance(owner, relayMeta.feeToken, relayMeta.feeAmount, relayMeta.feeTokenPermitData, relayMeta.feePermit2Data);

        _verifyAndConsumeTransfer(
            owner,
            params,
            relayMeta.feeToken,
            relayMeta.feeAmount,
            relayMeta.nonce,
            relayMeta.deadline,
            relayMeta.signature
        );
        _collectFee(
            owner,
            relayMeta.feeToken,
            relayMeta.feeAmount,
            relayMeta.feeTokenPermitData,
            relayMeta.feePermit2Data
        );
        _executeTransferForOwner(owner, params);
        emit RelayExecuted(owner, msg.sender, params.token, TRANSFER_FROM_SELECTOR);
    }

    /// @inheritdoc IExecutionFacet
    function nonces(
        address owner
    ) public view override(NoncesUpgradeable, IExecutionFacet) returns (uint256 currentNonce) {
        return super.nonces(owner);
    }

    /// @notice Verify swap signature and consume the nonce
    /// @param owner The expected signer
    /// @param params Swap params
    /// @param feeToken Fee token address
    /// @param feeAmount Fee amount
    /// @param nonce Expected nonce
    /// @param deadline Signature deadline
    /// @param signature EIP-712 signature
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

    /// @notice Verify transfer signature and consume the nonce
    /// @param owner The expected signer
    /// @param params Transfer params
    /// @param feeToken Fee token address
    /// @param feeAmount Fee amount
    /// @param nonce Expected nonce
    /// @param deadline Signature deadline
    /// @param signature EIP-712 signature
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

    /// @notice Verify a typed data hash against owner and consume nonce
    /// @param owner The expected signer
    /// @param structHash EIP-712 struct hash
    /// @param nonce Expected nonce
    /// @param deadline Signature deadline
    /// @param signature ECDSA signature
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

    /// @notice Collect relay fee from owner to treasury
    /// @param owner Owner address paying the fee
    /// @param feeToken ERC20 token used for fee
    /// @param feeAmount Amount of fee to collect
    /// @param feeTokenPermitData Optional ERC20 Permit data
    /// @param feePermit2Data Optional Permit2 data
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

    /// @notice Check if allowance is sufficient for token and revert if not
    /// @param owner Owner address
    /// @param token Token address
    /// @param amount Amount to check
    /// @param tokenPermitData Optional token permit data
    /// @param permit2Data Optional permit2 data
    function _requireAllowance(
        address owner,
        address token,
        uint256 amount,
        bytes calldata tokenPermitData,
        bytes calldata permit2Data
    ) private view {
        if (amount == 0 || token == address(0) || tokenPermitData.length > 0 || permit2Data.length > 0) {
            return;
        }
        
        if (!LibPermit.hasEnoughAllowance(token, owner, address(this), amount)) {
            revert LibAppStorage.InsufficientAllowance();
        }
    }

    /// @notice Execute swap on behalf of owner
    /// @param owner The owner performing the swap
    /// @param params Swap parameters
    function _executeSwapForOwner(address owner, ExecuteSwapCallParams calldata params) internal {
        uint256 balanceBefore = _getBalance(params.tokenOut, params.recipient);
        if (params.amountIn > 0) {
            uint256 tokenInBalanceBefore = _getBalance(params.tokenIn, address(this));
            LibPermit.transferFromWithPermit(
                params.tokenIn,
                owner,
                address(this),
                params.amountIn,
                params.tokenPermitData,
                params.permit2Data
            );
            uint256 tokenInBalanceAfter = _getBalance(params.tokenIn, address(this));
            uint256 receivedAmount = tokenInBalanceAfter - tokenInBalanceBefore;
            if (receivedAmount != params.amountIn) {
                revert LibAppStorage.FeeOnTransferTokenNotSupported();
            }
            _approveToken(params.tokenIn, params.target, params.amountIn);
        }
        // solhint-disable-next-line avoid-low-level-calls
        (bool callSuccess, bytes memory retData) = params.target.call(params.callData);
        if (!callSuccess) {
            // refund input to owner and emit failure while keeping collected fee
            if (params.amountIn > 0) {
                IERC20(params.tokenIn).safeTransfer(owner, params.amountIn);
            }
            emit SwapCallFailed(
                owner,
                params.target,
                params.tokenIn,
                params.amountIn,
                params.tokenOut,
                params.recipient,
                retData
            );
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

    /// @notice Execute transfer on behalf of owner
    /// @param owner The owner performing the transfer
    /// @param params Transfer parameters
    function _executeTransferForOwner(address owner, ExecuteTransferParams calldata params) internal {
        // TRANSFER_FROM_SELECTOR is always whitelisted
        LibPermit.transferFromWithPermit(
            params.token,
            owner,
            params.recipient,
            params.amount,
            params.tokenPermitData,
            params.permit2Data
        );
        emit TransferCallExecuted(owner, params.token, params.amount, params.recipient);
    }

    /// @notice Validate that the target and selector are whitelisted
    /// @param target Target contract address
    /// @param tokenIn Input token address
    /// @param callData Call data containing the selector
    function _validateCall(address target, address tokenIn, bytes calldata callData) internal view {
        if (target == address(0)) revert LibAppStorage.ZeroAddress();
        if (tokenIn == address(0)) revert LibAppStorage.ZeroAddress();

        if (callData.length < 4) revert LibAppStorage.InvalidSelector();
        bytes4 selector = bytes4(callData[:4]);

        _validateCallSelector(target, selector);
    }

    /// @notice Check if selector is whitelisted for target
    /// @param target Target contract address
    /// @param selector Function selector
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
