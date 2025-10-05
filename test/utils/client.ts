import { network } from 'hardhat';
import { parseGwei } from 'viem';

export const {
  viem,
  networkHelpers: { loadFixture },
} = await network.connect('hardhatMainnet');
export const publicClient = await viem.getPublicClient();

export async function defaultFees() {
  const fees = await publicClient.estimateFeesPerGas();
  const base = fees.baseFeePerGas ?? 0n;
  const maxFee = fees.maxFeePerGas ?? (base > 0n ? base * 2n : parseGwei('2'));
  const maxPriority = fees.maxPriorityFeePerGas ?? parseGwei('1');
  return { maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPriority } as const;
}
