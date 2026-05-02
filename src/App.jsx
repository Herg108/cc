import { useState } from 'react'
import { createInitialBoard } from './game/initialBoard'
import { applyMove, isInCheck, isCheckmate } from './game/validator'
import { getRandomModifiers } from './game/modifiers'
import Board from './components/Board'
import DraftPhase from './components/DraftPhase'

const DRAFT_EVERY = 3

export default function App() {
  const [game, setGame] = useState(() => createInitialBoard())
  const [active, setActive] = useState({ white: [], black: [] })
  const [draft, setDraft] = useState(null)

  const opponent = game.turn === 'white' ? 'black' : 'white'
  const ownMods = active[game.turn]
  const attackerMods = active[opponent]

  const mated = isCheckmate(game, game.turn, ownMods, attackerMods)
  const check = !mated && isInCheck(game, game.turn, attackerMods)

  function handleMove(fromR, fromC, toR, toC) {
    const next = applyMove(game, fromR, fromC, toR, toC)
    setGame(next)

    if (next.moveCount % DRAFT_EVERY === 0) {
      const whiteOpts = getRandomModifiers(3, active.white.map(m => m.id))
      const blackOpts = getRandomModifiers(3, active.black.map(m => m.id))
      if (whiteOpts.length > 0 || blackOpts.length > 0) {
        setDraft({ current: 'white', options: { white: whiteOpts, black: blackOpts }, whitePick: null })
      }
    }
  }

  function handlePick(mod) {
    if (draft.current === 'white') {
      if (draft.options.black.length > 0) {
        setDraft(prev => ({ ...prev, current: 'black', whitePick: mod }))
      } else {
        setActive(prev => ({ ...prev, white: [...prev.white, mod] }))
        setDraft(null)
      }
    } else {
      setActive(prev => ({
        white: draft.whitePick ? [...prev.white, draft.whitePick] : prev.white,
        black: [...prev.black, mod],
      }))
      setDraft(null)
    }
  }

  function reset() {
    setGame(createInitialBoard())
    setActive({ white: [], black: [] })
    setDraft(null)
  }

  let status = `${game.turn === 'white' ? 'White' : 'Black'} to move`
  if (check) status = `${game.turn === 'white' ? 'White' : 'Black'} is in check`
  if (mated) status = `${game.turn === 'white' ? 'Black' : 'White'} wins!`

  return (
    <div className="app">
      <h1>Chess</h1>
      <div className="status">{status}</div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <ModifierList label="Black" mods={active.black} />
        <Board
          gameState={game}
          onMove={handleMove}
          disabled={mated || !!draft}
          ownModifiers={ownMods}
          attackerModifiers={attackerMods}
        />
        <ModifierList label="White" mods={active.white} />
      </div>

      <button className="reset-btn" onClick={reset}>New Game</button>

      {draft && (
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
