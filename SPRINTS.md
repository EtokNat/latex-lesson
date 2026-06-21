# PROJECT ROADMAP: MATH PRESENTATION STUDIO

## SPRINT 1: Foundation & Types
- **Goal:** Initialize Vite + React + TS, setup Vitest/Tailwind, and define core types.
- **Tasks:**
  1. Initialize standard Vite app. Install `tailwindcss`, `katex`, `vitest`, `@testing-library/react`, `jsdom`. Update config.
  2. Create `src/data/types.ts`: `BlockType` ("heading"|"text"|"image"|"math"), `LessonBlock` (id, type, content, imageUrl?), and `Lesson` (id, title, blocks).
  3. Write `src/data/types.test.ts` to verify compilation.

## SPRINT 2: The Math Engine Integration
- **Goal:** Implement the progressive reveal engine using the provided seed code. Do NOT invent or hallucinate progressive reveal logic.
- **Tasks:**
  1. Read the exact custom AST parser code from `SEED_ENGINE.txt` located in the root directory. 
  2. Create `src/components/ProgressiveAlignedEquation.tsx` and copy the entire contents of `SEED_ENGINE.txt` into it exactly as written.
  3. Complete the React component at the bottom of the file: Ensure `ProgressiveAlignedEquation` accepts `equationString` (string) and `revealCount` (number) as props.
  4. Inside the component, use `useMemo` to parse the equation and `renderNodes()`, then render the output into a container using `katex.renderToString` with `{ trust: true }`. Add aggressive console logs.
  5. Write `src/components/ProgressiveAlignedEquation.test.tsx` ensuring it mounts cleanly without breaking the imported parser.

## SPRINT 3: The Lesson Planner
- **Goal:** Build the authoring interface with defensive state management.
- **Tasks:**
  1. Create `src/views/LessonPlanner.tsx`. Manage state array of `LessonBlock` items.
  2. Add Tailwind buttons to create different blocks. Form inputs for content/imageUrl.
  3. Add a "Save and Present" button that safely stringifies and saves to `localStorage('saved_lesson')` via try/catch, then triggers `onSaveAndPresent`.
  4. Write `src/views/LessonPlanner.test.tsx` mocking `localStorage` and testing block addition.

## SPRINT 4: The Presentation Stage
- **Goal:** Build the zero-distortion dark mode presentation viewport.
- **Tasks:**
  1. Create `src/views/PresentationStage.tsx` accepting `lesson` and `onExit` props.
  2. Track `blockIndex` and `revealCount` in state.
  3. Add global `keydown` listener: Space/ArrowRight (increment reveal/block), Backspace/ArrowLeft (decrement). Use try/catch and boundary limits.
  4. Render the active block (Text, Image, or the Math component). Style with `bg-gray-950` and white text.
  5. Write `src/views/PresentationStage.test.tsx` testing keyboard navigation state changes.

## SPRINT 5: App Orchestration & Styling
- **Goal:** Tie the router together and apply the chalkboard animations.
- **Tasks:**
  1. Update `src/App.tsx`. Read `localStorage('saved_lesson')` on mount inside try/catch. Route between `<LessonPlanner>` and `<PresentationStage>`.
  2. Add the Chalkboard CSS `@keyframes` and `#active-reveal-target` ID styling to `src/index.css`.
  3. Write `src/App.test.tsx` testing conditional routing.
