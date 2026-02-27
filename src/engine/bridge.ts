import type { ReflexEngine, StackFrame } from '@corpus-relica/reflex';
import type {
  AppState,
  EventLogEntry,
  RoomStatus,
  InventoryItem,
  DungeonNodeSpec,
  SuspendChoice,
} from '../types.js';
import { pendingChoice } from '../agent.js';
import { canonicalRoomId } from '../content/layout.js';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const ALL_INVENTORY_ITEMS: InventoryItem[] = [
  { key: 'has_sword', label: 'Rusty Sword', emoji: '🗡️', collected: false },
  { key: 'has_potion', label: 'Health Potion', emoji: '🧪', collected: false },
  { key: 'has_west_seal', label: 'West Seal', emoji: '🔵', collected: false },
  { key: 'has_east_seal', label: 'East Seal', emoji: '🟠', collected: false },
  { key: 'has_crown', label: 'Crown of Echoes', emoji: '👑', collected: false },
];

export function createInitialState(engine: ReflexEngine): AppState {
  const node = engine.currentNode();
  const workflow = engine.currentWorkflow();
  const spec = node?.spec as DungeonNodeSpec | undefined;

  const canonId = node ? canonicalRoomId(node.id) : null;
  return {
    currentNodeId: node?.id ?? null,
    currentWorkflowId: workflow?.id ?? null,
    stack: [],
    blackboardEntries: [],
    validEdges: engine.validEdges(),
    visitedRooms: new Set(canonId ? [canonId] : []),
    roomStatuses: canonId ? { [canonId]: 'current' } : {},
    events: [],
    eventCounter: 0,
    suspended: false,
    suspendChoices: null,
    suspendPrompt: null,
    completed: false,
    ending: null,
    narrativeText: spec?.narrative ?? '',
    narrativeQueue: [],
    waitingForContinue: false,
    inSubWorkflow: false,
    subWorkflowType: null,
    playerHp: 8,
    maxPlayerHp: 8,
    inventory: ALL_INVENTORY_ITEMS.map((i) => ({ ...i })),
  };
}

// ---------------------------------------------------------------------------
// State sync from engine
// ---------------------------------------------------------------------------

export function syncStateFromEngine(
  engine: ReflexEngine,
  prev: AppState
): Partial<AppState> {
  const node = engine.currentNode();
  const workflow = engine.currentWorkflow();
  const stackFrames = [...engine.stack()] as StackFrame[];
  const bb = engine.blackboard();

  const currentNodeId = node?.id ?? null;
  const currentWorkflowId = workflow?.id ?? null;

  // Update visited rooms (only for dungeon-crawl nodes, mapped to canonical IDs)
  const visitedRooms = new Set(prev.visitedRooms);
  if (currentWorkflowId === 'dungeon-crawl' && currentNodeId) {
    visitedRooms.add(canonicalRoomId(currentNodeId));
  }

  // Update room statuses
  const roomStatuses: Record<string, RoomStatus> = {};
  for (const roomId of visitedRooms) {
    roomStatuses[roomId] = 'explored';
  }
  if (currentWorkflowId === 'dungeon-crawl' && currentNodeId) {
    roomStatuses[canonicalRoomId(currentNodeId)] = 'current';
  }
  // If in sub-workflow, mark parent's invoking node as current
  if (currentWorkflowId !== 'dungeon-crawl' && stackFrames.length > 0) {
    const parentNode = stackFrames[stackFrames.length - 1]?.currentNodeId;
    if (parentNode) {
      const canonParent = canonicalRoomId(parentNode);
      visitedRooms.add(canonParent);
      roomStatuses[canonParent] = 'current';
    }
  }

  // Update inventory from blackboard
  const inventory = ALL_INVENTORY_ITEMS.map((item) => ({
    ...item,
    collected: bb.get(item.key) === true,
  }));

  // Potion consumed check
  const potionUsed = bb.get('potion_used') === true;
  if (potionUsed) {
    const potionItem = inventory.find((i) => i.key === 'has_potion');
    if (potionItem) {
      potionItem.collected = false;
      potionItem.label = 'Health Potion (used)';
    }
  }

  // Player HP
  const playerHp = (bb.get('player_hp') as number) ?? 8;

  // Sub-workflow detection
  const inSubWorkflow = currentWorkflowId !== 'dungeon-crawl';
  let subWorkflowType: 'combat' | 'puzzle' | null = null;
  if (currentWorkflowId === 'combat') subWorkflowType = 'combat';
  if (currentWorkflowId === 'puzzle-riddle') subWorkflowType = 'puzzle';

  // Get narrative text
  let narrativeText = prev.narrativeText;
  if (node) {
    const spec = node.spec as Record<string, any>;
    if (spec.narrative) {
      narrativeText = spec.narrative;
    }
    // Combat log override
    const combatLog = bb.get('combat_log') as string | undefined;
    if (currentWorkflowId === 'combat' && combatLog && currentNodeId === 'CHECK_OUTCOME') {
      narrativeText = combatLog;
    }
  }

  return {
    currentNodeId,
    currentWorkflowId,
    stack: stackFrames,
    blackboardEntries: bb.entries(),
    validEdges: engine.validEdges(),
    visitedRooms,
    roomStatuses,
    inSubWorkflow,
    subWorkflowType,
    playerHp,
    inventory,
    narrativeText,
  };
}

