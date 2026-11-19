import { compileKgFromDir, type KgRegistry } from "./audited-reader.ts"
import type { AccountingBasis } from "./audited-reader.ts"
import {
  DISPLAY_SCALE_MILLIONS,
  HISTORICAL_PERIODS,
  KG_DIVISORS,
  PERIOD_METADATA,
  type HistoricalPeriod,
} from "./timeline.ts"

export type HistSeries = Readonly<Record<HistoricalPeriod, number>>

export type PeerTicker = "BJ" | "PSMT" | "WMT" | "TGT" | "KR"
export type AllCompTicker = "COST" | PeerTicker

export interface CostSegmentSeries {
  readonly us: HistSeries
  readonly canada: HistSeries
  readonly otherIntl: HistSeries
  readonly total: HistSeries
}

export interface DebtTrancheMeta {
  readonly label: string
  readonly couponRate: number
  readonly maturityLabel: string
}

export interface CostHistoricalData {
  readonly fy21: {
    readonly cashAndEquivalents: number
    readonly shortTermInvestments: number
    readonly ppeNet: number
    readonly totalDebtPrincipal: number
    readonly unamortizedDiscounts: number
    readonly currentPortionDebtBs: number
    readonly longTermDebtBs: number
    readonly financeLeaseLiabCurrent: number
    readonly financeLeaseLiabLt: number
    readonly operatingLeaseLiabCurrent: number
    readonly operatingLeaseLiabLt: number
    readonly warehousesTotal: number
    readonly paidMembersMillions: number
    readonly endingSharesMillions: number
  }
  readonly incomeStatement: {
    readonly netSales: HistSeries
    readonly membershipFees: HistSeries
    readonly totalRevenue: HistSeries
    readonly merchandiseCosts: HistSeries
    readonly sga: HistSeries
    readonly operatingIncome: HistSeries
    readonly interestExpense: HistSeries
    readonly interestIncome: HistSeries
    readonly fxGainsNet: HistSeries
    readonly otherNonOpNet: HistSeries
    readonly interestIncomeAndOtherNet: HistSeries
    readonly ebt: HistSeries
    readonly taxProvision: HistSeries
    readonly netIncomeInclNci: HistSeries
    readonly netIncomeAttrNci: HistSeries
    readonly netIncomeAttrCostco: HistSeries
  }
  readonly balanceSheet: {
    readonly cashAndEquivalents: HistSeries
    readonly shortTermInvestments: HistSeries
    readonly receivablesNet: HistSeries
    readonly merchandiseInventories: HistSeries
    readonly otherCurrentAssets: HistSeries
    readonly totalCurrentAssets: HistSeries
    readonly ppeNet: HistSeries
    readonly operatingLeaseRouAssets: HistSeries
    readonly otherLongTermAssets: HistSeries
    readonly totalAssets: HistSeries
    readonly accountsPayable: HistSeries
    readonly accruedSalariesAndBenefits: HistSeries
    readonly accruedMemberRewards: HistSeries
    readonly deferredMembershipFees: HistSeries
    readonly currentPortionDebtBs: HistSeries
    readonly otherCurrentLiabilities: HistSeries
    readonly totalCurrentLiabilities: HistSeries
    readonly longTermDebt: HistSeries
    readonly longTermOperatingLeaseLiabilities: HistSeries
    readonly otherLongTermLiabilities: HistSeries
    readonly totalLiabilities: HistSeries
    readonly commonStock: HistSeries
    readonly additionalPaidInCapital: HistSeries
    readonly aoci: HistSeries
    readonly retainedEarnings: HistSeries
    readonly noncontrollingInterests: HistSeries
    readonly totalEquity: HistSeries
    readonly totalLiabilitiesAndEquity: HistSeries
  }
  readonly cashFlow: {
    readonly netIncomeInclNci: HistSeries
    readonly depreciationAndAmortization: HistSeries
    readonly nonCashLeaseExpense: HistSeries
    readonly stockBasedCompensation: HistSeries
    readonly deferredIncomeTaxes: HistSeries
    readonly otherNonCashOperating: HistSeries
    readonly changeInventories: HistSeries
    readonly changeAccountsPayable: HistSeries
    readonly changeOtherOpAssetsLiab: HistSeries
    readonly cfo: HistSeries
    readonly capex: HistSeries
    readonly purchasesSti: HistSeries
    readonly maturitiesSti: HistSeries
    readonly otherInvesting: HistSeries
    readonly cfi: HistSeries
    readonly repaymentsStBorrowings: HistSeries
    readonly proceedsStBorrowings: HistSeries
    readonly repaymentsLtDebt: HistSeries
    readonly proceedsLtDebt: HistSeries
    readonly taxWithholdingsSbc: HistSeries
    readonly repurchasesCommonStock: HistSeries
    readonly cashDividendPayments: HistSeries
    readonly financingLeaseAndOther: HistSeries
    readonly dividendToNci: HistSeries
    readonly acquisitionOfNci: HistSeries
    readonly cff: HistSeries
    readonly fxEffectOnCash: HistSeries
    readonly netChangeInCash: HistSeries
    readonly cashBeginning: HistSeries
    readonly cashEnding: HistSeries
  }
  readonly debtLeases: {
    readonly seniorNotesMay2027: HistSeries
    readonly seniorNotesJun2027: HistSeries
    readonly seniorNotesApr2030: HistSeries
    readonly seniorNotesApr2032: HistSeries
    readonly seniorNotesMay2024: HistSeries
    readonly seniorNotesMay2022: HistSeries
    readonly otherLtDebtJapan: HistSeries
    readonly totalLtDebtPrincipal: HistSeries
    readonly unamortizedDiscounts: HistSeries
    readonly currentPortionDebtSched: HistSeries
    readonly longTermDebtExclCurrent: HistSeries
    readonly shortTermBorrowings: HistSeries
    readonly creditFacilityCapacity: HistSeries
    readonly currentOpLeaseLiab: HistSeries
    readonly ltOpLeaseLiab: HistSeries
    readonly currentFinLeaseLiab: HistSeries
    readonly ltFinLeaseLiab: HistSeries
    readonly financeLeaseRouAssets: HistSeries
    readonly financeLeaseInterest: HistSeries
    readonly operatingLeaseCost: HistSeries
    readonly maturities2027: number
    readonly maturities2028: number
    readonly maturities2029: number
    readonly maturities2030: number
    readonly maturities2031: number
    readonly maturitiesThereafter: number
    readonly trancheMeta: Readonly<{
      readonly may2027: DebtTrancheMeta
      readonly jun2027: DebtTrancheMeta
      readonly apr2030: DebtTrancheMeta
      readonly apr2032: DebtTrancheMeta
      readonly japanLabel: string
    }>
  }
  readonly equityAndShares: {
    readonly endingSharesMillions: HistSeries
    readonly wavgBasicSharesMillions: HistSeries
    readonly dilutiveRsusMillions: HistSeries
    readonly wavgDilutedSharesMillions: HistSeries
    readonly dilutedEps: HistSeries
    readonly sharesRepurchasedMillions: HistSeries
    readonly repurchaseAvgPrice: HistSeries
    readonly repurchaseTotalCost: HistSeries
    readonly rsuVestedDeliveredMillions: HistSeries
    readonly cashDividendsDeclared: HistSeries
    readonly sbcTaxBenefit: HistSeries
  }
  readonly operatingKpis: {
    readonly warehousesUs: HistSeries
    readonly warehousesCanada: HistSeries
    readonly warehousesOtherIntl: HistSeries
    readonly warehousesTotal: HistSeries
    readonly warehousesOwned: HistSeries
    readonly warehousesLeased: HistSeries
    readonly netNewWarehouses: HistSeries
    readonly warehouseSqftUsMillions: HistSeries
    readonly warehouseSqftTotalMillions: HistSeries
    readonly paidMembersMillions: HistSeries
    readonly totalCardholdersMillions: HistSeries
    readonly executiveMembersMillions: HistSeries
    readonly renewalRateUsCa: HistSeries
    readonly renewalRateWw: HistSeries
    readonly compExGasFxUs: HistSeries
    readonly compExGasFxCanada: HistSeries
    readonly compExGasFxOtherIntl: HistSeries
    readonly compExGasFxTotal: HistSeries
    readonly compReportedTotal: HistSeries
    readonly gasolinePctNetSales: HistSeries
    readonly segmentsRevenue: CostSegmentSeries
    readonly merchFoodsSundries: HistSeries
    readonly merchNonFoods: HistSeries
    readonly merchFreshFoods: HistSeries
    readonly merchAncillary: HistSeries
  }
  readonly qoe: {
    readonly fy26IeepaMerchOffset: number
    readonly fy26IeepaInterestIncome: number
    readonly fy26IeepaReinvestedEst: number
    readonly fy26IeepaEpsBenefit: number
    readonly fy26LifoCharge: number
    readonly fy23CharterShippingImpairment: number
    readonly fy24SpecialDivTotal: number
    readonly fy24SpecialDivPs: number
    readonly fy27GuidedGrossOpenings: number
    readonly fy27GuidedRelocations: number
    readonly fy27GuidedNetOpenings: number
    readonly fy27GuidedCapex: number
    readonly ltNetOpeningsTarget: number
    readonly nov2026SpecialDivPs: number
    readonly nov2026SpecialDivTotal: number
    readonly oct2026QuarterlyDivPs: number
    readonly nov2026BuybackReauth: number
    readonly oct2026MonthlyCompExGasFx: number
    readonly sep2026MonthlyCompExGasFx: number
    readonly oct2026GasPriceYoySep: number
    readonly costEntryFee: number
    readonly costPremiumFee: number
  }
}

export interface EquityQuoteSnapshot {
  readonly closePrice: number
  readonly secSharesMillions: number
  readonly marketCapSec: number
  readonly mrqCashAndSti: number
  readonly mrqTotalDebtInclLeases: number
  readonly mrqNetCash: number
  readonly evSecMrq: number
  readonly beta5yMonthly: number
  readonly regularAnnualDps: number
  readonly specialDividendPs: number
  readonly peLtm: number
  readonly evToLtmSales: number
  readonly evToLtmEbitda: number
  readonly evToLtmEbit: number
  readonly pToLtmFcf: number
}

