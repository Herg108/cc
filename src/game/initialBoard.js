const p = (type, color) => ({ type, color })

export function createInitialBoard() {
  return {
    squares: [
      [p('rook','black'), p('knight','black'), p('bishop','black'), p('queen','black'), p('king','black'), p('bishop','black'), p('knight','black'), p('rook','black')],
      [p('pawn','black'), p('pawn','black'), p('pawn','black'), p('pawn','black'), p('pawn','black'), p('pawn','black'), p('pawn','black'), p('pawn','black')],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [p('pawn','white'), p('pawn','white'), p('pawn','white'), p('pawn','white'), p('pawn','white'), p('pawn','white'), p('pawn','white'), p('pawn','white')],
      [p('rook','white'), p('knight','white'), p('bishop','white'), p('queen','white'), p('king','white'), p('bishop','white'), p('knight','white'), p('rook','white')],
    ],
    turn: 'white',
    enPassant: null,
    castling: {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true },
    },
    moveCount: 0,
  }
}
