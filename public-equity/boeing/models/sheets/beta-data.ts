import type { Sheet, Table } from "f8-engine"
import {
  ALL_BETA_ENTITIES,
  type BetaEntity,
  type BoeingKgData,
  type PriceSeriesData,
} from "../kg-loader.ts"

const BETA_COL_ID: Readonly<Record<BetaEntity, string>> = Object.freeze({
  BA: "BA",
  "AIR.PA": "AIR_PA",
  GE: "GE",
  RTX: "RTX",
  GD: "GD",
  LMT: "LMT",
  NOC: "NOC",
  "^GSPC": "SPX",
})

const BETA_COL_HEADER: Readonly<Record<BetaEntity, string>> = Object.freeze({
  BA: "BA",
  "AIR.PA": "AIR.PA",
  GE: "GE",
  RTX: "RTX",
  GD: "GD",
  LMT: "LMT",
  NOC: "NOC",
  "^GSPC": "S&P 500",
})

function addBetaStatsTable(
  sheet: Sheet,
  prefix: "5Y" | "2Y",
  subtitle: readonly string[],
  returnsId: string,
  nDates: number
): Table {
  const statsId = `BetaStats${prefix}`
  const firstRetRow = "r_001"
  const lastRetRow = `r_${String(nDates - 1).padStart(3, "0")}`

  const stats = sheet.addTable(
    statsId,
    `${prefix === "5Y" ? "5-Year Monthly" : "2-Year Weekly"} OLS Beta Regression vs. S&P 500`,
    {
      subtitle,
    }
  )
  stats.addColumn("metric", { role: "descriptor", headers: ["Statistic"] })
  for (const ent of ALL_BETA_ENTITIES) {
    stats.addColumn(BETA_COL_ID[ent], {
      headers: [BETA_COL_HEADER[ent]],
      ...(ent === "BA" ? { style: "bold" } : {}),
    })
  }

  stats.addRow("obs_count", {
    cells: { metric: "Return obs. (N)" },
    expr: `COUNT(${returnsId}["${firstRetRow}".."${lastRetRow}", @col])`,
    format: "integer",
  })
  stats.addRow("mean_ret", {
    cells: { metric: "Mean periodic return" },
    expr: `AVERAGE(${returnsId}["${firstRetRow}".."${lastRetRow}", @col])`,
    format: "percentage",
    decimals: 2,
  })
  stats.addRow("sum_xy", {
    cells: { metric: "Cross-product sum (XY)" },
    expr: `SUMPRODUCT(${returnsId}["${firstRetRow}".."${lastRetRow}", @col], ${returnsId}["${firstRetRow}".."${lastRetRow}", "SPX"])`,
    format: "number",
    decimals: 5,
  })
  stats.addRow("sum_xx", {
    cells: { metric: "Market sq. sum (XX)" },
    expr: `SUMPRODUCT(${returnsId}["${firstRetRow}".."${lastRetRow}", "SPX"], ${returnsId}["${firstRetRow}".."${lastRetRow}", "SPX"])`,
    format: "number",
    decimals: 5,
  })
  stats.addRow("sum_yy", {
    cells: { metric: "Asset sq. sum (YY)" },
    expr: `SUMPRODUCT(${returnsId}["${firstRetRow}".."${lastRetRow}", @col], ${returnsId}["${firstRetRow}".."${lastRetRow}", @col])`,
    format: "number",
    decimals: 5,
  })
  stats.addRow("cov_num", {
    cells: { metric: "Covariance numerator" },
    expr: `@table["sum_xy", @col] - @table["obs_count", @col] * @table["mean_ret", @col] * @table["mean_ret", "SPX"]`,
    format: "number",
    decimals: 5,
  })
  stats.addRow("var_m_num", {
    cells: { metric: "Market var. numerator" },
    expr: `@table["sum_xx", @col] - @table["obs_count", @col] * @table["mean_ret", "SPX"] * @table["mean_ret", "SPX"]`,
    format: "number",
    decimals: 5,
  })
  stats.addRow("var_i_num", {
    cells: { metric: "Asset var. numerator" },
    expr: `@table["sum_yy", @col] - @table["obs_count", @col] * @table["mean_ret", @col] * @table["mean_ret", @col]`,
    format: "number",
    decimals: 5,
  })
  stats.addRow("raw_beta", {
    cells: { metric: "Raw OLS equity beta" },
    expr: `@table["cov_num", @col] / @table["var_m_num", @col]`,
    format: "number",
    decimals: 3,
    style: "subtotal",
  })
  stats.addRow("r_squared", {
    cells: { metric: "Regression R-squared" },
    expr: `(@table["cov_num", @col] * @table["cov_num", @col]) / (@table["var_i_num", @col] * @table["var_m_num", @col])`,
    format: "percentage",
    decimals: 1,
  })
  stats.addRow("blume_beta", {
    cells: { metric: "Blume-adjusted beta" },
    expr: `(2 / 3) * @table["raw_beta", @col] + (1 / 3)`,
    format: "number",
    decimals: 3,
    style: "bold",
  })

  return stats
}

