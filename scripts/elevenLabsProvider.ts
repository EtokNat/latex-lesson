import type { TTSFunction, TTSResult, WordTimestamp } from '../src/services/ttsClient';

interface ElevenLabsTimestampsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

export function createElevenLabsProvider(): TTSFunction {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('[ElevenLabsProvider] ELEVENLABS_API_KEY environment variable is not set');
  }

  console.log('[ElevenLabsProvider] Initialized with ElevenLabs API');

  return async function elevenLabsCall(
    text: string,
    voiceId: string,
    options?: { stability?: number; similarity?: number; style?: number },
  ): Promise<TTSResult> {
    const modelId = 'eleven_multilingual_v2';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=pcm_16000`;

    const body = {
      text,
      model_id: modelId,
      voice_settings: {
        stability: options?.stability ?? 0.5,
        similarity_boost: options?.similarity ?? 0.75,
        style: options?.style ?? 0,
      },
    };

    console.log(`[ElevenLabsProvider] Requesting TTS: ${text.length} chars, voice: ${voiceId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[ElevenLabsProvider] API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as ElevenLabsTimestampsResponse;

    const audioBase64 = data.audio_base64;
    const binary = atob(audioBase64);
    const audioBuffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(audioBuffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }

    const wordTimestamps = buildWordTimestamps(data);
    const durationMs =
      data.alignment.character_end_times_seconds.length > 0
        ? Math.round(
            data.alignment.character_end_times_seconds[
              data.alignment.character_end_times_seconds.length - 1
            ] * 1000,
          )
        : 1000;

    console.log(
      `[ElevenLabsProvider] Generated: ${audioBuffer.byteLength} bytes, ${durationMs}ms, ${wordTimestamps.length} words`,
    );

    return { audioBuffer, durationMs, wordTimestamps };
  };
}

function buildWordTimestamps(data: ElevenLabsTimestampsResponse): WordTimestamp[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } = data.alignment;

  const timestamps: WordTimestamp[] = [];
  const chars = characters;
  const starts = character_start_times_seconds.map((s) => Math.round(s * 1000));
  const ends = character_end_times_seconds.map((s) => Math.round(s * 1000));

  let wordChars: string[] = [];
  let wordStart = -1;
  let wordEnd = -1;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch === ' ' || i === chars.length - 1) {
      if (i === chars.length - 1 && ch !== ' ') {
        wordChars.push(ch);
        if (wordStart === -1) wordStart = starts[i];
        wordEnd = ends[i];
      }

      if (wordChars.length > 0) {
        const word = wordChars.join('').replace(/[^a-zA-Z0-9αβγδεζηθικλμνξπρστυφχψωΔ±√∑∫∞]/g, '');
        if (word) {
          timestamps.push({
            word,
            startMs: wordStart,
            endMs: wordEnd,
          });
        }
      }

      wordChars = [];
      wordStart = -1;
      wordEnd = -1;
    } else {
      wordChars.push(ch);
      if (wordStart === -1) wordStart = starts[i];
      wordEnd = ends[i];
    }
  }

  return timestamps;
}
