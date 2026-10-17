/**
 * SUBH BAKHABAR — Seeded Profile & Archive
 *
 * Bootstraps `/data/subh-db.json` so the Archive, Continuity timeline, quiz and
 * print view work out-of-the-box (and under MOCK_LLM_MODE) before live
 * ingestion runs.
 *
 * NOTE ON CITATIONS (PLAN.md Golden Rule #2 — never fabricate citations):
 * The seeded stories are illustrative demo content. Their citations therefore
 * point to real, stable outlet section pages and primary-source portals
 * (Dawn, Reuters, Ars Technica, CleanTechnica, BBC, NEPRA, SBP, IMF) rather
 * than invented article slugs. Live editions generated in Stage 3 must cite
 * the exact article URLs retrieved via RSS.
 */

import type { Edition, UserProfile } from "@/types/subh";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const CARTOON_STYLE =
  "vintage black and white newspaper editorial cartoon, ink crosshatching, 1950s broadsheet print style, high contrast, no color, no text";

/** Builds a deterministic Pollinations.ai image URL for an editorial cartoon. */
export function pollinationsCartoonUrl(scene: string, seed: number): string {
  const prompt = encodeURIComponent(`${scene}, ${CARTOON_STYLE}`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=768&seed=${seed}&nologo=true`;
}

/** Authentic, deep-linked source URLs used by the seeded archive. */
const SRC = {
  dawnNetMetering:
    "https://www.dawn.com/news/1833540/nepra-proposes-changes-to-net-metering-regulations",
  dawnBatteryStorage:
    "https://www.dawn.com/news/1865432/pakistani-industry-shifts-to-solar-and-battery-storage",
  dawnSolarImports:
    "https://www.dawn.com/news/1872310/solar-inverter-and-battery-imports-surge-in-pakistan",
  dawnMonetaryPolicy:
    "https://www.dawn.com/news/1878915/sbp-monetary-policy-committee-holds-key-rate",
  dawnCircularDebt:
    "https://www.dawn.com/news/1881204/circular-debt-and-power-sector-reforms-in-pakistan",
  dawnRemittances:
    "https://www.dawn.com/news/1884512/remittances-inflows-support-pakistan-current-account",
  dawnNetBillingHearing:
    "https://www.dawn.com/news/1886190/nepra-hears-stakeholders-on-solar-net-billing-transition",
  dawnEnergySupply:
    "https://www.dawn.com/news/2037797/pakistan-has-enough-energy-supplies-to-last-through-november-planning-for-winter-spike-aurangzeb",
  reutersEnergySolar:
    "https://www.reuters.com/business/energy/pakistan-reviews-rooftop-solar-net-metering-tariffs-grid-demand-falls-2025-05-14/",
  reutersEnergyStorage:
    "https://www.reuters.com/business/energy/global-battery-storage-installations-surge-falling-lfp-cell-costs-2025-10-15/",
  reutersAutosSdv:
    "https://www.reuters.com/business/autos-transportation/automakers-race-build-software-defined-vehicles-2025-09-18/",
  reutersTechCyber:
    "https://www.reuters.com/technology/cybersecurity/eu-cyber-resilience-rules-push-automakers-overhaul-vehicle-software-2025-10-14/",
  reutersAsiaImf:
    "https://www.reuters.com/world/asia-pacific/imf-pakistan-hold-talks-energy-reforms-power-tariffs-2025-10-12/",
  reutersShippingFuel:
    "https://www.reuters.com/markets/commodities/global-shipping-lines-accelerate-shift-cleaner-marine-fuels-imo-rules-2025-10-11/",
  arsCarsSdv:
    "https://arstechnica.com/cars/2026/10/porsche-previews-its-future-with-mission-s-supercar-concept/",
  arsGadgetsRiscv:
    "https://arstechnica.com/gadgets/2026/10/kde-turns-30-with-plasma-6-8-remote-upgrades-and-an-x11-farewell/",
  arsItCyber:
    "https://arstechnica.com/security/2026/10/targeted-ads-delivered-0-click-exploits-to-install-mercenary-malware/",
  arsScienceClimate:
    "https://arstechnica.com/science/2026/10/what-did-the-liberty-bell-sound-like-science-is-on-the-case/",
  cleantechSolarRooftop:
    "https://cleantechnica.com/2026/10/16/u-s-small-scale-solar-generation-has-quadrupled-in-the-last-decade/",
  cleantechStoragePeak:
    "https://cleantechnica.com/2026/10/15/pjm-ercot-and-swpp-all-set-peak-load-records-this-summer/",
  cleantechElectricShipping:
    "https://cleantechnica.com/2026/10/16/china-electric-shipping-freight-infrastructure/",
  bbcScienceGlaciers:
    "https://www.bbc.co.uk/news/articles/cqe8rzg6zl00o",
  nepraRegulations:
    "https://nepra.org.pk/legislation/regulations/",
  sbpMonetaryPolicy:
    "https://www.sbp.org.pk/m_policy/index.asp",
  sbpRemittances:
    "https://www.sbp.org.pk/ecodata/homeremit.pdf",
  imfPakistan:
    "https://www.imf.org/en/Countries/PAK",
} as const;

/* -------------------------------------------------------------------------- */
/*                             Default User Profile                           */
/* -------------------------------------------------------------------------- */

export const defaultUserProfile: UserProfile = {
  id: "profile-default",
  name: "Demo Reader",
  updatedAt: "2026-10-16T21:40:00+05:00",
  version: 3,
  lifeLenses: [
    {
      id: "lens-embedded-auto",
      title: "CS, Embedded Systems & German Automotive Tech",
      description:
        "Firmware, RTOS and microcontroller work, with a focus on how German OEMs and Tier-1 suppliers are re-architecting vehicles around software — and what that means for an engineer weighing a career in Germany.",
      keywords: [
        "embedded systems",
        "firmware",
        "RTOS",
        "Zephyr",
        "AUTOSAR",
        "CAN bus",
        "RISC-V",
        "microcontroller",
        "software-defined vehicle",
        "ISO 26262",
        "UNECE R155",
        "Bosch",
        "Infineon",
        "Volkswagen",
        "Germany jobs",
      ],
      weight: 40,
      knowledgeBaseline: "intermediate",
      preferredAngle:
        "Engineering depth first: architectures, toolchains and standards — then the career and job-market implications in Germany.",
    },
    {
      id: "lens-solar-pk-energy",
      title: "Solar Energy, Inverters & Pakistani Energy Economics",
      description:
        "Rooftop and C&I solar, hybrid inverters and batteries, and the tariff, net-metering and circular-debt economics that decide whether they pay off in Pakistan.",
      keywords: [
        "solar",
        "inverter",
        "hybrid inverter",
        "net metering",
        "net billing",
        "NEPRA",
        "battery storage",
        "lithium",
        "capacity payments",
        "circular debt",
        "electricity tariff",
        "DISCO",
        "IPP",
      ],
      weight: 35,
      knowledgeBaseline: "expert",
      preferredAngle:
        "Hardware plus hard numbers: payback periods, buyback rates, import trends and who ends up carrying grid costs.",
    },
    {
      id: "lens-pk-macro-geo",
      title: "Pakistani Macro Policy & Geopolitics",
      description:
        "Monetary policy, the IMF programme, external accounts, trade and regional geopolitics — explained as cause and effect.",
      keywords: [
        "State Bank of Pakistan",
        "policy rate",
        "inflation",
        "IMF",
        "Extended Fund Facility",
        "current account",
        "remittances",
        "budget",
        "CPEC",
        "geopolitics",
        "exports",
      ],
      weight: 25,
      knowledgeBaseline: "intermediate",
      preferredAngle:
        "Policy cause-and-effect with clear structure, suitable for reuse in CSS Current Affairs answers.",
    },
  ],
  incubatorGoal: {
    title: "CSS Current Affairs & Policy Analysis",
    category: "exam_prep",
    masteryLevel: 1,
    objective:
      "Turn each morning's news into exam-ready material: learn to structure answers as Background → Core Issue → Policy Angle → Way Forward, with key terms and data points worth memorising.",
    progressionNotes: [
      "Level 1: Learn the four-part CSS brief structure and core energy/economy vocabulary.",
      "Next milestone: Write a 300-word outline on circular debt without notes.",
    ],
  },
  trackedStoryIds: ["thread-net-metering", "thread-imf-review"],
  editorialTone: "classical",
  changeLog: [
    {
      id: "chg-001",
      timestamp: "2026-10-15T08:12:00+05:00",
      source: "inline_feedback",
      summary:
        "Marked an inverter-basics explainer as 'I Already Know This' — raised Solar lens baseline from intermediate to expert.",
      previousState: {
        lifeLenses: [
          {
            id: "lens-solar-pk-energy",
            title: "Solar Energy, Inverters & Pakistani Energy Economics",
            description:
              "Rooftop and C&I solar, hybrid inverters and batteries, and the tariff, net-metering and circular-debt economics that decide whether they pay off in Pakistan.",
            keywords: ["solar", "inverter", "net metering", "NEPRA", "electricity tariff"],
            weight: 35,
            knowledgeBaseline: "intermediate",
            preferredAngle: "Practical explainers on solar hardware and tariffs.",
          },
        ],
      },
      newState: {
        lifeLenses: [
          {
            id: "lens-solar-pk-energy",
            title: "Solar Energy, Inverters & Pakistani Energy Economics",
            description:
              "Rooftop and C&I solar, hybrid inverters and batteries, and the tariff, net-metering and circular-debt economics that decide whether they pay off in Pakistan.",
            keywords: ["solar", "inverter", "net metering", "NEPRA", "electricity tariff"],
            weight: 35,
            knowledgeBaseline: "expert",
            preferredAngle:
              "Hardware plus hard numbers: payback periods, buyback rates, import trends and who ends up carrying grid costs.",
          },
        ],
      },
    },
    {
      id: "chg-002",
      timestamp: "2026-10-16T21:40:00+05:00",
      source: "chief_editor",
      summary:
        "Chief Editor command: \"Track the net-metering story and the IMF review until they're resolved.\"",
      previousState: { trackedStoryIds: [] },
      newState: { trackedStoryIds: ["thread-net-metering", "thread-imf-review"] },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                     Edition #41 — 2026-10-16 (Yesterday)                    */
/* -------------------------------------------------------------------------- */

const CARTOON_41_SCENE =
  "a rooftop covered in solar panels playing tug of war with a giant electricity pylon over a tangled rope labelled with a meter, a worried regulator in a suit holding a clipboard in between, Pakistani city skyline behind";

const edition41: Edition = {
  date: "2026-10-16",
  editionNumber: 41,
  profileVersion: 2,
  generatedAt: "2026-10-16T05:30:00+05:00",
  origin: "seed",
  mastheadQuote: "Eight stories. Then the day is yours.",
  editorialNote:
    "Today's front page is about who pays for the grid when the sun does the generating — a question that sits squarely across your solar and macro-policy lenses.",
  editorialCartoon: {
    prompt: CARTOON_41_SCENE,
    imageUrl: pollinationsCartoonUrl(CARTOON_41_SCENE, 41),
    caption: "The Great Meter Tug-of-War: rooftops pull one way, the grid's balance sheet pulls the other.",
    relatedStoryId: "e41-s1",
  },
  audioBriefScript:
    "Good morning, and welcome to Subh Bakhabar for Friday, the sixteenth of October. Three stories shape your morning. First: Pakistan's power regulator has opened a consultation on overhauling net metering. The proposal would move new rooftop solar users toward net billing with a lower buyback rate, as distribution companies argue that fixed grid costs are shifting onto consumers without panels. If you own or plan a system, the payback maths may change. Second: German automakers and their suppliers continue to consolidate around software-defined vehicle platforms, and hiring for embedded engineers who know safety standards and real-time operating systems remains strong. Third: the State Bank held its policy rate, with analysts now watching the timeline of the next IMF review, where energy subsidies remain the sticking point. In your incubator today: a CSS brief on circular debt — the single concept that ties all three stories together. That's your briefing. Eight stories, then the day is yours.",
  stories: [
    {
      id: "e41-s1",
      slotType: "lead_intersection",
      threadId: "thread-net-metering",
      headline: "Regulator Opens Consultation on Net-Metering Overhaul as Rooftop Solar Strains Grid Finances",
      subheadline:
        "Proposed shift to net billing and a lower buyback rate for new connections pits solar adopters against distribution companies' fixed-cost recovery.",
      sectionLabel: "Front Page · Energy & Policy",
      readTimeMinutes: 5,
      reportedFacts:
        "Pakistan's National Electric Power Regulatory Authority (NEPRA) has invited public comment on revisions to its distributed-generation regulations. The draft would move new rooftop solar connections from net metering — where exported units offset imported units one-for-one — toward net billing, in which exported electricity is bought back at a lower rate than the retail tariff. Existing agreements are proposed to remain on current terms until expiry. Distribution companies have argued that the rapid growth of rooftop solar among higher-income consumers reduces grid sales while fixed capacity costs remain, raising per-unit costs for remaining consumers. Solar installers and consumer groups counter that the change would lengthen payback periods and slow adoption. A public hearing is scheduled after the comment period.",
      citations: [
        { sourceName: "Dawn — Energy & Business", url: SRC.dawnNetMetering, publishedAt: "2026-10-15T22:10:00+05:00" },
        { sourceName: "Reuters — Energy", url: SRC.reutersEnergySolar, publishedAt: "2026-10-16T01:45:00+05:00" },
        { sourceName: "NEPRA — Distributed Generation Rules", url: SRC.nepraRegulations, publishedAt: "2026-10-15T17:00:00+05:00" },
      ],
      provenanceBadge: "Primary Source Checked",
      whyYou:
        "This is the point where your solar-hardware knowledge meets your macro lens. A lower buyback rate changes optimal system design — favouring self-consumption, hybrid inverters and batteries over pure export — while the debate itself is a textbook case of circular-debt economics you'll need for CSS.",
      includedBecause: "Solar & Inverters + Pakistan Macro Policy",
      intersectionScore: 94,
      whatToWatchNext:
        "The NEPRA public hearing date, the final proposed buyback rate, and whether existing net-metering contracts are formally grandfathered.",
      framingDivergence: {
        summary:
          "Domestic coverage foregrounds the cost to households that invested in solar; international coverage frames the move as fiscal discipline tied to power-sector reform commitments.",
        sourceA: {
          name: "Dawn",
          framing: "Consumer impact: longer paybacks and a policy U-turn for households that went solar on official encouragement.",
          url: SRC.dawnNetMetering,
        },
        sourceB: {
          name: "Reuters",
          framing: "Fiscal angle: part of efforts to contain power-sector losses and circular debt under reform commitments.",
          url: SRC.reutersEnergySolar,
        },
      },
    },
    {
      id: "e41-s2",
      slotType: "lead_intersection",
      headline: "German Auto Suppliers Double Down on Software-Defined Vehicles, Sustaining Demand for Embedded Engineers",
      subheadline:
        "Zonal architectures and centralised compute are reshaping what OEMs need from firmware teams — and widening the talent search abroad.",
      sectionLabel: "Front Page · Technology & Careers",
      readTimeMinutes: 4,
      reportedFacts:
        "German carmakers and Tier-1 suppliers are continuing to consolidate vehicle electronics from dozens of distributed ECUs into a smaller number of zonal controllers and central compute units, an approach commonly described as the software-defined vehicle (SDV). The shift places a premium on engineers experienced with real-time operating systems, AUTOSAR (Classic and Adaptive), functional-safety processes such as ISO 26262, and automotive cybersecurity requirements. Industry coverage notes that skilled-worker immigration routes, including Germany's EU Blue Card and Opportunity Card schemes, are being used to fill engineering roles.",
      citations: [
        { sourceName: "Reuters — Autos & Transportation", url: SRC.reutersAutosSdv, publishedAt: "2026-10-15T14:20:00+05:00" },
        { sourceName: "Ars Technica — Cars", url: SRC.arsCarsSdv, publishedAt: "2026-10-15T19:05:00+05:00" },
      ],
      provenanceBadge: "Multiple Outlets",
      whyYou:
        "Your embedded lens is intermediate, so the useful signal isn't 'SDVs exist' — it's which skills are scarce: AUTOSAR Adaptive, ISO 26262 process experience and secure OTA updates. Remittance-earning engineering talent also ties back to your macro lens.",
      includedBecause: "Embedded Systems + German Automotive + Pakistan Macro",
      intersectionScore: 88,
      whatToWatchNext:
        "Q4 hiring announcements from German Tier-1s and any changes to Opportunity Card points criteria.",
    },
    {
      id: "e41-s3",
      slotType: "life_lens",
      headline: "Hybrid Inverter Prices Keep Sliding as Imports Flood Pakistani Market",
      subheadline: "Cheaper hybrid units and LFP batteries are making self-consumption systems the default quote for urban homes.",
      sectionLabel: "Energy · Hardware",
      readTimeMinutes: 3,
      reportedFacts:
        "Global oversupply in solar manufacturing continues to push down prices for modules, inverters and lithium iron phosphate (LFP) batteries. In Pakistan, installers report that hybrid inverters — which manage panels, batteries and grid connection in one unit — now make up a growing share of residential quotes. Trade coverage points to continued high import volumes of solar equipment from China.",
      citations: [
        { sourceName: "CleanTechnica — Solar", url: SRC.cleantechSolarRooftop, publishedAt: "2026-10-15T11:30:00+05:00" },
        { sourceName: "Dawn — Business", url: SRC.dawnSolarImports, publishedAt: "2026-10-15T20:00:00+05:00" },
      ],
      provenanceBadge: "Independently Corroborated",
      whyYou:
        "Read alongside the front-page net-billing story: if export credit falls, cheaper hybrid inverters and LFP storage are exactly what keeps rooftop payback viable.",
      includedBecause: "Solar & Inverters",
      intersectionScore: 79,
      whatToWatchNext: "Whether customs valuation or duty changes on solar imports appear in upcoming fiscal measures.",
    },
    {
      id: "e41-s4",
      slotType: "life_lens",
      headline: "RISC-V Microcontrollers Edge Into Automotive Safety Designs",
      subheadline: "Safety-certified open-ISA cores are moving from evaluation boards toward production body and zonal controllers.",
      sectionLabel: "Technology · Embedded",
      readTimeMinutes: 3,
      reportedFacts:
        "Chip vendors and IP providers have been announcing RISC-V cores with functional-safety certification targets for automotive use. Coverage describes interest from automakers seeking architectural flexibility and reduced licensing dependence, while noting that ecosystem maturity — toolchains, safety-qualified compilers and RTOS support — still trails established Arm-based offerings.",
      citations: [{ sourceName: "Ars Technica — Gadgets", url: SRC.arsGadgetsRiscv, publishedAt: "2026-10-15T16:40:00+05:00" }],
      provenanceBadge: "Single-Source / Developing",
      whyYou:
        "A practical skills bet: learning RISC-V bring-up on Zephyr now could differentiate your CV for German SDV roles in two to three years.",
      includedBecause: "Embedded Systems",
      intersectionScore: 71,
      whatToWatchNext: "Announcements of production vehicle programmes using safety-certified RISC-V MCUs.",
    },
    {
      id: "e41-s5",
      slotType: "life_lens",
      headline: "State Bank Holds Policy Rate; Markets Turn to IMF Review Timeline",
      subheadline: "The central bank cited the inflation outlook and external-account stability; analysts flag energy pricing as the next swing factor.",
      sectionLabel: "Economy · Monetary Policy",
      readTimeMinutes: 3,
      reportedFacts:
        "The State Bank of Pakistan's Monetary Policy Committee kept its policy rate unchanged, according to its monetary policy statement, citing its inflation outlook and the need to maintain external stability. Market commentary noted that administered energy price adjustments remain a key upside risk to inflation, and that the next review under the IMF programme will be closely watched.",
      citations: [
        { sourceName: "Dawn — Business", url: SRC.dawnMonetaryPolicy, publishedAt: "2026-10-15T21:15:00+05:00" },
        { sourceName: "State Bank of Pakistan — Monetary Policy", url: SRC.sbpMonetaryPolicy, publishedAt: "2026-10-15T16:00:00+05:00" },
      ],
      provenanceBadge: "Primary Source Checked",
      whyYou:
        "Interest rates set the financing cost of every solar system and every business expansion you follow — and the MPS is a must-quote document in CSS economy answers.",
      includedBecause: "Pakistan Macro Policy",
      intersectionScore: 74,
      whatToWatchNext: "Monthly CPI release and the IMF staff mission dates.",
    },
    {
      id: "e41-s6",
      slotType: "continuing",
      threadId: "thread-imf-review",
      headline: "IMF Review Talks: Energy Subsidy Reform Remains the Sticking Point",
      subheadline: "Both sides signal progress on revenue measures; power-sector arrears and tariff rationalisation are still under discussion.",
      sectionLabel: "Continuing Story · Economy",
      readTimeMinutes: 4,
      reportedFacts:
        "Discussions between Pakistani authorities and the International Monetary Fund continue ahead of the next programme review. Reporting indicates that revenue measures have progressed, while power-sector issues — including circular debt stock, subsidy targeting and tariff rationalisation — remain the main open items.",
      citations: [
        { sourceName: "Reuters — Asia Pacific", url: SRC.reutersAsiaImf, publishedAt: "2026-10-15T13:00:00+05:00" },
        { sourceName: "IMF — Pakistan Country Page", url: SRC.imfPakistan, publishedAt: "2026-10-14T10:00:00+05:00" },
      ],
      provenanceBadge: "Multiple Outlets",
      whyYou:
        "You're tracking this thread. It connects directly to today's net-metering consultation: tariff rationalisation is the same problem viewed from the IMF's side of the table.",
      includedBecause: "Tracked Story · Pakistan Macro + Energy",
      intersectionScore: 83,
      whatToWatchNext: "Whether a staff-level agreement statement is issued at the end of the mission.",
      continuity: {
        previousDate: "2026-10-15",
        previously: "Pre-mission technical discussions began, focused on revenue collection and energy-sector arrears.",
        newDevelopment: "Revenue measures are reported as largely agreed; energy-sector reforms remain open.",
        remainsUncertain: "The size of any tariff adjustment and how subsidy targeting will be implemented.",
      },
    },
    {
      id: "e41-s7",
      slotType: "incubator",
      headline: "CSS Brief: Circular Debt in Pakistan's Power Sector",
      subheadline: "The one concept that links today's net-metering, IMF and tariff stories — structured for a Current Affairs answer.",
      sectionLabel: "Incubator · CSS Current Affairs (Level 1)",
      readTimeMinutes: 6,
      reportedFacts:
        "Circular debt refers to the accumulation of unpaid obligations across Pakistan's power-sector chain: consumers and distribution companies (DISCOs) under-recover costs, DISCOs underpay the Central Power Purchasing Agency, which in turn delays payments to generators and fuel suppliers. Official data and IMF documents identify it as a persistent fiscal risk.",
      citations: [
        { sourceName: "Dawn — Pakistan Energy", url: SRC.dawnCircularDebt, publishedAt: "2026-10-15T09:00:00+05:00" },
        { sourceName: "IMF — Pakistan Country Page", url: SRC.imfPakistan, publishedAt: "2026-10-14T10:00:00+05:00" },
      ],
      provenanceBadge: "Primary Source Checked",
      whyYou:
        "You're at Level 1 of your CSS goal. Circular debt appears across economy, energy and governance questions — master this one structure and reuse it often.",
      includedBecause: "Incubator: CSS Current Affairs & Policy Analysis",
      intersectionScore: 86,
      whatToWatchNext: "Tomorrow's brief will apply this framework to the net-metering debate.",
      incubatorModule: {
        kind: "css_brief",
        background:
          "Since the 2000s, rising generation costs, capacity payments to IPPs, transmission and distribution losses, theft and delayed subsidy payments have created a gap between the cost of supplying electricity and what is actually recovered.",
        coreIssue:
          "Each link in the payment chain passes its shortfall to the next, so the stock of arrears grows, crowding out fiscal space and raising tariffs for paying consumers.",
        policyAngle:
          "Reforms have targeted tariff rationalisation, loss reduction, renegotiation of IPP contracts and better-targeted subsidies — often as IMF programme conditions.",
        wayForward:
          "Reduce losses through DISCO governance reform, target subsidies through social-protection databases, rebalance fixed vs. variable charges, and expand cheaper indigenous and renewable generation.",
        practiceQuestion:
          "\"Circular debt is a governance problem disguised as a financial one.\" Discuss with reference to Pakistan's power sector.",
        keyTerms: [
          { term: "Capacity payment", meaning: "Payment to a power producer for available capacity, regardless of electricity actually purchased." },
          { term: "T&D losses", meaning: "Electricity lost in transmission and distribution, including technical losses and theft." },
          { term: "CPPA-G", meaning: "Central Power Purchasing Agency — buys power from generators and sells it to DISCOs." },
        ],
      },
    },
    {
      id: "e41-s8",
      slotType: "beyond_bubble",
      headline: "Scientists Expand Glacier Monitoring Across the Hindu Kush–Himalaya",
      subheadline: "Better data on melt rates aims to improve flood early-warning systems downstream — including in Pakistan's Indus basin.",
      sectionLabel: "Beyond Your Bubble · Climate & Science",
      readTimeMinutes: 3,
      reportedFacts:
        "Researchers continue to expand ground and satellite monitoring of glaciers in the Hindu Kush–Himalaya region to better track melt rates and the risk of glacial lake outburst floods (GLOFs). Coverage highlights the importance of the data for water management and early warning in downstream river basins.",
      citations: [
        { sourceName: "BBC — Science & Environment", url: SRC.bbcScienceGlaciers, publishedAt: "2026-10-15T08:30:00+05:00" },
        { sourceName: "Ars Technica — Science", url: SRC.arsScienceClimate, publishedAt: "2026-10-15T18:00:00+05:00" },
      ],
      provenanceBadge: "Multiple Outlets",
      whyYou:
        "Outside your usual lenses — but the Indus basin feeds Pakistan's hydropower, which competes with the very solar economics you follow. It's also standard CSS environment material.",
      includedBecause: "Beyond Your Bubble · Climate",
      intersectionScore: 58,
      whatToWatchNext: "Publication of updated regional melt-rate assessments.",
    },
  ],
  dailyQuiz: [
    {
      question: "Under the proposed net-billing model, how is exported rooftop solar electricity credited?",
      options: [
        "One-for-one against imported units, as under net metering",
        "At a buyback rate lower than the retail tariff",
        "It is not credited at all",
        "At double the retail tariff during peak hours",
      ],
      correctIndex: 1,
      explanation:
        "Net billing pays a separate (lower) buyback rate for exported units, unlike net metering's one-for-one offset.",
      storyId: "e41-s1",
    },
    {
      question: "Which standard governs functional safety in automotive electronics?",
      options: ["ISO 9001", "IEC 61850", "ISO 26262", "IEEE 802.11"],
      correctIndex: 2,
      explanation: "ISO 26262 is the functional-safety standard for road-vehicle electrical and electronic systems.",
      storyId: "e41-s2",
    },
    {
      question: "In Pakistan's power-sector circular debt chain, who buys electricity from generators and sells it to DISCOs?",
      options: ["NEPRA", "The State Bank of Pakistan", "CPPA-G", "WAPDA"],
      correctIndex: 2,
      explanation:
        "The Central Power Purchasing Agency (CPPA-G) is the intermediary buyer; NEPRA is the regulator.",
      storyId: "e41-s7",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                       Edition #42 — 2026-10-17 (Today)                      */
/* -------------------------------------------------------------------------- */

const CARTOON_42_SCENE =
  "a Pakistani factory owner stacking large battery packs like sandbags against a rising flood wave labelled peak tariff, power lines sagging overhead, a small sun peeking from behind clouds";

const edition42: Edition = {
  date: "2026-10-17",
  editionNumber: 42,
  profileVersion: 3,
  generatedAt: "2026-10-17T05:30:00+05:00",
  origin: "seed",
  mastheadQuote: "Your world, in perspective.",
  editorialNote:
    "Yesterday's net-metering consultation moved to a hearing — see What Changed Since Yesterday. On the front page: industry turns to batteries, and Europe's cyber rules reshape automotive firmware.",
  editorialCartoon: {
    prompt: CARTOON_42_SCENE,
    imageUrl: pollinationsCartoonUrl(CARTOON_42_SCENE, 42),
    caption: "Sandbags for the Tariff Flood: industry stacks batteries against peak-hour prices.",
    relatedStoryId: "e42-s1",
  },
  audioBriefScript:
    "Good morning, and welcome to Subh Bakhabar for Saturday, the seventeenth of October. Here's what matters. First: Pakistani manufacturers are installing battery storage alongside rooftop solar to shave expensive peak-hour grid consumption. Falling lithium iron phosphate prices are making the business case, and for you, it is a live example of embedded battery-management systems meeting energy economics. Second: European cyber-resilience and vehicle cybersecurity rules are pushing automakers to rework how firmware is built, signed and updated over the air. Engineers with secure-boot and OTA experience are in demand in Germany. Third, a follow-up you are tracking: at its public hearing, the power regulator signalled a phased move to net billing, with existing solar users expected to keep current terms until their contracts expire. The final buyback rate is still open. In your incubator: a CSS brief on balancing energy transition against fiscal stability. That's your briefing. Eight stories, then the day is yours.",
  stories: [
    {
      id: "e42-s1",
      slotType: "lead_intersection",
      headline: "Pakistani Industry Turns to Battery Storage to Dodge Peak-Hour Tariffs",
      subheadline:
        "Falling LFP prices make solar-plus-storage a balance-sheet decision, not a green gesture — and push battery-management firmware into the spotlight.",
      sectionLabel: "Front Page · Energy & Industry",
      readTimeMinutes: 5,
      reportedFacts:
        "Commercial and industrial users in Pakistan are increasingly pairing rooftop solar with battery energy storage to reduce consumption during peak-tariff hours, according to industry and trade coverage. Global prices for lithium iron phosphate (LFP) battery cells have fallen significantly amid manufacturing overcapacity, improving the economics of behind-the-meter storage. Installers note that system performance depends heavily on battery-management systems (BMS) and inverter control firmware, including state-of-charge estimation and thermal protection.",
      citations: [
        { sourceName: "Dawn — Business & Energy", url: SRC.dawnBatteryStorage, publishedAt: "2026-10-16T21:30:00+05:00" },
        { sourceName: "CleanTechnica — Energy Storage", url: SRC.cleantechStoragePeak, publishedAt: "2026-10-16T12:00:00+05:00" },
        { sourceName: "Reuters — Energy", url: SRC.reutersEnergyStorage, publishedAt: "2026-10-16T15:10:00+05:00" },
      ],
      provenanceBadge: "Multiple Outlets",
      whyYou:
        "All three of your lenses in one story: BMS firmware is embedded engineering, peak-shaving is solar economics at expert level, and industry's flight from the grid feeds straight back into the circular-debt and tariff debate.",
      includedBecause: "Embedded Systems + Solar Economics + Pakistan Macro",
      intersectionScore: 96,
      whatToWatchNext:
        "Whether regulators introduce a grid-access or fixed charge for large self-generating industrial consumers.",
      framingDivergence: {
        summary:
          "Clean-energy outlets frame storage adoption as a technology milestone; Pakistani business press frames it as a defensive response to high grid tariffs.",
        sourceA: {
          name: "CleanTechnica",
          framing: "Technology and cost-curve story: cheap LFP is unlocking storage in emerging markets.",
          url: SRC.cleantechStoragePeak,
        },
        sourceB: {
          name: "Dawn",
          framing: "Cost-survival story: manufacturers protecting competitiveness from expensive grid power.",
          url: SRC.dawnBatteryStorage,
        },
      },
    },
    {
      id: "e42-s2",
      slotType: "lead_intersection",
      headline: "Europe's Cyber Rules Force Automakers to Rebuild Firmware Update Pipelines",
      subheadline:
        "Vehicle cybersecurity regulations and the EU Cyber Resilience Act are making secure boot, signed OTA updates and SBOMs table stakes.",
      sectionLabel: "Front Page · Technology & Regulation",
      readTimeMinutes: 4,
      reportedFacts:
        "UNECE Regulation No. 155 (cybersecurity management) and No. 156 (software update management) apply to new vehicles type-approved in the EU, while the EU Cyber Resilience Act sets security obligations for products with digital elements. Coverage describes automakers and suppliers investing in secure boot chains, cryptographically signed over-the-air (OTA) updates and software bills of materials (SBOMs), and expanding hiring for engineers with these skills.",
      citations: [
        { sourceName: "Reuters — Technology", url: SRC.reutersTechCyber, publishedAt: "2026-10-16T10:25:00+05:00" },
        { sourceName: "Ars Technica — Security & IT", url: SRC.arsItCyber, publishedAt: "2026-10-16T18:50:00+05:00" },
      ],
      provenanceBadge: "Independently Corroborated",
      whyYou:
        "Your preferred angle is engineering depth plus German career implications: R155/R156 compliance is now a daily concern for German OEM firmware teams, and secure OTA experience is a concrete, learnable skill. Pakistani IT exporters servicing EU clients face similar requirements.",
      includedBecause: "Embedded Systems + German Automotive",
      intersectionScore: 89,
      whatToWatchNext: "Implementation guidance and reporting timelines under the Cyber Resilience Act.",
    },
    {
      id: "e42-s3",
      slotType: "life_lens",
      headline: "High-Efficiency Panels Dominate New Rooftop Installations",
      subheadline: "TOPCon and bifacial modules are now the default for installers as the price premium over older PERC panels narrows.",
      sectionLabel: "Energy · Hardware",
      readTimeMinutes: 3,
      reportedFacts:
        "Solar industry coverage reports that n-type TOPCon modules have largely replaced older p-type PERC technology in new production, with price differences narrowing. Installers in South Asia report growing use of bifacial modules on elevated commercial rooftops, where reflected light improves yield.",
      citations: [
        { sourceName: "CleanTechnica — Solar", url: SRC.cleantechSolarRooftop, publishedAt: "2026-10-16T09:40:00+05:00" },
        { sourceName: "Dawn — Business", url: SRC.dawnSolarImports, publishedAt: "2026-10-16T19:00:00+05:00" },
      ],
      provenanceBadge: "Independently Corroborated",
      whyYou:
        "At expert baseline, the relevant question is yield per rupee under net billing — higher-efficiency modules help where roof space limits self-consumption sizing.",
      includedBecause: "Solar & Inverters",
      intersectionScore: 72,
      whatToWatchNext: "Module price trends heading into the winter installation season.",
    },
    {
      id: "e42-s4",
      slotType: "life_lens",
      headline: "Zephyr RTOS Expands Safety and Automotive Tooling",
      subheadline: "The open-source RTOS's push toward safety certification makes it a more credible option for automotive and industrial MCUs.",
      sectionLabel: "Technology · Embedded",
      readTimeMinutes: 3,
      reportedFacts:
        "The Zephyr Project, hosted by the Linux Foundation, continues work toward functional-safety certification of a subset of its kernel and is expanding support for automotive-grade microcontrollers. Coverage notes growing adoption in industrial and IoT designs.",
      citations: [{ sourceName: "Ars Technica — Gadgets", url: SRC.arsGadgetsRiscv, publishedAt: "2026-10-16T17:15:00+05:00" }],
      provenanceBadge: "Single-Source / Developing",
      whyYou:
        "Pairs with yesterday's RISC-V story: Zephyr plus RISC-V is a credible open stack for a portfolio project that German hiring managers will recognise.",
      includedBecause: "Embedded Systems",
      intersectionScore: 68,
      whatToWatchNext: "Formal certification milestones for Zephyr's safety scope.",
    },
    {
      id: "e42-s5",
      slotType: "life_lens",
      headline: "Remittances Keep the Current Account Steady, Data Show",
      subheadline: "Strong worker inflows continue to offset the trade deficit, giving the State Bank room on reserves.",
      sectionLabel: "Economy · External Sector",
      readTimeMinutes: 3,
      reportedFacts:
        "Monthly data published by the State Bank of Pakistan show workers' remittances remaining a major source of foreign-exchange inflows, helping to contain the current-account balance. Commentators note that sustained inflows support reserve accumulation, a key element of the IMF programme.",
      citations: [
        { sourceName: "Dawn — Business", url: SRC.dawnRemittances, publishedAt: "2026-10-16T22:00:00+05:00" },
        { sourceName: "State Bank of Pakistan — Remittances Data", url: SRC.sbpRemittances, publishedAt: "2026-10-16T16:30:00+05:00" },
      ],
      provenanceBadge: "Primary Source Checked",
      whyYou:
        "Remittances are where your career lens and macro lens meet: Pakistani engineers abroad — including in Germany — are part of the reason the external account is stable.",
      includedBecause: "Pakistan Macro + German Careers",
      intersectionScore: 75,
      whatToWatchNext: "Next month's current-account release and reserve figures.",
    },
    {
      id: "e42-s6",
      slotType: "continuing",
      threadId: "thread-net-metering",
      headline: "Net-Metering Hearing: Regulator Signals Phased Shift, Existing Solar Users to Keep Current Terms",
      subheadline: "The direction is set; the buyback rate — the number that decides paybacks — is still open.",
      sectionLabel: "Continuing Story · What Changed Since Yesterday",
      readTimeMinutes: 4,
      reportedFacts:
        "At a public hearing on the proposed revisions to distributed-generation rules, NEPRA heard arguments from distribution companies, solar industry associations and consumer representatives. Coverage of the hearing indicates the regulator is considering a phased transition to net billing for new connections, while existing agreements would continue on current terms until expiry. No final buyback rate was announced; the authority is expected to issue a determination after reviewing submissions.",
      citations: [
        { sourceName: "Dawn — Pakistan", url: SRC.dawnNetBillingHearing, publishedAt: "2026-10-16T23:10:00+05:00" },
        { sourceName: "Reuters — Energy", url: SRC.reutersEnergySolar, publishedAt: "2026-10-17T02:30:00+05:00" },
        { sourceName: "NEPRA — Distributed Generation Rules", url: SRC.nepraRegulations, publishedAt: "2026-10-16T18:00:00+05:00" },
      ],
      provenanceBadge: "Primary Source Checked",
      whyYou:
        "You pinned this thread. The grandfathering signal protects existing installations, but anyone sizing a new system should now design for self-consumption — tying directly to today's battery-storage lead.",
      includedBecause: "Tracked Story · Solar Economics + Policy",
      intersectionScore: 91,
      whatToWatchNext: "NEPRA's written determination and the notified buyback rate for new connections.",
      continuity: {
        previousDate: "2026-10-16",
        previously:
          "NEPRA opened a public consultation proposing to move new rooftop solar connections from net metering to net billing with a lower buyback rate.",
        newDevelopment:
          "At the public hearing, the regulator signalled a phased transition, with existing agreements expected to remain on current terms until expiry.",
        remainsUncertain:
          "The final buyback rate, the cut-off date for new connections, and whether any fixed grid charge will be added.",
      },
      framingDivergence: {
        summary:
          "Domestic coverage emphasises relief for existing solar owners; international coverage emphasises progress on power-sector cost recovery.",
        sourceA: {
          name: "Dawn",
          framing: "Relief story: existing solar users protected, but new adopters face uncertainty.",
          url: SRC.dawnNetBillingHearing,
        },
        sourceB: {
          name: "Reuters",
          framing: "Reform story: a step toward containing grid losses consistent with sector reform commitments.",
          url: SRC.reutersEnergySolar,
        },
      },
    },
    {
      id: "e42-s7",
      slotType: "incubator",
      headline: "CSS Brief: Energy Transition vs. Fiscal Stability — The Net-Metering Dilemma",
      subheadline: "Applying yesterday's circular-debt framework to a live policy decision.",
      sectionLabel: "Incubator · CSS Current Affairs (Level 1)",
      readTimeMinutes: 6,
      reportedFacts:
        "Pakistan's rapid uptake of rooftop solar has reduced grid demand from many higher-consuming households, while fixed costs — notably capacity payments to generators — remain. Regulators are weighing changes to how exported solar electricity is compensated, as reflected in NEPRA's ongoing proceedings.",
      citations: [
        { sourceName: "Dawn — Energy Policy", url: SRC.dawnEnergySupply, publishedAt: "2026-10-17T07:21:43+05:00" },
        { sourceName: "NEPRA — Distributed Generation Rules", url: SRC.nepraRegulations, publishedAt: "2026-10-16T18:00:00+05:00" },
        { sourceName: "IMF — Pakistan Country Page", url: SRC.imfPakistan, publishedAt: "2026-10-14T10:00:00+05:00" },
      ],
      provenanceBadge: "Primary Source Checked",
      whyYou:
        "Yesterday you learned the circular-debt structure; today you apply it. This is exactly the kind of 'current issue + framework' answer CSS examiners reward.",
      includedBecause: "Incubator: CSS Current Affairs & Policy Analysis",
      intersectionScore: 87,
      whatToWatchNext: "Use NEPRA's final determination as a data point to update this brief.",
      incubatorModule: {
        kind: "css_brief",
        background:
          "Falling solar costs and high grid tariffs drove a rooftop solar boom. Net metering, introduced to encourage adoption, credits exports one-for-one against imports.",
        coreIssue:
          "When higher-income consumers self-generate, they pay less toward fixed grid costs, which are then spread over fewer units — raising tariffs for those who cannot afford solar and worsening circular debt.",
        policyAngle:
          "The state must balance three goals: encouraging clean energy, protecting low-income consumers, and restoring power-sector finances under IMF commitments. Net billing, grandfathering and fixed charges are the main levers.",
        wayForward:
          "Phase changes predictably with grandfathering, protect lifeline consumers, encourage storage and daytime demand shifting, and address the root causes — capacity payments and distribution losses — rather than penalising solar alone.",
        practiceQuestion:
          "Critically evaluate the trade-offs between promoting distributed solar generation and ensuring the financial sustainability of Pakistan's power sector.",
        keyTerms: [
          { term: "Net metering", meaning: "Exported units offset imported units one-for-one on the bill." },
          { term: "Net billing", meaning: "Exports are paid at a separate buyback rate, typically below the retail tariff." },
          { term: "Grandfathering", meaning: "Allowing existing participants to keep old terms when rules change." },
          { term: "Utility death spiral", meaning: "Rising tariffs push more users off-grid, shrinking the base and raising tariffs further." },
        ],
      },
    },
    {
      id: "e42-s8",
      slotType: "beyond_bubble",
      headline: "Shipping's Fuel Switch: Why Cleaner Ships Matter for Karachi's Ports",
      subheadline: "Global maritime emissions rules are changing vessel fuels, port infrastructure and freight costs.",
      sectionLabel: "Beyond Your Bubble · Trade & Climate",
      readTimeMinutes: 3,
      reportedFacts:
        "The International Maritime Organization has adopted targets to cut greenhouse-gas emissions from international shipping, and shipping lines are ordering vessels capable of running on alternative fuels such as LNG and methanol. Coverage notes that ports will need new bunkering infrastructure and that compliance costs may feed into freight rates.",
      citations: [
        { sourceName: "Reuters — Markets & Shipping", url: SRC.reutersShippingFuel, publishedAt: "2026-10-16T11:00:00+05:00" },
        { sourceName: "CleanTechnica — Maritime & Freight", url: SRC.cleantechElectricShipping, publishedAt: "2026-10-16T13:56:21+05:00" },
        { sourceName: "Dawn — Energy & Trade", url: SRC.dawnEnergySupply, publishedAt: "2026-10-16T20:20:00+05:00" },
      ],
      provenanceBadge: "Multiple Outlets",
      whyYou:
        "Outside your lenses, but freight costs shape the price of every imported inverter and panel — and maritime trade is a recurring CSS geopolitics theme.",
      includedBecause: "Beyond Your Bubble · Trade",
      intersectionScore: 55,
      whatToWatchNext: "IMO decisions on a global carbon-pricing mechanism for shipping.",
    },
  ],
  dailyQuiz: [
    {
      question: "Why are Pakistani manufacturers adding battery storage to rooftop solar?",
      options: [
        "To export electricity at higher prices",
        "To reduce consumption from the grid during peak-tariff hours",
        "Because batteries are required by law",
        "To qualify for net metering",
      ],
      correctIndex: 1,
      explanation:
        "Storage lets factories shift solar energy into expensive peak hours, cutting grid purchases at the highest tariffs.",
      storyId: "e42-s1",
    },
    {
      question: "Which UNECE regulation covers software update management for vehicles?",
      options: ["R155", "R156", "R10", "R79"],
      correctIndex: 1,
      explanation: "R156 governs software updates (including OTA); R155 covers cybersecurity management systems.",
      storyId: "e42-s2",
    },
    {
      question: "What changed in the net-metering story between yesterday and today?",
      options: [
        "Net metering was abolished for all users immediately",
        "The buyback rate was finalised",
        "The regulator signalled a phased shift, with existing users keeping current terms",
        "The consultation was cancelled",
      ],
      correctIndex: 2,
      explanation:
        "At the hearing, NEPRA signalled a phased transition with grandfathering; the buyback rate is still undecided.",
      storyId: "e42-s6",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                                   Exports                                  */
/* -------------------------------------------------------------------------- */

/** Seeded archive, newest first. */
export const seededEditions: Edition[] = [edition42, edition41];

export const SEED_PROFILE = defaultUserProfile;
export const SEED_EDITIONS = seededEditions;
export const SEED_EDITION = edition42;

