# reflex-dungeon

Interactive browser-based dungeon crawler built on [@corpus-relica/reflex](https://github.com/corpus-relica/reflex). The workflow graph *is* the dungeon map — rooms are nodes, corridors are edges, locked doors are guards, encounters are sub-workflows. Rendered as a React web app with an SVG dungeon map.

Demo #2 in the Reflex visualization series. See also: [reflex-coffee](../reflex-coffee/) (demo #1, TUI).

## Goal

Show Reflex operating at real complexity: branching paths where player choices matter, inventory gating via guards, combat and puzzle sub-workflows with stack push/pop, multiple endings based on preparation, and an animated spatial map — in the browser where it can actually look good.

---

## Dungeon Design

### Narrative

You enter an ancient tomb seeking the **Crown of Echoes**. The tomb forks into two wings. Each wing holds a **Seal Stone** needed to unlock the Boss Door. You can explore both wings (thorough) or rush to the exit (escape). Only players who collect both seals, defeat the Guardian, and claim the Crown reach the true ending.

### Map

```
                    ┌──────────┐
                    │ ENTRANCE │
                    └────┬─────┘
                         │
                    ┌────┴─────┐
                    │ANTECHAMBER│
                    └────┬─────┘
                        ╱ ╲
            ┌──────────┘   └──────────┐
            │                          │
       ┌────┴─────┐              ┌────┴─────┐
       │WEST WING │              │EAST WING │
       └────┬─────┘              └────┬─────┘
            │                          │
       ┌────┴─────┐              ┌────┴─────┐
       │  ARMORY  │              │ LIBRARY  │
       │ (loot)   │              │ (puzzle) │
       └────┬─────┘              └────┬─────┘
            │                          │
       ┌────┴─────┐              ┌────┴─────┐
       │GUARD ROOM│              │ ARCHIVES │
       │ (combat) │              │ (loot)   │
       └────┬─────┘              └────┬─────┘
            │                          │
       ┌────┴─────┐              ┌────┴─────┐
       │WEST SEAL │              │EAST SEAL │
       │ (loot)   │              │ (loot)   │
       └────┬─────┘              └────┬─────┘
            │                          │
            └──────────┐   ┌──────────┘
                       │   │
                  ┌────┴───┴───┐
                  │ GREAT HALL │
                  └──┬──────┬──┘
                     │      │
     ┌───────────────┘      └────────────────┐
     │ (guard: both seals)                   │ (always open)
┌────┴─────┐                            ┌────┴─────┐
│BOSS DOOR │                            │SIDE EXIT │
└────┬─────┘                            └────┬─────┘
     │                                       │
┌────┴─────┐                            ┌────┴─────┐
│BOSS LAIR │                            │ ESCAPE   │
│ (combat) │                            │ (ending) │
└────┬─────┘                            └──────────┘
     │
┌────┴─────┐
│  THRONE  │
│ (crown)  │
└────┬─────┘
     │
┌────┴─────┐
│ VICTORY  │
│ (ending) │
└──────────┘
```

### Root Workflow: `dungeon-crawl` (15 nodes)

| Node | Type | Description | Suspend? |
|------|------|-------------|----------|
| ENTRANCE | Start | Atmospheric intro text. Auto-advance. | No |
| ANTECHAMBER | Choice | Ancient hall. Two passages visible. | Yes — choose west or east |
| WEST_WING | Narrative | Corridor description. Auto-advance. | No |
| EAST_WING | Narrative | Corridor description. Auto-advance. | No |
| ARMORY | Loot | Find a **Rusty Sword**. Writes `has_sword`. | Yes — take/leave |
| LIBRARY | Invocation | Invokes `puzzle-riddle` sub-workflow. | No (sub-wf handles it) |
| GUARD_ROOM | Invocation | Invokes `combat` sub-workflow (Tomb Guard). | No (sub-wf handles it) |
| ARCHIVES | Loot | Find a **Health Potion**. Writes `has_potion`. | Yes — take/leave |
| WEST_SEAL | Loot | Claim the **West Seal Stone**. Writes `has_west_seal`. | No (auto) |
| EAST_SEAL | Loot | Claim the **East Seal Stone**. Writes `has_east_seal`. | No (auto) |
| GREAT_HALL | Choice | Massive hall. Boss door (sealed) and side exit visible. | Yes — attempt boss door or escape |
| BOSS_DOOR | Gate | Guarded by both seals. | No (auto) |
| BOSS_LAIR | Invocation | Invokes `combat` sub-workflow (The Guardian). | No (sub-wf handles it) |
| SIDE_EXIT | Narrative | You flee with whatever you found. | No (auto) |
| THRONE | Loot | Claim the **Crown of Echoes**. Writes `has_crown`. | No (auto) |
| VICTORY | Terminal | True ending. | No |
| ESCAPE | Terminal | Escape ending. | No |

### Edges & Guards

**From ANTECHAMBER (player choice — both always valid, agent picks based on player input):**

| Edge | From | To | Guard |
|------|------|----|-------|
| e-go-west | ANTECHAMBER | WEST_WING | none |
| e-go-east | ANTECHAMBER | EAST_WING | none |

**Linear progressions (no guard):**

| Edge | From | To |
|------|------|----|
| e-entrance-ante | ENTRANCE | ANTECHAMBER |
| e-ww-armory | WEST_WING | ARMORY |
| e-armory-guard | ARMORY | GUARD_ROOM |
| e-guard-seal | GUARD_ROOM | WEST_SEAL |
| e-wseal-hall | WEST_SEAL | GREAT_HALL |
| e-ew-library | EAST_WING | LIBRARY |
| e-library-archives | LIBRARY | ARCHIVES |
| e-archives-seal | ARCHIVES | EAST_SEAL |
| e-eseal-hall | EAST_SEAL | GREAT_HALL |
| e-boss-lair | BOSS_DOOR | BOSS_LAIR |
| e-lair-throne | BOSS_LAIR | THRONE |
| e-throne-victory | THRONE | VICTORY |
| e-side-escape | SIDE_EXIT | ESCAPE |

**Guarded edges (Great Hall fan-out):**

| Edge | From | To | Guard |
|------|------|----|-------|
| e-hall-boss | GREAT_HALL | BOSS_DOOR | `exists: has_west_seal` AND `exists: has_east_seal` (custom guard — compound) |
| e-hall-escape | GREAT_HALL | SIDE_EXIT | none (always available) |

The boss door guard is a **custom guard** — the first real use of `CustomGuard.evaluate`:

```typescript
guard: {
  type: 'custom',
  evaluate: (bb) => bb.has('has_west_seal') && bb.has('has_east_seal'),
}
```

### Sub-workflow: `combat` (6 nodes)

Reusable for both Tomb Guard and Guardian encounters. The root workflow's node spec passes enemy configuration (name, difficulty).

```
ENCOUNTER → PLAYER_TURN → RESOLVE_ATTACK → CHECK_OUTCOME ─┬→ VICTORY_C
                                                            └→ DEFEAT_C
```

| Node | Description | Suspend? |
|------|-------------|----------|
| ENCOUNTER | Describe the enemy. Read `enemy_name`, `enemy_hp` from spec. Write to local blackboard. | No |
| PLAYER_TURN | "What do you do?" | Yes — attack / use potion / defend |
| RESOLVE_ATTACK | Calculate outcome based on action + inventory. Write `enemy_hp`, `player_hit`. | No |
| CHECK_OUTCOME | Fan-out based on result. | No |
| VICTORY_C | Enemy defeated. Write `combat_result: 'victory'`. | No |
| DEFEAT_C | Player falls. Write `combat_result: 'defeat'`. | No |

**Guards on CHECK_OUTCOME:**

| Edge | Guard | To |
|------|-------|----|
| e-check-victory | `equals: enemy_defeated = true` | VICTORY_C |
| e-check-defeat | `equals: player_defeated = true` | DEFEAT_C |

**Combat mechanics (simple, in the agent):**
- Attack: always hits. Damage depends on `has_sword` (2 vs 1).
- Use potion: if `has_potion`, restore health, consume potion (shadow with `has_potion: false` — wait, append-only... write `potion_used: true`, guard on that).
- Defend: reduce incoming damage.
- Enemy attacks back each round (auto-resolve in RESOLVE_ATTACK).
- Tomb Guard: 3 HP. Guardian: 5 HP.

**ReturnMap:** `combat_result` → `last_combat_result` in parent.

**Scoped reads:** Combat sub-workflow reads `has_sword`, `has_potion` from parent blackboard to determine damage and options. This is the scoped blackboard in action — child reads parent context without explicit parameter passing.

### Sub-workflow: `puzzle-riddle` (4 nodes)

```
EXAMINE → ATTEMPT → SOLVED / FAILED
```

| Node | Description | Suspend? |
|------|-------------|----------|
| EXAMINE | Describe the riddle inscribed on the wall. | No |
| ATTEMPT | "What is your answer?" Present 3 choices. | Yes — pick answer |
| SOLVED | Correct! Write `puzzle_solved: true`. | No |
| FAILED | Wrong. Write `puzzle_solved: false`. Door opens anyway (forgiving). | No |

**Guards on ATTEMPT → SOLVED/FAILED:**

| Edge | Guard | To |
|------|-------|----|
| e-attempt-solved | `equals: answer = 'correct'` | SOLVED |
| e-attempt-failed | `not-equals: answer = 'correct'` | FAILED |

**ReturnMap:** `puzzle_solved` → `library_puzzle_solved` in parent.

The puzzle is forgiving — you always progress. But solving it could unlock a bonus (future enhancement: hidden treasure room).

### Reflex Features Exercised

| Feature | Where | Coffee shop had it? |
|---------|-------|-------------------|
| DAG traversal | Every step | Yes |
| Suspend / resume | ANTECHAMBER, loot rooms, PLAYER_TURN, ATTEMPT | Yes |
| Guards (builtin `exists`) | Inventory checks | No (only `equals`) |
| Guards (builtin `equals`) | Combat outcome, puzzle answer | Yes |
| Guards (custom compound) | Boss door — both seals required | No |
| Sub-workflow invocation | GUARD_ROOM, LIBRARY, BOSS_LAIR | Yes |
| Reusable sub-workflow | `combat` invoked twice with different specs | No |
| Call stack push/pop | Enter/exit combat, puzzle | Yes |
| ReturnMap | combat_result, puzzle_solved flow back | Yes |
| Scoped blackboard reads | Combat reads parent inventory | Minimal |
| Multiple terminal nodes | VICTORY vs ESCAPE (different endings) | No |
| DAG convergence | Both wings → GREAT_HALL | No |
| Event emission | Full event stream | Yes |
| Fan-out with real choice | ANTECHAMBER (west/east), GREAT_HALL (boss/escape) | No (coffee had guard-based, not choice-based) |

---

## Visualization Design

### Layout (Browser)

The big win of going browser: the dungeon map can be a proper **SVG** with animation, glow effects, fog of war, and smooth transitions. The rest of the UI is standard React panels around it.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚔ The Tomb of Echoes                                    reflex-dungeon    │
├────────────────────────────────────────┬────────────────────────────────────┤
│                                        │                                    │
│            ┌──────────┐                │  Narrative                         │
│            │ ENTRANCE │                │  ─────────                         │
│            └────┬─────┘                │  You enter the Guard Room. A       │
│            ┌────┴─────┐                │  skeletal warrior rises from a     │
│            │ANTECHAMB.│                │  stone sarcophagus, rusty blade    │
│            └──┬────┬──┘                │  in hand.                          │
│          ╱         ╲                   │                                    │
│     ┌───┴──┐  ┌──┴───┐               │  ┌─ Combat: Tomb Guard ─────────┐  │
│     │ WEST │  │ EAST │               │  │  HP: ██░░░  2/3              │  │
│     └──┬───┘  └──────┘               │  │  Your turn.                  │  │
│     ┌──┴────┐                         │  └──────────────────────────────┘  │
│     │ARMORY │                         │                                    │
│     └──┬────┘                         │  > What do you do?                 │
│     ┌──┴──────┐                       │    [Attack] [Use Potion] [Defend]  │
│     │◉GUARD RM│ ← you               │                                    │
│     └──┬──────┘                       ├────────────────────────────────────┤
│        ⋮                              │  Inventory        Health           │
│   (fog of war)                        │  🗡️ Rusty Sword   ██████░░ 6/8    │
│                                        │  🧪 Health Potion                  │
│         SVG map with                   │  🔵 West Seal                      │
│         animated transitions           │  ○ East Seal                       │
│         and glow effects               │                                    │
├────────────────────────────────────────┼────────────────────────────────────┤
│  Stack                                 │  Events (collapsible)              │
│  [1] combat → PLAYER_TURN             │  node:enter PLAYER_TURN            │
│  [0] dungeon-crawl → GUARD_ROOM       │  bb:write enemy_hp=2              │
└────────────────────────────────────────┴────────────────────────────────────┘
```

### Panels

| Panel | Content | Notes |
|-------|---------|-------|
| **Dungeon Map** (SVG) | Spatial room graph. Rooms are rounded rects, corridors are path lines. Animated current-room glow. Fog of war dims unvisited rooms. Explored path has a "torch trail." | The centerpiece. SVG gives us smooth animation, gradients, glow filters, opacity transitions. |
| **Narrative** | Room descriptions, combat dialogue, puzzle text. Typewriter-style text reveal for atmosphere. Choice buttons inline at the bottom. | Replaces a separate Input panel — choices live in the narrative flow. |
| **Inventory** | Named items with emoji/icons. Health bar (SVG or CSS). Collected vs not-found. | Domain-specific blackboard. Not raw key-values. |
| **Stack** | Stack frames with depth index. Highlights push/pop transitions. | Same concept as coffee shop, styled for browser. |
| **Events** | Collapsible scrolling log, color-coded by event type. This is the "debug" panel — the developer view into Reflex internals. | Collapsible so it doesn't distract from the game, but available for the Reflex demo purpose. |

### Map Rendering (SVG)

1. **Pre-computed layout**: Room positions defined as `{ id: string, x: number, y: number }` in a layout config. No auto-layout — the dungeon shape is hand-designed for visual clarity.

2. **SVG elements per room**:
   - `<rect>` with rounded corners — the room
   - `<text>` — room label
   - Status-driven styling via CSS classes:
     - `.unexplored` — dark, low opacity, no detail
     - `.explored` — stone texture, fully visible
     - `.current` — glowing border (CSS animation or SVG filter), slightly larger
     - `.locked` — red tint, lock icon overlay
   - Corridors: `<line>` or `<path>` between room centers, dashed if guarded

3. **Fog of war**: Rooms default to near-invisible. As you explore, adjacent rooms fade in (CSS transition on opacity). Creates a "revealing the map" feel.

4. **Transitions**: When moving to a new room, the glow slides along the corridor path (SVG `animateMotion` or CSS transition). Brief, smooth, not flashy.

5. **Sub-workflow overlay**: When combat/puzzle activates, the map dims slightly and a modal-like overlay appears in the Narrative panel showing the sub-workflow state. The map stays visible but recedes.

### Interaction Model

**Room transitions (root workflow):** Suspend at choice points (ANTECHAMBER, loot rooms, GREAT_HALL). User clicks buttons in the Narrative panel. Non-choice rooms auto-advance with delay (~500ms) for narrative pacing + typewriter text.

**Combat (sub-workflow):** Suspend at PLAYER_TURN for action buttons. RESOLVE_ATTACK and CHECK_OUTCOME auto-advance with delay (~700ms — dramatic pacing). HP bars animate on damage.

**Puzzle (sub-workflow):** Suspend at ATTEMPT for answer buttons. EXAMINE auto-advances with typewriter text.

**Pacing**: Deliberate. Text types out. Map transitions animate. This is atmosphere, not speed.

---

## Decision Agent

A `DungeonAgent` implementing `DecisionAgent`. More complex than CoffeeAgent:

**Room-level decisions:**
- At ANTECHAMBER: suspend → user picks west/east → agent reads `player_choice` and advances to matching edge.
- At loot rooms (ARMORY, ARCHIVES): suspend → user picks take/leave → agent writes item flag and advances.
- At GREAT_HALL: suspend → user picks boss door or escape. If boss door chosen but guard fails (missing seals), the engine reports only SIDE_EXIT as valid — agent must pick that, with narrative explaining why.

**Combat decisions:**
- At PLAYER_TURN: suspend → user picks attack/potion/defend → agent writes `action` to blackboard.
- At RESOLVE_ATTACK: agent reads `action`, `has_sword`, `has_potion`, calculates outcome, writes `enemy_hp`, `player_hit`, etc.
- At CHECK_OUTCOME: agent reads flags, advances to VICTORY_C or DEFEAT_C.

**State tracking:**
- Health is tracked on the blackboard (`player_hp` as a number). Since blackboard is append-only, each write shadows the previous — latest value wins.
- Inventory flags (`has_sword`, `has_potion`) are simple exists checks.
- Potion consumption: write `potion_used: true`, then agent checks both `has_potion` and `not potion_used` (or use a custom guard).

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Runtime | Browser (ESM) | |
| Language | TypeScript | |
| Framework | React 19 | |
| Build | Vite | Fast HMR, native ESM, zero-config TypeScript |
| Styling | CSS Modules or Tailwind | TBD — CSS Modules is simpler, Tailwind is faster to iterate |
| Map rendering | SVG (inline React) | No graph library — hand-positioned rooms, simple enough to own |
| Reflex | `@corpus-relica/reflex` (`file:../reflex`) | Local file dependency |

**No server component.** Reflex runs entirely client-side. The engine, agent, workflows, and visualization all live in the browser. Vite serves the dev build, that's it.

### Project Structure

```
reflex-dungeon/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── PLAN.md                      (this file)
├── public/                      (static assets if needed)
├── src/
│   ├── App.tsx                  Root layout — map, narrative, panels
│   ├── main.tsx                 Entry point — React render
│   ├── engine/
│   │   ├── setup.ts             Create registry, register workflows, create engine
│   │   ├── hooks.ts             React hooks: useEngine, useBlackboard, useStack, useEvents
│   │   └── bridge.ts            Engine↔React bridge — event listeners → state updates
│   ├── workflows/
│   │   ├── dungeon-crawl.ts     Root workflow (15 nodes)
│   │   ├── combat.ts            Reusable combat sub-workflow (6 nodes)
│   │   └── puzzle-riddle.ts     Puzzle sub-workflow (4 nodes)
│   ├── agent.ts                 DungeonAgent implementation
│   ├── content/
│   │   ├── narrative.ts         Room descriptions, combat text, puzzle riddles
│   │   └── layout.ts            Map coordinates — {id, x, y} per room
│   ├── components/
│   │   ├── DungeonMap.tsx        SVG map — rooms, corridors, fog, glow
│   │   ├── Room.tsx              Single room SVG group (rect + label + status)
│   │   ├── Corridor.tsx          SVG line/path between rooms
│   │   ├── Narrative.tsx         Story text with typewriter effect + inline choices
│   │   ├── Inventory.tsx         Items + health bar
│   │   ├── StackView.tsx         Stack frame display
│   │   ├── EventLog.tsx          Collapsible scrolling event log
│   │   └── HealthBar.tsx         Animated HP bar (SVG or CSS)
│   ├── styles/
│   │   ├── dungeon.css           Map theming — colors, glow filters, fog
│   │   └── layout.css            Panel grid layout
│   └── types.ts                  Game-local types (room state, combat state, etc.)
└── README.md
```

### Key Architecture: Engine↔React Bridge

Reflex is a plain TypeScript library, not React-aware. The `engine/bridge.ts` module connects them:

1. **Engine events → React state**: Subscribe to all engine events (`on('node:enter', ...)`, etc.). Each event dispatches to a React reducer that updates game state (current node, blackboard snapshot, stack snapshot, event log).

2. **React actions → Engine steps**: User clicks a choice button → React calls a `handleChoice()` function → writes to blackboard (if needed) → calls `engine.step()` → engine fires events → bridge updates state → React re-renders.

3. **Auto-advance loop**: For non-suspend nodes, a `setTimeout` chain calls `engine.step()` repeatedly with delay, until the engine suspends or completes.

This bridge is the reusable pattern across all Reflex demos. Coffee shop will use the same architecture (Ink version). The hooks (`useEngine`, `useBlackboard`, etc.) could eventually become a `@corpus-relica/reflex-react` package.

---

## Implementation Phases

### Phase 1: Workflows + Agent (no UI)
- Define all 3 workflows as Reflex `Workflow` objects
- Register, validate
- Implement DungeonAgent with deterministic choices (always go west, always attack, always answer correctly)
- Run `engine.run()` in a test script, verify full completion path (victory ending)
- Run escape path (go east only → escape ending)
- Verify: guards block boss door without both seals, combat outcomes work, returnMaps flow correctly

### Phase 2: Vite + React Shell
- Scaffold Vite + React 19 + TypeScript project
- Panel grid layout (CSS grid: map left, narrative+inventory right, stack+events bottom)
- Static placeholder content in each panel
- Wire in Reflex as `file:../reflex` dependency, verify import works in browser

### Phase 3: Engine↔React Bridge
- `bridge.ts` — engine event listeners → React reducer dispatches
- `hooks.ts` — `useEngine()`, `useBlackboard()`, `useStack()`, `useEvents()`
- Auto-advance loop with delay for non-suspend nodes
- Verify: engine runs, state updates flow through to React, re-renders happen

### Phase 4: SVG Map
- Room positions in `layout.ts`
- `<DungeonMap>` SVG component with `<Room>` and `<Corridor>` sub-components
- Room status styling (unexplored/explored/current/locked)
- Corridor rendering (solid for open, dashed for guarded)
- Fog of war (opacity transitions on room visibility)
- Current-room glow animation (CSS keyframes on SVG filter)

### Phase 5: Narrative + Interaction
- `narrative.ts` — all prose (room descriptions, combat text, puzzle riddle)
- `<Narrative>` component with typewriter text effect
- Inline choice buttons at bottom of narrative panel
- Wire choices → agent → engine.step() → state update loop
- Combat UI (enemy HP bar, action buttons, damage numbers)
- Puzzle UI (riddle text, answer buttons)

### Phase 6: Remaining Panels + Polish
- `<Inventory>` — items with icons, health bar
- `<StackView>` — stack frame display with push/pop highlight
- `<EventLog>` — collapsible, color-coded, auto-scroll
- Dungeon color theme (stone grays, torch amber `#d4a017`, blood red accents)
- Transition animations (room glow slides along corridor on move)
- Victory / Escape ending screens
- "Play again?" reset

---

## Complexity Comparison

| Dimension | Coffee Shop | Dungeon |
|-----------|-------------|---------|
| Root nodes | 9 | 15 |
| Sub-workflows | 3 (trivial, 3-5 nodes) | 3 (one reusable, one with real logic) |
| Total nodes | ~20 | ~25 |
| Guard types used | builtin `equals` only | `exists` + `equals` + `not-equals` + custom compound |
| Suspend points | 3 (order choices) | 6+ (direction, loot, combat, puzzle) |
| Terminal nodes | 1 | 2 (multiple endings) |
| DAG convergence | No | Yes (both wings → GREAT_HALL) |
| Sub-wf reuse | No (3 unique) | Yes (combat invoked 2x) |
| Scoped reads | Minimal | Heavy (combat reads inventory) |
| Visualization | Vertical node list (TUI) | SVG spatial map (browser) |
| Narrative content | Minimal (labels) | Rich (prose per room, typewriter effect) |
| Platform | Terminal (Ink) | Browser (React + Vite) |
| Implementation phases | 4 | 6 |

---

## Resolved Questions

1. **Dependency strategy:** `file:../reflex` — same as coffee shop.

2. **Sub-workflow animation:** Auto-advance with ~500-700ms delay. Combat paces slower for drama. Suspends at PLAYER_TURN and ATTEMPT for real player input.

3. **Rendering target:** Browser (React 19 + Vite), not TUI. SVG for the map.

4. **Map rendering:** Pre-computed static layout (manual coordinates per room), not auto-layout. SVG with CSS transitions for fog of war, glow, and movement animation.

5. **Combat system:** Simple but functional — sword doubles damage, potion heals, defend reduces incoming. Not trying to be a real RPG. Just enough mechanics to make choices meaningful and demonstrate Reflex features.

6. **Reusable combat workflow:** Single `combat` workflow invoked with different enemy specs via the invoking node's `NodeSpec`. The agent reads the spec to configure the encounter.

7. **Styling approach:** TBD — CSS Modules (simpler) vs Tailwind (faster to iterate). Decide at Phase 2 scaffold time.

8. **Engine↔React bridge:** Custom hooks + reducer pattern. Engine events dispatch to a React reducer; user actions call engine.step(). This pattern is reusable across demos and could become `@corpus-relica/reflex-react`.
