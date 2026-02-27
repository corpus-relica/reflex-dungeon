import type { Workflow } from '@corpus-relica/reflex';
import type { CombatNodeSpec } from '../types.js';

/**
 * Sub-workflow: combat (6 nodes)
 *
 * Reusable combat encounter. The parent workflow's invoking node spec
 * contains enemy context — the DungeonAgent identifies which enemy based
 * on the parent node (GUARD_ROOM vs BOSS_LAIR) and configures accordingly.
 *
 * Combat reads `has_sword`, `has_potion` from parent blackboard via scoped reads.
 * Returns `combat_result` ('victory' | 'defeat') via returnMap.
 *
 * Combat resolves in a single round for simplicity (DAG, no cycles):
 * - ENCOUNTER: describe the enemy, write enemy_name/enemy_hp to local bb
 * - PLAYER_TURN: player picks action (attack/potion/defend)
 * - RESOLVE_ATTACK: agent resolves the entire fight based on action + inventory
 * - CHECK_OUTCOME: fan-out to victory or defeat based on result flags
 * - VICTORY_C / DEFEAT_C: terminal nodes
 */
export const combat: Workflow = {
  id: 'combat',
  entry: 'ENCOUNTER',
  nodes: {
    ENCOUNTER: {
      id: 'ENCOUNTER',
      description: 'Enemy appears',
      spec: {
        type: 'encounter',
        narrative: 'A foe stands before you!',
      } satisfies CombatNodeSpec,
    },
    PLAYER_TURN: {
      id: 'PLAYER_TURN',
      description: 'Choose your action',
      spec: {
        type: 'player_turn',
        suspend: true,
        prompt: 'What do you do?',
        choices: [
          { label: '⚔️ Attack', value: 'attack' },
          { label: '🧪 Use Potion', value: 'potion' },
          { label: '🛡️ Defend', value: 'defend' },
        ],
        writeKey: 'action',
      } satisfies CombatNodeSpec,
    },
    RESOLVE_ATTACK: {
      id: 'RESOLVE_ATTACK',
      description: 'Resolve combat round',
      spec: {
        type: 'resolve',
        narrative: 'The blows are exchanged...',
      } satisfies CombatNodeSpec,
    },
    CHECK_OUTCOME: {
      id: 'CHECK_OUTCOME',
      description: 'Check combat outcome',
      spec: {
        type: 'check',
      } satisfies CombatNodeSpec,
    },
    VICTORY_C: {
      id: 'VICTORY_C',
      description: 'Enemy defeated',
      spec: {
        type: 'victory',
        narrative: 'The enemy falls!',
      } satisfies CombatNodeSpec,
    },
    DEFEAT_C: {
      id: 'DEFEAT_C',
      description: 'Player falls',
      spec: {
        type: 'defeat',
        narrative: 'You collapse...',
      } satisfies CombatNodeSpec,
    },
  },
  edges: [
    { id: 'e-encounter-turn', from: 'ENCOUNTER', to: 'PLAYER_TURN', event: 'NEXT' },
    { id: 'e-turn-resolve', from: 'PLAYER_TURN', to: 'RESOLVE_ATTACK', event: 'NEXT' },
    { id: 'e-resolve-check', from: 'RESOLVE_ATTACK', to: 'CHECK_OUTCOME', event: 'NEXT' },

    // CHECK_OUTCOME fan-out based on combat result
    {
      id: 'e-check-victory',
      from: 'CHECK_OUTCOME',
      to: 'VICTORY_C',
      event: 'VICTORY',
      guard: { type: 'equals', key: 'enemy_defeated', value: true },
    },
    {
      id: 'e-check-defeat',
      from: 'CHECK_OUTCOME',
      to: 'DEFEAT_C',
      event: 'DEFEAT',
      guard: { type: 'equals', key: 'player_defeated', value: true },
    },
  ],
};
