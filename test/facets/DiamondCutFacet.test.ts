import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deployDiamond, viem, loadFixture } from "../utils/utils.js";
import { toFunctionSelector } from "viem";
import { ZERO_ADDRESS, ZERO_BYTES } from "../utils/constant.js";

describe("DiamondCutFacet", async function () {
	it("Should correctly add mock facet and call its function", async function () {
		const { diamond, admin } = await loadFixture(deployDiamond);

		const mockFacet = await viem.deployContract("MockFacet");
		const mockFunctionSelector = toFunctionSelector("mockFunction()");

		const diamondCut = [
			{
				facetAddress: mockFacet.address,
				action: 0, // Add action
				functionSelectors: [mockFunctionSelector],
			},
		];

		await diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]);

        const updatedDiamond = await viem.getContractAt("MockFacet", diamond.address);
        const result = await updatedDiamond.read.mockFunction();
		assert.equal(result, 1n);

		const facets = await diamond.read.facets();
		const mockFacetInfo = facets.find((facet: any) => facet.facetAddress.toLowerCase() === mockFacet.address.toLowerCase());

		assert.ok(mockFacetInfo);
		assert.equal(mockFacetInfo.functionSelectors.length, 1);
		assert.equal(mockFacetInfo.functionSelectors[0], mockFunctionSelector);
	});

	it("Should correctly remove mock facet", async function () {
		const { diamond, admin } = await loadFixture(deployDiamond);

		const mockFacet = await viem.deployContract("MockFacet");
		const mockFunctionSelector = toFunctionSelector("mockFunction()");

		const addDiamondCut = [
			{
				facetAddress: mockFacet.address,
				action: 0, // Add action
				functionSelectors: [mockFunctionSelector],
			},
		];

		await diamond.write.diamondCut([addDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

		const facetsBefore = await diamond.read.facets();
		const mockFacetBefore = facetsBefore.find((facet: any) => facet.facetAddress.toLowerCase() === mockFacet.address.toLowerCase());
		assert.ok(mockFacetBefore);

		const removeDiamondCut = [
			{
				facetAddress: ZERO_ADDRESS,
				action: 2, // Remove action
				functionSelectors: [mockFunctionSelector],
			},
		];

		await diamond.write.diamondCut([removeDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

		const facetsAfter = await diamond.read.facets();
		const mockFacetAfter = facetsAfter.find((facet: any) => facet.facetAddress.toLowerCase() === mockFacet.address.toLowerCase());
		assert.equal(mockFacetAfter, undefined);

		const updatedDiamond = await viem.getContractAt("MockFacet", diamond.address);
		await assert.rejects(updatedDiamond.read.mockFunction());
	});
});
