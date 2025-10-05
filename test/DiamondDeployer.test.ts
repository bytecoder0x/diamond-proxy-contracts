import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadFixture, viem } from './utils/client.js';
import { PERMIT2_ADDRESS, ZERO_ADDRESS } from './utils/constant.js';
import { deployDiamond } from './utils/deploy-diamond.js';

describe('DiamondDeployer', async function () {
  it('Should deploy with correct facets and function selectors', async function () {
    const fixture = await loadFixture(deployDiamond);
    const { diamond, libSelectors } = fixture;

    const loupeFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.diamondLoupeFacetAddress,
    ]);
    const loupeFacetsSelectorsFromLib = await libSelectors.read.getLoupeFacetSelectors();

    const whitelistFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.whitelistFacetAddress,
    ]);
    const whitelistFacetsSelectorsFromLib = await libSelectors.read.getWhitelistFacetSelectors();

    const executionFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.executionFacetAddress,
    ]);
    const executionFacetsSelectorsFromLib = await libSelectors.read.getExecutionFacetSelectors();

    const adminFacetsSelectorsFromDiamond = await diamond.read.facetFunctionSelectors([
      fixture.adminFacetAddress,
    ]);
    const adminFacetsSelectorsFromLib = await libSelectors.read.getAdminFacetSelectors();

    assert.equal(loupeFacetsSelectorsFromDiamond.length, loupeFacetsSelectorsFromLib.length);
    assert.equal(
      whitelistFacetsSelectorsFromDiamond.length,
      whitelistFacetsSelectorsFromLib.length,
    );
    assert.equal(
      executionFacetsSelectorsFromDiamond.length,
      executionFacetsSelectorsFromLib.length,
    );
    assert.equal(adminFacetsSelectorsFromDiamond.length, adminFacetsSelectorsFromLib.length);

    for (let i = 0; i < loupeFacetsSelectorsFromLib.length; i++) {
      assert.equal(loupeFacetsSelectorsFromDiamond[i], loupeFacetsSelectorsFromLib[i]);
    }
    for (let i = 0; i < whitelistFacetsSelectorsFromLib.length; i++) {
      assert.equal(whitelistFacetsSelectorsFromDiamond[i], whitelistFacetsSelectorsFromLib[i]);
    }
    for (let i = 0; i < executionFacetsSelectorsFromLib.length; i++) {
      assert.equal(executionFacetsSelectorsFromDiamond[i], executionFacetsSelectorsFromLib[i]);
    }
    for (let i = 0; i < adminFacetsSelectorsFromLib.length; i++) {
      assert.equal(adminFacetsSelectorsFromDiamond[i], adminFacetsSelectorsFromLib[i]);
    }
  });

  it('Should prevent to deploy the diamond with the zero admin or permit2', async function () {
    const {
      diamondDeployerAddress,
      admin,
      diamondCutFacetAddress,
      diamondLoupeFacetAddress,
      whitelistFacetAddress,
      executionFacetAddress,
      adminFacetAddress,
      diamondInitAddress,
    } = await loadFixture(deployDiamond);

    const deploymentArgs = {
      admin: admin.account.address,
      permit2: PERMIT2_ADDRESS,
      diamondCutFacet: diamondCutFacetAddress,
      diamondLoupeFacet: diamondLoupeFacetAddress,
      whitelistFacet: whitelistFacetAddress,
      executionFacet: executionFacetAddress,
      adminFacet: adminFacetAddress,
      diamondInit: diamondInitAddress,
    };

    const diamondDeployer = await viem.getContractAt('DiamondDeployer', diamondDeployerAddress);
    await assert.rejects(
      diamondDeployer.write.deployDiamond([{ ...deploymentArgs, admin: ZERO_ADDRESS }]),
      /InvalidDeploymentArgs/,
    );
    await assert.rejects(
      diamondDeployer.write.deployDiamond([{ ...deploymentArgs, permit2: ZERO_ADDRESS }]),
      /InvalidDeploymentArgs/,
    );
  });
});
