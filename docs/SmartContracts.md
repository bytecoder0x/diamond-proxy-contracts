## Diamond Proxy Contracts — Smart Contracts Documentation

This document describes the Diamond (EIP‑2535) system, facets, libraries, storage, roles, and usage patterns in this repository. It is intended for developers and auditors.

> Solidity 0.8.30, Hardhat 3, viaIR, OZ v5 (upgradeable facets), TypeChain + viem.

---

## Architecture Overview

- Diamond proxy (`contracts/Diamond.sol`) delegates external calls to facet contracts based on function selector.
- A deployer (`contracts/DiamondDeployer.sol`) composes and wires the Diamond with facets and runs a one‑time initializer (`contracts/DiamondInit.sol`).
- Core facets:
  - `DiamondCutFacet`: manages cuts (Add/Replace/Remove selectors)
  - `DiamondLoupeFacet`: ERC‑2535 loupe (introspection)
  - `AdminFacet`: access control, pausing, treasury, emergency withdrawals, multicall, initialization
  - `WhitelistFacet`: granular target+selector whitelisting
  - `ExecutionFacet`: gasless relay for swap/transfer with fees and slippage checks
- Libraries:
  - `LibDiamond`: diamond storage, cut and initialization machinery
  - `LibAppStorage`: application storage (permit2, treasury, whitelists), roles, errors
  - `LibPermit`: EIP‑2612, DAI‑like, and Permit2 utilities
  - `LibSelectors`: precomputed selectors used in deployer

### Call Flow

1) User/relayer calls the Diamond.
2) Diamond `fallback` routes by selector → facet via `delegatecall`.
3) Facet executes using Diamond’s storage (diamond storage and facet/OZ state live at the Diamond address).

---

## Deployment & Initialization

- `DiamondDeployer.deployDiamond(DeploymentArgs)` performs:
  1. Deploy `Diamond` passing a predeployed `DiamondCutFacet` address.
  2. Prepare `FacetCut[]` for: `DiamondLoupeFacet`, `WhitelistFacet`, `ExecutionFacet`, `AdminFacet` using `LibSelectors`.
  3. Execute `diamondCut(cuts, diamondInit, abi.encodeWithSelector(DiamondInit.init, { admin, permit2 }))`.
  4. Call `IDiamondProxy(diamond).initialize(admin, permit2)` which runs `AdminFacet.initialize`.
- `DiamondInit.init(InitArgs)` sets ERC‑165 support flags and seeds app storage with `permit2`.
- `AdminFacet.initialize(admin, permit2)` bootstraps OZ upgradeable state (AccessControl, Pausable, ReentrancyGuard, Multicall), grants `DEFAULT_ADMIN_ROLE` to `admin`, and (re)sets `permit2` in app storage.

Bootstrap security: `DiamondCutFacet.diamondCut` allows the first cut without admin role (since `hasRole` selector is not yet present). After `AdminFacet` is added, further cuts require `DEFAULT_ADMIN_ROLE`.

---

## Storage Layout

### Diamond Storage (routing, ERC‑165)
- `LibDiamond.DiamondStorage` at slot `keccak256("diamond.standard.diamond.storage")`:
  - `mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition`
  - `mapping(address => FacetFunctionSelectors) facetFunctionSelectors`
  - `address[] facetAddresses`
  - `mapping(bytes4 => bool) supportedInterfaces`

### App Storage (application state)
- `LibAppStorage.AppStorage` at slot `keccak256("diamond.standard.app.storage")`:
  - `mapping(address => mapping(bytes4 => bool)) whitelistedSelectors`
  - `address permit2`
  - `address treasury`
- Role constants (OZ‑compatible ids):
  - `DEFAULT_ADMIN_ROLE = 0x00`
  - `OPERATOR_ROLE = keccak256("OPERATOR_ROLE")`
  - `WHITELIST_MANAGER_ROLE = keccak256("WHITELIST_MANAGER_ROLE")`
- Common errors: `ZeroAddress`, `ZeroAmount`, `ArrayLengthMismatch`, `ETHValueNotAllowed`, `Paused`, `NotAuthorized`, `InvalidSelector`, `SelectorNotWhitelisted`, `InsufficientBalance`, `SlippageExceeded`, `CallFailed`, `EmergencyPause`.

