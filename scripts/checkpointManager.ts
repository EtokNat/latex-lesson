import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface CheckpointState {
  blockIndex: number;
  revealCount: number;
  elapsedMs: number;
}

const DEFAULT_CHECKPOINT_PATH = path.join('output', 'checkpoint.json');

export async function saveCheckpoint(
  state: CheckpointState,
  outputPath?: string,
): Promise<void> {
  console.log(`[Checkpoint] Saved at block ${state.blockIndex}`);
  const filePath = outputPath ?? DEFAULT_CHECKPOINT_PATH;
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Checkpoint] Failed to save checkpoint: ${err}`);
    throw err;
  }
}

export async function loadCheckpoint(
  outputPath?: string,
): Promise<CheckpointState | null> {
  const filePath = outputPath ?? DEFAULT_CHECKPOINT_PATH;
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    const state = parsed as CheckpointState;
    if (
      typeof state.blockIndex !== 'number' ||
      typeof state.revealCount !== 'number' ||
      typeof state.elapsedMs !== 'number'
    ) {
      console.log('[Checkpoint] Invalid checkpoint format, ignoring');
      return null;
    }
    console.log(`[Checkpoint] Resuming from block ${state.blockIndex}`);
    return state;
  } catch {
    console.log('[Checkpoint] No checkpoint found');
    return null;
  }
}

export async function clearCheckpoint(outputPath?: string): Promise<void> {
  const filePath = outputPath ?? DEFAULT_CHECKPOINT_PATH;
  try {
    await fs.unlink(filePath);
    console.log('[Checkpoint] Cleared checkpoint');
  } catch {
    // File doesn't exist — already cleared
  }
}
