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
      label: "Receivables days (DSO)",
      format: "number",
      decimals: 1,
      category: "Working capital",
      rationale:
        "Held near recent steady state, reflecting vendor rebate timing and co-brand card receivables.",
      basis: "FY26 steady state",
      source: "FY26 10-K, Item 8",
    }),
    dioDays: scalarDriver(27.0, {
      label: "Inventory days (DIO)",
      format: "number",
      decimals: 1,
      category: "Working capital",
      rationale:
        "Modestly above recent trough to accommodate non-foods mix and international supply-chain lead times.",
      basis: "Normalized cycle midpoint",
      source: "FY26 10-K, Item 8",
    }),
    dpoDays: scalarDriver(31.2, {
      label: "Accounts payable days (DPO)",
      format: "number",
      decimals: 1,
      category: "Working capital",
      rationale:
        "Sustains negative working capital float supported by rapid merchandise inventory velocity.",
      basis: "FY26 run-rate",
      source: "FY26 10-K, Item 8",
    }),
    accruedSalariesDays: scalarDriver(7.0, {
      label: "Accrued salaries (days sales)",
      format: "number",
      decimals: 1,
      category: "Working capital",
      rationale:
        "Matches empirical multi-year payroll accrual cadence relative to net sales.",
      basis: "3Y historical average",
      source: "FY26 10-K, Item 8",
    }),
    otherCurrentAssetsPctSales: scalarDriver(0.0067, {
      label: "Other current assets (% sales)",
      format: "percentage",
      decimals: 2,
      category: "Working capital",
      rationale:
        "Tracks recent prepaid and miscellaneous operating current asset intensity.",
      basis: "FY26 ratio",
      source: "FY26 10-K, Item 8",
    }),
    otherCurrentLiabOpPctSales: scalarDriver(0.024, {
      label: "Other curr. op. liab. (% sales)",
      format: "percentage",
      decimals: 2,
      category: "Working capital",
      rationale:
        "Reflects operating accruals excluding current lease liabilities tracked separately on the debt and lease schedule.",
      basis: "FY26 ex-lease ratio",
      source: "FY26 10-K, Note 5",
    }),
    accruedRewardsPctSales: scalarDriver(0.0102, {
      label: "Accrued member rewards (%)",
      format: "percentage",
      decimals: 2,
      category: "Working capital",
      rationale:
        "Anchored to Executive reward accrual intensity relative to net merchandise sales.",
      basis: "FY26 actual ratio",
      source: "FY26 10-K, Item 8",
    }),
    deferredMfiPctMfi: scalarDriver(0.509, {
      label: "Deferred MFI (% annual MFI)",
      format: "percentage",
      decimals: 1,
      category: "Working capital",
      rationale:
        "Annual memberships amortize ratably over twelve months, holding deferred fees near half of annual fee revenue.",
      basis: "FY26 accrual ratio",
      source: "FY26 10-K, Item 8",
    }),
    opLeaseRouPctSales: scalarDriver(0.0091, {
      label: "Op. lease ROU assets (% sales)",
      format: "percentage",
      decimals: 2,
      category: "Fixed assets and leases",
      rationale:
        "Predominantly owned warehouse real estate keeps operating lease ROU footprint low relative to sales.",
      basis: "FY26 ownership structure",
      source: "FY26 10-K, Item 1",
    }),
    otherLtOpAssetsPctSales: scalarDriver(0.0139, {
      label: "Other LT assets (% sales)",
      format: "percentage",
      decimals: 2,
      category: "Fixed assets and leases",
      rationale:
        "Tracks recent long-term operating asset intensity, including finance lease ROU and deferred tax assets.",
      basis: "FY26 ratio",
      source: "FY26 10-K, Item 8",
    }),
    otherLtOpLiabPctSales: scalarDriver(0.0055, {
      label: "Other LT op. liab. (% sales)",
      format: "percentage",
      decimals: 2,
      category: "Fixed assets and leases",
      rationale:
        "Measures non-lease long-term operating liabilities after isolating long-term finance lease obligations.",
      basis: "FY26 ex-lease ratio",
      source: "FY26 10-K, Note 5",
    }),
    capexPctNetSales: periodDriver(
      vecFromTuple([
        0.0232, 0.0215, 0.02, 0.019, 0.0185, 0.018, 0.0175, 0.0172, 0.017,
        0.017,
      ]),
      {
        label: "CapEx (% net sales)",
        format: "percentage",
        decimals: 2,
        category: "Fixed assets and leases",
        rationale:
          "Reflects guided near-term CapEx step-up for owned-club builds, logistics hubs, and fresh depots before moderating as openings taper.",
        basis: "Guided FY27E -> steady state",
        source: "Q4 FY26 call; FY26 10-K",
      }
    ),
    daPctBegPpe: scalarDriver(0.0838, {
      label: "D&A (% beginning net PP&E)",
      format: "percentage",
      decimals: 2,
      category: "Fixed assets and leases",
      rationale:
        "Consistent with multi-year empirical depreciation intensity across owned warehouse buildings and fixtures.",
      basis: "FY24–FY26 average",
      source: "FY26 10-K, Item 8",
    }),
  })
}

export function upsideWorkingCapitalDrivers(): WorkingCapitalDrivers {
  const base = baseWorkingCapitalDrivers()
  return Object.freeze({
    ...base,
    dioDays: scalarDriver(26.5, {
      ...base.dioDays.meta,
      rationale:
        "Faster warehouse inventory velocity trims merchandise days on hand.",
      basis: "Faster inventory turns",
    }),
    dpoDays: scalarDriver(31.5, {
      ...base.dpoDays.meta,
      rationale: "Incremental supplier scale expands payables float modestly.",
      basis: "Supplier scale float",
    }),
    capexPctNetSales: periodDriver(
      vecFromTuple([
        0.023, 0.021, 0.0195, 0.0185, 0.018, 0.0175, 0.017, 0.0168, 0.0165,
        0.0165,
      ]),
      {
        ...base.capexPctNetSales.meta,
        rationale:
          "Stronger sales density and depot scale moderate capital intensity over the decade.",
        basis: "Higher depot utilization",
      }
    ),
  })
}

export function downsideWorkingCapitalDrivers(): WorkingCapitalDrivers {
  const base = baseWorkingCapitalDrivers()
  return Object.freeze({
    ...base,
    dioDays: scalarDriver(28.0, {
      ...base.dioDays.meta,
      rationale:
        "Slower sell-through and expanded e-commerce inventory buffers lengthen days on hand.",
      basis: "Higher SKU buffer",
    }),
    dpoDays: scalarDriver(30.5, {
      ...base.dpoDays.meta,
      rationale:
        "Slower inventory turnover narrows negative working capital float.",
      basis: "Narrower payables float",
    }),
    capexPctNetSales: periodDriver(
      vecFromTuple([
        0.024, 0.023, 0.022, 0.021, 0.0205, 0.02, 0.0195, 0.0192, 0.019, 0.019,
      ]),
      {
        ...base.capexPctNetSales.meta,
        rationale:
          "Higher remodel, cold-chain, and warehouse automation spending sustains elevated CapEx intensity.",
        basis: "Elevated remodel & IT CapEx",
      }
    ),
  })
}
