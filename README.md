# plugin-nishvault

ElizaOS action plugin for Nishvault Blind-Send Risk Guard.

No `PRE_SEND_PROOF_RECEIPT`, no safe Base agent broadcast.

Use this action when an ElizaOS agent is about to broadcast a Base mainnet EVM transaction and you want one paid x402 preflight step before `sendTransaction`.

```text
agent chooses action -> transaction payload built -> Nishvault guard -> wallet send/broadcast
```

## Install

```bash
npm install plugin-nishvault
```

## Workflow Slot

```text
Base agent builds tx -> NISHVAULT_PRE_SEND_GUARD -> only on success -> sendTransaction
```

The guard costs `$0.01` real Base USDC through `https://api.nishvault.com`. It performs the preflight only; it never broadcasts the transaction.

If the guard does not return a `PRE_SEND_PROOF_RECEIPT`, keep the downstream wallet action from calling `sendTransaction`.

## Configure

Set these in the agent environment:

```bash
X402_BUYER_PRIVATE_KEY=0xYOUR_BASE_MAINNET_BUYER_KEY
X402_SELLER_BASE_URL=https://api.nishvault.com
```

Optional:

```bash
X402_ARTIFACT_ROOT=.nishvault-artifacts
```

## Register

```js
import nishvaultPlugin from "plugin-nishvault";

export const character = {
  name: "GuardedAgent",
  plugins: [nishvaultPlugin],
};
```

## Action

The plugin exposes one action:

- `NISHVAULT_PRE_SEND_GUARD`

It expects a transaction object in the message text or action options:

```json
{
  "from": "0x...",
  "to": "0x2222222222222222222222222222222222222222",
  "data": "0x",
  "value": "0x0",
  "chainId": "0x2105"
}
```

The action only performs the preflight. It does not broadcast the transaction. A downstream wallet action should only run after this guard returns success.

Expected success marker:

```text
PRE_SEND_PROOF_RECEIPT
```

The receipt is the launch gate: transaction payload built, Nishvault guard paid and passed, then the wallet broadcast step may continue.

## Registry Note

This package is a mainnet-ready adapter for programmatic EVM agent builders. Before ElizaOS registry submission, add required registry images and run:

```bash
elizaos publish --test
```
