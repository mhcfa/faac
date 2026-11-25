import type { CellInputValue, FormatPreset, Table } from "f8-engine"

export const DISPLAY_SCALE_MILLIONS = 1_000_000
export const KG_DIVISORS = {
  currency: DISPLAY_SCALE_MILLIONS,
  shares: DISPLAY_SCALE_MILLIONS,
} as const

export const HISTORICAL_PERIODS = [
  "FY22",
  "FY23",
  "FY24",
  "FY25",
  "FY26",
] as const

export const FORECAST_PERIODS = [
  "FY27E",
  "FY28E",
  "FY29E",
  "FY30E",
  "FY31E",
  "FY32E",
  "FY33E",
  "FY34E",
  "FY35E",
  "FY36E",
] as const

export const ALL_PERIODS = [...HISTORICAL_PERIODS, ...FORECAST_PERIODS] as const

export type HistoricalPeriod = (typeof HISTORICAL_PERIODS)[number]
export type ForecastPeriod = (typeof FORECAST_PERIODS)[number]
export type ModelPeriod = (typeof ALL_PERIODS)[number]

export const SCENARIOS = ["Downside", "Base", "Upside"] as const
export type ScenarioName = (typeof SCENARIOS)[number]

export const SCENARIO_INDEX: Readonly<Record<ScenarioName, 1 | 2 | 3>> = {
  Downside: 1,
  Base: 2,
  Upside: 3,
}

export interface PeriodMetadata {
  readonly id: ModelPeriod
  readonly header: string
  readonly isHistorical: boolean
  readonly kgPeriodKey: string
  readonly startDate: readonly [number, number, number]
  readonly endDate: readonly [number, number, number]
  readonly fiscalDays: number
}

export const PERIOD_METADATA: Readonly<Record<ModelPeriod, PeriodMetadata>> = {
  FY22: {
    id: "FY22",
    header: "FY22A",
    isHistorical: true,
    kgPeriodKey: "2022-FY",
    startDate: [2021, 8, 30],
    endDate: [2022, 8, 28],
    fiscalDays: 364,
  },
  FY23: {
    id: "FY23",
    header: "FY23A",
    isHistorical: true,
    kgPeriodKey: "2023-FY",
    startDate: [2022, 8, 29],
    endDate: [2023, 9, 3],
    fiscalDays: 371,
  },
  FY24: {
    id: "FY24",
    header: "FY24A",
    isHistorical: true,
    kgPeriodKey: "2024-FY",
    startDate: [2023, 9, 4],
    endDate: [2024, 9, 1],
    fiscalDays: 364,
  },
  FY25: {
    id: "FY25",
    header: "FY25A",
    isHistorical: true,
    kgPeriodKey: "2025-FY",
    startDate: [2024, 9, 2],
    endDate: [2025, 8, 31],
    fiscalDays: 364,
  },
  FY26: {
    id: "FY26",
    header: "FY26A",
    isHistorical: true,
    kgPeriodKey: "2026-FY",
    startDate: [2025, 9, 1],
    endDate: [2026, 8, 30],
    fiscalDays: 364,
  },
  FY27E: {
    id: "FY27E",
    header: "FY27E",
    isHistorical: false,
    kgPeriodKey: "2027-FY",
    startDate: [2026, 8, 31],
    endDate: [2027, 8, 29],
    fiscalDays: 364,
  },
  FY28E: {
    id: "FY28E",
    header: "FY28E",
    isHistorical: false,
    kgPeriodKey: "2028-FY",
    startDate: [2027, 8, 30],
    endDate: [2028, 9, 3],
    fiscalDays: 371,
  },
  FY29E: {
    id: "FY29E",
    header: "FY29E",
    isHistorical: false,
    kgPeriodKey: "2029-FY",
    startDate: [2028, 9, 4],
    endDate: [2029, 9, 2],
    fiscalDays: 364,
  },
  FY30E: {
    id: "FY30E",
    header: "FY30E",
    isHistorical: false,
    kgPeriodKey: "2030-FY",
    startDate: [2029, 9, 3],
    endDate: [2030, 9, 1],
    fiscalDays: 364,
  },
  FY31E: {
    id: "FY31E",
    header: "FY31E",
    isHistorical: false,
    kgPeriodKey: "2031-FY",
    startDate: [2030, 9, 2],
    endDate: [2031, 8, 31],
    fiscalDays: 364,
  },
  FY32E: {
    id: "FY32E",
    header: "FY32E",
    isHistorical: false,
    kgPeriodKey: "2032-FY",
    startDate: [2031, 9, 1],
    endDate: [2032, 8, 29],
    fiscalDays: 364,
  },
  FY33E: {
    id: "FY33E",
    header: "FY33E",
    isHistorical: false,
    kgPeriodKey: "2033-FY",
    startDate: [2032, 8, 30],
    endDate: [2033, 8, 28],
    fiscalDays: 364,
  },
  FY34E: {
    id: "FY34E",
    header: "FY34E",
    isHistorical: false,
    kgPeriodKey: "2034-FY",
    startDate: [2033, 8, 29],
    endDate: [2034, 9, 3],
    fiscalDays: 371,
  },
  FY35E: {
    id: "FY35E",
    header: "FY35E",
    isHistorical: false,
    kgPeriodKey: "2035-FY",
    startDate: [2034, 9, 4],
    endDate: [2035, 9, 2],
    fiscalDays: 364,
  },
  FY36E: {
    id: "FY36E",
    header: "FY36E",
    isHistorical: false,
    kgPeriodKey: "2036-FY",
    startDate: [2035, 9, 3],
    endDate: [2036, 8, 31],
    fiscalDays: 364,
  },
}

