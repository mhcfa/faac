import type { Sheet, Table } from "f8-engine"
import type {
  AllCompTicker,
  CostcoKnowledgeData,
  PeerPeriodTriplet,
} from "../kg.ts"
import { notedNull, rowFormatOptions } from "../timeline.ts"

const PEER_ORDER: readonly AllCompTicker[] = ["BJ", "PSMT", "WMT", "TGT", "KR"]
const ALL_TICKERS: readonly AllCompTicker[] = ["COST", ...PEER_ORDER]

const PEER_BRIDGE_PREFIX: Readonly<
  Record<Exclude<AllCompTicker, "COST">, string>
> = {
  BJ: "bj",
  PSMT: "psmt",
  WMT: "wmt",
  TGT: "tgt",
  KR: "kr",
}

const EV_QOE_COL_HEADERS: Readonly<
  Record<AllCompTicker, readonly [string, string]>
> = {
  COST: ["Costco", "(COST)"],
  BJ: ["BJ's Club", "(BJ)"],
  PSMT: ["PriceSmart", "(PSMT)"],
  WMT: ["Walmart", "(WMT)"],
  TGT: ["Target", "(TGT)"],
  KR: ["Kroger", "(KR)"],
}

export function buildCompsSchedules(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): {
  readonly compsLtm: Table
  readonly compsForward: Table
  readonly peerLtmBridge: Table
  readonly peerEvAndQoeBridge: Table
  readonly compsValuation: Table
} {
  const peerMeta = kg.market.peers.meta

  // Band 1: Reported & QoE-Normalized LTM Trading Comparables + Fundamental Drivers
  const compsLtm = sheet.addTable(
    "TradingCompsLTM",
    "Trading Comparables — LTM Multiples, Betas, ROIC & CapEx Intensity ($M / $/sh / x)",
    {
      subtitle: [
        "2026-11-13 close; uniform ex-operating-lease EV & IC across all 6 peers (incl. NCI for WMT & KR); LTM = FY26 + H1 FY27 - H1 FY26 for Jan-FY peers",
        `Source: ${kg.citations.equityQuotes}; ${kg.citations.peerFinancials} (LIFO at COST/WMT/TGT/KR vs. avg.-cost at BJ/PSMT; WMT/PSMT QoE notes below)`,
      ],
      currency: "USD",
    }
  )
  compsLtm.addColumn("ticker_name", {
    role: "descriptor",
    header: "Company (Ticker)",
  })
  compsLtm.addColumn("close_price", {
    role: "measure",
    headers: ["Share", "Price"],
    format: "currency",
    decimals: 2,
  })
  compsLtm.addColumn("market_cap", {
    role: "measure",
    headers: ["Market", "Cap ($M)"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ev", {
    role: "measure",
    headers: ["EV (Ex-", "Op. Lease)"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ltm_rev", {
    role: "measure",
    headers: ["LTM", "Revenue"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ltm_ebitda_rep", {
    role: "measure",
    headers: ["Rep.", "EBITDA"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("qoe_ebitda_adj", {
    role: "measure",
    headers: ["EBITDA", "QoE Adj."],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ltm_ebitda_qoe", {
    role: "measure",
    headers: ["QoE", "EBITDA"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("beta_5y", {
    role: "measure",
    headers: ["5Y", "Beta"],
    format: "number",
    decimals: 2,
  })
  compsLtm.addColumn("beta_2y", {
    role: "measure",
    headers: ["2Y", "Beta"],
    format: "number",
    decimals: 2,
  })
  compsLtm.addColumn("ltm_roic", {
    role: "measure",
    headers: ["LTM", "ROIC"],
    format: "percentage",
    decimals: 1,
  })
  compsLtm.addColumn("capex_pct_sales", {
    role: "measure",
    headers: ["CapEx %", "Sales"],
    format: "percentage",
    decimals: 1,
  })
  compsLtm.addColumn("net_lev_qoe", {
    role: "measure",
    headers: ["Net Debt /", "EBITDA"],
    format: "multiple",
    decimals: 1,
  })
  compsLtm.addColumn("ev_ltm_sales", {
    role: "measure",
    headers: ["EV / LTM", "Sales"],
    format: "multiple",
    decimals: 2,
  })
  compsLtm.addColumn("ev_ltm_ebitda_rep", {
    role: "measure",
    headers: ["Rep. EV /", "EBITDA"],
    format: "multiple",
    decimals: 1,
  })
  compsLtm.addColumn("ev_ltm_ebitda_qoe", {
    role: "measure",
    headers: ["QoE EV /", "EBITDA"],
    format: "multiple",
    decimals: 1,
    style: "bold",
  })
  compsLtm.addColumn("ev_ebitda_ex_capex", {
    role: "measure",
    headers: ["EV /", "EBITDA-Cx"],
    format: "multiple",
    decimals: 1,
  })
  compsLtm.addColumn("ev_ltm_ebit_rep", {
    role: "measure",
    headers: ["Rep. EV /", "EBIT"],
    format: "multiple",
    decimals: 1,
  })
  compsLtm.addColumn("ev_ltm_ebit_qoe", {
    role: "measure",
    headers: ["QoE EV /", "EBIT"],
    format: "multiple",
    decimals: 1,
  })
  compsLtm.addColumn("pe_ltm_rep", {
    role: "measure",
    headers: ["Rep.", "P / E"],
    format: "multiple",
    decimals: 1,
  })
  compsLtm.addColumn("pe_ltm_qoe", {
    role: "measure",
    headers: ["QoE", "P / E"],
    format: "multiple",
    decimals: 1,
  })
  compsLtm.addColumn("p_ltm_fcf", {
    role: "measure",
    headers: ["Price /", "LTM FCF"],
    format: "multiple",
    decimals: 1,
  })

  const addLtmEntityRow = (ticker: AllCompTicker, highlight = false): void => {
    const q = kg.market.quotes[ticker]
    const meta = peerMeta[ticker]
    const isCost = ticker === "COST"
    const pfx = isCost ? "" : PEER_BRIDGE_PREFIX[ticker]
    compsLtm.addRow(ticker, {
      ...(highlight ? { highlight: true, style: "bold" as const } : {}),
      cells: {
        ticker_name: `${meta.name} (${ticker})`,
        close_price: isCost
          ? { expr: 'MarketAnchors["cost_close_price", "val"]' }
          : q.closePrice,
        market_cap: {
          expr: `@table[@row, "close_price"] * PeerEvAndQoeBridge["sec_shares", "${ticker}"]`,
        },
        ev: {
          expr: `@table[@row, "market_cap"] + PeerEvAndQoeBridge["total_debt_ex_op_leases", "${ticker}"] + PeerEvAndQoeBridge["total_nci", "${ticker}"] - PeerEvAndQoeBridge["cash_and_sti", "${ticker}"]`,
          ...(isCost
            ? {
                note: "Peer-uniform ex-operating-lease EV (SEC basic shares, carrying financial debt, and FY26 Cash & STI). Reconciles to valuation-date DCF EV by adding diluted RSUs (treasury stock method) and the paid Q1 regular dividend cash outflow, less the long-term debt carrying-to-fair-value mark-to-market adjustment.",
              }
            : {}),
        },
        ltm_rev: isCost
          ? { expr: 'IncomeStatement["total_revenue", "FY26"]' }
          : { expr: `PeerLtmBridge["${pfx}_rev", "ltm"]` },
        ltm_ebitda_rep: isCost
          ? { expr: 'IncomeStatement["ebitda", "FY26"]' }
          : {
              expr: `PeerEvAndQoeBridge["ltm_ebit_rep", "${ticker}"] + PeerLtmBridge["${pfx}_da", "ltm"]`,
            },
        qoe_ebitda_adj: {
          expr: `PeerEvAndQoeBridge["qoe_ebitda_adj", "${ticker}"]`,
        },
        ltm_ebitda_qoe: {
          expr: '@table[@row, "ltm_ebitda_rep"] + @table[@row, "qoe_ebitda_adj"]',
        },
        beta_5y: isCost
          ? { expr: 'MarketAnchors["cost_beta_5y", "val"]' }
          : q.beta5yMonthly,
        beta_2y: isCost
          ? { expr: 'MarketAnchors["cost_beta_2y", "val"]' }
          : q.beta2yWeekly,
        ltm_roic: { expr: `PeerEvAndQoeBridge["ltm_roic", "${ticker}"]` },
        capex_pct_sales: {
          expr: `PeerEvAndQoeBridge["ltm_capex", "${ticker}"] / @table[@row, "ltm_rev"]`,
        },
        net_lev_qoe: {
          expr: `(PeerEvAndQoeBridge["total_debt_ex_op_leases", "${ticker}"] - PeerEvAndQoeBridge["cash_and_sti", "${ticker}"]) / @table[@row, "ltm_ebitda_qoe"]`,
        },
        ev_ltm_sales: {
          expr: '@table[@row, "ev"] / @table[@row, "ltm_rev"]',
        },
        ev_ltm_ebitda_rep: {
          expr: '@table[@row, "ev"] / @table[@row, "ltm_ebitda_rep"]',
        },
        ev_ltm_ebitda_qoe: {
          expr: '@table[@row, "ev"] / @table[@row, "ltm_ebitda_qoe"]',
        },
        ev_ebitda_ex_capex: {
          expr: `IF(@table[@row, "ltm_ebitda_qoe"] - PeerEvAndQoeBridge["ltm_capex", "${ticker}"] > 0, @table[@row, "ev"] / (@table[@row, "ltm_ebitda_qoe"] - PeerEvAndQoeBridge["ltm_capex", "${ticker}"]), NA())`,
        },
        ev_ltm_ebit_rep:
          ticker === "KR"
            ? notedNull(
                "Omitted due to $2,497M Ocado impairment & merger charges distorting GAAP EBIT."
              )
            : {
                expr: `@table[@row, "ev"] / PeerEvAndQoeBridge["ltm_ebit_rep", "${ticker}"]`,
              },
        ev_ltm_ebit_qoe: {
          expr: `@table[@row, "ev"] / PeerEvAndQoeBridge["ltm_ebit_qoe", "${ticker}"]`,
        },
        pe_ltm_rep:
          ticker === "KR"
            ? notedNull(
                "Omitted due to $2,497M Ocado impairment & merger charges distorting GAAP net income."
              )
            : {
                expr: `@table[@row, "market_cap"] / PeerEvAndQoeBridge["ltm_ni_rep", "${ticker}"]`,
              },
        pe_ltm_qoe: {
          expr: `@table[@row, "market_cap"] / PeerEvAndQoeBridge["ltm_ni_qoe", "${ticker}"]`,
        },
        p_ltm_fcf: {
          expr: `@table[@row, "market_cap"] / PeerEvAndQoeBridge["ltm_fcf", "${ticker}"]`,
        },
      },
    })
  }

  compsLtm.addSectionHeader("Target company")
  addLtmEntityRow("COST", true)

  compsLtm.addRowGutter()
  compsLtm.addSectionHeader("Peer group (pure-play clubs & mass retail)")
  for (const ticker of PEER_ORDER) {
    addLtmEntityRow(ticker, false)
  }

  compsLtm.addRowGutter()
  compsLtm.addSectionHeader("Peer summary statistics (excl. COST)")
  const ltmMeasureIds = [
    "close_price",
    "market_cap",
    "ev",
    "ltm_rev",
    "ltm_ebitda_rep",
    "qoe_ebitda_adj",
    "ltm_ebitda_qoe",
    "beta_5y",
    "beta_2y",
    "ltm_roic",
    "capex_pct_sales",
    "net_lev_qoe",
    "ev_ltm_sales",
    "ev_ltm_ebitda_rep",
    "ev_ltm_ebitda_qoe",
    "ev_ebitda_ex_capex",
    "ev_ltm_ebit_rep",
    "ev_ltm_ebit_qoe",
    "pe_ltm_rep",
    "pe_ltm_qoe",
    "p_ltm_fcf",
  ] as const

  const addLtmSummaryRow = (
    id: string,
    label: string,
    fn: "AVERAGE" | "MEDIAN",
    startTicker: AllCompTicker,
    endTicker: AllCompTicker
  ): void => {
    compsLtm.addRow(id, {
      style: "bold",
      cells: {
        ticker_name: label,
        ...Object.fromEntries(
          ltmMeasureIds.map((colId) => [
            colId,
            { expr: `${fn}(@table["${startTicker}".."${endTicker}", @col])` },
          ])
        ),
      },
    })
  }

  addLtmSummaryRow(
    "pure_club_mean",
    "Pure-play club mean (BJ, PSMT)",
    "AVERAGE",
    "BJ",
    "PSMT"
  )
  addLtmSummaryRow(
    "pure_club_median",
    "Pure-play club median (BJ, PSMT)",
    "MEDIAN",
    "BJ",
    "PSMT"
  )
  addLtmSummaryRow(
    "all_peer_mean",
    "All-peer mean (ex-COST)",
    "AVERAGE",
    "BJ",
    "KR"
  )
  addLtmSummaryRow(
    "all_peer_median",
    "All-peer median (ex-COST)",
    "MEDIAN",
    "BJ",
    "KR"
  )

  // Band 2: Consensus Forward FY27E / FY28E Trading Comparables
  const compsForward = sheet.addTable(
    "TradingCompsForward",
    "Trading Comparables — Street Consensus FY27E & FY28E Multiples & Growth ($M / $/sh / x)",
    {
      subtitle: [
        "Street consensus FY27E–FY28E growth, margins, multiples, and analyst price targets (peer-uniform ex-operating-lease EV incl. NCI, 2026-11-13 close)",
        `Source: ${kg.citations.consensusEstimates}; ${kg.citations.priceTargets}`,
      ],
      currency: "USD",
      below: compsLtm,
    }
  )
  compsForward.addColumn("ticker_name", {
    role: "descriptor",
    header: "Company (Ticker)",
  })
  compsForward.addColumn("close_price", {
    role: "measure",
    headers: ["Share", "Price"],
    format: "currency",
    decimals: 2,
  })
  compsForward.addColumn("ev", {
    role: "measure",
    headers: ["EV (Ex-", "Op. Lease)"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("rev_27", {
    role: "measure",
    headers: ["FY27E", "Revenue"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("rev_28", {
    role: "measure",
    headers: ["FY28E", "Revenue"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("rev_growth_28", {
    role: "measure",
    headers: ["FY28E", "Rev. Gr."],
    format: "percentage",
    decimals: 1,
  })
  compsForward.addColumn("ebitda_27", {
    role: "measure",
    headers: ["FY27E", "EBITDA"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("ebitda_margin_27", {
    role: "measure",
    headers: ["FY27E", "EBITDA %"],
    format: "percentage",
    decimals: 1,
  })
  compsForward.addColumn("ebit_27", {
    role: "measure",
    headers: ["FY27E", "EBIT"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("eps_27", {
    role: "measure",
    headers: ["FY27E", "EPS"],
    format: "currency",
    decimals: 2,
  })
  compsForward.addColumn("fcf_27", {
    role: "measure",
    headers: ["FY27E", "FCF"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("ev_sales_27", {
    role: "measure",
    headers: ["EV / FY27E", "Sales"],
    format: "multiple",
    decimals: 2,
  })
  compsForward.addColumn("ev_ebitda_27", {
    role: "measure",
    headers: ["EV / FY27E", "EBITDA"],
    format: "multiple",
    decimals: 1,
    style: "bold",
  })
  compsForward.addColumn("ev_ebit_27", {
    role: "measure",
    headers: ["EV / FY27E", "EBIT"],
    format: "multiple",
    decimals: 1,
  })
  compsForward.addColumn("pe_27", {
    role: "measure",
    headers: ["P / FY27E", "EPS"],
    format: "multiple",
    decimals: 1,
  })
  compsForward.addColumn("p_fcf_27", {
    role: "measure",
    headers: ["P / FY27E", "FCF"],
    format: "multiple",
    decimals: 1,
  })
  compsForward.addColumn("ebitda_28", {
    role: "measure",
    headers: ["FY28E", "EBITDA"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("eps_28", {
    role: "measure",
    headers: ["FY28E", "EPS"],
    format: "currency",
    decimals: 2,
  })
  compsForward.addColumn("ev_ebitda_28", {
    role: "measure",
    headers: ["EV / FY28E", "EBITDA"],
    format: "multiple",
    decimals: 1,
  })
  compsForward.addColumn("pe_28", {
    role: "measure",
    headers: ["P / FY28E", "EPS"],
    format: "multiple",
    decimals: 1,
  })
  compsForward.addColumn("pt_avg", {
    role: "measure",
    headers: ["Street PT", "Mean"],
    format: "currency",
    decimals: 2,
  })
  compsForward.addColumn("pt_upside", {
    role: "measure",
    headers: ["Street PT", "vs. Spot"],
    format: "percentage",
    decimals: 1,
  })

  const addFwdEntityRow = (ticker: AllCompTicker, highlight = false): void => {
    const c = kg.market.consensus[ticker]
    const meta = peerMeta[ticker]
    const isPsmtMissingFcf = c.saFcf27 === null
    const isCost = ticker === "COST"
    compsForward.addRow(ticker, {
      ...(highlight ? { highlight: true, style: "bold" as const } : {}),
      cells: {
        ticker_name: `${meta.name} (${ticker})`,
        close_price: { expr: `TradingCompsLTM["${ticker}", "close_price"]` },
        ev: { expr: `TradingCompsLTM["${ticker}", "ev"]` },
        rev_27: isCost
          ? { expr: 'MarketAnchors["cons_rev_fy27", "val"]' }
          : c.rev27,
        rev_28: isCost
          ? { expr: 'MarketAnchors["cons_rev_fy28", "val"]' }
          : c.rev28,
        rev_growth_28: {
          expr: '@table[@row, "rev_28"] / @table[@row, "rev_27"] - 1',
        },
        ebitda_27: isCost
          ? { expr: 'MarketAnchors["cons_ebitda_fy27", "val"]' }
          : c.ebitda27,
        ebitda_margin_27: {
          expr: '@table[@row, "ebitda_27"] / @table[@row, "rev_27"]',
        },
        ebit_27: isCost
          ? { expr: 'MarketAnchors["cons_ebit_fy27", "val"]' }
          : c.ebit27,
        eps_27: isCost
          ? { expr: 'MarketAnchors["cons_eps_fy27", "val"]' }
          : c.epsHeadline27,
        fcf_27: isCost
          ? { expr: 'MarketAnchors["cons_fcf_fy27", "val"]' }
          : isPsmtMissingFcf
            ? notedNull(
                "PSMT FY27E FCF omitted due to sparse 2-analyst coverage."
              )
            : c.saFcf27,
        ev_sales_27: {
          expr: '@table[@row, "ev"] / @table[@row, "rev_27"]',
        },
        ev_ebitda_27: {
          expr: '@table[@row, "ev"] / @table[@row, "ebitda_27"]',
        },
        ev_ebit_27: {
          expr: '@table[@row, "ev"] / @table[@row, "ebit_27"]',
        },
        pe_27: {
          expr: '@table[@row, "close_price"] / @table[@row, "eps_27"]',
        },
        p_fcf_27: isPsmtMissingFcf
          ? notedNull(
              "PSMT FY27E P/FCF omitted due to sparse 2-analyst coverage."
            )
          : {
              expr: `TradingCompsLTM["${ticker}", "market_cap"] / @table[@row, "fcf_27"]`,
            },
        ebitda_28: isCost
          ? { expr: 'MarketAnchors["cons_ebitda_fy28", "val"]' }
          : c.ebitda28,
        eps_28: isCost
          ? { expr: 'MarketAnchors["cons_eps_fy28", "val"]' }
          : c.epsHeadline28,
        ev_ebitda_28: {
          expr: '@table[@row, "ev"] / @table[@row, "ebitda_28"]',
        },
        pe_28: {
          expr: '@table[@row, "close_price"] / @table[@row, "eps_28"]',
        },
        pt_avg: isCost
          ? { expr: 'MarketAnchors["cons_pt_avg", "val"]' }
          : c.ptAverage,
        pt_upside: {
          expr: '@table[@row, "pt_avg"] / @table[@row, "close_price"] - 1',
        },
      },
    })
  }

  compsForward.addSectionHeader("Target company")
  addFwdEntityRow("COST", true)

  compsForward.addRowGutter()
  compsForward.addSectionHeader("Peer group (pure-play clubs & mass retail)")
  for (const ticker of PEER_ORDER) {
    addFwdEntityRow(ticker, false)
  }

  compsForward.addRowGutter()
  compsForward.addSectionHeader("Peer summary statistics (excl. COST)")
  const fwdMeasureIds = [
    "close_price",
    "ev",
    "rev_27",
    "rev_28",
    "rev_growth_28",
    "ebitda_27",
    "ebitda_margin_27",
    "ebit_27",
    "eps_27",
    "fcf_27",
    "ev_sales_27",
    "ev_ebitda_27",
    "ev_ebit_27",
    "pe_27",
    "p_fcf_27",
    "ebitda_28",
    "eps_28",
    "ev_ebitda_28",
    "pe_28",
    "pt_avg",
    "pt_upside",
  ] as const

  const addFwdSummaryRow = (
    id: string,
    label: string,
    fn: "AVERAGE" | "MEDIAN",
    startTicker: AllCompTicker,
    endTicker: AllCompTicker
  ): void => {
    compsForward.addRow(id, {
      style: "bold",
      cells: {
        ticker_name: label,
        ...Object.fromEntries(
          fwdMeasureIds.map((colId) => [
            colId,
            { expr: `${fn}(@table["${startTicker}".."${endTicker}", @col])` },
          ])
        ),
      },
    })
  }

  addFwdSummaryRow(
    "pure_club_mean",
    "Pure-play club mean (BJ, PSMT)",
    "AVERAGE",
    "BJ",
    "PSMT"
  )
  addFwdSummaryRow(
    "pure_club_median",
    "Pure-play club median (BJ, PSMT)",
    "MEDIAN",
    "BJ",
    "PSMT"
  )
  addFwdSummaryRow(
    "all_peer_mean",
    "All-peer mean (ex-COST)",
    "AVERAGE",
    "BJ",
    "KR"
  )
  addFwdSummaryRow(
    "all_peer_median",
    "All-peer median (ex-COST)",
    "MEDIAN",
    "BJ",
    "KR"
  )

  // Band 3 (left): Peer LTM Flow Calendarization Bridge
  const peerLtmBridge = sheet.addTable(
    "PeerLtmBridge",
    "Peer LTM Flow Calendarization Bridge ($M)",
    {
      subtitle: [
        "Jan-FY peers: LTM = FY26 + H1 FY27 - H1 FY26",
        "Aug-FY PSMT: LTM = FY26; Source: SEC 10-K/10-Q",
      ],
      currency: "USD",
      below: compsForward,
    }
  )
  peerLtmBridge.addColumn("line_item", {
    role: "descriptor",
    header: "Peer LTM flow line ($M)",
  })
  peerLtmBridge.addColumn("fy26", {
    role: "measure",
    headers: ["FY26", "Annual"],
  })
  peerLtmBridge.addColumn("h1_26", {
    role: "measure",
    headers: ["H1 FY26", "Prior YTD"],
  })
  peerLtmBridge.addColumn("h1_27", {
    role: "measure",
    headers: ["H1 FY27", "Curr. YTD"],
  })
  peerLtmBridge.addColumn("ltm", {
    role: "measure",
    headers: ["Bridged", "LTM"],
    style: "bold",
  })

  const addJanPeerFlowRow = (
    id: string,
    label: string,
    triplet: PeerPeriodTriplet,
    decimals = 0
  ): void => {
    peerLtmBridge.addRow(id, {
      ...rowFormatOptions("currency", decimals),
      cells: {
        line_item: label,
        fy26: triplet.fy26,
        h1_26: triplet.h1_26,
        h1_27: triplet.h1_27,
        ltm: {
          expr: '@table[@row, "fy26"] + @table[@row, "h1_27"] - @table[@row, "h1_26"]',
        },
      },
    })
  }

  const addAugPeerFlowRow = (
    id: string,
    label: string,
    fy26Val: number,
    decimals = 0,
    noteOnFirst?: string
  ): void => {
    peerLtmBridge.addRow(id, {
      ...rowFormatOptions("currency", decimals),
      cells: {
        line_item: label,
        fy26: noteOnFirst ? { value: fy26Val, note: noteOnFirst } : fy26Val,
        h1_26: null,
        h1_27: null,
        ltm: { expr: '@table[@row, "fy26"]' },
      },
    })
  }

  const { bj, psmt, wmt, tgt, kr } = kg.market.peers

  peerLtmBridge.addSectionHeader("BJ's Wholesale Club (LTM end 2026-08-01)")
  addJanPeerFlowRow("bj_net_sales", "BJ net merchandise sales", bj.netSales)
  addJanPeerFlowRow("bj_mfi_other", "BJ membership fee & other", bj.mfiAndOther)
  addJanPeerFlowRow("bj_rev", "BJ total revenues", bj.rev)
  addJanPeerFlowRow("bj_cost_of_sales", "BJ cost of sales", bj.costOfSales)
  addJanPeerFlowRow("bj_sga", "BJ SG&A expenses", bj.sga)
  addJanPeerFlowRow(
    "bj_pre_opening",
    "BJ pre-opening expenses",
    bj.preOpening,
    1
  )
  addJanPeerFlowRow("bj_ebit", "BJ operating income (EBIT)", bj.ebit)
  addJanPeerFlowRow("bj_ebt", "BJ pre-tax income (EBT)", bj.ebt)
  addJanPeerFlowRow("bj_tax", "BJ income tax expense", bj.tax)
  addJanPeerFlowRow("bj_ni", "BJ net income", bj.ni)
  addJanPeerFlowRow("bj_da", "BJ D&A", bj.da)
  addJanPeerFlowRow("bj_cfo", "BJ operating cash flow", bj.cfo)
  addJanPeerFlowRow("bj_capex", "BJ CapEx (CF outflow)", bj.capex)
  addJanPeerFlowRow(
    "bj_qoe_restruct",
    "BJ QoE: restructuring",
    bj.qoeRestruct,
    2
  )
  addJanPeerFlowRow("bj_qoe_tax_mgmt", "BJ QoE: non-GAAP tax", bj.qoeTaxMgmt, 2)

  peerLtmBridge.addRowGutter()
  peerLtmBridge.addSectionHeader("PriceSmart (FY26 end 2026-08-31)")
  addAugPeerFlowRow(
    "psmt_rev",
    "PSMT total revenues",
    psmt.revFy26,
    0,
    "Aug 31 fiscal year aligns directly with COST FY26 window; LTM equals FY26 actual."
  )
  addAugPeerFlowRow("psmt_ebit", "PSMT operating income (EBIT)", psmt.ebitFy26)
  addAugPeerFlowRow("psmt_ebt", "PSMT pre-tax income (EBT)", psmt.ebtFy26)
  addAugPeerFlowRow("psmt_tax", "PSMT income tax expense", psmt.taxFy26)
  addAugPeerFlowRow("psmt_ni", "PSMT net income", psmt.niFy26)
  addAugPeerFlowRow("psmt_da", "PSMT D&A", psmt.daFy26)
  addAugPeerFlowRow("psmt_cfo", "PSMT operating cash flow", psmt.cfoFy26)
  addAugPeerFlowRow("psmt_capex", "PSMT CapEx (CF outflow)", psmt.capexFy26)

  peerLtmBridge.addRowGutter()
  peerLtmBridge.addSectionHeader("Walmart (LTM end 2026-07-31)")
  addJanPeerFlowRow("wmt_rev", "WMT total revenues", wmt.rev)
  addJanPeerFlowRow("wmt_ebit", "WMT operating income (EBIT)", wmt.ebit)
  addJanPeerFlowRow("wmt_ebt", "WMT pre-tax income (EBT)", wmt.ebt)
  addJanPeerFlowRow("wmt_tax", "WMT income tax provision", wmt.tax)
  addJanPeerFlowRow("wmt_ni", "WMT net income attr. parent", wmt.ni)
  addJanPeerFlowRow("wmt_da", "WMT D&A", wmt.da)
  addJanPeerFlowRow("wmt_cfo", "WMT operating cash flow", wmt.cfo)
  addJanPeerFlowRow("wmt_capex", "WMT CapEx (CF outflow)", wmt.capex)
  addJanPeerFlowRow(
    "wmt_qoe_other_gains",
    "WMT QoE: equity investments",
    wmt.qoeOtherGains
  )

  peerLtmBridge.addRowGutter()
  peerLtmBridge.addSectionHeader("Target (LTM end 2026-08-01)")
  addJanPeerFlowRow("tgt_rev", "TGT total revenue", tgt.rev)
  addJanPeerFlowRow("tgt_ebit", "TGT operating income (EBIT)", tgt.ebit)
  addJanPeerFlowRow("tgt_ebt", "TGT pre-tax income (EBT)", tgt.ebt)
  addJanPeerFlowRow("tgt_tax", "TGT income tax provision", tgt.tax)
  addJanPeerFlowRow("tgt_ni", "TGT net earnings", tgt.ni)
  addJanPeerFlowRow("tgt_da", "TGT D&A", tgt.da)
  addJanPeerFlowRow("tgt_cfo", "TGT operating cash flow", tgt.cfo)
  addJanPeerFlowRow("tgt_capex", "TGT CapEx (CF outflow)", tgt.capex)

  peerLtmBridge.addRowGutter()
  peerLtmBridge.addSectionHeader("Kroger (LTM end 2026-08-15)")
  addJanPeerFlowRow("kr_rev", "KR sales", kr.rev)
  addJanPeerFlowRow("kr_ebit", "KR operating profit (EBIT)", kr.ebit)
  addJanPeerFlowRow("kr_ebt", "KR pre-tax income (EBT)", kr.ebt)
  addJanPeerFlowRow("kr_tax", "KR income tax provision", kr.tax)
  addJanPeerFlowRow("kr_ni", "KR net earnings attr. parent", kr.ni)
  addJanPeerFlowRow("kr_da", "KR D&A", kr.da)
  addJanPeerFlowRow("kr_cfo", "KR operating cash flow", kr.cfo)
  addJanPeerFlowRow("kr_capex", "KR CapEx (CF outflow)", kr.capex)
  addJanPeerFlowRow(
    "kr_qoe_op_adj",
    "KR QoE: Ocado & merger costs",
    kr.qoeOpAdj
  )
  addJanPeerFlowRow("kr_qoe_ni_adj", "KR QoE: after-tax NI adj.", kr.qoeNiAdj)

  // Band 3 (middle): 6-Company EV Balance Sheet, QoE & LTM ROIC Bridge
  const peerEvAndQoeBridge = sheet.addTable(
    "PeerEvAndQoeBridge",
    "Peer EV, Debt/Lease, QoE & ROIC Normalization Bridge ($M)",
    {
      subtitle: [
        "Balance-sheet cash, debt, leases, NCI, and QoE tax shields across all 6 peers ($M)",
        "Computes uniform ex-op.-lease EV & IC (headline incl.-lease EV memo below)",
      ],
      currency: "USD",
      rightOf: peerLtmBridge,
    }
  )
  peerEvAndQoeBridge.addColumn("line_item", {
    role: "descriptor",
    header: "EV / QoE / ROIC component",
  })
  for (const ticker of ALL_TICKERS) {
    peerEvAndQoeBridge.addColumn(ticker, {
      role: "measure",
      headers: EV_QOE_COL_HEADERS[ticker],
      ...(ticker === "COST" ? { style: "bold" as const } : {}),
    })
  }

  peerEvAndQoeBridge.addSectionHeader("Balance sheet cash, debt, leases & IC")
  peerEvAndQoeBridge.addRow("sec_shares", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "SEC common shares (M)",
      COST: { expr: 'MarketAnchors["cost_sec_shares", "val"]' },
      BJ: kg.market.quotes.BJ.secSharesMillions,
      PSMT: kg.market.quotes.PSMT.secSharesMillions,
      WMT: kg.market.quotes.WMT.secSharesMillions,
      TGT: kg.market.quotes.TGT.secSharesMillions,
      KR: kg.market.quotes.KR.secSharesMillions,
    },
  })
  peerEvAndQoeBridge.addRow("cash_and_equivalents", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Cash and cash equivalents",
      COST: { expr: 'BalanceSheet["cash_and_equivalents", "FY26"]' },
      BJ: bj.cashH127,
      PSMT: psmt.cashFy26,
      WMT: {
        value: wmt.cashH127,
        note: "Balance-sheet unrestricted cash (excludes restricted cash embedded in cash flow statement).",
      },
      TGT: tgt.cashH127,
      KR: kr.cashH127,
    },
  })
  peerEvAndQoeBridge.addRow("short_term_investments", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Short-term investments",
      COST: { expr: 'BalanceSheet["short_term_investments", "FY26"]' },
      BJ: 0,
      PSMT: psmt.stiFy26,
      WMT: 0,
      TGT: 0,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("cash_and_sti", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["cash_and_equivalents", @col] + @table["short_term_investments", @col]',
    cells: { line_item: "Total cash and STI ($M)" },
  })
  peerEvAndQoeBridge.addRow("financial_debt", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Carrying financial debt",
      COST: {
        expr: 'DebtLeasesSchedule["total_lt_debt_carrying", "FY26"] + DebtLeasesSchedule["revolver_end", "FY26"]',
      },
      BJ: bj.carryingFinancialDebtH127,
      PSMT: psmt.carryingFinancialDebtFy26,
      WMT: wmt.financialDebtExclLeasesH127,
      TGT: {
        value: tgt.debtAndFinLeasesBsH127,
        note: "TGT reports combined carrying financial debt and finance leases on the balance sheet face.",
      },
      KR: {
        value: kr.debtAndFinLeasesBsH127,
        note: "KR reports combined carrying financial debt and finance leases on the balance sheet face.",
      },
    },
  })
  peerEvAndQoeBridge.addRow("finance_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Finance lease liabilities",
      COST: { expr: 'DebtLeasesSchedule["total_fin_lease_liab", "FY26"]' },
      BJ: {
        value: bj.financeLeaseLiabFy26,
        note: "FY26 10-K finance lease balance (Q2 10-Q omits finance lease breakout).",
      },
      PSMT: psmt.financeLeaseLiabFy26,
      WMT: wmt.financeLeaseLiabH127,
      TGT: 0,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("slb_financing_obligations", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "SLB financing obligations",
      COST: 0,
      BJ: {
        value: bj.ltFinancingObligationsFy26,
        note: "FY26 10-K failed sale-leaseback financing obligations folded into other liabilities on Q2 10-Q.",
      },
      PSMT: 0,
      WMT: 0,
      TGT: 0,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("total_debt_ex_op_leases", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["financial_debt".."slb_financing_obligations", @col])',
    cells: { line_item: "Financial debt & fin. leases" },
  })
  peerEvAndQoeBridge.addRow("nonredeemable_nci", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Nonredeemable NCI",
      COST: 0,
      BJ: 0,
      PSMT: 0,
      WMT: wmt.nonredeemableNciH127,
      TGT: 0,
      KR: kr.nonredeemableNciH127,
    },
  })
  peerEvAndQoeBridge.addRow("redeemable_nci", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Redeemable NCI (mezzanine)",
      COST: 0,
      BJ: 0,
      PSMT: 0,
      WMT: wmt.redeemableNciH127,
      TGT: 0,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("total_nci", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["nonredeemable_nci", @col] + @table["redeemable_nci", @col]',
    cells: { line_item: "Total noncontrolling interests" },
  })
  peerEvAndQoeBridge.addRow("operating_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Operating lease liab.",
      COST: { expr: 'DebtLeasesSchedule["total_op_lease_liab", "FY26"]' },
      BJ: bj.operatingLeaseLiabH127,
      PSMT: psmt.operatingLeaseLiabFy26,
      WMT: wmt.operatingLeaseLiabH127,
      TGT: tgt.operatingLeaseLiabH127,
      KR: kr.operatingLeaseLiabH127,
    },
  })
  peerEvAndQoeBridge.addRow("headline_ev_incl_op_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Headline EV (incl. leases)",
      ...Object.fromEntries(
        ALL_TICKERS.map((t) => [
          t,
          {
            expr: `TradingCompsLTM["${t}", "ev"] + @table["operating_leases", "${t}"]`,
          },
        ])
      ),
    },
  })
  peerEvAndQoeBridge.addRow("total_equity", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Total stockholders' equity",
      COST: { expr: 'BalanceSheet["total_equity", "FY26"]' },
      BJ: bj.totalEquityH127,
      PSMT: psmt.totalEquityFy26,
      WMT: wmt.totalEquityH127,
      TGT: tgt.totalEquityH127,
      KR: kr.totalEquityH127,
    },
  })
  peerEvAndQoeBridge.addRow("invested_capital", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["total_debt_ex_op_leases", @col] + @table["total_equity", @col] + @table["redeemable_nci", @col] - @table["cash_and_sti", @col]',
    cells: { line_item: "Ending IC (ex-op. leases, $M)" },
  })

  peerEvAndQoeBridge.addRowGutter()
  peerEvAndQoeBridge.addSectionHeader("LTM QoE earnings, CapEx & ROIC bridge")
  peerEvAndQoeBridge.addRow("ltm_ebit_rep", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Reported LTM EBIT ($M)",
      COST: { expr: 'IncomeStatement["operating_income", "FY26"]' },
      BJ: { expr: 'PeerLtmBridge["bj_ebit", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_ebit", "ltm"]' },
      WMT: { expr: 'PeerLtmBridge["wmt_ebit", "ltm"]' },
      TGT: { expr: 'PeerLtmBridge["tgt_ebit", "ltm"]' },
      KR: { expr: 'PeerLtmBridge["kr_ebit", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_ni_rep", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Reported LTM net income ($M)",
      COST: { expr: 'IncomeStatement["net_income_attr_costco", "FY26"]' },
      BJ: { expr: 'PeerLtmBridge["bj_ni", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_ni", "ltm"]' },
      WMT: { expr: 'PeerLtmBridge["wmt_ni", "ltm"]' },
      TGT: { expr: 'PeerLtmBridge["tgt_ni", "ltm"]' },
      KR: { expr: 'PeerLtmBridge["kr_ni", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "LTM CapEx (positive, $M)",
      COST: { expr: 'WorkingCapitalPPE["capex", "FY26"]' },
      BJ: { expr: '-PeerLtmBridge["bj_capex", "ltm"]' },
      PSMT: { expr: '-PeerLtmBridge["psmt_capex", "ltm"]' },
      WMT: { expr: '-PeerLtmBridge["wmt_capex", "ltm"]' },
      TGT: { expr: '-PeerLtmBridge["tgt_capex", "ltm"]' },
      KR: { expr: '-PeerLtmBridge["kr_capex", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_fcf", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "LTM levered FCF (CFO − CapEx)",
      COST: { expr: 'CashFlowStatement["levered_fcf", "FY26"]' },
      BJ: {
        expr: 'PeerLtmBridge["bj_cfo", "ltm"] + PeerLtmBridge["bj_capex", "ltm"]',
      },
      PSMT: {
        expr: 'PeerLtmBridge["psmt_cfo", "ltm"] + PeerLtmBridge["psmt_capex", "ltm"]',
      },
      WMT: {
        expr: 'PeerLtmBridge["wmt_cfo", "ltm"] + PeerLtmBridge["wmt_capex", "ltm"]',
      },
      TGT: {
        expr: 'PeerLtmBridge["tgt_cfo", "ltm"] + PeerLtmBridge["tgt_capex", "ltm"]',
      },
      KR: {
        expr: 'PeerLtmBridge["kr_cfo", "ltm"] + PeerLtmBridge["kr_capex", "ltm"]',
      },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_ebt", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "LTM pre-tax income (EBT)",
      COST: { expr: 'IncomeStatement["ebt", "FY26"]' },
      BJ: { expr: 'PeerLtmBridge["bj_ebt", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_ebt", "ltm"]' },
      WMT: { expr: 'PeerLtmBridge["wmt_ebt", "ltm"]' },
      TGT: { expr: 'PeerLtmBridge["tgt_ebt", "ltm"]' },
      KR: { expr: 'PeerLtmBridge["kr_ebt", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_tax", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "LTM income tax provision",
      COST: { expr: 'IncomeStatement["tax_provision", "FY26"]' },
      BJ: { expr: 'PeerLtmBridge["bj_tax", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_tax", "ltm"]' },
      WMT: { expr: 'PeerLtmBridge["wmt_tax", "ltm"]' },
      TGT: { expr: 'PeerLtmBridge["tgt_tax", "ltm"]' },
      KR: { expr: 'PeerLtmBridge["kr_tax", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_etr", {
    ...rowFormatOptions("percentage", 2),
    expr: 'IF(@table["ltm_ebt", @col] > 0, @table["ltm_tax", @col] / @table["ltm_ebt", @col], NA())',
    cells: { line_item: "LTM effective tax rate" },
  })
  peerEvAndQoeBridge.addRow("qoe_op_item_1", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Primary operating QoE item",
      COST: {
        value: kg.cost.qoe.fy26IeepaMerchOffset,
        note: "Q4 FY26 gross IEEPA tariff merchandise cost offset ($174M before $100M estimated price reinvestment; -$74M net operating adjustment).",
      },
      BJ: {
        value: bj.qoeSlbGainH127,
        note: "H1 FY27 Ohio DC sale-leaseback gain in SG&A (-$10.6M).",
      },
      PSMT: {
        value: psmt.qoeLossDisposalFy26,
        note: "Asset disposal loss (+$3.8M); recurring $29.7M non-operating FX conversion/revaluation drag sits below EBIT. BJ & PSMT use average-cost inventory vs. LIFO at COST/WMT/TGT/KR.",
      },
      WMT: {
        value: wmt.qoeTariffRefundH127,
        note: "H1 FY27 gross IEEPA tariff refunds (-$2,900M pre-tax); 10-Q omits unquantified price reinvestment vs. COST net -$74M.",
      },
      TGT: {
        value: tgt.qoeTariffRefundH127,
        note: "H1 FY27 IEEPA tariff refunds (-$994M pre-tax).",
      },
      KR: { expr: 'PeerLtmBridge["kr_qoe_op_adj", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("qoe_op_item_2", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Secondary operating QoE item",
      COST: kg.cost.qoe.fy26IeepaReinvestedEst,
      BJ: { expr: 'PeerLtmBridge["bj_qoe_restruct", "ltm"]' },
      PSMT: psmt.qoeGainJvFy26,
      WMT: {
        value: wmt.qoePhonePeFy26,
        note: "FY26 non-tax-deductible PhonePe SBC modification charge (+$700M per 10-K MD&A).",
      },
      TGT: tgt.qoeTransformationFy26,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("qoe_ebitda_adj", {
    ...rowFormatOptions("currency", 1),
    style: "subtotal",
    cells: {
      line_item: "Total pre-tax QoE EBITDA adj.",
      COST: {
        expr: '-(@table["qoe_op_item_1", "COST"] - @table["qoe_op_item_2", "COST"])',
      },
      BJ: {
        expr: '@table["qoe_op_item_1", "BJ"] + @table["qoe_op_item_2", "BJ"]',
      },
      PSMT: {
        expr: '@table["qoe_op_item_1", "PSMT"] + @table["qoe_op_item_2", "PSMT"]',
      },
      WMT: {
        expr: '@table["qoe_op_item_1", "WMT"] + @table["qoe_op_item_2", "WMT"]',
      },
      TGT: {
        expr: '@table["qoe_op_item_1", "TGT"] + @table["qoe_op_item_2", "TGT"]',
      },
      KR: {
        expr: '@table["qoe_op_item_1", "KR"] + @table["qoe_op_item_2", "KR"]',
      },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_ebit_qoe", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["ltm_ebit_rep", @col] + @table["qoe_ebitda_adj", @col]',
    cells: { line_item: "QoE-adjusted LTM EBIT ($M)" },
  })
  peerEvAndQoeBridge.addRow("ltm_nopat_qoe", {
    ...rowFormatOptions("currency", 0),
    expr: '@table["ltm_ebit_qoe", @col] * (1 - @table["ltm_etr", @col])',
    cells: { line_item: "QoE-adjusted LTM NOPAT ($M)" },
  })
  peerEvAndQoeBridge.addRow("ltm_roic", {
    ...rowFormatOptions("percentage", 1),
    style: "bold",
    expr: 'IF(@table["invested_capital", @col] > 0, @table["ltm_nopat_qoe", @col] / @table["invested_capital", @col], NA())',
    cells: { line_item: "LTM ROIC (NOPAT / ending IC)" },
  })
  peerEvAndQoeBridge.addRow("wmt_uncertain_tax_int", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Non-op. uncertain tax interest",
      COST: 0,
      BJ: 0,
      PSMT: 0,
      WMT: wmt.qoeUncertainTaxIntH127,
      TGT: 0,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("direct_tax_or_after_tax_adj", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "Direct tax / after-tax QoE adj.",
      COST: 0,
      BJ: { expr: 'PeerLtmBridge["bj_qoe_tax_mgmt", "ltm"]' },
      PSMT: 0,
      WMT: wmt.qoeUncertainTaxBenefitH127,
      TGT: tgt.qoeTransformationAfterTaxFy26,
      KR: { expr: 'PeerLtmBridge["kr_qoe_ni_adj", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("eps_tariff_memo", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "Disclosed tariff EPS impact",
      COST: kg.cost.qoe.fy26IeepaEpsBenefit,
      BJ: 0,
      PSMT: 0,
      WMT: 0,
      TGT: tgt.qoeTariffEpsMemoH127,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("diluted_shares_qoe", {
    ...rowFormatOptions("number", 3),
    cells: {
      line_item: "Diluted shares for EPS QoE (M)",
      COST: { expr: 'IncomeStatement["wavg_diluted_shares", "FY26"]' },
      BJ: 0,
      PSMT: 0,
      WMT: 0,
      TGT: tgt.wavgDilutedSharesH127,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("qoe_ni_adj", {
    ...rowFormatOptions("currency", 1),
    style: "subtotal",
    cells: {
      line_item: "Total after-tax QoE NI adj.",
      COST: {
        expr: '-@table["eps_tariff_memo", "COST"] * @table["diluted_shares_qoe", "COST"]',
      },
      BJ: {
        expr: '@table["qoe_op_item_1", "BJ"] * (1 - @table["ltm_etr", "BJ"]) + @table["qoe_op_item_2", "BJ"] + @table["direct_tax_or_after_tax_adj", "BJ"]',
      },
      PSMT: {
        expr: '@table["qoe_ebitda_adj", "PSMT"] * (1 - @table["ltm_etr", "PSMT"])',
      },
      WMT: {
        expr: '(@table["qoe_op_item_1", "WMT"] + PeerLtmBridge["wmt_qoe_other_gains", "ltm"] + @table["wmt_uncertain_tax_int", "WMT"]) * (1 - @table["ltm_etr", "WMT"]) + @table["qoe_op_item_2", "WMT"] + @table["direct_tax_or_after_tax_adj", "WMT"]',
      },
      TGT: {
        expr: '@table["eps_tariff_memo", "TGT"] * @table["diluted_shares_qoe", "TGT"] + @table["direct_tax_or_after_tax_adj", "TGT"]',
      },
      KR: { expr: '@table["direct_tax_or_after_tax_adj", "KR"]' },
    },
  })
  peerEvAndQoeBridge.addRow("ltm_ni_qoe", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: '@table["ltm_ni_rep", @col] + @table["qoe_ni_adj", @col]',
    cells: { line_item: "QoE-adjusted LTM net income" },
  })

  // Band 3 (right): Quality-Calibrated Comps Target Valuation for COST
  const compsValuation = sheet.addTable(
    "CompsValuationCalibration",
    "Calibrated Comps Valuation ($M / $/sh)",
    {
      subtitle: [
        "FY27E EV/EBITDA on ex-op.-lease basis",
        "Bridges net cash, FV debt & special div.",
      ],
      currency: "USD",
      rightOf: peerEvAndQoeBridge,
    }
  )
  compsValuation.addColumn("line_item", {
    role: "descriptor",
    header: "Calibration step",
  })
  compsValuation.addColumn("val", {
    role: "measure",
    headers: ["Active", "Case"],
    style: "bold",
  })
  compsValuation.addColumn("notes", {
    role: "descriptor",
    header: "Basis",
  })

  compsValuation.addRow("cost_fy27_model_ebitda", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "COST FY27E model EBITDA ($M)",
      val: { expr: 'IncomeStatement["ebitda", "FY27E"]' },
      notes: "Active forecast",
    },
  })
  compsValuation.addRow("cost_fy27_cons_ebitda", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Consensus FY27E EBITDA",
      val: { expr: 'TradingCompsForward["COST", "ebitda_27"]' },
      notes: "Street consensus",
    },
  })
  compsValuation.addRow("pure_club_median_mult", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Pure-play club median (FY27E)",
      val: { expr: 'TradingCompsForward["pure_club_median", "ev_ebitda_27"]' },
      notes: "BJ, PSMT median",
    },
  })
  compsValuation.addRow("wmt_fy27_mult", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Walmart FY27E EV / EBITDA",
      val: { expr: 'TradingCompsForward["WMT", "ev_ebitda_27"]' },
      notes: "Scaled omni peer",
    },
  })
  compsValuation.addRow("calibrated_target_mult", {
    ...rowFormatOptions("multiple", 1),
    style: "bold",
    highlight: true,
    cells: {
      line_item: "Calibrated COST target mult.",
      val: {
        expr: 'ScalarAssumptionsActive["calibrated_comps_ev_to_ebitda", "val"]',
      },
      notes: "ROIC-calibrated",
    },
  })
  compsValuation.addRow("implied_ev", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Implied EV (ex-op. leases, $M)",
      val: {
        expr: '@table["cost_fy27_model_ebitda", "val"] * @table["calibrated_target_mult", "val"]',
      },
      notes: "Post-rent EBITDA",
    },
  })
  compsValuation.addRow("net_cash_bridge", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "(+) Net cash (post-Q1 div / FV)",
      val: {
        expr: 'DcfBridge["net_cash_bridge", "perp"]',
        note: "FY26 cash & STI less paid Q1 regular dividend, LT debt fair value ($5,689M), and finance leases; matches ex-operating-lease EBITDA.",
      },
      notes: "Matches DCF bridge",
    },
  })
  compsValuation.addRow("implied_equity_cum_div", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    cells: {
      line_item: "Implied equity value (cum-div.)",
      val: {
        expr: '@table["implied_ev", "val"] + @table["net_cash_bridge", "val"]',
      },
      notes: "Cum-special div.",
    },
  })
  compsValuation.addRow("implied_price_cum_div", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    highlight: true,
    cells: {
      line_item: "Implied price (cum-div., $/sh)",
      val: {
        expr: '@table["implied_equity_cum_div", "val"] / MarketAnchors["cost_diluted_shares", "val"]',
      },
      notes: "Per diluted share",
    },
  })
  compsValuation.addRow("implied_price_ex_div", {
    ...rowFormatOptions("currency", 2),
    style: "bold",
    cells: {
      line_item: "Implied price (ex-div., $/sh)",
      val: {
        expr: '@table["implied_price_cum_div", "val"] - ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]',
      },
      notes: "Less special div.",
    },
  })
  compsValuation.addRow("upside_downside_cum", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Implied variance vs. spot (%)",
      val: {
        expr: '@table["implied_price_cum_div", "val"] / MarketAnchors["cost_close_price", "val"] - 1',
      },
      notes: "Cum-div. basis",
    },
  })
  compsValuation.addRow("memo_net_cash_incl_op_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Net cash incl. op. leases",
      val: {
        expr: '@table["net_cash_bridge", "val"] - DebtLeasesSchedule["total_op_lease_liab", "FY26"]',
      },
      notes: "Incl. ASC 842",
    },
  })

  return {
    compsLtm,
    compsForward,
    peerLtmBridge,
    peerEvAndQoeBridge,
    compsValuation,
  }
}
