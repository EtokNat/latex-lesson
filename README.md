# Math Presentation Studio

An AI-powered math lesson authoring and video recording platform. Create rich math lessons with progressive reveal, generate AI narration, synthesize speech, and produce professional teaching videos — all from the browser.

## Features

- **Lesson Authoring** — Block-based editor with math (LaTeX), text, images, and headings. Live KaTeX preview and image URL validation.
- **Progressive Reveal Engine** — Custom AST parser that reveals math equations step-by-step, synchronizing on-screen content with spoken narration.
- **Multi-Lesson Management** — Create, duplicate, import/export lessons as JSON. LocalStorage persistence with automatic migration.
- **Knowledge Graph Engine** — Automatic concept extraction and edge inference. Relevance queries for cross-referencing concepts during narration.
- **Multi-Agent LLM Narration** — Teaching plan, vision analysis, narration script, and validation agents produce pedagogically sound narration with emotional audio tags.
- **TTS & Timing Engine** — Text-to-speech with word-level timestamps. Math-to-speech preprocessing. Absolute timeline with zero drift.
- **Recording Pipeline** — Playwright-based browser automation. DOM stabilization, checkpoint/resume, ffmpeg composition, and post-recording verification.
- **Live Presentation** — Dark mode viewport with keyboard navigation. On-screen controls, speaker notes panel, presentation timer, and auto-advance mode.
- **Print & Export** — Print-ready PDF layout with professional typography. Self-contained static HTML export for sharing or LMS upload.

## Quick Start

```bash
npm install
npm run dev        # Start dev server at http://localhost:5173
npm run test       # Run full test suite
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Run all tests (vitest) |
| `npm run preview` | Preview production build |
| `npx tsx scripts/cli.ts --lesson seed --output output/lesson.mp4` | Record a video |

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 3
- **Math Rendering:** KaTeX with custom AST progressive reveal engine
- **Testing:** Vitest, Testing Library, jsdom
- **Recording:** Playwright (headless Chromium), ffmpeg, tsx
- **AI Pipeline:** Pluggable LLM client (Claude/GPT-4o), pluggable TTS client (ElevenLabs)

## Project Structure

```
src/
  data/           Type definitions, seed lesson
  components/     ProgressiveAlignedEquation (math engine)
  views/          LessonPlanner, PresentationStage, LessonList, SpeakerNotes
  services/       Business logic (storage, KG, agents, TTS, timing, export)
    agents/       LLM agents (teaching plan, vision, narration, validation)
scripts/          Recording pipeline (Playwright, ffmpeg, CLI)
```

## Test Suite

330+ tests across 34 test files covering types, components, services, agents, and recording scripts.

## Architecture

The pipeline from lesson to video:
1. **Author** lesson in the planner (or import JSON)
2. **Knowledge Graph** extracts concepts and infers relationships
3. **LLM Agents** generate pedagogically sound narration with emotional tags
4. **TTS Engine** converts narration to speech with precise word timestamps
5. **Timeline Builder** creates an absolute timeline of reveal events
6. **Playwright** records the browser presentation synced to audio
7. **ffmpeg** composites screen recording + audio into final MP4

## License

MIT
