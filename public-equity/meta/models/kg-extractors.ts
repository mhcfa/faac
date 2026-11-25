import { compileKgFromDir, type KgRegistry, type ValQueryOptions } from "@faac/audited-reader"
import { DISPLAY_DIVISORS } from "./scale.ts"
import {
  BS_HIST_KG_KEYS,
  FLOW_HIST_KG_KEYS,
  type BsHistPeriod,
  type FlowHistPeriod,
} from "./timeline.ts"

export type PeerTicker = "GOOGL" | "AMZN" | "MSFT" | "PINS" | "SNAP" | "RDDT"
export type MarketTicker = "GSPC" | "META" | PeerTicker

export const PEER_GROUP_A: readonly PeerTicker[] = Object.freeze([
  "GOOGL",
  "AMZN",
  "MSFT",
])

export const PEER_GROUP_B: readonly PeerTicker[] = Object.freeze([
  "PINS",
  "SNAP",
  "RDDT",
])

export const ALL_PEERS: readonly PeerTicker[] = Object.freeze([
  ...PEER_GROUP_A,
  ...PEER_GROUP_B,
])

export const ALL_MARKET_TICKERS: readonly MarketTicker[] = Object.freeze([
  "GSPC",
  "META",
  ...ALL_PEERS,
])

function isMarketTicker(value: string): value is MarketTicker {
  return (
    value === "GSPC" ||
    value === "META" ||
    value === "GOOGL" ||
    value === "AMZN" ||
    value === "MSFT" ||
    value === "PINS" ||
    value === "SNAP" ||
    value === "RDDT"
  )
}

export interface PeerDefinition {
  readonly ticker: PeerTicker
  readonly name: string
  readonly group: "A" | "B"
  readonly fyPeriod: string
  readonly ytdCurrentPeriod: string
  readonly ytdPriorPeriod: string
  readonly bsPeriod: string
  readonly epsFy0Period: string | null
  readonly epsFy1Period: string
  readonly epsFy2Period: string
  readonly epsFy3Period: string
  readonly flpSchedule: "peer_cash_flow" | "peer_lease_cash_flows" | null
  readonly flpRowId: string | null
}

export const PEER_DEFINITIONS: readonly PeerDefinition[] = Object.freeze([
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    group: "A",
    fyPeriod: "2025-FY",
    ytdCurrentPeriod: "2026-Q3-YTD",
    ytdPriorPeriod: "2025-Q3-YTD",
    bsPeriod: "2026-Q3",
    epsFy0Period: null,
    epsFy1Period: "2026-FY",
    epsFy2Period: "2027-FY",
    epsFy3Period: "2028-FY",
    flpSchedule: "peer_lease_cash_flows",
    flpRowId: "finance_lease_principal_cash_flow",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    group: "A",
    fyPeriod: "2025-FY",
    ytdCurrentPeriod: "2026-Q3-YTD",
    ytdPriorPeriod: "2025-Q3-YTD",
    bsPeriod: "2026-Q3",
    epsFy0Period: null,
    epsFy1Period: "2026-FY",
    epsFy2Period: "2027-FY",
    epsFy3Period: "2028-FY",
    flpSchedule: "peer_cash_flow",
    flpRowId: "finance_lease_principal",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    group: "A",
    fyPeriod: "2026-FY",
    ytdCurrentPeriod: "2027-Q1",
    ytdPriorPeriod: "2026-Q1",
    bsPeriod: "2027-Q1",
    epsFy0Period: "2026-FY",
    epsFy1Period: "2027-FY",
    epsFy2Period: "2028-FY",
    epsFy3Period: "2029-FY",
    flpSchedule: "peer_lease_cash_flows",
    flpRowId: "finance_lease_principal_cash_flow",
  },
  {
    ticker: "PINS",
    name: "Pinterest, Inc.",
    group: "B",
    fyPeriod: "2025-FY",
    ytdCurrentPeriod: "2026-Q3-YTD",
    ytdPriorPeriod: "2025-Q3-YTD",
    bsPeriod: "2026-Q3",
    epsFy0Period: null,
    epsFy1Period: "2026-FY",
    epsFy2Period: "2027-FY",
    epsFy3Period: "2028-FY",
    flpSchedule: null,
    flpRowId: null,
  },
  {
    ticker: "SNAP",
    name: "Snap Inc.",
    group: "B",
    fyPeriod: "2025-FY",
    ytdCurrentPeriod: "2026-Q3-YTD",
    ytdPriorPeriod: "2025-Q3-YTD",
    bsPeriod: "2026-Q3",
    epsFy0Period: null,
    epsFy1Period: "2026-FY",
    epsFy2Period: "2027-FY",
    epsFy3Period: "2028-FY",
    flpSchedule: null,
    flpRowId: null,
  },
  {
    ticker: "RDDT",
    name: "Reddit, Inc.",
    group: "B",
    fyPeriod: "2025-FY",
    ytdCurrentPeriod: "2026-Q3-YTD",
    ytdPriorPeriod: "2025-Q3-YTD",
    bsPeriod: "2026-Q3",
    epsFy0Period: null,
    epsFy1Period: "2026-FY",
    epsFy2Period: "2027-FY",
    epsFy3Period: "2028-FY",
    flpSchedule: null,
    flpRowId: null,
  },
])

