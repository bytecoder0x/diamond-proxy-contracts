import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deployDiamond } from '../utils/deploy-diamond.js';
import { loadFixture } from '../utils/client.js';

describe('DiamondLoupeFacet', async function () {
  it('Should match the facet function selectors with the facet address that belong to', async function () {
    const fixture = await loadFixture(deployDiamond);
    const { diamond, libSelectors } = fixture;

    const loupeFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.diamondLoupeFacetAddress,
    ]);
    for (const selector of loupeFacetsSelectorsFromDiamond) {
      const facetAddress = await diamond.read.facetAddress([selector]);
      assert.equal(facetAddress.toLowerCase(), fixture.diamondLoupeFacetAddress.toLowerCase());
    }

    const whitelistFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.whitelistFacetAddress,
    ]);
    for (const selector of whitelistFacetsSelectorsFromDiamond) {
      const facetAddress = await diamond.read.facetAddress([selector]);
      assert.equal(facetAddress.toLowerCase(), fixture.whitelistFacetAddress.toLowerCase());
    }

    const executionFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.executionFacetAddress,
    ]);
    for (const selector of executionFacetsSelectorsFromDiamond) {
      const facetAddress = await diamond.read.facetAddress([selector]);
      assert.equal(facetAddress.toLowerCase(), fixture.executionFacetAddress.toLowerCase());
    }

    const adminFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.adminFacetAddress,
    ]);
    for (const selector of adminFacetsSelectorsFromDiamond) {
      const facetAddress = await diamond.read.facetAddress([selector]);
      assert.equal(facetAddress.toLowerCase(), fixture.adminFacetAddress.toLowerCase());
    }

    const facetsFromDiamond = await diamond.read.facets();
    const facetsAddressesFromDiamond = await diamond.read.facetAddresses();

    assert.equal(facetsFromDiamond.length, facetsAddressesFromDiamond.length);
  });
});
