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

export function buildCashFlowStatement(
  sheet: Sheet,
  kg: CostcoKnowledgeData,
  belowTarget?: Table
): Table {
  const table = sheet.addTable(
    "CashFlowStatement",
    "Consolidated Statements of Cash Flows ($M)",
    {
      subtitle: [
        "FY22A–FY26A audited GAAP historicals; FY27E–FY36E reconciles working capital, CapEx, debt maturities, and capital returns ($M)",
        `Source: ${kg.citations.cashFlow}`,
      ],
      currency: "USD",
      ...(belowTarget ? { below: belowTarget } : {}),
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Cash flow ($M)",
  })

  const cf = kg.cost.cashFlow

  table.addSectionHeader("Operating activities (CFO)")
  table.addRow("net_income_incl_nci", {
    ...rowFormatOptions("currency", 0),
    expr: 'IncomeStatement["net_income_incl_nci", @col]',
    cells: { line_item: "Net income incl. NCI" },
  })
  table.addRow("depreciation_and_amortization", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["da", @col]',
    cells: { line_item: "Depreciation and amortization" },
  })
  table.addRow("stock_based_compensation", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingSchedule["sbc_expense", @col]',
    cells: { line_item: "Stock-based compensation" },
  })
  table.addRow("non_cash_lease_expense", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Non-cash lease expense",
        cf.nonCashLeaseExpense
      ),
      ...zeroForecastCells(
        "Forecast operating lease cash effects captured net on the operating lease line below."
      ),
    },
  })
  table.addRow("deferred_income_taxes", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Deferred income taxes",
        cf.deferredIncomeTaxes
      ),
      ...zeroForecastCells(
        "Forecast deferred tax timing differences assumed zero."
      ),
    },
  })
  table.addRow("other_non_cash_operating", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other non-cash operating & amort.",
        cf.otherNonCashOperating
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'DebtLeasesSchedule["discount_amortization", @col]' },
        ])
      ),
    },
  })
  table.addRow("change_inventories", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Change in inventories", cf.changeInventories),
      ...zeroForecastCells(
        "Forecast working capital changes consolidated on the net operating NWC line below."
      ),
    },
  })
  table.addRow("change_accounts_payable", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Change in accounts payable",
        cf.changeAccountsPayable
      ),
      ...zeroForecastCells(
        "Forecast payables changes consolidated on the net operating NWC line below."
      ),
    },
  })
  table.addRow("change_other_op_assets_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Change in other op. working cap.",
        cf.changeOtherOpAssetsLiab
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '-WorkingCapitalPPE["change_in_op_nwc", @col]' },
        ])
      ),
    },
  })
  table.addRow("change_op_leases_and_lt_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Change in op. leases & LT items",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '(DebtLeasesSchedule["total_op_lease_liab", @col] - DebtLeasesSchedule["total_op_lease_liab", col.prev]) - (WorkingCapitalPPE["op_lease_rou_assets", @col] - WorkingCapitalPPE["op_lease_rou_assets", col.prev]) - (WorkingCapitalPPE["net_other_lt_op_assets", @col] - WorkingCapitalPPE["net_other_lt_op_assets", col.prev] - DebtLeasesSchedule["new_fin_lease_additions", @col])',
          },
        ])
      ),
    },
  })
  table.addRow("cfo", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["net_income_incl_nci".."change_op_leases_and_lt_net", @col])',
    cells: { line_item: "Operating cash flow (CFO)" },
  })

  table.addRowGutter()
  table.addSectionHeader("Investing activities (CFI)")
  table.addRow("capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Additions to PP&E (CapEx)", cf.capex),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '-WorkingCapitalPPE["capex", @col]' },
        ])
      ),
    },
  })
  table.addRow("purchases_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Purchases of STI",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, cf.purchasesSti[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '-MAX(0, BalanceSheet["short_term_investments", @col] - BalanceSheet["short_term_investments", col.prev])',
          },
        ])
      ),
    },
  })
  table.addRow("maturities_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Maturities and sales of STI",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, cf.maturitiesSti[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'MAX(0, BalanceSheet["short_term_investments", col.prev] - BalanceSheet["short_term_investments", @col])',
          },
        ])
      ),
    },
  })
  table.addRow("other_investing", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other investing activities, net",
        cf.otherInvesting
      ),
      ...zeroForecastCells(
        "No unannounced M&A or other investing outflows modeled."
      ),
    },
  })
  table.addRow("cfi", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["capex".."other_investing", @col])',
    cells: { line_item: "Investing cash flow (CFI)" },
  })

  table.addRowGutter()
  table.addSectionHeader("Financing activities (CFF)")
  table.addRow("repayments_lt_debt", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Repayments of long-term debt",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, cf.repaymentsLtDebt[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '-DebtLeasesSchedule["scheduled_lt_debt_repayments", @col]' },
        ])
      ),
    },
  })
  table.addRow("proceeds_lt_debt", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Proceeds from long-term debt",
        cf.proceedsLtDebt
      ),
      ...zeroForecastCells(
        "Contractual maturities retired from operating cash without new bond issuance."
      ),
    },
  })
  table.addRow("tax_withholdings_sbc", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Tax withholdings on SBC",
        cf.taxWithholdingsSbc
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '-ShareEquitySchedule["rsu_tax_withholdings", @col]' },
        ])
      ),
    },
  })
  table.addRow("repurchases_common_stock", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Repurchases of common stock",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, cf.repurchasesCommonStock[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '-ShareEquitySchedule["buyback_dollars", @col]' },
        ])
      ),
    },
  })
  table.addRow("regular_cash_dividends", {
    ...rowFormatOptions("currency", 0),
    expr: '-ShareEquitySchedule["regular_dividends_paid", @col]',
    cells: { line_item: "Regular cash dividends" },
  })
  table.addRow("special_cash_dividend", {
    ...rowFormatOptions("currency", 0),
    expr: '-ShareEquitySchedule["special_dividend_paid", @col]',
    cells: {
      line_item: "Special cash dividend",
      FY24: {
        expr: '-ShareEquitySchedule["special_dividend_paid", "FY24"]',
        note: "FY24 $15.00/sh special dividend ($6,655M paid Jan 2024).",
      },
      FY27E: {
        expr: '-ShareEquitySchedule["special_dividend_paid", "FY27E"]',
        note: "Declared special cash dividend payable Dec 4, 2026.",
      },
    },
  })
  table.addRow("financing_lease_and_other", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Finance leases and other, net",
        cf.financingLeaseAndOther
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '-DebtLeasesSchedule["fin_lease_principal_repayments", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("dividend_to_nci", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Cash dividend to NCI", cf.dividendToNci),
      ...zeroForecastCells("Zero NCI following FY22 Taiwan JV buyout."),
    },
  })
  table.addRow("acquisition_of_nci", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Acquisition of NCI", cf.acquisitionOfNci),
      ...zeroForecastCells("Completed FY22 Taiwan JV acquisition."),
    },
  })
  table.addRow("proceeds_st_borrowings", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Proceeds from ST borrowings",
        cf.proceedsStBorrowings
      ),
      ...zeroForecastCells(
        "Forecast liquidity facility draws tracked on revolver line below."
      ),
    },
  })
  table.addRow("repayments_st_borrowings", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Repayments of ST borrowings",
        cf.repaymentsStBorrowings
      ),
      ...zeroForecastCells(
        "Forecast liquidity facility repayments tracked on revolver line below."
      ),
    },
  })
  table.addRow("cff_ex_revolver", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["repayments_lt_debt".."repayments_st_borrowings", @col])',
    cells: { line_item: "Pre-revolver financing cash flow" },
  })
  table.addRow("net_revolver_borrowings", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Credit facility draws / (repays)",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'DebtLeasesSchedule["revolver_draw", @col] - DebtLeasesSchedule["revolver_repay", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("cff", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["cff_ex_revolver", @col] + @table["net_revolver_borrowings", @col]',
    cells: { line_item: "Financing cash flow (CFF)" },
  })

  table.addRowGutter()
  table.addSectionHeader("Cash reconciliation and free cash flow")
  table.addRow("fx_effect_on_cash", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("FX effect on cash", cf.fxEffectOnCash),
      ...zeroForecastCells("Zero forecast FX translation effect on cash."),
    },
  })
  table.addRow("net_change_in_cash", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["cfo", @col] + @table["cfi", @col] + @table["cff", @col] + @table["fx_effect_on_cash", @col]',
    cells: { line_item: "Net change in cash" },
  })
  table.addRow("cash_beginning", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Cash, beginning of year",
      FY22: {
        value: cf.cashBeginning.FY22,
        note: "FY21 ending cash per FY22 Form 10-K.",
      },
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: '@table["cash_ending", col.prev]' },
        ])
      ),
    },
  })
  table.addRow("cash_ending", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["cash_beginning", @col] + @table["net_change_in_cash", @col]',
    cells: { line_item: "Cash, end of year" },
  })
  table.addRow("cash_tie_out_check", {
    ...rowFormatOptions("currency", 4),
    style: "bold",
    highlight: true,
    expr: '@table["cash_ending", @col] - BalanceSheet["cash_and_equivalents", @col]',
    cells: { line_item: "Cash tie-out (CF − BS cash)" },
  })
  table.addRow("levered_fcf", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["cfo", @col] + @table["capex", @col]',
    cells: { line_item: "Memo: Levered FCF (CFO − CapEx)" },
  })
  table.addRow("unlevered_fcff", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Unlevered FCFF (post-SBC)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: 'InvestedCapitalROIC["unlevered_fcff", @col]' },
        ])
      ),
    },
  })
  table.addRow("unlevered_fcff_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Unlevered FCFF ex-SBC",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          p === "FY27E"
            ? {
                expr: 'InvestedCapitalROIC["unlevered_fcff_ex_sbc_memo", @col]',
                note: "Reference sensitivity adding back after-tax SBC; primary DCF retains SBC as a cash operating cost.",
              }
            : {
                expr: 'InvestedCapitalROIC["unlevered_fcff_ex_sbc_memo", @col]',
              },
        ])
      ),
    },
  })

  return table
}
