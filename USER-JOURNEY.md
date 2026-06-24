# USER JOURNEY — MATH PRESENTATION STUDIO

## Complete Application Map

Every screen, every state, every interaction, every edge case, every file.

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
| `index.html` | HTML shell. Sets `<title>vite-temp</title>`, loads `/favicon.svg`, mounts `<div id="root">`, imports `/src/main.tsx` |
| `src/main.tsx` | React 19 entry. Imports `index.css` (Tailwind + chalkboard animations), renders `<App />` in StrictMode |
| `src/App.tsx` | Application root. State machine with two views: `planner` and `presentation` |
| `src/index.css` | Tailwind directives (`@tailwind base/components/utilities`), body reset (`margin: 0`), `@keyframes chalk-reveal` animation, `#active-reveal-target` styling |

### 1.3 App State Machine

```
┌──────────────┐     onSaveAndPresent(lesson)     ┌──────────────────┐
│              │ ─────────────────────────────────▶│                  │
│   PLANNER    │                                    │  PRESENTATION    │
│   (default)  │◀───────────────────────────────── │                  │
│              │     onExit() / Escape key          │                  │
└──────────────┘                                    └──────────────────┘

State: view = "planner" | "presentation"
       savedLesson: Lesson | null
```

**Initialization (useEffect on mount):**
1. Attempts `localStorage.getItem('saved_lesson')` inside try/catch
2. If found + valid JSON → `setSavedLesson(parsed)` → `console.log('[App] Found saved lesson:', parsed.title)`
3. If null → `console.log('[App] No saved lesson in localStorage')` → savedLesson remains null
4. If corrupted JSON → `console.error('[App] Failed to read saved lesson:', err)` → savedLesson remains null
5. Default view is `"planner"` regardless of localStorage state

**View Routing Logic:**
- If `view === "presentation"` AND `savedLesson !== null` → render `<PresentationStage lesson={savedLesson} onExit={handleExitPresentation} />`
- Otherwise → render `<LessonPlanner onSaveAndPresent={handleSaveAndPresent} />`

**Edge Cases Handled:**
- Corrupted localStorage JSON does not crash the app — view defaults to planner
- Missing localStorage key does not crash — view defaults to planner
- Presentation view requires BOTH view state AND a valid lesson — guards against rendering PresentationStage with null lesson

---

## 2. LESSON PLANNER VIEW

**File:** `src/views/LessonPlanner.tsx`
**Props:** `{ onSaveAndPresent: (lesson: Lesson) => void }`

### 2.1 Initial State

On mount, the component runs initialization via `useEffect([], [])`:

```
┌─────────────────────────────────────────────────────┐
│               INITIALIZATION LOGIC                    │
│                                                       │
│  1. Try localStorage.getItem('saved_lesson')          │
│     ├─ Found → parse JSON → setTitle + setBlocks      │
│     │           console.log with title + block count   │
│     ├─ null   → load SEED_LESSON (38 blocks)          │
│     └─ Error  → load SEED_LESSON (graceful fallback)  │
│                                                       │
│  Result: title state = "Quadratic Equations..."       │
│          blocks state = 38-block array                │
└─────────────────────────────────────────────────────┘
```

### 2.2 UI Layout

