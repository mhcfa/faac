import { Cell, type CellInputValue, type Sheet } from "f8-engine"
import type { BoeingKgData } from "../kg-loader.ts"
import {
  ANNUAL_HIST_COLS,
  BS_HIST_COLS,
  FULL_YEAR_PROJ_COLS,
  addFlowTimelineColumns,
  addSnapshotTimelineColumns,
  type AnnualHistCol,
  type BsHistCol,
} from "../timeline.ts"

type HistFlowCol = AnnualHistCol | "9M25A" | "9M26A"
const HIST_FLOW_COLS: readonly HistFlowCol[] = [
  ...ANNUAL_HIST_COLS,
  "9M25A",
  "9M26A",
]

type HistBsCol = BsHistCol | "9M26A"
const HIST_BS_COLS: readonly HistBsCol[] = [...BS_HIST_COLS, "9M26A"]

function histFlowCells(
  label: string | Cell,
  sourceMap: Readonly<Record<HistFlowCol, number>>,
  extra: Record<string, CellInputValue> = {}
): Record<string, CellInputValue> {
  const cells: Record<string, CellInputValue> = { line_item: label }
  for (const col of HIST_FLOW_COLS) {
    cells[col] = sourceMap[col]
  }
  return { ...cells, ...extra }
}

function histBsRefCells(
  label: string | Cell,
  bsRowId: string,
  fy26Expr: string,
  fy27To32Expr: string
): Record<string, CellInputValue> {
  const cells: Record<string, CellInputValue> = { line_item: label }
  for (const col of HIST_BS_COLS) {
    cells[col] = new Cell({ expr: `BalanceSheet["${bsRowId}", "${col}"]` })
  }
  cells["2026E"] = new Cell({ expr: fy26Expr })
  for (const col of FULL_YEAR_PROJ_COLS) {
    cells[col] = new Cell({ expr: fy27To32Expr })
  }
  return cells
}

function wcCfRowCells(
  label: string,
  balRowId: string,
  sign: 1 | -1
): Record<string, CellInputValue> {
  const cells: Record<string, CellInputValue> = {
    line_item: label,
    "2022A": null,
  }
  const op = sign === -1 ? "-" : ""
  for (const col of [
    "2023A",
    "2024A",
    "2025A",
    "9M26A",
    "2026E",
    ...FULL_YEAR_PROJ_COLS,
  ] as const) {
    cells[col] = new Cell({
      expr: `${op}(@table["${balRowId}", @col] - @table["${balRowId}", col.prev])`,
    })
  }
  return cells
}

