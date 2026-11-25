import { Cell, type Sheet, type Table } from "f8-engine"
import type { AuditedDataSnapshot } from "../kg.ts"
import {
  ALL_EQUITY_TICKERS,
  MARKET_TICKERS,
  wrapSubtitle,
  type EquityTicker,
  type MarketTicker,
} from "../timeline.ts"

const TICKER_LABELS: Readonly<Record<EquityTicker, string>> = {
  CRM: "Salesforce, Inc. (CRM)",
  ADBE: "Adobe Inc. (ADBE)",
  INTU: "Intuit Inc. (INTU)",
  NOW: "ServiceNow, Inc. (NOW)",
  WDAY: "Workday, Inc. (WDAY)",
  HUBS: "HubSpot, Inc. (HUBS)",
  ORCL: "Oracle Corporation (ORCL)",
}

function priceColId(ticker: MarketTicker): string {
  return `px_${ticker.toLowerCase()}`
}

function retColId(ticker: MarketTicker): string {
  return `ret_${ticker.toLowerCase()}`
}

function olsBetaExpr(
  tableId: string,
  startRow: string,
  endRow: string,
  ticker: EquityTicker
): string {
  const eqCol = retColId(ticker)
  const mktCol = retColId("SPY")
  const eqSlice = `${tableId}["${startRow}".."${endRow}", "${eqCol}"]`
  const mktSlice = `${tableId}["${startRow}".."${endRow}", "${mktCol}"]`
  return `(SUMPRODUCT(${eqSlice}, ${mktSlice}) - COUNT(${mktSlice}) * AVERAGE(${eqSlice}) * AVERAGE(${mktSlice})) / (SUMPRODUCT(${mktSlice}, ${mktSlice}) - COUNT(${mktSlice}) * AVERAGE(${mktSlice}) ^ 2)`
}

function addPriceReturnSeriesTable(
  sheet: Sheet,
  id: string,
  title: string,
  subtitle: readonly string[],
  dates: readonly string[],
  closes: Readonly<Record<MarketTicker, readonly number[]>>,
  rowPrefix: string
): Table {
  const table = sheet.addTable(id, title, {
    subtitle,
  })
  table.addColumn("item", { role: "descriptor", header: "Trade date" })
  for (const ticker of MARKET_TICKERS) {
    table.addColumn(priceColId(ticker), {
      headers: [ticker, "Close ($)"],
      group: "Closing Prices ($)",
      format: "currency",
      decimals: 2,
    })
  }
  for (const ticker of MARKET_TICKERS) {
    table.addColumn(retColId(ticker), {
      headers: [ticker, "Return"],
      group: "Periodic Returns (%)",
      format: "percentage",
      decimals: 2,
    })
  }

  for (let i = 0; i < dates.length; i += 1) {
    const dt = dates[i]
    if (dt === undefined) continue
    const rowId = `${rowPrefix}_${String(i).padStart(3, "0")}`
    const cells: Record<string, Cell | number | string | null> = {
      item: dt,
    }
    for (const ticker of MARKET_TICKERS) {
      const px = closes[ticker][i]
      if (px === undefined) {
        throw new Error(`Missing price for ${ticker} at index ${i}`)
      }
      cells[priceColId(ticker)] = px
      cells[retColId(ticker)] =
        i === 0
          ? null
          : new Cell({
              expr: `@table[@row, "${priceColId(ticker)}"] / @table[row.prev, "${priceColId(ticker)}"] - 1`,
            })
    }
    table.addRow(rowId, { cells })
  }
  return table
}

export interface MarketAndBetaTables {
  readonly macroRates: Table
  readonly betaSummary: Table
}

export interface MarketDataTables {
  readonly betaMonthly5Y: Table
  readonly betaWeekly2Y: Table
}

