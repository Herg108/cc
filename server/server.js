import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import path from 'path'
import { createInitialBoard } from '../src/game/initialBoard.js'
import { applyMove, isInCheck, isCheckmate, getWinner } from '../src/game/validator.js'
import { ALL_MODIFIERS, getRandomModifiers } from '../src/game/modifiers.js'

const DRAFT_EVERY = 7

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../dist/index.html')))
}

// rooms: { [code]: roomState }
const rooms = {}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do { code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }
  while (rooms[code])
  return code
}

function getModById(id) {
  return ALL_MODIFIERS.find(m => m.id === id) ?? null
}

function reconstructMods(ids) {
  return ids.map(getModById).filter(Boolean)
}

function runHook(mod, hook, gameState, ...args) {
  if (!mod[hook]) return gameState
  return mod[hook](gameState, ...args) ?? gameState
}

function applyAllHooks(hook, gameState, activeIds, ...args) {
  let next = gameState
  for (const color of ['white', 'black']) {
    for (const mod of reconstructMods(activeIds[color])) {
      next = runHook(mod, hook, next, ...args, color)
    }
  }
  return next
}

function applyColorHooks(hook, gameState, activeIds, color, ...args) {
  let next = gameState
  for (const mod of reconstructMods(activeIds[color])) {
    next = runHook(mod, hook, next, color, ...args)
  }
  return next
}

function checkCustomWin(gameState, activeIds) {
  for (const mod of [...reconstructMods(activeIds.white), ...reconstructMods(activeIds.black)]) {
    const w = mod.checkWin?.(gameState)
    if (w) return w
  }
  return null
}

function buildOwnMods(activeIds, turn) {
  const opponent = turn === 'white' ? 'black' : 'white'
  return [
    ...reconstructMods(activeIds[turn]),
    ...reconstructMods(activeIds[opponent]).filter(m => m.globalEffect),
  ]
}

function buildAttackerMods(activeIds, turn) {
  const opponent = turn === 'white' ? 'black' : 'white'
  return [
    ...reconstructMods(activeIds[opponent]),
    ...reconstructMods(activeIds[turn]).filter(m => m.globalEffect),
  ]
}

function stateForColor(room, color) {
  const opponentColor = color === 'white' ? 'black' : 'white'
  const game = {
    ...room.game,
    boardEffects: (room.game.boardEffects || []).filter(e => !(e.type === 'mine' && e.owner === opponentColor)),
  }
  return { game, activeIds: room.activeIds, draft: room.draft, customWinner: room.customWinner, movesMadeThisTurn: room.movesMadeThisTurn }
}

function broadcastState(room) {
  if (room.players.white) io.to(room.players.white).emit('game_state', stateForColor(room, 'white'))
  if (room.players.black) io.to(room.players.black).emit('game_state', stateForColor(room, 'black'))
}

function initRoom(code, whiteSocketId) {
  return {
    code,
    game: createInitialBoard(),
    activeIds: { white: [], black: [] },
    draft: null,
    movesMadeThisTurn: 0,
    customWinner: null,
    players: { white: whiteSocketId, black: null },
  }
}

