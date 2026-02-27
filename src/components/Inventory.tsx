import React from 'react';
import type { InventoryItem } from '../types.js';
import { HealthBar } from './HealthBar.js';

interface InventoryProps {
  items: InventoryItem[];
  playerHp: number;
  maxPlayerHp: number;
}

export function Inventory({ items, playerHp, maxPlayerHp }: InventoryProps) {
  return (
    <div className="inventory-panel">
      <div className="panel-label">Inventory & Health</div>
      <div className="inventory-grid">
        <HealthBar current={playerHp} max={maxPlayerHp} label="❤️ HP" />
        {items.map((item) => (
          <div
            key={item.key}
            className={`inventory-item ${item.collected ? 'collected' : 'missing'}`}
          >
            <span>{item.emoji}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
