import { compileKgFromDir, type KgRegistry, type ValQueryOptions } from "@faac/audited-reader"
import {
  DISPLAY_DIVISORS,
  HIST_ANNUAL_PERIODS,
  HIST_PERIOD_TO_KG,
  MACRO_OAS_DATE,
  MACRO_TREASURY_DATE,
  MARKET_TICKERS,
  VALUATION_AS_OF_DATE,
  type HistAnnualPeriod,
  type MarketTicker,
  type PeerTicker,
} from "./timeline.ts"

export type HistSeries = Readonly<Record<HistAnnualPeriod, number>>

export interface CrmDebtTranche {
  readonly id: string
  readonly label: string
  readonly issuanceDate: string
  readonly maturityDate: string
  readonly maturityFy: number
  readonly couponRate: number
  readonly principal: number
  readonly carryingValue: number
}

export interface PeerRawData {
  readonly ticker: PeerTicker
  readonly name: string
  readonly ltmBasisNote: string
  readonly hasInterim: boolean
  readonly fyRev: number
  readonly ytd1Rev: number
  readonly ytd0Rev: number
  readonly fyEbit: number
  readonly ytd1Ebit: number
  readonly ytd0Ebit: number
  readonly fyDa1: number
  readonly fyDa2: number
  readonly ytd1Da1: number
  readonly ytd1Da2: number
  readonly ytd0Da1: number
  readonly ytd0Da2: number
  readonly fySbc: number
  readonly ytd1Sbc: number
  readonly ytd0Sbc: number
  readonly fyOcf: number
  readonly ytd1Ocf: number
  readonly ytd0Ocf: number
  readonly fyCapex1: number
  readonly fyCapex2: number
  readonly ytd1Capex1: number
  readonly ytd1Capex2: number
  readonly ytd0Capex1: number
  readonly ytd0Capex2: number
  readonly spotPrice: number
  readonly sharesOut: number
  readonly cash1: number
  readonly cash2: number
  readonly cash3: number
  readonly debtCurrent: number
  readonly debtNoncurrent: number
  readonly opLeaseCurrent: number
  readonly opLeaseNoncurrent: number
  readonly preferredStock: number
  readonly noncontrollingInterests: number
  readonly fy1ConsensusEps: number
  readonly fy2ConsensusEps: number
  readonly consensusTargetPrice: number
}

export interface CrmH1Metrics {
  readonly subscription_and_support_rev: number
  readonly professional_services_rev: number
  readonly total_revenue: number
  readonly gross_profit: number
  readonly operating_income: number
  readonly interest_expense: number
  readonly gains_on_strategic_investments_net: number
  readonly other_income_expense_net: number
  readonly income_before_taxes: number
  readonly income_tax_provision: number
  readonly net_income: number
  readonly basic_shares: number
  readonly diluted_shares: number
  readonly da_expense: number
  readonly amort_contract_costs: number
  readonly sbc_expense: number
  readonly strategic_inv_gains_losses_cf: number
  readonly chg_accounts_receivable: number
  readonly chg_capitalized_contract_costs: number
  readonly chg_prepaid_and_other_assets: number
  readonly chg_ap_accrued_and_other_liab: number
  readonly chg_operating_lease_liabilities: number
  readonly chg_unearned_revenue: number
  readonly operating_cash_flow: number
  readonly acquisitions_net_of_cash: number
  readonly purchases_strategic_investments: number
  readonly sales_strategic_investments: number
  readonly purchases_marketable_securities: number
  readonly sales_marketable_securities: number
  readonly maturities_marketable_securities: number
  readonly capex: number
  readonly debt_issuance_proceeds_net: number
  readonly share_repurchases: number
  readonly tax_payments_net_share_settlement: number
  readonly proceeds_employee_stock_plans: number
  readonly principal_payments_financing_obligations: number
  readonly dividends_paid: number
  readonly amort_purchased_intangibles_cor: number
  readonly amort_purchased_intangibles_sm: number
  readonly sbc_cor: number
  readonly sbc_rd: number
  readonly sbc_sm: number
  readonly sbc_ga: number
  readonly sbc_restructuring: number
}

export interface MarketPricesSnapshot {
  readonly monthlyDates: readonly string[]
  readonly weeklyDates: readonly string[]
  readonly monthlyCloses: Readonly<Record<MarketTicker, readonly number[]>>
  readonly weeklyCloses: Readonly<Record<MarketTicker, readonly number[]>>
  readonly spotPrices: Readonly<Record<MarketTicker, number>>
}

export interface ScheduleCitations {
  readonly crmIs10K: string
  readonly crmIs10Q: string
  readonly crmBs10KPrior: string
  readonly crmBs10K: string
  readonly crmBs10Q: string
  readonly crmCf10K: string
  readonly crmDebt: string
  readonly crmIntangibles: string
  readonly crmEpsShares: string
  readonly crmGuidance: string
  readonly crmConsensusTargets: string
  readonly marketPricesAll: string
  readonly macroDgs10: string
  readonly macroSingleAOas: string
  readonly peerFilings: Readonly<Record<PeerTicker, string>>
}

