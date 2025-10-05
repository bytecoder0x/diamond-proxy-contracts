import { encodeFunctionData, parseEther } from 'viem';
import { Address, WalletClient } from 'viem';

import { viem } from './client.js';
import { ZERO_ADDRESS, ZERO_BYTES } from './constant.js';
import {
  GasLessSignatureForSwapParams,
  getGasLessSignatureForSwap,
  getGasLessSignatureForTransfer,
  getSignatureERC20Permit,
} from './signature-builder.js';

// Types for simplifying tests
export interface TestTransferParams {
  diamond: any;
  sender: WalletClient;
  recipientAddress: Address;
  tokenAddress: Address;
  feeTokenAddress: Address;
  amount: bigint;
  feeAmount: bigint;
  withTokenPermit: boolean;
  withFeeTokenPermit: boolean;
}

export interface TestSwapParams {
  diamond: any;
  sender: WalletClient;
  recipientAddress: Address;
  tokenIn: Address;
  tokenOut: Address;
  feeTokenAddress: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  feeAmount: bigint;
  tx: any;
  target: Address;
  withTokenPermit: boolean;
  withFeeTokenPermit: boolean;
}

// Functions for creating signatures and parameters
export const createTransferSignatures = async (params: TestTransferParams) => {
  const amount = params.amount;
  const feeAmount = params.feeAmount;

  const gasLessSignature = await getGasLessSignatureForTransfer({
    diamond: params.diamond,
    sender: params.sender,
    token: params.tokenAddress,
    amount,
    recipient: params.recipientAddress,
    feeToken: params.feeTokenAddress,
    feeAmount,
  });

  let tokenPermitSignature = {
    signature: ZERO_BYTES,
    nonce: 0n,
    deadline: 0n,
  };

  if (params.withTokenPermit) {
    const tokenContract = await viem.getContractAt('MockToken', params.tokenAddress);
    tokenPermitSignature = await getSignatureERC20Permit(
      tokenContract,
      amount,
      params.sender,
      params.diamond.address,
    );
  }

  let feeTokenPermitSignature = {
    signature: ZERO_BYTES,
    nonce: 0n,
    deadline: 0n,
  };

  if (params.withFeeTokenPermit) {
    const feeTokenContract = await viem.getContractAt('MockFeeToken', params.feeTokenAddress);
    feeTokenPermitSignature = await getSignatureERC20Permit(
      feeTokenContract,
      feeAmount,
      params.sender,
      params.diamond.address,
    );
  }

  return {
    gasLessSignature,
    tokenPermitSignature,
    feeTokenPermitSignature,
  };
};

export const createSwapSignatures = async (params: TestSwapParams) => {
  const amountToTrade = params.amountIn;
  const feeAmount = params.feeAmount;

  const signatureSwapParams: GasLessSignatureForSwapParams = {
    diamond: params.diamond,
    sender: params.sender,
    target: params.target as `0x${string}`,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: amountToTrade,
    amountOutMin: params.amountOutMin,
    recipient: params.recipientAddress,
    feeToken: params.feeTokenAddress,
    feeAmount: feeAmount,
    data: params.tx.data as `0x${string}`,
  };

  const gasLessSignature = await getGasLessSignatureForSwap(signatureSwapParams);

  let feeTokenPermitSignature = {
    signature: ZERO_BYTES,
    nonce: 0n,
    deadline: 0n,
  };
  if (params.withFeeTokenPermit) {
    const feeTokenContract = await viem.getContractAt('MockFeeToken', params.feeTokenAddress);
    feeTokenPermitSignature = await getSignatureERC20Permit(
      feeTokenContract,
      feeAmount,
      params.sender,
      params.diamond.address,
    );
  }

  return {
    gasLessSignature,
    feeTokenPermitSignature,
  };
};

// Functions for creating call parameters
export const buildTransferCallParams = (
  senderAddress: Address,
  tokenAddress: Address,
  amountToTransfer: bigint,
  recipientAddress: Address,
  tokenPermitSignature: any,
  feeTokenPermitSignature: any,
  gasLessSignature: any,
  feeTokenAddress: Address,
  feeAmount: bigint,
) => [
  senderAddress,
  {
    token: tokenAddress,
    amount: amountToTransfer,
    recipient: recipientAddress,
    tokenPermitData: tokenPermitSignature.signature,
    permit2Data: ZERO_BYTES,
  },
  {
    feeToken: feeTokenAddress,
    feeAmount,
    feeTokenPermitData: feeTokenPermitSignature.signature,
    feePermit2Data: ZERO_BYTES,
    nonce: gasLessSignature.nonce,
    deadline: gasLessSignature.deadline,
    signature: gasLessSignature.signature,
  },
];

