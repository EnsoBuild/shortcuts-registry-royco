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
pnpm generate sonic dolomite dhoney
```

Default output example:

```json
{
  "weirollCommands": [
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
  "weirollState": [
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

Simulation supported modes are: `forge`, and `quoter`. Simulation mode is set via `--mode=<simulationMode>`. By default
simulation is done via the `quoter`.

### Forge

Please set first:

- `RPC_URL_<network_name>` in the .env file.
- `Shorcut.getTokenHolder(chainId)` TypeScript implementation (responsible of Weiroll wallet funding with `tokensIn`
  before shortcut execution). Optionally, `Shorcut.getAddressData(chainId)` (responsible of labelling addresses).

```sh
pnpm simulate sonic beraborrow mint-nect-lp 100000 --mode=forge
```

Optionally set the fork block number via `--block=`:

```sh
pnpm simulate sonic beraborrow mint-nect-lp 100000 --mode=forge --block=1835295
```

Output example:

```sh
[⠊] Compiling...
No files changed, compilation skipped

Ran 1 test for test/foundry/fork/EnsoWeirollWallet_Fork_sonic_Test.t.sol:EnsoWeirollWallet_Fork_sonic_Test
[PASS] test_executeWeiroll_1() (gas: 875370)
Logs:
  ╔══════════════════════════════════════════╗
  ║              SIMULATION RESULTS          ║
  ╚══════════════════════════════════════════╝
  | Chain ID    :  80000
  | Block Number (Latest):  2276308
  |────────────────────────────────────────────
  | - TOKENS IN -------------
  | Addr    :  0x015fd589F4f1A33ce4487E12714e1B15129c9329
  | Name    :  ERC20:USDC
  | Amount  :
  |   Pre   :  0
  |   In    :  1000000
  |   Post  :  0
  |────────────────────────────────────────────
  | - TOKENS OUT -------------
  | Addr    :  0x7f2B60fDff1494A0E3e060532c9980d7fad0404B
  | Name    :  ERC20:dHONEY
  | Amount  :  998000000000000000
  |   Pre   :  0
  |   Post  :  998000000000000000
  |────────────────────────────────────────────
  |- DUST TOKENS -------------
  | Addr    :  0x015fd589F4f1A33ce4487E12714e1B15129c9329
  | Name    :  ERC20:USDC
  | Amount  :  0
  |   Pre   :  0
  |   Post  :  0
  |--------------------------------------------
  | Addr    :  0xd137593CDB341CcC78426c54Fb98435C60Da193c
  | Name    :  ERC20:HONEY
  | Amount  :  0
  |   Pre   :  0
  |   Post  :  0
  |────────────────────────────────────────────
  |- Gas --------------------
  | Used    :  865188
  ╚══════════════════════════════════════════╝

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 6.17s (5.73s CPU time)

Ran 1 test suite in 6.17s (6.17s CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)
```

### Quoter

Please set `QUOTER_URL` in the .env file.

Pass the amount(s) that you want to simulate (e.g., 1000000). If you shortcut that takes multiple tokens, pass the
amounts as comma separated values (e.g., 100,100).

```sh
pnpm simulate sonic kodiak honey-mim 10000000,100000000
```

```sh
pnpm simulate sonic kodiak honey-mim 10000000,100000000 --slippage=3 --mode=quoter
```

Output example:

```sh
Simulation:  {
  quote: { '0x150683BF3f0a344e271fc1b7dac3783623e7208A': '271725' },
  dust: {
    '0x08B918dD18E087893bb9d711d9E0BBaA7a63Ef63': '16',
    '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '99600399'
  },
  gas: '1334335'
}
```

## Execute

To actually execute on-chain you can use the following command:

```sh
pnpm execute sonic dolomite dhoney 0x0a26df1d9EE5e99dF92552979E83BEeA54653E8a
```

Where the address passed is the wallet that will be executing the call. You must set the private key to `PRIVATE_KEY` in
the .env file or pass it directly via `--privateKey=`

The script will only work if the wallet is already deployed and funded.
