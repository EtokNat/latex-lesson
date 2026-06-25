# PROJECT ROADMAP: MATH PRESENTATION STUDIO

## COMPLETED SPRINTS

### SPRINT 1: Foundation & Types ✅
- **Goal:** Initialize Vite + React + TS, setup Vitest/Tailwind, and define core types.
- **Tasks:**
  1. Initialize standard Vite app. Install `tailwindcss`, `katex`, `vitest`, `@testing-library/react`, `jsdom`. Update config.
  2. Create `src/data/types.ts`: `BlockType` ("heading"|"text"|"image"|"math"), `LessonBlock` (id, type, content, imageUrl?), and `Lesson` (id, title, blocks).
  3. Write `src/data/types.test.ts` to verify compilation.
- **Tests:** 3 passing (type definitions)

### SPRINT 2: The Math Engine Integration ✅
- **Goal:** Implement the progressive reveal engine using the provided seed code.
- **Tasks:**
  1. Read the exact custom AST parser code from `SEED_ENGINE.txt` located in the root directory.
  2. Create `src/components/ProgressiveAlignedEquation.tsx` and copy the entire contents of `SEED_ENGINE.txt` into it exactly as written.
  3. Complete the React component at the bottom of the file: Ensure `ProgressiveAlignedEquation` accepts `equationString` (string) and `revealCount` (number) as props.
  4. Inside the component, use `useMemo` to parse the equation and `renderNodes()`, then render the output into a container using `katex.renderToString` with `{ trust: true }`. Add aggressive console logs.
  5. Write `src/components/ProgressiveAlignedEquation.test.tsx` ensuring it mounts cleanly without breaking the imported parser.
- **Tests:** 5 passing (mount, reveal boundary, empty string, inline displayMode, output change)

### SPRINT 3: The Lesson Planner ✅
- **Goal:** Build the authoring interface with defensive state management.
- **Tasks:**
  1. Create `src/views/LessonPlanner.tsx`. Manage state array of `LessonBlock` items.
  2. Add Tailwind buttons to create different blocks. Form inputs for content/imageUrl.
  3. Add a "Save and Present" button that safely stringifies and saves to `localStorage('saved_lesson')` via try/catch, then triggers `onSaveAndPresent`.
  4. Write `src/views/LessonPlanner.test.tsx` mocking `localStorage` and testing block addition.
- **Tests:** 7 passing (render, add blocks, save flow, localStorage error survival, edit content)

### SPRINT 4: The Presentation Stage ✅
- **Goal:** Build the zero-distortion dark mode presentation viewport.
- **Tasks:**
  1. Create `src/views/PresentationStage.tsx` accepting `lesson` and `onExit` props.
  2. Track `blockIndex` and `revealCount` in state.
  3. Add global `keydown` listener: Space/ArrowRight (increment reveal/block), Backspace/ArrowLeft (decrement). Use try/catch and boundary limits.
  4. Render the active block (Text, Image, or the Math component). Style with `bg-gray-950` and white text.
  5. Write `src/views/PresentationStage.test.tsx` testing keyboard navigation state changes.
- **Tests:** 18 passing (all 4 block types, empty lesson, forward/backward nav, boundary guards, escape, reveal inc/dec, block counter, exit button)

### SPRINT 5: App Orchestration & Styling ✅
- **Goal:** Tie the router together and apply the chalkboard animations.
- **Tasks:**
  1. Update `src/App.tsx`. Read `localStorage('saved_lesson')` on mount inside try/catch. Route between `<LessonPlanner>` and `<PresentationStage>`.
  2. Add the Chalkboard CSS `@keyframes` and `#active-reveal-target` ID styling to `src/index.css`.
  3. Write `src/App.test.tsx` testing conditional routing.
- **Tests:** 7 passing (planner→presentation, exit, full cycle, corrupted localStorage, missing key, valid pre-load)

### POST-SPRINT 5 HARDENING ✅
- **Bug 1:** Blank page — missing `tailwind.config.js` + `verbatimModuleSyntax` violation
- **Bug 2:** Red text in math — missing KaTeX CSS + missing `text-white` class
- **Bug 3:** Line separator regression — `\\` restored to `\\[1.5em]`
- **Seed Lesson:** 38-block quadratic equations lesson added as SEED_LESSON constant
- **Tests:** 43 total, all passing

---

## SPRINT 6: Type System Extension & Narration Data Model

**Goal:** Extend the type system to support narration, knowledge graphs, and the AI pipeline data structures. This is pure data modeling — no AI integration yet.

**Dependencies:** Sprint 5 (all types defined, app routing works)

### Tasks

#### 6.1 Extend LessonBlock with Narration Fields
- **File:** `src/data/types.ts`
- Add `narration?: string` — spoken text for headings, text, and image blocks
- Add `narrationSteps?: string[]` — per-reveal-step spoken text for math blocks
- These fields are optional (backward compatible with existing lessons)

#### 6.2 Create Knowledge Graph Types
- **File:** `src/data/knowledgeGraph.ts`
- Define `ConceptNode` interface:
  - `id: string`, `name: string`, `type: 'definition' | 'procedure' | 'principle' | 'example' | 'analogy'`
  - `introducedAt: number` (block index), `lastReferencedAt: number`
  - `representations: { symbolic?: string, visual?: string, verbal?: string, numerical?: string }`
  - `commonMisconceptions: string[]`
