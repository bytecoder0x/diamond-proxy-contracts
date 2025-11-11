# diamond-proxy-contracts

## Overview

This repository contains Solidity smart contracts for gasless swaps and token transfers, built as a Diamond proxy (EIP-2535). User signs an EIP-712 request off-chain, the operator sends it to the diamond and the user pays the fee for gas with ERC20 token instead of native coin. Swap targets and their function selectors must be in the whitelist.

`docs/SmartContracts.md` has a longer description of storage, roles and facets. It was written before the last fixes, so some parts are outdated (for example `diamondCut` is owner-only now).

## Smart Contracts

1. **Diamond**: The proxy. Its fallback finds the facet by function selector and makes `delegatecall` to it. It also keeps the owner (`owner`, `transferOwnership`).
2. **DiamondDeployer**: Builds the diamond in one transaction from already deployed facets: adds Loupe, Whitelist, Execution and Admin facets, runs `DiamondInit`, initializes AdminFacet and transfers ownership to the admin.
3. **DiamondInit**: Init contract for the `diamondCut` in DiamondDeployer, it registers the supported interfaces (ERC-165).
4. **DiamondCutFacet**: `diamondCut` to add, replace and remove functions. Only the diamond owner can call it.
5. **DiamondLoupeFacet**: View functions for facets and selectors and `supportsInterface`.
6. **AdminFacet**: Roles (OpenZeppelin `AccessControlEnumerable`), `pause` / `unpause`, `multicall`, treasury address and emergency withdraw of ERC20 tokens and ETH to the treasury (only when paused).
7. **WhitelistFacet**: Adds and removes whitelisted pairs of target and selector, one by one or in batch. Only for `WHITELIST_MANAGER_ROLE`.
8. **ExecutionFacet**: `relaySignedSwapCall` and `relaySignedTransferCall`, both only for `OPERATOR_ROLE`. It checks the signature (EIP-712 domain `DiamondProxy`), nonce and deadline, sends the fee to the treasury and then calls the whitelisted target for the swap (with `amountOutMin` check) or transfers tokens to the recipient. If the swap call fails, input tokens are returned to the user and the fee is kept. Fee-on-transfer tokens are not supported as input of the swap.
9. **BaseFacet**: Abstract contract with `onlyRole` and `whenNotPaused` modifiers, they read `hasRole` and `paused` from the diamond.
10. **LibDiamond**: Diamond storage, owner and the logic of `diamondCut`.
11. **LibAppStorage**: App storage (whitelist, Permit2 and treasury addresses), role constants and errors.
12. **LibPermit**: Makes the token permit (EIP-2612 or DAI-like) or the Permit2 permit when the data is passed, then transfers tokens from the user with `transferFrom` or through Permit2.
13. **LibSelectors**: Lists of selectors of the facets, DiamondDeployer uses them for the cuts.

## Technologies Used

- **Solidity**: 0.8.30 with optimizer and `viaIR`.
- **Hardhat 3**: compile and tests, TypeScript, viem and `node:test`.
- **Hardhat Ignition**: deploy modules in `ignition/modules`.
- **OpenZeppelin Contracts and Contracts Upgradeable**: `AccessControlEnumerable`, `Pausable`, `Multicall`, `ReentrancyGuard`, `EIP712`, `Nonces`, `SafeERC20`.
- **Permit2**: allowance transfer for tokens and the fee. Tests use Permit2, USDC, PEPE and the 1inch router from the mainnet fork.
- **Solhint, ESLint, Prettier**: linters and formatting.

## Running the Project

1. Install dependencies using `npm install`. `forge-std` is installed from GitHub, not from npm registry, so git and access to GitHub are needed.
2. Create a `.env` file from `.env.example`. `ETH_RPC_URL`, `POLYGON_RPC_URL` and `POLYGON_PRIVATE_KEY` are read in `hardhat.config.ts`, Hardhat does not load the config if they are empty. The Polygon values are used only for deploy. `ONEINCH_API_KEY` is only for the `getTradeData` helper, tests do not call it.
3. Compile the contracts using `npx hardhat compile`.
4. Run tests using `npx hardhat test`. Tests fork Ethereum mainnet at block 23461899, so `ETH_RPC_URL` must be an archive node.
5. Deploy to Polygon using `npm run deploy-polygon`, then put the diamond address to `ignition/modules/diamond-setup.ts` and run `npm run setup-polygon`.
