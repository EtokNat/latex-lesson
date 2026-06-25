import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Lesson, LessonBlock } from "../data/types";
import ProgressiveAlignedEquation, {
  parseEquation,
  totalReveal,
  smartSplitLines,
} from "../components/ProgressiveAlignedEquation";
import SpeakerNotes from "./SpeakerNotes";

function computeMaxReveal(block: LessonBlock): number {
  if (block.type !== "math") return 1;
  try {
    let eq = block.content.trim();
    if (eq.startsWith("\\begin{aligned}") && eq.endsWith("\\end{aligned}")) {
      eq = eq.slice("\\begin{aligned}".length, -"\\end{aligned}".length).trim();
    }
    const lines = smartSplitLines(eq);
    return lines.reduce((sum, line) => {
      const nodes = parseEquation(line);
      return sum + nodes.reduce((s, n) => s + totalReveal(n), 0);
    }, 0);
  } catch (err) {
    console.error("[PresentationStage] Error computing max reveal:", err);
    return 1;
  }
}

interface PresentationStageProps {
  lesson: Lesson;
  onExit: () => void;
  timingConfig?: number[];
}

const PresentationStage: React.FC<PresentationStageProps> = ({
  lesson,
  onExit,
  timingConfig,
}) => {
  const initialBlock = lesson.blocks[0];
  const [blockIndex, setBlockIndex] = useState(0);
  const [revealCount, setRevealCount] = useState(() =>
    initialBlock?.type === "math" ? 0 : 1,
  );
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownMs, setCountdownMs] = useState(0);
  const [countdownTotal, setCountdownTotal] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);

  const timerStartRef = useRef<number>(Date.now());
  const timerAccumRef = useRef<number>(0);
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const overrideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef({ blockIndex: 0, revealCount: initialBlock?.type === "math" ? 0 : 1 });

  const currentBlock = lesson.blocks[blockIndex] ?? null;
  const maxReveal = currentBlock ? computeMaxReveal(currentBlock) : 0;

  console.log(
    "[PresentationStage] Mount/Update - blockIndex:",
    blockIndex,
    "revealCount:",
    revealCount,
    "maxReveal:",
    maxReveal,
  );

  // Keep position ref in sync
  useEffect(() => {
    positionRef.current = { blockIndex, revealCount };
  }, [blockIndex, revealCount]);

  const advanceBlock = useCallback(() => {
    const { blockIndex: bi, revealCount: rc } = positionRef.current;
    const block = lesson.blocks[bi];
    if (!block || lesson.blocks.length === 0) return;
    const max = computeMaxReveal(block);
    const isMath = block.type === "math";

    console.log("[PresentationStage] Forward - revealCount:", rc, "max:", max);

    if (isMath && rc < max) {
      setRevealCount((prev) => prev + 1);
    } else if (bi < lesson.blocks.length - 1) {
      const nextIdx = bi + 1;
      setBlockIndex(nextIdx);
      setRevealCount(lesson.blocks[nextIdx]?.type === "math" ? 0 : 1);
    }
  }, [lesson.blocks]);

  const retreatBlock = useCallback(() => {
    const { blockIndex: bi, revealCount: rc } = positionRef.current;
    const block = lesson.blocks[bi];
    if (!block || lesson.blocks.length === 0) return;
    const isMath = block.type === "math";

    console.log("[PresentationStage] Backward - revealCount:", rc);

    if (isMath && rc > 0) {
      setRevealCount((prev) => prev - 1);
    } else if (bi > 0) {
      const prevIdx = bi - 1;
      const prevBlock = lesson.blocks[prevIdx];
      setBlockIndex(prevIdx);
      setRevealCount(prevBlock?.type === "math" ? computeMaxReveal(prevBlock) : 1);
    }
  }, [lesson.blocks]);

  const goToBlock = useCallback(
    (index: number) => {
      if (index < 0 || index >= lesson.blocks.length) return;
      const block = lesson.blocks[index];
      console.log("[PresentationStage] Go to block:", index);
      setBlockIndex(index);
      setRevealCount(block?.type === "math" ? 0 : 1);
    },
    [lesson.blocks],
  );

  const resetPresentation = useCallback(() => {
    const firstBlock = lesson.blocks[0];
    console.log("[PresentationStage] Reset presentation");
    setBlockIndex(0);
    setRevealCount(firstBlock?.type === "math" ? 0 : 1);
  }, [lesson.blocks]);

  // Timer effect
  useEffect(() => {
    if (!showTimer || timerPaused) return;

    timerStartRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(timerAccumRef.current + (Date.now() - timerStartRef.current));
    }, 100);

    return () => clearInterval(interval);
  }, [showTimer, timerPaused]);

  // Reset timer on mount
  useEffect(() => {
    timerAccumRef.current = 0;
    timerStartRef.current = Date.now();
  }, []);

  // Auto-advance effect
  useEffect(() => {
    if (!autoAdvance || manualOverride) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
      return;
    }

    const block = lesson.blocks[blockIndex];
    if (!block) return;

    let delay: number;
    if (timingConfig && blockIndex < timingConfig.length) {
      delay = timingConfig[blockIndex];
    } else if (block.type === "math") {
      delay = 2000;
    } else {
      const wordCount = block.content.split(/\s+/).length;
      delay = Math.max(2000, wordCount * 280);
    }

    setCountdownTotal(delay);
    setCountdownMs(delay);
    const startTime = Date.now();

    countdownTimerRef.current = setInterval(() => {
      const remaining = delay - (Date.now() - startTime);
      setCountdownMs(Math.max(0, remaining));
    }, 50);

    autoTimeoutRef.current = setTimeout(() => {
      advanceBlock();
    }, delay);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    };
  }, [autoAdvance, blockIndex, revealCount, manualOverride]);

  // Keyboard handler
  useEffect(() => {
    console.log("[PresentationStage] Attaching keydown listener");

    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        if (e.key === "Escape") {
          console.log("[PresentationStage] Escape pressed, exiting");
          onExit();
          return;
        }

        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          console.log("[PresentationStage] Toggle speaker notes");
          setShowSpeakerNotes((prev) => !prev);
          return;
        }

        if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          console.log("[PresentationStage] Toggle timer");
          setShowTimer((prev) => {
            if (prev) {
              timerAccumRef.current = 0;
              setElapsedMs(0);
              setTimerPaused(false);
            }
            return !prev;
          });
          return;
        }

        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          console.log("[PresentationStage] Toggle auto-advance");
          setAutoAdvance((prev) => {
            if (prev) {
              setCountdownMs(0);
              setCountdownTotal(0);
            }
            return !prev;
          });
          setManualOverride(false);
          return;
        }

        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          if (showTimer) {
            console.log("[PresentationStage] Toggle timer pause");
            setTimerPaused((prev) => {
              if (prev) {
                timerAccumRef.current = elapsedMs;
              } else {
                timerAccumRef.current = elapsedMs;
              }
              return !prev;
            });
          }
          return;
        }

        const block = lesson.blocks[blockIndex];
        if (!block || lesson.blocks.length === 0) return;

        const max = computeMaxReveal(block);
        const isMath = block.type === "math";

        if (e.key === " " || e.key === "ArrowRight") {
          e.preventDefault();

          if (autoAdvance) {
            setManualOverride(true);
            if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
            overrideTimeoutRef.current = setTimeout(() => {
              setManualOverride(false);
            }, 3000);
          }

          advanceBlock();
        } else if (e.key === "Backspace" || e.key === "ArrowLeft") {
          e.preventDefault();
          retreatBlock();
        }
      } catch (err) {
        console.error("[PresentationStage] Key handler error:", err);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      console.log("[PresentationStage] Removing keydown listener");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    blockIndex,
    revealCount,
    lesson.blocks,
    onExit,
    advanceBlock,
    retreatBlock,
    showTimer,
    showSpeakerNotes,
    autoAdvance,
    elapsedMs,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    };
  }, []);

  if (!currentBlock) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <p className="text-white text-xl">
          No blocks to present. Press Escape to exit.
        </p>
      </div>
    );
  }

  const renderBlock = () => {
    switch (currentBlock.type) {
      case "heading":
        return (
          <h1 className="text-4xl font-bold text-white mb-6">
            {currentBlock.content}
          </h1>
        );
      case "text":
        return (
          <p className="text-xl text-white leading-relaxed whitespace-pre-wrap">
            {currentBlock.content}
          </p>
        );
      case "image":
        return (
          <div className="flex flex-col items-center">
            <img
              src={currentBlock.imageUrl}
              alt={currentBlock.content}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
            {currentBlock.content && (
              <p className="text-gray-400 mt-4 text-sm">
                {currentBlock.content}
              </p>
            )}
          </div>
        );
      case "math":
        return (
          <ProgressiveAlignedEquation
            equationString={currentBlock.content}
            revealCount={revealCount}
            displayMode="block"
          />
        );
      default:
        return null;
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center p-8 select-none">
      <div className={`w-full max-w-4xl transition-all duration-300 ${showSpeakerNotes ? "mr-80" : ""}`}>
        {renderBlock()}
      </div>

      {/* Timer */}
      {showTimer && (
        <div className="fixed top-4 left-4 text-gray-400 text-sm font-mono bg-gray-900/80 px-3 py-1.5 rounded">
          <span>{formatTime(elapsedMs)}</span>
          {timerPaused && <span className="ml-2 text-yellow-400">PAUSED</span>}
        </div>
      )}

      {/* Auto-Advance Indicator */}
      {autoAdvance && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900/80 px-3 py-1.5 rounded text-sm">
          <span className="text-green-400 font-mono">Auto-Advance: ON</span>
          {manualOverride && (
            <span className="ml-2 text-yellow-400 font-mono">(paused 3s)</span>
          )}
        </div>
      )}

      {/* Speaker Notes Panel */}
      {showSpeakerNotes && currentBlock && (
        <div className="fixed right-0 top-0 bottom-0 z-10 animate-slide-in-right">
          <SpeakerNotes
            block={currentBlock}
            blockIndex={blockIndex}
            totalBlocks={lesson.blocks.length}
          />
        </div>
      )}

      {/* Block Counter */}
      <div className="fixed bottom-4 right-4 text-gray-600 text-sm font-mono bg-gray-900/80 px-3 py-1.5 rounded">
        Block {blockIndex + 1}/{lesson.blocks.length}
        {currentBlock.type === "math" && ` · Reveal ${revealCount}/${maxReveal}`}
      </div>

      {/* Exit Button */}
      <button
        onClick={onExit}
        className="fixed top-4 right-4 text-gray-600 hover:text-white transition-colors text-sm bg-gray-900/80 px-3 py-1.5 rounded"
      >
        Exit (Esc)
      </button>

      {/* On-Screen Navigation Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-1 bg-gray-900/90 rounded-lg px-3 py-2">
          <button
            onClick={resetPresentation}
            className="text-gray-400 hover:text-white px-2 py-1 rounded text-xs font-mono transition-colors"
            title="Reset (go to first block)"
          >
            ⟳
          </button>
          <button
            onClick={() => goToBlock(blockIndex - 1)}
            disabled={blockIndex === 0}
            className="text-gray-400 hover:text-white px-2 py-1 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous block"
          >
            ◀
          </button>

          {/* Block Indicators */}
          <div className="flex items-center gap-1 px-1">
            {lesson.blocks.map((block, i) => (
              <button
                key={block.id}
                onClick={() => goToBlock(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === blockIndex
                    ? "bg-white scale-125"
                    : "bg-gray-600 hover:bg-gray-400"
                }`}
                title={`Block ${i + 1}: ${block.type}`}
              />
            ))}
          </div>

          <button
            onClick={() => goToBlock(blockIndex + 1)}
            disabled={blockIndex >= lesson.blocks.length - 1}
            className="text-gray-400 hover:text-white px-2 py-1 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next block"
          >
            ▶
          </button>

          <div className="w-px h-4 bg-gray-600 mx-1" />

          <button
            onClick={() => setShowSpeakerNotes((prev) => !prev)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              showSpeakerNotes ? "text-blue-400" : "text-gray-400 hover:text-white"
            }`}
            title="Toggle speaker notes (N)"
          >
            N
          </button>
          <button
            onClick={() => {
              setShowTimer((prev) => {
                if (prev) {
                  timerAccumRef.current = 0;
                  setElapsedMs(0);
                  setTimerPaused(false);
                }
                return !prev;
              });
            }}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              showTimer ? "text-yellow-400" : "text-gray-400 hover:text-white"
            }`}
            title="Toggle timer (T)"
          >
            T
          </button>
          <button
            onClick={() => {
              setAutoAdvance((prev) => {
                if (prev) {
                  setCountdownMs(0);
                  setCountdownTotal(0);
                }
                return !prev;
              });
              setManualOverride(false);
            }}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              autoAdvance ? "text-green-400" : "text-gray-400 hover:text-white"
            }`}
            title="Toggle auto-advance (A)"
          >
            A
          </button>
        </div>
      </div>

      {/* Auto-Advance Countdown Bar */}
      {autoAdvance && countdownTotal > 0 && (
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-gray-800">
          <div
            className="h-full bg-green-500 transition-all duration-100 ease-linear"
            style={{
              width: `${(countdownMs / countdownTotal) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PresentationStage;
