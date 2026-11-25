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

export function buildBalanceSheet(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const bs = kg.cost.balanceSheet

  const balanceSheet = sheet.addTable(
    "BalanceSheet",
    "Consolidated Balance Sheets ($M)",
    {
      subtitle: [
        "FY22A–FY26A audited GAAP historicals; FY27E–FY36E integrated with cash flow, working capital, fixed assets, debt, and equity ($M)",
        `Source: ${kg.citations.balanceSheet}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(balanceSheet, {
    descriptorLabel: "Balance sheet ($M)",
  })

  balanceSheet.addSectionHeader("Assets")
  balanceSheet.addRow("cash_and_equivalents", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Cash and cash equivalents",
      bs.cashAndEquivalents
    ),
    expr: 'CashFlowStatement["cash_ending", @col]',
  })
  balanceSheet.addRow("short_term_investments", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Short-term investments",
        bs.shortTermInvestments
      ),
      FY27E: {
        expr: 'MAX(0, @table["short_term_investments", col.prev] - ScalarAssumptionsActive["sti_net_maturity_fy27", "val"])',
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.slice(1).map((p) => [
          p,
          { expr: '@table["short_term_investments", col.prev]' },
        ])
      ),
    },
  })
  balanceSheet.addRow("receivables_net", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["receivables_net", @col]',
    cells: { line_item: "Receivables, net" },
  })
  balanceSheet.addRow("merchandise_inventories", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["merchandise_inventories", @col]',
    cells: { line_item: "Merchandise inventories" },
  })
  balanceSheet.addRow("other_current_assets", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["other_current_assets", @col]',
    cells: { line_item: "Other current assets" },
  })
  balanceSheet.addRow("total_current_assets", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["cash_and_equivalents".."other_current_assets", @col])',
    cells: { line_item: "Total current assets" },
  })
  balanceSheet.addRow("ppe_net", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["end_ppe_net", @col]',
    cells: { line_item: "Property and equipment, net" },
  })
  balanceSheet.addRow("operating_lease_rou_assets", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["op_lease_rou_assets", @col]',
    cells: { line_item: "Operating lease ROU assets" },
  })
  balanceSheet.addRow("other_long_term_assets", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["other_lt_assets", @col]',
    cells: { line_item: "Other long-term assets" },
  })
  balanceSheet.addRow("total_assets", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["total_current_assets", @col] + SUM(@table["ppe_net".."other_long_term_assets", @col])',
    cells: { line_item: "Total assets" },
  })

  balanceSheet.addRowGutter()
  balanceSheet.addSectionHeader("Liabilities and stockholders' equity")
  balanceSheet.addRow("accounts_payable", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["accounts_payable", @col]',
    cells: { line_item: "Accounts payable" },
  })
  balanceSheet.addRow("accrued_salaries_and_benefits", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["accrued_salaries", @col]',
    cells: { line_item: "Accrued salaries and benefits" },
  })
  balanceSheet.addRow("accrued_member_rewards", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["accrued_member_rewards", @col]',
    cells: { line_item: "Accrued member rewards" },
  })
  balanceSheet.addRow("deferred_membership_fees", {
    ...rowFormatOptions("currency", 0),
    expr: 'WorkingCapitalPPE["deferred_membership_fees", @col]',
    cells: { line_item: "Deferred membership fees" },
  })
  balanceSheet.addRow("current_portion_of_long_term_debt", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["current_portion_lt_debt_bs", @col]',
    cells: {
      line_item: "Current portion of LT debt",
      FY24: {
        expr: 'DebtLeasesSchedule["current_portion_lt_debt_bs", "FY24"]',
        note: "FY24 $103M current debt folded into other current liabilities on FY25 10-K comparative balance sheet; separate line restored in FY25–FY26.",
      },
    },
  })
  balanceSheet.addRow("short_term_borrowings", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["revolver_end", @col]',
    cells: { line_item: "Short-term borrowings" },
  })
  balanceSheet.addRow("other_current_liabilities", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other current liabilities",
        bs.otherCurrentLiabilities
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'WorkingCapitalPPE["other_current_liab_op", @col] + DebtLeasesSchedule["current_op_lease_liab", @col] + DebtLeasesSchedule["current_fin_lease_liab", @col] + DebtLeasesSchedule["current_portion_in_ocl", @col]',
          },
        ])
      ),
    },
  })
  balanceSheet.addRow("total_current_liabilities", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["accounts_payable".."other_current_liabilities", @col])',
    cells: { line_item: "Total current liabilities" },
  })
  balanceSheet.addRow("long_term_debt", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["long_term_debt_excl_current", @col]',
    cells: { line_item: "Long-term debt, excl. current" },
  })
  balanceSheet.addRow("long_term_operating_lease_liabilities", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["lt_op_lease_liab", @col]',
    cells: { line_item: "LT operating lease liabilities" },
  })
  balanceSheet.addRow("other_long_term_liabilities", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other long-term liabilities",
        bs.otherLongTermLiabilities
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'WorkingCapitalPPE["other_lt_op_liab", @col] + DebtLeasesSchedule["lt_fin_lease_liab", @col]',
          },
        ])
      ),
    },
  })
  balanceSheet.addRow("total_liabilities", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["total_current_liabilities", @col] + SUM(@table["long_term_debt".."other_long_term_liabilities", @col])',
    cells: { line_item: "Total liabilities" },
  })

  balanceSheet.addRow("common_stock_and_apic", {
    ...rowFormatOptions("currency", 0),
    expr: 'ShareEquitySchedule["common_stock_and_apic", @col]',
    cells: { line_item: "Common stock and APIC" },
  })
  balanceSheet.addRow("aoci", {
    ...rowFormatOptions("currency", 0),
    expr: 'ShareEquitySchedule["aoci", @col]',
    cells: { line_item: "Accumulated other comp. loss" },
  })
  balanceSheet.addRow("retained_earnings", {
    ...rowFormatOptions("currency", 0),
    expr: 'ShareEquitySchedule["retained_earnings", @col]',
    cells: { line_item: "Retained earnings" },
  })
  balanceSheet.addRow("noncontrolling_interests", {
    ...rowFormatOptions("currency", 0),
    expr: 'ShareEquitySchedule["nci", @col]',
    cells: { line_item: "Noncontrolling interests" },
  })
  balanceSheet.addRow("total_equity", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["common_stock_and_apic".."noncontrolling_interests", @col])',
    cells: { line_item: "Total equity" },
  })
  balanceSheet.addRow("total_liabilities_and_equity", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["total_liabilities", @col] + @table["total_equity", @col]',
    cells: { line_item: "Total liabilities and equity" },
  })
  balanceSheet.addRow("balance_check", {
    ...rowFormatOptions("currency", 4),
    style: "bold",
    highlight: true,
    expr: '@table["total_assets", @col] - @table["total_liabilities_and_equity", @col]',
    cells: { line_item: "Balance check (Assets − L&E)" },
  })

  return balanceSheet
}

export function buildShareEquitySchedule(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const bs = kg.cost.balanceSheet
  const eq = kg.cost.equityAndShares

  const shareEquity = sheet.addTable(
    "ShareEquitySchedule",
    "Share Count, Capital Returns & Equity Roll-Forward ($M / M Shares)",
    {
      subtitle: [
        "FY22A–FY26A audited; FY27E includes declared special dividend plus excess-cash buyback sweep ($M / M shares)",
        `Source: ${kg.citations.balanceSheet}; ${kg.citations.guidanceCapitalReturn}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(shareEquity, {
    descriptorLabel: "Shares and equity ($M / M)",
  })

  shareEquity.addSectionHeader("Common and diluted share roll-forward (M)")
  shareEquity.addRow("beg_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "Beginning common shares (M)",
      FY22: {
        expr: 'MarketAnchors["fy21_ending_shares", "val"]',
        note: "FY21 ending common shares per FY22 Form 10-K.",
      },
      ...Object.fromEntries(
        [...HISTORICAL_PERIODS.slice(1), ...FORECAST_PERIODS].map((p) => [
          p,
          { expr: '@table["ending_shares", col.prev]' },
        ])
      ),
    },
  })
  shareEquity.addRow("rsu_shares_delivered", {
    ...rowFormatOptions("number", 3),
    cells: buildHistoricalCellMap(
      "(+) Net RSU shares delivered (M)",
      eq.rsuVestedDeliveredMillions
    ),
    expr: 'PeriodAssumptionsActive["rsu_vested_shares", @col]',
  })
  shareEquity.addRow("assumed_repurchase_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Assumed buyback price ($/sh)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, eq.repurchaseAvgPrice[p]])
      ),
      FY27E: {
        expr: '(MarketAnchors["cost_close_price", "val"] - ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]) * ((1 + ScalarAssumptionsActive["buyback_price_growth", "val"]) ^ DcfSchedule["discount_years", "FY27E"])',
        note: "Anchored to 2026-11-13 ex-special-dividend share price, pro-rated to FY27E cash-flow midpoint.",
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.slice(1).map((p) => [
          p,
          {
            expr: '@table["assumed_repurchase_price", col.prev] * (1 + ScalarAssumptionsActive["buyback_price_growth", "val"])',
          },
        ])
      ),
    },
  })
  shareEquity.addRow("baseline_buyback_dollars", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Baseline share repurchases ($M)",
      eq.repurchaseTotalCost
    ),
    expr: 'PeriodAssumptionsActive["annual_buyback_dollars", @col]',
  })
  shareEquity.addRow("excess_cash_buyback_sweep", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "(+) Excess cash buyback sweep",
      ...Object.fromEntries(HISTORICAL_PERIODS.map((p) => [p, 0])),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'MAX(0, (DebtLeasesSchedule["beg_cash_and_sti", @col] - DebtLeasesSchedule["scheduled_lt_debt_repayments", @col] - @table["special_dividend_paid", @col]) - ScalarAssumptionsActive["target_operating_cash_buffer", "val"]) * ScalarAssumptionsActive["excess_cash_buyback_sweep_pct", "val"]',
          },
        ])
      ),
    },
  })
  shareEquity.addRow("buyback_dollars", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'MIN(@table["baseline_buyback_dollars", @col] + @table["excess_cash_buyback_sweep", @col], MAX(0, (@table["beg_shares", @col] + @table["rsu_shares_delivered", @col] - 1) * @table["assumed_repurchase_price", @col]))',
    cells: { line_item: "Total share repurchases ($M)" },
  })
  shareEquity.addRow("shares_repurchased_10k", {
    ...rowFormatOptions("number", 3),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Shares repurchased (10-K)",
        eq.sharesRepurchasedMillions
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("shares_repurchased", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "(−) Shares repurchased (M)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '-@table["shares_repurchased_10k", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'IF(@table["assumed_repurchase_price", @col] > 0, -@table["buyback_dollars", @col] / @table["assumed_repurchase_price", @col], 0)',
          },
        ])
      ),
    },
  })
  shareEquity.addRow("ending_shares", {
    ...rowFormatOptions("number", 3),
    style: "subtotal",
    cells: buildHistoricalCellMap(
      "Ending common shares (M)",
      eq.endingSharesMillions
    ),
    expr: '@table["beg_shares", @col] + @table["rsu_shares_delivered", @col] + @table["shares_repurchased", @col]',
  })
  shareEquity.addRow("wavg_basic_shares", {
    ...rowFormatOptions("number", 3),
    cells: buildHistoricalCellMap(
      "Weighted-avg. basic shares (M)",
      eq.wavgBasicSharesMillions
    ),
    expr: '(@table["beg_shares", @col] + @table["ending_shares", @col]) / 2',
  })
  shareEquity.addRow("dilutive_rsus", {
    ...rowFormatOptions("number", 3),
    cells: buildHistoricalCellMap(
      "Incremental dilutive RSUs (M)",
      eq.dilutiveRsusMillions
    ),
    expr: 'ScalarAssumptionsActive["dilutive_rsu_shares", "val"]',
  })
  shareEquity.addRow("wavg_diluted_shares", {
    ...rowFormatOptions("number", 3),
    style: "total",
    cells: buildHistoricalCellMap(
      "Weighted-avg. diluted shares (M)",
      eq.wavgDilutedSharesMillions
    ),
    expr: '@table["wavg_basic_shares", @col] + @table["dilutive_rsus", @col]',
  })

  shareEquity.addRowGutter()
  shareEquity.addSectionHeader("Dividend and equity roll-forward ($M)")
  shareEquity.addRow("cash_dividends_declared_hist", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Dividends declared (10-K)",
        eq.cashDividendsDeclared
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("total_cash_dividends_paid_cf", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Dividends paid (CF stmt)",
        kg.cost.cashFlow.cashDividendPayments
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("regular_dividends_paid", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Regular cash dividends ($M)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '-@table["total_cash_dividends_paid_cf", @col] - @table["special_dividend_paid", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'IncomeStatement["regular_dps", @col] * @table["wavg_basic_shares", @col]',
          },
        ])
      ),
    },
  })
  shareEquity.addRow("special_dividend_paid", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Special cash dividend ($M)",
      FY22: 0,
      FY23: 0,
      FY24: {
        value: kg.cost.qoe.fy24SpecialDivTotal,
        note: "FY24 $15.00/sh special dividend paid January 2024.",
      },
      FY25: 0,
      FY26: 0,
      FY27E: {
        expr: 'ScalarAssumptionsActive["special_dividend_ps_fy27", "val"] * MarketAnchors["cost_sec_shares", "val"]',
        note: "Declared special cash dividend across SEC shares (ex-date Nov 24, payable Dec 4, 2026).",
      },
      ...Object.fromEntries(FORECAST_PERIODS.slice(1).map((p) => [p, 0])),
    },
  })
  shareEquity.addRow("rsu_tax_withholdings", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "RSU tax withholdings paid ($M)",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          { expr: '-CashFlowStatement["tax_withholdings_sbc", @col]' },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: 'OperatingSchedule["sbc_expense", @col] * ScalarAssumptionsActive["rsu_tax_withholding_pct_sbc", "val"]',
          },
        ])
      ),
    },
  })
  shareEquity.addRow("common_stock_hist", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap("Memo: Common stock par value", bs.commonStock),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("apic_hist", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Additional paid-in capital",
        bs.additionalPaidInCapital
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("common_stock_and_apic", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Common stock & APIC ending",
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [
          p,
          {
            expr: '@table["common_stock_hist", @col] + @table["apic_hist", @col]',
          },
        ])
      ),
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: '@table["common_stock_and_apic", col.prev] + OperatingSchedule["sbc_expense", @col] - @table["rsu_tax_withholdings", @col]',
          },
        ])
      ),
    },
  })
  shareEquity.addRow("aoci", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Accumulated other comp. loss", bs.aoci),
    expr: '@table["aoci", col.prev]',
  })
  shareEquity.addRow("retained_earnings", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Retained earnings", bs.retainedEarnings),
    expr: '@table["retained_earnings", col.prev] + IncomeStatement["net_income_attr_costco", @col] - @table["regular_dividends_paid", @col] - @table["special_dividend_paid", @col] - @table["buyback_dollars", @col]',
  })
  shareEquity.addRow("nci", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Noncontrolling interests",
        bs.noncontrollingInterests
      ),
      ...zeroForecastCells(
        "Zero noncontrolling interest following FY22 Taiwan JV buyout."
      ),
    },
  })

  return shareEquity
}
