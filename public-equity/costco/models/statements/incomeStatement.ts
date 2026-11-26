import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  buildHistoricalCellMap,
  rowFormatOptions,
  zeroForecastCells,
} from "../timeline.ts"

export function buildIncomeStatement(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const table = sheet.addTable(
    "IncomeStatement",
    "Consolidated Statements of Income ($M except per-share)",
    {
      subtitle: [
        "FY22A–FY26A audited GAAP historicals; FY27E–FY36E integrated operating, interest, tax, and share projections ($M except per-share)",
        `Source: ${kg.citations.incomeStatement}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Income statement ($M / $/sh)",
  })

  const is = kg.cost.incomeStatement

  table.addSectionHeader("Revenue and operating income")
  table.addRow("net_sales", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingVolumeSchedule["net_sales", @col]',
    cells: { line_item: "Net sales" },
  })
  table.addRow("membership_fees", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingMarginSchedule["membership_fees", @col]',
    cells: { line_item: "Membership fees" },
  })
  table.addRow("total_revenue", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["net_sales", @col] + @table["membership_fees", @col]',
    cells: { line_item: "Total revenue" },
  })
  table.addRow("merchandise_costs", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingMarginSchedule["merchandise_costs", @col]',
    cells: { line_item: "Merchandise costs" },
  })
  table.addRow("merch_gross_profit", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["net_sales", @col] - @table["merchandise_costs", @col]',
    cells: { line_item: "Memo: Merchandise gross profit" },
  })
  table.addRow("sga", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingMarginSchedule["sga", @col]',
    cells: { line_item: "Selling, general & admin." },
  })
  table.addRow("operating_income", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["total_revenue", @col] - @table["merchandise_costs", @col] - @table["sga", @col]',
    cells: { line_item: "Operating income (EBIT)" },
  })
  table.addRow("operating_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["operating_income", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Operating margin (%)" },
  })

  table.addRowGutter()
  table.addSectionHeader("Non-operating items, taxes and net income")
  table.addRow("interest_expense", {
    ...rowFormatOptions("currency", 0),
    expr: 'LeasesInterestSchedule["total_interest_expense", @col]',
    cells: { line_item: "Interest expense" },
  })
  table.addRow("interest_income", {
    ...rowFormatOptions("currency", 0),
    expr: 'LeasesInterestSchedule["interest_income", @col]',
    cells: { line_item: "Interest income" },
  })
  table.addRow("fx_gains_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("FX gains (losses), net", is.fxGainsNet),
      ...zeroForecastCells(
        "Forecast foreign-currency and miscellaneous non-operating items combined on the net line below."
      ),
    },
  })
  table.addRow("other_non_op_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Other non-operating, net", is.otherNonOpNet),
      ...zeroForecastCells(
        "Forecast miscellaneous non-operating items combined on the net line below."
      ),
    },
  })
  table.addRow("fx_and_other_non_op", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FX and other non-operating, net",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["fx_gains_net", @col] + @table["other_non_op_net", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'ScalarAssumptionsOperating["fx_other_non_op", "val"]' },
        ])
      ),
    },
  })
  table.addRow("interest_income_and_other_net", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["interest_income", @col] + @table["fx_and_other_non_op", @col]',
    cells: { line_item: "Interest income and other, net" },
  })
  table.addRow("ebt", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["operating_income", @col] - @table["interest_expense", @col] + @table["interest_income_and_other_net", @col]',
    cells: { line_item: "Income before income taxes" },
  })
  table.addRow("esop_special_div_tax_benefit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: ESOP spec.-div. tax shield",
      FY22: 0,
      FY23: 0,
      FY24: {
        expr: 'MarketAnchorsMarket["fy24_esop_tax_benefit", "val"]',
        note: "FY24 discrete 401(k)/ESOP tax benefit on $15/sh special dividend (embedded in FY24 GAAP tax provision).",
      },
      FY25: 0,
      FY26: 0,
      FY27E: {
        expr: '(MarketAnchorsMarket["fy24_esop_tax_benefit", "val"] / MarketAnchorsMarket["fy24_special_div_total", "val"]) * ShareEquitySchedule["special_dividend_paid", "FY27E"]',
        note: "One-time IRC Sec. 404(k) ESOP tax shield on FY27E special dividend; applied to GAAP tax/CFO only (excluded from unlevered NOPAT and FCFF).",
      },
      ...Object.fromEntries(FORECAST_PERIODS.slice(1).map((p) => [p, 0])),
    },
  })
  table.addRow("tax_provision", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Provision for income taxes", is.taxProvision),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'MAX(0, @table["ebt", @col] * PeriodAssumptionsActive["effective_tax_rate", @col] - @table["esop_special_div_tax_benefit", @col])',
          },
        ])
      ),
    },
  })
  table.addRow("effective_tax_rate", {
    ...rowFormatOptions("percentage", 1),
    expr: 'IF(@table["ebt", @col] > 0, @table["tax_provision", @col] / @table["ebt", @col], NA())',
    cells: { line_item: "Effective tax rate (%)" },
  })
  table.addRow("net_income_incl_nci", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["ebt", @col] - @table["tax_provision", @col]',
    cells: { line_item: "Net income incl. NCI" },
  })
  table.addRow("net_income_attr_nci", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Less: Net income attr. to NCI",
        is.netIncomeAttrNci
      ),
      ...zeroForecastCells(
        "Taiwan joint venture buyout completed in June 2022; zero noncontrolling interest thereafter."
      ),
    },
  })
  table.addRow("net_income_attr_costco", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["net_income_incl_nci", @col] - @table["net_income_attr_nci", @col]',
    cells: { line_item: "Net income attr. to Costco" },
  })

  table.addRowGutter()
  table.addSectionHeader("Per-share and EBITDA memo")
  table.addRow("wavg_diluted_shares", {
    ...rowFormatOptions("number", 3),
    expr: 'ShareEquitySchedule["wavg_diluted_shares", @col]',
    cells: { line_item: "Weighted-avg. diluted shares (M)" },
  })
  table.addRow("diluted_eps", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    expr: '@table["net_income_attr_costco", @col] / @table["wavg_diluted_shares", @col]',
    cells: { line_item: "Diluted EPS ($/sh)" },
  })
  table.addRow("regular_dps", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Regular annual DPS ($/sh)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '(-ShareEquitySchedule["cash_dividends_declared_hist", @col] - ShareEquitySchedule["special_dividend_paid", @col]) / ShareEquitySchedule["wavg_basic_shares", @col]',
          },
        ])
      ),
      FY27E: {
        expr: 'MarketAnchorsMarket["cost_reg_dps_annualized", "val"]',
        note: "Anchored to Oct 14, 2026 regular quarterly dividend annualized over four quarters.",
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["regular_dps", col.prev] * (1 + ScalarAssumptionsValuation["regular_dps_growth", "val"])',
          },
        ])
      ),
    },
  })
  table.addRow("special_dps", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Special cash dividend ($/sh)",
      FY22: 0,
      FY23: 0,
      FY24: {
        value: kg.cost.qoe.fy24SpecialDivPs,
        note: "FY24 special cash dividend ($15.00/sh paid Jan 2024).",
      },
      FY25: 0,
      FY26: 0,
      FY27E: {
        expr: 'ScalarAssumptionsValuation["special_dividend_ps_fy27", "val"]',
        note: "Declared Nov 10, 2026 special cash dividend (ex-date Nov 24, payable Dec 4, 2026).",
      },
      ...Object.fromEntries(FORECAST_PERIODS.slice(1).map((p) => [p, 0])),
    },
  })
  table.addRow("da_memo", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingMarginSchedule["da", @col]',
    cells: { line_item: "Memo: D&A" },
  })
  table.addRow("ebitda", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["operating_income", @col] + @table["da_memo", @col]',
    cells: { line_item: "Memo: EBITDA" },
  })
  table.addRow("ebitda_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["ebitda", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Memo: EBITDA margin (%)" },
  })

  return table
}
