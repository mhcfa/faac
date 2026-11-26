import { Cell, type Sheet, type Table } from "f8-engine"
import {
  PERIOD_DRIVER_KEYS,
  SCALAR_DRIVER_KEYS,
  type PeriodDriverKey,
  type ScenarioBundle,
} from "../assumptions.ts"
import {
  FORECAST_PERIODS,
  FORECAST_PERIOD_HEADERS,
  type ScenarioKey,
} from "../timeline.ts"

function isPeriodDriverFlexed(
  bundle: ScenarioBundle,
  baseBundle: ScenarioBundle,
  key: PeriodDriverKey
): boolean {
  const val = bundle.periods[key].value
  const baseVal = baseBundle.periods[key].value
  return FORECAST_PERIODS.some((p) => val[p] !== baseVal[p])
}

function addPeriodScenarioTable(
  sheet: Sheet,
  tableId: string,
  title: string,
  subtitle: string,
  bundle: ScenarioBundle,
  baseBundle: ScenarioBundle,
  trailingMode: "source" | "flex"
): Table {
  const tbl = sheet.addTable(tableId, title, {
    subtitle,
  })
  tbl.addColumn("driver", {
    role: "descriptor",
    headers: ["Operating assumption"],
  })
  for (const p of FORECAST_PERIODS) {
    tbl.addColumn(p, { headers: [FORECAST_PERIOD_HEADERS[p]] })
  }
  tbl.addColumn("notes", {
    role: "descriptor",
    headers: [trailingMode === "source" ? "Source" : "Changes vs. Base"],
  })

  let lastCategory = ""
  for (const key of PERIOD_DRIVER_KEYS) {
    const drv = bundle.periods[key]
    if (drv.meta.category !== lastCategory) {
      if (lastCategory !== "") tbl.addRowGutter()
      tbl.addSectionHeader(drv.meta.category)
      lastCategory = drv.meta.category
    }
    const trailingText =
      trailingMode === "source"
        ? (drv.meta.source ?? null)
        : isPeriodDriverFlexed(bundle, baseBundle, key)
          ? (drv.meta.basis ?? null)
          : null
    const cells: Record<string, string | number | null> = {
      driver: drv.meta.label,
      notes: trailingText,
    }
    for (const p of FORECAST_PERIODS) {
      cells[p] = drv.value[p]
    }
    tbl.addRow(key, {
      cells,
      format: drv.meta.format,
      ...(drv.meta.decimals !== undefined
        ? { decimals: drv.meta.decimals }
        : {}),
      ...(drv.meta.format === "currency" && drv.meta.currency
        ? { currency: drv.meta.currency }
        : {}),
    })
  }
  return tbl
}

