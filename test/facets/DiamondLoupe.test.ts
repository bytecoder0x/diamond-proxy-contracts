import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadFixture } from '../utils/client.js';
import { deployDiamond } from '../utils/deploy-diamond.js';

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

  it('Should support interface core diamond interfaces and facet interfaces', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    const IERC165 = '0x01ffc9a7';
    const IDiamondCut = '0x1f931c1c';
    const IDiamondLoupe = '0x48e2b093';
    const IExecutionFacet = '0xf01a61ee';
    const IAdminFacet = '0x7a7dd95c';
    const IWhitelistFacet = '0x45a95709';
    const IPausable = '0xe78a39d8';
    const IMulticall = '0xac9650d8';
    const IAccessControlEnumerable = '0x5a05180f';

    const supportsInterfaceIERC165 = await diamond.read.supportsInterface([IERC165]);
    const supportsInterfaceIDiamondCut = await diamond.read.supportsInterface([IDiamondCut]);
    const supportsInterfaceIDiamondLoupe = await diamond.read.supportsInterface([IDiamondLoupe]);
    const supportsInterfaceIExecutionFacet = await diamond.read.supportsInterface([IExecutionFacet]);
    const supportsInterfaceIAdminFacet = await diamond.read.supportsInterface([IAdminFacet]);
    const supportsInterfaceIWhitelistFacet = await diamond.read.supportsInterface([IWhitelistFacet]);
    const supportsInterfaceIPausable = await diamond.read.supportsInterface([IPausable]);
    const supportsInterfaceIMulticall = await diamond.read.supportsInterface([IMulticall]);
    const supportsInterfaceIAccessControlEnumerable = await diamond.read.supportsInterface([IAccessControlEnumerable]);

    assert.equal(supportsInterfaceIERC165, true);
    assert.equal(supportsInterfaceIDiamondCut, true);
    assert.equal(supportsInterfaceIDiamondLoupe, true);
    assert.equal(supportsInterfaceIExecutionFacet, true);
    assert.equal(supportsInterfaceIAdminFacet, true);
    assert.equal(supportsInterfaceIWhitelistFacet, true);
    assert.equal(supportsInterfaceIPausable, true);
    assert.equal(supportsInterfaceIMulticall, true);
    assert.equal(supportsInterfaceIAccessControlEnumerable, true);
  });
});