export interface ConsensusSnapshot {
  readonly rev27: number
  readonly ebitda27: number
  readonly ebit27: number
  readonly netProfit27: number
  readonly epsHeadline27: number
  readonly saFcf27: number | null
  readonly rev28: number
  readonly ebitda28: number
  readonly ebit28: number
  readonly netProfit28: number
  readonly epsHeadline28: number
  readonly ptLow: number
  readonly ptAverage: number
  readonly ptMedian: number
  readonly ptHigh: number
  readonly analystCount27: number
}

export interface PeerPeriodTriplet {
  readonly fy26: number
  readonly h1_26: number
  readonly h1_27: number
}

export type ClubUnitEconEntity =
  | "COST_US"
  | "COST_TOTAL"
  | "WMT_SAMS_H1_ANN"
  | "WMT_SAMS_FY26"
  | "BJ"
  | "PSMT"

export interface PeerEntityMeta {
  readonly ticker: AllCompTicker
  readonly name: string
  readonly peerGroup: "Target" | "Pure-Play Club" | "Omni / Mass Retail"
  readonly fiscalWindowLabel: string
  readonly qoeNote: string
}

export interface PeerRawData {
  readonly meta: Readonly<Record<AllCompTicker, PeerEntityMeta>>
  readonly bj: {
    readonly netSales: PeerPeriodTriplet
    readonly mfiAndOther: PeerPeriodTriplet
    readonly rev: PeerPeriodTriplet
    readonly costOfSales: PeerPeriodTriplet
    readonly sga: PeerPeriodTriplet
    readonly preOpening: PeerPeriodTriplet
    readonly ebit: PeerPeriodTriplet
    readonly ebt: PeerPeriodTriplet
    readonly tax: PeerPeriodTriplet
    readonly ni: PeerPeriodTriplet
    readonly da: PeerPeriodTriplet
    readonly cfo: PeerPeriodTriplet
    readonly capex: PeerPeriodTriplet
    readonly qoeRestruct: PeerPeriodTriplet
    readonly qoeTaxMgmt: PeerPeriodTriplet
    readonly qoeSlbGainH127: number
    readonly cashH127: number
    readonly carryingFinancialDebtH127: number
    readonly operatingLeaseLiabH127: number
    readonly financeLeaseLiabFy26: number
    readonly ltFinancingObligationsFy26: number
  }
  readonly psmt: {
    readonly netSalesFy26: number
    readonly mfiAndOtherFy26: number
    readonly revFy26: number
    readonly costOfSalesFy26: number
    readonly sgaFy26: number
    readonly preOpeningFy26: number
    readonly lossDisposalIsFy26: number
    readonly ebitFy26: number
    readonly ebtFy26: number
    readonly taxFy26: number
    readonly niFy26: number
    readonly daFy26: number
    readonly cfoFy26: number
    readonly capexFy26: number
    readonly qoeLossDisposalFy26: number
    readonly qoeGainJvFy26: number
    readonly cashFy26: number
    readonly stiFy26: number
    readonly carryingFinancialDebtFy26: number
    readonly totalLeaseLiabFy26: number
  }
  readonly wmt: {
    readonly rev: PeerPeriodTriplet
    readonly ebit: PeerPeriodTriplet
    readonly ebt: PeerPeriodTriplet
    readonly tax: PeerPeriodTriplet
    readonly ni: PeerPeriodTriplet
    readonly da: PeerPeriodTriplet
    readonly cfo: PeerPeriodTriplet
    readonly capex: PeerPeriodTriplet
    readonly qoeOtherGains: PeerPeriodTriplet
    readonly qoeTariffRefundH127: number
    readonly qoePhonePeFy26: number
    readonly qoeUncertainTaxIntH127: number
    readonly qoeUncertainTaxBenefitH127: number
    readonly cashH127: number
    readonly financialDebtExclLeasesH127: number
    readonly financeLeaseLiabH127: number
    readonly operatingLeaseLiabH127: number
  }
  readonly tgt: {
    readonly rev: PeerPeriodTriplet
    readonly ebit: PeerPeriodTriplet
    readonly ni: PeerPeriodTriplet
    readonly da: PeerPeriodTriplet
    readonly cfo: PeerPeriodTriplet
    readonly capex: PeerPeriodTriplet
    readonly qoeTariffRefundH127: number
    readonly qoeTransformationFy26: number
    readonly qoeTariffEpsMemoH127: number
    readonly qoeTransformationAfterTaxFy26: number
    readonly wavgDilutedSharesH127: number
    readonly cashH127: number
    readonly debtAndFinLeasesBsH127: number
    readonly operatingLeaseLiabH127: number
  }
  readonly kr: {
    readonly rev: PeerPeriodTriplet
    readonly ebit: PeerPeriodTriplet
    readonly ni: PeerPeriodTriplet
    readonly da: PeerPeriodTriplet
    readonly cfo: PeerPeriodTriplet
    readonly capex: PeerPeriodTriplet
    readonly qoeOpAdj: PeerPeriodTriplet
    readonly qoeNiAdj: PeerPeriodTriplet
    readonly cashH127: number
    readonly debtAndFinLeasesBsH127: number
    readonly operatingLeaseLiabH127: number
  }
}

export interface ClubUnitEconEntityMeta {
  readonly entity: ClubUnitEconEntity
  readonly label: string
  readonly periodBasis: string
  readonly notes: string
}

export interface ClubUnitEconRawData {
  readonly meta: Readonly<Record<ClubUnitEconEntity, ClubUnitEconEntityMeta>>
  readonly costUs: {
    readonly merchCostsFy26: number
    readonly sgaFy26: number
    readonly ebitFy26: number
    readonly daFy26: number
    readonly capexFy26: number
  }
  readonly sams: {
    readonly clubsH127: number
    readonly sqftMillionsH127: number
    readonly netSalesH127: number
    readonly mfiAndOtherH127: number
    readonly totalRevH127: number
    readonly merchGpH127: number
    readonly sgaH127: number
    readonly ebitH127: number
    readonly daH127: number
    readonly capexH127: number
    readonly compExFuelQ127: number
    readonly compExFuelQ227: number
    readonly clubsFy26: number
    readonly sqftMillionsFy26: number
    readonly netSalesFy26: number
    readonly mfiAndOtherFy26: number
    readonly totalRevFy26: number
    readonly costOfSalesFy26: number
    readonly merchGpFy26: number
    readonly sgaFy26: number
    readonly ebitFy26: number
    readonly daFy26: number
    readonly capexFy26: number
    readonly compInclFuelFy26: number
    readonly compFuelImpactFy26: number
    readonly entryFeeDollars: number
    readonly premiumFeeDollars: number
  }
  readonly bj: {
    readonly clubsH127: number
    readonly paidMembersMillionsH127: number
    readonly compExFuelH127: number
    readonly renewalRateFy26: number
    readonly higherTierPenetrationFy26: number
    readonly entryFeeDollars: number
    readonly premiumFeeDollars: number
  }
  readonly psmt: {
    readonly clubsFy26: number
    readonly sqftMillionsFy26: number
    readonly paidMembersMillionsFy26: number
    readonly compTotalFy26: number
    readonly renewalRateFy26: number
    readonly higherTierPenetrationFy26: number
  }
}

export interface MarketMacroData {
  readonly rfPar10y: number
  readonly rfPar1y: number
  readonly rfPar1m: number
  readonly realTips10y: number
  readonly t10yieBreakeven: number
  readonly dffFedFunds: number
  readonly oasAa: number
  readonly oasIgMaster: number
  readonly quotes: Readonly<Record<AllCompTicker, EquityQuoteSnapshot>>
  readonly consensus: Readonly<Record<AllCompTicker, ConsensusSnapshot>>
  readonly peers: PeerRawData
  readonly clubUnitEconRaw: ClubUnitEconRawData
}

export interface CostcoKnowledgeData {
  readonly cost: CostHistoricalData
  readonly market: MarketMacroData
  readonly citations: Readonly<{
    readonly incomeStatement: string
    readonly balanceSheet: string
    readonly cashFlow: string
    readonly debtLeases: string
    readonly warehouseMembership: string
    readonly guidanceCapitalReturn: string
    readonly equityQuotes: string
    readonly consensusEstimates: string
    readonly priceTargets: string
    readonly treasuryPar: string
    readonly treasuryReal: string
    readonly creditOas: string
    readonly inflationFedFunds: string
    readonly peerFinancials: string
    readonly peerIncomeStatement: string
    readonly peerQoe: string
    readonly samsClub: string
  }>
}

function mustVal(
  kg: KgRegistry,
  scheduleId: string,
  rowId: string,
  periodKey: string,
  options?: Parameters<KgRegistry["val"]>[3]
): number {
  const v = kg.val(scheduleId, rowId, periodKey, options)
  if (v === null) {
    throw new Error(
      `KgRegistry missing value for (${scheduleId}, ${rowId}, ${periodKey}, ${JSON.stringify(options ?? {})})`
    )
  }
  return v
}

function optVal(
  kg: KgRegistry,
  scheduleId: string,
  rowId: string,
  periodKey: string,
  options?: Parameters<KgRegistry["val"]>[3]
): number | null {
  return kg.val(scheduleId, rowId, periodKey, options)
}

function costSeries(
  kg: KgRegistry,
  scheduleId: string,
  rowId: string,
  options?: {
    readonly dimension?: string
    readonly basis?: AccountingBasis
    readonly defaultZero?: boolean
    readonly divisors?: typeof KG_DIVISORS
    readonly scaleCount?: number
  }
): HistSeries {
  const out: Partial<Record<HistoricalPeriod, number>> = {}
  const useDivisors = options?.divisors ?? KG_DIVISORS
  for (const p of HISTORICAL_PERIODS) {
    const pk = PERIOD_METADATA[p].kgPeriodKey
    const raw = kg.val(scheduleId, rowId, pk, {
      entity: "COST",
      divisors: useDivisors,
      ...(options?.dimension ? { dimension: options.dimension } : {}),
      ...(options?.basis ? { basis: options.basis } : {}),
    })
    if (raw === null) {
      if (options?.defaultZero) {
        out[p] = 0
      } else {
        throw new Error(`Missing COST ${scheduleId}.${rowId} @ ${pk}`)
      }
    } else {
      out[p] = options?.scaleCount ? raw / options.scaleCount : raw
    }
  }
  return Object.freeze(out as Record<HistoricalPeriod, number>)
}

