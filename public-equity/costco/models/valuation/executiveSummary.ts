import type { Sheet } from "f8-engine"
import { ALL_SCENARIO_DRIVERS } from "../assumptions/index.ts"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  ANCHOR_BS_DATE_TUPLE,
  SCENARIO_INDEX,
  VALUATION_DATE_TUPLE,
  dateFormula,
  rowFormatOptions,
  type ScenarioName,
} from "../timeline.ts"
import { buildValuationBridges, type ScenarioSnapshot } from "./bridges.ts"

export function buildExecutiveSummarySheet(
  sheet: Sheet,
  kg: CostcoKnowledgeData,
  activeScenario: ScenarioName,
  snapshots: Readonly<Record<ScenarioName, ScenarioSnapshot>> | null
): void {
  // 1. Live Scenario Control Switch
  const control = sheet.addTable(
    "ScenarioControl",
    "Model Control Panel & Valuation Date Anchors",
    {
      subtitle: [
        `Active Scenario: ${activeScenario} (1 = Base, 2 = Bull, 3 = Bear; $M except per-share)`,
        ...ALL_SCENARIO_DRIVERS[activeScenario].thesis.split("; "),
      ],
      currency: "USD",
    }
  )
  control.addColumn("line_item", {
    role: "descriptor",
    header: "Control Parameter",
  })
  control.addColumn("val", {
    role: "measure",
    header: "Setting",
  })

  control.addRow("active_idx", {
    ...rowFormatOptions("integer"),
    highlight: true,
    cells: {
      line_item: {
        value: "Active Scenario Selector (1 = Base, 2 = Bull, 3 = Bear)",
        note: "Toggle between 1, 2, and 3 in Excel to dynamically recalculate every schedule, statement, DCF, and bridge.",
      },
      val: SCENARIO_INDEX[activeScenario],
    },
  })
  control.addRow("active_scenario_name", {
    ...rowFormatOptions("text"),
    cells: {
      line_item: "Active Scenario Label",
      val: {
        expr: 'CHOOSE(@table["active_idx", "val"], "Base", "Bull", "Bear")',
      },
    },
  })
  control.addRow("valuation_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Market Valuation Date (2026-11-13 Close)",
      val: { expr: dateFormula(VALUATION_DATE_TUPLE) },
    },
  })
  control.addRow("anchor_bs_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Latest Audited Balance Sheet Anchor (FY26 End)",
      val: { expr: dateFormula(ANCHOR_BS_DATE_TUPLE) },
    },
  })
  control.addRow("ex_special_div_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Special Cash Dividend ($30.00/sh) Ex-Dividend Date",
      val: { expr: "DATE(2026, 11, 24)" },
    },
  })
  control.addRow("special_div_pay_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Special Cash Dividend Payment Date ($13,294M)",
      val: { expr: "DATE(2026, 12, 4)" },
    },
  })

  // 2. Executive KPI & Thesis Scorecard
  const kpiTable = sheet.addTable(
    "ExecutiveKPIs",
    "Executive Thesis Scorecard — Market Expectations vs. Intrinsic Valuation",
    {
      subtitle: [
        "Short Fundamental Overvaluation Thesis at 2026-11-13 ($1,106.21/sh cum-$30 div)",
        kg.citations.equityQuotes,
      ],
      currency: "USD",
      below: control,
    }
  )
  kpiTable.addColumn("line_item", {
    role: "descriptor",
    header: "Key Metric / Benchmark",
  })
  kpiTable.addColumn("val", {
    role: "measure",
    header: "Value",
  })

  kpiTable.addSectionHeader("Market Snapshot (2026-11-13)")
  kpiTable.addRow("close_price_cum", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Closing Share Price (Cum-$30.00/sh Special Dividend)",
      val: { expr: 'MarketAnchors["cost_close_price", "val"]' },
    },
  })
  kpiTable.addRow("implied_ex_div_market", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Implied Ex-Dividend Reference Price ($1,106.21 - $30.00)",
      val: {
        expr: '@table["close_price_cum", "val"] - ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]',
      },
    },
  })
  kpiTable.addRow("market_cap", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Market Capitalization ($M, 443.129M SEC shares)",
      val: { expr: 'WaccSchedule["market_equity_value", "val"]' },
    },
  })
  kpiTable.addRow("enterprise_value", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Current Enterprise Value ($M, ex-op-lease net cash $13,726M)",
        note: "Matches post-operating-lease-rent FCFF/EBITDA ($476,468M); headline EV incl. $2,606M ASC 842 operating leases is $479,074M.",
      },
      val: { expr: 'DcfBridge["current_market_ev", "perp"]' },
    },
  })
  kpiTable.addRow("fy27e_cons_pe", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Market Price / Consensus FY27E EPS",
      val: { expr: 'TradingCompsForward["COST", "pe_27"]' },
    },
  })
  kpiTable.addRow("fy27e_cons_ev_ebitda", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Current EV / Consensus FY27E EBITDA",
      val: { expr: 'TradingCompsForward["COST", "ev_ebitda_27"]' },
    },
  })
  kpiTable.addRow("fy27e_cons_fcf_yield_ev", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Consensus FY27E FCF Yield on Current EV vs. 5.15% 10Y UST",
      val: {
        expr: 'MarketAnchors["cons_fcf_fy27", "val"] / @table["enterprise_value", "val"]',
      },
    },
  })
  kpiTable.addRow("rf_par_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Risk-Free 10Y U.S. Treasury Par Yield (2026-11-13)",
      val: { expr: 'MarketAnchors["rf_par_10y", "val"]' },
    },
  })
  kpiTable.addRow("active_wacc", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Active Model WACC (CAPM + AA OAS)",
      val: { expr: 'WaccSchedule["wacc", "val"]' },
    },
  })
  kpiTable.addRow("blended_target_cum", {
    ...rowFormatOptions("currency", 2),
    style: "subtotal",
    highlight: true,
    cells: {
      line_item: "Blended Target Price — Cum-Dividend ($/sh)",
      val: { expr: 'FootballField["blended_total", "cum_div_price"]' },
    },
  })
  kpiTable.addRow("blended_target_ex", {
    ...rowFormatOptions("currency", 2),
    style: "total",
    cells: {
      line_item: "Blended Target Price — Ex-$30.00/sh Special Dividend ($/sh)",
      val: { expr: 'FootballField["blended_total", "ex_div_price"]' },
    },
  })
  kpiTable.addRow("blended_upside_cum", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Implied Target Return vs. $1,106.21 Close",
      val: { expr: 'FootballField["blended_total", "vs_close_pct"]' },
    },
  })

  // 3. Side-by-Side Scenario Comparison Table (Live Active + Compiled Base/Bull/Bear)
  const scenarioSummary = sheet.addTable(
    "ScenarioSummary",
    "Scenario Matrix — Live Active vs. Base, Bull & Bear Scenarios ($M / $/sh)",
    {
      subtitle: [
        "Active (Live) column recalculates dynamically with the ScenarioControl switch ($M / $/sh / x)",
        "Base, Bull & Bear columns hold static multi-compile scenario snapshots; Bull/Bear vs. Base deltas are live formulas",
      ],
      currency: "USD",
      below: kpiTable,
    }
  )
  scenarioSummary.addColumn("line_item", {
    role: "descriptor",
    header: "Operating / Valuation Metric",
  })
  scenarioSummary.addColumn("active_live", {
    role: "measure",
    headers: ["Active", "(Live)"],
  })
  scenarioSummary.addColumn("base_static", {
    role: "measure",
    headers: ["Base", "Case"],
  })
  scenarioSummary.addColumn("bull_static", {
    role: "measure",
    headers: ["Bull", "Case"],
  })
  scenarioSummary.addColumn("bear_static", {
    role: "measure",
    headers: ["Bear", "Case"],
  })
  scenarioSummary.addColumn("bull_vs_base", {
    role: "measure",
    headers: ["Bull vs.", "Base"],
  })
  scenarioSummary.addColumn("bear_vs_base", {
    role: "measure",
    headers: ["Bear vs.", "Base"],
  })

  const baseSnap = snapshots?.Base ?? null
  const bullSnap = snapshots?.Bull ?? null
  const bearSnap = snapshots?.Bear ?? null

  const addScenarioRow = (
    id: string,
    label: string,
    format: "currency" | "percentage" | "multiple",
    decimals: number,
    liveExpr: string,
    getter: (s: ScenarioSnapshot) => number,
    style?: "subtotal" | "total",
    highlight?: boolean
  ): void => {
    const fmt = rowFormatOptions(format, decimals)
    scenarioSummary.addRow(id, {
      ...fmt,
      ...(style ? { style } : {}),
      ...(highlight ? { highlight } : {}),
      cells: {
        line_item: label,
        active_live: { expr: liveExpr },
        base_static: baseSnap ? getter(baseSnap) : 0,
        bull_static: bullSnap ? getter(bullSnap) : 0,
        bear_static: bearSnap ? getter(bearSnap) : 0,
        bull_vs_base: {
          expr: '@table[@row, "bull_static"] - @table[@row, "base_static"]',
        },
        bear_vs_base: {
          expr: '@table[@row, "bear_static"] - @table[@row, "base_static"]',
        },
      },
    })
  }

  scenarioSummary.addSectionHeader("Key Rate & Valuation Inputs")
  addScenarioRow(
    "wacc",
    "WACC (CAPM + AA OAS)",
    "percentage",
    2,
    'WaccSchedule["wacc", "val"]',
    (s) => s.wacc
  )
  addScenarioRow(
    "term_g",
    "Terminal Perpetuity Growth (g)",
    "percentage",
    2,
    'ScalarAssumptionsActive["terminal_growth_rate", "val"]',
    (s) => s.termGrowth
  )
  addScenarioRow(
    "exit_mult",
    "Exit EV / FY36E EBITDA Cross-Check",
    "multiple",
    1,
    'ScalarAssumptionsActive["exit_ev_to_ebitda", "val"]',
    (s) => s.exitMult
  )
  addScenarioRow(
    "comps_mult",
    "Calibrated FY27E EV / EBITDA Multiple",
    "multiple",
    1,
    'ScalarAssumptionsActive["calibrated_comps_ev_to_ebitda", "val"]',
    (s) => s.compsMult
  )

  scenarioSummary.addSectionHeader("Operating Trajectory ($M)")
  addScenarioRow(
    "fy27_rev",
    "FY27E Total Revenue ($M)",
    "currency",
    0,
    'IncomeStatement["total_revenue", "FY27E"]',
    (s) => s.fy27Rev
  )
  addScenarioRow(
    "fy27_ebitda",
    "FY27E EBITDA ($M)",
    "currency",
    0,
    'IncomeStatement["ebitda", "FY27E"]',
    (s) => s.fy27Ebitda
  )
  addScenarioRow(
    "fy36_rev",
    "FY36E Total Revenue ($M)",
    "currency",
    0,
    'IncomeStatement["total_revenue", "FY36E"]',
    (s) => s.fy36Rev
  )
  addScenarioRow(
    "fy36_ebit",
    "FY36E EBIT ($M)",
    "currency",
    0,
    'IncomeStatement["operating_income", "FY36E"]',
    (s) => s.fy36Ebit
  )
  addScenarioRow(
    "fy36_ebitda",
    "FY36E EBITDA ($M)",
    "currency",
    0,
    'IncomeStatement["ebitda", "FY36E"]',
    (s) => s.fy36Ebitda
  )
  addScenarioRow(
    "fy36_fcff",
    "FY36E Unlevered FCFF ($M)",
    "currency",
    0,
    'InvestedCapitalROIC["unlevered_fcff", "FY36E"]',
    (s) => s.fy36Fcff
  )
  addScenarioRow(
    "fy36_roic",
    "FY36E ROIC (%)",
    "percentage",
    1,
    'InvestedCapitalROIC["roic", "FY36E"]',
    (s) => s.fy36Roic
  )

  scenarioSummary.addSectionHeader(
    "Implied Intrinsic & Comps Share Prices ($/sh)"
  )
  addScenarioRow(
    "perp_cum",
    "Perpetuity DCF Price — Cum-Dividend ($/sh)",
    "currency",
    2,
    'DcfBridge["implied_price_cum_div", "perp"]',
    (s) => s.perpCumPrice,
    "subtotal"
  )
  addScenarioRow(
    "perp_ex",
    "Perpetuity DCF Price — Ex-$30.00/sh Special Div ($/sh)",
    "currency",
    2,
    'DcfBridge["implied_price_ex_div", "perp"]',
    (s) => s.perpExPrice
  )
  addScenarioRow(
    "exit_cum",
    "Exit-Multiple DCF Price — Cum-Dividend ($/sh)",
    "currency",
    2,
    'DcfBridge["implied_price_cum_div", "exit_mult"]',
    (s) => s.exitCumPrice
  )
  addScenarioRow(
    "exit_ex",
    "Exit-Multiple DCF Price — Ex-$30.00/sh Special Div ($/sh)",
    "currency",
    2,
    'DcfBridge["implied_price_ex_div", "exit_mult"]',
    (s) => s.exitExPrice
  )
  addScenarioRow(
    "comps_cum",
    "Calibrated Comps Price — Cum-Dividend ($/sh)",
    "currency",
    2,
    'CompsValuationCalibration["implied_price_cum_div", "val"]',
    (s) => s.compsCumPrice
  )
  addScenarioRow(
    "blended_cum",
    "Blended Target Price — Cum-Dividend ($/sh)",
    "currency",
    2,
    'FootballField["blended_total", "cum_div_price"]',
    (s) => s.blendedCumPrice,
    "total",
    true
  )
  addScenarioRow(
    "blended_ex",
    "Blended Target Price — Ex-$30.00/sh Special Div ($/sh)",
    "currency",
    2,
    'FootballField["blended_total", "ex_div_price"]',
    (s) => s.blendedExPrice,
    "subtotal"
  )

  // 4. Football Field, Scenario Variance & Public Price Attribution
  buildValuationBridges(sheet, snapshots, scenarioSummary)
}
