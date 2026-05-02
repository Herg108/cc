// --- helpers ---

function portalArrow(fromR, fromC, toR, toC) {
  const dr = Math.sign(toR - fromR), dc = Math.sign(toC - fromC)
  return ({ '-1,-1':'↖','-1,0':'↑','-1,1':'↗','0,-1':'←','0,1':'→','1,-1':'↙','1,0':'↓','1,1':'↘' })[`${dr},${dc}`] ?? '·'
}

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

// Follow portal chain from (fromR, fromC), modifying squares in place.
// Returns true if the piece moved, false otherwise.
function applyPortalChain(squares, gameState, fromR, fromC) {
  const pairs = getAllPortalPairs(gameState)
  if (pairs.length === 0) return false

  let r = fromR, c = fromC
  const visited = new Set([`${r},${c}`])
  let moved = false

  while (true) {
    const piece = squares[r][c]
    if (!piece) break

    // Prefer pairs where the current square is the entry (portal1) so chains go forward
    const sorted = [...pairs].sort(([p1a], [p1b]) =>
      (p1a[0] === r && p1a[1] === c ? -1 : 1) - (p1b[0] === r && p1b[1] === c ? -1 : 1)
    )

    let teleported = false
    for (const [[p1r, p1c], [p2r, p2c]] of sorted) {
      let destR, destC
      if (r === p1r && c === p1c) { destR = p2r; destC = p2c }
      else if (r === p2r && c === p2c) { destR = p1r; destC = p1c }
      else continue

      const key = `${destR},${destC}`
      if (visited.has(key)) continue
      const dest = squares[destR][destC]
      if (dest?.color === piece.color) break // friendly blocking exit

      squares[destR][destC] = piece
      squares[r][c] = null
      visited.add(key)
      r = destR; c = destC
      teleported = true
      moved = true
      break
    }
    if (!teleported) break
  }

  return moved
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

      const existingPortals = getAllPortalSquares(gameState)
      const isExistingPortal = existingPortals.some(([pr, pc]) => pr === r && pc === c)

      if (!d.portal1) {
        // First portal: placeholder label until partner is placed
        return {
          gameState: {
            ...gameState,
            modifierData: { ...gameState.modifierData, [key]: { ...d, portal1: [r, c], portal1OnExisting: isExistingPortal } },
            boardEffects: [...(gameState.boardEffects || []), { r, c, type: 'portal', owner: color, label: '○' }],
          },
          done: false,
        }
      }

      if (r === d.portal1[0] && c === d.portal1[1]) return null // same as first portal

      // If portal1 landed on an existing portal, portal2 must be a fresh square
      if (d.portal1OnExisting && isExistingPortal) return null

      // Update portal1's label to arrow pointing toward portal2, add portal2 with arrow toward portal1
      const [p1r, p1c] = d.portal1
      const updatedEffects = (gameState.boardEffects || []).map(e =>
        e.type === 'portal' && e.owner === color && e.r === p1r && e.c === p1c && e.label === '○'
          ? { ...e, label: portalArrow(p1r, p1c, r, c) }
          : e
      )
      return {
        gameState: {
          ...gameState,
          modifierData: {
            ...gameState.modifierData,
            [key]: { awaitingSelection: false, portal1: d.portal1, portal2: [r, c] },
          },
          boardEffects: [...updatedEffects, { r, c, type: 'portal', owner: color, label: portalArrow(r, c, p1r, p1c) }],
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
      const squares = gameState.squares.map(row => [...row])
      const moved = applyPortalChain(squares, gameState, move.toR, move.toC)
      return moved ? { ...gameState, squares } : gameState
    },

    // Teleport any piece that lands on a portal, chaining through connected portals
    onAfterMove(gameState, move) {
      const squares = gameState.squares.map(row => [...row])
      const moved = applyPortalChain(squares, gameState, move.toR, move.toC)
      return moved ? { ...gameState, squares } : gameState
    },
  },
]

export function getRandomModifiers(count, excludeIds = []) {
  const pool = ALL_MODIFIERS.filter(m => !excludeIds.includes(m.id))
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}
