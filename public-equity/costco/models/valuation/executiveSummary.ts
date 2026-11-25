import type { Sheet, Table } from "f8-engine"
import type { CostcoKnowledgeData } from "../kg.ts"
import {
  ANCHOR_BS_DATE_TUPLE,
  SCENARIO_INDEX,
  VALUATION_DATE_TUPLE,
  dateFormula,
  notedNull,
  rowFormatOptions,
  type ScenarioName,
} from "../timeline.ts"
import type { ScenarioSnapshot } from "./bridges.ts"

export function buildExecutiveSummaryTables(
  sheet: Sheet,
  kg: CostcoKnowledgeData,
  activeScenario: ScenarioName,
  snapshots: Readonly<Record<ScenarioName, ScenarioSnapshot>> | null
): {
  readonly control: Table
  readonly kpiTable: Table
  readonly scenarioSummary: Table
  readonly consensusTable: Table
} {
  // Control panel & date anchors
  const control = sheet.addTable(
    "ScenarioControl",
    "Model Control Panel & Date Anchors",
    {
      subtitle: [
        "Select active case index (1=Downside, 2=Base, 3=Upside)",
        "Key valuation, balance-sheet & dividend dates",
      ],
      currency: "USD",
    }
  )
  control.addColumn("line_item", {
    role: "descriptor",
    header: "Control parameter",
  })
  control.addColumn("val", {
    role: "measure",
    header: "Setting",
    style: "bold",
  })
  control.addColumn("notes", {
    role: "descriptor",
    header: "Ref.",
  })

  control.addRow("active_idx", {
    ...rowFormatOptions("integer"),
    highlight: true,
    cells: {
      line_item: "Active case index (1/2/3)",
      val: {
        value: SCENARIO_INDEX[activeScenario],
        note: "1 = Downside, 2 = Base, 3 = Upside.",
      },
      notes: "1/2/3",
    },
  })
  control.addRow("active_scenario_name", {
    ...rowFormatOptions("text"),
    cells: {
      line_item: "Active case label",
      val: {
        expr: 'CHOOSE(@table["active_idx", "val"], "Downside", "Base", "Upside")',
      },
      notes: "Active",
    },
  })
  control.addRow("valuation_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Valuation date (market close)",
      val: { expr: dateFormula(VALUATION_DATE_TUPLE) },
      notes: "Close",
    },
  })
  control.addRow("anchor_bs_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Latest audited balance sheet",
      val: { expr: dateFormula(ANCHOR_BS_DATE_TUPLE) },
      notes: "FY26 10-K",
    },
  })
  control.addRow("ex_special_div_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Special dividend ex-date",
      val: { expr: "DATE(2026, 11, 24)" },
      notes: "Ex-div.",
    },
  })
  control.addRow("special_div_pay_date", {
    ...rowFormatOptions("date"),
    cells: {
      line_item: "Special dividend pay date",
      val: { expr: "DATE(2026, 12, 4)" },
      notes: "Payable",
    },
  })

  const kpiTable = sheet.addTable(
    "ExecutiveKPIs",
    "Market Snapshot & Intrinsic Valuation Summary",
    {
      subtitle: [
        "Spot pricing vs. active case valuation (2026-11-13)",
        kg.citations.equityQuotes,
      ],
      currency: "USD",
    }
  )
  kpiTable.addColumn("line_item", {
    role: "descriptor",
    header: "Key metric",
  })
  kpiTable.addColumn("val", {
    role: "measure",
    header: "Value",
    style: "bold",
  })
  kpiTable.addColumn("notes", {
    role: "descriptor",
    header: "Basis / Context",
  })

  kpiTable.addSectionHeader("Market pricing and valuation")
  kpiTable.addRow("close_price_cum", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Spot share price (cum-div.)",
      val: { expr: 'MarketAnchors["cost_close_price", "val"]' },
      notes: "2026-11-13 close",
    },
  })
  kpiTable.addRow("implied_ex_div_market", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Implied ex-special-div. price",
      val: {
        expr: '@table["close_price_cum", "val"] - ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]',
      },
      notes: "Spot less special div.",
    },
  })
  kpiTable.addRow("market_cap", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Market capitalization ($M)",
      val: { expr: 'WaccSchedule["market_equity_value", "val"]' },
      notes: "Diluted shares (TSM)",
    },
  })
  kpiTable.addRow("enterprise_value", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Spot EV (ex-op. leases, $M)",
      val: {
        expr: 'DcfBridge["current_market_ev", "perp"]',
        note: "Ex-operating-lease EV (diluted shares, LT debt fair value, net of paid Q1 regular dividend); aligns with post-rent FCFF and valuation-date bridges.",
      },
      notes: "Matches DCF bridge",
    },
  })
  kpiTable.addRow("fy27e_cons_pe", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Spot P / consensus FY27E EPS",
      val: { expr: 'TradingCompsForward["COST", "pe_27"]' },
      notes: "Cum-dividend close",
    },
  })
  kpiTable.addRow("fy27e_cons_ev_ebitda", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Spot EV / cons. FY27E EBITDA",
      val: {
        expr: '@table["enterprise_value", "val"] / MarketAnchors["cons_ebitda_fy27", "val"]',
      },
      notes: "Valuation-date EV",
    },
  })
  kpiTable.addRow("fy27e_cons_fcf_yield_ev", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Cons. FY27E FCF yield on EV",
      val: {
        expr: 'IF(@table["enterprise_value", "val"] > 0, MarketAnchors["cons_fcf_fy27", "val"] / @table["enterprise_value", "val"], NA())',
      },
      notes: "vs. 10Y Treasury yield",
    },
  })
  kpiTable.addRow("rf_par_10y", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "U.S. 10Y Treasury par yield",
      val: { expr: 'MarketAnchors["rf_par_10y", "val"]' },
      notes: "2026-11-13 CMT par",
    },
  })
  kpiTable.addRow("active_wacc", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Active WACC (5Y monthly beta)",
      val: { expr: 'WaccSchedule["wacc", "val"]' },
      notes: "CAPM + AA OAS",
    },
  })
  kpiTable.addRow("implied_wacc_mkt", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Market-implied WACC (active g)",
      val: { expr: 'ReverseDcfTable["implied_wacc_at_base_g", "val"]' },
      notes: "At active FCFF path",
    },
  })
  kpiTable.addRow("blended_target_cum", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    highlight: true,
    cells: {
      line_item: "Blended value (cum-div., $/sh)",
      val: { expr: 'FootballField["blended_total", "cum_div_price"]' },
      notes: "Weighted method blend",
    },
  })
  kpiTable.addRow("blended_target_ex", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    cells: {
      line_item: "Blended value (ex-div., $/sh)",
      val: { expr: 'FootballField["blended_total", "ex_div_price"]' },
      notes: "Post-Nov 24 ex-date",
    },
  })
  kpiTable.addRow("blended_upside_cum", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Implied variance vs. spot (%)",
      val: { expr: 'FootballField["blended_total", "vs_close_pct"]' },
      notes: "Cum-dividend basis",
    },
  })

  // Side-by-side scenario matrix
  const scenarioSummary = sheet.addTable(
    "ScenarioSummary",
    "Scenario Comparison — Downside, Base, Upside & Active ($M / $/sh)",
    {
      subtitle: [
        "Downside, Base, and Upside hold static scenario snapshots; Active and spreads track the active case ($M / $/sh)",
        "Active case outputs recalculate dynamically when the active case index changes",
      ],
      currency: "USD",
    }
  )
  scenarioSummary.addColumn("line_item", {
    role: "descriptor",
    header: "Operating / Valuation metric",
  })
  scenarioSummary.addColumn("downside_static", {
    role: "measure",
    headers: ["Downside", "Case"],
  })
  scenarioSummary.addColumn("base_static", {
    role: "measure",
    headers: ["Base", "Case"],
  })
  scenarioSummary.addColumn("upside_static", {
    role: "measure",
    headers: ["Upside", "Case"],
  })
  scenarioSummary.addColumn("active_live", {
    role: "measure",
    headers: ["Active", "Case"],
    style: "bold",
  })
  scenarioSummary.addColumn("downside_vs_base", {
    role: "measure",
    headers: ["Down vs.", "Base"],
  })
  scenarioSummary.addColumn("upside_vs_base", {
    role: "measure",
    headers: ["Up vs.", "Base"],
  })
  scenarioSummary.addColumn("notes", {
    role: "descriptor",
    header: "Notes",
  })

  const downSnap = snapshots?.Downside ?? null
  const baseSnap = snapshots?.Base ?? null
  const upSnap = snapshots?.Upside ?? null

  const addScenarioRow = (
    id: string,
    label: string,
    format: "currency" | "percentage" | "multiple",
    decimals: number,
    liveExpr: string,
    getter: (s: ScenarioSnapshot) => number,
    notes: string,
    style?: "bold" | "subtotal" | "total",
    highlight?: boolean
  ): void => {
    const fmt = rowFormatOptions(format, decimals)
    scenarioSummary.addRow(id, {
      ...fmt,
      ...(style ? { style } : {}),
      ...(highlight ? { highlight } : {}),
      cells: {
        line_item: label,
        downside_static: downSnap ? getter(downSnap) : 0,
        base_static: baseSnap ? getter(baseSnap) : 0,
        upside_static: upSnap ? getter(upSnap) : 0,
        active_live: { expr: liveExpr },
        downside_vs_base: {
          expr: '@table[@row, "downside_static"] - @table[@row, "base_static"]',
        },
        upside_vs_base: {
          expr: '@table[@row, "upside_static"] - @table[@row, "base_static"]',
        },
        notes,
      },
    })
  }

  scenarioSummary.addSectionHeader("Key rate and valuation parameters")
  addScenarioRow(
    "wacc",
    "WACC (5Y monthly beta)",
    "percentage",
    2,
    'WaccSchedule["wacc", "val"]',
    (s) => s.wacc,
    "CAPM + AA OAS"
  )
  addScenarioRow(
    "term_g",
    "Terminal perpetuity growth (g)",
    "percentage",
    2,
    'ScalarAssumptionsActive["terminal_growth_rate", "val"]',
    (s) => s.termGrowth,
    "<= nominal GDP"
  )
  addScenarioRow(
    "exit_mult",
    "Exit EV / FY36E EBITDA",
    "multiple",
    1,
    'ScalarAssumptionsActive["exit_ev_to_ebitda", "val"]',
    (s) => s.exitMult,
    "Cross-check"
  )
  addScenarioRow(
    "comps_mult",
    "Calibrated FY27E EV / EBITDA",
    "multiple",
    1,
    'ScalarAssumptionsActive["calibrated_comps_ev_to_ebitda", "val"]',
    (s) => s.compsMult,
    "ROIC-calibrated"
  )

  scenarioSummary.addRowGutter()
  scenarioSummary.addSectionHeader("Operating trajectory ($M)")
  addScenarioRow(
    "fy27_rev",
    "FY27E total revenue ($M)",
    "currency",
    0,
    'IncomeStatement["total_revenue", "FY27E"]',
    (s) => s.fy27Rev,
    "Near-term build"
  )
  addScenarioRow(
    "fy27_ebitda",
    "FY27E EBITDA ($M)",
    "currency",
    0,
    'IncomeStatement["ebitda", "FY27E"]',
    (s) => s.fy27Ebitda,
    "Post-SBC GAAP"
  )
  addScenarioRow(
    "fy36_rev",
    "FY36E total revenue ($M)",
    "currency",
    0,
    'IncomeStatement["total_revenue", "FY36E"]',
    (s) => s.fy36Rev,
    "Year-10 scale"
  )
  addScenarioRow(
    "fy36_ebit",
    "FY36E EBIT ($M)",
    "currency",
    0,
    'IncomeStatement["operating_income", "FY36E"]',
    (s) => s.fy36Ebit,
    "Post-SBC EBIT"
  )
  addScenarioRow(
    "fy36_ebitda",
    "FY36E EBITDA ($M)",
    "currency",
    0,
    'IncomeStatement["ebitda", "FY36E"]',
    (s) => s.fy36Ebitda,
    "Terminal base"
  )
  addScenarioRow(
    "fy36_fcff",
    "FY36E unlevered FCFF ($M)",
    "currency",
    0,
    'InvestedCapitalROIC["unlevered_fcff", "FY36E"]',
    (s) => s.fy36Fcff,
    "Post-reinvest."
  )
  addScenarioRow(
    "fy36_roic",
    "FY36E ROIC (ex-op. leases)",
    "percentage",
    1,
    'InvestedCapitalROIC["roic", "FY36E"]',
    (s) => s.fy36Roic,
    "NOPAT / avg IC",
    "bold"
  )

  scenarioSummary.addRowGutter()
  scenarioSummary.addSectionHeader("Implied share value across methods ($/sh)")
  addScenarioRow(
    "perp_cum",
    "Perpetuity DCF (cum-div.)",
    "currency",
    2,
    'DcfBridge["implied_price_cum_div", "perp"]',
    (s) => s.perpCumPrice,
    "Primary intrinsic",
    "bold"
  )
  addScenarioRow(
    "perp_ex",
    "Perpetuity DCF (ex-div.)",
    "currency",
    2,
    'DcfBridge["implied_price_ex_div", "perp"]',
    (s) => s.perpExPrice,
    "Post-special div."
  )
  addScenarioRow(
    "exit_cum",
    "Exit-Multiple DCF (cum-div.)",
    "currency",
    2,
    'DcfBridge["implied_price_cum_div", "exit_mult"]',
    (s) => s.exitCumPrice,
    "Exit cross-check"
  )
  addScenarioRow(
    "exit_ex",
    "Exit-Multiple DCF (ex-div.)",
    "currency",
    2,
    'DcfBridge["implied_price_ex_div", "exit_mult"]',
    (s) => s.exitExPrice,
    "Post-special div."
  )
  addScenarioRow(
    "comps_cum",
    "Calibrated Comps (cum-div.)",
    "currency",
    2,
    'CompsValuationCalibration["implied_price_cum_div", "val"]',
    (s) => s.compsCumPrice,
    "Relative comps"
  )
  addScenarioRow(
    "blended_cum",
    "Blended value (cum-div.)",
    "currency",
    2,
    'FootballField["blended_total", "cum_div_price"]',
    (s) => s.blendedCumPrice,
    "Weighted methods",
    "bold",
    true
  )
  addScenarioRow(
    "blended_ex",
    "Blended value (ex-div.)",
    "currency",
    2,
    'FootballField["blended_total", "ex_div_price"]',
    (s) => s.blendedExPrice,
    "Post-special div.",
    "bold"
  )

  // Consensus benchmark & dispersion (FY27E–FY29E + price targets)
  const consensusTable = sheet.addTable(
    "ConsensusBenchmark",
    "Model vs. Street Consensus & Estimate Dispersion (FY27E–FY29E)",
    {
      subtitle: [
        "Benchmarks Downside, Base, Upside snapshots and Active forecasts against consensus, dispersion, and targets",
        "Source: Street Consensus Estimates FY27E–FY29E & Analyst Price Targets / Ratings (2026-11-13)",
      ],
      currency: "USD",
    }
  )
  consensusTable.addColumn("line_item", {
    role: "descriptor",
    header: "Consensus benchmark",
  })
  consensusTable.addColumn("cons", {
    role: "measure",
    headers: ["Street", "Cons."],
    style: "bold",
  })
  consensusTable.addColumn("low", {
    role: "measure",
    headers: ["Street", "Low"],
  })
  consensusTable.addColumn("high", {
    role: "measure",
    headers: ["Street", "High"],
  })
  consensusTable.addColumn("downside", {
    role: "measure",
    headers: ["Downside", "Case"],
  })
  consensusTable.addColumn("base", {
    role: "measure",
    headers: ["Base", "Case"],
  })
  consensusTable.addColumn("upside", {
    role: "measure",
    headers: ["Upside", "Case"],
  })
  consensusTable.addColumn("active", {
    role: "measure",
    headers: ["Active", "Case"],
    style: "bold",
  })
  consensusTable.addColumn("base_vs_cons", {
    role: "measure",
    headers: ["Base vs.", "Cons."],
  })

  const addConsRow = (
    id: string,
    label: string,
    format: "currency" | "percentage" | "integer",
    decimals: number | undefined,
    consExpr: string,
    lowExpr: string | null,
    highExpr: string | null,
    getter: (s: ScenarioSnapshot) => number,
    activeExpr: string,
    style?: "bold"
  ): void => {
    const fmt = rowFormatOptions(format, decimals)
    consensusTable.addRow(id, {
      ...fmt,
      ...(style ? { style } : {}),
      cells: {
        line_item: label,
        cons: { expr: consExpr },
        low: lowExpr ? { expr: lowExpr } : null,
        high: highExpr ? { expr: highExpr } : null,
        downside: downSnap ? getter(downSnap) : 0,
        base: baseSnap ? getter(baseSnap) : 0,
        upside: upSnap ? getter(upSnap) : 0,
        active: { expr: activeExpr },
        base_vs_cons: {
          expr: '@table[@row, "base"] / @table[@row, "cons"] - 1',
          format: "percentage",
          decimals: 1,
        },
      },
    })
  }

  consensusTable.addSectionHeader("FY27E consensus and estimate dispersion")
  addConsRow(
    "fy27_rev",
    "FY27E total revenue ($M)",
    "currency",
    0,
    'MarketAnchors["cons_rev_fy27", "val"]',
    'MarketAnchors["cons_rev_low_fy27", "val"]',
    'MarketAnchors["cons_rev_high_fy27", "val"]',
    (s) => s.fy27Rev,
    'IncomeStatement["total_revenue", "FY27E"]'
  )
  addConsRow(
    "fy27_ebitda",
    "FY27E EBITDA ($M)",
    "currency",
    0,
    'MarketAnchors["cons_ebitda_fy27", "val"]',
    null,
    null,
    (s) => s.fy27Ebitda,
    'IncomeStatement["ebitda", "FY27E"]'
  )
  addConsRow(
    "fy27_ebit",
    "FY27E EBIT ($M)",
    "currency",
    0,
    'MarketAnchors["cons_ebit_fy27", "val"]',
    null,
    null,
    (s) => s.fy27Ebit,
    'IncomeStatement["operating_income", "FY27E"]'
  )
  addConsRow(
    "fy27_eps",
    "FY27E diluted EPS ($/sh)",
    "currency",
    2,
    'MarketAnchors["cons_eps_fy27", "val"]',
    'MarketAnchors["cons_eps_low_fy27", "val"]',
    'MarketAnchors["cons_eps_high_fy27", "val"]',
    (s) => s.fy27Eps,
    'IncomeStatement["diluted_eps", "FY27E"]',
    "bold"
  )
  addConsRow(
    "fy27_dps",
    "FY27E regular DPS ($/sh)",
    "currency",
    2,
    'MarketAnchors["cons_dps_fy27", "val"]',
    null,
    null,
    (s) => s.fy27RegDps,
    'IncomeStatement["regular_dps", "FY27E"]'
  )
  consensusTable.addRow("fy27_rev_spread", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "FY27E revenue dispersion (H/L)",
      cons: {
        expr: '(@table["fy27_rev", "high"] - @table["fy27_rev", "low"]) / @table["fy27_rev", "cons"]',
      },
      low: null,
      high: null,
      downside: null,
      base: null,
      upside: null,
      active: null,
      base_vs_cons: null,
    },
  })
  consensusTable.addRow("fy27_eps_spread", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "FY27E EPS dispersion (H/L)",
      cons: {
        expr: '(@table["fy27_eps", "high"] - @table["fy27_eps", "low"]) / @table["fy27_eps", "cons"]',
      },
      low: null,
      high: null,
      downside: null,
      base: null,
      upside: null,
      active: null,
      base_vs_cons: null,
    },
  })
  consensusTable.addRow("fy27_analyst_count", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "FY27E covering analyst count",
      cons: { expr: 'MarketAnchors["cons_analyst_count_fy27", "val"]' },
      low: null,
      high: null,
      downside: null,
      base: null,
      upside: null,
      active: null,
      base_vs_cons: null,
    },
  })

  consensusTable.addRowGutter()
  consensusTable.addSectionHeader("FY28E consensus comparison")
  addConsRow(
    "fy28_rev",
    "FY28E total revenue ($M)",
    "currency",
    0,
    'MarketAnchors["cons_rev_fy28", "val"]',
    null,
    null,
    (s) => s.fy28Rev,
    'IncomeStatement["total_revenue", "FY28E"]'
  )
  addConsRow(
    "fy28_ebitda",
    "FY28E EBITDA ($M)",
    "currency",
    0,
    'MarketAnchors["cons_ebitda_fy28", "val"]',
    null,
    null,
    (s) => s.fy28Ebitda,
    'IncomeStatement["ebitda", "FY28E"]'
  )
  addConsRow(
    "fy28_ebit",
    "FY28E EBIT ($M)",
    "currency",
    0,
    'MarketAnchors["cons_ebit_fy28", "val"]',
    null,
    null,
    (s) => s.fy28Ebit,
    'IncomeStatement["operating_income", "FY28E"]'
  )
  addConsRow(
    "fy28_eps",
    "FY28E diluted EPS ($/sh)",
    "currency",
    2,
    'MarketAnchors["cons_eps_fy28", "val"]',
    null,
    null,
    (s) => s.fy28Eps,
    'IncomeStatement["diluted_eps", "FY28E"]',
    "bold"
  )
  addConsRow(
    "fy28_dps",
    "FY28E regular DPS ($/sh)",
    "currency",
    2,
    'MarketAnchors["cons_dps_fy28", "val"]',
    null,
    null,
    (s) => s.fy28RegDps,
    'IncomeStatement["regular_dps", "FY28E"]'
  )

  consensusTable.addRowGutter()
  consensusTable.addSectionHeader("FY29E consensus comparison")
  addConsRow(
    "fy29_rev",
    "FY29E total revenue ($M)",
    "currency",
    0,
    'MarketAnchors["cons_rev_fy29", "val"]',
    null,
    null,
    (s) => s.fy29Rev,
    'IncomeStatement["total_revenue", "FY29E"]'
  )
  addConsRow(
    "fy29_ebitda",
    "FY29E EBITDA ($M)",
    "currency",
    0,
    'MarketAnchors["cons_ebitda_fy29", "val"]',
    null,
    null,
    (s) => s.fy29Ebitda,
    'IncomeStatement["ebitda", "FY29E"]'
  )
  addConsRow(
    "fy29_ebit",
    "FY29E EBIT ($M)",
    "currency",
    0,
    'MarketAnchors["cons_ebit_fy29", "val"]',
    null,
    null,
    (s) => s.fy29Ebit,
    'IncomeStatement["operating_income", "FY29E"]'
  )
  addConsRow(
    "fy29_eps",
    "FY29E diluted EPS ($/sh)",
    "currency",
    2,
    'MarketAnchors["cons_eps_fy29", "val"]',
    null,
    null,
    (s) => s.fy29Eps,
    'IncomeStatement["diluted_eps", "FY29E"]',
    "bold"
  )

  consensusTable.addRowGutter()
  consensusTable.addSectionHeader("Analyst price targets and ratings")
  addConsRow(
    "price_target_mean",
    "Price target vs. blended ($/sh)",
    "currency",
    2,
    'MarketAnchors["cons_pt_avg", "val"]',
    'MarketAnchors["cons_pt_low", "val"]',
    'MarketAnchors["cons_pt_high", "val"]',
    (s) => s.blendedCumPrice,
    'FootballField["blended_total", "cum_div_price"]',
    "bold"
  )
  consensusTable.addRow("price_target_median", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Street median price target ($/sh)",
      cons: { expr: 'MarketAnchors["cons_pt_median", "val"]' },
      low: null,
      high: null,
      downside: null,
      base: null,
      upside: null,
      active: null,
      base_vs_cons: {
        expr: '@table["price_target_mean", "base"] / @table["price_target_median", "cons"] - 1',
        format: "percentage",
        decimals: 1,
        note: "Base blended value variance vs. Street median target.",
      },
    },
  })
  consensusTable.addRow("ratings_buy_share", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Street buy-rated share (%)",
      cons: {
        expr: '(MarketAnchors["cons_ratings_strong_buy", "val"] + MarketAnchors["cons_ratings_buy", "val"]) / MarketAnchors["cons_ratings_total", "val"]',
      },
      low: notedNull("Buy + Strong Buy divided by total rated analysts."),
      high: null,
      downside: null,
      base: null,
      upside: null,
      active: null,
      base_vs_cons: null,
    },
  })
  consensusTable.addRow("ratings_non_buy_share", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Street non-buy share (Hold/Sell)",
      cons: { expr: '1 - @table["ratings_buy_share", "cons"]' },
      low: notedNull("Hold + Sell + Strong Sell complement (1 - Buy share)."),
      high: null,
      downside: null,
      base: null,
      upside: null,
      active: null,
      base_vs_cons: null,
    },
  })

  consensusTable.addRowGutter()
  consensusTable.addSectionHeader("FY27E–FY28E EPS bridge vs. consensus ($/sh)")
  const addEpsBridgeRow = (
    id: string,
    label: string,
    consRefRow: "fy27_eps" | "fy28_eps",
    getter: (s: ScenarioSnapshot) => number,
    activeExpr: string,
    style?: "subtotal" | "bold"
  ): void => {
    consensusTable.addRow(id, {
      ...rowFormatOptions("currency", 2),
      ...(style ? { style } : {}),
      cells: {
        line_item: label,
        cons: null,
        low: null,
        high: null,
        downside: downSnap ? getter(downSnap) : 0,
        base: baseSnap ? getter(baseSnap) : 0,
        upside: upSnap ? getter(upSnap) : 0,
        active: { expr: activeExpr },
        base_vs_cons: {
          expr: `@table[@row, "base"] / @table["${consRefRow}", "cons"]`,
          format: "percentage",
          decimals: 1,
        },
      },
    })
  }

  addEpsBridgeRow(
    "fy27_eps_bridge_ebit",
    "FY27E: Operating EBIT & MFI delta",
    "fy27_eps",
    (s) => s.fy27EpsBridgeEbit,
    '(IncomeStatement["operating_income", "FY27E"] - MarketAnchors["cons_ebit_fy27", "val"]) * (1 - PeriodAssumptionsActive["effective_tax_rate", "FY27E"]) / IncomeStatement["wavg_diluted_shares", "FY27E"]'
  )
  addEpsBridgeRow(
    "fy27_eps_bridge_int",
    "FY27E: Spec.-div. net int. reset",
    "fy27_eps",
    (s) => s.fy27EpsBridgeInt,
    '((IncomeStatement["interest_income", "FY27E"] - IncomeStatement["interest_expense", "FY27E"]) - (IncomeStatement["interest_income", "FY26"] - IncomeStatement["interest_expense", "FY26"])) * (1 - PeriodAssumptionsActive["effective_tax_rate", "FY27E"]) / IncomeStatement["wavg_diluted_shares", "FY27E"]'
  )
  addEpsBridgeRow(
    "fy27_eps_bridge_esop",
    "FY27E: ESOP spec.-div. tax shield",
    "fy27_eps",
    (s) => s.fy27EpsBridgeEsop,
    'IncomeStatement["esop_special_div_tax_benefit", "FY27E"] / IncomeStatement["wavg_diluted_shares", "FY27E"]'
  )
  addEpsBridgeRow(
    "fy27_eps_bridge_other",
    "FY27E: Non-op, tax & share resid.",
    "fy27_eps",
    (s) => s.fy27EpsBridgeOther,
    '(IncomeStatement["diluted_eps", "FY27E"] - MarketAnchors["cons_eps_fy27", "val"]) - SUM(@table["fy27_eps_bridge_ebit".."fy27_eps_bridge_esop", "active"])'
  )
  consensusTable.addRow("fy27_eps_bridge_total", {
    ...rowFormatOptions("currency", 2),
    style: "subtotal",
    cells: {
      line_item: "FY27E total EPS delta vs. cons.",
      cons: null,
      low: null,
      high: null,
      downside: {
        expr: 'SUM(@table["fy27_eps_bridge_ebit".."fy27_eps_bridge_other", @col])',
      },
      base: {
        expr: 'SUM(@table["fy27_eps_bridge_ebit".."fy27_eps_bridge_other", @col])',
      },
      upside: {
        expr: 'SUM(@table["fy27_eps_bridge_ebit".."fy27_eps_bridge_other", @col])',
      },
      active: {
        expr: 'SUM(@table["fy27_eps_bridge_ebit".."fy27_eps_bridge_other", @col])',
      },
      base_vs_cons: {
        expr: '@table[@row, "base"] / @table["fy27_eps", "cons"]',
        format: "percentage",
        decimals: 1,
      },
    },
  })
  addEpsBridgeRow(
    "fy28_eps_bridge_ebit",
    "FY28E: Operating EBIT & 53W delta",
    "fy28_eps",
    (s) => s.fy28EpsBridgeEbit,
    '(IncomeStatement["operating_income", "FY28E"] - MarketAnchors["cons_ebit_fy28", "val"]) * (1 - PeriodAssumptionsActive["effective_tax_rate", "FY28E"]) / IncomeStatement["wavg_diluted_shares", "FY28E"]'
  )
  addEpsBridgeRow(
    "fy28_eps_bridge_int",
    "FY28E: Post-div. net int. reset",
    "fy28_eps",
    (s) => s.fy28EpsBridgeInt,
    '((IncomeStatement["interest_income", "FY28E"] - IncomeStatement["interest_expense", "FY28E"]) - (IncomeStatement["interest_income", "FY26"] - IncomeStatement["interest_expense", "FY26"])) * (1 - PeriodAssumptionsActive["effective_tax_rate", "FY28E"]) / IncomeStatement["wavg_diluted_shares", "FY28E"]'
  )
  addEpsBridgeRow(
    "fy28_eps_bridge_other",
    "FY28E: Non-op, tax & share resid.",
    "fy28_eps",
    (s) => s.fy28EpsBridgeOther,
    '(IncomeStatement["diluted_eps", "FY28E"] - MarketAnchors["cons_eps_fy28", "val"]) - SUM(@table["fy28_eps_bridge_ebit".."fy28_eps_bridge_int", "active"])'
  )
  consensusTable.addRow("fy28_eps_bridge_total", {
    ...rowFormatOptions("currency", 2),
    style: "subtotal",
    cells: {
      line_item: "FY28E total EPS delta vs. cons.",
      cons: null,
      low: null,
      high: null,
      downside: {
        expr: 'SUM(@table["fy28_eps_bridge_ebit".."fy28_eps_bridge_other", @col])',
      },
      base: {
        expr: 'SUM(@table["fy28_eps_bridge_ebit".."fy28_eps_bridge_other", @col])',
      },
      upside: {
        expr: 'SUM(@table["fy28_eps_bridge_ebit".."fy28_eps_bridge_other", @col])',
      },
      active: {
        expr: 'SUM(@table["fy28_eps_bridge_ebit".."fy28_eps_bridge_other", @col])',
      },
      base_vs_cons: {
        expr: '@table[@row, "base"] / @table["fy28_eps", "cons"]',
        format: "percentage",
        decimals: 1,
      },
    },
  })

  return {
    control,
    kpiTable,
    scenarioSummary,
    consensusTable,
  }
}
