import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportLesson, importLessonFromFile } from './lessonImportExport';
import type { Lesson } from '../data/types';

const makeLesson = (overrides?: Partial<Lesson>): Lesson => ({
  id: 'test-1',
  title: 'Test Lesson',
  blocks: [{ id: 'b1', type: 'text', content: 'Hello' }],
  lastModified: '2026-06-24T00:00:00.000Z',
  ...overrides,
});

describe('lessonImportExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportLesson', () => {
    it('creates a download link and triggers click', () => {
      const lesson = makeLesson();
      const clickSpy = vi.fn();
      const appendChildSpy = vi.fn();
      const removeChildSpy = vi.fn();
      const createObjectURLSpy = vi.fn(() => 'blob:fake-url');
      const revokeObjectURLSpy = vi.fn();

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          el.click = clickSpy;
        }
        return el;
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(appendChildSpy);
      vi.spyOn(document.body, 'removeChild').mockImplementation(removeChildSpy);
      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLSpy,
        revokeObjectURL: revokeObjectURLSpy,
      });

      exportLesson(lesson);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('handles export errors gracefully', () => {
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('DOM error');
      });
      expect(() => exportLesson(makeLesson())).not.toThrow();
      vi.restoreAllMocks();
    });
  });

  describe('importLessonFromFile', () => {
    it('resolves with Lesson for valid JSON file', async () => {
      const lesson = makeLesson();
      const json = JSON.stringify(lesson);
      const file = new File([json], 'test.json', { type: 'application/json' });

      const result = await importLessonFromFile(file);
      expect(result.id).toBe('test-1');
      expect(result.title).toBe('Test Lesson');
      expect(result.blocks).toHaveLength(1);
    });

    it('rejects with error for invalid JSON', async () => {
      const file = new File(['{not valid json'], 'test.json', { type: 'application/json' });

      await expect(importLessonFromFile(file)).rejects.toThrow('Invalid JSON file');
    });

    it('rejects when missing id field', async () => {
      const lesson = makeLesson();
      const { id, ...withoutId } = lesson;
      const file = new File([JSON.stringify(withoutId)], 'test.json', { type: 'application/json' });

      await expect(importLessonFromFile(file)).rejects.toThrow("missing required field 'id'");
    });

    it('rejects when missing title field', async () => {
      const lesson = makeLesson();
      const { title, ...withoutTitle } = lesson;
      const file = new File([JSON.stringify({ ...withoutTitle, id: 'x' })], 'test.json', { type: 'application/json' });

      await expect(importLessonFromFile(file)).rejects.toThrow("missing required field 'title'");
    });

    it('rejects when blocks is not an array', async () => {
      const file = new File([JSON.stringify({ id: 'x', title: 'T', blocks: 'not-an-array' })], 'test.json', { type: 'application/json' });

      await expect(importLessonFromFile(file)).rejects.toThrow("missing required field 'blocks'");
    });

    it('warns on missing optional fields', async () => {
      const lesson = makeLesson();
      const { lastModified, ...withoutOptional } = lesson;
      const file = new File([JSON.stringify(withoutOptional)], 'test.json', { type: 'application/json' });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await importLessonFromFile(file);
      expect(result.title).toBe('Test Lesson');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
