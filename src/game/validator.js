const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8

function getPawnMoves(gameState, r, c) {
  const { squares, enPassant } = gameState
  const piece = squares[r][c]
  const dir = piece.color === 'white' ? -1 : 1
  const startRow = piece.color === 'white' ? 6 : 1
  const moves = []

  if (inBounds(r + dir, c) && !squares[r + dir][c]) {
    moves.push([r + dir, c])
    if (r === startRow && !squares[r + 2 * dir][c]) {
      moves.push([r + 2 * dir, c])
    }
  }

  for (const dc of [-1, 1]) {
    const nr = r + dir, nc = c + dc
    if (!inBounds(nr, nc)) continue
    const target = squares[nr][nc]
    if (target && target.color !== piece.color) moves.push([nr, nc])
    if (enPassant && enPassant[0] === nr && enPassant[1] === nc) moves.push([nr, nc])
  }

  return moves
}

function getKnightMoves(squares, r, c, color) {
  return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([nr, nc]) => inBounds(nr, nc) && (!squares[nr][nc] || squares[nr][nc].color !== color))
}

function getSlidingMoves(squares, r, c, color, directions) {
  const moves = []
  for (const [dr, dc] of directions) {
    let nr = r + dr, nc = c + dc
    while (inBounds(nr, nc)) {
      const target = squares[nr][nc]
      if (target) {
        if (target.color !== color) moves.push([nr, nc])
        break
      }
      moves.push([nr, nc])
      nr += dr
      nc += dc
    }
  }
  return moves
}

function getKingMoves(gameState, r, c) {
  const { squares, castling } = gameState
  const piece = squares[r][c]
  const color = piece.color
  const moves = []

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr, nc = c + dc
      if (inBounds(nr, nc) && (!squares[nr][nc] || squares[nr][nc].color !== color)) {
        moves.push([nr, nc])
      }
    }
  }

  const row = color === 'white' ? 7 : 0
  if (r !== row || c !== 4) return moves

  if (castling[color].kingSide && !squares[row][5] && !squares[row][6]) {
    moves.push([row, 6])
  }
  if (castling[color].queenSide && !squares[row][3] && !squares[row][2] && !squares[row][1]) {
    moves.push([row, 2])
  }

  return moves
}

function getCandidateMoves(gameState, r, c) {
  const { squares } = gameState
  const piece = squares[r][c]
  switch (piece.type) {
    case 'pawn':   return getPawnMoves(gameState, r, c)
    case 'knight': return getKnightMoves(squares, r, c, piece.color)
    case 'bishop': return getSlidingMoves(squares, r, c, piece.color, [[-1,-1],[-1,1],[1,-1],[1,1]])
    case 'rook':   return getSlidingMoves(squares, r, c, piece.color, [[-1,0],[1,0],[0,-1],[0,1]])
    case 'queen':  return getSlidingMoves(squares, r, c, piece.color, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]])
    case 'king':   return getKingMoves(gameState, r, c)
    default:       return []
  }
}

// Checks if `color`'s king is in check, accounting for the attacker's modifiers
export function isInCheck(gameState, color, attackerModifiers = []) {
  const { squares } = gameState
  const enemy = color === 'white' ? 'black' : 'white'

  let kingR, kingC
  outer: for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (squares[r][c]?.type === 'king' && squares[r][c]?.color === color) {
        kingR = r; kingC = c; break outer
      }
    }
  }
  if (kingR === undefined) return false
  if ((squares[kingR][kingC]?.invincible?.movesLeft ?? 0) > 1) return false

  // At movesLeft === 1, detect threats by stripping invincibility so modifyMoves
  // doesn't block enemies from "seeing" the king's square during threat detection.
  // Capture is still prevented separately via modifyMoves on the actual move list.
  let threatState = gameState
  if (squares[kingR][kingC]?.invincible) {
    const newSquares = squares.map(row => [...row])
    const { invincible, ...rest } = newSquares[kingR][kingC]
    newSquares[kingR][kingC] = rest
    threatState = { ...gameState, squares: newSquares }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = threatState.squares[r][c]
      if (!piece || piece.color !== enemy) continue

      let moves = getCandidateMoves(threatState, r, c)
      for (const mod of attackerModifiers) {
        if (mod.modifyMoves) moves = mod.modifyMoves(moves, piece, r, c, threatState)
      }

      if (moves.some(([mr, mc]) => mr === kingR && mc === kingC)) return true
    }
  }
  return false
}