export interface AuditedDataSnapshot {
  readonly crmIs: Readonly<{
    subscriptionAndSupportRev: HistSeries
    professionalServicesRev: HistSeries
    totalRevenue: HistSeries
    costOfRevSubscription: HistSeries
    costOfRevProfServices: HistSeries
    totalCostOfRevenue: HistSeries
    grossProfit: HistSeries
    rdExpense: HistSeries
    smExpense: HistSeries
    gaExpense: HistSeries
    restructuring: HistSeries
    totalOpex: HistSeries
    operatingIncome: HistSeries
    gainsOnStrategicInvestmentsNet: HistSeries
    otherIncomeExpenseNet: HistSeries
    incomeBeforeTaxes: HistSeries
    incomeTaxProvision: HistSeries
    netIncome: HistSeries
    basicEps: HistSeries
    dilutedEps: HistSeries
    basicShares: HistSeries
    dilutedShares: HistSeries
  }>
  readonly crmIsSupp: Readonly<{
    amortPurchasedIntangiblesCor: HistSeries
    amortPurchasedIntangiblesSm: HistSeries
    sbcCor: HistSeries
    sbcRd: HistSeries
    sbcSm: HistSeries
    sbcGa: HistSeries
    sbcRestructuring: HistSeries
  }>
  readonly crmBs: Readonly<{
    cashAndEquivalents: HistSeries
    marketableSecurities: HistSeries
    accountsReceivableNet: HistSeries
    capitalizedContractCostsCurrent: HistSeries
    prepaidAndOtherCurrentAssets: HistSeries
    totalCurrentAssets: HistSeries
    ppeNet: HistSeries
    operatingLeaseRouAssets: HistSeries
    capitalizedContractCostsNoncurrent: HistSeries
    strategicInvestments: HistSeries
    goodwill: HistSeries
    purchasedIntangiblesNet: HistSeries
    deferredTaxAndOtherAssetsNet: HistSeries
    totalAssets: HistSeries
    apAccruedAndOtherCurrentLiab: HistSeries
    operatingLeaseLiabCurrent: HistSeries
    unearnedRevenue: HistSeries
    debtCurrent: HistSeries
    totalCurrentLiabilities: HistSeries
    debtNoncurrent: HistSeries
    operatingLeaseLiabNoncurrent: HistSeries
    otherNoncurrentLiabilities: HistSeries
    totalLiabilities: HistSeries
    commonStock: HistSeries
    preferredStock: HistSeries
    treasuryStock: HistSeries
    apic: HistSeries
    aoci: HistSeries
    retainedEarnings: HistSeries
    totalEquity: HistSeries
    totalLiabilitiesAndEquity: HistSeries
  }>
  readonly crmCf: Readonly<{
    netIncome: HistSeries
    daExpense: HistSeries
    amortContractCosts: HistSeries
    sbcExpense: HistSeries
    strategicInvGainsLossesCf: HistSeries
    chgAccountsReceivable: HistSeries
    chgCapitalizedContractCosts: HistSeries
    chgPrepaidAndOtherAssets: HistSeries
    chgApAccruedAndOtherLiab: HistSeries
    chgOperatingLeaseLiabilities: HistSeries
    chgUnearnedRevenue: HistSeries
    operatingCashFlow: HistSeries
    acquisitionsNetOfCash: HistSeries
    purchasesStrategicInvestments: HistSeries
    salesStrategicInvestments: HistSeries
    purchasesMarketableSecurities: HistSeries
    salesMarketableSecurities: HistSeries
    maturitiesMarketableSecurities: HistSeries
    capex: HistSeries
    investingCashFlow: HistSeries
    debtIssuanceProceedsNet: HistSeries
    shareRepurchases: HistSeries
    taxPaymentsNetShareSettlement: HistSeries
    proceedsEmployeeStockPlans: HistSeries
    principalPaymentsFinancingObligations: HistSeries
    dividendsPaid: HistSeries
    debtRepayments: HistSeries
    financingCashFlow: HistSeries
    fxEffectOnCash: HistSeries
    netChangeInCash: HistSeries
    beginningCash: HistSeries
    endingCash: HistSeries
  }>
  readonly crmH1: Readonly<{
    h1Fy26: CrmH1Metrics
    h1Fy27: CrmH1Metrics
    q2Fy27Bs: Readonly<{
      cashAndEquivalents: number
      marketableSecurities: number
      accountsReceivableNet: number
      ppeNet: number
      operatingLeaseRouAssets: number
      strategicInvestments: number
      goodwill: number
      purchasedIntangiblesNet: number
      totalAssets: number
      operatingLeaseLiabCurrent: number
      operatingLeaseLiabNoncurrent: number
      finLeaseLiabTotalFy26: number
      finLeaseLiabTotal: number
      unearnedRevenue: number
      debtCurrent: number
      debtNoncurrent: number
      totalLiabilities: number
      totalEquity: number
    }>
    q2Fy27Meta: Readonly<{
      coverSharesOutstanding: number
      q2DilutiveStockAwards: number
      asrUpfrontPayment: number
      asrInitialSharesDelivered: number
      asrInitialAvgPrice: number
      informaticaFy26Rev: number
      informaticaH1Fy27Rev: number
      pendingContentfulCash: number
      pendingFinCash: number
      h1IntangiblesGrossAdditions: number
      futureAmortFy27Rem: number
      futureAmortFy28: number
      futureAmortFy29: number
      futureAmortFy30: number
      futureAmortFy31: number
      fy27GuidanceRevLow: number
      fy27GuidanceRevHigh: number
      fy27GuidanceGaapOm: number
      fy27GuidanceNonGaapOm: number
      anthropicPortfolioShareQ2: number
      crmFy1ConsensusEps: number
      crmFy2ConsensusEps: number
      crmTargetMean: number
      crmTargetLow: number
      crmTargetHigh: number
      crmBuyCount: number
      crmHoldCount: number
      crmSellCount: number
      crmTotalRatings: number
    }>
  }>
  readonly debtTranches: readonly CrmDebtTranche[]
  readonly macroRates: Readonly<{
    dgs10: number
    dgs2: number
    singleAOas: number
    masterOas: number
    bbbOas: number
  }>
  readonly marketPrices: MarketPricesSnapshot
  readonly peers: Readonly<Record<PeerTicker, PeerRawData>>
  readonly citations: ScheduleCitations
}

const DEBT_TRANCHE_SPECS: readonly {
  readonly id: string
  readonly label: string
  readonly maturityFy: number
}[] = [
  {
    id: "senior_notes_mar_2028",
    label: "4.50% senior notes due Mar 2028",
    maturityFy: 2029,
  },
  {
    id: "senior_notes_apr_2028",
    label: "3.70% senior notes due Apr 2028",
    maturityFy: 2029,
  },
  {
    id: "senior_notes_jul_2028_sustainability",
    label: "1.50% sustainability notes due Jul 2028",
    maturityFy: 2029,
  },
  {
    id: "senior_notes_mar_2029",
    label: "4.65% senior notes due Mar 2029",
    maturityFy: 2030,
  },
  {
    id: "term_loan_2026",
    label: "4.24% 2026 term loan due Mar 2031",
    maturityFy: 2032,
  },
  {
    id: "senior_notes_jul_2031",
    label: "1.95% senior notes due Jul 2031",
    maturityFy: 2032,
  },
  {
    id: "senior_notes_sep_2031",
    label: "4.90% senior notes due Sep 2031",
    maturityFy: 2032,
  },
  {
    id: "senior_notes_mar_2033",
    label: "5.20% senior notes due Mar 2033",
    maturityFy: 2034,
  },
  {
    id: "senior_notes_mar_2036",
    label: "5.55% senior notes due Mar 2036",
    maturityFy: 2037,
  },
  {
    id: "senior_notes_jul_2041",
    label: "2.70% senior notes due Jul 2041",
    maturityFy: 2042,
  },
  {
    id: "senior_notes_mar_2046",
    label: "6.40% senior notes due Mar 2046",
    maturityFy: 2047,
  },
  {
    id: "senior_notes_jul_2051",
    label: "2.90% senior notes due Jul 2051",
    maturityFy: 2052,
  },
  {
    id: "senior_notes_mar_2056",
    label: "6.55% senior notes due Mar 2056",
    maturityFy: 2057,
  },
  {
    id: "senior_notes_jul_2061",
    label: "3.05% senior notes due Jul 2061",
    maturityFy: 2062,
  },
  {
    id: "senior_notes_mar_2066",
    label: "6.70% senior notes due Mar 2066",
    maturityFy: 2067,
  },
]

interface PeerQuerySpec {
  readonly ticker: PeerTicker
  readonly name: string
  readonly ltmBasisNote: string
  readonly fy: string
  readonly ytd1: string | null
  readonly ytd0: string | null
  readonly bs: string
  readonly sharesPeriod: string
  readonly fy1EpsPeriod: string
  readonly fy2EpsPeriod: string
  readonly daRow1: string
  readonly daRow2: string | null
  readonly capexRow1: string
  readonly capexRow2: string | null
  readonly cashRow1: string
  readonly cashRow2: string | null
  readonly cashRow3: string | null
  readonly debtCurRow: string | null
  readonly debtNonCurRow: string | null
  readonly opLeaseCurRow: string | null
  readonly opLeaseNonCurRow: string | null
  readonly prefRow: string | null
  readonly nciRow: string | null
}

