import type { FormatPreset } from "f8-engine"
import { FORECAST_PERIODS, type ForecastPeriod } from "../timeline.ts"

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

export type DebtTrancheCoupon =
  | { readonly kind: "literal"; readonly rate: number }
  | { readonly kind: "expr"; readonly expr: string }

export type DebtTrancheRepaymentCell = number | { readonly expr: string }

export type DebtTrancheRepaymentVector = Readonly<
  Record<ForecastPeriod, DebtTrancheRepaymentCell>
>

export interface DebtTrancheSpec {
  readonly id: string
  readonly label: string
  readonly couponCell: DebtTrancheCoupon
  readonly maturityDate: string
  readonly fy26Principal: number
  readonly repayments: DebtTrancheRepaymentVector
  readonly note: string
}

function validateMeta(meta: DriverMeta): DriverMeta {
  if (
    (meta.format === "integer" ||
      meta.format === "date" ||
      meta.format === "text") &&
    meta.decimals !== undefined
  ) {
    throw new Error(
      `Driver "${meta.label}" cannot specify decimals on format "${meta.format}"`
    )
  }
  return Object.freeze({ ...meta })
}

export function scalarDriver(value: number, meta: DriverMeta): Driver<number> {
  if (!Number.isFinite(value)) {
    throw new Error(
      `Scalar driver "${meta.label}" must be finite, got ${value}`
    )
  }
  return Object.freeze({
    value,
    meta: validateMeta(meta),
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
      `Period driver "${meta.label}": keys [${keys.join(", ")}] != [${FORECAST_PERIODS.join(", ")}]`
    )
  }
  return Object.freeze({
    value: Object.freeze({ ...value }),
    meta: validateMeta(meta),
  })
}

export function formatDriverNote(meta: DriverMeta): string {
  const parts: string[] = []
  if (meta.basis) {
    parts.push(`[${meta.basis}]`)
  }
  parts.push(meta.rationale)
  if (meta.source) {
    parts.push(`(Source: ${meta.source})`)
  }
  return parts.join(" ")
}

export function vecFromTuple(
  vals: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
): PeriodVector {
  return Object.freeze({
    FY27E: vals[0],
    FY28E: vals[1],
    FY29E: vals[2],
    FY30E: vals[3],
    FY31E: vals[4],
    FY32E: vals[5],
    FY33E: vals[6],
    FY34E: vals[7],
    FY35E: vals[8],
    FY36E: vals[9],
  })
}

export function flatVec(val: number): PeriodVector {
  return vecFromTuple([val, val, val, val, val, val, val, val, val, val])
}
