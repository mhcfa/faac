import type { ScenarioName } from "../timeline.ts"
import {
  baseCapitalStructureDrivers,
  bearCapitalStructureDrivers,
  bullCapitalStructureDrivers,
  type CapitalStructureDrivers,
} from "./capitalStructure.ts"
import {
  baseOperatingDrivers,
  bearOperatingDrivers,
  bullOperatingDrivers,
  type OperatingDrivers,
} from "./operating.ts"
import {
  baseValuationDrivers,
  bearValuationDrivers,
  bullValuationDrivers,
  type ValuationDrivers,
} from "./valuation.ts"
import {
  baseWorkingCapitalDrivers,
  bearWorkingCapitalDrivers,
  bullWorkingCapitalDrivers,
  type WorkingCapitalDrivers,
} from "./workingCapital.ts"

export interface ScenarioDriverBundle {
  readonly scenario: ScenarioName
  readonly thesis: string
  readonly operating: OperatingDrivers
  readonly workingCapital: WorkingCapitalDrivers
  readonly capitalStructure: CapitalStructureDrivers
  readonly valuation: ValuationDrivers
}

export function getScenarioDrivers(
  scenario: ScenarioName
): ScenarioDriverBundle {
  switch (scenario) {
    case "Base":
      return Object.freeze({
        scenario: "Base",
        thesis:
          "Consensus-aligned club expansion, maturing US comps & post-hike MFI reset; FY27E CapEx build & $13.3B special dividend test cash yield vs. 10Y UST",
        operating: baseOperatingDrivers(),
        workingCapital: baseWorkingCapitalDrivers(),
        capitalStructure: baseCapitalStructureDrivers(),
        valuation: baseValuationDrivers(),
      })
    case "Bull":
      return Object.freeze({
        scenario: "Bull",
        thesis:
          "Sustained global club rollout, resilient US comps & retail-media GM expansion; SG&A leverage, lower 4.25% ERP & premium exit multiples test upside ceiling",
        operating: bullOperatingDrivers(),
        workingCapital: bullWorkingCapitalDrivers(),
        capitalStructure: bullCapitalStructureDrivers(),
        valuation: bullValuationDrivers(),
      })
    case "Bear":
      return Object.freeze({
        scenario: "Bear",
        thesis:
          "Post-fee-hike member saturation, club competition & wage/tariff margin pressure; Higher 4.75% ERP & multiple compression toward mature retail valuation norms",
        operating: bearOperatingDrivers(),
        workingCapital: bearWorkingCapitalDrivers(),
        capitalStructure: bearCapitalStructureDrivers(),
        valuation: bearValuationDrivers(),
      })
  }
}

export const ALL_SCENARIO_DRIVERS: Readonly<
  Record<ScenarioName, ScenarioDriverBundle>
> = Object.freeze({
  Base: getScenarioDrivers("Base"),
  Bull: getScenarioDrivers("Bull"),
  Bear: getScenarioDrivers("Bear"),
})

export * from "./types.ts"
export * from "./operating.ts"
export * from "./workingCapital.ts"
export * from "./capitalStructure.ts"
export * from "./valuation.ts"
