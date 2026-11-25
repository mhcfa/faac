import type { CellInputValue, Sheet, Table } from "f8-engine"
import {
  ALL_SCENARIO_DRIVERS,
  formatDriverBasisSource,
  type CapitalStructureDrivers,
  type Driver,
  type OperatingDrivers,
  type PeriodVector,
  type ScenarioDriverBundle,
  type ValuationDrivers,
  type WorkingCapitalDrivers,
} from "../assumptions/index.ts"
import { buildDebtTranches } from "../assumptions/capitalStructure.ts"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  FORECAST_PERIODS,
  PERIOD_METADATA,
  SCENARIOS,
  rowFormatOptions,
  type ScenarioName,
} from "../timeline.ts"

interface PeriodDriverEntry {
  readonly id: string
  readonly driver: Driver<PeriodVector>
}

interface ScalarDriverEntry {
  readonly id: string
  readonly driver: Driver<number>
}

function collectPeriodDriverEntries(
  bundle: ScenarioDriverBundle
): readonly PeriodDriverEntry[] {
  const op: OperatingDrivers = bundle.operating
  const wc: WorkingCapitalDrivers = bundle.workingCapital
  const cap: CapitalStructureDrivers = bundle.capitalStructure
  return [
    { id: "net_openings_us", driver: op.netOpeningsUs },
    { id: "net_openings_canada", driver: op.netOpeningsCanada },
    { id: "net_openings_other_intl", driver: op.netOpeningsOtherIntl },
    { id: "core_comp_us", driver: op.coreCompUs },
    { id: "core_comp_canada", driver: op.coreCompCanada },
    { id: "core_comp_other_intl", driver: op.coreCompOtherIntl },
    { id: "gas_fx_comp_impact", driver: op.gasFxCompImpact },
    { id: "members_per_wh_growth", driver: op.membersPerWhGrowth },
    { id: "fee_per_member_growth", driver: op.feePerMemberGrowth },
    { id: "merch_gross_margin_pct", driver: op.merchGrossMarginPct },
    { id: "cash_sga_pct_net_sales", driver: op.cashSgaPctNetSales },
    { id: "sbc_pct_net_sales", driver: op.sbcPctNetSales },
    { id: "capex_pct_net_sales", driver: wc.capexPctNetSales },
    { id: "effective_tax_rate", driver: cap.effectiveTaxRate },
    { id: "annual_buyback_dollars", driver: cap.annualBuybackDollars },
    { id: "rsu_vested_shares", driver: cap.rsuVestedShares },
  ]
}

