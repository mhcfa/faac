import { Cell, type Sheet, type Table } from "f8-engine"
import type { AuditedDataSnapshot } from "../kg.ts"
import { PEER_TICKERS, wrapSubtitle, type PeerTicker } from "../timeline.ts"

export interface PeerFinancialsTables {
  readonly peerLtmOperatingBridge: Table
  readonly peerLtmCashFlowBridge: Table
  readonly peerEvBridge: Table
}

export interface PeerCompsTables {
  readonly tradingComps: Table
  readonly compsImpliedValuation: Table
}

const PEER_DISPLAY_NAMES: Readonly<Record<PeerTicker, string>> = {
  ADBE: "Adobe Inc. (ADBE)",
  INTU: "Intuit Inc. (INTU)",
  NOW: "ServiceNow, Inc. (NOW)",
  WDAY: "Workday, Inc. (WDAY)",
  HUBS: "HubSpot, Inc. (HUBS)",
  ORCL: "Oracle Corp. (ORCL)",
}

function compactPeerLtmBasis(note: string): string {
  const cleaned = note.replace(/;[^)]*/, "")
  return cleaned.length <= 19 ? cleaned : cleaned.replace(/\s+\d{4}\)/, ")")
}

function addPeerBridgeColumns(table: Table): void {
  table.addColumn("item", {
    role: "descriptor",
    header: "Component",
  })
  for (const t of PEER_TICKERS) {
    table.addColumn(t, {
      header: t,
      group:
        t === "ADBE" || t === "INTU"
          ? "Mature Low-SBC"
          : t === "ORCL"
            ? "Infra"
            : "High-SBC SaaS",
    })
  }
}

function addRawPeerRow(
  table: Table,
  id: string,
  label: string,
  pick: (t: PeerTicker) => number,
  format: "currency" | "number" = "currency",
  decimals = 0
): void {
  const cells: Record<string, Cell | number | string> = {
    item: label,
  }
  for (const t of PEER_TICKERS) {
    cells[t] = pick(t)
  }
  table.addRow(id, { cells, format, decimals })
}

