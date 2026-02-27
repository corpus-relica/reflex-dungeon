import { createRegistry, createEngine } from '@corpus-relica/reflex';
import type { ReflexEngine } from '@corpus-relica/reflex';
import { dungeonCrawl } from '../workflows/dungeon-crawl.js';
import { combat } from '../workflows/combat.js';
import { puzzleRiddle } from '../workflows/puzzle-riddle.js';
import { DungeonAgent } from '../agent.js';

/**
 * Create and initialize the Reflex engine with all dungeon workflows.
 */
export async function setupEngine(): Promise<ReflexEngine> {
  const registry = createRegistry();

  // Register sub-workflows first to avoid invocation warnings
  registry.register(combat);
  registry.register(puzzleRiddle);
  registry.register(dungeonCrawl);

  const agent = new DungeonAgent();
  const engine = createEngine(registry, agent);

  await engine.init('dungeon-crawl');

  return engine;
}
