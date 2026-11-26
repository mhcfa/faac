import {
  periodDriver,
  scalarDriver,
  type OperatingScalarDrivers,
  type OperatingVectorDrivers,
} from "./types.ts"

/**
 * Grounded Base Case period-vector drivers (FY2027E-FY2031E).
 * Anchored on Q3 2026 run-rate, management Q4/FY26/FY27 guidance, and FY24-FY25 base rates.
 */
export const baseOperatingVectors: OperatingVectorDrivers = Object.freeze({
  foaRevenueGrowth: periodDriver(
    {
      "2027E": 0.19,
      "2028E": 0.15,
      "2029E": 0.12,
      "2030E": 0.1,
      "2031E": 0.08,
    },
    {
      label: "Family of Apps revenue growth",
      format: "percentage",
      decimals: 1,
      category: "Segment revenue growth",
      basis: "Run-rate taper",
      rationale:
        "Balances strong AI ad-ranking and Advantage+ conversion gains against macro cyclicality, EU DMA/DSA targeting friction, and China cross-border ad reseller exposure.",
      source: "Meta Platforms Form 10-Q (Q3 2026) & Form 10-K (FY2025)",
    }
  ),
  foaOtherRevShareOfFoa: periodDriver(
    {
      "2027E": 0.018,
      "2028E": 0.02,
      "2029E": 0.022,
      "2030E": 0.023,
      "2031E": 0.025,
    },
    {
      label: "Family of Apps other revenue % of FoA",
      format: "percentage",
      decimals: 1,
      category: "Segment revenue growth",
      basis: "Structural mix shift",
      rationale:
        "Balances expanding WhatsApp Business messaging and Meta Verified adoption against potential European WhatsApp AI competition remedies and slower non-ad monetization.",
      source: "Meta Platforms Form 10-Q (Q3 2026), Note 14",
    }
  ),
  rlRevenueGrowth: periodDriver(
    {
      "2027E": 0.1,
      "2028E": 0.12,
      "2029E": 0.12,
      "2030E": 0.1,
      "2031E": 0.1,
    },
    {
      label: "Reality Labs revenue growth",
      format: "percentage",
      decimals: 1,
      category: "Segment revenue growth",
      basis: "Hardware adoption curve",
      rationale:
        "Balances early AI smart-glasses traction against historically lumpy Quest consumer headset cycles and limited mass-market attach rates.",
      source: "Meta Platforms Form 10-Q (Q3 2026), Note 14",
    }
  ),
  foaCashOpexPctFoaRev: periodDriver(
    {
      "2027E": 0.442,
      "2028E": 0.434,
      "2029E": 0.426,
      "2030E": 0.42,
      "2031E": 0.415,
    },
    {
      label: "FoA cash operating costs % of FoA revenue",
      format: "percentage",
      decimals: 1,
      category: "Operating cost structure",
      basis: "Scale taper vs. lease & SBC headwinds",
      rationale:
        "Balances modest revenue-scale leverage off clean 9M26 cash OpEx against rising data-center power/rent from uncommenced leases ($355.7B) and sticky AI talent/RSU costs.",
      source: "Q3 2026 Form 10-Q, Notes 10 & 11",
    }
  ),
  rlOperatingLoss: periodDriver(
    {
      "2027E": -15_000,
      "2028E": -13_500,
      "2029E": -12_000,
      "2030E": -11_000,
      "2031E": -10_000,
    },
    {
      label: "Reality Labs operating income (loss)",
      format: "currency",
      decimals: 0,
      category: "Operating cost structure",
      basis: "Guided loss moderation",
      rationale:
        "Balances management's FY2027 Reality Labs cost-reduction target and wearable scale against a multi-year history of widening annual hardware and AR/VR R&D deficits.",
      source: "Q3 2026 Earnings Release (Ex. 99.1)",
    }
  ),
  capexPctRevenue: periodDriver(
    {
      "2027E": 0.47,
      "2028E": 0.39,
      "2029E": 0.32,
      "2030E": 0.26,
      "2031E": 0.22,
    },
    {
      label: "Total CapEx (incl. finance leases) % of revenue",
      format: "percentage",
      decimals: 1,
      category: "Capital intensity & depreciation",
      basis: "AI buildout digestion to FY24 rate",
      rationale:
        "Balances multi-year GPU/data-center purchase commitments and recurring AI cluster refresh against post-2027 digestion toward Meta's pre-boom capital intensity.",
      source: "Q3 2026 Form 10-Q (N.10) & Ex. 99.1",
    }
  ),
  daPctBegNetPpe: periodDriver(
    {
      "2027E": 0.142,
      "2028E": 0.155,
      "2029E": 0.168,
      "2030E": 0.176,
      "2031E": 0.18,
    },
    {
      label: "D&A % of opening net PP&E",
      format: "percentage",
      decimals: 1,
      category: "Capital intensity & depreciation",
      basis: "Server-heavy mix & CIP commissioning",
      rationale:
        "Balances temporarily lower near-term depreciation from non-depreciating Q3 CIP against higher steady-state depreciation as shorter-lived 5.5-year AI servers dominate incremental net PP&E.",
      source: "FY25 10-K (Note 6) & Q3 2026 10-Q",
    }
  ),
  sbcPctRevenue: periodDriver(
    {
      "2027E": 0.112,
      "2028E": 0.106,
      "2029E": 0.1,
      "2030E": 0.095,
      "2031E": 0.09,
    },
    {
      label: "Share-based compensation % of revenue",
      format: "percentage",
      decimals: 1,
      category: "Capital allocation & dilution",
      basis: "Unrecognized RSU amortization",
      rationale:
        "Balances gradual revenue-scale dilution of the unrecognized RSU backlog against intense frontier AI engineering compensation; fully expensed inside EBIT and FCFF.",
      source: "Q3 2026 Form 10-Q, Note 11",
    }
  ),
  apPctRevenue: periodDriver(
    {
      "2027E": 0.065,
      "2028E": 0.06,
      "2029E": 0.055,
      "2030E": 0.05,
      "2031E": 0.045,
    },
    {
      label: "Accounts payable % of revenue",
      format: "percentage",
      decimals: 1,
      category: "Working capital unwind",
      basis: "Unpaid PP&E payable normalization",
      rationale:
        "Balances elevated near-term AI vendor payables against natural working-capital unwind of unpaid PP&E balances as CapEx intensity moderates across FY2028E-FY2031E.",
      source: "Q3 2026 Form 10-Q, Cash Flow Supp.",
    }
  ),
  opAccruedPctRevenue: periodDriver(
    {
      "2027E": 0.112,
      "2028E": 0.107,
      "2029E": 0.102,
      "2030E": 0.097,
      "2031E": 0.092,
    },
    {
      label: "Operating accrued expenses % of revenue",
      format: "percentage",
      decimals: 1,
      category: "Working capital unwind",
      basis: "Ex-legal, ex-debt accrual taper",
      rationale:
        "Balances high Q3 2026 accrued property & equipment balances against steady-state accrual normalization as construction intensity fades (excludes current LT debt and legal reserves).",
      source: "Q3 2026 Form 10-Q, Note 8",
    }
  ),
  commonDividendPerShare: periodDriver(
    {
      "2027E": 2.2,
      "2028E": 2.31,
      "2029E": 2.43,
      "2030E": 2.55,
      "2031E": 2.68,
    },
    {
      label: "Annual common dividend per share",
      format: "currency",
      decimals: 2,
      category: "Capital allocation & dilution",
      basis: "Modest dividend progression",
      rationale:
        "Balances steady dividend-per-share progression with liquidity preservation during peak AI capital expenditure absorption.",
      source: "Q3 2026 Form 10-Q, Cash Flows",
    }
  ),
  annualShareRepurchases: periodDriver(
    {
      "2027E": 0,
      "2028E": 0,
      "2029E": 15_000,
      "2030E": 35_000,
      "2031E": 50_000,
    },
    {
      label: "Annual common share repurchases",
      format: "currency",
      decimals: 0,
      category: "Capital allocation & dilution",
      basis: "FCF-gated buyback resumption",
      rationale:
        "Balances near-term buyback suspension during negative/constrained FCF against resumed share count management once post-CapEx cash generation inflects.",
      source: "Q3 2026 Form 10-Q (zero 9M26)",
    }
  ),
})

