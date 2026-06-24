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

  it('renders the planner with 38-block seed lesson and add buttons', () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    expect(screen.getByPlaceholderText('Enter lesson title')).toBeTruthy();
    expect(screen.getByText('+ Heading')).toBeTruthy();
    expect(screen.getByText('+ Text')).toBeTruthy();
    expect(screen.getByText('+ Image')).toBeTruthy();
    expect(screen.getByText('+ Math')).toBeTruthy();
    expect(screen.getByText('Save and Present')).toBeTruthy();
    expect(screen.getByText('Blocks (38)')).toBeTruthy();
  });

  it('adds a heading block to existing seed blocks', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Heading'));

    // Seed has 8 headings, now 9
    const headings = screen.getAllByText('[Heading]');
    expect(headings).toHaveLength(9);
    expect(screen.getByText('Blocks (39)')).toBeTruthy();
  });

  it('adds a math block to existing seed blocks', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Math'));

    // Seed has 11 math blocks, now 12
    const mathLabels = screen.getAllByText('[Math]');
    expect(mathLabels).toHaveLength(12);
    expect(screen.getByText('Blocks (39)')).toBeTruthy();
  });

  it('shows imageUrl inputs for seed image blocks and newly added one', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    // Seed has 5 image blocks
    const before = screen.getAllByPlaceholderText('Image URL');
    expect(before).toHaveLength(5);

    await userEvent.click(screen.getByText('+ Image'));

    const after = screen.getAllByPlaceholderText('Image URL');
    expect(after).toHaveLength(6);
  });

  it('does not add imageUrl input for non-image type additions', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    // Seed has 5 image blocks → 5 imageUrl inputs
    await userEvent.click(screen.getByText('+ Text'));

    // Still only 5 imageUrl inputs (text block adds none)
    const imageInputs = screen.getAllByPlaceholderText('Image URL');
    expect(imageInputs).toHaveLength(5);
  });

  it('calls onSaveAndPresent and localStorage.setItem on save', async () => {
    const onSave = vi.fn();
    render(<LessonPlanner onSaveAndPresent={onSave} />);

    const titleInput = screen.getByPlaceholderText('Enter lesson title') as HTMLInputElement;
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'My Lesson');

    // Add one more math block
    await userEvent.click(screen.getByText('+ Math'));

    await userEvent.click(screen.getByText('Save and Present'));

    expect(mockSetItem).toHaveBeenCalledOnce();
    const savedJson = mockSetItem.mock.calls[0][1];
    const parsed = JSON.parse(savedJson);
    expect(parsed.title).toBe('My Lesson');
    // 38 seed blocks + 1 new = 39
    expect(parsed.blocks).toHaveLength(39);
    // The new block is the last one, type math
    expect(parsed.blocks[38].type).toBe('math');

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].title).toBe('My Lesson');
    expect(onSave.mock.calls[0][0].blocks).toHaveLength(39);
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

  it('allows editing seed block content', () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    // Seed has 8 heading blocks, find the first one's input
    const inputs = screen.getAllByPlaceholderText('Enter heading content') as HTMLInputElement[];
    expect(inputs.length).toBe(8);
    const headingInput = inputs[0];
    fireEvent.change(headingInput, { target: { value: 'Updated Heading' } });

    expect(headingInput.value).toBe('Updated Heading');
  });

  it('tracks block count correctly after adding to seed', async () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);

    expect(screen.getByText('Blocks (38)')).toBeTruthy();

    await userEvent.click(screen.getByText('+ Text'));
    await userEvent.click(screen.getByText('+ Math'));

    // 38 seed + 2 new = 40
    expect(screen.getByText('Blocks (40)')).toBeTruthy();
  });
});
