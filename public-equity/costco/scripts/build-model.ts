import { compileCostcoModel, SCENARIOS } from "../models/index.ts"

const OUTPUT_PATH = "deliverables/costco-valuation.xlsx"

function main(): void {
  for (const sc of SCENARIOS) {
    using compiled = compileCostcoModel(sc)
    const wacc = compiled.num('WaccSchedule["wacc", "val"]')
    const wacc2y = compiled.num('WaccSchedule["wacc_2y_memo", "val"]')
    const implWacc = compiled.num(
      'ReverseDcfTable["implied_wacc_at_base_g", "val"]'
    )
    const implBeta = compiled.num(
      'ReverseDcfTable["implied_beta_at_base_g", "val"]'
    )
    const fy27Rev = compiled.num('IncomeStatement["total_revenue", "FY27E"]')
    const fy27Ebitda = compiled.num('IncomeStatement["ebitda", "FY27E"]')
    const fy27Eps = compiled.num('IncomeStatement["diluted_eps", "FY27E"]')
    const fy36Rev = compiled.num('IncomeStatement["total_revenue", "FY36E"]')
    const fy36Ebitda = compiled.num('IncomeStatement["ebitda", "FY36E"]')
    const fy36Fcff = compiled.num(
      'InvestedCapitalROIC["unlevered_fcff", "FY36E"]'
    )
    const fy36Roic = compiled.num('InvestedCapitalROIC["roic", "FY36E"]')
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
    const rf400Perp = compiled.num(
      'ReverseDcfTable["perp_price_at_rf_400", "val"]'
    )
    const beta2yPerp = compiled.num(
      'ReverseDcfTable["perp_price_at_2y_beta_wacc", "val"]'
    )

    console.log(
      `[${sc}] WACC=${(wacc * 100).toFixed(2)}% (2Y=${(wacc2y * 100).toFixed(2)}%, MktImpl=${(implWacc * 100).toFixed(2)}%, ImplBeta=${implBeta.toFixed(2)}) | FY27E Rev=$${fy27Rev.toFixed(0)}M EBITDA=$${fy27Ebitda.toFixed(0)}M EPS=$${fy27Eps.toFixed(2)} | FY36E Rev=$${fy36Rev.toFixed(0)}M EBITDA=$${fy36Ebitda.toFixed(0)}M FCFF=$${fy36Fcff.toFixed(0)}M ROIC=${(fy36Roic * 100).toFixed(1)}% | Perp=$${perpCum.toFixed(2)} (Ex=$${perpEx.toFixed(2)}, @4%UST=$${rf400Perp.toFixed(2)}, @2YBeta=$${beta2yPerp.toFixed(2)}) | Exit=$${exitCum.toFixed(2)} (Ex=$${exitEx.toFixed(2)}) | Comps=$${compsCum.toFixed(2)} | Blended(50/0/50)=$${blendedCum.toFixed(2)} (Ex=$${blendedEx.toFixed(2)})`
    )

    if (sc === "Base") {
      compiled.save(OUTPUT_PATH, {
        title:
          "Costco Wholesale Corporation (COST) Financial Model & Valuation",
        author: "Michael Hu, CFA | mhu@outlook.co.nz",
      })
      const summary = compiled.summary()
      console.log(
        `Saved ${OUTPUT_PATH} (${summary.totalSheets} sheets, ${summary.totalTables} tables, ${summary.totalCells} cells, ${summary.totalFormulas} formulas, ${summary.totalDrivers} drivers)`
      )
    }
  }
}

main()
