import fs from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { compileKgFromDir } from "@faac/audited-reader"
import type { CompiledModel } from "f8-engine"
import {
  ALL_PERIODS,
  ALL_SCENARIO_DRIVERS,
  FORECAST_PERIODS,
  HISTORICAL_PERIODS,
  KG_DIVISORS,
  PERIOD_METADATA,
  SCENARIOS,
  buildCostcoWorkbook,
  compileCostcoModel,
  type ScenarioName,
} from "../models/index.ts"

function collectModelFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectModelFiles(full))
    } else if (entry.name.endsWith(".ts")) {
      out.push(full)
    }
  }
  return out
}

const FIFTEEN_YEAR_TABLES = [
  "OperatingSchedule",
  "IncomeStatement",
  "BalanceSheet",
  "CashFlowStatement",
  "WorkingCapitalPPE",
  "DebtLeasesSchedule",
  "ShareEquitySchedule",
  "InvestedCapitalROIC",
] as const

describe("Costco (COST) 3-Statement Financial Model & Valuation Suite", () => {
  const compiledByScenario = new Map<ScenarioName, CompiledModel>()

  const getCompiled = (sc: ScenarioName): CompiledModel => {
    const model = compiledByScenario.get(sc)
    if (!model) {
      throw new Error(`Compiled model not initialized for ${sc}`)
    }
    return model
  }

  beforeAll(() => {
    for (const sc of SCENARIOS) {
      compiledByScenario.set(sc, compileCostcoModel(sc))
    }
  }, 30_000)

  afterAll(() => {
    for (const model of compiledByScenario.values()) {
      model[Symbol.dispose]()
    }
    compiledByScenario.clear()
  })

  it("enforces data boundary, ties FY22–FY26 historicals to KgRegistry (< 1e-4), and preserves 3-statement & IC identities (C1)", () => {
    const modelFiles = collectModelFiles("models")
    expect(modelFiles.length).toBeGreaterThanOrEqual(15)
    for (const file of modelFiles) {
      const src = fs.readFileSync(file, "utf8")
      expect(src).not.toMatch(/data\/raw\//)
      expect(src).not.toMatch(/data\/extracted\//)
    }

    using kg = compileKgFromDir("data/audited")
    const baseCompiled = getCompiled("Base")
    const costOpts = { entity: "COST", divisors: KG_DIVISORS } as const

    for (const p of HISTORICAL_PERIODS) {
      const pk = PERIOD_METADATA[p].kgPeriodKey
      expect(baseCompiled.num("IncomeStatement", "net_sales", p)).toBeCloseTo(
        kg.val("cost_income_statement", "net_sales", pk, costOpts)!,
        4
      )
      expect(
        baseCompiled.num("IncomeStatement", "membership_fees", p)
      ).toBeCloseTo(
        kg.val("cost_income_statement", "membership_fees", pk, costOpts)!,
        4
      )
      expect(
        baseCompiled.num("IncomeStatement", "total_revenue", p)
      ).toBeCloseTo(
        kg.val("cost_income_statement", "total_revenue", pk, costOpts)!,
        4
      )
      expect(
        baseCompiled.num("IncomeStatement", "operating_income", p)
      ).toBeCloseTo(
        kg.val("cost_income_statement", "operating_income", pk, costOpts)!,
        4
      )
      expect(
        baseCompiled.num("IncomeStatement", "net_income_attr_costco", p)
      ).toBeCloseTo(
        kg.val(
          "cost_income_statement",
          "net_income_attr_costco",
          pk,
          costOpts
        )!,
        4
      )
      expect(
        baseCompiled.num("BalanceSheet", "cash_and_equivalents", p)
      ).toBeCloseTo(
        kg.val("cost_balance_sheet", "cash_and_equivalents", pk, costOpts)!,
        4
      )
      expect(
        baseCompiled.num("BalanceSheet", "short_term_investments", p)
      ).toBeCloseTo(
        kg.val("cost_balance_sheet", "short_term_investments", pk, costOpts)!,
        4
      )
      expect(baseCompiled.num("BalanceSheet", "total_assets", p)).toBeCloseTo(
        kg.val("cost_balance_sheet", "total_assets", pk, costOpts)!,
        4
      )
      expect(baseCompiled.num("BalanceSheet", "total_equity", p)).toBeCloseTo(
        kg.val("cost_balance_sheet", "total_equity", pk, costOpts)!,
        4
      )
      expect(baseCompiled.num("CashFlowStatement", "cfo", p)).toBeCloseTo(
        kg.val("cost_cash_flow", "cfo", pk, costOpts)!,
        4
      )
      expect(baseCompiled.num("CashFlowStatement", "capex", p)).toBeCloseTo(
        kg.val("cost_cash_flow", "capex", pk, costOpts)!,
        4
      )
    }

    for (const sc of SCENARIOS) {
      const compiled = getCompiled(sc)
      for (const p of ALL_PERIODS) {
        expect(
          Math.abs(compiled.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-4)
        expect(
          Math.abs(compiled.num("CashFlowStatement", "cash_tie_out_check", p))
        ).toBeLessThan(1e-4)
        expect(
          Math.abs(compiled.num("InvestedCapitalROIC", "ic_tie_out_check", p))
        ).toBeLessThan(1e-4)

        const debtCarry = compiled.num(
          "DebtLeasesSchedule",
          "total_lt_debt_carrying",
          p
        )
        const debtCur = compiled.num(
          "DebtLeasesSchedule",
          "current_portion_lt_debt_total",
          p
        )
        const debtLt = compiled.num(
          "DebtLeasesSchedule",
          "long_term_debt_excl_current",
          p
        )
        expect(Math.abs(debtCarry - (debtCur + debtLt))).toBeLessThan(1e-4)

        const begSh = compiled.num("ShareEquitySchedule", "beg_shares", p)
        const rsuSh = compiled.num(
          "ShareEquitySchedule",
          "rsu_shares_delivered",
          p
        )
        const repSh = compiled.num(
          "ShareEquitySchedule",
          "shares_repurchased",
          p
        )
        const endSh = compiled.num("ShareEquitySchedule", "ending_shares", p)
        expect(Math.abs(endSh - (begSh + rsuSh + repSh))).toBeLessThan(1e-6)
      }

      // FY27E $13,294M special dividend, $2,250M maturities, zero revolver, FY28E interest reset
      const specialDiv = compiled.num(
        "ShareEquitySchedule",
        "special_dividend_paid",
        "FY27E"
      )
      expect(specialDiv).toBeCloseTo(30 * 443.129349, 2)
      expect(Math.round(specialDiv)).toBe(13294)
      expect(
        compiled.num(
          "DebtLeasesSchedule",
          "scheduled_lt_debt_repayments",
          "FY27E"
        )
      ).toBeCloseTo(2250, 4)
      expect(compiled.num("DebtLeasesSchedule", "tranche_may27", "FY27E")).toBe(
        0
      )
      expect(compiled.num("DebtLeasesSchedule", "tranche_jun27", "FY27E")).toBe(
        0
      )
      expect(compiled.num("DebtLeasesSchedule", "revolver_draw", "FY27E")).toBe(
        0
      )
      expect(compiled.num("DebtLeasesSchedule", "revolver_end", "FY27E")).toBe(
        0
      )
      expect(
        compiled.num("BalanceSheet", "cash_and_equivalents", "FY27E")
      ).toBeGreaterThan(4000)

      // SUMPRODUCT tranche interest formula check
      const intCell = compiled.inspectCell(
        "DebtLeasesSchedule",
        "senior_notes_interest",
        "FY27E"
      )
      expect(intCell.isFormula).toBe(true)
      expect(intCell.excelFormula).toContain("SUMPRODUCT")

      const intInc26 = compiled.num(
        "IncomeStatement",
        "interest_income",
        "FY26"
      )
      const intInc27 = compiled.num(
        "IncomeStatement",
        "interest_income",
        "FY27E"
      )
      const intInc28 = compiled.num(
        "IncomeStatement",
        "interest_income",
        "FY28E"
      )
      expect(intInc27).toBeLessThan(intInc26)
      expect(intInc28).toBeLessThan(intInc27)
      expect(intInc28).toBeLessThan(intInc26 * 0.65)

      // [E1] Ex-operating-lease IC symmetry across all 15 periods
      const roicTable = compiled.table("InvestedCapitalROIC")
      expect(roicTable.rows).not.toContain("operating_lease_liabilities")
      for (const p of ALL_PERIODS) {
        const rou = compiled.num(
          "BalanceSheet",
          "operating_lease_rou_assets",
          p
        )
        const opLiab = compiled.num(
          "DebtLeasesSchedule",
          "total_op_lease_liab",
          p
        )
        expect(
          compiled.num("InvestedCapitalROIC", "net_op_lease_assets", p)
        ).toBeCloseTo(rou - opLiab, 4)
      }

      // [E4] Finance-lease principal payments are cash outflows across all forecast periods
      for (const p of FORECAST_PERIODS) {
        const finLeaseCff = compiled.num(
          "CashFlowStatement",
          "financing_lease_and_other",
          p
        )
        const finLeasePrin = compiled.num(
          "DebtLeasesSchedule",
          "fin_lease_principal_repayments",
          p
        )
        expect(finLeaseCff).toBeLessThan(0)
        expect(finLeaseCff).toBeCloseTo(-finLeasePrin, 4)
      }

      // [O1]/[O2]/[O4]/[E5] 53-week calendar, Japan 2041 notes, pro-rated interest, card rec. exclusion & ESOP shield
      expect(compiled.num("OperatingSchedule", "fiscal_days", "FY27E")).toBe(
        364
      )
      expect(compiled.num("OperatingSchedule", "fiscal_days", "FY28E")).toBe(
        371
      )
      expect(compiled.num("OperatingSchedule", "fiscal_days", "FY29E")).toBe(
        364
      )
      expect(compiled.num("OperatingSchedule", "fiscal_days", "FY34E")).toBe(
        371
      )
      expect(
        compiled.num("DebtLeasesSchedule", "tranche_japan", "FY36E")
      ).toBeCloseTo(500, 4)
      expect(
        compiled.num("DebtLeasesSchedule", "total_interest_expense", "FY27E")
      ).toBeLessThan(
        compiled.num("DebtLeasesSchedule", "total_interest_expense", "FY26")
      )
      const begCash27 = compiled.num(
        "DebtLeasesSchedule",
        "beg_cash_and_sti",
        "FY27E"
      )
      const ccRec = compiled.num(
        "MarketAnchors",
        "cc_receivables_in_cash",
        "val"
      )
      const effCash27 = compiled.num(
        "DebtLeasesSchedule",
        "eff_interest_bearing_cash",
        "FY27E"
      )
      expect(ccRec).toBe(2842)
      expect(effCash27).toBeLessThan(begCash27 - ccRec)

      // ESOP special-dividend tax benefit lowers GAAP tax only (NOPAT/FCFF untouched)
      expect(
        compiled.num("IncomeStatement", "esop_special_div_tax_benefit", "FY24")
      ).toBe(94)
      const fy27Esop = compiled.num(
        "IncomeStatement",
        "esop_special_div_tax_benefit",
        "FY27E"
      )
      expect(fy27Esop).toBeCloseTo((94 / 6655) * specialDiv, 2)
      const fy27Ebit = compiled.num(
        "IncomeStatement",
        "operating_income",
        "FY27E"
      )
      const fy27TaxRate = compiled.num(
        "PeriodAssumptionsActive",
        "effective_tax_rate",
        "FY27E"
      )
      expect(compiled.num("InvestedCapitalROIC", "nopat", "FY27E")).toBeCloseTo(
        fy27Ebit * (1 - fy27TaxRate),
        4
      )
    }

    expect(
      baseCompiled.num("InvestedCapitalROIC", "roic", "FY36E")
    ).toBeGreaterThan(0.315)
  })

  it("verifies [E4] D&A-to-EBIT and FCFF transmission (+100 bps da_pct_beg_ppe -> 0 EBITDA, -1x EBIT, +t*D&A FCFF) (C4)", () => {
    const baseCompiled = getCompiled("Base")
    const wbFlex = buildCostcoWorkbook("Base")
    const baseDaRate = baseCompiled.num(
      "ScalarAssumptionsActive",
      "da_pct_beg_ppe",
      "Base"
    )
    wbFlex
      .getTable("ScalarAssumptionsActive")
      .setCell("da_pct_beg_ppe", "Base", baseDaRate + 0.01)
    using flexed = wbFlex.compile()

    const deltaDa =
      flexed.num("WorkingCapitalPPE", "da", "FY36E") -
      baseCompiled.num("WorkingCapitalPPE", "da", "FY36E")
    const deltaEbitda =
      flexed.num("IncomeStatement", "ebitda", "FY36E") -
      baseCompiled.num("IncomeStatement", "ebitda", "FY36E")
    const deltaEbit =
      flexed.num("IncomeStatement", "operating_income", "FY36E") -
      baseCompiled.num("IncomeStatement", "operating_income", "FY36E")
    const deltaFcff =
      flexed.num("InvestedCapitalROIC", "unlevered_fcff", "FY36E") -
      baseCompiled.num("InvestedCapitalROIC", "unlevered_fcff", "FY36E")
    const taxRate36 = baseCompiled.num(
      "PeriodAssumptionsActive",
      "effective_tax_rate",
      "FY36E"
    )

    expect(deltaDa).toBeGreaterThan(100)
    expect(Math.abs(deltaEbitda)).toBeLessThan(1e-6)
    expect(Math.abs(deltaEbit + deltaDa)).toBeLessThan(1e-6)
    expect(Math.abs(deltaFcff - taxRate36 * deltaDa)).toBeLessThan(1e-6)

    for (const p of ALL_PERIODS) {
      expect(
        Math.abs(flexed.num("BalanceSheet", "balance_check", p))
      ).toBeLessThan(1e-4)
      expect(
        Math.abs(flexed.num("CashFlowStatement", "cash_tie_out_check", p))
      ).toBeLessThan(1e-4)
      expect(
        Math.abs(flexed.num("InvestedCapitalROIC", "ic_tie_out_check", p))
      ).toBeLessThan(1e-4)
    }
  }, 20_000)

  it("verifies neutral monotonic scenario ordering (Downside < Base < Upside), framing metadata, dispersion bounds, and live switching (C6/C7)", () => {
    expect(SCENARIOS).toEqual(["Downside", "Base", "Upside"])
    const baseCompiled = getCompiled("Base")
    for (const sc of SCENARIOS) {
      const b = ALL_SCENARIO_DRIVERS[sc]
      expect(b.framing).not.toMatch(/\d/)
      expect(b.framingColumns.growth).not.toMatch(/\d/)
      expect(b.framingColumns.marginCapital).not.toMatch(/\d/)
      expect(b.framingColumns.valuation).not.toMatch(/\d/)
      const rowId = sc.toLowerCase()
      expect(
        baseCompiled.value("ScenarioFraming", rowId, "growth_regime")
      ).toBe(b.framingColumns.growth)
      expect(
        baseCompiled.value("ScenarioFraming", rowId, "margin_capital")
      ).toBe(b.framingColumns.marginCapital)
      expect(
        baseCompiled.value("ScenarioFraming", rowId, "valuation_regime")
      ).toBe(b.framingColumns.valuation)
    }

    // [E8]/[O6] Upside brackets Street High EPS, Downside-Upside spans FY27E rev dispersion, g <= 3.70%
    const downCompiled = getCompiled("Downside")
    const upCompiled = getCompiled("Upside")
    expect(
      upCompiled.num("IncomeStatement", "diluted_eps", "FY27E")
    ).toBeGreaterThanOrEqual(23.36)
    expect(
      downCompiled.num("IncomeStatement", "total_revenue", "FY27E")
    ).toBeLessThanOrEqual(322_000)
    expect(
      upCompiled.num("IncomeStatement", "total_revenue", "FY27E")
    ).toBeGreaterThanOrEqual(340_100)
    expect(
      upCompiled.num("ScalarAssumptionsActive", "terminal_growth_rate", "val")
    ).toBeLessThanOrEqual(0.037)
    expect(
      upCompiled.num(
        "ScalarAssumptionsActive",
        "calibrated_comps_ev_to_ebitda",
        "val"
      )
    ).toBeCloseTo(29.5, 4)

    interface ScenarioMetrics {
      readonly idx: number
      readonly wacc: number
      readonly fy27Rev: number
      readonly fy27Ebitda: number
      readonly fy36Rev: number
      readonly fy36Ebit: number
      readonly fy36Ebitda: number
      readonly fy36Fcff: number
      readonly fy36CashSti: number
      readonly perpCum: number
      readonly perpEx: number
      readonly exitCum: number
      readonly compsCum: number
      readonly blendedCum: number
    }

    const extractMetrics = (
      compiled: ReturnType<typeof compileCostcoModel>
    ): ScenarioMetrics => ({
      idx: compiled.num("ScenarioControl", "active_idx", "val"),
      wacc: compiled.num("WaccSchedule", "wacc", "val"),
      fy27Rev: compiled.num("IncomeStatement", "total_revenue", "FY27E"),
      fy27Ebitda: compiled.num("IncomeStatement", "ebitda", "FY27E"),
      fy36Rev: compiled.num("IncomeStatement", "total_revenue", "FY36E"),
      fy36Ebit: compiled.num("IncomeStatement", "operating_income", "FY36E"),
      fy36Ebitda: compiled.num("IncomeStatement", "ebitda", "FY36E"),
      fy36Fcff: compiled.num("InvestedCapitalROIC", "unlevered_fcff", "FY36E"),
      fy36CashSti:
        compiled.num("BalanceSheet", "cash_and_equivalents", "FY36E") +
        compiled.num("BalanceSheet", "short_term_investments", "FY36E"),
      perpCum: compiled.num("DcfBridge", "implied_price_cum_div", "perp"),
      perpEx: compiled.num("DcfBridge", "implied_price_ex_div", "perp"),
      exitCum: compiled.num("DcfBridge", "implied_price_cum_div", "exit_mult"),
      compsCum: compiled.num(
        "CompsValuationCalibration",
        "implied_price_cum_div",
        "val"
      ),
      blendedCum: compiled.num(
        "FootballField",
        "blended_total",
        "cum_div_price"
      ),
    })

    const metricsByScenario: Partial<Record<ScenarioName, ScenarioMetrics>> = {}
    for (const sc of SCENARIOS) {
      metricsByScenario[sc] = extractMetrics(getCompiled(sc))
    }

    const downside = metricsByScenario.Downside
    const base = metricsByScenario.Base
    const upside = metricsByScenario.Upside
    if (!downside || !base || !upside) {
      throw new Error("Missing compiled scenario metrics")
    }

    expect(downside.idx).toBe(1)
    expect(base.idx).toBe(2)
    expect(upside.idx).toBe(3)

    expect(downside.wacc).toBeGreaterThan(base.wacc)
    expect(base.wacc).toBeGreaterThan(upside.wacc)

    for (const key of [
      "fy27Rev",
      "fy27Ebitda",
      "fy36Rev",
      "fy36Ebit",
      "fy36Ebitda",
      "fy36Fcff",
      "perpCum",
      "exitCum",
      "compsCum",
      "blendedCum",
    ] as const) {
      expect(upside[key]).toBeGreaterThan(base[key])
      expect(base[key]).toBeGreaterThan(downside[key])
    }

    for (const sc of SCENARIOS) {
      expect(metricsByScenario[sc]!.fy36CashSti).toBeLessThan(40_000)
    }

    // Live toggling inside a single Base workbook: 1 (Downside) -> 3 (Upside) -> 2 (Base)
    const wb = buildCostcoWorkbook("Base")
    wb.getTable("ScenarioControl").setCell("active_idx", "val", 1)
    using toggledDownside = wb.compile()
    expect(
      toggledDownside.value("ScenarioControl", "active_scenario_name", "val")
    ).toBe("Downside")
    const toggledDownMetrics = extractMetrics(toggledDownside)
    for (const key of Object.keys(downside) as (keyof ScenarioMetrics)[]) {
      expect(Math.abs(toggledDownMetrics[key] - downside[key])).toBeLessThan(
        1e-4
      )
    }
    expect(
      Math.abs(
        toggledDownside.num("ScenarioVariance", "tie_out_check", "active_live")
      )
    ).toBeLessThan(1e-4)

    wb.getTable("ScenarioControl").setCell("active_idx", "val", 3)
    using toggledUpside = wb.compile()
    expect(
      toggledUpside.value("ScenarioControl", "active_scenario_name", "val")
    ).toBe("Upside")
    const toggledUpMetrics = extractMetrics(toggledUpside)
    for (const key of Object.keys(upside) as (keyof ScenarioMetrics)[]) {
      expect(Math.abs(toggledUpMetrics[key] - upside[key])).toBeLessThan(1e-4)
    }
    expect(
      Math.abs(
        toggledUpside.num("ScenarioVariance", "tie_out_check", "active_live")
      )
    ).toBeLessThan(1e-4)

    wb.getTable("ScenarioControl").setCell("active_idx", "val", 2)
    using resetBase = wb.compile()
    expect(
      resetBase.value("ScenarioControl", "active_scenario_name", "val")
    ).toBe("Base")
    expect(
      Math.abs(
        resetBase.num("DcfBridge", "implied_price_cum_div", "perp") -
          base.perpCum
      )
    ).toBeLessThan(1e-6)
  }, 20_000)

  it("validates mid-year perpetuity continuity, multi-horizon beta, live reverse DCF, EV bridge, and sensitivities (C2/C5/C6)", () => {
    for (const sc of SCENARIOS) {
      const compiled = getCompiled(sc)

      // [E2] Mid-year perpetuity discount period continuity vs year-end Exit DCF
      const termYr = compiled.num("DcfSchedule", "discount_years", "Terminal")
      const termPerpYr = compiled.num(
        "DcfSchedule",
        "discount_years_perp",
        "Terminal"
      )
      const midFlag = compiled.num(
        "ScalarAssumptionsActive",
        "mid_year_convention_flag",
        "val"
      )
      expect(termPerpYr).toBeCloseTo(termYr - 0.5 * midFlag, 6)
      expect(
        compiled.num("MarketImpliedRateCalc", "df_Terminal", "disc_yr")
      ).toBeCloseTo(termPerpYr, 6)
      expect(
        compiled.num("DcfBridge", "implied_perp_growth", "perp")
      ).toBeCloseTo(
        compiled.num("ScalarAssumptionsActive", "terminal_growth_rate", "val"),
        6
      )

      // Live 6-pass implied WACC convergence within < $1M
      const evErr = compiled.num("MarketImpliedRateCalc", "ev_error", "iter_5")
      expect(Math.abs(evErr)).toBeLessThan(1.0)

      const implWacc = compiled.num(
        "ReverseDcfTable",
        "implied_wacc_at_base_g",
        "val"
      )
      const implKe = compiled.num(
        "ReverseDcfTable",
        "implied_ke_at_base_g",
        "val"
      )
      const implBeta = compiled.num(
        "ReverseDcfTable",
        "implied_beta_at_base_g",
        "val"
      )
      const implErp = compiled.num(
        "ReverseDcfTable",
        "implied_erp_at_5y_beta",
        "val"
      )
      expect(implWacc).toBeGreaterThan(0.04)
      expect(implWacc).toBeLessThan(0.075)
      expect(implKe).toBeGreaterThan(0.04)
      expect(implBeta).toBeLessThan(0.5)
      expect(implErp).toBeLessThan(0.025)

      for (const r of [
        "implied_wacc_at_base_g",
        "implied_ke_at_base_g",
        "implied_beta_at_base_g",
        "implied_erp_at_5y_beta",
        "perp_price_at_2y_beta_wacc",
        "perp_price_at_rf_400",
        "exit_price_at_rf_400",
        "blended_price_at_rf_400",
      ] as const) {
        expect(
          compiled.inspectCell("ReverseDcfTable", r, "val").isFormula
        ).toBe(true)
      }
    }

    const compiled = getCompiled("Base")
    expect(compiled.num("WaccSchedule", "equity_beta", "val")).toBeCloseTo(
      0.85,
      4
    )
    expect(compiled.num("WaccSchedule", "equity_beta_2y", "val")).toBeCloseTo(
      0.22,
      4
    )
    expect(compiled.num("WaccSchedule", "wacc_2y_memo", "val")).toBeLessThan(
      compiled.num("WaccSchedule", "wacc", "val")
    )
    expect(compiled.num("WaccSchedule", "wacc_rf_stress", "val")).toBeLessThan(
      compiled.num("WaccSchedule", "wacc", "val")
    )
    expect(
      compiled.num("ReverseDcfTable", "perp_price_at_2y_beta_wacc", "val")
    ).toBeGreaterThan(
      compiled.num("DcfBridge", "implied_price_cum_div", "perp")
    )
    expect(
      compiled.num("ReverseDcfTable", "perp_price_at_rf_400", "val")
    ).toBeGreaterThan(
      compiled.num("DcfBridge", "implied_price_cum_div", "perp")
    )
    expect(
      compiled.num("ReverseDcfTable", "blended_price_at_rf_400", "val")
    ).toBeGreaterThan(
      compiled.num("FootballField", "blended_total", "cum_div_price")
    )

    // SBC discipline & steady-state reinvestment cross-check
    const sbcAfterTax27 = compiled.num(
      "InvestedCapitalROIC",
      "sbc_after_tax_memo",
      "FY27E"
    )
    const fcff27 = compiled.num("DcfSchedule", "unlevered_fcff", "FY27E")
    const fcffExSbc27 = compiled.num(
      "DcfSchedule",
      "unlevered_fcff_ex_sbc_memo",
      "FY27E"
    )
    expect(fcffExSbc27 - fcff27).toBeCloseTo(sbcAfterTax27, 4)

    const cumPerp = compiled.num("DcfBridge", "implied_price_cum_div", "perp")
    const exPerp = compiled.num("DcfBridge", "implied_price_ex_div", "perp")
    expect(cumPerp - exPerp).toBeCloseTo(30, 6)
    expect(
      compiled.num("DcfBridge", "implied_price_cum_div", "perp_ex_sbc")
    ).toBeGreaterThan(cumPerp)

    const cumExit = compiled.num(
      "DcfBridge",
      "implied_price_cum_div",
      "exit_mult"
    )
    const exExit = compiled.num(
      "DcfBridge",
      "implied_price_ex_div",
      "exit_mult"
    )
    expect(cumExit - exExit).toBeCloseTo(30, 6)

    const ronic = compiled.num("DcfBridge", "fy36_ronic", "perp")
    const reinvestReq = compiled.num(
      "DcfBridge",
      "steady_state_reinvest_req",
      "perp"
    )
    const steadyFcff = compiled.num(
      "DcfBridge",
      "steady_state_term_fcff",
      "perp"
    )
    const steadyPrice = compiled.num(
      "DcfBridge",
      "steady_state_implied_price",
      "perp"
    )
    expect(ronic).toBeGreaterThan(0.15)
    expect(reinvestReq).toBeCloseTo(0.035 / ronic, 4)
    expect(steadyFcff).toBeGreaterThan(10_000)
    expect(steadyPrice).toBeGreaterThan(300)
    expect(steadyPrice).toBeLessThan(650)

    expect(
      compiled.num("DcfBridge", "implied_perp_growth", "exit_mult")
    ).toBeGreaterThan(0.05)
    expect(compiled.num("DcfBridge", "gdp_cap_warning_flag", "exit_mult")).toBe(
      1
    )
    expect(compiled.num("DcfBridge", "gdp_cap_warning_flag", "perp")).toBe(0)
    expect(compiled.num("DcfBridge", "ust_crossover_years_met", "perp")).toBe(0)

    // Sensitivities tie at center cells
    expect(compiled.num("SensitivityPerpWaccG", "w_0", "g_0")).toBeCloseTo(
      cumPerp,
      6
    )
    expect(compiled.num("SensitivityExitWaccMult", "w_0", "m_0")).toBeCloseTo(
      cumExit,
      6
    )
    expect(compiled.num("SensitivityOpsPerp", "md_0", "c_0")).toBeCloseTo(
      cumPerp,
      6
    )
    expect(compiled.num("SensitivityOpsPerp", "md_0", "c_p1")).toBeGreaterThan(
      cumPerp
    )
    expect(compiled.num("SensitivityOpsPerp", "md_0", "c_m1")).toBeLessThan(
      cumPerp
    )
    expect(compiled.num("SensitivityOpsPerp", "md_p1", "c_0")).toBeGreaterThan(
      cumPerp
    )
    expect(compiled.num("SensitivityOpsPerp", "md_m1", "c_0")).toBeLessThan(
      cumPerp
    )

    // [E6] DcfOperatingSensFactors +100 bps comp sensitivity increases FY27E FCFF (no Year-1 PP&E spike)
    expect(
      compiled.num("DcfOperatingSensFactors", "fcff_base_c_p2", "FY27E")
    ).toBeGreaterThan(
      compiled.num("DcfOperatingSensFactors", "fcff_base_c_0", "FY27E")
    )

    // [E6] ValuationSensitivitySummary: Joint Indifference Frontier & Key Economic Knobs
    const sensBaseRef = compiled.num(
      "ValuationSensitivitySummary",
      "perp_base_ref",
      "active_live"
    )
    expect(sensBaseRef).toBeCloseTo(cumPerp, 6)
    expect(
      compiled.num("ValuationSensitivitySummary", "implied_wacc", "Base")
    ).toBeCloseTo(
      compiled.num("ReverseDcfTable", "implied_wacc_at_base_g", "val"),
      6
    )
    expect(
      compiled.num(
        "ValuationSensitivitySummary",
        "perp_peer_5y_beta",
        "active_live"
      )
    ).toBeGreaterThan(sensBaseRef)
    expect(
      compiled.num(
        "ValuationSensitivitySummary",
        "perp_cash_adj_wacc",
        "active_live"
      )
    ).toBeLessThan(sensBaseRef)
    expect(
      compiled.num(
        "ValuationSensitivitySummary",
        "perp_ex_trapped_cash",
        "active_live"
      )
    ).toBeLessThan(sensBaseRef)
    expect(
      compiled.num(
        "ValuationSensitivitySummary",
        "perp_capex_minus_50bps",
        "active_live"
      )
    ).toBeGreaterThan(sensBaseRef)
    expect(
      compiled.num(
        "ValuationSensitivitySummary",
        "perp_capex_plus_50bps",
        "active_live"
      )
    ).toBeLessThan(sensBaseRef)

    // [E5]/[O1]/[O2] Ex-op-lease EV bridge: Q1 $1.47/sh div, LT debt FV ($5,689M) + fin leases ($1,413M), diluted shares (443.603M)
    const dilutedShares = compiled.num(
      "MarketAnchors",
      "cost_diluted_shares",
      "val"
    )
    expect(dilutedShares).toBeCloseTo(443.603349, 4)
    expect(compiled.num("WaccSchedule", "total_debt_and_leases", "val")).toBe(
      7102
    )
    expect(compiled.num("DcfBridge", "less_debt_leases", "perp")).toBe(-7102)
    expect(compiled.num("DcfBridge", "less_q1_reg_div", "perp")).toBeCloseTo(
      -1.47 * dilutedShares,
      2
    )
    expect(compiled.num("DcfBridge", "net_cash_bridge", "perp")).toBeCloseTo(
      21301 - 1.47 * dilutedShares - 7102,
      2
    )
    expect(compiled.num("DcfBridge", "diluted_shares", "perp")).toBeCloseTo(
      dilutedShares,
      6
    )
    expect(compiled.num("DcfBridge", "debt_fv_vs_carrying_memo", "perp")).toBe(
      473
    )
    expect(
      compiled.num("DcfBridge", "price_ex_trapped_cash_memo", "perp")
    ).toBeCloseTo(cumPerp - 2842 / dilutedShares, 4)
    expect(
      compiled.num("DcfBridge", "headline_ev_incl_op_leases_memo", "perp")
    ).toBeCloseTo(
      compiled.num("DcfBridge", "current_market_ev", "perp") + 2606,
      2
    )
  })

  it("validates 2Y PublicPriceAttribution, 50/0/50 FootballField, ConsensusBenchmark EPS bridge, ex-op-lease Comps & WMT NCI, and Unit Economics churn (C3/C5/C6)", () => {
    using kg = compileKgFromDir("data/audited")
    const compiled = getCompiled("Base")

    // 1. PublicPriceAttribution: 7 remaining quarterly regular dividends + EV & P/E 2Y TSR tie-outs (< 1e-6)
    const closePrice = compiled.num("MarketAnchors", "cost_close_price", "val")
    const baseFy27Dps = compiled.num("IncomeStatement", "regular_dps", "FY27E")
    const baseFy28Dps = compiled.num("IncomeStatement", "regular_dps", "FY28E")
    expect(
      compiled.num("PublicPriceAttribution", "regular_dps_2y", "Base")
    ).toBeCloseTo(0.75 * baseFy27Dps + baseFy28Dps, 4)
    for (const col of ["Downside", "Base", "Upside", "active_live"] as const) {
      expect(
        compiled.num("PublicPriceAttribution", "ex_div_spot_price", col)
      ).toBeCloseTo(closePrice - 30, 6)
      expect(
        compiled.num("PublicPriceAttribution", "regular_dps_2y", col)
      ).toBeLessThan(15)
      expect(
        Math.abs(
          compiled.num("PublicPriceAttribution", "ev_tsr_tie_out_check", col)
        )
      ).toBeLessThan(1e-6)
      expect(
        Math.abs(
          compiled.num("PublicPriceAttribution", "pe_tsr_tie_out_check", col)
        )
      ).toBeLessThan(1e-6)
      expect(
        compiled.num("PublicPriceAttribution", "ev_implied_tsr", col)
      ).toBeCloseTo(
        compiled.num("PublicPriceAttribution", "pe_implied_tsr", col),
        6
      )
    }

    // 2. ScenarioVariance & 50/0/50 FootballField tie-outs + sensitivity reference memos
    expect(compiled.num("FootballField", "perp_dcf", "weight")).toBeCloseTo(
      0.5,
      6
    )
    expect(
      compiled.num("FootballField", "exit_mult_dcf", "weight")
    ).toBeCloseTo(0.0, 6)
    expect(
      compiled.num("FootballField", "calibrated_comps", "weight")
    ).toBeCloseTo(0.5, 6)
    expect(
      compiled.num("FootballField", "blended_total", "weight")
    ).toBeCloseTo(1.0, 6)
    expect(
      compiled.num("FootballField", "memo_100_perp", "cum_div_price")
    ).toBeCloseTo(compiled.num("FootballField", "perp_dcf", "cum_div_price"), 6)
    expect(
      compiled.num("FootballField", "memo_equal_33", "cum_div_price")
    ).toBeCloseTo(
      (compiled.num("FootballField", "perp_dcf", "cum_div_price") +
        compiled.num("FootballField", "exit_mult_dcf", "cum_div_price") +
        compiled.num("FootballField", "calibrated_comps", "cum_div_price")) /
        3,
      6
    )
    expect(
      Math.abs(
        compiled.num("FootballField", "blended_total", "cum_div_price") -
          compiled.num("FootballField", "blended_total", "weighted_cum_div")
      )
    ).toBeLessThan(1e-4)
    for (const col of [
      "active_live",
      "base_to_downside",
      "base_to_upside",
    ] as const) {
      expect(
        Math.abs(compiled.num("ScenarioVariance", "tie_out_check", col))
      ).toBeLessThan(1e-4)
    }

    // 3. ConsensusBenchmark ties FY27E-FY29E consensus, FY27E dispersion & price targets to KgRegistry
    const mktOpts = { entity: "COST", divisors: KG_DIVISORS } as const
    expect(compiled.num("ConsensusBenchmark", "fy27_rev", "cons")).toBeCloseTo(
      kg.val("mkt_consensus_estimates", "revenue", "2027-FY", mktOpts)!,
      2
    )
    expect(compiled.num("ConsensusBenchmark", "fy27_rev", "low")).toBeCloseTo(
      kg.val("mkt_consensus_estimates", "sa_revenue_low", "2027-FY", mktOpts)!,
      2
    )
    expect(compiled.num("ConsensusBenchmark", "fy27_rev", "high")).toBeCloseTo(
      kg.val("mkt_consensus_estimates", "sa_revenue_high", "2027-FY", mktOpts)!,
      2
    )
    expect(
      compiled.num("ConsensusBenchmark", "fy27_analyst_count", "cons")
    ).toBe(34)
    expect(compiled.num("ConsensusBenchmark", "fy29_rev", "cons")).toBeCloseTo(
      kg.val("mkt_consensus_estimates", "revenue", "2029-FY", mktOpts)!,
      2
    )
    expect(
      compiled.num("ConsensusBenchmark", "fy29_ebitda", "cons")
    ).toBeCloseTo(
      kg.val("mkt_consensus_estimates", "ebitda", "2029-FY", mktOpts)!,
      2
    )
    expect(compiled.num("ConsensusBenchmark", "fy29_eps", "cons")).toBeCloseTo(
      kg.val("mkt_consensus_estimates", "eps_headline", "2029-FY", {
        entity: "COST",
      })!,
      2
    )
    expect(
      compiled.num("ConsensusBenchmark", "price_target_mean", "cons")
    ).toBeCloseTo(
      kg.val("mkt_price_targets", "pt_average", "2026-11-13", {
        entity: "COST",
      })!,
      2
    )
    expect(
      compiled.num("ConsensusBenchmark", "price_target_mean", "low")
    ).toBeCloseTo(770, 2)
    expect(
      compiled.num("ConsensusBenchmark", "price_target_mean", "high")
    ).toBeCloseTo(1315, 2)
    expect(
      compiled.num("ConsensusBenchmark", "price_target_median", "base_vs_cons")
    ).toBeCloseTo(
      compiled.num("ConsensusBenchmark", "price_target_mean", "base") /
        compiled.num("ConsensusBenchmark", "price_target_median", "cons") -
        1,
      6
    )
    const buyShare = compiled.num(
      "ConsensusBenchmark",
      "ratings_buy_share",
      "cons"
    )
    const nonBuyShare = compiled.num(
      "ConsensusBenchmark",
      "ratings_non_buy_share",
      "cons"
    )
    expect(buyShare).toBeGreaterThan(0.5)
    expect(nonBuyShare).toBeCloseTo(1 - buyShare, 6)
    expect(nonBuyShare).toBeCloseTo(0.415, 2)

    // FY27E–FY28E Base vs. Consensus EPS Bridge exact tie-out
    expect(
      compiled.num("ConsensusBenchmark", "fy27_eps_bridge_total", "base")
    ).toBeCloseTo(
      compiled.num("IncomeStatement", "diluted_eps", "FY27E") -
        compiled.num("ConsensusBenchmark", "fy27_eps", "cons"),
      6
    )
    expect(
      compiled.num("ConsensusBenchmark", "fy28_eps_bridge_total", "base")
    ).toBeCloseTo(
      compiled.num("IncomeStatement", "diluted_eps", "FY28E") -
        compiled.num("ConsensusBenchmark", "fy28_eps", "cons"),
      6
    )
    expect(
      compiled.num("ConsensusBenchmark", "fy27_eps_bridge_esop", "base")
    ).toBeGreaterThan(0.35)
    expect(
      compiled.num("ConsensusBenchmark", "fy27_eps_bridge_int", "base")
    ).toBeLessThan(-0.35)

    // 4. [E3]/[R2]/[R4]/[R6] Ex-operating-lease TradingCompsLTM/Forward, WMT+KR NCI & ExecutiveKPIs/CompsCalibration alignment
    expect(compiled.table("WorkingCapitalPPE").rows).not.toContain(
      "change_lt_op_assets_net"
    )
    const ltmTable = compiled.table("TradingCompsLTM")
    expect(ltmTable.value("KR", "ev_ltm_ebit_rep")).toBeNull()
    expect(ltmTable.value("KR", "pe_ltm_rep")).toBeNull()
    expect(ltmTable.num("COST", "beta_5y")).toBeCloseTo(0.85, 4)
    expect(ltmTable.num("COST", "beta_2y")).toBeCloseTo(0.22, 4)
    expect(ltmTable.num("WMT", "beta_2y")).toBeCloseTo(0.48, 4)
    expect(compiled.num("PeerEvAndQoeBridge", "total_nci", "WMT")).toBeCloseTo(
      6561,
      2
    )
    expect(
      compiled.num("PeerEvAndQoeBridge", "nonredeemable_nci", "KR")
    ).toBeCloseTo(6, 2)
    expect(compiled.num("PeerEvAndQoeBridge", "total_nci", "KR")).toBeCloseTo(
      6,
      2
    )
    expect(
      compiled.inspectCell("TradingCompsLTM", "COST", "ev").note
    ).toBeTruthy()
    expect(
      compiled.num("PeerEvAndQoeBridge", "invested_capital", "COST")
    ).toBeCloseTo(
      compiled.num("InvestedCapitalROIC", "operating_ic", "FY26"),
      4
    )
    expect(
      compiled.num("CompsValuationCalibration", "net_cash_bridge", "val")
    ).toBeCloseTo(compiled.num("DcfBridge", "net_cash_bridge", "perp"), 4)
    expect(
      compiled.num("ExecutiveKPIs", "enterprise_value", "val")
    ).toBeCloseTo(compiled.num("DcfBridge", "current_market_ev", "perp"), 4)
    expect(
      Math.abs(
        compiled.num("ExecutiveKPIs", "fy27e_cons_ev_ebitda", "val") -
          compiled.num("ExecutiveKPIs", "enterprise_value", "val") /
            compiled.num("MarketAnchors", "cons_ebitda_fy27", "val")
      )
    ).toBeLessThan(1e-6)
    expect(
      Math.abs(
        compiled.num("ExecutiveKPIs", "fy27e_cons_ev_ebitda", "val") -
          compiled.num("PublicPriceAttribution", "current_ev_multiple", "Base")
      )
    ).toBeLessThan(1e-6)
    expect(ltmTable.num("COST", "ltm_roic")).toBeCloseTo(
      compiled.num("PeerEvAndQoeBridge", "ltm_roic", "COST"),
      6
    )
    expect(
      compiled.dependentsOf("PeerEvAndQoeBridge", "ltm_roic", "COST")
        .directCount
    ).toBeGreaterThan(0)
    expect(ltmTable.num("COST", "ltm_roic")).toBeGreaterThan(0.3)
    expect(ltmTable.num("COST", "capex_pct_sales")).toBeGreaterThan(0.015)
    expect(ltmTable.num("COST", "ev_ebitda_ex_capex")).toBeGreaterThan(
      ltmTable.num("COST", "ev_ltm_ebitda_qoe")
    )

    const ltmFormulaCols = [
      "ev",
      "ltm_rev",
      "ltm_ebitda_rep",
      "qoe_ebitda_adj",
      "ltm_ebitda_qoe",
      "ltm_roic",
      "capex_pct_sales",
      "net_lev_qoe",
      "ev_ltm_sales",
      "ev_ltm_ebitda_rep",
      "ev_ltm_ebitda_qoe",
      "ev_ebitda_ex_capex",
    ] as const
    for (const ticker of ["COST", "BJ", "PSMT", "WMT", "TGT", "KR"] as const) {
      for (const col of ltmFormulaCols) {
        expect(
          compiled.inspectCell("TradingCompsLTM", ticker, col).isFormula,
          `TradingCompsLTM["${ticker}", "${col}"] must be a live formula`
        ).toBe(true)
      }
      for (const bridgeRow of [
        "cash_and_sti",
        "total_debt_ex_op_leases",
        "total_nci",
        "headline_ev_incl_op_leases",
        "qoe_ebitda_adj",
        "qoe_ni_adj",
      ] as const) {
        expect(
          compiled.inspectCell("PeerEvAndQoeBridge", bridgeRow, ticker)
            .isFormula,
          `PeerEvAndQoeBridge["${bridgeRow}", "${ticker}"] must be a live formula`
        ).toBe(true)
      }
      expect(
        compiled.num(
          "PeerEvAndQoeBridge",
          "headline_ev_incl_op_leases",
          ticker
        ) - compiled.num("PeerEvAndQoeBridge", "operating_leases", ticker)
      ).toBeCloseTo(ltmTable.num(ticker, "ev"), 2)
      expect(ltmTable.num(ticker, "ltm_roic")).toBeGreaterThan(0.03)
      expect(ltmTable.num(ticker, "capex_pct_sales")).toBeGreaterThan(0.01)
    }

    const fwdTable = compiled.table("TradingCompsForward")
    expect(fwdTable.value("PSMT", "fcf_27")).toBeNull()
    expect(fwdTable.value("PSMT", "p_fcf_27")).toBeNull()
    expect(fwdTable.num("COST", "ev_ebitda_27")).toBeCloseTo(29.43, 1)
    expect(fwdTable.num("COST", "rev_growth_28")).toBeGreaterThan(0.06)
    expect(fwdTable.num("COST", "ebitda_margin_27")).toBeGreaterThan(0.045)
    expect(fwdTable.num("COST", "ebitda_margin_27")).toBeLessThan(0.055)

    // 5. ClubUnitEconomics 0D null hygiene, churn complements & bridge liveness
    const ueTable = compiled.table("ClubUnitEconomics")
    expect(ueTable.value("merch_gross_profit", "COST_US")).toBeNull()
    expect(ueTable.value("paid_members_m", "COST_US")).toBeNull()
    expect(ueTable.value("paid_members_m", "WMT_SAMS_H1_ANN")).toBeNull()
    expect(ueTable.value("sales_floor_sqft_m", "BJ")).toBeNull()
    expect(ueTable.value("entry_fee", "PSMT")).toBeNull()
    expect(ueTable.num("total_revenue", "WMT_SAMS_H1_ANN")).toBe(100_892)
    expect(ueTable.num("operating_income", "WMT_SAMS_H1_ANN")).toBe(2704)
    expect(ueTable.num("implied_churn_rate", "COST_US")).toBeCloseTo(
      1 - ueTable.num("renewal_rate", "COST_US"),
      6
    )
    expect(ueTable.num("implied_churn_rate", "COST_TOTAL")).toBeCloseTo(
      1 - ueTable.num("renewal_rate", "COST_TOTAL"),
      6
    )
    expect(ueTable.num("implied_churn_rate", "BJ")).toBeCloseTo(
      1 - ueTable.num("renewal_rate", "BJ"),
      6
    )
    expect(ueTable.num("implied_churn_rate", "PSMT")).toBeCloseTo(
      1 - ueTable.num("renewal_rate", "PSMT"),
      6
    )
    const ueBridge = compiled.table("ClubUnitEconBridge")
    for (const r of ueBridge.rows) {
      expect(
        compiled.dependentsOf("ClubUnitEconBridge", r, "val").directCount,
        `ClubUnitEconBridge["${r}", "val"] has 0 dependents`
      ).toBeGreaterThan(0)
    }
  })

  it("enforces 7-sheet grid geometry, zero subtitle/wrap/gutter overflows, zero descriptor hover notes, clean client copy, formula length <= 350, and Excel emission (C7)", () => {
    const bannedCopyPattern =
      /\b(GAP-\d+|PROJECT\.md|RUN_LOG\.jsonl|data\/audited|KgRegistry|CompiledModel|pure DAG|zero circularity|zero-plug|zero plugs|decision-framing|2D reverse DCF|guarded with #N\/A|per-scenario compiles|f8|f12|f2)\b/i

    for (const sc of SCENARIOS) {
      const compiled = getCompiled(sc)
      const summary = compiled.summary()
      expect(summary.totalSheets).toBe(7)
      expect(summary.sheets.map((s) => s.name)).toEqual([
        "Exec Summary",
        "Assumptions",
        "3-Statement Model",
        "Schedules & ROIC",
        "DCF & WACC",
        "Trading Comps",
        "Unit Economics",
      ])
      // Layout grid audit: zero errors, zero subtitle overflows, zero wrapped cells, zero widened gutters
      const layoutMd = compiled.toMarkdown("layout")
      expect(layoutMd).toContain("Errors: 0")
      expect(layoutMd.match(/sub:\d+\([^)]+\)/g) ?? []).toEqual([])
      expect(layoutMd.match(/wrap:\d+/g) ?? []).toEqual([])
      expect(layoutMd.match(/gutter [A-Z]+\(1c, w:12\)/g) ?? []).toEqual([])

      // [F2] No static active-case framing subtitles or residual "$30" labels on dynamic schedules
      for (const tblId of [
        "ScenarioSummary",
        "PeriodAssumptionsActive",
      ] as const) {
        const subs = compiled.inspectTable(tblId).subtitles.join(" ")
        expect(subs).not.toContain(ALL_SCENARIO_DRIVERS[sc].framing)
      }
      for (const tblId of [
        "PublicPriceAttribution",
        "CompsValuationCalibration",
        "IncomeStatement",
        "ShareEquitySchedule",
      ] as const) {
        const ti = compiled.inspectTable(tblId)
        expect(ti.subtitles.join(" ")).not.toMatch(/\$30(\.00)?/)
        const ta = compiled.table(tblId)
        for (const r of ta.rows) {
          for (const col of ti.columns) {
            if (col.isDescriptor && col.id !== null) {
              const txt = ta.value(r, col.id)
              if (typeof txt === "string") {
                expect(txt).not.toMatch(/\$30(\.00)?/)
              }
            }
          }
        }
      }

      let maxFormulaLen = 0
      const descriptorHoverNotes: string[] = []

      for (const s of summary.sheets) {
        const sheetInsp = compiled.inspectSheet(s.name)
        for (const rowInsp of sheetInsp.rows) {
          for (const cellInsp of rowInsp.cells) {
            if (cellInsp.kind === "data" && !cellInsp.isDescriptor) {
              expect(
                sheetInsp.colWidths[cellInsp.physicalCol],
                `Measure column ${cellInsp.physicalCol} on "${s.name}" stretched above 12`
              ).toBe(12)
            }
          }
        }

        for (const t of s.tables) {
          const tableInsp = compiled.inspectTable(t.id)
          expect(tableInsp.title).not.toMatch(bannedCopyPattern)
          expect(tableInsp.subtitles.length).toBeGreaterThanOrEqual(2)
          for (const subLine of tableInsp.subtitles) {
            expect(subLine.trim().length).toBeGreaterThan(0)
            expect(subLine).not.toMatch(bannedCopyPattern)
          }

          const descriptorColIds: string[] = []
          for (const col of tableInsp.columns) {
            if (col.isDescriptor && col.id !== null) {
              descriptorColIds.push(col.id)
            }
            if (!col.isDescriptor && !col.isGutter) {
              for (const hdrLine of col.headers) {
                expect(
                  hdrLine.length,
                  `Header line "${hdrLine}" in ${t.id}.${String(col.id)} exceeds 11 chars`
                ).toBeLessThanOrEqual(11)
              }
            }
          }

          // Check row gutters before every non-first section header
          let seenFirstDataOrSection = false
          for (let i = 0; i < tableInsp.rows.length; i++) {
            const r = tableInsp.rows[i]!
            if (r.isSectionHeader) {
              if (seenFirstDataOrSection) {
                const prev = tableInsp.rows[i - 1]
                expect(
                  prev?.isGutter,
                  `Missing row gutter before section "${String(r.sectionTitle)}" in ${t.id}`
                ).toBe(true)
              }
              seenFirstDataOrSection = true
            } else if (r.id !== null) {
              seenFirstDataOrSection = true
            }
          }

          const ta = compiled.table(t.id)
          for (const r of ta.rows) {
            for (const dCol of descriptorColIds) {
              const dVal = ta.value(r, dCol)
              if (typeof dVal === "string") {
                expect(dVal).not.toMatch(bannedCopyPattern)
              }
              const dCi = compiled.inspectCell(t.id, r, dCol)
              if (dCi.note) {
                descriptorHoverNotes.push(`${s.name}:${t.id}[${r},${dCol}]`)
              }
            }
            for (const c of ta.measureColumns) {
              const v = ta.value(r, c)
              expect(
                typeof v === "string" && v.startsWith("#"),
                `Cell ${t.id}["${r}", "${c}"] evaluated to Excel error ${String(v)}`
              ).toBe(false)
              const ci = compiled.inspectCell(t.id, r, c)
              if (ci.note) {
                expect(ci.note).not.toMatch(bannedCopyPattern)
              }
              if (ci.excelFormula && ci.excelFormula.length > maxFormulaLen) {
                maxFormulaLen = ci.excelFormula.length
              }
            }
          }
        }
      }

      expect(descriptorHoverNotes).toEqual([])
      expect(maxFormulaLen).toBeLessThanOrEqual(350)

      // Trailing Notes/Basis descriptor column on assumption tables
      for (const tblId of [
        "ScalarAssumptionsActive",
        "MarketAnchors",
        "PeriodAssumptionsActive",
        "PeriodAssumptionsDownside",
        "PeriodAssumptionsBase",
        "PeriodAssumptionsUpside",
        "DebtTranches",
      ] as const) {
        const ti = compiled.inspectTable(tblId)
        expect(ti.columns.filter((c) => c.isDescriptor).length).toBe(2)
      }

      // Column gutter between FY26 and FY27E on all 15-year schedules
      for (const tblId of FIFTEEN_YEAR_TABLES) {
        const cols = compiled.inspectTable(tblId).columns
        const fy26Idx = cols.findIndex((c) => c.id === "FY26")
        const fy27Idx = cols.findIndex((c) => c.id === "FY27E")
        expect(fy27Idx - fy26Idx).toBe(2)
        expect(cols[fy26Idx + 1]?.isGutter).toBe(true)
      }

      // Zero unused rows on MarketAnchors, ScalarAssumptionsActive, PeriodAssumptionsActive
      for (const r of compiled.table("PeriodAssumptionsActive").rows) {
        for (const p of FORECAST_PERIODS) {
          expect(
            compiled.inspectCell("PeriodAssumptionsActive", r, p).isFormula
          ).toBe(true)
        }
        expect(
          compiled.dependentsOf("PeriodAssumptionsActive", r, "FY27E")
            .directCount
        ).toBeGreaterThan(0)
      }
      for (const r of compiled.table("ScalarAssumptionsActive").rows) {
        expect(
          compiled.inspectCell("ScalarAssumptionsActive", r, "val").isFormula
        ).toBe(true)
        expect(
          compiled.dependentsOf("ScalarAssumptionsActive", r, "val").directCount
        ).toBeGreaterThan(0)
      }
      for (const r of compiled.table("MarketAnchors").rows) {
        expect(
          compiled.dependentsOf("MarketAnchors", r, "val").directCount,
          `MarketAnchors["${r}", "val"] has 0 dependents`
        ).toBeGreaterThan(0)
      }

      const bytes = compiled.emitWorkbook()
      expect(bytes.byteLength).toBeGreaterThan(10_000)
    }
  }, 20_000)

  it("handles extreme low equity price stress ($100/sh) cleanly with NA() guards and converged implied WACC (C7)", () => {
    const wb = buildCostcoWorkbook("Base")
    wb.getTable("MarketAnchors").setCell("cost_close_price", "val", 100)
    using stressed = wb.compile()

    expect(
      stressed.value("ReverseDcfTable", "implied_10y_fcff_cagr", "val")
    ).toBe("#N/A")
    expect(
      Math.abs(stressed.num("MarketImpliedRateCalc", "ev_error", "iter_5"))
    ).toBeLessThan(1.0)
    expect(
      stressed.num("ReverseDcfTable", "implied_wacc_at_base_g", "val")
    ).toBeGreaterThan(0.2)

    for (const col of ["Downside", "Base", "Upside", "active_live"] as const) {
      expect(
        Math.abs(
          stressed.num("PublicPriceAttribution", "ev_tsr_tie_out_check", col)
        )
      ).toBeLessThan(1e-6)
      expect(
        Math.abs(
          stressed.num("PublicPriceAttribution", "pe_tsr_tie_out_check", col)
        )
      ).toBeLessThan(1e-6)
    }

    const summary = stressed.summary()
    for (const s of summary.sheets) {
      for (const t of s.tables) {
        const ta = stressed.table(t.id)
        for (const r of ta.rows) {
          for (const c of ta.measureColumns) {
            const v = ta.value(r, c)
            if (typeof v === "string" && v.startsWith("#")) {
              expect(
                `${t.id}["${r}", "${c}"]=${v}`,
                `Unexpected Excel error under $100 stress at ${t.id}["${r}", "${c}"]: ${v}`
              ).toBe('ReverseDcfTable["implied_10y_fcff_cagr", "val"]=#N/A')
            }
          }
        }
      }
    }
  }, 20_000)

  it("handles $30/sh zero-ex-dividend-price stress and 4% gross margin contraction with zero #DIV/0! / #NUM! / #VALUE! / #REF! errors (C7)", () => {
    const assertZeroHardErrors = (
      compiled: CompiledModel,
      label: string
    ): void => {
      const hardErrors: string[] = []
      for (const s of compiled.summary().sheets) {
        for (const t of s.tables) {
          const ta = compiled.table(t.id)
          for (const r of ta.rows) {
            for (const c of ta.measureColumns) {
              const v = ta.value(r, c)
              if (typeof v === "string" && v.startsWith("#") && v !== "#N/A") {
                hardErrors.push(`${t.id}["${r}", "${c}"]=${v}`)
              }
            }
          }
        }
      }
      expect(
        hardErrors,
        `Hard Excel errors under ${label}: ${hardErrors.join(", ")}`
      ).toEqual([])

      for (const p of ALL_PERIODS) {
        expect(
          Math.abs(compiled.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-4)
        expect(
          Math.abs(compiled.num("CashFlowStatement", "cash_tie_out_check", p))
        ).toBeLessThan(1e-4)
        expect(
          Math.abs(compiled.num("InvestedCapitalROIC", "ic_tie_out_check", p))
        ).toBeLessThan(1e-4)
      }
    }

    // (a) $30.00/sh close price stress (ex_div_spot_price = 0, assumed_repurchase_price = 0)
    const wbPrice30 = buildCostcoWorkbook("Base")
    wbPrice30.getTable("MarketAnchors").setCell("cost_close_price", "val", 30)
    using stressed30 = wbPrice30.compile()
    assertZeroHardErrors(stressed30, "$30/sh equity price stress")

    expect(
      stressed30.num("PublicPriceAttribution", "ex_div_spot_price", "Base")
    ).toBe(0)
    expect(
      stressed30.num("ShareEquitySchedule", "shares_repurchased", "FY27E")
    ).toBe(0)
    expect(
      stressed30.value("DcfBridge", "upside_downside_ex_div", "perp")
    ).toBe("#N/A")
    for (const col of ["Downside", "Base", "Upside", "active_live"] as const) {
      expect(
        stressed30.value("PublicPriceAttribution", "ev_implied_tsr", col)
      ).toBe("#N/A")
      expect(
        stressed30.value("PublicPriceAttribution", "ev_tsr_tie_out_check", col)
      ).toBe("#N/A")
      expect(
        stressed30.value("PublicPriceAttribution", "pe_implied_tsr", col)
      ).toBe("#N/A")
      expect(
        stressed30.value("PublicPriceAttribution", "pe_tsr_tie_out_check", col)
      ).toBe("#N/A")
    }

    // (b) 4% merchandise gross margin contraction (negative forecast EBITDA, FCFF & RONIC)
    const wbGm4 = buildCostcoWorkbook("Base")
    const basePeriodTbl = wbGm4.getTable("PeriodAssumptionsBase")
    for (const p of FORECAST_PERIODS) {
      basePeriodTbl.setCell("merch_gross_margin_pct", p, 0.04)
    }
    using stressedGm4 = wbGm4.compile()
    assertZeroHardErrors(stressedGm4, "4% merchandise gross margin stress")

    expect(stressedGm4.num("IncomeStatement", "ebitda", "FY36E")).toBeLessThan(
      0
    )
    expect(
      stressedGm4.num("InvestedCapitalROIC", "unlevered_fcff", "FY36E")
    ).toBeLessThan(0)
    expect(stressedGm4.num("DcfBridge", "fy36_ronic", "perp")).toBeLessThan(0)
    expect(
      stressedGm4.value("DcfBridge", "implied_exit_ev_ebitda", "perp")
    ).toBe("#N/A")
    expect(
      stressedGm4.value("ReverseDcfTable", "implied_exit_ebitda", "val")
    ).toBe("#N/A")
    expect(
      stressedGm4.value("DcfBridge", "steady_state_reinvest_req", "perp")
    ).toBe("#N/A")
    expect(
      stressedGm4.value("DcfBridge", "steady_state_term_fcff", "perp")
    ).toBe("#N/A")
    expect(
      stressedGm4.value("DcfBridge", "steady_state_implied_price", "perp")
    ).toBe("#N/A")
    expect(
      stressedGm4.value("InvestedCapitalROIC", "reinvestment_rate", "FY36E")
    ).toBe("#N/A")
    expect(
      stressedGm4.value(
        "InvestedCapitalROIC",
        "fcff_ebitda_conversion",
        "FY36E"
      )
    ).toBe("#N/A")
    expect(
      stressedGm4.value(
        "PublicPriceAttribution",
        "implied_fy28_pe",
        "active_live"
      )
    ).toBe("#N/A")
  }, 20_000)
})
