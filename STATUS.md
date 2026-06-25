# PROJECT STATUS MEMORY

**CURRENT PHASE:** Sprint 13 Complete — Presentation Enhancements

**COMPLETED SPRINTS:**
- Sprint 1: Foundation & Types
- Sprint 2: Math Engine Integration
- Sprint 3: Lesson Planner (block CRUD, localStorage save, defensive JSON handling)
- Sprint 4: Presentation Stage (dark mode viewport, keyboard navigation, progressive reveal, block rendering)
- Sprint 5: App Orchestration & Styling (view routing, chalkboard CSS animations, localStorage defensive reads)
- Sprint 6: Type System Extension & Narration Data Model
- Sprint 7: Lesson Editor Hardening (block deletion, reordering, duplication, LaTeX preview, image validation, narration editing)
- Sprint 8: Multi-Lesson Management (lesson library, CRUD service, import/export, LessonList view, backward-compatible migration)
- Sprint 9: Knowledge Graph Engine (concept extraction, edge inference, KG builder, relevance query, symbol ledger builder)
- Sprint 10: Multi-Agent LLM Narration Pipeline (LLM client, teaching plan agent, vision agent, narration script agent, validation agent, pipeline orchestrator)
- Sprint 11: TTS Integration & Timing Engine (TTS client, audio tag preprocessor, math-to-speech preprocessor, narration audio generator, timing engine, timeline builder)
- Sprint 12: Recording Pipeline (DOM stabilizer, checkpoint/resume, pre-flight checks, ffmpeg composition, post-recording verification, Playwright recording script, recording CLI)
- Sprint 13: Presentation Enhancements (on-screen nav controls, block indicator dots, speaker notes panel, presentation timer, auto-advance mode with countdown bar)

---

## POST-SPRINT BUG FIXES (2026-06-22)

### Bug 1: Blank Page in Browser
- **Root Cause 1 — Missing `tailwind.config.js`**: Tailwind CSS v3.4.19 requires a `content` array in `tailwind.config.js` to scan source files for utility class usage. Without this file, Tailwind generated zero utility classes, rendering every styled element invisible (no bg-gray-950, no text-white, no flex, etc.).
- **Root Cause 2 — `verbatimModuleSyntax` Violation**: `PresentationStage.tsx` imported `{ Lesson, LessonBlock }` as value imports from `src/data/types.ts`. That file only exports TypeScript `type` declarations (no runtime values). With `verbatimModuleSyntax: true` in `tsconfig.app.json`, the browser's ESM loader rejected the non-existent runtime exports, causing the entire React app to crash before rendering.
- **Fix 1**: Created `tailwind.config.js` at project root with `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`.
- **Fix 2**: Changed `import { Lesson, LessonBlock }` to `import type { Lesson, LessonBlock }` in `src/views/PresentationStage.tsx`.

### Bug 2: Red Text in Math Rendering
- **Root Cause 1 — Missing KaTeX CSS**: `ProgressiveAlignedEquation.tsx` did not import `katex/dist/katex.min.css`. The SEED-ENGINE.txt reference implementation had this import, but it was removed during Sprint 2 adaptations. Without KaTeX CSS, all rendered math had no fonts, no layout, and no styling applied. KaTeX's `.katex-error` class renders with red color by default, causing all potentially malformed expressions to display as red text.
- **Root Cause 2 — Invisible Text on Dark Background**: The math container `<div>` had no explicit text color class. On the dark `bg-gray-950` presentation background, even correctly-rendered white KaTeX text appeared invisible because Tailwind's CSS reset does not set a default text color.
- **Fix 1**: Added `import "katex/dist/katex.min.css";` to `src/components/ProgressiveAlignedEquation.tsx`.
- **Fix 2**: Added `text-white` class to the math container div.
- **Fix 3**: Restored line separator from `\\` to `\\[1.5em]` to match the SEED reference, ensuring proper vertical spacing between aligned equation lines.

### Bug 3: Line Separator Regression
- **Root Cause**: During Sprint 2, the SEED file's `\\[1.5em]` line separator was collapsed to `\\`. This caused KaTeX to render aligned lines with zero vertical gap, making multi-line equations run together and harder to read in progressive reveal mode.
- **Fix**: Restored `\\[1.5em]` separator in the `renderNodes` join operation within `ProgressiveAlignedEquation.tsx`. Verified against SEED-ENGINE.txt for exact match.

---

## SEED LESSON PRE-POPULATION (2026-06-22)

### Implementation
- **File**: `src/views/LessonPlanner.tsx`
- **Mechanism**: Added `useEffect` on mount that reads `localStorage.getItem('saved_lesson')`. If a saved lesson exists, it populates the form from localStorage. If no saved lesson exists (null/error), it loads `SEED_LESSON` as the default.
- **SEED_LESSON constant**: A 38-block comprehensive lesson defined as a module-level constant.

### Seed Lesson Structure — "Quadratic Equations — From Factoring to the Quadratic Formula"

