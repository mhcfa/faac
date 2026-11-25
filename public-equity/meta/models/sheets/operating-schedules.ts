import { Cell, type CellInputValue, type Sheet } from "f8-engine"
import type { AuditedModelData } from "../kg-extractors.ts"
import { SCALE_NOTE_USD_M } from "../scale.ts"
import {
  BS_ALL_PERIODS,
  BS_FORECAST_PERIODS,
  BS_HIST_PERIODS,
  FLOW_ALL_PERIODS,
  FLOW_HIST_PERIODS,
  FORECAST_PERIODS,
  addTimelineColumns,
  type BsHistPeriod,
  type FlowHistPeriod,
} from "../timeline.ts"

export function buildOperatingSchedulesSheet(
  sheet: Sheet,
  data: AuditedModelData
): void {
  // =========================================================================
  // 1. Segment Revenue & Operating Cost Build (Flow Timeline)
  // =========================================================================
  const seg = sheet.addTable(
    "SegmentBuild",
    "Segment Revenue, Operating Costs & Margin Build",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Meta Platforms Form 10-K (FY2023–FY2025) & Form 10-Q (Q3 2026), Note 14",
      ],
    }
  )
  seg.addColumn("label", { role: "descriptor", header: "Segment Line Item" })
  addTimelineColumns(seg, "flow")

  const foaAdHist = data.flowSeries(
    "segment_results",
    "foa_advertising_revenue"
  )
  const foaOthHist = data.flowSeries("segment_results", "foa_other_revenue")
  const rlRevHist = data.flowSeries("segment_results", "rl_revenue")
  const foaEbitHist = data.flowSeries("segment_results", "foa_operating_income")
  const rlEbitHist = data.flowSeries("segment_results", "rl_operating_income")
  const sbcHist = data.flowSeries(
    "cash_flow_statement",
    "share_based_compensation"
  )

  const histCells = (
    series: Readonly<Record<FlowHistPeriod, number>>,
    label: string
  ): Record<string, CellInputValue> => {
    const out: Record<string, CellInputValue> = {
      label: new Cell({ value: label }),
    }
    for (const p of FLOW_HIST_PERIODS) {
      out[p] = series[p]
    }
    return out
  }

  seg.addSectionHeader("Revenue by segment")

  const foaAdCells = histCells(foaAdHist, "Family of Apps — Advertising")
  foaAdCells["LTM Q3 26"] = {
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  }
  foaAdCells["Q4 26E"] = {
    expr: '@table["total_revenue", "Q4 26E"] - @table["rl_revenue", "Q4 26E"] - @table["foa_other_revenue", "Q4 26E"]',
  }
  foaAdCells["2026E"] = {
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  }
  for (const p of FORECAST_PERIODS) {
    foaAdCells[p] = {
      expr: '@table["foa_revenue", @col] - @table["foa_other_revenue", @col]',
    }
  }
  seg.addRow("foa_advertising_revenue", {
    cells: foaAdCells,
    format: "currency",
    decimals: 0,
  })

  const foaOthCells = histCells(foaOthHist, "Family of Apps — Other")
  foaOthCells["LTM Q3 26"] = {
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  }
  foaOthCells["Q4 26E"] = {
    expr: 'ScalarDrivers["q4FoaOtherRevenue", "active"]',
  }
  foaOthCells["2026E"] = {
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  }
  for (const p of FORECAST_PERIODS) {
    foaOthCells[p] = {
      expr: '@table["foa_revenue", @col] * VectorDriversActive["foaOtherRevShareOfFoa", @col]',
    }
  }
  seg.addRow("foa_other_revenue", {
    cells: foaOthCells,
    format: "currency",
    decimals: 0,
  })

  const foaRevCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Family of Apps total revenue" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    foaRevCells[p] = new Cell({
      expr: '@table["foa_advertising_revenue", @col] + @table["foa_other_revenue", @col]',
    })
  }
  foaRevCells["LTM Q3 26"] = new Cell({
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  })
  foaRevCells["Q4 26E"] = new Cell({
    expr: '@table["foa_advertising_revenue", "Q4 26E"] + @table["foa_other_revenue", "Q4 26E"]',
  })
  foaRevCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  foaRevCells["2027E"] = new Cell({
    expr: '@table["foa_revenue", "2026E"] * (1 + VectorDriversActive["foaRevenueGrowth", "2027E"]) * (1 + ScalarDrivers["revenueStressShockPct", "active"])',
  })
  for (const p of ["2028E", "2029E", "2030E", "2031E"] as const) {
    foaRevCells[p] = new Cell({
      expr: '@table["foa_revenue", col.prev] * (1 + VectorDriversActive["foaRevenueGrowth", @col])',
    })
  }
  seg.addRow("foa_revenue", {
    cells: foaRevCells,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  const rlRevCells = histCells(rlRevHist, "Reality Labs revenue")
  rlRevCells["LTM Q3 26"] = {
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  }
  rlRevCells["Q4 26E"] = {
    expr: 'ScalarDrivers["q4RlRevenue", "active"]',
  }
  rlRevCells["2026E"] = {
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  }
  rlRevCells["2027E"] = {
    expr: '@table["rl_revenue", "2026E"] * (1 + VectorDriversActive["rlRevenueGrowth", "2027E"]) * (1 + ScalarDrivers["revenueStressShockPct", "active"])',
  }
  for (const p of ["2028E", "2029E", "2030E", "2031E"] as const) {
    rlRevCells[p] = {
      expr: '@table["rl_revenue", col.prev] * (1 + VectorDriversActive["rlRevenueGrowth", @col])',
    }
  }
  seg.addRow("rl_revenue", {
    cells: rlRevCells,
    format: "currency",
    decimals: 0,
  })

  const totRevCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Consolidated total revenue" }),
  }
  for (const p of FLOW_ALL_PERIODS) {
    if (p === "Q4 26E") {
      totRevCells[p] = new Cell({
        expr: 'ScalarDrivers["q4RevenueGuidance", "active"]',
      })
    } else {
      totRevCells[p] = new Cell({
        expr: '@table["foa_revenue", @col] + @table["rl_revenue", @col]',
      })
    }
  }
  seg.addRow("total_revenue", {
    cells: totRevCells,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  const revGrCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Consolidated revenue YoY growth" }),
    "2021A": null,
    "2022A": new Cell({
      expr: '@table["total_revenue", "2022A"] / @table["total_revenue", "2021A"] - 1',
    }),
    "2023A": new Cell({
      expr: '@table["total_revenue", "2023A"] / @table["total_revenue", "2022A"] - 1',
    }),
    "2024A": new Cell({
      expr: '@table["total_revenue", "2024A"] / @table["total_revenue", "2023A"] - 1',
    }),
    "2025A": new Cell({
      expr: '@table["total_revenue", "2025A"] / @table["total_revenue", "2024A"] - 1',
    }),
    "9M25A": null,
    "9M26A": new Cell({
      expr: '@table["total_revenue", "9M26A"] / @table["total_revenue", "9M25A"] - 1',
    }),
    "LTM Q3 26": new Cell({
      expr: '@table["total_revenue", "LTM Q3 26"] / @table["total_revenue", "2025A"] - 1',
    }),
    "Q4 26E": new Cell({
      expr: '@table["total_revenue", "Q4 26E"] / (@table["total_revenue", "2025A"] - @table["total_revenue", "9M25A"]) - 1',
    }),
    "2026E": new Cell({
      expr: '@table["total_revenue", "2026E"] / @table["total_revenue", "2025A"] - 1',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    revGrCells[p] = new Cell({
      expr: '@table["total_revenue", @col] / @table["total_revenue", col.prev] - 1',
    })
  }
  seg.addRow("revenue_yoy_growth", {
    cells: revGrCells,
    format: "percentage",
    decimals: 1,
  })

  // Section 2: Segment Operating Costs & Operating Income
  seg.addRowGutter()
  seg.addSectionHeader("Segment operating costs & EBIT")

  const foaCashOpexCells: Record<string, Cell | number> = {
    label: new Cell({ value: "FoA cash operating costs (ex-D&A)" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    foaCashOpexCells[p] = new Cell({
      expr: '@table["foa_revenue", @col] - @table["foa_operating_income", @col] - CashFlowStatement["depreciation_and_amortization", @col]',
      note:
        p === "9M26A"
          ? "Includes $13,070M discrete 9M26 multistate AG legal ($11,890M) and May 2026 severance ($1,180M) charges."
          : undefined,
    })
  }
  foaCashOpexCells["LTM Q3 26"] = new Cell({
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  })
  foaCashOpexCells["Q4 26E"] = new Cell({
    expr: '@table["total_costs_gaap", "Q4 26E"] - PpeSchedule["da_flow", "2026E"] - @table["rl_total_costs", "Q4 26E"]',
  })
  foaCashOpexCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    foaCashOpexCells[p] = new Cell({
      expr: '@table["foa_revenue", @col] * VectorDriversActive["foaCashOpexPctFoaRev", @col]',
    })
  }
  seg.addRow("foa_cash_opex", {
    cells: foaCashOpexCells,
    format: "currency",
    decimals: 0,
  })

  const daSegCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Consolidated depreciation & amortization" }),
  }
  for (const p of FLOW_HIST_PERIODS) {
    daSegCells[p] = new Cell({
      expr: 'CashFlowStatement["depreciation_and_amortization", @col]',
    })
  }
  daSegCells["LTM Q3 26"] = new Cell({
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  })
  daSegCells["Q4 26E"] = new Cell({
    expr: 'PpeSchedule["da_flow", "2026E"]',
  })
  daSegCells["2026E"] = new Cell({
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  })
  for (const p of FORECAST_PERIODS) {
    daSegCells[p] = new Cell({
      expr: 'PpeSchedule["da_flow", @col]',
    })
  }
  seg.addRow("consolidated_da", {
    cells: daSegCells,
    format: "currency",
    decimals: 0,
  })

  const rlEbitCells = histCells(
    rlEbitHist,
    "Reality Labs operating income (loss)"
  )
  rlEbitCells["LTM Q3 26"] = {
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  }
  rlEbitCells["Q4 26E"] = {
    expr: 'ScalarDrivers["fy26RlOperatingLoss", "active"] - @table["rl_operating_income", "9M26A"]',
  }
  rlEbitCells["2026E"] = {
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  }
  for (const p of FORECAST_PERIODS) {
    rlEbitCells[p] = {
      expr: 'VectorDriversActive["rlOperatingLoss", @col]',
    }
  }
  seg.addRow("rl_operating_income", {
    cells: rlEbitCells,
    format: "currency",
    decimals: 0,
  })

  const rlCostCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Reality Labs total operating costs" }),
  }
  for (const p of FLOW_ALL_PERIODS) {
    rlCostCells[p] = new Cell({
      expr: '@table["rl_revenue", @col] - @table["rl_operating_income", @col]',
    })
  }
  seg.addRow("rl_total_costs", {
    cells: rlCostCells,
    format: "currency",
    decimals: 0,
  })

  const totCostCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Consolidated total costs & expenses (GAAP)" }),
  }
  for (const p of FLOW_ALL_PERIODS) {
    if (p === "Q4 26E") {
      totCostCells[p] = new Cell({
        expr: 'ScalarDrivers["fy26TotalGaapExpenses", "active"] - IncomeStatement["total_costs_and_expenses", "9M26A"]',
      })
    } else if (p === "2026E") {
      totCostCells[p] = new Cell({
        expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
      })
    } else if (p === "LTM Q3 26") {
      totCostCells[p] = new Cell({
        expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
      })
    } else {
      totCostCells[p] = new Cell({
        expr: '@table["foa_cash_opex", @col] + @table["consolidated_da", @col] + @table["rl_total_costs", @col]',
      })
    }
  }
  seg.addRow("total_costs_gaap", {
    cells: totCostCells,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  const foaEbitCells = histCells(foaEbitHist, "Family of Apps operating income")
  foaEbitCells["LTM Q3 26"] = {
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  }
  foaEbitCells["Q4 26E"] = {
    expr: '@table["foa_revenue", "Q4 26E"] - @table["foa_cash_opex", "Q4 26E"] - @table["consolidated_da", "Q4 26E"]',
  }
  foaEbitCells["2026E"] = {
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  }
  for (const p of FORECAST_PERIODS) {
    foaEbitCells[p] = {
      expr: '@table["foa_revenue", @col] - @table["foa_cash_opex", @col] - @table["consolidated_da", @col]',
    }
  }
  seg.addRow("foa_operating_income", {
    cells: foaEbitCells,
    format: "currency",
    decimals: 0,
  })

  const totEbitCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Consolidated operating income (GAAP)" }),
  }
  for (const p of FLOW_ALL_PERIODS) {
    totEbitCells[p] = new Cell({
      expr: '@table["foa_operating_income", @col] + @table["rl_operating_income", @col]',
    })
  }
  seg.addRow("total_operating_income", {
    cells: totEbitCells,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  const sbcCells = histCells(
    sbcHist,
    "Memo: Share-based compensation (in OpEx)"
  )
  sbcCells["LTM Q3 26"] = {
    expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
  }
  sbcCells["Q4 26E"] = {
    expr: '@table["total_revenue", "Q4 26E"] * ScalarDrivers["q4SbcPctRevenue", "active"]',
  }
  sbcCells["2026E"] = {
    expr: '@table[@row, "9M26A"] + @table[@row, "Q4 26E"]',
  }
  for (const p of FORECAST_PERIODS) {
    sbcCells[p] = {
      expr: '@table["total_revenue", @col] * VectorDriversActive["sbcPctRevenue", @col]',
    }
  }
  seg.addRow("sbc_total", {
    cells: sbcCells,
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // 2. PP&E, CapEx & Depreciation Schedule (BS Timeline)
  // =========================================================================
  const ppe = sheet.addTable(
    "PpeSchedule",
    "Property & Equipment Roll-Forward, CapEx & Depreciation Wave",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "2026E flow columns reflect Q4 2026E stub rolling from Q3 2026A ($253.2B net PP&E); opening-balance D&A basis",
      ],
      below: seg,
    }
  )
  ppe.addColumn("label", { role: "descriptor", header: "PP&E / CapEx Line" })
  addTimelineColumns(ppe, "bs")

  const ppeNetHist = data.bsSeries(
    "balance_sheet",
    "property_and_equipment_net"
  )
  const ppeSrvHist = data.bsSeries("ppe_detail", "servers_and_network_assets")
  const ppeBldgHist = data.bsSeries("ppe_detail", "buildings")
  const ppeCipHist = data.bsSeries("ppe_detail", "construction_in_progress")
  const ppeFlRouHist = data.bsSeries("ppe_detail", "finance_lease_rou_assets")
  const ppeGrossHist = data.bsSeries("ppe_detail", "ppe_gross")
  const ppeAccDepHist = data.bsSeries("ppe_detail", "accumulated_depreciation")

  const bsHistRow = (
    series: Readonly<Record<BsHistPeriod, number>>,
    label: string,
    sparseNotes?: Readonly<Partial<Record<BsHistPeriod, string>>>
  ): Record<string, Cell | number | null> => {
    const out: Record<string, Cell | number | null> = {
      label: new Cell({ value: label }),
    }
    for (const p of BS_HIST_PERIODS) {
      const cNote = sparseNotes?.[p]
      out[p] =
        cNote !== undefined
          ? new Cell({ value: series[p], note: cNote })
          : series[p]
    }
    for (const p of BS_FORECAST_PERIODS) {
      out[p] = null
    }
    return out
  }

  ppe.addSectionHeader("Historical gross PP&E asset composition")
  ppe.addRow("servers_and_network", {
    cells: bsHistRow(ppeSrvHist, "Servers & network assets (5.5-yr life)", {
      "2025A":
        "Useful life extended to 5.5 years effective Jan 1, 2025 (reduced FY25 D&A by $2,920M).",
    }),
    format: "currency",
    decimals: 0,
  })
  ppe.addRow("buildings", {
    cells: bsHistRow(ppeBldgHist, "Data center & office buildings"),
    format: "currency",
    decimals: 0,
  })
  ppe.addRow("construction_in_progress", {
    cells: bsHistRow(ppeCipHist, "Construction in progress (CIP)", {
      "Q3 26A":
        "$89.5B CIP at Q3 2026 commissions into depreciable AI data centers across FY2027E–FY2029E.",
    }),
    format: "currency",
    decimals: 0,
  })
  ppe.addRow("finance_lease_rou", {
    cells: bsHistRow(ppeFlRouHist, "Finance lease ROU assets"),
    format: "currency",
    decimals: 0,
  })
  ppe.addRow("ppe_gross", {
    cells: bsHistRow(ppeGrossHist, "Total gross PP&E (audited)"),
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  ppe.addRow("accumulated_depreciation", {
    cells: bsHistRow(ppeAccDepHist, "Less: Accumulated depreciation"),
    format: "currency",
    decimals: 0,
  })

  ppe.addRowGutter()
  ppe.addSectionHeader("Net PP&E roll-forward & depreciation wave")

  const begPpeCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Opening net PP&E" }),
    "2022A": null,
  }
  for (const p of BS_ALL_PERIODS.slice(1)) {
    begPpeCells[p] = new Cell({ expr: '@table["ending_net_ppe", col.prev]' })
  }
  ppe.addRow("opening_net_ppe", {
    cells: begPpeCells,
    format: "currency",
    decimals: 0,
  })

  const capexFlowCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Total CapEx additions (incl. finance leases)" }),
    "2022A": new Cell({
      expr: '-CashFlowStatement["capex_ppe", "2022A"] - CashFlowStatement["finance_lease_principal", "2022A"]',
    }),
    "2023A": new Cell({
      expr: '-CashFlowStatement["capex_ppe", "2023A"] - CashFlowStatement["finance_lease_principal", "2023A"]',
    }),
    "2024A": new Cell({
      expr: '-CashFlowStatement["capex_ppe", "2024A"] - CashFlowStatement["finance_lease_principal", "2024A"]',
    }),
    "2025A": new Cell({
      expr: '-CashFlowStatement["capex_ppe", "2025A"] - CashFlowStatement["finance_lease_principal", "2025A"]',
    }),
    "Q3 26A": new Cell({
      expr: '-CashFlowStatement["capex_ppe", "9M26A"] - CashFlowStatement["finance_lease_principal", "9M26A"]',
    }),
    "2026E": new Cell({
      expr: 'ScalarDrivers["fy26TotalCapex", "active"] - (-CashFlowStatement["capex_ppe", "9M26A"] - CashFlowStatement["finance_lease_principal", "9M26A"])',
      note: "Q4 2026E stub CapEx (FY26E guidance less 9M26A actuals) rolling from Q3 2026A net PP&E.",
    }),
  }
  for (const p of FORECAST_PERIODS) {
    capexFlowCells[p] = new Cell({
      expr: 'SegmentBuild["total_revenue", @col] * VectorDriversActive["capexPctRevenue", @col]',
    })
  }
  ppe.addRow("total_capex_flow", {
    cells: capexFlowCells,
    format: "currency",
    decimals: 0,
  })

  const capexPpeSplit: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Cash PP&E purchases", indent: 1 }),
    "2022A": new Cell({ expr: '-CashFlowStatement["capex_ppe", "2022A"]' }),
    "2023A": new Cell({ expr: '-CashFlowStatement["capex_ppe", "2023A"]' }),
    "2024A": new Cell({ expr: '-CashFlowStatement["capex_ppe", "2024A"]' }),
    "2025A": new Cell({ expr: '-CashFlowStatement["capex_ppe", "2025A"]' }),
    "Q3 26A": new Cell({ expr: '-CashFlowStatement["capex_ppe", "9M26A"]' }),
  }
  for (const p of BS_FORECAST_PERIODS) {
    capexPpeSplit[p] = new Cell({
      expr: '@table["total_capex_flow", @col] * (1 - ScalarDrivers["financeLeaseCapexShare", "active"])',
    })
  }
  ppe.addRow("capex_ppe_additions", {
    cells: capexPpeSplit,
    format: "currency",
    decimals: 0,
  })

  const flCapexSplit: Record<string, Cell | number | null> = {
    label: new Cell({
      value: "Finance lease principal / ROU additions",
      indent: 1,
    }),
    "2022A": new Cell({
      expr: '-CashFlowStatement["finance_lease_principal", "2022A"]',
    }),
    "2023A": new Cell({
      expr: '-CashFlowStatement["finance_lease_principal", "2023A"]',
    }),
    "2024A": new Cell({
      expr: '-CashFlowStatement["finance_lease_principal", "2024A"]',
    }),
    "2025A": new Cell({
      expr: '-CashFlowStatement["finance_lease_principal", "2025A"]',
    }),
    "Q3 26A": new Cell({
      expr: '-CashFlowStatement["finance_lease_principal", "9M26A"]',
    }),
  }
  for (const p of BS_FORECAST_PERIODS) {
    flCapexSplit[p] = new Cell({
      expr: '@table["total_capex_flow", @col] * ScalarDrivers["financeLeaseCapexShare", "active"]',
    })
  }
  ppe.addRow("finance_lease_capex", {
    cells: flCapexSplit,
    format: "currency",
    decimals: 0,
  })

  const daFlowCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Depreciation & amortization (D&A)" }),
    "2022A": new Cell({
      expr: 'CashFlowStatement["depreciation_and_amortization", "2022A"]',
    }),
    "2023A": new Cell({
      expr: 'CashFlowStatement["depreciation_and_amortization", "2023A"]',
    }),
    "2024A": new Cell({
      expr: 'CashFlowStatement["depreciation_and_amortization", "2024A"]',
    }),
    "2025A": new Cell({
      expr: 'CashFlowStatement["depreciation_and_amortization", "2025A"]',
    }),
    "Q3 26A": new Cell({
      expr: 'CashFlowStatement["depreciation_and_amortization", "9M26A"]',
    }),
    "2026E": new Cell({
      expr: '@table["opening_net_ppe", "2026E"] * ScalarDrivers["q4DaAnnualizedRate", "active"] / 4',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    daFlowCells[p] = new Cell({
      expr: '@table["opening_net_ppe", @col] * VectorDriversActive["daPctBegNetPpe", @col]',
    })
  }
  ppe.addRow("da_flow", {
    cells: daFlowCells,
    format: "currency",
    decimals: 0,
  })

  const endPpeCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Ending net PP&E" }),
  }
  for (const p of BS_HIST_PERIODS) {
    endPpeCells[p] = ppeNetHist[p]
  }
  for (const p of BS_FORECAST_PERIODS) {
    endPpeCells[p] = new Cell({
      expr: '@table["opening_net_ppe", @col] + @table["total_capex_flow", @col] - @table["da_flow", @col]',
    })
  }
  ppe.addRow("ending_net_ppe", {
    cells: endPpeCells,
    format: "currency",
    decimals: 0,
    style: "total",
  })

  // =========================================================================
  // 3. Working Capital & Legal Accruals Isolation Schedule (BS Timeline)
  // =========================================================================
  const wc = sheet.addTable(
    "WorkingCapitalSchedule",
    "Operating Working Capital & Non-Operating Accrual Isolation",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Isolates debt-like accrued legal liabilities ($19.9B) and current LT debt ($2.7B) from operating NWC",
      ],
      below: ppe,
    }
  )
  wc.addColumn("label", { role: "descriptor", header: "Working Capital Line" })
  addTimelineColumns(wc, "bs")

  const arHist = data.bsSeries("balance_sheet", "accounts_receivable_net")
  const prepHist = data.bsSeries(
    "balance_sheet",
    "prepaid_expenses_and_other_current_assets"
  )
  const apHist = data.bsSeries("balance_sheet", "accounts_payable")
  const partHist = data.bsSeries("balance_sheet", "partners_payable", {
    zeroPeriods: ["2023A", "2024A", "2025A", "Q3 26A"],
    defaultZero: true,
  })
  const legCurHist = data.bsSeries(
    "liabilities_detail",
    "legal_accruals_current",
    { defaultZero: true }
  )
  const legNcHist = data.bsSeries(
    "liabilities_detail",
    "legal_accruals_noncurrent",
    { defaultZero: true }
  )
  const ltdCurHist = data.bsSeries(
    "liabilities_detail",
    "long_term_debt_current",
    { defaultZero: true }
  )

  wc.addSectionHeader("Operating working capital balances")

  const wcRow = (
    hist: Readonly<Record<BsHistPeriod, number>>,
    label: string,
    forecastExpr: string,
    sparseHistNotes?: Readonly<Partial<Record<BsHistPeriod, string>>>
  ): Record<string, Cell | number> => {
    const out: Record<string, Cell | number> = {
      label: new Cell({ value: label }),
    }
    for (const p of BS_HIST_PERIODS) {
      const cNote = sparseHistNotes?.[p]
      out[p] =
        cNote !== undefined
          ? new Cell({ value: hist[p], note: cNote })
          : hist[p]
    }
    for (const p of BS_FORECAST_PERIODS) {
      out[p] = new Cell({ expr: forecastExpr })
    }
    return out
  }

  wc.addRow("accounts_receivable", {
    cells: wcRow(
      arHist,
      "Accounts receivable, net",
      'SegmentBuild["total_revenue", @col] * ScalarDrivers["arDays", "active"] / 365'
    ),
    format: "currency",
    decimals: 0,
  })
  wc.addRow("prepaid_and_other_current", {
    cells: wcRow(
      prepHist,
      "Prepaid expenses & other current assets",
      'SegmentBuild["total_revenue", @col] * ScalarDrivers["prepaidPctRevenue", "active"]'
    ),
    format: "currency",
    decimals: 0,
  })
  const apCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Accounts payable" }),
  }
  for (const p of BS_HIST_PERIODS) {
    apCells[p] = apHist[p]
  }
  apCells["2026E"] = new Cell({
    expr: 'SegmentBuild["total_revenue", "2026E"] * VectorDriversActive["apPctRevenue", "2027E"]',
  })
  for (const p of FORECAST_PERIODS) {
    apCells[p] = new Cell({
      expr: 'SegmentBuild["total_revenue", @col] * VectorDriversActive["apPctRevenue", @col]',
    })
  }
  wc.addRow("accounts_payable", {
    cells: apCells,
    format: "currency",
    decimals: 0,
  })
  wc.addRow("partners_payable", {
    cells: wcRow(partHist, "Partners payable (legacy)", "0", {
      "2023A":
        "Folded into accrued expenses starting in FY2024 Form 10-K comparative presentation.",
    }),
    format: "currency",
    decimals: 0,
  })

  const opAccrCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Operating accrued exp. (ex-legal & debt)" }),
  }
  for (const p of BS_HIST_PERIODS) {
    opAccrCells[p] = new Cell({
      expr: 'BalanceSheet["accrued_expenses_and_other_current_liabilities", @col] - @table["legal_accruals_current", @col] - DebtHybridShareSchedule["current_portion_lt_debt", @col]',
    })
  }
  opAccrCells["2026E"] = new Cell({
    expr: 'SegmentBuild["total_revenue", "2026E"] * VectorDriversActive["opAccruedPctRevenue", "2027E"]',
  })
  for (const p of FORECAST_PERIODS) {
    opAccrCells[p] = new Cell({
      expr: 'SegmentBuild["total_revenue", @col] * VectorDriversActive["opAccruedPctRevenue", @col]',
    })
  }
  wc.addRow("operating_accrued_expenses", {
    cells: opAccrCells,
    format: "currency",
    decimals: 0,
  })

  wc.addRow("operating_nwc", {
    cells: {
      label: new Cell({ value: "Net operating working capital (NWC)" }),
    },
    expr: '@table["accounts_receivable", @col] + @table["prepaid_and_other_current", @col] - @table["accounts_payable", @col] - @table["partners_payable", @col] - @table["operating_accrued_expenses", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  wc.addRowGutter()
  wc.addSectionHeader("Working capital cash flow changes (roll-forward)")

  const makeDeltaRow = (
    id: string,
    label: string,
    targetRow: string,
    sign: 1 | -1
  ): void => {
    const cells: Record<string, Cell | number | null> = {
      label: new Cell({ value: label }),
      "2022A": null,
    }
    const expr =
      sign === -1
        ? `-(@table["${targetRow}", @col] - @table["${targetRow}", col.prev])`
        : `@table["${targetRow}", @col] - @table["${targetRow}", col.prev]`
    for (const p of BS_ALL_PERIODS.slice(1)) {
      cells[p] = new Cell({ expr })
    }
    wc.addRow(id, { cells, format: "currency", decimals: 0 })
  }

  makeDeltaRow(
    "cf_chg_ar",
    "Cash flow impact: Accounts receivable",
    "accounts_receivable",
    -1
  )
  makeDeltaRow(
    "cf_chg_prepaid",
    "Cash flow impact: Prepaid & other cur.",
    "prepaid_and_other_current",
    -1
  )
  makeDeltaRow(
    "cf_chg_ap",
    "Cash flow impact: Accounts payable",
    "accounts_payable",
    1
  )
  makeDeltaRow(
    "cf_chg_op_accr",
    "Cash flow impact: Operating accrued expenses",
    "operating_accrued_expenses",
    1
  )

  const chgNwcCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Change in operating NWC (+ = cash outflow)" }),
    "2022A": null,
  }
  for (const p of BS_ALL_PERIODS.slice(1)) {
    chgNwcCells[p] = new Cell({
      expr: '@table["operating_nwc", @col] - @table["operating_nwc", col.prev]',
    })
  }
  wc.addRow("chg_operating_nwc", {
    cells: chgNwcCells,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  wc.addRowGutter()
  wc.addSectionHeader(
    "Isolated non-operating accrued legal liabilities (Note 8)"
  )

  const legalPayoutCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Cash payout of accrued legal (ex-DCF)" }),
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "Q3 26A": null,
    "2026E": 0,
  }
  for (const p of FORECAST_PERIODS) {
    legalPayoutCells[p] = new Cell({
      expr: '-MIN(@table["total_legal_accruals", col.prev], ScalarDrivers["annualLegalSettlementPayout", "active"])',
      note:
        p === "2027E"
          ? "Scheduled installment payouts on 3-statement BS/CFS; excluded from unlevered DCF to prevent double-counting with the EV bridge deduction."
          : undefined,
    })
  }
  wc.addRow("legal_cash_payout", {
    cells: legalPayoutCells,
    format: "currency",
    decimals: 0,
  })

  const legCurCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Accrued legal liabilities — current" }),
  }
  for (const p of BS_HIST_PERIODS) {
    legCurCells[p] = legCurHist[p]
  }
  legCurCells["2026E"] = new Cell({
    expr: '@table["legal_accruals_current", "Q3 26A"]',
  })
  for (const p of FORECAST_PERIODS) {
    legCurCells[p] = new Cell({
      expr: 'MAX(0, @table["legal_accruals_current", col.prev] + @table["legal_cash_payout", @col])',
    })
  }
  wc.addRow("legal_accruals_current", {
    cells: legCurCells,
    format: "currency",
    decimals: 0,
  })

  const legNcCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Accrued legal liabilities — non-current" }),
  }
  for (const p of BS_HIST_PERIODS) {
    legNcCells[p] = legNcHist[p]
  }
  legNcCells["2026E"] = new Cell({
    expr: '@table["legal_accruals_noncurrent", "Q3 26A"]',
  })
  for (const p of FORECAST_PERIODS) {
    legNcCells[p] = new Cell({
      expr: 'MAX(0, @table["legal_accruals_noncurrent", col.prev] + MIN(0, @table["legal_accruals_current", col.prev] + @table["legal_cash_payout", @col]))',
    })
  }
  wc.addRow("legal_accruals_noncurrent", {
    cells: legNcCells,
    format: "currency",
    decimals: 0,
  })

  wc.addRow("total_legal_accruals", {
    cells: {
      label: new Cell({ value: "Total debt-like accrued legal liabilities" }),
    },
    expr: '@table["legal_accruals_current", @col] + @table["legal_accruals_noncurrent", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  makeDeltaRow(
    "cf_chg_legal_cur",
    "Cash flow impact: Current accrued legal payout",
    "legal_accruals_current",
    1
  )
  makeDeltaRow(
    "cf_chg_legal_nc",
    "Cash flow impact: Non-cur. legal payout",
    "legal_accruals_noncurrent",
    1
  )

  // =========================================================================
  // 4. Pro Forma Debt, Hybrid, Liquidity Sweep & Share Count Roll-Forward
  // =========================================================================
  const debt = sheet.addTable(
    "DebtHybridShareSchedule",
    "Pro Forma Debt, Mandatory Convertible Preferred, Revolver & Share Roll-Forward",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Opening-balance interest basis; incorporates Nov 2026 USD/EUR notes, Oct 2026 METAM preferred & Nov 2026 forward equity",
      ],
      below: wc,
    }
  )
  debt.addColumn("label", {
    role: "descriptor",
    header: "Capital Structure Line",
  })
  addTimelineColumns(debt, "bs")

  const ltdHist = data.bsSeries("balance_sheet", "long_term_debt")
  const mat2028 = data.val("debt_schedule", "maturity_2028", "2026-Q3", {
    entity: "META",
  })
  const mat2029 = data.val("debt_schedule", "maturity_2029", "2026-Q3", {
    entity: "META",
  })
  const mat2030 = data.val("debt_schedule", "maturity_2030", "2026-Q3", {
    entity: "META",
  })

  debt.addSectionHeader("Senior notes carrying balance & maturity roll-forward")

  const openNotes: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Opening total senior notes (carrying)" }),
    "2022A": null,
  }
  for (const p of BS_ALL_PERIODS.slice(1)) {
    openNotes[p] = new Cell({
      expr: '@table["ending_total_senior_notes", col.prev]',
    })
  }
  debt.addRow("opening_total_senior_notes", {
    cells: openNotes,
    format: "currency",
    decimals: 0,
  })

  const newUsd: Record<string, Cell | number | null> = {
    label: new Cell({ value: "New USD senior notes issued (Nov 5, 2026)" }),
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "Q3 26A": null,
    "2026E": new Cell({
      expr: 'PostQ3FinancingRegistry["nov_usd_notes_total", "val"]',
    }),
    "2027E": 0,
    "2028E": 0,
    "2029E": 0,
    "2030E": 0,
    "2031E": 0,
  }
  debt.addRow("new_usd_notes", {
    cells: newUsd,
    format: "currency",
    decimals: 0,
  })

  const newEur: Record<string, Cell | number | null> = {
    label: new Cell({ value: "New EUR senior notes (Nov 12, USD equiv.)" }),
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "Q3 26A": null,
    "2026E": new Cell({
      expr: 'PostQ3FinancingRegistry["nov_eur_notes_total_usd", "val"]',
    }),
    "2027E": 0,
    "2028E": 0,
    "2029E": 0,
    "2030E": 0,
    "2031E": 0,
  }
  debt.addRow("new_eur_notes_usd", {
    cells: newEur,
    format: "currency",
    decimals: 0,
  })

  const schedMat: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Scheduled senior note maturities" }),
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "Q3 26A": null,
    "2026E": 0,
    "2027E": new Cell({ expr: '-@table["current_portion_lt_debt", "Q3 26A"]' }),
    "2028E": -mat2028,
    "2029E": -mat2029,
    "2030E": -mat2030,
    "2031E": new Cell({
      expr: '-(PostQ3FinancingRegistry["nov_usd_2031", "val"] + PostQ3FinancingRegistry["nov_eur_2031_usd", "val"])',
      note: "Reflects Nov 2026 USD ($3.25B) + EUR (€1.75B) 2031 senior note maturities.",
    }),
  }
  debt.addRow("scheduled_maturities", {
    cells: schedMat,
    format: "currency",
    decimals: 0,
  })

  const endNotes: Record<string, Cell | number> = {
    label: new Cell({ value: "Ending total senior notes (carrying)" }),
  }
  for (const p of BS_HIST_PERIODS) {
    endNotes[p] = new Cell({
      expr: '@table["ending_long_term_debt", @col] + @table["current_portion_lt_debt", @col]',
    })
  }
  for (const p of BS_FORECAST_PERIODS) {
    endNotes[p] = new Cell({
      expr: '@table["opening_total_senior_notes", @col] + @table["new_usd_notes", @col] + @table["new_eur_notes_usd", @col] + @table["scheduled_maturities", @col]',
    })
  }
  debt.addRow("ending_total_senior_notes", {
    cells: endNotes,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  const curLtd: Record<string, Cell | number> = {
    label: new Cell({ value: "Current portion of long-term debt" }),
  }
  for (const p of BS_HIST_PERIODS) {
    curLtd[p] =
      p === "Q3 26A"
        ? new Cell({
            value: ltdCurHist[p],
            note: "Sits inside accrued expenses & other current liabilities per Form 10-Q Notes 8 & 9.",
          })
        : ltdCurHist[p]
  }
  curLtd["2026E"] = new Cell({
    expr: '-@table["scheduled_maturities", "2027E"]',
  })
  curLtd["2027E"] = new Cell({
    expr: '-@table["scheduled_maturities", "2028E"]',
  })
  curLtd["2028E"] = new Cell({
    expr: '-@table["scheduled_maturities", "2029E"]',
  })
  curLtd["2029E"] = new Cell({
    expr: '-@table["scheduled_maturities", "2030E"]',
  })
  curLtd["2030E"] = new Cell({
    expr: '-@table["scheduled_maturities", "2031E"]',
  })
  curLtd["2031E"] = 0
  debt.addRow("current_portion_lt_debt", {
    cells: curLtd,
    format: "currency",
    decimals: 0,
  })

  const endLtd: Record<string, Cell | number> = {
    label: new Cell({ value: "Ending long-term debt (non-current)" }),
  }
  for (const p of BS_HIST_PERIODS) {
    endLtd[p] = ltdHist[p]
  }
  for (const p of BS_FORECAST_PERIODS) {
    endLtd[p] = new Cell({
      expr: '@table["ending_total_senior_notes", @col] - @table["current_portion_lt_debt", @col]',
    })
  }
  debt.addRow("ending_long_term_debt", {
    cells: endLtd,
    format: "currency",
    decimals: 0,
  })

  // Section 2: Liquidity Buffer & Short-Term Revolver Sweep
  debt.addRowGutter()
  debt.addSectionHeader("Liquidity buffer & short-term revolver sweep")

  const openRev: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Opening short-term revolver" }),
    "2022A": 0,
    "2023A": 0,
    "2024A": 0,
    "2025A": 0,
    "Q3 26A": 0,
  }
  for (const p of BS_FORECAST_PERIODS) {
    openRev[p] = new Cell({ expr: '@table["ending_revolver", col.prev]' })
  }
  debt.addRow("opening_revolver", {
    cells: openRev,
    format: "currency",
    decimals: 0,
  })

  const escrowTotal = data.val(
    "leases_and_commitments",
    "restricted_cash_escrow_infra",
    "2026-Q3",
    { entity: "META" }
  )
  debt.addRow("escrow_cash_release", {
    cells: {
      label: new Cell({ value: "Infrastructure escrow release to cash" }),
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "Q3 26A": 0,
      "2026E": 0,
      "2027E": 0,
      "2028E": new Cell({
        value: escrowTotal / 3,
        note: "$10,800M infrastructure escrow (Q3 2026 Notes 4 & 10) releasing ratably ($3,600M/yr) across FY2028E–FY2030E.",
      }),
      "2029E": escrowTotal / 3,
      "2030E": escrowTotal / 3,
      "2031E": 0,
    },
    format: "currency",
    decimals: 0,
  })

  const preRevCash: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Unrestricted cash & sec. pre-revolver" }),
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "Q3 26A": null,
    "2026E": new Cell({
      expr: 'BalanceSheet["total_cash_and_mkt_sec", "Q3 26A"] + CashFlowStatement["cfo", "Q4 26E"] + CashFlowStatement["cfi_ex_mkt_sec", "Q4 26E"] + CashFlowStatement["cff_ex_revolver", "Q4 26E"] + @table["escrow_cash_release", "2026E"]',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    preRevCash[p] = new Cell({
      expr: 'BalanceSheet["total_cash_and_mkt_sec", col.prev] + CashFlowStatement["cfo", @col] + CashFlowStatement["cfi_ex_mkt_sec", @col] + CashFlowStatement["cff_ex_revolver", @col] + @table["escrow_cash_release", @col]',
    })
  }
  debt.addRow("pre_revolver_liquid_cash", {
    cells: preRevCash,
    format: "currency",
    decimals: 0,
  })

  const revDraw: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Revolver draw / (repayment)" }),
    "2022A": 0,
    "2023A": 0,
    "2024A": 0,
    "2025A": 0,
    "Q3 26A": 0,
  }
  for (const p of BS_FORECAST_PERIODS) {
    revDraw[p] = new Cell({
      expr: 'IF(@table["pre_revolver_liquid_cash", @col] < ScalarDrivers["minimumOperatingCash", "active"], ScalarDrivers["minimumOperatingCash", "active"] - @table["pre_revolver_liquid_cash", @col], -MIN(@table["opening_revolver", @col], @table["pre_revolver_liquid_cash", @col] - ScalarDrivers["minimumOperatingCash", "active"]))',
    })
  }
  debt.addRow("revolver_draw_repay", {
    cells: revDraw,
    format: "currency",
    decimals: 0,
  })

  const endRev: Record<string, Cell | number> = {
    label: new Cell({ value: "Ending short-term revolver" }),
    "2022A": 0,
    "2023A": 0,
    "2024A": 0,
    "2025A": 0,
    "Q3 26A": 0,
  }
  for (const p of BS_FORECAST_PERIODS) {
    endRev[p] = new Cell({
      expr: '@table["opening_revolver", @col] + @table["revolver_draw_repay", @col]',
    })
  }
  debt.addRow("ending_revolver", {
    cells: endRev,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  const endLiqCash: Record<string, Cell | number> = {
    label: new Cell({ value: "Ending unrestricted cash & securities" }),
  }
  for (const p of BS_HIST_PERIODS) {
    endLiqCash[p] = new Cell({
      expr: 'BalanceSheet["total_cash_and_mkt_sec", @col]',
    })
  }
  for (const p of BS_FORECAST_PERIODS) {
    endLiqCash[p] = new Cell({
      expr: '@table["pre_revolver_liquid_cash", @col] + @table["revolver_draw_repay", @col]',
    })
  }
  debt.addRow("ending_liquid_cash", {
    cells: endLiqCash,
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Section 3: Opening-Balance Interest Income & Expense
  debt.addRowGutter()
  debt.addSectionHeader(
    "Interest income & interest expense (opening-balance basis)"
  )

  const intIncCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Interest income (opening cash & sec.)" }),
    "2022A": data.val(
      "interest_and_other_detail",
      "interest_income",
      "2022-FY",
      { entity: "META" }
    ),
    "2023A": data.val(
      "interest_and_other_detail",
      "interest_income",
      "2023-FY",
      { entity: "META" }
    ),
    "2024A": data.val(
      "interest_and_other_detail",
      "interest_income",
      "2024-FY",
      { entity: "META" }
    ),
    "2025A": data.val(
      "interest_and_other_detail",
      "interest_income",
      "2025-FY",
      { entity: "META" }
    ),
    "Q3 26A": data.val(
      "interest_and_other_detail",
      "interest_income",
      "2026-Q3-YTD",
      { entity: "META" }
    ),
    "2026E": new Cell({
      expr: 'BalanceSheet["total_cash_and_mkt_sec", "Q3 26A"] * ScalarDrivers["cashYieldRate", "active"] / 4',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    intIncCells[p] = new Cell({
      expr: 'BalanceSheet["total_cash_and_mkt_sec", col.prev] * ScalarDrivers["cashYieldRate", "active"]',
    })
  }
  debt.addRow("interest_income", {
    cells: intIncCells,
    format: "currency",
    decimals: 0,
  })

  const intExpCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Interest expense (opening & Nov notes)" }),
    "2022A": data.val(
      "interest_and_other_detail",
      "interest_expense",
      "2022-FY",
      { entity: "META" }
    ),
    "2023A": data.val(
      "interest_and_other_detail",
      "interest_expense",
      "2023-FY",
      { entity: "META" }
    ),
    "2024A": data.val(
      "interest_and_other_detail",
      "interest_expense",
      "2024-FY",
      { entity: "META" }
    ),
    "2025A": data.val(
      "interest_and_other_detail",
      "interest_expense",
      "2025-FY",
      { entity: "META" }
    ),
    "Q3 26A": data.val(
      "interest_and_other_detail",
      "interest_expense",
      "2026-Q3-YTD",
      { entity: "META" }
    ),
    "2026E": new Cell({
      expr: '-(@table["opening_total_senior_notes", "2026E"] * ScalarDrivers["legacyDebtAvgCoupon", "active"] / 4 + PostQ3FinancingRegistry["nov_usd_notes_total", "val"] * PostQ3FinancingRegistry["nov_usd_notes_total", "coupon"] * 56 / 365 + PostQ3FinancingRegistry["nov_eur_notes_total_usd", "val"] * PostQ3FinancingRegistry["nov_eur_notes_total_usd", "coupon"] * 49 / 365)',
      note: "Q4 2026E quarterly interest on opening debt plus prorated Nov 5 USD (56 days) and Nov 12 EUR (49 days) note coupons.",
    }),
  }
  for (const p of FORECAST_PERIODS) {
    intExpCells[p] = new Cell({
      expr: '-(MAX(0, @table["opening_total_senior_notes", @col] - PostQ3FinancingRegistry["total_closed_q4_debt", "val"]) * ScalarDrivers["legacyDebtAvgCoupon", "active"] + PostQ3FinancingRegistry["nov_usd_notes_total", "val"] * PostQ3FinancingRegistry["nov_usd_notes_total", "coupon"] + PostQ3FinancingRegistry["nov_eur_notes_total_usd", "val"] * PostQ3FinancingRegistry["nov_eur_notes_total_usd", "coupon"] + @table["opening_revolver", @col] * ScalarDrivers["revolverRate", "active"])',
    })
  }
  debt.addRow("interest_expense", {
    cells: intExpCells,
    format: "currency",
    decimals: 0,
  })

  debt.addRow("net_interest", {
    cells: { label: new Cell({ value: "Net interest income (expense)" }) },
    expr: '@table["interest_income", @col] + @table["interest_expense", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Section 4: Mandatory Convertible Preferred & Forward Equity
  debt.addRowGutter()
  debt.addSectionHeader("Mandatory convertible preferred & forward equity sale")

  const mcpBeg: Record<string, Cell | number> = {
    label: new Cell({ value: "Opening mandatory convertible preferred" }),
    "2022A": 0,
    "2023A": 0,
    "2024A": 0,
    "2025A": 0,
    "Q3 26A": 0,
  }
  for (const p of BS_FORECAST_PERIODS) {
    mcpBeg[p] = new Cell({ expr: '@table["mcp_ending", col.prev]' })
  }
  debt.addRow("mcp_opening", { cells: mcpBeg, format: "currency", decimals: 0 })

  debt.addRow("mcp_issuance", {
    cells: {
      label: new Cell({ value: "Mandatory conv. preferred issuance" }),
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "Q3 26A": 0,
      "2026E": new Cell({
        expr: 'PostQ3FinancingRegistry["mcp_base_liq_pref", "val"]',
      }),
      "2027E": 0,
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
    },
    format: "currency",
    decimals: 0,
  })

  debt.addRow("mcp_conversion", {
    cells: {
      label: new Cell({ value: "Mandatory conversion to Class A (2029)" }),
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "Q3 26A": 0,
      "2026E": 0,
      "2027E": 0,
      "2028E": 0,
      "2029E": new Cell({
        expr: '-@table["mcp_opening", "2029E"]',
        note: "Non-cash reclassification from preferred equity to common stock & APIC on Aug 15, 2029.",
      }),
      "2030E": 0,
      "2031E": 0,
    },
    format: "currency",
    decimals: 0,
  })

  debt.addRow("mcp_ending", {
    cells: {
      label: new Cell({ value: "Ending mandatory convertible preferred" }),
    },
    expr: '@table["mcp_opening", @col] + @table["mcp_issuance", @col] + @table["mcp_conversion", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  debt.addRow("mcp_preferred_dividends", {
    cells: {
      label: new Cell({ value: "Preferred cash dividends paid (6.50%)" }),
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "Q3 26A": 0,
      "2026E": new Cell({
        expr: '-(PostQ3FinancingRegistry["mcp_base_liq_pref", "val"] * PostQ3FinancingRegistry["mcp_base_liq_pref", "coupon"] * 63 / 365)',
        note: "Prorated 63 days in Q4 2026E (Oct 29–Dec 31), full year in FY27E–FY28E, and 227 days through Aug 15 conversion in FY29E.",
      }),
      "2027E": new Cell({
        expr: '-(@table["mcp_opening", "2027E"] * PostQ3FinancingRegistry["mcp_base_liq_pref", "coupon"])',
      }),
      "2028E": new Cell({
        expr: '-(@table["mcp_opening", "2028E"] * PostQ3FinancingRegistry["mcp_base_liq_pref", "coupon"])',
      }),
      "2029E": new Cell({
        expr: '-(@table["mcp_opening", "2029E"] * PostQ3FinancingRegistry["mcp_base_liq_pref", "coupon"] * 227 / 365)',
      }),
      "2030E": 0,
      "2031E": 0,
    },
    format: "currency",
    decimals: 0,
  })

  debt.addRow("fwd_equity_proceeds", {
    cells: {
      label: new Cell({ value: "Forward stock settlement proceeds (46M)" }),
      "2022A": 0,
      "2023A": 0,
      "2024A": 0,
      "2025A": 0,
      "Q3 26A": 0,
      "2026E": 0,
      "2027E": new Cell({
        expr: 'PostQ3FinancingRegistry["fwd_gross_proceeds", "val"]',
      }),
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
    },
    format: "currency",
    decimals: 0,
  })

  // Section 5: Diluted Share Count Roll-Forward
  debt.addRowGutter()
  debt.addSectionHeader("Diluted share count roll-forward (millions)")

  const dilHist: Record<BsHistPeriod, number> = {
    "2022A": data.val("income_statement", "shares_diluted", "2022-FY", {
      entity: "META",
    }),
    "2023A": data.val("income_statement", "shares_diluted", "2023-FY", {
      entity: "META",
    }),
    "2024A": data.val("income_statement", "shares_diluted", "2024-FY", {
      entity: "META",
    }),
    "2025A": data.val("income_statement", "shares_diluted", "2025-FY", {
      entity: "META",
    }),
    "Q3 26A": data.val("income_statement", "shares_diluted", "2026-Q3", {
      entity: "META",
    }),
  }

  const openSh: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Opening diluted shares (M)" }),
    "2022A": null,
  }
  for (const p of BS_ALL_PERIODS.slice(1)) {
    openSh[p] = new Cell({ expr: '@table["ending_diluted_shares", col.prev]' })
  }
  debt.addRow("opening_diluted_shares", {
    cells: openSh,
    format: "number",
    decimals: 1,
  })

  const rsuNetSh: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Net RSU shares issued (after tax withholding)" }),
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "Q3 26A": null,
    "2026E": new Cell({
      expr: 'ScalarDrivers["annualGrossRsuDilutionShares", "active"] * (1 - ScalarDrivers["rsuNetShareWithholdingRate", "active"]) / 4',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    rsuNetSh[p] = new Cell({
      expr: 'ScalarDrivers["annualGrossRsuDilutionShares", "active"] * (1 - ScalarDrivers["rsuNetShareWithholdingRate", "active"])',
    })
  }
  debt.addRow("net_rsu_shares", {
    cells: rsuNetSh,
    format: "number",
    decimals: 1,
  })

  debt.addRow("fwd_settled_shares", {
    cells: {
      label: new Cell({ value: "Forward equity settlement shares (M)" }),
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "Q3 26A": null,
      "2026E": 0,
      "2027E": new Cell({
        expr: 'PostQ3FinancingRegistry["fwd_total_shares", "val"]',
      }),
      "2028E": 0,
      "2029E": 0,
      "2030E": 0,
      "2031E": 0,
    },
    format: "number",
    decimals: 1,
  })

  debt.addRow("mcp_converted_shares", {
    cells: {
      label: new Cell({ value: "Mandatory conv. preferred shares (2029)" }),
      "2022A": null,
      "2023A": null,
      "2024A": null,
      "2025A": null,
      "Q3 26A": null,
      "2026E": 0,
      "2027E": 0,
      "2028E": 0,
      "2029E": new Cell({
        expr: 'PostQ3FinancingRegistry["mcp_max_shares", "val"]',
        note: "Applies maximum conversion rate (20.0M shares) in statement EPS schedule; DCF bridge evaluates contractual price-dependent conversion terms.",
      }),
      "2030E": 0,
      "2031E": 0,
    },
    format: "number",
    decimals: 1,
  })

  const repSh: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Shares retired via buybacks (at spot)" }),
    "2022A": null,
    "2023A": null,
    "2024A": null,
    "2025A": null,
    "Q3 26A": null,
    "2026E": 0,
  }
  for (const p of FORECAST_PERIODS) {
    repSh[p] = new Cell({
      expr: '-VectorDriversActive["annualShareRepurchases", @col] / WaccBuild["spot_price", "val"]',
    })
  }
  debt.addRow("repurchased_shares", {
    cells: repSh,
    format: "number",
    decimals: 1,
  })

  const endSh: Record<string, Cell | number> = {
    label: new Cell({ value: "Ending diluted shares (M)" }),
  }
  for (const p of BS_HIST_PERIODS) {
    endSh[p] = dilHist[p]
  }
  for (const p of BS_FORECAST_PERIODS) {
    endSh[p] = new Cell({
      expr: '@table["opening_diluted_shares", @col] + @table["net_rsu_shares", @col] + @table["fwd_settled_shares", @col] + @table["mcp_converted_shares", @col] + @table["repurchased_shares", @col]',
    })
  }
  debt.addRow("ending_diluted_shares", {
    cells: endSh,
    format: "number",
    decimals: 1,
    style: "subtotal",
  })

  const avgSh: Record<string, Cell | number> = {
    label: new Cell({ value: "Weighted average diluted shares (M)" }),
  }
  for (const p of BS_HIST_PERIODS) {
    avgSh[p] = dilHist[p]
  }
  avgSh["2026E"] = new Cell({
    expr: '(@table["opening_diluted_shares", "2026E"] + @table["ending_diluted_shares", "2026E"]) / 2',
  })
  for (const p of FORECAST_PERIODS) {
    avgSh[p] = new Cell({
      expr: '(@table["opening_diluted_shares", @col] + @table["ending_diluted_shares", @col]) / 2',
    })
  }
  debt.addRow("avg_diluted_shares", {
    cells: avgSh,
    format: "number",
    decimals: 1,
  })

  // =========================================================================
  // 5. Geographic Revenue Mix & Operating KPIs (Historical Audited, Flat)
  // =========================================================================
  const geo = sheet.addTable(
    "GeoAndKpis",
    "Geographic Revenue Disaggregation & Operating KPIs",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Meta Platforms Form 10-K (FY2023–FY2025) & Form 10-Q (Q3 2026); DAP in billions",
      ],
      below: debt,
    }
  )
  geo.addColumn("label", { role: "descriptor", header: "Region / Metric" })
  addTimelineColumns(geo, "flowHistLtm")

  const geoRows = [
    ["us_and_canada", "US & Canada"],
    ["europe", "Europe"],
    ["asia_pacific", "Asia-Pacific"],
    ["rest_of_world", "Rest of World"],
  ] as const

  geo.addSectionHeader("Revenue by geography (customer billing address)")
  for (const [rId, rLabel] of geoRows) {
    const s = data.flowSeries("revenue_by_geography", rId)
    const cells: Record<string, Cell | number> = {
      label: new Cell({ value: rLabel }),
    }
    for (const p of FLOW_HIST_PERIODS) {
      cells[p] =
        rId === "asia_pacific" && p === "2024A"
          ? new Cell({
              value: s[p],
              note: "Includes China cross-border advertiser reseller revenue: 11.2% of consolidated revenue in FY2024, below 10% in FY2025 (Form 10-K).",
            })
          : s[p]
    }
    cells["LTM Q3 26"] = new Cell({
      expr: '@table[@row, "2025A"] + @table[@row, "9M26A"] - @table[@row, "9M25A"]',
    })
    geo.addRow(rId, { cells, format: "currency", decimals: 0 })
  }
  geo.addRow("geo_total", {
    cells: { label: new Cell({ value: "Total revenue by geography" }) },
    expr: 'SUM(@table["us_and_canada".."rest_of_world", @col])',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  geo.addRowGutter()
  geo.addSectionHeader("Family of Apps scale & monetization KPIs")
  const kpiVal = (rowId: string, periodKey: string): number =>
    data.val("meta_operating_kpis", rowId, periodKey, { entity: "META" })
  const dapCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Family Daily Active People (DAP, billions)" }),
    "2021A": new Cell({
      value: null,
      note: "FY2021 DAP not printed in FY2023–FY2025 Form 10-K filings; reported DAP carries ±3% statistical estimation margin.",
    }),
    "2022A": kpiVal("family_dap", "2022-FY") / 1_000_000_000,
    "2023A": kpiVal("family_dap", "2023-FY") / 1_000_000_000,
    "2024A": kpiVal("family_dap", "2024-FY") / 1_000_000_000,
    "2025A": kpiVal("family_dap", "2025-FY") / 1_000_000_000,
    "9M25A": kpiVal("family_dap", "2025-Q3") / 1_000_000_000,
    "9M26A": kpiVal("family_dap", "2026-Q3") / 1_000_000_000,
    "LTM Q3 26": new Cell({ expr: '@table["family_dap", "9M26A"]' }),
  }
  geo.addRow("family_dap", { cells: dapCells, format: "number", decimals: 2 })

  const impCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Ad impressions YoY growth" }),
    "2021A": null,
    "2022A": kpiVal("ad_impressions_yoy", "2022-FY"),
    "2023A": kpiVal("ad_impressions_yoy", "2023-FY"),
    "2024A": kpiVal("ad_impressions_yoy", "2024-FY"),
    "2025A": kpiVal("ad_impressions_yoy", "2025-FY"),
    "9M25A": kpiVal("ad_impressions_yoy", "2025-Q3-YTD"),
    "9M26A": kpiVal("ad_impressions_yoy", "2026-Q3-YTD"),
    "LTM Q3 26": null,
  }
  geo.addRow("ad_impressions_yoy", {
    cells: impCells,
    format: "percentage",
    decimals: 1,
  })

  const ppaCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Average price per ad YoY growth" }),
    "2021A": null,
    "2022A": kpiVal("price_per_ad_yoy", "2022-FY"),
    "2023A": kpiVal("price_per_ad_yoy", "2023-FY"),
    "2024A": kpiVal("price_per_ad_yoy", "2024-FY"),
    "2025A": kpiVal("price_per_ad_yoy", "2025-FY"),
    "9M25A": kpiVal("price_per_ad_yoy", "2025-Q3-YTD"),
    "9M26A": kpiVal("price_per_ad_yoy", "2026-Q3-YTD"),
    "LTM Q3 26": null,
  }
  geo.addRow("price_per_ad_yoy", {
    cells: ppaCells,
    format: "percentage",
    decimals: 1,
  })

  const hcCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Period-end headcount (employees)" }),
    "2021A": null,
    "2022A": null,
    "2023A": kpiVal("headcount", "2023-FY"),
    "2024A": kpiVal("headcount", "2024-FY"),
    "2025A": kpiVal("headcount", "2025-FY"),
    "9M25A": null,
    "9M26A": new Cell({
      value: kpiVal("headcount", "2026-Q3"),
      note: "Reflects May 2026 workforce reduction (~8,000 roles).",
    }),
    "LTM Q3 26": new Cell({ expr: '@table["headcount", "9M26A"]' }),
  }
  geo.addRow("headcount", { cells: hcCells, format: "integer" })
}