export function buildMarketAndBetaSheet(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): MarketAndBetaTables {
  const macroRates = sheet.addTable(
    "MacroRatesTable",
    "Sovereign Yields & Corporate Spreads",
    {
      subtitle: wrapSubtitle(
        `Sources: ${audited.citations.macroDgs10}; ${audited.citations.macroSingleAOas}`,
        44
      ),
    }
  )
  macroRates.addColumn("item", { role: "descriptor", header: "Benchmark" })
  macroRates.addColumn("val", {
    headers: ["Spot /", "Rate"],
    format: "percentage",
    decimals: 2,
  })

  macroRates.addSectionHeader("US Treasury constant-maturity yields")
  macroRates.addRow("dgs10", {
    cells: {
      item: "US 10-year Treasury yield (DGS10)",
      val: audited.macroRates.dgs10,
    },
  })
  macroRates.addRow("dgs2", {
    cells: {
      item: "US 2-year Treasury yield (DGS2)",
      val: audited.macroRates.dgs2,
    },
  })
  macroRates.addRow("curve_2s10s", {
    cells: {
      item: "2s10s Treasury yield curve slope",
      val: new Cell({
        expr: '@table["dgs10", "val"] - @table["dgs2", "val"]',
      }),
    },
    style: "subtotal",
  })

  macroRates.addRowGutter()
  macroRates.addSectionHeader("ICE BofA investment-grade spreads")
  macroRates.addRow("single_a_oas", {
    cells: {
      item: "ICE BofA Single-A US corporate OAS",
      val: audited.macroRates.singleAOas,
    },
  })
  macroRates.addRow("master_oas", {
    cells: {
      item: "ICE BofA US corporate master OAS",
      val: audited.macroRates.masterOas,
    },
  })
  macroRates.addRow("bbb_oas", {
    cells: {
      item: "ICE BofA BBB US corporate OAS",
      val: audited.macroRates.bbbOas,
    },
  })
  macroRates.addRow("marginal_pretax_kd", {
    cells: {
      item: "CRM marginal pre-tax cost of debt",
      val: new Cell({
        expr: '@table["dgs10", "val"] + @table["single_a_oas", "val"]',
      }),
    },
    style: "total",
    shade: "alt",
  })

  // Multi-Horizon OLS Beta Summary Table
  const mLast = `m_${String(audited.marketPrices.monthlyDates.length - 1).padStart(3, "0")}`
  const wLast = `w_${String(audited.marketPrices.weeklyDates.length - 1).padStart(3, "0")}`

  const betaSummary = sheet.addTable(
    "BetaSummaryTable",
    "Multi-Horizon Equity Beta & CAPM Cost of Equity (OLS vs. SPY)",
    {
      subtitle: wrapSubtitle(
        [
          `Source: ${audited.citations.marketPricesAll}`,
          "Spot as of 2026-11-18; 5Y monthly (n = 59) & 2Y weekly (n = 103) OLS regressions",
        ],
        92
      ),
    }
  )
  betaSummary.addColumn("item", { role: "descriptor", header: "Company" })
  betaSummary.addColumn("spot_px", {
    headers: ["Spot", "Price ($)"],
    format: "currency",
    decimals: 2,
  })
  betaSummary.addColumn("beta_5y_m", {
    headers: ["5Y Monthly", "Beta"],
    format: "number",
    decimals: 3,
  })
  betaSummary.addColumn("beta_2y_w", {
    headers: ["2Y Weekly", "Beta"],
    format: "number",
    decimals: 3,
  })
  betaSummary.addColumn("beta_diff", {
    headers: ["2Y vs. 5Y", "Spread"],
    format: "number",
    decimals: 3,
  })
  betaSummary.addColumn("ke_5y_m", {
    headers: ["CAPM Ke", "(5Y-M)"],
    format: "percentage",
    decimals: 2,
  })
  betaSummary.addColumn("ke_2y_w", {
    headers: ["CAPM Ke", "(2Y-W)"],
    format: "percentage",
    decimals: 2,
  })

  betaSummary.addSectionHeader("Subject company & enterprise SaaS peers")
  for (const ticker of ALL_EQUITY_TICKERS) {
    betaSummary.addRow(ticker, {
      cells: {
        item: TICKER_LABELS[ticker],
        spot_px: audited.marketPrices.spotPrices[ticker],
        beta_5y_m: new Cell({
          expr: olsBetaExpr("BetaMonthly5Y", "m_001", mLast, ticker),
        }),
        beta_2y_w: new Cell({
          expr: olsBetaExpr("BetaWeekly2Y", "w_001", wLast, ticker),
        }),
        beta_diff: new Cell({
          expr: '@table[@row, "beta_2y_w"] - @table[@row, "beta_5y_m"]',
        }),
        ke_5y_m: new Cell({
          expr: 'MacroRatesTable["dgs10", "val"] + @table[@row, "beta_5y_m"] * ScalarDrivers["erp", "active"]',
        }),
        ke_2y_w: new Cell({
          expr: 'MacroRatesTable["dgs10", "val"] + @table[@row, "beta_2y_w"] * ScalarDrivers["erp", "active"]',
        }),
      },
      ...(ticker === "CRM"
        ? { style: "subtotal" as const, shade: "muted" as const }
        : {}),
    })
  }

  betaSummary.addRowGutter()
  betaSummary.addSectionHeader("Peer group & sector summary")
  betaSummary.addRow("peer_mean", {
    cells: {
      item: "Peer mean (6 comps, ex-CRM)",
      spot_px: null,
      beta_5y_m: new Cell({ expr: 'AVERAGE(@table["ADBE".."ORCL", @col])' }),
      beta_2y_w: new Cell({ expr: 'AVERAGE(@table["ADBE".."ORCL", @col])' }),
      beta_diff: new Cell({ expr: 'AVERAGE(@table["ADBE".."ORCL", @col])' }),
      ke_5y_m: new Cell({ expr: 'AVERAGE(@table["ADBE".."ORCL", @col])' }),
      ke_2y_w: new Cell({ expr: 'AVERAGE(@table["ADBE".."ORCL", @col])' }),
    },
    style: "subtotal",
  })
  betaSummary.addRow("peer_median", {
    cells: {
      item: "Peer median (6 comps, ex-CRM)",
      spot_px: null,
      beta_5y_m: new Cell({ expr: 'MEDIAN(@table["ADBE".."ORCL", @col])' }),
      beta_2y_w: new Cell({ expr: 'MEDIAN(@table["ADBE".."ORCL", @col])' }),
      beta_diff: new Cell({ expr: 'MEDIAN(@table["ADBE".."ORCL", @col])' }),
      ke_5y_m: new Cell({ expr: 'MEDIAN(@table["ADBE".."ORCL", @col])' }),
      ke_2y_w: new Cell({ expr: 'MEDIAN(@table["ADBE".."ORCL", @col])' }),
    },
    style: "subtotal",
  })
  betaSummary.addRow("all7_median", {
    cells: {
      item: "All-7 cloud median (incl. CRM)",
      spot_px: null,
      beta_5y_m: new Cell({ expr: 'MEDIAN(@table["CRM".."ORCL", @col])' }),
      beta_2y_w: new Cell({ expr: 'MEDIAN(@table["CRM".."ORCL", @col])' }),
      beta_diff: new Cell({ expr: 'MEDIAN(@table["CRM".."ORCL", @col])' }),
      ke_5y_m: new Cell({ expr: 'MEDIAN(@table["CRM".."ORCL", @col])' }),
      ke_2y_w: new Cell({ expr: 'MEDIAN(@table["CRM".."ORCL", @col])' }),
    },
    style: "total",
    shade: "alt",
  })

  return {
    macroRates,
    betaSummary,
  }
}

export function buildMarketDataSheet(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): MarketDataTables {
  const betaMonthly5Y = addPriceReturnSeriesTable(
    sheet,
    "BetaMonthly5Y",
    "5-Year Monthly Closing Prices & Periodic Returns (n = 59)",
    wrapSubtitle(
      [
        `Source: ${audited.citations.marketPricesAll}`,
        "2021-11-30 to 2026-10-30 (n = 59 complete months) | Feeds live 5Y monthly OLS betas",
      ],
      196
    ),
    audited.marketPrices.monthlyDates,
    audited.marketPrices.monthlyCloses,
    "m"
  )

  const betaWeekly2Y = addPriceReturnSeriesTable(
    sheet,
    "BetaWeekly2Y",
    "2-Year Weekly Closing Prices & Periodic Returns (n = 103)",
    wrapSubtitle(
      [
        `Source: ${audited.citations.marketPricesAll}`,
        "2024-11-22 to 2026-11-13 (n = 103 complete weeks) | Feeds live 2Y weekly OLS betas",
      ],
      196
    ),
    audited.marketPrices.weeklyDates,
    audited.marketPrices.weeklyCloses,
    "w"
  )

  return {
    betaMonthly5Y,
    betaWeekly2Y,
  }
}
