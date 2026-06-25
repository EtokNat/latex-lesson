# USER JOURNEY — MATH PRESENTATION STUDIO

Complete application map through Sprint 12: every screen, state, interaction, edge case, and file.

---

## 1. APPLICATION ENTRY & STARTUP

### 1.1 Boot Sequence

```
Browser navigates to http://localhost:5173
  → Vite dev server serves index.html
    → index.html loads <div id="root">
      → /src/main.tsx mounts React 19 <StrictMode>
        → /src/App.tsx renders
```

### 1.2 Entry Points

| File | Role |
|------|------|
| `index.html` | HTML shell. Mounts `<div id="root">`, imports `/src/main.tsx` |
| `src/main.tsx` | React 19 entry. Imports `index.css` (Tailwind + chalkboard animations), renders `<App />` |
| `src/App.tsx` | Application root. State machine with three views: `library`, `planner`, `presentation` |
| `src/index.css` | Tailwind directives, body reset, `@keyframes chalk-reveal`, `#active-reveal-target` styling |

### 1.3 App State Machine (3-View Router — Sprint 8)

```
┌──────────┐  selectLesson()   ┌──────────┐  onSaveAndPresent()  ┌──────────────┐
│          │ ────────────────▶ │          │ ───────────────────▶ │              │
│ LIBRARY  │                   │ PLANNER  │                      │ PRESENTATION │
│ (2+      │◀──────────────── │          │◀──────────────────── │              │
│ lessons) │   onBack()        │          │   onExit()/Escape    │              │
└──────────┘                   └──────────┘                      └──────────────┘
     │                               │
     │ create/delete/                │ Shows directly when
     │ duplicate/import/export       │ only 1 lesson exists
     ▼                               ▼
  localStorage('lesson_library')   SEED_LESSON (38 blocks)
```

**Initialization (useEffect on mount):**
1. Reads `localStorage.getItem('lesson_library')` inside try/catch
2. Auto-migrates legacy `saved_lesson` key if `lesson_library` is missing
3. If 2+ lessons → show library view
4. If 1 lesson → show planner directly with that lesson
5. On any error → falls back to seed lesson library
6. Default view is `"planner"` for single-lesson, `"library"` for multi-lesson

**Edge Cases:**
- Corrupted localStorage: caught, logged, falls back to seed lesson
- Empty lesson library: seed lesson auto-populated
- Legacy `saved_lesson` format: auto-migrated to `lesson_library`
- Presentation requires valid lesson — guards against null lesson prop

---

## 2. LESSON PLANNER VIEW (Updated Sprint 7-8)

**File:** `src/views/LessonPlanner.tsx`
**Props:** `{ initialLesson?: Lesson; onSaveAndPresent: (lesson: Lesson) => void; onBack?: () => void }`

### 2.1 Block CRUD Operations (Sprint 7)

| Operation | Button | Behavior |
|-----------|--------|----------|
| Add Block | 4 type buttons (Heading/Text/Image/Math) | Generates unique ID, appends to blocks array |
| Delete Block | ✕ button per block | `window.confirm` prompt, removes from state |
| Reorder Up | ▲ button | Swaps with previous block (disabled on first) |
| Reorder Down | ▼ button | Swaps with next block (disabled on last) |
| Duplicate | ⧉ button | Deep copy with new unique ID, inserted after original |

### 2.2 Math LaTeX Preview (Sprint 7)

- 300ms debounced `useEffect` calling `katex.renderToString`
- Shows live preview below math block input
- `dangerouslySetInnerHTML` display with `bg-gray-100 rounded p-3`
- Invalid LaTeX renders red error text via `throwOnError: false`

### 2.3 Image URL Validation (Sprint 7)

- 500ms debounced `useEffect` with `AbortController`
- HEAD request to image URL with 5s timeout
- Status indicators: gray spinner → green ✓ (reachable) / red ✗ (unreachable)

### 2.4 Narration Field Editing (Sprint 7)

- Collapsible "Narration" section per block (▶/▼ toggle, collapsed default)
- Textarea for `narration` field (headings, text, images)
- For math blocks: per-step `narrationSteps` inputs with Add/Remove Step buttons

### 2.5 Controlled Component Pattern (Sprint 8)

- Receives `initialLesson` prop from App (single source of truth)
- Optional `onBack` prop for returning to library
- Falls back to SEED_LESSON when no `initialLesson` provided

### 2.6 LocalStorage Persistence Contract (Sprint 8)

- **Key:** `"lesson_library"`
- **Value:** `JSON.stringify(LessonLibrary)` = `{ lessons: Lesson[], activeLessonId: string }`
- **Migration:** Auto-migrates from legacy `"saved_lesson"` key on first load
- **Read:** Defensive try/catch in `lessonStorage.loadLibrary()`
- **Write:** Defensive try/catch in `lessonStorage.saveLibrary()`
- **CRUD Service:** `src/services/lessonStorage.ts` — create, update, delete, duplicate, getActive

