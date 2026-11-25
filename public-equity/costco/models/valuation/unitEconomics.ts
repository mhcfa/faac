import type { Sheet, Table } from "f8-engine"
import type { ClubUnitEconEntity, CostcoKnowledgeData } from "../kg.ts"
import { notedNull, rowFormatOptions } from "../timeline.ts"

const UNIT_ECON_COLS: readonly ClubUnitEconEntity[] = [
  "COST_US",
  "COST_TOTAL",
  "WMT_SAMS_H1_ANN",
  "WMT_SAMS_FY26",
  "BJ",
  "PSMT",
]

const UNIT_ECON_COL_HEADERS: Readonly<
  Record<
    ClubUnitEconEntity,
    { readonly group: string; readonly headers: readonly [string, string] }
  >
> = {
  COST_US: {
    group: "Costco Wholesale (FY26)",
    headers: ["U.S.", "Segment"],
  },
  COST_TOTAL: {
    group: "Costco Wholesale (FY26)",
    headers: ["Consol.", "Total"],
  },
  WMT_SAMS_H1_ANN: {
    group: "Sam's Club U.S.",
    headers: ["H1 FY27", "Annualized"],
  },
  WMT_SAMS_FY26: {
    group: "Sam's Club U.S.",
    headers: ["FY26", "Pre-Recast"],
  },
  BJ: {
    group: "Pure-Play Club Peers",
    headers: ["BJ's Club", "(LTM Q2)"],
  },
  PSMT: {
    group: "Pure-Play Club Peers",
    headers: ["PriceSmart", "(FY26)"],
  },
}

