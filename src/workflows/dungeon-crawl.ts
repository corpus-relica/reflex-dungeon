import type { Workflow } from '@corpus-relica/reflex';
import type { DungeonNodeSpec } from '../types.js';

/**
 * Root workflow: dungeon-crawl
 *
 * The Tomb of Echoes — player enters, chooses which wing to explore first,
 * then is routed to the second wing, and finally converges at the Great Hall.
 *
 * Because DAGs cannot have cycles, each wing's content exists in two
 * "slot" versions (WEST_A/WEST_B, EAST_A/EAST_B). The player's first
 * choice determines which slot they enter. After completing slot A of
 * one wing, they cross over to slot B of the other wing.
 *
 * Path "west first":  ANTECHAMBER → WEST_A → ... → CROSSOVER_E → EAST_B → ... → GREAT_HALL
 * Path "east first":  ANTECHAMBER → EAST_A → ... → CROSSOVER_W → WEST_B → ... → GREAT_HALL
 */

function westWingNodes(suffix: string): Record<string, any> {
  return {
    [`WEST_WING_${suffix}`]: {
      id: `WEST_WING_${suffix}`,
      description: 'West Wing corridor',
      spec: {
        type: 'narrative',
        narrative:
          'You take the western passage. Rusted weapons line the walls — halberds, maces, swords long dulled by time. The air grows colder. Ahead, a heavy door stands ajar.',
      } satisfies DungeonNodeSpec,
    },
    [`ARMORY_${suffix}`]: {
      id: `ARMORY_${suffix}`,
      description: 'The Armory',
      spec: {
        type: 'loot',
        narrative:
          'The armory is a ruin of shattered weapon racks and scattered steel. But on a stone pedestal, untouched by decay, sits a sword. Its edge still gleams — a Rusty Sword, but serviceable.',
        suspend: true,
        prompt: 'Take the Rusty Sword?',
        choices: [
          { label: '🗡️ Take the sword', value: 'take' },
          { label: '🚶 Leave it', value: 'leave' },
        ],
        writeKey: 'armory_choice',
      } satisfies DungeonNodeSpec,
    },
    [`GUARD_ROOM_${suffix}`]: {
      id: `GUARD_ROOM_${suffix}`,
      description: 'The Guard Room',
      spec: {
        type: 'invocation',
        narrative:
          'You enter a torchlit chamber. A skeletal warrior rises from a stone sarcophagus, rusty blade in hand. The Tomb Guard blocks your path.',
      } satisfies DungeonNodeSpec,
      invokes: {
        workflowId: 'combat',
        returnMap: [
          { parentKey: 'guard_combat_result', childKey: 'combat_result' },
          { parentKey: 'player_hp', childKey: 'player_hp' },
        ],
      },
    },
    [`WEST_SEAL_${suffix}`]: {
      id: `WEST_SEAL_${suffix}`,
      description: 'West Seal Chamber',
      spec: {
        type: 'loot',
        narrative:
          'Past the defeated guardian, a pedestal holds a pulsing blue stone — the West Seal. It hums with ancient power as you lift it. One half of the key to the inner sanctum.',
        autoWriteKey: 'has_west_seal',
        writeValue: true,
      } satisfies DungeonNodeSpec,
    },
  };
}

