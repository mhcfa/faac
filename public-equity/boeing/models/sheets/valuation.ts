import { Cell, type Sheet } from "f8-engine"
import type { BoeingKgData } from "../kg-loader.ts"
import {
  FORECAST_PERIODS,
  FORECAST_PERIOD_HEADERS,
  FULL_YEAR_PROJ_COLS,
} from "../timeline.ts"

const POST_NOL_COLS = ["2033E", "2034E", "2035E", "2036E", "2037E"] as const

/**
 * Exact 4-regime closed-form piecewise diluted share-price solver jointly
 * resolving BOTH the BA-PRA mandatory convertible collar ($142.98 / $171.59)
 * and the Spirit 3.25% Exchangeable Notes TSM strike ($149.10) with zero circularity.
 */
export function piecewiseDilutedPriceExpr(
  ePreExpr: string,
  tablePrefix = "EvToEquityBridge"
): string {
  const e1 = `${tablePrefix}["e_1_threshold", "val"]`
  const e2 = `${tablePrefix}["e_2_threshold", "val"]`
  const e3 = `${tablePrefix}["e_3_threshold", "val"]`
  const sBase = `${tablePrefix}["s_base", "val"]`
  const sMax = `${tablePrefix}["collar_s_max", "val"]`
  const sMin = `${tablePrefix}["collar_s_min", "val"]`
  const fPra = `${tablePrefix}["pref_face_value", "val"]`
  const sExch = `SecurityValuationInputs["spirit_exch_underlying_shares", "val"]`
  const fExch = `SecurityValuationInputs["spirit_exch_principal", "val"]`
  return (
    `IF(${ePreExpr} <= ${e1}, ${ePreExpr} / (${sBase} + ${sMax}), ` +
    `IF(${ePreExpr} <= ${e2}, (${ePreExpr} - ${fPra}) / ${sBase}, ` +
    `IF(${ePreExpr} <= ${e3}, (${ePreExpr} - ${fPra} + ${fExch}) / (${sBase} + ${sExch}), ` +
    `(${ePreExpr} + ${fExch}) / (${sBase} + ${sMin} + ${sExch}))))`
  )
}