export const buildSwapCallParams = (
  senderAddress: Address,
  target: Address,
  callData: `0x${string}`,
  tokenIn: Address,
  amountIn: bigint,
  amountOutMin: bigint,
  tokenOut: Address,
  recipient: Address,
  gasLessSignature: any,
  feeTokenAddress: Address,
  feeAmount: bigint,
  feeTokenPermitSignature: any,
) => {
  const relayMetaSwap = {
    feeToken: feeTokenAddress,
    feeAmount: feeAmount,
    feeTokenPermitData: feeTokenPermitSignature.signature,
    feePermit2Data: ZERO_BYTES,
    nonce: gasLessSignature.nonce,
    deadline: gasLessSignature.deadline,
    signature: gasLessSignature.signature,
  } as any;

  const executeCallParams = [
    senderAddress,
    {
      target: target,
      callData: callData,
      tokenIn: tokenIn,
      amountIn: amountIn,
      tokenOut: tokenOut,
      amountOutMin: amountOutMin,
      recipient: recipient,
      tokenPermitData: ZERO_BYTES,
      permit2Data: ZERO_BYTES,
    },
    relayMetaSwap,
  ] as any;

  return executeCallParams;
};

// Functions for multicalls
export const createMulticallTransferCalls = async (
  diamond: any,
  admin: WalletClient,
  recipients: WalletClient[],
  amounts: bigint[],
  fees: bigint[],
  mockToken: any,
  mockFeeToken: any,
) => {
  const calls = [];
  const baseNonce = await diamond.read.nonces([admin.account?.address]);

  for (let i = 0; i < recipients.length; i++) {
    const signature = await getGasLessSignatureForTransfer({
      diamond,
      sender: admin,
      token: mockToken.address,
      amount: amounts[i],
      recipient: recipients[i].account?.address || ZERO_ADDRESS,
      feeToken: mockFeeToken.address,
      feeAmount: fees[i],
      nonce: baseNonce + BigInt(i),
    });

    const relayMeta = {
      feeToken: mockFeeToken.address,
      feeAmount: fees[i],
      feeTokenPermitData: ZERO_BYTES,
      feePermit2Data: ZERO_BYTES,
      nonce: signature.nonce,
      deadline: signature.deadline,
      signature: signature.signature,
    } as any;

    const call = encodeFunctionData({
      abi: diamond.abi,
      functionName: 'relaySignedTransferCall',
      args: [
        admin.account?.address,
        {
          token: mockToken.address,
          amount: amounts[i],
          recipient: recipients[i].account?.address,
          tokenPermitData: ZERO_BYTES,
          permit2Data: ZERO_BYTES,
        },
        relayMeta,
      ],
    });

    calls.push(call);
  }

  return calls;
};

export const mockTransferCallParams = 
  [
    ZERO_ADDRESS,
    {
      token: ZERO_ADDRESS,
      amount: parseEther('1'),
      recipient: ZERO_ADDRESS,
      tokenPermitData: ZERO_BYTES,
      permit2Data: ZERO_BYTES,
    },
    {
      feeToken: ZERO_ADDRESS,
      feeAmount: parseEther('0.001'),
      feeTokenPermitData: ZERO_BYTES,
      feePermit2Data: ZERO_BYTES,
      nonce: 0n,
      deadline: 0n,
      signature: ZERO_BYTES,
    },
  ] as any

export const mockSwapCallParams = 
  [
    ZERO_ADDRESS,
    {
      target: ZERO_ADDRESS,
      callData: ZERO_BYTES,
      tokenIn: ZERO_ADDRESS,
      amountIn: parseEther('1'),
      tokenOut: ZERO_ADDRESS,
      amountOutMin: 0n,
      recipient: ZERO_ADDRESS,
      tokenPermitData: ZERO_BYTES,
      permit2Data: ZERO_BYTES,
    },
    {
      feeToken: ZERO_ADDRESS,
      feeAmount: parseEther('0.001'),
      feeTokenPermitData: ZERO_BYTES,
      feePermit2Data: ZERO_BYTES,
      nonce: 0n,
      deadline: 0n,
      signature: ZERO_BYTES,
    },
] as any