---

## 3. PRESENTATION STAGE VIEW

**File:** `src/views/PresentationStage.tsx`
**Props:** `{ lesson: Lesson; onExit: () => void }`

### 3.1 Visual Layout (Dark Mode Viewport)

```
Background: bg-gray-950 (solid near-black)
Text: white
Container: fixed inset-0, flex-col, centered, p-8, select-none
Content area: max-w-4xl
Block counter: fixed bottom-right, text-gray-600, text-sm, font-mono
```

### 3.2 Block Rendering

- **Heading:** `<h1 className="text-4xl font-bold text-white mb-6">`
- **Text:** `<p className="text-xl text-white leading-relaxed whitespace-pre-wrap">`
- **Image:** `<img className="max-w-full max-h-[70vh] object-contain rounded-lg">` + caption
- **Math:** `<ProgressiveAlignedEquation equationString={content} revealCount={revealCount} />`

### 3.3 Keyboard Navigation

```
Space/ArrowRight:  advance reveal (math) or advance block (non-math)
Backspace/ArrowLeft: decrement reveal (math, if >0) or go to previous block
Escape: exit presentation
Boundary guards: no-op at first/last block
```

---

## 4. PROGRESSIVE MATH ENGINE

**File:** `src/components/ProgressiveAlignedEquation.tsx`

- Custom recursive descent LaTeX parser → AST → progressive reveal via `\phantom{}`
- 7 AST node types, 36 registered LaTeX commands
- `#active-reveal-target` CSS ID triggers chalkboard reveal animation
- KaTeX `renderToString` with `throwOnError: false`
- Zero-weight tokens (spaces, `&`, `\\`) don't consume reveal budget

---

## 5. DATA LAYER

### 5.1 Core Types (`src/data/types.ts`)

```typescript
type BlockType = "heading" | "text" | "image" | "math";

interface LessonBlock {
  id: string; type: BlockType; content: string;
  imageUrl?: string;           // image blocks only
  narration?: string;           // Sprint 6 — spoken text
  narrationSteps?: string[];    // Sprint 6 — per-reveal spoken text for math
}

interface Lesson {
  id: string; title: string; blocks: LessonBlock[]; lastModified?: string;
}

interface LessonLibrary {       // Sprint 8
  lessons: Lesson[]; activeLessonId: string;
}
```

### 5.2 Knowledge Graph Types (`src/data/knowledgeGraph.ts`) — Sprint 6

- `ConceptNode`: id, name, type (definition/procedure/principle/example/analogy), representations, misconceptions
- `GraphEdge`: from, to, type (PREREQUISITE/DERIVES_FROM/ANALOGOUS_TO/CONTRASTS_WITH/GENERALIZES/EXAMPLE_OF), weight, explanation
- `KnowledgeGraph`: concepts Map + edges array

### 5.3 Narration Types (`src/data/narrationTypes.ts`) — Sprint 6

- `AudioTag` (12 values): excited, warmly, measured, encouraging, authoritatively, calm, curious, bright, patiently, reassuring, seriously, firmly
- `NarrationSegment`: text, audioTag, revealTrigger, pauseAfterMs, socraticPause
- `BlockNarration`: blockId, segments, totalDurationMs
- `LessonNarration`: lessonId, blockNarrations, interBlockPausesMs

### 5.4 Symbol Ledger Types (`src/data/symbolLedger.ts`) — Sprint 6

- `SymbolEntry`: canonicalForm, aliases, meaning, introducedAtBlock
- `SymbolLedger`: symbols Map, getCanonical(), isDefined()

### 5.5 Seed Lesson (`src/data/seedLesson.ts`) — Sprint 8

- 38-block comprehensive quadratic equations lesson
- Extracted from LessonPlanner into standalone constant

---

## 6. SERVICE LAYER

### 6.1 Lesson Management (Sprint 8)

| Service | Purpose |
|---------|---------|
| `src/services/lessonStorage.ts` | CRUD on `lesson_library` localStorage, auto-migration from legacy key |
| `src/services/lessonImportExport.ts` | JSON file download (Blob + URL.createObjectURL) and upload (FileReader + validation) |

### 6.2 Knowledge Graph Engine (Sprint 9)

| Service | Purpose |
|---------|---------|
| `src/services/conceptExtractor.ts` | Extracts concepts from headings, math, definition patterns |
| `src/services/edgeInference.ts` | 6-type edge inference with heuristic rules |
| `src/services/knowledgeGraphBuilder.ts` | Orchestrator with cycle detection (topological sort) |
| `src/services/relevanceQuery.ts` | 5 query modes: prerequisites, bridges, contrasts, analogies, spiral |
| `src/services/symbolLedgerBuilder.ts` | Math symbol scanning with conflict detection |