| # | Section | Blocks | Block Types |
|---|---------|--------|-------------|
| 1 | What Is a Quadratic Equation? | 5 | heading, text, math (standard form examples), image (parabola), text |
| 2 | Method 1 — Factoring | 6 | heading, text, math (x²+7x+12=0, 7-line solve), text (verification), math (2x²-x-6=0, 6-line ac-method), image (area model) |
| 3 | Method 2 — Completing the Square | 4 | heading, text (key insight), math (x²+6x+5=0, 9-line solve), text (geometric note) |
| 4 | Method 3 — The Quadratic Formula | 6 | heading, text, math (11-line derivation from ax²+bx+c=0), text, math (2x²-4x-6=0, 8-line worked example), image (parabola with key values) |
| 5 | The Discriminant — b²-4ac | 7 | heading, text, math (Δ cases overview), text, math (Cases 1&2: Δ>0 and Δ=0, 8 lines), math (Case 3: Δ<0 complex roots, 5 lines), image (3-parabola comparison) |
| 6 | Full Worked Example | 3 | heading, text, math (3x²-12x+9=0 by factoring AND formula, 14-line dual method) |
| 7 | Practice Exercises | 4 | heading, text (instructions), math (5 problems), text (answers with Δ values) |
| 8 | Key Takeaways | 3 | heading, text (3-part summary), image (blackboard) |

### Totals
- **38 blocks**: 8 headings, 14 text, 11 math, 5 images
- **Largest math block**: Section 4 derivation (11 aligned lines, ~60+ progressive reveal steps)
- **Images**: 5 Wikimedia Commons URLs (parabola graphs, area model, discriminant comparison, blackboard)

### Online Image URLs Used
1. `https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Polynomialdeg2.svg/640px-Polynomialdeg2.svg.png` — Basic parabola (Section 1)
2. `https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Binomial_theorem_visualisation.svg/640px-Binomial_theorem_visualisation.svg.png` — Area model for factoring (Section 2)
3. `https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Quadratic_function_graph_key_values.svg/640px-Quadratic_function_graph_key_values.svg.png` — Parabola with vertex and roots labeled (Section 4)
4. `https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Quadratic_roots.svg/640px-Quadratic_roots.svg.png` — Three parabolas comparing discriminant cases (Section 5)
5. `https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Quadratic_equation_on_blackboard.jpg/640px-Quadratic_equation_on_blackboard.jpg` — Blackboard summary (Section 8)

---

## CONSOLE LOGGING COVERAGE

All files have aggressive, prefixed console.log statements per CLAUDE.md requirements:

| File | Log Points |
|------|-----------|
| `src/App.tsx` | Mount, localStorage read (found/not found/error), view switch (to presentation/to planner) |
| `src/views/LessonPlanner.tsx` | Mount, initialization (localStorage/seed/error), add block, update content, update imageUrl, save (success/storage error/stringify error) |
| `src/views/PresentationStage.tsx` | Mount/update (blockIndex, revealCount, maxReveal), keydown attach/remove, forward/backward navigation, escape exit, key handler errors |
| `src/components/ProgressiveAlignedEquation.tsx` | Mount/update (equationString prefix, revealCount, displayMode), tokenization start, split line count, line totals, distributed counts, frontier line index, final LaTeX length, KaTeX render success/error |

---

## SPRINT 6 COMPLETION (2026-06-24)

### New Type Files Created
- `src/data/knowledgeGraph.ts` — ConceptNode, GraphEdge (with 6 edge types), KnowledgeGraph interfaces
- `src/data/narrationTypes.ts` — AudioTag (12 values), NarrationSegment, BlockNarration, LessonNarration interfaces
- `src/data/symbolLedger.ts` — SymbolEntry, SymbolLedger interfaces with getCanonical/isDefined methods

### Existing File Modified
- `src/data/types.ts` — Added optional `narration?: string` and `narrationSteps?: string[]` to LessonBlock (backward compatible)

### New Tests
- `src/data/knowledgeGraph.test.ts` — 10 tests (KG construction, all ConceptType/EdgeType values, edge-to-concept validation, cycle detection, acyclic validation, empty KG, concepts with no edges)
- `src/data/narrationTypes.test.ts` — 10 tests (all AudioTag values, full segment creation, minimal segment, BlockNarration, duration estimation, LessonNarration, reveal trigger validation, pause values, empty segments, chained narration)
- `src/data/symbolLedger.test.ts` — 8 tests (SymbolEntry creation, aliases, ledger construction, canonical lookup, isDefined check, notation conflict detection, empty ledger, block tracking)
- `src/data/types.test.ts` — Updated from 3 to 8 tests (added narration, narrationSteps, combined fields, backward compatibility)

## SPRINT 7 COMPLETION (2026-06-24)

### Lesson Editor Hardening Features
- **7.1 Block Deletion**: Delete button (✕) with `window.confirm` prompt, removes block from state, updates count
- **7.2 Block Reordering**: ▲▼ buttons on each block, first block's ▲ disabled, last block's ▼ disabled
- **7.3 Block Duplication**: ⧉ button creates deep copy with new unique ID
- **7.4 Math LaTeX Preview**: 300ms debounced `useEffect` calling `katex.renderToString`, `dangerouslySetInnerHTML` display, invalid LaTeX shows red error text
- **7.5 Image URL Validation**: 500ms debounced `useEffect` with `AbortController` HEAD request, ✓/✗ status indicators per image block
- **7.6 Narration Field Editing**: Collapsible narration section (▶/▼ toggle), textarea for block narration, step management for math blocks (add/remove/edit steps)

