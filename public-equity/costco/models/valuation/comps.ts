import type { Sheet, Table } from "f8-engine"
import type {
  AllCompTicker,
  CostcoKnowledgeData,
  PeerPeriodTriplet,
} from "../kg.ts"
import { rowFormatOptions } from "../timeline.ts"

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
  readonly compsValuation: Table
  readonly peerLtmBridge: Table
  readonly peerEvAndQoeBridge: Table
} {
  const peerMeta = kg.market.peers.meta

  // 1. Reported & QoE-Normalized LTM Trading Comparables
  const compsLtm = sheet.addTable(
    "TradingCompsLTM",
    "Trading Comparables — Reported & QoE-Normalized LTM Multiples ($M / $/sh)",
    {
      subtitle: [
        "2026-11-13 Market Close; uniform headline EV incl. ASC 842 operating & finance leases across all 6 tickers ($M / $/sh / x)",
        "LTM = FY26 + H1 FY27 - H1 FY26 for Jan-FY peers (BJ, WMT, TGT, KR); LTM = FY26 for Aug-FY COST & PSMT",
        `Source: ${kg.citations.equityQuotes}`,
        `Source: ${kg.citations.peerFinancials}`,
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
  compsLtm.addColumn("sec_shares", {
    role: "measure",
    headers: ["SEC", "Shares (M)"],
    format: "number",
    decimals: 1,
  })
  compsLtm.addColumn("market_cap", {
    role: "measure",
    headers: ["Market", "Cap ($M)"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("cash_sti", {
    role: "measure",
    headers: ["Cash &", "STI ($M)"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("debt_leases", {
    role: "measure",
    headers: ["Debt &", "Leases"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ev", {
    role: "measure",
    headers: ["Enterprise", "Value"],
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
  compsLtm.addColumn("ltm_ebit_rep", {
    role: "measure",
    headers: ["Rep.", "EBIT"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ltm_ebit_qoe", {
    role: "measure",
    headers: ["QoE", "EBIT"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ltm_ni_rep", {
    role: "measure",
    headers: ["Rep.", "Net Inc."],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("qoe_ni_adj", {
    role: "measure",
    headers: ["Net Inc.", "QoE Adj."],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ltm_ni_qoe", {
    role: "measure",
    headers: ["QoE", "Net Inc."],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("ltm_fcf", {
    role: "measure",
    headers: ["LTM", "FCF"],
    format: "currency",
    decimals: 0,
  })
  compsLtm.addColumn("net_lev_qoe", {
    role: "measure",
    headers: ["Net Debt /", "QoE EBITDA"],
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
      ...(highlight ? { highlight: true, style: "subtotal" as const } : {}),
      cells: {
        ticker_name: {
          value: `${meta.name} (${ticker})`,
          note: `${meta.fiscalWindowLabel}; ${meta.qoeNote}`,
        },
        close_price: isCost
          ? { expr: 'MarketAnchors["cost_close_price", "val"]' }
          : q.closePrice,
        sec_shares: isCost
          ? { expr: 'MarketAnchors["cost_sec_shares", "val"]' }
          : q.secSharesMillions,
        market_cap: {
          expr: '@table[@row, "close_price"] * @table[@row, "sec_shares"]',
        },
        cash_sti: {
          expr: `PeerEvAndQoeBridge["cash_and_sti", "${ticker}"]`,
        },
        debt_leases: {
          expr: `PeerEvAndQoeBridge["total_debt_and_leases", "${ticker}"]`,
        },
        ev: {
          expr: '@table[@row, "market_cap"] + @table[@row, "debt_leases"] - @table[@row, "cash_sti"]',
        },
        ltm_rev: isCost
          ? { expr: 'IncomeStatement["total_revenue", "FY26"]' }
          : { expr: `PeerLtmBridge["${pfx}_rev", "ltm"]` },
        ltm_ebitda_rep: isCost
          ? { expr: 'IncomeStatement["ebitda", "FY26"]' }
          : {
              expr: `@table[@row, "ltm_ebit_rep"] + PeerLtmBridge["${pfx}_da", "ltm"]`,
            },
        qoe_ebitda_adj: {
          expr: `PeerEvAndQoeBridge["qoe_ebitda_adj", "${ticker}"]`,
        },
        ltm_ebitda_qoe: {
          expr: '@table[@row, "ltm_ebitda_rep"] + @table[@row, "qoe_ebitda_adj"]',
        },
        ltm_ebit_rep: isCost
          ? { expr: 'IncomeStatement["operating_income", "FY26"]' }
          : { expr: `PeerLtmBridge["${pfx}_ebit", "ltm"]` },
        ltm_ebit_qoe: {
          expr: '@table[@row, "ltm_ebit_rep"] + @table[@row, "qoe_ebitda_adj"]',
        },
        ltm_ni_rep: isCost
          ? { expr: 'IncomeStatement["net_income_attr_costco", "FY26"]' }
          : { expr: `PeerLtmBridge["${pfx}_ni", "ltm"]` },
        qoe_ni_adj: {
          expr: `PeerEvAndQoeBridge["qoe_ni_adj", "${ticker}"]`,
        },
        ltm_ni_qoe: {
          expr: '@table[@row, "ltm_ni_rep"] + @table[@row, "qoe_ni_adj"]',
        },
        ltm_fcf: isCost
          ? { expr: 'CashFlowStatement["levered_fcf", "FY26"]' }
          : {
              expr: `PeerLtmBridge["${pfx}_cfo", "ltm"] + PeerLtmBridge["${pfx}_capex", "ltm"]`,
            },
        net_lev_qoe: {
          expr: '(@table[@row, "debt_leases"] - @table[@row, "cash_sti"]) / @table[@row, "ltm_ebitda_qoe"]',
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
        ev_ltm_ebit_rep:
          ticker === "KR"
            ? null
            : {
                expr: '@table[@row, "ev"] / @table[@row, "ltm_ebit_rep"]',
              },
        ev_ltm_ebit_qoe: {
          expr: '@table[@row, "ev"] / @table[@row, "ltm_ebit_qoe"]',
        },
        pe_ltm_rep:
          ticker === "KR"
            ? null
            : {
                expr: '@table[@row, "market_cap"] / @table[@row, "ltm_ni_rep"]',
              },
        pe_ltm_qoe: {
          expr: '@table[@row, "market_cap"] / @table[@row, "ltm_ni_qoe"]',
        },
        p_ltm_fcf: {
          expr: '@table[@row, "market_cap"] / @table[@row, "ltm_fcf"]',
        },
      },
    })
  }

  compsLtm.addSectionHeader("Target Company")
  addLtmEntityRow("COST", true)

  compsLtm.addSectionHeader("Peer Group (Pure-Play Clubs & Omni/Mass Retail)")
  for (const ticker of PEER_ORDER) {
    addLtmEntityRow(ticker, false)
  }

  compsLtm.addSectionHeader("Peer Summary Statistics (Excl. COST)")
  const ltmMeasureIds = [
    "close_price",
    "sec_shares",
    "market_cap",
    "cash_sti",
    "debt_leases",
    "ev",
    "ltm_rev",
    "ltm_ebitda_rep",
    "qoe_ebitda_adj",
    "ltm_ebitda_qoe",
    "ltm_ebit_rep",
    "ltm_ebit_qoe",
    "ltm_ni_rep",
    "qoe_ni_adj",
    "ltm_ni_qoe",
    "ltm_fcf",
    "net_lev_qoe",
    "ev_ltm_sales",
    "ev_ltm_ebitda_rep",
    "ev_ltm_ebitda_qoe",
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
      style: "subtotal",
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
    "Pure-Play Club Mean (BJ, PSMT)",
    "AVERAGE",
    "BJ",
    "PSMT"
  )
  addLtmSummaryRow(
    "pure_club_median",
    "Pure-Play Club Median (BJ, PSMT)",
    "MEDIAN",
    "BJ",
    "PSMT"
  )
  addLtmSummaryRow(
    "all_peer_mean",
    "All-Peer Mean (ex-COST)",
    "AVERAGE",
    "BJ",
    "KR"
  )
  addLtmSummaryRow(
    "all_peer_median",
    "All-Peer Median (ex-COST)",
    "MEDIAN",
    "BJ",
    "KR"
  )

  // 2. Consensus Forward FY27E / FY28E Trading Comparables
  const compsForward = sheet.addTable(
    "TradingCompsForward",
    "Trading Comparables — Street Consensus FY27E & FY28E Multiples ($M / $/sh)",
    {
      subtitle: [
        "Street consensus FY27E & FY28E revenue, EBITDA, EBIT, EPS, FCF & analyst price targets as of 2026-11-13 close ($M / $/sh / x)",
        `Source: ${kg.citations.consensusEstimates}`,
        `Source: ${kg.citations.priceTargets}`,
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
    headers: ["Enterprise", "Value"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("rev_27", {
    role: "measure",
    headers: ["FY27E", "Revenue"],
    format: "currency",
    decimals: 0,
  })
  compsForward.addColumn("ebitda_27", {
    role: "measure",
    headers: ["FY27E", "EBITDA"],
    format: "currency",
    decimals: 0,
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
  compsForward.addColumn("ebitda_margin_27", {
    role: "measure",
    headers: ["FY27E", "EBITDA %"],
    format: "percentage",
    decimals: 1,
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
    headers: ["Street PT", "Upside"],
    format: "percentage",
    decimals: 1,
  })

  const addFwdEntityRow = (ticker: AllCompTicker, highlight = false): void => {
    const c = kg.market.consensus[ticker]
    const meta = peerMeta[ticker]
    const isPsmtMissingFcf = c.saFcf27 === null
    const isCost = ticker === "COST"
    compsForward.addRow(ticker, {
      ...(highlight ? { highlight: true, style: "subtotal" as const } : {}),
      cells: {
        ticker_name: isPsmtMissingFcf
          ? {
              value: `${meta.name} (${ticker})`,
              note: "PSMT FY27E consensus FCF & P/FCF omitted due to sparse 2-analyst coverage.",
            }
          : `${meta.name} (${ticker})`,
        close_price: { expr: `TradingCompsLTM["${ticker}", "close_price"]` },
        ev: { expr: `TradingCompsLTM["${ticker}", "ev"]` },
        rev_27: isCost
          ? { expr: 'MarketAnchors["cons_rev_fy27", "val"]' }
          : c.rev27,
        ebitda_27: isCost
          ? { expr: 'MarketAnchors["cons_ebitda_fy27", "val"]' }
          : c.ebitda27,
        ebit_27: isCost
          ? { expr: 'MarketAnchors["cons_ebit_fy27", "val"]' }
          : c.ebit27,
        eps_27: isCost
          ? { expr: 'MarketAnchors["cons_eps_fy27", "val"]' }
          : c.epsHeadline27,
        fcf_27: isCost
          ? { expr: 'MarketAnchors["cons_fcf_fy27", "val"]' }
          : isPsmtMissingFcf
            ? null
            : c.saFcf27,
        ebitda_margin_27: {
          expr: '@table[@row, "ebitda_27"] / @table[@row, "rev_27"]',
        },
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
          ? null
          : {
              expr: `TradingCompsLTM["${ticker}", "market_cap"] / @table[@row, "fcf_27"]`,
            },
        ebitda_28: c.ebitda28,
        eps_28: c.epsHeadline28,
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

  compsForward.addSectionHeader("Target Company")
  addFwdEntityRow("COST", true)

  compsForward.addSectionHeader(
    "Peer Group (Pure-Play Clubs & Omni/Mass Retail)"
  )
  for (const ticker of PEER_ORDER) {
    addFwdEntityRow(ticker, false)
  }

  compsForward.addSectionHeader("Peer Summary Statistics (Excl. COST)")
  const fwdMeasureIds = [
    "close_price",
    "ev",
    "rev_27",
    "ebitda_27",
    "ebit_27",
    "eps_27",
    "fcf_27",
    "ebitda_margin_27",
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
      style: "subtotal",
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
    "Pure-Play Club Mean (BJ, PSMT)",
    "AVERAGE",
    "BJ",
    "PSMT"
  )
  addFwdSummaryRow(
    "pure_club_median",
    "Pure-Play Club Median (BJ, PSMT)",
    "MEDIAN",
    "BJ",
    "PSMT"
  )
  addFwdSummaryRow(
    "all_peer_mean",
    "All-Peer Mean (ex-COST)",
    "AVERAGE",
    "BJ",
    "KR"
  )
  addFwdSummaryRow(
    "all_peer_median",
    "All-Peer Median (ex-COST)",
    "MEDIAN",
    "BJ",
    "KR"
  )

  // 3. Quality-Calibrated Comps Target Valuation for COST
  const compsValuation = sheet.addTable(
    "CompsValuationCalibration",
    "Quality-Calibrated Trading Comps Valuation for COST ($M / $/sh)",
    {
      subtitle: [
        "Applies quality-calibrated FY27E EV/EBITDA multiple to active model FY27E EBITDA",
        "Bridges FY26 Net Cash ($13,726M ex-op-leases) & $30.00/sh special dividend ($/sh)",
      ],
      currency: "USD",
      below: compsForward,
    }
  )
  compsValuation.addColumn("line_item", {
    role: "descriptor",
    header: "Calibration Step",
  })
  compsValuation.addColumn("val", {
    role: "measure",
    headers: ["Active", "Scenario"],
  })

  compsValuation.addRow("cost_fy27_model_ebitda", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "COST Active Model FY27E EBITDA ($M)",
      val: { expr: 'IncomeStatement["ebitda", "FY27E"]' },
    },
  })
  compsValuation.addRow("cost_fy27_cons_ebitda", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Memo: Consensus FY27E EBITDA ($M)",
      val: { expr: 'TradingCompsForward["COST", "ebitda_27"]' },
    },
  })
  compsValuation.addRow("pure_club_median_mult", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Pure-Play Club Median FY27E EV/EBITDA (BJ, PSMT)",
      val: { expr: 'TradingCompsForward["pure_club_median", "ev_ebitda_27"]' },
    },
  })
  compsValuation.addRow("wmt_fy27_mult", {
    ...rowFormatOptions("multiple", 1),
    cells: {
      line_item: "Walmart (WMT) FY27E EV/EBITDA",
      val: { expr: 'TradingCompsForward["WMT", "ev_ebitda_27"]' },
    },
  })
  compsValuation.addRow("calibrated_target_mult", {
    ...rowFormatOptions("multiple", 1),
    highlight: true,
    cells: {
      line_item: "Quality-Calibrated COST Target Multiple",
      val: {
        expr: 'ScalarAssumptionsActive["calibrated_comps_ev_to_ebitda", "val"]',
      },
    },
  })
  compsValuation.addRow("implied_ev", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Implied Enterprise Value ($M)",
      val: {
        expr: '@table["cost_fy27_model_ebitda", "val"] * @table["calibrated_target_mult", "val"]',
      },
    },
  })
  compsValuation.addRow("net_cash_bridge", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "(+) FY26 Net Cash Bridge (Excl. ASC 842 Op Leases = $13,726M)",
        note: "Deducts $7,575M carrying financial debt + finance leases from $21,301M Cash & STI to align with post-operating-lease-rent FY27E EBITDA; memo row below reconciles incl.-operating-lease headline Net Cash ($11,120M).",
      },
      val: { expr: 'DcfBridge["net_cash_bridge", "perp"]' },
    },
  })
  compsValuation.addRow("implied_equity_cum_div", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    cells: {
      line_item: "Implied Equity Value — Cum-Dividend ($M)",
      val: {
        expr: '@table["implied_ev", "val"] + @table["net_cash_bridge", "val"]',
      },
    },
  })
  compsValuation.addRow("implied_price_cum_div", {
    ...rowFormatOptions("currency", 2),
    style: "subtotal",
    highlight: true,
    cells: {
      line_item: "Implied Share Price — Cum-Dividend ($/sh)",
      val: {
        expr: '@table["implied_equity_cum_div", "val"] / MarketAnchors["cost_sec_shares", "val"]',
      },
    },
  })
  compsValuation.addRow("implied_price_ex_div", {
    ...rowFormatOptions("currency", 2),
    style: "total",
    cells: {
      line_item: "Implied Share Price — Ex-$30.00/sh Special Dividend ($/sh)",
      val: {
        expr: '@table["implied_price_cum_div", "val"] - ScalarAssumptionsActive["special_dividend_ps_fy27", "val"]',
      },
    },
  })
  compsValuation.addRow("upside_downside_cum", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Implied Upside / (Downside) vs. $1,106.21 Close",
      val: {
        expr: '@table["implied_price_cum_div", "val"] / MarketAnchors["cost_close_price", "val"] - 1',
      },
    },
  })
  compsValuation.addRow("memo_net_cash_incl_op_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item:
        "Memo: Headline FY26 Net Cash (incl. $2,606M ASC 842 Op Leases)",
      val: {
        expr: 'DcfBridge["plus_cash_sti", "perp"] - DebtLeasesSchedule["total_debt_and_leases", "FY26"]',
      },
    },
  })

  // 4. Supporting Schedule: Peer LTM Flow Calendarization Bridge (FY26 + H1 FY27 - H1 FY26)
  const peerLtmBridge = sheet.addTable(
    "PeerLtmBridge",
    "Supporting Schedule — Peer LTM Flow Calendarization Bridge ($M)",
    {
      subtitle: [
        "As-reported period figures ($M); Jan-FY peers (BJ, WMT, TGT, KR) bridge LTM = FY26 + H1 FY27 - H1 FY26",
        "Aug-FY PriceSmart (PSMT) aligns directly with COST FY26 window (LTM = FY26 actual)",
        `Source: ${kg.citations.peerIncomeStatement}`,
        `Source: ${kg.citations.peerQoe}`,
      ],
      currency: "USD",
      below: compsValuation,
    }
  )
  peerLtmBridge.addColumn("line_item", {
    role: "descriptor",
    header: "Peer LTM Flow Line ($M)",
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
    decimals = 0
  ): void => {
    peerLtmBridge.addRow(id, {
      ...rowFormatOptions("currency", decimals),
      cells: {
        line_item: {
          value: label,
          note: "PSMT fiscal year ends Aug 31 (matches COST FY26 window); LTM = FY26 actual.",
        },
        fy26: fy26Val,
        h1_26: null,
        h1_27: null,
        ltm: { expr: '@table[@row, "fy26"]' },
      },
    })
  }

  const { bj, psmt, wmt, tgt, kr } = kg.market.peers

  peerLtmBridge.addSectionHeader(
    "BJ's Wholesale Club (BJ) — LTM Q2 FY27 (End 2026-08-01)"
  )
  addJanPeerFlowRow("bj_net_sales", "BJ Net merchandise sales", bj.netSales)
  addJanPeerFlowRow(
    "bj_mfi_other",
    "BJ Membership fee & other income",
    bj.mfiAndOther
  )
  addJanPeerFlowRow("bj_rev", "BJ Total revenues", bj.rev)
  addJanPeerFlowRow("bj_cost_of_sales", "BJ Cost of sales", bj.costOfSales)
  addJanPeerFlowRow("bj_sga", "BJ SG&A expenses", bj.sga)
  addJanPeerFlowRow(
    "bj_pre_opening",
    "BJ Pre-opening expenses",
    bj.preOpening,
    1
  )
  addJanPeerFlowRow("bj_ebit", "BJ Operating income (EBIT)", bj.ebit)
  addJanPeerFlowRow("bj_ebt", "BJ Income before income taxes (EBT)", bj.ebt)
  addJanPeerFlowRow("bj_tax", "BJ Income tax expense", bj.tax)
  addJanPeerFlowRow("bj_ni", "BJ Net income", bj.ni)
  addJanPeerFlowRow("bj_da", "BJ Depreciation & amortization", bj.da)
  addJanPeerFlowRow("bj_cfo", "BJ Operating cash flow (CFO)", bj.cfo)
  addJanPeerFlowRow(
    "bj_capex",
    "BJ Additions to PP&E (CapEx, CF outflow)",
    bj.capex
  )
  addJanPeerFlowRow(
    "bj_qoe_restruct",
    "BJ QoE: Restructuring & severance charges (pre-tax)",
    bj.qoeRestruct,
    2
  )
  addJanPeerFlowRow(
    "bj_qoe_tax_mgmt",
    "BJ QoE: Management non-GAAP tax impact",
    bj.qoeTaxMgmt,
    2
  )

  peerLtmBridge.addSectionHeader(
    "PriceSmart (PSMT) — FY26 Annual (End 2026-08-31)"
  )
  addAugPeerFlowRow("psmt_rev", "PSMT Total revenues", psmt.revFy26)
  addAugPeerFlowRow("psmt_ebit", "PSMT Operating income (EBIT)", psmt.ebitFy26)
  addAugPeerFlowRow(
    "psmt_ebt",
    "PSMT Income before income taxes (EBT)",
    psmt.ebtFy26
  )
  addAugPeerFlowRow("psmt_tax", "PSMT Income tax expense", psmt.taxFy26)
  addAugPeerFlowRow("psmt_ni", "PSMT Net income", psmt.niFy26)
  addAugPeerFlowRow("psmt_da", "PSMT Depreciation & amortization", psmt.daFy26)
  addAugPeerFlowRow("psmt_cfo", "PSMT Operating cash flow (CFO)", psmt.cfoFy26)
  addAugPeerFlowRow(
    "psmt_capex",
    "PSMT Additions to PP&E (CapEx, CF outflow)",
    psmt.capexFy26
  )

  peerLtmBridge.addSectionHeader("Walmart (WMT) — LTM Q2 FY27 (End 2026-07-31)")
  addJanPeerFlowRow("wmt_rev", "WMT Total revenues", wmt.rev)
  addJanPeerFlowRow("wmt_ebit", "WMT Operating income (EBIT)", wmt.ebit)
  addJanPeerFlowRow("wmt_ebt", "WMT Income before income taxes (EBT)", wmt.ebt)
  addJanPeerFlowRow("wmt_tax", "WMT Provision for income taxes", wmt.tax)
  addJanPeerFlowRow(
    "wmt_ni",
    "WMT Consolidated net income attributable to Walmart",
    wmt.ni
  )
  addJanPeerFlowRow("wmt_da", "WMT Depreciation & amortization", wmt.da)
  addJanPeerFlowRow("wmt_cfo", "WMT Operating cash flow (CFO)", wmt.cfo)
  addJanPeerFlowRow(
    "wmt_capex",
    "WMT Payments for PP&E (CapEx, CF outflow)",
    wmt.capex
  )
  addJanPeerFlowRow(
    "wmt_qoe_other_gains",
    "WMT QoE: Other gains and losses (non-op equity inversiones, pre-tax)",
    wmt.qoeOtherGains
  )

  peerLtmBridge.addSectionHeader("Target (TGT) — LTM Q2 FY27 (End 2026-08-01)")
  addJanPeerFlowRow("tgt_rev", "TGT Total revenue", tgt.rev)
  addJanPeerFlowRow("tgt_ebit", "TGT Operating income (EBIT)", tgt.ebit)
  addJanPeerFlowRow("tgt_ni", "TGT Net earnings", tgt.ni)
  addJanPeerFlowRow("tgt_da", "TGT Depreciation & amortization", tgt.da)
  addJanPeerFlowRow("tgt_cfo", "TGT Operating cash flow (CFO)", tgt.cfo)
  addJanPeerFlowRow(
    "tgt_capex",
    "TGT Additions to PP&E (CapEx, CF outflow)",
    tgt.capex
  )

  peerLtmBridge.addSectionHeader("Kroger (KR) — LTM Q2 FY27 (End 2026-08-15)")
  addJanPeerFlowRow("kr_rev", "KR Sales", kr.rev)
  addJanPeerFlowRow("kr_ebit", "KR Operating profit (EBIT)", kr.ebit)
  addJanPeerFlowRow("kr_ni", "KR Net earnings attributable to Kroger", kr.ni)
  addJanPeerFlowRow("kr_da", "KR Depreciation & amortization", kr.da)
  addJanPeerFlowRow("kr_cfo", "KR Operating cash flow (CFO)", kr.cfo)
  addJanPeerFlowRow(
    "kr_capex",
    "KR Payments for PP&E (CapEx, CF outflow)",
    kr.capex
  )
  addJanPeerFlowRow(
    "kr_qoe_op_adj",
    "KR QoE: Total operating profit adjustments (Ocado & merger costs)",
    kr.qoeOpAdj
  )
  addJanPeerFlowRow(
    "kr_qoe_ni_adj",
    "KR QoE: Total after-tax net earnings adjustments",
    kr.qoeNiAdj
  )

  // 5. Supporting Schedule: 6-Company EV Balance Sheet & QoE Tax-Shield Bridge
  const peerEvAndQoeBridge = sheet.addTable(
    "PeerEvAndQoeBridge",
    "Supporting Schedule — Peer Enterprise Value Debt/Lease & QoE Normalization Bridge ($M)",
    {
      subtitle: [
        "As-reported balance-sheet & QoE inputs across all 6 companies ($M); live formulas compute Cash & STI and Total Debt & Leases",
        "Normalizes non-recurring LTM items (tariff refunds, SLB gains, restructuring, Ocado impairment & tax items) via live ETR shields",
        `Source: ${kg.citations.peerIncomeStatement}`,
        `Source: ${kg.citations.peerQoe}`,
      ],
      currency: "USD",
      below: peerLtmBridge,
    }
  )
  peerEvAndQoeBridge.addColumn("line_item", {
    role: "descriptor",
    header: "EV / QoE Bridge Component",
  })
  for (const ticker of ALL_TICKERS) {
    peerEvAndQoeBridge.addColumn(ticker, {
      role: "measure",
      headers: EV_QOE_COL_HEADERS[ticker],
    })
  }

  peerEvAndQoeBridge.addSectionHeader(
    "1. Balance Sheet Cash & Total Debt / Lease Stack ($M)"
  )
  peerEvAndQoeBridge.addRow("cash_and_equivalents", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Cash and cash equivalents",
      COST: { expr: 'BalanceSheet["cash_and_equivalents", "FY26"]' },
      BJ: bj.cashH127,
      PSMT: psmt.cashFy26,
      WMT: wmt.cashH127,
      TGT: tgt.cashH127,
      KR: kr.cashH127,
    },
  })
  peerEvAndQoeBridge.addRow("short_term_investments", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Short-term marketable investments",
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
    cells: { line_item: "Total Cash & Short-Term Investments ($M)" },
  })
  peerEvAndQoeBridge.addRow("financial_debt", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value:
          "Carrying financial debt (notes, commercial paper & credit lines)",
        note: "TGT & KR report combined debt + finance leases on BS face line.",
      },
      COST: {
        expr: 'DebtLeasesSchedule["total_lt_debt_carrying", "FY26"] + DebtLeasesSchedule["revolver_end", "FY26"]',
      },
      BJ: bj.carryingFinancialDebtH127,
      PSMT: psmt.carryingFinancialDebtFy26,
      WMT: wmt.financialDebtExclLeasesH127,
      TGT: tgt.debtAndFinLeasesBsH127,
      KR: kr.debtAndFinLeasesBsH127,
    },
  })
  peerEvAndQoeBridge.addRow("finance_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Finance lease liabilities (disclosed separately)",
        note: "BJ includes FY26 10-K $50.0M finance lease liabilities.",
      },
      COST: { expr: 'DebtLeasesSchedule["total_fin_lease_liab", "FY26"]' },
      BJ: bj.financeLeaseLiabFy26,
      PSMT: 0,
      WMT: wmt.financeLeaseLiabH127,
      TGT: 0,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("operating_leases", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Operating lease liabilities (ASC 842 current + LT)",
      COST: { expr: 'DebtLeasesSchedule["total_op_lease_liab", "FY26"]' },
      BJ: bj.operatingLeaseLiabH127,
      PSMT: psmt.totalLeaseLiabFy26,
      WMT: wmt.operatingLeaseLiabH127,
      TGT: tgt.operatingLeaseLiabH127,
      KR: kr.operatingLeaseLiabH127,
    },
  })
  peerEvAndQoeBridge.addRow("slb_financing_obligations", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Sale-leaseback financing obligations (BJ)",
        note: "BJ FY26 10-K $117.3M long-term SLB financing obligations folded into Other Current/Noncurrent Liabilities on Q2 10-Q.",
      },
      COST: 0,
      BJ: bj.ltFinancingObligationsFy26,
      PSMT: 0,
      WMT: 0,
      TGT: 0,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("total_debt_and_leases", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    expr: 'SUM(@table["financial_debt".."slb_financing_obligations", @col])',
    cells: {
      line_item: "Total Debt & Lease Obligations (Headline EV Basis, $M)",
    },
  })

  peerEvAndQoeBridge.addSectionHeader(
    "2. LTM Effective Tax Rate & Pre-Tax / After-Tax QoE Normalization Bridge"
  )
  peerEvAndQoeBridge.addRow("ltm_ebt", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "LTM Pre-Tax Income (EBT, $M)",
      COST: { expr: 'IncomeStatement["ebt", "FY26"]' },
      BJ: { expr: 'PeerLtmBridge["bj_ebt", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_ebt", "ltm"]' },
      WMT: { expr: 'PeerLtmBridge["wmt_ebt", "ltm"]' },
      TGT: null,
      KR: null,
    },
  })
  peerEvAndQoeBridge.addRow("ltm_tax", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "LTM Income Tax Provision ($M)",
      COST: { expr: 'IncomeStatement["tax_provision", "FY26"]' },
      BJ: { expr: 'PeerLtmBridge["bj_tax", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_tax", "ltm"]' },
      WMT: { expr: 'PeerLtmBridge["wmt_tax", "ltm"]' },
      TGT: null,
      KR: null,
    },
  })
  peerEvAndQoeBridge.addRow("ltm_etr", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "LTM Effective Tax Rate (Tax / EBT)",
      COST: {
        expr: 'IF(@table["ltm_ebt", "COST"] > 0, @table["ltm_tax", "COST"] / @table["ltm_ebt", "COST"], NA())',
      },
      BJ: {
        expr: 'IF(@table["ltm_ebt", "BJ"] > 0, @table["ltm_tax", "BJ"] / @table["ltm_ebt", "BJ"], NA())',
      },
      PSMT: {
        expr: 'IF(@table["ltm_ebt", "PSMT"] > 0, @table["ltm_tax", "PSMT"] / @table["ltm_ebt", "PSMT"], NA())',
      },
      WMT: {
        expr: 'IF(@table["ltm_ebt", "WMT"] > 0, @table["ltm_tax", "WMT"] / @table["ltm_ebt", "WMT"], NA())',
      },
      TGT: null,
      KR: null,
    },
  })
  peerEvAndQoeBridge.addRow("qoe_op_item_1", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: {
        value:
          "Primary Operating QoE Item (IEEPA Tariff Refund / SLB Gain / Asset Disp., $M)",
        note: "COST reports positive $124M gross merchandise cost offset and $50M price reinvestment; BJ -$10.6M SLB gain; PSMT +$3.8M disposal loss; WMT -$2,900M tariff refund; TGT -$994M tariff refund; KR +$2,686M Ocado/merger.",
      },
      COST: kg.cost.qoe.fy26IeepaMerchOffset,
      BJ: bj.qoeSlbGainH127,
      PSMT: psmt.qoeLossDisposalFy26,
      WMT: wmt.qoeTariffRefundH127,
      TGT: tgt.qoeTariffRefundH127,
      KR: { expr: 'PeerLtmBridge["kr_qoe_op_adj", "ltm"]' },
    },
  })
  peerEvAndQoeBridge.addRow("qoe_op_item_2", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item:
        "Secondary Operating QoE Item (Reinvest. / Restruct. / JV Gain / PhonePe / Transf., $M)",
      COST: kg.cost.qoe.fy26IeepaReinvestedEst,
      BJ: { expr: 'PeerLtmBridge["bj_qoe_restruct", "ltm"]' },
      PSMT: psmt.qoeGainJvFy26,
      WMT: wmt.qoePhonePeFy26,
      TGT: tgt.qoeTransformationFy26,
      KR: 0,
    },
  })
  peerEvAndQoeBridge.addRow("qoe_ebitda_adj", {
    ...rowFormatOptions("currency", 1),
    style: "subtotal",
    cells: {
      line_item: "Total Pre-Tax Operating / EBITDA QoE Adjustment ($M)",
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
  peerEvAndQoeBridge.addRow("wmt_uncertain_tax_int", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item:
        "Non-Op Pre-Tax Uncertain Tax Interest Benefit (WMT Q2 FY27, $M)",
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
      line_item: "Direct Tax / Disclosed After-Tax Non-GAAP Adjustment ($M)",
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
      line_item: "Disclosed After-Tax Tariff Refund EPS Impact ($/sh)",
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
      line_item: "Weighted-Average Diluted Shares for EPS QoE (M)",
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
      line_item: "Total After-Tax Net Income QoE Adjustment ($M)",
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

  return {
    compsLtm,
    compsForward,
    compsValuation,
    peerLtmBridge,
    peerEvAndQoeBridge,
  }
}
