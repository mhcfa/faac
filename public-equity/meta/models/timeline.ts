import type { Table } from "f8-engine"

export type ScenarioId = "downside" | "base" | "upside"

export const SCENARIO_IDS: readonly ScenarioId[] = Object.freeze([
  "downside",
  "base",
  "upside",
])

export const SCENARIO_INDEX: Readonly<Record<ScenarioId, number>> =
  Object.freeze({
    downside: 1,
    base: 2,
    upside: 3,
  })

export const SCENARIO_LABELS: Readonly<Record<ScenarioId, string>> =
  Object.freeze({
    downside: "Downside",
    base: "Base",
    upside: "Upside",
  })

/** Full annual forecast horizon (post-2026E). */
export const FORECAST_PERIODS = [
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
] as const

export type ForecastPeriod = (typeof FORECAST_PERIODS)[number]

/** Historical flow columns on Income Statement and Cash Flow Statement. */
export const FLOW_HIST_PERIODS = [
  "2021A",
  "2022A",
  "2023A",
  "2024A",
  "2025A",
  "9M25A",
  "9M26A",
] as const

export type FlowHistPeriod = (typeof FLOW_HIST_PERIODS)[number]

/** Mapping from workbook flow period IDs to audited KG period_key values. */
export const FLOW_HIST_KG_KEYS: Readonly<Record<FlowHistPeriod, string>> =
  Object.freeze({
    "2021A": "2021-FY",
    "2022A": "2022-FY",
    "2023A": "2023-FY",
    "2024A": "2024-FY",
    "2025A": "2025-FY",
    "9M25A": "2025-Q3-YTD",
    "9M26A": "2026-Q3-YTD",
  })

/** Complete flow timeline (Income Statement, Cash Flow Statement, Operating Schedules). */
export const FLOW_ALL_PERIODS = [
  "2021A",
  "2022A",
  "2023A",
  "2024A",
  "2025A",
  "9M25A",
  "9M26A",
  "LTM Q3 26",
  "Q4 26E",
  "2026E",
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
] as const

export type FlowPeriod = (typeof FLOW_ALL_PERIODS)[number]

/** Historical Balance Sheet snapshot periods. */
export const BS_HIST_PERIODS = [
  "2022A",
  "2023A",
  "2024A",
  "2025A",
  "Q3 26A",
] as const

export type BsHistPeriod = (typeof BS_HIST_PERIODS)[number]

export const BS_HIST_KG_KEYS: Readonly<Record<BsHistPeriod, string>> =
  Object.freeze({
    "2022A": "2022-FY",
    "2023A": "2023-FY",
    "2024A": "2024-FY",
    "2025A": "2025-FY",
    "Q3 26A": "2026-Q3",
  })

/** Forecast Balance Sheet periods (2026E rolls one quarter from Q3 26A via Q4 26E flows). */
export const BS_FORECAST_PERIODS = [
  "2026E",
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
] as const

export type BsForecastPeriod = (typeof BS_FORECAST_PERIODS)[number]

export const BS_ALL_PERIODS = [
  ...BS_HIST_PERIODS,
  ...BS_FORECAST_PERIODS,
] as const

export type BsPeriod = (typeof BS_ALL_PERIODS)[number]

/** DCF explicit cash flow periods (41-day Q4 26E stub + 5 full forecast years). */
export const DCF_PERIODS = [
  "Q4 26E",
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
] as const

export type DcfPeriod = (typeof DCF_PERIODS)[number]

/** Quality of Earnings (QoE) normalization bridge periods. */
export const QOE_PERIODS = [
  "2023A",
  "2024A",
  "2025A",
  "9M26A",
  "LTM Q3 26",
  "2026E",
  "2027E",
  "2028E",
  "2029E",
  "2030E",
  "2031E",
] as const

export type QoePeriod = (typeof QOE_PERIODS)[number]

export type TimelineProfile = "flow" | "bs" | "qoe" | "flowHistLtm"

export interface TimelineColumnSpec {
  readonly id: FlowPeriod | BsPeriod
  readonly header: string
  readonly group: string
  readonly style?: "bold"
  readonly shade?: "muted"
}

type MasterTimelineSlot =
  | { readonly kind: "gutter" }
  | {
      readonly kind: "period"
      readonly flow?: TimelineColumnSpec
      readonly bs?: TimelineColumnSpec
      readonly qoe?: TimelineColumnSpec
      readonly flowHistLtm?: TimelineColumnSpec
    }

const HIST_COL = (
  id: "2021A" | "2022A" | "2023A" | "2024A" | "2025A"
): TimelineColumnSpec => ({
  id,
  header: id,
  group: "Historical",
})

const FCST_COL = (
  id: "2026E" | "2027E" | "2028E" | "2029E" | "2030E" | "2031E"
): TimelineColumnSpec => ({
  id,
  header: id,
  group: "Forecast",
})

const INTERIM_9M25: TimelineColumnSpec = {
  id: "9M25A",
  header: "9M25A",
  group: "Interim",
}

const INTERIM_9M26: TimelineColumnSpec = {
  id: "9M26A",
  header: "9M26A",
  group: "Interim",
}

