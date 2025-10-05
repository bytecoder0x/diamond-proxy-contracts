// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title LibAppStorage
/// @notice Application-specific storage for the Diamond
/// @dev Stores all facet-specific state variables in a single struct to avoid storage collisions
library LibAppStorage {
    struct AppStorage {
        // Whitelist state (selectors only; targets are AccessControl roles)
        mapping(address => mapping(bytes4 => bool)) whitelistedSelectors;
        // Note: Pause state is handled by OpenZeppelin Pausable in AdminFacet

        // Permit state
        address permit2;
        // Treasury for relayer fee collection
        address treasury;
    }

    // keccak256("diamond.standard.app.storage")
    bytes32 internal constant APP_STORAGE_POSITION = 0x2ad3e90873cbe86f6a024e2d91b7abbabc6ce35c355c15912cb7d7df99da235b;

    /// @notice Return app storage pointer
    /// @return s AppStorage reference
    function appStorage() internal pure returns (AppStorage storage s) {
        bytes32 position = APP_STORAGE_POSITION;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            s.slot := position
        }
    }

    // Role constants - using OpenZeppelin AccessControl compatible roles
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;
    // keccak256("OPERATOR_ROLE")
    bytes32 internal constant OPERATOR_ROLE = 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929;
    // keccak256("WHITELIST_MANAGER_ROLE")
    bytes32 internal constant WHITELIST_MANAGER_ROLE =
        0x2a3dab589bcc9747970dd85ac3f222668741ae51f2a1bbb8f8355be28dd8a868;

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