- Define `GraphEdge` interface:
  - `from: string`, `to: string` (concept IDs)
  - `type: 'PREREQUISITE' | 'DERIVES_FROM' | 'ANALOGOUS_TO' | 'CONTRASTS_WITH' | 'GENERALIZES' | 'EXAMPLE_OF'`
  - `weight: number`, `explanation: string`
- Define `KnowledgeGraph` interface:
  - `concepts: Map<string, ConceptNode>`
  - `edges: GraphEdge[]`

#### 6.3 Create Narration Script Types
- **File:** `src/data/narrationTypes.ts`
- Define `AudioTag` type: `'excited' | 'warmly' | 'measured' | 'encouraging' | 'authoritatively' | 'calm' | 'curious' | 'bright' | 'patiently' | 'reassuring' | 'seriously' | 'firmly'`
- Define `NarrationSegment` interface:
  - `text: string` — the spoken words (with math preprocessed for TTS)
  - `audioTag?: AudioTag` — emotional direction
  - `revealTrigger?: boolean` — whether a Space keypress happens at this point
  - `pauseAfterMs?: number` — pause duration after speaking
  - `socraticPause?: number` — pause for learner to think
- Define `BlockNarration` interface:
  - `blockId: string`
  - `segments: NarrationSegment[]`
  - `totalDurationMs: number` (estimated from word count)
- Define `LessonNarration` interface:
  - `lessonId: string`
  - `blockNarrations: BlockNarration[]`
  - `interBlockPausesMs: number[]`

#### 6.4 Create Symbol Ledger Types
- **File:** `src/data/symbolLedger.ts`
- Define `SymbolEntry` interface:
  - `canonicalForm: string` — the definitive notation (e.g., `"x₁, x₂"`)
  - `aliases: string[]` — alternative notations
  - `meaning: string` — plain English description
  - `introducedAtBlock: number`
- Define `SymbolLedger` interface:
  - `symbols: Map<string, SymbolEntry>`
  - `getCanonical(alias: string): string`
  - `isDefined(form: string): boolean`

#### 6.5 Write Tests
- **File:** `src/data/knowledgeGraph.test.ts` — verify KG construction, edge validation, cycle detection
- **File:** `src/data/narrationTypes.test.ts` — verify type compilation, segment validation
- **File:** `src/data/symbolLedger.test.ts` — verify canonical lookup, alias resolution
- **File:** `src/data/types.test.ts` — update to verify new optional narration fields

**Acceptance Criteria:**
- All new types compile without errors
- Backward compatible: existing seed lesson loads without modification
- New test files pass: `npx vitest run --run`
- All 43 existing tests still pass

---

## SPRINT 7: Lesson Editor Hardening

**Goal:** Complete the lesson authoring experience with block management, preview, and validation.

**Dependencies:** Sprint 6 (narration fields exist on LessonBlock type)

### Tasks

#### 7.1 Block Deletion
- **File:** `src/views/LessonPlanner.tsx`
- Add delete button (✕ or trash icon) to each block card
- On click: show confirmation prompt ("Delete this block?")
- On confirm: remove block from state array
- Update block count label
- Console log: `[LessonPlanner] Deleted block: {id}`

#### 7.2 Block Reordering
- **File:** `src/views/LessonPlanner.tsx`
- Add ⬆ ⬇ buttons to each block card
- Up button: swap with previous block (disabled on first block)
- Down button: swap with next block (disabled on last block)
- Console log: `[LessonPlanner] Moved block: {id} direction: up/down`

#### 7.3 Block Duplication
- **File:** `src/views/LessonPlanner.tsx`
- Add duplicate button to each block card
- Creates a copy with new ID immediately after the original
- Console log: `[LessonPlanner] Duplicated block: {id} -> {newId}`

#### 7.4 Math Block LaTeX Preview
- **File:** `src/views/LessonPlanner.tsx`
- When editing a math block, render a live KaTeX preview below the input
- Use `katex.renderToString` with `throwOnError: false`
- Wrap in try/catch — show "Invalid LaTeX" message on error
- Debounce rendering (300ms) to avoid excessive re-renders during typing
- Style preview: bg-gray-100 rounded p-3, smaller font

#### 7.5 Image URL Pre-flight Validation
- **File:** `src/views/LessonPlanner.tsx`
- When an image URL is entered, show a status indicator:
  - Gray spinner: checking URL
  - Green checkmark: URL reachable (HEAD request succeeded)
  - Red X: URL unreachable (HEAD request failed)
- Use `fetch(url, { method: 'HEAD' })` with 5-second timeout
- Debounce check (500ms after user stops typing)
- Console log: `[LessonPlanner] Image URL check: {url} -> {status}`

#### 7.6 Narration Field Editing
- **File:** `src/views/LessonPlanner.tsx`
- For each block, add an expandable "Narration" section (collapsed by default)
- Textarea for `narration` field (headings, text, images)
- For math blocks: show `narrationSteps` as a list of textareas, with "Add Step" button
- Each step maps to a group of progressive reveals
- Console log: `[LessonPlanner] Updated narration for block: {id}`

#### 7.7 Write Tests
- **File:** `src/views/LessonPlanner.test.tsx`
  - Delete block removes it from count
  - Delete block confirmation appears
  - Up button moves block earlier in list
  - Down button moves block later in list
  - Up button disabled on first block
  - Down button disabled on last block
  - Duplicate creates copy with new ID
  - Math preview renders valid LaTeX
  - Math preview shows error for invalid LaTeX
  - Narration textarea appears in expanded section
  - Math block narrationSteps shows multiple inputs

