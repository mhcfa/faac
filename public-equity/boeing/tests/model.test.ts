import { afterAll, describe, expect, it } from "vitest"
import {
  allScenarioBundles,
  compileAllScenarios,
  compileBoeingModel,
  type ScenarioKey,
} from "../models/index.ts"
import {
  ALL_BETA_ENTITIES,
  PEER_ENTITIES,
  type BetaEntity,
  type PeerEntity,
} from "../models/kg-loader.ts"
import {
  PERIOD_DRIVER_KEYS,
  SCALAR_DRIVER_KEYS,
  scalarDriver,
} from "../models/assumptions.ts"
import {
  ALL_BS_COLS,
  FORECAST_PERIODS,
  SCENARIO_KEYS,
} from "../models/timeline.ts"

const all = compileAllScenarios()

afterAll(() => {
  for (const key of SCENARIO_KEYS) {
    all.compiled[key].dispose()
  }
})

function olsStats(
  assetPrices: readonly number[],
  mktPrices: readonly number[]
): { beta: number; r2: number; blume: number } {
  const n = assetPrices.length - 1
  const rA: number[] = []
  const rM: number[] = []
  for (let i = 1; i <= n; i++) {
    rA.push(assetPrices[i]! / assetPrices[i - 1]! - 1)
    rM.push(mktPrices[i]! / mktPrices[i - 1]! - 1)
  }
  const meanA = rA.reduce((a, b) => a + b, 0) / n
  const meanM = rM.reduce((a, b) => a + b, 0) / n
  let cov = 0
  let varM = 0
  let varA = 0
  for (let i = 0; i < n; i++) {
    const dA = rA[i]! - meanA
    const dM = rM[i]! - meanM
    cov += dA * dM
    varM += dM * dM
    varA += dA * dA
  }
  const beta = cov / varM
  const r2 = (cov * cov) / (varA * varM)
  return { beta, r2, blume: (2 / 3) * beta + 1 / 3 }
}

describe("C1: Clean multi-scenario compilation & live OpenXML emission", () => {
  it("compiles Downside, Base, and Upside with zero runtime Excel errors", () => {
    for (const key of SCENARIO_KEYS) {
      const c = all.compiled[key]
      expect(c.errors()).toEqual([])
      const s = c.summary()
      expect(s.totalSheets).toBe(9)
      expect(s.totalFormulas).toBeGreaterThan(4500)
    }
  })

  it("emits live formula OpenXML workbook bytes without valuesOnly", () => {
    const bytes = all.compiled.base.emitWorkbook({
      title: "The Boeing Company (NYSE: BA) — Initiation & Valuation Model",
    })
    expect(bytes.byteLength).toBeGreaterThan(100_000)
    // OpenXML .xlsx is a ZIP archive starting with PK\x03\x04
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    expect(bytes[2]).toBe(0x03)
    expect(bytes[3]).toBe(0x04)
  })
})

describe("C2: Zero-plug accounting identities across all scenarios and periods", () => {
  it("ties Balance Sheet Assets == Liabilities + Equity within 1e-6", () => {
    for (const key of SCENARIO_KEYS) {
      const bs = all.compiled[key].table("BalanceSheet")
      for (const col of ALL_BS_COLS) {
        const diff = bs.num("bs_balance_check", col)
        expect(Math.abs(diff), `${key} BS[${col}]`).toBeLessThan(1e-6)
      }
    }
  })

  it("ties Cash Flow Ending Cash == Balance Sheet Cash & Equivalents within 1e-6", () => {
    const tiedCols = [
      "2022A",
      "2023A",
      "2024A",
      "2025A",
      "9M26A",
      "LTM",
      "Q4_26E",
      "2026E",
      "2027E",
      "2028E",
      "2029E",
      "2030E",
      "2031E",
      "2032E",
    ] as const
    for (const key of SCENARIO_KEYS) {
      const cf = all.compiled[key].table("CashFlowStatement")
      for (const col of tiedCols) {
        const diff = cf.num("cash_tie_check", col)
        expect(Math.abs(diff), `${key} CF[${col}]`).toBeLessThan(1e-6)
      }
    }
  })

  it("ties Two-Sided Invested Capital (Operating NOA == Financing Capital) within 1e-6", () => {
    for (const key of SCENARIO_KEYS) {
      const ic = all.compiled[key].table("InvestedCapitalRoic")
      for (const col of ALL_BS_COLS) {
        const diff = ic.num("ic_tie_check", col)
        expect(Math.abs(diff), `${key} IC[${col}]`).toBeLessThan(1e-6)
      }
    }
  })

  it("aligns all 5 BA-PRA cash dividends across DCF and 3-statement schedules", () => {
    const base = all.compiled.base
    expect(base.num("BaPraDividendPv", "total", "div_pmt")).toBeCloseTo(
      431.25,
      6
    )
    expect(
      base.num("CashFlowStatement", "pref_dividends_paid", "Q4_26E")
    ).toBeCloseTo(-86.25, 6)
    expect(
      base.num("CashFlowStatement", "pref_dividends_paid", "2027E")
    ).toBeCloseTo(-345.0, 6)
    expect(base.num("IncomeStatement", "pref_dividends", "2027E")).toBeCloseTo(
      (288 / 365) * 345,
      4
    )
    expect(
      base.num("ShareCountSchedule", "chg_pref_div_payable", "2027E")
    ).toBeCloseTo((288 / 365) * 345 - 345, 4)
  })
})