```
┌──────────────────────────────────────┐
│  Lesson Planner           (heading)   │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Lesson Title                     │ │
│  │ [Quadratic Equations — From...]  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Add Block                            │
│  [+ Heading] [+ Text] [+ Image] [+ Math]  │
│                                        │
│  Blocks (38)                          │
│  ┌──────────────────────────────────┐ │
│  │ [Heading]                        │ │
│  │ [1. What Is a Quadratic Eq...]   │ │
│  ├──────────────────────────────────┤ │
│  │ [Text]                           │ │
│  │ [A quadratic equation is a...]   │ │
│  ├──────────────────────────────────┤ │
│  │ [Math]                           │ │
│  │ [\begin{aligned} ax^2 + bx...]   │ │
│  ├──────────────────────────────────┤ │
│  │ [Image]                          │ │
│  │ [A parabola opening upward...]   │ │
│  │ [https://upload.wikimedia... ]   │ │
│  ├──────────────────────────────────┤ │
│  │ ... (38 blocks total)            │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │       Save and Present           │ │
│  └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 2.3 All User Actions

#### 2.3.1 Edit Lesson Title
- **Input:** Text input with placeholder "Enter lesson title"
- **Action:** `onChange` → `setTitle(e.target.value)`
- **State:** Uncontrolled after mount (initialized from localStorage or seed)
- **Edge case:** Empty title is allowed (user can save a lesson with empty title)

#### 2.3.2 Add Block (4 types)
- **Buttons:** `+ Heading`, `+ Text`, `+ Image`, `+ Math`
- **Action:** `addBlock(type)` → generates unique ID via `Date.now()-randomString` → appends `{ id, type, content: '' }` to blocks array
- **Visual feedback:** Block count updates immediately; new block appears at bottom of list with empty content input
- **Edge cases:**
  - New block has empty content — user must type to populate
  - New image block shows imageUrl input field immediately
  - Block count label updates: `Blocks (N)`

#### 2.3.3 Edit Block Content
- **Input:** Text input per block, placeholder varies by type (`"Enter heading content"`, `"Enter text content"`, `"Enter image content"`, `"Enter math content"`)
- **Action:** `updateBlockContent(id, content)` → maps over blocks, replaces matching id's content
- **Edge case:** Math blocks accept raw LaTeX including `\begin{aligned}...\end{aligned}` — no validation at input time

#### 2.3.4 Edit Image URL (image blocks only)
- **Visibility:** `imageUrl` input ONLY renders when `block.type === 'image'`
- **Placeholder:** `"Image URL"`
- **Action:** `updateBlockImageUrl(id, imageUrl)` → maps over blocks, replaces matching id's imageUrl
- **Edge case:** Removing imageUrl (empty string) is allowed — PresentationStage will render broken image

#### 2.3.5 Save and Present
- **Button:** Blue full-width `"Save and Present"` button
- **Action flow:**
  1. Construct `Lesson` object: `{ id: generateId(), title, blocks }`
  2. `try { JSON.stringify(lesson) }` — catches circular reference errors
  3. `try { localStorage.setItem('saved_lesson', json) }` — catches QuotaExceeded and other storage errors
  4. Calls `onSaveAndPresent(lesson)` regardless of localStorage success/failure
- **Edge cases:**
  - JSON.stringify failure: caught, logged, still calls onSaveAndPresent
  - localStorage.setItem failure: caught, logged, still calls onSaveAndPresent
  - Empty title: saved as-is
  - Empty blocks array: saved as-is, PresentationStage shows "No blocks to present"

### 2.4 Seed Lesson Structure

The SEED_LESSON constant is a complete 38-block lesson on quadratic equations:

| Section | Block # | Type | Content Summary |
|---------|---------|------|-----------------|
| 1. What Is a Quadratic? | 1 | heading | Section title |
| | 2 | text | Definition, standard form explanation |
| | 3 | math | Standard form + 3 examples in aligned env |
| | 4 | image | Wikimedia parabola (a>0 and a<0) |
| | 5 | text | Parabola direction and x-intercepts |
| 2. Factoring | 6 | heading | Section title |
| | 7 | text | Zero Product Property explanation |
| | 8 | math | x²+7x+12=0, 7-line solve |
| | 9 | text | Verification by substitution |
| | 10 | math | 2x²-x-6=0, 6-line ac-method |
| | 11 | image | Area model visualization |
| 3. Completing the Square | 12 | heading | Section title |
| | 13 | text | Key insight: (b/2)² |
| | 14 | math | x²+6x+5=0, 9-line solve |
| | 15 | text | Geometric interpretation |
| 4. Quadratic Formula | 16 | heading | Section title |
| | 17 | text | Derivation motivation |
| | 18 | math | 11-line full derivation from ax²+bx+c=0 |
| | 19 | text | "Memorise it" prompt |
| | 20 | math | 2x²-4x-6=0 worked example, 8 lines |
| | 21 | image | Parabola with vertex and roots labeled |
| 5. The Discriminant | 22 | heading | Section title |
| | 23 | text | Δ definition and meaning |
| | 24 | math | Δ cases overview (Δ>0, =0, <0) |
| | 25 | text | "Pay attention to x-intercepts" transition |
| | 26 | math | Cases 1&2: Δ>0 and Δ=0 with examples |
| | 27 | math | Case 3: Δ<0 with complex roots |
| | 28 | image | Three parabolas comparing cases |
| 6. Full Worked Example | 29 | heading | Section title |
| | 30 | text | 3x²-12x+9=0 — try all methods |
| | 31 | math | Dual method: factoring + formula, 14 lines |
| 7. Practice Exercises | 32 | heading | Section title |
| | 33 | text | Exercise instructions |
| | 34 | math | 5 practice problems in aligned env |
| | 35 | text | Answers with discriminant values |
| 8. Key Takeaways | 36 | heading | Section title |
| | 37 | text | 4-point summary |
| | 38 | image | Blackboard summary image |

**Image URLs (5 total, all Wikimedia Commons):**
1. `Polynomialdeg2.svg` — Basic parabola
2. `Binomial_theorem_visualisation.svg` — Area model
3. `Quadratic_function_graph_key_values.svg` — Parabola with vertex/roots
4. `Quadratic_roots.svg` — Three discriminant cases
5. `Quadratic_equation_on_blackboard.jpg` — Blackboard summary

### 2.5 Console Logging (LessonPlanner)

Every significant event is logged with `[LessonPlanner]` prefix:

| Event | Log Message |
|-------|-------------|
| Mount | `[LessonPlanner] Mount` |
| Init — localStorage found | `Loaded saved lesson: {title} with {N} blocks` |
| Init — no localStorage | `No saved lesson, loading seed lesson` |
| Init — error | `Failed to load lesson, using seed: {err}` |
| Add block | `Adding block: {type}` |
| Blocks updated | `Blocks updated: {N}` |
| Update content | `Updating block content: {id}` |
| Update imageUrl | `Updating block imageUrl: {id}` |
| Save triggered | `Save triggered` |
| Save success | `Lesson saved to localStorage` |
| Save storage error | `localStorage.setItem failed: {err}` |
| Save stringify error | `JSON.stringify failed: {err}` |

### 2.6 LocalStorage Persistence Contract

**Key:** `"saved_lesson"`
**Value:** `JSON.stringify(Lesson)` where Lesson = `{ id: string, title: string, blocks: LessonBlock[] }`
**Read:** On App mount AND on LessonPlanner mount (both defensive)
**Write:** On "Save and Present" click in LessonPlanner
**Error handling:** Both read and write are wrapped in try/catch; failures are logged but never crash the app

---

## 3. PRESENTATION STAGE VIEW

**File:** `src/views/PresentationStage.tsx`
**Props:** `{ lesson: Lesson; onExit: () => void }`

### 3.1 Visual Layout (Dark Mode Viewport)

```
┌────────────────────────────────────────────────────────────┐
│  [Exit (Esc)]                                   top-right  │
│                                                             │
│                                                             │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │                         │                    │
│              │   ACTIVE BLOCK CONTENT   │                    │
│              │                         │                    │
│              │  heading / text /        │                    │
│              │  image / math            │                    │
│              │                         │                    │
│              └─────────────────────────┘                    │
│                                                             │
│                                                             │
│                                                             │
│  Block 3/38 · Reveal 12/45              bottom-right        │
└────────────────────────────────────────────────────────────┘

