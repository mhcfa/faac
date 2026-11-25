import { Cell, type Sheet, type Table } from "f8-engine"
import { wrapSubtitle } from "../timeline.ts"

export interface ValuationTables {
  readonly waccSchedule: Table
  readonly dcfSummary: Table
  readonly dcfModel: Table
  readonly evToEquityBridge: Table
  readonly scenarioVarianceBridge: Table
  readonly sensitivityWaccVsGrowth: Table
  readonly waccSensitivityWorkings: Table
  readonly reverseDcfMatrix: Table
  readonly expectationWaccWorkings: Table
  readonly terminalReinvestSensitivity: Table
  readonly icStressScenarios: Table
  readonly icStressWorkings: Table
}

export function buildValuationSheet(sheet: Sheet): ValuationTables {
  // WACC & Cost of Capital Schedule (Hamada Relevered 5Y-M Primary vs. 2Y-W Cross-Check)
  const waccSchedule = sheet.addTable(
    "WaccSchedule",
    "Weighted Average Cost of Capital (WACC)",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except per-share) | Anchored to US 10Y Treasury, Single-A OAS & Hamada-relevered OLS betas (ex-operating leases)",
        56
      ),
    }
  )
  waccSchedule.addColumn("item", {
    role: "descriptor",
    header: "WACC component",
  })
  waccSchedule.addColumn("primary", {
    headers: ["Primary", "5Y-M WACC"],
    style: "bold",
    shade: "muted",
  })
  waccSchedule.addColumn("short_regime", {
    headers: ["Cross-Chk", "2Y-W WACC"],
  })

  waccSchedule.addSectionHeader("Cost of equity (CAPM — Hamada)")
  waccSchedule.addRow("rf", {
    cells: { item: "Risk-free rate (US 10Y Treasury)" },
    expr: 'MacroRatesTable["dgs10", "val"]',
    format: "percentage",
    decimals: 2,
  })
  waccSchedule.addRow("raw_beta", {
    cells: {
      item: "Raw historical equity beta (OLS)",
      primary: new Cell({ expr: 'BetaSummaryTable["CRM", "beta_5y_m"]' }),
      short_regime: new Cell({ expr: 'BetaSummaryTable["CRM", "beta_2y_w"]' }),
    },
    format: "number",
    decimals: 3,
  })
  waccSchedule.addRow("hist_lookback_de", {
    cells: {
      item: "Lookback funded debt / equity",
      primary: new Cell({ expr: 'ScalarDrivers["histBeta5yDe", "active"]' }),
      short_regime: new Cell({
        expr: 'ScalarDrivers["histBeta2yDe", "active"]',
      }),
    },
    format: "percentage",
    decimals: 1,
  })
  waccSchedule.addRow("unlevered_beta", {
    cells: { item: "Unlevered asset beta (Hamada)" },
    expr: '@table["raw_beta", @col] / (1 + (1 - @table["tax_rate", @col]) * @table["hist_lookback_de", @col])',
    format: "number",
    decimals: 3,
  })
  waccSchedule.addRow("relevered_beta", {
    cells: { item: "Relevered equity beta (post-ASR)" },
    expr: '@table["unlevered_beta", @col] * (1 + (1 - @table["tax_rate", @col]) * @table["current_de", @col])',
    format: "number",
    decimals: 3,
    style: "subtotal",
  })
  waccSchedule.addRow("erp", {
    cells: { item: "US equity risk premium (ERP)" },
    expr: 'ScalarDrivers["erp", "active"]',
    format: "percentage",
    decimals: 2,
  })
  waccSchedule.addRow("ke", {
    cells: { item: "Cost of equity (Ke)" },
    expr: '@table["rf", @col] + @table["relevered_beta", @col] * @table["erp", @col]',
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })

  waccSchedule.addRowGutter()
  waccSchedule.addSectionHeader("After-tax cost of debt")
  waccSchedule.addRow("single_a_oas", {
    cells: { item: "ICE BofA Single-A corporate OAS" },
    expr: 'MacroRatesTable["single_a_oas", "val"]',
    format: "percentage",
    decimals: 2,
  })
  waccSchedule.addRow("pretax_kd", {
    cells: { item: "Marginal pre-tax cost of debt" },
    expr: '@table["rf", @col] + @table["single_a_oas", @col]',
    format: "percentage",
    decimals: 2,
  })
  waccSchedule.addRow("tax_rate", {
    cells: { item: "Marginal corporate tax rate" },
    expr: 'ScalarDrivers["effectiveTaxRate", "active"]',
    format: "percentage",
    decimals: 1,
  })
  waccSchedule.addRow("aftertax_kd", {
    cells: { item: "After-tax cost of debt" },
    expr: '@table["pretax_kd", @col] * (1 - @table["tax_rate", @col])',
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })

  waccSchedule.addRowGutter()
  waccSchedule.addSectionHeader("Capital weights & WACC")
  waccSchedule.addRow("spot_price", {
    cells: { item: "Spot share price (Nov 18, 2026)" },
    expr: 'BetaSummaryTable["CRM", "spot_px"]',
    format: "currency",
    decimals: 2,
  })
  waccSchedule.addRow("pf_diluted_shares", {
    cells: { item: "Post-ASR diluted shares (M)" },
    expr: 'ShareCountSchedule["pro_forma_post_asr_diluted", "FY27E"]',
    format: "number",
    decimals: 2,
  })
  waccSchedule.addRow("market_cap", {
    cells: { item: "Pro forma equity market cap ($M)" },
    expr: '@table["spot_price", @col] * @table["pf_diluted_shares", @col]',
    format: "currency",
    decimals: 0,
  })
  waccSchedule.addRow("funded_debt_and_fin_leases", {
    cells: { item: "Funded debt & fin. leases (Q2)" },
    expr: 'Q2BalanceSheetAnchor["total_funded_debt_and_fin_leases", "Q2_FY27A"]',
    format: "currency",
    decimals: 0,
  })
  waccSchedule.addRow("current_de", {
    cells: { item: "Post-ASR funded debt / equity" },
    expr: '@table["funded_debt_and_fin_leases", @col] / @table["market_cap", @col]',
    format: "percentage",
    decimals: 1,
  })
  waccSchedule.addRow("total_capital", {
    cells: { item: "Total market capitalization ($M)" },
    expr: '@table["market_cap", @col] + @table["funded_debt_and_fin_leases", @col]',
    format: "currency",
    decimals: 0,
  })
  waccSchedule.addRow("equity_weight", {
    cells: { item: "Equity weight" },
    expr: '@table["market_cap", @col] / @table["total_capital", @col]',
    format: "percentage",
    decimals: 1,
  })
  waccSchedule.addRow("debt_weight", {
    cells: { item: "Funded debt & fin. lease weight" },
    expr: '@table["funded_debt_and_fin_leases", @col] / @table["total_capital", @col]',
    format: "percentage",
    decimals: 1,
  })
  waccSchedule.addRow("wacc", {
    cells: { item: "Weighted average cost of capital" },
    expr: '@table["equity_weight", @col] * @table["ke", @col] + @table["debt_weight", @col] * @table["aftertax_kd", @col]',
    format: "percentage",
    decimals: 2,
    style: "total",
  })

  waccSchedule.addRowGutter()
  waccSchedule.addSectionHeader("Valuation date roll-forward")
  waccSchedule.addRow("eq_roll_period_yrs", {
    cells: { item: "BS-to-spot roll period (Act/365)" },
    expr: "YEARFRAC(DATE(2026, 7, 31), DATE(2026, 11, 18), 3)",
    format: "number",
    decimals: 4,
  })
  waccSchedule.addRow("eq_roll_factor", {
    cells: { item: "Equity roll-forward factor at Ke" },
    expr: '(1 + @table["ke", @col]) ^ @table["eq_roll_period_yrs", @col]',
    format: "number",
    decimals: 4,
  })

  // DCF Enterprise Value Summary & Terminal Cross-Checks
  const dcfSummary = sheet.addTable(
    "DcfSummaryTable",
    "Enterprise Value Summary & Yield Test",
    {
      subtitle: wrapSubtitle(
        "($ in Millions) | Mid-year Gordon growth DCF cross-checked against Exit EV / GAAP EBITDA and spot FCFF yield vs. 10Y Treasury",
        56
      ),
    }
  )
  dcfSummary.addColumn("item", {
    role: "descriptor",
    header: "Valuation output",
  })
  dcfSummary.addColumn("gordon", {
    headers: ["Gordon", "Growth"],
    style: "bold",
    shade: "muted",
  })
  dcfSummary.addColumn("exit_mult", {
    headers: ["Exit Mult.", "Check"],
  })

  dcfSummary.addSectionHeader("Enterprise value build")
  dcfSummary.addRow("pv_explicit_fcff", {
    cells: { item: "PV of explicit FCFF (Jul 31, 2026)" },
    expr: 'SUM(DcfModel["pv_fcff", "H2_FY27E".."FY31E"])',
    format: "currency",
    decimals: 0,
  })
  dcfSummary.addRow("terminal_value", {
    cells: {
      item: "Undiscounted terminal value",
      gordon: new Cell({
        expr: 'IF(WaccSchedule["wacc", "primary"] > ScalarDrivers["terminalGrowthRate", "active"], (DcfModel["unlevered_fcff", "terminal"] / (WaccSchedule["wacc", "primary"] - ScalarDrivers["terminalGrowthRate", "active"])) * ((1 + WaccSchedule["wacc", "primary"]) ^ ScalarDrivers["midPeriodFactor", "active"]), NA())',
      }),
      exit_mult: new Cell({
        expr: 'QoeAndCashConversion["gaap_ebitda", "FY31E"] * ScalarDrivers["exitEbitdaMultiple", "active"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  dcfSummary.addRow("pv_terminal_value", {
    cells: { item: "PV of terminal value (Jul 31, 2026)" },
    expr: '@table["terminal_value", @col] * DcfModel["discount_factor", "terminal"]',
    format: "currency",
    decimals: 0,
  })
  dcfSummary.addRow("operating_ev_bs_date", {
    cells: { item: "Operating EV (at BS date)" },
    expr: '@table["pv_explicit_fcff", @col] + @table["pv_terminal_value", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  dcfSummary.addRow("roll_forward_factor", {
    cells: { item: "EV roll-forward factor (at WACC)" },
    expr: '(1 + WaccSchedule["wacc", "primary"]) ^ WaccSchedule["eq_roll_period_yrs", "primary"]',
    format: "number",
    decimals: 4,
  })
  dcfSummary.addRow("operating_ev_val_date", {
    cells: { item: "Operating EV (rolled to Nov 18)" },
    expr: '@table["operating_ev_bs_date", @col] * @table["roll_forward_factor", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  dcfSummary.addRowGutter()
  dcfSummary.addSectionHeader("Terminal & cash yield cross-checks")
  dcfSummary.addRow("tv_pct_of_ev", {
    cells: { item: "Terminal value share of EV" },
    expr: '@table["pv_terminal_value", @col] / @table["operating_ev_bs_date", @col]',
    format: "percentage",
    decimals: 1,
  })
  dcfSummary.addRow("terminal_reinvest_rate", {
    cells: { item: "Terminal reinvestment (% NOPAT)" },
    expr: 'ScalarDrivers["terminalReinvestmentRate", "active"]',
    format: "percentage",
    decimals: 1,
  })
  dcfSummary.addRow("terminal_nopat_base", {
    cells: { item: "FY31E EBITA NOPAT net of reinv." },
    expr: 'DcfModel["ebita_nopat", "FY31E"] * (1 - ScalarDrivers["terminalReinvestmentRate", "active"])',
    format: "currency",
    decimals: 0,
  })
  dcfSummary.addRow("mid_year_nopat_base", {
    cells: {
      item: "Mid-year adjusted terminal base",
      gordon: null,
      exit_mult: new Cell({
        expr: '@table["terminal_nopat_base", "exit_mult"] * ((1 + WaccSchedule["wacc", "primary"]) ^ ScalarDrivers["midPeriodFactor", "active"])',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  dcfSummary.addRow("tv_pv_factor", {
    cells: {
      item: "Mid-year perpetuity PV factor",
      gordon: new Cell({
        expr: 'IF(WaccSchedule["wacc", "primary"] > ScalarDrivers["terminalGrowthRate", "active"], ((1 + WaccSchedule["wacc", "primary"]) ^ ScalarDrivers["midPeriodFactor", "active"]) * DcfModel["discount_factor", "terminal"] / (WaccSchedule["wacc", "primary"] - ScalarDrivers["terminalGrowthRate", "active"]), NA())',
      }),
      exit_mult: null,
    },
    format: "number",
    decimals: 3,
  })
  dcfSummary.addRow("implied_exit_ev_ebitda", {
    cells: { item: "Implied exit EV / FY31E EBITDA" },
    expr: 'IF(QoeAndCashConversion["gaap_ebitda", "FY31E"] > 0, @table["terminal_value", @col] / QoeAndCashConversion["gaap_ebitda", "FY31E"], NA())',
    format: "multiple",
    decimals: 1,
  })
  dcfSummary.addRow("implied_exit_ev_fcff", {
    cells: { item: "Implied exit EV / FY31E FCFF" },
    expr: 'IF(DcfModel["unlevered_fcff", "FY31E"] > 0, @table["terminal_value", @col] / DcfModel["unlevered_fcff", "FY31E"], NA())',
    format: "multiple",
    decimals: 1,
  })
  dcfSummary.addRow("implied_perp_g", {
    cells: {
      item: "Implied perpetual growth rate (g)",
      gordon: new Cell({
        expr: 'ScalarDrivers["terminalGrowthRate", "active"]',
      }),
      exit_mult: new Cell({
        expr: 'IF(AND(@table["terminal_value", "exit_mult"] > 0, @table["mid_year_nopat_base", "exit_mult"] > 0), (@table["terminal_value", "exit_mult"] * WaccSchedule["wacc", "primary"] - @table["mid_year_nopat_base", "exit_mult"]) / (@table["terminal_value", "exit_mult"] + @table["mid_year_nopat_base", "exit_mult"]), NA())',
      }),
    },
    format: "percentage",
    decimals: 2,
  })
  dcfSummary.addRow("fwd_fy28_fcff_yield", {
    cells: { item: "FY28E FCFF yield on modeled EV" },
    expr: 'DcfModel["unlevered_fcff", "FY28E"] / @table["operating_ev_val_date", @col]',
    format: "percentage",
    decimals: 2,
  })
  dcfSummary.addRow("fcff_yield_spread_vs_ust", {
    cells: { item: "Modeled FCFF yield vs. 10Y UST" },
    expr: '@table["fwd_fy28_fcff_yield", @col] - MacroRatesTable["dgs10", "val"]',
    format: "percentage",
    decimals: 2,
  })
  dcfSummary.addRow("spot_pf_operating_ev", {
    cells: { item: "Spot pro-forma operating EV ($M)" },
    expr: 'WaccSchedule["market_cap", "primary"] - EvToEquityBridge["net_non_op_bridge", @col]',
    format: "currency",
    decimals: 0,
  })
  dcfSummary.addRow("spot_fy28_fcff_yield", {
    cells: { item: "Spot FY28E FCFF yield on mkt. EV" },
    expr: 'DcfModel["unlevered_fcff", "FY28E"] / @table["spot_pf_operating_ev", @col]',
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })
  dcfSummary.addRow("spot_fcff_yield_spread_vs_ust", {
    cells: { item: "Spot FCFF yield spread vs. 10Y UST" },
    expr: '@table["spot_fy28_fcff_yield", @col] - MacroRatesTable["dgs10", "val"]',
    format: "percentage",
    decimals: 2,
  })

  // Explicit Cash Flow DCF Schedule (H2 FY27E Stub + FY28E-FY31E + Terminal)
  const dcfModel = sheet.addTable(
    "DcfModel",
    "Unlevered Economic FCFF Discounted Cash Flow Schedule",
    {
      subtitle: wrapSubtitle(
        "($ in Millions) | SBC- and finance-lease-inclusive FCFF discounted to Jul 31, 2026 using exact Actual/365 mid-period timing",
        104
      ),
    }
  )
  dcfModel.addColumn("item", { role: "descriptor", header: "DCF line item" })
  dcfModel.addColumn("H2_FY27E", {
    headers: ["H2 FY27E", "Stub"],
    group: "Explicit Forecast",
  })
  dcfModel.addColumn("FY28E", { header: "FY28E", group: "Explicit Forecast" })
  dcfModel.addColumn("FY29E", { header: "FY29E", group: "Explicit Forecast" })
  dcfModel.addColumn("FY30E", { header: "FY30E", group: "Explicit Forecast" })
  dcfModel.addColumn("FY31E", { header: "FY31E", group: "Explicit Forecast" })
  dcfModel.addColumn("terminal", {
    headers: ["Terminal", "Steady St."],
    style: "bold",
    shade: "muted",
  })

  dcfModel.addSectionHeader("Exact period dates & discount timing")
  dcfModel.addRow("period_start_date", {
    cells: {
      item: "Period start date",
      H2_FY27E: new Cell({ expr: "DATE(2026, 7, 31)" }),
      FY28E: new Cell({ expr: "DATE(2027, 1, 31)" }),
      FY29E: new Cell({ expr: "DATE(2028, 1, 31)" }),
      FY30E: new Cell({ expr: "DATE(2029, 1, 31)" }),
      FY31E: new Cell({ expr: "DATE(2030, 1, 31)" }),
      terminal: new Cell({ expr: "DATE(2031, 1, 31)" }),
    },
    format: "date",
  })
  dcfModel.addRow("period_end_date", {
    cells: {
      item: "Period end date",
      H2_FY27E: new Cell({ expr: "DATE(2027, 1, 31)" }),
      FY28E: new Cell({ expr: "DATE(2028, 1, 31)" }),
      FY29E: new Cell({ expr: "DATE(2029, 1, 31)" }),
      FY30E: new Cell({ expr: "DATE(2030, 1, 31)" }),
      FY31E: new Cell({ expr: "DATE(2031, 1, 31)" }),
      terminal: new Cell({ expr: "DATE(2032, 1, 31)" }),
    },
    format: "date",
  })
  dcfModel.addRow("period_length_yrs", {
    cells: { item: "Period length (Act/365 years)" },
    expr: 'YEARFRAC(@table["period_start_date", @col], @table["period_end_date", @col], 3)',
    format: "number",
    decimals: 3,
  })
  dcfModel.addRow("discount_period_yrs", {
    cells: {
      item: "Discount period from BS date (yrs)",
      terminal: new Cell({
        expr: 'YEARFRAC(DATE(2026, 7, 31), @table["period_end_date", "FY31E"], 3)',
      }),
    },
    expr: 'YEARFRAC(DATE(2026, 7, 31), @table["period_start_date", @col], 3) + ScalarDrivers["midPeriodFactor", "active"] * @table["period_length_yrs", @col]',
    format: "number",
    decimals: 3,
  })

  dcfModel.addRowGutter()
  dcfModel.addSectionHeader("Unlevered economic free cash flow")
  dcfModel.addRow("revenue", {
    cells: {
      item: "Total revenue",
      H2_FY27E: new Cell({
        expr: 'IncomeStatement["total_revenue", "FY27E"] - LtmFlowBridge["total_revenue", "H1_FY27A"]',
      }),
      terminal: new Cell({
        expr: '@table["revenue", "FY31E"] * (1 + ScalarDrivers["terminalGrowthRate", "active"])',
      }),
    },
    expr: 'IncomeStatement["total_revenue", @col]',
    format: "currency",
    decimals: 0,
  })
  dcfModel.addRow("gaap_ebit", {
    cells: {
      item: "GAAP operating income (EBIT)",
      H2_FY27E: new Cell({
        expr: 'IncomeStatement["operating_income", "FY27E"] - LtmFlowBridge["operating_income", "H1_FY27A"]',
      }),
      terminal: new Cell({
        expr: '@table["ebita", "FY31E"] * (1 + ScalarDrivers["terminalGrowthRate", "active"])',
      }),
    },
    expr: 'IncomeStatement["operating_income", @col]',
    format: "currency",
    decimals: 0,
  })
  dcfModel.addRow("ebita", {
    cells: {
      item: "Economic EBITA (ex-M&A amort.)",
      H2_FY27E: new Cell({
        expr: 'QoeAndCashConversion["ebita", "FY27E"] - (LtmFlowBridge["operating_income", "H1_FY27A"] + LtmFlowBridge["purchased_intangibles_amort", "H1_FY27A"])',
      }),
      terminal: new Cell({
        expr: '@table["ebita", "FY31E"] * (1 + ScalarDrivers["terminalGrowthRate", "active"])',
      }),
    },
    expr: 'QoeAndCashConversion["ebita", @col]',
    format: "currency",
    decimals: 0,
  })
  dcfModel.addRow("ebita_nopat", {
    cells: {
      item: "Steady-state EBITA NOPAT",
      H2_FY27E: new Cell({
        expr: 'QoeAndCashConversion["ebita_nopat", "FY27E"] - (LtmFlowBridge["operating_income", "H1_FY27A"] + LtmFlowBridge["purchased_intangibles_amort", "H1_FY27A"]) * (1 - LtmFlowBridge["effective_tax_rate", "H1_FY27A"])',
      }),
      terminal: new Cell({
        expr: '@table["ebita_nopat", "FY31E"] * (1 + ScalarDrivers["terminalGrowthRate", "active"])',
      }),
    },
    expr: 'QoeAndCashConversion["ebita_nopat", @col]',
    format: "currency",
    decimals: 0,
  })
  dcfModel.addRow("terminal_reinvestment", {
    cells: {
      item: "Terminal steady-state reinvestment",
      H2_FY27E: 0,
      FY28E: 0,
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
      terminal: new Cell({
        expr: '-@table["ebita_nopat", "terminal"] * ScalarDrivers["terminalReinvestmentRate", "active"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  dcfModel.addRow("unlevered_fcff", {
    cells: {
      item: "Unlevered economic FCFF",
      H2_FY27E: new Cell({
        expr: 'QoeAndCashConversion["unlevered_fcff", "FY27E"] - LtmFlowBridge["unlevered_fcff", "H1_FY27A"]',
      }),
      terminal: new Cell({
        expr: '@table["ebita_nopat", "terminal"] + @table["terminal_reinvestment", "terminal"]',
      }),
    },
    expr: 'QoeAndCashConversion["unlevered_fcff", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })
  dcfModel.addRow("discount_factor", {
    cells: { item: "Discount factor (primary WACC)" },
    expr: '1 / ((1 + WaccSchedule["wacc", "primary"]) ^ @table["discount_period_yrs", @col])',
    format: "number",
    decimals: 4,
  })
  dcfModel.addRow("pv_fcff", {
    cells: {
      item: "PV of economic FCFF (Jul 31, 2026)",
      terminal: new Cell({
        expr: 'DcfSummaryTable["pv_terminal_value", "gordon"]',
      }),
    },
    expr: '@table["unlevered_fcff", @col] * @table["discount_factor", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })
  dcfModel.addRow("pv_fcff_at_base_wacc", {
    cells: {
      item: "Memo: PV of FCFF at Base WACC",
      terminal: new Cell({
        expr: 'ScenarioVarianceBridge["active_pv_tv_at_base", "val_per_share"]',
      }),
    },
    expr: '@table["unlevered_fcff", @col] / ((1 + ScenarioVarianceBridge["base_wacc", "val_per_share"]) ^ @table["discount_period_yrs", @col])',
    format: "currency",
    decimals: 0,
  })

  // Enterprise Value to Equity Value Bridge
  const evToEquityBridge = sheet.addTable(
    "EvToEquityBridge",
    "Enterprise Value to Equity Value & Per-Share Bridge",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except per-share and shares in Millions) | Bridges at Jul 31, 2026 BS date (ex-operating leases; Braze PV at after-tax Kd), then rolls equity forward 110 days at Ke less Q3 dividend",
        68
      ),
    }
  )
  evToEquityBridge.addColumn("item", {
    role: "descriptor",
    header: "Bridge component",
  })
  evToEquityBridge.addColumn("gordon", {
    headers: ["Gordon", "Growth"],
    style: "bold",
    shade: "muted",
  })
  evToEquityBridge.addColumn("exit_mult", {
    headers: ["Exit Mult.", "Check"],
  })
  evToEquityBridge.addColumn("per_share", {
    headers: ["Per Share", "(Gordon)"],
  })

  evToEquityBridge.addSectionHeader("BS-date bridge to Nov 18, 2026")
  evToEquityBridge.addRow("operating_ev", {
    cells: {
      item: "Operating EV (at BS date)",
      gordon: new Cell({
        expr: 'DcfSummaryTable["operating_ev_bs_date", "gordon"]',
      }),
      exit_mult: new Cell({
        expr: 'DcfSummaryTable["operating_ev_bs_date", "exit_mult"]',
      }),
      per_share: new Cell({
        expr: '@table[@row, "gordon"] / @table["pf_diluted_shares", "gordon"]',
        format: "currency",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  const addBridgeItem = (id: string, label: string, expr: string): void => {
    evToEquityBridge.addRow(id, {
      cells: {
        item: label,
        gordon: new Cell({ expr }),
        exit_mult: new Cell({ expr }),
        per_share: new Cell({
          expr: '@table[@row, "gordon"] / @table["pf_diluted_shares", "gordon"]',
          format: "currency",
          decimals: 2,
        }),
      },
      format: "currency",
      decimals: 0,
    })
  }

  addBridgeItem(
    "less_gross_debt",
    "(−) Gross funded debt (Q2 FY27)",
    '-Q2BalanceSheetAnchor["total_gross_debt", "Q2_FY27A"]'
  )
  addBridgeItem(
    "less_fin_leases",
    "(−) Finance lease liab. (Note 7)",
    '-Q2BalanceSheetAnchor["total_fin_leases", "Q2_FY27A"]'
  )
  addBridgeItem(
    "plus_cash_and_mkt",
    "(+) Cash & marketable securities",
    'Q2BalanceSheetAnchor["total_cash_and_mkt", "Q2_FY27A"]'
  )
  addBridgeItem(
    "less_pending_q3_ma",
    "(−) Pending Q3 FY27 cash M&A",
    '-AuditedFootnoteAnchors["pending_q3_ma_total", "val"]'
  )
  addBridgeItem(
    "less_pending_braze",
    "(−) PV of pending Braze cash M&A",
    '-ScalarDrivers["brazeAcquisitionCash", "active"] / (1 + WaccSchedule["aftertax_kd", "primary"])'
  )
  addBridgeItem(
    "plus_strat_inv_net",
    "(+) Strategic inv. (net of cut)",
    'Q2BalanceSheetAnchor["strategic_investments", "Q2_FY27A"] * (1 - ScalarDrivers["strategicInvHaircut", "active"])'
  )

  evToEquityBridge.addRow("implied_equity_bs_date", {
    cells: {
      item: "Implied equity value (at BS date)",
      gordon: new Cell({
        expr: 'SUM(@table["operating_ev".."plus_strat_inv_net", "gordon"])',
      }),
      exit_mult: new Cell({
        expr: 'SUM(@table["operating_ev".."plus_strat_inv_net", "exit_mult"])',
      }),
      per_share: new Cell({
        expr: 'SUM(@table["operating_ev".."plus_strat_inv_net", "per_share"])',
        format: "currency",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  evToEquityBridge.addRow("plus_equity_roll_forward", {
    cells: {
      item: "(+) 110-day equity roll at Ke",
      gordon: new Cell({
        expr: '@table["implied_equity_bs_date", "gordon"] * (WaccSchedule["eq_roll_factor", "primary"] - 1)',
      }),
      exit_mult: new Cell({
        expr: '@table["implied_equity_bs_date", "exit_mult"] * (WaccSchedule["eq_roll_factor", "primary"] - 1)',
      }),
      per_share: new Cell({
        expr: '@table["plus_equity_roll_forward", "gordon"] / @table["pf_diluted_shares", "gordon"]',
        format: "currency",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 0,
  })
  evToEquityBridge.addRow("less_q3_dividend", {
    cells: {
      item: "(−) Q3 FY27 quarterly dividend",
      gordon: new Cell({
        expr: '-0.25 * PeriodDriversActive["dividendsPerShare", "FY27E"] * @table["pf_diluted_shares", "gordon"]',
      }),
      exit_mult: new Cell({
        expr: '-0.25 * PeriodDriversActive["dividendsPerShare", "FY27E"] * @table["pf_diluted_shares", "exit_mult"]',
      }),
      per_share: new Cell({
        expr: '@table["less_q3_dividend", "gordon"] / @table["pf_diluted_shares", "gordon"]',
        format: "currency",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 0,
  })
  evToEquityBridge.addRow("implied_equity_value", {
    cells: {
      item: "Implied equity value (Nov 18, 2026)",
      gordon: new Cell({
        expr: 'SUM(@table["implied_equity_bs_date".."less_q3_dividend", "gordon"])',
      }),
      exit_mult: new Cell({
        expr: 'SUM(@table["implied_equity_bs_date".."less_q3_dividend", "exit_mult"])',
      }),
      per_share: new Cell({
        expr: 'SUM(@table["implied_equity_bs_date".."less_q3_dividend", "per_share"])',
        format: "currency",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 0,
    style: "total",
  })

  evToEquityBridge.addRowGutter()
  evToEquityBridge.addSectionHeader("Per-share valuation & tie-out")
  evToEquityBridge.addRow("net_non_op_bridge", {
    cells: {
      item: "BS-date net non-operating bridge",
      gordon: new Cell({
        expr: 'SUM(@table["less_gross_debt".."plus_strat_inv_net", "gordon"])',
      }),
      exit_mult: new Cell({
        expr: 'SUM(@table["less_gross_debt".."plus_strat_inv_net", "exit_mult"])',
      }),
      per_share: new Cell({
        expr: '@table[@row, "gordon"] / @table["pf_diluted_shares", "gordon"]',
        format: "currency",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 0,
  })
  evToEquityBridge.addRow("standalone_ltm_net_bridge", {
    cells: {
      item: "Standalone LTM bridge (ex-M&A)",
      gordon: new Cell({
        expr: '@table["less_gross_debt", "gordon"] + @table["less_fin_leases", "gordon"] + @table["plus_cash_and_mkt", "gordon"] + @table["plus_strat_inv_net", "gordon"]',
      }),
      exit_mult: new Cell({
        expr: '@table["less_gross_debt", "exit_mult"] + @table["less_fin_leases", "exit_mult"] + @table["plus_cash_and_mkt", "exit_mult"] + @table["plus_strat_inv_net", "exit_mult"]',
      }),
      per_share: new Cell({
        expr: '@table[@row, "gordon"] / @table["pf_diluted_shares", "gordon"]',
        format: "currency",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 0,
  })
  evToEquityBridge.addRow("pf_diluted_shares", {
    cells: {
      item: "Post-ASR diluted shares (M)",
      gordon: new Cell({
        expr: 'ShareCountSchedule["pro_forma_post_asr_diluted", "FY27E"]',
      }),
      exit_mult: new Cell({
        expr: 'ShareCountSchedule["pro_forma_post_asr_diluted", "FY27E"]',
      }),
      per_share: null,
    },
    format: "number",
    decimals: 2,
  })
  evToEquityBridge.addRow("implied_share_price", {
    cells: {
      item: "Implied share price ($/sh)",
      gordon: new Cell({
        expr: '@table["implied_equity_value", "gordon"] / @table["pf_diluted_shares", "gordon"]',
      }),
      exit_mult: new Cell({
        expr: '@table["implied_equity_value", "exit_mult"] / @table["pf_diluted_shares", "exit_mult"]',
      }),
      per_share: new Cell({
        expr: '@table["implied_equity_value", "per_share"]',
      }),
    },
    format: "currency",
    decimals: 2,
    style: "total",
  })
  evToEquityBridge.addRow("spot_price", {
    cells: {
      item: "Current share price (Nov 18, 2026)",
      gordon: new Cell({ expr: 'BetaSummaryTable["CRM", "spot_px"]' }),
      exit_mult: new Cell({ expr: 'BetaSummaryTable["CRM", "spot_px"]' }),
      per_share: new Cell({ expr: 'BetaSummaryTable["CRM", "spot_px"]' }),
    },
    format: "currency",
    decimals: 2,
  })
  evToEquityBridge.addRow("upside_downside", {
    cells: {
      item: "Implied upside/(downside) vs. spot",
      gordon: new Cell({
        expr: '@table["implied_share_price", "gordon"] / @table["spot_price", "gordon"] - 1',
      }),
      exit_mult: new Cell({
        expr: '@table["implied_share_price", "exit_mult"] / @table["spot_price", "exit_mult"] - 1',
      }),
      per_share: new Cell({
        expr: '@table["implied_share_price", "per_share"] / @table["spot_price", "per_share"] - 1',
      }),
    },
    format: "percentage",
    decimals: 1,
    style: "subtotal",
  })
  evToEquityBridge.addRow("bridge_tie_check", {
    cells: {
      item: "Per-share bridge tie-out check",
      gordon: new Cell({
        expr: '@table["implied_share_price", "gordon"] - @table["implied_share_price", "per_share"]',
      }),
      exit_mult: 0,
      per_share: 0,
    },
    format: "currency",
    decimals: 4,
  })

  // Live Scenario Variance Attribution Bridge (Active vs. Base Case)
  const scenarioVarianceBridge = sheet.addTable(
    "ScenarioVarianceBridge",
    "Scenario Value Attribution Bridge (Active vs. Base)",
    {
      subtitle: wrapSubtitle(
        "($ per share) | Live variance decomposition anchored to Base Case Gordon DCF benchmark",
        56
      ),
    }
  )
  scenarioVarianceBridge.addColumn("item", {
    role: "descriptor",
    header: "Attribution step",
  })
  scenarioVarianceBridge.addColumn("val_per_share", {
    headers: ["Value /", "Share ($)"],
    style: "bold",
    shade: "muted",
  })
  scenarioVarianceBridge.addColumn("pct_of_base", {
    headers: ["% of Base", "Price"],
  })

  scenarioVarianceBridge.addSectionHeader("Per-share scenario variance walk")
  scenarioVarianceBridge.addRow("base_case_price", {
    cells: {
      item: "Base Case implied share price",
      val_per_share: new Cell({
        expr: 'ExecutiveDashboard["dcf_gordon_price", "base"]',
      }),
      pct_of_base: new Cell({
        expr: '@table["base_case_price", "val_per_share"] / @table["base_case_price", "val_per_share"]',
        format: "percentage",
        decimals: 1,
      }),
    },
    format: "currency",
    decimals: 2,
    style: "subtotal",
  })
  scenarioVarianceBridge.addRow("delta_operating_cf", {
    cells: {
      item: "Operating cash flow & tax delta",
      val_per_share: new Cell({
        expr: '@table["price_active_cf_base_params", "val_per_share"] - @table["base_case_price", "val_per_share"]',
      }),
      pct_of_base: new Cell({
        expr: '@table[@row, "val_per_share"] / @table["base_case_price", "val_per_share"]',
        format: "percentage",
        decimals: 1,
      }),
    },
    format: "currency",
    decimals: 2,
  })
  scenarioVarianceBridge.addRow("delta_discount_and_tv", {
    cells: {
      item: "Discount rate & terminal delta",
      val_per_share: new Cell({
        expr: '@table["price_active_ev_base_bridge", "val_per_share"] - @table["price_active_cf_base_params", "val_per_share"]',
      }),
      pct_of_base: new Cell({
        expr: '@table[@row, "val_per_share"] / @table["base_case_price", "val_per_share"]',
        format: "percentage",
        decimals: 1,
      }),
    },
    format: "currency",
    decimals: 2,
  })
  scenarioVarianceBridge.addRow("delta_nonop_bridge_shares", {
    cells: {
      item: "Non-operating bridge & share delta",
      val_per_share: new Cell({
        expr: 'EvToEquityBridge["implied_share_price", "gordon"] - @table["price_active_ev_base_bridge", "val_per_share"]',
      }),
      pct_of_base: new Cell({
        expr: '@table[@row, "val_per_share"] / @table["base_case_price", "val_per_share"]',
        format: "percentage",
        decimals: 1,
      }),
    },
    format: "currency",
    decimals: 2,
  })
  scenarioVarianceBridge.addRow("active_case_price", {
    cells: {
      item: "Active scenario implied share price",
      val_per_share: new Cell({
        expr: 'SUM(@table["base_case_price".."delta_nonop_bridge_shares", "val_per_share"])',
      }),
      pct_of_base: new Cell({
        expr: '@table[@row, "val_per_share"] / @table["base_case_price", "val_per_share"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
    format: "currency",
    decimals: 2,
    style: "total",
  })
  scenarioVarianceBridge.addRow("variance_tie_check", {
    cells: {
      item: "Variance bridge closure check",
      val_per_share: new Cell({
        expr: '@table["active_case_price", "val_per_share"] - EvToEquityBridge["implied_share_price", "gordon"]',
      }),
      pct_of_base: new Cell({
        expr: '@table[@row, "val_per_share"] / @table["base_case_price", "val_per_share"]',
        format: "percentage",
        decimals: 2,
      }),
    },
    format: "currency",
    decimals: 4,
  })

  scenarioVarianceBridge.addRowGutter()
  scenarioVarianceBridge.addSectionHeader("Base-parameter counterfactuals")
  scenarioVarianceBridge.addRow("base_pf_shares", {
    cells: {
      item: "Base post-ASR diluted shares (M)",
      val_per_share: new Cell({
        expr: 'AuditedFootnoteAnchors["cover_shares_aug2026", "val"] - MAX(0, AuditedFootnoteAnchors["asr_upfront_payment", "val"] / ScalarDrivers["expectedAsrAvgPrice", "base"] - AuditedFootnoteAnchors["asr_initial_shares", "val"]) + AuditedFootnoteAnchors["q2_dilutive_awards", "val"]',
        format: "number",
        decimals: 2,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_mkt_cap", {
    cells: {
      item: "Base pro forma market cap ($M)",
      val_per_share: new Cell({
        expr: 'BetaSummaryTable["CRM", "spot_px"] * @table["base_pf_shares", "val_per_share"]',
        format: "currency",
        decimals: 0,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_aftertax_kd", {
    cells: {
      item: "Base after-tax marginal Kd",
      val_per_share: new Cell({
        expr: 'MacroRatesTable["marginal_pretax_kd", "val"] * (1 - ScalarDrivers["effectiveTaxRate", "base"])',
        format: "percentage",
        decimals: 2,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_beta_u", {
    cells: {
      item: "Base unlevered asset beta",
      val_per_share: new Cell({
        expr: 'BetaSummaryTable["CRM", "beta_5y_m"] / (1 + (1 - ScalarDrivers["effectiveTaxRate", "base"]) * ScalarDrivers["histBeta5yDe", "base"])',
        format: "number",
        decimals: 3,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_beta_l", {
    cells: {
      item: "Base relevered equity beta",
      val_per_share: new Cell({
        expr: '@table["base_beta_u", "val_per_share"] * (1 + (1 - ScalarDrivers["effectiveTaxRate", "base"]) * (Q2BalanceSheetAnchor["total_funded_debt_and_fin_leases", "Q2_FY27A"] / @table["base_mkt_cap", "val_per_share"]))',
        format: "number",
        decimals: 3,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_ke", {
    cells: {
      item: "Base relevered cost of equity (Ke)",
      val_per_share: new Cell({
        expr: 'MacroRatesTable["dgs10", "val"] + @table["base_beta_l", "val_per_share"] * ScalarDrivers["erp", "base"]',
        format: "percentage",
        decimals: 2,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_wacc", {
    cells: {
      item: "Base relevered WACC",
      val_per_share: new Cell({
        expr: '(@table["base_mkt_cap", "val_per_share"] * @table["base_ke", "val_per_share"] + Q2BalanceSheetAnchor["total_funded_debt_and_fin_leases", "Q2_FY27A"] * @table["base_aftertax_kd", "val_per_share"]) / (@table["base_mkt_cap", "val_per_share"] + Q2BalanceSheetAnchor["total_funded_debt_and_fin_leases", "Q2_FY27A"])',
        format: "percentage",
        decimals: 2,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_net_bridge", {
    cells: {
      item: "Base BS-date net bridge ($M)",
      val_per_share: new Cell({
        expr: '-Q2BalanceSheetAnchor["total_funded_debt_and_fin_leases", "Q2_FY27A"] + Q2BalanceSheetAnchor["total_cash_and_mkt", "Q2_FY27A"] - AuditedFootnoteAnchors["pending_q3_ma_total", "val"] - ScalarDrivers["brazeAcquisitionCash", "base"] / (1 + @table["base_aftertax_kd", "val_per_share"]) + Q2BalanceSheetAnchor["strategic_investments", "Q2_FY27A"] * (1 - ScalarDrivers["strategicInvHaircut", "base"])',
        format: "currency",
        decimals: 0,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("base_tv_mid_df", {
    cells: {
      item: "Base mid-year terminal PV factor",
      val_per_share: new Cell({
        expr: '((1 + @table["base_wacc", "val_per_share"]) ^ ScalarDrivers["midPeriodFactor", "base"]) / ((1 + @table["base_wacc", "val_per_share"]) ^ DcfModel["discount_period_yrs", "terminal"])',
        format: "number",
        decimals: 4,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("active_pv_explicit_at_base", {
    cells: {
      item: "Active explicit PV at Base WACC",
      val_per_share: new Cell({
        expr: 'SUM(DcfModel["pv_fcff_at_base_wacc", "H2_FY27E".."FY31E"])',
        format: "currency",
        decimals: 0,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("active_pv_tv_at_base", {
    cells: {
      item: "Active terminal PV at Base params",
      val_per_share: new Cell({
        expr: 'IF(@table["base_wacc", "val_per_share"] > ScalarDrivers["terminalGrowthRate", "base"], (DcfModel["ebita_nopat", "FY31E"] * (1 + ScalarDrivers["terminalGrowthRate", "base"]) * (1 - ScalarDrivers["terminalReinvestmentRate", "base"]) / (@table["base_wacc", "val_per_share"] - ScalarDrivers["terminalGrowthRate", "base"])) * @table["base_tv_mid_df", "val_per_share"], NA())',
        format: "currency",
        decimals: 0,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("active_ev_at_base_params", {
    cells: {
      item: "Active CFs at Base WACC & g ($M)",
      val_per_share: new Cell({
        expr: '@table["active_pv_explicit_at_base", "val_per_share"] + @table["active_pv_tv_at_base", "val_per_share"]',
        format: "currency",
        decimals: 0,
      }),
      pct_of_base: null,
    },
  })
  scenarioVarianceBridge.addRow("price_active_cf_base_params", {
    cells: {
      item: "Price: active CFs at Base params",
      val_per_share: new Cell({
        expr: '((@table["active_ev_at_base_params", "val_per_share"] + @table["base_net_bridge", "val_per_share"]) * ((1 + @table["base_ke", "val_per_share"]) ^ WaccSchedule["eq_roll_period_yrs", "primary"]) - 0.25 * PeriodDriversBase["dividendsPerShare", "FY27E"] * @table["base_pf_shares", "val_per_share"]) / @table["base_pf_shares", "val_per_share"]',
      }),
      pct_of_base: null,
    },
    format: "currency",
    decimals: 2,
  })
  scenarioVarianceBridge.addRow("price_active_ev_base_bridge", {
    cells: {
      item: "Price: active EV with Base bridge",
      val_per_share: new Cell({
        expr: '((DcfSummaryTable["operating_ev_bs_date", "gordon"] + @table["base_net_bridge", "val_per_share"]) * WaccSchedule["eq_roll_factor", "primary"] - 0.25 * PeriodDriversBase["dividendsPerShare", "FY27E"] * @table["base_pf_shares", "val_per_share"]) / @table["base_pf_shares", "val_per_share"]',
      }),
      pct_of_base: null,
    },
    format: "currency",
    decimals: 2,
  })

  // 5x5 WACC vs. Terminal Growth Rate Sensitivity Matrix + Companion Discount Factors
  const sensitivityWaccVsGrowth = sheet.addTable(
    "SensitivityWaccVsGrowth",
    "Implied Share Price Sensitivity: WACC vs. Terminal Growth (g)",
    {
      subtitle: wrapSubtitle(
        "($ per share) | Live 5x5 mid-year DCF grid centered on active relevered WACC and perpetual terminal growth rate",
        104
      ),
    }
  )
  sensitivityWaccVsGrowth.addColumn("item", {
    role: "descriptor",
    header: "WACC row",
  })
  sensitivityWaccVsGrowth.addColumn("wacc_axis", {
    headers: ["WACC", "Axis"],
    style: "bold",
    shade: "muted",
  })
  const gCols = [
    { id: "g_m100", headers: ["g - 100", "bps"], offset: -0.01 },
    { id: "g_m50", headers: ["g - 50", "bps"], offset: -0.005 },
    { id: "g_base", headers: ["Active", "Term. g"], offset: 0 },
    { id: "g_p50", headers: ["g + 50", "bps"], offset: 0.005 },
    { id: "g_p100", headers: ["g + 100", "bps"], offset: 0.01 },
  ] as const
  for (const gc of gCols) {
    sensitivityWaccVsGrowth.addColumn(gc.id, {
      headers: gc.headers,
      group: "Terminal Growth Rate (g)",
      ...(gc.id === "g_base" ? { shade: "muted" as const } : {}),
    })
  }

  const stepCells: Record<string, number | string> = {
    item: "Sensitivity step inputs",
    wacc_axis: 0.005,
  }
  for (const gc of gCols) {
    stepCells[gc.id] = gc.offset
  }
  sensitivityWaccVsGrowth.addRow("axis_steps", {
    cells: stepCells,
    format: "percentage",
    decimals: 2,
  })

  const gAxisCells: Record<string, Cell | null | string> = {
    item: "Terminal growth rate axis (g)",
    wacc_axis: null,
  }
  for (const gc of gCols) {
    gAxisCells[gc.id] = new Cell({
      expr: 'ScalarDrivers["terminalGrowthRate", "active"] + @table["axis_steps", @col]',
    })
  }
  sensitivityWaccVsGrowth.addRow("g_axis", {
    cells: gAxisCells,
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })

  const wRows = [
    {
      id: "w_m100",
      label: "WACC − 2 steps",
      axisExpr:
        'WaccSchedule["wacc", "primary"] - 2 * @table["axis_steps", "wacc_axis"]',
    },
    {
      id: "w_m50",
      label: "WACC − 1 step",
      axisExpr:
        'WaccSchedule["wacc", "primary"] - @table["axis_steps", "wacc_axis"]',
    },
    {
      id: "w_base",
      label: "Active primary WACC",
      axisExpr: 'WaccSchedule["wacc", "primary"]',
    },
    {
      id: "w_p50",
      label: "WACC + 1 step",
      axisExpr:
        'WaccSchedule["wacc", "primary"] + @table["axis_steps", "wacc_axis"]',
    },
    {
      id: "w_p100",
      label: "WACC + 2 steps",
      axisExpr:
        'WaccSchedule["wacc", "primary"] + 2 * @table["axis_steps", "wacc_axis"]',
    },
  ] as const

  const sensCellExpr =
    'IF(@table[@row, "wacc_axis"] > @table["g_axis", @col], ((WaccSensitivityWorkings[@row, "pv_explicit"] + (DcfSummaryTable["terminal_nopat_base", "gordon"] * (1 + @table["g_axis", @col]) / (@table[@row, "wacc_axis"] - @table["g_axis", @col])) * WaccSensitivityWorkings[@row, "tv_df"] + EvToEquityBridge["net_non_op_bridge", "gordon"]) * WaccSensitivityWorkings[@row, "eq_roll"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"], NA())'

  for (const wr of wRows) {
    const cells: Record<string, Cell | string> = {
      item: wr.label,
      wacc_axis: new Cell({
        expr: wr.axisExpr,
        format: "percentage",
        decimals: 2,
      }),
    }
    if (wr.id === "w_base") {
      cells["g_base"] = new Cell({
        expr: sensCellExpr,
        highlight: true,
      })
    }
    sensitivityWaccVsGrowth.addRow(wr.id, {
      cells,
      expr: sensCellExpr,
      format: "currency",
      decimals: 2,
      ...(wr.id === "w_base" ? { style: "subtotal" as const } : {}),
    })
  }

  // Companion Table for SensitivityWaccVsGrowth: WACC-Axis Discount Factors & Explicit PV
  const waccSensitivityWorkings = sheet.addTable(
    "WaccSensitivityWorkings",
    "WACC Sensitivity Discount Factors & Explicit PV",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except factors and rates) | Per-WACC discount factors, explicit FCFF present value, and equity roll-forward terms",
        140
      ),
    }
  )
  waccSensitivityWorkings.addColumn("item", {
    role: "descriptor",
    header: "WACC step",
  })
  for (const p of ["H2_FY27E", "FY28E", "FY29E", "FY30E", "FY31E"] as const) {
    waccSensitivityWorkings.addColumn(p, {
      header: p === "H2_FY27E" ? "H2 FY27E" : p,
      group: "Explicit Discount Factors",
      format: "number",
      decimals: 4,
    })
  }
  waccSensitivityWorkings.addColumn("pv_explicit", {
    headers: ["Explicit", "PV ($M)"],
    group: "WACC-Axis Terms",
    format: "currency",
    decimals: 0,
  })
  waccSensitivityWorkings.addColumn("tv_df", {
    headers: ["Mid-Yr", "TV DF"],
    group: "WACC-Axis Terms",
    format: "number",
    decimals: 4,
  })
  waccSensitivityWorkings.addColumn("implied_ke", {
    headers: ["Implied", "Ke"],
    group: "WACC-Axis Terms",
    format: "percentage",
    decimals: 2,
  })
  waccSensitivityWorkings.addColumn("eq_roll", {
    headers: ["Equity", "Roll Fac."],
    group: "WACC-Axis Terms",
    format: "number",
    decimals: 4,
  })

  for (const wr of wRows) {
    waccSensitivityWorkings.addRow(wr.id, {
      cells: {
        item: wr.label,
        H2_FY27E: new Cell({
          expr: '1 / ((1 + SensitivityWaccVsGrowth[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "H2_FY27E"])',
        }),
        FY28E: new Cell({
          expr: '1 / ((1 + SensitivityWaccVsGrowth[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY28E"])',
        }),
        FY29E: new Cell({
          expr: '1 / ((1 + SensitivityWaccVsGrowth[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY29E"])',
        }),
        FY30E: new Cell({
          expr: '1 / ((1 + SensitivityWaccVsGrowth[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY30E"])',
        }),
        FY31E: new Cell({
          expr: '1 / ((1 + SensitivityWaccVsGrowth[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY31E"])',
        }),
        pv_explicit: new Cell({
          expr: 'SUMPRODUCT(DcfModel["unlevered_fcff", "H2_FY27E".."FY31E"], @table[@row, "H2_FY27E".."FY31E"])',
        }),
        tv_df: new Cell({
          expr: '((1 + SensitivityWaccVsGrowth[@row, "wacc_axis"]) ^ ScalarDrivers["midPeriodFactor", "active"]) / ((1 + SensitivityWaccVsGrowth[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "terminal"])',
        }),
        implied_ke: new Cell({
          expr: '(SensitivityWaccVsGrowth[@row, "wacc_axis"] - WaccSchedule["debt_weight", "primary"] * WaccSchedule["aftertax_kd", "primary"]) / WaccSchedule["equity_weight", "primary"]',
        }),
        eq_roll: new Cell({
          expr: '(1 + @table[@row, "implied_ke"]) ^ WaccSchedule["eq_roll_period_yrs", "primary"]',
        }),
      },
      ...(wr.id === "w_base" ? { style: "subtotal" as const } : {}),
    })
  }

  // Market Expectation Matrix (WACC Regimes vs. 4-Yr FY27E-FY31E Total Revenue CAGR)
  const reverseDcfMatrix = sheet.addTable(
    "ReverseDcfMatrix",
    "Market Expectation Matrix: WACC Regime vs. 4-Year Revenue CAGR",
    {
      subtitle: wrapSubtitle(
        "($ per share) | Holds active-case FCFF margins constant across WACC regimes and 4-year FY27E–FY31E consolidated revenue CAGR",
        104
      ),
    }
  )
  reverseDcfMatrix.addColumn("item", {
    role: "descriptor",
    header: "WACC regime",
  })
  reverseDcfMatrix.addColumn("wacc_axis", {
    headers: ["WACC", "Regime"],
    style: "bold",
    shade: "muted",
  })
  const revCagrCols = [
    { id: "cagr_4", headers: ["4.0%", "Rev CAGR"], val: 0.04 },
    { id: "cagr_6", headers: ["6.0%", "Rev CAGR"], val: 0.06 },
    { id: "cagr_8", headers: ["8.0%", "Rev CAGR"], val: 0.08 },
    { id: "cagr_10", headers: ["10.0%", "Rev CAGR"], val: 0.1 },
    { id: "cagr_12", headers: ["12.0%", "Rev CAGR"], val: 0.12 },
  ] as const
  for (const rc of revCagrCols) {
    reverseDcfMatrix.addColumn(rc.id, {
      headers: rc.headers,
      group: "FY27E–FY31E Total Revenue CAGR (4-Yr)",
    })
  }

  const cagrAxisCells: Record<string, number | null | string> = {
    item: "FY27E–FY31E total rev. CAGR (4-yr)",
    wacc_axis: null,
  }
  for (const rc of revCagrCols) {
    cagrAxisCells[rc.id] = rc.val
  }
  reverseDcfMatrix.addRow("growth_axis", {
    cells: cagrAxisCells,
    format: "percentage",
    decimals: 1,
    style: "subtotal",
  })

  const waccRegimes = [
    {
      id: "wacc_850",
      label: "8.50% WACC (rate-cut / low beta)",
      val: 0.085,
    },
    {
      id: "wacc_925",
      label: "9.25% WACC (yield relief)",
      val: 0.0925,
    },
    {
      id: "wacc_975",
      label: "9.75% WACC (near 2Y-W beta)",
      val: 0.0975,
    },
    {
      id: "wacc_1050",
      label: "10.50% WACC (near 5Y-M beta)",
      val: 0.105,
    },
    {
      id: "wacc_1100",
      label: "11.00% WACC (high yield stress)",
      val: 0.11,
    },
  ] as const

  const revDcfExpr =
    'IF(@table[@row, "wacc_axis"] > ScalarDrivers["terminalGrowthRate", "active"], ((ExpectationWaccWorkings[@row, "pv_h2"] + ExpectationWaccWorkings[@row, "m_fy28"] * (1 + @table["growth_axis", @col]) + ExpectationWaccWorkings[@row, "m_fy29"] * ((1 + @table["growth_axis", @col]) ^ 2) + ExpectationWaccWorkings[@row, "m_fy30"] * ((1 + @table["growth_axis", @col]) ^ 3) + (ExpectationWaccWorkings[@row, "m_fy31"] + ExpectationWaccWorkings[@row, "tv_base"]) * ((1 + @table["growth_axis", @col]) ^ 4) + EvToEquityBridge["net_non_op_bridge", "gordon"]) * ExpectationWaccWorkings[@row, "eq_roll"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"], NA())'

  for (const wr of waccRegimes) {
    reverseDcfMatrix.addRow(wr.id, {
      cells: {
        item: wr.label,
        wacc_axis: new Cell({
          value: wr.val,
          format: "percentage",
          decimals: 2,
        }),
      },
      expr: revDcfExpr,
      format: "currency",
      decimals: 2,
    })
  }

  // Companion Table for ReverseDcfMatrix: Discounted Margin-Scaled Revenue & Terminal Bases
  const expectationWaccWorkings = sheet.addTable(
    "ExpectationWaccWorkings",
    "Expectation Matrix Discounted Revenue & Terminal Bases",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except factors and rates) | Discounted FY27E revenue-margin bases and terminal factors per WACC regime",
        140
      ),
    }
  )
  expectationWaccWorkings.addColumn("item", {
    role: "descriptor",
    header: "WACC regime",
  })
  expectationWaccWorkings.addColumn("pv_h2", {
    headers: ["H2 FY27E", "PV ($M)"],
    group: "Discounted Revenue Bases ($M)",
    format: "currency",
    decimals: 0,
  })
  expectationWaccWorkings.addColumn("m_fy28", {
    headers: ["FY28E", "Base ($M)"],
    group: "Discounted Revenue Bases ($M)",
    format: "currency",
    decimals: 0,
  })
  expectationWaccWorkings.addColumn("m_fy29", {
    headers: ["FY29E", "Base ($M)"],
    group: "Discounted Revenue Bases ($M)",
    format: "currency",
    decimals: 0,
  })
  expectationWaccWorkings.addColumn("m_fy30", {
    headers: ["FY30E", "Base ($M)"],
    group: "Discounted Revenue Bases ($M)",
    format: "currency",
    decimals: 0,
  })
  expectationWaccWorkings.addColumn("m_fy31", {
    headers: ["FY31E", "Base ($M)"],
    group: "Discounted Revenue Bases ($M)",
    format: "currency",
    decimals: 0,
  })
  expectationWaccWorkings.addColumn("tv_df", {
    headers: ["Mid-Yr", "TV DF"],
    group: "Terminal & Roll Terms",
    format: "number",
    decimals: 4,
  })
  expectationWaccWorkings.addColumn("tv_base", {
    headers: ["Terminal", "Base ($M)"],
    group: "Terminal & Roll Terms",
    format: "currency",
    decimals: 0,
  })
  expectationWaccWorkings.addColumn("implied_ke", {
    headers: ["Implied", "Ke"],
    group: "Terminal & Roll Terms",
    format: "percentage",
    decimals: 2,
  })
  expectationWaccWorkings.addColumn("eq_roll", {
    headers: ["Equity", "Roll Fac."],
    group: "Terminal & Roll Terms",
    format: "number",
    decimals: 4,
  })

  for (const wr of waccRegimes) {
    expectationWaccWorkings.addRow(wr.id, {
      cells: {
        item: wr.label,
        pv_h2: new Cell({
          expr: 'DcfModel["unlevered_fcff", "H2_FY27E"] / ((1 + ReverseDcfMatrix[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "H2_FY27E"])',
        }),
        m_fy28: new Cell({
          expr: 'IncomeStatement["total_revenue", "FY27E"] * (DcfModel["unlevered_fcff", "FY28E"] / DcfModel["revenue", "FY28E"]) / ((1 + ReverseDcfMatrix[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY28E"])',
        }),
        m_fy29: new Cell({
          expr: 'IncomeStatement["total_revenue", "FY27E"] * (DcfModel["unlevered_fcff", "FY29E"] / DcfModel["revenue", "FY29E"]) / ((1 + ReverseDcfMatrix[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY29E"])',
        }),
        m_fy30: new Cell({
          expr: 'IncomeStatement["total_revenue", "FY27E"] * (DcfModel["unlevered_fcff", "FY30E"] / DcfModel["revenue", "FY30E"]) / ((1 + ReverseDcfMatrix[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY30E"])',
        }),
        m_fy31: new Cell({
          expr: 'IncomeStatement["total_revenue", "FY27E"] * (DcfModel["unlevered_fcff", "FY31E"] / DcfModel["revenue", "FY31E"]) / ((1 + ReverseDcfMatrix[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "FY31E"])',
        }),
        tv_df: new Cell({
          expr: '((1 + ReverseDcfMatrix[@row, "wacc_axis"]) ^ ScalarDrivers["midPeriodFactor", "active"]) / ((1 + ReverseDcfMatrix[@row, "wacc_axis"]) ^ DcfModel["discount_period_yrs", "terminal"])',
        }),
        tv_base: new Cell({
          expr: 'IF(ReverseDcfMatrix[@row, "wacc_axis"] > ScalarDrivers["terminalGrowthRate", "active"], (IncomeStatement["total_revenue", "FY27E"] * (DcfSummaryTable["terminal_nopat_base", "gordon"] / DcfModel["revenue", "FY31E"]) * (1 + ScalarDrivers["terminalGrowthRate", "active"]) / (ReverseDcfMatrix[@row, "wacc_axis"] - ScalarDrivers["terminalGrowthRate", "active"])) * @table[@row, "tv_df"], NA())',
        }),
        implied_ke: new Cell({
          expr: '(ReverseDcfMatrix[@row, "wacc_axis"] - WaccSchedule["debt_weight", "primary"] * WaccSchedule["aftertax_kd", "primary"]) / WaccSchedule["equity_weight", "primary"]',
        }),
        eq_roll: new Cell({
          expr: '(1 + @table[@row, "implied_ke"]) ^ WaccSchedule["eq_roll_period_yrs", "primary"]',
        }),
      },
    })
  }

  // Terminal Reinvestment Rate Sensitivity
  const terminalReinvestSensitivity = sheet.addTable(
    "TerminalReinvestSensitivity",
    "Terminal Reinvestment Rate Sensitivity (% of EBITA NOPAT)",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except per-share and multiples) | Isolates valuation sensitivity to steady-state SaaS float tailwind vs. capital reinvestment drag",
        116
      ),
    }
  )
  terminalReinvestSensitivity.addColumn("item", {
    role: "descriptor",
    header: "Terminal reinvestment case",
  })
  terminalReinvestSensitivity.addColumn("reinv_rate", {
    headers: ["Reinv.", "Rate (%)"],
    format: "percentage",
    decimals: 1,
    style: "bold",
    shade: "muted",
  })
  terminalReinvestSensitivity.addColumn("term_fcff", {
    headers: ["Terminal", "FCFF ($M)"],
    format: "currency",
    decimals: 0,
  })
  terminalReinvestSensitivity.addColumn("implied_tv", {
    headers: ["Terminal", "Val. ($M)"],
    format: "currency",
    decimals: 0,
  })
  terminalReinvestSensitivity.addColumn("exit_ebitda_mult", {
    headers: ["Exit EV /", "EBITDA"],
    format: "multiple",
    decimals: 1,
  })
  terminalReinvestSensitivity.addColumn("implied_price", {
    headers: ["Implied", "Price ($)"],
    format: "currency",
    decimals: 2,
    style: "bold",
    shade: "muted",
  })
  terminalReinvestSensitivity.addColumn("vs_active", {
    headers: ["vs. Active", "($/sh)"],
    format: "currency",
    decimals: 2,
  })
  terminalReinvestSensitivity.addColumn("vs_spot", {
    headers: ["vs. Spot", "(%)"],
    format: "percentage",
    decimals: 1,
  })

  const reinvLevels = [
    {
      id: "reinv_m4",
      label: "−4.0% reinv. (strong float)",
      val: -0.04,
      isBase: false,
    },
    {
      id: "reinv_m2",
      label: "−2.0% reinv. (upside float)",
      val: -0.02,
      isBase: false,
    },
    {
      id: "reinv_0",
      label: "0.0% reinv. (zero net reinv.)",
      val: 0.0,
      isBase: true,
    },
    {
      id: "reinv_p4",
      label: "+4.0% reinv. (modest drag)",
      val: 0.04,
      isBase: false,
    },
    {
      id: "reinv_p6",
      label: "+6.0% reinv. (elevated drag)",
      val: 0.06,
      isBase: false,
    },
  ] as const

  for (const rl of reinvLevels) {
    terminalReinvestSensitivity.addRow(rl.id, {
      cells: {
        item: rl.label,
        reinv_rate: rl.val,
        term_fcff: new Cell({
          expr: 'DcfModel["ebita_nopat", "terminal"] * (1 - @table[@row, "reinv_rate"])',
        }),
        implied_tv: new Cell({
          expr: 'IF(WaccSchedule["wacc", "primary"] > ScalarDrivers["terminalGrowthRate", "active"], (@table[@row, "term_fcff"] / (WaccSchedule["wacc", "primary"] - ScalarDrivers["terminalGrowthRate", "active"])) * ((1 + WaccSchedule["wacc", "primary"]) ^ ScalarDrivers["midPeriodFactor", "active"]), NA())',
        }),
        exit_ebitda_mult: new Cell({
          expr: 'IF(QoeAndCashConversion["gaap_ebitda", "FY31E"] > 0, @table[@row, "implied_tv"] / QoeAndCashConversion["gaap_ebitda", "FY31E"], NA())',
        }),
        implied_price: new Cell({
          expr: '((DcfSummaryTable["pv_explicit_fcff", "gordon"] + @table[@row, "implied_tv"] * DcfModel["discount_factor", "terminal"] + EvToEquityBridge["net_non_op_bridge", "gordon"]) * WaccSchedule["eq_roll_factor", "primary"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
          ...(rl.isBase ? { highlight: true } : {}),
        }),
        vs_active: new Cell({
          expr: '@table[@row, "implied_price"] - EvToEquityBridge["implied_share_price", "gordon"]',
        }),
        vs_spot: new Cell({
          expr: '@table[@row, "implied_price"] / BetaSummaryTable["CRM", "spot_px"] - 1',
        }),
      },
      ...(rl.isBase ? { style: "subtotal" as const } : {}),
    })
  }

  // Investment Committee Single-Factor Stress & Cushion Scenarios
  const icStressScenarios = sheet.addTable(
    "IcStressScenarios",
    "Single-Factor Stress & Valuation Cushion Scenarios",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except per-share) | Live single-factor shocks relative to active primary 5Y-M DCF anchor",
        92
      ),
    }
  )
  icStressScenarios.addColumn("item", {
    role: "descriptor",
    header: "Stress / cushion scenario",
  })
  icStressScenarios.addColumn("key_param", {
    headers: ["Stress", "Parameter"],
  })
  icStressScenarios.addColumn("operating_ev_bs", {
    headers: ["Op. EV", "BS ($M)"],
    format: "currency",
    decimals: 0,
  })
  icStressScenarios.addColumn("implied_price", {
    headers: ["Implied", "Price ($)"],
    format: "currency",
    decimals: 2,
    style: "bold",
    shade: "muted",
  })
  icStressScenarios.addColumn("delta_vs_base", {
    headers: ["vs. Active", "($/sh)"],
    format: "currency",
    decimals: 2,
  })
  icStressScenarios.addColumn("vs_spot", {
    headers: ["vs. Spot", "(%)"],
    format: "percentage",
    decimals: 1,
  })

  icStressScenarios.addRow("beta_2y_w", {
    cells: {
      item: "Relevered 2Y-W beta regime",
      key_param: new Cell({
        expr: 'WaccSchedule["wacc", "short_regime"]',
        format: "percentage",
        decimals: 2,
      }),
      operating_ev_bs: new Cell({
        expr: 'IcStressWorkings["beta_2y_w", "pv_explicit"] + IcStressWorkings["beta_2y_w", "pv_terminal"]',
      }),
      implied_price: new Cell({
        expr: '((@table[@row, "operating_ev_bs"] + EvToEquityBridge["net_non_op_bridge", "gordon"]) * WaccSchedule["eq_roll_factor", "short_regime"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
      }),
      delta_vs_base: new Cell({
        expr: '@table[@row, "implied_price"] - EvToEquityBridge["implied_share_price", "gordon"]',
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_price"] / BetaSummaryTable["CRM", "spot_px"] - 1',
      }),
    },
  })

  icStressScenarios.addRow("debt_fv_cushion", {
    cells: {
      item: "Note 8 fixed-rate debt FV cushion",
      key_param: new Cell({
        expr: 'DebtTrancheRegistry["total_debt", "carrying"] - DebtTrancheRegistry["total_debt", "est_fair_value"]',
        format: "currency",
        decimals: 0,
      }),
      operating_ev_bs: new Cell({
        expr: 'DcfSummaryTable["operating_ev_bs_date", "gordon"]',
      }),
      implied_price: new Cell({
        expr: '((@table[@row, "operating_ev_bs"] + EvToEquityBridge["net_non_op_bridge", "gordon"] + @table[@row, "key_param"]) * WaccSchedule["eq_roll_factor", "primary"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
      }),
      delta_vs_base: new Cell({
        expr: '@table[@row, "implied_price"] - EvToEquityBridge["implied_share_price", "gordon"]',
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_price"] / BetaSummaryTable["CRM", "spot_px"] - 1',
      }),
    },
  })

  icStressScenarios.addRow("base_anchor", {
    cells: {
      item: "Active case baseline (5Y-M WACC)",
      key_param: new Cell({
        expr: 'WaccSchedule["wacc", "primary"]',
        format: "percentage",
        decimals: 2,
      }),
      operating_ev_bs: new Cell({
        expr: 'DcfSummaryTable["operating_ev_bs_date", "gordon"]',
      }),
      implied_price: new Cell({
        expr: '((@table[@row, "operating_ev_bs"] + EvToEquityBridge["net_non_op_bridge", "gordon"]) * WaccSchedule["eq_roll_factor", "primary"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
        highlight: true,
      }),
      delta_vs_base: new Cell({
        expr: '@table[@row, "implied_price"] - EvToEquityBridge["implied_share_price", "gordon"]',
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_price"] / BetaSummaryTable["CRM", "spot_px"] - 1',
      }),
    },
    style: "subtotal",
  })

  icStressScenarios.addRow("deleveraged_wacc", {
    cells: {
      item: "Deleveraged unlevered cost of eq.",
      key_param: new Cell({
        expr: 'WaccSchedule["rf", "primary"] + WaccSchedule["unlevered_beta", "primary"] * WaccSchedule["erp", "primary"]',
        format: "percentage",
        decimals: 2,
      }),
      operating_ev_bs: new Cell({
        expr: 'IcStressWorkings["deleveraged_wacc", "pv_explicit"] + IcStressWorkings["deleveraged_wacc", "pv_terminal"]',
      }),
      implied_price: new Cell({
        expr: '((@table[@row, "operating_ev_bs"] + EvToEquityBridge["net_non_op_bridge", "gordon"]) * WaccSchedule["eq_roll_factor", "primary"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
      }),
      delta_vs_base: new Cell({
        expr: '@table[@row, "implied_price"] - EvToEquityBridge["implied_share_price", "gordon"]',
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_price"] / BetaSummaryTable["CRM", "spot_px"] - 1',
      }),
    },
  })

  icStressScenarios.addRow("flat_fy27_ebita_mgn", {
    cells: {
      item: "Flat FY27E cash EBITA margin",
      key_param: new Cell({
        expr: 'QoeAndCashConversion["ebita", "FY27E"] / IncomeStatement["total_revenue", "FY27E"]',
        format: "percentage",
        decimals: 1,
      }),
      operating_ev_bs: new Cell({
        expr: 'IcStressWorkings["flat_fy27_ebita_mgn", "pv_explicit"] + IcStressWorkings["flat_fy27_ebita_mgn", "pv_terminal"]',
      }),
      implied_price: new Cell({
        expr: '((@table[@row, "operating_ev_bs"] + EvToEquityBridge["net_non_op_bridge", "gordon"]) * WaccSchedule["eq_roll_factor", "primary"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
      }),
      delta_vs_base: new Cell({
        expr: '@table[@row, "implied_price"] - EvToEquityBridge["implied_share_price", "gordon"]',
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_price"] / BetaSummaryTable["CRM", "spot_px"] - 1',
      }),
    },
  })

  icStressScenarios.addRow("ongoing_ma_leakage", {
    cells: {
      item: "Post-FY28 ongoing M&A NPV drag",
      key_param: new Cell({
        value: 1500,
        format: "currency",
        decimals: 0,
      }),
      operating_ev_bs: new Cell({
        expr: 'IcStressWorkings["ongoing_ma_leakage", "pv_explicit"] + IcStressWorkings["ongoing_ma_leakage", "pv_terminal"]',
      }),
      implied_price: new Cell({
        expr: '((@table[@row, "operating_ev_bs"] + EvToEquityBridge["net_non_op_bridge", "gordon"]) * WaccSchedule["eq_roll_factor", "primary"] + EvToEquityBridge["less_q3_dividend", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
      }),
      delta_vs_base: new Cell({
        expr: '@table[@row, "implied_price"] - EvToEquityBridge["implied_share_price", "gordon"]',
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_price"] / BetaSummaryTable["CRM", "spot_px"] - 1',
      }),
    },
  })

  // Companion Table for IcStressScenarios: Explicit & Terminal PV Breakdown
  const icStressWorkings = sheet.addTable(
    "IcStressWorkings",
    "Stress Scenario Cash Flow & Terminal Value Workings",
    {
      subtitle: wrapSubtitle(
        "($ in Millions) | Per-period explicit present value contributions and terminal present value by stress case (at Jul 31, 2026)",
        96
      ),
    }
  )
  icStressWorkings.addColumn("item", {
    role: "descriptor",
    header: "Stress case",
  })
  for (const p of ["H2_FY27E", "FY28E", "FY29E", "FY30E", "FY31E"] as const) {
    icStressWorkings.addColumn(p, {
      header: p === "H2_FY27E" ? "H2 FY27E" : p,
      group: "Explicit PV ($M)",
      format: "currency",
      decimals: 0,
    })
  }
  icStressWorkings.addColumn("pv_explicit", {
    headers: ["Explicit", "PV ($M)"],
    group: "Operating EV ($M)",
    format: "currency",
    decimals: 0,
  })
  icStressWorkings.addColumn("pv_terminal", {
    headers: ["Terminal", "PV ($M)"],
    group: "Operating EV ($M)",
    format: "currency",
    decimals: 0,
  })

  icStressWorkings.addRow("beta_2y_w", {
    cells: {
      item: "Relevered 2Y-W beta regime",
      pv_explicit: new Cell({
        expr: 'SUM(@table[@row, "H2_FY27E".."FY31E"])',
      }),
      pv_terminal: new Cell({
        expr: 'IF(WaccSchedule["wacc", "short_regime"] > ScalarDrivers["terminalGrowthRate", "active"], (DcfModel["unlevered_fcff", "terminal"] / (WaccSchedule["wacc", "short_regime"] - ScalarDrivers["terminalGrowthRate", "active"])) * ((1 + WaccSchedule["wacc", "short_regime"]) ^ ScalarDrivers["midPeriodFactor", "active"]) / ((1 + WaccSchedule["wacc", "short_regime"]) ^ DcfModel["discount_period_yrs", "terminal"]), NA())',
      }),
    },
    expr: 'DcfModel["unlevered_fcff", @col] / ((1 + WaccSchedule["wacc", "short_regime"]) ^ DcfModel["discount_period_yrs", @col])',
  })

  icStressWorkings.addRow("deleveraged_wacc", {
    cells: {
      item: "Deleveraged unlevered cost of eq.",
      pv_explicit: new Cell({
        expr: 'SUM(@table[@row, "H2_FY27E".."FY31E"])',
      }),
      pv_terminal: new Cell({
        expr: 'IF(IcStressScenarios["deleveraged_wacc", "key_param"] > ScalarDrivers["terminalGrowthRate", "active"], (DcfModel["unlevered_fcff", "terminal"] / (IcStressScenarios["deleveraged_wacc", "key_param"] - ScalarDrivers["terminalGrowthRate", "active"])) * ((1 + IcStressScenarios["deleveraged_wacc", "key_param"]) ^ ScalarDrivers["midPeriodFactor", "active"]) / ((1 + IcStressScenarios["deleveraged_wacc", "key_param"]) ^ DcfModel["discount_period_yrs", "terminal"]), NA())',
      }),
    },
    expr: 'DcfModel["unlevered_fcff", @col] / ((1 + IcStressScenarios["deleveraged_wacc", "key_param"]) ^ DcfModel["discount_period_yrs", @col])',
  })

  icStressWorkings.addRow("flat_fy27_ebita_mgn", {
    cells: {
      item: "Flat FY27E cash EBITA margin",
      H2_FY27E: new Cell({ expr: 'DcfModel["pv_fcff", "H2_FY27E"]' }),
      pv_explicit: new Cell({
        expr: 'SUM(@table[@row, "H2_FY27E".."FY31E"])',
      }),
      pv_terminal: new Cell({
        expr: 'IncomeStatement["total_revenue", "FY31E"] * IcStressScenarios["flat_fy27_ebita_mgn", "key_param"] * (1 - ScalarDrivers["effectiveTaxRate", "active"]) * (1 + ScalarDrivers["terminalGrowthRate", "active"]) * (1 - ScalarDrivers["terminalReinvestmentRate", "active"]) * DcfSummaryTable["tv_pv_factor", "gordon"]',
      }),
    },
    expr: 'DcfModel["pv_fcff", @col] + (IncomeStatement["total_revenue", @col] * IcStressScenarios["flat_fy27_ebita_mgn", "key_param"] - QoeAndCashConversion["ebita", @col]) * (1 - ScalarDrivers["effectiveTaxRate", "active"]) * DcfModel["discount_factor", @col]',
  })

  icStressWorkings.addRow("ongoing_ma_leakage", {
    cells: {
      item: "Post-FY28 ongoing M&A NPV drag",
      H2_FY27E: new Cell({ expr: 'DcfModel["pv_fcff", "H2_FY27E"]' }),
      FY28E: new Cell({ expr: 'DcfModel["pv_fcff", "FY28E"]' }),
      pv_explicit: new Cell({
        expr: 'SUM(@table[@row, "H2_FY27E".."FY31E"])',
      }),
      pv_terminal: new Cell({
        expr: 'DcfSummaryTable["pv_terminal_value", "gordon"] - IcStressScenarios["ongoing_ma_leakage", "key_param"] * (1 + ScalarDrivers["terminalGrowthRate", "active"]) * DcfSummaryTable["tv_pv_factor", "gordon"]',
      }),
    },
    expr: 'DcfModel["pv_fcff", @col] - IcStressScenarios["ongoing_ma_leakage", "key_param"] * DcfModel["discount_factor", @col]',
  })

  return {
    waccSchedule,
    dcfSummary,
    dcfModel,
    evToEquityBridge,
    scenarioVarianceBridge,
    sensitivityWaccVsGrowth,
    waccSensitivityWorkings,
    reverseDcfMatrix,
    expectationWaccWorkings,
    terminalReinvestSensitivity,
    icStressScenarios,
    icStressWorkings,
  }
}