describe("C3: 1:1 KgRegistry pass-through, live formulas & zero unwired drivers", () => {
  it("traces historical, footnote & market anchors 1:1 to KgRegistry", () => {
    const base = all.compiled.base
    const { ba, market } = all.kg
    expect(base.num("IncomeStatement", "revenue_total", "2025A")).toBe(
      ba.is.revenue_total!["2025A"]
    )
    expect(base.num("IncomeStatement", "revenue_total", "9M26A")).toBe(
      ba.is.revenue_total!["9M26A"]
    )
    expect(base.num("BalanceSheet", "total_assets", "9M26A")).toBe(
      ba.bs.total_assets!["9M26A"]
    )
    expect(base.num("BalanceSheet", "cash_and_equivalents", "9M26A")).toBe(
      ba.bs.cash_and_equivalents!["9M26A"]
    )
    expect(base.num("EvToEquityBridge", "basic_shares_valdate", "val")).toBe(
      ba.sharesCoverQ326
    )
    expect(base.num("MarketSnapshot", "spot_price", "val")).toBe(market.baSpot)
    expect(base.num("WaccBuild", "rf_rate", "val")).toBe(market.dgs10)
    expect(base.num("WaccBuild", "erp", "val")).toBe(market.damodaranErp)
    expect(base.num("ConsensusBridge", "rev_cons", "2026E")).toBe(
      market.baRevConsFy26e
    )
    // Backfilled Q3 2026 / FY25 iXBRL & Table 19 disclosures traced 1:1
    expect(base.num("IncomeStatement", "qoe_hrl_gain_adj", "9M26A")).toBe(
      -ba.hrlGainQ326
    )
    expect(
      base.num("SecurityValuationInputs", "spirit_off_mkt_amort_29", "val")
    ).toBe(209)
    expect(
      base.num("SecurityValuationInputs", "pension_curr_net_delta", "val")
    ).toBeCloseTo(221, 6)
    expect(base.num("EvToEquityBridge", "less_at_pension", "val")).toBeCloseTo(
      -4675.5,
      4
    )
    expect(
      base.num("SecurityValuationInputs", "pref_dividend_rate", "val")
    ).toBe(ba.prefDividendRate)
    expect(
      base.num("SecurityValuationInputs", "spirit_exch_principal", "val")
    ).toBe(ba.spiritExchPrincipal)
    expect(
      base.num("SecurityValuationInputs", "spirit_exch_coupon", "val")
    ).toBe(ba.spiritExchCoupon)
    expect(
      base.num("SecurityValuationInputs", "spirit_exch_rate_per_1000", "val")
    ).toBe(ba.spiritExchRatePer1000)
    expect(
      base.num(
        "SecurityValuationInputs",
        "spirit_exch_underlying_shares",
        "val"
      )
    ).toBeCloseTo((230 * 6.7067) / 1000, 6)
    expect(
      base.num("SecurityValuationInputs", "spirit_exch_strike", "val")
    ).toBeCloseTo(1000 / 6.7067, 4)
  })

  it("evaluates all bridged & valuation metrics via live formulas", () => {
    const base = all.compiled.base
    const liveCoords: readonly [string, string, string][] = [
      ["IncomeStatement", "revenue_total", "LTM"],
      ["IncomeStatement", "revenue_total", "2026E"],
      ["IncomeStatement", "ebitda_qoe", "LTM"],
      ["CashFlowStatement", "headline_fcf", "2026E"],
      ["DcfSchedule", "economic_fcff", "2032E"],
      ["PostTerminalNolRunoff", "pv_nol_shield", "Total"],
      ["WaccBuild", "wacc", "val"],
      ["WaccBuild", "wacc_ig_transition_memo", "val"],
      ["SecurityValuationInputs", "spirit_exch_underlying_shares", "val"],
      ["SecurityValuationInputs", "spirit_exch_strike", "val"],
      ["SecurityValuationInputs", "pension_curr_net_delta", "val"],
      ["EvToEquityBridge", "ev_anchor", "val"],
      ["EvToEquityBridge", "implied_equity_pre", "val"],
      ["EvToEquityBridge", "implied_price", "val"],
      ["EvToEquityBridge", "ba_pra_converted_shares", "val"],
      ["EvToEquityBridge", "tsm_spirit_exch", "val"],
      ["EvToEquityBridge", "nol_wacc_per_share_delta", "val"],
      ["SotpValuation", "sotp_price", "value"],
      ["SotpValuation", "unallocated", "multiple"],
      ["SotpValuation", "fas_cas_runoff", "value"],
      ["ReverseDcfBoundaries", "clearing_wacc", "val"],
      ["ReverseDcfBoundaries", "clearing_wacc_implied_price", "val"],
      ["ConsensusBridge", "eps_norm_tax", "2029E"],
      ["PeerLtmBridge", "ge_ebit", "ltm_usd"],
      ["PeerLtmBridge", "air_pa_ebitda", "ltm_usd"],
      ["PeerEvBridge", "air_pa", "ev_usd"],
      ["TradingComps", "air_pa_usgaap", "ev_usd"],
      ["BetaStats5Y", "raw_beta", "BA"],
      ["BetaStats2Y", "raw_beta", "BA"],
    ]
    for (const [tbl, row, col] of liveCoords) {
      expect(
        base.inspectCell(tbl, row, col).isFormula,
        `${tbl}[${row}, ${col}] must be a live formula`
      ).toBe(true)
    }
  })

  it("contains zero raw KgRegistry numeric literals interpolated into formula expressions", () => {
    const base = all.compiled.base
    const allowedStructuralNums = new Set([
      "0",
      "0.0025",
      "0.25",
      "0.3475",
      "0.35",
      "0.5",
      "0.75",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "12",
      "365",
      "1000",
    ])
    const offenders: string[] = []
    for (const sheet of base.summary().sheets) {
      for (const tblMeta of sheet.tables) {
        const tbl = base.table(tblMeta.id)
        for (const r of tbl.rows) {
          for (const c of tbl.columns) {
            const info = base.inspectCell(tblMeta.id, r, c)
            if (!info.isFormula || !info.formulaExpr) continue
            // Strip quoted string keys and DATE(y, m, d) structural date literals
            const stripped = info.formulaExpr
              .replaceAll(/"[^"]*"/g, '""')
              .replaceAll(/DATE\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g, "DATE()")
            const nums = stripped.match(/(?<![A-Za-z0-9_])\d+(?:\.\d+)?/g) ?? []
            for (const n of nums) {
              if (!allowedStructuralNums.has(n)) {
                offenders.push(
                  `${tblMeta.id}[${r}, ${c}] -> ${n} in ${info.formulaExpr}`
                )
              }
            }
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("wires every active scalar and period driver row to >= 1 dependent", () => {
    const base = all.compiled.base
    for (const key of SCALAR_DRIVER_KEYS) {
      expect(
        base.dependentsOf("ScalarDrivers", key, "active").directCount,
        `ScalarDrivers[${key}, active] has no dependents`
      ).toBeGreaterThan(0)
    }
    for (const key of PERIOD_DRIVER_KEYS) {
      const totalDeps = FORECAST_PERIODS.reduce(
        (acc, p) =>
          acc + base.dependentsOf("PeriodDriversActive", key, p).directCount,
        0
      )
      expect(
        totalDeps,
        `PeriodDriversActive[${key}] has no dependents`
      ).toBeGreaterThan(0)
    }
  })
})

describe("C4: Valuation physics, 4-regime dilution solver, tax/lease symmetry & attribution", () => {
  it("satisfies 4-regime closed-form BA-PRA + Spirit TSM dilution identity across all 3 scenarios and stress prices ($50, $145, $155, $220)", () => {
    for (const key of SCENARIO_KEYS) {
      const c = all.compiled[key]
      expect(
        Math.abs(c.num("EvToEquityBridge", "collar_parity_check", "val"))
      ).toBeLessThan(1e-6)
    }
    // Downside & Base sit below $142.98 -> max BA-PRA shares (40.2155M) & 0 Spirit TSM
    expect(
      all.compiled.downside.num(
        "EvToEquityBridge",
        "ba_pra_converted_shares",
        "val"
      )
    ).toBeCloseTo(40.2155, 3)
    expect(
      all.compiled.downside.num("EvToEquityBridge", "tsm_spirit_exch", "val")
    ).toBe(0)
    // Upside sits above $171.59 -> min BA-PRA shares (33.5110M) & positive dynamic Spirit TSM
    expect(
      all.compiled.upside.num(
        "EvToEquityBridge",
        "ba_pra_converted_shares",
        "val"
      )
    ).toBeCloseTo(33.511, 3)
    const upPx = all.compiled.upside.num(
      "EvToEquityBridge",
      "implied_price",
      "val"
    )
    const sExch = all.compiled.base.num(
      "SecurityValuationInputs",
      "spirit_exch_underlying_shares",
      "val"
    )
    const fExch = all.compiled.base.num(
      "SecurityValuationInputs",
      "spirit_exch_principal",
      "val"
    )
    expect(
      all.compiled.upside.num("EvToEquityBridge", "tsm_spirit_exch", "val")
    ).toBeCloseTo(sExch - fExch / upPx, 6)

    // Verify 4-regime closed-form algebra directly at stress prices $50, $145, $155, $220
    const base = all.compiled.base
    const sBase = base.num("EvToEquityBridge", "s_base", "val")
    const sMax = base.num("EvToEquityBridge", "collar_s_max", "val")
    const sMin = base.num("EvToEquityBridge", "collar_s_min", "val")
    const pLow = base.num("EvToEquityBridge", "collar_p_low", "val")
    const pExch = base.num(
      "SecurityValuationInputs",
      "spirit_exch_strike",
      "val"
    )
    const pHigh = base.num("EvToEquityBridge", "collar_p_high", "val")
    const face = base.num("EvToEquityBridge", "pref_face_value", "val")
    const e1 = pLow * (sBase + sMax)
    const e2 = pExch * sBase + face
    const e3 = pHigh * (sBase + sExch) + face - fExch

    const eval4Regime = (
      ePre: number
    ): { p: number; sPra: number; sSpr: number } => {
      if (ePre <= e1) {
        return { p: ePre / (sBase + sMax), sPra: sMax, sSpr: 0 }
      }
      if (ePre <= e2) {
        const p = (ePre - face) / sBase
        return { p, sPra: face / p, sSpr: 0 }
      }
      if (ePre <= e3) {
        const p = (ePre - face + fExch) / (sBase + sExch)
        return { p, sPra: face / p, sSpr: sExch - fExch / p }
      }
      const p = (ePre + fExch) / (sBase + sMin + sExch)
      return { p, sPra: sMin, sSpr: sExch - fExch / p }
    }

    // Regime 1: $50 (<= $142.98)
    const e50 = 50 * (sBase + sMax)
    const r50 = eval4Regime(e50)
    expect(r50.p).toBeCloseTo(50, 6)
    expect(r50.sPra).toBeCloseTo(sMax, 6)
    expect(r50.sSpr).toBe(0)
    expect(Math.abs(r50.p * (sBase + r50.sPra + r50.sSpr) - e50)).toBeLessThan(
      1e-6
    )

    // Regime 2: $145 ($142.98 < P <= $149.10)
    const e145 = 145 * sBase + face
    const r145 = eval4Regime(e145)
    expect(r145.p).toBeCloseTo(145, 6)
    expect(r145.sPra).toBeCloseTo(face / 145, 6)
    expect(r145.sSpr).toBe(0)
    expect(
      Math.abs(r145.p * (sBase + r145.sPra + r145.sSpr) - e145)
    ).toBeLessThan(1e-6)

    // Regime 3: $155 ($149.10 < P <= $171.59)
    const e155 = 155 * (sBase + sExch) + face - fExch
    const r155 = eval4Regime(e155)
    expect(r155.p).toBeCloseTo(155, 6)
    expect(r155.sPra).toBeCloseTo(face / 155, 6)
    expect(r155.sSpr).toBeCloseTo(sExch - fExch / 155, 6)
    expect(
      Math.abs(r155.p * (sBase + r155.sPra + r155.sSpr) - e155)
    ).toBeLessThan(1e-6)

    // Regime 4: $220 (> $171.59)
    const e220 = 220 * (sBase + sMin + sExch) - fExch
    const r220 = eval4Regime(e220)
    expect(r220.p).toBeCloseTo(220, 6)
    expect(r220.sPra).toBeCloseTo(sMin, 6)
    expect(r220.sSpr).toBeCloseTo(sExch - fExch / 220, 6)
    expect(
      Math.abs(r220.p * (sBase + r220.sPra + r220.sSpr) - e220)
    ).toBeLessThan(1e-6)

    // Verify interior Regime 3 cell directly inside live ReverseDcfMarginGrid
    const gridPx = base.num("ReverseDcfMarginGrid", "w_3", "m_4")
    const gridEv = base.num("ReverseDcfMarginEvGrid", "w_3", "m_4")
    const netBridge = base.num("EvToEquityBridge", "net_ev_bridge", "val")
    const rollFwd = base.num("EvToEquityBridge", "roll_fwd_factor", "val")
    const gridEpre = (gridEv + netBridge) * rollFwd
    expect(gridPx).toBeGreaterThan(pExch)
    expect(gridPx).toBeLessThan(pHigh)
    expect(
      Math.abs(
        gridPx * (sBase + face / gridPx + (sExch - fExch / gridPx)) - gridEpre
      )
    ).toBeLessThan(1e-6)
  })

  it("enforces 25.0% combined tax symmetry, symmetric 51d Ke equity roll-forward, and zero SBC/401(k) double-count", () => {
    for (const key of SCENARIO_KEYS) {
      const c = all.compiled[key]
      expect(c.num("WaccBuild", "tax_rate", "val")).toBeCloseTo(0.25, 6)
      // Terminal NOPAT uses exact 25.0% combined tax rate
      const ebit32 = c.num("DcfSchedule", "ebit", "2032E")
      const nopat32 = c.num("DcfSchedule", "nopat", "2032E")
      expect(nopat32).toBeCloseTo(ebit32 * 0.75, 4)
      const g = c.num("ScalarDrivers", "terminalGrowth", "active")
      const ronic = c.num("ScalarDrivers", "terminalRonic", "active")
      expect(c.num("DcfSchedule", "economic_fcff", "Terminal")).toBeCloseTo(
        nopat32 * (1 + g) * (1 - g / ronic),
        4
      )
      // Symmetric 51-day Equity roll-forward at Ke (NOT WACC)
      const ke = c.num("WaccBuild", "cost_of_equity", "val")
      const eqSep30 = c.num("EvToEquityBridge", "implied_equity_sep30", "val")
      const eqNov20 = c.num("EvToEquityBridge", "implied_equity_pre", "val")
      expect(Math.abs(eqNov20 / eqSep30 - (1 + ke) ** (51 / 365))).toBeLessThan(
        1e-9
      )
    }
    // Q4 26E foreign/state tax cash floor = $30M; zero federal refund on negative EBIT (Downside)
    const down = all.compiled.downside
    expect(down.num("DcfSchedule", "ebit", "Q4_26E")).toBeLessThan(0)
    expect(down.num("DcfSchedule", "fed_tax_on_ebit", "Q4_26E")).toBe(0)
    expect(down.num("DcfSchedule", "foreign_state_tax", "Q4_26E")).toBeCloseTo(
      -30,
      6
    )
    const base = all.compiled.base
    expect(base.num("DcfSchedule", "foreign_state_tax", "Q4_26E")).toBeCloseTo(
      -30,
      6
    )
    // Economic FCFF never adds back SBC + 401(k)
    for (const p of FORECAST_PERIODS) {
      const nopat = base.num("DcfSchedule", "nopat", p)
      const nol = base.num("DcfSchedule", "nol_tax_shield", p)
      const da = base.num("DcfSchedule", "da_addback", p)
      const capex = base.num("DcfSchedule", "capex", p)
      const nwc = base.num("DcfSchedule", "chg_nwc", p)
      expect(
        Math.abs(
          base.num("DcfSchedule", "economic_fcff", p) -
            (nopat + nol + da + capex + nwc)
        )
      ).toBeLessThan(1e-6)
    }
    // Downside preserves finite-life post-2032E NOL runoff; Upside exhausts by FY32E
    expect(
      all.compiled.downside.num(
        "EvToEquityBridge",
        "pv_post_terminal_nol",
        "val"
      )
    ).toBeGreaterThan(1500)
    expect(
      all.compiled.upside.num("EvToEquityBridge", "pv_post_terminal_nol", "val")
    ).toBe(0)
  })

  it("enforces capital-structure WACC coherence and SOTP clean-EBIT & blended-corporate capitalization", () => {
    const base = all.compiled.base
    const up = all.compiled.upside
    // Base WACC ~9.26% at spot debt weight (26.2%); De-Levered IG Transition memo ~9.01%
    expect(base.num("WaccBuild", "weight_debt", "val")).toBeCloseTo(0.2618, 3)
    expect(base.num("WaccBuild", "wacc", "val")).toBeCloseTo(0.0926, 4)
    expect(base.num("WaccBuild", "wacc_ig_transition_memo", "val")).toBeCloseTo(
      0.0901,
      3
    )
    // Upside WACC = 8.62% via 15% IG target debt weight + Hamada 0.974 beta
    expect(up.num("WaccBuild", "weight_debt", "val")).toBeCloseTo(0.15, 6)
    expect(up.num("WaccBuild", "equity_beta", "val")).toBeCloseTo(0.9738, 3)
    expect(up.num("WaccBuild", "wacc", "val")).toBeCloseTo(0.0862, 4)
    // SOTP strips $209M Spirit amort from BCA & capitalizes Unallocated at blended segment multiple
    expect(base.num("SotpValuation", "bca", "ebit_29")).toBeCloseTo(
      base.num("SegmentOperatingBuild", "ebit_bca", "2029E") - 209,
      6
    )
    expect(base.num("SotpValuation", "unallocated", "multiple")).toBeCloseTo(
      base.num("SotpValuation", "op_seg_subtotal", "multiple"),
      6
    )
  })

  it("reconciles Scenario EV Variance Attribution and Enterprise-to-Per-Share Return Walk within 1e-6", () => {
    for (const key of SCENARIO_KEYS) {
      const c = all.compiled[key]
      const evAnchor = c.num("EvToEquityBridge", "ev_anchor", "val")
      const evCheck = c.num("ScenarioAttribution", "ev_attr_check", "val")
      const retCheck = c.num("ScenarioAttribution", "return_walk_check", "val")
      expect(Math.abs(evCheck) / Math.abs(evAnchor)).toBeLessThan(1e-6)
      expect(Math.abs(retCheck)).toBeLessThan(1e-6)
    }
    const vs = all.compiled.base.table("ValuationSummary")
    for (const row of vs.rows) {
      expect(Math.abs(vs.num(row, "vs_base"))).toBeLessThan(1e-9)
    }
  })
})

describe("C5: Scenario monotonicity, WACC <= g guard, Clearing WACC & liquidity covenants", () => {
  it("preserves strict Downside < Base < Upside ordering on valuation and operating KPIs", () => {
    const s = all.snapshots
    expect(s.downside.impliedPrice).toBeLessThan(s.base.impliedPrice)
    expect(s.base.impliedPrice).toBeLessThan(s.upside.impliedPrice)
    expect(s.downside.sotpPrice).toBeLessThan(s.base.sotpPrice)
    expect(s.base.sotpPrice).toBeLessThan(s.upside.sotpPrice)
    expect(s.downside.ebitFy32e).toBeLessThan(s.base.ebitFy32e)
    expect(s.base.ebitFy32e).toBeLessThan(s.upside.ebitFy32e)
    expect(s.downside.econFcffFy32e).toBeLessThan(s.base.econFcffFy32e)
    expect(s.base.econFcffFy32e).toBeLessThan(s.upside.econFcffFy32e)
    // Discount rate monotonicity is reversed (Downside > Base > Upside)
    expect(s.downside.wacc).toBeGreaterThan(s.base.wacc)
    expect(s.base.wacc).toBeGreaterThan(s.upside.wacc)
  })

  it("guards WACC <= g cleanly with #N/A across DCF, Clearing WACC, and Scenario Attribution", () => {
    const bundles = allScenarioBundles()
    const stressedBase = Object.freeze({
      ...bundles.base,
      scalars: Object.freeze({
        ...bundles.base.scalars,
        terminalGrowth: scalarDriver(
          0.12,
          bundles.base.scalars.terminalGrowth.meta
        ),
      }),
    })
    using stressed = compileBoeingModel({
      scenario: "base",
      kgData: all.kg,
      scenarios: Object.freeze({ ...bundles, base: stressedBase }),
      snapshots: all.snapshots,
    })
    expect(stressed.value("DcfSchedule", "fcff_or_tv", "Terminal")).toBe("#N/A")
    expect(stressed.value("ReverseDcfBoundaries", "clearing_wacc", "val")).toBe(
      "#N/A"
    )
    expect(
      stressed.value("ReverseDcfBoundaries", "clearing_wacc_residual", "val")
    ).toBe("#N/A")
    expect(
      stressed.value("ScenarioAttribution", "active_tv_base_params", "val")
    ).toBe("#N/A")
  })

  it("converges Clearing WACC bisection residual within $0.5M and recovers $155.89 spot price within $0.01 across all 3 scenarios", () => {
    const spot = all.kg.market.baSpot
    for (const key of SCENARIO_KEYS) {
      const c = all.compiled[key]
      const res = c.num("ReverseDcfBoundaries", "clearing_wacc_residual", "val")
      const px = c.num(
        "ReverseDcfBoundaries",
        "clearing_wacc_implied_price",
        "val"
      )
      expect(Math.abs(res), `${key} clearing WACC residual`).toBeLessThan(0.5)
      expect(
        Math.abs(px - spot),
        `${key} clearing WACC implied price vs spot`
      ).toBeLessThan(0.01)
    }
  })

  it("enforces operating grounding (767 completion, $0 FY32E FAS/CAS, scenario RONIC, constant 3% g, zero phantom DTL, STI drawdown)", () => {
    const expectedRonic: Record<ScenarioKey, number> = {
      downside: 0.18,
      base: 0.23,
      upside: 0.28,
    }
    for (const key of SCENARIO_KEYS) {
      const c = all.compiled[key]
      expect(c.num("ScalarDrivers", "terminalGrowth", "active")).toBeCloseTo(
        0.03,
        6
      )
      expect(c.num("ScalarDrivers", "terminalRonic", "active")).toBeCloseTo(
        expectedRonic[key],
        6
      )
      // Commercial 767 completion: 14 in 2027E, 0 in 2028E–2032E
      expect(c.num("SegmentOperatingBuild", "del_767", "2027E")).toBe(14)
      for (const yr of ["2028E", "2029E", "2030E", "2031E", "2032E"] as const) {
        expect(c.num("SegmentOperatingBuild", "del_767", yr)).toBe(0)
      }
      // Frozen-plan FAS/CAS fades to $0 by FY32E
      expect(
        c.num("SegmentOperatingBuild", "fas_cas_service_cost_adj", "2032E")
      ).toBe(0)
      // Zero phantom DTL creation under full ASC 740 VA
      for (const col of [
        "2026E",
        "2027E",
        "2028E",
        "2029E",
        "2030E",
        "2031E",
        "2032E",
      ] as const) {
        expect(
          c.num("BalanceSheet", "deferred_tax_liabilities", col),
          `${key} DTL[${col}]`
        ).toBeCloseTo(310, 6)
      }
    }
    // Downside liquidates STI before issuing BB HY debt (0 new borrowings)
    const down = all.compiled.downside
    expect(
      down.num("DebtLiquiditySchedule", "sti_liquidation", "2027E")
    ).toBeGreaterThan(0)
    for (const col of [
      "2026E",
      "2027E",
      "2028E",
      "2029E",
      "2030E",
      "2031E",
      "2032E",
    ] as const) {
      expect(down.num("DebtLiquiditySchedule", "new_borrowings", col)).toBe(0)
    }
    // Base FY32E ROIC grounded in ~18%–23% band on 25% combined tax
    const baseRoic32 = all.compiled.base.num(
      "InvestedCapitalRoic",
      "roic_incl_gw",
      "2032E"
    )
    expect(baseRoic32).toBeGreaterThan(0.18)
    expect(baseRoic32).toBeLessThan(0.23)
  })

  it("maintains total liquidity above the $5.0B covenant floor across all scenarios and periods", () => {
    const checkCols = [
      "9M26A",
      "2026E",
      "2027E",
      "2028E",
      "2029E",
      "2030E",
      "2031E",
      "2032E",
    ] as const
    for (const key of SCENARIO_KEYS) {
      const debt = all.compiled[key].table("DebtLiquiditySchedule")
      for (const col of checkCols) {
        expect(debt.num("liquidity_headroom", col)).toBeGreaterThanOrEqual(0)
        expect(debt.num("total_liquidity", col)).toBeGreaterThanOrEqual(5000)
      }
    }
  })
})

describe("C6: Live OLS BetaData regression & Peer Trading Comps parity", () => {
  const colMap: Readonly<Record<Exclude<BetaEntity, "^GSPC">, string>> = {
    BA: "BA",
    "AIR.PA": "AIR_PA",
    GE: "GE",
    RTX: "RTX",
    GD: "GD",
    LMT: "LMT",
    NOC: "NOC",
  }

  it("matches direct statistical OLS Beta, R², and Blume Beta within 1e-4 for 5Y monthly and 2Y weekly", () => {
    const base = all.compiled.base
    const entities = ALL_BETA_ENTITIES.filter(
      (e): e is Exclude<BetaEntity, "^GSPC"> => e !== "^GSPC"
    )
    for (const ent of entities) {
      const col = colMap[ent]
      const ref5y = olsStats(
        all.kg.prices5yMonthly.prices[ent],
        all.kg.prices5yMonthly.prices["^GSPC"]
      )
      expect(
        Math.abs(base.num("BetaStats5Y", "raw_beta", col) - ref5y.beta)
      ).toBeLessThan(1e-4)
      expect(
        Math.abs(base.num("BetaStats5Y", "r_squared", col) - ref5y.r2)
      ).toBeLessThan(1e-4)
      expect(
        Math.abs(base.num("BetaStats5Y", "blume_beta", col) - ref5y.blume)
      ).toBeLessThan(1e-4)

      const ref2y = olsStats(
        all.kg.prices2yWeekly.prices[ent],
        all.kg.prices2yWeekly.prices["^GSPC"]
      )
      expect(
        Math.abs(base.num("BetaStats2Y", "raw_beta", col) - ref2y.beta)
      ).toBeLessThan(1e-4)
      expect(
        Math.abs(base.num("BetaStats2Y", "r_squared", col) - ref2y.r2)
      ).toBeLessThan(1e-4)
    }
    expect(base.num("BetaStats5Y", "raw_beta", "BA")).toBeCloseTo(1.307, 3)
    expect(base.num("BetaStats2Y", "raw_beta", "BA")).toBeCloseTo(1.427, 3)
  })

  it("ties GE ex-Insurance EBIT ($10,468M), Airbus Dassault deduction & IFRS 16 parity, and cohort Means/Medians excluding BA", () => {
    const base = all.compiled.base
    const fx = all.kg.market.eurusdSpot
    const rowMap: Record<PeerEntity, string> = {
      "AIR.PA": "air_pa",
      GE: "ge",
      RTX: "rtx",
      GD: "gd",
      LMT: "lmt",
      NOC: "noc",
    }

    // GE Aerospace LTM true ex-Insurance EBIT = $10,468M
    expect(base.num("PeerLtmBridge", "ge_ebit", "ltm_usd")).toBeCloseTo(
      10468,
      2
    )

    // Airbus Dassault stake (€2,350M) deducted in EV bridge
    expect(base.num("PeerEvBridge", "air_pa", "non_op_inv_usd")).toBeCloseTo(
      2350 * fx,
      2
    )

    // Airbus US-GAAP parity strips €2,387M IFRS 16 leases from EV & reverses IAS 38 / IFRS 16 in EBITDA
    const airIfrsEv = base.num("TradingComps", "air_pa", "ev_usd")
    const airUsgaapEv = base.num("TradingComps", "air_pa_usgaap", "ev_usd")
    expect(airIfrsEv - airUsgaapEv).toBeCloseTo(2387 * fx, 2)

    const airIfrsEbitda = base.num(
      "PeerLtmBridge",
      "air_pa_ebitda",
      "ltm_local"
    )
    const airUsgaapEbitda = base.num(
      "PeerLtmBridge",
      "air_usgaap_ebitda",
      "ltm_local"
    )
    expect(airIfrsEbitda).toBeCloseTo(10442, 2)
    expect(airUsgaapEbitda).toBeCloseTo(10442 - 356 - 254 - 80, 2)
    expect(
      base.num("PeerLtmBridge", "air_usgaap_ebitda", "ltm_usd")
    ).toBeCloseTo(airUsgaapEbitda * fx, 2)

    // Verify All 6 Peers Mean & Median exclude BA and exclude Airbus US-GAAP memo
    const peerEvEbitdas = PEER_ENTITIES.map((e) =>
      base.num("TradingComps", rowMap[e], "ev_ltm_ebitda")
    )
    const meanEvEbitda =
      peerEvEbitdas.reduce((a, b) => a + b, 0) / peerEvEbitdas.length
    const sorted = [...peerEvEbitdas].sort((a, b) => a - b)
    const medianEvEbitda = (sorted[2]! + sorted[3]!) / 2

    expect(base.num("TradingComps", "all_mean", "ev_ltm_ebitda")).toBeCloseTo(
      meanEvEbitda,
      6
    )
    expect(base.num("TradingComps", "all_median", "ev_ltm_ebitda")).toBeCloseTo(
      medianEvEbitda,
      6
    )

    // Verify BA LTM negative-denominator multiples are cleanly suppressed (Empty / null)
    expect(base.value("TradingComps", "ba_subject", "ev_ltm_ebitda")).toBeNull()
    expect(base.value("TradingComps", "ba_subject", "ev_ltm_ebit")).toBeNull()
  })
})

describe("Model scenario export consistency", () => {
  it("evaluates identical outputs via standalone compileBoeingModel and compileAllScenarios", () => {
    const key: ScenarioKey = "base"
    using standalone = compileBoeingModel(key)
    expect(
      standalone.num("EvToEquityBridge", "implied_price", "val")
    ).toBeCloseTo(
      all.compiled.base.num("EvToEquityBridge", "implied_price", "val"),
      9
    )
  })
})
