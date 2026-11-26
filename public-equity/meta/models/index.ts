import { Model, type CompiledModel } from "f8-engine"
import {
  loadAllScenarioDrivers,
  periodDriver,
  type AllScenarioDriverBundles,
  type MetaScenarioDrivers,
  type PeriodVector,
} from "./assumptions/index.ts"
import { loadAuditedModelData, type AuditedModelData } from "./kg-extractors.ts"
import { buildAssumptionsSheet } from "./sheets/assumptions-sheet.ts"
import { buildBetaWaccSheet } from "./sheets/beta-wacc-sheet.ts"
import { buildCompsSheet } from "./sheets/comps-sheet.ts"
import {
  buildCoverSummarySheet,
  type ScenarioOutputSnapshot,
  type ScenarioSnapshotMap,
} from "./sheets/cover-summary.ts"
import { buildDiagnosticsSheet } from "./sheets/diagnostics-sheet.ts"
import {
  buildDcfSheet,
  SENS_CAPEX_COLS,
  SENS_GROWTH_SHIFTS,
  type CapexTargetColId,
  type GrowthCapexEvGrid,
  type GrowthShiftRowId,
  type ScalarTornadoRow,
  type SpotIndifferenceRow,
} from "./sheets/dcf-sheet.ts"
import { buildOperatingSchedulesSheet } from "./sheets/operating-schedules.ts"
import { buildSensitivitiesSheet } from "./sheets/sensitivities-sheet.ts"
import { buildFinancialStatementsSheet } from "./sheets/statements-sheet.ts"
import {
  FORECAST_PERIODS,
  type ForecastPeriod,
  type ScenarioId,
} from "./timeline.ts"

export interface CompileMetaOptions {
  readonly scenario?: ScenarioId
  readonly bundles?: AllScenarioDriverBundles
  readonly includeCrossScenarioSnapshots?: boolean
  readonly includeGrowthCapexGrid?: boolean
  readonly includeTornadoAndIndifference?: boolean
  readonly precomputedSnapshots?: ScenarioSnapshotMap
  readonly precomputedGrowthCapexGrid?: GrowthCapexEvGrid
}

function buildRawMetaModelSpec(
  activeScenario: ScenarioId,
  bundles: AllScenarioDriverBundles,
  data: AuditedModelData,
  snapshots?: ScenarioSnapshotMap,
  growthCapexEvGrid?: GrowthCapexEvGrid,
  scalarTornado?: readonly ScalarTornadoRow[],
  spotIndifference?: readonly SpotIndifferenceRow[]
): Model {
  const model = new Model({
    name: "Meta Platforms, Inc. (META) Financial Model",
    theme: "corporate_navy",
    print: {
      paperSize: "letter",
      orientation: "landscape",
      fit: "fit_width",
      centerHorizontally: true,
      header: { left: "{model}", right: "{sheet}" },
      footer: {
        left: "Michael Hu, CFA | mhu@outlook.co.nz",
        center: "As of Nov 20, 2026",
        right: "Page {page} of {pages}",
      },
    },
  })

  if (snapshots !== undefined) {
    const coverSheet = model.addSheet("Executive Summary", {
      tabColor: "#1B365D",
      layout: "grid",
    })
    buildCoverSummarySheet(coverSheet, data, snapshots)
  }

  const assumptionsSheet = model.addSheet("Assumptions", {
    tabColor: "#2C5282",
    layout: "auto",
  })
  const statementsSheet = model.addSheet("Financial Statements", {
    tabColor: "#2B6CB0",
    layout: "grid",
    colWidth: 11,
  })
  const operatingSheet = model.addSheet("Operating Schedules", {
    tabColor: "#3182CE",
    layout: "grid",
    colWidth: 11,
  })
  const diagnosticsSheet = model.addSheet("Diagnostics & QoE", {
    tabColor: "#4A5568",
    layout: "grid",
    colWidth: 11,
  })
  const betaWaccSheet = model.addSheet("Beta & WACC", {
    tabColor: "#2F855A",
    layout: "grid",
    colWidth: 11,
  })
  const dcfSheet = model.addSheet("DCF Valuation", {
    tabColor: "#276749",
    layout: "grid",
  })
  const sensitivitiesSheet = model.addSheet("Sensitivities", {
    tabColor: "#22543D",
    layout: "grid",
  })
  const compsSheet = model.addSheet("Trading Comps", {
    tabColor: "#744210",
    layout: "grid",
    colWidth: 11,
  })
  const betaDataSheet = model.addSheet("Beta Data", {
    tabColor: "#718096",
    layout: "grid",
    print: "none",
  })
  const peerLtmDataSheet = model.addSheet("Peer LTM Data", {
    tabColor: "#718096",
    layout: "grid",
  })

  buildAssumptionsSheet(assumptionsSheet, activeScenario, bundles, data)
  buildFinancialStatementsSheet(statementsSheet, data)
  buildOperatingSchedulesSheet(operatingSheet, data)
  buildDiagnosticsSheet(diagnosticsSheet, data)
  buildBetaWaccSheet(betaWaccSheet, betaDataSheet, data)
  buildDcfSheet(dcfSheet, data)
  buildSensitivitiesSheet(
    sensitivitiesSheet,
    growthCapexEvGrid,
    scalarTornado,
    spotIndifference
  )
  buildCompsSheet(compsSheet, peerLtmDataSheet, data)

  return model
}

