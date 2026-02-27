import React from 'react';
import type { RoomStatus } from '../types.js';

interface RoomProps {
  id: string;
  x: number;
  y: number;
  label: string;
  status: RoomStatus;
  width?: number;
  height?: number;
}

const ROOM_W = 100;
const ROOM_H = 32;

export function Room({ id, x, y, label, status, width = ROOM_W, height = ROOM_H }: RoomProps) {
  const rx = x - width / 2;
  const ry = y - height / 2;

  return (
    <g>
      <rect
        x={rx}
        y={ry}
        width={width}
        height={height}
        className={`room-rect ${status}`}
      />
      <text x={x} y={y} className={`room-label ${status}`}>
        {label}
      </text>
    </g>
  );
}
