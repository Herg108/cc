import { useState } from 'react'

export default function DraftPhase({ pickingColor, options, activeModifiers, onPick }) {
  const [tooltip, setTooltip] = useState(null)
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: '#16213e',
        border: '2px solid #2a3a6a',
        borderRadius: 12,
        padding: '32px 40px',
        maxWidth: 600,
        width: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <h2 style={{ fontSize: 22, color: '#fff', margin: 0 }}>
          Pick a modifier
        </h2>

        <div style={{ display: 'flex', gap: 12 }}>
          {options.map(mod => (
            <button
              key={mod.id}
              onClick={() => onPick(mod)}
              style={{
                flex: 1,
                background: '#0f3460',
                border: '1px solid #1a4a8a',
                borderRadius: 8,
                padding: '16px 12px',
                color: '#e0e0e0',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1a4a8a'; e.currentTarget.style.borderColor = '#4a8ae8' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.borderColor = '#1a4a8a' }}
            >
              <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{mod.name}</span>
              <span style={{ fontSize: 13, color: '#aaa', lineHeight: 1.4 }}>{mod.description}</span>
            </button>
          ))}
        </div>

        {activeModifiers.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Active modifiers:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {activeModifiers.map((m, i) => (
                <span
                  key={i}
                  onMouseEnter={() => setTooltip(i)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    position: 'relative',
                    background: '#1a2a4a',
                    border: '1px solid #2a3a6a',
                    borderRadius: 4,
                    padding: '3px 10px',
                    fontSize: 12,
                    color: '#8ab',
                    cursor: 'help',
                  }}
                >
                  {m.name}
                  {tooltip === i && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: 6,
                      background: '#0d1b33',
                      border: '1px solid #2a3a6a',
                      borderRadius: 6,
                      padding: '8px 10px',
                      fontSize: 12,
                      color: '#ccc',
                      lineHeight: 1.5,
                      width: 200,
                      zIndex: 50,
                      pointerEvents: 'none',
                      whiteSpace: 'normal',
                    }}>
                      <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>{m.name}</div>
                      {m.description}
                    </div>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
