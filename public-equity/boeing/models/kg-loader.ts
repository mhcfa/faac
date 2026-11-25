import { compileKgFromDir, type AccountingBasis, type KgRegistry } from "@faac/audited-reader"
import {
  DISPLAY_DIVISORS,
  HIST_KG_BS_PERIOD,
  HIST_KG_FLOW_PERIOD,
  type AnnualHistCol,
  type BsHistCol,
} from "./timeline.ts"

export const PEER_ENTITIES = [
  "AIR.PA",
  "GE",
  "RTX",
  "GD",
  "LMT",
  "NOC",
] as const
export type PeerEntity = (typeof PEER_ENTITIES)[number]

export const ALL_BETA_ENTITIES = ["BA", ...PEER_ENTITIES, "^GSPC"] as const
export type BetaEntity = (typeof ALL_BETA_ENTITIES)[number]

export const BETA_ROW_IDS: Readonly<Record<BetaEntity, string>> = Object.freeze(
  {
    BA: "ba_adj_close",
    "AIR.PA": "air_pa_adj_close",
    GE: "ge_adj_close",
    RTX: "rtx_adj_close",
    GD: "gd_adj_close",
    LMT: "lmt_adj_close",
    NOC: "noc_adj_close",
    "^GSPC": "gspc_adj_close",
  }
)

export const DAILY_CLOSE_ROW_IDS: Readonly<Record<BetaEntity, string>> =
  Object.freeze({
    BA: "ba_close",
    "AIR.PA": "air_pa_close",
    GE: "ge_close",
    RTX: "rtx_close",
    GD: "gd_close",
    LMT: "lmt_close",
    NOC: "noc_close",
    "^GSPC": "gspc_close",
  })

export interface PriceSeriesData {
  readonly dates: readonly string[]
  readonly prices: Readonly<Record<BetaEntity, readonly number[]>>
}

export interface PeerHistoricalRaw {
  readonly entity: PeerEntity
  readonly name: string
  readonly currency: "USD" | "EUR"
  readonly group: "Commercial / Hybrid" | "Defense Prime"
  readonly spotClose: number
  readonly coverShares: number
  readonly dilutiveAwards: number
  readonly waSharesBasic9m26: number
  readonly waSharesDiluted9m26: number
  readonly useWaDeltaForDilution: boolean
  readonly revFy25: number
  readonly rev9m25: number
  readonly rev9m26: number
  readonly ebitBaseFy25: number
  readonly ebitBase9m25: number
  readonly ebitBase9m26: number
  readonly ebitCorpFy25: number
  readonly ebitCorp9m25: number
  readonly ebitCorp9m26: number
  readonly ebitInsFy25: number
  readonly ebitIns9m25: number
  readonly ebitIns9m26: number
  readonly daPrimaryFy25: number
  readonly daPrimary9m25: number
  readonly daPrimary9m26: number
  readonly daAmortFy25: number
  readonly daAmort9m25: number
  readonly daAmort9m26: number
  readonly ocfFy25: number
  readonly ocf9m25: number
  readonly ocf9m26: number
  readonly capexFy25: number
  readonly capex9m25: number
  readonly capex9m26: number
  readonly sbcBaseFy25: number
  readonly sbcBase9m25: number
  readonly sbcBase9m26: number
  readonly sbc401kFy25: number
  readonly sbc401k9m25: number
  readonly sbc401k9m26: number
  readonly debtStBorrow: number
  readonly debtCurrLt: number
  readonly debtLt: number
  readonly finLeaseLiab: number
  readonly ifrs16LeaseSt: number
  readonly ifrs16LeaseLt: number
  readonly dassaultStakeFv: number
  readonly bsCash: number
  readonly extraLiquidCash: number
  readonly irHedgeLiab: number
  readonly nciEquity: number
  readonly nciRedeemable: number
  readonly pensionFundedStatus: number
  readonly opebFundedStatus: number
  readonly pensionProvisionsAirbus: number
  readonly pensionAssetAirbus: number
  readonly consRevFy26e: number
  readonly consRevFy27e: number
  readonly consEbitFy26e: number
  readonly consFcfFy26e: number
  readonly consEpsAdjFy26e: number
  readonly consEpsAdjFy27e: number
}

export interface AirbusIfrsRaw {
  readonly capDevAdditionsFy25: number
  readonly capDevAmortFy25: number
  readonly rouDepFy25: number
  readonly leaseCashRepaymentFy25: number
}

export interface BoeingCitations {
  readonly segmentSummary: string
  readonly incomeStatement: string
  readonly balanceSheet: string
  readonly cashFlowStatement: string
  readonly segmentCapex: string
  readonly debtMaturities: string
  readonly deferredTaxes: string
}

export interface BaHistoricalData {
  readonly is: Readonly<
    Record<string, Readonly<Record<AnnualHistCol | "9M25A" | "9M26A", number>>>
  >
  readonly bs: Readonly<
    Record<string, Readonly<Record<BsHistCol | "9M26A", number>>>
  >
  readonly cf: Readonly<
    Record<string, Readonly<Record<AnnualHistCol | "9M25A" | "9M26A", number>>>
  >
  readonly seg: Readonly<
    Record<string, Readonly<Record<AnnualHistCol | "9M25A" | "9M26A", number>>>
  >
  readonly deliveries: Readonly<
    Record<string, Readonly<Record<AnnualHistCol | "9M25A" | "9M26A", number>>>
  >
  readonly segCapex: Readonly<
    Record<string, Readonly<Record<AnnualHistCol | "9M25A" | "9M26A", number>>>
  >
  readonly epsShares: Readonly<
    Record<string, Readonly<Record<AnnualHistCol | "9M25A" | "9M26A", number>>>
  >
  readonly dasDivestitureGainFy25: number
  readonly hrlGainQ326: number
  readonly spiritOffMktAmortFy29: number
  readonly pensionAssetYe25: number
  readonly opebAssetYe25: number
  readonly pensionCurrLiabYe25: number
  readonly opebCurrLiabYe25: number
  readonly prefDividendRate: number
  readonly spiritExchPrincipal: number
  readonly spiritExchCoupon: number
  readonly spiritExchRatePer1000: number
  readonly sharesCoverQ326: number
  readonly antidilutivePrsu9m26: number
  readonly antidilutiveRsu9m26: number
  readonly antidilutiveOptions9m26: number
  readonly prefSharesM: number
  readonly prefLiqPrefPerSh: number
  readonly prefThresholdLow: number
  readonly prefThresholdHigh: number
  readonly prefConvRateMax: number
  readonly prefConvRateMin: number
  readonly debtCarryingExFlQ326: number
  readonly debtFairValueQ326: number
  readonly debtMat2027: number
  readonly debtMat2028: number
  readonly debtMat2029: number
  readonly debtMat2030: number
  readonly finLeaseMat2027: number
  readonly finLeaseMat2028: number
  readonly finLeaseMat2029: number
  readonly finLeaseMat2030: number
  readonly revolver2027: number
  readonly revolver2029: number
  readonly revolver2030: number
  readonly fedNolDtaYe25: number
  readonly taxVaYe25: number
  readonly backlogTotalQ326: number
}