export const VALUATION_DATE_TUPLE = [2026, 11, 13] as const
export const ANCHOR_BS_DATE_TUPLE = [2026, 8, 30] as const

export function dateFormula(d: readonly [number, number, number]): string {
  return `DATE(${d[0]}, ${d[1]}, ${d[2]})`
}

export function addTimeSeriesColumns(
  table: Table,
  options?: {
    readonly includeHistoricals?: boolean
    readonly descriptorLabel?: string
  }
): void {
  const includeHistoricals = options?.includeHistoricals ?? true
  table.addColumn("line_item", {
    role: "descriptor",
    header: options?.descriptorLabel ?? "Line item ($M)",
  })

  if (includeHistoricals) {
    for (const p of HISTORICAL_PERIODS) {
      table.addColumn(p, {
        role: "measure",
        group: "Historical",
        header: PERIOD_METADATA[p].header,
      })
    }
    table.addColumnGutter()
  }

  for (const p of FORECAST_PERIODS) {
    table.addColumn(p, {
      role: "measure",
      group: "Forecast",
      header: PERIOD_METADATA[p].header,
    })
  }
}

export function rowFormatOptions(
  format: FormatPreset,
  decimals?: number
): { readonly format: FormatPreset; readonly decimals?: number } {
  if (format === "integer" || format === "date" || format === "text") {
    return { format }
  }
  if (decimals !== undefined) {
    return { format, decimals }
  }
  return { format }
}

export function buildHistoricalCellMap<T extends number | string>(
  label: string,
  valuesByPeriod: Readonly<Record<HistoricalPeriod, T>>,
  measureNotes?: Readonly<Partial<Record<HistoricalPeriod, string>>>
): Record<string, CellInputValue> {
  const cells: Record<string, CellInputValue> = {
    line_item: label,
  }
  for (const p of HISTORICAL_PERIODS) {
    const note = measureNotes?.[p]
    cells[p] = note ? { value: valuesByPeriod[p], note } : valuesByPeriod[p]
  }
  return cells
}

export function notedNull(note: string): CellInputValue {
  return { value: null, note }
}

export function zeroForecastCells(
  firstForecastNote?: string
): Record<string, CellInputValue> {
  const cells: Record<string, CellInputValue> = {}
  for (let i = 0; i < FORECAST_PERIODS.length; i++) {
    const p = FORECAST_PERIODS[i]!
    cells[p] =
      i === 0 && firstForecastNote ? { value: 0, note: firstForecastNote } : 0
  }
  return cells
}
