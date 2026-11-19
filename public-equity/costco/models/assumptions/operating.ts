import {
  flatVec,
  periodDriver,
  scalarDriver,
  vecFromTuple,
  type Driver,
  type PeriodVector,
} from "./types.ts"

export interface OperatingDrivers {
  readonly netOpeningsUs: Driver<PeriodVector>
  readonly netOpeningsCanada: Driver<PeriodVector>
  readonly netOpeningsOtherIntl: Driver<PeriodVector>
  readonly coreCompUs: Driver<PeriodVector>
  readonly coreCompCanada: Driver<PeriodVector>
  readonly coreCompOtherIntl: Driver<PeriodVector>
  readonly gasFxCompImpact: Driver<PeriodVector>
  readonly newClubProductivity: Driver<number>
  readonly membersPerWhGrowth: Driver<PeriodVector>
  readonly feePerMemberGrowth: Driver<PeriodVector>
  readonly merchGrossMarginPct: Driver<PeriodVector>
  readonly sgaPctNetSales: Driver<PeriodVector>
  readonly sbcPctNetSales: Driver<PeriodVector>
}

export function baseOperatingDrivers(): OperatingDrivers {
  return Object.freeze({
    netOpeningsUs: periodDriver(
      vecFromTuple([18, 17, 16, 16, 15, 14, 14, 13, 13, 12]),
      {
        label: "Net warehouse openings — U.S.",
        format: "integer",
        category: "Warehouse Expansion",
        rationale:
          "FY27E reflects management guidance (18 net US openings), tapering as domestic club density matures toward infill opportunities.",
        basis: "Guided FY27E + density fade",
        source: "Q4 FY26 earnings call; FY26 Form 10-K, Item 1",
      }
    ),
    netOpeningsCanada: periodDriver(
      vecFromTuple([5, 4, 4, 4, 4, 3, 3, 3, 3, 3]),
      {
        label: "Net warehouse openings — Canada",
        format: "integer",
        category: "Warehouse Expansion",
        rationale:
          "Reflects FY27E guided 5 openings followed by steady 3-4/yr provincial infill given already high per-capita penetration.",
        basis: "Guided FY27E + mature cadence",
        source: "Q4 FY26 earnings call; FY26 Form 10-K, Item 1",
      }
    ),
    netOpeningsOtherIntl: periodDriver(
      vecFromTuple([5, 6, 6, 6, 6, 5, 5, 5, 5, 5]),
      {
        label: "Net warehouse openings — Other Intl",
        format: "integer",
        category: "Warehouse Expansion",
        rationale:
          "Starts at FY27E guidance (5) and expands modestly across Asia/Europe pipelines before stabilizing as permitting limits scale.",
        basis: "Guided FY27E + international pipeline",
        source: "Q4 FY26 earnings call; FY26 Form 10-K, Item 1",
      }
    ),
    coreCompUs: periodDriver(
      vecFromTuple([
        0.061, 0.052, 0.046, 0.042, 0.039, 0.037, 0.035, 0.034, 0.033, 0.033,
      ]),
      {
        label: "Core comp sales growth (ex-gas/FX) — U.S.",
        format: "percentage",
        decimals: 1,
        category: "Comparable Sales & Productivity",
        rationale:
          "Anchored to Q1 FY27 YTD traffic-led momentum before normalizing post-cycle toward real household spend plus 2.2% breakeven inflation minus infill cannibalization.",
        basis: "Q1 FY27 run-rate taper",
        source:
          "FY26 Form 10-K, Item 7; Q1 FY27 monthly sales releases; FRED T10YIE",
      }
    ),
    coreCompCanada: periodDriver(
      vecFromTuple([
        0.05, 0.046, 0.042, 0.038, 0.036, 0.035, 0.033, 0.032, 0.031, 0.031,
      ]),
      {
        label: "Core comp sales growth (ex-gas/FX) — Canada",
        format: "percentage",
        decimals: 1,
        category: "Comparable Sales & Productivity",
        rationale:
          "Reflects Sept/Oct 2026 deceleration in Canadian ex-gas/FX comps (3.5%-4.9%) converging toward mature GDP-linked ticket and frequency growth.",
        basis: "Monthly run-rate taper",
        source: "FY26 Form 10-K, Item 7; Q1 FY27 monthly sales releases",
      }
    ),
    coreCompOtherIntl: periodDriver(
      vecFromTuple([
        0.058, 0.052, 0.048, 0.044, 0.041, 0.039, 0.037, 0.036, 0.035, 0.035,
      ]),
      {
        label: "Core comp sales growth (ex-gas/FX) — Other Intl",
        format: "percentage",
        decimals: 1,
        category: "Comparable Sales & Productivity",
        rationale:
          "Higher international club ramp and digital adoption sustain a ~30 bps premium over U.S. core comps, moderating as newer Asian cohorts season.",
        basis: "Cohort ramp fade",
        source: "FY26 Form 10-K, Item 7; Q1 FY27 monthly sales releases",
      }
    ),
    gasFxCompImpact: periodDriver(
      vecFromTuple([0.012, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      {
        label: "Gasoline & FX comp sales tailwind / (drag)",
        format: "percentage",
        decimals: 1,
        category: "Comparable Sales & Productivity",
        rationale:
          "Captures verified Q1 FY27 gasoline price inflation (+32.8% YoY in Sept/Oct adding ~3.7% to reported comps) tapering across FY27E, with zero speculative fuel/FX prediction beyond FY27E.",
        basis: "Observed Q1 FY27 gas pass-through",
        source: "Q1 FY27 monthly sales releases (Sept–Oct 2026)",
      }
    ),
    newClubProductivity: scalarDriver(0.58, {
      label: "New warehouse Year-1 sales productivity vs. mature avg",
      format: "percentage",
      decimals: 1,
      category: "Comparable Sales & Productivity",
      rationale:
        "New clubs open mid-year on average and ramp from ~50-65% of mature warehouse volume in Year 1; calibrated against FY22-FY26 net sales vs. comp/warehouse spreads.",
      basis: "Historical ramp regression",
      source: "FY26 Form 10-K, Note 11 & Item 7",
    }),
    membersPerWhGrowth: periodDriver(
      vecFromTuple([
        0.014, 0.012, 0.01, 0.008, 0.007, 0.006, 0.005, 0.004, 0.003, 0.003,
      ]),
      {
        label: "Paid members per ending warehouse growth",
        format: "percentage",
        decimals: 1,
        category: "Membership Fee Engine",
        rationale:
          "Paid members per warehouse rose ~3.5% annually in FY23-FY25 before slowing to +1.1% in FY26 (89.6k/club); fades asymptotically as mature club capacity saturates.",
        basis: "FY26 density deceleration",
        source: "FY26 Form 10-K, Item 7; Q4 FY26 earnings release",
      }
    ),
    feePerMemberGrowth: periodDriver(
      vecFromTuple([
        0.015, 0.008, 0.008, 0.025, 0.025, 0.008, 0.007, 0.006, 0.006, 0.006,
      ]),
      {
        label: "Annual fee yield per avg paid member growth",
        format: "percentage",
        decimals: 1,
        category: "Membership Fee Engine",
        rationale:
          "Sep 2024 fee hike tailwind ended (<1% in Q4 FY26); FY27E-FY29E reflects Executive upgrade mix shift alone before modeling a modest 5-6 yr fee cycle step-up in FY30E-FY31E.",
        basis: "Post-hike normalization + Executive mix",
        source: "Q4 FY26 earnings call; FY26 Form 10-K, Item 7",
      }
    ),
    merchGrossMarginPct: periodDriver(
      vecFromTuple([
        0.1114, 0.1116, 0.1118, 0.112, 0.1121, 0.1122, 0.1123, 0.1124, 0.1125,
        0.1125,
      ]),
      {
        label: "Merchandise gross margin (% of net sales)",
        format: "percentage",
        decimals: 2,
        category: "Operating Margins & Expense",
        rationale:
          "Strips Q4 FY26 net IEEPA tariff benefit (~3 bps FY26 lift) and models steady Kirkland Signature / scale mix gains largely reinvested in member pricing per Costco's ~11.1-11.3% ceiling.",
        basis: "QoE-adjusted FY26 + disciplined ceiling",
        source: "FY26 Form 10-K, Item 8; Q4 FY26 earnings call",
      }
    ),
    sgaPctNetSales: periodDriver(
      vecFromTuple([
        0.0912, 0.091, 0.0908, 0.0906, 0.0904, 0.0902, 0.09, 0.0898, 0.0896,
        0.0895,
      ]),
      {
        label: "SG&A expense (% of net sales)",
        format: "percentage",
        decimals: 2,
        category: "Operating Margins & Expense",
        rationale:
          "Modest fixed-cost leverage from 9.15% FY26 toward 8.95% as sales scale, constrained by recurring warehouse hourly wage hikes and higher e-commerce/last-mile fulfillment costs.",
        basis: "Scale leverage net of wage/digital drag",
        source: "FY26 Form 10-K, Item 7 & Item 8",
      }
    ),
    sbcPctNetSales: periodDriver(flatVec(0.0031), {
      label: "Stock-based compensation (% of net sales)",
      format: "percentage",
      decimals: 2,
      category: "Operating Margins & Expense",
      rationale:
        "Held at FY26 actual intensity (0.31% of net sales); retained strictly inside GAAP SG&A/EBIT/FCFF as a real ongoing employee compensation cost.",
      basis: "FY26 run-rate (no add-back)",
      source: "FY26 Form 10-K, Note 7 & Item 8",
    }),
  })
}

export function bullOperatingDrivers(): OperatingDrivers {
  const base = baseOperatingDrivers()
  return Object.freeze({
    ...base,
    netOpeningsUs: periodDriver(
      vecFromTuple([19, 18, 18, 17, 17, 16, 16, 15, 15, 15]),
      {
        ...base.netOpeningsUs.meta,
        rationale:
          "Successful small-market and infill formats sustain ~15-19 net US club additions annually.",
        basis: "Upside rollout cadence",
      }
    ),
    netOpeningsCanada: periodDriver(
      vecFromTuple([5, 5, 5, 4, 4, 4, 4, 4, 4, 4]),
      {
        ...base.netOpeningsCanada.meta,
        rationale: "Maintains 4-5 annual openings in Canada.",
        basis: "Upside rollout cadence",
      }
    ),
    netOpeningsOtherIntl: periodDriver(
      vecFromTuple([6, 7, 7, 7, 7, 7, 7, 7, 7, 7]),
      {
        ...base.netOpeningsOtherIntl.meta,
        rationale:
          "Accelerated permitting across China, Japan, Korea, and Europe supports 7 net international clubs/yr.",
        basis: "Accelerated international expansion",
      }
    ),
    coreCompUs: periodDriver(
      vecFromTuple([
        0.068, 0.06, 0.055, 0.05, 0.047, 0.045, 0.043, 0.041, 0.04, 0.04,
      ]),
      {
        ...base.coreCompUs.meta,
        rationale:
          "Continued traffic share gains from grocery/mass-retail peers sustain ~4.0-6.8% core US comps.",
        basis: "Share-gain upside path",
      }
    ),
    coreCompCanada: periodDriver(
      vecFromTuple([
        0.056, 0.052, 0.048, 0.045, 0.042, 0.04, 0.038, 0.037, 0.036, 0.036,
      ]),
      {
        ...base.coreCompCanada.meta,
        rationale:
          "Resilient membership spending supports higher Canadian comps.",
        basis: "Share-gain upside path",
      }
    ),
    coreCompOtherIntl: periodDriver(
      vecFromTuple([
        0.065, 0.06, 0.056, 0.052, 0.049, 0.047, 0.045, 0.043, 0.042, 0.042,
      ]),
      {
        ...base.coreCompOtherIntl.meta,
        rationale: "Stronger Asian warehouse ramp sustains >4% long-run comps.",
        basis: "International upside path",
      }
    ),
    gasFxCompImpact: periodDriver(
      vecFromTuple([0.015, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      {
        ...base.gasFxCompImpact.meta,
        rationale: "Higher sustained FY27E fuel/FX tailwind.",
      }
    ),
    newClubProductivity: scalarDriver(0.65, {
      ...base.newClubProductivity.meta,
      rationale:
        "Larger opening day member cohorts lift Year-1 new club sales yield toward 65% of mature clubs.",
      basis: "High-cohort ramp",
    }),
    membersPerWhGrowth: periodDriver(
      vecFromTuple([
        0.02, 0.018, 0.015, 0.012, 0.01, 0.009, 0.008, 0.008, 0.007, 0.007,
      ]),
      {
        ...base.membersPerWhGrowth.meta,
        rationale:
          "Stronger digital sign-up retention lifts club member density.",
      }
    ),
    feePerMemberGrowth: periodDriver(
      vecFromTuple([
        0.02, 0.012, 0.012, 0.032, 0.03, 0.012, 0.01, 0.01, 0.01, 0.01,
      ]),
      {
        ...base.feePerMemberGrowth.meta,
        rationale:
          "Faster Executive tier migration (~55%+) and full pricing power on next fee cycle.",
      }
    ),
    merchGrossMarginPct: periodDriver(
      vecFromTuple([
        0.112, 0.1125, 0.113, 0.1135, 0.114, 0.1144, 0.1148, 0.115, 0.1152,
        0.1155,
      ]),
      {
        ...base.merchGrossMarginPct.meta,
        rationale:
          "Kirkland Signature penetration and retail media monetization expand merchandise margin toward 11.55%.",
      }
    ),
    sgaPctNetSales: periodDriver(
      vecFromTuple([
        0.0906, 0.0902, 0.0898, 0.0894, 0.089, 0.0885, 0.088, 0.0875, 0.087,
        0.0865,
      ]),
      {
        ...base.sgaPctNetSales.meta,
        rationale:
          "Stronger volume leverage drives SG&A down 50 bps over the forecast decade.",
      }
    ),
  })
}

export function bearOperatingDrivers(): OperatingDrivers {
  const base = baseOperatingDrivers()
  return Object.freeze({
    ...base,
    netOpeningsUs: periodDriver(
      vecFromTuple([16, 15, 14, 13, 12, 11, 11, 10, 10, 9]),
      {
        ...base.netOpeningsUs.meta,
        rationale:
          "Zoning bottlenecks and site saturation compress net US openings toward 9/yr by FY36E.",
        basis: "Site saturation downside",
      }
    ),
    netOpeningsCanada: periodDriver(
      vecFromTuple([4, 4, 3, 3, 3, 2, 2, 2, 2, 2]),
      {
        ...base.netOpeningsCanada.meta,
        rationale:
          "Near-full Canadian market saturation slows annual additions.",
        basis: "Saturation downside",
      }
    ),
    netOpeningsOtherIntl: periodDriver(
      vecFromTuple([5, 5, 5, 5, 4, 4, 4, 4, 4, 4]),
      {
        ...base.netOpeningsOtherIntl.meta,
        rationale:
          "Slower international permitting and heightened Sam's/local rivalry.",
        basis: "Execution slowdown",
      }
    ),
    coreCompUs: periodDriver(
      vecFromTuple([
        0.05, 0.042, 0.036, 0.032, 0.03, 0.028, 0.027, 0.026, 0.025, 0.025,
      ]),
      {
        ...base.coreCompUs.meta,
        rationale:
          "Disinflation, Sam's Club digital competition (Scan & Go), and discretionary ticket softness compress US core comps toward 2.5%.",
        basis: "Competitive & macro deceleration",
      }
    ),
    coreCompCanada: periodDriver(
      vecFromTuple([
        0.04, 0.036, 0.032, 0.029, 0.027, 0.026, 0.025, 0.024, 0.024, 0.024,
      ]),
      {
        ...base.coreCompCanada.meta,
        rationale: "Canadian consumer leverage curbs real ticket growth.",
        basis: "Macro slowdown",
      }
    ),
    coreCompOtherIntl: periodDriver(
      vecFromTuple([
        0.045, 0.041, 0.037, 0.034, 0.032, 0.03, 0.029, 0.028, 0.028, 0.028,
      ]),
      {
        ...base.coreCompOtherIntl.meta,
        rationale: "Slower discretionary absorption in international clubs.",
        basis: "Macro slowdown",
      }
    ),
    gasFxCompImpact: periodDriver(
      vecFromTuple([0.006, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      {
        ...base.gasFxCompImpact.meta,
        rationale: "Early oil/gas mean reversion limits FY27E fuel tailwind.",
      }
    ),
    newClubProductivity: scalarDriver(0.5, {
      ...base.newClubProductivity.meta,
      rationale:
        "Cannibalization from infill locations reduces Year-1 incremental sales productivity to 50%.",
      basis: "Cannibalization stress",
    }),
    membersPerWhGrowth: periodDriver(
      vecFromTuple([
        0.008, 0.006, 0.005, 0.004, 0.003, 0.002, 0.002, 0.001, 0.001, 0,
      ]),
      {
        ...base.membersPerWhGrowth.meta,
        rationale:
          "Younger digital-promo cohorts renew below historical averages as Sam's and BJ's discount memberships.",
      }
    ),
    feePerMemberGrowth: periodDriver(
      vecFromTuple([
        0.01, 0.005, 0.005, 0.015, 0.015, 0.004, 0.004, 0.004, 0.003, 0.003,
      ]),
      {
        ...base.feePerMemberGrowth.meta,
        rationale:
          "Competitive pressure from Sam's ($50/$110) and BJ's ($60/$120) constrains Executive mix and future fee increases.",
      }
    ),
    merchGrossMarginPct: periodDriver(
      vecFromTuple([
        0.1102, 0.11, 0.1098, 0.1096, 0.1094, 0.1092, 0.109, 0.1088, 0.1086,
        0.1085,
      ]),
      {
        ...base.merchGrossMarginPct.meta,
        rationale:
          "Tariff absorption, fresh shrinkage, and aggressive price investment pull merchandise GM back toward 10.85%.",
      }
    ),
    sgaPctNetSales: periodDriver(
      vecFromTuple([
        0.092, 0.0922, 0.0922, 0.0922, 0.0922, 0.0921, 0.0921, 0.092, 0.092,
        0.092,
      ]),
      {
        ...base.sgaPctNetSales.meta,
        rationale:
          "Hourly wage inflation and low-margin e-commerce delivery deleverage SG&A on slower comps.",
      }
    ),
  })
}
