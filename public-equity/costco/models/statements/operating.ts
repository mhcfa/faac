import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  ALL_PERIODS,
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  PERIOD_METADATA,
  addTimeSeriesColumns,
  buildHistoricalCellMap,
  dateFormula,
  rowFormatOptions,
} from "../timeline.ts"

export function buildOperatingSchedule(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const table = sheet.addTable(
    "OperatingSchedule",
    "Operating Build: Warehouses, Comps, MFI & Operating Profit ($M)",
    {
      subtitle: [
        "FY22–FY26 audited historicals; FY27E–FY36E driven by active scenario regional warehouse openings, core comps & MFI yield ($M except counts/per-member)",
        `Source: ${kg.citations.warehouseMembership}`,
        `Source: ${kg.citations.incomeStatement}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Operating Driver / Metric ($M except counts/per-member)",
  })

  const kpis = kg.cost.operatingKpis
  const is = kg.cost.incomeStatement

  // Calendar metadata rows for exact-date discounting downstream
  table.addSectionHeader("Fiscal Calendar Metadata")
  table.addRow("period_start_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Fiscal period start date",
      ...Object.fromEntries(
        ALL_PERIODS.map((p) => [
          p,
          { expr: dateFormula(PERIOD_METADATA[p].startDate) },
        ])
      ),
    },
  })
  table.addRow("period_end_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Fiscal period end date",
      ...Object.fromEntries(
        ALL_PERIODS.map((p) => [
          p,
          { expr: dateFormula(PERIOD_METADATA[p].endDate) },
        ])
      ),
    },
  })
  table.addRow("fiscal_days", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: {
        value: "Fiscal days in period (52W = 364d; 53W = 371d)",
        note: "FY23 is 53W (371d); normalized 52W (364d) used for forecast working-capital ratios.",
      },
      ...Object.fromEntries(
        ALL_PERIODS.map((p) => [
          p,
          PERIOD_METADATA[p].isHistorical ? PERIOD_METADATA[p].fiscalDays : 364,
        ])
      ),
    },
  })

  // Section 1: Regional Warehouse Footprint
  table.addSectionHeader("1. Regional Warehouse Expansion")
  table.addRow("net_openings_us", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: {
        value: "Net warehouse openings — U.S.",
        note: "FY22 regional split not disaggregated vs prior year (total company net openings = 23).",
      },
      FY22: null,
      FY23: {
        expr: '@table["warehouses_us", @col] - @table["warehouses_us", col.prev]',
      },
      FY24: {
        expr: '@table["warehouses_us", @col] - @table["warehouses_us", col.prev]',
      },
      FY25: {
        expr: '@table["warehouses_us", @col] - @table["warehouses_us", col.prev]',
      },
      FY26: {
        expr: '@table["warehouses_us", @col] - @table["warehouses_us", col.prev]',
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'PeriodAssumptionsActive["net_openings_us", @col]' },
        ])
      ),
    },
  })
  table.addRow("net_openings_canada", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Net warehouse openings — Canada",
      FY22: null,
      FY23: {
        expr: '@table["warehouses_canada", @col] - @table["warehouses_canada", col.prev]',
      },
      FY24: {
        expr: '@table["warehouses_canada", @col] - @table["warehouses_canada", col.prev]',
      },
      FY25: {
        expr: '@table["warehouses_canada", @col] - @table["warehouses_canada", col.prev]',
      },
      FY26: {
        expr: '@table["warehouses_canada", @col] - @table["warehouses_canada", col.prev]',
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'PeriodAssumptionsActive["net_openings_canada", @col]' },
        ])
      ),
    },
  })
  table.addRow("net_openings_other_intl", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Net warehouse openings — Other Intl",
      FY22: null,
      FY23: {
        expr: '@table["warehouses_other_intl", @col] - @table["warehouses_other_intl", col.prev]',
      },
      FY24: {
        expr: '@table["warehouses_other_intl", @col] - @table["warehouses_other_intl", col.prev]',
      },
      FY25: {
        expr: '@table["warehouses_other_intl", @col] - @table["warehouses_other_intl", col.prev]',
      },
      FY26: {
        expr: '@table["warehouses_other_intl", @col] - @table["warehouses_other_intl", col.prev]',
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'PeriodAssumptionsActive["net_openings_other_intl", @col]' },
        ])
      ),
    },
  })
  table.addRow("net_openings_total", {
    ...rowFormatOptions("integer"),
    style: "subtotal",
    cells: {
      line_item: "Total net warehouse openings",
      FY22: kpis.netNewWarehouses.FY22,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: 'SUM(@table["net_openings_us".."net_openings_other_intl", @col])',
          },
        ])
      ),
    },
  })

  table.addRow("warehouses_us", {
    ...rowFormatOptions("integer"),
    cells: buildHistoricalCellMap(
      "Ending warehouses — U.S.",
      kpis.warehousesUs
    ),
    expr: '@table["warehouses_us", col.prev] + @table["net_openings_us", @col]',
  })
  table.addRow("warehouses_canada", {
    ...rowFormatOptions("integer"),
    cells: buildHistoricalCellMap(
      "Ending warehouses — Canada",
      kpis.warehousesCanada
    ),
    expr: '@table["warehouses_canada", col.prev] + @table["net_openings_canada", @col]',
  })
  table.addRow("warehouses_other_intl", {
    ...rowFormatOptions("integer"),
    cells: buildHistoricalCellMap(
      "Ending warehouses — Other Intl",
      kpis.warehousesOtherIntl
    ),
    expr: '@table["warehouses_other_intl", col.prev] + @table["net_openings_other_intl", @col]',
  })
  table.addRow("warehouses_total", {
    ...rowFormatOptions("integer"),
    style: "total",
    expr: 'SUM(@table["warehouses_us".."warehouses_other_intl", @col])',
    cells: { line_item: "Total ending warehouses" },
  })

  table.addRow("avg_warehouses_us", {
    ...rowFormatOptions("number", 1),
    cells: {
      line_item: "Average warehouses — U.S.",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["warehouses_us", col.prev] + @table["warehouses_us", @col]) / 2',
          },
        ])
      ),
    },
  })
  table.addRow("avg_warehouses_canada", {
    ...rowFormatOptions("number", 1),
    cells: {
      line_item: "Average warehouses — Canada",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["warehouses_canada", col.prev] + @table["warehouses_canada", @col]) / 2',
          },
        ])
      ),
    },
  })
  table.addRow("avg_warehouses_other_intl", {
    ...rowFormatOptions("number", 1),
    cells: {
      line_item: "Average warehouses — Other Intl",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["warehouses_other_intl", col.prev] + @table["warehouses_other_intl", @col]) / 2',
          },
        ])
      ),
    },
  })
  table.addRow("avg_warehouses_total", {
    ...rowFormatOptions("number", 1),
    style: "subtotal",
    cells: {
      line_item: "Average total warehouses",
      FY22: {
        expr: '(MarketAnchors["fy21_warehouses_total", "val"] + @table["warehouses_total", @col]) / 2',
      },
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["warehouses_total", col.prev] + @table["warehouses_total", @col]) / 2',
          },
        ])
      ),
    },
  })

  // Section 2: Comparable Sales & Net Sales Revenue Engine
  table.addSectionHeader("2. Comparable Sales & Merchandise Net Sales Build")
  table.addRow("core_comp_us", {
    ...rowFormatOptions("percentage", 1),
    cells: buildHistoricalCellMap(
      "Core comp sales growth (ex-gas/FX) — U.S.",
      kpis.compExGasFxUs
    ),
    expr: 'PeriodAssumptionsActive["core_comp_us", @col]',
  })
  table.addRow("core_comp_canada", {
    ...rowFormatOptions("percentage", 1),
    cells: buildHistoricalCellMap(
      "Core comp sales growth (ex-gas/FX) — Canada",
      kpis.compExGasFxCanada
    ),
    expr: 'PeriodAssumptionsActive["core_comp_canada", @col]',
  })
  table.addRow("core_comp_other_intl", {
    ...rowFormatOptions("percentage", 1),
    cells: buildHistoricalCellMap(
      "Core comp sales growth (ex-gas/FX) — Other Intl",
      kpis.compExGasFxOtherIntl
    ),
    expr: 'PeriodAssumptionsActive["core_comp_other_intl", @col]',
  })
  table.addRow("comp_reported_total", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      ...buildHistoricalCellMap(
        "Reported total comp sales growth (incl. gas & FX)",
        kpis.compReportedTotal,
        "10-K historical reported total comp sales growth; forecast modeled directly via regional core comp + gas/FX impact below."
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  table.addRow("comp_ex_gas_fx_total", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      ...buildHistoricalCellMap(
        "Core total comp sales growth (ex-gas & FX)",
        kpis.compExGasFxTotal,
        "10-K historical consolidated comp sales growth ex-gas/FX."
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  table.addRow("gas_fx_comp_impact", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: {
        value: "Gasoline & FX comp sales impact (reported vs. core)",
        note: "Historical spread = reported comp - ex-gas/FX comp; FY27E reflects Sept/Oct 2026 fuel inflation.",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["comp_reported_total", @col] - @table["comp_ex_gas_fx_total", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          { expr: 'PeriodAssumptionsActive["gas_fx_comp_impact", @col]' },
        ])
      ),
    },
  })
  table.addRow("wh_growth_us", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Average warehouse growth — U.S.",
      FY22: null,
      FY23: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(2), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["avg_warehouses_us", @col] / @table["avg_warehouses_us", col.prev] - 1',
          },
        ])
      ),
    },
  })
  table.addRow("wh_growth_canada", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Average warehouse growth — Canada",
      FY22: null,
      FY23: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(2), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["avg_warehouses_canada", @col] / @table["avg_warehouses_canada", col.prev] - 1',
          },
        ])
      ),
    },
  })
  table.addRow("wh_growth_other_intl", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Average warehouse growth — Other Intl",
      FY22: null,
      FY23: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(2), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["avg_warehouses_other_intl", @col] / @table["avg_warehouses_other_intl", col.prev] - 1',
          },
        ])
      ),
    },
  })

  // Contiguous 3-row regional growth rates & contiguous 3-row segment revenue for clean SUMPRODUCT
  table.addRow("sales_growth_us", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Implied sales growth — U.S.",
      FY22: null,
      ...Object.fromEntries(
        HISTORICAL_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["seg_rev_us", @col] / @table["seg_rev_us", col.prev] - 1',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '(1 + @table["core_comp_us", @col] + @table["gas_fx_comp_impact", @col]) * (1 + @table["wh_growth_us", @col] * ScalarAssumptionsActive["new_club_productivity", "val"]) - 1',
          },
        ])
      ),
    },
  })
  table.addRow("sales_growth_canada", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Implied sales growth — Canada",
      FY22: null,
      ...Object.fromEntries(
        HISTORICAL_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["seg_rev_canada", @col] / @table["seg_rev_canada", col.prev] - 1',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '(1 + @table["core_comp_canada", @col] + @table["gas_fx_comp_impact", @col]) * (1 + @table["wh_growth_canada", @col] * ScalarAssumptionsActive["new_club_productivity", "val"]) - 1',
          },
        ])
      ),
    },
  })
  table.addRow("sales_growth_other_intl", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Implied sales growth — Other Intl",
      FY22: null,
      ...Object.fromEntries(
        HISTORICAL_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["seg_rev_other_intl", @col] / @table["seg_rev_other_intl", col.prev] - 1',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '(1 + @table["core_comp_other_intl", @col] + @table["gas_fx_comp_impact", @col]) * (1 + @table["wh_growth_other_intl", @col] * ScalarAssumptionsActive["new_club_productivity", "val"]) - 1',
          },
        ])
      ),
    },
  })

  table.addRow("seg_rev_us", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Segment revenue — U.S. (10-K Note 11)",
      kpis.segmentsRevenue.us
    ),
    expr: '@table["seg_rev_us", col.prev] * (1 + @table["sales_growth_us", @col])',
  })
  table.addRow("seg_rev_canada", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Segment revenue — Canada (10-K Note 11)",
      kpis.segmentsRevenue.canada
    ),
    expr: '@table["seg_rev_canada", col.prev] * (1 + @table["sales_growth_canada", @col])',
  })
  table.addRow("seg_rev_other_intl", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Segment revenue — Other Intl (10-K Note 11)",
      kpis.segmentsRevenue.otherIntl
    ),
    expr: '@table["seg_rev_other_intl", col.prev] * (1 + @table["sales_growth_other_intl", @col])',
  })
  table.addRow("seg_rev_total", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["seg_rev_us".."seg_rev_other_intl", @col])',
    cells: { line_item: "Total Segment Revenue (prior-share weighting base)" },
  })

  table.addRow("blended_net_sales_growth", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Consolidated Net Sales YoY growth",
      FY22: null,
      ...Object.fromEntries(
        HISTORICAL_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["net_sales", @col] / @table["net_sales", col.prev] - 1',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'SUMPRODUCT(@table["seg_rev_us".."seg_rev_other_intl", col.prev], @table["sales_growth_us".."sales_growth_other_intl", @col]) / @table["seg_rev_total", col.prev]',
          },
        ])
      ),
    },
  })
  table.addRow("net_sales", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: buildHistoricalCellMap("Consolidated Net Sales", is.netSales),
    expr: '@table["net_sales", col.prev] * (1 + @table["blended_net_sales_growth", @col])',
  })

  // Section 3: Membership Fee Income (MFI) Engine
  table.addSectionHeader("3. Membership Fee Income (MFI) Build")
  table.addRow("members_per_warehouse_k", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "Paid members per ending warehouse (k members)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["paid_members_m", @col] * 1000 / @table["warehouses_total", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["members_per_warehouse_k", col.prev] * (1 + PeriodAssumptionsActive["members_per_wh_growth", @col])',
          },
        ])
      ),
    },
  })
  table.addRow("paid_members_m", {
    ...rowFormatOptions("number", 2),
    cells: buildHistoricalCellMap(
      "Ending paid memberships (M)",
      kpis.paidMembersMillions,
      "Consolidated paid households (FY26 10-K dropped Gold Star/Business sub-split)."
    ),
    expr: '@table["members_per_warehouse_k", @col] * @table["warehouses_total", @col] / 1000',
  })
  table.addRow("avg_paid_members_m", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "Average paid memberships (M)",
      FY22: {
        expr: '(MarketAnchors["fy21_paid_members", "val"] + @table["paid_members_m", @col]) / 2',
      },
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["paid_members_m", col.prev] + @table["paid_members_m", @col]) / 2',
          },
        ])
      ),
    },
  })
  table.addRow("fee_per_avg_member", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Annual MFI yield per avg paid member ($/member)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["membership_fees", @col] / @table["avg_paid_members_m", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["fee_per_avg_member", col.prev] * (1 + PeriodAssumptionsActive["fee_per_member_growth", @col])',
          },
        ])
      ),
    },
  })
  table.addRow("membership_fees", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: buildHistoricalCellMap(
      "Membership Fee Income (MFI)",
      is.membershipFees
    ),
    expr: '@table["avg_paid_members_m", @col] * @table["fee_per_avg_member", @col]',
  })
  table.addRow("mfi_yoy_growth", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "MFI YoY growth",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '@table["membership_fees", @col] / @table["membership_fees", col.prev] - 1',
          },
        ])
      ),
    },
  })

  // Section 4: Revenue, Gross Margin, SG&A & Operating Profit
  table.addSectionHeader("4. Revenue, Gross Margin & Operating Profit")
  table.addRow("total_revenue", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["net_sales", @col] + @table["membership_fees", @col]',
    cells: { line_item: "Total Revenue (Net Sales + MFI)" },
  })
  table.addRow("merchandise_costs", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Merchandise costs", is.merchandiseCosts),
    expr: '@table["net_sales", @col] * (1 - PeriodAssumptionsActive["merch_gross_margin_pct", @col])',
  })
  table.addRow("merch_gross_profit", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["net_sales", @col] - @table["merchandise_costs", @col]',
    cells: { line_item: "Merchandise Gross Profit" },
  })
  table.addRow("merch_gm_pct", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["merch_gross_profit", @col] / @table["net_sales", @col]',
    cells: { line_item: "Merchandise Gross Margin (% of Net Sales)" },
  })
  table.addRow("sga", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Selling, general and administrative (incl. SBC)",
      is.sga
    ),
    expr: '@table["net_sales", @col] * PeriodAssumptionsActive["sga_pct_net_sales", @col]',
  })
  table.addRow("sga_pct_net_sales", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["sga", @col] / @table["net_sales", @col]',
    cells: { line_item: "SG&A (% of Net Sales)" },
  })
  table.addRow("ebit", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["merch_gross_profit", @col] + @table["membership_fees", @col] - @table["sga", @col]',
    cells: { line_item: "Operating Income (EBIT)" },
  })
  table.addRow("ebit_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["ebit", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Operating Margin (% of Total Revenue)" },
  })
  table.addRow("da", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["da", @col]',
    cells: {
      line_item: "Depreciation & Amortization (from Cash Flow / PP&E)",
    },
  })
  table.addRow("ebitda", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["ebit", @col] + @table["da", @col]',
    cells: { line_item: "EBITDA (Operating Income + D&A)" },
  })
  table.addRow("ebitda_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["ebitda", @col] / @table["total_revenue", @col]',
    cells: { line_item: "EBITDA Margin (% of Total Revenue)" },
  })
  table.addRow("sbc_expense", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Memo: Stock-Based Compensation (inside SG&A/EBIT)",
      kg.cost.cashFlow.stockBasedCompensation,
      "Economic employee compensation cost retained inside GAAP EBIT & NOPAT (no SBC add-back in primary DCF)."
    ),
    expr: '@table["net_sales", @col] * PeriodAssumptionsActive["sbc_pct_net_sales", @col]',
  })
  table.addRow("ebit_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["ebit", @col] + @table["sbc_expense", @col]',
    cells: {
      line_item: {
        value: "Memo: EBIT ex-SBC (non-GAAP sensitivity only)",
        note: "Shown strictly as memo for ex-SBC FCFF sensitivity; never used in primary valuation.",
      },
    },
  })

  return table
}