function janPeerTriplet(
  kg: KgRegistry,
  scheduleId: string,
  rowId: string,
  entity: Exclude<PeerTicker, "PSMT">,
  basis?: AccountingBasis
): PeerPeriodTriplet {
  const opts = {
    entity,
    divisors: KG_DIVISORS,
    ...(basis ? { basis } : {}),
  }
  return Object.freeze({
    fy26: mustVal(kg, scheduleId, rowId, "2026-FY", opts),
    h1_26: mustVal(kg, scheduleId, rowId, "2026-H1", opts),
    h1_27: mustVal(kg, scheduleId, rowId, "2027-H1", opts),
  })
}

function janPeerTripletOpt(
  kg: KgRegistry,
  scheduleId: string,
  rowId: string,
  entity: Exclude<PeerTicker, "PSMT">,
  basis?: AccountingBasis
): PeerPeriodTriplet {
  const opts = {
    entity,
    divisors: KG_DIVISORS,
    ...(basis ? { basis } : {}),
  }
  return Object.freeze({
    fy26: optVal(kg, scheduleId, rowId, "2026-FY", opts) ?? 0,
    h1_26: optVal(kg, scheduleId, rowId, "2026-H1", opts) ?? 0,
    h1_27: optVal(kg, scheduleId, rowId, "2027-H1", opts) ?? 0,
  })
}

function parseUsdSeniorNoteMeta(
  rowsById: ReadonlyMap<
    string,
    { readonly label: string; readonly raw_label: string | null }
  >,
  rowId: string
): DebtTrancheMeta {
  const row = rowsById.get(rowId)
  if (!row) {
    throw new Error(`KgRegistry missing cost_debt_schedule row "${rowId}"`)
  }
  const sourceText = (row.raw_label ?? row.label).trim()
  const match =
    /^(\d+(?:\.\d+)?)%\s+Senior\s+Notes\s+due\s+([A-Za-z]+)\s+(\d{4})$/i.exec(
      sourceText
    )
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(
      `Unable to parse coupon/maturity from cost_debt_schedule row "${rowId}": "${sourceText}"`
    )
  }
  const rawMonth = match[2]
  const shortMonth =
    rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1, 3).toLowerCase()
  const maturityLabel = `${shortMonth} ${match[3]}`
  return Object.freeze({
    label: `${match[1]}% Senior Notes due ${maturityLabel}`,
    couponRate: Number(match[1]) / 100,
    maturityLabel,
  })
}

