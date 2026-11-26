import { scalarDriver, type ValuationScalarDrivers } from "./types.ts"

/**
 * Grounded Base Case valuation drivers.
 * Risk-free rate (DGS10), credit spreads, spot equity price, and Hamada-relevered betas pull live from audited filings & market series.
 */
export const baseValuationScalars: ValuationScalarDrivers = Object.freeze({
  equityRiskPremium: scalarDriver(0.045, {
    label: "U.S. equity risk premium (ERP)",
    format: "percentage",
    decimals: 2,
    category: "Discount rate & terminal valuation",
    basis: "Implied & recommended market ERP",
    rationale:
      "Balances lower forward S&P 500 implied ERP against higher institutional recommended ERP and elevated equity volatility.",
    source: "NYU Stern (Nov 2026) & Kroll (2026)",
    gapId: "GAP-005",
  }),
  betaRegimeSelector: scalarDriver(2, {
    label: "Beta basis (1=2Y Blume, 2=5Y Raw, 3=5Y Blume)",
    format: "integer",
    category: "Discount rate & terminal valuation",
    basis: "Through-cycle OLS, Hamada-relevered",
    rationale:
      "Weighs through-the-cycle 5-year monthly raw OLS beta against elevated 2-year AI/CapEx volatility (Downside uses 2Y Blume; Upside uses 5Y Blume); all estimates Hamada-relevered to pro forma debt/equity.",
    source: "Yahoo Finance monthly/weekly OLS",
  }),
  terminalGrowthRate: scalarDriver(0.035, {
    label: "Terminal perpetuity growth rate (g)",
    format: "percentage",
    decimals: 1,
    category: "Discount rate & terminal valuation",
    basis: "Long-run nominal GDP anchor",
    rationale:
      "Weighs durable global digital-advertising pricing power and emerging-market monetization against long-run nominal GDP ceilings and mature market share.",
    source: "Long-run macroeconomic growth convention",
  }),
  terminalRonic: scalarDriver(0.2, {
    label: "Terminal return on new invested capital (RONIC)",
    format: "percentage",
    decimals: 1,
    category: "Discount rate & terminal valuation",
    basis: "Steady-state reinvestment discipline",
    rationale:
      "Weighs historically high software-platform ROIC against rising steady-state capital intensity of AI compute and data-center infrastructure (governs terminal reinvestment g / RONIC).",
    source: "Historical Meta & hyperscaler ROIC",
  }),
  midYearDiscountingFlag: scalarDriver(1, {
    label: "Mid-year discounting convention (1=On, 0=Year-End)",
    format: "integer",
    category: "Discount rate & terminal valuation",
    basis: "Continuous cash flow (explicit & TV)",
    rationale:
      "Applies consistent mid-year discounting to both explicit FCFF and terminal value so the 2031E-to-2032E step equals exactly 1.00 year; adjustable to year-end.",
    source: "Institutional DCF convention",
  }),
  mcpDividendQuartersRemaining: scalarDriver(11, {
    label: "METAM preferred remaining quarterly dividends",
    format: "integer",
    category: "Discount rate & terminal valuation",
    basis: "Contractual conversion horizon",
    rationale:
      "Quarterly preferred cash dividends paid from valuation date through mandatory conversion on Aug 15, 2029, discounted at marginal pre-tax cost of debt.",
    source: "Form 8-K (Oct 29, 2026)",
  }),
})
