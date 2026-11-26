import { describe, expect, it } from "vitest"
import { buildMetaModel, compileMetaModel } from "../models/index.ts"
import { BS_ALL_PERIODS, FLOW_ALL_PERIODS } from "../models/timeline.ts"

describe("C7: Boundary stress tests & live ScenarioControl toggle", () => {
  it("C7a: WACC <= g guard returns #N/A cleanly on both active and base-parameter EV/price at g === WACC and g > WACC", () => {
    const baseRef = compileMetaModel("base")
    const exactBaseWacc = baseRef.num("WaccBuild", "wacc_base_ref", "val")
    baseRef.dispose()

    for (const gTest of [exactBaseWacc, 0.12]) {
      const model = buildMetaModel("base")
      model
        .getTable("ScalarDrivers")
        .setCell("terminalGrowthRate", "base", gTest)
      const compiled = model.compile()
      try {
        expect(compiled.value("DcfBridge", "terminal_value", "val")).toBe(
          "#N/A"
        )
        expect(compiled.value("DcfBridge", "implied_ev", "val")).toBe("#N/A")
        expect(compiled.value("DcfBridge", "implied_share_price", "val")).toBe(
          "#N/A"
        )
        expect(
          compiled.value("DcfDilutionAndSpotAnchor", "term_val_at_base", "val")
        ).toBe("#N/A")
        expect(
          compiled.value("DcfDilutionAndSpotAnchor", "ev_at_base_params", "val")
        ).toBe("#N/A")
        expect(
          compiled.value("DcfDilutionAndSpotAnchor", "px_at_base_params", "val")
        ).toBe("#N/A")
      } finally {
        compiled.dispose()
      }
    }
  }, 60_000)

  it("C7b: -25% and -45% revenue contraction stress preserves 0.0 BS/CF/IC identities and non-negative cash via revolver sweep", () => {
    // 1. -25% revenue shock on Downside
    const stress25 = buildMetaModel("downside")
    stress25
      .getTable("ScalarDrivers")
      .setCell("revenueStressShockPct", "downside", -0.25)
    const c25 = stress25.compile()
    try {
      for (const p of BS_ALL_PERIODS) {
        expect(
          Math.abs(c25.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(c25.num("InvestedCapitalRoic", "ic_tie_check", p))
        ).toBeLessThan(1e-6)
        expect(
          c25.num("BalanceSheet", "cash_and_equivalents", p)
        ).toBeGreaterThanOrEqual(0)
        expect(
          c25.num("BalanceSheet", "marketable_securities", p)
        ).toBeGreaterThanOrEqual(0)
      }
      for (const p of FLOW_ALL_PERIODS) {
        expect(
          Math.abs(c25.num("CashReconAndFcf", "cash_tie_check", p))
        ).toBeLessThan(1e-6)
      }
    } finally {
      c25.dispose()
    }

    // 2. Extreme liquidity stress (-45% shock + severe capex spike) explicitly exercises revolver draw while holding exact 0.0 identities
    const stressExtreme = buildMetaModel("downside")
    stressExtreme
      .getTable("ScalarDrivers")
      .setCell("revenueStressShockPct", "downside", -0.45)
    stressExtreme
      .getTable("ScalarDrivers")
      .setCell("fy26TotalCapex", "downside", 235_000)
    stressExtreme
      .getTable("VectorDriversDownside")
      .setCell("capexPctRevenue", "2027E", 0.9)
    const cExt = stressExtreme.compile()
    try {
      let maxRevolver = 0
      for (const p of BS_ALL_PERIODS) {
        expect(
          Math.abs(cExt.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(cExt.num("InvestedCapitalRoic", "ic_tie_check", p))
        ).toBeLessThan(1e-6)
        expect(
          cExt.num("BalanceSheet", "total_cash_and_mkt_sec", p)
        ).toBeGreaterThanOrEqual(15_000 - 1e-6)
        maxRevolver = Math.max(
          maxRevolver,
          cExt.num("BalanceSheet", "short_term_revolver", p)
        )
      }
      expect(maxRevolver).toBeGreaterThan(0)
      for (const p of FLOW_ALL_PERIODS) {
        expect(
          Math.abs(cExt.num("CashReconAndFcf", "cash_tie_check", p))
        ).toBeLessThan(1e-6)
      }
    } finally {
      cExt.dispose()
    }
  }, 25_000)

  it("C7c: toggling ScenarioControl (1/2/3) dynamically reproduces exact Downside, Base, and Upside outputs", () => {
    const refDown = compileMetaModel("downside")
    const refBase = compileMetaModel("base")
    const refUp = compileMetaModel("upside")
    try {
      const refs = [
        [1, refDown],
        [2, refBase],
        [3, refUp],
      ] as const

      for (const [idx, ref] of refs) {
        const m = buildMetaModel("base")
        m.getTable("ScenarioControl").setCell("active", "val", idx)
        const toggled = m.compile()
        try {
          expect(
            toggled.num("IncomeStatement", "revenue", "2031E")
          ).toBeCloseTo(ref.num("IncomeStatement", "revenue", "2031E"), 6)
          expect(
            toggled.num("IncomeStatement", "normalized_ebit", "2031E")
          ).toBeCloseTo(
            ref.num("IncomeStatement", "normalized_ebit", "2031E"),
            6
          )
          expect(toggled.num("WaccBuild", "wacc", "val")).toBeCloseTo(
            ref.num("WaccBuild", "wacc", "val"),
            6
          )
          expect(toggled.num("DcfBridge", "implied_ev", "val")).toBeCloseTo(
            ref.num("DcfBridge", "implied_ev", "val"),
            6
          )
          expect(
            toggled.num("DcfBridge", "implied_share_price", "val")
          ).toBeCloseTo(ref.num("DcfBridge", "implied_share_price", "val"), 6)
        } finally {
          toggled.dispose()
        }
      }
    } finally {
      refDown.dispose()
      refBase.dispose()
      refUp.dispose()
    }
  }, 25_000)

  it("C7d: severe -75% / -90% contraction preserves zero-phantom-tax-shield parity and guards negative P/E, EBITDA conversion, and unattained Rf breakeven with #N/A", () => {
    // 1. -75% revenue contraction drives FY27E clean EBIT negative -> zero phantom tax shield, #N/A FY27 P/E, #N/A unattained Rf breakeven
    const stress75 = buildMetaModel("downside")
    stress75
      .getTable("ScalarDrivers")
      .setCell("revenueStressShockPct", "downside", -0.75)
    const c75 = stress75.compile()
    try {
      for (const p of BS_ALL_PERIODS) {
        expect(
          Math.abs(c75.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(c75.num("InvestedCapitalRoic", "ic_tie_check", p))
        ).toBeLessThan(1e-6)
      }
      for (const p of FLOW_ALL_PERIODS) {
        expect(
          Math.abs(c75.num("CashReconAndFcf", "cash_tie_check", p))
        ).toBeLessThan(1e-6)
      }
      expect(
        c75.num("IncomeStatement", "normalized_ebit", "2027E")
      ).toBeLessThan(0)
      expect(
        c75.num("IncomeStatement", "normalized_net_income", "2027E")
      ).toBeCloseTo(
        c75.num("IncomeStatement", "net_income_to_common", "2027E"),
        6
      )
      expect(
        c75.num("InvestedCapitalRoic", "normalized_nopat", "2027E")
      ).toBeCloseTo(c75.num("IncomeStatement", "normalized_ebit", "2027E"), 6)
      expect(c75.value("ReturnAttribution", "scen_pe_fy27", "active")).toBe(
        "#N/A"
      )
      expect(c75.value("ScenarioComparison", "rf_breakeven_yr", "active")).toBe(
        "#N/A"
      )
    } finally {
      c75.dispose()
    }

    // 2. -90% contraction drives FY27E normalized EBITDA negative -> fcf_conversion_ebitda evaluates cleanly to #N/A
    const stress90 = buildMetaModel("downside")
    stress90
      .getTable("ScalarDrivers")
      .setCell("revenueStressShockPct", "downside", -0.9)
    const c90 = stress90.compile()
    try {
      expect(
        c90.num("IncomeStatement", "normalized_ebitda", "2027E")
      ).toBeLessThan(0)
      expect(
        c90.value("CashDeploymentSbc", "fcf_conversion_ebitda", "2027E")
      ).toBe("#N/A")
      expect(
        c90.num("IncomeStatement", "normalized_net_income", "2027E")
      ).toBeCloseTo(
        c90.num("IncomeStatement", "net_income_to_common", "2027E"),
        6
      )
    } finally {
      c90.dispose()
    }
  }, 30_000)
})
