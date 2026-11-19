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
  readonly unamortizedDiscountAmortAnnual: Driver<number>
  readonly specialDivFyAbsentWeight: Driver<number>
  readonly scheduledDebtFyAbsentWeight: Driver<number>
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
  readonly finLeaseInterestRate: Driver<number>
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
    expr: '(MarketAnchors["maturities_thereafter", "val"] - @table["tranche_apr32", "fy26_principal"]) / 5',
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
      note: "Matures May 2027 (FY27E) per 10-K Note 4 (Debt); repaid strictly from cash reserves without refinancing.",
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
      note: "Matures Jun 2027 (FY27E) per 10-K Note 4 (Debt); together with May 2027 notes comprises $2,250M FY27E maturities.",
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
      note: "Matures Apr 2030 (FY30E) per 10-K Note 4 (Debt); cash-funded redemption from organic cash generation.",
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
      note: "Matures Apr 2032 (FY32E) per 10-K Note 4 (Debt); cash-funded redemption.",
    }),
    Object.freeze({
      id: "tranche_japan",
      label: tm.japanLabel,
      couponCell: Object.freeze({
        kind: "expr" as const,
        expr: 'ScalarAssumptionsActive["japan_debt_coupon_rate", "val"]',
      }),
      maturityDate: "2029-2036",
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
      note: "Exact FY29E ($136M) and FY31E ($161M) maturities per 10-K Note 4 (Debt); remaining $878M principal amortizes evenly across FY32E–FY36E ($175.6M/yr) at the blended Japan senior note coupon.",
    }),
  ])
}

