import { Model, type CompiledModel } from "f8-engine"
import { loadCostcoKnowledgeData, type CostcoKnowledgeData } from "./kg.ts"
import { buildAssumptionsSheet } from "./statements/assumptionsSheet.ts"
import {
  buildBalanceSheet,
  buildShareEquitySchedule,
} from "./statements/balanceSheet.ts"
import { buildCashFlowStatement } from "./statements/cashFlow.ts"
import { buildDebtLeasesSchedule } from "./statements/debtLeases.ts"
import { buildIncomeStatement } from "./statements/incomeStatement.ts"
import { buildOperatingSchedule } from "./statements/operating.ts"
import { buildRoicSchedule } from "./statements/roic.ts"
import { buildWorkingCapitalPpeSchedule } from "./statements/workingCapitalPpe.ts"
import { SCENARIOS, type ScenarioName } from "./timeline.ts"
import {
  extractScenarioSnapshot,
  type ScenarioSnapshot,
} from "./valuation/bridges.ts"
import { buildCompsSchedules } from "./valuation/comps.ts"
import { buildDcfAndWaccSheet } from "./valuation/dcf.ts"
import { buildExecutiveSummarySheet } from "./valuation/executiveSummary.ts"
import { buildUnitEconomicsSchedule } from "./valuation/unitEconomics.ts"

const GRID_SHEET_OPTS = {
  layout: "grid" as const,
  colWidth: 12,
}

function buildCostcoModelSpec(
  kg: CostcoKnowledgeData,
  activeScenario: ScenarioName,
  snapshots: Readonly<Record<ScenarioName, ScenarioSnapshot>> | null
): Model {
  const model = new Model({
    name: `Costco Wholesale Corp (COST) — ${activeScenario} Case`,
    theme: "corporate_navy",
  })

  const execSheet = model.addSheet("Exec Summary", {
    ...GRID_SHEET_OPTS,
    tabColor: "#1E3A8A",
  })
  const assumptionsSheet = model.addSheet("Assumptions", {
    ...GRID_SHEET_OPTS,
    tabColor: "#0F766E",
  })
  const statementsSheet = model.addSheet("3-Statement Model", {
    ...GRID_SHEET_OPTS,
    tabColor: "#15803D",
  })
  const schedulesSheet = model.addSheet("Schedules & ROIC", {
    ...GRID_SHEET_OPTS,
    tabColor: "#4338CA",
  })
  const dcfSheet = model.addSheet("DCF & WACC", {
    ...GRID_SHEET_OPTS,
    tabColor: "#B91C1C",
  })
  const compsSheet = model.addSheet("Trading Comps", {
    ...GRID_SHEET_OPTS,
    tabColor: "#C2410C",
  })
  const unitEconSheet = model.addSheet("Unit Economics", {
    ...GRID_SHEET_OPTS,
    tabColor: "#0369A1",
  })

  // Tab 1: Executive Summary
  buildExecutiveSummarySheet(execSheet, kg, activeScenario, snapshots)

  // Tab 2: Assumptions & Anchors
  buildAssumptionsSheet(assumptionsSheet, kg, activeScenario)

  // Tab 3: Core 3-Statement Model (vertical 15Y stack)
  const operatingSchedule = buildOperatingSchedule(statementsSheet, kg)
  const incomeStatement = buildIncomeStatement(
    statementsSheet,
    kg,
    operatingSchedule
  )
  const balanceSheet = buildBalanceSheet(statementsSheet, kg, incomeStatement)
  buildCashFlowStatement(statementsSheet, kg, balanceSheet)

  // Tab 4: Supporting Schedules & ROIC (vertical 15Y stack)
  const wcPpe = buildWorkingCapitalPpeSchedule(schedulesSheet, kg)
  const debtLeases = buildDebtLeasesSchedule(schedulesSheet, kg, wcPpe)
  const shareEquity = buildShareEquitySchedule(schedulesSheet, kg, debtLeases)
  buildRoicSchedule(schedulesSheet, shareEquity)

  // Tab 5: DCF, WACC, Implied Expectations & Sensitivities
  buildDcfAndWaccSheet(dcfSheet, kg, snapshots)

  // Tab 6: Trading Comparables & Bridges
  buildCompsSchedules(compsSheet, kg)

  // Tab 7: Club Unit Economics
  buildUnitEconomicsSchedule(unitEconSheet, kg)

  return model
}

export function buildCostcoWorkbook(scenario: ScenarioName = "Base"): Model {
  const kg = loadCostcoKnowledgeData()
  const snapshots: Partial<Record<ScenarioName, ScenarioSnapshot>> = {}
  for (const sc of SCENARIOS) {
    const passModel = buildCostcoModelSpec(kg, sc, null)
    using compiledPass = passModel.compile()
    snapshots[sc] = extractScenarioSnapshot(compiledPass, sc)
  }
  return buildCostcoModelSpec(
    kg,
    scenario,
    snapshots as Record<ScenarioName, ScenarioSnapshot>
  )
}

export function compileCostcoModel(
  scenario: ScenarioName = "Base"
): CompiledModel {
  return buildCostcoWorkbook(scenario).compile()
}

export * from "./timeline.ts"
export * from "./kg.ts"
export * from "./assumptions/index.ts"
export type { ScenarioSnapshot } from "./valuation/bridges.ts"