### OZ Upgradeable State in Facets
- `AdminFacet` and `ExecutionFacet` inherit upgradeable OZ contracts (AccessControlEnumerable, Pausable, ReentrancyGuard, Multicall, EIP712, Nonces). Their storage variables are laid out in Diamond storage (through delegatecall) as per OZ’s upgradeable layout. Avoid adding new base classes with storage to existing facets unless storage layout compatibility is validated.

---

## Roles & Permissions

- `DEFAULT_ADMIN_ROLE`: can pause/unpause, set treasury, set permit2, initialize facets, grant/revoke roles, emergency withdraw, and perform diamond cuts (post‑bootstrap).
- `WHITELIST_MANAGER_ROLE`: can add/remove whitelisted selectors (single and batch).
- `OPERATOR_ROLE`: can relay signed swap/transfer calls in `ExecutionFacet`.

Granting roles is done via `AdminFacet` (OZ AccessControl API). Initial admin is set in `AdminFacet.initialize` by the deployer.

---

## Contracts & Facets

### Diamond.sol (Proxy Entrypoint)
- Constructor: seeds Diamond with `diamondCut` selector from provided `DiamondCutFacet` address via `LibDiamond.diamondCut`.
- `fallback()`: delegatecall routing by selector; reverts with `FunctionNotFound` if unmapped.
- `receive()`: accepts ETH.
- Errors: `FunctionNotFound(bytes4)`.

### DiamondDeployer.sol (Composer)
- `deployDiamond(DeploymentArgs) → address diamond`:
  - Validates non‑zero `admin` and `permit2`.
  - Deploys Diamond with `DiamondCutFacet`.
  - Adds selectors for Loupe/Whitelist/Execution/Admin.
  - Runs `DiamondInit.init({admin, permit2})` via `_init` delegatecall.
  - Calls `IDiamondProxy(diamond).initialize(admin, permit2)` (AdminFacet).
- Events: `DiamondDeployed(diamond, admin, permit2)`.
- Errors: `InvalidDeploymentArgs()`.

### DiamondInit.sol (Initializer)
- `init(InitArgs { admin, permit2 })`:
  - Sets ERC‑165 support flags for `IERC165`, `IDiamondCut`, `IDiamondLoupe`.
  - Seeds `LibAppStorage.AppStorage.permit2`.
  - Emits `DiamondInitialized(admin, permit2)`.

### DiamondCutFacet.sol
- `diamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata)`:
  - Bootstrap: If `hasRole(bytes32,address)` is not present yet, allow cut. Else require `DEFAULT_ADMIN_ROLE` via `BaseFacet._hasRole`.
  - Calls `LibDiamond.diamondCut` (emits `DiamondCut` and executes optional initializer).

### DiamondLoupeFacet.sol
- Standard ERC‑2535 loupe:
  - `facets()`, `facetFunctionSelectors(address)`, `facetAddresses()`, `facetAddress(bytes4)`
  - `supportsInterface(bytes4)` (delegates to `LibDiamond`’s supportedInterfaces).

### AdminFacet.sol
- Inherits: `AccessControlEnumerableUpgradeable`, `PausableUpgradeable`, `ReentrancyGuardUpgradeable`, `MulticallUpgradeable`.
- Events: `EmergencyWithdrawErc20(address[] tokens)`, `EmergencyWithdrawEth(uint256 amount)`, `Initialized(address admin, address permit2)`, `TreasuryChanged(address treasury)`, `Permit2AddressChanged(address oldPermit2, address newPermit2)`.
- Errors (declared): `EmergencyRescueNotAllowed()`, `TransferFailed()`.
- Functions:
  - `initialize(address admin, address permit2)` [initializer]
    - Grants `DEFAULT_ADMIN_ROLE` to `admin`.
    - Initializes OZ mixins; stores `permit2` in app storage; emits `Initialized`.
  - `pause()` / `unpause()` [only DEFAULT_ADMIN_ROLE].
  - `emergencyWithdrawErc20(address[] tokens)` [only DEFAULT_ADMIN_ROLE]
    - Transfers full balances of each listed token from Diamond to `treasury`.
  - `emergencyWithdrawEth()` [only DEFAULT_ADMIN_ROLE]
    - Transfers ETH balance of Diamond to `treasury`.
  - `setPermit2(address)` / `getPermit2()` [admin / view]
  - `setTreasury(address)` / `getTreasury()` [admin / view]
  - Inherited OZ:
    - AccessControl: `grantRole`, `revokeRole`, `renounceRole`, `hasRole`, `getRoleAdmin`, `getRoleMember`, `getRoleMemberCount`.
    - Pausable: `paused()`.
    - Multicall: `multicall(bytes[])`.

