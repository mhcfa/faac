import { Cell, type Sheet } from "f8-engine"
import {
  ALL_MARKET_TICKERS,
  ALL_PEERS,
  type AuditedModelData,
  type PeerTicker,
} from "../kg-extractors.ts"
import {
  RATES_AS_OF_DATE,
  SCALE_NOTE_USD_M,
  VALUATION_AS_OF_DATE,
} from "../scale.ts"

const EQUITY_TICKERS: readonly ("META" | PeerTicker)[] = ["META", ...ALL_PEERS]

const TICKER_LABELS: Readonly<Record<"META" | PeerTicker, string>> = {
  META: "Meta Platforms (META)",
  GOOGL: "Alphabet (GOOGL)",
  AMZN: "Amazon (AMZN)",
  MSFT: "Microsoft (MSFT)",
  PINS: "Pinterest (PINS)",
  SNAP: "Snap (SNAP)",
  RDDT: "Reddit (RDDT)",
}

export function buildBetaWaccSheet(
  sheet: Sheet,
  betaDataSheet: Sheet,
  data: AuditedModelData
): void {
  const mPeriods = data.monthlyPrices5Y.periods
  const mRetPeriods = mPeriods.slice(1)
  const mFirstRet = mRetPeriods[0]
  const mLastRet = mRetPeriods[mRetPeriods.length - 1]
  if (mFirstRet === undefined || mLastRet === undefined) {
    throw new Error("Insufficient 5Y monthly price series")
  }

  const wPeriods = data.weeklyPrices2Y.periods
  const wRetPeriods = wPeriods.slice(1)
  const wFirstRet = wRetPeriods[0]
  const wLastRet = wRetPeriods[wRetPeriods.length - 1]
  if (wFirstRet === undefined || wLastRet === undefined) {
    throw new Error("Insufficient 2Y weekly price series")
  }

  // =========================================================================
  // 1. Left Lane (Cols B..I): Live WACC & Credit Spread Build
  // =========================================================================
  const wacc = sheet.addTable(
    "WaccBuild",
    "Weighted Average Cost of Capital (WACC) & Credit Spread Attribution",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        `Market close ${VALUATION_AS_OF_DATE}; Fed (FRED) constant-maturity yields as of ${RATES_AS_OF_DATE}`,
      ],
    }
  )
  wacc.addColumn("label", { role: "descriptor", header: "WACC Component" })
  wacc.addColumn("val", { header: "Value" })
  wacc.addColumn("notes", { role: "descriptor", header: "Basis / Source" })

  wacc.addSectionHeader("Market, share count & macro rate inputs")

  wacc.addRow("spot_price", {
    cells: {
      label: new Cell({ value: "META spot share price (Nov 20, 2026)" }),
      val: data.val("market_spot_prices", "spot_price", "2026-11-20", {
        entity: "META",
      }),
      notes: "Yahoo Finance closing price",
    },
    format: "currency",
    decimals: 2,
  })
  wacc.addRow("class_a_shares_cover", {
    cells: {
      label: new Cell({ value: "Class A common shares (Oct 16 cover, M)" }),
      val: data.val(
        "balance_sheet",
        "class_a_shares_outstanding",
        "2026-10-16",
        {
          entity: "META",
        }
      ),
      notes: "Q3 2026 Form 10-Q cover page",
    },
    format: "number",
    decimals: 2,
  })
  wacc.addRow("class_b_shares_cover", {
    cells: {
      label: new Cell({ value: "Class B common shares (Oct 16 cover, M)" }),
      val: data.val(
        "balance_sheet",
        "class_b_shares_outstanding",
        "2026-10-16",
        {
          entity: "META",
        }
      ),
      notes: "Q3 2026 Form 10-Q (10 votes/sh)",
    },
    format: "number",
    decimals: 2,
  })
  wacc.addRow("basic_shares_cover", {
    cells: {
      label: new Cell({ value: "Total basic common shares (Oct 16, M)" }),
      notes: "Equals diluted at spot (< $562.12)",
    },
    expr: '@table["class_a_shares_cover", "val"] + @table["class_b_shares_cover", "val"]',
    format: "number",
    decimals: 2,
  })
  wacc.addRow("spot_mkt_cap", {
    cells: {
      label: new Cell({ value: "Spot common equity market cap ($M)" }),
      notes: "Cover basic shares × $560.84 spot",
    },
    expr: '@table["spot_price", "val"] * @table["basic_shares_cover", "val"]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  wacc.addRow("q3_legacy_debt_fv", {
    cells: {
      label: new Cell({ value: "Q3 2026 senior notes fair value ($M)" }),
      val: data.val("debt_schedule", "senior_notes_fair_value", "2026-Q3", {
        entity: "META",
      }),
      notes: "Q3 10-Q Note 9 (vs. $83.7B book)",
    },
    format: "currency",
    decimals: 0,
  })
  wacc.addRow("rf_dgs10", {
    cells: {
      label: new Cell({ value: "Risk-free rate (U.S. 10-Yr Treasury)" }),
      val: data.val("macro_rates", "dgs10", "2026-11-19", { entity: "US" }),
      notes: "FRED DGS10 (Nov 19, 2026)",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("rf_dgs30_memo", {
    cells: {
      label: new Cell({ value: "Memo: U.S. 30-Year Treasury yield" }),
      val: data.val("macro_rates", "dgs30", "2026-11-19", { entity: "US" }),
      notes: "FRED DGS30 (Nov 19, 2026)",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("aa_oas", {
    cells: {
      label: new Cell({ value: "ICE BofA U.S. Corporate AA OAS" }),
      val: data.val("macro_rates", "aa_oas", "2026-11-19", { entity: "US" }),
      notes: "FRED AA corporate index OAS",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("a_oas", {
    cells: {
      label: new Cell({ value: "ICE BofA U.S. Corporate Single-A OAS" }),
      val: data.val("macro_rates", "a_oas", "2026-11-19", { entity: "US" }),
      notes: "FRED Single-A corporate index OAS",
    },
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("aa_benchmark_yield", {
    cells: {
      label: new Cell({ value: "AA benchmark yield (10Y UST + AA OAS)" }),
      notes: null,
    },
    expr: '@table["rf_dgs10", "val"] + @table["aa_oas", "val"]',
    format: "percentage",
    decimals: 2,
  })

  wacc.addRowGutter()
  wacc.addSectionHeader(
    "Pro forma capital structure (fair value & equity-linked)"
  )

  wacc.addRow("pf_pure_debt", {
    cells: {
      label: new Cell({ value: "Pro forma funded pure debt (fair value)" }),
      notes: "Legacy FV + Nov 2026 USD/EUR notes",
    },
    expr: '@table["q3_legacy_debt_fv", "val"] + PostQ3FinancingRegistry["total_closed_q4_debt", "val"]',
    format: "currency",
    decimals: 1,
  })
  wacc.addRow("pf_equity_and_hybrid", {
    cells: {
      label: new Cell({ value: "Pro forma equity & hybrid capital ($M)" }),
      notes: "Common + 46M fwd + $12.5B METAM",
    },
    expr: '@table["spot_price", "val"] * (@table["basic_shares_cover", "val"] + PostQ3FinancingRegistry["fwd_total_shares", "val"]) + PostQ3FinancingRegistry["mcp_base_liq_pref", "val"]',
    format: "currency",
    decimals: 0,
  })
  wacc.addRow("total_capital", {
    cells: {
      label: new Cell({ value: "Pro forma total capitalization ($M)" }),
      notes: null,
    },
    expr: '@table["pf_equity_and_hybrid", "val"] + @table["pf_pure_debt", "val"]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  wacc.addRow("weight_equity", {
    cells: {
      label: new Cell({ value: "Equity & hybrid weight (% total capital)" }),
      notes: null,
    },
    expr: '@table["pf_equity_and_hybrid", "val"] / @table["total_capital", "val"]',
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("weight_debt", {
    cells: {
      label: new Cell({ value: "Pure debt weight (% total capital)" }),
      notes: null,
    },
    expr: '@table["pf_pure_debt", "val"] / @table["total_capital", "val"]',
    format: "percentage",
    decimals: 2,
  })
  const histDePoints = [
    [
      "hist_de_2022a",
      "Historical gross debt / equity — FY2022A",
      "2022A",
      "2022-12-01",
    ],
    [
      "hist_de_2023a",
      "Historical gross debt / equity — FY2023A",
      "2023A",
      "2023-12-01",
    ],
    [
      "hist_de_2024a",
      "Historical gross debt / equity — FY2024A",
      "2024A",
      "2024-12-01",
    ],
    [
      "hist_de_2025a",
      "Historical gross debt / equity — FY2025A",
      "2025A",
      "2025-12-01",
    ],
    [
      "hist_de_q326a",
      "Historical gross debt / equity — Q3 2026A",
      "Q3 26A",
      "2026-09-01",
    ],
  ] as const

  for (const [rowId, label, bsPeriod, priceMonth] of histDePoints) {
    wacc.addRow(rowId, {
      cells: {
        label: new Cell({ value: label, indent: 1 }),
        notes: null,
      },
      expr: `(BalanceSheet["long_term_debt", "${bsPeriod}"] + DebtHybridShareSchedule["current_portion_lt_debt", "${bsPeriod}"]) / (MonthlyPrices5Y["${priceMonth}", "META"] * DebtHybridShareSchedule["ending_diluted_shares", "${bsPeriod}"])`,
      format: "percentage",
      decimals: 2,
    })
  }
  wacc.addRow("hist_avg_de_ratio", {
    cells: {
      label: new Cell({ value: "Lookback avg. gross D/E (FY22–Q3 26)" }),
      notes: "5-point avg. for Hamada unlevering",
    },
    expr: 'AVERAGE(@table["hist_de_2022a".."hist_de_q326a", "val"])',
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("pf_de_ratio", {
    cells: {
      label: new Cell({ value: "Pro forma pure debt / equity & hybrid" }),
      notes: null,
    },
    expr: '@table["pf_pure_debt", "val"] / @table["pf_equity_and_hybrid", "val"]',
    format: "percentage",
    decimals: 2,
  })

  wacc.addRowGutter()
  wacc.addSectionHeader(
    "Cost of equity (CAPM with live Hamada beta relevering)"
  )

  wacc.addRow("erp", {
    cells: {
      label: new Cell({ value: "U.S. equity risk premium (ERP)" }),
      notes: "NYU Stern & Kroll benchmark",
    },
    expr: 'ScalarDrivers["equityRiskPremium", "active"]',
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("raw_active_beta", {
    cells: {
      label: new Cell({ value: "Selected regression beta (pre-Hamada)" }),
      notes: "2Y Blume / 5Y raw / 5Y Blume",
    },
    expr: 'CHOOSE(ScalarDrivers["betaRegimeSelector", "active"], BetaSummary["META", "beta_2y_blume"], BetaSummary["META", "beta_5y_raw"], BetaSummary["META", "beta_5y_blume"])',
    format: "number",
    decimals: 3,
  })
  wacc.addRow("unlevered_beta", {
    cells: {
      label: new Cell({ value: "Unlevered asset beta (at lookback D/E)" }),
      notes: null,
    },
    expr: '@table["raw_active_beta", "val"] / (1 + (1 - @table["tax_rate", "val"]) * @table["hist_avg_de_ratio", "val"])',
    format: "number",
    decimals: 3,
  })
  wacc.addRow("active_beta", {
    cells: {
      label: new Cell({ value: "Pro forma relevered equity beta" }),
      notes: "Hamada-relevered to pro forma D/E",
    },
    expr: '@table["unlevered_beta", "val"] * (1 + (1 - @table["tax_rate", "val"]) * @table["pf_de_ratio", "val"])',
    format: "number",
    decimals: 3,
  })
  wacc.addRow("ke", {
    cells: {
      label: new Cell({ value: "Cost of equity (Ke = Rf + Beta × ERP)" }),
      notes: null,
    },
    expr: '@table["rf_dgs10", "val"] + @table["active_beta", "val"] * @table["erp", "val"]',
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })

  wacc.addRowGutter()
  wacc.addSectionHeader("Marginal cost of debt, credit spread & final WACC")

  wacc.addRow("kd_pretax", {
    cells: {
      label: new Cell({ value: "Marginal pre-tax Kd (Nov 2026 10Y USD)" }),
      notes: "Nov 5, 2026 10Y senior note coupon",
    },
    expr: 'PostQ3FinancingRegistry["nov_usd_2036", "coupon"]',
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("issuer_spread_over_aa", {
    cells: {
      label: new Cell({ value: "META credit spread over AA benchmark" }),
      notes: "AI CapEx debt supply spread",
    },
    expr: '@table["kd_pretax", "val"] - @table["aa_benchmark_yield", "val"]',
    format: "percentage",
    decimals: 2,
  })
  wacc.addRow("tax_rate", {
    cells: {
      label: new Cell({ value: "Marginal effective tax rate" }),
      notes: null,
    },
    expr: 'ScalarDrivers["effectiveTaxRate", "active"]',
    format: "percentage",
    decimals: 1,
  })
  wacc.addRow("kd_aftertax", {
    cells: {
      label: new Cell({ value: "After-tax marginal cost of debt" }),
      notes: null,
    },
    expr: '@table["kd_pretax", "val"] * (1 - @table["tax_rate", "val"])',
    format: "percentage",
    decimals: 2,
    style: "subtotal",
  })
  wacc.addRow("wacc", {
    cells: {
      label: new Cell({ value: "Weighted average cost of capital (WACC)" }),
      notes: null,
    },
    expr: '@table["weight_equity", "val"] * @table["ke", "val"] + @table["weight_debt", "val"] * @table["kd_aftertax", "val"]',
    format: "percentage",
    decimals: 2,
    style: "total",
    highlight: true,
  })
  wacc.addRow("beta_base_relevered", {
    cells: {
      label: new Cell({ value: "Memo: Base Case relevered equity beta" }),
      notes: "5Y raw beta relevered at Base ETR",
    },
    expr: 'BetaSummary["META", "beta_5y_raw"] / (1 + (1 - ScalarDrivers["effectiveTaxRate", "base"]) * @table["hist_avg_de_ratio", "val"]) * (1 + (1 - ScalarDrivers["effectiveTaxRate", "base"]) * @table["pf_de_ratio", "val"])',
    format: "number",
    decimals: 3,
    shade: "alt",
  })
  wacc.addRow("ke_base_ref", {
    cells: {
      label: new Cell({ value: "Memo: Base Case cost of equity (Ke)" }),
      notes: null,
    },
    expr: '@table["rf_dgs10", "val"] + @table["beta_base_relevered", "val"] * ScalarDrivers["equityRiskPremium", "base"]',
    format: "percentage",
    decimals: 2,
    shade: "alt",
  })
  wacc.addRow("wacc_base_ref", {
    cells: {
      label: new Cell({ value: "Memo: Base Case WACC reference" }),
      notes: "Anchors variance attribution",
    },
    expr: '@table["weight_equity", "val"] * @table["ke_base_ref", "val"] + @table["weight_debt", "val"] * (@table["kd_pretax", "val"] * (1 - ScalarDrivers["effectiveTaxRate", "base"]))',
    format: "percentage",
    decimals: 2,
    shade: "alt",
  })

  // =========================================================================
  // 2. Right Lane (Cols K..T): Multi-Horizon Live OLS Beta Summary
  // =========================================================================
  const betaSum = sheet.addTable(
    "BetaSummary",
    "Multi-Horizon Equity Beta Analysis vs. S&P 500 (Live OLS Regressions)",
    {
      subtitle: [
        "5Y Monthly (n=58 through Oct 2026; RDDT n=30 post-IPO) & 2Y Weekly (n=104 through Nov 16, 2026)",
        "Yahoo Finance adjusted close prices; trailing duplicate Nov 20 bar excluded",
      ],
      rightOf: wacc,
      gap: 1,
    }
  )
  betaSum.addColumn("label", { role: "descriptor", header: "Company" })
  betaSum.addColumn("beta_5y_raw", {
    headers: ["Raw", "Beta"],
    group: "5Y Monthly (n=58)",
  })
  betaSum.addColumn("beta_5y_blume", {
    headers: ["Blume", "Beta"],
    group: "5Y Monthly (n=58)",
  })
  betaSum.addColumn("r2_5y", {
    headers: ["R-Sq."],
    group: "5Y Monthly (n=58)",
  })
  betaSum.addColumn("beta_2y_raw", {
    headers: ["Raw", "Beta"],
    group: "2Y Weekly (n=104)",
  })
  betaSum.addColumn("beta_2y_blume", {
    headers: ["Blume", "Beta"],
    group: "2Y Weekly (n=104)",
  })
  betaSum.addColumn("r2_2y", {
    headers: ["R-Sq."],
    group: "2Y Weekly (n=104)",
  })
  betaSum.addColumn("regime_shift", {
    headers: ["2Y vs 5Y", "Shift"],
    group: "Spread",
    shade: "muted",
  })

  betaSum.addSectionHeader("Target & comparable universe")

  for (const t of EQUITY_TICKERS) {
    const mktCol5y = t === "RDDT" ? "GSPC_RDDT" : "GSPC"
    const mRange = `"${mFirstRet}".."${mLastRet}"`
    const wRange = `"${wFirstRet}".."${wLastRet}"`
    betaSum.addRow(t, {
      cells: {
        label: new Cell({ value: TICKER_LABELS[t] }),
        beta_5y_raw: new Cell({
          expr: `SUMPRODUCT(MonthlyExcess5Y[${mRange}, "${t}"], MonthlyExcess5Y[${mRange}, "${mktCol5y}"]) / SUMPRODUCT(MonthlyExcess5Y[${mRange}, "${mktCol5y}"], MonthlyExcess5Y[${mRange}, "${mktCol5y}"])`,
          format: "number",
          decimals: 3,
          note:
            t === "RDDT"
              ? "5Y monthly regression spans 30 post-IPO monthly returns (May 2024–Oct 2026); 2Y weekly spans full n=104."
              : undefined,
        }),
        beta_5y_blume: new Cell({
          expr: '(2 / 3) * @table[@row, "beta_5y_raw"] + (1 / 3)',
          format: "number",
          decimals: 3,
        }),
        r2_5y: new Cell({
          expr: `(SUMPRODUCT(MonthlyExcess5Y[${mRange}, "${t}"], MonthlyExcess5Y[${mRange}, "${mktCol5y}"]) ^ 2) / (SUMPRODUCT(MonthlyExcess5Y[${mRange}, "${t}"], MonthlyExcess5Y[${mRange}, "${t}"]) * SUMPRODUCT(MonthlyExcess5Y[${mRange}, "${mktCol5y}"], MonthlyExcess5Y[${mRange}, "${mktCol5y}"]))`,
          format: "percentage",
          decimals: 1,
        }),
        beta_2y_raw: new Cell({
          expr: `SUMPRODUCT(WeeklyExcess2Y[${wRange}, "${t}"], WeeklyExcess2Y[${wRange}, "GSPC"]) / SUMPRODUCT(WeeklyExcess2Y[${wRange}, "GSPC"], WeeklyExcess2Y[${wRange}, "GSPC"])`,
          format: "number",
          decimals: 3,
        }),
        beta_2y_blume: new Cell({
          expr: '(2 / 3) * @table[@row, "beta_2y_raw"] + (1 / 3)',
          format: "number",
          decimals: 3,
        }),
        r2_2y: new Cell({
          expr: `(SUMPRODUCT(WeeklyExcess2Y[${wRange}, "${t}"], WeeklyExcess2Y[${wRange}, "GSPC"]) ^ 2) / (SUMPRODUCT(WeeklyExcess2Y[${wRange}, "${t}"], WeeklyExcess2Y[${wRange}, "${t}"]) * SUMPRODUCT(WeeklyExcess2Y[${wRange}, "GSPC"], WeeklyExcess2Y[${wRange}, "GSPC"]))`,
          format: "percentage",
          decimals: 1,
        }),
        regime_shift: new Cell({
          expr: '@table[@row, "beta_2y_raw"] - @table[@row, "beta_5y_raw"]',
          format: "number",
          decimals: 3,
        }),
      },
      style: t === "META" ? "bold" : "data",
    })
  }

  betaSum.addRowGutter()
  betaSum.addSectionHeader("Peer group medians")
  betaSum.addRow("group_a_median", {
    cells: {
      label: new Cell({ value: "Group A Median (GOOGL, AMZN, MSFT)" }),
      beta_5y_raw: new Cell({
        expr: 'MEDIAN(@table["GOOGL".."MSFT", @col])',
        format: "number",
        decimals: 3,
      }),
      beta_5y_blume: new Cell({
        expr: 'MEDIAN(@table["GOOGL".."MSFT", @col])',
        format: "number",
        decimals: 3,
      }),
      r2_5y: new Cell({
        expr: 'MEDIAN(@table["GOOGL".."MSFT", @col])',
        format: "percentage",
        decimals: 1,
      }),
      beta_2y_raw: new Cell({
        expr: 'MEDIAN(@table["GOOGL".."MSFT", @col])',
        format: "number",
        decimals: 3,
      }),
      beta_2y_blume: new Cell({
        expr: 'MEDIAN(@table["GOOGL".."MSFT", @col])',
        format: "number",
        decimals: 3,
      }),
      r2_2y: new Cell({
        expr: 'MEDIAN(@table["GOOGL".."MSFT", @col])',
        format: "percentage",
        decimals: 1,
      }),
      regime_shift: new Cell({
        expr: 'MEDIAN(@table["GOOGL".."MSFT", @col])',
        format: "number",
        decimals: 3,
      }),
    },
    style: "bold",
  })
  betaSum.addRow("group_b_median", {
    cells: {
      label: new Cell({ value: "Group B Median (PINS, SNAP, RDDT)" }),
      beta_5y_raw: new Cell({
        expr: 'MEDIAN(@table["PINS".."RDDT", @col])',
        format: "number",
        decimals: 3,
      }),
      beta_5y_blume: new Cell({
        expr: 'MEDIAN(@table["PINS".."RDDT", @col])',
        format: "number",
        decimals: 3,
      }),
      r2_5y: new Cell({
        expr: 'MEDIAN(@table["PINS".."RDDT", @col])',
        format: "percentage",
        decimals: 1,
      }),
      beta_2y_raw: new Cell({
        expr: 'MEDIAN(@table["PINS".."RDDT", @col])',
        format: "number",
        decimals: 3,
      }),
      beta_2y_blume: new Cell({
        expr: 'MEDIAN(@table["PINS".."RDDT", @col])',
        format: "number",
        decimals: 3,
      }),
      r2_2y: new Cell({
        expr: 'MEDIAN(@table["PINS".."RDDT", @col])',
        format: "percentage",
        decimals: 1,
      }),
      regime_shift: new Cell({
        expr: 'MEDIAN(@table["PINS".."RDDT", @col])',
        format: "number",
        decimals: 3,
      }),
    },
    style: "bold",
  })

  // =========================================================================
  // 3. Supporting 5-Year Monthly Price, Return & Excess-Return Matrices (Flat)
  // =========================================================================
  const mPrices = betaDataSheet.addTable(
    "MonthlyPrices5Y",
    "5-Year Monthly Adjusted Close Prices (Dec 2021 – Oct 2026)",
    {
      subtitle: [
        "Yahoo Finance monthly adjusted close; 59 completed month-end bars",
      ],
    }
  )
  mPrices.addColumn("label", { role: "descriptor", header: "Month" })
  for (const t of ALL_MARKET_TICKERS) {
    mPrices.addColumn(t, { header: t })
  }
  for (const p of mPeriods) {
    const cells: Record<string, Cell | number | null> = {
      label: new Cell({ value: p }),
    }
    for (const t of ALL_MARKET_TICKERS) {
      cells[t] = data.monthlyPrices5Y.values[t][p] ?? null
    }
    mPrices.addRow(p, { cells, format: "number", decimals: 2 })
  }

  const mRets = betaDataSheet.addTable(
    "MonthlyReturns5Y",
    "5-Year Monthly Total Returns (n=58 Completed Months)",
    {
      subtitle: [
        "Live period-over-period return series feeding OLS beta regressions",
      ],
      below: mPrices,
    }
  )
  mRets.addColumn("label", { role: "descriptor", header: "Month" })
  for (const t of ALL_MARKET_TICKERS) {
    mRets.addColumn(t, { header: t })
  }
  mRets.addColumn("GSPC_RDDT", { headers: ["S&P 500", "(RDDT Win.)"] })

  for (let i = 1; i < mPeriods.length; i++) {
    const curr = mPeriods[i]
    const prev = mPeriods[i - 1]
    if (curr === undefined || prev === undefined) continue
    const cells: Record<string, Cell | number | null> = {
      label: new Cell({ value: curr }),
    }
    const rddtCurr = data.monthlyPrices5Y.values.RDDT[curr] ?? null
    const rddtPrev = data.monthlyPrices5Y.values.RDDT[prev] ?? null
    for (const t of ALL_MARKET_TICKERS) {
      if (t === "RDDT" && (rddtCurr === null || rddtPrev === null)) {
        cells[t] = null
      } else {
        cells[t] = new Cell({
          expr: `MonthlyPrices5Y["${curr}", "${t}"] / MonthlyPrices5Y["${prev}", "${t}"] - 1`,
        })
      }
    }
    cells["GSPC_RDDT"] =
      rddtCurr === null || rddtPrev === null
        ? null
        : new Cell({ expr: '@table[@row, "GSPC"]' })
    mRets.addRow(curr, { cells, format: "percentage", decimals: 2 })
  }
  mRets.addRow("mean_ret", {
    cells: { label: new Cell({ value: "Mean monthly return" }) },
    expr: `AVERAGE(@table["${mFirstRet}".."${mLastRet}", @col])`,
    format: "percentage",
    decimals: 3,
    style: "subtotal",
  })

  const mExcess = betaDataSheet.addTable(
    "MonthlyExcess5Y",
    "5-Year Monthly Mean-Centered Returns (OLS Deviations)",
    {
      subtitle: [
        "Periodic return minus sample mean across n=58 months (n=30 for RDDT post-IPO window)",
      ],
      below: mRets,
    }
  )
  mExcess.addColumn("label", { role: "descriptor", header: "Month" })
  for (const t of ALL_MARKET_TICKERS) {
    mExcess.addColumn(t, { header: t })
  }
  mExcess.addColumn("GSPC_RDDT", { headers: ["S&P 500", "(RDDT Win.)"] })

  for (let i = 1; i < mPeriods.length; i++) {
    const curr = mPeriods[i]
    const prev = mPeriods[i - 1]
    if (curr === undefined || prev === undefined) continue
    const rddtValid =
      (data.monthlyPrices5Y.values.RDDT[curr] ?? null) !== null &&
      (data.monthlyPrices5Y.values.RDDT[prev] ?? null) !== null
    const cells: Record<string, Cell | number | null> = {
      label: new Cell({ value: curr }),
    }
    for (const t of ALL_MARKET_TICKERS) {
      if (t === "RDDT" && !rddtValid) {
        cells[t] = null
      } else {
        cells[t] = new Cell({
          expr: `MonthlyReturns5Y["${curr}", "${t}"] - MonthlyReturns5Y["mean_ret", "${t}"]`,
        })
      }
    }
    cells["GSPC_RDDT"] = !rddtValid
      ? null
      : new Cell({
          expr: `MonthlyReturns5Y["${curr}", "GSPC_RDDT"] - MonthlyReturns5Y["mean_ret", "GSPC_RDDT"]`,
        })
    mExcess.addRow(curr, { cells, format: "percentage", decimals: 3 })
  }

  // =========================================================================
  // 4. Supporting 2-Year Weekly Price, Return & Excess-Return Matrices (Flat)
  // =========================================================================
  const wPrices = betaDataSheet.addTable(
    "WeeklyPrices2Y",
    "2-Year Weekly Adjusted Close Prices (Nov 2024 – Nov 16, 2026)",
    {
      subtitle: [
        "Yahoo Finance weekly adjusted close; 105 weekly bars (duplicate Nov 20 bar excluded)",
      ],
      below: mExcess,
    }
  )
  wPrices.addColumn("label", { role: "descriptor", header: "Week" })
  for (const t of ALL_MARKET_TICKERS) {
    wPrices.addColumn(t, { header: t })
  }
  for (const p of wPeriods) {
    const cells: Record<string, Cell | number | null> = {
      label: new Cell({ value: p }),
    }
    for (const t of ALL_MARKET_TICKERS) {
      cells[t] = data.weeklyPrices2Y.values[t][p] ?? null
    }
    wPrices.addRow(p, { cells, format: "number", decimals: 2 })
  }

  const wRets = betaDataSheet.addTable(
    "WeeklyReturns2Y",
    "2-Year Weekly Total Returns (n=104 Weeks)",
    {
      subtitle: [
        "Live weekly return series feeding 2-year OLS beta regressions",
      ],
      below: wPrices,
    }
  )
  wRets.addColumn("label", { role: "descriptor", header: "Week" })
  for (const t of ALL_MARKET_TICKERS) {
    wRets.addColumn(t, { header: t })
  }
  for (let i = 1; i < wPeriods.length; i++) {
    const curr = wPeriods[i]
    const prev = wPeriods[i - 1]
    if (curr === undefined || prev === undefined) continue
    const cells: Record<string, Cell | number> = {
      label: new Cell({ value: curr }),
    }
    for (const t of ALL_MARKET_TICKERS) {
      cells[t] = new Cell({
        expr: `WeeklyPrices2Y["${curr}", "${t}"] / WeeklyPrices2Y["${prev}", "${t}"] - 1`,
      })
    }
    wRets.addRow(curr, { cells, format: "percentage", decimals: 2 })
  }
  wRets.addRow("mean_ret", {
    cells: { label: new Cell({ value: "Mean weekly return" }) },
    expr: `AVERAGE(@table["${wFirstRet}".."${wLastRet}", @col])`,
    format: "percentage",
    decimals: 3,
    style: "subtotal",
  })

  const wExcess = betaDataSheet.addTable(
    "WeeklyExcess2Y",
    "2-Year Weekly Mean-Centered Returns (OLS Deviations)",
    {
      subtitle: [
        "Periodic return minus sample mean across n=104 completed weeks",
      ],
      below: wRets,
    }
  )
  wExcess.addColumn("label", { role: "descriptor", header: "Week" })
  for (const t of ALL_MARKET_TICKERS) {
    wExcess.addColumn(t, { header: t })
  }
  for (let i = 1; i < wPeriods.length; i++) {
    const curr = wPeriods[i]
    if (curr === undefined) continue
    const cells: Record<string, Cell | number> = {
      label: new Cell({ value: curr }),
    }
    for (const t of ALL_MARKET_TICKERS) {
      cells[t] = new Cell({
        expr: `WeeklyReturns2Y["${curr}", "${t}"] - WeeklyReturns2Y["mean_ret", "${t}"]`,
      })
    }
    wExcess.addRow(curr, { cells, format: "percentage", decimals: 3 })
  }
}