export interface MarketMacroData {
  readonly baSpot: number
  readonly baCloseYtdBase: number
  readonly ba52wHigh: number
  readonly ba52wLow: number
  readonly spxSpot: number
  readonly spxCloseYtdBase: number
  readonly eurusdSpot: number
  readonly dgs10: number
  readonly t10yie: number
  readonly bbbEffYield: number
  readonly bbHyEffYield: number
  readonly damodaranErp: number
  readonly baPtAvgSa: number
  readonly baPtLowSa: number
  readonly baPtHighSa: number
  readonly baStrongBuySa: number
  readonly baBuySa: number
  readonly baRevConsFy26e: number
  readonly baRevConsFy27e: number
  readonly baEbitConsFy26e: number
  readonly baFcfConsFy26e: number
  readonly baEpsAdjConsFy26e: number
  readonly baEpsAdjConsFy27e: number
  readonly baZacksEpsFy26e: number
  readonly baZacksEpsFy27e: number
  readonly baZacksEpsFy28e: number
  readonly baZacksEpsFy29e: number
  readonly baYahooEps90dAgoFy27e: number
  readonly baYahooEpsCurrFy27e: number
}

export interface BoeingKgData {
  readonly ba: BaHistoricalData
  readonly citations: BoeingCitations
  readonly market: MarketMacroData
  readonly peers: Readonly<Record<PeerEntity, PeerHistoricalRaw>>
  readonly airbusIfrs: AirbusIfrsRaw
  readonly prices5yMonthly: PriceSeriesData
  readonly prices2yWeekly: PriceSeriesData
}

function mustVal(
  kg: KgRegistry,
  scheduleId: string,
  rowId: string,
  periodKey: string,
  opts: {
    entity?: string
    basis?: AccountingBasis | readonly AccountingBasis[]
    dimension?: string | null
    divisors?: typeof DISPLAY_DIVISORS | Record<string, number>
  }
): number {
  const v = kg.val(scheduleId, rowId, periodKey, {
    entity: opts.entity,
    basis: opts.basis,
    dimension: opts.dimension,
    divisors: opts.divisors ?? DISPLAY_DIVISORS,
  })
  if (v === null || !Number.isFinite(v)) {
    throw new Error(
      `Missing KG value: ${scheduleId}.${rowId} [${opts.entity ?? "*"} @ ${periodKey}]`
    )
  }
  return v
}

function optVal(
  kg: KgRegistry,
  scheduleId: string,
  rowId: string,
  periodKey: string,
  opts: {
    entity?: string
    basis?: AccountingBasis | readonly AccountingBasis[]
    dimension?: string | null
    divisors?: typeof DISPLAY_DIVISORS | Record<string, number>
  }
): number {
  const v = kg.val(scheduleId, rowId, periodKey, {
    entity: opts.entity,
    basis: opts.basis,
    dimension: opts.dimension,
    divisors: opts.divisors ?? DISPLAY_DIVISORS,
  })
  return v ?? 0
}

function loadFlowRows(
  kg: KgRegistry,
  scheduleId: string,
  rowIds: readonly string[],
  entity: string,
  basis: AccountingBasis,
  allowZeroMissing: readonly string[] = []
): Record<string, Record<AnnualHistCol | "9M25A" | "9M26A", number>> {
  const cols = Object.keys(HIST_KG_FLOW_PERIOD) as (
    | AnnualHistCol
    | "9M25A"
    | "9M26A"
  )[]
  const result: Record<
    string,
    Record<AnnualHistCol | "9M25A" | "9M26A", number>
  > = {}
  const zeroSet = new Set(allowZeroMissing)
  for (const r of rowIds) {
    const rec = {} as Record<AnnualHistCol | "9M25A" | "9M26A", number>
    for (const c of cols) {
      const pk = HIST_KG_FLOW_PERIOD[c]
      rec[c] = zeroSet.has(r)
        ? optVal(kg, scheduleId, r, pk, { entity, basis })
        : mustVal(kg, scheduleId, r, pk, { entity, basis })
    }
    result[r] = rec
  }
  return result
}

function loadBsRows(
  kg: KgRegistry,
  scheduleId: string,
  rowIds: readonly string[],
  entity: string,
  basis: AccountingBasis,
  allowZeroMissing: readonly string[] = []
): Record<string, Record<BsHistCol | "9M26A", number>> {
  const cols = Object.keys(HIST_KG_BS_PERIOD) as (BsHistCol | "9M26A")[]
  const result: Record<string, Record<BsHistCol | "9M26A", number>> = {}
  const zeroSet = new Set(allowZeroMissing)
  for (const r of rowIds) {
    const rec = {} as Record<BsHistCol | "9M26A", number>
    for (const c of cols) {
      const pk = HIST_KG_BS_PERIOD[c]
      rec[c] = zeroSet.has(r)
        ? optVal(kg, scheduleId, r, pk, { entity, basis })
        : mustVal(kg, scheduleId, r, pk, { entity, basis })
    }
    result[r] = rec
  }
  return result
}

function loadPriceSeries(kg: KgRegistry, scheduleId: string): PriceSeriesData {
  const panel = kg.panel(scheduleId, { basis: "market" })
  const dates = [...panel.periods]
  const byRow = new Map(panel.rows.map((r) => [r.row_id, r.values]))
  const prices = {} as Record<BetaEntity, readonly number[]>
  for (const ent of ALL_BETA_ENTITIES) {
    const rowId = BETA_ROW_IDS[ent]
    const vals = byRow.get(rowId)
    if (!vals) {
      throw new Error(`Missing price row ${rowId} in ${scheduleId}`)
    }
    prices[ent] = dates.map((d) => {
      const v = vals[d]
      if (v === null || v === undefined || !Number.isFinite(v)) {
        throw new Error(`Missing price for ${ent} on ${d} in ${scheduleId}`)
      }
      return v
    })
  }
  return { dates, prices }
}

