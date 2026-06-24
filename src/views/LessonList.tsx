import { useRef } from 'react';
import type { Lesson, LessonLibrary } from '../data/types';

interface LessonListProps {
  lessons: Lesson[];
  activeLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  onCreateLesson: (title: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onDuplicateLesson: (lessonId: string) => void;
  onImportLesson: (lesson: Lesson) => void;
  onExportLesson: (lesson: Lesson) => void;
}

function formatDate(iso?: string): string {
  if (!iso) return 'Unknown date';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return 'Unknown date';
  }
}

function LessonList({
  lessons,
  activeLessonId,
  onSelectLesson,
  onCreateLesson,
  onDeleteLesson,
  onDuplicateLesson,
  onImportLesson,
  onExportLesson,
}: LessonListProps) {
  console.log('[LessonList] Mount with', lessons.length, 'lessons');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const title = window.prompt('Enter lesson title:');
    if (title !== null) {
      console.log('[LessonList] Creating lesson:', title || '(empty)');
      onCreateLesson(title || 'Untitled Lesson');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this lesson?')) {
      console.log('[LessonList] Deleting lesson:', id);
      onDeleteLesson(id);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { importLessonFromFile } = await import('../services/lessonImportExport');
      const lesson = await importLessonFromFile(file);
      console.log('[LessonList] Imported lesson:', lesson.title);
      onImportLesson(lesson);
    } catch (err) {
      console.error('[LessonList] Import failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to import lesson');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (lessons.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">My Lessons</h1>
        <p className="text-gray-500">No saved lessons. Create one to get started.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Create New Lesson
          </button>
          <button
            onClick={handleImportClick}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
          >
            Import Lesson
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Lessons</h1>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Create New Lesson
          </button>
          <button
            onClick={handleImportClick}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
          >
            Import Lesson
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map(lesson => (
          <div
            key={lesson.id}
            className={`border rounded p-4 space-y-3 cursor-pointer hover:border-blue-400 transition-colors ${
              lesson.id === activeLessonId ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            }`}
            data-testid={`lesson-card-${lesson.id}`}
          >
            <div onClick={() => onSelectLesson(lesson.id)}>
              <h3 className="font-semibold text-gray-900 truncate">{lesson.title}</h3>
              <p className="text-sm text-gray-500">
                {lesson.blocks.length} blocks &middot; {formatDate(lesson.lastModified)}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); onSelectLesson(lesson.id); }}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Edit Lesson
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicateLesson(lesson.id); }}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Duplicate
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onExportLesson(lesson); }}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Export
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(lesson.id); }}
                className="text-xs px-2 py-1 bg-gray-100 text-red-600 rounded hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LessonList;
