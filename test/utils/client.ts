import { network } from "hardhat";

export const {
	viem,
	networkHelpers: { loadFixture },
} = await network.connect("hardhatMainnet");
export const publicClient = await viem.getPublicClient();