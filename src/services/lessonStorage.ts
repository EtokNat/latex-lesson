import type { Lesson, LessonLibrary } from '../data/types';
import { SEED_LESSON } from '../data/seedLesson';

const STORAGE_KEY = 'lesson_library';
const LEGACY_KEY = 'saved_lesson';

const generateLessonId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function loadLibrary(): LessonLibrary {
  console.log('[LessonStorage] Loading library from localStorage');
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: LessonLibrary = JSON.parse(raw);
      console.log('[LessonStorage] Loaded library with', parsed.lessons.length, 'lessons');
      return parsed;
    }
  } catch (err) {
    console.error('[LessonStorage] Failed to parse lesson_library:', err);
  }

  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const lesson: Lesson = JSON.parse(legacyRaw);
      console.log('[LessonStorage] Migrating from saved_lesson:', lesson.title);
      const library: LessonLibrary = {
        lessons: [lesson],
        activeLessonId: lesson.id,
      };
      saveLibraryRaw(library);
      localStorage.removeItem(LEGACY_KEY);
      console.log('[LessonStorage] Migration complete, removed legacy key');
      return library;
    }
  } catch (err) {
    console.error('[LessonStorage] Migration failed:', err);
  }

  console.log('[LessonStorage] No saved data, creating seed library');
  const library: LessonLibrary = {
    lessons: [{ ...SEED_LESSON, lastModified: new Date().toISOString() }],
    activeLessonId: SEED_LESSON.id,
  };
  saveLibraryRaw(library);
  return library;
}

function saveLibraryRaw(library: LessonLibrary): void {
  try {
    const json = JSON.stringify(library);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (err) {
    console.error('[LessonStorage] Failed to save library:', err);
  }
}

export function saveLibrary(library: LessonLibrary): void {
  console.log('[LessonStorage] Saving library with', library.lessons.length, 'lessons');
  saveLibraryRaw(library);
}

export function createLesson(
  title: string,
  library: LessonLibrary,
): { library: LessonLibrary; lesson: Lesson } {
  console.log('[LessonStorage] Creating lesson:', title);
  const lesson: Lesson = {
    id: generateLessonId(),
    title: title || 'Untitled Lesson',
    blocks: [],
    lastModified: new Date().toISOString(),
  };
  const updated: LessonLibrary = {
    lessons: [...library.lessons, lesson],
    activeLessonId: lesson.id,
  };
  return { library: updated, lesson };
}

export function deleteLesson(library: LessonLibrary, lessonId: string): LessonLibrary {
  console.log('[LessonStorage] Deleting lesson:', lessonId);
  const lessons = library.lessons.filter(l => l.id !== lessonId);
  let activeLessonId = library.activeLessonId;
  if (activeLessonId === lessonId) {
    activeLessonId = lessons.length > 0 ? lessons[0].id : '';
  }
  return { lessons, activeLessonId };
}

export function duplicateLesson(library: LessonLibrary, lessonId: string): LessonLibrary {
  console.log('[LessonStorage] Duplicating lesson:', lessonId);
  const idx = library.lessons.findIndex(l => l.id === lessonId);
  if (idx < 0) return library;
  const original = library.lessons[idx];
  const copy: Lesson = {
    ...JSON.parse(JSON.stringify(original)),
    id: generateLessonId(),
    title: `${original.title} (Copy)`,
    lastModified: new Date().toISOString(),
  };
  const lessons = [...library.lessons];
  lessons.splice(idx + 1, 0, copy);
  return { lessons, activeLessonId: copy.id };
}

export function updateLesson(library: LessonLibrary, lesson: Lesson): LessonLibrary {
  console.log('[LessonStorage] Updating lesson:', lesson.title);
  const updatedLesson: Lesson = {
    ...lesson,
    lastModified: new Date().toISOString(),
  };
  const lessons = library.lessons.map(l =>
    l.id === updatedLesson.id ? updatedLesson : l,
  );
  return { lessons, activeLessonId: updatedLesson.id };
}

export function getActiveLesson(library: LessonLibrary): Lesson | null {
  const active = library.lessons.find(l => l.id === library.activeLessonId);
  if (active) return active;
  return library.lessons.length > 0 ? library.lessons[0] : null;
}
