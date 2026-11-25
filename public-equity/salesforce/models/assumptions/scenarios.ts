import {
  periodDriver,
  scalarDriver,
  type PeriodDriverBundle,
  type ScalarDriverBundle,
  type ScenarioBundle,
} from "./types.ts"

function buildBaseScalars(): ScalarDriverBundle {
  return Object.freeze({
    erp: scalarDriver(0.0475, {
      label: "US equity risk premium (ERP)",
      format: "percentage",
      decimals: 2,
      category: "Cost of capital & valuation",
      basis: "Implied US large-cap ERP",
      rationale:
        "Reflects economy-wide forward US equity risk premium under an elevated sovereign yield regime; held constant across company-specific operating scenarios.",
      source: "Damodaran / Kroll",
      gapId: "GAP-005",
    }),
    histBeta5yDe: scalarDriver(0.075, {
      label: "5Y-M lookback funded debt / equity",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & valuation",
      basis: "5Y avg. gross funded D/E",
      rationale:
        "Unlevers raw 5-year monthly OLS equity beta to asset beta before relevering to Salesforce's post-ASR funded capital structure.",
      source: "FY22–Q2 FY27 SEC & Nasdaq",
    }),
    histBeta2yDe: scalarDriver(0.12, {
      label: "2Y-W lookback funded debt / equity",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & valuation",
      basis: "2Y avg. gross funded D/E",
      rationale:
        "Unlevers raw 2-year weekly OLS equity beta to asset beta before relevering to current post-ASR funded leverage.",
      source: "FY25–Q2 FY27 SEC & Nasdaq",
    }),
    effectiveTaxRate: scalarDriver(0.225, {
      label: "Normalized effective tax rate",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & valuation",
      basis: "Recent statutory run-rate",
      rationale:
        "Anchors forward cash tax burden to recent consolidated GAAP effective rates following discrete tax-benefit roll-off.",
      source: "FY26 10-K & Q2 FY27 10-Q",
    }),
    terminalGrowthRate: scalarDriver(0.03, {
      label: "Perpetual terminal growth rate (g)",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & valuation",
      basis: "Long-run nominal GDP anchor",
      rationale:
        "Caps mature enterprise software perpetuity growth near long-run developed-market nominal GDP expansion.",
      source: "Macro nominal growth anchor",
    }),
    terminalReinvestmentRate: scalarDriver(0.0, {
      label: "Terminal reinvestment rate (% NOPAT)",
      format: "percentage",
      decimals: 1,
      category: "Cost of capital & valuation",
      basis: "Steady-state SaaS float balance",
      rationale:
        "Share of steady-state EBITA NOPAT absorbed by organic working capital, capitalized commissions, and maintenance infrastructure in perpetuity; neutral steady-state reinvestment in Base as upfront SaaS billing float offsets incremental hardware and commission needs.",
      source: "Historical SaaS WC float",
    }),
    exitEbitdaMultiple: scalarDriver(10.5, {
      label: "Terminal exit EV / GAAP EBITDA",
      format: "multiple",
      decimals: 1,
      category: "Cost of capital & valuation",
      basis: "Mature low-SBC SaaS peer check",
      rationale:
        "Calibrated to mature enterprise software peers with comparable GAAP cash conversion and SBC discipline.",
      source: "Peer SEC & Nasdaq prices",
    }),
    midPeriodFactor: scalarDriver(0.5, {
      label: "Cash flow mid-period timing factor",
      format: "number",
      decimals: 2,
      category: "Cost of capital & valuation",
      basis: "Mid-period DCF convention",
      rationale:
        "Assumes operating cash flows accrue evenly across each fiscal period rather than strictly at period end.",
      source: "Institutional DCF practice",
    }),
    expectedAsrAvgPrice: scalarDriver(194.0, {
      label: "Expected ASR final VWAP ($/sh)",
      format: "currency",
      decimals: 2,
      category: "Capital structure, M&A & EV bridge",
      basis: "Mar–Oct 2026 VWAP less disc.",
      rationale:
        "Anchored to audited March–October 2026 Nasdaq average closes less standard dealer ASR discount; held constant across scenarios because the averaging window has closed.",
      source: "Q2 10-Q Note 11 & Nasdaq",
    }),
    strategicInvHaircut: scalarDriver(0.2, {
      label: "Strategic investments haircut",
      format: "percentage",
      decimals: 1,
      category: "Capital structure, M&A & EV bridge",
      basis: "Tax & private illiquidity cut",
      rationale:
        "Discounts non-marketable venture carrying value dominated by Anthropic PBC for embedded tax leakage and lock-up risk.",
      source: "Q2 FY27 10-Q Note 3",
    }),
    brazeAcquisitionCash: scalarDriver(5660, {
      label: "Pending Braze cash acquisition ($M)",
      format: "currency",
      decimals: 0,
      category: "Capital structure, M&A & EV bridge",
      basis: "Signed definitive cash EV",
      rationale:
        "Committed all-cash acquisition enterprise value scheduled to close during H1 FY28, excluded from the Q2 FY27 balance sheet.",
      source: "Form 8-K (2026-10-20)",
    }),
    minCashBalance: scalarDriver(3000, {
      label: "Minimum operating cash floor ($M)",
      format: "currency",
      decimals: 0,
      category: "Capital structure, M&A & EV bridge",
      basis: "Global liquidity floor",
      rationale:
        "Protects seasonal H1 working-capital troughs and global payroll liquidity by triggering automatic revolver draws below floor.",
      source: "Historical cash seasonality",
    }),
    cashYieldRate: scalarDriver(0.04, {
      label: "Interest yield on cash & mkt. sec.",
      format: "percentage",
      decimals: 2,
      category: "Capital structure, M&A & EV bridge",
      basis: "Short-duration Treasury yield",
      rationale:
        "Reflects conservative portfolio yield earned on opening unrestricted cash and short-term investment balances.",
      source: "FRED 2Y UST & Q2 FY27 10-Q",
    }),
    revolverSpread: scalarDriver(0.0025, {
      label: "Revolver spread over marginal debt",
      format: "percentage",
      decimals: 2,
      category: "Capital structure, M&A & EV bridge",
      basis: "IG credit facility margin",
      rationale:
        "Incremental borrowing spread applied to opening revolving credit balances drawn during stress or maturity walls.",
      source: "FY26 10-K Note 8",
    }),
    longBondCurvePremium: scalarDriver(0.0095, {
      label: "Long-dated bond curve term premium",
      format: "percentage",
      decimals: 2,
      category: "Capital structure, M&A & EV bridge",
      basis: "20Y–40Y vs. 10Y coupon slope",
      rationale:
        "Adds long-end term premium over 10-year Single-A marginal cost of debt for 2041–2066 fixed-rate senior notes, grounded in Salesforce's March 2026 senior note coupon slope.",
      source: "Q2 FY27 10-Q Note 8",
    }),
    ppaIntangiblesShare: scalarDriver(0.27, {
      label: "M&A purchase price to intangibles",
      format: "percentage",
      decimals: 1,
      category: "Asset, lease & equity mechanics",
      basis: "Recent SaaS PPA allocation",
      rationale:
        "Splits cash acquisition outlays between amortizable purchased intangibles and residual goodwill matching recent deal accounting.",
      source: "Q2 FY27 10-Q Notes 6 & 7",
    }),
    ppaAmortLifeYears: scalarDriver(6.0, {
      label: "New M&A intangibles useful life (yrs)",
      format: "number",
      decimals: 1,
      category: "Asset, lease & equity mechanics",
      basis: "Acquired tech & customer life",
      rationale:
        "Straight-line amortization period applied to newly acquired Contentful, Fin, and Braze intangible assets.",
      source: "Q2 FY27 10-Q Note 7",
    }),
    maAcquiredNowcPctCash: scalarDriver(-0.04, {
      label: "Acquired M&A net WC (% of cash outlay)",
      format: "percentage",
      decimals: 1,
      category: "Asset, lease & equity mechanics",
      basis: "Assumed SaaS deferred rev. WC",
      rationale:
        "Reflects net negative working capital (primarily acquired unearned subscription revenue) assumed in SaaS business combinations so M&A working-capital step-ups do not inflate operating cash flow.",
      source: "Q2 FY27 10-Q Note 6",
    }),
    contractCostAmortRate: scalarDriver(0.44, {
      label: "Contract costs annual amort. rate",
      format: "percentage",
      decimals: 1,
      category: "Asset, lease & equity mechanics",
      basis: "Amort. over opening balance",
      rationale:
        "Matches observed multi-year customer benefit life for capitalized sales commissions amortized into sales and marketing.",
      source: "FY25–FY26 10-K & Q2 10-Q",
    }),
    opLeaseDownsizeAnnual: scalarDriver(50, {
      label: "Annual op. lease footprint cut ($M)",
      format: "currency",
      decimals: 0,
      category: "Asset, lease & equity mechanics",
      basis: "Office consolidation trend",
      rationale:
        "Gradual office lease footprint reduction keeping right-of-use assets and lease liabilities aligned without artificial cash adjustments.",
      source: "FY24–Q2 FY27 balance sheets",
    }),
    sbcNetIssuanceRatio: scalarDriver(0.85, {
      label: "SBC net share issuance ratio",
      format: "percentage",
      decimals: 1,
      category: "Asset, lease & equity mechanics",
      basis: "Post-tax RSU settlement share",
      rationale:
        "Captures the share of stock-based compensation settled in newly issued equity versus cash tax withholding remitted by the company.",
      source: "Q2 FY27 10-Q cash flows",
    }),
    esppProceedsPctSbc: scalarDriver(0.15, {
      label: "Employee stock plan proceeds (% SBC)",
      format: "percentage",
      decimals: 1,
      category: "Asset, lease & equity mechanics",
      basis: "Recent ESPP cash inflow rate",
      rationale:
        "Links ongoing employee stock purchase plan cash inflows directly to consolidated equity compensation scale.",
      source: "FY26 10-K & Q2 FY27 10-Q",
    }),
    futureBuybackPrice: scalarDriver(210.0, {
      label: "Forward open-market buyback price ($)",
      format: "currency",
      decimals: 2,
      category: "Asset, lease & equity mechanics",
      basis: "Forward repurchase execution",
      rationale:
        "Converts forecast open-market share repurchase outlays and equity compensation grants into annual diluted share count changes.",
      source: "Capital return convention",
    }),
  })
}