function extractScenarioSnapshot(
  scenario: ScenarioId,
  compiled: CompiledModel
): ScenarioOutputSnapshot {
  const breakevenYear: number | null =
    compiled.num("CashYieldVsRf", "clears_rf_flag", "2027E") === 1
      ? 2027
      : compiled.num("CashYieldVsRf", "clears_rf_flag", "2028E") === 1
        ? 2028
        : compiled.num("CashYieldVsRf", "clears_rf_flag", "2029E") === 1
          ? 2029
          : compiled.num("CashYieldVsRf", "clears_rf_flag", "2030E") === 1
            ? 2030
            : compiled.num("CashYieldVsRf", "clears_rf_flag", "2031E") === 1
              ? 2031
              : null

  return Object.freeze({
    scenario,
    rev26: compiled.num("IncomeStatement", "revenue", "2026E"),
    rev27: compiled.num("IncomeStatement", "revenue", "2027E"),
    rev31: compiled.num("IncomeStatement", "revenue", "2031E"),
    cleanEbit26: compiled.num("IncomeStatement", "normalized_ebit", "2026E"),
    cleanEbit27: compiled.num("IncomeStatement", "normalized_ebit", "2027E"),
    cleanEbit31: compiled.num("IncomeStatement", "normalized_ebit", "2031E"),
    cleanEbitMgn31: compiled.num(
      "IncomeStatement",
      "normalized_ebit_margin",
      "2031E"
    ),
    capex26: -compiled.num("CashReconAndFcf", "total_capex_outflow", "2026E"),
    capex27: -compiled.num("CashReconAndFcf", "total_capex_outflow", "2027E"),
    capex31: -compiled.num("CashReconAndFcf", "total_capex_outflow", "2031E"),
    fcff27: compiled.num("DcfFcff", "full_period_fcff", "2027E"),
    fcff31: compiled.num("DcfFcff", "full_period_fcff", "2031E"),
    cleanEps26: compiled.num("IncomeStatement", "normalized_eps", "2026E"),
    cleanEps27: compiled.num("IncomeStatement", "normalized_eps", "2027E"),
    cleanEps28: compiled.num("IncomeStatement", "normalized_eps", "2028E"),
    wacc: compiled.num("WaccBuild", "wacc", "val"),
    impliedEv: compiled.num("DcfBridge", "implied_ev", "val"),
    impliedSharePrice: compiled.num("DcfBridge", "implied_share_price", "val"),
    tvPctEv: compiled.num("DcfBridge", "tv_pct_ev", "val"),
    exitEvEbitda: compiled.num("DcfBridge", "implied_exit_ev_ebitda", "val"),
    evAtBaseParams: compiled.num(
      "DcfDilutionAndSpotAnchor",
      "ev_at_base_params",
      "val"
    ),
    pxAtBaseParams: compiled.num(
      "DcfDilutionAndSpotAnchor",
      "px_at_base_params",
      "val"
    ),
    breakevenYear,
  })
}

