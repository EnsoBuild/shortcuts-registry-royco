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

Pass the chain name (e.g., sonic), the protocol (e.g., silo) and the market (e.g., ws-deposit, ws-redeem):

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

## Simulate

### Shortcut to Simulate Params

```typescript
export interface ShortcutToSimulate {
  shortcut: Shortcut;
  amountsIn: BigNumberish[];
  requiresFunding?: boolean;
  blockNumber?: BigNumberish;
  blockTimestamp?: number;
}
```

- `blockNumber`: defaults to the latest `block.number` defined either by the fork or by the previous shortcut to
  simulate. Use it thoughtfully.
- `blockTimestamp`: defaults to the latest `block.timestamp` defined either by the fork or by the previous shortcut to
  simulate. Use it thoughtfully.

- `requiresFunding`: whether the shortcut to simulate will fund first the caller address with the `tokensIn` and their
  amounts from `amountsIn`. Use it thoughtfully.
- `shortcut`: only supported `Shortcut` instances.
- `amountsIn`: `0` items are not allowed.

### Logging Options

```typescript
export interface SimulationLogConfig {
  forgeTestLogFormat: ForgeTestLogFormat; // Set to `ForgeTestLogFormat.JSON` by default. Switch to `ForgeTestLogFormat.DEFAULT` to log the forge test traces
  isForgeTxDataLogged?: boolean; // Helpful to debug which data is sent to the forge test
  isCalldataLogged?: boolean;
  isForgeLogsLogged?: boolean; // Log the forge decoded logs for successful tests
  isReportLogged?: boolean; // Log the simulation report
}
```

### First Steps

1. Create a test in [`test/integration/simulateShortcut.test.ts`](./test/integration/simulateShortcut.test.ts).

```typescript
describe('silo', () => {
  describe('deposits', () => {
    it('ws', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '8455854',
          requiresFunding: true,
          shortcut: new Silo_Ws_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
      ];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim, {
        forgeTestLogFormat: ForgeTestLogFormat.JSON,
      });

      // Assert
      expect(report.length).toBe(1);
      expect(report[0]).toMatchObject({
        amountsIn: ['1000000000000000000'],
        dust: { '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0' },
        quote: { '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998297853831134388682' },
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        gas: '417625', // '368502',
      });
    });
  });
});
```

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