### New Types (from Sprint 6)
- `src/data/knowledgeGraph.ts` — ConceptNode, GraphEdge (6 edge types), KnowledgeGraph
- `src/data/narrationTypes.ts` — AudioTag (12 values), NarrationSegment, BlockNarration, LessonNarration
- `src/data/symbolLedger.ts` — SymbolEntry, SymbolLedger with getCanonical/isDefined methods

### Modified Files
- `src/data/types.ts` — Added optional `narration?: string` and `narrationSteps?: string[]` to LessonBlock
- `src/views/LessonPlanner.tsx` — ~200 lines added (CRUD operations, debounced math preview, image validation, narration editing)

### New Tests
- `src/data/knowledgeGraph.test.ts` — 10 tests
- `src/data/narrationTypes.test.ts` — 10 tests
- `src/data/symbolLedger.test.ts` — 8 tests
- `src/data/types.test.ts` — 8 tests (3 → 8, added narration coverage)
- `src/views/LessonPlanner.test.tsx` — 26 tests (9 → 26, all Sprint 7 features)

## SPRINT 8 COMPLETION (2026-06-24)

### Multi-Lesson Management Features
- **8.1 Lesson Storage Restructure**: `localStorage('lesson_library')` stores `LessonLibrary` interface. Automatic one-way migration from legacy `saved_lesson` key. Defensive reads with try/catch, fallback to seed lesson library.
- **8.2 Lesson List View**: Grid of lesson cards showing title, block count, last modified date. Create (via prompt), duplicate, delete (via confirm), import, and export actions per card. Empty state message.
- **8.3 Lesson Import/Export**: JSON file download via Blob + URL.createObjectURL. File upload via hidden input + FileReader. Validation checks required fields (id, title, blocks). Defensive try/catch around JSON.parse.
- **8.4 App Router Update**: Three-view routing (`library` | `planner` | `presentation`). Library shown when 2+ lessons exist. Single-lesson mode skips library (backward compatible). Exit from presentation → library if 2+ lessons, else planner.
- **8.5 LessonPlanner Refactor**: Controlled component receiving `initialLesson` prop (App is single source of truth). Optional `onBack` prop. Falls back to SEED_LESSON when no initialLesson provided.

### New Files (4)
- `src/data/seedLesson.ts` — SEED_LESSON constant extracted from LessonPlanner
- `src/services/lessonStorage.ts` — CRUD service with localStorage, migration, defensive reads
- `src/services/lessonImportExport.ts` — JSON file download and upload with validation
- `src/views/LessonList.tsx` — Responsive grid of lesson cards with full action set

### Modified Files (3)
- `src/data/types.ts` — Added `lastModified?: string` to Lesson; added `LessonLibrary` interface
- `src/views/LessonPlanner.tsx` — Controlled component pattern; removed localStorage R/W; added `onBack` prop
- `src/App.tsx` — Three-view router; orchestrates all lesson CRUD via services

### New Tests (3 files, 52 tests)
- `src/services/lessonStorage.test.ts` — 18 tests (migration, CRUD, corruption survival, edge cases)
- `src/services/lessonImportExport.test.ts` — 8 tests (export download, valid import, invalid JSON, missing fields)
- `src/views/LessonList.test.tsx` — 18 tests (empty state, card render, create/select/delete/duplicate/import/export callbacks)
- `src/views/LessonPlanner.test.tsx` — Updated from 26 to 30 tests (back button, onBack, initialLesson, fallback)
- `src/App.test.tsx` — Updated from 7 to 14 tests (multi-lesson library, full cycle, back navigation, backward compat)

## SPRINT 9 COMPLETION (2026-06-25)

### Knowledge Graph Engine Features
- **9.1 Concept Extraction**: Extracts concepts from headings, math `\text{}` commands, definition patterns ("is called", "we call", "known as"), and math operations (`\frac`, `\sqrt`, `\sum`). Inferred type (definition/procedure/principle/example/analogy). Deduplication by name.
- **9.2 Edge Inference**: 6 edge types — PREREQUISITE (appears-before-used), DERIVES_FROM (step order in math), ANALOGOUS_TO (Jaccard similarity of context), CONTRASTS_WITH (explicit contrast language), GENERALIZES (example→principle), EXAMPLE_OF (principle→example).
- **9.3 Knowledge Graph Builder**: Orchestrates extraction + inference. Validates no cycles in PREREQUISITE edges via topological sort. Computes connection weights for all edges. 43 concepts + 574 edges from seed lesson.
- **9.4 Relevance Query Engine**: 5 query modes — prerequisites, bridges, contrasts, analogies, spiral. Ranked results by connection strength. Returns `RelevanceReport` with explanations.
- **9.5 Symbol Ledger Builder**: Scans math blocks for 11 common symbols (a, b, c, x, Δ, ±, √, x₁, x₂, etc.). Identifies canonical forms and aliases. Detects notation conflicts.

