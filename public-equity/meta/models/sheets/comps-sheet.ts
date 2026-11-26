import { Cell, type Sheet } from "f8-engine"
import {
  PEER_DEFINITIONS,
  type AuditedModelData,
  type PeerDefinition,
} from "../kg-extractors.ts"
import { SCALE_NOTE_USD_M, VALUATION_AS_OF_DATE } from "../scale.ts"
import { exactFourRegimePriceExpr } from "./dcf-sheet.ts"

export function buildCompsSheet(
  sheet: Sheet,
  peerLtmDataSheet: Sheet,
  data: AuditedModelData
): void {
  // =========================================================================
  // 1. Two-Tier Trading Comparables Table
  // =========================================================================
  const comps = sheet.addTable(
    "TradingComps",
    "Comparable Public Companies — Two-Tier Valuation & Operating Benchmarks",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        `Prices & Nasdaq consensus EPS as of ${VALUATION_AS_OF_DATE}; US GAAP EV (excl. operating leases); peers on cover-page basic shares`,
        "LTM CapEx incl. finance lease principal (META, GOOGL, AMZN, MSFT); LTM ROIC uses 16.5% tax rate on LTM EBIT over ending financing IC",
      ],
    }
  )
  comps.addColumn("label", { role: "descriptor", header: "Company (Ticker)" })
  comps.addColumn("spot_px", { headers: ["Spot", "Price"], group: "Market" })
  comps.addColumn("mkt_cap", { headers: ["Market", "Cap"], group: "Market" })
  comps.addColumn("ev", { headers: ["Enterprise", "Value"], group: "Market" })
  comps.addColumn("ltm_rev", {
    headers: ["LTM", "Rev."],
    group: "LTM Operating Profile",
  })
  comps.addColumn("ytd_gr", {
    headers: ["YTD", "Growth"],
    group: "LTM Operating Profile",
  })
  comps.addColumn("ebit_mgn", {
    headers: ["EBIT", "Margin"],
    group: "LTM Operating Profile",
  })
  comps.addColumn("capex_pct", {
    headers: ["CapEx", "% Rev"],
    group: "LTM Operating Profile",
  })
  comps.addColumn("sbc_pct", {
    headers: ["SBC", "% Rev"],
    group: "LTM Operating Profile",
  })
  comps.addColumn("roic", {
    headers: ["LTM", "ROIC"],
    group: "LTM Operating Profile",
  })
  comps.addColumn("ev_ebitda", {
    headers: ["EV /", "EBITDA"],
    group: "EV Multiples (LTM)",
  })
  comps.addColumn("ev_ebit", {
    headers: ["EV /", "EBIT"],
    group: "EV Multiples (LTM)",
  })
  comps.addColumn("ev_ebitda_capex", {
    headers: ["EV /", "(EB−Cx)"],
    group: "EV Multiples (LTM)",
  })
  comps.addColumn("pe_fy1", {
    headers: ["CY26E", "P/E"],
    group: "Calendarized Consensus P/E",
  })
  comps.addColumn("pe_fy2", {
    headers: ["CY27E", "P/E"],
    group: "Calendarized Consensus P/E",
  })
  comps.addColumn("pe_fy3", {
    headers: ["CY28E", "P/E"],
    group: "Calendarized Consensus P/E",
  })

  const addPeerRow = (p: PeerDefinition): void => {
    const t = p.ticker
    const cells: Record<string, Cell | null> = {
      label: new Cell({ value: `${p.name} (${t})` }),
      spot_px: new Cell({
        expr: `PeerEvBridge["${t}", "spot_px"]`,
        format: "currency",
        decimals: 2,
      }),
      mkt_cap: new Cell({
        expr: `PeerEvBridge["${t}", "mkt_cap"]`,
        format: "currency",
        decimals: 0,
      }),
      ev: new Cell({
        expr: `PeerEvBridge["${t}", "ev"]`,
        format: "currency",
        decimals: 0,
      }),
      ltm_rev: new Cell({
        expr: `PeerLtmPnl["${t}", "ltm_rev"]`,
        format: "currency",
        decimals: 0,
      }),
      ytd_gr: new Cell({
        expr: `PeerLtmPnl["${t}", "ytd_rev_gr"]`,
        format: "percentage",
        decimals: 1,
      }),
      ebit_mgn: new Cell({
        expr: `PeerLtmPnl["${t}", "ltm_ebit"] / PeerLtmPnl["${t}", "ltm_rev"]`,
        format: "percentage",
        decimals: 1,
      }),
      capex_pct: new Cell({
        expr: `PeerLtmCapexSbc["${t}", "ltm_capex"] / PeerLtmPnl["${t}", "ltm_rev"]`,
        format: "percentage",
        decimals: 1,
      }),
      sbc_pct: new Cell({
        expr: `PeerLtmCapexSbc["${t}", "ltm_sbc"] / PeerLtmPnl["${t}", "ltm_rev"]`,
        format: "percentage",
        decimals: 1,
      }),
      roic: new Cell({
        expr: `IF(PeerEvBridge["${t}", "invested_capital"] > 0, PeerLtmPnl["${t}", "ltm_ebit"] * (1 - ScalarDrivers["effectiveTaxRate", "base"]) / PeerEvBridge["${t}", "invested_capital"], NA())`,
        format: "percentage",
        decimals: 1,
      }),
      ev_ebitda:
        t === "SNAP"
          ? new Cell({
              value: null,
              note: "Suppressed: near-zero LTM GAAP EBITDA ($61M) produces non-meaningful 140.7x multiple.",
            })
          : new Cell({
              expr: `IF(PeerLtmPnl["${t}", "ltm_ebitda"] > 0, PeerEvBridge["${t}", "ev"] / PeerLtmPnl["${t}", "ltm_ebitda"], NA())`,
              format: "multiple",
              decimals: 1,
              note:
                t === "GOOGL"
                  ? "Cash/securities include $75.2B locked-up SpaceX shares (17.4x EV/EBITDA excluding SpaceX cash credit)."
                  : undefined,
            }),
      ev_ebit:
        t === "SNAP"
          ? new Cell({
              value: null,
              note: "Suppressed: negative LTM GAAP operating income (-$119M).",
            })
          : new Cell({
              expr: `IF(PeerLtmPnl["${t}", "ltm_ebit"] > 0, PeerEvBridge["${t}", "ev"] / PeerLtmPnl["${t}", "ltm_ebit"], NA())`,
              format: "multiple",
              decimals: 1,
            }),
      ev_ebitda_capex:
        t === "AMZN" || t === "SNAP"
          ? new Cell({
              value: null,
              note:
                t === "AMZN"
                  ? "Suppressed: LTM CapEx (incl. finance lease principal) exceeds LTM EBITDA, yielding negative denominator."
                  : "Suppressed: negative LTM EBITDA less CapEx (-$146M).",
            })
          : new Cell({
              expr: `IF(PeerLtmCapexSbc["${t}", "ltm_ebitda_ex_capex"] > 0, PeerEvBridge["${t}", "ev"] / PeerLtmCapexSbc["${t}", "ltm_ebitda_ex_capex"], NA())`,
              format: "multiple",
              decimals: 1,
            }),
      pe_fy1:
        t === "SNAP"
          ? new Cell({
              value: null,
              note: "Suppressed: near-zero CY26E consensus EPS ($0.02) produces non-meaningful 227.5x multiple.",
            })
          : new Cell({
              expr: `IF(PeerConsensusEps["${t}", "eps_cy26"] > 0, PeerEvBridge["${t}", "spot_px"] / PeerConsensusEps["${t}", "eps_cy26"], NA())`,
              format: "multiple",
              decimals: 1,
              note:
                t === "GOOGL"
                  ? "Distorted low (13.4x) by $127.5B 9M26 non-operating SpaceX equity gains embedded in CY26E consensus EPS ($19.81 vs. $14.92 CY27E)."
                  : t === "MSFT"
                    ? "Calendarized 50/50 from audited FY26A ($17.95) and consensus FY27E ($19.91) = $18.93 CY26E EPS."
                    : undefined,
            }),
      pe_fy2: new Cell({
        expr: `IF(PeerConsensusEps["${t}", "eps_cy27"] > 0, PeerEvBridge["${t}", "spot_px"] / PeerConsensusEps["${t}", "eps_cy27"], NA())`,
        format: "multiple",
        decimals: 1,
        note:
          t === "MSFT"
            ? "Calendarized 50/50 from consensus FY27E ($19.91) and FY28E ($23.81) = $21.86 CY27E EPS."
            : undefined,
      }),
      pe_fy3: new Cell({
        expr: `IF(PeerConsensusEps["${t}", "eps_cy28"] > 0, PeerEvBridge["${t}", "spot_px"] / PeerConsensusEps["${t}", "eps_cy28"], NA())`,
        format: "multiple",
        decimals: 1,
        note:
          t === "MSFT"
            ? "Calendarized 50/50 from consensus FY28E ($23.81) and FY29E ($29.27) = $26.54 CY28E EPS."
            : undefined,
      }),
    }
    comps.addRow(t, { cells })
  }

  const addSummaryRow = (
    id: string,
    label: string,
    fn: "AVERAGE" | "MEDIAN",
    startRow: string,
    endRow: string
  ): void => {
    const r = `"${startRow}".."${endRow}"`
    comps.addRow(id, {
      cells: {
        label: new Cell({ value: label }),
        spot_px: null,
        mkt_cap: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "currency",
          decimals: 0,
        }),
        ev: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "currency",
          decimals: 0,
        }),
        ltm_rev: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "currency",
          decimals: 0,
        }),
        ytd_gr: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "percentage",
          decimals: 1,
        }),
        ebit_mgn: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "percentage",
          decimals: 1,
        }),
        capex_pct: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "percentage",
          decimals: 1,
        }),
        sbc_pct: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "percentage",
          decimals: 1,
        }),
        roic: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "percentage",
          decimals: 1,
        }),
        ev_ebitda: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "multiple",
          decimals: 1,
        }),
        ev_ebit: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "multiple",
          decimals: 1,
        }),
        ev_ebitda_capex: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "multiple",
          decimals: 1,
        }),
        pe_fy1: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "multiple",
          decimals: 1,
        }),
        pe_fy2: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "multiple",
          decimals: 1,
        }),
        pe_fy3: new Cell({
          expr: `${fn}(@table[${r}, @col])`,
          format: "multiple",
          decimals: 1,
        }),
      },
      style: fn === "MEDIAN" ? "bold" : "data",
      shade: fn === "MEDIAN" ? "alt" : undefined,
    })
  }

  comps.addSectionHeader(
    "Group A — Mega-Cap AI & Digital Advertising Platforms"
  )
  for (const p of PEER_DEFINITIONS.filter((x) => x.group === "A")) {
    addPeerRow(p)
  }
  addSummaryRow("group_a_mean", "Group A Mean", "AVERAGE", "GOOGL", "MSFT")
  addSummaryRow("group_a_median", "Group A Median", "MEDIAN", "GOOGL", "MSFT")

  comps.addRowGutter()
  comps.addSectionHeader("Group B — Pure-Play Social & Digital Ad Platforms")
  for (const p of PEER_DEFINITIONS.filter((x) => x.group === "B")) {
    addPeerRow(p)
  }
  addSummaryRow("group_b_mean", "Group B Mean", "AVERAGE", "PINS", "RDDT")
  addSummaryRow("group_b_median", "Group B Median", "MEDIAN", "PINS", "RDDT")

  comps.addRowGutter()
  comps.addSectionHeader(
    "Target company benchmark (pro forma diluted spot basis)"
  )
  comps.addRow("META", {
    cells: {
      label: new Cell({ value: "Meta Platforms (META — Clean)" }),
      spot_px: new Cell({
        expr: 'WaccBuild["spot_price", "val"]',
        format: "currency",
        decimals: 2,
      }),
      mkt_cap: new Cell({
        expr: 'WaccBuild["spot_mkt_cap", "val"]',
        format: "currency",
        decimals: 0,
      }),
      ev: new Cell({
        expr: 'DcfDilutionAndSpotAnchor["spot_pf_ev", "val"]',
        format: "currency",
        decimals: 0,
        note: "Pro forma diluted spot EV incl. fair-value legacy notes, Nov 2026 USD/EUR notes, METAM preferred, 46M forward sale, non-op equity ex-VIEs, escrow PV, elapsed Q4 burn & $19.9B accrued legal.",
      }),
      ltm_rev: new Cell({
        expr: 'IncomeStatement["revenue", "LTM Q3 26"]',
        format: "currency",
        decimals: 0,
      }),
      ytd_gr: new Cell({
        expr: 'IncomeStatement["revenue", "9M26A"] / IncomeStatement["revenue", "9M25A"] - 1',
        format: "percentage",
        decimals: 1,
      }),
      ebit_mgn: new Cell({
        expr: 'IncomeStatement["normalized_ebit", "LTM Q3 26"] / IncomeStatement["revenue", "LTM Q3 26"]',
        format: "percentage",
        decimals: 1,
      }),
      capex_pct: new Cell({
        expr: '-CashReconAndFcf["total_capex_outflow", "LTM Q3 26"] / IncomeStatement["revenue", "LTM Q3 26"]',
        format: "percentage",
        decimals: 1,
      }),
      sbc_pct: new Cell({
        expr: 'CashFlowStatement["share_based_compensation", "LTM Q3 26"] / IncomeStatement["revenue", "LTM Q3 26"]',
        format: "percentage",
        decimals: 1,
      }),
      roic: new Cell({
        expr: 'IncomeStatement["normalized_ebit", "LTM Q3 26"] * (1 - ScalarDrivers["effectiveTaxRate", "base"]) / (BalanceSheet["total_stockholders_equity", "Q3 26A"] + BalanceSheet["long_term_debt", "Q3 26A"] + DebtHybridShareSchedule["current_portion_lt_debt", "Q3 26A"] - BalanceSheet["total_cash_and_mkt_sec", "Q3 26A"])',
        format: "percentage",
        decimals: 1,
        note: "Peer-aligned Q3 2026 ending financing IC (Equity + Carrying Debt - Cash, ex-legal accruals) for apples-to-apples peer comparison.",
      }),
      ev_ebitda: new Cell({
        expr: 'DcfDilutionAndSpotAnchor["spot_pf_ev", "val"] / IncomeStatement["normalized_ebitda", "LTM Q3 26"]',
        format: "multiple",
        decimals: 1,
      }),
      ev_ebit: new Cell({
        expr: 'DcfDilutionAndSpotAnchor["spot_pf_ev", "val"] / IncomeStatement["normalized_ebit", "LTM Q3 26"]',
        format: "multiple",
        decimals: 1,
      }),
      ev_ebitda_capex: new Cell({
        expr: 'IF((IncomeStatement["normalized_ebitda", "LTM Q3 26"] + CashReconAndFcf["total_capex_outflow", "LTM Q3 26"]) > 0, DcfDilutionAndSpotAnchor["spot_pf_ev", "val"] / (IncomeStatement["normalized_ebitda", "LTM Q3 26"] + CashReconAndFcf["total_capex_outflow", "LTM Q3 26"]), NA())',
        format: "multiple",
        decimals: 1,
      }),
      pe_fy1: new Cell({
        expr: 'WaccBuild["spot_price", "val"] / IncomeStatement["consensus_eps", "2026E"]',
        format: "multiple",
        decimals: 1,
      }),
      pe_fy2: new Cell({
        expr: 'WaccBuild["spot_price", "val"] / IncomeStatement["consensus_eps", "2027E"]',
        format: "multiple",
        decimals: 1,
      }),
      pe_fy3: new Cell({
        expr: 'WaccBuild["spot_price", "val"] / IncomeStatement["consensus_eps", "2028E"]',
        format: "multiple",
        decimals: 1,
      }),
    },
    style: "bold",
    highlight: true,
  })

  // =========================================================================
  // 2. Implied Meta Valuation Cross-Check vs. Unlevered DCF
  // =========================================================================
  const xchk = sheet.addTable(
    "CompsImpliedValuation",
    "Implied META Valuation Cross-Check (Peer Medians vs. Unlevered DCF)",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Weighs Meta's faster LTM growth and higher EBIT margin against heavier CapEx intensity",
        "and absence of external cloud monetization relative to Alphabet, Microsoft & Amazon",
      ],
    }
  )
  xchk.addColumn("label", {
    role: "descriptor",
    header: "Benchmark Valuation Method",
  })
  xchk.addColumn("mult", { header: "Multiple" })
  xchk.addColumn("metric", { header: "META Value" })
  xchk.addColumn("implied_ev", { header: "Implied EV" })
  xchk.addColumn("implied_px", { header: "Implied Px" })
  xchk.addColumn("vs_spot", { header: "vs. Spot" })
  xchk.addColumn("notes", { role: "descriptor", header: "Notes" })

  xchk.addSectionHeader("Group A (Mega-Cap AI & Ads) & Group B cross-checks")

  const evToPxExpr = exactFourRegimePriceExpr('@table[@row, "implied_ev"]')

  xchk.addRow("grp_a_ev_ebitda", {
    cells: {
      label: new Cell({ value: "Group A EV / LTM EBITDA × META" }),
      mult: new Cell({
        expr: 'TradingComps["group_a_median", "ev_ebitda"]',
        format: "multiple",
        decimals: 1,
      }),
      metric: new Cell({
        expr: 'IncomeStatement["normalized_ebitda", "LTM Q3 26"]',
        format: "currency",
        decimals: 0,
      }),
      implied_ev: new Cell({
        expr: '@table[@row, "mult"] * @table[@row, "metric"]',
        format: "currency",
        decimals: 0,
      }),
      implied_px: new Cell({
        expr: evToPxExpr,
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_px"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Excludes Meta's higher CapEx-to-EBITDA burden",
    },
  })

  xchk.addRow("grp_a_ev_ebit", {
    cells: {
      label: new Cell({ value: "Group A EV / LTM EBIT × META" }),
      mult: new Cell({
        expr: 'TradingComps["group_a_median", "ev_ebit"]',
        format: "multiple",
        decimals: 1,
      }),
      metric: new Cell({
        expr: 'IncomeStatement["normalized_ebit", "LTM Q3 26"]',
        format: "currency",
        decimals: 0,
      }),
      implied_ev: new Cell({
        expr: '@table[@row, "mult"] * @table[@row, "metric"]',
        format: "currency",
        decimals: 0,
      }),
      implied_px: new Cell({
        expr: evToPxExpr,
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_px"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Captures current D&A but precedes FY27E–FY31E D&A ramp",
    },
  })

  xchk.addRow("grp_a_pe_fy2", {
    cells: {
      label: new Cell({ value: "Group A CY27E P/E × FY27E Cons." }),
      mult: new Cell({
        expr: 'TradingComps["group_a_median", "pe_fy2"]',
        format: "multiple",
        decimals: 1,
      }),
      metric: new Cell({
        expr: 'IncomeStatement["consensus_eps", "2027E"]',
        format: "currency",
        decimals: 2,
      }),
      implied_ev: null,
      implied_px: new Cell({
        expr: '@table[@row, "mult"] * @table[@row, "metric"]',
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_px"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Calendarized (MSFT 50/50) on $33.92 FY27E cons. EPS",
    },
  })

  xchk.addRow("grp_b_pe_fy2", {
    cells: {
      label: new Cell({ value: "Group B CY27E P/E × FY27E Cons." }),
      mult: new Cell({
        expr: 'TradingComps["group_b_median", "pe_fy2"]',
        format: "multiple",
        decimals: 1,
      }),
      metric: new Cell({
        expr: 'IncomeStatement["consensus_eps", "2027E"]',
        format: "currency",
        decimals: 2,
      }),
      implied_ev: null,
      implied_px: new Cell({
        expr: '@table[@row, "mult"] * @table[@row, "metric"]',
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: '@table[@row, "implied_px"] / WaccBuild["spot_price", "val"] - 1',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Pure-play social peer median on $33.92 FY27E consensus",
    },
  })

  xchk.addRow("active_dcf_ref", {
    cells: {
      label: new Cell({ value: "Active unlevered economic DCF" }),
      mult: new Cell({
        expr: 'DcfBridge["implied_ev", "val"] / IncomeStatement["normalized_ebitda", "LTM Q3 26"]',
        format: "multiple",
        decimals: 1,
      }),
      metric: new Cell({
        expr: 'IncomeStatement["normalized_ebitda", "LTM Q3 26"]',
        format: "currency",
        decimals: 0,
      }),
      implied_ev: new Cell({
        expr: 'DcfBridge["implied_ev", "val"]',
        format: "currency",
        decimals: 0,
      }),
      implied_px: new Cell({
        expr: 'DcfBridge["implied_share_price", "val"]',
        format: "currency",
        decimals: 2,
      }),
      vs_spot: new Cell({
        expr: 'DcfBridge["upside_downside_vs_spot", "val"]',
        format: "percentage",
        decimals: 1,
      }),
      notes: "Fully burdened for SBC, CapEx & pro forma dilution",
    },
    style: "bold",
    highlight: true,
  })

  // =========================================================================
  // 3. Peer LTM Calendarization & EV Bridge (4 Cohesive Stacked Tables)
  // =========================================================================
  const peerEv = peerLtmDataSheet.addTable(
    "PeerEvBridge",
    "Peer Market Capitalization, Balance Sheet & Enterprise Value Bridge",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        `Audited SEC Form 10-K / Form 10-Q balance sheet components; market prices as of ${VALUATION_AS_OF_DATE}`,
      ],
    }
  )
  peerEv.addColumn("label", { role: "descriptor", header: "Peer" })
  peerEv.addColumn("spot_px", { headers: ["Spot", "Px"], group: "Market Cap" })
  peerEv.addColumn("shares", {
    headers: ["Shares", "(M)"],
    group: "Market Cap",
  })
  peerEv.addColumn("mkt_cap", {
    headers: ["Market", "Cap"],
    group: "Market Cap",
  })
  peerEv.addColumn("cash", {
    headers: ["Cash &", "Equiv."],
    group: "Cash & Sec.",
  })
  peerEv.addColumn("mkt_sec", {
    headers: ["Mkt.", "Sec."],
    group: "Cash & Sec.",
  })
  peerEv.addColumn("ltd", {
    headers: ["LT", "Debt"],
    group: "Debt & Finance Leases",
  })
  peerEv.addColumn("ltd_cur", {
    headers: ["Cur. LT", "Debt"],
    group: "Debt & Finance Leases",
  })
  peerEv.addColumn("st_debt", {
    headers: ["ST", "Debt"],
    group: "Debt & Finance Leases",
  })
  peerEv.addColumn("fl_cur", {
    headers: ["Fin. Lse", "Cur."],
    group: "Debt & Finance Leases",
  })
  peerEv.addColumn("fl_nc", {
    headers: ["Fin. Lse", "Non-Cur."],
    group: "Debt & Finance Leases",
  })
  peerEv.addColumn("pref", {
    headers: ["Pref.", "Stock"],
    group: "Debt & Finance Leases",
  })
  peerEv.addColumn("equity", {
    headers: ["Book", "Equity"],
    group: "Valuation Bridge",
  })
  peerEv.addColumn("invested_capital", {
    headers: ["Invested", "Capital"],
    group: "Valuation Bridge",
  })
  peerEv.addColumn("ev", {
    headers: ["Ent.", "Value"],
    group: "Valuation Bridge",
    style: "bold",
  })

  const peerPnl = peerLtmDataSheet.addTable(
    "PeerLtmPnl",
    "Peer LTM Q3 2026 Calendarized Revenue, EBIT & EBITDA Bridge",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Audited SEC Form 10-K / Form 10-Q; LTM = FY + current YTD − prior YTD (MSFT Jun 30 FYE: FY26 + Q1 FY27 − Q1 FY26)",
      ],
    }
  )
  peerPnl.addColumn("label", { role: "descriptor", header: "Peer" })
  peerPnl.addColumn("rev_fy", { headers: ["Rev", "FY"], group: "LTM Revenue" })
  peerPnl.addColumn("rev_ytd1", {
    headers: ["Rev", "YTD 1"],
    group: "LTM Revenue",
  })
  peerPnl.addColumn("rev_ytd0", {
    headers: ["Rev", "YTD 0"],
    group: "LTM Revenue",
  })
  peerPnl.addColumn("ltm_rev", {
    headers: ["LTM", "Rev"],
    group: "LTM Revenue",
    style: "bold",
  })
  peerPnl.addColumn("ytd_rev_gr", {
    headers: ["YTD", "Growth"],
    group: "LTM Revenue",
  })
  peerPnl.addColumn("ebit_fy", { headers: ["EBIT", "FY"], group: "LTM EBIT" })
  peerPnl.addColumn("ebit_ytd1", {
    headers: ["EBIT", "YTD 1"],
    group: "LTM EBIT",
  })
  peerPnl.addColumn("ebit_ytd0", {
    headers: ["EBIT", "YTD 0"],
    group: "LTM EBIT",
  })
  peerPnl.addColumn("ltm_ebit", {
    headers: ["LTM", "EBIT"],
    group: "LTM EBIT",
    style: "bold",
  })
  peerPnl.addColumn("da_fy", {
    headers: ["D&A", "FY"],
    group: "LTM D&A & EBITDA",
  })
  peerPnl.addColumn("da_ytd1", {
    headers: ["D&A", "YTD 1"],
    group: "LTM D&A & EBITDA",
  })
  peerPnl.addColumn("da_ytd0", {
    headers: ["D&A", "YTD 0"],
    group: "LTM D&A & EBITDA",
  })
  peerPnl.addColumn("ltm_da", {
    headers: ["LTM", "D&A"],
    group: "LTM D&A & EBITDA",
  })
  peerPnl.addColumn("ltm_ebitda", {
    headers: ["LTM", "EBITDA"],
    group: "LTM D&A & EBITDA",
    style: "bold",
  })

  const peerCapexSbc = peerLtmDataSheet.addTable(
    "PeerLtmCapexSbc",
    "Peer LTM Q3 2026 CapEx, Finance Lease & Share-Based Compensation Bridge",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "LTM CapEx includes cash PP&E purchases and finance lease principal; EBITDA − CapEx links to LTM P&L",
      ],
    }
  )
  peerCapexSbc.addColumn("label", { role: "descriptor", header: "Peer" })
  peerCapexSbc.addColumn("cx_fy", {
    headers: ["PP&E", "FY"],
    group: "Cash PP&E CapEx",
  })
  peerCapexSbc.addColumn("cx_ytd1", {
    headers: ["PP&E", "YTD 1"],
    group: "Cash PP&E CapEx",
  })
  peerCapexSbc.addColumn("cx_ytd0", {
    headers: ["PP&E", "YTD 0"],
    group: "Cash PP&E CapEx",
  })
  peerCapexSbc.addColumn("flp_fy", {
    headers: ["Fin. Lse", "FY"],
    group: "Finance Lease Principal",
  })
  peerCapexSbc.addColumn("flp_ytd1", {
    headers: ["Fin. Lse", "YTD 1"],
    group: "Finance Lease Principal",
  })
  peerCapexSbc.addColumn("flp_ytd0", {
    headers: ["Fin. Lse", "YTD 0"],
    group: "Finance Lease Principal",
  })
  peerCapexSbc.addColumn("ltm_flp", {
    headers: ["LTM", "Fin. Lse"],
    group: "Finance Lease Principal",
  })
  peerCapexSbc.addColumn("ltm_capex", {
    headers: ["LTM", "CapEx"],
    group: "LTM CapEx & CF",
  })
  peerCapexSbc.addColumn("ltm_ebitda_ex_capex", {
    headers: ["EBITDA", "− CapEx"],
    group: "LTM CapEx & CF",
  })
  peerCapexSbc.addColumn("sbc_fy", {
    headers: ["SBC", "FY"],
    group: "Share-Based Comp.",
  })
  peerCapexSbc.addColumn("sbc_ytd1", {
    headers: ["SBC", "YTD 1"],
    group: "Share-Based Comp.",
  })
  peerCapexSbc.addColumn("sbc_ytd0", {
    headers: ["SBC", "YTD 0"],
    group: "Share-Based Comp.",
  })
  peerCapexSbc.addColumn("ltm_sbc", {
    headers: ["LTM", "SBC"],
    group: "Share-Based Comp.",
  })

  const peerEps = peerLtmDataSheet.addTable(
    "PeerConsensusEps",
    "Peer Consensus Diluted EPS & Calendarization Bridge",
    {
      subtitle: [
        `Nasdaq analyst consensus EPS as of ${VALUATION_AS_OF_DATE} ($/share)`,
        "MSFT Jun 30 FYE calendarized 50/50 across adjacent fiscal years",
      ],
    }
  )
  peerEps.addColumn("label", { role: "descriptor", header: "Peer" })
  peerEps.addColumn("eps_fy0", {
    headers: ["EPS", "FY0A"],
    group: "Fiscal Year EPS",
  })
  peerEps.addColumn("eps_fy1", {
    headers: ["EPS", "FY1"],
    group: "Fiscal Year EPS",
  })
  peerEps.addColumn("eps_fy2", {
    headers: ["EPS", "FY2"],
    group: "Fiscal Year EPS",
  })
  peerEps.addColumn("eps_fy3", {
    headers: ["EPS", "FY3"],
    group: "Fiscal Year EPS",
  })
  peerEps.addColumn("eps_cy26", {
    headers: ["CY26E", "EPS"],
    group: "Calendarized EPS",
  })
  peerEps.addColumn("eps_cy27", {
    headers: ["CY27E", "EPS"],
    group: "Calendarized EPS",
  })
  peerEps.addColumn("eps_cy28", {
    headers: ["CY28E", "EPS"],
    group: "Calendarized EPS",
  })

  for (const p of PEER_DEFINITIONS) {
    const t = p.ticker
    const v = (sched: string, row: string, period: string): number =>
      data.val(sched, row, period, { entity: t })
    const z = (sched: string, row: string, period: string): number =>
      data.zeroIfAbsent(sched, row, period, { entity: t })
    const flpVal = (period: string): number =>
      p.flpSchedule !== null && p.flpRowId !== null
        ? v(p.flpSchedule, p.flpRowId, period)
        : 0

    peerEv.addRow(t, {
      cells: {
        label: new Cell({ value: t }),
        spot_px: new Cell({
          value: v("market_spot_prices", "spot_price", "2026-11-20"),
          format: "currency",
          decimals: 2,
        }),
        shares: new Cell({
          value: v(
            "peer_balance_sheet",
            "common_shares_outstanding",
            p.bsPeriod
          ),
          format: "number",
          decimals: 1,
        }),
        mkt_cap: new Cell({
          expr: '@table[@row, "spot_px"] * @table[@row, "shares"]',
          format: "currency",
          decimals: 0,
        }),
        cash: new Cell({
          value: v("peer_balance_sheet", "cash_and_equivalents", p.bsPeriod),
          format: "currency",
          decimals: 0,
        }),
        mkt_sec: new Cell({
          value: z("peer_balance_sheet", "marketable_securities", p.bsPeriod),
          format: "currency",
          decimals: 0,
          note:
            t === "GOOGL"
              ? "Includes $75.2B locked-up SpaceX marketable equity securities."
              : undefined,
        }),
        ltd: new Cell({
          value: z("peer_balance_sheet", "long_term_debt", p.bsPeriod),
          format: "currency",
          decimals: 0,
        }),
        ltd_cur: new Cell({
          value: z("peer_balance_sheet", "long_term_debt_current", p.bsPeriod),
          format: "currency",
          decimals: 0,
        }),
        st_debt: new Cell({
          value: z("peer_balance_sheet", "short_term_debt", p.bsPeriod),
          format: "currency",
          decimals: 0,
        }),
        fl_cur: new Cell({
          value: z(
            "peer_balance_sheet",
            "finance_lease_liabilities_current",
            p.bsPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        fl_nc: new Cell({
          value: z(
            "peer_balance_sheet",
            "finance_lease_liabilities_noncurrent",
            p.bsPeriod
          ),
          format: "currency",
          decimals: 0,
          note:
            t === "AMZN"
              ? "Excludes $9.73B non-debt financing obligations per Form 10-Q Note 4."
              : undefined,
        }),
        pref: new Cell({
          value: z("peer_balance_sheet", "preferred_stock", p.bsPeriod),
          format: "currency",
          decimals: 0,
        }),
        equity: new Cell({
          value: v(
            "peer_balance_sheet",
            "total_stockholders_equity",
            p.bsPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        invested_capital: new Cell({
          expr: 'SUM(@table[@row, "ltd".."pref"]) + @table[@row, "equity"] - @table[@row, "cash"] - @table[@row, "mkt_sec"]',
          format: "currency",
          decimals: 0,
        }),
        ev: new Cell({
          expr: '@table[@row, "mkt_cap"] + SUM(@table[@row, "ltd".."pref"]) - @table[@row, "cash"] - @table[@row, "mkt_sec"]',
          format: "currency",
          decimals: 0,
        }),
      },
    })

    peerPnl.addRow(t, {
      cells: {
        label: new Cell({ value: t }),
        rev_fy: new Cell({
          value: v("peer_income_statement", "revenue", p.fyPeriod),
          format: "currency",
          decimals: 0,
        }),
        rev_ytd1: new Cell({
          value: v("peer_income_statement", "revenue", p.ytdCurrentPeriod),
          format: "currency",
          decimals: 0,
        }),
        rev_ytd0: new Cell({
          value: v("peer_income_statement", "revenue", p.ytdPriorPeriod),
          format: "currency",
          decimals: 0,
        }),
        ltm_rev: new Cell({
          expr: '@table[@row, "rev_fy"] + @table[@row, "rev_ytd1"] - @table[@row, "rev_ytd0"]',
          format: "currency",
          decimals: 0,
        }),
        ytd_rev_gr: new Cell({
          expr: '@table[@row, "rev_ytd1"] / @table[@row, "rev_ytd0"] - 1',
          format: "percentage",
          decimals: 1,
        }),
        ebit_fy: new Cell({
          value: v("peer_income_statement", "operating_income", p.fyPeriod),
          format: "currency",
          decimals: 0,
        }),
        ebit_ytd1: new Cell({
          value: v(
            "peer_income_statement",
            "operating_income",
            p.ytdCurrentPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        ebit_ytd0: new Cell({
          value: v(
            "peer_income_statement",
            "operating_income",
            p.ytdPriorPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        ltm_ebit: new Cell({
          expr: '@table[@row, "ebit_fy"] + @table[@row, "ebit_ytd1"] - @table[@row, "ebit_ytd0"]',
          format: "currency",
          decimals: 0,
        }),
        da_fy: new Cell({
          value: v(
            "peer_cash_flow",
            "depreciation_and_amortization",
            p.fyPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        da_ytd1: new Cell({
          value: v(
            "peer_cash_flow",
            "depreciation_and_amortization",
            p.ytdCurrentPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        da_ytd0: new Cell({
          value: v(
            "peer_cash_flow",
            "depreciation_and_amortization",
            p.ytdPriorPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        ltm_da: new Cell({
          expr: '@table[@row, "da_fy"] + @table[@row, "da_ytd1"] - @table[@row, "da_ytd0"]',
          format: "currency",
          decimals: 0,
        }),
        ltm_ebitda: new Cell({
          expr: '@table[@row, "ltm_ebit"] + @table[@row, "ltm_da"]',
          format: "currency",
          decimals: 0,
        }),
      },
    })

    peerCapexSbc.addRow(t, {
      cells: {
        label: new Cell({ value: t }),
        cx_fy: new Cell({
          value: v("peer_cash_flow", "capex_ppe", p.fyPeriod),
          format: "currency",
          decimals: 0,
        }),
        cx_ytd1: new Cell({
          value: v("peer_cash_flow", "capex_ppe", p.ytdCurrentPeriod),
          format: "currency",
          decimals: 0,
        }),
        cx_ytd0: new Cell({
          value: v("peer_cash_flow", "capex_ppe", p.ytdPriorPeriod),
          format: "currency",
          decimals: 0,
        }),
        flp_fy: new Cell({
          value: flpVal(p.fyPeriod),
          format: "currency",
          decimals: 0,
        }),
        flp_ytd1: new Cell({
          value: flpVal(p.ytdCurrentPeriod),
          format: "currency",
          decimals: 0,
        }),
        flp_ytd0: new Cell({
          value: flpVal(p.ytdPriorPeriod),
          format: "currency",
          decimals: 0,
        }),
        ltm_flp: new Cell({
          expr: 'ABS(@table[@row, "flp_fy"] + @table[@row, "flp_ytd1"] - @table[@row, "flp_ytd0"])',
          format: "currency",
          decimals: 0,
        }),
        ltm_capex: new Cell({
          expr: '-(@table[@row, "cx_fy"] + @table[@row, "cx_ytd1"] - @table[@row, "cx_ytd0"]) + @table[@row, "ltm_flp"]',
          format: "currency",
          decimals: 0,
        }),
        ltm_ebitda_ex_capex: new Cell({
          expr: 'PeerLtmPnl[@row, "ltm_ebitda"] - @table[@row, "ltm_capex"]',
          format: "currency",
          decimals: 0,
        }),
        sbc_fy: new Cell({
          value: v("peer_cash_flow", "share_based_compensation", p.fyPeriod),
          format: "currency",
          decimals: 0,
        }),
        sbc_ytd1: new Cell({
          value: v(
            "peer_cash_flow",
            "share_based_compensation",
            p.ytdCurrentPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        sbc_ytd0: new Cell({
          value: v(
            "peer_cash_flow",
            "share_based_compensation",
            p.ytdPriorPeriod
          ),
          format: "currency",
          decimals: 0,
        }),
        ltm_sbc: new Cell({
          expr: '@table[@row, "sbc_fy"] + @table[@row, "sbc_ytd1"] - @table[@row, "sbc_ytd0"]',
          format: "currency",
          decimals: 0,
        }),
      },
    })

    peerEps.addRow(t, {
      cells: {
        label: new Cell({ value: t }),
        eps_fy0:
          p.epsFy0Period !== null
            ? new Cell({
                value: v(
                  "peer_income_statement",
                  "eps_diluted",
                  p.epsFy0Period
                ),
                format: "currency",
                decimals: 2,
              })
            : null,
        eps_fy1: new Cell({
          value: v("consensus_eps", "consensus_eps", p.epsFy1Period),
          format: "currency",
          decimals: 2,
        }),
        eps_fy2: new Cell({
          value: v("consensus_eps", "consensus_eps", p.epsFy2Period),
          format: "currency",
          decimals: 2,
        }),
        eps_fy3: new Cell({
          value: v("consensus_eps", "consensus_eps", p.epsFy3Period),
          format: "currency",
          decimals: 2,
        }),
        eps_cy26: new Cell({
          expr:
            p.epsFy0Period !== null
              ? '0.5 * @table[@row, "eps_fy0"] + 0.5 * @table[@row, "eps_fy1"]'
              : '@table[@row, "eps_fy1"]',
          format: "currency",
          decimals: 2,
          note:
            t === "MSFT"
              ? "Jun 30 FYE calendarized 50/50 from audited FY26A and consensus FY27E."
              : undefined,
        }),
        eps_cy27: new Cell({
          expr:
            p.epsFy0Period !== null
              ? '0.5 * @table[@row, "eps_fy1"] + 0.5 * @table[@row, "eps_fy2"]'
              : '@table[@row, "eps_fy2"]',
          format: "currency",
          decimals: 2,
        }),
        eps_cy28: new Cell({
          expr:
            p.epsFy0Period !== null
              ? '0.5 * @table[@row, "eps_fy2"] + 0.5 * @table[@row, "eps_fy3"]'
              : '@table[@row, "eps_fy3"]',
          format: "currency",
          decimals: 2,
        }),
      },
    })
  }

  peerLtmDataSheet.setBands([
    peerEv,
    peerPnl,
    { lanes: [peerCapexSbc], pageBreakBefore: true },
    peerEps,
  ])
}