function computeAllScenarioSnapshots(
  bundles: AllScenarioDriverBundles,
  data: AuditedModelData
): ScenarioSnapshotMap {
  const passModel = buildRawMetaModelSpec("base", bundles, data)
  const ctrl = passModel.getTable("ScenarioControl")
  const runOne = (sid: ScenarioId, idx: 1 | 2 | 3): ScenarioOutputSnapshot => {
    ctrl.setCell("active", "val", idx)
    const passCompiled = passModel.compile()
    try {
      return extractScenarioSnapshot(sid, passCompiled)
    } finally {
      passCompiled.dispose()
    }
  }
  return Object.freeze({
    downside: runOne("downside", 1),
    base: runOne("base", 2),
    upside: runOne("upside", 3),
  })
}

/**
 * Applies additive FY27E-FY31E FoA growth shift and linear ramp to 2031E terminal CapEx % target.
 */
export function flexGrowthCapexBundle(
  bundles: AllScenarioDriverBundles,
  scenario: ScenarioId,
  growthShift: number,
  targetTerminalCapexPct: number
): AllScenarioDriverBundles {
  const src: MetaScenarioDrivers = bundles[scenario]
  const baseGr = src.vectors.foaRevenueGrowth.value
  const baseCx = src.vectors.capexPctRevenue.value
  const cxDelta = targetTerminalCapexPct - baseCx["2031E"]

  const ramp = (p: ForecastPeriod, w: number): number => baseCx[p] + w * cxDelta

  const newGrVec: PeriodVector = {
    "2027E": baseGr["2027E"] + growthShift,
    "2028E": baseGr["2028E"] + growthShift,
    "2029E": baseGr["2029E"] + growthShift,
    "2030E": baseGr["2030E"] + growthShift,
    "2031E": baseGr["2031E"] + growthShift,
  }
  const newCxVec: PeriodVector = {
    "2027E": ramp("2027E", 0.2),
    "2028E": ramp("2028E", 0.4),
    "2029E": ramp("2029E", 0.6),
    "2030E": ramp("2030E", 0.8),
    "2031E": ramp("2031E", 1.0),
  }

  const flexedScenario: MetaScenarioDrivers = Object.freeze({
    ...src,
    vectors: Object.freeze({
      ...src.vectors,
      foaRevenueGrowth: periodDriver(
        newGrVec,
        src.vectors.foaRevenueGrowth.meta
      ),
      capexPctRevenue: periodDriver(newCxVec, src.vectors.capexPctRevenue.meta),
    }),
  })

  return Object.freeze({
    ...bundles,
    [scenario]: flexedScenario,
  })
}

const defaultGridCache = new Map<ScenarioId, GrowthCapexEvGrid>()
let defaultSnapshotsCache: ScenarioSnapshotMap | null = null
let defaultTornadoCache: readonly ScalarTornadoRow[] | null = null
let defaultIndifferenceCache: readonly SpotIndifferenceRow[] | null = null

const VECTOR_TABLE_ID_BY_SCENARIO: Readonly<Record<ScenarioId, string>> =
  Object.freeze({
    downside: "VectorDriversDownside",
    base: "VectorDriversBase",
    upside: "VectorDriversUpside",
  })

