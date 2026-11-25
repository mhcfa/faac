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
        "FY22A–FY26A audited; FY27E–FY36E contractual maturities, ASC 842 leases, and opening-balance interest ($M)",
        `Source: ${kg.citations.debtLeases}`,
      ],
      currency: "USD",
      ...(belowTarget ? { below: belowTarget } : {}),
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Debt, leases & interest ($M)",
  })

  const dl = kg.cost.debtLeases
  const bs = kg.cost.balanceSheet
  const is = kg.cost.incomeStatement

  table.addSectionHeader("Long-term debt tranches (principal roll-forward)")
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
      "Japan Guaranteed Senior Notes",
      dl.otherLtDebtJapan
    ),
    expr: '@table["tranche_japan", col.prev] - DebtTranches["tranche_japan", @col]',
  })
  table.addRow("tranche_may24", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "2.750% Senior Notes due May 2024",
        dl.seniorNotesMay2024
      ),
      ...zeroForecastCells("Retired at May 2024 maturity."),
    },
  })
  table.addRow("tranche_may22", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "2.300% Senior Notes due May 2022",
        dl.seniorNotesMay2022
      ),
      ...zeroForecastCells("Retired at May 2022 maturity."),
    },
  })
  table.addRow("total_lt_debt_principal", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["tranche_may27".."tranche_may22", @col])',
    cells: { line_item: "Total long-term debt principal" },
  })
  table.addRow("unamortized_discounts", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "(−) Unamortized debt discounts",
      dl.unamortizedDiscounts
    ),
    expr: 'MAX(0, @table["unamortized_discounts", col.prev] - MIN(@table["unamortized_discounts", col.prev], ScalarAssumptionsActive["unamortized_discount_amort_annual", "val"]))',
  })
  table.addRow("discount_amortization", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Non-cash discount amortization",
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
    cells: { line_item: "Total LT debt (carrying value)" },
  })
  table.addRow("scheduled_lt_debt_repayments", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Scheduled LT debt repayments",
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
      line_item: "Current portion of LT debt (total)",
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
      line_item: "Current portion of LT debt (BS)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          p === "FY24"
            ? {
                value: bs.currentPortionDebtBs[p],
                note: "FY24 $103M current debt presented inside other current liabilities on FY25 10-K comparative balance sheet.",
              }
            : bs.currentPortionDebtBs[p],
        ])
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
    cells: { line_item: "Current debt in OCL (FY24 reclass)" },
  })
  table.addRow("long_term_debt_excl_current", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["total_lt_debt_carrying", @col] - @table["current_portion_lt_debt_total", @col]',
    cells: { line_item: "Long-term debt, excl. current" },
  })

  table.addRowGutter()
  table.addSectionHeader("Short-term credit facility and cash floor")
  table.addRow("revolver_beg", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Beginning ST credit borrowings",
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
      line_item: "Pre-facility ending cash",
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
      line_item: "(+) Credit facility draw",
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
      line_item: "(−) Credit facility repayment",
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
      line_item: "Ending ST credit borrowings",
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

  table.addRowGutter()
  table.addSectionHeader("Operating and finance lease liabilities")
  table.addRow("total_op_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Total operating lease liabilities",
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
      "Current operating leases (in OCL)",
      dl.currentOpLeaseLiab
    ),
    expr: '@table["total_op_lease_liab", @col] * ScalarAssumptionsActive["op_lease_current_share", "val"]',
  })
  table.addRow("lt_op_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "LT operating lease liabilities",
      dl.ltOpLeaseLiab
    ),
    expr: '@table["total_op_lease_liab", @col] - @table["current_op_lease_liab", @col]',
  })
  table.addRow("total_fin_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Total finance lease liabilities",
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
      "Current finance leases (in OCL)",
      dl.currentFinLeaseLiab
    ),
    expr: '@table["total_fin_lease_liab", @col] * ScalarAssumptionsActive["fin_lease_current_share", "val"]',
  })
  table.addRow("lt_fin_lease_liab", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "LT finance leases (in OLTL)",
      dl.ltFinLeaseLiab
    ),
    expr: '@table["total_fin_lease_liab", @col] - @table["current_fin_lease_liab", @col]',
  })
  table.addRow("fin_lease_principal_repayments", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Fin. lease principal paid (CFF)",
      dl.cashPaidFinanceLeasesCff
    ),
    expr: '@table["total_fin_lease_liab", col.prev] * ScalarAssumptionsActive["fin_lease_principal_pct", "val"]',
  })
  table.addRow("new_fin_lease_additions", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Non-cash new fin. lease ROU add.",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["total_fin_lease_liab", @col] - @table["total_fin_lease_liab", col.prev] + @table["fin_lease_principal_repayments", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("total_debt_and_leases", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["total_lt_debt_carrying", @col] + @table["revolver_end", @col] + @table["total_fin_lease_liab", @col] + @table["total_op_lease_liab", @col]',
    cells: { line_item: "Total debt and lease obligations" },
  })

  table.addRowGutter()
  table.addSectionHeader("Opening-balance interest expense and cash yield")
  table.addRow("maturity_fy_absent_weight", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Scheduled maturity absent weight",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          p === "FY27E"
            ? {
                expr: 'ScalarAssumptionsActive["scheduled_debt_fy_absent_weight", "val"]',
                note: "May/Jun 2027 senior note maturities (23.0% absent weight).",
              }
            : p === "FY30E" || p === "FY32E"
              ? {
                  expr: 'ScalarAssumptionsActive["apr_maturity_fy_absent_weight", "val"]',
                  note: "April senior note maturity (37.0% absent weight).",
                }
              : 0,
        ])
      ),
    },
  })
  table.addRow("senior_notes_interest", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Senior notes coupon interest",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["total_interest_expense", @col] - @table["fin_lease_interest_in_is", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'SUMPRODUCT(@table["tranche_may27".."tranche_japan", col.prev], DebtTranches["tranche_may27".."tranche_japan", "coupon_rate"]) - @table["maturity_fy_absent_weight", @col] * SUMPRODUCT(DebtTranches["tranche_may27".."tranche_japan", @col], DebtTranches["tranche_may27".."tranche_japan", "coupon_rate"])',
          },
        ])
      ),
    },
  })
  table.addRow("revolver_interest", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Short-term facility interest",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["revolver_end", col.prev] * (MarketAnchors["rf_par_10y", "val"] + ScalarAssumptionsActive["revolver_spread_over_rf", "val"])',
          },
        ])
      ),
    },
  })
  table.addRow("debt_interest_est", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Debt, facility & disc. interest",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '@table["senior_notes_interest", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["senior_notes_interest", @col] + @table["revolver_interest", @col] + @table["discount_amortization", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("fin_lease_interest", {
    ...rowFormatOptions("currency", 1),
    cells: buildHistoricalCellMap(
      "Disclosed fin. lease interest",
      dl.financeLeaseInterest
    ),
    expr: '@table["total_fin_lease_liab", col.prev] * ScalarAssumptionsActive["fin_lease_interest_rate", "val"]',
  })
  table.addRow("fin_lease_interest_in_is", {
    ...rowFormatOptions("currency", 1),
    expr: '@table["fin_lease_interest", @col] * ScalarAssumptionsActive["fin_lease_int_in_gaap_int_pct", "val"]',
    cells: {
      line_item: "Fin. lease int. in GAAP interest",
      FY27E: {
        expr: '@table["fin_lease_interest", "FY27E"] * ScalarAssumptionsActive["fin_lease_int_in_gaap_int_pct", "val"]',
        note: "Reconciles to FY26 $145M GAAP interest baseline; remaining finance-lease interest is capitalized or embedded in operating costs.",
      },
    },
  })
  table.addRow("total_interest_expense", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: buildHistoricalCellMap("Total interest expense", is.interestExpense),
    expr: '@table["debt_interest_est", @col] + @table["fin_lease_interest_in_is", @col]',
  })
  table.addRow("beg_cash_and_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Opening cash and STI",
      FY22: {
        expr: 'MarketAnchors["fy21_cash_sti", "val"]',
        note: "FY21 ending cash and short-term investments per FY22 Form 10-K.",
      },
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
      line_item: "Effective interest-bearing cash",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '@table["beg_cash_and_sti", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          p === "FY27E"
            ? {
                expr: 'MAX(0, @table["beg_cash_and_sti", @col] - MarketAnchors["cc_receivables_in_cash", "val"] - ShareEquitySchedule["special_dividend_paid", @col] * ScalarAssumptionsActive["special_div_fy_absent_weight", "val"] - @table["scheduled_lt_debt_repayments", @col] * @table["maturity_fy_absent_weight", @col])',
                note: "Excludes $2,842M non-interest-bearing card receivables in transit plus time-weighted Dec 4 special dividend and May/Jun 2027 debt maturities.",
              }
            : {
                expr: 'MAX(0, @table["beg_cash_and_sti", @col] - MarketAnchors["cc_receivables_in_cash", "val"] - ShareEquitySchedule["special_dividend_paid", @col] * ScalarAssumptionsActive["special_div_fy_absent_weight", "val"] - @table["scheduled_lt_debt_repayments", @col] * @table["maturity_fy_absent_weight", @col])',
              },
        ])
      ),
    },
  })
  table.addRow("interest_income", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Interest income", is.interestIncome),
    expr: '@table["eff_interest_bearing_cash", @col] * ScalarAssumptionsActive["cash_interest_yield", "val"]',
  })
  table.addRow("implied_cash_yield", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: 'IF(@table["eff_interest_bearing_cash", @col] > 0, @table["interest_income", @col] / @table["eff_interest_bearing_cash", @col], NA())',
    cells: { line_item: "Effective interest yield (%)" },
  })
  table.addRow("net_cash_incl_leases", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: 'BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["short_term_investments", @col] - @table["total_debt_and_leases", @col]',
    cells: { line_item: "Net cash / (debt incl. leases)" },
  })

  return table
}
