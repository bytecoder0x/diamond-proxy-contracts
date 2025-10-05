import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseEther, parseUnits } from 'viem';

import { viem, loadFixture } from '../utils/client.js';
import { PEPE_ADDRESS, PERMIT2_ADDRESS, USDC_ADDRESS, ZERO_ADDRESS, ZERO_BYTES } from '../utils/constant.js';
import { deployDiamond } from '../utils/deploy-diamond.js';
import {
  createTransferSignatures,
  createSwapSignatures,
  buildTransferCallParams,
  buildSwapCallParams,
  createMulticallTransferCalls,
  TestTransferParams,
  TestSwapParams,
  mockTransferCallParams,
  mockSwapCallParams,
} from '../utils/execution-test-helpers.js';
import { getCurrentBlockTimestamp, getRandomAddress, getSelector } from '../utils/helpers.js';
import { getSignatureERC20Permit } from '../utils/signature-builder.js';
import { invalidMockData, mockTx } from '../utils/trade-data-builder.js';

describe('ExecutionFacet', async function () {
  it('Should correctly execute a signed transfer call', async function () {
      const { diamond, operator, admin, user1, mockToken, mockFeeToken, treasuryAddress } =
        await loadFixture(deployDiamond);
  
      const amountToTransfer = parseEther('1');
      const feeAmount = parseEther('0.001');
  
      const params: TestTransferParams = {
        diamond,
        sender: admin,
        tokenAddress: mockToken.address,
        amount: amountToTransfer,
        recipientAddress: user1.account.address,
        feeTokenAddress: mockFeeToken.address,
        feeAmount: feeAmount,
        withTokenPermit: true,
        withFeeTokenPermit: true,
      };
  
      const signatures = await createTransferSignatures(params);
      const callParams = buildTransferCallParams(
        admin.account.address,
        params.tokenAddress,
        params.amount,
        params.recipientAddress,
        signatures.tokenPermitSignature,
        signatures.feeTokenPermitSignature,
        signatures.gasLessSignature,
        params.feeTokenAddress,
        params.feeAmount,
      );
  
      const tokenBalanceSenderBefore = await mockToken.read.balanceOf([admin.account.address]);
      const tokenBalanceRecipientBefore = await mockToken.read.balanceOf([user1.account.address]);
      const feeTokenBalanceSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
      const feeTokenBalanceTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);
  
      await diamond.write.relaySignedTransferCall(callParams as any, {
        account: operator.account,
      });
  
      const tokenBalanceSenderAfter = await mockToken.read.balanceOf([admin.account.address]);
      const tokenBalanceRecipientAfter = await mockToken.read.balanceOf([user1.account.address]);
      const feeTokenBalanceSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
      const feeTokenBalanceTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);
  
      assert.equal(tokenBalanceSenderAfter, tokenBalanceSenderBefore - amountToTransfer);
      assert.equal(tokenBalanceRecipientAfter, tokenBalanceRecipientBefore + amountToTransfer);
      assert.equal(feeTokenBalanceSenderAfter, feeTokenBalanceSenderBefore - feeAmount);
      assert.equal(feeTokenBalanceTreasuryAfter, feeTokenBalanceTreasuryBefore + feeAmount);
    });

    it('Should correctly execute a signed call with zero fee', async function () {
      const { diamond, operator, admin, user1, mockToken, mockFeeToken, treasuryAddress } =
        await loadFixture(deployDiamond);
  
      const amountToTransfer = parseEther('1');
      const feeAmount = parseEther('0');
  
      const params: TestTransferParams = {
        diamond,
        sender: admin,
        tokenAddress: mockToken.address,
        amount: amountToTransfer,
        recipientAddress: user1.account.address,
        feeTokenAddress: mockFeeToken.address,
        feeAmount: feeAmount,
        withTokenPermit: true,
        withFeeTokenPermit: true,
      };
  
      const signatures = await createTransferSignatures(params);
      const callParams = buildTransferCallParams(
        admin.account.address,
        params.tokenAddress,
        params.amount,
        params.recipientAddress,
        signatures.tokenPermitSignature,
        signatures.feeTokenPermitSignature,
        signatures.gasLessSignature,
        params.feeTokenAddress,
        params.feeAmount,
      );
  
      const tokenBalanceSenderBefore = await mockToken.read.balanceOf([admin.account.address]);
      const tokenBalanceRecipientBefore = await mockToken.read.balanceOf([user1.account.address]);
      const feeTokenBalanceSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
      const feeTokenBalanceTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);
  
      await diamond.write.relaySignedTransferCall(callParams as any, {
        account: operator.account,
      });
  
      const tokenBalanceSenderAfter = await mockToken.read.balanceOf([admin.account.address]);
      const tokenBalanceRecipientAfter = await mockToken.read.balanceOf([user1.account.address]);
      const feeTokenBalanceSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
      const feeTokenBalanceTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);
  
      assert.equal(tokenBalanceSenderAfter, tokenBalanceSenderBefore - amountToTransfer);
      assert.equal(tokenBalanceRecipientAfter, tokenBalanceRecipientBefore + amountToTransfer);
      assert.equal(feeTokenBalanceSenderAfter, feeTokenBalanceSenderBefore);
      assert.equal(feeTokenBalanceTreasuryAfter, feeTokenBalanceTreasuryBefore);
    });

    it('Should correctly execute a signed transfer call with one permit for fee token and transfer token', async function () {
      const { diamond, operator, admin, user1, mockToken, mockFeeToken, treasuryAddress } =
        await loadFixture(deployDiamond);
  
      const amountToTransfer = parseEther('1');
      const feeAmount = parseEther('0.001');
  
      const params: TestTransferParams = {
        diamond,
        sender: admin,
        tokenAddress: mockToken.address,
        amount: amountToTransfer,
        recipientAddress: user1.account.address,
        feeTokenAddress: mockToken.address,
        feeAmount: feeAmount,
        withTokenPermit: false,
        withFeeTokenPermit: false,
      };
  
      const signatures = await createTransferSignatures(params);
      signatures.feeTokenPermitSignature = await getSignatureERC20Permit(
        mockToken,
        amountToTransfer + feeAmount,
        params.sender,
        params.diamond.address,
      );
      const callParams = buildTransferCallParams(
        admin.account.address,
        params.tokenAddress,
        amountToTransfer,
        params.recipientAddress,
        signatures.tokenPermitSignature,
        signatures.feeTokenPermitSignature,
        signatures.gasLessSignature,
        params.feeTokenAddress,
        params.feeAmount,
      );
  
      const tokenBalanceSenderBefore = await mockToken.read.balanceOf([admin.account.address]);
      const tokenBalanceRecipientBefore = await mockToken.read.balanceOf([user1.account.address]);
      const feeTokenBalanceTreasuryBefore = await mockToken.read.balanceOf([treasuryAddress]);
  
      await diamond.write.relaySignedTransferCall(callParams as any, {
        account: operator.account,
      });
  
      const tokenBalanceSenderAfter = await mockToken.read.balanceOf([admin.account.address]);
      const tokenBalanceRecipientAfter = await mockToken.read.balanceOf([user1.account.address]);
      const feeTokenBalanceTreasuryAfter = await mockToken.read.balanceOf([treasuryAddress]);
  
      assert.equal(tokenBalanceSenderAfter, tokenBalanceSenderBefore - amountToTransfer - feeAmount);
      assert.equal(tokenBalanceRecipientAfter, tokenBalanceRecipientBefore + amountToTransfer);
      assert.equal(feeTokenBalanceTreasuryAfter, feeTokenBalanceTreasuryBefore + feeAmount);
    });

    it('Should batch relay two signed transfer calls via multicall', async function () {
      const { diamond, operator, admin, user1, user2, mockToken, mockFeeToken, treasuryAddress } =
        await loadFixture(deployDiamond);

      const amounts = [parseEther('1'), parseEther('2')];
      const fees = [parseEther('0.001'), parseEther('0.002')];
      const recipients = [user1, user2];

      // Pre-approve tokens to simplify batch (no permit needed inside multicall)
      await mockToken.write.approve([diamond.address, amounts[0] + amounts[1]], {
        account: admin.account,
      });
      await mockFeeToken.write.approve([diamond.address, fees[0] + fees[1]], {
        account: admin.account,
      });

      const calls = await createMulticallTransferCalls(
        diamond,
        admin,
        recipients,
        amounts,
        fees,
        mockToken,
        mockFeeToken,
      );

      const senderTokenBefore = await mockToken.read.balanceOf([admin.account.address]);
      const r1Before = await mockToken.read.balanceOf([user1.account.address]);
      const r2Before = await mockToken.read.balanceOf([user2.account.address]);
      const feeSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
      const feeTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);

      await diamond.write.multicall([[calls[0] as `0x${string}`, calls[1] as `0x${string}`]], {
        account: operator.account,
      });

      const senderTokenAfter = await mockToken.read.balanceOf([admin.account.address]);
      const r1After = await mockToken.read.balanceOf([user1.account.address]);
      const r2After = await mockToken.read.balanceOf([user2.account.address]);
      const feeSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
      const feeTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);

      const totalAmount = amounts[0] + amounts[1];
      const totalFees = fees[0] + fees[1];

    assert.equal(senderTokenAfter, senderTokenBefore - totalAmount);
    assert.equal(r1After, r1Before + amounts[0]);
    assert.equal(r2After, r2Before + amounts[1]);
    assert.equal(feeSenderAfter, feeSenderBefore - totalFees);
    assert.equal(feeTreasuryAfter, feeTreasuryBefore + totalFees);
  });

  it('Should correctly execute a signed swap call', async function () {
    const { diamond, operator, admin, user1, mockFeeToken, treasuryAddress } =
      await loadFixture(deployDiamond);

    const amountToTrade = parseUnits('100', 6);
    const feeAmount = parseEther('0.001');

    const tx = mockTx;
    const selector = getSelector(tx.data as `0x${string}`);
    const target = tx.to as `0x${string}`;

    await diamond.write.addWhitelistedSelector([target, selector]);

    const pepeContract = await viem.getContractAt('MockToken', PEPE_ADDRESS);
    const usdcContract = await viem.getContractAt('MockToken', USDC_ADDRESS);
    await usdcContract.write.approve([diamond.address, amountToTrade], { account: admin.account });

    const testParams: TestSwapParams = {
      diamond,
      sender: admin,
      recipientAddress: user1.account.address,
      tokenIn: USDC_ADDRESS,
      tokenOut: PEPE_ADDRESS,
      feeTokenAddress: mockFeeToken.address,
      amountIn: amountToTrade,
      amountOutMin: 0n,
      feeAmount: feeAmount,
      tx,
      target,
      withTokenPermit: false,
      withFeeTokenPermit: true,
    };

    const signatures = await createSwapSignatures(testParams);
    const callParams = buildSwapCallParams(
      admin.account.address,
      target,
      tx.data as `0x${string}`,
      USDC_ADDRESS,
      amountToTrade,
      0n,
      PEPE_ADDRESS,
      user1.account.address,
      signatures.gasLessSignature,
      mockFeeToken.address,
      feeAmount,
      signatures.feeTokenPermitSignature,
    );

    const usdcBalanceSenderBefore = await usdcContract.read.balanceOf([admin.account.address]);
    const pepeBalanceRecipientBefore = await pepeContract.read.balanceOf([user1.account.address]);
    const feeTokenBalanceSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
    const feeTokenBalanceTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);

    await diamond.write.relaySignedSwapCall(callParams as any, {
      account: operator.account,
    });

    const usdcBalanceSenderAfter = await usdcContract.read.balanceOf([admin.account.address]);
    const pepeBalanceRecipientAfter = await pepeContract.read.balanceOf([user1.account.address]);
    const feeTokenBalanceSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
    const feeTokenBalanceTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);

    assert.equal(usdcBalanceSenderAfter, usdcBalanceSenderBefore - amountToTrade);
    assert.ok(pepeBalanceRecipientAfter > pepeBalanceRecipientBefore);
    assert.equal(feeTokenBalanceSenderAfter, feeTokenBalanceSenderBefore - feeAmount);
    assert.equal(feeTokenBalanceTreasuryAfter, feeTokenBalanceTreasuryBefore + feeAmount);
  });

  it('Should correctly charge fee from user if swap failed', async function () {
    const { diamond, operator, admin, user1, mockFeeToken, treasuryAddress } =
      await loadFixture(deployDiamond);

    const amountToTrade = parseUnits('100', 6);
    const feeAmount = parseEther('0.001');

    const tx = mockTx;
    const selector = getSelector(tx.data as `0x${string}`);
    const target = tx.to as `0x${string}`;

    await diamond.write.addWhitelistedSelector([target, selector]);

    const pepeContract = await viem.getContractAt('MockToken', PEPE_ADDRESS);
    const usdcContract = await viem.getContractAt('MockToken', USDC_ADDRESS);
    await usdcContract.write.approve([diamond.address, amountToTrade], { account: admin.account });

    const invalidTx = {
      ...mockTx,
      data: invalidMockData,
    };
    const testParams: TestSwapParams = {
      diamond,
      sender: admin,
      recipientAddress: user1.account.address,
      tokenIn: USDC_ADDRESS,
      tokenOut: PEPE_ADDRESS,
      feeTokenAddress: mockFeeToken.address,
      amountIn: amountToTrade,
      amountOutMin: 0n,
      feeAmount: feeAmount,
      tx: invalidTx,
      target,
      withTokenPermit: false,
      withFeeTokenPermit: true,
    };

    const signatures = await createSwapSignatures(testParams);
    const callParams = buildSwapCallParams(
      admin.account.address,
      target,
      invalidTx.data as `0x${string}`,
      USDC_ADDRESS,
      amountToTrade,
      0n,
      PEPE_ADDRESS,
      user1.account.address,
      signatures.gasLessSignature,
      mockFeeToken.address,
      feeAmount,
      signatures.feeTokenPermitSignature,
    );

    const usdcBalanceSenderBefore = await usdcContract.read.balanceOf([admin.account.address]);
    const pepeBalanceRecipientBefore = await pepeContract.read.balanceOf([user1.account.address]);
    const feeTokenBalanceSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
    const feeTokenBalanceTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);

    await diamond.write.relaySignedSwapCall(callParams as any, {
      account: operator.account,
    });

    const usdcBalanceSenderAfter = await usdcContract.read.balanceOf([admin.account.address]);
    const pepeBalanceRecipientAfter = await pepeContract.read.balanceOf([user1.account.address]);
    const feeTokenBalanceSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
    const feeTokenBalanceTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);

    assert.equal(usdcBalanceSenderAfter, usdcBalanceSenderBefore);
    assert.equal(pepeBalanceRecipientAfter, pepeBalanceRecipientBefore);
    assert.equal(feeTokenBalanceSenderAfter, feeTokenBalanceSenderBefore - feeAmount);
    assert.equal(feeTokenBalanceTreasuryAfter, feeTokenBalanceTreasuryBefore + feeAmount);
  });

  it('Should prevent execution of a call with non-whitelisted target or selector', async function () {
    const { diamond, operator, admin, user1, mockFeeToken } = await loadFixture(deployDiamond);
    const amountToTrade = parseUnits('100', 6);
    const feeAmount = parseEther('0.001');

    const tx = mockTx;
    const target = tx.to as `0x${string}`;

    const testParams: TestSwapParams = {
      diamond,
      sender: admin,
      recipientAddress: user1.account.address,
      tokenIn: USDC_ADDRESS,
      tokenOut: PEPE_ADDRESS,
      feeTokenAddress: mockFeeToken.address,
      amountIn: amountToTrade,
      amountOutMin: 0n,
      feeAmount: feeAmount,
      tx,
      target,
      withTokenPermit: false,
      withFeeTokenPermit: true,
    };

    const signatures = await createSwapSignatures(testParams);
    const callParams = buildSwapCallParams(
      admin.account.address,
      target,
      tx.data as `0x${string}`,
      USDC_ADDRESS,
      amountToTrade,
      0n,
      PEPE_ADDRESS,
      user1.account.address,
      signatures.gasLessSignature,
      mockFeeToken.address,
      feeAmount,
      signatures.feeTokenPermitSignature,
    );
    await assert.rejects(
      diamond.write.relaySignedSwapCall(callParams as any, {
        account: operator.account,
      }),
      /SelectorNotWhitelisted/,
    );
  });

  it('Should prevent execution if the signature is not from the owner', async function () {
    const {
      diamond,
      operator,
      admin,
      user1,
      user2: hacker,
      mockToken,
      mockFeeToken,
    } = await loadFixture(deployDiamond);

    const amount = parseEther('1');
    const feeAmount = parseEther('0.001');

    // Add whitelisted selector transferFrom
    await diamond.write.addWhitelistedSelector([mockToken.address, '0xa85e59e4']);

    const testParams: TestTransferParams = {
      diamond,
      sender: hacker, // hacker signs instead of admin
      recipientAddress: user1.account.address,
      tokenAddress: mockToken.address,
      feeTokenAddress: mockFeeToken.address,
      amount: amount,
      feeAmount: feeAmount,
      withTokenPermit: true,
      withFeeTokenPermit: true,
    };

    const signatures = await createTransferSignatures(testParams);
    const callParams = buildTransferCallParams(
      admin.account.address, // pass other account as owner
      testParams.tokenAddress,
      amount,
      user1.account.address,
      signatures.tokenPermitSignature,
      signatures.feeTokenPermitSignature,
      signatures.gasLessSignature,
      testParams.feeTokenAddress,
      testParams.feeAmount,
    );

    await assert.rejects(
      diamond.write.relaySignedTransferCall(callParams as any, {
        account: operator.account,
      }),
      /NotAuthorized/,
    );
  });

  it('Should prevent call if token is zero address', async function () {
    const { diamond, operator, admin, user1, mockToken, mockFeeToken, treasuryAddress } =
      await loadFixture(deployDiamond);

    const amount = parseEther('1');
    const feeAmount = parseEther('0.001');

    const params: TestTransferParams = {
      diamond,
      sender: admin,
      tokenAddress: ZERO_ADDRESS,
      amount,
      recipientAddress: user1.account.address,
      feeTokenAddress: mockFeeToken.address,
      feeAmount,
      withTokenPermit: false,
      withFeeTokenPermit: false,
    };

    const signatures = await createTransferSignatures(params);
    const callParams = buildTransferCallParams(
      admin.account.address,
      params.tokenAddress,
      params.amount,
      params.recipientAddress,
      signatures.tokenPermitSignature,
      signatures.feeTokenPermitSignature,
      signatures.gasLessSignature,
      params.feeTokenAddress,
      params.feeAmount,
    );

    await assert.rejects(diamond.write.relaySignedTransferCall(callParams as any, {
      account: operator.account,
    }), /ZeroAddress/);
  });

  it('Should prevent call if fee token is zero address', async function () {
    const { diamond, operator, admin, user1, mockToken } =
      await loadFixture(deployDiamond);

    const amount = parseEther('1');
    const feeAmount = parseEther('0.001');

    const params: TestTransferParams = {
      diamond,
      sender: admin,
      tokenAddress: mockToken.address,
      amount,
      recipientAddress: user1.account.address,
      feeTokenAddress: ZERO_ADDRESS,
      feeAmount,
      withTokenPermit: false,
      withFeeTokenPermit: false,
    };

    const signatures = await createTransferSignatures(params);
    const callParams = buildTransferCallParams(
      admin.account.address,
      params.tokenAddress,
      params.amount,
      params.recipientAddress,
      signatures.tokenPermitSignature,
      signatures.feeTokenPermitSignature,
      signatures.gasLessSignature,
      params.feeTokenAddress,
      params.feeAmount,
    );

    await assert.rejects(diamond.write.relaySignedTransferCall(callParams as any, {
      account: operator.account,
    }), /ZeroAddress/);
  });

  it('Should prevent call swap with zero token in or target', async function () {
    const { diamond, operator, admin } =
      await loadFixture(deployDiamond);

    await assert.rejects(diamond.write.relaySignedSwapCall(mockSwapCallParams, {
      account: operator.account,
    }), /ZeroAddress/);

    const copyOfMockSwapCallParams = [...mockSwapCallParams] as any;
    copyOfMockSwapCallParams[1].target = getRandomAddress();
    await assert.rejects(diamond.write.relaySignedSwapCall(copyOfMockSwapCallParams, {
      account: operator.account,
    }), /ZeroAddress/);
  });

  it('Should prevent call swap with invalid selector', async function () {
    const { diamond, operator, admin } =
      await loadFixture(deployDiamond);

    const copyOfMockSwapCallParams = [...mockSwapCallParams] as any;
    copyOfMockSwapCallParams[1].target = getRandomAddress();
    copyOfMockSwapCallParams[1].tokenIn = getRandomAddress();

    // calldata is zero bytes what means invalid selector
    await assert.rejects(diamond.write.relaySignedSwapCall(copyOfMockSwapCallParams, {
      account: operator.account,
    }), /InvalidSelector/);
  });

  it('Should prevent call if owner is zero address', async function () {
    const { diamond, operator } =
      await loadFixture(deployDiamond);

      // in mockTransferCallParams, owner already set to ZERO_ADDRESS
      await assert.rejects(diamond.write.relaySignedTransferCall(mockTransferCallParams, {
        account: operator.account,
      }), /ZeroAddress/);
  });

  it('Should prevent call if deadline is in the past', async function () {
    const { diamond, operator, admin } =
      await loadFixture(deployDiamond);

      const copyOfMockTransferCallParams = [...mockTransferCallParams] as any;
      copyOfMockTransferCallParams[0] = admin.account.address;

      // in mockTransferCallParams, deadline already set to 0
      await assert.rejects(diamond.write.relaySignedTransferCall(copyOfMockTransferCallParams, {
        account: operator.account,
      }), /CallFailed/);
  });

  it('Should prevent call if nonce is not correct', async function () {
    const { diamond, operator, admin } =
      await loadFixture(deployDiamond);

      const copyOfMockTransferCallParams = [...mockTransferCallParams] as any;
      copyOfMockTransferCallParams[0] = admin.account.address;
      copyOfMockTransferCallParams[2].deadline = BigInt(await getCurrentBlockTimestamp() + 1000);
      copyOfMockTransferCallParams[2].nonce = 1; // wrong nonce (should be 0)

      await assert.rejects(diamond.write.relaySignedTransferCall(copyOfMockTransferCallParams, {
        account: operator.account,
      }), /CallFailed/);
  });

  it('Should prevent call swap or transfer if contract is paused', async function () {
    const { diamond, operator, admin } =
      await loadFixture(deployDiamond);

    const PAUSED_ERROR_SELECTOR = /0x9e87fac8/;

    await diamond.write.pause();

    await assert.rejects(diamond.write.relaySignedTransferCall(mockTransferCallParams, {
      account: operator.account,
    }), PAUSED_ERROR_SELECTOR);

    await assert.rejects(diamond.write.relaySignedSwapCall(mockSwapCallParams, {
      account: operator.account,
    }), PAUSED_ERROR_SELECTOR);
  });

  it('Should prevent call swap or transfer if operator has no role', async function () {
    const { diamond, operator, admin, user1 } =
      await loadFixture(deployDiamond);

    const NOT_AUTHORIZED_ERROR_SELECTOR = /0xea8e4eb5/;
      
    await assert.rejects(diamond.write.relaySignedTransferCall(mockTransferCallParams, {
      account: user1.account,
    }), NOT_AUTHORIZED_ERROR_SELECTOR);

    await assert.rejects(diamond.write.relaySignedSwapCall(mockSwapCallParams, {
      account: user1.account,
    }), NOT_AUTHORIZED_ERROR_SELECTOR);
  });

  it('Should prevent initialize again', async function () {
    const { diamond, operator, admin, user1 } =
      await loadFixture(deployDiamond);

    await assert.rejects(diamond.write.initializeExecutionRelay({
      account: user1.account,
    }), /InvalidInitialization/);
  });
});