export interface PriceSeriesPanel {
  readonly periods: readonly string[]
  readonly values: Readonly<
    Record<MarketTicker, Readonly<Record<string, number | null>>>
  >
}

export interface AuditedModelData {
  readonly kg: KgRegistry
  val(
    scheduleId: string,
    rowId: string,
    periodKey: string,
    opts?: {
      readonly entity?: string
      readonly basis?: ValQueryOptions["basis"]
    }
  ): number
  optVal(
    scheduleId: string,
    rowId: string,
    periodKey: string,
    opts?: {
      readonly entity?: string
      readonly basis?: ValQueryOptions["basis"]
    }
  ): number | null
  zeroIfAbsent(
    scheduleId: string,
    rowId: string,
    periodKey: string,
    opts?: {
      readonly entity?: string
      readonly basis?: ValQueryOptions["basis"]
    }
  ): number
  flowSeries(
    scheduleId: string,
    rowId: string,
    opts?: {
      readonly basis?: ValQueryOptions["basis"]
      readonly zeroPeriods?: readonly FlowHistPeriod[]
      readonly defaultZero?: boolean
    }
  ): Readonly<Record<FlowHistPeriod, number>>
  bsSeries(
    scheduleId: string,
    rowId: string,
    opts?: {
      readonly zeroPeriods?: readonly BsHistPeriod[]
      readonly defaultZero?: boolean
    }
  ): Readonly<Record<BsHistPeriod, number>>
  readonly monthlyPrices5Y: PriceSeriesPanel
  readonly weeklyPrices2Y: PriceSeriesPanel
}

function loadPricePanel(
  kg: KgRegistry,
  scheduleId: "monthly_adj_close" | "weekly_adj_close",
  maxPeriodInclusive: string
): PriceSeriesPanel {
  const breakdown = kg.breakdown(scheduleId, "adj_close", {
    by: "entity",
    basis: "market",
    divisors: DISPLAY_DIVISORS,
  })

  const periods = breakdown.periods.filter((p) => p <= maxPeriodInclusive)
  const byTicker: Record<MarketTicker, Record<string, number | null>> = {
    GSPC: {},
    META: {},
    GOOGL: {},
    AMZN: {},
    MSFT: {},
    PINS: {},
    SNAP: {},
    RDDT: {},
  }

  for (const t of ALL_MARKET_TICKERS) {
    for (const p of periods) {
      byTicker[t][p] = null
    }
  }

  for (const group of breakdown.groups) {
    if (group.key === null || !isMarketTicker(group.key)) {
      continue
    }
    for (const p of periods) {
      const num = group.values[p]
      if (typeof num === "number" && Number.isFinite(num)) {
        byTicker[group.key][p] = num
      }
    }
  }

  for (const t of ALL_MARKET_TICKERS) {
    Object.freeze(byTicker[t])
  }

  return Object.freeze({
    periods: Object.freeze(periods),
    values: Object.freeze(byTicker),
  })
}

let cachedData: AuditedModelData | null = null

