import { Cell, type Sheet, type Table } from "f8-engine"
import type { AuditedDataSnapshot } from "../kg.ts"
import { addAnnualColumns, wrapSubtitle } from "../timeline.ts"

export interface OperatingAnnualTables {
  readonly revenueSchedule: Table
  readonly ppeAndIntangibles: Table
  readonly costAndSbc: Table
  readonly workingCapital: Table
  readonly shareCount: Table
  readonly debtSchedule: Table
}

export function buildOperatingAnnualTables(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): OperatingAnnualTables {
  // Table 1: Revenue Schedule (Organic vs. Inorganic M&A Build)
  const revenueSchedule = sheet.addTable(
    "RevenueSchedule",
    "Revenue Disaggregation: Organic Subscription vs. M&A",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Source: ${audited.citations.crmIs10K}; FY27E–FY31E splits organic S&S from Year-1 M&A layers`,
        128
      ),
    }
  )
  addAnnualColumns(revenueSchedule)

  revenueSchedule.addSectionHeader("Subscription & support build")
  revenueSchedule.addRow("organic_ss_rev", {
    cells: {
      item: "Organic subscription & support",
      FY24A: audited.crmIs.subscriptionAndSupportRev.FY24A,
      FY25A: audited.crmIs.subscriptionAndSupportRev.FY25A,
      FY26A: new Cell({
        expr: '@table["subscription_and_support_rev", "FY26A"] - @table["inorganic_ma_rev", "FY26A"]',
      }),
    },
    expr: '@table["subscription_and_support_rev", col.prev] * (1 + PeriodDriversActive["organicSsGrowth", @col])',
    format: "currency",
    decimals: 0,
  })
  revenueSchedule.addRow("inorganic_ma_rev", {
    cells: {
      item: "Incremental Year-1 M&A S&S rev.",
      FY24A: 0,
      FY25A: 0,
      FY26A: new Cell({
        expr: 'AuditedFootnoteAnchors["informatica_fy26_rev", "val"]',
      }),
    },
    expr: 'PeriodDriversActive["incrementalMaRev", @col]',
    format: "currency",
    decimals: 0,
  })
  revenueSchedule.addRow("subscription_and_support_rev", {
    cells: {
      item: "Total subscription & support",
      FY24A: audited.crmIs.subscriptionAndSupportRev.FY24A,
      FY25A: audited.crmIs.subscriptionAndSupportRev.FY25A,
      FY26A: audited.crmIs.subscriptionAndSupportRev.FY26A,
    },
    expr: '@table["organic_ss_rev", @col] + @table["inorganic_ma_rev", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  revenueSchedule.addRowGutter()
  revenueSchedule.addSectionHeader("Professional services & total")
  revenueSchedule.addRow("professional_services_rev", {
    cells: {
      item: "Professional services & other",
      FY24A: audited.crmIs.professionalServicesRev.FY24A,
      FY25A: audited.crmIs.professionalServicesRev.FY25A,
      FY26A: audited.crmIs.professionalServicesRev.FY26A,
    },
    expr: '@table["professional_services_rev", col.prev] * (1 + PeriodDriversActive["profServicesGrowth", @col])',
    format: "currency",
    decimals: 0,
  })
  revenueSchedule.addRow("total_revenue", {
    cells: { item: "Total consolidated revenue" },
    expr: '@table["subscription_and_support_rev", @col] + @table["professional_services_rev", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })

  revenueSchedule.addRowGutter()
  revenueSchedule.addSectionHeader("Growth attribution")
  revenueSchedule.addRow("total_rev_growth", {
    cells: {
      item: "Total consolidated revenue growth",
      FY24A: null,
    },
    expr: '@table["total_revenue", @col] / @table["total_revenue", col.prev] - 1',
    format: "percentage",
    decimals: 1,
  })
  revenueSchedule.addRow("ss_rev_growth", {
    cells: {
      item: "Total subscription & support growth",
      FY24A: null,
    },
    expr: '@table["subscription_and_support_rev", @col] / @table["subscription_and_support_rev", col.prev] - 1',
    format: "percentage",
    decimals: 1,
  })
  revenueSchedule.addRow("organic_ss_growth_rate", {
    cells: {
      item: "Organic S&S growth (ex-Year-1 M&A)",
      FY24A: null,
    },
    expr: '@table["organic_ss_rev", @col] / @table["subscription_and_support_rev", col.prev] - 1',
    format: "percentage",
    decimals: 1,
  })
  revenueSchedule.addRow("ma_growth_contribution", {
    cells: {
      item: "Inorganic M&A growth contribution",
      FY24A: null,
    },
    expr: '@table["inorganic_ma_rev", @col] / @table["subscription_and_support_rev", col.prev]',
    format: "percentage",
    decimals: 1,
  })

  const compactCrmCite = (cite: string): string =>
    cite.replace(/^Salesforce, Inc\.\s*/, "")

  // Table 2: PP&E, Purchased Intangibles, Goodwill & Operating Lease Roll-Forwards
  const ppeAndIntangibles = sheet.addTable(
    "PpeAndIntangiblesSchedule",
    "PP&E, Intangibles, Goodwill & Lease Roll-Forwards",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Sources: ${audited.citations.crmBs10KPrior}, ${compactCrmCite(audited.citations.crmBs10K)} & ${compactCrmCite(audited.citations.crmIntangibles)} (Notes 6 & 7)`,
        130
      ),
    }
  )
  addAnnualColumns(ppeAndIntangibles)

  ppeAndIntangibles.addSectionHeader("Cash M&A outlays & PPA")
  ppeAndIntangibles.addRow("cash_ma_outlays", {
    cells: {
      item: "Cash business combinations (gross)",
      FY24A: -audited.crmCf.acquisitionsNetOfCash.FY24A,
      FY25A: -audited.crmCf.acquisitionsNetOfCash.FY25A,
      FY26A: -audited.crmCf.acquisitionsNetOfCash.FY26A,
      FY27E: new Cell({
        expr: '-LtmCashFlowAndH1Anchors["acquisitions_net_of_cash", "H1_FY27A"] + AuditedFootnoteAnchors["pending_q3_ma_total", "val"]',
      }),
      FY28E: new Cell({
        expr: 'ScalarDrivers["brazeAcquisitionCash", "active"]',
      }),
      FY29E: new Cell({
        value: 0,
        note: "No unannounced acquisitions assumed beyond committed deals closing through FY28E.",
      }),
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("new_ppa_intang_additions", {
    cells: {
      item: "New purchased intangibles (PPA)",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
      FY27E: new Cell({
        expr: 'AuditedFootnoteAnchors["h1_intang_gross_add", "val"] + AuditedFootnoteAnchors["pending_q3_ma_total", "val"] * ScalarDrivers["ppaIntangiblesShare", "active"]',
      }),
      FY28E: new Cell({
        expr: '@table["cash_ma_outlays", @col] * ScalarDrivers["ppaIntangiblesShare", "active"]',
      }),
      FY29E: new Cell({
        expr: '@table["cash_ma_outlays", @col] * ScalarDrivers["ppaIntangiblesShare", "active"]',
      }),
      FY30E: new Cell({
        expr: '@table["cash_ma_outlays", @col] * ScalarDrivers["ppaIntangiblesShare", "active"]',
      }),
      FY31E: new Cell({
        expr: '@table["cash_ma_outlays", @col] * ScalarDrivers["ppaIntangiblesShare", "active"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("acquired_nowc_ma", {
    cells: {
      item: "Acquired M&A net working capital",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: '@table["cash_ma_outlays", @col] * ScalarDrivers["maAcquiredNowcPctCash", "active"]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("new_goodwill_additions", {
    cells: {
      item: "New goodwill additions (residual)",
      FY24A: 0,
      FY25A: new Cell({
        expr: '@table["closing_goodwill", "FY25A"] - @table["closing_goodwill", "FY24A"]',
      }),
      FY26A: new Cell({
        expr: '@table["closing_goodwill", "FY26A"] - @table["closing_goodwill", "FY25A"]',
      }),
    },
    expr: '@table["cash_ma_outlays", @col] - @table["new_ppa_intang_additions", @col] - @table["acquired_nowc_ma", @col]',
    format: "currency",
    decimals: 0,
  })

  ppeAndIntangibles.addRowGutter()
  ppeAndIntangibles.addSectionHeader("Purchased intangibles & goodwill")
  ppeAndIntangibles.addRow("opening_intangibles", {
    cells: {
      item: "Opening purchased intangibles, net",
      FY24A: null,
    },
    expr: '@table["closing_intangibles", col.prev]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("note7_existing_amort", {
    cells: {
      item: "Existing intang. amort. (Note 7)",
      FY24A: new Cell({
        expr: 'CostAndSbcSchedule["amort_cor", "FY24A"] + CostAndSbcSchedule["amort_sm", "FY24A"]',
      }),
      FY25A: new Cell({
        expr: 'CostAndSbcSchedule["amort_cor", "FY25A"] + CostAndSbcSchedule["amort_sm", "FY25A"]',
      }),
      FY26A: new Cell({
        expr: 'CostAndSbcSchedule["amort_cor", "FY26A"] + CostAndSbcSchedule["amort_sm", "FY26A"]',
      }),
      FY27E: new Cell({
        expr: 'LtmOperatingBridge["purchased_intangibles_amort", "H1_FY27A"] + AuditedFootnoteAnchors["note7_amort_fy27_rem", "val"]',
      }),
      FY28E: new Cell({
        expr: 'AuditedFootnoteAnchors["note7_amort_fy28", "val"]',
      }),
      FY29E: new Cell({
        expr: 'AuditedFootnoteAnchors["note7_amort_fy29", "val"]',
      }),
      FY30E: new Cell({
        expr: 'AuditedFootnoteAnchors["note7_amort_fy30", "val"]',
      }),
      FY31E: new Cell({
        expr: 'AuditedFootnoteAnchors["note7_amort_fy31", "val"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("new_ppa_amort", {
    cells: {
      item: "Incremental pending M&A PPA amort.",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
      FY27E: new Cell({
        expr: '(AuditedFootnoteAnchors["pending_q3_ma_total", "val"] * ScalarDrivers["ppaIntangiblesShare", "active"]) / ScalarDrivers["ppaAmortLifeYears", "active"] * 0.5',
      }),
      FY28E: new Cell({
        expr: '(AuditedFootnoteAnchors["pending_q3_ma_total", "val"] * ScalarDrivers["ppaIntangiblesShare", "active"] + @table["new_ppa_intang_additions", "FY28E"] * 0.5) / ScalarDrivers["ppaAmortLifeYears", "active"]',
      }),
      FY29E: new Cell({
        expr: '(AuditedFootnoteAnchors["pending_q3_ma_total", "val"] * ScalarDrivers["ppaIntangiblesShare", "active"] + @table["new_ppa_intang_additions", "FY28E"]) / ScalarDrivers["ppaAmortLifeYears", "active"]',
      }),
      FY30E: new Cell({
        expr: '(AuditedFootnoteAnchors["pending_q3_ma_total", "val"] * ScalarDrivers["ppaIntangiblesShare", "active"] + @table["new_ppa_intang_additions", "FY28E"]) / ScalarDrivers["ppaAmortLifeYears", "active"]',
      }),
      FY31E: new Cell({
        expr: '(AuditedFootnoteAnchors["pending_q3_ma_total", "val"] * ScalarDrivers["ppaIntangiblesShare", "active"] + @table["new_ppa_intang_additions", "FY28E"]) / ScalarDrivers["ppaAmortLifeYears", "active"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("total_intangibles_amort", {
    cells: {
      item: "Total purchased intangibles amort.",
      FY24A: new Cell({ expr: '@table["note7_existing_amort", "FY24A"]' }),
      FY25A: new Cell({ expr: '@table["note7_existing_amort", "FY25A"]' }),
      FY26A: new Cell({ expr: '@table["note7_existing_amort", "FY26A"]' }),
    },
    expr: 'MIN(@table["opening_intangibles", @col] + @table["new_ppa_intang_additions", @col], @table["note7_existing_amort", @col] + @table["new_ppa_amort", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  ppeAndIntangibles.addRow("closing_intangibles", {
    cells: {
      item: "Closing purchased intangibles, net",
      FY24A: audited.crmBs.purchasedIntangiblesNet.FY24A,
      FY25A: audited.crmBs.purchasedIntangiblesNet.FY25A,
      FY26A: audited.crmBs.purchasedIntangiblesNet.FY26A,
    },
    expr: '@table["opening_intangibles", @col] + @table["new_ppa_intang_additions", @col] - @table["total_intangibles_amort", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })
  ppeAndIntangibles.addRow("opening_goodwill", {
    cells: {
      item: "Opening goodwill",
      FY24A: null,
    },
    expr: '@table["closing_goodwill", col.prev]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("closing_goodwill", {
    cells: {
      item: "Closing goodwill",
      FY24A: audited.crmBs.goodwill.FY24A,
      FY25A: audited.crmBs.goodwill.FY25A,
      FY26A: audited.crmBs.goodwill.FY26A,
    },
    expr: '@table["opening_goodwill", @col] + @table["new_goodwill_additions", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  ppeAndIntangibles.addRowGutter()
  ppeAndIntangibles.addSectionHeader("PP&E & finance lease roll-forward")
  ppeAndIntangibles.addRow("opening_ppe", {
    cells: {
      item: "Opening property & equipment, net",
      FY24A: null,
    },
    expr: '@table["closing_ppe", col.prev]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("cash_capex_add", {
    cells: {
      item: "(+) Cash capital expenditures",
      FY24A: -audited.crmCf.capex.FY24A,
      FY25A: -audited.crmCf.capex.FY25A,
      FY26A: -audited.crmCf.capex.FY26A,
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["capexPctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("fin_lease_add", {
    cells: {
      item: "(+) Non-cash finance lease adds",
      FY24A: -audited.crmCf.principalPaymentsFinancingObligations.FY24A,
      FY25A: -audited.crmCf.principalPaymentsFinancingObligations.FY25A,
      FY26A: -audited.crmCf.principalPaymentsFinancingObligations.FY26A,
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["finLeasePctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("ppe_and_fin_lease_depr", {
    cells: {
      item: "(−) PP&E & finance lease depr.",
      FY24A: new Cell({
        expr: 'CashFlowStatement["da_expense", "FY24A"] - @table["total_intangibles_amort", "FY24A"] - @table["op_lease_rou_amort", "FY24A"]',
      }),
      FY25A: new Cell({
        expr: 'CashFlowStatement["da_expense", "FY25A"] - @table["total_intangibles_amort", "FY25A"] - @table["op_lease_rou_amort", "FY25A"]',
      }),
      FY26A: new Cell({
        expr: 'CashFlowStatement["da_expense", "FY26A"] - @table["total_intangibles_amort", "FY26A"] - @table["op_lease_rou_amort", "FY26A"]',
      }),
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["ppeDeprPctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("closing_ppe", {
    cells: {
      item: "Closing property & equipment, net",
      FY24A: audited.crmBs.ppeNet.FY24A,
      FY25A: audited.crmBs.ppeNet.FY25A,
      FY26A: audited.crmBs.ppeNet.FY26A,
    },
    expr: '@table["opening_ppe", @col] + @table["cash_capex_add", @col] + @table["fin_lease_add", @col] - @table["ppe_and_fin_lease_depr", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  ppeAndIntangibles.addRowGutter()
  ppeAndIntangibles.addSectionHeader("Operating leases & consolidated D&A")
  ppeAndIntangibles.addRow("op_lease_rou_amort", {
    cells: {
      item: "Operating lease ROU amort. / cash",
      FY24A: -audited.crmCf.chgOperatingLeaseLiabilities.FY24A,
      FY25A: -audited.crmCf.chgOperatingLeaseLiabilities.FY25A,
      FY26A: -audited.crmCf.chgOperatingLeaseLiabilities.FY26A,
    },
    expr: 'PeriodDriversActive["opLeasePayment", @col]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("op_lease_renewals", {
    cells: {
      item: "Non-cash operating lease renewals",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: 'MAX(0, @table["op_lease_rou_amort", @col] - ScalarDrivers["opLeaseDownsizeAnnual", "active"])',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("closing_op_lease_rou", {
    cells: {
      item: "Closing operating lease ROU, net",
      FY24A: audited.crmBs.operatingLeaseRouAssets.FY24A,
      FY25A: audited.crmBs.operatingLeaseRouAssets.FY25A,
      FY26A: audited.crmBs.operatingLeaseRouAssets.FY26A,
    },
    expr: 'MAX(0, @table["closing_op_lease_rou", col.prev] + @table["op_lease_renewals", @col] - @table["op_lease_rou_amort", @col])',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("closing_op_lease_liab_total", {
    cells: {
      item: "Closing operating lease liab.",
      FY24A: new Cell({
        expr: 'BalanceSheet["operating_lease_liab_current", "FY24A"] + BalanceSheet["operating_lease_liab_noncurrent", "FY24A"]',
      }),
      FY25A: new Cell({
        expr: 'BalanceSheet["operating_lease_liab_current", "FY25A"] + BalanceSheet["operating_lease_liab_noncurrent", "FY25A"]',
      }),
      FY26A: new Cell({
        expr: 'BalanceSheet["operating_lease_liab_current", "FY26A"] + BalanceSheet["operating_lease_liab_noncurrent", "FY26A"]',
      }),
    },
    expr: '@table["closing_op_lease_liab_total", col.prev] + (@table["closing_op_lease_rou", @col] - @table["closing_op_lease_rou", col.prev])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  ppeAndIntangibles.addRow("closing_op_lease_liab_cur", {
    cells: {
      item: "Operating lease liab., current",
      FY24A: audited.crmBs.operatingLeaseLiabCurrent.FY24A,
      FY25A: audited.crmBs.operatingLeaseLiabCurrent.FY25A,
      FY26A: audited.crmBs.operatingLeaseLiabCurrent.FY26A,
    },
    expr: '@table["closing_op_lease_liab_total", @col] * (@table["closing_op_lease_liab_cur", "FY26A"] / @table["closing_op_lease_liab_total", "FY26A"])',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRow("closing_op_lease_liab_noncur", {
    cells: {
      item: "Operating lease liab., noncurrent",
      FY24A: audited.crmBs.operatingLeaseLiabNoncurrent.FY24A,
      FY25A: audited.crmBs.operatingLeaseLiabNoncurrent.FY25A,
      FY26A: audited.crmBs.operatingLeaseLiabNoncurrent.FY26A,
    },
    expr: '@table["closing_op_lease_liab_total", @col] - @table["closing_op_lease_liab_cur", @col]',
    format: "currency",
    decimals: 0,
  })
  ppeAndIntangibles.addRowGutter()
  ppeAndIntangibles.addRow("total_da_expense", {
    cells: {
      item: "Total consolidated D&A (CF)",
      FY24A: audited.crmCf.daExpense.FY24A,
      FY25A: audited.crmCf.daExpense.FY25A,
      FY26A: audited.crmCf.daExpense.FY26A,
    },
    expr: '@table["total_intangibles_amort", @col] + @table["ppe_and_fin_lease_depr", @col] + @table["op_lease_rou_amort", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })

  // Table 3: Cost Structure, Functional SBC & Non-GAAP Margin Bridge
  const costAndSbc = sheet.addTable(
    "CostAndSbcSchedule",
    "Functional Operating Costs, SBC & Non-GAAP Bridge",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Source: ${audited.citations.crmIs10K}; separates cash expenses, functional SBC, and Note 7 intangible amortization`,
        115
      ),
    }
  )
  addAnnualColumns(costAndSbc)

  costAndSbc.addSectionHeader("Purchased intangibles amort. by function")
  costAndSbc.addRow("amort_cor", {
    cells: {
      item: "Purchased intangibles amort. — COR",
      FY24A: audited.crmIsSupp.amortPurchasedIntangiblesCor.FY24A,
      FY25A: audited.crmIsSupp.amortPurchasedIntangiblesCor.FY25A,
      FY26A: audited.crmIsSupp.amortPurchasedIntangiblesCor.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["total_intangibles_amort", @col] * (@table["amort_cor", "FY26A"] / (@table["amort_cor", "FY26A"] + @table["amort_sm", "FY26A"]))',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("amort_sm", {
    cells: {
      item: "Purchased intangibles amort. — S&M",
      FY24A: audited.crmIsSupp.amortPurchasedIntangiblesSm.FY24A,
      FY25A: audited.crmIsSupp.amortPurchasedIntangiblesSm.FY25A,
      FY26A: audited.crmIsSupp.amortPurchasedIntangiblesSm.FY26A,
    },
    expr: 'PpeAndIntangiblesSchedule["total_intangibles_amort", @col] - @table["amort_cor", @col]',
    format: "currency",
    decimals: 0,
  })

  costAndSbc.addRowGutter()
  costAndSbc.addSectionHeader("Stock-based compensation by function")
  costAndSbc.addRow("total_sbc", {
    cells: {
      item: "Total stock-based compensation",
      FY24A: new Cell({
        expr: 'SUM(@table["sbc_cor".."sbc_restructuring", @col])',
      }),
      FY25A: new Cell({
        expr: 'SUM(@table["sbc_cor".."sbc_restructuring", @col])',
      }),
      FY26A: new Cell({
        expr: 'SUM(@table["sbc_cor".."sbc_restructuring", @col])',
      }),
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["sbcPctRev", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  costAndSbc.addRow("sbc_cor", {
    cells: {
      item: new Cell({ value: "SBC — cost of revenues", indent: 1 }),
      FY24A: audited.crmIsSupp.sbcCor.FY24A,
      FY25A: audited.crmIsSupp.sbcCor.FY25A,
      FY26A: audited.crmIsSupp.sbcCor.FY26A,
    },
    expr: '@table["total_sbc", @col] * (@table["sbc_cor", "FY26A"] / (@table["sbc_cor", "FY26A"] + @table["sbc_rd", "FY26A"] + @table["sbc_sm", "FY26A"] + @table["sbc_ga", "FY26A"]))',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("sbc_rd", {
    cells: {
      item: new Cell({ value: "SBC — research & development", indent: 1 }),
      FY24A: audited.crmIsSupp.sbcRd.FY24A,
      FY25A: audited.crmIsSupp.sbcRd.FY25A,
      FY26A: audited.crmIsSupp.sbcRd.FY26A,
    },
    expr: '@table["total_sbc", @col] * (@table["sbc_rd", "FY26A"] / (@table["sbc_cor", "FY26A"] + @table["sbc_rd", "FY26A"] + @table["sbc_sm", "FY26A"] + @table["sbc_ga", "FY26A"]))',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("sbc_sm", {
    cells: {
      item: new Cell({ value: "SBC — sales & marketing", indent: 1 }),
      FY24A: audited.crmIsSupp.sbcSm.FY24A,
      FY25A: audited.crmIsSupp.sbcSm.FY25A,
      FY26A: audited.crmIsSupp.sbcSm.FY26A,
    },
    expr: '@table["total_sbc", @col] * (@table["sbc_sm", "FY26A"] / (@table["sbc_cor", "FY26A"] + @table["sbc_rd", "FY26A"] + @table["sbc_sm", "FY26A"] + @table["sbc_ga", "FY26A"]))',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("sbc_ga", {
    cells: {
      item: new Cell({ value: "SBC — general & administrative", indent: 1 }),
      FY24A: audited.crmIsSupp.sbcGa.FY24A,
      FY25A: audited.crmIsSupp.sbcGa.FY25A,
      FY26A: audited.crmIsSupp.sbcGa.FY26A,
    },
    expr: '@table["total_sbc", @col] - @table["sbc_cor", @col] - @table["sbc_rd", @col] - @table["sbc_sm", @col]',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("sbc_restructuring", {
    cells: {
      item: new Cell({ value: "SBC — restructuring (hist.)", indent: 1 }),
      FY24A: audited.crmIsSupp.sbcRestructuring.FY24A,
      FY25A: audited.crmIsSupp.sbcRestructuring.FY25A,
      FY26A: audited.crmIsSupp.sbcRestructuring.FY26A,
      FY27E: new Cell({
        value: 0,
        note: "Non-recurring restructuring equity acceleration assumed zero across forecast periods.",
      }),
      FY28E: 0,
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })

  costAndSbc.addRowGutter()
  costAndSbc.addSectionHeader("Cash operating cost build (ex-SBC/D&A)")
  costAndSbc.addRow("cor_sub_cash", {
    cells: {
      item: "Cash cost of S&S (ex-PP&E depr.)",
      FY24A: new Cell({
        expr: 'IncomeStatement["cost_of_rev_subscription", @col] - @table["amort_cor", @col] - @table["sbc_cor", @col] - PpeAndIntangiblesSchedule["ppe_and_fin_lease_depr", @col]',
      }),
      FY25A: new Cell({
        expr: 'IncomeStatement["cost_of_rev_subscription", @col] - @table["amort_cor", @col] - @table["sbc_cor", @col] - PpeAndIntangiblesSchedule["ppe_and_fin_lease_depr", @col]',
      }),
      FY26A: new Cell({
        expr: 'IncomeStatement["cost_of_rev_subscription", @col] - @table["amort_cor", @col] - @table["sbc_cor", @col] - PpeAndIntangiblesSchedule["ppe_and_fin_lease_depr", @col]',
      }),
    },
    expr: 'RevenueSchedule["subscription_and_support_rev", @col] * PeriodDriversActive["corSubCashPctSs", @col]',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("cor_ps_cash", {
    cells: {
      item: "Cash cost of prof. services",
      FY24A: audited.crmIs.costOfRevProfServices.FY24A,
      FY25A: audited.crmIs.costOfRevProfServices.FY25A,
      FY26A: audited.crmIs.costOfRevProfServices.FY26A,
    },
    expr: 'RevenueSchedule["professional_services_rev", @col] * PeriodDriversActive["corPsCashPctPs", @col]',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("rd_cash", {
    cells: {
      item: "Cash research & development",
      FY24A: new Cell({
        expr: 'IncomeStatement["rd_expense", @col] - @table["sbc_rd", @col]',
      }),
      FY25A: new Cell({
        expr: 'IncomeStatement["rd_expense", @col] - @table["sbc_rd", @col]',
      }),
      FY26A: new Cell({
        expr: 'IncomeStatement["rd_expense", @col] - @table["sbc_rd", @col]',
      }),
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["rdCashPctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("sm_cash", {
    cells: {
      item: "Cash sales & marketing",
      FY24A: new Cell({
        expr: 'IncomeStatement["sm_expense", @col] - @table["amort_sm", @col] - @table["sbc_sm", @col]',
      }),
      FY25A: new Cell({
        expr: 'IncomeStatement["sm_expense", @col] - @table["amort_sm", @col] - @table["sbc_sm", @col]',
      }),
      FY26A: new Cell({
        expr: 'IncomeStatement["sm_expense", @col] - @table["amort_sm", @col] - @table["sbc_sm", @col]',
      }),
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["smCashPctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("ga_cash", {
    cells: {
      item: "Cash general & administrative",
      FY24A: new Cell({
        expr: 'IncomeStatement["ga_expense", @col] - @table["sbc_ga", @col]',
      }),
      FY25A: new Cell({
        expr: 'IncomeStatement["ga_expense", @col] - @table["sbc_ga", @col]',
      }),
      FY26A: new Cell({
        expr: 'IncomeStatement["ga_expense", @col] - @table["sbc_ga", @col]',
      }),
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["gaCashPctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  costAndSbc.addRow("restructuring_gaap", {
    cells: {
      item: "Restructuring & acquisition costs",
      FY24A: audited.crmIs.restructuring.FY24A,
      FY25A: audited.crmIs.restructuring.FY25A,
      FY26A: audited.crmIs.restructuring.FY26A,
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["restructuringPctRev", @col]',
    format: "currency",
    decimals: 0,
  })

  costAndSbc.addRowGutter()
  costAndSbc.addSectionHeader("GAAP to Non-GAAP operating bridge")
  costAndSbc.addRow("nongaap_operating_income", {
    cells: { item: "Non-GAAP operating income" },
    expr: 'IncomeStatement["operating_income", @col] + PpeAndIntangiblesSchedule["total_intangibles_amort", @col] + (@table["total_sbc", @col] - @table["sbc_restructuring", @col]) + @table["restructuring_gaap", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
    shade: "muted",
  })
  costAndSbc.addRow("nongaap_operating_margin", {
    cells: { item: "Non-GAAP operating margin" },
    expr: '@table["nongaap_operating_income", @col] / RevenueSchedule["total_revenue", @col]',
    format: "percentage",
    decimals: 1,
    style: "subtotal",
  })

  // Table 4: Working Capital & Capitalized Contract Costs Schedule
  const workingCapital = sheet.addTable(
    "WorkingCapitalSchedule",
    "Working Capital & Capitalized Contract Costs",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Sources: ${audited.citations.crmBs10KPrior} & ${compactCrmCite(audited.citations.crmBs10K)}; drives operating working capital and CF`,
        130
      ),
    }
  )
  addAnnualColumns(workingCapital)

  workingCapital.addSectionHeader("Operating working capital balances")
  workingCapital.addRow("ar_ending", {
    cells: {
      item: "Accounts receivable, net",
      FY24A: audited.crmBs.accountsReceivableNet.FY24A,
      FY25A: audited.crmBs.accountsReceivableNet.FY25A,
      FY26A: audited.crmBs.accountsReceivableNet.FY26A,
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["dsoDays", @col] / 365',
    format: "currency",
    decimals: 0,
  })
  workingCapital.addRow("prepaid_ending", {
    cells: {
      item: "Prepaid & other current assets",
      FY24A: audited.crmBs.prepaidAndOtherCurrentAssets.FY24A,
      FY25A: audited.crmBs.prepaidAndOtherCurrentAssets.FY25A,
      FY26A: audited.crmBs.prepaidAndOtherCurrentAssets.FY26A,
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["prepaidPctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  workingCapital.addRow("ap_accrued_ending", {
    cells: {
      item: "AP & accrued current liabilities",
      FY24A: audited.crmBs.apAccruedAndOtherCurrentLiab.FY24A,
      FY25A: audited.crmBs.apAccruedAndOtherCurrentLiab.FY25A,
      FY26A: audited.crmBs.apAccruedAndOtherCurrentLiab.FY26A,
    },
    expr: 'RevenueSchedule["total_revenue", @col] * PeriodDriversActive["apAccruedPctRev", @col]',
    format: "currency",
    decimals: 0,
  })
  workingCapital.addRow("unearned_rev_ending", {
    cells: {
      item: "Unearned revenue",
      FY24A: audited.crmBs.unearnedRevenue.FY24A,
      FY25A: audited.crmBs.unearnedRevenue.FY25A,
      FY26A: audited.crmBs.unearnedRevenue.FY26A,
    },
    expr: 'RevenueSchedule["subscription_and_support_rev", @col] * PeriodDriversActive["unearnedRevPctSsRev", @col]',
    format: "currency",
    decimals: 0,
  })

  workingCapital.addRowGutter()
  workingCapital.addSectionHeader("Capitalized contract costs roll-forward")
  workingCapital.addRow("opening_ccc", {
    cells: {
      item: "Opening cap. contract costs",
      FY24A: null,
    },
    expr: '@table["closing_ccc_total", col.prev]',
    format: "currency",
    decimals: 0,
  })
  workingCapital.addRow("cash_commissions_cap", {
    cells: {
      item: "(+) Cash commissions capitalized",
      FY24A: -audited.crmCf.chgCapitalizedContractCosts.FY24A,
      FY25A: -audited.crmCf.chgCapitalizedContractCosts.FY25A,
      FY26A: -audited.crmCf.chgCapitalizedContractCosts.FY26A,
    },
    expr: 'RevenueSchedule["subscription_and_support_rev", @col] * PeriodDriversActive["capCommissionsPctSsRev", @col]',
    format: "currency",
    decimals: 0,
  })
  workingCapital.addRow("amort_contract_costs", {
    cells: {
      item: "(−) Contract cost amortization",
      FY24A: audited.crmCf.amortContractCosts.FY24A,
      FY25A: audited.crmCf.amortContractCosts.FY25A,
      FY26A: audited.crmCf.amortContractCosts.FY26A,
    },
    expr: '@table["opening_ccc", @col] * ScalarDrivers["contractCostAmortRate", "active"]',
    format: "currency",
    decimals: 0,
  })
  workingCapital.addRow("closing_ccc_total", {
    cells: {
      item: "Closing cap. contract costs",
      FY24A: new Cell({
        expr: 'BalanceSheet["capitalized_contract_costs_current", "FY24A"] + BalanceSheet["capitalized_contract_costs_noncurrent", "FY24A"]',
      }),
      FY25A: new Cell({
        expr: 'BalanceSheet["capitalized_contract_costs_current", "FY25A"] + BalanceSheet["capitalized_contract_costs_noncurrent", "FY25A"]',
      }),
      FY26A: new Cell({
        expr: 'BalanceSheet["capitalized_contract_costs_current", "FY26A"] + BalanceSheet["capitalized_contract_costs_noncurrent", "FY26A"]',
      }),
    },
    expr: '@table["opening_ccc", @col] + @table["cash_commissions_cap", @col] - @table["amort_contract_costs", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })
  workingCapital.addRow("closing_ccc_cur", {
    cells: {
      item: "Cap. contract costs, current",
      FY24A: audited.crmBs.capitalizedContractCostsCurrent.FY24A,
      FY25A: audited.crmBs.capitalizedContractCostsCurrent.FY25A,
      FY26A: audited.crmBs.capitalizedContractCostsCurrent.FY26A,
    },
    expr: '@table["closing_ccc_total", @col] * (@table["closing_ccc_cur", "FY26A"] / @table["closing_ccc_total", "FY26A"])',
    format: "currency",
    decimals: 0,
  })
  workingCapital.addRow("closing_ccc_noncur", {
    cells: {
      item: "Cap. contract costs, noncurrent",
      FY24A: audited.crmBs.capitalizedContractCostsNoncurrent.FY24A,
      FY25A: audited.crmBs.capitalizedContractCostsNoncurrent.FY25A,
      FY26A: audited.crmBs.capitalizedContractCostsNoncurrent.FY26A,
    },
    expr: '@table["closing_ccc_total", @col] - @table["closing_ccc_cur", @col]',
    format: "currency",
    decimals: 0,
  })

  // Table 5: Share Count & Post-ASR Settlement Schedule
  const shareCount = sheet.addTable(
    "ShareCountSchedule",
    "Share Count & ASR Final Settlement Roll-Forward",
    {
      subtitle: wrapSubtitle(
        `(Shares in Millions) | Source: ${audited.citations.crmEpsShares}; models final ASR share retirement and ongoing SBC vs. repurchases`,
        132
      ),
    }
  )
  addAnnualColumns(shareCount)

  shareCount.addSectionHeader("ASR final settlement bridge (FY27)")
  shareCount.addRow("asr_implied_total_shares", {
    cells: {
      item: "Implied total ASR shares delivered",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
      FY27E: new Cell({
        expr: 'AuditedFootnoteAnchors["asr_upfront_payment", "val"] / ScalarDrivers["expectedAsrAvgPrice", "active"]',
      }),
      FY28E: new Cell({
        value: 0,
        note: "Accelerated share repurchase program settles in FY27E.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "number",
    decimals: 2,
  })
  shareCount.addRow("asr_final_delivery_shares", {
    cells: {
      item: "Unsettled ASR shares retired",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
      FY27E: new Cell({
        expr: 'MAX(0, @table["asr_implied_total_shares", "FY27E"] - AuditedFootnoteAnchors["asr_initial_shares", "val"])',
      }),
      FY28E: new Cell({
        value: 0,
        note: "Accelerated share repurchase final delivery completes in FY27E.",
      }),
      FY29E: 0,
      FY30E: 0,
      FY31E: 0,
    },
    format: "number",
    decimals: 2,
  })
  shareCount.addRow("pro_forma_post_asr_diluted", {
    cells: {
      item: "Post-ASR diluted shares (val. base)",
      FY24A: audited.crmIs.dilutedShares.FY24A,
      FY25A: audited.crmIs.dilutedShares.FY25A,
      FY26A: audited.crmIs.dilutedShares.FY26A,
      FY27E: new Cell({
        expr: 'AuditedFootnoteAnchors["cover_shares_aug2026", "val"] - @table["asr_final_delivery_shares", "FY27E"] + AuditedFootnoteAnchors["q2_dilutive_awards", "val"]',
      }),
      FY28E: new Cell({
        expr: '@table["pro_forma_post_asr_diluted", "FY27E"]',
      }),
      FY29E: new Cell({
        expr: '@table["pro_forma_post_asr_diluted", "FY27E"]',
      }),
      FY30E: new Cell({
        expr: '@table["pro_forma_post_asr_diluted", "FY27E"]',
      }),
      FY31E: new Cell({
        expr: '@table["pro_forma_post_asr_diluted", "FY27E"]',
      }),
    },
    format: "number",
    decimals: 2,
    style: "subtotal",
    shade: "muted",
  })

  shareCount.addRowGutter()
  shareCount.addSectionHeader("Annual diluted share count roll-forward")
  shareCount.addRow("ending_diluted_shares", {
    cells: {
      item: "Ending diluted shares",
      FY24A: audited.crmIs.dilutedShares.FY24A,
      FY25A: audited.crmIs.dilutedShares.FY25A,
      FY26A: audited.crmIs.dilutedShares.FY26A,
      FY27E: new Cell({
        expr: '@table["pro_forma_post_asr_diluted", "FY27E"] + @table["sbc_shares_issued", "FY27E"] * 0.5 - @table["buyback_shares_retired", "FY27E"]',
      }),
    },
    expr: '@table["ending_diluted_shares", col.prev] + @table["sbc_shares_issued", @col] - @table["buyback_shares_retired", @col]',
    format: "number",
    decimals: 1,
    style: "subtotal",
  })
  shareCount.addRow("sbc_shares_issued", {
    cells: {
      item: "(+) Net RSU & plan shares issued",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: '(CostAndSbcSchedule["total_sbc", @col] * ScalarDrivers["sbcNetIssuanceRatio", "active"]) / ScalarDrivers["futureBuybackPrice", "active"]',
    format: "number",
    decimals: 1,
  })
  shareCount.addRow("buyback_shares_retired", {
    cells: {
      item: "(−) Open-market buyback shares",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: 'PeriodDriversActive["incrementalShareRepurchases", @col] / ScalarDrivers["futureBuybackPrice", "active"]',
    format: "number",
    decimals: 1,
  })
  shareCount.addRow("weighted_avg_diluted_shares", {
    cells: {
      item: "Weighted-average diluted shares",
      FY24A: audited.crmIs.dilutedShares.FY24A,
      FY25A: audited.crmIs.dilutedShares.FY25A,
      FY26A: audited.crmIs.dilutedShares.FY26A,
      FY27E: new Cell({
        expr: '0.5 * AuditedFootnoteAnchors["q2_fy27_diluted_shares", "val"] + 0.5 * ((AuditedFootnoteAnchors["cover_shares_aug2026", "val"] + @table["ending_diluted_shares", "FY27E"]) / 2)',
      }),
    },
    expr: 'AVERAGE(@table["ending_diluted_shares", col.prev], @table["ending_diluted_shares", @col])',
    format: "number",
    decimals: 1,
    style: "total",
  })
  shareCount.addRow("weighted_avg_basic_shares", {
    cells: {
      item: "Weighted-average basic shares",
      FY24A: audited.crmIs.basicShares.FY24A,
      FY25A: audited.crmIs.basicShares.FY25A,
      FY26A: audited.crmIs.basicShares.FY26A,
    },
    expr: '@table["weighted_avg_diluted_shares", @col] - AuditedFootnoteAnchors["q2_dilutive_awards", "val"]',
    format: "number",
    decimals: 1,
  })

  // Table 6: Debt Roll-Forward, Opening-Balance Interest & Revolving Credit Facility
  const debtSchedule = sheet.addTable(
    "DebtSchedule",
    "Debt Schedule, Maturity Profile & Credit Facility",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Source: ${audited.citations.crmDebt} (Note 8); opening-balance interest with automatic liquidity sweep`,
        128
      ),
    }
  )
  addAnnualColumns(debtSchedule)

  debtSchedule.addSectionHeader("Senior notes & term loan roll-forward")
  debtSchedule.addRow("opening_funded_debt", {
    cells: {
      item: "Opening senior notes & term loan",
      FY24A: null,
    },
    expr: '@table["ending_funded_debt", col.prev]',
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("funded_debt_issuance", {
    cells: {
      item: "(+) Net long-term debt issuance",
      FY24A: audited.crmCf.debtIssuanceProceedsNet.FY24A,
      FY25A: audited.crmCf.debtIssuanceProceedsNet.FY25A,
      FY26A: audited.crmCf.debtIssuanceProceedsNet.FY26A,
      FY27E: new Cell({
        expr: 'LtmCashFlowAndH1Anchors["debt_issuance_proceeds_net", "H1_FY27A"] + PeriodDriversActive["newDebtIssuance", "FY27E"]',
      }),
    },
    expr: 'PeriodDriversActive["newDebtIssuance", @col]',
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("scheduled_debt_maturities", {
    cells: {
      item: "(−) Scheduled debt maturities",
      FY24A: audited.crmCf.debtRepayments.FY24A,
      FY25A: audited.crmCf.debtRepayments.FY25A,
      FY26A: audited.crmCf.debtRepayments.FY26A,
      FY27E: 0,
      FY28E: 0,
      FY29E: new Cell({
        expr: '-DebtTrancheRegistry["mat_fy29_sub", "principal"]',
      }),
      FY30E: new Cell({
        expr: '-DebtTrancheRegistry["mat_fy30_sub", "principal"]',
      }),
      FY31E: 0,
    },
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("ending_funded_debt", {
    cells: {
      item: "Ending senior notes & term loan",
      FY24A: new Cell({
        expr: 'BalanceSheet["debt_current", "FY24A"] + BalanceSheet["debt_noncurrent", "FY24A"]',
      }),
      FY25A: new Cell({
        expr: 'BalanceSheet["debt_current", "FY25A"] + BalanceSheet["debt_noncurrent", "FY25A"]',
      }),
      FY26A: new Cell({
        expr: 'BalanceSheet["debt_current", "FY26A"] + BalanceSheet["debt_noncurrent", "FY26A"]',
      }),
    },
    expr: '@table["opening_funded_debt", @col] + @table["funded_debt_issuance", @col] + @table["scheduled_debt_maturities", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  debtSchedule.addRowGutter()
  debtSchedule.addSectionHeader("Cumulative incremental senior debt")
  debtSchedule.addRow("ending_new_debt_stack", {
    cells: {
      item: "Cumulative forecast new debt",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: '@table["ending_new_debt_stack", col.prev] + PeriodDriversActive["newDebtIssuance", @col]',
    format: "currency",
    decimals: 0,
  })

  debtSchedule.addRowGutter()
  debtSchedule.addSectionHeader("Revolving credit facility")
  debtSchedule.addRow("opening_revolver", {
    cells: {
      item: "Opening revolving credit facility",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: '@table["ending_revolver", col.prev]',
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("revolver_draw", {
    cells: {
      item: "Revolver draw (below cash floor)",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: 'MAX(0, ScalarDrivers["minCashBalance", "active"] - CashFlowStatement["cash_before_revolver", @col])',
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("revolver_repay", {
    cells: {
      item: "Revolver repayment (cash sweep)",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: '-MIN(@table["opening_revolver", @col], MAX(0, CashFlowStatement["cash_before_revolver", @col] - ScalarDrivers["minCashBalance", "active"]))',
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("revolver_net_draw", {
    cells: {
      item: "Net revolver draw / (repayment)",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: '@table["revolver_draw", @col] + @table["revolver_repay", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  debtSchedule.addRow("ending_revolver", {
    cells: {
      item: "Ending revolving credit facility",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
    },
    expr: '@table["opening_revolver", @col] + @table["revolver_net_draw", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  debtSchedule.addRowGutter()
  debtSchedule.addSectionHeader("Total debt classification")
  debtSchedule.addRow("total_debt_ending", {
    cells: { item: "Total debt carrying value" },
    expr: '@table["ending_funded_debt", @col] + @table["ending_revolver", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })
  debtSchedule.addRow("bs_debt_current", {
    cells: {
      item: "Current portion of debt",
      FY24A: audited.crmBs.debtCurrent.FY24A,
      FY25A: audited.crmBs.debtCurrent.FY25A,
      FY26A: audited.crmBs.debtCurrent.FY26A,
      FY27E: new Cell({
        expr: '-@table["scheduled_debt_maturities", "FY28E"]',
      }),
      FY28E: new Cell({
        expr: '-@table["scheduled_debt_maturities", "FY29E"]',
      }),
      FY29E: new Cell({
        expr: '-@table["scheduled_debt_maturities", "FY30E"]',
      }),
      FY30E: new Cell({
        expr: '-@table["scheduled_debt_maturities", "FY31E"]',
      }),
      FY31E: new Cell({
        expr: 'DebtTrancheRegistry["mat_fy32_sub", "principal"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("bs_debt_noncurrent", {
    cells: {
      item: "Noncurrent debt",
      FY24A: audited.crmBs.debtNoncurrent.FY24A,
      FY25A: audited.crmBs.debtNoncurrent.FY25A,
      FY26A: audited.crmBs.debtNoncurrent.FY26A,
    },
    expr: '@table["total_debt_ending", @col] - @table["bs_debt_current", @col]',
    format: "currency",
    decimals: 0,
  })

  debtSchedule.addRowGutter()
  debtSchedule.addSectionHeader("Opening-balance interest expense & income")
  debtSchedule.addRow("interest_expense", {
    cells: {
      item: "Interest expense (tranche + rev.)",
      FY24A: 0,
      FY25A: 0,
      FY26A: 0,
      FY27E: new Cell({
        expr: 'LtmOperatingBridge["interest_expense", "H1_FY27A"] - 0.5 * DebtTrancheRegistry["total_debt", "annual_interest"]',
      }),
      FY28E: new Cell({
        expr: '-(DebtTrancheRegistry["total_debt", "annual_interest"] + @table["ending_new_debt_stack", col.prev] * MacroRatesTable["marginal_pretax_kd", "val"] + @table["opening_revolver", @col] * (MacroRatesTable["marginal_pretax_kd", "val"] + ScalarDrivers["revolverSpread", "active"]))',
      }),
      FY29E: new Cell({
        expr: '-(DebtTrancheRegistry["total_debt", "annual_interest"] + @table["ending_new_debt_stack", col.prev] * MacroRatesTable["marginal_pretax_kd", "val"] + @table["opening_revolver", @col] * (MacroRatesTable["marginal_pretax_kd", "val"] + ScalarDrivers["revolverSpread", "active"]))',
      }),
      FY30E: new Cell({
        expr: '-(DebtTrancheRegistry["mat_fy30_sub", "annual_interest"] + DebtTrancheRegistry["mat_fy32_plus_sub", "annual_interest"] + @table["ending_new_debt_stack", col.prev] * MacroRatesTable["marginal_pretax_kd", "val"] + @table["opening_revolver", @col] * (MacroRatesTable["marginal_pretax_kd", "val"] + ScalarDrivers["revolverSpread", "active"]))',
      }),
      FY31E: new Cell({
        expr: '-(DebtTrancheRegistry["mat_fy32_plus_sub", "annual_interest"] + @table["ending_new_debt_stack", col.prev] * MacroRatesTable["marginal_pretax_kd", "val"] + @table["opening_revolver", @col] * (MacroRatesTable["marginal_pretax_kd", "val"] + ScalarDrivers["revolverSpread", "active"]))',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  debtSchedule.addRow("interest_income", {
    cells: {
      item: "Interest income (opening cash)",
      FY24A: audited.crmIs.otherIncomeExpenseNet.FY24A,
      FY25A: audited.crmIs.otherIncomeExpenseNet.FY25A,
      FY26A: audited.crmIs.otherIncomeExpenseNet.FY26A,
    },
    expr: '(BalanceSheet["cash_and_equivalents", col.prev] + BalanceSheet["marketable_securities", col.prev]) * ScalarDrivers["cashYieldRate", "active"]',
    format: "currency",
    decimals: 0,
  })

  return {
    revenueSchedule,
    ppeAndIntangibles,
    costAndSbc,
    workingCapital,
    shareCount,
    debtSchedule,
  }
}

export function buildAuditedFootnoteAnchorsTable(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): Table {
  const m = audited.crmH1.q2Fy27Meta

  const compactCrmCite = (cite: string): string =>
    cite.replace(/^Salesforce, Inc\.\s*/, "")
  const compactConsensus = audited.citations.crmConsensusTargets.replace(
    "Analyst Consensus Target Price — CRM ",
    "Consensus "
  )
  const auditedAnchors = sheet.addTable(
    "AuditedFootnoteAnchors",
    "Audited Footnote, M&A, ASR & Guidance Anchors",
    {
      subtitle: wrapSubtitle(
        `($M, sh in M, $/sh) | ${audited.citations.crmIs10K.replace("Salesforce, Inc.", "CRM")}, ${compactCrmCite(audited.citations.crmIs10Q)} (Notes 6, 7, 11), ${compactCrmCite(audited.citations.crmGuidance)} & ${compactConsensus}`,
        70
      ),
    }
  )
  auditedAnchors.addColumn("item", {
    role: "descriptor",
    header: "Audited disclosure",
  })
  auditedAnchors.addColumn("val", { headers: ["Audited", "Value"] })
  auditedAnchors.addColumn("source", {
    role: "descriptor",
    header: "Source filing",
  })

  auditedAnchors.addSectionHeader("M&A disclosures & commitments (Note 6)")
  auditedAnchors.addRow("informatica_fy26_rev", {
    cells: {
      item: "Informatica FY26A revenue contrib.",
      val: m.informaticaFy26Rev,
      source: "FY26 10-K, Note 6",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("informatica_h1_fy27_rev", {
    cells: {
      item: "Informatica H1 FY27A revenue",
      val: m.informaticaH1Fy27Rev,
      source: "Q2 FY27 10-Q, Note 6",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("pending_contentful_cash", {
    cells: {
      item: "Pending Contentful cash (Q3 FY27)",
      val: m.pendingContentfulCash,
      source: "Q2 FY27 10-Q, Note 6",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("pending_fin_cash", {
    cells: {
      item: "Pending Fin cash (Q3 FY27)",
      val: m.pendingFinCash,
      source: "Q2 FY27 10-Q, Note 6",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("pending_q3_ma_total", {
    cells: {
      item: "Total Q3 FY27 pending cash M&A",
      val: new Cell({
        expr: '@table["pending_contentful_cash", "val"] + @table["pending_fin_cash", "val"]',
      }),
      source: "Sum of Q3 cash deals",
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  auditedAnchors.addRowGutter()
  auditedAnchors.addSectionHeader("Purchased intangibles amort. (Note 7)")
  auditedAnchors.addRow("h1_intang_gross_add", {
    cells: {
      item: "H1 FY27A gross intang. additions",
      val: m.h1IntangiblesGrossAdditions,
      source: "Q2 FY27 10-Q, Note 7",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("note7_amort_fy27_rem", {
    cells: {
      item: "Scheduled intang. amort. — H2 FY27E",
      val: m.futureAmortFy27Rem,
      source: "Q2 FY27 10-Q, Note 7",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("note7_amort_fy28", {
    cells: {
      item: "Scheduled intang. amort. — FY28E",
      val: m.futureAmortFy28,
      source: "Q2 FY27 10-Q, Note 7",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("note7_amort_fy29", {
    cells: {
      item: "Scheduled intang. amort. — FY29E",
      val: m.futureAmortFy29,
      source: "Q2 FY27 10-Q, Note 7",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("note7_amort_fy30", {
    cells: {
      item: "Scheduled intang. amort. — FY30E",
      val: m.futureAmortFy30,
      source: "Q2 FY27 10-Q, Note 7",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("note7_amort_fy31", {
    cells: {
      item: "Scheduled intang. amort. — FY31E",
      val: m.futureAmortFy31,
      source: "Q2 FY27 10-Q, Note 7",
    },
    format: "currency",
    decimals: 0,
  })

  auditedAnchors.addRowGutter()
  auditedAnchors.addSectionHeader("Share count & ASR terms (Note 11)")
  auditedAnchors.addRow("cover_shares_aug2026", {
    cells: {
      item: "Common shares out (Aug 20, 2026)",
      val: m.coverSharesOutstanding,
      source: "Q2 FY27 10-Q, Cover",
    },
    format: "number",
    decimals: 1,
  })
  auditedAnchors.addRow("q2_dilutive_awards", {
    cells: {
      item: "Q2 FY27A dilutive stock awards",
      val: m.q2DilutiveStockAwards,
      source: "Q2 FY27 10-Q, Note 11",
    },
    format: "number",
    decimals: 1,
  })
  auditedAnchors.addRow("asr_upfront_payment", {
    cells: {
      item: "ASR upfront prepayment",
      val: m.asrUpfrontPayment,
      source: "Q2 FY27 10-Q, Note 11",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("asr_initial_shares", {
    cells: {
      item: "ASR initial shares delivered",
      val: m.asrInitialSharesDelivered,
      source: "Q2 FY27 10-Q, Note 11",
    },
    format: "number",
    decimals: 1,
  })
  auditedAnchors.addRow("q2_fy27_diluted_shares", {
    cells: {
      item: "H1 FY27A avg. diluted shares",
      val: audited.crmH1.h1Fy27.diluted_shares,
      source: "Q2 FY27 10-Q, IS",
    },
    format: "number",
    decimals: 1,
  })

  auditedAnchors.addRowGutter()
  auditedAnchors.addSectionHeader("Management guidance & consensus")
  auditedAnchors.addRow("fy27_guidance_rev_mid", {
    cells: {
      item: "FY27 revenue guidance midpoint",
      val: new Cell({
        expr: '(@table["fy27_guidance_rev_low", "val"] + @table["fy27_guidance_rev_high", "val"]) / 2',
      }),
      source: "Midpoint of low / high",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("fy27_guidance_rev_low", {
    cells: {
      item: "FY27 revenue guidance — low",
      val: m.fy27GuidanceRevLow,
      source: "Q2 FY27 8-K, Ex. 99.1",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("fy27_guidance_rev_high", {
    cells: {
      item: "FY27 revenue guidance — high",
      val: m.fy27GuidanceRevHigh,
      source: "Q2 FY27 8-K, Ex. 99.1",
    },
    format: "currency",
    decimals: 0,
  })
  auditedAnchors.addRow("crm_fy1_cons_eps", {
    cells: {
      item: "CRM FY27 consensus EPS",
      val: m.crmFy1ConsensusEps,
      source: "Nasdaq/Zacks (incl MTM)",
    },
    format: "currency",
    decimals: 2,
  })
  auditedAnchors.addRow("crm_fy2_cons_eps", {
    cells: {
      item: "CRM FY28 consensus EPS",
      val: m.crmFy2ConsensusEps,
      source: "Nasdaq/Zacks (Nov 26)",
    },
    format: "currency",
    decimals: 2,
  })
  auditedAnchors.addRow("crm_target_mean", {
    cells: {
      item: "Analyst consensus mean target",
      val: m.crmTargetMean,
      source: "Nasdaq/Zacks (30B/9H)",
    },
    format: "currency",
    decimals: 2,
  })
  auditedAnchors.addRow("crm_target_low", {
    cells: {
      item: "Analyst consensus low target",
      val: m.crmTargetLow,
      source: "Nasdaq/Zacks (Nov 26)",
    },
    format: "currency",
    decimals: 2,
  })
  auditedAnchors.addRow("crm_target_high", {
    cells: {
      item: "Analyst consensus high target",
      val: m.crmTargetHigh,
      source: "Nasdaq/Zacks (Nov 26)",
    },
    format: "currency",
    decimals: 2,
  })

  return auditedAnchors
}
