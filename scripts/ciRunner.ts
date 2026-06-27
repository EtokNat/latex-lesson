import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { configureLLMClient } from '../src/services/llmClient';
import { configureTTSClient } from '../src/services/ttsClient';
import { createGeminiProvider } from './geminiProvider';
import { createEspeakProvider } from './espeakProvider';
import { createElevenLabsProvider } from './elevenLabsProvider';
import { runPipeline, type CLIConfig } from './cli';

function parseArgs(args: string[]): CLIConfig {
  const config: CLIConfig = {
    lesson: 'seed',
    output: './output/final.mp4',
    resolution: '1920x1080',
    fps: 30,
    voice: 'espeak',
    dryRun: false,
    noSandbox: true,
    ttsEnabled: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--lesson':
        config.lesson = args[++i];
        break;
      case '--output':
        config.output = args[++i];
        break;
      case '--resolution':
        config.resolution = args[++i];
        break;
      case '--fps':
        config.fps = Number(args[++i]);
        break;
      case '--voice':
        config.voice = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--no-sandbox':
        config.noSandbox = true;
        break;
    }
  }

  return config;
}

async function startServer(port: number): Promise<ChildProcess> {
  console.log(`[CIRunner] Starting Vite preview server on port ${port}...`);

  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--host'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
    detached: true,
  });

  let serverOutput = '';
  server.stdout?.on('data', (data: Buffer) => {
    serverOutput += data.toString();
  });
  server.stderr?.on('data', (data: Buffer) => {
    serverOutput += data.toString();
  });

  server.on('exit', (code) => {
    console.log(`[CIRunner] Server exited with code ${code}`);
  });

  const url = `http://localhost:${port}`;
  const startTime = Date.now();
  const timeoutMs = 30_000;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        const text = await res.text();
        if (text.includes('<!DOCTYPE') || text.includes('<div id=')) {
          console.log(`[CIRunner] Server ready after ${Date.now() - startTime}ms`);
          await new Promise((r) => setTimeout(r, 1000));
          return server;
        }
      }
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.error(`[CIRunner] Server output: ${serverOutput}`);
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

function killServer(server: ChildProcess): void {
  try {
    if (server.pid) {
      // Kill entire process group (negative PID = process group)
      process.kill(-server.pid, 'SIGKILL');
      console.log('[CIRunner] Server process group killed');
    }
  } catch {
    try {
      server.kill('SIGKILL');
      console.log('[CIRunner] Server killed (fallback)');
    } catch {
      // already dead
    }
  }
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));

  console.log('[CIRunner] Configuring providers...');

  // LLM: Gemini (always available via API key)
  try {
    const geminiFn = createGeminiProvider();
    configureLLMClient(geminiFn);
    console.log('[CIRunner] LLM: Gemini configured');
  } catch (err) {
    console.error(`[CIRunner] LLM setup failed: ${err}`);
    console.error('[CIRunner] GEMINI_API_KEY secret must be set in GitHub repo settings');
    process.exit(1);
  }

  // TTS: try ElevenLabs first, fall back to espeak-ng
  if (config.voice && config.voice !== 'espeak') {
    try {
      const elevenLabsFn = createElevenLabsProvider();
      configureTTSClient(elevenLabsFn);
      config.ttsEnabled = true;
      console.log('[CIRunner] TTS: ElevenLabs configured');
    } catch {
      console.log('[CIRunner] ElevenLabs not available (ELEVENLABS_API_KEY not set), falling back to espeak-ng');
      try {
        const espeakFn = createEspeakProvider();
        configureTTSClient(espeakFn);
        config.ttsEnabled = true;
        config.voice = 'espeak';
        console.log('[CIRunner] TTS: espeak-ng configured (free)');
      } catch (err2) {
        console.warn(`[CIRunner] TTS unavailable: ${err2}. Video will have silence.`);
        config.ttsEnabled = false;
      }
    }
  } else {
    try {
      const espeakFn = createEspeakProvider();
      configureTTSClient(espeakFn);
      config.ttsEnabled = true;
      config.voice = 'espeak';
      console.log('[CIRunner] TTS: espeak-ng configured (free)');
    } catch (err) {
      console.warn(`[CIRunner] espeak-ng unavailable: ${err}. Video will have silence.`);
      config.ttsEnabled = false;
    }
  }

  const port = 5173;
  let server: ChildProcess | null = null;

  try {
    server = await startServer(port);
    await runPipeline(config);
    console.log('[CIRunner] Pipeline completed successfully');
  } finally {
    if (server) {
      killServer(server);
    }
  }
}

main().catch((err) => {
  console.error('[CIRunner] Fatal error:', err);
  process.exit(1);
});
