import React, { useState } from 'react';
import { useSpiteStore } from '../../../../core/src/useSpiteGrid';

/**
 * VibeCheckConsole
 * A developer overlay to debug grid state and LLM intent.
 * Part of Phase 5: The "Spite" Polish.
 */
export const VibeCheckConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const state = useSpiteStore();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#ff4d4d',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontWeight: 'bold',
          fontSize: '20px'
        }}
        title="Open Vibe-Check Console"
      >
        👹
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '600px',
        background: '#1a1a1a',
        color: '#00ff00',
        fontFamily: 'monospace',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #333'
      }}
    >
      <div
        style={{
          padding: '12px',
          background: '#333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #444'
        }}
      >
        <span style={{ fontWeight: 'bold' }}>VIBE-CHECK CONSOLE 👹</span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        <section style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#ff4d4d', margin: '0 0 8px 0', borderBottom: '1px solid #444' }}>Grid State</h4>
          <pre style={{ fontSize: '12px', margin: 0 }}>
            {JSON.stringify({
              rowCount: state.data.length,
              sorting: state.sorting,
              filtering: state.filtering,
              pagination: state.pagination
            }, null, 2)}
          </pre>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#ff4d4d', margin: '0 0 8px 0', borderBottom: '1px solid #444' }}>LLM Intent Parser (Mock)</h4>
          <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
            Ready for vibe-coding integration...
          </div>
          <input 
            type="text" 
            placeholder="Type a vibe command..." 
            style={{
              width: '100%',
              background: '#000',
              border: '1px solid #444',
              color: '#00ff00',
              padding: '8px',
              marginTop: '8px',
              borderRadius: '4px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                alert('Vibe command registered: ' + (e.currentTarget as HTMLInputElement).value);
                (e.currentTarget as HTMLInputElement).value = '';
              }
            }}
          />
        </section>

        <section>
          <h4 style={{ color: '#ff4d4d', margin: '0 0 8px 0', borderBottom: '1px solid #444' }}>Raw Data Snapshot</h4>
          <pre style={{ fontSize: '10px', margin: 0, color: '#aaa' }}>
            {JSON.stringify(state.data.slice(0, 3), null, 2)}
            {state.data.length > 3 ? `\n... (+${state.data.length - 3} more rows)` : ''}
          </pre>
        </section>
      </div>
      
      <div style={{ padding: '8px', background: '#000', fontSize: '10px', color: '#555', textAlign: 'center' }}>
        SpiteExpress v0.1.0-alpha • Powered by Spite 👹
      </div>
    </div>
  );
};
