import { Cell, type Sheet, type Table } from "f8-engine"
import type { AuditedDataSnapshot, CrmH1Metrics } from "../kg.ts"
import { addAnnualColumns, wrapSubtitle } from "../timeline.ts"

export interface CoreStatementTables {
  readonly incomeStatement: Table
  readonly balanceSheet: Table
  readonly cashFlowStatement: Table
}

export interface LtmAndQ2AnchorTables {
  readonly ltmFlowBridge: Table
  readonly q2BalanceSheetAnchor: Table
}

export function buildStatementsTables(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): CoreStatementTables {
  const is = audited.crmIs
  const bs = audited.crmBs
  const cf = audited.crmCf

  // Table 1: Consolidated Statements of Operations (FY24A-FY31E)
  const incomeStatement = sheet.addTable(
    "IncomeStatement",
    "Consolidated Statements of Operations (US GAAP)",
    {
      subtitle: wrapSubtitle(
        `($ in Millions, except per-share and shares in Millions) | Source: ${audited.citations.crmIs10K}; FY27E–FY31E integrated forecast`,
        106
      ),
    }
  )
  addAnnualColumns(incomeStatement)

  incomeStatement.addSectionHeader("Revenues")
  incomeStatement.addRow("subscription_and_support_rev", {
    cells: {
      item: "Subscription and support",
      FY24A: is.subscriptionAndSupportRev.FY24A,
      FY25A: is.subscriptionAndSupportRev.FY25A,
      FY26A: is.subscriptionAndSupportRev.FY26A,
    },
    expr: 'RevenueSchedule["subscription_and_support_rev", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("professional_services_rev", {
    cells: {
      item: "Professional services and other",
      FY24A: is.professionalServicesRev.FY24A,
      FY25A: is.professionalServicesRev.FY25A,
      FY26A: is.professionalServicesRev.FY26A,
    },
    expr: 'RevenueSchedule["professional_services_rev", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("total_revenue", {
    cells: { item: "Total revenues" },
    expr: '@table["subscription_and_support_rev", @col] + @table["professional_services_rev", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })

  incomeStatement.addRowGutter()
  incomeStatement.addSectionHeader("Cost of revenues")
  incomeStatement.addRow("cost_of_rev_subscription", {
    cells: {
      item: "Cost of subscription and support",
      FY24A: is.costOfRevSubscription.FY24A,
      FY25A: is.costOfRevSubscription.FY25A,
      FY26A: is.costOfRevSubscription.FY26A,
    },
    expr: 'CostAndSbcSchedule["cor_sub_cash", @col] + CostAndSbcSchedule["sbc_cor", @col] + CostAndSbcSchedule["amort_cor", @col] + PpeAndIntangiblesSchedule["ppe_and_fin_lease_depr", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("cost_of_rev_prof_services", {
    cells: {
      item: "Cost of professional services",
      FY24A: is.costOfRevProfServices.FY24A,
      FY25A: is.costOfRevProfServices.FY25A,
      FY26A: is.costOfRevProfServices.FY26A,
    },
    expr: 'CostAndSbcSchedule["cor_ps_cash", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("total_cost_of_revenue", {
    cells: { item: "Total cost of revenues" },
    expr: '@table["cost_of_rev_subscription", @col] + @table["cost_of_rev_prof_services", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  incomeStatement.addRow("gross_profit", {
    cells: { item: "Gross profit" },
    expr: '@table["total_revenue", @col] - @table["total_cost_of_revenue", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })

  incomeStatement.addRowGutter()
  incomeStatement.addSectionHeader("Operating expenses")
  incomeStatement.addRow("rd_expense", {
    cells: {
      item: "Research and development",
      FY24A: is.rdExpense.FY24A,
      FY25A: is.rdExpense.FY25A,
      FY26A: is.rdExpense.FY26A,
    },
    expr: 'CostAndSbcSchedule["rd_cash", @col] + CostAndSbcSchedule["sbc_rd", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("sm_expense", {
    cells: {
      item: "Marketing and sales",
      FY24A: is.smExpense.FY24A,
      FY25A: is.smExpense.FY25A,
      FY26A: is.smExpense.FY26A,
    },
    expr: 'CostAndSbcSchedule["sm_cash", @col] + CostAndSbcSchedule["sbc_sm", @col] + CostAndSbcSchedule["amort_sm", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("ga_expense", {
    cells: {
      item: "General and administrative",
      FY24A: is.gaExpense.FY24A,
      FY25A: is.gaExpense.FY25A,
      FY26A: is.gaExpense.FY26A,
    },
    expr: 'CostAndSbcSchedule["ga_cash", @col] + CostAndSbcSchedule["sbc_ga", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("restructuring", {
    cells: {
      item: "Restructuring & acquisition costs",
      FY24A: is.restructuring.FY24A,
      FY25A: is.restructuring.FY25A,
      FY26A: is.restructuring.FY26A,
    },
    expr: 'CostAndSbcSchedule["restructuring_gaap", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("total_opex", {
    cells: { item: "Total operating expenses" },
    expr: 'SUM(@table["rd_expense".."restructuring", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  incomeStatement.addRow("operating_income", {
    cells: { item: "Income from operations (GAAP EBIT)" },
    expr: '@table["gross_profit", @col] - @table["total_opex", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "alt",
  })

  incomeStatement.addRowGutter()
  incomeStatement.addSectionHeader("Non-operating items & net income")
  incomeStatement.addRow("interest_expense", {
    cells: {
      item: "Interest expense",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: 'DebtSchedule["interest_expense", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("gains_on_strategic_investments_net", {
    cells: {
      item: "Gains on strategic investments, net",
      FY24A: is.gainsOnStrategicInvestmentsNet.FY24A,
      FY25A: is.gainsOnStrategicInvestmentsNet.FY25A,
      FY26A: is.gainsOnStrategicInvestmentsNet.FY26A,
      FY27E: new Cell({
        expr: 'LtmFlowBridge["gains_on_strategic_investments_net", "H1_FY27A"]',
      }),
      FY28E: new Cell({
        value: 0,
        note: "No unannounced future strategic investment mark-to-market gains assumed beyond H1 FY27 actuals.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("other_income_expense_net", {
    cells: {
      item: "Other income (expense), net",
      FY24A: is.otherIncomeExpenseNet.FY24A,
      FY25A: is.otherIncomeExpenseNet.FY25A,
      FY26A: is.otherIncomeExpenseNet.FY26A,
    },
    expr: 'DebtSchedule["interest_income", @col]',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("income_before_taxes", {
    cells: { item: "Income before income taxes" },
    expr: '@table["operating_income", @col] + @table["interest_expense", @col] + @table["gains_on_strategic_investments_net", @col] + @table["other_income_expense_net", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  incomeStatement.addRow("income_tax_provision", {
    cells: {
      item: "Provision for income taxes",
      FY24A: is.incomeTaxProvision.FY24A,
      FY25A: is.incomeTaxProvision.FY25A,
      FY26A: is.incomeTaxProvision.FY26A,
    },
    expr: 'IF(@table["income_before_taxes", @col] > 0, -@table["income_before_taxes", @col] * ScalarDrivers["effectiveTaxRate", "active"], 0)',
    format: "currency",
    decimals: 0,
  })
  incomeStatement.addRow("net_income", {
    cells: { item: "Net income (US GAAP)" },
    expr: '@table["income_before_taxes", @col] + @table["income_tax_provision", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })

  incomeStatement.addRowGutter()
  incomeStatement.addSectionHeader("Per-share data & key margins")
  incomeStatement.addRow("basic_shares", {
    cells: {
      item: "Weighted-average basic shares (M)",
      FY24A: is.basicShares.FY24A,
      FY25A: is.basicShares.FY25A,
      FY26A: is.basicShares.FY26A,
    },
    expr: 'ShareCountSchedule["weighted_avg_basic_shares", @col]',
    format: "number",
    decimals: 1,
  })
  incomeStatement.addRow("diluted_shares", {
    cells: {
      item: "Weighted-average diluted shares (M)",
      FY24A: is.dilutedShares.FY24A,
      FY25A: is.dilutedShares.FY25A,
      FY26A: is.dilutedShares.FY26A,
    },
    expr: 'ShareCountSchedule["weighted_avg_diluted_shares", @col]',
    format: "number",
    decimals: 1,
  })
  incomeStatement.addRow("basic_eps", {
    cells: {
      item: "Basic GAAP EPS ($/sh)",
      FY24A: is.basicEps.FY24A,
      FY25A: is.basicEps.FY25A,
      FY26A: is.basicEps.FY26A,
    },
    expr: '@table["net_income", @col] / @table["basic_shares", @col]',
    format: "currency",
    decimals: 2,
  })
  incomeStatement.addRow("diluted_eps", {
    cells: {
      item: "Diluted GAAP EPS ($/sh)",
      FY24A: is.dilutedEps.FY24A,
      FY25A: is.dilutedEps.FY25A,
      FY26A: is.dilutedEps.FY26A,
    },
    expr: '@table["net_income", @col] / @table["diluted_shares", @col]',
    format: "currency",
    decimals: 2,
    style: "subtotal",
  })
  incomeStatement.addRow("gross_margin", {
    cells: { item: "GAAP gross margin" },
    expr: '@table["gross_profit", @col] / @table["total_revenue", @col]',
    format: "percentage",
    decimals: 1,
  })
  incomeStatement.addRow("gaap_operating_margin", {
    cells: { item: "GAAP operating margin" },
    expr: '@table["operating_income", @col] / @table["total_revenue", @col]',
    format: "percentage",
    decimals: 1,
  })
  incomeStatement.addRow("nongaap_operating_margin", {
    cells: { item: "Non-GAAP operating margin" },
    expr: 'CostAndSbcSchedule["nongaap_operating_margin", @col]',
    format: "percentage",
    decimals: 1,
  })
  incomeStatement.addRow("effective_tax_rate", {
    cells: { item: "Effective GAAP tax rate" },
    expr: 'IF(@table["income_before_taxes", @col] > 0, -@table["income_tax_provision", @col] / @table["income_before_taxes", @col], NA())',
    format: "percentage",
    decimals: 1,
  })
  incomeStatement.addRow("gaap_ebitda", {
    cells: { item: "GAAP EBITDA (ex-op. lease ROU)" },
    expr: '@table["operating_income", @col] + PpeAndIntangiblesSchedule["total_intangibles_amort", @col] + PpeAndIntangiblesSchedule["ppe_and_fin_lease_depr", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  incomeStatement.addRow("adj_ebitda", {
    cells: { item: "Adjusted EBITDA (GAAP + SBC)" },
    expr: '@table["gaap_ebitda", @col] + CashFlowStatement["sbc_expense", @col]',
    format: "currency",
    decimals: 0,
  })

  // Table 2: Consolidated Balance Sheets (FY24A-FY31E)
  const balanceSheet = sheet.addTable(
    "BalanceSheet",
    "Consolidated Balance Sheets (US GAAP)",
    {
      subtitle: wrapSubtitle(
        `($ in Millions, as of January 31) | Sources: ${audited.citations.crmBs10KPrior}; ${audited.citations.crmBs10K}; FY27E–FY31E integrated forecast`,
        118
      ),
    }
  )
  addAnnualColumns(balanceSheet)

  balanceSheet.addSectionHeader("Current assets")
  balanceSheet.addRow("cash_and_equivalents", {
    cells: {
      item: "Cash and cash equivalents",
      FY24A: bs.cashAndEquivalents.FY24A,
      FY25A: bs.cashAndEquivalents.FY25A,
      FY26A: bs.cashAndEquivalents.FY26A,
    },
    expr: 'CashFlowStatement["ending_cash", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("marketable_securities", {
    cells: {
      item: "Marketable securities",
      FY24A: bs.marketableSecurities.FY24A,
      FY25A: bs.marketableSecurities.FY25A,
      FY26A: bs.marketableSecurities.FY26A,
    },
    expr: '@table["marketable_securities", col.prev] - (CashFlowStatement["purchases_marketable_securities", @col] + CashFlowStatement["sales_marketable_securities", @col] + CashFlowStatement["maturities_marketable_securities", @col])',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("accounts_receivable_net", {
    cells: {
      item: "Accounts receivable, net",
      FY24A: bs.accountsReceivableNet.FY24A,
      FY25A: bs.accountsReceivableNet.FY25A,
      FY26A: bs.accountsReceivableNet.FY26A,
    },
    expr: 'WorkingCapitalSchedule["ar_ending", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("capitalized_contract_costs_current", {
    cells: {
      item: "Capitalized contract costs, cur.",
      FY24A: bs.capitalizedContractCostsCurrent.FY24A,
      FY25A: bs.capitalizedContractCostsCurrent.FY25A,
      FY26A: bs.capitalizedContractCostsCurrent.FY26A,
    },
    expr: 'WorkingCapitalSchedule["closing_ccc_cur", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("prepaid_and_other_current_assets", {
    cells: {
      item: "Prepaid & other current assets",
      FY24A: bs.prepaidAndOtherCurrentAssets.FY24A,
      FY25A: bs.prepaidAndOtherCurrentAssets.FY25A,
      FY26A: bs.prepaidAndOtherCurrentAssets.FY26A,
    },
    expr: 'WorkingCapitalSchedule["prepaid_ending", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("total_current_assets", {
    cells: { item: "Total current assets" },
    expr: 'SUM(@table["cash_and_equivalents".."prepaid_and_other_current_assets", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  balanceSheet.addRowGutter()
  balanceSheet.addSectionHeader("Noncurrent assets")
  balanceSheet.addRow("ppe_net", {
    cells: {
      item: "Property and equipment, net",
      FY24A: bs.ppeNet.FY24A,
      FY25A: bs.ppeNet.FY25A,
      FY26A: bs.ppeNet.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["closing_ppe", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("operating_lease_rou_assets", {
    cells: {
      item: "Operating lease ROU assets, net",
      FY24A: bs.operatingLeaseRouAssets.FY24A,
      FY25A: bs.operatingLeaseRouAssets.FY25A,
      FY26A: bs.operatingLeaseRouAssets.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["closing_op_lease_rou", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("capitalized_contract_costs_noncurrent", {
    cells: {
      item: "Capitalized contract costs, noncur.",
      FY24A: bs.capitalizedContractCostsNoncurrent.FY24A,
      FY25A: bs.capitalizedContractCostsNoncurrent.FY25A,
      FY26A: bs.capitalizedContractCostsNoncurrent.FY26A,
    },
    expr: 'WorkingCapitalSchedule["closing_ccc_noncur", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("strategic_investments", {
    cells: {
      item: "Strategic investments",
      FY24A: bs.strategicInvestments.FY24A,
      FY25A: bs.strategicInvestments.FY25A,
      FY26A: bs.strategicInvestments.FY26A,
    },
    expr: '@table["strategic_investments", col.prev] + IncomeStatement["gains_on_strategic_investments_net", @col] - (CashFlowStatement["purchases_strategic_investments", @col] + CashFlowStatement["sales_strategic_investments", @col])',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("goodwill", {
    cells: {
      item: "Goodwill",
      FY24A: bs.goodwill.FY24A,
      FY25A: bs.goodwill.FY25A,
      FY26A: bs.goodwill.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["closing_goodwill", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("purchased_intangibles_net", {
    cells: {
      item: "Purchased intangible assets, net",
      FY24A: bs.purchasedIntangiblesNet.FY24A,
      FY25A: bs.purchasedIntangiblesNet.FY25A,
      FY26A: bs.purchasedIntangiblesNet.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["closing_intangibles", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("deferred_tax_and_other_assets_net", {
    cells: {
      item: "Deferred tax & other assets, net",
      FY24A: bs.deferredTaxAndOtherAssetsNet.FY24A,
      FY25A: bs.deferredTaxAndOtherAssetsNet.FY25A,
      FY26A: bs.deferredTaxAndOtherAssetsNet.FY26A,
    },
    expr: '@table["deferred_tax_and_other_assets_net", col.prev] - CashFlowStatement["deferred_tax_strategic_inv", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("total_assets", {
    cells: { item: "Total assets" },
    expr: '@table["total_current_assets", @col] + SUM(@table["ppe_net".."deferred_tax_and_other_assets_net", @col])',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })

  balanceSheet.addRowGutter()
  balanceSheet.addSectionHeader("Current liabilities")
  balanceSheet.addRow("ap_accrued_and_other_current_liab", {
    cells: {
      item: "Accounts payable & accrued liab.",
      FY24A: bs.apAccruedAndOtherCurrentLiab.FY24A,
      FY25A: bs.apAccruedAndOtherCurrentLiab.FY25A,
      FY26A: bs.apAccruedAndOtherCurrentLiab.FY26A,
    },
    expr: 'WorkingCapitalSchedule["ap_accrued_ending", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("operating_lease_liab_current", {
    cells: {
      item: "Operating lease liabilities, cur.",
      FY24A: bs.operatingLeaseLiabCurrent.FY24A,
      FY25A: bs.operatingLeaseLiabCurrent.FY25A,
      FY26A: bs.operatingLeaseLiabCurrent.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["closing_op_lease_liab_cur", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("unearned_revenue", {
    cells: {
      item: "Unearned revenue",
      FY24A: bs.unearnedRevenue.FY24A,
      FY25A: bs.unearnedRevenue.FY25A,
      FY26A: bs.unearnedRevenue.FY26A,
    },
    expr: 'WorkingCapitalSchedule["unearned_rev_ending", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("debt_current", {
    cells: {
      item: "Debt, current",
      FY24A: bs.debtCurrent.FY24A,
      FY25A: bs.debtCurrent.FY25A,
      FY26A: bs.debtCurrent.FY26A,
    },
    expr: 'DebtSchedule["bs_debt_current", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("total_current_liabilities", {
    cells: { item: "Total current liabilities" },
    expr: 'SUM(@table["ap_accrued_and_other_current_liab".."debt_current", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  balanceSheet.addRowGutter()
  balanceSheet.addSectionHeader("Noncurrent liabilities")
  balanceSheet.addRow("debt_noncurrent", {
    cells: {
      item: "Noncurrent debt",
      FY24A: bs.debtNoncurrent.FY24A,
      FY25A: bs.debtNoncurrent.FY25A,
      FY26A: bs.debtNoncurrent.FY26A,
    },
    expr: 'DebtSchedule["bs_debt_noncurrent", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("operating_lease_liab_noncurrent", {
    cells: {
      item: "Operating lease liab., noncurrent",
      FY24A: bs.operatingLeaseLiabNoncurrent.FY24A,
      FY25A: bs.operatingLeaseLiabNoncurrent.FY25A,
      FY26A: bs.operatingLeaseLiabNoncurrent.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["closing_op_lease_liab_noncur", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("other_noncurrent_liabilities", {
    cells: {
      item: "Other noncurrent liab. (fin. lease)",
      FY24A: bs.otherNoncurrentLiabilities.FY24A,
      FY25A: bs.otherNoncurrentLiabilities.FY25A,
      FY26A: bs.otherNoncurrentLiabilities.FY26A,
    },
    expr: '@table["other_noncurrent_liabilities", col.prev] + PpeAndIntangiblesSchedule["fin_lease_add", @col] + CashFlowStatement["principal_payments_financing_obligations", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("total_liabilities", {
    cells: { item: "Total liabilities" },
    expr: '@table["total_current_liabilities", @col] + SUM(@table["debt_noncurrent".."other_noncurrent_liabilities", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })

  balanceSheet.addRowGutter()
  balanceSheet.addSectionHeader("Stockholders' equity")
  balanceSheet.addRow("common_stock", {
    cells: {
      item: "Common stock",
      FY24A: bs.commonStock.FY24A,
      FY25A: bs.commonStock.FY25A,
      FY26A: bs.commonStock.FY26A,
    },
    expr: '@table["common_stock", col.prev]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("preferred_stock", {
    cells: {
      item: "Preferred stock",
      FY24A: bs.preferredStock.FY24A,
      FY25A: bs.preferredStock.FY25A,
      FY26A: bs.preferredStock.FY26A,
      FY27E: new Cell({
        value: 0,
        note: "No preferred stock outstanding or projected across forecast periods.",
      }),
      FY28E: 0,
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("treasury_stock", {
    cells: {
      item: "Treasury stock, at cost",
      FY24A: bs.treasuryStock.FY24A,
      FY25A: bs.treasuryStock.FY25A,
      FY26A: bs.treasuryStock.FY26A,
    },
    expr: '@table["treasury_stock", col.prev] + CashFlowStatement["share_repurchases", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("apic", {
    cells: {
      item: "Additional paid-in capital",
      FY24A: bs.apic.FY24A,
      FY25A: bs.apic.FY25A,
      FY26A: bs.apic.FY26A,
    },
    expr: '@table["apic", col.prev] + CashFlowStatement["sbc_expense", @col] + CashFlowStatement["proceeds_employee_stock_plans", @col] + CashFlowStatement["tax_payments_net_share_settlement", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("aoci", {
    cells: {
      item: "Accumulated other comp. income",
      FY24A: bs.aoci.FY24A,
      FY25A: bs.aoci.FY25A,
      FY26A: bs.aoci.FY26A,
    },
    expr: '@table["aoci", col.prev]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("retained_earnings", {
    cells: {
      item: "Retained earnings",
      FY24A: bs.retainedEarnings.FY24A,
      FY25A: bs.retainedEarnings.FY25A,
      FY26A: bs.retainedEarnings.FY26A,
    },
    expr: '@table["retained_earnings", col.prev] + IncomeStatement["net_income", @col] + CashFlowStatement["dividends_paid", @col]',
    format: "currency",
    decimals: 0,
  })
  balanceSheet.addRow("total_equity", {
    cells: { item: "Total stockholders' equity" },
    expr: 'SUM(@table["common_stock".."retained_earnings", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })
  balanceSheet.addRow("total_liabilities_and_equity", {
    cells: { item: "Total liabilities & equity" },
    expr: '@table["total_liabilities", @col] + @table["total_equity", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })
  balanceSheet.addRow("balance_check", {
    cells: { item: "Balance sheet check" },
    expr: '@table["total_assets", @col] - @table["total_liabilities_and_equity", @col]',
    format: "currency",
    decimals: 2,
  })

  // Table 3: Consolidated Statements of Cash Flows (FY24A-FY31E)
  const cashFlowStatement = sheet.addTable(
    "CashFlowStatement",
    "Consolidated Statements of Cash Flows (US GAAP)",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Source: ${audited.citations.crmCf10K}; FY27E–FY31E ties directly to Balance Sheet cash`,
        128
      ),
    }
  )
  addAnnualColumns(cashFlowStatement)

  cashFlowStatement.addSectionHeader("Operating activities")
  cashFlowStatement.addRow("net_income", {
    cells: {
      item: "Net income",
      FY24A: cf.netIncome.FY24A,
      FY25A: cf.netIncome.FY25A,
      FY26A: cf.netIncome.FY26A,
    },
    expr: 'IncomeStatement["net_income", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("da_expense", {
    cells: {
      item: "Depreciation and amortization",
      FY24A: cf.daExpense.FY24A,
      FY25A: cf.daExpense.FY25A,
      FY26A: cf.daExpense.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["total_da_expense", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("amort_contract_costs", {
    cells: {
      item: "Amort. of cap. contract costs",
      FY24A: cf.amortContractCosts.FY24A,
      FY25A: cf.amortContractCosts.FY25A,
      FY26A: cf.amortContractCosts.FY26A,
    },
    expr: 'WorkingCapitalSchedule["amort_contract_costs", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("sbc_expense", {
    cells: {
      item: "Stock-based compensation expense",
      FY24A: cf.sbcExpense.FY24A,
      FY25A: cf.sbcExpense.FY25A,
      FY26A: cf.sbcExpense.FY26A,
    },
    expr: 'CostAndSbcSchedule["total_sbc", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("strategic_inv_gains_losses_cf", {
    cells: {
      item: "(Gains) losses on strategic inv.",
      FY24A: cf.strategicInvGainsLossesCf.FY24A,
      FY25A: cf.strategicInvGainsLossesCf.FY25A,
      FY26A: cf.strategicInvGainsLossesCf.FY26A,
    },
    expr: '-IncomeStatement["gains_on_strategic_investments_net", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("deferred_tax_strategic_inv", {
    cells: {
      item: "Deferred tax on strat. inv. gains",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: 'IncomeStatement["gains_on_strategic_investments_net", @col] * ScalarDrivers["effectiveTaxRate", "active"]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("chg_accounts_receivable", {
    cells: {
      item: "Change in accounts receivable",
      FY24A: cf.chgAccountsReceivable.FY24A,
      FY25A: cf.chgAccountsReceivable.FY25A,
      FY26A: cf.chgAccountsReceivable.FY26A,
    },
    expr: '-(BalanceSheet["accounts_receivable_net", @col] - BalanceSheet["accounts_receivable_net", col.prev])',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("chg_capitalized_contract_costs", {
    cells: {
      item: "Change in cap. contract costs",
      FY24A: cf.chgCapitalizedContractCosts.FY24A,
      FY25A: cf.chgCapitalizedContractCosts.FY25A,
      FY26A: cf.chgCapitalizedContractCosts.FY26A,
    },
    expr: '-WorkingCapitalSchedule["cash_commissions_cap", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("chg_prepaid_and_other_assets", {
    cells: {
      item: "Change in prepaid & other assets",
      FY24A: cf.chgPrepaidAndOtherAssets.FY24A,
      FY25A: cf.chgPrepaidAndOtherAssets.FY25A,
      FY26A: cf.chgPrepaidAndOtherAssets.FY26A,
    },
    expr: '-(BalanceSheet["prepaid_and_other_current_assets", @col] - BalanceSheet["prepaid_and_other_current_assets", col.prev])',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("chg_ap_accrued_and_other_liab", {
    cells: {
      item: "Change in AP & accrued liab.",
      FY24A: cf.chgApAccruedAndOtherLiab.FY24A,
      FY25A: cf.chgApAccruedAndOtherLiab.FY25A,
      FY26A: cf.chgApAccruedAndOtherLiab.FY26A,
    },
    expr: 'BalanceSheet["ap_accrued_and_other_current_liab", @col] - BalanceSheet["ap_accrued_and_other_current_liab", col.prev]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("chg_operating_lease_liabilities", {
    cells: {
      item: "Change in operating lease liab.",
      FY24A: cf.chgOperatingLeaseLiabilities.FY24A,
      FY25A: cf.chgOperatingLeaseLiabilities.FY25A,
      FY26A: cf.chgOperatingLeaseLiabilities.FY26A,
    },
    expr: '-PpeAndIntangiblesSchedule["op_lease_rou_amort", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("chg_unearned_revenue", {
    cells: {
      item: "Change in unearned revenue",
      FY24A: cf.chgUnearnedRevenue.FY24A,
      FY25A: cf.chgUnearnedRevenue.FY25A,
      FY26A: cf.chgUnearnedRevenue.FY26A,
    },
    expr: 'BalanceSheet["unearned_revenue", @col] - BalanceSheet["unearned_revenue", col.prev]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("acquired_ma_wc_adj", {
    cells: {
      item: "(−) Acquired M&A WC step-up (PPA)",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: 'PpeAndIntangiblesSchedule["acquired_nowc_ma", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("operating_cash_flow", {
    cells: { item: "Operating cash flow (OCF)" },
    expr: 'SUM(@table["net_income".."acquired_ma_wc_adj", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })

  cashFlowStatement.addRowGutter()
  cashFlowStatement.addSectionHeader("Investing activities")
  cashFlowStatement.addRow("acquisitions_net_of_cash", {
    cells: {
      item: "Business combinations, net of cash",
      FY24A: cf.acquisitionsNetOfCash.FY24A,
      FY25A: cf.acquisitionsNetOfCash.FY25A,
      FY26A: cf.acquisitionsNetOfCash.FY26A,
    },
    expr: '-PpeAndIntangiblesSchedule["cash_ma_outlays", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("purchases_strategic_investments", {
    cells: {
      item: "Purchases of strategic investments",
      FY24A: cf.purchasesStrategicInvestments.FY24A,
      FY25A: cf.purchasesStrategicInvestments.FY25A,
      FY26A: cf.purchasesStrategicInvestments.FY26A,
      FY27E: new Cell({
        expr: 'LtmFlowBridge["purchases_strategic_investments", "H1_FY27A"]',
      }),
      FY28E: new Cell({
        value: 0,
        note: "No unannounced strategic investment purchases assumed beyond H1 FY27 actuals.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("sales_strategic_investments", {
    cells: {
      item: "Sales of strategic investments",
      FY24A: cf.salesStrategicInvestments.FY24A,
      FY25A: cf.salesStrategicInvestments.FY25A,
      FY26A: cf.salesStrategicInvestments.FY26A,
      FY27E: new Cell({
        expr: 'LtmFlowBridge["sales_strategic_investments", "H1_FY27A"]',
      }),
      FY28E: new Cell({
        value: 0,
        note: "No unannounced strategic investment disposals assumed beyond H1 FY27 actuals.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("purchases_marketable_securities", {
    cells: {
      item: "Purchases of marketable securities",
      FY24A: cf.purchasesMarketableSecurities.FY24A,
      FY25A: cf.purchasesMarketableSecurities.FY25A,
      FY26A: cf.purchasesMarketableSecurities.FY26A,
      FY27E: new Cell({
        expr: 'LtmFlowBridge["purchases_marketable_securities", "H1_FY27A"]',
      }),
      FY28E: new Cell({
        value: 0,
        note: "Marketable securities portfolio held constant beyond H1 FY27 actuals.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("sales_marketable_securities", {
    cells: {
      item: "Sales of marketable securities",
      FY24A: cf.salesMarketableSecurities.FY24A,
      FY25A: cf.salesMarketableSecurities.FY25A,
      FY26A: cf.salesMarketableSecurities.FY26A,
      FY27E: new Cell({
        expr: 'LtmFlowBridge["sales_marketable_securities", "H1_FY27A"]',
      }),
      FY28E: new Cell({
        value: 0,
        note: "Marketable securities portfolio held constant beyond H1 FY27 actuals.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("maturities_marketable_securities", {
    cells: {
      item: "Maturities of marketable securities",
      FY24A: cf.maturitiesMarketableSecurities.FY24A,
      FY25A: cf.maturitiesMarketableSecurities.FY25A,
      FY26A: cf.maturitiesMarketableSecurities.FY26A,
      FY27E: new Cell({
        expr: 'LtmFlowBridge["maturities_marketable_securities", "H1_FY27A"]',
      }),
      FY28E: new Cell({
        value: 0,
        note: "Marketable securities portfolio held constant beyond H1 FY27 actuals.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("capex", {
    cells: {
      item: "Capital expenditures",
      FY24A: cf.capex.FY24A,
      FY25A: cf.capex.FY25A,
      FY26A: cf.capex.FY26A,
    },
    expr: '-PpeAndIntangiblesSchedule["cash_capex_add", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("investing_cash_flow", {
    cells: { item: "Net cash used in investing" },
    expr: 'SUM(@table["acquisitions_net_of_cash".."capex", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })

  cashFlowStatement.addRowGutter()
  cashFlowStatement.addSectionHeader("Financing activities")
  cashFlowStatement.addRow("debt_issuance_proceeds_net", {
    cells: {
      item: "Proceeds from debt issuance, net",
      FY24A: cf.debtIssuanceProceedsNet.FY24A,
      FY25A: cf.debtIssuanceProceedsNet.FY25A,
      FY26A: cf.debtIssuanceProceedsNet.FY26A,
    },
    expr: 'DebtSchedule["funded_debt_issuance", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("share_repurchases", {
    cells: {
      item: "Repurchases of common stock",
      FY24A: cf.shareRepurchases.FY24A,
      FY25A: cf.shareRepurchases.FY25A,
      FY26A: cf.shareRepurchases.FY26A,
      FY27E: new Cell({
        expr: 'LtmFlowBridge["share_repurchases", "H1_FY27A"] - PeriodDriversActive["incrementalShareRepurchases", "FY27E"]',
      }),
    },
    expr: '-PeriodDriversActive["incrementalShareRepurchases", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("tax_payments_net_share_settlement", {
    cells: {
      item: "Tax on net share settlement",
      FY24A: cf.taxPaymentsNetShareSettlement.FY24A,
      FY25A: cf.taxPaymentsNetShareSettlement.FY25A,
      FY26A: cf.taxPaymentsNetShareSettlement.FY26A,
    },
    expr: '-CostAndSbcSchedule["total_sbc", @col] * (1 - ScalarDrivers["sbcNetIssuanceRatio", "active"])',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("proceeds_employee_stock_plans", {
    cells: {
      item: "Proceeds from employee stock plans",
      FY24A: cf.proceedsEmployeeStockPlans.FY24A,
      FY25A: cf.proceedsEmployeeStockPlans.FY25A,
      FY26A: cf.proceedsEmployeeStockPlans.FY26A,
    },
    expr: 'CostAndSbcSchedule["total_sbc", @col] * ScalarDrivers["esppProceedsPctSbc", "active"]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("principal_payments_financing_obligations", {
    cells: {
      item: "Principal on financing obligations",
      FY24A: cf.principalPaymentsFinancingObligations.FY24A,
      FY25A: cf.principalPaymentsFinancingObligations.FY25A,
      FY26A: cf.principalPaymentsFinancingObligations.FY26A,
    },
    expr: '-PpeAndIntangiblesSchedule["fin_lease_add", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("dividends_paid", {
    cells: {
      item: "Payments of cash dividends",
      FY24A: cf.dividendsPaid.FY24A,
      FY25A: cf.dividendsPaid.FY25A,
      FY26A: cf.dividendsPaid.FY26A,
    },
    expr: '-PeriodDriversActive["dividendsPerShare", @col] * ShareCountSchedule["weighted_avg_basic_shares", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("debt_repayments", {
    cells: {
      item: "Repayments of senior & term debt",
      FY24A: cf.debtRepayments.FY24A,
      FY25A: cf.debtRepayments.FY25A,
      FY26A: cf.debtRepayments.FY26A,
    },
    expr: 'DebtSchedule["scheduled_debt_maturities", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("revolver_net_draw", {
    cells: {
      item: "Net draw / (repay.) on revolver",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: 'DebtSchedule["revolver_net_draw", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("financing_cash_flow", {
    cells: { item: "Net cash from financing activities" },
    expr: 'SUM(@table["debt_issuance_proceeds_net".."revolver_net_draw", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })

  cashFlowStatement.addRowGutter()
  cashFlowStatement.addSectionHeader("Cash reconciliation & free cash flow")
  cashFlowStatement.addRow("fx_effect_on_cash", {
    cells: {
      item: "Effect of FX rates on cash",
      FY24A: cf.fxEffectOnCash.FY24A,
      FY25A: cf.fxEffectOnCash.FY25A,
      FY26A: cf.fxEffectOnCash.FY26A,
      FY27E: new Cell({
        value: 0,
        note: "Foreign exchange translation effect assumed zero across forecast periods.",
      }),
      FY28E: 0,
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("beginning_cash", {
    cells: {
      item: "Cash & equivalents, beginning",
      FY24A: cf.beginningCash.FY24A,
      FY25A: cf.beginningCash.FY25A,
      FY26A: cf.beginningCash.FY26A,
    },
    expr: '@table["ending_cash", col.prev]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("cash_before_revolver", {
    cells: { item: "Ending cash before revolver sweep" },
    expr: '@table["beginning_cash", @col] + @table["operating_cash_flow", @col] + @table["investing_cash_flow", @col] + SUM(@table["debt_issuance_proceeds_net".."debt_repayments", @col]) + @table["fx_effect_on_cash", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("net_change_in_cash", {
    cells: { item: "Net change in cash & equivalents" },
    expr: '@table["operating_cash_flow", @col] + @table["investing_cash_flow", @col] + @table["financing_cash_flow", @col] + @table["fx_effect_on_cash", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  cashFlowStatement.addRow("ending_cash", {
    cells: { item: "Cash & equivalents, ending" },
    expr: '@table["beginning_cash", @col] + @table["net_change_in_cash", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })
  cashFlowStatement.addRow("cash_tie_check", {
    cells: { item: "Cash tie-out check" },
    expr: '@table["ending_cash", @col] - BalanceSheet["cash_and_equivalents", @col]',
    format: "currency",
    decimals: 2,
  })
  cashFlowStatement.addRow("reported_fcf", {
    cells: { item: "Reported FCF (OCF less CapEx)" },
    expr: '@table["operating_cash_flow", @col] + @table["capex", @col]',
    format: "currency",
    decimals: 0,
  })
  cashFlowStatement.addRow("economic_fcf", {
    cells: { item: "Economic FCF (ex-SBC & fin. lease)" },
    expr: '@table["operating_cash_flow", @col] + @table["capex", @col] - @table["sbc_expense", @col] + @table["principal_payments_financing_obligations", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })

  return {
    incomeStatement,
    balanceSheet,
    cashFlowStatement,
  }
}

export function buildLtmAndQ2AnchorTables(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): LtmAndQ2AnchorTables {
  const is = audited.crmIs
  const bs = audited.crmBs
  const cf = audited.crmCf
  const h1_26 = audited.crmH1.h1Fy26
  const h1_27 = audited.crmH1.h1Fy27
  const q2bs = audited.crmH1.q2Fy27Bs
  const h1Val = (map: CrmH1Metrics, key: keyof CrmH1Metrics): number => map[key]

  // Live LTM Q2 FY27 Flow Bridge (FY26A + H1 FY27A - H1 FY26A)
  const ltmFlowBridge = sheet.addTable(
    "LtmFlowBridge",
    "Trailing Twelve Months (LTM Q2 FY27) Flow Bridge",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Sources: ${audited.citations.crmIs10K}; ${audited.citations.crmIs10Q} (IS & CF)`,
        68
      ),
    }
  )
  ltmFlowBridge.addColumn("item", { role: "descriptor", header: "Line item" })
  ltmFlowBridge.addColumn("FY26A", {
    header: "FY26A",
    group: "Audited Periods",
  })
  ltmFlowBridge.addColumn("H1_FY26A", {
    headers: ["H1", "FY26A"],
    group: "Audited Periods",
  })
  ltmFlowBridge.addColumn("H1_FY27A", {
    headers: ["H1", "FY27A"],
    group: "Audited Periods",
  })
  ltmFlowBridge.addColumnGutter()
  ltmFlowBridge.addColumn("LTM_Q2_27", {
    headers: ["LTM", "Q2 FY27"],
    style: "bold",
    shade: "muted",
  })

  const addLtmRow = (
    id: string,
    label: string,
    fy26: number | Cell,
    h126: number | Cell,
    h127: number | Cell,
    opts?: {
      readonly style?: "data" | "subtotal" | "total"
      readonly shade?: "none" | "muted" | "alt"
    }
  ): void => {
    ltmFlowBridge.addRow(id, {
      cells: {
        item: label,
        FY26A: fy26,
        H1_FY26A: h126,
        H1_FY27A: h127,
        LTM_Q2_27: new Cell({
          expr: '@table[@row, "FY26A"] + @table[@row, "H1_FY27A"] - @table[@row, "H1_FY26A"]',
        }),
      },
      format: "currency",
      decimals: 0,
      ...(opts?.style !== undefined ? { style: opts.style } : {}),
      ...(opts?.shade !== undefined ? { shade: opts.shade } : {}),
    })
  }

  ltmFlowBridge.addSectionHeader("Income statement flows")
  addLtmRow(
    "subscription_and_support_rev",
    "Subscription and support revenue",
    is.subscriptionAndSupportRev.FY26A,
    h1Val(h1_26, "subscription_and_support_rev"),
    h1Val(h1_27, "subscription_and_support_rev")
  )
  addLtmRow(
    "professional_services_rev",
    "Professional services revenue",
    is.professionalServicesRev.FY26A,
    h1Val(h1_26, "professional_services_rev"),
    h1Val(h1_27, "professional_services_rev")
  )
  addLtmRow(
    "total_revenue",
    "Total revenues",
    is.totalRevenue.FY26A,
    h1Val(h1_26, "total_revenue"),
    h1Val(h1_27, "total_revenue"),
    { style: "subtotal" }
  )
  addLtmRow(
    "gross_profit",
    "Gross profit",
    is.grossProfit.FY26A,
    h1Val(h1_26, "gross_profit"),
    h1Val(h1_27, "gross_profit")
  )
  addLtmRow(
    "operating_income",
    "GAAP operating income (EBIT)",
    is.operatingIncome.FY26A,
    h1Val(h1_26, "operating_income"),
    h1Val(h1_27, "operating_income"),
    { style: "subtotal" }
  )
  addLtmRow(
    "interest_expense",
    "Interest expense (Q2 FY27 breakout)",
    0,
    h1Val(h1_26, "interest_expense"),
    h1Val(h1_27, "interest_expense")
  )
  addLtmRow(
    "other_income_expense_net",
    "Other income (expense), net",
    is.otherIncomeExpenseNet.FY26A,
    h1Val(h1_26, "other_income_expense_net"),
    h1Val(h1_27, "other_income_expense_net")
  )
  ltmFlowBridge.addRow("interest_and_other_net", {
    cells: { item: "Combined interest & other, net" },
    expr: '@table["interest_expense", @col] + @table["other_income_expense_net", @col]',
    format: "currency",
    decimals: 0,
  })
  addLtmRow(
    "gains_on_strategic_investments_net",
    "Gains on strategic investments, net",
    is.gainsOnStrategicInvestmentsNet.FY26A,
    h1Val(h1_26, "gains_on_strategic_investments_net"),
    h1Val(h1_27, "gains_on_strategic_investments_net")
  )
  addLtmRow(
    "income_before_taxes",
    "Income before taxes",
    is.incomeBeforeTaxes.FY26A,
    h1Val(h1_26, "income_before_taxes"),
    h1Val(h1_27, "income_before_taxes")
  )
  addLtmRow(
    "income_tax_provision",
    "Provision for income taxes",
    is.incomeTaxProvision.FY26A,
    h1Val(h1_26, "income_tax_provision"),
    h1Val(h1_27, "income_tax_provision")
  )
  addLtmRow(
    "net_income",
    "Net income (US GAAP)",
    is.netIncome.FY26A,
    h1Val(h1_26, "net_income"),
    h1Val(h1_27, "net_income"),
    { style: "subtotal" }
  )

  ltmFlowBridge.addRowGutter()
  ltmFlowBridge.addSectionHeader("Cash flow & working capital flows")
  addLtmRow(
    "da_expense",
    "Depreciation and amortization",
    cf.daExpense.FY26A,
    h1Val(h1_26, "da_expense"),
    h1Val(h1_27, "da_expense")
  )
  addLtmRow(
    "amort_contract_costs",
    "Amort. of cap. contract costs",
    cf.amortContractCosts.FY26A,
    h1Val(h1_26, "amort_contract_costs"),
    h1Val(h1_27, "amort_contract_costs")
  )
  addLtmRow(
    "sbc_expense",
    "Stock-based compensation (CF basis)",
    cf.sbcExpense.FY26A,
    h1Val(h1_26, "sbc_expense"),
    h1Val(h1_27, "sbc_expense")
  )
  addLtmRow(
    "amort_intang_cor",
    "Purchased intangibles amort. — COR",
    audited.crmIsSupp.amortPurchasedIntangiblesCor.FY26A,
    h1Val(h1_26, "amort_purchased_intangibles_cor"),
    h1Val(h1_27, "amort_purchased_intangibles_cor")
  )
  addLtmRow(
    "amort_intang_sm",
    "Purchased intangibles amort. — S&M",
    audited.crmIsSupp.amortPurchasedIntangiblesSm.FY26A,
    h1Val(h1_26, "amort_purchased_intangibles_sm"),
    h1Val(h1_27, "amort_purchased_intangibles_sm")
  )
  ltmFlowBridge.addRow("purchased_intangibles_amort", {
    cells: { item: "Total purchased intangibles amort." },
    expr: '@table["amort_intang_cor", @col] + @table["amort_intang_sm", @col]',
    format: "currency",
    decimals: 0,
  })
  addLtmRow(
    "chg_accounts_receivable",
    "Change in accounts receivable",
    cf.chgAccountsReceivable.FY26A,
    h1Val(h1_26, "chg_accounts_receivable"),
    h1Val(h1_27, "chg_accounts_receivable")
  )
  addLtmRow(
    "chg_capitalized_contract_costs",
    "Change in cap. contract costs",
    cf.chgCapitalizedContractCosts.FY26A,
    h1Val(h1_26, "chg_capitalized_contract_costs"),
    h1Val(h1_27, "chg_capitalized_contract_costs")
  )
  addLtmRow(
    "chg_prepaid_and_other_assets",
    "Change in prepaid & other assets",
    cf.chgPrepaidAndOtherAssets.FY26A,
    h1Val(h1_26, "chg_prepaid_and_other_assets"),
    h1Val(h1_27, "chg_prepaid_and_other_assets")
  )
  addLtmRow(
    "chg_ap_accrued_and_other_liab",
    "Change in AP & accrued liab.",
    cf.chgApAccruedAndOtherLiab.FY26A,
    h1Val(h1_26, "chg_ap_accrued_and_other_liab"),
    h1Val(h1_27, "chg_ap_accrued_and_other_liab")
  )
  addLtmRow(
    "chg_operating_lease_liabilities",
    "Change in operating lease liab.",
    cf.chgOperatingLeaseLiabilities.FY26A,
    h1Val(h1_26, "chg_operating_lease_liabilities"),
    h1Val(h1_27, "chg_operating_lease_liabilities")
  )
  addLtmRow(
    "chg_unearned_revenue",
    "Change in unearned revenue",
    cf.chgUnearnedRevenue.FY26A,
    h1Val(h1_26, "chg_unearned_revenue"),
    h1Val(h1_27, "chg_unearned_revenue")
  )
  addLtmRow(
    "operating_cash_flow",
    "Operating cash flow (OCF)",
    cf.operatingCashFlow.FY26A,
    h1Val(h1_26, "operating_cash_flow"),
    h1Val(h1_27, "operating_cash_flow"),
    { style: "subtotal" }
  )
  addLtmRow(
    "capex",
    "Capital expenditures",
    cf.capex.FY26A,
    h1Val(h1_26, "capex"),
    h1Val(h1_27, "capex")
  )
  addLtmRow(
    "principal_payments_financing_obligations",
    "Principal on financing obligations",
    cf.principalPaymentsFinancingObligations.FY26A,
    h1Val(h1_26, "principal_payments_financing_obligations"),
    h1Val(h1_27, "principal_payments_financing_obligations")
  )

  ltmFlowBridge.addRowGutter()
  ltmFlowBridge.addSectionHeader("H1 FY27 investing & financing anchors")
  addLtmRow(
    "acquisitions_net_of_cash",
    "Business combinations, net of cash",
    cf.acquisitionsNetOfCash.FY26A,
    h1Val(h1_26, "acquisitions_net_of_cash"),
    h1Val(h1_27, "acquisitions_net_of_cash")
  )
  addLtmRow(
    "purchases_strategic_investments",
    "Purchases of strategic investments",
    cf.purchasesStrategicInvestments.FY26A,
    h1Val(h1_26, "purchases_strategic_investments"),
    h1Val(h1_27, "purchases_strategic_investments")
  )
  addLtmRow(
    "sales_strategic_investments",
    "Sales of strategic investments",
    cf.salesStrategicInvestments.FY26A,
    h1Val(h1_26, "sales_strategic_investments"),
    h1Val(h1_27, "sales_strategic_investments")
  )
  addLtmRow(
    "purchases_marketable_securities",
    "Purchases of marketable securities",
    cf.purchasesMarketableSecurities.FY26A,
    h1Val(h1_26, "purchases_marketable_securities"),
    h1Val(h1_27, "purchases_marketable_securities")
  )
  addLtmRow(
    "sales_marketable_securities",
    "Sales of marketable securities",
    cf.salesMarketableSecurities.FY26A,
    h1Val(h1_26, "sales_marketable_securities"),
    h1Val(h1_27, "sales_marketable_securities")
  )
  addLtmRow(
    "maturities_marketable_securities",
    "Maturities of marketable securities",
    cf.maturitiesMarketableSecurities.FY26A,
    h1Val(h1_26, "maturities_marketable_securities"),
    h1Val(h1_27, "maturities_marketable_securities")
  )
  addLtmRow(
    "debt_issuance_proceeds_net",
    "Debt issuance proceeds, net",
    cf.debtIssuanceProceedsNet.FY26A,
    h1Val(h1_26, "debt_issuance_proceeds_net"),
    h1Val(h1_27, "debt_issuance_proceeds_net")
  )
  addLtmRow(
    "share_repurchases",
    "Repurchases of common stock",
    cf.shareRepurchases.FY26A,
    h1Val(h1_26, "share_repurchases"),
    h1Val(h1_27, "share_repurchases")
  )

  ltmFlowBridge.addRowGutter()
  ltmFlowBridge.addSectionHeader("Derived LTM & H1 economic cash flows")
  ltmFlowBridge.addRow("gaap_ebitda", {
    cells: { item: "GAAP EBITDA (ex-op. lease ROU)" },
    expr: '@table["operating_income", @col] + @table["da_expense", @col] + @table["chg_operating_lease_liabilities", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  ltmFlowBridge.addRow("adj_ebitda", {
    cells: { item: "Adjusted EBITDA (GAAP + SBC)" },
    expr: '@table["gaap_ebitda", @col] + @table["sbc_expense", @col]',
    format: "currency",
    decimals: 0,
  })
  ltmFlowBridge.addRow("ebitda_less_capex", {
    cells: { item: "GAAP EBITDA less CapEx & leases" },
    expr: '@table["gaap_ebitda", @col] + @table["capex", @col] + @table["principal_payments_financing_obligations", @col]',
    format: "currency",
    decimals: 0,
  })
  ltmFlowBridge.addRow("reported_fcf", {
    cells: { item: "Reported FCF (OCF less CapEx)" },
    expr: '@table["operating_cash_flow", @col] + @table["capex", @col]',
    format: "currency",
    decimals: 0,
  })
  ltmFlowBridge.addRow("fcf_ex_sbc", {
    cells: { item: "Free cash flow less SBC" },
    expr: '@table["reported_fcf", @col] - @table["sbc_expense", @col]',
    format: "currency",
    decimals: 0,
  })
  ltmFlowBridge.addRow("economic_fcf", {
    cells: { item: "Economic FCF (ex-SBC & fin. lease)" },
    expr: '@table["fcf_ex_sbc", @col] + @table["principal_payments_financing_obligations", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  ltmFlowBridge.addRow("effective_tax_rate", {
    cells: { item: "Effective GAAP tax rate" },
    expr: 'IF(@table["income_before_taxes", @col] > 0, -@table["income_tax_provision", @col] / @table["income_before_taxes", @col], NA())',
    format: "percentage",
    decimals: 1,
  })
  ltmFlowBridge.addRow("unlevered_fcff", {
    cells: { item: "Unlevered economic FCFF" },
    expr: '@table["operating_income", @col] * (1 - @table["effective_tax_rate", @col]) + @table["da_expense", @col] + @table["amort_contract_costs", @col] + SUM(@table["chg_accounts_receivable".."chg_unearned_revenue", @col]) - @table["gains_on_strategic_investments_net", @col] * @table["effective_tax_rate", @col] + @table["capex", @col] + @table["principal_payments_financing_obligations", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  // Audited Q2 FY27 Balance Sheet Anchor
  const q2BalanceSheetAnchor = sheet.addTable(
    "Q2BalanceSheetAnchor",
    "Audited Q2 FY27 Balance Sheet Anchor (July 31, 2026)",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Sources: ${audited.citations.crmBs10K}; ${audited.citations.crmBs10Q} (BS & Note 7)`,
        68
      ),
    }
  )
  q2BalanceSheetAnchor.addColumn("item", {
    role: "descriptor",
    header: "Balance sheet anchor",
  })
  q2BalanceSheetAnchor.addColumn("FY26A", { header: "FY26A" })
  q2BalanceSheetAnchor.addColumn("Q2_FY27A", {
    headers: ["Q2 FY27A", "(Jul 2026)"],
    style: "bold",
    shade: "muted",
  })
  q2BalanceSheetAnchor.addColumn("h1_change", {
    headers: ["H1 FY27", "Change"],
  })

  const addQ2BsRow = (
    id: string,
    label: string,
    fy26: number,
    q2: number,
    opts?: { readonly style?: "subtotal" | "total" }
  ): void => {
    q2BalanceSheetAnchor.addRow(id, {
      cells: {
        item: label,
        FY26A: fy26,
        Q2_FY27A: q2,
        h1_change: new Cell({
          expr: '@table[@row, "Q2_FY27A"] - @table[@row, "FY26A"]',
        }),
      },
      format: "currency",
      decimals: 0,
      ...(opts?.style !== undefined ? { style: opts.style } : {}),
    })
  }

  addQ2BsRow(
    "cash_and_equivalents",
    "Cash and cash equivalents",
    bs.cashAndEquivalents.FY26A,
    q2bs.cashAndEquivalents
  )
  addQ2BsRow(
    "marketable_securities",
    "Marketable securities",
    bs.marketableSecurities.FY26A,
    q2bs.marketableSecurities
  )
  q2BalanceSheetAnchor.addRow("total_cash_and_mkt", {
    cells: { item: "Total cash & marketable sec." },
    expr: '@table["cash_and_equivalents", @col] + @table["marketable_securities", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  addQ2BsRow(
    "debt_current",
    "Debt, current",
    bs.debtCurrent.FY26A,
    q2bs.debtCurrent
  )
  addQ2BsRow(
    "debt_noncurrent",
    "Noncurrent debt",
    bs.debtNoncurrent.FY26A,
    q2bs.debtNoncurrent
  )
  q2BalanceSheetAnchor.addRow("total_gross_debt", {
    cells: { item: "Total gross funded debt (carrying)" },
    expr: '@table["debt_current", @col] + @table["debt_noncurrent", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  addQ2BsRow(
    "op_lease_current",
    "Operating lease liab., current",
    bs.operatingLeaseLiabCurrent.FY26A,
    q2bs.operatingLeaseLiabCurrent
  )
  addQ2BsRow(
    "op_lease_noncurrent",
    "Operating lease liab., noncurrent",
    bs.operatingLeaseLiabNoncurrent.FY26A,
    q2bs.operatingLeaseLiabNoncurrent
  )
  q2BalanceSheetAnchor.addRow("total_op_leases", {
    cells: { item: "Total operating lease liabilities" },
    expr: '@table["op_lease_current", @col] + @table["op_lease_noncurrent", @col]',
    format: "currency",
    decimals: 0,
  })
  addQ2BsRow(
    "total_fin_leases",
    "Total finance lease liab. (Note 7)",
    q2bs.finLeaseLiabTotalFy26,
    q2bs.finLeaseLiabTotal
  )
  q2BalanceSheetAnchor.addRow("total_funded_debt_and_fin_leases", {
    cells: { item: "Funded debt & fin. leases (EV/WACC)" },
    expr: '@table["total_gross_debt", @col] + @table["total_fin_leases", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  addQ2BsRow(
    "strategic_investments",
    "Strategic investments (~45% Anth.)",
    bs.strategicInvestments.FY26A,
    q2bs.strategicInvestments
  )
  addQ2BsRow("goodwill", "Goodwill", bs.goodwill.FY26A, q2bs.goodwill)
  addQ2BsRow(
    "purchased_intangibles_net",
    "Purchased intangible assets, net",
    bs.purchasedIntangiblesNet.FY26A,
    q2bs.purchasedIntangiblesNet
  )
  addQ2BsRow(
    "total_equity",
    "Total stockholders' equity",
    bs.totalEquity.FY26A,
    q2bs.totalEquity,
    { style: "total" }
  )

  return {
    ltmFlowBridge,
    q2BalanceSheetAnchor,
  }
}
