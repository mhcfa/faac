import { Model, type CompiledModel } from "f8-engine"
import { loadCostcoKnowledgeData, type CostcoKnowledgeData } from "./kg.ts"
import { buildAssumptionsTables } from "./statements/assumptionsSheet.ts"
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
  buildValuationBridges,
  extractScenarioSnapshot,
  type ScenarioSnapshot,
} from "./valuation/bridges.ts"
import { buildCompsSchedules } from "./valuation/comps.ts"
import { buildDcfTables } from "./valuation/dcf.ts"
import { buildExecutiveSummaryTables } from "./valuation/executiveSummary.ts"
import { buildUnitEconomicsTables } from "./valuation/unitEconomics.ts"
import { buildWaccSchedule } from "./valuation/wacc.ts"

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
  const exec = buildExecutiveSummaryTables(
    execSheet,
    kg,
    activeScenario,
    snapshots
  )
  const bridges = buildValuationBridges(execSheet, snapshots)
  execSheet.setBands([
    { lanes: [{ tables: [exec.control] }, { tables: [exec.kpiTable] }] },
    exec.scenarioSummary,
    exec.consensusTable,
    bridges.footballField,
    bridges.scenarioVariance,
    bridges.priceAttribution,
  ])

  // Tab 2: Assumptions & Anchors
  const assumptions = buildAssumptionsTables(
    assumptionsSheet,
    kg,
    activeScenario
  )
  assumptionsSheet.setBands([
    assumptions.framingTable,
    {
      lanes: [
        { tables: [assumptions.scalarActive] },
        { tables: [assumptions.anchors] },
      ],
    },
    assumptions.periodActive,
    ...assumptions.periodScenarios,
    assumptions.debtTable,
  ])

  // Tab 3: Core 3-Statement Model (vertical 15Y stack)
  const operatingSchedule = buildOperatingSchedule(statementsSheet, kg)
  const incomeStatement = buildIncomeStatement(statementsSheet, kg)
  const balanceSheet = buildBalanceSheet(statementsSheet, kg)
  const cashFlowStatement = buildCashFlowStatement(statementsSheet, kg)
  statementsSheet.setBands([
    operatingSchedule,
    incomeStatement,
    balanceSheet,
    cashFlowStatement,
  ])

  // Tab 4: Supporting Schedules & ROIC (vertical 15Y stack)
  const wcPpe = buildWorkingCapitalPpeSchedule(schedulesSheet, kg)
  const debtLeases = buildDebtLeasesSchedule(schedulesSheet, kg)
  const shareEquity = buildShareEquitySchedule(schedulesSheet, kg)
  const roic = buildRoicSchedule(schedulesSheet)
  schedulesSheet.setBands([wcPpe, debtLeases, shareEquity, roic])

  // Tab 5: DCF, WACC, Implied Expectations & Sensitivities
  const dcf = buildDcfTables(dcfSheet, snapshots)
  const waccSchedule = buildWaccSchedule(dcfSheet)
  dcfSheet.setBands([
    dcf.dcfSchedule,
    { lanes: [{ tables: [waccSchedule] }, { tables: [dcf.dcfBridge] }] },
    {
      lanes: [{ tables: [dcf.reverseDcf] }, { tables: [dcf.impliedRateCalc] }],
    },
    dcf.valuationSensSummary,
    {
      lanes: [
        { tables: [dcf.sensitivityPerp] },
        { tables: [dcf.sensitivityExit] },
      ],
    },
    {
      lanes: [
        { tables: [dcf.sensitivityOps] },
        { tables: [dcf.sensitivityOpsVsSpot] },
      ],
    },
    dcf.rateDiscountFactors,
    dcf.opsSensFactors,
  ])

  // Tab 6: Trading Comparables & Bridges
  const comps = buildCompsSchedules(compsSheet, kg)
  compsSheet.setBands([
    comps.compsLtm,
    comps.compsForward,
    {
      lanes: [
        { tables: [comps.peerLtmBridge] },
        { tables: [comps.peerEvAndQoeBridge] },
        { tables: [comps.compsValuation] },
      ],
    },
  ])

  // Tab 7: Club Unit Economics
  const unitEcon = buildUnitEconomicsTables(unitEconSheet, kg)
  unitEconSheet.setBands([
    {
      lanes: [
        { tables: [unitEcon.unitEconomics] },
        { tables: [unitEcon.bridge] },
      ],
    },
  ])

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