io.on('connection', (socket) => {

  socket.on('create_game', (_, cb) => {
    const code = generateCode()
    const room = initRoom(code, socket.id)
    rooms[code] = room
    socket.join(code)
    cb?.({ code, color: 'white' })
  })

  socket.on('join_game', (code, cb) => {
    const room = rooms[code?.toUpperCase()]
    if (!room) return cb?.({ error: 'Game not found' })
    if (room.players.white === socket.id) return cb?.({ error: 'Cannot join your own game' })
    if (room.players.black) return cb?.({ error: 'Game is full' })

    room.players.black = socket.id
    socket.join(room.code)
    cb?.({ color: 'black' })

    // Tell white their opponent joined
    io.to(room.players.white).emit('opponent_joined')

    broadcastState(room)
  })

  socket.on('make_move', ({ fromR, fromC, toR, toC }) => {
    const room = getRoomForSocket(socket.id)
    if (!room || room.customWinner) return

    const playerColor = getPlayerColor(room, socket.id)
    if (!playerColor || room.game.turn !== playerColor) return

    const { game, activeIds } = room
    const piece = game.squares[fromR][fromC]
    if (!piece || piece.color !== playerColor) return

    const capturedPiece = game.squares[toR][toC]
    const move = { fromR, fromC, toR, toC, piece, color: piece.color, capturedPiece }

    let next = applyMove(game, fromR, fromC, toR, toC)

    // Phase 1a: movement hooks — resolve final piece positions (e.g. portal teleportation)
    let moveUpdate = {}
    for (const color of ['white', 'black']) {
      for (const mod of reconstructMods(activeIds[color])) {
        if (!mod.onMovePieces) continue
        const result = mod.onMovePieces(next, { ...move, ...moveUpdate })
        if (result) {
          next = result.gameState
          if (result.moveUpdate) moveUpdate = { ...moveUpdate, ...result.moveUpdate }
        }
      }
    }

    // Phase 1b: late movement hooks — snap-back after portals have resolved (e.g. boomerang)
    for (const color of ['white', 'black']) {
      for (const mod of reconstructMods(activeIds[color])) {
        if (!mod.onLateMovePieces) continue
        const result = mod.onLateMovePieces(next, { ...move, ...moveUpdate })
        if (result) {
          next = result.gameState
          if (result.moveUpdate) moveUpdate = { ...moveUpdate, ...result.moveUpdate }
        }
      }
    }

    const resolvedMove = { ...move, finalR: move.toR, finalC: move.toC, ...moveUpdate }

    // Phase 2: effect hooks — react to final board state
    next = applyAllHooks('onAfterMove', next, activeIds, resolvedMove)

    const w = checkCustomWin(next, activeIds)
    if (w) {
      room.game = next
      room.customWinner = w
      return broadcastState(room)
    }

    const kingGone = getWinner(next)
    if (kingGone) {
      room.game = next
      room.customWinner = kingGone
      return broadcastState(room)
    }

    const ownMods = buildOwnMods(activeIds, piece.color)
    const attackerMods = buildAttackerMods(activeIds, piece.color)
    const opponent = piece.color === 'white' ? 'black' : 'white'

    if (isCheckmate(next, opponent, buildOwnMods(activeIds, opponent), buildAttackerMods(activeIds, opponent))) {
      room.game = next
      room.customWinner = piece.color
      return broadcastState(room)
    }

    const newMovesMade = room.movesMadeThisTurn + 1
    const getsExtra = reconstructMods(activeIds[piece.color]).some(mod =>
      mod.grantExtraMove?.(next, newMovesMade, piece.color)
    )

    if (getsExtra) {
      next = { ...next, turn: piece.color }
      room.movesMadeThisTurn = newMovesMade
      room.game = next
      return broadcastState(room)
    }

    room.movesMadeThisTurn = 0
    next = applyColorHooks('onTurnStart', next, activeIds, next.turn)
    room.game = next

    if (next.moveCount % DRAFT_EVERY === 0) {
      const whiteOpts = getRandomModifiers(3, activeIds.white)
      const blackOpts = getRandomModifiers(3, activeIds.black)
      if (whiteOpts.length > 0 || blackOpts.length > 0) {
        const firstPicker = piece.color
        const secondPicker = firstPicker === 'white' ? 'black' : 'white'
        room.draft = {
          current: firstPicker,
          options: { [firstPicker]: (firstPicker === 'white' ? whiteOpts : blackOpts).map(m => m.id), [secondPicker]: (firstPicker === 'white' ? blackOpts : whiteOpts).map(m => m.id) },
          selectingPiece: null,
        }
      }
    }

    broadcastState(room)
  })

  socket.on('draft_pick', ({ modId }) => {
    const room = getRoomForSocket(socket.id)
    if (!room || !room.draft) return

    const playerColor = getPlayerColor(room, socket.id)
    if (!playerColor || room.draft.current !== playerColor) return

    const mod = getModById(modId)
    if (!mod) return

    const nextGame = runHook(mod, 'onActivate', room.game, playerColor)
    if (nextGame !== room.game) room.game = nextGame

    const selectionKey = `${mod.id}_${playerColor}`
    if (room.game.modifierData[selectionKey]?.awaitingSelection) {
      room.draft = { ...room.draft, selectingPiece: { color: playerColor, key: selectionKey, modId } }
      return broadcastState(room)
    }

    advanceDraft(room, mod, playerColor)
    broadcastState(room)
  })

  socket.on('activation_click', ({ r, c }) => {
    const room = getRoomForSocket(socket.id)
    if (!room || !room.draft?.selectingPiece) return

    const { color, modId } = room.draft.selectingPiece
    const playerColor = getPlayerColor(room, socket.id)
    if (playerColor !== color) return

    const mod = getModById(modId)
    if (!mod) return

    const result = mod.handleActivationClick?.(room.game, r, c, color)
    if (!result) return

    room.game = result.gameState

    if (result.done) {
      advanceDraft(room, mod, color)
    }

    broadcastState(room)
  })

  socket.on('reset_game', () => {
    const room = getRoomForSocket(socket.id)
    if (!room) return
    room.game = createInitialBoard()
    room.activeIds = { white: [], black: [] }
    room.draft = null
    room.movesMadeThisTurn = 0
    room.customWinner = null
    broadcastState(room)
  })

  socket.on('disconnect', () => {
    const room = getRoomForSocket(socket.id)
    if (!room) return
    const color = getPlayerColor(room, socket.id)
    const otherSocketId = color === 'white' ? room.players.black : room.players.white
    if (otherSocketId) io.to(otherSocketId).emit('opponent_disconnected')
    // Clean up room after a delay so reconnects can still find it
    setTimeout(() => {
      if (rooms[room.code]) delete rooms[room.code]
    }, 60000)
  })
})

function getRoomForSocket(socketId) {
  return Object.values(rooms).find(r => r.players.white === socketId || r.players.black === socketId)
}

function getPlayerColor(room, socketId) {
  if (room.players.white === socketId) return 'white'
  if (room.players.black === socketId) return 'black'
  return null
}

function advanceDraft(room, mod, color) {
  const { draft } = room
  room.activeIds = { ...room.activeIds, [color]: [...room.activeIds[color], mod.id] }

  const other = color === 'white' ? 'black' : 'white'
  if ((draft.options[other] ?? []).length > 0) {
    // Clear current picker's options so when the other finishes, we don't loop back
    room.draft = { ...draft, current: other, selectingPiece: null, options: { ...draft.options, [color]: [] } }
  } else {
    room.draft = null
  }
}

const PORT = process.env.PORT || 3001
httpServer.listen(PORT)
console.log(`Server running on port ${PORT}`)
