import {
  preflightTransactionRequest,
  summarizePreflightOutcome,
} from "nishvault-preflight-buy";

function getSetting(runtime, name) {
  if (runtime && typeof runtime.getSetting === "function") {
    const value = runtime.getSetting(name);
    if (value) {
      return value;
    }
  }
  return process.env[name];
}

function getSellerUrl(runtime) {
  return getSetting(runtime, "X402_SELLER_BASE_URL") || "https://api.nishvault.com";
}

function extractText(message) {
  const content = message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (content && typeof content.text === "string") {
    return content.text;
  }
  return "";
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      return null;
    }
    return JSON.parse(trimmed.slice(first, last + 1));
  }
}

function resolveTransaction(message, options) {
  if (options?.transaction && typeof options.transaction === "object") {
    return options.transaction;
  }

  const parsed = extractJsonObject(extractText(message));
  if (!parsed) {
    throw new Error("Provide an EVM transaction JSON object for Nishvault pre-send guard.");
  }

  return parsed.transaction && typeof parsed.transaction === "object"
    ? parsed.transaction
    : parsed;
}

export const nishvaultPreSendGuardAction = {
  name: "NISHVAULT_PRE_SEND_GUARD",
  similes: [
    "PRESEND_GUARD",
    "CHECK_TRANSACTION_BEFORE_SEND",
    "PREFLIGHT_EVM_TRANSACTION",
    "NISHVAULT_GUARD_TX",
  ],
  description:
    "Run one Nishvault Base mainnet x402 paid preflight before an EVM agent broadcasts a transaction.",
  validate: async (runtime) => {
    return Boolean(getSetting(runtime, "X402_BUYER_PRIVATE_KEY") && getSellerUrl(runtime));
  },
  handler: async (runtime, message, _state, options = {}, callback) => {
    try {
      const transaction = resolveTransaction(message, options);
      const preflight = await preflightTransactionRequest({
        buyerKey: getSetting(runtime, "X402_BUYER_PRIVATE_KEY"),
        sellerUrl: getSellerUrl(runtime),
        artifactRoot: getSetting(runtime, "X402_ARTIFACT_ROOT"),
        transaction,
      });
      const summary = summarizePreflightOutcome(preflight);
      const text = preflight.ok
        ? "PRE_SEND_PROOF_RECEIPT created. Nishvault pre-send guard passed; the downstream wallet step may continue."
        : `Nishvault pre-send guard blocked the transaction with status ${preflight.status}.`;
      const receipt = {
        marker: "PRE_SEND_PROOF_RECEIPT",
        network: process.env.X402_NETWORK || "eip155:8453",
        real_usdc: (process.env.X402_NETWORK || "eip155:8453") === "eip155:8453",
        receipt_status: preflight.ok ? "paid_guard_succeeded" : "paid_guard_not_confirmed",
        seller_wallet_credit_expected: Boolean(preflight.ok),
        success_signal: "external_mainnet_paid_request",
      };

      if (callback) {
        await callback({
          text,
          actions: ["NISHVAULT_PRE_SEND_GUARD"],
          data: { preflight: summary, receipt },
        });
      }

      return {
        success: Boolean(preflight.ok),
        text,
        data: {
          blocked: !preflight.ok,
          preflight: summary,
          receipt,
        },
      };
    } catch (error) {
      const text = `Nishvault pre-send guard failed: ${error.message}`;
      if (callback) {
        await callback({
          text,
          actions: ["NISHVAULT_PRE_SEND_GUARD"],
          data: { error: error.message },
        });
      }
      return {
        success: false,
        text,
        data: { error: error.message },
      };
    }
  },
  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: 'Preflight this transaction before sending: {"from":"0x1111111111111111111111111111111111111111","to":"0x2222222222222222222222222222222222222222","data":"0x","value":"0x0","chainId":"0x2105"}',
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Running Nishvault pre-send guard before broadcast.",
          actions: ["NISHVAULT_PRE_SEND_GUARD"],
        },
      },
    ],
  ],
};

export const nishvaultPlugin = {
  name: "nishvault",
  description:
    "Base mainnet pre-send x402 risk guard for ElizaOS EVM agents before transaction broadcast.",
  actions: [nishvaultPreSendGuardAction],
  providers: [],
  services: [],
};

export default nishvaultPlugin;
