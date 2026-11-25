import type { Table } from "f8-engine"

export const DISPLAY_DIVISORS = {
  currency: 1_000_000,
  shares: 1_000_000,
} as const

export const HIST_ANNUAL_PERIODS = ["FY24A", "FY25A", "FY26A"] as const
export type HistAnnualPeriod = (typeof HIST_ANNUAL_PERIODS)[number]

export const FORECAST_PERIODS = [
  "FY27E",
  "FY28E",
  "FY29E",
  "FY30E",
  "FY31E",
] as const
export type ForecastPeriod = (typeof FORECAST_PERIODS)[number]

export const ANNUAL_PERIODS = [
  ...HIST_ANNUAL_PERIODS,
  ...FORECAST_PERIODS,
] as const
export type AnnualPeriod = (typeof ANNUAL_PERIODS)[number]

export const LTM_BRIDGE_COLS = [
  "FY26A",
  "H1_FY26A",
  "H1_FY27A",
  "LTM_Q2_27",
] as const
export type LtmBridgeCol = (typeof LTM_BRIDGE_COLS)[number]

export const DCF_EXPLICIT_PERIODS = [
  "H2_FY27E",
  "FY28E",
  "FY29E",
  "FY30E",
  "FY31E",
] as const
export type DcfExplicitPeriod = (typeof DCF_EXPLICIT_PERIODS)[number]

export const SCENARIO_KEYS = ["downside", "base", "upside"] as const
export type ScenarioKey = (typeof SCENARIO_KEYS)[number]

export const SCENARIO_INDEX: Readonly<Record<ScenarioKey, 1 | 2 | 3>> = {
  downside: 1,
  base: 2,
  upside: 3,
}

export const HIST_PERIOD_TO_KG: Readonly<Record<HistAnnualPeriod, string>> = {
  FY24A: "2024-FY",
  FY25A: "2025-FY",
  FY26A: "2026-FY",
}

export const PEER_TICKERS = [
  "ADBE",
  "INTU",
  "NOW",
  "WDAY",
  "HUBS",
  "ORCL",
] as const
export type PeerTicker = (typeof PEER_TICKERS)[number]

export const ALL_EQUITY_TICKERS = ["CRM", ...PEER_TICKERS] as const
export type EquityTicker = (typeof ALL_EQUITY_TICKERS)[number]

export const MARKET_TICKERS = ["SPY", ...ALL_EQUITY_TICKERS] as const
export type MarketTicker = (typeof MARKET_TICKERS)[number]

export const VALUATION_AS_OF_DATE = "2026-11-18"
export const BS_ANCHOR_DATE = "2026-07-31"
export const MACRO_TREASURY_DATE = "2026-11-17"
export const MACRO_OAS_DATE = "2026-11-18"

export function addAnnualColumns(
  table: Table,
  descriptorHeader = "Line item"
): void {
  table.addColumn("item", { role: "descriptor", header: descriptorHeader })
  for (const period of HIST_ANNUAL_PERIODS) {
    table.addColumn(period, {
      header: period,
      group: "Historical",
    })
  }
  table.addColumnGutter()
  for (const period of FORECAST_PERIODS) {
    table.addColumn(period, {
      header: period,
      group: "Forecast",
    })
  }
}

export function addForecastColumns(
  table: Table,
  descriptorHeader = "Driver"
): void {
  table.addColumn("item", { role: "descriptor", header: descriptorHeader })
  for (const period of FORECAST_PERIODS) {
    table.addColumn(period, {
      header: period,
      group: "Forecast",
    })
  }
}

export function wrapSubtitle(
  input: string | readonly string[],
  maxChars: number
): readonly string[] {
  const rawLines = typeof input === "string" ? [input] : input
  const out: string[] = []
  for (const raw of rawLines) {
    const words = raw.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) continue
    let current = words[0] ?? ""
    for (let i = 1; i < words.length; i += 1) {
      const next = words[i]
      if (next === undefined) continue
      if (current.length + 1 + next.length <= maxChars) {
        current = `${current} ${next}`
      } else {
        out.push(current)
        current = next
      }
    }
    if (current.length > 0) {
      out.push(current)
    }
  }
  return out
}