function collectScalarDriverEntries(
  bundle: ScenarioDriverBundle
): readonly ScalarDriverEntry[] {
  const op: OperatingDrivers = bundle.operating
  const wc: WorkingCapitalDrivers = bundle.workingCapital
  const cap: CapitalStructureDrivers = bundle.capitalStructure
  const val: ValuationDrivers = bundle.valuation
  return [
    { id: "new_club_productivity", driver: op.newClubProductivity },
    { id: "dso_days", driver: wc.dsoDays },
    { id: "dio_days", driver: wc.dioDays },
    { id: "dpo_days", driver: wc.dpoDays },
    { id: "accrued_salaries_days", driver: wc.accruedSalariesDays },
    {
      id: "other_current_assets_pct_sales",
      driver: wc.otherCurrentAssetsPctSales,
    },
    {
      id: "other_current_liab_op_pct_sales",
      driver: wc.otherCurrentLiabOpPctSales,
    },
    { id: "accrued_rewards_pct_sales", driver: wc.accruedRewardsPctSales },
    { id: "deferred_mfi_pct_mfi", driver: wc.deferredMfiPctMfi },
    { id: "op_lease_rou_pct_sales", driver: wc.opLeaseRouPctSales },
    { id: "other_lt_op_assets_pct_sales", driver: wc.otherLtOpAssetsPctSales },
    { id: "other_lt_op_liab_pct_sales", driver: wc.otherLtOpLiabPctSales },
    { id: "da_pct_beg_ppe", driver: wc.daPctBegPpe },
    { id: "cash_interest_yield", driver: cap.cashInterestYield },
    { id: "fx_other_non_op", driver: cap.fxOtherNonOp },
    { id: "sti_net_maturity_fy27", driver: cap.stiNetMaturityFy27 },
    { id: "min_cash_buffer", driver: cap.minCashBuffer },
    { id: "revolver_spread_over_rf", driver: cap.revolverSpreadOverRf },
    { id: "japan_debt_coupon_rate", driver: cap.japanDebtCouponRate },
    { id: "japan_post_fy36_principal", driver: cap.japanPostFy36Principal },
    {
      id: "unamortized_discount_amort_annual",
      driver: cap.unamortizedDiscountAmortAnnual,
    },
    {
      id: "special_div_fy_absent_weight",
      driver: cap.specialDivFyAbsentWeight,
    },
    {
      id: "scheduled_debt_fy_absent_weight",
      driver: cap.scheduledDebtFyAbsentWeight,
    },
    {
      id: "apr_maturity_fy_absent_weight",
      driver: cap.aprMaturityFyAbsentWeight,
    },
    { id: "special_dividend_ps_fy27", driver: cap.specialDividendPerShareFy27 },
    { id: "regular_dps_growth", driver: cap.regularDpsGrowth },
    {
      id: "target_operating_cash_buffer",
      driver: cap.targetOperatingCashBuffer,
    },
    {
      id: "excess_cash_buyback_sweep_pct",
      driver: cap.excessCashBuybackSweepPct,
    },
    { id: "buyback_price_growth", driver: cap.buybackPriceGrowth },
    { id: "rsu_tax_withholding_pct_sbc", driver: cap.rsuTaxWithholdingPctSbc },
    { id: "dilutive_rsu_shares", driver: cap.dilutiveRsuShares },
    { id: "fin_lease_pct_sales", driver: cap.finLeasePctSales },
    { id: "fin_lease_principal_pct", driver: cap.finLeasePrincipalPct },
    { id: "fin_lease_interest_rate", driver: cap.finLeaseInterestRate },
    {
      id: "fin_lease_int_in_gaap_int_pct",
      driver: cap.finLeaseIntInGaapIntPct,
    },
    { id: "op_lease_liab_to_rou_ratio", driver: cap.opLeaseLiabToRouRatio },
    { id: "op_lease_current_share", driver: cap.opLeaseCurrentShare },
    { id: "fin_lease_current_share", driver: cap.finLeaseCurrentShare },
    { id: "equity_risk_premium", driver: val.equityRiskPremium },
    { id: "rf_stress_rate", driver: val.rfStressRate },
    { id: "mid_year_convention_flag", driver: val.midYearConventionFlag },
    { id: "terminal_growth_rate", driver: val.terminalGrowthRate },
    { id: "exit_ev_to_ebitda", driver: val.exitEvToEbitda },
    {
      id: "calibrated_comps_ev_to_ebitda",
      driver: val.calibratedCompsEvEbitda,
    },
    { id: "weight_perp_dcf", driver: val.weightPerpDcf },
    { id: "weight_exit_dcf", driver: val.weightExitDcf },
    { id: "wacc_step_sensitivity", driver: val.waccStepSensitivity },
    {
      id: "term_growth_step_sensitivity",
      driver: val.termGrowthStepSensitivity,
    },
    {
      id: "exit_multiple_step_sensitivity",
      driver: val.exitMultipleStepSensitivity,
    },
    {
      id: "ebit_margin_step_sensitivity",
      driver: val.ebitMarginStepSensitivity,
    },
    {
      id: "comp_growth_step_sensitivity",
      driver: val.compGrowthStepSensitivity,
    },
  ]
}

function periodVectorsEqual(a: PeriodVector, b: PeriodVector): boolean {
  return FORECAST_PERIODS.every((p) => a[p] === b[p])
}

