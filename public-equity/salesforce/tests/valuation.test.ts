import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { CompiledModel } from "f8-engine"
import {
  buildSalesforceModel,
  compileAllScenarios,
  loadAuditedData,
  PEER_TICKERS,
  SCENARIO_KEYS,
  type ScenarioKey,
} from "../models/index.ts"
import { ALL_EQUITY_TICKERS } from "../models/timeline.ts"

function independentOlsBeta(
  eqCloses: readonly number[],
  mktCloses: readonly number[]
): number {
  const re: number[] = []
  const rm: number[] = []
  for (let i = 1; i < eqCloses.length; i++) {
    const e1 = eqCloses[i]
    const e0 = eqCloses[i - 1]
    const m1 = mktCloses[i]
    const m0 = mktCloses[i - 1]
    if (
      e1 === undefined ||
      e0 === undefined ||
      m1 === undefined ||
      m0 === undefined
    ) {
      throw new Error(`Missing price at index ${i}`)
    }
    re.push(e1 / e0 - 1)
    rm.push(m1 / m0 - 1)
  }
  const meanE = re.reduce((a, b) => a + b, 0) / re.length
  const meanM = rm.reduce((a, b) => a + b, 0) / rm.length
  let cov = 0
  let varM = 0
  for (let i = 0; i < re.length; i++) {
    const de = (re[i] ?? 0) - meanE
    const dm = (rm[i] ?? 0) - meanM
    cov += de * dm
    varM += dm * dm
  }
  return cov / varM
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? 0
  }
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

