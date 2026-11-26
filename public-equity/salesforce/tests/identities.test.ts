import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { CompiledModel } from "f8-engine"
import {
  PERIOD_DRIVER_KEYS,
  SCALAR_DRIVER_KEYS,
} from "../models/assumptions/index.ts"
import {
  ANNUAL_PERIODS,
  buildSalesforceModel,
  compileAllScenarios,
  computeScenarioSnapshots,
  FORECAST_PERIODS,
  HIST_ANNUAL_PERIODS,
  loadAuditedData,
  SCENARIO_INDEX,
  SCENARIO_KEYS,
  type ScenarioKey,
} from "../models/index.ts"

const ALLOWED_NA_ROWS = new Set(["InvestedCapitalAndRoic:ex_gw_roic"])
const ANNUAL_TABLE_IDS = [
  "IncomeStatement",
  "BalanceSheet",
  "CashFlowStatement",
  "RevenueSchedule",
  "PpeAndIntangiblesSchedule",
  "CostAndSbcSchedule",
  "WorkingCapitalSchedule",
  "ShareCountSchedule",
  "DebtSchedule",
  "QoeAndCashConversion",
  "InvestedCapitalAndRoic",
  "CapitalAllocationSummary",
] as const

const FORBIDDEN_INTERNAL_RE =
  /(\b(GAP-\d+|KgRegistry|DATA_GAPS|PROJECT\.md|RUN_LOG|FEEDBACK\.md|doc_[a-z0-9_]+|crm_[a-z0-9_]+|peer_[a-z0-9_]+|macro_rates|market_prices|consensus_[a-z0-9_]+|f1|f2|f8|f12|CompiledModel|0D null|CHOOSE|pure DAG|helper|pre-compiled|compiled|closed[- ]form|guarded|circularity|zero[- ]plugs?|2D reverse[- ]DCF|scalar drivers?|period drivers?|verbatim|Posture:|Neutral|monotonic|decision-framing|critical debates|PeerComps|PeerFinancials|ExecutiveSummary|FinancialModel|OperatingSchedules|HistoricalAnchors|IncomeStatement|BalanceSheet|CashFlow|MarketAndBeta|MarketData|beta_U|beta_L|D\/E_hist|D\/E_curr|r_term|Ke_U)\b|data\/audited|#N\/A)/i

describe("Accounting identities, liveness, formula clarity, layout & client hygiene (C1-C6)", () => {
  let compiled: Readonly<Record<ScenarioKey, CompiledModel>>

  beforeAll(() => {
    compiled = compileAllScenarios()
  })

  afterAll(() => {
    for (const key of SCENARIO_KEYS) {
      compiled[key].dispose()
    }
  })

  it("C1: compiles all 3 scenarios with 12 sheets, 47 tables, and zero unexpected Excel errors", () => {
    for (const key of SCENARIO_KEYS) {
      const model = compiled[key]
      const summary = model.summary()
      expect(summary.totalSheets).toBe(12)
      expect(summary.totalTables).toBe(47)
      expect(summary.totalFormulas).toBeGreaterThan(3000)

      const unexpectedErrors: string[] = []
      for (const sheet of summary.sheets) {
        for (const tblMeta of sheet.tables) {
          const tbl = model.table(tblMeta.id)
          for (const row of tbl.rows) {
            for (const col of tbl.measureColumns) {
              const val = tbl.value(row, col)
              if (typeof val === "string" && val.startsWith("#")) {
                if (
                  !(
                    val === "#N/A" &&
                    ALLOWED_NA_ROWS.has(`${tblMeta.id}:${row}`)
                  )
                ) {
                  unexpectedErrors.push(
                    `${key}:${tblMeta.id}[${row},${col}]=${val}`
                  )
                }
              }
            }
          }
        }
      }
      expect(unexpectedErrors).toEqual([])
    }
  })

  it("C1: satisfies Balance Sheet, Cash, Retained Earnings, Asset/Debt roll-forwards & Two-Sided IC tie-outs (< 1e-6) across all periods and scenarios", () => {
    const audited = loadAuditedData()

    for (const key of SCENARIO_KEYS) {
      const m = compiled[key]

      // Historical 1:1 parity against KgRegistry
      for (const p of HIST_ANNUAL_PERIODS) {
        expect(m.num("IncomeStatement", "total_revenue", p)).toBeCloseTo(
          audited.crmIs.totalRevenue[p],
          6
        )
        expect(m.num("BalanceSheet", "total_assets", p)).toBeCloseTo(
          audited.crmBs.totalAssets[p],
          6
        )
        expect(m.num("CashFlowStatement", "ending_cash", p)).toBeCloseTo(
          audited.crmCf.endingCash[p],
          6
        )
      }

      // Annual identities across FY24A-FY31E
      for (const p of ANNUAL_PERIODS) {
        expect(
          Math.abs(m.num("BalanceSheet", "balance_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(m.num("CashFlowStatement", "cash_tie_check", p))
        ).toBeLessThan(1e-6)
        expect(
          Math.abs(m.num("InvestedCapitalAndRoic", "ic_tie_check", p))
        ).toBeLessThan(1e-6)
      }

      // ROU-ex GAAP EBITDA cross-schedule identity (FY26A)
      expect(
        Math.abs(
          m.num("IncomeStatement", "gaap_ebitda", "FY26A") -
            m.num("LtmCashFlowAndH1Anchors", "gaap_ebitda", "FY26A")
        )
      ).toBeLessThan(1e-6)

      // Forecast roll-forwards (FY27E-FY31E)
      for (let i = 0; i < FORECAST_PERIODS.length; i += 1) {
        const cur = FORECAST_PERIODS[i]
        const prev = i === 0 ? "FY26A" : FORECAST_PERIODS[i - 1]
        if (cur === undefined || prev === undefined) continue

        // Retained Earnings roll-forward
        const reOpen = m.num("BalanceSheet", "retained_earnings", prev)
        const ni = m.num("IncomeStatement", "net_income", cur)
        const div = m.num("CashFlowStatement", "dividends_paid", cur)
        const reClose = m.num("BalanceSheet", "retained_earnings", cur)
        expect(Math.abs(reOpen + ni + div - reClose)).toBeLessThan(1e-6)

        // PP&E roll-forward
        const ppeOpen = m.num("PpeAndIntangiblesSchedule", "opening_ppe", cur)
        const capex = m.num("PpeAndIntangiblesSchedule", "cash_capex_add", cur)
        const finLease = m.num(
          "PpeAndIntangiblesSchedule",
          "fin_lease_add",
          cur
        )
        const depr = m.num(
          "PpeAndIntangiblesSchedule",
          "ppe_and_fin_lease_depr",
          cur
        )
        const ppeClose = m.num("BalanceSheet", "ppe_net", cur)
        expect(
          Math.abs(ppeOpen + capex + finLease - depr - ppeClose)
        ).toBeLessThan(1e-6)

        // Purchased Intangibles roll-forward
        const intOpen = m.num(
          "PpeAndIntangiblesSchedule",
          "opening_intangibles",
          cur
        )
        const intAdd = m.num(
          "PpeAndIntangiblesSchedule",
          "new_ppa_intang_additions",
          cur
        )
        const intAmort = m.num(
          "PpeAndIntangiblesSchedule",
          "total_intangibles_amort",
          cur
        )
        const intClose = m.num("BalanceSheet", "purchased_intangibles_net", cur)
        expect(Math.abs(intOpen + intAdd - intAmort - intClose)).toBeLessThan(
          1e-6
        )

        // Goodwill roll-forward (including acquired M&A working capital PPA step-up)
        const gwOpen = m.num(
          "PpeAndIntangiblesSchedule",
          "opening_goodwill",
          cur
        )
        const gwAdd = m.num(
          "PpeAndIntangiblesSchedule",
          "new_goodwill_additions",
          cur
        )
        const cashMa = m.num(
          "PpeAndIntangiblesSchedule",
          "cash_ma_outlays",
          cur
        )
        const acqNowc = m.num(
          "PpeAndIntangiblesSchedule",
          "acquired_nowc_ma",
          cur
        )
        const gwClose = m.num("BalanceSheet", "goodwill", cur)
        expect(Math.abs(cashMa - intAdd - acqNowc - gwAdd)).toBeLessThan(1e-6)
        expect(Math.abs(gwOpen + gwAdd - gwClose)).toBeLessThan(1e-6)

        // Capitalized Contract Costs roll-forward
        const cccOpen = m.num("WorkingCapitalSchedule", "opening_ccc", cur)
        const cccCap = m.num(
          "WorkingCapitalSchedule",
          "cash_commissions_cap",
          cur
        )
        const cccAmort = m.num(
          "WorkingCapitalSchedule",
          "amort_contract_costs",
          cur
        )
        const cccClose =
          m.num("BalanceSheet", "capitalized_contract_costs_current", cur) +
          m.num("BalanceSheet", "capitalized_contract_costs_noncurrent", cur)
        expect(Math.abs(cccOpen + cccCap - cccAmort - cccClose)).toBeLessThan(
          1e-6
        )

        // Debt roll-forward (Funded + Revolver)
        const debtOpen =
          m.num("BalanceSheet", "debt_current", prev) +
          m.num("BalanceSheet", "debt_noncurrent", prev)
        const debtIss = m.num(
          "CashFlowStatement",
          "debt_issuance_proceeds_net",
          cur
        )
        const debtRep = m.num("CashFlowStatement", "debt_repayments", cur)
        const revNet = m.num("CashFlowStatement", "revolver_net_draw", cur)
        const debtClose =
          m.num("BalanceSheet", "debt_current", cur) +
          m.num("BalanceSheet", "debt_noncurrent", cur)
        expect(
          Math.abs(debtOpen + debtIss + debtRep + revNet - debtClose)
        ).toBeLessThan(1e-6)
      }
    }
  })

  it("C2 & C6: verifies live formulas on all computed schedules, max Excel formula length <= 320 chars, zero unconsumed drivers, and monotonic ScenarioControl toggle parity", () => {
    const base = compiled.base

    // Key computed cells across all schedules (including decomposed workings) must be live formulas
    const liveFormulaCells: readonly (readonly [string, string, string])[] = [
      ["IncomeStatement", "total_revenue", "FY27E"],
      ["IncomeStatement", "gaap_ebitda", "FY31E"],
      ["IncomeStatement", "net_income", "FY31E"],
      ["BalanceSheet", "total_assets", "FY31E"],
      ["CashFlowStatement", "acquired_ma_wc_adj", "FY27E"],
      ["CashFlowStatement", "ending_cash", "FY31E"],
      ["LtmOperatingBridge", "total_revenue", "LTM_Q2_27"],
      ["LtmCashFlowAndH1Anchors", "gaap_ebitda", "LTM_Q2_27"],
      ["LtmCashFlowAndH1Anchors", "unlevered_fcff", "LTM_Q2_27"],
      ["InvestedCapitalAndRoic", "headline_roic", "FY31E"],
      ["DebtTrancheRegistry", "senior_notes_mar_2046", "ytm"],
      ["DebtTrancheRegistry", "senior_notes_mar_2046", "yrs_to_mat"],
      ["DebtTrancheRegistry", "senior_notes_mar_2046", "pv_factor"],
      ["DebtTrancheRegistry", "total_debt", "est_fair_value"],
      ["BetaSummaryTable", "CRM", "beta_5y_m"],
      ["BetaSummaryTable", "CRM", "beta_2y_w"],
      ["WaccSchedule", "unlevered_beta", "primary"],
      ["WaccSchedule", "relevered_beta", "primary"],
      ["WaccSchedule", "relevered_beta", "short_regime"],
      ["WaccSchedule", "wacc", "primary"],
      ["WaccSchedule", "eq_roll_period_yrs", "primary"],
      ["WaccSchedule", "eq_roll_factor", "primary"],
      ["DcfModel", "unlevered_fcff", "H2_FY27E"],
      ["DcfModel", "pv_fcff_at_base_wacc", "FY31E"],
      ["DcfSummaryTable", "operating_ev_val_date", "gordon"],
      ["DcfSummaryTable", "terminal_nopat_base", "gordon"],
      ["DcfSummaryTable", "tv_pv_factor", "gordon"],
      ["DcfSummaryTable", "spot_pf_operating_ev", "gordon"],
      ["DcfSummaryTable", "spot_fy28_fcff_yield", "gordon"],
      ["DcfSummaryTable", "spot_fcff_yield_spread_vs_ust", "gordon"],
      ["EvToEquityBridge", "implied_equity_bs_date", "gordon"],
      ["EvToEquityBridge", "plus_equity_roll_forward", "gordon"],
      ["EvToEquityBridge", "less_q3_dividend", "gordon"],
      ["EvToEquityBridge", "implied_share_price", "gordon"],
      ["EvToEquityBridge", "standalone_ltm_net_bridge", "gordon"],
      ["ScenarioVarianceBridge", "base_case_price", "val_per_share"],
      ["ScenarioVarianceBridge", "delta_operating_cf", "val_per_share"],
      ["DcfSummaryTable", "implied_perp_g", "exit_mult"],
      ["SensitivityWaccVsGrowth", "w_base", "g_base"],
      ["WaccSensitivityWorkings", "w_base", "pv_explicit"],
      ["ReverseDcfMatrix", "wacc_975", "cagr_8"],
      ["ExpectationWaccWorkings", "wacc_975", "tv_base"],
      ["TerminalReinvestSensitivity", "reinv_0", "implied_price"],
      ["IcStressScenarios", "beta_2y_w", "implied_price"],
      ["IcStressScenarios", "debt_fv_cushion", "implied_price"],
      ["IcStressScenarios", "deleveraged_wacc", "implied_price"],
      ["IcStressScenarios", "flat_fy27_ebita_mgn", "implied_price"],
      ["IcStressScenarios", "ongoing_ma_leakage", "implied_price"],
      ["IcStressWorkings", "flat_fy27_ebita_mgn", "pv_explicit"],
      ["PeerLtmOperatingBridge", "ltm_rev", "NOW"],
      ["PeerLtmCashFlowBridge", "ltm_gaap_ebitda", "NOW"],
      ["PeerEvBridge", "enterprise_value", "NOW"],
      ["TradingCompsTable", "CRM", "ev_ebitda"],
      ["TradingCompsTable", "CRM_net_strat", "ev_fcf_sbc"],
      ["CompsImpliedValuation", "ev_gaap_ebitda", "mature_px"],
      ["CompsImpliedValuation", "ev_econ_fcf_memo", "mature_px"],
      ["ExecutiveDashboard", "dcf_gordon_price", "active"],
    ]
    for (const [tbl, row, col] of liveFormulaCells) {
      expect(
        base.inspectCell(tbl, row, col).isFormula,
        `${tbl}[${row},${col}] should be a live formula`
      ).toBe(true)
    }

    // C2: Every lowered Excel formula across the entire workbook must stay <= 320 chars
    const longFormulas: string[] = []
    for (const sheet of base.summary().sheets) {
      for (const tblMeta of sheet.tables) {
        const ti = base.inspectTable(tblMeta.id)
        for (const [coord, cell] of Object.entries(ti.cells)) {
          if (cell.excelFormula !== null && cell.excelFormula.length > 320) {
            longFormulas.push(
              `${coord} (${cell.excelFormula.length}ch): ${cell.excelFormula}`
            )
          }
        }
      }
    }
    expect(longFormulas).toEqual([])

    // Every active driver cell must have downstream dependents
    for (const key of SCALAR_DRIVER_KEYS) {
      expect(
        base.dependentsOf("ScalarDrivers", key, "active").directCount,
        `ScalarDrivers[${key}, active] has no dependents`
      ).toBeGreaterThan(0)
    }
    for (const key of PERIOD_DRIVER_KEYS) {
      for (const p of FORECAST_PERIODS) {
        expect(
          base.dependentsOf("PeriodDriversActive", key, p).directCount,
          `PeriodDriversActive[${key}, ${p}] has no dependents`
        ).toBeGreaterThan(0)
      }
    }

    // Live monotonic toggle test on a single Model instance: 2 -> 1 -> 3 -> 2
    const snapshots = computeScenarioSnapshots()
    const model = buildSalesforceModel({ scenario: "base", snapshots })
    const controlTbl = model.getTable("ScenarioControl")

    for (const target of ["downside", "upside", "base"] as const) {
      controlTbl.setCell("active", "val", {
        value: SCENARIO_INDEX[target],
        highlight: true,
      })
      const toggled = model.compile()
      try {
        expect(
          toggled.num("EvToEquityBridge", "implied_share_price", "gordon")
        ).toBeCloseTo(
          compiled[target].num(
            "EvToEquityBridge",
            "implied_share_price",
            "gordon"
          ),
          9
        )
        expect(
          toggled.num("IncomeStatement", "total_revenue", "FY30E")
        ).toBeCloseTo(
          compiled[target].num("IncomeStatement", "total_revenue", "FY30E"),
          9
        )
        expect(toggled.num("WaccSchedule", "wacc", "primary")).toBeCloseTo(
          compiled[target].num("WaccSchedule", "wacc", "primary"),
          9
        )
      } finally {
        toggled.dispose()
      }
    }
  })

  it("C2 & C3: enforces 12-tab grid layout, uniform letter landscape print config, author footer, explicit valuation date, scale >= 60%, zero overflow markers on printable tabs, section gutters, FY26A|FY27E column gutters, bold non-summary columns, and clean note placement", () => {
    const base = compiled.base
    const layoutMd = base.toMarkdown("layout")

    // All 12 sheets use layout: "grid" with no freezePanes and no collapsible outlines
    expect(layoutMd.match(/Layout: grid/g)?.length ?? 0).toBe(12)
    expect(layoutMd).not.toMatch(/Freeze:/)
    expect(layoutMd).not.toMatch(/\bcollapsible\b/)

    // Print setup diagnostics across all 12 sheets (C2)
    expect(layoutMd.match(/Print: letter landscape/g)?.length ?? 0).toBe(12)
    expect(layoutMd.match(/Fit: fit_page \(1 x 1\)/g)?.length ?? 0).toBe(4)
    expect(layoutMd.match(/Fit: fit_width \(1 x auto\)/g)?.length ?? 0).toBe(8)
    expect(layoutMd).not.toMatch(/\[low scale <60%\]/)

    // Split layout markdown by sheet to verify fit_page sheets, scale >= 68%, and zero '!' on 11 non-MarketData sheets
    const sheetSections = layoutMd.split(/^## Sheet: /m).slice(1)
    expect(sheetSections).toHaveLength(12)
    const fitPageSheets = new Set([
      "ExecutiveSummary",
      "IncomeStatement",
      "BalanceSheet",
      "CashFlow",
    ])
    for (const section of sheetSections) {
      const sheetName = section.split("\n", 1)[0]?.trim() ?? ""
      const printLine =
        section.split("\n").find((l) => l.startsWith("Print: ")) ?? ""
      expect(printLine, `${sheetName} missing Print: line`).toContain(
        "Print: letter landscape"
      )
      if (fitPageSheets.has(sheetName)) {
        expect(printLine, `${sheetName} should be fit_page`).toContain(
          "Fit: fit_page (1 x 1)"
        )
        const scaleMatch = printLine.match(/Est\. scale: ~(\d+)%/)
        const scale = Number(scaleMatch?.[1] ?? 0)
        expect(
          scale,
          `${sheetName} fit_page scale ${scale}% < 68%`
        ).toBeGreaterThanOrEqual(68)
      } else {
        expect(printLine, `${sheetName} should be fit_width`).toContain(
          "Fit: fit_width (1 x auto)"
        )
      }
      if (sheetName !== "MarketData") {
        expect(
          printLine,
          `${sheetName} has page overflow marker '!': ${printLine}`
        ).not.toMatch(/~[\d.]+pg!/)
      }
    }

    // Print author footer & explicit valuation date (no {date}) on every sheet in model.toSpec() (C3)
    const spec = buildSalesforceModel({ scenario: "base" }).toSpec()
    expect(base.summary().modelName).not.toMatch(FORBIDDEN_INTERNAL_RE)
    expect(spec.manifest.sheets).toHaveLength(12)
    for (const sheetSpec of spec.manifest.sheets) {
      const sp = sheetSpec.print
      expect(sp, `${sheetSpec.name} missing print spec`).toBeDefined()
      if (sp === undefined) continue
      expect(sp.paperSize).toBe("letter")
      expect(sp.orientation).toBe("landscape")
      expect(sp.centerHorizontally).toBe(true)
      expect(sp.fit).toBe(
        fitPageSheets.has(sheetSpec.name) ? "fit_page" : "fit_width"
      )
      expect(sp.header?.left).toBe("{model}")
      expect(sp.header?.right).toBe("{sheet}")
      expect(sp.footer?.left).toBe("Michael Hu, CFA | mhu@outlook.co.nz")
      expect(sp.footer?.center).toBe("As of November 18, 2026")
      expect(sp.footer?.center).not.toContain("{date}")
      expect(sp.footer?.right).toBe("Page {page} of {pages}")
      for (const hfStr of [
        sp.header?.left,
        sp.header?.center,
        sp.header?.right,
        sp.footer?.left,
        sp.footer?.center,
        sp.footer?.right,
      ]) {
        if (hfStr !== undefined) {
          expect(hfStr).not.toMatch(FORBIDDEN_INTERNAL_RE)
        }
      }
    }

    // Zero subtitle overflows, zero wrapped cells, zero widened gutters
    expect(layoutMd).not.toMatch(/sub:\d+\(\d+ch>w\)/)
    expect(layoutMd).not.toMatch(/\bwrap:[1-9]\d*\b/)
    expect(layoutMd).not.toMatch(/gutter\s+[A-Z]+(?:\.\.[A-Z]+)?\(\d+c,\s*w:/)

    // Annual column gutter separates FY26A from FY27E on all 12 annual statement & operating tables
    for (const tblId of ANNUAL_TABLE_IDS) {
      const ti = base.inspectTable(tblId)
      const fy26Idx = ti.columns.findIndex((c) => c.id === "FY26A")
      const fy27Idx = ti.columns.findIndex((c) => c.id === "FY27E")
      expect(fy26Idx, `${tblId} missing FY26A`).toBeGreaterThan(0)
      expect(fy27Idx, `${tblId} missing FY27E`).toBe(fy26Idx + 2)
      expect(
        ti.columns[fy26Idx + 1]?.isGutter,
        `${tblId} missing column gutter between FY26A and FY27E`
      ).toBe(true)
    }

    // Section row gutters, column emphasis styles, and descriptor note hygiene across all tables
    const missingSectionGutters: string[] = []
    const leadingSectionGutters: string[] = []
    const illegalColSummaryStyles: string[] = []
    const descriptorHoverNotes: string[] = []

    for (const sheet of base.summary().sheets) {
      for (const tblMeta of sheet.tables) {
        const ti = base.inspectTable(tblMeta.id)

        // Check section row gutters (non-first sections require preceding gutter; first section has no leading gutter)
        for (let i = 0; i < ti.rows.length; i += 1) {
          const row = ti.rows[i]
          if (row === undefined || !row.isSectionHeader) continue
          if (i === 0) {
            continue
          }
          if (i === 1 && ti.rows[0]?.isGutter) {
            leadingSectionGutters.push(
              `${tblMeta.id} leading gutter before first section "${row.sectionTitle}"`
            )
            continue
          }
          if (!ti.rows[i - 1]?.isGutter) {
            missingSectionGutters.push(
              `${tblMeta.id} section "${row.sectionTitle}"`
            )
          }
        }

        // Check column subtotal/total style restricted to CapitalAllocationSummary.cum_5y
        for (const col of ti.columns) {
          if (col.isGutter || col.id === null) continue
          if (col.style === "subtotal" || col.style === "total") {
            if (
              !(
                tblMeta.id === "CapitalAllocationSummary" && col.id === "cum_5y"
              )
            ) {
              illegalColSummaryStyles.push(
                `${tblMeta.id}.${col.id} (${col.style})`
              )
            }
          }
        }

        // Check zero hover notes on descriptor columns
        const descriptorCols = ti.columns.flatMap((c) =>
          c.isDescriptor && c.id !== null ? [c.id] : []
        )
        const tbl = base.table(tblMeta.id)
        for (const r of tbl.rows) {
          for (const dc of descriptorCols) {
            const ci = base.inspectCell(tblMeta.id, r, dc)
            if (ci.note !== null) {
              descriptorHoverNotes.push(`${tblMeta.id}[${r},${dc}]`)
            }
          }
        }
      }
    }

    expect(missingSectionGutters).toEqual([])
    expect(leadingSectionGutters).toEqual([])
    expect(illegalColSummaryStyles).toEqual([])
    expect(descriptorHoverNotes).toEqual([])

    // Visible trailing provenance columns exist on required schedules
    const trailingProvenanceChecks: readonly (readonly [string, string])[] = [
      ["ScalarDrivers", "provenance"],
      ["PeriodDriversActive", "provenance"],
      ["PeriodDriversDownside", "provenance"],
      ["PeriodDriversBase", "provenance"],
      ["PeriodDriversUpside", "provenance"],
      ["ValuationFootballField", "notes"],
      ["AuditedFootnoteAnchors", "source"],
      ["TradingCompsTable", "ltm_basis"],
    ]
    for (const [tblId, colId] of trailingProvenanceChecks) {
      const ti = base.inspectTable(tblId)
      const col = ti.columns.find((c) => c.id === colId)
      expect(
        col?.isDescriptor,
        `${tblId}.${colId} should be a descriptor col`
      ).toBe(true)
    }

    // Sparse measure-cell notes exist on first forecast 0 cells of zeroed non-recurring lines
    for (const [tblId, rowId, colId] of [
      ["IncomeStatement", "gains_on_strategic_investments_net", "FY28E"],
      ["BalanceSheet", "preferred_stock", "FY27E"],
      ["CashFlowStatement", "fx_effect_on_cash", "FY27E"],
      ["CostAndSbcSchedule", "sbc_restructuring", "FY27E"],
      ["PpeAndIntangiblesSchedule", "cash_ma_outlays", "FY29E"],
    ] as const) {
      const ci = base.inspectCell(tblId, rowId, colId)
      expect(
        ci.note,
        `${tblId}[${rowId},${colId}] should carry a note`
      ).not.toBeNull()
    }
  })

  it("C5: enforces zero repo/SDK/methodology/plumbing jargon across all rendered strings and measure headers & 1-col group banners within grid colWidth - 1", () => {
    const longHeaders: string[] = []
    const forbiddenStrings: string[] = []

    for (const key of SCENARIO_KEYS) {
      const model = compiled[key]
      for (const sheet of model.summary().sheets) {
        const si = model.inspectSheet(sheet.name)
        const nonGutterWidths = Object.values(si.colWidths).filter((w) => w > 2)
        const maxHdrLen =
          (nonGutterWidths.length > 0 ? Math.max(...nonGutterWidths) : 12) - 1
        for (const tblMeta of sheet.tables) {
          const ti = model.inspectTable(tblMeta.id)
          for (const str of [ti.title, ...ti.subtitles]) {
            if (FORBIDDEN_INTERNAL_RE.test(str)) {
              forbiddenStrings.push(`${key}:${tblMeta.id} banner: ${str}`)
            }
          }
          // Count consecutive columns sharing each group banner to check 1-col banners
          for (let i = 0; i < ti.columns.length; i += 1) {
            const col = ti.columns[i]
            if (col === undefined || col.isGutter) continue
            if (col.group !== null) {
              if (FORBIDDEN_INTERNAL_RE.test(col.group)) {
                forbiddenStrings.push(
                  `${key}:${tblMeta.id}.${col.id} group: ${col.group}`
                )
              }
              const prevSame = i > 0 && ti.columns[i - 1]?.group === col.group
              const nextSame =
                i + 1 < ti.columns.length &&
                ti.columns[i + 1]?.group === col.group
              if (!prevSame && !nextSame && col.group.length > maxHdrLen) {
                longHeaders.push(
                  `${tblMeta.id}.${col.id} 1-col group: "${col.group}" (${col.group.length} > ${maxHdrLen})`
                )
              }
            }
            for (const h of col.headers) {
              if (!col.isDescriptor && h.length > maxHdrLen) {
                longHeaders.push(
                  `${tblMeta.id}.${col.id}: "${h}" (${h.length} > ${maxHdrLen})`
                )
              }
              if (FORBIDDEN_INTERNAL_RE.test(h)) {
                forbiddenStrings.push(
                  `${key}:${tblMeta.id}.${col.id} header: ${h}`
                )
              }
            }
          }
          for (const row of ti.rows) {
            if (
              row.sectionTitle !== null &&
              FORBIDDEN_INTERNAL_RE.test(row.sectionTitle)
            ) {
              forbiddenStrings.push(
                `${key}:${tblMeta.id} section: ${row.sectionTitle}`
              )
            }
          }
          const tbl = model.table(tblMeta.id)
          for (const r of tbl.rows) {
            for (const c of tbl.columns) {
              const ci = model.inspectCell(tblMeta.id, r, c)
              const val = tbl.value(r, c)
              if (
                typeof val === "string" &&
                !val.startsWith("#") &&
                FORBIDDEN_INTERNAL_RE.test(val)
              ) {
                forbiddenStrings.push(`${key}:${tblMeta.id}[${r},${c}]: ${val}`)
              }
              if (ci.note !== null && FORBIDDEN_INTERNAL_RE.test(ci.note)) {
                forbiddenStrings.push(
                  `${key}:${tblMeta.id}[${r},${c}] note: ${ci.note}`
                )
              }
            }
          }
        }
      }
    }

    expect(longHeaders).toEqual([])
    expect(forbiddenStrings).toEqual([])
  })
})
