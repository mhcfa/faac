import { Cell, type Sheet } from "f8-engine"
import { FORECAST_PERIODS, FORECAST_PERIOD_HEADERS } from "../timeline.ts"
import { piecewiseDilutedPriceExpr } from "./valuation.ts"

const WACC_GRID_AXIS = [0.0775, 0.0825, 0.0875, 0.0926, 0.0975, 0.1025] as const
const MARGIN_GRID_AXIS = [0.075, 0.09, 0.105, 0.12, 0.135, 0.15] as const
const GROWTH_GRID_AXIS = [0.02, 0.025, 0.03, 0.035, 0.04] as const
const POST_NOL_COLS = ["2033E", "2034E", "2035E", "2036E", "2037E"] as const

export function buildSensitivitiesSheet(sheet: Sheet): void {
  // =========================================================================
  // BAND 1: Implied Share Price 2D Matrices (WACC x Margin | WACC x g)
  // =========================================================================
  const revPxGrid = sheet.addTable(
    "ReverseDcfMarginGrid",
    "Implied Share Price Sensitivity — WACC vs. FY32E EBIT Margin ($/sh)",
    {
      subtitle: [
        "Bridges Sep 30 EV to Nov 20 Equity at Ke with BA-PRA collar & Spirit dilution",
        "Nov 20, 2026 spot = $155.89/sh; requires WACC > terminal growth (g)",
      ],
    }
  )
  revPxGrid.addColumn("wacc_lbl", {
    role: "descriptor",
    headers: ["WACC \\ Margin"],
  })
  for (let j = 0; j < MARGIN_GRID_AXIS.length; j++) {
    revPxGrid.addColumn(`m_${j}`, {
      headers: [`${(MARGIN_GRID_AXIS[j]! * 100).toFixed(1)}%`],
      format: "currency",
      decimals: 2,
    })
  }
  for (let i = 0; i < WACC_GRID_AXIS.length; i++) {
    const rId = `w_${i}`
    const ePre = `((ReverseDcfMarginEvGrid["${rId}", @col] + EvToEquityBridge["net_ev_bridge", "val"]) * EvToEquityBridge["roll_fwd_factor", "val"])`
    revPxGrid.addRow(rId, {
      cells: { wacc_lbl: `WACC ${(WACC_GRID_AXIS[i]! * 100).toFixed(2)}%` },
      expr: piecewiseDilutedPriceExpr(ePre),
      ...(i === 3 ? { style: "bold" } : {}),
    })
  }

  const revGrowthPx = sheet.addTable(
    "ReverseDcfGrowthGrid",
    "Implied Share Price Sensitivity — WACC vs. Terminal Growth ($/sh)",
    {
      subtitle: [
        "Holds active operating path & RONIC fixed; varies WACC & terminal g",
        "Includes Nov 20 Ke roll-forward, BA-PRA collar & Spirit dilution",
      ],
    }
  )
  revGrowthPx.addColumn("wacc_lbl", {
    role: "descriptor",
    headers: ["WACC \\ g"],
  })
  for (let j = 0; j < GROWTH_GRID_AXIS.length; j++) {
    revGrowthPx.addColumn(`g_${j}`, {
      headers: [`${(GROWTH_GRID_AXIS[j]! * 100).toFixed(1)}%`],
      format: "currency",
      decimals: 2,
    })
  }
  for (let i = 0; i < WACC_GRID_AXIS.length; i++) {
    const rId = `w_${i}`
    const ePre = `((ReverseDcfGrowthEvGrid["${rId}", @col] + EvToEquityBridge["net_ev_bridge", "val"]) * EvToEquityBridge["roll_fwd_factor", "val"])`
    revGrowthPx.addRow(rId, {
      cells: { wacc_lbl: `WACC ${(WACC_GRID_AXIS[i]! * 100).toFixed(2)}%` },
      expr: piecewiseDilutedPriceExpr(ePre),
      ...(i === 3 ? { style: "bold" } : {}),
    })
  }

  // =========================================================================
  // BAND 2: Implied Sep 30 EV 2D Matrices (WACC x Margin | WACC x g)
  // =========================================================================
  const revEvGrid = sheet.addTable(
    "ReverseDcfMarginEvGrid",
    "Implied Sep 30 Enterprise Value — WACC vs. FY32E EBIT Margin ($M)",
    {
      subtitle: [
        "Active operating ramp shifted linearly toward target FY32E EBIT margin",
        "Includes post-FY32E finite NOL runoff; requires WACC > terminal growth (g)",
      ],
    }
  )
  revEvGrid.addColumn("wacc_lbl", {
    role: "descriptor",
    headers: ["WACC \\ Margin"],
  })
  for (let j = 0; j < MARGIN_GRID_AXIS.length; j++) {
    revEvGrid.addColumn(`m_${j}`, {
      headers: [`${(MARGIN_GRID_AXIS[j]! * 100).toFixed(1)}%`],
      format: "currency",
      decimals: 0,
    })
  }
  for (let i = 0; i < WACC_GRID_AXIS.length; i++) {
    const rId = `w_${i}`
    revEvGrid.addRow(rId, {
      cells: { wacc_lbl: `WACC ${(WACC_GRID_AXIS[i]! * 100).toFixed(2)}%` },
      expr: `IF(ReverseDcfWaccHelper["${rId}", "wacc_val"] > ScalarDrivers["terminalGrowth", "active"], ReverseDcfWaccHelper["${rId}", "pv_exp"] + ReverseDcfWaccHelper["${rId}", "pv_post_nol"] + ReverseDcfMarginHelper["delta_margin", @col] * ReverseDcfWaccHelper["${rId}", "pv_rev_wt"] + (ReverseDcfMarginHelper["fcff_t1", @col] / (ReverseDcfWaccHelper["${rId}", "wacc_val"] - ScalarDrivers["terminalGrowth", "active"])) * ReverseDcfWaccHelper["${rId}", "df_tv"], NA())`,
      ...(i === 3 ? { style: "bold" } : {}),
    })
  }

  const revGrowthEv = sheet.addTable(
    "ReverseDcfGrowthEvGrid",
    "Implied Sep 30 Enterprise Value — WACC vs. Terminal Growth ($M)",
    {
      subtitle: [
        "Holds active operating path & RONIC fixed; varies WACC & terminal g",
        "Requires WACC strictly above terminal growth (g)",
      ],
    }
  )
  revGrowthEv.addColumn("wacc_lbl", {
    role: "descriptor",
    headers: ["WACC \\ g"],
  })
  for (let j = 0; j < GROWTH_GRID_AXIS.length; j++) {
    revGrowthEv.addColumn(`g_${j}`, {
      headers: [`${(GROWTH_GRID_AXIS[j]! * 100).toFixed(1)}%`],
    })
  }
  revGrowthEv.addRow("g_axis", {
    cells: {
      wacc_lbl: "Terminal growth (g)",
      ...Object.fromEntries(GROWTH_GRID_AXIS.map((g, j) => [`g_${j}`, g])),
    },
    format: "percentage",
    decimals: 1,
  })
  for (let i = 0; i < WACC_GRID_AXIS.length; i++) {
    const rId = `w_${i}`
    revGrowthEv.addRow(rId, {
      cells: { wacc_lbl: `WACC ${(WACC_GRID_AXIS[i]! * 100).toFixed(2)}%` },
      expr: `IF(ReverseDcfWaccHelper["${rId}", "wacc_val"] > @table["g_axis", @col], ReverseDcfWaccHelper["${rId}", "pv_exp"] + ReverseDcfWaccHelper["${rId}", "pv_post_nol"] + (DcfSchedule["nopat", "2032E"] * (1 + @table["g_axis", @col]) * (1 - @table["g_axis", @col] / ScalarDrivers["terminalRonic", "active"]) / (ReverseDcfWaccHelper["${rId}", "wacc_val"] - @table["g_axis", @col])) * ReverseDcfWaccHelper["${rId}", "df_tv"], NA())`,
      format: "currency",
      decimals: 0,
      ...(i === 3 ? { style: "bold" } : {}),
    })
  }

  // =========================================================================
  // BAND 3: Clearing WACC Bisection Solver | Exact Indifference Boundaries
  // =========================================================================
  const BISECT_STEPS = 14
  const bisectRowIds = Array.from({ length: BISECT_STEPS }, (_, i) => `b_${i}`)
  const dfRowIds = [...bisectRowIds, "end_lo", "end_hi", "clearing_wacc"]

  const bisect = sheet.addTable(
    "ClearingWaccBisection",
    "Market-Implied Discount Rate Schedule (Clearing WACC)",
    {
      subtitle: [
        "Identifies WACC equating Sep 30 EV (incl. post-FY32E NOL) to Spot EV",
        "Evaluates WACC range from g + 25 bps to 35.0% to match Sep 30 spot EV",
      ],
    }
  )
  bisect.addColumn("step", { role: "descriptor", headers: ["Step"] })
  bisect.addColumn("lo", {
    headers: ["Lower", "WACC"],
    format: "percentage",
    decimals: 4,
  })
  bisect.addColumn("hi", {
    headers: ["Upper", "WACC"],
    format: "percentage",
    decimals: 4,
  })
  bisect.addColumn("mid", {
    headers: ["Trial", "WACC"],
    format: "percentage",
    decimals: 4,
  })
  bisect.addColumn("ev_mid", {
    headers: ["Sep 30", "EV ($M)"],
    format: "currency",
    decimals: 1,
  })
  bisect.addColumn("diff", {
    headers: ["EV − Spot", "($M)"],
    format: "currency",
    decimals: 1,
  })
  bisect.addColumn("bracket_w", {
    headers: ["Interval", "Width"],
    format: "percentage",
    decimals: 4,
  })

  const guardCond = `AND(WaccBuild["wacc", "val"] > ScalarDrivers["terminalGrowth", "active"], ScalarDrivers["terminalGrowth", "active"] < 0.3475)`
  const bisectEvExpr = (rId: string): string =>
    `IF(@table["${rId}", "mid"] > ScalarDrivers["terminalGrowth", "active"], SUMPRODUCT(DcfSchedule["economic_fcff", "Q4_26E".."2032E"], ClearingWaccDfMatrix["${rId}", "Q4_26E".."2032E"]) + SUMPRODUCT(PostTerminalNolRunoff["nol_shield", "2033E".."2037E"], ClearingWaccDfMatrix["${rId}", "2033E".."2037E"]) + (DcfSchedule["economic_fcff", "Terminal"] / (@table["${rId}", "mid"] - ScalarDrivers["terminalGrowth", "active"])) / ((1 + @table["${rId}", "mid"]) ^ DcfSchedule["discount_years", "Terminal"]), NA())`

  for (let k = 0; k < BISECT_STEPS; k++) {
    const rId = `b_${k}`
    const prevId = `b_${k - 1}`
    bisect.addRow(rId, {
      cells: {
        step: `Step ${k + 1}`,
        lo: new Cell({
          expr:
            k === 0
              ? `IF(${guardCond}, ScalarDrivers["terminalGrowth", "active"] + 0.0025, NA())`
              : `IF(@table["${prevId}", "diff"] > 0, @table["${prevId}", "mid"], @table["${prevId}", "lo"])`,
        }),
        hi: new Cell({
          expr:
            k === 0
              ? `IF(${guardCond}, 0.35, NA())`
              : `IF(@table["${prevId}", "diff"] > 0, @table["${prevId}", "hi"], @table["${prevId}", "mid"])`,
        }),
        mid: new Cell({
          expr: `0.5 * (@table["${rId}", "lo"] + @table["${rId}", "hi"])`,
        }),
        ev_mid: new Cell({ expr: bisectEvExpr(rId) }),
        diff: new Cell({
          expr: `@table["${rId}", "ev_mid"] - MarketSnapshot["spot_ev_sep30", "val"]`,
        }),
        bracket_w: new Cell({
          expr: `@table["${rId}", "hi"] - @table["${rId}", "lo"]`,
        }),
      },
    })
  }
  const lastBisectId = `b_${BISECT_STEPS - 1}`
  bisect.addRow("end_lo", {
    cells: {
      step: "Final lower bound",
      lo: new Cell({
        expr: `IF(@table["${lastBisectId}", "diff"] > 0, @table["${lastBisectId}", "mid"], @table["${lastBisectId}", "lo"])`,
      }),
      hi: new Cell({
        expr: `IF(@table["${lastBisectId}", "diff"] > 0, @table["${lastBisectId}", "hi"], @table["${lastBisectId}", "mid"])`,
      }),
      mid: new Cell({ expr: `@table["end_lo", "lo"]` }),
      ev_mid: new Cell({ expr: bisectEvExpr("end_lo") }),
      diff: new Cell({
        expr: `@table["end_lo", "ev_mid"] - MarketSnapshot["spot_ev_sep30", "val"]`,
      }),
      bracket_w: new Cell({
        expr: `@table["end_lo", "hi"] - @table["end_lo", "lo"]`,
      }),
    },
  })
  bisect.addRow("end_hi", {
    cells: {
      step: "Final upper bound",
      lo: new Cell({ expr: `@table["end_lo", "lo"]` }),
      hi: new Cell({ expr: `@table["end_lo", "hi"]` }),
      mid: new Cell({ expr: `@table["end_hi", "hi"]` }),
      ev_mid: new Cell({ expr: bisectEvExpr("end_hi") }),
      diff: new Cell({
        expr: `@table["end_hi", "ev_mid"] - MarketSnapshot["spot_ev_sep30", "val"]`,
      }),
      bracket_w: new Cell({
        expr: `@table["end_hi", "hi"] - @table["end_hi", "lo"]`,
      }),
    },
  })

  const bnd = sheet.addTable(
    "ReverseDcfBoundaries",
    "Market-Implied Operating Margin & Discount Rate Boundaries",
    {
      subtitle: [
        "Implied FY32E EBIT margin (at active WACC) & implied WACC (at active forecast)",
        "Equates valuation to Nov 20, 2026 spot price ($155.89/sh) within $0.01",
      ],
    }
  )
  bnd.addColumn("metric", {
    role: "descriptor",
    headers: ["Implied boundary"],
  })
  bnd.addColumn("val", { headers: ["Implied"], style: "bold" })
  bnd.addColumn("notes", { role: "descriptor", headers: ["Basis"] })

  bnd.addSectionHeader("1. Clearing steady-state margin at active WACC")
  bnd.addRow("target_ev_anchor", {
    cells: {
      metric: "Spot EV (Sep 30, $M)",
      val: new Cell({ expr: `MarketSnapshot["spot_ev_sep30", "val"]` }),
      notes: "Nov 20 Spot EV discounted 51d back at Ke",
    },
    format: "currency",
    decimals: 0,
  })
  bnd.addRow("ev_sens_explicit", {
    cells: {
      metric: "Explicit PV / 100pp mgn",
      val: new Cell({
        expr: `SUMPRODUCT(DcfSchedule["margin_ramp_wt", "Q4_26E".."2032E"], DcfSchedule["discount_factor", "Q4_26E".."2032E"])`,
      }),
      notes: "Linear FY27E–FY32E EBIT margin shift",
    },
    format: "currency",
    decimals: 0,
  })
  bnd.addRow("ev_sens_terminal", {
    cells: {
      metric: "Terminal PV / 100pp mgn",
      val: new Cell({
        expr: `IF(WaccBuild["wacc", "val"] > ScalarDrivers["terminalGrowth", "active"], DcfSchedule["margin_ramp_wt", "2032E"] * (1 + ScalarDrivers["terminalGrowth", "active"]) * (1 - ScalarDrivers["terminalGrowth", "active"] / ScalarDrivers["terminalRonic", "active"]) / (WaccBuild["wacc", "val"] - ScalarDrivers["terminalGrowth", "active"]) * DcfSchedule["discount_factor", "Terminal"], NA())`,
      }),
      notes: "Perpetuity with g / active scenario RONIC",
    },
    format: "currency",
    decimals: 0,
  })
  bnd.addRow("ev_sens_per_margin", {
    cells: {
      metric: "Total EV / 100pp mgn",
      val: new Cell({
        expr: `@table["ev_sens_explicit", "val"] + @table["ev_sens_terminal", "val"]`,
      }),
      notes: null,
    },
    format: "currency",
    decimals: 0,
  })
  bnd.addRow("clearing_delta_margin", {
    cells: {
      metric: "Req. FY32E mgn delta",
      val: new Cell({
        expr: `(@table["target_ev_anchor", "val"] - EvToEquityBridge["ev_anchor", "val"]) / @table["ev_sens_per_margin", "val"]`,
      }),
      notes: "(Spot EV − Active EV) / margin sens.",
    },
    format: "percentage",
    decimals: 2,
  })
  bnd.addRow("clearing_consol_margin", {
    cells: {
      metric: "Clearing Consol margin",
      val: new Cell({
        expr: `SegmentOperatingBuild["margin_consol", "2032E"] + @table["clearing_delta_margin", "val"]`,
      }),
      notes: "Consolidated FY32E EBIT at active WACC",
    },
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })
  bnd.addRow("clearing_bca_margin", {
    cells: {
      metric: "Implied BCA margin",
      val: new Cell({
        expr: `SegmentOperatingBuild["margin_bca", "2032E"] + (@table["clearing_delta_margin", "val"] * IncomeStatement["revenue_total", "2032E"]) / SegmentOperatingBuild["rev_bca", "2032E"]`,
      }),
      notes: "Attributes 100% of delta to BCA segment",
    },
    format: "percentage",
    decimals: 2,
    style: "bold",
  })

  bnd.addRowGutter()
  bnd.addSectionHeader("2. Clearing WACC at active operating path")
  bnd.addRow("w_bracket_lo", {
    cells: {
      metric: "Lower WACC bound",
      val: new Cell({ expr: `ClearingWaccBisection["end_lo", "lo"]` }),
      notes: "Lower bound of implied WACC range",
    },
    format: "percentage",
    decimals: 4,
  })
  bnd.addRow("w_bracket_hi", {
    cells: {
      metric: "Upper WACC bound",
      val: new Cell({ expr: `ClearingWaccBisection["end_lo", "hi"]` }),
      notes: "Upper bound of implied WACC range",
    },
    format: "percentage",
    decimals: 4,
  })
  bnd.addRow("clearing_wacc", {
    cells: {
      metric: "Implied clearing WACC",
      val: new Cell({
        expr: `IF(${guardCond}, IF(ClearingWaccBisection["end_lo", "diff"] > ClearingWaccBisection["end_hi", "diff"], @table["w_bracket_lo", "val"] + (@table["w_bracket_hi", "val"] - @table["w_bracket_lo", "val"]) * ClearingWaccBisection["end_lo", "diff"] / (ClearingWaccBisection["end_lo", "diff"] - ClearingWaccBisection["end_hi", "diff"]), 0.5 * (@table["w_bracket_lo", "val"] + @table["w_bracket_hi", "val"])), NA())`,
      }),
      notes: "Implied WACC equating DCF EV to spot",
    },
    format: "percentage",
    decimals: 2,
    style: "total",
    highlight: true,
  })
  bnd.addRow("clearing_wacc_ev_sep30", {
    cells: {
      metric: "EV at clearing WACC",
      val: new Cell({
        expr: `IF(@table["clearing_wacc", "val"] > ScalarDrivers["terminalGrowth", "active"], SUMPRODUCT(DcfSchedule["economic_fcff", "Q4_26E".."2032E"], ClearingWaccDfMatrix["clearing_wacc", "Q4_26E".."2032E"]) + SUMPRODUCT(PostTerminalNolRunoff["nol_shield", "2033E".."2037E"], ClearingWaccDfMatrix["clearing_wacc", "2033E".."2037E"]) + (DcfSchedule["economic_fcff", "Terminal"] / (@table["clearing_wacc", "val"] - ScalarDrivers["terminalGrowth", "active"])) / ((1 + @table["clearing_wacc", "val"]) ^ DcfSchedule["discount_years", "Terminal"]), NA())`,
      }),
      notes: "Includes post-FY32E finite NOL runoff",
    },
    format: "currency",
    decimals: 1,
  })
  bnd.addRow("clearing_wacc_residual", {
    cells: {
      metric: "EV residual vs. spot",
      val: new Cell({
        expr: `@table["clearing_wacc_ev_sep30", "val"] - MarketSnapshot["spot_ev_sep30", "val"]`,
      }),
      notes: "Valuation parity residual (<$0.01/sh)",
    },
    format: "currency",
    decimals: 2,
  })
  bnd.addRow("clearing_wacc_implied_price", {
    cells: {
      metric: "Price at clearing WACC",
      val: new Cell({
        expr: piecewiseDilutedPriceExpr(
          `((@table["clearing_wacc_ev_sep30", "val"] + EvToEquityBridge["net_ev_bridge", "val"]) * EvToEquityBridge["roll_fwd_factor", "val"])`
        ),
      }),
      notes: "Recovers Nov 20 spot ($155.89/sh)",
    },
    format: "currency",
    decimals: 2,
  })

  // =========================================================================
  // BAND 4: Sensitivity Axis Helpers (Margin Axis | WACC Explicit PV)
  // =========================================================================
  const marginHelper = sheet.addTable(
    "ReverseDcfMarginHelper",
    "Terminal Cash Flow Schedule — Steady-State Margin Axis",
    {
      subtitle: [
        "Maps FY32E EBIT margin to operating ramp delta & Terminal FCFF(T+1)",
        "25.0% combined tax rate and active g / RONIC",
      ],
    }
  )
  marginHelper.addColumn("metric", { role: "descriptor", headers: ["Metric"] })
  for (let j = 0; j < MARGIN_GRID_AXIS.length; j++) {
    const m = MARGIN_GRID_AXIS[j]!
    marginHelper.addColumn(`m_${j}`, { headers: [`${(m * 100).toFixed(1)}%`] })
  }
  marginHelper.addRow("margin_val", {
    cells: {
      metric: "FY32E Consol EBIT mgn",
      ...Object.fromEntries(MARGIN_GRID_AXIS.map((m, j) => [`m_${j}`, m])),
    },
    format: "percentage",
    decimals: 1,
  })
  marginHelper.addRow("delta_margin", {
    cells: { metric: "Delta vs. active FY32E" },
    expr: `@table["margin_val", @col] - SegmentOperatingBuild["margin_consol", "2032E"]`,
    format: "percentage",
    decimals: 2,
  })
  marginHelper.addRow("fcff_t1", {
    cells: { metric: "Terminal FCFF(T+1) ($M)" },
    expr: `IncomeStatement["revenue_total", "2032E"] * @table["margin_val", @col] * (1 - WaccBuild["tax_rate", "val"]) * (1 + ScalarDrivers["terminalGrowth", "active"]) * (1 - ScalarDrivers["terminalGrowth", "active"] / ScalarDrivers["terminalRonic", "active"])`,
    format: "currency",
    decimals: 0,
  })

  const waccHelper = sheet.addTable(
    "ReverseDcfWaccHelper",
    "Present Value & Discount Factor Summary by WACC",
    {
      subtitle: [
        "Sep 30 explicit FCFF PVs, post-NOL PVs & terminal discount factors",
        "Supporting valuation components across WACC sensitivity levels",
      ],
    }
  )
  waccHelper.addColumn("axis", { role: "descriptor", headers: ["WACC level"] })
  waccHelper.addColumn("wacc_val", {
    headers: ["WACC"],
    format: "percentage",
    decimals: 2,
  })
  waccHelper.addColumn("pv_exp", {
    headers: ["PV Exp.", "($M)"],
    format: "currency",
    decimals: 0,
  })
  waccHelper.addColumn("pv_post_nol", {
    headers: ["PV Post", "NOL ($M)"],
    format: "currency",
    decimals: 0,
  })
  waccHelper.addColumn("pv_rev_wt", {
    headers: ["PV Margin", "Base ($M)"],
    format: "currency",
    decimals: 0,
  })
  waccHelper.addColumn("df_tv", {
    headers: ["TV Disc.", "Factor"],
    format: "number",
    decimals: 4,
  })

  for (let i = 0; i < WACC_GRID_AXIS.length; i++) {
    const rId = `w_${i}`
    const w = WACC_GRID_AXIS[i]!
    waccHelper.addRow(rId, {
      cells: {
        axis: `WACC ${(w * 100).toFixed(2)}%`,
        wacc_val: w,
        pv_exp: new Cell({
          expr: `SUMPRODUCT(DcfSchedule["economic_fcff", "Q4_26E".."2032E"], ReverseDcfDfMatrix["${rId}", "Q4_26E".."2032E"])`,
        }),
        pv_post_nol: new Cell({
          expr: `SUMPRODUCT(PostTerminalNolRunoff["nol_shield", "2033E".."2037E"], ReverseDcfDfMatrix["${rId}", "2033E".."2037E"])`,
        }),
        pv_rev_wt: new Cell({
          expr: `SUMPRODUCT(DcfSchedule["margin_ramp_wt", "Q4_26E".."2032E"], ReverseDcfDfMatrix["${rId}", "Q4_26E".."2032E"])`,
        }),
        df_tv: new Cell({
          expr: `1 / ((1 + @table[@row, "wacc_val"]) ^ DcfSchedule["discount_years", "Terminal"])`,
        }),
      },
    })
  }

  // =========================================================================
  // BAND 5: Explicit & Post-NOL Discount Factor Matrix (Sensitivity Grid)
  // =========================================================================
  const dfMatrix = sheet.addTable(
    "ReverseDcfDfMatrix",
    "Explicit, Terminal & Post-FY32E NOL Discount Factors by WACC",
    {
      subtitle:
        "Per-period discount factors (Q4 26E–FY32E explicit, YE32 terminal, and FY33E–FY37E post-NOL) across WACC sensitivity levels",
    }
  )
  dfMatrix.addColumn("axis", { role: "descriptor", headers: ["WACC level"] })
  dfMatrix.addColumn("wacc_val", {
    headers: ["WACC"],
    format: "percentage",
    decimals: 2,
    style: "bold",
  })
  for (const p of FORECAST_PERIODS) {
    dfMatrix.addColumn(p, {
      group: "Explicit forecast",
      headers: [FORECAST_PERIOD_HEADERS[p]],
      format: "number",
      decimals: 4,
    })
  }
  dfMatrix.addColumn("Terminal", {
    group: "Terminal",
    headers: ["YE32 TV"],
    format: "number",
    decimals: 4,
  })
  for (const c of POST_NOL_COLS) {
    dfMatrix.addColumn(c, {
      group: "Post-FY32E NOL",
      headers: [`FY${c.slice(2)}`],
      format: "number",
      decimals: 4,
    })
  }
  for (let i = 0; i < WACC_GRID_AXIS.length; i++) {
    const rId = `w_${i}`
    const w = WACC_GRID_AXIS[i]!
    dfMatrix.addRow(rId, {
      cells: {
        axis: `WACC ${(w * 100).toFixed(2)}%`,
        wacc_val: new Cell({
          expr: `ReverseDcfWaccHelper["${rId}", "wacc_val"]`,
        }),
        ...Object.fromEntries(
          FORECAST_PERIODS.map((p) => [
            p,
            new Cell({
              expr: `1 / ((1 + ReverseDcfWaccHelper["${rId}", "wacc_val"]) ^ DcfSchedule["discount_years", "${p}"])`,
            }),
          ])
        ),
        Terminal: new Cell({
          expr: `ReverseDcfWaccHelper["${rId}", "df_tv"]`,
        }),
        ...Object.fromEntries(
          POST_NOL_COLS.map((c) => [
            c,
            new Cell({
              expr: `1 / ((1 + ReverseDcfWaccHelper["${rId}", "wacc_val"]) ^ PostTerminalNolRunoff["discount_years", "${c}"])`,
            }),
          ])
        ),
      },
    })
  }

  // =========================================================================
  // BAND 6: Clearing WACC Bisection Discount Factor Matrix
  // =========================================================================
  const cwDf = sheet.addTable(
    "ClearingWaccDfMatrix",
    "Clearing WACC — Per-Period Discount Factors",
    {
      subtitle:
        "Per-period discount factors (Q4 26E–FY32E explicit, YE32 terminal, and FY33E–FY37E post-NOL) across WACC test rates",
    }
  )
  cwDf.addColumn("iter", { role: "descriptor", headers: ["Step"] })
  cwDf.addColumn("wacc_val", {
    headers: ["Trial WACC"],
    format: "percentage",
    decimals: 4,
    style: "bold",
  })
  for (const p of FORECAST_PERIODS) {
    cwDf.addColumn(p, {
      group: "Explicit forecast",
      headers: [FORECAST_PERIOD_HEADERS[p]],
      format: "number",
      decimals: 4,
    })
  }
  cwDf.addColumn("Terminal", {
    group: "Terminal",
    headers: ["YE32 TV"],
    format: "number",
    decimals: 4,
  })
  for (const c of POST_NOL_COLS) {
    cwDf.addColumn(c, {
      group: "Post-FY32E NOL",
      headers: [`FY${c.slice(2)}`],
      format: "number",
      decimals: 4,
    })
  }
  for (const rId of dfRowIds) {
    const waccRef =
      rId === "clearing_wacc"
        ? `ReverseDcfBoundaries["clearing_wacc", "val"]`
        : `ClearingWaccBisection["${rId}", "mid"]`
    const label =
      rId === "clearing_wacc"
        ? "Clearing WACC"
        : rId === "end_lo"
          ? "Final lower bound"
          : rId === "end_hi"
            ? "Final upper bound"
            : `Step ${Number(rId.slice(2)) + 1}`
    cwDf.addRow(rId, {
      cells: {
        iter: label,
        wacc_val: new Cell({ expr: waccRef }),
        ...Object.fromEntries(
          FORECAST_PERIODS.map((p) => [
            p,
            new Cell({
              expr: `1 / ((1 + ${waccRef}) ^ DcfSchedule["discount_years", "${p}"])`,
            }),
          ])
        ),
        Terminal: new Cell({
          expr: `1 / ((1 + ${waccRef}) ^ DcfSchedule["discount_years", "Terminal"])`,
        }),
        ...Object.fromEntries(
          POST_NOL_COLS.map((c) => [
            c,
            new Cell({
              expr: `1 / ((1 + ${waccRef}) ^ PostTerminalNolRunoff["discount_years", "${c}"])`,
            }),
          ])
        ),
      },
    })
  }

  sheet.setBands([
    { lanes: [{ tables: [revPxGrid] }, { tables: [revGrowthPx] }] },
    { lanes: [{ tables: [revEvGrid] }, { tables: [revGrowthEv] }] },
    { lanes: [{ tables: [bisect] }, { tables: [bnd] }] },
    { lanes: [{ tables: [marginHelper] }, { tables: [waccHelper] }] },
    dfMatrix,
    cwDf,
  ])
}