function buildPeriodDriverTable(
  sheet: Sheet,
  id: string,
  title: string,
  subtitle: readonly string[],
  bundle: ScenarioDriverBundle,
  mode: "active" | "base" | "diff"
): Table {
  const table = sheet.addTable(id, title, {
    subtitle,
    currency: "USD",
  })
  table.addColumn("line_item", {
    role: "descriptor",
    header: "Forecast assumption",
  })
  for (const p of FORECAST_PERIODS) {
    table.addColumn(p, {
      role: "measure",
      group: "Forecast",
      header: PERIOD_METADATA[p].header,
    })
  }
  table.addColumn("notes", {
    role: "descriptor",
    header:
      mode === "active"
        ? "Basis / Source"
        : mode === "base"
          ? "Source"
          : "Diff vs. Base",
  })

  const entries = collectPeriodDriverEntries(bundle)
  const baseEntries = collectPeriodDriverEntries(ALL_SCENARIO_DRIVERS.Base)
  let currentCategory = ""
  let isFirstSection = true

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    const baseEntry = baseEntries[i]!
    const { meta, value } = entry.driver

    if (meta.category !== currentCategory) {
      if (!isFirstSection) {
        table.addRowGutter()
      }
      isFirstSection = false
      currentCategory = meta.category
      table.addSectionHeader(currentCategory)
    }

    const fmt = rowFormatOptions(meta.format, meta.decimals)
    const noteText =
      mode === "active"
        ? formatDriverBasisSource(meta)
        : mode === "base"
          ? (meta.source ?? meta.basis ?? "")
          : periodVectorsEqual(value, baseEntry.driver.value)
            ? ""
            : (meta.basis ?? "Flexed vs. Base")

    if (mode === "active") {
      table.addRow(entry.id, {
        ...fmt,
        cells: {
          line_item: meta.label,
          notes: noteText,
        },
        expr: 'CHOOSE(ScenarioControl["active_idx", "val"], PeriodAssumptionsDownside[@row, @col], PeriodAssumptionsBase[@row, @col], PeriodAssumptionsUpside[@row, @col])',
      })
    } else {
      const cells: Record<string, CellInputValue> = {
        line_item: meta.label,
        notes: noteText,
      }
      for (const p of FORECAST_PERIODS) {
        cells[p] = value[p]
      }
      table.addRow(entry.id, {
        ...fmt,
        cells,
      })
    }
  }
  return table
}

function buildScalarDriverTable(sheet: Sheet): Table {
  const table = sheet.addTable(
    "ScalarAssumptionsActive",
    "Operating, Balance-Sheet & Valuation Assumptions",
    {
      subtitle: [
        "Scenario case parameters ($M, %, days, or multiples) with active case selection",
        "Basis and source citations listed alongside each parameter",
      ],
      currency: "USD",
    }
  )
  table.addColumn("line_item", {
    role: "descriptor",
    header: "Assumption / Parameter",
  })
  for (const sc of SCENARIOS) {
    table.addColumn(sc, {
      role: "measure",
      headers: [sc, "Case"],
    })
  }
  table.addColumn("val", {
    role: "measure",
    headers: ["Active", "Case"],
    style: "bold",
    shade: "muted",
    expr: 'CHOOSE(ScenarioControl["active_idx", "val"], @table[@row, "Downside"], @table[@row, "Base"], @table[@row, "Upside"])',
  })
  table.addColumn("notes", {
    role: "descriptor",
    header: "Basis / Source",
  })

  const downEntries = collectScalarDriverEntries(ALL_SCENARIO_DRIVERS.Downside)
  const baseEntries = collectScalarDriverEntries(ALL_SCENARIO_DRIVERS.Base)
  const upEntries = collectScalarDriverEntries(ALL_SCENARIO_DRIVERS.Upside)

  let currentCategory = ""
  let isFirstSection = true

  for (let i = 0; i < baseEntries.length; i++) {
    const downEntry = downEntries[i]
    const baseEntry = baseEntries[i]
    const upEntry = upEntries[i]
    if (!downEntry || !baseEntry || !upEntry) {
      throw new Error(`Missing scenario parameter entry at index ${i}`)
    }
    const { meta } = baseEntry.driver
    if (meta.category !== currentCategory) {
      if (!isFirstSection) {
        table.addRowGutter()
      }
      isFirstSection = false
      currentCategory = meta.category
      table.addSectionHeader(currentCategory)
    }
    const fmt = rowFormatOptions(meta.format, meta.decimals)
    table.addRow(baseEntry.id, {
      ...fmt,
      cells: {
        line_item: meta.label,
        Downside: downEntry.driver.value,
        Base: baseEntry.driver.value,
        Upside: upEntry.driver.value,
        notes: formatDriverBasisSource(meta),
      },
    })
  }
  return table
}

