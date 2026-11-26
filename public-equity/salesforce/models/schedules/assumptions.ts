import { Cell, type Sheet, type Table } from "f8-engine"
import {
  formatDriverProvenance,
  PERIOD_DRIVER_KEYS,
  SCALAR_DRIVER_KEYS,
  type AllScenarioBundles,
  type PeriodDriverKey,
  type ScenarioBundle,
} from "../assumptions/index.ts"
import type { AuditedDataSnapshot } from "../kg.ts"
import {
  addForecastColumns,
  FORECAST_PERIODS,
  SCENARIO_INDEX,
  wrapSubtitle,
  type ScenarioKey,
} from "../timeline.ts"

function periodFlexLabel(
  key: PeriodDriverKey,
  bundle: ScenarioBundle,
  base: ScenarioBundle
): string {
  const isSame = FORECAST_PERIODS.every(
    (p) => bundle.periods[key].value[p] === base.periods[key].value[p]
  )
  return isSame
    ? "Held at Base"
    : (bundle.periods[key].meta.basis ?? "Flexed vs. Base")
}

function addPeriodDriverTable(
  sheet: Sheet,
  id: string,
  title: string,
  subtitle: readonly string[],
  bundle: ScenarioBundle,
  baseBundle: ScenarioBundle
): Table {
  const table = sheet.addTable(id, title, {
    subtitle,
  })
  addForecastColumns(table, "Assumption")
  table.addColumn("provenance", {
    role: "descriptor",
    header: bundle.key === "base" ? "Basis / Source" : "Flex vs. Base",
  })

  let lastCategory = ""
  for (const key of PERIOD_DRIVER_KEYS) {
    const driver = bundle.periods[key]
    if (driver.meta.category !== lastCategory) {
      if (lastCategory !== "") {
        table.addRowGutter()
      }
      table.addSectionHeader(driver.meta.category)
      lastCategory = driver.meta.category
    }
    const provText =
      bundle.key === "base"
        ? formatDriverProvenance(driver.meta)
        : periodFlexLabel(key, bundle, baseBundle)
    const cells: Record<string, Cell | number | string> = {
      item: driver.meta.label,
      provenance: provText,
    }
    for (const period of FORECAST_PERIODS) {
      cells[period] = driver.value[period]
    }
    table.addRow(key, {
      cells,
      format: driver.meta.format,
      ...(driver.meta.decimals !== undefined
        ? { decimals: driver.meta.decimals }
        : {}),
    })
  }
  return table
}

const MONTH_NAME_TO_NUM: Readonly<Record<string, number>> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
}

function parseMaturityDate(maturityDate: string): {
  readonly year: number
  readonly month: number
} {
  const parts = maturityDate.trim().split(/\s+/)
  const monthName = parts[0]
  const yearStr = parts[1]
  if (monthName === undefined || yearStr === undefined) {
    throw new Error(`Invalid debt maturity date format: "${maturityDate}"`)
  }
  const month = MONTH_NAME_TO_NUM[monthName]
  const year = Number(yearStr)
  if (month === undefined || !Number.isInteger(year) || year < 2026) {
    throw new Error(`Invalid debt maturity date components: "${maturityDate}"`)
  }
  return { year, month }
}

export interface AssumptionsTables {
  readonly scenarioControl: Table
  readonly scenarioGuide: Table
  readonly scalarDrivers: Table
  readonly periodDriversActive: Table
  readonly periodDriversDownside: Table
  readonly periodDriversBase: Table
  readonly periodDriversUpside: Table
  readonly debtTrancheRegistry: Table
}

