import type { AudioSegment, NarrationAudioResult } from './narrationAudioGenerator';
import type { RevealTiming } from './timingEngine';

export type TimelineEventType =
  | 'reveal'
  | 'block_advance'
  | 'pause_start'
  | 'pause_end'
  | 'socratic_question'
  | 'lesson_start'
  | 'lesson_end';

export interface TimelineEvent {
  type: TimelineEventType;
  timeMs: number;
  blockId?: string;
  segmentIndex?: number;
  data?: Record<string, unknown>;
}

export interface AbsoluteTimeline {
  events: TimelineEvent[];
  totalDurationMs: number;
  validationErrors: string[];
}

export interface TimelineBuilderInput {
  audioResult: NarrationAudioResult;
  revealTimings: RevealTiming[];
  blockIds: string[];
}

export function buildAbsoluteTimeline(input: TimelineBuilderInput): AbsoluteTimeline {
  console.log('[TimelineBuilder] Building absolute timeline');

  const { audioResult, revealTimings, blockIds } = input;
  const events: TimelineEvent[] = [];
  const validationErrors: string[] = [];
  let cumulativeMs = 0;
  let currentBlockId = blockIds[0] || '';
  let blockStartMs = 0;
  let blockIndex = 0;

  events.push({ type: 'lesson_start', timeMs: 0 });

  for (const seg of audioResult.segments) {
    if (seg.blockId !== currentBlockId) {
      events.push({
        type: 'block_advance',
        timeMs: cumulativeMs,
        blockId: currentBlockId,
        data: { nextBlockId: seg.blockId },
      });
      currentBlockId = seg.blockId;
      blockStartMs = cumulativeMs;
      blockIndex = blockIds.indexOf(seg.blockId);
    }

    if (seg.isSilence && seg.hasSocraticPause) {
      events.push({
        type: 'socratic_question',
        timeMs: cumulativeMs,
        blockId: seg.blockId,
        segmentIndex: seg.segmentIndex,
        data: { durationMs: seg.durationMs },
      });
    }

    if (seg.isSilence && !seg.hasSocraticPause && seg.pauseAfterMs === 0) {
      events.push({
        type: 'pause_start',
        timeMs: cumulativeMs,
        blockId: seg.blockId,
        segmentIndex: seg.segmentIndex,
        data: { durationMs: seg.durationMs },
      });
    }

    cumulativeMs += seg.durationMs;

    if (seg.revealTrigger) {
      events.push({
        type: 'reveal',
        timeMs: cumulativeMs,
        blockId: seg.blockId,
        segmentIndex: seg.segmentIndex,
      });
    }

    if (seg.isSilence && (seg.hasSocraticPause || seg.pauseAfterMs > 0)) {
      events.push({
        type: 'pause_end',
        timeMs: cumulativeMs,
        blockId: seg.blockId,
        segmentIndex: seg.segmentIndex,
      });
    }
  }

  events.push({
    type: 'lesson_end',
    timeMs: cumulativeMs,
    data: { totalDurationMs: cumulativeMs },
  });

  // Merge reveal timing data
  if (revealTimings.length > 0) {
    const revealEvents = events.filter(e => e.type === 'reveal');
    for (let i = 0; i < Math.min(revealEvents.length, revealTimings.length); i++) {
      const timing = revealTimings[i];
      const adjustedTime = blockStartMs + timing.timeMs;
      revealEvents[i].timeMs = adjustedTime;
      revealEvents[i].data = {
        ...revealEvents[i].data,
        confidence: timing.confidence,
        sourceBreakdown: timing.sourceBreakdown,
      };
    }
  }

  // Validate: reveals must be within their parent block's audio duration
  for (const event of events) {
    if (event.type === 'reveal' && event.blockId === currentBlockId) {
      if (event.timeMs > cumulativeMs) {
        validationErrors.push(
          `Reveal at ${event.timeMs}ms exceeds total duration ${cumulativeMs}ms for block ${event.blockId}`
        );
      }
    }
  }

  // Validate: monotonic timestamps
  for (let i = 1; i < events.length; i++) {
    if (events[i].timeMs < events[i - 1].timeMs) {
      validationErrors.push(
        `Non-monotonic timestamp at event ${i}: ${events[i].timeMs}ms < ${events[i - 1].timeMs}ms`
      );
    }
  }

  console.log(
    '[TimelineBuilder] Built timeline:',
    events.length,
    'events,',
    cumulativeMs,
    'ms total,',
    validationErrors.length,
    'validation errors'
  );

  if (validationErrors.length > 0) {
    console.warn('[TimelineBuilder] Validation errors:', validationErrors);
  }

  return {
    events,
    totalDurationMs: cumulativeMs,
    validationErrors,
  };
}
