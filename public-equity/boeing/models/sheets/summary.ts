import { Cell, type Sheet } from "f8-engine"
import type { BoeingKgData } from "../kg-loader.ts"
import { SCENARIO_INDEX, type ScenarioKey } from "../timeline.ts"

export interface ScenarioValuationSnapshot {
  readonly wacc: number
  readonly pvExplicit: number
  readonly pvTerminal: number
  readonly pvPostNol: number
  readonly evAnchor: number
  readonly tvPctEv: number
  readonly impliedEv: number
  readonly impliedEquityPre: number
  readonly baPraShares: number
  readonly totalDilutedShares: number
  readonly impliedPrice: number
  readonly impliedReturnPct: number
  readonly exitEvEbitda: number
  readonly sotpPrice: number
  readonly revFy32e: number
  readonly ebitFy32e: number
  readonly ebitMarginFy32e: number
  readonly econFcffFy32e: number
  readonly epsFy27e: number
  readonly epsFy29e: number
  readonly roicFy32e: number
  readonly netDebtFy32e: number
  readonly minLiquidityHeadroom: number
}

export type ScenarioSnapshots = Readonly<
  Record<ScenarioKey, ScenarioValuationSnapshot>
>

const ZERO_SNAPSHOT: ScenarioValuationSnapshot = Object.freeze({
  wacc: 0.0926,
  pvExplicit: 0,
  pvTerminal: 0,
  pvPostNol: 0,
  evAnchor: 0,
  tvPctEv: 0,
  impliedEv: 0,
  impliedEquityPre: 0,
  baPraShares: 0,
  totalDilutedShares: 0,
  impliedPrice: 0,
  impliedReturnPct: 0,
  exitEvEbitda: 0,
  sotpPrice: 0,
  revFy32e: 0,
  ebitFy32e: 0,
  ebitMarginFy32e: 0,
  econFcffFy32e: 0,
  epsFy27e: 0,
  epsFy29e: 0,
  roicFy32e: 0,
  netDebtFy32e: 0,
  minLiquidityHeadroom: 0,
})

const MARGIN_COL_HEADERS = [
  "7.5%",
  "9.0%",
  "10.5%",
  "12.0%",
  "13.5%",
  "15.0%",
] as const
const WACC_ROW_LABELS = [
  "WACC 7.75%",
  "WACC 8.25%",
  "WACC 8.75%",
  "WACC 9.26%",
  "WACC 9.75%",
  "WACC 10.25%",
] as const

