// --- helpers ---

function getAllPortalSquares(gameState) {
  const squares = []
  for (const color of ['white', 'black']) {
    const d = gameState.modifierData[`portal_${color}`]
    if (d?.portal1) squares.push(d.portal1)
    if (d?.portal2) squares.push(d.portal2)
  }
  return squares
}

function getAllPortalPairs(gameState) {
  const pairs = []
  for (const color of ['white', 'black']) {
    const d = gameState.modifierData[`portal_${color}`]
    if (d?.portal1 && d?.portal2) pairs.push([d.portal1, d.portal2])
  }
  return pairs
}

// --- modifiers ---

export const ALL_MODIFIERS = [
  {
    id: 'suicide_bomber',
    name: 'Suicide Bomber',
    description: 'Choose one of your pieces to carry a bomb. After 5 of your moves it explodes, destroying all adjacent pieces.',
    selectMode: 'piece',

    onActivate(gameState, color) {
      return {
        ...gameState,
        modifierData: {
          ...gameState.modifierData,
          [`suicide_bomber_${color}`]: { awaitingSelection: true },
        },
      }
    },

    getSelectionPrompt(gameState, color) {
      return `${color === 'white' ? 'White' : 'Black'}: click a piece to plant the bomb`
    },

    handleActivationClick(gameState, r, c, color) {
      const piece = gameState.squares[r][c]
      if (!piece || piece.color !== color) return null

      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      squares[r][c] = { ...piece, bomb: { owner: color, movesLeft: 5 } }

      return {
        gameState: {
          ...gameState,
          squares,
          modifierData: { ...gameState.modifierData, [`suicide_bomber_${color}`]: { awaitingSelection: false } },
        },
        done: true,
      }
    },

    onAfterMove(gameState, move, color) {
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

      const explosionEffects = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = explodeR + dr, nc = explodeC + dc
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue
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
      return {
        ...gameState,
        boardEffects: (gameState.boardEffects || []).filter(e => e.type !== 'explosion'),
      }
    },
  },

  {
    id: 'portal',
    name: 'Portal',
    description: 'Place two portals on empty squares. Any piece that steps onto a portal is teleported to the other one.',
    selectMode: 'emptySquare',
    globalEffect: true, // portals block sliding pieces for both players

    onActivate(gameState, color) {
      return {
        ...gameState,
        modifierData: {
          ...gameState.modifierData,
          [`portal_${color}`]: { awaitingSelection: true, portal1: null, portal2: null },
        },
      }
    },

    getSelectionPrompt(gameState, color) {
      const d = gameState.modifierData[`portal_${color}`]
      return d?.portal1
        ? `${color === 'white' ? 'White' : 'Black'}: click a second empty square for the exit portal`
        : `${color === 'white' ? 'White' : 'Black'}: click an empty square for the entry portal`
    },

    handleActivationClick(gameState, r, c, color) {
      const key = `portal_${color}`
      const d = gameState.modifierData[key]

      if (gameState.squares[r][c]) return null // must be empty

      // Can't place on an existing portal square
      const existingPortals = getAllPortalSquares(gameState)
      if (existingPortals.some(([pr, pc]) => pr === r && pc === c)) return null

      if (!d.portal1) {
        return {
          gameState: {
            ...gameState,
            modifierData: { ...gameState.modifierData, [key]: { ...d, portal1: [r, c] } },
            boardEffects: [...(gameState.boardEffects || []), { r, c, type: 'portal', owner: color, label: color === 'white' ? '1' : '2' }],
          },
          done: false,
        }
      }

      if (r === d.portal1[0] && c === d.portal1[1]) return null // same as first portal

      return {
        gameState: {
          ...gameState,
          modifierData: {
            ...gameState.modifierData,
            [key]: { awaitingSelection: false, portal1: d.portal1, portal2: [r, c] },
          },
          boardEffects: [...(gameState.boardEffects || []), { r, c, type: 'portal', owner: color, label: color === 'white' ? '1' : '2' }],
        },
        done: true,
      }
    },

    // Block sliding pieces from passing through any portal square
    modifyMoves(moves, piece, r, c, gameState) {
      if (!['rook', 'bishop', 'queen'].includes(piece.type)) return moves
      const portals = getAllPortalSquares(gameState)
      if (portals.length === 0) return moves

      const portalSet = new Set(portals.map(([pr, pc]) => `${pr},${pc}`))

      return moves.filter(([toR, toC]) => {
        const dr = Math.sign(toR - r)
        const dc = Math.sign(toC - c)
        let sr = r + dr, sc = c + dc
        while (sr !== toR || sc !== toC) {
          if (portalSet.has(`${sr},${sc}`)) return false
          sr += dr; sc += dc
        }
        return true
      })
    },

    // Apply teleportation during check simulation so portal moves aren't incorrectly filtered
    applyDuringSimulation(gameState, move) {
      const pairs = getAllPortalPairs(gameState)
      if (pairs.length === 0) return gameState

      const { toR, toC } = move

      for (const [[p1r, p1c], [p2r, p2c]] of pairs) {
        let destR, destC
        if (toR === p1r && toC === p1c) { destR = p2r; destC = p2c }
        else if (toR === p2r && toC === p2c) { destR = p1r; destC = p1c }
        else continue

        const squares = gameState.squares.map(row => [...row])
        const piece = squares[toR][toC]
        if (!piece) return gameState

        const dest = squares[destR][destC]

        if (dest?.color === piece.color) return gameState

        squares[destR][destC] = piece
        squares[toR][toC] = null

        return { ...gameState, squares }
      }

      return gameState
    },

    // Teleport any piece that lands on a portal
    onAfterMove(gameState, move) {
      const pairs = getAllPortalPairs(gameState)
      if (pairs.length === 0) return gameState

      const { toR, toC } = move

      for (const [[p1r, p1c], [p2r, p2c]] of pairs) {
        let destR, destC
        if (toR === p1r && toC === p1c) { destR = p2r; destC = p2c }
        else if (toR === p2r && toC === p2c) { destR = p1r; destC = p1c }
        else continue

        const squares = gameState.squares.map(row => [...row])
        const piece = squares[toR][toC]
        if (!piece) return gameState // already teleported by the other player's portal

        const dest = squares[destR][destC]

        if (dest?.color === piece.color) return gameState // friendly blocking exit

        squares[destR][destC] = piece
        squares[toR][toC] = null

        return { ...gameState, squares }
      }

      return gameState
    },
  },
]

export function getRandomModifiers(count, excludeIds = []) {
  const pool = ALL_MODIFIERS.filter(m => !excludeIds.includes(m.id))
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}
