import { Cell, type Sheet } from "f8-engine"
import {
  PEER_ENTITIES,
  type BoeingKgData,
  type PeerEntity,
} from "../kg-loader.ts"

const PEER_ROW_ID: Readonly<Record<PeerEntity, string>> = Object.freeze({
  "AIR.PA": "air_pa",
  GE: "ge",
  RTX: "rtx",
  GD: "gd",
  LMT: "lmt",
  NOC: "noc",
})

const PEER_BETA_COL: Readonly<Record<PeerEntity, string>> = Object.freeze({
  "AIR.PA": "AIR_PA",
  GE: "GE",
  RTX: "RTX",
  GD: "GD",
  LMT: "LMT",
  NOC: "NOC",
})

const PEER_SHORT_COHORT: Readonly<Record<PeerEntity, string>> = Object.freeze({
  "AIR.PA": "Comm./Hyb.",
  GE: "Comm./Hyb.",
  RTX: "Comm./Hyb.",
  GD: "Comm./Hyb.",
  LMT: "Defense",
  NOC: "Defense",
})

const PEER_BETA_BASIS: Readonly<Record<PeerEntity, string>> = Object.freeze({
  "AIR.PA": "IFRS 16 D/E; commercial airframe benchmark",
  GE: "Ex-Insurance gross debt & market equity",
  RTX: "US GAAP operating-rent basis (ex-op leases)",
  GD: "US GAAP op-rent + $392M YE25 finance leases",
  LMT: "US GAAP operating-rent basis (ex-op leases)",
  NOC: "US GAAP operating-rent basis (ex-op leases)",
})

