import {
  periodDriver,
  scalarDriver,
  vecFromTuple,
  type Driver,
  type PeriodVector,
} from "./types.ts"

export interface WorkingCapitalDrivers {
  readonly dsoDays: Driver<number>
  readonly dioDays: Driver<number>
  readonly dpoDays: Driver<number>
  readonly accruedSalariesDays: Driver<number>
  readonly otherCurrentAssetsPctSales: Driver<number>
  readonly otherCurrentLiabOpPctSales: Driver<number>
  readonly accruedRewardsPctSales: Driver<number>
  readonly deferredMfiPctMfi: Driver<number>
  readonly opLeaseRouPctSales: Driver<number>
  readonly otherLtOpAssetsPctSales: Driver<number>
  readonly otherLtOpLiabPctSales: Driver<number>
  readonly capexPctNetSales: Driver<PeriodVector>
  readonly daPctBegPpe: Driver<number>
}

export function baseWorkingCapitalDrivers(): WorkingCapitalDrivers {
  return Object.freeze({
    dsoDays: scalarDriver(4.8, {
      label: "Receivables days (DSO, on net sales)",
      format: "number",
      decimals: 1,
      category: "Working Capital Efficiency",
      rationale:
        "Held near FY26 level (4.85d), reflecting vendor rebates and third-party co-brand card receivables.",
      basis: "FY26 steady state",
      source: "FY26 Form 10-K, Item 8",
    }),
    dioDays: scalarDriver(27.0, {
      label: "Inventory days (DIO, on merchandise costs)",
      format: "number",
      decimals: 1,
      category: "Working Capital Efficiency",
      rationale:
        "Normalized slightly above FY26 trough (26.6d) to reflect expanding non-foods/international supply chains (5Y median 29.1d).",
      basis: "Normalized cycle midpoint",
      source: "FY26 Form 10-K, Item 8",
    }),
    dpoDays: scalarDriver(31.2, {
      label: "Accounts payable days (DPO, on merchandise costs)",
      format: "number",
      decimals: 1,
      category: "Working Capital Efficiency",
      rationale:
        "Sustains negative working capital float near FY26 actual (31.1d) given high inventory velocity.",
      basis: "FY26 run-rate",
      source: "FY26 Form 10-K, Item 8",
    }),
    accruedSalariesDays: scalarDriver(7.0, {
      label: "Accrued salaries & benefits (days of net sales)",
      format: "number",
      decimals: 1,
      category: "Working Capital Efficiency",
      rationale:
        "Consistent with FY24-FY26 empirical payroll accrual cadence (6.91d-7.02d).",
      basis: "3Y historical average",
      source: "FY26 Form 10-K, Item 8",
    }),
    otherCurrentAssetsPctSales: scalarDriver(0.0067, {
      label: "Other current assets (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Working Capital Efficiency",
      rationale:
        "Matches FY26 actual prepaid & other current asset intensity (0.67%).",
      basis: "FY26 ratio",
      source: "FY26 Form 10-K, Item 8",
    }),
    otherCurrentLiabOpPctSales: scalarDriver(0.024, {
      label: "Other current operating liabilities (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Working Capital Efficiency",
      rationale:
        "Excludes current operating/finance lease liabilities (tracked separately on lease schedule); matches FY26 operating OCL ratio (2.40%).",
      basis: "FY26 ex-lease ratio",
      source: "FY26 Form 10-K, Item 8 & Note 5 (Leases)",
    }),
    accruedRewardsPctSales: scalarDriver(0.0102, {
      label: "Accrued member rewards (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Working Capital Efficiency",
      rationale:
        "Tied to Executive 2% reward liability intensity (FY26 1.02%), rising gradually over time only if penetration increases.",
      basis: "FY26 actual ratio",
      source: "FY26 Form 10-K, Item 7 & Item 8",
    }),
    deferredMfiPctMfi: scalarDriver(0.509, {
      label: "Deferred membership fees (% of annual MFI)",
      format: "percentage",
      decimals: 1,
      category: "Working Capital Efficiency",
      rationale:
        "Annual memberships recognize ratably over 12 months, structurally holding year-end deferred MFI near 50.9% of annual MFI (FY26: 50.89%).",
      basis: "FY26 accrual ratio",
      source: "FY26 Form 10-K, Item 8",
    }),
    opLeaseRouPctSales: scalarDriver(0.0091, {
      label: "Operating lease ROU assets (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Fixed Assets & Leases",
      rationale:
        "Majority-owned warehouse real estate (~80% owned) holds operating lease ROU footprint stable near 0.91% of net sales.",
      basis: "FY26 ownership structure",
      source: "FY26 Form 10-K, Item 1 & Item 8",
    }),
    otherLtOpAssetsPctSales: scalarDriver(0.0139, {
      label: "Other long-term assets (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Fixed Assets & Leases",
      rationale:
        "Matches FY26 intensity (1.39%, inclusive of finance lease ROU assets and deferred tax/other assets).",
      basis: "FY26 ratio",
      source: "FY26 Form 10-K, Item 8",
    }),
    otherLtOpLiabPctSales: scalarDriver(0.0055, {
      label: "Other LT operating liabilities ex-fin lease (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Fixed Assets & Leases",
      rationale:
        "Excludes LT finance lease obligations (tracked in Debt & Leases); matches FY26 non-lease LT operating liability intensity (0.55%).",
      basis: "FY26 ex-lease ratio",
      source: "FY26 Form 10-K, Item 8 & Note 5 (Leases)",
    }),
    capexPctNetSales: periodDriver(
      vecFromTuple([
        0.0232, 0.0215, 0.02, 0.019, 0.0185, 0.018, 0.0175, 0.0172, 0.017,
        0.017,
      ]),
      {
        label: "CapEx (% of net sales)",
        format: "percentage",
        decimals: 2,
        category: "Fixed Assets & Leases",
        rationale:
          "FY27E reflects $7.5B guided CapEx surge (~2.32% sales) for owned-club builds, logistics hubs, and fresh depots, moderating toward 1.70% steady state as openings slow.",
        basis: "Guided FY27E step-up -> steady state",
        source: "Q4 FY26 earnings call; FY26 Form 10-K, Item 8",
      }
    ),
    daPctBegPpe: scalarDriver(0.0838, {
      label: "D&A (% of beginning net PP&E)",
      format: "percentage",
      decimals: 2,
      category: "Fixed Assets & Leases",
      rationale:
        "Tightly clustered across FY24-FY26 (8.38%, 8.36%, 8.38%), reflecting ~12-year blended useful life across owned buildings and fixtures.",
      basis: "FY24-FY26 empirical average",
      source: "FY26 Form 10-K, Item 8",
    }),
  })
}

