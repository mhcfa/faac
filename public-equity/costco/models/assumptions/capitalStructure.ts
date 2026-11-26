import {
  flatVec,
  periodDriver,
  scalarDriver,
  vecFromTuple,
  type DebtTrancheSpec,
  type Driver,
  type PeriodVector,
} from "./types.ts"
import type { CostcoKnowledgeData } from "../kg.ts"

export interface CapitalStructureDrivers {
  readonly effectiveTaxRate: Driver<PeriodVector>
  readonly cashInterestYield: Driver<number>
  readonly fxOtherNonOp: Driver<number>
  readonly stiNetMaturityFy27: Driver<number>
  readonly minCashBuffer: Driver<number>
  readonly revolverSpreadOverRf: Driver<number>
  readonly japanDebtCouponRate: Driver<number>
  readonly japanPostFy36Principal: Driver<number>
  readonly unamortizedDiscountAmortAnnual: Driver<number>
  readonly specialDivFyAbsentWeight: Driver<number>
  readonly scheduledDebtFyAbsentWeight: Driver<number>
  readonly aprMaturityFyAbsentWeight: Driver<number>
  readonly specialDividendPerShareFy27: Driver<number>
  readonly regularDpsGrowth: Driver<number>
  readonly annualBuybackDollars: Driver<PeriodVector>
  readonly targetOperatingCashBuffer: Driver<number>
  readonly excessCashBuybackSweepPct: Driver<number>
  readonly buybackPriceGrowth: Driver<number>
  readonly rsuVestedShares: Driver<PeriodVector>
  readonly rsuTaxWithholdingPctSbc: Driver<number>
  readonly dilutiveRsuShares: Driver<number>
  readonly finLeasePctSales: Driver<number>
  readonly finLeasePrincipalPct: Driver<number>
  readonly finLeaseInterestRate: Driver<number>
  readonly finLeaseIntInGaapIntPct: Driver<number>
  readonly opLeaseLiabToRouRatio: Driver<number>
  readonly opLeaseCurrentShare: Driver<number>
  readonly finLeaseCurrentShare: Driver<number>
}

export function buildDebtTranches(
  kg: CostcoKnowledgeData
): readonly DebtTrancheSpec[] {
  const dl = kg.cost.debtLeases
  const tm = dl.trancheMeta
  const japanFy26 = dl.otherLtDebtJapan.FY26
  const japan2029 = dl.maturities2029
  const japan2031 = dl.maturities2031
  const japanAnnualTailExpr = Object.freeze({
    expr: '(MarketAnchorsMarket["maturities_thereafter", "val"] - @table["tranche_apr32", "fy26_principal"] - ScalarAssumptionsOperating["japan_post_fy36_principal", "val"]) / 5',
  })

  return Object.freeze([
    Object.freeze({
      id: "tranche_may27",
      label: tm.may2027.label,
      couponCell: Object.freeze({
        kind: "literal" as const,
        rate: tm.may2027.couponRate,
      }),
      maturityDate: tm.may2027.maturityLabel,
      fy26Principal: dl.seniorNotesMay2027.FY26,
      repayments: vecFromTuple([
        dl.seniorNotesMay2027.FY26,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]),
      note: "Cash-funded (Note 4)",
    }),
    Object.freeze({
      id: "tranche_jun27",
      label: tm.jun2027.label,
      couponCell: Object.freeze({
        kind: "literal" as const,
        rate: tm.jun2027.couponRate,
      }),
      maturityDate: tm.jun2027.maturityLabel,
      fy26Principal: dl.seniorNotesJun2027.FY26,
      repayments: vecFromTuple([
        dl.seniorNotesJun2027.FY26,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]),
      note: "Cash-funded (Note 4)",
    }),
    Object.freeze({
      id: "tranche_apr30",
      label: tm.apr2030.label,
      couponCell: Object.freeze({
        kind: "literal" as const,
        rate: tm.apr2030.couponRate,
      }),
      maturityDate: tm.apr2030.maturityLabel,
      fy26Principal: dl.seniorNotesApr2030.FY26,
      repayments: vecFromTuple([
        0,
        0,
        0,
        dl.seniorNotesApr2030.FY26,
        0,
        0,
        0,
        0,
        0,
        0,
      ]),
      note: "Cash-funded (Note 4)",
    }),
    Object.freeze({
      id: "tranche_apr32",
      label: tm.apr2032.label,
      couponCell: Object.freeze({
        kind: "literal" as const,
        rate: tm.apr2032.couponRate,
      }),
      maturityDate: tm.apr2032.maturityLabel,
      fy26Principal: dl.seniorNotesApr2032.FY26,
      repayments: vecFromTuple([
        0,
        0,
        0,
        0,
        0,
        dl.seniorNotesApr2032.FY26,
        0,
        0,
        0,
        0,
      ]),
      note: "Cash-funded (Note 4)",
    }),
    Object.freeze({
      id: "tranche_japan",
      label: "Japan Guaranteed Senior Notes",
      couponCell: Object.freeze({
        kind: "expr" as const,
        expr: 'ScalarAssumptionsOperating["japan_debt_coupon_rate", "val"]',
      }),
      maturityDate: "2029-2041",
      fy26Principal: japanFy26,
      repayments: Object.freeze({
        FY27E: 0,
        FY28E: 0,
        FY29E: japan2029,
        FY30E: 0,
        FY31E: japan2031,
        FY32E: japanAnnualTailExpr,
        FY33E: japanAnnualTailExpr,
        FY34E: japanAnnualTailExpr,
        FY35E: japanAnnualTailExpr,
        FY36E: japanAnnualTailExpr,
      }),
      note: "FY29/31; $500M FY41",
    }),
  ])
}