export const baseOperatingScalars: OperatingScalarDrivers = Object.freeze({
  q4RevenueGuidance: scalarDriver(74_500, {
    label: "Q4 2026E consolidated revenue",
    format: "currency",
    decimals: 0,
    category: "FY2026 stub & guidance anchors",
    basis: "Management guidance midpoint",
    rationale:
      "Balances holiday ad-demand momentum against seasonal macro sensitivity at the midpoint of CFO Q4 2026 consolidated revenue outlook.",
    source: "Q3 2026 Earnings Release (Ex. 99.1)",
  }),
  q4RlRevenue: scalarDriver(931, {
    label: "Q4 2026E Reality Labs revenue",
    format: "currency",
    decimals: 0,
    category: "FY2026 stub & guidance anchors",
    basis: "Prior-year holiday run-rate",
    rationale:
      "Balances holiday AI smart-glasses demand against flat Quest hardware volumes relative to prior-year Q4 seasonality.",
    source: "FY25 Form 10-K & Q3 2026 Form 10-Q",
  }),
  q4FoaOtherRevenue: scalarDriver(1_200, {
    label: "Q4 2026E FoA other revenue",
    format: "currency",
    decimals: 0,
    category: "FY2026 stub & guidance anchors",
    basis: "Sequential run-rate",
    rationale:
      "Balances sequential WhatsApp Business messaging expansion against a modest non-advertising revenue base.",
    source: "Q3 2026 Form 10-Q, Note 14",
  }),
  fy26TotalGaapExpenses: scalarDriver(177_000, {
    label: "FY2026E total GAAP expenses",
    format: "currency",
    decimals: 0,
    category: "FY2026 stub & guidance anchors",
    basis: "Management guidance midpoint",
    rationale:
      "Balances cost discipline from May 2026 workforce reductions against rising infrastructure depreciation and AI compensation at the FY2026 expense guidance midpoint.",
    source: "Q3 2026 Earnings Release (Ex. 99.1)",
  }),
  fy26RlOperatingLoss: scalarDriver(-18_500, {
    label: "FY2026E Reality Labs operating loss",
    format: "currency",
    decimals: 0,
    category: "FY2026 stub & guidance anchors",
    basis: "Management guidance midpoint",
    rationale:
      "Balances early wearable revenue contribution against ongoing AR/VR hardware R&D spending at the FY2026 guidance midpoint.",
    source: "Q3 2026 Earnings Release (Ex. 99.1)",
  }),
  fy26TotalCapex: scalarDriver(140_000, {
    label: "FY2026E total CapEx (incl. finance leases)",
    format: "currency",
    decimals: 0,
    category: "FY2026 stub & guidance anchors",
    basis: "Management guidance midpoint",
    rationale:
      "Balances Q4 server delivery and data-center construction pace against potential vendor supply bottlenecks at the FY2026 CapEx guidance midpoint.",
    source: "Q3 2026 Earnings Release (Ex. 99.1)",
  }),
  q4DaAnnualizedRate: scalarDriver(0.136, {
    label: "Q4 2026E annualized D&A % opening net PP&E",
    format: "percentage",
    decimals: 1,
    category: "FY2026 stub & guidance anchors",
    basis: "Opening PP&E run-rate (CIP-adjusted)",
    rationale:
      "Balances elevated non-depreciating Q3 construction-in-progress share against accelerating server commissioning entering Q4 2026.",
    source: "Q3 2026 Form 10-Q, Note 6",
  }),
  q4SbcPctRevenue: scalarDriver(0.105, {
    label: "Q4 2026E SBC % of revenue",
    format: "percentage",
    decimals: 1,
    category: "FY2026 stub & guidance anchors",
    basis: "Quarterly run-rate",
    rationale:
      "Balances seasonally higher Q4 revenue denominator against expanding quarterly RSU amortization from 2026 AI hiring.",
    source: "Q3 2026 Form 10-Q, Note 11",
  }),
  financeLeaseCapexShare: scalarDriver(0.032, {
    label: "Finance lease principal % of total CapEx",
    format: "percentage",
    decimals: 1,
    category: "Working capital, tax & financing",
    basis: "9M26 actual mix",
    rationale:
      "Balances recent cash finance-lease principal share against potential future shift between direct PP&E ownership and leased data-center structures.",
    source: "Q3 2026 Form 10-Q, Cash Flows",
  }),
  effectiveTaxRate: scalarDriver(0.165, {
    label: "Normalized effective tax rate",
    format: "percentage",
    decimals: 1,
    category: "Working capital, tax & financing",
    basis: "Guided run-rate vs. statutory/UTB risk",
    rationale:
      "Balances OBBBA immediate R&D expensing and Q4 2026 guided tax rate against upward risk from CAMT, Pillar Two, and adverse IRS transfer-pricing resolution.",
    source: "Q3 2026 Ex. 99.1 & 10-Q Note 12",
  }),
  arDays: scalarDriver(35.5, {
    label: "Accounts receivable days (DSO)",
    format: "number",
    decimals: 1,
    category: "Working capital, tax & financing",
    basis: "Historical average",
    rationale:
      "Balances stable historical digital-advertising billing cycles against seasonal year-end agency collection timing.",
    source: "FY25 Form 10-K & Q3 2026 Form 10-Q",
  }),
  prepaidPctRevenue: scalarDriver(0.048, {
    label: "Prepaid & other current assets % of revenue",
    format: "percentage",
    decimals: 1,
    category: "Working capital, tax & financing",
    basis: "Normalized working capital",
    rationale:
      "Balances partial normalization from elevated Q3 2026 vendor/power prepayments against ongoing upfront AI capacity deposits.",
    source: "Q3 2026 Form 10-Q",
  }),
  annualLegalSettlementPayout: scalarDriver(2_000, {
    label: "Annual cash payout of accrued legal reserves",
    format: "currency",
    decimals: 0,
    category: "Working capital, tax & financing",
    basis: "Installment schedule (ex-DCF)",
    rationale:
      "Models cash settlement drawdown of existing Q3 2026 accrued legal reserves on the 3-statement balance sheet and CFO; excluded from unlevered DCF to prevent double-counting with the EV bridge deduction.",
    source: "Q3 2026 Form 10-Q, Notes 8 & 10",
  }),
  cashYieldRate: scalarDriver(0.04, {
    label: "Interest yield on cash & marketable securities",
    format: "percentage",
    decimals: 2,
    category: "Working capital, tax & financing",
    basis: "Money-market & Treasury curve",
    rationale:
      "Weighs elevated Treasury yields against potential Federal Reserve rate easing across the forecast horizon.",
    source: "Q3 2026 Form 10-Q & Fed yields",
  }),
  legacyDebtAvgCoupon: scalarDriver(0.0525, {
    label: "Blended coupon on pre-Nov 2026 senior notes",
    format: "percentage",
    decimals: 2,
    category: "Working capital, tax & financing",
    basis: "Tranche-weighted face coupon",
    rationale:
      "Weighted average effective coupon across the Aug 2022 through May 2026 USD senior notes, reflecting lower legacy issuance costs relative to Nov 2026 refinancing rates.",
    source: "Q3 2026 Form 10-Q, Note 9",
  }),
  revolverRate: scalarDriver(0.065, {
    label: "Short-term credit facility / revolver rate",
    format: "percentage",
    decimals: 2,
    category: "Working capital, tax & financing",
    basis: "SOFR + IG facility margin",
    rationale:
      "Short-term liquidity facility cost triggered only if unrestricted cash breaches the minimum operating buffer under downside stress.",
    source: "Nov 2026 Senior Notes pricing ref.",
  }),
  minimumOperatingCash: scalarDriver(15_000, {
    label: "Minimum operating cash buffer",
    format: "currency",
    decimals: 0,
    category: "Working capital, tax & financing",
    basis: "Global working liquidity floor",
    rationale:
      "Minimum unrestricted operating cash held across global subsidiaries prior to short-term liquidity facility draws.",
    source: "Institutional liquidity convention",
  }),
  netShareSettlementPctSbc: scalarDriver(0.42, {
    label: "Employee RSU tax withholding % of SBC",
    format: "percentage",
    decimals: 1,
    category: "Working capital, tax & financing",
    basis: "Statutory RSU tax withholding",
    rationale:
      "Aligns statutory employee payroll tax withholding with grant-date fair value as share price normalizes toward recent grant prices.",
    source: "Q3 2026 Form 10-Q, CFS & Note 11",
  }),
  annualGrossRsuDilutionShares: scalarDriver(64.0, {
    label: "Annual gross RSU vesting (million shares)",
    format: "number",
    decimals: 1,
    category: "Working capital, tax & financing",
    basis: "FY24-9M26 vesting run-rate",
    rationale:
      "Reflects trailing annual gross RSU vesting cadence alongside higher 2026 AI engineering grant volumes.",
    source: "Q3 2026 Form 10-Q, Note 11",
  }),
  rsuNetShareWithholdingRate: scalarDriver(0.42, {
    label: "RSU shares withheld for taxes % of gross",
    format: "percentage",
    decimals: 1,
    category: "Working capital, tax & financing",
    basis: "Statutory employee tax withholding",
    rationale:
      "Matches statutory share withholding retirement rate on employee RSU vestings, limiting net share expansion relative to gross grants.",
    source: "FY25 Form 10-K & Q3 2026 Form 10-Q",
  }),
  revenueStressShockPct: scalarDriver(0.0, {
    label: "Revenue stress shock (FY27E overlay)",
    format: "percentage",
    decimals: 1,
    category: "Stress & liquidity controls",
    basis: "Zero in standard scenarios",
    rationale:
      "Multiplicative revenue shock applied to FY2027E base (compounding through FY2031E) for downside liquidity and balance-sheet stress testing.",
    source: "Downside stress-testing parameter",
  }),
})