const PEER_SPECS: readonly PeerQuerySpec[] = [
  {
    ticker: "ADBE",
    name: "Adobe Inc.",
    ltmBasisNote: "LTM Q3 FY26 (Aug 2026)",
    fy: "2025-FY",
    ytd1: "2026-Q3-YTD",
    ytd0: "2025-Q3-YTD",
    bs: "2026-Q3",
    sharesPeriod: "2026-Q3",
    fy1EpsPeriod: "2026-FY",
    fy2EpsPeriod: "2027-FY",
    daRow1: "da_expense",
    daRow2: null,
    capexRow1: "capex",
    capexRow2: null,
    cashRow1: "cash_and_equivalents",
    cashRow2: "short_term_investments",
    cashRow3: null,
    debtCurRow: "debt_current",
    debtNonCurRow: "debt_noncurrent",
    opLeaseCurRow: "operating_lease_current",
    opLeaseNonCurRow: "operating_lease_noncurrent",
    prefRow: null,
    nciRow: null,
  },
  {
    ticker: "INTU",
    name: "Intuit Inc.",
    ltmBasisNote: "FY26A (Jul 2026; ex-cust. funds)",
    fy: "2026-FY",
    ytd1: null,
    ytd0: null,
    bs: "2026-FY",
    sharesPeriod: "2026-FY",
    fy1EpsPeriod: "2027-FY",
    fy2EpsPeriod: "2028-FY",
    daRow1: "depreciation",
    daRow2: "amortization_of_intangibles",
    capexRow1: "capex",
    capexRow2: "capitalized_internal_use_software",
    cashRow1: "cash_and_equivalents",
    cashRow2: "short_term_investments",
    cashRow3: null,
    debtCurRow: "debt_current",
    debtNonCurRow: "debt_noncurrent",
    opLeaseCurRow: null,
    opLeaseNonCurRow: "operating_lease_noncurrent",
    prefRow: null,
    nciRow: null,
  },
  {
    ticker: "NOW",
    name: "ServiceNow, Inc.",
    ltmBasisNote: "LTM Q3 FY26 (Sep 2026; split-adj.)",
    fy: "2025-FY",
    ytd1: "2026-Q3-YTD",
    ytd0: "2025-Q3-YTD",
    bs: "2026-Q3",
    sharesPeriod: "2026-Q3",
    fy1EpsPeriod: "2026-FY",
    fy2EpsPeriod: "2027-FY",
    daRow1: "da_expense",
    daRow2: null,
    capexRow1: "capex",
    capexRow2: null,
    cashRow1: "cash_and_equivalents",
    cashRow2: "short_term_investments",
    cashRow3: "long_term_marketable_securities",
    debtCurRow: "debt_current",
    debtNonCurRow: "debt_noncurrent",
    opLeaseCurRow: "operating_lease_current",
    opLeaseNonCurRow: "operating_lease_noncurrent",
    prefRow: null,
    nciRow: null,
  },
  {
    ticker: "WDAY",
    name: "Workday, Inc.",
    ltmBasisNote: "LTM Q2 FY27 (Jul 2026)",
    fy: "2026-FY",
    ytd1: "2027-Q2-YTD",
    ytd0: "2026-Q2-YTD",
    bs: "2027-Q2",
    sharesPeriod: "2027-Q2",
    fy1EpsPeriod: "2027-FY",
    fy2EpsPeriod: "2028-FY",
    daRow1: "da_expense",
    daRow2: null,
    capexRow1: "capex",
    capexRow2: null,
    cashRow1: "cash_and_equivalents",
    cashRow2: "short_term_investments",
    cashRow3: null,
    debtCurRow: "debt_current",
    debtNonCurRow: "debt_noncurrent",
    opLeaseCurRow: "operating_lease_current",
    opLeaseNonCurRow: "operating_lease_noncurrent",
    prefRow: null,
    nciRow: null,
  },
  {
    ticker: "HUBS",
    name: "HubSpot, Inc.",
    ltmBasisNote: "LTM Q3 FY26 (Sep 2026; cap. sw.)",
    fy: "2025-FY",
    ytd1: "2026-Q3-YTD",
    ytd0: "2025-Q3-YTD",
    bs: "2026-Q3",
    sharesPeriod: "2026-Q3",
    fy1EpsPeriod: "2026-FY",
    fy2EpsPeriod: "2027-FY",
    daRow1: "da_expense",
    daRow2: null,
    capexRow1: "capex",
    capexRow2: "capitalized_software_development",
    cashRow1: "cash_and_equivalents",
    cashRow2: "short_term_investments",
    cashRow3: "long_term_investments",
    debtCurRow: null,
    debtNonCurRow: null,
    opLeaseCurRow: "operating_lease_current",
    opLeaseNonCurRow: "operating_lease_noncurrent",
    prefRow: null,
    nciRow: null,
  },
  {
    ticker: "ORCL",
    name: "Oracle Corporation",
    ltmBasisNote: "LTM Q1 FY27 (Aug 2026; pref. & NCI)",
    fy: "2026-FY",
    ytd1: "2027-Q1",
    ytd0: "2026-Q1",
    bs: "2027-Q1",
    sharesPeriod: "2027-Q1",
    fy1EpsPeriod: "2027-FY",
    fy2EpsPeriod: "2028-FY",
    daRow1: "depreciation",
    daRow2: "amortization_of_intangibles",
    capexRow1: "capex",
    capexRow2: null,
    cashRow1: "cash_and_equivalents",
    cashRow2: "short_term_investments",
    cashRow3: null,
    debtCurRow: "debt_current",
    debtNonCurRow: "debt_noncurrent",
    opLeaseCurRow: null,
    opLeaseNonCurRow: "operating_lease_noncurrent",
    prefRow: "preferred_stock",
    nciRow: "noncontrolling_interests",
  },
]

