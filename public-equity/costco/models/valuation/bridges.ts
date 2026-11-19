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
  readonly fy27Fcff: number
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
}

export function extractScenarioSnapshot(
  compiled: CompiledModel,
  scenario: ScenarioName
): ScenarioSnapshot {
  const netCash = compiled.num('DcfBridge["net_cash_bridge", "perp"]')
  const shares = compiled.num('DcfBridge["sec_shares", "perp"]')

  const pvBaseParams =
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY27E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY28E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY29E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY30E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY31E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY32E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY33E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY34E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY35E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "FY36E"]') +
    compiled.num('DcfSchedule["pv_fcff_at_base_params", "Terminal"]')

  const pvScWaccBaseG =
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY27E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY28E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY29E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY30E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY31E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY32E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY33E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY34E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY35E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "FY36E"]') +
    compiled.num('DcfSchedule["pv_fcff_sc_wacc_base_g", "Terminal"]')

  return Object.freeze({
    scenario,
    wacc: compiled.num('WaccSchedule["wacc", "val"]'),
    termGrowth: compiled.num(
      'ScalarAssumptionsActive["terminal_growth_rate", "val"]'
    ),
    exitMult: compiled.num(
      'ScalarAssumptionsActive["exit_ev_to_ebitda", "val"]'
    ),
    compsMult: compiled.num(
      'ScalarAssumptionsActive["calibrated_comps_ev_to_ebitda", "val"]'
    ),
    fy27Rev: compiled.num('IncomeStatement["total_revenue", "FY27E"]'),
    fy27Ebitda: compiled.num('IncomeStatement["ebitda", "FY27E"]'),
    fy27Ebit: compiled.num('IncomeStatement["operating_income", "FY27E"]'),
    fy27Fcff: compiled.num('InvestedCapitalROIC["unlevered_fcff", "FY27E"]'),
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
    perpPriceAtBaseWaccBaseG: (pvBaseParams + netCash) / shares,
    perpPriceAtScWaccBaseG: (pvScWaccBaseG + netCash) / shares,
  })
}

