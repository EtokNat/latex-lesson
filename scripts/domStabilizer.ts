import type { Page } from 'playwright';

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Waits for the DOM to stabilize after a keypress by monitoring
 * requestAnimationFrame callbacks and DOM mutations.
 *
 * Returns the number of milliseconds waited (0 if invisible step skipped).
 */
export async function waitForDOMStable(
  page: Page,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<number> {
  console.log('[DOMStabilizer] Waiting for DOM to stabilize...');
  const startTime = Date.now();

  try {
    const hasRevealTarget = await page.evaluate(() => {
      return !!document.querySelector('#active-reveal-target');
    });

    if (!hasRevealTarget) {
      console.log('[DOMStabilizer] No active reveal target — invisible step, skipping wait');
      return 0;
    }

    await page.waitForFunction(
      () => {
        return new Promise<boolean>((resolve) => {
          let settled = false;
          const observer = new MutationObserver(() => {
            settled = false;
          });
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          });

          let framesSinceMutation = 0;
          const requiredStableFrames = 3;

          function tick() {
            if (!settled) {
              settled = true;
              framesSinceMutation = 0;
            } else {
              framesSinceMutation++;
            }
            if (framesSinceMutation >= requiredStableFrames) {
              observer.disconnect();
              resolve(true);
              return;
            }
            requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
        });
      },
      { timeout: timeoutMs },
    );

    const elapsed = Date.now() - startTime;
    console.log(`[DOMStabilizer] DOM stable after ${elapsed}ms`);
    return elapsed;
  } catch {
    const elapsed = Date.now() - startTime;
    console.log(`[DOMStabilizer] DOM stabilization timed out after ${elapsed}ms, continuing`);
    return elapsed;
  }
}