export function buildSummarySheet(
  sheet: Sheet,
  kg: BoeingKgData,
  activeScenario: ScenarioKey,
  snapshots?: ScenarioSnapshots
): void {
  const { ba, market } = kg
  const snap: ScenarioSnapshots = snapshots ?? {
    downside: ZERO_SNAPSHOT,
    base: ZERO_SNAPSHOT,
    upside: ZERO_SNAPSHOT,
  }

  // =========================================================================
  // BAND 1: ScenarioControl + SummaryReverseBoundaries (left) | MarketSnapshot (right)
  // =========================================================================
  const ctrl = sheet.addTable(
    "ScenarioControl",
    "Scenario Control & Valuation Context",
    {
      subtitle: [
        "The Boeing Company (NYSE: BA)",
        "Select 1 = Downside, 2 = Base, 3 = Upside",
      ],
    }
  )
  ctrl.addColumn("setting", { role: "descriptor", headers: ["Control"] })
  ctrl.addColumn("val", { headers: ["Value"], style: "bold" })

  ctrl.addRow("active", {
    cells: {
      setting: "Active scenario (1 / 2 / 3)",
      val: new Cell({
        value: SCENARIO_INDEX[activeScenario],
        note: "Scenario selector (1 = Downside, 2 = Base, 3 = Upside) controlling all active operating and valuation assumptions.",
      }),
    },
    format: "integer",
    highlight: true,
  })
  ctrl.addRow("active_name", {
    cells: {
      setting: "Active scenario label",
      val: new Cell({
        expr: `CHOOSE(@table["active", "val"], "Downside", "Base", "Upside")`,
      }),
    },
    format: "text",
  })
  ctrl.addRow("valuation_date", {
    cells: {
      setting: "Analysis & market close date",
      val: new Cell({ expr: `DATE(2026, 11, 20)` }),
    },
    format: "date",
  })
  ctrl.addRow("bs_anchor_date", {
    cells: {
      setting: "Balance sheet anchor date",
      val: new Cell({ expr: `DATE(2026, 9, 30)` }),
    },
    format: "date",
  })

  const clearSummary = sheet.addTable(
    "SummaryReverseBoundaries",
    "Embedded Expectations & Cash Yield",
    {
      subtitle: [
        "Market-implied margin, WACC & cash yield",
        "Nov 20, 2026 spot = $155.89/sh",
      ],
    }
  )
  clearSummary.addColumn("metric", { role: "descriptor", headers: ["Metric"] })
  clearSummary.addColumn("val", { headers: ["Active"], style: "bold" })
  clearSummary.addRow("clear_consol_mgn", {
    cells: {
      metric: "Clearing FY32E Consol EBIT mgn",
      val: new Cell({
        expr: `ReverseDcfBoundaries["clearing_consol_margin", "val"]`,
      }),
    },
    format: "percentage",
    decimals: 2,
  })
  clearSummary.addRow("clear_bca_mgn", {
    cells: {
      metric: "Clearing FY32E BCA EBIT margin",
      val: new Cell({
        expr: `ReverseDcfBoundaries["clearing_bca_margin", "val"]`,
      }),
    },
    format: "percentage",
    decimals: 2,
  })
  clearSummary.addRow("clear_wacc", {
    cells: {
      metric: "Clearing WACC (active forecast)",
      val: new Cell({ expr: `ReverseDcfBoundaries["clearing_wacc", "val"]` }),
    },
    format: "percentage",
    decimals: 2,
  })
  clearSummary.addRow("cy_29", {
    cells: {
      metric: "FY29E Econ. FCFF / Spot EV",
      val: new Cell({ expr: `CashYieldTest["econ_fcff_yield_ev", "2029E"]` }),
    },
    format: "percentage",
    decimals: 2,
  })
  clearSummary.addRow("cy_32", {
    cells: {
      metric: "FY32E Econ. FCFF / Spot EV",
      val: new Cell({ expr: `CashYieldTest["econ_fcff_yield_ev", "2032E"]` }),
    },
    format: "percentage",
    decimals: 2,
  })
  clearSummary.addRow("ust_10y", {
    cells: {
      metric: "10Y US Treasury benchmark",
      val: new Cell({ expr: `WaccBuild["rf_rate", "val"]` }),
    },
    format: "percentage",
    decimals: 2,
  })

  const mkt = sheet.addTable(
    "MarketSnapshot",
    "Market Snapshot & Street Benchmarks",
    {
      subtitle: [
        "($M, except $/sh) | As of Nov 20, 2026",
        "Yahoo Finance, StockAnalysis & agencies",
      ],
    }
  )
  mkt.addColumn("metric", { role: "descriptor", headers: ["Market metric"] })
  mkt.addColumn("val", { headers: ["Spot"], style: "bold" })

  mkt.addRow("spot_price", {
    cells: {
      metric: "Closing share price (Nov 20, 2026)",
      val: market.baSpot,
    },
    format: "currency",
    decimals: 2,
  })
  mkt.addRow("high_52w", {
    cells: {
      metric: "52-week high (Jan 23, 2026)",
      val: market.ba52wHigh,
    },
    format: "currency",
    decimals: 2,
  })
  mkt.addRow("low_52w", {
    cells: {
      metric: "52-week low (Nov 20, 2026)",
      val: market.ba52wLow,
    },
    format: "currency",
    decimals: 2,
  })
  mkt.addRow("ba_prev_yr_close", {
    cells: {
      metric: "BA YE2025 close (Dec 31, 2025)",
      val: market.baCloseYtdBase,
    },
    format: "currency",
    decimals: 2,
  })
  mkt.addRow("ytd_return", {
    cells: {
      metric: "BA YTD price return vs. YE25",
      val: new Cell({
        expr: `@table["spot_price", "val"] / @table["ba_prev_yr_close", "val"] - 1`,
      }),
    },
    format: "percentage",
    decimals: 1,
  })
  mkt.addRow("spx_spot", {
    cells: {
      metric: "S&P 500 close (Nov 20, 2026)",
      val: market.spxSpot,
    },
    format: "number",
    decimals: 2,
  })
  mkt.addRow("spx_prev_yr_close", {
    cells: {
      metric: "S&P 500 YE2025 close",
      val: market.spxCloseYtdBase,
    },
    format: "number",
    decimals: 2,
  })
  mkt.addRow("spx_ytd_return", {
    cells: {
      metric: "S&P 500 YTD price return",
      val: new Cell({
        expr: `@table["spx_spot", "val"] / @table["spx_prev_yr_close", "val"] - 1`,
      }),
    },
    format: "percentage",
    decimals: 1,
  })
  mkt.addRow("ba_pra_spot_shares", {
    cells: {
      metric: "BA-PRA converted sh. at spot (M)",
      val: new Cell({
        expr: `IF(@table["spot_price", "val"] <= EvToEquityBridge["collar_p_low", "val"], EvToEquityBridge["collar_s_max", "val"], IF(@table["spot_price", "val"] >= EvToEquityBridge["collar_p_high", "val"], EvToEquityBridge["collar_s_min", "val"], EvToEquityBridge["pref_face_value", "val"] / @table["spot_price", "val"]))`,
      }),
    },
    format: "number",
    decimals: 3,
  })
  mkt.addRow("spirit_exch_spot_shares", {
    cells: {
      metric: "Spirit 3.25% Exch. TSM sh. (M)",
      val: new Cell({
        expr: `MAX(0, SecurityValuationInputs["spirit_exch_underlying_shares", "val"] * (1 - SecurityValuationInputs["spirit_exch_strike", "val"] / @table["spot_price", "val"]))`,
      }),
    },
    format: "number",
    decimals: 3,
  })
  mkt.addRow("spot_diluted_shares", {
    cells: {
      metric: "Spot diluted shares (M)",
      val: new Cell({
        expr: `EvToEquityBridge["s_base", "val"] + @table["ba_pra_spot_shares", "val"] + @table["spirit_exch_spot_shares", "val"]`,
      }),
    },
    format: "number",
    decimals: 3,
  })
  mkt.addRow("mkt_cap_diluted", {
    cells: {
      metric: "Diluted market cap ($M)",
      val: new Cell({
        expr: `@table["spot_price", "val"] * @table["spot_diluted_shares", "val"]`,
      }),
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  mkt.addRow("spot_ev", {
    cells: {
      metric: "Spot Enterprise Value (Nov 20)",
      val: new Cell({
        expr: `@table["mkt_cap_diluted", "val"] - EvToEquityBridge["net_ev_bridge", "val"]`,
        note: "US GAAP operating-rent basis: Diluted Market Cap plus Sep 30 Net Debt, After-Tax Pension/OPEB, NCI, and PV of 5 BA-PRA dividends (ex-operating leases).",
      }),
    },
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  mkt.addRow("spot_ev_sep30", {
    cells: {
      metric: "Spot EV at Sep 30 anchor ($M)",
      val: new Cell({
        expr: `@table["mkt_cap_diluted", "val"] / EvToEquityBridge["roll_fwd_factor", "val"] - EvToEquityBridge["net_ev_bridge", "val"]`,
        note: "Discounts Nov 20 Spot Market Cap 51 days back to Sep 30, 2026 at active Cost of Equity (Ke) before adding Sep 30 net debt and debt-like items.",
      }),
    },
    format: "currency",
    decimals: 0,
  })
  mkt.addRow("backlog_q326", {
    cells: {
      metric: "Total firm backlog (Q3 26A, $M)",
      val: ba.backlogTotalQ326,
    },
    format: "currency",
    decimals: 0,
  })
  mkt.addRow("t10yie", {
    cells: {
      metric: "10Y US breakeven inflation",
      val: market.t10yie,
    },
    format: "percentage",
    decimals: 2,
  })
  mkt.addRow("street_pt_avg", {
    cells: {
      metric: "Street 12M price target (avg)",
      val: market.baPtAvgSa,
    },
    format: "currency",
    decimals: 2,
  })
  mkt.addRow("street_pt_low", {
    cells: {
      metric: "Street 12M price target (low)",
      val: market.baPtLowSa,
    },
    format: "currency",
    decimals: 2,
  })
  mkt.addRow("street_pt_high", {
    cells: {
      metric: "Street 12M price target (high)",
      val: market.baPtHighSa,
    },
    format: "currency",
    decimals: 2,
  })
  mkt.addRow("street_pt_upside", {
    cells: {
      metric: "Street target return vs. spot",
      val: new Cell({
        expr: `@table["street_pt_avg", "val"] / @table["spot_price", "val"] - 1`,
      }),
    },
    format: "percentage",
    decimals: 1,
  })
  mkt.addRow("street_strong_buy", {
    cells: {
      metric: "Street Strong Buy ratings",
      val: market.baStrongBuySa,
    },
    format: "integer",
  })
  mkt.addRow("street_buy", {
    cells: {
      metric: "Street Buy ratings",
      val: market.baBuySa,
    },
    format: "integer",
  })
  mkt.addRow("street_buy_count", {
    cells: {
      metric: "Street Buy / Strong Buy ratings",
      val: new Cell({
        expr: `@table["street_strong_buy", "val"] + @table["street_buy", "val"]`,
      }),
    },
    format: "integer",
  })

  // =========================================================================
  // BAND 2: ValuationSummary (Side-by-Side Downside / Base / Upside + Live Active)
  // =========================================================================
  const vs = sheet.addTable(
    "ValuationSummary",
    "Executive Valuation & Operating Scenario Summary",
    {
      subtitle: [
        "($M, except per-share data and shares in M)",
        "Downside, Base, and Upside columns are static snapshots; Active column reflects the selected scenario",
      ],
    }
  )
  vs.addColumn("metric", { role: "descriptor", headers: ["Valuation / KPI"] })
  vs.addColumn("downside", {
    group: "Scenario Comparison",
    headers: ["Downside"],
  })
  vs.addColumn("base", {
    group: "Scenario Comparison",
    headers: ["Base"],
    style: "bold",
  })
  vs.addColumn("upside", { group: "Scenario Comparison", headers: ["Upside"] })
  vs.addColumn("up_minus_down", {
    group: "Scenario Comparison",
    headers: ["Up − Down"],
  })
  vs.addColumn("active", {
    group: "Active Case",
    headers: ["Active"],
    style: "bold",
    shade: "muted",
  })
  vs.addColumn("vs_base", {
    group: "Active Case",
    headers: ["Act − Base"],
  })

  const addSummaryRow = (
    id: string,
    label: string,
    key: keyof ScenarioValuationSnapshot,
    activeExpr: string,
    opts: {
      format: "currency" | "percentage" | "multiple" | "number"
      decimals: number
      style?: "data" | "bold" | "subtotal" | "total"
      highlight?: boolean
    }
  ): void => {
    vs.addRow(id, {
      cells: {
        metric: label,
        downside: snap.downside[key],
        base: snap.base[key],
        upside: snap.upside[key],
        up_minus_down: new Cell({
          expr: `@table[@row, "upside"] - @table[@row, "downside"]`,
        }),
        active: new Cell({ expr: activeExpr }),
        vs_base: new Cell({
          expr: `@table[@row, "active"] - @table[@row, "base"]`,
        }),
      },
      format: opts.format,
      decimals: opts.decimals,
      ...(opts.style ? { style: opts.style } : {}),
      ...(opts.highlight ? { highlight: true } : {}),
    })
  }

  vs.addSectionHeader("Primary Unlevered Economic DCF & SOTP valuation")
  addSummaryRow(
    "wacc",
    "Weighted average cost of capital",
    "wacc",
    `WaccBuild["wacc", "val"]`,
    {
      format: "percentage",
      decimals: 2,
    }
  )
  addSummaryRow(
    "pv_explicit",
    "PV of explicit FCFF (Sep 30, 2026)",
    "pvExplicit",
    `EvToEquityBridge["pv_explicit", "val"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "pv_terminal",
    "PV of terminal value (Sep 30, 2026)",
    "pvTerminal",
    `EvToEquityBridge["pv_terminal", "val"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "pv_post_nol",
    "PV of post-FY32E NOL runoff",
    "pvPostNol",
    `EvToEquityBridge["pv_post_terminal_nol", "val"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "ev_anchor",
    "Implied Enterprise Value (Sep 30)",
    "evAnchor",
    `EvToEquityBridge["ev_anchor", "val"]`,
    { format: "currency", decimals: 0, style: "subtotal" }
  )
  addSummaryRow(
    "tv_pct_ev",
    "Terminal value % of Sep 30 EV",
    "tvPctEv",
    `EvToEquityBridge["tv_pct_ev", "val"]`,
    { format: "percentage", decimals: 1 }
  )
  addSummaryRow(
    "implied_ev",
    "Implied Enterprise Value (Nov 20)",
    "impliedEv",
    `EvToEquityBridge["implied_ev", "val"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "implied_equity",
    "Implied Equity Value (Nov 20)",
    "impliedEquityPre",
    `EvToEquityBridge["implied_equity_pre", "val"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "ba_pra_shares",
    "Implied BA-PRA converted shares (M)",
    "baPraShares",
    `EvToEquityBridge["ba_pra_converted_shares", "val"]`,
    { format: "number", decimals: 2 }
  )
  addSummaryRow(
    "diluted_shares",
    "Valuation-date diluted shares (M)",
    "totalDilutedShares",
    `EvToEquityBridge["total_diluted_shares", "val"]`,
    { format: "number", decimals: 2 }
  )
  addSummaryRow(
    "implied_price",
    "Implied DCF share price ($/sh)",
    "impliedPrice",
    `EvToEquityBridge["implied_price", "val"]`,
    { format: "currency", decimals: 2, style: "total", highlight: true }
  )
  addSummaryRow(
    "implied_return",
    "Implied return vs. $155.89 spot",
    "impliedReturnPct",
    `EvToEquityBridge["implied_return_pct", "val"]`,
    { format: "percentage", decimals: 1, style: "bold" }
  )
  addSummaryRow(
    "exit_ev_ebitda",
    "Implied exit EV / FY32E EBITDA",
    "exitEvEbitda",
    `EvToEquityBridge["implied_exit_ev_ebitda", "val"]`,
    { format: "multiple", decimals: 1 }
  )
  addSummaryRow(
    "sotp_price",
    "Discounted FY29E SOTP price ($/sh)",
    "sotpPrice",
    `SotpValuation["sotp_price", "value"]`,
    { format: "currency", decimals: 2, style: "bold" }
  )

  vs.addRowGutter()
  vs.addSectionHeader("Key operating, return & credit diagnostics")
  addSummaryRow(
    "rev_32",
    "FY2032E consolidated revenue ($M)",
    "revFy32e",
    `IncomeStatement["revenue_total", "2032E"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "ebit_32",
    "FY2032E consolidated EBIT ($M)",
    "ebitFy32e",
    `IncomeStatement["operating_income", "2032E"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "ebit_mgn_32",
    "FY2032E consolidated EBIT margin",
    "ebitMarginFy32e",
    `SegmentOperatingBuild["margin_consol", "2032E"]`,
    { format: "percentage", decimals: 1 }
  )
  addSummaryRow(
    "fcff_32",
    "FY2032E Economic FCFF ($M)",
    "econFcffFy32e",
    `DcfSchedule["economic_fcff", "2032E"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "eps_27",
    "FY2027E GAAP diluted EPS ($/sh)",
    "epsFy27e",
    `IncomeStatement["eps_diluted", "2027E"]`,
    { format: "currency", decimals: 2 }
  )
  addSummaryRow(
    "eps_29",
    "FY2029E GAAP diluted EPS ($/sh)",
    "epsFy29e",
    `IncomeStatement["eps_diluted", "2029E"]`,
    { format: "currency", decimals: 2 }
  )
  addSummaryRow(
    "roic_32",
    "FY2032E ROIC (incl. goodwill)",
    "roicFy32e",
    `InvestedCapitalRoic["roic_incl_gw", "2032E"]`,
    { format: "percentage", decimals: 1 }
  )
  addSummaryRow(
    "net_debt_32",
    "FY2032E net carrying debt ($M)",
    "netDebtFy32e",
    `DebtLiquiditySchedule["net_debt_carrying", "2032E"]`,
    { format: "currency", decimals: 0 }
  )
  addSummaryRow(
    "min_liq_headroom",
    "Min liquidity headroom vs. $5.0B",
    "minLiquidityHeadroom",
    `MIN(DebtLiquiditySchedule["liquidity_headroom", "2026E".."2032E"])`,
    { format: "currency", decimals: 0 }
  )

  // =========================================================================
  // BAND 3: ConsensusBridge (Active Model vs. Open Street Consensus FY26E–FY29E)
  // =========================================================================
  const cb = sheet.addTable(
    "ConsensusBridge",
    "Model vs. Street Consensus Bridge (FY2026E – FY2029E)",
    {
      subtitle: [
        "($M, except $/sh) | Model projections vs. consensus as of November 20, 2026",
        "Sources: StockAnalysis (Rev, EBIT, FCF, FY26–27E EPS), Nasdaq/Zacks (FY26–29E EPS), Yahoo Finance",
      ],
    }
  )
  cb.addColumn("metric", { role: "descriptor", headers: ["Benchmark"] })
  cb.addColumn("2026E", { headers: ["FY26E"] })
  cb.addColumn("2027E", { headers: ["FY27E"] })
  cb.addColumn("2028E", { headers: ["FY28E"] })
  cb.addColumn("2029E", { headers: ["FY29E"] })
  cb.addColumn("notes", { role: "descriptor", headers: ["Notes"] })

  cb.addSectionHeader("Revenue ($M)")
  cb.addRow("rev_model", {
    cells: { metric: "Active model revenue", notes: null },
    expr: `IncomeStatement["revenue_total", @col]`,
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  cb.addRow("rev_cons", {
    cells: {
      metric: "Consensus revenue (StockAnalysis)",
      "2026E": market.baRevConsFy26e,
      "2027E": market.baRevConsFy27e,
      "2028E": null,
      "2029E": null,
      notes: "FY28–29E unavailable",
    },
    format: "currency",
    decimals: 0,
  })
  cb.addRow("rev_diff_pct", {
    cells: {
      metric: "Model vs. consensus (%)",
      "2026E": new Cell({
        expr: `@table["rev_model", "2026E"] / @table["rev_cons", "2026E"] - 1`,
      }),
      "2027E": new Cell({
        expr: `@table["rev_model", "2027E"] / @table["rev_cons", "2027E"] - 1`,
      }),
      "2028E": null,
      "2029E": null,
      notes: null,
    },
    format: "percentage",
    decimals: 1,
  })

  cb.addRowGutter()
  cb.addSectionHeader("Operating income & headline FCF ($M)")
  cb.addRow("ebit_model", {
    cells: { metric: "Active model consolidated EBIT", notes: null },
    expr: `IncomeStatement["operating_income", @col]`,
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  cb.addRow("ebit_cons", {
    cells: {
      metric: "Consensus EBIT (StockAnalysis)",
      "2026E": market.baEbitConsFy26e,
      "2027E": null,
      "2028E": null,
      "2029E": null,
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  cb.addRow("fcf_model", {
    cells: {
      metric: "Model headline FCF (OCF + CapEx)",
      notes: "9M26A incl. DOJ/tariff",
    },
    expr: `CashFlowStatement["headline_fcf", @col]`,
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  cb.addRow("fcf_cons", {
    cells: {
      metric: "Consensus FCF (StockAnalysis)",
      "2026E": market.baFcfConsFy26e,
      "2027E": null,
      "2028E": null,
      "2029E": null,
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })

  cb.addRowGutter()
  cb.addSectionHeader("Diluted EPS ($/sh) & 90-day revision track")
  cb.addRow("eps_model", {
    cells: {
      metric: "Model GAAP diluted EPS (VA)",
      notes: "ASC 740 VA cash ETR",
    },
    expr: `IncomeStatement["eps_diluted", @col]`,
    format: "currency",
    decimals: 2,
    style: "bold",
  })
  cb.addRow("eps_norm_tax", {
    cells: {
      metric: "Model 25%-tax normalized EPS",
      "2026E": null,
      "2027E": new Cell({
        expr: `(IncomeStatement["pretax_income", "2027E"] - MAX(0, IncomeStatement["pretax_income", "2027E"]) * WaccBuild["tax_rate", "val"] - IncomeStatement["net_income_nci", "2027E"] - IncomeStatement["pref_dividends", "2027E"]) / ShareCountSchedule["wa_shares_diluted", "2027E"]`,
      }),
      "2028E": new Cell({
        expr: `(IncomeStatement["pretax_income", "2028E"] - MAX(0, IncomeStatement["pretax_income", "2028E"]) * WaccBuild["tax_rate", "val"] - IncomeStatement["net_income_nci", "2028E"] - IncomeStatement["pref_dividends", "2028E"]) / ShareCountSchedule["wa_shares_diluted", "2028E"]`,
      }),
      "2029E": new Cell({
        expr: `(IncomeStatement["pretax_income", "2029E"] - MAX(0, IncomeStatement["pretax_income", "2029E"]) * WaccBuild["tax_rate", "val"] - IncomeStatement["net_income_nci", "2029E"] - IncomeStatement["pref_dividends", "2029E"]) / ShareCountSchedule["wa_shares_diluted", "2029E"]`,
      }),
      notes: "25% tax-normalized",
    },
    format: "currency",
    decimals: 2,
  })
  cb.addRow("eps_zacks", {
    cells: {
      metric: "Consensus EPS (Nasdaq / Zacks)",
      "2026E": market.baZacksEpsFy26e,
      "2027E": market.baZacksEpsFy27e,
      "2028E": market.baZacksEpsFy28e,
      "2029E": market.baZacksEpsFy29e,
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  cb.addRow("eps_sa_adj", {
    cells: {
      metric: "Consensus adj. EPS (StockAnalysis)",
      "2026E": market.baEpsAdjConsFy26e,
      "2027E": market.baEpsAdjConsFy27e,
      "2028E": null,
      "2029E": null,
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  cb.addRow("eps_vs_zacks", {
    cells: { metric: "Model GAAP EPS minus Zacks ($/sh)", notes: null },
    expr: `@table["eps_model", @col] - @table["eps_zacks", @col]`,
    format: "currency",
    decimals: 2,
  })
  cb.addRow("eps_vs_zacks_norm", {
    cells: {
      metric: "25%-tax EPS minus Zacks ($/sh)",
      "2026E": null,
      "2027E": new Cell({
        expr: `@table["eps_norm_tax", "2027E"] - @table["eps_zacks", "2027E"]`,
      }),
      "2028E": new Cell({
        expr: `@table["eps_norm_tax", "2028E"] - @table["eps_zacks", "2028E"]`,
      }),
      "2029E": new Cell({
        expr: `@table["eps_norm_tax", "2029E"] - @table["eps_zacks", "2029E"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  cb.addRow("eps_90d_ago", {
    cells: {
      metric: "Yahoo FY27E EPS — 90 days prior",
      "2026E": null,
      "2027E": market.baYahooEps90dAgoFy27e,
      "2028E": null,
      "2029E": null,
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  cb.addRow("eps_curr_yahoo", {
    cells: {
      metric: "Yahoo FY27E EPS — current consensus",
      "2026E": null,
      "2027E": market.baYahooEpsCurrFy27e,
      "2028E": null,
      "2029E": null,
      notes: null,
    },
    format: "currency",
    decimals: 2,
  })
  cb.addRow("eps_90d_cut", {
    cells: {
      metric: "90-day FY27E EPS revision cut (%)",
      "2026E": null,
      "2027E": new Cell({
        expr: `@table["eps_curr_yahoo", "2027E"] / @table["eps_90d_ago", "2027E"] - 1`,
      }),
      "2028E": null,
      "2029E": null,
      notes: "90-day estimate cut",
    },
    format: "percentage",
    decimals: 1,
  })

  // =========================================================================
  // BAND 4: ScenarioAttribution (EV Variance & Enterprise-to-Equity Return Walk)
  // =========================================================================
  const attr = sheet.addTable(
    "ScenarioAttribution",
    "Scenario Variance Attribution & Enterprise-to-Per-Share Return Walk",
    {
      subtitle: [
        "Enterprise value variance vs. Base (operating cash flows vs. discount-rate & terminal return effects)",
        "Enterprise-to-per-share return bridge from Nov 20, 2026 spot ($155.89/sh)",
      ],
    }
  )
  attr.addColumn("step", { role: "descriptor", headers: ["Attribution step"] })
  attr.addColumn("val", { headers: ["Active"], style: "bold" })
  attr.addColumn("notes", { role: "descriptor", headers: ["Mechanism"] })

  const baseWaccRef = `ValuationSummary["wacc", "base"]`
  const baseGRef = `ScalarDrivers["terminalGrowth", "base"]`
  const baseRonicRef = `ScalarDrivers["terminalRonic", "base"]`

  attr.addSectionHeader(
    "1. Enterprise value variance attribution (Sep 30 EV: Active vs. Base)"
  )
  attr.addRow("base_ev", {
    cells: {
      step: "Base Sep 30 Enterprise Value ($M)",
      val: new Cell({ expr: `ValuationSummary["ev_anchor", "base"]` }),
      notes: "Base case Sep 30 Enterprise Value anchor",
    },
    format: "currency",
    decimals: 0,
  })
  attr.addRow("active_tv_base_params", {
    cells: {
      step: "Active TV at Base WACC / g / RONIC",
      val: new Cell({
        expr: `IF(${baseWaccRef} > ${baseGRef}, DcfSchedule["nopat", "2032E"] * (1 + ${baseGRef}) * (1 - ${baseGRef} / ${baseRonicRef}) / (${baseWaccRef} - ${baseGRef}), NA())`,
      }),
      notes: "Active FY32E NOPAT valued at Base WACC, g & RONIC",
    },
    format: "currency",
    decimals: 0,
  })
  attr.addRow("active_ops_base_wacc_ev", {
    cells: {
      step: "Active ops at Base WACC & TV",
      val: new Cell({
        expr: `SUMPRODUCT(DcfSchedule["economic_fcff", "Q4_26E".."2032E"], DcfSchedule["df_at_base_wacc", "Q4_26E".."2032E"]) + SUMPRODUCT(PostTerminalNolRunoff["nol_shield", "2033E".."2037E"], PostTerminalNolRunoff["df_at_base_wacc", "2033E".."2037E"]) + @table["active_tv_base_params", "val"] * DcfSchedule["df_at_base_wacc", "Terminal"]`,
      }),
      notes: "Active explicit FCFF, post-NOL & TV at Base WACC",
    },
    format: "currency",
    decimals: 0,
  })
  attr.addRow("ev_delta_ops", {
    cells: {
      step: "(+) Operating CF delta (Base WACC)",
      val: new Cell({
        expr: `@table["active_ops_base_wacc_ev", "val"] - @table["base_ev", "val"]`,
      }),
      notes: "Operating cash flow & NOPAT path variance vs. Base",
    },
    format: "currency",
    decimals: 0,
  })
  attr.addRow("ev_delta_params", {
    cells: {
      step: "(+) WACC & terminal RONIC residual",
      val: new Cell({
        expr: `EvToEquityBridge["ev_anchor", "val"] - @table["active_ops_base_wacc_ev", "val"]`,
      }),
      notes: "Discount-rate (WACC) & terminal RONIC impact",
    },
    format: "currency",
    decimals: 0,
  })
  attr.addRow("active_ev_reconciled", {
    cells: {
      step: "(=) Active Sep 30 EV ($M)",
      val: new Cell({
        expr: `@table["base_ev", "val"] + @table["ev_delta_ops", "val"] + @table["ev_delta_params", "val"]`,
      }),
      notes: "Reconciled Active Sep 30 Enterprise Value",
    },
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  attr.addRow("ev_attr_check", {
    cells: {
      step: "EV variance reconciliation check",
      val: new Cell({
        expr: `@table["active_ev_reconciled", "val"] - EvToEquityBridge["ev_anchor", "val"]`,
      }),
      notes: "Reconciliation check (must equal zero)",
    },
    format: "currency",
    decimals: 4,
  })

  attr.addRowGutter()
  attr.addSectionHeader(
    "2. Enterprise-to-per-share return walk (Active vs. Spot $155.89)"
  )
  attr.addRow("ev_return_pct", {
    cells: {
      step: "Enterprise Value return vs. spot",
      val: new Cell({
        expr: `EvToEquityBridge["implied_ev", "val"] / MarketSnapshot["spot_ev", "val"] - 1`,
      }),
      notes: "Implied Nov 20 EV vs. Nov 20 Spot Enterprise Value",
    },
    format: "percentage",
    decimals: 2,
  })
  attr.addRow("leverage_effect_pct", {
    cells: {
      step: "(+) Net debt & pension leverage",
      val: new Cell({
        expr: `(EvToEquityBridge["implied_equity_pre", "val"] / MarketSnapshot["mkt_cap_diluted", "val"] - 1) - @table["ev_return_pct", "val"]`,
      }),
      notes: "Amplification from net debt, pension, NCI & pref divs",
    },
    format: "percentage",
    decimals: 2,
  })
  attr.addRow("collar_dilution_effect_pct", {
    cells: {
      step: "(+) BA-PRA collar / share effect",
      val: new Cell({
        expr: `(EvToEquityBridge["implied_price", "val"] / MarketSnapshot["spot_price", "val"] - 1) - (EvToEquityBridge["implied_equity_pre", "val"] / MarketSnapshot["mkt_cap_diluted", "val"] - 1)`,
      }),
      notes: "BA-PRA conversion collar & Spirit exchangeable impact",
    },
    format: "percentage",
    decimals: 2,
  })
  attr.addRow("total_price_return_pct", {
    cells: {
      step: "(=) Implied per-share return (%)",
      val: new Cell({
        expr: `@table["ev_return_pct", "val"] + @table["leverage_effect_pct", "val"] + @table["collar_dilution_effect_pct", "val"]`,
      }),
      notes: "Reconciled implied per-share return vs. $155.89 spot",
    },
    format: "percentage",
    decimals: 2,
    style: "total",
  })
  attr.addRow("return_walk_check", {
    cells: {
      step: "Return attribution check",
      val: new Cell({
        expr: `@table["total_price_return_pct", "val"] - EvToEquityBridge["implied_return_pct", "val"]`,
      }),
      notes: "Reconciliation check (must equal zero)",
    },
    format: "percentage",
    decimals: 4,
  })

  // =========================================================================
  // BAND 5: SummarySensitivity (Implied Share Price Sensitivity Matrix)
  // =========================================================================
  const sens = sheet.addTable(
    "SummarySensitivity",
    "Implied Share Price Sensitivity — WACC vs. FY2032E EBIT Margin ($/sh)",
    {
      subtitle:
        "Nov 20, 2026 spot = $155.89/sh | Reflects full EV-to-equity bridge, BA-PRA collar & Spirit dilution",
    }
  )
  sens.addColumn("wacc_lbl", {
    role: "descriptor",
    headers: ["WACC \\ Margin"],
  })
  for (let j = 0; j < MARGIN_COL_HEADERS.length; j++) {
    sens.addColumn(`m_${j}`, {
      headers: [MARGIN_COL_HEADERS[j]!],
      format: "currency",
      decimals: 2,
    })
  }
  for (let i = 0; i < WACC_ROW_LABELS.length; i++) {
    const rId = `w_${i}`
    sens.addRow(rId, {
      cells: { wacc_lbl: WACC_ROW_LABELS[i]! },
      expr: `ReverseDcfMarginGrid["${rId}", @col]`,
      ...(i === 3 ? { style: "bold" } : {}),
    })
  }

  sheet.setBands([
    { lanes: [{ tables: [ctrl, clearSummary] }, { tables: [mkt] }] },
    { lanes: [vs], pageBreakBefore: true },
    { lanes: [cb], pageBreakBefore: true },
    { lanes: [attr], pageBreakBefore: true },
    sens,
  ])
}
