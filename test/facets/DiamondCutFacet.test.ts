import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';

import { encodeAbiParameters, toFunctionSelector } from 'viem';

import { loadFixture, viem } from '../utils/client.js';
import { ZERO_ADDRESS, ZERO_BYTES } from '../utils/constant.js';
import { deployDiamond } from '../utils/deploy-diamond.js';

describe('DiamondCutFacet', async function () {
  it('Should correctly add mock facet and call its function', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    const updatedDiamond = await viem.getContractAt('MockFacet', diamond.address);
    const result = await updatedDiamond.read.mockFunction();
    assert.equal(result, 1n);

    const facets = await diamond.read.facets();
    const mockFacetInfo = facets.find(
      (facet: any) => facet.facetAddress.toLowerCase() === mockFacet.address.toLowerCase(),
    );

    assert.ok(mockFacetInfo);
    assert.equal(mockFacetInfo.functionSelectors.length, 1);
    assert.equal(mockFacetInfo.functionSelectors[0], mockFunctionSelector);
  });

  it('Should correctly remove mock facet', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const addDiamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await diamond.write.diamondCut([addDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    const facetsBefore = await diamond.read.facets();
    const mockFacetBefore = facetsBefore.find(
      (facet: any) => facet.facetAddress.toLowerCase() === mockFacet.address.toLowerCase(),
    );
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
    const mockFacetAfter = facetsAfter.find(
      (facet: any) => facet.facetAddress.toLowerCase() === mockFacet.address.toLowerCase(),
    );
    assert.equal(mockFacetAfter, undefined);

    const updatedDiamond = await viem.getContractAt('MockFacet', diamond.address);
    await assert.rejects(updatedDiamond.read.mockFunction());
  });

  it('Should revert when adding facet with no selectors', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');

    const diamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [], // Empty array should cause error
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /NoSelectorsProvidedForFacetForCut/,
    );
  });

  it('Should revert when adding selectors to zero address', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: ZERO_ADDRESS,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /CannotAddSelectorsToZeroAddress/,
    );
  });

  it('Should revert when adding function that already exists', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    // First add the function
    const addDiamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await diamond.write.diamondCut([addDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    // Try to add the same function again
    const duplicateDiamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([duplicateDiamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /CannotAddFunctionToDiamondThatAlreadyExists/,
    );
  });

  it('Should correctly replace functions', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet1 = await viem.deployContract('MockFacet');
    const mockFacet2 = await viem.deployContract('MockFacet2');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    // First add the function from MockFacet
    const addDiamondCut = [
      {
        facetAddress: mockFacet1.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await diamond.write.diamondCut([addDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    // Verify it returns 1 from MockFacet
    const updatedDiamond1 = await viem.getContractAt('MockFacet', diamond.address);
    const result1 = await updatedDiamond1.read.mockFunction();
    assert.equal(result1, 1n);

    // Now replace with MockFacet2
    const replaceDiamondCut = [
      {
        facetAddress: mockFacet2.address,
        action: 1, // Replace action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await diamond.write.diamondCut([replaceDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    // Verify it now returns 2 from MockFacet2
    const updatedDiamond2 = await viem.getContractAt('MockFacet2', diamond.address);
    const result2 = await updatedDiamond2.read.mockFunction();
    assert.equal(result2, 2n);
  });

  it('Should revert when replacing with no selectors', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');

    const diamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 1, // Replace action
        functionSelectors: [], // Empty array should cause error
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /NoSelectorsProvidedForFacetForCut/,
    );
  });

  it('Should revert when replacing selectors from zero address', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: ZERO_ADDRESS,
        action: 1, // Replace action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /CannotReplaceSelectorsFromZeroAddress/,
    );
  });

  it('Should revert when replacing function with the same function from the same facet', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    // First add the function
    const addDiamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await diamond.write.diamondCut([addDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    // Try to replace with the same facet
    const replaceDiamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 1, // Replace action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([replaceDiamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet/,
    );
  });

  it('Should revert when removing with no selectors', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const diamondCut = [
      {
        facetAddress: ZERO_ADDRESS,
        action: 2, // Remove action
        functionSelectors: [], // Empty array should cause error
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /NoSelectorsProvidedForFacetForCut/,
    );
  });

  it('Should revert when removing with non-zero facet address', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: mockFacet.address, // Non-zero address should cause error
        action: 2, // Remove action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /RemoveFacetAddressMustBeZeroAddress/,
    );
  });

  it('Should revert when removing function that does not exist', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFunctionSelector = toFunctionSelector('nonExistentFunction()');

    const diamondCut = [
      {
        facetAddress: ZERO_ADDRESS,
        action: 2, // Remove action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /CannotRemoveFunctionThatDoesNotExist/,
    );
  });

  it('Should revert when removing immutable function', async function () {
    const { diamond, diamondCutFacetAddress, admin } = await loadFixture(deployDiamond);
    const ownerSelector = toFunctionSelector('owner()');

    const diamondCutAdd = [
      {
        facetAddress: diamond.address,
        action: 0, // add action
        functionSelectors: [ownerSelector],
      },
    ];

    await diamond.write.diamondCut([diamondCutAdd, ZERO_ADDRESS, ZERO_BYTES]);

    // Try to remove a function that exists directly in the diamond (immutable)
    const diamondCut = [
      {
        facetAddress: ZERO_ADDRESS,
        action: 2, // remove action
        functionSelectors: [ownerSelector],
      },
    ];

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      /CannotRemoveImmutableFunction/,
    );
  });

  it('Should revert when using incorrect facet cut action', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 3, // Invalid action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    /// error commented since in solidity code when we try calldata -> memory with invalid value for enum it will revert
    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES]),
      // /IncorrectFacetCutAction/
    );
  });

  it('Should revert when _init address has no code', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    // Use a non-contract address as _init
    const nonContractAddress = '0x1234567890123456789012345678901234567890';
    const calldata = '0x1234';

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, nonContractAddress, calldata]),
      /NoBytecodeAtAddress/,
    );
  });

  it('Should revert when initialization function reverts', async function () {
    const { diamond, diamondInitAddress } = await loadFixture(deployDiamond);

    const diamondInitSelector = toFunctionSelector('init(address,address)');

    const diamondCutAdd = [
      {
        facetAddress: diamondInitAddress,
        action: 0, // add action
        functionSelectors: [diamondInitSelector],
      },
    ];
    await diamond.write.diamondCut([diamondCutAdd, ZERO_ADDRESS, ZERO_BYTES]);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    const invalidCalldata = `0x8129fc1c00000000000000000000000011111111111111111111111111111111111111110000000000000000000000002222222222222222222222222222222222222222`;

    await assert.rejects(
      diamond.write.diamondCut([diamondCut, diamondInitAddress, invalidCalldata]),
      /InitializationFunctionReverted/,
    );
  });

  // ===== Additional Coverage Tests for Specific Lines =====

  it('Should handle selector replacement logic when removing middle selector (lines 166-170)', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet3');
    const firstSelector = toFunctionSelector('firstFunction()');
    const secondSelector = toFunctionSelector('secondFunction()');
    const thirdSelector = toFunctionSelector('thirdFunction()');

    // Add all three functions
    const addDiamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [firstSelector, secondSelector, thirdSelector],
      },
    ];

    await diamond.write.diamondCut([addDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    // Verify all functions work
    const updatedDiamond = await viem.getContractAt('MockFacet3', diamond.address);
    assert.equal(await updatedDiamond.read.firstFunction(), 1n);
    assert.equal(await updatedDiamond.read.secondFunction(), 2n);
    assert.equal(await updatedDiamond.read.thirdFunction(), 3n);

    // Remove the middle function (secondFunction) to trigger selector replacement logic
    const removeDiamondCut = [
      {
        facetAddress: ZERO_ADDRESS,
        action: 2, // Remove action
        functionSelectors: [secondSelector],
      },
    ];

    await diamond.write.diamondCut([removeDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    // Verify first and third functions still work, but second is removed
    assert.equal(await updatedDiamond.read.firstFunction(), 1n);
    await assert.rejects(updatedDiamond.read.secondFunction());
    assert.equal(await updatedDiamond.read.thirdFunction(), 3n);
  });

  it('Should revert when setting contract owner to zero address', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    // Deploy MockInitFacet that calls setContractOwner with zero address
    const mockInitFacet = await viem.deployContract('MockInitFacet');
    const testFunctionSelector = toFunctionSelector('testSetZeroOwner()');

    // Add the mock facet
    const addDiamondCut = [
      {
        facetAddress: mockInitFacet.address,
        action: 0, // Add action
        functionSelectors: [testFunctionSelector],
      },
    ];

    await diamond.write.diamondCut([addDiamondCut, ZERO_ADDRESS, ZERO_BYTES]);

    // Try to call the function that will trigger ZeroAddress error
    const updatedDiamond = await viem.getContractAt('MockInitFacet', diamond.address);

    await assert.rejects(updatedDiamond.write.testSetZeroOwner(), /ZeroAddress/);
  });

  it('Should revert when non-owner tries to call diamondCut', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const mockFacet = await viem.deployContract('MockFacet');
    const mockFunctionSelector = toFunctionSelector('mockFunction()');

    const diamondCut = [
      {
        facetAddress: mockFacet.address,
        action: 0, // Add action
        functionSelectors: [mockFunctionSelector],
      },
    ];

    // Create a new wallet that is not the owner
    const [, , nonOwner] = await viem.getWalletClients();

    // Try to call diamondCut with non-owner account
    await assert.rejects(
      diamond.write.diamondCut([diamondCut, ZERO_ADDRESS, ZERO_BYTES], {
        account: nonOwner.account,
      }),
      /NotContractOwner/,
    );
  });
});
