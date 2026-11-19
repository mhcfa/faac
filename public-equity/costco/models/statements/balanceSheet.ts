import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  addTimeSeriesColumns,
  buildHistoricalCellMap,
  rowFormatOptions,
} from "../timeline.ts"

export function buildBalanceSheetAndEquity(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): { readonly balanceSheet: Table; readonly shareEquity: Table } {
  const bs = kg.cost.balanceSheet
  const eq = kg.cost.equityAndShares

  const balanceSheet = sheet.addTable(
    "BalanceSheet",
    "Consolidated Balance Sheets ($M)",
    {
      subtitle: [
        "FY22–FY26 audited GAAP historicals; FY27E–FY36E 100% formula-linked across Cash Flow, Working Capital/PP&E, Debt/Leases & Equity with zero plugs ($M)",
        `Source: ${kg.citations.balanceSheet}`,
      ],
      currency: "USD",
    }
  )
  addTimeSeriesColumns(balanceSheet, {
    descriptorLabel: "Balance Sheet Line ($M)",
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
    cells: { line_item: "Operating lease right-of-use assets" },
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

  balanceSheet.addSectionHeader("Liabilities & Stockholders' Equity")
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
      line_item: {
        value: "Current portion of long-term debt",
        note: "FY24 $103M folded inside Other Current Liabilities per FY25 10-K BS; restored FY25-FY26.",
      },
    },
  })
  balanceSheet.addRow("short_term_borrowings", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["revolver_end", @col]',
    cells: {
      line_item: "Short-term / revolver borrowings (zero in Base/Bull/Bear)",
    },
  })
  balanceSheet.addRow("other_current_liabilities", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other current liabilities (incl. current op/fin leases & FY24 debt reclass)",
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
    cells: { line_item: "Long-term debt, excluding current portion" },
  })
  balanceSheet.addRow("long_term_operating_lease_liabilities", {
    ...rowFormatOptions("currency", 0),
    expr: 'DebtLeasesSchedule["lt_op_lease_liab", @col]',
    cells: { line_item: "Long-term operating lease liabilities" },
  })
  balanceSheet.addRow("other_long_term_liabilities", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Other long-term liabilities (incl. LT finance leases)",
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
    cells: { line_item: "Common stock & additional paid-in capital" },
  })
  balanceSheet.addRow("aoci", {
    ...rowFormatOptions("currency", 0),
    expr: 'ShareEquitySchedule["aoci", @col]',
    cells: { line_item: "Accumulated other comprehensive loss" },
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
    highlight: true,
    expr: '@table["total_assets", @col] - @table["total_liabilities_and_equity", @col]',
    cells: {
      line_item: {
        value: "Balance Sheet Tie-Out Check (Assets - L&E = 0)",
        note: "Zero-plug identity check across all 15 periods and all 3 scenarios.",
      },
    },
  })

  // Share Count & Equity Roll-Forward Table
  const shareEquity = sheet.addTable(
    "ShareEquitySchedule",
    "Share Count, Capital Return & Stockholders' Equity Roll-Forward ($M / M Shares)",
    {
      subtitle: [
        "FY22–FY26 audited; FY27E includes $13,294M special dividend ($30.00/sh x 443.129M SEC shares) plus non-circular excess-cash buyback sweep ($M / M shares)",
        `Source: ${kg.citations.balanceSheet}`,
      ],
      currency: "USD",
      below: balanceSheet,
    }
  )
  addTimeSeriesColumns(shareEquity, {
    descriptorLabel: "Equity / Share Line ($M / M Shares)",
  })

  shareEquity.addSectionHeader("1. Common & Diluted Share Roll-Forward (M)")
  shareEquity.addRow("beg_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "Beginning common shares outstanding (M)",
      FY22: { expr: 'MarketAnchors["fy21_ending_shares", "val"]' },
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
      "(+) RSUs vested & net delivered (M)",
      eq.rsuVestedDeliveredMillions
    ),
    expr: 'PeriodAssumptionsActive["rsu_vested_shares", @col]',
  })
  shareEquity.addRow("assumed_repurchase_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: {
        value: "Assumed share repurchase price ($/sh, ex-div anchor)",
        note: "FY27E anchors to 2026-11-13 ex-$30 special dividend market price, compounding independently of intrinsic DCF without circularity.",
      },
      ...Object.fromEntries(
        HISTORICAL_PERIODS.map((p) => [p, eq.repurchaseAvgPrice[p]])
      ),
      FY27E: {
        expr: '(MarketAnchors["cost_close_price", "val"] - ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]) * (1 + ScalarAssumptionsActive["buyback_price_growth", "val"])',
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
      line_item: {
        value: "(+) Opening excess cash buyback sweep ($M)",
        note: "Non-circular sweep of excess opening Cash & STI (net of scheduled debt maturities & exogenous special dividend) above target operating cash buffer.",
      },
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
    cells: {
      line_item: {
        value: "Total share repurchases (baseline + excess cash sweep, $M)",
        note: "Sum of baseline buybacks + excess-cash sweep, floored at >=1.0M remaining shares so extreme low-price stress cannot drive share count negative (non-binding in Base/Bull/Bear).",
      },
    },
  })
  shareEquity.addRow("shares_repurchased_10k", {
    ...rowFormatOptions("number", 3),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Shares repurchased (10-K positive count, M)",
        eq.sharesRepurchasedMillions
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("shares_repurchased", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "(-) Shares repurchased (M)",
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
            expr: '-@table["buyback_dollars", @col] / @table["assumed_repurchase_price", @col]',
          },
        ])
      ),
    },
  })
  shareEquity.addRow("ending_shares", {
    ...rowFormatOptions("number", 3),
    style: "subtotal",
    cells: buildHistoricalCellMap(
      "Ending common shares outstanding (M)",
      eq.endingSharesMillions
    ),
    expr: '@table["beg_shares", @col] + @table["rsu_shares_delivered", @col] + @table["shares_repurchased", @col]',
  })
  shareEquity.addRow("wavg_basic_shares", {
    ...rowFormatOptions("number", 3),
    cells: buildHistoricalCellMap(
      "Weighted-average basic shares (M)",
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
      "Weighted-average diluted shares (M)",
      eq.wavgDilutedSharesMillions
    ),
    expr: '@table["wavg_basic_shares", @col] + @table["dilutive_rsus", @col]',
  })

  shareEquity.addSectionHeader("2. Dividend & Equity Roll-Forward ($M)")
  shareEquity.addRow("cash_dividends_declared_hist", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Cash dividends declared (10-K equity statement, $M)",
        eq.cashDividendsDeclared
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("total_cash_dividends_paid_cf", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Total cash dividend payments (10-K CF statement, $M)",
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
      line_item: {
        value: "Special cash dividend ($M)",
        note: "FY24 = $15.00/sh ($6,655M); FY27E = $30.00/sh x 443.129M SEC shares = $13,294M (paid Dec 4, 2026).",
      },
      FY22: 0,
      FY23: 0,
      FY24: kg.cost.qoe.fy24SpecialDivTotal,
      FY25: 0,
      FY26: 0,
      FY27E: {
        expr: 'ScalarAssumptionsActive["special_dividend_ps_fy27", "val"] * MarketAnchors["cost_sec_shares", "val"]',
      },
      ...Object.fromEntries(FORECAST_PERIODS.slice(1).map((p) => [p, 0])),
    },
  })
  shareEquity.addRow("rsu_tax_withholdings", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "RSU tax withholdings paid in cash ($M)",
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
      ...buildHistoricalCellMap(
        "Memo: Common stock par value ($M)",
        bs.commonStock
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("apic_hist", {
    ...rowFormatOptions("currency", 0),
    cells: {
      ...buildHistoricalCellMap(
        "Memo: Additional paid-in capital ($M)",
        bs.additionalPaidInCapital
      ),
      ...Object.fromEntries(FORECAST_PERIODS.map((p) => [p, null])),
    },
  })
  shareEquity.addRow("common_stock_and_apic", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Common stock & APIC ending balance ($M)",
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
    cells: buildHistoricalCellMap(
      "Accumulated other comprehensive income (loss)",
      bs.aoci
    ),
    expr: '@table["aoci", col.prev]',
  })
  shareEquity.addRow("retained_earnings", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap("Retained earnings", bs.retainedEarnings),
    expr: '@table["retained_earnings", col.prev] + IncomeStatement["net_income_attr_costco", @col] - @table["regular_dividends_paid", @col] - @table["special_dividend_paid", @col] - @table["buyback_dollars", @col]',
  })
  shareEquity.addRow("nci", {
    ...rowFormatOptions("currency", 0),
    cells: buildHistoricalCellMap(
      "Noncontrolling interests",
      bs.noncontrollingInterests
    ),
    expr: "0",
  })

  return { balanceSheet, shareEquity }
}