export function baseCapitalStructureDrivers(): CapitalStructureDrivers {
  return Object.freeze({
    effectiveTaxRate: periodDriver(flatVec(0.25), {
      label: "Effective income tax rate",
      format: "percentage",
      decimals: 1,
      category: "Tax and non-operating",
      rationale:
        "Normalized U.S. federal, state, and international statutory tax blend excluding recurring discrete equity-award windfalls.",
      basis: "Normalized ex-discrete ETR",
      source: "FY26 10-K, Note 8",
      gapId: "GAP-009",
    }),
    cashInterestYield: scalarDriver(0.035, {
      label: "Opening cash and STI yield",
      format: "percentage",
      decimals: 2,
      category: "Tax and non-operating",
      rationale:
        "Blended global treasury and money-market return moderating gradually from current short-term Treasury curve levels.",
      basis: "Curve-normalized cash yield",
      source: "FY26 10-K; U.S. Treasury H.15",
      gapId: "GAP-009",
    }),
    fxOtherNonOp: scalarDriver(0, {
      label: "FX and other non-op., net ($M)",
      format: "currency",
      decimals: 0,
      category: "Tax and non-operating",
      rationale:
        "Foreign-currency transaction swings and miscellaneous non-operating items normalize to zero in clean forecasts.",
      basis: "Zero speculative FX",
      source: "FY26 10-K, Item 8",
    }),
    stiNetMaturityFy27: scalarDriver(0, {
      label: "Net STI maturities FY27E ($M)",
      format: "currency",
      decimals: 0,
      category: "Liquidity and debt",
      rationale:
        "Opening cash and operating cash flow comfortably cover the declared special dividend and scheduled bond maturities without liquidating short-term investments.",
      basis: "Cash reserve sufficiency",
      source: "FY26 10-K, Item 8",
    }),
    minCashBuffer: scalarDriver(2000, {
      label: "Minimum cash floor ($M)",
      format: "currency",
      decimals: 0,
      category: "Liquidity and debt",
      rationale:
        "Global operating liquidity threshold backstopped by committed bank credit facilities.",
      basis: "Operating liquidity floor",
      source: "FY26 10-K, Note 4",
    }),
    revolverSpreadOverRf: scalarDriver(0.0064, {
      label: "Credit facility spread (AA OAS)",
      format: "basis_points",
      category: "Liquidity and debt",
      rationale:
        "Anchored to the ICE BofA AA U.S. Corporate OAS matching Costco's AA credit ratings.",
      basis: "Market AA OAS spread",
      source: "ICE BofA AA OAS (2026-11-13)",
    }),
    japanDebtCouponRate: scalarDriver(0.0235, {
      label: "Japan notes blended coupon",
      format: "percentage",
      decimals: 2,
      category: "Liquidity and debt",
      rationale:
        "Principal-weighted midpoint across disclosed FY24 and FY26 Japan Guaranteed Senior Note interest-rate bands.",
      basis: "Blended tranche midpoint",
      source: "FY26 10-K, Note 4",
      gapId: "GAP-010",
    }),
    japanPostFy36Principal: scalarDriver(500, {
      label: "Japan notes due post-FY36E ($M)",
      format: "currency",
      decimals: 0,
      category: "Liquidity and debt",
      rationale:
        "FY26 Japan Guaranteed Senior Notes mature through June 2041, leaving this principal tranche outstanding beyond the explicit FY36E horizon.",
      basis: "2041 maturity tranche",
      source: "FY26 10-K, Note 4",
    }),
    unamortizedDiscountAmortAnnual: scalarDriver(2.0, {
      label: "Annual debt disc. amort. ($M)",
      format: "currency",
      decimals: 1,
      category: "Liquidity and debt",
      rationale:
        "Non-cash issuance discount amortization tapering as near-term senior notes mature.",
      basis: "Historical amortization run-rate",
      source: "FY26 10-K, Note 4",
      gapId: "GAP-010",
    }),
    specialDivFyAbsentWeight: scalarDriver(0.737, {
      label: "Special div. FY absent weight",
      format: "percentage",
      decimals: 1,
      category: "Liquidity and debt",
      rationale:
        "Share of FY27E remaining after the December 2026 special dividend payout date when distributed cash no longer earns interest.",
      basis: "Dec 4 payout day-count",
      source: "Form 8-K (Nov 10, 2026)",
    }),
    scheduledDebtFyAbsentWeight: scalarDriver(0.23, {
      label: "May/Jun maturity absent weight",
      format: "percentage",
      decimals: 1,
      category: "Liquidity and debt",
      rationale:
        "Principal-weighted share of FY27E remaining following scheduled May and June 2027 senior note redemptions.",
      basis: "FY27E maturity weighting",
      source: "FY26 10-K, Note 4",
    }),
    aprMaturityFyAbsentWeight: scalarDriver(0.37, {
      label: "Apr maturity FY absent weight",
      format: "percentage",
      decimals: 1,
      category: "Liquidity and debt",
      rationale:
        "Share of the fiscal year remaining after scheduled April 2030 and April 2032 senior note maturities.",
      basis: "Apr maturity day-count",
      source: "FY26 10-K, Note 4",
    }),
    specialDividendPerShareFy27: scalarDriver(30, {
      label: "FY27E special dividend ($/sh)",
      format: "currency",
      decimals: 2,
      category: "Capital returns and shares",
      rationale:
        "Board-declared one-time special cash dividend payable in December 2026, with no additional special dividends modeled thereafter.",
      basis: "Declared Nov 2026 event",
      source: "Form 8-K (Nov 10, 2026)",
    }),
    regularDpsGrowth: scalarDriver(0.08, {
      label: "Regular annual DPS growth",
      format: "percentage",
      decimals: 1,
      category: "Capital returns and shares",
      rationale:
        "Compounds from the current annualized regular quarterly dividend in line with long-run payout discipline.",
      basis: "Historical payout cadence",
      source: "Oct 2026 dividend release",
    }),
    annualBuybackDollars: periodDriver(
      vecFromTuple([850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300]),
      {
        label: "Baseline share buybacks ($M)",
        format: "currency",
        decimals: 0,
        category: "Capital returns and shares",
        rationale:
          "Anti-dilutive repurchase pace aligned with recent historical activity under the reauthorized buyback program prior to excess-cash sweeps.",
        basis: "Anti-dilutive run-rate",
        source: "FY26 10-K, Notes 6 & 9",
      }
    ),
    targetOperatingCashBuffer: scalarDriver(12000, {
      label: "Target cash & STI buffer ($M)",
      format: "currency",
      decimals: 0,
      category: "Capital returns and shares",
      rationale:
        "Reflects pre-special-dividend multi-year operating cash and short-term investment liquidity band above which excess cash sweeps to buybacks.",
      basis: "FY22–FY25 liquidity band",
      source: "FY26 10-K, Item 8",
    }),
    excessCashBuybackSweepPct: scalarDriver(0.4, {
      label: "Excess cash buyback sweep (%)",
      format: "percentage",
      decimals: 0,
      category: "Capital returns and shares",
      rationale:
        "Sweeps a portion of opening cash above the target liquidity buffer into incremental buybacks to prevent unrealistic idle cash build.",
      basis: "Capital-return sweep policy",
      source: "Form 8-K (Nov 10, 2026)",
    }),
    buybackPriceGrowth: scalarDriver(0.05, {
      label: "Buyback price growth (%/yr)",
      format: "percentage",
      decimals: 1,
      category: "Capital returns and shares",
      rationale:
        "Exogenous annual share-price escalation anchored to ex-dividend spot price to compute repurchase share retirement independently of intrinsic valuation.",
      basis: "Ex-div spot escalation",
      source: "Market close (2026-11-13)",
    }),
    rsuVestedShares: periodDriver(
      vecFromTuple([0.9, 0.9, 0.88, 0.88, 0.86, 0.86, 0.85, 0.85, 0.85, 0.85]),
      {
        label: "Net RSU shares delivered (M)",
        format: "number",
        decimals: 3,
        category: "Capital returns and shares",
        rationale:
          "Tracks recent net employee RSU share issuance after statutory tax withholdings.",
        basis: "FY26 net delivery pace",
        source: "FY26 10-K, Note 7",
      }
    ),
    rsuTaxWithholdingPctSbc: scalarDriver(0.391, {
      label: "RSU tax withholding (% SBC)",
      format: "percentage",
      decimals: 1,
      category: "Capital returns and shares",
      rationale:
        "Matches empirical cash tax-withholding outflow as a share of annual stock-based compensation expense.",
      basis: "FY26 settlement ratio",
      source: "FY26 10-K, Note 7",
    }),
    dilutiveRsuShares: scalarDriver(0.474, {
      label: "Dilutive RSU overhang (M)",
      format: "number",
      decimals: 3,
      category: "Capital returns and shares",
      rationale:
        "Held at FY26 treasury-stock-method incremental dilutive RSU share count.",
      basis: "FY26 diluted share spread",
      source: "FY26 10-K, Note 9",
    }),
    finLeasePctSales: scalarDriver(0.00475, {
      label: "Finance leases (% net sales)",
      format: "percentage",
      decimals: 2,
      category: "Lease parameters",
      rationale:
        "Scales modestly with logistics fleet and depot expansion at recent balance-sheet intensity.",
      basis: "FY26 balance ratio",
      source: "FY26 10-K, Note 5",
    }),
    finLeasePrincipalPct: scalarDriver(0.0602, {
      label: "Fin. lease princ. pay (% beg.)",
      format: "percentage",
      decimals: 2,
      category: "Lease parameters",
      rationale:
        "Annual contractual finance-lease principal cash outflow in financing activities, anchored to FY26 cash paid over beginning finance-lease liabilities.",
      basis: "FY26 CFF / beg. balance",
      source: "FY26 10-K, Note 5",
    }),
    finLeaseInterestRate: scalarDriver(0.0472, {
      label: "Finance lease discount rate",
      format: "percentage",
      decimals: 2,
      category: "Lease parameters",
      rationale:
        "Anchored directly to the disclosed FY26 weighted-average finance lease discount rate.",
      basis: "FY26 Note 5 rate",
      source: "FY26 10-K, Note 5",
    }),
    finLeaseIntInGaapIntPct: scalarDriver(0.38, {
      label: "Fin. lease int. in IS (%)",
      format: "percentage",
      decimals: 0,
      category: "Lease parameters",
      rationale:
        "Portion of disclosed finance-lease interest recognized inside GAAP interest expense rather than capitalized or recorded in operating costs, reconciling to the FY26 GAAP baseline.",
      basis: "FY26 GAAP reconciliation",
      source: "FY26 10-K, Items 8 & Note 5",
    }),
    opLeaseLiabToRouRatio: scalarDriver(0.9663, {
      label: "Op. lease liab. / ROU ratio",
      format: "percentage",
      decimals: 2,
      category: "Lease parameters",
      rationale:
        "Preserves the FY26 GAAP ratio between operating lease liabilities and right-of-use assets reflecting prepaid rent and incentives.",
      basis: "FY26 GAAP ratio",
      source: "FY26 10-K, Note 5",
    }),
    opLeaseCurrentShare: scalarDriver(0.0737, {
      label: "Op. lease current share (%)",
      format: "percentage",
      decimals: 2,
      category: "Lease parameters",
      rationale:
        "Anchored to the FY26 current-to-total operating lease maturity distribution.",
      basis: "FY26 maturity split",
      source: "FY26 10-K, Note 5",
    }),
    finLeaseCurrentShare: scalarDriver(0.0665, {
      label: "Fin. lease current share (%)",
      format: "percentage",
      decimals: 2,
      category: "Lease parameters",
      rationale:
        "Anchored to the FY26 current-to-total finance lease maturity distribution.",
      basis: "FY26 maturity split",
      source: "FY26 10-K, Note 5",
    }),
  })
}