### 6.3 LLM Narration Pipeline (Sprint 10)

| Service | Purpose |
|---------|---------|
| `src/services/llmClient.ts` | Abstract LLM API with retry (3 attempts), cost tracking |
| `src/services/agents/teachingPlanAgent.ts` | Generates per-block teaching plan from KG |
| `src/services/agents/visionAgent.ts` | Image analysis with ground truth fallback |
| `src/services/agents/narrationScriptAgent.ts` | Narration with {REVEAL}/{SOCRATIC}/{PAUSE} markers and audio tags |
| `src/services/agents/validationAgent.ts` | 8 checks (verbatim, cross-refs, quantitative, symbol, dead voice, etc.) |
| `src/services/narrationPipeline.ts` | 7-step orchestrator with retry loop on CRITICAL flags |

### 6.4 TTS & Timing Engine (Sprint 11)

| Service | Purpose |
|---------|---------|
| `src/services/ttsClient.ts` | Abstract TTS API with retry, cost tracking, sentence-boundary chunking |
| `src/services/audioTagPreprocessor.ts` | Tag validation, voice calibration substitutions |
| `src/services/mathToSpeechPreprocessor.ts` | LaTeX math to spoken English conversion |
| `src/services/narrationAudioGenerator.ts` | Splits narration at markers, generates AudioSegment array |
| `src/services/timingEngine.ts` | Word-level reveal timing, multi-source reconciliation (median), 300ms buffer |
| `src/services/timelineBuilder.ts` | Builds AbsoluteTimeline with 7 event types, monotonic validation |

---

## 7. RECORDING PIPELINE (Sprint 12)

### 7.1 CLI Entry Point

```
npx tsx scripts/cli.ts --lesson seed --output ./output/final.mp4 [--resolution 1920x1080] [--fps 30] [--voice default] [--dry-run]
```

### 7.2 Pipeline Flow

```
Lesson → preflight checks → narration pipeline (LLM) → audio generation (TTS)
  → timing engine → absolute timeline → Playwright recording → ffmpeg composite → verify
```

### 7.3 Script Modules

| Module | Purpose |
|--------|---------|
| `scripts/preflight.ts` | Validates lesson structure, image URLs, LaTeX, dev server |
| `scripts/domStabilizer.ts` | Waits for MutationObserver + rAF stability after keypresses |
| `scripts/checkpointManager.ts` | Saves recording progress every 5 blocks for crash recovery |
| `scripts/record-lesson.ts` | Playwright headless Chromium, localStorage injection, timeline walking |
| `scripts/composite.ts` | ffmpeg video+audio composition via child_process.execFile |
| `scripts/verifyOutput.ts` | ffprobe-based MP4 validation (codec, resolution, audio, duration) |
| `scripts/cli.ts` | Argument parsing and full pipeline orchestration |

---

## 8. ERROR HANDLING AUDIT

### 8.1 Try/Catch Coverage

| Location | Operation | Catch Behavior |
|----------|-----------|----------------|
| `App.tsx` | localStorage read + JSON.parse | Logs error, falls back to seed library |
| `LessonPlanner.tsx` | localStorage read, JSON stringify/setItem | Logs error, falls back to SEED_LESSON, still transitions |
| `PresentationStage.tsx` | computeMaxReveal (parsing) | Logs error, returns 1 |
| `PresentationStage.tsx` | handleKeyDown body | Logs error, key event swallowed |
| `ProgressiveAlignedEquation.tsx` | katex.renderToString | Logs error, returns fallback HTML |
| `lessonStorage.ts` | All CRUD operations | Logs error, returns safe defaults |
| `lessonImportExport.ts` | JSON.parse, FileReader | Logs error, returns validation error |

### 8.2 Error States Visible to User

| Error | User Sees |
|-------|-----------|
| Corrupted localStorage | Seed lesson loaded (no crash) |
| localStorage quota exceeded | Lesson transitions in-memory |
| Broken image URL | Red ✗ indicator in planner; native broken icon in presentation |
| Invalid LaTeX | Red error text in planner preview; KaTeX error span in presentation |
| Empty lesson | "No blocks to present. Press Escape to exit." |

---

## 9. TESTING AUDIT

### 9.1 Test Suite (32 files, 289 tests, all passing)

| Category | Files | Tests |
|----------|-------|-------|
| Data types | 4 | 36 |
| Math component | 1 | 5 |
| Service layer (lessons, KG, agents, TTS, timing) | 22 | 188 |
| React views (Library, Planner, Presentation, App) | 4 | 80 |
| Recording scripts | 5 | 33 |

