import { describe, expect, it } from "vitest"
import {
  buildMetaModel,
  compileMetaModel,
  flexGrowthCapexBundle,
  loadAllScenarioDrivers,
  loadAuditedModelData,
} from "../models/index.ts"
import { ALL_PEERS, type MarketTicker } from "../models/kg-extractors.ts"
import { SCENARIO_IDS } from "../models/timeline.ts"

function closedFormOlsBeta(
  prices: Readonly<
    Record<MarketTicker, Readonly<Record<string, number | null>>>
  >,
  periods: readonly string[],
  ticker: MarketTicker
): { readonly raw: number; readonly blume: number; readonly r2: number } {
  const rs: number[] = []
  const rm: number[] = []
  for (let i = 1; i < periods.length; i++) {
    const p1 = periods[i]
    const p0 = periods[i - 1]
    if (p1 === undefined || p0 === undefined) continue
    const s1 = prices[ticker][p1]
    const s0 = prices[ticker][p0]
    const m1 = prices.GSPC[p1]
    const m0 = prices.GSPC[p0]
    if (
      s1 !== null &&
      s1 !== undefined &&
      s0 !== null &&
      s0 !== undefined &&
      m1 !== null &&
      m1 !== undefined &&
      m0 !== null &&
      m0 !== undefined
    ) {
      rs.push(s1 / s0 - 1)
      rm.push(m1 / m0 - 1)
    }
  }
  const n = rs.length
  const meanS = rs.reduce((a, b) => a + b, 0) / n
  const meanM = rm.reduce((a, b) => a + b, 0) / n
  let cov = 0
  let varM = 0
  let varS = 0
  for (let i = 0; i < n; i++) {
    const ds = (rs[i] ?? 0) - meanS
    const dm = (rm[i] ?? 0) - meanM
    cov += ds * dm
    varM += dm * dm
    varS += ds * ds
  }
  const raw = cov / varM
  return {
    raw,
    blume: (2 / 3) * raw + 1 / 3,
    r2: (cov * cov) / (varM * varS),
  }
}