function loadPeerRaw(kg: KgRegistry, entity: PeerEntity): PeerHistoricalRaw {
  const basis: AccountingBasis = entity === "AIR.PA" ? "ifrs" : "gaap"
  const currency: "USD" | "EUR" = entity === "AIR.PA" ? "EUR" : "USD"
  const meta: Record<
    PeerEntity,
    {
      name: string
      group: "Commercial / Hybrid" | "Defense Prime"
      coverDate: string
      prefix: string
    }
  > = {
    "AIR.PA": {
      name: "Airbus SE",
      group: "Commercial / Hybrid",
      coverDate: "2026-09-30",
      prefix: "air_pa",
    },
    GE: {
      name: "GE Aerospace",
      group: "Commercial / Hybrid",
      coverDate: "2026-09-30",
      prefix: "ge",
    },
    RTX: {
      name: "RTX Corporation",
      group: "Commercial / Hybrid",
      coverDate: "2026-09-30",
      prefix: "rtx",
    },
    GD: {
      name: "General Dynamics",
      group: "Commercial / Hybrid",
      coverDate: "2026-10-04",
      prefix: "gd",
    },
    LMT: {
      name: "Lockheed Martin",
      group: "Defense Prime",
      coverDate: "2026-10-19",
      prefix: "lmt",
    },
    NOC: {
      name: "Northrop Grumman",
      group: "Defense Prime",
      coverDate: "2026-10-15",
      prefix: "noc",
    },
  }
  const m = meta[entity]
  const spotClose = mustVal(
    kg,
    "market_prices_daily",
    DAILY_CLOSE_ROW_IDS[entity],
    "2026-11-20",
    { entity, basis: "market" }
  )
  const coverShares = mustVal(
    kg,
    "eps_shares",
    "shares_outstanding_cover",
    m.coverDate,
    { entity, basis }
  )

  let dilutiveAwards = 0
  let waSharesBasic9m26 = 0
  let waSharesDiluted9m26 = 0
  let useWaDeltaForDilution = false
  if (entity === "AIR.PA") {
    dilutiveAwards = mustVal(
      kg,
      "eps_shares",
      "dilutive_performance_shares",
      "2026-Q3-YTD",
      { entity, basis }
    )
  } else if (entity === "GE" || entity === "RTX") {
    dilutiveAwards = mustVal(
      kg,
      "eps_shares",
      "dilutive_awards_shares",
      "2026-Q3-YTD",
      { entity, basis }
    )
  } else if (entity === "GD" || entity === "LMT") {
    dilutiveAwards = mustVal(
      kg,
      "eps_shares",
      "dilutive_effect_awards",
      "2026-Q3-YTD",
      { entity, basis }
    )
  } else {
    waSharesDiluted9m26 = mustVal(
      kg,
      "eps_shares",
      "wa_shares_diluted",
      "2026-Q3-YTD",
      { entity, basis }
    )
    waSharesBasic9m26 = mustVal(
      kg,
      "eps_shares",
      "wa_shares_basic",
      "2026-Q3-YTD",
      { entity, basis }
    )
    useWaDeltaForDilution = true
  }

  let revFy25: number
  let rev9m25: number
  let rev9m26: number
  let ebitBaseFy25: number
  let ebitBase9m25: number
  let ebitBase9m26: number
  let ebitCorpFy25 = 0
  let ebitCorp9m25 = 0
  let ebitCorp9m26 = 0
  let ebitInsFy25 = 0
  let ebitIns9m25 = 0
  let ebitIns9m26 = 0

  if (entity === "GE") {
    revFy25 = mustVal(kg, "segment_results", "seg_rev_total", "2025-FY", {
      entity,
      basis,
    })
    rev9m25 = mustVal(kg, "segment_results", "seg_rev_total", "2025-Q3-YTD", {
      entity,
      basis,
    })
    rev9m26 = mustVal(kg, "segment_results", "seg_rev_total", "2026-Q3-YTD", {
      entity,
      basis,
    })
    ebitBaseFy25 = mustVal(
      kg,
      "segment_results",
      "seg_profit_total",
      "2025-FY",
      { entity, basis }
    )
    ebitCorpFy25 = mustVal(
      kg,
      "segment_results",
      "seg_corp_other_profit",
      "2025-FY",
      { entity, basis }
    )
    ebitInsFy25 = mustVal(
      kg,
      "segment_results",
      "seg_insurance_profit",
      "2025-FY",
      { entity, basis }
    )
    ebitBase9m25 = mustVal(
      kg,
      "segment_results",
      "seg_profit_total",
      "2025-Q3-YTD",
      { entity, basis }
    )
    ebitCorp9m25 = mustVal(
      kg,
      "segment_results",
      "seg_corp_other_profit",
      "2025-Q3-YTD",
      { entity, basis }
    )
    ebitIns9m25 = mustVal(
      kg,
      "segment_results",
      "seg_insurance_profit",
      "2025-Q3-YTD",
      { entity, basis }
    )
    ebitBase9m26 = mustVal(
      kg,
      "segment_results",
      "seg_profit_total",
      "2026-Q3-YTD",
      { entity, basis }
    )
    ebitCorp9m26 = mustVal(
      kg,
      "segment_results",
      "seg_corp_other_profit",
      "2026-Q3-YTD",
      { entity, basis }
    )
    ebitIns9m26 = mustVal(
      kg,
      "segment_results",
      "seg_insurance_profit",
      "2026-Q3-YTD",
      { entity, basis }
    )
  } else {
    revFy25 = mustVal(kg, "income_statement", "revenue_total", "2025-FY", {
      entity,
      basis,
    })
    rev9m25 = mustVal(kg, "income_statement", "revenue_total", "2025-Q3-YTD", {
      entity,
      basis,
    })
    rev9m26 = mustVal(kg, "income_statement", "revenue_total", "2026-Q3-YTD", {
      entity,
      basis,
    })
    ebitBaseFy25 = mustVal(
      kg,
      "income_statement",
      "operating_income",
      "2025-FY",
      { entity, basis }
    )
    ebitBase9m25 = mustVal(
      kg,
      "income_statement",
      "operating_income",
      "2025-Q3-YTD",
      { entity, basis }
    )
    ebitBase9m26 = mustVal(
      kg,
      "income_statement",
      "operating_income",
      "2026-Q3-YTD",
      { entity, basis }
    )
  }

  let daPrimaryFy25: number
  let daPrimary9m25: number
  let daPrimary9m26: number
  let daAmortFy25 = 0
  let daAmort9m25 = 0
  let daAmort9m26 = 0
  if (entity === "GE" || entity === "GD") {
    daPrimaryFy25 = mustVal(
      kg,
      "cash_flow_statement",
      "depreciation_ppe",
      "2025-FY",
      { entity, basis }
    )
    daAmortFy25 = mustVal(
      kg,
      "cash_flow_statement",
      "amortization_intangibles",
      "2025-FY",
      { entity, basis }
    )
    daPrimary9m25 = mustVal(
      kg,
      "cash_flow_statement",
      "depreciation_ppe",
      "2025-Q3-YTD",
      { entity, basis }
    )
    daAmort9m25 = mustVal(
      kg,
      "cash_flow_statement",
      "amortization_intangibles",
      "2025-Q3-YTD",
      { entity, basis }
    )
    daPrimary9m26 = mustVal(
      kg,
      "cash_flow_statement",
      "depreciation_ppe",
      "2026-Q3-YTD",
      { entity, basis }
    )
    daAmort9m26 = mustVal(
      kg,
      "cash_flow_statement",
      "amortization_intangibles",
      "2026-Q3-YTD",
      { entity, basis }
    )
  } else {
    daPrimaryFy25 = mustVal(kg, "cash_flow_statement", "da_total", "2025-FY", {
      entity,
      basis,
    })
    daPrimary9m25 = mustVal(
      kg,
      "cash_flow_statement",
      "da_total",
      "2025-Q3-YTD",
      { entity, basis }
    )
    daPrimary9m26 = mustVal(
      kg,
      "cash_flow_statement",
      "da_total",
      "2026-Q3-YTD",
      { entity, basis }
    )
  }

  const ocfFy25 = mustVal(
    kg,
    "cash_flow_statement",
    "ocf_continuing",
    "2025-FY",
    { entity, basis }
  )
  const ocf9m25 = mustVal(
    kg,
    "cash_flow_statement",
    "ocf_continuing",
    "2025-Q3-YTD",
    { entity, basis }
  )
  const ocf9m26 = mustVal(
    kg,
    "cash_flow_statement",
    "ocf_continuing",
    "2026-Q3-YTD",
    { entity, basis }
  )
  const capexFy25 = mustVal(kg, "cash_flow_statement", "capex", "2025-FY", {
    entity,
    basis,
  })
  const capex9m25 = mustVal(kg, "cash_flow_statement", "capex", "2025-Q3-YTD", {
    entity,
    basis,
  })
  const capex9m26 = mustVal(kg, "cash_flow_statement", "capex", "2026-Q3-YTD", {
    entity,
    basis,
  })

  let sbcBaseFy25: number
  let sbcBase9m25: number
  let sbcBase9m26: number
  let sbc401kFy25 = 0
  let sbc401k9m25 = 0
  let sbc401k9m26 = 0
  if (entity === "AIR.PA") {
    sbcBaseFy25 = mustVal(kg, "ev_bridge_supplemental", "sbc", "2025-FY", {
      entity,
      basis,
    })
    sbcBase9m25 = mustVal(kg, "ev_bridge_supplemental", "sbc", "2025-Q3-YTD", {
      entity,
      basis,
    })
    sbcBase9m26 = mustVal(kg, "ev_bridge_supplemental", "sbc", "2026-Q3-YTD", {
      entity,
      basis,
    })
  } else if (entity === "GE") {
    sbcBaseFy25 = mustVal(kg, "equity_sbc", "sbc", "2025-FY", { entity, basis })
    sbcBase9m25 = mustVal(kg, "equity_sbc", "sbc", "2025-Q3-YTD", {
      entity,
      basis,
    })
    sbcBase9m26 = mustVal(kg, "equity_sbc", "sbc", "2026-Q3-YTD", {
      entity,
      basis,
    })
  } else if (entity === "RTX") {
    sbcBaseFy25 = mustVal(kg, "cash_flow_statement", "sbc", "2025-FY", {
      entity,
      basis,
    })
    sbc401kFy25 = mustVal(
      kg,
      "cash_flow_statement",
      "share_based_401k_match",
      "2025-FY",
      { entity, basis }
    )
    sbcBase9m25 = mustVal(kg, "cash_flow_statement", "sbc", "2025-Q3-YTD", {
      entity,
      basis,
    })
    sbc401k9m25 = mustVal(
      kg,
      "cash_flow_statement",
      "share_based_401k_match",
      "2025-Q3-YTD",
      { entity, basis }
    )
    sbcBase9m26 = mustVal(kg, "cash_flow_statement", "sbc", "2026-Q3-YTD", {
      entity,
      basis,
    })
    sbc401k9m26 = mustVal(
      kg,
      "cash_flow_statement",
      "share_based_401k_match",
      "2026-Q3-YTD",
      { entity, basis }
    )
  } else {
    sbcBaseFy25 = mustVal(kg, "cash_flow_statement", "sbc", "2025-FY", {
      entity,
      basis,
    })
    sbcBase9m25 = mustVal(kg, "cash_flow_statement", "sbc", "2025-Q3-YTD", {
      entity,
      basis,
    })
    sbcBase9m26 = mustVal(kg, "cash_flow_statement", "sbc", "2026-Q3-YTD", {
      entity,
      basis,
    })
  }

  let debtStBorrow = 0
  let debtCurrLt = 0
  let debtLt = 0
  let finLeaseLiab = 0
  let ifrs16LeaseSt = 0
  let ifrs16LeaseLt = 0
  let dassaultStakeFv = 0
  let bsCash = 0
  let extraLiquidCash = 0
  let irHedgeLiab = 0
  let nciEquity = 0
  let nciRedeemable = 0
  let pensionFundedStatus = 0
  let opebFundedStatus = 0
  let pensionProvisionsAirbus = 0
  let pensionAssetAirbus = 0

  if (entity === "AIR.PA") {
    debtStBorrow = mustVal(
      kg,
      "airbus_financing_liabilities",
      "short_term_financing_liabilities",
      "2026-09-30",
      { entity, basis: "mgmt" }
    )
    debtLt = mustVal(
      kg,
      "airbus_financing_liabilities",
      "long_term_financing_liabilities",
      "2026-09-30",
      { entity, basis: "mgmt" }
    )
    ifrs16LeaseSt = mustVal(
      kg,
      "airbus_financing_liabilities",
      "st_lease_liabilities",
      "2026-09-30",
      { entity, basis: "mgmt" }
    )
    ifrs16LeaseLt = mustVal(
      kg,
      "airbus_financing_liabilities",
      "lt_lease_liabilities",
      "2026-09-30",
      { entity, basis: "mgmt" }
    )
    dassaultStakeFv = mustVal(
      kg,
      "ev_bridge_supplemental",
      "dassault_stake_fv",
      "2026-09-30",
      { entity, basis }
    )
    bsCash = mustVal(kg, "airbus_net_cash", "gross_cash", "2026-09-30", {
      entity,
      basis: "mgmt",
    })
    irHedgeLiab = mustVal(
      kg,
      "airbus_net_cash",
      "interest_rate_contracts",
      "2026-09-30",
      { entity, basis: "mgmt" }
    )
    nciEquity = mustVal(
      kg,
      "balance_sheet",
      "noncontrolling_interest",
      "2026-09-30",
      { entity, basis }
    )
    pensionProvisionsAirbus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_provisions",
      "2026-09-30",
      { entity, basis }
    )
    pensionAssetAirbus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_surplus_asset",
      "2026-09-30",
      { entity, basis }
    )
  } else if (entity === "GE") {
    debtStBorrow = mustVal(
      kg,
      "balance_sheet",
      "short_term_borrowings",
      "2026-09-30",
      { entity, basis }
    )
    debtLt = mustVal(kg, "balance_sheet", "long_term_debt", "2026-09-30", {
      entity,
      basis,
    })
    bsCash = mustVal(
      kg,
      "balance_sheet",
      "cash_and_equivalents",
      "2026-09-30",
      { entity, basis }
    )
    extraLiquidCash = mustVal(
      kg,
      "ev_bridge_supplemental",
      "time_deposits_gt3m_conversion",
      "2026-Q3-YTD",
      { entity, basis }
    )
    nciEquity = mustVal(
      kg,
      "balance_sheet",
      "noncontrolling_interest",
      "2026-09-30",
      { entity, basis }
    )
    pensionFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis }
    )
  } else if (entity === "RTX") {
    debtStBorrow = mustVal(
      kg,
      "balance_sheet",
      "short_term_borrowings",
      "2026-09-30",
      { entity, basis }
    )
    debtCurrLt = mustVal(
      kg,
      "balance_sheet",
      "current_portion_lt_debt",
      "2026-09-30",
      { entity, basis }
    )
    debtLt = mustVal(kg, "balance_sheet", "long_term_debt", "2026-09-30", {
      entity,
      basis,
    })
    bsCash = mustVal(
      kg,
      "balance_sheet",
      "cash_and_equivalents",
      "2026-09-30",
      { entity, basis }
    )
    nciRedeemable = mustVal(
      kg,
      "balance_sheet",
      "redeemable_nci",
      "2026-09-30",
      { entity, basis }
    )
    nciEquity = mustVal(
      kg,
      "balance_sheet",
      "noncontrolling_interest",
      "2026-09-30",
      { entity, basis }
    )
    pensionFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis }
    )
    opebFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "prb_funded_status_net",
      "2025-12-31",
      { entity, basis }
    )
  } else if (entity === "GD") {
    debtStBorrow = mustVal(
      kg,
      "balance_sheet",
      "short_term_borrowings",
      "2026-10-04",
      { entity, basis }
    )
    debtLt = mustVal(kg, "balance_sheet", "long_term_debt", "2026-10-04", {
      entity,
      basis,
    })
    finLeaseLiab = mustVal(
      kg,
      "ev_bridge_supplemental",
      "fin_lease_liab_total",
      "2025-12-31",
      { entity, basis }
    )
    bsCash = mustVal(
      kg,
      "balance_sheet",
      "cash_and_equivalents",
      "2026-10-04",
      { entity, basis }
    )
    pensionFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis, dimension: "plan_type=pension" }
    )
    opebFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis, dimension: "plan_type=opeb" }
    )
  } else if (entity === "LMT") {
    debtCurrLt = mustVal(
      kg,
      "balance_sheet",
      "current_portion_lt_debt",
      "2026-09-27",
      { entity, basis }
    )
    debtLt = mustVal(kg, "balance_sheet", "long_term_debt", "2026-09-27", {
      entity,
      basis,
    })
    bsCash = mustVal(
      kg,
      "balance_sheet",
      "cash_and_equivalents",
      "2026-09-27",
      { entity, basis }
    )
    pensionFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis, dimension: "plan_type=pension" }
    )
    opebFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis, dimension: "plan_type=opeb" }
    )
  } else {
    debtCurrLt = mustVal(
      kg,
      "ev_bridge_supplemental",
      "current_portion_lt_debt",
      "2026-09-30",
      { entity, basis }
    )
    debtLt = mustVal(kg, "balance_sheet", "long_term_debt", "2026-09-30", {
      entity,
      basis,
    })
    bsCash = mustVal(
      kg,
      "balance_sheet",
      "cash_and_equivalents",
      "2026-09-30",
      { entity, basis }
    )
    pensionFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis, dimension: "plan_type=pension" }
    )
    opebFundedStatus = mustVal(
      kg,
      "ev_bridge_supplemental",
      "pension_funded_status_net",
      "2025-12-31",
      { entity, basis, dimension: "plan_type=opeb" }
    )
  }

  const consOpts = {
    entity,
    basis: "consensus" as const,
    dimension: "provider=stockanalysis",
  }
  const consRevFy26e = mustVal(
    kg,
    "consensus_stockanalysis",
    `${m.prefix}_revenue`,
    "2026-FY",
    consOpts
  )
  const consRevFy27e = mustVal(
    kg,
    "consensus_stockanalysis",
    `${m.prefix}_revenue`,
    "2027-FY",
    consOpts
  )
  const consEbitFy26e = mustVal(
    kg,
    "consensus_stockanalysis",
    `${m.prefix}_operating_income`,
    "2026-FY",
    consOpts
  )
  const consFcfFy26e = mustVal(
    kg,
    "consensus_stockanalysis",
    `${m.prefix}_fcf`,
    "2026-FY",
    consOpts
  )
  const consEpsAdjFy26e = mustVal(
    kg,
    "consensus_stockanalysis",
    `${m.prefix}_eps_adjusted`,
    "2026-FY",
    consOpts
  )
  const consEpsAdjFy27e = mustVal(
    kg,
    "consensus_stockanalysis",
    `${m.prefix}_eps_adjusted`,
    "2027-FY",
    consOpts
  )

  return {
    entity,
    name: m.name,
    currency,
    group: m.group,
    spotClose,
    coverShares,
    dilutiveAwards,
    waSharesBasic9m26,
    waSharesDiluted9m26,
    useWaDeltaForDilution,
    revFy25,
    rev9m25,
    rev9m26,
    ebitBaseFy25,
    ebitBase9m25,
    ebitBase9m26,
    ebitCorpFy25,
    ebitCorp9m25,
    ebitCorp9m26,
    ebitInsFy25,
    ebitIns9m25,
    ebitIns9m26,
    daPrimaryFy25,
    daPrimary9m25,
    daPrimary9m26,
    daAmortFy25,
    daAmort9m25,
    daAmort9m26,
    ocfFy25,
    ocf9m25,
    ocf9m26,
    capexFy25,
    capex9m25,
    capex9m26,
    sbcBaseFy25,
    sbcBase9m25,
    sbcBase9m26,
    sbc401kFy25,
    sbc401k9m25,
    sbc401k9m26,
    debtStBorrow,
    debtCurrLt,
    debtLt,
    finLeaseLiab,
    ifrs16LeaseSt,
    ifrs16LeaseLt,
    dassaultStakeFv,
    bsCash,
    extraLiquidCash,
    irHedgeLiab,
    nciEquity,
    nciRedeemable,
    pensionFundedStatus,
    opebFundedStatus,
    pensionProvisionsAirbus,
    pensionAssetAirbus,
    consRevFy26e,
    consRevFy27e,
    consEbitFy26e,
    consFcfFy26e,
    consEpsAdjFy26e,
    consEpsAdjFy27e,
  }
}