export function buildValuationSheet(sheet: Sheet, kg: BoeingKgData): void {
  const { ba, market } = kg

  // =========================================================================
  // BAND 1 LEFT: WaccBuild + SecurityValuationInputs
  // =========================================================================
  const wacc = sheet.addTable(
    "WaccBuild",
    "Weighted Average Cost of Capital (WACC)",
    {
      subtitle: [
        "As of November 20, 2026 | 25.0% combined tax rate",
        "Scenario capital structure & OLS / Hamada equity beta",
      ],
    }
  )
  wacc.addColumn("item", { role: "descriptor", headers: ["Component"] })
  wacc.addColumn("val", { headers: ["Active"], style: "bold" })
  wacc.addColumn("notes", { role: "descriptor", headers: ["Basis / Source"] })

  wacc.addSectionHeader("Cost of equity (CAPM)")
  wacc.addRow("rf_rate", {
    cells: {
      item: "10-Year US Treasury yield (Rf)",
      val: market.dgs10,
      notes: "FRED H.15 10Y Constant Maturity (Nov 19)",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("erp", {
    cells: {
      item: "Implied US equity risk premium",
      val: market.damodaranErp,
      notes: "Damodaran S&P 500 implied ERP (Nov 1)",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("relevered_ig_beta", {
    cells: {
      item: "Hamada re-levered IG OEM beta",
      val: new Cell({
        expr: `ScalarDrivers["targetAssetBeta", "active"] * (1 + (1 - @table["tax_rate", "val"]) * (@table["weight_debt", "val"] / @table["weight_equity", "val"]))`,
      }),
      notes: "Airbus 0.86 asset beta via Hamada (25% tax)",
    },
    format: "number",
    decimals: 3,
  })
  wacc.addRow("equity_beta", {
    cells: {
      item: "Active equity beta",
      val: new Cell({
        expr: `CHOOSE(ScalarDrivers["betaRegime", "active"], BetaStats2Y["raw_beta", "BA"], BetaStats5Y["raw_beta", "BA"], @table["relevered_ig_beta", "val"])`,
      }),
      notes: "1 = 2Y OLS, 2 = 5Y OLS, 3 = IG Hamada",
    },
    format: "number",
    decimals: 3,
  })
  wacc.addRow("cost_of_equity", {
    cells: {
      item: "Cost of equity (Ke)",
      val: new Cell({
        expr: `@table["rf_rate", "val"] + @table["equity_beta", "val"] * @table["erp", "val"]`,
      }),
      notes: null,
    },
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })

  wacc.addRowGutter()
  wacc.addSectionHeader("After-tax cost of debt")
  wacc.addRow("bbb_yield", {
    cells: {
      item: "ICE BofA US Corporate BBB yield",
      val: market.bbbEffYield,
      notes: "FRED BAMLC0A4CBBBEY (Nov 20, 2026)",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("bb_yield", {
    cells: {
      item: "ICE BofA US High Yield BB yield",
      val: market.bbHyEffYield,
      notes: "FRED BAMLH0A1HYBBEY (Nov 20, 2026)",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("kd_pretax", {
    cells: {
      item: "Marginal pre-tax cost of debt",
      val: new Cell({
        expr: `ScalarDrivers["kdBbWeight", "active"] * @table["bb_yield", "val"] + (1 - ScalarDrivers["kdBbWeight", "active"]) * @table["bbb_yield", "val"]`,
      }),
      notes: "50/50 Base, 100% BB Down, 100% BBB Up",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("tax_rate", {
    cells: {
      item: "Combined marginal tax rate",
      val: new Cell({
        expr: `ScalarDrivers["statutoryTaxRate", "active"] + ScalarDrivers["foreignStateTaxRate", "active"]`,
      }),
      notes: "21.0% federal + 4.0% foreign/state",
    },
    format: "percentage",
    decimals: 1,
  })
  wacc.addRow("kd_aftertax", {
    cells: {
      item: "After-tax cost of debt",
      val: new Cell({
        expr: `@table["kd_pretax", "val"] * (1 - @table["tax_rate", "val"])`,
      }),
      notes: null,
    },
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })

  wacc.addRowGutter()
  wacc.addSectionHeader("Capital structure weights & WACC")
  wacc.addRow("mkt_equity", {
    cells: {
      item: "Spot market equity ($M)",
      val: new Cell({ expr: `MarketSnapshot["mkt_cap_diluted", "val"]` }),
      notes: "Includes BA-PRA & Spirit TSM at spot",
    },
    format: "currency",
    decimals: 0,
  })
  wacc.addRow("gross_debt", {
    cells: {
      item: "Gross carrying debt ($M)",
      val: new Cell({
        expr: `BalanceSheet["short_term_debt", "9M26A"] + BalanceSheet["long_term_debt", "9M26A"]`,
      }),
      notes: "Q3 26 incl. $314M FL; ex-op leases",
    },
    format: "currency",
    decimals: 0,
  })
  wacc.addRow("total_capital", {
    cells: {
      item: "Total spot market capital ($M)",
      val: new Cell({
        expr: `@table["mkt_equity", "val"] + @table["gross_debt", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  wacc.addRow("spot_debt_weight", {
    cells: {
      item: "Spot gross debt weight (%)",
      val: new Cell({
        expr: `@table["gross_debt", "val"] / @table["total_capital", "val"]`,
      }),
      notes: null,
    },
    format: "percentage",
    decimals: 1,
  })
  wacc.addRow("weight_debt", {
    cells: {
      item: "Active debt weight (%)",
      val: new Cell({
        expr: `IF(ScalarDrivers["targetDebtWeight", "active"] > 0, ScalarDrivers["targetDebtWeight", "active"], @table["spot_debt_weight", "val"])`,
      }),
      notes: "Spot 26.2% (Base/Down); 15.0% IG (Up)",
    },
    format: "percentage",
    decimals: 1,
  })
  wacc.addRow("weight_equity", {
    cells: {
      item: "Active equity weight (%)",
      val: new Cell({ expr: `1 - @table["weight_debt", "val"]` }),
      notes: null,
    },
    format: "percentage",
    decimals: 1,
  })
  wacc.addRow("wacc", {
    cells: {
      item: "Weighted average cost of capital",
      val: new Cell({
        expr: `@table["weight_equity", "val"] * @table["cost_of_equity", "val"] + @table["weight_debt", "val"] * @table["kd_aftertax", "val"]`,
      }),
      notes: null,
    },
    format: "percentage",
    decimals: 2,
    style: "total",
  })
  wacc.addRow("wacc_ig_transition_memo", {
    cells: {
      item: "Memo: IG Transition WACC",
      val: new Cell({
        expr: `(1 - ScalarDrivers["targetDebtWeight", "upside"]) * (@table["rf_rate", "val"] + (BetaStats5Y["blume_beta", "BA"] / (1 + (1 - @table["tax_rate", "val"]) * (@table["spot_debt_weight", "val"] / (1 - @table["spot_debt_weight", "val"])))) * (1 + (1 - @table["tax_rate", "val"]) * (ScalarDrivers["targetDebtWeight", "upside"] / (1 - ScalarDrivers["targetDebtWeight", "upside"]))) * @table["erp", "val"]) + ScalarDrivers["targetDebtWeight", "upside"] * @table["bbb_yield", "val"] * (1 - @table["tax_rate", "val"])`,
      }),
      notes: "5Y Blume re-levered to 15% IG & BBB Kd",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("wacc_no_tax_shield", {
    cells: {
      item: "Memo: NOL-impaired WACC",
      val: new Cell({
        expr: `@table["weight_equity", "val"] * @table["cost_of_equity", "val"] + @table["weight_debt", "val"] * @table["kd_pretax", "val"]`,
      }),
      notes: "0% debt tax shield during NOL window",
    },
    format: "percentage",
    decimals: 2,
  })

  // TABLE 1B: SecurityValuationInputs (below WaccBuild)
  const sec = sheet.addTable(
    "SecurityValuationInputs",
    "Audited Share, Convertible, Pension & PPA Inputs",
    {
      subtitle: [
        "Boeing FY2025 Form 10-K & Q3 2026 Form 10-Q",
        "Convertible, pension & PPA valuation terms",
      ],
      below: "WaccBuild",
      gap: 2,
    }
  )
  sec.addColumn("item", { role: "descriptor", headers: ["Audited term"] })
  sec.addColumn("val", { headers: ["Value"], style: "bold" })
  sec.addColumn("notes", { role: "descriptor", headers: ["Source"] })

  sec.addSectionHeader("Anti-dilutive equity awards (9M 2026, M sh)")
  sec.addRow("prsu_antidilutive", {
    cells: {
      item: "Anti-dilutive PRSUs (M sh)",
      val: ba.antidilutivePrsu9m26,
      notes: "Q3 2026 Form 10-Q, Note 4",
    },
    format: "number",
    decimals: 3,
  })
  sec.addRow("rsu_antidilutive", {
    cells: {
      item: "Anti-dilutive RSUs (M sh)",
      val: ba.antidilutiveRsu9m26,
      notes: "Q3 2026 Form 10-Q, Note 4",
    },
    format: "number",
    decimals: 3,
  })
  sec.addRow("options_antidilutive", {
    cells: {
      item: "Anti-dilutive stock options (M sh)",
      val: ba.antidilutiveOptions9m26,
      notes: "Q3 2026 Form 10-Q, Note 4",
    },
    format: "number",
    decimals: 3,
  })

  sec.addRowGutter()
  sec.addSectionHeader("Spirit 3.25% Exchangeable Notes due 2028")
  sec.addRow("spirit_exch_principal", {
    cells: {
      item: "Assumed principal amount ($M)",
      val: ba.spiritExchPrincipal,
      notes: "FY2025 Form 10-K, Note 17 (due Nov 2028)",
    },
    format: "currency",
    decimals: 0,
  })
  sec.addRow("spirit_exch_coupon", {
    cells: {
      item: "Stated coupon rate",
      val: ba.spiritExchCoupon,
      notes: "FY2025 Form 10-K, Note 17",
    },
    format: "percentage",
    decimals: 2,
  })
  sec.addRow("spirit_exch_rate_per_1000", {
    cells: {
      item: "Initial exchange rate (sh / $1k)",
      val: ba.spiritExchRatePer1000,
      notes: "FY2025 Form 10-K, Note 17",
    },
    format: "number",
    decimals: 4,
  })
  sec.addRow("spirit_exch_underlying_shares", {
    cells: {
      item: "Implied underlying shares (M)",
      val: new Cell({
        expr: `@table["spirit_exch_principal", "val"] * @table["spirit_exch_rate_per_1000", "val"] / 1000`,
      }),
      notes: null,
    },
    format: "number",
    decimals: 4,
  })
  sec.addRow("spirit_exch_strike", {
    cells: {
      item: "Implied exchange strike ($/sh)",
      val: new Cell({
        expr: `1000 / @table["spirit_exch_rate_per_1000", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 4,
  })

  sec.addRowGutter()
  sec.addSectionHeader("BA-PRA terms & Q3 2026 debt fair value")
  sec.addRow("pref_dividend_rate", {
    cells: {
      item: "Series A preferred dividend rate",
      val: ba.prefDividendRate,
      notes: "Q3 2026 Form 10-Q, Note 16 (6.00% cum.)",
    },
    format: "percentage",
    decimals: 2,
  })
  sec.addRow("ba_pra_conv_rate_max", {
    cells: {
      item: "BA-PRA max conv. rate (sh/pref)",
      val: ba.prefConvRateMax,
      notes: "Q3 2026 Form 10-Q, Note 16",
    },
    format: "number",
    decimals: 4,
  })
  sec.addRow("ba_pra_conv_rate_min", {
    cells: {
      item: "BA-PRA min conv. rate (sh/pref)",
      val: ba.prefConvRateMin,
      notes: "Q3 2026 Form 10-Q, Note 16",
    },
    format: "number",
    decimals: 4,
  })
  sec.addRow("debt_carrying_ex_fl", {
    cells: {
      item: "Debt carrying ex-FL ($M)",
      val: ba.debtCarryingExFlQ326,
      notes: "Q3 2026 Form 10-Q, Note 18",
    },
    format: "currency",
    decimals: 0,
  })
  sec.addRow("debt_fair_value", {
    cells: {
      item: "Debt Level-2 fair value ex-FL ($M)",
      val: ba.debtFairValueQ326,
      notes: "Q3 2026 Form 10-Q, Note 18",
    },
    format: "currency",
    decimals: 0,
  })

  sec.addRowGutter()
  sec.addSectionHeader("YE25 current/overfunded pension & Spirit PPA")
  sec.addRow("pension_asset_ye25", {
    cells: {
      item: "Overfunded pension asset ($M)",
      val: ba.pensionAssetYe25,
      notes: "FY2025 Form 10-K, Note 18",
    },
    format: "currency",
    decimals: 0,
  })
  sec.addRow("opeb_asset_ye25", {
    cells: {
      item: "Overfunded OPEB asset ($M)",
      val: ba.opebAssetYe25,
      notes: "FY2025 Form 10-K, Note 18",
    },
    format: "currency",
    decimals: 0,
  })
  sec.addRow("pension_curr_liab_ye25", {
    cells: {
      item: "Current pension liability ($M)",
      val: ba.pensionCurrLiabYe25,
      notes: "FY2025 Form 10-K, Note 18",
    },
    format: "currency",
    decimals: 0,
  })
  sec.addRow("opeb_curr_liab_ye25", {
    cells: {
      item: "Current OPEB liability ($M)",
      val: ba.opebCurrLiabYe25,
      notes: "FY2025 Form 10-K, Note 18",
    },
    format: "currency",
    decimals: 0,
  })
  sec.addRow("pension_curr_net_delta", {
    cells: {
      item: "Net curr./overfunded delta ($M)",
      val: new Cell({
        expr: `(-@table["pension_curr_liab_ye25", "val"] - @table["opeb_curr_liab_ye25", "val"]) - (@table["pension_asset_ye25", "val"] + @table["opeb_asset_ye25", "val"])`,
      }),
      notes: "$442M curr. liab less $221M overfunded",
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  sec.addRow("spirit_off_mkt_amort_29", {
    cells: {
      item: "Spirit off-mkt amort. FY29E ($M)",
      val: ba.spiritOffMktAmortFy29,
      notes: "Q3 26 10-Q Note 2 (stripped in BCA SOTP)",
    },
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // BAND 1 RIGHT: EvToEquityBridge (rightOf WaccBuild)
  // =========================================================================
  const bridge = sheet.addTable(
    "EvToEquityBridge",
    "Enterprise-to-Equity Bridge & Implied Share Price",
    {
      subtitle: [
        "($M, except shares in M and $/sh) | Sep 30 EV to Nov 20 Equity at Ke",
        "Incorporates BA-PRA conversion collar & Spirit exchangeable notes",
      ],
      rightOf: "WaccBuild",
      gap: 1,
    }
  )
  bridge.addColumn("item", {
    role: "descriptor",
    headers: ["Bridge component"],
  })
  bridge.addColumn("val", { headers: ["Active"], style: "bold" })
  bridge.addColumn("notes", { role: "descriptor", headers: ["Notes"] })

  bridge.addSectionHeader("Enterprise value (as of Sep 30, 2026 anchor)")
  bridge.addRow("pv_explicit", {
    cells: {
      item: "PV of explicit FCFF (Sep 30, 2026)",
      val: new Cell({
        expr: `SUM(DcfSchedule["pv_fcff", "Q4_26E".."2032E"])`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("pv_terminal", {
    cells: {
      item: "PV of terminal value (Sep 30)",
      val: new Cell({ expr: `DcfSchedule["pv_fcff", "Terminal"]` }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("pv_post_terminal_nol", {
    cells: {
      item: "(+) PV post-FY32E NOL runoff",
      val: new Cell({
        expr: `PostTerminalNolRunoff["pv_nol_shield", "Total"]`,
      }),
      notes: "FY33E–FY37E finite NOL runoff (not capitalized in TV)",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("ev_anchor", {
    cells: {
      item: "Implied Enterprise Value (Sep 30)",
      val: new Cell({
        expr: `@table["pv_explicit", "val"] + @table["pv_terminal", "val"] + @table["pv_post_terminal_nol", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
    style: "total",
  })
  bridge.addRow("tv_pct_ev", {
    cells: {
      item: "Terminal value % of Sep 30 EV",
      val: new Cell({
        expr: `@table["pv_terminal", "val"] / @table["ev_anchor", "val"]`,
      }),
      notes: null,
    },
    format: "percentage",
    decimals: 1,
  })
  bridge.addRow("implied_exit_ev_ebitda", {
    cells: {
      item: "Implied exit EV / FY32E EBITDA",
      val: new Cell({
        expr: `IF(IncomeStatement["ebitda_qoe", "2032E"] > 0, DcfSchedule["fcff_or_tv", "Terminal"] / IncomeStatement["ebitda_qoe", "2032E"], NA())`,
      }),
      notes: null,
    },
    format: "multiple",
    decimals: 1,
  })
  bridge.addRow("implied_exit_ev_ebit", {
    cells: {
      item: "Implied exit EV / FY32E EBIT",
      val: new Cell({
        expr: `IF(IncomeStatement["operating_income", "2032E"] > 0, DcfSchedule["fcff_or_tv", "Terminal"] / IncomeStatement["operating_income", "2032E"], NA())`,
      }),
      notes: null,
    },
    format: "multiple",
    decimals: 1,
  })

  bridge.addRowGutter()
  bridge.addSectionHeader("Enterprise-to-equity bridge (Sep 30, 2026 anchor)")
  bridge.addRow("plus_cash_sti", {
    cells: {
      item: "(+) Cash & short-term investments",
      val: new Cell({
        expr: `BalanceSheet["cash_and_equivalents", "9M26A"] + BalanceSheet["short_term_investments", "9M26A"]`,
      }),
      notes: "Q3 2026 unrestricted cash + short-term investments",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("less_carrying_debt", {
    cells: {
      item: "(−) Total carrying debt (incl. FL)",
      val: new Cell({
        expr: `-(BalanceSheet["short_term_debt", "9M26A"] + BalanceSheet["long_term_debt", "9M26A"])`,
      }),
      notes: "Q3 2026 carrying debt incl. $314M FL; ex-op leases",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("less_at_pension", {
    cells: {
      item: "(−) After-tax pension & OPEB",
      val: new Cell({
        expr: `-(BalanceSheet["accrued_pension_liab", "9M26A"] + BalanceSheet["accrued_retiree_health", "9M26A"] + SecurityValuationInputs["pension_curr_net_delta", "val"]) * (1 - WaccBuild["tax_rate", "val"])`,
      }),
      notes: "$6,234M net pre-tax unfunded × (1 − 25% tax rate)",
    },
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("less_nci", {
    cells: {
      item: "(−) Noncontrolling interests",
      val: new Cell({
        expr: `-BalanceSheet["noncontrolling_interest", "9M26A"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("less_pv_pref_divs", {
    cells: {
      item: "(−) PV remaining BA-PRA dividends",
      val: new Cell({
        expr: `-BaPraDividendPv["total", "pv"]`,
      }),
      notes: "All 5 remaining 6.0% quarterly pmts ($431M) @ Kd",
    },
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("net_ev_bridge", {
    cells: {
      item: "Total EV-to-equity adjustments",
      val: new Cell({
        expr: `SUM(@table["plus_cash_sti".."less_pv_pref_divs", "val"])`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  bridge.addRow("implied_equity_sep30", {
    cells: {
      item: "Implied Equity Value (Sep 30)",
      val: new Cell({
        expr: `@table["ev_anchor", "val"] + @table["net_ev_bridge", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  bridge.addRow("roll_fwd_years", {
    cells: {
      item: "Equity roll-fwd frac. (51d)",
      val: new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), DATE(2026, 11, 20), 3)`,
      }),
      notes: "51 calendar days (Act/365)",
    },
    format: "number",
    decimals: 4,
  })
  bridge.addRow("roll_fwd_factor", {
    cells: {
      item: "51-day roll-forward factor (Ke)",
      val: new Cell({
        expr: `(1 + WaccBuild["cost_of_equity", "val"]) ^ @table["roll_fwd_years", "val"]`,
      }),
      notes: "Sep 30 to Nov 20, 2026 at active cost of equity",
    },
    format: "multiple",
    decimals: 4,
  })
  bridge.addRow("implied_equity_pre", {
    cells: {
      item: "Implied Equity Value (Nov 20)",
      val: new Cell({
        expr: `@table["implied_equity_sep30", "val"] * @table["roll_fwd_factor", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
    style: "total",
  })
  bridge.addRow("implied_ev", {
    cells: {
      item: "Implied Enterprise Value (Nov 20)",
      val: new Cell({
        expr: `@table["implied_equity_pre", "val"] - @table["net_ev_bridge", "val"]`,
      }),
      notes: "Nov 20 Equity less Sep 30 net bridge adjustments",
    },
    format: "currency",
    decimals: 0,
  })

  bridge.addRowGutter()
  bridge.addSectionHeader(
    "Valuation-date diluted share count & convertible bridge"
  )
  bridge.addRow("basic_shares_valdate", {
    cells: {
      item: "Basic common shares (Oct 20, 2026)",
      val: ba.sharesCoverQ326,
      notes: "Q3 2026 10-Q cover (no 401k double-count)",
    },
    format: "number",
    decimals: 3,
  })
  bridge.addRow("tsm_rsu_options", {
    cells: {
      item: "Unvested RSUs/PRSUs & opt. (9M26)",
      val: new Cell({
        expr: `SUM(SecurityValuationInputs["prsu_antidilutive".."options_antidilutive", "val"])`,
      }),
      notes: "Q3 2026 10-Q Note 4 anti-dilutive equivalents",
    },
    format: "number",
    decimals: 3,
  })
  bridge.addRow("s_base", {
    cells: {
      item: "Base diluted sh. (pre-conv.)",
      val: new Cell({
        expr: `@table["basic_shares_valdate", "val"] + @table["tsm_rsu_options", "val"]`,
      }),
      notes: null,
    },
    format: "number",
    decimals: 3,
    style: "subtotal",
  })
  bridge.addRow("pref_shares_count", {
    cells: {
      item: "BA-PRA preferred shares (M)",
      val: ba.prefSharesM,
      notes: null,
    },
    format: "number",
    decimals: 3,
  })
  bridge.addRow("pref_liq_pref", {
    cells: {
      item: "Liquidation pref. per BA-PRA ($)",
      val: ba.prefLiqPrefPerSh,
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("pref_face_value", {
    cells: {
      item: "BA-PRA aggregate face value ($M)",
      val: new Cell({
        expr: `@table["pref_shares_count", "val"] * @table["pref_liq_pref", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("collar_p_low", {
    cells: {
      item: "BA-PRA lower collar ($/sh)",
      val: ba.prefThresholdLow,
      notes: null,
    },
    format: "currency",
    decimals: 4,
  })
  bridge.addRow("collar_p_high", {
    cells: {
      item: "BA-PRA upper collar ($/sh)",
      val: ba.prefThresholdHigh,
      notes: null,
    },
    format: "currency",
    decimals: 4,
  })
  bridge.addRow("collar_s_max", {
    cells: {
      item: "BA-PRA max shares (≤ $142.98)",
      val: new Cell({
        expr: `@table["pref_shares_count", "val"] * SecurityValuationInputs["ba_pra_conv_rate_max", "val"]`,
      }),
      notes: null,
    },
    format: "number",
    decimals: 4,
  })
  bridge.addRow("collar_s_min", {
    cells: {
      item: "BA-PRA min shares (≥ $171.59)",
      val: new Cell({
        expr: `@table["pref_shares_count", "val"] * SecurityValuationInputs["ba_pra_conv_rate_min", "val"]`,
      }),
      notes: null,
    },
    format: "number",
    decimals: 4,
  })
  bridge.addRow("e_1_threshold", {
    cells: {
      item: "Equity at BA-PRA floor ($142.98)",
      val: new Cell({
        expr: `@table["collar_p_low", "val"] * (@table["s_base", "val"] + @table["collar_s_max", "val"])`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("e_2_threshold", {
    cells: {
      item: "Equity at Spirit strike ($149.10)",
      val: new Cell({
        expr: `SecurityValuationInputs["spirit_exch_strike", "val"] * @table["s_base", "val"] + @table["pref_face_value", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("e_3_threshold", {
    cells: {
      item: "Equity at BA-PRA cap ($171.59)",
      val: new Cell({
        expr: `@table["collar_p_high", "val"] * (@table["s_base", "val"] + SecurityValuationInputs["spirit_exch_underlying_shares", "val"]) + @table["pref_face_value", "val"] - SecurityValuationInputs["spirit_exch_principal", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("implied_price", {
    cells: {
      item: "Implied DCF share price ($/sh)",
      val: new Cell({
        expr: piecewiseDilutedPriceExpr(
          `@table["implied_equity_pre", "val"]`,
          "@table"
        ),
      }),
      notes: "Joint BA-PRA conversion collar & Spirit TSM dilution",
    },
    format: "currency",
    decimals: 2,
    style: "total",
    highlight: true,
  })
  bridge.addRow("ba_pra_converted_shares", {
    cells: {
      item: "Implied BA-PRA conv. shares (M)",
      val: new Cell({
        expr: `IF(@table["implied_equity_pre", "val"] <= @table["e_1_threshold", "val"], @table["collar_s_max", "val"], IF(@table["implied_equity_pre", "val"] > @table["e_3_threshold", "val"], @table["collar_s_min", "val"], @table["pref_face_value", "val"] / @table["implied_price", "val"]))`,
      }),
      notes: null,
    },
    format: "number",
    decimals: 3,
  })
  bridge.addRow("tsm_spirit_exch", {
    cells: {
      item: "Spirit 3.25% Exch. TSM sh. (M)",
      val: new Cell({
        expr: `IF(@table["implied_equity_pre", "val"] <= @table["e_2_threshold", "val"], 0, SecurityValuationInputs["spirit_exch_underlying_shares", "val"] - SecurityValuationInputs["spirit_exch_principal", "val"] / @table["implied_price", "val"])`,
      }),
      notes: "1.543M underlying shares @ $149.10 TSM strike",
    },
    format: "number",
    decimals: 3,
  })
  bridge.addRow("total_diluted_shares", {
    cells: {
      item: "Total val.-date diluted sh. (M)",
      val: new Cell({
        expr: `@table["s_base", "val"] + @table["ba_pra_converted_shares", "val"] + @table["tsm_spirit_exch", "val"]`,
      }),
      notes: null,
    },
    format: "number",
    decimals: 3,
    style: "subtotal",
  })
  bridge.addRow("collar_parity_check", {
    cells: {
      item: "Equity value parity check ($M)",
      val: new Cell({
        expr: `@table["implied_price", "val"] * @table["total_diluted_shares", "val"] - @table["implied_equity_pre", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 4,
  })
  bridge.addRow("implied_return_pct", {
    cells: {
      item: "Implied return vs. Nov 20 spot",
      val: new Cell({
        expr: `@table["implied_price", "val"] / MarketSnapshot["spot_price", "val"] - 1`,
      }),
      notes: null,
    },
    format: "percentage",
    decimals: 1,
    style: "bold",
  })

  bridge.addRowGutter()
  bridge.addSectionHeader("Supplemental valuation sensitivities")
  bridge.addRow("debt_fv_discount", {
    cells: {
      item: "Memo (+): Debt carry less L2 FV",
      val: new Cell({
        expr: `SecurityValuationInputs["debt_carrying_ex_fl", "val"] - SecurityValuationInputs["debt_fair_value", "val"]`,
      }),
      notes: "Q3 2026 Note 18 carrying debt less Level-2 FV",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("fv_debt_equity", {
    cells: {
      item: "Memo (+): Equity on FV debt ($M)",
      val: new Cell({
        expr: `(@table["implied_equity_sep30", "val"] + @table["debt_fv_discount", "val"]) * @table["roll_fwd_factor", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("fv_debt_price", {
    cells: {
      item: "Memo (+): Price on FV debt ($/sh)",
      val: new Cell({
        expr: piecewiseDilutedPriceExpr(
          `@table["fv_debt_equity", "val"]`,
          "@table"
        ),
      }),
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  bridge.addRow("fv_debt_per_share_delta", {
    cells: {
      item: "Memo (+): L2 FV debt delta ($/sh)",
      val: new Cell({
        expr: `@table["fv_debt_price", "val"] - @table["implied_price", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  bridge.addRow("ev_nol_impaired_sep30", {
    cells: {
      item: "Memo (−): EV at NOL-imp. WACC",
      val: new Cell({
        expr: `SUMPRODUCT(DcfSchedule["fcff_or_tv", "Q4_26E".."Terminal"], DcfSchedule["df_nol_impaired", "Q4_26E".."Terminal"]) + PostTerminalNolRunoff["pv_nol_shield", "Total"]`,
      }),
      notes: "0% debt tax shield during 6.25-yr NOL window",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("nol_wacc_equity", {
    cells: {
      item: "Memo (−): Eq. at NOL-imp. WACC",
      val: new Cell({
        expr: `(@table["ev_nol_impaired_sep30", "val"] + @table["net_ev_bridge", "val"]) * @table["roll_fwd_factor", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("nol_wacc_price", {
    cells: {
      item: "Memo (−): Px at NOL-imp. WACC",
      val: new Cell({
        expr: piecewiseDilutedPriceExpr(
          `@table["nol_wacc_equity", "val"]`,
          "@table"
        ),
      }),
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  bridge.addRow("nol_wacc_per_share_delta", {
    cells: {
      item: "Memo (−): NOL WACC delta ($/sh)",
      val: new Cell({
        expr: `@table["nol_wacc_price", "val"] - @table["implied_price", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  bridge.addRow("pv_sbc_401k_memo", {
    cells: {
      item: "Memo: PV exp.+term SBC & 401(k)",
      val: new Cell({
        expr: `(SUM(DcfSchedule["pv_sbc_401k", "Q4_26E".."2032E"]) + DcfSchedule["pv_sbc_401k", "Terminal"]) * @table["roll_fwd_factor", "val"]`,
      }),
      notes: "After-tax 25% PV spread vs. Headline FCF",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("sbc_401k_per_share_impact", {
    cells: {
      item: "Memo: SBC + 401(k) PV drag ($/sh)",
      val: new Cell({
        expr: `@table["pv_sbc_401k_memo", "val"] / @table["total_diluted_shares", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  bridge.addRow("hfs_net_carrying", {
    cells: {
      item: "Memo (+): HFS net carry ($M)",
      val: new Cell({
        expr: `BalanceSheet["assets_held_for_sale", "9M26A"] - BalanceSheet["liabilities_held_for_sale", "9M26A"]`,
      }),
      notes: "$688M HFS assets less $161M HFS liab. (Archer)",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("hfs_per_share_memo", {
    cells: {
      item: "Memo (+): Archer / Wisk HFS ($/sh)",
      val: new Cell({
        expr: `@table["hfs_net_carrying", "val"] / @table["total_diluted_shares", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })

  // =========================================================================
  // BAND 2: DcfSchedule (Full-width 17c B..R)
  // =========================================================================
  const dcf = sheet.addTable(
    "DcfSchedule",
    "Unlevered Economic Free Cash Flow & Discounted Cash Flow Schedule",
    {
      subtitle:
        "($ in millions) | Anchored Sep 30, 2026; 25.0% combined taxes (21% fed + 4% foreign/state, $120M/yr floor); SBC + 401(k) deducted; Terminal Value uses g / RONIC",
      gap: 2,
    }
  )
  dcf.addColumn("line_item", { role: "descriptor", headers: ["Line item"] })
  for (const p of FORECAST_PERIODS) {
    dcf.addColumn(p, {
      group: "Explicit forecast",
      headers: [FORECAST_PERIOD_HEADERS[p]],
    })
  }
  dcf.addColumn("Terminal", {
    group: "Terminal",
    headers: ["Terminal"],
    style: "bold",
  })
  dcf.addColumn("notes", { role: "descriptor", headers: ["Notes"] })

  dcf.addSectionHeader("Discounting dates & timing")
  dcf.addRow("period_end_date", {
    cells: {
      line_item: "Period end date",
      Q4_26E: new Cell({ expr: `DATE(2026, 12, 31)` }),
      "2027E": new Cell({ expr: `DATE(2027, 12, 31)` }),
      "2028E": new Cell({ expr: `DATE(2028, 12, 31)` }),
      "2029E": new Cell({ expr: `DATE(2029, 12, 31)` }),
      "2030E": new Cell({ expr: `DATE(2030, 12, 31)` }),
      "2031E": new Cell({ expr: `DATE(2031, 12, 31)` }),
      "2032E": new Cell({ expr: `DATE(2032, 12, 31)` }),
      Terminal: new Cell({ expr: `DATE(2032, 12, 31)` }),
      notes: null,
    },
    format: "date",
  })
  dcf.addRow("period_length", {
    cells: {
      line_item: "Period duration (yrs, 30/360)",
      Q4_26E: new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), @table["period_end_date", "Q4_26E"], 0)`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `YEARFRAC(@table["period_end_date", col.prev], @table["period_end_date", @col], 0)`,
          }),
        ])
      ),
      Terminal: 0,
      notes: null,
    },
    format: "number",
    decimals: 2,
  })
  dcf.addRow("discount_years", {
    cells: {
      line_item: "Discount period from Sep 30 (yrs)",
      Q4_26E: new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), @table["period_end_date", "Q4_26E"], 0) - 0.5 * @table["period_length", "Q4_26E"] * ScalarDrivers["midYearConventionFlag", "active"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `YEARFRAC(DATE(2026, 9, 30), @table["period_end_date", @col], 0) - 0.5 * @table["period_length", @col] * ScalarDrivers["midYearConventionFlag", "active"]`,
          }),
        ])
      ),
      Terminal: new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), @table["period_end_date", "Terminal"], 0)`,
      }),
      notes: "Mid-period explicit cash flows; period-end terminal value",
    },
    format: "number",
    decimals: 3,
  })

  dcf.addRowGutter()
  dcf.addSectionHeader(
    "Unlevered Economic FCFF build (25.0% combined tax; ex-SBC & 401(k) add-back)"
  )
  dcf.addRow("ebit", {
    cells: {
      line_item: "Consolidated EBIT",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({ expr: `IncomeStatement["operating_income", "${p}"]` }),
        ])
      ),
      Terminal: new Cell({
        expr: `@table["ebit", "2032E"] * (1 + ScalarDrivers["terminalGrowth", "active"])`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("fed_tax_on_ebit", {
    cells: {
      line_item: "(−) Federal tax on EBIT (21.0%)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({
            expr: `-MAX(0, @table["ebit", "${p}"]) * ScalarDrivers["statutoryTaxRate", "active"]`,
          }),
        ])
      ),
      Terminal: new Cell({
        expr: `-@table["ebit", "Terminal"] * ScalarDrivers["statutoryTaxRate", "active"]`,
      }),
      notes: "Zero federal refund on losses; operating losses add to NOL pool",
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("foreign_state_tax", {
    cells: {
      line_item: "(−) Foreign & state tax (4.0%)",
      Q4_26E: new Cell({
        expr: `-MAX(0.25 * ScalarDrivers["foreignTaxFloorAnnual", "active"], MAX(0, @table["ebit", "Q4_26E"]) * ScalarDrivers["foreignStateTaxRate", "active"])`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `-MAX(ScalarDrivers["foreignTaxFloorAnnual", "active"], MAX(0, @table["ebit", "${c}"]) * ScalarDrivers["foreignStateTaxRate", "active"])`,
          }),
        ])
      ),
      Terminal: new Cell({
        expr: `-@table["ebit", "Terminal"] * ScalarDrivers["foreignStateTaxRate", "active"]`,
      }),
      notes: "4.0% rate with $120M/yr floor ($30M Q4 26E), symmetric with IS",
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("nopat", {
    cells: {
      line_item: "(=) Pre-NOL NOPAT (25.0% tax)",
      notes: "Symmetric 25.0% combined rate across explicit & terminal",
    },
    expr: `@table["ebit", @col] + @table["fed_tax_on_ebit", @col] + @table["foreign_state_tax", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  dcf.addRow("nol_tax_shield", {
    cells: {
      line_item: "(+) Explicit federal NOL shield",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({
            expr: `TaxNolSchedule["unlevered_nol_tax_shield", "${p}"]`,
          }),
        ])
      ),
      Terminal: 0,
      notes:
        "80% × 21% federal NOL cap; post-FY32E balance valued over FY33E–FY37E",
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("da_addback", {
    cells: {
      line_item: "(+) Depreciation & amortization",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({ expr: `PpeCapexDaSchedule["da_total", "${p}"]` }),
        ])
      ),
      Terminal: 0,
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("capex", {
    cells: {
      line_item: "(−) Capital expenditures",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({ expr: `CashFlowStatement["capex", "${p}"]` }),
        ])
      ),
      Terminal: 0,
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("chg_nwc", {
    cells: {
      line_item: "(+/−) Change in operating NWC",
      Q4_26E: new Cell({
        expr: `WorkingCapitalSchedule["cf_operating_nwc", "2026E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `WorkingCapitalSchedule["cf_operating_nwc", "${c}"]`,
          }),
        ])
      ),
      Terminal: 0,
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("terminal_reinvest", {
    cells: {
      line_item: "(−) Terminal reinvest (g/RONIC)",
      Q4_26E: 0,
      "2027E": 0,
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
      "2032E": 0,
      Terminal: new Cell({
        expr: `-@table["nopat", "Terminal"] * (ScalarDrivers["terminalGrowth", "active"] / ScalarDrivers["terminalRonic", "active"])`,
      }),
      notes: "NOPAT(T+1) × g / scenario RONIC (18% / 23% / 28%)",
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("economic_fcff", {
    cells: {
      line_item: "(=) Unlevered Economic FCFF",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({
            expr: `@table["nopat", "${p}"] + @table["nol_tax_shield", "${p}"] + @table["da_addback", "${p}"] + @table["capex", "${p}"] + @table["chg_nwc", "${p}"]`,
          }),
        ])
      ),
      Terminal: new Cell({
        expr: `@table["nopat", "2032E"] * (1 + ScalarDrivers["terminalGrowth", "active"]) * (1 - ScalarDrivers["terminalGrowth", "active"] / ScalarDrivers["terminalRonic", "active"])`,
      }),
      notes:
        "SBC & 401(k) stock match remain expensed in Economic FCFF (zero double-count)",
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  dcf.addRow("fcff_or_tv", {
    cells: {
      line_item: "Cash flow / Undiscounted TV",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({ expr: `@table["economic_fcff", "${p}"]` }),
        ])
      ),
      Terminal: new Cell({
        expr: `IF(WaccBuild["wacc", "val"] > ScalarDrivers["terminalGrowth", "active"], @table["economic_fcff", "Terminal"] / (WaccBuild["wacc", "val"] - ScalarDrivers["terminalGrowth", "active"]), NA())`,
      }),
      notes:
        "Perpetuity formula requires WACC strictly above terminal growth (g)",
    },
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  dcf.addRow("discount_factor", {
    cells: { line_item: "Discount factor (active WACC)", notes: null },
    expr: `1 / ((1 + WaccBuild["wacc", "val"]) ^ @table["discount_years", @col])`,
    format: "number",
    decimals: 4,
  })
  dcf.addRow("pv_fcff", {
    cells: { line_item: "Present value (Sep 30, 2026)", notes: null },
    expr: `@table["fcff_or_tv", @col] * @table["discount_factor", @col]`,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  dcf.addRowGutter()
  dcf.addSectionHeader(
    "Memos: Stock compensation PV & reference discount factors"
  )
  dcf.addRow("sbc_401k_flow", {
    cells: {
      line_item: "SBC + 401(k) after-tax cost (25%)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          new Cell({
            expr: `(CashFlowStatement["sbc", "${p}"] + CashFlowStatement["treasury_shares_401k", "${p}"]) * (1 - WaccBuild["tax_rate", "val"])`,
          }),
        ])
      ),
      Terminal: new Cell({
        expr: `IF(WaccBuild["wacc", "val"] > ScalarDrivers["terminalGrowth", "active"], @table["sbc_401k_flow", "2032E"] * (1 + ScalarDrivers["terminalGrowth", "active"]) / (WaccBuild["wacc", "val"] - ScalarDrivers["terminalGrowth", "active"]), NA())`,
      }),
      notes: "Headline vs. Economic FCF spread memo",
    },
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("pv_sbc_401k", {
    cells: { line_item: "PV of SBC + 401(k) cost (Sep 30)", notes: null },
    expr: `@table["sbc_401k_flow", @col] * @table["discount_factor", @col]`,
    format: "currency",
    decimals: 0,
  })
  dcf.addRow("df_at_base_wacc", {
    cells: {
      line_item: "Memo: DF at Base WACC",
      notes: "Base-case WACC discount factor for scenario variance attribution",
    },
    expr: `1 / ((1 + ValuationSummary["wacc", "base"]) ^ @table["discount_years", @col])`,
    format: "number",
    decimals: 4,
  })
  dcf.addRow("df_nol_impaired", {
    cells: {
      line_item: "Memo: DF at NOL-impaired WACC",
      notes:
        "Discount factor excluding debt tax shield during NOL carryforward window",
    },
    expr: `1 / ((1 + WaccBuild["wacc_no_tax_shield", "val"]) ^ @table["discount_years", @col])`,
    format: "number",
    decimals: 4,
  })
  dcf.addRow("margin_ramp_wt", {
    cells: {
      line_item: "Memo: after-tax rev. base ($M)",
      Q4_26E: 0,
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c, idx) => [
          c,
          new Cell({
            expr: `(${idx + 1} / 6) * IncomeStatement["revenue_total", "${c}"] * (1 - WaccBuild["tax_rate", "val"])`,
          }),
        ])
      ),
      Terminal: 0,
      notes:
        "After-tax revenue weight for linear FY27E–FY32E margin sensitivity",
    },
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // BAND 3: SotpValuation (left, 8c) | PostTerminalNolRunoff (right, 8c)
  // =========================================================================
  const sotp = sheet.addTable(
    "SotpValuation",
    "Discounted Normalized FY2029E SOTP Cross-Check",
    {
      subtitle: [
        "($M, except $/sh) | Strips $209M Spirit PPA amort. from BCA",
        "Blended mult. on Unallocated; finite PV on FY29–31 FAS/CAS",
      ],
      gap: 2,
    }
  )
  sotp.addColumn("segment", { role: "descriptor", headers: ["Segment / step"] })
  sotp.addColumn("ebit_29", { headers: ["FY29E", "EBIT ($M)"] })
  sotp.addColumn("multiple", { headers: ["EV / EBIT", "Multiple"] })
  sotp.addColumn("value", { headers: ["Implied", "Value ($M)"], style: "bold" })
  sotp.addColumn("notes", { role: "descriptor", headers: ["Basis"] })

  sotp.addSectionHeader("Forward FY2029E segment valuation (at YE2028)")
  sotp.addRow("bca", {
    cells: {
      segment: "Commercial Airplanes (BCA, ex-PPA)",
      ebit_29: new Cell({
        expr: `SegmentOperatingBuild["ebit_bca", "2029E"] - SecurityValuationInputs["spirit_off_mkt_amort_29", "val"]`,
        format: "currency",
        decimals: 0,
      }),
      multiple: new Cell({
        expr: `ScalarDrivers["sotpMultBca", "active"]`,
        format: "multiple",
        decimals: 1,
      }),
      value: new Cell({
        expr: `@table[@row, "ebit_29"] * @table[@row, "multiple"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: "Ex-$209M Spirit PPA",
    },
  })
  sotp.addRow("bds", {
    cells: {
      segment: "Defense, Space & Security (BDS)",
      ebit_29: new Cell({
        expr: `SegmentOperatingBuild["ebit_bds", "2029E"]`,
        format: "currency",
        decimals: 0,
      }),
      multiple: new Cell({
        expr: `ScalarDrivers["sotpMultBds", "active"]`,
        format: "multiple",
        decimals: 1,
      }),
      value: new Cell({
        expr: `@table[@row, "ebit_29"] * @table[@row, "multiple"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: null,
    },
  })
  sotp.addRow("bgs", {
    cells: {
      segment: "Global Services (BGS)",
      ebit_29: new Cell({
        expr: `SegmentOperatingBuild["ebit_bgs", "2029E"]`,
        format: "currency",
        decimals: 0,
      }),
      multiple: new Cell({
        expr: `ScalarDrivers["sotpMultBgs", "active"]`,
        format: "multiple",
        decimals: 1,
      }),
      value: new Cell({
        expr: `@table[@row, "ebit_29"] * @table[@row, "multiple"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: null,
    },
  })
  sotp.addRow("op_seg_subtotal", {
    cells: {
      segment: "Operating segments subtotal",
      ebit_29: new Cell({
        expr: `SUM(@table["bca".."bgs", "ebit_29"])`,
        format: "currency",
        decimals: 0,
      }),
      multiple: new Cell({
        expr: `IF(@table[@row, "ebit_29"] > 0, @table[@row, "value"] / @table[@row, "ebit_29"], NA())`,
        format: "multiple",
        decimals: 1,
      }),
      value: new Cell({
        expr: `SUM(@table["bca".."bgs", "value"])`,
        format: "currency",
        decimals: 0,
      }),
      notes: null,
    },
    style: "subtotal",
  })
  sotp.addRow("unallocated", {
    cells: {
      segment: "Unallocated corporate overhead",
      ebit_29: new Cell({
        expr: `SegmentOperatingBuild["ebit_unallocated", "2029E"]`,
        format: "currency",
        decimals: 0,
      }),
      multiple: new Cell({
        expr: `@table["op_seg_subtotal", "multiple"]`,
        format: "multiple",
        decimals: 1,
      }),
      value: new Cell({
        expr: `@table[@row, "ebit_29"] * @table[@row, "multiple"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: "Blended seg. EV/EBIT",
    },
  })
  const ye28DiscRef = `YEARFRAC(DATE(2026, 9, 30), DATE(2028, 12, 31), 0)`
  sotp.addRow("fas_cas_runoff", {
    cells: {
      segment: "FAS/CAS service cost runoff",
      ebit_29: new Cell({
        expr: `SegmentOperatingBuild["fas_cas_service_cost_adj", "2029E"]`,
        format: "currency",
        decimals: 0,
      }),
      multiple: new Cell({
        expr: `IF(@table[@row, "ebit_29"] > 0, @table[@row, "value"] / @table[@row, "ebit_29"], 0)`,
        format: "multiple",
        decimals: 1,
      }),
      value: new Cell({
        expr: `(SegmentOperatingBuild["fas_cas_service_cost_adj", "2029E"] / ((1 + WaccBuild["wacc", "val"]) ^ (DcfSchedule["discount_years", "2029E"] - ${ye28DiscRef})) + SegmentOperatingBuild["fas_cas_service_cost_adj", "2030E"] / ((1 + WaccBuild["wacc", "val"]) ^ (DcfSchedule["discount_years", "2030E"] - ${ye28DiscRef})) + SegmentOperatingBuild["fas_cas_service_cost_adj", "2031E"] / ((1 + WaccBuild["wacc", "val"]) ^ (DcfSchedule["discount_years", "2031E"] - ${ye28DiscRef}))) * (1 - WaccBuild["tax_rate", "val"])`,
        format: "currency",
        decimals: 0,
      }),
      notes: "FY29–31 AT PV @ YE28",
    },
  })
  sotp.addRow("sotp_ev_ye28", {
    cells: {
      segment: "Total FY29E SOTP EV (YE2028)",
      ebit_29: new Cell({
        expr: `@table["op_seg_subtotal", "ebit_29"] + @table["unallocated", "ebit_29"] + @table["fas_cas_runoff", "ebit_29"]`,
        format: "currency",
        decimals: 0,
      }),
      multiple: new Cell({
        expr: `IF(@table[@row, "ebit_29"] > 0, @table[@row, "value"] / @table[@row, "ebit_29"], NA())`,
        format: "multiple",
        decimals: 1,
      }),
      value: new Cell({
        expr: `@table["op_seg_subtotal", "value"] + @table["unallocated", "value"] + @table["fas_cas_runoff", "value"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: null,
    },
    style: "subtotal",
  })

  sotp.addRowGutter()
  sotp.addSectionHeader("Discounting & equity bridge to Nov 20, 2026")
  sotp.addRow("pv_sotp_exit", {
    cells: {
      segment: "PV of YE28 SOTP EV (to Sep 30)",
      ebit_29: null,
      multiple: new Cell({
        expr: `1 / ((1 + WaccBuild["wacc", "val"]) ^ ${ye28DiscRef})`,
        format: "number",
        decimals: 4,
      }),
      value: new Cell({
        expr: `@table["sotp_ev_ye28", "value"] * @table[@row, "multiple"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: "Disc. 2.25y at WACC",
    },
  })
  sotp.addRow("pv_interim_fcff", {
    cells: {
      segment: "(+) PV explicit Q4 26E–FY28E FCFF",
      ebit_29: null,
      multiple: null,
      value: new Cell({
        expr: `SUM(DcfSchedule["pv_fcff", "Q4_26E".."2028E"])`,
        format: "currency",
        decimals: 0,
      }),
      notes: null,
    },
  })
  sotp.addRow("sotp_ev_sep30", {
    cells: {
      segment: "Discounted SOTP EV (Sep 30, 2026)",
      ebit_29: null,
      multiple: null,
      value: new Cell({
        expr: `@table["pv_sotp_exit", "value"] + @table["pv_interim_fcff", "value"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: null,
    },
    style: "subtotal",
  })
  sotp.addRow("sotp_equity_sep30", {
    cells: {
      segment: "Discounted SOTP Equity (Sep 30)",
      ebit_29: null,
      multiple: null,
      value: new Cell({
        expr: `@table["sotp_ev_sep30", "value"] + EvToEquityBridge["net_ev_bridge", "val"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: null,
    },
  })
  sotp.addRow("sotp_equity_pre", {
    cells: {
      segment: "Discounted SOTP Equity (Nov 20)",
      ebit_29: null,
      multiple: new Cell({
        expr: `EvToEquityBridge["roll_fwd_factor", "val"]`,
        format: "multiple",
        decimals: 4,
      }),
      value: new Cell({
        expr: `@table["sotp_equity_sep30", "value"] * @table[@row, "multiple"]`,
        format: "currency",
        decimals: 0,
      }),
      notes: "Rolled 51d at Ke",
    },
  })
  sotp.addRow("sotp_price", {
    cells: {
      segment: "Discounted SOTP price ($/sh)",
      ebit_29: null,
      multiple: null,
      value: new Cell({
        expr: piecewiseDilutedPriceExpr(`@table["sotp_equity_pre", "value"]`),
        format: "currency",
        decimals: 2,
      }),
      notes: "Incl. collar & Spirit",
    },
    style: "total",
    highlight: true,
  })

  // BAND 3 RIGHT: PostTerminalNolRunoff (rightOf SotpValuation, 8c)
  const postNol = sheet.addTable(
    "PostTerminalNolRunoff",
    "Post-FY32E Finite-Life Federal NOL Runoff (FY33E–FY37E)",
    {
      subtitle: [
        "($M) | Values remaining FY32E unlevered federal NOL pool",
        "80% × 21% cap without capitalizing NOLs in perpetuity",
      ],
      rightOf: "SotpValuation",
      gap: 1,
    }
  )
  postNol.addColumn("line_item", { role: "descriptor", headers: ["Line item"] })
  for (const c of POST_NOL_COLS) {
    postNol.addColumn(c, { headers: [`FY${c.slice(2)}`] })
  }
  postNol.addColumn("Total", { headers: ["Total"], style: "bold" })

  postNol.addRow("discount_years", {
    cells: {
      line_item: "Discount period (yrs)",
      "2033E": new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), DATE(2033, 12, 31), 0) - 0.5 * ScalarDrivers["midYearConventionFlag", "active"]`,
      }),
      "2034E": new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), DATE(2034, 12, 31), 0) - 0.5 * ScalarDrivers["midYearConventionFlag", "active"]`,
      }),
      "2035E": new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), DATE(2035, 12, 31), 0) - 0.5 * ScalarDrivers["midYearConventionFlag", "active"]`,
      }),
      "2036E": new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), DATE(2036, 12, 31), 0) - 0.5 * ScalarDrivers["midYearConventionFlag", "active"]`,
      }),
      "2037E": new Cell({
        expr: `YEARFRAC(DATE(2026, 9, 30), DATE(2037, 12, 31), 0) - 0.5 * ScalarDrivers["midYearConventionFlag", "active"]`,
      }),
      Total: null,
    },
    format: "number",
    decimals: 3,
  })
  postNol.addRow("ebit", {
    cells: {
      line_item: "Projected EBIT ($M)",
      "2033E": new Cell({
        expr: `DcfSchedule["ebit", "2032E"] * (1 + ScalarDrivers["terminalGrowth", "active"])`,
      }),
      ...Object.fromEntries(
        (["2034E", "2035E", "2036E", "2037E"] as const).map((c) => [
          c,
          new Cell({
            expr: `@table["ebit", col.prev] * (1 + ScalarDrivers["terminalGrowth", "active"])`,
          }),
        ])
      ),
      Total: new Cell({ expr: `SUM(@table["ebit", "2033E".."2037E"])` }),
    },
    format: "currency",
    decimals: 0,
  })
  postNol.addRow("nol_open", {
    cells: {
      line_item: "Opening NOL pool",
      "2033E": new Cell({ expr: `TaxNolSchedule["unlev_nol_end", "2032E"]` }),
      ...Object.fromEntries(
        (["2034E", "2035E", "2036E", "2037E"] as const).map((c) => [
          c,
          new Cell({ expr: `@table["nol_end", col.prev]` }),
        ])
      ),
      Total: null,
    },
    format: "currency",
    decimals: 0,
  })
  postNol.addRow("nol_util", {
    cells: {
      line_item: "NOL utilized (80% cap)",
      ...Object.fromEntries(
        POST_NOL_COLS.map((c) => [
          c,
          new Cell({
            expr: `MIN(@table["nol_open", "${c}"], MAX(0, @table["ebit", "${c}"]) * ScalarDrivers["nolUtilCap", "active"])`,
          }),
        ])
      ),
      Total: new Cell({ expr: `SUM(@table["nol_util", "2033E".."2037E"])` }),
    },
    format: "currency",
    decimals: 0,
  })
  postNol.addRow("nol_end", {
    cells: {
      line_item: "Ending NOL pool",
      ...Object.fromEntries(
        POST_NOL_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["nol_open", "${c}"] - @table["nol_util", "${c}"]`,
          }),
        ])
      ),
      Total: null,
    },
    format: "currency",
    decimals: 0,
  })
  postNol.addRow("nol_shield", {
    cells: {
      line_item: "NOL tax shield (21%)",
      ...Object.fromEntries(
        POST_NOL_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["nol_util", "${c}"] * ScalarDrivers["statutoryTaxRate", "active"]`,
          }),
        ])
      ),
      Total: new Cell({ expr: `SUM(@table["nol_shield", "2033E".."2037E"])` }),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  postNol.addRow("discount_factor", {
    cells: {
      line_item: "Discount factor",
      ...Object.fromEntries(
        POST_NOL_COLS.map((c) => [
          c,
          new Cell({
            expr: `1 / ((1 + WaccBuild["wacc", "val"]) ^ @table["discount_years", "${c}"])`,
          }),
        ])
      ),
      Total: null,
    },
    format: "number",
    decimals: 4,
  })
  postNol.addRow("pv_nol_shield", {
    cells: {
      line_item: "PV of NOL shield ($M)",
      ...Object.fromEntries(
        POST_NOL_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["nol_shield", "${c}"] * @table["discount_factor", "${c}"]`,
          }),
        ])
      ),
      Total: new Cell({
        expr: `SUM(@table["pv_nol_shield", "2033E".."2037E"])`,
      }),
    },
    format: "currency",
    decimals: 0,
    style: "total",
  })
  postNol.addRow("df_at_base_wacc", {
    cells: {
      line_item: "Memo: DF at Base WACC",
      ...Object.fromEntries(
        POST_NOL_COLS.map((c) => [
          c,
          new Cell({
            expr: `1 / ((1 + ValuationSummary["wacc", "base"]) ^ @table["discount_years", "${c}"])`,
          }),
        ])
      ),
      Total: null,
    },
    format: "number",
    decimals: 4,
  })

  // =========================================================================
  // BAND 4: BaPraDividendPv (left, 8c) | CashYieldTest (right, 8c)
  // =========================================================================
  const divPv = sheet.addTable(
    "BaPraDividendPv",
    "BA-PRA Remaining Quarterly Dividends — PV Schedule",
    {
      subtitle: [
        "All 5 remaining quarterly 6.00% cash dividends ($431.25M nominal)",
        "Discounted from pay date to Sep 30, 2026 at active pre-tax Kd",
      ],
      gap: 2,
    }
  )
  divPv.addColumn("quarter", { role: "descriptor", headers: ["Payment"] })
  divPv.addColumn("pay_date", { headers: ["Pay date"], format: "date" })
  divPv.addColumn("div_pmt", {
    headers: ["Dividend", "($M)"],
    format: "currency",
    decimals: 2,
  })
  divPv.addColumn("years", {
    headers: ["Years from", "Sep 30"],
    format: "number",
    decimals: 4,
  })
  divPv.addColumn("pv", {
    headers: ["PV Sep 30", "($M)"],
    format: "currency",
    decimals: 2,
    style: "bold",
  })
  divPv.addColumn("basis", { role: "descriptor", headers: ["Basis"] })

  const prefPayDates: readonly [string, string, number, number, number][] = [
    ["q0", "Q4 2026 (Oct 15, 2026)", 2026, 10, 15],
    ["q1", "Q1 2027 (Jan 15, 2027)", 2027, 1, 15],
    ["q2", "Q2 2027 (Apr 15, 2027)", 2027, 4, 15],
    ["q3", "Q3 2027 (Jul 15, 2027)", 2027, 7, 15],
    ["q4", "Q4 2027 final (Oct 15, 2027)", 2027, 10, 15],
  ]
  for (const [qId, label, yr, mo, dy] of prefPayDates) {
    divPv.addRow(qId, {
      cells: {
        quarter: label,
        pay_date: new Cell({ expr: `DATE(${yr}, ${mo}, ${dy})` }),
        div_pmt: new Cell({
          expr: `0.25 * SecurityValuationInputs["pref_dividend_rate", "val"] * EvToEquityBridge["pref_face_value", "val"]`,
        }),
        years: new Cell({
          expr: `YEARFRAC(DATE(2026, 9, 30), @table[@row, "pay_date"], 3)`,
        }),
        pv: new Cell({
          expr: `@table[@row, "div_pmt"] / ((1 + WaccBuild["kd_pretax", "val"]) ^ @table[@row, "years"])`,
        }),
        basis: "6.0% / 4",
      },
    })
  }
  divPv.addRow("total", {
    cells: {
      quarter: "Total BA-PRA dividends (5 qtrs)",
      pay_date: null,
      div_pmt: new Cell({ expr: `SUM(@table["q0".."q4", "div_pmt"])` }),
      years: null,
      pv: new Cell({ expr: `SUM(@table["q0".."q4", "pv"])` }),
      basis: "5 qtrs @ Kd",
    },
    style: "total",
  })

  const cy = sheet.addTable(
    "CashYieldTest",
    "Forward Unlevered Cash Yield vs. 10Y US Treasury (5.04%)",
    {
      subtitle: [
        "Tests when Economic FCFF yield on Spot EV clears 10Y UST",
        "Memo compares Headline FCF yield on diluted market cap",
      ],
      rightOf: "BaPraDividendPv",
      gap: 1,
    }
  )
  cy.addColumn("metric", { role: "descriptor", headers: ["Metric"] })
  for (const c of FULL_YEAR_PROJ_COLS) {
    cy.addColumn(c, { headers: [`FY${c.slice(2)}`] })
  }

  cy.addRow("econ_fcff", {
    cells: { metric: "Economic FCFF ($M)" },
    expr: `DcfSchedule["economic_fcff", @col]`,
    format: "currency",
    decimals: 0,
  })
  cy.addRow("econ_fcff_yield_ev", {
    cells: { metric: "FCFF / Spot EV yield" },
    expr: `@table["econ_fcff", @col] / MarketSnapshot["spot_ev", "val"]`,
    format: "percentage",
    decimals: 2,
    style: "bold",
  })
  cy.addRow("spread_vs_ust", {
    cells: { metric: "Spread vs. 10Y UST" },
    expr: `@table["econ_fcff_yield_ev", @col] - WaccBuild["rf_rate", "val"]`,
    format: "percentage",
    decimals: 2,
  })
  cy.addRow("clears_ust_flag", {
    cells: { metric: "Clears 10Y UST (1/0)" },
    expr: `IF(@table["econ_fcff_yield_ev", @col] >= WaccBuild["rf_rate", "val"], 1, 0)`,
    format: "integer",
  })
  cy.addRow("headline_fcf_yield_mc", {
    cells: { metric: "Headline FCF / Mkt Cap" },
    expr: `CashFlowStatement["headline_fcf", @col] / MarketSnapshot["mkt_cap_diluted", "val"]`,
    format: "percentage",
    decimals: 2,
  })
}
