import { Model, type CompiledModel } from "f8-engine"
import { loadCostcoKnowledgeData, type CostcoKnowledgeData } from "./kg.ts"
import { buildAssumptionsTables } from "./statements/assumptionsSheet.ts"
import {
  buildBalanceSheet,
  buildShareEquitySchedule,
} from "./statements/balanceSheet.ts"
import { buildCashFlowStatement } from "./statements/cashFlow.ts"
import { buildDebtAndLeasesSchedules } from "./statements/debtLeases.ts"
import { buildIncomeStatement } from "./statements/incomeStatement.ts"
import { buildOperatingSchedules } from "./statements/operating.ts"
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

const WORKBOOK_PRINT_DEFAULTS = {
  paperSize: "letter" as const,
  orientation: "landscape" as const,
  fit: "fit_width" as const,
  centerHorizontally: true,
  header: {
    left: "{model}",
    right: "{sheet}",
  },
  footer: {
    left: "Michael Hu, CFA | mhu@outlook.co.nz",
    center: "Valuation as of Nov 13, 2026",
    right: "Page {page} of {pages}",
  },
}

function buildCostcoModelSpec(
  kg: CostcoKnowledgeData,
  activeScenario: ScenarioName,
  snapshots: Readonly<Record<ScenarioName, ScenarioSnapshot>> | null
): Model {
  const model = new Model({
    name: `Costco Wholesale Corp (COST) — ${activeScenario} Case`,
    theme: "corporate_navy",
    print: WORKBOOK_PRINT_DEFAULTS,
  })

  const execSheet = model.addSheet("Exec Summary", {
    layout: "grid",
    colWidth: 12,
    tabColor: "#1E3A8A",
  })
  const assumptionsSheet = model.addSheet("Assumptions", {
    layout: "grid",
    colWidth: 11,
    tabColor: "#0F766E",
  })
  const statementsSheet = model.addSheet("3-Statement Model", {
    layout: "grid",
    colWidth: 11.5,
    tabColor: "#15803D",
  })
  const schedulesSheet = model.addSheet("Schedules & ROIC", {
    layout: "grid",
    colWidth: 11,
    tabColor: "#4338CA",
  })
  const dcfSheet = model.addSheet("DCF & WACC", {
    layout: "grid",
    colWidth: 11,
    tabColor: "#B91C1C",
  })
  const compsSheet = model.addSheet("Trading Comps", {
    layout: "grid",
    colWidth: 11,
    tabColor: "#C2410C",
  })
  const unitEconSheet = model.addSheet("Unit Economics", {
    layout: "grid",
    colWidth: 12,
    tabColor: "#0369A1",
    print: { fit: "fit_page" },
  })

  // Tab 1: Executive Summary (6 crisp pages at ~92% scale)
  const exec = buildExecutiveSummaryTables(
    execSheet,
    kg,
    activeScenario,
    snapshots
  )
  const bridges = buildValuationBridges(execSheet, snapshots)
  execSheet.setBands([
    { lanes: [exec.control, exec.kpiTable] },
    { lanes: [bridges.footballField], gap: 1 },
    { lanes: [exec.scenarioSummary], pageBreakBefore: true },
    { lanes: [exec.consensusTable], pageBreakBefore: true },
    { lanes: [exec.consensusEpsBridge], pageBreakBefore: true },
    { lanes: [bridges.scenarioVariance], gap: 1 },
    { lanes: [bridges.evAttribution], pageBreakBefore: true },
    { lanes: [bridges.peAttribution], pageBreakBefore: true },
  ])

  // Tab 2: Assumptions & Anchors (7 crisp pages at ~66% scale)
  const assumptions = buildAssumptionsTables(
    assumptionsSheet,
    kg,
    activeScenario
  )
  assumptionsSheet.setBands([
    assumptions.framingTable,
    {
      lanes: [assumptions.scalarOperating, assumptions.anchorsMarket],
      gap: 1,
    },
    {
      lanes: [assumptions.scalarValuation, assumptions.anchorsConsensus],
      pageBreakBefore: true,
    },
    { lanes: [assumptions.periodActive], pageBreakBefore: true },
    ...assumptions.periodScenarios.map((tbl) => ({
      lanes: [tbl],
      pageBreakBefore: true,
    })),
    { lanes: [assumptions.debtTable], pageBreakBefore: true },
  ])

  // Tab 3: Core 3-Statement Model (5 single-page schedules at ~63% scale)
  const operating = buildOperatingSchedules(statementsSheet, kg)
  const incomeStatement = buildIncomeStatement(statementsSheet, kg)
  const balanceSheet = buildBalanceSheet(statementsSheet, kg)
  const cashFlowStatement = buildCashFlowStatement(statementsSheet, kg)
  statementsSheet.setBands([
    operating.volumeSchedule,
    { lanes: [operating.marginSchedule], pageBreakBefore: true },
    { lanes: [incomeStatement], pageBreakBefore: true },
    { lanes: [balanceSheet], pageBreakBefore: true },
    { lanes: [cashFlowStatement], pageBreakBefore: true },
  ])

  // Tab 4: Supporting Schedules & ROIC (5 single-page schedules at ~66% scale)
  const wcPpe = buildWorkingCapitalPpeSchedule(schedulesSheet, kg)
  const debtAndLeases = buildDebtAndLeasesSchedules(schedulesSheet, kg)
  const shareEquity = buildShareEquitySchedule(schedulesSheet, kg)
  const roic = buildRoicSchedule(schedulesSheet)
  schedulesSheet.setBands([
    wcPpe,
    { lanes: [debtAndLeases.debtSchedule], pageBreakBefore: true },
    { lanes: [debtAndLeases.leasesInterestSchedule], pageBreakBefore: true },
    { lanes: [shareEquity], pageBreakBefore: true },
    { lanes: [roic], pageBreakBefore: true },
  ])

  // Tab 5: DCF, WACC, Implied Expectations & Sensitivities (5 balanced pages at ~66% scale)
  const dcf = buildDcfTables(dcfSheet, snapshots)
  const waccSchedule = buildWaccSchedule(dcfSheet)
  dcfSheet.setBands([
    dcf.dcfSchedule,
    {
      lanes: [waccSchedule, dcf.dcfBridge],
      pageBreakBefore: true,
    },
    {
      lanes: [dcf.reverseDcf, dcf.impliedRateCalc],
      pageBreakBefore: true,
    },
    {
      lanes: [dcf.indifferenceFrontier, dcf.valuationKnobs],
      pageBreakBefore: true,
    },
    {
      lanes: [dcf.sensitivityPerp, dcf.sensitivityExit],
      gap: 1,
    },
    {
      lanes: [dcf.sensitivityOps, dcf.sensitivityOpsVsSpot],
      gap: 1,
    },
    {
      lanes: [dcf.rateDiscountFactors],
      pageBreakBefore: true,
    },
    dcf.opsSensFactors,
  ])

  // Tab 6: Trading Comparables & Bridges (5 balanced pages at ~75% scale)
  const comps = buildCompsSchedules(compsSheet, kg)
  compsSheet.setBands([
    comps.compsLtmValuation,
    { lanes: [comps.compsLtmProfile], gap: 1 },
    { lanes: [comps.compsForwardValuation], pageBreakBefore: true },
    { lanes: [comps.compsForwardEstimates], gap: 1 },
    {
      lanes: [comps.peerEvBridge, comps.compsValuation],
      pageBreakBefore: true,
    },
    { lanes: [comps.peerQoeRoicBridge], pageBreakBefore: true },
    {
      lanes: [comps.clubPeerLtmBridge, comps.massRetailPeerLtmBridge],
      pageBreakBefore: true,
    },
  ])

  // Tab 7: Club Unit Economics (locked 1 x 1 landscape page)
  const unitEcon = buildUnitEconomicsTables(unitEconSheet, kg)
  unitEconSheet.setBands([
    {
      lanes: [unitEcon.unitEconomics, unitEcon.bridge],
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