export function upsideCapitalStructureDrivers(): CapitalStructureDrivers {
  const base = baseCapitalStructureDrivers()
  return Object.freeze({
    ...base,
    effectiveTaxRate: periodDriver(flatVec(0.245), {
      ...base.effectiveTaxRate.meta,
      rationale:
        "Ongoing tax credits and favorable geographic mix keep the effective tax rate near recent GAAP lows.",
      basis: "Favorable mix & credits",
    }),
    cashInterestYield: scalarDriver(0.0375, {
      ...base.cashInterestYield.meta,
      rationale:
        "Stronger short-term reinvestment rates lift yield on operating cash reserves.",
      basis: "Higher cash sweep yield",
    }),
    regularDpsGrowth: scalarDriver(0.1, {
      ...base.regularDpsGrowth.meta,
      rationale:
        "Higher free cash flow supports faster annual regular dividend compounding.",
      basis: "Faster dividend growth",
    }),
    annualBuybackDollars: periodDriver(
      vecFromTuple([
        1300, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
      ]),
      {
        ...base.annualBuybackDollars.meta,
        rationale:
          "Stronger organic cash generation funds accelerated baseline share repurchases.",
        basis: "Accelerated buybacks",
      }
    ),
    excessCashBuybackSweepPct: scalarDriver(0.5, {
      ...base.excessCashBuybackSweepPct.meta,
      rationale:
        "Higher cash-flow visibility increases excess-cash distribution into buybacks.",
      basis: "Higher cash sweep share",
    }),
  })
}