### 9.2 Test Infrastructure

- **Framework:** Vitest 2.1.9 with jsdom 25 environment
- **React Testing:** @testing-library/react 16.3.2
- **KaTeX Mock:** `vi.mock('katex')` in all component tests
- **Node scripts:** `@vitest-environment node` pragma on script tests

---

## 10. BUILD & CONFIGURATION

| Tool | Version | File |
|------|---------|------|
| Vite | 6.0.7 | `vite.config.ts` |
| React | 19.2.6 | `package.json` |
| TypeScript | 6.0.2 | `tsconfig.app.json`, `tsconfig.node.json`, `scripts/tsconfig.json` |
| Tailwind CSS | 3.4.19 | `tailwind.config.js` |
| Vitest | 2.1.9 | `vite.config.ts` (inline config) |
| KaTeX | 0.16.47 | `package.json` |
| Playwright | latest | `package.json` (dev) |
| tsx | latest | `package.json` (dev) |

**Key compiler options:** target ES2023, moduleResolution bundler, verbatimModuleSyntax true, noUnusedLocals true, erasableSyntaxOnly true

---

## 11. CURRENT LIMITATIONS

| Limitation | Status |
|------------|--------|
| Image upload (URL only, no local upload) | Open |
| No undo/redo stack in planner | Open |
| No responsive breakpoints | Open |
| HTML title hardcoded | Open |
| No annotation/drawing overlay | Open |
| TTS/LLM require external API keys | By design (pluggable backends) |
| Full pipeline requires ffmpeg + dev server + API keys | Integration concern |

Previous limitations now resolved:
- Block deletion ✓ (Sprint 7)
- Block reordering ✓ (Sprint 7)
- Block duplication ✓ (Sprint 7)
- LaTeX preview in editor ✓ (Sprint 7)
- Image URL validation ✓ (Sprint 7)
- Multi-lesson management ✓ (Sprint 8)
- Lesson import/export ✓ (Sprint 8)
- Narration fields ✓ (Sprint 6)
- Knowledge graph ✓ (Sprint 9)
- LLM narration pipeline ✓ (Sprint 10)
- TTS & timing engine ✓ (Sprint 11)
- Video recording pipeline ✓ (Sprint 12)

---

## 12. CONSOLE LOG PREFIX INDEX

| Prefix | File |
|--------|------|
| `[App]` | `src/App.tsx` |
| `[LessonPlanner]` | `src/views/LessonPlanner.tsx` |
| `[PresentationStage]` | `src/views/PresentationStage.tsx` |
| `[ProgressiveAlignedEquation]` | `src/components/ProgressiveAlignedEquation.tsx` |
| `[KGBuilder]` | `src/services/knowledgeGraphBuilder.ts` |
| `[ConceptExtractor]` | `src/services/conceptExtractor.ts` |
| `[EdgeInference]` | `src/services/edgeInference.ts` |
| `[RelevanceQuery]` | `src/services/relevanceQuery.ts` |
| `[SymbolLedger]` | `src/services/symbolLedgerBuilder.ts` |
| `[LLMClient]` | `src/services/llmClient.ts` |
| `[TeachingPlanAgent]` | `src/services/agents/teachingPlanAgent.ts` |
| `[VisionAgent]` | `src/services/agents/visionAgent.ts` |
| `[NarrationScriptAgent]` | `src/services/agents/narrationScriptAgent.ts` |
| `[ValidationAgent]` | `src/services/agents/validationAgent.ts` |
| `[NarrationPipeline]` | `src/services/narrationPipeline.ts` |
| `[TTSClient]` | `src/services/ttsClient.ts` |
| `[AudioTagPreprocessor]` | `src/services/audioTagPreprocessor.ts` |
| `[MathToSpeech]` | `src/services/mathToSpeechPreprocessor.ts` |
| `[NarrationAudio]` | `src/services/narrationAudioGenerator.ts` |
| `[TimingEngine]` | `src/services/timingEngine.ts` |
| `[TimelineBuilder]` | `src/services/timelineBuilder.ts` |
| `[DOMStabilizer]` | `scripts/domStabilizer.ts` |
| `[Checkpoint]` | `scripts/checkpointManager.ts` |
| `[Preflight]` | `scripts/preflight.ts` |
| `[Composite]` | `scripts/composite.ts` |
| `[Verify]` | `scripts/verifyOutput.ts` |
| `[Recorder]` | `scripts/record-lesson.ts` |
| `[CLI]` | `scripts/cli.ts` |

---

*Document version: 2.0 | Generated: 2026-06-25 | App version: Sprint 12 Complete*
