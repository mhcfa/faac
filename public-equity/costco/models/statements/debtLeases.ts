import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  buildHistoricalCellMap,
  rowFormatOptions,
} from "../timeline.ts"

export function buildDebtLeasesSchedule(
  sheet: Sheet,
  kg: CostcoKnowledgeData,
  belowTarget?: Table
): Table {
  const table = sheet.addTable(
    "DebtLeasesSchedule",
    "Debt Maturity Waterfall, Credit Facilities, Leases & Interest ($M)",
    {
      subtitle: [
        "FY22–FY26 audited; FY27E–FY36E contractual debt waterfall, ASC 842 leases & non-circular opening-balance interest ($M)",
        `Source: ${kg.citations.debtLeases}`,
      ],
      currency: "USD",
      ...(belowTarget ? { below: belowTarget } : {}),
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Debt / Lease / Interest Line ($M)",
  })

  const dl = kg.cost.debtLeases
  const bs = kg.cost.balanceSheet
  const is = kg.cost.incomeStatement

  table.addSectionHeader("1. Long-Term Debt Tranches (Principal Roll-Forward)")
  table.addRow("tranche_may27", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      dl.trancheMeta.may2027.label,
      dl.seniorNotesMay2027
    ),
    expr: '@table["tranche_may27", col.prev] - DebtTranches["tranche_may27", @col]',
  })
  table.addRow("tranche_jun27", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      dl.trancheMeta.jun2027.label,
      dl.seniorNotesJun2027
    ),
    expr: '@table["tranche_jun27", col.prev] - DebtTranches["tranche_jun27", @col]',
  })
  table.addRow("tranche_apr30", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      dl.trancheMeta.apr2030.label,
      dl.seniorNotesApr2030
    ),
    expr: '@table["tranche_apr30", col.prev] - DebtTranches["tranche_apr30", @col]',
  })
  table.addRow("tranche_apr32", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      dl.trancheMeta.apr2032.label,
      dl.seniorNotesApr2032
    ),
    expr: '@table["tranche_apr32", col.prev] - DebtTranches["tranche_apr32", @col]',
  })
  table.addRow("tranche_japan", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      dl.trancheMeta.japanLabel,
      dl.otherLtDebtJapan
    ),
    expr: '@table["tranche_japan", col.prev] - DebtTranches["tranche_japan", @col]',
  })
  table.addRow("tranche_may24", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "2.750% Senior Notes due May 2024 (retired FY24)",
      dl.seniorNotesMay2024
    ),
    expr: "0",
  })
  table.addRow("tranche_may22", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "2.300% Senior Notes due May 2022 (retired FY22)",
      dl.seniorNotesMay2022
    ),
    expr: "0",
  })
  table.addRow("total_lt_debt_principal", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["tranche_may27".."tranche_may22", @col])',
    cells: { line_item: "Total Long-Term Debt Principal" },
  })
  table.addRow("unamortized_discounts", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "(-) Unamortized debt discounts & issuance costs",
      dl.unamortizedDiscounts
    ),
    expr: 'MAX(0, @table["unamortized_discounts", col.prev] - MIN(@table["unamortized_discounts", col.prev], ScalarAssumptionsActive["unamortized_discount_amort_annual", "val"]))',
  })
  table.addRow("discount_amortization", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Non-cash discount amortization (+ interest / carrying)",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["unamortized_discounts", col.prev] - @table["unamortized_discounts", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("total_lt_debt_carrying", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["total_lt_debt_principal", @col] - @table["unamortized_discounts", @col]',
    cells: { line_item: "Total Long-Term Debt (Carrying Value)" },
  })
  table.addRow("scheduled_lt_debt_repayments", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Scheduled LT debt principal repayments",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '-CashFlowStatement["repayments_lt_debt", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'DebtTranches["total_tranches", @col]' },
        ])
      ),
    },
  })
  table.addRow("current_portion_lt_debt_total", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Current portion of LT debt (total schedule basis)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, dl.currentPortionDebtSched[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.slice(0, -1).map((p) => [
          p,
          {
            expr: 'MIN(@table["total_lt_debt_carrying", @col], @table["scheduled_lt_debt_repayments", col.next])',
          },
        ])
      ),
      FY36E: 0,
    },
  })
  table.addRow("current_portion_lt_debt_bs", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Current portion of LT debt (BS face line)",
        note: "FY24 $103M folded inside Other Current Liabilities on FY25 10-K BS (restored in FY25-FY26).",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, bs.currentPortionDebtBs[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '@table["current_portion_lt_debt_total", @col]' },
        ])
      ),
    },
  })
  table.addRow("current_portion_in_ocl", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["current_portion_lt_debt_total", @col] - @table["current_portion_lt_debt_bs", @col]',
    cells: {
      line_item: "Current debt embedded in OCL (FY24 BS reclass)",
    },
  })
  table.addRow("long_term_debt_excl_current", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["total_lt_debt_carrying", @col] - @table["current_portion_lt_debt_total", @col]',
    cells: { line_item: "Long-term debt, excluding current portion (BS line)" },
  })

  table.addSectionHeader("2. Automated Short-Term Revolver / Cash Floor Buffer")
  table.addRow("revolver_beg", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Beginning short-term / revolver borrowings",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: '@table["revolver_end", col.prev]' },
        ])
      ),
    },
  })
  table.addRow("pre_revolver_cash", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Pre-revolver ending cash & equivalents",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, bs.cashAndEquivalents[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'CashFlowStatement["cash_beginning", @col] + CashFlowStatement["cfo", @col] + CashFlowStatement["cfi", @col] + CashFlowStatement["cff_ex_revolver", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("revolver_draw", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Revolver draw (only if pre-revolver cash < min buffer)",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'MAX(0, ScalarAssumptionsActive["min_cash_buffer", "val"] - @table["pre_revolver_cash", @col])',
          },
        ])
      ),
    },
  })
  table.addRow("revolver_repay", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Revolver repayment (excess cash above min buffer)",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'MIN(@table["revolver_beg", @col], MAX(0, @table["pre_revolver_cash", @col] - ScalarAssumptionsActive["min_cash_buffer", "val"]))',
          },
        ])
      ),
    },
  })
  table.addRow("revolver_end", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Ending short-term / revolver borrowings",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, dl.shortTermBorrowings[p]])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["revolver_beg", @col] + @table["revolver_draw", @col] - @table["revolver_repay", @col]',
          },
        ])
      ),
    },
  })

  table.addSectionHeader("3. Operating & Finance Lease Liabilities")
  table.addRow("total_op_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Total operating lease liabilities (current + LT)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["current_op_lease_liab", @col] + @table["lt_op_lease_liab", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'WorkingCapitalPPE["op_lease_rou_assets", @col] * ScalarAssumptionsActive["op_lease_liab_to_rou_ratio", "val"]',
          },
        ])
      ),
    },
  })
  table.addRow("current_op_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Current operating lease liabilities (inside OCL)",
      dl.currentOpLeaseLiab
    ),
    expr: '@table["total_op_lease_liab", @col] * ScalarAssumptionsActive["op_lease_current_share", "val"]',
  })
  table.addRow("lt_op_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Long-term operating lease liabilities (BS line)",
      dl.ltOpLeaseLiab
    ),
    expr: '@table["total_op_lease_liab", @col] - @table["current_op_lease_liab", @col]',
  })
  table.addRow("total_fin_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Total finance lease liabilities (current + LT)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["current_fin_lease_liab", @col] + @table["lt_fin_lease_liab", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["fin_lease_pct_sales", "val"]',
          },
        ])
      ),
    },
  })
  table.addRow("current_fin_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Current finance lease liabilities (inside OCL)",
      dl.currentFinLeaseLiab
    ),
    expr: '@table["total_fin_lease_liab", @col] * ScalarAssumptionsActive["fin_lease_current_share", "val"]',
  })
  table.addRow("lt_fin_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Long-term finance lease liabilities (inside OLTL)",
      dl.ltFinLeaseLiab
    ),
    expr: '@table["total_fin_lease_liab", @col] - @table["current_fin_lease_liab", @col]',
  })
  table.addRow("total_debt_and_leases", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["total_lt_debt_carrying", @col] + @table["revolver_end", @col] + @table["total_fin_lease_liab", @col] + @table["total_op_lease_liab", @col]',
    cells: {
      line_item: "Total Debt & Lease Obligations (incl. Operating Leases)",
    },
  })

  table.addSectionHeader("4. Opening-Balance Interest Expense & Cash Yield")
  table.addRow("debt_interest_est", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Senior notes, revolver & discount amort interest",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["total_interest_expense", @col] - @table["fin_lease_interest", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["tranche_may27", col.prev] * DebtTranches["tranche_may27", "coupon_rate"] + @table["tranche_jun27", col.prev] * DebtTranches["tranche_jun27", "coupon_rate"] + @table["tranche_apr30", col.prev] * DebtTranches["tranche_apr30", "coupon_rate"] + @table["tranche_apr32", col.prev] * DebtTranches["tranche_apr32", "coupon_rate"] + @table["tranche_japan", col.prev] * DebtTranches["tranche_japan", "coupon_rate"] + @table["revolver_end", col.prev] * (MarketAnchors["rf_par_10y", "val"] + ScalarAssumptionsActive["revolver_spread_over_rf", "val"]) + @table["discount_amortization", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("fin_lease_interest", {
    ...rowFormatOptions("currency", 1),
    cells: buildHistoricalCellMap(
      "Finance lease interest expense",
      dl.financeLeaseInterest
    ),
    expr: '@table["total_fin_lease_liab", col.prev] * ScalarAssumptionsActive["fin_lease_interest_rate", "val"]',
  })
  table.addRow("total_interest_expense", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: buildHistoricalCellMap("Total Interest Expense", is.interestExpense),
    expr: '@table["debt_interest_est", @col] + @table["fin_lease_interest", @col]',
  })
  table.addRow("beg_cash_and_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Opening Cash, Equivalents & Short-Term Investments",
      FY22: { expr: 'MarketAnchors["fy21_cash_sti", "val"]' },
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: 'BalanceSheet["cash_and_equivalents", col.prev] + BalanceSheet["short_term_investments", col.prev]',
          },
        ])
      ),
    },
  })
  table.addRow("eff_interest_bearing_cash", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Effective Interest-Bearing Opening Cash & STI",
        note: "Deducts dated FY27E special dividend (73.7% absent post-Dec 4) and scheduled debt redemptions (23.0% absent post-May/Jun) without circular interest loops.",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '@table["beg_cash_and_sti", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'MAX(0, @table["beg_cash_and_sti", @col] - ShareEquitySchedule["special_dividend_paid", @col] * ScalarAssumptionsActive["special_div_fy_absent_weight", "val"] - @table["scheduled_lt_debt_repayments", @col] * ScalarAssumptionsActive["scheduled_debt_fy_absent_weight", "val"])',
          },
        ])
      ),
    },
  })
  table.addRow("interest_income", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Interest income on effective interest-bearing Cash & STI",
      is.interestIncome
    ),
    expr: '@table["eff_interest_bearing_cash", @col] * ScalarAssumptionsActive["cash_interest_yield", "val"]',
  })
  table.addRow("implied_cash_yield", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["interest_income", @col] / @table["eff_interest_bearing_cash", @col]',
    cells: {
      line_item: "Effective interest yield on interest-bearing Cash & STI",
    },
  })
  table.addRow("net_cash_incl_leases", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: 'BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["short_term_investments", @col] - @table["total_debt_and_leases", @col]',
    cells: {
      line_item: "Ending Net Cash / (Net Debt incl. Operating & Fin Leases)",
    },
  })

  return table
}
