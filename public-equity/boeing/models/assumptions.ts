import type { CurrencyCode, FormatPreset } from "f8-engine"
import {
  FORECAST_PERIODS,
  type ForecastPeriod,
  type ScenarioKey,
} from "./timeline.ts"

export interface DriverMeta {
  readonly label: string
  readonly format: FormatPreset
  readonly decimals?: number
  readonly currency?: CurrencyCode
  readonly category: string
  readonly rationale: string
  readonly basis?: string
  readonly source?: string
  /** Code-only audit tag; never rendered into client workbook strings. */
  readonly gapId?: "GAP-004" | "GAP-005"
}

export interface Driver<T> {
  readonly value: T
  readonly meta: DriverMeta
}

export type PeriodVector = Readonly<Record<ForecastPeriod, number>>

export function scalarDriver(value: number, meta: DriverMeta): Driver<number> {
  if (!Number.isFinite(value)) {
    throw new Error(`${meta.label}: scalar value must be finite`)
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

export interface ScalarDriverSet {
  readonly asp737: Driver<number>
  readonly asp767: Driver<number>
  readonly asp777f: Driver<number>
  readonly asp777x: Driver<number>
  readonly asp787: Driver<number>
  readonly aspEscalation: Driver<number>
  readonly servicesRevShare: Driver<number>
  readonly statutoryTaxRate: Driver<number>
  readonly foreignStateTaxRate: Driver<number>
  readonly foreignTaxFloorAnnual: Driver<number>
  readonly nolUtilCap: Driver<number>
  readonly nciIncomeAnnual: Driver<number>
  readonly pensionOpebOutflowAnnual: Driver<number>
  readonly empTaxSbcAnnual: Driver<number>
  readonly stockCompIssuancePx: Driver<number>
  readonly gaapDilutiveAwards: Driver<number>
  readonly cashYieldRate: Driver<number>
  readonly legacyDebtCoupon: Driver<number>
  readonly minCashBalance: Driver<number>
  readonly targetCashCeiling: Driver<number>
  readonly targetGrossDebtFloor: Driver<number>
  readonly post2030AnnualMaturity: Driver<number>
  readonly minLiquidityCovenant: Driver<number>
  readonly maxDebtToCapCovenant: Driver<number>
  readonly betaRegime: Driver<number>
  readonly targetAssetBeta: Driver<number>
  readonly targetDebtWeight: Driver<number>
  readonly kdBbWeight: Driver<number>
  readonly terminalGrowth: Driver<number>
  readonly terminalRonic: Driver<number>
  readonly midYearConventionFlag: Driver<number>
  readonly sotpMultBca: Driver<number>
  readonly sotpMultBds: Driver<number>
  readonly sotpMultBgs: Driver<number>
  readonly airbusLeaseInterestEur: Driver<number>
}

export interface PeriodDriverSet {
  readonly del737: Driver<PeriodVector>
  readonly del767: Driver<PeriodVector>
  readonly del777f: Driver<PeriodVector>
  readonly del777x: Driver<PeriodVector>
  readonly del787: Driver<PeriodVector>
  readonly bcaOtherRev: Driver<PeriodVector>
  readonly bdsRevGrowth: Driver<PeriodVector>
  readonly bgsRevGrowth: Driver<PeriodVector>
  readonly unallocRev: Driver<PeriodVector>
  readonly bcaEbitMargin: Driver<PeriodVector>
  readonly bdsEbitMargin: Driver<PeriodVector>
  readonly bgsEbitMargin: Driver<PeriodVector>
  readonly ebitUnallocated: Driver<PeriodVector>
  readonly fasCasAdj: Driver<PeriodVector>
  readonly opIncomeInvest: Driver<PeriodVector>
  readonly rdPctRev: Driver<PeriodVector>
  readonly sgaPctRev: Driver<PeriodVector>
  readonly nonOpPensionOther: Driver<PeriodVector>
  readonly capexPctRev: Driver<PeriodVector>
  readonly depPctBegPpe: Driver<PeriodVector>
  readonly intangiblesAmort: Driver<PeriodVector>
  readonly sbcExpense: Driver<PeriodVector>
  readonly treasury401k: Driver<PeriodVector>
  readonly invPctRev: Driver<PeriodVector>
  readonly advPctInv: Driver<PeriodVector>
  readonly dsoDays: Driver<PeriodVector>
  readonly unbilledDays: Driver<PeriodVector>
  readonly otherCurrAssetsPctRev: Driver<PeriodVector>
  readonly dpoDays: Driver<PeriodVector>
  readonly accruedPctRev: Driver<PeriodVector>
}

export interface ScenarioBundle {
  readonly key: ScenarioKey
  readonly name: string
  readonly framing: string
  readonly scalars: ScalarDriverSet
  readonly periods: PeriodDriverSet
}

export const SCALAR_DRIVER_KEYS = [
  "asp737",
  "asp767",
  "asp777f",
  "asp777x",
  "asp787",
  "aspEscalation",
  "servicesRevShare",
  "statutoryTaxRate",
  "foreignStateTaxRate",
  "foreignTaxFloorAnnual",
  "nolUtilCap",
  "nciIncomeAnnual",
  "pensionOpebOutflowAnnual",
  "empTaxSbcAnnual",
  "stockCompIssuancePx",
  "gaapDilutiveAwards",
  "cashYieldRate",
  "legacyDebtCoupon",
  "minCashBalance",
  "targetCashCeiling",
  "targetGrossDebtFloor",
  "post2030AnnualMaturity",
  "minLiquidityCovenant",
  "maxDebtToCapCovenant",
  "betaRegime",
  "targetAssetBeta",
  "targetDebtWeight",
  "kdBbWeight",
  "terminalGrowth",
  "terminalRonic",
  "midYearConventionFlag",
  "sotpMultBca",
  "sotpMultBds",
  "sotpMultBgs",
  "airbusLeaseInterestEur",
] as const
export type ScalarDriverKey = (typeof SCALAR_DRIVER_KEYS)[number]

export const PERIOD_DRIVER_KEYS = [
  "del737",
  "del767",
  "del777f",
  "del777x",
  "del787",
  "bcaOtherRev",
  "bdsRevGrowth",
  "bgsRevGrowth",
  "unallocRev",
  "bcaEbitMargin",
  "bdsEbitMargin",
  "bgsEbitMargin",
  "ebitUnallocated",
  "fasCasAdj",
  "opIncomeInvest",
  "rdPctRev",
  "sgaPctRev",
  "nonOpPensionOther",
  "capexPctRev",
  "depPctBegPpe",
  "intangiblesAmort",
  "sbcExpense",
  "treasury401k",
  "invPctRev",
  "advPctInv",
  "dsoDays",
  "unbilledDays",
  "otherCurrAssetsPctRev",
  "dpoDays",
  "accruedPctRev",
] as const
export type PeriodDriverKey = (typeof PERIOD_DRIVER_KEYS)[number]

function buildBaseScalars(): ScalarDriverSet {
  return Object.freeze({
    asp737: scalarDriver(51.0, {
      label: "737 realized net ASP ($M)",
      format: "currency",
      decimals: 1,
      category: "Commercial aircraft pricing",
      basis: "Historical BCA delivery mix calibration",
      rationale:
        "Net realized narrowbody price after standard airline discounts and customer concessions, calibrated against FY2025 and 9M 2026 BCA revenue.",
      source: "Boeing FY25 10-K & Q3 26 10-Q",
    }),
    asp767: scalarDriver(82.0, {
      label: "767 realized net ASP ($M)",
      format: "currency",
      decimals: 1,
      category: "Commercial aircraft pricing",
      basis: "Commercial 767 freighter backlog completion",
      rationale:
        "Realized net revenue per remaining commercial 767 freighter delivered by BCA through 2027 completion; military KC-46A tanker revenue is booked inside BDS.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    asp777f: scalarDriver(145.0, {
      label: "777F realized net ASP ($M)",
      format: "currency",
      decimals: 1,
      category: "Commercial aircraft pricing",
      basis: "Legacy freighter backlog pricing",
      rationale:
        "Realized net widebody freighter price on remaining 777F deliveries prior to 777-8F transition.",
      source: "Boeing FY2025 Form 10-K",
    }),
    asp777x: scalarDriver(178.0, {
      label: "777X realized net ASP ($M)",
      format: "currency",
      decimals: 1,
      category: "Commercial aircraft pricing",
      basis: "Flagship widebody backlog pricing",
      rationale:
        "Realized net price per 777-9 / 777-8F aircraft reflecting flagship widebody payload premium net of launch customer concessions.",
      source: "Boeing Q3 2026 10-Q, Note 11",
    }),
    asp787: scalarDriver(130.0, {
      label: "787 realized net ASP ($M)",
      format: "currency",
      decimals: 1,
      category: "Commercial aircraft pricing",
      basis: "787-9 and 787-10 delivery mix",
      rationale:
        "Blended net realized price across 787-8, 787-9, and 787-10 widebody deliveries calibrated to FY2025–9M 2026 BCA revenue.",
      source: "Boeing FY25 10-K & Q3 26 10-Q",
    }),
    aspEscalation: scalarDriver(0.02, {
      label: "Annual aircraft ASP escalation",
      format: "percentage",
      decimals: 1,
      category: "Commercial aircraft pricing",
      basis: "Contractual CPI/ECI as concessions fade",
      rationale:
        "Net annual realized price escalation across commercial contracts reflecting standard ECI/CPI clauses and gradual runoff of late-delivery customer concessions.",
      source: "Boeing FY2025 10-K, Item 7",
    }),
    servicesRevShare: scalarDriver(0.14, {
      label: "Services share of consolidated revenue",
      format: "percentage",
      decimals: 1,
      category: "Operating & tax parameters",
      basis: "9M 2026 ex-DAS actual mix",
      rationale:
        "Splits consolidated GAAP revenue between Products and Services lines consistent with post-DAS divestiture 9M 2026 reporting.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    statutoryTaxRate: scalarDriver(0.21, {
      label: "US statutory federal tax rate",
      format: "percentage",
      decimals: 1,
      category: "Operating & tax parameters",
      basis: "Internal Revenue Code statutory rate",
      rationale:
        "US federal statutory corporate tax rate; combines with 4.0% foreign/state tax rate (25.0% total) for DCF NOPAT, ROIC, WACC after-tax Kd, and EV bridge pension tax-effecting, while federal NOL carryforwards shield 80% of federal tax only.",
      source: "Boeing FY2025 10-K, Note 6",
    }),
    foreignStateTaxRate: scalarDriver(0.04, {
      label: "Foreign & state incremental tax rate",
      format: "percentage",
      decimals: 1,
      category: "Operating & tax parameters",
      basis: "Foreign jurisdiction & state cash tax profile",
      rationale:
        "Incremental foreign and state cash tax burden (bringing combined corporate rate to 25.0%) applied consistently across 3-statement cash taxes, DCF NOPAT, Terminal NOPAT, ROIC, and WACC.",
      source: "Boeing FY2025 10-K, Note 6",
    }),
    foreignTaxFloorAnnual: scalarDriver(120.0, {
      label: "Minimum foreign/state tax floor ($M/yr)",
      format: "currency",
      decimals: 0,
      category: "Operating & tax parameters",
      basis: "9M 2026 annualized foreign cash taxes",
      rationale:
        "Baseline foreign subsidiary and state cash tax obligation incurred even when consolidated US pre-tax income or EBIT is negative (prorated $30M in Q4 2026E).",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    nolUtilCap: scalarDriver(0.8, {
      label: "Federal NOL taxable income offset cap",
      format: "percentage",
      decimals: 1,
      category: "Operating & tax parameters",
      basis: "US federal tax statute (post-2017 NOL limit)",
      rationale:
        "Limits post-2017 federal NOL utilization to 80% of positive annual taxable income (federal 21% rate only; foreign/state tax paid in cash) until the audited carryforward pool is exhausted.",
      source: "Boeing FY2025 10-K, Note 6",
    }),
    nciIncomeAnnual: scalarDriver(16.0, {
      label: "Noncontrolling interest income ($M/yr)",
      format: "currency",
      decimals: 0,
      category: "Operating & tax parameters",
      basis: "9M 2026 annualized run rate",
      rationale:
        "Recurring net income attributable to noncontrolling joint-venture partners.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    pensionOpebOutflowAnnual: scalarDriver(-100.0, {
      label: "Unfunded OPEB/pension cash outflow ($M/yr)",
      format: "currency",
      decimals: 0,
      category: "Operating & tax parameters",
      basis: "9M 2026 cash flow run rate",
      rationale:
        "Ongoing cash benefit payments on unfunded retiree health and non-qualified plans; excluded from unlevered DCF to prevent double-counting with the EV bridge.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    empTaxSbcAnnual: scalarDriver(-50.0, {
      label: "Employee tax withholding on SBC ($M/yr)",
      format: "currency",
      decimals: 0,
      category: "Operating & tax parameters",
      basis: "FY2025–9M 2026 financing cash flow trend",
      rationale:
        "Cash paid to tax authorities for net-share-settled employee RSU vesting.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    stockCompIssuancePx: scalarDriver(185.0, {
      label: "GAAP EPS stock-comp issuance price ($/sh)",
      format: "currency",
      decimals: 2,
      category: "Operating & tax parameters",
      basis: "Medium-term GAAP share roll-forward price",
      rationale:
        "Average treasury-stock reissuance price used solely for the GAAP 3-statement EPS share roll-forward; DCF uses valuation-date shares with SBC and 401(k) deducted in FCFF.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    gaapDilutiveAwards: scalarDriver(2.5, {
      label: "GAAP dilutive equity awards (M sh)",
      format: "number",
      decimals: 2,
      category: "Operating & tax parameters",
      basis: "FY2025 profitable-period diluted EPS note",
      rationale:
        "Incremental treasury-stock-method common share equivalents added to GAAP diluted EPS when net income to common is positive.",
      source: "Boeing FY2025 10-K, Note 5",
    }),
    cashYieldRate: scalarDriver(0.038, {
      label: "Interest yield on cash & STI",
      format: "percentage",
      decimals: 2,
      category: "Debt & liquidity policy",
      basis: "Short-duration Treasury/money-market curve",
      rationale:
        "Annual interest yield earned on opening cash, cash equivalents, and marketable short-term investments.",
      source: "FRED H.15 & Q3 2026 10-Q",
    }),
    legacyDebtCoupon: scalarDriver(0.0495, {
      label: "Existing debt book effective coupon",
      format: "percentage",
      decimals: 2,
      category: "Debt & liquidity policy",
      basis: "Q3 2026 annualized interest vs carrying debt",
      rationale:
        "Weighted-average interest rate on Boeing's fixed-rate senior unsecured note stack prior to incremental refinancing.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    minCashBalance: scalarDriver(8000.0, {
      label: "Minimum target unrestricted cash ($M)",
      format: "currency",
      decimals: 0,
      category: "Debt & liquidity policy",
      basis: "Liquidity buffer above $5.0B covenant floor",
      rationale:
        "Cash floor triggering marketable short-term investment drawdown first and incremental debt issuance only after liquid STI is exhausted, maintaining ample cushion above the $5.0B credit agreement minimum.",
      source: "Boeing Form 8-K (Aug 24, 2026)",
    }),
    targetCashCeiling: scalarDriver(12000.0, {
      label: "Excess cash sweep threshold ($M)",
      format: "currency",
      decimals: 0,
      category: "Debt & liquidity policy",
      basis: "IG balance sheet de-leveraging priority",
      rationale:
        "Unrestricted cash balance above which surplus free cash flow sweeps toward discretionary gross debt reduction.",
      source: "Boeing Q3 2026 Form 10-Q",
    }),
    targetGrossDebtFloor: scalarDriver(28000.0, {
      label: "Target gross debt floor ($M)",
      format: "currency",
      decimals: 0,
      category: "Debt & liquidity policy",
      basis: "Mid-BBB investment-grade leverage target",
      rationale:
        "Long-term gross debt floor (~1.5x steady-state EBITDA) at which discretionary debt sweeps halt and excess cash accumulates on the balance sheet.",
      source: "Peer IG capital structure medians",
    }),
    post2030AnnualMaturity: scalarDriver(3500.0, {
      label: "Post-2030 scheduled annual maturities ($M)",
      format: "currency",
      decimals: 0,
      category: "Debt & liquidity policy",
      basis: "Long-term debt maturity tower beyond 2030",
      rationale:
        "Annual scheduled senior note maturities in FY2031–FY2032 beyond the five-year schedule disclosed in Note 17.",
      source: "Boeing FY2025 10-K, Note 17",
    }),
    minLiquidityCovenant: scalarDriver(5000.0, {
      label: "Credit agreement min liquidity floor ($M)",
      format: "currency",
      decimals: 0,
      category: "Debt & liquidity policy",
      basis: "Revolving credit facility covenant",
      rationale:
        "Contractual minimum liquidity covenant across Boeing's $10.0B undrawn revolving credit facilities as amended August 24, 2026.",
      source: "Boeing Form 8-K (Aug 24, 2026)",
    }),
    maxDebtToCapCovenant: scalarDriver(0.6, {
      label: "Credit agreement max debt/capital cap",
      format: "percentage",
      decimals: 1,
      category: "Debt & liquidity policy",
      basis: "Revolving credit facility covenant",
      rationale:
        "Maximum consolidated debt to total capital ratio (as defined in the credit agreements excluding AOCI and designated charges).",
      source: "Boeing Form 8-K (Aug 24, 2026)",
    }),
    betaRegime: scalarDriver(2, {
      label: "Equity beta basis (1=2Y, 2=5Y, 3=IG)",
      format: "integer",
      category: "Cost of capital & terminal value",
      basis: "Empirical OLS & Hamada re-levering",
      rationale:
        "Selects live empirical 5Y monthly OLS beta in Base (1.307), stressed 2Y weekly OLS beta in Downside (1.427), or Airbus-parity asset beta re-levered at IG target debt weight via Hamada in Upside (0.974).",
      source: "Yahoo Finance returns (Nov 20)",
    }),
    targetAssetBeta: scalarDriver(0.86, {
      label: "Target IG commercial OEM asset beta",
      format: "number",
      decimals: 2,
      category: "Cost of capital & terminal value",
      basis: "Airbus 5Y unlevered commercial OEM beta",
      rationale:
        "Unlevered commercial airframe asset beta anchored to Airbus SE (0.86), re-levered via Hamada at 15.0% IG target debt weight and 25.0% combined tax rate in Upside (equity beta 0.974, WACC 8.62%).",
      source: "5Y monthly OLS peer regressions",
    }),
    targetDebtWeight: scalarDriver(0.0, {
      label: "Target debt weight (0% = spot market)",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & terminal value",
      basis: "Scenario-consistent capital structure weights",
      rationale:
        "0.0% uses live spot gross debt weight (26.2%, ex-operating leases) in Base and Downside; Upside sets 15.0% target IG gross debt weight paired with Hamada-relevered beta to prevent leverage-arbitrage WACC distortion.",
      source: "Q3 26 10-Q & IG peer targets",
    }),
    kdBbWeight: scalarDriver(0.5, {
      label: "Marginal Kd weight on BB HY vs BBB index",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & terminal value",
      basis: "Credit-tier index blend for BBB-/Baa3 issuer",
      rationale:
        "Weights FRED ICE BofA BB High Yield and BBB Corporate effective yields to proxy marginal 10Y refinancing cost across credit outcomes (50% BB / 50% BBB at BBB-/Baa3).",
      source: "FRED BBB & BB Yields (Nov 20)",
      gapId: "GAP-004",
    }),
    terminalGrowth: scalarDriver(0.03, {
      label: "Terminal perpetuity growth rate (g)",
      format: "percentage",
      decimals: 2,
      category: "Cost of capital & terminal value",
      basis: "Breakeven inflation plus real fleet growth",
      rationale:
        "Long-run nominal growth rate grounded above 10Y breakeven inflation (2.15%) for secular commercial air traffic while held constant across all scenarios.",
      source: "FRED 10Y Breakeven (Nov 20)",
    }),
    terminalRonic: scalarDriver(0.23, {
      label: "Terminal return on new invested capital",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & terminal value",
      basis: "Scenario steady-state incremental ROIC",
      rationale:
        "Drives terminal reinvestment rate (g / RONIC), calibrated to scenario steady-state operating capital productivity (18.0% Downside / 23.0% Base / 28.0% Upside) consistent with modeled FY32E ROIC.",
      source: "Modeled ROIC & peer productivity",
    }),
    midYearConventionFlag: scalarDriver(1, {
      label: "Mid-year cash flow discounting (1=Yes, 0=No)",
      format: "integer",
      category: "Cost of capital & terminal value",
      basis: "Continuous quarterly delivery cash timing",
      rationale:
        "Applies mid-period discounting to explicit operating cash flows while discounting terminal value from period end.",
      source: "Standard DCF convention",
    }),
    sotpMultBca: scalarDriver(16.0, {
      label: "SOTP FY29E EV/EBIT multiple — BCA",
      format: "multiple",
      decimals: 1,
      category: "SOTP & parity benchmarks",
      basis: "Commercial airframe OEM peer anchor",
      rationale:
        "Forward EBIT multiple applied to clean FY2029E BCA earnings (ex-$209M non-cash Spirit off-market contract amortization), aligned with Airbus SE trading range.",
      source: "Peer trading comps (Nov 20, 2026)",
    }),
    sotpMultBds: scalarDriver(15.5, {
      label: "SOTP FY29E EV/EBIT multiple — BDS",
      format: "multiple",
      decimals: 1,
      category: "SOTP & parity benchmarks",
      basis: "US defense prime peer anchor",
      rationale:
        "Forward EBIT multiple applied to normalized FY2029E BDS earnings, anchored at a modest discount to pure-play US defense primes.",
      source: "Peer trading comps (Nov 20, 2026)",
    }),
    sotpMultBgs: scalarDriver(19.0, {
      label: "SOTP FY29E EV/EBIT multiple — BGS",
      format: "multiple",
      decimals: 1,
      category: "SOTP & parity benchmarks",
      basis: "Commercial & defense aftermarket anchor",
      rationale:
        "Forward EBIT multiple reflecting BGS's recurring high-margin spares and sustainment profile, discounted vs pure-play engine aftermarket leaders.",
      source: "Peer trading comps (Nov 20, 2026)",
    }),
    airbusLeaseInterestEur: scalarDriver(80.0, {
      label: "Airbus SE IFRS 16 lease interest (€M)",
      format: "currency",
      decimals: 0,
      currency: "EUR",
      category: "SOTP & parity benchmarks",
      basis: "FY2025 run-rate proxy for US-GAAP LTM parity",
      rationale:
        "Annual IFRS 16 lease interest expense reclassified into operating rent alongside ROU depreciation for the supplemental US-GAAP-aligned Airbus trading multiple cross-check (paired with €2,387M IFRS 16 lease liability deduction from EV).",
      source: "Airbus FY25 Annual Rpt, Note 20",
      gapId: "GAP-005",
    }),
  })
}

function buildBasePeriods(): PeriodDriverSet {
  return Object.freeze({
    del737: periodDriver(
      {
        Q4_26E: 135,
        "2027E": 576,
        "2028E": 636,
        "2029E": 660,
        "2030E": 684,
        "2031E": 684,
        "2032E": 684,
      },
      {
        label: "737 deliveries (units)",
        format: "integer",
        category: "BCA commercial delivery cadence",
        basis: "FAA rate-stepped ramp to 57/month",
        rationale:
          "Steps from 45/mo in Q4 2026 to 48/mo in FY2027 following FAA rate concurrence, ramping through 53–55/mo in FY2028–FY2029 and stabilizing at 57/mo by FY2030.",
        source: "Boeing Q3 26 10-Q & FAA rate framework",
      }
    ),
    del767: periodDriver(
      {
        Q4_26E: 8,
        "2027E": 14,
        "2028E": 0,
        "2029E": 0,
        "2030E": 0,
        "2031E": 0,
        "2032E": 0,
      },
      {
        label: "767 commercial freighter deliveries (units)",
        format: "integer",
        category: "BCA commercial delivery cadence",
        basis: "Commercial 767 backlog completion (FY27)",
        rationale:
          "Delivers remaining commercial 767 freighter backlog (8 in Q4 2026E, 14 in FY2027E) then drops to 0 in FY2028E–FY2032E across all scenarios; military KC-46A tanker revenue is recorded in BDS.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    del777f: periodDriver(
      {
        Q4_26E: 9,
        "2027E": 24,
        "2028E": 18,
        "2029E": 8,
        "2030E": 0,
        "2031E": 0,
        "2032E": 0,
      },
      {
        label: "777F legacy deliveries (units)",
        format: "integer",
        category: "BCA commercial delivery cadence",
        basis: "Backlog runoff into 777-8F transition",
        rationale:
          "Delivers remaining legacy 777F backlog through FY2029 as widebody freighter production transitions onto the 777X line.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    del777x: periodDriver(
      {
        Q4_26E: 0,
        "2027E": 12,
        "2028E": 30,
        "2029E": 48,
        "2030E": 54,
        "2031E": 60,
        "2032E": 60,
      },
      {
        label: "777X deliveries (units)",
        format: "integer",
        category: "BCA commercial delivery cadence",
        basis: "2027 EIS ramping to 5/month",
        rationale:
          "Assumes 777-9 certification and H2 2027 entry into service, ramping smoothly to 5/month (60/yr) by FY2031 against a multi-year widebody backlog.",
        source: "Boeing Q3 2026 Form 10-Q, Note 11",
      }
    ),
    del787: periodDriver(
      {
        Q4_26E: 25,
        "2027E": 108,
        "2028E": 120,
        "2029E": 120,
        "2030E": 120,
        "2031E": 120,
        "2032E": 120,
      },
      {
        label: "787 deliveries (units)",
        format: "integer",
        category: "BCA commercial delivery cadence",
        basis: "Charleston expansion to 10/month",
        rationale:
          "Ramps from ~8.3/month in Q4 2026 to 9/month in FY2027 and stabilizes at 10/month (120/yr) in FY2028–FY2032.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    bcaOtherRev: periodDriver(
      {
        Q4_26E: 220,
        "2027E": 900,
        "2028E": 950,
        "2029E": 1000,
        "2030E": 1050,
        "2031E": 1100,
        "2032E": 1150,
      },
      {
        label: "BCA other & structures revenue ($M)",
        format: "currency",
        decimals: 0,
        category: "BCA commercial delivery cadence",
        basis: "BCA residual & Spirit external structures",
        rationale:
          "Captures non-aircraft BCA revenue including modifications, commercial training, and residual third-party aerostructures.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    bdsRevGrowth: periodDriver(
      {
        Q4_26E: 0.052,
        "2027E": 0.05,
        "2028E": 0.045,
        "2029E": 0.04,
        "2030E": 0.035,
        "2031E": 0.035,
        "2032E": 0.035,
      },
      {
        label: "BDS revenue growth YoY",
        format: "percentage",
        decimals: 1,
        category: "Defense, Services & Corporate revenue",
        basis: "$100.5B Q3 2026 backlog conversion",
        rationale:
          "Steady mid-single-digit defense top-line conversion supported by record $100.5B BDS backlog, fading toward long-run US DoD budget growth.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    bgsRevGrowth: periodDriver(
      {
        Q4_26E: 0.065,
        "2027E": 0.065,
        "2028E": 0.058,
        "2029E": 0.055,
        "2030E": 0.052,
        "2031E": 0.05,
        "2032E": 0.048,
      },
      {
        label: "BGS ex-DAS revenue growth YoY",
        format: "percentage",
        decimals: 1,
        category: "Defense, Services & Corporate revenue",
        basis: "Commercial spares + flat US Gov services",
        rationale:
          "Post-DAS Global Services growth moderates from 6.5% to 4.8% reflecting mid-to-high single-digit commercial fleet spares/MRO growth tempered by flat U.S. government services budget guidance (~45% of BGS).",
        source: "Boeing FY25 10-K & Q3 26 10-Q",
      }
    ),
    unallocRev: periodDriver(
      {
        Q4_26E: -15,
        "2027E": -100,
        "2028E": -100,
        "2029E": -100,
        "2030E": -100,
        "2031E": -100,
        "2032E": -100,
      },
      {
        label: "Unallocated revenue eliminations ($M)",
        format: "currency",
        decimals: 0,
        category: "Defense, Services & Corporate revenue",
        basis: "Historical intersegment elimination run rate",
        rationale:
          "Intersegment revenue eliminations between BCA, BDS, and BGS.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    bcaEbitMargin: periodDriver(
      {
        Q4_26E: -0.048,
        "2027E": 0.0,
        "2028E": 0.03,
        "2029E": 0.06,
        "2030E": 0.078,
        "2031E": 0.086,
        "2032E": 0.09,
      },
      {
        label: "BCA EBIT margin",
        format: "percentage",
        decimals: 1,
        category: "Segment margins & corporate overhead",
        basis: "Pure-OEM airframe curve (ex-BGS spares)",
        rationale:
          "Recovers from Q4 2026 rework and Spirit integration drag through breakeven FY2027 (zero-margin early 777X) to 9.0% pure-OEM steady state (high-margin commercial spares sit in BGS; combined BCA + BGS Commercial benchmarks vs. Airbus US-GAAP-adjusted ~9.1%).",
        source: "Consensus FY26–29 & Airbus US-GAAP parity",
      }
    ),
    bdsEbitMargin: periodDriver(
      {
        Q4_26E: 0.022,
        "2027E": 0.035,
        "2028E": 0.05,
        "2029E": 0.07,
        "2030E": 0.082,
        "2031E": 0.09,
        "2032E": 0.095,
      },
      {
        label: "BDS EBIT margin",
        format: "percentage",
        decimals: 1,
        category: "Segment margins & corporate overhead",
        basis: "Fixed-price runoff below defense median",
        rationale:
          "Gradually expands as KC-46, T-7A, MQ-25, and VC-25B legacy fixed-price contracts roll off into cost-plus and international production, stabilizing at 9.5% below LMT/NOC (10.6–11.8%).",
        source: "Boeing Q3 26 10-Q & US defense peers",
      }
    ),
    bgsEbitMargin: periodDriver(
      {
        Q4_26E: 0.182,
        "2027E": 0.183,
        "2028E": 0.184,
        "2029E": 0.185,
        "2030E": 0.185,
        "2031E": 0.186,
        "2032E": 0.186,
      },
      {
        label: "BGS ex-DAS EBIT margin",
        format: "percentage",
        decimals: 1,
        category: "Segment margins & corporate overhead",
        basis: "9M 2026 ex-DAS actual margin stability",
        rationale:
          "Anchored directly to 9M 2026 ex-DAS operating margin (18.2%) with modest commercial spares mix leverage over the cycle.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    ebitUnallocated: periodDriver(
      {
        Q4_26E: -580,
        "2027E": -2200,
        "2028E": -2150,
        "2029E": -2100,
        "2030E": -2050,
        "2031E": -1975,
        "2032E": -1900,
      },
      {
        label: "Unallocated corporate items ($M)",
        format: "currency",
        decimals: 0,
        category: "Segment margins & corporate overhead",
        basis: "9M 2026 run rate with gradual efficiency",
        rationale:
          "Enterprise overhead, unallocated R&D, deferred compensation, and capitalized interest amortization tapering modestly from -$2.1B annualized post-Spirit integration.",
        source: "Boeing Q3 2026 Form 10-Q, Note 20",
      }
    ),
    fasCasAdj: periodDriver(
      {
        Q4_26E: 150,
        "2027E": 500,
        "2028E": 380,
        "2029E": 250,
        "2030E": 150,
        "2031E": 75,
        "2032E": 0,
      },
      {
        label: "FAS/CAS service cost adjustment ($M)",
        format: "currency",
        decimals: 0,
        category: "Segment margins & corporate overhead",
        basis: "Frozen defined-benefit plan runoff to $0",
        rationale:
          "Positive CAS pension recovery benefit fades smoothly from $150M in Q4 2026E and $500M in FY2027E down to $0 by FY2032E so frozen-plan pension benefits are never extrapolated into perpetuity.",
        source: "Boeing Q3 2026 Form 10-Q, Note 20",
      }
    ),
    opIncomeInvest: periodDriver(
      {
        Q4_26E: -25,
        "2027E": -40,
        "2028E": 0,
        "2029E": 40,
        "2030E": 40,
        "2031E": 40,
        "2032E": 40,
      },
      {
        label: "Income from operating investments ($M)",
        format: "currency",
        decimals: 0,
        category: "P&L expense structure",
        basis: "ULA Vulcan drag normalizing to +$40M/yr",
        rationale:
          "Captures near-term United Launch Alliance equity-method losses (-$25M in Q4 2026E / -$100M annualized and -$40M in FY2027E) following the Q1 2026 Vulcan anomaly and Q4 2026 ULA support before normalizing to +$40M/yr in FY2029E–FY2032E; excludes the non-recurring Q3 2026 HRL Laboratories gain.",
        source: "Boeing Q3 2026 Form 10-Q, Note 10",
      }
    ),
    rdPctRev: periodDriver(
      {
        Q4_26E: 0.036,
        "2027E": 0.035,
        "2028E": 0.034,
        "2029E": 0.033,
        "2030E": 0.032,
        "2031E": 0.032,
        "2032E": 0.032,
      },
      {
        label: "R&D expense (% of revenue)",
        format: "percentage",
        decimals: 1,
        category: "P&L expense structure",
        basis: "Post-777X certification R&D normalization",
        rationale:
          "Moderates from 3.7% in 9M 2026 toward 3.2% as 777-9 certification concludes while sustaining next-generation narrowbody and defense product investment.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    sgaPctRev: periodDriver(
      {
        Q4_26E: 0.052,
        "2027E": 0.051,
        "2028E": 0.049,
        "2029E": 0.048,
        "2030E": 0.047,
        "2031E": 0.046,
        "2032E": 0.046,
      },
      {
        label: "SG&A expense (% of revenue)",
        format: "percentage",
        decimals: 1,
        category: "P&L expense structure",
        basis: "Fixed G&A operating leverage",
        rationale:
          "Declines from 5.4% in 9M 2026 toward 4.6% as commercial delivery revenue scales over a relatively fixed administrative base.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    nonOpPensionOther: periodDriver(
      {
        Q4_26E: -70,
        "2027E": -260,
        "2028E": -220,
        "2029E": -180,
        "2030E": -150,
        "2031E": -125,
        "2032E": -100,
      },
      {
        label: "Non-operating pension & other ($M)",
        format: "currency",
        decimals: 0,
        category: "P&L expense structure",
        basis: "9M 2026 non-service pension cost run rate",
        rationale:
          "Reflects non-service net periodic benefit cost recognized in Other income/expense (offsetting cash interest income), gradually tapering as actuarial loss amortization declines.",
        source: "Boeing Q3 2026 Form 10-Q, Note 14",
      }
    ),
    capexPctRev: periodDriver(
      {
        Q4_26E: 0.036,
        "2027E": 0.034,
        "2028E": 0.031,
        "2029E": 0.029,
        "2030E": 0.028,
        "2031E": 0.027,
        "2032E": 0.027,
      },
      {
        label: "Capital expenditures (% of revenue)",
        format: "percentage",
        decimals: 1,
        category: "CapEx, D&A & stock-funded comp",
        basis: "Charleston/Spirit peak fading to 1.1x D&A",
        rationale:
          "Moderates from elevated 4.3% 9M 2026 investment (Charleston 787 expansion and Spirit integration) toward 2.7% maintenance-plus-growth cadence by FY2032.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    depPctBegPpe: periodDriver(
      {
        Q4_26E: 0.13,
        "2027E": 0.135,
        "2028E": 0.138,
        "2029E": 0.14,
        "2030E": 0.142,
        "2031E": 0.145,
        "2032E": 0.148,
      },
      {
        label: "Annualized depreciation (% beg PP&E)",
        format: "percentage",
        decimals: 1,
        category: "CapEx, D&A & stock-funded comp",
        basis: "PP&E useful-life calibration (7–8 yr blended)",
        rationale:
          "Calibrated to Q3 2026 D&A run rate on $16.7B net PP&E, edging upward as newer factory tooling with shorter useful lives enters service.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    intangiblesAmort: periodDriver(
      {
        Q4_26E: 70,
        "2027E": 260,
        "2028E": 230,
        "2029E": 200,
        "2030E": 170,
        "2031E": 140,
        "2032E": 120,
      },
      {
        label: "Acquired intangibles amortization ($M)",
        format: "currency",
        decimals: 0,
        category: "CapEx, D&A & stock-funded comp",
        basis: "Amortization of $1,279M Q3 2026 balance",
        rationale:
          "Declining amortization schedule on existing acquired intangible assets without assuming unannounced M&A.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    sbcExpense: periodDriver(
      {
        Q4_26E: 125,
        "2027E": 520,
        "2028E": 540,
        "2029E": 560,
        "2030E": 580,
        "2031E": 600,
        "2032E": 620,
      },
      {
        label: "Share-based compensation ($M)",
        format: "currency",
        decimals: 0,
        category: "CapEx, D&A & stock-funded comp",
        basis: "9M 2026 run rate with wage inflation",
        rationale:
          "Non-cash GAAP OCF add-back and APIC credit; remains expensed inside GAAP EBIT and is NEVER added back to Unlevered Economic FCFF.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    treasury401k: periodDriver(
      {
        Q4_26E: 440,
        "2027E": 1720,
        "2028E": 1780,
        "2029E": 1840,
        "2030E": 1900,
        "2031E": 1960,
        "2032E": 2020,
      },
      {
        label: "401(k) treasury-stock match ($M)",
        format: "currency",
        decimals: 0,
        category: "CapEx, D&A & stock-funded comp",
        basis: "9M 2026 run rate ($1.7B/yr) with payroll",
        rationale:
          "Employer 401(k) contribution funded via treasury stock (added back in GAAP OCF and reducing treasury stock, but excluded from Unlevered Economic FCFF as a real compensation cost).",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    invPctRev: periodDriver(
      {
        Q4_26E: 0.922,
        "2027E": 0.785,
        "2028E": 0.7,
        "2029E": 0.65,
        "2030E": 0.625,
        "2031E": 0.615,
        "2032E": 0.61,
      },
      {
        label: "Inventories (% annualized revenue)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & DPC unwind",
        basis: "737/787/777X WIP & DPC liquidation path",
        rationale:
          "Unwinds elevated $90.9B Q3 2026 commercial WIP and deferred production costs smoothly across Q4 2026–FY2029 as narrowbody and widebody deliveries accelerate, stabilizing at 61.0% of revenue.",
        source: "Boeing Q3 2026 Form 10-Q, Note 7",
      }
    ),
    advPctInv: periodDriver(
      {
        Q4_26E: 0.754,
        "2027E": 0.768,
        "2028E": 0.778,
        "2029E": 0.782,
        "2030E": 0.778,
        "2031E": 0.772,
        "2032E": 0.77,
      },
      {
        label: "Advances & billings (% inventories)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & DPC unwind",
        basis: "74.2% Q3 26 ratio normalizing on PDPs",
        rationale:
          "Links customer progress payments to inventory balances, releasing net inventories less advances smoothly over Q4 2026–FY2029 before stabilizing in steady state.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    dsoDays: periodDriver(
      {
        Q4_26E: 15.2,
        "2027E": 15.0,
        "2028E": 15.0,
        "2029E": 15.0,
        "2030E": 15.0,
        "2031E": 15.0,
        "2032E": 15.0,
      },
      {
        label: "Accounts receivable days (DSO)",
        format: "number",
        decimals: 1,
        category: "Working capital & DPC unwind",
        basis: "Q3 2026 historical run rate (15.3 days)",
        rationale:
          "Maintains tight commercial airline delivery-at-closing receivable collection terms.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    unbilledDays: periodDriver(
      {
        Q4_26E: 38.2,
        "2027E": 37.0,
        "2028E": 36.0,
        "2029E": 35.0,
        "2030E": 35.0,
        "2031E": 35.0,
        "2032E": 35.0,
      },
      {
        label: "Unbilled receivables days",
        format: "number",
        decimals: 1,
        category: "Working capital & DPC unwind",
        basis: "Q3 26 run rate (38.4d) on BDS milestones",
        rationale:
          "Modest improvement in defense contract milestone billing efficiency as BDS mix normalizes.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    otherCurrAssetsPctRev: periodDriver(
      {
        Q4_26E: 0.0275,
        "2027E": 0.027,
        "2028E": 0.026,
        "2029E": 0.026,
        "2030E": 0.025,
        "2031E": 0.025,
        "2032E": 0.025,
      },
      {
        label: "Other current assets (% revenue)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & DPC unwind",
        basis: "Q3 2026 run rate (2.8% of revenue)",
        rationale:
          "Prepaid expenses and supplier advances scaling gently with consolidated revenue.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    dpoDays: periodDriver(
      {
        Q4_26E: 65.0,
        "2027E": 63.0,
        "2028E": 61.0,
        "2029E": 59.0,
        "2030E": 57.5,
        "2031E": 56.5,
        "2032E": 56.0,
      },
      {
        label: "Accounts payable days (DPO)",
        format: "number",
        decimals: 1,
        category: "Working capital & DPC unwind",
        basis: "Q3 26 run rate (65.3d) normalizing to 56d",
        rationale:
          "Holds Q3 2026 payable cadence in Q4 2026 before moderating toward pre-crisis supplier payment terms as inventory turns normalize.",
        source: "Boeing Q3 2026 Form 10-Q",
      }
    ),
    accruedPctRev: periodDriver(
      {
        Q4_26E: 0.273,
        "2027E": 0.235,
        "2028E": 0.205,
        "2029E": 0.185,
        "2030E": 0.17,
        "2031E": 0.16,
        "2032E": 0.155,
      },
      {
        label: "Accrued liabilities (% revenue)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & DPC unwind",
        basis: "Loss-reserve & concession unwind to 15.5%",
        rationale:
          "Holds Q3 2026 level (27.3%) in Q4 2026 then unwinds steadily toward historical 15.5% of revenue as $6.7B forward-loss accruals and residual 737 MAX concessions liquidate.",
        source: "Boeing FY2025 Form 10-K, Note 15",
      }
    ),
  })
}

export function baseDrivers(): ScenarioBundle {
  return Object.freeze({
    key: "base",
    name: "Base",
    framing:
      "Consensus-aligned recovery on a consistent US GAAP operating-rent & 25.0% combined tax basis: 737 ramps smoothly to 57/mo, 787 to 10/mo, 777X enters service H2 2027 reaching 5/mo, and commercial 767 freighters complete in 2027 (KC-46A in BDS); pure-OEM BCA EBIT converges to 9.0% (BCA + BGS Commercial comparable to Airbus US-GAAP ~9.1%), BDS recovers to 9.5%, BGS moderates from 6.5% to 4.8% (flat US Gov guidance), and frozen-plan FAS/CAS fades to $0 by FY32E; credit/beta stay anchored to spot BBB-/Baa3 (26.2% spot gross debt weight, 5Y monthly OLS beta 1.307, 50/50 BBB–BB Kd, implying 9.26% WACC) with g = 3.0% and RONIC = 23.0%.",
    scalars: buildBaseScalars(),
    periods: buildBasePeriods(),
  })
}

export function downsideDrivers(): ScenarioBundle {
  const base = baseDrivers()
  return Object.freeze({
    key: "downside",
    name: "Downside",
    framing:
      "Execution friction and crossover credit stress across commercial ramp, defense margins, cash conversion, and cost of capital (holding terminal g = 3.0% constant, RONIC = 18.0%): FAA oversight and IAM 70/751 disruptions cap 737 at 50/mo, 787 at 9/mo, and push 777X EIS to 2028 (4/mo) with pure-OEM BCA margin capped at 6.5%; additional BDS fixed-price EACs hold BDS margin to 7.0%; BGS slows to 4.0%–3.5%; slower DPC/inventory liquidation and elevated 3.5% CapEx weigh on cash conversion (drawing down liquid STI ahead of incremental borrowing); finite post-2032E federal NOL runoff is valued explicitly (FY33E–FY37E); downgrade risk moves Kd to 100% BB HY (7.00%) and equity beta to 2Y weekly OLS stress (1.427) at 26.2% spot gross debt weight.",
    scalars: Object.freeze({
      ...base.scalars,
      asp737: scalarDriver(50.5, {
        ...base.scalars.asp737.meta,
        rationale:
          "Elevated airline delay concessions modestly weigh on net realized 737 pricing.",
      }),
      asp777x: scalarDriver(174.0, {
        ...base.scalars.asp777x.meta,
        rationale:
          "Further 777X EIS delay into 2028 increases customer compensation concessions.",
      }),
      asp787: scalarDriver(128.0, {
        ...base.scalars.asp787.meta,
        rationale:
          "Slower ramp and customer delivery-delay credits weigh on realized 787 pricing.",
      }),
      aspEscalation: scalarDriver(0.013, {
        ...base.scalars.aspEscalation.meta,
        rationale:
          "Lower net price realization as delivery slippage offsets contractual escalation.",
      }),
      stockCompIssuancePx: scalarDriver(165.0, {
        ...base.scalars.stockCompIssuancePx.meta,
        rationale:
          "Lower share price increases GAAP treasury-stock share issuance for 401(k) and SBC awards.",
      }),
      betaRegime: scalarDriver(1, {
        ...base.scalars.betaRegime.meta,
        rationale:
          "Selects live 2Y weekly OLS beta (1.427) reflecting heightened operational and balance-sheet volatility.",
      }),
      kdBbWeight: scalarDriver(1.0, {
        ...base.scalars.kdBbWeight.meta,
        rationale:
          "100% weight on FRED BB High Yield effective yield reflecting fallen-angel downgrade pricing.",
      }),
      terminalRonic: scalarDriver(0.18, {
        ...base.scalars.terminalRonic.meta,
        rationale:
          "Lower incremental capital productivity (18.0%) reflecting persistent rework, sub-scale widebody rates, and higher maintenance CapEx.",
      }),
      sotpMultBca: scalarDriver(14.0, {
        ...base.scalars.sotpMultBca.meta,
        rationale:
          "Discounted commercial OEM multiple reflecting persistent execution and market-share discount vs Airbus.",
      }),
      sotpMultBds: scalarDriver(14.0, {
        ...base.scalars.sotpMultBds.meta,
        rationale:
          "Discounted defense multiple reflecting lower structural margin and contract-loss overhang.",
      }),
      sotpMultBgs: scalarDriver(17.0, {
        ...base.scalars.sotpMultBgs.meta,
        rationale:
          "Compressed aftermarket multiple reflecting slower Boeing-fleet growth.",
      }),
    }),
    periods: Object.freeze({
      ...base.periods,
      del737: periodDriver(
        {
          Q4_26E: 126,
          "2027E": 516,
          "2028E": 552,
          "2029E": 576,
          "2030E": 600,
          "2031E": 600,
          "2032E": 600,
        },
        {
          ...base.periods.del737.meta,
          basis: "Capped at 43/mo FY27, 50/mo steady state",
          rationale:
            "FAA oversight bottlenecks and labor/supplier friction cap 737 output at 43/mo in FY2027 and 50/mo steady state.",
        }
      ),
      del777f: periodDriver(
        {
          Q4_26E: 8,
          "2027E": 24,
          "2028E": 20,
          "2029E": 12,
          "2030E": 0,
          "2031E": 0,
          "2032E": 0,
        },
        {
          ...base.periods.del777f.meta,
          basis: "Extended 777F bridge on 777X delay",
        }
      ),
      del777x: periodDriver(
        {
          Q4_26E: 0,
          "2027E": 0,
          "2028E": 12,
          "2029E": 30,
          "2030E": 42,
          "2031E": 48,
          "2032E": 48,
        },
        {
          ...base.periods.del777x.meta,
          basis: "EIS slipped to FY28; 4/mo steady-state cap",
          rationale:
            "Certification delay pushes 777X entry into service to FY2028 with a lower 4/month steady-state ceiling.",
        }
      ),
      del787: periodDriver(
        {
          Q4_26E: 22,
          "2027E": 90,
          "2028E": 96,
          "2029E": 102,
          "2030E": 108,
          "2031E": 108,
          "2032E": 108,
        },
        {
          ...base.periods.del787.meta,
          basis: "Supplier bottlenecks cap output at 9/mo",
          rationale:
            "Supplier fuselage and seat-certification bottlenecks slow 787 ramp to 9/month steady state.",
        }
      ),
      bdsRevGrowth: periodDriver(
        {
          Q4_26E: 0.025,
          "2027E": 0.025,
          "2028E": 0.025,
          "2029E": 0.025,
          "2030E": 0.025,
          "2031E": 0.025,
          "2032E": 0.025,
        },
        {
          ...base.periods.bdsRevGrowth.meta,
          basis: "Slower 2.5% backlog conversion cadence",
        }
      ),
      bgsRevGrowth: periodDriver(
        {
          Q4_26E: 0.04,
          "2027E": 0.04,
          "2028E": 0.038,
          "2029E": 0.038,
          "2030E": 0.036,
          "2031E": 0.035,
          "2032E": 0.035,
        },
        {
          ...base.periods.bgsRevGrowth.meta,
          basis: "Slower fleet growth (4.0% tapering to 3.5%)",
        }
      ),
      bcaEbitMargin: periodDriver(
        {
          Q4_26E: -0.075,
          "2027E": -0.03,
          "2028E": 0.002,
          "2029E": 0.03,
          "2030E": 0.048,
          "2031E": 0.058,
          "2032E": 0.065,
        },
        {
          ...base.periods.bcaEbitMargin.meta,
          basis: "Rework & Spirit drag cap margin at 6.5%",
          rationale:
            "Persistent Spirit cost absorption, rework, and 777X delay losses cap steady-state pure-OEM BCA margin at 6.5%.",
        }
      ),
      bdsEbitMargin: periodDriver(
        {
          Q4_26E: -0.015,
          "2027E": -0.005,
          "2028E": 0.02,
          "2029E": 0.045,
          "2030E": 0.058,
          "2031E": 0.065,
          "2032E": 0.07,
        },
        {
          ...base.periods.bdsEbitMargin.meta,
          basis: "Further EACs extend losses; 7.0% terminal",
          rationale:
            "Additional fixed-price EAC charges extend BDS losses into FY2027 and cap long-run defense margin at 7.0%.",
        }
      ),
      bgsEbitMargin: periodDriver(
        {
          Q4_26E: 0.175,
          "2027E": 0.172,
          "2028E": 0.17,
          "2029E": 0.17,
          "2030E": 0.17,
          "2031E": 0.17,
          "2032E": 0.17,
        },
        {
          ...base.periods.bgsEbitMargin.meta,
          basis: "Mix headwinds compress margin to 17.0%",
        }
      ),
      ebitUnallocated: periodDriver(
        {
          Q4_26E: -610,
          "2027E": -2350,
          "2028E": -2300,
          "2029E": -2250,
          "2030E": -2200,
          "2031E": -2150,
          "2032E": -2100,
        },
        {
          ...base.periods.ebitUnallocated.meta,
          basis: "Higher recurring corporate overhead drag",
        }
      ),
      capexPctRev: periodDriver(
        {
          Q4_26E: 0.04,
          "2027E": 0.039,
          "2028E": 0.037,
          "2029E": 0.036,
          "2030E": 0.035,
          "2031E": 0.035,
          "2032E": 0.035,
        },
        {
          ...base.periods.capexPctRev.meta,
          basis: "Sustained 3.5% quality & Spirit CapEx",
          rationale:
            "Elevated factory quality remediation and Spirit tooling modernization sustain CapEx at 3.5% of revenue.",
        }
      ),
      invPctRev: periodDriver(
        {
          Q4_26E: 0.935,
          "2027E": 0.85,
          "2028E": 0.78,
          "2029E": 0.73,
          "2030E": 0.695,
          "2031E": 0.675,
          "2032E": 0.665,
        },
        {
          ...base.periods.invPctRev.meta,
          basis: "Slower WIP & DPC unwind (66.5% terminal)",
          rationale:
            "Slower delivery liquidation keeps commercial WIP and deferred production costs elevated across the forecast horizon.",
        }
      ),
      advPctInv: periodDriver(
        {
          Q4_26E: 0.745,
          "2027E": 0.748,
          "2028E": 0.75,
          "2029E": 0.75,
          "2030E": 0.75,
          "2031E": 0.75,
          "2032E": 0.75,
        },
        {
          ...base.periods.advPctInv.meta,
          basis: "Flatter customer advances ratio (75.0%)",
        }
      ),
    }),
  })
}

export function upsideDrivers(): ScenarioBundle {
  const base = baseDrivers()
  return Object.freeze({
    key: "upside",
    name: "Upside",
    framing:
      "Clean production acceleration and investment-grade re-rating (holding terminal g = 3.0% constant, RONIC = 28.0%): 737 reaches 60/mo, 787 reaches 12/mo, and 777X ramps smoothly from 2027 EIS to 6/mo with pure-OEM BCA margin expanding to 11.5%; BDS normalizes to 10.5% on clean new-program mix; BGS grows 8.0%–6.2% at 20.0% margin; faster inventory/DPC unwind and 2.4% CapEx drive rapid organic debt paydown; upgrade to solid BBB/BBB+ pairs 15.0% IG target gross debt weight with Airbus-parity unlevered asset beta (0.86) Hamada-relevered to 0.974 equity beta and 100% BBB Kd (6.07%), implying 8.62% WACC (matching Airbus SE 5Y WACC).",
    scalars: Object.freeze({
      ...base.scalars,
      asp737: scalarDriver(51.8, {
        ...base.scalars.asp737.meta,
        rationale:
          "Higher 737-10/737-8200 mix and reduced late-delivery concessions lift net narrowbody pricing.",
      }),
      asp777x: scalarDriver(182.0, {
        ...base.scalars.asp777x.meta,
        rationale:
          "On-time 2027 certification preserves widebody pricing power on follow-on 777X orders.",
      }),
      asp787: scalarDriver(133.0, {
        ...base.scalars.asp787.meta,
        rationale:
          "Strong widebody demand and 787-10 mix lift realized 787 net pricing.",
      }),
      aspEscalation: scalarDriver(0.025, {
        ...base.scalars.aspEscalation.meta,
        rationale:
          "Full contractual price escalation capture under tight narrowbody and widebody supply.",
      }),
      stockCompIssuancePx: scalarDriver(215.0, {
        ...base.scalars.stockCompIssuancePx.meta,
        rationale:
          "Higher share price reduces GAAP treasury-stock share count issued for 401(k) and SBC awards.",
      }),
      betaRegime: scalarDriver(3, {
        ...base.scalars.betaRegime.meta,
        rationale:
          "Selects Airbus-parity commercial OEM asset beta (0.86) Hamada-relevered at 15.0% IG target debt weight (0.974 equity beta).",
      }),
      targetDebtWeight: scalarDriver(0.15, {
        ...base.scalars.targetDebtWeight.meta,
        rationale:
          "Deleveraged solid-BBB capital structure (15.0% gross debt / 85.0% equity; D/E = 17.65%) consistent with Hamada-relevered IG equity beta (0.974) and 8.62% WACC.",
      }),
      kdBbWeight: scalarDriver(0.0, {
        ...base.scalars.kdBbWeight.meta,
        rationale:
          "100% weight on FRED BBB Corporate effective yield (6.07%) following credit-rating upgrade to mid-BBB.",
      }),
      terminalRonic: scalarDriver(0.28, {
        ...base.scalars.terminalRonic.meta,
        rationale:
          "Higher steady-state incremental capital productivity (28.0%) under high-rate factory absorption and disciplined 2.4% CapEx.",
      }),
      sotpMultBca: scalarDriver(18.0, {
        ...base.scalars.sotpMultBca.meta,
        rationale:
          "Premium commercial OEM multiple supported by multi-year rate visibility and expanding free cash flow conversion.",
      }),
      sotpMultBds: scalarDriver(16.5, {
        ...base.scalars.sotpMultBds.meta,
        rationale:
          "In-line US defense prime multiple once legacy fixed-price contracts conclude.",
      }),
      sotpMultBgs: scalarDriver(20.5, {
        ...base.scalars.sotpMultBgs.meta,
        rationale:
          "Higher aftermarket services multiple reflecting 20% operating margins and growing installed fleet.",
      }),
    }),
    periods: Object.freeze({
      ...base.periods,
      del737: periodDriver(
        {
          Q4_26E: 141,
          "2027E": 600,
          "2028E": 672,
          "2029E": 708,
          "2030E": 720,
          "2031E": 720,
          "2032E": 720,
        },
        {
          ...base.periods.del737.meta,
          basis: "Smooth FAA ramp to 50/mo FY27, 60/mo FY30",
          rationale:
            "Smooth FAA concurrence and Spirit fuselage cadence accelerate 737 deliveries to 50/mo in FY2027 and 60/mo by FY2030.",
        }
      ),
      del777f: periodDriver(
        {
          Q4_26E: 10,
          "2027E": 24,
          "2028E": 18,
          "2029E": 8,
          "2030E": 0,
          "2031E": 0,
          "2032E": 0,
        },
        {
          ...base.periods.del777f.meta,
          basis: "Slightly faster Q4 26 freighter handover",
        }
      ),
      del777x: periodDriver(
        {
          Q4_26E: 0,
          "2027E": 18,
          "2028E": 42,
          "2029E": 60,
          "2030E": 66,
          "2031E": 72,
          "2032E": 72,
        },
        {
          ...base.periods.del777x.meta,
          basis: "Clean 2027 EIS scaling to 6/mo (72/yr)",
          rationale:
            "Smooth 2027 EIS and strong widebody demand scale 777X output to 6/month (72/yr) by FY2031.",
        }
      ),
      del787: periodDriver(
        {
          Q4_26E: 27,
          "2027E": 114,
          "2028E": 132,
          "2029E": 144,
          "2030E": 144,
          "2031E": 144,
          "2032E": 144,
        },
        {
          ...base.periods.del787.meta,
          basis: "Charleston reaches 12/mo (144/yr) by FY29",
          rationale:
            "Charleston expansion achieves 12/month (144/yr) sustained widebody output by FY2029.",
        }
      ),
      bdsRevGrowth: periodDriver(
        {
          Q4_26E: 0.065,
          "2027E": 0.065,
          "2028E": 0.06,
          "2029E": 0.055,
          "2030E": 0.045,
          "2031E": 0.045,
          "2032E": 0.045,
        },
        {
          ...base.periods.bdsRevGrowth.meta,
          basis: "Faster backlog & new-program conversion",
        }
      ),
      bgsRevGrowth: periodDriver(
        {
          Q4_26E: 0.075,
          "2027E": 0.08,
          "2028E": 0.075,
          "2029E": 0.072,
          "2030E": 0.068,
          "2031E": 0.065,
          "2032E": 0.062,
        },
        {
          ...base.periods.bgsRevGrowth.meta,
          basis: "Stronger spares/MRO growth (8.0% to 6.2%)",
        }
      ),
      bcaEbitMargin: periodDriver(
        {
          Q4_26E: -0.035,
          "2027E": 0.022,
          "2028E": 0.058,
          "2029E": 0.085,
          "2030E": 0.102,
          "2031E": 0.11,
          "2032E": 0.115,
        },
        {
          ...base.periods.bcaEbitMargin.meta,
          basis: "High-rate absorption lifts margin to 11.5%",
          rationale:
            "High-rate factory absorption, vertical Spirit cost capture, and 787/777X learning curves lift pure-OEM BCA margin to 11.5%.",
        }
      ),
      bdsEbitMargin: periodDriver(
        {
          Q4_26E: 0.035,
          "2027E": 0.055,
          "2028E": 0.075,
          "2029E": 0.09,
          "2030E": 0.098,
          "2031E": 0.102,
          "2032E": 0.105,
        },
        {
          ...base.periods.bdsEbitMargin.meta,
          basis: "Clean legacy runoff reaches 10.5% parity",
          rationale:
            "Clean legacy runoff and international defense mix lift BDS margin to 10.5% parity with defense primes.",
        }
      ),
      bgsEbitMargin: periodDriver(
        {
          Q4_26E: 0.185,
          "2027E": 0.188,
          "2028E": 0.192,
          "2029E": 0.195,
          "2030E": 0.197,
          "2031E": 0.198,
          "2032E": 0.2,
        },
        {
          ...base.periods.bgsEbitMargin.meta,
          basis: "Spares mix leverage lifts margin to 20.0%",
        }
      ),
      ebitUnallocated: periodDriver(
        {
          Q4_26E: -560,
          "2027E": -2100,
          "2028E": -2025,
          "2029E": -1950,
          "2030E": -1875,
          "2031E": -1825,
          "2032E": -1775,
        },
        {
          ...base.periods.ebitUnallocated.meta,
          basis: "Faster corporate overhead rationalization",
        }
      ),
      capexPctRev: periodDriver(
        {
          Q4_26E: 0.034,
          "2027E": 0.031,
          "2028E": 0.028,
          "2029E": 0.026,
          "2030E": 0.025,
          "2031E": 0.024,
          "2032E": 0.024,
        },
        {
          ...base.periods.capexPctRev.meta,
          basis: "Disciplined post-peak CapEx at 2.4%",
          rationale:
            "Disciplined post-expansion CapEx normalizes to 2.4% of revenue as high-rate tooling is already in place.",
        }
      ),
      invPctRev: periodDriver(
        {
          Q4_26E: 0.914,
          "2027E": 0.755,
          "2028E": 0.665,
          "2029E": 0.615,
          "2030E": 0.585,
          "2031E": 0.575,
          "2032E": 0.57,
        },
        {
          ...base.periods.invPctRev.meta,
          basis: "Faster WIP & DPC unwind (57.0% terminal)",
          rationale:
            "Faster commercial aircraft deliveries and tighter Spirit WIP turns release working capital rapidly.",
        }
      ),
      advPctInv: periodDriver(
        {
          Q4_26E: 0.76,
          "2027E": 0.775,
          "2028E": 0.785,
          "2029E": 0.788,
          "2030E": 0.782,
          "2031E": 0.778,
          "2032E": 0.775,
        },
        {
          ...base.periods.advPctInv.meta,
          basis: "Stronger PDP inflows (77.5% steady state)",
        }
      ),
    }),
  })
}

export function allScenarioBundles(): Readonly<
  Record<ScenarioKey, ScenarioBundle>
> {
  return Object.freeze({
    downside: downsideDrivers(),
    base: baseDrivers(),
    upside: upsideDrivers(),
  })
}

export function getScenarioBundle(key: ScenarioKey): ScenarioBundle {
  return allScenarioBundles()[key]
}
