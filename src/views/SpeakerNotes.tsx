import React from "react";
import type { LessonBlock } from "../data/types";

interface SpeakerNotesProps {
  block: LessonBlock;
  blockIndex: number;
  totalBlocks: number;
}

const SpeakerNotes: React.FC<SpeakerNotesProps> = ({
  block,
  blockIndex,
  totalBlocks,
}) => {
  console.log(
    "[SpeakerNotes] Mount/Update - blockIndex:",
    blockIndex,
    "blockId:",
    block.id,
  );

  const hasNarration = !!block.narration;
  const hasNarrationSteps =
    block.type === "math" &&
    block.narrationSteps &&
    block.narrationSteps.length > 0;

  return (
    <div className="w-80 bg-gray-900/95 border-l border-gray-700 p-4 overflow-y-auto text-sm">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
        Speaker Notes — Block {blockIndex + 1}/{totalBlocks}
      </h2>

      <div className="text-gray-300 font-medium mb-2">{block.content.slice(0, 80)}{block.content.length > 80 ? "..." : ""}</div>

      {hasNarration && (
        <div className="mb-4">
          <h3 className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            Narration
          </h3>
          <p className="text-gray-300 leading-relaxed">{block.narration}</p>
        </div>
      )}

      {hasNarrationSteps && (
        <div className="mb-4">
          <h3 className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-1">
            Narration Steps
          </h3>
          <ol className="list-decimal list-inside space-y-1">
            {block.narrationSteps!.map((step, i) => (
              <li key={i} className="text-gray-300">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!hasNarration && !hasNarrationSteps && (
        <p className="text-gray-600 italic text-xs">
          No narration data for this block. Add narration in the Lesson Planner.
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-gray-700">
        <h3 className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">
          Teaching Tips
        </h3>
        <ul className="text-gray-400 text-xs space-y-1">
          <li>Pause after key terms to let them sink in.</li>
          <li>Make eye contact before revealing the next step.</li>
          <li>Ask: &ldquo;Does this make sense so far?&rdquo;</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeakerNotes;
