import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseEther } from 'viem';

import { loadFixture, publicClient, viem } from '../utils/client.js';
import { PERMIT2_ADDRESS, ZERO_ADDRESS } from '../utils/constant.js';
import { deployDiamond } from '../utils/deploy-diamond.js';
import { getRandomAddress } from '../utils/helpers.js';

describe('AdminFacet', async function () {
  it('Should correctly pause and unpause the diamond', async function () {
    const { diamond } = await loadFixture(deployDiamond);

    await diamond.write.pause();
    const paused = await diamond.read.paused();
    assert.equal(paused, true);

    await diamond.write.unpause();
    const unpaused = await diamond.read.paused();
    assert.equal(unpaused, false);
  });

  it('Should correctly set the treasury address', async function () {
    const { diamond, treasuryAddress } = await loadFixture(deployDiamond);

    const oldTreasury = await diamond.read.getTreasury();
    assert.equal(oldTreasury.toLowerCase(), treasuryAddress.toLowerCase());

    const newTreasury = getRandomAddress();
    await diamond.write.setTreasury([newTreasury]);
    const treasury = await diamond.read.getTreasury();

    assert.equal(treasury, newTreasury);
  });

  it('Should correctly emergency withdraw ERC20 tokens', async function () {
    const { diamond, mockToken } = await loadFixture(deployDiamond);

    const newTreasury = getRandomAddress();
    await diamond.write.setTreasury([newTreasury]);

    const lostAmount = parseEther('1000');
    await mockToken.write.transfer([diamond.address, lostAmount]);

    const balanceOfDiamond = await mockToken.read.balanceOf([diamond.address]);
    assert.equal(balanceOfDiamond, lostAmount);

    await diamond.write.emergencyWithdrawErc20([[mockToken.address]]);
    const balanceOfTreasury = await mockToken.read.balanceOf([newTreasury]);
    const newBalanceOfDiamond = await mockToken.read.balanceOf([diamond.address]);
    assert.equal(balanceOfTreasury, lostAmount);
    assert.equal(newBalanceOfDiamond, 0n);
  });

  it('Should correctly emergency withdraw ETH', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    const newTreasury = getRandomAddress();
    await diamond.write.setTreasury([newTreasury]);

    const lostAmount = parseEther('100');
    await admin.sendTransaction({
      to: diamond.address,
      value: lostAmount,
    });

    const balanceOfDiamond = await publicClient.getBalance({ address: diamond.address });
    assert.equal(balanceOfDiamond, lostAmount);

    await diamond.write.emergencyWithdrawEth();
    const balanceOfTreasury = await publicClient.getBalance({ address: newTreasury });
    const newBalanceOfDiamond = await publicClient.getBalance({ address: diamond.address });
    assert.equal(balanceOfTreasury, lostAmount);
    assert.equal(newBalanceOfDiamond, 0n);
  });

  it('Should prevent to withdraw if the treasury is the zero address', async function () {
    const { admin, mockToken } = await loadFixture(deployDiamond);
    const newAdminFacet = await viem.deployContract('AdminFacet');

    await newAdminFacet.write.initialize([admin.account.address, PERMIT2_ADDRESS]);
    await assert.rejects(
      newAdminFacet.write.emergencyWithdrawErc20([[mockToken.address]]),
      /ZeroAddress/,
    );
    await assert.rejects(newAdminFacet.write.emergencyWithdrawEth(), /ZeroAddress/);
  });

  it('Should prevent withdraw zero address', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);
    await assert.rejects(diamond.write.emergencyWithdrawErc20([[ZERO_ADDRESS]]), /ZeroAddress/);
  });

  it('Should prevent set or initialize the treasury or permit2 address to the zero address', async function () {
    const { diamond, admin } = await loadFixture(deployDiamond);

    await assert.rejects(diamond.write.setTreasury([ZERO_ADDRESS]), /ZeroAddress/);

    const newAdminFacet = await viem.deployContract('AdminFacet');

    await assert.rejects(
      newAdminFacet.write.initialize([admin.account.address, ZERO_ADDRESS]),
      /ZeroAddress/,
    );
    await assert.rejects(
      newAdminFacet.write.initialize([ZERO_ADDRESS, PERMIT2_ADDRESS]),
      /ZeroAddress/,
    );
  });

  it('Should skip withdraw if the token or native token balance is zero', async function () {
    const { diamond, mockToken, treasuryAddress } = await loadFixture(deployDiamond);

    const previousBalanceTokenOfTreasury = await mockToken.read.balanceOf([treasuryAddress]);
    const previousBalanceEthOfTreasury = await publicClient.getBalance({
      address: treasuryAddress,
    });

    await diamond.write.emergencyWithdrawErc20([[mockToken.address]]);
    await diamond.write.emergencyWithdrawEth();
    const balanceTokenOfTreasury = await mockToken.read.balanceOf([treasuryAddress]);
    const balanceEthOfTreasury = await publicClient.getBalance({ address: treasuryAddress });

    assert.equal(balanceTokenOfTreasury, previousBalanceTokenOfTreasury);
    assert.equal(balanceEthOfTreasury, previousBalanceEthOfTreasury);
  });

  it('Should prevent if non admin calls the emergency withdraw functions or set the treasury', async function () {
    const { diamond, mockToken, user1 } = await loadFixture(deployDiamond);

    const randomAddress = getRandomAddress();

    await assert.rejects(
      diamond.write.emergencyWithdrawErc20([[mockToken.address]], {
        account: user1.account.address,
      }),
      /AccessControl/,
    );
    await assert.rejects(
      diamond.write.emergencyWithdrawEth({ account: user1.account.address }),
      /AccessControl/,
    );
    await assert.rejects(
      diamond.write.setTreasury([randomAddress], { account: user1.account.address }),
      /AccessControl/,
    );
  });
});