export function baseCapitalStructureDrivers(): CapitalStructureDrivers {
  return Object.freeze({
    effectiveTaxRate: periodDriver(flatVec(0.25), {
      label: "Normalized effective income tax rate (ETR)",
      format: "percentage",
      decimals: 1,
      category: "Tax & Non-Operating Income",
      rationale:
        "Historical FY22-FY26 GAAP ETR ranged 24.4%-25.9% aided by discrete RSU windfall & R&D tax credits; 25.0% reflects normalized US statutory (21%) + state/foreign mix.",
      basis: "Normalized run-rate excl. discrete windfalls",
      source: "FY26 Form 10-K, Note 8 (Income Taxes)",
      gapId: "GAP-009",
    }),
    cashInterestYield: scalarDriver(0.035, {
      label: "Interest yield on opening cash & STI",
      format: "percentage",
      decimals: 2,
      category: "Tax & Non-Operating Income",
      rationale:
        "Reflects blended global operating cash/STI return (FY24 3.50%, FY26 3.93% including IEEPA refund interest) as short rates ease from current 4.1%-4.7% T-bill levels.",
      basis: "Historical yield + rate curve normalization",
      source: "FY26 Form 10-K, Item 8; U.S. Treasury H.15 (2026-11-13)",
      gapId: "GAP-009",
    }),
    fxOtherNonOp: scalarDriver(0, {
      label: "FX transaction gains & other non-operating, net ($M)",
      format: "currency",
      decimals: 0,
      category: "Tax & Non-Operating Income",
      rationale:
        "Foreign-currency transaction gains and miscellaneous non-operating items cannot be forecast reliably and normalize to zero.",
      basis: "Zero speculative FX",
      source: "FY26 Form 10-K, Item 8",
    }),
    stiNetMaturityFy27: scalarDriver(0, {
      label: "Net short-term investment maturities / (purchases) FY27E ($M)",
      format: "currency",
      decimals: 0,
      category: "Liquidity & Debt Mechanics",
      rationale:
        "Cash & equivalents alone ($20.2B opening + FY27E CFO) comfortably funds the $13.3B special dividend and $2.25B debt maturities while maintaining >$8B cash; STI held steady at $1,094M.",
      basis: "Excess cash buffer sufficiency",
      source: "FY26 Form 10-K, Item 8",
    }),
    minCashBuffer: scalarDriver(2000, {
      label: "Minimum operating cash buffer ($M)",
      format: "currency",
      decimals: 0,
      category: "Liquidity & Debt Mechanics",
      rationale:
        "Floor below which automated short-term credit facility draws trigger (backstopped by $2,118M bank facilities); matches global working-capital clearing buffer.",
      basis: "Operating liquidity floor",
      source: "FY26 Form 10-K, Note 4 (Debt)",
    }),
    revolverSpreadOverRf: scalarDriver(0.0064, {
      label: "Short-term facility spread over 10Y UST (AA OAS)",
      format: "basis_points",
      category: "Liquidity & Debt Mechanics",
      rationale:
        "Benchmarked to 2026-11-13 ICE BofA AA Corporate OAS (64 bps) matching Costco's AA S&P/Fitch rating.",
      basis: "Market AA OAS spread",
      source: "ICE BofA AA U.S. Corporate Index OAS (2026-11-13)",
    }),
    japanDebtCouponRate: scalarDriver(0.0235, {
      label: "Japan Guaranteed Senior Notes blended coupon rate",
      format: "percentage",
      decimals: 2,
      category: "Liquidity & Debt Mechanics",
      rationale:
        "Weighted blended coupon across FY24 ($500M at 1.400%-2.120%) and FY26 ($500M at 2.620%-3.680%) Japan Guaranteed Senior Notes where 10-K Note 4 (Debt) discloses rate bands rather than a single blended coupon.",
      basis: "Blended tranche-band midpoint",
      source: "FY26 Form 10-K, Note 4 (Debt)",
      gapId: "GAP-010",
    }),
    unamortizedDiscountAmortAnnual: scalarDriver(2.0, {
      label: "Annual unamortized debt discount amortization ($M/yr)",
      format: "currency",
      decimals: 1,
      category: "Liquidity & Debt Mechanics",
      rationale:
        "Reflects FY23-FY26 historical unamortized debt discount amortization tapering ($33M -> $13M) as the $2,250M 2027 senior notes retire.",
      basis: "Historical discount amortization taper",
      source: "FY26 Form 10-K, Note 4 (Debt)",
      gapId: "GAP-010",
    }),
    specialDivFyAbsentWeight: scalarDriver(0.737, {
      label: "Special dividend FY absent cash-interest weight",
      format: "percentage",
      decimals: 1,
      category: "Liquidity & Debt Mechanics",
      rationale:
        "Special $30.00/sh dividend pays Dec 4, 2026 (96 days into FY27E), leaving 73.7% of the fiscal year without those cash balances earning interest.",
      basis: "Dec 4, 2026 payout day-count",
      source: "Form 8-K Ex. 99.1 (Nov 10, 2026)",
    }),
    scheduledDebtFyAbsentWeight: scalarDriver(0.23, {
      label: "Scheduled debt maturity FY absent cash-interest weight",
      format: "percentage",
      decimals: 1,
      category: "Liquidity & Debt Mechanics",
      rationale:
        "Principal-weighted fraction of fiscal year absent following scheduled May/Jun 2027 senior note redemptions ($1,000M May + $1,250M Jun).",
      basis: "Maturity-month principal weighting",
      source: "FY26 Form 10-K, Note 4 (Debt)",
    }),
    specialDividendPerShareFy27: scalarDriver(30, {
      label: "FY27E Special cash dividend per share ($/sh)",
      format: "currency",
      decimals: 2,
      category: "Capital Returns & Share Mechanics",
      rationale:
        "Declared Nov 10, 2026 ($30.00/sh, ex-date Nov 24, pay Dec 4, 2026); $0 modeled in FY28E-FY36E.",
      basis: "Declared 8-K Ex. 99.1 event",
      source: "Form 8-K Ex. 99.1 (Nov 10, 2026)",
    }),
    regularDpsGrowth: scalarDriver(0.08, {
      label: "Regular annual DPS growth rate (from $5.88/sh)",
      format: "percentage",
      decimals: 1,
      category: "Capital Returns & Share Mechanics",
      rationale:
        "Starts from Oct 2026 annualized $5.88/sh ($1.47/qtr); 8% growth tracks long-run dividend compounding discipline.",
      basis: "Historical payout compounding",
      source: "Oct 14, 2026 dividend release; FY26 Form 10-K, Item 8",
    }),
    annualBuybackDollars: periodDriver(
      vecFromTuple([850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300]),
      {
        label: "Baseline annual share repurchases ($M)",
        format: "currency",
        decimals: 0,
        category: "Capital Returns & Share Mechanics",
        rationale:
          "Consistent with FY25-FY26 anti-dilutive pace ($847M-$903M/yr) under the reauthorized $4B Nov 2030 repurchase program, before excess-cash sweep.",
        basis: "Anti-dilutive run-rate",
        source: "FY26 Form 10-K, Note 6 & Note 9",
      }
    ),
    targetOperatingCashBuffer: scalarDriver(12000, {
      label: "Target operating cash & STI liquidity buffer ($M)",
      format: "currency",
      decimals: 0,
      category: "Capital Returns & Share Mechanics",
      rationale:
        "Matches FY22-FY25 pre-special-dividend Cash & STI liquidity band (~$11B-$15B); opening cash net of scheduled debt and special dividends above this buffer funds automated buyback sweeps.",
      basis: "FY22-FY25 operating liquidity band",
      source: "FY26 Form 10-K, Item 8",
    }),
    excessCashBuybackSweepPct: scalarDriver(0.4, {
      label: "Opening excess cash buyback sweep (%)",
      format: "percentage",
      decimals: 0,
      category: "Capital Returns & Share Mechanics",
      rationale:
        "Sweeps 40% of opening Cash & STI above the $12B target buffer (net of scheduled debt maturities and special dividends) into incremental repurchases, preventing unrealistic idle cash accumulation.",
      basis: "Capital allocation excess-cash sweep",
      source: "Form 8-K (Nov 10, 2026); FY26 Form 10-K, Item 8",
    }),
    buybackPriceGrowth: scalarDriver(0.05, {
      label: "Assumed share repurchase price escalation (%/yr)",
      format: "percentage",
      decimals: 1,
      category: "Capital Returns & Share Mechanics",
      rationale:
        "Escalates from FY26 ex-dividend market price to derive share count reduction without creating a circular link to intrinsic DCF price.",
      basis: "Non-circular share-price scalar",
      source: "NASDAQ close (2026-11-13); FY26 Form 10-K, Note 9",
    }),
    rsuVestedShares: periodDriver(
      vecFromTuple([0.9, 0.9, 0.88, 0.88, 0.86, 0.86, 0.85, 0.85, 0.85, 0.85]),
      {
        label: "RSU vested & net shares delivered (M shares)",
        format: "number",
        decimals: 3,
        category: "Capital Returns & Share Mechanics",
        rationale:
          "Tracks FY26 actual net RSU share delivery (0.920M) after employee tax withholding.",
        basis: "FY26 dilution cadence",
        source: "FY26 Form 10-K, Item 8 & Note 7",
      }
    ),
    rsuTaxWithholdingPctSbc: scalarDriver(0.391, {
      label: "RSU tax withholding cash outflow (% of SBC expense)",
      format: "percentage",
      decimals: 1,
      category: "Capital Returns & Share Mechanics",
      rationale:
        "Matches FY26 actual ratio ($361M / $924M = 39.1%) reflecting net-share settlement of employee RSUs.",
      basis: "FY26 actual settlement ratio",
      source: "FY26 Form 10-K, Item 8 & Note 7",
    }),
    dilutiveRsuShares: scalarDriver(0.474, {
      label: "Incremental dilutive RSU shares (TSM, M shares)",
      format: "number",
      decimals: 3,
      category: "Capital Returns & Share Mechanics",
      rationale:
        "Held at FY26 treasury-stock-method incremental RSU overhang (0.474M shares).",
      basis: "FY26 diluted EPS spread",
      source: "FY26 Form 10-K, Note 9",
    }),
    finLeasePctSales: scalarDriver(0.00475, {
      label: "Total finance lease liabilities (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Lease Parameters",
      rationale:
        "Scales modestly with logistics/depot fleet expansion at FY26 balance intensity (0.48% of net sales).",
      basis: "FY26 ratio",
      source: "FY26 Form 10-K, Note 5 (Leases)",
    }),
    finLeaseInterestRate: scalarDriver(0.0472, {
      label: "Finance lease weighted-average discount rate",
      format: "percentage",
      decimals: 2,
      category: "Lease Parameters",
      rationale:
        "Anchored directly to FY26 disclosed weighted-average finance lease discount rate (4.72%).",
      basis: "FY26 10-K Note 5 WADR",
      source: "FY26 Form 10-K, Note 5 (Leases)",
    }),
    opLeaseLiabToRouRatio: scalarDriver(0.9663, {
      label: "Operating lease liabilities / ROU asset ratio",
      format: "percentage",
      decimals: 2,
      category: "Lease Parameters",
      rationale:
        "Preserves FY26 GAAP ratio (2,606 / 2,697 = 96.63%) separating prepaid/initial lease incentives from lease obligations.",
      basis: "FY26 10-K Note 5 ratio",
      source: "FY26 Form 10-K, Note 5 (Leases)",
    }),
    opLeaseCurrentShare: scalarDriver(0.0737, {
      label: "Current share of total operating lease liabilities",
      format: "percentage",
      decimals: 2,
      category: "Lease Parameters",
      rationale:
        "Anchored to FY26 current/total operating lease split (192 / 2,606 = 7.37%).",
      basis: "FY26 maturity split",
      source: "FY26 Form 10-K, Note 5 (Leases)",
    }),
    finLeaseCurrentShare: scalarDriver(0.0665, {
      label: "Current share of total finance lease liabilities",
      format: "percentage",
      decimals: 2,
      category: "Lease Parameters",
      rationale:
        "Anchored to FY26 current/total finance lease split (94 / 1,413 = 6.65%).",
      basis: "FY26 maturity split",
      source: "FY26 Form 10-K, Note 5 (Leases)",
    }),
  })
}