Background: bg-gray-950 (solid near-black)
Text: white
Container: fixed inset-0, flex-col, centered, p-8, select-none
Content area: max-w-4xl
```

### 3.2 State Model

```typescript
blockIndex: number           // Current block position (0-based)
revealCount: number          // Current reveal step within block

// Initialization:
// blockIndex = 0
// revealCount = firstBlock.type === "math" ? 0 : 1

// For non-math blocks: revealCount is always 1 (fully shown)
// For math blocks: revealCount ranges from 0 to maxReveal
```

### 3.3 Block Rendering

#### 3.3.1 Heading Block
```tsx
<h1 className="text-4xl font-bold text-white mb-6">
  {currentBlock.content}
</h1>
```

#### 3.3.2 Text Block
```tsx
<p className="text-xl text-white leading-relaxed whitespace-pre-wrap">
  {currentBlock.content}
</p>
```
- `whitespace-pre-wrap` preserves intentional line breaks (e.g., in the 4-point summary)
- `leading-relaxed` for readability on dark background

#### 3.3.3 Image Block
```tsx
<div className="flex flex-col items-center">
  <img src={currentBlock.imageUrl}
       alt={currentBlock.content}
       className="max-w-full max-h-[70vh] object-contain rounded-lg" />
  {currentBlock.content && (
    <p className="text-gray-400 mt-4 text-sm">
      {currentBlock.content}
    </p>
  )}
</div>
```
- Image alt text = block content (accessibility)
- Caption shown below image if content is non-empty
- `max-h-[70vh]` ensures image doesn't overflow viewport
- `object-contain` preserves aspect ratio
- No loading state — image loads natively

#### 3.3.4 Math Block
```tsx
<ProgressiveAlignedEquation
  equationString={currentBlock.content}
  revealCount={revealCount}
  displayMode="block"
/>
```
- Delegates to the progressive reveal engine
- `revealCount` controls how much is visible

### 3.4 Keyboard Navigation — Complete State Machine

```
                    ┌──────────────────────────────┐
                    │         CURRENT STATE          │
                    │  blockIndex, revealCount       │
                    └──────────────────────────────┘
                                    │
        ┌───────────────┬───────────┴───────────┬───────────────┐
        │               │                       │               │
     Escape          Space /                   Backspace /      Click
        │            ArrowRight                ArrowLeft       Exit btn
        ▼               │                       │               │
   onExit()        ┌────┴────┐              ┌───┴────┐      onExit()
                   │         │              │        │
              block.type    block.type   block.type block.type
              !== "math"   === "math"   !== "math" === "math"
                   │         │              │        │
                   ▼         ▼              ▼        ▼
              ┌────────┐ ┌──────────┐  ┌────────┐ ┌──────────┐
              │Advance │ │revealCount│  │Go back │ │revealCount│
              │to next │ │< max?    │  │to prev │ │> 0?      │
              │block   │ │          │  │block   │ │          │
              │        │ │YES: incr │  │        │ │YES: decr │
              │if last │ │reveal    │  │if first│ │reveal    │
              │block:  │ │          │  │block:  │ │          │
              │no-op   │ │NO: adv   │  │no-op   │ │NO: go to │
              │        │ │to next   │  │        │ │prev block│
              └────────┘ │block     │  └────────┘ │at max    │
                         └──────────┘              │reveal    │
                                                   └──────────┘
```

**Key behaviors:**
- **Math blocks:** Space/Right first increment revealCount. Only when revealCount reaches maxReveal does Space/Right advance to next block.
- **Non-math blocks:** Space/Right immediately advance to next block.
- **Backward navigation from math block:** If revealCount > 0, decrement reveal. If revealCount === 0, go to previous block with its maxReveal set.
- **Boundary guards:** Cannot advance past last block. Cannot go back past first block.
- **Escape:** Calls onExit at any time, from any block.
- **preventDefault():** Called on Space, ArrowRight, ArrowLeft, Backspace to prevent page scroll.

### 3.5 `computeMaxReveal()` — The Reveal Counter

```typescript
function computeMaxReveal(block: LessonBlock): number {
  if (block.type !== "math") return 1;

  // Strip aligned environment wrapper
  let eq = block.content.trim();
  if (eq.startsWith("\\begin{aligned}") && eq.endsWith("\\end{aligned}")) {
    eq = eq.slice("\\begin{aligned}".length, -"\\end{aligned}".length).trim();
  }

  // Split into lines, parse each line, sum all reveal weights
  const lines = smartSplitLines(eq);
  return lines.reduce((sum, line) => {
    const nodes = parseEquation(line);
    return sum + nodes.reduce((s, n) => s + totalReveal(n), 0);
  }, 0);

  // On error: return 1 (safe fallback)
}
```

### 3.6 Block Counter Display

```
Position: fixed, bottom-4, right-4
Style: text-gray-600, text-sm, font-mono