**Acceptance Criteria:**
- All block CRUD operations work (create, read, update, delete, reorder, duplicate)
- LaTeX preview updates as user types
- Image URL validation shows correct status
- Narration fields editable and persisted through save
- All tests pass: `npx vitest run --run`

---

## SPRINT 8: Multi-Lesson Management

**Goal:** Allow users to create, manage, and switch between multiple saved lessons.

**Dependencies:** Sprint 7 (editor is solid, ready for lesson management)

### Tasks

#### 8.1 Lesson Storage Restructure
- **File:** `src/services/lessonStorage.ts`
- Replace single `localStorage('saved_lesson')` with `localStorage('lesson_library')` storing `LessonLibrary`
- `LessonLibrary` interface: `{ lessons: Lesson[], activeLessonId: string }`
- Migration function: on first load, if old `saved_lesson` key exists, migrate to `lesson_library`
- Defensive reads with try/catch, fallback to seed lesson library
- Console log all storage operations

#### 8.2 Lesson List View
- **File:** `src/views/LessonList.tsx`
- Grid/list of lesson cards showing: title, block count, last modified date
- "Create New Lesson" button (prompts for title)
- Click on lesson card → load into planner
- "Duplicate" and "Delete" actions per lesson card
- Empty state: "No saved lessons. Create one to get started."

#### 8.3 Lesson Import/Export
- **File:** `src/services/lessonImportExport.ts`
- Export: serialize lesson to JSON → trigger browser download via `Blob` + `URL.createObjectURL`
- Import: file input → read as text → JSON.parse → validate against Lesson type → add to library
- Validation: check required fields (id, title, blocks), warn on missing optional fields
- Defensive try/catch around JSON.parse — show error message on invalid file
- Console log: `[ImportExport] Exported lesson: {title}` / `Imported lesson: {title}`

#### 8.4 Update App Router
- **File:** `src/App.tsx`
- Add third view: `"library"` (default when multiple lessons exist)
- Flow: Library → select lesson → Planner → Present → exit → Library (not Planner)
- If only one lesson: skip library, go directly to Planner (current behavior)
- Update localStorage read to use `lesson_library`

#### 8.5 Write Tests
- **File:** `src/services/lessonStorage.test.ts` — migration, CRUD, error survival
- **File:** `src/views/LessonList.test.ts` — render, select, create, delete, empty state
- **File:** `src/services/lessonImportExport.test.ts` — valid export, invalid import, missing fields
- Update `src/App.test.tsx` — library view routing, single-lesson skip

**Acceptance Criteria:**
- Multiple lessons can be created and switched between
- Old `saved_lesson` format auto-migrates on first load
- Lessons export to JSON file and import from JSON file
- Invalid import files show user-friendly error
- Library view appears when multiple lessons exist
- All tests pass: `npx vitest run --run`

---

## SPRINT 9: Knowledge Graph Engine

**Goal:** Build the engine that constructs and queries a knowledge graph from lesson content. This is the foundation for cross-referencing and pedagogical narration.

**Dependencies:** Sprint 6 (KG types defined), Sprint 8 (lesson management provides input)

### Tasks

#### 9.1 Concept Extraction Engine
- **File:** `src/services/conceptExtractor.ts`
- Accepts a `Lesson` → returns extracted concepts
- Extraction rules:
  - Every heading block → concept (section topic)
  - Every `\text{}` command in math blocks → concept reference
  - Every definition pattern ("is called", "we call", "known as") → concept
  - Every `\frac`, `\sqrt`, `\sum` command → operation concept
- Each concept gets: name, blockIndex, type inference from context
- Console log: `[ConceptExtractor] Extracted N concepts from lesson`

#### 9.2 Edge Inference Engine
- **File:** `src/services/edgeInference.ts`
- Accepts concepts + lesson blocks → returns typed edges
- Heuristic rules:
  - PREREQUISITE: concept A appears in blocks before concept B uses it
  - DERIVES_FROM: math block where concept A appears in earlier steps than concept B
  - ANALOGOUS_TO: same operation/pattern applied in different contexts
  - CONTRASTS_WITH: explicitly contrasted concepts ("unlike X, Y...")
  - GENERALIZES: specific example → general formula
  - EXAMPLE_OF: general concept → specific numeric instance
- Console log: `[EdgeInference] Inferred N edges`

#### 9.3 Knowledge Graph Builder
- **File:** `src/services/knowledgeGraphBuilder.ts`
- Orchestrates concept extraction + edge inference
- Validates graph: no cycles in PREREQUISITE edges (topological sort)
- Computes connection strength (Jaccard similarity of co-occurrence)
- Outputs complete `KnowledgeGraph` object
- Console log: `[KGBuilder] Built graph with N concepts, M edges`

#### 9.4 Relevance Query Engine
- **File:** `src/services/relevanceQuery.ts`
- For a given concept + block index → returns ranked related concepts
- Query modes:
  - `prerequisites`: concepts that must be understood first
  - `bridges`: concepts that connect this to prior knowledge
  - `contrasts`: concepts that differ in important ways
  - `analogies`: concepts with similar structure
  - `spiral`: concepts that should be revisited at this point
- Returns `RelevanceReport` with ranked suggestions + explanations
- Console log: `[RelevanceQuery] Query for concept {id} returned N results`

