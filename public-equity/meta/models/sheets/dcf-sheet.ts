import { Cell, type Sheet } from "f8-engine"
import type { AuditedModelData } from "../kg-extractors.ts"
import { SCALE_NOTE_USD_M, VALUATION_AS_OF_DATE } from "../scale.ts"
import { FORECAST_PERIODS, addDcfTimelineColumns } from "../timeline.ts"

export const SENS_WACC_ROWS = [
  { id: "w1", rate: 0.09, label: "WACC 9.00%" },
  { id: "w2", rate: 0.0975, label: "WACC 9.75%" },
  { id: "w3", rate: 0.105, label: "WACC 10.50%" },
  { id: "w4", rate: 0.1125, label: "WACC 11.25%" },
  { id: "w5", rate: 0.12, label: "WACC 12.00%" },
] as const

export const SENS_G_COLS = [
  { id: "g1", rate: 0.025, header: "g = 2.5%" },
  { id: "g2", rate: 0.03, header: "g = 3.0%" },
  { id: "g3", rate: 0.035, header: "g = 3.5%" },
  { id: "g4", rate: 0.04, header: "g = 4.0%" },
  { id: "g5", rate: 0.045, header: "g = 4.5%" },
] as const

export const SENS_GROWTH_SHIFTS = [
  { id: "gr1", shift: -0.04, label: "FoA Growth −400 bps" },
  { id: "gr2", shift: -0.02, label: "FoA Growth −200 bps" },
  { id: "gr3", shift: 0.0, label: "FoA Growth +0 bps (Active)" },
  { id: "gr4", shift: 0.02, label: "FoA Growth +200 bps" },
  { id: "gr5", shift: 0.04, label: "FoA Growth +400 bps" },
] as const

export type GrowthShiftRowId = (typeof SENS_GROWTH_SHIFTS)[number]["id"]

export const SENS_CAPEX_COLS = [
  { id: "cx1", termCapex: 0.17, header: "17.0%" },
  { id: "cx2", termCapex: 0.195, header: "19.5%" },
  { id: "cx3", termCapex: 0.22, header: "22.0%" },
  { id: "cx4", termCapex: 0.25, header: "25.0%" },
  { id: "cx5", termCapex: 0.28, header: "28.0%" },
] as const

export type CapexTargetColId = (typeof SENS_CAPEX_COLS)[number]["id"]

export type GrowthCapexEvGrid = Readonly<
  Record<GrowthShiftRowId, Readonly<Record<CapexTargetColId, number>>>
>

export interface ScalarTornadoRow {
  readonly id: string
  readonly label: string
  readonly note: string
  readonly baseEv: number
  readonly basePrice: number
  readonly shockedEv: number
  readonly shockedPrice: number
}

export interface SpotIndifferenceRow {
  readonly id: string
  readonly label: string
  readonly note: string
  readonly baseValue: number
  readonly breakevenValue: number | null
  readonly deltaValue: number | null
}

/**
 * Exact price-consistent EV-to-share-price formula combining Treasury Stock
 * Method unvested RSUs and contractual METAM mandatory convertible preferred
 * conversion terms, factored via live threshold rows on DcfBridge.
 */
export function exactFourRegimePriceExpr(
  evExpr: string,
  tablePrefix = "DcfBridge"
): string {
  const t = tablePrefix
  return (
    `IF(${evExpr} < ${t}["ev_rsu_cutoff", "val"], ` +
    `(${evExpr} + ${t}["net_bridge_ex_mcp", "val"]) / ${t}["shares_max_conv", "val"], ` +
    `IF(${evExpr} < ${t}["ev_lower_cutoff", "val"], ` +
    `(${evExpr} + ${t}["bridge_r2_r4_adj", "val"]) / ${t}["shares_r2_total", "val"], ` +
    `IF(${evExpr} <= ${t}["ev_upper_cutoff", "val"], ` +
    `(${evExpr} + ${t}["bridge_r3_adj", "val"]) / ${t}["shares_r3_total", "val"], ` +
    `(${evExpr} + ${t}["bridge_r2_r4_adj", "val"]) / ${t}["shares_r4_total", "val"])))`
  )
}

