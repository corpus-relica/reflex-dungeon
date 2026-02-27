/**
 * Extended narrative content for rooms.
 * The primary narrative lives in the node specs; this module provides
 * supplementary text for combat and contextual flavor.
 */

export const combatNarrative = {
  tombGuard: {
    encounter:
      'A skeletal warrior lurches from the shadows, bones grinding against rusted armor. The Tomb Guard raises its jagged blade — it will not let you pass without a fight.',
    victory:
      'The Tomb Guard shatters into a heap of bones and dust. The way forward is clear. You catch your breath among the remains of an ancient sentinel.',
    defeat:
      'The Tomb Guard\'s blade finds its mark. Your vision darkens as you collapse on the cold stone floor. The tomb claims another soul.',
  },
  guardian: {
    encounter:
      'The Guardian of Echoes rises to its full towering height. Ancient plate armor, etched with glowing runes, encases a form of shadow and flame. Its voice echoes: "The Crown is not yours to take."',
    victory:
      'The Guardian staggers, runes flickering and dying. With a final groan of ancient metal, it crashes to the ground. The way to the throne lies open. The Crown awaits.',
    defeat:
      'The Guardian\'s massive fist sends you sprawling. As darkness takes you, the last thing you hear is its voice: "The Crown sleeps on." The tomb has won.',
  },
};

export const roomFlavor: Record<string, string> = {
  WEST_SEAL:
    'The seal stone pulses in your hand, warm and alive with power. You feel it resonate with something deeper in the tomb.',
  EAST_SEAL:
    'The amber seal stone hums as you take it. Together with the west seal, the inner sanctum can be opened.',
  BOSS_DOOR:
    'The two seal stones lock into place with a resonant click. Ancient mechanisms grind to life. The door that has been sealed for millennia begins to open.',
  THRONE:
    'The Crown of Echoes sits upon the throne, radiating quiet power. Whispers of a thousand years fill the chamber as your fingers close around it.',
};
