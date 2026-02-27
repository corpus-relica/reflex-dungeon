import React, { useEffect, useState, useRef } from 'react';
import type { SuspendChoice } from '../types.js';

interface NarrativeProps {
  text: string;
  prompt: string | null;
  choices: SuspendChoice[] | null;
  onChoice: (value: string) => void;
  waitingForContinue: boolean;
  onContinue: () => void;
  combatPanel: React.ReactNode | null;
}

/**
 * Narrative panel with typewriter text effect, inline choice buttons,
 * and an explicit Continue button for non-choice nodes.
 */
export function Narrative({
  text,
  prompt,
  choices,
  onChoice,
  waitingForContinue,
  onContinue,
  combatPanel,
}: NarrativeProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Typewriter effect — triggers when `text` changes
  useEffect(() => {
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;

    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayedText(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [text]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText, choices, waitingForContinue]);

  const doneTyping = !isTyping;

  return (
    <div className="narrative-panel" ref={scrollRef}>
      <div className="panel-label">Narrative</div>
      <div className="narrative-text">
        {displayedText}
        {isTyping && <span style={{ opacity: 0.5 }}>▌</span>}
      </div>

      {combatPanel}

      {/* Choice prompt + buttons (suspend nodes) */}
      {doneTyping && prompt && (
        <div className="choice-prompt">{prompt}</div>
      )}
      {doneTyping && choices && choices.length > 0 && (
        <div className="choice-buttons">
          {choices.map((c) => (
            <button
              key={c.value}
              className="choice-btn"
              onClick={() => onChoice(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Continue button (non-choice narrative nodes) */}
      {doneTyping && waitingForContinue && !choices && (
        <div className="choice-buttons">
          <button className="choice-btn continue-btn" onClick={onContinue}>
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
