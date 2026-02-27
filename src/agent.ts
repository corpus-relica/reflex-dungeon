import type {
  DecisionAgent,
  DecisionContext,
  Decision,
  BlackboardWrite,
} from '@corpus-relica/reflex';
import type { DungeonNodeSpec, CombatNodeSpec, PuzzleNodeSpec, AnyNodeSpec } from './types.js';

/**
 * Shared mutable slot for UI → Agent communication.
 * The UI writes the player's choice here; the agent reads and clears it.
 */
export const pendingChoice: { key: string | null; value: string | null } = {
  key: null,
  value: null,
};

/**
 * DungeonAgent — a DecisionAgent that drives the dungeon crawler.
 *
 * Handles three workflow types:
 * - dungeon-crawl (root): room navigation, loot, choices
 * - combat: encounter resolution, player actions, outcome checking
 * - puzzle-riddle: riddle examination and answer checking
 */
export class DungeonAgent implements DecisionAgent {
  async resolve(context: DecisionContext): Promise<Decision> {
    const workflowId = context.workflow.id;

    if (workflowId === 'combat') {
      return this.resolveCombat(context);
    }
    if (workflowId === 'puzzle-riddle') {
      return this.resolvePuzzle(context);
    }
    return this.resolveDungeon(context);
  }

  // -------------------------------------------------------------------------
  // Root workflow: dungeon-crawl
  // -------------------------------------------------------------------------

  private async resolveDungeon(context: DecisionContext): Promise<Decision> {
    const spec = context.node.spec as unknown as DungeonNodeSpec;
    const nodeId = context.node.id;

    // Terminal nodes → complete
    if (spec.type === 'terminal' || context.validEdges.length === 0) {
      return { type: 'complete' };
    }

    // Check for combat defeat — if a combat sub-workflow returned 'defeat',
    // the game is over. Suspend with a special reason the UI can detect.
    const guardResult = context.blackboard.get('guard_combat_result');
    const bossResult = context.blackboard.get('boss_combat_result');
    if (guardResult === 'defeat' || bossResult === 'defeat') {
      return { type: 'suspend', reason: 'GAME_OVER_DEFEAT' };
    }

    // Suspend nodes: check for pending player input
    if (spec.suspend && spec.writeKey) {
      if (
        pendingChoice.key === spec.writeKey &&
        pendingChoice.value !== null
      ) {
        const choiceValue = pendingChoice.value;
        pendingChoice.key = null;
        pendingChoice.value = null;

        const writes: BlackboardWrite[] = [];

        // Handle specific node logic based on the choice
        if (nodeId === 'ANTECHAMBER') {
          writes.push({ key: 'player_direction', value: choiceValue });
          const edgeId = choiceValue === 'west' ? 'e-go-west' : 'e-go-east';
          const edge = context.validEdges.find((e) => e.id === edgeId);
          if (edge) {
            return { type: 'advance', edge: edge.id, writes };
          }
        }

        if (nodeId.startsWith('ARMORY')) {
          writes.push({ key: 'armory_choice', value: choiceValue });
          if (choiceValue === 'take') {
            writes.push({ key: 'has_sword', value: true });
          }
          const edge = context.validEdges[0];
          return { type: 'advance', edge: edge.id, writes };
        }

        if (nodeId.startsWith('ARCHIVES')) {
          writes.push({ key: 'archives_choice', value: choiceValue });
          if (choiceValue === 'take') {
            writes.push({ key: 'has_potion', value: true });
          }
          const edge = context.validEdges[0];
          return { type: 'advance', edge: edge.id, writes };
        }

        if (nodeId === 'GREAT_HALL') {
          writes.push({ key: 'hall_choice', value: choiceValue });
          if (choiceValue === 'boss') {
            // Try boss door — guard checks for both seals
            const bossEdge = context.validEdges.find(
              (e) => e.id === 'e-hall-boss'
            );
            if (bossEdge) {
              return { type: 'advance', edge: bossEdge.id, writes };
            }
            // Guard failed — seals missing, must escape
            const escapeEdge = context.validEdges.find(
              (e) => e.id === 'e-hall-escape'
            );
            if (escapeEdge) {
              return { type: 'advance', edge: escapeEdge.id, writes };
            }
          }
          // Chose escape
          const escapeEdge = context.validEdges.find(
            (e) => e.id === 'e-hall-escape'
          );
          if (escapeEdge) {
            return { type: 'advance', edge: escapeEdge.id, writes };
          }
        }

        // Generic fallback: write the choice and pick first valid edge
        writes.push({ key: spec.writeKey, value: choiceValue });
        const edge = context.validEdges[0];
        if (edge) {
          return { type: 'advance', edge: edge.id, writes };
        }
      }

      // No choice yet — suspend
      return { type: 'suspend', reason: spec.prompt ?? 'Awaiting input' };
    }

    // Auto-write loot rooms (non-suspend, like seal stones and throne)
    const writes: BlackboardWrite[] = [];
    if (spec.autoWriteKey && spec.writeValue !== undefined) {
      writes.push({ key: spec.autoWriteKey, value: spec.writeValue });
    }

    // Auto-advance: pick first valid edge
    const edge = context.validEdges[0];
    if (edge) {
      return { type: 'advance', edge: edge.id, writes };
    }

    return { type: 'suspend', reason: 'No valid edges' };
  }