export function loadCostcoKnowledgeData(): CostcoKnowledgeData {
  using kg = compileKgFromDir("data/audited")

  const costOpts = { entity: "COST", divisors: KG_DIVISORS } as const
  const costRawOpts = { entity: "COST" } as const
  const debtScheduleRows = new Map(
    kg
      .rows("cost_debt_schedule", { entity: "COST" })
      .map((r) => [r.row_id, { label: r.label, raw_label: r.raw_label }])
  )
  const japanRow = debtScheduleRows.get("other_long_term_debt_japan")
  if (!japanRow) {
    throw new Error(
      'KgRegistry missing cost_debt_schedule row "other_long_term_debt_japan"'
    )
  }

  const cost: CostHistoricalData = {
    fy21: {
      cashAndEquivalents: mustVal(
        kg,
        "cost_balance_sheet",
        "cash_and_equivalents",
        "2021-FY",
        costOpts
      ),
      shortTermInvestments: mustVal(
        kg,
        "cost_balance_sheet",
        "short_term_investments",
        "2021-FY",
        costOpts
      ),
      ppeNet: mustVal(kg, "cost_balance_sheet", "ppe_net", "2021-FY", costOpts),
      totalDebtPrincipal: mustVal(
        kg,
        "cost_debt_schedule",
        "total_long_term_debt_principal",
        "2021-FY",
        costOpts
      ),
      unamortizedDiscounts: mustVal(
        kg,
        "cost_debt_schedule",
        "unamortized_discounts_and_issuance_costs",
        "2021-FY",
        costOpts
      ),
      currentPortionDebtBs: mustVal(
        kg,
        "cost_balance_sheet",
        "current_portion_of_long_term_debt",
        "2021-FY",
        costOpts
      ),
      longTermDebtBs: mustVal(
        kg,
        "cost_balance_sheet",
        "long_term_debt",
        "2021-FY",
        costOpts
      ),
      financeLeaseLiabCurrent: mustVal(
        kg,
        "cost_lease_summary",
        "finance_lease_liabilities_current",
        "2021-FY",
        costOpts
      ),
      financeLeaseLiabLt: mustVal(
        kg,
        "cost_lease_summary",
        "finance_lease_liabilities_lt",
        "2021-FY",
        costOpts
      ),
      operatingLeaseLiabCurrent: mustVal(
        kg,
        "cost_lease_summary",
        "operating_lease_liabilities_current",
        "2021-FY",
        costOpts
      ),
      operatingLeaseLiabLt: mustVal(
        kg,
        "cost_lease_summary",
        "operating_lease_liabilities_lt",
        "2021-FY",
        costOpts
      ),
      warehousesTotal: mustVal(
        kg,
        "cost_warehouse_kpis",
        "warehouses_total",
        "2021-FY",
        costRawOpts
      ),
      paidMembersMillions:
        mustVal(
          kg,
          "cost_membership_kpis",
          "paid_members",
          "2021-FY",
          costRawOpts
        ) / DISPLAY_SCALE_MILLIONS,
      endingSharesMillions: mustVal(
        kg,
        "cost_eps_shares",
        "ending_shares_outstanding",
        "2021-FY",
        costOpts
      ),
    },
    incomeStatement: {
      netSales: costSeries(kg, "cost_income_statement", "net_sales"),
      membershipFees: costSeries(
        kg,
        "cost_income_statement",
        "membership_fees"
      ),
      totalRevenue: costSeries(kg, "cost_income_statement", "total_revenue"),
      merchandiseCosts: costSeries(
        kg,
        "cost_income_statement",
        "merchandise_costs"
      ),
      sga: costSeries(kg, "cost_income_statement", "sga"),
      operatingIncome: costSeries(
        kg,
        "cost_income_statement",
        "operating_income"
      ),
      interestExpense: costSeries(
        kg,
        "cost_income_statement",
        "interest_expense"
      ),
      interestIncome: costSeries(
        kg,
        "cost_income_statement",
        "memo_interest_income"
      ),
      fxGainsNet: costSeries(
        kg,
        "cost_income_statement",
        "memo_fx_transaction_gains_net"
      ),
      otherNonOpNet: costSeries(
        kg,
        "cost_income_statement",
        "memo_other_non_operating_net"
      ),
      interestIncomeAndOtherNet: costSeries(
        kg,
        "cost_income_statement",
        "interest_income_and_other_net"
      ),
      ebt: costSeries(kg, "cost_income_statement", "ebt"),
      taxProvision: costSeries(kg, "cost_income_statement", "tax_provision"),
      netIncomeInclNci: costSeries(kg, "cost_cash_flow", "net_income_incl_nci"),
      netIncomeAttrNci: costSeries(
        kg,
        "cost_income_statement",
        "net_income_attr_nci",
        { defaultZero: true }
      ),
      netIncomeAttrCostco: costSeries(
        kg,
        "cost_income_statement",
        "net_income_attr_costco"
      ),
    },
    balanceSheet: {
      cashAndEquivalents: costSeries(
        kg,
        "cost_balance_sheet",
        "cash_and_equivalents"
      ),
      shortTermInvestments: costSeries(
        kg,
        "cost_balance_sheet",
        "short_term_investments"
      ),
      receivablesNet: costSeries(kg, "cost_balance_sheet", "receivables_net"),
      merchandiseInventories: costSeries(
        kg,
        "cost_balance_sheet",
        "merchandise_inventories"
      ),
      otherCurrentAssets: costSeries(
        kg,
        "cost_balance_sheet",
        "other_current_assets"
      ),
      totalCurrentAssets: costSeries(
        kg,
        "cost_balance_sheet",
        "total_current_assets"
      ),
      ppeNet: costSeries(kg, "cost_balance_sheet", "ppe_net"),
      operatingLeaseRouAssets: costSeries(
        kg,
        "cost_balance_sheet",
        "operating_lease_rou_assets"
      ),
      otherLongTermAssets: costSeries(
        kg,
        "cost_balance_sheet",
        "other_long_term_assets"
      ),
      totalAssets: costSeries(kg, "cost_balance_sheet", "total_assets"),
      accountsPayable: costSeries(kg, "cost_balance_sheet", "accounts_payable"),
      accruedSalariesAndBenefits: costSeries(
        kg,
        "cost_balance_sheet",
        "accrued_salaries_and_benefits"
      ),
      accruedMemberRewards: costSeries(
        kg,
        "cost_balance_sheet",
        "accrued_member_rewards"
      ),
      deferredMembershipFees: costSeries(
        kg,
        "cost_balance_sheet",
        "deferred_membership_fees"
      ),
      currentPortionDebtBs: costSeries(
        kg,
        "cost_balance_sheet",
        "current_portion_of_long_term_debt",
        { defaultZero: true }
      ),
      otherCurrentLiabilities: costSeries(
        kg,
        "cost_balance_sheet",
        "other_current_liabilities"
      ),
      totalCurrentLiabilities: costSeries(
        kg,
        "cost_balance_sheet",
        "total_current_liabilities"
      ),
      longTermDebt: costSeries(kg, "cost_balance_sheet", "long_term_debt"),
      longTermOperatingLeaseLiabilities: costSeries(
        kg,
        "cost_balance_sheet",
        "long_term_operating_lease_liabilities"
      ),
      otherLongTermLiabilities: costSeries(
        kg,
        "cost_balance_sheet",
        "other_long_term_liabilities"
      ),
      totalLiabilities: costSeries(
        kg,
        "cost_balance_sheet",
        "total_liabilities"
      ),
      commonStock: costSeries(kg, "cost_balance_sheet", "common_stock"),
      additionalPaidInCapital: costSeries(
        kg,
        "cost_balance_sheet",
        "additional_paid_in_capital"
      ),
      aoci: costSeries(kg, "cost_balance_sheet", "aoci"),
      retainedEarnings: costSeries(
        kg,
        "cost_balance_sheet",
        "retained_earnings"
      ),
      noncontrollingInterests: costSeries(
        kg,
        "cost_balance_sheet",
        "noncontrolling_interests",
        { defaultZero: true }
      ),
      totalEquity: costSeries(kg, "cost_balance_sheet", "total_equity"),
      totalLiabilitiesAndEquity: costSeries(
        kg,
        "cost_balance_sheet",
        "total_liabilities_and_equity"
      ),
    },
    cashFlow: {
      netIncomeInclNci: costSeries(kg, "cost_cash_flow", "net_income_incl_nci"),
      depreciationAndAmortization: costSeries(
        kg,
        "cost_cash_flow",
        "depreciation_and_amortization"
      ),
      nonCashLeaseExpense: costSeries(
        kg,
        "cost_cash_flow",
        "non_cash_lease_expense"
      ),
      stockBasedCompensation: costSeries(
        kg,
        "cost_cash_flow",
        "stock_based_compensation"
      ),
      deferredIncomeTaxes: costSeries(
        kg,
        "cost_cash_flow",
        "deferred_income_taxes",
        { defaultZero: true }
      ),
      otherNonCashOperating: costSeries(
        kg,
        "cost_cash_flow",
        "other_non_cash_operating_activities"
      ),
      changeInventories: costSeries(
        kg,
        "cost_cash_flow",
        "change_in_merchandise_inventories"
      ),
      changeAccountsPayable: costSeries(
        kg,
        "cost_cash_flow",
        "change_in_accounts_payable"
      ),
      changeOtherOpAssetsLiab: costSeries(
        kg,
        "cost_cash_flow",
        "change_in_other_operating_assets_liabilities"
      ),
      cfo: costSeries(kg, "cost_cash_flow", "cfo"),
      capex: costSeries(kg, "cost_cash_flow", "capex"),
      purchasesSti: costSeries(
        kg,
        "cost_cash_flow",
        "purchases_of_short_term_investments"
      ),
      maturitiesSti: costSeries(
        kg,
        "cost_cash_flow",
        "maturities_of_short_term_investments"
      ),
      otherInvesting: costSeries(
        kg,
        "cost_cash_flow",
        "other_investing_activities"
      ),
      cfi: costSeries(kg, "cost_cash_flow", "cfi"),
      repaymentsStBorrowings: costSeries(
        kg,
        "cost_cash_flow",
        "repayments_of_short_term_borrowings"
      ),
      proceedsStBorrowings: costSeries(
        kg,
        "cost_cash_flow",
        "proceeds_from_short_term_borrowings"
      ),
      repaymentsLtDebt: costSeries(
        kg,
        "cost_cash_flow",
        "repayments_of_long_term_debt"
      ),
      proceedsLtDebt: costSeries(
        kg,
        "cost_cash_flow",
        "proceeds_from_long_term_debt",
        { defaultZero: true }
      ),
      taxWithholdingsSbc: costSeries(
        kg,
        "cost_cash_flow",
        "tax_withholdings_on_sbc"
      ),
      repurchasesCommonStock: costSeries(
        kg,
        "cost_cash_flow",
        "repurchases_of_common_stock"
      ),
      cashDividendPayments: costSeries(
        kg,
        "cost_cash_flow",
        "cash_dividend_payments"
      ),
      financingLeaseAndOther: costSeries(
        kg,
        "cost_cash_flow",
        "financing_lease_payments_and_other"
      ),
      dividendToNci: costSeries(kg, "cost_cash_flow", "dividend_to_nci", {
        defaultZero: true,
      }),
      acquisitionOfNci: costSeries(kg, "cost_cash_flow", "acquisition_of_nci", {
        defaultZero: true,
      }),
      cff: costSeries(kg, "cost_cash_flow", "cff"),
      fxEffectOnCash: costSeries(kg, "cost_cash_flow", "fx_effect_on_cash"),
      netChangeInCash: costSeries(kg, "cost_cash_flow", "net_change_in_cash"),
      cashBeginning: costSeries(kg, "cost_cash_flow", "cash_beginning"),
      cashEnding: costSeries(kg, "cost_cash_flow", "cash_ending"),
    },
    debtLeases: {
      seniorNotesMay2027: costSeries(
        kg,
        "cost_debt_schedule",
        "senior_notes_3000_due_may_2027"
      ),
      seniorNotesJun2027: costSeries(
        kg,
        "cost_debt_schedule",
        "senior_notes_1375_due_jun_2027"
      ),
      seniorNotesApr2030: costSeries(
        kg,
        "cost_debt_schedule",
        "senior_notes_1600_due_apr_2030"
      ),
      seniorNotesApr2032: costSeries(
        kg,
        "cost_debt_schedule",
        "senior_notes_1750_due_apr_2032"
      ),
      seniorNotesMay2024: costSeries(
        kg,
        "cost_debt_schedule",
        "senior_notes_2750_due_may_2024",
        { defaultZero: true }
      ),
      seniorNotesMay2022: costSeries(
        kg,
        "cost_debt_schedule",
        "senior_notes_2300_due_may_2022",
        { defaultZero: true }
      ),
      otherLtDebtJapan: costSeries(
        kg,
        "cost_debt_schedule",
        "other_long_term_debt_japan"
      ),
      totalLtDebtPrincipal: costSeries(
        kg,
        "cost_debt_schedule",
        "total_long_term_debt_principal"
      ),
      unamortizedDiscounts: costSeries(
        kg,
        "cost_debt_schedule",
        "unamortized_discounts_and_issuance_costs"
      ),
      currentPortionDebtSched: costSeries(
        kg,
        "cost_debt_schedule",
        "current_portion_of_long_term_debt"
      ),
      longTermDebtExclCurrent: costSeries(
        kg,
        "cost_debt_schedule",
        "long_term_debt_excl_current"
      ),
      shortTermBorrowings: costSeries(
        kg,
        "cost_debt_schedule",
        "short_term_borrowings_outstanding",
        { defaultZero: true }
      ),
      creditFacilityCapacity: costSeries(
        kg,
        "cost_debt_schedule",
        "short_term_credit_facility_capacity",
        { defaultZero: true }
      ),
      currentOpLeaseLiab: costSeries(
        kg,
        "cost_lease_summary",
        "operating_lease_liabilities_current"
      ),
      ltOpLeaseLiab: costSeries(
        kg,
        "cost_lease_summary",
        "operating_lease_liabilities_lt"
      ),
      currentFinLeaseLiab: costSeries(
        kg,
        "cost_lease_summary",
        "finance_lease_liabilities_current"
      ),
      ltFinLeaseLiab: costSeries(
        kg,
        "cost_lease_summary",
        "finance_lease_liabilities_lt"
      ),
      financeLeaseRouAssets: costSeries(
        kg,
        "cost_lease_summary",
        "finance_lease_rou_assets"
      ),
      financeLeaseInterest: costSeries(
        kg,
        "cost_lease_summary",
        "finance_lease_interest"
      ),
      operatingLeaseCost: costSeries(
        kg,
        "cost_lease_summary",
        "operating_lease_cost"
      ),
      maturities2027: mustVal(
        kg,
        "cost_debt_maturities",
        "yr_1_2027",
        "2026-FY",
        costOpts
      ),
      maturities2028:
        optVal(kg, "cost_debt_maturities", "yr_2_2028", "2026-FY", costOpts) ??
        0,
      maturities2029: mustVal(
        kg,
        "cost_debt_maturities",
        "yr_3_2029",
        "2026-FY",
        costOpts
      ),
      maturities2030: mustVal(
        kg,
        "cost_debt_maturities",
        "yr_4_2030",
        "2026-FY",
        costOpts
      ),
      maturities2031: mustVal(
        kg,
        "cost_debt_maturities",
        "yr_5_2031",
        "2026-FY",
        costOpts
      ),
      maturitiesThereafter: mustVal(
        kg,
        "cost_debt_maturities",
        "thereafter",
        "2026-FY",
        costOpts
      ),
      trancheMeta: Object.freeze({
        may2027: parseUsdSeniorNoteMeta(
          debtScheduleRows,
          "senior_notes_3000_due_may_2027"
        ),
        jun2027: parseUsdSeniorNoteMeta(
          debtScheduleRows,
          "senior_notes_1375_due_jun_2027"
        ),
        apr2030: parseUsdSeniorNoteMeta(
          debtScheduleRows,
          "senior_notes_1600_due_apr_2030"
        ),
        apr2032: parseUsdSeniorNoteMeta(
          debtScheduleRows,
          "senior_notes_1750_due_apr_2032"
        ),
        japanLabel: japanRow.label,
      }),
    },
    equityAndShares: {
      endingSharesMillions: costSeries(
        kg,
        "cost_eps_shares",
        "ending_shares_outstanding"
      ),
      wavgBasicSharesMillions: costSeries(
        kg,
        "cost_eps_shares",
        "wavg_basic_shares"
      ),
      dilutiveRsusMillions: costSeries(kg, "cost_eps_shares", "dilutive_rsus"),
      wavgDilutedSharesMillions: costSeries(
        kg,
        "cost_eps_shares",
        "wavg_diluted_shares"
      ),
      dilutedEps: costSeries(kg, "cost_eps_shares", "diluted_eps"),
      sharesRepurchasedMillions: costSeries(
        kg,
        "cost_eps_shares",
        "shares_repurchased"
      ),
      repurchaseAvgPrice: costSeries(
        kg,
        "cost_eps_shares",
        "repurchase_avg_price"
      ),
      repurchaseTotalCost: costSeries(
        kg,
        "cost_eps_shares",
        "repurchase_total_cost"
      ),
      rsuVestedDeliveredMillions: costSeries(
        kg,
        "cost_equity_rollforward",
        "rsu_release_and_tax",
        { dimension: "common_shares" }
      ),
      cashDividendsDeclared: costSeries(
        kg,
        "cost_equity_rollforward",
        "cash_dividends_declared",
        { dimension: "total_equity" }
      ),
      sbcTaxBenefit: costSeries(kg, "cost_sbc_rsu", "sbc_tax_benefit"),
    },
    operatingKpis: {
      warehousesUs: costSeries(kg, "cost_warehouse_kpis", "warehouses_us"),
      warehousesCanada: costSeries(
        kg,
        "cost_warehouse_kpis",
        "warehouses_canada"
      ),
      warehousesOtherIntl: costSeries(
        kg,
        "cost_warehouse_kpis",
        "warehouses_other_intl"
      ),
      warehousesTotal: costSeries(
        kg,
        "cost_warehouse_kpis",
        "warehouses_total"
      ),
      warehousesOwned: costSeries(
        kg,
        "cost_warehouse_kpis",
        "warehouses_owned"
      ),
      warehousesLeased: costSeries(
        kg,
        "cost_warehouse_kpis",
        "warehouses_leased"
      ),
      netNewWarehouses: costSeries(
        kg,
        "cost_warehouse_kpis",
        "net_new_warehouses"
      ),
      warehouseSqftUsMillions: costSeries(
        kg,
        "cost_warehouse_kpis",
        "warehouse_sqft_us",
        { scaleCount: DISPLAY_SCALE_MILLIONS }
      ),
      warehouseSqftTotalMillions: costSeries(
        kg,
        "cost_warehouse_kpis",
        "warehouse_sqft_total",
        { scaleCount: DISPLAY_SCALE_MILLIONS }
      ),
      paidMembersMillions: costSeries(
        kg,
        "cost_membership_kpis",
        "paid_members",
        {
          scaleCount: DISPLAY_SCALE_MILLIONS,
        }
      ),
      totalCardholdersMillions: costSeries(
        kg,
        "cost_membership_kpis",
        "total_cardholders",
        { scaleCount: DISPLAY_SCALE_MILLIONS }
      ),
      executiveMembersMillions: costSeries(
        kg,
        "cost_membership_kpis",
        "executive_members",
        { scaleCount: DISPLAY_SCALE_MILLIONS }
      ),
      renewalRateUsCa: costSeries(
        kg,
        "cost_membership_kpis",
        "renewal_rate_us_ca"
      ),
      renewalRateWw: costSeries(
        kg,
        "cost_membership_kpis",
        "renewal_rate_worldwide"
      ),
      compExGasFxUs: costSeries(
        kg,
        "cost_comp_sales",
        "comp_sales_ex_gas_fx_us"
      ),
      compExGasFxCanada: costSeries(
        kg,
        "cost_comp_sales",
        "comp_sales_ex_gas_fx_canada"
      ),
      compExGasFxOtherIntl: costSeries(
        kg,
        "cost_comp_sales",
        "comp_sales_ex_gas_fx_other_intl"
      ),
      compExGasFxTotal: costSeries(
        kg,
        "cost_comp_sales",
        "comp_sales_ex_gas_fx_total"
      ),
      compReportedTotal: costSeries(
        kg,
        "cost_comp_sales",
        "comp_sales_reported_total"
      ),
      gasolinePctNetSales: costSeries(
        kg,
        "cost_comp_sales",
        "gasoline_pct_of_net_sales"
      ),
      segmentsRevenue: {
        us: costSeries(kg, "cost_segments", "total_revenue", {
          dimension: "us",
        }),
        canada: costSeries(kg, "cost_segments", "total_revenue", {
          dimension: "canada",
        }),
        otherIntl: costSeries(kg, "cost_segments", "total_revenue", {
          dimension: "other_intl",
        }),
        total: costSeries(kg, "cost_segments", "total_revenue", {
          dimension: "total",
        }),
      },
      merchFoodsSundries: costSeries(
        kg,
        "cost_merch_mix",
        "foods_and_sundries"
      ),
      merchNonFoods: costSeries(kg, "cost_merch_mix", "non_foods"),
      merchFreshFoods: costSeries(kg, "cost_merch_mix", "fresh_foods"),
      merchAncillary: costSeries(
        kg,
        "cost_merch_mix",
        "warehouse_ancillary_and_other"
      ),
    },
    qoe: {
      fy26IeepaMerchOffset: mustVal(
        kg,
        "cost_qoe_items",
        "ieepa_refund_merchandise_cost_offset",
        "2026-FY",
        costOpts
      ),
      fy26IeepaInterestIncome: mustVal(
        kg,
        "cost_qoe_items",
        "ieepa_refund_interest_income",
        "2026-FY",
        costOpts
      ),
      fy26IeepaReinvestedEst: mustVal(
        kg,
        "cost_fy27_guidance",
        "ieepa_reinvested_est",
        "2026-Q4",
        costOpts
      ),
      fy26IeepaEpsBenefit: mustVal(
        kg,
        "cost_qoe_items",
        "ieepa_q4_diluted_eps_benefit",
        "2026-Q4",
        costOpts
      ),
      fy26LifoCharge: mustVal(
        kg,
        "cost_qoe_items",
        "lifo_charge_merchandise_costs",
        "2026-FY",
        costOpts
      ),
      fy23CharterShippingImpairment: mustVal(
        kg,
        "cost_qoe_items",
        "charter_shipping_rou_impairment",
        "2023-FY",
        costOpts
      ),
      fy24SpecialDivTotal: mustVal(
        kg,
        "cost_qoe_items",
        "special_cash_dividend_total",
        "2024-FY",
        costOpts
      ),
      fy24SpecialDivPs: mustVal(
        kg,
        "cost_qoe_items",
        "special_cash_dividend_per_share",
        "2024-FY",
        costOpts
      ),
      fy27GuidedGrossOpenings: mustVal(
        kg,
        "cost_fy27_guidance",
        "gross_openings",
        "2027-FY",
        costRawOpts
      ),
      fy27GuidedRelocations: mustVal(
        kg,
        "cost_fy27_guidance",
        "relocations",
        "2027-FY",
        costRawOpts
      ),
      fy27GuidedNetOpenings: mustVal(
        kg,
        "cost_fy27_guidance",
        "net_openings",
        "2027-FY",
        costRawOpts
      ),
      fy27GuidedCapex: mustVal(
        kg,
        "cost_fy27_guidance",
        "capex",
        "2027-FY",
        costOpts
      ),
      ltNetOpeningsTarget: mustVal(
        kg,
        "cost_fy27_guidance",
        "lt_net_openings_target",
        "2027-FY",
        costRawOpts
      ),
      nov2026SpecialDivPs: mustVal(
        kg,
        "cost_capital_return_events",
        "special_cash_dividend_per_share",
        "2026-11-10",
        costOpts
      ),
      nov2026SpecialDivTotal: mustVal(
        kg,
        "cost_capital_return_events",
        "special_cash_dividend_aggregate_payout",
        "2026-11-10",
        costOpts
      ),
      oct2026QuarterlyDivPs: mustVal(
        kg,
        "cost_capital_return_events",
        "quarterly_cash_dividend_per_share",
        "2026-10-14",
        costOpts
      ),
      nov2026BuybackReauth: mustVal(
        kg,
        "cost_capital_return_events",
        "buyback_reauthorization_amount",
        "2026-11-10",
        costOpts
      ),
      oct2026MonthlyCompExGasFx: mustVal(
        kg,
        "cost_monthly_sales_comps",
        "comp_total_ex_gas_fx",
        "2026-11-01",
        costRawOpts
      ),
      sep2026MonthlyCompExGasFx: mustVal(
        kg,
        "cost_monthly_sales_comps",
        "comp_total_ex_gas_fx",
        "2026-10-04",
        costRawOpts
      ),
      oct2026GasPriceYoySep: mustVal(
        kg,
        "cost_monthly_sales_comps",
        "gas_price_yoy",
        "2026-10-04",
        costRawOpts
      ),
      costEntryFee: mustVal(
        kg,
        "cost_fy27_guidance",
        "entry_tier_fee",
        "2026-11-16",
        costRawOpts
      ),
      costPremiumFee: mustVal(
        kg,
        "cost_fy27_guidance",
        "premium_tier_fee",
        "2026-11-16",
        costRawOpts
      ),
    },
  }

  const tickers: readonly AllCompTicker[] = [
    "COST",
    "BJ",
    "PSMT",
    "WMT",
    "TGT",
    "KR",
  ]
  const quotes: Partial<Record<AllCompTicker, EquityQuoteSnapshot>> = {}
  const consensus: Partial<Record<AllCompTicker, ConsensusSnapshot>> = {}

  for (const t of tickers) {
    const qOpts = { entity: t, divisors: KG_DIVISORS } as const
    quotes[t] = {
      closePrice: mustVal(
        kg,
        "mkt_equity_quotes",
        "close_price",
        "2026-11-13",
        qOpts
      ),
      secSharesMillions: mustVal(
        kg,
        "mkt_equity_quotes",
        "sec_shares_outstanding",
        "2026-11-13",
        qOpts
      ),
      marketCapSec: mustVal(
        kg,
        "mkt_equity_quotes",
        "market_cap_sec_shares",
        "2026-11-13",
        qOpts
      ),
      mrqCashAndSti: mustVal(
        kg,
        "mkt_equity_quotes",
        "mrq_cash_and_st_investments",
        "2026-11-13",
        qOpts
      ),
      mrqTotalDebtInclLeases: mustVal(
        kg,
        "mkt_equity_quotes",
        "mrq_total_debt_incl_leases",
        "2026-11-13",
        qOpts
      ),
      mrqNetCash: mustVal(
        kg,
        "mkt_equity_quotes",
        "mrq_net_cash",
        "2026-11-13",
        qOpts
      ),
      evSecMrq: mustVal(
        kg,
        "mkt_equity_quotes",
        "ev_sec_shares_mrq_bs",
        "2026-11-13",
        qOpts
      ),
      beta5yMonthly: mustVal(
        kg,
        "mkt_equity_quotes",
        "beta_5y_monthly",
        "2026-11-13",
        qOpts
      ),
      regularAnnualDps:
        optVal(
          kg,
          "mkt_equity_quotes",
          "regular_annual_dps",
          "2026-11-13",
          qOpts
        ) ?? 0,
      specialDividendPs:
        optVal(
          kg,
          "mkt_equity_quotes",
          "special_dividend_ps",
          "2026-11-13",
          qOpts
        ) ?? 0,
      peLtm: mustVal(kg, "mkt_equity_quotes", "pe_ltm", "2026-11-13", qOpts),
      evToLtmSales: mustVal(
        kg,
        "mkt_equity_quotes",
        "ev_to_ltm_sales",
        "2026-11-13",
        qOpts
      ),
      evToLtmEbitda: mustVal(
        kg,
        "mkt_equity_quotes",
        "ev_to_ltm_ebitda",
        "2026-11-13",
        qOpts
      ),
      evToLtmEbit: mustVal(
        kg,
        "mkt_equity_quotes",
        "ev_to_ltm_ebit",
        "2026-11-13",
        qOpts
      ),
      pToLtmFcf: mustVal(
        kg,
        "mkt_equity_quotes",
        "p_to_ltm_fcf",
        "2026-11-13",
        qOpts
      ),
    }

    consensus[t] = {
      rev27: mustVal(
        kg,
        "mkt_consensus_estimates",
        "revenue",
        "2027-FY",
        qOpts
      ),
      ebitda27: mustVal(
        kg,
        "mkt_consensus_estimates",
        "ebitda",
        "2027-FY",
        qOpts
      ),
      ebit27: mustVal(kg, "mkt_consensus_estimates", "ebit", "2027-FY", qOpts),
      netProfit27: mustVal(
        kg,
        "mkt_consensus_estimates",
        "net_profit",
        "2027-FY",
        qOpts
      ),
      epsHeadline27: mustVal(
        kg,
        "mkt_consensus_estimates",
        "eps_headline",
        "2027-FY",
        qOpts
      ),
      saFcf27: optVal(
        kg,
        "mkt_consensus_estimates",
        "sa_fcf",
        "2027-FY",
        qOpts
      ),
      rev28: mustVal(
        kg,
        "mkt_consensus_estimates",
        "revenue",
        "2028-FY",
        qOpts
      ),
      ebitda28: mustVal(
        kg,
        "mkt_consensus_estimates",
        "ebitda",
        "2028-FY",
        qOpts
      ),
      ebit28: mustVal(kg, "mkt_consensus_estimates", "ebit", "2028-FY", qOpts),
      netProfit28: mustVal(
        kg,
        "mkt_consensus_estimates",
        "net_profit",
        "2028-FY",
        qOpts
      ),
      epsHeadline28: mustVal(
        kg,
        "mkt_consensus_estimates",
        "eps_headline",
        "2028-FY",
        qOpts
      ),
      ptLow: mustVal(kg, "mkt_price_targets", "pt_low", "2026-11-13", qOpts),
      ptAverage: mustVal(
        kg,
        "mkt_price_targets",
        "pt_average",
        "2026-11-13",
        qOpts
      ),
      ptMedian: mustVal(
        kg,
        "mkt_price_targets",
        "pt_median",
        "2026-11-13",
        qOpts
      ),
      ptHigh: mustVal(kg, "mkt_price_targets", "pt_high", "2026-11-13", qOpts),
      analystCount27: mustVal(
        kg,
        "mkt_consensus_estimates",
        "sa_analyst_count",
        "2027-FY",
        { entity: t }
      ),
    }
  }

  const psmtOpts = { entity: "PSMT", divisors: KG_DIVISORS } as const
  const samsOpts = { entity: "WMT_SAMS", divisors: KG_DIVISORS } as const
  const samsRawOpts = { entity: "WMT_SAMS" } as const
  const bjRawOpts = { entity: "BJ" } as const
  const psmtRawOpts = { entity: "PSMT" } as const

  const peers: PeerRawData = Object.freeze({
    meta: Object.freeze({
      COST: Object.freeze({
        ticker: "COST",
        name: "Costco Wholesale",
        peerGroup: "Target",
        fiscalWindowLabel: "FY26 (52W end 2026-08-30)",
        qoeNote:
          "Excludes Q4 FY26 net IEEPA tariff refund benefit (-$74M operating pretax / -$0.15/sh after pricing reinvestment); SBC retained as expense.",
      }),
      BJ: Object.freeze({
        ticker: "BJ",
        name: "BJ's Wholesale Club",
        peerGroup: "Pure-Play Club",
        fiscalWindowLabel: "LTM Q2 FY27 (end 2026-08-01)",
        qoeNote:
          "Deducts -$10.6M H1 FY27 Ohio DC sale-leaseback gain in SG&A (taxed at LTM ETR) + adds $1.5M restructuring; Debt/EV includes FY26 10-K $50M finance lease + $117.3M SLB financing obligations.",
      }),
      PSMT: Object.freeze({
        ticker: "PSMT",
        name: "PriceSmart",
        peerGroup: "Pure-Play Club",
        fiscalWindowLabel: "FY26 (12M end 2026-08-31)",
        qoeNote:
          "Adjusts $3.8M asset disposal loss / -$0.6M JV gain (taxed at FY26 ETR); excludes non-operating $29.7M FX reval/conversion cost from EBITDA (kept below EBIT).",
      }),
      WMT: Object.freeze({
        ticker: "WMT",
        name: "Walmart",
        peerGroup: "Omni / Mass Retail",
        fiscalWindowLabel: "LTM Q2 FY27 (end 2026-07-31)",
        qoeNote:
          "Deducts -$2,900M H1 FY27 IEEPA tariff refunds, adds +$700M FY26 PhonePe SBC mod. (0% tax shield per FY26 10-K MD&A p. 39), removes equity investment swings & -$500M tax-interest / -$400M direct tax uncertain-tax benefits (H1 FY26 $400M legal charge already rolled off LTM); BS cash excludes restricted cash.",
      }),
      TGT: Object.freeze({
        ticker: "TGT",
        name: "Target",
        peerGroup: "Omni / Mass Retail",
        fiscalWindowLabel: "LTM Q2 FY27 (end 2026-08-01)",
        qoeNote:
          "Deducts -$994M H1 FY27 IEEPA tariff refunds (-$1.65/sh) and adds +$250M transformation charges (H1 FY26 -$593M interchange settlement already rolled off LTM).",
      }),
      KR: Object.freeze({
        ticker: "KR",
        name: "Kroger",
        peerGroup: "Omni / Mass Retail",
        fiscalWindowLabel: "LTM Q2 FY27 (end 2026-08-15)",
        qoeNote:
          "Adds back $2,497M FY26 Ocado fulfillment impairment & Albertsons merger litigation/severance costs ($2,686M LTM operating QoE); non-meaningful reported P/E & EV/EBIT excluded from peer summary averages.",
      }),
    }),
    bj: Object.freeze({
      netSales: janPeerTriplet(kg, "peer_income_statement", "net_sales", "BJ"),
      mfiAndOther: janPeerTriplet(
        kg,
        "peer_income_statement",
        "membership_and_other_income",
        "BJ"
      ),
      rev: janPeerTriplet(kg, "peer_income_statement", "total_revenue", "BJ"),
      costOfSales: janPeerTriplet(
        kg,
        "peer_income_statement",
        "cost_of_sales",
        "BJ"
      ),
      sga: janPeerTriplet(kg, "peer_income_statement", "sga", "BJ"),
      preOpening: janPeerTriplet(
        kg,
        "peer_income_statement",
        "pre_opening_expenses",
        "BJ"
      ),
      ebit: janPeerTriplet(
        kg,
        "peer_income_statement",
        "operating_income",
        "BJ"
      ),
      ebt: janPeerTriplet(kg, "peer_income_statement", "ebt", "BJ"),
      tax: janPeerTriplet(
        kg,
        "peer_income_statement",
        "income_tax_expense",
        "BJ"
      ),
      ni: janPeerTriplet(kg, "peer_income_statement", "net_income", "BJ"),
      da: janPeerTriplet(kg, "peer_cash_flow", "da_total", "BJ"),
      cfo: janPeerTriplet(kg, "peer_cash_flow", "operating_cf", "BJ"),
      capex: janPeerTriplet(kg, "peer_cash_flow", "capex", "BJ"),
      qoeRestruct: janPeerTripletOpt(
        kg,
        "peer_qoe_items",
        "restructuring_charges",
        "BJ",
        "qoe"
      ),
      qoeTaxMgmt: janPeerTripletOpt(
        kg,
        "peer_qoe_items",
        "qoe_tax_impact_mgmt",
        "BJ",
        "qoe"
      ),
      qoeSlbGainH127: mustVal(
        kg,
        "peer_qoe_items",
        "sale_leaseback_gain_sga",
        "2027-H1",
        { entity: "BJ", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      cashH127: mustVal(
        kg,
        "peer_balance_sheet",
        "cash_and_equivalents",
        "2027-H1",
        { entity: "BJ", divisors: KG_DIVISORS }
      ),
      carryingFinancialDebtH127: mustVal(
        kg,
        "peer_debt_leases",
        "carrying_financial_debt",
        "2027-H1",
        { entity: "BJ", divisors: KG_DIVISORS }
      ),
      operatingLeaseLiabH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_operating_lease_liabilities",
        "2027-H1",
        { entity: "BJ", divisors: KG_DIVISORS }
      ),
      financeLeaseLiabFy26: mustVal(
        kg,
        "peer_debt_leases",
        "total_finance_lease_liabilities",
        "2026-FY",
        { entity: "BJ", divisors: KG_DIVISORS }
      ),
      ltFinancingObligationsFy26: mustVal(
        kg,
        "peer_debt_leases",
        "lt_financing_obligations",
        "2026-FY",
        { entity: "BJ", divisors: KG_DIVISORS }
      ),
    }),
    psmt: Object.freeze({
      netSalesFy26: mustVal(
        kg,
        "peer_income_statement",
        "net_sales",
        "2026-FY",
        psmtOpts
      ),
      mfiAndOtherFy26: mustVal(
        kg,
        "peer_income_statement",
        "membership_and_other_income",
        "2026-FY",
        psmtOpts
      ),
      revFy26: mustVal(
        kg,
        "peer_income_statement",
        "total_revenue",
        "2026-FY",
        psmtOpts
      ),
      costOfSalesFy26: mustVal(
        kg,
        "peer_income_statement",
        "cost_of_sales",
        "2026-FY",
        psmtOpts
      ),
      sgaFy26: mustVal(kg, "peer_income_statement", "sga", "2026-FY", psmtOpts),
      preOpeningFy26: mustVal(
        kg,
        "peer_income_statement",
        "pre_opening_expenses",
        "2026-FY",
        psmtOpts
      ),
      lossDisposalIsFy26: mustVal(
        kg,
        "peer_income_statement",
        "loss_on_disposal_of_assets",
        "2026-FY",
        psmtOpts
      ),
      ebitFy26: mustVal(
        kg,
        "peer_income_statement",
        "operating_income",
        "2026-FY",
        psmtOpts
      ),
      ebtFy26: mustVal(kg, "peer_income_statement", "ebt", "2026-FY", psmtOpts),
      taxFy26: mustVal(
        kg,
        "peer_income_statement",
        "income_tax_expense",
        "2026-FY",
        psmtOpts
      ),
      niFy26: mustVal(
        kg,
        "peer_income_statement",
        "net_income",
        "2026-FY",
        psmtOpts
      ),
      daFy26: mustVal(kg, "peer_cash_flow", "da_total", "2026-FY", psmtOpts),
      cfoFy26: mustVal(
        kg,
        "peer_cash_flow",
        "operating_cf",
        "2026-FY",
        psmtOpts
      ),
      capexFy26: mustVal(kg, "peer_cash_flow", "capex", "2026-FY", psmtOpts),
      qoeLossDisposalFy26: mustVal(
        kg,
        "peer_qoe_items",
        "loss_on_disposal_of_assets",
        "2026-FY",
        { ...psmtOpts, basis: "qoe" }
      ),
      qoeGainJvFy26: mustVal(
        kg,
        "peer_qoe_items",
        "gain_on_sale_of_joint_venture",
        "2026-FY",
        { ...psmtOpts, basis: "qoe" }
      ),
      cashFy26: mustVal(
        kg,
        "peer_balance_sheet",
        "cash_and_equivalents",
        "2026-FY",
        psmtOpts
      ),
      stiFy26: mustVal(
        kg,
        "peer_balance_sheet",
        "short_term_investments",
        "2026-FY",
        psmtOpts
      ),
      carryingFinancialDebtFy26: mustVal(
        kg,
        "peer_debt_leases",
        "carrying_financial_debt",
        "2026-FY",
        psmtOpts
      ),
      totalLeaseLiabFy26: mustVal(
        kg,
        "peer_debt_leases",
        "total_lease_liabilities",
        "2026-FY",
        psmtOpts
      ),
    }),
    wmt: Object.freeze({
      rev: janPeerTriplet(kg, "peer_income_statement", "total_revenues", "WMT"),
      ebit: janPeerTriplet(
        kg,
        "peer_income_statement",
        "operating_income",
        "WMT"
      ),
      ebt: janPeerTriplet(kg, "peer_income_statement", "pretax_income", "WMT"),
      tax: janPeerTriplet(kg, "peer_income_statement", "tax_provision", "WMT"),
      ni: janPeerTriplet(
        kg,
        "peer_income_statement",
        "net_income_attr_parent",
        "WMT"
      ),
      da: janPeerTriplet(
        kg,
        "peer_cash_flow",
        "depreciation_and_amortization",
        "WMT"
      ),
      cfo: janPeerTriplet(kg, "peer_cash_flow", "cfo", "WMT"),
      capex: janPeerTriplet(kg, "peer_cash_flow", "capex", "WMT"),
      qoeOtherGains: janPeerTripletOpt(
        kg,
        "peer_qoe_items",
        "other_gains_losses_pretax_adj",
        "WMT",
        "qoe"
      ),
      qoeTariffRefundH127: mustVal(
        kg,
        "peer_qoe_items",
        "tariff_refunds_pretax",
        "2027-H1",
        { entity: "WMT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      qoePhonePeFy26: mustVal(
        kg,
        "peer_qoe_items",
        "phonepe_sbc_modification_pretax",
        "2026-FY",
        { entity: "WMT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      qoeUncertainTaxIntH127: mustVal(
        kg,
        "peer_qoe_items",
        "uncertain_tax_interest_benefit_pretax",
        "2027-H1",
        { entity: "WMT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      qoeUncertainTaxBenefitH127: mustVal(
        kg,
        "peer_qoe_items",
        "uncertain_tax_benefit_tax",
        "2027-H1",
        { entity: "WMT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      cashH127: mustVal(
        kg,
        "peer_balance_sheet",
        "cash_and_equivalents",
        "2027-H1",
        { entity: "WMT", divisors: KG_DIVISORS }
      ),
      financialDebtExclLeasesH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_financial_debt_excl_leases",
        "2027-H1",
        { entity: "WMT", divisors: KG_DIVISORS }
      ),
      financeLeaseLiabH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_finance_lease_liabilities",
        "2027-H1",
        { entity: "WMT", divisors: KG_DIVISORS }
      ),
      operatingLeaseLiabH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_operating_lease_liabilities",
        "2027-H1",
        { entity: "WMT", divisors: KG_DIVISORS }
      ),
    }),
    tgt: Object.freeze({
      rev: janPeerTriplet(kg, "peer_income_statement", "net_sales", "TGT"),
      ebit: janPeerTriplet(
        kg,
        "peer_income_statement",
        "operating_income",
        "TGT"
      ),
      ni: janPeerTriplet(
        kg,
        "peer_income_statement",
        "net_income_attr_parent",
        "TGT"
      ),
      da: janPeerTriplet(
        kg,
        "peer_cash_flow",
        "depreciation_and_amortization",
        "TGT"
      ),
      cfo: janPeerTriplet(kg, "peer_cash_flow", "cfo", "TGT"),
      capex: janPeerTriplet(kg, "peer_cash_flow", "capex", "TGT"),
      qoeTariffRefundH127: mustVal(
        kg,
        "peer_qoe_items",
        "tariff_refunds_pretax",
        "2027-H1",
        { entity: "TGT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      qoeTransformationFy26: mustVal(
        kg,
        "peer_qoe_items",
        "business_transformation_costs_pretax",
        "2026-FY",
        { entity: "TGT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      qoeTariffEpsMemoH127: mustVal(
        kg,
        "peer_qoe_items",
        "tariff_refunds_eps_memo",
        "2027-H1",
        { entity: "TGT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      qoeTransformationAfterTaxFy26: mustVal(
        kg,
        "peer_qoe_items",
        "business_transformation_costs_after_tax",
        "2026-FY",
        { entity: "TGT", divisors: KG_DIVISORS, basis: "qoe" }
      ),
      wavgDilutedSharesH127: mustVal(
        kg,
        "peer_eps_shares",
        "weighted_avg_diluted_shares",
        "2027-H1",
        { entity: "TGT", divisors: KG_DIVISORS }
      ),
      cashH127: mustVal(
        kg,
        "peer_balance_sheet",
        "cash_and_equivalents",
        "2027-H1",
        { entity: "TGT", divisors: KG_DIVISORS }
      ),
      debtAndFinLeasesBsH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_debt_and_finance_leases_bs",
        "2027-H1",
        { entity: "TGT", divisors: KG_DIVISORS }
      ),
      operatingLeaseLiabH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_operating_lease_liabilities",
        "2027-H1",
        { entity: "TGT", divisors: KG_DIVISORS }
      ),
    }),
    kr: Object.freeze({
      rev: janPeerTriplet(kg, "peer_income_statement", "net_sales", "KR"),
      ebit: janPeerTriplet(
        kg,
        "peer_income_statement",
        "operating_income",
        "KR"
      ),
      ni: janPeerTriplet(
        kg,
        "peer_income_statement",
        "net_income_attr_parent",
        "KR"
      ),
      da: janPeerTriplet(
        kg,
        "peer_cash_flow",
        "depreciation_and_amortization",
        "KR"
      ),
      cfo: janPeerTriplet(kg, "peer_cash_flow", "cfo", "KR"),
      capex: janPeerTriplet(kg, "peer_cash_flow", "capex", "KR"),
      qoeOpAdj: janPeerTriplet(
        kg,
        "peer_qoe_items",
        "total_adjusted_items_op_profit",
        "KR",
        "qoe"
      ),
      qoeNiAdj: janPeerTriplet(
        kg,
        "peer_qoe_items",
        "total_adjusted_items_after_tax",
        "KR",
        "qoe"
      ),
      cashH127: mustVal(
        kg,
        "peer_balance_sheet",
        "cash_and_equivalents",
        "2027-H1",
        { entity: "KR", divisors: KG_DIVISORS }
      ),
      debtAndFinLeasesBsH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_debt_and_finance_leases_bs",
        "2027-H1",
        { entity: "KR", divisors: KG_DIVISORS }
      ),
      operatingLeaseLiabH127: mustVal(
        kg,
        "peer_debt_leases",
        "total_operating_lease_liabilities",
        "2027-H1",
        { entity: "KR", divisors: KG_DIVISORS }
      ),
    }),
  })

  const clubUnitEconRaw: ClubUnitEconRawData = Object.freeze({
    meta: Object.freeze({
      COST_US: Object.freeze({
        entity: "COST_US",
        label: "Costco U.S. Segment",
        periodBasis: "FY26 (52W end 2026-08-30)",
        notes:
          "COST US Segment total revenue includes US MFI (10-K Note 11 omits regional MFI/member sub-split); Total GP incl. MFI = 12.91% vs Consolidated 12.82%.",
      }),
      COST_TOTAL: Object.freeze({
        entity: "COST_TOTAL",
        label: "Costco Consolidated",
        periodBasis: "FY26 (52W end 2026-08-30)",
        notes:
          "Consolidated COST FY26 (US + Canada + Other Intl); US+CA renewal 92.3%, WW 89.8%.",
      }),
      WMT_SAMS_H1_ANN: Object.freeze({
        entity: "WMT_SAMS_H1_ANN",
        label: "Sam's Club U.S. (H1 FY27 Ann.)",
        periodBasis: "H1 FY27 x2 (post-Feb 2026 recast)",
        notes:
          "Annualized 6M H1 FY27 (end 2026-07-31) on post-Feb 2026 corporate overhead recast basis; comp ex-fuel = Q1/Q2 FY27 avg (3.9%/4.4%).",
      }),
      WMT_SAMS_FY26: Object.freeze({
        entity: "WMT_SAMS_FY26",
        label: "Sam's Club U.S. (FY26 Pre-Recast)",
        periodBasis: "FY26 (12M end 2026-01-31, pre-recast)",
        notes:
          "FY26 10-K full-year segment figures prior to Feb 2026 corporate overhead allocation recast.",
      }),
      BJ: Object.freeze({
        entity: "BJ",
        label: "BJ's Wholesale Club",
        periodBasis: "LTM Q2 FY27 (end 2026-08-01)",
        notes:
          "BJ LTM Q2 FY27; paid members 8.5M (Aug 2026 milestone); renewal & tier mix as of FY26.",
      }),
      PSMT: Object.freeze({
        entity: "PSMT",
        label: "PriceSmart",
        periodBasis: "FY26 (12M end 2026-08-31)",
        notes:
          "PSMT FY26 (LatAm/Caribbean clubs; multi-country local fee tiers omitted from US club comparison table; comp = 52W USD merchandise comp).",
      }),
    }),
    costUs: Object.freeze({
      merchCostsFy26: mustVal(
        kg,
        "cost_segments",
        "merchandise_costs",
        "2026-FY",
        { ...costOpts, dimension: "us" }
      ),
      sgaFy26: mustVal(kg, "cost_segments", "sga", "2026-FY", {
        ...costOpts,
        dimension: "us",
      }),
      ebitFy26: mustVal(kg, "cost_segments", "operating_income", "2026-FY", {
        ...costOpts,
        dimension: "us",
      }),
      daFy26: mustVal(
        kg,
        "cost_segments",
        "depreciation_and_amortization",
        "2026-FY",
        { ...costOpts, dimension: "us" }
      ),
      capexFy26: mustVal(kg, "cost_segments", "capex", "2026-FY", {
        ...costOpts,
        dimension: "us",
      }),
    }),
    sams: Object.freeze({
      clubsH127: mustVal(
        kg,
        "sams_club_segment",
        "club_count",
        "2027-H1",
        samsRawOpts
      ),
      sqftMillionsH127:
        mustVal(
          kg,
          "sams_club_segment",
          "retail_sqft",
          "2027-H1",
          samsRawOpts
        ) / DISPLAY_SCALE_MILLIONS,
      netSalesH127: mustVal(
        kg,
        "sams_club_segment",
        "net_sales",
        "2027-H1",
        samsOpts
      ),
      mfiAndOtherH127: mustVal(
        kg,
        "sams_club_segment",
        "membership_and_other_income",
        "2027-H1",
        samsOpts
      ),
      totalRevH127: mustVal(
        kg,
        "sams_club_segment",
        "total_revenues",
        "2027-H1",
        samsOpts
      ),
      merchGpH127: mustVal(
        kg,
        "sams_club_segment",
        "gross_profit",
        "2027-H1",
        samsOpts
      ),
      sgaH127: mustVal(kg, "sams_club_segment", "sga", "2027-H1", samsOpts),
      ebitH127: mustVal(
        kg,
        "sams_club_segment",
        "operating_income",
        "2027-H1",
        samsOpts
      ),
      daH127: mustVal(kg, "sams_club_segment", "da", "2027-H1", samsOpts),
      capexH127: mustVal(kg, "sams_club_segment", "capex", "2027-H1", samsOpts),
      compExFuelQ127: mustVal(
        kg,
        "cost_fy27_guidance",
        "comp_ex_fuel",
        "2027-Q1",
        samsRawOpts
      ),
      compExFuelQ227: mustVal(
        kg,
        "cost_fy27_guidance",
        "comp_ex_fuel",
        "2027-Q2",
        samsRawOpts
      ),
      clubsFy26: mustVal(
        kg,
        "sams_club_segment",
        "club_count",
        "2026-FY",
        samsRawOpts
      ),
      sqftMillionsFy26:
        mustVal(
          kg,
          "sams_club_segment",
          "retail_sqft",
          "2026-FY",
          samsRawOpts
        ) / DISPLAY_SCALE_MILLIONS,
      netSalesFy26: mustVal(
        kg,
        "sams_club_segment",
        "net_sales",
        "2026-FY",
        samsOpts
      ),
      mfiAndOtherFy26: mustVal(
        kg,
        "sams_club_segment",
        "membership_and_other_income",
        "2026-FY",
        samsOpts
      ),
      totalRevFy26: mustVal(
        kg,
        "sams_club_segment",
        "total_revenues",
        "2026-FY",
        samsOpts
      ),
      costOfSalesFy26: mustVal(
        kg,
        "sams_club_segment",
        "cost_of_sales",
        "2026-FY",
        samsOpts
      ),
      merchGpFy26: mustVal(
        kg,
        "sams_club_segment",
        "gross_profit",
        "2026-FY",
        samsOpts
      ),
      sgaFy26: mustVal(kg, "sams_club_segment", "sga", "2026-FY", samsOpts),
      ebitFy26: mustVal(
        kg,
        "sams_club_segment",
        "operating_income",
        "2026-FY",
        samsOpts
      ),
      daFy26: mustVal(kg, "sams_club_segment", "da", "2026-FY", samsOpts),
      capexFy26: mustVal(kg, "sams_club_segment", "capex", "2026-FY", samsOpts),
      compInclFuelFy26: mustVal(
        kg,
        "sams_club_segment",
        "comp_sales_incl_fuel",
        "2026-FY",
        samsRawOpts
      ),
      compFuelImpactFy26: mustVal(
        kg,
        "sams_club_segment",
        "comp_sales_fuel_impact",
        "2026-FY",
        samsRawOpts
      ),
      entryFeeDollars: mustVal(
        kg,
        "cost_fy27_guidance",
        "entry_tier_fee",
        "2026-11-16",
        samsRawOpts
      ),
      premiumFeeDollars: mustVal(
        kg,
        "cost_fy27_guidance",
        "premium_tier_fee",
        "2026-11-16",
        samsRawOpts
      ),
    }),
    bj: Object.freeze({
      clubsH127: mustVal(
        kg,
        "peer_operating_kpis",
        "club_count",
        "2027-H1",
        bjRawOpts
      ),
      paidMembersMillionsH127:
        mustVal(
          kg,
          "peer_operating_kpis",
          "paid_members_accounts",
          "2027-H1",
          bjRawOpts
        ) / DISPLAY_SCALE_MILLIONS,
      compExFuelH127: mustVal(
        kg,
        "peer_operating_kpis",
        "comp_sales_ex_gas",
        "2027-H1",
        bjRawOpts
      ),
      renewalRateFy26: mustVal(
        kg,
        "peer_operating_kpis",
        "membership_renewal_rate",
        "2026-FY",
        bjRawOpts
      ),
      higherTierPenetrationFy26: mustVal(
        kg,
        "peer_operating_kpis",
        "higher_tier_member_penetration",
        "2026-FY",
        bjRawOpts
      ),
      entryFeeDollars: mustVal(
        kg,
        "cost_fy27_guidance",
        "entry_tier_fee",
        "2026-11-16",
        bjRawOpts
      ),
      premiumFeeDollars: mustVal(
        kg,
        "cost_fy27_guidance",
        "premium_tier_fee",
        "2026-11-16",
        bjRawOpts
      ),
    }),
    psmt: Object.freeze({
      clubsFy26: mustVal(
        kg,
        "peer_operating_kpis",
        "club_count",
        "2026-FY",
        psmtRawOpts
      ),
      sqftMillionsFy26:
        mustVal(
          kg,
          "peer_operating_kpis",
          "sales_floor_sqft",
          "2026-FY",
          psmtRawOpts
        ) / DISPLAY_SCALE_MILLIONS,
      paidMembersMillionsFy26:
        mustVal(
          kg,
          "peer_operating_kpis",
          "paid_members_accounts",
          "2026-FY",
          psmtRawOpts
        ) / DISPLAY_SCALE_MILLIONS,
      compTotalFy26: mustVal(
        kg,
        "peer_operating_kpis",
        "comp_sales_total",
        "2026-FY",
        psmtRawOpts
      ),
      renewalRateFy26: mustVal(
        kg,
        "peer_operating_kpis",
        "membership_renewal_rate",
        "2026-FY",
        psmtRawOpts
      ),
      higherTierPenetrationFy26: mustVal(
        kg,
        "peer_operating_kpis",
        "higher_tier_member_penetration",
        "2026-FY",
        psmtRawOpts
      ),
    }),
  })

  const market: MarketMacroData = {
    rfPar10y: mustVal(kg, "mkt_treasury_par_curve", "par_10y", "2026-11-13", {
      entity: "US_TREASURY",
    }),
    rfPar1y: mustVal(kg, "mkt_treasury_par_curve", "par_1y", "2026-11-13", {
      entity: "US_TREASURY",
    }),
    rfPar1m: mustVal(kg, "mkt_treasury_par_curve", "par_1m", "2026-11-13", {
      entity: "US_TREASURY",
    }),
    realTips10y: mustVal(
      kg,
      "mkt_treasury_real_curve",
      "real_10y",
      "2026-11-13",
      { entity: "US_TREASURY" }
    ),
    t10yieBreakeven: mustVal(
      kg,
      "mkt_inflation_fedfunds",
      "t10yie_breakeven",
      "2026-11-13",
      { entity: "US_MACRO" }
    ),
    dffFedFunds: mustVal(
      kg,
      "mkt_inflation_fedfunds",
      "dff_fed_funds",
      "2026-11-12",
      { entity: "US_MACRO" }
    ),
    oasAa: mustVal(kg, "mkt_credit_oas", "oas_aa", "2026-11-13", {
      entity: "US_MACRO",
    }),
    oasIgMaster: mustVal(kg, "mkt_credit_oas", "oas_ig_master", "2026-11-13", {
      entity: "US_MACRO",
    }),
    quotes: Object.freeze(quotes as Record<AllCompTicker, EquityQuoteSnapshot>),
    consensus: Object.freeze(
      consensus as Record<AllCompTicker, ConsensusSnapshot>
    ),
    peers,
    clubUnitEconRaw,
  }

  return Object.freeze({
    cost,
    market,
    citations: Object.freeze({
      incomeStatement: kg.scheduleCitation("cost_income_statement", {
        entity: "COST",
      }),
      balanceSheet: kg.scheduleCitation("cost_balance_sheet", {
        entity: "COST",
      }),
      cashFlow: kg.scheduleCitation("cost_cash_flow", { entity: "COST" }),
      debtLeases: `${kg.scheduleCitation("cost_debt_schedule", { entity: "COST" })}; ${kg.scheduleCitation("cost_lease_summary", { entity: "COST" })}`,
      warehouseMembership: `${kg.scheduleCitation("cost_warehouse_kpis", { entity: "COST" })}; ${kg.scheduleCitation("cost_membership_kpis", { entity: "COST" })}`,
      guidanceCapitalReturn: `${kg.scheduleCitation("cost_fy27_guidance", { entity: "COST" })}; ${kg.scheduleCitation("cost_capital_return_events", { entity: "COST" })}`,
      equityQuotes: kg.scheduleCitation("mkt_equity_quotes"),
      consensusEstimates: kg.scheduleCitation("mkt_consensus_estimates"),
      priceTargets: kg.scheduleCitation("mkt_price_targets"),
      treasuryPar: kg.scheduleCitation("mkt_treasury_par_curve"),
      treasuryReal: kg.scheduleCitation("mkt_treasury_real_curve"),
      creditOas: kg.scheduleCitation("mkt_credit_oas"),
      inflationFedFunds: kg.scheduleCitation("mkt_inflation_fedfunds"),
      peerFinancials: `${kg.scheduleCitation("peer_income_statement")}; ${kg.scheduleCitation("peer_qoe_items")}`,
      peerIncomeStatement: kg.scheduleCitation("peer_income_statement"),
      peerQoe: kg.scheduleCitation("peer_qoe_items"),
      samsClub: kg.scheduleCitation("sams_club_segment", {
        entity: "WMT_SAMS",
      }),
    }),
  })
}
