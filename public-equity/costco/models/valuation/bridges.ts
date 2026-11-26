import type { CompiledModel, Sheet, Table } from "f8-engine"
import { rowFormatOptions, type ScenarioName } from "../timeline.ts"

export interface ScenarioSnapshot {
  readonly scenario: ScenarioName
  readonly wacc: number
  readonly termGrowth: number
  readonly exitMult: number
  readonly compsMult: number
  readonly fy27Rev: number
  readonly fy27Ebitda: number
  readonly fy27Ebit: number
  readonly fy27Eps: number
  readonly fy27RegDps: number
  readonly fy27Fcff: number
  readonly fy28Rev: number
  readonly fy28Ebitda: number
  readonly fy28Ebit: number
  readonly fy28Eps: number
  readonly fy28RegDps: number
  readonly fy28NetCashExLease: number
  readonly fy28EndingDilutedShares: number
  readonly fy29Rev: number
  readonly fy29Ebitda: number
  readonly fy29Ebit: number
  readonly fy29Eps: number
  readonly fy36Rev: number
  readonly fy36Ebit: number
  readonly fy36Ebitda: number
  readonly fy36Fcff: number
  readonly fy36Roic: number
  readonly perpEv: number
  readonly perpCumPrice: number
  readonly perpExPrice: number
  readonly exitEv: number
  readonly exitCumPrice: number
  readonly exitExPrice: number
  readonly compsCumPrice: number
  readonly compsExPrice: number
  readonly blendedCumPrice: number
  readonly blendedExPrice: number
  readonly perpPriceAtBaseWaccBaseG: number
  readonly perpPriceAtScWaccBaseG: number
  readonly impliedWacc: number
  readonly impliedBeta: number
  readonly impliedErp: number
  readonly perp2yBetaPrice: number
  readonly perpRfStressPrice: number
  readonly exitRfStressPrice: number
  readonly perpPeer5yBetaPrice: number
  readonly perpCashAdjWaccPrice: number
  readonly perpExTrappedCashPrice: number
  readonly perpCapexMinus50bpsPrice: number
  readonly perpCapexPlus50bpsPrice: number
  readonly fy27EpsBridgeEbit: number
  readonly fy27EpsBridgeInt: number
  readonly fy27EpsBridgeEsop: number
  readonly fy27EpsBridgeOther: number
  readonly fy28EpsBridgeEbit: number
  readonly fy28EpsBridgeInt: number
  readonly fy28EpsBridgeOther: number
}