function computeGrowthCapexEvGrid(
  activeScenario: ScenarioId,
  bundles: AllScenarioDriverBundles,
  data: AuditedModelData
): GrowthCapexEvGrid {
  const m = buildRawMetaModelSpec(activeScenario, bundles, data)
  const vecTbl = m.getTable(VECTOR_TABLE_ID_BY_SCENARIO[activeScenario])
  const src = bundles[activeScenario]
  const baseGr = src.vectors.foaRevenueGrowth.value
  const baseCx = src.vectors.capexPctRevenue.value
  const weights: readonly (readonly [ForecastPeriod, number])[] = [
    ["2027E", 0.2],
    ["2028E", 0.4],
    ["2029E", 0.6],
    ["2030E", 0.8],
    ["2031E", 1.0],
  ]

  const evalCell = (growthShift: number, termCapex: number): number => {
    const cxDelta = termCapex - baseCx["2031E"]
    for (const [p, w] of weights) {
      vecTbl.setCell("foaRevenueGrowth", p, baseGr[p] + growthShift)
      vecTbl.setCell("capexPctRevenue", p, baseCx[p] + w * cxDelta)
    }
    const c = m.compile()
    try {
      return c.num("DcfBridge", "implied_ev", "val")
    } finally {
      c.dispose()
    }
  }

  const evalRow = (shift: number): Readonly<Record<CapexTargetColId, number>> =>
    Object.freeze({
      cx1: evalCell(shift, SENS_CAPEX_COLS[0].termCapex),
      cx2: evalCell(shift, SENS_CAPEX_COLS[1].termCapex),
      cx3: evalCell(shift, SENS_CAPEX_COLS[2].termCapex),
      cx4: evalCell(shift, SENS_CAPEX_COLS[3].termCapex),
      cx5: evalCell(shift, SENS_CAPEX_COLS[4].termCapex),
    })

  const grid: Record<
    GrowthShiftRowId,
    Readonly<Record<CapexTargetColId, number>>
  > = {
    gr1: evalRow(SENS_GROWTH_SHIFTS[0].shift),
    gr2: evalRow(SENS_GROWTH_SHIFTS[1].shift),
    gr3: evalRow(SENS_GROWTH_SHIFTS[2].shift),
    gr4: evalRow(SENS_GROWTH_SHIFTS[3].shift),
    gr5: evalRow(SENS_GROWTH_SHIFTS[4].shift),
  }

  return Object.freeze(grid)
}

