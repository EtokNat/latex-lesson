import type { Lesson } from '../data/types';

export function exportLesson(lesson: Lesson): void {
  console.log('[ImportExport] Exporting lesson:', lesson.title);
  try {
    const json = JSON.stringify(lesson, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lesson.title.replace(/[^a-zA-Z0-9 ]/g, '_') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[ImportExport] Exported lesson:', lesson.title);
  } catch (err) {
    console.error('[ImportExport] Export failed:', err);
  }
}

export function importLessonFromFile(file: File): Promise<Lesson> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.id || typeof parsed.id !== 'string') {
          reject(new Error("Invalid lesson format: missing required field 'id'"));
          return;
        }
        if (!parsed.title || typeof parsed.title !== 'string') {
          reject(new Error("Invalid lesson format: missing required field 'title'"));
          return;
        }
        if (!Array.isArray(parsed.blocks)) {
          reject(new Error("Invalid lesson format: missing required field 'blocks'"));
          return;
        }

        if (!parsed.lastModified) {
          console.warn('[ImportExport] Imported lesson missing lastModified');
        }
        if (!parsed.narration && !parsed.blocks.some((b: { narration?: string }) => b.narration)) {
          console.warn('[ImportExport] Imported lesson has no narration data');
        }

        console.log('[ImportExport] Imported lesson:', parsed.title);
        resolve(parsed as Lesson);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Invalid lesson format')) {
          reject(err);
        } else {
          reject(new Error('Invalid JSON file'));
        }
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}
