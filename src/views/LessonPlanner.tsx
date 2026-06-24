import { useState, useCallback, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { LessonBlock, Lesson, BlockType } from '../data/types';
import { SEED_LESSON } from '../data/seedLesson';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface LessonPlannerProps {
  initialLesson?: Lesson;
  onSaveAndPresent: (lesson: Lesson) => void;
  onBack?: () => void;
}

const blockTypeLabels: Record<BlockType, string> = {
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  math: 'Math',
};

function LessonPlanner({ initialLesson, onSaveAndPresent, onBack }: LessonPlannerProps) {
  console.log('[LessonPlanner] Mount');

  const [title, setTitle] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [expandedNarrations, setExpandedNarrations] = useState<Set<string>>(new Set());
  const [imageStatuses, setImageStatuses] = useState<Record<string, 'checking' | 'valid' | 'invalid' | null>>({});
  const [mathPreviews, setMathPreviews] = useState<Record<string, string>>({});

  const mathTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const imageTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const lesson = initialLesson || SEED_LESSON;
    console.log('[LessonPlanner] Initializing from', initialLesson ? 'prop lesson' : 'seed lesson', ':', lesson.title);
    setTitle(lesson.title);
    setLessonId(lesson.id);
    setBlocks(lesson.blocks);
  }, [initialLesson]);

  // -- Math preview debounce --
  useEffect(() => {
    blocks.forEach(block => {
      if (block.type === 'math' && block.content) {
        if (mathTimers.current[block.id]) {
          clearTimeout(mathTimers.current[block.id]);
        }
        mathTimers.current[block.id] = setTimeout(() => {
          try {
            const html = katex.renderToString(block.content, {
              throwOnError: false,
              displayMode: false,
            });
            setMathPreviews(prev => ({ ...prev, [block.id]: html }));
          } catch {
            setMathPreviews(prev => ({ ...prev, [block.id]: '<span class="text-red-500">Invalid LaTeX</span>' }));
          }
        }, 300);
      }
    });

    return () => {
      Object.values(mathTimers.current).forEach(clearTimeout);
    };
  }, [blocks]);

  // -- Image URL validation debounce --
  useEffect(() => {
    blocks.forEach(block => {
      if (block.type === 'image' && block.imageUrl) {
        if (imageTimers.current[block.id]) {
          clearTimeout(imageTimers.current[block.id]);
        }
        imageTimers.current[block.id] = setTimeout(async () => {
          setImageStatuses(prev => ({ ...prev, [block.id]: 'checking' }));
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(block.imageUrl!, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            const status: 'valid' | 'invalid' = res.ok ? 'valid' : 'invalid';
            setImageStatuses(prev => ({ ...prev, [block.id]: status }));
            console.log('[LessonPlanner] Image URL check:', block.imageUrl, '->', status);
          } catch {
            setImageStatuses(prev => ({ ...prev, [block.id]: 'invalid' }));
            console.log('[LessonPlanner] Image URL check:', block.imageUrl, '-> error');
          }
        }, 500);
      }
    });

    return () => {
      Object.values(imageTimers.current).forEach(clearTimeout);
    };
  }, [blocks]);

  // -- Block CRUD callbacks --
  const addBlock = useCallback((type: BlockType) => {
    console.log('[LessonPlanner] Adding block:', type);
    setBlocks(prev => {
      const next = [...prev, { id: generateId(), type, content: '' }];
      console.log('[LessonPlanner] Blocks updated:', next.length);
      return next;
    });
  }, []);

  const updateBlockContent = useCallback((id: string, content: string) => {
    console.log('[LessonPlanner] Updating block content:', id);
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  }, []);

  const updateBlockImageUrl = useCallback((id: string, imageUrl: string) => {
    console.log('[LessonPlanner] Updating block imageUrl:', id);
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, imageUrl } : b));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    console.log('[LessonPlanner] Delete block requested:', id);
    if (window.confirm('Delete this block?')) {
      console.log('[LessonPlanner] Deleted block:', id);
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  }, []);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    console.log('[LessonPlanner] Moved block:', id, 'direction:', direction);
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const newId = generateId();
      const copy: LessonBlock = { ...prev[idx], id: newId };
      console.log('[LessonPlanner] Duplicated block:', id, '->', newId);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  // -- Narration callbacks --
  const toggleNarration = useCallback((id: string) => {
    setExpandedNarrations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const updateNarration = useCallback((id: string, narration: string) => {
    console.log('[LessonPlanner] Updated narration for block:', id);
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, narration } : b));
  }, []);

  const addNarrationStep = useCallback((id: string) => {
    console.log('[LessonPlanner] Added narration step for block:', id);
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== id) return b;
        const steps = b.narrationSteps ? [...b.narrationSteps, ''] : [''];
        return { ...b, narrationSteps: steps };
      })
    );
  }, []);

  const updateNarrationStep = useCallback((id: string, index: number, text: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== id || !b.narrationSteps) return b;
        const steps = [...b.narrationSteps];
        steps[index] = text;
        return { ...b, narrationSteps: steps };
      })
    );
  }, []);

  const removeNarrationStep = useCallback((id: string, index: number) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== id || !b.narrationSteps) return b;
        const steps = b.narrationSteps.filter((_, i) => i !== index);
        return { ...b, narrationSteps: steps };
      })
    );
  }, []);

  // -- Save --
  const handleSave = useCallback(() => {
    console.log('[LessonPlanner] Save triggered');
    const lesson: Lesson = {
      id: lessonId || generateId(),
      title,
      blocks,
    };
    onSaveAndPresent(lesson);
  }, [title, blocks, lessonId, onSaveAndPresent]);

  // -- Render --
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Lesson Planner</h1>

      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          &larr; Back to Library
        </button>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Lesson Title</span>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter lesson title"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">Add Block</span>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(blockTypeLabels) as BlockType[]).map(type => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
            >
              + {blockTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="space-y-4">
          <span className="text-sm font-medium">Blocks ({blocks.length})</span>
          {blocks.map((block, idx) => (
            <div key={block.id} className="border rounded p-4 space-y-2">
              {/* Block header with type label and action buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">
                  [{blockTypeLabels[block.type]}]
                </span>

                <button
                  onClick={() => moveBlock(block.id, 'up')}
                  disabled={idx === 0}
                  aria-label="Move block up"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveBlock(block.id, 'down')}
                  disabled={idx === blocks.length - 1}
                  aria-label="Move block down"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ▼
                </button>
                <button
                  onClick={() => duplicateBlock(block.id)}
                  aria-label="Duplicate block"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                >
                  ⧉
                </button>
                <button
                  onClick={() => deleteBlock(block.id)}
                  aria-label="Delete block"
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-red-200 text-red-600 ml-auto"
                >
                  ✕
                </button>
              </div>

              {/* Content input */}
              <input
                type="text"
                value={block.content}
                onChange={e => updateBlockContent(block.id, e.target.value)}
                placeholder={`Enter ${blockTypeLabels[block.type].toLowerCase()} content`}
                className="w-full border rounded px-3 py-2 text-sm"
              />

              {/* Image URL input + validation status */}
              {block.type === 'image' && (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={block.imageUrl ?? ''}
                    onChange={e => updateBlockImageUrl(block.id, e.target.value)}
                    placeholder="Image URL"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  {imageStatuses[block.id] && (
                    <span className="text-xs inline-flex items-center gap-1">
                      {imageStatuses[block.id] === 'checking' && <span className="text-gray-400">⏳ Checking URL…</span>}
                      {imageStatuses[block.id] === 'valid' && <span className="text-green-600">✓ URL reachable</span>}
                      {imageStatuses[block.id] === 'invalid' && <span className="text-red-600">✗ URL unreachable</span>}
                    </span>
                  )}
                </div>
              )}

              {/* Math LaTeX preview */}
              {block.type === 'math' && block.content && mathPreviews[block.id] && (
                <div
                  className="bg-gray-100 rounded p-3 text-sm overflow-x-auto"
                  data-testid={`math-preview-${block.id}`}
                  dangerouslySetInnerHTML={{ __html: mathPreviews[block.id] }}
                />
              )}

              {/* Narration section toggle */}
              <button
                onClick={() => toggleNarration(block.id)}
                aria-label="Toggle narration"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {expandedNarrations.has(block.id) ? '▼ Narration' : '▶ Narration'}
              </button>

              {/* Narration editing (expanded) */}
              {expandedNarrations.has(block.id) && (
                <div className="space-y-2 pl-2 border-l-2 border-blue-200">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-gray-600">Spoken narration</span>
                    <textarea
                      value={block.narration ?? ''}
                      onChange={e => updateNarration(block.id, e.target.value)}
                      placeholder="Spoken narration for this block…"
                      className="w-full border rounded px-3 py-2 text-sm resize-y min-h-[60px]"
                      rows={2}
                    />
                  </label>

                  {block.type === 'math' && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-600">Per-reveal narration steps</span>
                      {(block.narrationSteps ?? []).map((step, stepIdx) => (
                        <div key={stepIdx} className="flex gap-1 items-start">
                          <textarea
                            value={step}
                            onChange={e => updateNarrationStep(block.id, stepIdx, e.target.value)}
                            placeholder={`Step ${stepIdx + 1} narration…`}
                            className="flex-1 border rounded px-3 py-2 text-sm resize-y min-h-[40px]"
                            rows={1}
                          />
                          <button
                            onClick={() => removeNarrationStep(block.id, stepIdx)}
                            aria-label={`Remove narration step ${stepIdx + 1}`}
                            className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addNarrationStep(block.id)}
                        aria-label="Add narration step"
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        + Add Step
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
      >
        Save and Present
      </button>
    </div>
  );
}

export default LessonPlanner;
