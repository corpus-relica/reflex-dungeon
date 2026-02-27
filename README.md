# reflex-dungeon

Interactive browser-based dungeon crawler built on [@corpus-relica/reflex](https://github.com/corpus-relica/reflex). The workflow graph *is* the dungeon map — rooms are nodes, corridors are edges, locked doors are guards, encounters are sub-workflows.

Demo #2 in the Reflex visualization series. See also: [reflex-coffee](../reflex-coffee/) (demo #1, TUI).

## Running

```bash
npm install
npm run dev
```

Open the URL shown by Vite (typically http://localhost:5173).

## What You'll See

An SVG dungeon map on the left, narrative text with choice buttons on the right. Explore both wings of the Tomb of Echoes, collect seal stones, fight enemies, solve a riddle, and either escape or claim the Crown of Echoes.

### Reflex Features Demonstrated

| Feature | Where |
|---------|-------|
| DAG traversal | Every room transition |
| Suspend / resume | Direction choices, loot rooms, combat turns, puzzle answers |
| Guards (`exists`, `not-exists`) | Seal-based routing between wings |
| Guards (`equals`, `not-equals`) | Combat outcome, puzzle answers |
| Guards (custom compound) | Boss door — both seals required |
| Sub-workflow invocation | Guard Room (combat), Library (puzzle), Boss Lair (combat) |
| Reusable sub-workflow | `combat` invoked twice with different enemy configs |
| Call stack push/pop | Enter/exit combat and puzzle |
| ReturnMap | `combat_result`, `puzzle_solved` flow back to parent |
| Scoped blackboard reads | Combat reads parent inventory (`has_sword`, `has_potion`) |
| Multiple terminal nodes | Victory, Escape, and Defeat endings |
| DAG convergence | Both wings → Great Hall |
| Fan-out with real choice | Antechamber (west/east), Great Hall (boss/escape) |
| Event emission | Full event stream visible in Events panel |

### Three Endings

- **Victory** 🏆 — Collect both seals, defeat the Guardian, claim the Crown
- **Escape** 🏃 — Skip the boss fight, flee through the side exit
- **Defeat** 💀 — Fall in combat against the Tomb Guard or Guardian

## Architecture

```
src/
├── workflows/           3 Reflex workflow definitions
│   ├── dungeon-crawl.ts   Root workflow (27 nodes, both-wings DAG)
│   ├── combat.ts          Reusable combat sub-workflow (6 nodes)
│   └── puzzle-riddle.ts   Puzzle sub-workflow (4 nodes)
├── agent.ts             DungeonAgent — DecisionAgent implementation
├── engine/
│   ├── setup.ts         Registry + engine creation
│   └── bridge.ts        Engine↔React bridge (state sync, choices, events)
├── content/
│   ├── layout.ts        SVG map room positions and corridors
│   └── narrative.ts     Extended narrative text
├── components/          React components
│   ├── DungeonMap.tsx   SVG dungeon map with fog of war
│   ├── Room.tsx         SVG room (rect + label + status glow)
│   ├── Corridor.tsx     SVG corridor between rooms
│   ├── Narrative.tsx    Typewriter text + inline choice buttons
│   ├── Inventory.tsx    Items + health bar
│   ├── HealthBar.tsx    Animated HP bar
│   ├── StackView.tsx    Call stack display
│   ├── EventLog.tsx     Color-coded scrolling event log
│   └── CombatPanel.tsx  Combat encounter overlay
├── styles/
│   ├── layout.css       CSS Grid panel layout
│   └── dungeon.css      Map theming, glow, fog of war, animations
├── types.ts             Game-local types
├── App.tsx              Root layout — map, narrative, panels
└── main.tsx             Entry point
```

**No server component.** Reflex runs entirely client-side. The engine, agent, workflows, and visualization all live in the browser.

## Tech Stack

- **Runtime**: Browser (ESM)
- **Framework**: React 19
- **Build**: Vite
- **Map**: Inline SVG with CSS transitions and glow filters
- **Reflex**: `@corpus-relica/reflex` (local `file:../reflex` dependency)
