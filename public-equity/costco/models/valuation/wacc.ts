import type { Sheet, Table } from "f8-engine"
import { rowFormatOptions } from "../timeline.ts"

export function buildWaccSchedule(sheet: Sheet): Table {
  const table = sheet.addTable(
    "WaccSchedule",
    "Weighted Average Cost of Capital (WACC)",
    {
      subtitle: [
        "CAPM equity cost & AA debt spread (2026-11-13)",
        "U.S. Treasury H.15 par curve & ICE BofA AA OAS (2026-11-13)",
      ],
      currency: "USD",
    }
  )
  table.addColumn("line_item", {
    role: "descriptor",
    header: "WACC component",
  })
  table.addColumn("val", {
    role: "measure",
    headers: ["Active", "Value"],
    style: "bold",
  })
  table.addColumn("notes", {
    role: "descriptor",
    header: "Basis / Source",
  })

  table.addSectionHeader("Cost of equity (CAPM)")
  table.addRow("rf_nominal", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Risk-free rate (10Y UST par)",
      val: { expr: 'MarketAnchors["rf_par_10y", "val"]' },
      notes: "2026-11-13 Treasury H.15",
    },
  })
  table.addRow("real_tips_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: 10Y real TIPS yield",
      val: { expr: 'MarketAnchors["rf_real_10y", "val"]' },
      notes: "Real rate benchmark",
    },
  })
  table.addRow("t10yie_breakeven", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: 10Y breakeven inflation",
      val: { expr: 'MarketAnchors["t10yie_breakeven", "val"]' },
      notes: "FRED T10YIE",
    },
  })
  table.addRow("dff_fed_funds", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: Effective fed funds rate",
      val: { expr: 'MarketAnchors["dff_fed_funds", "val"]' },
      notes: "FRED H.15 (2026-11-12)",
    },
  })
  table.addRow("equity_beta", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "5Y monthly equity beta",
      val: { expr: 'MarketAnchors["cost_beta_5y", "val"]' },
      notes: "Through-cycle vs. S&P 500",
    },
  })
  table.addRow("erp", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "U.S. equity risk premium",
      val: { expr: 'ScalarAssumptionsActive["equity_risk_premium", "val"]' },
      notes: "Active case ERP",
    },
  })
  table.addRow("cost_of_equity", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    cells: {
      line_item: "Cost of equity (Ke)",
      val: {
        expr: '@table["rf_nominal", "val"] + @table["equity_beta", "val"] * @table["erp", "val"]',
      },
      notes: "Rf + 5Y Beta x ERP",
    },
  })

  table.addRowGutter()
  table.addSectionHeader("After-tax cost of debt")
  table.addRow("aa_credit_oas", {
    ...rowFormatOptions("basis_points"),
    cells: {
      line_item: "AA corporate credit spread",
      val: { expr: 'MarketAnchors["oas_aa", "val"]' },
      notes: "ICE BofA AA OAS",
    },
  })
  table.addRow("pretax_cost_of_debt", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Pre-tax cost of debt (Kd)",
      val: {
        expr: '@table["rf_nominal", "val"] + @table["aa_credit_oas", "val"]',
      },
      notes: "Rf + AA OAS",
    },
  })
  table.addRow("marginal_tax_rate", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Normalized marginal tax rate",
      val: {
        expr: 'PeriodAssumptionsActive["effective_tax_rate", "FY27E"]',
      },
      notes: "FY27E normalized ETR",
    },
  })
  table.addRow("after_tax_cost_of_debt", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    cells: {
      line_item: "After-tax cost of debt",
      val: {
        expr: '@table["pretax_cost_of_debt", "val"] * (1 - @table["marginal_tax_rate", "val"])',
      },
      notes: "Kd x (1 - Tax rate)",
    },
  })

  table.addRowGutter()
  table.addSectionHeader("Capital weights and blended WACC")
  table.addRow("market_equity_value", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Market equity value ($M)",
      val: {
        expr: 'MarketAnchors["cost_close_price", "val"] * MarketAnchors["cost_diluted_shares", "val"]',
      },
      notes: "Spot x diluted shares",
    },
  })
  table.addRow("total_debt_and_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Financial debt & fin. leases",
      val: {
        expr: 'MarketAnchors["lt_debt_fair_value", "val"] + DebtLeasesSchedule["revolver_end", "FY26"] + DebtLeasesSchedule["total_fin_lease_liab", "FY26"]',
        note: "Uses FY26 disclosed $5,689M LT debt fair value plus $1,413M finance leases; excludes $2,606M ASC 842 operating leases to match post-rent FCFF.",
      },
      notes: "FV debt + fin. leases",
    },
  })
  table.addRow("total_capitalization", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Total capitalization ($M)",
      val: {
        expr: '@table["market_equity_value", "val"] + @table["total_debt_and_leases", "val"]',
      },
      notes: "Equity + financial debt",
    },
  })
  table.addRow("equity_weight", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Equity weight",
      val: {
        expr: '@table["market_equity_value", "val"] / @table["total_capitalization", "val"]',
      },
      notes: "E / (E + D)",
    },
  })
  table.addRow("debt_weight", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Debt weight",
      val: { expr: '1 - @table["equity_weight", "val"]' },
      notes: "1 - Equity weight",
    },
  })
  table.addRow("wacc", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    highlight: true,
    cells: {
      line_item: "Blended WACC (5Y beta)",
      val: {
        expr: '@table["equity_weight", "val"] * @table["cost_of_equity", "val"] + @table["debt_weight", "val"] * @table["after_tax_cost_of_debt", "val"]',
      },
      notes: "Primary perpetuity WACC",
    },
  })

  table.addRowGutter()
  table.addSectionHeader("Multi-horizon beta & rate memos")
  table.addRow("equity_beta_2y", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "2Y weekly equity beta",
      val: { expr: 'MarketAnchors["cost_beta_2y", "val"]' },
      notes: "2-year decoupling memo",
    },
  })
  table.addRow("cost_of_equity_2y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "2Y-beta cost of equity",
      val: {
        expr: '@table["rf_nominal", "val"] + @table["equity_beta_2y", "val"] * @table["erp", "val"]',
        note: "Compressed 2-year beta pushes implied Ke near pre-tax AA debt cost; surfaced as a regime diagnostic rather than perpetuity discount rate.",
      },
      notes: "Near pre-tax AA debt",
    },
  })
  table.addRow("wacc_2y_memo", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    cells: {
      line_item: "2Y-beta WACC (regime memo)",
      val: {
        expr: '@table["equity_weight", "val"] * @table["cost_of_equity_2y", "val"] + @table["debt_weight", "val"] * @table["after_tax_cost_of_debt", "val"]',
      },
      notes: "Not used in perpetuity",
    },
  })
  table.addRow("rf_stress_rate", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Stress 10Y Treasury benchmark",
      val: { expr: 'ScalarAssumptionsActive["rf_stress_rate", "val"]' },
      notes: "Lower-rate stress anchor",
    },
  })
  table.addRow("ke_rf_stress", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Ke at stress 10Y Treasury",
      val: {
        expr: '@table["rf_stress_rate", "val"] + @table["equity_beta", "val"] * @table["erp", "val"]',
      },
      notes: "Rate-regime sensitivity",
    },
  })
  table.addRow("kd_rf_stress", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "After-tax Kd at stress UST",
      val: {
        expr: '(@table["rf_stress_rate", "val"] + @table["aa_credit_oas", "val"]) * (1 - @table["marginal_tax_rate", "val"])',
      },
      notes: "Rate-regime sensitivity",
    },
  })
  table.addRow("wacc_rf_stress", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    cells: {
      line_item: "WACC at stress 10Y Treasury",
      val: {
        expr: '@table["equity_weight", "val"] * @table["ke_rf_stress", "val"] + @table["debt_weight", "val"] * @table["kd_rf_stress", "val"]',
      },
      notes: "Lower-rate regime WACC",
    },
  })
  table.addRow("peer_beta_5y_mean", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "Peer group 5Y mean beta",
      val: { expr: 'AVERAGE(TradingCompsLTM["BJ".."KR", "beta_5y"])' },
      notes: "5-peer mean (BJ..KR)",
    },
  })
  table.addRow("wacc_peer_beta_5y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "WACC at peer 5Y mean beta",
      val: {
        expr: '@table["equity_weight", "val"] * (@table["rf_nominal", "val"] + @table["peer_beta_5y_mean", "val"] * @table["erp", "val"]) + @table["debt_weight", "val"] * @table["after_tax_cost_of_debt", "val"]',
      },
      notes: "Peer-beta check",
    },
  })
  table.addRow("asset_beta_cash_adj", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "Cash-adjusted unlevered beta",
      val: {
        expr: 'IF(DcfBridge["current_market_ev", "perp"] > 0, @table["equity_beta", "val"] * @table["market_equity_value", "val"] / DcfBridge["current_market_ev", "perp"], NA())',
      },
      notes: "5Y beta x MktCap / EV",
    },
  })
  table.addRow("wacc_cash_adj_unlev", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Cash-adjusted unlevered WACC",
      val: {
        expr: 'IF(ISERROR(@table["asset_beta_cash_adj", "val"]), NA(), @table["rf_nominal", "val"] + @table["asset_beta_cash_adj", "val"] * @table["erp", "val"])',
      },
      notes: "Net-cash operating risk",
    },
  })
  table.addRow("base_ke_memo", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: Base Ke (Base ERP)",
      val: {
        expr: '@table["rf_nominal", "val"] + @table["equity_beta", "val"] * ScalarAssumptionsActive["equity_risk_premium", "Base"]',
      },
      notes: "Base attribution anchor",
    },
  })
  table.addRow("base_kd_memo", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: Base after-tax Kd",
      val: {
        expr: '@table["pretax_cost_of_debt", "val"] * (1 - PeriodAssumptionsBase["effective_tax_rate", "FY27E"])',
      },
      notes: "Base attribution anchor",
    },
  })
  table.addRow("base_wacc_memo", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: Base case WACC",
      val: {
        expr: '@table["equity_weight", "val"] * @table["base_ke_memo", "val"] + @table["debt_weight", "val"] * @table["base_kd_memo", "val"]',
      },
      notes: "Base attribution anchor",
    },
  })

  return table
}
