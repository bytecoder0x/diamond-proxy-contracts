import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deployDiamond, loadFixture } from "../utils/utils.js";
import { getRandomAddress } from "../utils/helpers.js";

describe("WhitelistFacet", async function () {
    const randomAddress = getRandomAddress();
    const randomAddress2 = getRandomAddress();
    const randomSelector1 = "0x12345678"
    const randomSelector2 = "0x87654321";

	it("Should add a selector to the whitelist and remove it", async function () {
		const { diamond } = await loadFixture(deployDiamond);

		await diamond.write.addWhitelistedSelector([randomAddress, randomSelector1]);
		assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), true);

		await diamond.write.removeWhitelistedSelector([randomAddress, randomSelector1]);
		assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), false);
	});

	it("Should add batch of selectors to the whitelist and remove it", async function () {
		const { diamond } = await loadFixture(deployDiamond);

		await diamond.write.addWhitelistedSelectorsBatch([[randomAddress, randomAddress2], [randomSelector1, randomSelector2]]);

		assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), true);
		assert.equal(await diamond.read.isWhitelistedSelector([randomAddress2, randomSelector2]), true);

        await diamond.write.removeWhitelistedSelector([randomAddress, randomSelector1]);
        await diamond.write.removeWhitelistedSelector([randomAddress2, randomSelector2]);

        assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), false);
        assert.equal(await diamond.read.isWhitelistedSelector([randomAddress2, randomSelector2]), false);
	});
});
