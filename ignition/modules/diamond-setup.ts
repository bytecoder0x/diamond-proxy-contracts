import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000000";

export default buildModule("DiamondSetupModule", (m) => {
  const WHITELIST_MANAGER_ROLE = "0x2a3dab589bcc9747970dd85ac3f222668741ae51f2a1bbb8f8355be28dd8a868";
  const OPERATOR_ROLE = "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";
  
  const admin = m.getAccount(0);
  
  const diamondAddress = m.getParameter("diamondAddress", DIAMOND_ADDRESS);
  
  const diamond = m.contractAt("IDiamondProxy", diamondAddress);
  
  m.call(diamond, "initializeExecutionRelay");
  m.call(diamond, "grantRole", [WHITELIST_MANAGER_ROLE, admin]);
  
  return {
    diamond
  };
});
