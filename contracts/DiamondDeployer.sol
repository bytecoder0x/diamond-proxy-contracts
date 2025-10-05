// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Diamond } from "./Diamond.sol";
// Note: OwnershipFacet removed - using AccessControl instead
import { LibSelectors } from "./libraries/LibSelectors.sol";
import { DiamondInit } from "./DiamondInit.sol";
import { IDiamondCut } from "./interfaces/IDiamondCut.sol";
import { IDiamondProxy } from "./interfaces/IDiamondProxy.sol";

/// @title DiamondDeployer
/// @notice Helper contract for deploying and setting up the complete Diamond proxy
/// @dev Deploys all facets and sets up the Diamond in a single transaction
contract DiamondDeployer {
    /// @notice Deploy a complete Diamond proxy with all facets
    /// @param args Deployment arguments
    /// @return diamond Address of the deployed Diamond
    function deployDiamond(DeploymentArgs calldata args) external returns (address diamond) {
        // Validate arguments
        if (args.admin == address(0) || args.permit2 == address(0)) {
            revert InvalidDeploymentArgs();
        }

        // Deploy Diamond with DiamondCutFacet and set owner to deployer temporarily
        Diamond diamondProxy = new Diamond(address(this), args.diamondCutFacet);
        diamond = address(diamondProxy);

        // Prepare facet cuts (omit OwnershipFacet)
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](4);

        // DiamondLoupeFacet
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: args.diamondLoupeFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: LibSelectors.getLoupeFacetSelectors()
        });

        // WhitelistFacet
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: args.whitelistFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: LibSelectors.getWhitelistFacetSelectors()
        });

        // ExecutionFacet
        cuts[2] = IDiamondCut.FacetCut({
            facetAddress: args.executionFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: LibSelectors.getExecutionFacetSelectors()
        });

        // AdminFacet
        cuts[3] = IDiamondCut.FacetCut({
            facetAddress: args.adminFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: LibSelectors.getAdminFacetSelectors()
        });

        // Prepare initialization call
        DiamondInit.InitArgs memory initArgs = DiamondInit.InitArgs({ admin: args.admin, permit2: args.permit2 });

        bytes memory initCalldata = abi.encodeWithSelector(DiamondInit.init.selector, initArgs);

        // Execute diamond cut with initialization (owner = deployer at this point)
        IDiamondCut(diamond).diamondCut(cuts, args.diamondInit, initCalldata);

        // Initialize AccessControl roles via AdminFacet
        IDiamondProxy(diamond).initialize(args.admin, args.permit2);

        // Note: initializeExecutionRelay() is executed in the Ignition setup module by the admin

        // Transfer immutable ownership to admin
        (bool ok, ) = diamond.call(abi.encodeWithSignature("transferOwnership(address)", args.admin));
        require(ok, "transferOwnership failed");

        emit DiamondDeployed(diamond, args.admin, args.permit2);
    }

    /// @notice Arguments for Diamond deployment
    struct DeploymentArgs {
        address admin; // Initial admin address
        address permit2; // Permit2 contract address
        address diamondCutFacet;
        address diamondLoupeFacet;
        address whitelistFacet;
        address executionFacet;
        address adminFacet;
        address diamondInit;
    }

    event DiamondDeployed(address indexed diamond, address indexed admin, address permit2);

    error InvalidDeploymentArgs();
}
