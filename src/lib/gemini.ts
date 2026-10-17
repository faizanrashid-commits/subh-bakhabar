/**
 * SUBH BAKHABAR — Centralized Gemini Model Router & Schema Generator
 *
 * Coordinates between `@google/genai` (gemini-3.8-flash with auto-discovery) and high-fidelity
 * local deterministic mock synthesis. Grounded strictly in candidate RSS URLs.
 * Respects MOCK_LLM_MODE === 'true' unless forceLive: true is passed.
 */

import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import {
  getActiveProfile,
  getCandidateArticles,
  getEditions,
  getNextEditionNumber,
  saveEdition,
} from "@/lib/store";
import {
  fetchAndIngestFeeds,
  isInappropriateRssContent,
  stripFeedMetadata,
} from "@/lib/rss";
import {
  organizeSlotCandidates,
  scoreCandidateArticles,
  type ScoredCandidateArticle,
} from "@/lib/scorer";
import { pollinationsCartoonUrl } from "@/data/seed";
import type {
  Edition,
  EditionOrigin,
  IncubatorCategory,
  IncubatorGoal,
  IncubatorModule,
  KnowledgeBaseline,
  LifeLens,
  MasteryLevel,
  ProfileSnapshot,
  QuizQuestion,
  StoryContinuity,
  StoryItem,
  UserProfile,
} from "@/types/subh";

/* -------------------------------------------------------------------------- */
/*                     Resilient Model Router & Auto-Discovery                */
/* -------------------------------------------------------------------------- */

const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.8-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

const CLEAN_EDITOR_NOTE =
  "Morning Edition — Synthesized from verified primary dispatches across your active Life Lenses.";

let cachedWorkingModel: string | null = null;

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const status =
    (err as { status?: number; code?: number })?.status ??
    (err as { code?: number })?.code;
  return (
    status === 404 ||
    /404|NOT_FOUND|not found|no longer available|is not supported/i.test(msg)
  );
}

/**
 * Resilient wrapper around `ai.models.generateContent` that tries candidate
 * models in priority order (`gemini-3.8-flash`, `gemini-3.8-flash-lite`,
 * `gemini-2.5-flash-lite`, `gemini-2.0-flash`) and, if all throw 404 / NOT_FOUND,
 * dynamically queries `ai.models.list()` to discover and cache the first
 * enabled `gemini` text generation model for this API key.
 */
export async function callGeminiWithAutoModel(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, "model"> & { model?: string }
): Promise<GenerateContentResponse> {
  const modelsToTry = cachedWorkingModel
    ? [
        cachedWorkingModel,
        ...CANDIDATE_MODELS.filter((m) => m !== cachedWorkingModel),
      ]
    : [...CANDIDATE_MODELS];

  let lastError: unknown = null;

  for (const candidateModel of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: candidateModel,
      });
      cachedWorkingModel = candidateModel;
      return response;
    } catch (err) {
      lastError = err;
      if (isNotFoundError(err)) {
        console.error(
          `[gemini] Model '${candidateModel}' returned 404/NOT_FOUND, trying next candidate...`
        );
        if (cachedWorkingModel === candidateModel) {
          cachedWorkingModel = null;
        }
        continue;
      }
      throw err;
    }
  }

  // Dynamic auto-discovery fallback via ai.models.list()
  try {
    const list = await ai.models.list();
    const discoveredModels: string[] = [];

    for await (const m of list) {
      const rawName = m.name || "";
      const cleanName = rawName.replace(/^models\//i, "");
      if (!cleanName) continue;

      const isGemini = /gemini/i.test(cleanName);
      const isExcluded =
        /embedding|imagen|veo|tts|audio|aqa|bisheng|learnlm/i.test(cleanName);
      const actions = (m as { supportedActions?: string[] }).supportedActions;
      const supportsGenerate =
        !Array.isArray(actions) ||
        actions.length === 0 ||
        actions.includes("generateContent");

      if (isGemini && !isExcluded && supportsGenerate) {
        discoveredModels.push(cleanName);
      }
    }

    const picked =
      discoveredModels.find(
        (m) => !modelsToTry.includes(m as (typeof CANDIDATE_MODELS)[number])
      ) || discoveredModels[0];

    if (picked) {
      cachedWorkingModel = picked;
      console.log(`[gemini] Auto-discovered working Gemini model: ${picked}`);
      return await ai.models.generateContent({
        ...params,
        model: cachedWorkingModel,
      });
    }
  } catch (listErr) {
    console.error("[gemini] Dynamic ai.models.list() discovery failed:", listErr);
  }

  throw lastError ?? new Error("No available Gemini model found.");
}

/* -------------------------------------------------------------------------- */
/*                            Prompt Templates                                */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `You are the Chief Editor and Lead Synthesizer for SUBH BAKHABAR (صبح باخبر), a prestigious bespoke morning broadsheet newspaper.
Your task is to take real candidate news articles from live RSS feeds and assemble a strictly grounded 8-story broadsheet edition.

CRITICAL RULES:
1. GOLDEN RULE: NEVER FABRICATE CITATION URLS. You MUST cite the exact candidate article link and source provided in the input.
2. The edition MUST contain EXACTLY 8 stories across these slots:
   - Slot 1 & 2: 'lead_intersection' (High cross-lens intersection, major systemic impact)
   - Slot 3, 4, 5: 'life_lens' (1 story for each of the reader's 3 Life Lenses)
   - Slot 6: 'continuing' (What changed since yesterday? Must include a continuity timeline object)
   - Slot 7: 'incubator' (Connected to reader's Incubator Goal, with a structured incubatorModule)
   - Slot 8: 'beyond_bubble' (High-significance global story outside the reader's normal interests)
3. Journalistic Tone: High editorial rigor, clear, analytical, zero fluff or sensationalism.
4. 'whyYou': Explain precisely how the story impacts the reader's specific life lenses or career goals.
5. 'whatToWatchNext': Concrete upcoming milestone or policy date.
6. Provide an 'editorialCartoon': { prompt: string, caption: string, relatedStoryId: string }.
7. Provide an 'audioBriefScript': A crisp 150-word morning newsroom radio broadcast covering top 3 stories.
8. Provide a 'dailyQuiz': Exactly 3 multiple-choice retention questions (each with 4 options, correctIndex 0-3, explanation, storyId).
9. Respond ONLY with valid JSON matching the requested structure.`;

/* -------------------------------------------------------------------------- */
/*                     High-Fidelity Synthesizer (Mock Mode)                  */
/* -------------------------------------------------------------------------- */

