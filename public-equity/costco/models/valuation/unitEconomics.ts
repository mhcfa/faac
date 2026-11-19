import type { Sheet, Table } from "f8-engine"
import type { ClubUnitEconEntity, CostcoKnowledgeData } from "../kg.ts"
import { rowFormatOptions } from "../timeline.ts"

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
    "Warehouse Club Unit Economics Benchmark: COST vs. Sam's Club, BJ's & PriceSmart ($M / Club / SqFt)",
    {
      subtitle: [
        "COST U.S. & Consolidated (FY26) vs. Sam's Club U.S. (H1 FY27 Annualized post-recast & FY26), BJ's (LTM Q2) & PriceSmart (FY26)",
        `Source: ${kg.citations.samsClub}`,
        kg.citations.warehouseMembership,
      ],
      currency: "USD",
    }
  )

  table.addColumn("line_item", {
    role: "descriptor",
    header: "Unit Economic Metric",
  })
  for (const colId of UNIT_ECON_COLS) {
    const colHdr = UNIT_ECON_COL_HEADERS[colId]
    table.addColumn(colId, {
      role: "measure",
      group: colHdr.group,
      headers: colHdr.headers,
    })
  }

  const raw = kg.market.clubUnitEconRaw
  const psmtPeer = kg.market.peers.psmt
  const kpis = kg.cost.operatingKpis
  const qoe = kg.cost.qoe

  const periodBasisNote = UNIT_ECON_COLS.map((c) => {
    const m = raw.meta[c]
    return `${m.label}: ${m.periodBasis} (${m.notes})`
  }).join(" | ")

  table.addSectionHeader("1. Physical Scale & Membership Base", {
    note: periodBasisNote,
  })
  table.addRow("clubs", {
    ...rowFormatOptions("integer"),
    cells: {
      line_item: {
        value: "Ending Warehouse / Club Count",
        note: periodBasisNote,
      },
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
      line_item: {
        value: "Sales Floor Area (M SqFt)",
        note: "BJ's omitted: Form 10-K/10-Q does not disclose total retail square footage.",
      },
      COST_US: kpis.warehouseSqftUsMillions.FY26,
      COST_TOTAL: kpis.warehouseSqftTotalMillions.FY26,
      WMT_SAMS_H1_ANN: raw.sams.sqftMillionsH127,
      WMT_SAMS_FY26: raw.sams.sqftMillionsFy26,
      BJ: null,
      PSMT: raw.psmt.sqftMillionsFy26,
    },
  })
  table.addRow("paid_members_m", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: {
        value: "Paid Membership Accounts (M)",
        note: "COST US & Sam's Club omitted: neither COST Note 11 nor WMT discloses standalone U.S. / Sam's numerical member counts.",
      },
      COST_US: null,
      COST_TOTAL: { expr: 'OperatingSchedule["paid_members_m", "FY26"]' },
      WMT_SAMS_H1_ANN: null,
      WMT_SAMS_FY26: null,
      BJ: raw.bj.paidMembersMillionsH127,
      PSMT: raw.psmt.paidMembersMillionsFy26,
    },
  })
  table.addRow("members_per_club_k", {
    ...rowFormatOptions("number", 1),
    cells: {
      line_item: "Paid Members per Club (k)",
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

  table.addSectionHeader("2. Revenue, Productivity & Profitability ($M)")
  table.addRow("net_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Net Merchandise Sales ($M)",
        note: "COST US omitted: Form 10-K Note 11 reports U.S. segment Total Revenue (incl. MFI) without a standalone MFI sub-split.",
      },
      COST_US: null,
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
      line_item: {
        value: "Membership Fee & Other Income ($M)",
        note: "COST US omitted: U.S.-only MFI is embedded inside U.S. Total Segment Revenue.",
      },
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
      line_item: "Total Revenue ($M)",
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
    style: "subtotal",
    highlight: true,
    expr: '@table["total_revenue", @col] / @table["clubs", @col]',
    cells: { line_item: "Annual Revenue per Club ($M / club)" },
  })
  table.addRow("rev_per_sqft", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Annual Revenue per SqFt ($ / SqFt)",
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
      line_item: {
        value: "Merchandise Gross Profit ex-MFI ($M)",
        note: "COST US omitted: Form 10-K Note 11 does not split U.S. MFI out of U.S. total segment revenue; see Total Gross Profit incl. MFI below.",
      },
      COST_US: null,
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
      line_item: "Merchandise Gross Margin (% of Net Sales, ex-MFI)",
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
      line_item: "Total Gross Profit incl. MFI & Other ($M)",
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
    cells: {
      line_item:
        "Total Gross Profit Margin incl. MFI (% of Total Revenue, apples-to-apples)",
    },
  })
  table.addRow("mfi_pct_rev", {
    ...rowFormatOptions("percentage", 2),
    cells: {
      line_item: "Membership & Other Income (% of Total Revenue)",
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
      line_item: "Operating / SG&A Expenses ($M)",
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
    cells: { line_item: "SG&A Expense (% of Total Revenue)" },
  })
  table.addRow("operating_income", {
    ...rowFormatOptions("currency", 0),
    style: "subtotal",
    cells: {
      line_item: "Operating Income / Segment EBIT ($M)",
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
    style: "subtotal",
    expr: '@table["operating_income", @col] / @table["total_revenue", @col]',
    cells: { line_item: "Operating Margin (EBIT %)" },
  })
  table.addRow("ebit_per_club", {
    ...rowFormatOptions("currency", 2),
    expr: '@table["operating_income", @col] / @table["clubs", @col]',
    cells: { line_item: "Operating Income per Club ($M / club)" },
  })
  table.addRow("da", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Depreciation & Amortization ($M)",
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
    cells: { line_item: "Segment / Club EBITDA ($M)" },
  })
  table.addRow("ebitda_margin_pct", {
    ...rowFormatOptions("percentage", 2),
    expr: '@table["ebitda", @col] / @table["total_revenue", @col]',
    cells: { line_item: "EBITDA Margin (%)" },
  })
  table.addRow("capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Capital Expenditures ($M)",
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
    expr: '@table["capex", @col] / @table["total_revenue", @col]',
    cells: { line_item: "CapEx Intensity (% of Total Revenue)" },
  })

  table.addSectionHeader("3. Membership Pricing, Renewal & Comp Sales KPIs")
  table.addRow("comp_ex_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Comparable Sales Growth (ex-Fuel)",
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
      line_item: {
        value: "Trailing 12M Membership Renewal Rate",
        note: "Sam's Club omitted: WMT does not disclose a numerical renewal rate for Sam's Club.",
      },
      COST_US: kpis.renewalRateUsCa.FY26,
      COST_TOTAL: kpis.renewalRateWw.FY26,
      WMT_SAMS_H1_ANN: null,
      WMT_SAMS_FY26: null,
      BJ: raw.bj.renewalRateFy26,
      PSMT: raw.psmt.renewalRateFy26,
    },
  })
  table.addRow("higher_tier_pct", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: {
        value: "Premium / Executive / Plus Member Share (%)",
        note: "Sam's Club omitted: WMT does not disclose Plus tier penetration.",
      },
      COST_US: {
        expr: 'ClubUnitEconBridge["cost_exec_members_m", "val"] / @table["paid_members_m", "COST_TOTAL"]',
      },
      COST_TOTAL: {
        expr: 'ClubUnitEconBridge["cost_exec_members_m", "val"] / @table["paid_members_m", "COST_TOTAL"]',
      },
      WMT_SAMS_H1_ANN: null,
      WMT_SAMS_FY26: null,
      BJ: raw.bj.higherTierPenetrationFy26,
      PSMT: raw.psmt.higherTierPenetrationFy26,
    },
  })
  table.addRow("entry_fee", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Entry Tier Annual Membership Fee ($)",
        note: "PSMT omitted: LatAm/Caribbean multi-country local fee tiers excluded from U.S. club fee comparison.",
      },
      COST_US: qoe.costEntryFee,
      COST_TOTAL: qoe.costEntryFee,
      WMT_SAMS_H1_ANN: raw.sams.entryFeeDollars,
      WMT_SAMS_FY26: raw.sams.entryFeeDollars,
      BJ: raw.bj.entryFeeDollars,
      PSMT: null,
    },
  })
  table.addRow("premium_fee", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: {
        value: "Premium / Rewards Tier Annual Fee ($)",
        note: "PSMT omitted: LatAm/Caribbean multi-country local fee tiers excluded from U.S. club fee comparison.",
      },
      COST_US: qoe.costPremiumFee,
      COST_TOTAL: qoe.costPremiumFee,
      WMT_SAMS_H1_ANN: raw.sams.premiumFeeDollars,
      WMT_SAMS_FY26: raw.sams.premiumFeeDollars,
      BJ: raw.bj.premiumFeeDollars,
      PSMT: null,
    },
  })

  // Supporting Schedule: As-Reported Segment & Peer Inputs for Club Unit Economics Bridges
  const bridge = sheet.addTable(
    "ClubUnitEconBridge",
    "Supporting Schedule — As-Reported Segment & Peer Inputs for Club Unit Economics ($M / %)",
    {
      subtitle: [
        "As-reported 6M H1 FY27 Sam's Club segment flows (annualized x2 in benchmark table),",
        "Q1/Q2 comp ex-fuel, COST U.S. merchandise costs & PriceSmart FY26 expense lines",
        `Source: ${kg.citations.samsClub}`,
      ],
      currency: "USD",
      below: table,
    }
  )
  bridge.addColumn("line_item", {
    role: "descriptor",
    header: "Audited Segment / Peer Input",
  })
  bridge.addColumn("val", {
    role: "measure",
    headers: ["Audited", "Value"],
  })

  bridge.addSectionHeader(
    "1. Costco U.S. Segment & Executive Membership Inputs (FY26)"
  )
  bridge.addRow("cost_us_merch_costs", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "COST U.S. Segment Merchandise Costs (10-K Note 11, $M)",
      val: raw.costUs.merchCostsFy26,
    },
  })
  bridge.addRow("cost_exec_members_m", {
    ...rowFormatOptions("number", 2),
    cells: {
      line_item: "COST Ending Executive Paid Memberships (10-K Item 7, M)",
      val: kpis.executiveMembersMillions.FY26,
    },
  })

  bridge.addSectionHeader(
    "2. Sam's Club U.S. H1 FY27 (6M Ended 2026-07-31) & FY26 Inputs"
  )
  bridge.addRow("sams_h1_net_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Net Sales ($M)",
      val: raw.sams.netSalesH127,
    },
  })
  bridge.addRow("sams_h1_mfi_other", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Membership & Other Income ($M)",
      val: raw.sams.mfiAndOtherH127,
    },
  })
  bridge.addRow("sams_h1_total_rev", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Total Revenues ($M)",
      val: raw.sams.totalRevH127,
    },
  })
  bridge.addRow("sams_h1_merch_gp", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Merchandise Gross Profit ($M)",
      val: raw.sams.merchGpH127,
    },
  })
  bridge.addRow("sams_h1_sga", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Operating / SG&A Expenses ($M)",
      val: raw.sams.sgaH127,
    },
  })
  bridge.addRow("sams_h1_ebit", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Operating Income ($M)",
      val: raw.sams.ebitH127,
    },
  })
  bridge.addRow("sams_h1_da", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Depreciation & Amortization ($M)",
      val: raw.sams.daH127,
    },
  })
  bridge.addRow("sams_h1_capex", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club H1 FY27 (6M) Capital Expenditures ($M)",
      val: raw.sams.capexH127,
    },
  })
  bridge.addRow("sams_fy26_cost_of_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "Sam's Club FY26 Cost of Sales ($M)",
      val: raw.sams.costOfSalesFy26,
    },
  })
  bridge.addRow("sams_q1_27_comp_ex_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's Club Q1 FY27 Comp Sales Growth ex-Fuel",
      val: raw.sams.compExFuelQ127,
    },
  })
  bridge.addRow("sams_q2_27_comp_ex_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's Club Q2 FY27 Comp Sales Growth ex-Fuel",
      val: raw.sams.compExFuelQ227,
    },
  })
  bridge.addRow("sams_fy26_comp_incl_fuel", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's Club FY26 Comp Sales Growth incl. Fuel",
      val: raw.sams.compInclFuelFy26,
    },
  })
  bridge.addRow("sams_fy26_comp_fuel_impact", {
    ...rowFormatOptions("percentage", 1),
    cells: {
      line_item: "Sam's Club FY26 Comp Sales Fuel Impact",
      val: raw.sams.compFuelImpactFy26,
    },
  })

  bridge.addSectionHeader(
    "3. PriceSmart (PSMT) FY26 Cost & Expense Inputs ($M)"
  )
  bridge.addRow("psmt_fy26_cost_of_sales", {
    ...rowFormatOptions("currency", 0),
    cells: {
      line_item: "PSMT FY26 Cost of Goods Sold ($M)",
      val: psmtPeer.costOfSalesFy26,
    },
  })
  bridge.addRow("psmt_fy26_sga", {
    ...rowFormatOptions("currency", 1),
    cells: {
      line_item: "PSMT FY26 Warehouse Club & General/Admin SG&A ($M)",
      val: psmtPeer.sgaFy26,
    },
  })
  bridge.addRow("psmt_fy26_pre_opening", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "PSMT FY26 Pre-Opening Expenses ($M)",
      val: psmtPeer.preOpeningFy26,
    },
  })
  bridge.addRow("psmt_fy26_loss_disposal", {
    ...rowFormatOptions("currency", 2),
    cells: {
      line_item: "PSMT FY26 Loss on Disposal of Assets ($M)",
      val: psmtPeer.lossDisposalIsFy26,
    },
  })

  return table
}