Non-math block: "Block 3/38"
Math block:     "Block 5/38 · Reveal 12/45"
```

### 3.7 Edge Cases in Presentation

| Edge Case | Behavior |
|-----------|----------|
| Empty lesson (blocks = []) | Shows "No blocks to present. Press Escape to exit." |
| Single-block lesson | Cannot advance past it; cannot go back past it |
| Very long text blocks | `whitespace-pre-wrap` + `max-w-4xl` container — text wraps naturally |
| Very large images | `max-h-[70vh]` + `object-contain` — image scales down |
| Image with no caption | Caption paragraph not rendered (conditional on `content` truthiness) |
| Rapid key presses | React batching handles this; state updates are atomic |
| computeMaxReveal error | Returns 1, block behaves as non-math block |
| Missing imageUrl | `<img src={undefined}>` — browser shows broken image icon |
| Corrupted LaTeX in math block | KaTeX renders with `throwOnError: false` — shows error in red |

### 3.8 Event Listener Lifecycle

```
Mount:   window.addEventListener("keydown", handleKeyDown)
Update:  Effect re-runs when [blockIndex, revealCount, lesson.blocks, onExit] change
         → Removes old listener, adds new listener with fresh closure
Unmount: window.removeEventListener("keydown", handleKeyDown)
```

**Critical detail:** The keydown handler is re-attached on every state change because it closes over `blockIndex` and `revealCount`. This prevents stale closure bugs.

### 3.9 Console Logging (PresentationStage)

| Event | Log Message |
|-------|-------------|
| Mount/Update | `[PresentationStage] Mount/Update - blockIndex: N, revealCount: N, maxReveal: N` |
| Listener attach | `[PresentationStage] Attaching keydown listener` |
| Listener remove | `[PresentationStage] Removing keydown listener` |
| Escape pressed | `[PresentationStage] Escape pressed, exiting` |
| Forward navigation | `[PresentationStage] Forward - revealCount: N, max: N` |
| Backward navigation | `[PresentationStage] Backward - revealCount: N` |
| Key handler error | `[PresentationStage] Key handler error: {err}` |
| computeMaxReveal error | `[PresentationStage] Error computing max reveal: {err}` |

---

## 4. PROGRESSIVE MATH ENGINE

**File:** `src/components/ProgressiveAlignedEquation.tsx`
**Props:** `{ equationString: string, revealCount: number, displayMode?: "block" | "inline" }`

### 4.1 Architecture Overview

```
equationString (raw LaTeX)
        │
        ▼
  ┌─────────────────┐
  │ smartSplitLines  │  Splits on \\ (outside groups/environments)
  │                  │  Returns string[] (one per aligned line)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ parseEquation    │  Recursive descent parser
  │ per line         │  Returns ASTNode[] per line
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ totalReveal      │  Computes reveal weight for each node
  │ per node         │  (structural=1, text=1, commands=1+args...)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ lineTotals       │  Sum of reveal weights per line
  │                  │  e.g., [15, 12, 8, 10]
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ counts           │  Distributed revealCount across lines
  │                  │  e.g., revealCount=20 → [15, 5, 0, 0]
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ renderNodes      │  Walks AST, renders revealed nodes,
  │ per line         │  wraps unrevealed nodes in \phantom{}
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ katex.renderTo   │  Converts LaTeX to HTML
  │ String           │  trust: true, throwOnError: false
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ dangerouslySet   │  Renders HTML into DOM
  │ InnerHTML        │  #active-reveal-target triggers CSS animation
  └─────────────────┘
```

### 4.2 AST Node Types (7 types)

| Type | Fields | Example |
|------|--------|---------|
| `TextNode` | `text`, `weight?` | `"x"`, `"2"` |
| `FixedNode` | `text`, `weight?` | `"\\frac"`, `"&"`, `"\\qquad"` |
| `CommandNode` | `command`, `optionalArg`, `args[]`, `weight?` | `\frac{a}{b}`, `\sqrt{x}` |
| `ScriptedNode` | `base`, `sub?`, `sup?`, `weight?` | `x^{2}`, `a_{1}` |
| `GroupNode` | `children[]`, `weight?` | `{a + b}` |
| `EnvironmentNode` | `env`, `envConfig?`, `content[]`, `weight?` | `\begin{array}{cc}...\end{array}` |
| `LeftRightNode` | `left`, `content[]`, `right`, `weight?` | `\left[x\right]` |

### 4.3 Command Signature Registry

The parser knows 36 LaTeX commands with their argument counts:

| Category | Commands | Args |
|----------|----------|------|
| Fractions/Binomials | `frac`, `dfrac`, `tfrac`, `cfrac`, `binom`, `dbinom` | 2 |
| Decorations | `overset`, `underset`, `stackrel` | 2 |
| Structural | `rule` | 2 |
| Color | `color`, `textcolor` | 2 |
| Bounding | `boxed`, `cancel`, `smash` | 1 |
| Roots | `sqrt` | 1 |
| Font styles | `mathbf`, `mathit`, `mathrm`, `mathbb`, `mathcal`, `boldsymbol`, `mathscr`, `mathfrak`, `mathsf`, `mathtt` | 1 |
| Accents | `hat`, `vec`, `tilde`, `bar`, `overline`, `underline`, `underbrace`, `overbrace`, `check`, `breve`, `acute`, `grave`, `ddot`, `mathring`, `overrightarrow` | 1 |
| Text/Hspace | `text`, `operatorname`, `hspace`, `vspace` | 1 |
| Zero-arg | `sum`, `prod`, `int`, `lim` | 0 |

**Special command sets:**
- `structuralCommands`: Commands that do not get progressive reveal (always fully rendered) — `text`, `hspace`, `vspace`, `rule`, `operatorname`
- `literalFirstArgCommands`: First argument always fully visible — `color`, `textcolor`
- `boundingCommands`: Bypass phantom wrapping — `cancel`, `boxed`, `smash`
- `spacingCommands`: Weight=0 (no reveal cost) — `quad`, `qquad`, `,`, `;`, `:`, `!`, ` `, `enspace`, `thinspace`, `choose`, `over`

### 4.4 The Reveal Algorithm — `renderNode()`

```
For each AST node:
  1. If revealCount <= 0 AND node is not structural zero AND not bypass:
     → Wrap entire node in \phantom{renderNodeFull(node)}
     → used = 0 (node was not counted against reveal budget)

  2. If node IS revealed (revealCount > 0):
     → Render node normally
     → Mark the "frontier token" with \htmlId{active-reveal-target}{...}
       (the token where revealCount transitions from being consumed)
     → used = node's weight (deducted from reveal budget)

  3. The frontier token is the LAST token rendered on the LAST line
     that received any reveal budget.
