/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runPreflight } from '../preflight';
import type { Lesson } from '../../src/data/types';

const originalFetch = globalThis.fetch;

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'test-lesson-1',
    title: 'Test Lesson',
    blocks: [
      { id: 'b1', type: 'heading', content: 'Introduction' },
      { id: 'b2', type: 'text', content: 'Some text' },
      { id: 'b3', type: 'math', content: 'x^2 + y^2 = z^2' },
      {
        id: 'b4',
        type: 'image',
        content: 'A test image',
        imageUrl: 'https://example.com/image.png',
      },
    ],
    lastModified: '2026-01-01',
    ...overrides,
  };
}

describe('runPreflight', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('passes all checks for a valid lesson with reachable resources', async () => {
    const lesson = makeLesson();
    const result = await runPreflight(lesson, 'http://localhost:5173');

    expect(result.passed).toBe(true);
    expect(result.checks).toHaveLength(4);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('fails lesson structure check when id is missing', async () => {
    const lesson = makeLesson({ id: '' });
    const result = await runPreflight(lesson, 'http://localhost:5173');
    const structureCheck = result.checks.find((c) => c.name === 'Lesson Structure');
    expect(structureCheck!.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('fails lesson structure check when blocks have missing fields', async () => {
    const lesson = makeLesson({
      blocks: [{ id: '', type: 'text' as const, content: '' }],
    });
    const result = await runPreflight(lesson, 'http://localhost:5173');
    expect(result.passed).toBe(false);
  });

  it('fails image URL check when URLs are unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const lesson = makeLesson();
    const result = await runPreflight(lesson, 'http://localhost:5173');
    const imageCheck = result.checks.find((c) => c.name === 'Image URLs');
    expect(imageCheck!.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('fails dev server check when server is unreachable', async () => {
    // no image blocks → only fetch call is the dev server check
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
    const lesson = makeLesson({ blocks: [] });
    const result = await runPreflight(lesson, 'http://localhost:9999');
    const devCheck = result.checks.find((c) => c.name === 'Dev Server');
    expect(devCheck!.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('passes image check when there are no image blocks', async () => {
    const lesson = makeLesson({
      blocks: [{ id: 'b1', type: 'text', content: 'No images here' }],
    });
    const result = await runPreflight(lesson, 'http://localhost:5173');
    const imageCheck = result.checks.find((c) => c.name === 'Image URLs');
    expect(imageCheck!.passed).toBe(true);
    expect(imageCheck!.message).toBe('No image blocks');
  });

  it('passes LaTeX check when there are no math blocks', async () => {
    const lesson = makeLesson({
      blocks: [{ id: 'b1', type: 'text', content: 'No math' }],
    });
    const result = await runPreflight(lesson, 'http://localhost:5173');
    const latexCheck = result.checks.find((c) => c.name === 'LaTeX');
    expect(latexCheck!.passed).toBe(true);
  });
});