export function buildAssumptionsSheet(
  sheet: Sheet,
  scenarios: AllScenarioBundles,
  activeScenario: ScenarioKey,
  audited: AuditedDataSnapshot
): AssumptionsTables {
  const scenarioControl = sheet.addTable(
    "ScenarioControl",
    "Active Scenario Control",
    {
      subtitle: "1 = Downside | 2 = Base | 3 = Upside (live toggle)",
    }
  )
  scenarioControl.addColumn("item", { role: "descriptor", header: "Control" })
  scenarioControl.addColumn("val", { header: "Active" })

  scenarioControl.addRow("active", {
    cells: {
      item: "Active scenario selector (1 / 2 / 3)",
      val: new Cell({
        value: SCENARIO_INDEX[activeScenario],
        highlight: true,
      }),
    },
    format: "integer",
  })

  const scenarioGuide = sheet.addTable("ScenarioGuide", "Scenario Case Guide")
  scenarioGuide.addColumn("item", { role: "descriptor", header: "Case" })
  scenarioGuide.addColumn("idx", {
    header: "Index",
    format: "integer",
  })
  scenarioGuide.addColumn("summary", {
    role: "descriptor",
    header: "Operating & valuation regime",
  })
  scenarioGuide.addRow("downside", {
    cells: {
      item: "Downside",
      idx: SCENARIO_INDEX.downside,
      summary: "Seat pressure, higher AI cost, sticky SBC, wider cut",
    },
  })
  scenarioGuide.addRow("base", {
    cells: {
      item: "Base",
      idx: SCENARIO_INDEX.base,
      summary: "Grounded fade, steady margin, float-offset reinv.",
    },
    style: "bold",
    shade: "muted",
  })
  scenarioGuide.addRow("upside", {
    cells: {
      item: "Upside",
      idx: SCENARIO_INDEX.upside,
      summary: "AI re-acceleration, GTM leverage, float tailwind",
    },
  })

  // Key Valuation, Capital Structure & Operating Assumptions (Active + Downside / Base / Upside)
  const scalarDrivers = sheet.addTable(
    "ScalarDrivers",
    "Valuation, Capital Structure & Operating Assumptions",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except per-share and percentages) | Active Case links live to Scenario Control",
        148
      ),
    }
  )
  scalarDrivers.addColumn("item", { role: "descriptor", header: "Assumption" })
  scalarDrivers.addColumn("active", {
    header: "Active",
    style: "bold",
    shade: "muted",
  })
  scalarDrivers.addColumn("downside", {
    header: "Downside",
  })
  scalarDrivers.addColumn("base", { header: "Base" })
  scalarDrivers.addColumn("upside", {
    header: "Upside",
  })
  scalarDrivers.addColumn("provenance", {
    role: "descriptor",
    header: "Basis / Source",
  })

  let lastScalarCategory = ""
  for (const key of SCALAR_DRIVER_KEYS) {
    const downDrv = scenarios.downside.scalars[key]
    const baseDrv = scenarios.base.scalars[key]
    const upDrv = scenarios.upside.scalars[key]
    if (baseDrv.meta.category !== lastScalarCategory) {
      if (lastScalarCategory !== "") {
        scalarDrivers.addRowGutter()
      }
      scalarDrivers.addSectionHeader(baseDrv.meta.category)
      lastScalarCategory = baseDrv.meta.category
    }
    scalarDrivers.addRow(key, {
      cells: {
        item: baseDrv.meta.label,
        active: new Cell({
          expr: 'CHOOSE(ScenarioControl["active", "val"], @table[@row, "downside"], @table[@row, "base"], @table[@row, "upside"])',
        }),
        downside: downDrv.value,
        base: baseDrv.value,
        upside: upDrv.value,
        provenance: formatDriverProvenance(baseDrv.meta),
      },
      format: baseDrv.meta.format,
      ...(baseDrv.meta.decimals !== undefined
        ? { decimals: baseDrv.meta.decimals }
        : {}),
    })
  }

  // Active Multi-Year Operating & Capital Allocation Assumptions (FY27E-FY31E)
  const periodDriversActive = sheet.addTable(
    "PeriodDriversActive",
    "Active Multi-Year Operating & Capital Allocation Assumptions",
    {
      subtitle: wrapSubtitle(
        "($ in Millions, except per-share, days, and percentages) | Live active-case forecast inputs",
        148
      ),
    }
  )
  addForecastColumns(periodDriversActive, "Assumption")
  periodDriversActive.addColumn("provenance", {
    role: "descriptor",
    header: "Basis / Source",
  })

  let lastActiveCat = ""
  for (const key of PERIOD_DRIVER_KEYS) {
    const baseDrv = scenarios.base.periods[key]
    if (baseDrv.meta.category !== lastActiveCat) {
      if (lastActiveCat !== "") {
        periodDriversActive.addRowGutter()
      }
      periodDriversActive.addSectionHeader(baseDrv.meta.category)
      lastActiveCat = baseDrv.meta.category
    }
    periodDriversActive.addRow(key, {
      cells: {
        item: baseDrv.meta.label,
        provenance: formatDriverProvenance(baseDrv.meta),
      },
      expr: 'CHOOSE(ScenarioControl["active", "val"], PeriodDriversDownside[@row, @col], PeriodDriversBase[@row, @col], PeriodDriversUpside[@row, @col])',
      format: baseDrv.meta.format,
      ...(baseDrv.meta.decimals !== undefined
        ? { decimals: baseDrv.meta.decimals }
        : {}),
    })
  }

  const periodDriversDownside = addPeriodDriverTable(
    sheet,
    "PeriodDriversDownside",
    "Downside Case Multi-Year Assumptions",
    wrapSubtitle(scenarios.downside.framing, 148),
    scenarios.downside,
    scenarios.base
  )

  const periodDriversBase = addPeriodDriverTable(
    sheet,
    "PeriodDriversBase",
    "Base Case Multi-Year Assumptions",
    wrapSubtitle(scenarios.base.framing, 148),
    scenarios.base,
    scenarios.base
  )

  const periodDriversUpside = addPeriodDriverTable(
    sheet,
    "PeriodDriversUpside",
    "Upside Case Multi-Year Assumptions",
    wrapSubtitle(scenarios.upside.framing, 148),
    scenarios.upside,
    scenarios.base
  )

  // Note 8 Debt Tranche Registry (Audited Q2 FY27 Senior Notes & Term Loan)
  const debtTrancheRegistry = sheet.addTable(
    "DebtTrancheRegistry",
    "Debt Tranche Registry (As of Q2 FY27 — July 31, 2026)",
    {
      subtitle: wrapSubtitle(
        [
          `($ in Millions) | Source: ${audited.citations.crmDebt} (Note 8)`,
          "Fixed-rate tranches priced as of Nov 18, 2026 via semi-annual PV at Single-A marginal Kd (plus 20Y–40Y term premium for 2041–2066 maturities); floating-rate term loan held at carrying value.",
        ],
        148
      ),
    }
  )
  debtTrancheRegistry.addColumn("item", {
    role: "descriptor",
    header: "Debt instrument",
  })
  debtTrancheRegistry.addColumn("coupon", {
    headers: ["Coupon", "Rate"],
    group: "Audited Terms",
    format: "percentage",
    decimals: 2,
  })
  debtTrancheRegistry.addColumn("principal", {
    headers: ["Principal", "($M)"],
    group: "Audited Terms",
    format: "currency",
    decimals: 0,
  })
  debtTrancheRegistry.addColumn("carrying", {
    headers: ["Carrying", "Val. ($M)"],
    group: "Audited Terms",
    format: "currency",
    decimals: 0,
  })
  debtTrancheRegistry.addColumn("mat_fy", {
    headers: ["Maturity", "Fiscal Yr"],
    group: "Audited Terms",
    format: "integer",
  })
  debtTrancheRegistry.addColumn("annual_interest", {
    headers: ["Run-Rate", "Int. ($M)"],
    group: "Audited Terms",
    format: "currency",
    decimals: 1,
  })
  debtTrancheRegistry.addColumn("ytm", {
    headers: ["Pricing", "YTM"],
    group: "Fair Value Pricing",
    format: "percentage",
    decimals: 2,
  })
  debtTrancheRegistry.addColumn("yrs_to_mat", {
    headers: ["Yrs to", "Maturity"],
    group: "Fair Value Pricing",
    format: "number",
    decimals: 2,
  })
  debtTrancheRegistry.addColumn("pv_factor", {
    headers: ["PV", "Factor"],
    group: "Fair Value Pricing",
    format: "number",
    decimals: 4,
  })
  debtTrancheRegistry.addColumn("est_fair_value", {
    headers: ["Est. Fair", "Val. ($M)"],
    group: "Fair Value Pricing",
    format: "currency",
    decimals: 0,
  })

  debtTrancheRegistry.addSectionHeader(
    "Outstanding senior notes & credit facilities"
  )
  for (const tr of audited.debtTranches) {
    const isFloating = tr.id === "term_loan_2026"
    const { year, month } = parseMaturityDate(tr.maturityDate)
    const isLongBond = year >= 2040
    debtTrancheRegistry.addRow(tr.id, {
      cells: {
        item: tr.label,
        coupon: tr.couponRate,
        principal: tr.principal,
        carrying: tr.carryingValue,
        mat_fy: tr.maturityFy,
        annual_interest: new Cell({
          expr: '@table[@row, "principal"] * @table[@row, "coupon"]',
        }),
        ytm: isFloating
          ? null
          : new Cell({
              expr: isLongBond
                ? 'MacroRatesTable["marginal_pretax_kd", "val"] + ScalarDrivers["longBondCurvePremium", "active"]'
                : 'MacroRatesTable["marginal_pretax_kd", "val"]',
            }),
        yrs_to_mat: isFloating
          ? null
          : new Cell({
              expr: `YEARFRAC(DATE(2026, 11, 18), DATE(${year}, ${month}, 15), 3)`,
            }),
        pv_factor: isFloating
          ? null
          : new Cell({
              expr: '(1 + @table[@row, "ytm"] / 2) ^ (-2 * @table[@row, "yrs_to_mat"])',
            }),
        est_fair_value: new Cell({
          expr: isFloating
            ? '@table[@row, "carrying"]'
            : '@table[@row, "principal"] * ((@table[@row, "coupon"] / @table[@row, "ytm"]) * (1 - @table[@row, "pv_factor"]) + @table[@row, "pv_factor"])',
        }),
      },
    })
  }

  const firstTranche = audited.debtTranches[0]
  const lastTranche = audited.debtTranches[audited.debtTranches.length - 1]
  if (firstTranche === undefined || lastTranche === undefined) {
    throw new Error("DebtTrancheRegistry requires at least one audited tranche")
  }
  const firstTrancheId = firstTranche.id
  const lastTrancheId = lastTranche.id

  debtTrancheRegistry.addRowGutter()
  debtTrancheRegistry.addSectionHeader("Maturity bucket summary")
  debtTrancheRegistry.addRow("mat_fy29_sub", {
    cells: {
      item: "Maturing in FY29E (Mar–Jul 2028 notes)",
      coupon: new Cell({
        expr: '@table[@row, "annual_interest"] / @table[@row, "principal"]',
      }),
      principal: new Cell({
        expr: 'SUM(@table["senior_notes_mar_2028".."senior_notes_jul_2028_sustainability", "principal"])',
      }),
      carrying: new Cell({
        expr: 'SUM(@table["senior_notes_mar_2028".."senior_notes_jul_2028_sustainability", "carrying"])',
      }),
      mat_fy: 2029,
      annual_interest: new Cell({
        expr: 'SUM(@table["senior_notes_mar_2028".."senior_notes_jul_2028_sustainability", "annual_interest"])',
      }),
      ytm: null,
      yrs_to_mat: null,
      pv_factor: null,
      est_fair_value: new Cell({
        expr: 'SUM(@table["senior_notes_mar_2028".."senior_notes_jul_2028_sustainability", "est_fair_value"])',
      }),
    },
    style: "subtotal",
  })
  debtTrancheRegistry.addRow("mat_fy30_sub", {
    cells: {
      item: "Maturing in FY30E (Mar 2029 notes)",
      coupon: new Cell({
        expr: '@table[@row, "annual_interest"] / @table[@row, "principal"]',
      }),
      principal: new Cell({
        expr: '@table["senior_notes_mar_2029", "principal"]',
      }),
      carrying: new Cell({
        expr: '@table["senior_notes_mar_2029", "carrying"]',
      }),
      mat_fy: 2030,
      annual_interest: new Cell({
        expr: '@table["senior_notes_mar_2029", "annual_interest"]',
      }),
      ytm: null,
      yrs_to_mat: null,
      pv_factor: null,
      est_fair_value: new Cell({
        expr: '@table["senior_notes_mar_2029", "est_fair_value"]',
      }),
    },
    style: "subtotal",
  })
  debtTrancheRegistry.addRow("mat_fy32_sub", {
    cells: {
      item: "Maturing in FY32E (term loan & 2031)",
      coupon: new Cell({
        expr: '@table[@row, "annual_interest"] / @table[@row, "principal"]',
      }),
      principal: new Cell({
        expr: 'SUM(@table["term_loan_2026".."senior_notes_sep_2031", "principal"])',
      }),
      carrying: new Cell({
        expr: 'SUM(@table["term_loan_2026".."senior_notes_sep_2031", "carrying"])',
      }),
      mat_fy: 2032,
      annual_interest: new Cell({
        expr: 'SUM(@table["term_loan_2026".."senior_notes_sep_2031", "annual_interest"])',
      }),
      ytm: null,
      yrs_to_mat: null,
      pv_factor: null,
      est_fair_value: new Cell({
        expr: 'SUM(@table["term_loan_2026".."senior_notes_sep_2031", "est_fair_value"])',
      }),
    },
    style: "subtotal",
  })
  debtTrancheRegistry.addRow("mat_fy32_plus_sub", {
    cells: {
      item: "Maturing in FY32E & thereafter",
      coupon: new Cell({
        expr: '@table[@row, "annual_interest"] / @table[@row, "principal"]',
      }),
      principal: new Cell({
        expr: `SUM(@table["term_loan_2026".."${lastTrancheId}", "principal"])`,
      }),
      carrying: new Cell({
        expr: `SUM(@table["term_loan_2026".."${lastTrancheId}", "carrying"])`,
      }),
      mat_fy: null,
      annual_interest: new Cell({
        expr: `SUM(@table["term_loan_2026".."${lastTrancheId}", "annual_interest"])`,
      }),
      ytm: null,
      yrs_to_mat: null,
      pv_factor: null,
      est_fair_value: new Cell({
        expr: `SUM(@table["term_loan_2026".."${lastTrancheId}", "est_fair_value"])`,
      }),
    },
    style: "subtotal",
  })
  debtTrancheRegistry.addRow("total_debt", {
    cells: {
      item: "Total debt stack (Note 8)",
      coupon: new Cell({
        expr: '@table[@row, "annual_interest"] / @table[@row, "principal"]',
      }),
      principal: new Cell({
        expr: `SUM(@table["${firstTrancheId}".."${lastTrancheId}", "principal"])`,
      }),
      carrying: new Cell({
        expr: `SUM(@table["${firstTrancheId}".."${lastTrancheId}", "carrying"])`,
      }),
      mat_fy: null,
      annual_interest: new Cell({
        expr: `SUM(@table["${firstTrancheId}".."${lastTrancheId}", "annual_interest"])`,
      }),
      ytm: null,
      yrs_to_mat: null,
      pv_factor: null,
      est_fair_value: new Cell({
        expr: `SUM(@table["${firstTrancheId}".."${lastTrancheId}", "est_fair_value"])`,
      }),
    },
    style: "total",
    shade: "alt",
  })

  return {
    scenarioControl,
    scenarioGuide,
    scalarDrivers,
    periodDriversActive,
    periodDriversDownside,
    periodDriversBase,
    periodDriversUpside,
    debtTrancheRegistry,
  }
}