export function buildUnitEconomicsSchedule(
  sheet: Sheet,
  kg: CostcoKnowledgeData
): Table {
  const table = sheet.addTable(
    "ClubUnitEconomics",
    "Warehouse Club Unit Economics: COST vs. Sam's Club, BJ's & PriceSmart ($M / Club / SqFt)",
    {
      subtitle: [
        "COST FY26 vs. Sam's Club (H1 FY27 annualized & FY26), BJ's (LTM Q2), and PriceSmart (FY26)",
        "Source: COST FY26 10-K (Note 11); WMT Q2 FY27 10-Q; BJ's Q2 FY26 10-Q; PSMT FY26 10-K",
      ],
      currency: "USD",
    }
  )

  table.addColumn("line_item", {
    role: "descriptor",
    header: "Unit economic metric",
  })
  for (const colId of UNIT_ECON_COLS) {
    const colHdr = UNIT_ECON_COL_HEADERS[colId]
    table.addColumn(colId, {
      role: "measure",
      group: colHdr.group,
      headers: colHdr.headers,
      ...(colId === "COST_US" ? { style: "bold" as const } : {}),
    })
  }

  const raw = kg.market.clubUnitEconRaw
  const psmtPeer = kg.market.peers.psmt
  const kpis = kg.cost.operatingKpis
  const qoe = kg.cost.qoe

  table.addSectionHeader("Physical scale and membership base")
  table.addRow("clubs", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: "Ending warehouse / club count",
      COST_US: { expr: 'OperatingSchedule["warehouses_us", "FY26"]' },
      COST_TOTAL: { expr: 'OperatingSchedule["warehouses_total", "FY26"]' },
      WMT_SAMS_H1_ANN: raw.sams.clubsH127,
      WMT_SAMS_FY26: raw.sams.clubsFy26,
      BJ: raw.bj.clubsH127,
      PSMT: raw.psmt.clubsFy26,
    },
  })
  table.addRow("sales_floor_sqft_m", {
    ...rowFormatOptions("number", 1),
    cells: {
      line_item: "Sales floor area (M SqFt)",
      COST_US: kpis.warehouseSqftUsMillions.FY26,
      COST_TOTAL: kpis.warehouseSqftTotalMillions.FY26,
      WMT_SAMS_H1_ANN: raw.sams.sqftMillionsH127,
      WMT_SAMS_FY26: raw.sams.sqftMillionsFy26,
      BJ: notedNull(
        "BJ's Form 10-K/10-Q does not disclose total retail square footage."
      ),
      PSMT: raw.psmt.sqftMillionsFy26,
    },
  })
  table.addRow("paid_members_m", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "Paid membership accounts (M)",
      COST_US: notedNull(
        "COST Note 11 omits U.S.-only paid membership counts."
      ),
      COST_TOTAL: { expr: 'OperatingSchedule["paid_members_m", "FY26"]' },
      WMT_SAMS_H1_ANN: notedNull(
        "Walmart does not disclose numerical Sam's Club member counts."
      ),
      WMT_SAMS_FY26: null,
      BJ: raw.bj.paidMembersMillionsH127,
      PSMT: raw.psmt.paidMembersMillionsFy26,
    },
  })
  table.addRow("members_per_club_k", {
    ...rowFormatOptions("number", 1),
    cells: {
      line_item: "Paid members per club (k)",
      COST_US: null,
      COST_TOTAL: {
        expr: '@table["paid_members_m", "COST_TOTAL"] * 1000 / @table["clubs", "COST_TOTAL"]',
      },
      WMT_SAMS_H1_ANN: null,
      WMT_SAMS_FY26: null,
      BJ: {
        expr: '@table["paid_members_m", "BJ"] * 1000 / @table["clubs", "BJ"]',
      },
      PSMT: {
        expr: '@table["paid_members_m", "PSMT"] * 1000 / @table["clubs", "PSMT"]',
      },
    },
  })

  table.addRowGutter()
  table.addSectionHeader("Revenue, productivity and profitability ($M)")
  table.addRow("net_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Net merchandise sales ($M)",
      COST_US: notedNull(
        "COST Form 10-K Note 11 reports U.S. total segment revenue including MFI without a standalone MFI split."
      ),
      COST_TOTAL: { expr: 'IncomeStatement["net_sales", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_net_sales", "val"] * 2',
      },
      WMT_SAMS_FY26: raw.sams.netSalesFy26,
      BJ: { expr: 'PeerLtmBridge["bj_net_sales", "ltm"]' },
      PSMT: psmtPeer.netSalesFy26,
    },
  })
  table.addRow("mfi_and_other", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Membership fee & other ($M)",
      COST_US: null,
      COST_TOTAL: { expr: 'IncomeStatement["membership_fees", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_mfi_other", "val"] * 2',
      },
      WMT_SAMS_FY26: raw.sams.mfiAndOtherFy26,
      BJ: { expr: 'PeerLtmBridge["bj_mfi_other", "ltm"]' },
      PSMT: psmtPeer.mfiAndOtherFy26,
    },
  })
  table.addRow("total_revenue", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Total revenue ($M)",
      COST_US: { expr: 'OperatingSchedule["seg_rev_us", "FY26"]' },
      COST_TOTAL: { expr: 'IncomeStatement["total_revenue", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_total_rev", "val"] * 2',
      },
      WMT_SAMS_FY26: raw.sams.totalRevFy26,
      BJ: { expr: 'PeerLtmBridge["bj_rev", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_rev", "ltm"]' },
    },
  })
  table.addRow("rev_per_club", {
    ...rowFormatOptions("currency", 1),
    style: "bold",
    highlight: true,
    expr: '@table["total_revenue", @col] / @table["clubs", @col]',
    cells: { line_item: "Annual revenue per club ($M)" },
  })
  table.addRow("rev_per_sqft", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Annual revenue per SqFt ($)",
      COST_US: {
        expr: '@table["total_revenue", "COST_US"] / @table["sales_floor_sqft_m", "COST_US"]',
      },
      COST_TOTAL: {
        expr: '@table["total_revenue", "COST_TOTAL"] / @table["sales_floor_sqft_m", "COST_TOTAL"]',
      },
      WMT_SAMS_H1_ANN: {
        expr: '@table["total_revenue", "WMT_SAMS_H1_ANN"] / @table["sales_floor_sqft_m", "WMT_SAMS_H1_ANN"]',
      },
      WMT_SAMS_FY26: {
        expr: '@table["total_revenue", "WMT_SAMS_FY26"] / @table["sales_floor_sqft_m", "WMT_SAMS_FY26"]',
      },
      BJ: null,
      PSMT: {
        expr: '@table["total_revenue", "PSMT"] / @table["sales_floor_sqft_m", "PSMT"]',
      },
    },
  })
  table.addRow("merch_gross_profit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Merchandise gross profit ($M)",
      COST_US: notedNull(
        "U.S. segment MFI is embedded inside total segment revenue; see total gross profit below."
      ),
      COST_TOTAL: { expr: 'IncomeStatement["merch_gross_profit", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_merch_gp", "val"] * 2',
      },
      WMT_SAMS_FY26: {
        expr: '@table["net_sales", "WMT_SAMS_FY26"] - ClubUnitEconBridge["sams_fy26_cost_of_sales", "val"]',
      },
      BJ: {
        expr: '@table["net_sales", "BJ"] - PeerLtmBridge["bj_cost_of_sales", "ltm"]',
      },
      PSMT: {
        expr: '@table["net_sales", "PSMT"] - ClubUnitEconBridge["psmt_fy26_cost_of_sales", "val"]',
      },
    },
  })
  table.addRow("merch_gm_pct", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Merchandise gross margin (%)",
      COST_US: null,
      COST_TOTAL: {
        expr: '@table["merch_gross_profit", "COST_TOTAL"] / @table["net_sales", "COST_TOTAL"]',
      },
      WMT_SAMS_H1_ANN: {
        expr: '@table["merch_gross_profit", "WMT_SAMS_H1_ANN"] / @table["net_sales", "WMT_SAMS_H1_ANN"]',
      },
      WMT_SAMS_FY26: {
        expr: '@table["merch_gross_profit", "WMT_SAMS_FY26"] / @table["net_sales", "WMT_SAMS_FY26"]',
      },
      BJ: {
        expr: '@table["merch_gross_profit", "BJ"] / @table["net_sales", "BJ"]',
      },
      PSMT: {
        expr: '@table["merch_gross_profit", "PSMT"] / @table["net_sales", "PSMT"]',
      },
    },
  })
  table.addRow("total_gross_profit_incl_mfi", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Total gross profit incl. MFI ($M)",
      COST_US: {
        expr: '@table["total_revenue", "COST_US"] - ClubUnitEconBridge["cost_us_merch_costs", "val"]',
      },
      COST_TOTAL: {
        expr: '@table["merch_gross_profit", "COST_TOTAL"] + @table["mfi_and_other", "COST_TOTAL"]',
      },
      WMT_SAMS_H1_ANN: {
        expr: '@table["merch_gross_profit", "WMT_SAMS_H1_ANN"] + @table["mfi_and_other", "WMT_SAMS_H1_ANN"]',
      },
      WMT_SAMS_FY26: {
        expr: '@table["merch_gross_profit", "WMT_SAMS_FY26"] + @table["mfi_and_other", "WMT_SAMS_FY26"]',
      },
      BJ: {
        expr: '@table["merch_gross_profit", "BJ"] + @table["mfi_and_other", "BJ"]',
      },
      PSMT: {
        expr: '@table["merch_gross_profit", "PSMT"] + @table["mfi_and_other", "PSMT"]',
      },
    },
  })
  table.addRow("total_gp_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["total_gross_profit_incl_mfi", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Total gross margin incl. MFI (%)" },
  })
  table.addRow("mfi_pct_rev", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "MFI and other (% total rev.)",
      COST_US: null,
      COST_TOTAL: {
        expr: '@table["mfi_and_other", "COST_TOTAL"] / @table["total_revenue", "COST_TOTAL"]',
      },
      WMT_SAMS_H1_ANN: {
        expr: '@table["mfi_and_other", "WMT_SAMS_H1_ANN"] / @table["total_revenue", "WMT_SAMS_H1_ANN"]',
      },
      WMT_SAMS_FY26: {
        expr: '@table["mfi_and_other", "WMT_SAMS_FY26"] / @table["total_revenue", "WMT_SAMS_FY26"]',
      },
      BJ: {
        expr: '@table["mfi_and_other", "BJ"] / @table["total_revenue", "BJ"]',
      },
      PSMT: {
        expr: '@table["mfi_and_other", "PSMT"] / @table["total_revenue", "PSMT"]',
      },
    },
  })
  table.addRow("sga", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Operating / SG&A expenses ($M)",
      COST_US: raw.costUs.sgaFy26,
      COST_TOTAL: { expr: 'IncomeStatement["sga", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_sga", "val"] * 2',
      },
      WMT_SAMS_FY26: raw.sams.sgaFy26,
      BJ: {
        expr: 'PeerLtmBridge["bj_sga", "ltm"] + PeerLtmBridge["bj_pre_opening", "ltm"]',
      },
      PSMT: {
        expr: 'SUM(ClubUnitEconBridge["psmt_fy26_sga".."psmt_fy26_loss_disposal", "val"])',
      },
    },
  })
  table.addRow("sga_pct_rev", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["sga", @col] / @table["total_revenue", @col]',
    cells: { line_item: "SG&A (% total revenue)" },
  })
  table.addRow("operating_income", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Operating income / EBIT ($M)",
      COST_US: raw.costUs.ebitFy26,
      COST_TOTAL: { expr: 'IncomeStatement["operating_income", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_ebit", "val"] * 2',
      },
      WMT_SAMS_FY26: raw.sams.ebitFy26,
      BJ: { expr: 'PeerLtmBridge["bj_ebit", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_ebit", "ltm"]' },
    },
  })
  table.addRow("ebit_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["operating_income", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Operating margin (EBIT %)" },
  })
  table.addRow("ebit_per_club", {
    ...rowFormatOptions("currency", 2),
    expr: '@table["operating_income", @col] / @table["clubs", @col]',
    cells: { line_item: "Operating income per club ($M)" },
  })
  table.addRow("da", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Depreciation & amortization ($M)",
      COST_US: raw.costUs.daFy26,
      COST_TOTAL: { expr: 'WorkingCapitalPPE["da", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_da", "val"] * 2',
      },
      WMT_SAMS_FY26: raw.sams.daFy26,
      BJ: { expr: 'PeerLtmBridge["bj_da", "ltm"]' },
      PSMT: { expr: 'PeerLtmBridge["psmt_da", "ltm"]' },
    },
  })
  table.addRow("ebitda", {
    ...rowFormatOptions("currency", 0),
    style: "total",
    expr: '@table["operating_income", @col] + @table["da", @col]',
    cells: { line_item: "Segment / club EBITDA ($M)" },
  })
  table.addRow("ebitda_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["ebitda", @col] / @table["total_revenue", @col]',
    cells: { line_item: "EBITDA margin (%)" },
  })
  table.addRow("capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Capital expenditures ($M)",
      COST_US: raw.costUs.capexFy26,
      COST_TOTAL: { expr: 'WorkingCapitalPPE["capex", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'ClubUnitEconBridge["sams_h1_capex", "val"] * 2',
      },
      WMT_SAMS_FY26: raw.sams.capexFy26,
      BJ: { expr: '-PeerLtmBridge["bj_capex", "ltm"]' },
      PSMT: { expr: '-PeerLtmBridge["psmt_capex", "ltm"]' },
    },
  })
  table.addRow("capex_pct_rev", {
    ...rowFormatOptions("percentage", 2),
    style: "bold",
    expr: '@table["capex", @col] / @table["total_revenue", @col]',
    cells: { line_item: "CapEx (% total revenue)" },
  })

  table.addRowGutter()
  table.addSectionHeader("Membership pricing, renewal and comp KPIs")
  table.addRow("comp_ex_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Comparable sales growth (ex-fuel)",
      COST_US: { expr: 'OperatingSchedule["core_comp_us", "FY26"]' },
      COST_TOTAL: { expr: 'OperatingSchedule["comp_ex_gas_fx_total", "FY26"]' },
      WMT_SAMS_H1_ANN: {
        expr: 'AVERAGE(ClubUnitEconBridge["sams_q1_27_comp_ex_fuel".."sams_q2_27_comp_ex_fuel", "val"])',
      },
      WMT_SAMS_FY26: {
        expr: 'ClubUnitEconBridge["sams_fy26_comp_incl_fuel", "val"] - ClubUnitEconBridge["sams_fy26_comp_fuel_impact", "val"]',
      },
      BJ: raw.bj.compExFuelH127,
      PSMT: raw.psmt.compTotalFy26,
    },
  })
  table.addRow("renewal_rate", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Trailing 12M renewal rate",
      COST_US: kpis.renewalRateUsCa.FY26,
      COST_TOTAL: kpis.renewalRateWw.FY26,
      WMT_SAMS_H1_ANN: notedNull(
        "Walmart does not disclose numerical renewal rates for Sam's Club."
      ),
      WMT_SAMS_FY26: null,
      BJ: raw.bj.renewalRateFy26,
      PSMT: raw.psmt.renewalRateFy26,
    },
  })
  table.addRow("implied_churn_rate", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Implied annual churn (1 − renew)",
      COST_US: { expr: '1 - @table["renewal_rate", "COST_US"]' },
      COST_TOTAL: { expr: '1 - @table["renewal_rate", "COST_TOTAL"]' },
      WMT_SAMS_H1_ANN: null,
      WMT_SAMS_FY26: null,
      BJ: { expr: '1 - @table["renewal_rate", "BJ"]' },
      PSMT: { expr: '1 - @table["renewal_rate", "PSMT"]' },
    },
  })
  table.addRow("higher_tier_pct", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Premium / Executive tier share",
      COST_US: {
        expr: 'ClubUnitEconBridge["cost_exec_members_m", "val"] / @table["paid_members_m", "COST_TOTAL"]',
      },
      COST_TOTAL: {
        expr: 'ClubUnitEconBridge["cost_exec_members_m", "val"] / @table["paid_members_m", "COST_TOTAL"]',
      },
      WMT_SAMS_H1_ANN: notedNull(
        "Walmart does not disclose Sam's Club Plus penetration."
      ),
      WMT_SAMS_FY26: null,
      BJ: raw.bj.higherTierPenetrationFy26,
      PSMT: raw.psmt.higherTierPenetrationFy26,
    },
  })
  table.addRow("entry_fee", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Entry tier annual fee ($)",
      COST_US: qoe.costEntryFee,
      COST_TOTAL: qoe.costEntryFee,
      WMT_SAMS_H1_ANN: raw.sams.entryFeeDollars,
      WMT_SAMS_FY26: raw.sams.entryFeeDollars,
      BJ: raw.bj.entryFeeDollars,
      PSMT: notedNull(
        "Multi-country local currency fee tiers excluded from U.S. club fee comparison."
      ),
    },
  })
  table.addRow("premium_fee", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Premium tier annual fee ($)",
      COST_US: qoe.costPremiumFee,
      COST_TOTAL: qoe.costPremiumFee,
      WMT_SAMS_H1_ANN: raw.sams.premiumFeeDollars,
      WMT_SAMS_FY26: raw.sams.premiumFeeDollars,
      BJ: raw.bj.premiumFeeDollars,
      PSMT: notedNull(
        "Multi-country local currency fee tiers excluded from U.S. club fee comparison."
      ),
    },
  })

  // Supporting Schedule paired right of ClubUnitEconomics
  const bridge = sheet.addTable(
    "ClubUnitEconBridge",
    "As-Reported Segment & Peer Inputs ($M / %)",
    {
      subtitle: [
        "6M Sam's flows, COST U.S. & PSMT inputs",
        "Source: WMT Q2 FY27 10-Q; COST/PSMT 10-K",
      ],
      currency: "USD",
      rightOf: table,
    }
  )
  bridge.addColumn("line_item", {
    role: "descriptor",
    header: "Reported segment input",
  })
  bridge.addColumn("val", {
    role: "measure",
    headers: ["Reported", "Value"],
  })

  bridge.addSectionHeader("Costco U.S. & Executive inputs (FY26)")
  bridge.addRow("cost_us_merch_costs", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "COST U.S. merchandise costs ($M)",
      val: raw.costUs.merchCostsFy26,
    },
  })
  bridge.addRow("cost_exec_members_m", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "COST Executive paid members (M)",
      val: kpis.executiveMembersMillions.FY26,
    },
  })

  bridge.addRowGutter()
  bridge.addSectionHeader("Sam's Club H1 FY27 (6M) & FY26 inputs")
  bridge.addRow("sams_h1_net_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 net sales ($M)",
      val: raw.sams.netSalesH127,
    },
  })
  bridge.addRow("sams_h1_mfi_other", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 MFI & other ($M)",
      val: raw.sams.mfiAndOtherH127,
    },
  })
  bridge.addRow("sams_h1_total_rev", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 total rev. ($M)",
      val: raw.sams.totalRevH127,
    },
  })
  bridge.addRow("sams_h1_merch_gp", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 merch. GP ($M)",
      val: raw.sams.merchGpH127,
    },
  })
  bridge.addRow("sams_h1_sga", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 SG&A ($M)",
      val: raw.sams.sgaH127,
    },
  })
  bridge.addRow("sams_h1_ebit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 EBIT ($M)",
      val: raw.sams.ebitH127,
    },
  })
  bridge.addRow("sams_h1_da", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 D&A ($M)",
      val: raw.sams.daH127,
    },
  })
  bridge.addRow("sams_h1_capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's H1 FY27 CapEx ($M)",
      val: raw.sams.capexH127,
    },
  })
  bridge.addRow("sams_fy26_cost_of_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's FY26 cost of sales ($M)",
      val: raw.sams.costOfSalesFy26,
    },
  })
  bridge.addRow("sams_q1_27_comp_ex_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's Q1 FY27 comp (ex-fuel)",
      val: raw.sams.compExFuelQ127,
    },
  })
  bridge.addRow("sams_q2_27_comp_ex_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's Q2 FY27 comp (ex-fuel)",
      val: raw.sams.compExFuelQ227,
    },
  })
  bridge.addRow("sams_fy26_comp_incl_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's FY26 comp (incl. fuel)",
      val: raw.sams.compInclFuelFy26,
    },
  })
  bridge.addRow("sams_fy26_comp_fuel_impact", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's FY26 comp fuel impact",
      val: raw.sams.compFuelImpactFy26,
    },
  })

  bridge.addRowGutter()
  bridge.addSectionHeader("PriceSmart FY26 cost & expense inputs")
  bridge.addRow("psmt_fy26_cost_of_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PSMT FY26 cost of sales ($M)",
      val: psmtPeer.costOfSalesFy26,
    },
  })
  bridge.addRow("psmt_fy26_sga", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "PSMT FY26 SG&A ($M)",
      val: psmtPeer.sgaFy26,
    },
  })
  bridge.addRow("psmt_fy26_pre_opening", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "PSMT FY26 pre-opening ($M)",
      val: psmtPeer.preOpeningFy26,
    },
  })
  bridge.addRow("psmt_fy26_loss_disposal", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "PSMT FY26 asset disposal ($M)",
      val: psmtPeer.lossDisposalIsFy26,
    },
  })

  return table
}
