import { compileMetaModel } from "../models/index.ts"

const OUTPUT_PATH = "deliverables/meta_model.xlsx"

function main(): void {
  const compiled = compileMetaModel("base")
  try {
    compiled.save(OUTPUT_PATH, {
      title: "Meta Platforms, Inc. (META) Financial Model & Valuation",
      author: "Michael Hu, CFA | mhu@outlook.co.nz",
    })
    const summary = compiled.summary()
    const px = compiled.num("DcfBridge", "implied_share_price", "val")
    const ev = compiled.num("DcfBridge", "implied_ev", "val")
    const wacc = compiled.num("WaccBuild", "wacc", "val")
    console.log(
      `Saved ${OUTPUT_PATH} (${summary.totalSheets} sheets, ${summary.totalTables} tables, ${summary.totalCells} cells, ${summary.totalFormulas} formulas)`
    )
    console.log(
      `Base Case: WACC=${(wacc * 100).toFixed(2)}%, EV=$${ev.toFixed(0)}M, Implied Price=$${px.toFixed(2)}`
    )
  } finally {
    compiled.dispose()
  }
}

main()
