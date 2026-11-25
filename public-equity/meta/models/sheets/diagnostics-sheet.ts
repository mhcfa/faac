import { Cell, type Sheet } from "f8-engine"
import type { AuditedModelData } from "../kg-extractors.ts"
import { SCALE_NOTE_USD_M } from "../scale.ts"
import {
  BS_ALL_PERIODS,
  FORECAST_PERIODS,
  QOE_PERIODS,
  addTimelineColumns,
} from "../timeline.ts"

export function buildDiagnosticsSheet(
  sheet: Sheet,
  data: AuditedModelData
): void {
  // =========================================================================
  // Band 1: Quality of Earnings (QoE) Normalization Bridge
  // =========================================================================
  const qoe = sheet.addTable(
    "QoeNormalizationBridge",
    "Quality of Earnings (QoE) Normalization & Accounting Distortions",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Normalizes discrete legal/severance charges and discrete tax shocks; flags FY25 useful-life D&A tailwind",
      ],
    }
  )
  qoe.addColumn("label", {
    role: "descriptor",
    header: "QoE Normalization Line",
  })
  addTimelineColumns(qoe, "qoe")

  qoe.addSectionHeader("Operating income & EBITDA normalization")

  qoe.addRow("gaap_ebit", {
    cells: { label: new Cell({ value: "GAAP operating income (EBIT)" }) },
    expr: 'IncomeStatement["operating_income", @col]',
    format: "currency",
    decimals: 0,
  })
  qoe.addRow("ag_legal_addback", {
    cells: {
      label: new Cell({ value: "(+) Multistate AG legal settlement accrual" }),
    },
    expr: 'IncomeStatement["qoe_ag_legal_addback", @col]',
    format: "currency",
    decimals: 0,
  })
  qoe.addRow("severance_addback", {
    cells: {
      label: new Cell({ value: "(+) May 2026 workforce severance charge" }),
    },
    expr: 'IncomeStatement["qoe_severance_addback", @col]',
    format: "currency",
    decimals: 0,
  })
  qoe.addRow("clean_ebit", {
    cells: { label: new Cell({ value: "Normalized (clean) EBIT" }) },
    expr: 'IncomeStatement["normalized_ebit", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  qoe.addRow("da", {
    cells: { label: new Cell({ value: "(+) Depreciation & amortization" }) },
    expr: 'SegmentBuild["consolidated_da", @col]',
    format: "currency",
    decimals: 0,
  })
  qoe.addRow("clean_ebitda", {
    cells: { label: new Cell({ value: "Normalized (clean) EBITDA" }) },
    expr: 'IncomeStatement["normalized_ebitda", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  qoe.addRowGutter()
  qoe.addSectionHeader("Accounting & discrete tax distortions (memo)")

  const ulFy25 = data.val(
    "meta_operating_kpis",
    "fy25_useful_life_depr_reduction",
    "2025-FY",
    { entity: "META" }
  )
  const obbba25 = data.val(
    "meta_operating_kpis",
    "q3_25_obbba_tax_charge",
    "2025-Q3",
    { entity: "META" }
  )
  const camt26 = data.val(
    "meta_operating_kpis",
    "q1_26_camt_tax_benefit",
    "2026-Q1",
    { entity: "META" }
  )

  const ulCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Memo: Server useful-life D&A benefit (5.5y)" }),
  }
  const taxDistCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Memo: Discrete tax charge / (benefit)" }),
  }
  for (const p of QOE_PERIODS) {
    ulCells[p] =
      p === "2025A"
        ? new Cell({
            value: ulFy25,
            note: "Extending server/network useful life to 5.5 years reduced FY2025 D&A by $2,920M (+$2,590M net income / +$1.00 diluted EPS).",
          })
        : null
    if (p === "2025A") {
      taxDistCells[p] = new Cell({
        value: obbba25,
        note: "Q3 2025 OBBBA one-time tax charge (+$15,930M).",
      })
    } else if (p === "9M26A") {
      taxDistCells[p] = new Cell({
        value: camt26,
        note: "Q1 2026 U.S. CAMT transitional tax benefit (-$8,030M).",
      })
    } else if (p === "LTM Q3 26" || p === "2026E") {
      taxDistCells[p] = camt26
    } else {
      taxDistCells[p] = null
    }
  }
  qoe.addRow("useful_life_memo", {
    cells: ulCells,
    format: "currency",
    decimals: 0,
  })
  qoe.addRow("discrete_tax_memo", {
    cells: taxDistCells,
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // Band 2: Dual-Sided Invested Capital Tie-Out, ROIC & Incremental ROIC
  // =========================================================================
  const ic = sheet.addTable(
    "InvestedCapitalRoic",
    "Dual-Sided Invested Capital Tie-Out, ROIC & Incremental ROIC (RONIC)",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Operating-side IC reconciles identically to financing-side IC ($0.00 variance) across all periods",
      ],
    }
  )
  ic.addColumn("label", {
    role: "descriptor",
    header: "Invested Capital / ROIC",
  })
  addTimelineColumns(ic, "bs")

  ic.addSectionHeader("Operating-side invested capital")

  ic.addRow("op_nwc", {
    cells: {
      label: new Cell({ value: "Net operating working capital (NWC)" }),
    },
    expr: 'WorkingCapitalSchedule["operating_nwc", @col]',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("op_net_ppe", {
    cells: { label: new Cell({ value: "Property and equipment, net" }) },
    expr: 'BalanceSheet["property_and_equipment_net", @col]',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("op_net_leases", {
    cells: { label: new Cell({ value: "Net operating lease ROU less liab." }) },
    expr: 'BalanceSheet["operating_lease_rou_assets", @col] - BalanceSheet["operating_lease_liabilities_current", @col] - BalanceSheet["operating_lease_liabilities_noncurrent", @col]',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("op_goodwill", {
    cells: { label: new Cell({ value: "Goodwill" }) },
    expr: 'BalanceSheet["goodwill", @col]',
    format: "currency",
    decimals: 0,
  })
  const vieDcFy25 = data.val(
    "leases_and_commitments",
    "vie_dc_equity_carrying_value",
    "2025-FY",
    { entity: "META" }
  )
  const vieDcQ326 = data.val(
    "leases_and_commitments",
    "vie_dc_equity_carrying_value",
    "2026-Q3",
    { entity: "META" }
  )
  const nonOpEqCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Non-op equity investments (ex-DC VIEs)" }),
    "2022A": new Cell({
      expr: 'BalanceSheet["non_marketable_equity_investments", "2022A"]',
    }),
    "2023A": new Cell({
      expr: 'BalanceSheet["non_marketable_equity_investments", "2023A"]',
    }),
    "2024A": new Cell({
      expr: 'BalanceSheet["non_marketable_equity_investments", "2024A"]',
    }),
    "2025A": new Cell({
      expr: `BalanceSheet["non_marketable_equity_investments", "2025A"] - ${vieDcFy25}`,
    }),
    "Q3 26A": new Cell({
      expr: `BalanceSheet["non_marketable_equity_investments", "Q3 26A"] - ${vieDcQ326}`,
      note: "Excludes Scale AI ($13.8B), Jio ($5.8B), and other passive stakes ($27,892M = $32,624M total less $4,732M operating DC VIE equity).",
    }),
    "2026E": new Cell({
      expr: `BalanceSheet["non_marketable_equity_investments", "2026E"] - ${vieDcQ326}`,
    }),
  }
  for (const p of FORECAST_PERIODS) {
    nonOpEqCells[p] = new Cell({
      expr: `BalanceSheet["non_marketable_equity_investments", "${p}"] - ${vieDcQ326}`,
    })
  }
  ic.addRow("non_op_equity_ex_vie", {
    cells: nonOpEqCells,
    format: "currency",
    decimals: 0,
  })

  const restCashCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Restricted cash excluded from IC" }),
    "2022A": new Cell({
      expr: 'CashFlowStatement["ending_restricted_cur", "2022A"] + CashFlowStatement["ending_restricted_nc", "2022A"]',
    }),
    "2023A": new Cell({
      expr: 'CashFlowStatement["ending_restricted_cur", "2023A"] + CashFlowStatement["ending_restricted_nc", "2023A"]',
    }),
    "2024A": new Cell({
      expr: 'CashFlowStatement["ending_restricted_cur", "2024A"] + CashFlowStatement["ending_restricted_nc", "2024A"]',
    }),
    "2025A": new Cell({
      expr: 'CashFlowStatement["ending_restricted_cur", "2025A"] + CashFlowStatement["ending_restricted_nc", "2025A"]',
    }),
    "Q3 26A": new Cell({
      expr: 'CashFlowStatement["ending_restricted_cur", "9M26A"] + CashFlowStatement["ending_restricted_nc", "9M26A"]',
      note: "$13,132M ($597M current + $12,535M non-current), declining as $10.8B infrastructure escrow releases across FY2028E–FY2030E.",
    }),
    "2026E": new Cell({
      expr: 'CashFlowStatement["ending_restricted_cur", "2026E"] + CashFlowStatement["ending_restricted_nc", "2026E"]',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    restCashCells[p] = new Cell({
      expr: `CashFlowStatement["ending_restricted_cur", "${p}"] + CashFlowStatement["ending_restricted_nc", "${p}"]`,
    })
  }
  ic.addRow("restricted_cash_excluded_ic", {
    cells: restCashCells,
    format: "currency",
    decimals: 0,
  })

  ic.addRow("op_other_assets_net", {
    cells: {
      label: new Cell({ value: "DC VIE equity & other operating net" }),
    },
    expr: 'BalanceSheet["intangible_assets_net", @col] + BalanceSheet["non_marketable_equity_investments", @col] - @table["non_op_equity_ex_vie", @col] + BalanceSheet["other_assets", @col] - @table["restricted_cash_excluded_ic", @col] - BalanceSheet["long_term_income_taxes", @col] - (BalanceSheet["other_liabilities", @col] - WorkingCapitalSchedule["legal_accruals_noncurrent", @col])',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("ic_operating", {
    cells: {
      label: new Cell({ value: "Operating invested capital (incl. goodwill)" }),
    },
    expr: '@table["op_nwc", @col] + @table["op_net_ppe", @col] + @table["op_net_leases", @col] + @table["op_goodwill", @col] + @table["op_other_assets_net", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  ic.addRowGutter()
  ic.addSectionHeader("Financing-side invested capital")

  ic.addRow("fin_total_debt", {
    cells: {
      label: new Cell({ value: "Total carrying debt (LT + cur. + rev.)" }),
    },
    expr: 'BalanceSheet["long_term_debt", @col] + DebtHybridShareSchedule["current_portion_lt_debt", @col] + BalanceSheet["short_term_revolver", @col]',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("fin_legal_debt_like", {
    cells: {
      label: new Cell({ value: "Debt-like accrued legal liabilities" }),
    },
    expr: 'WorkingCapitalSchedule["total_legal_accruals", @col]',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("fin_total_equity", {
    cells: {
      label: new Cell({ value: "Total stockholders' equity (incl. pref.)" }),
    },
    expr: 'BalanceSheet["total_stockholders_equity", @col]',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("fin_less_cash", {
    cells: {
      label: new Cell({ value: "(−) Unrestricted cash & securities" }),
    },
    expr: '-BalanceSheet["total_cash_and_mkt_sec", @col]',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("fin_less_non_op_assets", {
    cells: {
      label: new Cell({ value: "(−) Non-op equity & restricted cash" }),
    },
    expr: '-(@table["non_op_equity_ex_vie", @col] + @table["restricted_cash_excluded_ic", @col])',
    format: "currency",
    decimals: 0,
  })
  ic.addRow("ic_financing", {
    cells: { label: new Cell({ value: "Financing-side invested capital" }) },
    expr: 'SUM(@table["fin_total_debt".."fin_less_non_op_assets", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  ic.addRow("ic_tie_check", {
    cells: {
      label: new Cell({ value: "Invested capital check (Op. − Fin.)" }),
    },
    expr: '@table["ic_operating", @col] - @table["ic_financing", @col]',
    format: "currency",
    decimals: 2,
  })

  ic.addRow("ic_ex_goodwill", {
    cells: {
      label: new Cell({ value: "Invested capital excluding goodwill" }),
    },
    expr: '@table["ic_operating", @col] - @table["op_goodwill", @col]',
    format: "currency",
    decimals: 0,
  })

  // ROIC & RONIC
  ic.addRowGutter()
  ic.addSectionHeader(
    "Return on invested capital (ROIC) & incremental ROIC (RONIC)"
  )

  const nopatExpr = (periodExpr: string): string =>
    `IncomeStatement["normalized_ebit", ${periodExpr}] - MAX(0, IncomeStatement["normalized_ebit", ${periodExpr}]) * ScalarDrivers["effectiveTaxRate", "active"]`

  const nopatCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Normalized NOPAT (at normalized ETR)" }),
    "2022A": new Cell({ expr: nopatExpr('"2022A"') }),
    "2023A": new Cell({ expr: nopatExpr('"2023A"') }),
    "2024A": new Cell({ expr: nopatExpr('"2024A"') }),
    "2025A": new Cell({ expr: nopatExpr('"2025A"') }),
    "Q3 26A": new Cell({
      expr: nopatExpr('"LTM Q3 26"'),
      note: "Uses LTM Q3 2026 normalized EBIT.",
    }),
    "2026E": new Cell({ expr: nopatExpr('"2026E"') }),
  }
  for (const p of FORECAST_PERIODS) {
    nopatCells[p] = new Cell({ expr: nopatExpr("@col") })
  }
  ic.addRow("normalized_nopat", {
    cells: nopatCells,
    format: "currency",
    decimals: 0,
  })

  const roicCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "ROIC (incl. goodwill, avg. IC)" }),
    "2022A": null,
    "2023A": new Cell({
      expr: '@table["normalized_nopat", "2023A"] / ((@table["ic_operating", "2022A"] + @table["ic_operating", "2023A"]) / 2)',
    }),
    "2024A": new Cell({
      expr: '@table["normalized_nopat", "2024A"] / ((@table["ic_operating", "2023A"] + @table["ic_operating", "2024A"]) / 2)',
    }),
    "2025A": new Cell({
      expr: '@table["normalized_nopat", "2025A"] / ((@table["ic_operating", "2024A"] + @table["ic_operating", "2025A"]) / 2)',
    }),
    "Q3 26A": new Cell({
      expr: '@table["normalized_nopat", "Q3 26A"] / ((@table["ic_operating", "2025A"] + @table["ic_operating", "Q3 26A"]) / 2)',
    }),
    "2026E": new Cell({
      expr: '@table["normalized_nopat", "2026E"] / ((@table["ic_operating", "2025A"] + @table["ic_operating", "2026E"]) / 2)',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    roicCells[p] = new Cell({
      expr: '@table["normalized_nopat", @col] / ((@table["ic_operating", col.prev] + @table["ic_operating", @col]) / 2)',
    })
  }
  ic.addRow("roic_incl_goodwill", {
    cells: roicCells,
    format: "percentage",
    decimals: 1,
    style: "bold",
  })

  const roicExGwCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "ROIC (ex-goodwill, organic return)" }),
    "2022A": null,
    "2023A": new Cell({
      expr: '@table["normalized_nopat", "2023A"] / ((@table["ic_ex_goodwill", "2022A"] + @table["ic_ex_goodwill", "2023A"]) / 2)',
    }),
    "2024A": new Cell({
      expr: '@table["normalized_nopat", "2024A"] / ((@table["ic_ex_goodwill", "2023A"] + @table["ic_ex_goodwill", "2024A"]) / 2)',
    }),
    "2025A": new Cell({
      expr: '@table["normalized_nopat", "2025A"] / ((@table["ic_ex_goodwill", "2024A"] + @table["ic_ex_goodwill", "2025A"]) / 2)',
    }),
    "Q3 26A": new Cell({
      expr: '@table["normalized_nopat", "Q3 26A"] / ((@table["ic_ex_goodwill", "2025A"] + @table["ic_ex_goodwill", "Q3 26A"]) / 2)',
    }),
    "2026E": new Cell({
      expr: '@table["normalized_nopat", "2026E"] / ((@table["ic_ex_goodwill", "2025A"] + @table["ic_ex_goodwill", "2026E"]) / 2)',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    roicExGwCells[p] = new Cell({
      expr: '@table["normalized_nopat", @col] / ((@table["ic_ex_goodwill", col.prev] + @table["ic_ex_goodwill", @col]) / 2)',
    })
  }
  ic.addRow("roic_ex_goodwill", {
    cells: roicExGwCells,
    format: "percentage",
    decimals: 1,
  })

  const spreadCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "ROIC spread over active WACC" }),
    "2022A": null,
  }
  for (const p of BS_ALL_PERIODS.slice(1)) {
    spreadCells[p] = new Cell({
      expr: '@table["roic_incl_goodwill", @col] - WaccBuild["wacc", "val"]',
    })
  }
  ic.addRow("roic_spread_vs_wacc", {
    cells: spreadCells,
    format: "percentage",
    decimals: 1,
  })

  const ronicCells: Record<string, Cell | number | null> = {
    label: new Cell({ value: "Incremental ROIC (ΔNOPAT / ΔIC)" }),
    "2022A": null,
    "2023A": new Cell({
      value: null,
      note: "Suppressed: post-efficiency 2023 rebound over shrinking/minimal net reinvestment yields non-meaningful RONIC.",
    }),
    "2024A": new Cell({
      expr: 'IF((@table["ic_operating", "2024A"] - @table["ic_operating", "2023A"]) > 0, (@table["normalized_nopat", "2024A"] - @table["normalized_nopat", "2023A"]) / (@table["ic_operating", "2024A"] - @table["ic_operating", "2023A"]), NA())',
    }),
    "2025A": new Cell({
      expr: 'IF((@table["ic_operating", "2025A"] - @table["ic_operating", "2024A"]) > 0, (@table["normalized_nopat", "2025A"] - @table["normalized_nopat", "2024A"]) / (@table["ic_operating", "2025A"] - @table["ic_operating", "2024A"]), NA())',
    }),
    "Q3 26A": new Cell({
      value: null,
      note: "Suppressed: interim 9-month IC jump is not aligned with annual incremental NOPAT cadence.",
    }),
    "2026E": new Cell({
      expr: 'IF((@table["ic_operating", "2026E"] - @table["ic_operating", "2025A"]) > 0, (@table["normalized_nopat", "2026E"] - @table["normalized_nopat", "2025A"]) / (@table["ic_operating", "2026E"] - @table["ic_operating", "2025A"]), NA())',
    }),
  }
  for (const p of FORECAST_PERIODS) {
    ronicCells[p] = new Cell({
      expr: 'IF((@table["ic_operating", @col] - @table["ic_operating", col.prev]) > 0, (@table["normalized_nopat", @col] - @table["normalized_nopat", col.prev]) / (@table["ic_operating", @col] - @table["ic_operating", col.prev]), NA())',
    })
  }
  ic.addRow("incremental_roic", {
    cells: ronicCells,
    format: "percentage",
    decimals: 1,
  })

  // =========================================================================
  // Band 3: Multi-Year Cash Deployment & SBC Dilution Diagnostics
  // =========================================================================
  const dep = sheet.addTable(
    "CashDeploymentSbc",
    "Multi-Year Cash Deployment Waterfall & SBC Cash Conversion",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Tracks operating cash flow allocation across AI CapEx, RSU tax withholding, buybacks, dividends & debt raises",
      ],
    }
  )
  dep.addColumn("label", { role: "descriptor", header: "Cash Deployment Line" })
  addTimelineColumns(dep, "flow")

  dep.addSectionHeader("Cash generation vs. capital deployment")
  dep.addRow("cfo", {
    cells: { label: new Cell({ value: "Operating cash flow (CFO)" }) },
    expr: 'CashFlowStatement["cfo", @col]',
    format: "currency",
    decimals: 0,
  })
  dep.addRow("total_capex", {
    cells: { label: new Cell({ value: "Total CapEx (incl. finance leases)" }) },
    expr: 'CashFlowStatement["total_capex_outflow", @col]',
    format: "currency",
    decimals: 0,
  })
  dep.addRow("reported_fcf", {
    cells: { label: new Cell({ value: "Reported FCF (CFO − Total CapEx)" }) },
    expr: 'CashFlowStatement["reported_fcf", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  dep.addRow("sbc", {
    cells: {
      label: new Cell({ value: "(−) Share-based compensation (economic)" }),
    },
    expr: '-CashFlowStatement["share_based_compensation", @col]',
    format: "currency",
    decimals: 0,
  })
  dep.addRow("economic_fcf_after_sbc", {
    cells: { label: new Cell({ value: "Economic FCF after SBC" }) },
    expr: 'CashFlowStatement["economic_fcf_after_sbc", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  dep.addRow("rsu_tax_withholding", {
    cells: {
      label: new Cell({ value: "RSU net-share-settlement tax payments" }),
    },
    expr: 'CashFlowStatement["net_share_settlement_taxes", @col]',
    format: "currency",
    decimals: 0,
  })
  dep.addRow("buybacks", {
    cells: { label: new Cell({ value: "Common share repurchases" }) },
    expr: 'CashFlowStatement["share_repurchases", @col]',
    format: "currency",
    decimals: 0,
  })
  dep.addRow("total_dividends", {
    cells: { label: new Cell({ value: "Common & preferred dividends paid" }) },
    expr: 'CashFlowStatement["dividends_paid", @col] + CashFlowStatement["preferred_dividends_paid", @col]',
    format: "currency",
    decimals: 0,
  })
  dep.addRow("net_external_capital", {
    cells: {
      label: new Cell({ value: "Net debt, preferred & forward equity" }),
    },
    expr: 'CashFlowStatement["debt_issuance_proceeds_net", @col] + CashFlowStatement["debt_maturities_repaid", @col] + CashFlowStatement["mcp_preferred_issuance", @col] + CashFlowStatement["fwd_equity_settlement_proceeds", @col] + CashFlowStatement["revolver_draw_repay", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  dep.addRowGutter()
  dep.addSectionHeader("Capital productivity & sustainability ratios")
  dep.addRow("capex_pct_rev", {
    cells: { label: new Cell({ value: "Total CapEx % of revenue" }) },
    expr: '-CashFlowStatement["total_capex_outflow", @col] / IncomeStatement["revenue", @col]',
    format: "percentage",
    decimals: 1,
  })
  dep.addRow("capex_to_da", {
    cells: {
      label: new Cell({ value: "CapEx / D&A ratio (reinvestment check)" }),
    },
    expr: '-CashFlowStatement["total_capex_outflow", @col] / SegmentBuild["consolidated_da", @col]',
    format: "multiple",
    decimals: 1,
  })
  dep.addRow("sbc_pct_rev", {
    cells: { label: new Cell({ value: "SBC % of revenue" }) },
    expr: 'CashFlowStatement["share_based_compensation", @col] / IncomeStatement["revenue", @col]',
    format: "percentage",
    decimals: 1,
  })
  dep.addRow("fcf_conversion_ebitda", {
    cells: {
      label: new Cell({ value: "Economic FCF % of normalized EBITDA" }),
    },
    expr: 'IF(IncomeStatement["normalized_ebitda", @col] > 0, CashFlowStatement["economic_fcf_after_sbc", @col] / IncomeStatement["normalized_ebitda", @col], NA())',
    format: "percentage",
    decimals: 1,
  })

  // =========================================================================
  // Band 4 Left (Cols B..J): Pro Forma Leverage & Shareholder Capital Returns
  // (laneGap Col K = Regime Gutter 1, width 2)
  // =========================================================================
  const pfCap = sheet.addTable(
    "ProFormaCapitalSummary",
    "Pro Forma Leverage & Cumulative Capital Return Summary",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Bridges Nov 20, 2026 pro forma cash vs. net debt tiers",
        "and 5-year equity cash outflows vs. net diluted share change",
      ],
    }
  )
  pfCap.addColumn("label", {
    role: "descriptor",
    header: "Capital Structure & Return Metric",
  })
  pfCap.addColumn("val", { header: "Value" })
  pfCap.addColumn("pct_ref", { headers: ["% Spot", "MCap / Chg"] })
  pfCap.addColumn("notes", { role: "descriptor", header: "Notes" })

  pfCap.addSectionHeader("Nov 20, 2026 pro forma cash vs. net debt tiers")

  pfCap.addRow("pf_gross_cash", {
    cells: {
      label: new Cell({ value: "Pro forma unrestricted cash & securities" }),
      val: new Cell({
        expr: 'DcfBridge["q3_unrestricted_cash", "val"] + DcfBridge["post_q3_cash_proceeds", "val"] + DcfBridge["elapsed_q4_fcff_burn", "val"]',
        format: "currency",
        decimals: 0,
      }),
      pct_ref: new Cell({
        expr: '@table[@row, "val"] / WaccBuild["spot_mkt_cap", "val"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Q3 + Oct–Nov raises + 51d Q4 burn",
    },
  })
  pfCap.addRow("pf_funded_pure_debt", {
    cells: {
      label: new Cell({ value: "Pro forma funded pure debt (fair value)" }),
      val: new Cell({
        expr: 'WaccBuild["pf_pure_debt", "val"]',
        format: "currency",
        decimals: 0,
      }),
      pct_ref: new Cell({
        expr: '@table[@row, "val"] / WaccBuild["spot_mkt_cap", "val"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "$73.3B FV + $25.0B Nov notes",
    },
  })
  pfCap.addRow("pf_net_debt_pure", {
    cells: {
      label: new Cell({ value: "Pro forma net debt (pure funded debt)" }),
      val: new Cell({
        expr: '@table["pf_funded_pure_debt", "val"] - @table["pf_gross_cash", "val"]',
        format: "currency",
        decimals: 0,
      }),
      pct_ref: new Cell({
        expr: '@table[@row, "val"] / WaccBuild["spot_mkt_cap", "val"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Funded pure debt less cash",
    },
    style: "subtotal",
  })
  pfCap.addRow("pf_net_debt_incl_metam", {
    cells: {
      label: new Cell({ value: "Pro forma net debt incl. METAM preferred" }),
      val: new Cell({
        expr: '@table["pf_net_debt_pure", "val"] + PostQ3FinancingRegistry["mcp_base_liq_pref", "val"]',
        format: "currency",
        decimals: 0,
      }),
      pct_ref: new Cell({
        expr: '@table[@row, "val"] / WaccBuild["spot_mkt_cap", "val"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Adds $12.5B Series A pref. face",
    },
  })
  pfCap.addRow("pf_net_debt_incl_legal", {
    cells: {
      label: new Cell({ value: "Pro forma net debt incl. METAM & legal" }),
      val: new Cell({
        expr: '@table["pf_net_debt_incl_metam", "val"] + WorkingCapitalSchedule["total_legal_accruals", "Q3 26A"]',
        format: "currency",
        decimals: 0,
      }),
      pct_ref: new Cell({
        expr: '@table[@row, "val"] / WaccBuild["spot_mkt_cap", "val"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Adds $19.9B legal accruals (N.8)",
    },
    style: "subtotal",
  })

  pfCap.addRowGutter()
  pfCap.addSectionHeader("5-year shareholder cash outflows vs. share count")

  pfCap.addRow("cum_5y_equity_outflows", {
    cells: {
      label: new Cell({ value: "Cumulative 5Y equity cash outflows ($M)" }),
      val: new Cell({
        expr: '-(SUM(CashFlowStatement["share_repurchases", "2027E".."2031E"]) + SUM(CashFlowStatement["dividends_paid", "2027E".."2031E"]) + SUM(CashFlowStatement["preferred_dividends_paid", "2027E".."2031E"]) + SUM(CashFlowStatement["net_share_settlement_taxes", "2027E".."2031E"]))',
        format: "currency",
        decimals: 0,
      }),
      pct_ref: new Cell({
        expr: '@table[@row, "val"] / WaccBuild["spot_mkt_cap", "val"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Buybacks, dividends & RSU tax",
    },
  })
  pfCap.addRow("cum_5y_net_share_change", {
    cells: {
      label: new Cell({ value: "Cumulative 5Y net diluted share chg (M)" }),
      val: new Cell({
        expr: 'DebtHybridShareSchedule["ending_diluted_shares", "2031E"] - DebtHybridShareSchedule["ending_diluted_shares", "Q3 26A"]',
        format: "number",
        decimals: 1,
      }),
      pct_ref: new Cell({
        expr: '@table[@row, "val"] / DebtHybridShareSchedule["ending_diluted_shares", "Q3 26A"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "+46M fwd, 20M METAM, RSU − buybacks",
    },
    style: "bold",
  })

  // =========================================================================
  // Band 4 Right (Cols L..V; Col P = Regime Gutter 2, width 2; Flush at Col V):
  // Off-Balance-Sheet Commitments, Leases & Litigation Tail Exposure
  // =========================================================================
  const obs = sheet.addTable(
    "OffBalanceSheetContingencies",
    "Off-Balance-Sheet Commitments, Lease & Litigation Tail Schedule (Q3 2026A)",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Meta Platforms Q3 2026 Form 10-Q (Notes 4, 5, 8, 10, 12) & FY2025 Form 10-K (Note 7)",
      ],
    }
  )
  obs.addColumn("label", {
    role: "descriptor",
    header: "Exposure / Commitment",
  })
  obs.addColumnGutter()
  obs.addColumn("amount", { headers: ["Amount", "($M)"] })
  obs.addColumn("pct_mkt_cap", { headers: ["% Spot", "MCap"] })
  obs.addColumn("notes", { role: "descriptor", header: "Notes" })

  const lc = (rowId: string, p: string): number =>
    data.val("leases_and_commitments", rowId, p, { entity: "META" })

  const addObsRow = (
    id: string,
    label: string,
    amountOrExpr: number | { readonly expr: string },
    noteText: string,
    style?: "subtotal" | "total"
  ): void => {
    obs.addRow(id, {
      cells: {
        label: new Cell({ value: label }),
        amount:
          typeof amountOrExpr === "number"
            ? new Cell({ value: amountOrExpr, format: "currency", decimals: 0 })
            : new Cell({
                expr: amountOrExpr.expr,
                format: "currency",
                decimals: 0,
              }),
        pct_mkt_cap: new Cell({
          expr: '@table[@row, "amount"] / WaccBuild["spot_mkt_cap", "val"]',
          format: "percentage",
          decimals: 1,
        }),
        notes: noteText,
      },
      style,
    })
  }

  obs.addSectionHeader("Infrastructure, lease & data-center commitments")
  addObsRow(
    "on_bs_operating_leases",
    "On-BS operating lease liabilities (Q3 26)",
    {
      expr: 'BalanceSheet["operating_lease_liabilities_current", "Q3 26A"] + BalanceSheet["operating_lease_liabilities_noncurrent", "Q3 26A"]',
    },
    "Excluded from US GAAP EV (rent in EBITDA)"
  )
  addObsRow(
    "uncommenced_leases",
    "Off-BS uncommenced lease obligations",
    lc("uncommenced_lease_obligations", "2026-Q3"),
    "Data center & fiber leases FY26–31+ (N.10)"
  )
  addObsRow(
    "purchase_commitments_total",
    "Non-cancelable purchase commitments — total",
    lc("purchase_commitments_total", "2026-Q3"),
    "$45.9B FY26 + $121.4B FY27 GPU/power (N.10)"
  )
  addObsRow(
    "purchase_commitments_2027",
    "Memo: Purchase commitments due in FY2027",
    lc("purchase_commitments_2027", "2026-Q3"),
    "Binding FY27 infrastructure CapEx floor"
  )
  addObsRow(
    "vie_dc_max_exposure",
    "Unconsolidated DC VIE maximum exposure",
    lc("vie_dc_max_exposure_total", "2026-Q3"),
    "LA ($27B) & TX ($14B) ventures (Note 5)"
  )
  addObsRow(
    "vie_dc_rvg",
    "Memo: Data-center residual value guarantees",
    lc("vie_dc_max_rvg", "2026-Q3"),
    "Max RVG payout if JV leases not renewed (N.5)"
  )
  addObsRow(
    "contingent_cloud",
    "Contingent cloud compute commitments",
    lc("contingent_cloud_commitments", "2026-Q3"),
    "Third-party cloud subject to milestones (N.10)"
  )

  obs.addRowGutter()
  obs.addSectionHeader("Litigation, tax & restricted cash exposures")
  addObsRow(
    "accrued_legal_in_ev",
    "Accrued legal liabilities (in EV bridge)",
    { expr: 'WorkingCapitalSchedule["total_legal_accruals", "Q3 26A"]' },
    "$11.6B cur. + $8.3B non-cur. deducted in EV"
  )
  addObsRow(
    "ag_unaccrued_tranche",
    "Multistate AG unaccrued contingent tranche",
    lc("multistate_ag_contingent_unaccrued", "2026-Q3"),
    "Contingent on peer settlement levels (N.10)"
  )
  addObsRow(
    "nm_ag_penalty",
    "NM AG civil penalty order (under appeal)",
    lc("nm_ag_civil_penalty_order", "2026-Q3"),
    "Oct 21 order; 15% interest; partial overlap"
  )
  const nmRate = lc("nm_ag_post_judgment_interest_rate", "2026-Q3")
  addObsRow(
    "nm_ag_2yr_interest",
    "NM AG illustrative 2-yr interest (@ 15%/yr)",
    {
      expr: `@table["nm_ag_penalty", "amount"] * ${nmRate} * 2`,
    },
    "Simple statutory interest during appeal (N.10)"
  )
  const grossUtb = lc("gross_unrecognized_tax_benefits", "2026-Q3")
  const utbInt = lc("utb_accrued_interest_penalties", "2026-Q3")
  addObsRow(
    "gross_utb_and_interest",
    "Gross UTBs + accrued interest & penalties",
    grossUtb + utbInt,
    "$20.8B UTB + $3.5B int. ($15.9B IRS TP, N.12)"
  )
  addObsRow(
    "lt_income_taxes_memo",
    "Memo: Q3 2026 BS long-term income taxes",
    { expr: 'BalanceSheet["long_term_income_taxes", "Q3 26A"]' },
    "$13.41B DTLs + $7.11B BS UTBs (Form 10-Q)"
  )
  addObsRow(
    "restricted_cash_excluded",
    "Restricted cash excluded from EV cash",
    {
      expr: 'CashFlowStatement["ending_restricted_cur", "9M26A"] + CashFlowStatement["ending_restricted_nc", "9M26A"]',
    },
    "$597M cur. + $12.5B non-cur. ($10.8B escrow)"
  )
  addObsRow(
    "total_off_bs_commitments",
    "Total uncommenced leases + purch. + VIEs",
    {
      expr: '@table["uncommenced_leases", "amount"] + @table["purchase_commitments_total", "amount"] + @table["vie_dc_max_exposure", "amount"]',
    },
    "Combined gross off-BS infrastructure exposure",
    "total"
  )

  sheet.setBands([qoe, ic, dep, { lanes: [pfCap, obs] }])
}
