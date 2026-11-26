import { Cell, type Sheet, type Table } from "f8-engine"
import {
  formatDriverBasisSource,
  formatDriverDiff,
  type AllScenarioDriverBundles,
  type Driver,
  type OperatingScalarDrivers,
  type OperatingVectorDrivers,
  type PeriodVector,
  type ValuationScalarDrivers,
} from "../assumptions/index.ts"
import type { AuditedModelData } from "../kg-extractors.ts"
import { SCALE_NOTE_USD_M } from "../scale.ts"
import {
  FORECAST_PERIODS,
  SCENARIO_INDEX,
  type ScenarioId,
} from "../timeline.ts"

const VECTOR_KEYS: readonly (keyof OperatingVectorDrivers)[] = [
  "foaRevenueGrowth",
  "foaOtherRevShareOfFoa",
  "rlRevenueGrowth",
  "foaCashOpexPctFoaRev",
  "rlOperatingLoss",
  "capexPctRevenue",
  "daPctBegNetPpe",
  "apPctRevenue",
  "opAccruedPctRevenue",
  "sbcPctRevenue",
  "commonDividendPerShare",
  "annualShareRepurchases",
] as const

const OPERATING_SCALAR_KEYS: readonly (keyof OperatingScalarDrivers)[] = [
  "q4RevenueGuidance",
  "q4RlRevenue",
  "q4FoaOtherRevenue",
  "fy26TotalGaapExpenses",
  "fy26RlOperatingLoss",
  "fy26TotalCapex",
  "q4DaAnnualizedRate",
  "q4SbcPctRevenue",
  "financeLeaseCapexShare",
  "effectiveTaxRate",
  "arDays",
  "prepaidPctRevenue",
  "annualLegalSettlementPayout",
  "cashYieldRate",
  "legacyDebtAvgCoupon",
  "revolverRate",
  "minimumOperatingCash",
  "netShareSettlementPctSbc",
  "annualGrossRsuDilutionShares",
  "rsuNetShareWithholdingRate",
  "revenueStressShockPct",
] as const

const VALUATION_SCALAR_KEYS: readonly (keyof ValuationScalarDrivers)[] = [
  "equityRiskPremium",
  "betaRegimeSelector",
  "terminalGrowthRate",
  "terminalRonic",
  "midYearDiscountingFlag",
  "mcpDividendQuartersRemaining",
] as const

function assertExhaustiveKeys<T extends object>(
  keys: readonly (keyof T)[],
  record: T,
  name: string
): void {
  const actual = Object.keys(record)
  const expected = new Set<string>(keys.map(String))
  if (actual.length !== expected.size || actual.some((k) => !expected.has(k))) {
    throw new Error(`${name} key registry out of sync with driver record`)
  }
}

function vectorDiffersFromBase(
  candidate: PeriodVector,
  base: PeriodVector
): boolean {
  return FORECAST_PERIODS.some((p) => candidate[p] !== base[p])
}

export const ALL_VECTOR_DRIVER_IDS: readonly string[] = VECTOR_KEYS
export const ALL_SCALAR_DRIVER_IDS: readonly string[] = [
  ...OPERATING_SCALAR_KEYS,
  ...VALUATION_SCALAR_KEYS,
]