function computeScalarTornado(
  bundles: AllScenarioDriverBundles,
  data: AuditedModelData
): readonly ScalarTornadoRow[] {
  const m = buildRawMetaModelSpec("base", bundles, data)
  const scTbl = m.getTable("ScalarDrivers")
  const vecTbl = m.getTable("VectorDriversBase")
  const waccTbl = m.getTable("WaccBuild")
  const base = bundles.base
  const rf10 = data.val("macro_rates", "dgs10", "2026-11-19", { entity: "US" })
  const rf30 = data.val("macro_rates", "dgs30", "2026-11-19", { entity: "US" })

  const evalBase = (): { readonly ev: number; readonly px: number } => {
    const c = m.compile()
    try {
      return {
        ev: c.num("DcfBridge", "implied_ev", "val"),
        px: c.num("DcfBridge", "implied_share_price", "val"),
      }
    } finally {
      c.dispose()
    }
  }

  const baseline = evalBase()

  const runShock = (
    id: string,
    label: string,
    note: string,
    apply: () => void,
    restore: () => void
  ): ScalarTornadoRow => {
    apply()
    try {
      const res = evalBase()
      return Object.freeze({
        id,
        label,
        note,
        baseEv: baseline.ev,
        basePrice: baseline.px,
        shockedEv: res.ev,
        shockedPrice: res.px,
      })
    } finally {
      restore()
    }
  }

  const rows: ScalarTornadoRow[] = [
    runShock(
      "erp_500",
      "Equity risk premium (+50 bps)",
      "Kroll 5.00% institutional ERP vs. 4.50% Base",
      () => scTbl.setCell("equityRiskPremium", "base", 0.05),
      () =>
        scTbl.setCell(
          "equityRiskPremium",
          "base",
          base.valuation.equityRiskPremium.value
        )
    ),
    runShock(
      "rf_30y",
      "Risk-free rate (30Y UST 5.40%)",
      "Long-duration 30Y Treasury vs. 10Y (5.04%)",
      () => waccTbl.setCell("rf_dgs10", "val", rf30),
      () => waccTbl.setCell("rf_dgs10", "val", rf10)
    ),
    runShock(
      "etr_210",
      "Effective tax rate (21.0%)",
      "U.S. statutory rate / Pillar Two & CAMT convergence",
      () => scTbl.setCell("effectiveTaxRate", "base", 0.21),
      () =>
        scTbl.setCell(
          "effectiveTaxRate",
          "base",
          base.operating.effectiveTaxRate.value
        )
    ),
    runShock(
      "opex_plus250",
      "FoA cash OpEx (+250 bps, FY27–31E)",
      "Uncommenced lease rent ($355.7B) & AI talent pressure",
      () => {
        for (const p of FORECAST_PERIODS) {
          vecTbl.setCell(
            "foaCashOpexPctFoaRev",
            p,
            base.vectors.foaCashOpexPctFoaRev.value[p] + 0.025
          )
        }
      },
      () => {
        for (const p of FORECAST_PERIODS) {
          vecTbl.setCell(
            "foaCashOpexPctFoaRev",
            p,
            base.vectors.foaCashOpexPctFoaRev.value[p]
          )
        }
      }
    ),
    runShock(
      "da_plus200",
      "PP&E D&A rate (+200 bps, FY27–31E)",
      "Faster AI accelerator obsolescence vs. 5.5-yr life",
      () => {
        for (const p of FORECAST_PERIODS) {
          vecTbl.setCell(
            "daPctBegNetPpe",
            p,
            base.vectors.daPctBegNetPpe.value[p] + 0.02
          )
        }
      },
      () => {
        for (const p of FORECAST_PERIODS) {
          vecTbl.setCell(
            "daPctBegNetPpe",
            p,
            base.vectors.daPctBegNetPpe.value[p]
          )
        }
      }
    ),
    runShock(
      "ronic_15",
      "Terminal RONIC (15.0% vs. 20.0%)",
      "Raises terminal reinvestment (g / RONIC) to 23.3%",
      () => scTbl.setCell("terminalRonic", "base", 0.15),
      () =>
        scTbl.setCell(
          "terminalRonic",
          "base",
          base.valuation.terminalRonic.value
        )
    ),
    runShock(
      "ronic_25",
      "Terminal RONIC (25.0% vs. 20.0%)",
      "Lowers terminal reinvestment (g / RONIC) to 14.0%",
      () => scTbl.setCell("terminalRonic", "base", 0.25),
      () =>
        scTbl.setCell(
          "terminalRonic",
          "base",
          base.valuation.terminalRonic.value
        )
    ),
    runShock(
      "rl_flat15",
      "Reality Labs loss (flat −$15B/yr)",
      "No Reality Labs loss narrowing past FY27E target",
      () => {
        for (const p of FORECAST_PERIODS) {
          vecTbl.setCell("rlOperatingLoss", p, -15_000)
        }
      },
      () => {
        for (const p of FORECAST_PERIODS) {
          vecTbl.setCell(
            "rlOperatingLoss",
            p,
            base.vectors.rlOperatingLoss.value[p]
          )
        }
      }
    ),
    runShock(
      "china_tariff_10",
      "China / tariff shock (−10% FY27E)",
      "Loss of China reseller ad demand (11.2% FY24 rev.)",
      () => scTbl.setCell("revenueStressShockPct", "base", -0.1),
      () =>
        scTbl.setCell(
          "revenueStressShockPct",
          "base",
          base.operating.revenueStressShockPct.value
        )
    ),
  ]

  return Object.freeze(rows)
}

