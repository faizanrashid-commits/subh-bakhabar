# SUBH BAKHABAR (صبح باخبر) — Your World, In Perspective
**Event:** NaSCon'26 AI Hackathon (Solo Build)
**Tagline:** An agentic, finite morning newspaper that understands who you are, how world events intersect with your life, what changed since yesterday, and who you want to become.

---

## 1. Tech Stack & Architecture (Single-Repo Fullstack)
* **Framework:** Next.js (App Router) + TypeScript (Frontend broadsheet + Node.js Server Route Handlers under `/src/app/api/*`).
* **Styling & Newspaper Layout:** Tailwind CSS + Google Editorial Fonts (`Playfair Display` for headlines, `Source Serif 4` / `Merriweather` for body columns, `JetBrains Mono` for metadata badges).
* **PDF Engine:** Dedicated Print Broadsheet Layout (`@media print` multi-column CSS + printable `/edition/[date]/print` view) consuming the exact same immutable Edition JSON as the web reader.
* **Persistence Layer:** Local JSON-backed database (`/data/subh-db.json`) storing `profiles`, `articles`, `editions`, and `profile_change_log` — zero cloud latency, 100% offline/Wi-Fi resilient, instant seeding.
* **News Ingestion:** `rss-parser` (Node.js) pulling live RSS feeds across Tech/Embedded, Pakistan News & Energy, Global Affairs, and Sports/Culture.
* **AI & Model Routing (`@google/genai` + `zod`):**
  * `gemini-2.5-flash`: Primary engine for single-call batched 8-story Edition generation with strict JSON `responseSchema`.
  * `gemini-2.5-flash-lite`: High-speed, low-quota model for Onboarding Persona extraction, Chief Editor profile updates, and Single-Story Live Regeneration.
  * `MOCK_LLM_MODE`: Environment toggle to use cached/seeded JSON during UI/CSS styling without burning API rate limits.
* **Media & Interactive Extras:**
  * **Editorial Cartoon:** Pollinations.ai dynamic black-and-white vintage newspaper ink illustration URL generated from Lead Story #1.
  * **Morning Audio Brief:** Browser Web Speech API (`window.speechSynthesis`) reading the generated 90-second broadcast script with a live waveform UI.

---

## 2. Core Data Schemas (`/src/types/subh.ts`)

### A. `UserProfile`
* `id`, `name`, `updatedAt`, `version`
* `lifeLenses`: Array of 3–4 multidimensional lenses (`id`, `title`, `description`, `keywords[]`, `weight` 0–100, `knowledgeBaseline`: `'beginner' | 'intermediate' | 'expert'`, `preferredAngle`: string).
* `incubatorGoal`: Active learning goal (`title`, `category`: `'exam_prep' | 'new_domain' | 'language'`, `masteryLevel`: 1–5, `objective`: string, `progressionNotes`: string[]).
* `trackedStoryIds`: String[] (continuing story threads pinned by the user).
* `changeLog`: Array of validated mutations (`id`, `timestamp`, `source`: `'chief_editor' | 'inline_feedback'`, `summary`, `previousState`, `newState`).

### B. `StoryItem` (1 of 8 slots in an Edition)
* `id`, `slotType`: `'lead_intersection' | 'life_lens' | 'continuing' | 'incubator' | 'beyond_bubble'`
* `headline`, `subheadline`, `sectionLabel`, `readTimeMinutes`
* `reportedFacts`: Source-grounded journalistic summary (strictly factual).
* `citations`: Array of `{ sourceName, url, publishedAt }`.
* `provenanceBadge`: `'Multiple Outlets' | 'Independently Corroborated' | 'Single-Source / Developing' | 'Primary Source Checked'`
* `whyYou`: Personalized synthesis connecting the story to 1 or more Life Lenses.
* `includedBecause`: Short badge string (e.g., `"Embedded Systems + Pakistan Energy Policy"`).
* `intersectionScore`: Number (calculated via 35% Relevance, 25% Cross-Lens Intersection, 20% Significance, 10% Freshness, 10% Novelty).
* `whatToWatchNext`: Concrete upcoming milestone or unresolved question.
* `continuity` *(Optional)*: `{ previousDate, previously, newDevelopment, remainsUncertain }`
* `framingDivergence` *(Optional)*: `{ summary, sourceA: { name, framing, url }, sourceB: { name, framing, url } }`
* `incubatorModule` *(Optional)*: Structured box for CSS Exam Brief (`background`, `coreIssue`, `policyAngle`, `wayForward`), Domain Primer, or German Bilingual Passage + Vocab.

### C. `Edition` (Immutable Snapshot per Date)
* `date` (`YYYY-MM-DD`), `editionNumber`, `profileVersion`
* `mastheadQuote` / `editorialNote`
* `editorialCartoon`: `{ prompt, imageUrl, caption, relatedStoryId }`
* `audioBriefScript`: 150-word morning newsroom broadcast script covering the top 3 stories.
* `stories`: Fixed array of 8 `StoryItem` objects.
* `dailyQuiz`: Array of 3 retention questions (`question`, `options[]`, `correctIndex`, `explanation`, `storyId`) — solving *"still can't name three things they learned"*.