#### 9.5 Symbol Ledger Builder
- **File:** `src/services/symbolLedgerBuilder.ts`
- Scans all math blocks for variable/symbol definitions
- Identifies canonical forms and aliases
- Detects notation conflicts (same symbol used for different concepts)
- Outputs `SymbolLedger`
- Console log: `[SymbolLedger] Built ledger with N symbols`

#### 9.6 Write Tests
- **File:** `src/services/conceptExtractor.test.ts`
- Extracts concepts from headings
- Extracts concepts from math \text{} commands
- Extracts concepts from definition patterns
- Handles empty lesson
- Handles lesson with no math blocks
- **File:** `src/services/edgeInference.test.ts`
- Infers PREREQUISITE edges from block order
- Infers DERIVES_FROM from math step order
- Infers EXAMPLE_OF from specific→general patterns
- No edges for unrelated concepts
- **File:** `src/services/knowledgeGraphBuilder.test.ts`
- Builds complete graph from seed lesson
- Detects and rejects cycles in PREREQUISITE edges
- **File:** `src/services/relevanceQuery.test.ts`
- Returns correct prerequisites for discriminant concept
- Returns empty for first concept (no priors)
- Ranks results by connection strength
- **File:** `src/services/symbolLedgerBuilder.test.ts`
- Identifies canonical notation
- Detects notation conflicts

**Acceptance Criteria:**
- Knowledge graph built from seed lesson has meaningful concepts and edges
- Relevance query returns sensible cross-references
- Symbol ledger detects aliases and conflicts
- No circular prerequisite chains
- All tests pass: `npx vitest run --run`

---

## SPRINT 10: Multi-Agent LLM Narration Pipeline

**Goal:** Build the LLM-based narration generation system. Takes a lesson + knowledge graph → produces a complete, emotionally-tagged narration script with {REVEAL} markers and cross-references.

**Dependencies:** Sprint 9 (KG provides relevance reports), Sprint 6 (narration types defined)

### Tasks

#### 10.1 LLM Client Abstraction
- **File:** `src/services/llmClient.ts`
- Abstract interface for LLM API calls (supports Claude, GPT-4o, or any compatible API)
- `generateCompletion(systemPrompt: string, userPrompt: string, options?: { model?, maxTokens?, temperature? }): Promise<string>`
- Retry logic: 3 attempts with exponential backoff
- Rate limit handling: track tokens used, pause when approaching limits
- Cost tracking: log estimated cost per call
- Console log: `[LLMClient] Call to {model}: {promptTokens} prompt + {completionTokens} completion = ${cost}`

#### 10.2 Teaching Plan Agent
- **File:** `src/services/agents/teachingPlanAgent.ts`
- **Input:** Lesson + KnowledgeGraph
- **Prompt design (the critical artifact):**
  ```
  You are an expert math teacher with 20 years of classroom experience.
  For each block in this lesson, produce:
  1. CONCEPT: The ONE thing the learner must understand
  2. PRIOR KNOWLEDGE: What they must already know
  3. ANALOGY: An everyday analogy that makes this concrete
  4. ANTICIPATED CONFUSION: What learners will most likely get wrong
  5. EMOTIONAL BEAT: What should the learner FEEL?
     (curious, confident, challenged, relieved, excited, careful)
  6. BRIDGE: How does this connect to the NEXT block?
  7. CROSS_REFERENCES: 2-3 specific concepts from earlier in the lesson
     to reference here (from the provided knowledge graph)
  ```
- **Output:** Structured TeachingPlan object
- Console log: `[TeachingPlanAgent] Generated plan for N blocks`

#### 10.3 Vision Agent (for Image Blocks)
- **File:** `src/services/agents/visionAgent.ts`
- **Input:** Image URL + block content (ground truth) + surrounding context
- **Prompt design:**
  ```
  Analyze this educational diagram. The lesson author says:
  "{block.content}"
  
  Your task: Produce a TEACHING-ORIENTED description:
  1. MAIN INSIGHT: What does this image communicate?
  2. FIRST LOOK: Where should the student's eyes go first?
  3. PATTERN: What relationship is visible?
  4. TEACHER QUESTION: What question would a good teacher ask?
  5. CONNECTION TO MATH: How does this visual connect to the
     surrounding mathematical content?
  
  CRITICAL: The author's description is your ground truth.
  Do not contradict it. Your job is to enrich it pedagogically.
  ```
- **Output:** Structured VisionDescription object
- **Fallback:** If vision API call fails, use `block.content` as-is (ground truth anchoring)
- Console log: `[VisionAgent] Analyzed image for block {id}`