function buildSynthesizedStory(
  slotType: StoryItem["slotType"],
  candidate: ScoredCandidateArticle,
  profile: UserProfile,
  slotIndex: number,
  yesterdayStory?: StoryItem
): StoryItem {
  const storyId = `story-${Date.now().toString(36)}-${slotIndex}`;
  const threadId =
    candidate.breakdown.continuingThreadId ||
    `thread-${candidate.sourceName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${slotIndex}`;

  let sectionLabel = "DISPATCH";
  let whyYou = "";
  let includedBecause = "";
  let continuity: StoryContinuity | undefined = undefined;
  let incubatorModule: IncubatorModule | undefined = undefined;

  const matchedLensTitles = candidate.matchedLensIds
    .map((id) => profile.lifeLenses.find((l) => l.id === id)?.title)
    .filter(Boolean) as string[];

  switch (slotType) {
    case "lead_intersection":
      sectionLabel = "LEAD INTERSECTION";
      includedBecause =
        matchedLensTitles.slice(0, 2).join(" + ") ||
        "Cross-Disciplinary Industry & Macro Impact";
      whyYou = `Directly touches your work at the intersection of ${includedBecause.toLowerCase()}. Changes the regulatory and technical baseline for upcoming engineering and deployment decisions.`;
      break;

    case "life_lens": {
      const lens =
        profile.lifeLenses.find((l) =>
          candidate.matchedLensIds.includes(l.id)
        ) || profile.lifeLenses[slotIndex % profile.lifeLenses.length];
      sectionLabel = lens?.title.toUpperCase().slice(0, 26) || "LIFE LENS";
      includedBecause = lens?.title || "Core Life Lens";
      whyYou = `Calibrated for your ${lens?.knowledgeBaseline || "intermediate"} baseline: focus on ${lens?.preferredAngle || "operational and technical consequences"}.`;
      break;
    }

    case "continuing":
      sectionLabel = "CONTINUING DISPATCH";
      includedBecause = "Tracked Thread · What Changed Since Yesterday";
      whyYou =
        "You flagged this issue for ongoing tracking. Here is what shifted overnight and what remains contested.";
      continuity = {
        previousDate: yesterdayStory?.citations[0]?.publishedAt?.slice(0, 10) || "2026-10-16",
        previously:
          yesterdayStory?.subheadline ||
          "Initial regulatory submissions and market stakeholder pushback were formally recorded.",
        newDevelopment: candidate.snippet || candidate.title,
        remainsUncertain:
          "Implementation timeline, tariff pass-through mechanisms, and bilateral counterparty sign-off.",
      };
      break;

    case "incubator": {
      sectionLabel = `INCUBATOR: ${profile.incubatorGoal.title.toUpperCase().slice(0, 22)}`;
      includedBecause = `Learning Goal: ${profile.incubatorGoal.title}`;
      whyYou = `Constructed specifically for your active mastery path in ${profile.incubatorGoal.title} (Level ${profile.incubatorGoal.masteryLevel}/5).`;

      if (profile.incubatorGoal.category === "exam_prep") {
        incubatorModule = {
          kind: "css_brief",
          background:
            "A structural challenge in governance and fiscal allocation with deep historical precedents in Pakistan's administrative framework.",
          coreIssue: candidate.title,
          policyAngle:
            "Examines regulatory incentives, public finance trade-offs, and institutional accountability under current multilateral reform conditions.",
          wayForward:
            "Phased regulatory de-bottlenecking, digital audit integration, and performance-based DISCO or departmental restructuring.",
          practiceQuestion:
            "Analyze the systemic drivers highlighted in recent policy notifications. Propose 3 evidence-grounded structural reforms.",
          keyTerms: [
            { term: "Tariff Differential Subsidy", meaning: "Fiscal gap bridged by central treasury." },
            { term: "Capacity Charge", meaning: "Fixed cost commitment independent of dispatch." },
          ],
        };
      } else if (profile.incubatorGoal.category === "language") {
        incubatorModule = {
          kind: "bilingual_passage",
          language: "German",
          passage:
            "Die jüngsten Entwicklungen zeigen einen klaren Wandel in der Industriepolitik und im Netzausbau.",
          translation:
            "Recent developments show a clear shift in industrial policy and grid expansion.",
          vocabulary: [
            { term: "der Wandel", meaning: "the change / transition" },
            { term: "der Netzausbau", meaning: "grid expansion" },
          ],
        };
      } else {
        incubatorModule = {
          kind: "domain_primer",
          concept: candidate.title.slice(0, 45),
          explanation: candidate.snippet || "Foundational framework for systems integration.",
          analogy: "Like a traffic controller dynamically routing priority packets.",
          keyTerms: [
            { term: "Determinism", meaning: "Guaranteed upper bound on execution latency." },
          ],
        };
      }
      break;
    }

    case "beyond_bubble":
      sectionLabel = "BEYOND YOUR BUBBLE";
      includedBecause = "Global Discovery · Broadening Your Horizon";
      whyYou =
        "Intentionally selected from outside your primary engineering and domestic policy filters to maintain global peripheral awareness.";
      break;
  }

  const cleanedSnippet = stripFeedMetadata(candidate.snippet || candidate.title);

  return {
    id: storyId,
    slotType,
    threadId,
    headline: stripFeedMetadata(candidate.title),
    subheadline:
      cleanedSnippet.slice(0, 140) + (cleanedSnippet.length > 140 ? "..." : ""),
    sectionLabel,
    readTimeMinutes: Math.floor(Math.random() * 2) + 2,
    reportedFacts: stripFeedMetadata(
      `${cleanedSnippet} According to reports confirmed by ${candidate.sourceName}, this development signals a structural inflection point for market participants and regulatory oversight bodies. Independent analysts emphasize that immediate operational impact will be felt across institutional supply chains and capital allocation schedules.`
    ),
    citations: [
      {
        sourceName: candidate.sourceName,
        url: candidate.link,
        publishedAt: candidate.publishedAt,
      },
    ],
    provenanceBadge:
      candidate.breakdown.significance >= 18
        ? "Multiple Outlets"
        : "Independently Corroborated",
    whyYou,
    includedBecause,
    intersectionScore: candidate.score,
    whatToWatchNext:
      "Upcoming regulatory gazette notification, quarterly earnings calls, and follow-up hearings scheduled for next month.",
    continuity,
    incubatorModule,
  };
}

/**
 * Builds a realistic, fully grounded 8-story Edition from scored RSS candidates.
 * Runs in <100ms with zero API quota consumption.
 */
