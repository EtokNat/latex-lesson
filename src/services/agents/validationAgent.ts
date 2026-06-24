import type { Lesson, LessonBlock } from '../data/types';
import type { LessonNarration, BlockNarration, NarrationSegment } from '../data/narrationTypes';
import type { KnowledgeGraph, ConceptNode } from '../data/knowledgeGraph';
import type { SymbolLedger } from '../data/symbolLedger';

export interface ValidationViolation {
  type: string;
  severity: 'CRITICAL' | 'WARNING';
  blockId: string;
  message: string;
  details: string;
}

export interface ValidationReport {
  pass: boolean;
  criticalCount: number;
  warningCount: number;
  violations: ValidationViolation[];
}

function checkVerbatimReading(
  block: LessonBlock,
  narration: BlockNarration | undefined
): ValidationViolation[] {
  if (!narration || block.type === 'heading') return [];

  const violations: ValidationViolation[] = [];
  const onScreenText = block.content.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const segment of narration.segments) {
    const spokenText = segment.text.toLowerCase().replace(/\s+/g, ' ').trim();

    if (spokenText.length < 15) continue;

    // Check for long substrings of the on-screen text in spoken text
    const words = onScreenText.split(' ');
    for (let i = 0; i < words.length - 7; i++) {
      const phrase = words.slice(i, i + 8).join(' ');
      if (spokenText.includes(phrase)) {
        violations.push({
          type: 'VERBATIM_READING',
          severity: 'CRITICAL',
          blockId: block.id,
          message: 'Narration appears to read on-screen text verbatim',
          details: `Found matching phrase: "${phrase}"`,
        });
        break;
      }
    }
    if (violations.length > 0) break;
  }

  return violations;
}

function checkCrossReferences(
  narration: BlockNarration | undefined,
  kg: KnowledgeGraph
): ValidationViolation[] {
  if (!narration) return [];

  const violations: ValidationViolation[] = [];
  const conceptNames = new Set(
    [...kg.concepts.values()].map(c => c.name.toLowerCase())
  );

  const referencePhrases = ['remember', 'recall', 'earlier we', 'you learned', 'as we saw'];
  let referenceCount = 0;

  for (const segment of narration.segments) {
    for (const phrase of referencePhrases) {
      if (segment.text.toLowerCase().includes(phrase)) {
        referenceCount++;
        break;
      }
    }
  }

  if (referenceCount === 0) {
    violations.push({
      type: 'CONNECTION_DENSITY',
      severity: 'WARNING',
      blockId: narration.blockId,
      message: 'Fewer than 2 cross-references in narration',
      details: `Found ${referenceCount} reference phrases — aim for at least 2 cross-references per block`,
    });
  }

  return violations;
}

function checkRevealCoverage(
  block: LessonBlock,
  narration: BlockNarration | undefined
): ValidationViolation[] {
  if (!narration || block.type !== 'math') return [];

  const revealCount = narration.segments.filter(s => s.revealTrigger).length;

  // Math blocks should have at least some reveal triggers
  if (revealCount === 0) {
    return [{
      type: 'STEP_COVERAGE',
      severity: 'WARNING',
      blockId: block.id,
      message: 'Math block has no {REVEAL} triggers in narration',
      details: 'Progressive reveal expects at least 1 reveal trigger per math block',
    }];
  }

  return [];
}

function checkDeadVoice(narration: BlockNarration | undefined): ValidationViolation[] {
  if (!narration) return [];

  let consecutiveNoTag = 0;

  for (const segment of narration.segments) {
    if (!segment.audioTag) {
      consecutiveNoTag++;
    } else {
      consecutiveNoTag = 0;
    }
    if (consecutiveNoTag > 3) {
      return [{
        type: 'DEAD_VOICE',
        severity: 'WARNING',
        blockId: narration.blockId,
        message: 'More than 3 consecutive segments with no emotional tag',
        details: `Found ${consecutiveNoTag} consecutive untagged segments`,
      }];
    }
  }

  return [];
}

function checkSymbolConsistency(
  block: LessonBlock,
  narration: BlockNarration | undefined,
  ledger: SymbolLedger
): ValidationViolation[] {
  if (!narration || block.type !== 'math') return [];

  const violations: ValidationViolation[] = [];

  for (const [canonical, entry] of ledger.symbols) {
    for (const alias of entry.aliases) {
      const aliasInNarration = narration.segments.some(s => s.text.includes(alias));
      const canonicalInNarration = narration.segments.some(s => s.text.includes(canonical));

      if (aliasInNarration && canonicalInNarration) {
        violations.push({
          type: 'SYMBOL_INCONSISTENCY',
          severity: 'WARNING',
          blockId: block.id,
          message: `Both "${alias}" and "${canonical}" used — inconsistent notation`,
          details: `The symbol "${canonical}" has alias "${alias}". Use one consistently.`,
        });
      }
    }
  }

  return violations;
}