export function downsideCapitalStructureDrivers(): CapitalStructureDrivers {
  const base = baseCapitalStructureDrivers()
  return Object.freeze({
    ...base,
    effectiveTaxRate: periodDriver(flatVec(0.255), {
      ...base.effectiveTaxRate.meta,
      rationale:
        "Lower equity-award tax benefits and higher international statutory mix lift the effective tax rate.",
      basis: "Reduced discrete credits",
    }),
    cashInterestYield: scalarDriver(0.0325, {
      ...base.cashInterestYield.meta,
      rationale:
        "Lower deposit rates trim interest earned on cash and short-term investments.",
      basis: "Lower deposit yield",
    }),
    regularDpsGrowth: scalarDriver(0.05, {
      ...base.regularDpsGrowth.meta,
      rationale:
        "Slower earnings growth moderates regular annual dividend expansion.",
      basis: "Moderated payout growth",
    }),
    annualBuybackDollars: periodDriver(
      vecFromTuple([600, 650, 700, 700, 750, 750, 800, 800, 850, 850]),
      {
        ...base.annualBuybackDollars.meta,
        rationale:
          "Elevated CapEx and softer cash conversion restrain discretionary share repurchases.",
        basis: "Conservative buybacks",
      }
    ),
    excessCashBuybackSweepPct: scalarDriver(0.25, {
      ...base.excessCashBuybackSweepPct.meta,
      rationale:
        "Higher liquidity retention limits excess cash deployed into share repurchases.",
      basis: "Lower cash sweep share",
    }),
  })
}