#### 10.4 Narration Script Agent
- **File:** `src/services/agents/narrationScriptAgent.ts`
- **Input:** TeachingPlan + VisionDescriptions + KnowledgeGraph + RelevanceReport + Lesson blocks
- **Prompt design (the most critical artifact in the entire system):**
  ```
  You are writing the spoken narration for a math teaching video.
  Your audience is a student seeing this material for the first time.
  
  CRITICAL RULES:
  1. NEVER read text verbatim. The student can see it. EXPLAIN it.
  2. Use natural deictic references: "Look at this term" / "Right here"
  3. Every math expression gets a WHY — not just what, but why
  4. Use the teaching plan's emotional beats to guide your tone
  5. Anticipate confusion — address it directly
  6. Vary sentence length. Short for emphasis. Long for explanation.
  7. Cross-reference 2-3 earlier concepts per block (from the KG report)
  8. Place {REVEAL} markers at natural teaching moments where
     the next piece of content should appear
  9. Use {SOCRATIC} markers for questions the learner should think about
  10. Use {PAUSE:N} markers for dramatic or thinking pauses
  
  OUTPUT FORMAT — For each block:
  ---
  BLOCK: N (type)
  AUDIO_TAGS: [tag1, tag2, ...]
  
  [emotional_tag] Narration text with {REVEAL} markers at key moments...
  {PAUSE:1.0}
  [emotional_tag] More narration...
  {REVEAL}
  {SOCRATIC: "question text"}
  {PAUSE:3.0}
  [emotional_tag] Resolution of the question...
  ---
  
  Cross-reference these concepts (from the knowledge graph):
  {relevanceReport}
  ```
- **Output:** Complete `LessonNarration` object
- Console log: `[NarrationScriptAgent] Generated narration for N blocks`

#### 10.5 Validation Agent
- **File:** `src/services/agents/validationAgent.ts`
- **Input:** NarrationScript + Lesson + KnowledgeGraph + SymbolLedger
- **Checks (from the edge case audit — 47 failure modes):**
  1. VERBATIM READING: narration repeats on-screen text → CRITICAL
  2. CROSS-REFERENCE RESOLUTION: every "remember when..." resolves to KG concept → CRITICAL
  3. QUANTITATIVE MISMATCH: "three roots" but equation has two → CRITICAL
  4. SYMBOL INCONSISTENCY: narration uses different notation than screen → CRITICAL
  5. MISSING WHY: step described but not explained → WARNING
  6. DEAD VOICE: >3 sentences with no emotional tag → WARNING
  7. CONNECTION DENSITY: <2 cross-references per concept → WARNING
  8. FORWARD REFERENCE UNRESOLVED: "we'll see this later" >3 occurrences → WARNING
  9. EMOTIONAL TONE MISMATCH: [excited] used in warning context → WARNING
  10. STEP COVERAGE: narrationSteps < 90% of reveal steps → WARNING
- **Output:** ValidationReport with pass/fail + specific violation details
- **Action:** CRITICAL flags → regenerate narration for affected blocks. WARNING flags → logged for review.
- Console log: `[ValidationAgent] Checked narration: N critical, M warnings`

#### 10.6 Narration Pipeline Orchestrator
- **File:** `src/services/narrationPipeline.ts`
- Orchestrates the full pipeline:
  1. KnowledgeGraphBuilder → KG
  2. SymbolLedgerBuilder → ledger
  3. TeachingPlanAgent → teaching plan
  4. VisionAgent (per image block) → vision descriptions
  5. RelevanceQuery (per block) → relevance reports
  6. NarrationScriptAgent → narration script
  7. ValidationAgent → validation report
  8. If CRITICAL flags → regenerate affected blocks → re-validate (max 3 retries)
- Console log: `[NarrationPipeline] Pipeline complete: N blocks narrated, M retries needed`

#### 10.7 Write Tests
- **File:** `src/services/agents/teachingPlanAgent.test.ts`
- Generates plan for seed lesson (mock LLM responses)
- Handles empty lesson
- Handles lesson with only headings
- **File:** `src/services/agents/visionAgent.test.ts`
- Enriches ground truth description (mock vision API)
- Falls back to ground truth when API fails
- Does not contradict author's ground truth
- **File:** `src/services/agents/narrationScriptAgent.test.ts`
- Generates tagged narration (mock LLM responses)
- Places {REVEAL} markers appropriately
- Includes cross-references from KG report
- **File:** `src/services/agents/validationAgent.test.ts`
- Detects verbatim reading in narration
- Detects unresolved cross-references
- Detects symbol inconsistency
- Passes clean narration without flags
- **File:** `src/services/narrationPipeline.test.ts`
- End-to-end pipeline with mocked agents
- Retries on validation failure
- Produces complete LessonNarration

**Acceptance Criteria:**
- Pipeline runs against seed lesson and produces complete narration script
- Validation catches and rejects critical violations
- All agents log their work with appropriate prefixes
- All tests pass with mocked LLM responses: `npx vitest run --run`

---

## SPRINT 11: TTS Integration & Timing Engine

**Goal:** Convert narration scripts to spoken audio and compute precise reveal timings. This is where text becomes voice.

**Dependencies:** Sprint 10 (narration script exists)

### Tasks

#### 11.1 TTS Client Abstraction
- **File:** `src/services/ttsClient.ts`
- Abstract interface for TTS API (ElevenLabs v3 primary, Speechify fallback)
- `generateSpeech(text: string, voiceId: string, options?: { stability?, similarity?, style? }): Promise<{ audioBuffer: Buffer, durationMs: number, wordTimestamps: WordTimestamp[] }>`
- Character limit handling: auto-segment at sentence boundaries, never mid-sentence
- Voice settings persistence: fixed stability/similarity/style for consistency
- Retry with exponential backoff
- Cost tracking per character
- Console log: `[TTSClient] Generated {durationMs}ms audio for {charCount} chars`

