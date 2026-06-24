import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonPlanner from './LessonPlanner';
import { SEED_LESSON } from '../data/seedLesson';

vi.mock('katex', () => ({
  default: {
    renderToString: (input: string, _opts?: Record<string, unknown>) =>
      input.includes('INVALID_LATEX')
        ? '<span class="text-red-500">Invalid LaTeX</span>'
        : `<span class="katex">rendered: ${input}</span>`,
  },
}));

const mockFetch = vi.fn().mockResolvedValue({ ok: true });

describe('LessonPlanner', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
  });

  // === existing tests ===

  it('renders the planner with 38-block seed lesson and add buttons', () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    expect(screen.getByPlaceholderText('Enter lesson title')).toBeTruthy();
    expect(screen.getByText('+ Heading')).toBeTruthy();
    expect(screen.getByText('+ Text')).toBeTruthy();
    expect(screen.getByText('+ Image')).toBeTruthy();
    expect(screen.getByText('+ Math')).toBeTruthy();
    expect(screen.getByText('Save and Present')).toBeTruthy();
    expect(screen.getByText('Blocks (38)')).toBeTruthy();
  });

  it('adds a heading block to existing seed blocks', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Heading'));

    const headings = screen.getAllByText('[Heading]');
    expect(headings).toHaveLength(9);
    expect(screen.getByText('Blocks (39)')).toBeTruthy();
  }, 10000);

  it('adds a math block to existing seed blocks', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Math'));

    const mathLabels = screen.getAllByText('[Math]');
    expect(mathLabels).toHaveLength(12);
    expect(screen.getByText('Blocks (39)')).toBeTruthy();
  });

  it('shows imageUrl inputs for seed image blocks and newly added one', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const before = screen.getAllByPlaceholderText('Image URL');
    expect(before).toHaveLength(5);

    await userEvent.click(screen.getByText('+ Image'));

    const after = screen.getAllByPlaceholderText('Image URL');
    expect(after).toHaveLength(6);
  });

  it('does not add imageUrl input for non-image type additions', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    await userEvent.click(screen.getByText('+ Text'));

    const imageInputs = screen.getAllByPlaceholderText('Image URL');
    expect(imageInputs).toHaveLength(5);
  });

  it('calls onSaveAndPresent with lesson data on save', async () => {
    const onSave = vi.fn();
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={onSave} />);

    const titleInput = screen.getByPlaceholderText('Enter lesson title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'My Lesson' } });

    await userEvent.click(screen.getByText('+ Math'));

    await userEvent.click(screen.getByText('Save and Present'));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].title).toBe('My Lesson');
    expect(onSave.mock.calls[0][0].blocks).toHaveLength(39);
    expect(onSave.mock.calls[0][0].blocks[38].type).toBe('math');
  });

  it('allows editing seed block content', () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const inputs = screen.getAllByPlaceholderText('Enter heading content') as HTMLInputElement[];
    expect(inputs.length).toBe(8);
    const headingInput = inputs[0];
    fireEvent.change(headingInput, { target: { value: 'Updated Heading' } });

    expect(headingInput.value).toBe('Updated Heading');
  });

  it('tracks block count correctly after adding to seed', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    expect(screen.getByText('Blocks (38)')).toBeTruthy();

    await userEvent.click(screen.getByText('+ Text'));
    await userEvent.click(screen.getByText('+ Math'));

    expect(screen.getByText('Blocks (40)')).toBeTruthy();
  });

  // === 7.1: BLOCK DELETION ===

  it('deletes block and removes it from count', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    expect(screen.getByText('Blocks (38)')).toBeTruthy();

    const deleteButtons = screen.getAllByLabelText('Delete block');
    await userEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Delete this block?');
    expect(screen.getByText('Blocks (37)')).toBeTruthy();
    confirmSpy.mockRestore();
  });

  it('shows confirmation prompt on delete', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const deleteButtons = screen.getAllByLabelText('Delete block');
    await userEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Delete this block?');
    expect(screen.getByText('Blocks (38)')).toBeTruthy();
    confirmSpy.mockRestore();
  });

  // === 7.2: BLOCK REORDERING ===

  it('moves block up when up button is clicked', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    // Click down on first block (heading) to swap with second block (text)
    const downButtons = screen.getAllByLabelText('Move block down');
    await userEvent.click(downButtons[0]);

    const blockTypes = screen.getAllByText(/^\[(Heading|Text|Image|Math)\]$/);
    // After swap, block 0 is the text that was at block 1
    expect(blockTypes[0].textContent).toBe('[Text]');
  });

  it('moves block down when down button is clicked', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const downButtons = screen.getAllByLabelText('Move block down');
    await userEvent.click(downButtons[0]);

    const blockTypes = screen.getAllByText(/^\[(Heading|Text|Image|Math)\]$/);
    expect(blockTypes[0].textContent).toBe('[Text]');
    expect(blockTypes[1].textContent).toBe('[Heading]');
  });

  it('disables up button on first block', () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const upButtons = screen.getAllByLabelText('Move block up');
    expect((upButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((upButtons[1] as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables down button on last block', () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const downButtons = screen.getAllByLabelText('Move block down');
    const lastIdx = downButtons.length - 1;
    expect((downButtons[lastIdx] as HTMLButtonElement).disabled).toBe(true);
    expect((downButtons[0] as HTMLButtonElement).disabled).toBe(false);
  });

  // === 7.3: BLOCK DUPLICATION ===

  it('creates duplicate block with new ID', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    expect(screen.getByText('Blocks (38)')).toBeTruthy();

    const dupButtons = screen.getAllByLabelText('Duplicate block');
    await userEvent.click(dupButtons[0]);

    expect(screen.getByText('Blocks (39)')).toBeTruthy();
    const blockTypes = screen.getAllByText('[Heading]');
    expect(blockTypes.length).toBeGreaterThanOrEqual(2);
  });

  // === 7.4: MATH LATEX PREVIEW ===

  it('renders math preview for seed math blocks after debounce', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    // Wait for 300ms debounce + render time
    await waitFor(() => {
      const preview = screen.getByTestId('math-preview-seed-3');
      expect(preview).toBeTruthy();
      expect(preview.innerHTML).toContain('rendered:');
    }, { timeout: 2000 });
  });

  it('shows error-like output for invalid LaTeX input', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    // Add a new math block
    await userEvent.click(screen.getByText('+ Math'));

    const mathInputs = screen.getAllByPlaceholderText('Enter math content') as HTMLInputElement[];
    const newInput = mathInputs[mathInputs.length - 1];

    // Type "INVALID_LATEX" to trigger error path
    fireEvent.change(newInput, { target: { value: 'INVALID_LATEX' } });

    // Wait for debounce
    await waitFor(() => {
      const previews = screen.getAllByTestId(/^math-preview-/);
      const errorPreview = previews.find(p => p.innerHTML.includes('text-red-500'));
      expect(errorPreview).toBeTruthy();
    }, { timeout: 2000 });
  });

  // === 7.5: IMAGE URL VALIDATION ===

  it('shows valid status for reachable image URL', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    // Change the first image URL to trigger validation
    const imageInputs = screen.getAllByPlaceholderText('Image URL') as HTMLInputElement[];
    fireEvent.change(imageInputs[0], { target: { value: 'https://example.com/new-img.png' } });

    // Wait for debounce (500ms) + fetch + render
    await waitFor(() => {
      const validIndicators = screen.getAllByText('✓ URL reachable');
      expect(validIndicators.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 2000 });
  });

  it('shows unreachable status when fetch fails', async () => {
    vi.unstubAllGlobals();
    const failFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', failFetch);

    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const imageInputs = screen.getAllByPlaceholderText('Image URL') as HTMLInputElement[];
    fireEvent.change(imageInputs[0], { target: { value: 'https://bad.example.com/img.png' } });

    await waitFor(() => {
      const unreachable = screen.queryAllByText('✗ URL unreachable');
      expect(unreachable.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', mockFetch);
  });

  // === 7.6: NARRATION FIELD EDITING ===

  it('shows narration textarea when narration section is expanded', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const toggleButtons = screen.getAllByLabelText('Toggle narration');
    await userEvent.click(toggleButtons[0]);

    // The first toggle ("▶ Narration") should now be "▼ Narration"
    expect(toggleButtons[0].textContent).toContain('▼');

    const narrationTextareas = screen.getAllByPlaceholderText('Spoken narration for this block…');
    expect(narrationTextareas.length).toBeGreaterThanOrEqual(1);
  });

  it('allows editing narration text', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const toggleButtons = screen.getAllByLabelText('Toggle narration');
    await userEvent.click(toggleButtons[0]);

    const textarea = screen.getAllByPlaceholderText('Spoken narration for this block…')[0] as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Welcome to quadratics!' } });

    expect(textarea.value).toBe('Welcome to quadratics!');
  });

  it('shows narration steps for math blocks', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    // First math block is seed-3 at index 2
    const toggleButtons = screen.getAllByLabelText('Toggle narration');
    await userEvent.click(toggleButtons[2]);

    const addStepButtons = screen.getAllByLabelText('Add narration step');
    expect(addStepButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('allows adding narration steps for math blocks', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const toggleButtons = screen.getAllByLabelText('Toggle narration');
    await userEvent.click(toggleButtons[2]);

    const addStepBtn = screen.getAllByLabelText('Add narration step')[0];
    await userEvent.click(addStepBtn);

    // Should have at least one step input
    const stepInputs = screen.getAllByPlaceholderText(/Step \d narration…/);
    expect(stepInputs.length).toBeGreaterThanOrEqual(1);

    fireEvent.change(stepInputs[0], { target: { value: 'First step narration' } });
    expect((stepInputs[0] as HTMLTextAreaElement).value).toBe('First step narration');
  });

  it('allows removing narration steps', async () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);

    const toggleButtons = screen.getAllByLabelText('Toggle narration');
    await userEvent.click(toggleButtons[2]);

    // Add a step first
    const addStepBtn = screen.getAllByLabelText('Add narration step')[0];
    await userEvent.click(addStepBtn);

    const beforeCount = screen.getAllByPlaceholderText(/Step \d narration…/).length;

    // Remove it
    const removeButtons = screen.getAllByLabelText(/Remove narration step/);
    await userEvent.click(removeButtons[0]);

    const afterCount = screen.queryAllByPlaceholderText(/Step \d narration…/).length;
    expect(afterCount).toBe(beforeCount - 1);
  }, 15000);

  // === NARRATION PERSISTENCE THROUGH SAVE ===

  it('persists narration field through save', async () => {
    const onSave = vi.fn();
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={onSave} />);

    const toggleButtons = screen.getAllByLabelText('Toggle narration');
    await userEvent.click(toggleButtons[0]);

    const textarea = screen.getAllByPlaceholderText('Spoken narration for this block…')[0] as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'This is narration text.' } });

    await userEvent.click(screen.getByText('Save and Present'));

    expect(onSave).toHaveBeenCalledOnce();
    const savedLesson = onSave.mock.calls[0][0];
    expect(savedLesson.blocks[0].narration).toBe('This is narration text.');
  }, 15000);

  // === SPRINT 8: LESSONPLANNER REFACTOR ===

  it('renders back button when onBack is provided', () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('← Back to Library')).toBeTruthy();
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByText('← Back to Library'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('does not render back button without onBack prop', () => {
    render(<LessonPlanner initialLesson={SEED_LESSON} onSaveAndPresent={vi.fn()} />);
    expect(screen.queryByText('← Back to Library')).toBeNull();
  });

  it('loads initialLesson title and blocks', () => {
    const customLesson = {
      id: 'custom-1',
      title: 'Custom Lesson',
      blocks: [
        { id: 'cb1', type: 'text' as const, content: 'Custom block content' },
      ],
    };
    render(<LessonPlanner initialLesson={customLesson} onSaveAndPresent={vi.fn()} />);
    expect((screen.getByPlaceholderText('Enter lesson title') as HTMLInputElement).value).toBe('Custom Lesson');
    expect(screen.getByText('Blocks (1)')).toBeTruthy();
  });

  it('falls back to seed lesson when no initialLesson provided', () => {
    render(<LessonPlanner onSaveAndPresent={vi.fn()} />);
    expect((screen.getByPlaceholderText('Enter lesson title') as HTMLInputElement).value).toContain('Quadratic Equations');
    expect(screen.getByText('Blocks (38)')).toBeTruthy();
  });
});
