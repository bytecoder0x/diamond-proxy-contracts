import {
  Account,
  Address,
  keccak256,
  toBytes,
  encodeAbiParameters,
  parseSignature,
  WalletClient,
  encodeFunctionData,
} from 'viem';

import { publicClient } from './client.js';
import { EXECUTION_DEADLINE } from './constant.js';
import { getCurrentBlockTimestamp } from './helpers.js';

export interface GasLessSignatureForSwapParams {
  diamond: any; // IDiamondProxy
  sender: WalletClient;
  target: Address; // target contract what will be called
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  recipient: Address;
  feeToken: Address;
  feeAmount: bigint;
  data: `0x${string}`; // call data
  nonce?: bigint; // optional nonce override for batching
}

export interface GasLessSignatureParamsForTransfer {
  diamond: any; // IDiamondProxy
  sender: WalletClient;
  token: Address;
  amount: bigint;
  recipient: Address;
  feeToken: Address;
  feeAmount: bigint;
  nonce?: bigint; // optional nonce override for batching
}

export const getSignatureERC20Permit = async (
  erc20Permit: any,
  amount: bigint,
  sender: WalletClient,
  spender: `0x${string}`,
) => {
  const senderAddress = sender.account?.address;

  const nonce = await erc20Permit.read.nonces([senderAddress]);
  const currentTime = await getCurrentBlockTimestamp();
  const deadline = BigInt(currentTime + EXECUTION_DEADLINE);

  if (!sender.account || !senderAddress) {
    throw new Error('Sender is not defined or cannot sign');
  }

  const signature = await sender.signTypedData({
    account: sender.account,
    domain: {
      name: await erc20Permit.read.name(),
      version: '1',
      chainId: publicClient.chain.id,
      verifyingContract: erc20Permit.address,
    },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message: {
      owner: senderAddress,
      spender,
      value: amount,
      nonce,
      deadline,
    },
  });

  const parsedSignature = parseSignature(signature);

  if (!parsedSignature) {
    throw new Error('Failed to parse signature');
  }

  const { r, s, v } = parsedSignature;

  const encoded = encodeFunctionData({
    abi: erc20Permit.abi,
    functionName: 'permit',
    args: [senderAddress, spender, amount, deadline, v, r, s],
  });

  return {
    signature: cutSelector(encoded),
    nonce,
    deadline
  };
};

export const getGasLessSignatureForSwap = async (params: GasLessSignatureForSwapParams) => {
  const {
    diamond,
    sender,
    target,
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMin,
    recipient,
    feeToken,
    feeAmount,
    data,
  } = params;

  if (!sender.account?.address) {
    throw new Error('Sender is not defined or cannot sign');
  }

  const senderAddress = sender.account?.address;

  const nonce = params.nonce ?? (await diamond.read.nonces([senderAddress]));
  const currentTime = await getCurrentBlockTimestamp();
  const deadline = BigInt(currentTime + EXECUTION_DEADLINE);

  const signature = await sender.signTypedData({
    account: sender.account,
    domain: {
      name: 'DiamondProxy',
      version: '1',
      chainId: publicClient.chain.id,
      verifyingContract: diamond.address,
    },
    types: {
      Swap: [
        { name: 'owner', type: 'address' },
        { name: 'target', type: 'address' },
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'gasFeeToken', type: 'address' },
        { name: 'gasFeeAmount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'callData', type: 'bytes32' },
      ],
    },
    primaryType: 'Swap',
    message: {
      owner: senderAddress,
      target,
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMin,
      recipient,
      gasFeeToken: feeToken,
      gasFeeAmount: feeAmount,
      nonce,
      deadline,
      callData: keccak256(data),
    },
  });

  const parsedSignature = parseSignature(signature);

  if (!parsedSignature) {
    throw new Error('Failed to parse signature');
  }

  const { r, s, v } = parsedSignature;

  return {
    signature,
    nonce,
    deadline,
    r,
    s,
    v,
  };
};

export const getGasLessSignatureForTransfer = async (params: GasLessSignatureParamsForTransfer) => {
  const { diamond, sender, token, amount, recipient, feeToken, feeAmount } = params;

  if (!sender.account?.address) {
    throw new Error('Sender is not defined or cannot sign');
  }

  const senderAddress = sender.account?.address;

  const nonce = params.nonce ?? (await diamond.read.nonces([senderAddress]));
  const currentTime = await getCurrentBlockTimestamp();
  const deadline = BigInt(currentTime + EXECUTION_DEADLINE);

  const signature = await sender.signTypedData({
    account: sender.account,
    domain: {
      name: 'DiamondProxy',
      version: '1',
      chainId: publicClient.chain.id,
      verifyingContract: diamond.address,
    },
    types: {
      Transfer: [
        { name: 'owner', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'gasFeeToken', type: 'address' },
        { name: 'gasFeeAmount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Transfer',
    message: {
      owner: senderAddress,
      token,
      amount,
      recipient,
      gasFeeToken: feeToken,
      gasFeeAmount: feeAmount,
      nonce,
      deadline,
    },
  });

  const parsedSignature = parseSignature(signature);

  if (!parsedSignature) {
    throw new Error('Failed to parse signature');
  }

  const { r, s, v } = parsedSignature;

  return {
    signature,
    nonce,
    deadline,
    r,
    s,
    v,
  };
};

function cutSelector(data: `0x${string}`): `0x${string}` {
  return `0x${data.slice(10)}`;
}
