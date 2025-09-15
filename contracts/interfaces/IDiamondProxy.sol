// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IDiamondProxy
/// @notice Main interface for the Diamond Proxy SaaS solution
/// @dev Combines all facet interfaces for external integration
interface IDiamondProxy {
    // ============ Execution Interface ============
    
    struct ExecuteCallParams {
        address target;
        bytes callData;
        address tokenIn;
        uint256 amountIn;
        address tokenOut;
        uint256 minAmountOut;
        address recipient;
        bytes tokenPermitData;
        bytes permit2Data;
    }

    function executeCall(ExecuteCallParams calldata params) external payable;
    function executeCallBatch(ExecuteCallParams[] calldata params) external payable;
    function simpleCall(address target, bytes calldata callData) external;

    // ============ Whitelist Interface ============
    
    function addWhitelistedTarget(address target) external;
    function removeWhitelistedTarget(address target) external;
    function addWhitelistedSelector(address target, bytes4 selector) external;
    function removeWhitelistedSelector(address target, bytes4 selector) external;
    function isWhitelistedTarget(address target) external view returns (bool);
    function isWhitelistedSelector(address target, bytes4 selector) external view returns (bool);
    function isCallAllowed(address target, bytes4 selector) external view returns (bool);

    // ============ Admin Interface ============
    
    // OpenZeppelin AccessControl functions
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
    
    // OpenZeppelin Pausable functions
    function paused() external view returns (bool);
    function pause() external;
    function unpause() external;
    
    // OpenZeppelin Multicall function
    function multicall(bytes[] calldata data) external returns (bytes[] memory results);
    
    // Custom admin functions
    function emergencyPause(bool _paused) external;
    function emergencyRescue(address token, address to, uint256 amount) external;
    function initialize(address admin, address permit2) external;


    // ============ Events ============
    
    event CallExecuted(
        address indexed user,
        address indexed target,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        address recipient
    );

    event TargetWhitelisted(address indexed target, bool whitelisted);
    event SelectorWhitelisted(address indexed target, bytes4 indexed selector, bool whitelisted);
    event Permit2Changed(address indexed newPermit2);
}
