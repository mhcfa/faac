import { Cell, type FormatPreset, type Sheet, type Table } from "f8-engine"
import { wrapSubtitle, type ScenarioKey } from "../timeline.ts"

export interface ScenarioOutputSnapshot {
  readonly spotPrice: number
  readonly dcfGordonPrice: number
  readonly upsideVsSpot: number
  readonly dcfExitMultPrice: number
  readonly consensusTarget: number
  readonly operatingEv: number
  readonly impliedEquityValue: number
  readonly pfDilutedShares: number
  readonly rfRate: number
  readonly beta5yM: number
  readonly wacc: number
  readonly wacc2yW: number
  readonly terminalGrowth: number
  readonly fwdFy28FcffYield: number
  readonly spotFy28FcffYield: number
  readonly netNonOpBridge: number
  readonly stratInvNet: number
  readonly revFy27: number
  readonly revFy30: number
  readonly revFy31: number
  readonly revCagr26To31: number
  readonly gaapOmFy27: number
  readonly gaapOmFy31: number
  readonly nonGaapOmFy31: number
  readonly fcffFy27: number
  readonly fcffFy31: number
  readonly roicFy31: number
}

export type AllScenarioSnapshots = Readonly<
  Record<ScenarioKey, ScenarioOutputSnapshot>
>

export interface ExecutiveSummaryTables {
  readonly executiveDashboard: Table
  readonly valuationFootballField: Table
}

