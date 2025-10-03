import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deployDiamond } from '../utils/deploy-diamond.js';
import { loadFixture } from '../utils/client.js';
import { getRandomAddress } from '../utils/helpers.js';

describe('WhitelistFacet', async function () {
  const randomAddress = getRandomAddress();
  const randomAddress2 = getRandomAddress();
  const randomSelector1 = '0x12345678';
  const randomSelector2 = '0x87654321';

  it('Should add a selector to the whitelist and remove it', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    await diamond.write.addWhitelistedSelector([randomAddress, randomSelector1]);
    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), true);

    await diamond.write.removeWhitelistedSelector([randomAddress, randomSelector1]);
    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), false);
  });

  it('Should add batch of selectors to the whitelist and remove it', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    await diamond.write.addWhitelistedSelectorsBatch([
      [randomAddress, randomAddress2],
      [randomSelector1, randomSelector2],
    ]);

    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), true);
    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress2, randomSelector2]), true);

    await diamond.write.removeWhitelistedSelector([randomAddress, randomSelector1]);
    await diamond.write.removeWhitelistedSelector([randomAddress2, randomSelector2]);

    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), false);
    assert.equal(
      await diamond.read.isWhitelistedSelector([randomAddress2, randomSelector2]),
      false,
    );
  });

  it('Should remove batch of selectors from the whitelist', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    await diamond.write.addWhitelistedSelectorsBatch([
      [randomAddress, randomAddress2],
      [randomSelector1, randomSelector2],
    ]);

    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), true);
    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress2, randomSelector2]), true);

    await diamond.write.removeWhitelistedSelectorsBatch([
      [randomAddress, randomAddress2],
      [randomSelector1, randomSelector2],
    ]);

    assert.equal(await diamond.read.isWhitelistedSelector([randomAddress, randomSelector1]), false);
    assert.equal(
      await diamond.read.isWhitelistedSelector([randomAddress2, randomSelector2]),
      false,
    );
  });

  it('Should revert on array length mismatch for batch removal', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    await diamond.write.addWhitelistedSelectorsBatch([
      [randomAddress, randomAddress2],
      [randomSelector1, randomSelector2],
    ]);

    await assert.rejects(
      diamond.write.removeWhitelistedSelectorsBatch([
        [randomAddress],
        [randomSelector1, randomSelector2],
      ]),
      /ArrayLengthMismatch/,
    );
  });
});
