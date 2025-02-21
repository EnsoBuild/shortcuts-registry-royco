![cover](cover.webp)

# Shortcuts Registry

This is a registry of shortcuts (weiroll scripts) used in Royco Markets.

## Setup

Request an NPM token from the Enso team.

Install dependencies:

```sh
pnpm install
```

Make sure latest stable version of foundry is installed. See: https://book.getfoundry.sh/announcements

Setup foundry:

```sh
forge soldeer update
forge remappings
```

Alternatively (npm packages + foundry):

```sh
pnpm registryup
```

## Generate

The generated outputs file path will be `shortcuts-registry/outputs/<chain>/<protocol>/<market>.json`.

### All Protocols & Markets

Pass the chain name (e.g., ethereum, sonic):

```sh
pnpm generate:all sonic
```

### Single Protocol & Market

Pass the chain name (e.g., sonic), the protocol (e.g., dolomite) and the market (e.g., dhoney):

```sh
pnpm generate sonic silo ws-deposit
```

Default output example:

```json
{
  "commands": [
    "0xb65d95ec01ffffffffffff0507899ac8be7462151d6515fcd4773dd9267c9911",
    "0x2e1cc2f601ffffffffffff0607899ac8be7462151d6515fcd4773dd9267c9911",
    "0x095ea7b3010600ffffffffff015fd589f4f1a33ce4487e12714e1b15129c9329",
    "0x095ea7b3010600ffffffffff7f2b60fdff1494a0e3e060532c9980d7fad0404b",
    "0x70a082310105ffffffffff06015fd589f4f1a33ce4487e12714e1b15129c9329",
    "0x095ea7b3010106ffffffffff015fd589f4f1a33ce4487e12714e1b15129c9329",
    "0x328ebaf70102060503ffff06a81f0019d442f19f66880bcf2698b4e5d5ec249a",
    "0x095ea7b3010406ffffffffffd137593cdb341ccc78426c54fb98435c60da193c",
    "0x6e553f65010605ffffffffff7f2b60fdff1494a0e3e060532c9980d7fad0404b"
  ],
  "state": [
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "0x000000000000000000000000a81f0019d442f19f66880bcf2698b4e5d5ec249a",
    "0x000000000000000000000000015fd589f4f1a33ce4487e12714e1b15129c9329",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000007f2b60fdff1494a0e3e060532c9980d7fad0404b",
    "0x",
    "0x"
  ]
}
```

Optionally, get a full output by adding `--output=full` (this output won't be saved as JSON):

```sh
pnpm generate sonic dolomite dhoney --output=full
```

## Build

```sh
pnpm build <network> <marketHash> <...args>
```

e.g.

```sh
pnpm build sonic 0xd4d6596bdc7cb7f8b214961f895c2d79d884f9c3dfcac62996c3f94c1641af0d --slippage=100 --skewRatio=9990 --minAmount0Bps=9950 --minAmount1Bps=9950
```

## Simulate

Simulation supported modes are: `forge`.

Shortcut to simulate params:

- blockNumber (`BigNumberish`): optional. Defaults to the latest `block.number` defined either by the fork or by the
  previous shortcut to simulate. Use it thoughtfully.
- blockTimestamp (`Number`): optional. Defaults to the latest `block.timestamp` defined either by the fork or by the
  previous shortcut to simulate. Use it thoughtfully.

- requiresFunding (`boolean`): optional. Whether the shortcut to simulate will fund first the caller address with the
  `tokensIn` and their amounts from `amountsIn`. Use it thoughtfully.
- shortcut (supported `Shortcut`): required.
- amountsIn (`BigNumberish[]`): required.

### Forge

1. Create a test in [`test/integration/simulateShortcut.test.ts`](./test/integration/simulateShortcut.test.ts).

2. Define an array of transactions to simulate, for instance:

Both shortcuts (deposit & redeem) happen in the same block.

```typescript
const txsToSim = [
  {
    blockNumber: '8455854',
    requiresFunding: true,
    shortcut: new Silo_Ws_Deposit_Shortcut(),
    amountsIn: [parseUnits('1', 18).toString()],
  },
  {
    shortcut: new Silo_Ws_Redeem_Shortcut(),
    amountsIn: [parseUnits('1', 18).toString()],
  },
];
```

First shortcut (deposit) happens at block `8865840` (with the proper `block.timestamp` set), whilst the second shortcut
is executed at the same `block.number` but 1 second after.

```typescript
const provider = getProviderByChainId(ChainIds.Sonic);
const blockNumber = '8865840';
const blockTimestamp = await getBlockTimestamp(provider, blockNumber);

const txsToSim = [
  {
    blockNumber,
    requiresFunding: true,
    shortcut: new StableJack_YtSts_Deposit_Shortcut(),
    amountsIn: [parseUnits('10', 18).toString()],
  },
  {
    blockTimestamp: blockTimestamp + 1, // NOTE: YT-stS cooldown period is 1 second for redeems
    shortcut: new StableJack_YtSts_Redeem_Shortcut(),
    amountsIn: [parseUnits('1', 18).toString()],
  },
];
```

3. Execute the test(s) with:

```sh
pnpm test:simulations
```

## Execute

To actually execute on-chain you can use the following command:

```sh
pnpm execute sonic dolomite dhoney 0x0a26df1d9EE5e99dF92552979E83BEeA54653E8a
```

Where the address passed is the wallet that will be executing the call. You must set the private key to `PRIVATE_KEY` in
the .env file or pass it directly via `--privateKey=`

The script will only work if the wallet is already deployed and funded.
