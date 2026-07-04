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

function mockWallet(userRef: string): CircleWallet {
  const hash = Buffer.from(userRef).toString("hex").padEnd(40, "0").slice(0, 40);
  return {
    id: `mock-${userRef}`,
    address: `0x${hash}`,
    blockchain: "ARC-TESTNET",
    custodyType: "MOCK",
  };
}

export async function getOrCreateWallet(userRef: string): Promise<CircleWallet> {
  if (!circleConfigured()) {
    return mockWallet(userRef);
  }
  try {
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
      const errText = await res.text();
      console.warn(`Circle wallet API error (${res.status}), falling back to mock:`, errText);
      return mockWallet(userRef);
    }
    const data = await res.json();
    const wallet = data?.data?.wallets?.[0];
    if (!wallet?.address) {
      console.warn("Circle wallet API returned unexpected shape, falling back to mock:", data);
      return mockWallet(userRef);
    }
    return { id: wallet.id, address: wallet.address, blockchain: wallet.blockchain, custodyType: "DEVELOPER" };
  } catch (err) {
    console.warn("Circle wallet fetch threw, falling back to mock:", err);
    return mockWallet(userRef);
  }
}

export function isCircleLive() {
  return circleConfigured();
}