export function buildDcfSheet(sheet: Sheet, data: AuditedModelData): void {
  // =========================================================================
  // 1. Left Lane (Cols B..I): Terminal Value & Pro Forma EV-to-Equity Bridge
  // =========================================================================
  const escrowInfra = data.val(
    "leases_and_commitments",
    "restricted_cash_escrow_infra",
    "2026-Q3",
    { entity: "META" }
  )
  const rsuUnvested = data.val(
    "sbc_detail",
    "rsu_unvested_ending",
    "2026-Q3-YTD",
    { entity: "META" }
  )
  const rsuUnrecComp = data.val(
    "sbc_detail",
    "unrecognized_sbc_rsu",
    "2026-Q3",
    { entity: "META" }
  )

  const bridge = sheet.addTable(
    "DcfBridge",
    "Terminal Value & Pro Forma EV-to-Equity Bridge",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Mid-year Gordon Growth TV, fair-value debt, non-op equity & escrow PV",
        "Price-consistent TSM RSU & METAM mandatory convertible dilution",
      ],
    }
  )
  bridge.addColumn("label", {
    role: "descriptor",
    header: "Valuation Bridge Line",
  })
  bridge.addColumn("val", { header: "Value" })
  bridge.addColumn("notes", { role: "descriptor", header: "Notes" })

  bridge.addSectionHeader("Enterprise value & terminal value cross-checks")

  bridge.addRow("pv_explicit_fcff", {
    cells: {
      label: new Cell({ value: "PV of explicit FCFF (Q4 26E–FY31E)" }),
      notes: "41d Q4 26E stub + 5 forecast yrs",
    },
    expr: 'SUM(DcfFcff["pv_fcff", "Q4 26E".."2031E"])',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("terminal_nopat", {
    cells: {
      label: new Cell({ value: "Terminal year NOPAT (FY31E × (1 + g))" }),
      notes: null,
    },
    expr: 'DcfFcff["nopat", "2031E"] * (1 + ScalarDrivers["terminalGrowthRate", "active"])',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("reinvestment_rate", {
    cells: {
      label: new Cell({ value: "Terminal reinvestment rate (g / RONIC)" }),
      notes: "Links perpetuity g to RONIC",
    },
    expr: 'ScalarDrivers["terminalGrowthRate", "active"] / ScalarDrivers["terminalRonic", "active"]',
    format: "percentage",
    decimals: 1,
  })
  bridge.addRow("terminal_fcff", {
    cells: {
      label: new Cell({ value: "Steady-state terminal FCFF" }),
      notes: null,
    },
    expr: '@table["terminal_nopat", "val"] * (1 - @table["reinvestment_rate", "val"])',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("terminal_value", {
    cells: {
      label: new Cell({ value: "Undiscounted terminal value (Gordon Growth)" }),
      notes: "Mid-year adj.; requires WACC > g",
    },
    expr: 'IF(WaccBuild["wacc", "val"] > ScalarDrivers["terminalGrowthRate", "active"], (@table["terminal_fcff", "val"] / (WaccBuild["wacc", "val"] - ScalarDrivers["terminalGrowthRate", "active"])) * ((1 + WaccBuild["wacc", "val"]) ^ (0.5 * ScalarDrivers["midYearDiscountingFlag", "active"])), NA())',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("terminal_disc_factor", {
    cells: {
      label: new Cell({ value: "Terminal discount factor (Dec 31, 2031)" }),
      notes: "Actual/365 from Nov 20, 2026",
    },
    expr: '1 / ((1 + WaccBuild["wacc", "val"]) ^ YEARFRAC(DcfFcff["val_date", "2031E"], DcfFcff["period_end", "2031E"], 3))',
    format: "number",
    decimals: 4,
  })
  bridge.addRow("pv_terminal_value", {
    cells: {
      label: new Cell({ value: "PV of terminal value" }),
      notes: null,
    },
    expr: '@table["terminal_value", "val"] * @table["terminal_disc_factor", "val"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("implied_ev", {
    cells: {
      label: new Cell({ value: "Implied enterprise value (DCF EV)" }),
      notes: null,
    },
    expr: '@table["pv_explicit_fcff", "val"] + @table["pv_terminal_value", "val"]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  bridge.addRow("tv_pct_ev", {
    cells: {
      label: new Cell({ value: "Terminal value % of implied EV" }),
      notes: null,
    },
    expr: '@table["pv_terminal_value", "val"] / @table["implied_ev", "val"]',
    format: "percentage",
    decimals: 1,
  })
  bridge.addRow("implied_exit_ev_ebitda", {
    cells: {
      label: new Cell({ value: "Implied exit TV / FY31E EBITDA" }),
      notes: null,
    },
    expr: 'IF(IncomeStatement["normalized_ebitda", "2031E"] > 0, @table["terminal_value", "val"] / IncomeStatement["normalized_ebitda", "2031E"], NA())',
    format: "multiple",
    decimals: 1,
  })
  bridge.addRow("implied_exit_ev_ebit", {
    cells: {
      label: new Cell({ value: "Implied exit TV / FY31E EBIT" }),
      notes: null,
    },
    expr: 'IF(IncomeStatement["normalized_ebit", "2031E"] > 0, @table["terminal_value", "val"] / IncomeStatement["normalized_ebit", "2031E"], NA())',
    format: "multiple",
    decimals: 1,
  })

  bridge.addRowGutter()
  bridge.addSectionHeader("Pro forma EV-to-equity bridge (Nov 20, 2026)")

  bridge.addRow("q3_unrestricted_cash", {
    cells: {
      label: new Cell({ value: "(+) Unrestricted cash & securities (Q3 26A)" }),
      notes: "Excl. $13.1B restricted cash",
    },
    expr: 'BalanceSheet["total_cash_and_mkt_sec", "Q3 26A"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("post_q3_cash_proceeds", {
    cells: {
      label: new Cell({ value: "(+) Closed Oct–Nov 2026 financing proceeds" }),
      notes: "$15B USD + $10B EUR + $12.5B pref",
    },
    expr: 'PostQ3FinancingRegistry["total_closed_q4_cash", "val"]',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("elapsed_q4_fcff_burn", {
    cells: {
      label: new Cell({ value: "(+/−) Elapsed Q4 26E cash flow (51/92)" }),
      notes: "Bridges Sep 30 cash to Nov 20 date",
    },
    expr: 'DcfFcff["full_period_fcff", "Q4 26E"] * (1 - DcfFcff["stub_factor", "Q4 26E"])',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("non_op_equity_investments", {
    cells: {
      label: new Cell({ value: "(+) Non-op equity investments (ex-DC VIEs)" }),
      notes: "Scale AI, Jio & stakes (carrying)",
    },
    expr: 'InvestedCapitalRoic["non_op_equity_ex_vie", "Q3 26A"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("pv_escrow_release", {
    cells: {
      label: new Cell({ value: "(+) PV of infrastructure escrow ($10.8B)" }),
      notes: "$3.6B/yr 2028–30E disc. 2.75y WACC",
    },
    expr: `${escrowInfra} / ((1 + WaccBuild["wacc", "val"]) ^ 2.75)`,
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("q3_legacy_debt_fv", {
    cells: {
      label: new Cell({ value: "(−) Q3 2026A legacy senior notes (FV)" }),
      notes: "Note 9 FV ($73.3B vs. $83.7B book)",
    },
    expr: '-WaccBuild["q3_legacy_debt_fv", "val"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("post_q3_debt_notes", {
    cells: {
      label: new Cell({ value: "(−) Closed Nov 2026 senior notes (USD+EUR)" }),
      notes: "Nov 5 USD + Nov 12 EUR face value",
    },
    expr: '-PostQ3FinancingRegistry["total_closed_q4_debt", "val"]',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("debt_like_legal_accruals", {
    cells: {
      label: new Cell({ value: "(−) Debt-like accrued legal (Q3 2026A)" }),
      notes: "$11.6B cur. + $8.3B non-cur. (N.8)",
    },
    expr: '-WorkingCapitalSchedule["total_legal_accruals", "Q3 26A"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("pv_mcp_dividends", {
    cells: {
      label: new Cell({ value: "(−) PV of METAM preferred dividends" }),
      notes: "11 qtrs @ 6.50%, disc. at 6.55% Kd",
    },
    expr: '-(PostQ3FinancingRegistry["mcp_base_liq_pref", "val"] * (PostQ3FinancingRegistry["mcp_base_liq_pref", "coupon"] / 4) * (1 - (1 + WaccBuild["kd_pretax", "val"] / 4) ^ (-ScalarDrivers["mcpDividendQuartersRemaining", "active"])) / (WaccBuild["kd_pretax", "val"] / 4))',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("fwd_equity_proceeds", {
    cells: {
      label: new Cell({ value: "(+) Forward equity sale proceeds (46.0M)" }),
      notes: "46.0M sh @ $622.92 (Nov 4, 2026)",
    },
    expr: 'PostQ3FinancingRegistry["fwd_gross_proceeds", "val"]',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("net_bridge_ex_mcp", {
    cells: {
      label: new Cell({ value: "Net EV-to-equity adjustments (pre-METAM)" }),
      notes: null,
    },
    expr: 'SUM(@table["q3_unrestricted_cash".."fwd_equity_proceeds", "val"])',
    format: "currency",
    decimals: 1,
    style: "subtotal",
  })
  bridge.addRow("core_eq_pre_mcp", {
    cells: {
      label: new Cell({ value: "Core equity value (pre-METAM conversion)" }),
      notes: null,
    },
    expr: '@table["implied_ev", "val"] + @table["net_bridge_ex_mcp", "val"]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  bridge.addRowGutter()
  bridge.addSectionHeader("Diluted share count & mandatory convertible payoff")

  bridge.addRow("basic_shares_cover", {
    cells: {
      label: new Cell({ value: "Basic common shares (Oct 16, 2026 cover)" }),
      notes: "Q3 2026 Form 10-Q cover page (M)",
    },
    expr: 'WaccBuild["basic_shares_cover", "val"]',
    format: "number",
    decimals: 2,
  })
  bridge.addRow("fwd_shares", {
    cells: {
      label: new Cell({ value: "(+) Class A forward sale shares (M)" }),
      notes: "Base + exercised over-allotment",
    },
    expr: 'PostQ3FinancingRegistry["fwd_total_shares", "val"]',
    format: "number",
    decimals: 2,
  })
  bridge.addRow("shares_with_fwd", {
    cells: {
      label: new Cell({ value: "Basic + forward sale shares (M)" }),
      notes: null,
    },
    expr: '@table["basic_shares_cover", "val"] + @table["fwd_shares", "val"]',
    format: "number",
    decimals: 2,
  })
  bridge.addRow("rsu_unvested_shares", {
    cells: {
      label: new Cell({ value: "Unvested RSUs outstanding (Q3 26, M)" }),
      val: rsuUnvested,
      notes: "Q3 2026 Form 10-Q Note 11",
    },
    format: "number",
    decimals: 3,
  })
  bridge.addRow("rsu_unrecognized_comp", {
    cells: {
      label: new Cell({ value: "Unrecognized RSU comp. cost (Q3 26, $M)" }),
      val: rsuUnrecComp,
      notes: "Assumed TSM buyback cash (N.11)",
    },
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("rsu_breakeven_px", {
    cells: {
      label: new Cell({ value: "TSM RSU dilution break-even share price" }),
      notes: "Zero RSU dilution below $562.12",
    },
    expr: '@table["rsu_unrecognized_comp", "val"] / @table["rsu_unvested_shares", "val"]',
    format: "currency",
    decimals: 2,
  })
  bridge.addRow("shares_max_conv", {
    cells: {
      label: new Cell({ value: "Basic + fwd + max METAM shares (< $625)" }),
      notes: "20.000M max METAM conv. shares",
    },
    expr: '@table["shares_with_fwd", "val"] + PostQ3FinancingRegistry["mcp_max_shares", "val"]',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("shares_min_conv", {
    cells: {
      label: new Cell({ value: "Basic + fwd + min METAM shares (> $734)" }),
      notes: "17.025M min METAM conv. shares",
    },
    expr: '@table["shares_with_fwd", "val"] + PostQ3FinancingRegistry["mcp_min_shares", "val"]',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("bridge_r2_r4_adj", {
    cells: {
      label: new Cell({
        value: "Equity bridge incl. unrecognized RSU SBC",
        indent: 1,
      }),
      notes: "For P > $562.12 outside band",
    },
    expr: '@table["net_bridge_ex_mcp", "val"] + @table["rsu_unrecognized_comp", "val"]',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("bridge_r3_adj", {
    cells: {
      label: new Cell({
        value: "Fixed-value band bridge (less $12.5B pref)",
        indent: 1,
      }),
      notes: "In $625.00–$734.21 METAM band",
    },
    expr: '@table["bridge_r2_r4_adj", "val"] - PostQ3FinancingRegistry["mcp_base_liq_pref", "val"]',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("shares_r2_total", {
    cells: {
      label: new Cell({
        value: "Diluted shares: max METAM + unvested RSUs",
        indent: 1,
      }),
      notes: "Price band $562.12–$625.00 (M sh)",
    },
    expr: '@table["shares_max_conv", "val"] + @table["rsu_unvested_shares", "val"]',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("shares_r3_total", {
    cells: {
      label: new Cell({
        value: "Diluted shares: basic + fwd + unvested RSUs",
        indent: 1,
      }),
      notes: "Price band $625.00–$734.21 (M sh)",
    },
    expr: '@table["shares_with_fwd", "val"] + @table["rsu_unvested_shares", "val"]',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("shares_r4_total", {
    cells: {
      label: new Cell({
        value: "Diluted shares: min METAM + unvested RSUs",
        indent: 1,
      }),
      notes: "Price band > $734.21 (M sh)",
    },
    expr: '@table["shares_min_conv", "val"] + @table["rsu_unvested_shares", "val"]',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("ev_rsu_cutoff", {
    cells: {
      label: new Cell({ value: "EV threshold: TSM RSU break-even ($562.12)" }),
      notes: null,
    },
    expr: '@table["rsu_breakeven_px", "val"] * @table["shares_max_conv", "val"] - @table["net_bridge_ex_mcp", "val"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("ev_lower_cutoff", {
    cells: {
      label: new Cell({ value: "EV threshold: METAM lower ($625.00)" }),
      notes: null,
    },
    expr: 'PostQ3FinancingRegistry["mcp_lower_threshold", "val"] * @table["shares_r2_total", "val"] - @table["bridge_r2_r4_adj", "val"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("ev_upper_cutoff", {
    cells: {
      label: new Cell({ value: "EV threshold: METAM upper ($734.21)" }),
      notes: null,
    },
    expr: 'PostQ3FinancingRegistry["mcp_upper_threshold", "val"] * @table["shares_r4_total", "val"] - @table["bridge_r2_r4_adj", "val"]',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("implied_share_price", {
    cells: {
      label: new Cell({ value: "Diluted share price (DCF)" }),
      notes: "Price-consistent TSM RSU & METAM",
    },
    expr: exactFourRegimePriceExpr('@table["implied_ev", "val"]', "@table"),
    format: "currency",
    decimals: 2,
    style: "total",
    highlight: true,
  })
  bridge.addRow("rsu_tsm_inc_shares", {
    cells: {
      label: new Cell({ value: "Incremental TSM RSU shares at DCF px (M)" }),
      notes: "Zero below $562.12/sh break-even",
    },
    expr: 'IF(@table["implied_share_price", "val"] > 0, MAX(0, @table["rsu_unvested_shares", "val"] - @table["rsu_unrecognized_comp", "val"] / @table["implied_share_price", "val"]), 0)',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("mcp_cash_claim", {
    cells: {
      label: new Cell({ value: "METAM fixed cash-equivalent claim" }),
      notes: "−$12.5B inside $625–$734.21 band",
    },
    expr: 'IF(AND(@table["implied_ev", "val"] >= @table["ev_lower_cutoff", "val"], @table["implied_ev", "val"] <= @table["ev_upper_cutoff", "val"]), -PostQ3FinancingRegistry["mcp_base_liq_pref", "val"], 0)',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("mcp_conv_shares", {
    cells: {
      label: new Cell({ value: "METAM conversion shares added (M)" }),
      notes: "20.0M < $625; 17.025M > $734.21",
    },
    expr: 'IF(@table["implied_ev", "val"] < @table["ev_lower_cutoff", "val"], PostQ3FinancingRegistry["mcp_max_shares", "val"], IF(@table["implied_ev", "val"] > @table["ev_upper_cutoff", "val"], PostQ3FinancingRegistry["mcp_min_shares", "val"], 0))',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("implied_common_equity", {
    cells: {
      label: new Cell({ value: "Implied common equity value" }),
      notes: null,
    },
    expr: '@table["core_eq_pre_mcp", "val"] + @table["mcp_cash_claim", "val"]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  bridge.addRow("pro_forma_diluted_shares", {
    cells: {
      label: new Cell({ value: "Pro forma diluted shares at DCF px (M)" }),
      notes: null,
    },
    expr: '@table["shares_with_fwd", "val"] + @table["rsu_tsm_inc_shares", "val"] + @table["mcp_conv_shares", "val"]',
    format: "number",
    decimals: 3,
  })
  bridge.addRow("upside_downside_vs_spot", {
    cells: {
      label: new Cell({ value: "Implied return vs. spot price ($560.84)" }),
      notes: null,
    },
    expr: '@table["implied_share_price", "val"] / WaccBuild["spot_price", "val"] - 1',
    format: "percentage",
    decimals: 1,
    style: "bold",
  })

  bridge.addRowGutter()
  bridge.addSectionHeader("Spot enterprise value & variance attribution anchor")

  bridge.addRow("spot_q4_base_ebit", {
    cells: {
      label: new Cell({
        value: "Base Q4 2026E EBIT (spot EV anchor)",
        indent: 1,
      }),
      notes: null,
    },
    expr: 'ScalarDrivers["q4RevenueGuidance", "base"] - (ScalarDrivers["fy26TotalGaapExpenses", "base"] - IncomeStatement["total_costs_and_expenses", "9M26A"])',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("spot_q4_base_nopat", {
    cells: {
      label: new Cell({ value: "Base Q4 2026E NOPAT", indent: 1 }),
      notes: null,
    },
    expr: '@table["spot_q4_base_ebit", "val"] - MAX(0, @table["spot_q4_base_ebit", "val"]) * ScalarDrivers["effectiveTaxRate", "base"]',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("spot_q4_base_da", {
    cells: {
      label: new Cell({ value: "Base Q4 2026E D&A", indent: 1 }),
      notes: null,
    },
    expr: 'PpeSchedule["opening_net_ppe", "2026E"] * ScalarDrivers["q4DaAnnualizedRate", "base"] / 4',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("spot_q4_base_capex", {
    cells: {
      label: new Cell({
        value: "Base Q4 2026E total CapEx outflow",
        indent: 1,
      }),
      notes: null,
    },
    expr: '-(ScalarDrivers["fy26TotalCapex", "base"] + CashFlowStatement["total_capex_outflow", "9M26A"])',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("spot_q4_base_chg_nwc", {
    cells: {
      label: new Cell({
        value: "Base Q4 2026E change in operating NWC",
        indent: 1,
      }),
      notes: null,
    },
    expr: '-((IncomeStatement["revenue", "9M26A"] + ScalarDrivers["q4RevenueGuidance", "base"]) * (ScalarDrivers["arDays", "base"] / 365 + ScalarDrivers["prepaidPctRevenue", "base"] - VectorDriversBase["apPctRevenue", "2027E"] - VectorDriversBase["opAccruedPctRevenue", "2027E"]) - WorkingCapitalSchedule["operating_nwc", "Q3 26A"])',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("spot_elapsed_q4_burn_base", {
    cells: {
      label: new Cell({ value: "Memo: Base elapsed Q4 26E burn (51/92)" }),
      notes: "Base Q4 anchor for invariant spot",
    },
    expr: 'SUM(@table["spot_q4_base_nopat".."spot_q4_base_chg_nwc", "val"]) * (1 - DcfFcff["stub_factor", "Q4 26E"])',
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("spot_net_bridge_ref", {
    cells: {
      label: new Cell({ value: "Memo: Base net EV-to-equity bridge" }),
      notes: "Anchors invariant spot EV",
    },
    expr: `@table["net_bridge_ex_mcp", "val"] - @table["elapsed_q4_fcff_burn", "val"] + @table["spot_elapsed_q4_burn_base", "val"] - @table["pv_escrow_release", "val"] + (${escrowInfra} / ((1 + WaccBuild["wacc_base_ref", "val"]) ^ 2.75))`,
    format: "currency",
    decimals: 1,
  })
  bridge.addRow("spot_pf_ev", {
    cells: {
      label: new Cell({ value: "Pro forma spot enterprise value" }),
      notes: "Bridge inverse at $560.84 spot",
    },
    expr:
      'IF(WaccBuild["spot_price", "val"] <= @table["rsu_breakeven_px", "val"], ' +
      'WaccBuild["spot_price", "val"] * @table["shares_max_conv", "val"] - @table["spot_net_bridge_ref", "val"], ' +
      'IF(WaccBuild["spot_price", "val"] < PostQ3FinancingRegistry["mcp_lower_threshold", "val"], ' +
      'WaccBuild["spot_price", "val"] * @table["shares_r2_total", "val"] - @table["rsu_unrecognized_comp", "val"] - @table["spot_net_bridge_ref", "val"], ' +
      'IF(WaccBuild["spot_price", "val"] <= PostQ3FinancingRegistry["mcp_upper_threshold", "val"], ' +
      'WaccBuild["spot_price", "val"] * @table["shares_r3_total", "val"] - @table["rsu_unrecognized_comp", "val"] + PostQ3FinancingRegistry["mcp_base_liq_pref", "val"] - @table["spot_net_bridge_ref", "val"], ' +
      'WaccBuild["spot_price", "val"] * @table["shares_r4_total", "val"] - @table["rsu_unrecognized_comp", "val"] - @table["spot_net_bridge_ref", "val"])))',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("terminal_fcff_at_base", {
    cells: {
      label: new Cell({ value: "Terminal FCFF at Base g / RONIC" }),
      notes: null,
    },
    expr: 'DcfFcff["nopat", "2031E"] * (1 + ScalarDrivers["terminalGrowthRate", "base"]) * (1 - ScalarDrivers["terminalGrowthRate", "base"] / ScalarDrivers["terminalRonic", "base"])',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("term_val_at_base", {
    cells: {
      label: new Cell({ value: "Terminal value at Base WACC / g / RONIC" }),
      notes: "Mid-year adj.; requires WACC > g",
    },
    expr: 'IF(WaccBuild["wacc_base_ref", "val"] > ScalarDrivers["terminalGrowthRate", "base"], (@table["terminal_fcff_at_base", "val"] / (WaccBuild["wacc_base_ref", "val"] - ScalarDrivers["terminalGrowthRate", "base"])) * ((1 + WaccBuild["wacc_base_ref", "val"]) ^ (0.5 * ScalarDrivers["midYearDiscountingFlag", "base"])), NA())',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("ev_at_base_params", {
    cells: {
      label: new Cell({ value: "Active cash flows at Base parameters" }),
      notes: "Isolates operating CF variance",
    },
    expr: 'SUM(DcfFcff["pv_fcff_at_base", "Q4 26E".."2031E"]) + @table["term_val_at_base", "val"] / ((1 + WaccBuild["wacc_base_ref", "val"]) ^ YEARFRAC(DcfFcff["val_date", "2031E"], DcfFcff["period_end", "2031E"], 3))',
    format: "currency",
    decimals: 0,
  })
  bridge.addRow("px_at_base_params", {
    cells: {
      label: new Cell({ value: "Share price at Base parameters" }),
      notes: null,
    },
    expr: exactFourRegimePriceExpr(
      '@table["ev_at_base_params", "val"]',
      "@table"
    ),
    format: "currency",
    decimals: 2,
  })

  // =========================================================================
  // 2. Right Lane Top (Cols K..S): Unlevered Economic FCFF Schedule
  // =========================================================================
  const fcff = sheet.addTable(
    "DcfFcff",
    "Unlevered Economic Free Cash Flow (FCFF) & Discounting Schedule",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        `Valuation date ${VALUATION_AS_OF_DATE}; SBC expensed inside NOPAT (never added back); Actual/365 mid-year discounting`,
      ],
      rightOf: bridge,
      gap: 1,
    }
  )
  fcff.addColumn("label", { role: "descriptor", header: "DCF Cash Flow Line" })
  addDcfTimelineColumns(fcff, true)

  fcff.addSectionHeader("Exact calendar dates & discounting factors")

  fcff.addRow("val_date", {
    cells: { label: new Cell({ value: "Valuation date" }) },
    expr: "DATE(2026, 11, 20)",
    format: "date",
  })

  const startDates: Record<string, Cell> = {
    label: new Cell({ value: "Cash flow period start date" }),
    "Q4 26E": new Cell({ expr: "DATE(2026, 11, 20)" }),
    "2027E": new Cell({ expr: "DATE(2027, 1, 1)" }),
    "2028E": new Cell({ expr: "DATE(2028, 1, 1)" }),
    "2029E": new Cell({ expr: "DATE(2029, 1, 1)" }),
    "2030E": new Cell({ expr: "DATE(2030, 1, 1)" }),
    "2031E": new Cell({ expr: "DATE(2031, 1, 1)" }),
  }
  fcff.addRow("period_start", { cells: startDates, format: "date" })

  const endDates: Record<string, Cell> = {
    label: new Cell({ value: "Cash flow period end date" }),
    "Q4 26E": new Cell({ expr: "DATE(2026, 12, 31)" }),
    "2027E": new Cell({ expr: "DATE(2027, 12, 31)" }),
    "2028E": new Cell({ expr: "DATE(2028, 12, 31)" }),
    "2029E": new Cell({ expr: "DATE(2029, 12, 31)" }),
    "2030E": new Cell({ expr: "DATE(2030, 12, 31)" }),
    "2031E": new Cell({ expr: "DATE(2031, 12, 31)" }),
  }
  fcff.addRow("period_end", { cells: endDates, format: "date" })

  fcff.addRow("stub_factor", {
    cells: {
      label: new Cell({ value: "Remaining period stub factor" }),
      "Q4 26E": new Cell({
        expr: "(DATE(2026, 12, 31) - DATE(2026, 11, 20)) / (DATE(2026, 12, 31) - DATE(2026, 9, 30))",
        note: "41 remaining calendar days in Q4 2026E (Nov 20–Dec 31) divided by 92 days in Q4 (44.6%); elapsed 51/92 is bridged in Nov 20 pro forma cash.",
      }),
      "2027E": 1,
      "2028E": 1,
      "2029E": 1,
      "2030E": 1,
      "2031E": 1,
    },
    format: "percentage",
    decimals: 1,
  })

  fcff.addRow("period_len_yrs", {
    cells: { label: new Cell({ value: "Period duration (Actual/365 yrs)" }) },
    expr: 'YEARFRAC(@table["period_start", @col], @table["period_end", @col], 3)',
    format: "number",
    decimals: 3,
  })

  fcff.addRow("disc_period_mid", {
    cells: {
      label: new Cell({ value: "Discount period (yrs from Nov 20)" }),
    },
    expr: 'YEARFRAC(@table["val_date", @col], @table["period_end", @col], 3) - (@table["period_len_yrs", @col] / 2) * ScalarDrivers["midYearDiscountingFlag", "active"]',
    format: "number",
    decimals: 3,
  })

  fcff.addRow("disc_factor", {
    cells: { label: new Cell({ value: "Discount factor (Active WACC)" }) },
    expr: '1 / ((1 + WaccBuild["wacc", "val"]) ^ @table["disc_period_mid", @col])',
    format: "number",
    decimals: 4,
  })

  fcff.addRow("disc_factor_base", {
    cells: { label: new Cell({ value: "Discount factor (Base WACC ref.)" }) },
    expr: '1 / ((1 + WaccBuild["wacc_base_ref", "val"]) ^ @table["disc_period_mid", @col])',
    format: "number",
    decimals: 4,
  })

  fcff.addRowGutter()
  fcff.addSectionHeader("Unlevered economic FCFF build (SBC expensed)")

  fcff.addRow("clean_ebit", {
    cells: {
      label: new Cell({ value: "Normalized EBIT (SBC deducted)" }),
    },
    expr: 'IncomeStatement["normalized_ebit", @col]',
    format: "currency",
    decimals: 0,
  })

  fcff.addRow("nopat_taxes", {
    cells: {
      label: new Cell({ value: "(−) Cash taxes on EBIT" }),
    },
    expr: '-MAX(0, @table["clean_ebit", @col]) * ScalarDrivers["effectiveTaxRate", "active"]',
    format: "currency",
    decimals: 0,
  })

  fcff.addRow("nopat", {
    cells: {
      label: new Cell({ value: "Net operating profit after tax" }),
    },
    expr: '@table["clean_ebit", @col] + @table["nopat_taxes", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  fcff.addRow("da", {
    cells: { label: new Cell({ value: "(+) Depreciation & amortization" }) },
    expr: 'SegmentBuild["consolidated_da", @col]',
    format: "currency",
    decimals: 0,
  })

  const capexDcf: Record<string, Cell> = {
    label: new Cell({ value: "(−) Total CapEx (incl. fin. leases)" }),
    "Q4 26E": new Cell({ expr: '-PpeSchedule["total_capex_flow", "2026E"]' }),
  }
  for (const p of FORECAST_PERIODS) {
    capexDcf[p] = new Cell({ expr: '-PpeSchedule["total_capex_flow", @col]' })
  }
  fcff.addRow("total_capex", {
    cells: capexDcf,
    format: "currency",
    decimals: 0,
  })

  const nwcDcf: Record<string, Cell> = {
    label: new Cell({ value: "(−) Change in operating NWC" }),
    "Q4 26E": new Cell({
      expr: '-WorkingCapitalSchedule["chg_operating_nwc", "2026E"]',
      note: "Excludes $19,881M accrued legal liabilities and scheduled legal settlement payouts (deducted once in the EV-to-equity bridge).",
    }),
  }
  for (const p of FORECAST_PERIODS) {
    nwcDcf[p] = new Cell({
      expr: '-WorkingCapitalSchedule["chg_operating_nwc", @col]',
    })
  }
  fcff.addRow("chg_nwc", { cells: nwcDcf, format: "currency", decimals: 0 })

  fcff.addRow("full_period_fcff", {
    cells: {
      label: new Cell({ value: "Unlevered economic FCFF (full)" }),
    },
    expr: '@table["nopat", @col] + @table["da", @col] + @table["total_capex", @col] + @table["chg_nwc", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  fcff.addRow("stub_adj_fcff", {
    cells: { label: new Cell({ value: "Stub-adjusted unlevered FCFF" }) },
    expr: '@table["full_period_fcff", @col] * @table["stub_factor", @col]',
    format: "currency",
    decimals: 0,
  })

  fcff.addRow("pv_fcff", {
    cells: { label: new Cell({ value: "PV of FCFF (at Active WACC)" }) },
    expr: '@table["stub_adj_fcff", @col] * @table["disc_factor", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
  })

  fcff.addRow("pv_fcff_at_base", {
    cells: { label: new Cell({ value: "Memo: PV of FCFF (at Base WACC)" }) },
    expr: '@table["stub_adj_fcff", @col] * @table["disc_factor_base", @col]',
    format: "currency",
    decimals: 0,
  })

  // =========================================================================
  // 3. Right Lane Middle (Cols K..S): Forward Unlevered Cash Yield vs. Rf
  // =========================================================================
  const cy = sheet.addTable(
    "CashYieldVsRf",
    "Forward Economic FCFF Yield vs. 10-Year U.S. Treasury Yield (5.04%)",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Measures years of AI CapEx digestion before unlevered cash yield clears spot sovereign yield",
      ],
      below: fcff,
    }
  )
  cy.addColumn("label", { role: "descriptor", header: "Cash Yield Metric" })
  addDcfTimelineColumns(cy, false)

  cy.addSectionHeader("Unlevered FCFF yield vs. risk-free benchmark")

  cy.addRow("fcff", {
    cells: { label: new Cell({ value: "Unlevered economic FCFF ($M)" }) },
    expr: 'DcfFcff["full_period_fcff", @col]',
    format: "currency",
    decimals: 0,
  })
  cy.addRow("fcff_yield_spot_ev", {
    cells: { label: new Cell({ value: "FCFF yield on spot pro forma EV" }) },
    expr: '@table["fcff", @col] / DcfBridge["spot_pf_ev", "val"]',
    format: "percentage",
    decimals: 2,
    style: "bold",
  })
  cy.addRow("fcff_yield_dcf_ev", {
    cells: { label: new Cell({ value: "FCFF yield on implied DCF EV" }) },
    expr: '@table["fcff", @col] / DcfBridge["implied_ev", "val"]',
    format: "percentage",
    decimals: 2,
  })
  cy.addRow("rf_benchmark", {
    cells: { label: new Cell({ value: "10-Year U.S. Treasury yield (Rf)" }) },
    expr: 'WaccBuild["rf_dgs10", "val"]',
    format: "percentage",
    decimals: 2,
  })
  cy.addRow("yield_spread_vs_rf", {
    cells: { label: new Cell({ value: "Spot EV FCFF yield spread vs. Rf" }) },
    expr: '@table["fcff_yield_spot_ev", @col] - @table["rf_benchmark", @col]',
    format: "percentage",
    decimals: 2,
  })
  cy.addRow("clears_rf_flag", {
    cells: { label: new Cell({ value: "Clears 5.04% Rf (1 = Yes, 0 = No)" }) },
    expr: 'IF(@table["fcff_yield_spot_ev", @col] >= @table["rf_benchmark", @col], 1, 0)',
    format: "integer",
  })

  // =========================================================================
  // 4. Right Lane Bottom (Cols K..S): Contingent Tail Sensitivity Schedule
  // =========================================================================
  const tail = sheet.addTable(
    "ContingentTailSensitivity",
    "Debt-Like, Tax, Litigation & Off-Balance-Sheet Contingent Tail Stress",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Per-share impact on Active DCF if unaccrued contingent claims crystallize (excl. $19.9B accrued legal)",
      ],
      below: cy,
    }
  )
  tail.addColumn("label", {
    role: "descriptor",
    header: "Contingent Claim Scenario",
  })
  tail.addColumn("claim_amt", { header: "Claim ($M)" })
  tail.addColumn("per_share_impact", { header: "$/Sh Impact" })
  tail.addColumn("adj_price", { header: "Adj. Price" })
  tail.addColumn("vs_spot", { header: "vs. Spot" })
  tail.addColumn("notes", { role: "descriptor", header: "Notes" })

  tail.addSectionHeader(
    "Incremental downside claims beyond $19.9B accrued legal"
  )

  const addTailRow = (
    id: string,
    label: string,
    claimExpr: string,
    noteText: string,
    style?: "bold" | "subtotal" | "total"
  ): void => {
    tail.addRow(id, {
      cells: {
        label: new Cell({ value: label }),
        claim_amt: new Cell({
          expr: claimExpr,
          format: "currency",
          decimals: 0,
        }),
        per_share_impact: new Cell({
          expr: '-@table[@row, "claim_amt"] / DcfBridge["pro_forma_diluted_shares", "val"]',
          format: "currency",
          decimals: 2,
        }),
        adj_price: new Cell({
          expr: 'DcfBridge["implied_share_price", "val"] + @table[@row, "per_share_impact"]',
          format: "currency",
          decimals: 2,
        }),
        vs_spot: new Cell({
          expr: '@table[@row, "adj_price"] / WaccBuild["spot_price", "val"] - 1',
          format: "percentage",
          decimals: 1,
        }),
        notes: noteText,
      },
      style,
    })
  }

  addTailRow(
    "active_baseline",
    "Active DCF baseline",
    "0",
    "Incl. $19.9B legal",
    "bold"
  )
  addTailRow(
    "ag_unaccrued",
    "(−) Multistate AG unaccrued ($5.3B)",
    'OffBalanceSheetContingencies["ag_unaccrued_tranche", "amount"]',
    "Peer-contingent (N.10)"
  )
  addTailRow(
    "gross_utb_and_interest",
    "(−) Gross UTBs + interest ($24.3B)",
    'OffBalanceSheetContingencies["gross_utb_and_interest", "amount"]',
    "IRS TP & UTB (Note 12)"
  )
  addTailRow(
    "nm_ag_appeal",
    "(−) NM AG civil penalty ($25.0B)",
    'OffBalanceSheetContingencies["nm_ag_penalty", "amount"]',
    "Under appeal (Note 10)"
  )
  addTailRow(
    "nm_ag_2yr_interest",
    "(−) NM AG 2-yr interest ($7.5B)",
    'OffBalanceSheetContingencies["nm_ag_2yr_interest", "amount"]',
    "15%/yr stat. (Note 10)"
  )
  addTailRow(
    "dc_rvg_drawdown",
    "(−) Data-center JV RVGs ($41.5B)",
    'OffBalanceSheetContingencies["vie_dc_rvg", "amount"]',
    "LA/TX JV RVGs (Note 5)"
  )
  addTailRow(
    "combined_tail",
    "Combined illustrative tail stress",
    'SUM(@table["ag_unaccrued".."dc_rvg_drawdown", "claim_amt"])',
    "All 5 claims combined",
    "total"
  )
}
