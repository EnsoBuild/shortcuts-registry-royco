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
export interface SimulationConfig {
  simulatonMode: SimulationMode;
  // Forge simulator options
  forgeTestLogFormat?: ForgeTestLogFormat; // Set to `ForgeTestLogFormat.JSON` by default. Switch to `ForgeTestLogFormat.DEFAULT` to log the forge test traces
  forgeTestLogVerbosity? boolean; // Set to `ForgeTestLogVerbosity.X4V` (i.e., '-vvvv') by default.
  isForgeTxDataLogged?: boolean; // Helpful to debug which data is sent to the forge test
  isForgeLogsLogged?: boolean; // Log the forge decoded logs for successful tests
  // Tenderly simulator options
  isTenderlySimulationsLogged?: boolean; // Log the payload (simulations) sent to the Tenderly Simulator Bundle API
    // Common options
  isCalldataLogged?: boolean;
  isReportLogged?: boolean; // Log the simulation report
  isRawResultInReport?: boolean; // Log the simulator raw response for the simulated shortcut
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
      const { amountsIn, dust, quote, weirollWallet, gas } = report[0]; // TODO: assert them
    });
  });
});
```

2. Define an array of transactions to simulate, for instance:

Both shortcuts (deposit & redeem) happen in the same block.

```typescript
const txsToSim = [
  {
    blockNumber: '9872270',
    requiresFunding: true,
    shortcut: new Silo_Ws_Deposit_Shortcut(),
    amountsIn: [parseUnits('1', 18).toString()],
  },
  {
    shortcut: new Silo_Ws_Redeem_Shortcut(),
  },
];
```

First shortcut (deposit) happens at block `9872270` (with the proper `block.timestamp` set), whilst the second shortcut
is executed at the same `block.number` but 1 second after.

```typescript
const provider = getProviderByChainId(ChainIds.Sonic);
const blockNumber = '9872270';
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
  },
];
```

3. Save the test file that should look like:

```typescript
describe('silo', () => {
  describe('deposits', () => {
    it('ws (deposit-redeem)', async () => {
      // Arrange
      const txsToSim = [
        {
          blockNumber: '9872270',
          requiresFunding: true,
          shortcut: new Silo_Ws_Deposit_Shortcut(),
          amountsIn: [parseUnits('1', 18).toString()],
        },
        {
          shortcut: new Silo_Ws_Redeem_Shortcut(),
        },
      ];

      // Act
      const report = await main_(ChainIds.Sonic, txsToSim);

      // Assert
      expect(report.length).toBe(2);

      const {
        block: blockSc0,
        amountsIn: amountsInSc0,
        dust: dustSc0,
        quote: quoteSc0,
        weirollWallet: weirollWalletSc0,
        gas: gasSc0,
      } = report[0];

      // Shortcut 0
      expect(blockSc0).toEqual({ number: '9872270', timestamp: 1740423311 });
      expect(amountsInSc0).toEqual(['1000000000000000000']);
      expect(dustSc0[CALLER]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(dustSc0[WEIROLL_WALLET]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(quoteSc0[CALLER]).toEqual({ '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '0' });
      expect(quoteSc0[WEIROLL_WALLET]).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '998149443699976369530',
      });
      expect(weirollWalletSc0).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gasSc0), BigInt('446834'), BigInt('100'));

      const {
        amountsIn: amountsInSc1,
        dust: dustSc1,
        quote: quoteSc1,
        weirollWallet: weirollWalletSc1,
        gas: gasSc1,
      } = report[1];

      // Shortcut 1
      expect(blockSc0).toEqual({ number: '9872270', timestamp: 1740423311 });
      expect(amountsInSc1).toEqual(['1000000000000000000']);
      expect(dustSc1[CALLER]).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '0',
      });
      expect(dustSc1[WEIROLL_WALLET]).toEqual({
        '0xf55902DE87Bd80c6a35614b48d7f8B612a083C12': '-998149443699976369530',
      });
      expect(quoteSc1[CALLER]).toEqual({ '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '999999999999999999' });
      expect(quoteSc1[WEIROLL_WALLET]).toEqual({
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38': '0',
      });
      expect(weirollWalletSc1).toBe(WEIROLL_WALLET);
      expectBigIntToBeCloseTo(BigInt(gasSc1), BigInt('174308'), BigInt('100'));
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
