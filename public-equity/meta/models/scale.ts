import type { UnitDisplayDivisors } from "@faac/audited-reader"

/**
 * Shared display scale divisors applied uniformly across all KgRegistry
 * historical/benchmark extractors, level drivers, and workbook subtitles.
 * Monetary lines are expressed in USD millions ($M) and share counts in millions (M).
 */
export const DISPLAY_DIVISORS: Readonly<UnitDisplayDivisors> = Object.freeze({
  currency: 1_000_000,
  shares: 1_000_000,
})

export const SCALE_NOTE_USD_M = "($ in millions, except per-share data)"
export const VALUATION_AS_OF_DATE = "2026-11-20"
export const RATES_AS_OF_DATE = "2026-11-19"
