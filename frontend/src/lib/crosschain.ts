const BASE_URL = "https://1click.chaindefuser.com";

const NEAR_USDC_ASSET =
  "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

// ─── Chain Config ─────────────────────────────────────────────

export interface ChainInfo {
  name: string;
  assetId: string;
  /** USDC decimals on this chain */
  decimals: number;
  /** Chain icon label */
  shortName: string;
}

export const SUPPORTED_CHAINS: Record<string, ChainInfo> = {
  ethereum: {
    name: "Ethereum",
    assetId: "eth:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    shortName: "ETH",
  },
  arbitrum: {
    name: "Arbitrum",
    assetId: "arb:0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    decimals: 6,
    shortName: "ARB",
  },
  base: {
    name: "Base",
    assetId: "base:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    shortName: "BASE",
  },
  optimism: {
    name: "Optimism",
    assetId: "oeth:0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    decimals: 6,
    shortName: "OP",
  },
  polygon: {
    name: "Polygon",
    assetId: "pol:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    decimals: 6,
    shortName: "POL",
  },
};

// ─── Types ────────────────────────────────────────────────────

export interface QuoteResponse {
  id: string;
  depositAddress: string;
  fromAsset: string;
  toAsset: string;
  amount: string;
  [key: string]: unknown;
}

export type DepositStatus =
  | "PENDING_DEPOSIT"
  | "KNOWN_DEPOSIT_TX"
  | "PROCESSING"
  | "SUCCESS";

export interface StatusResponse {
  status: DepositStatus;
  [key: string]: unknown;
}

// ─── API Functions ────────────────────────────────────────────

/**
 * Request a quote / deposit address from the 1Click API.
 * `amount` is in human-readable USDC (e.g. "50.00"). It will be
 * converted to the smallest unit (micro-USDC, 6 decimals).
 */
export async function getQuote(
  chainKey: string,
  amount: string,
  toAddress: string
): Promise<QuoteResponse> {
  const chain = SUPPORTED_CHAINS[chainKey];
  if (!chain) throw new Error(`Unsupported chain: ${chainKey}`);

  // Convert human amount to smallest unit (6 decimals for USDC)
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) throw new Error("Invalid amount");
  const microAmount = Math.round(parsed * 10 ** chain.decimals).toString();

  const res = await fetch(`${BASE_URL}/v0/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromAsset: chain.assetId,
      toAsset: NEAR_USDC_ASSET,
      amount: microAmount,
      toAddress,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Quote request failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Submit a deposit transaction hash to speed up detection.
 */
export async function submitDeposit(
  quoteId: string,
  txHash: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/v0/deposit/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteId, txHash }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Deposit submit failed (${res.status}): ${text}`);
  }
}

/**
 * Poll the status of a deposit by quote ID.
 */
export async function getStatus(quoteId: string): Promise<StatusResponse> {
  const res = await fetch(
    `${BASE_URL}/v0/status?quoteId=${encodeURIComponent(quoteId)}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Status check failed (${res.status}): ${text}`);
  }

  return res.json();
}