function mustVal(
  kg: KgRegistry,
  schedule: string,
  row: string,
  period: string,
  opts?: Omit<ValQueryOptions, "divisors">
): number {
  const value = kg.val(schedule, row, period, {
    divisors: DISPLAY_DIVISORS,
    ...opts,
  })
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Missing numeric value for (${schedule}, ${row}, ${period}, ${JSON.stringify(opts ?? {})})`
    )
  }
  return value
}

function histSeries(
  kg: KgRegistry,
  schedule: string,
  row: string,
  entity = "CRM"
): HistSeries {
  const out: Record<HistAnnualPeriod, number> = {
    FY24A: 0,
    FY25A: 0,
    FY26A: 0,
  }
  for (const period of HIST_ANNUAL_PERIODS) {
    out[period] = mustVal(kg, schedule, row, HIST_PERIOD_TO_KG[period], {
      entity,
    })
  }
  return Object.freeze(out)
}

function isoWeekKey(isoDate: string): string {
  const dt = new Date(`${isoDate}T00:00:00Z`)
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(
    ((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return `${dt.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`
}

function extractMarketPrices(kg: KgRegistry): MarketPricesSnapshot {
  const rawSeries: Record<
    MarketTicker,
    Readonly<Record<string, number | null>>
  > = {
    SPY: kg.series("market_prices", "close_price", { entity: "SPY" }),
    CRM: kg.series("market_prices", "close_price", { entity: "CRM" }),
    ADBE: kg.series("market_prices", "close_price", { entity: "ADBE" }),
    INTU: kg.series("market_prices", "close_price", { entity: "INTU" }),
    NOW: kg.series("market_prices", "close_price", { entity: "NOW" }),
    WDAY: kg.series("market_prices", "close_price", { entity: "WDAY" }),
    HUBS: kg.series("market_prices", "close_price", { entity: "HUBS" }),
    ORCL: kg.series("market_prices", "close_price", { entity: "ORCL" }),
  }
  const allDates = Object.keys(rawSeries.SPY).sort()
  const spotMonth = VALUATION_AS_OF_DATE.slice(0, 7)
  const spotWeek = isoWeekKey(VALUATION_AS_OF_DATE)

  const byMonth = new Map<string, string>()
  for (const dt of allDates) {
    const ym = dt.slice(0, 7)
    if (ym < spotMonth) {
      byMonth.set(ym, dt)
    }
  }
  const monthlyDates = Object.freeze([...byMonth.values()])
  if (monthlyDates.length !== 60) {
    throw new Error(
      `Expected 60 complete monthly dates, got ${monthlyDates.length}`
    )
  }

  const byWeek = new Map<string, string>()
  for (const dt of allDates) {
    if (dt >= "2024-11-22") {
      const wk = isoWeekKey(dt)
      if (wk < spotWeek) {
        byWeek.set(wk, dt)
      }
    }
  }
  const weeklyDates = Object.freeze([...byWeek.values()])
  if (weeklyDates.length !== 104) {
    throw new Error(
      `Expected 104 complete weekly dates, got ${weeklyDates.length}`
    )
  }

  const sliceTicker = (
    ticker: MarketTicker,
    dates: readonly string[]
  ): readonly number[] => {
    const series = rawSeries[ticker]
    return Object.freeze(
      dates.map((dt) => {
        const px = series[dt]
        if (typeof px !== "number" || !Number.isFinite(px)) {
          throw new Error(`Missing market price for ${ticker} on ${dt}`)
        }
        return px
      })
    )
  }

  const buildCloseSlice = (
    dates: readonly string[]
  ): Readonly<Record<MarketTicker, readonly number[]>> =>
    Object.freeze({
      SPY: sliceTicker("SPY", dates),
      CRM: sliceTicker("CRM", dates),
      ADBE: sliceTicker("ADBE", dates),
      INTU: sliceTicker("INTU", dates),
      NOW: sliceTicker("NOW", dates),
      WDAY: sliceTicker("WDAY", dates),
      HUBS: sliceTicker("HUBS", dates),
      ORCL: sliceTicker("ORCL", dates),
    })

  const mustSpot = (ticker: MarketTicker): number => {
    const px = rawSeries[ticker][VALUATION_AS_OF_DATE]
    if (typeof px !== "number" || !Number.isFinite(px)) {
      throw new Error(
        `Missing spot price for ${ticker} on ${VALUATION_AS_OF_DATE}`
      )
    }
    return px
  }

  const spotPrices: Readonly<Record<MarketTicker, number>> = Object.freeze({
    SPY: mustSpot("SPY"),
    CRM: mustSpot("CRM"),
    ADBE: mustSpot("ADBE"),
    INTU: mustSpot("INTU"),
    NOW: mustSpot("NOW"),
    WDAY: mustSpot("WDAY"),
    HUBS: mustSpot("HUBS"),
    ORCL: mustSpot("ORCL"),
  })

  return Object.freeze({
    monthlyDates,
    weeklyDates,
    monthlyCloses: buildCloseSlice(monthlyDates),
    weeklyCloses: buildCloseSlice(weeklyDates),
    spotPrices,
  })
}

function extractPeer(
  kg: KgRegistry,
  spec: PeerQuerySpec,
  spotPrice: number
): PeerRawData {
  const optVal = (
    schedule: string,
    row: string | null,
    period: string | null
  ): number => {
    if (row === null || period === null) return 0
    return mustVal(kg, schedule, row, period, { entity: spec.ticker })
  }

  return Object.freeze({
    ticker: spec.ticker,
    name: spec.name,
    ltmBasisNote: spec.ltmBasisNote,
    hasInterim: spec.ytd1 !== null,
    fyRev: mustVal(kg, "peer_is", "revenue", spec.fy, { entity: spec.ticker }),
    ytd1Rev: optVal("peer_is", "revenue", spec.ytd1),
    ytd0Rev: optVal("peer_is", "revenue", spec.ytd0),
    fyEbit: mustVal(kg, "peer_is", "operating_income", spec.fy, {
      entity: spec.ticker,
    }),
    ytd1Ebit: optVal("peer_is", "operating_income", spec.ytd1),
    ytd0Ebit: optVal("peer_is", "operating_income", spec.ytd0),
    fyDa1: optVal("peer_cf", spec.daRow1, spec.fy),
    fyDa2: optVal("peer_cf", spec.daRow2, spec.fy),
    ytd1Da1: optVal("peer_cf", spec.daRow1, spec.ytd1),
    ytd1Da2: optVal("peer_cf", spec.daRow2, spec.ytd1),
    ytd0Da1: optVal("peer_cf", spec.daRow1, spec.ytd0),
    ytd0Da2: optVal("peer_cf", spec.daRow2, spec.ytd0),
    fySbc: mustVal(kg, "peer_cf", "sbc_expense", spec.fy, {
      entity: spec.ticker,
    }),
    ytd1Sbc: optVal("peer_cf", "sbc_expense", spec.ytd1),
    ytd0Sbc: optVal("peer_cf", "sbc_expense", spec.ytd0),
    fyOcf: mustVal(kg, "peer_cf", "operating_cash_flow", spec.fy, {
      entity: spec.ticker,
    }),
    ytd1Ocf: optVal("peer_cf", "operating_cash_flow", spec.ytd1),
    ytd0Ocf: optVal("peer_cf", "operating_cash_flow", spec.ytd0),
    fyCapex1: optVal("peer_cf", spec.capexRow1, spec.fy),
    fyCapex2: optVal("peer_cf", spec.capexRow2, spec.fy),
    ytd1Capex1: optVal("peer_cf", spec.capexRow1, spec.ytd1),
    ytd1Capex2: optVal("peer_cf", spec.capexRow2, spec.ytd1),
    ytd0Capex1: optVal("peer_cf", spec.capexRow1, spec.ytd0),
    ytd0Capex2: optVal("peer_cf", spec.capexRow2, spec.ytd0),
    spotPrice,
    sharesOut: mustVal(
      kg,
      "peer_share_meta",
      "common_shares_outstanding",
      spec.sharesPeriod,
      { entity: spec.ticker }
    ),
    cash1: optVal("peer_bs", spec.cashRow1, spec.bs),
    cash2: optVal("peer_bs", spec.cashRow2, spec.bs),
    cash3: optVal("peer_bs", spec.cashRow3, spec.bs),
    debtCurrent: optVal("peer_bs", spec.debtCurRow, spec.bs),
    debtNoncurrent: optVal("peer_bs", spec.debtNonCurRow, spec.bs),
    opLeaseCurrent: optVal("peer_bs", spec.opLeaseCurRow, spec.bs),
    opLeaseNoncurrent: optVal("peer_bs", spec.opLeaseNonCurRow, spec.bs),
    preferredStock: optVal("peer_bs", spec.prefRow, spec.bs),
    noncontrollingInterests: optVal("peer_bs", spec.nciRow, spec.bs),
    fy1ConsensusEps: mustVal(
      kg,
      "consensus_eps",
      "consensus_eps",
      spec.fy1EpsPeriod,
      { entity: spec.ticker }
    ),
    fy2ConsensusEps: mustVal(
      kg,
      "consensus_eps",
      "consensus_eps",
      spec.fy2EpsPeriod,
      { entity: spec.ticker }
    ),
    consensusTargetPrice: mustVal(
      kg,
      "consensus_targets",
      "mean_target_price",
      VALUATION_AS_OF_DATE,
      { entity: spec.ticker }
    ),
  })
}

function cleanCitation(raw: string): string {
  return raw.replace(/,\s*(?:table|line)\s+\d+\s*$/i, "").trim()
}

function buildPeerCitation(kg: KgRegistry, ticker: PeerTicker): string {
  const prefix = `doc_${ticker.toLowerCase()}_`
  const docs = kg
    .documents()
    .filter(
      (d) => d.doc_id.startsWith(prefix) && d.schedule_ids.includes("peer_is")
    )
    .sort((a, b) => (a.report_date ?? "").localeCompare(b.report_date ?? ""))
  if (docs.length === 0) {
    return cleanCitation(kg.scheduleCitation("peer_is", { entity: ticker }))
  }
  const cites = docs.map((d) =>
    cleanCitation(
      kg.scheduleCitation("peer_is", { entity: ticker, doc_id: d.doc_id })
    )
  )
  if (cites.length >= 2) {
    const parsed = cites.map((c) => /^(.+?)\s+(10-[KQ]\s*\([^)]+\))$/.exec(c))
    const firstEntity = parsed[0]?.[1]
    if (
      firstEntity !== undefined &&
      parsed.every((m) => m?.[1] === firstEntity)
    ) {
      const forms = parsed.flatMap((m) => (m?.[2] !== undefined ? [m[2]] : []))
      return `${firstEntity} ${forms.join(" & ")}`
    }
  }
  return cites.join(" & ")
}

function buildMarketPricesCitation(kg: KgRegistry): string {
  const cites = MARKET_TICKERS.map((ticker) =>
    cleanCitation(kg.scheduleCitation("market_prices", { entity: ticker }))
  )
  const parsed = cites.map((c) =>
    /^(.+?)\s+—\s+([A-Z]+)\s+(\([^)]+\))$/.exec(c)
  )
  const firstPrefix = parsed[0]?.[1]
  const firstRange = parsed[0]?.[3]
  if (
    firstPrefix !== undefined &&
    firstRange !== undefined &&
    parsed.every((m) => m?.[1] === firstPrefix && m[3] === firstRange)
  ) {
    const tickers = parsed.flatMap((m) => (m?.[2] !== undefined ? [m[2]] : []))
    const tickerList =
      tickers.length > 1
        ? `${tickers.slice(0, -1).join(", ")} & ${tickers[tickers.length - 1]}`
        : (tickers[0] ?? "")
    return `${firstPrefix} — ${tickerList} ${firstRange}`
  }
  return cites.join("; ")
}

const snapshotCache = new Map<string, AuditedDataSnapshot>()

export function loadAuditedData(
  auditedDir = "data/audited"
): AuditedDataSnapshot {
  const cached = snapshotCache.get(auditedDir)
  if (cached !== undefined) return cached

  const kg = compileKgFromDir(auditedDir)
  try {
    const buildH1Map = (periodKey: string): CrmH1Metrics =>
      Object.freeze({
        subscription_and_support_rev: mustVal(
          kg,
          "crm_is",
          "subscription_and_support_rev",
          periodKey
        ),
        professional_services_rev: mustVal(
          kg,
          "crm_is",
          "professional_services_rev",
          periodKey
        ),
        total_revenue: mustVal(kg, "crm_is", "total_revenue", periodKey),
        gross_profit: mustVal(kg, "crm_is", "gross_profit", periodKey),
        operating_income: mustVal(kg, "crm_is", "operating_income", periodKey),
        interest_expense: mustVal(kg, "crm_is", "interest_expense", periodKey),
        gains_on_strategic_investments_net: mustVal(
          kg,
          "crm_is",
          "gains_on_strategic_investments_net",
          periodKey
        ),
        other_income_expense_net: mustVal(
          kg,
          "crm_is",
          "other_income_expense_net",
          periodKey
        ),
        income_before_taxes: mustVal(
          kg,
          "crm_is",
          "income_before_taxes",
          periodKey
        ),
        income_tax_provision: mustVal(
          kg,
          "crm_is",
          "income_tax_provision",
          periodKey
        ),
        net_income: mustVal(kg, "crm_is", "net_income", periodKey),
        basic_shares: mustVal(kg, "crm_is", "basic_shares", periodKey),
        diluted_shares: mustVal(kg, "crm_is", "diluted_shares", periodKey),
        da_expense: mustVal(kg, "crm_cf", "da_expense", periodKey),
        amort_contract_costs: mustVal(
          kg,
          "crm_cf",
          "amort_contract_costs",
          periodKey
        ),
        sbc_expense: mustVal(kg, "crm_cf", "sbc_expense", periodKey),
        strategic_inv_gains_losses_cf: mustVal(
          kg,
          "crm_cf",
          "strategic_inv_gains_losses_cf",
          periodKey
        ),
        chg_accounts_receivable: mustVal(
          kg,
          "crm_cf",
          "chg_accounts_receivable",
          periodKey
        ),
        chg_capitalized_contract_costs: mustVal(
          kg,
          "crm_cf",
          "chg_capitalized_contract_costs",
          periodKey
        ),
        chg_prepaid_and_other_assets: mustVal(
          kg,
          "crm_cf",
          "chg_prepaid_and_other_assets",
          periodKey
        ),
        chg_ap_accrued_and_other_liab: mustVal(
          kg,
          "crm_cf",
          "chg_ap_accrued_and_other_liab",
          periodKey
        ),
        chg_operating_lease_liabilities: mustVal(
          kg,
          "crm_cf",
          "chg_operating_lease_liabilities",
          periodKey
        ),
        chg_unearned_revenue: mustVal(
          kg,
          "crm_cf",
          "chg_unearned_revenue",
          periodKey
        ),
        operating_cash_flow: mustVal(
          kg,
          "crm_cf",
          "operating_cash_flow",
          periodKey
        ),
        acquisitions_net_of_cash: mustVal(
          kg,
          "crm_cf",
          "acquisitions_net_of_cash",
          periodKey
        ),
        purchases_strategic_investments: mustVal(
          kg,
          "crm_cf",
          "purchases_strategic_investments",
          periodKey
        ),
        sales_strategic_investments: mustVal(
          kg,
          "crm_cf",
          "sales_strategic_investments",
          periodKey
        ),
        purchases_marketable_securities: mustVal(
          kg,
          "crm_cf",
          "purchases_marketable_securities",
          periodKey
        ),
        sales_marketable_securities: mustVal(
          kg,
          "crm_cf",
          "sales_marketable_securities",
          periodKey
        ),
        maturities_marketable_securities: mustVal(
          kg,
          "crm_cf",
          "maturities_marketable_securities",
          periodKey
        ),
        capex: mustVal(kg, "crm_cf", "capex", periodKey),
        debt_issuance_proceeds_net: mustVal(
          kg,
          "crm_cf",
          "debt_issuance_proceeds_net",
          periodKey
        ),
        share_repurchases: mustVal(
          kg,
          "crm_cf",
          "share_repurchases",
          periodKey
        ),
        tax_payments_net_share_settlement: mustVal(
          kg,
          "crm_cf",
          "tax_payments_net_share_settlement",
          periodKey
        ),
        proceeds_employee_stock_plans: mustVal(
          kg,
          "crm_cf",
          "proceeds_employee_stock_plans",
          periodKey
        ),
        principal_payments_financing_obligations: mustVal(
          kg,
          "crm_cf",
          "principal_payments_financing_obligations",
          periodKey
        ),
        dividends_paid: mustVal(kg, "crm_cf", "dividends_paid", periodKey),
        amort_purchased_intangibles_cor: mustVal(
          kg,
          "crm_is_supplemental",
          "amort_purchased_intangibles_cor",
          periodKey
        ),
        amort_purchased_intangibles_sm: mustVal(
          kg,
          "crm_is_supplemental",
          "amort_purchased_intangibles_sm",
          periodKey
        ),
        sbc_cor: mustVal(kg, "crm_is_supplemental", "sbc_cor", periodKey),
        sbc_rd: mustVal(kg, "crm_is_supplemental", "sbc_rd", periodKey),
        sbc_sm: mustVal(kg, "crm_is_supplemental", "sbc_sm", periodKey),
        sbc_ga: mustVal(kg, "crm_is_supplemental", "sbc_ga", periodKey),
        sbc_restructuring: mustVal(
          kg,
          "crm_is_supplemental",
          "sbc_restructuring",
          periodKey
        ),
      })

    const debtTranches: CrmDebtTranche[] = DEBT_TRANCHE_SPECS.map((spec) => {
      const rawRow = kg.row("crm_debt", spec.id, {
        doc_id: "doc_crm_20260731",
      })
      const issuanceDate =
        typeof rawRow["issuance_date"] === "string"
          ? rawRow["issuance_date"]
          : ""
      const maturityDate =
        typeof rawRow["maturity_date"] === "string"
          ? rawRow["maturity_date"]
          : ""
      return Object.freeze({
        id: spec.id,
        label: spec.label,
        issuanceDate,
        maturityDate,
        maturityFy: spec.maturityFy,
        couponRate: mustVal(kg, "crm_debt", spec.id, "2027-Q2", {
          dimension: null,
        }),
        principal: mustVal(kg, "crm_debt", spec.id, "2027-Q2", {
          dimension: "measure=principal",
        }),
        carryingValue: mustVal(kg, "crm_debt", spec.id, "2027-Q2", {
          dimension: "measure=carrying_value",
        }),
      })
    })

    const marketPrices = extractMarketPrices(kg)
    const specByTicker = new Map<PeerTicker, PeerQuerySpec>(
      PEER_SPECS.map((spec) => [spec.ticker, spec])
    )
    const buildPeer = (ticker: PeerTicker): PeerRawData => {
      const spec = specByTicker.get(ticker)
      if (spec === undefined) {
        throw new Error(`Missing PeerQuerySpec for ${ticker}`)
      }
      return extractPeer(kg, spec, marketPrices.spotPrices[ticker])
    }
    const peers: Readonly<Record<PeerTicker, PeerRawData>> = Object.freeze({
      ADBE: buildPeer("ADBE"),
      INTU: buildPeer("INTU"),
      NOW: buildPeer("NOW"),
      WDAY: buildPeer("WDAY"),
      HUBS: buildPeer("HUBS"),
      ORCL: buildPeer("ORCL"),
    })

    const peerFilings: Readonly<Record<PeerTicker, string>> = Object.freeze({
      ADBE: buildPeerCitation(kg, "ADBE"),
      INTU: buildPeerCitation(kg, "INTU"),
      NOW: buildPeerCitation(kg, "NOW"),
      WDAY: buildPeerCitation(kg, "WDAY"),
      HUBS: buildPeerCitation(kg, "HUBS"),
      ORCL: buildPeerCitation(kg, "ORCL"),
    })

    const citations: ScheduleCitations = Object.freeze({
      crmIs10K: cleanCitation(
        kg.scheduleCitation("crm_is", { doc_id: "doc_crm_20260131" })
      ),
      crmIs10Q: cleanCitation(
        kg.scheduleCitation("crm_is", { doc_id: "doc_crm_20260731" })
      ),
      crmBs10KPrior: cleanCitation(
        kg.scheduleCitation("crm_bs", { doc_id: "doc_crm_20250131" })
      ),
      crmBs10K: cleanCitation(
        kg.scheduleCitation("crm_bs", { doc_id: "doc_crm_20260131" })
      ),
      crmBs10Q: cleanCitation(
        kg.scheduleCitation("crm_bs", { doc_id: "doc_crm_20260731" })
      ),
      crmCf10K: cleanCitation(
        kg.scheduleCitation("crm_cf", { doc_id: "doc_crm_20260131" })
      ),
      crmDebt: cleanCitation(
        kg.scheduleCitation("crm_debt", { doc_id: "doc_crm_20260731" })
      ),
      crmIntangibles: cleanCitation(
        kg.scheduleCitation("crm_intangibles", { doc_id: "doc_crm_20260731" })
      ),
      crmEpsShares: cleanCitation(
        kg.scheduleCitation("crm_eps_shares", { doc_id: "doc_crm_20260731" })
      ),
      crmGuidance: cleanCitation(kg.scheduleCitation("crm_guidance")),
      crmConsensusTargets: cleanCitation(
        kg.scheduleCitation("consensus_targets", { entity: "CRM" })
      ),
      marketPricesAll: buildMarketPricesCitation(kg),
      macroDgs10: cleanCitation(
        kg.citation("macro_rates", "dgs10", {
          period_key: MACRO_TREASURY_DATE,
          entity: "US_MACRO",
        })
      ),
      macroSingleAOas: cleanCitation(
        kg.citation("macro_rates", "bamlc0a3ca", {
          period_key: MACRO_OAS_DATE,
          entity: "US_MACRO",
        })
      ),
      peerFilings,
    })

    const snapshot: AuditedDataSnapshot = Object.freeze({
      crmIs: Object.freeze({
        subscriptionAndSupportRev: histSeries(
          kg,
          "crm_is",
          "subscription_and_support_rev"
        ),
        professionalServicesRev: histSeries(
          kg,
          "crm_is",
          "professional_services_rev"
        ),
        totalRevenue: histSeries(kg, "crm_is", "total_revenue"),
        costOfRevSubscription: histSeries(
          kg,
          "crm_is",
          "cost_of_rev_subscription"
        ),
        costOfRevProfServices: histSeries(
          kg,
          "crm_is",
          "cost_of_rev_prof_services"
        ),
        totalCostOfRevenue: histSeries(kg, "crm_is", "total_cost_of_revenue"),
        grossProfit: histSeries(kg, "crm_is", "gross_profit"),
        rdExpense: histSeries(kg, "crm_is", "rd_expense"),
        smExpense: histSeries(kg, "crm_is", "sm_expense"),
        gaExpense: histSeries(kg, "crm_is", "ga_expense"),
        restructuring: histSeries(kg, "crm_is", "restructuring"),
        totalOpex: histSeries(kg, "crm_is", "total_opex"),
        operatingIncome: histSeries(kg, "crm_is", "operating_income"),
        gainsOnStrategicInvestmentsNet: histSeries(
          kg,
          "crm_is",
          "gains_on_strategic_investments_net"
        ),
        otherIncomeExpenseNet: histSeries(
          kg,
          "crm_is",
          "other_income_expense_net"
        ),
        incomeBeforeTaxes: histSeries(kg, "crm_is", "income_before_taxes"),
        incomeTaxProvision: histSeries(kg, "crm_is", "income_tax_provision"),
        netIncome: histSeries(kg, "crm_is", "net_income"),
        basicEps: histSeries(kg, "crm_is", "basic_eps"),
        dilutedEps: histSeries(kg, "crm_is", "diluted_eps"),
        basicShares: histSeries(kg, "crm_is", "basic_shares"),
        dilutedShares: histSeries(kg, "crm_is", "diluted_shares"),
      }),
      crmIsSupp: Object.freeze({
        amortPurchasedIntangiblesCor: histSeries(
          kg,
          "crm_is_supplemental",
          "amort_purchased_intangibles_cor"
        ),
        amortPurchasedIntangiblesSm: histSeries(
          kg,
          "crm_is_supplemental",
          "amort_purchased_intangibles_sm"
        ),
        sbcCor: histSeries(kg, "crm_is_supplemental", "sbc_cor"),
        sbcRd: histSeries(kg, "crm_is_supplemental", "sbc_rd"),
        sbcSm: histSeries(kg, "crm_is_supplemental", "sbc_sm"),
        sbcGa: histSeries(kg, "crm_is_supplemental", "sbc_ga"),
        sbcRestructuring: histSeries(
          kg,
          "crm_is_supplemental",
          "sbc_restructuring"
        ),
      }),
      crmBs: Object.freeze({
        cashAndEquivalents: histSeries(kg, "crm_bs", "cash_and_equivalents"),
        marketableSecurities: histSeries(kg, "crm_bs", "marketable_securities"),
        accountsReceivableNet: histSeries(
          kg,
          "crm_bs",
          "accounts_receivable_net"
        ),
        capitalizedContractCostsCurrent: histSeries(
          kg,
          "crm_bs",
          "capitalized_contract_costs_current"
        ),
        prepaidAndOtherCurrentAssets: histSeries(
          kg,
          "crm_bs",
          "prepaid_and_other_current_assets"
        ),
        totalCurrentAssets: histSeries(kg, "crm_bs", "total_current_assets"),
        ppeNet: histSeries(kg, "crm_bs", "ppe_net"),
        operatingLeaseRouAssets: histSeries(
          kg,
          "crm_bs",
          "operating_lease_rou_assets"
        ),
        capitalizedContractCostsNoncurrent: histSeries(
          kg,
          "crm_bs",
          "capitalized_contract_costs_noncurrent"
        ),
        strategicInvestments: histSeries(kg, "crm_bs", "strategic_investments"),
        goodwill: histSeries(kg, "crm_bs", "goodwill"),
        purchasedIntangiblesNet: histSeries(
          kg,
          "crm_bs",
          "purchased_intangibles_net"
        ),
        deferredTaxAndOtherAssetsNet: histSeries(
          kg,
          "crm_bs",
          "deferred_tax_and_other_assets_net"
        ),
        totalAssets: histSeries(kg, "crm_bs", "total_assets"),
        apAccruedAndOtherCurrentLiab: histSeries(
          kg,
          "crm_bs",
          "ap_accrued_and_other_current_liab"
        ),
        operatingLeaseLiabCurrent: histSeries(
          kg,
          "crm_bs",
          "operating_lease_liab_current"
        ),
        unearnedRevenue: histSeries(kg, "crm_bs", "unearned_revenue"),
        debtCurrent: histSeries(kg, "crm_bs", "debt_current"),
        totalCurrentLiabilities: histSeries(
          kg,
          "crm_bs",
          "total_current_liabilities"
        ),
        debtNoncurrent: histSeries(kg, "crm_bs", "debt_noncurrent"),
        operatingLeaseLiabNoncurrent: histSeries(
          kg,
          "crm_bs",
          "operating_lease_liab_noncurrent"
        ),
        otherNoncurrentLiabilities: histSeries(
          kg,
          "crm_bs",
          "other_noncurrent_liabilities"
        ),
        totalLiabilities: histSeries(kg, "crm_bs", "total_liabilities"),
        commonStock: histSeries(kg, "crm_bs", "common_stock"),
        preferredStock: histSeries(kg, "crm_bs", "preferred_stock"),
        treasuryStock: histSeries(kg, "crm_bs", "treasury_stock"),
        apic: histSeries(kg, "crm_bs", "apic"),
        aoci: histSeries(kg, "crm_bs", "aoci"),
        retainedEarnings: histSeries(kg, "crm_bs", "retained_earnings"),
        totalEquity: histSeries(kg, "crm_bs", "total_equity"),
        totalLiabilitiesAndEquity: histSeries(
          kg,
          "crm_bs",
          "total_liabilities_and_equity"
        ),
      }),
      crmCf: Object.freeze({
        netIncome: histSeries(kg, "crm_cf", "net_income"),
        daExpense: histSeries(kg, "crm_cf", "da_expense"),
        amortContractCosts: histSeries(kg, "crm_cf", "amort_contract_costs"),
        sbcExpense: histSeries(kg, "crm_cf", "sbc_expense"),
        strategicInvGainsLossesCf: histSeries(
          kg,
          "crm_cf",
          "strategic_inv_gains_losses_cf"
        ),
        chgAccountsReceivable: histSeries(
          kg,
          "crm_cf",
          "chg_accounts_receivable"
        ),
        chgCapitalizedContractCosts: histSeries(
          kg,
          "crm_cf",
          "chg_capitalized_contract_costs"
        ),
        chgPrepaidAndOtherAssets: histSeries(
          kg,
          "crm_cf",
          "chg_prepaid_and_other_assets"
        ),
        chgApAccruedAndOtherLiab: histSeries(
          kg,
          "crm_cf",
          "chg_ap_accrued_and_other_liab"
        ),
        chgOperatingLeaseLiabilities: histSeries(
          kg,
          "crm_cf",
          "chg_operating_lease_liabilities"
        ),
        chgUnearnedRevenue: histSeries(kg, "crm_cf", "chg_unearned_revenue"),
        operatingCashFlow: histSeries(kg, "crm_cf", "operating_cash_flow"),
        acquisitionsNetOfCash: histSeries(
          kg,
          "crm_cf",
          "acquisitions_net_of_cash"
        ),
        purchasesStrategicInvestments: histSeries(
          kg,
          "crm_cf",
          "purchases_strategic_investments"
        ),
        salesStrategicInvestments: histSeries(
          kg,
          "crm_cf",
          "sales_strategic_investments"
        ),
        purchasesMarketableSecurities: histSeries(
          kg,
          "crm_cf",
          "purchases_marketable_securities"
        ),
        salesMarketableSecurities: histSeries(
          kg,
          "crm_cf",
          "sales_marketable_securities"
        ),
        maturitiesMarketableSecurities: histSeries(
          kg,
          "crm_cf",
          "maturities_marketable_securities"
        ),
        capex: histSeries(kg, "crm_cf", "capex"),
        investingCashFlow: histSeries(kg, "crm_cf", "investing_cash_flow"),
        debtIssuanceProceedsNet: histSeries(
          kg,
          "crm_cf",
          "debt_issuance_proceeds_net"
        ),
        shareRepurchases: histSeries(kg, "crm_cf", "share_repurchases"),
        taxPaymentsNetShareSettlement: histSeries(
          kg,
          "crm_cf",
          "tax_payments_net_share_settlement"
        ),
        proceedsEmployeeStockPlans: histSeries(
          kg,
          "crm_cf",
          "proceeds_employee_stock_plans"
        ),
        principalPaymentsFinancingObligations: histSeries(
          kg,
          "crm_cf",
          "principal_payments_financing_obligations"
        ),
        dividendsPaid: histSeries(kg, "crm_cf", "dividends_paid"),
        debtRepayments: histSeries(kg, "crm_cf", "debt_repayments"),
        financingCashFlow: histSeries(kg, "crm_cf", "financing_cash_flow"),
        fxEffectOnCash: histSeries(kg, "crm_cf", "fx_effect_on_cash"),
        netChangeInCash: histSeries(kg, "crm_cf", "net_change_in_cash"),
        beginningCash: histSeries(kg, "crm_cf", "beginning_cash"),
        endingCash: histSeries(kg, "crm_cf", "ending_cash"),
      }),
      crmH1: Object.freeze({
        h1Fy26: buildH1Map("2026-Q2-YTD"),
        h1Fy27: buildH1Map("2027-Q2-YTD"),
        q2Fy27Bs: Object.freeze({
          cashAndEquivalents: mustVal(
            kg,
            "crm_bs",
            "cash_and_equivalents",
            "2027-Q2"
          ),
          marketableSecurities: mustVal(
            kg,
            "crm_bs",
            "marketable_securities",
            "2027-Q2"
          ),
          accountsReceivableNet: mustVal(
            kg,
            "crm_bs",
            "accounts_receivable_net",
            "2027-Q2"
          ),
          ppeNet: mustVal(kg, "crm_bs", "ppe_net", "2027-Q2"),
          operatingLeaseRouAssets: mustVal(
            kg,
            "crm_bs",
            "operating_lease_rou_assets",
            "2027-Q2"
          ),
          strategicInvestments: mustVal(
            kg,
            "crm_bs",
            "strategic_investments",
            "2027-Q2"
          ),
          goodwill: mustVal(kg, "crm_bs", "goodwill", "2027-Q2"),
          purchasedIntangiblesNet: mustVal(
            kg,
            "crm_bs",
            "purchased_intangibles_net",
            "2027-Q2"
          ),
          totalAssets: mustVal(kg, "crm_bs", "total_assets", "2027-Q2"),
          operatingLeaseLiabCurrent: mustVal(
            kg,
            "crm_bs",
            "operating_lease_liab_current",
            "2027-Q2"
          ),
          operatingLeaseLiabNoncurrent: mustVal(
            kg,
            "crm_bs",
            "operating_lease_liab_noncurrent",
            "2027-Q2"
          ),
          finLeaseLiabTotalFy26: mustVal(
            kg,
            "crm_leases",
            "fin_lease_liab_total",
            "2026-FY"
          ),
          finLeaseLiabTotal: mustVal(
            kg,
            "crm_leases",
            "fin_lease_liab_total",
            "2027-Q2"
          ),
          unearnedRevenue: mustVal(kg, "crm_bs", "unearned_revenue", "2027-Q2"),
          debtCurrent: mustVal(kg, "crm_bs", "debt_current", "2027-Q2"),
          debtNoncurrent: mustVal(kg, "crm_bs", "debt_noncurrent", "2027-Q2"),
          totalLiabilities: mustVal(
            kg,
            "crm_bs",
            "total_liabilities",
            "2027-Q2"
          ),
          totalEquity: mustVal(kg, "crm_bs", "total_equity", "2027-Q2"),
        }),
        q2Fy27Meta: Object.freeze({
          coverSharesOutstanding: mustVal(
            kg,
            "crm_eps_shares",
            "common_shares_outstanding_cover",
            "2026-08-20"
          ),
          q2DilutiveStockAwards: mustVal(
            kg,
            "crm_eps_shares",
            "dilutive_employee_stock_awards",
            "2027-Q2"
          ),
          asrUpfrontPayment: mustVal(
            kg,
            "crm_eps_shares",
            "asr_upfront_payment",
            "2027-Q1"
          ),
          asrInitialSharesDelivered: mustVal(
            kg,
            "crm_eps_shares",
            "asr_initial_shares_delivered",
            "2027-Q1"
          ),
          asrInitialAvgPrice: mustVal(
            kg,
            "crm_eps_shares",
            "asr_initial_avg_price",
            "2027-Q1"
          ),
          informaticaFy26Rev: mustVal(
            kg,
            "crm_ma_disclosures",
            "informatica_revenue_contribution",
            "2026-FY"
          ),
          informaticaH1Fy27Rev: mustVal(
            kg,
            "crm_ma_disclosures",
            "informatica_revenue_contribution",
            "2027-Q2-YTD"
          ),
          pendingContentfulCash: mustVal(
            kg,
            "crm_ma_disclosures",
            "pending_contentful_cash_commitment",
            "2027-Q2"
          ),
          pendingFinCash: mustVal(
            kg,
            "crm_ma_disclosures",
            "pending_fin_cash_commitment",
            "2027-Q2"
          ),
          h1IntangiblesGrossAdditions: mustVal(
            kg,
            "crm_intangibles",
            "total_purchased_intangibles",
            "2027-Q2-YTD",
            { dimension: "measure=gross_additions_net" }
          ),
          futureAmortFy27Rem: mustVal(
            kg,
            "crm_intangibles",
            "future_amort_fy2027_rem",
            "2027-Q2",
            { dimension: "measure=future_amortization" }
          ),
          futureAmortFy28: mustVal(
            kg,
            "crm_intangibles",
            "future_amort_fy2028",
            "2027-Q2",
            { dimension: "measure=future_amortization" }
          ),
          futureAmortFy29: mustVal(
            kg,
            "crm_intangibles",
            "future_amort_fy2029",
            "2027-Q2",
            { dimension: "measure=future_amortization" }
          ),
          futureAmortFy30: mustVal(
            kg,
            "crm_intangibles",
            "future_amort_fy2030",
            "2027-Q2",
            { dimension: "measure=future_amortization" }
          ),
          futureAmortFy31: mustVal(
            kg,
            "crm_intangibles",
            "future_amort_fy2031",
            "2027-Q2",
            { dimension: "measure=future_amortization" }
          ),
          fy27GuidanceRevLow: mustVal(
            kg,
            "crm_guidance",
            "revenue_low",
            "2027-FY",
            { basis: "forecast" }
          ),
          fy27GuidanceRevHigh: mustVal(
            kg,
            "crm_guidance",
            "revenue_high",
            "2027-FY",
            { basis: "forecast" }
          ),
          fy27GuidanceGaapOm: mustVal(
            kg,
            "crm_guidance",
            "gaap_operating_margin",
            "2027-FY",
            { basis: "forecast" }
          ),
          fy27GuidanceNonGaapOm: mustVal(
            kg,
            "crm_guidance",
            "nongaap_operating_margin",
            "2027-FY",
            { basis: "forecast" }
          ),
          anthropicPortfolioShareQ2: mustVal(
            kg,
            "crm_strategic_investments",
            "anthropic_portfolio_share",
            "2027-Q2"
          ),
          crmFy1ConsensusEps: mustVal(
            kg,
            "consensus_eps",
            "consensus_eps",
            "2027-FY",
            { entity: "CRM" }
          ),
          crmFy2ConsensusEps: mustVal(
            kg,
            "consensus_eps",
            "consensus_eps",
            "2028-FY",
            { entity: "CRM" }
          ),
          crmTargetMean: mustVal(
            kg,
            "consensus_targets",
            "mean_target_price",
            VALUATION_AS_OF_DATE,
            { entity: "CRM" }
          ),
          crmTargetLow: mustVal(
            kg,
            "consensus_targets",
            "low_target_price",
            VALUATION_AS_OF_DATE,
            { entity: "CRM" }
          ),
          crmTargetHigh: mustVal(
            kg,
            "consensus_targets",
            "high_target_price",
            VALUATION_AS_OF_DATE,
            { entity: "CRM" }
          ),
          crmBuyCount: mustVal(
            kg,
            "consensus_targets",
            "buy_count",
            VALUATION_AS_OF_DATE,
            { entity: "CRM" }
          ),
          crmHoldCount: mustVal(
            kg,
            "consensus_targets",
            "hold_count",
            VALUATION_AS_OF_DATE,
            { entity: "CRM" }
          ),
          crmSellCount: mustVal(
            kg,
            "consensus_targets",
            "sell_count",
            VALUATION_AS_OF_DATE,
            { entity: "CRM" }
          ),
          crmTotalRatings: mustVal(
            kg,
            "consensus_targets",
            "total_ratings",
            VALUATION_AS_OF_DATE,
            { entity: "CRM" }
          ),
        }),
      }),
      debtTranches: Object.freeze(debtTranches),
      macroRates: Object.freeze({
        dgs10: mustVal(kg, "macro_rates", "dgs10", MACRO_TREASURY_DATE, {
          entity: "US_MACRO",
        }),
        dgs2: mustVal(kg, "macro_rates", "dgs2", MACRO_TREASURY_DATE, {
          entity: "US_MACRO",
        }),
        singleAOas: mustVal(kg, "macro_rates", "bamlc0a3ca", MACRO_OAS_DATE, {
          entity: "US_MACRO",
        }),
        masterOas: mustVal(kg, "macro_rates", "bamlc0a0cm", MACRO_OAS_DATE, {
          entity: "US_MACRO",
        }),
        bbbOas: mustVal(kg, "macro_rates", "bamlc0a4cbbb", MACRO_OAS_DATE, {
          entity: "US_MACRO",
        }),
      }),
      marketPrices,
      peers,
      citations,
    })

    snapshotCache.set(auditedDir, snapshot)
    return snapshot
  } finally {
    kg.close()
  }
}