function addPeriodVectorTable(
  sheet: Sheet,
  id: string,
  title: string,
  subtitle: readonly string[],
  vectors: OperatingVectorDrivers | null,
  options: {
    readonly isActiveSelector?: boolean
    readonly referenceVectors?: OperatingVectorDrivers
    readonly notesMode: "basisSource" | "diff" | "basis"
    readonly baseVectorsForDiff?: OperatingVectorDrivers
  }
): Table {
  const table = sheet.addTable(id, title, {
    subtitle,
  })

  table.addColumn("label", {
    role: "descriptor",
    header: "Operating Assumption",
  })

  for (const p of FORECAST_PERIODS) {
    table.addColumn(p, {
      header: p,
      group: "Forecast",
    })
  }

  const notesHeader =
    options.notesMode === "basisSource"
      ? "Basis / Source"
      : options.notesMode === "diff"
        ? "Flex vs. Base"
        : "Basis"
  table.addColumn("notes", {
    role: "descriptor",
    header: notesHeader,
  })

  const metaSource = vectors ?? options.referenceVectors
  if (metaSource === undefined) {
    throw new Error(`Missing metadata source for ${id}`)
  }

  let currentCategory = ""
  for (const key of VECTOR_KEYS) {
    const drv: Driver<PeriodVector> = metaSource[key]
    if (drv.meta.category !== currentCategory) {
      if (currentCategory !== "") {
        table.addRowGutter()
      }
      currentCategory = drv.meta.category
      table.addSectionHeader(currentCategory)
    }

    let noteVal: string | null = null
    if (options.notesMode === "basisSource") {
      noteVal = formatDriverBasisSource(drv.meta)
    } else if (options.notesMode === "basis") {
      noteVal = drv.meta.basis ?? null
    } else if (
      vectors !== null &&
      options.baseVectorsForDiff !== undefined &&
      vectorDiffersFromBase(
        vectors[key].value,
        options.baseVectorsForDiff[key].value
      )
    ) {
      noteVal = formatDriverDiff(drv.meta)
    }

    const rowOpts: {
      cells: Record<string, Cell | number | string | null>
      expr?: string
      format: Driver<PeriodVector>["meta"]["format"]
      decimals?: number
    } = {
      cells: {
        label: new Cell({ value: drv.meta.label }),
        notes: noteVal,
      },
      format: drv.meta.format,
    }

    if (drv.meta.decimals !== undefined) {
      rowOpts.decimals = drv.meta.decimals
    }

    if (options.isActiveSelector === true) {
      rowOpts.expr =
        'CHOOSE(ScenarioControl["active", "val"], VectorDriversDownside[@row, @col], VectorDriversBase[@row, @col], VectorDriversUpside[@row, @col])'
    } else if (vectors !== null) {
      for (const p of FORECAST_PERIODS) {
        rowOpts.cells[p] = vectors[key].value[p]
      }
    }

    table.addRow(key, rowOpts)
  }

  return table
}

