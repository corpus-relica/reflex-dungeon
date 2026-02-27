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

const ROOM_W = 114;
const ROOM_H = 34;
const CHAMFER = 5;

/** Generate a chamfered rectangle (cut-corner tablet shape) as an SVG path. */
function chamferedPath(cx: number, cy: number, w: number, h: number, c: number): string {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const t = cy - h / 2;
  const b = cy + h / 2;
  return [
    `M${l + c},${t}`,
    `L${r - c},${t}`,
    `L${r},${t + c}`,
    `L${r},${b - c}`,
    `L${r - c},${b}`,
    `L${l + c},${b}`,
    `L${l},${b - c}`,
    `L${l},${t + c}`,
    'Z',
  ].join(' ');
}

export function Room({ id, x, y, label, status, width = ROOM_W, height = ROOM_H }: RoomProps) {
  return (
    <g>
      <path
        d={chamferedPath(x, y, width, height, CHAMFER)}
        className={`room-shape ${status}`}
      />
      <text x={x} y={y} className={`room-label ${status}`}>
        {label}
      </text>
    </g>
  );
}
