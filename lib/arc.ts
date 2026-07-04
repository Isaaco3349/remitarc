import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  keccak256,
  stringToHex,
  parseUnits,
  formatUnits,
  getAddress,
  parseEventLogs,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// --- Arc Testnet chain definition ---
// Mirrors viem/chains' arcTestnet; defined locally so the app doesn't
// depend on a specific viem version shipping the chain preset.
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
export const MEMO_ADDRESS: Address = getAddress(
  "0x5294E9927c3306DcBaDb03fe70b92e01cCede505"
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

const memoAbi = [
  {
    type: "function",
    name: "memo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "memoId", type: "bytes32" },
      { name: "memoData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "BeforeMemo",
    inputs: [{ name: "memoIndex", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "Memo",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "callDataHash", type: "bytes32", indexed: false },
      { name: "memoId", type: "bytes32", indexed: true },
      { name: "memo", type: "bytes", indexed: false },
      { name: "memoIndex", type: "uint256", indexed: false },
    ],
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
 * Builds a stable bytes32 memoId from a human-readable reference
 * (e.g. a RemitArc transfer reference like "RA-2026-000123").
 * Reusing the same reference always resolves to the same memoId,
 * which is what makes onchain reconciliation possible later.
 */
export function memoIdFromReference(reference: string): Hex {
  return keccak256(stringToHex(reference));
}

export interface SendUsdcWithMemoParams {
  recipient: Address;
  amountUsdc: string; // human units, e.g. "245.30"
  reference: string; // e.g. "RA-2026-000123" — becomes the memoId
  note?: string; // free-text memo payload, e.g. "payout:KE:mpesa:0712345678"
}

export interface SendUsdcWithMemoResult {
  txHash: Hex;
  blockNumber: string;
  memoId: Hex;
  explorerUrl: string;
}

/**
 * Sends USDC on Arc Testnet via the Memo contract, attaching a structured
 * memoId + memo payload to the transfer. This is the core settlement
 * primitive RemitArc uses for every leg of a remittance (sender -> platform
 * liquidity wallet -> simulated cash-out), so every hop is reconcilable
 * onchain by reference number.
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
    // Simulation mode — no funded testnet key configured yet.
    const fakeHash = keccak256(stringToHex(params.reference + Date.now()));
    return {
      txHash: fakeHash,
      blockNumber: "simulated",
      memoId,
      explorerUrl: `${explorerBase}/tx/${fakeHash} (simulated — set PLATFORM_PRIVATE_KEY to go live)`,
    };
  }

  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.recipient, parseUnits(params.amountUsdc, 6)],
  });

  const memoBytes = stringToHex(params.note ?? params.reference);

  const hash = await walletClient.writeContract({
    address: MEMO_ADDRESS,
    abi: memoAbi,
    functionName: "memo",
    args: [USDC_ADDRESS, transferData, memoId, memoBytes],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Memo transaction reverted: ${hash}`);
  }

  return {
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    memoId,
    explorerUrl: `${explorerBase}/tx/${hash}`,
  };
}

/**
 * Looks up Memo events for a given reference number directly from Arc,
 * by re-deriving the memoId and querying onchain logs. This is the
 * "reconciliation" feature: anyone with a reference number can prove
 * a transfer happened without needing RemitArc's database.
 */
export async function lookupByReference(
  reference: string,
  txBlockHint?: bigint
) {
  const { publicClient } = getClients();
  const memoId = memoIdFromReference(reference);

  const WINDOW = 9_000n;
  const latestBlock = await publicClient.getBlockNumber();

  let fromBlock: bigint;
  if (txBlockHint != null) {
    fromBlock = txBlockHint > 10n ? txBlockHint - 10n : 0n;
  } else {
    fromBlock = latestBlock > WINDOW ? latestBlock - WINDOW : 0n;
  }

  const logs = await publicClient.getLogs({
    address: MEMO_ADDRESS,
    event: {
      type: "event",
      name: "Memo",
      inputs: memoAbi[2].inputs,
    },
    args: { memoId },
    fromBlock,
    toBlock: "latest",
  });

  return logs;
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
