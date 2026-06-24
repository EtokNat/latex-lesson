import React, { useState, useEffect } from "react";
import type { Lesson, LessonBlock } from "../data/types";
import ProgressiveAlignedEquation, {
  parseEquation,
  totalReveal,
  smartSplitLines,
} from "../components/ProgressiveAlignedEquation";

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
}

const PresentationStage: React.FC<PresentationStageProps> = ({
  lesson,
  onExit,
}) => {
  const initialBlock = lesson.blocks[0];
  const [blockIndex, setBlockIndex] = useState(0);
  const [revealCount, setRevealCount] = useState(() =>
    initialBlock?.type === "math" ? 0 : 1,
  );

  const currentBlock = lesson.blocks[blockIndex] ?? null;
  const maxReveal = currentBlock ? computeMaxReveal(currentBlock) : 0;

  console.log("[PresentationStage] Mount/Update - blockIndex:", blockIndex, "revealCount:", revealCount, "maxReveal:", maxReveal);

  useEffect(() => {
    console.log("[PresentationStage] Attaching keydown listener");

    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        if (e.key === "Escape") {
          console.log("[PresentationStage] Escape pressed, exiting");
          onExit();
          return;
        }

        const block = lesson.blocks[blockIndex];
        if (!block || lesson.blocks.length === 0) return;

        const max = computeMaxReveal(block);
        const isMath = block.type === "math";

        if (e.key === " " || e.key === "ArrowRight") {
          e.preventDefault();
          console.log("[PresentationStage] Forward - revealCount:", revealCount, "max:", max);

          if (isMath && revealCount < max) {
            setRevealCount((prev) => prev + 1);
          } else if (blockIndex < lesson.blocks.length - 1) {
            const nextIdx = blockIndex + 1;
            setBlockIndex(nextIdx);
            setRevealCount(lesson.blocks[nextIdx]?.type === "math" ? 0 : 1);
          }
        } else if (e.key === "Backspace" || e.key === "ArrowLeft") {
          e.preventDefault();
          console.log("[PresentationStage] Backward - revealCount:", revealCount);

          if (isMath && revealCount > 0) {
            setRevealCount((prev) => prev - 1);
          } else if (blockIndex > 0) {
            const prevIdx = blockIndex - 1;
            const prevBlock = lesson.blocks[prevIdx];
            setBlockIndex(prevIdx);
            setRevealCount(
              prevBlock?.type === "math" ? computeMaxReveal(prevBlock) : 1,
            );
          }
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
  }, [blockIndex, revealCount, lesson.blocks, onExit]);

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

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center p-8 select-none">
      <div className="w-full max-w-4xl">{renderBlock()}</div>

      <div className="fixed bottom-4 right-4 text-gray-600 text-sm font-mono">
        Block {blockIndex + 1}/{lesson.blocks.length}
        {currentBlock.type === "math" &&
          ` · Reveal ${revealCount}/${maxReveal}`}
      </div>

      <button
        onClick={onExit}
        className="fixed top-4 right-4 text-gray-600 hover:text-white transition-colors text-sm"
      >
        Exit (Esc)
      </button>
    </div>
  );
};

export default PresentationStage;