export function buildAssumptionsSheet(
  sheet: Sheet,
  activeScenario: ScenarioId,
  bundles: AllScenarioDriverBundles,
  data: AuditedModelData
): void {
  assertExhaustiveKeys(
    VECTOR_KEYS,
    bundles.base.vectors,
    "OperatingVectorDrivers"
  )
  assertExhaustiveKeys(
    OPERATING_SCALAR_KEYS,
    bundles.base.operating,
    "OperatingScalarDrivers"
  )
  assertExhaustiveKeys(
    VALUATION_SCALAR_KEYS,
    bundles.base.valuation,
    "ValuationScalarDrivers"
  )

  // =========================================================================
  // Single-Lane Vertical Stack (Cols B..H): Scenario Selection & Drivers
  // =========================================================================
  const control = sheet.addTable(
    "ScenarioControl",
    "Active Scenario Selection",
    {
      subtitle: [
        "1 = Downside, 2 = Base, 3 = Upside",
        "Updates statements, valuation & attributions live",
      ],
    }
  )
  control.addColumn("label", { role: "descriptor", header: "Parameter" })
  control.addColumn("val", { header: "Value" })
  control.addSectionHeader("Active case selection")
  control.addRow("active", {
    cells: {
      label: new Cell({
        value: "Active scenario index (1=Downside, 2=Base, 3=Upside)",
      }),
      val: new Cell({
        value: SCENARIO_INDEX[activeScenario],
        note: "Set to 1 (Downside), 2 (Base), or 3 (Upside) to recalculate all linked schedules.",
      }),
    },
    format: "integer",
    highlight: true,
  })
  control.addRow("active_name", {
    cells: {
      label: new Cell({ value: "Active scenario name" }),
      val: new Cell({
        expr: 'IF(@table["active", "val"] = 1, "Downside", IF(@table["active", "val"] = 2, "Base", "Upside"))',
        format: "text",
      }),
    },
    format: "text",
    style: "bold",
  })

  const vecActive = addPeriodVectorTable(
    sheet,
    "VectorDriversActive",
    "Active Multi-Year Operating Assumptions (FY2027E–FY2031E)",
    [SCALE_NOTE_USD_M, "Linked dynamically to the active scenario selection"],
    null,
    {
      isActiveSelector: true,
      referenceVectors: bundles.base.vectors,
      notesMode: "basisSource",
    }
  )

  const vecDown = addPeriodVectorTable(
    sheet,
    "VectorDriversDownside",
    "Downside Case — Multi-Year Operating Assumptions",
    [
      SCALE_NOTE_USD_M,
      "Flexed operating assumptions relative to Base Case (unchanged lines left blank in Flex column)",
    ],
    bundles.downside.vectors,
    {
      notesMode: "diff",
      baseVectorsForDiff: bundles.base.vectors,
    }
  )
  const vecBase = addPeriodVectorTable(
    sheet,
    "VectorDriversBase",
    "Base Case — Multi-Year Operating Assumptions",
    [
      SCALE_NOTE_USD_M,
      "Baseline forecast anchored on Q4/FY26 management guidance and historical run-rates",
    ],
    bundles.base.vectors,
    {
      notesMode: "basis",
    }
  )
  const vecUp = addPeriodVectorTable(
    sheet,
    "VectorDriversUpside",
    "Upside Case — Multi-Year Operating Assumptions",
    [
      SCALE_NOTE_USD_M,
      "Flexed operating assumptions relative to Base Case (unchanged lines left blank in Flex column)",
    ],
    bundles.upside.vectors,
    {
      notesMode: "diff",
      baseVectorsForDiff: bundles.base.vectors,
    }
  )

  // =========================================================================
  // Scenario Framing, Core Assumptions & Post-Q3 Financing Schedule (Cols B..H)
  // =========================================================================
  const framing = sheet.addTable(
    "ScenarioFraming",
    "Scenario Framing & Operating Summary",
    {
      subtitle: ["Qualitative operating and valuation summary by scenario"],
    }
  )
  framing.addColumn("label", {
    role: "descriptor",
    header: "Scenario Narrative",
  })
  framing.addSectionHeader("Downside Case")
  framing.addRow("downside", {
    cells: { label: bundles.downside.framing },
  })
  framing.addRowGutter()
  framing.addSectionHeader("Base Case")
  framing.addRow("base", {
    cells: { label: bundles.base.framing },
  })
  framing.addRowGutter()
  framing.addSectionHeader("Upside Case")
  framing.addRow("upside", {
    cells: { label: bundles.upside.framing },
  })

  const scalars = sheet.addTable(
    "ScalarDrivers",
    "Core Operating, Balance Sheet & Valuation Assumptions",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Active column updates live; Base column anchors scenario variance attribution",
      ],
    }
  )
  scalars.addColumn("label", { role: "descriptor", header: "Assumption" })
  scalars.addColumn("active", {
    header: "Active",
    group: "Selected",
    style: "bold",
    shade: "muted",
  })
  scalars.addColumn("downside", {
    header: "Downside",
    group: "Scenario Inputs",
  })
  scalars.addColumn("base", { header: "Base", group: "Scenario Inputs" })
  scalars.addColumn("upside", { header: "Upside", group: "Scenario Inputs" })
  scalars.addColumnGutter()
  scalars.addColumn("notes", {
    role: "descriptor",
    header: "Basis / Source",
  })

  let curCat = ""
  const addScalarRow = (
    key: string,
    dDown: Driver<number>,
    dBase: Driver<number>,
    dUp: Driver<number>
  ): void => {
    if (dBase.meta.category !== curCat) {
      if (curCat !== "") {
        scalars.addRowGutter()
      }
      curCat = dBase.meta.category
      scalars.addSectionHeader(curCat)
    }
    const rowOpts: {
      cells: Record<string, Cell | number | string | null>
      format: Driver<number>["meta"]["format"]
      decimals?: number
    } = {
      cells: {
        label: new Cell({ value: dBase.meta.label }),
        active: new Cell({
          expr: 'CHOOSE(ScenarioControl["active", "val"], @table[@row, "downside"], @table[@row, "base"], @table[@row, "upside"])',
        }),
        downside: dDown.value,
        base: dBase.value,
        upside: dUp.value,
        notes: formatDriverBasisSource(dBase.meta),
      },
      format: dBase.meta.format,
    }
    if (dBase.meta.decimals !== undefined) {
      rowOpts.decimals = dBase.meta.decimals
    }
    scalars.addRow(key, rowOpts)
  }

  for (const key of OPERATING_SCALAR_KEYS) {
    addScalarRow(
      key,
      bundles.downside.operating[key],
      bundles.base.operating[key],
      bundles.upside.operating[key]
    )
  }
  for (const key of VALUATION_SCALAR_KEYS) {
    addScalarRow(
      key,
      bundles.downside.valuation[key],
      bundles.base.valuation[key],
      bundles.upside.valuation[key]
    )
  }

  // Post-Q3 2026 Financing & Capital Structure Schedule (Cols B..D)
  const reg = sheet.addTable(
    "PostQ3FinancingRegistry",
    "Post-Q3 2026 Financing & Capital Structure Schedule",
    {
      subtitle: [
        SCALE_NOTE_USD_M,
        "Meta Platforms Form 8-K filings (Oct 29, Nov 5, Nov 12, 2026)",
        "Gross face principal, fixed coupons & Federal Reserve H.10 EUR/USD",
      ],
    }
  )
  reg.addColumn("label", { role: "descriptor", header: "Instrument / Term" })
  reg.addColumn("val", { header: "Value" })
  reg.addColumn("coupon", { headers: ["Coupon /", "Rate"] })

  const f = (rowId: string, periodKey: string): number =>
    data.val("meta_post_q3_financings", rowId, periodKey, { entity: "META" })

  // Section 1: Nov 5 USD Notes
  reg.addSectionHeader("Nov 5, 2026 USD Senior Notes")
  const usdTranches = [
    [
      "nov_usd_2031",
      "2031 USD Senior Notes",
      "usd_notes_2031_principal",
      "usd_notes_2031_coupon",
    ],
    [
      "nov_usd_2033",
      "2033 USD Senior Notes",
      "usd_notes_2033_principal",
      "usd_notes_2033_coupon",
    ],
    [
      "nov_usd_2036",
      "2036 USD Senior Notes (10Y marginal Kd)",
      "usd_notes_2036_principal",
      "usd_notes_2036_coupon",
    ],
    [
      "nov_usd_2046",
      "2046 USD Senior Notes",
      "usd_notes_2046_principal",
      "usd_notes_2046_coupon",
    ],
    [
      "nov_usd_2056",
      "2056 USD Senior Notes",
      "usd_notes_2056_principal",
      "usd_notes_2056_coupon",
    ],
  ] as const

  for (const [rowId, label, pKey, cKey] of usdTranches) {
    reg.addRow(rowId, {
      cells: {
        label: new Cell({ value: label }),
        val: new Cell({
          value: f(pKey, "2026-11-05"),
          format: "currency",
          decimals: 0,
        }),
        coupon: new Cell({
          value: f(cKey, "2026-11-05"),
          format: "percentage",
          decimals: 2,
        }),
      },
    })
  }
  reg.addRow("nov_usd_notes_total", {
    cells: {
      label: new Cell({ value: "Total Nov 2026 USD Senior Notes" }),
      val: new Cell({
        expr: 'SUM(@table["nov_usd_2031".."nov_usd_2056", "val"])',
        format: "currency",
        decimals: 0,
      }),
      coupon: new Cell({
        expr: 'SUMPRODUCT(@table["nov_usd_2031".."nov_usd_2056", "val"], @table["nov_usd_2031".."nov_usd_2056", "coupon"]) / @table["nov_usd_notes_total", "val"]',
        format: "percentage",
        decimals: 2,
      }),
    },
    style: "subtotal",
  })

  // Section 2: Nov 12 EUR Notes
  reg.addRowGutter()
  reg.addSectionHeader("Nov 12, 2026 EUR Senior Notes (EUR Millions)")
  const eurTranches = [
    [
      "nov_eur_2031",
      "2031 EUR Senior Notes (EUR M)",
      "eur_notes_2031_principal",
      "eur_notes_2031_coupon",
    ],
    [
      "nov_eur_2033",
      "2033 EUR Senior Notes (EUR M)",
      "eur_notes_2033_principal",
      "eur_notes_2033_coupon",
    ],
    [
      "nov_eur_2035",
      "2035 EUR Senior Notes (EUR M)",
      "eur_notes_2035_principal",
      "eur_notes_2035_coupon",
    ],
    [
      "nov_eur_2038",
      "2038 EUR Senior Notes (EUR M)",
      "eur_notes_2038_principal",
      "eur_notes_2038_coupon",
    ],
    [
      "nov_eur_2044",
      "2044 EUR Senior Notes (EUR M)",
      "eur_notes_2044_principal",
      "eur_notes_2044_coupon",
    ],
    [
      "nov_eur_2065",
      "2065 EUR Senior Notes (EUR M)",
      "eur_notes_2065_principal",
      "eur_notes_2065_coupon",
    ],
  ] as const

  for (const [rowId, label, pKey, cKey] of eurTranches) {
    reg.addRow(rowId, {
      cells: {
        label: new Cell({ value: label }),
        val: new Cell({
          value: f(pKey, "2026-11-12"),
          format: "currency",
          currency: "EUR",
          decimals: 0,
        }),
        coupon: new Cell({
          value: f(cKey, "2026-11-12"),
          format: "percentage",
          decimals: 2,
        }),
      },
    })
  }
  reg.addRow("nov_eur_notes_total_eur", {
    cells: {
      label: new Cell({ value: "Total Nov 2026 EUR Senior Notes (EUR M)" }),
      val: new Cell({
        expr: 'SUM(@table["nov_eur_2031".."nov_eur_2065", "val"])',
        format: "currency",
        currency: "EUR",
        decimals: 0,
      }),
      coupon: new Cell({
        expr: 'SUMPRODUCT(@table["nov_eur_2031".."nov_eur_2065", "val"], @table["nov_eur_2031".."nov_eur_2065", "coupon"]) / @table["nov_eur_notes_total_eur", "val"]',
        format: "percentage",
        decimals: 2,
      }),
    },
    style: "subtotal",
  })
  reg.addRow("eur_usd_fx_nov12", {
    cells: {
      label: new Cell({ value: "EUR/USD spot rate (Nov 12, 2026)" }),
      val: new Cell({
        value: data.val("macro_rates", "eur_usd", "2026-11-12", {
          entity: "US",
        }),
        format: "number",
        decimals: 4,
        note: "Federal Reserve H.10 daily EUR/USD exchange rate on EUR notes pricing date (Nov 12, 2026).",
      }),
      coupon: null,
    },
  })
  reg.addRow("nov_eur_notes_total_usd", {
    cells: {
      label: new Cell({
        value: "Total Nov 2026 EUR Senior Notes (USD M equiv.)",
      }),
      val: new Cell({
        expr: '@table["nov_eur_notes_total_eur", "val"] * @table["eur_usd_fx_nov12", "val"]',
        format: "currency",
        decimals: 1,
      }),
      coupon: new Cell({
        expr: '@table["nov_eur_notes_total_eur", "coupon"]',
        format: "percentage",
        decimals: 2,
      }),
    },
    style: "subtotal",
  })
  reg.addRow("nov_eur_2031_usd", {
    cells: {
      label: new Cell({
        value: "2031 EUR Senior Notes maturity (USD M equiv.)",
      }),
      val: new Cell({
        expr: '@table["nov_eur_2031", "val"] * @table["eur_usd_fx_nov12", "val"]',
        format: "currency",
        decimals: 1,
      }),
      coupon: null,
    },
  })

  // Section 3: Oct 29 Mandatory Convertible Preferred (METAM)
  reg.addRowGutter()
  reg.addSectionHeader("Oct 29, 2026 Series A Mandatory Convertible Preferred")
  reg.addRow("mcp_base_liq_pref", {
    cells: {
      label: new Cell({
        value: "Series A Mandatory Convertible Preferred (base)",
      }),
      val: new Cell({
        value: f("mcp_base_liquidation_preference", "2026-10-29"),
        format: "currency",
        decimals: 0,
        note: "Excludes unexercised $1,875M 30-day over-allotment option expiring Nov 25, 2026; 6.50% annual dividend through Aug 15, 2029 mandatory conversion.",
      }),
      coupon: new Cell({
        value: f("mcp_dividend_rate", "2026-10-29"),
        format: "percentage",
        decimals: 2,
      }),
    },
  })
  reg.addRow("mcp_base_dep_shares", {
    cells: {
      label: new Cell({ value: "Depositary shares issued (millions)" }),
      val: new Cell({
        value: f("mcp_base_depositary_shares", "2026-10-29"),
        format: "number",
        decimals: 1,
      }),
      coupon: null,
    },
  })
  reg.addRow("mcp_max_conv_rate", {
    cells: {
      label: new Cell({
        value: "Maximum conversion rate per depositary share",
      }),
      val: new Cell({
        value: f("mcp_max_conversion_rate_depositary", "2026-10-29"),
        format: "number",
        decimals: 4,
      }),
      coupon: null,
    },
  })
  reg.addRow("mcp_min_conv_rate", {
    cells: {
      label: new Cell({
        value: "Minimum conversion rate per depositary share",
      }),
      val: new Cell({
        value: f("mcp_min_conversion_rate_depositary", "2026-10-29"),
        format: "number",
        decimals: 4,
      }),
      coupon: null,
    },
  })
  reg.addRow("mcp_max_shares", {
    cells: {
      label: new Cell({
        value: "Maximum Class A conversion shares (M; < $625.00)",
      }),
      val: new Cell({
        expr: '@table["mcp_base_dep_shares", "val"] * @table["mcp_max_conv_rate", "val"]',
        format: "number",
        decimals: 3,
      }),
      coupon: null,
    },
  })
  reg.addRow("mcp_min_shares", {
    cells: {
      label: new Cell({
        value: "Minimum Class A conversion shares (M; > $734.21)",
      }),
      val: new Cell({
        expr: '@table["mcp_base_dep_shares", "val"] * @table["mcp_min_conv_rate", "val"]',
        format: "number",
        decimals: 3,
      }),
      coupon: null,
    },
  })
  reg.addRow("mcp_lower_threshold", {
    cells: {
      label: new Cell({
        value: "Initial conversion price threshold ($/share)",
      }),
      val: new Cell({
        expr: '@table["mcp_base_liq_pref", "val"] / @table["mcp_max_shares", "val"]',
        format: "currency",
        decimals: 2,
      }),
      coupon: null,
    },
  })
  reg.addRow("mcp_upper_threshold", {
    cells: {
      label: new Cell({ value: "Threshold appreciation price ($/share)" }),
      val: new Cell({
        expr: '@table["mcp_base_liq_pref", "val"] / @table["mcp_min_shares", "val"]',
        format: "currency",
        decimals: 2,
      }),
      coupon: null,
    },
  })

  // Section 4: Nov 4 Forward Common Equity Sale
  reg.addRowGutter()
  reg.addSectionHeader("Nov 4, 2026 Class A Common Forward Sale Agreements")
  reg.addRow("fwd_initial_shares", {
    cells: {
      label: new Cell({ value: "Forward sale base Class A shares (M)" }),
      val: new Cell({
        value: f("fwd_common_initial_shares", "2026-10-29"),
        format: "number",
        decimals: 1,
      }),
      coupon: null,
    },
  })
  reg.addRow("fwd_greenshoe_shares", {
    cells: {
      label: new Cell({
        value: "Forward sale exercised over-allotment shares (M)",
      }),
      val: new Cell({
        value: f("fwd_common_greenshoe_exercised_shares", "2026-11-05"),
        format: "number",
        decimals: 1,
      }),
      coupon: null,
    },
  })
  reg.addRow("fwd_total_shares", {
    cells: {
      label: new Cell({ value: "Total Class A forward sale shares (M)" }),
      val: new Cell({
        expr: '@table["fwd_initial_shares", "val"] + @table["fwd_greenshoe_shares", "val"]',
        format: "number",
        decimals: 1,
      }),
      coupon: null,
    },
    style: "subtotal",
  })
  reg.addRow("fwd_initial_price", {
    cells: {
      label: new Cell({ value: "Initial forward sale price ($/share)" }),
      val: new Cell({
        value: f("fwd_common_initial_price", "2026-10-29"),
        format: "currency",
        decimals: 2,
      }),
      coupon: null,
    },
  })
  reg.addRow("fwd_gross_proceeds", {
    cells: {
      label: new Cell({
        value: "Forward sale gross proceeds (settles by Nov 2027)",
      }),
      val: new Cell({
        expr: '@table["fwd_total_shares", "val"] * @table["fwd_initial_price", "val"]',
        format: "currency",
        decimals: 1,
        note: "Cash proceeds received upon physical share settlement by Nov 19, 2027.",
      }),
      coupon: null,
    },
    style: "subtotal",
  })

  // Section 5: Consolidated Post-Q3 Summary Totals
  reg.addRowGutter()
  reg.addSectionHeader("Consolidated Post-Q3 Capital Raises Summary")
  reg.addRow("total_closed_q4_debt", {
    cells: {
      label: new Cell({
        value: "Total closed Nov 2026 senior notes (USD + EUR)",
      }),
      val: new Cell({
        expr: '@table["nov_usd_notes_total", "val"] + @table["nov_eur_notes_total_usd", "val"]',
        format: "currency",
        decimals: 1,
      }),
      coupon: null,
    },
    style: "subtotal",
  })
  reg.addRow("total_closed_q4_cash", {
    cells: {
      label: new Cell({
        value: "Total closed Q4 2026 cash proceeds (Notes + Pref.)",
      }),
      val: new Cell({
        expr: '@table["total_closed_q4_debt", "val"] + @table["mcp_base_liq_pref", "val"]',
        format: "currency",
        decimals: 1,
      }),
      coupon: null,
    },
    style: "total",
  })

  sheet.setBands([
    control,
    framing,
    { lanes: [vecActive], pageBreakBefore: true },
    { lanes: [vecDown], pageBreakBefore: true },
    { lanes: [vecBase], pageBreakBefore: true },
    { lanes: [vecUp], pageBreakBefore: true },
    { lanes: [scalars], pageBreakBefore: true },
    { lanes: [reg], pageBreakBefore: true },
  ])
}