### WhitelistFacet.sol
- Event: `SelectorWhitelisted(address target, bytes4 selector, bool whitelisted)`.
- Functions [only WHITELIST_MANAGER_ROLE]:
  - `addWhitelistedSelector(address target, bytes4 selector)`
  - `removeWhitelistedSelector(address target, bytes4 selector)`
  - `addWhitelistedSelectorsBatch(address[] targets, bytes4[] selectors)`
  - `removeWhitelistedSelectorsBatch(address[] targets, bytes4[] selectors)`
- Views:
  - `isWhitelistedSelector(address target, bytes4 selector) → bool`

### ExecutionFacet.sol
- Inherits: `EIP712Upgradeable`, `NoncesUpgradeable`, `ReentrancyGuardUpgradeable`, `BaseFacet`.
- Constants:
  - `TRANSFER_FROM_SELECTOR = 0xa85e59e4`
  - EIP‑712 typehashes: `SIGNED_SWAP_CALL_TYPEHASH`, `SIGNED_TRANSFER_CALL_TYPEHASH`
- Modifiers:
  - `whenNotPaused()`: checks `AdminFacet.paused()` via `staticcall`.
- Events:
  - `RelayExecuted(owner, relayer, target, selector)`
  - `FeeCollected(owner, token, amount, treasury)`
  - `SwapCallExecuted(user, target, tokenIn, amountIn, tokenOut, amountOut, recipient)`
  - `SwapCallFailed(user, target, tokenIn, amountIn, tokenOut, recipient, revertData)`
  - `TransferCallExecuted(owner, token, amount, recipient)`
- Initialization:
  - `initializeExecutionRelay()` [only DEFAULT_ADMIN_ROLE, reinitializer(2)] initializes EIP‑712 domain `("DiamondProxy", "1")` and `Nonces`.
- Relays [only OPERATOR_ROLE, `nonReentrant`, `whenNotPaused`]:
  - `relaySignedSwapCall(address owner, ExecuteSwapCallParams, RelayMeta)`
    - Validates target+selector whitelist (`_validateCall`), verifies signature, collects optional fee, pulls tokens (permit support), executes external call, checks slippage, emits events.
  - `relaySignedTransferCall(address owner, ExecuteTransferParams, RelayMeta)`
    - Verifies signature, collects optional fee, performs token transfer, emits event.
- Views:
  - `nonces(address owner) → uint256` (from OZ Nonces).

---

## Libraries

### LibDiamond
- Diamond storage accessors and helpers.
- `diamondCut(FacetCut[], address _init, bytes _calldata)` implements Add/Replace/Remove with checks; emits `DiamondCut` and optionally `delegatecall`s initializer.
- Ensures facet code exists, prevents duplicates, guards immutable functions (in Diamond).
- `initializeDiamondCut(_init, _calldata)` reverts bubbling revert data if initializer fails.
- Errors: `IncorrectFacetCutAction`, `NoSelectorsProvidedForFacetForCut`, `CannotAddSelectorsToZeroAddress`, `CannotAddFunctionToDiamondThatAlreadyExists`, `CannotReplaceSelectorsFromZeroAddress`, `CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet`, `RemoveFacetAddressMustBeZeroAddress`, `CannotRemoveFunctionThatDoesNotExist`, `CannotRemoveImmutableFunction`, `InitializationFunctionReverted`, `NoBytecodeAtAddress`.

### LibAppStorage
- App storage layout and constants.
- Provides typed errors used across facets.

### LibPermit
- Unified permit handling supporting:
  - EIP‑2612 (`IERC20Permit.permit`), DAI‑like (`IDaiLikePermit.permit`), and Uniswap’s Permit2 (`IPermit2`)
- Key functions:
  - `makeTokenPermit(token, owner, permit)` → permits `s.permit2` as spender if owner→s.permit2 allowance isn’t max.
  - `makePermit2(token, owner, amount, permit2Data)` → ensures Diamond has sufficient allowance via Permit2; if insufficient or expired, calls Permit2 `permit` for spender `address(this)`.
  - `transferPayment(token, owner, to, amount)` → Permit2 `transferFrom` using 160‑bit amount (guards overflow).
