# plugin-nishvault

ElizaOS action plugin for Nishvault Blind-Send Risk Guard.

No `PRE_SEND_PROOF_RECEIPT`, no safe Base agent broadcast.

Use this action when an ElizaOS agent is about to broadcast a Base mainnet EVM transaction and you want one paid x402 preflight step before `sendTransaction`.

```text
agent chooses action -> transaction payload built -> Nishvault guard -> wallet send/broadcast
```

## Install

Install the current portable build directly from the public repository:

```bash
elizaos plugins add github:cakirasim/plugin-nishvault
```

The npm `0.1.3` package predates the portable artifact-root fix. Use the GitHub
install above until a newer npm version is published.

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

Artifact receipts default to the portable, working-directory-relative
`.nishvault-artifacts` directory. Override it when needed:

```bash
X402_ARTIFACT_ROOT=.nishvault-artifacts
```

The plugin always passes this portable default to the buyer library, so an
agent never inherits a package-build machine's absolute artifact path.

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

This package is a mainnet-ready adapter for programmatic EVM agent builders. It includes the registry assets, `dist/` build output, repository metadata, and `agentConfig` entry expected by the ElizaOS publish validator.

Before ElizaOS registry submission, validate with:

```bash
bunx @elizaos/cli@1.7.2 publish --test
bunx @elizaos/cli@1.7.2 publish --dry-run
```
