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
  ice:       { bg: 'rgba(100, 200, 255, 0.35)' },
  poison:    { bg: 'rgba(100, 255, 80, 0.35)' },
  void:      { bg: 'rgba(80, 0, 180, 0.5)' },
}

export default function Board({ gameState, onMove, disabled, ownModifiers = [], attackerModifiers = [], bombSelectMode = null, onBombSelect }) {
  const [selected, setSelected] = useState(null)
  const [legalMoves, setLegalMoves] = useState([])

  useEffect(() => {
    setSelected(null)
    setLegalMoves([])
  }, [gameState])

  function handleClick(r, c) {
    if (bombSelectMode) {
      onBombSelect?.(r, c)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div style={{ display: 'flex' }}>
        {/* Rank labels */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: 20, paddingBottom: 24 }}>
          {[8,7,6,5,4,3,2,1].map(n => (
            <span key={n} style={{ color: '#888', fontSize: 12, textAlign: 'center', lineHeight: `${SQ}px` }}>{n}</span>
          ))}
        </div>

        <div>
          {/* Board grid */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQ}px)`, gridTemplateRows: `repeat(8, ${SQ}px)`, border: '2px solid #555' }}>
            {gameState.squares.map((row, r) =>
              row.map((piece, c) => {
                const light = (r + c) % 2 === 0
                const isSel = selected?.[0] === r && selected?.[1] === c
                const isLegal = legalMoves.some(([lr, lc]) => lr === r && lc === c)
                const isCapture = isLegal && !!piece
                const squareEffects = (gameState.boardEffects || []).filter(e => e.r === r && e.c === c)
                const isBombTarget = bombSelectMode && piece?.color === bombSelectMode.color

                let bg = light ? '#f0d9b5' : '#b58863'
                if (isSel) bg = '#f6f669'
                else if (isBombTarget) bg = light ? '#f0a080' : '#c06040'
                else if (isLegal) bg = isCapture
                  ? (light ? '#e8a090' : '#c9614e')
                  : (light ? '#cdd96e' : '#aaa23a')

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleClick(r, c)}
                    style={{
                      width: SQ, height: SQ,
                      background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: isBombTarget ? 'crosshair' : disabled ? 'default' : 'pointer',
                      fontSize: 48,
                      userSelect: 'none',
                      position: 'relative',
                    }}
                  >
                    {squareEffects.map((effect, i) => (
                      <div key={i} style={{
                        position: 'absolute', inset: 0,
                        background: EFFECT_STYLES[effect.type]?.bg ?? 'rgba(255,0,0,0.3)',
                        pointerEvents: 'none',
                        zIndex: 0,
                      }} />
                    ))}
                    {isLegal && !isCapture && (
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.18)',
                        position: 'absolute',
                      }} />
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
                    {piece && (
                      <span style={{
                        color: piece.color === 'white' ? '#fff' : '#1a1a1a',
                        textShadow: piece.color === 'white'
                          ? '0 1px 3px #000, 0 0 4px #000'
                          : '0 1px 2px rgba(255,255,255,0.4)',
                        zIndex: 1,
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

          {/* File labels */}
          <div style={{ display: 'flex', paddingLeft: 0 }}>
            {files.map(f => (
              <span key={f} style={{ width: SQ, textAlign: 'center', color: '#888', fontSize: 12, paddingTop: 4 }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
