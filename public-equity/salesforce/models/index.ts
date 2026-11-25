import { Model, type CompiledModel } from "f8-engine"
import { allScenarios, type AllScenarioBundles } from "./assumptions/index.ts"
import { loadAuditedData, type AuditedDataSnapshot } from "./kg.ts"
import { buildAssumptionsSheet } from "./schedules/assumptions.ts"
import { buildDiagnosticsTables } from "./schedules/diagnostics.ts"
import {
  buildExecutiveSummarySheet,
  type AllScenarioSnapshots,
  type ScenarioOutputSnapshot,
} from "./schedules/executiveSummary.ts"
import {
  buildMarketAndBetaSheet,
  buildMarketDataSheet,
} from "./schedules/marketBeta.ts"
import {
  buildAuditedFootnoteAnchorsTable,
  buildOperatingAnnualTables,
} from "./schedules/operating.ts"
import { buildPeerCompsSheet } from "./schedules/peerComps.ts"
import {
  buildLtmAndQ2AnchorTables,
  buildStatementsTables,
} from "./schedules/statements.ts"
import { buildValuationSheet } from "./schedules/valuation.ts"
import type { ScenarioKey } from "./timeline.ts"

export {
  allScenarios,
  baseDrivers,
  downsideDrivers,
  upsideDrivers,
  type AllScenarioBundles,
  type ScenarioBundle,
} from "./assumptions/index.ts"
export {
  loadAuditedData,
  type AuditedDataSnapshot,
  type MarketPricesSnapshot,
  type ScheduleCitations,
} from "./kg.ts"
export type {
  AllScenarioSnapshots,
  ScenarioOutputSnapshot,
} from "./schedules/executiveSummary.ts"
export {
  ANNUAL_PERIODS,
  DISPLAY_DIVISORS,
  FORECAST_PERIODS,
  HIST_ANNUAL_PERIODS,
  PEER_TICKERS,
  SCENARIO_INDEX,
  SCENARIO_KEYS,
  type AnnualPeriod,
  type ForecastPeriod,
  type HistAnnualPeriod,
  type PeerTicker,
  type ScenarioKey,
} from "./timeline.ts"

const ZERO_SNAPSHOT: ScenarioOutputSnapshot = Object.freeze({
  spotPrice: 1,
  dcfGordonPrice: 1,
  upsideVsSpot: 0,
  dcfExitMultPrice: 1,
  consensusTarget: 1,
  operatingEv: 0,
  impliedEquityValue: 0,
  pfDilutedShares: 1,
  rfRate: 0,
  beta5yM: 1,
  wacc: 0.1,
  wacc2yW: 0.1,
  terminalGrowth: 0.03,
  fwdFy28FcffYield: 0,
  spotFy28FcffYield: 0,
  netNonOpBridge: 0,
  stratInvNet: 0,
  revFy27: 0,
  revFy30: 0,
  revFy31: 0,
  revCagr26To31: 0,
  gaapOmFy27: 0,
  gaapOmFy31: 0,
  nonGaapOmFy31: 0,
  fcffFy27: 0,
  fcffFy31: 0,
  roicFy31: 0,
})

const PLACEHOLDER_SNAPSHOTS: AllScenarioSnapshots = Object.freeze({
  downside: ZERO_SNAPSHOT,
  base: ZERO_SNAPSHOT,
  upside: ZERO_SNAPSHOT,
})

