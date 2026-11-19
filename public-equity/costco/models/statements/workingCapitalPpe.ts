import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  buildHistoricalCellMap,
  rowFormatOptions,
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
        "FY22–FY26 audited; FY27E–FY36E driven by DSO/DIO/DPO efficiency days, CapEx intensity & beginning PP&E depreciation ($M / Days)",
        `Source: ${kg.citations.balanceSheet}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(table, {
    descriptorLabel: "Working Capital / Fixed Asset Line ($M / Days)",
  })

  const bs = kg.cost.balanceSheet
  const cf = kg.cost.cashFlow

  table.addSectionHeader("1. Operating Working Capital Balances ($M)")
  table.addRow("receivables_net", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Receivables, net", bs.receivablesNet),
    expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["dso_days", "val"] / OperatingSchedule["fiscal_days", @col]',
  })
  table.addRow("merchandise_inventories", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Merchandise inventories",
      bs.merchandiseInventories
    ),
    expr: 'OperatingSchedule["merchandise_costs", @col] * ScalarAssumptionsActive["dio_days", "val"] / OperatingSchedule["fiscal_days", @col]',
  })
  table.addRow("other_current_assets", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Other current assets",
      bs.otherCurrentAssets
    ),
    expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["other_current_assets_pct_sales", "val"]',
  })
  table.addRow("total_op_current_assets", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["receivables_net".."other_current_assets", @col])',
    cells: { line_item: "Total Operating Current Assets (excl. Cash & STI)" },
  })

  table.addRow("accounts_payable", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Accounts payable", bs.accountsPayable),
    expr: 'OperatingSchedule["merchandise_costs", @col] * ScalarAssumptionsActive["dpo_days", "val"] / OperatingSchedule["fiscal_days", @col]',
  })
  table.addRow("accrued_salaries", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Accrued salaries and benefits",
      bs.accruedSalariesAndBenefits
    ),
    expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["accrued_salaries_days", "val"] / OperatingSchedule["fiscal_days", @col]',
  })
  table.addRow("accrued_member_rewards", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Accrued member rewards",
      bs.accruedMemberRewards
    ),
    expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["accrued_rewards_pct_sales", "val"]',
  })
  table.addRow("deferred_membership_fees", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Deferred membership fees",
      bs.deferredMembershipFees
    ),
    expr: 'OperatingSchedule["membership_fees", @col] * ScalarAssumptionsActive["deferred_mfi_pct_mfi", "val"]',
  })
  table.addRow("other_current_liab_op", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Other current operating liabilities (ex-leases/debt)",
        note: "Strips current operating & finance leases (and FY24 $103M reclassified current debt) via live formula to avoid double-counting in Financing IC.",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: 'BalanceSheet["other_current_liabilities", @col] - DebtLeasesSchedule["current_op_lease_liab", @col] - DebtLeasesSchedule["current_fin_lease_liab", @col] - DebtLeasesSchedule["current_portion_in_ocl", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["other_current_liab_op_pct_sales", "val"]',
          },
        ])
      ),
    },
  })
  table.addRow("total_op_current_liab", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["accounts_payable".."other_current_liab_op", @col])',
    cells: { line_item: "Total Operating Current Liabilities" },
  })
  table.addRow("op_nwc", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["total_op_current_assets", @col] - @table["total_op_current_liab", @col]',
    cells: { line_item: "Net Operating Working Capital (OpNWC)" },
  })
  table.addRow("change_in_op_nwc", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Annual change in OpNWC (+ use of cash / - float source)",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: '@table["op_nwc", @col] - @table["op_nwc", col.prev]' },
        ])
      ),
    },
  })

  table.addSectionHeader("2. Working Capital Efficiency Ratios")
  table.addRow("dso_days", {
    ...rowFormatOptions("number", 1),
    expr: '@table["receivables_net", @col] / OperatingSchedule["net_sales", @col] * OperatingSchedule["fiscal_days", @col]',
    cells: { line_item: "Receivables days (DSO)" },
  })
  table.addRow("dio_days", {
    ...rowFormatOptions("number", 1),
    expr: '@table["merchandise_inventories", @col] / OperatingSchedule["merchandise_costs", @col] * OperatingSchedule["fiscal_days", @col]',
    cells: { line_item: "Inventory days (DIO)" },
  })
  table.addRow("dpo_days", {
    ...rowFormatOptions("number", 1),
    expr: '@table["accounts_payable", @col] / OperatingSchedule["merchandise_costs", @col] * OperatingSchedule["fiscal_days", @col]',
    cells: { line_item: "Payables days (DPO)" },
  })
  table.addRow("cash_conversion_cycle", {
    ...rowFormatOptions("number", 1),
    style: "subtotal",
    expr: '@table["dso_days", @col] + @table["dio_days", @col] - @table["dpo_days", @col]',
    cells: { line_item: "Cash conversion cycle (DSO + DIO - DPO days)" },
  })
  table.addRow("def_mfi_pct_mfi", {
    ...rowFormatOptions("percentage", 1),
    expr: '@table["deferred_membership_fees", @col] / OperatingSchedule["membership_fees", @col]',
    cells: { line_item: "Deferred MFI (% of annual MFI)" },
  })

  table.addSectionHeader("3. Property & Equipment (Net PP&E) Roll-Forward")
  table.addRow("beg_ppe_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Beginning Net PP&E",
      FY22: { expr: 'MarketAnchors["fy21_ppe_net", "val"]' },
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
      line_item: "(+) Additions to property and equipment (CapEx)",
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
            expr: 'OperatingSchedule["net_sales", @col] * PeriodAssumptionsActive["capex_pct_net_sales", @col]',
          },
        ])
      ),
    },
  })
  table.addRow("da", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "(-) Depreciation and amortization",
      cf.depreciationAndAmortization
    ),
    expr: '@table["beg_ppe_net", @col] * ScalarAssumptionsActive["da_pct_beg_ppe", "val"]',
  })
  table.addRow("ppe_fx_other", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "(+/-) FX translation, finance lease ROU & disposals, net",
        note: "Historical reconciliation between GAAP ending PP&E and CF CapEx - D&A (FY22-FY26); zero in forecast.",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["end_ppe_net", @col] - (@table["beg_ppe_net", @col] + @table["capex", @col] - @table["da", @col])',
          },
        ])
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, 0])),
    },
  })
  table.addRow("end_ppe_net", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    cells: buildHistoricalCellMap("Ending Net PP&E", bs.ppeNet),
    expr: '@table["beg_ppe_net", @col] + @table["capex", @col] - @table["da", @col] + @table["ppe_fx_other", @col]',
  })

  table.addSectionHeader(
    "4. Operating Lease ROU & Other Long-Term Operating Net"
  )
  table.addRow("op_lease_rou_assets", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Operating lease right-of-use assets",
      bs.operatingLeaseRouAssets
    ),
    expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["op_lease_rou_pct_sales", "val"]',
  })
  table.addRow("other_lt_assets", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Other long-term assets",
      bs.otherLongTermAssets
    ),
    expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["other_lt_op_assets_pct_sales", "val"]',
  })
  table.addRow("other_lt_op_liab", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Other long-term operating liabilities (ex-finance leases)",
        note: "Strips long-term finance lease liabilities (tracked on Debt & Leases schedule) via live formula for clean Operating vs. Financing IC.",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: 'BalanceSheet["other_long_term_liabilities", @col] - DebtLeasesSchedule["lt_fin_lease_liab", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'OperatingSchedule["net_sales", @col] * ScalarAssumptionsActive["other_lt_op_liab_pct_sales", "val"]',
          },
        ])
      ),
    },
  })
  table.addRow("net_other_lt_op_assets", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["other_lt_assets", @col] - @table["other_lt_op_liab", @col]',
    cells: { line_item: "Net Other Long-Term Operating Assets" },
  })
  table.addRow("change_lt_op_assets_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Change in Op Lease ROU + Net Other LT Op Assets",
      FY22: null,
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          {
            expr: '(@table["op_lease_rou_assets", @col] - @table["op_lease_rou_assets", col.prev]) + (@table["net_other_lt_op_assets", @col] - @table["net_other_lt_op_assets", col.prev])',
          },
        ])
      ),
    },
  })

  return table
}
