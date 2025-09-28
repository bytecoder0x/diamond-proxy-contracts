import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { deployDiamond } from "../utils/deploy-diamond.js";
import { getRandomAddress, getSelector } from "../utils/helpers.js";
import {
	GasLessSignatureForSwapParams,
	GasLessSignatureParamsForTransfer,
	getGasLessSignatureForSwap,
	getGasLessSignatureForTransfer,
	getSignatureERC20Permit,
} from "../utils/signature-builder.js";
import { parseEther, parseUnits } from "viem";
import { PEPE_ADDRESS, USDC_ADDRESS, ZERO_BYTES } from "../utils/constant.js";
import { viem, loadFixture } from "../utils/client.js";
import { mockTx } from "../utils/trade-data-builder.js";

describe("ExecutionFacet", async function () {
	it("Should correctly execute a signed transfer call", async function () {
		const { diamond, operator, admin, user1, mockToken, mockFeeToken, treasuryAddress } = await loadFixture(deployDiamond);

		// Add whitelisted selector transferFrom
		await diamond.write.addWhitelistedSelector([mockToken.address, "0xa85e59e4"]);

		const amountToTransfer = parseEther("1");
		const feeAmount = parseEther("0.001");

		const params: GasLessSignatureParamsForTransfer = {
			diamond,
			sender: admin,
			token: mockToken.address,
			amount: amountToTransfer,
			recipient: user1.account.address,
			feeToken: mockFeeToken.address,
			feeAmount: feeAmount,
		};

		const gasLessSignature = await getGasLessSignatureForTransfer(params);
		const signatureTransferToken = await getSignatureERC20Permit(mockToken, params.amount, admin, diamond.address);
		const signatureFeeToken = await getSignatureERC20Permit(mockFeeToken, params.feeAmount, admin, diamond.address);

		const executeCallParams = [
			admin.account.address, // owner
			{
				token: params.token,
				amount: params.amount,
				recipient: params.recipient,
				tokenPermitData: signatureTransferToken.signature,
				permit2Data: ZERO_BYTES,
			},
			params.feeToken, // feeToken
			params.feeAmount, // feeAmount
			signatureFeeToken.signature, // feeTokenPermitData
			ZERO_BYTES, // feePermit2Data
			gasLessSignature.nonce, // nonce
			gasLessSignature.deadline, // deadline
			gasLessSignature.signature, // signature
		];

		const tokenBalanceSenderBefore = await mockToken.read.balanceOf([admin.account.address]);
		const tokenBalanceRecipientBefore = await mockToken.read.balanceOf([user1.account.address]);
		const feeTokenBalanceSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
		const feeTokenBalanceTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);

		await diamond.write.relaySignedTransferCall(executeCallParams as any, { account: operator.account });

		const tokenBalanceSenderAfter = await mockToken.read.balanceOf([admin.account.address]);
		const tokenBalanceRecipientAfter = await mockToken.read.balanceOf([user1.account.address]);
		const feeTokenBalanceSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
		const feeTokenBalanceTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);

		assert.equal(tokenBalanceSenderAfter, tokenBalanceSenderBefore - amountToTransfer);
		assert.equal(tokenBalanceRecipientAfter, tokenBalanceRecipientBefore + amountToTransfer);
		assert.equal(feeTokenBalanceSenderAfter, feeTokenBalanceSenderBefore - feeAmount);
		assert.equal(feeTokenBalanceTreasuryAfter, feeTokenBalanceTreasuryBefore + feeAmount);
	});

	it("Should correctly execute a signed swap call", async function () {
		const { diamond, operator, admin, user1, mockToken, mockFeeToken, treasuryAddress } = await loadFixture(deployDiamond);
		const amountToTrade = parseUnits("100", 6);
		const feeAmount = parseEther("0.001");

		// const tx = await getTradeData(
		// 	USDC_ADDRESS,
		// 	PEPE_MAINNET_ADDRESS,
		// 	amountToTrade,
		// 	diamond.address,
		// 	operator.account.address,
		// 	user1.account.address
		// );

		const tx = mockTx;
		const selector = getSelector(tx.data as `0x${string}`);
		const target = tx.to as `0x${string}`;

		await diamond.write.addWhitelistedSelector([target, selector]);

		const pepeContract = await viem.getContractAt("MockToken", PEPE_ADDRESS);
		const usdcContract = await viem.getContractAt("MockToken", USDC_ADDRESS);
        await usdcContract.write.approve([diamond.address, amountToTrade], { account: admin.account });

		const params: GasLessSignatureForSwapParams = {
			diamond,
			sender: admin,
			target,
			tokenIn: USDC_ADDRESS,
			tokenOut: PEPE_ADDRESS,
			amountIn: amountToTrade,
			amountOutMin: amountToTrade,
			recipient: user1.account.address,
			feeToken: mockFeeToken.address,
			feeAmount: feeAmount,
			data: tx.data as `0x${string}`,
		};
		
		const gasLessSignature = await getGasLessSignatureForSwap(params);
		const signatureFeeToken = await getSignatureERC20Permit(mockFeeToken, params.feeAmount, admin, diamond.address);

		const executeCallParams = [
			admin.account.address, // owner
			{
				target: params.target,
				callData: params.data,
				tokenIn: params.tokenIn,
				amountIn: params.amountIn,
				tokenOut: params.tokenOut,
				amountOutMin: params.amountOutMin,
				recipient: params.recipient,
				tokenPermitData: ZERO_BYTES,
				permit2Data: ZERO_BYTES,
			},
			params.feeToken, // feeToken
			params.feeAmount, // feeAmount
			signatureFeeToken.signature, // feeTokenPermitData
			ZERO_BYTES, // feePermit2Data
			gasLessSignature.nonce, // nonce
			gasLessSignature.deadline, // deadline
			gasLessSignature.signature, // signature
		];

		const usdcBalanceSenderBefore = await usdcContract.read.balanceOf([admin.account.address]);
		const pepeBalanceRecipientBefore = await pepeContract.read.balanceOf([user1.account.address]);
		const feeTokenBalanceSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
		const feeTokenBalanceTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);

		await diamond.write.relaySignedSwapCall(executeCallParams as any, { account: operator.account });

		const usdcBalanceSenderAfter = await usdcContract.read.balanceOf([admin.account.address]);
		const pepeBalanceRecipientAfter = await pepeContract.read.balanceOf([user1.account.address]);
		const feeTokenBalanceSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
		const feeTokenBalanceTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);

		assert.equal(usdcBalanceSenderAfter, usdcBalanceSenderBefore - amountToTrade);
		assert.ok(pepeBalanceRecipientAfter > pepeBalanceRecipientBefore);
		assert.equal(feeTokenBalanceSenderAfter, feeTokenBalanceSenderBefore - feeAmount);
		assert.equal(feeTokenBalanceTreasuryAfter, feeTokenBalanceTreasuryBefore + feeAmount);
	});

	it("Should prevent execution of a call with non-whitelisted target or selector", async function () {
		const { diamond, operator, admin, user1, mockToken, mockFeeToken, treasuryAddress } = await loadFixture(deployDiamond);

		const amountToTransfer = parseEther("1");
		const feeAmount = parseEther("0.001");

		const params: GasLessSignatureParamsForTransfer = {
			diamond,
			sender: admin,
			token: mockToken.address,
			amount: amountToTransfer,
			recipient: user1.account.address,
			feeToken: mockFeeToken.address,
			feeAmount: feeAmount,
		};

		const gasLessSignature = await getGasLessSignatureForTransfer(params);
		const signatureTransferToken = await getSignatureERC20Permit(mockToken, params.amount, admin, diamond.address);
		const signatureFeeToken = await getSignatureERC20Permit(mockFeeToken, params.feeAmount, admin, diamond.address);

		const executeCallParams = [
			admin.account.address, // owner
			{
				token: params.token,
				amount: params.amount,
				recipient: params.recipient,
				tokenPermitData: signatureTransferToken.signature,
				permit2Data: ZERO_BYTES,
			},
			params.feeToken, // feeToken
			params.feeAmount, // feeAmount
			signatureFeeToken.signature, // feeTokenPermitData
			ZERO_BYTES, // feePermit2Data
			gasLessSignature.nonce, // nonce
			gasLessSignature.deadline, // deadline
			gasLessSignature.signature, // signature
		];

		await assert.rejects(
			diamond.write.relaySignedTransferCall(executeCallParams as any, {
				account: operator.account,
			}),
			/TargetNotWhitelisted/
		);
	});

	it("Should prevent execution if the signature is not from the owner", async function () {
		const { diamond, operator, admin, user1, user2: hacker, mockToken, mockFeeToken, treasuryAddress } = await loadFixture(deployDiamond);

		const amountToTransfer = parseEther("1");
		const feeAmount = parseEther("0.001");

		const params: GasLessSignatureParamsForTransfer = {
			diamond,
			sender: hacker, // someone else sign the call
			token: mockToken.address,
			amount: amountToTransfer,
			recipient: user1.account.address,
			feeToken: mockFeeToken.address,
			feeAmount: feeAmount,
		};

		const gasLessSignature = await getGasLessSignatureForTransfer(params);
		const signatureTransferToken = await getSignatureERC20Permit(mockToken, params.amount, admin, diamond.address);
		const signatureFeeToken = await getSignatureERC20Permit(mockFeeToken, params.feeAmount, admin, diamond.address);

		const executeCallParams = [
			admin.account.address, // owner
			{
				token: params.token,
				amount: params.amount,
				recipient: params.recipient,
				tokenPermitData: signatureTransferToken.signature,
				permit2Data: ZERO_BYTES,
			},
			params.feeToken, // feeToken
			params.feeAmount, // feeAmount
			signatureFeeToken.signature, // feeTokenPermitData
			ZERO_BYTES, // feePermit2Data
			gasLessSignature.nonce, // nonce
			gasLessSignature.deadline, // deadline
			gasLessSignature.signature, // signature
		];

		await assert.rejects(
			diamond.write.relaySignedTransferCall(executeCallParams as any, {
				account: operator.account,
			}),
			/NotAuthorized/
		);
	})
});