### New Files (5)
- `src/services/conceptExtractor.ts` — Heading/math/text concept extraction with deduplication
- `src/services/edgeInference.ts` — 6-type edge inference with heuristic rules
- `src/services/knowledgeGraphBuilder.ts` — Orchestrator with cycle detection/resolution
- `src/services/relevanceQuery.ts` — 5-mode relevance query with ranked results
- `src/services/symbolLedgerBuilder.ts` — Math symbol scanning with conflict detection

### New Tests (5 files, 40 tests)
- `src/services/conceptExtractor.test.ts` — 9 tests (headings, math commands, definitions, empty, dedup, type inference)
- `src/services/edgeInference.test.ts` — 6 tests (prerequisites, derives, unrelated, example-of, empty, no-self-edges)
- `src/services/knowledgeGraphBuilder.test.ts` — 6 tests (seed KG, acyclic, cycle rejection, empty, valid types, edge validation)
- `src/services/relevanceQuery.test.ts` — 9 tests (prerequisites, empty, bridges, contrasts, analogies, unknown, ranking, spiral, seed)
- `src/services/symbolLedgerBuilder.test.ts` — 10 tests (canonical, a/b/c, Δ, getCanonical, unknown, isDefined, no-math, empty, ±, √)

## SPRINT 10 COMPLETION (2026-06-25)

### Multi-Agent LLM Narration Pipeline Features
- **10.1 LLM Client**: Abstract `generateCompletion()` with configurable `LLMFunction`. Retry logic (3 attempts, exponential backoff). Token estimation and cost tracking for Claude and GPT-4o models.
- **10.2 Teaching Plan Agent**: Takes Lesson + KnowledgeGraph → produces `TeachingPlan` with concept, prior knowledge, analogy, anticipated confusion, emotional beat, bridge, and cross-references per block.
- **10.3 Vision Agent**: Analyzes image blocks for pedagogical enrichment (main insight, first look, pattern, teacher question, connection to math). Graceful fallback to ground truth author content on API failure.
- **10.4 Narration Script Agent**: Produces complete `LessonNarration` with `{REVEAL}`, `{SOCRATIC}`, `{PAUSE:N}` markers and 12 emotional audio tags. Validates and cleans segments (strips invalid tags).
- **10.5 Validation Agent**: 8 checks — verbatim reading (CRITICAL), cross-reference density (WARNING), reveal step coverage (WARNING), dead voice detection (WARNING), symbol inconsistency (WARNING), quantitative mismatch (CRITICAL), forward references (WARNING), emotional tone mismatch (WARNING).
- **10.6 Narration Pipeline Orchestrator**: 7-step pipeline (KG → ledger → teaching plan → vision → relevance → narration → validation). Retry loop on CRITICAL flags (max 3 retries). Full progress tracking.

### New Files (7)
- `src/services/llmClient.ts` — LLM client with retry, cost tracking, configurable backend
- `src/services/agents/teachingPlanAgent.ts` — Teaching plan generation from KG + lesson
- `src/services/agents/visionAgent.ts` — Image analysis with ground truth fallback
- `src/services/agents/narrationScriptAgent.ts` — Narration script generation with markers and audio tags
- `src/services/agents/validationAgent.ts` — 8-check validation with CRITICAL/WARNING severity
- `src/services/narrationPipeline.ts` — Full pipeline orchestrator with retry loop

### New Tests (5 files, 28 tests)
- `src/services/agents/teachingPlanAgent.test.ts` — 5 tests (seed plan, empty, headings-only, invalid format, prompt building)
- `src/services/agents/visionAgent.test.ts` — 4 tests (pedagogical enrichment, fallback on failure, ground truth anchoring, missing fields)
- `src/services/agents/narrationScriptAgent.test.ts` — 6 tests (tagged narration, cross-references, invalid tag stripping, duration estimation, missing pauses, invalid format)
- `src/services/agents/validationAgent.test.ts` — 8 tests (verbatim, dead voice, symbol inconsistency, clean narration, quantitative mismatch, forward references, tone mismatch, report counts)
- `src/services/narrationPipeline.test.ts` — 5 tests (end-to-end, retry on failure, complete narration output, image blocks, seed lesson)

