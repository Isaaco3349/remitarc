import { createHash, randomUUID, publicEncrypt, constants } from "crypto";

const CIRCLE_API_BASE = "https://api.circle.com/v1/w3s";

function circleConfigured() {
  return Boolean(
    process.env.CIRCLE_API_KEY &&
    process.env.CIRCLE_WALLET_SET_ID &&
    process.env.CIRCLE_ENTITY_SECRET
  );
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
  const hash = createHash("sha256").update(userRef).digest("hex").slice(0, 40);
  return {
    id: `mock-${userRef}`,
    address: `0x${hash}`,
    blockchain: "ARC-TESTNET",
    custodyType: "MOCK",
  };
}

// Fetches Circle's current RSA public key and encrypts your entity secret with it.
// Circle requires a FRESH ciphertext per request — it cannot be cached/reused.
async function buildEntitySecretCiphertext(): Promise<string> {
  const res = await fetch(`${CIRCLE_API_BASE}/config/entity/publicKey`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Circle public key: ${res.status} ${await res.text()}`);
  }

  const { data } = await res.json();
  const publicKey = data?.publicKey;
  if (!publicKey) {
    throw new Error("Circle public key response missing 'publicKey' field");
  }

  const entitySecret = process.env.CIRCLE_ENTITY_SECRET!;
  const entitySecretBuffer = Buffer.from(entitySecret, "hex");

  const encrypted = publicEncrypt(
    {
      key: publicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    entitySecretBuffer
  );

  return encrypted.toString("base64");
}

export async function getOrCreateWallet(userRef: string): Promise<CircleWallet> {
  if (!circleConfigured()) {
    return mockWallet(userRef);
  }
  try {
    const entitySecretCiphertext = await buildEntitySecretCiphertext();

    const res = await fetch(`${CIRCLE_API_BASE}/developer/wallets`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        idempotencyKey: randomUUID(),
        entitySecretCiphertext,
        walletSetId: process.env.CIRCLE_WALLET_SET_ID,
        blockchains: ["ARC-TESTNET"], // ⚠️ unverified — confirm this is a supported value, see note above
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