const INTERIM_Q326: TimelineColumnSpec = {
  id: "Q3 26A",
  header: "Q3 26A",
  group: "Interim",
  shade: "muted",
}

const LTM_Q326: TimelineColumnSpec = {
  id: "LTM Q3 26",
  header: "LTM Q3 26",
  group: "LTM Bridge",
  style: "bold",
  shade: "muted",
}

const STUB_Q426: TimelineColumnSpec = {
  id: "Q4 26E",
  header: "Q4 26E",
  group: "Stub",
  shade: "muted",
}

/**
 * Shared physical-column timeline grid aligning flow, balance sheet, QoE, and
 * historical-only schedules across Financial Statements, Operating Schedules,
 * and Diagnostics & QoE. Regime gutters separate Historical | Interim/LTM/Stub | Forecast.
 */
const MASTER_TIMELINE_SLOTS: readonly MasterTimelineSlot[] = [
  { kind: "period", flow: HIST_COL("2021A"), flowHistLtm: HIST_COL("2021A") },
  {
    kind: "period",
    flow: HIST_COL("2022A"),
    bs: HIST_COL("2022A"),
    flowHistLtm: HIST_COL("2022A"),
  },
  {
    kind: "period",
    flow: HIST_COL("2023A"),
    bs: HIST_COL("2023A"),
    qoe: HIST_COL("2023A"),
    flowHistLtm: HIST_COL("2023A"),
  },
  {
    kind: "period",
    flow: HIST_COL("2024A"),
    bs: HIST_COL("2024A"),
    qoe: HIST_COL("2024A"),
    flowHistLtm: HIST_COL("2024A"),
  },
  {
    kind: "period",
    flow: HIST_COL("2025A"),
    bs: HIST_COL("2025A"),
    qoe: HIST_COL("2025A"),
    flowHistLtm: HIST_COL("2025A"),
  },
  { kind: "gutter" },
  { kind: "period", flow: INTERIM_9M25, flowHistLtm: INTERIM_9M25 },
  {
    kind: "period",
    flow: INTERIM_9M26,
    bs: INTERIM_Q326,
    qoe: INTERIM_9M26,
    flowHistLtm: INTERIM_9M26,
  },
  {
    kind: "period",
    flow: LTM_Q326,
    qoe: LTM_Q326,
    flowHistLtm: LTM_Q326,
  },
  { kind: "period", flow: STUB_Q426 },
  { kind: "gutter" },
  {
    kind: "period",
    flow: FCST_COL("2026E"),
    bs: FCST_COL("2026E"),
    qoe: FCST_COL("2026E"),
  },
  {
    kind: "period",
    flow: FCST_COL("2027E"),
    bs: FCST_COL("2027E"),
    qoe: FCST_COL("2027E"),
  },
  {
    kind: "period",
    flow: FCST_COL("2028E"),
    bs: FCST_COL("2028E"),
    qoe: FCST_COL("2028E"),
  },
  {
    kind: "period",
    flow: FCST_COL("2029E"),
    bs: FCST_COL("2029E"),
    qoe: FCST_COL("2029E"),
  },
  {
    kind: "period",
    flow: FCST_COL("2030E"),
    bs: FCST_COL("2030E"),
    qoe: FCST_COL("2030E"),
  },
  {
    kind: "period",
    flow: FCST_COL("2031E"),
    bs: FCST_COL("2031E"),
    qoe: FCST_COL("2031E"),
  },
]

/**
 * Adds aligned time-series columns and leading/interior/regime column gutters
 * to a table sharing the master statement timeline, omitting trailing gutters
 * past the profile's last active period.
 */
export function addTimelineColumns(
  table: Table,
  profile: TimelineProfile
): void {
  let lastIdx = -1
  for (let i = 0; i < MASTER_TIMELINE_SLOTS.length; i++) {
    const slot = MASTER_TIMELINE_SLOTS[i]
    if (slot?.kind === "period" && slot[profile] !== undefined) {
      lastIdx = i
    }
  }
  for (let i = 0; i <= lastIdx; i++) {
    const slot = MASTER_TIMELINE_SLOTS[i]
    if (slot === undefined || slot.kind === "gutter") {
      table.addColumnGutter()
      continue
    }
    const spec = slot[profile]
    if (spec === undefined) {
      table.addColumnGutter()
      continue
    }
    table.addColumn(spec.id, {
      header: spec.header,
      group: spec.group,
      style: spec.style,
      shade: spec.shade,
    })
  }
}

/**
 * Adds aligned DCF explicit-horizon columns (Q4 26E stub + 2027E-2031E) with
 * uniform 2-tier headers. Keeps Q4 26E..2031E contiguous on DcfFcff so
 * horizontal SUM slices remain valid, while inserting a leading column gutter
 * on CashYieldVsRf so 2027E-2031E align directly beneath DcfFcff.
 */
export function addDcfTimelineColumns(
  table: Table,
  includeStub: boolean
): void {
  if (includeStub) {
    table.addColumn("Q4 26E", {
      header: "Q4 26E",
      group: "41d Stub",
      shade: "muted",
    })
  } else {
    table.addColumnGutter()
  }
  for (const p of FORECAST_PERIODS) {
    table.addColumn(p, {
      header: p,
      group: "Forecast",
    })
  }
}