export function bullWorkingCapitalDrivers(): WorkingCapitalDrivers {
  const base = baseWorkingCapitalDrivers()
  return Object.freeze({
    ...base,
    dioDays: scalarDriver(26.5, {
      ...base.dioDays.meta,
      rationale: "Faster inventory turns sustain 26.5d DIO.",
    }),
    dpoDays: scalarDriver(31.5, {
      ...base.dpoDays.meta,
      rationale: "Modest vendor terms leverage expands float to 31.5d.",
    }),
    capexPctNetSales: periodDriver(
      vecFromTuple([
        0.023, 0.021, 0.0195, 0.0185, 0.018, 0.0175, 0.017, 0.0168, 0.0165,
        0.0165,
      ]),
      {
        ...base.capexPctNetSales.meta,
        rationale:
          "Higher sales denominator and depot scale bring CapEx intensity down to 1.65% by FY35E-FY36E.",
      }
    ),
  })
}

export function bearWorkingCapitalDrivers(): WorkingCapitalDrivers {
  const base = baseWorkingCapitalDrivers()
  return Object.freeze({
    ...base,
    dioDays: scalarDriver(28.0, {
      ...base.dioDays.meta,
      rationale:
        "Slower sell-through and higher e-commerce SKU buffer push DIO up to 28.0d.",
    }),
    dpoDays: scalarDriver(30.5, {
      ...base.dpoDays.meta,
      rationale: "Slower inventory turn reduces negative WC float to 30.5d.",
    }),
    capexPctNetSales: periodDriver(
      vecFromTuple([
        0.024, 0.023, 0.022, 0.021, 0.0205, 0.02, 0.0195, 0.0192, 0.019, 0.019,
      ]),
      {
        ...base.capexPctNetSales.meta,
        rationale:
          "Higher store-remodel, cold-chain, and IT automation capex keeps intensity at 1.90%-2.40% despite slower openings.",
      }
    ),
  })
}
