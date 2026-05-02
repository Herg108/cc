import { useState, useEffect } from 'react'
import { getLegalMoves } from '../game/validator'

const SYMBOLS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
}

const SQ = 72

export default function Board({ gameState, onMove, disabled, ownModifiers = [], attackerModifiers = [] }) {
  const [selected, setSelected] = useState(null)
  const [legalMoves, setLegalMoves] = useState([])

  useEffect(() => {
    setSelected(null)
    setLegalMoves([])
  }, [gameState])

  function handleClick(r, c) {
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

                let bg = light ? '#f0d9b5' : '#b58863'
                if (isSel) bg = '#f6f669'
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
                      cursor: disabled ? 'default' : 'pointer',
                      fontSize: 48,
                      userSelect: 'none',
                      position: 'relative',
                    }}
                  >
                    {isLegal && !isCapture && (
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.18)',
                        position: 'absolute',
                      }} />
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