function eastWingNodes(suffix: string): Record<string, any> {
  return {
    [`EAST_WING_${suffix}`]: {
      id: `EAST_WING_${suffix}`,
      description: 'East Wing corridor',
      spec: {
        type: 'narrative',
        narrative:
          'You take the eastern passage. Bookshelves stretch to the ceiling, their contents rotted to dust. Arcane symbols glow faintly on the walls, guiding you deeper. A doorway ahead pulses with dim blue light.',
      } satisfies DungeonNodeSpec,
    },
    [`LIBRARY_${suffix}`]: {
      id: `LIBRARY_${suffix}`,
      description: 'The Library',
      spec: {
        type: 'invocation',
        narrative:
          'The library opens into a circular chamber. In its center, a stone lectern bears an inscription that glows with inner fire. A riddle — the old kind, the dangerous kind.',
      } satisfies DungeonNodeSpec,
      invokes: {
        workflowId: 'puzzle-riddle',
        returnMap: [
          { parentKey: 'library_puzzle_solved', childKey: 'puzzle_solved' },
        ],
      },
    },
    [`ARCHIVES_${suffix}`]: {
      id: `ARCHIVES_${suffix}`,
      description: 'The Archives',
      spec: {
        type: 'loot',
        narrative:
          'Beyond the library lies a hidden archive. Among crumbling scrolls and shattered vials, you find an intact Health Potion, its crimson liquid still glowing faintly.',
        suspend: true,
        prompt: 'Take the Health Potion?',
        choices: [
          { label: '🧪 Take the potion', value: 'take' },
          { label: '🚶 Leave it', value: 'leave' },
        ],
        writeKey: 'archives_choice',
      } satisfies DungeonNodeSpec,
    },
    [`EAST_SEAL_${suffix}`]: {
      id: `EAST_SEAL_${suffix}`,
      description: 'East Seal Chamber',
      spec: {
        type: 'loot',
        narrative:
          'At the end of the archive passage, a matching pedestal holds a glowing amber stone — the East Seal. It warms your hand as you take it. The other half of the key.',
        autoWriteKey: 'has_east_seal',
        writeValue: true,
      } satisfies DungeonNodeSpec,
    },
  };
}

function westWingEdges(suffix: string, entryFrom: string, exitTo: string): any[] {
  return [
    { id: `e-to-ww-${suffix}`, from: entryFrom, to: `WEST_WING_${suffix}`, event: 'NEXT' },
    { id: `e-ww-armory-${suffix}`, from: `WEST_WING_${suffix}`, to: `ARMORY_${suffix}`, event: 'NEXT' },
    { id: `e-armory-guard-${suffix}`, from: `ARMORY_${suffix}`, to: `GUARD_ROOM_${suffix}`, event: 'NEXT' },
    { id: `e-guard-seal-${suffix}`, from: `GUARD_ROOM_${suffix}`, to: `WEST_SEAL_${suffix}`, event: 'NEXT' },
    { id: `e-wseal-exit-${suffix}`, from: `WEST_SEAL_${suffix}`, to: exitTo, event: 'NEXT' },
  ];
}

function eastWingEdges(suffix: string, entryFrom: string, exitTo: string): any[] {
  return [
    { id: `e-to-ew-${suffix}`, from: entryFrom, to: `EAST_WING_${suffix}`, event: 'NEXT' },
    { id: `e-ew-library-${suffix}`, from: `EAST_WING_${suffix}`, to: `LIBRARY_${suffix}`, event: 'NEXT' },
    { id: `e-library-archives-${suffix}`, from: `LIBRARY_${suffix}`, to: `ARCHIVES_${suffix}`, event: 'NEXT' },
    { id: `e-archives-seal-${suffix}`, from: `ARCHIVES_${suffix}`, to: `EAST_SEAL_${suffix}`, event: 'NEXT' },
    { id: `e-eseal-exit-${suffix}`, from: `EAST_SEAL_${suffix}`, to: exitTo, event: 'NEXT' },
  ];
}

