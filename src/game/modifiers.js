const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8

export const ALL_MODIFIERS = [
  {
    id: 'suicide_bomber',
    name: 'Suicide Bomber',
    description: 'Choose one of your pieces to carry a bomb. After 5 of your moves it explodes, destroying all adjacent pieces.',

    onActivate(gameState, color) {
      return {
        ...gameState,
        modifierData: {
          ...gameState.modifierData,
          [`suicide_bomber_${color}`]: { awaitingSelection: true },
        },
      }
    },

    onAfterMove(gameState, move, color) {
      // Only count down on the bomb owner's own moves
      if (move.color !== color) return gameState

      const squares = gameState.squares.map(row =>
        row.map(p => {
          if (!p) return null
          if (!p.bomb) return { ...p }
          return { ...p, bomb: { ...p.bomb } }
        })
      )

      let explodeR = -1, explodeC = -1

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = squares[r][c]
          if (!p?.bomb || p.bomb.owner !== color) continue
          p.bomb.movesLeft -= 1
          if (p.bomb.movesLeft <= 0) { explodeR = r; explodeC = c }
        }
      }

      if (explodeR === -1) return { ...gameState, squares }

      // Explode — remove all pieces in 3x3 radius
      const explosionEffects = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = explodeR + dr, nc = explodeC + dc
          if (!inBounds(nr, nc)) continue
          squares[nr][nc] = null
          explosionEffects.push({ r: nr, c: nc, type: 'explosion' })
        }
      }

      return {
        ...gameState,
        squares,
        boardEffects: [
          ...(gameState.boardEffects || []).filter(e => e.type !== 'explosion'),
          ...explosionEffects,
        ],
      }
    },

    onTurnStart(gameState) {
      // Clear explosion visuals at the start of the next turn
      return {
        ...gameState,
        boardEffects: (gameState.boardEffects || []).filter(e => e.type !== 'explosion'),
      }
    },
  },
]

export function getRandomModifiers(count, excludeIds = []) {
  const pool = ALL_MODIFIERS.filter(m => !excludeIds.includes(m.id))
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}
