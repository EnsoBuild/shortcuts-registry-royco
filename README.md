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

1. Create a new JSON file in the [simulation-scenarios](./simulation-scenarios/) directory (e.g.,
   `silo-ws-deposit.json`). You can copy and modify the contents of [example.json](./simulation-scenarios/example.json).

2. In the JSON file, define an array of shortcuts to simulate. Each item should include the following:

- `shortcut`: The name of the `protocol-market-action`. Refer to the [available shortcuts](./src/helpers/shortcuts.ts)
  for a list of options.
- `amountsIn`: An array of stringified unsigned big numbers, with one entry per `tokensIn` defined for the market.

Example:

```json
[
  {
    "shortcut": "silo-ws-deposit",
    "amountsIn": ["7000000000000000000"]
  }
]
```

3. Run the simulation via CLI. This repository supports two simulators: Forge and Tenderly (default). Use the `--mode`
   flag to choose between them:

- `--mode=tenderly`: Default mode (recommended during development). Slower than Forge but provides a sharable Tenderly
  Simulation URL for each call and transaction simulated.
- `--mode=forge`: Faster mode (recommended in tests). Execution traces are hidden by default, but can be shown for
  failing tests (see [Test Shortcuts to Simulate](./test/integration/README.md))

```sh
pnpm simulate silo-ws-deposit --mode=forge
```

Output:

```sh
Simulation Forge Decoded Logs:
╔══════════════════════════════════════════╗
║             SIMULATION REPORT            ║
╚══════════════════════════════════════════╝
| - NETWORK -------------
| Chain ID    :  146
| Block Number (Set):  9872270
| Block Timestamp (Set):  1740423311
|
| - ROLES -------------
| Test Contract :
|   Addr        :  0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
|   Name        : Simulation_Fork_Test
| Caller        :
|   Addr        :  0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11
|   Name        :  Caller
| Callee        :
|   Addr        :  0x0e8f5978e3645cAe8647b2e2A08fFD9e603D8C07
|   Name        :  RecipeMarketHub
| RecipeMarketHub :
|   Addr        :  0x0e8f5978e3645cAe8647b2e2A08fFD9e603D8C07
| WeirollWallet :
|   Addr        :  0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7
|
| - SHORTCUTS -------------
| Number of Shortcuts:  1
|  0   silo-ws-deposit
|
|──────────────────────────────────────────────|
|────────────────── SHORTCUT 0 ────────────────|
|──────────────────────────────────────────────|
| Index    :  0
| Name    :  silo-ws-deposit
| Block Number:  9872270
| Block Timestamp:  1740423311
| Tx Value:  0
| Requires Funding:  true
|
| - TOKENS IN -------------
| Addr       :  0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38
| Name       :  wS
| Is funded  :  true
| Balances   :
|   Addr     :  0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11
|   Name     :  Caller
|     Pre    :  596153846153846152
|     Funded :  7000000000000000000
|     Post   :  596153846153846152
|     Diff   :  0
|
|   Addr     :  0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7
|   Name     :  WeirollWallet
|     Pre    :  0
|     Post   :  0
|     Diff   :  0
|
|
| - TOKENS OUT -------------
| Addr       :  0xf55902DE87Bd80c6a35614b48d7f8B612a083C12
| Name       :  siloBws
| Balances   :
|   Addr     :  0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11
|   Name     :  Caller
|     Pre    :  0
|     Post   :  0
|     Diff   :  0
|
|   Addr     :  0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7
|   Name     :  WeirollWallet
|     Pre    :  0
|     Post   :  6987046105899834586713
|     Diff   :  6987046105899834586713
|
|
|- DUST TOKENS -------------
| Addr      :  0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38
| Name      :  wS
| Balances  :
|   Addr    :  0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11
|   Name    :  Caller
|     Pre   :  596153846153846152
|     Post  :  596153846153846152
|     Diff  :  0
|
|   Addr    :  0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7
|   Name    :  WeirollWallet
|     Pre   :  0
|     Post  :  0
|     Diff  :  0
|
|
|- GAS --------------------
| Used    :  446876
╚══════════════════════════════════════════╝

Simulation Report:
[
  {
    "isSuccessful": true,
    "chainId": 146,
    "block": {
      "number": "9872270",
      "timestamp": 1740423311
    },
    "shortcutName": "silo-ws-deposit",
    "caller": "0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11",
    "weirollWallet": "0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7",
    "amountsIn": [
      "7000000000000000000"
    ],
    "base": {
      "0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11": {
        "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38": "0"
      },
      "0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7": {
        "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38": "0"
      }
    },
    "quote": {
      "0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11": {
        "0xf55902DE87Bd80c6a35614b48d7f8B612a083C12": "0"
      },
      "0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7": {
        "0xf55902DE87Bd80c6a35614b48d7f8B612a083C12": "6987046105899834586713"
      }
    },
    "dust": {
      "0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11": {
        "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38": "0"
      },
      "0xf338BceB2BE2560548d3600F48Ba4e2b4BE387C7": {
        "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38": "0"
      }
    },
    "gas": "446876"
  }
]
```
