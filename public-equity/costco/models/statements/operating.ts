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
  notedNull,
  rowFormatOptions,
} from "../timeline.ts"

export function buildOperatingSchedule(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const table = sheet.addTable(
    "OperatingSchedule",
    "Operating Build: Warehouses, Comparable Sales, MFI & Operating Profit ($M)",
    {
      subtitle: [
        "FY22A–FY26A audited historicals; FY27E–FY36E forecast by regional openings, core comps, and membership yield ($M except counts and per-member)",
        `Source: ${kg.citations.warehouseMembership}; ${kg.citations.incomeStatement}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Operating metric ($M / counts)",
  })

  const kpis = kg.cost.operatingKpis
  const is = kg.cost.incomeStatement

  table.addSectionHeader("Fiscal calendar")
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
      line_item: "Fiscal days in period",
      ...Object.fromEntries(
        ALL_PERIODS.map((p) => {
          const val = PERIOD_METADATA[p].fiscalDays
          if (val === 371) {
            return [
              p,
              {
                value: val,
                note:
                  p === "FY23"
                    ? "53-week fiscal year (371 days, ended 2023-09-03)."
                    : "53-week fiscal year (371 days); forecast net sales and MFI scale by 371/364 and revert cleanly the following 52-week year.",
              },
            ]
          }
          return [p, val]
        })
      ),
    },
  })

  table.addRowGutter()
  table.addSectionHeader("Regional warehouse expansion")
  table.addRow("net_openings_us", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Net warehouse openings — U.S.",
      FY22: notedNull(
        "FY22 regional opening split not disclosed separately; consolidated net openings totaled 23."
      ),
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
      line_item: "Net openings — Other Intl",
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
    style: "bold",
    cells: {
      line_item: "Average total warehouses",
      FY22: {
        expr: '(MarketAnchors["fy21_warehouses_total", "val"] + @table["warehouses_total", @col]) / 2',
        note: "Opening FY21 warehouse count per FY22 Form 10-K.",
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

  table.addRowGutter()
  table.addSectionHeader("Comparable sales and net sales build")
  table.addRow("core_comp_us", {
    ...rowFormatOptions("percentage", 1),
    cells: buildHistoricalCellMap(
      "Core comp growth (ex-gas/FX) — U.S.",
      kpis.compExGasFxUs
    ),
    expr: 'PeriodAssumptionsActive["core_comp_us", @col]',
  })
  table.addRow("core_comp_canada", {
    ...rowFormatOptions("percentage", 1),
    cells: buildHistoricalCellMap(
      "Core comp growth — Canada",
      kpis.compExGasFxCanada
    ),
    expr: 'PeriodAssumptionsActive["core_comp_canada", @col]',
  })
  table.addRow("core_comp_other_intl", {
    ...rowFormatOptions("percentage", 1),
    cells: buildHistoricalCellMap(
      "Core comp growth — Other Intl",
      kpis.compExGasFxOtherIntl
    ),
    expr: 'PeriodAssumptionsActive["core_comp_other_intl", @col]',
  })
  table.addRow("comp_reported_total", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      ...buildHistoricalCellMap(
        "Reported total comp sales growth",
        kpis.compReportedTotal
      ),
      FY27E: notedNull(
        "Forecast net sales build from regional core comps and fuel/FX impact below."
      ),
      ...Object.fromEntries(FORECAST_PERIODS.slice(1).map((p) => [p, null])),
    },
  })
  table.addRow("comp_ex_gas_fx_total", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      ...buildHistoricalCellMap(
        "Core total comp sales (ex-gas/FX)",
        kpis.compExGasFxTotal
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  table.addRow("gas_fx_comp_impact", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Gasoline and FX comp impact",
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
      line_item: "Average club growth — Other Intl",
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
            expr: '(1 + @table["core_comp_us", @col] + @table["gas_fx_comp_impact", @col]) * (1 + @table["wh_growth_us", @col] * ScalarAssumptionsActive["new_club_productivity", "val"]) * (@table["fiscal_days", @col] / @table["fiscal_days", col.prev]) - 1',
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
            expr: '(1 + @table["core_comp_canada", @col] + @table["gas_fx_comp_impact", @col]) * (1 + @table["wh_growth_canada", @col] * ScalarAssumptionsActive["new_club_productivity", "val"]) * (@table["fiscal_days", @col] / @table["fiscal_days", col.prev]) - 1',
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
            expr: '(1 + @table["core_comp_other_intl", @col] + @table["gas_fx_comp_impact", @col]) * (1 + @table["wh_growth_other_intl", @col] * ScalarAssumptionsActive["new_club_productivity", "val"]) * (@table["fiscal_days", @col] / @table["fiscal_days", col.prev]) - 1',
          },
        ])
      ),
    },
  })

  table.addRow("seg_rev_us", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Segment revenue — U.S.",
      kpis.segmentsRevenue.us
    ),
    expr: '@table["seg_rev_us", col.prev] * (1 + @table["sales_growth_us", @col])',
  })
  table.addRow("seg_rev_canada", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Segment revenue — Canada",
      kpis.segmentsRevenue.canada
    ),
    expr: '@table["seg_rev_canada", col.prev] * (1 + @table["sales_growth_canada", @col])',
  })
  table.addRow("seg_rev_other_intl", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Segment revenue — Other Intl",
      kpis.segmentsRevenue.otherIntl
    ),
    expr: '@table["seg_rev_other_intl", col.prev] * (1 + @table["sales_growth_other_intl", @col])',
  })
  table.addRow("seg_rev_total", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["seg_rev_us".."seg_rev_other_intl", @col])',
    cells: { line_item: "Total segment revenue" },
  })

  table.addRow("blended_net_sales_growth", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    cells: {
      line_item: "Net sales YoY growth (%)",
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
    cells: buildHistoricalCellMap("Consolidated net sales", is.netSales),
    expr: '@table["net_sales", col.prev] * (1 + @table["blended_net_sales_growth", @col])',
  })

  table.addRowGutter()
  table.addSectionHeader("Membership fee income (MFI) build")
  table.addRow("members_per_warehouse_k", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "Paid members per warehouse (k)",
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
      {
        FY26: "FY26 Form 10-K reports consolidated paid memberships without Gold Star/Business sub-split.",
      }
    ),
    expr: '@table["members_per_warehouse_k", @col] * @table["warehouses_total", @col] / 1000',
  })
  table.addRow("avg_paid_members_m", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "Average paid memberships (M)",
      FY22: {
        expr: '(MarketAnchors["fy21_paid_members", "val"] + @table["paid_members_m", @col]) / 2',
        note: "Opening FY21 paid memberships per FY22 Form 10-K.",
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
      line_item: "Annual MFI per avg. member ($)",
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
      "Membership fee income (MFI)",
      is.membershipFees
    ),
    expr: '@table["avg_paid_members_m", @col] * @table["fee_per_avg_member", @col] * (@table["fiscal_days", @col] / 364)',
  })
  table.addRow("mfi_yoy_growth", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    cells: {
      line_item: "MFI YoY growth (%)",
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

  table.addRowGutter()
  table.addSectionHeader("Revenue, gross margin and operating profit")
  table.addRow("total_revenue", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["net_sales", @col] + @table["membership_fees", @col]',
    cells: { line_item: "Total revenue" },
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
    cells: { line_item: "Merchandise gross profit" },
  })
  table.addRow("merch_gm_pct", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["merch_gross_profit", @col] / @table["net_sales", @col]',
    cells: { line_item: "Merchandise gross margin (%)" },
  })
  table.addRow("cash_sga", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Cash SG&A (ex-D&A, incl. SBC)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '@table["sga", @col] - @table["da", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["net_sales", @col] * PeriodAssumptionsActive["cash_sga_pct_net_sales", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("cash_sga_pct_net_sales", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["cash_sga", @col] / @table["net_sales", @col]',
    cells: { line_item: "Cash SG&A (% of net sales)" },
  })
  table.addRow("da", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["da", @col]',
    cells: { line_item: "Depreciation and amortization" },
  })
  table.addRow("sga", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("GAAP SG&A (incl. D&A & SBC)", is.sga),
    expr: '@table["cash_sga", @col] + @table["da", @col]',
  })
  table.addRow("sga_pct_net_sales", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["sga", @col] / @table["net_sales", @col]',
    cells: { line_item: "GAAP SG&A (% of net sales)" },
  })
  table.addRow("ebitda", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["merch_gross_profit", @col] + @table["membership_fees", @col] - @table["cash_sga", @col]',
    cells: { line_item: "EBITDA" },
  })
  table.addRow("ebitda_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["ebitda", @col] / @table["total_revenue", @col]',
    cells: { line_item: "EBITDA margin (%)" },
  })
  table.addRow("ebit", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["ebitda", @col] - @table["da", @col]',
    cells: { line_item: "Operating income (EBIT)" },
  })
  table.addRow("ebit_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["ebit", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Operating margin (%)" },
  })
  table.addRow("sbc_expense", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Memo: Stock-based compensation",
      kg.cost.cashFlow.stockBasedCompensation,
      {
        FY26: "Retained inside GAAP SG&A, EBIT, and NOPAT as an ongoing compensation expense.",
      }
    ),
    expr: '@table["net_sales", @col] * PeriodAssumptionsActive["sbc_pct_net_sales", @col]',
  })
  table.addRow("ebit_ex_sbc_memo", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["ebit", @col] + @table["sbc_expense", @col]',
    cells: { line_item: "Memo: EBIT ex-SBC (reference)" },
  })

  return table
}