export function loadAuditedModelData(): AuditedModelData {
  if (cachedData !== null) {
    return cachedData
  }

  const kg = compileKgFromDir("data/audited")

  function optVal(
    scheduleId: string,
    rowId: string,
    periodKey: string,
    opts?: {
      readonly entity?: string
      readonly basis?: ValQueryOptions["basis"]
    }
  ): number | null {
    const queryOpts: {
      divisors: typeof DISPLAY_DIVISORS
      entity?: string
      basis?: ValQueryOptions["basis"]
    } = { divisors: DISPLAY_DIVISORS }
    if (opts?.entity !== undefined) {
      queryOpts.entity = opts.entity
    }
    if (opts?.basis !== undefined) {
      queryOpts.basis = opts.basis
    }
    const v = kg.val(scheduleId, rowId, periodKey, queryOpts)
    return typeof v === "number" && Number.isFinite(v) ? v : null
  }

  function val(
    scheduleId: string,
    rowId: string,
    periodKey: string,
    opts?: {
      readonly entity?: string
      readonly basis?: ValQueryOptions["basis"]
    }
  ): number {
    const v = optVal(scheduleId, rowId, periodKey, opts)
    if (v === null) {
      throw new Error(
        `Missing audited cell: schedule=${scheduleId}, row=${rowId}, period=${periodKey}, entity=${opts?.entity ?? "default"}`
      )
    }
    return v
  }

  function zeroIfAbsent(
    scheduleId: string,
    rowId: string,
    periodKey: string,
    opts?: {
      readonly entity?: string
      readonly basis?: ValQueryOptions["basis"]
    }
  ): number {
    return optVal(scheduleId, rowId, periodKey, opts) ?? 0
  }

  function flowSeries(
    scheduleId: string,
    rowId: string,
    opts?: {
      readonly basis?: ValQueryOptions["basis"]
      readonly zeroPeriods?: readonly FlowHistPeriod[]
      readonly defaultZero?: boolean
    }
  ): Readonly<Record<FlowHistPeriod, number>> {
    const zeroSet = new Set(opts?.zeroPeriods ?? [])
    const readOne = (p: FlowHistPeriod): number => {
      if (zeroSet.has(p)) {
        return 0
      }
      const kgKey = FLOW_HIST_KG_KEYS[p]
      const v = optVal(scheduleId, rowId, kgKey, {
        entity: "META",
        basis: opts?.basis,
      })
      if (v === null) {
        if (opts?.defaultZero === true) {
          return 0
        }
        throw new Error(`Missing flow cell: ${scheduleId}.${rowId}[${kgKey}]`)
      }
      return v
    }
    const map: Record<FlowHistPeriod, number> = {
      "2021A": readOne("2021A"),
      "2022A": readOne("2022A"),
      "2023A": readOne("2023A"),
      "2024A": readOne("2024A"),
      "2025A": readOne("2025A"),
      "9M25A": readOne("9M25A"),
      "9M26A": readOne("9M26A"),
    }
    return Object.freeze(map)
  }

  function bsSeries(
    scheduleId: string,
    rowId: string,
    opts?: {
      readonly zeroPeriods?: readonly BsHistPeriod[]
      readonly defaultZero?: boolean
    }
  ): Readonly<Record<BsHistPeriod, number>> {
    const zeroSet = new Set(opts?.zeroPeriods ?? [])
    const readOne = (p: BsHistPeriod): number => {
      if (zeroSet.has(p)) {
        return 0
      }
      const kgKey = BS_HIST_KG_KEYS[p]
      const v = optVal(scheduleId, rowId, kgKey, { entity: "META" })
      if (v === null) {
        if (opts?.defaultZero === true) {
          return 0
        }
        throw new Error(
          `Missing balance sheet cell: ${scheduleId}.${rowId}[${kgKey}]`
        )
      }
      return v
    }
    const map: Record<BsHistPeriod, number> = {
      "2022A": readOne("2022A"),
      "2023A": readOne("2023A"),
      "2024A": readOne("2024A"),
      "2025A": readOne("2025A"),
      "Q3 26A": readOne("Q3 26A"),
    }
    return Object.freeze(map)
  }

  const monthlyPrices5Y = loadPricePanel(kg, "monthly_adj_close", "2026-10-01")
  const weeklyPrices2Y = loadPricePanel(kg, "weekly_adj_close", "2026-11-16")

  cachedData = Object.freeze({
    kg,
    val,
    optVal,
    zeroIfAbsent,
    flowSeries,
    bsSeries,
    monthlyPrices5Y,
    weeklyPrices2Y,
  })
  return cachedData
}
