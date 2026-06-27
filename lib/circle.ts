/**
 * Thin wrapper around Circle's Developer-Controlled Wallets API.
 *
 * IMPORTANT: This is scaffolded against the documented shape of Circle's
 * Wallets API as of the Arc hackathon docs, but you MUST verify exact
 * endpoint paths, auth headers, and the entity-secret ciphertext flow
 * against the current Circle docs (console.circle.com -> Wallets API
 * reference) before relying on it. Treat every fetch() below as a
 * checkpoint to confirm, not a finished integration.
 *
 * Until CIRCLE_API_KEY / CIRCLE_WALLET_SET_ID are set in .env, every
 * function below returns a deterministic mock so the rest of the app
 * (UI, Arc settlement, memo lookups) is fully demoable offline.
 */

const CIRCLE_API_BASE = "https://api.circle.com/v1/w3s";

function circleConfigured() {
  return Boolean(process.env.CIRCLE_API_KEY && process.env.CIRCLE_WALLET_SET_ID);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
  };
}

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  custodyType: "DEVELOPER" | "MOCK";
}

/**
 * Creates (or returns a mocked) embedded wallet for a user identified by
 * `userRef` (e.g. an email or phone number) — the actual non-crypto-native
 * sender/recipient never sees a seed phrase or private key.
 */
export async function getOrCreateWallet(userRef: string): Promise<CircleWallet> {
  if (!circleConfigured()) {
    // Deterministic mock address so the same userRef always maps to the
    // same "wallet" during local/demo runs.
    const hash = Buffer.from(userRef).toString("hex").padEnd(40, "0").slice(0, 40);
    return {
      id: `mock-${userRef}`,
      address: `0x${hash}`,
      blockchain: "ARC-TESTNET",
      custodyType: "MOCK",
    };
  }

  // TODO confirm exact path + payload shape against current Circle docs.
  const res = await fetch(`${CIRCLE_API_BASE}/developer/wallets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
      blockchains: ["ARC-TESTNET"],
      metadata: [{ name: userRef }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Circle wallet creation failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const wallet = data?.data?.wallets?.[0];
  return {
    id: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    custodyType: "DEVELOPER",
  };
}

export function isCircleLive() {
  return circleConfigured();
}
