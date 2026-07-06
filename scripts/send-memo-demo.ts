/**
 * Standalone demo: send 1 USDC on Arc Testnet via a direct transfer,
 * tagging it with a RemitArc-style reference. Useful to sanity-check
 * PLATFORM_PRIVATE_KEY / RPC_URL before relying on the web app, and as a
 * narratable clip for the submission video.
 *
 * Usage:
 *   npm run memo:demo -- 0xRecipientAddress
 *
 * Requires .env with PLATFORM_PRIVATE_KEY and RPC_URL set, and the sending
 * wallet funded with testnet USDC from https://faucet.circle.com/
 */
import "dotenv/config";
import { sendUsdcWithMemo } from "../lib/arc";

async function main() {
  const recipient = process.argv[2];
  if (!recipient || !recipient.startsWith("0x")) {
    console.error("Usage: npm run memo:demo -- 0xRecipientAddress");
    process.exit(1);
  }

  const reference = `RA-DEMO-${Date.now()}`;
  console.log(`Sending 1 USDC to ${recipient} with reference "${reference}"...`);

  const result = await sendUsdcWithMemo({
    recipient: recipient as `0x${string}`,
    amountUsdc: "1",
    reference,
    note: `demo:${reference}`,
  });

  console.log("\nSettled:");
  console.log("  Tx hash:    ", result.txHash);
  console.log("  Block:      ", result.blockNumber);
  console.log("  Memo ID:    ", result.memoId);
  console.log("  Explorer:   ", result.explorerUrl);
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});