describe("Multi-horizon Hamada betas, ASC 842 consistency, DCF bridges, sensitivities & trading comps (C2-C5, C7)", () => {
  let compiled: Readonly<Record<ScenarioKey, CompiledModel>>

  beforeAll(() => {
    compiled = compileAllScenarios()
  })

  afterAll(() => {
    for (const key of SCENARIO_KEYS) {
      compiled[key].dispose()
    }
  })

  it("C2: reproduces all 14 complete-period OLS betas (n=59 M, n=103 W), spot prices (2026-11-18), and live Hamada unlevering/relevering plus constant scalars across scenarios", () => {
    const audited = loadAuditedData()
    const base = compiled.base

    // Uniform complete-period windows excluding partial Nov 2026 stub
    expect(audited.marketPrices.monthlyDates).toHaveLength(60)
    expect(audited.marketPrices.monthlyDates[0]).toBe("2021-11-30")
    expect(audited.marketPrices.monthlyDates.at(-1)).toBe("2026-10-30")
    expect(audited.marketPrices.weeklyDates).toHaveLength(104)
    expect(audited.marketPrices.weeklyDates[0]).toBe("2024-11-22")
    expect(audited.marketPrices.weeklyDates.at(-1)).toBe("2026-11-13")

    for (const ticker of ALL_EQUITY_TICKERS) {
      expect(base.num("BetaSummaryTable", ticker, "spot_px")).toBeCloseTo(
        audited.marketPrices.spotPrices[ticker],
        6
      )

      const exp5y = independentOlsBeta(
        audited.marketPrices.monthlyCloses[ticker],
        audited.marketPrices.monthlyCloses.SPY
      )
      const exp2y = independentOlsBeta(
        audited.marketPrices.weeklyCloses[ticker],
        audited.marketPrices.weeklyCloses.SPY
      )

      expect(
        base.inspectCell("BetaSummaryTable", ticker, "beta_5y_m").isFormula
      ).toBe(true)
      expect(
        base.inspectCell("BetaSummaryTable", ticker, "beta_2y_w").isFormula
      ).toBe(true)
      expect(
        Math.abs(base.num("BetaSummaryTable", ticker, "beta_5y_m") - exp5y)
      ).toBeLessThan(1e-6)
      expect(
        Math.abs(base.num("BetaSummaryTable", ticker, "beta_2y_w") - exp2y)
      ).toBeLessThan(1e-6)
    }

    expect(base.num("BetaSummaryTable", "CRM", "spot_px")).toBeCloseTo(190.4, 6)
    expect(base.num("BetaSummaryTable", "CRM", "beta_5y_m")).toBeCloseTo(
      1.2233,
      3
    )
    expect(base.num("BetaSummaryTable", "CRM", "beta_2y_w")).toBeCloseTo(
      1.0781,
      3
    )

    // Constant economy-wide ERP, curve term premium, and completed-window ASR VWAP across Downside, Base, Upside
    for (const driverKey of [
      "erp",
      "expectedAsrAvgPrice",
      "histBeta5yDe",
      "histBeta2yDe",
      "longBondCurvePremium",
      "maAcquiredNowcPctCash",
    ] as const) {
      const vBase = compiled.base.num("ScalarDrivers", driverKey, "active")
      const vUpside = compiled.upside.num("ScalarDrivers", driverKey, "active")
      const vDownside = compiled.downside.num(
        "ScalarDrivers",
        driverKey,
        "active"
      )
      expect(Math.abs(vUpside - vBase)).toBeLessThan(1e-12)
      expect(Math.abs(vDownside - vBase)).toBeLessThan(1e-12)
    }

    // Live Hamada unlevering & relevering for both 5Y-M (primary) and 2Y-W (short_regime)
    for (const key of SCENARIO_KEYS) {
      const m = compiled[key]
      const t = m.num("WaccSchedule", "tax_rate", "primary")
      const currDe = m.num("WaccSchedule", "current_de", "primary")

      for (const col of ["primary", "short_regime"] as const) {
        const rawB = m.num("WaccSchedule", "raw_beta", col)
        const histDe = m.num("WaccSchedule", "hist_lookback_de", col)
        const unlevB = m.num("WaccSchedule", "unlevered_beta", col)
        const relevB = m.num("WaccSchedule", "relevered_beta", col)

        const expUnlev = rawB / (1 + (1 - t) * histDe)
        const expRelev = expUnlev * (1 + (1 - t) * currDe)

        expect(Math.abs(unlevB - expUnlev)).toBeLessThan(1e-9)
        expect(Math.abs(relevB - expRelev)).toBeLessThan(1e-9)
        expect(currDe).toBeGreaterThan(histDe)
        expect(relevB).toBeGreaterThan(rawB)
        expect(rawB).toBeGreaterThan(unlevB)
      }
    }
  })

  it("C3: excludes ASC 842 operating lease liabilities from EV/WACC and ROU amortization from GAAP/Adj. EBITDA, with scenario-invariant TradingCompsTable[CRM, ev]", () => {
    const base = compiled.base

    // GAAP EBITDA excludes ASC 842 operating lease ROU amortization across historical, forecast, and LTM bridges
    const fy26IsEbitda = base.num("IncomeStatement", "gaap_ebitda", "FY26A")
    const fy26LtmEbitda = base.num(
      "LtmCashFlowAndH1Anchors",
      "gaap_ebitda",
      "FY26A"
    )
    expect(Math.abs(fy26IsEbitda - fy26LtmEbitda)).toBeLessThan(1e-6)
    expect(fy26IsEbitda).toBeCloseTo(11395, 6)

    for (const p of ["FY24A", "FY25A", "FY26A", "FY27E", "FY31E"] as const) {
      const ebit = base.num("IncomeStatement", "operating_income", p)
      const daTotal = base.num("CashFlowStatement", "da_expense", p)
      const rouAmort = base.num(
        "PpeAndIntangiblesSchedule",
        "op_lease_rou_amort",
        p
      )
      expect(rouAmort).toBeGreaterThan(400)
      expect(
        Math.abs(
          base.num("IncomeStatement", "gaap_ebitda", p) -
            (ebit + daTotal - rouAmort)
        )
      ).toBeLessThan(1e-6)
    }

    const ltmEbit = base.num(
      "LtmOperatingBridge",
      "operating_income",
      "LTM_Q2_27"
    )
    const ltmDa = base.num("LtmOperatingBridge", "da_expense", "LTM_Q2_27")
    const ltmChgOpLease = base.num(
      "LtmOperatingBridge",
      "chg_operating_lease_liabilities",
      "LTM_Q2_27"
    )
    expect(ltmChgOpLease).toBeCloseTo(-574, 6)
    expect(
      base.num("LtmCashFlowAndH1Anchors", "gaap_ebitda", "LTM_Q2_27")
    ).toBeCloseTo(ltmEbit + ltmDa + ltmChgOpLease, 6)
    expect(
      base.num("LtmCashFlowAndH1Anchors", "gaap_ebitda", "LTM_Q2_27")
    ).toBeCloseTo(12083, 6)

    // WaccSchedule funded_debt_and_fin_leases excludes $2,455M operating leases
    const grossDebtQ2 = base.num(
      "Q2BalanceSheetAnchor",
      "total_gross_debt",
      "Q2_FY27A"
    )
    const finLeasesQ2 = base.num(
      "Q2BalanceSheetAnchor",
      "total_fin_leases",
      "Q2_FY27A"
    )
    const opLeasesQ2 = base.num(
      "Q2BalanceSheetAnchor",
      "total_op_leases",
      "Q2_FY27A"
    )
    expect(opLeasesQ2).toBeCloseTo(2455, 6)
    expect(
      base.num("WaccSchedule", "funded_debt_and_fin_leases", "primary")
    ).toBeCloseTo(grossDebtQ2 + finLeasesQ2, 6)

    // EvToEquityBridge does not contain less_op_leases
    expect(base.table("EvToEquityBridge").rows).not.toContain("less_op_leases")

    // InvestedCapitalAndRoic Financing Side excludes operating leases
    expect(base.table("InvestedCapitalAndRoic").rows).not.toContain(
      "op_lease_liabilities"
    )

    // PeerEvBridge[total_debt_leases_pref] excludes peer operating leases across all 6 peers
    for (const peer of PEER_TICKERS) {
      const debtCur = base.num("PeerEvBridge", "debt_current", peer)
      const debtNc = base.num("PeerEvBridge", "debt_noncurrent", peer)
      const pref = base.num("PeerEvBridge", "pref_stock", peer)
      const nci = base.num("PeerEvBridge", "nci", peer)
      const totalDebtPref = base.num(
        "PeerEvBridge",
        "total_debt_leases_pref",
        peer
      )
      expect(
        Math.abs(totalDebtPref - (debtCur + debtNc + pref + nci))
      ).toBeLessThan(1e-6)
    }

    // TradingCompsTable[CRM, ev] matches Base post-ASR mkt cap + funded debt + fin leases - cash (ex-op-leases)
    const crmMktCap = base.num("TradingCompsTable", "CRM", "mkt_cap")
    const cashMktQ2 = base.num(
      "Q2BalanceSheetAnchor",
      "total_cash_and_mkt",
      "Q2_FY27A"
    )
    const expCrmEv = crmMktCap + grossDebtQ2 + finLeasesQ2 - cashMktQ2
    expect(
      Math.abs(base.num("TradingCompsTable", "CRM", "ev") - expCrmEv)
    ).toBeLessThan(1e-6)

    // Strictly invariant across Downside, Base, and Upside compilations
    const crmEvBase = compiled.base.num("TradingCompsTable", "CRM", "ev")
    const crmEvUpside = compiled.upside.num("TradingCompsTable", "CRM", "ev")
    const crmEvDownside = compiled.downside.num(
      "TradingCompsTable",
      "CRM",
      "ev"
    )
    expect(Math.abs(crmEvUpside - crmEvBase)).toBeLessThan(1e-6)
    expect(Math.abs(crmEvDownside - crmEvBase)).toBeLessThan(1e-6)

    const crmNetStratBase = compiled.base.num(
      "TradingCompsTable",
      "CRM_net_strat",
      "ev"
    )
    expect(
      Math.abs(
        compiled.upside.num("TradingCompsTable", "CRM_net_strat", "ev") -
          crmNetStratBase
      )
    ).toBeLessThan(1e-6)
    expect(
      Math.abs(
        compiled.downside.num("TradingCompsTable", "CRM_net_strat", "ev") -
          crmNetStratBase
      )
    ).toBeLessThan(1e-6)
  })

  it("C4: enforces mid-year Gordon TV, exact closed-form implied_perp_g inversion, BS-date equity roll at Ke less Q3 div, and 1e-6 bridge/sensitivity closure", () => {
    const rollFrac = 110 / 365

    for (const key of SCENARIO_KEYS) {
      const m = compiled[key]

      // Mid-year Gordon TV check: TV = (FCFF_term / (WACC - g)) * (1 + WACC)^m
      const wacc = m.num("WaccSchedule", "wacc", "primary")
      const ke = m.num("WaccSchedule", "ke", "primary")
      const afterTaxKd = m.num("WaccSchedule", "aftertax_kd", "primary")
      const g = m.num("ScalarDrivers", "terminalGrowthRate", "active")
      const reinv = m.num("ScalarDrivers", "terminalReinvestmentRate", "active")
      const midFactor = m.num("ScalarDrivers", "midPeriodFactor", "active")
      const termFcff = m.num("DcfModel", "unlevered_fcff", "terminal")
      const tvGordon = m.num("DcfSummaryTable", "terminal_value", "gordon")
      const expTvGordon =
        (termFcff / (wacc - g)) * Math.pow(1 + wacc, midFactor)
      expect(Math.abs(tvGordon - expTvGordon)).toBeLessThan(1e-6)

      // Braze discounted 1.0 yr at after-tax Kd
      const brazeCash = m.num("ScalarDrivers", "brazeAcquisitionCash", "active")
      const brazeBridge = m.num(
        "EvToEquityBridge",
        "less_pending_braze",
        "gordon"
      )
      expect(
        Math.abs(brazeBridge - -brazeCash / (1 + afterTaxKd))
      ).toBeLessThan(1e-6)

      // EV-to-Equity BS-date closure + 110-day Ke equity roll less Q3 dividend
      const evOpBs = m.num("EvToEquityBridge", "operating_ev", "gordon")
      const netBridge = m.num("EvToEquityBridge", "net_non_op_bridge", "gordon")
      const eqBs = m.num("EvToEquityBridge", "implied_equity_bs_date", "gordon")
      const eqRoll = m.num(
        "EvToEquityBridge",
        "plus_equity_roll_forward",
        "gordon"
      )
      const q3Div = m.num("EvToEquityBridge", "less_q3_dividend", "gordon")
      const eqVal = m.num("EvToEquityBridge", "implied_equity_value", "gordon")
      const pfShares = m.num("EvToEquityBridge", "pf_diluted_shares", "gordon")
      const dpsFy27 = m.num("PeriodDriversActive", "dividendsPerShare", "FY27E")
      const pxGordon = m.num(
        "EvToEquityBridge",
        "implied_share_price",
        "gordon"
      )

      expect(Math.abs(evOpBs + netBridge - eqBs)).toBeLessThan(1e-6)
      expect(
        Math.abs(eqRoll - eqBs * (Math.pow(1 + ke, rollFrac) - 1))
      ).toBeLessThan(1e-6)
      expect(Math.abs(q3Div - -0.25 * dpsFy27 * pfShares)).toBeLessThan(1e-6)
      expect(Math.abs(eqBs + eqRoll + q3Div - eqVal)).toBeLessThan(1e-6)
      expect(Math.abs(eqVal / pfShares - pxGordon)).toBeLessThan(1e-6)
      expect(
        Math.abs(m.num("EvToEquityBridge", "bridge_tie_check", "gordon"))
      ).toBeLessThan(1e-6)

      // Scenario Variance Bridge closure
      const vBase = m.num(
        "ScenarioVarianceBridge",
        "base_case_price",
        "val_per_share"
      )
      const vOp = m.num(
        "ScenarioVarianceBridge",
        "delta_operating_cf",
        "val_per_share"
      )
      const vRate = m.num(
        "ScenarioVarianceBridge",
        "delta_discount_and_tv",
        "val_per_share"
      )
      const vBridge = m.num(
        "ScenarioVarianceBridge",
        "delta_nonop_bridge_shares",
        "val_per_share"
      )
      const vActive = m.num(
        "ScenarioVarianceBridge",
        "active_case_price",
        "val_per_share"
      )

      expect(Math.abs(vBase + vOp + vRate + vBridge - vActive)).toBeLessThan(
        1e-6
      )
      expect(Math.abs(vActive - pxGordon)).toBeLessThan(1e-6)
      expect(
        Math.abs(
          m.num("ScenarioVarianceBridge", "variance_tie_check", "val_per_share")
        )
      ).toBeLessThan(1e-6)

      if (key === "base") {
        expect(Math.abs(vOp)).toBeLessThan(1e-6)
        expect(Math.abs(vRate)).toBeLessThan(1e-6)
        expect(Math.abs(vBridge)).toBeLessThan(1e-6)
      }

      // Sensitivity center cell matches active Gordon DCF price identically
      expect(
        Math.abs(
          m.num("SensitivityWaccVsGrowth", "w_base", "g_base") - pxGordon
        )
      ).toBeLessThan(1e-6)

      // Sensitivity monotonicity: lower WACC & higher g => higher implied price
      expect(
        m.num("SensitivityWaccVsGrowth", "w_m100", "g_base")
      ).toBeGreaterThan(m.num("SensitivityWaccVsGrowth", "w_p100", "g_base"))
      expect(
        m.num("SensitivityWaccVsGrowth", "w_base", "g_p100")
      ).toBeGreaterThan(m.num("SensitivityWaccVsGrowth", "w_base", "g_m100"))

      // Reverse-DCF 2D monotonicity across 8.50%-11.00% WACC and 4%-12% 4-yr revenue CAGR
      expect(m.num("ReverseDcfMatrix", "wacc_850", "cagr_8")).toBeGreaterThan(
        m.num("ReverseDcfMatrix", "wacc_1100", "cagr_8")
      )
      expect(m.num("ReverseDcfMatrix", "wacc_975", "cagr_12")).toBeGreaterThan(
        m.num("ReverseDcfMatrix", "wacc_975", "cagr_4")
      )

      // Terminal cross-check consistency
      const tvExit = m.num("DcfSummaryTable", "terminal_value", "exit_mult")
      const impliedGExit = m.num(
        "DcfSummaryTable",
        "implied_perp_g",
        "exit_mult"
      )
      expect(
        Math.abs(
          m.num("DcfSummaryTable", "terminal_reinvest_rate", "gordon") - reinv
        )
      ).toBeLessThan(1e-9)
      expect(
        m.num("DcfSummaryTable", "implied_exit_ev_ebitda", "gordon")
      ).toBeGreaterThan(5)
      expect(
        m.num("DcfSummaryTable", "implied_exit_ev_ebitda", "gordon")
      ).toBeLessThan(20)
      if (tvExit > tvGordon) {
        expect(impliedGExit).toBeGreaterThan(g)
      } else {
        expect(impliedGExit).toBeLessThanOrEqual(g + 1e-9)
      }
    }

    // Plugging exact Gordon implied exit multiple into Exit Multiple column recovers exact terminalGrowthRate (< 1e-6)
    const gordonImpliedMult = compiled.base.num(
      "DcfSummaryTable",
      "implied_exit_ev_ebitda",
      "gordon"
    )
    const invertModel = buildSalesforceModel({ scenario: "base" })
    invertModel
      .getTable("ScalarDrivers")
      .setCell("exitEbitdaMultiple", "base", gordonImpliedMult)
    const invertCompiled = invertModel.compile()
    try {
      const recoveredG = invertCompiled.num(
        "DcfSummaryTable",
        "implied_perp_g",
        "exit_mult"
      )
      const baseG = invertCompiled.num(
        "ScalarDrivers",
        "terminalGrowthRate",
        "active"
      )
      expect(Math.abs(recoveredG - baseG)).toBeLessThan(1e-6)
    } finally {
      invertCompiled.dispose()
    }

    // Economic ordering across scenarios: Downside < Base < Upside
    expect(
      compiled.downside.num("EvToEquityBridge", "implied_share_price", "gordon")
    ).toBeLessThan(
      compiled.base.num("EvToEquityBridge", "implied_share_price", "gordon")
    )
    expect(
      compiled.base.num("EvToEquityBridge", "implied_share_price", "gordon")
    ).toBeLessThan(
      compiled.upside.num("EvToEquityBridge", "implied_share_price", "gordon")
    )
  })

  it("C5: strips strategic-investment deferred tax in LtmCashFlowAndH1Anchors[unlevered_fcff] and removes phantom M&A WC OCF in FY27E-FY28E", () => {
    const base = compiled.base

    // H1 FY27A unlevered_fcff strips gains * ETR and reconciles exactly to OCF - SBC - after-tax non-op interest/other - CapEx - FinLeases
    const h1Ocf = base.num(
      "LtmOperatingBridge",
      "operating_cash_flow",
      "H1_FY27A"
    )
    const h1Sbc = base.num("LtmOperatingBridge", "sbc_expense", "H1_FY27A")
    const h1IntOther = base.num(
      "LtmOperatingBridge",
      "interest_and_other_net",
      "H1_FY27A"
    )
    const h1Etr = base.num(
      "LtmCashFlowAndH1Anchors",
      "effective_tax_rate",
      "H1_FY27A"
    )
    const h1Capex = base.num("LtmOperatingBridge", "capex", "H1_FY27A")
    const h1FinLease = base.num(
      "LtmOperatingBridge",
      "principal_payments_financing_obligations",
      "H1_FY27A"
    )
    const h1Fcff = base.num(
      "LtmCashFlowAndH1Anchors",
      "unlevered_fcff",
      "H1_FY27A"
    )
    const expH1Fcff =
      h1Ocf - h1Sbc - h1IntOther * (1 - h1Etr) + h1Capex + h1FinLease
    expect(Math.abs(h1Fcff - expH1Fcff)).toBeLessThan(1e-6)

    // FY26A unlevered_fcff matches identically between QoeAndCashConversion and LtmCashFlowAndH1Anchors
    expect(
      Math.abs(
        base.num("QoeAndCashConversion", "unlevered_fcff", "FY26A") -
          base.num("LtmCashFlowAndH1Anchors", "unlevered_fcff", "FY26A")
      )
    ).toBeLessThan(1e-6)

    // H2 FY27E stub reflects full +$715M restoration from E4 (while also deducting -$264M FY27E acquired M&A WC adj)
    const h2StubFcff = base.num("DcfModel", "unlevered_fcff", "H2_FY27E")
    const acqWcFy27 = base.num(
      "CashFlowStatement",
      "acquired_ma_wc_adj",
      "FY27E"
    )
    const acqWcFy28 = base.num(
      "CashFlowStatement",
      "acquired_ma_wc_adj",
      "FY28E"
    )
    expect(acqWcFy27).toBeLessThan(-250)
    expect(acqWcFy28).toBeLessThan(-200)
    expect(h2StubFcff).toBeGreaterThan(4800)
    expect(h2StubFcff - acqWcFy27).toBeGreaterThan(5000)

    // Balance check remains exact 0 despite acquired M&A WC removal
    expect(
      Math.abs(base.num("BalanceSheet", "balance_check", "FY27E"))
    ).toBeLessThan(1e-6)
    expect(
      Math.abs(base.num("BalanceSheet", "balance_check", "FY28E"))
    ).toBeLessThan(1e-6)
  })

  it("C7: validates live spot pro-forma FY28E FCFF yield, TerminalReinvestSensitivity, and IcStressScenarios monotonicity & Base anchor tie-outs", () => {
    const base = compiled.base
    const basePx = base.num("EvToEquityBridge", "implied_share_price", "gordon")

    // Spot pro-forma Operating EV & FY28E FCFF yield live checks
    const mktCap = base.num("WaccSchedule", "market_cap", "primary")
    const netBridge = base.num(
      "EvToEquityBridge",
      "net_non_op_bridge",
      "gordon"
    )
    const spotPfEv = base.num(
      "DcfSummaryTable",
      "spot_pf_operating_ev",
      "gordon"
    )
    const fy28Fcff = base.num("DcfModel", "unlevered_fcff", "FY28E")
    const spotYield = base.num(
      "DcfSummaryTable",
      "spot_fy28_fcff_yield",
      "gordon"
    )
    const spotSpread = base.num(
      "DcfSummaryTable",
      "spot_fcff_yield_spread_vs_ust",
      "gordon"
    )
    const dgs10 = base.num("MacroRatesTable", "dgs10", "val")

    expect(Math.abs(spotPfEv - (mktCap - netBridge))).toBeLessThan(1e-6)
    expect(Math.abs(spotYield - fy28Fcff / spotPfEv)).toBeLessThan(1e-9)
    expect(Math.abs(spotSpread - (spotYield - dgs10))).toBeLessThan(1e-9)
    expect(spotYield).toBeGreaterThan(0.05)

    // TerminalReinvestSensitivity monotonic ordering & Base/Bull anchor tie-outs
    const reinvRows = [
      "reinv_m4",
      "reinv_m2",
      "reinv_0",
      "reinv_p4",
      "reinv_p6",
    ] as const
    const reinvPrices = reinvRows.map((r) =>
      base.num("TerminalReinvestSensitivity", r, "implied_price")
    )
    for (let i = 1; i < reinvPrices.length; i++) {
      expect(reinvPrices[i - 1] ?? 0).toBeGreaterThan(reinvPrices[i] ?? 0)
    }
    expect(
      Math.abs(
        base.num("TerminalReinvestSensitivity", "reinv_0", "implied_price") -
          basePx
      )
    ).toBeLessThan(1e-6)
    expect(
      Math.abs(
        compiled.upside.num(
          "TerminalReinvestSensitivity",
          "reinv_m2",
          "implied_price"
        ) -
          compiled.upside.num(
            "EvToEquityBridge",
            "implied_share_price",
            "gordon"
          )
      )
    ).toBeLessThan(1e-6)

    // IcStressScenarios anchor tie-out across all 3 scenarios + economic ordering in Base
    for (const key of SCENARIO_KEYS) {
      const m = compiled[key]
      expect(
        Math.abs(
          m.num("IcStressScenarios", "base_anchor", "implied_price") -
            m.num("EvToEquityBridge", "implied_share_price", "gordon")
        )
      ).toBeLessThan(1e-6)
      expect(
        Math.abs(m.num("IcStressScenarios", "base_anchor", "delta_vs_base"))
      ).toBeLessThan(1e-6)
    }

    const px2yW = base.num("IcStressScenarios", "beta_2y_w", "implied_price")
    const pxDebtFv = base.num(
      "IcStressScenarios",
      "debt_fv_cushion",
      "implied_price"
    )
    const pxDelev = base.num(
      "IcStressScenarios",
      "deleveraged_wacc",
      "implied_price"
    )
    const pxFlatMgn = base.num(
      "IcStressScenarios",
      "flat_fy27_ebita_mgn",
      "implied_price"
    )
    const pxMaLeak = base.num(
      "IcStressScenarios",
      "ongoing_ma_leakage",
      "implied_price"
    )

    // Verify deleveraged_wacc uses exact unlevered Ke_U = Rf + beta_U * ERP > levered WACC
    const expectedRu =
      base.num("WaccSchedule", "rf", "primary") +
      base.num("WaccSchedule", "unlevered_beta", "primary") *
        base.num("WaccSchedule", "erp", "primary")
    expect(
      Math.abs(
        base.num("IcStressScenarios", "deleveraged_wacc", "key_param") -
          expectedRu
      )
    ).toBeLessThan(1e-9)
    expect(expectedRu).toBeGreaterThan(
      base.num("WaccSchedule", "wacc", "primary")
    )

    // Verify ongoing_ma_leakage models $1,500M/yr 50% NPV leakage with TY1 grown by (1 + g)
    const maLeakAmt = base.num(
      "IcStressScenarios",
      "ongoing_ma_leakage",
      "key_param"
    )
    expect(maLeakAmt).toBeCloseTo(1500, 6)
    const waccBase = base.num("WaccSchedule", "wacc", "primary")
    const gBase = base.num("ScalarDrivers", "terminalGrowthRate", "active")
    const midBase = base.num("ScalarDrivers", "midPeriodFactor", "active")
    const expLeakPv =
      maLeakAmt *
        (base.num("DcfModel", "discount_factor", "FY29E") +
          base.num("DcfModel", "discount_factor", "FY30E") +
          base.num("DcfModel", "discount_factor", "FY31E")) +
      ((maLeakAmt * (1 + gBase)) / (waccBase - gBase)) *
        Math.pow(1 + waccBase, midBase) *
        base.num("DcfModel", "discount_factor", "terminal")
    expect(
      Math.abs(
        base.num("IcStressScenarios", "ongoing_ma_leakage", "operating_ev_bs") -
          (base.num("DcfSummaryTable", "operating_ev_bs_date", "gordon") -
            expLeakPv)
      )
    ).toBeLessThan(1e-6)

    expect(px2yW).toBeGreaterThan(pxDebtFv)
    expect(pxDebtFv).toBeGreaterThan(basePx)
    expect(basePx).toBeGreaterThan(pxDelev)
    expect(pxDelev).toBeGreaterThan(pxFlatMgn)
    expect(pxFlatMgn).toBeGreaterThan(pxMaLeak)

    // Note 8 Fixed-Rate Debt Fair-Value Cushion (2026-11-18, +95 bps 20Y-40Y term premium): all 2041-2066 bonds below par
    expect(
      base.num("DebtTrancheRegistry", "total_debt", "est_fair_value")
    ).toBeLessThan(base.num("DebtTrancheRegistry", "total_debt", "carrying"))
    for (const longId of [
      "senior_notes_jul_2041",
      "senior_notes_mar_2046",
      "senior_notes_jul_2051",
      "senior_notes_mar_2056",
      "senior_notes_jul_2061",
      "senior_notes_mar_2066",
    ] as const) {
      expect(
        base.num("DebtTrancheRegistry", longId, "est_fair_value")
      ).toBeLessThan(base.num("DebtTrancheRegistry", longId, "principal"))
    }
    // Spot-check 2026-11-18 semi-annual PV math on 6.40% Senior Notes due Mar 2046 (+95 bps long-bond yield)
    const yLong =
      base.num("MacroRatesTable", "marginal_pretax_kd", "val") +
      base.num("ScalarDrivers", "longBondCurvePremium", "active")
    const yLongHalf = yLong / 2
    const daysTo2046 =
      (Date.UTC(2046, 2, 15) - Date.UTC(2026, 10, 18)) / 86_400_000
    const nSemi2046 = 2 * (daysTo2046 / 365)
    const expFv2046 =
      1500 *
      (((0.064 / 2) * (1 - Math.pow(1 + yLongHalf, -nSemi2046))) / yLongHalf +
        Math.pow(1 + yLongHalf, -nSemi2046))
    expect(
      Math.abs(
        base.num(
          "DebtTrancheRegistry",
          "senior_notes_mar_2046",
          "est_fair_value"
        ) - expFv2046
      )
    ).toBeLessThan(1e-6)
  })

  it("Reconciles TradingCompsTable summaries cleanly (excluding ORCL negative cash flow multiples without #N/A propagation)", () => {
    const base = compiled.base
    const comps = base.table("TradingCompsTable")

    // ORCL negative cash flow multiples cleanly null (excluded) with cell-level exclusion notes
    for (const excludedCol of [
      "ev_ebitda_capex",
      "ev_fcf",
      "ev_fcf_sbc",
    ] as const) {
      expect(comps.value("ORCL", excludedCol)).toBeNull()
      const inspected = base.inspectCell(
        "TradingCompsTable",
        "ORCL",
        excludedCol
      )
      expect(inspected.evaluatedValue).toBe("Empty")
      expect(inspected.isFormula).toBe(false)
      expect(inspected.note).toContain("Excluded from peer mean and median")
    }
    expect(comps.value("ORCL", "ltm_basis")).toBe("LTM Q1 FY27 (Aug)")
    expect(
      base.inspectCell("TradingCompsTable", "ORCL", "item").note
    ).toBeNull()

    // Check All-6 Mean/Median and Mature Low-SBC (ADBE & INTU) Mean/Median independently
    const colsToCheck = [
      "ev_rev",
      "ev_ebitda",
      "ev_adj_ebitda",
      "ev_ebitda_capex",
      "ev_fcf",
      "ev_fcf_sbc",
      "pe_fy1",
      "pe_fy2",
    ] as const

    for (const col of colsToCheck) {
      const allVals: number[] = []
      for (const peer of PEER_TICKERS) {
        const v = comps.value(peer, col)
        if (typeof v === "number") allVals.push(v)
      }
      const matureVals = [comps.num("ADBE", col), comps.num("INTU", col)]

      const expAllMean = allVals.reduce((a, b) => a + b, 0) / allVals.length
      const expAllMed = median(allVals)
      const expMatMean =
        matureVals.reduce((a, b) => a + b, 0) / matureVals.length
      const expMatMed = median(matureVals)

      expect(
        Math.abs(comps.num("all_peer_mean", col) - expAllMean)
      ).toBeLessThan(1e-6)
      expect(
        Math.abs(comps.num("all_peer_median", col) - expAllMed)
      ).toBeLessThan(1e-6)
      expect(Math.abs(comps.num("mature_mean", col) - expMatMean)).toBeLessThan(
        1e-6
      )
      expect(
        Math.abs(comps.num("mature_median", col) - expMatMed)
      ).toBeLessThan(1e-6)
    }

    // Check CompsImpliedValuation uses standalone LTM net bridge (excl. unclosed M&A & op leases)
    const standaloneBridge = base.num(
      "EvToEquityBridge",
      "standalone_ltm_net_bridge",
      "gordon"
    )
    const dcfBridge = base.num(
      "EvToEquityBridge",
      "net_non_op_bridge",
      "gordon"
    )
    const pendingMaPv =
      base.num("AuditedFootnoteAnchors", "pending_q3_ma_total", "val") -
      base.num("EvToEquityBridge", "less_pending_braze", "gordon")
    expect(Math.abs(standaloneBridge - dcfBridge - pendingMaPv)).toBeLessThan(
      1e-6
    )

    // CRM EV/(FCF - SBC) matches peer OCF - CapEx - SBC basis; CRM_net_strat shows finance-lease-inclusive Economic FCF
    expect(
      base.num("CompsImpliedValuation", "ev_fcf_sbc", "crm_metric")
    ).toBeCloseTo(
      base.num("LtmCashFlowAndH1Anchors", "fcf_ex_sbc", "LTM_Q2_27"),
      6
    )
    expect(comps.num("CRM", "ev_fcf_sbc")).toBeCloseTo(
      comps.num("CRM", "ev") /
        base.num("LtmCashFlowAndH1Anchors", "fcf_ex_sbc", "LTM_Q2_27"),
      6
    )
    expect(comps.num("CRM_net_strat", "ev_fcf_sbc")).toBeCloseTo(
      comps.num("CRM_net_strat", "ev") /
        base.num("LtmCashFlowAndH1Anchors", "economic_fcf", "LTM_Q2_27"),
      6
    )

    const pfShares = base.num("EvToEquityBridge", "pf_diluted_shares", "gordon")
    const matEv = base.num(
      "CompsImpliedValuation",
      "ev_gaap_ebitda",
      "mature_ev"
    )
    const matPx = base.num(
      "CompsImpliedValuation",
      "ev_gaap_ebitda",
      "mature_px"
    )
    expect(
      Math.abs((matEv + standaloneBridge) / pfShares - matPx)
    ).toBeLessThan(1e-6)

    // Memo finance-lease-inclusive Economic FCF implied price < peer-basis FCF - SBC implied price
    expect(
      base.num("CompsImpliedValuation", "ev_econ_fcf_memo", "mature_px")
    ).toBeLessThan(base.num("CompsImpliedValuation", "ev_fcf_sbc", "mature_px"))
  })
})
