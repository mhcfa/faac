import { describe, expect, it } from "vitest"
import {
  buildMetaModel,
  compileMetaModel,
  loadAuditedModelData,
} from "../models/index.ts"
import {
  ALL_SCALAR_DRIVER_IDS,
  ALL_VECTOR_DRIVER_IDS,
} from "../models/sheets/assumptions-sheet.ts"
import {
  BS_ALL_PERIODS,
  FLOW_ALL_PERIODS,
  FORECAST_PERIODS,
  SCENARIO_IDS,
  type ScenarioId,
} from "../models/timeline.ts"

const EXPECTED_SHEET_NAMES: readonly string[] = [
  "Executive Summary",
  "Assumptions",
  "Financial Statements",
  "Operating Schedules",
  "Diagnostics & QoE",
  "Beta & WACC",
  "DCF Valuation",
  "Sensitivities",
  "Trading Comps",
  "Beta Data",
  "Peer LTM Data",
]

interface BaselineScenarioSnapshot {
  readonly wacc: number
  readonly impliedEv: number
  readonly impliedSharePrice: number
  readonly spotPfEv: number
  readonly grpAEvEbitdaPx: number
}

const PRE_REFACTOR_BASELINES: Readonly<
  Record<ScenarioId, BaselineScenarioSnapshot>
> = Object.freeze({
  downside: Object.freeze({
    wacc: 0.11261368202011093,
    impliedEv: 571554.117694319,
    impliedSharePrice: 235.3932603193699,
    spotPfEv: 1420414.8119536645,
    grpAEvEbitdaPx: 768.5560596379564,
  }),
  base: Object.freeze({
    wacc: 0.10659839647918976,
    impliedEv: 1215540.218812269,
    impliedSharePrice: 482.7104255731593,
    spotPfEv: 1420414.8119536645,
    grpAEvEbitdaPx: 770.2044257758339,
  }),
  upside: Object.freeze({
    wacc: 0.10243935494503381,
    impliedEv: 2019834.2376976404,
    impliedSharePrice: 780.818200281749,
    spotPfEv: 1420414.8119536645,
    grpAEvEbitdaPx: 771.8397645880061,
  }),
})

const PRE_REFACTOR_HIST_AVG_DE = 0.02984049979858771
const PRE_REFACTOR_SPOT_ELAPSED_Q4_BURN_BASE = -14206.026892048838

function expectParity(actual: number, expected: number, label: string): void {
  const absDiff = Math.abs(actual - expected)
  const relDiff = absDiff / Math.max(1, Math.abs(expected))
  expect(
    relDiff,
    `${label}: actual=${actual}, expected=${expected}, relDiff=${relDiff}`
  ).toBeLessThan(1e-9)
  expect(
    absDiff,
    `${label}: actual=${actual}, expected=${expected}, absDiff=${absDiff}`
  ).toBeLessThan(1e-6)
}