export function extractScenarioSnapshot(
  compiled: CompiledModel
): ScenarioOutputSnapshot {
  return Object.freeze({
    spotPrice: compiled.num("BetaSummaryTable", "CRM", "spot_px"),
    dcfGordonPrice: compiled.num(
      "EvToEquityBridge",
      "implied_share_price",
      "gordon"
    ),
    upsideVsSpot: compiled.num("EvToEquityBridge", "upside_downside", "gordon"),
    dcfExitMultPrice: compiled.num(
      "EvToEquityBridge",
      "implied_share_price",
      "exit_mult"
    ),
    consensusTarget: compiled.num(
      "AuditedFootnoteAnchors",
      "crm_target_mean",
      "val"
    ),
    operatingEv: compiled.num(
      "DcfSummaryTable",
      "operating_ev_val_date",
      "gordon"
    ),
    impliedEquityValue: compiled.num(
      "EvToEquityBridge",
      "implied_equity_value",
      "gordon"
    ),
    pfDilutedShares: compiled.num(
      "EvToEquityBridge",
      "pf_diluted_shares",
      "gordon"
    ),
    rfRate: compiled.num("WaccSchedule", "rf", "primary"),
    beta5yM: compiled.num("WaccSchedule", "relevered_beta", "primary"),
    wacc: compiled.num("WaccSchedule", "wacc", "primary"),
    wacc2yW: compiled.num("WaccSchedule", "wacc", "short_regime"),
    terminalGrowth: compiled.num(
      "ScalarDrivers",
      "terminalGrowthRate",
      "active"
    ),
    fwdFy28FcffYield: compiled.num(
      "DcfSummaryTable",
      "fwd_fy28_fcff_yield",
      "gordon"
    ),
    spotFy28FcffYield: compiled.num(
      "DcfSummaryTable",
      "spot_fy28_fcff_yield",
      "gordon"
    ),
    netNonOpBridge: compiled.num(
      "EvToEquityBridge",
      "net_non_op_bridge",
      "gordon"
    ),
    stratInvNet: compiled.num(
      "EvToEquityBridge",
      "plus_strat_inv_net",
      "gordon"
    ),
    revFy27: compiled.num("IncomeStatement", "total_revenue", "FY27E"),
    revFy30: compiled.num("IncomeStatement", "total_revenue", "FY30E"),
    revFy31: compiled.num("IncomeStatement", "total_revenue", "FY31E"),
    revCagr26To31: compiled.num(
      "ExecutiveDashboard",
      "rev_cagr_26_31",
      "active"
    ),
    gaapOmFy27: compiled.num(
      "IncomeStatement",
      "gaap_operating_margin",
      "FY27E"
    ),
    gaapOmFy31: compiled.num(
      "IncomeStatement",
      "gaap_operating_margin",
      "FY31E"
    ),
    nonGaapOmFy31: compiled.num(
      "IncomeStatement",
      "nongaap_operating_margin",
      "FY31E"
    ),
    fcffFy27: compiled.num("QoeAndCashConversion", "unlevered_fcff", "FY27E"),
    fcffFy31: compiled.num("QoeAndCashConversion", "unlevered_fcff", "FY31E"),
    roicFy31: compiled.num("InvestedCapitalAndRoic", "headline_roic", "FY31E"),
  })
}

export interface BuildModelOptions {
  readonly scenario?: ScenarioKey
  readonly auditedDir?: string
  readonly audited?: AuditedDataSnapshot
  readonly scenarios?: AllScenarioBundles
  readonly snapshots?: AllScenarioSnapshots
}

function buildModelInternal(
  activeScenario: ScenarioKey,
  audited: AuditedDataSnapshot,
  scenarios: AllScenarioBundles,
  snapshots: AllScenarioSnapshots
): Model {
  const model = new Model({
    name: "Salesforce, Inc. (NYSE: CRM) — Integrated Financial Model",
    theme: "corporate_navy",
  })

  const execSheet = model.addSheet("ExecutiveSummary", {
    tabColor: "#1B365D",
    layout: "grid",
  })
  const assumptionsSheet = model.addSheet("Assumptions", {
    tabColor: "#2C5282",
    layout: "grid",
  })
  const financialModelSheet = model.addSheet("FinancialModel", {
    tabColor: "#276749",
    layout: "grid",
  })
  const valuationSheet = model.addSheet("Valuation", {
    tabColor: "#975A16",
    layout: "grid",
  })
  const peerCompsSheet = model.addSheet("PeerComps", {
    tabColor: "#742A2A",
    layout: "grid",
  })
  const marketBetaSheet = model.addSheet("MarketAndBeta", {
    tabColor: "#44337A",
    layout: "grid",
  })
  const marketDataSheet = model.addSheet("MarketData", {
    tabColor: "#553C9A",
    layout: "grid",
  })

  buildExecutiveSummarySheet(execSheet, snapshots)

  const assumptionTables = buildAssumptionsSheet(
    assumptionsSheet,
    scenarios,
    activeScenario,
    audited
  )
  assumptionsSheet.setBands([
    {
      lanes: [
        { tables: [assumptionTables.scenarioControl] },
        { tables: [assumptionTables.scenarioGuide] },
      ],
    },
    assumptionTables.scalarDrivers,
    assumptionTables.periodDriversActive,
    assumptionTables.periodDriversDownside,
    assumptionTables.periodDriversBase,
    assumptionTables.periodDriversUpside,
    assumptionTables.debtTrancheRegistry,
  ])

  const stmtTables = buildStatementsTables(financialModelSheet, audited)
  const opTables = buildOperatingAnnualTables(financialModelSheet, audited)
  const diagTables = buildDiagnosticsTables(financialModelSheet)
  const anchorTables = buildLtmAndQ2AnchorTables(financialModelSheet, audited)
  const auditedAnchors = buildAuditedFootnoteAnchorsTable(
    financialModelSheet,
    audited
  )
  financialModelSheet.setBands([
    stmtTables.incomeStatement,
    stmtTables.balanceSheet,
    stmtTables.cashFlowStatement,
    opTables.revenueSchedule,
    opTables.ppeAndIntangibles,
    opTables.costAndSbc,
    opTables.workingCapital,
    opTables.shareCount,
    opTables.debtSchedule,
    diagTables.qoeAndCashConversion,
    diagTables.investedCapitalAndRoic,
    diagTables.capitalAllocation,
    {
      lanes: [
        { tables: [anchorTables.ltmFlowBridge] },
        { tables: [anchorTables.q2BalanceSheetAnchor, auditedAnchors] },
      ],
    },
  ])

  const valTables = buildValuationSheet(valuationSheet)
  valuationSheet.setBands([
    {
      lanes: [
        { tables: [valTables.waccSchedule] },
        { tables: [valTables.dcfSummary] },
      ],
    },
    valTables.dcfModel,
    {
      lanes: [
        { tables: [valTables.evToEquityBridge] },
        { tables: [valTables.scenarioVarianceBridge] },
      ],
    },
    {
      lanes: [
        {
          tables: [
            valTables.sensitivityWaccVsGrowth,
            valTables.waccSensitivityWorkings,
          ],
          tableGap: 1,
        },
      ],
    },
    {
      lanes: [
        {
          tables: [
            valTables.reverseDcfMatrix,
            valTables.expectationWaccWorkings,
          ],
          tableGap: 1,
        },
      ],
    },
    valTables.terminalReinvestSensitivity,
    {
      lanes: [
        {
          tables: [valTables.icStressScenarios, valTables.icStressWorkings],
          tableGap: 1,
        },
      ],
    },
  ])

  buildPeerCompsSheet(peerCompsSheet, audited)

  const marketBetaTables = buildMarketAndBetaSheet(marketBetaSheet, audited)
  marketBetaSheet.setBands([
    {
      lanes: [
        { tables: [marketBetaTables.macroRates] },
        { tables: [marketBetaTables.betaSummary] },
      ],
    },
  ])

  buildMarketDataSheet(marketDataSheet, audited)

  return model
}