  // -------------------------------------------------------------------------
  // Sub-workflow: combat
  // -------------------------------------------------------------------------

  private async resolveCombat(context: DecisionContext): Promise<Decision> {
    const spec = context.node.spec as unknown as CombatNodeSpec;
    const nodeId = context.node.id;
    const bb = context.blackboard;

    // ENCOUNTER: set up the fight
    if (nodeId === 'ENCOUNTER') {
      // Determine which enemy based on parent stack context
      // The parent's invoking node tells us which fight this is
      const parentFrame = context.stack[0];
      const isGuardian = parentFrame?.currentNodeId === 'BOSS_LAIR';

      const enemyName = isGuardian ? 'The Guardian of Echoes' : 'Tomb Guard';
      const enemyHp = isGuardian ? 5 : 3;

      const writes: BlackboardWrite[] = [
        { key: 'enemy_name', value: enemyName },
        { key: 'enemy_hp', value: enemyHp },
        { key: 'enemy_max_hp', value: enemyHp },
        { key: 'player_hp', value: (bb.get('player_hp') as number) ?? 8 },
      ];

      const edge = context.validEdges[0];
      return { type: 'advance', edge: edge.id, writes };
    }

    // PLAYER_TURN: suspend for player choice
    if (nodeId === 'PLAYER_TURN' && spec.suspend) {
      if (
        pendingChoice.key === 'action' &&
        pendingChoice.value !== null
      ) {
        const action = pendingChoice.value;
        pendingChoice.key = null;
        pendingChoice.value = null;

        const writes: BlackboardWrite[] = [{ key: 'action', value: action }];
        const edge = context.validEdges[0];
        return { type: 'advance', edge: edge.id, writes };
      }
      return { type: 'suspend', reason: 'Your turn — choose your action' };
    }

    // RESOLVE_ATTACK: simulate full fight to definitive outcome
    // The player's chosen action determines the opening move, then
    // the fight plays out automatically (since DAGs can't cycle).
    if (nodeId === 'RESOLVE_ATTACK') {
      const action = bb.get('action') as string;
      const hasSword = bb.get('has_sword') === true;
      const hasPotion = bb.get('has_potion') === true;
      const potionUsed = bb.get('potion_used') === true;
      let playerHp = (bb.get('player_hp') as number) ?? 8;
      let enemyHp = (bb.get('enemy_hp') as number) ?? 3;
      const enemyName = (bb.get('enemy_name') as string) ?? 'Enemy';
      const isGuardian = enemyName === 'The Guardian of Echoes';
      const enemyDamage = isGuardian ? 3 : 2;
      const playerDamage = hasSword ? 3 : 1;

      const writes: BlackboardWrite[] = [];
      const logLines: string[] = [];

      // First round: apply player's chosen action
      if (action === 'attack') {
        enemyHp = Math.max(0, enemyHp - playerDamage);
        logLines.push(
          hasSword
            ? `You strike with your Rusty Sword for ${playerDamage} damage!`
            : `You punch the ${enemyName} for ${playerDamage} damage.`
        );
      } else if (action === 'potion') {
        if (hasPotion && !potionUsed) {
          playerHp = Math.min(8, playerHp + 4);
          writes.push({ key: 'potion_used', value: true });
          logLines.push('You drink the Health Potion and feel strength return!');
        } else {
          logLines.push('You fumble for a potion but find none! You waste your opening.');
        }
      } else if (action === 'defend') {
        const reduced = Math.max(1, enemyDamage - 2);
        playerHp = Math.max(0, playerHp - reduced);
        logLines.push(`You brace yourself. ${enemyName} strikes for only ${reduced} damage.`);
      }

      // Enemy counter-attacks (if alive and player didn't defend)
      if (enemyHp > 0 && action !== 'defend') {
        playerHp = Math.max(0, playerHp - enemyDamage);
        logLines.push(`${enemyName} strikes back for ${enemyDamage} damage!`);
      }

      // Simulate remaining rounds until someone falls
      let round = 2;
      while (enemyHp > 0 && playerHp > 0 && round <= 10) {
        // Player auto-attacks
        enemyHp = Math.max(0, enemyHp - playerDamage);
        if (enemyHp <= 0) {
          logLines.push(`Round ${round}: You land the finishing blow!`);
          break;
        }
        // Enemy attacks
        playerHp = Math.max(0, playerHp - enemyDamage);
        if (playerHp <= 0) {
          logLines.push(`Round ${round}: ${enemyName} delivers a crushing blow!`);
          break;
        }
        logLines.push(`Round ${round}: You deal ${playerDamage}, take ${enemyDamage}. (You: ${playerHp} HP, Enemy: ${enemyHp} HP)`);
        round++;
      }

      // Ensure definitive outcome
      if (enemyHp <= 0) {
        logLines.push(`${enemyName} crumbles to dust!`);
      } else if (playerHp <= 0) {
        logLines.push('You collapse to the ground...');
      } else {
        // Safety: shouldn't happen, but force victory after 10 rounds
        enemyHp = 0;
        logLines.push('With a final desperate strike, you prevail!');
      }

      writes.push({ key: 'enemy_hp', value: enemyHp });
      writes.push({ key: 'player_hp', value: playerHp });
      writes.push({ key: 'enemy_defeated', value: enemyHp <= 0 });
      writes.push({ key: 'player_defeated', value: playerHp <= 0 });
      writes.push({ key: 'combat_log', value: logLines.join('\n') });

      const edge = context.validEdges[0];
      return { type: 'advance', edge: edge.id, writes };
    }

    // CHECK_OUTCOME: guards route to victory or defeat
    if (nodeId === 'CHECK_OUTCOME') {
      const edge = context.validEdges[0];
      if (edge) {
        return { type: 'advance', edge: edge.id };
      }
      return { type: 'suspend', reason: 'Combat check — no valid edges' };
    }

    // VICTORY_C / DEFEAT_C: terminal
    if (nodeId === 'VICTORY_C') {
      return {
        type: 'complete',
        writes: [{ key: 'combat_result', value: 'victory' }],
      };
    }
    if (nodeId === 'DEFEAT_C') {
      return {
        type: 'complete',
        writes: [{ key: 'combat_result', value: 'defeat' }],
      };
    }

    // Fallback
    const edge = context.validEdges[0];
    if (edge) return { type: 'advance', edge: edge.id };
    return { type: 'complete' };
  }

