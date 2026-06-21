import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonPlanner from './LessonPlanner';

describe('LessonPlanner', () => {
  const mockSetItem = vi.fn();
  const mockGetItem = vi.fn(() => null);

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: mockSetItem,
      },
      writable: true,
    });
  });

  it('renders the planner with title input and add buttons', () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    expect(screen.getByPlaceholderText('Enter lesson title')).toBeTruthy();
    expect(screen.getByText('+ Heading')).toBeTruthy();
    expect(screen.getByText('+ Text')).toBeTruthy();
    expect(screen.getByText('+ Image')).toBeTruthy();
    expect(screen.getByText('+ Math')).toBeTruthy();
    expect(screen.getByText('Save and Present')).toBeTruthy();
  });

  it('adds a heading block when + Heading is clicked', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Heading'));

    expect(screen.getByText('[Heading]')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter heading content')).toBeTruthy();
  });

  it('adds a math block when + Math is clicked', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Math'));

    expect(screen.getByText('[Math]')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter math content')).toBeTruthy();
  });

  it('shows imageUrl input only for image blocks', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Image'));

    expect(screen.getByPlaceholderText('Image URL')).toBeTruthy();
  });

  it('does not show imageUrl input for non-image blocks', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Text'));

    expect(screen.queryByPlaceholderText('Image URL')).toBeNull();
  });

  it('calls onSaveAndPresent and localStorage.setItem on save', async () => {
    const onSave = vi.fn();
    render(<LessonPlanner onSaveAndPresent={onSave} />);

    const titleInput = screen.getByPlaceholderText('Enter lesson title');
    await userEvent.type(titleInput, 'My Lesson');

    await userEvent.click(screen.getByText('+ Math'));
    const contentInput = screen.getByPlaceholderText('Enter math content');
    await userEvent.type(contentInput, 'x^2');

    await userEvent.click(screen.getByText('Save and Present'));

    expect(mockSetItem).toHaveBeenCalledOnce();
    const savedJson = mockSetItem.mock.calls[0][1];
    const parsed = JSON.parse(savedJson);
    expect(parsed.title).toBe('My Lesson');
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].type).toBe('math');
    expect(parsed.blocks[0].content).toBe('x^2');

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].title).toBe('My Lesson');
    expect(onSave.mock.calls[0][0].blocks).toHaveLength(1);
  });

  it('survives localStorage.setItem throwing an error', async () => {
    const onSave = vi.fn();
    const brokenSetItem = vi.fn(() => { throw new Error('QuotaExceeded'); });
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: brokenSetItem,
      },
      writable: true,
    });

    expect(() => {
      render(<LessonPlanner onSaveAndPresent={onSave} />);
    }).not.toThrow();

    await userEvent.click(screen.getByText('Save and Present'));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it('allows editing block content', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Heading'));

    const input = screen.getByPlaceholderText('Enter heading content') as HTMLInputElement;
    await userEvent.type(input, 'Introduction');

    expect(input.value).toBe('Introduction');
  });

  it('tracks block count correctly', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Text'));
    await userEvent.click(screen.getByText('+ Math'));

    expect(screen.getByText('Blocks (2)')).toBeTruthy();
  });
});
