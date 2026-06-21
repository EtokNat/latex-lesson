import { useState, useEffect } from "react";
import type { Lesson } from "./data/types";
import LessonPlanner from "./views/LessonPlanner";
import PresentationStage from "./views/PresentationStage";

function App() {
  console.log("[App] Mount");

  const [view, setView] = useState<"planner" | "presentation">("planner");
  const [savedLesson, setSavedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    console.log("[App] Reading saved lesson from localStorage");
    try {
      const raw = localStorage.getItem("saved_lesson");
      if (raw) {
        const parsed: Lesson = JSON.parse(raw);
        console.log("[App] Found saved lesson:", parsed.title);
        setSavedLesson(parsed);
      } else {
        console.log("[App] No saved lesson in localStorage");
      }
    } catch (err) {
      console.error("[App] Failed to read saved lesson:", err);
    }
  }, []);

  const handleSaveAndPresent = (lesson: Lesson) => {
    console.log("[App] Switching to presentation mode");
    setSavedLesson(lesson);
    setView("presentation");
  };

  const handleExitPresentation = () => {
    console.log("[App] Returning to planner");
    setView("planner");
  };

  if (view === "presentation" && savedLesson) {
    return (
      <PresentationStage
        lesson={savedLesson}
        onExit={handleExitPresentation}
      />
    );
  }

  return <LessonPlanner onSaveAndPresent={handleSaveAndPresent} />;
}

export default App;