#### 11.2 Audio Tag Preprocessor
- **File:** `src/services/audioTagPreprocessor.ts`
- Takes narration text with `[emotional_tag]` markers → produces ElevenLabs-compatible tagged text
- Validates tags against known ElevenLabs v3 audio tags
- Calibration: test each tag with chosen voice → mark unacceptable tags for substitution
- Tag substitution map: if `[excited]` sounds bad on chosen voice → substitute `[bright]`
- Console log: `[AudioTagPreprocessor] Processed N tags, M substitutions`

#### 11.3 Math-to-Speech Preprocessor
- **File:** `src/services/mathToSpeechPreprocessor.ts`
- Takes narration text → converts mathematical notation to pronounceable English
- Replacements:
  - `x²` → "x squared", `x³` → "x cubed", `x^n` → "x to the n"
  - `x₁` → "x one", `x_i` → "x sub i"
  - `±` → "plus or minus", `√` → "square root of", `Δ` → "delta"
  - `a/b` → "a over b", `·` → " times "
  - `(expression)` → "open parenthesis expression close parenthesis"
- Also produces ORIGINAL form (for subtitles) alongside SPOKEN form (for TTS)
- Console log: `[MathToSpeech] Processed N mathematical expressions`

#### 11.4 Narration Audio Generator
- **File:** `src/services/narrationAudioGenerator.ts`
- Takes LessonNarration → generates audio files per segment
- Splits narration at `{PAUSE:N}` markers → generates separate TTS calls → inserts silence
- Splits narration at `{SOCRATIC}` markers → adds 3-second thinking pause
- Splits narration at `{REVEAL}` markers → marks reveal trigger points
- Outputs: array of audio segments with their reveal trigger positions
- Directory: `output/narration/block_N_segment_M.mp3`
- Console log: `[NarrationAudio] Generated M audio segments for block N`

#### 11.5 Word-Level Timing Engine
- **File:** `src/services/timingEngine.ts`
- Uses word timestamps from TTS API to compute precise reveal moments
- Three-source reconciliation (as designed in the architecture):
  1. TTS API word timestamps (primary)
  2. Audio waveform silence detection (secondary)
  3. Forced alignment via `gentle` or similar (tertiary, if available)
- Takes median of available sources for robustness
- Applies 300ms buffer BEFORE each reveal (content appears slightly before narration)
- Outputs: absolute millisecond timestamps for each {REVEAL} marker

#### 11.6 Absolute Timeline Builder
- **File:** `src/services/timelineBuilder.ts`
- Takes all audio segments + word timings + reveal triggers → absolute timeline
- Events keyed to absolute time from lesson start (prevents drift accumulation)
- Timeline event types: `reveal`, `block_advance`, `pause_start`, `pause_end`, `socratic_question`
- Validates: all reveals are within their parent block's audio duration
- Outputs: `AbsoluteTimeline` with events sorted by time

#### 11.7 Write Tests
- **File:** `src/services/audioTagPreprocessor.test.ts`
- Valid tags pass through unchanged
- Known-bad tags substituted
- Unknown tags handled gracefully
- **File:** `src/services/mathToSpeechPreprocessor.test.ts`
- Superscripts converted to spoken form
- Fractions converted to spoken form
- Greek letters converted to spoken form
- Original form preserved alongside spoken form
- **File:** `src/services/timingEngine.test.ts`
- Single-source timing works
- Multi-source reconciliation takes median
- 300ms buffer applied correctly
- Handles missing timing source gracefully
- **File:** `src/services/timelineBuilder.test.ts`
- Absolute timestamps increase monotonically
- Drift does not accumulate across blocks
- Reveals are within their block's audio duration
- **File:** `src/services/narrationAudioGenerator.test.ts`
- PAUSE markers produce silence gaps
- SOCRATIC markers produce thinking pauses
- REVEAL markers positioned correctly

**Acceptance Criteria:**
- Narration audio generated for all blocks in seed lesson
- Math expressions pronounced correctly (not "b two" but "b squared")
- Audio tags produce consistent teacher voice across all clips
- Reveal timings within ±200ms of intended positions
- Absolute timeline has zero drift accumulation
- All tests pass: `npx vitest run --run`

---

## SPRINT 12: Recording Pipeline

**Goal:** Automate browser recording of the presentation with synchronized audio, producing a final MP4 video.

**Dependencies:** Sprint 11 (audio and timeline ready)

### Tasks

#### 12.1 Playwright Recording Script
- **File:** `scripts/record-lesson.ts`
- Launches headless Chromium via Playwright
- Sets viewport to 1920×1080, deviceScaleFactor 2 (crisp rendering)
- Injects lesson into localStorage → clicks "Save & Present"
- Walks the AbsoluteTimeline: `page.keyboard.press('Space')` at each reveal time
- Records video via `context.recordVideo({ dir: 'output/raw', size: {1920, 1080}, fps: 30 })`
- Pre-roll: 1.5 seconds of silence before first block
- Post-roll: 2 seconds of silence after last block
- Console log: `[Recorder] Recording complete: N seconds, M reveals`

