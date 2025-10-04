import { randomBytes } from 'crypto';
import { decodeEventLog, TransactionReceipt, Abi, Address, getAddress, Hex } from 'viem';
import { publicClient, viem } from './client.js';
import { BINANCE_HOT_WALLET, USDC_ADDRESS } from './constant.js';

export const recieveUsdc = async (amount: bigint, recipient: Address) => {
  await publicClient.transport.request({
    method: 'hardhat_impersonateAccount',
    params: [BINANCE_HOT_WALLET],
  });

  const walletClient = await viem.getWalletClient(BINANCE_HOT_WALLET);
  const usdcContract = await viem.getContractAt('MockToken', USDC_ADDRESS);

  await usdcContract.write.transfer([recipient, amount], {
    account: walletClient.account,
  });
};

export const getSelector = (calldata: Hex): Hex => {
  if (!calldata.startsWith('0x')) {
    throw new Error('Calldata must start with 0x');
  }
  if (calldata.length < 10) {
    throw new Error('Too short calldata');
  }
  return ('0x' + calldata.slice(2, 10)) as Hex;
};

export const getTargetEvent = (abi: Abi, receipt: TransactionReceipt, nameEvent: string) => {
  const logs = receipt.logs.map((log) => {
    try {
      return decodeEventLog({
        abi: abi,
        data: log.data,
        topics: log.topics,
      });
    } catch {
      return null;
    }
  });
  const event = logs.find((e) => e?.eventName === nameEvent);
  return event;
};

export async function getCurrentBlockTimestamp() {
  const block = await publicClient.getBlock({ blockTag: 'latest' });
  return Number(block.timestamp);
}

export const getRandomAddress = () => {
  const address = '0x' + randomBytes(20).toString('hex');
  return getAddress(address);
};

export const getContractAt = async (address: Address, name: string) => {
  return await viem.getContractAt(name, address);
};