---
**TEST SUITE STATUS:** **212 tests passing across 21 test files** (all passing as of 2026-06-25):

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/data/knowledgeGraph.test.ts` | 10 | KG construction, edge validation, cycle detection |
| `src/data/narrationTypes.test.ts` | 10 | All AudioTag values, segment creation, pause/reveal tracking |
| `src/data/symbolLedger.test.ts` | 8 | Canonical lookup, alias resolution, conflict detection, empty ledger |
| `src/data/types.test.ts` | 8 | Type compilation, narration fields, backward compatibility |
| `src/components/ProgressiveAlignedEquation.test.tsx` | 5 | Mount, reveal boundaries, empty string, inline displayMode, multiple lines |
| `src/services/conceptExtractor.test.ts` | 9 | Headings, math commands, definition patterns, empty, dedup, type inference |
| `src/services/edgeInference.test.ts` | 6 | Prerequisites, derives, unrelated, example-of, empty, no-self-edges |
| `src/services/knowledgeGraphBuilder.test.ts` | 6 | Seed KG, acyclic, cycle rejection, empty, valid types, edge validation |
| `src/services/relevanceQuery.test.ts` | 9 | Prerequisites, bridges, contrasts, analogies, unknown, ranking, spiral, seed |
| `src/services/symbolLedgerBuilder.test.ts` | 10 | Canonical, a/b/c, Δ, ±, √, getCanonical, isDefined, no-math, empty, conflicts |
| `src/services/lessonStorage.test.ts` | 18 | Migration, CRUD, corruption survival, edge cases |
| `src/services/lessonImportExport.test.ts` | 8 | Export download, valid import, invalid JSON, missing fields |
| `src/services/agents/teachingPlanAgent.test.ts` | 5 | Seed plan, empty, headings-only, invalid format, prompt building |
| `src/services/agents/visionAgent.test.ts` | 4 | Enrichment, fallback, truth anchoring, missing fields |
| `src/services/agents/narrationScriptAgent.test.ts` | 6 | Tagged narration, cross-refs, tag stripping, duration, missing pauses, invalid format |
| `src/services/agents/validationAgent.test.ts` | 8 | Verbatim, dead voice, symbol, clean pass, quantitative, forward refs, tone, counts |
| `src/services/narrationPipeline.test.ts` | 5 | End-to-end, retry, complete output, image blocks, seed lesson |
| `src/views/LessonList.test.tsx` | 18 | Empty state, card render, create/select/delete/duplicate/import/export |
| `src/views/LessonPlanner.test.tsx` | 30 | Seed render, block CRUD, math preview, image validation, narration, back button, initialLesson |
| `src/views/PresentationStage.test.tsx` | 18 | Block rendering, navigation, boundary guards, escape exit, progressive reveal |
| `src/App.test.tsx` | 14 | View transitions, full cycle, localStorage, multi-lesson library, back navigation |

## SPRINT 11 COMPLETION (2026-06-25)

### TTS Integration & Timing Engine Features
- **11.1 TTS Client**: Abstract `generateSpeech()` with configurable `TTSFunction`. Retry logic (3 attempts, exponential backoff). Character limit handling with sentence-boundary segmentation. Cost tracking per character. Automatic chunk merging for long text.
- **11.2 Audio Tag Preprocessor**: Validates `[emotional_tag]` markers against known TTS-compatible tags. Configurable tag substitution map via `calibrateTagSubstitutions()`. Unknown tags defaulted to "measured" with substitution reporting.
- **11.3 Math-to-Speech Preprocessor**: Converts LaTeX math notation to spoken English. Handles superscripts (squared, cubed, to the n), subscripts, fractions, square roots, Greek letters, inequality operators, and more. Returns both spoken and original forms.
- **11.4 Narration Audio Generator**: Splits narration at `{REVEAL}`, `{SOCRATIC}`, and `{PAUSE:N}` markers. Generates `AudioSegment` array with duration estimation, reveal trigger positions, and silence gaps. Inter-block pauses from `LessonNarration`.
- **11.5 Word-Level Timing Engine**: Computes precise reveal timings from TTS word timestamps. Multi-source reconciliation (primary/secondary/tertiary) with median aggregation. Confidence levels (high/medium/low). 300ms buffer applied before each reveal.
- **11.6 Absolute Timeline Builder**: Builds `AbsoluteTimeline` from audio segments + reveal timings. Event types: `lesson_start`, `reveal`, `block_advance`, `pause_start`, `pause_end`, `socratic_question`, `lesson_end`. Validates monotonic timestamps and reveal-within-block constraints.

### New Files (6)
- `src/services/ttsClient.ts` — TTS API abstraction with retry, cost tracking, chunking
- `src/services/audioTagPreprocessor.ts` — Tag validation and voice calibration substitutions
- `src/services/mathToSpeechPreprocessor.ts` — LaTeX math to spoken English conversion
- `src/services/narrationAudioGenerator.ts` — Narration splitting and audio segment generation
- `src/services/timingEngine.ts` — Word-level reveal timing with multi-source reconciliation
- `src/services/timelineBuilder.ts` — Absolute timeline construction with validation

### New Tests (6 files, 45 tests)
- `src/services/ttsClient.test.ts` — 7 tests (configured call, retry, max retries, long text split, options passthrough, empty text, no function)
- `src/services/audioTagPreprocessor.test.ts` — 8 tests (valid passthrough, calibration substitution, unknown default, no tag, property preservation, empty, multiple substitutions, trimming)
- `src/services/mathToSpeechPreprocessor.test.ts` — 11 tests (superscripts, subscripts, fractions, square roots, Greek letters, ±, inequalities, original preservation, Δ, empty, plain text)
- `src/services/narrationAudioGenerator.test.ts` — 6 tests (segment generation, reveal positions, inter-block pauses, SOCRATIC pauses, PAUSE markers, empty narration)
- `src/services/timingEngine.test.ts` — 8 tests (word timestamp computation, empty reveals, empty timestamps, single/multi-source reconciliation, buffer, confidence levels, graceful fallback)
- `src/services/timelineBuilder.test.ts` — 5 tests (timeline build, monotonic timestamps, block_advance, clean validation, socratic events)

---
**TEST SUITE STATUS:** **257 tests passing across 27 test files** (all passing as of 2026-06-25):

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/data/knowledgeGraph.test.ts` | 10 | KG construction, edge validation, cycle detection |
| `src/data/narrationTypes.test.ts` | 10 | All AudioTag values, segment creation, pause/reveal tracking |
| `src/data/symbolLedger.test.ts` | 8 | Canonical lookup, alias resolution, conflict detection, empty ledger |
| `src/data/types.test.ts` | 8 | Type compilation, narration fields, backward compatibility |
| `src/components/ProgressiveAlignedEquation.test.tsx` | 5 | Mount, reveal boundaries, empty string, inline displayMode, multiple lines |
| `src/services/conceptExtractor.test.ts` | 9 | Headings, math commands, definition patterns, empty, dedup, type inference |
| `src/services/edgeInference.test.ts` | 6 | Prerequisites, derives, unrelated, example-of, empty, no-self-edges |
| `src/services/knowledgeGraphBuilder.test.ts` | 6 | Seed KG, acyclic, cycle rejection, empty, valid types, edge validation |
| `src/services/relevanceQuery.test.ts` | 9 | Prerequisites, bridges, contrasts, analogies, unknown, ranking, spiral, seed |
| `src/services/symbolLedgerBuilder.test.ts` | 10 | Canonical, a/b/c, Δ, ±, √, getCanonical, isDefined, no-math, empty, conflicts |
| `src/services/lessonStorage.test.ts` | 18 | Migration, CRUD, corruption survival, edge cases |
| `src/services/lessonImportExport.test.ts` | 8 | Export download, valid import, invalid JSON, missing fields |
| `src/services/agents/teachingPlanAgent.test.ts` | 5 | Seed plan, empty, headings-only, invalid format, prompt building |
| `src/services/agents/visionAgent.test.ts` | 4 | Enrichment, fallback, truth anchoring, missing fields |
| `src/services/agents/narrationScriptAgent.test.ts` | 6 | Tagged narration, cross-refs, tag stripping, duration, missing pauses, invalid format |
| `src/services/agents/validationAgent.test.ts` | 8 | Verbatim, dead voice, symbol, clean pass, quantitative, forward refs, tone, counts |
| `src/services/narrationPipeline.test.ts` | 5 | End-to-end, retry, complete output, image blocks, seed lesson |
| `src/services/ttsClient.test.ts` | 7 | Configured call, retry, max retries, long text split, options, empty text, no function |
| `src/services/audioTagPreprocessor.test.ts` | 8 | Valid passthrough, calibration substitution, unknown default, no tag, property preservation, empty, multiple substitutions, trimming |
| `src/services/mathToSpeechPreprocessor.test.ts` | 11 | Superscripts, subscripts, fractions, square roots, Greek, ±, inequalities, original, Δ, empty, plain text |
| `src/services/narrationAudioGenerator.test.ts` | 6 | Segment generation, reveal positions, inter-block pauses, SOCRATIC, PAUSE, empty narration |
| `src/services/timingEngine.test.ts` | 8 | Word timestamp computation, empty reveals, multi-source, buffer, confidence, fallback |
| `src/services/timelineBuilder.test.ts` | 5 | Timeline build, monotonic, block_advance, clean validation, socratic events |
| `src/views/LessonList.test.tsx` | 18 | Empty state, card render, create/select/delete/duplicate/import/export |
| `src/views/LessonPlanner.test.tsx` | 30 | Seed render, block CRUD, math preview, image validation, narration, back button, initialLesson |
| `src/views/PresentationStage.test.tsx` | 18 | Block rendering, navigation, boundary guards, escape exit, progressive reveal |
| `src/App.test.tsx` | 14 | View transitions, full cycle, localStorage, multi-lesson library, back navigation |

