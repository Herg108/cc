const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8

const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
const DIAG_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]]

export const ALL_MODIFIERS = [
  {
    id: 'backwards_pawns',
    name: 'Backwards March',
    description: 'Your pawns can also move backward one square.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'pawn') return moves
      const dir = piece.color === 'white' ? 1 : -1
      const extra = []
      if (inBounds(r + dir, c) && !squares[r + dir][c]) extra.push([r + dir, c])
      return [...moves, ...extra]
    },
  },
  {
    id: 'knighted_bishops',
    name: 'Knighted Bishops',
    description: 'Your bishops can also jump like knights.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'bishop') return moves
      const extra = KNIGHT_OFFSETS
        .map(([dr, dc]) => [r + dr, c + dc])
        .filter(([nr, nc]) => inBounds(nr, nc) && (!squares[nr][nc] || squares[nr][nc].color !== piece.color))
      return [...moves, ...extra]
    },
  },
  {
    id: 'pawn_strike',
    name: 'Forward Strike',
    description: 'Your pawns can also capture directly forward.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'pawn') return moves
      const dir = piece.color === 'white' ? -1 : 1
      const nr = r + dir
      if (inBounds(nr, c) && squares[nr][c] && squares[nr][c].color !== piece.color) {
        return [...moves, [nr, c]]
      }
      return moves
    },
  },
  {
    id: 'royal_range',
    name: 'Royal Range',
    description: 'Your king can move up to 2 squares in any direction.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'king') return moves
      const extra = []
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) continue
          const nr = r + dr, nc = c + dc
          if (inBounds(nr, nc) && (!squares[nr][nc] || squares[nr][nc].color !== piece.color)) {
            extra.push([nr, nc])
          }
        }
      }
      return [...moves, ...extra]
    },
  },
  {
    id: 'diagonal_rooks',
    name: 'Diagonal Rooks',
    description: 'Your rooks can also slide diagonally.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'rook') return moves
      const extra = []
      for (const [dr, dc] of DIAG_DIRS) {
        let nr = r + dr, nc = c + dc
        while (inBounds(nr, nc)) {
          const target = squares[nr][nc]
          if (target) { if (target.color !== piece.color) extra.push([nr, nc]); break }
          extra.push([nr, nc])
          nr += dr; nc += dc
        }
      }
      return [...moves, ...extra]
    },
  },
  {
    id: 'knight_step',
    name: 'Steady Knights',
    description: 'Your knights can also step one square in any direction.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'knight') return moves
      const extra = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr, nc = c + dc
          if (inBounds(nr, nc) && (!squares[nr][nc] || squares[nr][nc].color !== piece.color)) {
            extra.push([nr, nc])
          }
        }
      }
      return [...moves, ...extra]
    },
  },
  {
    id: 'surging_pawns',
    name: 'Surging Pawns',
    description: 'Your pawns can always advance 2 squares forward, not just from the start.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'pawn') return moves
      const dir = piece.color === 'white' ? -1 : 1
      const r1 = r + dir, r2 = r + 2 * dir
      if (inBounds(r1, c) && !squares[r1][c] && inBounds(r2, c) && !squares[r2][c]) {
        if (!moves.some(([mr, mc]) => mr === r2 && mc === c)) {
          return [...moves, [r2, c]]
        }
      }
      return moves
    },
  },
  {
    id: 'queens_leap',
    name: "Queen's Leap",
    description: 'Your queen can also jump like a knight.',
    modifyMoves(moves, piece, r, c, { squares }) {
      if (piece.type !== 'queen') return moves
      const extra = KNIGHT_OFFSETS
        .map(([dr, dc]) => [r + dr, c + dc])
        .filter(([nr, nc]) => inBounds(nr, nc) && (!squares[nr][nc] || squares[nr][nc].color !== piece.color))
      return [...moves, ...extra]
    },
  },
]

export function getRandomModifiers(count, excludeIds = []) {
  const pool = ALL_MODIFIERS.filter(m => !excludeIds.includes(m.id))
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}
