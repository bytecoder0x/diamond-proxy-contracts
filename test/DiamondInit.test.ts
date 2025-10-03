import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ADMIN_ROLE, PERMIT2_ADDRESS } from './utils/constant.js';
import { deployDiamond } from './utils/deploy-diamond.js';
import { loadFixture } from './utils/client.js';

describe('DiamondInit', async function () {
  it('Should init the diamond with the correct admin and permit2', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);
    const hasAdminRole = await diamond.read.hasRole([ADMIN_ROLE, admin.account.address]);
    const permit2 = await diamond.read.getPermit2();

    assert.equal(permit2, PERMIT2_ADDRESS);
    assert.equal(hasAdminRole, true);
  });

  it('Should prevent to init the diamond after deployment', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);
    await assert.rejects(diamond.write.initialize([admin.account.address, PERMIT2_ADDRESS]));
  });
});
