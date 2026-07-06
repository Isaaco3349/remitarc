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
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
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

export function memoIdFromReference(reference: string): Hex {
  return keccak256(stringToHex(reference));
}

export interface SendUsdcWithMemoParams {
  recipient: Address;
  amountUsdc: string;
  reference: string;
  note?: string;
}

export interface SendUsdcWithMemoResult {
  txHash: Hex;
  blockNumber: string;
  memoId: Hex;
  explorerUrl: string;
  approveTxHash?: Hex;
}

/**
 * Ensures the Memo contract is approved to move `amount` USDC on behalf of
 * the platform wallet. Only sends an approve() tx if the current allowance
 * is insufficient — avoids a redundant tx (and its gas/time cost) on repeat
 * sends once approval is already in place.
 */
async function ensureAllowance(
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: NonNullable<ReturnType<typeof getClients>["walletClient"]>,
  owner: Address,
  amount: bigint
): Promise<Hex | undefined> {
  const currentAllowance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, MEMO_ADDRESS],
  })) as bigint;

  if (currentAllowance >= amount) {
    return undefined; // already approved enough, skip
  }

  // Approve a large amount so we don't have to re-approve every single send.
  const approveAmount = amount * 1000n;

  const approveHash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "approve",
    args: [MEMO_ADDRESS, approveAmount],
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  return approveHash;
}

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

  // Make sure the Memo contract is allowed to move funds from our wallet
  // before it tries to, otherwise transferFrom() reverts.
  const approveTxHash = await ensureAllowance(
    publicClient,
    walletClient,
    account.address,
    amount
  );

  // Use transferFrom (not transfer) — memo() executes this call as itself,
  // so it must move funds FROM our wallet explicitly via allowance,
  // rather than trying to send from its own (empty) balance.
  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transferFrom",
    args: [account.address, params.recipient, amount],
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
    approveTxHash,
  };
}

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