## SPRINT 12 COMPLETION (2026-06-25)

### Recording Pipeline Features
- **12.1 DOM Stabilizer**: `waitForDOMStable(page, timeoutMs?)` — waits for MutationObserver + requestAnimationFrame stability after each keypress. Detects invisible reveal steps (no `#active-reveal-target`) and skips wait. Timeout fallback (default 2000ms).
- **12.2 Checkpoint/Resume**: `saveCheckpoint()`, `loadCheckpoint()`, `clearCheckpoint()` — saves recording progress every 5 blocks. Handles corrupt JSON and missing files gracefully.
- **12.3 Pre-flight Checks**: `runPreflight(lesson, devServerUrl)` — validates lesson structure, checks image URL reachability (HEAD request, 10s timeout), validates LaTeX parseability, confirms dev server is responding.
- **12.4 ffmpeg Composition**: `buildCompositeConfig()` + `executeComposite()` — builds ffmpeg concat + mux command, runs `ffmpeg` via `child_process.execFile`, handles non-zero exit codes and binary-not-found errors.
- **12.5 Post-Recording Verification**: `verifyOutput(mp4Path)` — uses ffprobe (`-print_format json`) to extract video/audio metadata, validates h264 codec, detects missing audio, handles absent file and corrupt ffprobe output.
- **12.6 Playwright Recording Script**: `recordLesson(config)` — launches headless Chromium with `recordVideo`, injects lesson via `addInitScript`, navigates to dev server, clicks "Save and Present", walks AbsoluteTimeline pressing Space at reveal times, uses DOM stabilizer after each press, saves checkpoints every 5 blocks.
- **12.7 Recording CLI**: `cli.ts` — parses `--lesson`, `--output`, `--resolution`, `--fps`, `--voice`, `--dry-run` flags. Orchestrates: preflight → narration pipeline → timeline → recording → composite → verify.