export function buildCompsSheet(sheet: Sheet, kg: BoeingKgData): void {
  const { market, peers, airbusIfrs } = kg

  // =========================================================================
  // BAND 1: TradingComps (Primary Peer Group Valuation & Operating Multiples)
  // =========================================================================
  const comps = sheet.addTable(
    "TradingComps",
    "Aerospace & Defense Trading Comparables (As of November 20, 2026)",
    {
      subtitle:
        "($ in millions USD) | US peers & BA on US GAAP operating-rent basis; AIR.PA primary basis as-reported IFRS 16; Means/Medians exclude BA & US-GAAP memo",
    }
  )
  comps.addColumn("company", { role: "descriptor", headers: ["Company"] })
  comps.addColumn("cohort", { role: "descriptor", headers: ["Cohort"] })
  comps.addColumn("ev_usd", {
    headers: ["EV", "($M)"],
    format: "currency",
    decimals: 0,
  })
  comps.addColumn("ltm_ebit_mgn", {
    group: "LTM Margins",
    headers: ["EBIT", "Margin"],
    format: "percentage",
    decimals: 1,
  })
  comps.addColumn("ltm_ebitda_mgn", {
    group: "LTM Margins",
    headers: ["EBITDA", "Margin"],
    format: "percentage",
    decimals: 1,
  })
  comps.addColumn("ev_ltm_ebitda", {
    group: "LTM Multiples",
    headers: ["EV /", "EBITDA"],
    format: "multiple",
    decimals: 1,
  })
  comps.addColumn("ev_ltm_ebit", {
    group: "LTM Multiples",
    headers: ["EV /", "EBIT"],
    format: "multiple",
    decimals: 1,
  })
  comps.addColumn("ev_fy26_rev", {
    group: "Forward Consensus",
    headers: ["EV /", "26E Rev"],
    format: "multiple",
    decimals: 2,
  })
  comps.addColumn("ev_fy27_rev", {
    group: "Forward Consensus",
    headers: ["EV /", "27E Rev"],
    format: "multiple",
    decimals: 2,
  })
  comps.addColumn("ev_fy26_ebit", {
    group: "Forward Consensus",
    headers: ["EV /", "26E EBIT"],
    format: "multiple",
    decimals: 1,
  })
  comps.addColumn("pe_fy26", {
    group: "Forward Consensus",
    headers: ["P / E", "FY26E"],
    format: "multiple",
    decimals: 1,
  })
  comps.addColumn("pe_fy27", {
    group: "Forward Consensus",
    headers: ["P / E", "FY27E"],
    format: "multiple",
    decimals: 1,
  })
  comps.addColumn("p_fy26_fcf", {
    group: "Forward Consensus",
    headers: ["P / FCF", "FY26E"],
    format: "multiple",
    decimals: 1,
  })

  comps.addSectionHeader(
    "Comparable peer set (Commercial / Hybrid & Defense Primes)"
  )
  for (const ent of PEER_ENTITIES) {
    const p = peers[ent]
    const pid = PEER_ROW_ID[ent]
    const fxRef = `PeerEvBridge["${pid}", "fx"]`
    comps.addRow(pid, {
      cells: {
        company: `${p.name} (${ent})`,
        cohort: PEER_SHORT_COHORT[ent],
        ev_usd: new Cell({ expr: `PeerEvBridge["${pid}", "ev_usd"]` }),
        ltm_ebit_mgn: new Cell({
          expr: `PeerLtmBridge["${pid}_ebit", "ltm_usd"] / PeerLtmBridge["${pid}_rev", "ltm_usd"]`,
        }),
        ltm_ebitda_mgn: new Cell({
          expr: `PeerLtmBridge["${pid}_ebitda", "ltm_usd"] / PeerLtmBridge["${pid}_rev", "ltm_usd"]`,
        }),
        ev_ltm_ebitda: new Cell({
          expr: `IF(PeerLtmBridge["${pid}_ebitda", "ltm_usd"] > 0, @table[@row, "ev_usd"] / PeerLtmBridge["${pid}_ebitda", "ltm_usd"], NA())`,
        }),
        ev_ltm_ebit: new Cell({
          expr: `IF(PeerLtmBridge["${pid}_ebit", "ltm_usd"] > 0, @table[@row, "ev_usd"] / PeerLtmBridge["${pid}_ebit", "ltm_usd"], NA())`,
        }),
        ev_fy26_rev: new Cell({
          expr: `@table[@row, "ev_usd"] / (PeerConsensusInputs["${pid}", "rev_26e"] * ${fxRef})`,
        }),
        ev_fy27_rev: new Cell({
          expr: `@table[@row, "ev_usd"] / (PeerConsensusInputs["${pid}", "rev_27e"] * ${fxRef})`,
        }),
        ev_fy26_ebit: new Cell({
          expr: `IF(PeerConsensusInputs["${pid}", "ebit_26e"] > 0, @table[@row, "ev_usd"] / (PeerConsensusInputs["${pid}", "ebit_26e"] * ${fxRef}), NA())`,
        }),
        pe_fy26: new Cell({
          expr: `IF(PeerConsensusInputs["${pid}", "eps_26e"] > 0, PeerEvBridge["${pid}", "spot_px"] / PeerConsensusInputs["${pid}", "eps_26e"], NA())`,
        }),
        pe_fy27: new Cell({
          expr: `IF(PeerConsensusInputs["${pid}", "eps_27e"] > 0, PeerEvBridge["${pid}", "spot_px"] / PeerConsensusInputs["${pid}", "eps_27e"], NA())`,
        }),
        p_fy26_fcf: new Cell({
          expr: `IF(PeerConsensusInputs["${pid}", "fcf_26e"] > 0, PeerEvBridge["${pid}", "mkt_cap_usd"] / (PeerConsensusInputs["${pid}", "fcf_26e"] * ${fxRef}), NA())`,
        }),
      },
    })
  }

  comps.addRowGutter()
  comps.addSectionHeader("Peer cohort summary statistics (excluding BA)")
  comps.addRow("comm_mean", {
    cells: { company: "Commercial / Hybrid — Mean", cohort: "4 peers" },
    expr: `AVERAGE(@table["air_pa".."gd", @col])`,
    style: "subtotal",
  })
  comps.addRow("comm_median", {
    cells: { company: "Commercial / Hybrid — Median", cohort: "4 peers" },
    expr: `MEDIAN(@table["air_pa".."gd", @col])`,
  })
  comps.addRow("def_mean", {
    cells: { company: "Defense Primes — Mean", cohort: "2 peers" },
    expr: `AVERAGE(@table["lmt".."noc", @col])`,
    style: "subtotal",
  })
  comps.addRow("all_mean", {
    cells: { company: "All 6 Peers — Mean", cohort: "6 peers" },
    expr: `AVERAGE(@table["air_pa".."noc", @col])`,
    style: "subtotal",
  })
  comps.addRow("all_median", {
    cells: { company: "All 6 Peers — Median", cohort: "6 peers" },
    expr: `MEDIAN(@table["air_pa".."noc", @col])`,
    style: "bold",
  })

  comps.addRowGutter()
  comps.addSectionHeader("Parity cross-check & subject company")
  comps.addRow("air_pa_usgaap", {
    cells: {
      company: "Airbus SE (US-GAAP Parity Memo)",
      cohort: "US-GAAP",
      ev_usd: new Cell({
        expr: `PeerEvBridge["air_pa", "ev_usd"] - PeerEvComponents["ifrs16_leases_eur", "air_pa"] * CompsFxParity["eurusd_spot", "val"]`,
        note: "Symmetric US-GAAP operating-rent cross-check: strips €2,387M ($2,618M) IFRS 16 lease liabilities from EV and reverses IAS 38 R&D + IFRS 16 rent in EBIT/EBITDA; excluded from peer means.",
      }),
      ltm_ebit_mgn: new Cell({
        expr: `PeerLtmBridge["air_usgaap_ebit", "ltm_usd"] / PeerLtmBridge["air_pa_rev", "ltm_usd"]`,
      }),
      ltm_ebitda_mgn: new Cell({
        expr: `PeerLtmBridge["air_usgaap_ebitda", "ltm_usd"] / PeerLtmBridge["air_pa_rev", "ltm_usd"]`,
      }),
      ev_ltm_ebitda: new Cell({
        expr: `@table[@row, "ev_usd"] / PeerLtmBridge["air_usgaap_ebitda", "ltm_usd"]`,
      }),
      ev_ltm_ebit: new Cell({
        expr: `@table[@row, "ev_usd"] / PeerLtmBridge["air_usgaap_ebit", "ltm_usd"]`,
      }),
      ev_fy26_rev: null,
      ev_fy27_rev: null,
      ev_fy26_ebit: null,
      pe_fy26: null,
      pe_fy27: null,
      p_fy26_fcf: null,
    },
  })
  comps.addRow("ba_subject", {
    cells: {
      company: "The Boeing Company (NYSE: BA)",
      cohort: "Subject",
      ev_usd: new Cell({ expr: `MarketSnapshot["spot_ev", "val"]` }),
      ltm_ebit_mgn: new Cell({
        expr: `IncomeStatement["qoe_ebit", "LTM"] / IncomeStatement["revenue_total", "LTM"]`,
      }),
      ltm_ebitda_mgn: new Cell({
        expr: `IncomeStatement["ebitda_qoe", "LTM"] / IncomeStatement["revenue_total", "LTM"]`,
      }),
      ev_ltm_ebitda: new Cell({
        value: null,
        note: "Not meaningful (n.m.): LTM QoE EBITDA is negative after stripping $9,566M DAS gain and $252M HRL gain.",
      }),
      ev_ltm_ebit: new Cell({
        value: null,
        note: "Not meaningful (n.m.): LTM QoE EBIT is negative after stripping $9,566M DAS gain and $252M HRL gain.",
      }),
      ev_fy26_rev: new Cell({
        expr: `@table[@row, "ev_usd"] / ConsensusBridge["rev_cons", "2026E"]`,
      }),
      ev_fy27_rev: new Cell({
        expr: `@table[@row, "ev_usd"] / ConsensusBridge["rev_cons", "2027E"]`,
      }),
      ev_fy26_ebit: new Cell({
        expr: `IF(ConsensusBridge["ebit_cons", "2026E"] > 0, @table[@row, "ev_usd"] / ConsensusBridge["ebit_cons", "2026E"], NA())`,
      }),
      pe_fy26: new Cell({
        value: null,
        note: "Not meaningful (n.m.): FY26E consensus adjusted EPS is negative.",
      }),
      pe_fy27: new Cell({
        expr: `IF(ConsensusBridge["eps_sa_adj", "2027E"] > 0, MarketSnapshot["spot_price", "val"] / ConsensusBridge["eps_sa_adj", "2027E"], NA())`,
      }),
      p_fy26_fcf: new Cell({
        expr: `IF(ConsensusBridge["fcf_cons", "2026E"] > 0, MarketSnapshot["mkt_cap_diluted", "val"] / ConsensusBridge["fcf_cons", "2026E"], NA())`,
      }),
    },
    style: "total",
    highlight: true,
  })

  // =========================================================================
  // BAND 2: PeerEvBridge (Live EV bridge referencing PeerEvComponents)
  // =========================================================================
  const evb = sheet.addTable(
    "PeerEvBridge",
    "Peer Enterprise Value Bridge (US GAAP Operating-Rent & Pension-Adjusted)",
    {
      subtitle:
        "($ in millions USD; AIR.PA translated at spot EUR/USD) | US peers exclude ASC 842 operating leases; AIR.PA on as-reported IFRS 16 less Dassault stake",
      below: "TradingComps",
      gap: 2,
    }
  )
  evb.addColumn("company", { role: "descriptor", headers: ["Company"] })
  evb.addColumn("fx", {
    headers: ["FX", "Rate"],
    format: "number",
    decimals: 4,
  })
  evb.addColumn("spot_px", {
    headers: ["Spot", "Price"],
    format: "number",
    decimals: 2,
  })
  evb.addColumn("basic_sh", {
    headers: ["Basic", "Sh (M)"],
    format: "number",
    decimals: 2,
  })
  evb.addColumn("dil_sh", {
    headers: ["Dilut.", "Add (M)"],
    format: "number",
    decimals: 2,
  })
  evb.addColumn("mkt_cap_usd", {
    headers: ["Mkt Cap", "($M USD)"],
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  evb.addColumn("gross_debt_usd", {
    headers: ["Gross Debt", "($M USD)"],
    format: "currency",
    decimals: 0,
  })
  evb.addColumn("cash_usd", {
    headers: ["Cash & STI", "($M USD)"],
    format: "currency",
    decimals: 0,
  })
  evb.addColumn("non_op_inv_usd", {
    headers: ["Non-Op Inv", "($M USD)"],
    format: "currency",
    decimals: 0,
  })
  evb.addColumn("at_pension_usd", {
    headers: ["AT Pens.", "($M USD)"],
    format: "currency",
    decimals: 0,
  })
  evb.addColumn("nci_other_usd", {
    headers: ["NCI /", "Hedge"],
    format: "currency",
    decimals: 0,
  })
  evb.addColumn("ev_usd", {
    headers: ["Enterprise", "Val ($M)"],
    format: "currency",
    decimals: 0,
    style: "bold",
  })

  for (const ent of PEER_ENTITIES) {
    const p = peers[ent]
    const pid = PEER_ROW_ID[ent]
    const fxExpr =
      p.currency === "EUR" ? `CompsFxParity["eurusd_spot", "val"]` : `1`
    const dilExpr = p.useWaDeltaForDilution
      ? `MAX(0, PeerEvComponents["wa_dil", "${pid}"] - PeerEvComponents["wa_basic", "${pid}"])`
      : `PeerEvComponents["dil_awards", "${pid}"]`
    const debtExpr = `(SUM(PeerEvComponents["st_borrow".."lt_debt", "${pid}"]) + PeerEvComponents["fin_lease_liab", "${pid}"]) * @table[@row, "fx"]`
    const cashExpr = `(PeerEvComponents["bs_cash", "${pid}"] + PeerEvComponents["extra_cash", "${pid}"]) * @table[@row, "fx"]`
    const nonOpInvExpr = `PeerEvComponents["dassault_stake_fv", "${pid}"] * @table[@row, "fx"]`
    const pensionExpr =
      ent === "AIR.PA"
        ? `MAX(0, PeerEvComponents["air_pens_prov", "${pid}"] - PeerEvComponents["air_pens_asst", "${pid}"]) * (1 - WaccBuild["tax_rate", "val"]) * @table[@row, "fx"]`
        : `MAX(0, -(PeerEvComponents["pens_funded", "${pid}"] + PeerEvComponents["opeb_funded", "${pid}"])) * (1 - WaccBuild["tax_rate", "val"]) * @table[@row, "fx"]`
    const nciOtherExpr = `(PeerEvComponents["nci_eq", "${pid}"] + PeerEvComponents["nci_red", "${pid}"] - PeerEvComponents["ir_hedge", "${pid}"]) * @table[@row, "fx"]`

    evb.addRow(pid, {
      cells: {
        company: `${p.name} (${ent})`,
        fx: new Cell({ expr: fxExpr }),
        spot_px: p.spotClose,
        basic_sh: p.coverShares,
        dil_sh: new Cell({ expr: dilExpr }),
        mkt_cap_usd: new Cell({
          expr: `@table[@row, "spot_px"] * (@table[@row, "basic_sh"] + @table[@row, "dil_sh"]) * @table[@row, "fx"]`,
        }),
        gross_debt_usd: new Cell({
          expr: debtExpr,
          ...(ent === "AIR.PA"
            ? {
                note: "As-reported IFRS 16 financing liabilities (€13,826M incl. €2,387M leases); excludes €3,813M European Gov't refundable advances.",
              }
            : ent === "GD"
              ? {
                  note: "Includes audited YE2025 finance leases ($392M per Note J) alongside ST/LT debt; excludes ASC 842 operating leases.",
                }
              : ent === "NOC"
                ? {
                    note: "Includes $764M current portion of long-term debt from Q3 2026 balance sheet parenthetical; excludes ASC 842 operating leases.",
                  }
                : {}),
        }),
        cash_usd: new Cell({
          expr: cashExpr,
          ...(ent === "GE"
            ? {
                note: "Ex-Insurance cash ($8,764M BS) plus $1,500M >3M liquid time deposits (Note 9); Insurance cash ($784M) excluded.",
              }
            : {}),
        }),
        non_op_inv_usd: new Cell({
          expr: nonOpInvExpr,
          ...(ent === "AIR.PA"
            ? {
                note: "Deducts listed 10.72% Dassault Aviation non-operating equity stake (€2,350M / $2,578M at spot).",
              }
            : {}),
        }),
        at_pension_usd: new Cell({ expr: pensionExpr }),
        nci_other_usd: new Cell({
          expr: nciOtherExpr,
          ...(ent === "AIR.PA"
            ? {
                note: "Adjusts for €986M interest-rate hedge contracts per Airbus Note 21.",
              }
            : ent === "RTX"
              ? {
                  note: "Includes mezzanine redeemable NCI ($28M) plus equity NCI ($1,714M).",
                }
              : {}),
        }),
        ev_usd: new Cell({
          expr: `@table[@row, "mkt_cap_usd"] + @table[@row, "gross_debt_usd"] - @table[@row, "cash_usd"] - @table[@row, "non_op_inv_usd"] + @table[@row, "at_pension_usd"] + @table[@row, "nci_other_usd"]`,
        }),
      },
    })
  }

  // =========================================================================
  // BAND 3: BetaSummary (Cross-sectional OLS Beta & Unlevered Asset Beta)
  // =========================================================================
  const bs = sheet.addTable(
    "BetaSummary",
    "Multi-Horizon Equity & Unlevered Asset Beta Summary",
    {
      subtitle:
        "5Y Monthly (61 returns) and 2Y Weekly (107 returns) OLS vs. S&P 500; unlevered via Hamada (D = Gross Carrying Debt ex-US op leases, T = 25.0%)",
      below: "PeerEvBridge",
      gap: 2,
    }
  )
  bs.addColumn("company", { role: "descriptor", headers: ["Company"] })
  bs.addColumn("b5y_raw", {
    group: "5Y Monthly OLS",
    headers: ["Raw Beta"],
    format: "number",
    decimals: 3,
  })
  bs.addColumn("b5y_r2", {
    group: "5Y Monthly OLS",
    headers: ["R-Sq"],
    format: "percentage",
    decimals: 1,
  })
  bs.addColumn("b5y_blume", {
    group: "5Y Monthly OLS",
    headers: ["Blume"],
    format: "number",
    decimals: 3,
  })
  bs.addColumn("b2y_raw", {
    group: "2Y Weekly OLS",
    headers: ["Raw Beta"],
    format: "number",
    decimals: 3,
  })
  bs.addColumn("b2y_r2", {
    group: "2Y Weekly OLS",
    headers: ["R-Sq"],
    format: "percentage",
    decimals: 1,
  })
  bs.addColumn("de_ratio", {
    group: "De-Levering",
    headers: ["Debt / Eq"],
    format: "percentage",
    decimals: 1,
  })
  bs.addColumn("unlev_beta", {
    group: "De-Levering",
    headers: ["5Y Asset", "Beta"],
    format: "number",
    decimals: 3,
    style: "bold",
  })
  bs.addColumn("basis", { role: "descriptor", headers: ["De-levering basis"] })

  bs.addSectionHeader("Comparable peers")
  for (const ent of PEER_ENTITIES) {
    const pid = PEER_ROW_ID[ent]
    const bCol = PEER_BETA_COL[ent]
    bs.addRow(pid, {
      cells: {
        company: `${peers[ent].name} (${ent})`,
        b5y_raw: new Cell({ expr: `BetaStats5Y["raw_beta", "${bCol}"]` }),
        b5y_r2: new Cell({ expr: `BetaStats5Y["r_squared", "${bCol}"]` }),
        b5y_blume: new Cell({ expr: `BetaStats5Y["blume_beta", "${bCol}"]` }),
        b2y_raw: new Cell({ expr: `BetaStats2Y["raw_beta", "${bCol}"]` }),
        b2y_r2: new Cell({ expr: `BetaStats2Y["r_squared", "${bCol}"]` }),
        de_ratio: new Cell({
          expr: `PeerEvBridge["${pid}", "gross_debt_usd"] / PeerEvBridge["${pid}", "mkt_cap_usd"]`,
        }),
        unlev_beta: new Cell({
          expr: `@table[@row, "b5y_raw"] / (1 + (1 - WaccBuild["tax_rate", "val"]) * @table[@row, "de_ratio"])`,
        }),
        basis: PEER_BETA_BASIS[ent],
      },
    })
  }
  bs.addRowGutter()
  bs.addSectionHeader("Peer summary & subject company")
  bs.addRow("comm_median", {
    cells: {
      company: "Commercial / Hybrid — Median",
      basis: "4 commercial / hybrid OEM peers",
    },
    expr: `MEDIAN(@table["air_pa".."gd", @col])`,
    style: "subtotal",
  })
  bs.addRow("all_median", {
    cells: {
      company: "All 6 Peers — Median",
      basis: "Full 6-peer aerospace & defense cohort",
    },
    expr: `MEDIAN(@table["air_pa".."noc", @col])`,
  })
  bs.addRow("ba_beta", {
    cells: {
      company: "The Boeing Company (NYSE: BA)",
      b5y_raw: new Cell({ expr: `BetaStats5Y["raw_beta", "BA"]` }),
      b5y_r2: new Cell({ expr: `BetaStats5Y["r_squared", "BA"]` }),
      b5y_blume: new Cell({ expr: `BetaStats5Y["blume_beta", "BA"]` }),
      b2y_raw: new Cell({ expr: `BetaStats2Y["raw_beta", "BA"]` }),
      b2y_r2: new Cell({ expr: `BetaStats2Y["r_squared", "BA"]` }),
      de_ratio: new Cell({
        expr: `WaccBuild["gross_debt", "val"] / WaccBuild["mkt_equity", "val"]`,
      }),
      unlev_beta: new Cell({
        expr: `@table[@row, "b5y_raw"] / (1 + (1 - WaccBuild["tax_rate", "val"]) * @table[@row, "de_ratio"])`,
      }),
      basis: "Spot D/E; 5Y Base (1.307) / 2Y Down (1.427)",
    },
    style: "total",
    highlight: true,
  })

  // =========================================================================
  // BAND 4: CompsFxParity (left, 5c) | PeerConsensusInputs (right, 9c)
  // =========================================================================
  const fxTbl = sheet.addTable(
    "CompsFxParity",
    "FX & Airbus IFRS-to-GAAP Parity Inputs",
    {
      subtitle: [
        "Spot EUR/USD & Airbus FY25 IFRS footnotes",
        "USD translation & Airbus US-GAAP adjustments",
      ],
      below: "BetaSummary",
      gap: 2,
    }
  )
  fxTbl.addColumn("item", { role: "descriptor", headers: ["Input item"] })
  fxTbl.addColumn("val", { headers: ["Value"], style: "bold" })

  fxTbl.addRow("eurusd_spot", {
    cells: {
      item: "EUR / USD spot rate (Nov 20, 2026)",
      val: new Cell({
        value: market.eurusdSpot,
        note: "Yahoo Finance daily close as of November 20, 2026.",
      }),
    },
    format: "number",
    decimals: 4,
  })
  fxTbl.addRow("air_cap_dev_add", {
    cells: {
      item: "Airbus FY25 IAS 38 cap. R&D add. (€M)",
      val: airbusIfrs.capDevAdditionsFy25,
    },
    format: "currency",
    decimals: 0,
    currency: "EUR",
  })
  fxTbl.addRow("air_cap_dev_amort", {
    cells: {
      item: "Airbus FY25 IAS 38 R&D amort. (€M)",
      val: airbusIfrs.capDevAmortFy25,
    },
    format: "currency",
    decimals: 0,
    currency: "EUR",
  })
  fxTbl.addRow("air_rou_dep", {
    cells: {
      item: "Airbus FY25 IFRS 16 ROU dep. (€M)",
      val: airbusIfrs.rouDepFy25,
    },
    format: "currency",
    decimals: 0,
    currency: "EUR",
  })
  fxTbl.addRow("air_lease_repay", {
    cells: {
      item: "Airbus FY25 IFRS 16 lease repay (€M)",
      val: airbusIfrs.leaseCashRepaymentFy25,
    },
    format: "currency",
    decimals: 0,
    currency: "EUR",
  })
  fxTbl.addRow("air_lease_int", {
    cells: {
      item: "Airbus FY25 IFRS 16 lease int. (€M)",
      val: new Cell({
        expr: `ScalarDrivers["airbusLeaseInterestEur", "active"]`,
      }),
    },
    format: "currency",
    decimals: 0,
    currency: "EUR",
  })

  const consIn = sheet.addTable(
    "PeerConsensusInputs",
    "Peer Forward Street Consensus Inputs (StockAnalysis, Native Currency)",
    {
      subtitle: [
        "(Millions local currency, except EPS/sh; AIR.PA in EUR, US peers in USD)",
        "As of November 20, 2026; translated at spot EUR/USD in Trading Comps",
      ],
      rightOf: "CompsFxParity",
      gap: 1,
    }
  )
  consIn.addColumn("company", { role: "descriptor", headers: ["Company"] })
  consIn.addColumn("curr", { role: "descriptor", headers: ["Curr."] })
  consIn.addColumn("rev_26e", {
    headers: ["FY26E", "Rev"],
    format: "number",
    decimals: 0,
  })
  consIn.addColumn("rev_27e", {
    headers: ["FY27E", "Rev"],
    format: "number",
    decimals: 0,
  })
  consIn.addColumn("ebit_26e", {
    headers: ["FY26E", "EBIT"],
    format: "number",
    decimals: 0,
  })
  consIn.addColumn("fcf_26e", {
    headers: ["FY26E", "FCF"],
    format: "number",
    decimals: 0,
  })
  consIn.addColumn("eps_26e", {
    headers: ["FY26E", "Adj EPS"],
    format: "number",
    decimals: 2,
  })
  consIn.addColumn("eps_27e", {
    headers: ["FY27E", "Adj EPS"],
    format: "number",
    decimals: 2,
  })

  for (const ent of PEER_ENTITIES) {
    const p = peers[ent]
    const pid = PEER_ROW_ID[ent]
    consIn.addRow(pid, {
      cells: {
        company: `${p.name} (${ent})`,
        curr: p.currency,
        rev_26e: p.consRevFy26e,
        rev_27e: p.consRevFy27e,
        ebit_26e: p.consEbitFy26e,
        fcf_26e: p.consFcfFy26e,
        eps_26e: p.consEpsAdjFy26e,
        eps_27e: p.consEpsAdjFy27e,
      },
    })
  }

  // =========================================================================
  // BAND 5: PeerEvComponents (Audited native-currency EV bridge components)
  // =========================================================================
  const evComp = sheet.addTable(
    "PeerEvComponents",
    "Peer EV Bridge — Audited Balance Sheet & Footnote Inputs (Native Currency)",
    {
      subtitle:
        "(Millions of local currency; AIR.PA in €M, US peers in $M; shares in M) | Balance sheet & footnote basis for Peer EV Bridge",
      gap: 2,
    }
  )
  evComp.addColumn("component", {
    role: "descriptor",
    headers: ["Audited component"],
  })
  for (const ent of PEER_ENTITIES) {
    evComp.addColumn(PEER_ROW_ID[ent], {
      headers: [ent],
    })
  }
  evComp.addColumn("source", {
    role: "descriptor",
    headers: ["Source / Filing basis"],
  })

  const addEvCompRow = (
    id: string,
    label: string,
    getter: (ent: PeerEntity) => number,
    sourceText: string,
    decimals = 0
  ): void => {
    const cells: Record<string, string | number> = {
      component: label,
      source: sourceText,
    }
    for (const ent of PEER_ENTITIES) {
      cells[PEER_ROW_ID[ent]] = getter(ent)
    }
    evComp.addRow(id, { cells, format: "number", decimals })
  }

  evComp.addSectionHeader("Dilutive share equivalents (millions)")
  addEvCompRow(
    "dil_awards",
    "Dilutive equity awards (reported)",
    (e) => peers[e].dilutiveAwards,
    "Peer Q3 2026 10-Q / 9M26 EPS footnote",
    2
  )
  addEvCompRow(
    "wa_basic",
    "9M26 weighted-average basic shares",
    (e) => peers[e].waSharesBasic9m26,
    "Peer Q3 2026 10-Q / 9M26 income statement",
    2
  )
  addEvCompRow(
    "wa_dil",
    "9M26 weighted-average diluted shares",
    (e) => peers[e].waSharesDiluted9m26,
    "Peer Q3 2026 10-Q / 9M26 income statement",
    2
  )

  evComp.addRowGutter()
  evComp.addSectionHeader(
    "Debt, finance/IFRS 16 leases, cash & non-op investments (native M)"
  )
  addEvCompRow(
    "st_borrow",
    "Short-term borrowings / financing liab.",
    (e) => peers[e].debtStBorrow,
    "Peer Q3 2026 BS (AIR.PA incl. current IFRS 16)"
  )
  addEvCompRow(
    "curr_lt_debt",
    "Current portion of long-term debt",
    (e) => peers[e].debtCurrLt,
    "Peer Q3 2026 BS (NOC from BS parenthetical)"
  )
  addEvCompRow(
    "lt_debt",
    "Long-term debt / financing liab.",
    (e) => peers[e].debtLt,
    "Peer Q3 2026 BS (AIR.PA incl. non-curr. IFRS 16)"
  )
  addEvCompRow(
    "fin_lease_liab",
    "Finance lease liabilities (GD Note J)",
    (e) => peers[e].finLeaseLiab,
    "General Dynamics FY2025 10-K, Note J"
  )
  addEvCompRow(
    "ifrs16_lease_st",
    "IFRS 16 lease liab. — current (Airbus)",
    (e) => peers[e].ifrs16LeaseSt,
    "Airbus 9M 2026 FS, Note 19 (stripped in GAAP memo)"
  )
  addEvCompRow(
    "ifrs16_lease_lt",
    "IFRS 16 lease liab. — non-curr. (Airbus)",
    (e) => peers[e].ifrs16LeaseLt,
    "Airbus 9M 2026 FS, Note 19 (stripped in GAAP memo)"
  )
  evComp.addRow("ifrs16_leases_eur", {
    cells: {
      component: "Total IFRS 16 lease liab. (Airbus €M)",
      ...Object.fromEntries(
        PEER_ENTITIES.map((e) => [
          PEER_ROW_ID[e],
          new Cell({
            expr: `@table["ifrs16_lease_st", @col] + @table["ifrs16_lease_lt", @col]`,
          }),
        ])
      ),
      source: "Sum of current + non-current IFRS 16 leases",
    },
    format: "number",
    decimals: 0,
    style: "subtotal",
  })
  addEvCompRow(
    "dassault_stake_fv",
    "Dassault Aviation listed stake (Airbus)",
    (e) => peers[e].dassaultStakeFv,
    "Airbus 9M 2026 FS (10.72% non-op equity stake)"
  )
  addEvCompRow(
    "bs_cash",
    "Cash & marketable securities (BS)",
    (e) => peers[e].bsCash,
    "Peer Q3 2026 BS (GE ex-Insurance; AIR incl. L1 sec.)"
  )
  addEvCompRow(
    "extra_cash",
    "Additional liquid time deposits (>3M)",
    (e) => peers[e].extraLiquidCash,
    "GE Aerospace Q3 2026 10-Q, Note 9 (>3M deposits)"
  )

  evComp.addRowGutter()
  evComp.addSectionHeader(
    "Pensions, noncontrolling interest & hedges (native M)"
  )
  addEvCompRow(
    "pens_funded",
    "US GAAP pension net funded status (YE25)",
    (e) => peers[e].pensionFundedStatus,
    "US peer FY2025 10-K pension footnote (NOC surplus)"
  )
  addEvCompRow(
    "opeb_funded",
    "US GAAP OPEB net funded status (YE25)",
    (e) => peers[e].opebFundedStatus,
    "US peer FY2025 10-K retiree health footnote"
  )
  addEvCompRow(
    "air_pens_prov",
    "IFRS pension provisions (Airbus Q3 26)",
    (e) => peers[e].pensionProvisionsAirbus,
    "Airbus 9M 2026 FS (net €350M surplus overall)"
  )
  addEvCompRow(
    "air_pens_asst",
    "IFRS pension surplus asset (Airbus Q3 26)",
    (e) => peers[e].pensionAssetAirbus,
    "Airbus 9M 2026 FS non-current pension asset"
  )
  addEvCompRow(
    "nci_eq",
    "Noncontrolling interests (equity)",
    (e) => peers[e].nciEquity,
    "Peer Q3 2026 BS equity section"
  )
  addEvCompRow(
    "nci_red",
    "Redeemable noncontrolling interests",
    (e) => peers[e].nciRedeemable,
    "RTX Q3 2026 BS mezzanine equity ($28M)"
  )
  addEvCompRow(
    "ir_hedge",
    "Interest-rate hedge contracts (Note 21)",
    (e) => peers[e].irHedgeLiab,
    "Airbus 9M 2026 FS, Note 21 (net cash bridge)"
  )

  // =========================================================================
  // BAND 6: PeerLtmBridge (1:1 audited FY25, 9M25, 9M26 -> live LTM & USD)
  // =========================================================================
  const ltm = sheet.addTable(
    "PeerLtmBridge",
    "Peer LTM Q3 2026 Operating Bridge (Audited Filing Components)",
    {
      subtitle:
        "($ in millions USD; AIR.PA local rows in €M translated at spot EUR/USD) | LTM Q3 2026A equals FY2025A + 9M 2026A − 9M 2025A",
      below: "PeerEvComponents",
      gap: 2,
    }
  )
  ltm.addColumn("metric", { role: "descriptor", headers: ["Peer & metric"] })
  ltm.addColumn("fx_mult", {
    headers: ["FX", "to USD"],
    format: "number",
    decimals: 4,
  })
  ltm.addColumn("fy25_a", {
    group: "FY2025A",
    headers: ["Primary"],
    format: "number",
    decimals: 0,
  })
  ltm.addColumn("fy25_b", {
    group: "FY2025A",
    headers: ["Addl."],
    format: "number",
    decimals: 0,
  })
  ltm.addColumn("ytd25_a", {
    group: "9M 2025A",
    headers: ["Primary"],
    format: "number",
    decimals: 0,
  })
  ltm.addColumn("ytd25_b", {
    group: "9M 2025A",
    headers: ["Addl."],
    format: "number",
    decimals: 0,
  })
  ltm.addColumn("ytd26_a", {
    group: "9M 2026A",
    headers: ["Primary"],
    format: "number",
    decimals: 0,
  })
  ltm.addColumn("ytd26_b", {
    group: "9M 2026A",
    headers: ["Addl."],
    format: "number",
    decimals: 0,
  })
  ltm.addColumn("ltm_local", {
    group: "LTM Q3 26A",
    headers: ["Local", "Curr."],
    format: "number",
    decimals: 0,
  })
  ltm.addColumn("ltm_usd", {
    group: "LTM Q3 26A",
    headers: ["USD", "($M)"],
    format: "currency",
    decimals: 0,
    style: "bold",
  })
  ltm.addColumn("notes", { role: "descriptor", headers: ["Notes"] })

  for (let idx = 0; idx < PEER_ENTITIES.length; idx++) {
    const ent = PEER_ENTITIES[idx]!
    const p = peers[ent]
    const pid = PEER_ROW_ID[ent]
    if (idx > 0) ltm.addRowGutter()
    ltm.addSectionHeader(`${p.name} (${ent}) — ${p.currency}`)

    const fxCell =
      p.currency === "EUR"
        ? new Cell({ expr: `CompsFxParity["eurusd_spot", "val"]` })
        : 1.0

    const addMetricRow = (
      suffix: string,
      label: string,
      fy25a: number,
      fy25b: number,
      ytd25a: number,
      ytd25b: number,
      ytd26a: number,
      ytd26b: number,
      noteText: string | null = null
    ): void => {
      ltm.addRow(`${pid}_${suffix}`, {
        cells: {
          metric: label,
          fx_mult: fxCell,
          fy25_a: fy25a,
          fy25_b: fy25b,
          ytd25_a: ytd25a,
          ytd25_b: ytd25b,
          ytd26_a: ytd26a,
          ytd26_b: ytd26b,
          ltm_local: new Cell({
            expr: `(@table[@row, "fy25_a"] + @table[@row, "fy25_b"]) + (@table[@row, "ytd26_a"] + @table[@row, "ytd26_b"]) - (@table[@row, "ytd25_a"] + @table[@row, "ytd25_b"])`,
          }),
          ltm_usd: new Cell({
            expr: `@table[@row, "ltm_local"] * @table[@row, "fx_mult"]`,
          }),
          notes: noteText,
        },
      })
    }

    addMetricRow(
      "rev",
      ent === "GE"
        ? "Revenue (ex-Insurance segments)"
        : ent === "GD"
          ? "Revenue (53-week Q3 LTM)"
          : "Revenue",
      p.revFy25,
      0,
      p.rev9m25,
      0,
      p.rev9m26,
      0,
      ent === "GE"
        ? "CES + DPT ex-Insurance"
        : ent === "GD"
          ? "277d vs 271d (+6 days)"
          : null
    )
    if (ent === "GE") {
      addMetricRow(
        "seg_corp_ebit",
        "Segment + Corporate profit (incl. Ins.)",
        p.ebitBaseFy25,
        p.ebitCorpFy25,
        p.ebitBase9m25,
        p.ebitCorp9m25,
        p.ebitBase9m26,
        p.ebitCorp9m26
      )
      addMetricRow(
        "ins_profit",
        "Run-off Insurance operating profit",
        p.ebitInsFy25,
        0,
        p.ebitIns9m25,
        0,
        p.ebitIns9m26,
        0,
        "Stripped from GE EBIT"
      )
      ltm.addRow(`${pid}_ebit`, {
        cells: {
          metric: "Operating profit (ex-Insurance)",
          fx_mult: fxCell,
          fy25_a: null,
          fy25_b: null,
          ytd25_a: null,
          ytd25_b: null,
          ytd26_a: null,
          ytd26_b: null,
          ltm_local: new Cell({
            expr: `@table["ge_seg_corp_ebit", "ltm_local"] - @table["ge_ins_profit", "ltm_local"]`,
          }),
          ltm_usd: new Cell({
            expr: `@table[@row, "ltm_local"] * @table[@row, "fx_mult"]`,
          }),
          notes: "Matches ex-Ins. EV",
        },
      })
    } else {
      addMetricRow(
        "ebit",
        "Operating income (EBIT)",
        p.ebitBaseFy25,
        p.ebitCorpFy25,
        p.ebitBase9m25,
        p.ebitCorp9m25,
        p.ebitBase9m26,
        p.ebitCorp9m26
      )
    }
    addMetricRow(
      "da",
      "Depreciation & amortization",
      p.daPrimaryFy25,
      p.daAmortFy25,
      p.daPrimary9m25,
      p.daAmort9m25,
      p.daPrimary9m26,
      p.daAmort9m26
    )
    addMetricRow(
      "ocf",
      "Operating cash flow",
      p.ocfFy25,
      0,
      p.ocf9m25,
      0,
      p.ocf9m26,
      0
    )
    addMetricRow(
      "capex",
      "Capital expenditures (outflow)",
      p.capexFy25,
      0,
      p.capex9m25,
      0,
      p.capex9m26,
      0
    )
    addMetricRow(
      "sbc",
      ent === "RTX"
        ? "SBC + stock-funded 401(k) match"
        : "Share-based compensation",
      p.sbcBaseFy25,
      p.sbc401kFy25,
      p.sbcBase9m25,
      p.sbc401k9m25,
      p.sbcBase9m26,
      p.sbc401k9m26,
      ent === "RTX" ? "Incl. 401(k) match" : null
    )
    ltm.addRow(`${pid}_ebitda`, {
      cells: {
        metric: "LTM EBITDA (EBIT + D&A)",
        fx_mult: fxCell,
        fy25_a: null,
        fy25_b: null,
        ytd25_a: null,
        ytd25_b: null,
        ytd26_a: null,
        ytd26_b: null,
        ltm_local: new Cell({
          expr: `@table["${pid}_ebit", "ltm_local"] + @table["${pid}_da", "ltm_local"]`,
        }),
        ltm_usd: new Cell({
          expr: `@table[@row, "ltm_local"] * @table[@row, "fx_mult"]`,
        }),
        notes: null,
      },
      style: "subtotal",
    })
    ltm.addRow(`${pid}_fcf`, {
      cells: {
        metric: "LTM Headline FCF (OCF + CapEx)",
        fx_mult: fxCell,
        fy25_a: null,
        fy25_b: null,
        ytd25_a: null,
        ytd25_b: null,
        ytd26_a: null,
        ytd26_b: null,
        ltm_local: new Cell({
          expr: `@table["${pid}_ocf", "ltm_local"] + @table["${pid}_capex", "ltm_local"]`,
        }),
        ltm_usd: new Cell({
          expr: `@table[@row, "ltm_local"] * @table[@row, "fx_mult"]`,
        }),
        notes: null,
      },
    })
  }

  // Airbus US-GAAP Parity LTM rows
  ltm.addRowGutter()
  ltm.addSectionHeader(
    "Airbus SE — Supplemental US-GAAP-Aligned LTM Cross-Check"
  )
  ltm.addRow("air_usgaap_ebit", {
    cells: {
      metric: "Airbus US-GAAP-adj. LTM EBIT",
      fx_mult: new Cell({ expr: `CompsFxParity["eurusd_spot", "val"]` }),
      fy25_a: null,
      fy25_b: null,
      ytd25_a: null,
      ytd25_b: null,
      ytd26_a: null,
      ytd26_b: null,
      ltm_local: new Cell({
        expr: `@table["air_pa_ebit", "ltm_local"] - (CompsFxParity["air_cap_dev_add", "val"] + CompsFxParity["air_cap_dev_amort", "val"]) - CompsFxParity["air_lease_int", "val"]`,
      }),
      ltm_usd: new Cell({
        expr: `@table[@row, "ltm_local"] * @table[@row, "fx_mult"]`,
      }),
      notes: "Ex-IAS 38/IFRS 16 int.",
    },
  })
  ltm.addRow("air_usgaap_ebitda", {
    cells: {
      metric: "Airbus US-GAAP-adj. LTM EBITDA",
      fx_mult: new Cell({ expr: `CompsFxParity["eurusd_spot", "val"]` }),
      fy25_a: null,
      fy25_b: null,
      ytd25_a: null,
      ytd25_b: null,
      ytd26_a: null,
      ytd26_b: null,
      ltm_local: new Cell({
        expr: `@table["air_pa_ebitda", "ltm_local"] - CompsFxParity["air_cap_dev_add", "val"] + CompsFxParity["air_rou_dep", "val"] - CompsFxParity["air_lease_int", "val"]`,
      }),
      ltm_usd: new Cell({
        expr: `@table[@row, "ltm_local"] * @table[@row, "fx_mult"]`,
      }),
      notes: "Ex-IAS 38/IFRS 16 rent",
    },
    style: "subtotal",
  })
  ltm.addRow("air_usgaap_fcf", {
    cells: {
      metric: "Airbus US-GAAP-adj. LTM FCF",
      fx_mult: new Cell({ expr: `CompsFxParity["eurusd_spot", "val"]` }),
      fy25_a: null,
      fy25_b: null,
      ytd25_a: null,
      ytd25_b: null,
      ytd26_a: null,
      ytd26_b: null,
      ltm_local: new Cell({
        expr: `@table["air_pa_fcf", "ltm_local"] + CompsFxParity["air_lease_repay", "val"]`,
      }),
      ltm_usd: new Cell({
        expr: `@table[@row, "ltm_local"] * @table[@row, "fx_mult"]`,
      }),
      notes: "Ex-IFRS 16 lease prin.",
    },
  })
}
