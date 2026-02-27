import type { StackFrame, BlackboardEntry, Edge } from '@corpus-relica/reflex';

// ---------------------------------------------------------------------------
// Node spec — domain-specific, opaque to Reflex
// ---------------------------------------------------------------------------

export interface DungeonNodeSpec {
  /** Room/node type */
  type: 'start' | 'narrative' | 'choice' | 'loot' | 'invocation' | 'gate' | 'terminal';
  /** Narrative text for this room */
  narrative?: string;
  /** Whether the agent should suspend for player input */
  suspend?: boolean;
  /** Prompt shown to the player */
  prompt?: string;
  /** Choices presented at suspend points */
  choices?: SuspendChoice[];
  /** Blackboard key to write the player's choice */
  writeKey?: string;
  /** Auto-write value (for loot rooms that auto-grant items) */
  writeValue?: unknown;
  /** Auto-write key (for loot rooms) */
  autoWriteKey?: string;
  /** Ending type for terminal nodes */
  ending?: 'victory' | 'escape';
}

export interface CombatNodeSpec {
  type: 'encounter' | 'player_turn' | 'resolve' | 'check' | 'victory' | 'defeat';
  /** Enemy name (set on encounter node) */
  enemyName?: string;
  /** Enemy starting HP */
  enemyHp?: number;
  /** Narrative for this combat step */
  narrative?: string;
  suspend?: boolean;
  prompt?: string;
  choices?: SuspendChoice[];
  writeKey?: string;
}

export interface PuzzleNodeSpec {
  type: 'examine' | 'attempt' | 'solved' | 'failed';
  narrative?: string;
  suspend?: boolean;
  prompt?: string;
  choices?: SuspendChoice[];
  writeKey?: string;
}

// Union of all node spec types for safe casting
export type AnyNodeSpec = DungeonNodeSpec | CombatNodeSpec | PuzzleNodeSpec;

// ---------------------------------------------------------------------------
// Suspend-point choices
// ---------------------------------------------------------------------------

export interface SuspendChoice {
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Room status for the map
// ---------------------------------------------------------------------------

export type RoomStatus = 'unexplored' | 'explored' | 'current' | 'locked';

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

export interface EventLogEntry {
  id: number;
  type: string;
  message: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

export interface AppState {
  // Engine state snapshots
  currentNodeId: string | null;
  currentWorkflowId: string | null;
  stack: StackFrame[];
  blackboardEntries: BlackboardEntry[];
  validEdges: Edge[];

  // Room tracking
  visitedRooms: Set<string>;
  roomStatuses: Record<string, RoomStatus>;

  // Event log
  events: EventLogEntry[];
  eventCounter: number;

  // Interaction state
  suspended: boolean;
  suspendChoices: SuspendChoice[] | null;
  suspendPrompt: string | null;
  completed: boolean;
  ending: 'victory' | 'escape' | 'defeat' | null;

  // Narrative display
  narrativeText: string;
  narrativeQueue: string[];

  // Waiting for player to click Continue on a non-choice node
  waitingForContinue: boolean;

  // Combat/sub-workflow overlay
  inSubWorkflow: boolean;
  subWorkflowType: 'combat' | 'puzzle' | null;

  // Player state (derived from blackboard but cached for display)
  playerHp: number;
  maxPlayerHp: number;
  inventory: InventoryItem[];
}

export interface InventoryItem {
  key: string;
  label: string;
  emoji: string;
  collected: boolean;
}