```

### 4.5 Progressive Reveal Walkthrough

For the equation `x^2 + 7x + 12 = 0`:

```
revealCount = 0:
  \phantom{x^{2}} \phantom{+} \phantom{7x} \phantom{+} \phantom{12} \phantom{=} \phantom{0}

revealCount = 1:
  \htmlId{active-reveal-target}{x}^{2} \phantom{+} \phantom{7x} \phantom{+} \phantom{12} \phantom{=} \phantom{0}

revealCount = 2:
  x^{2} \htmlId{active-reveal-target}{+} \phantom{7x} \phantom{+} \phantom{12} \phantom{=} \phantom{0}

... (continues for each token)

revealCount = 6:
  x^{2} + 7x + 12 = \htmlId{active-reveal-target}{0}
```

The `\htmlId{active-reveal-target}{...}` wrapper triggers the CSS chalk-reveal animation on the most recently revealed token.

### 4.6 The Chalkboard Animation

```css
@keyframes chalk-reveal {
  0%   { opacity: 0; transform: scale(0.92); text-shadow: 0 0 0 transparent; }
  60%  { opacity: 1; transform: scale(1.03); text-shadow: 0 0 12px rgba(168, 230, 207, 0.8); }
  100% { opacity: 1; transform: scale(1);    text-shadow: 0 0 6px rgba(168, 230, 207, 0.4); }
}

#active-reveal-target {
  animation: chalk-reveal 0.35s ease-out both;
  display: inline-block;
  color: #e8f5e9;
}
```

Effect: The newly revealed token pops in with a slight scale-up, a soft green glow, and settles into place — mimicking chalk appearing on a blackboard.

### 4.7 Parser Edge Cases Handled

| Edge Case | How Handled |
|-----------|-------------|
| Nested environments (aligned inside array) | `envDepth` counter tracks nesting; `\\` only splits at depth 0 |
| `\left...\right` spanning multiple lines | `lrDepth` counter prevents splitting inside left-right pairs |
| Escaped braces `\{` `\}` | `\\` before `{` or `}` treats them as literal text, not group delimiters |
| Unmatched `\begin`/`\end` | `endIdx === -1` fallback: environment is parsed as a fixed text node |
| `\right` without `\left` | Falls back to rendering as fixed text |
| Optional arguments `\sqrt[3]{x}` | Parsed via `[...]` detection before required args |
| Environment configs (`{cc}`, `{rl}`) | Detected for `array`, `tabular`, `alignat` environments |
| Superscript/subscript chaining (`x_{1}^{2}`) | ScriptedNode with both sub and sup on same base; propagates through `prev` unwinding |
| Zero-weight tokens (spaces, `&`, `\\`) | `weight: 0` — consumed without counting against reveal budget |
| Unicode characters | Passed through as `text` nodes |

### 4.8 Render Edge Cases Handled

| Edge Case | How Handled |
|-----------|-------------|
| Phantom wrapping structural commands | Bypassed — `\text{hello}` always fully visible |
| Phantom wrapping color commands | `\textcolor{red}{x}` — color name always visible, content progressively revealed |
| Phantom wrapping environments | Bypassed — `\begin{array}...\end{array}` always visible as structure |
| Nested phantom groups | `phantomBuffer` accumulates unrevealed nodes, flushes as single `\phantom{}` |
| Group nodes: `{a+b}` | `renderNodeFull` on group content joins without outer braces |
| Empty equation string | Returns empty string, KaTeX renders nothing |
| KaTeX render failure | `throwOnError: false` → KaTeX renders error span; caught by try/catch → fallback HTML in red |

### 4.9 Console Logging (ProgressiveAlignedEquation)

| Event | Log |
|-------|-----|
| Mount/Update | `[ProgressiveAlignedEquation] Mount/Update - equationString: {first60chars}, revealCount: N, displayMode: mode` |
| Tokenization start | `[ProgressiveAlignedEquation] Tokenizing equation` |
| Lines split | `[ProgressiveAlignedEquation] Split into N lines` |
| Line totals | `[ProgressiveAlignedEquation] Line totals: [N, N, ...]` |
| Distributed counts | `[ProgressiveAlignedEquation] Distributed counts: [N, N, ...] remaining: N` |
| Frontier line | `[ProgressiveAlignedEquation] Frontier line index: N` |
| Final LaTeX | `[ProgressiveAlignedEquation] Final LaTeX length: N` |
| KaTeX success | `[ProgressiveAlignedEquation] KaTeX rendered successfully, HTML length: N` |
| KaTeX error | `[ProgressiveAlignedEquation] KaTeX rendering error: {err}` |

---

## 5. DATA LAYER

**File:** `src/data/types.ts`

### 5.1 Type Definitions

```typescript
type BlockType = "heading" | "text" | "image" | "math";