- Internals:
  - `_tryPermit(IERC20 token, address owner, address spender, bytes permit)` assembly routine that decodes “compact” and full forms for EIP‑2612/DAI/Permit2 and executes the appropriate call, reverting with `PermitLengthError` on unknown formats.
- Errors: `PermitFailed`, `PermitLengthError`, `InputOverflow`.

### LibSelectors
- Pure helpers returning precomputed selector arrays for each facet. Used by `DiamondDeployer` to reduce runtime keccak costs.

---

## Whitelisting Model

- Whitelist is mapping of `target → selector → bool` stored in `LibAppStorage.AppStorage`.
- `ExecutionFacet` requires both a non‑zero `target`, non‑zero `tokenIn`, zero `msg.value`, and that `bytes4(callData)` is whitelisted for the `target`.
- Whitelist management is restricted to `WHITELIST_MANAGER_ROLE` and supports single/batch add/remove.

---

## Fees & Treasury

- Optional per‑relay fee: `(feeToken, feeAmount)`.
- If `feeAmount > 0`, `ExecutionFacet` collects fee from `owner` to `treasury` before execution via `_transferFromWithPermit` (supporting EIP‑2612/DAI/Permit2 approvals).
- `treasury` must be set by admin; otherwise fee collection reverts.

---

## Signatures, Nonces, and EIP‑712

- `ExecutionFacet` initializes domain in `initializeExecutionRelay()`:
  - Name: `DiamondProxy`, Version: `1`
  - Verifying contract: Diamond address
- Nonces are per‑owner (OZ `NoncesUpgradeable`).
- Swap struct hash fields:
  - `owner, target, tokenIn, tokenOut, amountIn, amountOutMin, recipient, feeToken, feeAmount, nonce, deadline, keccak256(callData)`
- Transfer struct hash fields:
  - `owner, token, amount, recipient, feeToken, feeAmount, nonce, deadline`
- Verification requires exact nonce match and `block.timestamp <= deadline`.

---

## Pausing, Reentrancy, and Safety

- `AdminFacet.pause()`/`unpause()` toggle paused state; `ExecutionFacet` guards entry via `whenNotPaused`.
- `ExecutionFacet` relay functions are `nonReentrant`.
- `ExecutionFacet._approveToken` uses `forceApprove` with zero‑first pattern for wide token compatibility.
- On swap call failure, input tokens are refunded to `owner` and a `SwapCallFailed` event is emitted; fees remain collected.
- ETH is not allowed in `ExecutionFacet` relays (`ETHValueNotAllowed`).

---

## Governance & Upgrades (DiamondCuts)

- Pre‑bootstrap: First cut is permitted without admin role.
- Post‑bootstrap: `diamondCut` requires `DEFAULT_ADMIN_ROLE` (verified by presence of `hasRole` selector mapping).
- Loupe facet enables verification of final selector map off‑chain.

---

## Interface Surface (Selectors Added)

The deployer adds the following selector sets via `LibSelectors`:

- Loupe: `facets()`, `facetFunctionSelectors(address)`, `facetAddresses()`, `facetAddress(bytes4)`, `supportsInterface(bytes4)`
- Whitelist: `addWhitelistedSelector`, `removeWhitelistedSelector`, `addWhitelistedSelectorsBatch`, `removeWhitelistedSelectorsBatch`, `isWhitelistedSelector`
- Execution: `relaySignedSwapCall`, `relaySignedTransferCall`, `initializeExecutionRelay`, `nonces(address)`
- Admin: `grantRole`, `revokeRole`, `renounceRole`, `hasRole`, `getRoleAdmin`, `getRoleMember`, `getRoleMemberCount`, `paused`, `pause`, `unpause`, `multicall`, `initialize`, `setPermit2`, `getPermit2`, `setTreasury`, `getTreasury`, `emergencyWithdrawErc20`, `emergencyWithdrawEth`

Note: `IDiamondProxy` is a superset interface for convenience; not every declared function is necessarily present in the deployed selector set beyond the ones listed above.

---

## Error Catalogue

- `Diamond.FunctionNotFound(selector)` — selector not mapped to any facet.
- `LibAppStorage` errors: see Storage Layout section.
- `LibDiamond` errors: see Libraries section.
- `LibPermit`: `PermitFailed`, `PermitLengthError`, `InputOverflow`.
- `AdminFacet` declared: `EmergencyRescueNotAllowed`, `TransferFailed` (currently unused in implementation).

