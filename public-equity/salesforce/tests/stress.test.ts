import { describe, expect, it } from "vitest"
import {
  allScenarios,
  ANNUAL_PERIODS,
  buildSalesforceModel,
  FORECAST_PERIODS,
  loadAuditedData,
} from "../models/index.ts"
import {
  periodDriver,
  type AllScenarioBundles,
} from "../models/assumptions/index.ts"

describe("Extreme stress & boundary stability tests (C6)", () => {
  it("C6a: severe -20% revenue contraction triggers pure-DAG revolver while preserving exact BS/CF/IC balance and non-negative cash without idle cash alongside drawn revolver", () => {
    const baseBundles = allScenarios()
    const base = baseBundles.base
    const stressedBase = Object.freeze({
      ...base,
      periods: Object.freeze({
        ...base.periods,
        organicSsGrowth: periodDriver(
          {
            FY27E: -0.2,
            FY28E: -0.2,
            FY29E: -0.2,
            FY30E: -0.1,
            FY31E: 0.15,
          },
          base.periods.organicSsGrowth.meta
        ),
        incrementalMaRev: periodDriver(
          {
            FY27E: 0,
            FY28E: 0,
            FY29E: 0,
            FY30E: 0,
            FY31E: 0,
          },
          base.periods.incrementalMaRev.meta
        ),
        profServicesGrowth: periodDriver(
          {
            FY27E: -0.2,
            FY28E: -0.2,
            FY29E: -0.2,
            FY30E: -0.1,
            FY31E: 0.05,
          },
          base.periods.profServicesGrowth.meta
        ),
      }),
    })

    const stressedScenarios: AllScenarioBundles = Object.freeze({
      ...baseBundles,
      base: stressedBase,
    })

    const compiled = buildSalesforceModel({
      scenario: "base",
      scenarios: stressedScenarios,
    }).compile()

    try {
      const minCash = compiled.num("ScalarDrivers", "minCashBalance", "active")
      let maxRevolver = 0

      for (const p of ANNUAL_PERIODS) {
        expect(
          Math.abs(compiled.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(compiled.num("CashFlowStatement", "cash_tie_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(compiled.num("InvestedCapitalAndRoic", "ic_tie_check", p))
        ).toBeLessThan(1e-6)
      }

      for (const p of FORECAST_PERIODS) {
        const cash = compiled.num("BalanceSheet", "cash_and_equivalents", p)
        const revolver = compiled.num("DebtSchedule", "ending_revolver", p)
        maxRevolver = Math.max(maxRevolver, revolver)

        // Unrestricted cash never falls below minimum cash floor
        expect(cash).toBeGreaterThanOrEqual(minCash - 1e-6)
        expect(revolver).toBeGreaterThanOrEqual(-1e-6)

        // No idle excess cash above minCash coexists with a drawn revolver
        if (revolver > 1e-6) {
          expect(Math.abs(cash - minCash)).toBeLessThan(1e-6)
        }
      }

      // Confirm revolver actually activated during the severe contraction & maturity wall
      expect(maxRevolver).toBeGreaterThan(1000)
    } finally {
      compiled.dispose()
    }
  })

  it("C6b: WACC <= g boundary returns #N/A cleanly on Gordon Growth TV and sensitivity cells without crashing compilation", () => {
    const model = buildSalesforceModel({ scenario: "base" })
    // Verify default buildSalesforceModel() carries real Base benchmarks (never $1 placeholder)
    const preCheck = model.compile()
    try {
      expect(
        preCheck.num("ExecutiveDashboard", "dcf_gordon_price", "base")
      ).toBeGreaterThan(100)
    } finally {
      preCheck.dispose()
    }

    model.getTable("ScalarDrivers").setCell("terminalGrowthRate", "base", 0.12)
    const compiled = model.compile()

    try {
      expect(
        compiled.value("DcfSummaryTable", "terminal_value", "gordon")
      ).toBe("#N/A")
      expect(
        compiled.value("EvToEquityBridge", "implied_share_price", "gordon")
      ).toBe("#N/A")
      expect(
        compiled.value("SensitivityWaccVsGrowth", "w_base", "g_base")
      ).toBe("#N/A")

      // Exit Multiple cross-check remains finite and valid
      const exitMultPrice = compiled.num(
        "EvToEquityBridge",
        "implied_share_price",
        "exit_mult"
      )
      expect(Number.isFinite(exitMultPrice)).toBe(true)
      expect(exitMultPrice).toBeGreaterThan(0)
    } finally {
      compiled.dispose()
    }
  })

  it("C6c: zero or negative peer EBITDA and EPS denominators return #N/A cleanly without #DIV/0!", () => {
    const audited = loadAuditedData()
    const model = buildSalesforceModel({ scenario: "base", audited })
    const peerBridge = model.getTable("PeerLtmBridge")

    // Force HUBS LTM EBITDA <= 0 and FY1 consensus EPS = 0
    peerBridge.setCell("fy_ebit", "HUBS", -5000)
    peerBridge.setCell("fy1_cons_eps", "HUBS", 0)

    const compiled = model.compile()
    try {
      expect(
        compiled.num("PeerLtmBridge", "ltm_gaap_ebitda", "HUBS")
      ).toBeLessThan(0)
      expect(compiled.value("TradingCompsTable", "HUBS", "net_lev")).toBe(
        "#N/A"
      )
      expect(compiled.value("TradingCompsTable", "HUBS", "ev_ebitda")).toBe(
        "#N/A"
      )
      expect(compiled.value("TradingCompsTable", "HUBS", "pe_fy1")).toBe("#N/A")

      // Peer multiples for unaffected peers remain finite
      expect(
        compiled.num("TradingCompsTable", "ADBE", "ev_ebitda")
      ).toBeGreaterThan(0)
      expect(
        compiled.num("TradingCompsTable", "INTU", "pe_fy1")
      ).toBeGreaterThan(0)
    } finally {
      compiled.dispose()
    }
  })

  it("C6: raising capexPctRev (+10 bps), finLeasePctRev (+10 bps), and ppeDeprPctRev (+20 bps) jointly reduces GAAP EBIT, NOPAT, and Gordon/Exit-Multiple DCF prices without lifting EBITDA", () => {
    const baseBundles = allScenarios()
    const base = baseBundles.base
    const baseline = buildSalesforceModel({
      scenario: "base",
      scenarios: baseBundles,
    }).compile()

    const bump = (
      vec: Readonly<Record<(typeof FORECAST_PERIODS)[number], number>>,
      delta: number
    ): Readonly<Record<(typeof FORECAST_PERIODS)[number], number>> => ({
      FY27E: vec.FY27E + delta,
      FY28E: vec.FY28E + delta,
      FY29E: vec.FY29E + delta,
      FY30E: vec.FY30E + delta,
      FY31E: vec.FY31E + delta,
    })

    const capIntensityStressed = Object.freeze({
      ...base,
      periods: Object.freeze({
        ...base.periods,
        capexPctRev: periodDriver(
          bump(base.periods.capexPctRev.value, 0.001),
          base.periods.capexPctRev.meta
        ),
        finLeasePctRev: periodDriver(
          bump(base.periods.finLeasePctRev.value, 0.001),
          base.periods.finLeasePctRev.meta
        ),
        ppeDeprPctRev: periodDriver(
          bump(base.periods.ppeDeprPctRev.value, 0.002),
          base.periods.ppeDeprPctRev.meta
        ),
      }),
    })

    const stressed = buildSalesforceModel({
      scenario: "base",
      scenarios: Object.freeze({
        ...baseBundles,
        base: capIntensityStressed,
      }),
    }).compile()

    try {
      for (const p of FORECAST_PERIODS) {
        expect(
          Math.abs(stressed.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(stressed.num("CashFlowStatement", "cash_tie_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(stressed.num("InvestedCapitalAndRoic", "ic_tie_check", p))
        ).toBeLessThan(1e-6)

        // GAAP EBIT, NOPAT, and Unlevered FCFF strictly decrease
        expect(
          stressed.num("IncomeStatement", "operating_income", p)
        ).toBeLessThan(baseline.num("IncomeStatement", "operating_income", p))
        expect(
          stressed.num("QoeAndCashConversion", "gaap_nopat", p)
        ).toBeLessThan(baseline.num("QoeAndCashConversion", "gaap_nopat", p))
        expect(
          stressed.num("QoeAndCashConversion", "unlevered_fcff", p)
        ).toBeLessThan(
          baseline.num("QoeAndCashConversion", "unlevered_fcff", p)
        )

        // GAAP EBITDA does NOT perversely increase (exact zero delta as EBIT -deltaD and D&A +deltaD offset)
        expect(
          Math.abs(
            stressed.num("IncomeStatement", "gaap_ebitda", p) -
              baseline.num("IncomeStatement", "gaap_ebitda", p)
          )
        ).toBeLessThan(1e-6)
      }

      // Both Gordon Growth and Exit-Multiple DCF share prices strictly decrease
      expect(
        stressed.num("EvToEquityBridge", "implied_share_price", "gordon")
      ).toBeLessThan(
        baseline.num("EvToEquityBridge", "implied_share_price", "gordon")
      )
      expect(
        stressed.num("EvToEquityBridge", "implied_share_price", "exit_mult")
      ).toBeLessThan(
        baseline.num("EvToEquityBridge", "implied_share_price", "exit_mult")
      )

      // Operating lease ROU amortization stress (+$100M/yr) does not inflate GAAP EBITDA or Exit-Multiple DCF
      const leaseStressed = buildSalesforceModel({
        scenario: "base",
        scenarios: Object.freeze({
          ...baseBundles,
          base: Object.freeze({
            ...base,
            periods: Object.freeze({
              ...base.periods,
              opLeasePayment: periodDriver(
                bump(base.periods.opLeasePayment.value, 100),
                base.periods.opLeasePayment.meta
              ),
            }),
          }),
        }),
      }).compile()
      try {
        for (const p of FORECAST_PERIODS) {
          expect(
            Math.abs(
              leaseStressed.num("IncomeStatement", "gaap_ebitda", p) -
                baseline.num("IncomeStatement", "gaap_ebitda", p)
            )
          ).toBeLessThan(1e-6)
          expect(
            leaseStressed.num("CashFlowStatement", "da_expense", p) -
              baseline.num("CashFlowStatement", "da_expense", p)
          ).toBeCloseTo(100, 6)
        }
        expect(
          Math.abs(
            leaseStressed.num(
              "EvToEquityBridge",
              "implied_share_price",
              "exit_mult"
            ) -
              baseline.num(
                "EvToEquityBridge",
                "implied_share_price",
                "exit_mult"
              )
          )
        ).toBeLessThan(1e-6)
      } finally {
        leaseStressed.dispose()
      }
    } finally {
      baseline.dispose()
      stressed.dispose()
    }
  })
})