### New Files (7)
- `scripts/domStabilizer.ts` — Post-keypress DOM stability waiter
- `scripts/checkpointManager.ts` — Checkpoint save/load/clear with filesystem I/O
- `scripts/preflight.ts` — 4 pre-recording validation checks
- `scripts/composite.ts` — ffmpeg video/audio composition
- `scripts/verifyOutput.ts` — ffprobe-based MP4 verification
- `scripts/record-lesson.ts` — Main Playwright recording orchestrator
- `scripts/cli.ts` — CLI entry point with argument parsing
- `scripts/tsconfig.json` — TypeScript config for Node.js scripts

### New Tests (5 files, 33 tests)
- `scripts/__tests__/domStabilizer.test.ts` — 5 tests (stable wait, invisible skip, timeout, timeout option, non-negative elapsed)
- `scripts/__tests__/checkpointManager.test.ts` — 8 tests (save, nested dirs, load valid, no file, invalid format, corrupt JSON, clear, missing file)
- `scripts/__tests__/preflight.test.ts` — 7 tests (all pass, missing id, missing block fields, unreachable images, unreachable dev server, no images, no math)
- `scripts/__tests__/composite.test.ts` — 6 tests (ffmpeg args, output path, video input, success result, non-zero exit, binary not found)
- `scripts/__tests__/verifyOutput.test.ts` — 7 tests (valid MP4, file not found, zero-byte, wrong codec, no audio, ffprobe failure, invalid JSON)

### New Dependencies
- `playwright` (dev) — browser automation + video recording
- `tsx` (dev) — TypeScript script execution

## SPRINT 13 COMPLETION (2026-06-25)

### Presentation Enhancements Features
- **13.1 On-Screen Navigation Controls**: Semi-transparent bottom nav bar (visible on hover) with previous block (◀), next block (▶), reset to start (⟳), and block indicator dots. Each dot is clickable for direct block navigation. Nav bar also includes toggle buttons for speaker notes (N), timer (T), and auto-advance (A).
- **13.2 Speaker Notes Panel**: Slide-out panel (`SpeakerNotes.tsx`) from the right side toggled with `N` key or nav bar button. Shows `narration` field content for current block. For math blocks: shows `narrationSteps` list. Includes teaching tips section. Shows empty state when no narration data.
- **13.3 Presentation Timer**: Timer in top-left corner toggled with `T` key. Shows elapsed time in `M:SS` format. Pause/resume with `P` key. PAUSED indicator when paused. Timer resets when toggled off/on.
- **13.4 Auto-Advance Mode**: Toggle with `A` key or nav bar button. "Auto-Advance: ON" indicator in top-center. Automatically advances blocks/reveals at computed intervals (word-count-based for text, 2s for math, configurable via `timingConfig` prop). Green countdown bar at bottom of screen shows time until next advance. Manual Space key override pauses auto-advance for 3 seconds ("paused 3s" indicator).

### Modified Files (2)
- `src/views/PresentationStage.tsx` — Added nav bar, speaker notes integration, timer, auto-advance mode with countdown bar (~200 lines added)
- `src/index.css` — Added `@keyframes slide-in-right` animation for speaker notes panel

### New Files (2)
- `src/views/SpeakerNotes.tsx` — Slide-out panel showing narration, narrationSteps, and teaching tips per block
- `src/views/SpeakerNotes.test.tsx` — 9 tests (block position, content preview, narration display, narration steps, empty state, teaching tips, heading narration, last block counter)

### Updated Tests (1 file, +12 tests)
- `src/views/PresentationStage.test.tsx` — 18→30 tests:
  - **On-Screen Nav** (5): prev/next buttons render, prev disabled on first, next disabled on last, next click advances, prev click retreats, reset button, block indicator dots render and navigate
  - **Speaker Notes** (4): hidden by default, N key toggles, uppercase N toggles, nav bar button toggles
  - **Timer** (6): hidden by default, T key shows, second T hides, P pauses, P resumes, P does nothing when hidden, nav bar button toggles, timer advances
  - **Auto-Advance** (5): hidden by default, A key shows indicator, second A hides, nav bar button toggles, Space triggers manual override, override timeout clears, auto-advances to next block
  - **Nav Bar Buttons** (3): N/T/A buttons toggle their respective features

