// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockToken
/// @notice Simple ERC20 token with permit for testing
contract MockToken is ERC20, ERC20Permit {
    /// @notice Construct mock token and mint initial supply to deployer
    /// @param initialSupply Initial token supply to mint
    constructor(uint256 initialSupply) ERC20("MockToken", "MTKN") ERC20Permit("MockToken") {
        _mint(msg.sender, initialSupply);
    }
}
