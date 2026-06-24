import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn(
      () => '<span class="katex-mock">rendered math</span>',
    ),
  },
}));

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

function makeLessonLib(count: number): string {
  const lessons = [];
  for (let i = 1; i <= count; i++) {
    lessons.push({
      id: `lesson-${i}`,
      title: `Lesson ${i}`,
      blocks: [{ id: `b-${i}-1`, type: 'text', content: `Block ${i}-1` }],
      lastModified: new Date().toISOString(),
    });
  }
  return JSON.stringify({
    lessons,
    activeLessonId: lessons[0]?.id ?? '',
  });
}

describe('App', () => {
  describe('single-lesson flow (backward compat)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockLocalStorage(() => null);
    });

    it('renders LessonPlanner by default (seed lesson)', () => {
      render(<App />);
      expect(screen.getByText('Save and Present')).toBeTruthy();
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
    });

    it('transitions to PresentationStage after save', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Save and Present'));
      expect(screen.getByText('1. What Is a Quadratic Equation?')).toBeTruthy();
    });

    it('returns to LessonPlanner on exit', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Save and Present'));
      expect(screen.getByText('1. What Is a Quadratic Equation?')).toBeTruthy();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
      expect(screen.getByText('Save and Present')).toBeTruthy();
    });

    it('toggles between views correctly on full cycle', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Save and Present'));
      expect(screen.getByText('1. What Is a Quadratic Equation?')).toBeTruthy();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
      fireEvent.click(screen.getByText('Save and Present'));
      expect(screen.getByText('1. What Is a Quadratic Equation?')).toBeTruthy();
    });
  });

  describe('localStorage handling', () => {
    it('survives corrupted lesson_library JSON on mount', () => {
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return '{not valid json[[[';
        return null;
      });
      expect(() => {
        render(<App />);
      }).not.toThrow();
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
    });

    it('handles missing localStorage key gracefully', () => {
      mockLocalStorage(() => null);
      expect(() => {
        render(<App />);
      }).not.toThrow();
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
    });

    it('reads valid lesson_library from localStorage on mount', () => {
      const libJson = makeLessonLib(1);
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return libJson;
        return null;
      });
      render(<App />);
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
    });

    it('migrates from legacy saved_lesson key', () => {
      const oldLesson = JSON.stringify({
        id: 'old-1',
        title: 'My Legacy Lesson',
        blocks: [],
      });
      mockLocalStorage((key: string) => {
        if (key === 'saved_lesson') return oldLesson;
        return null;
      });
      render(<App />);
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
    });
  });

  describe('multi-lesson flow', () => {
    it('shows library view when multiple lessons exist', () => {
      const libJson = makeLessonLib(3);
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return libJson;
        return null;
      });
      render(<App />);
      expect(screen.getByText('My Lessons')).toBeTruthy();
      expect(screen.getAllByTestId(/lesson-card-/)).toHaveLength(3);
    });

    it('skips library when only one lesson exists', () => {
      const libJson = makeLessonLib(1);
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return libJson;
        return null;
      });
      render(<App />);
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
    });

    it('navigates library -> planner -> presentation -> library', async () => {
      const libJson = makeLessonLib(2);
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return libJson;
        return null;
      });
      render(<App />);

      // Should be on library view
      expect(screen.getByText('My Lessons')).toBeTruthy();

      // Click Edit on the first lesson
      const editButtons = screen.getAllByText('Edit Lesson');
      await userEvent.click(editButtons[0]);

      // Should be on planner with the lesson loaded
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
      expect(screen.getByText('← Back to Library')).toBeTruthy();

      // Save and present
      fireEvent.click(screen.getByText('Save and Present'));
      expect(screen.getByText('Block 1-1')).toBeTruthy();

      // Exit presentation
      fireEvent.keyDown(window, { key: 'Escape' });
      // Should return to library (2 lessons)
      expect(screen.getByText('My Lessons')).toBeTruthy();
    });

    it('navigates planner back to library', async () => {
      const libJson = makeLessonLib(2);
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return libJson;
        return null;
      });
      render(<App />);

      expect(screen.getByText('My Lessons')).toBeTruthy();
      await userEvent.click(screen.getAllByText('Edit Lesson')[0]);
      expect(screen.getByText('Lesson Planner')).toBeTruthy();

      await userEvent.click(screen.getByText('← Back to Library'));
      expect(screen.getByText('My Lessons')).toBeTruthy();
    });

    it('exit presentation returns to planner with single lesson', () => {
      const libJson = makeLessonLib(1);
      mockLocalStorage((key: string) => {
        if (key === 'lesson_library') return libJson;
        return null;
      });
      render(<App />);

      fireEvent.click(screen.getByText('Save and Present'));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.getByText('Lesson Planner')).toBeTruthy();
      // No back button in single-lesson mode
      expect(screen.queryByText('← Back to Library')).toBeNull();
    });
  });
});
