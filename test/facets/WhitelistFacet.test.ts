import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadFixture } from '../utils/client.js';
import { ZERO_ADDRESS } from '../utils/constant.js';
import { deployDiamond } from '../utils/deploy-diamond.js';
import { getRandomAddress } from '../utils/helpers.js';

describe('WhitelistFacet', async function () {
  const randomAddress = getRandomAddress();
  const randomAddress2 = getRandomAddress();
  const randomSelector1 = '0x12345678';
  const randomSelector2 = '0x87654321';
  const zeroSelector = '0x00000000';

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

  it('Should revert on array length mismatch for batch removal or addition', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    await diamond.write.addWhitelistedSelectorsBatch([
      [randomAddress, randomAddress2],
      [randomSelector1, randomSelector2],
    ]);

    await assert.rejects(
      diamond.write.addWhitelistedSelectorsBatch([
        [randomAddress],
        [randomSelector1, randomSelector2],
      ]),
      /ArrayLengthMismatch/,
    );

    await assert.rejects(
      diamond.write.removeWhitelistedSelectorsBatch([
        [randomAddress],
        [randomSelector1, randomSelector2],
      ]),
      /ArrayLengthMismatch/,
    );
  });

  it('Should revert on zero address or invalid selector for batch removal or addition', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    await assert.rejects(
      diamond.write.addWhitelistedSelectorsBatch([
        [randomAddress, ZERO_ADDRESS],
        [randomSelector2, randomSelector2],
      ]),
      /ZeroAddress/,
    );

    await assert.rejects(
      diamond.write.addWhitelistedSelectorsBatch([
        [randomAddress, randomAddress2],
        [randomSelector1, zeroSelector],
      ]),
      /InvalidSelector/,
    );

    await assert.rejects(
      diamond.write.addWhitelistedSelector([ZERO_ADDRESS, randomSelector1]),
      /ZeroAddress/,
    );

    await assert.rejects(
      diamond.write.addWhitelistedSelector([randomAddress, zeroSelector]),
      /InvalidSelector/,
    );

    await assert.rejects(
      diamond.write.removeWhitelistedSelectorsBatch([[ZERO_ADDRESS], [randomSelector1]]),
      /ZeroAddress/,
    );

    await assert.rejects(
      diamond.write.removeWhitelistedSelectorsBatch([[randomAddress], [zeroSelector]]),
      /InvalidSelector/,
    );
  });
});
