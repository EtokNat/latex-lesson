/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitForDOMStable } from '../domStabilizer';

function makeMockPage(overrides: {
  evaluateResult?: unknown;
  waitForFunctionBehavior?: 'resolve' | 'timeout';
  waitForFunctionMs?: number;
} = {}) {
  const {
    evaluateResult = true,
    waitForFunctionBehavior = 'resolve',
    waitForFunctionMs = 50,
  } = overrides;

  return {
    evaluate: vi.fn().mockResolvedValue(evaluateResult),
    waitForFunction: vi.fn().mockImplementation(
      (_fn: unknown, _opts?: unknown) => {
        if (waitForFunctionBehavior === 'timeout') {
          return Promise.reject(new Error('Timeout exceeded'));
        }
        return new Promise((resolve) => setTimeout(resolve, waitForFunctionMs));
      },
    ),
  };
}

describe('waitForDOMStable', () => {
  it('waits for DOM to stabilize and returns elapsed time', async () => {
    const page = makeMockPage({ waitForFunctionMs: 10 });
    const elapsed = await waitForDOMStable(page as never);
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(page.evaluate).toHaveBeenCalled();
    expect(page.waitForFunction).toHaveBeenCalled();
  });

  it('skips wait when no active reveal target is present', async () => {
    const page = makeMockPage({ evaluateResult: false });
    const elapsed = await waitForDOMStable(page as never);
    expect(elapsed).toBe(0);
    expect(page.waitForFunction).not.toHaveBeenCalled();
  });

  it('times out gracefully and continues', async () => {
    const page = makeMockPage({ waitForFunctionBehavior: 'timeout' });
    const elapsed = await waitForDOMStable(page as never);
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(page.waitForFunction).toHaveBeenCalled();
  });

  it('passes timeout option to waitForFunction', async () => {
    const page = makeMockPage({ waitForFunctionMs: 5 });
    await waitForDOMStable(page as never, 500);
    expect(page.waitForFunction).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 500 },
    );
  });

  it('returns a non-negative elapsed time for invisible steps', async () => {
    const page = makeMockPage({ evaluateResult: false });
    const elapsed = await waitForDOMStable(page as never);
    expect(elapsed).toBe(0);
  });
});