export function loadBoeingKgData(auditedDir = "data/audited"): BoeingKgData {
  using kg = compileKgFromDir(auditedDir)

  const baIsRows = [
    "revenue_products",
    "revenue_services",
    "revenue_total",
    "total_cost_of_sales",
    "gross_profit",
    "income_from_operating_investments",
    "sga_expense",
    "rd_expense",
    "gain_on_dispositions",
    "other_income_expense",
    "interest_expense",
    "income_tax_expense",
    "net_income_nci",
    "pref_dividends",
    "eps_basic",
    "eps_diluted",
  ] as const

  const baBsRows = [
    "cash_and_equivalents",
    "short_term_investments",
    "accounts_receivable",
    "unbilled_receivables",
    "inventories",
    "current_financing_receivables",
    "other_current_assets",
    "assets_held_for_sale",
    "financing_receivables_and_leases",
    "ppe_net",
    "goodwill",
    "acquired_intangibles",
    "deferred_tax_assets",
    "long_term_investments",
    "other_assets",
    "total_assets",
    "accounts_payable",
    "accrued_liabilities",
    "advances_and_progress_billings",
    "short_term_debt",
    "liabilities_held_for_sale",
    "deferred_tax_liabilities",
    "accrued_retiree_health",
    "accrued_pension_liab",
    "other_long_term_liabilities",
    "long_term_debt",
    "preferred_stock",
    "common_stock",
    "apic",
    "treasury_stock",
    "retained_earnings",
    "aoci",
    "noncontrolling_interest",
  ] as const

  const baCfRows = [
    "sbc",
    "treasury_shares_401k",
    "da_total",
    "impairment_charges",
    "gain_on_dispositions",
    "reach_forward_losses",
    "reach_forward_loss_787",
    "other_non_cash",
    "wc_accounts_receivable",
    "wc_unbilled_receivables",
    "wc_advances_progress_billings",
    "wc_inventories",
    "wc_other_current_assets",
    "wc_accounts_payable",
    "wc_accrued_liabilities",
    "wc_income_taxes",
    "wc_other_lt_liabilities",
    "wc_pension_opeb",
    "wc_financing_receivables_leases",
    "wc_other",
    "proceeds_disposal_ppe",
    "proceeds_dispositions",
    "acquisitions_net",
    "contributions_to_investments",
    "proceeds_from_investments",
    "supplier_notes_receivable",
    "repayments_supplier_notes",
    "investing_other",
    "purchase_distribution_rights",
    "new_borrowings",
    "debt_repayments",
    "employee_taxes_sbc",
    "pref_dividends_paid",
    "financing_other",
    "common_stock_issuance",
    "preferred_stock_issuance",
    "stock_options_exercised",
    "fx_effect_cash",
    "less_cash_held_for_sale",
    "beginning_cash_incl_restricted",
    "less_restricted_cash",
  ] as const

  const baSegRows = [
    "rev_bca",
    "rev_bds",
    "rev_bgs",
    "rev_unallocated",
    "ebit_bca",
    "ebit_bds",
    "ebit_bgs",
    "ebit_unallocated",
    "fas_cas_service_cost_adj",
  ] as const

  const baDelivRows = ["b737", "b767", "b777", "b787", "b747"] as const

  const baIs = loadFlowRows(kg, "income_statement", baIsRows, "BA", "gaap", [
    "pref_dividends",
    "gain_on_dispositions",
    "net_income_nci",
  ])

  const baBs = loadBsRows(kg, "balance_sheet", baBsRows, "BA", "gaap", [
    "current_financing_receivables",
    "assets_held_for_sale",
    "liabilities_held_for_sale",
    "preferred_stock",
  ])

  const baCf = loadFlowRows(kg, "cash_flow_statement", baCfRows, "BA", "gaap", [
    "reach_forward_losses",
    "reach_forward_loss_787",
    "proceeds_dispositions",
    "acquisitions_net",
    "supplier_notes_receivable",
    "repayments_supplier_notes",
    "investing_other",
    "purchase_distribution_rights",
    "pref_dividends_paid",
    "financing_other",
    "common_stock_issuance",
    "preferred_stock_issuance",
    "stock_options_exercised",
    "less_cash_held_for_sale",
  ])

  const baSeg = loadFlowRows(kg, "segment_summary", baSegRows, "BA", "gaap")
  const baDeliv = loadFlowRows(
    kg,
    "bca_deliveries",
    baDelivRows,
    "BA",
    "gaap",
    ["b747"]
  )
  const baSegCapex = loadFlowRows(kg, "segment_capex", ["total"], "BA", "gaap")
  const baEpsShares = loadFlowRows(
    kg,
    "eps_shares",
    ["wa_shares_basic", "wa_shares_diluted"],
    "BA",
    "gaap"
  )

  const prefRow = kg
    .cells({
      schedule_id: "share_rollforward",
      entity: "BA",
      status: "primary",
    })
    .find(
      (c) =>
        c.row_id === "balance_2025_12_31" &&
        c.col_id === "mandatory_conv_preferred"
    )
  if (!prefRow || prefRow.normalized_num === null) {
    throw new Error("Missing BA mandatory_conv_preferred share count in KG")
  }
  const prefSharesM = prefRow.normalized_num / 1_000_000

  const citations: BoeingCitations = {
    segmentSummary: `${kg.scheduleCitation("segment_summary", { entity: "BA", doc_id: "doc_ba_20251231" })}; ${kg.scheduleCitation("segment_summary", { entity: "BA", doc_id: "doc_ba_20260930" })}`,
    incomeStatement: `${kg.scheduleCitation("income_statement", { entity: "BA", doc_id: "doc_ba_20251231" })}; ${kg.scheduleCitation("income_statement", { entity: "BA", doc_id: "doc_ba_20260930" })}`,
    balanceSheet: `${kg.scheduleCitation("balance_sheet", { entity: "BA", doc_id: "doc_ba_20251231" })}; ${kg.scheduleCitation("balance_sheet", { entity: "BA", doc_id: "doc_ba_20260930" })}`,
    cashFlowStatement: `${kg.scheduleCitation("cash_flow_statement", { entity: "BA", doc_id: "doc_ba_20251231" })}; ${kg.scheduleCitation("cash_flow_statement", { entity: "BA", doc_id: "doc_ba_20260930" })}`,
    segmentCapex: `${kg.scheduleCitation("segment_capex", { entity: "BA", doc_id: "doc_ba_20251231" })}; ${kg.scheduleCitation("segment_capex", { entity: "BA", doc_id: "doc_ba_20260930" })}`,
    debtMaturities: kg.scheduleCitation("debt_maturities", {
      entity: "BA",
      doc_id: "doc_ba_20251231",
    }),
    deferredTaxes: kg.scheduleCitation("deferred_taxes", {
      entity: "BA",
      doc_id: "doc_ba_20251231",
    }),
  }

  const ba: BaHistoricalData = {
    is: baIs,
    bs: baBs,
    cf: baCf,
    seg: baSeg,
    deliveries: baDeliv,
    segCapex: baSegCapex,
    epsShares: baEpsShares,
    dasDivestitureGainFy25: mustVal(
      kg,
      "segment_expense_recon",
      "gain_on_das_divestiture",
      "2025-FY",
      { entity: "BA", basis: "gaap" }
    ),
    hrlGainQ326: mustVal(
      kg,
      "supplemental_disclosures",
      "hrl_sale_gain",
      "2026-Q3-YTD",
      { entity: "BA", basis: "gaap" }
    ),
    spiritOffMktAmortFy29: mustVal(
      kg,
      "spirit_off_market_amort",
      "estimated_revenue",
      "2029-FY",
      { entity: "BA", basis: "gaap" }
    ),
    pensionAssetYe25: mustVal(
      kg,
      "pension_funded_status",
      "bs_other_assets",
      "2025-12-31",
      { entity: "BA", basis: "gaap", dimension: "plan=pension" }
    ),
    opebAssetYe25: mustVal(
      kg,
      "pension_funded_status",
      "bs_other_assets",
      "2025-12-31",
      { entity: "BA", basis: "gaap", dimension: "plan=opeb" }
    ),
    pensionCurrLiabYe25: mustVal(
      kg,
      "pension_funded_status",
      "bs_accrued_liabilities_current",
      "2025-12-31",
      { entity: "BA", basis: "gaap", dimension: "plan=pension" }
    ),
    opebCurrLiabYe25: mustVal(
      kg,
      "pension_funded_status",
      "bs_accrued_liabilities_current",
      "2025-12-31",
      { entity: "BA", basis: "gaap", dimension: "plan=opeb" }
    ),
    prefDividendRate: mustVal(
      kg,
      "supplemental_disclosures",
      "pref_dividend_rate",
      "2026-09-30",
      { entity: "BA", basis: "gaap" }
    ),
    spiritExchPrincipal: mustVal(
      kg,
      "supplemental_disclosures",
      "spirit_exch_principal",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    spiritExchCoupon: mustVal(
      kg,
      "supplemental_disclosures",
      "spirit_exch_coupon",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    spiritExchRatePer1000: mustVal(
      kg,
      "supplemental_disclosures",
      "spirit_exch_rate_per_1000",
      "2025-12-31",
      { entity: "BA", basis: "gaap", divisors: { shares: 1 } }
    ),
    sharesCoverQ326: mustVal(
      kg,
      "eps_shares",
      "shares_outstanding_cover",
      "2026-10-20",
      { entity: "BA", basis: "gaap" }
    ),
    antidilutivePrsu9m26: mustVal(
      kg,
      "eps_shares",
      "antidilutive_prsu",
      "2026-Q3-YTD",
      { entity: "BA", basis: "gaap" }
    ),
    antidilutiveRsu9m26: mustVal(
      kg,
      "eps_shares",
      "antidilutive_rsu",
      "2026-Q3-YTD",
      { entity: "BA", basis: "gaap" }
    ),
    antidilutiveOptions9m26: mustVal(
      kg,
      "eps_shares",
      "antidilutive_options",
      "2026-Q3-YTD",
      { entity: "BA", basis: "gaap" }
    ),
    prefSharesM,
    prefLiqPrefPerSh: mustVal(
      kg,
      "preferred_conversion_rates",
      "liquidation_preference_per_share",
      "2026-09-30",
      { entity: "BA", basis: "gaap", divisors: { shares: 1 } }
    ),
    prefThresholdLow: mustVal(
      kg,
      "preferred_conversion_rates",
      "threshold_price_low",
      "2026-09-30",
      { entity: "BA", basis: "gaap", divisors: { shares: 1 } }
    ),
    prefThresholdHigh: mustVal(
      kg,
      "preferred_conversion_rates",
      "threshold_price_high",
      "2026-09-30",
      { entity: "BA", basis: "gaap", divisors: { shares: 1 } }
    ),
    prefConvRateMax: mustVal(
      kg,
      "preferred_conversion_rates",
      "conversion_rate_max",
      "2026-09-30",
      { entity: "BA", basis: "gaap", divisors: { shares: 1 } }
    ),
    prefConvRateMin: mustVal(
      kg,
      "preferred_conversion_rates",
      "conversion_rate_min",
      "2026-09-30",
      { entity: "BA", basis: "gaap", divisors: { shares: 1 } }
    ),
    debtCarryingExFlQ326: mustVal(
      kg,
      "debt_fair_value",
      "debt_carrying_ex_fl",
      "2026-09-30",
      { entity: "BA", basis: "gaap" }
    ),
    debtFairValueQ326: mustVal(
      kg,
      "debt_fair_value",
      "debt_fair_value",
      "2026-09-30",
      { entity: "BA", basis: "gaap" }
    ),
    debtMat2027: mustVal(
      kg,
      "debt_maturities",
      "debt_maturity_2027",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    debtMat2028: mustVal(
      kg,
      "debt_maturities",
      "debt_maturity_2028",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    debtMat2029: mustVal(
      kg,
      "debt_maturities",
      "debt_maturity_2029",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    debtMat2030: mustVal(
      kg,
      "debt_maturities",
      "debt_maturity_2030",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    finLeaseMat2027: mustVal(
      kg,
      "debt_maturities",
      "fin_lease_pmt_2027",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    finLeaseMat2028: mustVal(
      kg,
      "debt_maturities",
      "fin_lease_pmt_2028",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    finLeaseMat2029: mustVal(
      kg,
      "debt_maturities",
      "fin_lease_pmt_2029",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    finLeaseMat2030: mustVal(
      kg,
      "debt_maturities",
      "fin_lease_pmt_2030",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    revolver2027: mustVal(
      kg,
      "credit_facilities",
      "revolver_364d_2027",
      "2026-08-24",
      { entity: "BA", basis: "covenant" }
    ),
    revolver2029: mustVal(
      kg,
      "credit_facilities",
      "revolver_5yr_2029",
      "2026-08-24",
      { entity: "BA", basis: "covenant" }
    ),
    revolver2030: mustVal(
      kg,
      "credit_facilities",
      "revolver_5yr_2030",
      "2026-08-24",
      { entity: "BA", basis: "covenant" }
    ),
    fedNolDtaYe25: mustVal(
      kg,
      "deferred_taxes",
      "federal_nol_credit_carryovers",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    taxVaYe25: mustVal(
      kg,
      "deferred_taxes",
      "valuation_allowance",
      "2025-12-31",
      { entity: "BA", basis: "gaap" }
    ),
    backlogTotalQ326: mustVal(kg, "backlog", "total_backlog", "2026-09-30", {
      entity: "BA",
      basis: "gaap",
    }),
  }

  const market: MarketMacroData = {
    baSpot: mustVal(kg, "market_prices_daily", "ba_close", "2026-11-20", {
      entity: "BA",
      basis: "market",
    }),
    baCloseYtdBase: mustVal(
      kg,
      "market_prices_daily",
      "ba_close",
      "2025-12-31",
      { entity: "BA", basis: "market" }
    ),
    ba52wHigh: mustVal(kg, "market_prices_daily", "ba_close", "2026-01-23", {
      entity: "BA",
      basis: "market",
    }),
    ba52wLow: mustVal(kg, "market_prices_daily", "ba_close", "2026-11-20", {
      entity: "BA",
      basis: "market",
    }),
    spxSpot: mustVal(kg, "market_prices_daily", "gspc_close", "2026-11-20", {
      entity: "^GSPC",
      basis: "market",
    }),
    spxCloseYtdBase: mustVal(
      kg,
      "market_prices_daily",
      "gspc_close",
      "2025-12-31",
      { entity: "^GSPC", basis: "market" }
    ),
    eurusdSpot: mustVal(kg, "fx_eurusd_daily", "close", "2026-11-20", {
      entity: "EUR/USD",
      basis: "market",
    }),
    dgs10: mustVal(kg, "fred_rates_credit", "dgs10", "2026-11-19", {
      entity: "US Macro",
      basis: "market",
    }),
    t10yie: mustVal(kg, "fred_rates_credit", "t10yie", "2026-11-20", {
      entity: "US Macro",
      basis: "market",
    }),
    bbbEffYield: mustVal(
      kg,
      "fred_rates_credit",
      "bbb_eff_yield",
      "2026-11-20",
      { entity: "US Macro", basis: "market" }
    ),
    bbHyEffYield: mustVal(
      kg,
      "fred_rates_credit",
      "bb_hy_eff_yield",
      "2026-11-20",
      { entity: "US Macro", basis: "market" }
    ),
    damodaranErp: mustVal(
      kg,
      "damodaran_implied_erp",
      "implied_erp_ttm_adj_payout",
      "2026-11-01",
      { entity: "US Macro", basis: "market" }
    ),
    baPtAvgSa: mustVal(
      kg,
      "consensus_targets_ratings",
      "ba_pt_avg",
      "2026-11-20",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baPtLowSa: mustVal(
      kg,
      "consensus_targets_ratings",
      "ba_pt_low",
      "2026-11-20",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baPtHighSa: mustVal(
      kg,
      "consensus_targets_ratings",
      "ba_pt_high",
      "2026-11-20",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baStrongBuySa: mustVal(
      kg,
      "consensus_targets_ratings",
      "ba_strong_buy",
      "2026-11-20",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baBuySa: mustVal(kg, "consensus_targets_ratings", "ba_buy", "2026-11-20", {
      entity: "BA",
      basis: "consensus",
      dimension: "provider=stockanalysis",
    }),
    baRevConsFy26e: mustVal(
      kg,
      "consensus_stockanalysis",
      "ba_revenue",
      "2026-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baRevConsFy27e: mustVal(
      kg,
      "consensus_stockanalysis",
      "ba_revenue",
      "2027-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baEbitConsFy26e: mustVal(
      kg,
      "consensus_stockanalysis",
      "ba_operating_income",
      "2026-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baFcfConsFy26e: mustVal(
      kg,
      "consensus_stockanalysis",
      "ba_fcf",
      "2026-FY",
      {
        entity: "BA",
        basis: "consensus",
        dimension: "provider=stockanalysis",
      }
    ),
    baEpsAdjConsFy26e: mustVal(
      kg,
      "consensus_stockanalysis",
      "ba_eps_adjusted",
      "2026-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baEpsAdjConsFy27e: mustVal(
      kg,
      "consensus_stockanalysis",
      "ba_eps_adjusted",
      "2027-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=stockanalysis" }
    ),
    baZacksEpsFy26e: mustVal(
      kg,
      "consensus_nasdaq_zacks_eps",
      "ba_eps_consensus",
      "2026-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=nasdaq_zacks" }
    ),
    baZacksEpsFy27e: mustVal(
      kg,
      "consensus_nasdaq_zacks_eps",
      "ba_eps_consensus",
      "2027-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=nasdaq_zacks" }
    ),
    baZacksEpsFy28e: mustVal(
      kg,
      "consensus_nasdaq_zacks_eps",
      "ba_eps_consensus",
      "2028-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=nasdaq_zacks" }
    ),
    baZacksEpsFy29e: mustVal(
      kg,
      "consensus_nasdaq_zacks_eps",
      "ba_eps_consensus",
      "2029-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=nasdaq_zacks" }
    ),
    baYahooEps90dAgoFy27e: mustVal(
      kg,
      "consensus_yahoo_dispersion",
      "ba_eps_trend_90d_ago",
      "2027-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=yahoo_analysis" }
    ),
    baYahooEpsCurrFy27e: mustVal(
      kg,
      "consensus_yahoo_dispersion",
      "ba_eps_trend_current",
      "2027-FY",
      { entity: "BA", basis: "consensus", dimension: "provider=yahoo_analysis" }
    ),
  }

  const peers = {} as Record<PeerEntity, PeerHistoricalRaw>
  for (const p of PEER_ENTITIES) {
    peers[p] = loadPeerRaw(kg, p)
  }

  const airbusIfrs: AirbusIfrsRaw = {
    capDevAdditionsFy25: mustVal(
      kg,
      "airbus_ifrs_adjustments",
      "cap_dev_additions",
      "2025-FY",
      { entity: "AIR.PA", basis: "ifrs" }
    ),
    capDevAmortFy25: mustVal(
      kg,
      "airbus_ifrs_adjustments",
      "cap_dev_amort_impairment",
      "2025-FY",
      { entity: "AIR.PA", basis: "ifrs" }
    ),
    rouDepFy25: mustVal(
      kg,
      "airbus_ifrs_adjustments",
      "rou_depreciation_impairment",
      "2025-FY",
      { entity: "AIR.PA", basis: "ifrs" }
    ),
    leaseCashRepaymentFy25: mustVal(
      kg,
      "airbus_ifrs_adjustments",
      "lease_liab_cash_repayment",
      "2025-FY",
      { entity: "AIR.PA", basis: "ifrs" }
    ),
  }

  const prices5yMonthly = loadPriceSeries(kg, "market_prices_5y_monthly")
  const prices2yWeekly = loadPriceSeries(kg, "market_prices_2y_weekly")

  return {
    ba,
    citations,
    market,
    peers,
    airbusIfrs,
    prices5yMonthly,
    prices2yWeekly,
  }
}
