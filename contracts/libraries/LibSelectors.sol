// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { DiamondLoupeFacet } from "../facets/DiamondLoupeFacet.sol";
import { WhitelistFacet } from "../facets/WhitelistFacet.sol";
import { ExecutionFacet } from "../facets/ExecutionFacet.sol";
import { AdminFacet } from "../facets/AdminFacet.sol";

/// @title LibSelectors
/// @notice Provides precomputed function selectors for Diamond facets
/// @dev Avoids inline keccak256 calls inside DiamondDeployer to reduce bytecode size
library LibSelectors {
    // ---------------- Loupe Facet ----------------
    /// @notice Return selectors for DiamondLoupeFacet
    /// @return selectors Array of function selectors
    function getLoupeFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = DiamondLoupeFacet.facets.selector;
        selectors[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        selectors[2] = DiamondLoupeFacet.facetAddresses.selector;
        selectors[3] = DiamondLoupeFacet.facetAddress.selector;
        selectors[4] = DiamondLoupeFacet.supportsInterface.selector;
    }

    // ---------------- Whitelist Facet ----------------
    /// @notice Return selectors for WhitelistFacet
    /// @return selectors Array of function selectors
    function getWhitelistFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = WhitelistFacet.addWhitelistedSelector.selector;
        selectors[1] = WhitelistFacet.removeWhitelistedSelector.selector;
        selectors[2] = WhitelistFacet.addWhitelistedSelectorsBatch.selector;
        selectors[3] = WhitelistFacet.removeWhitelistedSelectorsBatch.selector;
        selectors[4] = WhitelistFacet.isWhitelistedSelector.selector;
    }

    // ---------------- Execution Facet ----------------
    /// @notice Return selectors for ExecutionFacet
    /// @return selectors Array of function selectors
    function getExecutionFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](4);
        selectors[0] = ExecutionFacet.relaySignedSwapCall.selector;
        selectors[1] = ExecutionFacet.relaySignedTransferCall.selector;
        selectors[2] = ExecutionFacet.initializeExecutionRelay.selector;
        // nonces function
        selectors[3] = bytes4(keccak256("nonces(address)"));
    }

    // ---------------- Admin Facet ----------------
    /// @notice Return selectors for AdminFacet
    /// @return selectors Array of function selectors
    function getAdminFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](17);
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
        // Permit2 admin controls (set removed, keep get)
        selectors[12] = AdminFacet.getPermit2.selector;
        // Treasury admin controls
        selectors[13] = AdminFacet.setTreasury.selector;
        selectors[14] = AdminFacet.getTreasury.selector;
        // Emergency withdrawals
        selectors[15] = AdminFacet.emergencyWithdrawErc20.selector;
        selectors[16] = AdminFacet.emergencyWithdrawEth.selector;
    }

    // OwnershipFacet removed; ownership managed via AdminFacet
}
