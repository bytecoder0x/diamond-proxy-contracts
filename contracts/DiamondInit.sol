// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { LibDiamond } from "./libraries/LibDiamond.sol";
import { LibAppStorage } from "./libraries/LibAppStorage.sol";
import { IDiamondLoupe } from "./interfaces/IDiamondLoupe.sol";
import { IDiamondCut } from "./interfaces/IDiamondCut.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title DiamondInit
/// @notice Contract used to initialize the Diamond proxy state
/// @dev This contract is called during the diamond cut to set up initial state
contract DiamondInit {
    /// @notice Initialize the Diamond with initial configuration
    /// @param args Initialization arguments
    function init(InitArgs calldata args) external {
        // Add the supported interfaces
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;

        // Initialize app storage
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();

        // Validate input parameters
        if (args.admin == address(0) || args.permit2 == address(0)) {
            revert LibAppStorage.ZeroAddress();
        }

        // Note: Role initialization is now handled by AdminFacet.initialize()
        // using OpenZeppelin's AccessControl instead of custom storage

        // Initialize configuration
        s.permit2 = args.permit2;
        // Note: Pause state is now handled by OpenZeppelin Pausable in AdminFacet (defaults to unpaused)

        emit DiamondInitialized(args.admin, args.permit2);
    }

    /// @notice Parameters for Diamond initialization
    struct InitArgs {
        address admin; // Initial admin address
        address permit2; // Permit2 contract address
    }

    event DiamondInitialized(address indexed admin, address indexed permit2);
}