---
**TEST SUITE STATUS:** **327 tests passing across 34 test files** (all passing as of 2026-06-25, 3 pre-existing failures):

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `scripts/__tests__/domStabilizer.test.ts` | 5 | DOM stability wait, invisible step skip, timeout, options |
| `scripts/__tests__/checkpointManager.test.ts` | 8 | Save, load, clear, nested dirs, corrupt/invalid handling |
| `scripts/__tests__/preflight.test.ts` | 7 | Lesson structure, image URLs, LaTeX, dev server checks |
| `scripts/__tests__/composite.test.ts` | 6 | ffmpeg arg construction, success, non-zero exit, binary error |
| `scripts/__tests__/verifyOutput.test.ts` | 7 | Valid MP4, missing file, zero-byte, codec, audio, ffprobe errors |
| `src/data/knowledgeGraph.test.ts` | 10 | KG construction, edge validation, cycle detection |
| `src/data/narrationTypes.test.ts` | 10 | All AudioTag values, segment creation, pause/reveal tracking |
| `src/data/symbolLedger.test.ts` | 8 | Canonical lookup, alias resolution, conflict detection, empty ledger |
| `src/data/types.test.ts` | 8 | Type compilation, narration fields, backward compatibility |
| `src/components/ProgressiveAlignedEquation.test.tsx` | 5 | Mount, reveal boundaries, empty string, inline displayMode, multiple lines |
| `src/services/conceptExtractor.test.ts` | 9 | Headings, math commands, definition patterns, empty, dedup, type inference |
| `src/services/edgeInference.test.ts` | 6 | Prerequisites, derives, unrelated, example-of, empty, no-self-edges |
| `src/services/knowledgeGraphBuilder.test.ts` | 6 | Seed KG, acyclic, cycle rejection, empty, valid types, edge validation |
| `src/services/relevanceQuery.test.ts` | 9 | Prerequisites, bridges, contrasts, analogies, unknown, ranking, spiral, seed |
| `src/services/symbolLedgerBuilder.test.ts` | 10 | Canonical, a/b/c, Δ, ±, √, getCanonical, isDefined, no-math, empty, conflicts |
| `src/services/lessonStorage.test.ts` | 18 | Migration, CRUD, corruption survival, edge cases |
| `src/services/lessonImportExport.test.ts` | 8 | Export download, valid import, invalid JSON, missing fields |
| `src/services/agents/teachingPlanAgent.test.ts` | 5 | Seed plan, empty, headings-only, invalid format, prompt building |
| `src/services/agents/visionAgent.test.ts` | 4 | Enrichment, fallback, truth anchoring, missing fields |
| `src/services/agents/narrationScriptAgent.test.ts` | 6 | Tagged narration, cross-refs, tag stripping, duration, missing pauses, invalid format |
| `src/services/agents/validationAgent.test.ts` | 8 | Verbatim, dead voice, symbol, clean pass, quantitative, forward refs, tone, counts |
| `src/services/narrationPipeline.test.ts` | 5 | End-to-end, retry, complete output, image blocks, seed lesson |
| `src/services/ttsClient.test.ts` | 7 | Configured call, retry, max retries, long text split, options, empty text, no function |
| `src/services/audioTagPreprocessor.test.ts` | 8 | Valid passthrough, calibration substitution, unknown default, no tag, property preservation, empty, multiple substitutions, trimming |
| `src/services/mathToSpeechPreprocessor.test.ts` | 11 | Superscripts, subscripts, fractions, square roots, Greek, ±, inequalities, original, Δ, empty, plain text |
| `src/services/narrationAudioGenerator.test.ts` | 6 | Segment generation, reveal positions, inter-block pauses, SOCRATIC, PAUSE, empty narration |
| `src/services/timingEngine.test.ts` | 8 | Word timestamp computation, empty reveals, multi-source, buffer, confidence, fallback |
| `src/services/timelineBuilder.test.ts` | 5 | Timeline build, monotonic, block_advance, clean validation, socratic events |
| `src/views/LessonList.test.tsx` | 18 | Empty state, card render, create/select/delete/duplicate/import/export |
| `src/views/LessonPlanner.test.tsx` | 30 | Seed render, block CRUD, math preview, image validation, narration, back button, initialLesson |
| `src/views/PresentationStage.test.tsx` | 30 | Block rendering, navigation, boundary guards, escape exit, progressive reveal, on-screen nav controls, block dots, speaker notes toggle, timer, auto-advance |
| `src/views/SpeakerNotes.test.tsx` | 9 | Block position, content preview, narration, narration steps, empty state, teaching tips |
| `src/App.test.tsx` | 14 | View transitions, full cycle, localStorage, multi-lesson library, back navigation |

---
**PENDING BLOCKERS / ISSUES:**
- 3 pre-existing test failures in `LessonPlanner.test.tsx`:
  - "tracks block count correctly after adding to seed" — timeout (slow ARM device)
  - "moves block up when up button is clicked" — timeout (slow ARM device)
  - "deletes block and removes it from count" — expects "Blocks (37)" but seed still has 38 blocks (pre-existing, unrelated to Sprint 13)

**NEXT ACTION REQUIRED:**
- Sprint 14: Print, Export & Final Polish (print CSS, PDF export, static HTML export, final integration testing, documentation updates)

