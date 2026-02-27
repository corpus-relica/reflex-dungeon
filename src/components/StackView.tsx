import React from 'react';
import type { StackFrame } from '@corpus-relica/reflex';

interface StackViewProps {
  stack: StackFrame[];
  currentWorkflowId: string | null;
  currentNodeId: string | null;
}

export function StackView({ stack, currentWorkflowId, currentNodeId }: StackViewProps) {
  return (
    <div className="stack-panel">
      <div className="panel-label">Call Stack</div>
      {/* Current (top of stack — active) */}
      {currentWorkflowId && (
        <div className="stack-frame">
          <span className="depth">[{stack.length}]</span>
          <span className="workflow-name">{currentWorkflowId}</span>
          {' → '}
          <span className="node-name">{currentNodeId ?? '?'}</span>

          <span className="stack-active-marker">&#8592; active</span>
        </div>
      )}
      {/* Suspended frames */}
      {stack.map((frame, i) => (
        <div key={i} className="stack-frame">
          <span className="depth">[{stack.length - 1 - i}]</span>
          <span className="workflow-name">{frame.workflowId}</span>
          {' → '}
          <span className="node-name">{frame.currentNodeId}</span>
        </div>
      ))}
      {stack.length === 0 && !currentWorkflowId && (
        <div className="stack-empty">(empty)</div>
      )}
    </div>
  );
}
