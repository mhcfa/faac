import type { FormatPreset } from "f8-engine"
import {
  FORECAST_PERIODS,
  type ForecastPeriod,
  type ScenarioId,
} from "../timeline.ts"

export interface DriverMeta {
  readonly label: string
  readonly format: FormatPreset
  readonly decimals?: number
  readonly category: string
  readonly rationale: string
  readonly basis?: string
  readonly source?: string
  /** Code-only audit tag; strictly omitted from all rendered Excel text/notes. */
  readonly gapId?: string
}

export interface Driver<T> {
  readonly value: T
  readonly meta: DriverMeta
}

export type PeriodVector = Readonly<Record<ForecastPeriod, number>>

export function scalarDriver(value: number, meta: DriverMeta): Driver<number> {
  if (!Number.isFinite(value)) {
    throw new Error(`${meta.label}: scalar driver value must be finite`)
  }
  return Object.freeze({
    value,
    meta: Object.freeze({ ...meta }),
  })
}

export function periodDriver(
  value: PeriodVector,
  meta: DriverMeta
): Driver<PeriodVector> {
  const keys = Object.keys(value)
  if (
    keys.length !== FORECAST_PERIODS.length ||
    FORECAST_PERIODS.some(
      (p) => !Object.hasOwn(value, p) || !Number.isFinite(value[p])
    )
  ) {
    throw new Error(
      `${meta.label}: period keys [${keys.join(", ")}] != [${FORECAST_PERIODS.join(", ")}]`
    )
  }
  return Object.freeze({
    value: Object.freeze({ ...value }),
    meta: Object.freeze({ ...meta }),
  })
}

/**
 * Formats concise visible driver provenance (basis and source) for compact
 * descriptor columns on the Assumptions sheet. Strictly omits code-only gapId.
 */
export function formatDriverBasisSource(meta: DriverMeta): string {
  const parts: string[] = []
  if (meta.basis !== undefined && meta.basis.length > 0) {
    parts.push(meta.basis)
  }
  if (meta.source !== undefined && meta.source.length > 0) {
    parts.push(meta.source)
  }
  return parts.join(" — ")
}

/**
 * Formats concise scenario-flex difference provenance (basis + rationale) for
 * flexed non-base scenario tables without repeating base source citations.
 */
export function formatDriverDiff(meta: DriverMeta): string {
  const parts: string[] = []
  if (meta.basis !== undefined && meta.basis.length > 0) {
    parts.push(`${meta.basis}:`)
  }
  parts.push(meta.rationale)
  return parts.join(" ")
}

export interface OperatingVectorDrivers {
  readonly foaRevenueGrowth: Driver<PeriodVector>
  readonly foaOtherRevShareOfFoa: Driver<PeriodVector>
  readonly rlRevenueGrowth: Driver<PeriodVector>
  readonly foaCashOpexPctFoaRev: Driver<PeriodVector>
  readonly rlOperatingLoss: Driver<PeriodVector>
  readonly capexPctRevenue: Driver<PeriodVector>
  readonly daPctBegNetPpe: Driver<PeriodVector>
  readonly sbcPctRevenue: Driver<PeriodVector>
  readonly apPctRevenue: Driver<PeriodVector>
  readonly opAccruedPctRevenue: Driver<PeriodVector>
  readonly commonDividendPerShare: Driver<PeriodVector>
  readonly annualShareRepurchases: Driver<PeriodVector>
}

export interface OperatingScalarDrivers {
  readonly q4RevenueGuidance: Driver<number>
  readonly q4RlRevenue: Driver<number>
  readonly q4FoaOtherRevenue: Driver<number>
  readonly fy26TotalGaapExpenses: Driver<number>
  readonly fy26RlOperatingLoss: Driver<number>
  readonly fy26TotalCapex: Driver<number>
  readonly q4DaAnnualizedRate: Driver<number>
  readonly q4SbcPctRevenue: Driver<number>
  readonly financeLeaseCapexShare: Driver<number>
  readonly effectiveTaxRate: Driver<number>
  readonly arDays: Driver<number>
  readonly prepaidPctRevenue: Driver<number>
  readonly annualLegalSettlementPayout: Driver<number>
  readonly cashYieldRate: Driver<number>
  readonly legacyDebtAvgCoupon: Driver<number>
  readonly revolverRate: Driver<number>
  readonly minimumOperatingCash: Driver<number>
  readonly netShareSettlementPctSbc: Driver<number>
  readonly annualGrossRsuDilutionShares: Driver<number>
  readonly rsuNetShareWithholdingRate: Driver<number>
  readonly revenueStressShockPct: Driver<number>
}

export interface ValuationScalarDrivers {
  readonly equityRiskPremium: Driver<number>
  readonly betaRegimeSelector: Driver<number>
  readonly terminalGrowthRate: Driver<number>
  readonly terminalRonic: Driver<number>
  readonly midYearDiscountingFlag: Driver<number>
  readonly mcpDividendQuartersRemaining: Driver<number>
}

export interface MetaScenarioDrivers {
  readonly id: ScenarioId
  readonly label: string
  readonly framing: string
  readonly vectors: OperatingVectorDrivers
  readonly operating: OperatingScalarDrivers
  readonly valuation: ValuationScalarDrivers
}
