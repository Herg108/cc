// --- helpers ---

function getMovePath(move) {
  const { fromR, fromC, toR, toC } = move
  const dr = toR - fromR, dc = toC - fromC
  if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2)) return [[fromR, fromC], [toR, toC]] // knight jump
  const path = [[fromR, fromC]]
  const sr = Math.sign(dr), sc = Math.sign(dc)
  let r = fromR + sr, c = fromC + sc
  while (r !== toR || c !== toC) { path.push([r, c]); r += sr; c += sc }
  path.push([toR, toC])
  return path
}

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
    if (d?.portal1 && d?.portal2) pairs.push({ pair: [d.portal1, d.portal2], color })
  }
  return pairs
}

// Follow portal chain from (fromR, fromC), modifying squares in place.
// Returns array of all positions visited (each hop), or null if no teleport occurred.
function applyPortalChain(squares, gameState, fromR, fromC) {
  const pairs = getAllPortalPairs(gameState)
  if (pairs.length === 0) return null

  let r = fromR, c = fromC
  const visited = new Set([`${r},${c}`])
  const positions = []

  while (true) {
    const piece = squares[r][c]
    if (!piece) break

    // Prefer the pair whose color owns the portal on the current square (first-placed wins)
    const ownerColor = (gameState.boardEffects || []).find(e => e.type === 'portal' && e.r === r && e.c === c)?.owner
    const sorted = [...pairs].sort((a, b) =>
      (a.color === ownerColor ? -1 : 1) - (b.color === ownerColor ? -1 : 1)
    )

    let teleported = false
    for (const { pair: [[p1r, p1c], [p2r, p2c]] } of sorted) {
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
      positions.push({ r, c })
      teleported = true
      break
    }
    if (!teleported) break
  }

  return positions.length > 0 ? positions : null
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

    getSelectionPrompt() {
      return 'Click on one of your pieces to plant the bomb'
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
          ...(gameState.boardEffects || []),
          ...explosionEffects,
        ],
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
        ? 'Place the second portal on any empty square'
        : 'Place the first portal on any empty square'
    },

    handleActivationClick(gameState, r, c, color) {
      const key = `portal_${color}`
      const d = gameState.modifierData[key]

      if (gameState.squares[r][c]) return null // must be empty

      const existingPortals = getAllPortalSquares(gameState)
      const isExistingPortal = existingPortals.some(([pr, pc]) => pr === r && pc === c)

      if (!d.portal1) {
        // First portal: if on existing portal, don't add a new effect (will update it when portal2 is placed)
        return {
          gameState: {
            ...gameState,
            modifierData: { ...gameState.modifierData, [key]: { ...d, portal1: [r, c], portal1OnExisting: isExistingPortal } },
            boardEffects: isExistingPortal
              ? (gameState.boardEffects || []).map(e =>
                  e.type === 'portal' && e.r === r && e.c === c ? { ...e, label: '○' } : e
                )
              : [...(gameState.boardEffects || []), { r, c, type: 'portal', owner: color, label: '○' }],
          },
          done: false,
        }
      }

      if (r === d.portal1[0] && c === d.portal1[1]) return null // same as first portal

      // If portal1 landed on an existing portal, portal2 must be a fresh square
      if (d.portal1OnExisting && isExistingPortal) return null

      // Update portal1's label to arrow pointing toward portal2, add portal2 with arrow toward portal1
      const [p1r, p1c] = d.portal1
      const updatedEffects = d.portal1OnExisting
        // portal1 is on an existing portal: leave its arrow unchanged, it already shows the correct exit
        ? (gameState.boardEffects || [])
        : (gameState.boardEffects || []).map(e =>
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
          boardEffects: isExistingPortal
            // portal2 is on an existing portal: mark it as ○ to show it's a relay point
            ? updatedEffects.map(e =>
                e.type === 'portal' && e.r === r && e.c === c
                  ? { ...e, label: '○' }
                  : e
              )
            : [...updatedEffects, { r, c, type: 'portal', owner: color, label: portalArrow(r, c, p1r, p1c) }],
        },
        done: true,
      }
    },

    // Block sliding pieces from passing through any portal square
    modifyMoves(moves, piece, r, c, gameState) {
      if (!['rook', 'bishop', 'queen', 'pawn'].includes(piece.type)) return moves
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
      const positions = applyPortalChain(squares, gameState, move.toR, move.toC)
      return positions ? { ...gameState, squares } : gameState
    },

    // Movement phase: teleport the piece and report final position + hop path
    onMovePieces(gameState, move) {
      // If the piece stepped onto fire at the portal, it dies there — no teleport
      const piece = gameState.squares[move.toR][move.toC]
      const boardEffects = gameState.boardEffects || []
      if (piece && !piece.ignition && boardEffects.some(e => e.type === 'fire' && e.owner !== piece.color && e.r === move.toR && e.c === move.toC)) {
        return null
      }

      const squares = gameState.squares.map(row => [...row])
      const positions = applyPortalChain(squares, gameState, move.toR, move.toC)
      if (!positions) return null
      const finalPos = positions[positions.length - 1]
      return {
        gameState: { ...gameState, squares },
        moveUpdate: { finalR: finalPos.r, finalC: finalPos.c, portalPositions: positions },
      }
    },

    // Effects phase: add fire at every portal hop if the teleported piece is ignited
    onAfterMove(gameState, move) {
      if (!move.portalPositions) return gameState

      const exitPiece = gameState.squares[move.finalR][move.finalC]
      if (!exitPiece?.ignition) return gameState

      let boardEffects = gameState.boardEffects || []
      let changed = false
      for (const { r, c } of move.portalPositions) {
        if (!boardEffects.some(e => e.type === 'fire' && e.r === r && e.c === c)) {
          boardEffects = [...boardEffects, { r, c, type: 'fire', owner: exitPiece.ignition.owner }]
          changed = true
        }
      }
      return changed ? { ...gameState, boardEffects } : gameState
    },
  },

  {
    id: 'ignition',
    name: 'Ignition',
    description: 'Set one of your pieces on fire. Its square is always burning. When it moves, every square along its path catches fire for one turn and any opponent piece that steps on fire is destroyed.',
    selectMode: 'piece',
    globalEffect: true,

    modifyMoves(moves, piece, r, c, gameState) {
      if (!['rook', 'bishop', 'queen', 'pawn'].includes(piece.type)) return moves
      if (piece.ignition) return moves  // ignited piece is immune to fire blocking
      const fires = (gameState.boardEffects || []).filter(e => e.type === 'fire' && e.owner !== piece.color)
      if (fires.length === 0) return moves
      const fireSet = new Set(fires.map(e => `${e.r},${e.c}`))

      return moves.filter(([toR, toC]) => {
        const dr = Math.sign(toR - r)
        const dc = Math.sign(toC - c)
        let sr = r + dr, sc = c + dc
        while (sr !== toR || sc !== toC) {
          if (fireSet.has(`${sr},${sc}`)) return false
          sr += dr; sc += dc
        }
        return true
      })
    },

    onActivate(gameState, color) {
      return {
        ...gameState,
        modifierData: {
          ...gameState.modifierData,
          [`ignition_${color}`]: { awaitingSelection: true },
        },
      }
    },

    getSelectionPrompt() {
      return 'Click on one of your pieces to ignite it'
    },

    handleActivationClick(gameState, r, c, color) {
      const piece = gameState.squares[r][c]
      if (!piece || piece.color !== color) return null

      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      squares[r][c] = { ...piece, ignition: { owner: color } }

      return {
        gameState: {
          ...gameState,
          squares,
          modifierData: { ...gameState.modifierData, [`ignition_${color}`]: { awaitingSelection: false } },
          boardEffects: [...(gameState.boardEffects || []), { r, c, type: 'fire', owner: color }],
        },
        done: true,
      }
    },

    onAfterMove(gameState, move, color) {
      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      let boardEffects = [...(gameState.boardEffects || [])]
      let changed = false

      // If this color's ignition piece moved, add fire trail
      if (move.color === color && move.piece?.ignition?.owner === color) {
        for (const [r, c] of getMovePath(move)) {
          if (!boardEffects.some(e => e.type === 'fire' && e.owner === color && e.r === r && e.c === c)) {
            boardEffects.push({ r, c, type: 'fire', owner: color })
            changed = true
          }
        }
      }

      // Kill opponent piece if it ended up on this color's fire (finalR/finalC accounts for portal)
      const finalR = move.finalR ?? move.toR
      const finalC = move.finalC ?? move.toC
      const fireAtDest = boardEffects.some(e => e.type === 'fire' && e.owner === color && e.r === finalR && e.c === finalC)
      const destPiece = squares[finalR][finalC]
      if (fireAtDest && destPiece && destPiece.color !== color && !destPiece.ignition) {
        squares[finalR][finalC] = null
        changed = true
      }

      return changed ? { ...gameState, squares, boardEffects } : gameState
    },

    onTurnStart(gameState, color) {
      // Clear this color's fire trail, then re-add fire at the ignition piece's current position
      let boardEffects = (gameState.boardEffects || []).filter(e => !(e.type === 'fire' && e.owner === color))

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = gameState.squares[r][c]
          if (p?.ignition?.owner === color) {
            boardEffects = [...boardEffects, { r, c, type: 'fire', owner: color }]
          }
        }
      }

      return { ...gameState, boardEffects }
    },
  },
]

export function getModifierById(id) {
  return ALL_MODIFIERS.find(m => m.id === id) ?? null
}

export function getRandomModifiers(count, excludeIds = []) {
  const pool = ALL_MODIFIERS.filter(m => !excludeIds.includes(m.id))
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}