// ---------------------------------------------------------------------------
// Engine event registration
// ---------------------------------------------------------------------------

export function registerEngineEvents(
  engine: ReflexEngine,
  addEvent: (type: string, message: string) => void
): void {
  engine.on('node:enter', (payload: any) => {
    addEvent('node:enter', `${payload.node.id} (${payload.workflow.id})`);
  });
  engine.on('node:exit', (payload: any) => {
    addEvent('node:exit', payload.node.id);
  });
  engine.on('edge:traverse', (payload: any) => {
    addEvent('edge:traverse', `${payload.edge.from} → ${payload.edge.to}`);
  });
  engine.on('workflow:push', (payload: any) => {
    addEvent('workflow:push', `→ ${payload.workflow.id}`);
  });
  engine.on('workflow:pop', (payload: any) => {
    addEvent('workflow:pop', `← ${payload.workflow.id}`);
  });
  engine.on('blackboard:write', (payload: any) => {
    const keys = payload.entries
      .map((e: any) => `${e.key}=${JSON.stringify(e.value)}`)
      .join(', ');
    addEvent('blackboard:write', keys);
  });
  engine.on('engine:suspend', (payload: any) => {
    addEvent('engine:suspend', payload.reason);
  });
  engine.on('engine:complete', () => {
    addEvent('engine:complete', 'Session finished');
  });
  engine.on('engine:error', (payload: any) => {
    addEvent('engine:error', String(payload.error));
  });
}

// ---------------------------------------------------------------------------
// Choice handling
// ---------------------------------------------------------------------------

export function submitChoice(key: string, value: string): void {
  pendingChoice.key = key;
  pendingChoice.value = value;
}

// ---------------------------------------------------------------------------
// Determine if current node should auto-advance
// ---------------------------------------------------------------------------

export function shouldAutoAdvance(engine: ReflexEngine): boolean {
  const node = engine.currentNode();
  if (!node) return false;
  const spec = node.spec as Record<string, any>;
  if (spec.suspend) return false;
  if (spec.type === 'terminal') return false;
  return true;
}

// ---------------------------------------------------------------------------
// Determine current suspend choices (if any)
// ---------------------------------------------------------------------------

export function getSuspendInfo(engine: ReflexEngine): {
  choices: SuspendChoice[] | null;
  prompt: string | null;
  writeKey: string | null;
} {
  const node = engine.currentNode();
  if (!node) return { choices: null, prompt: null, writeKey: null };

  const spec = node.spec as Record<string, any>;
  if (!spec.suspend || !spec.choices) {
    return { choices: null, prompt: null, writeKey: null };
  }

  // For combat, filter potion choice if no potion available
  if (spec.type === 'player_turn') {
    const bb = engine.blackboard();
    const hasPotion = bb.get('has_potion') === true;
    const potionUsed = bb.get('potion_used') === true;

    const filteredChoices = (spec.choices as SuspendChoice[]).filter((c: SuspendChoice) => {
      if (c.value === 'potion' && (!hasPotion || potionUsed)) return false;
      return true;
    });

    return {
      choices: filteredChoices,
      prompt: spec.prompt ?? null,
      writeKey: spec.writeKey ?? null,
    };
  }

  return {
    choices: spec.choices,
    prompt: spec.prompt ?? null,
    writeKey: spec.writeKey ?? null,
  };
}
