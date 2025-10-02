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
import { parseEther, parseUnits, encodeFunctionData } from "viem";
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
			{
				feeToken: params.feeToken,
				feeAmount: params.feeAmount,
				feeTokenPermitData: signatureFeeToken.signature,
				feePermit2Data: ZERO_BYTES,
				nonce: gasLessSignature.nonce,
				deadline: gasLessSignature.deadline,
				signature: gasLessSignature.signature,
			},
		] as any;

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

	it("Should batch relay two signed transfer calls via multicall", async function () {
		const { diamond, operator, admin, user1, user2, mockToken, mockFeeToken, treasuryAddress } = await loadFixture(deployDiamond);

		// Whitelist transferFrom selector for mockToken
		await diamond.write.addWhitelistedSelector([mockToken.address, "0xa85e59e4"]);

		const amount1 = parseEther("1");
		const amount2 = parseEther("2");
		const fee1 = parseEther("0.001");
		const fee2 = parseEther("0.002");

		// Pre-approve tokens to simplify batch (no permit needed inside multicall)
		await mockToken.write.approve([diamond.address, amount1 + amount2], { account: admin.account });
		await mockFeeToken.write.approve([diamond.address, fee1 + fee2], { account: admin.account });

		const baseNonce = await diamond.read.nonces([admin.account.address]);

		const sig1 = await getGasLessSignatureForTransfer({
			diamond,
			sender: admin,
			token: mockToken.address,
			amount: amount1,
			recipient: user1.account.address,
			feeToken: mockFeeToken.address,
			feeAmount: fee1,
			nonce: baseNonce,
		});

		const sig2 = await getGasLessSignatureForTransfer({
			diamond,
			sender: admin,
			token: mockToken.address,
			amount: amount2,
			recipient: user2.account.address,
			feeToken: mockFeeToken.address,
			feeAmount: fee2,
			nonce: baseNonce + 1n,
		});

        const relayMeta1 = {
            feeToken: mockFeeToken.address,
            feeAmount: fee1,
            feeTokenPermitData: ZERO_BYTES,
            feePermit2Data: ZERO_BYTES,
            nonce: sig1.nonce,
            deadline: sig1.deadline,
            signature: sig1.signature,
        } as any;
        const call1 = encodeFunctionData({
            abi: diamond.abi,
			functionName: "relaySignedTransferCall",
			args: [
				admin.account.address,
				{ token: mockToken.address, amount: amount1, recipient: user1.account.address, tokenPermitData: ZERO_BYTES, permit2Data: ZERO_BYTES },
				relayMeta1,
			],
		});

        const relayMeta2 = {
            feeToken: mockFeeToken.address,
            feeAmount: fee2,
            feeTokenPermitData: ZERO_BYTES,
            feePermit2Data: ZERO_BYTES,
            nonce: sig2.nonce,
            deadline: sig2.deadline,
            signature: sig2.signature,
        } as any;
		const call2 = encodeFunctionData({
            abi: diamond.abi,
			functionName: "relaySignedTransferCall",
			args: [
				admin.account.address,
				{ token: mockToken.address, amount: amount2, recipient: user2.account.address, tokenPermitData: ZERO_BYTES, permit2Data: ZERO_BYTES },
				relayMeta2,
			],
		});

		const senderTokenBefore = await mockToken.read.balanceOf([admin.account.address]);
		const r1Before = await mockToken.read.balanceOf([user1.account.address]);
		const r2Before = await mockToken.read.balanceOf([user2.account.address]);
		const feeSenderBefore = await mockFeeToken.read.balanceOf([admin.account.address]);
		const feeTreasuryBefore = await mockFeeToken.read.balanceOf([treasuryAddress]);

		await diamond.write.multicall([[call1, call2]], { account: operator.account });

		const senderTokenAfter = await mockToken.read.balanceOf([admin.account.address]);
		const r1After = await mockToken.read.balanceOf([user1.account.address]);
		const r2After = await mockToken.read.balanceOf([user2.account.address]);
		const feeSenderAfter = await mockFeeToken.read.balanceOf([admin.account.address]);
		const feeTreasuryAfter = await mockFeeToken.read.balanceOf([treasuryAddress]);

		assert.equal(senderTokenAfter, senderTokenBefore - (amount1 + amount2));
		assert.equal(r1After, r1Before + amount1);
		assert.equal(r2After, r2Before + amount2);
		assert.equal(feeSenderAfter, feeSenderBefore - (fee1 + fee2));
		assert.equal(feeTreasuryAfter, feeTreasuryBefore + (fee1 + fee2));
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

        const relayMetaSwap = {
            feeToken: params.feeToken,
            feeAmount: params.feeAmount,
            feeTokenPermitData: signatureFeeToken.signature,
            feePermit2Data: ZERO_BYTES,
            nonce: gasLessSignature.nonce,
            deadline: gasLessSignature.deadline,
            signature: gasLessSignature.signature,
        } as any;

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
			relayMetaSwap,
		] as any;

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
		const { diamond, operator, admin, user1, mockFeeToken } = await loadFixture(deployDiamond);

		const amountToTrade = parseUnits("100", 6);
		const feeAmount = parseEther("0.001");

		// Use mocked swap tx data; do NOT whitelist selector/target
		const tx = mockTx;
		const target = tx.to as `0x${string}`;

		const paramsSwap: GasLessSignatureForSwapParams = {
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

		const gasLessSignature = await getGasLessSignatureForSwap(paramsSwap);
		const signatureFeeToken = await getSignatureERC20Permit(mockFeeToken, paramsSwap.feeAmount, admin, diamond.address);

		const relayMetaDenied = {
			feeToken: paramsSwap.feeToken,
			feeAmount: paramsSwap.feeAmount,
			feeTokenPermitData: signatureFeeToken.signature,
			feePermit2Data: ZERO_BYTES,
			nonce: gasLessSignature.nonce,
			deadline: gasLessSignature.deadline,
			signature: gasLessSignature.signature,
		} as any;

		const executeCallParams = [
			admin.account.address, // owner
			{
				target: paramsSwap.target,
				callData: paramsSwap.data,
				tokenIn: paramsSwap.tokenIn,
				amountIn: paramsSwap.amountIn,
				tokenOut: paramsSwap.tokenOut,
				amountOutMin: paramsSwap.amountOutMin,
				recipient: paramsSwap.recipient,
				tokenPermitData: ZERO_BYTES,
				permit2Data: ZERO_BYTES,
			},
			relayMetaDenied,
		] as any;

		await assert.rejects(
			diamond.write.relaySignedSwapCall(executeCallParams as any, {
				account: operator.account,
			}),
			/SelectorNotWhitelisted/
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

        const relayMetaHacker = {
            feeToken: params.feeToken,
            feeAmount: params.feeAmount,
            feeTokenPermitData: signatureFeeToken.signature,
            feePermit2Data: ZERO_BYTES,
            nonce: gasLessSignature.nonce,
            deadline: gasLessSignature.deadline,
            signature: gasLessSignature.signature,
        } as any;

		const executeCallParams = [
			admin.account.address, // owner
			{
				token: params.token,
				amount: params.amount,
				recipient: params.recipient,
				tokenPermitData: signatureTransferToken.signature,
				permit2Data: ZERO_BYTES,
			},
			relayMetaHacker,
		] as any;

		await assert.rejects(
			diamond.write.relaySignedTransferCall(executeCallParams as any, {
				account: operator.account,
			}),
			/NotAuthorized/
		);
	})
});
