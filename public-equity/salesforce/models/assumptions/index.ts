import type { ScenarioKey } from "../timeline.ts"
import { baseDrivers, downsideDrivers, upsideDrivers } from "./scenarios.ts"
import type { ScenarioBundle } from "./types.ts"

export { baseDrivers, downsideDrivers, upsideDrivers } from "./scenarios.ts"
export {
  formatDriverProvenance,
  PERIOD_DRIVER_KEYS,
  periodDriver,
  SCALAR_DRIVER_KEYS,
  scalarDriver,
  type Driver,
  type DriverMeta,
  type PeriodDriverBundle,
  type PeriodDriverKey,
  type PeriodVector,
  type ScalarDriverBundle,
  type ScalarDriverKey,
  type ScenarioBundle,
} from "./types.ts"

export interface AllScenarioBundles {
  readonly downside: ScenarioBundle
  readonly base: ScenarioBundle
  readonly upside: ScenarioBundle
}

export function allScenarios(): AllScenarioBundles {
  return Object.freeze({
    downside: downsideDrivers(),
    base: baseDrivers(),
    upside: upsideDrivers(),
  })
}

export function scenarioByKey(key: ScenarioKey): ScenarioBundle {
  switch (key) {
    case "downside":
      return downsideDrivers()
    case "base":
      return baseDrivers()
    case "upside":
      return upsideDrivers()
  }
}