function computeSpotIndifference(
  bundles: AllScenarioDriverBundles,
  data: AuditedModelData
): readonly SpotIndifferenceRow[] {
  const m = buildRawMetaModelSpec("base", bundles, data)
  const scTbl = m.getTable("ScalarDrivers")
  const vecTbl = m.getTable("VectorDriversBase")
  const base = bundles.base
  const spotPx = data.val("market_spot_prices", "spot_price", "2026-11-20", {
    entity: "META",
  })

  const evalPx = (): number => {
    const c = m.compile()
    try {
      return c.num("DcfBridge", "implied_share_price", "val")
    } finally {
      c.dispose()
    }
  }

  const baseComp = m.compile()
  const baseWacc = baseComp.num("WaccBuild", "wacc", "val")
  baseComp.dispose()

  const bisect = (
    loInit: number,
    hiInit: number,
    setParam: (x: number) => void,
    restore: () => void
  ): number | null => {
    try {
      setParam(loInit)
      const fLo = evalPx() - spotPx
      setParam(hiInit)
      const fHi = evalPx() - spotPx
      if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) {
        return null
      }
      let lo = loInit
      let hi = hiInit
      let vLo = fLo
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2
        setParam(mid)
        const vMid = evalPx() - spotPx
        if (Math.abs(vMid) < 0.005) {
          return mid
        }
        if (vLo * vMid <= 0) {
          hi = mid
        } else {
          lo = mid
          vLo = vMid
        }
      }
      return (lo + hi) / 2
    } finally {
      restore()
    }
  }

  // 1. WACC breakeven (via ERP so Kd stays fixed)
  const erpBe = bisect(
    0.015,
    0.09,
    (erp) => scTbl.setCell("equityRiskPremium", "base", erp),
    () =>
      scTbl.setCell(
        "equityRiskPremium",
        "base",
        base.valuation.equityRiskPremium.value
      )
  )
  let waccBe: number | null = null
  if (erpBe !== null) {
    scTbl.setCell("equityRiskPremium", "base", erpBe)
    const c = m.compile()
    waccBe = c.num("WaccBuild", "wacc", "val")
    c.dispose()
    scTbl.setCell(
      "equityRiskPremium",
      "base",
      base.valuation.equityRiskPremium.value
    )
  }

  // 2. FoA Revenue Growth Shift (FY27E-FY31E additive shift)
  const avgBaseGr =
    FORECAST_PERIODS.reduce(
      (s, p) => s + base.vectors.foaRevenueGrowth.value[p],
      0
    ) / FORECAST_PERIODS.length
  const grShiftBe = bisect(
    -0.08,
    0.1,
    (shift) => {
      for (const p of FORECAST_PERIODS) {
        vecTbl.setCell(
          "foaRevenueGrowth",
          p,
          base.vectors.foaRevenueGrowth.value[p] + shift
        )
      }
    },
    () => {
      for (const p of FORECAST_PERIODS) {
        vecTbl.setCell(
          "foaRevenueGrowth",
          p,
          base.vectors.foaRevenueGrowth.value[p]
        )
      }
    }
  )

  // 3. FoA Cash OpEx % Shift (FY27E-FY31E additive shift)
  const baseOpex31 = base.vectors.foaCashOpexPctFoaRev.value["2031E"]
  const opexShiftBe = bisect(
    -0.12,
    0.12,
    (shift) => {
      for (const p of FORECAST_PERIODS) {
        vecTbl.setCell(
          "foaCashOpexPctFoaRev",
          p,
          base.vectors.foaCashOpexPctFoaRev.value[p] + shift
        )
      }
    },
    () => {
      for (const p of FORECAST_PERIODS) {
        vecTbl.setCell(
          "foaCashOpexPctFoaRev",
          p,
          base.vectors.foaCashOpexPctFoaRev.value[p]
        )
      }
    }
  )

  // 4. CapEx % Revenue Shift (FY27E-FY31E additive shift)
  const baseCapex31 = base.vectors.capexPctRevenue.value["2031E"]
  const capexShiftBe = bisect(
    -0.15,
    0.15,
    (shift) => {
      for (const p of FORECAST_PERIODS) {
        vecTbl.setCell(
          "capexPctRevenue",
          p,
          base.vectors.capexPctRevenue.value[p] + shift
        )
      }
    },
    () => {
      for (const p of FORECAST_PERIODS) {
        vecTbl.setCell(
          "capexPctRevenue",
          p,
          base.vectors.capexPctRevenue.value[p]
        )
      }
    }
  )

  // 5. Terminal Growth (g)
  const gBe = bisect(
    0.005,
    baseWacc - 0.005,
    (g) => scTbl.setCell("terminalGrowthRate", "base", g),
    () =>
      scTbl.setCell(
        "terminalGrowthRate",
        "base",
        base.valuation.terminalGrowthRate.value
      )
  )

  // 6. Terminal RONIC
  const ronicBe = bisect(
    0.06,
    0.95,
    (r) => scTbl.setCell("terminalRonic", "base", r),
    () =>
      scTbl.setCell("terminalRonic", "base", base.valuation.terminalRonic.value)
  )

  const rows: SpotIndifferenceRow[] = [
    Object.freeze({
      id: "indiff_wacc",
      label: "Weighted average cost of capital",
      note: "WACC clearing $560.84 spot",
      baseValue: baseWacc,
      breakevenValue: waccBe,
      deltaValue: waccBe === null ? null : waccBe - baseWacc,
    }),
    Object.freeze({
      id: "indiff_foa_growth",
      label: "FY27E–31E avg. FoA revenue growth",
      note: "Uniform FY27E–31E growth shift",
      baseValue: avgBaseGr,
      breakevenValue: grShiftBe === null ? null : avgBaseGr + grShiftBe,
      deltaValue: grShiftBe,
    }),
    Object.freeze({
      id: "indiff_foa_opex",
      label: "2031E FoA cash OpEx % of FoA rev.",
      note: "Uniform FY27E–31E OpEx shift",
      baseValue: baseOpex31,
      breakevenValue: opexShiftBe === null ? null : baseOpex31 + opexShiftBe,
      deltaValue: opexShiftBe,
    }),
    Object.freeze({
      id: "indiff_capex",
      label: "2031E CapEx % of revenue",
      note: "Uniform FY27E–31E CapEx shift",
      baseValue: baseCapex31,
      breakevenValue: capexShiftBe === null ? null : baseCapex31 + capexShiftBe,
      deltaValue: capexShiftBe,
    }),
    Object.freeze({
      id: "indiff_term_g",
      label: "Terminal perpetuity growth (g)",
      note: "Perpetuity g at 20% RONIC",
      baseValue: base.valuation.terminalGrowthRate.value,
      breakevenValue: gBe,
      deltaValue:
        gBe === null ? null : gBe - base.valuation.terminalGrowthRate.value,
    }),
    Object.freeze({
      id: "indiff_term_ronic",
      label: "Terminal RONIC",
      note: "Cannot clear spot alone (>95%)",
      baseValue: base.valuation.terminalRonic.value,
      breakevenValue: ronicBe,
      deltaValue:
        ronicBe === null ? null : ronicBe - base.valuation.terminalRonic.value,
    }),
  ]

  return Object.freeze(rows)
}

