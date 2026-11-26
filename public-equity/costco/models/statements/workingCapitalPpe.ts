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

export function buildWorkingCapitalPpeSchedule(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const table = sheet.addTable(
    "WorkingCapitalPPE",
    "Working Capital, Net PP&E & Operating Lease Assets ($M)",
    {
      subtitle: [
        "FY22A–FY26A audited; FY27E–FY36E driven by DSO/DIO/DPO days, CapEx intensity, and beginning net PP&E depreciation ($M / days)",
        `Source: ${kg.citations.balanceSheet}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Working capital & PP&E ($M)",
  })

  const bs = kg.cost.balanceSheet
  const cf = kg.cost.cashFlow

  table.addSectionHeader("Operating working capital balances ($M)")
  table.addRow("receivables_net", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Receivables, net", bs.receivablesNet),
    expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["dso_days", "val"] / OperatingVolumeSchedule["fiscal_days", @col]',
  })
  table.addRow("merchandise_inventories", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Merchandise inventories",
      bs.merchandiseInventories
    ),
    expr: 'OperatingMarginSchedule["merchandise_costs", @col] * ScalarAssumptionsOperating["dio_days", "val"] / OperatingVolumeSchedule["fiscal_days", @col]',
  })
  table.addRow("other_current_assets", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Other current assets",
      bs.otherCurrentAssets
    ),
    expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["other_current_assets_pct_sales", "val"]',
  })
  table.addRow("total_op_current_assets", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["receivables_net".."other_current_assets", @col])',
    cells: { line_item: "Total operating current assets" },
  })

  table.addRow("accounts_payable", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Accounts payable", bs.accountsPayable),
    expr: 'OperatingMarginSchedule["merchandise_costs", @col] * ScalarAssumptionsOperating["dpo_days", "val"] / OperatingVolumeSchedule["fiscal_days", @col]',
  })
  table.addRow("accrued_salaries", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Accrued salaries and benefits",
      bs.accruedSalariesAndBenefits
    ),
    expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["accrued_salaries_days", "val"] / OperatingVolumeSchedule["fiscal_days", @col]',
  })
  table.addRow("accrued_member_rewards", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Accrued member rewards",
      bs.accruedMemberRewards
    ),
    expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["accrued_rewards_pct_sales", "val"]',
  })
  table.addRow("deferred_membership_fees", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Deferred membership fees",
      bs.deferredMembershipFees
    ),
    expr: 'OperatingMarginSchedule["membership_fees", @col] * ScalarAssumptionsOperating["deferred_mfi_pct_mfi", "val"]',
  })
  table.addRow("other_current_liab_op", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Other curr. op. liab. (ex-lease)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          p === "FY24"
            ? {
                expr: 'BalanceSheet["other_current_liabilities", @col] - LeasesInterestSchedule["current_op_lease_liab", @col] - LeasesInterestSchedule["current_fin_lease_liab", @col] - DebtSchedule["current_portion_in_ocl", @col]',
                note: "Excludes current operating/finance leases and FY24 $103M reclassified current debt.",
              }
            : {
                expr: 'BalanceSheet["other_current_liabilities", @col] - LeasesInterestSchedule["current_op_lease_liab", @col] - LeasesInterestSchedule["current_fin_lease_liab", @col] - DebtSchedule["current_portion_in_ocl", @col]',
              },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["other_current_liab_op_pct_sales", "val"]',
          },
        ])
      ),
    },
  })
  table.addRow("total_op_current_liab", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["accounts_payable".."other_current_liab_op", @col])',
    cells: { line_item: "Total operating current liab." },
  })
  table.addRow("op_nwc", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["total_op_current_assets", @col] - @table["total_op_current_liab", @col]',
    cells: { line_item: "Net operating working capital" },
  })
  table.addRow("change_in_op_nwc", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Annual change in OpNWC",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: '@table["op_nwc", @col] - @table["op_nwc", col.prev]' },
        ])
      ),
    },
  })

  table.addRowGutter()
  table.addSectionHeader("Working capital efficiency ratios")
  table.addRow("dso_days", {
    ...rowFormatOptions("number", 1),
    expr: '@table["receivables_net", @col] / OperatingVolumeSchedule["net_sales", @col] * OperatingVolumeSchedule["fiscal_days", @col]',
    cells: { line_item: "Receivables days (DSO)" },
  })
  table.addRow("dio_days", {
    ...rowFormatOptions("number", 1),
    expr: '@table["merchandise_inventories", @col] / OperatingMarginSchedule["merchandise_costs", @col] * OperatingVolumeSchedule["fiscal_days", @col]',
    cells: { line_item: "Inventory days (DIO)" },
  })
  table.addRow("dpo_days", {
    ...rowFormatOptions("number", 1),
    expr: '@table["accounts_payable", @col] / OperatingMarginSchedule["merchandise_costs", @col] * OperatingVolumeSchedule["fiscal_days", @col]',
    cells: { line_item: "Payables days (DPO)" },
  })
  table.addRow("cash_conversion_cycle", {
    ...rowFormatOptions("number", 1),
    style: "bold",
    expr: '@table["dso_days", @col] + @table["dio_days", @col] - @table["dpo_days", @col]',
    cells: { line_item: "Cash conversion cycle (days)" },
  })
  table.addRow("def_mfi_pct_mfi", {
    ...rowFormatOptions("percentage", 1),
    expr: '@table["deferred_membership_fees", @col] / OperatingMarginSchedule["membership_fees", @col]',
    cells: { line_item: "Deferred MFI (% annual MFI)" },
  })

  table.addRowGutter()
  table.addSectionHeader("Property and equipment (net PP&E) roll-forward")
  table.addRow("beg_ppe_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Beginning net PP&E",
      FY22: {
        expr: 'MarketAnchorsMarket["fy21_ppe_net", "val"]',
        note: "FY21 ending net PP&E per FY22 Form 10-K.",
      },
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: '@table["end_ppe_net", col.prev]' },
        ])
      ),
    },
  })
  table.addRow("capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "(+) Capital expenditures (CapEx)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '-CashFlowStatement["capex", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'OperatingVolumeSchedule["net_sales", @col] * PeriodAssumptionsActive["capex_pct_net_sales", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("da", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "(−) Depreciation & amortization",
      cf.depreciationAndAmortization
    ),
    expr: '@table["beg_ppe_net", @col] * ScalarAssumptionsOperating["da_pct_beg_ppe", "val"]',
  })
  table.addRow("ppe_fx_other", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "(+/−) FX, leases & disposals",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["end_ppe_net", @col] - (@table["beg_ppe_net", @col] + @table["capex", @col] - @table["da", @col])',
          },
        ])
      ),
      ...zeroForecastCells(
        "Historical PP&E translation, finance lease additions, and disposals; zero in clean forecast."
      ),
    },
  })
  table.addRow("end_ppe_net", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    cells: buildHistoricalCellMap("Ending net PP&E", bs.ppeNet),
    expr: '@table["beg_ppe_net", @col] + @table["capex", @col] - @table["da", @col] + @table["ppe_fx_other", @col]',
  })

  table.addRowGutter()
  table.addSectionHeader("Operating lease ROU and other LT operating net")
  table.addRow("op_lease_rou_assets", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Operating lease ROU assets",
      bs.operatingLeaseRouAssets
    ),
    expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["op_lease_rou_pct_sales", "val"]',
  })
  table.addRow("other_lt_assets", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Other long-term assets",
      bs.otherLongTermAssets
    ),
    expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["other_lt_op_assets_pct_sales", "val"]',
  })
  table.addRow("other_lt_op_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Other LT op. liab. (ex-lease)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: 'BalanceSheet["other_long_term_liabilities", @col] - LeasesInterestSchedule["lt_fin_lease_liab", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'OperatingVolumeSchedule["net_sales", @col] * ScalarAssumptionsOperating["other_lt_op_liab_pct_sales", "val"]',
          },
        ])
      ),
    },
  })
  table.addRow("net_other_lt_op_assets", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["other_lt_assets", @col] - @table["other_lt_op_liab", @col]',
    cells: { line_item: "Net other LT operating assets" },
  })

  return table
}
