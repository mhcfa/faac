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

function histBsCells(
  label: string | Cell,
  sourceMap: Readonly<Record<HistBsCol, number>>,
  extra: Record<string, CellInputValue> = {}
): Record<string, CellInputValue> {
  const cells: Record<string, CellInputValue> = { line_item: label }
  for (const col of HIST_BS_COLS) {
    cells[col] = sourceMap[col]
  }
  return { ...cells, ...extra }
}

function ltmAndFy26Cells(
  q4Expr: string,
  fy27To32Expr: string
): Record<string, CellInputValue> {
  const cells: Record<string, CellInputValue> = {
    LTM: new Cell({
      expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
    }),
    Q4_26E: new Cell({ expr: q4Expr }),
    "2026E": new Cell({
      expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
    }),
  }
  for (const col of FULL_YEAR_PROJ_COLS) {
    cells[col] = new Cell({ expr: fy27To32Expr })
  }
  return cells
}

export function buildCoreModelSheet(sheet: Sheet, kg: BoeingKgData): void {
  const { ba, citations } = kg

  // =========================================================================
  // TABLE 1: SegmentOperatingBuild
  // =========================================================================
  const seg = sheet.addTable(
    "SegmentOperatingBuild",
    "Segment Operating Build & Commercial Delivery Schedule",
    {
      subtitle: `($ in millions, except aircraft unit counts) | Sources: ${citations.segmentSummary}`,
    }
  )
  addFlowTimelineColumns(seg)

  // Section 1: BCA Commercial Deliveries
  seg.addSectionHeader("BCA commercial airplane deliveries (units)")
  seg.addRow("del_737", {
    cells: histFlowCells("737 deliveries", ba.deliveries.b737!, {
      ...ltmAndFy26Cells(
        `PeriodDriversActive["del737", "Q4_26E"]`,
        `PeriodDriversActive["del737", @col]`
      ),
    }),
    format: "integer",
  })
  seg.addRow("del_767", {
    cells: histFlowCells("767 deliveries", ba.deliveries.b767!, {
      ...ltmAndFy26Cells(
        `PeriodDriversActive["del767", "Q4_26E"]`,
        `PeriodDriversActive["del767", @col]`
      ),
    }),
    format: "integer",
  })
  seg.addRow("del_777f", {
    cells: histFlowCells("777 / 777F deliveries", ba.deliveries.b777!, {
      ...ltmAndFy26Cells(
        `PeriodDriversActive["del777f", "Q4_26E"]`,
        `PeriodDriversActive["del777f", @col]`
      ),
    }),
    format: "integer",
  })
  seg.addRow("del_777x", {
    cells: {
      line_item: "777X deliveries",
      "2021A": 0,
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "9M25A": 0,
      "9M26A": 0,
      ...ltmAndFy26Cells(
        `PeriodDriversActive["del777x", "Q4_26E"]`,
        `PeriodDriversActive["del777x", @col]`
      ),
    },
    format: "integer",
  })
  seg.addRow("del_787", {
    cells: histFlowCells("787 deliveries", ba.deliveries.b787!, {
      ...ltmAndFy26Cells(
        `PeriodDriversActive["del787", "Q4_26E"]`,
        `PeriodDriversActive["del787", @col]`
      ),
    }),
    format: "integer",
  })
  seg.addRow("del_747", {
    cells: histFlowCells("747 legacy deliveries", ba.deliveries.b747!, {
      LTM: new Cell({
        expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
      }),
      Q4_26E: new Cell({
        value: 0,
        note: "Program concluded in FY2023; forecast deliveries are zero by definition.",
      }),
      "2026E": new Cell({
        expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
      }),
      "2027E": 0,
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
      "2032E": 0,
    }),
    format: "integer",
  })
  seg.addRow("del_total", {
    cells: { line_item: "Total BCA deliveries" },
    expr: `SUM(@table["del_737".."del_747", @col])`,
    format: "integer",
    style: "subtotal",
  })

  // ASP escalation index helper row (1.0 in Q4 26E, compounding annually 2027E..2032E)
  seg.addRowGutter()
  seg.addSectionHeader("BCA realized pricing index & implied ASP")
  seg.addRow("asp_index", {
    cells: {
      line_item: "Realized ASP index (2026 = 1.00x)",
      "2021A": null,
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "9M25A": null,
      "9M26A": null,
      LTM: null,
      Q4_26E: 1.0,
      "2026E": 1.0,
      "2027E": new Cell({
        expr: `@table["asp_index", "2026E"] * (1 + ScalarDrivers["aspEscalation", "active"])`,
      }),
      "2028E": new Cell({
        expr: `@table["asp_index", col.prev] * (1 + ScalarDrivers["aspEscalation", "active"])`,
      }),
      "2029E": new Cell({
        expr: `@table["asp_index", col.prev] * (1 + ScalarDrivers["aspEscalation", "active"])`,
      }),
      "2030E": new Cell({
        expr: `@table["asp_index", col.prev] * (1 + ScalarDrivers["aspEscalation", "active"])`,
      }),
      "2031E": new Cell({
        expr: `@table["asp_index", col.prev] * (1 + ScalarDrivers["aspEscalation", "active"])`,
      }),
      "2032E": new Cell({
        expr: `@table["asp_index", col.prev] * (1 + ScalarDrivers["aspEscalation", "active"])`,
      }),
    },
    format: "multiple",
    decimals: 2,
  })
  seg.addRow("bca_blended_asp", {
    cells: { line_item: "Implied blended BCA rev / unit ($M)" },
    expr: `IF(@table["del_total", @col] > 0, @table["rev_bca", @col] / @table["del_total", @col], NA())`,
    format: "currency",
    decimals: 1,
  })

  // Section 2: Segment Revenue
  seg.addRowGutter()
  seg.addSectionHeader("Segment revenue ($M)")
  const bcaRevExpr =
    `(@table["del_737", @col] * ScalarDrivers["asp737", "active"]` +
    ` + @table["del_767", @col] * ScalarDrivers["asp767", "active"]` +
    ` + @table["del_777f", @col] * ScalarDrivers["asp777f", "active"]` +
    ` + @table["del_777x", @col] * ScalarDrivers["asp777x", "active"]` +
    ` + @table["del_787", @col] * ScalarDrivers["asp787", "active"]) * @table["asp_index", @col]` +
    ` + PeriodDriversActive["bcaOtherRev", @col]`

  seg.addRow("rev_bca", {
    cells: histFlowCells("Commercial Airplanes (BCA)", ba.seg.rev_bca!, {
      ...ltmAndFy26Cells(bcaRevExpr, bcaRevExpr),
    }),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("rev_bds", {
    cells: histFlowCells("Defense, Space & Security (BDS)", ba.seg.rev_bds!, {
      ...ltmAndFy26Cells(
        `(@table["rev_bds", "2025A"] - @table["rev_bds", "9M25A"]) * (1 + PeriodDriversActive["bdsRevGrowth", "Q4_26E"])`,
        `@table["rev_bds", col.prev] * (1 + PeriodDriversActive["bdsRevGrowth", @col])`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("rev_bgs", {
    cells: histFlowCells("Global Services (BGS)", ba.seg.rev_bgs!, {
      "9M26A": new Cell({
        value: ba.seg.rev_bgs!["9M26A"],
        note: "Digital Aviation Solutions divested October 31, 2025; 9M 2026A and forecast reflect continuing ex-DAS perimeter plus Spirit aftermarket.",
      }),
      ...ltmAndFy26Cells(
        `(@table["rev_bgs", "2025A"] - @table["rev_bgs", "9M25A"]) * (1 + PeriodDriversActive["bgsRevGrowth", "Q4_26E"])`,
        `@table["rev_bgs", col.prev] * (1 + PeriodDriversActive["bgsRevGrowth", @col])`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("rev_unallocated", {
    cells: histFlowCells(
      "Unallocated items & eliminations",
      ba.seg.rev_unallocated!,
      {
        ...ltmAndFy26Cells(
          `PeriodDriversActive["unallocRev", "Q4_26E"]`,
          `PeriodDriversActive["unallocRev", @col]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("rev_total", {
    cells: { line_item: "Total consolidated revenue" },
    expr: `SUM(@table["rev_bca".."rev_unallocated", @col])`,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  // Section 3: Segment EBIT
  seg.addRowGutter()
  seg.addSectionHeader("Segment operating earnings ($M)")
  seg.addRow("ebit_bca", {
    cells: histFlowCells("Commercial Airplanes (BCA)", ba.seg.ebit_bca!, {
      ...ltmAndFy26Cells(
        `@table["rev_bca", "Q4_26E"] * PeriodDriversActive["bcaEbitMargin", "Q4_26E"]`,
        `@table["rev_bca", @col] * PeriodDriversActive["bcaEbitMargin", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("ebit_bds", {
    cells: histFlowCells("Defense, Space & Security (BDS)", ba.seg.ebit_bds!, {
      "9M26A": new Cell({
        value: ba.seg.ebit_bds!["9M26A"],
        note: "Includes $252M non-recurring gain on sale of HRL Laboratories in Q3 2026 (Q3 2026 Form 10-Q, Note 10).",
      }),
      ...ltmAndFy26Cells(
        `@table["rev_bds", "Q4_26E"] * PeriodDriversActive["bdsEbitMargin", "Q4_26E"]`,
        `@table["rev_bds", @col] * PeriodDriversActive["bdsEbitMargin", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("ebit_bgs", {
    cells: histFlowCells("Global Services (BGS)", ba.seg.ebit_bgs!, {
      "2025A": new Cell({
        value: ba.seg.ebit_bgs!["2025A"],
        note: "Includes $9,566M pre-tax gain on divestiture of Digital Aviation Solutions (closed Oct 31, 2025).",
      }),
      ...ltmAndFy26Cells(
        `@table["rev_bgs", "Q4_26E"] * PeriodDriversActive["bgsEbitMargin", "Q4_26E"]`,
        `@table["rev_bgs", @col] * PeriodDriversActive["bgsEbitMargin", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("segment_operating_earnings", {
    cells: { line_item: "Total segment operating earnings" },
    expr: `SUM(@table["ebit_bca".."ebit_bgs", @col])`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  seg.addRow("ebit_unallocated", {
    cells: histFlowCells(
      "Unallocated items & eliminations",
      ba.seg.ebit_unallocated!,
      {
        ...ltmAndFy26Cells(
          `PeriodDriversActive["ebitUnallocated", "Q4_26E"]`,
          `PeriodDriversActive["ebitUnallocated", @col]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("fas_cas_service_cost_adj", {
    cells: histFlowCells(
      "FAS/CAS service cost adjustment",
      ba.seg.fas_cas_service_cost_adj!,
      {
        ...ltmAndFy26Cells(
          `PeriodDriversActive["fasCasAdj", "Q4_26E"]`,
          `PeriodDriversActive["fasCasAdj", @col]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  seg.addRow("operating_income", {
    cells: { line_item: "Consolidated operating income (EBIT)" },
    expr: `@table["segment_operating_earnings", @col] + @table["ebit_unallocated", @col] + @table["fas_cas_service_cost_adj", @col]`,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  // Section 4: Segment Operating Margins
  seg.addRowGutter()
  seg.addSectionHeader("Segment operating margins (%)")
  seg.addRow("margin_bca", {
    cells: { line_item: "BCA EBIT margin" },
    expr: `@table["ebit_bca", @col] / @table["rev_bca", @col]`,
    format: "percentage",
    decimals: 1,
  })
  seg.addRow("margin_bds", {
    cells: { line_item: "BDS EBIT margin" },
    expr: `@table["ebit_bds", @col] / @table["rev_bds", @col]`,
    format: "percentage",
    decimals: 1,
  })
  seg.addRow("margin_bgs", {
    cells: { line_item: "BGS EBIT margin" },
    expr: `@table["ebit_bgs", @col] / @table["rev_bgs", @col]`,
    format: "percentage",
    decimals: 1,
  })
  seg.addRow("margin_consol", {
    cells: { line_item: "Consolidated EBIT margin" },
    expr: `@table["operating_income", @col] / @table["rev_total", @col]`,
    format: "percentage",
    decimals: 1,
    style: "bold",
  })

  // =========================================================================
  // TABLE 2: IncomeStatement
  // =========================================================================
  const is = sheet.addTable(
    "IncomeStatement",
    "Consolidated Statements of Operations & QoE Earnings Bridge",
    {
      subtitle: `($ in millions, except per-share data) | Sources: ${citations.incomeStatement}`,
      below: "SegmentOperatingBuild",
      gap: 2,
    }
  )
  addFlowTimelineColumns(is)

  is.addSectionHeader("Revenue & gross profit")
  is.addRow("revenue_products", {
    cells: histFlowCells("Sales of products", ba.is.revenue_products!, {
      ...ltmAndFy26Cells(
        `@table["revenue_total", "Q4_26E"] - @table["revenue_services", "Q4_26E"]`,
        `@table["revenue_total", @col] - @table["revenue_services", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  is.addRow("revenue_services", {
    cells: histFlowCells("Sales of services", ba.is.revenue_services!, {
      ...ltmAndFy26Cells(
        `@table["revenue_total", "Q4_26E"] * ScalarDrivers["servicesRevShare", "active"]`,
        `@table["revenue_total", @col] * ScalarDrivers["servicesRevShare", "active"]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  is.addRow("revenue_total", {
    cells: histFlowCells("Total revenues", ba.is.revenue_total!, {
      ...ltmAndFy26Cells(
        `SegmentOperatingBuild["rev_total", "Q4_26E"]`,
        `SegmentOperatingBuild["rev_total", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  is.addRow("total_cost_of_sales", {
    cells: histFlowCells("Total cost of sales", ba.is.total_cost_of_sales!, {
      ...ltmAndFy26Cells(
        `@table["revenue_total", "Q4_26E"] - @table["gross_profit", "Q4_26E"]`,
        `@table["revenue_total", @col] - @table["gross_profit", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  is.addRow("gross_profit", {
    cells: histFlowCells("Gross profit", ba.is.gross_profit!, {
      ...ltmAndFy26Cells(
        `@table["operating_income", "Q4_26E"] - @table["income_from_operating_investments", "Q4_26E"] + @table["sga_expense", "Q4_26E"] + @table["rd_expense", "Q4_26E"] - @table["gain_on_dispositions", "Q4_26E"]`,
        `@table["operating_income", @col] - @table["income_from_operating_investments", @col] + @table["sga_expense", @col] + @table["rd_expense", @col] - @table["gain_on_dispositions", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  is.addRow("gross_margin", {
    cells: { line_item: "Gross margin (%)" },
    expr: `@table["gross_profit", @col] / @table["revenue_total", @col]`,
    format: "percentage",
    decimals: 1,
  })

  is.addRowGutter()
  is.addSectionHeader("Operating expenses & net income")
  is.addRow("income_from_operating_investments", {
    cells: histFlowCells(
      "Income from operating investments, net",
      ba.is.income_from_operating_investments!,
      {
        ...ltmAndFy26Cells(
          `PeriodDriversActive["opIncomeInvest", "Q4_26E"]`,
          `PeriodDriversActive["opIncomeInvest", @col]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  is.addRow("sga_expense", {
    cells: histFlowCells(
      "General & administrative expense",
      ba.is.sga_expense!,
      {
        ...ltmAndFy26Cells(
          `@table["revenue_total", "Q4_26E"] * PeriodDriversActive["sgaPctRev", "Q4_26E"]`,
          `@table["revenue_total", @col] * PeriodDriversActive["sgaPctRev", @col]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  is.addRow("rd_expense", {
    cells: histFlowCells("Research & development expense", ba.is.rd_expense!, {
      ...ltmAndFy26Cells(
        `@table["revenue_total", "Q4_26E"] * PeriodDriversActive["rdPctRev", "Q4_26E"]`,
        `@table["revenue_total", @col] * PeriodDriversActive["rdPctRev", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  is.addRow("gain_on_dispositions", {
    cells: histFlowCells(
      "Gain on dispositions, net",
      ba.is.gain_on_dispositions!,
      {
        LTM: new Cell({
          expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
        }),
        Q4_26E: new Cell({
          value: 0,
          note: "Non-recurring statutory gains (including $9,566M DAS divestiture gain in FY2025A); forecast set to zero by definition.",
        }),
        "2026E": new Cell({
          expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
        }),
        "2027E": 0,
        "2028E": 0,
        "2029E": 0,
        "2030E": 0,
        "2031E": 0,
        "2032E": 0,
      }
    ),
    format: "currency",
    decimals: 0,
  })
  is.addRow("operating_income", {
    cells: { line_item: "Earnings / (loss) from operations (EBIT)" },
    expr: `SegmentOperatingBuild["operating_income", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  is.addRow("other_income_expense", {
    cells: histFlowCells(
      "Other income / (expense), net",
      ba.is.other_income_expense!,
      {
        ...ltmAndFy26Cells(
          `DebtLiquiditySchedule["interest_income", "2026E"] + PeriodDriversActive["nonOpPensionOther", "Q4_26E"]`,
          `DebtLiquiditySchedule["interest_income", @col] + PeriodDriversActive["nonOpPensionOther", @col]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  is.addRow("interest_expense", {
    cells: histFlowCells("Interest & debt expense", ba.is.interest_expense!, {
      ...ltmAndFy26Cells(
        `DebtLiquiditySchedule["interest_expense", "2026E"]`,
        `DebtLiquiditySchedule["interest_expense", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  is.addRow("pretax_income", {
    cells: { line_item: "Earnings / (loss) before income taxes" },
    expr: `@table["operating_income", @col] + @table["other_income_expense", @col] - @table["interest_expense", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  is.addRow("income_tax_expense", {
    cells: histFlowCells(
      "Income tax expense / (benefit)",
      ba.is.income_tax_expense!,
      {
        ...ltmAndFy26Cells(
          `TaxNolSchedule["gaap_tax_expense", "Q4_26E"]`,
          `TaxNolSchedule["gaap_tax_expense", @col]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  is.addRow("net_income", {
    cells: { line_item: "Consolidated net income / (loss)" },
    expr: `@table["pretax_income", @col] - @table["income_tax_expense", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  is.addRow("net_income_nci", {
    cells: histFlowCells(
      "Less: net income / (loss) to NCI",
      ba.is.net_income_nci!,
      {
        ...ltmAndFy26Cells(
          `0.25 * ScalarDrivers["nciIncomeAnnual", "active"]`,
          `ScalarDrivers["nciIncomeAnnual", "active"]`
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  is.addRow("net_income_boeing", {
    cells: { line_item: "Net income / (loss) to Boeing" },
    expr: `@table["net_income", @col] - @table["net_income_nci", @col]`,
    format: "currency",
    decimals: 0,
  })
  is.addRow("pref_dividends", {
    cells: histFlowCells(
      "Less: mandatory convertible pref dividends",
      ba.is.pref_dividends!,
      {
        ...ltmAndFy26Cells(
          `ShareCountSchedule["pref_dividends", "Q4_26E"]`,
          `ShareCountSchedule["pref_dividends", @col]`
        ),
        "2027E": new Cell({
          expr: `ShareCountSchedule["pref_dividends", "2027E"]`,
          note: "6.00% Series A Mandatory Convertible Preferred converts Oct 15, 2027; accrues 288/365 ($272.22M) in FY2027E while 4 quarterly cash payments ($345M) settle accrual + $72.78M prior payable.",
        }),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  is.addRow("net_income_common", {
    cells: { line_item: "Net income / (loss) to common shareholders" },
    expr: `@table["net_income_boeing", @col] - @table["pref_dividends", @col]`,
    format: "currency",
    decimals: 0,
    style: "total",
  })
  is.addRow("eps_basic", {
    cells: histFlowCells("GAAP basic EPS ($/sh)", ba.is.eps_basic!, {
      LTM: new Cell({
        expr: `@table["net_income_common", "LTM"] / ShareCountSchedule["wa_shares_basic", "9M26A"]`,
      }),
      Q4_26E: new Cell({
        expr: `@table["net_income_common", "Q4_26E"] / ShareCountSchedule["wa_shares_basic", "Q4_26E"]`,
      }),
      "2026E": new Cell({
        expr: `@table["net_income_common", "2026E"] / ShareCountSchedule["wa_shares_basic", "2026E"]`,
      }),
      "2027E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_basic", @col]`,
      }),
      "2028E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_basic", @col]`,
      }),
      "2029E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_basic", @col]`,
      }),
      "2030E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_basic", @col]`,
      }),
      "2031E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_basic", @col]`,
      }),
      "2032E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_basic", @col]`,
      }),
    }),
    format: "currency",
    decimals: 2,
  })
  is.addRow("eps_diluted", {
    cells: histFlowCells("GAAP diluted EPS ($/sh)", ba.is.eps_diluted!, {
      LTM: new Cell({
        expr: `@table["net_income_common", "LTM"] / ShareCountSchedule["wa_shares_diluted", "9M26A"]`,
      }),
      Q4_26E: new Cell({
        expr: `@table["net_income_common", "Q4_26E"] / ShareCountSchedule["wa_shares_diluted", "Q4_26E"]`,
      }),
      "2026E": new Cell({
        expr: `@table["net_income_common", "2026E"] / ShareCountSchedule["wa_shares_diluted", "2026E"]`,
      }),
      "2027E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_diluted", @col]`,
      }),
      "2028E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_diluted", @col]`,
      }),
      "2029E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_diluted", @col]`,
      }),
      "2030E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_diluted", @col]`,
      }),
      "2031E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_diluted", @col]`,
      }),
      "2032E": new Cell({
        expr: `@table["net_income_common", @col] / ShareCountSchedule["wa_shares_diluted", @col]`,
      }),
    }),
    format: "currency",
    decimals: 2,
    style: "bold",
  })

  // Section 3: QoE Normalization & EBITDA Bridge
  is.addRowGutter()
  is.addSectionHeader("Quality of earnings (QoE) & EBITDA bridge")
  is.addRow("qoe_das_gain_adj", {
    cells: {
      line_item: "(−) DAS divestiture gain (FY2025)",
      "2021A": 0,
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": new Cell({
        value: -ba.dasDivestitureGainFy25,
        note: "Removes audited $9,566M pre-tax gain on Digital Aviation Solutions sale (Oct 31, 2025) from FY2025A and LTM Q3 2026A EBIT.",
      }),
      "9M25A": 0,
      "9M26A": 0,
      LTM: new Cell({
        expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
      }),
      Q4_26E: new Cell({
        value: 0,
        note: "Historical-only QoE adjustment; zero in clean forecast.",
      }),
      "2026E": 0,
      "2027E": 0,
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
      "2032E": 0,
    },
    format: "currency",
    decimals: 0,
  })
  is.addRow("qoe_hrl_gain_adj", {
    cells: {
      line_item: "(−) HRL Laboratories sale gain (Q3 2026)",
      "2021A": 0,
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "9M25A": 0,
      "9M26A": new Cell({
        value: -ba.hrlGainQ326,
        note: "Removes audited $252M non-recurring gain on HRL Laboratories divestiture booked in Q3 2026 BDS operating earnings (Q3 2026 Form 10-Q, Note 10).",
      }),
      LTM: new Cell({
        expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
      }),
      Q4_26E: new Cell({
        value: 0,
        note: "Historical-only QoE adjustment; zero in clean forecast.",
      }),
      "2026E": new Cell({
        expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
      }),
      "2027E": 0,
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
      "2032E": 0,
    },
    format: "currency",
    decimals: 0,
  })
  is.addRow("qoe_ebit", {
    cells: { line_item: "QoE normalized operating income (EBIT)" },
    expr: `@table["operating_income", @col] + @table["qoe_das_gain_adj", @col] + @table["qoe_hrl_gain_adj", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  is.addRow("qoe_ebit_margin", {
    cells: { line_item: "QoE normalized EBIT margin (%)" },
    expr: `@table["qoe_ebit", @col] / @table["revenue_total", @col]`,
    format: "percentage",
    decimals: 1,
  })
  is.addRow("da_memo", {
    cells: { line_item: "(+) Depreciation & amortization" },
    expr: `PpeCapexDaSchedule["da_total", @col]`,
    format: "currency",
    decimals: 0,
  })
  is.addRow("ebitda_gaap", {
    cells: { line_item: "GAAP EBITDA" },
    expr: `@table["operating_income", @col] + @table["da_memo", @col]`,
    format: "currency",
    decimals: 0,
  })
  is.addRow("ebitda_qoe", {
    cells: { line_item: "QoE normalized EBITDA" },
    expr: `@table["qoe_ebit", @col] + @table["da_memo", @col]`,
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  is.addRow("ebitda_qoe_margin", {
    cells: { line_item: "QoE normalized EBITDA margin (%)" },
    expr: `@table["ebitda_qoe", @col] / @table["revenue_total", @col]`,
    format: "percentage",
    decimals: 1,
  })
  is.addRow("stock_comp_memo", {
    cells: {
      line_item: "Memo: SBC + 401(k) stock comp (in EBIT)",
    },
    expr: `CashFlowStatement["sbc", @col] + CashFlowStatement["treasury_shares_401k", @col]`,
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // TABLE 3: BalanceSheet
  // =========================================================================
  const bs = sheet.addTable(
    "BalanceSheet",
    "Consolidated Statements of Financial Position",
    {
      subtitle: `($ in millions) | Sources: ${citations.balanceSheet}`,
      below: "IncomeStatement",
      gap: 2,
    }
  )
  addSnapshotTimelineColumns(bs)

  const bsProjFlat = (): Record<string, CellInputValue> => {
    const out: Record<string, CellInputValue> = {}
    for (const c of [
      "2026E",
      "2027E",
      "2028E",
      "2029E",
      "2030E",
      "2031E",
      "2032E",
    ] as const) {
      out[c] = new Cell({ expr: `@table[@row, col.prev]` })
    }
    return out
  }

  const bsProjExpr = (
    fy26Expr: string,
    fy27To32Expr: string
  ): Record<string, CellInputValue> => {
    const out: Record<string, CellInputValue> = {
      "2026E": new Cell({ expr: fy26Expr }),
    }
    for (const c of FULL_YEAR_PROJ_COLS) {
      out[c] = new Cell({ expr: fy27To32Expr })
    }
    return out
  }

  bs.addSectionHeader("Current assets")
  bs.addRow("cash_and_equivalents", {
    cells: histBsCells(
      "Cash and cash equivalents",
      ba.bs.cash_and_equivalents!,
      bsProjExpr(
        `CashFlowStatement["ending_cash", "Q4_26E"]`,
        `CashFlowStatement["ending_cash", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("short_term_investments", {
    cells: histBsCells(
      "Short-term & other investments",
      ba.bs.short_term_investments!,
      bsProjExpr(
        `@table[@row, col.prev] - DebtLiquiditySchedule["sti_liquidation", "2026E"]`,
        `@table[@row, col.prev] - DebtLiquiditySchedule["sti_liquidation", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("accounts_receivable", {
    cells: histBsCells(
      "Accounts receivable, net",
      ba.bs.accounts_receivable!,
      bsProjExpr(
        `WorkingCapitalSchedule["accounts_receivable", "2026E"]`,
        `WorkingCapitalSchedule["accounts_receivable", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("unbilled_receivables", {
    cells: histBsCells(
      "Unbilled receivables, net",
      ba.bs.unbilled_receivables!,
      bsProjExpr(
        `WorkingCapitalSchedule["unbilled_receivables", "2026E"]`,
        `WorkingCapitalSchedule["unbilled_receivables", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("inventories", {
    cells: histBsCells(
      "Inventories",
      ba.bs.inventories!,
      bsProjExpr(
        `WorkingCapitalSchedule["inventories", "2026E"]`,
        `WorkingCapitalSchedule["inventories", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("current_financing_receivables", {
    cells: histBsCells(
      "Current portion of financing receivables",
      ba.bs.current_financing_receivables!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("other_current_assets", {
    cells: histBsCells(
      "Other current assets & prepaid",
      ba.bs.other_current_assets!,
      bsProjExpr(
        `WorkingCapitalSchedule["other_current_assets", "2026E"]`,
        `WorkingCapitalSchedule["other_current_assets", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("assets_held_for_sale", {
    cells: histBsCells("Assets held for sale", ba.bs.assets_held_for_sale!, {
      "9M26A": new Cell({
        value: ba.bs.assets_held_for_sale!["9M26A"],
        note: "Pending Insitu/Wisk/SkyGrid divestiture ($688M assets / $161M liabilities at Q3 2026); carried flat with no assumed disposal gain.",
      }),
      ...bsProjFlat(),
    }),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_current_assets", {
    cells: { line_item: "Total current assets" },
    expr: `SUM(@table["cash_and_equivalents".."assets_held_for_sale", @col])`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  bs.addRowGutter()
  bs.addSectionHeader("Non-current assets")
  bs.addRow("financing_receivables_and_leases", {
    cells: histBsCells(
      "Customer financing, net",
      ba.bs.financing_receivables_and_leases!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("ppe_net", {
    cells: histBsCells(
      "Property, plant and equipment, net",
      ba.bs.ppe_net!,
      bsProjExpr(
        `PpeCapexDaSchedule["ppe_ending", "2026E"]`,
        `PpeCapexDaSchedule["ppe_ending", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("goodwill", {
    cells: histBsCells("Goodwill", ba.bs.goodwill!, bsProjFlat()),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("acquired_intangibles", {
    cells: histBsCells(
      "Acquired intangible assets, net",
      ba.bs.acquired_intangibles!,
      bsProjExpr(
        `PpeCapexDaSchedule["intangibles_ending", "2026E"]`,
        `PpeCapexDaSchedule["intangibles_ending", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("deferred_tax_assets", {
    cells: histBsCells(
      "Deferred income tax assets",
      ba.bs.deferred_tax_assets!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("long_term_investments", {
    cells: histBsCells(
      "Investments",
      ba.bs.long_term_investments!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("other_assets", {
    cells: histBsCells(
      "Other assets, net of amortization",
      ba.bs.other_assets!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_assets", {
    cells: { line_item: "Total assets" },
    expr: `@table["total_current_assets", @col] + SUM(@table["financing_receivables_and_leases".."other_assets", @col])`,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  bs.addRowGutter()
  bs.addSectionHeader("Current liabilities")
  bs.addRow("accounts_payable", {
    cells: histBsCells(
      "Accounts payable",
      ba.bs.accounts_payable!,
      bsProjExpr(
        `WorkingCapitalSchedule["accounts_payable", "2026E"]`,
        `WorkingCapitalSchedule["accounts_payable", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("accrued_liabilities", {
    cells: histBsCells(
      "Accrued liabilities",
      ba.bs.accrued_liabilities!,
      bsProjExpr(
        `WorkingCapitalSchedule["accrued_liabilities", "2026E"]`,
        `WorkingCapitalSchedule["accrued_liabilities", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("advances_and_progress_billings", {
    cells: histBsCells(
      "Advances and progress billings",
      ba.bs.advances_and_progress_billings!,
      bsProjExpr(
        `WorkingCapitalSchedule["advances_and_progress_billings", "2026E"]`,
        `WorkingCapitalSchedule["advances_and_progress_billings", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("short_term_debt", {
    cells: histBsCells(
      "Short-term debt & current maturities",
      ba.bs.short_term_debt!,
      bsProjExpr(
        `DebtLiquiditySchedule["st_debt_ending", "2026E"]`,
        `DebtLiquiditySchedule["st_debt_ending", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("liabilities_held_for_sale", {
    cells: histBsCells(
      "Liabilities held for sale",
      ba.bs.liabilities_held_for_sale!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_current_liabilities", {
    cells: { line_item: "Total current liabilities" },
    expr: `SUM(@table["accounts_payable".."liabilities_held_for_sale", @col])`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  bs.addRowGutter()
  bs.addSectionHeader("Non-current liabilities")
  bs.addRow("deferred_tax_liabilities", {
    cells: histBsCells(
      "Deferred income taxes",
      ba.bs.deferred_tax_liabilities!,
      bsProjExpr(
        `@table[@row, col.prev] + TaxNolSchedule["deferred_tax_provision", "Q4_26E"]`,
        `@table[@row, col.prev] + TaxNolSchedule["deferred_tax_provision", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("accrued_retiree_health", {
    cells: histBsCells(
      "Accrued retiree health care",
      ba.bs.accrued_retiree_health!,
      bsProjExpr(
        `@table[@row, col.prev] + CashFlowStatement["wc_pension_opeb", "Q4_26E"]`,
        `@table[@row, col.prev] + CashFlowStatement["wc_pension_opeb", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("accrued_pension_liab", {
    cells: histBsCells(
      "Accrued pension plan liability, net",
      ba.bs.accrued_pension_liab!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("other_long_term_liabilities", {
    cells: histBsCells(
      "Other long-term liabilities",
      ba.bs.other_long_term_liabilities!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("long_term_debt", {
    cells: histBsCells(
      "Long-term debt",
      ba.bs.long_term_debt!,
      bsProjExpr(
        `DebtLiquiditySchedule["lt_debt_ending", "2026E"]`,
        `DebtLiquiditySchedule["lt_debt_ending", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_liabilities", {
    cells: { line_item: "Total liabilities" },
    expr: `@table["total_current_liabilities", @col] + SUM(@table["deferred_tax_liabilities".."long_term_debt", @col])`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  bs.addRowGutter()
  bs.addSectionHeader("Shareholders' equity")
  bs.addRow("preferred_stock", {
    cells: histBsCells("Preferred stock (par value)", ba.bs.preferred_stock!, {
      "2026E": new Cell({ expr: `@table[@row, col.prev]` }),
      "2027E": new Cell({
        value: 0,
        note: "6.00% Series A Mandatory Convertible Preferred par value ($6M) reclassifies into APIC upon mandatory conversion October 15, 2027.",
      }),
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
      "2032E": 0,
    }),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("common_stock", {
    cells: histBsCells("Common stock", ba.bs.common_stock!, bsProjFlat()),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("apic", {
    cells: histBsCells("Additional paid-in capital", ba.bs.apic!, {
      "2026E": new Cell({
        expr: `@table[@row, col.prev] + CashFlowStatement["sbc", "Q4_26E"] + CashFlowStatement["employee_taxes_sbc", "Q4_26E"] + (@table["preferred_stock", col.prev] - @table["preferred_stock", @col])`,
      }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({
            expr: `@table[@row, col.prev] + CashFlowStatement["sbc", @col] + CashFlowStatement["employee_taxes_sbc", @col] + (@table["preferred_stock", col.prev] - @table["preferred_stock", @col])`,
          }),
        ])
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("treasury_stock", {
    cells: histBsCells("Less: treasury stock, at cost", ba.bs.treasury_stock!, {
      "9M26A": new Cell({
        value: ba.bs.treasury_stock!["9M26A"],
        note: "Printed as positive contra-equity subtracted in Boeing equity; reduced as treasury shares are reissued to fund employer 401(k) contributions.",
      }),
      ...bsProjExpr(
        `@table[@row, col.prev] - CashFlowStatement["treasury_shares_401k", "Q4_26E"]`,
        `@table[@row, col.prev] - CashFlowStatement["treasury_shares_401k", @col]`
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("retained_earnings", {
    cells: histBsCells(
      "Retained earnings",
      ba.bs.retained_earnings!,
      bsProjExpr(
        `@table[@row, col.prev] + IncomeStatement["net_income_boeing", "Q4_26E"] - IncomeStatement["pref_dividends", "Q4_26E"]`,
        `@table[@row, col.prev] + IncomeStatement["net_income_boeing", @col] - IncomeStatement["pref_dividends", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("aoci", {
    cells: histBsCells(
      "Accumulated other comprehensive loss",
      ba.bs.aoci!,
      bsProjFlat()
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_boeing_equity", {
    cells: { line_item: "Total Boeing shareholders' equity" },
    expr: `@table["preferred_stock", @col] + @table["common_stock", @col] + @table["apic", @col] - @table["treasury_stock", @col] + @table["retained_earnings", @col] + @table["aoci", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  bs.addRow("noncontrolling_interest", {
    cells: histBsCells(
      "Noncontrolling interests",
      ba.bs.noncontrolling_interest!,
      bsProjExpr(
        `@table[@row, col.prev] + IncomeStatement["net_income_nci", "Q4_26E"]`,
        `@table[@row, col.prev] + IncomeStatement["net_income_nci", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  bs.addRow("total_equity", {
    cells: { line_item: "Total equity" },
    expr: `@table["total_boeing_equity", @col] + @table["noncontrolling_interest", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  bs.addRow("total_liabilities_and_equity", {
    cells: { line_item: "Total liabilities and equity" },
    expr: `@table["total_liabilities", @col] + @table["total_equity", @col]`,
    format: "currency",
    decimals: 0,
    style: "total",
  })
  bs.addRow("bs_balance_check", {
    cells: { line_item: "Balance check (Assets − L&E)" },
    expr: `@table["total_assets", @col] - @table["total_liabilities_and_equity", @col]`,
    format: "currency",
    decimals: 2,
  })

  // =========================================================================
  // TABLE 4: CashFlowStatement
  // =========================================================================
  const cf = sheet.addTable(
    "CashFlowStatement",
    "Consolidated Statements of Cash Flows (Headline & Economic FCF)",
    {
      subtitle: `($ in millions) | Sources: ${citations.cashFlowStatement}; non-recurring historical items zeroed in clean forecast`,
      below: "BalanceSheet",
      gap: 2,
    }
  )
  addFlowTimelineColumns(cf)

  const zeroForecast = (note?: string): Record<string, CellInputValue> => ({
    LTM: new Cell({
      expr: `@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]`,
    }),
    Q4_26E: note ? new Cell({ value: 0, note }) : 0,
    "2026E": new Cell({
      expr: `@table[@row, "9M26A"] + @table[@row, "Q4_26E"]`,
    }),
    "2027E": 0,
    "2028E": 0,
    "2029E": 0,
    "2030E": 0,
    "2031E": 0,
    "2032E": 0,
  })

  cf.addSectionHeader("Operating activities")
  cf.addRow("net_income", {
    cells: { line_item: "Consolidated net income / (loss)" },
    expr: `IncomeStatement["net_income", @col]`,
    format: "currency",
    decimals: 0,
  })
  cf.addRow("sbc", {
    cells: histFlowCells(
      "Share-based plans expense",
      ba.cf.sbc!,
      ltmAndFy26Cells(
        `PeriodDriversActive["sbcExpense", "Q4_26E"]`,
        `PeriodDriversActive["sbcExpense", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("treasury_shares_401k", {
    cells: histFlowCells(
      "Treasury shares issued for 401(k) plans",
      ba.cf.treasury_shares_401k!,
      ltmAndFy26Cells(
        `PeriodDriversActive["treasury401k", "Q4_26E"]`,
        `PeriodDriversActive["treasury401k", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("da_total", {
    cells: { line_item: "Depreciation and amortization" },
    expr: `PpeCapexDaSchedule["da_total", @col]`,
    format: "currency",
    decimals: 0,
  })
  cf.addRow("impairment_charges", {
    cells: histFlowCells(
      "Investment / asset impairment charges",
      ba.cf.impairment_charges!,
      zeroForecast(
        "Non-recurring historical impairment; zero in clean forecast."
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("gain_on_dispositions", {
    cells: histFlowCells(
      "Gain on dispositions, net",
      ba.cf.gain_on_dispositions!,
      zeroForecast("Non-recurring disposition gains; zero in clean forecast.")
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("reach_forward_losses", {
    cells: histFlowCells(
      "Commercial reach-forward losses",
      ba.cf.reach_forward_losses!,
      zeroForecast(
        "Non-recurring reach-forward charges; zero in clean forecast."
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("reach_forward_loss_787", {
    cells: histFlowCells(
      "787 reach-forward loss (FY2021)",
      ba.cf.reach_forward_loss_787!,
      zeroForecast("Completed FY2021 statutory charge; zero by definition.")
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("other_non_cash", {
    cells: histFlowCells(
      "Other non-cash items",
      ba.cf.other_non_cash!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_accounts_receivable", {
    cells: histFlowCells(
      "Chg in accounts receivable",
      ba.cf.wc_accounts_receivable!,
      ltmAndFy26Cells(
        `WorkingCapitalSchedule["cf_ar", "2026E"]`,
        `WorkingCapitalSchedule["cf_ar", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_unbilled_receivables", {
    cells: histFlowCells(
      "Chg in unbilled receivables",
      ba.cf.wc_unbilled_receivables!,
      ltmAndFy26Cells(
        `WorkingCapitalSchedule["cf_unbilled", "2026E"]`,
        `WorkingCapitalSchedule["cf_unbilled", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_advances_progress_billings", {
    cells: histFlowCells(
      "Chg in advances & progress billings",
      ba.cf.wc_advances_progress_billings!,
      ltmAndFy26Cells(
        `WorkingCapitalSchedule["cf_advances", "2026E"]`,
        `WorkingCapitalSchedule["cf_advances", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_inventories", {
    cells: histFlowCells(
      "Chg in inventories",
      ba.cf.wc_inventories!,
      ltmAndFy26Cells(
        `WorkingCapitalSchedule["cf_inventories", "2026E"]`,
        `WorkingCapitalSchedule["cf_inventories", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_other_current_assets", {
    cells: histFlowCells(
      "Chg in other current assets",
      ba.cf.wc_other_current_assets!,
      ltmAndFy26Cells(
        `WorkingCapitalSchedule["cf_other_curr_assets", "2026E"]`,
        `WorkingCapitalSchedule["cf_other_curr_assets", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_accounts_payable", {
    cells: histFlowCells(
      "Chg in accounts payable",
      ba.cf.wc_accounts_payable!,
      ltmAndFy26Cells(
        `WorkingCapitalSchedule["cf_ap", "2026E"]`,
        `WorkingCapitalSchedule["cf_ap", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_accrued_liabilities", {
    cells: histFlowCells(
      "Chg in accrued liabilities",
      ba.cf.wc_accrued_liabilities!,
      ltmAndFy26Cells(
        `WorkingCapitalSchedule["cf_accrued", "2026E"]`,
        `WorkingCapitalSchedule["cf_accrued", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_income_taxes", {
    cells: histFlowCells(
      "Deferred & accrued income taxes",
      ba.cf.wc_income_taxes!,
      ltmAndFy26Cells(
        `TaxNolSchedule["deferred_tax_provision", "Q4_26E"]`,
        `TaxNolSchedule["deferred_tax_provision", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_other_lt_liabilities", {
    cells: histFlowCells(
      "Chg in other long-term liabilities",
      ba.cf.wc_other_lt_liabilities!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_pension_opeb", {
    cells: histFlowCells(
      "Pension & retiree health cash flows",
      ba.cf.wc_pension_opeb!,
      ltmAndFy26Cells(
        `0.25 * ScalarDrivers["pensionOpebOutflowAnnual", "active"]`,
        `ScalarDrivers["pensionOpebOutflowAnnual", "active"]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_financing_receivables_leases", {
    cells: histFlowCells(
      "Customer financing, net",
      ba.cf.wc_financing_receivables_leases!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("wc_other", {
    cells: histFlowCells(
      "Other operating cash flows",
      ba.cf.wc_other!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("ocf_continuing", {
    cells: { line_item: "Cash provided / (used) by operating activities" },
    expr: `SUM(@table["net_income".."wc_other", @col])`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  cf.addRowGutter()
  cf.addSectionHeader("Investing activities")
  cf.addRow("capex", {
    cells: { line_item: "Additions to property, plant & equipment" },
    expr: `-PpeCapexDaSchedule["capex", @col]`,
    format: "currency",
    decimals: 0,
  })
  cf.addRow("proceeds_disposal_ppe", {
    cells: histFlowCells(
      "Proceeds from disposals of PP&E",
      ba.cf.proceeds_disposal_ppe!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("proceeds_dispositions", {
    cells: histFlowCells(
      "Proceeds from dispositions",
      ba.cf.proceeds_dispositions!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("acquisitions_net", {
    cells: histFlowCells(
      "Acquisitions, net of cash acquired",
      ba.cf.acquisitions_net!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("contributions_to_investments", {
    cells: histFlowCells(
      "Contributions to investments",
      ba.cf.contributions_to_investments!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("proceeds_from_investments", {
    cells: histFlowCells(
      "Proceeds from investments",
      ba.cf.proceeds_from_investments!,
      ltmAndFy26Cells(
        `DebtLiquiditySchedule["sti_liquidation", "2026E"]`,
        `DebtLiquiditySchedule["sti_liquidation", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("supplier_notes_receivable", {
    cells: histFlowCells(
      "Supplier notes receivable",
      ba.cf.supplier_notes_receivable!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("repayments_supplier_notes", {
    cells: histFlowCells(
      "Repayments on supplier notes",
      ba.cf.repayments_supplier_notes!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("investing_other", {
    cells: histFlowCells(
      "Other investing activities",
      ba.cf.investing_other!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("investing_cf", {
    cells: { line_item: "Cash provided / (used) by investing activities" },
    expr: `SUM(@table["capex".."investing_other", @col])`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  cf.addRowGutter()
  cf.addSectionHeader("Financing activities")
  cf.addRow("new_borrowings", {
    cells: histFlowCells(
      "New borrowings & refinancing",
      ba.cf.new_borrowings!,
      ltmAndFy26Cells(
        `DebtLiquiditySchedule["new_borrowings", "2026E"]`,
        `DebtLiquiditySchedule["new_borrowings", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("debt_repayments", {
    cells: histFlowCells(
      "Debt repayments (scheduled & sweep)",
      ba.cf.debt_repayments!,
      ltmAndFy26Cells(
        `DebtLiquiditySchedule["total_debt_repayments", "2026E"]`,
        `DebtLiquiditySchedule["total_debt_repayments", @col]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("employee_taxes_sbc", {
    cells: histFlowCells(
      "Employee taxes on share-based payment",
      ba.cf.employee_taxes_sbc!,
      ltmAndFy26Cells(
        `0.25 * ScalarDrivers["empTaxSbcAnnual", "active"]`,
        `ScalarDrivers["empTaxSbcAnnual", "active"]`
      )
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("pref_dividends_paid", {
    cells: histFlowCells(
      "Preferred dividends paid",
      ba.cf.pref_dividends_paid!,
      {
        ...ltmAndFy26Cells(
          `-ShareCountSchedule["pref_dividends_cash", "Q4_26E"]`,
          `-ShareCountSchedule["pref_dividends_cash", @col]`
        ),
        "2027E": new Cell({
          expr: `-ShareCountSchedule["pref_dividends_cash", "2027E"]`,
          note: "Pays 4 quarterly $86.25M cash dividends ($345.0M) plus Q4 2026E (-$86.25M) = 5 remaining payments ($431.25M) matching DCF.",
        }),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("common_stock_issuance", {
    cells: histFlowCells(
      "Common stock issuance, net",
      ba.cf.common_stock_issuance!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("preferred_stock_issuance", {
    cells: histFlowCells(
      "Mandatory convertible preferred issuance",
      ba.cf.preferred_stock_issuance!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("purchase_distribution_rights", {
    cells: histFlowCells(
      "Purchase of distribution rights",
      ba.cf.purchase_distribution_rights!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("stock_options_exercised", {
    cells: histFlowCells(
      "Stock options exercised",
      ba.cf.stock_options_exercised!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("financing_other", {
    cells: histFlowCells(
      "Other financing activities",
      ba.cf.financing_other!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("financing_cf", {
    cells: { line_item: "Cash provided / (used) by financing activities" },
    expr: `SUM(@table["new_borrowings".."financing_other", @col])`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  cf.addRowGutter()
  cf.addSectionHeader("Cash reconciliation & free cash flow")
  cf.addRow("fx_effect_cash", {
    cells: histFlowCells(
      "Effect of exchange rate changes on cash",
      ba.cf.fx_effect_cash!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("net_change_cash", {
    cells: { line_item: "Net increase / (decrease) in cash" },
    expr: `@table["ocf_continuing", @col] + @table["investing_cf", @col] + @table["financing_cf", @col] + @table["fx_effect_cash", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  cf.addRow("less_cash_held_for_sale", {
    cells: histFlowCells(
      "Less: cash classified as held for sale",
      ba.cf.less_cash_held_for_sale!,
      zeroForecast()
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("beginning_cash_incl_restricted", {
    cells: histFlowCells(
      "Beginning cash & restricted cash",
      ba.cf.beginning_cash_incl_restricted!,
      {
        LTM: new Cell({
          expr: `@table["ending_cash_incl_restricted", "9M25A"]`,
        }),
        Q4_26E: new Cell({
          expr: `@table["ending_cash_incl_restricted", "9M26A"]`,
        }),
        "2026E": new Cell({
          expr: `@table["beginning_cash_incl_restricted", "9M26A"]`,
        }),
        ...Object.fromEntries(
          FULL_YEAR_PROJ_COLS.map((c) => [
            c,
            new Cell({
              expr: `@table["ending_cash_incl_restricted", col.prev]`,
            }),
          ])
        ),
      }
    ),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("ending_cash_incl_restricted", {
    cells: { line_item: "Ending cash & restricted cash" },
    expr: `@table["beginning_cash_incl_restricted", @col] + @table["net_change_cash", @col] - @table["less_cash_held_for_sale", @col]`,
    format: "currency",
    decimals: 0,
  })
  cf.addRow("less_restricted_cash", {
    cells: histFlowCells("Less: restricted cash", ba.cf.less_restricted_cash!, {
      LTM: new Cell({ expr: `@table[@row, "9M26A"]` }),
      Q4_26E: new Cell({ expr: `@table[@row, "9M26A"]` }),
      "2026E": new Cell({ expr: `@table[@row, "9M26A"]` }),
      ...Object.fromEntries(
        FULL_YEAR_PROJ_COLS.map((c) => [
          c,
          new Cell({ expr: `@table[@row, col.prev]` }),
        ])
      ),
    }),
    format: "currency",
    decimals: 0,
  })
  cf.addRow("ending_cash", {
    cells: { line_item: "Ending unrestricted cash & equivalents" },
    expr: `@table["ending_cash_incl_restricted", @col] - @table["less_restricted_cash", @col]`,
    format: "currency",
    decimals: 0,
    style: "total",
  })
  cf.addRow("cash_tie_check", {
    cells: {
      line_item: "Cash tie-out check (CF − BS Cash)",
      "2021A": null,
      "9M25A": null,
      Q4_26E: new Cell({
        expr: `@table["ending_cash", "Q4_26E"] - BalanceSheet["cash_and_equivalents", "2026E"]`,
      }),
      LTM: new Cell({
        expr: `@table["ending_cash", "LTM"] - BalanceSheet["cash_and_equivalents", "9M26A"]`,
      }),
      "2022A": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2023A": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2024A": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2025A": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "9M26A": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2026E": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2027E": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2028E": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2029E": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2030E": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2031E": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
      "2032E": new Cell({
        expr: `@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]`,
      }),
    },
    format: "currency",
    decimals: 2,
  })

  cf.addRowGutter()
  cf.addSectionHeader("Free cash flow metrics (Headline vs. Economic)")
  cf.addRow("headline_fcf", {
    cells: {
      line_item: "Headline free cash flow (OCF + CapEx)",
    },
    expr: `@table["ocf_continuing", @col] + @table["capex", @col]`,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  cf.addRow("economic_levered_fcf", {
    cells: {
      line_item: "Economic levered FCF (ex-SBC & 401(k))",
    },
    expr: `@table["headline_fcf", @col] - @table["sbc", @col] - @table["treasury_shares_401k", @col]`,
    format: "currency",
    decimals: 0,
    style: "bold",
  })
}
