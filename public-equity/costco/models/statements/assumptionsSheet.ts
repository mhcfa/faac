import type { CellInputValue, Sheet, Table } from "f8-engine"
import {
  ALL_SCENARIO_DRIVERS,
  formatDriverNote,
  type CapitalStructureDrivers,
  type Driver,
  type DriverMeta,
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
    { id: "sga_pct_net_sales", driver: op.sgaPctNetSales },
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
    { id: "fin_lease_interest_rate", driver: cap.finLeaseInterestRate },
    { id: "op_lease_liab_to_rou_ratio", driver: cap.opLeaseLiabToRouRatio },
    { id: "op_lease_current_share", driver: cap.opLeaseCurrentShare },
    { id: "fin_lease_current_share", driver: cap.finLeaseCurrentShare },
    { id: "equity_risk_premium", driver: val.equityRiskPremium },
    { id: "terminal_growth_rate", driver: val.terminalGrowthRate },
    { id: "exit_ev_to_ebitda", driver: val.exitEvToEbitda },
    {
      id: "calibrated_comps_ev_to_ebitda",
      driver: val.calibratedCompsEvEbitda,
    },
    { id: "mid_year_convention_flag", driver: val.midYearConventionFlag },
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

function buildPeriodDriverTable(
  sheet: Sheet,
  id: string,
  title: string,
  subtitle: string | readonly string[],
  bundle: ScenarioDriverBundle,
  isActiveSelector: boolean,
  belowTarget?: Table
): Table {
  const table = sheet.addTable(id, title, {
    subtitle,
    currency: "USD",
    ...(belowTarget ? { below: belowTarget } : {}),
  })
  table.addColumn("line_item", {
    role: "descriptor",
    header: "Forecast Driver",
  })
  for (const p of FORECAST_PERIODS) {
    table.addColumn(p, {
      role: "measure",
      group: "Forecast Horizon (FY27E–FY36E)",
      header: PERIOD_METADATA[p].header,
    })
  }

  let currentCategory = ""
  for (const entry of collectPeriodDriverEntries(bundle)) {
    const { meta, value } = entry.driver
    if (meta.category !== currentCategory) {
      currentCategory = meta.category
      table.addSectionHeader(currentCategory)
    }
    const fmt = rowFormatOptions(meta.format, meta.decimals)
    if (isActiveSelector) {
      table.addRow(entry.id, {
        ...fmt,
        cells: {
          line_item: {
            value: meta.label,
            note: "Dynamically selects the active scenario column (Base, Bull, or Bear) from the Executive Summary scenario toggle.",
          },
        },
        expr: 'CHOOSE(ScenarioControl["active_idx", "val"], PeriodAssumptionsBase[@row, @col], PeriodAssumptionsBull[@row, @col], PeriodAssumptionsBear[@row, @col])',
      })
    } else {
      const cells: Record<
        string,
        number | { readonly value: string; readonly note?: string }
      > = {
        line_item: { value: meta.label, note: formatDriverNote(meta) },
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

function formatCombinedScalarNote(
  baseMeta: DriverMeta,
  bullMeta: DriverMeta,
  bearMeta: DriverMeta
): string {
  const baseNote = formatDriverNote(baseMeta)
  if (
    bullMeta.rationale === baseMeta.rationale &&
    bearMeta.rationale === baseMeta.rationale
  ) {
    return baseNote
  }
  return `${baseNote} | Bull: ${bullMeta.rationale} | Bear: ${bearMeta.rationale}`
}

function buildScalarDriverTable(sheet: Sheet, rightOfTarget: Table): Table {
  const table = sheet.addTable(
    "ScalarAssumptionsActive",
    "Scalar Drivers & Valuation Inputs (Active & Scenario Cases)",
    {
      subtitle: [
        "Active Case column switches dynamically across Base, Bull & Bear scalar inputs ($M / % / Days / x)",
        "Driver basis, analytical rationale, and external provenance are documented in row descriptor notes",
      ],
      currency: "USD",
      rightOf: rightOfTarget,
    }
  )
  table.addColumn("line_item", {
    role: "descriptor",
    header: "Scalar Driver / Parameter",
  })
  table.addColumn("val", {
    role: "measure",
    headers: ["Active", "Case"],
    shade: "muted",
    expr: 'CHOOSE(ScenarioControl["active_idx", "val"], @table[@row, "Base"], @table[@row, "Bull"], @table[@row, "Bear"])',
  })
  for (const sc of SCENARIOS) {
    table.addColumn(sc, {
      role: "measure",
      headers: [sc, "Input"],
    })
  }

  const baseEntries = collectScalarDriverEntries(ALL_SCENARIO_DRIVERS.Base)
  const bullEntries = collectScalarDriverEntries(ALL_SCENARIO_DRIVERS.Bull)
  const bearEntries = collectScalarDriverEntries(ALL_SCENARIO_DRIVERS.Bear)

  let currentCategory = ""
  for (let i = 0; i < baseEntries.length; i++) {
    const baseEntry = baseEntries[i]
    const bullEntry = bullEntries[i]
    const bearEntry = bearEntries[i]
    if (!baseEntry || !bullEntry || !bearEntry) {
      throw new Error(`Missing scalar driver entry at index ${i}`)
    }
    const { meta } = baseEntry.driver
    if (meta.category !== currentCategory) {
      currentCategory = meta.category
      table.addSectionHeader(currentCategory)
    }
    const fmt = rowFormatOptions(meta.format, meta.decimals)
    table.addRow(baseEntry.id, {
      ...fmt,
      cells: {
        line_item: {
          value: meta.label,
          note: formatCombinedScalarNote(
            meta,
            bullEntry.driver.meta,
            bearEntry.driver.meta
          ),
        },
        Base: baseEntry.driver.value,
        Bull: bullEntry.driver.value,
        Bear: bearEntry.driver.value,
      },
    })
  }
  return table
}

export function buildAssumptionsSheet(
  sheet: Sheet,
  kg: CostcoKnowledgeData,
  activeScenario: ScenarioName
): void {
  const activeBundle = ALL_SCENARIO_DRIVERS[activeScenario]

  // 1. Active Period Drivers (top-left)
  const periodActive = buildPeriodDriverTable(
    sheet,
    "PeriodAssumptionsActive",
    "Active Period Drivers (Live Scenario Switch)",
    [
      "Dynamically selects active scenario vectors (Base, Bull, or Bear) from Executive Summary ScenarioControl switch ($M except counts/rates)",
      ...activeBundle.thesis.split("; "),
    ],
    activeBundle,
    true
  )

  // 2. Scenario Period Driver Tables stacked below
  let prevPeriod: Table = periodActive
  const periodScenarioIds: Readonly<Record<ScenarioName, string>> = {
    Base: "PeriodAssumptionsBase",
    Bull: "PeriodAssumptionsBull",
    Bear: "PeriodAssumptionsBear",
  }
  for (const sc of SCENARIOS) {
    const b = ALL_SCENARIO_DRIVERS[sc]
    prevPeriod = buildPeriodDriverTable(
      sheet,
      periodScenarioIds[sc],
      `${sc} Case — Period Drivers (FY27E–FY36E)`,
      b.thesis.split("; "),
      b,
      false,
      prevPeriod
    )
  }

  // 3. Combined Scalar Drivers (right of PeriodAssumptionsActive)
  const scalarActive = buildScalarDriverTable(sheet, periodActive)

  // 4. Market & Historical Boundary Anchors (below ScalarAssumptionsActive)
  const anchors = sheet.addTable(
    "MarketAnchors",
    "Audited Market, Macro & Prior-Period Boundary Anchors",
    {
      subtitle: [
        "Audited 2026-11-13 market close, FY27E consensus & FY21 opening anchors",
        kg.citations.equityQuotes,
        kg.citations.treasuryPar,
        kg.citations.treasuryReal,
      ],
      currency: "USD",
      below: scalarActive,
    }
  )
  anchors.addColumn("line_item", {
    role: "descriptor",
    header: "Audited Anchor",
  })
  anchors.addColumn("val", {
    role: "measure",
    headers: ["Audited", "Value"],
  })

  const qCost = kg.market.quotes.COST
  const cCost = kg.market.consensus.COST
  if (cCost.saFcf27 === null || !Number.isFinite(cCost.saFcf27)) {
    throw new Error(
      "Missing finite COST consensus FY27E Free Cash Flow (saFcf27) in KgRegistry"
    )
  }
  const costConsFcf27 = cCost.saFcf27
  anchors.addSectionHeader("Market & Macro Close (2026-11-13)")
  anchors.addRow("cost_close_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: {
        value: "COST Closing Share Price (Cum-$30 Special Div)",
        note: "2026-11-13 NASDAQ close (cum Nov 24 ex-dividend).",
      },
      val: qCost.closePrice,
    },
  })
  anchors.addRow("cost_sec_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: {
        value: "SEC Common Shares Outstanding (M)",
        note: "FY26 Form 10-K cover shares (443,129,349).",
      },
      val: qCost.secSharesMillions,
    },
  })
  anchors.addRow("cost_beta_5y", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: {
        value: "COST 5-Year Monthly Equity Beta",
        note: "5Y monthly OLS beta vs. S&P 500 as of 2026-11-13.",
      },
      val: qCost.beta5yMonthly,
    },
  })
  anchors.addRow("oct2026_qtr_dps", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: {
        value: "Oct 2026 Regular Quarterly Dividend Declared ($/sh)",
        note: "Oct 14, 2026 quarterly dividend declaration ($1.47/sh).",
      },
      val: kg.cost.qoe.oct2026QuarterlyDivPs,
    },
  })
  anchors.addRow("cost_reg_dps_annualized", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: {
        value: "Annualized Regular Quarterly DPS ($1.47 x 4)",
        note: "Live formula = Oct 2026 quarterly dividend ($1.47/sh) x 4 quarters.",
      },
      val: { expr: '@table["oct2026_qtr_dps", "val"] * 4' },
    },
  })
  anchors.addRow("rf_par_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: {
        value: "U.S. 10-Year Treasury Par Yield (2026-11-13)",
        note: "Nominal risk-free benchmark per U.S. Treasury H.15 par yield curve (2026-11-13).",
      },
      val: kg.market.rfPar10y,
    },
  })
  anchors.addRow("rf_real_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: {
        value: "U.S. 10-Year Real TIPS Yield (2026-11-13)",
        note: "Real risk-free curve check per U.S. Treasury TIPS yield curve (2026-11-13).",
      },
      val: kg.market.realTips10y,
    },
  })
  anchors.addRow("t10yie_breakeven", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: {
        value: "10-Year Breakeven Inflation (T10YIE, 2026-11-13)",
        note: "Bounds nominal GDP terminal growth ceiling per FRED T10YIE (2026-11-13).",
      },
      val: kg.market.t10yieBreakeven,
    },
  })
  anchors.addRow("dff_fed_funds", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: {
        value: "Effective Federal Funds Rate (2026-11-12)",
        note: "FRED H.15 T-1 publication lag relative to 2026-11-13 market close.",
      },
      val: kg.market.dffFedFunds,
    },
  })
  anchors.addRow("oas_aa", {
    ...rowFormatOptions("basis_points"),
    cells: {
      line_item: {
        value: "ICE BofA AA U.S. Corporate OAS (2026-11-13)",
        note: "Matches S&P AA / Fitch AA credit rating per ICE BofA AA Corporate Index OAS (2026-11-13).",
      },
      val: kg.market.oasAa,
    },
  })
  anchors.addSectionHeader("Street Consensus Benchmarks (FY27E)")
  anchors.addRow("cons_rev_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E Total Revenue ($M)",
      val: cCost.rev27,
    },
  })
  anchors.addRow("cons_ebitda_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E EBITDA ($M)",
      val: cCost.ebitda27,
    },
  })
  anchors.addRow("cons_ebit_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E EBIT ($M)",
      val: cCost.ebit27,
    },
  })
  anchors.addRow("cons_eps_fy27", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Consensus FY27E Headline EPS ($/sh)",
      val: cCost.epsHeadline27,
    },
  })
  anchors.addRow("cons_fcf_fy27", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Consensus FY27E Free Cash Flow ($M)",
      val: costConsFcf27,
    },
  })
  anchors.addRow("cons_pt_avg", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Wall Street Mean Price Target ($/sh)",
      val: cCost.ptAverage,
    },
  })
  anchors.addSectionHeader("FY21 Opening Balance & Debt Maturity Anchors")
  anchors.addRow("fy21_cash", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 Ending Cash & Cash Equivalents ($M)",
      val: kg.cost.fy21.cashAndEquivalents,
    },
  })
  anchors.addRow("fy21_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 Ending Short-Term Investments ($M)",
      val: kg.cost.fy21.shortTermInvestments,
    },
  })
  anchors.addRow("fy21_cash_sti", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 Ending Cash & STI ($M)",
      val: { expr: '@table["fy21_cash", "val"] + @table["fy21_sti", "val"]' },
    },
  })
  anchors.addRow("fy21_ppe_net", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY21 Ending Net PP&E ($M)",
      val: kg.cost.fy21.ppeNet,
    },
  })
  anchors.addRow("fy21_warehouses_total", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "FY21 Ending Total Warehouses",
      val: kg.cost.fy21.warehousesTotal,
    },
  })
  anchors.addRow("fy21_paid_members", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "FY21 Ending Paid Members (M)",
      val: kg.cost.fy21.paidMembersMillions,
    },
  })
  anchors.addRow("fy21_ending_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "FY21 Ending Common Shares (M)",
      val: kg.cost.fy21.endingSharesMillions,
    },
  })
  anchors.addRow("maturities_thereafter", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "FY26 Debt Maturities 'Thereafter' (FY32E+, $M)",
        note: "FY26 Form 10-K Note 4 (Debt) contractual maturities after FY31 ($1,878M = $1,000M Apr 2032 notes + $878M Japan notes).",
      },
      val: kg.cost.debtLeases.maturitiesThereafter,
    },
  })

  // 5. Debt Tranches Registry (below MarketAnchors)
  const tranches = buildDebtTranches(kg)
  const debtTable = sheet.addTable(
    "DebtTranches",
    "Senior Notes & Long-Term Debt Maturity Waterfall ($M)",
    {
      subtitle: [
        "Contractual senior notes & Japan term debt principal maturities per FY26 Form 10-K Note 4 ($M)",
        `Source: ${kg.citations.debtLeases}`,
      ],
      currency: "USD",
      below: anchors,
    }
  )
  debtTable.addColumn("line_item", {
    role: "descriptor",
    header: "Debt Instrument",
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
  for (const tr of tranches) {
    const cells: Record<string, CellInputValue> = {
      line_item: { value: tr.label, note: tr.note },
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
      line_item: "Total Scheduled Principal / Maturities",
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
    },
  })
}
