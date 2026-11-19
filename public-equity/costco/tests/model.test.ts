import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { compileKgFromDir } from "../models/audited-reader.ts"
import {
  ALL_PERIODS,
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

describe("Costco (COST) 3-Statement Financial Model & Valuation Suite", () => {
  it("enforces data boundary and ties FY22–FY26 historicals to KgRegistry within < 1e-4", () => {
    const modelFiles = collectModelFiles("models")
    expect(modelFiles.length).toBeGreaterThanOrEqual(15)
    for (const file of modelFiles) {
      const src = fs.readFileSync(file, "utf8")
      expect(src).not.toMatch(/data\/raw\//)
      expect(src).not.toMatch(/data\/extracted\//)
    }

    using kg = compileKgFromDir("data/audited")
    using compiled = compileCostcoModel("Base")
    const costOpts = { entity: "COST", divisors: KG_DIVISORS } as const

    for (const p of HISTORICAL_PERIODS) {
      const pk = PERIOD_METADATA[p].kgPeriodKey
      expect(compiled.num("IncomeStatement", "net_sales", p)).toBeCloseTo(
        kg.val("cost_income_statement", "net_sales", pk, costOpts)!,
        4
      )
      expect(compiled.num("IncomeStatement", "membership_fees", p)).toBeCloseTo(
        kg.val("cost_income_statement", "membership_fees", pk, costOpts)!,
        4
      )
      expect(compiled.num("IncomeStatement", "total_revenue", p)).toBeCloseTo(
        kg.val("cost_income_statement", "total_revenue", pk, costOpts)!,
        4
      )
      expect(
        compiled.num("IncomeStatement", "operating_income", p)
      ).toBeCloseTo(
        kg.val("cost_income_statement", "operating_income", pk, costOpts)!,
        4
      )
      expect(
        compiled.num("IncomeStatement", "net_income_attr_costco", p)
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
        compiled.num("BalanceSheet", "cash_and_equivalents", p)
      ).toBeCloseTo(
        kg.val("cost_balance_sheet", "cash_and_equivalents", pk, costOpts)!,
        4
      )
      expect(
        compiled.num("BalanceSheet", "short_term_investments", p)
      ).toBeCloseTo(
        kg.val("cost_balance_sheet", "short_term_investments", pk, costOpts)!,
        4
      )
      expect(compiled.num("BalanceSheet", "total_assets", p)).toBeCloseTo(
        kg.val("cost_balance_sheet", "total_assets", pk, costOpts)!,
        4
      )
      expect(compiled.num("BalanceSheet", "total_equity", p)).toBeCloseTo(
        kg.val("cost_balance_sheet", "total_equity", pk, costOpts)!,
        4
      )
      expect(compiled.num("CashFlowStatement", "cfo", p)).toBeCloseTo(
        kg.val("cost_cash_flow", "cfo", pk, costOpts)!,
        4
      )
      expect(compiled.num("CashFlowStatement", "capex", p)).toBeCloseTo(
        kg.val("cost_cash_flow", "capex", pk, costOpts)!,
        4
      )
    }
  })

  it("maintains exact 3-statement and two-sided IC accounting identities across 15Y and 3 scenarios", () => {
    for (const sc of SCENARIOS) {
      using compiled = compileCostcoModel(sc)
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
    }
  })

  it("models FY27E $13,294M special dividend, $2,250M bond maturities, zero distressed debt, and FY28E interest reset", () => {
    for (const sc of SCENARIOS) {
      using compiled = compileCostcoModel(sc)
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
    }
  })

  it("enforces DCF rigor, SBC discipline, terminal cross-checks, and Cum/Ex-Dividend bridges", () => {
    using compiled = compileCostcoModel("Base")
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
    expect(
      compiled.num("DcfBridge", "implied_price_cum_div", "perp_ex_sbc")
    ).toBeGreaterThan(
      compiled.num("DcfBridge", "implied_price_cum_div", "perp")
    )

    const impliedExitMult = compiled.num(
      "DcfBridge",
      "implied_exit_ev_ebitda",
      "perp"
    )
    expect(impliedExitMult).toBeGreaterThan(7)
    expect(impliedExitMult).toBeLessThan(15)

    const ronic = compiled.num("DcfBridge", "fy36_ronic", "perp")
    const reinvestReq = compiled.num(
      "DcfBridge",
      "steady_state_reinvest_req",
      "perp"
    )
    expect(ronic).toBeGreaterThan(0.15)
    expect(reinvestReq).toBeCloseTo(0.035 / ronic, 4)

    const impliedGExit = compiled.num(
      "DcfBridge",
      "implied_perp_growth",
      "exit_mult"
    )
    expect(impliedGExit).toBeGreaterThan(0.05)
    expect(compiled.num("DcfBridge", "gdp_cap_warning_flag", "exit_mult")).toBe(
      1
    )
    expect(compiled.num("DcfBridge", "gdp_cap_warning_flag", "perp")).toBe(0)

    const cumPerp = compiled.num("DcfBridge", "implied_price_cum_div", "perp")
    const exPerp = compiled.num("DcfBridge", "implied_price_ex_div", "perp")
    expect(cumPerp - exPerp).toBeCloseTo(30, 6)

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

    expect(compiled.num("DcfBridge", "ust_crossover_years_met", "perp")).toBe(0)
    expect(
      compiled.num("ExecutiveKPIs", "fy27e_cons_fcf_yield_ev", "val")
    ).toBeLessThan(0.02)

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

    // ASC 842 consistency: financial debt + finance leases ($7,575M) vs headline EV incl. $2,606M op leases ($479,074M)
    expect(compiled.num("WaccSchedule", "total_debt_and_leases", "val")).toBe(
      7575
    )
    expect(compiled.num("DcfBridge", "less_debt_leases", "perp")).toBe(-7575)
    expect(compiled.num("DcfBridge", "net_cash_bridge", "perp")).toBe(13726)
    expect(
      compiled.num("DcfBridge", "headline_ev_incl_op_leases_memo", "perp")
    ).toBeCloseTo(479074.12, 1)
  })

  it("verifies scenario monotonicity (Bull > Base > Bear) and live scenario switching", () => {
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
      using compiled = compileCostcoModel(sc)
      metricsByScenario[sc] = extractMetrics(compiled)
    }

    const base = metricsByScenario.Base
    const bull = metricsByScenario.Bull
    const bear = metricsByScenario.Bear
    if (!base || !bull || !bear) {
      throw new Error("Missing compiled scenario metrics")
    }

    expect(base.idx).toBe(1)
    expect(bull.idx).toBe(2)
    expect(bear.idx).toBe(3)

    expect(bear.wacc).toBeGreaterThan(base.wacc)
    expect(base.wacc).toBeGreaterThan(bull.wacc)

    for (const key of [
      "fy36Rev",
      "fy36Ebit",
      "fy36Ebitda",
      "fy36Fcff",
      "perpCum",
      "exitCum",
      "compsCum",
      "blendedCum",
    ] as const) {
      expect(bull[key]).toBeGreaterThan(base[key])
      expect(base[key]).toBeGreaterThan(bear[key])
    }

    // Verify realistic excess-cash buyback sweep keeps FY36E Cash & STI well below $70.9B
    for (const sc of SCENARIOS) {
      expect(metricsByScenario[sc]!.fy36CashSti).toBeLessThan(40000)
    }

    // Toggle ScenarioControl["active_idx", "val"] inside a SINGLE compiled Base workbook to 2 (Bull) and 3 (Bear)
    const wb = buildCostcoWorkbook("Base")
    wb.getTable("ScenarioControl").setCell("active_idx", "val", 2)
    using toggledBull = wb.compile()
    expect(
      toggledBull.value("ScenarioControl", "active_scenario_name", "val")
    ).toBe("Bull")
    const toggledBullMetrics = extractMetrics(toggledBull)
    for (const key of Object.keys(bull) as (keyof ScenarioMetrics)[]) {
      expect(Math.abs(toggledBullMetrics[key] - bull[key])).toBeLessThan(1e-4)
    }
    expect(
      Math.abs(
        toggledBull.num("ScenarioVariance", "tie_out_check", "active_live")
      )
    ).toBeLessThan(1e-4)

    wb.getTable("ScenarioControl").setCell("active_idx", "val", 3)
    using toggledBear = wb.compile()
    expect(
      toggledBear.value("ScenarioControl", "active_scenario_name", "val")
    ).toBe("Bear")
    const toggledBearMetrics = extractMetrics(toggledBear)
    for (const key of Object.keys(bear) as (keyof ScenarioMetrics)[]) {
      expect(Math.abs(toggledBearMetrics[key] - bear[key])).toBeLessThan(1e-4)
    }
    expect(
      Math.abs(
        toggledBear.num("ScenarioVariance", "tie_out_check", "active_live")
      )
    ).toBeLessThan(1e-4)
  })

  it("validates Trading Comps, 0D null hygiene, Unit Economics, ScenarioVariance & Football Field", () => {
    using compiled = compileCostcoModel("Base")

    const ltmTable = compiled.table("TradingCompsLTM")
    expect(ltmTable.value("KR", "ev_ltm_ebit_rep")).toBeNull()
    expect(ltmTable.value("KR", "pe_ltm_rep")).toBeNull()
    expect(ltmTable.num("KR", "ev_ltm_ebit_qoe")).toBeGreaterThan(10)
    expect(ltmTable.num("WMT", "qoe_ebitda_adj")).toBe(-2200)
    expect(ltmTable.num("WMT", "qoe_ni_adj")).toBeLessThan(-1400)
    expect(
      ltmTable.num("pure_club_median", "ev_ltm_ebitda_qoe")
    ).toBeGreaterThan(12)
    expect(ltmTable.num("all_peer_median", "ev_ltm_ebit_rep")).toBeGreaterThan(
      14
    )

    // Verify all TradingCompsLTM flow, cash/debt, and QoE cells are live formulas
    const ltmBridgedCols = [
      "cash_sti",
      "debt_leases",
      "ltm_rev",
      "ltm_ebitda_rep",
      "qoe_ebitda_adj",
      "ltm_ebit_rep",
      "ltm_ni_rep",
      "qoe_ni_adj",
      "ltm_fcf",
    ] as const
    for (const ticker of ["COST", "BJ", "PSMT", "WMT", "TGT", "KR"] as const) {
      for (const col of ltmBridgedCols) {
        expect(
          compiled.inspectCell("TradingCompsLTM", ticker, col).isFormula,
          `TradingCompsLTM["${ticker}", "${col}"] must be a live formula`
        ).toBe(true)
      }
      expect(
        compiled.inspectCell("PeerEvAndQoeBridge", "cash_and_sti", ticker)
          .isFormula
      ).toBe(true)
      expect(
        compiled.inspectCell(
          "PeerEvAndQoeBridge",
          "total_debt_and_leases",
          ticker
        ).isFormula
      ).toBe(true)
      expect(
        compiled.inspectCell("PeerEvAndQoeBridge", "qoe_ebitda_adj", ticker)
          .isFormula
      ).toBe(true)
      expect(
        compiled.inspectCell("PeerEvAndQoeBridge", "qoe_ni_adj", ticker)
          .isFormula
      ).toBe(true)
    }

    const peerLtmBridge = compiled.table("PeerLtmBridge")
    for (const r of peerLtmBridge.rows) {
      expect(
        compiled.inspectCell("PeerLtmBridge", r, "ltm").isFormula,
        `PeerLtmBridge["${r}", "ltm"] must be a live formula`
      ).toBe(true)
    }

    const fwdTable = compiled.table("TradingCompsForward")
    expect(fwdTable.value("PSMT", "fcf_27")).toBeNull()
    expect(fwdTable.value("PSMT", "p_fcf_27")).toBeNull()
    expect(fwdTable.num("all_peer_median", "p_fcf_27")).toBeGreaterThan(20)
    expect(fwdTable.num("COST", "ev_ebitda_27")).toBeCloseTo(29.59, 1)
    for (const col of [
      "rev_27",
      "ebitda_27",
      "ebit_27",
      "eps_27",
      "fcf_27",
      "pt_avg",
    ] as const) {
      expect(
        compiled.inspectCell("TradingCompsForward", "COST", col).isFormula
      ).toBe(true)
    }

    const ueTable = compiled.table("ClubUnitEconomics")
    expect(ueTable.value("merch_gross_profit", "COST_US")).toBeNull()
    expect(ueTable.value("paid_members_m", "COST_US")).toBeNull()
    expect(ueTable.value("paid_members_m", "WMT_SAMS_H1_ANN")).toBeNull()
    expect(ueTable.value("sales_floor_sqft_m", "BJ")).toBeNull()
    expect(ueTable.value("entry_fee", "PSMT")).toBeNull()
    expect(ueTable.num("total_revenue", "WMT_SAMS_H1_ANN")).toBe(100892)
    expect(ueTable.num("operating_income", "WMT_SAMS_H1_ANN")).toBe(2704)
    expect(ueTable.num("rev_per_club", "COST_US")).toBeGreaterThan(330)

    // Verify ClubUnitEconomics live formulas across annualized, LTM-bridged, GP, SG&A, comp, and tier mix cells
    for (const r of [
      "net_sales",
      "mfi_and_other",
      "total_revenue",
      "merch_gross_profit",
      "total_gross_profit_incl_mfi",
      "sga",
      "operating_income",
      "da",
      "capex",
      "comp_ex_fuel",
    ] as const) {
      expect(
        compiled.inspectCell("ClubUnitEconomics", r, "WMT_SAMS_H1_ANN")
          .isFormula,
        `ClubUnitEconomics["${r}", "WMT_SAMS_H1_ANN"] must be a live formula`
      ).toBe(true)
    }
    for (const r of [
      "net_sales",
      "mfi_and_other",
      "total_revenue",
      "merch_gross_profit",
      "total_gross_profit_incl_mfi",
      "sga",
      "operating_income",
      "da",
      "capex",
    ] as const) {
      expect(
        compiled.inspectCell("ClubUnitEconomics", r, "BJ").isFormula,
        `ClubUnitEconomics["${r}", "BJ"] must be a live formula`
      ).toBe(true)
    }
    for (const col of [
      "COST_US",
      "COST_TOTAL",
      "WMT_SAMS_H1_ANN",
      "WMT_SAMS_FY26",
      "BJ",
      "PSMT",
    ] as const) {
      expect(
        compiled.inspectCell(
          "ClubUnitEconomics",
          "total_gross_profit_incl_mfi",
          col
        ).isFormula
      ).toBe(true)
      if (col !== "COST_US") {
        expect(
          compiled.inspectCell("ClubUnitEconomics", "merch_gross_profit", col)
            .isFormula
        ).toBe(true)
      }
    }
    expect(
      compiled.inspectCell("ClubUnitEconomics", "sga", "PSMT").isFormula
    ).toBe(true)
    expect(
      compiled.inspectCell("ClubUnitEconomics", "comp_ex_fuel", "WMT_SAMS_FY26")
        .isFormula
    ).toBe(true)
    expect(
      compiled.inspectCell("ClubUnitEconomics", "higher_tier_pct", "COST_US")
        .isFormula
    ).toBe(true)
    expect(
      compiled.inspectCell("ClubUnitEconomics", "higher_tier_pct", "COST_TOTAL")
        .isFormula
    ).toBe(true)

    const ueBridge = compiled.table("ClubUnitEconBridge")
    for (const r of ueBridge.rows) {
      expect(
        compiled.dependentsOf("ClubUnitEconBridge", r, "val").directCount,
        `ClubUnitEconBridge["${r}", "val"] has 0 dependents`
      ).toBeGreaterThan(0)
    }

    expect(
      compiled.num("FootballField", "blended_total", "weight")
    ).toBeCloseTo(1.0, 6)
    expect(
      Math.abs(
        compiled.num("FootballField", "blended_total", "cum_div_price") -
          compiled.num("FootballField", "blended_total", "weighted_cum_div")
      )
    ).toBeLessThan(1e-4)

    for (const col of [
      "active_live",
      "base_to_bull",
      "base_to_bear",
    ] as const) {
      expect(
        Math.abs(compiled.num("ScenarioVariance", "tie_out_check", col))
      ).toBeLessThan(1e-4)
    }
    expect(
      Math.abs(
        compiled.num("PublicPriceAttribution", "implied_ev_return", "val") -
          compiled.num("PublicPriceAttribution", "ev_return_check", "val")
      )
    ).toBeLessThan(1e-4)
    expect(
      Math.abs(
        compiled.num("PublicPriceAttribution", "equity_return_check", "val")
      )
    ).toBeLessThan(1e-6)
  })

  it("passes TableAuditor error checks, formula liveness, MarketAnchors deps, DebtTranches links, and Excel emission", () => {
    for (const sc of SCENARIOS) {
      using compiled = compileCostcoModel(sc)
      const summary = compiled.summary()
      expect(summary.totalSheets).toBe(9)
      expect(summary.totalTables).toBeGreaterThanOrEqual(30)

      for (const s of summary.sheets) {
        const sheetInsp = compiled.inspectSheet(s.name)
        for (const t of s.tables) {
          const tableInsp = compiled.inspectTable(t.id)
          const descCols = tableInsp.columns.filter((c) => c.isDescriptor)
          expect(descCols.length).toBe(1)
          expect(tableInsp.subtitles.length).toBeGreaterThanOrEqual(2)
          for (const subLine of tableInsp.subtitles) {
            expect(subLine.trim().length).toBeGreaterThan(0)
            expect(
              subLine.length,
              `Subtitle line "${subLine}" in ${t.id} exceeds 160 chars`
            ).toBeLessThanOrEqual(160)
          }
          for (const col of tableInsp.columns) {
            if (!col.isDescriptor && !col.isGutter) {
              for (const hdrLine of col.headers) {
                expect(
                  hdrLine.length,
                  `Header line "${hdrLine}" in ${t.id}.${String(col.id)} exceeds 11 chars`
                ).toBeLessThanOrEqual(11)
              }
            }
          }
          const ta = compiled.table(t.id)
          for (const r of ta.rows) {
            for (const c of ta.measureColumns) {
              const v = ta.value(r, c)
              expect(
                typeof v === "string" && v.startsWith("#"),
                `Cell ${t.id}["${r}", "${c}"] evaluated to Excel error ${String(v)}`
              ).toBe(false)
            }
          }
        }
        for (const rowInsp of sheetInsp.rows) {
          for (const cellInsp of rowInsp.cells) {
            if (cellInsp.kind === "data" && !cellInsp.isDescriptor) {
              expect(
                sheetInsp.colWidths[cellInsp.physicalCol],
                `Physical measure column ${cellInsp.physicalCol} on sheet "${s.name}" stretched above 12`
              ).toBe(12)
            }
          }
        }
      }

      const periodActive = compiled.table("PeriodAssumptionsActive")
      for (const r of periodActive.rows) {
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

      const scalarActive = compiled.table("ScalarAssumptionsActive")
      for (const r of scalarActive.rows) {
        expect(
          compiled.inspectCell("ScalarAssumptionsActive", r, "val").isFormula
        ).toBe(true)
        expect(
          compiled.dependentsOf("ScalarAssumptionsActive", r, "val").directCount
        ).toBeGreaterThan(0)
      }

      const marketAnchors = compiled.table("MarketAnchors")
      for (const r of marketAnchors.rows) {
        expect(
          compiled.dependentsOf("MarketAnchors", r, "val").directCount,
          `MarketAnchors["${r}", "val"] has 0 dependents`
        ).toBeGreaterThan(0)
      }

      expect(
        compiled.inspectCell("MarketAnchors", "cost_reg_dps_annualized", "val")
          .isFormula
      ).toBe(true)
      expect(
        compiled.inspectCell("MarketAnchors", "fy21_cash_sti", "val").isFormula
      ).toBe(true)

      expect(
        compiled.inspectCell("DebtTranches", "tranche_japan", "coupon_rate")
          .isFormula
      ).toBe(true)
      for (const p of ["FY32E", "FY33E", "FY34E", "FY35E", "FY36E"] as const) {
        expect(
          compiled.inspectCell("DebtTranches", "tranche_japan", p).isFormula
        ).toBe(true)
      }
      expect(
        compiled.num("DebtTranches", "tranche_japan", "coupon_rate")
      ).toBeCloseTo(0.0235, 6)
      expect(
        compiled.value("DebtTranches", "tranche_may27", "maturity_date")
      ).toBe("May 2027")
      expect(
        compiled.value("DebtTranches", "tranche_jun27", "maturity_date")
      ).toBe("Jun 2027")
      expect(
        compiled.value("DebtTranches", "tranche_apr30", "maturity_date")
      ).toBe("Apr 2030")
      expect(
        compiled.value("DebtTranches", "tranche_apr32", "maturity_date")
      ).toBe("Apr 2032")

      // Verify historical live formulas across 3-statement schedules
      for (const p of HISTORICAL_PERIODS) {
        expect(
          compiled.inspectCell("OperatingSchedule", "gas_fx_comp_impact", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("IncomeStatement", "fx_and_other_non_op", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("IncomeStatement", "regular_dps", p).isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("ShareEquitySchedule", "shares_repurchased", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell(
            "ShareEquitySchedule",
            "regular_dividends_paid",
            p
          ).isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("ShareEquitySchedule", "rsu_tax_withholdings", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell(
            "ShareEquitySchedule",
            "common_stock_and_apic",
            p
          ).isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("WorkingCapitalPPE", "other_current_liab_op", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("WorkingCapitalPPE", "other_lt_op_liab", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("WorkingCapitalPPE", "capex", p).isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell(
            "DebtLeasesSchedule",
            "scheduled_lt_debt_repayments",
            p
          ).isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("DebtLeasesSchedule", "total_op_lease_liab", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("DebtLeasesSchedule", "total_fin_lease_liab", p)
            .isFormula
        ).toBe(true)
        expect(
          compiled.inspectCell("DebtLeasesSchedule", "debt_interest_est", p)
            .isFormula
        ).toBe(true)
      }

      expect(
        Math.abs(
          compiled.num("PublicPriceAttribution", "equity_return_check", "val")
        )
      ).toBeLessThan(1e-6)

      const bytes = compiled.emitWorkbook()
      expect(bytes.byteLength).toBeGreaterThan(10_000)
    }
  })

  it("handles extreme low equity price stress ($100/sh) cleanly with NA() guards and zero #NUM!/#DIV/0! errors", () => {
    const wb = buildCostcoWorkbook("Base")
    wb.getTable("MarketAnchors").setCell("cost_close_price", "val", 100)
    using stressed = wb.compile()

    expect(
      stressed.value("ReverseDcfTable", "implied_10y_fcff_cagr", "val")
    ).toBe("#N/A")
    expect(
      Math.abs(
        stressed.num("PublicPriceAttribution", "equity_return_check", "val")
      )
    ).toBeLessThan(1e-6)

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
  })
})
