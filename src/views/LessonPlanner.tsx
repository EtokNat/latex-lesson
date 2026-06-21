import { useState, useCallback } from 'react';
import type { LessonBlock, Lesson, BlockType } from '../data/types';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface LessonPlannerProps {
  onSaveAndPresent: (lesson: Lesson) => void;
}

const blockTypeLabels: Record<BlockType, string> = {
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  math: 'Math',
};

function LessonPlanner({ onSaveAndPresent }: LessonPlannerProps) {
  console.log('[LessonPlanner] Mount');

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);

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

  const handleSave = useCallback(() => {
    console.log('[LessonPlanner] Save triggered');
    const lesson: Lesson = {
      id: generateId(),
      title,
      blocks,
    };

    try {
      const json = JSON.stringify(lesson);
      try {
        localStorage.setItem('saved_lesson', json);
        console.log('[LessonPlanner] Lesson saved to localStorage');
      } catch (storageErr) {
        console.error('[LessonPlanner] localStorage.setItem failed:', storageErr);
      }
    } catch (stringifyErr) {
      console.error('[LessonPlanner] JSON.stringify failed:', stringifyErr);
    }

    onSaveAndPresent(lesson);
  }, [title, blocks, onSaveAndPresent]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Lesson Planner</h1>

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
          {blocks.map(block => (
            <div key={block.id} className="border rounded p-4 space-y-2">
              <span className="text-xs font-mono text-gray-500">
                [{blockTypeLabels[block.type]}]
              </span>

              <input
                type="text"
                value={block.content}
                onChange={e => updateBlockContent(block.id, e.target.value)}
                placeholder={`Enter ${blockTypeLabels[block.type].toLowerCase()} content`}
                className="w-full border rounded px-3 py-2 text-sm"
              />

              {block.type === 'image' && (
                <input
                  type="text"
                  value={block.imageUrl ?? ''}
                  onChange={e => updateBlockImageUrl(block.id, e.target.value)}
                  placeholder="Image URL"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
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
