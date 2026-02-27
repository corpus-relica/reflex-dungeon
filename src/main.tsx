import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReflexEngine } from '@corpus-relica/reflex';
import { setupEngine } from './engine/setup.js';
import { App } from './App.js';

function Root() {
  const [engine, setEngine] = useState<ReflexEngine | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setupEngine().then(setEngine);
  }, [key]);

  const handleReset = useCallback(() => {
    setEngine(null);
    setKey((k) => k + 1);
  }, []);

  if (!engine) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          background: '#1a1a2e',
          color: '#d4a017',
          fontFamily: 'Georgia, serif',
          fontSize: '1.3em',
        }}
      >
        Entering the Tomb of Echoes...
      </div>
    );
  }

  return <App key={key} engine={engine} onReset={handleReset} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(<Root />);
