import type { ScenarioId } from "../timeline.ts"
import { baseOperatingScalars, baseOperatingVectors } from "./operating.ts"
import {
  periodDriver,
  scalarDriver,
  type MetaScenarioDrivers,
} from "./types.ts"
import { baseValuationScalars } from "./valuation.ts"

export function baseDrivers(): MetaScenarioDrivers {
  return Object.freeze({
    id: "base" as const,
    label: "Base",
    framing:
      "Anchored on Q4/FY26 management guidance midpoints and FY27 Reality Labs target; FoA growth tapers smoothly, CapEx digests gradually toward pre-boom intensity with server-weighted D&A ramp and 20% terminal RONIC, and WACC reflects Hamada-relevered 5Y monthly raw beta with 3.5% terminal growth.",
    vectors: baseOperatingVectors,
    operating: baseOperatingScalars,
    valuation: baseValuationScalars,
  })
}

export function downsideDrivers(): MetaScenarioDrivers {
  const base = baseDrivers()
  return Object.freeze({
    id: "downside" as const,
    label: "Downside",
    framing:
      "AI monetization disappoints and regulatory/macro headwinds slow FoA growth (~350 bps below Base), CapEx and GPU depreciation remain elevated against lower terminal RONIC, FoA cash OpEx, SBC, and Reality Labs losses stay sticky, and the elevated 2Y weekly Blume beta lifts WACC with lower terminal growth.",
    vectors: Object.freeze({
      ...base.vectors,
      foaRevenueGrowth: periodDriver(
        {
          "2027E": 0.14,
          "2028E": 0.11,
          "2029E": 0.085,
          "2030E": 0.07,
          "2031E": 0.06,
        },
        {
          ...base.vectors.foaRevenueGrowth.meta,
          basis: "Deceleration stress (~350 bps below Base)",
          rationale:
            "Ad pricing softens under macro, tariff/China reseller, and EU regulatory pressure with slower AI conversion uplift across Family of Apps.",
        }
      ),
      foaCashOpexPctFoaRev: periodDriver(
        {
          "2027E": 0.462,
          "2028E": 0.455,
          "2029E": 0.448,
          "2030E": 0.443,
          "2031E": 0.438,
        },
        {
          ...base.vectors.foaCashOpexPctFoaRev.meta,
          basis: "Sticky AI infrastructure, lease rent & compliance cost",
          rationale:
            "Uncommenced data-center lease rent ramp, power costs, AI talent retention, and regulatory compliance keep cash OpEx ~200-230 bps above Base.",
        }
      ),
      rlOperatingLoss: periodDriver(
        {
          "2027E": -19_000,
          "2028E": -18_000,
          "2029E": -17_000,
          "2030E": -16_000,
          "2031E": -15_000,
        },
        {
          ...base.vectors.rlOperatingLoss.meta,
          basis: "Persistent hardware investment drag",
          rationale:
            "Reality Labs misses management FY2027 cost-reduction targets and sustains wider annual operating losses across the forecast horizon.",
        }
      ),
      capexPctRevenue: periodDriver(
        {
          "2027E": 0.51,
          "2028E": 0.44,
          "2029E": 0.38,
          "2030E": 0.32,
          "2031E": 0.27,
        },
        {
          ...base.vectors.capexPctRevenue.meta,
          basis: "Prolonged capital intensity (+400-500 bps vs. Base)",
          rationale:
            "Binding multi-year data center and GPU purchase commitments plus shorter refresh cycles sustain high capital intensity against slower revenue growth.",
        }
      ),
      daPctBegNetPpe: periodDriver(
        {
          "2027E": 0.146,
          "2028E": 0.16,
          "2029E": 0.174,
          "2030E": 0.184,
          "2031E": 0.19,
        },
        {
          ...base.vectors.daPctBegNetPpe.meta,
          basis: "Faster GPU obsolescence & shorter economic lives",
          rationale:
            "Accelerated AI silicon obsolescence lifts depreciation intensity on opening net PP&E above Base assumptions.",
        }
      ),
      sbcPctRevenue: periodDriver(
        {
          "2027E": 0.118,
          "2028E": 0.115,
          "2029E": 0.112,
          "2030E": 0.109,
          "2031E": 0.106,
        },
        {
          ...base.vectors.sbcPctRevenue.meta,
          basis: "Sticky AI talent retention against slower revenue",
          rationale:
            "Slower top-line growth and competitive frontier-AI hiring keep share-based compensation elevated as a percentage of revenue.",
        }
      ),
      annualShareRepurchases: periodDriver(
        {
          "2027E": 0,
          "2028E": 0,
          "2029E": 0,
          "2030E": 0,
          "2031E": 10_000,
        },
        {
          ...base.vectors.annualShareRepurchases.meta,
          basis: "Liquidity preservation",
          rationale:
            "Weak FCF generation defers share buybacks until late in the horizon to protect balance-sheet headroom.",
        }
      ),
    }),
    operating: Object.freeze({
      ...base.operating,
      q4RevenueGuidance: scalarDriver(73_000, {
        ...base.operating.q4RevenueGuidance.meta,
        basis: "Management guidance low end",
        rationale: "Anchored at the low end of CFO Q4 2026 revenue outlook.",
      }),
      fy26TotalGaapExpenses: scalarDriver(179_000, {
        ...base.operating.fy26TotalGaapExpenses.meta,
        basis: "Management guidance high end",
        rationale: "Anchored at the upper end of FY2026 GAAP expense outlook.",
      }),
      fy26RlOperatingLoss: scalarDriver(-19_000, {
        ...base.operating.fy26RlOperatingLoss.meta,
        basis: "Management guidance high loss end",
        rationale:
          "Anchored at the wider end of FY2026 Reality Labs loss guidance.",
      }),
      fy26TotalCapex: scalarDriver(145_000, {
        ...base.operating.fy26TotalCapex.meta,
        basis: "Management guidance high end",
        rationale: "Anchored at the upper end of FY2026 CapEx guidance.",
      }),
    }),
    valuation: Object.freeze({
      ...base.valuation,
      betaRegimeSelector: scalarDriver(1, {
        ...base.valuation.betaRegimeSelector.meta,
        basis: "2-year weekly Blume beta (Hamada-relevered)",
        rationale:
          "Reflects persistence of elevated 2-year weekly Blume equity beta amid CapEx, leverage, and litigation volatility.",
      }),
      terminalGrowthRate: scalarDriver(0.03, {
        ...base.valuation.terminalGrowthRate.meta,
        basis: "Conservative mature ad growth",
        rationale:
          "Lower long-run nominal compounding under ad-market saturation and regulatory drag.",
      }),
      terminalRonic: scalarDriver(0.15, {
        ...base.valuation.terminalRonic.meta,
        basis: "Compressed AI capital productivity",
        rationale:
          "Lower incremental return on AI infrastructure requires higher steady-state reinvestment to sustain terminal growth.",
      }),
    }),
  })
}

