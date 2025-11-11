// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title MockFeeOnTransferToken
/// @notice Simple ERC20 that charges a fee on every transfer (deflationary token simulation)
contract MockFeeOnTransferToken is ERC20, ERC20Permit {
    uint256 public constant FEE_BPS = 100; // 1% fee
    address public immutable feeRecipient;

    constructor(uint256 initialSupply, address feeRecipient_)
        ERC20("MockFeeOnTransferToken", "MFOTT")
        ERC20Permit("MockFeeOnTransferToken")
    {
        require(feeRecipient_ != address(0), "fee recipient zero");
        feeRecipient = feeRecipient_;
        _mint(msg.sender, initialSupply);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || value == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = (value * FEE_BPS) / 10_000;
        uint256 amountAfterFee = value - fee;

        if (fee > 0) {
            super._update(from, feeRecipient, fee);
        }

        super._update(from, to, amountAfterFee);
    }
}

