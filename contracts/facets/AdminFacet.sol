// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {MulticallUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";

/// @title AdminFacet
/// @notice Administrative functions using Diamond-compatible OpenZeppelin patterns
/// @dev Uses OpenZeppelin upgradeable contracts for access control and pausable functionality
contract AdminFacet is
    AccessControlEnumerableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    MulticallUpgradeable
{
    using SafeERC20 for IERC20;
    using Address for address;

    event EmergencyWithdrawErc20(address[] tokens);
    event EmergencyWithdrawEth(uint256 amount);
    event Initialized(address admin, address permit2);
    event TreasuryChanged(address treasury);
    event Permit2AddressChanged(address indexed oldPermit2, address indexed newPermit2);

    // Custom Errors
    error EmergencyRescueNotAllowed();
    error TransferFailed();

    // Custom Admin Functions
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Allows the admin to perform an emergency withdrawal of specified ERC20 tokens to the treasury.
     * @dev This function allows withdrawal of multiple ERC20 tokens in case of an emergency. Can only be called by an admin.
     * @param tokens An array of ERC20 token addresses to be withdrawn.
     */
    function emergencyWithdrawErc20(
        address[] memory tokens
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (s.treasury == address(0)) revert LibAppStorage.ZeroAddress();
        uint256 length = tokens.length;
        for (uint256 i = 0; i < length; ++i) {
            address token = tokens[i];
            if (token == address(0)) revert LibAppStorage.ZeroAddress();
            (, bytes memory queriedBalance) = token.staticcall(
                abi.encodeWithSelector(IERC20.balanceOf.selector, address(this))
            );
            uint256 withdrawable = abi.decode(queriedBalance, (uint256));
            if (withdrawable == 0) revert LibAppStorage.ZeroAmount();
            IERC20(token).safeTransfer(s.treasury, withdrawable);
        }
        emit EmergencyWithdrawErc20(tokens);
    }

    /**
     * @notice Allows the admin to perform an emergency withdrawal of ETH to the treasury.
     * @dev This function allows withdrawal of ETH from the contract in case of an emergency. Can only be called by an admin.
     */
    function emergencyWithdrawEth() external onlyRole(DEFAULT_ADMIN_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (s.treasury == address(0)) revert LibAppStorage.ZeroAddress();
        uint256 currentBalance = address(this).balance;
        if (currentBalance > 0) {
            Address.sendValue(payable(s.treasury), currentBalance);
        }
        emit EmergencyWithdrawEth(currentBalance);
    }

    function initialize(
        address admin,
        address permit2
    ) external initializer {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();

        if (admin == address(0) || permit2 == address(0)) {
            revert LibAppStorage.ZeroAddress();
        }

        __AccessControlEnumerable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __Multicall_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        s.permit2 = permit2;

        emit Initialized(admin, permit2);
    }

    /// @notice Set the Permit2 contract address (admin only)
    function setPermit2(address _permit2) external onlyRole(DEFAULT_ADMIN_ROLE) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (_permit2 == address(0)) revert LibAppStorage.ZeroAddress();
        address old = s.permit2;
        s.permit2 = _permit2;
        emit Permit2AddressChanged(old, _permit2);
    }

    /// @notice Get the current Permit2 contract address
    function getPermit2() external view returns (address) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.permit2;
    }

    /// @notice Set treasury address for fee collection
    function setTreasury(
        address treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (treasury == address(0)) revert LibAppStorage.ZeroAddress();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.treasury = treasury;
        emit TreasuryChanged(treasury);
    }

    /// @notice Get treasury address
    function getTreasury() external view returns (address) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.treasury;
    }

}
