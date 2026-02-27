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
      <defs>
        {/* Room glow — dual-layer Gaussian blur for warm torchlight feel */}
        <filter id="roomGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" in="SourceGraphic" result="blur1" />
          <feFlood floodColor="#c9a84c" floodOpacity="0.25" result="color1" />
          <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
          <feGaussianBlur stdDeviation="8" in="SourceGraphic" result="blur2" />
          <feFlood floodColor="#c9a84c" floodOpacity="0.1" result="color2" />
          <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
          <feMerge>
            <feMergeNode in="glow2" />
            <feMergeNode in="glow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Background gradient — deep void with subtle warmth at center */}
        <radialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#10101a" />
          <stop offset="100%" stopColor="#08080d" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="600" height="860" fill="url(#bgGrad)" />

      {/* Cartographic grid — concentric circles emanating from map center */}
      {[120, 240, 360, 480].map((r) => (
        <circle
          key={r}
          cx="300"
          cy="430"
          r={r}
          fill="none"
          stroke="rgba(201,168,76,0.025)"
          strokeWidth="0.5"
        />
      ))}

      {/* Cartographic crosshairs */}
      <line x1="0" y1="430" x2="600" y2="430" stroke="rgba(201,168,76,0.02)" strokeWidth="0.5" />
      <line x1="300" y1="0" x2="300" y2="860" stroke="rgba(201,168,76,0.02)" strokeWidth="0.5" />

      {/* Corner accents — cartographic frame markers */}
      <path d="M15,8 L15,3 L20,3" fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="0.8" />
      <path d="M580,8 L585,8 L585,3" fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="0.8" />
      <path d="M15,852 L15,857 L20,857" fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="0.8" />
      <path d="M580,852 L585,852 L585,857" fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="0.8" />

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
