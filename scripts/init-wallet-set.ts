import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import "dotenv/config";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

async function main() {
  const response = await client.createWalletSet({
    name: "RemitArc-Main",
  });

  console.log("Wallet Set created:");
  console.log(response.data?.walletSet);
}

main().catch((err) => {
  console.error("Failed to create wallet set:", err);
});