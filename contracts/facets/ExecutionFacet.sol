// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibPermit} from "../libraries/LibPermit.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";

/// @title ExecutionFacet
/// @notice Generic execution facet for whitelisted contract calls
/// @dev Handles token transfers, approvals, and external calls with slippage protection
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import {BaseFacet} from "./BaseFacet.sol";

contract ExecutionFacet is EIP712Upgradeable, NoncesUpgradeable, ReentrancyGuardUpgradeable, BaseFacet {
    using SafeERC20 for IERC20;
    using Address for address;
    using LibAppStorage for LibAppStorage.AppStorage;

    /// @notice Parameters for executing a call with ERC20 tokens
    struct ExecuteCallParams {
        address target;                 // Target contract to call
        bytes callData;                // Call data to execute
        address tokenIn;               // Input token address (address(0) for ETH)
        uint256 amountIn;              // Input token amount
        address tokenOut;              // Output token address (address(0) for ETH)
        uint256 minAmountOut;          // Minimum output amount (slippage protection)
        address recipient;             // Recipient of output tokens
        bytes tokenPermitData;         // EIP-2612/DAI permit data
        bytes permit2Data;             // Permit2 signature data
    }

    /// @dev EIP-712 typehash for signed relayed execution with fee
    /// keccak256(
    /// "SignedCall(address owner,address target,bytes32 callDataHash,address tokenIn,uint256 amountIn,address tokenOut,uint256 minAmountOutInSrcChain,address recipient,address feeToken,uint256 feeAmount,uint256 nonce,uint256 deadline)"
    /// )
    bytes32 public constant SIGNED_CALL_TYPEHASH = 0xae551774583d918d46ecdf5ac8115ad13aa380f944f6df00029f5d4b3b21550e;

    event RelayExecuted(address indexed owner, address indexed relayer, address indexed target, bytes4 selector);
    event FeeCollected(address indexed owner, address indexed token, uint256 amount, address indexed treasury);

    event CallExecuted(
        address indexed user,
        address indexed target,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        address recipient
    );
    
    event SimpleCallExecuted(
        address indexed user,
        address indexed target,
        bytes callData
    );


    /// @notice Reentrancy guard modifier
    // Use OZ upgradeable guard via initializer in AdminFacet or a dedicated init

    /// @notice Check if the contract is not paused (calls AdminFacet's paused() function)
    modifier whenNotPaused() {
        // Call AdminFacet's paused() function through delegatecall
        (bool success, bytes memory result) = address(this).staticcall(
            abi.encodeWithSelector(bytes4(keccak256("paused()")))
        );
        
        if (success && result.length > 0) {
            bool isPaused = abi.decode(result, (bool));
            if (isPaused) revert LibAppStorage.Paused();
        }
        _;
    }


    /// @notice Initialize EIP712 and Nonces for this facet (versioned)
    function initializeExecutionRelay() external reinitializer(2) onlyRole(LibAppStorage.DEFAULT_ADMIN_ROLE) {
        __EIP712_init("DiamondProxy", "1");
        __Nonces_init();
    }

    // direct external execution removed; use relaySignedCall instead

    /// @notice Execute a call to a whitelisted target with token handling on behalf of owner (meta-signed)
    /// @param owner Tokens payer/permit owner
    /// @param params Execution parameters
    // Removed external executeCallFor to avoid unauthorized calls; use signed relay below

    // batch external execution removed; use relaySignedCallBatch instead

    /// @notice Execute multiple calls on behalf of owner (meta-signed)
    /// @param owner Tokens payer/permit owner
    /// @param params Array of execution parameters
    // Removed external executeCallBatchFor; use signed relay batch below

    /// @notice Relay a single signed call with optional fee in a different token
    function relaySignedCall(
        address owner,
        ExecuteCallParams calldata params,
        address feeToken,
        uint256 feeAmount,
        bytes calldata feeTokenPermitData,
        bytes calldata feePermit2Data,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused onlyRole(LibAppStorage.OPERATOR_ROLE) {
        _verifyAndConsume(owner, params, feeToken, feeAmount, nonce, deadline, signature);
        if (params.tokenIn == address(0)) revert LibAppStorage.ZeroAddress();
        _collectFee(owner, feeToken, feeAmount, feeTokenPermitData, feePermit2Data);
        _executeForOwner(owner, params);
        bytes4 selector = bytes4(params.callData[:4]);
        emit RelayExecuted(owner, msg.sender, params.target, selector);
    }

    /// @notice Relay multiple signed calls
    struct BatchArgs {
        address[] owners;
        ExecuteCallParams[] params;
        address[] feeTokens;
        uint256[] feeAmounts;
        bytes[] feeTokenPermitDatas;
        bytes[] feePermit2Datas;
        uint256[] nonces;
        uint256[] deadlines;
        bytes[] signatures;
    }

    function relaySignedCallBatch(BatchArgs calldata b)
        external
        whenNotPaused
        onlyRole(LibAppStorage.OPERATOR_ROLE)
    {
        uint256 length = b.owners.length;
        if (
            length != b.params.length ||
            length != b.feeTokens.length ||
            length != b.feeAmounts.length ||
            length != b.feeTokenPermitDatas.length ||
            length != b.feePermit2Datas.length ||
            length != b.nonces.length ||
            length != b.deadlines.length ||
            length != b.signatures.length
        ) revert LibAppStorage.InvalidSelector();

        for (uint256 i = 0; i < length; ++i) {
            _verifyAndConsume(b.owners[i], b.params[i], b.feeTokens[i], b.feeAmounts[i], b.nonces[i], b.deadlines[i], b.signatures[i]);
            if (b.params[i].tokenIn == address(0)) revert LibAppStorage.ZeroAddress();
            _collectFee(b.owners[i], b.feeTokens[i], b.feeAmounts[i], b.feeTokenPermitDatas[i], b.feePermit2Datas[i]);
            _executeForOwner(b.owners[i], b.params[i]);
            bytes4 selector = bytes4(b.params[i].callData[:4]);
            emit RelayExecuted(b.owners[i], msg.sender, b.params[i].target, selector);
        }
    }

    function _verifyAndConsume(
        address owner,
        ExecuteCallParams calldata params,
        address feeToken,
        uint256 feeAmount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        if (owner == address(0)) revert LibAppStorage.ZeroAddress();
        if (block.timestamp > deadline) revert LibAppStorage.CallFailed();
        uint256 current = nonces(owner);
        if (nonce != current) revert LibAppStorage.CallFailed();
        bytes32 structHash = keccak256(
            abi.encode(
                SIGNED_CALL_TYPEHASH,
                owner,
                params.target,
                keccak256(params.callData),
                params.tokenIn,
                params.amountIn,
                params.tokenOut,
                params.minAmountOut,
                params.recipient,
                feeToken,
                feeAmount,
                nonce,
                deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != owner) revert LibAppStorage.NotAuthorized();
        _useCheckedNonce(owner, nonce);
    }

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
        if (feeTokenPermitData.length > 0) {
            LibPermit.makeTokenPermit(feeToken, owner, feeTokenPermitData);
        }
        if (feePermit2Data.length > 0) {
            LibPermit.makePermit2(feeToken, owner, feeAmount, feePermit2Data);
        }
        LibPermit.transferPayment(feeToken, owner, treasury, feeAmount);
        emit FeeCollected(owner, feeToken, feeAmount, treasury);
    }

    function _executeForOwner(address owner, ExecuteCallParams calldata params) internal {
        _validateCall(params.target, params.callData);
        uint256 balanceBefore = _getBalance(params.tokenOut, params.recipient);
        if (params.tokenIn != address(0) && params.amountIn > 0) {
            _handleTokenInputFrom(owner, params.tokenIn, params.amountIn, params.tokenPermitData, params.permit2Data);
            _approveToken(params.tokenIn, params.target, params.amountIn);
        }
        uint256 ethValue = params.tokenIn == address(0) ? params.amountIn : 0;
        _executeTargetCall(params.target, params.callData, ethValue);
        uint256 balanceAfter = _getBalance(params.tokenOut, params.recipient);
        uint256 amountOut = balanceAfter - balanceBefore;
        if (amountOut < params.minAmountOut) {
            revert LibAppStorage.SlippageExceeded();
        }
        emit CallExecuted(
            owner,
            params.target,
            params.tokenIn,
            params.amountIn,
            params.tokenOut,
            amountOut,
            params.recipient
        );
    }

    /// @notice Simple call without token handling (for view functions or simple calls)
    /// @param target Target contract address
    /// @param callData Call data to execute
    function simpleCall(address target, bytes calldata callData) external nonReentrant whenNotPaused {
        _validateCall(target, callData);
        _executeTargetCall(target, callData, 0);
        
        emit SimpleCallExecuted(msg.sender, target, callData);
    }

    /// @notice Validate that the target and selector are whitelisted
    /// @param target Target contract address
    /// @param callData Call data containing the selector
    function _validateCall(address target, bytes calldata callData) internal view {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        if (callData.length < 4) revert LibAppStorage.InvalidSelector();
        bytes4 selector = bytes4(callData[:4]);
        
        // Check if target is whitelisted via role OR specific selector is whitelisted
        (bool success, bytes memory result) = address(this).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", LibAppStorage.WHITELISTED_TARGET_ROLE, target)
        );
        bool targetWhitelisted = success && result.length > 0 && abi.decode(result, (bool));
        if (!targetWhitelisted && !s.whitelistedSelectors[target][selector]) {
            revert LibAppStorage.TargetNotWhitelisted();
        }
    }

    /// @notice Handle input token transfers with permit support
    /// @param token Token address
    /// @param amount Amount to transfer
    /// @param tokenPermitData EIP-2612/DAI permit data
    /// @param permit2Data Permit2 signature data
    function _handleTokenInputFrom(
        address owner,
        address token,
        uint256 amount,
        bytes calldata tokenPermitData,
        bytes calldata permit2Data
    ) internal {
        if (tokenPermitData.length > 0) {
            LibPermit.makeTokenPermit(token, owner, tokenPermitData);
        }
        
        if (permit2Data.length > 0) {
            LibPermit.makePermit2(token, owner, amount, permit2Data);
        }
        
        LibPermit.transferPayment(token, owner, address(this), amount);
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

    /// @notice Execute call to target contract
    /// @param target Target contract address
    /// @param callData Call data to execute
    /// @param value ETH value to send
    function _executeTargetCall(address target, bytes calldata callData, uint256 value) internal {
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        
        if (!success) {
            if (returnData.length > 0) {
                // Bubble up the error
                assembly {
                    let returndata_size := mload(returnData)
                    revert(add(32, returnData), returndata_size)
                }
            } else {
                revert LibAppStorage.CallFailed();
            }
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