function buildBasePeriods(): PeriodDriverBundle {
  return Object.freeze({
    organicSsGrowth: periodDriver(
      {
        FY27E: 0.077,
        FY28E: 0.077,
        FY29E: 0.075,
        FY30E: 0.07,
        FY31E: 0.065,
      },
      {
        label: "Organic subscription & support growth",
        format: "percentage",
        decimals: 1,
        category: "Revenue engine",
        basis: "Core ex-M&A deceleration",
        rationale:
          "Agentforce and Data 360 expansion partially offsets core seat-growth maturity and legacy Marketing & Commerce drag.",
        source: "FY27 guide & Q2 cRPO",
      }
    ),
    incrementalMaRev: periodDriver(
      {
        FY27E: 1660,
        FY28E: 830,
        FY29E: 200,
        FY30E: 0,
        FY31E: 0,
      },
      {
        label: "Incremental Year-1 M&A S&S rev. ($M)",
        format: "currency",
        decimals: 0,
        category: "Revenue engine",
        basis: "Signed M&A annualization",
        rationale:
          "Isolates first-12-month inorganic revenue from Informatica, Qualified, Contentful, Fin, and Braze before rolling into the organic base.",
        source: "Q2 10-Q Note 6 & 8-K",
      }
    ),
    profServicesGrowth: periodDriver(
      {
        FY27E: 0.02,
        FY28E: 0.03,
        FY29E: 0.02,
        FY30E: 0.015,
        FY31E: 0.015,
      },
      {
        label: "Professional services revenue growth",
        format: "percentage",
        decimals: 1,
        category: "Revenue engine",
        basis: "SI-partnered fade",
        rationale:
          "Deliberate shift of implementation hours to systems-integrator partners limits services growth outside M&A onboarding.",
        source: "FY24–26 10-K & Q2 10-Q",
      }
    ),
    corSubCashPctSs: periodDriver(
      {
        FY27E: 0.11,
        FY28E: 0.112,
        FY29E: 0.113,
        FY30E: 0.114,
        FY31E: 0.115,
      },
      {
        label: "Cash cost of subscription (% S&S rev.)",
        format: "percentage",
        decimals: 1,
        category: "Operating costs & SBC",
        basis: "Hosting & AI inference",
        rationale:
          "Tracks pure cash cloud hosting and AI model inference intensity (excluding SBC, purchased intangibles amortization, and PP&E/finance-lease depreciation) anchored to recent actuals and FY27 margin guidance.",
        source: "FY24–26 10-K & Q2 10-Q",
      }
    ),
    corPsCashPctPs: periodDriver(
      {
        FY27E: 1.13,
        FY28E: 1.12,
        FY29E: 1.11,
        FY30E: 1.1,
        FY31E: 1.1,
      },
      {
        label: "Cash cost of prof. services (% PS rev.)",
        format: "percentage",
        decimals: 1,
        category: "Operating costs & SBC",
        basis: "Strategic services",
        rationale:
          "Professional services operate near modest negative gross margin to accelerate enterprise deployments and AI adoption.",
        source: "FY24–FY26 10-K",
      }
    ),
    rdCashPctRev: periodDriver(
      {
        FY27E: 0.116,
        FY28E: 0.118,
        FY29E: 0.119,
        FY30E: 0.119,
        FY31E: 0.118,
      },
      {
        label: "Cash R&D expense (% of revenue)",
        format: "percentage",
        decimals: 1,
        category: "Operating costs & SBC",
        basis: "AI platform R&D",
        rationale:
          "Maintains elevated cash engineering investment to defend platform architecture across Agentforce and Data 360.",
        source: "FY26 10-K & Q2 10-Q",
      }
    ),
    smCashPctRev: periodDriver(
      {
        FY27E: 0.294,
        FY28E: 0.291,
        FY29E: 0.288,
        FY30E: 0.285,
        FY31E: 0.283,
      },
      {
        label: "Cash S&M expense (% of revenue)",
        format: "percentage",
        decimals: 1,
        category: "Operating costs & SBC",
        basis: "Gradual GTM leverage",
        rationale:
          "Steady sales productivity improvement and post-M&A cross-sell yield modest cash S&M leverage over the forecast horizon.",
        source: "FY26 10-K & FY27 guide",
      }
    ),
    gaCashPctRev: periodDriver(
      {
        FY27E: 0.06,
        FY28E: 0.059,
        FY29E: 0.058,
        FY30E: 0.057,
        FY31E: 0.056,
      },
      {
        label: "Cash G&A expense (% of revenue)",
        format: "percentage",
        decimals: 1,
        category: "Operating costs & SBC",
        basis: "Fixed overhead scale",
        rationale:
          "Fixed administrative overhead scales cleanly over expanding consolidated subscription revenue.",
        source: "FY26 10-K & Q2 10-Q",
      }
    ),
    restructuringPctRev: periodDriver(
      {
        FY27E: 0.008,
        FY28E: 0.005,
        FY29E: 0.003,
        FY30E: 0.002,
        FY31E: 0.002,
      },
      {
        label: "Restructuring & acq. costs (% rev.)",
        format: "percentage",
        decimals: 1,
        category: "Operating costs & SBC",
        basis: "Guided tapering path",
        rationale:
          "Captures M&A integration and periodic workforce realignment costs that recur structurally in serial acquirers.",
        source: "Q2 FY27 Ex. 99.1",
      }
    ),
    sbcPctRev: periodDriver(
      {
        FY27E: 0.09,
        FY28E: 0.089,
        FY29E: 0.088,
        FY30E: 0.086,
        FY31E: 0.085,
      },
      {
        label: "Stock-based compensation (% revenue)",
        format: "percentage",
        decimals: 1,
        category: "Operating costs & SBC",
        basis: "Economic equity comp.",
        rationale:
          "Gradual equity-grant moderation from guided run-rate, treated strictly as a real economic cost in GAAP EBIT and FCFF.",
        source: "Q2 Ex. 99.1 & 10-K",
      }
    ),
    capexPctRev: periodDriver(
      {
        FY27E: 0.015,
        FY28E: 0.015,
        FY29E: 0.015,
        FY30E: 0.015,
        FY31E: 0.015,
      },
      {
        label: "Cash capital expenditures (% revenue)",
        format: "percentage",
        decimals: 1,
        category: "Capital intensity & leases",
        basis: "Hyperforce cloud CapEx",
        rationale:
          "Direct cash CapEx remains asset-light under third-party hyperscaler hosting, excluding finance-lease hardware obligations.",
        source: "Q2 FY27 Ex. 99.1",
      }
    ),
    finLeasePctRev: periodDriver(
      {
        FY27E: 0.014,
        FY28E: 0.014,
        FY29E: 0.014,
        FY30E: 0.014,
        FY31E: 0.014,
      },
      {
        label: "Finance lease principal (% revenue)",
        format: "percentage",
        decimals: 1,
        category: "Capital intensity & leases",
        basis: "Hardware finance leases",
        rationale:
          "Explicitly deducts recurring financing-obligation principal outflows that nearly double true economic capital intensity.",
        source: "FY24–Q2 10-Q CF",
      }
    ),
    ppeDeprPctRev: periodDriver(
      {
        FY27E: 0.029,
        FY28E: 0.029,
        FY29E: 0.029,
        FY30E: 0.029,
        FY31E: 0.029,
      },
      {
        label: "PP&E & fin. lease depreciation (% rev.)",
        format: "percentage",
        decimals: 1,
        category: "Capital intensity & leases",
        basis: "Tracks CapEx + leases",
        rationale:
          "Reflects public-cloud hosting transition and declining legacy data-center PP&E, keeping steady-state PP&E flat as combined cash CapEx and finance-lease additions offset depreciation.",
        source: "FY24–26 10-K D&A",
      }
    ),
    opLeasePayment: periodDriver(
      {
        FY27E: 550,
        FY28E: 540,
        FY29E: 530,
        FY30E: 520,
        FY31E: 510,
      },
      {
        label: "Operating lease ROU amort. / cash ($M)",
        format: "currency",
        decimals: 0,
        category: "Capital intensity & leases",
        basis: "Note 7 maturity taper",
        rationale:
          "Matches scheduled operating lease maturity runoff as legacy urban office commitments roll down.",
        source: "Q2 FY27 10-Q Note 7",
      }
    ),
    capCommissionsPctSsRev: periodDriver(
      {
        FY27E: 0.063,
        FY28E: 0.063,
        FY29E: 0.062,
        FY30E: 0.061,
        FY31E: 0.06,
      },
      {
        label: "Cash commissions capitalized (% S&S)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & commissions",
        basis: "ASC 606 comm. outflow",
        rationale:
          "Tracks cash commission outlays required to book multi-year enterprise subscriptions, tapering slightly as renewal mix rises.",
        source: "FY24–26 10-K CF",
      }
    ),
    dsoDays: periodDriver(
      {
        FY27E: 120,
        FY28E: 119,
        FY29E: 118,
        FY30E: 118,
        FY31E: 118,
      },
      {
        label: "Accounts receivable DSO (year-end days)",
        format: "number",
        decimals: 1,
        category: "Working capital & commissions",
        basis: "Q4 seasonal billings",
        rationale:
          "Year-end DSO reflects concentrated Q4 annual enterprise renewals, normalizing modestly post-Informatica integration.",
        source: "FY24–26 10-K BS",
      }
    ),
    prepaidPctRev: periodDriver(
      {
        FY27E: 0.05,
        FY28E: 0.05,
        FY29E: 0.05,
        FY30E: 0.05,
        FY31E: 0.05,
      },
      {
        label: "Prepaid & other current assets (% rev.)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & commissions",
        basis: "Historical BS share",
        rationale:
          "Scales prepaid cloud hosting, vendor deposits, and operating current assets steadily with top-line revenue.",
        source: "FY24–26 10-K BS",
      }
    ),
    apAccruedPctRev: periodDriver(
      {
        FY27E: 0.192,
        FY28E: 0.19,
        FY29E: 0.19,
        FY30E: 0.19,
        FY31E: 0.19,
      },
      {
        label: "AP & accrued current liab. (% rev.)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & commissions",
        basis: "Accrued comp. & AP float",
        rationale:
          "Maintains consistent accrued bonus, commission, and vendor payable float relative to revenue scale.",
        source: "FY24–26 10-K BS",
      }
    ),
    unearnedRevPctSsRev: periodDriver(
      {
        FY27E: 0.615,
        FY28E: 0.61,
        FY29E: 0.605,
        FY30E: 0.6,
        FY31E: 0.6,
      },
      {
        label: "Unearned revenue (% of S&S revenue)",
        format: "percentage",
        decimals: 1,
        category: "Working capital & commissions",
        basis: "Upfront SaaS billings",
        rationale:
          "Captures upfront subscription billings float that generates cash during growth and unwinds during revenue contraction.",
        source: "FY24–26 10-K BS",
      }
    ),
    incrementalShareRepurchases: periodDriver(
      {
        FY27E: 0,
        FY28E: 5000,
        FY29E: 6000,
        FY30E: 7500,
        FY31E: 10000,
      },
      {
        label: "Incremental share repurchases ($M)",
        format: "currency",
        decimals: 0,
        category: "Capital return & financing",
        basis: "Post-ASR buyback pace",
        rationale:
          "Adds incremental buybacks atop audited H1 FY27 ASR outlays while preserving liquidity for pending M&A and debt maturities.",
        source: "Q2 10-Q Note 11",
      }
    ),
    dividendsPerShare: periodDriver(
      {
        FY27E: 1.76,
        FY28E: 1.84,
        FY29E: 1.92,
        FY30E: 2.0,
        FY31E: 2.08,
      },
      {
        label: "Annual cash dividend per share ($/sh)",
        format: "currency",
        decimals: 2,
        category: "Capital return & financing",
        basis: "Quarterly payout growth",
        rationale:
          "Projects steady mid-single-digit annual dividend progression from the current quarterly payout baseline.",
        source: "Q2 FY27 10-Q",
      }
    ),
    newDebtIssuance: periodDriver(
      {
        FY27E: 0,
        FY28E: 0,
        FY29E: 0,
        FY30E: 0,
        FY31E: 0,
      },
      {
        label: "Incremental long-term debt issue ($M)",
        format: "currency",
        decimals: 0,
        category: "Capital return & financing",
        basis: "Organic deleveraging",
        rationale:
          "Assumes no incremental senior note issuance beyond audited H1 FY27 proceeds, retiring FY29–FY30 maturities from operating cash flow.",
        source: "Q2 10-Q Note 8",
      }
    ),
  })
}

