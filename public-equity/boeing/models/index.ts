import { Model, type CompiledModel } from "f8-engine"
import { allScenarioBundles, type ScenarioBundle } from "./assumptions.ts"
import { loadBoeingKgData, type BoeingKgData } from "./kg-loader.ts"
import { buildAssumptionsSheet } from "./sheets/assumptions.ts"
import { buildBetaDataSheet } from "./sheets/beta-data.ts"
import { buildCompsSheet } from "./sheets/comps.ts"
import { buildCoreModelSheet } from "./sheets/core-model.ts"
import { buildNotesSheet } from "./sheets/notes.ts"
import { buildSchedulesSheet } from "./sheets/schedules.ts"
import { buildSensitivitiesSheet } from "./sheets/sensitivities.ts"
import {
  buildSummarySheet,
  type ScenarioSnapshots,
  type ScenarioValuationSnapshot,
} from "./sheets/summary.ts"
import { buildValuationSheet } from "./sheets/valuation.ts"
import { SCENARIO_KEYS, type ScenarioKey } from "./timeline.ts"

export interface CompileBoeingOptions {
  readonly scenario?: ScenarioKey
  readonly auditedDir?: string
  readonly kgData?: BoeingKgData
  readonly scenarios?: Readonly<Record<ScenarioKey, ScenarioBundle>>
  readonly snapshots?: ScenarioSnapshots
}

export interface AllScenariosResult {
  readonly kg: BoeingKgData
  readonly scenarios: Readonly<Record<ScenarioKey, ScenarioBundle>>
  readonly snapshots: ScenarioSnapshots
  readonly compiled: Readonly<Record<ScenarioKey, CompiledModel>>
}

function buildSingleModel(
  activeScenario: ScenarioKey,
  kg: BoeingKgData,
  scenarios: Readonly<Record<ScenarioKey, ScenarioBundle>>,
  snapshots?: ScenarioSnapshots
): Model {
  const model = new Model({
    name: "The Boeing Company (NYSE: BA) — Initiation & Valuation Model",
    theme: "corporate_navy",
  })

  const summarySheet = model.addSheet("Summary", {
    layout: "grid",
    tabColor: "#1B365D",
  })
  const assumptionsSheet = model.addSheet("Assumptions", {
    layout: "grid",
    tabColor: "#2C5282",
  })
  const modelSheet = model.addSheet("Model", {
    layout: "grid",
    tabColor: "#2B6CB0",
  })
  const schedulesSheet = model.addSheet("Schedules", {
    layout: "grid",
    tabColor: "#3182CE",
  })
  const valuationSheet = model.addSheet("Valuation", {
    layout: "grid",
    tabColor: "#1E4E8C",
  })
  const sensitivitiesSheet = model.addSheet("Sensitivities", {
    layout: "grid",
    tabColor: "#2A4365",
  })
  const compsSheet = model.addSheet("Comps", {
    layout: "grid",
    tabColor: "#4A5568",
  })
  const betaSheet = model.addSheet("Beta Data", {
    layout: "grid",
    tabColor: "#718096",
  })
  const notesSheet = model.addSheet("Notes", {
    layout: "auto",
    tabColor: "#A0AEC0",
  })

  buildSummarySheet(summarySheet, kg, activeScenario, snapshots)
  buildAssumptionsSheet(assumptionsSheet, scenarios)
  buildCoreModelSheet(modelSheet, kg)
  buildSchedulesSheet(schedulesSheet, kg)
  buildValuationSheet(valuationSheet, kg)
  buildSensitivitiesSheet(sensitivitiesSheet)
  buildCompsSheet(compsSheet, kg)
  buildBetaDataSheet(betaSheet, kg)
  buildNotesSheet(notesSheet, scenarios)

  return model
}