export function buildValuationBridges(
  sheet: Sheet,
  snapshots: Readonly<Record<ScenarioName, ScenarioSnapshot>> | null,
  belowTarget: Table
): {
  readonly footballField: Table
  readonly scenarioVariance: Table
  readonly priceAttribution: Table
} {
  // 1. Football Field Valuation Synthesis (100% live weights)
  const footballField = sheet.addTable(
    "FootballField",
    "Valuation Football Field & Blended Target Price ($M / $/sh)",
    {
      subtitle: [
        "50% Primary Perpetuity DCF / 25% Exit-Multiple DCF / 25% Quality-Calibrated FY27E Comps (weights sum to 100.0%)",
        "Synthesizes Enterprise Value ($M) and Cum-Dividend vs. Ex-$30.00/sh Special Dividend target prices against $1,106.21 close",
      ],
      currency: "USD",
      below: belowTarget,
    }
  )
  footballField.addColumn("line_item", {
    role: "descriptor",
    header: "Valuation Methodology",
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
    headers: ["Cum-Div", "Price"],
    format: "currency",
    decimals: 2,
  })
  footballField.addColumn("ex_div_price", {
    role: "measure",
    headers: ["Ex-$30 Div", "Price"],
    format: "currency",
    decimals: 2,
  })
  footballField.addColumn("vs_close_pct", {
    role: "measure",
    headers: ["vs. Close", "($1,106)"],
    format: "percentage",
    decimals: 1,
  })
  footballField.addColumn("weighted_cum_div", {
    role: "measure",
    headers: ["Wtd.", "Cum-Div"],
    format: "currency",
    decimals: 2,
  })
  footballField.addColumn("weighted_ex_div", {
    role: "measure",
    headers: ["Wtd.", "Ex-Div"],
    format: "currency",
    decimals: 2,
  })

  footballField.addRow("perp_dcf", {
    cells: {
      line_item: "1. Unlevered Perpetuity-Growth DCF (Primary)",
      weight: { expr: 'ScalarAssumptionsActive["weight_perp_dcf", "val"]' },
      ev: { expr: 'DcfBridge["enterprise_value", "perp"]' },
      cum_div_price: { expr: 'DcfBridge["implied_price_cum_div", "perp"]' },
      ex_div_price: { expr: 'DcfBridge["implied_price_ex_div", "perp"]' },
      vs_close_pct: {
        expr: '@table[@row, "cum_div_price"] / MarketAnchors["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: '@table[@row, "weight"] * @table[@row, "cum_div_price"]',
      },
      weighted_ex_div: {
        expr: '@table[@row, "weight"] * @table[@row, "ex_div_price"]',
      },
    },
  })
  footballField.addRow("exit_mult_dcf", {
    cells: {
      line_item: "2. Exit EV/EBITDA DCF (Cross-Check)",
      weight: { expr: 'ScalarAssumptionsActive["weight_exit_dcf", "val"]' },
      ev: { expr: 'DcfBridge["enterprise_value", "exit_mult"]' },
      cum_div_price: {
        expr: 'DcfBridge["implied_price_cum_div", "exit_mult"]',
      },
      ex_div_price: { expr: 'DcfBridge["implied_price_ex_div", "exit_mult"]' },
      vs_close_pct: {
        expr: '@table[@row, "cum_div_price"] / MarketAnchors["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: '@table[@row, "weight"] * @table[@row, "cum_div_price"]',
      },
      weighted_ex_div: {
        expr: '@table[@row, "weight"] * @table[@row, "ex_div_price"]',
      },
    },
  })
  footballField.addRow("calibrated_comps", {
    cells: {
      line_item: {
        value: "3. Quality-Calibrated FY27E EV/EBITDA Comps",
        note: "Weight derived residually as 1 - Perp Weight - Exit Weight.",
      },
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
        expr: '@table[@row, "cum_div_price"] / MarketAnchors["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: '@table[@row, "weight"] * @table[@row, "cum_div_price"]',
      },
      weighted_ex_div: {
        expr: '@table[@row, "weight"] * @table[@row, "ex_div_price"]',
      },
    },
  })
  footballField.addRow("blended_total", {
    style: "total",
    highlight: true,
    cells: {
      line_item: "Blended Intrinsic Target Price (Active Scenario)",
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
        expr: '@table["blended_total", "cum_div_price"] / MarketAnchors["cost_close_price", "val"] - 1',
      },
      weighted_cum_div: {
        expr: 'SUM(@table["perp_dcf".."calibrated_comps", "weighted_cum_div"])',
      },
      weighted_ex_div: {
        expr: 'SUM(@table["perp_dcf".."calibrated_comps", "weighted_ex_div"])',
      },
    },
  })

  // 2. Scenario Variance Attribution Bridge (Base -> Bull, Base -> Bear, and Live Active vs Base)
  const scenarioVariance = sheet.addTable(
    "ScenarioVariance",
    "Scenario Value Attribution Bridge — Perpetuity DCF Cum-Dividend Price ($/sh)",
    {
      subtitle: [
        "Decomposes Perpetuity DCF Cum-Div price delta ($/sh) into (1) Operating CF/Tax, (2) WACC & (3) Terminal g",
        "Active vs. Base column recalculates dynamically via live intermediate PV rows on DcfSchedule",
        "Base starting anchor, Base -> Bull & Base -> Bear columns hold static multi-scenario compile snapshots",
      ],
      currency: "USD",
      below: footballField,
    }
  )
  scenarioVariance.addColumn("line_item", {
    role: "descriptor",
    header: "Attribution Bridge Component ($/sh)",
  })
  scenarioVariance.addColumn("active_live", {
    role: "measure",
    headers: ["Active vs.", "Base"],
  })
  scenarioVariance.addColumn("base_to_bull", {
    role: "measure",
    headers: ["Base ->", "Bull"],
  })
  scenarioVariance.addColumn("base_to_bear", {
    role: "measure",
    headers: ["Base ->", "Bear"],
  })

  const baseSnap = snapshots?.Base ?? null
  const bullSnap = snapshots?.Bull ?? null
  const bearSnap = snapshots?.Bear ?? null

  const basePerpVal = baseSnap?.perpCumPrice ?? 0
  const bullAtBaseParams = bullSnap?.perpPriceAtBaseWaccBaseG ?? 0
  const bullAtScWaccBaseG = bullSnap?.perpPriceAtScWaccBaseG ?? 0
  const bullActual = bullSnap?.perpCumPrice ?? 0

  const bearAtBaseParams = bearSnap?.perpPriceAtBaseWaccBaseG ?? 0
  const bearAtScWaccBaseG = bearSnap?.perpPriceAtScWaccBaseG ?? 0
  const bearActual = bearSnap?.perpCumPrice ?? 0

  scenarioVariance.addRow("base_starting_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Starting Base Case Perp DCF Cum-Div Price",
      active_live: basePerpVal,
      base_to_bull: basePerpVal,
      base_to_bear: basePerpVal,
    },
  })
  scenarioVariance.addRow("op_cf_effect", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "1. Operating Cash Flow & Tax Delta (at Base WACC & Base g)",
      active_live: {
        expr: '((SUM(DcfSchedule["pv_fcff_at_base_params", "FY27E".."Terminal"]) + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["sec_shares", "perp"]) - @table["base_starting_price", "active_live"]',
      },
      base_to_bull: bullAtBaseParams - basePerpVal,
      base_to_bear: bearAtBaseParams - basePerpVal,
    },
  })
  scenarioVariance.addRow("wacc_effect", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "2. Discount Rate (WACC) Delta (at Scenario CF & Base g)",
      active_live: {
        expr: '((SUM(DcfSchedule["pv_fcff_sc_wacc_base_g", "FY27E".."Terminal"]) + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["sec_shares", "perp"]) - ((SUM(DcfSchedule["pv_fcff_at_base_params", "FY27E".."Terminal"]) + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["sec_shares", "perp"])',
      },
      base_to_bull: bullAtScWaccBaseG - bullAtBaseParams,
      base_to_bear: bearAtScWaccBaseG - bearAtBaseParams,
    },
  })
  scenarioVariance.addRow("term_g_effect", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item:
        "3. Terminal Growth (g) Delta (at Scenario CF & Scenario WACC)",
      active_live: {
        expr: 'DcfBridge["implied_price_cum_div", "perp"] - ((SUM(DcfSchedule["pv_fcff_sc_wacc_base_g", "FY27E".."Terminal"]) + DcfBridge["net_cash_bridge", "perp"]) / DcfBridge["sec_shares", "perp"])',
      },
      base_to_bull: bullActual - bullAtScWaccBaseG,
      base_to_bear: bearActual - bearAtScWaccBaseG,
    },
  })
  scenarioVariance.addRow("reconciled_target_price", {
    ...rowFormatOptions("currency", 2),
    style: "total",
    expr: 'SUM(@table["base_starting_price".."term_g_effect", @col])',
    cells: {
      line_item: "Reconciled Ending Scenario Perp DCF Cum-Div Price",
    },
  })
  scenarioVariance.addRow("scenario_actual_price", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Scenario Actual Perp DCF Cum-Div Price",
      active_live: { expr: 'DcfBridge["implied_price_cum_div", "perp"]' },
      base_to_bull: bullActual,
      base_to_bear: bearActual,
    },
  })
  scenarioVariance.addRow("tie_out_check", {
    ...rowFormatOptions("currency", 4),
    highlight: true,
    expr: '@table["reconciled_target_price", @col] - @table["scenario_actual_price", @col]',
    cells: {
      line_item: "Scenario Variance Bridge Tie-Out Check (= 0)",
    },
  })

  // 3. Public Price Attribution Bridge: Market EV ($476.5B ex-op-lease) -> Calibrated Comps Target
  const priceAttribution = sheet.addTable(
    "PublicPriceAttribution",
    "Market-to-Model Price Return Attribution (FY27E EV/EBITDA Comps Walk)",
    {
      subtitle: [
        "Decomposes return vs. $1,106.21 close into (1) Model vs. Street EBITDA delta,",
        "(2) FY27E EV/EBITDA multiple compression & (3) algebraic Net Cash cushion",
      ],
      currency: "USD",
      below: scenarioVariance,
    }
  )
  priceAttribution.addColumn("line_item", {
    role: "descriptor",
    header: "Attribution Step",
  })
  priceAttribution.addColumn("val", {
    role: "measure",
    headers: ["Active", "Scenario"],
  })

  priceAttribution.addRow("current_ev_multiple", {
    ...rowFormatOptions("multiple", 2),
    cells: {
      line_item: "Current EV / Consensus FY27E EBITDA (Ex-Op-Lease EV Basis)",
      val: {
        expr: 'DcfBridge["current_market_ev", "perp"] / TradingCompsForward["COST", "ebitda_27"]',
      },
    },
  })
  priceAttribution.addRow("model_vs_cons_ebitda_factor", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item:
        "1. Forecast Fundamental Delta (Model vs. Consensus FY27E EBITDA)",
      val: {
        expr: 'IncomeStatement["ebitda", "FY27E"] / TradingCompsForward["COST", "ebitda_27"] - 1',
      },
    },
  })
  priceAttribution.addRow("multiple_rerating_factor", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item:
        "2. Multiple Compression Factor (Calibrated Target / Current EV/EBITDA)",
      val: {
        expr: 'ScalarAssumptionsActive["calibrated_comps_ev_to_ebitda", "val"] / @table["current_ev_multiple", "val"] - 1',
      },
    },
  })
  priceAttribution.addRow("implied_ev_return", {
    ...rowFormatOptions("percentage", 2),
    style: "subtotal",
    cells: {
      line_item:
        "Implied Enterprise Value Return = (1 + Delta) x (1 + Multiple) - 1",
      val: {
        expr: '(1 + @table["model_vs_cons_ebitda_factor", "val"]) * (1 + @table["multiple_rerating_factor", "val"]) - 1',
      },
    },
  })
  priceAttribution.addRow("ev_return_check", {
    ...rowFormatOptions("percentage", 4),
    cells: {
      line_item: "EV Return Direct Formula Check (Implied EV / Current EV - 1)",
      val: {
        expr: 'CompsValuationCalibration["implied_ev", "val"] / DcfBridge["current_market_ev", "perp"] - 1',
      },
    },
  })
  priceAttribution.addRow("net_cash_cushion_effect", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item:
        "3. Net Cash Bridge Cushion (-EV Return x Comps Net Cash / Market Cap)",
      val: {
        expr: '-@table["implied_ev_return", "val"] * CompsValuationCalibration["net_cash_bridge", "val"] / WaccSchedule["market_equity_value", "val"]',
      },
    },
  })
  priceAttribution.addRow("implied_equity_price_return", {
    ...rowFormatOptions("percentage", 2),
    style: "total",
    cells: {
      line_item: "Reconciled Implied Per-Share Return vs. $1,106.21 Close",
      val: {
        expr: '@table["implied_ev_return", "val"] + @table["net_cash_cushion_effect", "val"]',
      },
    },
  })
  priceAttribution.addRow("equity_return_check", {
    ...rowFormatOptions("percentage", 6),
    highlight: true,
    cells: {
      line_item: "Equity Return Bridge Tie-Out Check (= 0)",
      val: {
        expr: '@table["implied_equity_price_return", "val"] - CompsValuationCalibration["upside_downside_cum", "val"]',
      },
    },
  })

  return { footballField, scenarioVariance, priceAttribution }
}
