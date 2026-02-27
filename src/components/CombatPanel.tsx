import React from 'react';
import type { BlackboardReader } from '@corpus-relica/reflex';
import { HealthBar } from './HealthBar.js';

interface CombatPanelProps {
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  combatLog: string;
}

export function CombatPanel({ enemyName, enemyHp, enemyMaxHp, combatLog }: CombatPanelProps) {
  return (
    <div className="combat-panel">
      <div className="combat-title">⚔ Combat: {enemyName}</div>
      <div className="combat-enemy-hp">
        <span className="health-label" style={{ color: '#e74c3c' }}>
          Enemy HP:
        </span>
        <div className="enemy-hp-bar">
          <div
            className="enemy-hp-fill"
            style={{
              width: `${enemyMaxHp > 0 ? (enemyHp / enemyMaxHp) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="health-label">
          {enemyHp}/{enemyMaxHp}
        </span>
      </div>
      {combatLog && (
        <div className="combat-log-text">{combatLog}</div>
      )}
    </div>
  );
}