interface LessonBlock {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;       // Optional, only used when type === "image"
}

interface Lesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
}
```

### 5.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA FLOW                                │
│                                                              │
│  LessonPlanner                                               │
│    │                                                         │
│    │ onSaveAndPresent(lesson)                                │
│    ▼                                                         │
│  App.tsx                                                     │
│    │ setSavedLesson(lesson)                                   │
│    │ setView("presentation")                                  │
│    ▼                                                         │
│  PresentationStage                                           │
│    │ props: { lesson, onExit }                                │
│    │                                                         │
│    │ For each block:                                          │
│    │   heading → <h1>                                        │
│    │   text    → <p>                                         │
│    │   image   → <img src={imageUrl} alt={content}>          │
│    │   math    → <ProgressiveAlignedEquation                 │
│    │                equationString={content}                  │
│    │                revealCount={revealCount} />              │
│    ▼                                                         │
│  ProgressiveAlignedEquation                                   │
│    │ Parses LaTeX → AST → progressive render → KaTeX HTML    │
│    ▼                                                         │
│  Rendered in browser                                         │
│                                                              │
│  ═══════════════════ PERSISTENCE ═══════════════════════     │
│                                                              │
│  localStorage("saved_lesson")                                 │
│    ▲ Write: LessonPlanner.handleSave()                       │
│    ▼ Read:  App.useEffect() + LessonPlanner.useEffect()      │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. ERROR HANDLING AUDIT

### 6.1 Try/Catch Coverage

| Location | Operation | Catch Behavior |
|----------|-----------|----------------|
| `App.tsx:13-25` | `localStorage.getItem` + `JSON.parse` | Logs error, sets null state, renders planner |
| `LessonPlanner.tsx:276-293` | `localStorage.getItem` + `JSON.parse` | Logs error, falls back to SEED_LESSON |
| `LessonPlanner.tsx:323-333` | `JSON.stringify` lesson | Logs error, still calls onSaveAndPresent |
| `LessonPlanner.tsx:326-330` | `localStorage.setItem` | Logs error, still calls onSaveAndPresent |
| `PresentationStage.tsx:10-24` | `computeMaxReveal` (parsing) | Logs error, returns 1 |
| `PresentationStage.tsx:50-92` | `handleKeyDown` body | Logs error, key event swallowed |
| `ProgressiveAlignedEquation.tsx:483-494` | `katex.renderToString` | Logs error, returns fallback HTML |

### 6.2 Error States Visible to User

| Error | User Sees |
|-------|-----------|
| Corrupted localStorage on App mount | LessonPlanner with seed lesson (no crash) |
| Corrupted localStorage on LessonPlanner mount | Seed lesson loaded instead |
| localStorage quota exceeded on save | Lesson still transitions to presentation (in-memory) |
| Broken image URL | Browser's native broken image icon |
| KaTeX render error | Red monospace text: "Render Error: Check Console" |
| Empty lesson | "No blocks to present. Press Escape to exit." |
| computeMaxReveal parse error | Block treated as non-math (revealCount = 1) |

### 6.3 Defensive Design Patterns

1. **localStorage dual-read:** Both App and LessonPlanner read localStorage independently. If App's read fails, LessonPlanner's read succeeds (different timing/mount order doesn't matter).
2. **Save-then-transition:** `handleSave` calls `onSaveAndPresent(lesson)` in the same synchronous block, after localStorage.setItem. If storage fails, the in-memory lesson is still passed to PresentationStage.
3. **SEED_LESSON as ultimate fallback:** If both localStorage and JSON parsing fail, the module-level constant ensures the app always has content.
4. **Event listener re-attachment:** The keydown handler is re-bound on every state change so the closure always has current `blockIndex` and `revealCount`.

---

## 7. TESTING AUDIT

### 7.1 Test Files (5 files, 43 tests, all passing)

| File | Tests | Focus |
|------|-------|-------|
| `src/data/types.test.ts` | 4 | TypeScript type compilation verification |
| `src/components/ProgressiveAlignedEquation.test.tsx` | 5 | Mount, reveal boundaries, empty string, inline mode, output change |
| `src/views/LessonPlanner.test.tsx` | 10 | Seed render, add blocks, imageUrl visibility, save flow, localStorage error, edit content, block count |
| `src/views/PresentationStage.test.tsx` | 18 | All 4 block types, empty lesson, forward/backward nav, boundary guards, escape, reveal inc/dec, block counter, exit button |
| `src/App.test.tsx` | 7 | Default render, planner→presentation, presentation→planner, full cycle, corrupted localStorage, missing key, valid pre-load |

### 7.2 Test Infrastructure

- **Framework:** Vitest 2.1.9 with jsdom 25 environment
- **React Testing:** @testing-library/react 16.3.2, @testing-library/user-event 14.5.2, @testing-library/jest-dom 6.6.3
- **KaTeX Mock:** All test files mock `katex` with `vi.mock('katex', () => ({ default: { renderToString: vi.fn(() => '<span class="katex-mock">rendered math</span>') } }))`
- **localStorage Mock:** Replaced per-test with custom mock functions

### 7.3 What's Tested vs. What's Not

**Tested:**
- All component mounts without crashing
- All block type additions
- All keyboard navigation paths
- All boundary conditions (first block, last block, reveal=0, reveal=max)
- localStorage error survival
- JSON parse error survival
- Block content editing
- Image URL field visibility
- Block counter accuracy

**Not tested (manual verification only):**
- Actual KaTeX rendering output (mocked)
- Visual appearance of chalkboard animation
- Browser paint performance with large equations
- Touch/mobile interaction
- Screen reader accessibility
- Network-dependent image loading behavior

---

## 8. CONFIGURATION & INFRASTRUCTURE

### 8.1 Build Stack

| Tool | Version | File |
|------|---------|------|
| Vite | 6.0.7 | `vite.config.ts` |
| React | 19.2.6 | `package.json` |
| TypeScript | 6.0.2 | `tsconfig.app.json` |
| Tailwind CSS | 3.4.19 | `tailwind.config.js`, `postcss.config.mjs` |
| Vitest | 2.1.9 | `vite.config.ts` (inline config) |
| ESLint | 10.3.0 | `eslint.config.js` |
| KaTeX | 0.16.47 | `package.json` |

### 8.2 TypeScript Configuration

**Key compiler options:**
- `target: es2023` — modern JS output
- `module: esnext` — ESM
- `moduleResolution: bundler` — Vite bundler resolution
- `verbatimModuleSyntax: true` — requires `import type` for type-only imports (critical: caused Bug 1)
- `jsx: react-jsx` — automatic JSX runtime
- `noUnusedLocals: true` — blocks unused variables
- `noUnusedParameters: true` — blocks unused function parameters
- `erasableSyntaxOnly: true` — enforces that all TypeScript syntax is erasable

### 8.3 Tailwind Configuration

```javascript
// tailwind.config.js
content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
// Critical: without this, Tailwind generates ZERO utility classes (Bug 1 root cause)
```

### 8.4 ESLint Configuration

- Extends: `@eslint/js` recommended, TypeScript ESLint recommended, React Hooks, React Refresh
- Ignores: `dist/`
- Target: `**/*.{ts,tsx}` with browser globals

### 8.5 Available Scripts

```json
"dev": "vite"                    // Start dev server
"build": "tsc -b && vite build"  // Type check + bundle
"lint": "eslint ."               // Lint all files
"preview": "vite preview"        // Preview built output
```

Note: Testing is run via `npx vitest run --run` (not in package.json scripts).

---

## 9. KNOWN BUGS & FIXES (HISTORICAL)

### Bug 1: Blank Page in Browser (Fixed 2026-06-22)

**Root Cause 1:** Missing `tailwind.config.js` — Tailwind CSS v3.4.19 requires a `content` array. Without it, zero utility classes generated, all styled elements invisible.
**Fix:** Created `tailwind.config.js` with `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`.

**Root Cause 2:** `verbatimModuleSyntax` violation — `PresentationStage.tsx` imported `Lesson` and `LessonBlock` as value imports, but they're type-only exports from `types.ts`. The browser's ESM loader rejected the non-existent exports.
**Fix:** Changed to `import type { Lesson, LessonBlock }`.

### Bug 2: Red Text in Math Rendering (Fixed 2026-06-22)

**Root Cause 1:** Missing `import "katex/dist/katex.min.css"` — without KaTeX CSS, no fonts/layout/styling applied to rendered math. `.katex-error` class defaults to red.
**Fix:** Added the CSS import to `ProgressiveAlignedEquation.tsx`.

**Root Cause 2:** No explicit text color on math container — on dark `bg-gray-950` presentation background, even correct white KaTeX text was invisible.
**Fix:** Added `text-white` class to the math container div.

### Bug 3: Line Separator Regression (Fixed 2026-06-22)

**Root Cause:** Sprint 2 collapsed `\\[1.5em]` line separator to `\\`, causing zero vertical gap between aligned lines.
**Fix:** Restored `\\[1.5em]` in `renderNodes` join operation.

---

## 10. CURRENT LIMITATIONS & DESIGN GAPS

### 10.1 Application Limitations

| Limitation | Impact |
|------------|--------|
| No block deletion | Users cannot remove blocks from a lesson — only add and edit |
| No block reordering | Blocks are fixed in creation order |
| No undo/redo in planner | No history stack for edits |
| No validation of LaTeX syntax at input time | Invalid LaTeX only discovered during presentation |
| No image upload — URL only | Users must host images externally |
| No lesson management (multiple lessons) | Only one lesson in localStorage at a time |
| No export to file | Lesson data trapped in localStorage |
| No import from file | Must use seed lesson or manually recreate |
| No search/filter in planner | Scrolling through 38+ blocks is the only way to navigate |
| HTML title is hardcoded | `<title>vite-temp</title>` — not dynamic |
| No loading states | Image loading has no spinner/placeholder |
| No responsive breakpoints | Planner has max-w-2xl which constrains on large screens |
| No print layout | No CSS for printing lessons |

### 10.2 Progressive Engine Limitations

| Limitation | Impact |
|------------|--------|
| Only supports `aligned` environment wrapping | Other math environments not tested |
| No `\begin{cases}` support | Piecewise functions not renderable |
| No `\begin{matrix}` without aligned wrapper | Matrices require `aligned` workaround |
| assumes `\begin{aligned}` wrapper | Does not auto-detect other align environments at PresentationStage level |
| KaTeX `trust: true` has security implications | Malicious LaTeX could inject HTML (acceptable for author-owned content) |
| 36 commands registered | Some obscure LaTeX commands may not parse correctly |
| No tikz/pgf support | Cannot render complex diagrams from LaTeX |

### 10.3 Presentation Limitations

| Limitation | Impact |
|------------|--------|
| Single presenter view | No audience/second-screen mode |
| Keyboard-only navigation | No on-screen navigation buttons (except Exit) |
| No presentation timer | Cannot track lesson duration |
| No slide overview/thumbnails | Cannot jump to specific block |
| No annotation/drawing overlay | Cannot "write on" slides during presentation |
| No laser pointer/highlight | Cannot draw attention to specific regions |
| No speaker notes | Author cannot add private notes visible only to presenter |

### 10.4 Missing Features (Video/AI Narration)

The current application is a **live presentation tool**. It does not have:
- Text-to-speech narration generation
- Automatic timing of progressive reveals
- Video recording/export
- AI-generated teaching scripts
- Image diagram explanation via vision models
- Knowledge graph for cross-referencing concepts

These are documented in the video recording architecture discussions but not implemented.

---

## 11. FUTURE SPRINT POSSIBILITIES

Based on the complete audit, here are natural next sprints:

### Sprint 6: Lesson Editor Hardening
- Block delete (with confirmation)
- Block reorder (drag-and-drop or up/down buttons)
- Undo/redo stack
- LaTeX preview inline (render math as you type)
- Image URL validation (pre-flight HEAD request)
- Duplicate block button

### Sprint 7: Multi-Lesson Management
- Lesson list view (multiple named lessons in localStorage)
- Create new / duplicate / delete lesson
- Export lesson as JSON file
- Import lesson from JSON file
- Lesson metadata (author, date, description, tags)

### Sprint 8: Presentation Enhancements
- On-screen navigation controls (prev/next buttons, block thumbnails)
- Presentation timer
- Speaker notes field on each block
- Annotation overlay (draw on slides)
- "Jump to block" dropdown
- Auto-advance mode (timer-based)

### Sprint 9: Print & Export
- Print CSS for lesson handouts
- Export lesson as PDF
- Export lesson as static HTML
- Generate slide thumbnails

### Sprint 10: Video Recording (Approach A — In-App)
- Add `narration` and `narrationSteps` fields to LessonBlock type
- TTS integration (ElevenLabs/Speechify API)
- Auto-advance mode synced to audio duration
- MediaRecorder capture of presentation viewport
- Audio+video composition (ffmpeg WASM)
- Export MP4

### Sprint 11: AI Teaching Pipeline (Approach B — External)
- Knowledge graph construction from lesson content
- Multi-agent LLM pipeline (Teaching Plan, Vision, Narration, Validation agents)
- Audio-tagged narration script generation
- Word-level reveal timing synchronization
- Playwright recording scripts
- Full video production pipeline

---

## 12. FILE REFERENCE INDEX

| File | Purpose | Lines |
|------|---------|-------|
| `index.html` | HTML entry point | 13 |
| `src/main.tsx` | React mount | 10 |
| `src/App.tsx` | Root component, view routing | 51 |
| `src/App.test.tsx` | App integration tests | 104 |
| `src/data/types.ts` | TypeScript type definitions | 14 |
| `src/data/types.test.ts` | Type compilation tests | 46 |
| `src/components/ProgressiveAlignedEquation.tsx` | Progressive reveal math engine | ~595 |
| `src/components/ProgressiveAlignedEquation.test.tsx` | Math engine tests | 69 |
| `src/views/LessonPlanner.tsx` | Lesson authoring interface | 409 |
| `src/views/LessonPlanner.test.tsx` | Planner tests | 150 |
| `src/views/PresentationStage.tsx` | Presentation viewport + keyboard nav | 174 |
| `src/views/PresentationStage.test.tsx` | Presentation tests | 212 |
| `src/index.css` | Tailwind + chalkboard animations | 31 |
| `tailwind.config.js` | Tailwind content paths | 11 |
| `postcss.config.mjs` | PostCSS plugins | 6 |
| `vite.config.ts` | Vite + Vitest config | 11 |
| `tsconfig.json` | TS project references | 7 |
| `tsconfig.app.json` | TS app compiler options | 25 |
| `tsconfig.node.json` | TS node compiler options | — |
| `eslint.config.js` | ESLint flat config | 22 |
| `package.json` | Dependencies + scripts | 40 |
| `.gitignore` | Git ignore rules | 24 |
| `.claude/settings.local.json` | Claude Code permissions | 8 |
| `CLAUDE.md` | Project instructions for Claude | — |
| `SPRINTS.md` | Sprint roadmap | — |
| `STATUS.md` | Current project status | — |
| `SEED-ENGINE.txt` | Reference implementation | — |
| `README.md` | Vite template readme | 73 |
| `public/favicon.svg` | Site favicon | — |
| `public/icons.svg` | SVG icons sprite | — |
| `src/assets/hero.png` | Hero image asset | — |
| `src/assets/react.svg` | React logo | — |
| `src/assets/vite.svg` | Vite logo | — |

---

## 13. CONSOLE LOG PREFIX INDEX

For debugging: every component uses a distinct prefix:

| Prefix | File |
|--------|------|
| `[App]` | `src/App.tsx` |
| `[LessonPlanner]` | `src/views/LessonPlanner.tsx` |
| `[PresentationStage]` | `src/views/PresentationStage.tsx` |
| `[ProgressiveAlignedEquation]` | `src/components/ProgressiveAlignedEquation.tsx` |

---

*Document version: 1.0 | Generated: 2026-06-24 | App version: Sprint 5 Complete*
