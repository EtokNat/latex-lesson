/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
  type CheckpointState,
} from '../checkpointManager';

let testDir: string;
let checkpointPath: string;

beforeEach(async () => {
  testDir = await fs.mkdtemp(path.join(tmpdir(), 'checkpoint-test-'));
  checkpointPath = path.join(testDir, 'checkpoint.json');
});

afterEach(async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {
    // cleanup is best-effort
  }
});

function makeState(overrides: Partial<CheckpointState> = {}): CheckpointState {
  return {
    blockIndex: 3,
    revealCount: 12,
    elapsedMs: 45000,
    ...overrides,
  };
}

describe('saveCheckpoint', () => {
  it('saves state to the checkpoint file', async () => {
    const state = makeState();
    await saveCheckpoint(state, checkpointPath);

    const raw = await fs.readFile(checkpointPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.blockIndex).toBe(3);
    expect(parsed.revealCount).toBe(12);
    expect(parsed.elapsedMs).toBe(45000);
  });

  it('creates the parent directory if missing', async () => {
    const nestedPath = path.join(testDir, 'deep', 'nested', 'checkpoint.json');
    const state = makeState();
    await saveCheckpoint(state, nestedPath);

    const raw = await fs.readFile(nestedPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.blockIndex).toBe(3);
  });
});

describe('loadCheckpoint', () => {
  it('loads a valid checkpoint', async () => {
    const state = makeState({ blockIndex: 7, elapsedMs: 120000 });
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.writeFile(checkpointPath, JSON.stringify(state), 'utf-8');

    const loaded = await loadCheckpoint(checkpointPath);
    expect(loaded).not.toBeNull();
    expect(loaded!.blockIndex).toBe(7);
    expect(loaded!.revealCount).toBe(12);
    expect(loaded!.elapsedMs).toBe(120000);
  });

  it('returns null when no checkpoint file exists', async () => {
    const result = await loadCheckpoint(checkpointPath);
    expect(result).toBeNull();
  });

  it('returns null for invalid checkpoint format', async () => {
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.writeFile(checkpointPath, JSON.stringify({ foo: 'bar' }), 'utf-8');

    const result = await loadCheckpoint(checkpointPath);
    expect(result).toBeNull();
  });

  it('returns null for corrupt JSON', async () => {
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.writeFile(checkpointPath, 'not valid json', 'utf-8');

    const result = await loadCheckpoint(checkpointPath);
    expect(result).toBeNull();
  });
});

describe('clearCheckpoint', () => {
  it('removes the checkpoint file', async () => {
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await fs.writeFile(checkpointPath, JSON.stringify(makeState()), 'utf-8');

    await clearCheckpoint(checkpointPath);
    await expect(fs.access(checkpointPath)).rejects.toThrow();
  });

  it('handles missing file gracefully', async () => {
    await expect(clearCheckpoint(checkpointPath)).resolves.toBeUndefined();
  });
});
