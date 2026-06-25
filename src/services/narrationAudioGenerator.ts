import type { LessonNarration, NarrationSegment, AudioTag } from '../data/narrationTypes';

export interface AudioSegment {
  segmentIndex: number;
  blockId: string;
  text: string;
  audioTag?: AudioTag;
  durationMs: number;
  revealTrigger: boolean;
  hasSocraticPause: boolean;
  socraticPauseSeconds: number;
  pauseAfterMs: number;
  isSilence: boolean;
}

export interface NarrationAudioResult {
  segments: AudioSegment[];
  totalDurationMs: number;
  revealPositions: number[];
}

interface ParsedChunk {
  text: string;
  revealTrigger: boolean;
  socraticPause: number;
  pauseAfterMs: number;
  audioTag?: AudioTag;
}

const SOCRATIC_PAUSE_MS = 3000;
const DEFAULT_SPEAKING_RATE_MS_PER_WORD = 300;

function parseAudioTagFromText(text: string): { tag?: AudioTag; remaining: string } {
  const match = text.match(/^\[([a-zA-Z]+)\]\s*/);
  if (!match) return { remaining: text };

  const validTags: Set<string> = new Set([
    'excited', 'warmly', 'measured', 'encouraging', 'authoritatively',
    'calm', 'curious', 'bright', 'patiently', 'reassuring', 'seriously', 'firmly',
  ]);

  const tag = match[1].toLowerCase();
  if (validTags.has(tag)) {
    return { tag: tag as AudioTag, remaining: text.slice(match[0].length) };
  }

  return { remaining: text };
}

function splitTextAtMarkers(text: string, baseAudioTag?: AudioTag): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];

  const markerRegex = /\{(REVEAL|SOCRATIC(?::\s*"[^"]*")?|PAUSE:(\d+(?:\.\d+)?))\}/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(text)) !== null) {
    const beforeText = text.slice(lastIndex, match.index).trim();

    if (beforeText.length > 0) {
      const { tag, remaining } = parseAudioTagFromText(beforeText);
      chunks.push({
        text: remaining || beforeText,
        revealTrigger: false,
        socraticPause: 0,
        pauseAfterMs: 0,
        audioTag: tag || baseAudioTag,
      });
    }

    const marker = match[1];
    if (marker === 'REVEAL') {
      if (chunks.length > 0) {
        chunks[chunks.length - 1].revealTrigger = true;
      }
    } else if (marker.startsWith('SOCRATIC')) {
      if (chunks.length > 0) {
        chunks[chunks.length - 1].socraticPause = 3.0;
      }
    } else if (marker.startsWith('PAUSE:')) {
      const pauseSec = parseFloat(match[2]);
      if (chunks.length > 0) {
        chunks[chunks.length - 1].pauseAfterMs = pauseSec * 1000;
      }
    }

    lastIndex = markerRegex.lastIndex;
  }

  const remaining = text.slice(lastIndex).trim();
  if (remaining.length > 0) {
    const { tag, remaining: cleanText } = parseAudioTagFromText(remaining);
    chunks.push({
      text: cleanText || remaining,
      revealTrigger: false,
      socraticPause: 0,
      pauseAfterMs: 0,
      audioTag: tag || baseAudioTag,
    });
  }

  return chunks;
}

function estimateDuration(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(200, wordCount * DEFAULT_SPEAKING_RATE_MS_PER_WORD);
}

export function generateNarrationAudio(narration: LessonNarration): NarrationAudioResult {
  console.log(
    '[NarrationAudio] Generating audio for',
    narration.blockNarrations.length,
    'blocks'
  );

  const allSegments: AudioSegment[] = [];
  let segmentIndex = 0;
  let cumulativeMs = 0;
  const revealPositions: number[] = [];

  for (let bi = 0; bi < narration.blockNarrations.length; bi++) {
    const blockNarration = narration.blockNarrations[bi];
    let blockStartMs = cumulativeMs;

    for (const seg of blockNarration.segments) {
      const chunks = splitTextAtMarkers(seg.text, seg.audioTag);

      for (const chunk of chunks) {
        if (chunk.text.length === 0) continue;

        const durationMs = estimateDuration(chunk.text);
        const isSilence = chunk.text.trim().length === 0;

        const audioSeg: AudioSegment = {
          segmentIndex,
          blockId: blockNarration.blockId,
          text: chunk.text,
          audioTag: chunk.audioTag,
          durationMs,
          revealTrigger: chunk.revealTrigger,
          hasSocraticPause: chunk.socraticPause > 0,
          socraticPauseSeconds: chunk.socraticPause,
          pauseAfterMs: chunk.pauseAfterMs,
          isSilence,
        };

        allSegments.push(audioSeg);
        segmentIndex++;

        if (chunk.revealTrigger) {
          revealPositions.push(cumulativeMs + durationMs);
        }

        cumulativeMs += durationMs;

        if (chunk.socraticPause > 0) {
          const pauseMs = chunk.socraticPause * 1000;
          const pauseSeg: AudioSegment = {
            segmentIndex,
            blockId: blockNarration.blockId,
            text: '',
            durationMs: pauseMs,
            revealTrigger: false,
            hasSocraticPause: true,
            socraticPauseSeconds: 0,
            pauseAfterMs: 0,
            isSilence: true,
          };
          allSegments.push(pauseSeg);
          segmentIndex++;
          cumulativeMs += pauseMs;
        }

        if (chunk.pauseAfterMs > 0) {
          const pauseSeg: AudioSegment = {
            segmentIndex,
            blockId: blockNarration.blockId,
            text: '',
            durationMs: chunk.pauseAfterMs,
            revealTrigger: false,
            hasSocraticPause: false,
            socraticPauseSeconds: 0,
            pauseAfterMs: 0,
            isSilence: true,
          };
          allSegments.push(pauseSeg);
          segmentIndex++;
          cumulativeMs += chunk.pauseAfterMs;
        }
      }
    }

    const interBlockPause =
      narration.interBlockPausesMs[bi] !== undefined
        ? narration.interBlockPausesMs[bi]
        : 2000;

    if (bi < narration.blockNarrations.length - 1) {
      const pauseSeg: AudioSegment = {
        segmentIndex,
        blockId: blockNarration.blockId,
        text: '',
        durationMs: interBlockPause,
        revealTrigger: false,
        hasSocraticPause: false,
        socraticPauseSeconds: 0,
        pauseAfterMs: 0,
        isSilence: true,
      };
      allSegments.push(pauseSeg);
      segmentIndex++;
      cumulativeMs += interBlockPause;
    }
  }

  console.log(
    '[NarrationAudio] Generated',
    allSegments.length,
    'audio segments for',
    narration.blockNarrations.length,
    'blocks —',
    cumulativeMs,
    'ms total'
  );

  return {
    segments: allSegments,
    totalDurationMs: cumulativeMs,
    revealPositions,
  };
}