export function baseDrivers(): ScenarioBundle {
  return Object.freeze({
    key: "base",
    name: "Base Case",
    index: 2,
    framing:
      "Core organic subscription growth moderates toward mature enterprise cadence as Agentforce offsets legacy cloud drag, while AI hosting intensity caps margin expansion and SBC plus finance leases constrain economic FCFF under an elevated sovereign yield and post-ASR leverage.",
    scalars: buildBaseScalars(),
    periods: buildBasePeriods(),
  })
}

export function downsideDrivers(): ScenarioBundle {
  const base = baseDrivers()
  return Object.freeze({
    ...base,
    key: "downside",
    name: "Downside Case",
    index: 1,
    framing:
      "AI seat compression slows core organic subscription growth to low-single digits, AI hosting and retention outlays compress GAAP margins with sticky SBC, and positive terminal reinvestment plus a wider strategic-investment haircut reduce intrinsic value.",
    scalars: Object.freeze({
      ...base.scalars,
      effectiveTaxRate: scalarDriver(0.235, base.scalars.effectiveTaxRate.meta),
      terminalGrowthRate: scalarDriver(
        0.025,
        base.scalars.terminalGrowthRate.meta
      ),
      terminalReinvestmentRate: scalarDriver(
        0.05,
        base.scalars.terminalReinvestmentRate.meta
      ),
      exitEbitdaMultiple: scalarDriver(
        8.5,
        base.scalars.exitEbitdaMultiple.meta
      ),
      strategicInvHaircut: scalarDriver(
        0.35,
        base.scalars.strategicInvHaircut.meta
      ),
      futureBuybackPrice: scalarDriver(
        155.0,
        base.scalars.futureBuybackPrice.meta
      ),
    }),
    periods: Object.freeze({
      ...base.periods,
      organicSsGrowth: periodDriver(
        {
          FY27E: 0.07,
          FY28E: 0.048,
          FY29E: 0.042,
          FY30E: 0.038,
          FY31E: 0.035,
        },
        {
          ...base.periods.organicSsGrowth.meta,
          basis: "Seat compression slows core growth",
        }
      ),
      profServicesGrowth: periodDriver(
        {
          FY27E: 0.01,
          FY28E: 0.0,
          FY29E: -0.01,
          FY30E: -0.01,
          FY31E: -0.01,
        },
        {
          ...base.periods.profServicesGrowth.meta,
          basis: "Lower enterprise deployment volume",
        }
      ),
      corSubCashPctSs: periodDriver(
        {
          FY27E: 0.112,
          FY28E: 0.117,
          FY29E: 0.121,
          FY30E: 0.125,
          FY31E: 0.129,
        },
        {
          ...base.periods.corSubCashPctSs.meta,
          basis: "Higher AI inference & hosting cost",
        }
      ),
      rdCashPctRev: periodDriver(
        {
          FY27E: 0.118,
          FY28E: 0.122,
          FY29E: 0.125,
          FY30E: 0.126,
          FY31E: 0.126,
        },
        {
          ...base.periods.rdCashPctRev.meta,
          basis: "Elevated defensive AI R&D spend",
        }
      ),
      smCashPctRev: periodDriver(
        {
          FY27E: 0.297,
          FY28E: 0.3,
          FY29E: 0.302,
          FY30E: 0.303,
          FY31E: 0.304,
        },
        {
          ...base.periods.smCashPctRev.meta,
          basis: "Higher retention & GTM spend",
        }
      ),
      restructuringPctRev: periodDriver(
        {
          FY27E: 0.009,
          FY28E: 0.008,
          FY29E: 0.007,
          FY30E: 0.006,
          FY31E: 0.005,
        },
        {
          ...base.periods.restructuringPctRev.meta,
          basis: "Sustained restructuring cadence",
        }
      ),
      sbcPctRev: periodDriver(
        {
          FY27E: 0.091,
          FY28E: 0.093,
          FY29E: 0.094,
          FY30E: 0.095,
          FY31E: 0.095,
        },
        {
          ...base.periods.sbcPctRev.meta,
          basis: "Sticky equity grants on slower sales",
        }
      ),
      capexPctRev: periodDriver(
        {
          FY27E: 0.016,
          FY28E: 0.016,
          FY29E: 0.016,
          FY30E: 0.016,
          FY31E: 0.016,
        },
        {
          ...base.periods.capexPctRev.meta,
          basis: "Higher AI infrastructure CapEx",
        }
      ),
      finLeasePctRev: periodDriver(
        {
          FY27E: 0.015,
          FY28E: 0.015,
          FY29E: 0.015,
          FY30E: 0.015,
          FY31E: 0.015,
        },
        {
          ...base.periods.finLeasePctRev.meta,
          basis: "Higher server lease additions",
        }
      ),
      ppeDeprPctRev: periodDriver(
        {
          FY27E: 0.031,
          FY28E: 0.031,
          FY29E: 0.031,
          FY30E: 0.031,
          FY31E: 0.031,
        },
        {
          ...base.periods.ppeDeprPctRev.meta,
          basis: "Tracks higher CapEx & lease base",
        }
      ),
      capCommissionsPctSsRev: periodDriver(
        {
          FY27E: 0.065,
          FY28E: 0.065,
          FY29E: 0.065,
          FY30E: 0.065,
          FY31E: 0.065,
        },
        {
          ...base.periods.capCommissionsPctSsRev.meta,
          basis: "Higher renewal commission intensity",
        }
      ),
      dsoDays: periodDriver(
        {
          FY27E: 122,
          FY28E: 123,
          FY29E: 124,
          FY30E: 124,
          FY31E: 124,
        },
        {
          ...base.periods.dsoDays.meta,
          basis: "Slower enterprise cash collections",
        }
      ),
      unearnedRevPctSsRev: periodDriver(
        {
          FY27E: 0.605,
          FY28E: 0.595,
          FY29E: 0.585,
          FY30E: 0.58,
          FY31E: 0.58,
        },
        {
          ...base.periods.unearnedRevPctSsRev.meta,
          basis: "Shorter billing terms reduce float",
        }
      ),
      incrementalShareRepurchases: periodDriver(
        {
          FY27E: 0,
          FY28E: 2000,
          FY29E: 2500,
          FY30E: 3000,
          FY31E: 3500,
        },
        {
          ...base.periods.incrementalShareRepurchases.meta,
          basis: "Lower FCF trims open-market buybacks",
        }
      ),
    }),
  })
}

