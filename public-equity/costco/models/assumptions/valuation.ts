import { scalarDriver, type Driver } from "./types.ts"

export interface ValuationDrivers {
  readonly equityRiskPremium: Driver<number>
  readonly rfStressRate: Driver<number>
  readonly terminalGrowthRate: Driver<number>
  readonly exitEvToEbitda: Driver<number>
  readonly calibratedCompsEvEbitda: Driver<number>
  readonly midYearConventionFlag: Driver<number>
  readonly weightPerpDcf: Driver<number>
  readonly weightExitDcf: Driver<number>
  readonly waccStepSensitivity: Driver<number>
  readonly termGrowthStepSensitivity: Driver<number>
  readonly exitMultipleStepSensitivity: Driver<number>
  readonly ebitMarginStepSensitivity: Driver<number>
  readonly compGrowthStepSensitivity: Driver<number>
}

function validateValuationWeights(v: ValuationDrivers): ValuationDrivers {
  const compsWeight = 1 - v.weightPerpDcf.value - v.weightExitDcf.value
  if (compsWeight < -1e-9 || compsWeight > 1 + 1e-9) {
    throw new Error(
      `Invalid valuation blend weights: perp=${v.weightPerpDcf.value}, exit=${v.weightExitDcf.value}`
    )
  }
  return Object.freeze(v)
}

export function baseValuationDrivers(): ValuationDrivers {
  return validateValuationWeights({
    equityRiskPremium: scalarDriver(0.045, {
      label: "U.S. equity risk premium (ERP)",
      format: "percentage",
      decimals: 2,
      category: "Discounting and rates",
      rationale:
        "Institutional U.S. equity risk premium benchmark calibrated to the current nominal Treasury and real TIPS rate regime.",
      basis: "Institutional ERP convention",
      source: "U.S. Treasury curves (2026-11-13)",
      gapId: "GAP-007",
    }),
    rfStressRate: scalarDriver(0.04, {
      label: "Risk-free rate stress benchmark",
      format: "percentage",
      decimals: 2,
      category: "Discounting and rates",
      rationale:
        "Evaluates intrinsic valuation sensitivity under a lower sovereign yield environment relative to the spot 10-year Treasury curve.",
      basis: "Lower-rate regime check",
      source: "U.S. Treasury H.15 benchmark",
    }),
    terminalGrowthRate: scalarDriver(0.035, {
      label: "Terminal growth rate (g)",
      format: "percentage",
      decimals: 2,
      category: "Terminal value and multiples",
      rationale:
        "Bounded below long-run U.S. nominal GDP growth (breakeven inflation plus mature real output) while reflecting durable club scale.",
      basis: "Nominal GDP ceiling bound",
      source: "FRED T10YIE (2026-11-13)",
      gapId: "GAP-008",
    }),
    exitEvToEbitda: scalarDriver(22.0, {
      label: "Exit EV / FY36E EBITDA",
      format: "multiple",
      decimals: 1,
      category: "Terminal value and multiples",
      rationale:
        "Cross-check terminal multiple awarding a quality premium over pure-play club peers and aligning with scaled omnichannel retail benchmarks.",
      basis: "Peer-anchored exit check",
      source: "Market close & consensus",
      gapId: "GAP-008",
    }),
    calibratedCompsEvEbitda: scalarDriver(24.0, {
      label: "Target EV / EBITDA multiple",
      format: "multiple",
      decimals: 1,
      category: "Terminal value and multiples",
      rationale:
        "Awards a structural premium over Walmart and pure-play warehouse clubs for superior ROIC and membership renewal stability.",
      basis: "ROIC-calibrated target",
      source: "Street consensus (2026-11-13)",
      gapId: "GAP-008",
    }),
    midYearConventionFlag: scalarDriver(1, {
      label: "Mid-year discounting (1=Yes)",
      format: "integer",
      category: "Discounting and rates",
      rationale:
        "Applies mid-year cash-flow timing to reflect continuous retail cash generation across the fiscal year (zero applies year-end discounting).",
      basis: "Mid-year cash flow timing",
    }),
    weightPerpDcf: scalarDriver(0.5, {
      label: "Weight — Perpetuity DCF",
      format: "percentage",
      decimals: 0,
      category: "Valuation weights",
      rationale:
        "Primary intrinsic weighting anchored to explicit multi-year reinvestment and steady-state capital productivity.",
      basis: "Primary intrinsic method",
    }),
    weightExitDcf: scalarDriver(0.0, {
      label: "Weight — Exit-Multiple DCF",
      format: "percentage",
      decimals: 0,
      category: "Valuation weights",
      rationale:
        "Retained strictly as an explicit market-multiple cross-check; assigned zero weight in the headline blend so terminal multiples above nominal GDP growth do not distort intrinsic value.",
      basis: "Cross-check (0% weight)",
    }),
    waccStepSensitivity: scalarDriver(0.005, {
      label: "Sensitivity step — WACC",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity steps",
      rationale:
        "Defines symmetric discount-rate grid intervals across the valuation sensitivity matrices.",
      basis: "Grid axis interval",
    }),
    termGrowthStepSensitivity: scalarDriver(0.0025, {
      label: "Sensitivity step — Terminal g",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity steps",
      rationale:
        "Defines symmetric perpetual growth intervals around the active terminal growth rate.",
      basis: "Grid axis interval",
    }),
    exitMultipleStepSensitivity: scalarDriver(2.0, {
      label: "Sensitivity step — Exit mult.",
      format: "multiple",
      decimals: 1,
      category: "Sensitivity steps",
      rationale:
        "Defines symmetric terminal EBITDA multiple intervals across the exit-multiple sensitivity grid.",
      basis: "Grid axis interval",
    }),
    ebitMarginStepSensitivity: scalarDriver(0.0025, {
      label: "Sensitivity step — EBIT margin",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity steps",
      rationale:
        "Defines parallel operating-margin shift intervals across the explicit forecast period.",
      basis: "Grid axis interval",
    }),
    compGrowthStepSensitivity: scalarDriver(0.005, {
      label: "Sensitivity step — Rev. growth",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity steps",
      rationale:
        "Defines annual revenue growth shift intervals scaling both NOPAT and required operating capital.",
      basis: "Grid axis interval",
    }),
  })
}

