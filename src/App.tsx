import { useState, useEffect } from 'react';
import type { Lesson, LessonLibrary } from './data/types';
import LessonPlanner from './views/LessonPlanner';
import LessonList from './views/LessonList';
import PresentationStage from './views/PresentationStage';
import {
  loadLibrary,
  saveLibrary,
  createLesson,
  deleteLesson,
  duplicateLesson,
  updateLesson,
  getActiveLesson,
} from './services/lessonStorage';
import { exportLesson } from './services/lessonImportExport';

type View = 'library' | 'planner' | 'presentation';

function App() {
  console.log('[App] Mount');

  const [view, setView] = useState<View>('planner');
  const [library, setLibrary] = useState<LessonLibrary>({ lessons: [], activeLessonId: '' });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  useEffect(() => {
    console.log('[App] Loading lesson library');
    const lib = loadLibrary();
    setLibrary(lib);

    if (lib.lessons.length > 1) {
      console.log('[App] Multiple lessons found, showing library');
      setView('library');
    } else {
      console.log('[App] Single lesson, going directly to planner');
      const active = getActiveLesson(lib);
      if (active) {
        setEditingLessonId(active.id);
      }
      setView('planner');
    }
  }, []);

  const editingLesson = editingLessonId
    ? library.lessons.find(l => l.id === editingLessonId) ?? null
    : null;

  const handleSelectLesson = (lessonId: string) => {
    console.log('[App] Selecting lesson:', lessonId);
    setEditingLessonId(lessonId);
    setView('planner');
  };

  const handleCreateLesson = (title: string) => {
    const { library: newLib, lesson } = createLesson(title, library);
    setLibrary(newLib);
    saveLibrary(newLib);
    setEditingLessonId(lesson.id);
    setView('planner');
  };

  const handleDeleteLesson = (lessonId: string) => {
    const newLib = deleteLesson(library, lessonId);
    setLibrary(newLib);
    saveLibrary(newLib);
    if (newLib.lessons.length === 0) {
      setEditingLessonId(null);
    }
  };

  const handleDuplicateLesson = (lessonId: string) => {
    const newLib = duplicateLesson(library, lessonId);
    setLibrary(newLib);
    saveLibrary(newLib);
  };

  const handleImportLesson = (lesson: Lesson) => {
    const newLib: LessonLibrary = {
      lessons: [...library.lessons, lesson],
      activeLessonId: lesson.id,
    };
    setLibrary(newLib);
    saveLibrary(newLib);
  };

  const handleExportLesson = (lesson: Lesson) => {
    exportLesson(lesson);
  };

  const handleSaveAndPresent = (lesson: Lesson) => {
    console.log('[App] Saving and switching to presentation');
    const newLib = updateLesson(library, lesson);
    setLibrary(newLib);
    saveLibrary(newLib);
    setEditingLessonId(lesson.id);
    setView('presentation');
  };

  const handleExitPresentation = () => {
    console.log('[App] Exiting presentation');
    const lib = loadLibrary();
    setLibrary(lib);

    if (lib.lessons.length > 1) {
      console.log('[App] Returning to library');
      setView('library');
    } else {
      console.log('[App] Returning to planner');
      const active = getActiveLesson(lib);
      if (active) {
        setEditingLessonId(active.id);
      }
      setView('planner');
    }
  };

  const handleBackToLibrary = () => {
    console.log('[App] Back to library');
    setView('library');
  };

  if (view === 'presentation' && editingLesson) {
    return (
      <PresentationStage
        lesson={editingLesson}
        onExit={handleExitPresentation}
      />
    );
  }

  if (view === 'library') {
    return (
      <LessonList
        lessons={library.lessons}
        activeLessonId={library.activeLessonId}
        onSelectLesson={handleSelectLesson}
        onCreateLesson={handleCreateLesson}
        onDeleteLesson={handleDeleteLesson}
        onDuplicateLesson={handleDuplicateLesson}
        onImportLesson={handleImportLesson}
        onExportLesson={handleExportLesson}
      />
    );
  }

  return (
    <LessonPlanner
      initialLesson={editingLesson ?? undefined}
      onSaveAndPresent={handleSaveAndPresent}
      onBack={library.lessons.length > 1 ? handleBackToLibrary : undefined}
    />
  );
}

export default App;
