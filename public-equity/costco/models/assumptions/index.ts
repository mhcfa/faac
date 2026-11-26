import type { ScenarioName } from "../timeline.ts"
import {
  baseCapitalStructureDrivers,
  downsideCapitalStructureDrivers,
  upsideCapitalStructureDrivers,
  type CapitalStructureDrivers,
} from "./capitalStructure.ts"
import {
  baseOperatingDrivers,
  downsideOperatingDrivers,
  upsideOperatingDrivers,
  type OperatingDrivers,
} from "./operating.ts"
import {
  baseValuationDrivers,
  downsideValuationDrivers,
  upsideValuationDrivers,
  type ValuationDrivers,
} from "./valuation.ts"
import {
  baseWorkingCapitalDrivers,
  downsideWorkingCapitalDrivers,
  upsideWorkingCapitalDrivers,
  type WorkingCapitalDrivers,
} from "./workingCapital.ts"

export interface ScenarioFramingColumns {
  readonly growth: string
  readonly marginCapital: string
  readonly valuation: string
}

export interface ScenarioDriverBundle {
  readonly scenario: ScenarioName
  readonly framing: string
  readonly framingColumns: ScenarioFramingColumns
  readonly operating: OperatingDrivers
  readonly workingCapital: WorkingCapitalDrivers
  readonly capitalStructure: CapitalStructureDrivers
  readonly valuation: ValuationDrivers
}

export function getScenarioDrivers(
  scenario: ScenarioName
): ScenarioDriverBundle {
  switch (scenario) {
    case "Downside":
      return Object.freeze({
        scenario: "Downside",
        framing:
          "Slower openings, competitive comp deceleration, wage and tariff margin pressure, higher ERP, and lower multiples",
        framingColumns: Object.freeze({
          growth: "Slower net club openings and comp deceleration",
          marginCapital:
            "Wage and tariff margin drag with elevated depot CapEx",
          valuation: "Higher ERP and peer-converging multiples",
        }),
        operating: downsideOperatingDrivers(),
        workingCapital: downsideWorkingCapitalDrivers(),
        capitalStructure: downsideCapitalStructureDrivers(),
        valuation: downsideValuationDrivers(),
      })
    case "Base":
      return Object.freeze({
        scenario: "Base",
        framing:
          "Guided openings, moderating comps, post-hike fee normalization, near-term CapEx step-up, and cycle-average WACC",
        framingColumns: Object.freeze({
          growth: "Guided club rollout with moderating core comps",
          marginCapital: "Post-hike MFI normalization and near-term CapEx",
          valuation: "Cycle-average WACC and calibrated multiples",
        }),
        operating: baseOperatingDrivers(),
        workingCapital: baseWorkingCapitalDrivers(),
        capitalStructure: baseCapitalStructureDrivers(),
        valuation: baseValuationDrivers(),
      })
    case "Upside":
      return Object.freeze({
        scenario: "Upside",
        framing:
          "Sustained global rollout, resilient comps, private-label margin lift, cash SG&A leverage, lower ERP, and sustained multiples",
        framingColumns: Object.freeze({
          growth: "Accelerated global rollout and resilient core comps",
          marginCapital: "Private-label lift with cash SG&A leverage",
          valuation: "Lower ERP and sustained spot multiples",
        }),
        operating: upsideOperatingDrivers(),
        workingCapital: upsideWorkingCapitalDrivers(),
        capitalStructure: upsideCapitalStructureDrivers(),
        valuation: upsideValuationDrivers(),
      })
  }
}

export const ALL_SCENARIO_DRIVERS: Readonly<
  Record<ScenarioName, ScenarioDriverBundle>
> = Object.freeze({
  Downside: getScenarioDrivers("Downside"),
  Base: getScenarioDrivers("Base"),
  Upside: getScenarioDrivers("Upside"),
})

export * from "./types.ts"
export * from "./operating.ts"
export * from "./workingCapital.ts"
export * from "./capitalStructure.ts"
export * from "./valuation.ts"
