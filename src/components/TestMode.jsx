import { useState } from 'react'
import { createInitialBoard } from '../game/initialBoard'
import { applyMove, isInCheck, isCheckmate, getWinner } from '../game/validator'
import { ALL_MODIFIERS } from '../game/modifiers'
import Board from './Board'

function checkCustomWin(gameState, active) {
  for (const color of ['white', 'black']) {
    for (const mod of active[color]) {
      const w = mod.checkWin?.(gameState)
      if (w) return w
    }
  }
  return null
}

function runMovePipeline(game, active, fromR, fromC, toR, toC) {
  const piece = game.squares[fromR][fromC]
  const move = { fromR, fromC, toR, toC, piece, color: piece.color }
  let next = applyMove(game, fromR, fromC, toR, toC)

  let moveUpdate = {}
  for (const color of ['white', 'black']) {
    for (const mod of active[color]) {
      if (!mod.onMovePieces) continue
      const result = mod.onMovePieces(next, { ...move, ...moveUpdate })
      if (result) {
        next = result.gameState
        if (result.moveUpdate) moveUpdate = { ...moveUpdate, ...result.moveUpdate }
      }
    }
  }
  for (const color of ['white', 'black']) {
    for (const mod of active[color]) {
      if (!mod.onLateMovePieces) continue
      const result = mod.onLateMovePieces(next, { ...move, ...moveUpdate })
      if (result) {
        next = result.gameState
        if (result.moveUpdate) moveUpdate = { ...moveUpdate, ...result.moveUpdate }
      }
    }
  }

  const resolvedMove = { ...move, finalR: move.toR, finalC: move.toC, ...moveUpdate }

  for (const color of ['white', 'black']) {
    for (const mod of active[color]) {
      if (!mod.onAfterMove) continue
      next = mod.onAfterMove(next, resolvedMove, color) ?? next
    }
  }

  return next
}