export function buildPeerFinancialsSheet(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): PeerFinancialsTables {
  const peerCiteSummary = `${audited.citations.peerFilings.ADBE}; ${audited.citations.peerFilings.INTU}; ${audited.citations.peerFilings.NOW}; ${audited.citations.peerFilings.WDAY}; ${audited.citations.peerFilings.HUBS}; ${audited.citations.peerFilings.ORCL}`

  // Table 1: Peer Group LTM Revenue, Operating Income, D&A & SBC Bridge
  const peerLtmOperatingBridge = sheet.addTable(
    "PeerLtmOperatingBridge",
    "Peer Group LTM Revenue, Operating Income, D&A & SBC (US GAAP)",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Sources: ${peerCiteSummary}`,
        104
      ),
    }
  )
  addPeerBridgeColumns(peerLtmOperatingBridge)

  peerLtmOperatingBridge.addSectionHeader("As-reported revenue components")
  addRawPeerRow(
    peerLtmOperatingBridge,
    "fy_rev",
    "Latest FY revenue",
    (t) => audited.peers[t].fyRev
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd1_rev",
    "Current YTD interim revenue",
    (t) => audited.peers[t].ytd1Rev
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd0_rev",
    "Prior-year comparative YTD rev.",
    (t) => audited.peers[t].ytd0Rev
  )
  peerLtmOperatingBridge.addRow("ltm_rev", {
    cells: { item: "LTM revenue (FY + YTD1 − YTD0)" },
    expr: '@table["fy_rev", @col] + @table["ytd1_rev", @col] - @table["ytd0_rev", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  peerLtmOperatingBridge.addRowGutter()
  peerLtmOperatingBridge.addSectionHeader("As-reported GAAP operating income")
  addRawPeerRow(
    peerLtmOperatingBridge,
    "fy_ebit",
    "Latest FY GAAP operating income",
    (t) => audited.peers[t].fyEbit
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd1_ebit",
    "Current YTD operating income",
    (t) => audited.peers[t].ytd1Ebit
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd0_ebit",
    "Prior-year YTD operating income",
    (t) => audited.peers[t].ytd0Ebit
  )
  peerLtmOperatingBridge.addRow("ltm_ebit", {
    cells: { item: "LTM GAAP operating income (EBIT)" },
    expr: '@table["fy_ebit", @col] + @table["ytd1_ebit", @col] - @table["ytd0_ebit", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  peerLtmOperatingBridge.addRowGutter()
  peerLtmOperatingBridge.addSectionHeader("As-reported D&A & SBC components")
  addRawPeerRow(
    peerLtmOperatingBridge,
    "fy_da_1",
    "Latest FY D&A (primary line)",
    (t) => audited.peers[t].fyDa1
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "fy_da_2",
    "Latest FY intangibles amort.",
    (t) => audited.peers[t].fyDa2
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd1_da_1",
    "Current YTD D&A (primary line)",
    (t) => audited.peers[t].ytd1Da1
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd1_da_2",
    "Current YTD intangibles amort.",
    (t) => audited.peers[t].ytd1Da2
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd0_da_1",
    "Prior-year YTD D&A (primary)",
    (t) => audited.peers[t].ytd0Da1
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd0_da_2",
    "Prior-year YTD intangibles amort.",
    (t) => audited.peers[t].ytd0Da2
  )
  peerLtmOperatingBridge.addRow("ltm_da", {
    cells: { item: "LTM consolidated D&A" },
    expr: '(@table["fy_da_1", @col] + @table["fy_da_2", @col]) + (@table["ytd1_da_1", @col] + @table["ytd1_da_2", @col]) - (@table["ytd0_da_1", @col] + @table["ytd0_da_2", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  addRawPeerRow(
    peerLtmOperatingBridge,
    "fy_sbc",
    "Latest FY stock-based comp.",
    (t) => audited.peers[t].fySbc
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd1_sbc",
    "Current YTD SBC",
    (t) => audited.peers[t].ytd1Sbc
  )
  addRawPeerRow(
    peerLtmOperatingBridge,
    "ytd0_sbc",
    "Prior-year YTD SBC",
    (t) => audited.peers[t].ytd0Sbc
  )
  peerLtmOperatingBridge.addRow("ltm_sbc", {
    cells: { item: "LTM stock-based compensation" },
    expr: '@table["fy_sbc", @col] + @table["ytd1_sbc", @col] - @table["ytd0_sbc", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  // Table 2: Peer Group LTM Cash Flow & Profitability Bridge
  const peerLtmCashFlowBridge = sheet.addTable(
    "PeerLtmCashFlowBridge",
    "Peer Group LTM Cash Flow & Profitability Bridge (US GAAP)",
    {
      subtitle: wrapSubtitle(
        `($ in Millions) | Sources: ${peerCiteSummary}`,
        104
      ),
    }
  )
  addPeerBridgeColumns(peerLtmCashFlowBridge)

  peerLtmCashFlowBridge.addSectionHeader("As-reported OCF & CapEx components")
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "fy_ocf",
    "Latest FY operating cash flow",
    (t) => audited.peers[t].fyOcf
  )
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "ytd1_ocf",
    "Current YTD operating cash flow",
    (t) => audited.peers[t].ytd1Ocf
  )
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "ytd0_ocf",
    "Prior-year YTD operating cash flow",
    (t) => audited.peers[t].ytd0Ocf
  )
  peerLtmCashFlowBridge.addRow("ltm_ocf", {
    cells: { item: "LTM operating cash flow" },
    expr: '@table["fy_ocf", @col] + @table["ytd1_ocf", @col] - @table["ytd0_ocf", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "fy_capex_1",
    "Latest FY PP&E CapEx",
    (t) => audited.peers[t].fyCapex1
  )
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "fy_capex_2",
    "Latest FY capitalized software",
    (t) => audited.peers[t].fyCapex2
  )
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "ytd1_capex_1",
    "Current YTD PP&E CapEx",
    (t) => audited.peers[t].ytd1Capex1
  )
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "ytd1_capex_2",
    "Current YTD capitalized software",
    (t) => audited.peers[t].ytd1Capex2
  )
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "ytd0_capex_1",
    "Prior-year YTD PP&E CapEx",
    (t) => audited.peers[t].ytd0Capex1
  )
  addRawPeerRow(
    peerLtmCashFlowBridge,
    "ytd0_capex_2",
    "Prior-year YTD cap. software",
    (t) => audited.peers[t].ytd0Capex2
  )
  peerLtmCashFlowBridge.addRow("ltm_capex", {
    cells: { item: "LTM total CapEx & cap. software" },
    expr: '(@table["fy_capex_1", @col] + @table["fy_capex_2", @col]) + (@table["ytd1_capex_1", @col] + @table["ytd1_capex_2", @col]) - (@table["ytd0_capex_1", @col] + @table["ytd0_capex_2", @col])',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })

  peerLtmCashFlowBridge.addRowGutter()
  peerLtmCashFlowBridge.addSectionHeader(
    "Derived LTM profitability & cash flow"
  )
  peerLtmCashFlowBridge.addRow("ltm_gaap_ebitda", {
    cells: { item: "LTM GAAP EBITDA (EBIT + D&A)" },
    expr: 'PeerLtmOperatingBridge["ltm_ebit", @col] + PeerLtmOperatingBridge["ltm_da", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  peerLtmCashFlowBridge.addRow("ltm_adj_ebitda", {
    cells: { item: "LTM Adjusted EBITDA (GAAP + SBC)" },
    expr: '@table["ltm_gaap_ebitda", @col] + PeerLtmOperatingBridge["ltm_sbc", @col]',
    format: "currency",
    decimals: 0,
  })
  peerLtmCashFlowBridge.addRow("ltm_ebitda_less_capex", {
    cells: { item: "LTM GAAP EBITDA less CapEx" },
    expr: '@table["ltm_gaap_ebitda", @col] + @table["ltm_capex", @col]',
    format: "currency",
    decimals: 0,
  })
  peerLtmCashFlowBridge.addRow("ltm_fcf", {
    cells: { item: "LTM free cash flow (OCF − CapEx)" },
    expr: '@table["ltm_ocf", @col] + @table["ltm_capex", @col]',
    format: "currency",
    decimals: 0,
  })
  peerLtmCashFlowBridge.addRow("ltm_fcf_ex_sbc", {
    cells: { item: "LTM economic FCF (FCF − SBC)" },
    expr: '@table["ltm_fcf", @col] - PeerLtmOperatingBridge["ltm_sbc", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  peerLtmCashFlowBridge.addRow("gaap_op_margin", {
    cells: { item: "LTM GAAP operating margin" },
    expr: 'PeerLtmOperatingBridge["ltm_ebit", @col] / PeerLtmOperatingBridge["ltm_rev", @col]',
    format: "percentage",
    decimals: 1,
  })
  peerLtmCashFlowBridge.addRow("sbc_pct_rev", {
    cells: { item: "LTM SBC (% of revenue)" },
    expr: 'PeerLtmOperatingBridge["ltm_sbc", @col] / PeerLtmOperatingBridge["ltm_rev", @col]',
    format: "percentage",
    decimals: 1,
  })

  // Table 3: Peer Group Balance Sheet, Enterprise Value & Consensus EPS Bridge
  const peerEvBridge = sheet.addTable(
    "PeerEvBridge",
    "Peer Group Balance Sheet, Enterprise Value & Consensus EPS",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, shares in Millions, per-share in $) | Sources: Peer SEC balance sheets, Nasdaq closing prices (Nov 18, 2026) & consensus EPS",
        104
      ),
    }
  )
  addPeerBridgeColumns(peerEvBridge)

  peerEvBridge.addSectionHeader("Balance sheet, market cap & EV")
  const spotPxCells: Record<string, Cell | string> = {
    item: "Spot share price (Nov 18, 2026)",
  }
  for (const t of PEER_TICKERS) {
    spotPxCells[t] = new Cell({ expr: `BetaSummaryTable["${t}", "spot_px"]` })
  }
  peerEvBridge.addRow("spot_price", {
    cells: spotPxCells,
    format: "currency",
    decimals: 2,
  })
  addRawPeerRow(
    peerEvBridge,
    "shares_out",
    "Cover-page common shares (M)",
    (t) => audited.peers[t].sharesOut,
    "number",
    2
  )
  peerEvBridge.addRow("market_cap", {
    cells: { item: "Equity market capitalization ($M)" },
    expr: '@table["spot_price", @col] * @table["shares_out", @col]',
    format: "currency",
    decimals: 0,
    style: "subtotal",
  })
  addRawPeerRow(
    peerEvBridge,
    "cash_1",
    "Unrestricted cash & equivalents",
    (t) => audited.peers[t].cash1
  )
  addRawPeerRow(
    peerEvBridge,
    "cash_2",
    "Short-term marketable investments",
    (t) => audited.peers[t].cash2
  )
  addRawPeerRow(
    peerEvBridge,
    "cash_3",
    "Long-term marketable investments",
    (t) => audited.peers[t].cash3
  )
  peerEvBridge.addRow("total_cash_mkt", {
    cells: { item: "Total unrestricted cash & mkt." },
    expr: '@table["cash_1", @col] + @table["cash_2", @col] + @table["cash_3", @col]',
    format: "currency",
    decimals: 0,
  })
  addRawPeerRow(
    peerEvBridge,
    "debt_current",
    "Debt, current",
    (t) => audited.peers[t].debtCurrent
  )
  addRawPeerRow(
    peerEvBridge,
    "debt_noncurrent",
    "Noncurrent debt",
    (t) => audited.peers[t].debtNoncurrent
  )
  addRawPeerRow(
    peerEvBridge,
    "pref_stock",
    "Preferred stock",
    (t) => audited.peers[t].preferredStock
  )
  addRawPeerRow(
    peerEvBridge,
    "nci",
    "Noncontrolling interests",
    (t) => audited.peers[t].noncontrollingInterests
  )
  peerEvBridge.addRow("total_debt_leases_pref", {
    cells: { item: "Gross funded debt, pref. & NCI" },
    expr: 'SUM(@table["debt_current".."nci", @col])',
    format: "currency",
    decimals: 0,
  })
  peerEvBridge.addRow("net_debt_incl_leases", {
    cells: { item: "Net funded debt, pref. & NCI" },
    expr: '@table["total_debt_leases_pref", @col] - @table["total_cash_mkt", @col]',
    format: "currency",
    decimals: 0,
  })
  peerEvBridge.addRow("enterprise_value", {
    cells: { item: "Enterprise value (ex-op. leases)" },
    expr: '@table["market_cap", @col] + @table["net_debt_incl_leases", @col]',
    format: "currency",
    decimals: 0,
    style: "total",
    shade: "alt",
  })
  addRawPeerRow(
    peerEvBridge,
    "fy1_cons_eps",
    "FY1 consensus EPS (Nasdaq/Zacks)",
    (t) => audited.peers[t].fy1ConsensusEps,
    "currency",
    2
  )
  addRawPeerRow(
    peerEvBridge,
    "fy2_cons_eps",
    "FY2 consensus EPS (Nasdaq/Zacks)",
    (t) => audited.peers[t].fy2ConsensusEps,
    "currency",
    2
  )

  peerEvBridge.addRowGutter()
  peerEvBridge.addSectionHeader("Memo: excluded operating leases")
  addRawPeerRow(
    peerEvBridge,
    "op_lease_cur",
    "Operating lease liab., current",
    (t) => audited.peers[t].opLeaseCurrent
  )
  addRawPeerRow(
    peerEvBridge,
    "op_lease_noncur",
    "Operating lease liab., noncurrent",
    (t) => audited.peers[t].opLeaseNoncurrent
  )

  return {
    peerLtmOperatingBridge,
    peerLtmCashFlowBridge,
    peerEvBridge,
  }
}

export function buildPeerCompsSheet(
  sheet: Sheet,
  audited: AuditedDataSnapshot
): PeerCompsTables {
  // Table 1: Public Trading Comparables Summary Table
  const tradingComps = sheet.addTable(
    "TradingCompsTable",
    "Public Trading Comparables: US GAAP Enterprise Cloud & SaaS Peers",
    {
      subtitle: [
        "($ in Millions, except per-share and multiples) | Prices as of Nov 18, 2026 (Nasdaq); EV excludes ASC 842 operating leases; ORCL negative cash flow multiples omitted",
        "Peer notes: INTU ex-customer funds; NOW split-adjusted; INTU & HUBS CapEx includes capitalized software; ORCL EV includes preferred stock & NCI; CRM uses post-ASR shares",
      ],
    }
  )
  tradingComps.addColumn("item", { role: "descriptor", header: "Company" })
  tradingComps.addColumn("price", {
    headers: ["Share", "Price ($)"],
    format: "currency",
    decimals: 2,
  })
  tradingComps.addColumn("mkt_cap", {
    headers: ["Market", "Cap ($M)"],
    format: "currency",
    decimals: 0,
  })
  tradingComps.addColumn("ev", {
    headers: ["Ent. Val.", "($M)"],
    format: "currency",
    decimals: 0,
  })
  tradingComps.addColumn("net_lev", {
    headers: ["Net Debt", "/ EBITDA"],
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("gaap_om", {
    headers: ["LTM GAAP", "Op. Mgn"],
    format: "percentage",
    decimals: 1,
  })
  tradingComps.addColumn("sbc_pct", {
    headers: ["LTM SBC", "% Rev."],
    format: "percentage",
    decimals: 1,
  })
  tradingComps.addColumn("ev_rev", {
    headers: ["EV / LTM", "Revenue"],
    group: "EV Multiples",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("ev_ebitda", {
    headers: ["EV / GAAP", "EBITDA"],
    group: "EV Multiples",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("ev_adj_ebitda", {
    headers: ["EV / Adj.", "EBITDA"],
    group: "EV Multiples",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("ev_ebitda_capex", {
    headers: ["EV /", "EBITDA-Cx"],
    group: "EV Multiples",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("ev_fcf", {
    headers: ["EV / LTM", "FCF"],
    group: "EV Multiples",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("ev_fcf_sbc", {
    headers: ["EV /", "FCF - SBC"],
    group: "EV Multiples",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("pe_fy1", {
    headers: ["P / FY1", "Cons. EPS"],
    group: "Consensus P/E",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("pe_fy2", {
    headers: ["P / FY2", "Cons. EPS"],
    group: "Consensus P/E",
    format: "multiple",
    decimals: 1,
  })
  tradingComps.addColumn("ltm_basis", {
    role: "descriptor",
    header: "LTM basis",
  })

  tradingComps.addSectionHeader(
    "Enterprise cloud & SaaS peer group (mature low-SBC first)"
  )
  for (const t of PEER_TICKERS) {
    const isOrcl = t === "ORCL"
    tradingComps.addRow(t, {
      cells: {
        item: PEER_DISPLAY_NAMES[t],
        price: new Cell({ expr: `PeerEvBridge["spot_price", "${t}"]` }),
        mkt_cap: new Cell({ expr: `PeerEvBridge["market_cap", "${t}"]` }),
        ev: new Cell({ expr: `PeerEvBridge["enterprise_value", "${t}"]` }),
        net_lev: new Cell({
          expr: `IF(PeerLtmCashFlowBridge["ltm_gaap_ebitda", "${t}"] > 0, PeerEvBridge["net_debt_incl_leases", "${t}"] / PeerLtmCashFlowBridge["ltm_gaap_ebitda", "${t}"], NA())`,
        }),
        gaap_om: new Cell({
          expr: `PeerLtmCashFlowBridge["gaap_op_margin", "${t}"]`,
        }),
        sbc_pct: new Cell({
          expr: `PeerLtmCashFlowBridge["sbc_pct_rev", "${t}"]`,
        }),
        ev_rev: new Cell({
          expr: `PeerEvBridge["enterprise_value", "${t}"] / PeerLtmOperatingBridge["ltm_rev", "${t}"]`,
        }),
        ev_ebitda: new Cell({
          expr: `IF(PeerLtmCashFlowBridge["ltm_gaap_ebitda", "${t}"] > 0, PeerEvBridge["enterprise_value", "${t}"] / PeerLtmCashFlowBridge["ltm_gaap_ebitda", "${t}"], NA())`,
        }),
        ev_adj_ebitda: new Cell({
          expr: `IF(PeerLtmCashFlowBridge["ltm_adj_ebitda", "${t}"] > 0, PeerEvBridge["enterprise_value", "${t}"] / PeerLtmCashFlowBridge["ltm_adj_ebitda", "${t}"], NA())`,
        }),
        ev_ebitda_capex: isOrcl
          ? new Cell({
              value: null,
              note: "Excluded from peer mean and median: negative LTM EBITDA less CapEx driven by elevated AI infrastructure CapEx.",
            })
          : new Cell({
              expr: `IF(PeerLtmCashFlowBridge["ltm_ebitda_less_capex", "${t}"] > 0, PeerEvBridge["enterprise_value", "${t}"] / PeerLtmCashFlowBridge["ltm_ebitda_less_capex", "${t}"], NA())`,
            }),
        ev_fcf: isOrcl
          ? new Cell({
              value: null,
              note: "Excluded from peer mean and median: negative LTM free cash flow driven by elevated AI infrastructure CapEx.",
            })
          : new Cell({
              expr: `IF(PeerLtmCashFlowBridge["ltm_fcf", "${t}"] > 0, PeerEvBridge["enterprise_value", "${t}"] / PeerLtmCashFlowBridge["ltm_fcf", "${t}"], NA())`,
            }),
        ev_fcf_sbc: isOrcl
          ? new Cell({
              value: null,
              note: "Excluded from peer mean and median: negative LTM FCF less SBC driven by elevated AI infrastructure CapEx.",
            })
          : new Cell({
              expr: `IF(PeerLtmCashFlowBridge["ltm_fcf_ex_sbc", "${t}"] > 0, PeerEvBridge["enterprise_value", "${t}"] / PeerLtmCashFlowBridge["ltm_fcf_ex_sbc", "${t}"], NA())`,
            }),
        pe_fy1: new Cell({
          expr: `IF(PeerEvBridge["fy1_cons_eps", "${t}"] > 0, PeerEvBridge["spot_price", "${t}"] / PeerEvBridge["fy1_cons_eps", "${t}"], NA())`,
        }),
        pe_fy2: new Cell({
          expr: `IF(PeerEvBridge["fy2_cons_eps", "${t}"] > 0, PeerEvBridge["spot_price", "${t}"] / PeerEvBridge["fy2_cons_eps", "${t}"], NA())`,
        }),
        ltm_basis: compactPeerLtmBasis(audited.peers[t].ltmBasisNote),
      },
    })
  }

  const statCols = [
    "net_lev",
    "gaap_om",
    "sbc_pct",
    "ev_rev",
    "ev_ebitda",
    "ev_adj_ebitda",
    "ev_ebitda_capex",
    "ev_fcf",
    "ev_fcf_sbc",
    "pe_fy1",
    "pe_fy2",
  ] as const

  const addStatRow = (
    id: string,
    label: string,
    fn: "AVERAGE" | "MEDIAN",
    startPeer: PeerTicker,
    endPeer: PeerTicker,
    style: "subtotal" | "total",
    basisLabel: string,
    shade?: "muted" | "alt"
  ): void => {
    const cells: Record<string, Cell | null | string> = {
      item: label,
      price: null,
      mkt_cap: null,
      ev: null,
      ltm_basis: basisLabel,
    }
    for (const c of statCols) {
      cells[c] = new Cell({
        expr: `${fn}(@table["${startPeer}".."${endPeer}", "${c}"])`,
      })
    }
    tradingComps.addRow(id, {
      cells,
      style,
      ...(shade !== undefined ? { shade } : {}),
    })
  }

  tradingComps.addRowGutter()
  tradingComps.addSectionHeader("Peer benchmark statistics")
  addStatRow(
    "all_peer_mean",
    "All-6 peer mean",
    "AVERAGE",
    "ADBE",
    "ORCL",
    "subtotal",
    "Excl. neg. ORCL CF"
  )
  addStatRow(
    "all_peer_median",
    "All-6 peer median",
    "MEDIAN",
    "ADBE",
    "ORCL",
    "subtotal",
    "Excl. neg. ORCL CF",
    "muted"
  )
  addStatRow(
    "mature_mean",
    "Mature mean (ADBE & INTU)",
    "AVERAGE",
    "ADBE",
    "INTU",
    "subtotal",
    "ADBE & INTU mean"
  )
  addStatRow(
    "mature_median",
    "Mature median (ADBE & INTU)",
    "MEDIAN",
    "ADBE",
    "INTU",
    "subtotal",
    "ADBE & INTU median",
    "muted"
  )

  tradingComps.addRowGutter()
  tradingComps.addSectionHeader("Subject company (standalone LTM Q2 FY27)")
  tradingComps.addRow("CRM", {
    cells: {
      item: "Salesforce (CRM — peer EV)",
      price: new Cell({ expr: 'BetaSummaryTable["CRM", "spot_px"]' }),
      mkt_cap: new Cell({
        expr: 'BetaSummaryTable["CRM", "spot_px"] * ScenarioVarianceBridge["base_pf_shares", "val_per_share"]',
      }),
      ev: new Cell({
        expr: '@table["CRM", "mkt_cap"] + Q2BalanceSheetAnchor["total_funded_debt_and_fin_leases", "Q2_FY27A"] - Q2BalanceSheetAnchor["total_cash_and_mkt", "Q2_FY27A"]',
      }),
      net_lev: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["gaap_ebitda", "LTM_Q2_27"] > 0, (Q2BalanceSheetAnchor["total_funded_debt_and_fin_leases", "Q2_FY27A"] - Q2BalanceSheetAnchor["total_cash_and_mkt", "Q2_FY27A"]) / LtmCashFlowAndH1Anchors["gaap_ebitda", "LTM_Q2_27"], NA())',
      }),
      gaap_om: new Cell({
        expr: 'LtmOperatingBridge["operating_income", "LTM_Q2_27"] / LtmOperatingBridge["total_revenue", "LTM_Q2_27"]',
      }),
      sbc_pct: new Cell({
        expr: 'LtmOperatingBridge["sbc_expense", "LTM_Q2_27"] / LtmOperatingBridge["total_revenue", "LTM_Q2_27"]',
      }),
      ev_rev: new Cell({
        expr: '@table["CRM", "ev"] / LtmOperatingBridge["total_revenue", "LTM_Q2_27"]',
      }),
      ev_ebitda: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["gaap_ebitda", "LTM_Q2_27"] > 0, @table["CRM", "ev"] / LtmCashFlowAndH1Anchors["gaap_ebitda", "LTM_Q2_27"], NA())',
      }),
      ev_adj_ebitda: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["adj_ebitda", "LTM_Q2_27"] > 0, @table["CRM", "ev"] / LtmCashFlowAndH1Anchors["adj_ebitda", "LTM_Q2_27"], NA())',
      }),
      ev_ebitda_capex: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["ebitda_less_capex", "LTM_Q2_27"] > 0, @table["CRM", "ev"] / LtmCashFlowAndH1Anchors["ebitda_less_capex", "LTM_Q2_27"], NA())',
      }),
      ev_fcf: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["reported_fcf", "LTM_Q2_27"] > 0, @table["CRM", "ev"] / LtmCashFlowAndH1Anchors["reported_fcf", "LTM_Q2_27"], NA())',
      }),
      ev_fcf_sbc: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["fcf_ex_sbc", "LTM_Q2_27"] > 0, @table["CRM", "ev"] / LtmCashFlowAndH1Anchors["fcf_ex_sbc", "LTM_Q2_27"], NA())',
      }),
      pe_fy1: new Cell({
        expr: 'IF(AuditedFootnoteAnchors["crm_fy1_cons_eps", "val"] > 0, @table["CRM", "price"] / AuditedFootnoteAnchors["crm_fy1_cons_eps", "val"], NA())',
      }),
      pe_fy2: new Cell({
        expr: 'IF(AuditedFootnoteAnchors["crm_fy2_cons_eps", "val"] > 0, @table["CRM", "price"] / AuditedFootnoteAnchors["crm_fy2_cons_eps", "val"], NA())',
      }),
      ltm_basis: "LTM Q2 FY27 (Jul)",
    },
    style: "total",
    shade: "alt",
  })
  tradingComps.addRow("CRM_net_strat", {
    cells: {
      item: "CRM memo: net of strat. inv.",
      price: new Cell({ expr: 'BetaSummaryTable["CRM", "spot_px"]' }),
      mkt_cap: new Cell({ expr: '@table["CRM", "mkt_cap"]' }),
      ev: new Cell({
        expr: '@table["CRM", "ev"] - Q2BalanceSheetAnchor["strategic_investments", "Q2_FY27A"] * (1 - ScalarDrivers["strategicInvHaircut", "base"])',
      }),
      net_lev: null,
      gaap_om: new Cell({ expr: '@table["CRM", "gaap_om"]' }),
      sbc_pct: new Cell({ expr: '@table["CRM", "sbc_pct"]' }),
      ev_rev: new Cell({
        expr: '@table["CRM_net_strat", "ev"] / LtmOperatingBridge["total_revenue", "LTM_Q2_27"]',
      }),
      ev_ebitda: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["gaap_ebitda", "LTM_Q2_27"] > 0, @table["CRM_net_strat", "ev"] / LtmCashFlowAndH1Anchors["gaap_ebitda", "LTM_Q2_27"], NA())',
      }),
      ev_adj_ebitda: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["adj_ebitda", "LTM_Q2_27"] > 0, @table["CRM_net_strat", "ev"] / LtmCashFlowAndH1Anchors["adj_ebitda", "LTM_Q2_27"], NA())',
      }),
      ev_ebitda_capex: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["ebitda_less_capex", "LTM_Q2_27"] > 0, @table["CRM_net_strat", "ev"] / LtmCashFlowAndH1Anchors["ebitda_less_capex", "LTM_Q2_27"], NA())',
      }),
      ev_fcf: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["reported_fcf", "LTM_Q2_27"] > 0, @table["CRM_net_strat", "ev"] / LtmCashFlowAndH1Anchors["reported_fcf", "LTM_Q2_27"], NA())',
      }),
      ev_fcf_sbc: new Cell({
        expr: 'IF(LtmCashFlowAndH1Anchors["economic_fcf", "LTM_Q2_27"] > 0, @table["CRM_net_strat", "ev"] / LtmCashFlowAndH1Anchors["economic_fcf", "LTM_Q2_27"], NA())',
      }),
      pe_fy1: null,
      pe_fy2: null,
      ltm_basis: "Net strat; econ FCF",
    },
    style: "subtotal",
  })

  const multCols = [
    "ev_rev",
    "ev_ebitda",
    "ev_adj_ebitda",
    "ev_ebitda_capex",
    "ev_fcf",
    "ev_fcf_sbc",
    "pe_fy1",
    "pe_fy2",
  ] as const

  const addPremDiscRow = (
    id: string,
    label: string,
    benchRow: "mature_median" | "all_peer_median"
  ): void => {
    const cells: Record<string, Cell | null | string> = {
      item: label,
      price: null,
      mkt_cap: null,
      ev: null,
      net_lev: null,
      gaap_om: null,
      sbc_pct: null,
      ltm_basis: "",
    }
    for (const c of multCols) {
      cells[c] = new Cell({
        expr: `@table["CRM", "${c}"] / @table["${benchRow}", "${c}"] - 1`,
        format: "percentage",
        decimals: 1,
      })
    }
    tradingComps.addRow(id, { cells })
  }

  addPremDiscRow(
    "crm_vs_mature_median",
    "CRM vs. mature low-SBC median",
    "mature_median"
  )
  addPremDiscRow(
    "crm_vs_all_median",
    "CRM vs. all-6 peer median",
    "all_peer_median"
  )

  // Table 2: Trading Comps Implied Valuation Cross-Check for Salesforce
  const compsImpliedValuation = sheet.addTable(
    "CompsImpliedValuation",
    "Peer Comparables Implied Valuation Cross-Check (CRM)",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except multiples and per-share) | Applies live peer multiples to standalone LTM Q2 FY27 metrics bridged via Q2 net debt & post-ASR shares",
        95
      ),
    }
  )
  compsImpliedValuation.addColumn("item", {
    role: "descriptor",
    header: "Multiple basis",
  })
  compsImpliedValuation.addColumn("crm_metric", {
    headers: ["CRM LTM", "($M)"],
    format: "currency",
    decimals: 0,
  })
  compsImpliedValuation.addColumn("mature_mult", {
    headers: ["Mature", "Mean"],
    group: "Peer Multiples",
    format: "multiple",
    decimals: 1,
  })
  compsImpliedValuation.addColumn("all6_mult", {
    headers: ["All-6", "Median"],
    group: "Peer Multiples",
    format: "multiple",
    decimals: 1,
  })
  compsImpliedValuation.addColumn("mature_ev", {
    headers: ["Mature", "($M)"],
    group: "Implied Op. EV ($M)",
    format: "currency",
    decimals: 0,
  })
  compsImpliedValuation.addColumn("all6_ev", {
    headers: ["All-6", "($M)"],
    group: "Implied Op. EV ($M)",
    format: "currency",
    decimals: 0,
  })
  compsImpliedValuation.addColumn("mature_px", {
    headers: ["Mature", "($/sh)"],
    group: "Implied Share Price",
    format: "currency",
    decimals: 2,
    shade: "muted",
  })
  compsImpliedValuation.addColumn("all6_px", {
    headers: ["All-6", "($/sh)"],
    group: "Implied Share Price",
    format: "currency",
    decimals: 2,
    shade: "muted",
  })

  const addCompValRow = (
    id: string,
    label: string,
    ltmTable: "LtmOperatingBridge" | "LtmCashFlowAndH1Anchors",
    ltmRow: string,
    compCol: string
  ): void => {
    compsImpliedValuation.addRow(id, {
      cells: {
        item: label,
        crm_metric: new Cell({
          expr: `${ltmTable}["${ltmRow}", "LTM_Q2_27"]`,
        }),
        mature_mult: new Cell({
          expr: `TradingCompsTable["mature_mean", "${compCol}"]`,
        }),
        all6_mult: new Cell({
          expr: `TradingCompsTable["all_peer_median", "${compCol}"]`,
        }),
        mature_ev: new Cell({
          expr: '@table[@row, "crm_metric"] * @table[@row, "mature_mult"]',
        }),
        all6_ev: new Cell({
          expr: '@table[@row, "crm_metric"] * @table[@row, "all6_mult"]',
        }),
        mature_px: new Cell({
          expr: '(@table[@row, "mature_ev"] + EvToEquityBridge["standalone_ltm_net_bridge", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
        }),
        all6_px: new Cell({
          expr: '(@table[@row, "all6_ev"] + EvToEquityBridge["standalone_ltm_net_bridge", "gordon"]) / EvToEquityBridge["pf_diluted_shares", "gordon"]',
        }),
      },
    })
  }

  addCompValRow(
    "ev_rev",
    "EV / LTM revenue",
    "LtmOperatingBridge",
    "total_revenue",
    "ev_rev"
  )
  addCompValRow(
    "ev_gaap_ebitda",
    "EV / LTM GAAP EBITDA",
    "LtmCashFlowAndH1Anchors",
    "gaap_ebitda",
    "ev_ebitda"
  )
  addCompValRow(
    "ev_adj_ebitda",
    "EV / LTM Adj. EBITDA (ex-SBC)",
    "LtmCashFlowAndH1Anchors",
    "adj_ebitda",
    "ev_adj_ebitda"
  )
  addCompValRow(
    "ev_fcf_sbc",
    "EV / LTM FCF less SBC (peer)",
    "LtmCashFlowAndH1Anchors",
    "fcf_ex_sbc",
    "ev_fcf_sbc"
  )

  compsImpliedValuation.addRowGutter()
  compsImpliedValuation.addSectionHeader("Implied trading comps price range")
  compsImpliedValuation.addRow("comps_min", {
    cells: {
      item: "Implied range — low",
      crm_metric: null,
      mature_mult: null,
      all6_mult: null,
      mature_ev: new Cell({
        expr: 'MIN(@table["ev_rev".."ev_fcf_sbc", "mature_ev"])',
      }),
      all6_ev: new Cell({
        expr: 'MIN(@table["ev_rev".."ev_fcf_sbc", "all6_ev"])',
      }),
      mature_px: new Cell({
        expr: 'MIN(@table["ev_rev".."ev_fcf_sbc", "mature_px"])',
      }),
      all6_px: new Cell({
        expr: 'MIN(@table["ev_rev".."ev_fcf_sbc", "all6_px"])',
      }),
    },
    style: "subtotal",
  })
  compsImpliedValuation.addRow("comps_median", {
    cells: {
      item: "Implied range — median",
      crm_metric: null,
      mature_mult: null,
      all6_mult: null,
      mature_ev: new Cell({
        expr: 'MEDIAN(@table["ev_rev".."ev_fcf_sbc", "mature_ev"])',
      }),
      all6_ev: new Cell({
        expr: 'MEDIAN(@table["ev_rev".."ev_fcf_sbc", "all6_ev"])',
      }),
      mature_px: new Cell({
        expr: 'MEDIAN(@table["ev_rev".."ev_fcf_sbc", "mature_px"])',
      }),
      all6_px: new Cell({
        expr: 'MEDIAN(@table["ev_rev".."ev_fcf_sbc", "all6_px"])',
      }),
    },
    style: "total",
  })
  compsImpliedValuation.addRow("comps_max", {
    cells: {
      item: "Implied range — high",
      crm_metric: null,
      mature_mult: null,
      all6_mult: null,
      mature_ev: new Cell({
        expr: 'MAX(@table["ev_rev".."ev_fcf_sbc", "mature_ev"])',
      }),
      all6_ev: new Cell({
        expr: 'MAX(@table["ev_rev".."ev_fcf_sbc", "all6_ev"])',
      }),
      mature_px: new Cell({
        expr: 'MAX(@table["ev_rev".."ev_fcf_sbc", "mature_px"])',
      }),
      all6_px: new Cell({
        expr: 'MAX(@table["ev_rev".."ev_fcf_sbc", "all6_px"])',
      }),
    },
    style: "subtotal",
  })

  compsImpliedValuation.addRowGutter()
  compsImpliedValuation.addSectionHeader("Memo: finance-lease-inclusive FCF")
  addCompValRow(
    "ev_econ_fcf_memo",
    "EV / LTM econ. FCF (w/ lease)",
    "LtmCashFlowAndH1Anchors",
    "economic_fcf",
    "ev_fcf_sbc"
  )

  return {
    tradingComps,
    compsImpliedValuation,
  }
}