function simulateMove(gameState, fromR, fromC, toR, toC) {
  const squares = gameState.squares.map(row => [...row])
  const piece = squares[fromR][fromC]

  if (piece.type === 'pawn' && toC !== fromC && !squares[toR][toC]) {
    squares[fromR][toC] = null
  }

  if (piece.type === 'king' && Math.abs(toC - fromC) === 2) {
    if (toC === 6) { squares[fromR][5] = squares[fromR][7]; squares[fromR][7] = null }
    else           { squares[fromR][3] = squares[fromR][0]; squares[fromR][0] = null }
  }

  squares[toR][toC] = piece
  squares[fromR][fromC] = null

  if (piece.type === 'pawn' && (toR === 0 || toR === 7)) {
    squares[toR][toC] = { type: 'queen', color: piece.color }
  }

  return { ...gameState, squares }
}

// ownModifiers: the moving player's modifiers (expand their moves)
// attackerModifiers: the opponent's modifiers (used to detect check after the move)
export function getLegalMoves(gameState, fromR, fromC, ownModifiers = [], attackerModifiers = []) {
  const piece = gameState.squares[fromR][fromC]
  if (!piece) return []

  let candidates = getCandidateMoves(gameState, fromR, fromC)

  for (const mod of ownModifiers) {
    if (mod.modifyMoves) candidates = mod.modifyMoves(candidates, piece, fromR, fromC, gameState)
  }

  const seen = new Set()
  candidates = candidates.filter(([r, c]) => {
    const key = r * 8 + c
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Deduplicate mods so globalEffect mods don't run twice
  const simMods = [...new Map([...ownModifiers, ...attackerModifiers].map(m => [m.id, m])).values()]

  return candidates.filter(([toR, toC]) => {
    let simState = simulateMove(gameState, fromR, fromC, toR, toC)
    const move = { fromR, fromC, toR, toC, piece, color: piece.color }
    for (const mod of simMods) {
      if (mod.applyDuringSimulation) simState = mod.applyDuringSimulation(simState, move) ?? simState
    }
    return !isInCheck(simState, piece.color, attackerModifiers)
  })
}

export function applyMove(gameState, fromR, fromC, toR, toC) {
  const piece = gameState.squares[fromR][fromC]
  const captured = gameState.squares[toR][toC]
  const next = simulateMove(gameState, fromR, fromC, toR, toC)

  let enPassant = null
  if (piece.type === 'pawn' && Math.abs(toR - fromR) === 2) {
    enPassant = [(fromR + toR) / 2, fromC]
  }

  const castling = {
    white: { ...gameState.castling.white },
    black: { ...gameState.castling.black },
  }
  if (piece.type === 'king') {
    castling[piece.color].kingSide = false
    castling[piece.color].queenSide = false
  }
  if (piece.type === 'rook') {
    if (fromC === 7) castling[piece.color].kingSide = false
    if (fromC === 0) castling[piece.color].queenSide = false
  }
  if (captured?.type === 'rook') {
    if (toC === 7) castling[captured.color].kingSide = false
    if (toC === 0) castling[captured.color].queenSide = false
  }

  return {
    ...next,
    turn: piece.color === 'white' ? 'black' : 'white',
    enPassant,
    castling,
    moveCount: gameState.moveCount + 1,
  }
}

export function isCheckmate(gameState, color, ownModifiers = [], attackerModifiers = []) {
  if (!isInCheck(gameState, color, attackerModifiers)) return false
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (gameState.squares[r][c]?.color === color) {
        if (getLegalMoves(gameState, r, c, ownModifiers, attackerModifiers).length > 0) return false
      }
    }
  }
  return true
}

export function getWinner(gameState) {
  let whiteKing = false, blackKing = false
  for (const row of gameState.squares) {
    for (const p of row) {
      if (p?.type === 'king') {
        if (p.color === 'white') whiteKing = true
        else blackKing = true
      }
    }
  }
  if (!blackKing) return 'white'
  if (!whiteKing) return 'black'
  return null
}