---

## Typical Usage

### Grant roles and configure

```ts
// viem + hardhat-viem style
const diamond = await viem.getContractAt("IDiamondProxy", diamondAddress);

// Bootstrap after deploy: grant roles
await diamond.write.grantRole([WHITELIST_MANAGER_ROLE, manager]);
await diamond.write.grantRole([OPERATOR_ROLE, relayer]);
await diamond.write.setTreasury([treasury]);
await diamond.write.unpause([]); // if paused
```

### Whitelist target + selector

```ts
// Whitelist a target+selector
await diamond.write.addWhitelistedSelector([target, selector]);
```

### Relay signed swap

```ts
await diamond.write.initializeExecutionRelay([]); // once by admin

await diamond.write.relaySignedSwapCall([
  owner,
  {
    target, callData, tokenIn, amountIn, tokenOut, amountOutMin, recipient,
    tokenPermitData, permit2Data
  },
  { feeToken, feeAmount, feeTokenPermitData, feePermit2Data, nonce, deadline, signature }
]);
```

---

## Auditing Notes & Invariants

- Only whitelisted `(target, selector)` pairs are callable via `ExecutionFacet` relays.
- `msg.value` must be zero in relays; only ERC‑20 token flows are supported.
- Fees are collected first; swap failures refund `amountIn` but do not refund fees.
- Slippage bounded by `amountOutMin` with post‑call balance delta checks.
- Reentrancy protection at relay entry points; favor effects‑then‑interactions where practical.
- Role‑gating:
  - DiamondCut: `DEFAULT_ADMIN_ROLE` (post‑bootstrap)
  - AdminFacet admin ops: `DEFAULT_ADMIN_ROLE`
  - Whitelisting: `WHITELIST_MANAGER_ROLE`
  - Relays: `OPERATOR_ROLE`
- Storage safety: OZ upgradeable base storage lives in Diamond; avoid adding new base classes with storage to existing facets without reviewing layout. App state uses a dedicated diamond storage slot via `LibAppStorage`.
- Permit handling: supports multiple standards; ensure `permit` blobs are constructed correctly; unknown lengths revert.
- ERC‑165 support is set in `DiamondInit` for `IERC165`, `IDiamondCut`, `IDiamondLoupe`.

---

## Testing Pointers

- Use loupe to assert exact selector sets per facet.
- Snapshot and revert around end‑to‑end relay tests; assert events and final balances.
- Fuzz around `amountOutMin`, fees, and input approvals/permits.
- Include failure path coverage for swap calls and ensure refunds occur.

---

## File Index

- contracts/
  - Diamond.sol — Proxy entrypoint
  - DiamondDeployer.sol — Deploys and wires the Diamond
  - DiamondInit.sol — One‑time initializer (ERC‑165 + app config)
  - facets/
    - AdminFacet.sol — Roles, pausing, treasury, emergency ops
    - WhitelistFacet.sol — Whitelist management (target+selector)
    - ExecutionFacet.sol — Gasless relays for swap/transfer
    - DiamondCutFacet.sol — ERC‑2535 cut implementation with admin gating
    - DiamondLoupeFacet.sol — ERC‑2535 loupe
    - BaseFacet.sol — Role helper + modifier
  - libraries/
    - LibDiamond.sol — Diamond storage and cut machinery
    - LibAppStorage.sol — App storage, roles, errors
    - LibPermit.sol — EIP‑2612/DAI/Permit2 helpers
    - LibSelectors.sol — Selector sets for deployer
  - interfaces/
    - IDiamondCut.sol, IDiamondLoupe.sol, IDiamondProxy.sol, IPermit2.sol, IDaiLikePermit.sol
    - facets/IExecutionFacet.sol

---

## Limitations & Future Work

- Admin role assignment for `OPERATOR_ROLE` and `WHITELIST_MANAGER_ROLE` is left to post‑deploy setup (see ignition module). Ensure those are granted before enabling relays.
- Consider adding a view facet to surface app storage (treasury, permit2, whitelist state) for monitoring.
- If adding new facets with OZ upgradeable bases, review and document storage layout impact.

---

## References

- EIP‑2535 Diamond Standard
- OpenZeppelin v5 Upgradeable Contracts
- Permit2 (Uniswap)
