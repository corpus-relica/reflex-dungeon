import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ReflexEngine } from '@corpus-relica/reflex';
import type { AppState, DungeonNodeSpec } from './types.js';
import {
  createInitialState,
  syncStateFromEngine,
  registerEngineEvents,
  submitChoice,
  shouldAutoAdvance,
  getSuspendInfo,
} from './engine/bridge.js';
import { DungeonMap } from './components/DungeonMap.js';
import { Narrative } from './components/Narrative.js';
import { Inventory } from './components/Inventory.js';
import { StackView } from './components/StackView.js';
import { EventLog } from './components/EventLog.js';
import { CombatPanel } from './components/CombatPanel.js';
import './styles/layout.css';
import './styles/dungeon.css';

interface AppProps {
  engine: ReflexEngine;
  onReset: () => void;
}

export function App({ engine, onReset }: AppProps) {
  const engineRef = useRef(engine);
  const [state, setState] = useState<AppState>(() => createInitialState(engine));
  const stateRef = useRef(state);
  stateRef.current = state;
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const steppingRef = useRef(false);

  // Add event to log
  const addEvent = useCallback((type: string, message: string) => {
    setState((prev) => ({
      ...prev,
      eventCounter: prev.eventCounter + 1,
      events: [
        ...prev.events,
        { id: prev.eventCounter, type, message, timestamp: Date.now() },
      ],
    }));
  }, []);

  // Register engine events once
  useEffect(() => {
    registerEngineEvents(engineRef.current, addEvent);
  }, [addEvent]);

  // Sync state from engine
  const syncState = useCallback(() => {
    const eng = engineRef.current;
    setState((prev) => ({
      ...prev,
      ...syncStateFromEngine(eng, prev),
    }));
  }, []);

  // Step the engine
  const doStep = useCallback(async () => {
    if (steppingRef.current) return;
    steppingRef.current = true;

    const eng = engineRef.current;
    const currentState = stateRef.current;
    if (currentState.completed || eng.status() === 'completed') {
      steppingRef.current = false;
      return;
    }

    try {
      const result = await eng.step();
      syncState();

      if (result.status === 'completed') {
        const node = eng.currentNode();
        const spec = node?.spec as DungeonNodeSpec | undefined;
        setState((prev) => ({
          ...prev,
          completed: true,
          suspended: false,
          suspendChoices: null,
          suspendPrompt: null,
          ending: spec?.ending ?? null,
        }));
        steppingRef.current = false;
        return;
      }

      if (result.status === 'suspended') {
        // Check for game over defeat
        if (result.reason === 'GAME_OVER_DEFEAT') {
          setState((prev) => ({
            ...prev,
            completed: true,
            suspended: false,
            ending: 'defeat',
            narrativeText:
              'You have fallen in the Tomb of Echoes. The ancient stones seal around you, and silence returns to the halls. Perhaps another adventurer will fare better...',
          }));
          steppingRef.current = false;
          return;
        }

        const { choices, prompt, writeKey } = getSuspendInfo(eng);
        setState((prev) => ({
          ...prev,
          suspended: true,
          suspendChoices: choices,
          suspendPrompt: prompt,
        }));
        steppingRef.current = false;
        return;
      }

      // After a sub-workflow pop, we're back at the invoking node.
      // Skip re-showing its narrative — step again immediately to advance past it.
      if (result.status === 'popped') {
        steppingRef.current = false;
        autoTimerRef.current = setTimeout(() => doStep(), 50);
        return;
      }

      // Advanced / invoked — check for auto-advance
      if (shouldAutoAdvance(eng)) {
        // Wait for the player to click Continue
        setState((prev) => ({ ...prev, waitingForContinue: true }));
        steppingRef.current = false;
        return;
      }

      // Non-auto-advance node (suspend or terminal will be caught on next step)
      steppingRef.current = false;
      // Trigger one more step to reach suspend
      autoTimerRef.current = setTimeout(() => doStep(), 100);
    } catch (err) {
      console.error('Engine step error:', err);
      steppingRef.current = false;
    }
  }, [syncState]);

  // Handle player choice
  const handleChoice = useCallback(
    async (value: string) => {
      const eng = engineRef.current;
      const { writeKey } = getSuspendInfo(eng);

      if (!writeKey) return;
      submitChoice(writeKey, value);

      setState((prev) => ({
        ...prev,
        suspended: false,
        suspendChoices: null,
        suspendPrompt: null,
      }));

      await doStep();
    },
    [doStep],
  );

  // Handle Continue button on non-choice narrative nodes
  const handleContinue = useCallback(async () => {
    setState((prev) => ({ ...prev, waitingForContinue: false }));
    await doStep();
  }, [doStep]);

  // Start the engine on mount — first step triggers the auto-advance chain
  useEffect(() => {
    doStep();
    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
      }
    };
  }, [doStep]);

  // Build combat panel if in combat
  let combatPanelNode: React.ReactNode = null;
  if (state.inSubWorkflow && state.subWorkflowType === 'combat') {
    const bb = engine.blackboard();
    const enemyName = (bb.get('enemy_name') as string) ?? 'Unknown';
    const enemyHp = (bb.get('enemy_hp') as number) ?? 0;
    const enemyMaxHp = (bb.get('enemy_max_hp') as number) ?? 3;
    const combatLog = (bb.get('combat_log') as string) ?? '';

    combatPanelNode = (
      <CombatPanel
        enemyName={enemyName}
        enemyHp={enemyHp}
        enemyMaxHp={enemyMaxHp}
        combatLog={combatLog}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <span className="header-title">⚔ The Tomb of Echoes</span>
        <span className="header-subtitle">reflex-dungeon</span>
      </div>

      {/* Map */}
      <div className="map-panel">
        <DungeonMap roomStatuses={state.roomStatuses} />
      </div>

      {/* Right side: Narrative + Inventory */}
      <div className="right-panel">
        <Narrative
          text={state.narrativeText}
          prompt={state.suspendPrompt}
          choices={state.suspendChoices}
          onChoice={handleChoice}
          waitingForContinue={state.waitingForContinue}
          onContinue={handleContinue}
          combatPanel={combatPanelNode}
        />
        <Inventory
          items={state.inventory}
          playerHp={state.playerHp}
          maxPlayerHp={state.maxPlayerHp}
        />
      </div>

      {/* Bottom bar: Stack + Events */}
      <div className="bottom-bar">
        <StackView
          stack={state.stack}
          currentWorkflowId={state.currentWorkflowId}
          currentNodeId={state.currentNodeId}
        />
        <EventLog events={state.events} />
      </div>

      {/* Ending overlay */}
      {state.completed && state.ending && (
        <div className="ending-overlay">
          <div className={`ending-card ${state.ending === 'victory' ? 'victory' : 'escape'}`}>
            <div className={`ending-title ${state.ending === 'victory' ? 'victory' : 'escape'}`}>
              {state.ending === 'victory'
                ? '🏆 Victory'
                : state.ending === 'defeat'
                  ? '💀 Defeated'
                  : '🏃 Escaped'}
            </div>
            <div className="ending-text">{state.narrativeText}</div>
            <button className="play-again-btn" onClick={onReset}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