export function buildAssumptionsTables(
  sheet: Sheet,
  kg: CostcoKnowledgeData,
  activeScenario: ScenarioName
): {
  readonly framingTable: Table
  readonly scalarActive: Table
  readonly anchors: Table
  readonly periodActive: Table
  readonly periodScenarios: readonly Table[]
  readonly debtTable: Table
} {
  const activeBundle = ALL_SCENARIO_DRIVERS[activeScenario]

  // Scenario framing overview
  const framingTable = sheet.addTable(
    "ScenarioFraming",
    "Scenario Operating Regimes & Flexed Assumptions",
    {
      subtitle: [
        "Operating and valuation regime summary across Downside, Base, and Upside cases",
        "All financial statements, schedules, and valuation bridges link to the active case",
      ],
      currency: "USD",
    }
  )
  framingTable.addColumn("line_item", {
    role: "descriptor",
    header: "Scenario",
  })
  framingTable.addColumn("case_idx", {
    role: "measure",
    header: "Index",
    format: "integer",
  })
  framingTable.addColumn("growth_regime", {
    role: "descriptor",
    header: "Warehouse & Comp Growth",
  })
  framingTable.addColumn("margin_capital", {
    role: "descriptor",
    header: "Margins & Capital Intensity",
  })
  framingTable.addColumn("valuation_regime", {
    role: "descriptor",
    header: "Discount Rate & Multiples",
  })

  for (let i = 0; i < SCENARIOS.length; i++) {
    const sc = SCENARIOS[i]!
    const f = ALL_SCENARIO_DRIVERS[sc].framingColumns
    framingTable.addRow(sc.toLowerCase(), {
      ...(sc === "Base" ? { style: "bold" as const } : {}),
      cells: {
        line_item: `${sc} case`,
        case_idx: i + 1,
        growth_regime: f.growth,
        margin_capital: f.marginCapital,
        valuation_regime: f.valuation,
      },
    })
  }

  // Scalar assumptions & audited market/opening anchors
  const scalarActive = buildScalarDriverTable(sheet)

  const anchors = sheet.addTable(
    "MarketAnchors",
    "Market, Consensus & Opening Anchors",
    {
      subtitle: [
        "2026-11-13 close, Street consensus & FY21 anchors",
        kg.citations.equityQuotes,
      ],
      currency: "USD",
    }
  )
  anchors.addColumn("line_item", {
    role: "descriptor",
    header: "Audited benchmark",
  })
  anchors.addColumn("val", {
    role: "measure",
    headers: ["Reported", "Value"],
  })
  anchors.addColumn("notes", {
    role: "descriptor",
    header: "Source",
  })

  const qCost = kg.market.quotes.COST
  const cCost = kg.market.consensus.COST
  const cdCost = kg.market.costConsensus
  if (cCost.saFcf27 === null || !Number.isFinite(cCost.saFcf27)) {
    throw new Error(
      "Missing finite COST consensus FY27E Free Cash Flow (saFcf27)"
    )
  }
  const costConsFcf27 = cCost.saFcf27

  anchors.addSectionHeader("Market close and rates (2026-11-13)")
  anchors.addRow("cost_close_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "COST closing price (cum-div.)",
      val: qCost.closePrice,
      notes: "NASDAQ close (2026-11-13)",
    },
  })
  anchors.addRow("cost_sec_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "SEC common shares (M)",
      val: qCost.secSharesMillions,
      notes: "FY26 Form 10-K cover",
    },
  })
  anchors.addRow("cost_dilutive_rsus", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "TSM dilutive RSUs (M)",
      val: {
        value: kg.cost.equityAndShares.dilutiveRsusMillions.FY26,
        note: "FY26 Form 10-K Note 9 TSM incremental dilutive RSUs; excludes 704k vested-undelivered RSUs and ~56k special-dividend anti-dilution gross-up.",
      },
      notes: "FY26 10-K Note 9",
    },
  })
  anchors.addRow("cost_diluted_shares", {
    ...rowFormatOptions("number", 3),
    style: "bold",
    cells: {
      line_item: "Diluted shares (TSM, M)",
      val: {
        expr: '@table["cost_sec_shares", "val"] + @table["cost_dilutive_rsus", "val"]',
      },
      notes: "Valuation per-share base",
    },
  })
  anchors.addRow("lt_debt_fair_value", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY26 LT debt fair value ($M)",
      val: {
        value: kg.cost.debtLeases.fairValueOfLongTermDebtFy26,
        note: "Disclosed fair value of long-term debt incl. current portion vs. $6,162M carrying value (-$473M mark-to-market).",
      },
      notes: "FY26 10-K Note 4",
    },
  })
  anchors.addRow("cc_receivables_in_cash", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Unsettled card rec. in cash ($M)",
      val: {
        value: kg.cost.balanceSheet.ccReceivablesInCashFy26,
        note: "Non-interest-bearing unsettled credit/debit card receivables included in FY26 cash & equivalents.",
      },
      notes: "FY26 10-K Note 1",
    },
  })
  anchors.addRow("cost_beta_5y", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "COST 5Y monthly beta",
      val: qCost.beta5yMonthly,
      notes: "5Y monthly vs. S&P 500",
    },
  })
  anchors.addRow("cost_beta_2y", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "COST 2Y weekly beta",
      val: qCost.beta2yWeekly,
      notes: "2Y weekly vs. S&P 500",
    },
  })
  anchors.addRow("oct2026_qtr_dps", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Quarterly dividend declared",
      val: kg.cost.qoe.oct2026QuarterlyDivPs,
      notes: "Oct 14, 2026 release",
    },
  })
  anchors.addRow("cost_reg_dps_annualized", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Annualized regular DPS",
      val: { expr: '@table["oct2026_qtr_dps", "val"] * 4' },
      notes: "Quarterly dividend x 4",
    },
  })
  anchors.addRow("rf_par_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "U.S. 10Y Treasury par yield",
      val: kg.market.rfPar10y,
      notes: "U.S. Treasury H.15",
    },
  })
  anchors.addRow("rf_real_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "U.S. 10Y real TIPS yield",
      val: kg.market.realTips10y,
      notes: "U.S. Treasury TIPS",
    },
  })
  anchors.addRow("t10yie_breakeven", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "10Y breakeven inflation",
      val: kg.market.t10yieBreakeven,
      notes: "FRED T10YIE",
    },
  })
  anchors.addRow("dff_fed_funds", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Effective federal funds rate",
      val: {
        value: kg.market.dffFedFunds,
        note: "Published with one-day Federal Reserve H.15 lag (as of 2026-11-12).",
      },
      notes: "FRED H.15 (2026-11-12)",
    },
  })
  anchors.addRow("oas_aa", {
    ...rowFormatOptions("basis_points"),
    cells: {
      line_item: "ICE BofA AA corporate OAS",
      val: kg.market.oasAa,
      notes: "S&P / Fitch AA benchmark",
    },
  })

  anchors.addRowGutter()
  anchors.addSectionHeader("Street consensus and targets (COST)")
  anchors.addRow("cons_rev_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E revenue ($M)",
      val: cCost.rev27,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_rev_low_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E rev. low ($M)",
      val: cdCost.revLow27,
      notes: "FY27E Street low",
    },
  })
  anchors.addRow("cons_rev_high_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E rev. high ($M)",
      val: cdCost.revHigh27,
      notes: "FY27E Street high",
    },
  })
  anchors.addRow("cons_ebitda_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E EBITDA ($M)",
      val: cCost.ebitda27,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_ebit_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E EBIT ($M)",
      val: cCost.ebit27,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_eps_fy27", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY27E EPS ($/sh)",
      val: cCost.epsHeadline27,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_eps_low_fy27", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY27E EPS low",
      val: cdCost.epsLow27,
      notes: "FY27E Street low",
    },
  })
  anchors.addRow("cons_eps_high_fy27", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY27E EPS high",
      val: cdCost.epsHigh27,
      notes: "FY27E Street high",
    },
  })
  anchors.addRow("cons_dps_fy27", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY27E reg. DPS",
      val: cdCost.dps27,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_fcf_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E FCF ($M)",
      val: costConsFcf27,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_analyst_count_fy27", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "FY27E covering analysts",
      val: cCost.analystCount27,
      notes: "FY27E estimate count",
    },
  })
  anchors.addRow("cons_rev_fy28", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY28E revenue ($M)",
      val: cCost.rev28,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_ebitda_fy28", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY28E EBITDA ($M)",
      val: cCost.ebitda28,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_ebit_fy28", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY28E EBIT ($M)",
      val: cCost.ebit28,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_eps_fy28", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY28E EPS ($/sh)",
      val: cCost.epsHeadline28,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_dps_fy28", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY28E reg. DPS",
      val: cdCost.dps28,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_rev_fy29", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY29E revenue ($M)",
      val: cdCost.rev29,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_ebitda_fy29", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY29E EBITDA ($M)",
      val: cdCost.ebitda29,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_ebit_fy29", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY29E EBIT ($M)",
      val: cdCost.ebit29,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_eps_fy29", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY29E EPS ($/sh)",
      val: cdCost.epsHeadline29,
      notes: "Street consensus",
    },
  })
  anchors.addRow("cons_pt_low", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Street price target — low",
      val: cCost.ptLow,
      notes: "Analyst target range",
    },
  })
  anchors.addRow("cons_pt_avg", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Street price target — mean",
      val: cCost.ptAverage,
      notes: "Analyst mean target",
    },
  })
  anchors.addRow("cons_pt_median", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Street price target — median",
      val: cCost.ptMedian,
      notes: "Analyst median target",
    },
  })
  anchors.addRow("cons_pt_high", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Street price target — high",
      val: cCost.ptHigh,
      notes: "Analyst target range",
    },
  })
  anchors.addRow("cons_ratings_strong_buy", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Analyst ratings — strong buy",
      val: cdCost.ratingsStrongBuy,
      notes: "Street rating breakdown",
    },
  })
  anchors.addRow("cons_ratings_buy", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Analyst ratings — buy",
      val: cdCost.ratingsBuy,
      notes: "Street rating breakdown",
    },
  })
  anchors.addRow("cons_ratings_total", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Analyst ratings — total",
      val: cdCost.ratingsTotal,
      notes: "Total rated analysts",
    },
  })

  anchors.addRowGutter()
  anchors.addSectionHeader("FY21 opening & maturity anchors")
  anchors.addRow("fy21_cash", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 ending cash ($M)",
      val: kg.cost.fy21.cashAndEquivalents,
      notes: "FY22 Form 10-K BS",
    },
  })
  anchors.addRow("fy21_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 ending STI ($M)",
      val: kg.cost.fy21.shortTermInvestments,
      notes: "FY22 Form 10-K BS",
    },
  })
  anchors.addRow("fy21_cash_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 ending cash & STI ($M)",
      val: { expr: '@table["fy21_cash", "val"] + @table["fy21_sti", "val"]' },
      notes: "Opening liquidity base",
    },
  })
  anchors.addRow("fy21_ppe_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 ending net PP&E ($M)",
      val: kg.cost.fy21.ppeNet,
      notes: "FY22 Form 10-K BS",
    },
  })
  anchors.addRow("fy21_warehouses_total", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "FY21 ending warehouses",
      val: kg.cost.fy21.warehousesTotal,
      notes: "FY22 Form 10-K Item 1",
    },
  })
  anchors.addRow("fy21_paid_members", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "FY21 paid members (M)",
      val: kg.cost.fy21.paidMembersMillions,
      notes: "FY22 Form 10-K Item 7",
    },
  })
  anchors.addRow("fy21_ending_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "FY21 ending shares (M)",
      val: kg.cost.fy21.endingSharesMillions,
      notes: "FY22 Form 10-K BS",
    },
  })
  anchors.addRow("maturities_thereafter", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY26 maturities thereafter ($M)",
      val: {
        value: kg.cost.debtLeases.maturitiesThereafter,
        note: "FY26 Form 10-K Note 4 contractual maturities after FY31 ($1,000M Apr 2032 notes + $878M Japan notes incl. $500M maturing FY41).",
      },
      notes: "FY26 10-K Note 4",
    },
  })
  anchors.addRow("fy24_special_div_total", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY24 special dividend ($M)",
      val: kg.cost.qoe.fy24SpecialDivTotal,
      notes: "FY24 10-K Note 8 / CF",
    },
  })
  anchors.addRow("fy24_esop_tax_benefit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY24 ESOP spec.-div. tax ($M)",
      val: {
        value: kg.cost.qoe.fy24SpecialDivEsopTaxBenefit,
        note: "FY24 discrete IRC Sec. 404(k) ESOP tax benefit on $15/sh special dividend (1.412% of payout).",
      },
      notes: "FY24 10-K Note 8",
    },
  })

  // Active & scenario time-series forecast assumptions
  const periodActive = buildPeriodDriverTable(
    sheet,
    "PeriodAssumptionsActive",
    "Active Case — Multi-Year Operating Assumptions (FY27E–FY36E)",
    [
      "Active case forecast trajectories selected from Downside, Base, and Upside schedules below ($M except counts and rates)",
      "Recalculates dynamically from the three scenario schedules below based on active case selection",
    ],
    activeBundle,
    "active"
  )

  const periodScenarioIds: Readonly<Record<ScenarioName, string>> = {
    Downside: "PeriodAssumptionsDownside",
    Base: "PeriodAssumptionsBase",
    Upside: "PeriodAssumptionsUpside",
  }
  const periodScenarios: Table[] = []
  for (const sc of SCENARIOS) {
    const b = ALL_SCENARIO_DRIVERS[sc]
    periodScenarios.push(
      buildPeriodDriverTable(
        sheet,
        periodScenarioIds[sc],
        `${sc} Case — Multi-Year Operating Assumptions (FY27E–FY36E)`,
        [
          b.framing,
          sc === "Base"
            ? "Grounded baseline anchored to FY22–FY26 historicals and FY27E management guidance"
            : `Scenario flex schedule vs. Base case (notes flag flexed lines only)`,
        ],
        b,
        sc === "Base" ? "base" : "diff"
      )
    )
  }

  // Debt tranches registry
  const tranches = buildDebtTranches(kg)
  const debtTable = sheet.addTable(
    "DebtTranches",
    "Senior Notes & Long-Term Debt Maturity Waterfall ($M)",
    {
      subtitle: [
        "Contractual senior note and Japan term debt principal maturities ($M)",
        `Source: ${kg.citations.debtLeases}`,
      ],
      currency: "USD",
    }
  )
  debtTable.addColumn("line_item", {
    role: "descriptor",
    header: "Debt instrument",
  })
  debtTable.addColumn("coupon_rate", {
    role: "measure",
    headers: ["Coupon", "Rate"],
  })
  debtTable.addColumn("maturity_date", {
    role: "measure",
    headers: ["Maturity", "Date"],
  })
  debtTable.addColumn("fy26_principal", {
    role: "measure",
    headers: ["FY26", "Principal"],
  })
  for (const p of FORECAST_PERIODS) {
    debtTable.addColumn(p, {
      role: "measure",
      group: "Scheduled Principal Repayments ($M)",
      header: PERIOD_METADATA[p].header,
    })
  }
  debtTable.addColumn("notes", {
    role: "descriptor",
    header: "Notes",
  })

  for (const tr of tranches) {
    const cells: Record<string, CellInputValue> = {
      line_item: tr.label,
      coupon_rate:
        tr.couponCell.kind === "expr"
          ? { expr: tr.couponCell.expr, format: "percentage", decimals: 3 }
          : { value: tr.couponCell.rate, format: "percentage", decimals: 3 },
      maturity_date: { value: tr.maturityDate, format: "text" },
      fy26_principal: {
        value: tr.fy26Principal,
        format: "currency",
        decimals: 0,
      },
      notes: tr.note,
    }
    for (const p of FORECAST_PERIODS) {
      const rep = tr.repayments[p]
      cells[p] =
        typeof rep === "number"
          ? { value: rep, format: "currency", decimals: 0 }
          : { expr: rep.expr, format: "currency", decimals: 0 }
    }
    debtTable.addRow(tr.id, { cells })
  }
  debtTable.addRow("total_tranches", {
    style: "total",
    cells: {
      line_item: "Total scheduled principal",
      coupon_rate: {
        expr: 'SUMPRODUCT(DebtTranches["tranche_may27".."tranche_japan", "coupon_rate"], DebtTranches["tranche_may27".."tranche_japan", "fy26_principal"]) / SUM(DebtTranches["tranche_may27".."tranche_japan", "fy26_principal"])',
        format: "percentage",
        decimals: 3,
      },
      maturity_date: { value: "FY27E–FY36E", format: "text" },
      fy26_principal: {
        expr: 'SUM(DebtTranches["tranche_may27".."tranche_japan", "fy26_principal"])',
        format: "currency",
        decimals: 0,
      },
      ...Object.fromEntries(
        FORECAST_PERIODS.map((p) => [
          p,
          {
            expr: `SUM(DebtTranches["tranche_may27".."tranche_japan", "${p}"])`,
            format: "currency",
            decimals: 0,
          },
        ])
      ),
      notes: "Weighted coupon & maturities",
    },
  })

  return {
    framingTable,
    scalarActive,
    anchors,
    periodActive,
    periodScenarios,
    debtTable,
  }
}