function resolveSnapshotsAndGrid(
  activeScenario: ScenarioId,
  customBundles: AllScenarioDriverBundles | undefined,
  data: AuditedModelData,
  opts?: {
    readonly includeSnapshots?: boolean
    readonly includeGrid?: boolean
    readonly includeTornadoAndIndifference?: boolean
    readonly precomputedSnapshots?: ScenarioSnapshotMap
    readonly precomputedGrid?: GrowthCapexEvGrid
  }
): {
  readonly bundles: AllScenarioDriverBundles
  readonly snapshots: ScenarioSnapshotMap | undefined
  readonly grid: GrowthCapexEvGrid | undefined
  readonly tornado: readonly ScalarTornadoRow[] | undefined
  readonly indifference: readonly SpotIndifferenceRow[] | undefined
} {
  const isDefaultBundles = customBundles === undefined
  const bundles = customBundles ?? loadAllScenarioDrivers()

  let snapshots = opts?.precomputedSnapshots
  if ((opts?.includeSnapshots ?? true) && snapshots === undefined) {
    if (isDefaultBundles && defaultSnapshotsCache !== null) {
      snapshots = defaultSnapshotsCache
    } else {
      snapshots = computeAllScenarioSnapshots(bundles, data)
      if (isDefaultBundles) {
        defaultSnapshotsCache = snapshots
      }
    }
  }

  let grid = opts?.precomputedGrid
  if ((opts?.includeGrid ?? true) && grid === undefined) {
    if (isDefaultBundles) {
      const cached = defaultGridCache.get(activeScenario)
      if (cached !== undefined) {
        grid = cached
      } else {
        grid = computeGrowthCapexEvGrid(activeScenario, bundles, data)
        defaultGridCache.set(activeScenario, grid)
      }
    } else {
      grid = computeGrowthCapexEvGrid(activeScenario, bundles, data)
    }
  }

  let tornado: readonly ScalarTornadoRow[] | undefined
  let indifference: readonly SpotIndifferenceRow[] | undefined
  if (opts?.includeTornadoAndIndifference ?? true) {
    if (isDefaultBundles && defaultTornadoCache !== null) {
      tornado = defaultTornadoCache
    } else {
      tornado = computeScalarTornado(bundles, data)
      if (isDefaultBundles) {
        defaultTornadoCache = tornado
      }
    }
    if (isDefaultBundles && defaultIndifferenceCache !== null) {
      indifference = defaultIndifferenceCache
    } else {
      indifference = computeSpotIndifference(bundles, data)
      if (isDefaultBundles) {
        defaultIndifferenceCache = indifference
      }
    }
  }

  return { bundles, snapshots, grid, tornado, indifference }
}

