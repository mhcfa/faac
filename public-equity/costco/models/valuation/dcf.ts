import type { Sheet, Table } from "f8-engine"
import {
  FORECAST_PERIODS,
  PERIOD_METADATA,
  rowFormatOptions,
} from "../timeline.ts"

function exactPvFcffExpr(waccRef: string): string {
  return FORECAST_PERIODS.map(
    (p) =>
      `DcfSchedule["unlevered_fcff", "${p}"] / ((1 + ${waccRef}) ^ DcfSchedule["discount_years", "${p}"])`
  ).join(" + ")
}

export function buildDcfSchedules(
  sheet: Sheet,
  belowWacc: Table
): {
  readonly dcfSchedule: Table
  readonly dcfBridge: Table
  readonly sensitivityPerp: Table
  readonly sensitivityExit: Table
  readonly sensitivityOps: Table
  readonly reverseDcf: Table
} {
  // 1. 10-Year Unlevered FCFF Cash Flow & Discounting Schedule
  const dcfSchedule = sheet.addTable(
    "DcfSchedule",
    "10-Year Unlevered Discounted Cash Flow (DCF) Schedule ($M)",
    {
      subtitle: [
        "Explicit 10Y unlevered FCFF forecast (FY27E–FY36E) with SBC retained inside GAAP EBIT & NOPAT ($M)",
        "Exact YEARFRAC (Act/365) discounting from 2026-11-13 close; memo rows isolate ex-SBC delta and live scenario variance",
      ],
      currency: "USD",
      below: belowWacc,
    }
  )
  dcfSchedule.addColumn("line_item", {
    role: "descriptor",
    header: "DCF Cash Flow Line ($M)",
  })
  for (const p of FORECAST_PERIODS) {
    dcfSchedule.addColumn(p, {
      role: "measure",
      group: "Explicit 10-Year Forecast",
      header: PERIOD_METADATA[p].header,
    })
  }
  dcfSchedule.addColumn("Terminal", {
    role: "measure",
    group: "Continuation",
    header: "Terminal",
  })

  dcfSchedule.addSectionHeader("Timing & Discount Factors (YEARFRAC Act/365)")
  dcfSchedule.addRow("period_start_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Fiscal period start date",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'OperatingSchedule["period_start_date", @col]' },
        ])
      ),
      Terminal: { expr: 'OperatingSchedule["period_end_date", "FY36E"]' },
    },
  })
  dcfSchedule.addRow("period_end_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Fiscal period end date",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'OperatingSchedule["period_end_date", @col]' },
        ])
      ),
      Terminal: { expr: 'OperatingSchedule["period_end_date", "FY36E"]' },
    },
  })
  dcfSchedule.addRow("discount_years", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: {
        value: "Discount period from 2026-11-13 (years, live mid-year flag)",
        note: "Derived dynamically via YEARFRAC and active mid-year discounting toggle; Terminal Value discounted from FY36E period end.",
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'YEARFRAC(ScenarioControl["valuation_date", "val"], @table["period_end_date", @col], 3) - 0.5 * ScalarAssumptionsActive["mid_year_convention_flag", "val"] * YEARFRAC(@table["period_start_date", @col], @table["period_end_date", @col], 3)',
          },
        ])
      ),
      Terminal: {
        expr: 'YEARFRAC(ScenarioControl["valuation_date", "val"], @table["period_end_date", "FY36E"], 3)',
      },
    },
  })

  dcfSchedule.addSectionHeader("Unlevered Free Cash Flow (FCFF) Build")
  dcfSchedule.addRow("ebit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Operating Income (EBIT, post-SBC)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'IncomeStatement["operating_income", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["ebit", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("nopat", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "NOPAT = EBIT x (1 - ETR)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'InvestedCapitalROIC["nopat", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["nopat", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("da", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "(+) Depreciation & Amortization",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'WorkingCapitalPPE["da", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["da", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "(-) Capital Expenditures (CapEx)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'WorkingCapitalPPE["capex", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["capex", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("net_reinvestment", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item:
        "Net Reinvestment (dOperating IC = CapEx - D&A + dOpNWC + dLT)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'InvestedCapitalROIC["net_reinvestment", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["net_reinvestment", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("unlevered_fcff", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    cells: {
      line_item: "Unlevered Free Cash Flow (FCFF = NOPAT - Net Reinvestment)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'InvestedCapitalROIC["unlevered_fcff", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["unlevered_fcff", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("ebitda", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: EBITDA (FY36E anchors Exit-Multiple TV)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'IncomeStatement["ebitda", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["ebitda", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("sbc_after_tax_memo", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: After-tax SBC expense (not added back to FCFF)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'InvestedCapitalROIC["sbc_after_tax_memo", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["sbc_after_tax_memo", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })
  dcfSchedule.addRow("unlevered_fcff_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Unlevered FCFF ex-SBC (sensitivity delta only)",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'InvestedCapitalROIC["unlevered_fcff_ex_sbc_memo", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["unlevered_fcff_ex_sbc_memo", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
    },
  })

  dcfSchedule.addSectionHeader(
    "Present Value & Current EV Cash Yield Crossover"
  )
  dcfSchedule.addRow("discount_factor", {
    ...rowFormatOptions("number", 4),
    expr: '1 / ((1 + WaccSchedule["wacc", "val"]) ^ @table["discount_years", @col])',
    cells: { line_item: "Present Value Discount Factor" },
  })
  dcfSchedule.addRow("pv_fcff", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "PV of Unlevered FCFF / Perpetuity Terminal Value",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff", @col] * @table["discount_factor", @col]',
          },
        ])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (@table["unlevered_fcff", "Terminal"] / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * @table["discount_factor", "Terminal"], NA())',
      },
    },
  })
  dcfSchedule.addRow("pv_fcff_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: PV of Unlevered FCFF ex-SBC",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff_ex_sbc_memo", @col] * @table["discount_factor", @col]',
          },
        ])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (@table["unlevered_fcff_ex_sbc_memo", "Terminal"] / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * @table["discount_factor", "Terminal"], NA())',
      },
    },
  })
  dcfSchedule.addRow("pv_fcff_at_base_params", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Memo: PV at Base WACC & Base g (live scenario attribution)",
        note: "Discounts active scenario FCFF at Base WACC and Base g to isolate operating cash flow variance from rate/multiple effects.",
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff", @col] / ((1 + WaccSchedule["base_wacc_memo", "val"]) ^ @table["discount_years", @col])',
          },
        ])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["base_wacc_memo", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "Base"], (@table["unlevered_fcff", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "Base"]) / (WaccSchedule["base_wacc_memo", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "Base"])) / ((1 + WaccSchedule["base_wacc_memo", "val"]) ^ @table["discount_years", "Terminal"]), NA())',
      },
    },
  })
  dcfSchedule.addRow("pv_fcff_sc_wacc_base_g", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value:
          "Memo: PV at Active WACC & Base g (isolates WACC vs. Terminal g)",
        note: "Discounts active scenario FCFF at Active WACC and Base Terminal g to split WACC vs. Terminal g attribution.",
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [p, { expr: '@table["pv_fcff", @col]' }])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "Base"], (@table["unlevered_fcff", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "Base"]) / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "Base"])) * @table["discount_factor", "Terminal"], NA())',
      },
    },
  })
  dcfSchedule.addRow("fcf_yield_on_current_ev", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["unlevered_fcff", @col] / DcfBridge["current_market_ev", "perp"]',
    cells: {
      line_item:
        "Annual Unlevered FCFF Yield on Current EV ($476.5B ex-op-lease)",
    },
  })
  dcfSchedule.addRow("ust_crossover_flag", {
    ...rowFormatOptions("integer"),
    expr: 'IF(@table["fcf_yield_on_current_ev", @col] >= MarketAnchors["rf_par_10y", "val"], 1, 0)',
    cells: {
      line_item:
        "10Y UST Crossover Flag (1 = FCFF Yield >= 5.15% 10Y UST, 0 = Below)",
    },
  })

  // 2. DCF Enterprise-to-Equity Value Bridge & Cross-Checks
  const dcfBridge = sheet.addTable(
    "DcfBridge",
    "DCF Valuation Summary, EV-to-Equity Bridge & Terminal Cross-Checks ($M / $/sh)",
    {
      subtitle: [
        "Primary Perpetuity-Growth DCF paired with Exit EV/EBITDA terminal cross-check ($M / $/sh)",
        "Bridges FY26 Net Cash ($13,726M ex-op-leases) to Cum-Div & Ex-$30.00/sh Special Dividend prices",
      ],
      currency: "USD",
      below: dcfSchedule,
    }
  )
  dcfBridge.addColumn("line_item", {
    role: "descriptor",
    header: "Valuation Metric / Bridge Step",
  })
  dcfBridge.addColumn("perp", {
    role: "measure",
    headers: ["Primary", "Perp. DCF"],
  })
  dcfBridge.addColumn("exit_mult", {
    role: "measure",
    headers: ["Cross-Check", "Exit Mult."],
  })
  dcfBridge.addColumn("perp_ex_sbc", {
    role: "measure",
    headers: ["Memo: Perp.", "(ex-SBC)"],
  })

  dcfBridge.addSectionHeader("1. Enterprise Value & Terminal Weight")
  dcfBridge.addRow("pv_explicit_fcff", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of Explicit 10Y Unlevered FCFF (FY27E–FY36E)",
      perp: { expr: 'SUM(DcfSchedule["pv_fcff", "FY27E".."FY36E"])' },
      exit_mult: { expr: 'SUM(DcfSchedule["pv_fcff", "FY27E".."FY36E"])' },
      perp_ex_sbc: {
        expr: 'SUM(DcfSchedule["pv_fcff_ex_sbc_memo", "FY27E".."FY36E"])',
      },
    },
  })
  dcfBridge.addRow("pv_terminal_value", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of Terminal Value (at FY36E End)",
      perp: { expr: 'DcfSchedule["pv_fcff", "Terminal"]' },
      exit_mult: {
        expr: 'DcfSchedule["ebitda", "FY36E"] * ScalarAssumptionsActive["exit_ev_to_ebitda", "val"] * DcfSchedule["discount_factor", "Terminal"]',
      },
      perp_ex_sbc: { expr: 'DcfSchedule["pv_fcff_ex_sbc_memo", "Terminal"]' },
    },
  })
  dcfBridge.addRow("enterprise_value", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["pv_explicit_fcff", @col] + @table["pv_terminal_value", @col]',
    cells: { line_item: "Implied Enterprise Value ($M)" },
  })
  dcfBridge.addRow("tv_pct_of_ev", {
    ...rowFormatOptions("percentage", 1),
    expr: '@table["pv_terminal_value", @col] / @table["enterprise_value", @col]',
    cells: { line_item: "Terminal Value % of Enterprise Value" },
  })

  dcfBridge.addSectionHeader(
    "2. EV-to-Equity Value Bridge (Cum-Div & Ex-$30.00/sh)"
  )
  dcfBridge.addRow("plus_cash_sti", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["cash_and_equivalents", "FY26"] + BalanceSheet["short_term_investments", "FY26"]',
    cells: { line_item: "(+) FY26 Ending Cash & Short-Term Investments" },
  })
  dcfBridge.addRow("less_debt_leases", {
    ...rowFormatOptions("currency", 0),
    expr: '-(DebtLeasesSchedule["total_lt_debt_carrying", "FY26"] + DebtLeasesSchedule["revolver_end", "FY26"] + DebtLeasesSchedule["total_fin_lease_liab", "FY26"])',
    cells: {
      line_item: {
        value:
          "(-) FY26 Carrying Financial Debt & Finance Leases (excl. Op Leases)",
        note: "Post-operating-lease-rent EBIT/EBITDA/FCFF deducts $7,575M carrying financial debt + finance leases only, eliminating the $2,606M ASC 842 operating lease double-count.",
      },
    },
  })
  dcfBridge.addRow("net_cash_bridge", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["plus_cash_sti", @col] + @table["less_debt_leases", @col]',
    cells: { line_item: "Net Cash / (Net Debt) Bridge" },
  })
  dcfBridge.addRow("equity_value_cum_div", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["enterprise_value", @col] + @table["net_cash_bridge", @col]',
    cells: {
      line_item: "Implied Equity Value — Cum-$30.00 Special Dividend ($M)",
    },
  })
  dcfBridge.addRow("sec_shares", {
    ...rowFormatOptions("number", 3),
    expr: 'MarketAnchors["cost_sec_shares", "val"]',
    cells: { line_item: "SEC Filing Common Shares Outstanding (M)" },
  })
  dcfBridge.addRow("implied_price_cum_div", {
    ...rowFormatOptions("currency", 2),
    style: "subtotal",
    highlight: true,
    expr: '@table["equity_value_cum_div", @col] / @table["sec_shares", @col]',
    cells: {
      line_item: "Implied Intrinsic Share Price — Cum-Dividend ($/sh)",
    },
  })
  dcfBridge.addRow("less_special_div_ps", {
    ...rowFormatOptions("currency", 2),
    expr: '-ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]',
    cells: {
      line_item: "(-) Nov 24, 2026 Special Cash Dividend ($30.00/sh)",
    },
  })
  dcfBridge.addRow("implied_price_ex_div", {
    ...rowFormatOptions("currency", 2),
    style: "total",
    expr: '@table["implied_price_cum_div", @col] + @table["less_special_div_ps", @col]',
    cells: {
      line_item: "Implied Intrinsic Share Price — Ex-Dividend ($/sh)",
    },
  })
  dcfBridge.addRow("current_price_cum_div", {
    ...rowFormatOptions("currency", 2),
    expr: 'MarketAnchors["cost_close_price", "val"]',
    cells: { line_item: "2026-11-13 Closing Share Price (Cum-Dividend)" },
  })
  dcfBridge.addRow("current_market_ev", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["current_price_cum_div", @col] * @table["sec_shares", @col] - @table["net_cash_bridge", @col]',
    cells: {
      line_item: "Current Market Enterprise Value ($M, ex-op-lease basis)",
    },
  })
  dcfBridge.addRow("headline_ev_incl_op_leases_memo", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["current_price_cum_div", @col] * @table["sec_shares", @col] + DebtLeasesSchedule["total_debt_and_leases", "FY26"] - @table["plus_cash_sti", @col]',
    cells: {
      line_item: {
        value: "Memo: Headline Market EV (incl. $2,606M ASC 842 Op Leases)",
        note: "Reconciles $476,468M ex-operating-lease EV (+$2,606M FY26 operating lease liabilities = $479,074M StockAnalysis headline EV).",
      },
    },
  })
  dcfBridge.addRow("upside_downside_cum_div", {
    ...rowFormatOptions("percentage", 1),
    expr: '@table["implied_price_cum_div", @col] / @table["current_price_cum_div", @col] - 1',
    cells: {
      line_item: "Implied Upside / (Downside) vs. $1,106.21 Cum-Div Close",
    },
  })
  dcfBridge.addRow("upside_downside_ex_div", {
    ...rowFormatOptions("percentage", 1),
    expr: '@table["implied_price_ex_div", @col] / (@table["current_price_cum_div", @col] + @table["less_special_div_ps", @col]) - 1',
    cells: {
      line_item: "Implied Upside / (Downside) vs. $1,076.21 Ex-Div Equivalent",
    },
  })

  dcfBridge.addSectionHeader(
    "3. Terminal Method Cross-Checks & Yield vs. 10Y UST"
  )
  dcfBridge.addRow("undiscounted_tv", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["pv_terminal_value", @col] / DcfSchedule["discount_factor", "Terminal"]',
    cells: { line_item: "Undiscounted Terminal Value at FY36E ($M)" },
  })
  dcfBridge.addRow("implied_exit_ev_ebitda", {
    ...rowFormatOptions("multiple", 1),
    expr: '@table["undiscounted_tv", @col] / DcfSchedule["ebitda", "FY36E"]',
    cells: { line_item: "Implied Terminal Exit EV / FY36E EBITDA" },
  })
  dcfBridge.addRow("implied_perp_growth", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Implied Perpetual Growth Rate (g at Active WACC)",
      perp: {
        expr: '(@table["undiscounted_tv", @col] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff", "FY36E"]) / (@table["undiscounted_tv", @col] + DcfSchedule["unlevered_fcff", "FY36E"])',
      },
      exit_mult: {
        expr: '(@table["undiscounted_tv", @col] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff", "FY36E"]) / (@table["undiscounted_tv", @col] + DcfSchedule["unlevered_fcff", "FY36E"])',
      },
      perp_ex_sbc: {
        expr: '(@table["undiscounted_tv", @col] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff_ex_sbc_memo", "FY36E"]) / (@table["undiscounted_tv", @col] + DcfSchedule["unlevered_fcff_ex_sbc_memo", "FY36E"])',
      },
    },
  })
  dcfBridge.addRow("gdp_cap_warning_flag", {
    ...rowFormatOptions("integer"),
    expr: 'IF(@table["implied_perp_growth", @col] > 0.04, 1, 0)',
    cells: {
      line_item: {
        value:
          "Nominal GDP Ceiling Flag (1 = Implied g > 4.0% exceeds US LT GDP)",
        note: "Flags terminal assumptions violating mature economy nominal GDP ceiling (~2.24% T10YIE + ~1.5% real GDP).",
      },
    },
  })
  dcfBridge.addRow("fy36_ronic", {
    ...rowFormatOptions("percentage", 1),
    expr: 'InvestedCapitalROIC["ronic", "FY36E"]',
    cells: { line_item: "FY36E Incremental ROIC (RONIC)" },
  })
  dcfBridge.addRow("steady_state_reinvest_req", {
    ...rowFormatOptions("percentage", 1),
    expr: '@table["implied_perp_growth", @col] / @table["fy36_ronic", @col]',
    cells: {
      line_item: "Required Steady-State Reinvestment Rate (Implied g / RONIC)",
    },
  })
  dcfBridge.addRow("fy36_reinvestment_rate", {
    ...rowFormatOptions("percentage", 1),
    expr: 'InvestedCapitalROIC["reinvestment_rate", "FY36E"]',
    cells: { line_item: "Modeled FY36E Reinvestment Rate (dIC / NOPAT)" },
  })
  dcfBridge.addRow("fy27_fcff_yield_on_ev", {
    ...rowFormatOptions("percentage", 2),
    expr: 'DcfSchedule["fcf_yield_on_current_ev", "FY27E"]',
    cells: {
      line_item:
        "FY27E Unlevered FCFF Yield on Current EV ($476.5B ex-op-lease)",
    },
  })
  dcfBridge.addRow("fy36_fcff_yield_on_ev", {
    ...rowFormatOptions("percentage", 2),
    expr: 'DcfSchedule["fcf_yield_on_current_ev", "FY36E"]',
    cells: {
      line_item:
        "FY36E Unlevered FCFF Yield on Current EV ($476.5B ex-op-lease)",
    },
  })
  dcfBridge.addRow("ust_crossover_years_met", {
    ...rowFormatOptions("integer"),
    expr: 'SUM(DcfSchedule["ust_crossover_flag", "FY27E".."FY36E"])',
    cells: {
      line_item:
        "Forecast Years Clearing 5.15% 10Y UST Yield on Current EV (out of 10)",
    },
  })

  // 3. Two-Way Sensitivity Table 1: WACC vs. Terminal Growth (Perpetuity Cum-Div Share Price)
  const sensitivityPerp = sheet.addTable(
    "SensitivityPerpWaccG",
    "Sensitivity: Perpetuity DCF Cum-Dividend Price ($/sh) — WACC vs. Terminal g",
    {
      subtitle: [
        "Axis steps wired to active WACC (+/-25 bps) and Terminal g (+/-25 bps) sensitivity step drivers",
        "Interior grid evaluates live 10Y discounted FCFF + Gordon Growth Terminal Value (Cum-Div $/sh)",
      ],
      currency: "USD",
      below: dcfBridge,
    }
  )
  sensitivityPerp.addColumn("line_item", {
    role: "descriptor",
    header: "WACC \\ Terminal g",
  })
  sensitivityPerp.addColumn("wacc_axis", {
    role: "measure",
    header: "WACC",
  })
  const gSteps = [-2, -1, 0, 1, 2] as const
  const gColIds = ["g_m2", "g_m1", "g_0", "g_p1", "g_p2"] as const
  for (let i = 0; i < gSteps.length; i++) {
    const step = gSteps[i]!
    const label = step === 0 ? "Base g" : `${step > 0 ? "+" : ""}${step} step`
    sensitivityPerp.addColumn(gColIds[i]!, {
      role: "measure",
      group: "Terminal Perpetuity Growth (g)",
      header: label,
    })
  }
  sensitivityPerp.addRow("g_header", {
    style: "subtotal",
    cells: {
      line_item: "Terminal g Input Axis",
      wacc_axis: {
        expr: 'WaccSchedule["wacc", "val"]',
        format: "percentage",
        decimals: 2,
      },
      ...Object.fromEntries(
        gSteps.map((s, idx) => [
          gColIds[idx]!,
          {
            expr: `ScalarAssumptionsActive["terminal_growth_rate", "val"] + (${s}) * ScalarAssumptionsActive["term_growth_step_sensitivity", "val"]`,
            format: "percentage",
            decimals: 2,
          },
        ])
      ),
    },
  })

  const wSteps = [-2, -1, 0, 1, 2] as const
  const wRowIds = ["w_m2", "w_m1", "w_0", "w_p1", "w_p2"] as const
  const pvExplicitAtRowW = exactPvFcffExpr('@table[@row, "wacc_axis"]')
  for (let i = 0; i < wSteps.length; i++) {
    const step = wSteps[i]!
    const rowId = wRowIds[i]!
    const label =
      step === 0 ? "Active WACC" : `WACC ${step > 0 ? "+" : ""}${step} step`
    sensitivityPerp.addRow(rowId, {
      ...(step === 0 ? { style: "subtotal" as const } : {}),
      cells: {
        line_item: label,
        wacc_axis: {
          expr: `WaccSchedule["wacc", "val"] + (${step}) * ScalarAssumptionsActive["wacc_step_sensitivity", "val"]`,
          format: "percentage",
          decimals: 2,
        },
        ...Object.fromEntries(
          gColIds.map((gCol) => [
            gCol,
            {
              expr: `IF(@table[@row, "wacc_axis"] > @table["g_header", "${gCol}"], ((${pvExplicitAtRowW}) + (DcfSchedule["unlevered_fcff", "FY36E"] * (1 + @table["g_header", "${gCol}"]) / (@table[@row, "wacc_axis"] - @table["g_header", "${gCol}"])) / ((1 + @table[@row, "wacc_axis"]) ^ DcfSchedule["discount_years", "Terminal"]) + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["sec_shares", "perp"], NA())`,
              format: "currency",
              decimals: 2,
              ...(step === 0 && gCol === "g_0" ? { highlight: true } : {}),
            },
          ])
        ),
      },
    })
  }

  // 4. Two-Way Sensitivity Table 2: WACC vs. Exit EV/EBITDA (Exit-Multiple Cum-Div Price)
  const sensitivityExit = sheet.addTable(
    "SensitivityExitWaccMult",
    "Sensitivity: Exit-Multiple DCF Cum-Dividend Price ($/sh) — WACC vs. Exit EV/EBITDA",
    {
      subtitle: [
        "Axis steps wired to active WACC (+/-25 bps) and Exit EV/EBITDA (+/-1.0x) sensitivity step drivers",
        "Center cell (Active WACC, Base Mult) ties identically to Exit-Multiple DCF Cum-Div target price ($/sh)",
      ],
      currency: "USD",
      below: sensitivityPerp,
    }
  )
  sensitivityExit.addColumn("line_item", {
    role: "descriptor",
    header: "WACC \\ Exit EV/EBITDA",
  })
  sensitivityExit.addColumn("wacc_axis", {
    role: "measure",
    header: "WACC",
  })
  const mColIds = ["m_m2", "m_m1", "m_0", "m_p1", "m_p2"] as const
  for (let i = 0; i < gSteps.length; i++) {
    const step = gSteps[i]!
    const label =
      step === 0 ? "Base Mult" : `${step > 0 ? "+" : ""}${step} step`
    sensitivityExit.addColumn(mColIds[i]!, {
      role: "measure",
      group: "Terminal Exit EV / FY36E EBITDA",
      header: label,
    })
  }
  sensitivityExit.addRow("mult_header", {
    style: "subtotal",
    cells: {
      line_item: "Exit EV/EBITDA Axis",
      wacc_axis: {
        expr: 'WaccSchedule["wacc", "val"]',
        format: "percentage",
        decimals: 2,
      },
      ...Object.fromEntries(
        gSteps.map((s, idx) => [
          mColIds[idx]!,
          {
            expr: `ScalarAssumptionsActive["exit_ev_to_ebitda", "val"] + (${s}) * ScalarAssumptionsActive["exit_multiple_step_sensitivity", "val"]`,
            format: "multiple",
            decimals: 1,
          },
        ])
      ),
    },
  })
  for (let i = 0; i < wSteps.length; i++) {
    const step = wSteps[i]!
    const rowId = wRowIds[i]!
    const label =
      step === 0 ? "Active WACC" : `WACC ${step > 0 ? "+" : ""}${step} step`
    sensitivityExit.addRow(rowId, {
      ...(step === 0 ? { style: "subtotal" as const } : {}),
      cells: {
        line_item: label,
        wacc_axis: {
          expr: `WaccSchedule["wacc", "val"] + (${step}) * ScalarAssumptionsActive["wacc_step_sensitivity", "val"]`,
          format: "percentage",
          decimals: 2,
        },
        ...Object.fromEntries(
          mColIds.map((mCol) => [
            mCol,
            {
              expr: `((${pvExplicitAtRowW}) + (DcfSchedule["ebitda", "FY36E"] * @table["mult_header", "${mCol}"]) / ((1 + @table[@row, "wacc_axis"]) ^ DcfSchedule["discount_years", "Terminal"]) + DcfBridge["net_cash_bridge", "exit_mult"]) / DcfBridge["sec_shares", "exit_mult"]`,
              format: "currency",
              decimals: 2,
              ...(step === 0 && mCol === "m_0" ? { highlight: true } : {}),
            },
          ])
        ),
      },
    })
  }

  // 5. Two-Way Operating Sensitivity: EBIT Margin Delta vs. Revenue Comp Delta (Perp Cum-Div Price)
  const sensitivityOps = sheet.addTable(
    "SensitivityOpsPerp",
    "Sensitivity: Perpetuity DCF Cum-Dividend Price ($/sh) — Operating Margin Delta vs. Annual Comp Delta",
    {
      subtitle: [
        "Stress-tests parallel 10Y EBIT margin shift (-50/+50 bps) vs. annual revenue growth shift (-100/+100 bps)",
        "Scales NOPAT and net reinvestment dynamically; center cell ties to Perpetuity DCF Cum-Div price ($/sh)",
      ],
      currency: "USD",
      below: sensitivityExit,
    }
  )
  sensitivityOps.addColumn("line_item", {
    role: "descriptor",
    header: "EBIT Margin Delta \\ Growth Delta",
  })
  sensitivityOps.addColumn("margin_delta_axis", {
    role: "measure",
    headers: ["EBIT", "Margin d"],
  })
  const cColIds = ["c_m2", "c_m1", "c_0", "c_p1", "c_p2"] as const
  for (let i = 0; i < gSteps.length; i++) {
    const step = gSteps[i]!
    const label =
      step === 0 ? "Base Growth" : `${step > 0 ? "+" : ""}${step} step`
    sensitivityOps.addColumn(cColIds[i]!, {
      role: "measure",
      group: "Annual Revenue Growth Delta (bps/yr)",
      header: label,
    })
  }
  sensitivityOps.addRow("comp_header", {
    style: "subtotal",
    cells: {
      line_item: "Annual Revenue Growth Shift",
      margin_delta_axis: { value: 0, format: "percentage", decimals: 2 },
      ...Object.fromEntries(
        gSteps.map((s, idx) => [
          cColIds[idx]!,
          {
            expr: `(${s}) * ScalarAssumptionsActive["comp_growth_step_sensitivity", "val"]`,
            format: "percentage",
            decimals: 2,
          },
        ])
      ),
    },
  })

  const buildOpsPvFcff = (colKey: string): string => {
    const terms: string[] = []
    for (let idx = 0; idx < FORECAST_PERIODS.length; idx++) {
      const p = FORECAST_PERIODS[idx]!
      const prevPeriod = idx === 0 ? "FY26" : FORECAST_PERIODS[idx - 1]!
      const yr = idx + 1
      const revScale = `(1 + @table["comp_header", "${colKey}"]) ^ ${yr}`
      const prevScale =
        idx === 0
          ? "1"
          : `((1 + @table["comp_header", "${colKey}"]) ^ ${yr - 1})`
      const stressedNopat = `IncomeStatement["total_revenue", "${p}"] * (${revScale}) * (IncomeStatement["operating_margin_pct", "${p}"] + @table[@row, "margin_delta_axis"]) * (1 - PeriodAssumptionsActive["effective_tax_rate", "${p}"])`
      const stressedNetReinvest = `(InvestedCapitalROIC["operating_ic", "${p}"] * (${revScale}) - InvestedCapitalROIC["operating_ic", "${prevPeriod}"] * (${prevScale}))`
      const shiftedFcff = `(${stressedNopat} - ${stressedNetReinvest})`
      terms.push(`(${shiftedFcff}) * DcfSchedule["discount_factor", "${p}"]`)
    }
    const revScale10 = `(1 + @table["comp_header", "${colKey}"]) ^ 10`
    const prevScale9 = `(1 + @table["comp_header", "${colKey}"]) ^ 9`
    const stressedNopat10 = `IncomeStatement["total_revenue", "FY36E"] * (${revScale10}) * (IncomeStatement["operating_margin_pct", "FY36E"] + @table[@row, "margin_delta_axis"]) * (1 - PeriodAssumptionsActive["effective_tax_rate", "FY36E"])`
    const stressedNetReinvest10 = `(InvestedCapitalROIC["operating_ic", "FY36E"] * (${revScale10}) - InvestedCapitalROIC["operating_ic", "FY35E"] * (${prevScale9}))`
    const shiftedFcff10 = `(${stressedNopat10} - ${stressedNetReinvest10})`
    const tvTerm = `(((${shiftedFcff10}) * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"]) / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * DcfSchedule["discount_factor", "Terminal"])`
    return `IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], ((${terms.join(" + ")}) + ${tvTerm} + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["sec_shares", "perp"], NA())`
  }

  const mRowIds = ["md_m2", "md_m1", "md_0", "md_p1", "md_p2"] as const
  for (let i = 0; i < wSteps.length; i++) {
    const step = wSteps[i]!
    const rowId = mRowIds[i]!
    const label =
      step === 0
        ? "Base EBIT Margin"
        : `EBIT Margin ${step > 0 ? "+" : ""}${step} step`
    sensitivityOps.addRow(rowId, {
      ...(step === 0 ? { style: "subtotal" as const } : {}),
      cells: {
        line_item: label,
        margin_delta_axis: {
          expr: `(${step}) * ScalarAssumptionsActive["ebit_margin_step_sensitivity", "val"]`,
          format: "percentage",
          decimals: 2,
        },
        ...Object.fromEntries(
          cColIds.map((cCol) => [
            cCol,
            {
              expr: buildOpsPvFcff(cCol),
              format: "currency",
              decimals: 2,
              ...(step === 0 && cCol === "c_0" ? { highlight: true } : {}),
            },
          ])
        ),
      },
    })
  }

  // 6. Reverse DCF: What $1,106.21 Market Close ($476.5B Ex-Op-Lease EV) Implies
  const reverseDcf = sheet.addTable(
    "ReverseDcfTable",
    "Reverse DCF: Fundamental Expectations Implied by $1,106.21 Close ($476.5B Ex-Op-Lease EV)",
    {
      subtitle: [
        "Solves algebraically for implied terminal growth (g), FY36E exit EV/EBITDA multiple,",
        "or 10Y FCFF CAGR required to justify $1,106.21 close ($476.5B ex-op-lease Market EV)",
      ],
      currency: "USD",
      below: sensitivityOps,
    }
  )
  reverseDcf.addColumn("line_item", {
    role: "descriptor",
    header: "Reverse DCF Solved Benchmark",
  })
  reverseDcf.addColumn("val", {
    role: "measure",
    headers: ["Implied at", "Mkt. Close"],
  })
  reverseDcf.addColumn("active_model", {
    role: "measure",
    headers: ["Active", "Model"],
  })

  reverseDcf.addRow("current_ev", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Enterprise Value (Market vs. Active Perp DCF)",
      val: { expr: 'DcfBridge["current_market_ev", "perp"]' },
      active_model: { expr: 'DcfBridge["enterprise_value", "perp"]' },
    },
  })
  reverseDcf.addRow("pv_explicit_fcff", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of Explicit 10Y FCFF (FY27E–FY36E)",
      val: { expr: 'DcfBridge["pv_explicit_fcff", "perp"]' },
      active_model: { expr: 'DcfBridge["pv_explicit_fcff", "perp"]' },
    },
  })
  reverseDcf.addRow("implied_pv_tv", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Residual PV of Terminal Value Required (EV - PV Explicit)",
      val: {
        expr: '@table["current_ev", "val"] - @table["pv_explicit_fcff", "val"]',
      },
      active_model: { expr: 'DcfBridge["pv_terminal_value", "perp"]' },
    },
  })
  reverseDcf.addRow("implied_undiscounted_tv", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Undiscounted Terminal Value Required at FY36E",
      val: {
        expr: '@table["implied_pv_tv", "val"] / DcfSchedule["discount_factor", "Terminal"]',
      },
      active_model: { expr: 'DcfBridge["undiscounted_tv", "perp"]' },
    },
  })
  reverseDcf.addRow("implied_term_g", {
    ...rowFormatOptions("percentage", 2),
    highlight: true,
    cells: {
      line_item:
        "Implied Perpetual Growth Rate g (at Active WACC & FY36E FCFF)",
      val: {
        expr: '(@table["implied_undiscounted_tv", "val"] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff", "FY36E"]) / (@table["implied_undiscounted_tv", "val"] + DcfSchedule["unlevered_fcff", "FY36E"])',
      },
      active_model: {
        expr: 'ScalarAssumptionsActive["terminal_growth_rate", "val"]',
      },
    },
  })
  reverseDcf.addRow("implied_exit_ebitda", {
    ...rowFormatOptions("multiple", 1),
    highlight: true,
    cells: {
      line_item: "Implied FY36E Exit EV / EBITDA Multiple (Year 10)",
      val: {
        expr: '@table["implied_undiscounted_tv", "val"] / DcfSchedule["ebitda", "FY36E"]',
      },
      active_model: { expr: 'DcfBridge["implied_exit_ev_ebitda", "perp"]' },
    },
  })
  reverseDcf.addRow("req_fy36_fcff_at_base_g", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Required FY36E FCFF if Terminal g = Active Model g",
      val: {
        expr: '@table["implied_undiscounted_tv", "val"] * (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"]) / (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
      active_model: { expr: 'DcfSchedule["unlevered_fcff", "FY36E"]' },
    },
  })
  reverseDcf.addRow("implied_10y_fcff_cagr", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Implied 10Y FCFF CAGR (FY26 -> Req FY36E FCFF at Active g)",
      val: {
        expr: 'IF(@table["req_fy36_fcff_at_base_g", "val"] > 0, (@table["req_fy36_fcff_at_base_g", "val"] / InvestedCapitalROIC["unlevered_fcff", "FY26"]) ^ 0.1 - 1, NA())',
      },
      active_model: {
        expr: 'IF(@table["req_fy36_fcff_at_base_g", "active_model"] > 0, (@table["req_fy36_fcff_at_base_g", "active_model"] / InvestedCapitalROIC["unlevered_fcff", "FY26"]) ^ 0.1 - 1, NA())',
      },
    },
  })

  return {
    dcfSchedule,
    dcfBridge,
    sensitivityPerp,
    sensitivityExit,
    sensitivityOps,
    reverseDcf,
  }
}