export function upsideValuationDrivers(): ValuationDrivers {
  const base = baseValuationDrivers()
  return validateValuationWeights({
    ...base,
    equityRiskPremium: scalarDriver(0.0425, {
      ...base.equityRiskPremium.meta,
      rationale:
        "Lower equity risk premium consistent with constructive equity risk appetite.",
      basis: "Benign risk regime",
    }),
    terminalGrowthRate: scalarDriver(0.037, {
      ...base.terminalGrowthRate.meta,
      rationale:
        "Upper nominal GDP growth ceiling supported by sustained international club expansion without breaching long-run macro bounds.",
      basis: "Nominal GDP ceiling",
    }),
    exitEvToEbitda: scalarDriver(25.0, {
      ...base.exitEvToEbitda.meta,
      rationale:
        "Sustained scarcity premium supports a higher mature terminal EBITDA multiple cross-check.",
      basis: "Sustained scarcity premium",
    }),
    calibratedCompsEvEbitda: scalarDriver(29.5, {
      ...base.calibratedCompsEvEbitda.meta,
      rationale:
        "Sustains Costco's spot forward multiple in a constructive defensive-quality market regime.",
      basis: "Sustained spot multiple",
    }),
  })
}

export function downsideValuationDrivers(): ValuationDrivers {
  const base = baseValuationDrivers()
  return validateValuationWeights({
    ...base,
    equityRiskPremium: scalarDriver(0.0475, {
      ...base.equityRiskPremium.meta,
      rationale:
        "Higher equity risk premium reflecting tighter financial conditions and risk aversion.",
      basis: "Tighter risk regime",
    }),
    terminalGrowthRate: scalarDriver(0.03, {
      ...base.terminalGrowthRate.meta,
      rationale:
        "Long-run growth converges conservatively toward mature retail nominal expansion.",
      basis: "Conservative GDP pace",
    }),
    exitEvToEbitda: scalarDriver(18.0, {
      ...base.exitEvToEbitda.meta,
      rationale:
        "Terminal valuation derates toward mature omnichannel retail and staple norms.",
      basis: "Mature retail multiple",
    }),
    calibratedCompsEvEbitda: scalarDriver(20.0, {
      ...base.calibratedCompsEvEbitda.meta,
      rationale:
        "Multiple resets below Walmart toward mature omnichannel and club peer averages.",
      basis: "Peer-convergence reset",
    }),
  })
}
