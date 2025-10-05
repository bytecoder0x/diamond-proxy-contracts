// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IExecutionFacet
/// @notice Execution facet interface
interface IExecutionFacet {
    /// @notice Parameters for executing a call with ERC20 tokens
    struct ExecuteSwapCallParams {
        address target; // Target contract to call
        bytes callData; // Call data to execute
        address tokenIn; // Input token address (address(0) for ETH)
        uint256 amountIn; // Input token amount
        address tokenOut; // Output token address (address(0) for ETH)
        uint256 amountOutMin; // Minimum output amount (slippage protection)
        address recipient; // Recipient of output tokens
        bytes tokenPermitData; // EIP-2612/DAI permit data
        bytes permit2Data; // Permit2 signature data
    }

    /// @notice Parameters for executing ERC20 transfer
    struct ExecuteTransferParams {
        address token; // Token address (ERC20)
        uint256 amount; // Amount to transfer
        address recipient; // Recipient of tokens
        bytes tokenPermitData; // EIP-2612/DAI permit data
        bytes permit2Data; // Permit2 signature data
    }

    /// @notice Relay metadata (fees, signature)
    struct RelayMeta {
        address feeToken;
        uint256 feeAmount;
        bytes feeTokenPermitData;
        bytes feePermit2Data;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    /// @notice Emitted when a relay call is executed
    /// @param owner EIP-712 signer
    /// @param relayer Caller relaying the request
    /// @param target Target contract called
    /// @param selector Function selector executed
    event RelayExecuted(address indexed owner, address indexed relayer, address indexed target, bytes4 selector);

    /// @notice Emitted when a fee is collected
    /// @param owner EIP-712 signer paying fee
    /// @param token ERC20 fee token
    /// @param amount Fee amount
    /// @param treasury Treasury recipient
    event FeeCollected(address indexed owner, address indexed token, uint256 amount, address indexed treasury);

    /// @notice Emitted when a swap call completes successfully
    /// @param user Swap owner
    /// @param target Target contract
    /// @param tokenIn Input token
    /// @param amountIn Input amount
    /// @param tokenOut Output token
    /// @param amountOut Output amount
    /// @param recipient Recipient address
    event SwapCallExecuted(
        address indexed user,
        address indexed target,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        address recipient
    );

    /// @notice Emitted when a swap call fails and input is refunded
    /// @param user Swap owner
    /// @param target Target contract
    /// @param tokenIn Input token
    /// @param amountIn Input amount
    /// @param tokenOut Output token
    /// @param recipient Recipient
    /// @param revertData Revert reason data
    event SwapCallFailed(
        address indexed user,
        address indexed target,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        address recipient,
        bytes revertData
    );

    /// @notice Emitted when a transfer call completes successfully
    /// @param owner Transfer owner
    /// @param token Token address
    /// @param amount Amount transferred
    /// @param recipient Recipient address
    event TransferCallExecuted(address indexed owner, address indexed token, uint256 amount, address indexed recipient);

    /// @notice Emitted when a simple call is executed
    /// @param user Caller
    /// @param target Target contract
    /// @param callData Calldata executed
    event SimpleCallExecuted(address indexed user, address indexed target, bytes callData);

    /// @notice Initialize the execution relay state
    /// @notice Initialize execution relay (domain / nonces)
    function initializeExecutionRelay() external;

    /// @notice Relay signed swap call
    /// @param owner EIP-712 signer
    /// @param params Swap parameters
    /// @param relayMeta Relay metadata (fees, signature)
    function relaySignedSwapCall(
        address owner,
        ExecuteSwapCallParams calldata params,
        RelayMeta calldata relayMeta
    ) external;

    /// @notice Relay signed transfer call
    /// @param owner EIP-712 signer
    /// @param params Transfer parameters
    /// @param relayMeta Relay metadata (fees, signature)
    function relaySignedTransferCall(
        address owner,
        ExecuteTransferParams calldata params,
        RelayMeta calldata relayMeta
    ) external;

    /// @notice Get current nonce for an owner
    /// @param owner Owner address
    /// @return Current nonce value
    function nonces(address owner) external view returns (uint256);
}