export function buildAssumptionsSheet(
  sheet: Sheet,
  scenarios: Readonly<Record<ScenarioKey, ScenarioBundle>>
): void {
  // 1. Scalar Drivers Table (Active live CHOOSE + Downside / Base / Upside + Basis + Source)
  const scalarTbl = sheet.addTable(
    "ScalarDrivers",
    "Core Model & Valuation Assumptions",
    {
      subtitle:
        "Active column reflects the selected scenario (1 = Downside, 2 = Base, 3 = Upside); Basis & Source document calibration",
    }
  )
  scalarTbl.addColumn("driver", {
    role: "descriptor",
    headers: ["Assumption"],
  })
  scalarTbl.addColumn("active", {
    headers: ["Active"],
    style: "bold",
    shade: "muted",
  })
  scalarTbl.addColumn("downside", {
    group: "Scenarios",
    headers: ["Downside"],
  })
  scalarTbl.addColumn("base", {
    group: "Scenarios",
    headers: ["Base"],
    style: "bold",
  })
  scalarTbl.addColumn("upside", {
    group: "Scenarios",
    headers: ["Upside"],
  })
  scalarTbl.addColumn("basis", {
    role: "descriptor",
    headers: ["Basis"],
  })
  scalarTbl.addColumn("source", {
    role: "descriptor",
    headers: ["Source"],
  })

  let lastScalarCat = ""
  for (const key of SCALAR_DRIVER_KEYS) {
    const baseDrv = scenarios.base.scalars[key]
    const downDrv = scenarios.downside.scalars[key]
    const upDrv = scenarios.upside.scalars[key]
    if (baseDrv.meta.category !== lastScalarCat) {
      if (lastScalarCat !== "") scalarTbl.addRowGutter()
      scalarTbl.addSectionHeader(baseDrv.meta.category)
      lastScalarCat = baseDrv.meta.category
    }
    scalarTbl.addRow(key, {
      cells: {
        driver: baseDrv.meta.label,
        active: new Cell({
          expr: `CHOOSE(ScenarioControl["active", "val"], @table[@row, "downside"], @table[@row, "base"], @table[@row, "upside"])`,
        }),
        downside: downDrv.value,
        base: baseDrv.value,
        upside: upDrv.value,
        basis: baseDrv.meta.basis ?? null,
        source: baseDrv.meta.source ?? null,
      },
      format: baseDrv.meta.format,
      ...(baseDrv.meta.decimals !== undefined
        ? { decimals: baseDrv.meta.decimals }
        : {}),
      ...(baseDrv.meta.format === "currency" && baseDrv.meta.currency
        ? { currency: baseDrv.meta.currency }
        : {}),
    })
  }

  // 2. Active Period Drivers Selector Table (live CHOOSE from stacked scenario tables)
  const activePeriodTbl = sheet.addTable(
    "PeriodDriversActive",
    "Active Forecast Operating Assumptions (Q4 2026E – FY2032E)",
    {
      subtitle:
        "Active forecast assumptions for the selected scenario across commercial deliveries, segment margins, CapEx, and working capital",
    }
  )
  activePeriodTbl.addColumn("driver", {
    role: "descriptor",
    headers: ["Operating assumption"],
  })
  for (const p of FORECAST_PERIODS) {
    activePeriodTbl.addColumn(p, {
      headers: [FORECAST_PERIOD_HEADERS[p]],
      shade: "muted",
    })
  }
  activePeriodTbl.addColumn("basis", {
    role: "descriptor",
    headers: ["Base calibration basis"],
  })

  let lastActiveCat = ""
  for (const key of PERIOD_DRIVER_KEYS) {
    const drv = scenarios.base.periods[key]
    if (drv.meta.category !== lastActiveCat) {
      if (lastActiveCat !== "") activePeriodTbl.addRowGutter()
      activePeriodTbl.addSectionHeader(drv.meta.category)
      lastActiveCat = drv.meta.category
    }
    activePeriodTbl.addRow(key, {
      cells: {
        driver: drv.meta.label,
        basis: drv.meta.basis ?? null,
      },
      expr: `CHOOSE(ScenarioControl["active", "val"], PeriodDriversDown[@row, @col], PeriodDriversBase[@row, @col], PeriodDriversUp[@row, @col])`,
      format: drv.meta.format,
      ...(drv.meta.decimals !== undefined
        ? { decimals: drv.meta.decimals }
        : {}),
      ...(drv.meta.format === "currency" && drv.meta.currency
        ? { currency: drv.meta.currency }
        : {}),
    })
  }

  // 3. Stacked Scenario Input Tables (Downside, Base, Upside — flat, ungrouped)
  const downTbl = addPeriodScenarioTable(
    sheet,
    "PeriodDriversDown",
    "Downside Case — Forecast Operating Assumptions",
    "Stressed production ramp, persistent BDS charges, slower working-capital unwind, and elevated CapEx",
    scenarios.downside,
    scenarios.base,
    "flex"
  )
  const baseTbl = addPeriodScenarioTable(
    sheet,
    "PeriodDriversBase",
    "Base Case — Forecast Operating Assumptions",
    "Consensus-aligned FY26E–FY29E recovery fading to peer-benchmarked steady state by FY32E",
    scenarios.base,
    scenarios.base,
    "source"
  )
  const upTbl = addPeriodScenarioTable(
    sheet,
    "PeriodDriversUp",
    "Upside Case — Forecast Operating Assumptions",
    "Full FAA rate expansion, clean BDS execution, rapid working-capital unwind, and disciplined CapEx",
    scenarios.upside,
    scenarios.base,
    "flex"
  )

  sheet.setBands([
    scalarTbl,
    { lanes: [activePeriodTbl], pageBreakBefore: true },
    { lanes: [downTbl], pageBreakBefore: true },
    { lanes: [baseTbl], pageBreakBefore: true },
    { lanes: [upTbl], pageBreakBefore: true },
  ])
}