export function buildSalesforceModel(options: BuildModelOptions = {}): Model {
  const activeScenario: ScenarioKey = options.scenario ?? "base"
  const audited =
    options.audited ?? loadAuditedData(options.auditedDir ?? "data/audited")
  const scenarios = options.scenarios ?? allScenarios()
  const snapshots =
    options.snapshots ?? computeScenarioSnapshots({ audited, scenarios })

  return buildModelInternal(activeScenario, audited, scenarios, snapshots)
}

export function computeScenarioSnapshots(
  options: Omit<BuildModelOptions, "scenario" | "snapshots"> = {}
): AllScenarioSnapshots {
  const audited =
    options.audited ?? loadAuditedData(options.auditedDir ?? "data/audited")
  const scenarios = options.scenarios ?? allScenarios()
  const runSnapshot = (key: ScenarioKey): ScenarioOutputSnapshot => {
    const pass1 = buildModelInternal(
      key,
      audited,
      scenarios,
      PLACEHOLDER_SNAPSHOTS
    ).compile()
    try {
      return extractScenarioSnapshot(pass1)
    } finally {
      pass1.dispose()
    }
  }
  return Object.freeze({
    downside: runSnapshot("downside"),
    base: runSnapshot("base"),
    upside: runSnapshot("upside"),
  })
}

export function compileSalesforceModel(
  scenario: ScenarioKey = "base",
  options: Omit<BuildModelOptions, "scenario"> = {}
): CompiledModel {
  const audited =
    options.audited ?? loadAuditedData(options.auditedDir ?? "data/audited")
  const scenarios = options.scenarios ?? allScenarios()
  const snapshots =
    options.snapshots ?? computeScenarioSnapshots({ audited, scenarios })

  return buildSalesforceModel({
    scenario,
    audited,
    scenarios,
    snapshots,
  }).compile()
}

export function compileAllScenarios(
  options: Omit<BuildModelOptions, "scenario" | "snapshots"> = {}
): Readonly<Record<ScenarioKey, CompiledModel>> {
  const audited =
    options.audited ?? loadAuditedData(options.auditedDir ?? "data/audited")
  const scenarios = options.scenarios ?? allScenarios()
  const snapshots = computeScenarioSnapshots({ audited, scenarios })
  return Object.freeze({
    downside: compileSalesforceModel("downside", {
      audited,
      scenarios,
      snapshots,
    }),
    base: compileSalesforceModel("base", { audited, scenarios, snapshots }),
    upside: compileSalesforceModel("upside", { audited, scenarios, snapshots }),
  })
}
