import { Cell, type Sheet } from "f8-engine"
import type { AuditedModelData } from "../kg-extractors.ts"
import { SCALE_NOTE_USD_M, VALUATION_AS_OF_DATE } from "../scale.ts"
import type { ScenarioId } from "../timeline.ts"

export interface ScenarioOutputSnapshot {
  readonly scenario: ScenarioId
  readonly rev26: number
  readonly rev27: number
  readonly rev31: number
  readonly cleanEbit26: number
  readonly cleanEbit27: number
  readonly cleanEbit31: number
  readonly cleanEbitMgn31: number
  readonly capex26: number
  readonly capex27: number
  readonly capex31: number
  readonly fcff27: number
  readonly fcff31: number
  readonly cleanEps26: number
  readonly cleanEps27: number
  readonly cleanEps28: number
  readonly wacc: number
  readonly impliedEv: number
  readonly impliedSharePrice: number
  readonly tvPctEv: number
  readonly exitEvEbitda: number
  readonly evAtBaseParams: number
  readonly pxAtBaseParams: number
  readonly breakevenYear: number | null
}

export type ScenarioSnapshotMap = Readonly<
  Record<ScenarioId, ScenarioOutputSnapshot>
>

export function buildCoverSummarySheet(
  sheet: Sheet,
  data: AuditedModelData,
  snaps: ScenarioSnapshotMap
): void {
  // =========================================================================
  // Band 1 Left (Cols B..G): Executive Valuation Summary
  // =========================================================================
  const streetMean = data.val(
    "consensus_target_price",
    "target_price_mean",
    "2026-11-20",
    { entity: "META" }
  )
  const streetHigh = data.val(
    "consensus_target_price",
    "target_price_high",
    "2026-11-20",
    { entity: "META" }
  )
  const streetLow = data.val(
    "consensus_target_price",
    "target_price_low",
    "2026-11-20",
    { entity: "META" }
  )
  const wk52High = data.val(
    "market_spot_prices",
    "fifty_two_week_high",
    "2026-11-20",
    { entity: "META" }
  )
  const wk52Low = data.val(
    "market_spot_prices",
    "fifty_two_week_low",
    "2026-11-20",
    { entity: "META" }
  )

  const valSum = sheet.addTable(
    "ValuationSummary",
    "Meta Platforms, Inc. (META) — Valuation Summary",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        `As of ${VALUATION_AS_OF_DATE} ($560.84); Nasdaq consensus (37 Buy / 6 Hold)`,
        "Scenario rows are static snapshots; Active row updates live",
      ],
    }
  )
  valSum.addColumn("label", {
    role: "descriptor",
    header: "Valuation Benchmark",
  })
  valSum.addColumn("ev", { header: "Implied EV" })
  valSum.addColumn("price", { header: "Share Price" })
  valSum.addColumn("vs_spot", { header: "vs. Spot" })

  valSum.addSectionHeader("Intrinsic valuation — unlevered DCF (SBC expensed)")

  valSum.addRow("dcf_downside", {
    cells: {
      label: new Cell({ value: "DCF — Downside Case" }),
      ev: new Cell({
        value: snaps.downside.impliedEv,
        format: "currency",
        decimals: 0,
      }),
      price: new Cell({
        value: snaps.downside.impliedSharePrice,
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("dcf_base", {
    cells: {
      label: new Cell({ value: "DCF — Base Case" }),
      ev: new Cell({
        value: snaps.base.impliedEv,
        format: "currency",
        decimals: 0,
      }),
      price: new Cell({
        value: snaps.base.impliedSharePrice,
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
    style: "bold",
  })
  valSum.addRow("dcf_upside", {
    cells: {
      label: new Cell({ value: "DCF — Upside Case" }),
      ev: new Cell({
        value: snaps.upside.impliedEv,
        format: "currency",
        decimals: 0,
      }),
      price: new Cell({
        value: snaps.upside.impliedSharePrice,
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("dcf_active_live", {
    cells: {
      label: new Cell({ value: "DCF — Active Case (Live)" }),
      ev: new Cell({
        expr: 'DcfBridge["implied_ev", "val"]',
        format: "currency",
        decimals: 0,
      }),
      price: new Cell({
        expr: 'DcfBridge["implied_share_price", "val"]',
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: 'DcfBridge["upside_downside_vs_spot", "val"]',
        format: "percentage",
        decimals: 1,
      }),
    },
    style: "bold",
    highlight: true,
  })

  valSum.addRowGutter()
  valSum.addSectionHeader("Market benchmarks & trading comparables")

  valSum.addRow("comps_grp_a_ebitda", {
    cells: {
      label: new Cell({ value: "Comps — Group A EV / LTM EBITDA" }),
      ev: new Cell({
        expr: 'CompsImpliedValuation["grp_a_ev_ebitda", "implied_ev"]',
        format: "currency",
        decimals: 0,
      }),
      price: new Cell({
        expr: 'CompsImpliedValuation["grp_a_ev_ebitda", "implied_px"]',
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: 'CompsImpliedValuation["grp_a_ev_ebitda", "vs_spot"]',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("comps_grp_a_pe", {
    cells: {
      label: new Cell({ value: "Comps — Group A CY27E P/E" }),
      ev: null,
      price: new Cell({
        expr: 'CompsImpliedValuation["grp_a_pe_fy2", "implied_px"]',
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: 'CompsImpliedValuation["grp_a_pe_fy2", "vs_spot"]',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("street_target_mean", {
    cells: {
      label: new Cell({ value: "Consensus 12M target — Mean" }),
      ev: null,
      price: new Cell({ value: streetMean, format: "currency", decimals: 2 }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("street_target_range_high", {
    cells: {
      label: new Cell({ value: "Consensus 12M target — High" }),
      ev: null,
      price: new Cell({ value: streetHigh, format: "currency", decimals: 2 }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("street_target_range_low", {
    cells: {
      label: new Cell({ value: "Consensus 12M target — Low" }),
      ev: null,
      price: new Cell({ value: streetLow, format: "currency", decimals: 2 }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("spot_market", {
    cells: {
      label: new Cell({ value: "Current market spot (Nov 20, 2026)" }),
      ev: new Cell({
        expr: 'DcfDilutionAndSpotAnchor["spot_pf_ev", "val"]',
        format: "currency",
        decimals: 0,
      }),
      price: new Cell({
        expr: 'WaccBuild["spot_price", "val"]',
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({ value: 0, format: "percentage", decimals: 1 }),
    },
    style: "bold",
  })
  valSum.addRow("wk52_high", {
    cells: {
      label: new Cell({ value: "52-week trading high" }),
      ev: null,
      price: new Cell({ value: wk52High, format: "currency", decimals: 2 }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
  })
  valSum.addRow("wk52_low", {
    cells: {
      label: new Cell({ value: "52-week trading low" }),
      ev: null,
      price: new Cell({ value: wk52Low, format: "currency", decimals: 2 }),
      vs_spot: new Cell({
        expr: '@table[@row, "price"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
    },
  })

  // =========================================================================
  // Band 1 Right (Cols I..N): Scenario Variance Attribution vs. Base Case
  // =========================================================================
  const varAttr = sheet.addTable(
    "ScenarioVarianceAttribution",
    "Scenario Variance Attribution vs. Base Case",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Splits each scenario delta into (a) operating cash flows at Base",
        "WACC / g / RONIC plus (b) valuation parameter residual",
      ],
    }
  )
  varAttr.addColumn("label", {
    role: "descriptor",
    header: "Variance Component",
  })
  varAttr.addColumn("downside", { header: "Downside", group: "vs. Base Case" })
  varAttr.addColumn("upside", { header: "Upside", group: "vs. Base Case" })
  varAttr.addColumn("active", {
    headers: ["Active", "(Live)"],
    group: "Reconcile",
    style: "bold",
    shade: "muted",
  })

  varAttr.addSectionHeader("Enterprise value attribution ($M)")

  varAttr.addRow("ev_base", {
    cells: {
      label: new Cell({ value: "Base Case implied EV" }),
      downside: snaps.base.impliedEv,
      upside: snaps.base.impliedEv,
      active: snaps.base.impliedEv,
    },
    format: "currency",
    decimals: 0,
  })
  varAttr.addRow("ev_at_base_params", {
    cells: {
      label: new Cell({ value: "Cash flows at Base WACC / g / RONIC" }),
      downside: snaps.downside.evAtBaseParams,
      upside: snaps.upside.evAtBaseParams,
      active: new Cell({
        expr: 'DcfDilutionAndSpotAnchor["ev_at_base_params", "val"]',
      }),
    },
    format: "currency",
    decimals: 0,
  })
  varAttr.addRow("ev_scen", {
    cells: {
      label: new Cell({ value: "Scenario implied EV" }),
      downside: snaps.downside.impliedEv,
      upside: snaps.upside.impliedEv,
      active: new Cell({ expr: 'DcfBridge["implied_ev", "val"]' }),
    },
    format: "currency",
    decimals: 0,
  })
  varAttr.addRow("ev_op_delta", {
    cells: {
      label: new Cell({ value: "(a) Operating cash flow delta" }),
    },
    expr: '@table["ev_at_base_params", @col] - @table["ev_base", @col]',
    format: "currency",
    decimals: 0,
  })
  varAttr.addRow("ev_val_residual", {
    cells: {
      label: new Cell({ value: "(b) Valuation parameter residual" }),
    },
    expr: '@table["ev_scen", @col] - @table["ev_at_base_params", @col]',
    format: "currency",
    decimals: 0,
  })
  varAttr.addRow("ev_total_delta", {
    cells: {
      label: new Cell({ value: "Total EV delta vs. Base ((a) + (b))" }),
    },
    expr: '@table["ev_op_delta", @col] + @table["ev_val_residual", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  varAttr.addRow("ev_recon_check", {
    cells: {
      label: new Cell({ value: "EV attribution check" }),
    },
    expr: '@table["ev_total_delta", @col] - (@table["ev_scen", @col] - @table["ev_base", @col])',
    format: "currency",
    decimals: 2,
  })

  varAttr.addRowGutter()
  varAttr.addSectionHeader("Per-share value attribution ($/share)")

  varAttr.addRow("px_base", {
    cells: {
      label: new Cell({ value: "Base Case implied share price" }),
      downside: snaps.base.impliedSharePrice,
      upside: snaps.base.impliedSharePrice,
      active: snaps.base.impliedSharePrice,
    },
    format: "currency",
    decimals: 2,
  })
  varAttr.addRow("px_at_base_params", {
    cells: {
      label: new Cell({ value: "Cash flows at Base WACC/g ($/sh)" }),
      downside: snaps.downside.pxAtBaseParams,
      upside: snaps.upside.pxAtBaseParams,
      active: new Cell({
        expr: 'DcfDilutionAndSpotAnchor["px_at_base_params", "val"]',
      }),
    },
    format: "currency",
    decimals: 2,
  })
  varAttr.addRow("px_scen", {
    cells: {
      label: new Cell({ value: "Scenario implied share price" }),
      downside: snaps.downside.impliedSharePrice,
      upside: snaps.upside.impliedSharePrice,
      active: new Cell({ expr: 'DcfBridge["implied_share_price", "val"]' }),
    },
    format: "currency",
    decimals: 2,
  })
  varAttr.addRow("px_op_delta", {
    cells: {
      label: new Cell({ value: "(a) Operating CF delta ($/sh)" }),
    },
    expr: '@table["px_at_base_params", @col] - @table["px_base", @col]',
    format: "currency",
    decimals: 2,
  })
  varAttr.addRow("px_val_residual", {
    cells: {
      label: new Cell({ value: "(b) Valuation residual ($/sh)" }),
    },
    expr: '@table["px_scen", @col] - @table["px_at_base_params", @col]',
    format: "currency",
    decimals: 2,
  })
  varAttr.addRow("px_total_delta", {
    cells: {
      label: new Cell({ value: "Total $/sh delta vs. Base" }),
    },
    expr: '@table["px_op_delta", @col] + @table["px_val_residual", @col]',
    format: "currency",
    decimals: 2,
    style: "total",
  })
  varAttr.addRow("px_recon_check", {
    cells: {
      label: new Cell({ value: "Per-share attribution check" }),
    },
    expr: '@table["px_total_delta", @col] - (@table["px_scen", @col] - @table["px_base", @col])',
    format: "currency",
    decimals: 4,
  })

  // =========================================================================
  // Band 2 (Cols B..N): Side-by-Side Scenario Comparison
  // =========================================================================
  const comp = sheet.addTable(
    "ScenarioComparison",
    "Side-by-Side Scenario Output Comparison & Live Reconciliation",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Static scenario snapshots; Active column and scenario deltas update live",
      ],
    }
  )
  comp.addColumn("label", {
    role: "descriptor",
    header: "Key Financial / Valuation Metric",
  })
  comp.addColumn("downside", {
    header: "Downside",
    group: "Scenario Snapshots",
  })
  comp.addColumn("base", { header: "Base", group: "Scenario Snapshots" })
  comp.addColumn("upside", { header: "Upside", group: "Scenario Snapshots" })
  comp.addColumn("active", {
    headers: ["Active", "(Live)"],
    group: "Reconcile",
    style: "bold",
    shade: "muted",
  })
  comp.addColumn("down_vs_base", {
    headers: ["Down vs", "Base"],
    group: "Scenario Deltas",
  })
  comp.addColumn("up_vs_base", {
    headers: ["Up vs", "Base"],
    group: "Scenario Deltas",
  })
  comp.addColumn("notes", { role: "descriptor", header: "Notes" })

  const addCompRow = (
    id: string,
    label: string,
    downVal: number,
    baseVal: number,
    upVal: number,
    activeExpr: string,
    format: "currency" | "percentage" | "multiple" | "integer",
    decimals?: number,
    deltaMode: "diff" | "pct" = "diff",
    style?: "subtotal" | "total",
    noteText: string | null = null
  ): void => {
    const deltaExpr = (col: "downside" | "upside"): string =>
      deltaMode === "pct"
        ? `@table[@row, "${col}"] / @table[@row, "base"] - 1`
        : `@table[@row, "${col}"] - @table[@row, "base"]`
    const dFmt = deltaMode === "pct" ? "percentage" : format
    const dDec =
      deltaMode === "pct"
        ? 1
        : format === "integer"
          ? undefined
          : (decimals ?? 1)

    const cellSpec = (v: number): Cell =>
      format === "integer"
        ? new Cell({ value: v, format })
        : new Cell({ value: v, format, decimals })
    const exprSpec = (e: string): Cell =>
      format === "integer"
        ? new Cell({ expr: e, format })
        : new Cell({ expr: e, format, decimals })
    const dCellSpec = (e: string): Cell =>
      dFmt === "integer"
        ? new Cell({ expr: e, format: dFmt })
        : new Cell({ expr: e, format: dFmt, decimals: dDec })

    comp.addRow(id, {
      cells: {
        label: new Cell({ value: label }),
        downside: cellSpec(downVal),
        base: cellSpec(baseVal),
        upside: cellSpec(upVal),
        active: exprSpec(activeExpr),
        down_vs_base: dCellSpec(deltaExpr("downside")),
        up_vs_base: dCellSpec(deltaExpr("upside")),
        notes: noteText,
      },
      style,
    })
  }

  comp.addSectionHeader("Operating trajectory (FY2026E–FY2031E)")
  addCompRow(
    "rev_26",
    "FY2026E consolidated revenue",
    snaps.downside.rev26,
    snaps.base.rev26,
    snaps.upside.rev26,
    'IncomeStatement["revenue", "2026E"]',
    "currency",
    0,
    "pct",
    undefined,
    "Anchored on Q4 2026 revenue outlook range"
  )
  addCompRow(
    "rev_27",
    "FY2027E consolidated revenue",
    snaps.downside.rev27,
    snaps.base.rev27,
    snaps.upside.rev27,
    'IncomeStatement["revenue", "2027E"]',
    "currency",
    0,
    "pct"
  )
  addCompRow(
    "rev_31",
    "FY2031E consolidated revenue",
    snaps.downside.rev31,
    snaps.base.rev31,
    snaps.upside.rev31,
    'IncomeStatement["revenue", "2031E"]',
    "currency",
    0,
    "pct"
  )
  addCompRow(
    "ebit_27",
    "FY2027E normalized EBIT",
    snaps.downside.cleanEbit27,
    snaps.base.cleanEbit27,
    snaps.upside.cleanEbit27,
    'IncomeStatement["normalized_ebit", "2027E"]',
    "currency",
    0,
    "pct",
    undefined,
    "SBC expensed; excludes 9M26 discrete items"
  )
  addCompRow(
    "ebit_31",
    "FY2031E normalized EBIT",
    snaps.downside.cleanEbit31,
    snaps.base.cleanEbit31,
    snaps.upside.cleanEbit31,
    'IncomeStatement["normalized_ebit", "2031E"]',
    "currency",
    0,
    "pct"
  )
  addCompRow(
    "ebit_mgn_31",
    "FY2031E normalized EBIT margin",
    snaps.downside.cleanEbitMgn31,
    snaps.base.cleanEbitMgn31,
    snaps.upside.cleanEbitMgn31,
    'IncomeStatement["normalized_ebit_margin", "2031E"]',
    "percentage",
    1,
    "diff"
  )
  addCompRow(
    "capex_26",
    "FY2026E total CapEx",
    snaps.downside.capex26,
    snaps.base.capex26,
    snaps.upside.capex26,
    '-CashReconAndFcf["total_capex_outflow", "2026E"]',
    "currency",
    0,
    "diff",
    undefined,
    "Includes cash PP&E & finance lease principal"
  )
  addCompRow(
    "fcff_27",
    "FY2027E unlevered economic FCFF",
    snaps.downside.fcff27,
    snaps.base.fcff27,
    snaps.upside.fcff27,
    'DcfFcff["full_period_fcff", "2027E"]',
    "currency",
    0,
    "diff",
    undefined,
    "SBC expensed inside NOPAT (not added back)"
  )
  addCompRow(
    "fcff_31",
    "FY2031E unlevered economic FCFF",
    snaps.downside.fcff31,
    snaps.base.fcff31,
    snaps.upside.fcff31,
    'DcfFcff["full_period_fcff", "2031E"]',
    "currency",
    0,
    "diff"
  )
  addCompRow(
    "eps_26",
    "FY2026E normalized diluted EPS",
    snaps.downside.cleanEps26,
    snaps.base.cleanEps26,
    snaps.upside.cleanEps26,
    'IncomeStatement["normalized_eps", "2026E"]',
    "currency",
    2,
    "diff",
    undefined,
    "vs. $29.01 Nasdaq consensus EPS"
  )
  addCompRow(
    "eps_27",
    "FY2027E normalized diluted EPS",
    snaps.downside.cleanEps27,
    snaps.base.cleanEps27,
    snaps.upside.cleanEps27,
    'IncomeStatement["normalized_eps", "2027E"]',
    "currency",
    2,
    "diff",
    undefined,
    "vs. $33.92 Nasdaq consensus EPS"
  )

  comp.addRowGutter()
  comp.addSectionHeader("Valuation, discount rate & cash yield breakeven")
  addCompRow(
    "wacc",
    "Weighted average cost of capital",
    snaps.downside.wacc,
    snaps.base.wacc,
    snaps.upside.wacc,
    'WaccBuild["wacc", "val"]',
    "percentage",
    2,
    "diff",
    undefined,
    "Hamada-relevered beta to pro forma D/E"
  )
  addCompRow(
    "implied_ev",
    "Implied enterprise value ($M)",
    snaps.downside.impliedEv,
    snaps.base.impliedEv,
    snaps.upside.impliedEv,
    'DcfBridge["implied_ev", "val"]',
    "currency",
    0,
    "diff",
    "subtotal"
  )
  addCompRow(
    "implied_px",
    "Implied share price ($)",
    snaps.downside.impliedSharePrice,
    snaps.base.impliedSharePrice,
    snaps.upside.impliedSharePrice,
    'DcfBridge["implied_share_price", "val"]',
    "currency",
    2,
    "diff",
    "total",
    "Includes TSM RSUs & METAM conversion terms"
  )
  addCompRow(
    "tv_pct",
    "Terminal value % of implied EV",
    snaps.downside.tvPctEv,
    snaps.base.tvPctEv,
    snaps.upside.tvPctEv,
    'DcfBridge["tv_pct_ev", "val"]',
    "percentage",
    1,
    "diff"
  )
  addCompRow(
    "exit_mult",
    "Implied exit TV / FY31E EBITDA",
    snaps.downside.exitEvEbitda,
    snaps.base.exitEvEbitda,
    snaps.upside.exitEvEbitda,
    'DcfBridge["implied_exit_ev_ebitda", "val"]',
    "multiple",
    1,
    "diff"
  )

  const yrCell = (yr: number | null): Cell =>
    yr === null
      ? new Cell({
          value: null,
          note: "Spot EV FCFF yield does not reach 5.04% risk-free rate within the FY2027E–FY2031E explicit horizon.",
        })
      : new Cell({ value: yr, format: "integer" })
  const yrDeltaCell = (
    scenYr: number | null,
    baseYr: number | null,
    col: "downside" | "upside"
  ): Cell =>
    scenYr === null || baseYr === null
      ? new Cell({ value: null })
      : new Cell({
          expr: `@table[@row, "${col}"] - @table[@row, "base"]`,
          format: "integer",
        })

  comp.addRow("rf_breakeven_yr", {
    cells: {
      label: new Cell({ value: "First year spot FCFF yield >= Rf" }),
      downside: yrCell(snaps.downside.breakevenYear),
      base: yrCell(snaps.base.breakevenYear),
      upside: yrCell(snaps.upside.breakevenYear),
      active: new Cell({
        expr: 'IF(CashYieldVsRf["clears_rf_flag", "2027E"] = 1, 2027, IF(CashYieldVsRf["clears_rf_flag", "2028E"] = 1, 2028, IF(CashYieldVsRf["clears_rf_flag", "2029E"] = 1, 2029, IF(CashYieldVsRf["clears_rf_flag", "2030E"] = 1, 2030, IF(CashYieldVsRf["clears_rf_flag", "2031E"] = 1, 2031, NA())))))',
        format: "integer",
      }),
      down_vs_base: yrDeltaCell(
        snaps.downside.breakevenYear,
        snaps.base.breakevenYear,
        "downside"
      ),
      up_vs_base: yrDeltaCell(
        snaps.upside.breakevenYear,
        snaps.base.breakevenYear,
        "upside"
      ),
      notes: "Year spot EV FCFF yield clears 5.04% 10Y UST",
    },
  })

  // =========================================================================
  // Band 3 (Cols B..N): Three-Factor Scenario Return Attribution
  // =========================================================================
  const ret = sheet.addTable(
    "ReturnAttribution",
    "Three-Factor Scenario Return Attribution (Consensus EPS Anchor)",
    {
      subtitle: [
        "(1 + Earnings Roll-Forward) × (1 + EPS Delta vs. Consensus) × (1 + Multiple Re-Rating) − 1 = Implied Return",
      ],
    }
  )
  ret.addColumn("label", {
    role: "descriptor",
    header: "Return Attribution Step",
  })
  ret.addColumn("downside", {
    header: "Downside",
    group: "Scenario Snapshots",
  })
  ret.addColumn("base", { header: "Base", group: "Scenario Snapshots" })
  ret.addColumn("upside", { header: "Upside", group: "Scenario Snapshots" })
  ret.addColumn("active", {
    headers: ["Active", "(Live)"],
    group: "Reconcile",
    style: "bold",
    shade: "muted",
  })
  ret.addColumn("notes", { role: "descriptor", header: "Attribution Basis" })

  ret.addSectionHeader("Consensus anchors & implied multiples")

  ret.addRow("spot_price", {
    cells: {
      label: new Cell({ value: "Spot share price (Nov 20, 2026)" }),
      notes: "Yahoo Finance closing price (Nov 20, 2026)",
    },
    expr: 'WaccBuild["spot_price", "val"]',
    format: "currency",
    decimals: 2,
  })
  ret.addRow("cons_eps_fy26", {
    cells: {
      label: new Cell({ value: "Consensus FY2026E EPS" }),
      notes: "Nasdaq analyst consensus FY2026E EPS (Nov 20, 2026)",
    },
    expr: 'IncomeStatement["consensus_eps", "2026E"]',
    format: "currency",
    decimals: 2,
  })
  ret.addRow("spot_pe_fy26", {
    cells: {
      label: new Cell({ value: "Spot P/E on FY26E consensus EPS" }),
      notes: "Entry trading multiple anchored on FY2026E consensus",
    },
    expr: '@table["spot_price", @col] / @table["cons_eps_fy26", @col]',
    format: "multiple",
    decimals: 2,
  })
  ret.addRow("cons_eps_fy27", {
    cells: {
      label: new Cell({ value: "Consensus FY2027E EPS" }),
      notes: "Nasdaq analyst consensus FY2027E EPS (Nov 20, 2026)",
    },
    expr: 'IncomeStatement["consensus_eps", "2027E"]',
    format: "currency",
    decimals: 2,
  })
  ret.addRow("scen_eps_fy27", {
    cells: {
      label: new Cell({ value: "Scenario FY27E normalized EPS" }),
      downside: snaps.downside.cleanEps27,
      base: snaps.base.cleanEps27,
      upside: snaps.upside.cleanEps27,
      active: new Cell({ expr: 'IncomeStatement["normalized_eps", "2027E"]' }),
      notes: "Model FY2027E normalized diluted EPS per scenario",
    },
    format: "currency",
    decimals: 2,
  })
  ret.addRow("scen_price", {
    cells: {
      label: new Cell({ value: "Scenario implied share price" }),
      downside: snaps.downside.impliedSharePrice,
      base: snaps.base.impliedSharePrice,
      upside: snaps.upside.impliedSharePrice,
      active: new Cell({ expr: 'DcfBridge["implied_share_price", "val"]' }),
      notes: "Unlevered economic DCF implied share price",
    },
    format: "currency",
    decimals: 2,
  })
  ret.addRow("scen_pe_fy27", {
    cells: {
      label: new Cell({ value: "Implied P/E on FY27E scenario EPS" }),
      notes: "Implied scenario share price divided by FY27E normalized EPS",
    },
    expr: 'IF(AND(@table["scen_eps_fy27", @col] > 0, @table["scen_price", @col] > 0), @table["scen_price", @col] / @table["scen_eps_fy27", @col], NA())',
    format: "multiple",
    decimals: 2,
  })

  ret.addRowGutter()
  ret.addSectionHeader("Multiplicative three-factor return bridge")

  ret.addRow("f1_roll_forward", {
    cells: {
      label: new Cell({ value: "Factor 1: Consensus EPS roll-fwd" }),
      notes:
        "Consensus EPS compounding from FY2026E ($29.01) to FY2027E ($33.92)",
    },
    expr: '@table["cons_eps_fy27", @col] / @table["cons_eps_fy26", @col] - 1',
    format: "percentage",
    decimals: 2,
  })
  ret.addRow("f2_eps_delta", {
    cells: {
      label: new Cell({ value: "Factor 2: FY27E EPS vs. consensus" }),
      notes: "Scenario FY2027E normalized EPS divergence from Street consensus",
    },
    expr: '@table["scen_eps_fy27", @col] / @table["cons_eps_fy27", @col] - 1',
    format: "percentage",
    decimals: 2,
  })
  ret.addRow("f3_multiple_delta", {
    cells: {
      label: new Cell({ value: "Factor 3: Implied P/E re-rating" }),
      notes:
        "Implied FY2027E P/E change relative to spot FY2026E consensus P/E",
    },
    expr: '@table["scen_pe_fy27", @col] / @table["spot_pe_fy26", @col] - 1',
    format: "percentage",
    decimals: 2,
  })
  ret.addRow("compounded_return", {
    cells: {
      label: new Cell({ value: "Compounded 3-factor return" }),
      notes: "(1 + Roll-Fwd) × (1 + EPS Delta) × (1 + Re-Rating) − 1",
    },
    expr: '(1 + @table["f1_roll_forward", @col]) * (1 + @table["f2_eps_delta", @col]) * (1 + @table["f3_multiple_delta", @col]) - 1',
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })
  ret.addRow("direct_return", {
    cells: {
      label: new Cell({ value: "Direct share price return vs. spot" }),
      notes: "Scenario implied share price / Nov 20, 2026 spot price − 1",
    },
    expr: '@table["scen_price", @col] / @table["spot_price", @col] - 1',
    format: "percentage",
    decimals: 2,
    style: "total",
  })
  ret.addRow("return_recon_check", {
    cells: {
      label: new Cell({ value: "3-factor attribution check" }),
      notes: "Must equal 0.0000% across all scenarios",
    },
    expr: '@table["compounded_return", @col] - @table["direct_return", @col]',
    format: "percentage",
    decimals: 4,
  })

  // =========================================================================
  // Band 4 (Cols B..N): Key Investment Catalysts & Resolving Milestones
  // =========================================================================
  const ms = sheet.addTable(
    "KeyMilestones",
    "Key Investment Catalysts & Resolving Milestones (2026–2027)",
    {
      subtitle: [
        "Dated financing, operating, litigation, and regulatory events resolving embedded market expectations",
      ],
    }
  )
  ms.addColumn("timing", { role: "descriptor", header: "Target Window" })
  ms.addColumn("label", { role: "descriptor", header: "Observable Catalyst" })
  ms.addColumn("implication", {
    role: "descriptor",
    header: "Valuation & Operating Implication",
  })

  ms.addSectionHeader("Dated financing, operating, legal & regulatory events")
  ms.addRow("m1", {
    cells: {
      timing: "Nov 25, 2026",
      label: "METAM 30-day $1.875B over-allotment option expiry",
      implication:
        "Tests incremental preferred dilution (+2.55M–3.00M sh) & demand",
    },
  })
  ms.addRow("m2", {
    cells: {
      timing: "Dec 7, 2026",
      label: "FTC consent-order modification & privacy deadline",
      implication:
        "Clarifies U.S. regulatory compliance & youth monetization limits",
    },
  })
  ms.addRow("m3", {
    cells: {
      timing: "Jan–Nov 2027",
      label: "Class C stock dividend & 46M forward equity settlement",
      implication:
        "Tests governance discount & $28.7B physical equity settlement",
    },
  })
  ms.addRow("m4", {
    cells: {
      timing: "Late Jan 2027",
      label: "Q4 2026 earnings & formal FY27 CapEx / OpEx / RL guide",
      implication:
        "Anchors peak AI CapEx vs. $121.4B comm., D&A & −$15B RL target",
    },
  })
  ms.addRow("m5", {
    cells: {
      timing: "Feb 2027",
      label: "Youth social-media school-district MDL bellwether trial",
      implication:
        "Tests litigation severity beyond $19.9B reserve & $5.3B AG tranche",
    },
  })
  ms.addRow("m6", {
    cells: {
      timing: "Feb / May 2027",
      label: "AI copyright summary judgment (MSJ) & jury trial",
      implication:
        "Clarifies frontier LLM training liability & Llama licensing costs",
    },
  })
  ms.addRow("m7", {
    cells: {
      timing: "Mar / Aug 2027",
      label: "Youth personal-injury MDL bellwethers & FoA AI KPIs",
      implication: "Tests legal tail dispersion alongside ad pricing & AI ROIC",
    },
  })
  ms.addRow("m8", {
    cells: {
      timing: "H1 2027",
      label: "EC WhatsApp AI appeal, Flo ($6.25B) & NM AG ($25B) appeal",
      implication:
        "Resolves EU WhatsApp remedies, unaccrued damages & beta spread",
    },
  })

  sheet.setBands([
    { lanes: [valSum, varAttr] },
    { lanes: [comp], pageBreakBefore: true },
    { lanes: [ret], pageBreakBefore: true },
    { lanes: [ms], gap: 1 },
  ])
}
