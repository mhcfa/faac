import { statSync } from "node:fs"
import { compileBoeingModel } from "../models/index.ts"

const OUT_PATH = "deliverables/boeing-valuation-model.xlsx"

using compiled = compileBoeingModel("base")

const errs = compiled.errors()
if (errs.length > 0) {
  console.error("Compilation produced runtime formula errors:")
  for (const e of errs) {
    console.error(`  ${e.physicalAddress}: ${e.error} (${e.formulaExpr})`)
  }
  process.exit(1)
}

compiled.save(OUT_PATH, {
  title: "The Boeing Company (NYSE: BA) — Initiation & Valuation Model",
  author: "Michael Hu, CFA",
})

const sizeBytes = statSync(OUT_PATH).size
const summary = compiled.summary()
console.log(
  `Emitted ${OUT_PATH} (${(sizeBytes / 1024).toFixed(1)} KB) | ` +
    `${summary.totalSheets} sheets, ${summary.totalTables} tables, ` +
    `${summary.totalCells} cells (${summary.totalFormulas} formulas, ${summary.totalDrivers} drivers), 0 errors.`
)
