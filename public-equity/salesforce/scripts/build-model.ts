import { resolve } from "node:path"
import { compileSalesforceModel } from "../models/index.ts"

const outputPath = resolve(
  process.cwd(),
  "deliverables/salesforce_financial_model.xlsx"
)

const compiled = compileSalesforceModel("base")
try {
  compiled.save(outputPath, {
    title:
      "Salesforce, Inc. (NYSE: CRM) — Integrated Financial Model & Valuation",
    author: "Institutional Equity Research",
  })
  const summary = compiled.summary()
  const basePrice = compiled.formatted(
    "EvToEquityBridge",
    "implied_share_price",
    "gordon"
  )
  const wacc = compiled.formatted("WaccSchedule", "wacc", "primary")
  console.log(
    `Emitted ${outputPath} | Sheets: ${summary.totalSheets} | Tables: ${summary.totalTables} | Cells: ${summary.totalCells} | Formulas: ${summary.totalFormulas} | Base DCF: ${basePrice} | WACC: ${wacc}`
  )
} finally {
  compiled.dispose()
}
