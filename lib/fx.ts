/**
 * Static reference data for the UAE -> Africa remittance corridors.
 *
 * Exchange rates: Wise/Xe mid-market averages, July 2026
 * Traditional fees: World Bank Remittance Prices Worldwide Q1-2025,
 *   Monito/Profee/Afrotools corridor comparison data, July 2026
 */

export type Corridor = "KE" | "NG" | "GH" | "CM" | "EG";

export interface CorridorInfo {
  code: Corridor;
  country: string;
  currency: string;
  flag: string;
  cashOutMethod: string;
  traditionalFeePct: number;
  traditionalSpeedHours: number;
  aedToLocalRate: number;
}

export const CORRIDORS: Record<Corridor, CorridorInfo> = {
  KE: {
    code: "KE",
    country: "Kenya",
    currency: "KES",
    flag: "🇰🇪",
    cashOutMethod: "M-Pesa",
    traditionalFeePct: 4.5,   // WU blended fee+FX markup — Monito UAE→KE July 2026
    traditionalSpeedHours: 24,
    aedToLocalRate: 35.22,    // Wise 30-day avg July 2026
  },
  NG: {
    code: "NG",
    country: "Nigeria",
    currency: "NGN",
    flag: "🇳🇬",
    cashOutMethod: "MTN MoMo / Bank Transfer",
    traditionalFeePct: 5.5,   // World Bank SSA corridor avg Q1-2025
    traditionalSpeedHours: 48,
    aedToLocalRate: 374.24,   // Wise 30-day avg July 2026
  },
  GH: {
    code: "GH",
    country: "Ghana",
    currency: "GHS",
    flag: "🇬🇭",
    cashOutMethod: "MTN MoMo",
    traditionalFeePct: 5.0,   // Afrotools Ghana remittance guide 2026
    traditionalSpeedHours: 24,
    aedToLocalRate: 3.08,     // Xe mid-market June 30 2026
  },
  CM: {
    code: "CM",
    country: "Cameroon",
    currency: "XAF",
    flag: "🇨🇲",
    cashOutMethod: "Orange Money / MTN MoMo",
    traditionalFeePct: 6.5,   // World Bank — Cameroon among highest-cost SSA corridors
    traditionalSpeedHours: 48,
    aedToLocalRate: 153.22,   // Wise 30-day avg AED→XAF July 2026
  },
  EG: {
    code: "EG",
    country: "Egypt",
    currency: "EGP",
    flag: "🇪🇬",
    cashOutMethod: "Bank Transfer / Fawry",
    traditionalFeePct: 4.0,   // Profee corridor comparison 2026
    traditionalSpeedHours: 24,
    aedToLocalRate: 13.52,    // Xe mid-market July 2026
  },
};

const AED_TO_USDC_RATE = 0.2723;       // AED pegged to USD at 3.6725
const REMITARC_FLAT_FEE_USDC = 0.5;
const REMITARC_FX_SPREAD_PCT = 0.3;

export interface Quote {
  corridor: CorridorInfo;
  sendAed: number;
  usdcAmount: number;
  remitArcFeeUsdc: number;
  recipientLocalAmount: number;
  traditionalFeeAed: number;
  traditionalFeeUsdEquivalent: number;
  savingsUsdEquivalent: number;
  remitArcSpeedSeconds: number;
  traditionalSpeedHours: number;
}

export function getQuote(corridor: Corridor, sendAed: number): Quote {
  const info = CORRIDORS[corridor];
  const effectiveRate = AED_TO_USDC_RATE * (1 - REMITARC_FX_SPREAD_PCT / 100);
  const usdcAmount = sendAed * effectiveRate;
  const netUsdc = Math.max(usdcAmount - REMITARC_FLAT_FEE_USDC, 0);
  const recipientLocalAmount =
    (netUsdc / AED_TO_USDC_RATE) * info.aedToLocalRate;

  const traditionalFeeAed = sendAed * (info.traditionalFeePct / 100);
  const traditionalFeeUsdEquivalent = traditionalFeeAed * AED_TO_USDC_RATE;

  return {
    corridor: info,
    sendAed,
    usdcAmount,
    remitArcFeeUsdc: REMITARC_FLAT_FEE_USDC,
    recipientLocalAmount,
    traditionalFeeAed,
    traditionalFeeUsdEquivalent,
    savingsUsdEquivalent: Math.max(
      traditionalFeeUsdEquivalent - REMITARC_FLAT_FEE_USDC,
      0
    ),
    remitArcSpeedSeconds: 12,  // Arc testnet confirmed ~12s finality
    traditionalSpeedHours: info.traditionalSpeedHours,
  };
}