function addBetaSeriesTables(
  sheet: Sheet,
  prefix: "5Y" | "2Y",
  series: PriceSeriesData
): readonly [Table, Table] {
  const pricesId = `BetaPrices${prefix}`
  const returnsId = `BetaReturns${prefix}`
  const nDates = series.dates.length

  const prices = sheet.addTable(
    pricesId,
    `${prefix === "5Y" ? "5-Year Monthly" : "2-Year Weekly"} Adjusted Close Prices`,
    {
      subtitle: [
        `Local currency adjusted close (${series.dates[0]} to ${series.dates[nDates - 1]})`,
        "S&P 500 index level; Source: Yahoo Finance",
      ],
    }
  )
  prices.addColumn("obs_date", { role: "descriptor", headers: ["Date"] })
  for (const ent of ALL_BETA_ENTITIES) {
    prices.addColumn(BETA_COL_ID[ent], {
      headers: [BETA_COL_HEADER[ent]],
      format: "number",
      decimals: 2,
    })
  }
  for (let i = 0; i < nDates; i++) {
    const rowId = `p_${String(i).padStart(3, "0")}`
    const cells: Record<string, string | number> = {
      obs_date: series.dates[i]!,
    }
    for (const ent of ALL_BETA_ENTITIES) {
      cells[BETA_COL_ID[ent]] = series.prices[ent][i]!
    }
    prices.addRow(rowId, { cells })
  }

  const returns = sheet.addTable(
    returnsId,
    `${prefix === "5Y" ? "5-Year Monthly" : "2-Year Weekly"} Periodic Returns`,
    {
      subtitle: [
        "Simple periodic returns from adjusted close prices",
        `Basis for ${prefix === "5Y" ? "5-year monthly" : "2-year weekly"} OLS regression statistics`,
      ],
    }
  )
  returns.addColumn("obs_date", { role: "descriptor", headers: ["Date"] })
  for (const ent of ALL_BETA_ENTITIES) {
    returns.addColumn(BETA_COL_ID[ent], {
      headers: [BETA_COL_HEADER[ent]],
      format: "percentage",
      decimals: 2,
    })
  }
  for (let i = 1; i < nDates; i++) {
    const rowId = `r_${String(i).padStart(3, "0")}`
    const prevP = `p_${String(i - 1).padStart(3, "0")}`
    const currP = `p_${String(i).padStart(3, "0")}`
    returns.addRow(rowId, {
      cells: { obs_date: series.dates[i]! },
      expr: `${pricesId}["${currP}", @col] / ${pricesId}["${prevP}", @col] - 1`,
    })
  }

  return [prices, returns]
}

export function buildBetaDataSheet(sheet: Sheet, kg: BoeingKgData): void {
  const stats5y = addBetaStatsTable(
    sheet,
    "5Y",
    [
      "OLS regression on 61 monthly returns (Oct 2021 – Nov 2026)",
      "Source: Yahoo Finance market close history",
    ],
    "BetaReturns5Y",
    kg.prices5yMonthly.dates.length
  )
  const stats2y = addBetaStatsTable(
    sheet,
    "2Y",
    [
      "OLS regression on 107 weekly returns (Oct 2024 – Nov 2026)",
      "Source: Yahoo Finance market close history",
    ],
    "BetaReturns2Y",
    kg.prices2yWeekly.dates.length
  )

  const [prices5y, returns5y] = addBetaSeriesTables(
    sheet,
    "5Y",
    kg.prices5yMonthly
  )
  const [prices2y, returns2y] = addBetaSeriesTables(
    sheet,
    "2Y",
    kg.prices2yWeekly
  )

  sheet.setBands([
    { lanes: [{ tables: [stats5y] }, { tables: [stats2y] }] },
    { lanes: [{ tables: [prices5y] }, { tables: [returns5y] }] },
    { lanes: [{ tables: [prices2y] }, { tables: [returns2y] }] },
  ])
}
