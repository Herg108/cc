import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getLegalMoves, isInCheck, isCheckmate, getWinner } from './game/validator'
import { getModifierById } from './game/modifiers'
import Board from './components/Board'
import DraftPhase from './components/DraftPhase'
import Lobby from './components/Lobby'

const socket = io()

function reconstructDraft(draft) {
  if (!draft) return null
  return {
    ...draft,
    options: {
      white: draft.options.white.map(getModifierById).filter(Boolean),
      black: draft.options.black.map(getModifierById).filter(Boolean),
    },
    whitePick: null,
    selectingPiece: draft.selectingPiece
      ? { ...draft.selectingPiece, mod: getModifierById(draft.selectingPiece.modId) }
      : null,
  }
}

export default function App() {
  const [playerColor, setPlayerColor] = useState(null)
  const [gameCode, setGameCode] = useState(null)
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [disconnected, setDisconnected] = useState(false)

  const [game, setGame] = useState(null)
  const [active, setActive] = useState({ white: [], black: [] })
  const [draft, setDraft] = useState(null)
  const [customWinner, setCustomWinner] = useState(null)
  const [movesMadeThisTurn, setMovesMadeThisTurn] = useState(0)

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGame(state.game)
      setActive({
        white: state.activeIds.white.map(getModifierById).filter(Boolean),
        black: state.activeIds.black.map(getModifierById).filter(Boolean),
      })
      setDraft(reconstructDraft(state.draft))
      setCustomWinner(state.customWinner)
      setMovesMadeThisTurn(state.movesMadeThisTurn)
    })

    socket.on('opponent_joined', () => setOpponentConnected(true))
    socket.on('opponent_disconnected', () => setDisconnected(true))

    return () => {
      socket.off('game_state')
      socket.off('opponent_joined')
      socket.off('opponent_disconnected')
    }
  }, [])

  function handleJoined(color, code) {
    setPlayerColor(color)
    setGameCode(code)
    if (color === 'black') setOpponentConnected(true)
  }

  if (!playerColor) {
    return <Lobby socket={socket} onJoined={handleJoined} />
  }

  if (!opponentConnected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1510', color: '#a89070', gap: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 8, color: '#f0e8d8' }}>{gameCode}</div>
        <div style={{ fontSize: 14, color: '#6a5a48' }}>Waiting for opponent...</div>
      </div>
    )
  }

  if (!game) return null

  if (disconnected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1510', color: '#8a7060' }}>
        Opponent disconnected
      </div>
    )
  }

  const opponent = game.turn === 'white' ? 'black' : 'white'
  const ownMods = [...active[game.turn], ...active[opponent].filter(m => m.globalEffect)]
  const attackerMods = [...active[opponent], ...active[game.turn].filter(m => m.globalEffect)]

  const kingGone = getWinner(game)
  const mated = !customWinner && !kingGone && isCheckmate(game, game.turn, ownMods, attackerMods)
  const check = !mated && !customWinner && !kingGone && isInCheck(game, game.turn, attackerMods)
  const winner = customWinner || kingGone || (mated ? opponent : null)

  const selectingPiece = draft?.selectingPiece ?? null
  const isMySelecting = selectingPiece?.color === playerColor
  const activationSelectMode = isMySelecting
    ? { selectMode: selectingPiece.mod?.selectMode, color: selectingPiece.color }
    : null

  const isMyTurn = game.turn === playerColor
  const boardDisabled = !isMyTurn || !!winner || (!!draft && !selectingPiece) || (!!selectingPiece && !isMySelecting)

  function handleMove(fromR, fromC, toR, toC) {
    socket.emit('make_move', { fromR, fromC, toR, toC })
  }

  function handlePick(mod) {
    socket.emit('draft_pick', { modId: mod.id })
  }

  function handleActivationClick(r, c) {
    socket.emit('activation_click', { r, c })
  }

  function reset() {
    socket.emit('reset_game')
  }

  let status = `${game.turn === 'white' ? 'White' : 'Black'} to move`
  if (draft && !selectingPiece) {
    status = draft.current === playerColor
      ? 'Pick a modifier'
      : 'Opponent is picking a modifier...'
  }
  if (selectingPiece) {
    status = isMySelecting
      ? (selectingPiece.mod?.getSelectionPrompt?.(game, selectingPiece.color) ?? 'Click to select')
      : 'Opponent is applying modifier...'
  }
  if (check) status = `${game.turn === 'white' ? 'White' : 'Black'} is in check`
  if (winner) status = `${winner === 'white' ? 'White' : 'Black'} wins!`

  const showDraft = draft && !selectingPiece && draft.current === playerColor

  return (
    <div className="app">
      <h1>Chaos Chess</h1>
      <div className="status">{status}</div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <ModifierList label={playerColor} mods={active[playerColor]} side="left" />
        <Board
          gameState={game}
          onMove={handleMove}
          disabled={boardDisabled}
          ownModifiers={ownMods}
          attackerModifiers={attackerMods}
          activationSelectMode={activationSelectMode}
          onActivationClick={handleActivationClick}
          flipped={playerColor === 'black'}
        />
        <ModifierList label={playerColor === 'white' ? 'black' : 'white'} mods={active[playerColor === 'white' ? 'black' : 'white']} side="right" />
      </div>

      <button className="reset-btn" onClick={reset}>New Game</button>

      {showDraft && (
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

function ModifierList({ label, mods, side = 'left' }) {
  const [tooltip, setTooltip] = useState(null)

  return (
    <div style={{ width: 140, paddingTop: 8 }}>
      <div style={{ fontSize: 12, color: '#6a5a48', marginBottom: 8, letterSpacing: 1 }}>{label.toUpperCase()}</div>
      {mods.length === 0
        ? <div style={{ fontSize: 12, color: '#3d3028' }}>No modifiers</div>
        : mods.map((m, i) => (
          <div
            key={i}
            onMouseEnter={() => setTooltip(i)}
            onMouseLeave={() => setTooltip(null)}
            style={{
              position: 'relative',
              background: '#261e18',
              border: '1px solid #3d3028',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 11,
              color: '#d4a040',
              marginBottom: 4,
              cursor: 'help',
            }}
          >
            {m.name}
            {tooltip === i && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: side === 'right' ? 'auto' : '100%',
                right: side === 'right' ? '100%' : 'auto',
                marginLeft: side === 'right' ? 0 : 8,
                marginRight: side === 'right' ? 8 : 0,
                background: '#1a1208',
                border: '1px solid #3d3028',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 12,
                color: '#c8b090',
                lineHeight: 1.5,
                width: 200,
                zIndex: 50,
                pointerEvents: 'none',
              }}>
                <div style={{ fontWeight: 700, color: '#f0e8d8', marginBottom: 4 }}>{m.name}</div>
                {m.description}
              </div>
            )}
          </div>
        ))
      }
    </div>
  )
}
