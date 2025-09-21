import { network } from "hardhat";
import { PERMIT2_ADDRESS, WHITELIST_MANAGER_ROLE } from "./constant.js";
import { getTargetEvent } from "./helpers.js";
import { Address, http, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { NetworkConnection } from "hardhat/types/network";

export const {
	viem,
	networkHelpers: { loadFixture },
} = await network.connect();
export const publicClient = await viem.getPublicClient();

export const deployDiamond = async () => {
    const [admin, user1, user2] = await viem.getWalletClients();
	
	const diamondCutFacet = await viem.deployContract("DiamondCutFacet");
	const diamondLoupeFacet = await viem.deployContract("DiamondLoupeFacet");
	const whitelistFacet = await viem.deployContract("WhitelistFacet");
	const executionFacet = await viem.deployContract("ExecutionFacet");
	const adminFacet = await viem.deployContract("AdminFacet");
	const diamondInit = await viem.deployContract("DiamondInit");

	const libSelectors = await viem.deployContract("LibSelectors");
	const diamondDeployer = await viem.deployContract("DiamondDeployer", [], {
		libraries: {
			LibSelectors: libSelectors.address,
		},
	});

	const deploymentArgs = {
		admin: admin.account.address,
		permit2: PERMIT2_ADDRESS,
		diamondCutFacet: diamondCutFacet.address,
		diamondLoupeFacet: diamondLoupeFacet.address,
		whitelistFacet: whitelistFacet.address,
		executionFacet: executionFacet.address,
		adminFacet: adminFacet.address,
		diamondInit: diamondInit.address,
	};

	const hash = await diamondDeployer.write.deployDiamond([deploymentArgs]);
	const receipt = await publicClient.waitForTransactionReceipt({ hash });

	const event = getTargetEvent(diamondDeployer.abi, receipt, "DiamondDeployed");
	const diamondAddress = (event?.args as any).diamond as Address;

    const diamondContract = await viem.getContractAt("IDiamondProxy", diamondAddress);
    await diamondContract.write.initializeExecutionRelay();
	await diamondContract.write.grantRole([WHITELIST_MANAGER_ROLE, admin.account.address]);

    const mockToken = await viem.deployContract("Token", [parseEther("100000000")]); // 100M tokens

	return {
		diamondAddress: diamondAddress,
		diamondDeployerAddress: diamondDeployer.address,
		diamondCutFacetAddress: diamondCutFacet.address,
		diamondLoupeFacetAddress: diamondLoupeFacet.address,
		whitelistFacetAddress: whitelistFacet.address,
		executionFacetAddress: executionFacet.address,
		adminFacetAddress: adminFacet.address,
		diamondInitAddress: diamondInit.address,
        libSelectorsAddress: libSelectors.address,
        libSelectors: libSelectors,
		diamond: diamondContract,
        mockToken: mockToken,
		admin,
		user1,
		user2,
	};
};
