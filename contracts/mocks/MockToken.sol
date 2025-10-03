// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20, ERC20Permit {
    constructor(uint256 initialSupply) ERC20("MockToken", "MTKN") ERC20Permit("MockToken") {
        _mint(msg.sender, initialSupply);
    }
}
