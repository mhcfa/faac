import type { Sheet, Table } from "f8-engine"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  rowFormatOptions,
} from "../timeline.ts"

export function buildRoicSchedule(sheet: Sheet, belowTarget?: Table): Table {
  const table = sheet.addTable(
    "InvestedCapitalROIC",
    "Two-Sided Invested Capital, NOPAT, Unlevered FCFF & ROIC / RONIC ($M)",
    {
      subtitle: [
        "Exact two-sided Operating IC = Financing IC identity across all 15 years (FY22–FY36E, $M)",
        "Unlevered FCFF = NOPAT - Net Reinvestment (SBC retained as an operating cost inside GAAP EBIT & NOPAT)",
      ],
      currency: "USD",
      ...(belowTarget ? { below: belowTarget } : {}),
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Invested Capital / Return Metric ($M / %)",
  })

  table.addSectionHeader("1. Operating Invested Capital (Asset Side)")
  table.addRow("op_nwc", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["op_nwc", @col]',
    cells: { line_item: "Net Operating Working Capital (OpNWC)" },
  })
  table.addRow("ppe_net", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["ppe_net", @col]',
    cells: { line_item: "Property and equipment, net" },
  })
  table.addRow("op_lease_rou_assets", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["operating_lease_rou_assets", @col]',
    cells: { line_item: "Operating lease right-of-use assets" },
  })
  table.addRow("net_other_lt_op_assets", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["net_other_lt_op_assets", @col]',
    cells: {
      line_item: "Other LT assets less non-lease LT operating liabilities",
    },
  })
  table.addRow("operating_ic", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: 'SUM(@table["op_nwc".."net_other_lt_op_assets", @col])',
    cells: { line_item: "Operating Invested Capital (Asset Side)" },
  })

  table.addSectionHeader("2. Financing Invested Capital (Capital Side)")
  table.addRow("total_debt_incl_current", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["total_lt_debt_carrying", @col] + DebtLeasesSchedule["revolver_end", @col]',
    cells: {
      line_item: "Total Debt (current + LT carrying + ST revolver)",
    },
  })
  table.addRow("finance_lease_liabilities", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["total_fin_lease_liab", @col]',
    cells: { line_item: "Finance lease liabilities (current + LT)" },
  })
  table.addRow("operating_lease_liabilities", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["total_op_lease_liab", @col]',
    cells: { line_item: "Operating lease liabilities (current + LT)" },
  })
  table.addRow("total_equity", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["total_equity", @col]',
    cells: { line_item: "Total stockholders' equity" },
  })
  table.addRow("less_cash_and_sti", {
    ...rowFormatOptions("currency", 0),
    expr: '-(BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["short_term_investments", @col])',
    cells: {
      line_item: "Less: Cash, cash equivalents & short-term investments",
    },
  })
  table.addRow("financing_ic", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: 'SUM(@table["total_debt_incl_current".."less_cash_and_sti", @col])',
    cells: { line_item: "Financing Invested Capital (Capital Side)" },
  })
  table.addRow("ic_tie_out_check", {
    ...rowFormatOptions("currency", 4),
    highlight: true,
    expr: '@table["operating_ic", @col] - @table["financing_ic", @col]',
    cells: {
      line_item: "Two-Sided IC Check (Operating IC - Financing IC = 0)",
    },
  })

  table.addSectionHeader("3. NOPAT, Net Reinvestment, Unlevered FCFF & ROIC")
  table.addRow("ebit", {
    ...rowFormatOptions("currency", 0),
    expr: 'IncomeStatement["operating_income", @col]',
    cells: { line_item: "Operating Income (EBIT, post-SBC)" },
  })
  table.addRow("tax_rate_applied", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Applied tax rate on EBIT",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: 'IncomeStatement["effective_tax_rate", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'PeriodAssumptionsActive["effective_tax_rate", @col]' },
        ])
      ),
    },
  })
  table.addRow("nopat", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["ebit", @col] * (1 - @table["tax_rate_applied", @col])',
    cells: { line_item: "Net Operating Profit After Tax (NOPAT)" },
  })
  table.addRow("net_reinvestment", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item:
        "Net Reinvestment = CapEx - D&A + dOpNWC + dOpROU + dNetLTAssets (= dOperating IC)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["operating_ic", @col] - @table["operating_ic", col.prev]',
          },
        ])
      ),
    },
  })
  table.addRow("unlevered_fcff", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    cells: {
      line_item: "Unlevered Free Cash Flow (FCFF = NOPAT - Net Reinvestment)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: '@table["nopat", @col] - @table["net_reinvestment", @col]' },
        ])
      ),
    },
  })
  table.addRow("sbc_after_tax_memo", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingSchedule["sbc_expense", @col] * (1 - @table["tax_rate_applied", @col])',
    cells: { line_item: "Memo: After-tax SBC expense inside EBIT/NOPAT" },
  })
  table.addRow("unlevered_fcff_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Unlevered FCFF ex-SBC (non-GAAP sensitivity)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff", @col] + @table["sbc_after_tax_memo", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("avg_invested_capital", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Average Invested Capital",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["operating_ic", col.prev] + @table["operating_ic", @col]) / 2',
          },
        ])
      ),
    },
  })
  table.addRow("roic", {
    ...rowFormatOptions("percentage", 1),
    style: "subtotal",
    cells: {
      line_item: "Return on Invested Capital (ROIC = NOPAT / Avg IC)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["nopat", @col] / @table["avg_invested_capital", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("reinvestment_rate", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Reinvestment Rate (Net Reinvestment / NOPAT)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["net_reinvestment", @col] / @table["nopat", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("ronic", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: {
        value:
          "Incremental ROIC (RONIC = dNOPAT / Prior-Year Net Reinvestment)",
        note: "FY24 omitted as non-meaningful due to FY23 negative reinvestment (-$144M post-COVID inventory draw & charter shipping impairment).",
      },
      FY22: null,
      FY23: null,
      FY24: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(3), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["nopat", @col] - @table["nopat", col.prev]) / @table["net_reinvestment", col.prev]',
          },
        ])
      ),
    },
  })
  table.addRow("fcff_ebitda_conversion", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Unlevered Cash Conversion (FCFF / EBITDA)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff", @col] / IncomeStatement["ebitda", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("roic_wacc_spread", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Economic Value Spread (ROIC - Active WACC)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: '@table["roic", @col] - WaccSchedule["wacc", "val"]' },
        ])
      ),
    },
  })

  return table
}
