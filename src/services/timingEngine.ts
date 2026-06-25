import type { WordTimestamp } from './ttsClient';

export interface TimingSource {
  name: string;
  revealTimestampsMs: number[];
}

export interface RevealTiming {
  revealIndex: number;
  timeMs: number;
  confidence: 'high' | 'medium' | 'low';
  sourceBreakdown: Array<{ source: string; valueMs: number }>;
}

export interface TimingEngineResult {
  reveals: RevealTiming[];
  bufferMs: number;
}

const REVEAL_BUFFER_MS = 300;

export function computeRevealTimingsFromWordTimestamps(
  wordTimestamps: WordTimestamp[],
  revealPositions: number[],
  text: string
): number[] {
  if (revealPositions.length === 0) return [];

  const words = text.split(/\s+/).filter(Boolean);
  const timings: number[] = [];

  for (const revealPos of revealPositions) {
    let charCount = 0;
    let targetWordIndex = 0;

    for (let i = 0; i < words.length; i++) {
      charCount += words[i].length + 1;
      if (charCount >= revealPos) {
        targetWordIndex = i;
        break;
      }
    }

    targetWordIndex = Math.min(targetWordIndex, wordTimestamps.length - 1);

    if (wordTimestamps[targetWordIndex]) {
      const ts = wordTimestamps[targetWordIndex];
      const midpoint = (ts.startMs + ts.endMs) / 2;
      timings.push(Math.max(0, midpoint - REVEAL_BUFFER_MS));
    } else if (wordTimestamps.length > 0) {
      const last = wordTimestamps[wordTimestamps.length - 1];
      timings.push(last.endMs);
    } else {
      timings.push(revealPos * 50);
    }
  }

  return timings;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeConfidence(sources: number[]): 'high' | 'medium' | 'low' {
  if (sources.length >= 3) return 'high';
  if (sources.length === 2) return 'medium';
  return 'low';
}

export function reconcileTimings(
  primarySource: TimingSource,
  secondarySource?: TimingSource,
  tertiarySource?: TimingSource
): TimingEngineResult {
  console.log('[TimingEngine] Reconciling timings from primary:', primarySource.name);

  const allSources = [primarySource];
  if (secondarySource && secondarySource.revealTimestampsMs.length > 0) {
    allSources.push(secondarySource);
  }
  if (tertiarySource && tertiarySource.revealTimestampsMs.length > 0) {
    allSources.push(tertiarySource);
  }

  const revealCount = primarySource.revealTimestampsMs.length;
  const reveals: RevealTiming[] = [];

  for (let i = 0; i < revealCount; i++) {
    const values: number[] = [];
    const breakdown: Array<{ source: string; valueMs: number }> = [];

    for (const source of allSources) {
      const value = source.revealTimestampsMs[i];
      if (value !== undefined && !isNaN(value)) {
        values.push(value);
        breakdown.push({ source: source.name, valueMs: value });
      }
    }

    const reconciledMs = median(values);
    const bufferedMs = Math.max(0, reconciledMs - REVEAL_BUFFER_MS);

    reveals.push({
      revealIndex: i,
      timeMs: bufferedMs,
      confidence: computeConfidence(values),
      sourceBreakdown: breakdown,
    });
  }

  console.log('[TimingEngine] Reconciled', reveals.length, 'reveals, buffer:', REVEAL_BUFFER_MS, 'ms');

  return { reveals, bufferMs: REVEAL_BUFFER_MS };
}