#### 12.2 DOM Stabilization Waiter
- **File:** `scripts/domStabilizer.ts`
- After each Space keypress, wait for DOM to stabilize before next action
- Uses `page.waitForFunction` with MutationObserver to detect KaTeX render completion
- Timeout: 2 seconds (if KaTeX doesn't respond, continue anyway)
- Detects invisible reveal steps (weight=0 tokens) and skips the wait
- Console log: `[DOMStabilizer] DOM stable after Nms`

#### 12.3 Checkpoint/Resume System
- **File:** `scripts/checkpointManager.ts`
- After every 5 blocks, save checkpoint: `{ blockIndex, revealCount, elapsedMs }`
- If recording crashes or times out, resume from last checkpoint
- Checkpoint file: `output/checkpoint.json`
- On resume: re-inject lesson, fast-forward to checkpoint block, continue recording
- Two recordings are concatenated during composition
- Console log: `[Checkpoint] Saved at block N` / `Resuming from block N`

#### 12.4 Pre-flight Checks
- **File:** `scripts/preflight.ts`
- Runs before recording starts:
  - Verify all image URLs reachable (HEAD request, 10s timeout)
  - Verify lesson JSON valid
  - Verify all LaTeX blocks parseable by progressive reveal engine
  - Verify available disk space > estimated output size × 3
  - Verify available memory > 512MB
  - Verify Vite dev server is running on expected port
- Any failure → BLOCK, report specific error
- Console log: `[Preflight] All checks passed` / `BLOCKED: {reason}`

#### 12.5 ffmpeg Composition
- **File:** `scripts/composite.ts`
- Takes: raw screen recording (.webm) + all narration audio segments + timeline
- Step 1: Build concatenated audio track (narration segments + silence gaps)
- Step 2: Mux video + audio into final MP4
  ```
  ffmpeg -i video.webm -i narration_full.mp3 \
    -c:v libx264 -preset slow -crf 18 \
    -c:a aac -b:a 192k \
    -shortest output/final.mp4
  ```
- Optional: burn subtitles from word timestamps (SRT format)
- Optional: add intro title card
- Console log: `[Composite] Final video: {path} ({size}MB, {duration}s)`

#### 12.6 Post-Recording Verification
- **File:** `scripts/verifyOutput.ts`
- Verifies final MP4:
  - ffprobe: video codec, resolution, frame rate, duration
  - ffprobe: audio codec, sample rate, channels
  - Audio/video sync: check that last audio event is within ±500ms of video end
  - File size: should be > 0 and < estimated max
  - Playability: can be opened by ffprobe without errors
- Console log: `[Verify] Output valid: {details}`

#### 12.7 Recording CLI
- **File:** `scripts/cli.ts`
- Entry point: `npx tsx scripts/cli.ts --lesson seed --output ./output/quadratics.mp4`
- Flags:
  - `--lesson <name|path>` — lesson to record ("seed" or path to JSON file)
  - `--output <path>` — output MP4 path
  - `--resolution <WxH>` — video resolution (default: 1920x1080)
  - `--fps <N>` — frame rate (default: 30)
  - `--voice <id>` — TTS voice ID
  - `--dry-run` — run pre-flight checks only, don't record
- Progress bar during recording (blocks completed / total blocks)
- Console log: `[CLI] Starting recording: {config}`

#### 12.8 Write Tests
- **File:** `scripts/__tests__/domStabilizer.test.ts` — mock Playwright page, verify MutationObserver wait
- **File:** `scripts/__tests__/checkpointManager.test.ts` — save/load/resume cycle
- **File:** `scripts/__tests__/preflight.test.ts` — passes healthy lesson, blocks broken images
- **File:** `scripts/__tests__/verifyOutput.test.ts` — valid and corrupt MP4 detection
- **File:** `scripts/__tests__/composite.test.ts` — ffmpeg command composition (dry-run, no actual encoding)

**Acceptance Criteria:**
- Full pipeline runs from CLI: lesson → narration → audio → recording → MP4
- Recording survives browser crash and resumes from checkpoint
- Final MP4 plays correctly with synchronized audio and video
- Pre-flight catches broken images before recording starts
- All tests pass: `npx vitest run --run`

---

## SPRINT 13: Presentation Enhancements

**Goal:** Improve the live presentation experience with on-screen controls, speaker notes, and auto-advance mode (which also serves the recording pipeline).

**Dependencies:** Sprint 7 (editor supports narration fields), Sprint 11 (timing engine exists)

### Tasks

#### 13.1 On-Screen Navigation Controls
- **File:** `src/views/PresentationStage.tsx`
- Add semi-transparent navigation bar at bottom (visible on hover)
- Previous block (◀), Next block (▶), Reset to start
- Block thumbnails/indicators (dots or mini-labels)
- Click on indicator → jump to that block
- Keep keyboard navigation fully functional alongside on-screen controls

#### 13.2 Speaker Notes Panel
- **File:** `src/views/SpeakerNotes.tsx`
- Slide-out panel from right side (toggle with `N` key or button)
- Shows `narration` field content for current block
- For math blocks: shows `narrationSteps` with current step highlighted
- Also shows: teaching tips from KG (prerequisites, common misconceptions)
- Semi-transparent background, doesn't block presentation view
- Only visible to presenter (not in recorded video)

#### 13.3 Presentation Timer
- **File:** `src/views/PresentationStage.tsx`
- Timer in bottom-left corner (toggle with `T` key)
- Shows elapsed time since presentation started
- Optional: countdown mode (set target duration, shows remaining time)
- Pause/resume timer with `P` key

#### 13.4 Auto-Advance Mode
- **File:** `src/views/PresentationStage.tsx`
- Toggle with `A` key: "Auto-Advance: ON/OFF" indicator
- When ON: automatically presses Space at intervals defined by a timing config
- Timing config: loaded from narration timing data (from Sprint 11)
- Visual countdown bar showing time until next advance
- Space key overrides: manual advance pauses auto-advance for 3 seconds
- This mode serves both live presenting AND recording sync verification

#### 13.5 Write Tests
- **File:** `src/views/PresentationStage.test.tsx` — add tests for:
  - Navigation buttons appear and work
  - Block indicator dots render and are clickable
  - Speaker notes toggle shows/hides panel
  - Timer starts, pauses, and displays correctly
  - Auto-advance fires Space at correct intervals
  - Manual Space overrides auto-advance

**Acceptance Criteria:**
- All on-screen controls work identically to keyboard controls
- Speaker notes show narration content for current block
- Timer accurate to ±1 second
- Auto-advance mode respects timing config
- All tests pass: `npx vitest run --run`

---

## SPRINT 14: Print, Export & Final Polish

**Goal:** Enable lesson export as PDF, static HTML, and print layout. Final integration testing and hardening.

**Dependencies:** Sprint 12 (video export exists), Sprint 13 (presentation is polished)

### Tasks

#### 14.1 Print CSS
- **File:** `src/index.css` (add `@media print` section)
- Hide all interactive elements (buttons, nav bars)
- Show all blocks expanded (no progressive reveal — full content visible)
- Math blocks: render at maxReveal (complete equations)
- Page breaks before each heading block
- Header: lesson title + date
- Footer: page numbers
- Dark backgrounds → white (save ink)

#### 14.2 PDF Export
- **File:** `src/services/pdfExport.ts`
- Uses browser's `window.print()` with print CSS
- Alternative: server-side PDF generation via Puppeteer headless print
- Generates a clean, printable lesson handout
- Includes all images at reasonable resolution

#### 14.3 Static HTML Export
- **File:** `src/services/htmlExport.ts`
- Generates a self-contained HTML file (no React, no JS)
- All KaTeX rendered to static HTML at maxReveal
- All CSS inlined
- All images remain as external URLs
- Can be opened in any browser without a dev server
- Suitable for sharing, archiving, or uploading to LMS

#### 14.4 Final Integration Testing
- Run all 14 sprints' tests together: `npx vitest run --run`
- Manual test: create a lesson → add narration → generate TTS → record video → verify MP4
- Manual test: import a lesson → edit blocks → present live → export as PDF
- Manual test: seed lesson → full video pipeline → play back → check sync quality
- Verify all console logs follow the `[Prefix]` convention
- Verify all try/catch blocks handle errors gracefully
- Verify backward compatibility: old saved lessons still load

#### 14.5 Documentation Updates
- **File:** `STATUS.md` — update to "All Sprints Complete"
- **File:** `USER-JOURNEY.md` — update with new features from Sprints 6-14
- **File:** `README.md` — replace Vite template content with actual project documentation

**Acceptance Criteria:**
- PDF export produces clean, printable lesson handouts
- Static HTML export opens correctly in any browser
- Print layout looks professional
- Full test suite passes (estimated 150+ tests)
- All documentation current and complete

---

## SPRINT SUMMARY TABLE

| Sprint | Name | Files Created | Key Dependency | Est. Tests |
|--------|------|---------------|----------------|------------|
| 1-5 | Foundation → Orchestration | 9 files | — | 43 ✅ |
| Post-5 | Hardening & Seed | 2 files | — | 43 ✅ |
| 6 | Type Extension & Data Model | 4 files | Sprint 5 | 36 ✅ |
| 7 | Editor Hardening | 1 file modified | Sprint 6 | 56 ✅ |
| 8 | Multi-Lesson Management | 4 files | Sprint 7 | 66 ✅ |
| 9 | Knowledge Graph Engine | 5 files | Sprint 6 | 40 ✅ |
| 10 | LLM Narration Pipeline | 7 files | Sprint 9 | 28 ✅ |
| 11 | TTS & Timing Engine | 6 files | Sprint 10 | 45 ✅ |
| 12 | Recording Pipeline | 8 files | Sprint 11 | 33 ✅ |
| 13 | Presentation Enhancements | 2 files | Sprint 7, 11 | 39 ✅ |
| 14 | Print, Export & Polish | 3 files | Sprint 12, 13 | 31 ✅ |

## TEST COVERAGE TARGET

After Sprint 14, the test suite should cover:

| Category | Coverage Target |
|----------|-----------------|
| Type definitions | 100% (compilation verification) |
| Data services (KG, symbols, import/export) | 90%+ line coverage |
| LLM agents (with mocked responses) | 85%+ branch coverage |
| TTS preprocessing (math, tags, timing) | 95%+ line coverage |
| Recording scripts (unit tests) | 80%+ line coverage |
| React components | 85%+ branch coverage |
| Error paths (every try/catch exercised) | 100% |

---

## CRITICAL ARCHITECTURAL RULES (ALL SPRINTS)

1. **Every new file gets a `.test.ts` or `.test.tsx` counterpart.**
2. **Every component logs mount, prop changes, and state changes with a `[ComponentName]` prefix.**
3. **Every `localStorage`, JSON parsing, and API call is wrapped in try/catch.**
4. **KaTeX is mocked in all component tests:** `vi.mock('katex')`
5. **No placeholders (`// TODO`). Write production-ready code.**
6. **After each sprint:** `npx vitest run --run` must pass all tests.
7. **After each sprint:** update `STATUS.md` with current phase, completed sprint, any blockers, and next action.
8. **Commit format:** `feat(Sprint N): Description — Tests passed`
