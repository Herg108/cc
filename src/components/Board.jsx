import { useState, useEffect } from 'react'
import { getLegalMoves } from '../game/validator'

const SYMBOLS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
}

const SQ = 72

const EFFECT_STYLES = {
  lava:      { bg: 'rgba(255, 80, 0, 0.45)' },
  explosion: { bg: 'rgba(255, 220, 0, 0.6)' },
  fire:      { bg: 'rgba(255, 120, 0, 0.5)' },
  ice:       { bg: 'rgba(100, 200, 255, 0.35)' },
  poison:    { bg: 'rgba(100, 255, 80, 0.35)' },
  void:      { bg: 'rgba(80, 0, 180, 0.5)' },
}

const FLIP_ARROW = { '↑':'↓','↓':'↑','←':'→','→':'←','↖':'↘','↘':'↖','↗':'↙','↙':'↗' }

const PORTAL_COLORS = {
  white: { bg: 'rgba(0, 210, 230, 0.55)', text: '#fff' },
  black: { bg: 'rgba(255, 130, 0, 0.55)',  text: '#fff' },
}

export default function Board({ gameState, onMove, disabled, ownModifiers = [], attackerModifiers = [], activationSelectMode = null, onActivationClick, flipped = false }) {
  const [selected, setSelected] = useState(null)
  const [legalMoves, setLegalMoves] = useState([])

  useEffect(() => {
    setSelected(null)
    setLegalMoves([])
  }, [gameState])

  function handleClick(r, c) {
    if (activationSelectMode) {
      onActivationClick?.(r, c)
      return
    }
    if (disabled) return
    const { squares, turn } = gameState
    const piece = squares[r][c]

    if (selected) {
      const isLegal = legalMoves.some(([lr, lc]) => lr === r && lc === c)
      if (isLegal) {
        onMove(selected[0], selected[1], r, c)
        setSelected(null)
        setLegalMoves([])
        return
      }
      if (piece?.color === turn) {
        setSelected([r, c])
        setLegalMoves(getLegalMoves(gameState, r, c, ownModifiers, attackerModifiers))
        return
      }
      setSelected(null)
      setLegalMoves([])
      return
    }

    if (piece?.color === turn) {
      setSelected([r, c])
      setLegalMoves(getLegalMoves(gameState, r, c, ownModifiers, attackerModifiers))
    }
  }

  const files = ['a','b','c','d','e','f','g','h']
  const rows = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7]
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7]
  const rankLabels = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1]
  const fileLabels = flipped ? [...files].reverse() : files

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: 20, paddingBottom: 24 }}>
          {rankLabels.map(n => (
            <span key={n} style={{ color: '#888', fontSize: 12, textAlign: 'center', lineHeight: `${SQ}px` }}>{n}</span>
          ))}
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQ}px)`, gridTemplateRows: `repeat(8, ${SQ}px)`, border: '2px solid #555' }}>
            {rows.map(r =>
              cols.map(c => {
                const piece = gameState.squares[r][c]
                const light = (r + c) % 2 === 0

                const isSel = selected?.[0] === r && selected?.[1] === c
                const isLegal = legalMoves.some(([lr, lc]) => lr === r && lc === c)
                const isCapture = isLegal && !!piece
                const squareEffects = (gameState.boardEffects || []).filter(e => e.r === r && e.c === c)

                const isPortal = (gameState.boardEffects || []).some(e => e.r === r && e.c === c && e.type === 'portal')
                const isScorched = squareEffects.some(e => e.type === 'explosion')
                const isActivationTarget = activationSelectMode && (
                  activationSelectMode.selectMode === 'piece'
                    ? piece?.color === activationSelectMode.color
                    : activationSelectMode.selectMode === 'emptySquare'
                      ? !piece
                      : false
                )

                let bg = light ? '#f0d9b5' : '#b58863'
                if (isSel) bg = '#f6f669'
                else if (isActivationTarget && activationSelectMode.selectMode === 'piece') bg = light ? '#f0a080' : '#c06040'
                else if (isActivationTarget && activationSelectMode.selectMode === 'emptySquare') bg = light ? '#c8a0f0' : '#8840c0'
                else if (isLegal && !isCapture) bg = light ? '#cdd96e' : '#aaa23a'

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleClick(r, c)}
                    style={{
                      width: SQ, height: SQ,
                      background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: isActivationTarget ? 'crosshair' : disabled ? 'default' : 'pointer',
                      fontSize: 48,
                      userSelect: 'none',
                      position: 'relative',
                    }}
                  >
                    {squareEffects.map((effect, i) => {
                      if (effect.type === 'portal') {
                        const pc = PORTAL_COLORS[effect.owner] ?? PORTAL_COLORS.white
                        return (
                          <div key={i} style={{
                            position: 'absolute', inset: 0,
                            background: pc.bg,
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
                            padding: '2px 4px',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: pc.text, lineHeight: 1, zIndex: 3, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                              {flipped ? (FLIP_ARROW[effect.label] ?? effect.label) : effect.label}
                            </span>
                          </div>
                        )
                      }
                      if (effect.type === 'explosion') return (
                        <div key={i} style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(240, 220, 30, 0.38)',
                          pointerEvents: 'none',
                          zIndex: 0,
                        }} />
                      )
                      return (
                        <div key={i} style={{
                          position: 'absolute', inset: 0,
                          background: EFFECT_STYLES[effect.type]?.bg ?? 'rgba(255,0,0,0.3)',
                          pointerEvents: 'none',
                          zIndex: 0,
                        }} />
                      )
                    })}
                    {isLegal && !isCapture && (
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.18)',
                        position: 'absolute',
                      }} />
                    )}
                    {isCapture && (
                      <>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTop: '18px solid rgba(180, 60, 60, 0.7)', borderRight: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '18px solid rgba(180, 60, 60, 0.7)', borderLeft: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderBottom: '18px solid rgba(180, 60, 60, 0.7)', borderRight: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderBottom: '18px solid rgba(180, 60, 60, 0.7)', borderLeft: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                      </>

                    )}
                    {piece?.bomb && (
                      <div style={{
                        position: 'absolute', top: 3, right: 3,
                        background: '#ff2200', color: '#fff',
                        borderRadius: '50%', width: 18, height: 18,
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 3, pointerEvents: 'none',
                        boxShadow: '0 0 4px #ff2200',
                      }}>
                        {piece.bomb.movesLeft}
                      </div>
                    )}
                    {squareEffects.some(e => e.type === 'fire') && (
                      <div style={{
                        position: 'absolute', top: 3, left: 3,
                        fontSize: 14, lineHeight: 1,
                        zIndex: 5, pointerEvents: 'none',
                      }}>
                        🔥
                      </div>
                    )}
                    {piece && (
                      <span style={{
                        color: piece.color === 'white' ? '#fff' : '#1a1a1a',
                        textShadow: piece.color === 'white'
                          ? '0 1px 3px #000, 0 0 4px #000'
                          : '0 1px 2px rgba(255,255,255,0.4)',
                        zIndex: 4,
                        lineHeight: 1,
                      }}>
                        {SYMBOLS[piece.color][piece.type]}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex' }}>
            {fileLabels.map(f => (
              <span key={f} style={{ width: SQ, textAlign: 'center', color: '#888', fontSize: 12, paddingTop: 4 }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