export function buildSchedulesSheet(sheet: Sheet, kg: BoeingKgData): void {
  const { ba, citations } = kg

  // =========================================================================
  // TABLE 1: WorkingCapitalSchedule
  // =========================================================================
  const wc = sheet.addTable(
    "WorkingCapitalSchedule",
    "Working Capital, Inventory & Advances Unwind Schedule",
    {
      subtitle:
        "($ in millions) | Q3 2026A balances anchor Q4 2026E–FY2032E cash flow movements (FY26E change = Q4 26E stub vs Q3 26A)",
    }
  )
  addSnapshotTimelineColumns(wc)

  wc.addSectionHeader("Operating working capital balances ($M)")
  wc.addRow("accounts_receivable", {
    cells: histBsRefCells(
      "Accounts receivable, net",
      "accounts_receivable",
      `IncomeStatement["revenue_total", "2026E"] * PeriodDriversActive["dsoDays", "Q4_26E"] / 365`,
      `IncomeStatement["revenue_total", @col] * PeriodDriversActive["dsoDays", @col] / 365`
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("unbilled_receivables", {
    cells: histBsRefCells(
      "Unbilled receivables, net",
      "unbilled_receivables",
      `IncomeStatement["revenue_total", "2026E"] * PeriodDriversActive["unbilledDays", "Q4_26E"] / 365`,
      `IncomeStatement["revenue_total", @col] * PeriodDriversActive["unbilledDays", @col] / 365`
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("inventories", {
    cells: histBsRefCells(
      "Inventories (incl. WIP & DPC)",
      "inventories",
      `IncomeStatement["revenue_total", "2026E"] * PeriodDriversActive["invPctRev", "Q4_26E"]`,
      `IncomeStatement["revenue_total", @col] * PeriodDriversActive["invPctRev", @col]`
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("other_current_assets", {
    cells: histBsRefCells(
      "Other current assets",
      "other_current_assets",
      `IncomeStatement["revenue_total", "2026E"] * PeriodDriversActive["otherCurrAssetsPctRev", "Q4_26E"]`,
      `IncomeStatement["revenue_total", @col] * PeriodDriversActive["otherCurrAssetsPctRev", @col]`
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("accounts_payable", {
    cells: histBsRefCells(
      "Accounts payable",
      "accounts_payable",
      `IncomeStatement["total_cost_of_sales", "2026E"] * PeriodDriversActive["dpoDays", "Q4_26E"] / 365`,
      `IncomeStatement["total_cost_of_sales", @col] * PeriodDriversActive["dpoDays", @col] / 365`
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("accrued_liabilities", {
    cells: histBsRefCells(
      "Accrued liabilities",
      "accrued_liabilities",
      `IncomeStatement["revenue_total", "2026E"] * PeriodDriversActive["accruedPctRev", "Q4_26E"]`,
      `IncomeStatement["revenue_total", @col] * PeriodDriversActive["accruedPctRev", @col]`
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("advances_and_progress_billings", {
    cells: histBsRefCells(
      "Advances & progress billings",
      "advances_and_progress_billings",
      `@table["inventories", "2026E"] * PeriodDriversActive["advPctInv", "Q4_26E"]`,
      `@table["inventories", @col] * PeriodDriversActive["advPctInv", @col]`
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("net_inv_minus_adv", {
    cells: { line_item: "Net inventories less customer advances" },
    expr: `@table["inventories", @col] - @table["advances_and_progress_billings", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  wc.addRow("operating_nwc", {
    cells: { line_item: "Operating net working capital" },
    expr: `SUM(@table["accounts_receivable".."other_current_assets", @col]) - SUM(@table["accounts_payable".."advances_and_progress_billings", @col])`,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  wc.addRowGutter()
  wc.addSectionHeader(
    "Cash flow working capital movements (+ = source, − = use)"
  )
  wc.addRow("cf_ar", {
    cells: wcCfRowCells(
      "Chg in accounts receivable",
      "accounts_receivable",
      -1
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("cf_unbilled", {
    cells: wcCfRowCells(
      "Chg in unbilled receivables",
      "unbilled_receivables",
      -1
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("cf_inventories", {
    cells: wcCfRowCells("Chg in inventories", "inventories", -1),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("cf_other_curr_assets", {
    cells: wcCfRowCells(
      "Chg in other current assets",
      "other_current_assets",
      -1
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("cf_ap", {
    cells: wcCfRowCells("Chg in accounts payable", "accounts_payable", 1),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("cf_accrued", {
    cells: {
      line_item: "Chg in accrued liabilities (operating)",
      "2022A": null,
      ...Object.fromEntries(
        (["2023A", "2024A", "2025A", "9M26A", "2026E"] as const).map((c) => [
          c,
          new Cell({
            expr: `@table["accrued_liabilities", @col] - @table["accrued_liabilities", col.prev]`,
          }),
        ])
      ),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `(@table["accrued_liabilities", @col] - @table["accrued_liabilities", col.prev]) - ShareCountSchedule["chg_pref_div_payable", @col]`,
            ...(c === "2027E"
              ? {
                  note: "Separates FY2027E -$72.78M preferred dividend payable extinguishment (settled in Financing CF) from operating accrued liabilities per ASC 230.",
                }
              : {}),
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  wc.addRow("cf_advances", {
    cells: wcCfRowCells(
      "Chg in advances & billings",
      "advances_and_progress_billings",
      1
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("cf_operating_nwc", {
    cells: {
      line_item: "Total operating NWC cash flow",
      "2022A": null,
      ...Object.fromEntries(
        [
          "2023A",
          "2024A",
          "2025A",
          "9M26A",
          "2026E",
          ...FULL_YEAR_PROJ_COLS,
        ].map((c) => [
          c,
          new Cell({ expr: `SUM(@table["cf_ar".."cf_advances", @col])` }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // =========================================================================
  // TABLE 2: PpeCapexDaSchedule
  // =========================================================================
  const ppe = sheet.addTable(
    "PpeCapexDaSchedule",
    "PP&E, Capital Expenditures & Depreciation / Amortization Schedule",
    {
      subtitle: `($ in millions) | Sources: ${citations.segmentCapex}`,
    }
  )
  addFlowTimelineColumns(ppe)

  ppe.addSectionHeader("Capital expenditures & D&A flows")
  ppe.addRow("capex", {
    cells: histFlowCells(
      "Capital expenditures (positive)",
      ba.segCapex.total!,
      {
        LTM: new Cell({
          expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
        }),
        Q4_26E: new Cell({
          expr: `IncomeStatement["revenue_total", "Q4_26E"] * PeriodDriversActive["capexPctRev", "Q4_26E"]`,
        }),
        "2026E": new Cell({
          expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
        }),
        ...Object.fromEntries(
          FULL_YEAR_PROJ_COLS.map((c) => [
            c,
            new Cell({
              expr: `IncomeStatement["revenue_total", @col] * PeriodDriversActive["capexPctRev", @col]`,
            }),
          ])
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  ppe.addRow("capex_pct_rev", {
    cells: { line_item: "CapEx (% of revenue)" },
    expr: `@table["capex", @col] / IncomeStatement["revenue_total", @col]`,
    format: "percentage",
    decimals: 1,
  })
  ppe.addRow("dep_ppe", {
    cells: {
      line_item: "PP&E depreciation",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: new Cell({
        expr: `0.25 * BalanceSheet["ppe_net", "9M26A"] * PeriodDriversActive["depPctBegPpe", "Q4_26E"]`,
      }),
      "2026E": new Cell({
        expr: `@table["da_total", "2026E"] - @table["intangibles_amort", "2026E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["ppe_ending", col.prev] * PeriodDriversActive["depPctBegPpe", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  ppe.addRow("intangibles_amort", {
    cells: {
      line_item: "Acquired intangibles amortization",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: new Cell({
        expr: `MIN(BalanceSheet["acquired_intangibles", "9M26A"], PeriodDriversActive["intangiblesAmort", "Q4_26E"])`,
      }),
      "2026E": new Cell({
        expr: `4 * @table["intangibles_amort", "Q4_26E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `MIN(@table["intangibles_ending", col.prev], PeriodDriversActive["intangiblesAmort", @col])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  ppe.addRow("da_total", {
    cells: histFlowCells("Total depreciation & amortization", ba.cf.da_total!, {
      LTM: new Cell({
        expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
      }),
      Q4_26E: new Cell({
        expr: `@table["dep_ppe", "Q4_26E"] + @table["intangibles_amort", "Q4_26E"]`,
      }),
      "2026E": new Cell({
        expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["dep_ppe", @col] + @table["intangibles_amort", @col]`,
          }),
        ])
      ),
    }),
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  ppe.addRow("capex_to_da", {
    cells: { line_item: "CapEx / D&A ratio" },
    expr: `@table["capex", @col] / @table["da_total", @col]`,
    format: "multiple",
    decimals: 2,
  })

  ppe.addRowGutter()
  ppe.addSectionHeader("PP&E & intangibles roll-forward")
  ppe.addRow("ppe_ending", {
    cells: {
      line_item: "Ending PP&E, net",
      "2021A": null,
      "2022A": new Cell({ expr: `BalanceSheet["ppe_net", "2022A"]` }),
      "2023A": new Cell({ expr: `BalanceSheet["ppe_net", "2023A"]` }),
      "2024A": new Cell({ expr: `BalanceSheet["ppe_net", "2024A"]` }),
      "2025A": new Cell({ expr: `BalanceSheet["ppe_net", "2025A"]` }),
      "9M25A": null,
      "9M26A": new Cell({ expr: `BalanceSheet["ppe_net", "9M26A"]` }),
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["ppe_ending", "9M26A"] + @table["capex", "Q4_26E"] - @table["dep_ppe", "Q4_26E"]`,
      }),
      "2026E": new Cell({ expr: `@table["ppe_ending", "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["ppe_ending", col.prev] + @table["capex", @col] - @table["dep_ppe", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  ppe.addRow("intangibles_ending", {
    cells: {
      line_item: "Ending acquired intangibles, net",
      "2021A": null,
      "2022A": new Cell({
        expr: `BalanceSheet["acquired_intangibles", "2022A"]`,
      }),
      "2023A": new Cell({
        expr: `BalanceSheet["acquired_intangibles", "2023A"]`,
      }),
      "2024A": new Cell({
        expr: `BalanceSheet["acquired_intangibles", "2024A"]`,
      }),
      "2025A": new Cell({
        expr: `BalanceSheet["acquired_intangibles", "2025A"]`,
      }),
      "9M25A": null,
      "9M26A": new Cell({
        expr: `BalanceSheet["acquired_intangibles", "9M26A"]`,
      }),
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["intangibles_ending", "9M26A"] - @table["intangibles_amort", "Q4_26E"]`,
      }),
      "2026E": new Cell({ expr: `@table["intangibles_ending", "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["intangibles_ending", col.prev] - @table["intangibles_amort", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // TABLE 3: DebtLiquiditySchedule
  // =========================================================================
  const debt = sheet.addTable(
    "DebtLiquiditySchedule",
    "Debt Maturity Wall, Cash Sweep & Liquidity Covenant Schedule",
    {
      subtitle: `($ in millions) | Interest computed on opening debt and cash balances; maturities from ${citations.debtMaturities}`,
    }
  )
  addSnapshotTimelineColumns(debt)

  debt.addSectionHeader("Scheduled debt & finance lease maturities")
  debt.addRow("sched_unsecured_mat", {
    cells: {
      line_item: "Scheduled senior note maturities",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      "2026E": new Cell({
        expr: `MAX(0, BalanceSheet["short_term_debt", "9M26A"] - @table["sched_total_mat", "2027E"])`,
        note: "Q4 2026 residual derived as Q3 2026 short-term debt ($4,569M) less FY2027 total scheduled maturities ($4,475M); FY2027–FY2030 per FY2025 Form 10-K Note 17.",
      }),
      "2027E": ba.debtMat2027,
      "2028E": ba.debtMat2028,
      "2029E": ba.debtMat2029,
      "2030E": ba.debtMat2030,
      "2031E": new Cell({
        expr: `ScalarDrivers["post2030AnnualMaturity", "active"]`,
      }),
      "2032E": new Cell({
        expr: `ScalarDrivers["post2030AnnualMaturity", "active"]`,
      }),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("sched_fin_lease_mat", {
    cells: {
      line_item: "Scheduled finance lease payments",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      "2026E": 0,
      "2027E": ba.finLeaseMat2027,
      "2028E": ba.finLeaseMat2028,
      "2029E": ba.finLeaseMat2029,
      "2030E": ba.finLeaseMat2030,
      "2031E": 0,
      "2032E": 0,
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("sched_total_mat", {
    cells: {
      line_item: "Total scheduled debt maturities",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `@table["sched_unsecured_mat", @col] + @table["sched_fin_lease_mat", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  debt.addRowGutter()
  debt.addSectionHeader("Debt roll-forward, refinancing & cash sweep")
  debt.addRow("total_debt_beginning", {
    cells: {
      line_item: "Beginning total carrying debt",
      "2022A": null,
      ...Object.fromEntries(
        [
          "2023A",
          "2024A",
          "2025A",
          "9M26A",
          "2026E",
          ...FULL_YEAR_PROJ_COLS,
        ].map((c) => [
          c,
          new Cell({ expr: `@table["total_debt_ending", col.prev]` }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("refinanced_debt_beg", {
    cells: {
      line_item: "Of which: cumulative new/refinanced debt",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": 0,
      "2026E": 0,
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `MIN(@table["total_debt_beginning", @col], @table[@row, col.prev] + @table["new_borrowings", col.prev])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("cf_pre_debt", {
    cells: {
      line_item: "Cash available before STI & debt service",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      "2026E": new Cell({
        expr: `BalanceSheet["cash_and_equivalents", "9M26A"] + CashFlowStatement["ocf_continuing", "Q4_26E"] + CashFlowStatement["capex", "Q4_26E"] + CashFlowStatement["employee_taxes_sbc", "Q4_26E"] + CashFlowStatement["pref_dividends_paid", "Q4_26E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `BalanceSheet["cash_and_equivalents", col.prev] + CashFlowStatement["ocf_continuing", @col] + CashFlowStatement["capex", @col] + CashFlowStatement["employee_taxes_sbc", @col] + CashFlowStatement["pref_dividends_paid", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("mandatory_repayment", {
    cells: {
      line_item: "(−) Scheduled maturity repayments",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `-MIN(@table["total_debt_beginning", @col], @table["sched_total_mat", @col])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("cash_after_mat", {
    cells: {
      line_item: "Cash after scheduled maturities",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `@table["cf_pre_debt", @col] + @table["mandatory_repayment", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("sti_liquidation", {
    cells: {
      line_item: "(+) Liquid short-term investments drawn",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      "2026E": new Cell({
        expr: `MIN(BalanceSheet["short_term_investments", "9M26A"], MAX(0, ScalarDrivers["minCashBalance", "active"] - @table["cash_after_mat", "2026E"]))`,
        note: "Draws down marketable short-term investments ($11,216M at Q3 2026) ahead of incremental borrowing to maintain target unrestricted cash cushion.",
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `MIN(BalanceSheet["short_term_investments", col.prev], MAX(0, ScalarDrivers["minCashBalance", "active"] - @table["cash_after_mat", @col]))`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("new_borrowings", {
    cells: {
      line_item: "(+) Refinancing / revolver draw",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `MAX(0, ScalarDrivers["minCashBalance", "active"] - (@table["cash_after_mat", @col] + @table["sti_liquidation", @col]))`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("optional_repayment", {
    cells: {
      line_item: "(−) Discretionary excess-cash debt sweep",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `-MIN(MAX(0, @table["total_debt_beginning", @col] + @table["mandatory_repayment", @col] - ScalarDrivers["targetGrossDebtFloor", "active"]), MAX(0, @table["cash_after_mat", @col] + @table["sti_liquidation", @col] - ScalarDrivers["targetCashCeiling", "active"]))`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("total_debt_repayments", {
    cells: {
      line_item: "Total debt repayments",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `@table["mandatory_repayment", @col] + @table["optional_repayment", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("total_debt_ending", {
    cells: {
      line_item: "Ending total carrying debt",
      ...Object.fromEntries(
        HIST_BS_COLS.map((c) => [
          c,
          new Cell({
            expr: `BalanceSheet["short_term_debt", "${c}"] + BalanceSheet["long_term_debt", "${c}"]`,
          }),
        ])
      ),
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `@table["total_debt_beginning", @col] + @table["new_borrowings", @col] + @table["total_debt_repayments", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
    style: "total",
  })
  debt.addRow("st_debt_ending", {
    cells: {
      line_item: "Short-term debt & current maturities",
      ...Object.fromEntries(
        HIST_BS_COLS.map((c) => [
          c,
          new Cell({ expr: `BalanceSheet["short_term_debt", "${c}"]` }),
        ])
      ),
      ...Object.fromEntries(
        (["2026E", "2027E", "2028E", "2029E", "2030E", "2031E"] as const).map(
          (c) => [
            c,
            new Cell({
              expr: `MIN(@table["total_debt_ending", @col], @table["sched_total_mat", col.next])`,
            }),
          ]
        )
      ),
      "2032E": new Cell({
        expr: `MIN(@table["total_debt_ending", "2032E"], ScalarDrivers["post2030AnnualMaturity", "active"])`,
      }),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("lt_debt_ending", {
    cells: { line_item: "Long-term debt" },
    expr: `@table["total_debt_ending", @col] - @table["st_debt_ending", @col]`,
    format: "currency",
    decimals: 0,
  })

  debt.addRowGutter()
  debt.addSectionHeader("Interest expense, interest income & covenants")
  debt.addRow("effective_interest_rate", {
    cells: {
      line_item: "Effective blended borrowing rate",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `IF(@table["total_debt_beginning", @col] > 0, ((@table["total_debt_beginning", @col] - @table["refinanced_debt_beg", @col]) * ScalarDrivers["legacyDebtCoupon", "active"] + @table["refinanced_debt_beg", @col] * WaccBuild["kd_pretax", "val"]) / @table["total_debt_beginning", @col], ScalarDrivers["legacyDebtCoupon", "active"])`,
          }),
        ])
      ),
    },
    format: "percentage",
    decimals: 2,
  })
  debt.addRow("interest_expense", {
    cells: {
      line_item: "Interest & debt expense",
      "2022A": new Cell({
        expr: `IncomeStatement["interest_expense", "2022A"]`,
      }),
      "2023A": new Cell({
        expr: `IncomeStatement["interest_expense", "2023A"]`,
      }),
      "2024A": new Cell({
        expr: `IncomeStatement["interest_expense", "2024A"]`,
      }),
      "2025A": new Cell({
        expr: `IncomeStatement["interest_expense", "2025A"]`,
      }),
      "9M26A": new Cell({
        expr: `IncomeStatement["interest_expense", "9M26A"]`,
      }),
      "2026E": new Cell({
        expr: `0.25 * @table["total_debt_beginning", "2026E"] * @table["effective_interest_rate", "2026E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["total_debt_beginning", @col] * @table["effective_interest_rate", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("interest_income", {
    cells: {
      line_item: "Interest income on opening cash & STI",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": null,
      "2026E": new Cell({
        expr: `0.25 * (BalanceSheet["cash_and_equivalents", "9M26A"] + BalanceSheet["short_term_investments", "9M26A"]) * ScalarDrivers["cashYieldRate", "active"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `(BalanceSheet["cash_and_equivalents", col.prev] + BalanceSheet["short_term_investments", col.prev]) * ScalarDrivers["cashYieldRate", "active"]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("cash_and_sti", {
    cells: { line_item: "Total cash & short-term investments" },
    expr: `BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["short_term_investments", @col]`,
    format: "currency",
    decimals: 0,
  })
  debt.addRow("net_debt_carrying", {
    cells: { line_item: "Net carrying debt (Debt − Cash & STI)" },
    expr: `@table["total_debt_ending", @col] - @table["cash_and_sti", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  debt.addRow("undrawn_revolver_2027", {
    cells: {
      line_item: "Revolving facility — 364-day (Aug 2027)",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": ba.revolver2027,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [c, ba.revolver2027])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("undrawn_revolver_2029", {
    cells: {
      line_item: "Revolving facility — 5-yr (Aug 2029)",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": ba.revolver2029,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [c, ba.revolver2029])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("undrawn_revolver_2030", {
    cells: {
      line_item: "Revolving facility — 5-yr (May 2030)",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M26A": ba.revolver2030,
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [c, ba.revolver2030])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("total_liquidity", {
    cells: {
      line_item: "Total liquidity (Cash + STI + Revolvers)",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      ...Object.fromEntries(
        ["9M26A", "2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `@table["cash_and_sti", @col] + SUM(@table["undrawn_revolver_2027".."undrawn_revolver_2030", @col])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  debt.addRow("liquidity_headroom", {
    cells: {
      line_item: "Liquidity headroom vs. $5.0B floor",
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      ...Object.fromEntries(
        ["9M26A", "2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `@table["total_liquidity", @col] - ScalarDrivers["minLiquidityCovenant", "active"]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  debt.addRow("debt_to_total_cap_ex_aoci", {
    cells: {
      line_item: "Debt / total capital (ex-AOCI proxy)",
      "9M26A": new Cell({
        expr: `@table["total_debt_ending", "9M26A"] / (@table["total_debt_ending", "9M26A"] + BalanceSheet["total_equity", "9M26A"] - BalanceSheet["aoci", "9M26A"])`,
        note: "GAAP balance-sheet proxy excluding AOCI. August 24, 2026 credit agreements include designated-charge exclusions under which Boeing remains compliant with the 60% covenant.",
      }),
    },
    expr: `@table["total_debt_ending", @col] / (@table["total_debt_ending", @col] + BalanceSheet["total_equity", @col] - BalanceSheet["aoci", @col])`,
    format: "percentage",
    decimals: 1,
  })
  debt.addRow("covenant_headroom_cap", {
    cells: { line_item: "Debt/cap headroom vs. 60.0% covenant" },
    expr: `ScalarDrivers["maxDebtToCapCovenant", "active"] - @table["debt_to_total_cap_ex_aoci", @col]`,
    format: "percentage",
    decimals: 1,
  })

  // =========================================================================
  // TABLE 4: TaxNolSchedule
  // =========================================================================
  const tax = sheet.addTable(
    "TaxNolSchedule",
    "Federal NOL Carryforward, Cash Taxes & Valuation Allowance Schedule",
    {
      subtitle: `($ in millions) | Source: ${citations.deferredTaxes}; ASC 740 full valuation allowance ($9,754M) offsets federal book tax while active`,
    }
  )
  addFlowTimelineColumns(tax)

  tax.addSectionHeader("Levered GAAP & cash tax schedule (3-statement)")
  tax.addRow("fed_nol_dta_ye25", {
    cells: {
      line_item: "Audited YE25 federal NOL/credit DTA",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": new Cell({
        value: ba.fedNolDtaYe25,
        note: "FY2025 Form 10-K Note 6 combined federal NOL, R&D credit, and Sec. 163(j) DTA ($9,569M); excludes -$5.58B inventory DTL and +$2.63B state/international DTA sensitivities.",
      }),
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: null,
      "2026E": null,
      "2027E": null,
      "2028E": null,
      "2029E": null,
      "2030E": null,
      "2031E": null,
      "2032E": null,
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("tax_va_ye25", {
    cells: {
      line_item: "Audited YE25 tax valuation allowance",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": new Cell({
        value: ba.taxVaYe25,
        note: "FY2025 Form 10-K Note 6 full valuation allowance ($9,754M); federal NOL utilization releases VA inside GAAP tax expense so forecast GAAP tax equals cash tax.",
      }),
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: null,
      "2026E": null,
      "2027E": null,
      "2028E": null,
      "2029E": null,
      "2030E": null,
      "2031E": null,
      "2032E": null,
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("pretax_nol_open", {
    cells: {
      line_item: "Opening pre-tax federal NOL pool",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": new Cell({
        expr: `@table["fed_nol_dta_ye25", "2025A"] / ScalarDrivers["statutoryTaxRate", "active"]`,
      }),
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["pretax_nol_open", "9M26A"] + MAX(0, -IncomeStatement["pretax_income", "9M26A"])`,
      }),
      "2026E": new Cell({ expr: `@table["pretax_nol_open", "9M26A"]` }),
      "2027E": new Cell({ expr: `@table["pretax_nol_end", "Q4_26E"]` }),
      ...Object.fromEntries(
        (["2028E", "2029E", "2030E", "2031E", "2032E"] as const).map((c) => [
          c,
          new Cell({ expr: `@table["pretax_nol_end", col.prev]` }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("pretax_nol_util", {
    cells: {
      line_item: "(−) Federal NOL utilized (80% EBT cap)",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": 0,
      LTM: null,
      Q4_26E: new Cell({
        expr: `MIN(@table["pretax_nol_open", "Q4_26E"], MAX(0, IncomeStatement["pretax_income", "Q4_26E"]) * ScalarDrivers["nolUtilCap", "active"])`,
      }),
      "2026E": new Cell({ expr: `@table["pretax_nol_util", "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `MIN(@table["pretax_nol_open", @col], MAX(0, IncomeStatement["pretax_income", @col]) * ScalarDrivers["nolUtilCap", "active"])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("pretax_nol_end", {
    cells: {
      line_item: "Ending pre-tax federal NOL pool",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": new Cell({
        expr: `@table["pretax_nol_open", "9M26A"] + MAX(0, -IncomeStatement["pretax_income", "9M26A"])`,
      }),
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["pretax_nol_open", "Q4_26E"] + MAX(0, -IncomeStatement["pretax_income", "Q4_26E"]) - @table["pretax_nol_util", "Q4_26E"]`,
      }),
      "2026E": new Cell({ expr: `@table["pretax_nol_end", "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["pretax_nol_open", @col] + MAX(0, -IncomeStatement["pretax_income", @col]) - @table["pretax_nol_util", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  tax.addRow("cash_taxes_paid", {
    cells: {
      line_item: "Total cash income taxes paid",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": new Cell({
        expr: `IncomeStatement["income_tax_expense", "9M26A"]`,
      }),
      LTM: null,
      Q4_26E: new Cell({
        expr: `MAX(0, IncomeStatement["pretax_income", "Q4_26E"] - @table["pretax_nol_util", "Q4_26E"]) * ScalarDrivers["statutoryTaxRate", "active"] + MAX(0.25 * ScalarDrivers["foreignTaxFloorAnnual", "active"], MAX(0, IncomeStatement["pretax_income", "Q4_26E"]) * ScalarDrivers["foreignStateTaxRate", "active"])`,
      }),
      "2026E": new Cell({
        expr: `@table["cash_taxes_paid", "9M26A"] + @table["cash_taxes_paid", "Q4_26E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `MAX(0, IncomeStatement["pretax_income", @col] - @table["pretax_nol_util", @col]) * ScalarDrivers["statutoryTaxRate", "active"] + MAX(ScalarDrivers["foreignTaxFloorAnnual", "active"], MAX(0, IncomeStatement["pretax_income", @col]) * ScalarDrivers["foreignStateTaxRate", "active"])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("gaap_tax_expense", {
    cells: histFlowCells("GAAP income tax expense", ba.is.income_tax_expense!, {
      LTM: new Cell({
        expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
      }),
      Q4_26E: new Cell({
        expr: `@table["cash_taxes_paid", "Q4_26E"]`,
      }),
      "2026E": new Cell({
        expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["cash_taxes_paid", @col]`,
          }),
        ])
      ),
    }),
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  tax.addRow("deferred_tax_provision", {
    cells: {
      line_item: "Deferred tax provision (GAAP − Cash)",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": 0,
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["gaap_tax_expense", "Q4_26E"] - @table["cash_taxes_paid", "Q4_26E"]`,
        note: "Zero while ASC 740 full valuation allowance remains active; keeps non-current DTA ($193M) and DTL ($310M) flat without phantom DTL creation.",
      }),
      "2026E": new Cell({ expr: `@table["deferred_tax_provision", "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["gaap_tax_expense", @col] - @table["cash_taxes_paid", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })

  tax.addRowGutter()
  tax.addSectionHeader("Unlevered DCF NOL tax shield (EBIT basis)")
  tax.addRow("unlev_nol_open", {
    cells: {
      line_item: "Opening unlevered NOL pool",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: new Cell({ expr: `@table["pretax_nol_open", "Q4_26E"]` }),
      "2026E": new Cell({ expr: `@table["unlev_nol_open", "Q4_26E"]` }),
      "2027E": new Cell({ expr: `@table["unlev_nol_end", "Q4_26E"]` }),
      ...Object.fromEntries(
        (["2028E", "2029E", "2030E", "2031E", "2032E"] as const).map((c) => [
          c,
          new Cell({ expr: `@table["unlev_nol_end", col.prev]` }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("unlev_nol_util", {
    cells: {
      line_item: "Unlevered NOL utilized (80% EBIT cap)",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: new Cell({
        expr: `MIN(@table["unlev_nol_open", "Q4_26E"], MAX(0, IncomeStatement["operating_income", "Q4_26E"]) * ScalarDrivers["nolUtilCap", "active"])`,
      }),
      "2026E": new Cell({ expr: `@table["unlev_nol_util", "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `MIN(@table["unlev_nol_open", @col], MAX(0, IncomeStatement["operating_income", @col]) * ScalarDrivers["nolUtilCap", "active"])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("unlev_nol_end", {
    cells: {
      line_item: "Ending unlevered NOL pool",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["unlev_nol_open", "Q4_26E"] + MAX(0, -IncomeStatement["operating_income", "Q4_26E"]) - @table["unlev_nol_util", "Q4_26E"]`,
      }),
      "2026E": new Cell({ expr: `@table["unlev_nol_end", "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["unlev_nol_open", @col] + MAX(0, -IncomeStatement["operating_income", @col]) - @table["unlev_nol_util", @col]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  tax.addRow("unlevered_nol_tax_shield", {
    cells: {
      line_item: "Unlevered federal NOL cash tax savings",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["unlev_nol_util", "Q4_26E"] * ScalarDrivers["statutoryTaxRate", "active"]`,
      }),
      "2026E": new Cell({
        expr: `@table["unlevered_nol_tax_shield", "Q4_26E"]`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["unlev_nol_util", @col] * ScalarDrivers["statutoryTaxRate", "active"]`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
    style: "bold",
  })

  // =========================================================================
  // TABLE 5: ShareCountSchedule
  // =========================================================================
  const sh = sheet.addTable(
    "ShareCountSchedule",
    "GAAP EPS Share Count Roll-Forward & Preferred Dividend Schedule",
    {
      subtitle:
        "(Shares in millions; dividends in $M) | Used solely for 3-statement GAAP EPS; DCF uses valuation-date diluted shares (no SBC/401k double-count)",
    }
  )
  addFlowTimelineColumns(sh)

  sh.addSectionHeader("Mandatory convertible preferred (Series A) dividends")
  sh.addRow("pref_dividends", {
    cells: histFlowCells(
      "Series A 6.00% preferred dividends accrued ($M)",
      ba.is.pref_dividends!,
      {
        LTM: new Cell({
          expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
        }),
        Q4_26E: new Cell({
          expr: `0.25 * SecurityValuationInputs["pref_dividend_rate", "val"] * EvToEquityBridge["pref_face_value", "val"]`,
        }),
        "2026E": new Cell({
          expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
        }),
        "2027E": new Cell({
          expr: `YEARFRAC(DATE(2026, 12, 31), DATE(2027, 10, 15), 3) * SecurityValuationInputs["pref_dividend_rate", "val"] * EvToEquityBridge["pref_face_value", "val"]`,
          note: "288/365 × $345M ($272.22M) accrued through mandatory conversion on October 15, 2027.",
        }),
        "2028E": new Cell({
          value: 0,
          note: "Mandatory conversion completed October 15, 2027; zero preferred dividends thereafter.",
        }),
        "2029E": 0,
        "2030E": 0,
        "2031E": 0,
        "2032E": 0,
      }
    ),
    format: "currency",
    decimals: 2,
  })
  sh.addRow("pref_dividends_cash", {
    cells: {
      line_item: "Series A preferred cash dividends paid ($M)",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": new Cell({
        expr: `-CashFlowStatement["pref_dividends_paid", "9M26A"]`,
      }),
      LTM: null,
      Q4_26E: new Cell({
        expr: `0.25 * SecurityValuationInputs["pref_dividend_rate", "val"] * EvToEquityBridge["pref_face_value", "val"]`,
      }),
      "2026E": new Cell({
        expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
      }),
      "2027E": new Cell({
        expr: `SecurityValuationInputs["pref_dividend_rate", "val"] * EvToEquityBridge["pref_face_value", "val"]`,
        note: "4 quarterly $86.25M cash payments ($345.0M) plus Q4 2026E ($86.25M) = 5 total payments ($431.25M) matching DCF.",
      }),
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
      "2032E": 0,
    },
    format: "currency",
    decimals: 2,
  })
  sh.addRow("chg_pref_div_payable", {
    cells: {
      line_item: "Chg in accrued preferred dividend payable ($M)",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["pref_dividends", "Q4_26E"] - @table["pref_dividends_cash", "Q4_26E"]`,
      }),
      "2026E": new Cell({ expr: `@table[@row, "Q4_26E"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table["pref_dividends", @col] - @table["pref_dividends_cash", @col]`,
            ...(c === "2027E"
              ? {
                  note: "Extinguishes -$72.78M prior-year accrued preferred dividend payable inside accrued liabilities.",
                }
              : {}),
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 2,
  })

  sh.addRowGutter()
  sh.addSectionHeader("GAAP common share roll-forward (millions of shares)")
  sh.addRow("ending_basic_shares", {
    cells: {
      line_item: "Ending basic common shares",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": ba.sharesCoverQ326,
      LTM: null,
      Q4_26E: new Cell({
        expr: `@table["ending_basic_shares", "9M26A"] + (CashFlowStatement["sbc", "Q4_26E"] + CashFlowStatement["treasury_shares_401k", "Q4_26E"]) / ScalarDrivers["stockCompIssuancePx", "active"]`,
      }),
      "2026E": new Cell({ expr: `@table["ending_basic_shares", "Q4_26E"]` }),
      "2027E": new Cell({
        expr: `@table["ending_basic_shares", "2026E"] + (CashFlowStatement["sbc", "2027E"] + CashFlowStatement["treasury_shares_401k", "2027E"]) / ScalarDrivers["stockCompIssuancePx", "active"] + MarketSnapshot["ba_pra_spot_shares", "val"]`,
      }),
      ...Object.fromEntries(
        (["2028E", "2029E", "2030E", "2031E", "2032E"] as const).map((c) => [
          c,
          new Cell({
            expr: `@table["ending_basic_shares", col.prev] + (CashFlowStatement["sbc", @col] + CashFlowStatement["treasury_shares_401k", @col]) / ScalarDrivers["stockCompIssuancePx", "active"]`,
          }),
        ])
      ),
    },
    format: "number",
    decimals: 2,
  })
  sh.addRow("wa_shares_basic", {
    cells: histFlowCells(
      "Weighted-average basic shares",
      ba.epsShares.wa_shares_basic!,
      {
        LTM: new Cell({ expr: `@table["wa_shares_basic", "9M26A"]` }),
        Q4_26E: new Cell({
          expr: `0.5 * (@table["ending_basic_shares", "9M26A"] + @table["ending_basic_shares", "Q4_26E"])`,
        }),
        "2026E": new Cell({
          expr: `0.75 * @table["wa_shares_basic", "9M26A"] + 0.25 * @table["wa_shares_basic", "Q4_26E"]`,
        }),
        "2027E": new Cell({
          // Mandatory conversion occurs Oct 15, 2027 (77 / 365 of FY2027E weighted average)
          expr: `@table["ending_basic_shares", "2026E"] + 0.5 * ((CashFlowStatement["sbc", "2027E"] + CashFlowStatement["treasury_shares_401k", "2027E"]) / ScalarDrivers["stockCompIssuancePx", "active"]) + YEARFRAC(DATE(2027, 10, 15), DATE(2027, 12, 31), 3) * MarketSnapshot["ba_pra_spot_shares", "val"]`,
        }),
        ...Object.fromEntries(
          (["2028E", "2029E", "2030E", "2031E", "2032E"] as const).map((c) => [
            c,
            new Cell({
              expr: `0.5 * (@table["ending_basic_shares", col.prev] + @table["ending_basic_shares", @col])`,
            }),
          ])
        ),
      }
    ),
    format: "number",
    decimals: 2,
  })
  sh.addRow("wa_shares_diluted", {
    cells: histFlowCells(
      "Weighted-average diluted shares (GAAP EPS)",
      ba.epsShares.wa_shares_diluted!,
      {
        LTM: new Cell({ expr: `@table["wa_shares_diluted", "9M26A"]` }),
        Q4_26E: new Cell({
          expr: `@table["wa_shares_basic", "Q4_26E"] + IF(IncomeStatement["net_income_common", "Q4_26E"] > 0, ScalarDrivers["gaapDilutiveAwards", "active"], 0)`,
        }),
        "2026E": new Cell({
          expr: `@table["wa_shares_basic", "2026E"] + IF(IncomeStatement["net_income_common", "2026E"] > 0, ScalarDrivers["gaapDilutiveAwards", "active"], 0)`,
        }),
        ...Object.fromEntries(
          FULL_YEAR_PROJ_COLS.map((c) => [
            c,
            new Cell({
              expr: `@table["wa_shares_basic", @col] + IF(IncomeStatement["net_income_common", @col] > 0, ScalarDrivers["gaapDilutiveAwards", "active"], 0)`,
            }),
          ])
        ),
      }
    ),
    format: "number",
    decimals: 2,
    style: "bold",
  })

  // =========================================================================
  // TABLE 6: InvestedCapitalRoic
  // =========================================================================
  const ic = sheet.addTable(
    "InvestedCapitalRoic",
    "Two-Sided Invested Capital Reconciliation & ROIC Diagnostics",
    {
      subtitle:
        "($ in millions) | Clean US GAAP operating-rent & 25.0% combined tax basis; Operating NOA (incl. $5.0B min cash) ties identically to Financing Capital (Debt + Pension/OPEB + Equity − Excess Cash)",
    }
  )
  addSnapshotTimelineColumns(ic)

  ic.addSectionHeader("Operating approach — Net Operating Assets (NOA)")
  ic.addRow("ic_min_op_cash", {
    cells: { line_item: "Minimum operating cash ($5.0B floor)" },
    expr: `MIN(BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["short_term_investments", @col], ScalarDrivers["minLiquidityCovenant", "active"])`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("ic_nwc_core", {
    cells: { line_item: "Core net working capital (US GAAP rent basis)" },
    expr: `(BalanceSheet["accounts_receivable", @col] + BalanceSheet["unbilled_receivables", @col] + BalanceSheet["inventories", @col] + BalanceSheet["current_financing_receivables", @col] + BalanceSheet["other_current_assets", @col]) - (BalanceSheet["accounts_payable", @col] + BalanceSheet["accrued_liabilities", @col] + BalanceSheet["advances_and_progress_billings", @col])`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("ic_ppe", {
    cells: { line_item: "Property, plant & equipment, net" },
    expr: `BalanceSheet["ppe_net", @col]`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("ic_goodwill_intang", {
    cells: { line_item: "Goodwill & acquired intangibles" },
    expr: `BalanceSheet["goodwill", @col] + BalanceSheet["acquired_intangibles", @col]`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("ic_other_op_net", {
    cells: { line_item: "Other operating assets / (liab.), net" },
    expr: `(BalanceSheet["assets_held_for_sale", @col] + BalanceSheet["financing_receivables_and_leases", @col] + BalanceSheet["deferred_tax_assets", @col] + BalanceSheet["long_term_investments", @col] + BalanceSheet["other_assets", @col]) - (BalanceSheet["liabilities_held_for_sale", @col] + BalanceSheet["deferred_tax_liabilities", @col] + BalanceSheet["other_long_term_liabilities", @col])`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("operating_ic", {
    cells: { line_item: "Operating Invested Capital (NOA)" },
    expr: `SUM(@table["ic_min_op_cash".."ic_other_op_net", @col])`,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  ic.addRowGutter()
  ic.addSectionHeader("Financing approach — Capital Employed")
  ic.addRow("fin_total_debt", {
    cells: { line_item: "Total carrying debt (incl. finance leases)" },
    expr: `BalanceSheet["short_term_debt", @col] + BalanceSheet["long_term_debt", @col]`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("fin_pension_opeb", {
    cells: { line_item: "Unfunded pension & retiree health liab." },
    expr: `BalanceSheet["accrued_pension_liab", @col] + BalanceSheet["accrued_retiree_health", @col]`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("fin_total_equity", {
    cells: { line_item: "Total equity (incl. preferred & NCI)" },
    expr: `BalanceSheet["total_equity", @col]`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("fin_less_excess_cash", {
    cells: { line_item: "(−) Excess cash & STI (above $5.0B floor)" },
    expr: `-MAX(0, BalanceSheet["cash_and_equivalents", @col] + BalanceSheet["short_term_investments", @col] - ScalarDrivers["minLiquidityCovenant", "active"])`,
    format: "currency",
    decimals: 0,
  })
  ic.addRow("financing_ic", {
    cells: { line_item: "Financing Invested Capital" },
    expr: `SUM(@table["fin_total_debt".."fin_less_excess_cash", @col])`,
    format: "currency",
    decimals: 0,
    style: "total",
  })
  ic.addRow("ic_tie_check", {
    cells: { line_item: "Invested capital tie check (Op − Fin)" },
    expr: `@table["operating_ic", @col] - @table["financing_ic", @col]`,
    format: "currency",
    decimals: 2,
  })

  ic.addRowGutter()
  ic.addSectionHeader("Return on Invested Capital (ROIC) & Economic Spread")
  ic.addRow("avg_ic", {
    cells: {
      line_item: "Average invested capital",
      "2022A": null,
      "2023A": new Cell({
        expr: `0.5 * (@table["operating_ic", "2022A"] + @table["operating_ic", "2023A"])`,
      }),
      "2024A": new Cell({
        expr: `0.5 * (@table["operating_ic", "2023A"] + @table["operating_ic", "2024A"])`,
      }),
      "2025A": new Cell({
        expr: `0.5 * (@table["operating_ic", "2024A"] + @table["operating_ic", "2025A"])`,
      }),
      "9M26A": new Cell({
        expr: `0.5 * (@table["operating_ic", "2025A"] + @table["operating_ic", "9M26A"])`,
      }),
      "2026E": new Cell({
        expr: `0.5 * (@table["operating_ic", "2025A"] + @table["operating_ic", "2026E"])`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `0.5 * (@table["operating_ic", col.prev] + @table["operating_ic", @col])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  ic.addRow("nopat_qoe", {
    cells: {
      line_item: "Normalized NOPAT (25.0% combined tax)",
      "2022A": new Cell({
        expr: `IncomeStatement["qoe_ebit", "2022A"] * (1 - WaccBuild["tax_rate", "val"])`,
      }),
      "2023A": new Cell({
        expr: `IncomeStatement["qoe_ebit", "2023A"] * (1 - WaccBuild["tax_rate", "val"])`,
      }),
      "2024A": new Cell({
        expr: `IncomeStatement["qoe_ebit", "2024A"] * (1 - WaccBuild["tax_rate", "val"])`,
      }),
      "2025A": new Cell({
        expr: `IncomeStatement["qoe_ebit", "2025A"] * (1 - WaccBuild["tax_rate", "val"])`,
      }),
      "9M26A": new Cell({
        expr: `IncomeStatement["qoe_ebit", "LTM"] * (1 - WaccBuild["tax_rate", "val"])`,
      }),
      ...Object.fromEntries(
        ["2026E", ...FULL_YEAR_PROJ_COLS].map((c) => [
          c,
          new Cell({
            expr: `IncomeStatement["qoe_ebit", @col] * (1 - WaccBuild["tax_rate", "val"])`,
          }),
        ])
      ),
    },
    format: "currency",
    decimals: 0,
  })
  ic.addRow("roic_incl_gw", {
    cells: {
      line_item: "ROIC (incl. goodwill & intangibles)",
      "2022A": null,
      ...Object.fromEntries(
        [
          "2023A",
          "2024A",
          "2025A",
          "9M26A",
          "2026E",
          ...FULL_YEAR_PROJ_COLS,
        ].map((c) => [
          c,
          new Cell({
            expr: `IF(@table["avg_ic", @col] > 0, @table["nopat_qoe", @col] / @table["avg_ic", @col], NA())`,
          }),
        ])
      ),
    },
    format: "percentage",
    decimals: 1,
    style: "bold",
  })
  ic.addRow("roic_ex_gw", {
    cells: {
      line_item: "ROIC (ex-goodwill)",
      "2022A": null,
      "2023A": new Cell({
        expr: `IF((@table["avg_ic", "2023A"] - 0.5 * (BalanceSheet["goodwill", "2022A"] + BalanceSheet["goodwill", "2023A"])) > 0, @table["nopat_qoe", "2023A"] / (@table["avg_ic", "2023A"] - 0.5 * (BalanceSheet["goodwill", "2022A"] + BalanceSheet["goodwill", "2023A"])), NA())`,
      }),
      "2024A": new Cell({
        expr: `IF((@table["avg_ic", "2024A"] - 0.5 * (BalanceSheet["goodwill", "2023A"] + BalanceSheet["goodwill", "2024A"])) > 0, @table["nopat_qoe", "2024A"] / (@table["avg_ic", "2024A"] - 0.5 * (BalanceSheet["goodwill", "2023A"] + BalanceSheet["goodwill", "2024A"])), NA())`,
      }),
      "2025A": new Cell({
        expr: `IF((@table["avg_ic", "2025A"] - 0.5 * (BalanceSheet["goodwill", "2024A"] + BalanceSheet["goodwill", "2025A"])) > 0, @table["nopat_qoe", "2025A"] / (@table["avg_ic", "2025A"] - 0.5 * (BalanceSheet["goodwill", "2024A"] + BalanceSheet["goodwill", "2025A"])), NA())`,
      }),
      "9M26A": new Cell({
        expr: `IF((@table["avg_ic", "9M26A"] - 0.5 * (BalanceSheet["goodwill", "2025A"] + BalanceSheet["goodwill", "9M26A"])) > 0, @table["nopat_qoe", "9M26A"] / (@table["avg_ic", "9M26A"] - 0.5 * (BalanceSheet["goodwill", "2025A"] + BalanceSheet["goodwill", "9M26A"])), NA())`,
      }),
      "2026E": new Cell({
        expr: `IF((@table["avg_ic", "2026E"] - 0.5 * (BalanceSheet["goodwill", "2025A"] + BalanceSheet["goodwill", "2026E"])) > 0, @table["nopat_qoe", "2026E"] / (@table["avg_ic", "2026E"] - 0.5 * (BalanceSheet["goodwill", "2025A"] + BalanceSheet["goodwill", "2026E"])), NA())`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `IF((@table["avg_ic", @col] - 0.5 * (BalanceSheet["goodwill", col.prev] + BalanceSheet["goodwill", @col])) > 0, @table["nopat_qoe", @col] / (@table["avg_ic", @col] - 0.5 * (BalanceSheet["goodwill", col.prev] + BalanceSheet["goodwill", @col])), NA())`,
          }),
        ])
      ),
    },
    format: "percentage",
    decimals: 1,
  })
  ic.addRow("roic_wacc_spread", {
    cells: {
      line_item: "ROIC − WACC spread",
      "2022A": null,
      ...Object.fromEntries(
        [
          "2023A",
          "2024A",
          "2025A",
          "9M26A",
          "2026E",
          ...FULL_YEAR_PROJ_COLS,
        ].map((c) => [
          c,
          new Cell({
            expr: `@table["roic_incl_gw", @col] - WaccBuild["wacc", "val"]`,
          }),
        ])
      ),
    },
    format: "percentage",
    decimals: 1,
  })
}