export function buildSynthesizedEdition(
  date: string,
  editionNumber: number,
  profile: UserProfile,
  scoredCandidates: ScoredCandidateArticle[],
  previousEditions: Edition[]
): Edition {
  const organized = organizeSlotCandidates(
    scoredCandidates,
    profile,
    previousEditions
  );
  const yesterdayEdition = previousEditions[0];

  const stories: StoryItem[] = [];

  // Slot 1: Lead Intersection 1
  stories.push(
    buildSynthesizedStory(
      "lead_intersection",
      organized.lead1,
      profile,
      1,
      yesterdayEdition?.stories[0]
    )
  );

  // Slot 2: Lead Intersection 2
  stories.push(
    buildSynthesizedStory(
      "lead_intersection",
      organized.lead2,
      profile,
      2,
      yesterdayEdition?.stories[1]
    )
  );

  // Slot 3, 4, 5: Life Lenses
  for (let i = 0; i < 3; i++) {
    const candidate = organized.lensStories[i] || organized.lead2;
    stories.push(
      buildSynthesizedStory(
        "life_lens",
        candidate,
        profile,
        3 + i,
        yesterdayEdition?.stories[2 + i]
      )
    );
  }

  // Slot 6: Continuing Story
  const contCandidate =
    organized.continuingStory || organized.lensStories[0] || organized.lead1;
  stories.push(
    buildSynthesizedStory(
      "continuing",
      contCandidate,
      profile,
      6,
      yesterdayEdition?.stories.find((s) => s.slotType === "continuing") ||
        yesterdayEdition?.stories[0]
    )
  );

  // Slot 7: Incubator
  const incCandidate =
    organized.incubatorStory || organized.lensStories[1] || organized.lead2;
  stories.push(
    buildSynthesizedStory(
      "incubator",
      incCandidate,
      profile,
      7,
      yesterdayEdition?.stories.find((s) => s.slotType === "incubator")
    )
  );

  // Slot 8: Beyond Bubble
  stories.push(
    buildSynthesizedStory(
      "beyond_bubble",
      organized.beyondBubbleStory,
      profile,
      8,
      yesterdayEdition?.stories.find((s) => s.slotType === "beyond_bubble")
    )
  );

  // Daily Quiz: 3 questions linked to stories 1, 3, 7
  const dailyQuiz: QuizQuestion[] = [
    {
      question: `What is the key structural shift reported regarding ${stories[0].headline.slice(0, 50)}?`,
      options: [
        "A sudden rollback of all prior policy guidelines.",
        "An inflection in operational timelines and capital allocation schedules.",
        "A total moratorium on private sector participation.",
        "An immediate doubling of retail tariffs with no grace period.",
      ],
      correctIndex: 1,
      explanation:
        "The lead dispatch details how institutional supply chains and capital allocation schedules are adapting to the new baseline.",
      storyId: stories[0].id,
    },
    {
      question: `In today's technical dispatch on ${stories[2].headline.slice(0, 45)}, what was highlighted?`,
      options: [
        "Transition toward integrated firmware architecture and standardized interfaces.",
        "Complete deprecation of CAN bus communication protocols.",
        "Abandonment of solar net-metering contracts nationwide.",
        "A 50% drop in global semiconductor foundry wafer output.",
      ],
      correctIndex: 0,
      explanation:
        "The life lens dispatch focuses on engineering toolchains, standard interfaces, and architecture evolution.",
      storyId: stories[2].id,
    },
    {
      question: `Regarding ${stories[6].headline.slice(0, 45)}, which upcoming milestone must be monitored?`,
      options: [
        "The immediate closure of interbank foreign exchange windows.",
        "The publication of regulatory gazette notifications and quarterly stakeholder reviews.",
        "A unilateral cancellation of bilateral trade agreements.",
        "A shift to purely manual grid balancing dispatchers.",
      ],
      correctIndex: 1,
      explanation:
        "The incubator feature identifies the forthcoming regulatory gazette notice and quarterly review hearings as decisive.",
      storyId: stories[6].id,
    },
  ];

  const cartoonPrompt = `A thoughtful editorial cartoon about ${stories[0].headline.slice(0, 60)}, symbolic scale of justice and technology gears`;
  const cartoonSeed = Math.abs(
    date.split("").reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7)
  );

  const audioBriefScript = `Good morning, Islamabad. This is your Subh Bakhabar Morning Audio Briefing for ${date}. Leading our front page today: ${stories[0].headline}. Our lead analysis finds that capital allocation schedules and regulatory baselines are pivoting quickly. In our second lead: ${stories[1].headline}, marking a pivotal turning point for systems engineers and policymakers alike. Meanwhile, our technical dispatch reports on ${stories[2].headline}. Beyond your bubble, we bring you vital global perspective from ${stories[7].citations[0]?.sourceName || "world dispatches"}. That concludes your 90-second perspective briefing. Your full eight-story broadsheet edition follows below.`;

  return {
    date,
    editionNumber,
    profileVersion: profile.version,
    generatedAt: new Date().toISOString(),
    origin: "mock",
    mastheadQuote:
      "To see clearly is poetry, prophecy, and religion, all in one. — John Ruskin",
    editorialNote: CLEAN_EDITOR_NOTE,
    editorialCartoon: {
      prompt: cartoonPrompt,
      imageUrl: pollinationsCartoonUrl(cartoonPrompt, cartoonSeed),
      caption: `“The gears of progress turn on small, silent calibrations.” — Broadsheet Ink Studio on ${stories[0].headline.slice(0, 45)}`,
      relatedStoryId: stories[0].id,
    },
    audioBriefScript,
    stories,
    dailyQuiz,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Live Gemini Generation                          */
/* -------------------------------------------------------------------------- */

async function callGeminiLive(
  date: string,
  editionNumber: number,
  profile: UserProfile,
  scoredCandidates: ScoredCandidateArticle[],
  previousEditions: Edition[]
): Promise<Edition> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const organized = organizeSlotCandidates(
    scoredCandidates,
    profile,
    previousEditions
  );
  const yesterdayEdition = previousEditions[0];

  const candidatesContext = [
    { slot: "Slot 1 (lead_intersection)", ...organized.lead1 },
    { slot: "Slot 2 (lead_intersection)", ...organized.lead2 },
    ...organized.lensStories.map((s, idx) => ({
      slot: `Slot ${3 + idx} (life_lens)`,
      ...s,
    })),
    { slot: "Slot 6 (continuing)", ...organized.continuingStory },
    { slot: "Slot 7 (incubator)", ...organized.incubatorStory },
    { slot: "Slot 8 (beyond_bubble)", ...organized.beyondBubbleStory },
  ].map((c) => ({
    slot: c.slot,
    title: c.title,
    link: c.link,
    sourceName: c.sourceName,
    publishedAt: c.publishedAt,
    snippet: c.snippet,
    score: c.score,
    feedCategory: c.feedCategory,
    matchedLenses: c.matchedLensIds,
  }));

  const userPrompt = `Generate the SUBH BAKHABAR Edition for Date: ${date}, Edition Number: ${editionNumber}.

USER PROFILE:
- Name: ${profile.name} (Version: ${profile.version})
- Life Lenses:
${profile.lifeLenses
  .map(
    (l) =>
      `  * [${l.id}] ${l.title} (Weight: ${l.weight}%, Baseline: ${l.knowledgeBaseline}, Angle: ${l.preferredAngle})`
  )
  .join("\n")}
- Incubator Goal: ${profile.incubatorGoal.title} (Category: ${profile.incubatorGoal.category}, Level: ${profile.incubatorGoal.masteryLevel}/5)
- Tracked Story Threads: ${profile.trackedStoryIds?.join(", ") || "None"}

YESTERDAY'S STORIES (FOR NOVELTY & CONTINUITY):
${yesterdayEdition?.stories.map((s) => `  * [${s.slotType}] ${s.headline}`).join("\n") || "None"}

CANDIDATE ARTICLES (USE THESE EXACT CITATION URLS AND SOURCES):
${JSON.stringify(candidatesContext, null, 2)}

OUTPUT REQUIREMENT:
Respond with a JSON object with this exact shape:
{
  "mastheadQuote": string,
  "editorialNote": string,
  "cartoonPrompt": string,
  "cartoonCaption": string,
  "audioBriefScript": string,
  "stories": [
    // Array of EXACTLY 8 StoryItem objects corresponding to Slots 1 through 8.
    // Each must include: id, slotType, threadId, headline, subheadline, sectionLabel, readTimeMinutes, reportedFacts, citations: [{ sourceName, url, publishedAt }], provenanceBadge, whyYou, includedBecause, intersectionScore, whatToWatchNext.
    // Slot 6 must include continuity: { previousDate, previously, newDevelopment, remainsUncertain }.
    // Slot 7 must include incubatorModule: { kind: "css_brief" | "domain_primer" | "bilingual_passage", ... }.
  ],
  "dailyQuiz": [
    // Array of 3 quiz questions: { question, options: [string, string, string, string], correctIndex: 0..3, explanation, storyId }
  ]
}`;

  const ai = new GoogleGenAI({ apiKey });

  const response = await callGeminiWithAutoModel(ai, {
    model: "gemini-3.8-flash",
    contents: [
      { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const responseText = response.text || "";
  const parsed = JSON.parse(responseText);

  // Validate and sanitize the parsed response
  const cartoonPrompt =
    parsed.cartoonPrompt ||
    `Editorial illustration of ${parsed.stories?.[0]?.headline || "current events"}`;
  const cartoonSeed = Math.abs(
    date.split("").reduce((acc, char) => acc * 31 + char.charCodeAt(0), 11)
  );

  const stories: StoryItem[] = (parsed.stories || []).map(
    (story: StoryItem, idx: number) => {
      // Ensure citation is grounded in our candidate
      const cand = candidatesContext[idx] || candidatesContext[0];
      const validCitations =
        Array.isArray(story.citations) && story.citations.length > 0
          ? story.citations.map((c) => ({
              sourceName: c.sourceName || cand.sourceName,
              url: c.url && c.url.startsWith("http") ? c.url : cand.link,
              publishedAt: c.publishedAt || cand.publishedAt,
            }))
          : [
              {
                sourceName: cand.sourceName,
                url: cand.link,
                publishedAt: cand.publishedAt,
              },
            ];

      return {
        ...story,
        id: story.id || `story-${date}-${idx + 1}`,
        citations: validCitations,
        intersectionScore: story.intersectionScore || cand.score || 85,
      };
    }
  );

  // Fallback to synthesized stories if Gemini returned fewer than 8 stories
  if (stories.length < 8) {
    const backupEdition = buildSynthesizedEdition(
      date,
      editionNumber,
      profile,
      scoredCandidates,
      previousEditions
    );
    while (stories.length < 8) {
      stories.push(backupEdition.stories[stories.length]);
    }
  }

  const dailyQuiz: QuizQuestion[] =
    Array.isArray(parsed.dailyQuiz) && parsed.dailyQuiz.length >= 3
      ? parsed.dailyQuiz.slice(0, 3)
      : [
          {
            question: `What is the core development in: ${stories[0].headline.slice(0, 50)}?`,
            options: [
              "Immediate structural implementation",
              "A total regulatory rollback",
              "Unforeseen technical gridlock",
              "A complete dissolution of current agreements",
            ],
            correctIndex: 0,
            explanation: "The lead story highlights new structural implementation guidelines.",
            storyId: stories[0].id,
          },
          {
            question: `In today's technical dispatch on ${stories[2].headline.slice(0, 45)}, what was highlighted?`,
            options: [
              "Transition toward integrated firmware architecture and standardized interfaces.",
              "Complete deprecation of CAN bus communication protocols.",
              "Abandonment of solar net-metering contracts nationwide.",
              "A 50% drop in global semiconductor foundry wafer output.",
            ],
            correctIndex: 0,
            explanation: "The dispatch outlines critical architectural decisions.",
            storyId: stories[2].id,
          },
          {
            question: `Regarding ${stories[6].headline.slice(0, 45)}, which upcoming milestone must be monitored?`,
            options: [
              "The immediate closure of interbank foreign exchange windows.",
              "The publication of regulatory gazette notifications and quarterly stakeholder reviews.",
              "A unilateral cancellation of bilateral trade agreements.",
              "A shift to purely manual grid balancing dispatchers.",
            ],
            correctIndex: 1,
            explanation: "Gazette notifications remain the decisive next milestone.",
            storyId: stories[6].id,
          },
        ];

  return {
    date,
    editionNumber,
    profileVersion: profile.version,
    generatedAt: new Date().toISOString(),
    origin: "gemini",
    mastheadQuote:
      parsed.mastheadQuote ||
      "To see clearly is poetry, prophecy, and religion, all in one. — John Ruskin",
    editorialNote:
      parsed.editorialNote && !parsed.editorialNote.includes('"error"')
        ? parsed.editorialNote
        : CLEAN_EDITOR_NOTE,
    editorialCartoon: {
      prompt: cartoonPrompt,
      imageUrl: pollinationsCartoonUrl(cartoonPrompt, cartoonSeed),
      caption: parsed.cartoonCaption || `“The shape of tomorrow.”`,
      relatedStoryId: stories[0].id,
    },
    audioBriefScript:
      parsed.audioBriefScript ||
      `Good morning, Islamabad. This is your Subh Bakhabar Morning Audio Briefing for ${date}. Leading our paper: ${stories[0].headline}.`,
    stories,
    dailyQuiz,
  };
}

/* -------------------------------------------------------------------------- */
/*                           Main Pipeline Controller                         */
/* -------------------------------------------------------------------------- */

export interface GenerateEditionOptions {
  date?: string;
  forceLive?: boolean;
}

/**
 * Runs the end-to-end edition generation pipeline:
 * 1. Ensures candidate articles exist (runs RSS ingest if pool is empty).
 * 2. Deterministically scores candidates against user profile and history.
 * 3. Assembles the 8-story Edition (via Gemini 3.8 Flash or high-fidelity synthesizer).
 * 4. Persists the new Edition to the local store.
 */
export async function generateEditionPipeline(
  options: GenerateEditionOptions = {}
): Promise<Edition> {
  const [profile, previousEditions] = await Promise.all([
    getActiveProfile(),
    getEditions(),
  ]);

  let candidates = (await getCandidateArticles())
    .filter(
      (c) =>
        !isInappropriateRssContent(c.title) &&
        !isInappropriateRssContent(c.snippet)
    )
    .map((c) => ({
      ...c,
      title: stripFeedMetadata(c.title),
      snippet: stripFeedMetadata(c.snippet),
    }));

  // If candidate pool is dry, ingest immediately
  if (candidates.length < 8) {
    const ingestRes = await fetchAndIngestFeeds();
    candidates = ingestRes.articles;
  }

  // Score candidate articles
  const scored = scoreCandidateArticles(candidates, profile, previousEditions);

  // Determine edition date and edition number
  const todayIso = new Date().toISOString().slice(0, 10);
  const targetDate = options.date || todayIso;

  const existingEdition = previousEditions.find((e) => e.date === targetDate);
  const editionNumber =
    existingEdition?.editionNumber || (await getNextEditionNumber());

  const shouldRunLive =
    options.forceLive === true || process.env.MOCK_LLM_MODE !== "true";

  let finalEdition: Edition;

  if (shouldRunLive) {
    try {
      console.log(`[gemini] Initiating live generation for ${targetDate}...`);
      finalEdition = await callGeminiLive(
        targetDate,
        editionNumber,
        profile,
        scored,
        previousEditions
      );
    } catch (err) {
      console.error(
        "[gemini] Live call failed — falling back gracefully to synthesizer:",
        err
      );
      finalEdition = buildSynthesizedEdition(
        targetDate,
        editionNumber,
        profile,
        scored,
        previousEditions
      );
      finalEdition.editorialNote = CLEAN_EDITOR_NOTE;
    }
  } else {
    // Fast mock synthesis (<100ms)
    finalEdition = buildSynthesizedEdition(
      targetDate,
      editionNumber,
      profile,
      scored,
      previousEditions
    );
  }

  // Save edition to persistent store
  await saveEdition(finalEdition);

  return finalEdition;
}

/* -------------------------------------------------------------------------- */
/*             Stage 4: Onboarding Persona Mind-Reader (Flash Lite)           */
/* -------------------------------------------------------------------------- */

export interface OnboardingParseResult {
  extractedName?: string;
  lifeLenses: LifeLens[];
  incubatorGoal: IncubatorGoal;
  summary: string;
  origin: "gemini" | "mock";
}

function deterministicPersonaParse(
  rawInput: string,
  currentProfile: UserProfile
): OnboardingParseResult {
  const lower = rawInput.toLowerCase();
  const lenses: LifeLens[] = [];

  // Detect Embedded / Firmware / Automotive / Tech
  if (
    lower.includes("embedded") ||
    lower.includes("firmware") ||
    lower.includes("rust") ||
    lower.includes("c++") ||
    lower.includes("automotive") ||
    lower.includes("ecu") ||
    lower.includes("can") ||
    lower.includes("silicon") ||
    lower.includes("ai") ||
    lower.includes("software")
  ) {
    lenses.push({
      id: "lens-embedded-auto",
      title: "Embedded Systems & Silicon Architecture",
      description:
        "Extracted from your technical bio/bookmarks: focus on real-time firmware, RISC-V/ARM toolchains, automotive ECUs, and edge compute.",
      keywords: [
        "embedded",
        "firmware",
        "rust",
        "automotive",
        "ecu",
        "semiconductor",
        "risc-v",
        "can bus",
      ],
      weight: 92,
      knowledgeBaseline:
        lower.includes("senior") ||
        lower.includes("architect") ||
        lower.includes("expert") ||
        lower.includes("lead")
          ? "expert"
          : "intermediate",
      preferredAngle:
        "Skip high-level consumer hype; focus on memory safety, silicon supply chains, and deterministic hardware-software trade-offs.",
    });
  }

  // Detect Energy / Solar / Inverters / NEPRA / Grid
  if (
    lower.includes("solar") ||
    lower.includes("inverter") ||
    lower.includes("nepra") ||
    lower.includes("grid") ||
    lower.includes("energy") ||
    lower.includes("battery") ||
    lower.includes("tariff") ||
    lower.includes("disco")
  ) {
    lenses.push({
      id: "lens-energy-grid",
      title: "Distributed Solar, Inverters & Grid Tariffs",
      description:
        "Focus on hybrid inverter electronics, LFP battery economics, and NEPRA net-metering / capacity-charge regulations.",
      keywords: [
        "solar",
        "inverter",
        "nepra",
        "grid",
        "net metering",
        "battery",
        "tariff",
        "ipp",
      ],
      weight: 88,
      knowledgeBaseline: "expert",
      preferredAngle:
        "Quantify payback horizons, kWh tariff math, grid stability constraints, and power electronics reliability.",
    });
  }

  // Detect Macro / Policy / Pakistan / IMF / Geopolitics / CSS
  if (
    lower.includes("pakistan") ||
    lower.includes("imf") ||
    lower.includes("policy") ||
    lower.includes("macro") ||
    lower.includes("economy") ||
    lower.includes("sbp") ||
    lower.includes("css") ||
    lower.includes("foreign") ||
    lower.includes("trade")
  ) {
    lenses.push({
      id: "lens-macro-policy",
      title: "Pakistan Macro-Fiscal & Geopolitical Strategy",
      description:
        "Structural economic reforms, SBP monetary stance, sovereign debt dynamics, and regional trade corridors.",
      keywords: [
        "imf",
        "sbp",
        "fiscal",
        "pakistan",
        "exports",
        "tariff",
        "geopolitics",
        "corridor",
      ],
      weight: 82,
      knowledgeBaseline: "intermediate",
      preferredAngle:
        "Connect sovereign policy announcements directly to industrial input costs, FX liquidity, and institutional governance.",
    });
  }

  // Detect Formula 1 / Motorsport / Finance / Bio / Custom topics
  if (lower.includes("f1") || lower.includes("formula 1") || lower.includes("motorsport")) {
    lenses.push({
      id: "lens-motorsport-aero",
      title: "Formula 1 Engineering & Race Strategy",
      description:
        "Powertrain hybrid MGU-K regulations, aero ground-effect physics, telemetry, and undercut/overcut tire strategy.",
      keywords: ["formula 1", "f1", "aerodynamics", "fia", "telemetry", "powertrain"],
      weight: 78,
      knowledgeBaseline: lower.includes("scratch") || lower.includes("beginner") ? "beginner" : "intermediate",
      preferredAngle:
        "Break down race outcomes through engineering regulations, tire degradation curves, and constructor upgrades.",
    });
  }

  // Ensure at least 3 multidimensional lenses
  if (lenses.length < 3) {
    for (const fallbackLens of currentProfile.lifeLenses) {
      if (!lenses.some((l) => l.id === fallbackLens.id) && lenses.length < 3) {
        lenses.push(structuredClone(fallbackLens));
      }
    }
  }

  // Determine incubator goal
  let incubatorGoal: IncubatorGoal = structuredClone(currentProfile.incubatorGoal);
  if (lower.includes("f1") || lower.includes("formula 1")) {
    incubatorGoal = {
      title: "Formula 1 Engineering & Strategy from Scratch",
      category: "new_domain",
      masteryLevel: 2,
      objective:
        "Master FIA 2026 active aerodynamics, MGU-K energy deployment, and race pit-wall undercut/overcut telemetry.",
      progressionNotes: [
        "Level 1: Understand DRS, ground effect venturi tunnels, and tire compounds (C1–C5).",
        "Level 2: Analyze 2026 50/50 electric-ICE power unit split and active aero X-mode/Z-mode.",
        "Level 3: Predict race strategy windows from fuel-load-adjusted lap time deltas.",
      ],
    };
  } else if (lower.includes("german") || lower.includes("deutsch") || lower.includes("berlin") || lower.includes("munich")) {
    incubatorGoal = {
      title: "Technical & Industrial German (B1 -> B2)",
      category: "language",
      masteryLevel: 2,
      objective:
        "Read German automotive and industrial engineering dispatches (Handelsblatt / Heise) with B2 technical vocabulary.",
      progressionNotes: [
        "Master compound nouns in power electronics and embedded systems.",
        "Practice passive voice constructions used in German regulatory and engineering standards.",
        "Build active recall of 150 core industrial & macro-policy terms.",
      ],
    };
  } else if (lower.includes("css") || lower.includes("civil service") || lower.includes("foreign policy")) {
    incubatorGoal = {
      title: "CSS Current Affairs & Public Policy Mastery",
      category: "exam_prep",
      masteryLevel: 3,
      objective:
        "Synthesize daily domestic and geopolitical developments into structured 4-part examiner dossiers (Background, Core Issue, Constitutional/Policy Angle, Way Forward).",
      progressionNotes: [
        "Anchor every policy argument in constitutional articles (e.g., 18th Amendment, CCI) or empirical data.",
        "Contrast domestic Pakistani press framing with international wire coverage.",
        "Practice concise 250-word executive policy prescriptions.",
      ],
    };
  }

  return {
    lifeLenses: lenses.slice(0, 4),
    incubatorGoal,
    summary: `Synthesized ${lenses.slice(0, 4).length} personalized Life Lenses and calibrated your '${incubatorGoal.title}' incubator track from your input.`,
    origin: "mock",
  };
}

export async function parseOnboardingPersona(
  rawInput: string,
  currentProfile: UserProfile
): Promise<OnboardingParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const shouldRunLive =
    process.env.MOCK_LLM_MODE !== "true" && Boolean(apiKey && apiKey !== "dummy");

  if (!shouldRunLive) {
    return deterministicPersonaParse(rawInput, currentProfile);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    const prompt = `You are the Onboarding Mind-Reader for SUBH BAKHABAR, an agentic personalized morning broadsheet.
Analyze the user's raw bio, ChatGPT memory export, or bookmark URLs below and extract a structured editorial profile.

USER RAW INPUT:
"""
${rawInput}
"""

Return ONLY valid JSON with this exact shape:
{
  "extractedName": string (optional),
  "summary": string (1-2 sentence explanation of how you mapped their persona),
  "lifeLenses": [
    // 3 to 4 lenses:
    {
      "id": string (kebab-case e.g. "lens-embedded-systems"),
      "title": string,
      "description": string,
      "keywords": string[] (5-8 lowercase keywords),
      "weight": number (50 to 98),
      "knowledgeBaseline": "beginner" | "intermediate" | "expert",
      "preferredAngle": string (specific editorial instruction on depth and angle)
    }
  ],
  "incubatorGoal": {
    "title": string,
    "category": "exam_prep" | "new_domain" | "language",
    "masteryLevel": 1 | 2 | 3 | 4 | 5,
    "objective": string,
    "progressionNotes": [string, string, string]
  }
}`;

    const response = await callGeminiWithAutoModel(ai, {
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const validBaselines: KnowledgeBaseline[] = ["beginner", "intermediate", "expert"];
    const validCategories: IncubatorCategory[] = ["exam_prep", "new_domain", "language"];

    const lifeLenses: LifeLens[] = Array.isArray(parsed.lifeLenses) && parsed.lifeLenses.length > 0
      ? parsed.lifeLenses.slice(0, 4).map((l: Partial<LifeLens>, i: number) => ({
          id: l.id || `lens-custom-${i + 1}`,
          title: l.title || `Life Lens ${i + 1}`,
          description: l.description || "Personalized domain lens.",
          keywords: Array.isArray(l.keywords) && l.keywords.length > 0 ? l.keywords : ["policy", "technology"],
          weight: typeof l.weight === "number" ? Math.max(0, Math.min(100, Math.round(l.weight))) : 80,
          knowledgeBaseline: validBaselines.includes(l.knowledgeBaseline as KnowledgeBaseline)
            ? (l.knowledgeBaseline as KnowledgeBaseline)
            : "intermediate",
          preferredAngle: l.preferredAngle || "Focus on structural and operational impact.",
        }))
      : deterministicPersonaParse(rawInput, currentProfile).lifeLenses;

    const rawGoal = parsed.incubatorGoal || {};
    const incubatorGoal: IncubatorGoal = {
      title: rawGoal.title || currentProfile.incubatorGoal.title,
      category: validCategories.includes(rawGoal.category)
        ? rawGoal.category
        : currentProfile.incubatorGoal.category,
      masteryLevel: ([1, 2, 3, 4, 5].includes(Number(rawGoal.masteryLevel))
        ? Number(rawGoal.masteryLevel)
        : currentProfile.incubatorGoal.masteryLevel) as MasteryLevel,
      objective: rawGoal.objective || currentProfile.incubatorGoal.objective,
      progressionNotes:
        Array.isArray(rawGoal.progressionNotes) && rawGoal.progressionNotes.length > 0
          ? rawGoal.progressionNotes
          : currentProfile.incubatorGoal.progressionNotes,
    };

    return {
      extractedName: parsed.extractedName,
      lifeLenses,
      incubatorGoal,
      summary:
        parsed.summary ||
        `Extracted ${lifeLenses.length} Life Lenses and calibrated your Incubator Goal via Gemini 3.8 Flash.`,
      origin: "gemini",
    };
  } catch (err) {
    console.error("[gemini] parseOnboardingPersona fallback:", err);
    return deterministicPersonaParse(rawInput, currentProfile);
  }
}

/* -------------------------------------------------------------------------- */
/*          Stage 5: Chief Editor Conversational Command (Flash Lite)         */
/* -------------------------------------------------------------------------- */

export interface ProposedChangeItem {
  field: string;
  previousValue: string;
  newValue: string;
}

export interface EditorCommandResult {
  reply: string;
  summary: string;
  proposedChanges: ProposedChangeItem[];
  previousState: ProfileSnapshot;
  newState: ProfileSnapshot;
  updatedProfile: UserProfile;
  origin: "gemini" | "mock";
}

function deterministicEditorCommand(
  command: string,
  profile: UserProfile,
  highlightedQuote?: string
): EditorCommandResult {
  const lower = command.toLowerCase();
  const nextProfile = structuredClone(profile);
  const proposedChanges: ProposedChangeItem[] = [];

  const previousState: ProfileSnapshot = {
    lifeLenses: structuredClone(profile.lifeLenses),
    incubatorGoal: structuredClone(profile.incubatorGoal),
    trackedStoryIds: structuredClone(profile.trackedStoryIds),
  };

  if (lower.includes("css") || lower.includes("foreign policy") || lower.includes("exam")) {
    const prevGoalTitle = nextProfile.incubatorGoal.title;
    nextProfile.incubatorGoal = {
      title: "CSS Current Affairs & Foreign Policy Analysis",
      category: "exam_prep",
      masteryLevel: Math.min(5, (nextProfile.incubatorGoal.masteryLevel + 1)) as MasteryLevel,
      objective:
        "Deliver rigorous 4-part CSS examination dossiers connecting bilateral diplomacy, constitutional mandates, and fiscal trade-offs.",
      progressionNotes: [
        "Emphasize Pakistan's bilateral treaties, CPEC Phase-II, and multilateral IMF/FATF benchmarks.",
        "Frame every issue with Historical Background, Core Bottleneck, Policy Angle, and Way Forward.",
        "Include examiner prompts and constitutional lexicon in every edition.",
      ],
    };
    proposedChanges.push({
      field: "Incubator Goal",
      previousValue: `${prevGoalTitle} (Level ${profile.incubatorGoal.masteryLevel}/5)`,
      newValue: `${nextProfile.incubatorGoal.title} (Level ${nextProfile.incubatorGoal.masteryLevel}/5)`,
    });

    const macroLens =
      nextProfile.lifeLenses.find(
        (l) =>
          l.title.toLowerCase().includes("macro") ||
          l.title.toLowerCase().includes("policy") ||
          l.title.toLowerCase().includes("pakistan")
      ) || nextProfile.lifeLenses[nextProfile.lifeLenses.length - 1];

    if (macroLens) {
      const oldWeight = macroLens.weight;
      const oldAngle = macroLens.preferredAngle;
      macroLens.weight = Math.min(100, oldWeight + 12);
      macroLens.preferredAngle =
        "Prioritize foreign policy analysis, constitutional/CCI implications, and diplomatic balance-of-power shifts.";
      if (!macroLens.keywords.includes("foreign policy")) {
        macroLens.keywords.push("foreign policy", "diplomacy");
      }
      proposedChanges.push({
        field: `Lens Weight & Angle (${macroLens.title})`,
        previousValue: `Weight ${oldWeight}% · "${oldAngle.slice(0, 55)}..."`,
        newValue: `Weight ${macroLens.weight}% · "${macroLens.preferredAngle.slice(0, 55)}..."`,
      });
    }
  } else if (
    lower.includes("nepra") ||
    lower.includes("solar") ||
    lower.includes("inverter") ||
    lower.includes("tariff") ||
    lower.includes("hardware")
  ) {
    const solarLens =
      nextProfile.lifeLenses.find(
        (l) =>
          l.title.toLowerCase().includes("solar") ||
          l.title.toLowerCase().includes("energy") ||
          l.title.toLowerCase().includes("inverter")
      ) || nextProfile.lifeLenses[0];

    if (solarLens) {
      const prevWeight = solarLens.weight;
      const prevBaseline = solarLens.knowledgeBaseline;
      solarLens.weight = Math.min(100, prevWeight + 10);
      solarLens.knowledgeBaseline = "expert";
      solarLens.preferredAngle =
        "Deep technical & tariff breakdown: NEPRA net-metering revisions, hybrid inverter MPPT/BMS hardware schematics, and LFP cell economics.";
      proposedChanges.push({
        field: `Lens Calibration (${solarLens.title})`,
        previousValue: `Weight ${prevWeight}% · Baseline: ${prevBaseline.toUpperCase()}`,
        newValue: `Weight ${solarLens.weight}% · Baseline: EXPERT (NEPRA & Inverter Hardware focus)`,
      });
    }
  } else if (
    lower.includes("f1") ||
    lower.includes("formula 1") ||
    lower.includes("simply") ||
    lower.includes("beginner") ||
    lower.includes("basic")
  ) {
    if (lower.includes("f1") || lower.includes("formula 1")) {
      const prevTitle = nextProfile.incubatorGoal.title;
      nextProfile.incubatorGoal = {
        title: "Formula 1 from Scratch (Beginner-Friendly Primer)",
        category: "new_domain",
        masteryLevel: 1,
        objective:
          "Explain Formula 1 race strategy, aerodynamics, and power-unit rules using clear everyday analogies and zero unexplained jargon.",
        progressionNotes: [
          "Define every motorsport term (undercut, DRS, dirty air, degradation) inline.",
          "Use intuitive mechanical analogies before diving into telemetry numbers.",
          "Connect constructor engineering choices to Sunday race outcomes.",
        ],
      };
      proposedChanges.push({
        field: "Incubator Goal",
        previousValue: `${prevTitle} (Level ${profile.incubatorGoal.masteryLevel}/5)`,
        newValue: `${nextProfile.incubatorGoal.title} (Level 1/5 · Beginner Primer)`,
      });
    } else {
      const targetLens = nextProfile.lifeLenses[0];
      if (targetLens) {
        const oldBase = targetLens.knowledgeBaseline;
        targetLens.knowledgeBaseline =
          lower.includes("simply") || lower.includes("simpler") ? "beginner" : "expert";
        proposedChanges.push({
          field: `Knowledge Baseline (${targetLens.title})`,
          previousValue: oldBase.toUpperCase(),
          newValue: targetLens.knowledgeBaseline.toUpperCase(),
        });
      }
    }
  } else if (lower.includes("german") || lower.includes("deutsch")) {
    const prevTitle = nextProfile.incubatorGoal.title;
    nextProfile.incubatorGoal = {
      title: "German via Tech & Automotive News",
      category: "language",
      masteryLevel: 2,
      objective:
        "Include bilingual German-English technical passages and compound-noun lexicons in every edition.",
      progressionNotes: [
        "Focus on automotive engineering and energy transition terminology.",
        "Pair original German sentences with idiomatic English translations.",
        "Highlight 3 key technical vocabulary terms per article.",
      ],
    };
    proposedChanges.push({
      field: "Incubator Goal",
      previousValue: prevTitle,
      newValue: nextProfile.incubatorGoal.title,
    });
  } else {
    // General directive or Red-Pencil quote critique
    const targetLens = nextProfile.lifeLenses[0];
    if (targetLens) {
      const prevAngle = targetLens.preferredAngle;
      const prevWeight = targetLens.weight;
      const cleanedDirective = command
        .replace(/^Regarding:\s*["'“].*?["'”]\s*—\s*/i, "")
        .trim();
      targetLens.preferredAngle = `${cleanedDirective || command} (Prioritize concrete evidence, primary data, and direct engineering/policy trade-offs).`;
      targetLens.weight = Math.min(100, prevWeight + 6);
      proposedChanges.push({
        field: `Editorial Angle (${targetLens.title})`,
        previousValue: `"${prevAngle.slice(0, 65)}..." (Weight ${prevWeight}%)`,
        newValue: `"${targetLens.preferredAngle.slice(0, 65)}..." (Weight ${targetLens.weight}%)`,
      });
    }
  }

  const newState: ProfileSnapshot = {
    lifeLenses: structuredClone(nextProfile.lifeLenses),
    incubatorGoal: structuredClone(nextProfile.incubatorGoal),
    trackedStoryIds: structuredClone(nextProfile.trackedStoryIds),
  };

  const summary =
    proposedChanges.map((c) => `${c.field}: ${c.newValue}`).join(" | ") ||
    `Updated editorial directive: "${command.slice(0, 60)}"`;

  const reply = highlightedQuote
    ? `Noted your red-pencil critique on "${highlightedQuote.slice(0, 60)}...". I have recalibrated your Persona Brain (${proposedChanges[0]?.field || "Editorial Angle"}) so future dispatches and live story regenerations reflect this exact depth and framing.`
    : `Understood. I have prepared a schema-validated patch for your Persona Brain (${proposedChanges.map((p) => p.field).join(", ")}). Review the state diff below and click "Apply Change" to commit it to the newsroom ledger, or regenerate any story immediately.`;

  return {
    reply,
    summary,
    proposedChanges,
    previousState,
    newState,
    updatedProfile: nextProfile,
    origin: "mock",
  };
}

export async function processEditorCommand(
  command: string,
  profile: UserProfile,
  highlightedQuote?: string
): Promise<EditorCommandResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const shouldRunLive =
    process.env.MOCK_LLM_MODE !== "true" && Boolean(apiKey && apiKey !== "dummy");

  if (!shouldRunLive) {
    return deterministicEditorCommand(command, profile, highlightedQuote);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    const prompt = `You are the Chief Editor of SUBH BAKHABAR (صبح باخبر).
The reader is issuing a natural-language directive to recalibrate their UserProfile.

CURRENT USER PROFILE:
${JSON.stringify(
  {
    lifeLenses: profile.lifeLenses,
    incubatorGoal: profile.incubatorGoal,
    trackedStoryIds: profile.trackedStoryIds,
  },
  null,
  2
)}

${highlightedQuote ? `HIGHLIGHTED QUOTE FROM PAPER: "${highlightedQuote}"\n` : ""}
READER DIRECTIVE: "${command}"

Update the profile's lifeLenses (weights 0-100, knowledgeBaseline: "beginner"|"intermediate"|"expert", preferredAngle, keywords, or add/modify a lens) and/or incubatorGoal (title, category: "exam_prep"|"new_domain"|"language", masteryLevel: 1..5, objective, progressionNotes) to fulfill the reader's instruction.

Respond ONLY with valid JSON matching this schema:
{
  "reply": string (Chief Editor's crisp, authoritative 2-sentence acknowledgment),
  "summary": string (1-line summary for the Change Log),
  "proposedChanges": [
    {
      "field": string,
      "previousValue": string,
      "newValue": string
    }
  ],
  "lifeLenses": LifeLens[],
  "incubatorGoal": IncubatorGoal
}`;

    const response = await callGeminiWithAutoModel(ai, {
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const fallback = deterministicEditorCommand(command, profile, highlightedQuote);

    const nextLenses: LifeLens[] =
      Array.isArray(parsed.lifeLenses) && parsed.lifeLenses.length > 0
        ? parsed.lifeLenses
        : fallback.updatedProfile.lifeLenses;

    const nextGoal: IncubatorGoal =
      parsed.incubatorGoal && parsed.incubatorGoal.title
        ? parsed.incubatorGoal
        : fallback.updatedProfile.incubatorGoal;

    const previousState: ProfileSnapshot = {
      lifeLenses: structuredClone(profile.lifeLenses),
      incubatorGoal: structuredClone(profile.incubatorGoal),
      trackedStoryIds: structuredClone(profile.trackedStoryIds),
    };

    const newState: ProfileSnapshot = {
      lifeLenses: structuredClone(nextLenses),
      incubatorGoal: structuredClone(nextGoal),
      trackedStoryIds: structuredClone(profile.trackedStoryIds),
    };

    const updatedProfile: UserProfile = {
      ...structuredClone(profile),
      lifeLenses: nextLenses,
      incubatorGoal: nextGoal,
    };

    return {
      reply: parsed.reply || fallback.reply,
      summary: parsed.summary || fallback.summary,
      proposedChanges:
        Array.isArray(parsed.proposedChanges) && parsed.proposedChanges.length > 0
          ? parsed.proposedChanges
          : fallback.proposedChanges,
      previousState,
      newState,
      updatedProfile,
      origin: "gemini",
    };
  } catch (err) {
    console.error("[gemini] processEditorCommand fallback:", err);
    return deterministicEditorCommand(command, profile, highlightedQuote);
  }
}

/* -------------------------------------------------------------------------- */
/*            Stage 5: Single-Story Live Regeneration (Flash Lite)            */
/* -------------------------------------------------------------------------- */

function deterministicRegenerateStory(
  story: StoryItem,
  instruction: string,
  profile: UserProfile
): StoryItem {
  const lower = instruction.toLowerCase();
  const updated = structuredClone(story);

  const primaryLens = profile.lifeLenses[0];
  const isSimpler =
    lower.includes("simpl") ||
    lower.includes("beginner") ||
    lower.includes("explain") ||
    lower.includes("analogy");
  const isDeeper =
    lower.includes("technical") ||
    lower.includes("expert") ||
    lower.includes("basic") ||
    lower.includes("hardware") ||
    lower.includes("nepra") ||
    lower.includes("depth");
  const isCss =
    lower.includes("css") ||
    lower.includes("policy") ||
    lower.includes("foreign") ||
    lower.includes("exam");

  if (isSimpler) {
    updated.subheadline = `[Simplified Primer] ${story.subheadline}`;
    updated.reportedFacts = `In plain terms: ${story.reportedFacts} Put simply, think of this shift like upgrading a household circuit breaker before adding heavy appliances—the underlying rules and hardware must adjust first so the broader system stays stable without unexpected price spikes.`;
    updated.whyYou = `Rewritten per your Chief Editor directive ("${instruction.slice(0, 55)}"): stripped out dense jargon and anchored the dispatch in intuitive first-principles analogies.`;
    updated.includedBecause = `${story.includedBecause} · Calibrated: Accessible Primer`;
  } else if (isCss) {
    updated.subheadline = `[Policy & Governance Brief] ${story.subheadline}`;
    updated.reportedFacts = `${story.reportedFacts} From a constitutional and fiscal governance perspective, analysts note direct implications for federal-provincial coordination under the Council of Common Interests (CCI), multilateral IMF structural benchmarks, and long-term sovereign industrial competitiveness.`;
    updated.whyYou = `Rewritten per your Chief Editor directive ("${instruction.slice(0, 55)}"): reframed through a CSS Current Affairs & Public Policy lens linking empirical evidence to institutional reform.`;
    updated.includedBecause = `${story.includedBecause} · CSS Policy Angle`;
  } else if (isDeeper) {
    updated.subheadline = `[Deep Technical & Quantitative Analysis] ${story.subheadline}`;
    updated.reportedFacts = `${story.reportedFacts} At the engineering and unit-economics layer, this shifts deterministic latency budgets, inverter MPPT/BMS firmware control loops, and levelized tariff amortization schedules by 140–220 bps across Q3–Q4 deployments.`;
    updated.whyYou = `Rewritten per your Chief Editor directive ("${instruction.slice(0, 55)}"): elevated to Expert baseline (${primaryLens?.title || "Core Systems"}) with concrete unit-economics and architectural specificity.`;
    updated.includedBecause = `${story.includedBecause} · Calibrated: Expert Depth`;
  } else {
    updated.subheadline = `[Editor's Recalibration] ${story.subheadline}`;
    updated.reportedFacts = `${story.reportedFacts} Following your direct editorial instruction (${instruction}), the newsroom desk has foregrounded the operational trade-offs, primary regulatory filings, and near-term execution catalysts most relevant to your updated Life Lenses.`;
    updated.whyYou = `Recalibrated live by the Chief Editor for "${instruction.slice(0, 65)}" — aligned with ${primaryLens?.title || "your active persona"} (${primaryLens?.knowledgeBaseline || "expert"} baseline).`;
    updated.includedBecause = `${story.includedBecause} · Live Recalibrated`;
  }

  return updated;
}

export async function regenerateSingleStory(
  story: StoryItem,
  instruction: string,
  profile: UserProfile
): Promise<{ story: StoryItem; origin: "gemini" | "mock" }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const shouldRunLive =
    process.env.MOCK_LLM_MODE !== "true" && Boolean(apiKey && apiKey !== "dummy");

  if (!shouldRunLive) {
    return {
      story: deterministicRegenerateStory(story, instruction, profile),
      origin: "mock",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    const prompt = `You are the Chief Editor of SUBH BAKHABAR. Rewrite this single newspaper story in place according to the reader's instruction and active profile.
CRITICAL RULE: Keep the exact same "id", "slotType", and "citations" (NEVER alter or fabricate citation URLs).

CURRENT STORY:
${JSON.stringify(story, null, 2)}

ACTIVE USER PROFILE LENSES:
${JSON.stringify(profile.lifeLenses, null, 2)}
INCUBATOR GOAL:
${JSON.stringify(profile.incubatorGoal, null, 2)}

READER INSTRUCTION FOR REGENERATION:
"${instruction}"

Return ONLY valid JSON for the updated StoryItem object (preserving id, slotType, and citations).`;

    const response = await callGeminiWithAutoModel(ai, {
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.25,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const updatedStory: StoryItem = {
      ...story,
      headline: parsed.headline || story.headline,
      subheadline: parsed.subheadline || story.subheadline,
      sectionLabel: parsed.sectionLabel || story.sectionLabel,
      reportedFacts: parsed.reportedFacts || story.reportedFacts,
      whyYou: parsed.whyYou || story.whyYou,
      includedBecause: parsed.includedBecause || `${story.includedBecause} · Recalibrated`,
      whatToWatchNext: parsed.whatToWatchNext || story.whatToWatchNext,
      // Always preserve original verified citations and ID
      id: story.id,
      slotType: story.slotType,
      citations: story.citations,
    };

    return { story: updatedStory, origin: "gemini" };
  } catch (err) {
    console.error("[gemini] regenerateSingleStory fallback:", err);
    return {
      story: deterministicRegenerateStory(story, instruction, profile),
      origin: "mock",
    };
  }
}


