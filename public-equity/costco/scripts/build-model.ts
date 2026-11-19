import { compileCostcoModel, SCENARIOS } from "../models/index.ts"

const OUTPUT_PATH = "deliverables/costco-valuation.xlsx"

function main(): void {
  for (const sc of SCENARIOS) {
    using compiled = compileCostcoModel(sc)
    const wacc = compiled.num('WaccSchedule["wacc", "val"]')
    const fy27Rev = compiled.num('IncomeStatement["total_revenue", "FY27E"]')
    const fy27Ebitda = compiled.num('IncomeStatement["ebitda", "FY27E"]')
    const fy36Rev = compiled.num('IncomeStatement["total_revenue", "FY36E"]')
    const fy36Ebitda = compiled.num('IncomeStatement["ebitda", "FY36E"]')
    const fy36Fcff = compiled.num(
      'InvestedCapitalROIC["unlevered_fcff", "FY36E"]'
    )
    const perpCum = compiled.num('DcfBridge["implied_price_cum_div", "perp"]')
    const perpEx = compiled.num('DcfBridge["implied_price_ex_div", "perp"]')
    const exitCum = compiled.num(
      'DcfBridge["implied_price_cum_div", "exit_mult"]'
    )
    const exitEx = compiled.num(
      'DcfBridge["implied_price_ex_div", "exit_mult"]'
    )
    const compsCum = compiled.num(
      'CompsValuationCalibration["implied_price_cum_div", "val"]'
    )
    const blendedCum = compiled.num(
      'FootballField["blended_total", "cum_div_price"]'
    )
    const blendedEx = compiled.num(
      'FootballField["blended_total", "ex_div_price"]'
    )

    console.log(
      `[${sc}] WACC=${(wacc * 100).toFixed(2)}% | FY27E Rev=$${fy27Rev.toFixed(0)}M EBITDA=$${fy27Ebitda.toFixed(0)}M | FY36E Rev=$${fy36Rev.toFixed(0)}M EBITDA=$${fy36Ebitda.toFixed(0)}M FCFF=$${fy36Fcff.toFixed(0)}M | Perp=$${perpCum.toFixed(2)} (Ex=$${perpEx.toFixed(2)}) | Exit=$${exitCum.toFixed(2)} (Ex=$${exitEx.toFixed(2)}) | Comps=$${compsCum.toFixed(2)} | Blended=$${blendedCum.toFixed(2)} (Ex=$${blendedEx.toFixed(2)})`
    )

    if (sc === "Base") {
      compiled.save(OUTPUT_PATH, {
        title:
          "Costco Wholesale Corporation (COST) Financial Model & Valuation",
        author: "PublicEquity Research",
      })
      const summary = compiled.summary()
      console.log(
        `Saved ${OUTPUT_PATH} (${summary.totalSheets} sheets, ${summary.totalTables} tables, ${summary.totalCells} cells, ${summary.totalFormulas} formulas, ${summary.totalDrivers} drivers)`
      )
    }
  }
}

main()
