/**
 * Pre-computed room positions for the SVG dungeon map.
 * Hand-designed for visual clarity — no auto-layout.
 *
 * The dungeon-crawl workflow duplicates wing nodes (A/B suffixes) to avoid
 * DAG cycles. The map displays rooms at canonical positions, mapping
 * suffixed IDs back to visual positions.
 */

export interface RoomPosition {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface CorridorDef {
  from: string;
  to: string;
  guarded?: boolean;
}

const cx = 300; // center x
const wl = 130; // west lane x
const el = 470; // east lane x

/**
 * Canonical room positions — the visual map the player sees.
 * These are display-only; the actual workflow node IDs may have suffixes.
 */
export const roomPositions: RoomPosition[] = [
  { id: 'ENTRANCE',    x: cx,  y: 40,  label: 'Entrance' },
  { id: 'ANTECHAMBER', x: cx,  y: 110, label: 'Antechamber' },

  // West wing
  { id: 'WEST_WING',   x: wl,  y: 200, label: 'West Wing' },
  { id: 'ARMORY',      x: wl,  y: 280, label: 'Armory' },
  { id: 'GUARD_ROOM',  x: wl,  y: 360, label: 'Guard Room' },
  { id: 'WEST_SEAL',   x: wl,  y: 440, label: 'West Seal' },

  // East wing
  { id: 'EAST_WING',   x: el,  y: 200, label: 'East Wing' },
  { id: 'LIBRARY',     x: el,  y: 280, label: 'Library' },
  { id: 'ARCHIVES',    x: el,  y: 360, label: 'Archives' },
  { id: 'EAST_SEAL',   x: el,  y: 440, label: 'East Seal' },

  // Convergence
  { id: 'GREAT_HALL',  x: cx,  y: 540, label: 'Great Hall' },

  // Boss path (left of center)
  { id: 'BOSS_DOOR',   x: 180, y: 620, label: 'Boss Door' },
  { id: 'BOSS_LAIR',   x: 180, y: 700, label: 'Boss Lair' },
  { id: 'THRONE',      x: 180, y: 780, label: 'Throne' },
  { id: 'VICTORY',     x: 180, y: 855, label: 'Victory' },

  // Escape path (right of center)
  { id: 'SIDE_EXIT',   x: 420, y: 620, label: 'Side Exit' },
  { id: 'ESCAPE',      x: 420, y: 700, label: 'Escape' },
];

export const corridors: CorridorDef[] = [
  { from: 'ENTRANCE',    to: 'ANTECHAMBER' },
  { from: 'ANTECHAMBER', to: 'WEST_WING' },
  { from: 'ANTECHAMBER', to: 'EAST_WING' },
  { from: 'WEST_WING',   to: 'ARMORY' },
  { from: 'ARMORY',      to: 'GUARD_ROOM' },
  { from: 'GUARD_ROOM',  to: 'WEST_SEAL' },
  { from: 'WEST_SEAL',   to: 'GREAT_HALL' },
  { from: 'EAST_WING',   to: 'LIBRARY' },
  { from: 'LIBRARY',     to: 'ARCHIVES' },
  { from: 'ARCHIVES',    to: 'EAST_SEAL' },
  { from: 'EAST_SEAL',   to: 'GREAT_HALL' },
  { from: 'GREAT_HALL',  to: 'BOSS_DOOR', guarded: true },
  { from: 'GREAT_HALL',  to: 'SIDE_EXIT' },
  { from: 'BOSS_DOOR',   to: 'BOSS_LAIR' },
  { from: 'BOSS_LAIR',   to: 'THRONE' },
  { from: 'THRONE',      to: 'VICTORY' },
  { from: 'SIDE_EXIT',   to: 'ESCAPE' },
];

/** Lookup map for quick position access */
export const roomPositionMap: Record<string, RoomPosition> = {};
for (const pos of roomPositions) {
  roomPositionMap[pos.id] = pos;
}

/**
 * Map a workflow node ID (possibly suffixed) back to a canonical room ID
 * for map display purposes.
 *
 * e.g., "ARMORY_A" → "ARMORY", "WEST_WING_B" → "WEST_WING"
 * Non-suffixed IDs (ENTRANCE, GREAT_HALL, etc.) pass through unchanged.
 * Crossover nodes map to their target wing.
 */
export function canonicalRoomId(nodeId: string): string {
  // Crossover nodes don't have a canonical map position — map to the wing they lead to
  if (nodeId === 'CROSSOVER_E') return 'EAST_WING';
  if (nodeId === 'CROSSOVER_W') return 'WEST_WING';

  // Strip _A or _B suffix
  const match = nodeId.match(/^(.+)_[AB]$/);
  if (match) return match[1];

  return nodeId;
}
