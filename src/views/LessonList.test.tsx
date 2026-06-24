import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonList from './LessonList';
import type { Lesson } from '../data/types';

// Mock katex (not used by LessonList, but safe to have)
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn(() => '<span class="katex-mock">rendered math</span>'),
  },
}));

const makeLesson = (overrides?: Partial<Lesson>): Lesson => ({
  id: 'lesson-1',
  title: 'Test Lesson',
  blocks: [
    { id: 'b1', type: 'text', content: 'Hello' },
    { id: 'b2', type: 'math', content: 'x^2' },
  ],
  lastModified: '2026-06-24T00:00:00.000Z',
  ...overrides,
});

describe('LessonList', () => {
  let onSelectLesson: ReturnType<typeof vi.fn>;
  let onCreateLesson: ReturnType<typeof vi.fn>;
  let onDeleteLesson: ReturnType<typeof vi.fn>;
  let onDuplicateLesson: ReturnType<typeof vi.fn>;
  let onImportLesson: ReturnType<typeof vi.fn>;
  let onExportLesson: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSelectLesson = vi.fn();
    onCreateLesson = vi.fn();
    onDeleteLesson = vi.fn();
    onDuplicateLesson = vi.fn();
    onImportLesson = vi.fn();
    onExportLesson = vi.fn();
  });

  function renderList(lessons: Lesson[], activeLessonId = '') {
    render(
      <LessonList
        lessons={lessons}
        activeLessonId={activeLessonId}
        onSelectLesson={onSelectLesson}
        onCreateLesson={onCreateLesson}
        onDeleteLesson={onDeleteLesson}
        onDuplicateLesson={onDuplicateLesson}
        onImportLesson={onImportLesson}
        onExportLesson={onExportLesson}
      />,
    );
  }

  describe('empty state', () => {
    it('renders empty state message', () => {
      renderList([]);
      expect(screen.getByText('No saved lessons. Create one to get started.')).toBeTruthy();
      expect(screen.getByText('Create New Lesson')).toBeTruthy();
    });

    it('calls onCreateLesson when create button clicked', async () => {
      vi.spyOn(window, 'prompt').mockReturnValue('My New Lesson');
      renderList([]);
      await userEvent.click(screen.getByText('Create New Lesson'));
      expect(window.prompt).toHaveBeenCalledWith('Enter lesson title:');
      expect(onCreateLesson).toHaveBeenCalledWith('My New Lesson');
    });

    it('does not call onCreateLesson when prompt cancelled', async () => {
      vi.spyOn(window, 'prompt').mockReturnValue(null);
      renderList([]);
      await userEvent.click(screen.getByText('Create New Lesson'));
      expect(onCreateLesson).not.toHaveBeenCalled();
    });
  });

  describe('lesson cards', () => {
    it('renders lesson cards for each lesson', () => {
      const lessons = [
        makeLesson({ id: 'a', title: 'Lesson A' }),
        makeLesson({ id: 'b', title: 'Lesson B' }),
        makeLesson({ id: 'c', title: 'Lesson C' }),
      ];
      renderList(lessons);
      expect(screen.getByText('Lesson A')).toBeTruthy();
      expect(screen.getByText('Lesson B')).toBeTruthy();
      expect(screen.getByText('Lesson C')).toBeTruthy();
    });

    it('shows block count on each card', () => {
      const lessons = [makeLesson({ id: 'a', blocks: [{ id: 'b1', type: 'text', content: '' }] })];
      renderList(lessons);
      expect(screen.getByText(/1 blocks/)).toBeTruthy();
    });

    it('shows last modified date', () => {
      const lessons = [makeLesson()];
      renderList(lessons);
      expect(screen.getByText(/6\/24\/2026/)).toBeTruthy();
    });

    it('shows Unknown date when lastModified is missing', () => {
      const lessons = [makeLesson({ lastModified: undefined })];
      renderList(lessons);
      expect(screen.getByText(/Unknown date/)).toBeTruthy();
    });

    it('highlights active lesson card', () => {
      const lessons = [makeLesson({ id: 'a' }), makeLesson({ id: 'b' })];
      renderList(lessons, 'a');
      const cards = screen.getAllByTestId(/lesson-card-/);
      expect(cards[0].className).toContain('ring-2');
    });

    it('calls onSelectLesson when card is clicked', async () => {
      const lessons = [makeLesson({ id: 'a', title: 'Lesson A' }), makeLesson({ id: 'b', title: 'Lesson B' })];
      renderList(lessons);
      await userEvent.click(screen.getByText('Lesson A'));
      expect(onSelectLesson).toHaveBeenCalledWith('a');
    });

    it('calls onDeleteLesson after confirm', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const lessons = [makeLesson({ id: 'a' })];
      renderList(lessons);
      await userEvent.click(screen.getByText('Delete'));
      expect(confirmSpy).toHaveBeenCalledWith('Delete this lesson?');
      expect(onDeleteLesson).toHaveBeenCalledWith('a');
      confirmSpy.mockRestore();
    });

    it('does not delete on confirm cancel', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const lessons = [makeLesson({ id: 'a' })];
      renderList(lessons);
      await userEvent.click(screen.getByText('Delete'));
      expect(onDeleteLesson).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('calls onDuplicateLesson when duplicate clicked', async () => {
      const lessons = [makeLesson({ id: 'a' })];
      renderList(lessons);
      await userEvent.click(screen.getByText('Duplicate'));
      expect(onDuplicateLesson).toHaveBeenCalledWith('a');
    });

    it('calls onExportLesson when export clicked', async () => {
      const lessons = [makeLesson({ id: 'a' })];
      renderList(lessons);
      await userEvent.click(screen.getByText('Export'));
      expect(onExportLesson).toHaveBeenCalledWith(lessons[0]);
    });

    it('calls onSelectLesson when Edit button clicked', async () => {
      const lessons = [makeLesson({ id: 'a' })];
      renderList(lessons);
      await userEvent.click(screen.getByText('Edit Lesson'));
      expect(onSelectLesson).toHaveBeenCalledWith('a');
    });

    it('shows My Lessons header', () => {
      renderList([makeLesson()]);
      expect(screen.getByText('My Lessons')).toBeTruthy();
    });
  });

  describe('import button', () => {
    it('renders import button with hidden file input', () => {
      renderList([makeLesson()]);
      expect(screen.getByText('Import Lesson')).toBeTruthy();
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeTruthy();
      expect(input?.getAttribute('accept')).toBe('.json');
    });
  });
});