describe("Model compilation, zero-drift parity, layout/provenance/formula invariants & wiring", () => {
  const data = loadAuditedModelData()

  it("C1 & C2: compiles Downside, Base, and Upside cleanly across 11 sheets with empty compiled.errors() and exact zero valuation drift", () => {
    for (const scen of SCENARIO_IDS) {
      const compiled = compileMetaModel(scen)
      try {
        const summary = compiled.summary()
        expect(summary.totalSheets).toBe(11)
        expect(summary.sheets.map((s) => s.name)).toEqual(EXPECTED_SHEET_NAMES)
        expect(summary.totalFormulas).toBeGreaterThan(4_000)
        expect(compiled.errors()).toEqual([])

        const exp = PRE_REFACTOR_BASELINES[scen]
        expectParity(
          compiled.num("WaccBuild", "wacc", "val"),
          exp.wacc,
          `${scen} WACC`
        )
        expectParity(
          compiled.num("DcfBridge", "implied_ev", "val"),
          exp.impliedEv,
          `${scen} implied_ev`
        )
        expectParity(
          compiled.num("DcfBridge", "implied_share_price", "val"),
          exp.impliedSharePrice,
          `${scen} implied_share_price`
        )
        expectParity(
          compiled.num("DcfDilutionAndSpotAnchor", "spot_pf_ev", "val"),
          exp.spotPfEv,
          `${scen} spot_pf_ev`
        )
        expectParity(
          compiled.num(
            "CompsImpliedValuation",
            "grp_a_ev_ebitda",
            "implied_px"
          ),
          exp.grpAEvEbitdaPx,
          `${scen} grp_a_ev_ebitda implied_px`
        )
        expectParity(
          compiled.num("WaccBuild", "hist_avg_de_ratio", "val"),
          PRE_REFACTOR_HIST_AVG_DE,
          `${scen} hist_avg_de_ratio`
        )
        expectParity(
          compiled.num(
            "DcfDilutionAndSpotAnchor",
            "spot_elapsed_q4_burn_base",
            "val"
          ),
          PRE_REFACTOR_SPOT_ELAPSED_Q4_BURN_BASE,
          `${scen} spot_elapsed_q4_burn_base`
        )

        if (scen === "base") {
          const bytes = compiled.emitWorkbook({
            title: "Meta Platforms, Inc. (META) Financial Model",
          })
          expect(bytes.byteLength).toBeGreaterThan(50_000)
          // OpenXML ZIP magic bytes "PK"
          expect(bytes[0]).toBe(0x50)
          expect(bytes[1]).toBe(0x4b)
        }
      } finally {
        compiled.dispose()
      }
    }

    // Exported buildMetaModel("base").compile() populates snapshots & 25-point grid with zero errors
    const builtCompiled = buildMetaModel("base").compile()
    try {
      const summary = builtCompiled.summary()
      expect(summary.totalSheets).toBe(11)
      expect(summary.sheets.map((s) => s.name)).toEqual(EXPECTED_SHEET_NAMES)
      expect(builtCompiled.errors()).toEqual([])
    } finally {
      builtCompiled.dispose()
    }
  }, 60_000)

  it("C1: enforces exact 0.0 Balance Sheet, Cash Flow, and Dual-Sided Invested Capital identities across all scenarios", () => {
    for (const scen of SCENARIO_IDS) {
      const compiled = compileMetaModel(scen)
      try {
        for (const p of BS_ALL_PERIODS) {
          expect(
            Math.abs(compiled.num("BalanceSheet", "balance_check", p)),
            `BS imbalance at ${p} (${scen})`
          ).toBeLessThan(1e-6)

          expect(
            Math.abs(compiled.num("InvestedCapitalRoic", "ic_tie_check", p)),
            `IC mismatch at ${p} (${scen})`
          ).toBeLessThan(1e-6)
        }

        for (const p of FLOW_ALL_PERIODS) {
          expect(
            Math.abs(compiled.num("CashReconAndFcf", "cash_tie_check", p)),
            `CFS cash tie mismatch at ${p} (${scen})`
          ).toBeLessThan(1e-6)
        }

        // Cross-check audited Meta Non-GAAP FCF reconciliation
        expect(
          compiled.num("CashReconAndFcf", "reported_fcf", "9M26A")
        ).toBeCloseTo(
          data.val("meta_nongaap_fcf", "free_cash_flow", "2026-Q3-YTD", {
            entity: "META",
            basis: "non_gaap",
          }),
          6
        )
        expect(
          compiled.num("CashReconAndFcf", "reported_fcf", "9M25A")
        ).toBeCloseTo(
          data.val("meta_nongaap_fcf", "free_cash_flow", "2025-Q3-YTD", {
            entity: "META",
            basis: "non_gaap",
          }),
          6
        )
      } finally {
        compiled.dispose()
      }
    }
  })

  it("C2-C5: enforces 11-sheet grid/auto config, flat non-collapsible tables, aligned time-series & Band 4 gutters, zero auto overlap, descNotes === 0, semantic bold styles, and < 360-char formula ceiling", () => {
    const model = buildMetaModel("base")
    const spec = model.toSpec()
    const compiled = model.compile()
    try {
      const summary = compiled.summary()

      // C2: Workbook print defaults, per-sheet print/layout config, zero freezePanes & zero collapsible tables
      const EXPECTED_PRINT = {
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
      }
      expect(model.print).toEqual(EXPECTED_PRINT)

      const EXPECTED_GRID_WIDTH: Readonly<Record<string, number>> = {
        "Executive Summary": 12,
        "Financial Statements": 11,
        "Operating Schedules": 11,
        "Diagnostics & QoE": 11,
        "Beta & WACC": 11,
        "DCF Valuation": 12,
        Sensitivities: 12,
        "Trading Comps": 11,
        "Beta Data": 12,
        "Peer LTM Data": 12,
      }

      expect(spec.manifest.sheets.length).toBe(11)
      expect(spec.manifest.sheets.map((s) => s.name)).toEqual(
        EXPECTED_SHEET_NAMES
      )
      for (const sheetSpec of spec.manifest.sheets) {
        expect(
          sheetSpec.freezePanes,
          `Unexpected freezePanes on sheet "${sheetSpec.name}"`
        ).toBeUndefined()
        if (sheetSpec.name === "Beta Data") {
          expect(
            sheetSpec.print,
            'Sheet "Beta Data" must opt out via print: "none"'
          ).toBeUndefined()
        } else {
          expect(
            sheetSpec.print,
            `Printable sheet "${sheetSpec.name}" must resolve workbook print defaults`
          ).toEqual(EXPECTED_PRINT)
        }
        if (sheetSpec.name === "Assumptions") {
          expect(
            sheetSpec.layout === undefined || sheetSpec.layout.kind === "auto",
            `Sheet "Assumptions" must use layout "auto"`
          ).toBe(true)
        } else {
          expect(
            sheetSpec.layout?.kind,
            `Sheet "${sheetSpec.name}" must use layout "grid"`
          ).toBe("grid")
        }
      }
      for (const tableSpec of Object.values(spec.tables)) {
        expect(
          tableSpec.collapsible,
          `Table "${tableSpec.id}" must be flat (collapsible: false)`
        ).toBe(false)
      }

      // C3: Print diagnostics in toMarkdown("layout") — all 10 printable tabs >= 60% scale, zero ! overflows, zero W re-expansion, zero subtitle overflow
      const layoutMd = compiled.toMarkdown("layout")
      const sheetSections = layoutMd.split(/^## Sheet: /m).slice(1)
      expect(sheetSections.length).toBe(11)
      expect(layoutMd).not.toContain("[low scale <60%]")
      expect(layoutMd).not.toMatch(/ch>w\)/)
      expect(layoutMd).not.toMatch(/Layout: grid \(W=\d+(?:\.\d+)?, base=/)
      for (const section of sheetSections) {
        const firstLine = section.split("\n")[0]?.trim() ?? ""
        const printLine = section
          .split("\n")
          .find((l) => l.startsWith("Print: "))
        if (firstLine === "Beta Data") {
          expect(
            printLine,
            'Sheet "Beta Data" must not emit a Print: line'
          ).toBeUndefined()
        } else {
          expect(
            printLine,
            `Missing Print: line on sheet "${firstLine}"`
          ).toBeDefined()
          expect(printLine).toContain(
            "letter landscape | Fit: fit_width (1 x auto)"
          )
          const scaleMatch = printLine?.match(/Est\. scale: ~(\d+)%/)
          expect(
            Number(scaleMatch?.[1] ?? 0),
            `Sheet "${firstLine}" scale below 60%: ${printLine}`
          ).toBeGreaterThanOrEqual(60)
          expect(
            printLine,
            `Page overflow flag (!) on sheet "${firstLine}": ${printLine}`
          ).not.toMatch(/pg!/)
        }
      }

      const ALLOWED_COLUMN_GUTTER_TABLES = new Set<string>([
        "ScalarDrivers",
        "IncomeStatement",
        "BalanceSheet",
        "CashFlowStatement",
        "CashReconAndFcf",
        "SegmentBuild",
        "PpeSchedule",
        "WorkingCapitalSchedule",
        "DebtHybridShareSchedule",
        "GeoAndKpis",
        "QoeNormalizationBridge",
        "InvestedCapitalRoic",
        "CashDeploymentSbc",
        "OffBalanceSheetContingencies",
        "CashYieldVsRf",
      ])

      // Helper: map colId -> physical column index for each table on a sheet
      const physicalColsByTable = (
        sheetName: string
      ): ReadonlyMap<string, ReadonlyMap<string, number>> => {
        const si = compiled.inspectSheet(sheetName)
        const out = new Map<string, Map<string, number>>()
        for (const row of si.rows) {
          for (const cell of row.cells) {
            if (
              cell.kind !== "data" ||
              cell.tableId === null ||
              cell.colId === null
            ) {
              continue
            }
            let tblMap = out.get(cell.tableId)
            if (tblMap === undefined) {
              tblMap = new Map<string, number>()
              out.set(cell.tableId, tblMap)
            }
            tblMap.set(cell.colId, cell.physicalCol)
          }
        }
        return out
      }

      const headerDepthOf = (tableId: string): number => {
        const insp = compiled.inspectTable(tableId)
        return Math.max(
          0,
          ...insp.columns.map((c) =>
            c.isGutter
              ? 0
              : c.group !== null
                ? Math.max(c.headers.length, 1) + 1
                : c.headers.length
          )
        )
      }

      // C3a: Master time-series alignment (4-col leading descriptor B..E), uniform 2-tier headers & 2-char regime gutters (K=10, P=15)
      const expectedMasterPeriodCol: Readonly<Record<string, number>> = {
        "2021A": 5,
        "2022A": 6,
        "2023A": 7,
        "2024A": 8,
        "2025A": 9,
        "9M25A": 11,
        "9M26A": 12,
        "Q3 26A": 12,
        "LTM Q3 26": 13,
        "Q4 26E": 14,
        "2026E": 16,
        "2027E": 17,
        "2028E": 18,
        "2029E": 19,
        "2030E": 20,
        "2031E": 21,
      }
      const masterAlignedSheets: readonly (readonly [
        string,
        readonly string[],
      ])[] = [
        [
          "Financial Statements",
          [
            "IncomeStatement",
            "BalanceSheet",
            "CashFlowStatement",
            "CashReconAndFcf",
          ],
        ],
        [
          "Operating Schedules",
          [
            "SegmentBuild",
            "PpeSchedule",
            "WorkingCapitalSchedule",
            "DebtHybridShareSchedule",
            "GeoAndKpis",
          ],
        ],
        [
          "Diagnostics & QoE",
          [
            "QoeNormalizationBridge",
            "InvestedCapitalRoic",
            "CashDeploymentSbc",
          ],
        ],
      ]
      for (const [sheetName, tableIds] of masterAlignedSheets) {
        const si = compiled.inspectSheet(sheetName)
        expect(
          si.colWidths[10],
          `${sheetName} Col K (Historical | Interim regime gutter) must be 2 chars wide`
        ).toBe(2)
        expect(
          si.colWidths[15],
          `${sheetName} Col P (Interim/Stub | Forecast regime gutter) must be 2 chars wide`
        ).toBe(2)
        for (const colIdx of [
          5, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21,
        ]) {
          expect(
            si.colWidths[colIdx],
            `${sheetName} measure col ${colIdx} should stay compact at width 11`
          ).toBe(11)
        }
        const byTbl = physicalColsByTable(sheetName)
        for (const tid of tableIds) {
          expect(
            headerDepthOf(tid),
            `${tid} should have uniform 2-tier header depth`
          ).toBe(2)
          const colMap = byTbl.get(tid)
          expect(colMap, `Missing physical columns for ${tid}`).toBeDefined()
          for (const [colId, physCol] of colMap ?? []) {
            if (colId === "label") {
              expect(physCol).toBe(1)
            } else {
              expect(
                physCol,
                `${sheetName}.${tid}[${colId}] misaligned (got col ${physCol})`
              ).toBe(expectedMasterPeriodCol[colId])
            }
          }
        }
      }

      // Diagnostics & QoE Band 4: laneGap aligns on Col K (10, width 2), OffBalanceSheetContingencies gutter aligns on Col P (15, width 2), flush right edge at Col V (21)
      const diagInsp = compiled.inspectSheet("Diagnostics & QoE")
      const diagByTbl = physicalColsByTable("Diagnostics & QoE")
      expect(diagByTbl.get("ProFormaCapitalSummary")?.get("label")).toBe(1)
      expect(diagByTbl.get("ProFormaCapitalSummary")?.get("val")).toBe(5)
      expect(diagByTbl.get("ProFormaCapitalSummary")?.get("pct_ref")).toBe(6)
      expect(diagByTbl.get("ProFormaCapitalSummary")?.get("notes")).toBe(7)
      expect(diagByTbl.get("OffBalanceSheetContingencies")?.get("label")).toBe(
        11
      )
      expect(diagByTbl.get("OffBalanceSheetContingencies")?.get("amount")).toBe(
        16
      )
      expect(
        diagByTbl.get("OffBalanceSheetContingencies")?.get("pct_mkt_cap")
      ).toBe(17)
      expect(diagByTbl.get("OffBalanceSheetContingencies")?.get("notes")).toBe(
        18
      )
      let obsMaxCol = 0
      for (const row of diagInsp.rows) {
        for (const cell of row.cells) {
          if (
            cell.tableId === "OffBalanceSheetContingencies" &&
            (cell.kind === "data" || cell.kind === "overflow")
          ) {
            obsMaxCol = Math.max(obsMaxCol, cell.physicalCol)
          }
        }
      }
      expect(obsMaxCol).toBe(21)

      // GeoAndKpis stops cleanly after LTM Q3 26 with zero trailing alignment gutters
      const geoCols = compiled.inspectTable("GeoAndKpis").columns
      expect(geoCols.length).toBe(10)
      expect(geoCols[geoCols.length - 1]?.id).toBe("LTM Q3 26")

      // DCF Valuation right-rail alignment: DcfFcff contiguous Q4 26E..2031E (cols 13..18), CashYieldVsRf aligned 2027E..2031E (cols 14..18)
      const dcfSheetInsp = compiled.inspectSheet("DCF Valuation")
      const dcfByTbl = physicalColsByTable("DCF Valuation")
      expect(headerDepthOf("DcfFcff")).toBe(2)
      expect(headerDepthOf("CashYieldVsRf")).toBe(2)
      expect(
        compiled.inspectTable("DcfFcff").columns.some((c) => c.isGutter)
      ).toBe(false)
      expect(
        compiled.inspectTable("CashYieldVsRf").columns.filter((c) => c.isGutter)
          .length
      ).toBe(1)
      expect(dcfSheetInsp.colWidths[9]).toBe(2)
      for (const p of FORECAST_PERIODS) {
        expect(dcfByTbl.get("CashYieldVsRf")?.get(p)).toBe(
          dcfByTbl.get("DcfFcff")?.get(p)
        )
      }
      for (const colIdx of [13, 14, 15, 16, 17, 18]) {
        expect(
          dcfSheetInsp.colWidths[colIdx],
          `DCF Valuation measure col ${colIdx} should stay compact at width 12`
        ).toBe(12)
      }

      // C2/C3b/C4/C5: Uniform declared W (11/12) & zero wrap/newlines on grid sheets, zero descriptor/measure overlap on auto (Assumptions),
      // zero descNotes across every table, zero leading row gutters, and < 360-char formula ceiling
      let maxFormulaLen = 0
      let maxFormulaCoord = ""
      let descNotesCount = 0
      let measNotesCount = 0
      for (const s of summary.sheets) {
        const sheetSpec = spec.manifest.sheets.find((x) => x.name === s.name)
        const isGrid = sheetSpec?.layout?.kind === "grid"
        const sheetInsp = compiled.inspectSheet(s.name)

        const descriptorCols = new Set<number>()
        const measureCols = new Set<number>()
        for (const row of sheetInsp.rows) {
          for (const cell of row.cells) {
            if (cell.kind === "data" || cell.kind === "overflow") {
              if (cell.isDescriptor) {
                descriptorCols.add(cell.physicalCol)
              } else if (cell.kind === "data") {
                measureCols.add(cell.physicalCol)
              }
              if (isGrid && cell.kind === "data") {
                const expectedW = EXPECTED_GRID_WIDTH[s.name]
                expect(
                  sheetInsp.colWidths[cell.physicalCol],
                  `Grid sheet "${s.name}" data col ${cell.physicalCol} (${cell.tableId}[${cell.colId}]) must have uniform width ${expectedW}`
                ).toBe(expectedW)
              }
            }
          }
        }
        if (s.name === "Assumptions") {
          for (const col of descriptorCols) {
            expect(
              measureCols.has(col),
              `Auto sheet "Assumptions" physical col ${col} collides descriptor (incl. overflow) and measure cells`
            ).toBe(false)
          }
        }

        for (const t of s.tables) {
          const insp = compiled.inspectTable(t.id)
          if (!ALLOWED_COLUMN_GUTTER_TABLES.has(t.id)) {
            for (const col of insp.columns) {
              expect(
                col.isGutter,
                `Unexpected column gutter in unrelated-axis table ${t.id}`
              ).toBe(false)
            }
          }
          expect(
            insp.rows[0]?.isGutter ?? false,
            `Unexpected leading row gutter before first section/row in table ${t.id}`
          ).toBe(false)

          if (isGrid) {
            for (const sub of insp.subtitles) {
              expect(
                /[\r\n]/.test(sub),
                `Newline in grid subtitle ${t.id}`
              ).toBe(false)
            }
            for (const col of insp.columns) {
              if (col.group !== null) {
                expect(
                  /[\r\n]/.test(col.group),
                  `Newline in grid group ${t.id}[${col.id}]`
                ).toBe(false)
              }
              for (const h of col.headers) {
                expect(
                  /[\r\n]/.test(h),
                  `Newline in grid header ${t.id}[${col.id}]`
                ).toBe(false)
              }
            }
            for (const row of insp.rows) {
              if (row.sectionTitle !== null) {
                expect(
                  /[\r\n]/.test(row.sectionTitle),
                  `Newline in grid section ${t.id}`
                ).toBe(false)
              }
            }
          }

          const descColIds = new Set(
            insp.columns.flatMap((c) =>
              c.isDescriptor && c.id !== null ? [c.id] : []
            )
          )
          const tbl = compiled.table(t.id)
          for (const r of tbl.rows) {
            for (const c of tbl.columns) {
              const ci = compiled.inspectCell(t.id, r, c)
              if (ci.excelFormula !== null) {
                if (ci.excelFormula.length > maxFormulaLen) {
                  maxFormulaLen = ci.excelFormula.length
                  maxFormulaCoord = `${t.id}[${r},${c}]`
                }
                expect(
                  ci.excelFormula.length,
                  `Lowered Excel formula exceeds 360 chars at ${t.id}[${r},${c}] (${ci.excelFormula.length} chars): ${ci.excelFormula}`
                ).toBeLessThan(360)
              }
              if (ci.note !== null) {
                if (descColIds.has(c)) {
                  descNotesCount++
                } else {
                  measNotesCount++
                }
              }
              if (isGrid) {
                const v = tbl.value(r, c)
                if (typeof v === "string") {
                  expect(
                    /[\r\n]/.test(v),
                    `Newline in grid cell value ${t.id}[${r},${c}]`
                  ).toBe(false)
                }
              }
            }
          }
        }
      }
      expect(
        descNotesCount,
        "Descriptor columns must have zero hover notes (use visible trailing descriptor columns instead)"
      ).toBe(0)
      expect(measNotesCount).toBeGreaterThan(20)
      expect(
        compiled.inspectCell("TradingComps", "AMZN", "ev_ebitda_capex").note
      ).not.toBeNull()
      expect(
        compiled.inspectCell("BetaSummary", "RDDT", "beta_5y_raw").note
      ).not.toBeNull()
      expect(
        compiled.inspectCell(
          "IncomeStatement",
          "qoe_ag_legal_addback",
          "Q4 26E"
        ).note
      ).not.toBeNull()
      expect(
        maxFormulaLen,
        `Max formula length ${maxFormulaLen} at ${maxFormulaCoord}`
      ).toBeLessThan(360)

      // C4a: Semantic bold style on non-summary columns (LTM Q3 26, active, Peer LTM Data key cols)
      const boldCols: readonly (readonly [string, string])[] = [
        ["IncomeStatement", "LTM Q3 26"],
        ["CashFlowStatement", "LTM Q3 26"],
        ["CashReconAndFcf", "LTM Q3 26"],
        ["SegmentBuild", "LTM Q3 26"],
        ["GeoAndKpis", "LTM Q3 26"],
        ["QoeNormalizationBridge", "LTM Q3 26"],
        ["CashDeploymentSbc", "LTM Q3 26"],
        ["ScalarDrivers", "active"],
        ["ScenarioComparison", "active"],
        ["ScenarioVarianceAttribution", "active"],
        ["ReturnAttribution", "active"],
        ["PeerEvBridge", "ev"],
        ["PeerLtmPnl", "ltm_rev"],
        ["PeerLtmPnl", "ltm_ebit"],
        ["PeerLtmPnl", "ltm_ebitda"],
      ]
      for (const [tblId, colId] of boldCols) {
        const col = compiled
          .inspectTable(tblId)
          .columns.find((c) => c.id === colId)
        expect(
          col?.style,
          `Expected style "bold" on column ${tblId}[*, ${colId}]`
        ).toBe("bold")
      }

      // C4a: Semantic bold style on non-summary emphasis rows
      const boldRows: readonly (readonly [string, string])[] = [
        ["ScenarioControl", "active_name"],
        ["ValuationSummary", "dcf_base"],
        ["ValuationSummary", "spot_market"],
        ["IncomeStatement", "normalized_eps"],
        ["InvestedCapitalRoic", "roic_incl_goodwill"],
        ["CashYieldVsRf", "fcff_yield_spot_ev"],
        ["DcfBridge", "upside_downside_vs_spot"],
        ["SensGrowthCapexPx", "center_recon_check"],
        ["BetaSummary", "META"],
        ["BetaSummary", "group_a_median"],
        ["BetaSummary", "group_b_median"],
        ["TradingComps", "group_a_median"],
        ["TradingComps", "group_b_median"],
        ["TradingComps", "META"],
      ]
      for (const [tblId, rowId] of boldRows) {
        const row = compiled
          .inspectTable(tblId)
          .rows.find((r) => r.id === rowId)
        expect(
          row?.style,
          `Expected style "bold" on row ${tblId}[${rowId}, *]`
        ).toBe("bold")
      }

      // C5: Decomposed helper cells are live formulas and aggregate cleanly
      expect(
        compiled.inspectCell("WaccBuild", "hist_avg_de_ratio", "val")
          .excelFormula
      ).toMatch(/^=AVERAGE\(/)
      expect(
        compiled.inspectCell(
          "DcfDilutionAndSpotAnchor",
          "spot_elapsed_q4_burn_base",
          "val"
        ).excelFormula
      ).toMatch(/^=SUM\(/)
      const helperCoords: readonly (readonly [string, string, string])[] = [
        ["WaccBuild", "hist_de_2022a", "val"],
        ["WaccBuild", "hist_de_q326a", "val"],
        ["WaccBuild", "beta_base_relevered", "val"],
        ["WaccBuild", "ke_base_ref", "val"],
        ["DcfDilutionAndSpotAnchor", "bridge_r2_r4_adj", "val"],
        ["DcfDilutionAndSpotAnchor", "bridge_r3_adj", "val"],
        ["DcfDilutionAndSpotAnchor", "shares_r2_total", "val"],
        ["DcfDilutionAndSpotAnchor", "shares_r3_total", "val"],
        ["DcfDilutionAndSpotAnchor", "shares_r4_total", "val"],
        ["DcfDilutionAndSpotAnchor", "spot_q4_base_ebit", "val"],
        ["DcfDilutionAndSpotAnchor", "spot_q4_base_nopat", "val"],
        ["DcfDilutionAndSpotAnchor", "spot_q4_base_da", "val"],
        ["DcfDilutionAndSpotAnchor", "spot_q4_base_capex", "val"],
        ["DcfDilutionAndSpotAnchor", "spot_q4_base_chg_nwc", "val"],
        ["DcfDilutionAndSpotAnchor", "terminal_fcff_at_base", "val"],
      ]
      for (const [tbl, row, col] of helperCoords) {
        expect(
          compiled.inspectCell(tbl, row, col).isFormula,
          `Expected live decomposed helper formula at ${tbl}[${row}, ${col}]`
        ).toBe(true)
      }
    } finally {
      compiled.dispose()
    }
  })

  it("verifies 1:1 KgRegistry tie-out, live formula evaluation, and zero unwired drivers", () => {
    const compiled = compileMetaModel("base")
    try {
      // 1:1 historical & benchmark spot checks
      expect(compiled.num("IncomeStatement", "revenue", "2025A")).toBeCloseTo(
        data.val("income_statement", "revenue", "2025-FY", { entity: "META" }),
        6
      )
      expect(
        compiled.num("IncomeStatement", "operating_income", "9M26A")
      ).toBeCloseTo(
        data.val("income_statement", "operating_income", "2026-Q3-YTD", {
          entity: "META",
        }),
        6
      )
      expect(
        compiled.num("BalanceSheet", "total_assets", "Q3 26A")
      ).toBeCloseTo(
        data.val("balance_sheet", "total_assets", "2026-Q3", {
          entity: "META",
        }),
        6
      )
      expect(compiled.num("WaccBuild", "rf_dgs10", "val")).toBeCloseTo(
        data.val("macro_rates", "dgs10", "2026-11-19", { entity: "US" }),
        6
      )
      expect(compiled.num("WaccBuild", "spot_price", "val")).toBeCloseTo(
        data.val("market_spot_prices", "spot_price", "2026-11-20", {
          entity: "META",
        }),
        6
      )
      expect(
        compiled.num("PostQ3FinancingRegistry", "nov_usd_notes_total", "val")
      ).toBeCloseTo(
        data.val(
          "meta_post_q3_financings",
          "total_usd_notes_nov26",
          "2026-11-05",
          {
            entity: "META",
          }
        ),
        6
      )

      // Live formula checks on all bridged & calculated metrics
      const formulaCoords: readonly (readonly [string, string, string])[] = [
        ["IncomeStatement", "revenue", "LTM Q3 26"],
        ["IncomeStatement", "revenue", "2026E"],
        ["IncomeStatement", "normalized_ebit", "LTM Q3 26"],
        ["IncomeStatement", "normalized_ebitda", "2026E"],
        ["CashReconAndFcf", "reported_fcf", "LTM Q3 26"],
        ["CashReconAndFcf", "economic_fcf_after_sbc", "2027E"],
        ["DcfFcff", "full_period_fcff", "2027E"],
        ["DcfFcff", "pv_fcff", "2031E"],
        ["BetaSummary", "META", "beta_5y_raw"],
        ["BetaSummary", "META", "beta_2y_raw"],
        ["WaccBuild", "wacc", "val"],
        ["DcfBridge", "implied_ev", "val"],
        ["DcfBridge", "implied_share_price", "val"],
        ["PeerLtmPnl", "MSFT", "ltm_rev"],
        ["PeerEvBridge", "GOOGL", "ev"],
        ["TradingComps", "GOOGL", "ev_ebitda"],
        ["TradingComps", "group_a_median", "ev_ebitda"],
        ["CompsImpliedValuation", "grp_a_ev_ebitda", "implied_px"],
      ]
      for (const [tbl, row, col] of formulaCoords) {
        expect(
          compiled.inspectCell(tbl, row, col).isFormula,
          `Expected live formula at ${tbl}[${row}, ${col}]`
        ).toBe(true)
      }

      // Active driver liveness: every active vector & scalar driver must have >= 1 dependent
      for (const rowId of ALL_VECTOR_DRIVER_IDS) {
        for (const p of FORECAST_PERIODS) {
          expect(
            compiled.dependentsOf("VectorDriversActive", rowId, p).directCount,
            `Unwired vector driver VectorDriversActive[${rowId}, ${p}]`
          ).toBeGreaterThan(0)
        }
      }
      for (const rowId of ALL_SCALAR_DRIVER_IDS) {
        expect(
          compiled.dependentsOf("ScalarDrivers", rowId, "active").directCount,
          `Unwired scalar driver ScalarDrivers[${rowId}, active]`
        ).toBeGreaterThan(0)
      }
    } finally {
      compiled.dispose()
    }
  })
})
