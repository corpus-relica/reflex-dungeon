import type { Workflow } from '@corpus-relica/reflex';
import type { PuzzleNodeSpec } from '../types.js';

/**
 * Sub-workflow: puzzle-riddle (4 nodes)
 *
 * A riddle puzzle in the Library. Present a riddle with 3 choices.
 * Correct answer → SOLVED, wrong → FAILED. Both paths continue
 * (the puzzle is forgiving — you always progress).
 *
 * The agent writes the answer at ATTEMPT and picks the correct outgoing
 * edge directly (no guards on ATTEMPT edges — the agent knows which is
 * correct based on the player's choice).
 *
 * Returns `puzzle_solved` (true/false) via returnMap.
 */
export const puzzleRiddle: Workflow = {
  id: 'puzzle-riddle',
  entry: 'EXAMINE',
  nodes: {
    EXAMINE: {
      id: 'EXAMINE',
      description: 'Read the riddle',
      spec: {
        type: 'examine',
        narrative:
          'The inscription glows brighter as you approach. Ancient letters form a riddle:\n\n"I have cities, but no houses.\nI have mountains, but no trees.\nI have water, but no fish.\nI have roads, but no cars.\n\nWhat am I?"',
      } satisfies PuzzleNodeSpec,
    },
    ATTEMPT: {
      id: 'ATTEMPT',
      description: 'Answer the riddle',
      spec: {
        type: 'attempt',
        suspend: true,
        prompt: 'What is your answer?',
        choices: [
          { label: '🗺️ A Map', value: 'correct' },
          { label: '💭 A Dream', value: 'wrong1' },
          { label: '📖 A Book', value: 'wrong2' },
        ],
        writeKey: 'answer',
      } satisfies PuzzleNodeSpec,
    },
    SOLVED: {
      id: 'SOLVED',
      description: 'Riddle solved!',
      spec: {
        type: 'solved',
        narrative:
          'The inscription flares with golden light. "A MAP — yes!" The stone lectern splits open, revealing a hidden passage. The spirits of the library seem to nod in approval.',
      } satisfies PuzzleNodeSpec,
    },
    FAILED: {
      id: 'FAILED',
      description: 'Wrong answer',
      spec: {
        type: 'failed',
        narrative:
          'The inscription dims and the chamber trembles. A wrong answer. But the ancient mechanism clicks open anyway — the tomb is old, and its locks are forgiving. The path forward opens, though the spirits seem disappointed.',
      } satisfies PuzzleNodeSpec,
    },
  },
  edges: [
    { id: 'e-examine-attempt', from: 'EXAMINE', to: 'ATTEMPT', event: 'NEXT' },
    // No guards — agent picks the correct edge based on the answer
    { id: 'e-attempt-solved', from: 'ATTEMPT', to: 'SOLVED', event: 'CORRECT' },
    { id: 'e-attempt-failed', from: 'ATTEMPT', to: 'FAILED', event: 'WRONG' },
  ],
};
