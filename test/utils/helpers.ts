import { randomBytes } from "crypto";
import { network } from "hardhat";
import { decodeEventLog, TransactionReceipt, Abi, Address, getAddress, keccak256, toHex } from "viem";

const { viem } = await network.connect();

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

export const getRandomAddress = () => {
	const address = '0x' + randomBytes(20).toString('hex');
	return getAddress(address);
};

export const getContractAt = async (address: Address, name: string) => {
	return await viem.getContractAt(name, address);
};

