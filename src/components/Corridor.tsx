import React from 'react';
import type { RoomStatus } from '../types.js';
import { roomPositionMap } from '../content/layout.js';

interface CorridorProps {
  from: string;
  to: string;
  guarded?: boolean;
  fromStatus: RoomStatus;
  toStatus: RoomStatus;
}

export function Corridor({ from, to, guarded, fromStatus, toStatus }: CorridorProps) {
  const fromPos = roomPositionMap[from];
  const toPos = roomPositionMap[to];
  if (!fromPos || !toPos) return null;

  // Determine corridor visual status
  let lineClass = 'unexplored';
  if (fromStatus === 'current' || toStatus === 'current') {
    lineClass = 'active';
  } else if (fromStatus === 'explored' || toStatus === 'explored') {
    lineClass = 'explored';
  }

  return (
    <line
      x1={fromPos.x}
      y1={fromPos.y}
      x2={toPos.x}
      y2={toPos.y}
      className={`corridor-line ${lineClass}${guarded ? ' guarded' : ''}`}
    />
  );
}
