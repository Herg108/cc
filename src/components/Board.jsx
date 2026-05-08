import { useState, useEffect } from 'react'
import { getLegalMoves } from '../game/validator'

const SQ = 72
const W = 52

const GHOST = {
  white: { fill: 'transparent', stroke: '#f0e8d8', strokeWidth: 2 },
  black: { fill: 'transparent', stroke: '#d4a040', strokeWidth: 2 },
}

function Pawn({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <circle cx="22.5" cy="10" r="6" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M20,16 C17,18 15.5,24 17,30 L28,30 C29.5,24 28,18 25,16 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M17,30 L15,36 L30,36 L28,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="12" y="36" width="21" height="4.5" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
    </svg>
  )
}

function Rook({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <rect x="9" y="36" width="27" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M14,35.5 L14,20.5 Q14,20 13.5,20 L12.5,20 Q12,20 12,19.5 L12,11.5 Q12,11 12.5,11 L15.5,11 Q16,11 16,11.5 L16,14.5 Q16,15 16.5,15 L19.5,15 Q20,15 20,14.5 L20,11.5 Q20,11 20.5,11 L24.5,11 Q25,11 25,11.5 L25,14.5 Q25,15 25.5,15 L28.5,15 Q29,15 29,14.5 L29,11.5 Q29,11 29.5,11 L32.5,11 Q33,11 33,11.5 L33,19.5 Q33,20 32.5,20 L31.5,20 Q31,20 31,20.5 L31,35.5 Q31,36 30.5,36 L14.5,36 Q14,36 14,35.5 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <line x1="14" y1="20" x2="31" y2="20" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

function Bishop({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <circle cx="22.5" cy="8" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M22.5,11 C17,15 13,22 14,30 L31,30 C32,22 28,15 22.5,11 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M14,30 L12,36 L33,36 L31,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="10" y="36" width="25" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <line x1="23.5" y1="20.5" x2="27" y2="15.4" stroke={stroke || (fill === 'transparent' ? stroke : '#00000077')} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

function Knight({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <path d="M22,10 L18,6 L17.57,11.46 C15.05,13.14 13,16.16 13,20 C13,24 15,26 16,28 L14,36 L31,36 L29,28 C31,26 32,23 31,19 C30,14 27,10 22,10 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="11" y="36" width="23" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <circle cx="19" cy="19" r="2" fill={stroke || (fill === 'transparent' ? stroke : '#00000044')}/>
      <path d="M13,20 C14,17.5 17,15 20,14.5" fill="none" stroke={stroke || (fill === 'transparent' ? stroke : '#00000033')} strokeWidth={strokeWidth * 0.8} strokeLinecap="round"/>
      <path d="M24,10.3 L32,11.8 Q33,12 33.4,12.7 Q37,19.5 34.7,26.5 Q35,27 33.5,27.2 L29.5,27.5" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="30.4" y1="16.85" x2="35" y2="16.85" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="31.4" y1="22.15" x2="35.5" y2="22.15" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

function Queen({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <circle cx="22.5" cy="8" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <circle cx="10" cy="13" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <circle cx="35" cy="13" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M10,16 L13,30 L32,30 L35,16 L28,22 L22.5,11 L17,22 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M13,30 L11,36 L34,36 L32,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="9" y="36" width="27" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
    </svg>
  )
}

function King({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <path d="M20,16.25 L20,3.75 A1.5,1.5 0 0,1 21.5,2.25 L23.5,2.25 A1.5,1.5 0 0,1 25,3.75 L25,16.25" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="16" y="6.25" width="13" height="5" rx="1.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M14,30 C14,20 18,17 22.5,16 C27,17 31,20 31,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M14,30 L12,36 L33,36 L31,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="9" y="36" width="27" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
    </svg>
  )
}

const PIECE_COMPONENTS = { king: King, queen: Queen, rook: Rook, bishop: Bishop, knight: Knight, pawn: Pawn }

function FireIcon() {
  return (
    <svg viewBox="0 0 14 16" width={13} height={13}>
      <path d="M7,15 C3,15 0.5,12 0.5,8.5 C0.5,5.5 2,3.5 4,1.5 C4,4 5.5,5.5 5.5,5.5 C5.5,3 6.5,0.5 9,0 C10.5,3 13.5,5 13.5,8.5 C13.5,12 11,15 7,15 Z" fill="#c85010" />
      <path d="M7,13 C4.5,13 2.5,11 2.5,8.5 C2.5,6.5 3.5,5 5.5,3.5 C5.5,5.5 6.5,6.5 6.5,6.5 C6.5,4.5 7.5,3 9,2 C10,4.5 11.5,6 11.5,8.5 C11.5,11 9.5,13 7,13 Z" fill="#e87818" />
      <path d="M7,11 C5.5,11 4.5,9.5 4.5,8.5 C4.5,7 5.5,6 6.5,5 C6.5,6.5 7.5,7.5 7.5,7.5 C7.5,6 8,5 9,4 C9.5,6 10.5,7 10.5,8.5 C10.5,10 9,11 7,11 Z" fill="#d4a040" />
    </svg>
  )
}

function WraparoundIcon() {
  return (
    <svg viewBox="0 0 14 14" width={13} height={13}>
      {/* 300° clockwise arc */}
      <path d="M7,2 A5,5 0 1,1 2.7,4.5"
        fill="none" stroke="#d4a040" strokeWidth="2" strokeLinecap="round"/>
      {/* arrowhead aligned to tangent (0.5, -0.866) at endpoint */}
      <path d="M3.6,6.0 L2.7,4.5 L1.1,5.5"
        fill="none" stroke="#d4a040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ConversionIcon() {
  return (
    <svg viewBox="0 0 14 14" width={13} height={13}>
      <path d="M3,4.5 Q3,1.5 7,1.5 Q11,1.5 11,4.5"
        fill="none" stroke="#c060e0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.5,4.5 L11,6 L12.5,4.5"
        fill="none" stroke="#c060e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11,9.5 Q11,12.5 7,12.5 Q3,12.5 3,9.5"
        fill="none" stroke="#c060e0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4.5,9.5 L3,8 L1.5,9.5"
        fill="none" stroke="#c060e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function BoomerangIcon({ color }) {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13}>
      <path d="M3,15 C4,9 7,4 8,2.5 C9.5,3.5 12.5,5.5 14,8"
        fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function BombBadge({ count }) {
  return (
    <svg viewBox="0 0 20 20" width={17} height={17}>
      <circle cx="10" cy="12.5" r="7" fill="#aa1500" stroke="#dd3322" strokeWidth="1"/>
      <path d="M10,5.5 Q12,3.5 13.5,2" fill="none" stroke="#c8a030" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="13.5" cy="1.8" r="1.2" fill="#f0c040"/>
      <text x="10" y="12.5" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="bold" fill="#ffcc80" fontFamily="sans-serif">{count}</text>
    </svg>
  )
}

function ShieldBadge({ count }) {
  return (
    <svg viewBox="0 0 20 20" width={17} height={17}>
      {/* outer shield */}
      <path d="M2,2.5 Q2,1 3.5,1 L16.5,1 Q18,1 18,2.5 L18,11 Q18,16.5 10,19.5 Q2,16.5 2,11 Z"
        fill="#b88000" stroke="#f0c840" strokeWidth="1"/>
      {/* inner border */}
      <path d="M4,3.3 L16,3.3 L16,10.3 Q16,14.3 10,17.3 Q4,14.3 4,10.3 Z"
        fill="none" stroke="#ffe090" strokeWidth="0.7" opacity="0.55"/>
      {/* cross dividers — split to leave gap around number */}
      <line x1="10" y1="3.3" x2="10" y2="4.8" stroke="#ffe090" strokeWidth="0.6" opacity="0.35"/>
      <line x1="10" y1="14.8" x2="10" y2="17.3" stroke="#ffe090" strokeWidth="0.6" opacity="0.35"/>
      <line x1="4" y1="8.8" x2="6" y2="8.8" stroke="#ffe090" strokeWidth="0.6" opacity="0.35"/>
      <line x1="14" y1="8.8" x2="16" y2="8.8" stroke="#ffe090" strokeWidth="0.6" opacity="0.35"/>
      {/* number */}
      <text x="10.15" y="9.3" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="bold" fill="#ffe080" fontFamily="sans-serif">{count}</text>
    </svg>
  )
}

const EFFECT_STYLES = {
  lava:      { bg: 'rgba(255, 80, 0, 0.45)' },
  explosion: { bg: 'rgba(255, 220, 0, 0.6)' },
  fire:      { bg: 'rgba(255, 120, 0, 0.5)' },
  ice:       { bg: 'rgba(100, 200, 255, 0.35)' },
  poison:    { bg: 'rgba(100, 255, 80, 0.35)' },
  void:      { bg: 'rgba(80, 0, 180, 0.5)' },
  mine:      { bg: 'rgba(180, 30, 30, 0.3)' },
}

const FLIP_ARROW = { '↑':'↓','↓':'↑','←':'→','→':'←','↖':'↘','↘':'↖','↗':'↙','↙':'↗' }

const PORTAL_COLORS = {
  white: { bg: 'rgba(0, 210, 230, 0.55)', text: '#c0f0ff' },
  black: { bg: 'rgba(255, 130, 0, 0.55)',  text: '#ffe8a0' },
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
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQ}px)`, gridTemplateRows: `repeat(8, ${SQ}px)`, border: '2px solid #2a2018' }}>
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

                let bg = light ? '#6b5d52' : '#4a3f35'
                if (isSel) bg = light ? '#7a6820' : '#5a4e18'
                else if (isActivationTarget && activationSelectMode.selectMode === 'piece') bg = light ? '#7a4a30' : '#5a3020'
                else if (isActivationTarget && activationSelectMode.selectMode === 'emptySquare') bg = light ? '#5a3a6a' : '#3a2050'
                else if (isLegal && !isCapture) bg = light ? '#5e5430' : '#3e3818'

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
                      if (effect.type === 'mine') {
                        const mc = effect.owner === 'white' ? '#ffaaaa' : '#ffcc88'
                        return (
                          <div key={i} style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none', zIndex: 2,
                          }}>
                            <svg viewBox="0 0 20 20" width={22} height={22}>
                              <circle cx="10" cy="10" r="7" fill="#6a1010" stroke={mc} strokeWidth="1.2"/>
                              <line x1="10" y1="1" x2="10" y2="3.5" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <line x1="10" y1="16.5" x2="10" y2="19" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <line x1="1" y1="10" x2="3.5" y2="10" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <line x1="16.5" y1="10" x2="19" y2="10" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <line x1="3.2" y1="3.2" x2="5" y2="5" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <line x1="15" y1="15" x2="16.8" y2="16.8" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <line x1="16.8" y1="3.2" x2="15" y2="5" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <line x1="5" y1="15" x2="3.2" y2="16.8" stroke={mc} strokeWidth="1.5" strokeLinecap="round"/>
                              <circle cx="10" cy="10" r="3" fill={mc} opacity="0.6"/>
                            </svg>
                          </div>
                        )
                      }
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
                            <span style={{ fontSize: 16, fontWeight: 900, color: pc.text, lineHeight: 1, zIndex: 3, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
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
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(212, 160, 64, 0.35)',
                        position: 'absolute',
                      }} />
                    )}
                    {isCapture && (
                      <>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTop: '18px solid rgba(212, 160, 64, 0.65)', borderRight: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '18px solid rgba(212, 160, 64, 0.65)', borderLeft: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderBottom: '18px solid rgba(212, 160, 64, 0.65)', borderRight: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderBottom: '18px solid rgba(212, 160, 64, 0.65)', borderLeft: '18px solid transparent', zIndex: 1, pointerEvents: 'none' }} />
                      </>
                    )}
                    {(piece?.pieceBadges || [])
                      .filter(type => (type === 'invincible' && piece.invincible) || (type === 'bomb' && piece.bomb))
                      .map((type, i) => {
                        const el = type === 'invincible'
                          ? <ShieldBadge count={piece.invincible.movesLeft} />
                          : <BombBadge count={piece.bomb.movesLeft} />
                        return (
                          <div key={type} style={{ position: 'absolute', top: 3 + i * 22, right: 3, zIndex: 5, pointerEvents: 'none', lineHeight: 0 }}>
                            {el}
                          </div>
                        )
                      })
                    }
                    {(piece?.pieceEffects || []).map((effect, i) => {
                      let ind = null
                      if (effect === 'ignition')   ind = { element: <FireIcon /> }
                      if (effect === 'boomerang')  ind = { element: <BoomerangIcon color={piece.boomerang?.isBoomerang ? '#c85010' : '#f0e8d8'} /> }
                      if (effect === 'wraparound') ind = { element: <WraparoundIcon /> }
                      if (effect === 'conversion') ind = { element: <ConversionIcon /> }
                      if (!ind) return null
                      return (
                        <div key={i} style={{
                          position: 'absolute', top: 3 + i * 17, left: 3,
                          width: 15, height: 15,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex: 5, pointerEvents: 'none',
                          ...(ind.color ? { color: ind.color, fontSize: ind.fontSize, lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,0.8)' } : {}),
                        }}>
                          {ind.element ?? ind.content}
                        </div>
                      )
                    })}
                    {piece && (() => {
                      const PieceComp = PIECE_COMPONENTS[piece.type]
                      return PieceComp ? (
                        <div style={{ zIndex: 4, lineHeight: 0, pointerEvents: 'none' }}>
                          <PieceComp {...GHOST[piece.color]} />
                        </div>
                      ) : null
                    })()}
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
