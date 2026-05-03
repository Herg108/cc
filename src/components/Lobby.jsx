import { useState, useRef } from 'react'

export default function Lobby({ socket, onJoined }) {
  const [code, setCode] = useState('')
  const [createdCode, setCreatedCode] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState(null)
  const codeRef = useRef(null)

  function createGame() {
    socket.emit('create_game', null, ({ code }) => {
      codeRef.current = code
      setCreatedCode(code)
      setWaiting(true)
      setError(null)
    })
    socket.once('opponent_joined', () => {
      onJoined('white', codeRef.current || '')
    })
  }

  function joinGame() {
    if (!code.trim()) return
    socket.emit('join_game', code.trim().toUpperCase(), (res) => {
      if (res.error) { setError(res.error); return }
      onJoined('black', code.trim().toUpperCase())
    })
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#1a1a2e', color: '#ccc',
    }}>
      <h1 style={{ fontSize: 38, fontWeight: 900, color: '#fff', margin: '0 0 48px', letterSpacing: 2 }}>
        Chaos Chess
      </h1>

      <div style={{ display: 'flex', gap: 1, alignItems: 'stretch' }}>
        {/* Create */}
        <div style={cardStyle}>
          <div style={cardTitle}>Create Game</div>
          {!waiting ? (
            <button style={btnStyle} onClick={createGame}>Create</button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 10, letterSpacing: 1 }}>SHARE THIS CODE</div>
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 10, color: '#fff', marginBottom: 12 }}>
                {createdCode}
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>Waiting for opponent...</div>
            </div>
          )}
        </div>

        <div style={{ width: 1, background: '#2a3a6a', margin: '0 32px' }} />

        {/* Join */}
        <div style={cardStyle}>
          <div style={cardTitle}>Join Game</div>
          <input
            style={inputStyle}
            placeholder="CODE"
            value={code}
            maxLength={4}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && joinGame()}
          />
          <button style={btnStyle} onClick={joinGame}>Join</button>
          {error && <div style={{ fontSize: 12, color: '#f66', marginTop: 4 }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}

const cardStyle = {
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: 16, minWidth: 200, padding: '8px 16px',
}
const cardTitle = {
  fontSize: 11, color: '#556', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4,
}
const btnStyle = {
  background: '#0f3460', border: '1px solid #1a4a8a', borderRadius: 6,
  color: '#fff', padding: '10px 28px', cursor: 'pointer', fontSize: 14,
  letterSpacing: 1, transition: 'background 0.15s',
}
const inputStyle = {
  background: '#0f1929', border: '1px solid #2a3a6a', borderRadius: 6,
  color: '#fff', padding: '10px 12px', fontSize: 24, letterSpacing: 8,
  width: 130, textAlign: 'center', outline: 'none',
}
