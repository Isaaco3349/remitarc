/**
 * Static reference data for the UAE -> Africa remittance corridor.
 *
 * Numbers below are illustrative placeholders sourced from typical published
 * remittance-cost ranges (e.g. World Bank Remittance Prices Worldwide
 * surveys and exchange-house rate cards). BEFORE recording the demo video,
 * replace these with a couple of real, citable data points for your chosen
 * corridor(s) so the comparison holds up to scrutiny.
 */

export type Corridor = "KE" | "NG" | "UG" | "EG";

export interface CorridorInfo {
  code: Corridor;
  country: string;
  currency: string;
  flag: string;
  cashOutMethod: string;
  traditionalFeePct: number; // typical % fee via exchange house / MTO
  traditionalSpeedHours: number;
  aedToLocalRate: number; // illustrative AED -> local currency rate
}

export const CORRIDORS: Record<Corridor, CorridorInfo> = {
  KE: {
    code: "KE",
    country: "Kenya",
    currency: "KES",
    flag: "🇰🇪",
    cashOutMethod: "M-Pesa",
    traditionalFeePct: 6.5,
    traditionalSpeedHours: 24,
    aedToLocalRate: 35.1,
  },
  NG: {
    code: "NG",
    country: "Nigeria",
    currency: "NGN",
    flag: "🇳🇬",
    cashOutMethod: "MTN MoMo / Bank Transfer",
    traditionalFeePct: 7.8,
    traditionalSpeedHours: 48,
    aedToLocalRate: 410.0,
  },
  UG: {
    code: "UG",
    country: "Uganda",
    currency: "UGX",
    flag: "🇺🇬",
    cashOutMethod: "MTN MoMo",
    traditionalFeePct: 7.2,
    traditionalSpeedHours: 36,
    aedToLocalRate: 985.0,
  },
  EG: {
    code: "EG",
    country: "Egypt",
    currency: "EGP",
    flag: "🇪🇬",
    cashOutMethod: "Bank Transfer / Fawry",
    traditionalFeePct: 5.4,
    traditionalSpeedHours: 24,
    aedToLocalRate: 13.4,
  },
};

const AED_TO_USDC_RATE = 0.2723; // ~1 AED in USD, illustrative peg-adjacent rate
const REMITARC_FLAT_FEE_USDC = 0.5; // flat fee, in USDC, for the demo
const REMITARC_FX_SPREAD_PCT = 0.3; // small spread vs. AED_TO_USDC_RATE

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
  const remitArcFeeUsdEquivalent =
    sendAed * AED_TO_USDC_RATE - netUsdc / (1 - REMITARC_FX_SPREAD_PCT / 100) + REMITARC_FLAT_FEE_USDC;

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
    remitArcSpeedSeconds: 6,
    traditionalSpeedHours: info.traditionalSpeedHours,
  };
}
