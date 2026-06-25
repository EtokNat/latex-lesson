import type { NarrationSegment, AudioTag } from '../data/narrationTypes';

const VALID_TTS_TAGS: Set<string> = new Set([
  'excited', 'warmly', 'measured', 'encouraging', 'authoritatively',
  'calm', 'curious', 'bright', 'patiently', 'reassuring', 'seriously', 'firmly',
]);

const TAG_SUBSTITUTIONS: Record<string, string> = {};

export interface TagProcessingResult {
  segments: NarrationSegment[];
  substitutions: Array<{ original: string; substituted: string; reason: string }>;
}

export function calibrateTagSubstitutions(
  voiceId: string,
  badTags: Array<{ tag: string; substitute: string }>
): void {
  console.log('[AudioTagPreprocessor] Calibrating substitutions for voice:', voiceId);
  for (const { tag, substitute } of badTags) {
    if (!VALID_TTS_TAGS.has(substitute)) {
      console.warn('[AudioTagPreprocessor] Invalid substitute tag:', substitute, '- skipping');
      continue;
    }
    TAG_SUBSTITUTIONS[tag] = substitute;
    console.log('[AudioTagPreprocessor] Substitution:', tag, '→', substitute);
  }
}

export function clearTagSubstitutions(): void {
  for (const key of Object.keys(TAG_SUBSTITUTIONS)) {
    delete TAG_SUBSTITUTIONS[key];
  }
}

function validateAndSubstituteTag(tag: string | undefined): {
  tag: AudioTag | undefined;
  substituted: boolean;
  original?: string;
  reason?: string;
} {
  if (!tag) return { tag: undefined, substituted: false };

  const normalized = tag.toLowerCase().trim();

  if (VALID_TTS_TAGS.has(normalized)) {
    if (TAG_SUBSTITUTIONS[normalized]) {
      const substitute = TAG_SUBSTITUTIONS[normalized];
      return {
        tag: substitute as AudioTag,
        substituted: true,
        original: normalized,
        reason: `Voice calibration: ${normalized} → ${substitute}`,
      };
    }
    return { tag: normalized as AudioTag, substituted: false };
  }

  if (TAG_SUBSTITUTIONS[normalized]) {
    return {
      tag: TAG_SUBSTITUTIONS[normalized] as AudioTag,
      substituted: true,
      original: normalized,
      reason: `Unknown tag substituted via calibration: ${normalized}`,
    };
  }

  return {
    tag: 'measured' as AudioTag,
    substituted: true,
    original: normalized,
    reason: `Unknown tag "${normalized}" defaulted to "measured"`,
  };
}

export function preprocessAudioTags(segments: NarrationSegment[]): TagProcessingResult {
  console.log('[AudioTagPreprocessor] Processing', segments.length, 'segments');

  const substitutions: TagProcessingResult['substitutions'] = [];
  const processed: NarrationSegment[] = segments.map(seg => {
    const result = validateAndSubstituteTag(seg.audioTag);

    if (result.substituted && result.original) {
      substitutions.push({
        original: result.original,
        substituted: result.tag || 'measured',
        reason: result.reason || 'Unknown reason',
      });
    }

    return {
      ...seg,
      audioTag: result.tag,
    };
  });

  console.log(
    '[AudioTagPreprocessor] Processed',
    processed.length,
    'segments,',
    substitutions.length,
    'substitutions'
  );

  return { segments: processed, substitutions };
}

export { VALID_TTS_TAGS };
