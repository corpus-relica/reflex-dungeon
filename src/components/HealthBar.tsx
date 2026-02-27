import React from 'react';

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  className?: string;
  barClassName?: string;
  fillClassName?: string;
}

export function HealthBar({
  current,
  max,
  label,
  className = 'health-bar-container',
  barClassName = 'health-bar',
  fillClassName = 'health-bar-fill',
}: HealthBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const level = pct > 60 ? 'high' : pct > 30 ? 'medium' : 'low';

  return (
    <div className={className}>
      {label && <span className="health-label">{label}</span>}
      <div className={barClassName}>
        <div
          className={`${fillClassName} ${level}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="health-label">
        {current}/{max}
      </span>
    </div>
  );
}
