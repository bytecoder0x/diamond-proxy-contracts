// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Diamond} from "./Diamond.sol";
import {DiamondCutFacet} from "./facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "./facets/DiamondLoupeFacet.sol";
// Note: OwnershipFacet removed - using AccessControl instead
import {WhitelistFacet} from "./facets/WhitelistFacet.sol";
import {ExecutionFacet} from "./facets/ExecutionFacet.sol";
import {AdminFacet} from "./facets/AdminFacet.sol";
import {DiamondInit} from "./DiamondInit.sol";
import {LibDiamond} from "./libraries/LibDiamond.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {IDiamondProxy} from "./interfaces/IDiamondProxy.sol";

/// @title DiamondDeployer
/// @notice Helper contract for deploying and setting up the complete Diamond proxy
/// @dev Deploys all facets and sets up the Diamond in a single transaction
contract DiamondDeployer {
    
    /// @notice Deploy a complete Diamond proxy with all facets
    /// @param args Deployment arguments
    /// @return diamond Address of the deployed Diamond
    function deployDiamond(DeploymentArgs calldata args) external returns (address diamond) {
        // Validate arguments
        if (args.admin == address(0) || 
            args.permit2 == address(0)) {
            revert InvalidDeploymentArgs();
        }
        
        // Deploy facets
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();
        // Note: OwnershipFacet removed - using AccessControl instead
        WhitelistFacet whitelistFacet = new WhitelistFacet();
        ExecutionFacet executionFacet = new ExecutionFacet();
        AdminFacet adminFacet = new AdminFacet();
        DiamondInit diamondInit = new DiamondInit();
        
        // Deploy Diamond with DiamondCutFacet
        Diamond diamondProxy = new Diamond(address(this), address(diamondCutFacet));
        diamond = address(diamondProxy);
        
        // Prepare facet cuts (omit OwnershipFacet)
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](4);
        
        // DiamondLoupeFacet
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(diamondLoupeFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: getLoupeFacetSelectors()
        });
        
        // WhitelistFacet
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(whitelistFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: getWhitelistFacetSelectors()
        });
        
        // ExecutionFacet
        cuts[2] = IDiamondCut.FacetCut({
            facetAddress: address(executionFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: getExecutionFacetSelectors()
        });
        
        // AdminFacet
        cuts[3] = IDiamondCut.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: getAdminFacetSelectors()
        });

        
        // Prepare initialization call
        DiamondInit.InitArgs memory initArgs = DiamondInit.InitArgs({
            admin: args.admin,
            permit2: args.permit2
        });
        
        bytes memory initCalldata = abi.encodeWithSelector(
            DiamondInit.init.selector,
            initArgs
        );
        
        // Execute diamond cut with initialization
        IDiamondCut(diamond).diamondCut(cuts, address(diamondInit), initCalldata);
        
        // Initialize AccessControl roles via AdminFacet
        IDiamondProxy(diamond).initialize(
            args.admin,
            args.permit2
        );

        // Initialize EIP712/Nonces in ExecutionFacet (reinitializer v2)
        ExecutionFacet(address(diamond)).initializeExecutionRelay();

        
        emit DiamondDeployed(
            diamond,
            args.admin,
            args.permit2
        );
    }
    
    // Function selector helpers
    function getLoupeFacetSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = DiamondLoupeFacet.facets.selector;
        selectors[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        selectors[2] = DiamondLoupeFacet.facetAddresses.selector;
        selectors[3] = DiamondLoupeFacet.facetAddress.selector;
        selectors[4] = DiamondLoupeFacet.supportsInterface.selector;
    }
    
    // Note: OwnershipFacet selectors removed - using AccessControl instead
    
    function getWhitelistFacetSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = WhitelistFacet.addWhitelistedSelector.selector;
        selectors[1] = WhitelistFacet.removeWhitelistedSelector.selector;
        selectors[2] = WhitelistFacet.addWhitelistedSelectorsBatch.selector;
        selectors[3] = WhitelistFacet.isWhitelistedTarget.selector;
        selectors[4] = WhitelistFacet.isCallAllowed.selector;
    }
    
    function getExecutionFacetSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = ExecutionFacet.simpleCall.selector;
        selectors[1] = ExecutionFacet.initializeExecutionRelay.selector;
    }
    
    
    function getAdminFacetSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](14);
        // OpenZeppelin AccessControl functions (inherited)
        selectors[0] = bytes4(keccak256("grantRole(bytes32,address)"));
        selectors[1] = bytes4(keccak256("revokeRole(bytes32,address)"));
        selectors[2] = bytes4(keccak256("renounceRole(bytes32,address)"));
        selectors[3] = bytes4(keccak256("hasRole(bytes32,address)"));
        selectors[4] = bytes4(keccak256("getRoleAdmin(bytes32)"));
        selectors[5] = bytes4(keccak256("getRoleMember(bytes32,uint256)"));
        selectors[6] = bytes4(keccak256("getRoleMemberCount(bytes32)"));
        // OpenZeppelin Pausable functions (inherited)
        selectors[7] = bytes4(keccak256("paused()"));
        selectors[8] = bytes4(keccak256("pause()"));
        selectors[9] = bytes4(keccak256("unpause()"));
        // OpenZeppelin Multicall function (inherited)
        selectors[10] = bytes4(keccak256("multicall(bytes[])"));
        // Custom AdminFacet function
        selectors[11] = AdminFacet.initialize.selector;
        // Permit2 admin controls
        selectors[12] = AdminFacet.setPermit2.selector;
        selectors[13] = AdminFacet.getPermit2.selector;
    }

    // OwnershipFacet removed; ownership managed via AdminFacet
    
    /// @notice Arguments for Diamond deployment
    struct DeploymentArgs {
        address admin;              // Initial admin address
        address permit2;            // Permit2 contract address
    }
    
    event DiamondDeployed(
        address indexed diamond,
        address indexed admin,
        address permit2
    );
    
    error InvalidDeploymentArgs();
}
