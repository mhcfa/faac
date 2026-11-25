import { Cell, type Sheet, type Table } from "f8-engine"
import { addAnnualColumns, wrapSubtitle } from "../timeline.ts"

export interface DiagnosticsTables {
  readonly qoeAndCashConversion: Table
  readonly investedCapitalAndRoic: Table
  readonly capitalAllocation: Table
}

export function buildDiagnosticsTables(sheet: Sheet): DiagnosticsTables {
  // Table 1: Quality of Earnings, True Economic Cash Conversion & Unlevered FCFF
  const qoeAndCashConversion = sheet.addTable(
    "QoeAndCashConversion",
    "Quality of Earnings, SBC Normalization & Unlevered FCFF",
    {
      subtitle: wrapSubtitle(
        "($ in Millions) | Treats SBC as a real economic cost and deducts recurring finance-lease principal outflows",
        128
      ),
    }
  )
  addAnnualColumns(qoeAndCashConversion)

  qoeAndCashConversion.addSectionHeader("Operating earnings quality bridge")
  qoeAndCashConversion.addRow("gaap_ebit", {
    cells: { item: "GAAP operating income (EBIT)" },
    expr: 'IncomeStatement["operating_income", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  qoeAndCashConversion.addRow("purchased_intangibles_amort", {
    cells: { item: "(+) Purchased intangibles amort." },
    expr: 'PpeAndIntangiblesSchedule["total_intangibles_amort", @col]',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("ebita", {
    cells: { item: "Economic EBITA (ex-M&A amort.)" },
    expr: '@table["gaap_ebit", @col] + @table["purchased_intangibles_amort", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  qoeAndCashConversion.addRow("sbc_expense", {
    cells: { item: "Memo: stock-based comp. (CF basis)" },
    expr: 'CashFlowStatement["sbc_expense", @col]',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("nongaap_ebit", {
    cells: { item: "Memo: Non-GAAP operating income" },
    expr: 'CostAndSbcSchedule["nongaap_operating_income", @col]',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("gaap_ebitda", {
    cells: { item: "GAAP EBITDA (SBC-inclusive)" },
    expr: 'IncomeStatement["gaap_ebitda", @col]',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("adj_ebitda", {
    cells: { item: "Adjusted EBITDA (ex-SBC)" },
    expr: 'IncomeStatement["adj_ebitda", @col]',
    format: "currency",
    decimals: 0,
  })

  qoeAndCashConversion.addRowGutter()
  qoeAndCashConversion.addSectionHeader("Unlevered economic free cash flow")
  qoeAndCashConversion.addRow("gaap_nopat", {
    cells: {
      item: "GAAP NOPAT",
      FY24A: new Cell({
        expr: '@table["gaap_ebit", @col] * (1 - IncomeStatement["effective_tax_rate", @col])',
      }),
      FY25A: new Cell({
        expr: '@table["gaap_ebit", @col] * (1 - IncomeStatement["effective_tax_rate", @col])',
      }),
      FY26A: new Cell({
        expr: '@table["gaap_ebit", @col] * (1 - IncomeStatement["effective_tax_rate", @col])',
      }),
    },
    expr: '@table["gaap_ebit", @col] * (1 - ScalarDrivers["effectiveTaxRate", "active"])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  qoeAndCashConversion.addRow("ebita_nopat", {
    cells: {
      item: "Steady-state EBITA NOPAT",
      FY24A: new Cell({
        expr: '@table["ebita", @col] * (1 - IncomeStatement["effective_tax_rate", @col])',
      }),
      FY25A: new Cell({
        expr: '@table["ebita", @col] * (1 - IncomeStatement["effective_tax_rate", @col])',
      }),
      FY26A: new Cell({
        expr: '@table["ebita", @col] * (1 - IncomeStatement["effective_tax_rate", @col])',
      }),
    },
    expr: '@table["ebita", @col] * (1 - ScalarDrivers["effectiveTaxRate", "active"])',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("plus_da_and_contract_amort", {
    cells: { item: "(+) D&A & contract cost amort." },
    expr: 'CashFlowStatement["da_expense", @col] + CashFlowStatement["amort_contract_costs", @col]',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("wc_and_commissions_cf", {
    cells: { item: "(+) Working cap., comm. & lease CF" },
    expr: 'SUM(CashFlowStatement["chg_accounts_receivable".."acquired_ma_wc_adj", @col])',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("less_capex", {
    cells: { item: "(−) Cash capital expenditures" },
    expr: 'CashFlowStatement["capex", @col]',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("less_fin_lease_principal", {
    cells: { item: "(−) Finance lease principal" },
    expr: 'CashFlowStatement["principal_payments_financing_obligations", @col]',
    format: "currency",
    decimals: 0,
  })
  qoeAndCashConversion.addRow("unlevered_fcff", {
    cells: {
      item: "Unlevered economic FCFF",
      FY24A: new Cell({
        expr: '@table["gaap_nopat", @col] + @table["plus_da_and_contract_amort", @col] + @table["wc_and_commissions_cf", @col] - IncomeStatement["gains_on_strategic_investments_net", @col] * IncomeStatement["effective_tax_rate", @col] + @table["less_capex", @col] + @table["less_fin_lease_principal", @col]',
      }),
      FY25A: new Cell({
        expr: '@table["gaap_nopat", @col] + @table["plus_da_and_contract_amort", @col] + @table["wc_and_commissions_cf", @col] - IncomeStatement["gains_on_strategic_investments_net", @col] * IncomeStatement["effective_tax_rate", @col] + @table["less_capex", @col] + @table["less_fin_lease_principal", @col]',
      }),
      FY26A: new Cell({
        expr: '@table["gaap_nopat", @col] + @table["plus_da_and_contract_amort", @col] + @table["wc_and_commissions_cf", @col] - IncomeStatement["gains_on_strategic_investments_net", @col] * IncomeStatement["effective_tax_rate", @col] + @table["less_capex", @col] + @table["less_fin_lease_principal", @col]',
      }),
    },
    expr: '@table["gaap_nopat", @col] + @table["plus_da_and_contract_amort", @col] + @table["wc_and_commissions_cf", @col] + @table["less_capex", @col] + @table["less_fin_lease_principal", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })

  qoeAndCashConversion.addRowGutter()
  qoeAndCashConversion.addSectionHeader("Hidden costs & cash conversion")
  qoeAndCashConversion.addRow("sbc_pct_rev", {
    cells: { item: "Stock-based comp. (% revenue)" },
    expr: '@table["sbc_expense", @col] / IncomeStatement["total_revenue", @col]',
    format: "percentage",
    decimals: 1,
  })
  qoeAndCashConversion.addRow("true_capex_intensity", {
    cells: { item: "CapEx & finance leases (% rev.)" },
    expr: '-(@table["less_capex", @col] + @table["less_fin_lease_principal", @col]) / IncomeStatement["total_revenue", @col]',
    format: "percentage",
    decimals: 1,
  })
  qoeAndCashConversion.addRow("economic_fcf_pct_reported", {
    cells: { item: "Economic FCF % of reported FCF" },
    expr: 'IF(CashFlowStatement["reported_fcf", @col] > 0, CashFlowStatement["economic_fcf", @col] / CashFlowStatement["reported_fcf", @col], NA())',
    format: "percentage",
    decimals: 1,
  })
  qoeAndCashConversion.addRow("fcff_conversion_ebitda", {
    cells: { item: "Unlevered FCFF / GAAP EBITDA" },
    expr: 'IF(@table["gaap_ebitda", @col] > 0, @table["unlevered_fcff", @col] / @table["gaap_ebitda", @col], NA())',
    format: "percentage",
    decimals: 1,
  })
  qoeAndCashConversion.addRow("capex_to_ppe_depr", {
    cells: { item: "(CapEx + fin. leases) / PP&E depr." },
    expr: '-(@table["less_capex", @col] + @table["less_fin_lease_principal", @col]) / PpeAndIntangiblesSchedule["ppe_and_fin_lease_depr", @col]',
    format: "percentage",
    decimals: 1,
  })

  // Table 2: Two-Sided Invested Capital, ROIC & Credit Diagnostics
  const investedCapitalAndRoic = sheet.addTable(
    "InvestedCapitalAndRoic",
    "Invested Capital Tie-Out, ROIC & Leverage Diagnostics",
    {
      subtitle: wrapSubtitle(
        "($ in Millions) | Operating and financing invested capital reconcile each period; ex-goodwill IC is negative due to deferred-revenue float",
        128
      ),
    }
  )
  addAnnualColumns(investedCapitalAndRoic)

  investedCapitalAndRoic.addSectionHeader("Invested capital — operating side")
  investedCapitalAndRoic.addRow("op_current_assets", {
    cells: { item: "Operating current assets" },
    expr: 'BalanceSheet["accounts_receivable_net", @col] + BalanceSheet["capitalized_contract_costs_current", @col] + BalanceSheet["prepaid_and_other_current_assets", @col]',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("op_current_liab", {
    cells: { item: "(−) Operating current liabilities" },
    expr: '-(BalanceSheet["ap_accrued_and_other_current_liab", @col] + BalanceSheet["unearned_revenue", @col])',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("nowc", {
    cells: { item: "Net operating working capital" },
    expr: '@table["op_current_assets", @col] + @table["op_current_liab", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  investedCapitalAndRoic.addRow("net_op_lt_assets", {
    cells: { item: "Net operating long-term assets" },
    expr: 'BalanceSheet["ppe_net", @col] + (BalanceSheet["operating_lease_rou_assets", @col] - BalanceSheet["operating_lease_liab_current", @col] - BalanceSheet["operating_lease_liab_noncurrent", @col]) + BalanceSheet["capitalized_contract_costs_noncurrent", @col] + BalanceSheet["goodwill", @col] + BalanceSheet["purchased_intangibles_net", @col] + BalanceSheet["deferred_tax_and_other_assets_net", @col] - BalanceSheet["other_noncurrent_liabilities", @col]',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("ic_operating_side", {
    cells: { item: "Invested capital — operating side" },
    expr: '@table["nowc", @col] + @table["net_op_lt_assets", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "muted",
  })

  investedCapitalAndRoic.addRowGutter()
  investedCapitalAndRoic.addSectionHeader("Invested capital — financing side")
  investedCapitalAndRoic.addRow("gross_debt", {
    cells: { item: "(+) Gross funded debt" },
    expr: 'BalanceSheet["debt_current", @col] + BalanceSheet["debt_noncurrent", @col]',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("total_equity", {
    cells: { item: "(+) Total stockholders' equity" },
    expr: 'BalanceSheet["total_equity", @col]',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("less_cash_and_mkt", {
    cells: { item: "(−) Cash & marketable securities" },
    expr: '-(BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["marketable_securities", @col])',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("less_strategic_investments", {
    cells: { item: "(−) Non-operating strategic inv." },
    expr: '-BalanceSheet["strategic_investments", @col]',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("ic_financing_side", {
    cells: { item: "Invested capital — financing side" },
    expr: 'SUM(@table["gross_debt".."less_strategic_investments", @col])',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "muted",
  })
  investedCapitalAndRoic.addRow("ic_tie_check", {
    cells: { item: "Invested capital tie-out check" },
    expr: '@table["ic_operating_side", @col] - @table["ic_financing_side", @col]',
    format: "currency",
    decimals: 2,
  })

  investedCapitalAndRoic.addRowGutter()
  investedCapitalAndRoic.addSectionHeader("ROIC & credit diagnostics")
  investedCapitalAndRoic.addRow("ic_ex_goodwill", {
    cells: { item: "Invested capital ex-goodwill" },
    expr: '@table["ic_operating_side", @col] - BalanceSheet["goodwill", @col] - BalanceSheet["purchased_intangibles_net", @col]',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("avg_ic", {
    cells: {
      item: "Average invested capital",
      FY24A: null,
    },
    expr: 'AVERAGE(@table["ic_operating_side", col.prev], @table["ic_operating_side", @col])',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("avg_ic_ex_gw", {
    cells: {
      item: "Avg. invested capital ex-goodwill",
      FY24A: null,
    },
    expr: 'AVERAGE(@table["ic_ex_goodwill", col.prev], @table["ic_ex_goodwill", @col])',
    format: "currency",
    decimals: 0,
  })
  investedCapitalAndRoic.addRow("headline_roic", {
    cells: {
      item: "Headline ROIC (NOPAT / avg. IC)",
      FY24A: null,
    },
    expr: 'IF(@table["avg_ic", @col] > 0, QoeAndCashConversion["gaap_nopat", @col] / @table["avg_ic", @col], NA())',
    format: "percentage",
    decimals: 1,
    style: "subtotal",
    shade: "alt",
  })
  investedCapitalAndRoic.addRow("roic_spread_vs_wacc", {
    cells: {
      item: "Economic spread (ROIC less WACC)",
      FY24A: null,
    },
    expr: '@table["headline_roic", @col] - WaccSchedule["wacc", "primary"]',
    format: "percentage",
    decimals: 1,
  })
  investedCapitalAndRoic.addRow("ex_gw_roic", {
    cells: {
      item: "Ex-goodwill organic ROIC",
      FY24A: null,
    },
    expr: 'IF(@table["avg_ic_ex_gw", @col] > 0, QoeAndCashConversion["gaap_nopat", @col] / @table["avg_ic_ex_gw", @col], NA())',
    format: "percentage",
    decimals: 1,
  })
  investedCapitalAndRoic.addRow("incremental_op_margin", {
    cells: {
      item: "Incremental GAAP operating margin",
      FY24A: null,
    },
    expr: 'IF(ABS(IncomeStatement["total_revenue", @col] - IncomeStatement["total_revenue", col.prev]) > 0, (IncomeStatement["operating_income", @col] - IncomeStatement["operating_income", col.prev]) / (IncomeStatement["total_revenue", @col] - IncomeStatement["total_revenue", col.prev]), NA())',
    format: "percentage",
    decimals: 1,
  })
  investedCapitalAndRoic.addRow("net_leverage_ebitda", {
    cells: { item: "Net funded debt / GAAP EBITDA" },
    expr: 'IF(QoeAndCashConversion["gaap_ebitda", @col] > 0, (@table["gross_debt", @col] + @table["less_cash_and_mkt", @col]) / QoeAndCashConversion["gaap_ebitda", @col], NA())',
    format: "multiple",
    decimals: 1,
  })
  investedCapitalAndRoic.addRow("interest_coverage", {
    cells: {
      item: "GAAP interest coverage (EBIT/Int)",
      FY24A: null,
      FY25A: null,
      FY26A: null,
    },
    expr: 'IF(-IncomeStatement["interest_expense", @col] > 0, IncomeStatement["operating_income", @col] / (-IncomeStatement["interest_expense", @col]), NA())',
    format: "multiple",
    decimals: 1,
  })

  // Table 3: Multi-Year Cash Deployment & Capital Allocation Summary
  const capitalAllocation = sheet.addTable(
    "CapitalAllocationSummary",
    "Multi-Year Cash Deployment & Capital Allocation",
    {
      subtitle: wrapSubtitle(
        "($ in Millions) | Tracks operating cash generation against CapEx, finance leases, M&A, buybacks, dividends, and debt",
        140
      ),
    }
  )
  addAnnualColumns(capitalAllocation)
  capitalAllocation.addColumn("cum_5y", {
    headers: ["5Y Cum.", "FY27–31E"],
    style: "subtotal",
    shade: "muted",
  })

  const addCapAllocRow = (
    id: string,
    label: string,
    annualExpr: string,
    style?: "subtotal" | "total"
  ): void => {
    capitalAllocation.addRow(id, {
      cells: {
        item: label,
        cum_5y: new Cell({ expr: 'SUM(@table[@row, "FY27E".."FY31E"])' }),
      },
      expr: annualExpr,
      format: "currency",
      decimals: 0,
      ...(style !== undefined ? { style } : {}),
    })
  }

  addCapAllocRow(
    "ocf",
    "Operating cash flow (OCF)",
    'CashFlowStatement["operating_cash_flow", @col]',
    "subtotal"
  )
  addCapAllocRow(
    "capex",
    "Cash capital expenditures",
    'CashFlowStatement["capex", @col]'
  )
  addCapAllocRow(
    "fin_leases",
    "Finance lease principal",
    'CashFlowStatement["principal_payments_financing_obligations", @col]'
  )
  addCapAllocRow(
    "cash_ma",
    "Cash business combinations (M&A)",
    'CashFlowStatement["acquisitions_net_of_cash", @col]'
  )
  addCapAllocRow(
    "buybacks",
    "Common stock repurchases",
    'CashFlowStatement["share_repurchases", @col]'
  )
  addCapAllocRow(
    "dividends",
    "Cash dividends paid",
    'CashFlowStatement["dividends_paid", @col]'
  )
  addCapAllocRow(
    "net_debt_cf",
    "Net debt & revolver cash flow",
    'CashFlowStatement["debt_issuance_proceeds_net", @col] + CashFlowStatement["debt_repayments", @col] + CashFlowStatement["revolver_net_draw", @col]'
  )
  addCapAllocRow(
    "total_distributions",
    "Total capital returned",
    '@table["buybacks", @col] + @table["dividends", @col]',
    "subtotal"
  )
  addCapAllocRow(
    "economic_fcf_vs_dist",
    "Economic FCF after distributions",
    'CashFlowStatement["economic_fcf", @col] + @table["total_distributions", @col]',
    "total"
  )

  return {
    qoeAndCashConversion,
    investedCapitalAndRoic,
    capitalAllocation,
  }
}
