import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  buildHistoricalCellMap,
  rowFormatOptions,
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
        "FY22–FY26 audited GAAP historicals; FY27E–FY36E linked to Operating, Debt & Leases, and Share & Equity schedules ($M except per-share)",
        `Source: ${kg.citations.incomeStatement}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Income Statement Line ($M except EPS/DPS)",
  })

  const is = kg.cost.incomeStatement

  table.addSectionHeader("Revenue & Operating Income")
  table.addRow("net_sales", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingSchedule["net_sales", @col]',
    cells: { line_item: "Net sales" },
  })
  table.addRow("membership_fees", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingSchedule["membership_fees", @col]',
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
    expr: 'OperatingSchedule["merchandise_costs", @col]',
    cells: { line_item: "Merchandise costs" },
  })
  table.addRow("merch_gross_profit", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["net_sales", @col] - @table["merchandise_costs", @col]',
    cells: { line_item: "Memo: Merchandise gross profit" },
  })
  table.addRow("sga", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingSchedule["sga", @col]',
    cells: { line_item: "Selling, general and administrative" },
  })
  table.addRow("operating_income", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["total_revenue", @col] - @table["merchandise_costs", @col] - @table["sga", @col]',
    cells: { line_item: "Operating income (EBIT)" },
  })
  table.addRow("operating_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["operating_income", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Operating margin (%)" },
  })

  table.addSectionHeader("Non-Operating Items, Taxes & Net Income")
  table.addRow("interest_expense", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["total_interest_expense", @col]',
    cells: { line_item: "Interest expense" },
  })
  table.addRow("interest_income", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["interest_income", @col]',
    cells: { line_item: "Interest income" },
  })
  table.addRow("fx_gains_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Foreign-currency transaction gains (losses), net",
        is.fxGainsNet,
        "10-K Note 1 non-operating FX transaction gains/losses; forecast combined on fx_and_other_non_op."
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, 0])),
    },
  })
  table.addRow("other_non_op_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other non-operating income (expense), net",
        is.otherNonOpNet,
        "10-K Note 1 miscellaneous non-operating items; forecast combined on fx_and_other_non_op."
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, 0])),
    },
  })
  table.addRow("fx_and_other_non_op", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FX transaction gains & other non-operating, net",
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
          { expr: 'ScalarAssumptionsActive["fx_other_non_op", "val"]' },
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
    cells: { line_item: "Income before income taxes (EBT)" },
  })
  table.addRow("tax_provision", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Provision for income taxes", is.taxProvision),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'MAX(0, @table["ebt", @col] * PeriodAssumptionsActive["effective_tax_rate", @col])',
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
    cells: { line_item: "Net income including noncontrolling interests" },
  })
  table.addRow("net_income_attr_nci", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Less: Net income attributable to noncontrolling interests",
        is.netIncomeAttrNci,
        "Taiwan JV buyout completed Jun 2022; zero NCI from FY23 onward."
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, 0])),
    },
  })
  table.addRow("net_income_attr_costco", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["net_income_incl_nci", @col] - @table["net_income_attr_nci", @col]',
    cells: { line_item: "Net income attributable to Costco" },
  })

  table.addSectionHeader("Per-Share & EBITDA Memo")
  table.addRow("wavg_diluted_shares", {
    ...rowFormatOptions("number", 3),
    expr: 'ShareEquitySchedule["wavg_diluted_shares", @col]',
    cells: { line_item: "Weighted-average diluted shares (M)" },
  })
  table.addRow("diluted_eps", {
    ...rowFormatOptions("currency", 2),
    expr: '@table["net_income_attr_costco", @col] / @table["wavg_diluted_shares", @col]',
    cells: {
      line_item: {
        value: "Diluted EPS (computed NI / wavg diluted shares)",
        note: "Historical 10-K rounded EPS: FY22 $13.14, FY23 $14.16, FY24 $16.56, FY25 $18.21, FY26 $20.76.",
      },
    },
  })
  table.addRow("regular_dps", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: {
        value: "Regular annual dividend declared per share ($/sh)",
        note: "FY22–FY26 derived via live formula from audited cash dividends declared (excl. FY24 $6,655M special div) / wavg basic shares; FY27E anchored to Oct 2026 $1.47/qtr ($5.88 annualized).",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '(-ShareEquitySchedule["cash_dividends_declared_hist", @col] - ShareEquitySchedule["special_dividend_paid", @col]) / ShareEquitySchedule["wavg_basic_shares", @col]',
          },
        ])
      ),
      FY27E: { expr: 'MarketAnchors["cost_reg_dps_annualized", "val"]' },
      ...Object.fromEntries(
        FORECAST_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["regular_dps", col.prev] * (1 + ScalarAssumptionsActive["regular_dps_growth", "val"])',
          },
        ])
      ),
    },
  })
  table.addRow("special_dps", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Special cash dividend per share ($/sh)",
      FY22: 0,
      FY23: 0,
      FY24: kg.cost.qoe.fy24SpecialDivPs,
      FY25: 0,
      FY26: 0,
      FY27E: {
        expr: 'ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]',
      },
      ...Object.fromEntries(FORECAST_PERIODS.slice(1).map((p) => [p, 0])),
    },
  })
  table.addRow("da_memo", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingSchedule["da", @col]',
    cells: { line_item: "Memo: Depreciation & Amortization" },
  })
  table.addRow("ebitda", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["operating_income", @col] + @table["da_memo", @col]',
    cells: { line_item: "Memo: EBITDA" },
  })
  table.addRow("ebitda_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["ebitda", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Memo: EBITDA margin (%)" },
  })

  return table
}
