import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex,
  parseUnits,
  formatUnits,
  getAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// --- Arc Testnet chain definition ---
export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL ?? "https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
} as const;

export const USDC_ADDRESS: Address = getAddress(
  "0x3600000000000000000000000000000000000000"
);

const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function getClients() {
  const rpcUrl = process.env.RPC_URL ?? "https://rpc.testnet.arc.network";
  const privateKey = process.env.PLATFORM_PRIVATE_KEY as Hex | undefined;

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl),
  });

  if (!privateKey) {
    return { publicClient, walletClient: null, account: null };
  }

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient, account };
}

/**
 * Stable id derived from a human-readable reference (e.g. "RA-2026-000123").
 * Kept for reconciliation in our own database — no longer written onchain,
 * since wrapping transfers through Arc's Memo contract hits a documented
 * protocol-level restriction on forwarding native value through a contract.
 * See: https://docs.arc.io/arc/references/evm-differences
 */
export function memoIdFromReference(reference: string): Hex {
  return keccak256(stringToHex(reference));
}

export interface SendUsdcWithMemoParams {
  recipient: Address;
  amountUsdc: string; // human units, e.g. "245.30"
  reference: string; // e.g. "RA-2026-000123"
  note?: string; // kept for our own DB record, not written onchain
}

export interface SendUsdcWithMemoResult {
  txHash: Hex;
  blockNumber: string;
  memoId: Hex;
  explorerUrl: string;
}

/**
 * Sends USDC on Arc Testnet via a direct, plain transfer().
 *
 * NOTE: We intentionally do NOT route this through Arc's Memo contract.
 * Arc's own docs state that native value transfers forwarded through an
 * intermediary contract can revert unpredictably on Arc, since USDC is
 * the native asset and moving it via a wrapping contract call hits
 * protocol-level value-transfer rules that don't exist on standard EVM
 * chains. A direct transfer avoids that entirely. The reference/memo text
 * is preserved in our own database record instead of onchain.
 *
 * Falls back to a simulated result if PLATFORM_PRIVATE_KEY is not configured,
 * so the app remains demoable before testnet credentials are wired up.
 */
export async function sendUsdcWithMemo(
  params: SendUsdcWithMemoParams
): Promise<SendUsdcWithMemoResult> {
  const { publicClient, walletClient, account } = getClients();
  const memoId = memoIdFromReference(params.reference);
  const explorerBase = arcTestnet.blockExplorers.default.url;

  if (!walletClient || !account) {
    const fakeHash = keccak256(stringToHex(params.reference + Date.now()));
    return {
      txHash: fakeHash,
      blockNumber: "simulated",
      memoId,
      explorerUrl: `${explorerBase}/tx/${fakeHash} (simulated — set PLATFORM_PRIVATE_KEY to go live)`,
    };
  }

  const amount = parseUnits(params.amountUsdc, 6);

  const hash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.recipient, amount],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Transfer transaction reverted: ${hash}`);
  }

  return {
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    memoId,
    explorerUrl: `${explorerBase}/tx/${hash}`,
  };
}

export async function getUsdcBalance(address: Address): Promise<string> {
  const { publicClient } = getClients();
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  return formatUnits(balance as bigint, 6);
}