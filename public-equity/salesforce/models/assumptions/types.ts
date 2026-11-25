import type { FormatPreset } from "f8-engine"
import {
  FORECAST_PERIODS,
  type ForecastPeriod,
  type ScenarioKey,
} from "../timeline.ts"

const NO_DECIMALS_FORMATS: ReadonlySet<FormatPreset> = new Set([
  "integer",
  "date",
  "text",
])

export interface DriverMeta {
  readonly label: string
  readonly format: FormatPreset
  readonly decimals?: number
  readonly category: string
  readonly rationale: string
  readonly basis?: string
  readonly source?: string
  readonly gapId?: string
}

export interface Driver<T> {
  readonly value: T
  readonly meta: DriverMeta
}

export type PeriodVector = Readonly<Record<ForecastPeriod, number>>

function validateMeta(meta: DriverMeta): void {
  if (NO_DECIMALS_FORMATS.has(meta.format) && meta.decimals !== undefined) {
    throw new Error(
      `Driver "${meta.label}" cannot specify decimals on format "${meta.format}"`
    )
  }
}

export function scalarDriver(value: number, meta: DriverMeta): Driver<number> {
  if (!Number.isFinite(value)) {
    throw new Error(`Scalar driver "${meta.label}" must be finite`)
  }
  validateMeta(meta)
  return Object.freeze({
    value,
    meta: Object.freeze({ ...meta }),
  })
}

export function periodDriver(
  value: PeriodVector,
  meta: DriverMeta
): Driver<PeriodVector> {
  validateMeta(meta)
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

export function formatDriverProvenance(meta: DriverMeta): string {
  const basis = meta.basis?.trim() ?? ""
  const source = meta.source?.trim() ?? ""
  if (basis.length > 0 && source.length > 0) {
    return `${basis} (${source})`
  }
  if (basis.length > 0) return basis
  return source
}

export interface ScalarDriverBundle {
  readonly erp: Driver<number>
  readonly histBeta5yDe: Driver<number>
  readonly histBeta2yDe: Driver<number>
  readonly effectiveTaxRate: Driver<number>
  readonly terminalGrowthRate: Driver<number>
  readonly terminalReinvestmentRate: Driver<number>
  readonly exitEbitdaMultiple: Driver<number>
  readonly midPeriodFactor: Driver<number>
  readonly expectedAsrAvgPrice: Driver<number>
  readonly strategicInvHaircut: Driver<number>
  readonly brazeAcquisitionCash: Driver<number>
  readonly minCashBalance: Driver<number>
  readonly cashYieldRate: Driver<number>
  readonly revolverSpread: Driver<number>
  readonly longBondCurvePremium: Driver<number>
  readonly ppaIntangiblesShare: Driver<number>
  readonly ppaAmortLifeYears: Driver<number>
  readonly maAcquiredNowcPctCash: Driver<number>
  readonly contractCostAmortRate: Driver<number>
  readonly opLeaseDownsizeAnnual: Driver<number>
  readonly sbcNetIssuanceRatio: Driver<number>
  readonly esppProceedsPctSbc: Driver<number>
  readonly futureBuybackPrice: Driver<number>
}

export type ScalarDriverKey = keyof ScalarDriverBundle

export const SCALAR_DRIVER_KEYS: readonly ScalarDriverKey[] = [
  "erp",
  "histBeta5yDe",
  "histBeta2yDe",
  "effectiveTaxRate",
  "terminalGrowthRate",
  "terminalReinvestmentRate",
  "exitEbitdaMultiple",
  "midPeriodFactor",
  "expectedAsrAvgPrice",
  "strategicInvHaircut",
  "brazeAcquisitionCash",
  "minCashBalance",
  "cashYieldRate",
  "revolverSpread",
  "longBondCurvePremium",
  "ppaIntangiblesShare",
  "ppaAmortLifeYears",
  "maAcquiredNowcPctCash",
  "contractCostAmortRate",
  "opLeaseDownsizeAnnual",
  "sbcNetIssuanceRatio",
  "esppProceedsPctSbc",
  "futureBuybackPrice",
]

export interface PeriodDriverBundle {
  readonly organicSsGrowth: Driver<PeriodVector>
  readonly incrementalMaRev: Driver<PeriodVector>
  readonly profServicesGrowth: Driver<PeriodVector>
  readonly corSubCashPctSs: Driver<PeriodVector>
  readonly corPsCashPctPs: Driver<PeriodVector>
  readonly rdCashPctRev: Driver<PeriodVector>
  readonly smCashPctRev: Driver<PeriodVector>
  readonly gaCashPctRev: Driver<PeriodVector>
  readonly restructuringPctRev: Driver<PeriodVector>
  readonly sbcPctRev: Driver<PeriodVector>
  readonly capexPctRev: Driver<PeriodVector>
  readonly finLeasePctRev: Driver<PeriodVector>
  readonly ppeDeprPctRev: Driver<PeriodVector>
  readonly opLeasePayment: Driver<PeriodVector>
  readonly capCommissionsPctSsRev: Driver<PeriodVector>
  readonly dsoDays: Driver<PeriodVector>
  readonly prepaidPctRev: Driver<PeriodVector>
  readonly apAccruedPctRev: Driver<PeriodVector>
  readonly unearnedRevPctSsRev: Driver<PeriodVector>
  readonly incrementalShareRepurchases: Driver<PeriodVector>
  readonly dividendsPerShare: Driver<PeriodVector>
  readonly newDebtIssuance: Driver<PeriodVector>
}

export type PeriodDriverKey = keyof PeriodDriverBundle

export const PERIOD_DRIVER_KEYS: readonly PeriodDriverKey[] = [
  "organicSsGrowth",
  "incrementalMaRev",
  "profServicesGrowth",
  "corSubCashPctSs",
  "corPsCashPctPs",
  "rdCashPctRev",
  "smCashPctRev",
  "gaCashPctRev",
  "restructuringPctRev",
  "sbcPctRev",
  "capexPctRev",
  "finLeasePctRev",
  "ppeDeprPctRev",
  "opLeasePayment",
  "capCommissionsPctSsRev",
  "dsoDays",
  "prepaidPctRev",
  "apAccruedPctRev",
  "unearnedRevPctSsRev",
  "incrementalShareRepurchases",
  "dividendsPerShare",
  "newDebtIssuance",
]

export interface ScenarioBundle {
  readonly key: ScenarioKey
  readonly name: string
  readonly index: 1 | 2 | 3
  readonly framing: string
  readonly scalars: ScalarDriverBundle
  readonly periods: PeriodDriverBundle
}
