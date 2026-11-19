import { Model, type CompiledModel } from "f8-engine"
import { loadCostcoKnowledgeData, type CostcoKnowledgeData } from "./kg.ts"
import { buildAssumptionsSheet } from "./statements/assumptionsSheet.ts"
import { buildBalanceSheetAndEquity } from "./statements/balanceSheet.ts"
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
import { buildDcfSchedules } from "./valuation/dcf.ts"
import { buildExecutiveSummarySheet } from "./valuation/executiveSummary.ts"
import { buildUnitEconomicsSchedule } from "./valuation/unitEconomics.ts"
import { buildWaccSchedule } from "./valuation/wacc.ts"

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
    tabColor: "#1E3A8A",
  })
  const assumptionsSheet = model.addSheet("Assumptions", {
    tabColor: "#0F766E",
  })
  const operatingSheet = model.addSheet("Operating", {
    tabColor: "#1D4ED8",
  })
  const isCfSheet = model.addSheet("Income & Cash Flow", {
    tabColor: "#15803D",
  })
  const bsRoicSheet = model.addSheet("Balance Sheet & ROIC", {
    tabColor: "#4338CA",
  })
  const wcDebtSheet = model.addSheet("WC, PPE & Debt", {
    tabColor: "#7C3AED",
  })
  const dcfSheet = model.addSheet("DCF & WACC", {
    tabColor: "#B91C1C",
  })
  const compsSheet = model.addSheet("Trading Comps", {
    tabColor: "#C2410C",
  })
  const unitEconSheet = model.addSheet("Unit Economics", {
    tabColor: "#0369A1",
  })

  // Assemble tables across worksheets
  buildExecutiveSummarySheet(execSheet, kg, activeScenario, snapshots)
  buildAssumptionsSheet(assumptionsSheet, kg, activeScenario)
  buildOperatingSchedule(operatingSheet, kg)

  const incomeStatement = buildIncomeStatement(isCfSheet, kg)
  buildCashFlowStatement(isCfSheet, kg, incomeStatement)

  const { shareEquity } = buildBalanceSheetAndEquity(bsRoicSheet, kg)
  buildRoicSchedule(bsRoicSheet, shareEquity)

  const wcPpe = buildWorkingCapitalPpeSchedule(wcDebtSheet, kg)
  buildDebtLeasesSchedule(wcDebtSheet, kg, wcPpe)

  const waccSchedule = buildWaccSchedule(dcfSheet, kg)
  buildDcfSchedules(dcfSheet, waccSchedule)

  buildCompsSchedules(compsSheet, kg)
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