export function upsideDrivers(): ScenarioBundle {
  const base = baseDrivers()
  return Object.freeze({
    ...base,
    key: "upside",
    name: "Upside Case",
    index: 3,
    framing:
      "Agentforce consumption and Data 360 re-accelerate organic subscription growth toward management's long-range revenue ambition, driving sales leverage, tighter SBC discipline, negative-working-capital terminal float, and a lower strategic-investment haircut.",
    scalars: Object.freeze({
      ...base.scalars,
      effectiveTaxRate: scalarDriver(0.215, base.scalars.effectiveTaxRate.meta),
      terminalGrowthRate: scalarDriver(
        0.035,
        base.scalars.terminalGrowthRate.meta
      ),
      terminalReinvestmentRate: scalarDriver(
        -0.02,
        base.scalars.terminalReinvestmentRate.meta
      ),
      exitEbitdaMultiple: scalarDriver(
        12.0,
        base.scalars.exitEbitdaMultiple.meta
      ),
      strategicInvHaircut: scalarDriver(
        0.1,
        base.scalars.strategicInvHaircut.meta
      ),
      futureBuybackPrice: scalarDriver(
        250.0,
        base.scalars.futureBuybackPrice.meta
      ),
    }),
    periods: Object.freeze({
      ...base.periods,
      organicSsGrowth: periodDriver(
        {
          FY27E: 0.082,
          FY28E: 0.098,
          FY29E: 0.105,
          FY30E: 0.1,
          FY31E: 0.09,
        },
        {
          ...base.periods.organicSsGrowth.meta,
          basis: "Agentforce & Data 360 re-acceleration",
        }
      ),
      profServicesGrowth: periodDriver(
        {
          FY27E: 0.025,
          FY28E: 0.04,
          FY29E: 0.04,
          FY30E: 0.035,
          FY31E: 0.03,
        },
        {
          ...base.periods.profServicesGrowth.meta,
          basis: "AI onboarding demand lifts services",
        }
      ),
      corSubCashPctSs: periodDriver(
        {
          FY27E: 0.109,
          FY28E: 0.107,
          FY29E: 0.105,
          FY30E: 0.104,
          FY31E: 0.103,
        },
        {
          ...base.periods.corSubCashPctSs.meta,
          basis: "Cloud hosting efficiency scales",
        }
      ),
      rdCashPctRev: periodDriver(
        {
          FY27E: 0.115,
          FY28E: 0.114,
          FY29E: 0.112,
          FY30E: 0.11,
          FY31E: 0.108,
        },
        {
          ...base.periods.rdCashPctRev.meta,
          basis: "Engineering leverage over growth",
        }
      ),
      smCashPctRev: periodDriver(
        {
          FY27E: 0.292,
          FY28E: 0.284,
          FY29E: 0.276,
          FY30E: 0.27,
          FY31E: 0.265,
        },
        {
          ...base.periods.smCashPctRev.meta,
          basis: "Product-led enterprise GTM leverage",
          rationale:
            "Product-led Agentforce consumption and Data 360 expansion lift enterprise sales productivity toward mature low-SBC software peer operating margins.",
          source: "FY26 10-K, guide & peers",
        }
      ),
      restructuringPctRev: periodDriver(
        {
          FY27E: 0.008,
          FY28E: 0.004,
          FY29E: 0.002,
          FY30E: 0.001,
          FY31E: 0.001,
        },
        {
          ...base.periods.restructuringPctRev.meta,
          basis: "Faster post-M&A integration runoff",
        }
      ),
      sbcPctRev: periodDriver(
        {
          FY27E: 0.089,
          FY28E: 0.086,
          FY29E: 0.083,
          FY30E: 0.08,
          FY31E: 0.078,
        },
        {
          ...base.periods.sbcPctRev.meta,
          basis: "Tighter equity grant discipline",
        }
      ),
      capCommissionsPctSsRev: periodDriver(
        {
          FY27E: 0.062,
          FY28E: 0.061,
          FY29E: 0.06,
          FY30E: 0.059,
          FY31E: 0.058,
        },
        {
          ...base.periods.capCommissionsPctSsRev.meta,
          basis: "Lower acquisition cost on renewals",
        }
      ),
      dsoDays: periodDriver(
        {
          FY27E: 119,
          FY28E: 117,
          FY29E: 115,
          FY30E: 115,
          FY31E: 115,
        },
        {
          ...base.periods.dsoDays.meta,
          basis: "Faster annual renewal collections",
        }
      ),
      unearnedRevPctSsRev: periodDriver(
        {
          FY27E: 0.62,
          FY28E: 0.62,
          FY29E: 0.62,
          FY30E: 0.615,
          FY31E: 0.615,
        },
        {
          ...base.periods.unearnedRevPctSsRev.meta,
          basis: "Multi-year upfront billings expand",
        }
      ),
      incrementalShareRepurchases: periodDriver(
        {
          FY27E: 0,
          FY28E: 6000,
          FY29E: 7500,
          FY30E: 9500,
          FY31E: 12000,
        },
        {
          ...base.periods.incrementalShareRepurchases.meta,
          basis: "Higher FCF funds faster repurchases",
        }
      ),
    }),
  })
}
