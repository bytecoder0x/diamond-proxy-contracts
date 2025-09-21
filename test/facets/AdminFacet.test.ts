import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PERMIT2_ADDRESS, ZERO_ADDRESS } from "../utils/constant.js";
import { deployDiamond, loadFixture, publicClient } from "../utils/utils.js";
import { getRandomAddress } from "../utils/helpers.js";
import { parseEther } from "viem";

describe("AdminFacet", async function () {

    it("Should correctly pause and unpause the diamond", async function () {
		const { diamond } = await loadFixture(deployDiamond);

		await diamond.write.pause();
		const paused = await diamond.read.paused();
		assert.equal(paused, true);

		await diamond.write.unpause();
		const unpaused = await diamond.read.paused();
		assert.equal(unpaused, false);
	});

	it("Should correctly set the permit2 address", async function () {
		const { diamond } = await loadFixture(deployDiamond);

		const oldPermit2 = await diamond.read.getPermit2();
		assert.equal(oldPermit2, PERMIT2_ADDRESS);

		const newPermit2 = getRandomAddress();
		await diamond.write.setPermit2([newPermit2]);
		const permit2 = await diamond.read.getPermit2();

		assert.equal(permit2, newPermit2);
	});

	it("Should correctly set the treasury address", async function () {
		const { diamond } = await loadFixture(deployDiamond);

		const oldTreasury = await diamond.read.getTreasury();
		assert.equal(oldTreasury, ZERO_ADDRESS);

		const newTreasury = getRandomAddress();
		await diamond.write.setTreasury([newTreasury]);
		const treasury = await diamond.read.getTreasury();

		assert.equal(treasury, newTreasury);
	});

	it("Should correctly emergency withdraw ERC20 tokens", async function () {
		const { diamond, mockToken } = await loadFixture(deployDiamond);

		const newTreasury = getRandomAddress();
		await diamond.write.setTreasury([newTreasury]);

		const lostAmount = parseEther("1000");
		await mockToken.write.transfer([diamond.address, lostAmount]);

		const balanceOfDiamond = await mockToken.read.balanceOf([diamond.address]);
		assert.equal(balanceOfDiamond, lostAmount);

		await diamond.write.emergencyWithdrawErc20([[mockToken.address]]);
		const balanceOfTreasury = await mockToken.read.balanceOf([newTreasury]);
		const newBalanceOfDiamond = await mockToken.read.balanceOf([diamond.address]);
		assert.equal(balanceOfTreasury, lostAmount);
		assert.equal(newBalanceOfDiamond, 0n);
	});

	it("Should correctly emergency withdraw ETH", async function () {
		const { diamond, admin } = await loadFixture(deployDiamond);

		const newTreasury = getRandomAddress();
		await diamond.write.setTreasury([newTreasury]);

		const lostAmount = parseEther("100");
		await admin.sendTransaction({
			to: diamond.address,
			value: lostAmount,
		});

		const balanceOfDiamond = await publicClient.getBalance({ address: diamond.address });
		assert.equal(balanceOfDiamond, lostAmount);

		await diamond.write.emergencyWithdrawEth();
		const balanceOfTreasury = await publicClient.getBalance({ address: newTreasury });
		const newBalanceOfDiamond = await publicClient.getBalance({ address: diamond.address });
		assert.equal(balanceOfTreasury, lostAmount);
		assert.equal(newBalanceOfDiamond, 0n);
	});
});