export function buildExecutiveSummarySheet(
  sheet: Sheet,
  snapshots: AllScenarioSnapshots
): ExecutiveSummaryTables {
  const executiveDashboard = sheet.addTable(
    "ExecutiveDashboard",
    "Salesforce, Inc. (NYSE: CRM) — Executive Valuation & Operating Summary",
    {
      subtitle: wrapSubtitle(
        [
          "($ in Millions, except per-share, shares in Millions, and percentages) | Analysis Date: November 18, 2026",
          "Active Case recalculates live via Scenario Control; Downside, Base, and Upside columns are static scenario snapshots.",
        ],
        118
      ),
    }
  )
  executiveDashboard.addColumn("item", {
    role: "descriptor",
    header: "Key metric",
  })
  executiveDashboard.addColumn("active", {
    headers: ["Active", "Case"],
    style: "bold",
    shade: "muted",
  })
  executiveDashboard.addColumn("downside", {
    headers: ["Downside", "Case"],
    group: "Scenario Benchmarks",
  })
  executiveDashboard.addColumn("base", {
    headers: ["Base", "Case"],
    group: "Scenario Benchmarks",
  })
  executiveDashboard.addColumn("upside", {
    headers: ["Upside", "Case"],
    group: "Scenario Benchmarks",
  })
  executiveDashboard.addColumn("delta_down", {
    headers: ["Downside", "vs. Base"],
    group: "Scenario Spreads",
  })
  executiveDashboard.addColumn("delta_up", {
    headers: ["Upside", "vs. Base"],
    group: "Scenario Spreads",
  })

  const addSummaryRow = (
    id: string,
    label: string,
    activeExpr: string,
    field: keyof ScenarioOutputSnapshot,
    format: FormatPreset,
    decimals: number,
    opts?: {
      readonly style?: "subtotal" | "total"
      readonly shade?: "muted" | "alt"
    }
  ): void => {
    executiveDashboard.addRow(id, {
      cells: {
        item: label,
        active: new Cell({ expr: activeExpr }),
        downside: snapshots.downside[field],
        base: snapshots.base[field],
        upside: snapshots.upside[field],
        delta_down: new Cell({
          expr: '@table[@row, "downside"] - @table[@row, "base"]',
        }),
        delta_up: new Cell({
          expr: '@table[@row, "upside"] - @table[@row, "base"]',
        }),
      },
      format,
      decimals,
      ...(opts?.style !== undefined ? { style: opts.style } : {}),
      ...(opts?.shade !== undefined ? { shade: opts.shade } : {}),
    })
  }

  executiveDashboard.addSectionHeader("Valuation summary (as of Nov 18, 2026)")
  addSummaryRow(
    "spot_price",
    "Current share price (Nov 18, 2026 close)",
    'BetaSummaryTable["CRM", "spot_px"]',
    "spotPrice",
    "currency",
    2
  )
  addSummaryRow(
    "dcf_gordon_price",
    "Implied share price — Gordon growth DCF",
    'EvToEquityBridge["implied_share_price", "gordon"]',
    "dcfGordonPrice",
    "currency",
    2,
    { style: "total" }
  )
  addSummaryRow(
    "upside_vs_spot",
    "Implied upside / (downside) vs. spot",
    'EvToEquityBridge["upside_downside", "gordon"]',
    "upsideVsSpot",
    "percentage",
    1,
    { style: "subtotal" }
  )
  addSummaryRow(
    "dcf_exit_mult_price",
    "Implied share price — exit multiple check",
    'EvToEquityBridge["implied_share_price", "exit_mult"]',
    "dcfExitMultPrice",
    "currency",
    2
  )
  addSummaryRow(
    "consensus_target",
    "Analyst consensus mean target price",
    'AuditedFootnoteAnchors["crm_target_mean", "val"]',
    "consensusTarget",
    "currency",
    2
  )
  addSummaryRow(
    "operating_ev",
    "Implied operating EV (Nov 18, 2026)",
    'DcfSummaryTable["operating_ev_val_date", "gordon"]',
    "operatingEv",
    "currency",
    0
  )
  addSummaryRow(
    "implied_equity_value",
    "Implied equity value",
    'EvToEquityBridge["implied_equity_value", "gordon"]',
    "impliedEquityValue",
    "currency",
    0
  )
  addSummaryRow(
    "pf_diluted_shares",
    "Pro forma post-ASR diluted shares (M)",
    'EvToEquityBridge["pf_diluted_shares", "gordon"]',
    "pfDilutedShares",
    "number",
    2
  )

  executiveDashboard.addRowGutter()
  executiveDashboard.addSectionHeader("Cost of capital & non-operating bridge")
  addSummaryRow(
    "rf_rate",
    "US 10-year Treasury yield (DGS10)",
    'WaccSchedule["rf", "primary"]',
    "rfRate",
    "percentage",
    2
  )
  addSummaryRow(
    "beta_5y_m",
    "Relevered 5Y-M equity beta (Hamada)",
    'WaccSchedule["relevered_beta", "primary"]',
    "beta5yM",
    "number",
    3
  )
  addSummaryRow(
    "wacc",
    "Primary WACC (relevered 5Y-M beta)",
    'WaccSchedule["wacc", "primary"]',
    "wacc",
    "percentage",
    2,
    { style: "subtotal" }
  )
  addSummaryRow(
    "wacc_2y_w",
    "Cross-check WACC (relevered 2Y-W beta)",
    'WaccSchedule["wacc", "short_regime"]',
    "wacc2yW",
    "percentage",
    2
  )
  addSummaryRow(
    "terminal_growth",
    "Perpetual terminal growth rate (g)",
    'ScalarDrivers["terminalGrowthRate", "active"]',
    "terminalGrowth",
    "percentage",
    1
  )
  addSummaryRow(
    "fwd_fy28_fcff_yield",
    "FY28E economic FCFF yield on modeled EV",
    'DcfSummaryTable["fwd_fy28_fcff_yield", "gordon"]',
    "fwdFy28FcffYield",
    "percentage",
    2
  )
  addSummaryRow(
    "spot_fy28_fcff_yield",
    "Spot FY28E economic FCFF yield on mkt. EV",
    'DcfSummaryTable["spot_fy28_fcff_yield", "gordon"]',
    "spotFy28FcffYield",
    "percentage",
    2
  )
  addSummaryRow(
    "net_non_op_bridge",
    "BS-date net non-operating EV bridge",
    'EvToEquityBridge["net_non_op_bridge", "gordon"]',
    "netNonOpBridge",
    "currency",
    0
  )
  addSummaryRow(
    "strat_inv_net",
    "After-tax strategic investments value",
    'EvToEquityBridge["plus_strat_inv_net", "gordon"]',
    "stratInvNet",
    "currency",
    0
  )

  executiveDashboard.addRowGutter()
  executiveDashboard.addSectionHeader("5-year operating & cash flow trajectory")
  addSummaryRow(
    "rev_fy27",
    "FY27E total consolidated revenue",
    'IncomeStatement["total_revenue", "FY27E"]',
    "revFy27",
    "currency",
    0
  )
  addSummaryRow(
    "rev_fy30",
    "FY30E total consolidated revenue",
    'IncomeStatement["total_revenue", "FY30E"]',
    "revFy30",
    "currency",
    0
  )
  addSummaryRow(
    "rev_fy31",
    "FY31E total consolidated revenue",
    'IncomeStatement["total_revenue", "FY31E"]',
    "revFy31",
    "currency",
    0
  )
  addSummaryRow(
    "rev_cagr_26_31",
    "FY26A–FY31E consolidated revenue CAGR",
    '(IncomeStatement["total_revenue", "FY31E"] / IncomeStatement["total_revenue", "FY26A"]) ^ (1 / 5) - 1',
    "revCagr26To31",
    "percentage",
    1
  )
  addSummaryRow(
    "gaap_om_fy27",
    "FY27E GAAP operating margin",
    'IncomeStatement["gaap_operating_margin", "FY27E"]',
    "gaapOmFy27",
    "percentage",
    1
  )
  addSummaryRow(
    "gaap_om_fy31",
    "FY31E GAAP operating margin",
    'IncomeStatement["gaap_operating_margin", "FY31E"]',
    "gaapOmFy31",
    "percentage",
    1
  )
  addSummaryRow(
    "nongaap_om_fy31",
    "FY31E Non-GAAP operating margin",
    'IncomeStatement["nongaap_operating_margin", "FY31E"]',
    "nonGaapOmFy31",
    "percentage",
    1
  )
  addSummaryRow(
    "fcff_fy27",
    "FY27E unlevered economic FCFF",
    'QoeAndCashConversion["unlevered_fcff", "FY27E"]',
    "fcffFy27",
    "currency",
    0
  )
  addSummaryRow(
    "fcff_fy31",
    "FY31E unlevered economic FCFF",
    'QoeAndCashConversion["unlevered_fcff", "FY31E"]',
    "fcffFy31",
    "currency",
    0,
    { style: "subtotal" }
  )
  addSummaryRow(
    "roic_fy31",
    "FY31E headline ROIC (incl. goodwill)",
    'InvestedCapitalAndRoic["headline_roic", "FY31E"]',
    "roicFy31",
    "percentage",
    1
  )

  // Table 2: Valuation Methodology Triangulation (Football Field Summary)
  const valuationFootballField = sheet.addTable(
    "ValuationFootballField",
    "Valuation Methodology Triangulation (Implied Price per Share)",
    {
      subtitle: wrapSubtitle(
        "($ per share vs. current market price) | All ranges linked live to valuation and peer comparables schedules",
        116
      ),
      below: executiveDashboard,
    }
  )
  valuationFootballField.addColumn("item", {
    role: "descriptor",
    header: "Valuation methodology",
  })
  valuationFootballField.addColumn("low", {
    headers: ["Low", "($/sh)"],
    format: "currency",
    decimals: 2,
  })
  valuationFootballField.addColumn("mid", {
    headers: ["Mid / Base", "($/sh)"],
    format: "currency",
    decimals: 2,
    style: "bold",
    shade: "muted",
  })
  valuationFootballField.addColumn("high", {
    headers: ["High", "($/sh)"],
    format: "currency",
    decimals: 2,
  })
  valuationFootballField.addColumn("upside_mid", {
    headers: ["Mid vs.", "Spot (%)"],
    format: "percentage",
    decimals: 1,
  })
  valuationFootballField.addColumn("notes", {
    role: "descriptor",
    header: "Basis / Source",
  })

  const addRangeRow = (
    id: string,
    label: string,
    lowExpr: string,
    midExpr: string,
    highExpr: string,
    notes: string,
    style?: "subtotal" | "total"
  ): void => {
    valuationFootballField.addRow(id, {
      cells: {
        item: label,
        low: new Cell({ expr: lowExpr }),
        mid: new Cell({ expr: midExpr }),
        high: new Cell({ expr: highExpr }),
        upside_mid: new Cell({
          expr: '@table[@row, "mid"] / BetaSummaryTable["CRM", "spot_px"] - 1',
        }),
        notes,
      },
      ...(style !== undefined ? { style } : {}),
    })
  }

  addRangeRow(
    "dcf_gordon_sens",
    "Primary Gordon growth DCF (±50 bps WACC & g)",
    'SensitivityWaccVsGrowth["w_p50", "g_m50"]',
    'EvToEquityBridge["implied_share_price", "gordon"]',
    'SensitivityWaccVsGrowth["w_m50", "g_p50"]',
    "±50 bps WACC & g",
    "subtotal"
  )
  addRangeRow(
    "dcf_scenarios",
    "Intrinsic DCF scenario range",
    'ExecutiveDashboard["dcf_gordon_price", "downside"]',
    'ExecutiveDashboard["dcf_gordon_price", "base"]',
    'ExecutiveDashboard["dcf_gordon_price", "upside"]',
    "Downside / Base / Up"
  )
  addRangeRow(
    "dcf_exit_mult",
    "Exit EV / GAAP EBITDA DCF cross-check",
    'ExecutiveDashboard["dcf_exit_mult_price", "downside"]',
    'EvToEquityBridge["implied_share_price", "exit_mult"]',
    'ExecutiveDashboard["dcf_exit_mult_price", "upside"]',
    "FY31E GAAP EBITDA"
  )
  addRangeRow(
    "comps_mature",
    "Mature low-SBC SaaS peer multiples",
    'CompsImpliedValuation["comps_min", "mature_px"]',
    'CompsImpliedValuation["comps_median", "mature_px"]',
    'CompsImpliedValuation["comps_max", "mature_px"]',
    "ADBE & INTU LTM mean"
  )
  addRangeRow(
    "comps_all6",
    "All-6 enterprise cloud peer multiples",
    'CompsImpliedValuation["comps_min", "all6_px"]',
    'CompsImpliedValuation["comps_median", "all6_px"]',
    'CompsImpliedValuation["comps_max", "all6_px"]',
    "6-peer LTM median"
  )
  addRangeRow(
    "street_targets",
    "Sell-side analyst target price range",
    'AuditedFootnoteAnchors["crm_target_low", "val"]',
    'AuditedFootnoteAnchors["crm_target_mean", "val"]',
    'AuditedFootnoteAnchors["crm_target_high", "val"]',
    "Nasdaq / Zacks range",
    "subtotal"
  )

  return {
    executiveDashboard,
    valuationFootballField,
  }
}
