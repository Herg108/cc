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
  const capturedPiece = game.squares[toR][toC]
  const move = { fromR, fromC, toR, toC, piece, color: piece.color, capturedPiece }
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

function parsePosition(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null

  const turn = lines[0].includes('white') ? 'white' : 'black'

  const parsedActive = { white: [], black: [] }
  if (lines[1] !== 'No active modifiers') {
    for (const part of lines[1].split(' | ')) {
      const colon = part.indexOf(': ')
      if (colon === -1) continue
      const color = part.slice(0, colon).toLowerCase() === 'white' ? 'white' : 'black'
      for (const name of part.slice(colon + 2).split(', ')) {
        const mod = ALL_MODIFIERS.find(m => m.name === name.trim())
        if (mod) parsedActive[color].push(mod)
      }
    }
  }

  const files = ['a','b','c','d','e','f','g','h']
  const typeMap = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' }
  const squares = Array(8).fill(null).map(() => Array(8).fill(null))
  const boardEffects = []
  const modifierData = {}

  // Find and parse Effects line if present
  const effectsIdx = lines.findIndex(l => l.startsWith('Effects: '))
  if (effectsIdx !== -1) {
    for (const token of lines[effectsIdx].slice(9).split(', ')) {
      const portal = token.match(/^portal\((\w+),([a-h][1-8]),(.+)\)$/)
      if (portal) {
        const color = portal[1], sq = portal[2], label = portal[3]
        const c = files.indexOf(sq[0]), r = 8 - parseInt(sq[1])
        boardEffects.push({ r, c, type: 'portal', owner: color, label })
      }
      const mine = token.match(/^mine\((\w+),([a-h][1-8])\)$/)
      if (mine) {
        const color = mine[1], sq = mine[2]
        const c = files.indexOf(sq[0]), r = 8 - parseInt(sq[1])
        boardEffects.push({ r, c, type: 'mine', owner: color })
      }
    }
    // Reconstruct portal modifierData from boardEffects
    for (const color of ['white', 'black']) {
      const portals = boardEffects.filter(e => e.type === 'portal' && e.owner === color)
      if (portals.length > 0) {
        modifierData[`portal_${color}`] = {
          awaitingSelection: false,
          portal1: portals[0] ? [portals[0].r, portals[0].c] : null,
          portal2: portals[1] ? [portals[1].r, portals[1].c] : null,
        }
      }
    }
  }

  const pieceLineStart = effectsIdx !== -1 ? effectsIdx + 1 : 2
  for (const line of lines.slice(pieceLineStart)) {
    for (const token of line.split(', ')) {
      const m = token.match(/^([wb])([KQRBNP])(\[([^\]]*)\])?@([a-h])([1-8])$/)
      if (!m) continue
      const color = m[1] === 'w' ? 'white' : 'black'
      const type = typeMap[m[2]]
      const tagStr = m[4] || ''
      const col = files.indexOf(m[5])
      const row = 8 - parseInt(m[6])

      const piece = { type, color }
      const pieceEffects = [], pieceBadges = []

      for (const tag of tagStr ? tagStr.split(',') : []) {
        if (tag === 'wrap') { piece.wraparound = { owner: color }; pieceEffects.push('wraparound') }
        if (tag === 'boom') { piece.boomerang = { owner: color, isBoomerang: true }; pieceEffects.push('boomerang') }
        if (tag === 'ignit') { piece.ignition = { owner: color }; pieceEffects.push('ignition'); boardEffects.push({ r: row, c: col, type: 'fire', owner: color }) }
        if (tag === 'conv') { piece.conversion = { owner: color }; pieceEffects.push('conversion') }
        const inv = tag.match(/^inv\((\d+)\)$/); if (inv) { piece.invincible = { owner: color, movesLeft: +inv[1] }; pieceBadges.push('invincible') }
        const bomb = tag.match(/^bomb\((\d+)\)$/); if (bomb) { piece.bomb = { owner: color, movesLeft: +bomb[1] }; pieceBadges.push('bomb') }
      }

      if (pieceEffects.length) piece.pieceEffects = pieceEffects
      if (pieceBadges.length) piece.pieceBadges = pieceBadges
      squares[row][col] = piece
    }
  }

  for (const color of ['white', 'black']) {
    for (const mod of parsedActive[color]) {
      if (!modifierData[`${mod.id}_${color}`])
        modifierData[`${mod.id}_${color}`] = { awaitingSelection: false }
    }
  }

  const base = createInitialBoard()
  return {
    game: { ...base, squares, turn, boardEffects, modifierData },
    active: parsedActive,
  }
}

export default function TestMode() {
  const [game, setGame] = useState(() => createInitialBoard())
  const [active, setActive] = useState({ white: [], black: [] })
  const [selectingPiece, setSelectingPiece] = useState(null)
  const [customWinner, setCustomWinner] = useState(null)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
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
    setFuture([])
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
    setFuture(f => [...f, { game, active }])
    setHistory(h => h.slice(0, -1))
    setGame(snap.game)
    setActive(snap.active)
    setSelectingPiece(null)
    setCustomWinner(null)
  }

  function redo() {
    if (future.length === 0) return
    const snap = future[future.length - 1]
    setHistory(h => [...h, { game, active }])
    setFuture(f => f.slice(0, -1))
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
          if (p.conversion) tags.push('conv')
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
    const persistedEffects = (game.boardEffects || []).filter(e => e.type === 'portal' || e.type === 'mine')
    const effectsStr = persistedEffects.length
      ? 'Effects: ' + persistedEffects.map(e => {
          const sq = `${files[e.c]}${ranks[e.r]}`
          return e.type === 'portal' ? `portal(${e.owner},${sq},${e.label})` : `mine(${e.owner},${sq})`
        }).join(', ')
      : null
    const text = [
      `Turn: ${game.turn}`,
      activeMods || 'No active modifiers',
      effectsStr,
      lines.join('\n'),
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function loadPosition() {
    navigator.clipboard.readText().then(text => {
      const result = parsePosition(text)
      if (!result) return
      setHistory(h => [...h, { game, active }])
      setFuture([])
      setGame(result.game)
      setActive(result.active)
      setSelectingPiece(null)
      setCustomWinner(null)
    }).catch(() => {})
  }

  function reset() {
    setGame(createInitialBoard())
    setActive({ white: [], black: [] })
    setSelectingPiece(null)
    setCustomWinner(null)
    setHistory([])
    setFuture([])
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
            <button onClick={redo} disabled={future.length === 0} style={btnStyle(future.length === 0 ? '#1a1208' : '#2a1e10', future.length === 0 ? '#3d3028' : '#a89070')}>Redo</button>
            <button onClick={reset} style={btnStyle('#2a1e10', '#a89070')}>Reset</button>
            <button onClick={copyPosition} style={btnStyle(copied ? '#1a2e10' : '#2a1e10', copied ? '#80c060' : '#a89070')}>{copied ? 'Copied!' : 'Copy Pos'}</button>
            <button onClick={loadPosition} style={btnStyle('#2a1e10', '#a89070')}>Load Pos</button>
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
