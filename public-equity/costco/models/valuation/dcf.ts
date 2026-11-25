import type { Sheet, Table } from "f8-engine"
import {
  FORECAST_PERIODS,
  PERIOD_METADATA,
  notedNull,
  rowFormatOptions,
  type ScenarioName,
} from "../timeline.ts"
import type { ScenarioSnapshot } from "./bridges.ts"

export function buildDcfTables(
  sheet: Sheet,
  snapshots: Readonly<Record<ScenarioName, ScenarioSnapshot>> | null
): {
  readonly dcfSchedule: Table
  readonly dcfBridge: Table
  readonly reverseDcf: Table
  readonly impliedRateCalc: Table
  readonly valuationSensSummary: Table
  readonly sensitivityPerp: Table
  readonly sensitivityExit: Table
  readonly sensitivityOps: Table
  readonly sensitivityOpsVsSpot: Table
  readonly rateDiscountFactors: Table
  readonly opsSensFactors: Table
} {
  // 10-Year Unlevered FCFF Cash Flow & Discounting Schedule
  const dcfSchedule = sheet.addTable(
    "DcfSchedule",
    "10-Year Unlevered Discounted Cash Flow (DCF) Schedule ($M)",
    {
      subtitle: [
        "Explicit 10-year unlevered FCFF forecast (FY27E–FY36E) with stock-based compensation retained inside EBIT and NOPAT ($M)",
        "Exact Act/365 time-weighted discounting from 2026-11-13 close; ex-SBC and Base-parameter memo rows shown below",
      ],
      currency: "USD",
    }
  )
  dcfSchedule.addColumn("line_item", {
    role: "descriptor",
    header: "DCF cash flow ($M)",
  })
  for (const p of FORECAST_PERIODS) {
    dcfSchedule.addColumn(p, {
      role: "measure",
      group: "Forecast",
      header: PERIOD_METADATA[p].header,
    })
  }
  dcfSchedule.addColumn("Terminal", {
    role: "measure",
    group: "Terminal",
    header: "Terminal",
  })

  dcfSchedule.addSectionHeader("Timing and discount periods (Act/365)")
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
      line_item: "Discount period (years)",
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
        note: "Year-end FY36E discount horizon applied to point-in-time Exit-Multiple DCF.",
      },
    },
  })
  dcfSchedule.addRow("discount_years_perp", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "Perpetuity TV discount yrs",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '@table["discount_years", @col]' },
        ])
      ),
      Terminal: {
        expr: '@table["discount_years", "Terminal"] - 0.5 * ScalarAssumptionsActive["mid_year_convention_flag", "val"]',
        note: "Mid-year Gordon Growth continuity: places FY37E perpetuity cash flow exactly 1.000 yr after FY36E midpoint.",
      },
    },
  })

  dcfSchedule.addRowGutter()
  dcfSchedule.addSectionHeader("Unlevered free cash flow (FCFF) build")
  dcfSchedule.addRow("ebit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Operating income (EBIT)",
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
      line_item: "NOPAT",
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
      line_item: "(+) Depreciation & amortization",
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
      line_item: "(−) Capital expenditures (CapEx)",
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
      line_item: "Net reinvestment (change in IC)",
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
      line_item: "Unlevered free cash flow (FCFF)",
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
      line_item: "Memo: EBITDA",
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
      line_item: "Memo: After-tax SBC (in NOPAT)",
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
      line_item: "Memo: Unlevered FCFF ex-SBC",
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

  dcfSchedule.addRowGutter()
  dcfSchedule.addSectionHeader("Present value and spot EV cash yield")
  dcfSchedule.addRow("discount_factor", {
    ...rowFormatOptions("number", 4),
    expr: '1 / ((1 + WaccSchedule["wacc", "val"]) ^ @table["discount_years", @col])',
    cells: { line_item: "Discount factor (year-end TV)" },
  })
  dcfSchedule.addRow("discount_factor_perp", {
    ...rowFormatOptions("number", 4),
    expr: '1 / ((1 + WaccSchedule["wacc", "val"]) ^ @table["discount_years_perp", @col])',
    cells: { line_item: "Discount factor (mid-yr perp.)" },
  })
  dcfSchedule.addRow("pv_fcff", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "PV of FCFF / perpetuity TV",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff", @col] * @table["discount_factor", @col]',
          },
        ])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (@table["unlevered_fcff", "Terminal"] / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * @table["discount_factor_perp", "Terminal"], NA())',
      },
    },
  })
  dcfSchedule.addRow("pv_fcff_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: PV of FCFF ex-SBC",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff_ex_sbc_memo", @col] * @table["discount_factor", @col]',
          },
        ])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (@table["unlevered_fcff_ex_sbc_memo", "Terminal"] / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * @table["discount_factor_perp", "Terminal"], NA())',
      },
    },
  })
  dcfSchedule.addRow("pv_fcff_at_base_params", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: PV at Base WACC & Base g",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff", @col] / ((1 + WaccSchedule["base_wacc_memo", "val"]) ^ @table["discount_years", @col])',
          },
        ])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["base_wacc_memo", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "Base"], (@table["unlevered_fcff", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "Base"]) / (WaccSchedule["base_wacc_memo", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "Base"])) / ((1 + WaccSchedule["base_wacc_memo", "val"]) ^ @table["discount_years_perp", "Terminal"]), NA())',
      },
    },
  })
  dcfSchedule.addRow("pv_fcff_sc_wacc_base_g", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: PV at active WACC & Base g",
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [p, { expr: '@table["pv_fcff", @col]' }])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "Base"], (@table["unlevered_fcff", "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "Base"]) / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "Base"])) * @table["discount_factor_perp", "Terminal"], NA())',
      },
    },
  })
  dcfSchedule.addRow("fcf_yield_on_current_ev", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: 'IF(DcfBridge["current_market_ev", "perp"] > 0, @table["unlevered_fcff", @col] / DcfBridge["current_market_ev", "perp"], NA())',
    cells: { line_item: "FCFF yield on spot EV (%)" },
  })
  dcfSchedule.addRow("ust_crossover_flag", {
    ...rowFormatOptions("integer"),
    expr: 'IF(@table["fcf_yield_on_current_ev", @col] >= MarketAnchors["rf_par_10y", "val"], 1, 0)',
    cells: { line_item: "Clears 10Y Treasury yield (1=Yes)" },
  })

  // DCF Valuation Summary & EV-to-Equity Bridge
  const dcfBridge = sheet.addTable(
    "DcfBridge",
    "DCF Valuation Summary & EV-to-Equity Bridge ($M / $/sh)",
    {
      subtitle: [
        "Primary Perpetuity DCF vs. Exit EV/EBITDA cross-check ($M / $/sh)",
        "Ex-op.-lease EV basis; cum- vs. ex-special-dividend prices",
      ],
      currency: "USD",
    }
  )
  dcfBridge.addColumn("line_item", {
    role: "descriptor",
    header: "Valuation bridge line",
  })
  dcfBridge.addColumn("perp", {
    role: "measure",
    headers: ["Primary", "Perp. DCF"],
    style: "bold",
  })
  dcfBridge.addColumn("exit_mult", {
    role: "measure",
    headers: ["Cross-Check", "Exit Mult."],
  })
  dcfBridge.addColumn("perp_ex_sbc", {
    role: "measure",
    headers: ["Memo: Perp.", "(ex-SBC)"],
  })
  dcfBridge.addColumn("notes", {
    role: "descriptor",
    header: "Notes",
  })

  dcfBridge.addSectionHeader("Enterprise value and terminal weight")
  dcfBridge.addRow("pv_explicit_fcff", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of 10Y explicit FCFF",
      perp: { expr: 'SUM(DcfSchedule["pv_fcff", "FY27E".."FY36E"])' },
      exit_mult: { expr: 'SUM(DcfSchedule["pv_fcff", "FY27E".."FY36E"])' },
      perp_ex_sbc: {
        expr: 'SUM(DcfSchedule["pv_fcff_ex_sbc_memo", "FY27E".."FY36E"])',
      },
      notes: "FY27E–FY36E cash flows",
    },
  })
  dcfBridge.addRow("pv_terminal_value", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of terminal value",
      perp: { expr: 'DcfSchedule["pv_fcff", "Terminal"]' },
      exit_mult: {
        expr: 'DcfSchedule["ebitda", "FY36E"] * ScalarAssumptionsActive["exit_ev_to_ebitda", "val"] * DcfSchedule["discount_factor", "Terminal"]',
      },
      perp_ex_sbc: { expr: 'DcfSchedule["pv_fcff_ex_sbc_memo", "Terminal"]' },
      notes: "Discounted from FY36E",
    },
  })
  dcfBridge.addRow("enterprise_value", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["pv_explicit_fcff", @col] + @table["pv_terminal_value", @col]',
    cells: {
      line_item: "Implied enterprise value ($M)",
      notes: "Ex-operating-lease basis",
    },
  })
  dcfBridge.addRow("tv_pct_of_ev", {
    ...rowFormatOptions("percentage", 1),
    expr: '@table["pv_terminal_value", @col] / @table["enterprise_value", @col]',
    cells: {
      line_item: "Terminal value % of EV",
      notes: "Share of total EV",
    },
  })

  dcfBridge.addRowGutter()
  dcfBridge.addSectionHeader("EV-to-equity bridge (cum- and ex-special div.)")
  dcfBridge.addRow("plus_cash_sti", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["cash_and_equivalents", "FY26"] + BalanceSheet["short_term_investments", "FY26"]',
    cells: {
      line_item: "(+) FY26 cash and STI",
      notes: "FY26 audited balance",
    },
  })
  dcfBridge.addRow("less_q1_reg_div", {
    ...rowFormatOptions("currency", 0),
    expr: '-MarketAnchors["oct2026_qtr_dps", "val"] * MarketAnchors["cost_diluted_shares", "val"]',
    cells: {
      line_item: "(−) Q1 FY27 regular div. paid",
      perp: {
        expr: '-MarketAnchors["oct2026_qtr_dps", "val"] * MarketAnchors["cost_diluted_shares", "val"]',
        note: "Q1 FY27 $1.47/sh regular quarterly dividend paid Nov 13, 2026; deducted from Aug 30 cash.",
      },
      notes: "Paid Nov 13, 2026",
    },
  })
  dcfBridge.addRow("less_debt_leases", {
    ...rowFormatOptions("currency", 0),
    expr: '-(MarketAnchors["lt_debt_fair_value", "val"] + DebtLeasesSchedule["revolver_end", "FY26"] + DebtLeasesSchedule["total_fin_lease_liab", "FY26"])',
    cells: {
      line_item: "(−) Debt (FV) & finance leases",
      perp: {
        expr: '-(MarketAnchors["lt_debt_fair_value", "val"] + DebtLeasesSchedule["revolver_end", "FY26"] + DebtLeasesSchedule["total_fin_lease_liab", "FY26"])',
        note: "Uses FY26 LT debt fair value ($5,689M vs. $6,162M carrying, -$473M mark-to-market) plus $1,413M finance leases; excludes $2,606M ASC 842 operating leases.",
      },
      notes: "FV debt + fin. leases",
    },
  })
  dcfBridge.addRow("net_cash_bridge", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["plus_cash_sti".."less_debt_leases", @col])',
    cells: {
      line_item: "Net cash / (debt) bridge",
      notes: "Post-Q1 div & FV debt",
    },
  })
  dcfBridge.addRow("equity_value_cum_div", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["enterprise_value", @col] + @table["net_cash_bridge", @col]',
    cells: {
      line_item: "Implied equity value (cum-div.)",
      notes: "Cum-FY27E special div.",
    },
  })
  dcfBridge.addRow("diluted_shares", {
    ...rowFormatOptions("number", 3),
    expr: 'MarketAnchors["cost_diluted_shares", "val"]',
    cells: {
      line_item: "Diluted shares (TSM, M)",
      perp: {
        expr: 'MarketAnchors["cost_diluted_shares", "val"]',
        note: "443.129M SEC shares + 0.474M TSM dilutive RSUs; excludes 704k vested-undelivered RSUs and ~56k special-dividend anti-dilution gross-up.",
      },
      notes: "SEC + 0.474M RSUs",
    },
  })
  dcfBridge.addRow("implied_price_cum_div", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    highlight: true,
    expr: '@table["equity_value_cum_div", @col] / @table["diluted_shares", @col]',
    cells: {
      line_item: "Implied share price (cum-div.)",
      notes: "Before Nov 24 ex-date",
    },
  })
  dcfBridge.addRow("less_special_div_ps", {
    ...rowFormatOptions("currency", 2),
    expr: '-ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]',
    cells: {
      line_item: "(−) Special dividend ($/sh)",
      notes: "Nov 24 ex / Dec 4 pay",
    },
  })
  dcfBridge.addRow("implied_price_ex_div", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    expr: '@table["implied_price_cum_div", @col] + @table["less_special_div_ps", @col]',
    cells: {
      line_item: "Implied share price (ex-div.)",
      notes: "Post-special-div. basis",
    },
  })
  dcfBridge.addRow("current_price_cum_div", {
    ...rowFormatOptions("currency", 2),
    expr: 'MarketAnchors["cost_close_price", "val"]',
    cells: {
      line_item: "Spot closing price (cum-div.)",
      notes: "2026-11-13 close",
    },
  })
  dcfBridge.addRow("current_market_ev", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["current_price_cum_div", @col] * @table["diluted_shares", @col] - @table["net_cash_bridge", @col]',
    cells: {
      line_item: "Spot EV (ex-op. leases, $M)",
      notes: "Matches DCF EV basis",
    },
  })
  dcfBridge.addRow("headline_ev_incl_op_leases_memo", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["current_market_ev", @col] + DebtLeasesSchedule["total_op_lease_liab", "FY26"]',
    cells: {
      line_item: "Memo: Headline EV (incl. leases)",
      notes: "Adds ASC 842 op. leases",
    },
  })
  dcfBridge.addRow("debt_fv_vs_carrying_memo", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["total_lt_debt_carrying", "FY26"] - MarketAnchors["lt_debt_fair_value", "val"]',
    cells: {
      line_item: "Memo: LT debt carrying vs. FV",
      notes: "Carrying less fair val.",
    },
  })
  dcfBridge.addRow("price_ex_trapped_cash_memo", {
    ...rowFormatOptions("currency", 2),
    expr: '(@table["equity_value_cum_div", @col] - MarketAnchors["cc_receivables_in_cash", "val"]) / @table["diluted_shares", @col]',
    cells: {
      line_item: "Memo: Price ex-$2.8B card rec.",
      notes: "Deducts working cash",
    },
  })
  dcfBridge.addRow("upside_downside_cum_div", {
    ...rowFormatOptions("percentage", 1),
    style: "bold",
    expr: '@table["implied_price_cum_div", @col] / @table["current_price_cum_div", @col] - 1',
    cells: {
      line_item: "Implied variance vs. spot (%)",
      notes: "Cum-dividend basis",
    },
  })
  dcfBridge.addRow("upside_downside_ex_div", {
    ...rowFormatOptions("percentage", 1),
    expr: 'IF(@table["current_price_cum_div", @col] + @table["less_special_div_ps", @col] > 0, @table["implied_price_ex_div", @col] / (@table["current_price_cum_div", @col] + @table["less_special_div_ps", @col]) - 1, NA())',
    cells: {
      line_item: "Implied variance vs. ex-div. (%)",
      notes: "Ex-dividend basis",
    },
  })

  dcfBridge.addRowGutter()
  dcfBridge.addSectionHeader("Terminal cross-checks and reinvestment")
  dcfBridge.addRow("undiscounted_tv", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["pv_terminal_value", @col] / DcfSchedule["discount_factor", "Terminal"]',
    cells: {
      line_item: "Undiscounted FY36E year-end TV",
      notes: "At FY36E fiscal end",
    },
  })
  dcfBridge.addRow("gordon_tv_midyear", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["pv_terminal_value", @col] / DcfSchedule["discount_factor_perp", "Terminal"]',
    cells: {
      line_item: "Mid-year Gordon Growth TV ($M)",
      notes: "FY36E midpoint basis",
    },
  })
  dcfBridge.addRow("implied_exit_ev_ebitda", {
    ...rowFormatOptions("multiple", 1),
    style: "bold",
    expr: 'IF(DcfSchedule["ebitda", "FY36E"] > 0, @table["undiscounted_tv", @col] / DcfSchedule["ebitda", "FY36E"], NA())',
    cells: {
      line_item: "Implied exit EV / FY36E EBITDA",
      notes: "Year-end cross-check",
    },
  })
  dcfBridge.addRow("implied_perp_growth", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    cells: {
      line_item: "Implied perpetual growth (g)",
      perp: {
        expr: '(@table["gordon_tv_midyear", @col] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff", "FY36E"]) / (@table["gordon_tv_midyear", @col] + DcfSchedule["unlevered_fcff", "FY36E"])',
      },
      exit_mult: {
        expr: '(@table["gordon_tv_midyear", @col] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff", "FY36E"]) / (@table["gordon_tv_midyear", @col] + DcfSchedule["unlevered_fcff", "FY36E"])',
      },
      perp_ex_sbc: {
        expr: '(@table["gordon_tv_midyear", @col] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff_ex_sbc_memo", "FY36E"]) / (@table["gordon_tv_midyear", @col] + DcfSchedule["unlevered_fcff_ex_sbc_memo", "FY36E"])',
      },
      notes: "Mid-year perp. basis",
    },
  })
  dcfBridge.addRow("gdp_cap_warning_flag", {
    ...rowFormatOptions("integer"),
    expr: 'IF(@table["implied_perp_growth", @col] > 0.04, 1, 0)',
    cells: {
      line_item: "Exceeds 4.0% GDP ceiling (1=Yes)",
      notes: "Flags g > LT nominal GDP",
    },
  })
  dcfBridge.addRow("fy36_ronic", {
    ...rowFormatOptions("percentage", 1),
    expr: 'InvestedCapitalROIC["ronic", "FY36E"]',
    cells: {
      line_item: "FY36E incremental ROIC (RONIC)",
      notes: "Terminal capital return",
    },
  })
  dcfBridge.addRow("steady_state_reinvest_req", {
    ...rowFormatOptions("percentage", 1),
    expr: 'IF(@table["fy36_ronic", @col] > 0, @table["implied_perp_growth", @col] / @table["fy36_ronic", @col], NA())',
    cells: {
      line_item: "Required reinvestment (g / RONIC)",
      notes: "Steady-state rate",
    },
  })
  dcfBridge.addRow("fy36_reinvestment_rate", {
    ...rowFormatOptions("percentage", 1),
    expr: 'InvestedCapitalROIC["reinvestment_rate", "FY36E"]',
    cells: {
      line_item: "Modeled FY36E reinvestment rate",
      notes: "dIC / NOPAT",
    },
  })
  dcfBridge.addRow("steady_state_term_fcff", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Steady-state terminal FCFF ($M)",
      perp: {
        expr: 'IF(@table["fy36_ronic", "perp"] > 0, DcfSchedule["nopat", "Terminal"] * (1 - @table["steady_state_reinvest_req", "perp"]), NA())',
      },
      exit_mult: notedNull(
        "Steady-state reinvestment cross-check applies to Perpetuity DCF."
      ),
      perp_ex_sbc: notedNull(
        "Steady-state reinvestment cross-check applies to primary post-SBC Perpetuity DCF."
      ),
      notes: "NOPAT x (1 - g/RONIC)",
    },
  })
  dcfBridge.addRow("steady_state_implied_price", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    cells: {
      line_item: "Steady-state reinvest price ($/sh)",
      perp: {
        expr: 'IF(AND(@table["fy36_ronic", "perp"] > 0, WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"]), (@table["pv_explicit_fcff", "perp"] + (@table["steady_state_term_fcff", "perp"] / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * DcfSchedule["discount_factor_perp", "Terminal"] + @table["net_cash_bridge", "perp"]) / @table["diluted_shares", "perp"], NA())',
      },
      exit_mult: null,
      perp_ex_sbc: null,
      notes: "Cum-div. cross-check",
    },
  })
  dcfBridge.addRow("fy27_fcff_yield_on_ev", {
    ...rowFormatOptions("percentage", 2),
    expr: 'DcfSchedule["fcf_yield_on_current_ev", "FY27E"]',
    cells: {
      line_item: "FY27E FCFF yield on spot EV",
      notes: "vs. 10Y Treasury yield",
    },
  })
  dcfBridge.addRow("fy36_fcff_yield_on_ev", {
    ...rowFormatOptions("percentage", 2),
    expr: 'DcfSchedule["fcf_yield_on_current_ev", "FY36E"]',
    cells: {
      line_item: "FY36E FCFF yield on spot EV",
      notes: "Year-10 cash yield",
    },
  })
  dcfBridge.addRow("ust_crossover_years_met", {
    ...rowFormatOptions("integer"),
    expr: 'SUM(DcfSchedule["ust_crossover_flag", "FY27E".."FY36E"])',
    cells: {
      line_item: "Years clearing 10Y UST (of 10)",
      notes: "Cash yield hurdle test",
    },
  })
  dcfBridge.addRow("perp_price_at_base_params", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Memo: Perp. price at Base WACC/g",
      perp: {
        expr: '(SUM(DcfSchedule["pv_fcff_at_base_params", "FY27E".."Terminal"]) + @table["net_cash_bridge", "perp"]) / @table["diluted_shares", "perp"]',
      },
      exit_mult: null,
      perp_ex_sbc: null,
      notes: "Attribution intermediate",
    },
  })
  dcfBridge.addRow("perp_price_at_sc_wacc_base_g", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Memo: Perp. price at WACC & Base g",
      perp: {
        expr: '(SUM(DcfSchedule["pv_fcff_sc_wacc_base_g", "FY27E".."Terminal"]) + @table["net_cash_bridge", "perp"]) / @table["diluted_shares", "perp"]',
      },
      exit_mult: null,
      perp_ex_sbc: null,
      notes: "Attribution intermediate",
    },
  })

  // Market-Implied Operating & Discount-Rate Expectations
  const reverseDcf = sheet.addTable(
    "ReverseDcfTable",
    "Market-Implied Operating & Discount-Rate Expectations",
    {
      subtitle: [
        "Decomposes spot EV across implied growth",
        "and implied discount-rate regimes ($M / % / x)",
      ],
      currency: "USD",
    }
  )
  reverseDcf.addColumn("line_item", {
    role: "descriptor",
    header: "Implied expectation metric",
  })
  reverseDcf.addColumn("val", {
    role: "measure",
    headers: ["Market", "Implied"],
    style: "bold",
  })
  reverseDcf.addColumn("active_model", {
    role: "measure",
    headers: ["Active", "Model"],
  })

  reverseDcf.addSectionHeader("Operating hurdle at active WACC")
  reverseDcf.addRow("current_ev", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Enterprise value (ex-op. leases)",
      val: { expr: 'DcfBridge["current_market_ev", "perp"]' },
      active_model: { expr: 'DcfBridge["enterprise_value", "perp"]' },
    },
  })
  reverseDcf.addRow("pv_explicit_fcff", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of explicit 10Y FCFF",
      val: { expr: 'DcfBridge["pv_explicit_fcff", "perp"]' },
      active_model: { expr: 'DcfBridge["pv_explicit_fcff", "perp"]' },
    },
  })
  reverseDcf.addRow("implied_pv_tv", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Residual PV of terminal value",
      val: {
        expr: '@table["current_ev", "val"] - @table["pv_explicit_fcff", "val"]',
      },
      active_model: { expr: 'DcfBridge["pv_terminal_value", "perp"]' },
    },
  })
  reverseDcf.addRow("implied_undiscounted_tv", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Undiscounted FY36E year-end TV",
      val: {
        expr: '@table["implied_pv_tv", "val"] / DcfSchedule["discount_factor", "Terminal"]',
      },
      active_model: { expr: 'DcfBridge["undiscounted_tv", "perp"]' },
    },
  })
  reverseDcf.addRow("implied_gordon_tv", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Mid-year Gordon Growth TV ($M)",
      val: {
        expr: '@table["implied_pv_tv", "val"] / DcfSchedule["discount_factor_perp", "Terminal"]',
      },
      active_model: { expr: 'DcfBridge["gordon_tv_midyear", "perp"]' },
    },
  })
  reverseDcf.addRow("implied_term_g", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    highlight: true,
    cells: {
      line_item: "Implied perpetual growth (g)",
      val: {
        expr: '(@table["implied_gordon_tv", "val"] * WaccSchedule["wacc", "val"] - DcfSchedule["unlevered_fcff", "FY36E"]) / (@table["implied_gordon_tv", "val"] + DcfSchedule["unlevered_fcff", "FY36E"])',
      },
      active_model: {
        expr: 'ScalarAssumptionsActive["terminal_growth_rate", "val"]',
      },
    },
  })
  reverseDcf.addRow("implied_exit_ebitda", {
    ...rowFormatOptions("multiple", 1),
    style: "bold",
    highlight: true,
    cells: {
      line_item: "Implied FY36E exit EV / EBITDA",
      val: {
        expr: 'IF(DcfSchedule["ebitda", "FY36E"] > 0, @table["implied_undiscounted_tv", "val"] / DcfSchedule["ebitda", "FY36E"], NA())',
      },
      active_model: { expr: 'DcfBridge["implied_exit_ev_ebitda", "perp"]' },
    },
  })
  reverseDcf.addRow("req_fy36_fcff_at_base_g", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Required FY36E FCFF at active g",
      val: {
        expr: '@table["implied_gordon_tv", "val"] * (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"]) / (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"])',
      },
      active_model: { expr: 'DcfSchedule["unlevered_fcff", "FY36E"]' },
    },
  })
  reverseDcf.addRow("implied_10y_fcff_cagr", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Implied 10Y FCFF CAGR (at active g)",
      val: {
        expr: 'IF(@table["req_fy36_fcff_at_base_g", "val"] > 0, (@table["req_fy36_fcff_at_base_g", "val"] / InvestedCapitalROIC["unlevered_fcff", "FY26"]) ^ 0.1 - 1, NA())',
      },
      active_model: {
        expr: 'IF(@table["req_fy36_fcff_at_base_g", "active_model"] > 0, (@table["req_fy36_fcff_at_base_g", "active_model"] / InvestedCapitalROIC["unlevered_fcff", "FY26"]) ^ 0.1 - 1, NA())',
      },
    },
  })

  reverseDcf.addRowGutter()
  reverseDcf.addSectionHeader("Discount-rate regime at active cash flows")
  reverseDcf.addRow("implied_wacc_at_base_g", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    highlight: true,
    cells: {
      line_item: "Implied WACC (at active FCFF & g)",
      val: {
        expr: 'IF(DcfBridge["current_market_ev", "perp"] > 0, IF(ABS(MarketImpliedRateCalc["ev_error", "iter_5"]) < 1, MarketImpliedRateCalc["trial_wacc", "iter_5"], NA()), NA())',
      },
      active_model: { expr: 'WaccSchedule["wacc", "val"]' },
    },
  })
  reverseDcf.addRow("implied_ke_at_base_g", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Implied cost of equity (Ke)",
      val: {
        expr: 'IF(ISERROR(@table["implied_wacc_at_base_g", "val"]), NA(), (@table["implied_wacc_at_base_g", "val"] - WaccSchedule["debt_weight", "val"] * WaccSchedule["after_tax_cost_of_debt", "val"]) / WaccSchedule["equity_weight", "val"])',
      },
      active_model: { expr: 'WaccSchedule["cost_of_equity", "val"]' },
    },
  })
  reverseDcf.addRow("implied_beta_at_base_g", {
    ...rowFormatOptions("number", 2),
    style: "bold",
    cells: {
      line_item: "Implied equity beta (at active ERP)",
      val: {
        expr: 'IF(ISERROR(@table["implied_ke_at_base_g", "val"]), NA(), (@table["implied_ke_at_base_g", "val"] - WaccSchedule["rf_nominal", "val"]) / WaccSchedule["erp", "val"])',
      },
      active_model: { expr: 'WaccSchedule["equity_beta", "val"]' },
    },
  })
  reverseDcf.addRow("implied_erp_at_5y_beta", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Implied ERP (at 5Y monthly beta)",
      val: {
        expr: 'IF(ISERROR(@table["implied_ke_at_base_g", "val"]), NA(), (@table["implied_ke_at_base_g", "val"] - WaccSchedule["rf_nominal", "val"]) / WaccSchedule["equity_beta", "val"])',
      },
      active_model: { expr: 'WaccSchedule["erp", "val"]' },
    },
  })
  reverseDcf.addRow("perp_price_at_2y_beta_wacc", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    cells: {
      line_item: "Perp. DCF at 2Y-beta WACC ($/sh)",
      val: {
        expr: 'IF(WaccSchedule["wacc_2y_memo", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (DcfRateDiscountFactors["w_2y_beta", "pv_explicit"] + (DcfSchedule["unlevered_fcff", "Terminal"] / (WaccSchedule["wacc_2y_memo", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * DcfRateDiscountFactors["w_2y_beta", "Terminal_Perp"] + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["diluted_shares", "perp"], NA())',
      },
      active_model: { expr: 'DcfBridge["implied_price_cum_div", "perp"]' },
    },
  })
  reverseDcf.addRow("perp_price_at_rf_400", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Perp. DCF at stress 10Y UST ($/sh)",
      val: {
        expr: 'IF(WaccSchedule["wacc_rf_stress", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (DcfRateDiscountFactors["w_rf_stress", "pv_explicit"] + (DcfSchedule["unlevered_fcff", "Terminal"] / (WaccSchedule["wacc_rf_stress", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * DcfRateDiscountFactors["w_rf_stress", "Terminal_Perp"] + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["diluted_shares", "perp"], NA())',
      },
      active_model: { expr: 'DcfBridge["implied_price_cum_div", "perp"]' },
    },
  })
  reverseDcf.addRow("exit_price_at_rf_400", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Exit DCF at stress 10Y UST ($/sh)",
      val: {
        expr: '(DcfRateDiscountFactors["w_rf_stress", "pv_explicit"] + DcfSchedule["ebitda", "FY36E"] * ScalarAssumptionsActive["exit_ev_to_ebitda", "val"] * DcfRateDiscountFactors["w_rf_stress", "Terminal"] + DcfBridge["net_cash_bridge", "exit_mult"]) / DcfBridge["diluted_shares", "exit_mult"]',
      },
      active_model: { expr: 'DcfBridge["implied_price_cum_div", "exit_mult"]' },
    },
  })
  reverseDcf.addRow("blended_price_at_rf_400", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    cells: {
      line_item: "Blended price at stress UST ($/sh)",
      val: {
        expr: 'FootballField["perp_dcf", "weight"] * @table["perp_price_at_rf_400", "val"] + FootballField["exit_mult_dcf", "weight"] * @table["exit_price_at_rf_400", "val"] + FootballField["calibrated_comps", "weight"] * CompsValuationCalibration["implied_price_cum_div", "val"]',
      },
      active_model: { expr: 'FootballField["blended_total", "cum_div_price"]' },
    },
  })

  // Supporting Schedule: Market-Implied Discount Rate Iterative Convergence
  const iterCols = [
    "iter_0",
    "iter_1",
    "iter_2",
    "iter_3",
    "iter_4",
    "iter_5",
  ] as const
  const impliedRateCalc = sheet.addTable(
    "MarketImpliedRateCalc",
    "Market-Implied Discount Rate Schedule ($M / %)",
    {
      subtitle: [
        "Iterative present-value convergence to spot ex-operating-lease enterprise value",
        "Holds active unlevered FCFF and terminal growth constant across passes",
      ],
      currency: "USD",
    }
  )
  impliedRateCalc.addColumn("line_item", {
    role: "descriptor",
    header: "Period / Metric",
  })
  impliedRateCalc.addColumn("disc_yr", {
    role: "measure",
    headers: ["Disc.", "Years"],
  })
  impliedRateCalc.addColumn("fcff", {
    role: "measure",
    headers: ["FCFF", "($M)"],
  })
  for (let i = 0; i < iterCols.length; i++) {
    impliedRateCalc.addColumn(iterCols[i]!, {
      role: "measure",
      group: "Discount Rate Passes",
      headers:
        i === 0
          ? ["Pass 0", "(WACC)"]
          : i === 5
            ? ["Pass 5", "(Final)"]
            : [`Pass ${i}`, ""],
      ...(i === 5 ? { style: "bold" as const } : {}),
    })
  }

  impliedRateCalc.addRow("trial_wacc", {
    ...rowFormatOptions("percentage", 3),
    style: "bold",
    cells: {
      line_item: "Trial discount rate",
      disc_yr: null,
      fcff: null,
      iter_0: {
        expr: 'MAX(ScalarAssumptionsActive["terminal_growth_rate", "val"] + 0.005, WaccSchedule["wacc", "val"])',
      },
      iter_1: {
        expr: 'IF(DcfBridge["current_market_ev", "perp"] > 0, MAX(ScalarAssumptionsActive["terminal_growth_rate", "val"] + 0.0005, ScalarAssumptionsActive["terminal_growth_rate", "val"] + (@table["trial_wacc", "iter_0"] - ScalarAssumptionsActive["terminal_growth_rate", "val"]) * (@table["implied_ev", "iter_0"] / DcfBridge["current_market_ev", "perp"])), NA())',
      },
      ...Object.fromEntries(
        iterCols.slice(2).map((col) => [
          col,
          {
            expr: 'IF(ISERROR(@table["inv_ev_delta", col.prev]), NA(), IF(ABS(@table["inv_ev_delta", col.prev] - @table["inv_ev_delta", col.prev(2)]) < 1e-14, @table["trial_wacc", col.prev], MAX(ScalarAssumptionsActive["terminal_growth_rate", "val"] + 0.0005, @table["trial_wacc", col.prev] - @table["inv_ev_delta", col.prev] * (@table["trial_wacc", col.prev] - @table["trial_wacc", col.prev(2)]) / (@table["inv_ev_delta", col.prev] - @table["inv_ev_delta", col.prev(2)]))))',
          },
        ])
      ),
    },
  })

  for (const p of FORECAST_PERIODS) {
    impliedRateCalc.addRow(`df_${p}`, {
      ...rowFormatOptions("number", 4),
      cells: {
        line_item: `${PERIOD_METADATA[p].header} discount factor`,
        disc_yr: {
          expr: `DcfSchedule["discount_years", "${p}"]`,
          format: "number",
          decimals: 3,
        },
        fcff: {
          expr: `DcfSchedule["unlevered_fcff", "${p}"]`,
          format: "currency",
          decimals: 0,
        },
        ...Object.fromEntries(
          iterCols.map((col) => [
            col,
            {
              expr: 'IF(ISERROR(@table["trial_wacc", @col]), NA(), 1 / ((1 + @table["trial_wacc", @col]) ^ @table[@row, "disc_yr"]))',
            },
          ])
        ),
      },
    })
  }
  impliedRateCalc.addRow("df_Terminal", {
    ...rowFormatOptions("number", 4),
    cells: {
      line_item: "Terminal discount factor",
      disc_yr: {
        expr: 'DcfSchedule["discount_years_perp", "Terminal"]',
        format: "number",
        decimals: 3,
      },
      fcff: {
        expr: 'DcfSchedule["unlevered_fcff", "Terminal"]',
        format: "currency",
        decimals: 0,
      },
      ...Object.fromEntries(
        iterCols.map((col) => [
          col,
          {
            expr: 'IF(ISERROR(@table["trial_wacc", @col]), NA(), 1 / ((1 + @table["trial_wacc", @col]) ^ @table[@row, "disc_yr"]))',
          },
        ])
      ),
    },
  })
  impliedRateCalc.addRow("pv_explicit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of explicit 10Y FCFF",
      disc_yr: null,
      fcff: { expr: 'SUM(@table["df_FY27E".."df_FY36E", "fcff"])' },
      ...Object.fromEntries(
        iterCols.map((col) => [
          col,
          {
            expr: 'SUMPRODUCT(@table["df_FY27E".."df_FY36E", "fcff"], @table["df_FY27E".."df_FY36E", @col])',
          },
        ])
      ),
    },
  })
  impliedRateCalc.addRow("pv_tv", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PV of terminal value",
      disc_yr: null,
      fcff: null,
      ...Object.fromEntries(
        iterCols.map((col) => [
          col,
          {
            expr: 'IF(ISERROR(@table["trial_wacc", @col]), NA(), IF(@table["trial_wacc", @col] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (@table["df_Terminal", "fcff"] / (@table["trial_wacc", @col] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * @table["df_Terminal", @col], NA()))',
          },
        ])
      ),
    },
  })
  impliedRateCalc.addRow("implied_ev", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Implied enterprise value",
      disc_yr: null,
      fcff: null,
      ...Object.fromEntries(
        iterCols.map((col) => [
          col,
          { expr: '@table["pv_explicit", @col] + @table["pv_tv", @col]' },
        ])
      ),
    },
  })
  impliedRateCalc.addRow("ev_error", {
    ...rowFormatOptions("currency", 0),
    style: "bold",
    cells: {
      line_item: "EV variance vs. spot ($M)",
      disc_yr: null,
      fcff: null,
      ...Object.fromEntries(
        iterCols.map((col) => [
          col,
          {
            expr: '@table["implied_ev", @col] - DcfBridge["current_market_ev", "perp"]',
          },
        ])
      ),
    },
  })
  impliedRateCalc.addRow("inv_ev_delta", {
    ...rowFormatOptions("number", 8),
    cells: {
      line_item: "Reciprocal EV spread",
      disc_yr: null,
      fcff: null,
      ...Object.fromEntries(
        iterCols.map((col) => [
          col,
          {
            expr: 'IF(DcfBridge["current_market_ev", "perp"] > 0, 1 / @table["implied_ev", @col] - 1 / DcfBridge["current_market_ev", "perp"], NA())',
          },
        ])
      ),
    },
  })

  // Joint Indifference Frontier & Key Economic Knobs Summary
  const downSnap = snapshots?.Downside ?? null
  const baseSnap = snapshots?.Base ?? null
  const upSnap = snapshots?.Upside ?? null

  const valuationSensSummary = sheet.addTable(
    "ValuationSensitivitySummary",
    "Joint Indifference Frontier & Key Economic Knobs ($/sh / % / x)",
    {
      subtitle: [
        "Downside, Base, and Upside hold static scenario snapshots; Active recalculates live",
        "Tests market-implied discount rates, peer beta, cash-adjusted WACC, trapped cash, and CapEx",
      ],
      currency: "USD",
    }
  )
  valuationSensSummary.addColumn("line_item", {
    role: "descriptor",
    header: "Frontier metric / valuation knob",
  })
  valuationSensSummary.addColumn("Downside", {
    role: "measure",
    headers: ["Downside", "Case"],
  })
  valuationSensSummary.addColumn("Base", {
    role: "measure",
    headers: ["Base", "Case"],
  })
  valuationSensSummary.addColumn("Upside", {
    role: "measure",
    headers: ["Upside", "Case"],
  })
  valuationSensSummary.addColumn("active_live", {
    role: "measure",
    headers: ["Active", "Case"],
    style: "bold",
  })
  valuationSensSummary.addColumn("notes", {
    role: "descriptor",
    header: "Basis / Mechanism",
  })

  const addSensRow = (
    id: string,
    label: string,
    format: "currency" | "percentage" | "number",
    decimals: number,
    getter: (s: ScenarioSnapshot) => number,
    activeExpr: string,
    notes: string,
    style?: "bold"
  ): void => {
    valuationSensSummary.addRow(id, {
      ...rowFormatOptions(format, decimals),
      ...(style ? { style } : {}),
      cells: {
        line_item: label,
        Downside: downSnap ? getter(downSnap) : 0,
        Base: baseSnap ? getter(baseSnap) : 0,
        Upside: upSnap ? getter(upSnap) : 0,
        active_live: { expr: activeExpr },
        notes,
      },
    })
  }

  valuationSensSummary.addSectionHeader(
    "Joint indifference frontier (at spot EV)"
  )
  addSensRow(
    "implied_wacc",
    "Market-implied WACC (%)",
    "percentage",
    2,
    (s) => s.impliedWacc,
    'ReverseDcfTable["implied_wacc_at_base_g", "val"]',
    "Clears spot EV at case FCFF & g",
    "bold"
  )
  addSensRow(
    "implied_beta",
    "Market-implied equity beta",
    "number",
    2,
    (s) => s.impliedBeta,
    'ReverseDcfTable["implied_beta_at_base_g", "val"]',
    "At case ERP & 10Y UST"
  )
  addSensRow(
    "implied_erp",
    "Market-implied ERP (at 5Y beta)",
    "percentage",
    2,
    (s) => s.impliedErp,
    'ReverseDcfTable["implied_erp_at_5y_beta", "val"]',
    "At 0.85 5Y monthly beta"
  )
  addSensRow(
    "perp_2y_beta",
    "Perp. DCF at 2Y-beta WACC ($/sh)",
    "currency",
    2,
    (s) => s.perp2yBetaPrice,
    'ReverseDcfTable["perp_price_at_2y_beta_wacc", "val"]',
    "At 0.22 2Y weekly beta"
  )
  addSensRow(
    "perp_rf_stress",
    "Perp. DCF at stress UST ($/sh)",
    "currency",
    2,
    (s) => s.perpRfStressPrice,
    'ReverseDcfTable["perp_price_at_rf_400", "val"]',
    "Lower sovereign yield regime"
  )
  addSensRow(
    "exit_rf_stress",
    "Exit DCF at stress UST ($/sh)",
    "currency",
    2,
    (s) => s.exitRfStressPrice,
    'ReverseDcfTable["exit_price_at_rf_400", "val"]',
    "Exit cross-check at stress UST"
  )

  valuationSensSummary.addRowGutter()
  valuationSensSummary.addSectionHeader(
    "Key economic knobs — Perpetuity DCF ($/sh cum-div.)"
  )
  addSensRow(
    "perp_base_ref",
    "Primary Perp. DCF (5Y beta)",
    "currency",
    2,
    (s) => s.perpCumPrice,
    'DcfBridge["implied_price_cum_div", "perp"]',
    "Reference active Perp. DCF",
    "bold"
  )
  addSensRow(
    "perp_peer_5y_beta",
    "Peer 5Y mean beta (0.56) WACC",
    "currency",
    2,
    (s) => s.perpPeer5yBetaPrice,
    'IF(WaccSchedule["wacc_peer_beta_5y", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (DcfRateDiscountFactors["w_peer_5y_beta", "pv_explicit"] + (DcfSchedule["unlevered_fcff", "Terminal"] / (WaccSchedule["wacc_peer_beta_5y", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * DcfRateDiscountFactors["w_peer_5y_beta", "Terminal_Perp"] + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["diluted_shares", "perp"], NA())',
    "5-peer average 5Y monthly beta"
  )
  addSensRow(
    "perp_cash_adj_wacc",
    "Cash-adjusted unlevered WACC",
    "currency",
    2,
    (s) => s.perpCashAdjWaccPrice,
    'IF(ISERROR(WaccSchedule["wacc_cash_adj_unlev", "val"]), NA(), IF(WaccSchedule["wacc_cash_adj_unlev", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (DcfRateDiscountFactors["w_cash_adj_unlev", "pv_explicit"] + (DcfSchedule["unlevered_fcff", "Terminal"] / (WaccSchedule["wacc_cash_adj_unlev", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"])) * DcfRateDiscountFactors["w_cash_adj_unlev", "Terminal_Perp"] + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["diluted_shares", "perp"], NA()))',
    "Unlevered beta = 5Y x MktCap/EV"
  )
  addSensRow(
    "perp_ex_trapped_cash",
    "Excl. $2.8B unsettled card rec.",
    "currency",
    2,
    (s) => s.perpExTrappedCashPrice,
    'DcfBridge["price_ex_trapped_cash_memo", "perp"]',
    "Deducts trapped working cash"
  )
  addSensRow(
    "perp_capex_minus_50bps",
    "Lower CapEx intensity (-50 bps)",
    "currency",
    2,
    (s) => s.perpCapexMinus50bpsPrice,
    'DcfBridge["implied_price_cum_div", "perp"] + DcfOperatingSensFactors["capex_50bps_fcff_drag", "pv_total"] / DcfBridge["diluted_shares", "perp"]',
    "-50 bps CapEx/sales net of tax"
  )
  addSensRow(
    "perp_capex_plus_50bps",
    "Higher CapEx intensity (+50 bps)",
    "currency",
    2,
    (s) => s.perpCapexPlus50bpsPrice,
    'DcfBridge["implied_price_cum_div", "perp"] - DcfOperatingSensFactors["capex_50bps_fcff_drag", "pv_total"] / DcfBridge["diluted_shares", "perp"]',
    "+50 bps CapEx/sales net of tax"
  )

  // Rate & Terminal Sensitivity Grids (WACC vs. Terminal g / Exit Multiple)
  const gSteps = [-2, -1, 0, 1, 2] as const
  const gColIds = ["g_m2", "g_m1", "g_0", "g_p1", "g_p2"] as const
  const wSteps = [-2, -1, 0, 1, 2] as const
  const wRowIds = ["w_m2", "w_m1", "w_0", "w_p1", "w_p2"] as const

  const sensitivityPerp = sheet.addTable(
    "SensitivityPerpWaccG",
    "Sensitivity: Perpetuity DCF Cum-Div. Price — WACC vs. Terminal g",
    {
      subtitle: [
        "WACC (+/-100 bps in 50 bps steps) vs. terminal g (+/-50 bps in 25 bps steps)",
        "Cum-dividend share price ($/sh); center cell ties to primary Perpetuity DCF",
      ],
      currency: "USD",
    }
  )
  sensitivityPerp.addColumn("line_item", {
    role: "descriptor",
    header: "WACC \\ Terminal g",
  })
  sensitivityPerp.addColumn("wacc_axis", {
    role: "measure",
    header: "WACC",
    style: "bold",
  })
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
    style: "bold",
    cells: {
      line_item: "Terminal g input axis",
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
  for (let i = 0; i < wSteps.length; i++) {
    const step = wSteps[i]!
    const rowId = wRowIds[i]!
    const label =
      step === 0 ? "Active WACC" : `WACC ${step > 0 ? "+" : ""}${step} step`
    sensitivityPerp.addRow(rowId, {
      ...(step === 0 ? { style: "bold" as const } : {}),
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
              expr: `IF(@table[@row, "wacc_axis"] > @table["g_header", "${gCol}"], (DcfRateDiscountFactors[@row, "pv_explicit"] + (DcfSchedule["unlevered_fcff", "FY36E"] * (1 + @table["g_header", "${gCol}"]) / (@table[@row, "wacc_axis"] - @table["g_header", "${gCol}"])) * DcfRateDiscountFactors[@row, "Terminal_Perp"] + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["diluted_shares", "perp"], NA())`,
              format: "currency",
              decimals: 2,
              ...(step === 0 && gCol === "g_0" ? { highlight: true } : {}),
            },
          ])
        ),
      },
    })
  }

  const sensitivityExit = sheet.addTable(
    "SensitivityExitWaccMult",
    "Sensitivity: Exit-Multiple DCF Cum-Div. Price — WACC vs. Exit EV/EBITDA",
    {
      subtitle: [
        "WACC (+/-100 bps in 50 bps steps) vs. exit multiple (+/-4.0x in 2.0x steps)",
        "Cum-dividend share price ($/sh); center cell ties to Exit-Multiple DCF",
      ],
      currency: "USD",
    }
  )
  sensitivityExit.addColumn("line_item", {
    role: "descriptor",
    header: "WACC \\ Exit mult.",
  })
  sensitivityExit.addColumn("wacc_axis", {
    role: "measure",
    header: "WACC",
    style: "bold",
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
    style: "bold",
    cells: {
      line_item: "Exit EV/EBITDA axis",
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
      ...(step === 0 ? { style: "bold" as const } : {}),
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
              expr: `(DcfRateDiscountFactors[@row, "pv_explicit"] + DcfSchedule["ebitda", "FY36E"] * @table["mult_header", "${mCol}"] * DcfRateDiscountFactors[@row, "Terminal"] + DcfBridge["net_cash_bridge", "exit_mult"]) / DcfBridge["diluted_shares", "exit_mult"]`,
              format: "currency",
              decimals: 2,
              ...(step === 0 && mCol === "m_0" ? { highlight: true } : {}),
            },
          ])
        ),
      },
    })
  }

  // Operating Sensitivity Grids (EBIT Margin vs. Revenue Growth)
  const sensitivityOps = sheet.addTable(
    "SensitivityOpsPerp",
    "Sensitivity: Perpetuity DCF Cum-Div. Price — EBIT Margin vs. Rev. Growth",
    {
      subtitle: [
        "Parallel 10Y EBIT margin (+/-50 bps, 25 bps steps) vs. rev. growth (+/-100 bps, 50 bps steps)",
        "Scales NOPAT, CapEx & non-PP&E IC proportionally; center ties to Perpetuity DCF ($/sh)",
      ],
      currency: "USD",
    }
  )
  sensitivityOps.addColumn("line_item", {
    role: "descriptor",
    header: "EBIT margin \\ Growth",
  })
  sensitivityOps.addColumn("margin_delta_axis", {
    role: "measure",
    headers: ["EBIT", "Margin d"],
    style: "bold",
  })
  const cColIds = ["c_m2", "c_m1", "c_0", "c_p1", "c_p2"] as const
  for (let i = 0; i < gSteps.length; i++) {
    const step = gSteps[i]!
    const label = step === 0 ? "Base Gr." : `${step > 0 ? "+" : ""}${step} step`
    sensitivityOps.addColumn(cColIds[i]!, {
      role: "measure",
      group: "Annual Revenue Growth Shift",
      header: label,
    })
  }
  sensitivityOps.addRow("comp_header", {
    style: "bold",
    cells: {
      line_item: "Annual revenue growth shift",
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
  const mRowIds = ["md_m2", "md_m1", "md_0", "md_p1", "md_p2"] as const
  for (let i = 0; i < wSteps.length; i++) {
    const step = wSteps[i]!
    const rowId = mRowIds[i]!
    const label =
      step === 0
        ? "Base EBIT margin"
        : `EBIT margin ${step > 0 ? "+" : ""}${step} step`
    sensitivityOps.addRow(rowId, {
      ...(step === 0 ? { style: "bold" as const } : {}),
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
              expr: `IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], (DcfOperatingSensFactors["fcff_base_${cCol}", "pv_total"] + (@table[@row, "margin_delta_axis"] * 100) * DcfOperatingSensFactors["nopat_slope_${cCol}", "pv_total"] + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["diluted_shares", "perp"], NA())`,
              format: "currency",
              decimals: 2,
              ...(step === 0 && cCol === "c_0" ? { highlight: true } : {}),
            },
          ])
        ),
      },
    })
  }

  const sensitivityOpsVsSpot = sheet.addTable(
    "SensitivityOpsVsSpot",
    "Sensitivity: Perpetuity DCF vs. Spot (%) — EBIT Margin vs. Rev. Growth",
    {
      subtitle: [
        "Implied cum-div. variance vs. spot close across operating shifts (%)",
        "Companion grid to operating price sensitivity; center ties to Perp. DCF",
      ],
      currency: "USD",
    }
  )
  sensitivityOpsVsSpot.addColumn("line_item", {
    role: "descriptor",
    header: "EBIT margin \\ Gr.",
  })
  sensitivityOpsVsSpot.addColumn("margin_delta_axis", {
    role: "measure",
    headers: ["EBIT", "Margin d"],
    style: "bold",
  })
  for (let i = 0; i < gSteps.length; i++) {
    const step = gSteps[i]!
    const label = step === 0 ? "Base Gr." : `${step > 0 ? "+" : ""}${step} step`
    sensitivityOpsVsSpot.addColumn(cColIds[i]!, {
      role: "measure",
      group: "Annual Revenue Growth Shift",
      header: label,
    })
  }
  sensitivityOpsVsSpot.addRow("comp_header", {
    style: "bold",
    cells: {
      line_item: "Rev. growth shift",
      margin_delta_axis: {
        expr: 'SensitivityOpsPerp["comp_header", "margin_delta_axis"]',
        format: "percentage",
        decimals: 2,
      },
      ...Object.fromEntries(
        cColIds.map((cCol) => [
          cCol,
          {
            expr: `SensitivityOpsPerp["comp_header", "${cCol}"]`,
            format: "percentage",
            decimals: 2,
          },
        ])
      ),
    },
  })
  for (let i = 0; i < wSteps.length; i++) {
    const step = wSteps[i]!
    const rowId = mRowIds[i]!
    const label =
      step === 0
        ? "Base EBIT margin"
        : `EBIT margin ${step > 0 ? "+" : ""}${step} step`
    sensitivityOpsVsSpot.addRow(rowId, {
      ...(step === 0 ? { style: "bold" as const } : {}),
      cells: {
        line_item: label,
        margin_delta_axis: {
          expr: `SensitivityOpsPerp["${rowId}", "margin_delta_axis"]`,
          format: "percentage",
          decimals: 2,
        },
        ...Object.fromEntries(
          cColIds.map((cCol) => [
            cCol,
            {
              expr: `SensitivityOpsPerp["${rowId}", "${cCol}"] / MarketAnchors["cost_close_price", "val"] - 1`,
              format: "percentage",
              decimals: 1,
              ...(step === 0 && cCol === "c_0" ? { highlight: true } : {}),
            },
          ])
        ),
      },
    })
  }

  // Discount-Factor Supporting Matrix (for WACC sensitivities & rate regimes)
  const rateDiscountFactors = sheet.addTable(
    "DcfRateDiscountFactors",
    "Discount-Factor Schedule Across Sensitivity & Rate Regimes",
    {
      subtitle: [
        "Per-period discount factors and explicit 10Y PV of FCFF ($M) across WACC grid and rate regimes",
        "Supports sensitivity grids, 2Y-beta discount rate, and rate-stress WACC checks",
      ],
      currency: "USD",
    }
  )
  rateDiscountFactors.addColumn("line_item", {
    role: "descriptor",
    header: "Discount rate case",
  })
  rateDiscountFactors.addColumn("rate", {
    role: "measure",
    header: "WACC",
    format: "percentage",
    decimals: 2,
  })
  for (const p of FORECAST_PERIODS) {
    rateDiscountFactors.addColumn(p, {
      role: "measure",
      group: "Discount Factors",
      header: PERIOD_METADATA[p].header,
      format: "number",
      decimals: 4,
    })
  }
  rateDiscountFactors.addColumn("Terminal", {
    role: "measure",
    group: "Terminal",
    headers: ["Term.", "(Exit)"],
    format: "number",
    decimals: 4,
  })
  rateDiscountFactors.addColumn("Terminal_Perp", {
    role: "measure",
    group: "Terminal",
    headers: ["Term.", "(Perp.)"],
    format: "number",
    decimals: 4,
  })
  rateDiscountFactors.addColumn("pv_explicit", {
    role: "measure",
    headers: ["PV 10Y", "FCFF ($M)"],
    format: "currency",
    decimals: 0,
    style: "bold",
  })

  const rateCases: readonly {
    readonly id: string
    readonly label: string
    readonly rateExpr: string
    readonly guardError?: boolean
  }[] = [
    {
      id: "w_m2",
      label: "WACC -2 step",
      rateExpr: 'SensitivityPerpWaccG["w_m2", "wacc_axis"]',
    },
    {
      id: "w_m1",
      label: "WACC -1 step",
      rateExpr: 'SensitivityPerpWaccG["w_m1", "wacc_axis"]',
    },
    {
      id: "w_0",
      label: "Active WACC",
      rateExpr: 'SensitivityPerpWaccG["w_0", "wacc_axis"]',
    },
    {
      id: "w_p1",
      label: "WACC +1 step",
      rateExpr: 'SensitivityPerpWaccG["w_p1", "wacc_axis"]',
    },
    {
      id: "w_p2",
      label: "WACC +2 step",
      rateExpr: 'SensitivityPerpWaccG["w_p2", "wacc_axis"]',
    },
    {
      id: "w_2y_beta",
      label: "2Y-beta WACC",
      rateExpr: 'WaccSchedule["wacc_2y_memo", "val"]',
    },
    {
      id: "w_rf_stress",
      label: "Rate-stress WACC",
      rateExpr: 'WaccSchedule["wacc_rf_stress", "val"]',
    },
    {
      id: "w_peer_5y_beta",
      label: "Peer 5Y beta WACC",
      rateExpr: 'WaccSchedule["wacc_peer_beta_5y", "val"]',
    },
    {
      id: "w_cash_adj_unlev",
      label: "Cash-adj. unlev. WACC",
      rateExpr: 'WaccSchedule["wacc_cash_adj_unlev", "val"]',
      guardError: true,
    },
  ]

  for (const rc of rateCases) {
    const dfFormula = (periodRef: string, rowRef: string): string =>
      rc.guardError
        ? `IF(ISERROR(@table[@row, "rate"]), NA(), 1 / ((1 + @table[@row, "rate"]) ^ DcfSchedule["${rowRef}", ${periodRef}]))`
        : `1 / ((1 + @table[@row, "rate"]) ^ DcfSchedule["${rowRef}", ${periodRef}])`

    rateDiscountFactors.addRow(rc.id, {
      ...(rc.id === "w_0" ? { style: "bold" as const } : {}),
      cells: {
        line_item: rc.label,
        rate: { expr: rc.rateExpr },
        ...Object.fromEntries(
          FORECAST_PERIODS.map((p) => [
            p,
            { expr: dfFormula("@col", "discount_years") },
          ])
        ),
        Terminal: { expr: dfFormula('"Terminal"', "discount_years") },
        Terminal_Perp: {
          expr: dfFormula('"Terminal"', "discount_years_perp"),
        },
        pv_explicit: {
          expr: rc.guardError
            ? 'IF(ISERROR(@table[@row, "rate"]), NA(), SUMPRODUCT(DcfSchedule["unlevered_fcff", "FY27E".."FY36E"], @table[@row, "FY27E".."FY36E"]))'
            : 'SUMPRODUCT(DcfSchedule["unlevered_fcff", "FY27E".."FY36E"], @table[@row, "FY27E".."FY36E"])',
        },
      },
    })
  }

  // Operating Sensitivity Factor Schedule (for EBIT Margin vs Rev Growth grid)
  const opsSensFactors = sheet.addTable(
    "DcfOperatingSensFactors",
    "Operating Sensitivity Cash-Flow Factor Schedule ($M)",
    {
      subtitle: [
        "Base-margin scaled FCFF and after-tax revenue slope across annual revenue growth shifts ($M)",
        "Exact linear decomposition of EBIT margin shifts across each revenue growth trajectory",
      ],
      currency: "USD",
    }
  )
  opsSensFactors.addColumn("line_item", {
    role: "descriptor",
    header: "Growth shift factor",
  })
  for (const p of FORECAST_PERIODS) {
    opsSensFactors.addColumn(p, {
      role: "measure",
      group: "Forecast",
      header: PERIOD_METADATA[p].header,
    })
  }
  opsSensFactors.addColumn("Terminal", {
    role: "measure",
    group: "Terminal",
    header: "Terminal",
  })
  opsSensFactors.addColumn("pv_total", {
    role: "measure",
    headers: ["Total PV", "($M)"],
    style: "bold",
  })

  opsSensFactors.addSectionHeader("Forecast year index")
  opsSensFactors.addRow("yr_idx", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Explicit forecast year (1–10)",
      ...Object.fromEntries(FORECAST_PERIODS.map((p, idx) => [p, idx + 1])),
      Terminal: 10,
      pv_total: null,
    },
  })

  opsSensFactors.addRowGutter()
  opsSensFactors.addSectionHeader("Scaled FCFF at active EBIT margin ($M)")
  for (let i = 0; i < cColIds.length; i++) {
    const cCol = cColIds[i]!
    const step = gSteps[i]!
    const label =
      step === 0
        ? "Base growth FCFF"
        : `Growth ${step > 0 ? "+" : ""}${step} step FCFF`
    opsSensFactors.addRow(`fcff_base_${cCol}`, {
      ...rowFormatOptions("currency", 0),
      cells: {
        line_item: label,
        ...Object.fromEntries(
          FORECAST_PERIODS.map((p) => [
            p,
            {
              expr: `DcfSchedule["nopat", @col] * (1 + SensitivityOpsPerp["comp_header", "${cCol}"]) ^ @table["yr_idx", @col] - (DcfSchedule["capex", @col] * (1 + SensitivityOpsPerp["comp_header", "${cCol}"]) ^ @table["yr_idx", @col] - DcfSchedule["da", @col]) - (InvestedCapitalROIC["non_ppe_ic", @col] * (1 + SensitivityOpsPerp["comp_header", "${cCol}"]) ^ @table["yr_idx", @col] - InvestedCapitalROIC["non_ppe_ic", col.prev] * (1 + SensitivityOpsPerp["comp_header", "${cCol}"]) ^ (@table["yr_idx", @col] - 1))`,
            },
          ])
        ),
        Terminal: {
          expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], @table[@row, "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"]) / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"]), NA())',
        },
        pv_total: {
          expr: 'SUMPRODUCT(@table[@row, "FY27E".."Terminal"], DcfSchedule["discount_factor_perp", "FY27E".."Terminal"])',
        },
      },
    })
  }

  opsSensFactors.addRowGutter()
  opsSensFactors.addSectionHeader("After-tax revenue per +100 bps margin ($M)")
  for (let i = 0; i < cColIds.length; i++) {
    const cCol = cColIds[i]!
    const step = gSteps[i]!
    const label =
      step === 0
        ? "Base growth margin base"
        : `Growth ${step > 0 ? "+" : ""}${step} step base`
    opsSensFactors.addRow(`nopat_slope_${cCol}`, {
      ...rowFormatOptions("currency", 0),
      cells: {
        line_item: label,
        ...Object.fromEntries(
          FORECAST_PERIODS.map((p) => [
            p,
            {
              expr: `0.01 * IncomeStatement["total_revenue", @col] * (1 + SensitivityOpsPerp["comp_header", "${cCol}"]) ^ @table["yr_idx", @col] * (1 - PeriodAssumptionsActive["effective_tax_rate", @col])`,
            },
          ])
        ),
        Terminal: {
          expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], @table[@row, "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"]) / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"]), NA())',
        },
        pv_total: {
          expr: 'SUMPRODUCT(@table[@row, "FY27E".."Terminal"], DcfSchedule["discount_factor_perp", "FY27E".."Terminal"])',
        },
      },
    })
  }

  opsSensFactors.addRowGutter()
  opsSensFactors.addSectionHeader(
    "CapEx intensity sensitivity (+50 bps net sales, $M)"
  )
  opsSensFactors.addRow("capex_50bps_cum_ppe", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Incremental net PP&E (+50 bps)",
      FY27E: { expr: '0.005 * OperatingSchedule["net_sales", "FY27E"]' },
      ...Object.fromEntries(
        FORECAST_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table[@row, col.prev] * (1 - ScalarAssumptionsActive["da_pct_beg_ppe", "val"]) + 0.005 * OperatingSchedule["net_sales", @col]',
          },
        ])
      ),
      Terminal: null,
      pv_total: null,
    },
  })
  opsSensFactors.addRow("capex_50bps_fcff_drag", {
    ...rowFormatOptions("currency", 0),
    style: "bold",
    cells: {
      line_item: "FCFF drag per +50 bps CapEx",
      FY27E: { expr: '0.005 * OperatingSchedule["net_sales", "FY27E"]' },
      ...Object.fromEntries(
        FORECAST_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '0.005 * OperatingSchedule["net_sales", @col] - @table["capex_50bps_cum_ppe", col.prev] * ScalarAssumptionsActive["da_pct_beg_ppe", "val"] * PeriodAssumptionsActive["effective_tax_rate", @col]',
          },
        ])
      ),
      Terminal: {
        expr: 'IF(WaccSchedule["wacc", "val"] > ScalarAssumptionsActive["terminal_growth_rate", "val"], @table[@row, "FY36E"] * (1 + ScalarAssumptionsActive["terminal_growth_rate", "val"]) / (WaccSchedule["wacc", "val"] - ScalarAssumptionsActive["terminal_growth_rate", "val"]), NA())',
      },
      pv_total: {
        expr: 'SUMPRODUCT(@table[@row, "FY27E".."Terminal"], DcfSchedule["discount_factor_perp", "FY27E".."Terminal"])',
      },
    },
  })

  return {
    dcfSchedule,
    dcfBridge,
    reverseDcf,
    impliedRateCalc,
    valuationSensSummary,
    sensitivityPerp,
    sensitivityExit,
    sensitivityOps,
    sensitivityOpsVsSpot,
    rateDiscountFactors,
    opsSensFactors,
  }
}
