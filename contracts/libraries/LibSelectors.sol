// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {DiamondLoupeFacet} from "../facets/DiamondLoupeFacet.sol";
import {WhitelistFacet} from "../facets/WhitelistFacet.sol";
import {ExecutionFacet} from "../facets/ExecutionFacet.sol";
import {AdminFacet} from "../facets/AdminFacet.sol";

/// @title SelectorsLib
/// @notice Provides precomputed function selectors for Diamond facets
/// @dev Avoids inline keccak256 calls inside DiamondDeployer to reduce bytecode size
library LibSelectors {

    // ---------------- Loupe Facet ----------------
    function getLoupeFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = DiamondLoupeFacet.facets.selector;
        selectors[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        selectors[2] = DiamondLoupeFacet.facetAddresses.selector;
        selectors[3] = DiamondLoupeFacet.facetAddress.selector;
        selectors[4] = DiamondLoupeFacet.supportsInterface.selector;
    }

    // ---------------- Whitelist Facet ----------------
    function getWhitelistFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](6);
        selectors[0] = WhitelistFacet.addWhitelistedSelector.selector;
        selectors[1] = WhitelistFacet.removeWhitelistedSelector.selector;
        selectors[2] = WhitelistFacet.addWhitelistedSelectorsBatch.selector;
        selectors[3] = WhitelistFacet.isWhitelistedSelector.selector;
        selectors[4] = WhitelistFacet.isWhitelistedTarget.selector;
        selectors[5] = WhitelistFacet.isCallAllowed.selector;
    }

    // ---------------- Execution Facet ----------------
    function getExecutionFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](6);
        selectors[0] = ExecutionFacet.relaySignedSwapCall.selector;
        selectors[1] = ExecutionFacet.relaySignedSwapCallBatch.selector;
        selectors[2] = ExecutionFacet.relaySignedTransferCall.selector;
        selectors[3] = ExecutionFacet.relaySignedTransferCallBatch.selector;
        selectors[4] = ExecutionFacet.initializeExecutionRelay.selector;
        // nonces function
        selectors[5] = bytes4(keccak256("nonces(address)"));
    }

    // ---------------- Admin Facet ----------------
    function getAdminFacetSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](18);
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
        // Treasury admin controls
        selectors[14] = AdminFacet.setTreasury.selector;
        selectors[15] = AdminFacet.getTreasury.selector;
        // Emergency withdrawals
        selectors[16] = AdminFacet.emergencyWithdrawErc20.selector;
        selectors[17] = AdminFacet.emergencyWithdrawEth.selector;
    }

    // OwnershipFacet removed; ownership managed via AdminFacet
}
