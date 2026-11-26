import { Cell, type Sheet } from "f8-engine"
import type { AuditedModelData } from "../kg-extractors.ts"
import { SCALE_NOTE_USD_M } from "../scale.ts"
import {
  BS_FORECAST_PERIODS,
  BS_HIST_PERIODS,
  FLOW_ALL_PERIODS,
  FLOW_HIST_PERIODS,
  FORECAST_PERIODS,
  addTimelineColumns,
  type BsHistPeriod,
  type FlowHistPeriod,
} from "../timeline.ts"

export function buildFinancialStatementsSheet(
  sheet: Sheet,
  data: AuditedModelData
): void {
  // =========================================================================
  // 1. Consolidated Statements of Income
  // =========================================================================
  const is = sheet.addTable(
    "IncomeStatement",
    "Consolidated Statements of Income & Normalized Earnings Bridge",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Meta Platforms Form 10-K (FY2023–FY2025), Form 10-Q (Q3 2026) & Nasdaq Consensus EPS",
      ],
    }
  )
  is.addColumn("label", { role: "descriptor", header: "Income Statement Line" })
  addTimelineColumns(is, "flow")

  const revHist = data.flowSeries("income_statement", "revenue")
  const cogsHist = data.flowSeries("income_statement", "cost_of_revenue")
  const rdHist = data.flowSeries("income_statement", "research_and_development")
  const msHist = data.flowSeries("income_statement", "marketing_and_sales")
  const gaHist = data.flowSeries(
    "income_statement",
    "general_and_administrative"
  )
  const intOthHist = data.flowSeries(
    "income_statement",
    "interest_and_other_income_net"
  )
  const taxHist = data.flowSeries(
    "income_statement",
    "provision_for_income_taxes"
  )
  const shDilHist = data.flowSeries("income_statement", "shares_diluted")

  const agLegal9m26 = data.val(
    "meta_operating_kpis",
    "q3_26_ag_legal_charge",
    "2026-Q3-YTD",
    { entity: "META" }
  )
  const sev9m26 = data.val(
    "meta_operating_kpis",
    "q2_26_severance_charge",
    "2026-Q3-YTD",
    { entity: "META" }
  )

  is.addSectionHeader("Revenue & operating income (GAAP)")

  // Revenue
  const revCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Revenue" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    revCells[p] = revHist[p]
  }
  revCells["LTM Q3 26"] = new Cell({
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  })
  revCells["Q4 26E"] = new Cell({
    expr: 'SegmentBuild["total_revenue", "Q4 26E"]',
  })
  revCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    revCells[p] = new Cell({ expr: 'SegmentBuild["total_revenue", @col]' })
  }
  is.addRow("revenue", {
    cells: revCells,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  const addFuncExpense = (
    id: string,
    label: string,
    hist: Readonly<Record<FlowHistPeriod, number>>,
    sparseNotes?: Readonly<Partial<Record<FlowHistPeriod, string>>>
  ): void => {
    const cells: Record<string, Cell | number | null> = {
      label: new Cell({ value: label }),
    }
    for (const p of FLOW_HIST_PERIODS) {
      const cellNote = sparseNotes?.[p]
      cells[p] =
        cellNote !== undefined
          ? new Cell({ value: hist[p], note: cellNote })
          : hist[p]
    }
    cells["LTM Q3 26"] = new Cell({
      expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
    })
    cells["Q4 26E"] = null
    cells["2026E"] = null
    for (const p of FORECAST_PERIODS) {
      cells[p] = null
    }
    is.addRow(id, { cells, format: "currency", decimals: 0 })
  }

  addFuncExpense("cost_of_revenue", "Cost of revenue (GAAP actuals)", cogsHist)
  addFuncExpense(
    "research_and_development",
    "Research & development (GAAP actuals)",
    rdHist
  )
  addFuncExpense(
    "marketing_and_sales",
    "Marketing & sales (GAAP actuals)",
    msHist
  )
  addFuncExpense(
    "general_and_administrative",
    "General & administrative (GAAP actuals)",
    gaHist,
    {
      "9M26A":
        "Includes $11,890M multistate AG teen mental health legal accrual (Form 10-Q Note 10).",
    }
  )

  // Total Costs & Expenses
  const totExpCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Total costs & expenses (GAAP)" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    totExpCells[p] = new Cell({
      expr: 'SUM(@table["cost_of_revenue".."general_and_administrative", @col])',
    })
  }
  totExpCells["LTM Q3 26"] = new Cell({
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  })
  totExpCells["Q4 26E"] = new Cell({
    expr: 'SegmentBuild["total_costs_gaap", "Q4 26E"]',
  })
  totExpCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    totExpCells[p] = new Cell({
      expr: 'SegmentBuild["total_costs_gaap", @col]',
    })
  }
  is.addRow("total_costs_and_expenses", {
    cells: totExpCells,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Operating Income (GAAP)
  is.addRow("operating_income", {
    cells: { label: new Cell({ value: "Operating income (GAAP EBIT)" }) },
    expr: '@table["revenue", @col] - @table["total_costs_and_expenses", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Interest & Other Income (Expense), Net
  const intOthCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Interest & other income (expense), net" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    intOthCells[p] = intOthHist[p]
  }
  intOthCells["LTM Q3 26"] = new Cell({
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  })
  intOthCells["Q4 26E"] = new Cell({
    expr: 'DebtHybridShareSchedule["net_interest", "2026E"]',
  })
  intOthCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    intOthCells[p] = new Cell({
      expr: 'DebtHybridShareSchedule["net_interest", @col]',
    })
  }
  is.addRow("interest_and_other_income_net", {
    cells: intOthCells,
    format: "currency",
    decimals: 0,
  })

  // Income Before Taxes
  is.addRow("income_before_taxes", {
    cells: {
      label: new Cell({ value: "Income before provision for income taxes" }),
    },
    expr: '@table["operating_income", @col] + @table["interest_and_other_income_net", @col]',
    format: "currency",
    decimals: 0,
  })

  // Provision for Income Taxes
  const taxCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Provision for income taxes" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    if (p === "2025A") {
      taxCells[p] = new Cell({
        value: taxHist[p],
        note: "Includes $15,930M Q3 2025 OBBBA one-time tax charge.",
      })
    } else if (p === "9M26A") {
      taxCells[p] = new Cell({
        value: taxHist[p],
        note: "Includes -$8,030M Q1 2026 U.S. CAMT transitional tax benefit.",
      })
    } else {
      taxCells[p] = taxHist[p]
    }
  }
  taxCells["LTM Q3 26"] = new Cell({
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  })
  taxCells["Q4 26E"] = new Cell({
    expr: 'MAX(0, @table["income_before_taxes", "Q4 26E"]) * ScalarDrivers["effectiveTaxRate", "active"]',
  })
  taxCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    taxCells[p] = new Cell({
      expr: 'MAX(0, @table["income_before_taxes", @col]) * ScalarDrivers["effectiveTaxRate", "active"]',
    })
  }
  is.addRow("provision_for_income_taxes", {
    cells: taxCells,
    format: "currency",
    decimals: 0,
  })

  // Net Income (GAAP)
  is.addRow("net_income", {
    cells: { label: new Cell({ value: "Net income (GAAP)" }) },
    expr: '@table["income_before_taxes", @col] - @table["provision_for_income_taxes", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  // Preferred Dividends & Net Income Available to Common
  const prefDivCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Less: Mandatory convertible preferred div." }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    prefDivCells[p] = 0
  }
  prefDivCells["LTM Q3 26"] = 0
  prefDivCells["Q4 26E"] = new Cell({
    expr: 'DebtHybridShareSchedule["mcp_preferred_dividends", "2026E"]',
  })
  prefDivCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    prefDivCells[p] = new Cell({
      expr: 'DebtHybridShareSchedule["mcp_preferred_dividends", @col]',
    })
  }
  is.addRow("preferred_dividends", {
    cells: prefDivCells,
    format: "currency",
    decimals: 0,
  })

  is.addRow("net_income_to_common", {
    cells: {
      label: new Cell({ value: "Net income available to common stockholders" }),
    },
    expr: '@table["net_income", @col] + @table["preferred_dividends", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Diluted Shares & GAAP EPS
  const shCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Weighted average diluted shares (M)" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    shCells[p] = shDilHist[p]
  }
  shCells["LTM Q3 26"] = new Cell({
    expr: 'DebtHybridShareSchedule["ending_diluted_shares", "Q3 26A"]',
  })
  shCells["Q4 26E"] = new Cell({
    expr: 'DebtHybridShareSchedule["avg_diluted_shares", "2026E"]',
  })
  shCells["2026E"] = new Cell({
    expr: '(@table["shares_diluted", "9M26A"] * 3 + @table["shares_diluted", "Q4 26E"]) / 4',
  })
  for (const p of FORECAST_PERIODS) {
    shCells[p] = new Cell({
      expr: 'DebtHybridShareSchedule["avg_diluted_shares", @col]',
    })
  }
  is.addRow("shares_diluted", { cells: shCells, format: "number", decimals: 1 })

  is.addRow("eps_diluted_gaap", {
    cells: { label: new Cell({ value: "Diluted EPS (GAAP)" }) },
    expr: '@table["net_income_to_common", @col] / @table["shares_diluted", @col]',
    format: "currency",
    decimals: 2,
  })

  // Section 2: Normalized QoE Earnings & Consensus EPS Comparison
  is.addRowGutter()
  is.addSectionHeader("Normalized profitability & consensus EPS bridge")

  const agCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Multistate AG legal settlement add-back" }),
  }
  for (const p of FLOW_ALL_PERIODS) {
    if (p === "9M26A") {
      agCells[p] = agLegal9m26
    } else if (p === "LTM Q3 26") {
      agCells[p] = new Cell({
        expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
      })
    } else if (p === "2026E") {
      agCells[p] = new Cell({
        expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
      })
    } else if (p === "Q4 26E") {
      agCells[p] = new Cell({
        value: 0,
        note: "Non-recurring 9M26 multistate AG legal accrual ($11,890M; Form 10-Q Note 10); zero in clean forecasts.",
      })
    } else {
      agCells[p] = 0
    }
  }
  is.addRow("qoe_ag_legal_addback", {
    cells: agCells,
    format: "currency",
    decimals: 0,
  })

  const sevCells: Record<string, Cell | number> = {
    label: new Cell({ value: "May 2026 workforce severance add-back" }),
  }
  for (const p of FLOW_ALL_PERIODS) {
    if (p === "9M26A") {
      sevCells[p] = sev9m26
    } else if (p === "LTM Q3 26") {
      sevCells[p] = new Cell({
        expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
      })
    } else if (p === "2026E") {
      sevCells[p] = new Cell({
        expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
      })
    } else if (p === "Q4 26E") {
      sevCells[p] = new Cell({
        value: 0,
        note: "Non-recurring May 2026 workforce severance ($1,180M, ~8,000 roles; Form 10-Q Note 13); zero in clean forecasts.",
      })
    } else {
      sevCells[p] = 0
    }
  }
  is.addRow("qoe_severance_addback", {
    cells: sevCells,
    format: "currency",
    decimals: 0,
  })

  is.addRow("normalized_ebit", {
    cells: { label: new Cell({ value: "Normalized (clean) EBIT" }) },
    expr: '@table["operating_income", @col] + @table["qoe_ag_legal_addback", @col] + @table["qoe_severance_addback", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  is.addRow("normalized_ebit_margin", {
    cells: { label: new Cell({ value: "Normalized EBIT margin" }) },
    expr: '@table["normalized_ebit", @col] / @table["revenue", @col]',
    format: "percentage",
    decimals: 1,
  })

  is.addRow("normalized_ebitda", {
    cells: { label: new Cell({ value: "Normalized (clean) EBITDA" }) },
    expr: '@table["normalized_ebit", @col] + SegmentBuild["consolidated_da", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  is.addRow("normalized_ebitda_margin", {
    cells: { label: new Cell({ value: "Normalized EBITDA margin" }) },
    expr: '@table["normalized_ebitda", @col] / @table["revenue", @col]',
    format: "percentage",
    decimals: 1,
  })

  is.addRow("normalized_net_income", {
    cells: { label: new Cell({ value: "Normalized net income to common" }) },
    expr: '(@table["normalized_ebit", @col] + @table["interest_and_other_income_net", @col]) - MAX(0, @table["normalized_ebit", @col] + @table["interest_and_other_income_net", @col]) * ScalarDrivers["effectiveTaxRate", "active"] + @table["preferred_dividends", @col]',
    format: "currency",
    decimals: 0,
  })

  is.addRow("normalized_eps", {
    cells: { label: new Cell({ value: "Normalized (clean) diluted EPS" }) },
    expr: '@table["normalized_net_income", @col] / @table["shares_diluted", @col]',
    format: "currency",
    decimals: 2,
    style: "bold",
  })

  const consEps = (periodKey: string): number =>
    data.val("consensus_eps", "consensus_eps", periodKey, { entity: "META" })
  const consCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Wall Street consensus EPS (Nasdaq)" }),
    "2021A": null,
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "9M25A": null,
    "9M26A": null,
    "LTM Q3 26": null,
    "Q4 26E": consEps("2026-Q4"),
    "2026E": consEps("2026-FY"),
    "2027E": consEps("2027-FY"),
    "2028E": consEps("2028-FY"),
    "2029E": new Cell({
      value: consEps("2029-FY"),
      note: "Thin analyst coverage (n=4 estimates vs. n=10–17 for FY26E–FY28E; Nasdaq Nov 20, 2026).",
    }),
    "2030E": null,
    "2031E": null,
  }
  is.addRow("consensus_eps", {
    cells: consCells,
    format: "currency",
    decimals: 2,
  })

  const epsVsCons: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Model clean EPS vs. consensus (%)" }),
    "2021A": null,
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "9M25A": null,
    "9M26A": null,
    "LTM Q3 26": null,
    "Q4 26E": new Cell({
      expr: '@table["normalized_eps", "Q4 26E"] / @table["consensus_eps", "Q4 26E"] - 1',
    }),
    "2026E": new Cell({
      expr: '@table["normalized_eps", "2026E"] / @table["consensus_eps", "2026E"] - 1',
    }),
    "2027E": new Cell({
      expr: '@table["normalized_eps", "2027E"] / @table["consensus_eps", "2027E"] - 1',
    }),
    "2028E": new Cell({
      expr: '@table["normalized_eps", "2028E"] / @table["consensus_eps", "2028E"] - 1',
    }),
    "2029E": new Cell({
      expr: '@table["normalized_eps", "2029E"] / @table["consensus_eps", "2029E"] - 1',
    }),
    "2030E": null,
    "2031E": null,
  }
  is.addRow("eps_vs_consensus_pct", {
    cells: epsVsCons,
    format: "percentage",
    decimals: 1,
  })

  // =========================================================================
  // 2. Consolidated Balance Sheets
  // =========================================================================
  const bs = sheet.addTable("BalanceSheet", "Consolidated Balance Sheets", {
    subtitle: [
      SCALE_NOTE_USD_M,
      "Meta Platforms Form 10-K (FY2023–FY2025) & Form 10-Q (Q3 2026); fully integrated balance sheet",
    ],
  })
  bs.addColumn("label", { role: "descriptor", header: "Balance Sheet Line" })
  addTimelineColumns(bs, "bs")

  const bsRowHist = (
    rowId: string,
    opts?: {
      readonly zeroPeriods?: readonly BsHistPeriod[]
      readonly defaultZero?: boolean
    }
  ): Readonly<Record<BsHistPeriod, number>> =>
    data.bsSeries("balance_sheet", rowId, opts)

  const cashHist = bsRowHist("cash_and_equivalents")
  const mktHist = bsRowHist("marketable_securities")
  const arHist = bsRowHist("accounts_receivable_net")
  const prepHist = bsRowHist("prepaid_expenses_and_other_current_assets")
  const ppeHist = bsRowHist("property_and_equipment_net")
  const rouHist = bsRowHist("operating_lease_rou_assets")
  const intangHist = bsRowHist("intangible_assets_net", {
    zeroPeriods: ["2023A", "2024A", "2025A", "Q3 26A"],
    defaultZero: true,
  })
  const gwHist = bsRowHist("goodwill")
  const nmEqHist = bsRowHist("non_marketable_equity_investments")
  const othAssetHist = bsRowHist("other_assets")

  const apHist = bsRowHist("accounts_payable")
  const partHist = bsRowHist("partners_payable", {
    zeroPeriods: ["2023A", "2024A", "2025A", "Q3 26A"],
    defaultZero: true,
  })
  const opLeaseCurHist = bsRowHist("operating_lease_liabilities_current")
  const accrHist = bsRowHist("accrued_expenses_and_other_current_liabilities")
  const opLeaseNcHist = bsRowHist("operating_lease_liabilities_noncurrent")
  const ltdHist = bsRowHist("long_term_debt")
  const ltTaxHist = bsRowHist("long_term_income_taxes", { defaultZero: true })
  const othLiabHist = bsRowHist("other_liabilities")

  const apicHist = bsRowHist("common_stock_and_apic")
  const aociHist = bsRowHist("accumulated_other_comprehensive_income")
  const reHist = bsRowHist("retained_earnings")

  const buildBsLine = (
    hist: Readonly<Record<BsHistPeriod, number>>,
    label: string,
    forecastExpr: string,
    sparseHistNotes?: Readonly<Partial<Record<BsHistPeriod, string>>>
  ): Record<string, Cell | number> => {
    const out: Record<string, Cell | number> = {
      label: new Cell({ value: label }),
    }
    for (const p of BS_HIST_PERIODS) {
      const cellNote = sparseHistNotes?.[p]
      out[p] =
        cellNote !== undefined
          ? new Cell({ value: hist[p], note: cellNote })
          : hist[p]
    }
    for (const p of BS_FORECAST_PERIODS) {
      out[p] = new Cell({ expr: forecastExpr })
    }
    return out
  }

  // Assets
  bs.addSectionHeader("Current assets")
  bs.addRow("cash_and_equivalents", {
    cells: buildBsLine(
      cashHist,
      "Cash and cash equivalents",
      'DebtHybridShareSchedule["ending_liquid_cash", @col] - @table["marketable_securities", @col]',
      {
        "Q3 26A":
          "Excludes $13,132M Q3 2026 restricted cash (reported inside prepaid and other assets).",
      }
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("marketable_securities", {
    cells: buildBsLine(
      mktHist,
      "Marketable securities",
      'MAX(0, DebtHybridShareSchedule["ending_liquid_cash", @col] - ScalarDrivers["minimumOperatingCash", "active"])'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("accounts_receivable_net", {
    cells: buildBsLine(
      arHist,
      "Accounts receivable, net",
      'WorkingCapitalSchedule["accounts_receivable", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("prepaid_expenses_and_other_current_assets", {
    cells: buildBsLine(
      prepHist,
      "Prepaid expenses & other current assets",
      'WorkingCapitalSchedule["prepaid_and_other_current", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_current_assets", {
    cells: { label: new Cell({ value: "Total current assets" }) },
    expr: 'SUM(@table["cash_and_equivalents".."prepaid_expenses_and_other_current_assets", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  bs.addRowGutter()
  bs.addSectionHeader("Non-current assets")
  bs.addRow("property_and_equipment_net", {
    cells: buildBsLine(
      ppeHist,
      "Property and equipment, net",
      'PpeSchedule["ending_net_ppe", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("operating_lease_rou_assets", {
    cells: buildBsLine(
      rouHist,
      "Operating lease right-of-use assets",
      '@table["operating_lease_rou_assets", col.prev]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("intangible_assets_net", {
    cells: buildBsLine(intangHist, "Intangible assets, net (legacy)", "0", {
      "2023A":
        "Reclassified into other non-current assets in FY2024 Form 10-K comparative presentation.",
    }),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("goodwill", {
    cells: buildBsLine(gwHist, "Goodwill", '@table["goodwill", col.prev]'),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("non_marketable_equity_investments", {
    cells: buildBsLine(
      nmEqHist,
      "Non-marketable equity investments",
      '@table["non_marketable_equity_investments", col.prev]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("other_assets", {
    cells: buildBsLine(
      othAssetHist,
      "Other non-current assets (incl. escrow)",
      '@table["other_assets", col.prev] - DebtHybridShareSchedule["escrow_cash_release", @col]',
      {
        "Q3 26A":
          "Includes $12,535M non-current restricted cash ($10.8B infrastructure escrow releasing $3.6B/yr in FY2028E–FY2030E).",
      }
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_assets", {
    cells: { label: new Cell({ value: "Total assets" }) },
    expr: '@table["total_current_assets", @col] + SUM(@table["property_and_equipment_net".."other_assets", @col])',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  bs.addRow("total_cash_and_mkt_sec", {
    cells: {
      label: new Cell({ value: "Memo: Unrestricted cash & marketable sec." }),
    },
    expr: '@table["cash_and_equivalents", @col] + @table["marketable_securities", @col]',
    format: "currency",
    decimals: 0,
  })

  // Liabilities
  bs.addRowGutter()
  bs.addSectionHeader("Current liabilities")
  bs.addRow("accounts_payable", {
    cells: buildBsLine(
      apHist,
      "Accounts payable",
      'WorkingCapitalSchedule["accounts_payable", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("partners_payable", {
    cells: buildBsLine(partHist, "Partners payable (legacy)", "0", {
      "2023A":
        "Reclassified into accrued expenses in FY2024 Form 10-K comparative presentation.",
    }),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("operating_lease_liabilities_current", {
    cells: buildBsLine(
      opLeaseCurHist,
      "Operating lease liabilities, current",
      '@table["operating_lease_liabilities_current", col.prev]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("accrued_expenses_and_other_current_liabilities", {
    cells: buildBsLine(
      accrHist,
      "Accrued expenses & other current liab.",
      'WorkingCapitalSchedule["operating_accrued_expenses", @col] + WorkingCapitalSchedule["legal_accruals_current", @col] + DebtHybridShareSchedule["current_portion_lt_debt", @col]',
      {
        "Q3 26A":
          "Includes operating accruals, isolated current legal accruals ($11,577M), and current portion of LT debt ($2,747M).",
      }
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("short_term_revolver", {
    cells: {
      label: new Cell({ value: "Short-term credit facility / revolver" }),
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "Q3 26A": 0,
      "2026E": new Cell({
        expr: 'DebtHybridShareSchedule["ending_revolver", "2026E"]',
      }),
      "2027E": new Cell({
        expr: 'DebtHybridShareSchedule["ending_revolver", "2027E"]',
      }),
      "2028E": new Cell({
        expr: 'DebtHybridShareSchedule["ending_revolver", "2028E"]',
      }),
      "2029E": new Cell({
        expr: 'DebtHybridShareSchedule["ending_revolver", "2029E"]',
      }),
      "2030E": new Cell({
        expr: 'DebtHybridShareSchedule["ending_revolver", "2030E"]',
      }),
      "2031E": new Cell({
        expr: 'DebtHybridShareSchedule["ending_revolver", "2031E"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_current_liabilities", {
    cells: { label: new Cell({ value: "Total current liabilities" }) },
    expr: 'SUM(@table["accounts_payable".."short_term_revolver", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  bs.addRowGutter()
  bs.addSectionHeader("Non-current liabilities")
  bs.addRow("operating_lease_liabilities_noncurrent", {
    cells: buildBsLine(
      opLeaseNcHist,
      "Operating lease liabilities, non-current",
      '@table["operating_lease_liabilities_noncurrent", col.prev]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("long_term_debt", {
    cells: buildBsLine(
      ltdHist,
      "Long-term debt (non-current carrying)",
      'DebtHybridShareSchedule["ending_long_term_debt", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("long_term_income_taxes", {
    cells: buildBsLine(
      ltTaxHist,
      "Long-term income taxes",
      '@table["long_term_income_taxes", col.prev]',
      {
        "2023A":
          "Broken out from other non-current liabilities starting in FY2023 comparative presentation.",
      }
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("other_liabilities", {
    cells: buildBsLine(
      othLiabHist,
      "Other non-current liabilities",
      '@table["other_liabilities", col.prev] + WorkingCapitalSchedule["cf_chg_legal_nc", @col]',
      {
        "Q3 26A":
          "Includes $8,304M non-current accrued legal liabilities (Form 10-Q Note 8).",
      }
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_liabilities", {
    cells: { label: new Cell({ value: "Total liabilities" }) },
    expr: '@table["total_current_liabilities", @col] + SUM(@table["operating_lease_liabilities_noncurrent".."other_liabilities", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Stockholders' Equity
  bs.addRowGutter()
  bs.addSectionHeader("Stockholders' equity")
  bs.addRow("mandatory_convertible_preferred", {
    cells: {
      label: new Cell({
        value: "Series A mandatory convertible preferred",
      }),
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "Q3 26A": 0,
      "2026E": new Cell({
        expr: 'DebtHybridShareSchedule["mcp_ending", "2026E"]',
      }),
      "2027E": new Cell({
        expr: 'DebtHybridShareSchedule["mcp_ending", "2027E"]',
      }),
      "2028E": new Cell({
        expr: 'DebtHybridShareSchedule["mcp_ending", "2028E"]',
      }),
      "2029E": new Cell({
        expr: 'DebtHybridShareSchedule["mcp_ending", "2029E"]',
      }),
      "2030E": new Cell({
        expr: 'DebtHybridShareSchedule["mcp_ending", "2030E"]',
      }),
      "2031E": new Cell({
        expr: 'DebtHybridShareSchedule["mcp_ending", "2031E"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })

  const apicCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Common stock & additional paid-in capital" }),
  }
  for (const p of BS_HIST_PERIODS) {
    apicCells[p] = apicHist[p]
  }
  apicCells["2026E"] = new Cell({
    expr: '@table["common_stock_and_apic", "Q3 26A"] + CashFlowStatement["share_based_compensation", "Q4 26E"] + CashFlowStatement["net_share_settlement_taxes", "Q4 26E"] + DebtHybridShareSchedule["fwd_equity_proceeds", "2026E"] - DebtHybridShareSchedule["mcp_conversion", "2026E"]',
  })
  for (const p of FORECAST_PERIODS) {
    apicCells[p] = new Cell({
      expr: '@table["common_stock_and_apic", col.prev] + CashFlowStatement["share_based_compensation", @col] + CashFlowStatement["net_share_settlement_taxes", @col] + DebtHybridShareSchedule["fwd_equity_proceeds", @col] - DebtHybridShareSchedule["mcp_conversion", @col]',
    })
  }
  bs.addRow("common_stock_and_apic", {
    cells: apicCells,
    format: "currency",
    decimals: 0,
  })

  bs.addRow("accumulated_other_comprehensive_income", {
    cells: buildBsLine(
      aociHist,
      "Accum. other comprehensive income (loss)",
      '@table["accumulated_other_comprehensive_income", col.prev]'
    ),
    format: "currency",
    decimals: 0,
  })

  const reCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Retained earnings" }),
  }
  for (const p of BS_HIST_PERIODS) {
    reCells[p] = reHist[p]
  }
  reCells["2026E"] = new Cell({
    expr: '@table["retained_earnings", "Q3 26A"] + IncomeStatement["net_income", "Q4 26E"] + CashFlowStatement["dividends_paid", "Q4 26E"] + CashFlowStatement["preferred_dividends_paid", "Q4 26E"] + CashFlowStatement["share_repurchases", "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    reCells[p] = new Cell({
      expr: '@table["retained_earnings", col.prev] + IncomeStatement["net_income", @col] + CashFlowStatement["dividends_paid", @col] + CashFlowStatement["preferred_dividends_paid", @col] + CashFlowStatement["share_repurchases", @col]',
    })
  }
  bs.addRow("retained_earnings", {
    cells: reCells,
    format: "currency",
    decimals: 0,
  })

  bs.addRow("total_stockholders_equity", {
    cells: { label: new Cell({ value: "Total stockholders' equity" }) },
    expr: 'SUM(@table["mandatory_convertible_preferred".."retained_earnings", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  bs.addRow("total_liabilities_and_equity", {
    cells: {
      label: new Cell({ value: "Total liabilities & stockholders' equity" }),
    },
    expr: '@table["total_liabilities", @col] + @table["total_stockholders_equity", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  bs.addRow("balance_check", {
    cells: {
      label: new Cell({ value: "Balance sheet check (Assets − L&E)" }),
    },
    expr: '@table["total_assets", @col] - @table["total_liabilities_and_equity", @col]',
    format: "currency",
    decimals: 2,
  })

  // =========================================================================
  // 3. Consolidated Statements of Cash Flows
  // =========================================================================
  const cf = sheet.addTable(
    "CashFlowStatement",
    "Consolidated Statements of Cash Flows",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Meta Platforms Form 10-K (FY2023–FY2025) & Form 10-Q (Q3 2026)",
      ],
    }
  )
  cf.addColumn("label", { role: "descriptor", header: "Cash Flow Line" })
  addTimelineColumns(cf, "flow")

  const cfHist = (
    rowId: string,
    opts?: {
      readonly zeroPeriods?: readonly FlowHistPeriod[]
      readonly defaultZero?: boolean
    }
  ): Readonly<Record<FlowHistPeriod, number>> =>
    data.flowSeries("cash_flow_statement", rowId, opts)

  const buildCfRow = (
    hist: Readonly<Record<FlowHistPeriod, number>>,
    label: string,
    q4Expr: string | number,
    fcstExpr: string | number,
    sparseNotes?: {
      readonly hist?: Readonly<Partial<Record<FlowHistPeriod, string>>>
      readonly q4Note?: string
    }
  ): Record<string, Cell | number> => {
    const out: Record<string, Cell | number> = {
      label: new Cell({ value: label }),
    }
    for (const p of FLOW_HIST_PERIODS) {
      const hNote = sparseNotes?.hist?.[p]
      out[p] =
        hNote !== undefined
          ? new Cell({ value: hist[p], note: hNote })
          : hist[p]
    }
    out["LTM Q3 26"] = new Cell({
      expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
    })
    out["Q4 26E"] =
      typeof q4Expr === "number"
        ? sparseNotes?.q4Note !== undefined
          ? new Cell({ value: q4Expr, note: sparseNotes.q4Note })
          : q4Expr
        : new Cell({ expr: q4Expr, note: sparseNotes?.q4Note })
    out["2026E"] = new Cell({
      expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
    })
    for (const p of FORECAST_PERIODS) {
      out[p] =
        typeof fcstExpr === "number" ? fcstExpr : new Cell({ expr: fcstExpr })
    }
    return out
  }

  // Operating Activities
  cf.addSectionHeader("Cash flows from operating activities")

  cf.addRow("net_income", {
    cells: buildCfRow(
      cfHist("net_income"),
      "Net income",
      'IncomeStatement["net_income", "Q4 26E"]',
      'IncomeStatement["net_income", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("depreciation_and_amortization", {
    cells: buildCfRow(
      cfHist("depreciation_and_amortization"),
      "Depreciation and amortization",
      'PpeSchedule["da_flow", "2026E"]',
      'PpeSchedule["da_flow", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("share_based_compensation", {
    cells: buildCfRow(
      cfHist("share_based_compensation"),
      "Share-based compensation",
      'SegmentBuild["sbc_total", "Q4 26E"]',
      'SegmentBuild["sbc_total", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("deferred_income_taxes", {
    cells: buildCfRow(
      cfHist("deferred_income_taxes"),
      "Deferred income taxes",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("impairment_facilities_consolidation", {
    cells: buildCfRow(
      cfHist("impairment_facilities_consolidation", { defaultZero: true }),
      "Impairment & facilities consolidation",
      0,
      0,
      {
        q4Note:
          "Completed historical restructuring line; zero in clean forecasts.",
      }
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("data_center_assets_abandonment", {
    cells: buildCfRow(
      cfHist("data_center_assets_abandonment", {
        zeroPeriods: ["2023A", "2024A", "2025A", "9M25A", "9M26A"],
        defaultZero: true,
      }),
      "Data center assets abandonment (legacy)",
      0,
      0,
      {
        hist: {
          "2023A":
            "2023 comparative reclassified into other operating adjustments in FY2025 Form 10-K.",
        },
      }
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("unrealized_gain_loss_equity_investments", {
    cells: buildCfRow(
      cfHist("unrealized_gain_loss_equity_investments", { defaultZero: true }),
      "Unrealized (gain) loss on equity inv.",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("other_operating_adjustments", {
    cells: buildCfRow(
      cfHist("other_operating_adjustments"),
      "Other operating adjustments",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("chg_accounts_receivable", {
    cells: buildCfRow(
      cfHist("chg_accounts_receivable"),
      "Change in accounts receivable",
      'WorkingCapitalSchedule["cf_chg_ar", "2026E"]',
      'WorkingCapitalSchedule["cf_chg_ar", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("chg_prepaid_and_other_current_assets", {
    cells: buildCfRow(
      cfHist("chg_prepaid_and_other_current_assets"),
      "Change in prepaid & other current assets",
      'WorkingCapitalSchedule["cf_chg_prepaid", "2026E"]',
      'WorkingCapitalSchedule["cf_chg_prepaid", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("chg_other_assets", {
    cells: buildCfRow(
      cfHist("chg_other_assets"),
      "Change in other assets",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("chg_accounts_payable", {
    cells: buildCfRow(
      cfHist("chg_accounts_payable"),
      "Change in accounts payable",
      'WorkingCapitalSchedule["cf_chg_ap", "2026E"]',
      'WorkingCapitalSchedule["cf_chg_ap", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("chg_partners_payable", {
    cells: buildCfRow(
      cfHist("chg_partners_payable", {
        zeroPeriods: ["2022A", "2023A", "2024A", "2025A", "9M25A", "9M26A"],
        defaultZero: true,
      }),
      "Change in partners payable (legacy)",
      0,
      0,
      {
        hist: {
          "2022A":
            "FY2022–FY2023 folded into accrued expenses in FY2024 Form 10-K comparative presentation.",
        },
      }
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("chg_accrued_expenses_and_other_current_liabilities", {
    cells: buildCfRow(
      cfHist("chg_accrued_expenses_and_other_current_liabilities"),
      "Change in accrued exp. & other cur. liab.",
      'WorkingCapitalSchedule["cf_chg_op_accr", "2026E"] + WorkingCapitalSchedule["cf_chg_legal_cur", "2026E"]',
      'WorkingCapitalSchedule["cf_chg_op_accr", @col] + WorkingCapitalSchedule["cf_chg_legal_cur", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("chg_other_liabilities", {
    cells: buildCfRow(
      cfHist("chg_other_liabilities"),
      "Change in other liabilities",
      'WorkingCapitalSchedule["cf_chg_legal_nc", "2026E"]',
      'WorkingCapitalSchedule["cf_chg_legal_nc", @col]'
    ),
    format: "currency",
    decimals: 0,
  })

  cf.addRow("cfo", {
    cells: {
      label: new Cell({ value: "Net cash provided by operating activities" }),
    },
    expr: 'SUM(@table["net_income".."chg_other_liabilities", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Investing Activities
  cf.addRowGutter()
  cf.addSectionHeader("Cash flows from investing activities")

  cf.addRow("capex_ppe", {
    cells: buildCfRow(
      cfHist("capex_ppe"),
      "Purchases of property and equipment",
      '-PpeSchedule["capex_ppe_additions", "2026E"]',
      '-PpeSchedule["capex_ppe_additions", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("proceeds_relating_to_ppe", {
    cells: buildCfRow(
      cfHist("proceeds_relating_to_ppe", {
        zeroPeriods: ["2022A", "2023A", "2024A", "2025A", "9M25A", "9M26A"],
        defaultZero: true,
      }),
      "Proceeds relating to PP&E (legacy)",
      0,
      0,
      {
        hist: {
          "2022A":
            "FY2022–FY2023 netted into purchases of PP&E in FY2024 Form 10-K comparative presentation.",
        },
      }
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("purchases_of_non_marketable_equity_investments", {
    cells: buildCfRow(
      cfHist("purchases_of_non_marketable_equity_investments", {
        defaultZero: true,
      }),
      "Purchases of non-marketable equity inv.",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("acquisitions_of_businesses_and_intangibles", {
    cells: buildCfRow(
      cfHist("acquisitions_of_businesses_and_intangibles"),
      "Acquisitions of businesses & intangibles",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("payments_for_held_for_sale_assets", {
    cells: buildCfRow(
      cfHist("payments_for_held_for_sale_assets", { defaultZero: true }),
      "Payments for held-for-sale assets",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("proceeds_from_venture_distribution", {
    cells: buildCfRow(
      cfHist("proceeds_from_venture_distribution", { defaultZero: true }),
      "Proceeds from venture distribution",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("other_investing_activities", {
    cells: buildCfRow(
      cfHist("other_investing_activities"),
      "Other investing activities",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("cfi_ex_mkt_sec", {
    cells: {
      label: new Cell({ value: "Investing cash flow (ex-mkt. securities)" }),
    },
    expr: 'SUM(@table["capex_ppe".."other_investing_activities", @col])',
    format: "currency",
    decimals: 0,
  })

  cf.addRow("purchases_of_marketable_securities", {
    cells: buildCfRow(
      cfHist("purchases_of_marketable_securities"),
      "Purchases of marketable securities",
      '-(BalanceSheet["marketable_securities", "2026E"] - BalanceSheet["marketable_securities", "Q3 26A"])',
      '-(BalanceSheet["marketable_securities", @col] - BalanceSheet["marketable_securities", col.prev])',
      {
        q4Note:
          "Forecast consolidates net marketable securities sweep above minimum operating cash buffer.",
      }
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("sales_and_maturities_of_marketable_securities", {
    cells: buildCfRow(
      cfHist("sales_and_maturities_of_marketable_securities"),
      "Sales & maturities of marketable securities",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("cfi", {
    cells: {
      label: new Cell({ value: "Net cash used in investing activities (CFI)" }),
    },
    expr: '@table["cfi_ex_mkt_sec", @col] + @table["purchases_of_marketable_securities", @col] + @table["sales_and_maturities_of_marketable_securities", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Financing Activities
  cf.addRowGutter()
  cf.addSectionHeader("Cash flows from financing activities")

  cf.addRow("net_share_settlement_taxes", {
    cells: buildCfRow(
      cfHist("net_share_settlement_taxes"),
      "Taxes paid on net share settlement of RSUs",
      '-@table["share_based_compensation", "Q4 26E"] * ScalarDrivers["netShareSettlementPctSbc", "active"]',
      '-@table["share_based_compensation", @col] * ScalarDrivers["netShareSettlementPctSbc", "active"]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("share_repurchases", {
    cells: buildCfRow(
      cfHist("share_repurchases"),
      "Repurchases of Class A common stock",
      0,
      '-VectorDriversActive["annualShareRepurchases", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("dividends_paid", {
    cells: buildCfRow(
      cfHist("dividends_paid", { defaultZero: true }),
      "Common dividends paid",
      '@table["dividends_paid", "9M26A"] / 3',
      '-(DebtHybridShareSchedule["avg_diluted_shares", @col] * VectorDriversActive["commonDividendPerShare", @col])'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("preferred_dividends_paid", {
    cells: buildCfRow(
      {
        "2021A": 0,
        "2022A": 0,
        "2023A": 0,
        "2024A": 0,
        "2025A": 0,
        "9M25A": 0,
        "9M26A": 0,
      },
      "Mandatory convertible preferred dividends",
      'DebtHybridShareSchedule["mcp_preferred_dividends", "2026E"]',
      'DebtHybridShareSchedule["mcp_preferred_dividends", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("debt_issuance_proceeds_net", {
    cells: buildCfRow(
      cfHist("debt_issuance_proceeds_net"),
      "Proceeds from issuance of LT debt, net",
      'DebtHybridShareSchedule["new_usd_notes", "2026E"] + DebtHybridShareSchedule["new_eur_notes_usd", "2026E"]',
      'DebtHybridShareSchedule["new_usd_notes", @col] + DebtHybridShareSchedule["new_eur_notes_usd", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("debt_maturities_repaid", {
    cells: buildCfRow(
      {
        "2021A": 0,
        "2022A": 0,
        "2023A": 0,
        "2024A": 0,
        "2025A": 0,
        "9M25A": 0,
        "9M26A": 0,
      },
      "Repayment of maturing senior notes",
      'DebtHybridShareSchedule["scheduled_maturities", "2026E"]',
      'DebtHybridShareSchedule["scheduled_maturities", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("mcp_preferred_issuance", {
    cells: buildCfRow(
      {
        "2021A": 0,
        "2022A": 0,
        "2023A": 0,
        "2024A": 0,
        "2025A": 0,
        "9M25A": 0,
        "9M26A": 0,
      },
      "Proceeds from mandatory conv. preferred",
      'DebtHybridShareSchedule["mcp_issuance", "2026E"]',
      'DebtHybridShareSchedule["mcp_issuance", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("fwd_equity_settlement_proceeds", {
    cells: buildCfRow(
      {
        "2021A": 0,
        "2022A": 0,
        "2023A": 0,
        "2024A": 0,
        "2025A": 0,
        "9M25A": 0,
        "9M26A": 0,
      },
      "Proceeds from forward stock settlement",
      'DebtHybridShareSchedule["fwd_equity_proceeds", "2026E"]',
      'DebtHybridShareSchedule["fwd_equity_proceeds", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("finance_lease_principal", {
    cells: buildCfRow(
      cfHist("finance_lease_principal"),
      "Principal payments on finance leases",
      '-PpeSchedule["finance_lease_capex", "2026E"]',
      '-PpeSchedule["finance_lease_capex", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("other_financing_activities", {
    cells: buildCfRow(
      cfHist("other_financing_activities"),
      "Other financing activities",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("cff_ex_revolver", {
    cells: { label: new Cell({ value: "Financing cash flow (ex-revolver)" }) },
    expr: 'SUM(@table["net_share_settlement_taxes".."other_financing_activities", @col])',
    format: "currency",
    decimals: 0,
  })
  cf.addRow("revolver_draw_repay", {
    cells: buildCfRow(
      {
        "2021A": 0,
        "2022A": 0,
        "2023A": 0,
        "2024A": 0,
        "2025A": 0,
        "9M25A": 0,
        "9M26A": 0,
      },
      "Short-term revolver draw / (repayment)",
      'DebtHybridShareSchedule["revolver_draw_repay", "2026E"]',
      'DebtHybridShareSchedule["revolver_draw_repay", @col]'
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("cff", {
    cells: {
      label: new Cell({ value: "Net cash from (used in) financing (CFF)" }),
    },
    expr: '@table["cff_ex_revolver", @col] + @table["revolver_draw_repay", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  cf.addRow("fx_effect_on_cash", {
    cells: buildCfRow(
      cfHist("fx_effect_on_cash"),
      "FX effect on cash & restricted cash",
      0,
      0
    ),
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // 4. Cash & Restricted Cash Reconciliation & Free Cash Flow Bridge
  // =========================================================================
  const cfReconFcf = sheet.addTable(
    "CashReconAndFcf",
    "Cash & Restricted Cash Reconciliation & Free Cash Flow Bridge",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Meta Platforms Form 10-K (FY2023–FY2025) & Form 10-Q (Q3 2026); cash tie-out & FCF bridge",
      ],
    }
  )
  cfReconFcf.addColumn("label", {
    role: "descriptor",
    header: "Cash Reconciliation / FCF Line",
  })
  addTimelineColumns(cfReconFcf, "flow")

  cfReconFcf.addSectionHeader("Cash & restricted cash reconciliation")

  cfReconFcf.addRow("net_change_in_cash", {
    cells: {
      label: new Cell({ value: "Net change in cash & restricted cash" }),
    },
    expr: 'CashFlowStatement["cfo", @col] + CashFlowStatement["cfi", @col] + CashFlowStatement["cff", @col] + CashFlowStatement["fx_effect_on_cash", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  const begCashHist = cfHist("cash_and_restricted_beginning")
  const endCashHist = cfHist("cash_and_restricted_ending")
  const endRestCurHist = cfHist("ending_restricted_cash_current")
  const endRestNcHist = cfHist("ending_restricted_cash_noncurrent")

  const begCashCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Beginning cash & restricted cash" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    begCashCells[p] = begCashHist[p]
  }
  begCashCells["LTM Q3 26"] = new Cell({
    expr: '@table["cash_and_restricted_ending", "9M25A"]',
  })
  begCashCells["Q4 26E"] = new Cell({
    expr: '@table["cash_and_restricted_ending", "9M26A"]',
  })
  begCashCells["2026E"] = new Cell({
    expr: '@table["cash_and_restricted_beginning", "9M26A"]',
  })
  for (const p of FORECAST_PERIODS) {
    begCashCells[p] = new Cell({
      expr: '@table["cash_and_restricted_ending", col.prev]',
    })
  }
  cfReconFcf.addRow("cash_and_restricted_beginning", {
    cells: begCashCells,
    format: "currency",
    decimals: 0,
  })

  const endCashCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Ending cash & restricted cash (calculated)" }),
  }
  for (const p of FLOW_ALL_PERIODS) {
    endCashCells[p] = new Cell({
      expr: '@table["cash_and_restricted_beginning", @col] + @table["net_change_in_cash", @col]',
    })
  }
  cfReconFcf.addRow("cash_and_restricted_ending", {
    cells: endCashCells,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  const restCurCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Memo: Ending restricted cash — current" }),
  }
  const restNcCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Memo: Ending restricted cash — non-current" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    restCurCells[p] = endRestCurHist[p]
    restNcCells[p] = endRestNcHist[p]
  }
  for (const p of ["LTM Q3 26", "Q4 26E", "2026E"] as const) {
    restCurCells[p] = new Cell({
      expr: '@table["ending_restricted_cur", "9M26A"]',
    })
    restNcCells[p] = new Cell({
      expr: '@table["ending_restricted_nc", "9M26A"]',
    })
  }
  for (const p of FORECAST_PERIODS) {
    restCurCells[p] = new Cell({
      expr: '@table["ending_restricted_cur", col.prev]',
    })
    restNcCells[p] = new Cell({
      expr: '@table["ending_restricted_nc", col.prev] - DebtHybridShareSchedule["escrow_cash_release", @col]',
    })
  }
  cfReconFcf.addRow("ending_restricted_cur", {
    cells: restCurCells,
    format: "currency",
    decimals: 0,
  })
  cfReconFcf.addRow("ending_restricted_nc", {
    cells: restNcCells,
    format: "currency",
    decimals: 0,
  })

  const auditedEndCashCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Balance sheet cash + restricted cash" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    auditedEndCashCells[p] = endCashHist[p]
  }
  auditedEndCashCells["LTM Q3 26"] = new Cell({
    expr: '@table["bs_cash_reconciled", "9M26A"]',
  })
  auditedEndCashCells["Q4 26E"] = new Cell({
    expr: 'BalanceSheet["cash_and_equivalents", "2026E"] + @table["ending_restricted_cur", "Q4 26E"] + @table["ending_restricted_nc", "Q4 26E"]',
  })
  auditedEndCashCells["2026E"] = new Cell({
    expr: 'BalanceSheet["cash_and_equivalents", "2026E"] + @table["ending_restricted_cur", "2026E"] + @table["ending_restricted_nc", "2026E"]',
  })
  for (const p of FORECAST_PERIODS) {
    auditedEndCashCells[p] = new Cell({
      expr: 'BalanceSheet["cash_and_equivalents", @col] + @table["ending_restricted_cur", @col] + @table["ending_restricted_nc", @col]',
    })
  }
  cfReconFcf.addRow("bs_cash_reconciled", {
    cells: auditedEndCashCells,
    format: "currency",
    decimals: 0,
  })

  cfReconFcf.addRow("cash_tie_check", {
    cells: {
      label: new Cell({ value: "Cash tie-out check (CFS − BS cash)" }),
    },
    expr: '@table["cash_and_restricted_ending", @col] - @table["bs_cash_reconciled", @col]',
    format: "currency",
    decimals: 2,
  })

  // Free Cash Flow Diagnostics
  cfReconFcf.addRowGutter()
  cfReconFcf.addSectionHeader(
    "Free cash flow metrics (reported vs. economic after SBC)"
  )

  cfReconFcf.addRow("total_capex_outflow", {
    cells: {
      label: new Cell({ value: "Total CapEx (PP&E + finance leases)" }),
    },
    expr: 'CashFlowStatement["capex_ppe", @col] + CashFlowStatement["finance_lease_principal", @col]',
    format: "currency",
    decimals: 0,
  })
  cfReconFcf.addRow("reported_fcf", {
    cells: {
      label: new Cell({ value: "Reported free cash flow (CFO − CapEx)" }),
    },
    expr: 'CashFlowStatement["cfo", @col] + @table["total_capex_outflow", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  cfReconFcf.addRow("economic_fcf_after_sbc", {
    cells: {
      label: new Cell({ value: "Economic FCF after SBC (FCF − SBC)" }),
    },
    expr: '@table["reported_fcf", @col] - CashFlowStatement["share_based_compensation", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  sheet.setBands([
    is,
    { lanes: [bs], pageBreakBefore: true },
    { lanes: [cf], pageBreakBefore: true },
    { lanes: [cfReconFcf], pageBreakBefore: true },
  ])
}