---

## 3. Seven-Stage Vertical Build Checklist

### [x] Stage 1: Foundation, Repo & Seeded Archive (Target: 30m)
- [x] Initialize Next.js + TypeScript + Tailwind repository and push Commit #1 to public GitHub.
- [x] Create `/src/types/subh.ts` with complete interfaces.
- [x] Create `/src/data/seed.ts` with:
  - Default User Profile (CS/Embedded Systems & German Auto + Solar/Inverters & Pakistan Energy Economics + Macro Policy; Incubator: CSS Current Affairs / German Tech).
  - Two complete, realistic saved editions (`2026-10-16` Yesterday's Edition and `2026-10-17` Today's Edition) so Archive and Continuity work out-of-the-box.
- [x] Create `/src/lib/store.ts` for local JSON persistence at `/data/subh-db.json`.

### [x] Stage 2: The Broadsheet Web Reader & True Newspaper PDF (Target: 45m)
- [x] Build the classic broadsheet masthead (`SUBH BAKHABAR`, date, edition switcher dropdown, "Download Newspaper PDF" button, Audio Brief player bar).
- [x] Render the 8-slot newspaper grid:
  - **Front Page:** 2 Lead Intersection stories + Front-Page AI Editorial Ink Cartoon.
  - **Inside Columns:** 3 Life-Lens stories + 1 Continuing Story ("What Changed Since Yesterday?" timeline).
  - **Growth & Discovery Section:** 1 Incubator Feature column + 1 "Beyond Your Bubble" story.
  - **Footer:** Interactive "3 Things You Learned Today" retention quiz.
- [x] Build the dedicated multi-column `@media print` / printable newspaper view so downloading the PDF produces a genuine multi-column broadsheet document (not a raw webpage screenshot).

### [x] Stage 3: Live RSS Ingestion & Deterministic + Gemini Pipeline (Target: 45m)
- [x] Build `/api/ingest` using `rss-parser` to fetch real articles from curated feeds (Dawn, Reuters/BBC, Ars Technica, Hacker News, CleanTechnica) with graceful fallback to cached feeds if hackathon Wi-Fi drops.
- [x] Build deterministic scoring utility (`scoreCandidateArticles`) implementing the 35/25/20/10/10 heuristic formula.
- [x] Build `/api/edition/generate` calling `gemini-2.5-flash` with structured JSON schema to assemble a fresh 8-story edition grounded in real retrieved URLs.

### [x] Stage 4: "Mind-Reader + Goal Setter" Onboarding (Target: 30m)
- [x] Build `/onboarding` drawer/modal:
  - Tab 1: Paste ChatGPT Memory / Bio OR paste 3–5 recent URLs / bookmark snippets.
  - Tab 2: Configure active **Interest Incubator Goal** (CSS Prep, Formula 1 from Scratch, German via Tech News, or custom goal).
- [x] Wire `/api/onboarding/parse` (`gemini-2.5-flash-lite`) to generate editable Life Lenses and Knowledge Baselines with explicit user review before saving.

### [x] Stage 5: The Chief Editor's Desk & Adaptive Learning Loop (Target: 40m)
- [x] Add inline per-story editorial controls: `More Like This`, `I Already Know This (Too Basic)`, `Wrong Angle`, `Track Story`, `Skip Section`.
- [x] Add **Highlight-to-Critique ("Red Pencil")**: Selecting any text pops up a floating button that sends the quote to the Chief Editor.
- [x] Build the **Chief Editor Command Bar** + **Live Persona Brain Drawer**:
  - Natural language command -> schema-validated profile patch -> visible change log with **Undo** button.
  - **Instant Single-Story Regeneration** (`/api/story/regenerate`) so judges see an article adapt its depth/angle in 2 seconds.

### [x] Stage 6: "Room to Explore" Polish & Verification (Target: 25m)
- [x] Verify Pollinations.ai editorial ink sketch loads cleanly with a vintage newsprint filter.
- [x] Verify 90-second Morning Audio Briefing play/pause/waveform works smoothly.
- [x] Verify the 3-question Daily Retention Quiz scores answers and links back to the relevant stories.

### [x] Stage 7: Architecture Diagram & 5-Minute Loom Demo (Target: 30m)
- [x] Export high-resolution Architecture Diagram (`ARCHITECTURE.md` / Mermaid diagram).
- [x] Walk through the 10-step demo narrative in a crisp 5-minute Loom video and submit form.

---

## 4. Guardrails & Golden Rules
1. **Commit Early & Often:** Push after every completed stage so the GitHub commit graph shows steady progress.
2. **Never Fabricate Citations:** Every story summary must link to actual retrieved RSS/article URLs.
3. **Single Source of Truth:** Web Reader, PDF View, and Archive must read from the exact same saved Edition JSON.
4. **Protect API Quotas:** Keep `MOCK_LLM_MODE=true` while tweaking layout/CSS; switch to live Gemini calls when testing endpoints and recording the final demo.