export function bullCapitalStructureDrivers(): CapitalStructureDrivers {
  const base = baseCapitalStructureDrivers()
  return Object.freeze({
    ...base,
    effectiveTaxRate: periodDriver(flatVec(0.245), {
      ...base.effectiveTaxRate.meta,
      rationale:
        "Continued R&D credits and favorable foreign mix keep effective tax rate near FY26 GAAP average (24.5%).",
    }),
    cashInterestYield: scalarDriver(0.0375, {
      ...base.cashInterestYield.meta,
      rationale: "Higher cash sweep yields 3.75% across forecast.",
    }),
    regularDpsGrowth: scalarDriver(0.1, {
      ...base.regularDpsGrowth.meta,
      rationale: "Stronger FCF supports 10% annual regular dividend growth.",
    }),
    annualBuybackDollars: periodDriver(
      vecFromTuple([
        1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900,
      ]),
      {
        ...base.annualBuybackDollars.meta,
        rationale: "Higher cash generation funds accelerated buybacks.",
      }
    ),
    excessCashBuybackSweepPct: scalarDriver(0.5, {
      ...base.excessCashBuybackSweepPct.meta,
      rationale:
        "Higher cash visibility accelerates excess cash sweep to 50% above target buffer.",
    }),
  })
}

export function bearCapitalStructureDrivers(): CapitalStructureDrivers {
  const base = baseCapitalStructureDrivers()
  return Object.freeze({
    ...base,
    effectiveTaxRate: periodDriver(flatVec(0.255), {
      ...base.effectiveTaxRate.meta,
      rationale:
        "Reduced discrete stock-comp windfalls and higher international statutory taxes lift ETR to 25.5%.",
    }),
    cashInterestYield: scalarDriver(0.0325, {
      ...base.cashInterestYield.meta,
      rationale: "Lower short-term deposit rates trim cash yield to 3.25%.",
    }),
    regularDpsGrowth: scalarDriver(0.05, {
      ...base.regularDpsGrowth.meta,
      rationale: "Slower earnings growth tempers dividend growth to 5%/yr.",
    }),
    annualBuybackDollars: periodDriver(
      vecFromTuple([600, 650, 700, 700, 750, 750, 800, 800, 850, 850]),
      {
        ...base.annualBuybackDollars.meta,
        rationale: "Elevated CapEx preserves cash over discretionary buybacks.",
      }
    ),
    excessCashBuybackSweepPct: scalarDriver(0.25, {
      ...base.excessCashBuybackSweepPct.meta,
      rationale:
        "Conservative capital retention limits excess cash buyback sweep to 25%.",
    }),
  })
}
