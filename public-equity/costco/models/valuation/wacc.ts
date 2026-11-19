import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import { rowFormatOptions } from "../timeline.ts"

export function buildWaccSchedule(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const table = sheet.addTable(
    "WaccSchedule",
    "Weighted Average Cost of Capital (WACC) — CAPM & AA Credit Spread",
    {
      subtitle: [
        "CAPM Cost of Equity & AA Corporate Debt as of 2026-11-13 Market Close ($M / %)",
        kg.citations.treasuryPar,
        kg.citations.treasuryReal,
        kg.citations.creditOas,
        kg.citations.inflationFedFunds,
      ],
      currency: "USD",
    }
  )
  table.addColumn("line_item", {
    role: "descriptor",
    header: "WACC Component / Input",
  })
  table.addColumn("val", {
    role: "measure",
    headers: ["Active", "Value"],
  })

  table.addSectionHeader("1. Cost of Equity (CAPM)")
  table.addRow("rf_nominal", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Risk-free rate (2026-11-13 10Y US Treasury Par Yield)",
      val: { expr: 'MarketAnchors["rf_par_10y", "val"]' },
    },
  })
  table.addRow("real_tips_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: 10Y TIPS Real Yield (2026-11-13)",
      val: { expr: 'MarketAnchors["rf_real_10y", "val"]' },
    },
  })
  table.addRow("t10yie_breakeven", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: 10Y Breakeven Inflation (T10YIE, 2026-11-13)",
      val: { expr: 'MarketAnchors["t10yie_breakeven", "val"]' },
    },
  })
  table.addRow("dff_fed_funds", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Memo: Effective Federal Funds Rate (2026-11-12)",
      val: { expr: 'MarketAnchors["dff_fed_funds", "val"]' },
    },
  })
  table.addRow("equity_beta", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "5-Year Monthly Equity Beta (vs. S&P 500)",
      val: { expr: 'MarketAnchors["cost_beta_5y", "val"]' },
    },
  })
  table.addRow("erp", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "U.S. Equity Risk Premium (ERP)",
      val: { expr: 'ScalarAssumptionsActive["equity_risk_premium", "val"]' },
    },
  })
  table.addRow("cost_of_equity", {
    ...rowFormatOptions("percentage", 2),
    style: "subtotal",
    cells: {
      line_item: "Cost of Equity (Ke = Rf + Beta x ERP)",
      val: {
        expr: '@table["rf_nominal", "val"] + @table["equity_beta", "val"] * @table["erp", "val"]',
      },
    },
  })

  table.addSectionHeader("2. After-Tax Cost of Debt")
  table.addRow("aa_credit_oas", {
    ...rowFormatOptions("basis_points"),
    cells: {
      line_item: "ICE BofA AA U.S. Corporate OAS (S&P/Fitch AA)",
      val: { expr: 'MarketAnchors["oas_aa", "val"]' },
    },
  })
  table.addRow("pretax_cost_of_debt", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Marginal Pre-Tax Cost of Debt (Rf + AA OAS)",
      val: {
        expr: '@table["rf_nominal", "val"] + @table["aa_credit_oas", "val"]',
      },
    },
  })
  table.addRow("marginal_tax_rate", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Normalized Marginal Tax Rate (FY27E ETR)",
      val: {
        expr: 'PeriodAssumptionsActive["effective_tax_rate", "FY27E"]',
      },
    },
  })
  table.addRow("after_tax_cost_of_debt", {
    ...rowFormatOptions("percentage", 2),
    style: "subtotal",
    cells: {
      line_item: "After-Tax Cost of Debt (Kd x (1 - t))",
      val: {
        expr: '@table["pretax_cost_of_debt", "val"] * (1 - @table["marginal_tax_rate", "val"])',
      },
    },
  })

  table.addSectionHeader("3. Capital Structure Weights & Blended WACC")
  table.addRow("market_equity_value", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Market Equity Capitalization (2026-11-13 SEC Shares)",
      val: {
        expr: 'MarketAnchors["cost_close_price", "val"] * MarketAnchors["cost_sec_shares", "val"]',
      },
    },
  })
  table.addRow("total_debt_and_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value:
          "FY26 Carrying Financial Debt & Finance Leases (excl. ASC 842 Op Leases)",
        note: "Post-operating-lease-rent EBIT/EBITDA/FCFF weights $7,575M carrying financial debt + finance leases only, avoiding $2,606M ASC 842 operating lease double-count.",
      },
      val: {
        expr: 'DebtLeasesSchedule["total_lt_debt_carrying", "FY26"] + DebtLeasesSchedule["revolver_end", "FY26"] + DebtLeasesSchedule["total_fin_lease_liab", "FY26"]',
      },
    },
  })
  table.addRow("total_capitalization", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item:
        "Total Market Capitalization (Equity + Financial Debt & Fin Leases)",
      val: {
        expr: '@table["market_equity_value", "val"] + @table["total_debt_and_leases", "val"]',
      },
    },
  })
  table.addRow("equity_weight", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Equity Weight (E / (E + D))",
      val: {
        expr: '@table["market_equity_value", "val"] / @table["total_capitalization", "val"]',
      },
    },
  })
  table.addRow("debt_weight", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Debt & Leases Weight (1 - Equity Weight)",
      val: { expr: '1 - @table["equity_weight", "val"]' },
    },
  })
  table.addRow("wacc", {
    ...rowFormatOptions("percentage", 2),
    style: "total",
    highlight: true,
    cells: {
      line_item: "Weighted Average Cost of Capital (WACC)",
      val: {
        expr: '@table["equity_weight", "val"] * @table["cost_of_equity", "val"] + @table["debt_weight", "val"] * @table["after_tax_cost_of_debt", "val"]',
      },
    },
  })
  table.addRow("base_wacc_memo", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: {
        value: "Memo: Base Case WACC (for live scenario variance split)",
        note: "Evaluates CAPM WACC at Base ERP (4.50%) and Base ETR (25.0%) to decompose active scenario variance.",
      },
      val: {
        expr: '@table["equity_weight", "val"] * (@table["rf_nominal", "val"] + @table["equity_beta", "val"] * ScalarAssumptionsActive["equity_risk_premium", "Base"]) + @table["debt_weight", "val"] * (@table["pretax_cost_of_debt", "val"] * (1 - PeriodAssumptionsBase["effective_tax_rate", "FY27E"]))',
      },
    },
  })

  return table
}
