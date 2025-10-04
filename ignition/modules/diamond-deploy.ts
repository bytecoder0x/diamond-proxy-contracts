import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export default buildModule('DiamondDeployModule', (m) => {
  const admin = m.getAccount(0);

  const libSelectors = m.contract('LibSelectors');

  const diamondCutFacet = m.contract('DiamondCutFacet');
  const diamondLoupeFacet = m.contract('DiamondLoupeFacet');
  const whitelistFacet = m.contract('WhitelistFacet');
  const executionFacet = m.contract('ExecutionFacet');
  const adminFacet = m.contract('AdminFacet');

  const diamondInit = m.contract('DiamondInit');

  const diamondDeployer = m.contract('DiamondDeployer', [], {
    libraries: {
      LibSelectors: libSelectors,
    },
  });

  const deploymentArgs = {
    admin: admin,
    permit2: PERMIT2_ADDRESS,
    diamondCutFacet: diamondCutFacet,
    diamondLoupeFacet: diamondLoupeFacet,
    whitelistFacet: whitelistFacet,
    executionFacet: executionFacet,
    adminFacet: adminFacet,
    diamondInit: diamondInit,
  };

  const diamondDeployTx = m.call(diamondDeployer, 'deployDiamond', [deploymentArgs]);

  return {
    diamondDeployer,
    diamondInit,
    libSelectors,

    diamondCutFacet,
    diamondLoupeFacet,
    whitelistFacet,
    executionFacet,
    adminFacet,
  };
});
