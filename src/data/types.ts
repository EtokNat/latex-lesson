export type BlockType = "heading" | "text" | "image" | "math";

export interface LessonBlock {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
}

export interface Lesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
}
