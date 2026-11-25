import { Cell, type Sheet, type Table } from "f8-engine"
import { SCALE_NOTE_USD_M } from "../scale.ts"
import { DCF_PERIODS } from "../timeline.ts"
import {
  SENS_CAPEX_COLS,
  SENS_G_COLS,
  SENS_GROWTH_SHIFTS,
  SENS_WACC_ROWS,
  exactFourRegimePriceExpr,
  type GrowthCapexEvGrid,
  type ScalarTornadoRow,
  type SpotIndifferenceRow,
} from "./dcf-sheet.ts"

export function buildSensitivitiesSheet(
  sheet: Sheet,
  growthCapexEvGrid?: GrowthCapexEvGrid,
  scalarTornado?: readonly ScalarTornadoRow[],
  spotIndifference?: readonly SpotIndifferenceRow[]
): void {
  // =========================================================================
  // Band 1: Implied Share Price Sensitivity Matrices (WACC × g | Growth × CapEx)
  // =========================================================================
  const sensWgPx = sheet.addTable(
    "SensWaccGPx",
    "Implied Share Price ($): WACC × Terminal Growth",
    {
      subtitle: [
        "Spot META = $560.84; live DCF sensitivity across WACC and perpetuity growth",
        "Applies price-consistent TSM RSU & METAM mandatory convertible dilution",
      ],
    }
  )
  sensWgPx.addColumn("label", {
    role: "descriptor",
    header: "WACC \\ Terminal g",
  })
  for (const g of SENS_G_COLS) {
    sensWgPx.addColumn(g.id, { header: g.header, group: "Terminal Growth (g)" })
  }
  for (const w of SENS_WACC_ROWS) {
    sensWgPx.addRow(w.id, {
      cells: { label: new Cell({ value: w.label }) },
      expr: exactFourRegimePriceExpr("SensWaccGEv[@row, @col]"),
      format: "currency",
      decimals: 2,
    })
  }

  if (growthCapexEvGrid !== undefined) {
    const sensGcPx = sheet.addTable(
      "SensGrowthCapexPx",
      "Implied Share Price ($): FoA Growth Shift × 2031E CapEx %",
      {
        subtitle: [
          "25-point full-model operating grid with PP&E / D&A feedback",
          "Share prices link live over EV grid via TSM RSU & METAM bridge",
        ],
        rightOf: sensWgPx,
        gap: 1,
      }
    )
    sensGcPx.addColumn("label", {
      role: "descriptor",
      header: "Growth \\ 2031E CapEx %",
    })
    for (const c of SENS_CAPEX_COLS) {
      sensGcPx.addColumn(c.id, {
        header: c.header,
        group: "Terminal 2031E CapEx % of Rev",
      })
    }
    for (const g of SENS_GROWTH_SHIFTS) {
      sensGcPx.addRow(g.id, {
        cells: { label: new Cell({ value: g.label }) },
        expr: exactFourRegimePriceExpr("SensGrowthCapexEv[@row, @col]"),
        format: "currency",
        decimals: 2,
      })
    }
    sensGcPx.addRow("center_recon_check", {
      cells: {
        label: new Cell({ value: "Center check vs. Active DCF" }),
        cx1: null,
        cx2: null,
        cx3: new Cell({
          expr: '@table["gr3", "cx3"] - DcfBridge["implied_share_price", "val"]',
          format: "currency",
          decimals: 2,
          note: "Equals $0.00 in Base Case where active 2031E CapEx target is 22.0%.",
        }),
        cx4: null,
        cx5: null,
      },
      style: "bold",
    })
  }

  // =========================================================================
  // Band 2: Implied EV Sensitivity Matrices (WACC × g | Growth × CapEx)
  // =========================================================================
  const sensWgEv = sheet.addTable(
    "SensWaccGEv",
    "Implied Enterprise Value ($M): WACC × Terminal Growth",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Live DCF EV across WACC and terminal growth schedules (mid-year TV)",
      ],
    }
  )
  sensWgEv.addColumn("label", {
    role: "descriptor",
    header: "WACC \\ Terminal g",
  })
  for (const g of SENS_G_COLS) {
    sensWgEv.addColumn(g.id, { header: g.header, group: "Terminal Growth (g)" })
  }
  for (const w of SENS_WACC_ROWS) {
    sensWgEv.addRow(w.id, {
      cells: { label: new Cell({ value: w.label }) },
      expr: 'IF(SensWaccHelper[@row, "wacc_rate"] > SensGHelper["g_rate", @col], SensWaccHelper[@row, "pv_explicit"] + (SensGHelper["term_fcff", @col] / (SensWaccHelper[@row, "wacc_rate"] - SensGHelper["g_rate", @col])) * ((1 + SensWaccHelper[@row, "wacc_rate"]) ^ (0.5 * ScalarDrivers["midYearDiscountingFlag", "active"])) * SensWaccHelper[@row, "term_df"], NA())',
      format: "currency",
      decimals: 0,
    })
  }

  if (growthCapexEvGrid !== undefined) {
    const sensGcEv = sheet.addTable(
      "SensGrowthCapexEv",
      "Implied Enterprise Value ($M): FoA Growth Shift × 2031E CapEx %",
      {
        subtitle: [
          SCALE_NOTE_USD_M,
          "25-point full-model EV snapshots at active scenario WACC, g & RONIC",
        ],
        rightOf: sensWgEv,
        gap: 1,
      }
    )
    sensGcEv.addColumn("label", {
      role: "descriptor",
      header: "Growth \\ 2031E CapEx %",
    })
    for (const c of SENS_CAPEX_COLS) {
      sensGcEv.addColumn(c.id, {
        header: c.header,
        group: "Terminal 2031E CapEx % of Rev",
      })
    }
    for (const g of SENS_GROWTH_SHIFTS) {
      const cells: Record<string, Cell | number> = {
        label: new Cell({ value: g.label }),
      }
      for (const c of SENS_CAPEX_COLS) {
        cells[c.id] = growthCapexEvGrid[g.id][c.id]
      }
      sensGcEv.addRow(g.id, {
        cells,
        format: "currency",
        decimals: 0,
      })
    }
  }

  // =========================================================================
  // Band 3: Single-Driver Base Case Tornado Sensitivity
  // =========================================================================
  if (scalarTornado !== undefined && scalarTornado.length > 0) {
    const torn = sheet.addTable(
      "ScalarTornadoSensitivity",
      "One-Way Base Case Sensitivity Analysis (Single-Driver Shocks)",
      {
        subtitle: [
          SCALE_NOTE_USD_M,
          "Standalone Base Case valuation impact of key macro, tax, lease, depreciation, RONIC, Reality Labs & tariff shocks",
        ],
      }
    )
    torn.addColumn("label", {
      role: "descriptor",
      header: "Sensitivity Lever",
    })
    torn.addColumn("base_px", { headers: ["Base", "Price"] })
    torn.addColumn("shock_px", { headers: ["Shocked", "Price"] })
    torn.addColumn("px_delta", { headers: ["$/Sh", "Delta"] })
    torn.addColumn("ev_delta_pct", { headers: ["% EV", "Delta"] })
    torn.addColumn("notes", { role: "descriptor", header: "Notes" })

    torn.addSectionHeader("Single-driver full-model shocks vs. Base Case")

    for (const row of scalarTornado) {
      torn.addRow(row.id, {
        cells: {
          label: new Cell({ value: row.label }),
          base_px: new Cell({
            value: row.basePrice,
            format: "currency",
            decimals: 2,
          }),
          shock_px: new Cell({
            value: row.shockedPrice,
            format: "currency",
            decimals: 2,
          }),
          px_delta: new Cell({
            expr: '@table[@row, "shock_px"] - @table[@row, "base_px"]',
            format: "currency",
            decimals: 2,
          }),
          ev_delta_pct: new Cell({
            value: row.shockedEv / row.baseEv - 1,
            format: "percentage",
            decimals: 1,
          }),
          notes: row.note,
        },
      })
    }
  }

  // =========================================================================
  // Band 4: Market-Implied Spot Breakevens & Terminal Growth Rate Schedule
  // =========================================================================
  let indiffTable: Table | undefined
  if (spotIndifference !== undefined && spotIndifference.length > 0) {
    const indiff = sheet.addTable(
      "SpotIndifferenceBoundaries",
      "Market-Implied Breakevens Clearing $560.84 Spot Price",
      {
        subtitle: [
          "Single-driver Base Case breakeven required to match Nov 20, 2026 spot",
          "All other Base Case assumptions held constant",
        ],
      }
    )
    indiff.addColumn("label", {
      role: "descriptor",
      header: "Valuation / Operating Lever",
    })
    indiff.addColumn("base_val", { headers: ["Base", "Assump."] })
    indiff.addColumn("be_val", { headers: ["Spot", "Breakeven"] })
    indiff.addColumn("req_delta", { headers: ["Required", "Delta"] })
    indiff.addColumn("notes", { role: "descriptor", header: "Notes" })

    indiff.addSectionHeader(
      "Single-driver indifference thresholds vs. Nov 20, 2026 spot"
    )

    for (const row of spotIndifference) {
      indiff.addRow(row.id, {
        cells: {
          label: new Cell({ value: row.label }),
          base_val: new Cell({
            value: row.baseValue,
            format: "percentage",
            decimals: 2,
          }),
          be_val:
            row.breakevenValue === null
              ? new Cell({
                  value: null,
                  note: "Single-driver breakeven exceeds 95% (near-zero perpetuity reinvestment); terminal RONIC alone cannot bridge the gap to $560.84 spot.",
                })
              : new Cell({
                  value: row.breakevenValue,
                  format: "percentage",
                  decimals: 2,
                }),
          req_delta:
            row.breakevenValue === null
              ? null
              : new Cell({
                  expr: '@table[@row, "be_val"] - @table[@row, "base_val"]',
                  format: "percentage",
                  decimals: 2,
                }),
          notes: row.note,
        },
      })
    }
    indiffTable = indiff
  }

  const gHelper = sheet.addTable(
    "SensGHelper",
    "Terminal Growth Rate Sensitivity Schedule",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "FY31E NOPAT × (1 + g) × (1 − g / RONIC) across g columns",
      ],
      ...(indiffTable !== undefined ? { rightOf: indiffTable, gap: 1 } : {}),
    }
  )
  gHelper.addColumn("label", { role: "descriptor", header: "Terminal Metric" })
  for (const g of SENS_G_COLS) {
    gHelper.addColumn(g.id, { header: g.header, group: "Terminal Growth (g)" })
  }
  const gRateCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Terminal growth (g)" }),
  }
  const gFcffCells: Record<string, Cell | number> = {
    label: new Cell({ value: "Terminal FCFF" }),
  }
  for (const g of SENS_G_COLS) {
    gRateCells[g.id] = new Cell({
      value: g.rate,
      format: "percentage",
      decimals: 1,
    })
    gFcffCells[g.id] = new Cell({
      expr: 'DcfFcff["nopat", "2031E"] * (1 + @table["g_rate", @col]) * (1 - @table["g_rate", @col] / ScalarDrivers["terminalRonic", "active"])',
      format: "currency",
      decimals: 0,
    })
  }
  gHelper.addRow("g_rate", { cells: gRateCells })
  gHelper.addRow("term_fcff", { cells: gFcffCells })

  // =========================================================================
  // Band 5: WACC Discounting Sensitivity Schedule
  // =========================================================================
  const wHelper = sheet.addTable(
    "SensWaccHelper",
    "WACC Discounting Sensitivity Schedule",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Live present value of explicit FCFF and terminal discount factor by WACC row",
      ],
    }
  )
  wHelper.addColumn("label", { role: "descriptor", header: "WACC Tier" })
  wHelper.addColumn("wacc_rate", { header: "WACC" })
  for (const p of DCF_PERIODS) {
    wHelper.addColumn(p, { headers: ["PV", p] })
  }
  wHelper.addColumn("pv_explicit", { headers: ["Total", "Explicit PV"] })
  wHelper.addColumn("term_df", { headers: ["Terminal", "Disc. Fac."] })

  for (const w of SENS_WACC_ROWS) {
    const cells: Record<string, Cell | number> = {
      label: new Cell({ value: w.label }),
      wacc_rate: new Cell({ value: w.rate, format: "percentage", decimals: 2 }),
      pv_explicit: new Cell({
        expr: 'SUM(@table[@row, "Q4 26E".."2031E"])',
        format: "currency",
        decimals: 0,
      }),
      term_df: new Cell({
        expr: '1 / ((1 + @table[@row, "wacc_rate"]) ^ YEARFRAC(DcfFcff["val_date", "2031E"], DcfFcff["period_end", "2031E"], 3))',
        format: "number",
        decimals: 4,
      }),
    }
    for (const p of DCF_PERIODS) {
      cells[p] = new Cell({
        expr: `DcfFcff["stub_adj_fcff", "${p}"] / ((1 + @table[@row, "wacc_rate"]) ^ DcfFcff["disc_period_mid", "${p}"])`,
        format: "currency",
        decimals: 0,
      })
    }
    wHelper.addRow(w.id, { cells })
  }
}
