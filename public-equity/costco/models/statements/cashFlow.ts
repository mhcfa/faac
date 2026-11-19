import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  buildHistoricalCellMap,
  rowFormatOptions,
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
        "FY22–FY26 audited GAAP historicals; FY27E–FY36E reconciles working capital, CapEx, STI maturities & capital returns with zero plugs ($M)",
        `Source: ${kg.citations.cashFlow}`,
      ],
      currency: "USD",
      ...(belowTarget ? { below: belowTarget } : {}),
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Cash Flow Line ($M)",
  })

  const cf = kg.cost.cashFlow

  table.addSectionHeader("Operating Activities (CFO)")
  table.addRow("net_income_incl_nci", {
    ...rowFormatOptions("currency", 0),
    expr: 'IncomeStatement["net_income_incl_nci", @col]',
    cells: { line_item: "Net income including noncontrolling interests" },
  })
  table.addRow("depreciation_and_amortization", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["da", @col]',
    cells: { line_item: "Depreciation and amortization" },
  })
  table.addRow("stock_based_compensation", {
    ...rowFormatOptions("currency", 0),
    expr: 'OperatingSchedule["sbc_expense", @col]',
    cells: {
      line_item: "Stock-based compensation (non-cash addback inside CFO)",
    },
  })
  table.addRow("non_cash_lease_expense", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Non-cash lease expense",
      cf.nonCashLeaseExpense
    ),
    expr: "0",
  })
  table.addRow("deferred_income_taxes", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Deferred income taxes",
      cf.deferredIncomeTaxes
    ),
    expr: "0",
  })
  table.addRow("other_non_cash_operating", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other non-cash operating activities & debt disc. amort.",
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
    cells: buildHistoricalCellMap(
      "Change in merchandise inventories",
      cf.changeInventories
    ),
    expr: "0",
  })
  table.addRow("change_accounts_payable", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Change in accounts payable",
      cf.changeAccountsPayable
    ),
    expr: "0",
  })
  table.addRow("change_other_op_assets_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Change in other operating assets and liabilities, net",
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
      line_item: "Net change in operating lease ROU/liab & other LT op. items",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '(DebtLeasesSchedule["total_op_lease_liab", @col] - DebtLeasesSchedule["total_op_lease_liab", col.prev]) - (WorkingCapitalPPE["op_lease_rou_assets", @col] - WorkingCapitalPPE["op_lease_rou_assets", col.prev]) - (WorkingCapitalPPE["net_other_lt_op_assets", @col] - WorkingCapitalPPE["net_other_lt_op_assets", col.prev])',
          },
        ])
      ),
    },
  })
  table.addRow("cfo", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["net_income_incl_nci".."change_op_leases_and_lt_net", @col])',
    cells: { line_item: "Net cash provided by operating activities (CFO)" },
  })

  table.addSectionHeader("Investing Activities (CFI)")
  table.addRow("capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Additions to property and equipment (CapEx)",
        cf.capex
      ),
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
      line_item: "Purchases of short-term investments",
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
      line_item: "Maturities and sales of short-term investments",
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
    cells: buildHistoricalCellMap(
      "Other investing activities, net",
      cf.otherInvesting
    ),
    expr: "0",
  })
  table.addRow("cfi", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["capex".."other_investing", @col])',
    cells: { line_item: "Net cash used in investing activities (CFI)" },
  })

  table.addSectionHeader("Financing Activities (CFF)")
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
    cells: buildHistoricalCellMap(
      "Proceeds from issuance of long-term debt",
      cf.proceedsLtDebt
    ),
    expr: "0",
  })
  table.addRow("tax_withholdings_sbc", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Tax withholdings on stock-based awards",
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
    cells: { line_item: "Regular cash dividend payments" },
  })
  table.addRow("special_cash_dividend", {
    ...rowFormatOptions("currency", 0),
    expr: '-ShareEquitySchedule["special_dividend_paid", @col]',
    cells: {
      line_item: {
        value: "Special cash dividend payment",
        note: "FY24 $6,655M ($15.00/sh); FY27E $13,294M ($30.00/sh x 443.129M SEC shares, paid Dec 4, 2026).",
      },
    },
  })
  table.addRow("financing_lease_and_other", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Financing lease payments and other financing activities, net",
        cf.financingLeaseAndOther
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'DebtLeasesSchedule["total_fin_lease_liab", @col] - DebtLeasesSchedule["total_fin_lease_liab", col.prev]',
          },
        ])
      ),
    },
  })
  table.addRow("dividend_to_nci", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Cash dividend to noncontrolling interest",
      cf.dividendToNci
    ),
    expr: "0",
  })
  table.addRow("acquisition_of_nci", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Acquisition of noncontrolling interest",
      cf.acquisitionOfNci
    ),
    expr: "0",
  })
  table.addRow("proceeds_st_borrowings", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Proceeds from short-term borrowings",
      cf.proceedsStBorrowings
    ),
    expr: "0",
  })
  table.addRow("repayments_st_borrowings", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Repayments of short-term borrowings",
      cf.repaymentsStBorrowings
    ),
    expr: "0",
  })
  table.addRow("cff_ex_revolver", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["repayments_lt_debt".."repayments_st_borrowings", @col])',
    cells: {
      line_item: "Pre-revolver financing cash flows",
    },
  })
  table.addRow("net_revolver_borrowings", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Automated short-term revolver draws / (repayments)",
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
    cells: { line_item: "Net cash used in financing activities (CFF)" },
  })

  table.addSectionHeader("Cash Reconciliation & Free Cash Flow Memo")
  table.addRow("fx_effect_on_cash", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Effect of exchange rate changes on cash",
      cf.fxEffectOnCash
    ),
    expr: "0",
  })
  table.addRow("net_change_in_cash", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["cfo", @col] + @table["cfi", @col] + @table["cff", @col] + @table["fx_effect_on_cash", @col]',
    cells: { line_item: "Net change in cash and cash equivalents" },
  })
  table.addRow("cash_beginning", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Cash and cash equivalents, beginning of year",
      FY22: cf.cashBeginning.FY22,
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
    cells: { line_item: "Cash and cash equivalents, end of year" },
  })
  table.addRow("cash_tie_out_check", {
    ...rowFormatOptions("currency", 4),
    highlight: true,
    expr: '@table["cash_ending", @col] - BalanceSheet["cash_and_equivalents", @col]',
    cells: {
      line_item: "CF Ending Cash - BS Cash Tie-Out Check (= 0)",
    },
  })
  table.addRow("levered_fcf", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["cfo", @col] + @table["capex", @col]',
    cells: { line_item: "Memo: Levered Free Cash Flow (GAAP CFO - CapEx)" },
  })
  table.addRow("unlevered_fcff", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item:
        "Memo: Unlevered Free Cash Flow (FCFF, SBC retained in EBIT/NOPAT)",
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
      line_item: {
        value: "Memo: Unlevered FCFF ex-SBC (sensitivity delta only)",
        note: "Adds back after-tax SBC purely as memo to quantify SBC cash cost; excluded from primary DCF.",
      },
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: 'InvestedCapitalROIC["unlevered_fcff_ex_sbc_memo", @col]' },
        ])
      ),
    },
  })

  return table
}