export const dungeonCrawl: Workflow = {
  id: 'dungeon-crawl',
  entry: 'ENTRANCE',
  nodes: {
    ENTRANCE: {
      id: 'ENTRANCE',
      description: 'Tomb entrance',
      spec: {
        type: 'start',
        narrative:
          'You stand before the gaping maw of an ancient tomb. Cold air breathes from the darkness within, carrying the scent of dust and forgotten centuries. Carved above the entrance, barely legible: "Here sleeps the Crown of Echoes." You steel yourself and step inside.',
      } satisfies DungeonNodeSpec,
    },
    ANTECHAMBER: {
      id: 'ANTECHAMBER',
      description: 'The Antechamber',
      spec: {
        type: 'choice',
        narrative:
          'The passage opens into a grand antechamber. Crumbling pillars line the hall. Two corridors branch ahead — the left passage is flanked by weapon racks, the right by towering bookshelves. Faded murals depict two guardians, each holding a glowing seal stone.\n\nYou\'ll need to explore both wings to unlock the inner sanctum.',
        suspend: true,
        prompt: 'Which wing do you explore first?',
        choices: [
          { label: '⬅ West Wing (Armory)', value: 'west' },
          { label: '➡ East Wing (Library)', value: 'east' },
        ],
        writeKey: 'player_direction',
      } satisfies DungeonNodeSpec,
    },

    // West first: ANTECHAMBER → west_A → CROSSOVER_E → east_B → GREAT_HALL
    ...westWingNodes('A'),
    CROSSOVER_E: {
      id: 'CROSSOVER_E',
      description: 'Passage to the East Wing',
      spec: {
        type: 'narrative',
        narrative:
          'A hidden passage winds behind the seal chamber, spiraling back toward the antechamber. The eastern corridor beckons — you haven\'t explored it yet. The second seal awaits.',
      } satisfies DungeonNodeSpec,
    },
    ...eastWingNodes('B'),

    // East first: ANTECHAMBER → east_A → CROSSOVER_W → west_B → GREAT_HALL
    ...eastWingNodes('A'),
    CROSSOVER_W: {
      id: 'CROSSOVER_W',
      description: 'Passage to the West Wing',
      spec: {
        type: 'narrative',
        narrative:
          'A hidden passage winds behind the seal chamber, spiraling back toward the antechamber. The western corridor beckons — you haven\'t explored it yet. The second seal awaits.',
      } satisfies DungeonNodeSpec,
    },
    ...westWingNodes('B'),

    // Convergence
    GREAT_HALL: {
      id: 'GREAT_HALL',
      description: 'The Great Hall',
      spec: {
        type: 'choice',
        narrative:
          'Both passages converge in a massive hall. Before you, a towering door covered in ancient runes — the Boss Door. Two seal stones in your possession pulse in resonance with the runes. To the side, a smaller passage leads to daylight — a way out.',
        suspend: true,
        prompt: 'What do you do?',
        choices: [
          { label: '🚪 Open the Boss Door', value: 'boss' },
          { label: '🏃 Take the Side Exit', value: 'escape' },
        ],
        writeKey: 'hall_choice',
      } satisfies DungeonNodeSpec,
    },
    BOSS_DOOR: {
      id: 'BOSS_DOOR',
      description: 'The Boss Door',
      spec: {
        type: 'gate',
        narrative:
          'You press the two seal stones into the door\'s recesses. The runes flare with blinding light. With a grinding roar, the ancient door swings open, revealing a vast chamber beyond.',
      } satisfies DungeonNodeSpec,
    },
    BOSS_LAIR: {
      id: 'BOSS_LAIR',
      description: 'The Boss Lair',
      spec: {
        type: 'invocation',
        narrative:
          'In the heart of the tomb, a colossal armored figure rises — The Guardian of Echoes. Its eyes blaze with cold fire. It speaks in a voice like grinding stone: "None shall claim the Crown."',
      } satisfies DungeonNodeSpec,
      invokes: {
        workflowId: 'combat',
        returnMap: [
          { parentKey: 'boss_combat_result', childKey: 'combat_result' },
          { parentKey: 'player_hp', childKey: 'player_hp' },
        ],
      },
    },
    SIDE_EXIT: {
      id: 'SIDE_EXIT',
      description: 'Side Exit',
      spec: {
        type: 'narrative',
        narrative:
          'You dash through the narrow passage. Daylight grows brighter with each step. Behind you, the tomb groans and shifts. You emerge into open air, alive — but without the Crown.',
      } satisfies DungeonNodeSpec,
    },
    THRONE: {
      id: 'THRONE',
      description: 'The Throne Room',
      spec: {
        type: 'loot',
        narrative:
          'The Guardian crumbles to dust. Beyond its remains, atop a throne of black stone, sits the Crown of Echoes. It radiates a quiet, ancient power. As you lift it, voices of a thousand years whisper your name.',
        autoWriteKey: 'has_crown',
        writeValue: true,
      } satisfies DungeonNodeSpec,
    },
    VICTORY: {
      id: 'VICTORY',
      description: 'Victory!',
      spec: {
        type: 'terminal',
        ending: 'victory',
        narrative:
          '🏆 VICTORY\n\nYou emerge from the Tomb of Echoes, the Crown upon your brow. The voices within it sing of ages past and ages yet to come. You are changed — marked by the tomb, crowned by its power.\n\nThe world outside seems smaller now. But the echoes... the echoes will never leave you.',
      } satisfies DungeonNodeSpec,
    },
    ESCAPE: {
      id: 'ESCAPE',
      description: 'Escaped!',
      spec: {
        type: 'terminal',
        ending: 'escape',
        narrative:
          '🏃 ESCAPED\n\nYou made it out alive. The tomb seals itself behind you with a thunderous boom. You survived — but the Crown of Echoes remains within, waiting for one bold enough to claim it.\n\nPerhaps another day. Perhaps never. But you breathe free air, and that is enough.',
      } satisfies DungeonNodeSpec,
    },
  },
  edges: [
    // Entrance → Antechamber
    { id: 'e-entrance-ante', from: 'ENTRANCE', to: 'ANTECHAMBER', event: 'NEXT' },

    // Antechamber: choice of first wing
    { id: 'e-go-west', from: 'ANTECHAMBER', to: 'WEST_WING_A', event: 'GO_WEST' },
    { id: 'e-go-east', from: 'ANTECHAMBER', to: 'EAST_WING_A', event: 'GO_EAST' },

    // Path: West first → crossover → East second → Great Hall
    ...westWingEdges('A', 'ANTECHAMBER', 'CROSSOVER_E').slice(1), // skip entry edge (already have e-go-west)
    { id: 'e-cross-east', from: 'CROSSOVER_E', to: 'EAST_WING_B', event: 'NEXT' },
    ...eastWingEdges('B', 'CROSSOVER_E', 'GREAT_HALL').slice(1), // skip entry edge (already have e-cross-east)

    // Path: East first → crossover → West second → Great Hall
    ...eastWingEdges('A', 'ANTECHAMBER', 'CROSSOVER_W').slice(1), // skip entry edge (already have e-go-east)
    { id: 'e-cross-west', from: 'CROSSOVER_W', to: 'WEST_WING_B', event: 'NEXT' },
    ...westWingEdges('B', 'CROSSOVER_W', 'GREAT_HALL').slice(1), // skip entry edge (already have e-cross-west)

    // Great Hall fan-out
    { id: 'e-hall-boss', from: 'GREAT_HALL', to: 'BOSS_DOOR', event: 'BOSS',
      guard: {
        type: 'custom',
        evaluate: (bb) => bb.has('has_west_seal') && bb.has('has_east_seal'),
      },
    },
    { id: 'e-hall-escape', from: 'GREAT_HALL', to: 'SIDE_EXIT', event: 'ESCAPE' },

    // Boss path
    { id: 'e-boss-lair', from: 'BOSS_DOOR', to: 'BOSS_LAIR', event: 'NEXT' },
    { id: 'e-lair-throne', from: 'BOSS_LAIR', to: 'THRONE', event: 'NEXT' },
    { id: 'e-throne-victory', from: 'THRONE', to: 'VICTORY', event: 'NEXT' },

    // Escape path
    { id: 'e-side-escape', from: 'SIDE_EXIT', to: 'ESCAPE', event: 'NEXT' },
  ],
};
