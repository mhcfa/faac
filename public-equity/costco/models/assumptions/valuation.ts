import { scalarDriver, type Driver } from "./types.ts"

export interface ValuationDrivers {
  readonly equityRiskPremium: Driver<number>
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
      `Invalid Football Field weights: perp=${v.weightPerpDcf.value}, exit=${v.weightExitDcf.value}`
    )
  }
  return Object.freeze(v)
}

export function baseValuationDrivers(): ValuationDrivers {
  return validateValuationWeights({
    equityRiskPremium: scalarDriver(0.045, {
      label: "U.S. Equity Risk Premium (ERP)",
      format: "percentage",
      decimals: 2,
      category: "WACC & Discounting",
      rationale:
        "Institutional 4.50% ERP consistent with 5.15% 10Y UST nominal / 2.91% 10Y TIPS real regime.",
      basis: "Institutional ERP convention",
      source: "U.S. Treasury H.15 Par & TIPS Curves (2026-11-13)",
      gapId: "GAP-007",
    }),
    terminalGrowthRate: scalarDriver(0.035, {
      label: "Terminal perpetuity growth rate (g)",
      format: "percentage",
      decimals: 2,
      category: "Terminal Value & Multiples",
      rationale:
        "Bounded below ~3.7% long-run US nominal GDP ceiling (2.24% T10YIE breakeven inflation + ~1.5% mature real GDP) while reflecting Costco's durable club scale.",
      basis: "Nominal GDP ceiling discipline",
      source: "FRED 10Y Breakeven Inflation (T10YIE, 2026-11-13)",
      gapId: "GAP-008",
    }),
    exitEvToEbitda: scalarDriver(22.0, {
      label: "Terminal Exit EV / FY36E EBITDA cross-check multiple",
      format: "multiple",
      decimals: 1,
      category: "Terminal Value & Multiples",
      rationale:
        "Reflects terminal quality premium over pure-play club peers (~13-14x) and aligns with Walmart FY27E (21.9x) despite implying >6% perpetuity growth at 8.88% WACC.",
      basis: "Peer-anchored mature premium",
      source: "NASDAQ/NYSE market close & Street consensus (2026-11-13)",
      gapId: "GAP-008",
    }),
    calibratedCompsEvEbitda: scalarDriver(24.0, {
      label: "Quality-calibrated FY27E EV / EBITDA target multiple",
      format: "multiple",
      decimals: 1,
      category: "Terminal Value & Multiples",
      rationale:
        "Awards a +2.1x premium over WMT (21.9x) and +10.5x over BJ/PSMT (~13.0-13.5x) for Costco's ~30% ROIC and 92.3% renewal moat, compressing from current 29.6x peak.",
      basis: "ROIC & moat quality-calibrated multiple",
      source: "Street consensus estimates (2026-11-13)",
      gapId: "GAP-008",
    }),
    midYearConventionFlag: scalarDriver(1, {
      label: "Mid-year cash flow discounting flag (1=Mid-Year, 0=Year-End)",
      format: "integer",
      category: "WACC & Discounting",
      rationale:
        "Live structural toggle (1 = cash flows earned evenly mid-year; 0 = end-of-period discounting) evaluated dynamically via YEARFRAC formulas.",
      basis: "Standard DCF timing convention",
    }),
    weightPerpDcf: scalarDriver(0.5, {
      label: "Football Field weight — Perpetuity-Growth DCF",
      format: "percentage",
      decimals: 0,
      category: "Blended Target Weights",
      rationale:
        "Primary intrinsic method anchored to fundamental reinvestment economics (50%); Comps weight derived as 1 - Perp - Exit = 25%.",
      basis: "Intrinsic primary weighting",
    }),
    weightExitDcf: scalarDriver(0.25, {
      label: "Football Field weight — Exit-Multiple DCF",
      format: "percentage",
      decimals: 0,
      category: "Blended Target Weights",
      rationale:
        "Secondary intrinsic cross-check weight (25%); remaining 25% allocated residually to Calibrated Comps.",
      basis: "Cross-check weighting",
    }),
    waccStepSensitivity: scalarDriver(0.005, {
      label: "Sensitivity grid step — WACC",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity Grid Axes",
      rationale: "+/- 100 bps total WACC range in 50 bps increments.",
      basis: "Grid axis step",
    }),
    termGrowthStepSensitivity: scalarDriver(0.0025, {
      label: "Sensitivity grid step — Terminal growth (g)",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity Grid Axes",
      rationale: "+/- 50 bps terminal growth range in 25 bps increments.",
      basis: "Grid axis step",
    }),
    exitMultipleStepSensitivity: scalarDriver(2.0, {
      label: "Sensitivity grid step — Exit EV / EBITDA",
      format: "multiple",
      decimals: 1,
      category: "Sensitivity Grid Axes",
      rationale: "+/- 4.0x exit multiple range in 2.0x increments.",
      basis: "Grid axis step",
    }),
    ebitMarginStepSensitivity: scalarDriver(0.0025, {
      label: "Sensitivity grid step — Terminal EBIT margin",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity Grid Axes",
      rationale: "+/- 50 bps terminal operating margin sensitivity.",
      basis: "Grid axis step",
    }),
    compGrowthStepSensitivity: scalarDriver(0.005, {
      label: "Sensitivity grid step — Terminal revenue growth",
      format: "percentage",
      decimals: 2,
      category: "Sensitivity Grid Axes",
      rationale: "+/- 100 bps terminal operating growth sensitivity.",
      basis: "Grid axis step",
    }),
  })
}

export function bullValuationDrivers(): ValuationDrivers {
  const base = baseValuationDrivers()
  return validateValuationWeights({
    ...base,
    equityRiskPremium: scalarDriver(0.0425, {
      ...base.equityRiskPremium.meta,
      rationale:
        "Lower market equity risk premium (4.25%) in benign risk-on regime.",
    }),
    terminalGrowthRate: scalarDriver(0.038, {
      ...base.terminalGrowthRate.meta,
      rationale:
        "Upper nominal GDP bound (3.80%) reflecting sustained international compounding.",
    }),
    exitEvToEbitda: scalarDriver(25.0, {
      ...base.exitEvToEbitda.meta,
      rationale:
        "Sustained scarcity premium preserves 25.0x terminal EBITDA multiple.",
    }),
    calibratedCompsEvEbitda: scalarDriver(27.0, {
      ...base.calibratedCompsEvEbitda.meta,
      rationale:
        "Modest multiple compression from 29.6x to 27.0x FY27E EBITDA in constructive tape.",
    }),
  })
}

export function bearValuationDrivers(): ValuationDrivers {
  const base = baseValuationDrivers()
  return validateValuationWeights({
    ...base,
    equityRiskPremium: scalarDriver(0.0475, {
      ...base.equityRiskPremium.meta,
      rationale:
        "Elevated risk-off ERP (4.75%) amid higher-for-longer Treasury yields.",
    }),
    terminalGrowthRate: scalarDriver(0.03, {
      ...base.terminalGrowthRate.meta,
      rationale:
        "Mature retail growth converges to 3.00% long-run nominal pace.",
    }),
    exitEvToEbitda: scalarDriver(18.0, {
      ...base.exitEvToEbitda.meta,
      rationale:
        "Multiple derates toward mature wide-moat staple/omni-retail peers (18.0x).",
    }),
    calibratedCompsEvEbitda: scalarDriver(20.0, {
      ...base.calibratedCompsEvEbitda.meta,
      rationale:
        "Post-special-dividend multiple reset below Walmart toward 20.0x FY27E EBITDA.",
    }),
  })
}