function checkQuantitativeMatch(
  block: LessonBlock,
  narration: BlockNarration | undefined
): ValidationViolation[] {
  if (!narration || block.type !== 'math') return [];

  const violations: ValidationViolation[] = [];

  // Check for number mismatches: if content mentions "two roots" but narration says "three"
  const numberWords = ['one', 'two', 'three', 'four', 'five'];
  const contentWords = block.content.toLowerCase();

  for (const word of numberWords) {
    if (contentWords.includes(word)) {
      const narrationText = narration.segments.map(s => s.text.toLowerCase()).join(' ');

      for (const otherWord of numberWords) {
        if (otherWord !== word && narrationText.includes(otherWord)) {
          violations.push({
            type: 'QUANTITATIVE_MISMATCH',
            severity: 'CRITICAL',
            blockId: block.id,
            message: `Potential number mismatch: content says "${word}" but narration uses "${otherWord}"`,
            details: 'Verify the numerical claim matches the on-screen content',
          });
          break;
        }
      }
    }
  }

  return violations;
}

function checkForwardReferences(narration: BlockNarration | undefined): ValidationViolation[] {
  if (!narration) return [];

  let forwardRefCount = 0;
  const forwardPhrases = ["we'll see", 'we will see', 'later on', 'coming up', 'in a moment'];

  for (const segment of narration.segments) {
    for (const phrase of forwardPhrases) {
      if (segment.text.toLowerCase().includes(phrase)) {
        forwardRefCount++;
      }
    }
  }

  if (forwardRefCount > 3) {
    return [{
      type: 'FORWARD_REFERENCE_UNRESOLVED',
      severity: 'WARNING',
      blockId: narration.blockId,
      message: `Too many forward references (${forwardRefCount})`,
      details: 'More than 3 "we\'ll see this later" occurrences — prefer concrete references to past concepts',
    }];
  }

  return [];
}

function checkEmotionalToneMismatch(narration: BlockNarration | undefined): ValidationViolation[] {
  if (!narration) return [];

  const warningWords = ['warning', 'caution', 'be careful', 'danger', 'mistake', 'wrong'];

  for (const segment of narration.segments) {
    const text = segment.text.toLowerCase();
    const hasWarningWord = warningWords.some(w => text.includes(w));

    if (hasWarningWord && segment.audioTag === 'excited') {
      return [{
        type: 'EMOTIONAL_TONE_MISMATCH',
        severity: 'WARNING',
        blockId: narration.blockId,
        message: '[excited] tag used in warning/caution context',
        details: `Segment text contains warning language but uses [excited] tag`,
      }];
    }
  }

  return [];
}

export function validateNarration(
  narration: LessonNarration,
  lesson: Lesson,
  kg: KnowledgeGraph,
  ledger: SymbolLedger
): ValidationReport {
  console.log('[ValidationAgent] Checking narration for', narration.blockNarrations.length, 'blocks');

  const allViolations: ValidationViolation[] = [];

  for (const block of lesson.blocks) {
    const blockNarration = narration.blockNarrations.find(bn => bn.blockId === block.id);

    allViolations.push(...checkVerbatimReading(block, blockNarration));
    allViolations.push(...checkCrossReferences(blockNarration, kg));
    allViolations.push(...checkRevealCoverage(block, blockNarration));
    allViolations.push(...checkDeadVoice(blockNarration));
    allViolations.push(...checkSymbolConsistency(block, blockNarration, ledger));
    allViolations.push(...checkQuantitativeMatch(block, blockNarration));
    allViolations.push(...checkForwardReferences(blockNarration));
    allViolations.push(...checkEmotionalToneMismatch(blockNarration));
  }

  const criticalCount = allViolations.filter(v => v.severity === 'CRITICAL').length;
  const warningCount = allViolations.filter(v => v.severity === 'WARNING').length;
  const pass = criticalCount === 0;

  console.log('[ValidationAgent] Checked narration:', criticalCount, 'critical,', warningCount, 'warnings');
  return { pass, criticalCount, warningCount, violations: allViolations };
}
