import { publicClient } from "./client.js";
import { OPERATOR_ROLE, PERMIT2_ADDRESS, WHITELIST_MANAGER_ROLE } from "./constant.js";
import { getTargetEvent, recieveUsdc } from "./helpers.js";
import { Address, parseEther, parseUnits } from "viem";
import { viem } from "./client.js";

export const deployDiamond = async () => {
    const [admin, operator, user1, user2, treasury] = await viem.getWalletClients();
	
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
	await diamondContract.write.setTreasury([treasury.account.address]);
	await diamondContract.write.grantRole([WHITELIST_MANAGER_ROLE, admin.account.address]);
	await diamondContract.write.grantRole([OPERATOR_ROLE, operator.account.address]);

    const mockToken = await viem.deployContract("MockToken", [parseEther("100000000")]); // 100M tokens
	const mockFeeToken = await viem.deployContract("MockFeeToken", [parseEther("100000000")]); // 100M tokens

	await recieveUsdc(parseUnits("1000", 6), admin.account.address);

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
		treasuryAddress: treasury.account.address,
        mockToken: mockToken,
		mockFeeToken: mockFeeToken,
		admin,
		operator,
		user1,
		user2,
	};
};