export function extractScenarioSnapshot(
  compiled: CompiledModel,
  scenario: ScenarioName
): ScenarioSnapshot {
  const fy28NetCashExLease =
    compiled.num('BalanceSheet["cash_and_equivalents", "FY28E"]') +
    compiled.num('BalanceSheet["short_term_investments", "FY28E"]') -
    (compiled.num('DebtSchedule["total_lt_debt_carrying", "FY28E"]') +
      compiled.num('DebtSchedule["revolver_end", "FY28E"]') +
      compiled.num('LeasesInterestSchedule["total_fin_lease_liab", "FY28E"]'))

  const fy28EndingDilutedShares =
    compiled.num('ShareEquitySchedule["ending_shares", "FY28E"]') +
    compiled.num('ShareEquitySchedule["dilutive_rsus", "FY28E"]')

  return Object.freeze({
    scenario,
    wacc: compiled.num('WaccSchedule["wacc", "val"]'),
    termGrowth: compiled.num(
      'ScalarAssumptionsValuation["terminal_growth_rate", "val"]'
    ),
    exitMult: compiled.num(
      'ScalarAssumptionsValuation["exit_ev_to_ebitda", "val"]'
    ),
    compsMult: compiled.num(
      'ScalarAssumptionsValuation["calibrated_comps_ev_to_ebitda", "val"]'
    ),
    fy27Rev: compiled.num('IncomeStatement["total_revenue", "FY27E"]'),
    fy27Ebitda: compiled.num('IncomeStatement["ebitda", "FY27E"]'),
    fy27Ebit: compiled.num('IncomeStatement["operating_income", "FY27E"]'),
    fy27Eps: compiled.num('IncomeStatement["diluted_eps", "FY27E"]'),
    fy27RegDps: compiled.num('IncomeStatement["regular_dps", "FY27E"]'),
    fy27Fcff: compiled.num('InvestedCapitalROIC["unlevered_fcff", "FY27E"]'),
    fy28Rev: compiled.num('IncomeStatement["total_revenue", "FY28E"]'),
    fy28Ebitda: compiled.num('IncomeStatement["ebitda", "FY28E"]'),
    fy28Ebit: compiled.num('IncomeStatement["operating_income", "FY28E"]'),
    fy28Eps: compiled.num('IncomeStatement["diluted_eps", "FY28E"]'),
    fy28RegDps: compiled.num('IncomeStatement["regular_dps", "FY28E"]'),
    fy28NetCashExLease,
    fy28EndingDilutedShares,
    fy29Rev: compiled.num('IncomeStatement["total_revenue", "FY29E"]'),
    fy29Ebitda: compiled.num('IncomeStatement["ebitda", "FY29E"]'),
    fy29Ebit: compiled.num('IncomeStatement["operating_income", "FY29E"]'),
    fy29Eps: compiled.num('IncomeStatement["diluted_eps", "FY29E"]'),
    fy36Rev: compiled.num('IncomeStatement["total_revenue", "FY36E"]'),
    fy36Ebit: compiled.num('IncomeStatement["operating_income", "FY36E"]'),
    fy36Ebitda: compiled.num('IncomeStatement["ebitda", "FY36E"]'),
    fy36Fcff: compiled.num('InvestedCapitalROIC["unlevered_fcff", "FY36E"]'),
    fy36Roic: compiled.num('InvestedCapitalROIC["roic", "FY36E"]'),
    perpEv: compiled.num('DcfBridge["enterprise_value", "perp"]'),
    perpCumPrice: compiled.num('DcfBridge["implied_price_cum_div", "perp"]'),
    perpExPrice: compiled.num('DcfBridge["implied_price_ex_div", "perp"]'),
    exitEv: compiled.num('DcfBridge["enterprise_value", "exit_mult"]'),
    exitCumPrice: compiled.num(
      'DcfBridge["implied_price_cum_div", "exit_mult"]'
    ),
    exitExPrice: compiled.num('DcfBridge["implied_price_ex_div", "exit_mult"]'),
    compsCumPrice: compiled.num(
      'CompsValuationCalibration["implied_price_cum_div", "val"]'
    ),
    compsExPrice: compiled.num(
      'CompsValuationCalibration["implied_price_ex_div", "val"]'
    ),
    blendedCumPrice: compiled.num(
      'FootballField["blended_total", "cum_div_price"]'
    ),
    blendedExPrice: compiled.num(
      'FootballField["blended_total", "ex_div_price"]'
    ),
    perpPriceAtBaseWaccBaseG: compiled.num(
      'DcfBridge["perp_price_at_base_params", "perp"]'
    ),
    perpPriceAtScWaccBaseG: compiled.num(
      'DcfBridge["perp_price_at_sc_wacc_base_g", "perp"]'
    ),
    impliedWacc: compiled.num(
      'ReverseDcfTable["implied_wacc_at_base_g", "val"]'
    ),
    impliedBeta: compiled.num(
      'ReverseDcfTable["implied_beta_at_base_g", "val"]'
    ),
    impliedErp: compiled.num(
      'ReverseDcfTable["implied_erp_at_5y_beta", "val"]'
    ),
    perp2yBetaPrice: compiled.num(
      'ReverseDcfTable["perp_price_at_2y_beta_wacc", "val"]'
    ),
    perpRfStressPrice: compiled.num(
      'ReverseDcfTable["perp_price_at_rf_400", "val"]'
    ),
    exitRfStressPrice: compiled.num(
      'ReverseDcfTable["exit_price_at_rf_400", "val"]'
    ),
    perpPeer5yBetaPrice: compiled.num(
      'ValuationKnobSummary["perp_peer_5y_beta", "active_live"]'
    ),
    perpCashAdjWaccPrice: compiled.num(
      'ValuationKnobSummary["perp_cash_adj_wacc", "active_live"]'
    ),
    perpExTrappedCashPrice: compiled.num(
      'ValuationKnobSummary["perp_ex_trapped_cash", "active_live"]'
    ),
    perpCapexMinus50bpsPrice: compiled.num(
      'ValuationKnobSummary["perp_capex_minus_50bps", "active_live"]'
    ),
    perpCapexPlus50bpsPrice: compiled.num(
      'ValuationKnobSummary["perp_capex_plus_50bps", "active_live"]'
    ),
    fy27EpsBridgeEbit: compiled.num(
      'ConsensusEpsBridge["fy27_eps_bridge_ebit", "active"]'
    ),
    fy27EpsBridgeInt: compiled.num(
      'ConsensusEpsBridge["fy27_eps_bridge_int", "active"]'
    ),
    fy27EpsBridgeEsop: compiled.num(
      'ConsensusEpsBridge["fy27_eps_bridge_esop", "active"]'
    ),
    fy27EpsBridgeOther: compiled.num(
      'ConsensusEpsBridge["fy27_eps_bridge_other", "active"]'
    ),
    fy28EpsBridgeEbit: compiled.num(
      'ConsensusEpsBridge["fy28_eps_bridge_ebit", "active"]'
    ),
    fy28EpsBridgeInt: compiled.num(
      'ConsensusEpsBridge["fy28_eps_bridge_int", "active"]'
    ),
    fy28EpsBridgeOther: compiled.num(
      'ConsensusEpsBridge["fy28_eps_bridge_other", "active"]'
    ),
  })
}

