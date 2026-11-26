import type { Table } from "f8-engine"
import type { UnitDisplayDivisors } from "@faac/audited-reader"

export const DISPLAY_DIVISORS: UnitDisplayDivisors = Object.freeze({
  currency: 1_000_000,
  shares: 1_000_000,
})

export const SCENARIO_KEYS = ["downside", "base", "upside"] as const
export type ScenarioKey = (typeof SCENARIO_KEYS)[number]

export const SCENARIO_INDEX: Readonly<Record<ScenarioKey, number>> =
  Object.freeze({
    downside: 1,
    base: 2,
    upside: 3,
  })

export const SCENARIO_LABELS: Readonly<Record<ScenarioKey, string>> =
  Object.freeze({
    downside: "Downside",
    base: "Base",
    upside: "Upside",
  })

export const FORECAST_PERIODS = [
  "Q4_26E",
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
  "2032E",
] as const
export type ForecastPeriod = (typeof FORECAST_PERIODS)[number]

export const FORECAST_PERIOD_HEADERS: Readonly<Record<ForecastPeriod, string>> =
  Object.freeze({
    Q4_26E: "Q4 26E",
    "2027E": "FY27E",
    "2028E": "FY28E",
    "2029E": "FY29E",
    "2030E": "FY30E",
    "2031E": "FY31E",
    "2032E": "FY32E",
  })

export const ANNUAL_HIST_COLS = [
  "2021A",
  "2022A",
  "2023A",
  "2024A",
  "2025A",
] as const
export type AnnualHistCol = (typeof ANNUAL_HIST_COLS)[number]

export const INTERIM_COLS = ["9M25A", "9M26A", "LTM", "Q4_26E"] as const
export type InterimCol = (typeof INTERIM_COLS)[number]

export const ANNUAL_PROJ_COLS = [
  "2026E",
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
  "2032E",
] as const
export type AnnualProjCol = (typeof ANNUAL_PROJ_COLS)[number]

export const ALL_FLOW_COLS = [
  ...ANNUAL_HIST_COLS,
  ...INTERIM_COLS,
  ...ANNUAL_PROJ_COLS,
] as const
export type FlowCol = (typeof ALL_FLOW_COLS)[number]

export const BS_HIST_COLS = ["2022A", "2023A", "2024A", "2025A"] as const
export type BsHistCol = (typeof BS_HIST_COLS)[number]

export const ALL_BS_COLS = [
  ...BS_HIST_COLS,
  "9M26A",
  ...ANNUAL_PROJ_COLS,
] as const
export type BsCol = (typeof ALL_BS_COLS)[number]

export const HIST_KG_FLOW_PERIOD: Readonly<
  Record<AnnualHistCol | "9M25A" | "9M26A", string>
> = Object.freeze({
  "2021A": "2021-FY",
  "2022A": "2022-FY",
  "2023A": "2023-FY",
  "2024A": "2024-FY",
  "2025A": "2025-FY",
  "9M25A": "2025-Q3-YTD",
  "9M26A": "2026-Q3-YTD",
})

export const HIST_KG_BS_PERIOD: Readonly<Record<BsHistCol | "9M26A", string>> =
  Object.freeze({
    "2022A": "2022-12-31",
    "2023A": "2023-12-31",
    "2024A": "2024-12-31",
    "2025A": "2025-12-31",
    "9M26A": "2026-09-30",
  })

export const FULL_YEAR_PROJ_COLS = [
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
  "2032E",
] as const
export type FullYearProjCol = (typeof FULL_YEAR_PROJ_COLS)[number]

export const DCF_COLS = [...FORECAST_PERIODS, "Terminal"] as const
export type DcfCol = (typeof DCF_COLS)[number]

export const VALUATION_DATE = "2026-11-20"
export const BS_ANCHOR_DATE = "2026-09-30"

/**
 * Adds the aligned shared time-series columns for flow schedules
 * (`SegmentOperatingBuild`, `IncomeStatement`, `CashFlowStatement`, `PpeCapexDaSchedule`,
 * `TaxNolSchedule`, `ShareCountSchedule`).
 */
export function addFlowTimelineColumns(table: Table): void {
  table.addColumn("line_item", {
    role: "descriptor",
    headers: ["Line item"],
  })
  for (const col of ANNUAL_HIST_COLS) {
    table.addColumn(col, {
      group: "Historical",
      headers: [`FY${col.slice(2)}`],
    })
  }
  table.addColumnGutter()
  table.addColumn("9M25A", {
    group: "Interim / LTM / Stub",
    headers: ["9M25A"],
  })
  table.addColumn("9M26A", {
    group: "Interim / LTM / Stub",
    headers: ["9M26A"],
  })
  table.addColumn("LTM", {
    group: "Interim / LTM / Stub",
    headers: ["LTM 3Q26"],
    style: "bold",
  })
  table.addColumn("Q4_26E", {
    group: "Interim / LTM / Stub",
    headers: ["Q4 26E"],
  })
  table.addColumnGutter()
  for (const col of ANNUAL_PROJ_COLS) {
    table.addColumn(col, {
      group: "Forecast",
      headers: [`FY${col.slice(2)}`],
    })
  }
}

/**
 * Adds the aligned shared time-series columns for balance-sheet / period-end
 * snapshot schedules (`BalanceSheet`, `WorkingCapitalSchedule`, `DebtLiquiditySchedule`,
 * `InvestedCapitalRoic`), placing column gutters on non-applicable flow-only slots
 * so identical fiscal years align vertically down the worksheet grid.
 */
export function addSnapshotTimelineColumns(table: Table): void {
  table.addColumn("line_item", {
    role: "descriptor",
    headers: ["Line item"],
  })
  table.addColumnGutter() // aligns under FY21A
  for (const col of BS_HIST_COLS) {
    table.addColumn(col, {
      group: "Historical",
      headers: [`FY${col.slice(2)}`],
    })
  }
  table.addColumnGutter() // regime gutter
  table.addColumnGutter() // aligns under 9M25A
  table.addColumn("9M26A", {
    group: "Q3 26",
    headers: ["Q3 26A"],
    style: "bold",
  })
  table.addColumnGutter() // aligns under LTM
  table.addColumnGutter() // aligns under Q4 26E
  table.addColumnGutter() // regime gutter
  for (const col of ANNUAL_PROJ_COLS) {
    table.addColumn(col, {
      group: "Forecast",
      headers: [`FY${col.slice(2)}`],
    })
  }
}
