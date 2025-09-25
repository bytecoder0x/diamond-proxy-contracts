// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Execution facet interface
interface IExecutionFacet {
    /// @notice Parameters for executing a call with ERC20 tokens
    struct ExecuteSwapCallParams {
        address target;                // Target contract to call
        bytes callData;                // Call data to execute
        address tokenIn;               // Input token address (address(0) for ETH)
        uint256 amountIn;              // Input token amount
        address tokenOut;              // Output token address (address(0) for ETH)
        uint256 amountOutMin;          // Minimum output amount (slippage protection)
        address recipient;             // Recipient of output tokens
        bytes tokenPermitData;         // EIP-2612/DAI permit data
        bytes permit2Data;             // Permit2 signature data
    }

    /// @notice Parameters for executing ERC20 transfer
    struct ExecuteTransferParams {
        address token;                 // Token address (ERC20)
        uint256 amount;                // Amount to transfer
        address recipient;             // Recipient of tokens
        bytes tokenPermitData;         // EIP-2612/DAI permit data
        bytes permit2Data;             // Permit2 signature data
    }

    /// @notice Relay multiple signed calls
    struct BatchArgs {
        address[] owners;
        address[] feeTokens;
        uint256[] feeAmounts;
        bytes[] feeTokenPermitDatas;
        bytes[] feePermit2Datas;
        uint256[] nonces;
        uint256[] deadlines;
        bytes[] signatures;
    }

    event RelayExecuted(address indexed owner, address indexed relayer, address indexed target, bytes4 selector);
    event FeeCollected(address indexed owner, address indexed token, uint256 amount, address indexed treasury);

    event SwapCallExecuted(
        address indexed user,
        address indexed target,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        address recipient
    );
    
    event TransferCallExecuted(
        address indexed owner,
        address indexed token,
        uint256 amount,
        address indexed recipient
    );

    event SimpleCallExecuted(
        address indexed user,
        address indexed target,
        bytes callData
    );

    function initializeExecutionRelay() external;

    function relaySignedSwapCall(
        address owner,
        ExecuteSwapCallParams calldata params,
        address feeToken,
        uint256 feeAmount,
        bytes calldata feeTokenPermitData,
        bytes calldata feePermit2Data,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function relaySignedTransferCall(
        address owner,
        ExecuteTransferParams calldata params,
        address feeToken,
        uint256 feeAmount,
        bytes calldata feeTokenPermitData,
        bytes calldata feePermit2Data,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function relaySignedSwapCallBatch(
        BatchArgs calldata b,
        ExecuteSwapCallParams[] calldata params
    ) external;

    function relaySignedTransferCallBatch(
        BatchArgs calldata b,
        ExecuteTransferParams[] calldata params
    ) external;
}