describe("C4-C6: Live OLS betas, piecewise METAM conversion, attributions & comps", () => {
  const data = loadAuditedModelData()

  it("C4: matches exact closed-form 5Y monthly and 2Y weekly OLS betas across META and all 6 peers", () => {
    const compiled = compileMetaModel("base")
    try {
      // Confirm trailing duplicate 2026-11-20 bar is excluded
      expect(data.monthlyPrices5Y.periods.at(-1)).toBe("2026-10-01")
      expect(data.monthlyPrices5Y.periods.length).toBe(59)
      expect(data.weeklyPrices2Y.periods.at(-1)).toBe("2026-11-16")
      expect(data.weeklyPrices2Y.periods.length).toBe(105)

      const tickers: readonly ("META" | (typeof ALL_PEERS)[number])[] = [
        "META",
        ...ALL_PEERS,
      ]
      for (const t of tickers) {
        const exp5y = closedFormOlsBeta(
          data.monthlyPrices5Y.values,
          data.monthlyPrices5Y.periods,
          t
        )
        const exp2y = closedFormOlsBeta(
          data.weeklyPrices2Y.values,
          data.weeklyPrices2Y.periods,
          t
        )
        expect(compiled.num("BetaSummary", t, "beta_5y_raw")).toBeCloseTo(
          exp5y.raw,
          6
        )
        expect(compiled.num("BetaSummary", t, "beta_5y_blume")).toBeCloseTo(
          exp5y.blume,
          6
        )
        expect(compiled.num("BetaSummary", t, "r2_5y")).toBeCloseTo(exp5y.r2, 6)
        expect(compiled.num("BetaSummary", t, "beta_2y_raw")).toBeCloseTo(
          exp2y.raw,
          6
        )
        expect(compiled.num("BetaSummary", t, "beta_2y_blume")).toBeCloseTo(
          exp2y.blume,
          6
        )
        expect(compiled.num("BetaSummary", t, "r2_2y")).toBeCloseTo(exp2y.r2, 6)
      }

      // Spec calibration targets
      expect(
        Math.abs(compiled.num("BetaSummary", "META", "beta_5y_raw") - 1.287)
      ).toBeLessThan(0.005)
      expect(
        Math.abs(compiled.num("BetaSummary", "META", "beta_2y_raw") - 1.638)
      ).toBeLessThan(0.005)
    } finally {
      compiled.dispose()
    }
  }, 60_000)

  it("C5: reconciles non-circular 4-regime TSM RSU + METAM conversion & 46M forward equity across all 4 regimes", () => {
    const assertFourRegimeIdentity = (
      c: ReturnType<typeof compileMetaModel>,
      label: string
    ): number => {
      const p = c.num("DcfBridge", "implied_share_price", "val")
      const basic = c.num(
        "DcfDilutionAndSpotAnchor",
        "basic_shares_cover",
        "val"
      )
      const fwd = c.num("DcfDilutionAndSpotAnchor", "fwd_shares", "val")
      const rsuUnvested = c.num(
        "DcfDilutionAndSpotAnchor",
        "rsu_unvested_shares",
        "val"
      )
      const rsuUnrec = c.num(
        "DcfDilutionAndSpotAnchor",
        "rsu_unrecognized_comp",
        "val"
      )
      const mcpSh = c.num("DcfDilutionAndSpotAnchor", "mcp_conv_shares", "val")
      const mcpCash = c.num("DcfBridge", "mcp_cash_claim", "val")
      const coreEq = c.num("DcfBridge", "core_eq_pre_mcp", "val")
      const rsuInc = Math.max(0, rsuUnvested - rsuUnrec / p)
      expect(
        c.num("DcfDilutionAndSpotAnchor", "rsu_tsm_inc_shares", "val"),
        `${label} TSM RSU mismatch`
      ).toBeCloseTo(rsuInc, 6)
      const lhs = p * (basic + fwd + rsuInc + mcpSh) - mcpCash
      expect(
        Math.abs(lhs - coreEq),
        `${label} exact 4-regime identity mismatch`
      ).toBeLessThan(1e-3)
      return p
    }

    // Regime 1 (P <= $562.12): Base -> 0.0M TSM RSUs, 20.0M METAM max conversion
    const base = compileMetaModel("base")
    try {
      const px1 = assertFourRegimeIdentity(base, "Regime 1 (Base)")
      expect(px1).toBeLessThanOrEqual(562.12)
      expect(
        base.num("DcfDilutionAndSpotAnchor", "rsu_tsm_inc_shares", "val")
      ).toBe(0)
      expect(
        base.num("DcfDilutionAndSpotAnchor", "mcp_conv_shares", "val")
      ).toBeCloseTo(20.0, 6)
      expect(base.num("DcfBridge", "mcp_cash_claim", "val")).toBe(0)
    } finally {
      base.dispose()
    }

    // Regime 2 ($562.12 < P < $625.00): flex ERP = 3.55% -> positive TSM RSUs + 20.0M METAM max conversion
    const reg2Model = buildMetaModel("base")
    reg2Model
      .getTable("ScalarDrivers")
      .setCell("equityRiskPremium", "base", 0.0355)
    const reg2 = reg2Model.compile()
    try {
      const px2 = assertFourRegimeIdentity(reg2, "Regime 2 (TSM + Max METAM)")
      expect(px2).toBeGreaterThan(562.12)
      expect(px2).toBeLessThan(625)
      expect(
        reg2.num("DcfDilutionAndSpotAnchor", "rsu_tsm_inc_shares", "val")
      ).toBeGreaterThan(0)
      expect(
        reg2.num("DcfDilutionAndSpotAnchor", "mcp_conv_shares", "val")
      ).toBeCloseTo(20.0, 6)
      expect(reg2.num("DcfBridge", "mcp_cash_claim", "val")).toBe(0)
    } finally {
      reg2.dispose()
    }

    // Regime 3 ($625.00 <= P <= $734.21): flex ERP = 2.85% -> positive TSM RSUs + -$12,500M fixed METAM cash claim
    const reg3Model = buildMetaModel("base")
    reg3Model
      .getTable("ScalarDrivers")
      .setCell("equityRiskPremium", "base", 0.0285)
    const reg3 = reg3Model.compile()
    try {
      const px3 = assertFourRegimeIdentity(
        reg3,
        "Regime 3 (TSM + Fixed-Value METAM)"
      )
      expect(px3).toBeGreaterThanOrEqual(625)
      expect(px3).toBeLessThanOrEqual(734.215)
      expect(
        reg3.num("DcfDilutionAndSpotAnchor", "rsu_tsm_inc_shares", "val")
      ).toBeGreaterThan(0)
      expect(
        reg3.num("DcfDilutionAndSpotAnchor", "mcp_conv_shares", "val")
      ).toBe(0)
      expect(reg3.num("DcfBridge", "mcp_cash_claim", "val")).toBeCloseTo(
        -12_500,
        6
      )
    } finally {
      reg3.dispose()
    }

    // Regime 4 (P > $734.21): Upside -> positive TSM RSUs + 17.025M METAM min conversion
    const upside = compileMetaModel("upside")
    try {
      const px4 = assertFourRegimeIdentity(upside, "Regime 4 (Upside)")
      expect(px4).toBeGreaterThan(734.215)
      expect(
        upside.num("DcfDilutionAndSpotAnchor", "rsu_tsm_inc_shares", "val")
      ).toBeGreaterThan(0)
      expect(
        upside.num("DcfDilutionAndSpotAnchor", "mcp_conv_shares", "val")
      ).toBeCloseTo(17.025, 6)
      expect(upside.num("DcfBridge", "mcp_cash_claim", "val")).toBe(0)
    } finally {
      upside.dispose()
    }
  }, 25_000)

  it("C6: reconciles Scenario Variance Attribution and 3-Factor Return Attribution within 1e-6 relative tolerance", () => {
    const compiled = compileMetaModel("base")
    try {
      // Scenario Variance Attribution (Downside, Upside, Active)
      for (const col of ["downside", "upside", "active"] as const) {
        const evCheck = compiled.num(
          "ScenarioVarianceAttribution",
          "ev_recon_check",
          col
        )
        const pxCheck = compiled.num(
          "ScenarioVarianceAttribution",
          "px_recon_check",
          col
        )
        expect(Math.abs(evCheck)).toBeLessThan(1e-6)
        expect(Math.abs(pxCheck)).toBeLessThan(1e-6)
      }

      // Public-Equity 3-Factor Return Attribution (Downside, Base, Upside, Active)
      for (const col of ["downside", "base", "upside", "active"] as const) {
        const retCheck = compiled.num(
          "ReturnAttribution",
          "return_recon_check",
          col
        )
        expect(Math.abs(retCheck)).toBeLessThan(1e-6)
      }

      // Comps 0D null suppression on NM denominators & Growth×CapEx center-cell parity
      expect(
        compiled.value("TradingComps", "AMZN", "ev_ebitda_capex")
      ).toBeNull()
      expect(compiled.value("TradingComps", "SNAP", "ev_ebitda")).toBeNull()
      expect(compiled.value("TradingComps", "SNAP", "ev_ebit")).toBeNull()
      expect(
        compiled.value("TradingComps", "SNAP", "ev_ebitda_capex")
      ).toBeNull()
      expect(compiled.value("TradingComps", "SNAP", "pe_fy1")).toBeNull()

      // SensGrowthCapexPx center cell matches Base DCF share price identically ($0.00 recon)
      expect(compiled.num("SensGrowthCapexPx", "gr3", "cx3")).toBeCloseTo(
        compiled.num("DcfBridge", "implied_share_price", "val"),
        6
      )
      expect(
        Math.abs(compiled.num("SensGrowthCapexPx", "center_recon_check", "cx3"))
      ).toBeLessThan(1e-6)

      // Exact 25-point full-model 2D Growth × CapEx sensitivity grid corner parity (< $0.01/sh)
      const baseBundles = loadAllScenarioDrivers()
      const corners: readonly (readonly [string, string, number, number])[] = [
        ["gr1", "cx5", -0.04, 0.28],
        ["gr5", "cx1", 0.04, 0.17],
      ]
      for (const [rId, cId, shift, capexTarget] of corners) {
        const direct = compileMetaModel({
          scenario: "base",
          bundles: flexGrowthCapexBundle(
            baseBundles,
            "base",
            shift,
            capexTarget
          ),
          includeCrossScenarioSnapshots: false,
          includeGrowthCapexGrid: false,
          includeTornadoAndIndifference: false,
        })
        try {
          const gridPx = compiled.num("SensGrowthCapexPx", rId, cId)
          const directPx = direct.num("DcfBridge", "implied_share_price", "val")
          expect(Math.abs(gridPx - directPx)).toBeLessThan(0.01)
        } finally {
          direct.dispose()
        }
      }

      // PeerLtmCapexSbc apples-to-apples finance lease principal inclusion in LTM CapEx & PeerConsensusEps MSFT CY calendarization
      const expectedFlp: Readonly<Record<string, number>> = {
        GOOGL: 3544,
        AMZN: 1681,
        MSFT: 3462,
        PINS: 0,
        SNAP: 0,
        RDDT: 0,
      }
      for (const [ticker, flpVal] of Object.entries(expectedFlp)) {
        expect(compiled.num("PeerLtmCapexSbc", ticker, "ltm_flp")).toBeCloseTo(
          flpVal,
          6
        )
        const ppe = -(
          compiled.num("PeerLtmCapexSbc", ticker, "cx_fy") +
          compiled.num("PeerLtmCapexSbc", ticker, "cx_ytd1") -
          compiled.num("PeerLtmCapexSbc", ticker, "cx_ytd0")
        )
        expect(
          compiled.num("PeerLtmCapexSbc", ticker, "ltm_capex")
        ).toBeCloseTo(ppe + flpVal, 6)
      }
      expect(compiled.num("PeerConsensusEps", "MSFT", "eps_cy26")).toBeCloseTo(
        (17.95 + 19.91) / 2,
        6
      )
      expect(compiled.num("PeerConsensusEps", "MSFT", "eps_cy27")).toBeCloseTo(
        (19.91 + 23.81) / 2,
        6
      )
      expect(compiled.num("PeerConsensusEps", "MSFT", "eps_cy28")).toBeCloseTo(
        (23.81 + 29.27) / 2,
        6
      )

      // TradingComps["META", "roic"] aligns on Q3 2026 ending peer-aligned financing IC (Equity + Carrying Debt - Cash)
      const metaLtmCleanNopat =
        compiled.num("IncomeStatement", "normalized_ebit", "LTM Q3 26") *
        (1 - compiled.num("ScalarDrivers", "effectiveTaxRate", "base"))
      const metaEndingPeerIc =
        compiled.num("BalanceSheet", "total_stockholders_equity", "Q3 26A") +
        compiled.num("BalanceSheet", "long_term_debt", "Q3 26A") +
        compiled.num(
          "DebtHybridShareSchedule",
          "current_portion_lt_debt",
          "Q3 26A"
        ) -
        compiled.num("BalanceSheet", "total_cash_and_mkt_sec", "Q3 26A")
      expect(compiled.num("TradingComps", "META", "roic")).toBeCloseTo(
        metaLtmCleanNopat / metaEndingPeerIc,
        6
      )

      // Mid-year terminal value discounting symmetry: toggling midYearDiscountingFlag 1 -> 0 scales TV by 1 / (1 + WACC)^0.5
      const yeModel = buildMetaModel("base")
      yeModel
        .getTable("ScalarDrivers")
        .setCell("midYearDiscountingFlag", "base", 0)
      const yeCompiled = yeModel.compile()
      try {
        const waccBase = compiled.num("WaccBuild", "wacc", "val")
        const tvMid = compiled.num("DcfBridge", "pv_terminal_value", "val")
        const tvYe = yeCompiled.num("DcfBridge", "pv_terminal_value", "val")
        expect(tvMid / tvYe).toBeCloseTo(Math.sqrt(1 + waccBase), 6)
        const pxShift =
          compiled.num("DcfBridge", "implied_share_price", "val") -
          yeCompiled.num("DcfBridge", "implied_share_price", "val")
        expect(pxShift).toBeGreaterThan(20)
        expect(pxShift).toBeLessThan(35)
      } finally {
        yeCompiled.dispose()
      }

      // Live Hamada beta relevering & fair-value pure debt weight verification
      expect(compiled.num("WaccBuild", "pf_pure_debt", "val")).toBeCloseTo(
        73_310 + 15_000 + 9_000 * 1.1056,
        3
      )
      const histDe = compiled.num("WaccBuild", "hist_avg_de_ratio", "val")
      expect(histDe).toBeGreaterThan(0.028)
      expect(histDe).toBeLessThan(0.032)
      const tax = compiled.num("WaccBuild", "tax_rate", "val")
      const pfDe = compiled.num("WaccBuild", "pf_de_ratio", "val")
      const unlev = compiled.num("WaccBuild", "unlevered_beta", "val")
      expect(compiled.num("WaccBuild", "active_beta", "val")).toBeCloseTo(
        unlev * (1 + (1 - tax) * pfDe),
        6
      )

      // Upside consolidated EBIT margin stays disciplined <= 44.5%
      const upCompiled = compileMetaModel("upside")
      try {
        expect(
          upCompiled.num("IncomeStatement", "normalized_ebit_margin", "2031E")
        ).toBeLessThanOrEqual(0.445)
      } finally {
        upCompiled.dispose()
      }
    } finally {
      compiled.dispose()
    }
  }, 25_000)

  it("verifies scenario-invariant spot EV ($560.84 exact inverse) and 100% Q4 2026E cash-flow conservation", () => {
    const spotEvByScenario: number[] = []
    for (const scen of SCENARIO_IDS) {
      const c = compileMetaModel(scen)
      try {
        const spotPx = c.num("WaccBuild", "spot_price", "val")
        const basicSh = c.num("WaccBuild", "basic_shares_cover", "val")
        expect(c.num("WaccBuild", "spot_mkt_cap", "val")).toBeCloseTo(
          spotPx * basicSh,
          6
        )

        const spotEv = c.num("DcfDilutionAndSpotAnchor", "spot_pf_ev", "val")
        spotEvByScenario.push(spotEv)

        if (scen === "base") {
          // Substituting spot_pf_ev into the exact 4-regime TSM RSU + METAM bridge reproduces spot ($560.84)
          const netBridge = c.num("DcfBridge", "net_bridge_ex_mcp", "val")
          const evRsu = c.num(
            "DcfDilutionAndSpotAnchor",
            "ev_rsu_cutoff",
            "val"
          )
          const evLower = c.num(
            "DcfDilutionAndSpotAnchor",
            "ev_lower_cutoff",
            "val"
          )
          const evUpper = c.num(
            "DcfDilutionAndSpotAnchor",
            "ev_upper_cutoff",
            "val"
          )
          const shMax = c.num(
            "DcfDilutionAndSpotAnchor",
            "shares_max_conv",
            "val"
          )
          const shMin = c.num(
            "DcfDilutionAndSpotAnchor",
            "shares_min_conv",
            "val"
          )
          const shFwd = c.num(
            "DcfDilutionAndSpotAnchor",
            "shares_with_fwd",
            "val"
          )
          const rsuU = c.num(
            "DcfDilutionAndSpotAnchor",
            "rsu_unvested_shares",
            "val"
          )
          const rsuC = c.num(
            "DcfDilutionAndSpotAnchor",
            "rsu_unrecognized_comp",
            "val"
          )
          const mcpPref = c.num(
            "PostQ3FinancingRegistry",
            "mcp_base_liq_pref",
            "val"
          )
          const reconstructedPx =
            spotEv < evRsu
              ? (spotEv + netBridge) / shMax
              : spotEv < evLower
                ? (spotEv + netBridge + rsuC) / (shMax + rsuU)
                : spotEv <= evUpper
                  ? (spotEv + netBridge - mcpPref + rsuC) / (shFwd + rsuU)
                  : (spotEv + netBridge + rsuC) / (shMin + rsuU)
          expect(Math.abs(reconstructedPx - spotPx)).toBeLessThan(1e-4)
        }

        // Elapsed 51/92 Q4 burn + discounted 41/92 stub FCFF = 100% of Q4 2026E FCFF
        const elapsedBurn = c.num("DcfBridge", "elapsed_q4_fcff_burn", "val")
        const stubFcff = c.num("DcfFcff", "stub_adj_fcff", "Q4 26E")
        const fullQ4Fcff = c.num("DcfFcff", "full_period_fcff", "Q4 26E")
        expect(elapsedBurn + stubFcff).toBeCloseTo(fullQ4Fcff, 6)
        expect(elapsedBurn).toBeLessThan(0)
      } finally {
        c.dispose()
      }
    }

    // Spot pro forma EV is 100% invariant across Downside, Base, and Upside
    const firstSpotEv = spotEvByScenario[0] ?? 0
    for (const ev of spotEvByScenario) {
      expect(Math.abs(ev - firstSpotEv)).toBeLessThan(1e-6)
    }
  }, 25_000)
})