  // -------------------------------------------------------------------------
  // Sub-workflow: puzzle-riddle
  // -------------------------------------------------------------------------

  private async resolvePuzzle(context: DecisionContext): Promise<Decision> {
    const spec = context.node.spec as unknown as PuzzleNodeSpec;
    const nodeId = context.node.id;

    // EXAMINE: auto-advance
    if (nodeId === 'EXAMINE') {
      const edge = context.validEdges[0];
      return { type: 'advance', edge: edge.id };
    }

    // ATTEMPT: suspend for player choice
    if (nodeId === 'ATTEMPT' && spec.suspend) {
      if (
        pendingChoice.key === 'answer' &&
        pendingChoice.value !== null
      ) {
        const answer = pendingChoice.value;
        pendingChoice.key = null;
        pendingChoice.value = null;

        const writes: BlackboardWrite[] = [{ key: 'answer', value: answer }];

        // After writing answer, guards will filter edges
        // Re-evaluate: find the matching edge
        const edge = context.validEdges[0]; // Guards haven't re-evaluated yet
        // We need to pick based on the answer we're about to write
        // Since guards check blackboard BEFORE our writes, we need to
        // find the right edge ourselves
        if (answer === 'correct') {
          const solvedEdge = context.validEdges.find(
            (e) => e.id === 'e-attempt-solved'
          ) ?? context.validEdges[0];
          return { type: 'advance', edge: solvedEdge.id, writes };
        } else {
          const failedEdge = context.validEdges.find(
            (e) => e.id === 'e-attempt-failed'
          ) ?? context.validEdges[0];
          return { type: 'advance', edge: failedEdge.id, writes };
        }
      }
      return { type: 'suspend', reason: 'Read the riddle and choose your answer' };
    }

    // SOLVED / FAILED: terminal
    if (nodeId === 'SOLVED') {
      return {
        type: 'complete',
        writes: [{ key: 'puzzle_solved', value: true }],
      };
    }
    if (nodeId === 'FAILED') {
      return {
        type: 'complete',
        writes: [{ key: 'puzzle_solved', value: false }],
      };
    }

    const edge = context.validEdges[0];
    if (edge) return { type: 'advance', edge: edge.id };
    return { type: 'complete' };
  }
}