export function buildValuationBridges(
  sheet: Sheet,
  snapshots: Readonly<Record<ScenarioName, ScenarioSnapshot>> | null
): {
  readonly footballField: Table
  readonly scenarioVariance: Table
  readonly evAttribution: Table
  readonly peAttribution: Table
} {
  // 1. Valuation Synthesis & Football Field
  const footballField = sheet.addTable(
    "FootballField",
    "Valuation Synthesis & Blended Value Summary ($M / $/sh)",
    {
      subtitle: [
        "Blends 50% Perpetuity DCF and 50% Calibrated Comps; Exit-Multiple DCF shown as 0%-weight cross-check",
        "Implied enterprise value ($M) and cum-dividend vs. ex-special-dividend value per share against spot close",
      ],
      currency: "USD",
    }
  )
  footballField.addColumn("line_item", {
    role: "descriptor",
    header: "Valuation methodology",
  })
  footballField.addColumn("weight", {
    role: "measure",
    headers: ["Method", "Weight"],
    format: "percentage",
    decimals: 0,
  })
  footballField.addColumn("ev", {
    role: "measure",
    headers: ["Implied", "EV ($M)"],
    format: "currency",
    decimals: 0,
  })
  footballField.addColumn("cum_div_price", {
    role: "measure",
    headers: ["Cum-Div.", "Price"],
    format: "currency",
    decimals: 2,
    style: "bold",
  })
  footballField.addColumn("ex_div_price", {
    role: "measure",
    headers: ["Ex-Div.", "Price"],
    format: "currency",
    decimals: 2,
  })
  footballField.addColumn("vs_close_pct", {
    role: "measure",
    headers: ["vs. Spot", "Close"],
    format: "percentage",
    decimals: 1,
  })
  footballField.addColumn("weighted_cum_div", {
    role: "measure",
    headers: ["Wtd.", "Cum-Div."],
    format: "currency",
    decimals: 2,
  })
  footballField.addColumn("weighted_ex_div", {
    role: "measure",
    headers: ["Wtd.", "Ex-Div."],
    format: "currency",
    decimals: 2,
  })
  footballField.addColumn("notes", {
    role: "descriptor",
    header: "Basis",
  })

  footballField.addRow("perp_dcf", {
    cells: {
      line_item: "1. Unlevered Perpetuity DCF",
      weight: { expr: 'ScalarAssumptionsValuation["weight_perp_dcf", "val"]' },
      ev: { expr: 'DcfBridge["enterprise_value", "perp"]' },
      cum_div_price: { expr: 'DcfBridge["implied_price_cum_div", "perp"]' },
      ex_div_price: { expr: 'DcfBridge["implied_price_ex_div", "perp"]' },
      vs_close_pct: {
        expr: '@table[@row, "cum_div_price"] / MarketAnchorsMarket["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: '@table[@row, "weight"] * @table[@row, "cum_div_price"]',
      },
      weighted_ex_div: {
        expr: '@table[@row, "weight"] * @table[@row, "ex_div_price"]',
      },
      notes: "Primary",
    },
  })
  footballField.addRow("exit_mult_dcf", {
    cells: {
      line_item: "2. Exit EV/EBITDA DCF",
      weight: { expr: 'ScalarAssumptionsValuation["weight_exit_dcf", "val"]' },
      ev: { expr: 'DcfBridge["enterprise_value", "exit_mult"]' },
      cum_div_price: {
        expr: 'DcfBridge["implied_price_cum_div", "exit_mult"]',
      },
      ex_div_price: { expr: 'DcfBridge["implied_price_ex_div", "exit_mult"]' },
      vs_close_pct: {
        expr: '@table[@row, "cum_div_price"] / MarketAnchorsMarket["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: '@table[@row, "weight"] * @table[@row, "cum_div_price"]',
      },
      weighted_ex_div: {
        expr: '@table[@row, "weight"] * @table[@row, "ex_div_price"]',
      },
      notes: "Cross-check",
    },
  })
  footballField.addRow("calibrated_comps", {
    cells: {
      line_item: "3. Calibrated FY27E EV/EBITDA",
      weight: {
        expr: '1 - @table["perp_dcf", "weight"] - @table["exit_mult_dcf", "weight"]',
      },
      ev: { expr: 'CompsValuationCalibration["implied_ev", "val"]' },
      cum_div_price: {
        expr: 'CompsValuationCalibration["implied_price_cum_div", "val"]',
      },
      ex_div_price: {
        expr: 'CompsValuationCalibration["implied_price_ex_div", "val"]',
      },
      vs_close_pct: {
        expr: '@table[@row, "cum_div_price"] / MarketAnchorsMarket["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: '@table[@row, "weight"] * @table[@row, "cum_div_price"]',
      },
      weighted_ex_div: {
        expr: '@table[@row, "weight"] * @table[@row, "ex_div_price"]',
      },
      notes: "Residual wt.",
    },
  })
  footballField.addRow("blended_total", {
    style: "total",
    highlight: true,
    cells: {
      line_item: "Blended valuation (active case)",
      weight: { expr: 'SUM(@table["perp_dcf".."calibrated_comps", "weight"])' },
      ev: {
        expr: 'SUMPRODUCT(@table["perp_dcf".."calibrated_comps", "weight"], @table["perp_dcf".."calibrated_comps", "ev"])',
      },
      cum_div_price: {
        expr: 'SUM(@table["perp_dcf".."calibrated_comps", "weighted_cum_div"])',
      },
      ex_div_price: {
        expr: 'SUM(@table["perp_dcf".."calibrated_comps", "weighted_ex_div"])',
      },
      vs_close_pct: {
        expr: '@table["blended_total", "cum_div_price"] / MarketAnchorsMarket["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: 'SUM(@table["perp_dcf".."calibrated_comps", "weighted_cum_div"])',
      },
      weighted_ex_div: {
        expr: 'SUM(@table["perp_dcf".."calibrated_comps", "weighted_ex_div"])',
      },
      notes: "Weighted sum",
    },
  })
  footballField.addRowGutter()
  footballField.addSectionHeader("Method-weight sensitivity reference")
  footballField.addRow("memo_100_perp", {
    cells: {
      line_item: "Memo: 100% Perpetuity DCF",
      weight: 1,
      ev: { expr: '@table["perp_dcf", "ev"]' },
      cum_div_price: { expr: '@table["perp_dcf", "cum_div_price"]' },
      ex_div_price: { expr: '@table["perp_dcf", "ex_div_price"]' },
      vs_close_pct: {
        expr: '@table[@row, "cum_div_price"] / MarketAnchorsMarket["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: null,
      weighted_ex_div: null,
      notes: "Pure intrinsic",
    },
  })
  footballField.addRow("memo_equal_33", {
    cells: {
      line_item: "Memo: Equal 33/33/33 blend",
      weight: 1,
      ev: { expr: 'AVERAGE(@table["perp_dcf".."calibrated_comps", "ev"])' },
      cum_div_price: {
        expr: 'AVERAGE(@table["perp_dcf".."calibrated_comps", "cum_div_price"])',
      },
      ex_div_price: {
        expr: 'AVERAGE(@table["perp_dcf".."calibrated_comps", "ex_div_price"])',
      },
      vs_close_pct: {
        expr: '@table[@row, "cum_div_price"] / MarketAnchorsMarket["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: null,
      weighted_ex_div: null,
      notes: "Incl. Exit DCF",
    },
  })

  // 2. Scenario Variance Attribution Bridge
  const downSnap = snapshots?.Downside ?? null
  const baseSnap = snapshots?.Base ?? null
  const upSnap = snapshots?.Upside ?? null

  const basePerpVal = baseSnap?.perpCumPrice ?? 0
  const downAtBaseParams = downSnap?.perpPriceAtBaseWaccBaseG ?? 0
  const downAtScWaccBaseG = downSnap?.perpPriceAtScWaccBaseG ?? 0
  const downActual = downSnap?.perpCumPrice ?? 0
  const upAtBaseParams = upSnap?.perpPriceAtBaseWaccBaseG ?? 0
  const upAtScWaccBaseG = upSnap?.perpPriceAtScWaccBaseG ?? 0
  const upActual = upSnap?.perpCumPrice ?? 0

  const scenarioVariance = sheet.addTable(
    "ScenarioVariance",
    "Scenario Variance Attribution — Perpetuity DCF ($/sh & % of Base)",
    {
      subtitle: [
        "Splits Perpetuity DCF variance vs. Base into operating CF/tax, WACC, and terminal g ($/sh and % of Base)",
        "Downside and Upside hold static scenario snapshots; Active tracks the active case",
      ],
      currency: "USD",
    }
  )
  scenarioVariance.addColumn("line_item", {
    role: "descriptor",
    header: "Attribution component ($/sh)",
  })
  scenarioVariance.addColumn("base_to_downside", {
    role: "measure",
    headers: ["Base to", "Downside"],
  })
  scenarioVariance.addColumn("base_to_upside", {
    role: "measure",
    headers: ["Base to", "Upside"],
  })
  scenarioVariance.addColumn("active_live", {
    role: "measure",
    headers: ["Active", "vs. Base"],
    style: "bold",
  })
  scenarioVariance.addColumn("downside_pct_base", {
    role: "measure",
    headers: ["Down %", "of Base"],
  })
  scenarioVariance.addColumn("upside_pct_base", {
    role: "measure",
    headers: ["Up %", "of Base"],
  })
  scenarioVariance.addColumn("active_pct_base", {
    role: "measure",
    headers: ["Active %", "of Base"],
    style: "bold",
  })
  scenarioVariance.addColumn("notes", {
    role: "descriptor",
    header: "Attribution step",
  })

  const pctOfBaseCell = (
    sourceCol: "base_to_downside" | "base_to_upside" | "active_live",
    decimals = 1
  ) => ({
    expr: `IF(@table["base_starting_price", "${sourceCol}"] > 0, @table[@row, "${sourceCol}"] / @table["base_starting_price", "${sourceCol}"], NA())`,
    format: "percentage" as const,
    decimals,
  })

  scenarioVariance.addRow("base_starting_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Starting Base Perp. DCF price",
      base_to_downside: basePerpVal,
      base_to_upside: basePerpVal,
      active_live: basePerpVal,
      downside_pct_base: pctOfBaseCell("base_to_downside"),
      upside_pct_base: pctOfBaseCell("base_to_upside"),
      active_pct_base: pctOfBaseCell("active_live"),
      notes: "Base case cum-div. anchor",
    },
  })
  scenarioVariance.addRow("op_cf_effect", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "1. Operating CF & tax variance",
      base_to_downside: downAtBaseParams - basePerpVal,
      base_to_upside: upAtBaseParams - basePerpVal,
      active_live: {
        expr: 'DcfBridge["perp_price_at_base_params", "perp"] - @table["base_starting_price", "active_live"]',
      },
      downside_pct_base: pctOfBaseCell("base_to_downside"),
      upside_pct_base: pctOfBaseCell("base_to_upside"),
      active_pct_base: pctOfBaseCell("active_live"),
      notes: "Case operating CF at Base WACC/g",
    },
  })
  scenarioVariance.addRow("wacc_effect", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "2. Discount rate (WACC) variance",
      base_to_downside: downAtScWaccBaseG - downAtBaseParams,
      base_to_upside: upAtScWaccBaseG - upAtBaseParams,
      active_live: {
        expr: 'DcfBridge["perp_price_at_sc_wacc_base_g", "perp"] - DcfBridge["perp_price_at_base_params", "perp"]',
      },
      downside_pct_base: pctOfBaseCell("base_to_downside"),
      upside_pct_base: pctOfBaseCell("base_to_upside"),
      active_pct_base: pctOfBaseCell("active_live"),
      notes: "Case WACC shift at Base g",
    },
  })
  scenarioVariance.addRow("term_g_effect", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "3. Terminal growth (g) variance",
      base_to_downside: downActual - downAtScWaccBaseG,
      base_to_upside: upActual - upAtScWaccBaseG,
      active_live: {
        expr: 'DcfBridge["implied_price_cum_div", "perp"] - DcfBridge["perp_price_at_sc_wacc_base_g", "perp"]',
      },
      downside_pct_base: pctOfBaseCell("base_to_downside"),
      upside_pct_base: pctOfBaseCell("base_to_upside"),
      active_pct_base: pctOfBaseCell("active_live"),
      notes: "Case terminal g at case WACC",
    },
  })
  scenarioVariance.addRow("reconciled_target_price", {
    ...rowFormatOptions("currency", 2),
    style: "total",
    expr: 'SUM(@table["base_starting_price".."term_g_effect", @col])',
    cells: {
      line_item: "Reconciled ending Perp. DCF price",
      downside_pct_base: {
        expr: 'SUM(@table["base_starting_price".."term_g_effect", @col])',
        format: "percentage",
        decimals: 1,
      },
      upside_pct_base: {
        expr: 'SUM(@table["base_starting_price".."term_g_effect", @col])',
        format: "percentage",
        decimals: 1,
      },
      active_pct_base: {
        expr: 'SUM(@table["base_starting_price".."term_g_effect", @col])',
        format: "percentage",
        decimals: 1,
      },
      notes: "Sum of attribution steps",
    },
  })
  scenarioVariance.addRow("scenario_actual_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Actual scenario Perp. DCF price",
      base_to_downside: downActual,
      base_to_upside: upActual,
      active_live: { expr: 'DcfBridge["implied_price_cum_div", "perp"]' },
      downside_pct_base: pctOfBaseCell("base_to_downside"),
      upside_pct_base: pctOfBaseCell("base_to_upside"),
      active_pct_base: pctOfBaseCell("active_live"),
      notes: "Direct Perpetuity DCF output",
    },
  })
  scenarioVariance.addRow("tie_out_check", {
    ...rowFormatOptions("currency", 4),
    style: "bold",
    highlight: true,
    expr: '@table["reconciled_target_price", @col] - @table["scenario_actual_price", @col]',
    cells: {
      line_item: "Variance tie-out check",
      downside_pct_base: {
        expr: '@table["reconciled_target_price", @col] - @table["scenario_actual_price", @col]',
        format: "percentage",
        decimals: 4,
      },
      upside_pct_base: {
        expr: '@table["reconciled_target_price", @col] - @table["scenario_actual_price", @col]',
        format: "percentage",
        decimals: 4,
      },
      active_pct_base: {
        expr: '@table["reconciled_target_price", @col] - @table["scenario_actual_price", @col]',
        format: "percentage",
        decimals: 4,
      },
      notes: "Reconciled less direct DCF",
    },
  })

  // 3. 2-Year Return Attribution — Enterprise-Value Walk (EV / EBITDA to TSR)
  const evAttribution = sheet.addTable(
    "PublicEvAttribution",
    "2-Year Total Shareholder Return Attribution — EV / EBITDA Walk",
    {
      subtitle: [
        "Anchored on ex-special-div. spot price and ex-op.-lease EV; Downside/Base/Upside hold static snapshots",
        "Compounds roll-forward, forecast delta, multiple shift, net cash, share count, and 2Y regular div. yield",
      ],
      currency: "USD",
    }
  )
  evAttribution.addColumn("line_item", {
    role: "descriptor",
    header: "EV return attribution step",
  })
  evAttribution.addColumn("Downside", {
    role: "measure",
    headers: ["Downside", "Case"],
  })
  evAttribution.addColumn("Base", {
    role: "measure",
    headers: ["Base", "Case"],
  })
  evAttribution.addColumn("Upside", {
    role: "measure",
    headers: ["Upside", "Case"],
  })
  evAttribution.addColumn("active_live", {
    role: "measure",
    headers: ["Active", "Case"],
    style: "bold",
  })
  evAttribution.addColumn("notes", {
    role: "descriptor",
    header: "Bridge basis",
  })

  evAttribution.addRow("ex_div_spot_price", {
    ...rowFormatOptions("currency", 2),
    expr: 'MarketAnchorsMarket["cost_close_price", "val"] - ScalarAssumptionsValuation["special_dividend_ps_fy27", "val"]',
    cells: {
      line_item: "Ex-special-div. spot price ($/sh)",
      notes: "Spot less special div.",
    },
  })
  evAttribution.addRow("current_ev_multiple", {
    ...rowFormatOptions("multiple", 2),
    expr: 'DcfBridge["current_market_ev", "perp"] / MarketAnchorsConsensus["cons_ebitda_fy27", "val"]',
    cells: {
      line_item: "Spot EV / cons. FY27E EBITDA",
      notes: "Ex-op.-lease EV basis",
    },
  })
  evAttribution.addRow("target_ev_multiple", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Calibrated FY28E EV / EBITDA",
      Downside: downSnap?.compsMult ?? 20,
      Base: baseSnap?.compsMult ?? 24,
      Upside: upSnap?.compsMult ?? 29.5,
      active_live: {
        expr: 'ScalarAssumptionsValuation["calibrated_comps_ev_to_ebitda", "val"]',
      },
      notes: "Scenario target mult.",
    },
  })
  evAttribution.addRow("fy28_model_ebitda", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Scenario FY28E EBITDA ($M)",
      Downside: downSnap?.fy28Ebitda ?? 16000,
      Base: baseSnap?.fy28Ebitda ?? 17500,
      Upside: upSnap?.fy28Ebitda ?? 18500,
      active_live: { expr: 'IncomeStatement["ebitda", "FY28E"]' },
      notes: "Year-2 scenario EBITDA",
    },
  })
  evAttribution.addRow("fy28_implied_ev", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["fy28_model_ebitda", @col] * @table["target_ev_multiple", @col]',
    cells: {
      line_item: "Implied FY28E EV ($M)",
      notes: "FY28E EBITDA x mult.",
    },
  })
  evAttribution.addRow("fy28_net_cash", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "FY28E net cash (ex-op. leases)",
      Downside: downSnap?.fy28NetCashExLease ?? 0,
      Base: baseSnap?.fy28NetCashExLease ?? 0,
      Upside: upSnap?.fy28NetCashExLease ?? 0,
      active_live: {
        expr: 'BalanceSheet["cash_and_equivalents", "FY28E"] + BalanceSheet["short_term_investments", "FY28E"] - (DebtSchedule["total_lt_debt_carrying", "FY28E"] + DebtSchedule["revolver_end", "FY28E"] + LeasesInterestSchedule["total_fin_lease_liab", "FY28E"])',
      },
      notes: "Post-special-div. cash",
    },
  })
  evAttribution.addRow("fy28_ending_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "FY28E ending diluted shares (M)",
      Downside: downSnap?.fy28EndingDilutedShares ?? 443.5,
      Base: baseSnap?.fy28EndingDilutedShares ?? 443.5,
      Upside: upSnap?.fy28EndingDilutedShares ?? 443.5,
      active_live: {
        expr: 'ShareEquitySchedule["ending_shares", "FY28E"] + ShareEquitySchedule["dilutive_rsus", "FY28E"]',
      },
      notes: "Incl. TSM RSUs",
    },
  })
  evAttribution.addRow("fy28_implied_price", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    expr: '(@table["fy28_implied_ev", @col] + @table["fy28_net_cash", @col]) / @table["fy28_ending_shares", @col]',
    cells: {
      line_item: "Implied FY28E share price ($/sh)",
      notes: "(EV + net cash) / shares",
    },
  })
  evAttribution.addRow("ev_roll_forward", {
    ...rowFormatOptions("percentage", 2),
    expr: 'MarketAnchorsConsensus["cons_ebitda_fy28", "val"] / MarketAnchorsConsensus["cons_ebitda_fy27", "val"] - 1',
    cells: {
      line_item: "1. Consensus EBITDA roll-forward",
      notes: "Cons. FY28E / FY27E",
    },
  })
  evAttribution.addRow("ev_forecast_delta", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["fy28_model_ebitda", @col] / MarketAnchorsConsensus["cons_ebitda_fy28", "val"] - 1',
    cells: {
      line_item: "2. Model vs. cons. FY28E EBITDA",
      notes: "Scenario forecast delta",
    },
  })
  evAttribution.addRow("ev_multiple_delta", {
    ...rowFormatOptions("percentage", 2),
    expr: 'IF(@table["current_ev_multiple", @col] > 0, @table["target_ev_multiple", @col] / @table["current_ev_multiple", @col] - 1, NA())',
    cells: {
      line_item: "3. EV/EBITDA multiple shift",
      notes: "Target vs. spot mult.",
    },
  })
  evAttribution.addRow("implied_ev_return", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '(1 + @table["ev_roll_forward", @col]) * (1 + @table["ev_forecast_delta", @col]) * (1 + @table["ev_multiple_delta", @col]) - 1',
    cells: {
      line_item: "Implied 2Y enterprise value return",
      notes: "Compounded EV factors",
    },
  })
  evAttribution.addRow("net_cash_bridge_factor", {
    ...rowFormatOptions("percentage", 2),
    expr: 'IF(AND(@table["ex_div_spot_price", @col] > 0, @table["current_ev_multiple", @col] > 0, @table["fy28_model_ebitda", @col] > 0), ((@table["fy28_implied_ev", @col] + @table["fy28_net_cash", @col]) / (@table["ex_div_spot_price", @col] * MarketAnchorsMarket["cost_diluted_shares", "val"])) / (1 + @table["implied_ev_return", @col]) - 1, NA())',
    cells: {
      line_item: "4. Net cash accumulation bridge",
      notes: "Equity vs. EV ratio",
    },
  })
  evAttribution.addRow("share_count_factor", {
    ...rowFormatOptions("percentage", 2),
    expr: 'MarketAnchorsMarket["cost_diluted_shares", "val"] / @table["fy28_ending_shares", @col] - 1',
    cells: {
      line_item: "5. Share count accretion / (dil.)",
      notes: "Spot / FY28E shares",
    },
  })
  evAttribution.addRow("ev_implied_price_return", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '(1 + @table["implied_ev_return", @col]) * (1 + @table["net_cash_bridge_factor", @col]) * (1 + @table["share_count_factor", @col]) - 1',
    cells: {
      line_item: "Implied 2Y price return (EV walk)",
      notes: "vs. ex-div. spot price",
    },
  })
  evAttribution.addRow("regular_dps_2y", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "7Q remaining reg. DPS (FY27–28E)",
      Downside:
        0.75 * (downSnap?.fy27RegDps ?? 5.88) + (downSnap?.fy28RegDps ?? 6.17),
      Base:
        0.75 * (baseSnap?.fy27RegDps ?? 5.88) + (baseSnap?.fy28RegDps ?? 6.35),
      Upside:
        0.75 * (upSnap?.fy27RegDps ?? 5.88) + (upSnap?.fy28RegDps ?? 6.47),
      active_live: {
        expr: '0.75 * IncomeStatement["regular_dps", "FY27E"] + IncomeStatement["regular_dps", "FY28E"]',
      },
      notes: "Excl. paid Q1 & spec.",
    },
  })
  evAttribution.addRow("regular_dps_yield", {
    ...rowFormatOptions("percentage", 2),
    expr: 'IF(@table["ex_div_spot_price", @col] > 0, @table["regular_dps_2y", @col] / @table["ex_div_spot_price", @col], NA())',
    cells: {
      line_item: "6. 2Y regular dividend yield",
      notes: "Regular DPS / ex-div.",
    },
  })
  evAttribution.addRow("ev_implied_tsr", {
    ...rowFormatOptions("percentage", 2),
    style: "total",
    highlight: true,
    expr: '@table["ev_implied_price_return", @col] + @table["regular_dps_yield", @col]',
    cells: {
      line_item: "Implied 2Y total return (EV walk)",
      notes: "Price return + reg. div.",
    },
  })
  evAttribution.addRow("ev_tsr_tie_out_check", {
    ...rowFormatOptions("percentage", 6),
    style: "bold",
    expr: 'IF(@table["ex_div_spot_price", @col] > 0, @table["ev_implied_tsr", @col] - ((@table["fy28_implied_price", @col] + @table["regular_dps_2y", @col]) / @table["ex_div_spot_price", @col] - 1), NA())',
    cells: {
      line_item: "EV walk TSR tie-out check",
      notes: "Walk − direct TSR",
    },
  })

  // 4. 2-Year Return Attribution — Companion Equity Walk (P / E to TSR)
  const peAttribution = sheet.addTable(
    "PublicPeAttribution",
    "2-Year Total Shareholder Return Attribution — Companion P/E Walk",
    {
      subtitle: [
        "Cross-checks EV/EBITDA 2-year TSR via consensus EPS roll-forward, forecast delta, and exit P/E re-rating",
        "Downside, Base, and Upside hold static scenario snapshots; Active tracks the active case",
      ],
      currency: "USD",
    }
  )
  peAttribution.addColumn("line_item", {
    role: "descriptor",
    header: "P/E return attribution step",
  })
  peAttribution.addColumn("Downside", {
    role: "measure",
    headers: ["Downside", "Case"],
  })
  peAttribution.addColumn("Base", {
    role: "measure",
    headers: ["Base", "Case"],
  })
  peAttribution.addColumn("Upside", {
    role: "measure",
    headers: ["Upside", "Case"],
  })
  peAttribution.addColumn("active_live", {
    role: "measure",
    headers: ["Active", "Case"],
    style: "bold",
  })
  peAttribution.addColumn("notes", {
    role: "descriptor",
    header: "Bridge basis",
  })

  peAttribution.addRow("current_ex_div_pe", {
    ...rowFormatOptions("multiple", 1),
    expr: 'PublicEvAttribution["ex_div_spot_price", @col] / MarketAnchorsConsensus["cons_eps_fy27", "val"]',
    cells: {
      line_item: "Ex-div. price / cons. FY27E EPS",
      notes: "Starting forward P/E",
    },
  })
  peAttribution.addRow("fy28_model_eps", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Scenario FY28E diluted EPS ($/sh)",
      Downside: downSnap?.fy28Eps ?? 23,
      Base: baseSnap?.fy28Eps ?? 25,
      Upside: upSnap?.fy28Eps ?? 27,
      active_live: { expr: 'IncomeStatement["diluted_eps", "FY28E"]' },
      notes: "Year-2 scenario EPS",
    },
  })
  peAttribution.addRow("implied_fy28_pe", {
    ...rowFormatOptions("multiple", 1),
    expr: 'IF(@table["fy28_model_eps", @col] > 0, PublicEvAttribution["fy28_implied_price", @col] / @table["fy28_model_eps", @col], NA())',
    cells: {
      line_item: "Implied FY28E exit P/E",
      notes: "Implied price / EPS",
    },
  })
  peAttribution.addRow("pe_eps_roll_forward", {
    ...rowFormatOptions("percentage", 2),
    expr: 'MarketAnchorsConsensus["cons_eps_fy28", "val"] / MarketAnchorsConsensus["cons_eps_fy27", "val"] - 1',
    cells: {
      line_item: "1. Consensus EPS roll-forward",
      notes: "Cons. FY28E / FY27E",
    },
  })
  peAttribution.addRow("pe_eps_forecast_delta", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["fy28_model_eps", @col] / MarketAnchorsConsensus["cons_eps_fy28", "val"] - 1',
    cells: {
      line_item: "2. Model vs. cons. FY28E EPS",
      notes: "Scenario EPS delta",
    },
  })
  peAttribution.addRow("pe_multiple_delta", {
    ...rowFormatOptions("percentage", 2),
    expr: 'IF(@table["current_ex_div_pe", @col] > 0, @table["implied_fy28_pe", @col] / @table["current_ex_div_pe", @col] - 1, NA())',
    cells: {
      line_item: "3. P/E multiple shift",
      notes: "Exit vs. starting P/E",
    },
  })
  peAttribution.addRow("pe_implied_price_return", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '(1 + @table["pe_eps_roll_forward", @col]) * (1 + @table["pe_eps_forecast_delta", @col]) * (1 + @table["pe_multiple_delta", @col]) - 1',
    cells: {
      line_item: "Implied 2Y price return (P/E walk)",
      notes: "Compounded P/E factors",
    },
  })
  peAttribution.addRow("pe_implied_tsr", {
    ...rowFormatOptions("percentage", 2),
    style: "total",
    expr: '@table["pe_implied_price_return", @col] + PublicEvAttribution["regular_dps_yield", @col]',
    cells: {
      line_item: "Implied 2Y total return (P/E walk)",
      notes: "Price return + reg. div.",
    },
  })
  peAttribution.addRow("pe_tsr_tie_out_check", {
    ...rowFormatOptions("percentage", 6),
    style: "bold",
    expr: 'IF(PublicEvAttribution["ex_div_spot_price", @col] > 0, @table["pe_implied_tsr", @col] - ((PublicEvAttribution["fy28_implied_price", @col] + PublicEvAttribution["regular_dps_2y", @col]) / PublicEvAttribution["ex_div_spot_price", @col] - 1), NA())',
    cells: {
      line_item: "P/E walk TSR tie-out check",
      notes: "Walk − direct TSR",
    },
  })

  return { footballField, scenarioVariance, evAttribution, peAttribution }
}
