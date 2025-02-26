# Test Shortcuts to Simulate

## Data Structures

### Shortcut to Simulate Params

```typescript
export interface ShortcutToSimulate {
  shortcut: Shortcut;
  amountsIn: BigNumberish[];
  requiresFunding?: boolean;
  blockNumber?: BigNumberish;
  blockTimestamp?: number;
  trackedAddresses?: AddressArg[];
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

- `trackedAddresses`: defaults to `[<address:caller>, <address:WeirollWallet>]`. A set of addresses whose balances are
  tracked before and after executing the shortcut.

### Logging Options

```typescript
export interface SimulationLogConfig {
  forgeTestLogFormat?: ForgeTestLogFormat; // Set to `ForgeTestLogFormat.JSON` by default. Switch to `ForgeTestLogFormat.DEFAULT` to log the forge test traces
  forgeTestLogVerbosity? boolean; // Set to `ForgeTestLogVerbosity.X4V` (i.e., '-vvvv') by default.
  isForgeTxDataLogged?: boolean; // Helpful to debug which data is sent to the forge test
  isCalldataLogged?: boolean;
  isForgeLogsLogged?: boolean; // Log the forge decoded logs for successful tests
  isReportLogged?: boolean; // Log the simulation report
}
```

## First Steps

1. Create a test file in [`test/integration/`](./test/integration/) with a simple Vitest test:

```typescript
describe('<protocol>', () => {
  describe('<action>', () => {
    it('<market>', async () => {
      // Arrange
      const txsToSim = [];

      // Act
      const report = await main(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(1);
      const expectedReport0 = {}; // TODO
      expect(report[0]).toMatchObject(expectedReport0);
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

3. Save the test file that should look like:

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
        gas: '417625',
      });
    });
  });
});
```

4. Execute the test(s) with any of these options:

All integration tests:

```sh
pnpm test:simulations
```

A test file:

```sh
pnpm test test/integration/protocol.test.ts
```

A specific integrations test:

```sh
pnpm test:simulations -t "<protocol> <action> <market>"
```