export function upsideDrivers(): MetaScenarioDrivers {
  const base = baseDrivers()
  return Object.freeze({
    id: "upside" as const,
    label: "Upside",
    framing:
      "AI agentic commerce, WhatsApp monetization, and ad-ranking gains lift FoA growth (~350 bps above Base), custom-silicon efficiency accelerates CapEx digestion at higher terminal RONIC, FoA cash OpEx, SBC, and Reality Labs losses improve symmetrically, and Hamada-relevered 5Y Blume beta lowers WACC with higher terminal growth.",
    vectors: Object.freeze({
      ...base.vectors,
      foaRevenueGrowth: periodDriver(
        {
          "2027E": 0.235,
          "2028E": 0.19,
          "2029E": 0.155,
          "2030E": 0.13,
          "2031E": 0.105,
        },
        {
          ...base.vectors.foaRevenueGrowth.meta,
          basis: "AI monetization expansion (~350 bps above Base)",
          rationale:
            "Generative ad creative, automated conversion bidding, and business-messaging AI agents sustain symmetric upside revenue compounding.",
        }
      ),
      foaCashOpexPctFoaRev: periodDriver(
        {
          "2027E": 0.422,
          "2028E": 0.414,
          "2029E": 0.406,
          "2030E": 0.4,
          "2031E": 0.395,
        },
        {
          ...base.vectors.foaCashOpexPctFoaRev.meta,
          basis: "Disciplined AI operating leverage (-200 bps vs. Base)",
          rationale:
            "Stronger revenue scale drives symmetric cash OpEx leverage while keeping consolidated EBIT margin disciplined relative to prior historical peak.",
        }
      ),
      rlOperatingLoss: periodDriver(
        {
          "2027E": -14_000,
          "2028E": -12_000,
          "2029E": -10_500,
          "2030E": -9_000,
          "2031E": -7_500,
        },
        {
          ...base.vectors.rlOperatingLoss.meta,
          basis: "Wearables scale & R&D efficiency",
          rationale:
            "AI glasses unit scale and disciplined R&D narrow Reality Labs annual operating losses steadily across the forecast horizon.",
        }
      ),
      capexPctRevenue: periodDriver(
        {
          "2027E": 0.43,
          "2028E": 0.34,
          "2029E": 0.27,
          "2030E": 0.22,
          "2031E": 0.185,
        },
        {
          ...base.vectors.capexPctRevenue.meta,
          basis:
            "Faster custom-silicon & inference efficiency (-350-500 bps vs. Base)",
          rationale:
            "In-house silicon (MTIA) efficiency and higher cluster utilization accelerate CapEx digestion symmetrically vs. Downside.",
        }
      ),
      daPctBegNetPpe: periodDriver(
        {
          "2027E": 0.14,
          "2028E": 0.152,
          "2029E": 0.164,
          "2030E": 0.172,
          "2031E": 0.176,
        },
        {
          ...base.vectors.daPctBegNetPpe.meta,
          basis: "Longer server utilization & higher facility mix",
          rationale:
            "Improved custom-silicon longevity and higher building-to-server asset longevity temper steady-state depreciation slightly below Base.",
        }
      ),
      sbcPctRevenue: periodDriver(
        {
          "2027E": 0.108,
          "2028E": 0.101,
          "2029E": 0.094,
          "2030E": 0.088,
          "2031E": 0.082,
        },
        {
          ...base.vectors.sbcPctRevenue.meta,
          basis: "Revenue-scale SBC leverage",
          rationale:
            "Faster top-line compounding and disciplined headcount growth improve share-based compensation as a share of revenue.",
        }
      ),
      annualShareRepurchases: periodDriver(
        {
          "2027E": 0,
          "2028E": 15_000,
          "2029E": 35_000,
          "2030E": 55_000,
          "2031E": 75_000,
        },
        {
          ...base.vectors.annualShareRepurchases.meta,
          basis: "Accelerated FCF capital return",
          rationale:
            "Earlier FCF inflection funds meaningful share repurchases while maintaining ample liquidity.",
        }
      ),
    }),
    operating: Object.freeze({
      ...base.operating,
      q4RevenueGuidance: scalarDriver(76_000, {
        ...base.operating.q4RevenueGuidance.meta,
        basis: "Management guidance high end",
        rationale: "Anchored at the top end of CFO Q4 2026 revenue outlook.",
      }),
      fy26TotalGaapExpenses: scalarDriver(175_000, {
        ...base.operating.fy26TotalGaapExpenses.meta,
        basis: "Management guidance low end",
        rationale: "Anchored at the lower end of FY2026 GAAP expense outlook.",
      }),
      fy26RlOperatingLoss: scalarDriver(-18_000, {
        ...base.operating.fy26RlOperatingLoss.meta,
        basis: "Management guidance low loss end",
        rationale:
          "Anchored at the narrower end of FY2026 Reality Labs loss guidance.",
      }),
      fy26TotalCapex: scalarDriver(135_000, {
        ...base.operating.fy26TotalCapex.meta,
        basis: "Management guidance low end",
        rationale: "Anchored at the lower end of FY2026 CapEx guidance.",
      }),
    }),
    valuation: Object.freeze({
      ...base.valuation,
      betaRegimeSelector: scalarDriver(3, {
        ...base.valuation.betaRegimeSelector.meta,
        basis: "5-year Blume mean-reverted beta (Hamada-relevered)",
        rationale:
          "As FCF visibility improves and CapEx volatility fades, equity beta mean-reverts toward its Hamada-relevered 5-year monthly Blume estimate.",
      }),
      terminalGrowthRate: scalarDriver(0.04, {
        ...base.valuation.terminalGrowthRate.meta,
        basis: "Upper-end nominal GDP compounding",
        rationale:
          "Global AI-enabled messaging and commerce share gains support long-run terminal growth at the upper end of nominal GDP.",
      }),
      terminalRonic: scalarDriver(0.24, {
        ...base.valuation.terminalRonic.meta,
        basis: "High-return AI platform economics",
        rationale:
          "High software-like incremental returns on deployed AI compute lower steady-state reinvestment requirements.",
      }),
    }),
  })
}

export function getScenarioDrivers(scenario: ScenarioId): MetaScenarioDrivers {
  if (scenario === "downside") {
    return downsideDrivers()
  }
  if (scenario === "upside") {
    return upsideDrivers()
  }
  return baseDrivers()
}

export interface AllScenarioDriverBundles {
  readonly downside: MetaScenarioDrivers
  readonly base: MetaScenarioDrivers
  readonly upside: MetaScenarioDrivers
}

export function loadAllScenarioDrivers(): AllScenarioDriverBundles {
  return Object.freeze({
    downside: downsideDrivers(),
    base: baseDrivers(),
    upside: upsideDrivers(),
  })
}
