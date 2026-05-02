import { useState } from 'react'
import { createInitialBoard } from './game/initialBoard'
import { applyMove, isInCheck, isCheckmate, getWinner } from './game/validator'
import { getRandomModifiers } from './game/modifiers'
import Board from './components/Board'
import DraftPhase from './components/DraftPhase'

const DRAFT_EVERY = 7

function runHook(mod, hook, gameState, ...args) {
  if (!mod[hook]) return gameState
  return mod[hook](gameState, ...args) ?? gameState
}

export default function App() {
  const [game, setGame] = useState(() => createInitialBoard())
  const [active, setActive] = useState({ white: [], black: [] })
  const [draft, setDraft] = useState(null)
  const [movesMadeThisTurn, setMovesMadeThisTurn] = useState(0)
  const [customWinner, setCustomWinner] = useState(null)

  const opponent = game.turn === 'white' ? 'black' : 'white'
  const ownMods = active[game.turn]
  const attackerMods = active[opponent]

  const kingGone = getWinner(game)
  const mated = !customWinner && !kingGone && isCheckmate(game, game.turn, ownMods, attackerMods)
  const check = !mated && !customWinner && !kingGone && isInCheck(game, game.turn, attackerMods)
  const winner = customWinner || kingGone || (mated ? opponent : null)

  // draft.selectingPiece = { color, key } when a player needs to click a piece after picking
  const selectingPiece = draft?.selectingPiece ?? null

  function applyAllHooks(hook, gameState, ...args) {
    let next = gameState
    for (const color of ['white', 'black']) {
      for (const mod of active[color]) {
        next = runHook(mod, hook, next, ...args, color)
      }
    }
    return next
  }

  function applyColorHooks(hook, gameState, color, ...args) {
    let next = gameState
    for (const mod of active[color]) {
      next = runHook(mod, hook, next, color, ...args)
    }
    return next
  }

  function checkCustomWin(gameState) {
    for (const mod of [...active.white, ...active.black]) {
      const w = mod.checkWin?.(gameState)
      if (w) return w
    }
    return null
  }

  function handleMove(fromR, fromC, toR, toC) {
    const piece = game.squares[fromR][fromC]
    const move = { fromR, fromC, toR, toC, piece, color: piece.color }

    let next = applyMove(game, fromR, fromC, toR, toC)
    next = applyAllHooks('onAfterMove', next, move)

    const w = checkCustomWin(next)
    if (w) { setGame(next); setCustomWinner(w); return }

    const newMovesMade = movesMadeThisTurn + 1
    const getsExtra = active[piece.color].some(mod =>
      mod.grantExtraMove?.(next, newMovesMade, piece.color)
    )

    if (getsExtra) {
      next = { ...next, turn: piece.color }
      setMovesMadeThisTurn(newMovesMade)
      setGame(next)
      return
    }

    setMovesMadeThisTurn(0)
    next = applyColorHooks('onTurnStart', next, next.turn)
    setGame(next)

    if (next.moveCount % DRAFT_EVERY === 0) {
      const whiteOpts = getRandomModifiers(3, active.white.map(m => m.id))
      const blackOpts = getRandomModifiers(3, active.black.map(m => m.id))
      if (whiteOpts.length > 0 || blackOpts.length > 0) {
        setDraft({ current: 'white', options: { white: whiteOpts, black: blackOpts }, whitePick: null, selectingPiece: null })
      }
    }
  }

  // Called after a player has picked AND finished any piece selection
  function advanceDraft(pickedMod, color, latestGame) {
    if (color === 'white') {
      if (draft.options.black.length > 0) {
        setDraft(prev => ({ ...prev, current: 'black', whitePick: pickedMod, selectingPiece: null }))
      } else {
        setActive(prev => ({ ...prev, white: [...prev.white, pickedMod] }))
        setDraft(null)
      }
    } else {
      setActive(prev => ({
        white: draft.whitePick ? [...prev.white, draft.whitePick] : prev.white,
        black: [...prev.black, pickedMod],
      }))
      setDraft(null)
    }
  }

  function handlePick(mod) {
    const color = draft.current
    const nextGame = runHook(mod, 'onActivate', game, color)
    if (nextGame !== game) setGame(nextGame)

    // Check if this modifier needs piece selection before advancing
    const selectionKey = `${mod.id}_${color}`
    if (nextGame.modifierData[selectionKey]?.awaitingSelection) {
      setDraft(prev => ({ ...prev, selectingPiece: { color, key: selectionKey, mod } }))
      return
    }

    advanceDraft(mod, color, nextGame)
  }

  function handleBombSelect(r, c) {
    const { color, key, mod } = selectingPiece
    const piece = game.squares[r][c]
    if (!piece || piece.color !== color) return

    const squares = game.squares.map(row => row.map(p => p ? { ...p } : null))
    squares[r][c] = { ...piece, bomb: { owner: color, movesLeft: 5 } }

    const nextGame = {
      ...game,
      squares,
      modifierData: { ...game.modifierData, [key]: { awaitingSelection: false } },
    }
    setGame(nextGame)
    advanceDraft(mod, color, nextGame)
  }

  function reset() {
    setGame(createInitialBoard())
    setActive({ white: [], black: [] })
    setDraft(null)
    setMovesMadeThisTurn(0)
    setCustomWinner(null)
  }

  let status = `${game.turn === 'white' ? 'White' : 'Black'} to move`
  if (selectingPiece) status = `${selectingPiece.color === 'white' ? 'White' : 'Black'}: click a piece to plant the bomb`
  if (check) status = `${game.turn === 'white' ? 'White' : 'Black'} is in check`
  if (winner) status = `${winner === 'white' ? 'White' : 'Black'} wins!`

  const boardBombSelectMode = selectingPiece ? { color: selectingPiece.color } : null

  return (
    <div className="app">
      <h1>Chess</h1>
      <div className="status">{status}</div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <ModifierList label="Black" mods={active.black} />
        <Board
          gameState={game}
          onMove={handleMove}
          disabled={!!winner || (!!draft && !selectingPiece)}
          ownModifiers={ownMods}
          attackerModifiers={attackerMods}
          bombSelectMode={boardBombSelectMode}
          onBombSelect={handleBombSelect}
        />
        <ModifierList label="White" mods={active.white} />
      </div>

      <button className="reset-btn" onClick={reset}>New Game</button>

      {draft && !selectingPiece && (
        <DraftPhase
          pickingColor={draft.current}
          options={draft.options[draft.current]}
          activeModifiers={active[draft.current]}
          onPick={handlePick}
        />
      )}
    </div>
  )
}

function ModifierList({ label, mods }) {
  return (
    <div style={{ width: 140, paddingTop: 8 }}>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 8, letterSpacing: 1 }}>{label.toUpperCase()}</div>
      {mods.length === 0
        ? <div style={{ fontSize: 12, color: '#333' }}>No modifiers</div>
        : mods.map((m, i) => (
          <div key={i} style={{
            background: '#1a2a4a',
            border: '1px solid #2a3a6a',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            color: '#8ab',
            marginBottom: 4,
          }}>
            {m.name}
          </div>
        ))
      }
    </div>
  )
}
