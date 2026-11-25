import type { Sheet } from "f8-engine"
import type { ScenarioBundle } from "../assumptions.ts"
import type { ScenarioKey } from "../timeline.ts"

export function buildNotesSheet(
  sheet: Sheet,
  scenarios: Readonly<Record<ScenarioKey, ScenarioBundle>>
): void {
  // =========================================================================
  // TABLE 1: ScenarioFraming (Rendered directly from scenario.framing)
  // =========================================================================
  const sf = sheet.addTable(
    "ScenarioFraming",
    "Scenario Architecture & Key Value Drivers",
    {
      subtitle: [
        "Scenario assumptions across commercial ramp & pure-OEM margins, BDS fixed-price runoff,",
        "working-capital cash conversion, and capital-structure / cost-of-capital trajectories",
      ],
    }
  )
  sf.addColumn("scenario", { role: "descriptor", headers: ["Scenario"] })
  sf.addColumn("framing", {
    role: "descriptor",
    headers: ["Operating & valuation case summary"],
  })

  for (const key of ["downside", "base", "upside"] as const) {
    const bundle = scenarios[key]
    sf.addRow(key, {
      cells: {
        scenario: bundle.name,
        framing: bundle.framing,
      },
      ...(key === "base" ? { style: "bold" } : {}),
    })
  }

  // =========================================================================
  // TABLE 2: AccountingGovernanceNotes
  // =========================================================================
  const ag = sheet.addTable(
    "AccountingGovernanceNotes",
    "Accounting Normalizations, Methodology Conventions & Governance Notes",
    {
      subtitle: [
        "US GAAP operating-rent and 25.0% tax-rate consistency, dilution and NOL treatment,",
        "Airbus IFRS-to-US-GAAP parity adjustments, and 2026 Proxy compensation review",
      ],
      below: "ScenarioFraming",
      gap: 2,
    }
  )
  ag.addColumn("topic", { role: "descriptor", headers: ["Topic"] })
  ag.addColumn("detail", {
    role: "descriptor",
    headers: ["Analytical treatment & source basis"],
  })

  const notesRows: readonly [string, string, string][] = [
    [
      "qoe_das_hrl",
      "QoE normalization (DAS, HRL & Archer HFS)",
      "FY2025A BGS and consolidated GAAP EBIT include a $9,566M pre-tax gain on the October 31, 2025 Digital Aviation Solutions divestiture; Q3 2026A BDS EBIT includes a $252M gain on the HRL Laboratories sale (Q3 2026 Form 10-Q Note 10). Both non-recurring gains are stripped in QoE EBIT/EBITDA. Pending Insitu/Wisk/SkyGrid held-for-sale assets ($688M) and liabilities ($161M) = $527M net carrying value (+$0.63/sh memo) are carried flat without booking an assumed disposal gain.",
    ],
    [
      "spirit_ppa",
      "Spirit AeroSystems consolidation & PPA",
      "Consolidated December 8, 2025 (<1% FY2025 P&L impact; full 9M 2026 inclusion across BCA, BGS, and BDS). Provisional ASC 805 PPA includes $1,890M off-market contract liabilities with audited non-cash revenue amortization of $34M (Q4 26), $180M (2027), $221M (2028), $209M (2029), and $200M (2030) per Q3 2026 Form 10-Q Note 2; FY29E $209M amortization is stripped from BCA EBIT in SOTP. Assumed $230M 3.25% Exchangeable Notes due November 2028 (FY2025 Form 10-K Note 17; 1.5425M shares at $149.1046 strike) are incorporated dynamically alongside the BA-PRA conversion collar using the treasury-stock method.",
    ],
    [
      "sbc_401k",
      "401(k) stock funding & zero double-count",
      "Boeing funds employer 401(k) matches via treasury stock (~$1.7B/yr alongside ~$0.5B/yr SBC), creating a non-cash GAAP OCF add-back that inflates Headline FCF while causing ~1.5%/yr dilution. Primary DCF computes Unlevered Economic FCFF strictly from GAAP NOPAT without adding back SBC or 401(k) and divides Equity Value by valuation-date diluted shares (zero double-count). 3-statement GAAP EPS rolls shares forward for Street consensus comparability.",
    ],
    [
      "ba_pra_collar",
      "BA-PRA collar, 5 dividends & Ke roll",
      "$5,750M face value 6.00% Series A Mandatory Convertible Preferred (Q3 2026 Form 10-Q Note 16) converts October 15, 2027 into 40.2155M shares (≤ $142.98), 33.5110M shares (≥ $171.59), or $5,750M / Price in between. Modeled jointly with Spirit Exchangeable Notes across all conversion price thresholds, plus the Sep 30 PV of all 5 remaining quarterly cash dividends (Oct 15, 2026 through Oct 15, 2027 = $431.25M nominal, matching Q4 26E -$86.25M and FY27E -$345.00M cash outflows in the 3-statement model) and $0 preferred principal in debt. Sep 30 Equity Value rolls 51 days to Nov 20, 2026 at Cost of Equity (Ke), eliminating asymmetric WACC transfer on debt.",
    ],
    [
      "leases_pensions",
      "US GAAP operating-rent & pension bridge",
      "DCF, WACC, Invested Capital, and US Trading Comps enforce one clean US GAAP operating-rent basis: ASC 842 operating lease liabilities are excluded from debt because 100% of operating rent stays expensed inside EBIT/EBITDA/FCFF (finance leases of $314M for BA and $392M YE25 Note J for GD remain in gross debt). Q3 2026 LT unfunded pension ($4,018M) and OPEB ($1,995M) are augmented by audited YE25 net current/overfunded delta (($136M + $306M) − ($145M + $76M) = +$221M, FY2025 Form 10-K Note 18) to $6,234M pre-tax, tax-effected at 25.0% combined ($4,675.5M) in the EV bridge. Note: non-qualified/OPEB direct corporate cash payouts average ~$454M/yr and market-related value of assets (MRVA) carries a $1,398M unrecognized smoothing overhang.",
    ],
    [
      "taxes_nol",
      "25.0% tax symmetry & DTL/DTA risks",
      "Applies 25.0% combined corporate tax (21.0% federal + 4.0% foreign/state; $120M/yr cash floor, $30M in Q4 26E) symmetrically across 3-statement cash taxes, DCF NOPAT, Terminal NOPAT, ROIC, WACC Kd, and pension tax-effecting. Federal NOL carryforwards ($9,569M combined federal DTA, FY2025 Form 10-K Note 6) shield 80% × 21% federal tax only; post-FY32E remaining NOLs in Downside are valued explicitly over FY33E–FY37E without perpetuating them. Key offsetting tax-attribute sensitivities: (1) -$5,584M inventory/program-accounting DTL reversal upon commercial WIP unwind could accelerate federal NOL burn-off by up to ~$4.1B (-$5.0/sh); (2) +$2,633M state ($2,035M) and international ($598M) carryover DTAs provide up to +$1.2/sh offset. Under Boeing's $9,754M full ASC 740 valuation allowance, forecast GAAP tax equals cash tax (Normalized-Tax 25% EPS shown alongside VA-released GAAP EPS in the Consensus Bridge).",
    ],
    [
      "airbus_ge_comps",
      "Airbus IFRS parity & GE ex-Insurance",
      "Primary Airbus SE trading multiples remain on as-reported IFRS 16 (EV includes €2,387M IFRS 16 leases, deducts €2,350M / $2,578M listed Dassault Aviation non-operating stake, includes €986M Note 21 IR hedges, reflects €350M net pension surplus at $0 deficit, and excludes €3,813M European Gov't refundable advances). The supplemental Airbus US-GAAP parity memo strips €2,387M ($2,618M) IFRS 16 lease liabilities from EV and reverses IAS 38 capitalized R&D (€356M add / €168M amort) plus IFRS 16 rent (€254M ROU dep + €80M Note 20 interest) for symmetric post-rent EV/EBITDA and EV/EBIT multiples. GE Aerospace LTM EBIT strips run-off Insurance operating profit (FY25 $992M, 9M25 $714M, 9M26 $91M, for $10,468M true ex-Insurance EBIT).",
    ],
    [
      "wacc_terminal",
      "Capital structure & terminal discipline",
      "WACC pairs scenario-consistent leverage with Hamada beta: Downside and Base retain spot gross debt weight (26.2%, ex-op leases) with 2Y weekly (1.427) / 5Y monthly (1.307) OLS betas and 100% BB / 50-50 BBB-BB Kd (Base WACC 9.26%; De-Levered IG Transition WACC memo 9.01%); Upside pairs 15.0% IG target debt weight with Airbus-parity unlevered asset beta (0.86) re-levered via Hamada (0.974) and 100% BBB Kd, implying 8.62% WACC. Terminal growth (g = 3.00%) is held constant across all 3 scenarios while terminal RONIC reflects scenario operating productivity (18.0% Downside / 23.0% Base / 28.0% Upside). Level-2 FV debt (+$3.70/sh in Base) is shown alongside NOL-impaired WACC (-$3.01/sh in Base) in supplemental valuation sensitivities.",
    ],
    [
      "def14a_gov",
      "Executive comp & governance (2026 Proxy)",
      "Constructive reforms: 92% independent Board (Chair Steven Mollenkopf), 0% payout on 2023–2025 FCF PSUs with zero upward discretion, 20% FAA-aligned Safety & Quality AIP scorecard, and 2026–2028 rTSR PSU cap at 100% if absolute TSR is negative. Counterbalancing governance concerns: (1) 2025 One Company AIP paid out at 131% of target after +$1.4B M&A FCF adjustments moved FCF from -$1.9B to -$0.5B; (2) CFO Jay Malave received an unprorated full-year 2025 AIP ($1.651M at 131%) plus an $18.0M make-whole package (and $2.0M paid to Lockheed Martin); (3) 2026 LTI shifted to 70% time-vested RSUs (only 30% performance-based PSUs); and (4) tying 80% of AIP and 50% of PSUs to Headline non-GAAP FCF creates a structural agency conflict against switching ~$1.7B/yr employer 401(k) funding from dilutive treasury stock back to cash.",
    ],
  ]

  for (const [id, topic, detail] of notesRows) {
    ag.addRow(id, { cells: { topic, detail } })
  }

  // =========================================================================
  // TABLE 3: CatalystsAndTailRisks (Balanced 2026 Positive Catalysts + Contingent Risks)
  // =========================================================================
  const ctr = sheet.addTable(
    "CatalystsAndTailRisks",
    "2026 Positive Catalysts & Contingent / Off-Balance-Sheet Risk Summary",
    {
      subtitle: [
        "Operational and strategic developments realized or emerging in 2026 alongside quantified",
        "off-balance-sheet, contingent, and downside liquidity exposures",
      ],
      below: "AccountingGovernanceNotes",
      gap: 2,
    }
  )
  ctr.addColumn("category", { role: "descriptor", headers: ["Category"] })
  ctr.addColumn("summary", {
    role: "descriptor",
    headers: ["Quantified evidence & valuation relevance"],
  })

  const ctrRows: readonly [string, string, string][] = [
    [
      "pos_cert_labor",
      "Positive: FAA ATC & SPEEA labor",
      "737-7 and 737-10 achieved FAA Amended Type Certificate (ATC) milestones in 2026, de-risking narrowbody backlog conversion; SPEEA engineering and technical union contracts were ratified through 2030, locking in engineering labor stability ahead of IAM 70 (Jun 2027) and IAM 751 (Sep 2028) renewals.",
    ],
    [
      "pos_defense_bgs",
      "Positive: Defense awards, Archer & BGS",
      "Off-backlog next-generation defense awards (F-47 NGAD and F/A-XX fighter program exposure) provide multi-decade cost-plus development upside beyond the $100.5B Q3 2026 BDS backlog; pending Archer Aviation transaction (19.75% equity stake + $200M warrants) exits Wisk eVTOL R&D burn; BGS ERP integration and Spirit aftermarket consolidation support steady high-teens margins.",
    ],
    [
      "risk_ula_custfin",
      "Contingent: ULA & customer financing",
      "United Launch Alliance (ULA) carries a $750M Boeing debt guarantee alongside Q1 2026 Vulcan anomaly losses and Q4 2026 JV funding support (reflected in -$25M Q4 26E / -$40M FY27E equity-method losses). Customer financing commitments total $16.5B at Q3 2026 ($11.3B to sub-investment-grade airlines), creating counter-cyclical funding risk in a travel downturn.",
    ],
    [
      "risk_env_def_dpc",
      "Contingent: Precontract, 787 DPC & env.",
      "High-end environmental remediation exposure reaches $1.07B; defense precontract costs total $1.22B (including $556M Starliner risk) alongside $1.11B in supplier termination claims; 787 program carries $1.87B of deferred production costs reliant on future orders; 777F and KC-46A face 1H 2027 production disruption risk.",
    ],
    [
      "risk_tax_liq_shock",
      "Cash quality & Downside liquidity shock",
      "9M 2026 operating cash flow benefited from $420M of one-time IEEPA tariff refunds (partially offsetting -$689M DOJ payment); inventory/program-accounting DTLs total -$5.58B (federal NOL acceleration risk up to -$5.0/sh). Under a correlated Downside liquidity shock (~$5.25B combined working-capital freeze, customer financing draw, and ULA/supplier settlement), cash + STI + $10.0B revolvers remain the key solvency backstop against the $5.0B minimum liquidity covenant.",
    ],
  ]

  for (const [id, category, summary] of ctrRows) {
    ctr.addRow(id, { cells: { category, summary } })
  }

  // =========================================================================
  // TABLE 4: ResolvingMilestones (Aligned 2-column descriptor layout)
  // =========================================================================
  const rm = sheet.addTable(
    "ResolvingMilestones",
    "Key Operating Milestones & Scenario Signposts (2026 – 2028)",
    {
      subtitle:
        "Operational, regulatory, labor, and balance-sheet milestones governing scenario divergence (2026–2028)",
      below: "CatalystsAndTailRisks",
      gap: 2,
    }
  )
  rm.addColumn("milestone", {
    role: "descriptor",
    headers: ["Milestone & timing"],
  })
  rm.addColumn("signals", {
    role: "descriptor",
    headers: ["Downside signal vs. Base / Upside confirmation"],
  })

  const milestones: readonly [string, string, string][] = [
    [
      "m_737_rate",
      "737 MAX FAA rate 47 / 52 (H1–H2 2027)",
      "Downside: Rate capped ≤ 42–45/mo on Spirit fuselage or rework escapes. Base/Upside: Clean FAA concurrence to 47/mo (2027) and 52+/mo (2028).",
    ],
    [
      "m_787_charleston",
      "787 Charleston ramp >8/mo (2026–2028)",
      "Downside: Seat/fuselage bottlenecks stall deliveries below 90/yr. Base/Upside: Sustained 9–10/mo in 2027–2028 with 12/mo tooling visibility.",
    ],
    [
      "m_777x_cert",
      "777-9 FAA flight test & EIS (2026–2027)",
      "Downside: Certification slips to 2028+ with fresh reach-forward charge. Base/Upside: Type Inspection Authorization complete; first customer delivery 2027.",
    ],
    [
      "m_iam_labor",
      "IAM 70 & IAM 751 renewals (2027–2028)",
      "Downside: Work stoppage disrupts Spirit Wichita or Puget Sound lines. Base/Upside: Ratified contracts without extended production halt.",
    ],
    [
      "m_bds_eacs",
      "BDS EACs & F-47 / F/A-XX terms (2027)",
      "Downside: Recurring >$500M/yr fixed-price charges on KC-46/VC-25B/T-7A/Starliner. Base/Upside: Near-zero legacy EACs and disciplined cost-plus development terms.",
    ],
    [
      "m_wc_401k",
      "Inv. − Adv. unwind & 401(k) cash (2027–28)",
      "Downside: Net Inv − Adv stays >$22B; 401(k) remains 100% stock-funded. Base/Upside: Net Inv − Adv unwinds >$3B; transition toward cash 401(k) funding.",
    ],
    [
      "m_credit_bapra",
      "Fitch rating & BA-PRA conv. (H2 2027)",
      "Downside: Downgrade to BB+; BA-PRA converts at max 40.2M shares (<$143). Base/Upside: Upgrade to BBB; clean Oct 2027 conversion near/above $172 cap (33.5M sh).",
    ],
  ]

  for (const [id, milestone, signals] of milestones) {
    rm.addRow(id, {
      cells: {
        milestone,
        signals,
      },
    })
  }
}