function extractSnapshot(compiled: CompiledModel): ScenarioValuationSnapshot {
  const minLiq = Math.min(
    ...(
      ["2026E", "2027E", "2028E", "2029E", "2030E", "2031E", "2032E"] as const
    ).map((c) => compiled.num("DebtLiquiditySchedule", "liquidity_headroom", c))
  )
  return Object.freeze({
    wacc: compiled.num("WaccBuild", "wacc", "val"),
    pvExplicit: compiled.num("EvToEquityBridge", "pv_explicit", "val"),
    pvTerminal: compiled.num("EvToEquityBridge", "pv_terminal", "val"),
    pvPostNol: compiled.num("EvToEquityBridge", "pv_post_terminal_nol", "val"),
    evAnchor: compiled.num("EvToEquityBridge", "ev_anchor", "val"),
    tvPctEv: compiled.num("EvToEquityBridge", "tv_pct_ev", "val"),
    impliedEv: compiled.num("EvToEquityBridge", "implied_ev", "val"),
    impliedEquityPre: compiled.num(
      "EvToEquityBridge",
      "implied_equity_pre",
      "val"
    ),
    baPraShares: compiled.num(
      "EvToEquityBridge",
      "ba_pra_converted_shares",
      "val"
    ),
    totalDilutedShares: compiled.num(
      "EvToEquityBridge",
      "total_diluted_shares",
      "val"
    ),
    impliedPrice: compiled.num("EvToEquityBridge", "implied_price", "val"),
    impliedReturnPct: compiled.num(
      "EvToEquityBridge",
      "implied_return_pct",
      "val"
    ),
    exitEvEbitda: compiled.num(
      "EvToEquityBridge",
      "implied_exit_ev_ebitda",
      "val"
    ),
    sotpPrice: compiled.num("SotpValuation", "sotp_price", "value"),
    revFy32e: compiled.num("IncomeStatement", "revenue_total", "2032E"),
    ebitFy32e: compiled.num("IncomeStatement", "operating_income", "2032E"),
    ebitMarginFy32e: compiled.num(
      "SegmentOperatingBuild",
      "margin_consol",
      "2032E"
    ),
    econFcffFy32e: compiled.num("DcfSchedule", "economic_fcff", "2032E"),
    epsFy27e: compiled.num("IncomeStatement", "eps_diluted", "2027E"),
    epsFy29e: compiled.num("IncomeStatement", "eps_diluted", "2029E"),
    roicFy32e: compiled.num("InvestedCapitalRoic", "roic_incl_gw", "2032E"),
    netDebtFy32e: compiled.num(
      "DebtLiquiditySchedule",
      "net_debt_carrying",
      "2032E"
    ),
    minLiquidityHeadroom: minLiq,
  })
}

function computeAllSnapshots(
  kg: BoeingKgData,
  scenarios: Readonly<Record<ScenarioKey, ScenarioBundle>>
): ScenarioSnapshots {
  const out = {} as Record<ScenarioKey, ScenarioValuationSnapshot>
  for (const key of SCENARIO_KEYS) {
    const pass1 = buildSingleModel(key, kg, scenarios).compile()
    try {
      out[key] = extractSnapshot(pass1)
    } finally {
      pass1.dispose()
    }
  }
  return Object.freeze(out)
}

/**
 * Pure side-effect-free model compilation entrypoint. Compiles a self-contained
 * workbook for the requested active scenario with reconciled side-by-side
 * Downside / Base / Upside benchmarks on Summary.
 */
export function compileBoeingModel(
  scenarioOrOpts: ScenarioKey | CompileBoeingOptions = "base"
): CompiledModel {
  const opts: CompileBoeingOptions =
    typeof scenarioOrOpts === "string"
      ? { scenario: scenarioOrOpts }
      : scenarioOrOpts
  const activeScenario = opts.scenario ?? "base"
  const kg = opts.kgData ?? loadBoeingKgData(opts.auditedDir ?? "data/audited")
  const scenarios = opts.scenarios ?? allScenarioBundles()
  const snapshots = opts.snapshots ?? computeAllSnapshots(kg, scenarios)
  return buildSingleModel(activeScenario, kg, scenarios, snapshots).compile()
}

/**
 * Pure multi-scenario compiler returning compiled models and extracted snapshots
 * for Downside, Base, and Upside sharing a single KgRegistry load.
 */
export function compileAllScenarios(
  auditedDir = "data/audited"
): AllScenariosResult {
  const kg = loadBoeingKgData(auditedDir)
  const scenarios = allScenarioBundles()
  const snapshots = computeAllSnapshots(kg, scenarios)
  const compiled = {} as Record<ScenarioKey, CompiledModel>
  for (const key of SCENARIO_KEYS) {
    compiled[key] = buildSingleModel(key, kg, scenarios, snapshots).compile()
  }
  return {
    kg,
    scenarios,
    snapshots,
    compiled: Object.freeze(compiled),
  }
}

export { allScenarioBundles, getScenarioBundle } from "./assumptions.ts"
export { loadBoeingKgData } from "./kg-loader.ts"
export type { ScenarioKey } from "./timeline.ts"
export type {
  ScenarioSnapshots,
  ScenarioValuationSnapshot,
} from "./sheets/summary.ts"