export default function TestMode() {
  const [game, setGame] = useState(() => createInitialBoard())
  const [active, setActive] = useState({ white: [], black: [] })
  const [selectingPiece, setSelectingPiece] = useState(null)
  const [customWinner, setCustomWinner] = useState(null)
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)

  const opponent = game.turn === 'white' ? 'black' : 'white'
  const ownMods = [...active[game.turn], ...active[opponent].filter(m => m.globalEffect)]
  const attackerMods = [...active[opponent], ...active[game.turn].filter(m => m.globalEffect)]

  const kingGone = getWinner(game)
  const mated = !customWinner && !kingGone && isCheckmate(game, game.turn, ownMods, attackerMods)
  const winner = customWinner || kingGone || (mated ? opponent : null)
  const check = !mated && !customWinner && !kingGone && isInCheck(game, game.turn, attackerMods)

  function pushHistory() {
    setHistory(h => [...h, { game, active }])
  }

  function handleMove(fromR, fromC, toR, toC) {
    pushHistory()
    let next = runMovePipeline(game, active, fromR, fromC, toR, toC)

    const cw = checkCustomWin(next, active)
    if (cw) { setGame(next); setCustomWinner(cw); return }
    const kg = getWinner(next)
    if (kg) { setGame(next); setCustomWinner(kg); return }

    const piece = game.squares[fromR][fromC]
    const opp = piece.color === 'white' ? 'black' : 'white'
    const nextOwnMods = [...active[opp], ...active[piece.color].filter(m => m.globalEffect)]
    const nextAttackerMods = [...active[piece.color], ...active[opp].filter(m => m.globalEffect)]
    if (isCheckmate(next, opp, nextOwnMods, nextAttackerMods)) {
      setGame(next); setCustomWinner(piece.color); return
    }

    for (const mod of active[next.turn]) {
      if (!mod.onTurnStart) continue
      next = mod.onTurnStart(next, next.turn) ?? next
    }

    setGame(next)
  }

  function handleActivateModifier(mod, color) {
    if (active[color].some(m => m.id === mod.id)) return
    pushHistory()
    const key = `${mod.id}_${color}`
    const newGame = mod.onActivate ? (mod.onActivate(game, color) ?? game) : game

    if (newGame.modifierData?.[key]?.awaitingSelection) {
      setGame(newGame)
      setSelectingPiece({ mod, color, key })
    } else {
      setGame(newGame)
      setActive(prev => ({ ...prev, [color]: [...prev[color], mod] }))
    }
  }

  function handleActivationClick(r, c) {
    if (!selectingPiece) return
    const { mod, color } = selectingPiece
    const result = mod.handleActivationClick?.(game, r, c, color)
    if (!result) return

    setGame(result.gameState)
    if (result.done) {
      setActive(prev => ({ ...prev, [color]: [...prev[color], mod] }))
      setSelectingPiece(null)
    }
  }

  function undo() {
    if (history.length === 0) return
    const snap = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setGame(snap.game)
    setActive(snap.active)
    setSelectingPiece(null)
    setCustomWinner(null)
  }

  function copyPosition() {
    const files = ['a','b','c','d','e','f','g','h']
    const ranks = [8,7,6,5,4,3,2,1]
    const lines = []
    for (let r = 0; r < 8; r++) {
      const row = []
      for (let c = 0; c < 8; c++) {
        const p = game.squares[r][c]
        if (p) {
          const symbol = p.type[0].toUpperCase() + (p.type === 'knight' ? 'n' : '')
          const tags = []
          if (p.wraparound) tags.push('wrap')
          if (p.boomerang) tags.push('boom')
          if (p.ignition) tags.push('ignit')
          if (p.invincible) tags.push(`inv(${p.invincible.movesLeft})`)
          if (p.bomb) tags.push(`bomb(${p.bomb.movesLeft})`)
          const tag = tags.length ? `[${tags.join(',')}]` : ''
          row.push(`${p.color[0]}${p.type === 'knight' ? 'N' : p.type[0].toUpperCase()}${tag}@${files[c]}${ranks[r]}`)
        }
      }
      if (row.length) lines.push(row.join(', '))
    }
    const activeMods = [
      active.white.length ? `White: ${active.white.map(m => m.name).join(', ')}` : null,
      active.black.length ? `Black: ${active.black.map(m => m.name).join(', ')}` : null,
    ].filter(Boolean).join(' | ')
    const text = [
      `Turn: ${game.turn}`,
      activeMods || 'No active modifiers',
      lines.join('\n'),
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function reset() {
    setGame(createInitialBoard())
    setActive({ white: [], black: [] })
    setSelectingPiece(null)
    setCustomWinner(null)
    setHistory([])
  }

  const activationSelectMode = selectingPiece
    ? { selectMode: selectingPiece.mod?.selectMode, color: selectingPiece.color }
    : null

  let status = `${game.turn === 'white' ? 'White' : 'Black'} to move`
  if (selectingPiece) status = selectingPiece.mod?.getSelectionPrompt?.(game, selectingPiece.color) ?? 'Click to select'
  if (check) status = `${game.turn === 'white' ? 'White' : 'Black'} is in check`
  if (winner) status = `${winner === 'white' ? 'White' : 'Black'} wins!`

  return (
    <div className="app">
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        Test Mode
        <span style={{ fontSize: 13, fontWeight: 400, color: '#6a5a48', letterSpacing: 1 }}>DEV</span>
      </h1>
      <div className="status">{status}</div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* Modifier panel */}
        <div style={{ width: 200 }}>
          <div style={{ fontSize: 11, color: '#6a5a48', marginBottom: 10, letterSpacing: 1 }}>ADD MODIFIER</div>
          {ALL_MODIFIERS.map(mod => {
            const whiteHas = active.white.some(m => m.id === mod.id)
            const blackHas = active.black.some(m => m.id === mod.id)
            return (
              <div key={mod.id} style={{ background: '#261e18', border: '1px solid #3d3028', borderRadius: 4, padding: '6px 8px', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#d4a040', marginBottom: 4 }}>{mod.name}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleActivateModifier(mod, 'white')}
                    disabled={whiteHas}
                    style={btnStyle(whiteHas ? '#1a1208' : '#2a1e10', whiteHas ? '#3d3028' : '#a89070')}
                  >White</button>
                  <button
                    onClick={() => handleActivateModifier(mod, 'black')}
                    disabled={blackHas}
                    style={btnStyle(blackHas ? '#1a1208' : '#2a1e10', blackHas ? '#3d3028' : '#a89070')}
                  >Black</button>
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={undo} disabled={history.length === 0} style={btnStyle(history.length === 0 ? '#1a1208' : '#2a1e10', history.length === 0 ? '#3d3028' : '#a89070')}>Undo</button>
            <button onClick={reset} style={btnStyle('#2a1e10', '#a89070')}>Reset</button>
            <button onClick={copyPosition} style={btnStyle(copied ? '#1a2e10' : '#2a1e10', copied ? '#80c060' : '#a89070')}>{copied ? 'Copied!' : 'Copy Pos'}</button>
          </div>
        </div>

        {/* Board */}
        <Board
          gameState={game}
          onMove={handleMove}
          disabled={!!winner}
          ownModifiers={ownMods}
          attackerModifiers={attackerMods}
          activationSelectMode={activationSelectMode}
          onActivationClick={handleActivationClick}
          flipped={false}
        />

        {/* Active modifiers */}
        <div style={{ display: 'flex', gap: 20 }}>
          <ActiveList label="white" mods={active.white} />
          <ActiveList label="black" mods={active.black} />
        </div>

      </div>
    </div>
  )
}

function btnStyle(bg, color) {
  return {
    background: bg, color, border: '1px solid #3d3028', borderRadius: 3,
    padding: '2px 8px', fontSize: 10, cursor: 'pointer', transition: 'none',
  }
}

function ActiveList({ label, mods }) {
  return (
    <div style={{ width: 120, paddingTop: 8 }}>
      <div style={{ fontSize: 11, color: '#6a5a48', marginBottom: 8, letterSpacing: 1 }}>{label.toUpperCase()}</div>
      {mods.length === 0
        ? <div style={{ fontSize: 11, color: '#3d3028' }}>None</div>
        : mods.map((m, i) => (
          <div key={i} style={{ background: '#261e18', border: '1px solid #3d3028', borderRadius: 4, padding: '4px 8px', fontSize: 11, color: '#d4a040', marginBottom: 4 }}>
            {m.name}
          </div>
        ))
      }
    </div>
  )
}
