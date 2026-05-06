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
      if (dest?.invincible && dest.color !== piece.color) break // invincible enemy blocks exit

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
          explosionEffects.push({ r: nr, c: nc, type: 'explosion' })
          const p = squares[nr][nc]
          if (!p) continue
          if (p.invincible) {
            // Invincible piece survives; if it's the bomber, consume the bomb
            if (nr === explodeR && nc === explodeC) {
              const { bomb, ...rest } = p
              squares[nr][nc] = rest
            }
          } else {
            squares[nr][nc] = null
          }
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
      if (!['rook', 'bishop', 'queen', 'pawn', 'king'].includes(piece.type)) return moves
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
      if (piece && !piece.ignition && !piece.invincible && boardEffects.some(e => e.type === 'fire' && e.owner !== piece.color && e.r === move.toR && e.c === move.toC)) {
        return null
      }

      const squares = gameState.squares.map(row => [...row])
      const positions = applyPortalChain(squares, gameState, move.toR, move.toC)
      if (!positions) return null
      const finalPos = positions[positions.length - 1]

      // Explicitly preserve modifier properties on the teleported piece
      const exitPiece = squares[finalPos.r][finalPos.c]
      if (exitPiece && exitPiece.color === move.piece.color) {
        squares[finalPos.r][finalPos.c] = { ...move.piece, type: exitPiece.type }
      }

      // Promote pawn if it reached the back rank via portal
      if (squares[finalPos.r][finalPos.c]?.type === 'pawn' && (finalPos.r === 0 || finalPos.r === 7)) {
        squares[finalPos.r][finalPos.c] = { ...squares[finalPos.r][finalPos.c], type: 'queen' }
      }

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
        if (!boardEffects.some(e => e.type === 'fire' && e.owner === exitPiece.ignition.owner && e.r === r && e.c === c)) {
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
      const finalR = move.finalR ?? move.toR
      const finalC = move.finalC ?? move.toC

      if (move.color === color && move.piece?.ignition?.owner === color) {
        // Add fire along full path including start square
        const path = getMovePath(move)
        for (const [r, c] of path) {
          if (!boardEffects.some(e => e.type === 'fire' && e.owner === color && e.r === r && e.c === c)) {
            boardEffects.push({ r, c, type: 'fire', owner: color })
            changed = true
          }
        }

        // Kill any non-invincible, non-ignited piece on trail fire (e.g. rook during castling)
        for (const [r, c] of path) {
          if (r === finalR && c === finalC) continue // skip the ignited piece itself
          const p = squares[r][c]
          if (p && !p.invincible && !p.ignition &&
              boardEffects.some(e => e.type === 'fire' && e.owner === color && e.r === r && e.c === c)) {
            squares[r][c] = null
            changed = true
          }
        }
      }

      // Castling with ignited rook: move fire from rook's old square to new square
      if (move.color === color && move.piece?.type === 'king' && Math.abs(move.toC - move.fromC) === 2) {
        const row = move.fromR
        const rookOldC = move.toC > move.fromC ? 7 : 0
        const rookNewC = move.toC > move.fromC ? move.toC - 1 : move.toC + 1
        const rook = squares[row][rookNewC]
        if (rook?.ignition?.owner === color) {
          if (!boardEffects.some(e => e.type === 'fire' && e.owner === color && e.r === row && e.c === rookNewC)) {
            boardEffects.push({ r: row, c: rookNewC, type: 'fire', owner: color })
            changed = true
          }
        }
      }

      // Kill opponent piece if it landed on this color's fire (finalR/finalC accounts for portal)
      const fireAtDest = boardEffects.some(e => e.type === 'fire' && e.owner === color && e.r === finalR && e.c === finalC)
      const destPiece = squares[finalR][finalC]
      if (fireAtDest && destPiece && destPiece.color !== color && !destPiece.ignition && !destPiece.invincible) {
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

  {
    id: 'invincibility',
    name: 'Invincibility',
    description: 'Choose one of your pieces to become invincible for 3 of your moves. It cannot be captured or killed by any effect.',
    selectMode: 'piece',
    globalEffect: true,

    onActivate(gameState, color) {
      return {
        ...gameState,
        modifierData: {
          ...gameState.modifierData,
          [`invincibility_${color}`]: { awaitingSelection: true },
        },
      }
    },

    getSelectionPrompt() {
      return 'Click on one of your pieces to make it invincible'
    },

    handleActivationClick(gameState, r, c, color) {
      const piece = gameState.squares[r][c]
      if (!piece || piece.color !== color) return null

      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      squares[r][c] = { ...piece, invincible: { owner: color, movesLeft: 3 } }

      return {
        gameState: {
          ...gameState,
          squares,
          modifierData: { ...gameState.modifierData, [`invincibility_${color}`]: { awaitingSelection: false } },
        },
        done: true,
      }
    },

    modifyMoves(moves, piece, r, c, gameState) {
      const blocked = new Set()
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const p = gameState.squares[row][col]
          if (p?.invincible && p.color !== piece.color) blocked.add(`${row},${col}`)
        }
      }
      if (blocked.size === 0) return moves
      return moves.filter(([toR, toC]) => !blocked.has(`${toR},${toC}`))
    },

    onAfterMove(gameState, move, color) {
      if (move.color !== color) return gameState

      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      let changed = false

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = squares[r][c]
          if (!p?.invincible || p.invincible.owner !== color) continue
          const movesLeft = p.invincible.movesLeft - 1
          if (movesLeft <= 0) {
            const { invincible, ...rest } = p
            squares[r][c] = rest
          } else {
            squares[r][c] = { ...p, invincible: { ...p.invincible, movesLeft } }
          }
          changed = true
        }
      }

      return changed ? { ...gameState, squares } : gameState
    },
  },

  {
    id: 'boomerang',
    name: 'Boomerang',
    description: 'Choose a piece. It alternates between normal moves and boomerang moves. On a boomerang move, it travels to the target then snaps back home.',
    selectMode: 'piece',

    onActivate(gameState, color) {
      return {
        ...gameState,
        modifierData: {
          ...gameState.modifierData,
          [`boomerang_${color}`]: { awaitingSelection: true },
        },
      }
    },

    getSelectionPrompt() {
      return 'Click on one of your pieces to give it the boomerang'
    },

    handleActivationClick(gameState, r, c, color) {
      const piece = gameState.squares[r][c]
      if (!piece || piece.color !== color) return null

      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      squares[r][c] = { ...piece, boomerang: { owner: color, isBoomerang: true } }

      return {
        gameState: {
          ...gameState,
          squares,
          modifierData: { ...gameState.modifierData, [`boomerang_${color}`]: { awaitingSelection: false } },
        },
        done: true,
      }
    },

    // Runs after all onMovePieces (e.g. portals) have resolved the final position
    onLateMovePieces(gameState, move) {
      if (!move.piece?.boomerang?.isBoomerang) return null
      const curR = move.finalR ?? move.toR
      const curC = move.finalC ?? move.toC
      if (curR === move.fromR && curC === move.fromC) return null

      // If the piece landed on enemy fire after following portals, it dies — don't snap back
      const piece = gameState.squares[curR][curC]
      const boardEffects = gameState.boardEffects || []
      if (piece && !piece.ignition && !piece.invincible &&
          boardEffects.some(e => e.type === 'fire' && e.owner !== piece.color && e.r === curR && e.c === curC)) {
        const squares = gameState.squares.map(row => [...row])
        squares[curR][curC] = null
        return {
          gameState: { ...gameState, squares },
          moveUpdate: { finalR: curR, finalC: curC },
        }
      }

      const squares = gameState.squares.map(row => [...row])
      squares[move.fromR][move.fromC] = squares[curR][curC]
      squares[curR][curC] = null
      return {
        gameState: { ...gameState, squares },
        moveUpdate: { finalR: move.fromR, finalC: move.fromC },
      }
    },

    // Runs after portal's applyDuringSimulation has resolved teleports
    applyLateSimulation(gameState, move) {
      if (!move.piece?.boomerang?.isBoomerang) return gameState
      const curR = move.finalR ?? move.toR
      const curC = move.finalC ?? move.toC
      if (curR === move.fromR && curC === move.fromC) return gameState
      const squares = gameState.squares.map(row => [...row])
      squares[move.fromR][move.fromC] = squares[curR][curC]
      squares[curR][curC] = null
      return { ...gameState, squares }
    },

    onAfterMove(gameState, move, color) {
      if (move.color !== color || !move.piece?.boomerang) return gameState
      const finalR = move.finalR ?? move.toR
      const finalC = move.finalC ?? move.toC
      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      const p = squares[finalR][finalC]
      if (!p?.boomerang) return gameState
      squares[finalR][finalC] = { ...p, boomerang: { ...p.boomerang, isBoomerang: !p.boomerang.isBoomerang } }
      return { ...gameState, squares }
    },
  },

  {
    id: 'wraparound',
    name: 'Wraparound',
    description: 'Choose a piece. It can move off the left or right edge of the board and emerge from the opposite side.',
    selectMode: 'piece',

    onActivate(gameState, color) {
      return {
        ...gameState,
        modifierData: { ...gameState.modifierData, [`wraparound_${color}`]: { awaitingSelection: true } },
      }
    },

    getSelectionPrompt() {
      return 'Click on one of your pieces to give it wraparound movement'
    },

    handleActivationClick(gameState, r, c, color) {
      const piece = gameState.squares[r][c]
      if (!piece || piece.color !== color) return null
      const squares = gameState.squares.map(row => row.map(p => p ? { ...p } : null))
      squares[r][c] = { ...piece, wraparound: { owner: color } }
      return {
        gameState: {
          ...gameState,
          squares,
          modifierData: { ...gameState.modifierData, [`wraparound_${color}`]: { awaitingSelection: false } },
        },
        done: true,
      }
    },

    modifyMoves(moves, piece, r, c, gameState) {
      if (!piece.wraparound) return moves
      const { squares } = gameState

      if (['rook', 'bishop', 'queen'].includes(piece.type)) {
        const dirs = {
          rook:   [[-1,0],[1,0],[0,-1],[0,1]],
          bishop: [[-1,-1],[-1,1],[1,-1],[1,1]],
          queen:  [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]],
        }[piece.type]
        const extra = []
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc
          let traveled = 0
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (squares[nr][nc]) { nr = -1; break }
            traveled++
            nr += dr; nc += dc
          }
          if (nr === -1) continue
          // Only wrap if the column (not the row) exited the board
          if (nr < 0 || nr >= 8) continue
          nc = ((nc % 8) + 8) % 8
          // Continue in the same direction, wrapping only the column
          while (nr >= 0 && nr < 8 && (nr !== r || nc !== c)) {
            const target = squares[nr][nc]
            if (target) {
              if (target.color !== piece.color) extra.push([nr, nc])
              break
            }
            extra.push([nr, nc])
            nr += dr
            nc = ((nc + dc) % 8 + 8) % 8
          }
        }
        return [...moves, ...extra]
      }

      if (piece.type === 'knight') {
        const extra = []
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          const nr = r + dr, nc = c + dc
          if (nr < 0 || nr >= 8) continue // no top/bottom wrap
          if (nc >= 0 && nc < 8) continue // normal move, already in base moves
          const wrappedC = ((nc % 8) + 8) % 8
          if (!squares[nr][wrappedC] || squares[nr][wrappedC].color !== piece.color) {
            extra.push([nr, wrappedC])
          }
        }
        return [...moves, ...extra]
      }

      if (piece.type === 'pawn') {
        const dir = piece.color === 'white' ? -1 : 1
        const extra = []
        for (const dc of [-1, 1]) {
          if (c + dc < 0 || c + dc > 7) {
            const nr = r + dir
            const nc = ((c + dc) % 8 + 8) % 8
            if (nr >= 0 && nr < 8) {
              const target = squares[nr][nc]
              if (target && target.color !== piece.color) extra.push([nr, nc])
            }
          }
        }
        return [...moves, ...extra]
      }

      if (piece.type === 'king') {
        const extra = []
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const rawR = r + dr, rawC = c + dc
            if (rawR >= 0 && rawR < 8 && rawC >= 0 && rawC < 8) continue
            if (rawR < 0 || rawR >= 8) continue // no top/bottom wrap
            const nc = ((rawC % 8) + 8) % 8
            if (!squares[rawR][nc] || squares[rawR][nc].color !== piece.color) extra.push([rawR, nc])
          }
        }
        return [...moves, ...extra]
      }

      return moves
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
