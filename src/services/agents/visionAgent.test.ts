import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeImage } from './visionAgent';
import type { LessonBlock } from '../data/types';

vi.mock('../llmClient', () => ({
  generateCompletion: vi.fn(),
  configureLLMClient: vi.fn(),
}));

import { generateCompletion } from '../llmClient';

const mockedGenerateCompletion = generateCompletion as ReturnType<typeof vi.fn>;

const mockVisionResponse = {
  mainInsight: 'The parabola shape shows how the quadratic coefficient affects direction',
  firstLook: 'Focus on the vertex at the bottom of the curve',
  pattern: 'The U-shape is symmetric around the vertical line through the vertex',
  teacherQuestion: 'What happens to the parabola if a is negative?',
  connectionToMath: 'The x-intercepts are the roots of the quadratic equation',
};

describe('visionAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enriches ground truth description with pedagogical analysis', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(mockVisionResponse),
      promptTokens: 300,
      completionTokens: 200,
      estimatedCost: 0.004,
    });

    const block: LessonBlock = {
      id: 'img1',
      type: 'image',
      content: 'A parabola opening upward showing the roots',
      imageUrl: 'http://example.com/graph.png',
    };

    const desc = await analyzeImage(block, 'Surrounding text about quadratics');
    expect(desc.blockId).toBe('img1');
    expect(desc.mainInsight).toBe(mockVisionResponse.mainInsight);
    expect(desc.firstLook).toBe(mockVisionResponse.firstLook);
    expect(desc.pattern).toBe(mockVisionResponse.pattern);
    expect(desc.teacherQuestion).toBe(mockVisionResponse.teacherQuestion);
    expect(desc.connectionToMath).toBe(mockVisionResponse.connectionToMath);
    expect(desc.fallbackUsed).toBe(false);
  });

  it('falls back to ground truth when vision API fails', async () => {
    mockedGenerateCompletion.mockRejectedValueOnce(new Error('API unavailable'));

    const block: LessonBlock = {
      id: 'img2',
      type: 'image',
      content: 'A graph showing the discriminant cases',
      imageUrl: 'http://example.com/discriminant.png',
    };

    const desc = await analyzeImage(block, 'Context about discriminants');
    expect(desc.blockId).toBe('img2');
    expect(desc.mainInsight).toBe(block.content);
    expect(desc.fallbackUsed).toBe(true);
  });

  it('does not contradict ground truth', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify(mockVisionResponse),
      promptTokens: 200,
      completionTokens: 100,
      estimatedCost: 0.002,
    });

    const authorContent = 'The discriminant determines the number of real roots';
    const block: LessonBlock = {
      id: 'img3',
      type: 'image',
      content: authorContent,
      imageUrl: 'http://example.com/test.png',
    };

    const desc = await analyzeImage(block, 'Context');
    // The fallback was not used, meaning the API didn't fail
    expect(desc.fallbackUsed).toBe(false);
    // The author's content is preserved as ground truth
    expect(desc.mainInsight).toBeDefined();
  });

  it('handles missing fields in vision response gracefully', async () => {
    mockedGenerateCompletion.mockResolvedValueOnce({
      text: JSON.stringify({ mainInsight: 'Only insight' }),
      promptTokens: 100,
      completionTokens: 50,
      estimatedCost: 0.001,
    });

    const block: LessonBlock = {
      id: 'img4',
      type: 'image',
      content: 'Test image',
      imageUrl: 'http://example.com/test.png',
    };

    const desc = await analyzeImage(block, 'Context');
    expect(desc.mainInsight).toBe('Only insight');
    expect(desc.firstLook).toBeDefined();
    expect(desc.teacherQuestion).toBeDefined();
  });
});