/**
 * Pure side-effect-free compilation entrypoint for Meta Platforms financial model.
 * Never writes to deliverables/ on import or invocation.
 */
export function compileMetaModel(
  scenarioOrOpts: ScenarioId | CompileMetaOptions = "base"
): CompiledModel {
  const opts: CompileMetaOptions =
    typeof scenarioOrOpts === "string"
      ? { scenario: scenarioOrOpts }
      : scenarioOrOpts

  const activeScenario: ScenarioId = opts.scenario ?? "base"
  const data = loadAuditedModelData()
  const resolved = resolveSnapshotsAndGrid(activeScenario, opts.bundles, data, {
    includeSnapshots: opts.includeCrossScenarioSnapshots ?? true,
    includeGrid: opts.includeGrowthCapexGrid ?? true,
    includeTornadoAndIndifference: opts.includeTornadoAndIndifference ?? true,
    precomputedSnapshots: opts.precomputedSnapshots,
    precomputedGrid: opts.precomputedGrowthCapexGrid,
  })

  const finalModel = buildRawMetaModelSpec(
    activeScenario,
    resolved.bundles,
    data,
    resolved.snapshots,
    resolved.grid,
    resolved.tornado,
    resolved.indifference
  )
  return finalModel.compile()
}

/**
 * Builds the complete mutable f8 Model specification (including populated cross-scenario
 * snapshots, exact 25-point Growth × CapEx sensitivity grid, 1-way tornado, and spot indifference table).
 */
export function buildMetaModel(
  scenario: ScenarioId = "base",
  bundles?: AllScenarioDriverBundles
): Model {
  const data = loadAuditedModelData()
  const resolved = resolveSnapshotsAndGrid(scenario, bundles, data, {
    includeSnapshots: true,
    includeGrid: true,
    includeTornadoAndIndifference: true,
  })
  return buildRawMetaModelSpec(
    scenario,
    resolved.bundles,
    data,
    resolved.snapshots,
    resolved.grid,
    resolved.tornado,
    resolved.indifference
  )
}

export type { ScenarioId } from "./timeline.ts"
export type {
  ScenarioOutputSnapshot,
  ScenarioSnapshotMap,
} from "./sheets/cover-summary.ts"
export type {
  GrowthCapexEvGrid,
  ScalarTornadoRow,
  SpotIndifferenceRow,
} from "./sheets/dcf-sheet.ts"
export {
  loadAllScenarioDrivers,
  getScenarioDrivers,
} from "./assumptions/index.ts"
export { loadAuditedModelData } from "./kg-extractors.ts"
