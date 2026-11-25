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
  readonly cashSgaPctNetSales: Driver<PeriodVector>
  readonly sbcPctNetSales: Driver<PeriodVector>
}

export function baseOperatingDrivers(): OperatingDrivers {
  return Object.freeze({
    netOpeningsUs: periodDriver(
      vecFromTuple([18, 17, 16, 16, 15, 14, 14, 13, 13, 12]),
      {
        label: "Net openings — U.S.",
        format: "integer",
        category: "Warehouse expansion",
        rationale:
          "Anchored to management opening guidance, tapering gradually as domestic warehouse density matures toward infill sites.",
        basis: "Guided FY27E + density fade",
        source: "Q4 FY26 call; FY26 10-K",
      }
    ),
    netOpeningsCanada: periodDriver(
      vecFromTuple([5, 4, 4, 4, 4, 3, 3, 3, 3, 3]),
      {
        label: "Net openings — Canada",
        format: "integer",
        category: "Warehouse expansion",
        rationale:
          "Starts from near-term opening guidance before settling into steady provincial infill given high per-capita penetration.",
        basis: "Guided FY27E + mature pace",
        source: "Q4 FY26 call; FY26 10-K",
      }
    ),
    netOpeningsOtherIntl: periodDriver(
      vecFromTuple([5, 6, 6, 6, 6, 5, 5, 5, 5, 5]),
      {
        label: "Net openings — Other Intl",
        format: "integer",
        category: "Warehouse expansion",
        rationale:
          "Follows near-term pipeline across Asia and Europe before stabilizing as local permitting and site acquisition pace scale.",
        basis: "Guided FY27E + intl pipeline",
        source: "Q4 FY26 call; FY26 10-K",
      }
    ),
    coreCompUs: periodDriver(
      vecFromTuple([
        0.061, 0.052, 0.046, 0.042, 0.039, 0.037, 0.035, 0.034, 0.033, 0.033,
      ]),
      {
        label: "Core comp growth — U.S.",
        format: "percentage",
        decimals: 1,
        category: "Comparable sales",
        rationale:
          "Anchored to traffic-led YTD momentum, tapering toward real household spend plus breakeven inflation less infill cannibalization.",
        basis: "YTD run-rate taper",
        source: "FY26 10-K; Q1 FY27 sales",
      }
    ),
    coreCompCanada: periodDriver(
      vecFromTuple([
        0.05, 0.046, 0.042, 0.038, 0.036, 0.035, 0.033, 0.032, 0.031, 0.031,
      ]),
      {
        label: "Core comp growth — Canada",
        format: "percentage",
        decimals: 1,
        category: "Comparable sales",
        rationale:
          "Reflects observed Canadian ex-gas/FX deceleration converging toward mature ticket and trip-frequency growth.",
        basis: "Monthly run-rate taper",
        source: "FY26 10-K; Q1 FY27 sales",
      }
    ),
    coreCompOtherIntl: periodDriver(
      vecFromTuple([
        0.058, 0.052, 0.048, 0.044, 0.041, 0.039, 0.037, 0.036, 0.035, 0.035,
      ]),
      {
        label: "Core comp growth — Other Intl",
        format: "percentage",
        decimals: 1,
        category: "Comparable sales",
        rationale:
          "Younger international club cohorts and digital adoption sustain a modest spread over domestic comps as stores season.",
        basis: "Cohort ramp fade",
        source: "FY26 10-K; Q1 FY27 sales",
      }
    ),
    gasFxCompImpact: periodDriver(
      vecFromTuple([0.012, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      {
        label: "Gasoline and FX comp impact",
        format: "percentage",
        decimals: 1,
        category: "Comparable sales",
        rationale:
          "Captures observed Q1 FY27 retail fuel-price pass-through tapering across the year, with zero speculative fuel or FX forecast thereafter.",
        basis: "Q1 FY27 fuel pass-through",
        source: "Sep–Oct 2026 sales releases",
      }
    ),
    newClubProductivity: scalarDriver(0.58, {
      label: "New club Year-1 sales yield",
      format: "percentage",
      decimals: 1,
      category: "Comparable sales",
      rationale:
        "New warehouses open mid-year on average and ramp below mature club volume in Year 1 based on multi-year sales-to-comp spreads.",
      basis: "Historical ramp calibration",
      source: "FY26 10-K, Note 11",
    }),
    membersPerWhGrowth: periodDriver(
      vecFromTuple([
        0.014, 0.012, 0.01, 0.008, 0.007, 0.006, 0.005, 0.004, 0.003, 0.003,
      ]),
      {
        label: "Members per club growth",
        format: "percentage",
        decimals: 1,
        category: "Membership fees",
        rationale:
          "Paid member density slowed sharply in FY26 after multi-year post-pandemic gains and tapers asymptotically as club capacity matures.",
        basis: "FY26 density deceleration",
        source: "FY26 10-K, Item 7",
      }
    ),
    feePerMemberGrowth: periodDriver(
      vecFromTuple([
        0.015, 0.008, 0.008, 0.025, 0.025, 0.008, 0.007, 0.006, 0.006, 0.006,
      ]),
      {
        label: "Fee yield per member growth",
        format: "percentage",
        decimals: 1,
        category: "Membership fees",
        rationale:
          "Prior fee-increase tailwinds fully lapped in Q4 FY26; near-term growth reflects Executive mix shift ahead of the next scheduled fee cycle.",
        basis: "Post-hike mix + cycle step",
        source: "Q4 FY26 call; FY26 10-K",
      }
    ),
    merchGrossMarginPct: periodDriver(
      vecFromTuple([
        0.1114, 0.1116, 0.1118, 0.112, 0.1121, 0.1122, 0.1123, 0.1124, 0.1125,
        0.1125,
      ]),
      {
        label: "Merchandise gross margin (%)",
        format: "percentage",
        decimals: 2,
        category: "Operating margins",
        rationale:
          "Removes non-recurring Q4 FY26 tariff refund lift and models gradual private-label mix gains largely reinvested into member pricing.",
        basis: "Normalized FY26 + ceiling",
        source: "FY26 10-K; Q4 FY26 call",
      }
    ),
    cashSgaPctNetSales: periodDriver(
      vecFromTuple([
        0.0823, 0.0821, 0.0819, 0.0817, 0.0815, 0.0813, 0.0811, 0.0809, 0.0807,
        0.0805,
      ]),
      {
        label: "Cash SG&A ex-D&A (% sales)",
        format: "percentage",
        decimals: 2,
        category: "Operating margins",
        rationale:
          "Ex-D&A cash operating expenses anchored to FY26 actual intensity, with gradual fixed-cost leverage net of recurring wage increases and digital fulfillment costs; GAAP SG&A adds D&A from the PP&E schedule.",
        basis: "FY26 ex-D&A + wage drag",
        source: "FY26 10-K, Items 7 & 8",
      }
    ),
    sbcPctNetSales: periodDriver(flatVec(0.0031), {
      label: "Stock-based comp (% sales)",
      format: "percentage",
      decimals: 2,
      category: "Operating margins",
      rationale:
        "Held at FY26 intensity and retained inside GAAP SG&A, EBIT, and unlevered cash flow as an ongoing employee compensation expense.",
      basis: "FY26 run-rate (in EBIT)",
      source: "FY26 10-K, Note 7",
    }),
  })
}

export function upsideOperatingDrivers(): OperatingDrivers {
  const base = baseOperatingDrivers()
  return Object.freeze({
    ...base,
    netOpeningsUs: periodDriver(
      vecFromTuple([20, 20, 20, 19, 18, 17, 17, 16, 16, 16]),
      {
        ...base.netOpeningsUs.meta,
        rationale:
          "Smaller-market and infill club formats sustain higher annual U.S. expansion across the forecast horizon.",
        basis: "Faster infill rollout",
      }
    ),
    netOpeningsCanada: periodDriver(
      vecFromTuple([5, 5, 5, 5, 4, 4, 4, 4, 4, 4]),
      {
        ...base.netOpeningsCanada.meta,
        rationale:
          "Higher provincial infill capacity sustains elevated Canadian club additions.",
        basis: "Higher infill cadence",
      }
    ),
    netOpeningsOtherIntl: periodDriver(
      vecFromTuple([6, 7, 7, 7, 7, 7, 7, 7, 7, 7]),
      {
        ...base.netOpeningsOtherIntl.meta,
        rationale:
          "Faster permitting across Asia and Europe supports a sustained step-up in annual international openings.",
        basis: "Accelerated intl pipeline",
      }
    ),
    coreCompUs: periodDriver(
      vecFromTuple([
        0.083, 0.065, 0.058, 0.052, 0.048, 0.045, 0.043, 0.041, 0.04, 0.04,
      ]),
      {
        ...base.coreCompUs.meta,
        rationale:
          "Sustains early-FY27 traffic share gains from grocery and mass-retail competitors before tapering above long-run trend.",
        basis: "Sustained share gains",
      }
    ),
    coreCompCanada: periodDriver(
      vecFromTuple([
        0.07, 0.056, 0.05, 0.046, 0.043, 0.04, 0.038, 0.037, 0.036, 0.036,
      ]),
      {
        ...base.coreCompCanada.meta,
        rationale:
          "Resilient household spending and high renewal rates support stronger Canadian comparable sales.",
        basis: "Resilient member spend",
      }
    ),
    coreCompOtherIntl: periodDriver(
      vecFromTuple([
        0.078, 0.062, 0.056, 0.052, 0.049, 0.047, 0.045, 0.043, 0.042, 0.042,
      ]),
      {
        ...base.coreCompOtherIntl.meta,
        rationale:
          "Stronger Asian and European warehouse maturity curves sustain elevated international comparable sales.",
        basis: "Stronger intl cohort ramp",
      }
    ),
    gasFxCompImpact: periodDriver(
      vecFromTuple([0.021, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      {
        ...base.gasFxCompImpact.meta,
        rationale:
          "Extended near-term retail fuel and currency tailwind lifts reported FY27E sales.",
        basis: "Extended FY27E fuel/FX lift",
      }
    ),
    newClubProductivity: scalarDriver(0.7, {
      ...base.newClubProductivity.meta,
      rationale:
        "Larger opening member sign-up cohorts lift Year-1 sales productivity at newly opened clubs.",
      basis: "Higher opening cohorts",
    }),
    membersPerWhGrowth: periodDriver(
      vecFromTuple([
        0.022, 0.018, 0.015, 0.012, 0.01, 0.009, 0.008, 0.008, 0.007, 0.007,
      ]),
      {
        ...base.membersPerWhGrowth.meta,
        rationale:
          "Stronger digital sign-up retention increases active member density across existing clubs.",
        basis: "Stronger digital retention",
      }
    ),
    feePerMemberGrowth: periodDriver(
      vecFromTuple([
        0.022, 0.014, 0.012, 0.032, 0.03, 0.012, 0.01, 0.01, 0.01, 0.01,
      ]),
      {
        ...base.feePerMemberGrowth.meta,
        rationale:
          "Faster Executive tier migration and intact pricing power expand realized membership fee yield.",
        basis: "Faster Executive upgrade",
      }
    ),
    merchGrossMarginPct: periodDriver(
      vecFromTuple([
        0.1124, 0.1129, 0.1134, 0.1139, 0.1144, 0.1148, 0.1152, 0.1155, 0.1158,
        0.116,
      ]),
      {
        ...base.merchGrossMarginPct.meta,
        rationale:
          "Private-label penetration and retail-media monetization expand merchandise gross margin beyond historical norms.",
        basis: "Private-label + media mix",
      }
    ),
    cashSgaPctNetSales: periodDriver(
      vecFromTuple([
        0.0812, 0.0806, 0.08, 0.0794, 0.0789, 0.0784, 0.0779, 0.0774, 0.077,
        0.0766,
      ]),
      {
        ...base.cashSgaPctNetSales.meta,
        rationale:
          "Higher warehouse volume and checkout automation generate sustained cash SG&A operating leverage.",
        basis: "Volume + tech leverage",
      }
    ),
  })
}

export function downsideOperatingDrivers(): OperatingDrivers {
  const base = baseOperatingDrivers()
  return Object.freeze({
    ...base,
    netOpeningsUs: periodDriver(
      vecFromTuple([16, 15, 14, 13, 12, 11, 11, 10, 10, 9]),
      {
        ...base.netOpeningsUs.meta,
        rationale:
          "Zoning constraints and domestic site saturation compress annual U.S. warehouse openings.",
        basis: "Site saturation slowdown",
      }
    ),
    netOpeningsCanada: periodDriver(
      vecFromTuple([4, 4, 3, 3, 3, 2, 2, 2, 2, 2]),
      {
        ...base.netOpeningsCanada.meta,
        rationale:
          "High regional club saturation limits incremental Canadian warehouse additions.",
        basis: "Mature market saturation",
      }
    ),
    netOpeningsOtherIntl: periodDriver(
      vecFromTuple([5, 5, 5, 5, 4, 4, 4, 4, 4, 4]),
      {
        ...base.netOpeningsOtherIntl.meta,
        rationale:
          "Slower international permitting and local club rivalry temper overseas store growth.",
        basis: "Permitting & rivalry drag",
      }
    ),
    coreCompUs: periodDriver(
      vecFromTuple([
        0.044, 0.04, 0.036, 0.032, 0.03, 0.028, 0.027, 0.026, 0.025, 0.025,
      ]),
      {
        ...base.coreCompUs.meta,
        rationale:
          "Food disinflation, club-peer digital competition, and softer discretionary demand compress domestic comparable sales.",
        basis: "Competitive & macro fade",
      }
    ),
    coreCompCanada: periodDriver(
      vecFromTuple([
        0.036, 0.034, 0.032, 0.029, 0.027, 0.026, 0.025, 0.024, 0.024, 0.024,
      ]),
      {
        ...base.coreCompCanada.meta,
        rationale:
          "Household debt burdens curb real basket expansion across Canadian clubs.",
        basis: "Consumer spend slowdown",
      }
    ),
    coreCompOtherIntl: periodDriver(
      vecFromTuple([
        0.04, 0.039, 0.037, 0.034, 0.032, 0.03, 0.029, 0.028, 0.028, 0.028,
      ]),
      {
        ...base.coreCompOtherIntl.meta,
        rationale:
          "Slower discretionary spending moderates international warehouse ramp and ticket growth.",
        basis: "International macro fade",
      }
    ),
    gasFxCompImpact: periodDriver(
      vecFromTuple([0.004, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      {
        ...base.gasFxCompImpact.meta,
        rationale:
          "Earlier retail fuel price normalization trims near-term reported comp benefit.",
        basis: "Earlier fuel normalization",
      }
    ),
    newClubProductivity: scalarDriver(0.5, {
      ...base.newClubProductivity.meta,
      rationale:
        "Infill cannibalization reduces Year-1 incremental sales productivity at newly opened warehouses.",
      basis: "Infill cannibalization",
    }),
    membersPerWhGrowth: periodDriver(
      vecFromTuple([
        0.008, 0.006, 0.005, 0.004, 0.003, 0.002, 0.002, 0.001, 0.001, 0,
      ]),
      {
        ...base.membersPerWhGrowth.meta,
        rationale:
          "Promotional digital sign-up cohorts renew below legacy averages amid discounted rival club offers.",
        basis: "Lower cohort retention",
      }
    ),
    feePerMemberGrowth: periodDriver(
      vecFromTuple([
        0.01, 0.005, 0.005, 0.015, 0.015, 0.004, 0.004, 0.004, 0.003, 0.003,
      ]),
      {
        ...base.feePerMemberGrowth.meta,
        rationale:
          "Discounted competitor membership tiers limit Executive upgrades and constrain future fee increases.",
        basis: "Peer fee competition",
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
          "Tariff absorption, fresh-food shrink, and defensive price investment compress merchandise gross margin.",
        basis: "Tariff & price investment",
      }
    ),
    cashSgaPctNetSales: periodDriver(
      vecFromTuple([
        0.0832, 0.0834, 0.0835, 0.0835, 0.0835, 0.0835, 0.0834, 0.0834, 0.0834,
        0.0834,
      ]),
      {
        ...base.cashSgaPctNetSales.meta,
        rationale:
          "Hourly wage inflation and fulfillment delivery costs deleverage cash SG&A against slower comparable sales.",
        basis: "Wage & fulfillment drag",
      }
    ),
  })
}
