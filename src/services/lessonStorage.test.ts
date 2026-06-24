import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadLibrary,
  saveLibrary,
  createLesson,
  deleteLesson,
  duplicateLesson,
  updateLesson,
  getActiveLesson,
} from './lessonStorage';
import type { LessonLibrary } from '../data/types';

function mockLocalStorage(getItemImpl: (key: string) => string | null) {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) =>
        getItemImpl ? getItemImpl(key) : store[key] ?? null,
      ),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    },
    writable: true,
  });
}

function libraryWithLessons(count: number): LessonLibrary {
  const lessons = Array.from({ length: count }, (_, i) => ({
    id: `lesson-${i + 1}`,
    title: `Lesson ${i + 1}`,
    blocks: [],
    lastModified: new Date().toISOString(),
  }));
  return { lessons, activeLessonId: lessons[0]?.id ?? '' };
}

describe('lessonStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadLibrary', () => {
    it('creates seed library on fresh start', () => {
      mockLocalStorage(() => null);
      const library = loadLibrary();
      expect(library.lessons.length).toBe(1);
      expect(library.lessons[0].title).toContain('Quadratic Equations');
      expect(library.activeLessonId).toBe(library.lessons[0].id);
    });

    it('migrates from old saved_lesson key', () => {
      const oldLesson = JSON.stringify({ id: 'old-1', title: 'My Old Lesson', blocks: [] });
      mockLocalStorage((key: string) => {
        if (key === 'saved_lesson') return oldLesson;
        return null;
      });
      const library = loadLibrary();
      expect(library.lessons.length).toBe(1);
      expect(library.lessons[0].title).toBe('My Old Lesson');
    });

    it('survives corrupted old key', () => {
      mockLocalStorage((key: string) => {
        if (key === 'saved_lesson') return '{not valid json[[[';
        return null;
      });
      const library = loadLibrary();
      expect(library.lessons.length).toBe(1);
      expect(library.lessons[0].title).toContain('Quadratic Equations');
    });

    it('survives corrupted lesson_library key', () => {
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return '{broken';
        return null;
      });
      const library = loadLibrary();
      expect(library.lessons.length).toBe(1);
      expect(library.lessons[0].title).toContain('Quadratic Equations');
    });

    it('reads existing lesson_library', () => {
      const lib = libraryWithLessons(2);
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return JSON.stringify(lib);
        return null;
      });
      const loaded = loadLibrary();
      expect(loaded.lessons.length).toBe(2);
      expect(loaded.lessons[0].title).toBe('Lesson 1');
    });
  });

  describe('saveLibrary', () => {
    it('writes to localStorage', () => {
      const setItemSpy = vi.fn();
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: vi.fn(() => null), setItem: setItemSpy },
        writable: true,
      });
      const lib = libraryWithLessons(1);
      saveLibrary(lib);
      expect(setItemSpy).toHaveBeenCalledWith('lesson_library', expect.any(String));
    });
  });

  describe('createLesson', () => {
    it('adds lesson to library with title', () => {
      const lib = libraryWithLessons(1);
      const { library, lesson } = createLesson('New Lesson', lib);
      expect(library.lessons.length).toBe(2);
      expect(lesson.title).toBe('New Lesson');
      expect(lesson.blocks).toEqual([]);
      expect(lesson.lastModified).toBeTruthy();
      expect(library.activeLessonId).toBe(lesson.id);
    });

    it('falls back to Untitled Lesson on empty title', () => {
      const lib = libraryWithLessons(0);
      const { lesson } = createLesson('', lib);
      expect(lesson.title).toBe('Untitled Lesson');
    });
  });

  describe('deleteLesson', () => {
    it('removes lesson from library', () => {
      const lib = libraryWithLessons(3);
      const result = deleteLesson(lib, 'lesson-2');
      expect(result.lessons.length).toBe(2);
      expect(result.lessons.map(l => l.id)).toEqual(['lesson-1', 'lesson-3']);
    });

    it('reassigns activeLessonId when deleting active', () => {
      const lib = { ...libraryWithLessons(2), activeLessonId: 'lesson-1' };
      const result = deleteLesson(lib, 'lesson-1');
      expect(result.activeLessonId).toBe('lesson-2');
    });

    it('sets activeLessonId to empty when no lessons remain', () => {
      const lib = libraryWithLessons(1);
      const result = deleteLesson(lib, 'lesson-1');
      expect(result.activeLessonId).toBe('');
    });
  });

  describe('duplicateLesson', () => {
    it('deep-clones with new id and Copy suffix', () => {
      const lib = libraryWithLessons(1);
      const result = duplicateLesson(lib, 'lesson-1');
      expect(result.lessons.length).toBe(2);
      expect(result.lessons[1].title).toBe('Lesson 1 (Copy)');
      expect(result.lessons[1].id).not.toBe('lesson-1');
      expect(result.activeLessonId).toBe(result.lessons[1].id);
    });

    it('returns unchanged library for unknown lesson id', () => {
      const lib = libraryWithLessons(1);
      const result = duplicateLesson(lib, 'nonexistent');
      expect(result.lessons.length).toBe(1);
    });
  });

  describe('updateLesson', () => {
    it('updates lesson and sets lastModified', () => {
      const lib = libraryWithLessons(1);
      const updated = { ...lib.lessons[0], title: 'Updated Title', blocks: [{ id: 'b1', type: 'text' as const, content: 'hi' }] };
      const result = updateLesson(lib, updated);
      expect(result.lessons[0].title).toBe('Updated Title');
      expect(result.lessons[0].lastModified).toBeTruthy();
      expect(result.activeLessonId).toBe('lesson-1');
    });

    it('does not mutate unrelated lessons', () => {
      const lib = libraryWithLessons(2);
      const updated = { ...lib.lessons[0], title: 'Changed' };
      const result = updateLesson(lib, updated);
      expect(result.lessons[1].title).toBe('Lesson 2');
    });
  });

  describe('getActiveLesson', () => {
    it('returns lesson matching activeLessonId', () => {
      const lib = libraryWithLessons(2);
      const active = getActiveLesson(lib);
      expect(active?.id).toBe('lesson-1');
    });

    it('falls back to first lesson when activeLessonId not found', () => {
      const lib = { ...libraryWithLessons(2), activeLessonId: 'deleted-id' };
      const active = getActiveLesson(lib);
      expect(active?.id).toBe('lesson-1');
    });

    it('returns null for empty library', () => {
      const active = getActiveLesson({ lessons: [], activeLessonId: '' });
      expect(active).toBeNull();
    });
  });
});
