export type AudioTag =
  | 'excited'
  | 'warmly'
  | 'measured'
  | 'encouraging'
  | 'authoritatively'
  | 'calm'
  | 'curious'
  | 'bright'
  | 'patiently'
  | 'reassuring'
  | 'seriously'
  | 'firmly';

export interface NarrationSegment {
  text: string;
  audioTag?: AudioTag;
  revealTrigger?: boolean;
  pauseAfterMs?: number;
  socraticPause?: number;
}

export interface BlockNarration {
  blockId: string;
  segments: NarrationSegment[];
  totalDurationMs: number;
}

export interface LessonNarration {
  lessonId: string;
  blockNarrations: BlockNarration[];
  interBlockPausesMs: number[];
}
