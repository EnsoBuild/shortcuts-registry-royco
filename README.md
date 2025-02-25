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

1. Create a JSON file in the [simulation-scenarios](./simulation-scenarios/) folder (e.g., `silo-ws-deposit.json`). You
   can copy and edit [example.json](./simulation-scenarios/example.json).

2. Paste in the JSON file the array of shortcuts to simulate. Each item is composed by:

- `shortcut`: the `protocol-market-action` name. See [available shortcuts](./src/helpers/shortcuts.ts).
- `amountsIn`: an array of stringified unsigned big numbers, requiring as many items as the market's `tokensIn`.

```json
[
  {
    "shortcut": "silo-ws-deposit",
    "amountsIn": ["1000000000000000000"]
  }
]
```

3. Simulate the scenario via CLI:

```sh
pnpm simulate silo-ws-deposit
```
