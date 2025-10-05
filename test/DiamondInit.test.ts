import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadFixture, viem } from './utils/client.js';
import { ADMIN_ROLE, PERMIT2_ADDRESS, ZERO_ADDRESS } from './utils/constant.js';
import { deployDiamond } from './utils/deploy-diamond.js';

describe('DiamondInit', async function () {
  it('Should init the diamond with the correct admin and permit2', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);
    const hasAdminRole = await diamond.read.hasRole([ADMIN_ROLE, admin.account.address]);
    const permit2 = await diamond.read.getPermit2();
    const owner = await diamond.read.owner();

    assert.equal(permit2, PERMIT2_ADDRESS);
    assert.equal(hasAdminRole, true);
    assert.equal(owner.toLowerCase(), admin.account.address.toLowerCase());
  });

  it('Should prevent to init the diamond with the zero admin or permit2', async function () {
    const { admin } = await loadFixture(deployDiamond);

    const newDiamondInit = await viem.deployContract('DiamondInit');

    await assert.rejects(
      newDiamondInit.write.init([{ admin: ZERO_ADDRESS, permit2: PERMIT2_ADDRESS }]),
      /ZeroAddress/,
    );
    await assert.rejects(
      newDiamondInit.write.init([{ admin: admin.account.address, permit2: ZERO_ADDRESS }]),
      /ZeroAddress/,
    );
  });

  it('Should prevent to init the diamond after deployment', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);
    await assert.rejects(diamond.write.initialize([admin.account.address, PERMIT2_ADDRESS]));
  });
});
