export type BlockType = "heading" | "text" | "image" | "math";

export interface LessonBlock {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
  narration?: string;
  narrationSteps?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
}
