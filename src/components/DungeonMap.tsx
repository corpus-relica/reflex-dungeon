import React from 'react';
import { roomPositions, corridors } from '../content/layout.js';
import type { RoomStatus } from '../types.js';
import { Room } from './Room.js';
import { Corridor } from './Corridor.js';

interface DungeonMapProps {
  roomStatuses: Record<string, RoomStatus>;
}

export function DungeonMap({ roomStatuses }: DungeonMapProps) {
  const getStatus = (id: string): RoomStatus => roomStatuses[id] ?? 'unexplored';

  return (
    <svg
      viewBox="0 0 600 860"
      width="100%"
      height="100%"
      style={{ maxHeight: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* SVG Filters */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#d4a017" floodOpacity="0.4" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Background gradient */}
        <radialGradient id="bgGrad" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#1f1f3a" />
          <stop offset="100%" stopColor="#0f0f1e" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="600" height="860" fill="url(#bgGrad)" />

      {/* Corridors (drawn first, under rooms) */}
      {corridors.map((c) => (
        <Corridor
          key={`${c.from}-${c.to}`}
          from={c.from}
          to={c.to}
          guarded={c.guarded}
          fromStatus={getStatus(c.from)}
          toStatus={getStatus(c.to)}
        />
      ))}

      {/* Rooms */}
      {roomPositions.map((room) => (
        <Room
          key={room.id}
          id={room.id}
          x={room.x}
          y={room.y}
          label={room.label}
          status={getStatus(room.id)}
        />
      ))}
    </svg>
  );
}
