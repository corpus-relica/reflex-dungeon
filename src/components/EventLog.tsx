import React, { useRef, useEffect } from 'react';
import type { EventLogEntry } from '../types.js';

interface EventLogProps {
  events: EventLogEntry[];
}

function typeToClass(type: string): string {
  return type.replace(':', '-');
}

export function EventLog({ events }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const displayEvents = events.slice(-30); // show last 30

  return (
    <div className="event-panel">
      <div className="panel-label">Events</div>
      <div className="event-log" ref={scrollRef}>
        {displayEvents.map((e) => (
          <div key={e.id} className="event-entry">
            <span className={`event-type ${typeToClass(e.type)}`}>{e.type}</span>
            <span className="event-msg">{e.message}</span>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ color: '#555' }}>No events yet</div>
        )}
      </div>
    </div>
  );
}
