// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title LibAppStorage
/// @notice Application-specific storage for the Diamond
/// @dev Stores all facet-specific state variables in a single struct to avoid storage collisions
library LibAppStorage {
    bytes32 constant APP_STORAGE_POSITION = keccak256("diamond.standard.app.storage");

    struct AppStorage {        
        // Whitelist state (selectors only; targets are AccessControl roles)
        mapping(address => mapping(bytes4 => bool)) whitelistedSelectors;
        // Note: Pause state is handled by OpenZeppelin Pausable in AdminFacet
        
        // Permit state
        address permit2;
        
        // Treasury for relayer fee collection
        address treasury;
    }

    function appStorage() internal pure returns (AppStorage storage s) {
        bytes32 position = APP_STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }

    // Role constants - using OpenZeppelin AccessControl compatible roles
    bytes32 constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 constant WHITELIST_MANAGER_ROLE = keccak256("WHITELIST_MANAGER_ROLE");

    // Error definitions
    error ZeroAddress();
    error ZeroAmount();
    error ArrayLengthMismatch();
    error ETHValueNotAllowed();
    error Paused();
    error NotAuthorized();
    error InvalidSelector();
    error SelectorNotWhitelisted();
    error InsufficientBalance();
    error SlippageExceeded();
    error CallFailed();
    error EmergencyPause();
}
