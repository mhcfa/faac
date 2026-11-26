import type { Sheet, Table } from "f8-engine"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  notedNull,
  rowFormatOptions,
} from "../timeline.ts"

export function buildRoicSchedule(sheet: Sheet): Table {
  const table = sheet.addTable(
    "InvestedCapitalROIC",
    "Two-Sided Invested Capital, NOPAT, Unlevered FCFF & ROIC ($M)",
    {
      subtitle: [
        "Ex-operating-lease basis: Operating Invested Capital equals Financing Invested Capital across FY22A–FY36E ($M / %)",
        "Unlevered FCFF = NOPAT minus net reinvestment (operating leases netted symmetrically; SBC retained inside EBIT and NOPAT)",
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Invested capital & ROIC ($M)",
  })

  table.addSectionHeader("Operating invested capital (asset side)")
  table.addRow("op_nwc", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["op_nwc", @col]',
    cells: { line_item: "Net operating working capital" },
  })
  table.addRow("ppe_net", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["ppe_net", @col]',
    cells: { line_item: "Property and equipment, net" },
  })
  table.addRow("net_op_lease_assets", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["operating_lease_rou_assets", @col] - LeasesInterestSchedule["total_op_lease_liab", @col]',
    cells: { line_item: "Net op. lease (ROU − liab.)" },
  })
  table.addRow("net_other_lt_op_assets", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["net_other_lt_op_assets", @col]',
    cells: { line_item: "Net other LT operating assets" },
  })
  table.addRow("operating_ic", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: 'SUM(@table["op_nwc".."net_other_lt_op_assets", @col])',
    cells: { line_item: "Operating invested capital" },
  })
  table.addRow("non_ppe_ic", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["operating_ic", @col] - @table["ppe_net", @col]',
    cells: { line_item: "Memo: Non-PP&E operating IC" },
  })

  table.addRowGutter()
  table.addSectionHeader("Financing invested capital (capital side)")
  table.addRow("total_debt_incl_current", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtSchedule["total_lt_debt_carrying", @col] + DebtSchedule["revolver_end", @col]',
    cells: { line_item: "Total carrying financial debt" },
  })
  table.addRow("finance_lease_liabilities", {
    ...rowFormatOptions("currency", 0),
    expr: 'LeasesInterestSchedule["total_fin_lease_liab", @col]',
    cells: { line_item: "Finance lease liabilities" },
  })
  table.addRow("total_equity", {
    ...rowFormatOptions("currency", 0),
    expr: 'BalanceSheet["total_equity", @col]',
    cells: { line_item: "Total stockholders' equity" },
  })
  table.addRow("less_cash_and_sti", {
    ...rowFormatOptions("currency", 0),
    expr: '-(BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["short_term_investments", @col])',
    cells: { line_item: "(−) Cash and short-term inv." },
  })
  table.addRow("financing_ic", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: 'SUM(@table["total_debt_incl_current".."less_cash_and_sti", @col])',
    cells: { line_item: "Financing invested capital" },
  })
  table.addRow("ic_tie_out_check", {
    ...rowFormatOptions("currency", 4),
    style: "bold",
    highlight: true,
    expr: '@table["operating_ic", @col] - @table["financing_ic", @col]',
    cells: { line_item: "IC tie-out (Operating − Fin.)" },
  })

  table.addRowGutter()
  table.addSectionHeader("NOPAT, net reinvestment, unlevered FCFF and ROIC")
  table.addRow("ebit", {
    ...rowFormatOptions("currency", 0),
    expr: 'IncomeStatement["operating_income", @col]',
    cells: { line_item: "Operating income (EBIT)" },
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
    cells: { line_item: "NOPAT" },
  })
  table.addRow("net_reinvestment", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Net reinvestment (change in IC)",
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
      line_item: "Unlevered free cash flow (FCFF)",
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
    expr: 'OperatingMarginSchedule["sbc_expense", @col] * (1 - @table["tax_rate_applied", @col])',
    cells: { line_item: "Memo: After-tax SBC in NOPAT" },
  })
  table.addRow("unlevered_fcff_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Unlevered FCFF ex-SBC",
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
      line_item: "Average invested capital",
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
    style: "bold",
    cells: {
      line_item: "ROIC (NOPAT / avg. IC)",
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
      line_item: "Reinvestment rate (dIC / NOPAT)",
      FY22: null,
      ...Object.fromEntries(
        HISTORICAL_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["net_reinvestment", @col] / @table["nopat", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'IF(@table["nopat", @col] > 0, @table["net_reinvestment", @col] / @table["nopat", @col], NA())',
          },
        ])
      ),
    },
  })
  table.addRow("ronic", {
    ...rowFormatOptions("percentage", 1),
    style: "bold",
    cells: {
      line_item: "Incremental ROIC (RONIC)",
      FY22: null,
      FY23: null,
      FY24: notedNull(
        "Omitted as non-meaningful due to negative FY23 net reinvestment (-$69M inventory draw and charter shipping impairment)."
      ),
      ...Object.fromEntries(
        HISTORICAL_PERIODS.slice(3).map((p) => [
          p,
          {
            expr: '(@table["nopat", @col] - @table["nopat", col.prev]) / @table["net_reinvestment", col.prev]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'IF(@table["net_reinvestment", col.prev] > 0, (@table["nopat", @col] - @table["nopat", col.prev]) / @table["net_reinvestment", col.prev], NA())',
          },
        ])
      ),
    },
  })
  table.addRow("fcff_ebitda_conversion", {
    ...rowFormatOptions("percentage", 1),
    style: "bold",
    cells: {
      line_item: "Cash conversion (FCFF / EBITDA)",
      FY22: null,
      ...Object.fromEntries(
        HISTORICAL_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["unlevered_fcff", @col] / IncomeStatement["ebitda", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'IF(IncomeStatement["ebitda", @col] > 0, @table["unlevered_fcff", @col] / IncomeStatement["ebitda", @col], NA())',
          },
        ])
      ),
    },
  })
  table.addRow("roic_wacc_spread", {
    ...rowFormatOptions("percentage", 1),
    style: "bold",
    cells: {
      line_item: "Economic spread (ROIC − WACC)",
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
