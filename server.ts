import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Game State
  const rooms = new Map<string, any>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, playerName }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          players: [],
          gameState: "waiting", // waiting, picking, guessing, results
          round: 1,
          scores: {},
          cueGiverIndex: 0,
          targetColor: null,
          guesses: [],
          maxGuesses: 3,
        });
      }

      const room = rooms.get(roomId);
      
      // Check if player already in room
      const existingPlayer = room.players.find((p: any) => p.id === socket.id);
      if (!existingPlayer && room.players.length < 2) {
        room.players.push({ id: socket.id, name: playerName, score: 0 });
        room.scores[socket.id] = 0;
      }

      io.to(roomId).emit("room-update", room);

      if (room.players.length === 2 && room.gameState === "waiting") {
        room.gameState = "picking";
        io.to(roomId).emit("room-update", room);
      }
    });

    socket.on("pick-color", ({ roomId, color }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const cueGiver = room.players[room.cueGiverIndex];
      if (socket.id !== cueGiver.id) return;

      room.targetColor = color;
      room.gameState = "guessing";
      room.guesses = [];
      io.to(roomId).emit("room-update", room);
    });

    socket.on("guess-color", ({ roomId, color }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const guesserIndex = (room.cueGiverIndex + 1) % 2;
      const guesser = room.players[guesserIndex];
      if (socket.id !== guesser.id) return;

      room.guesses.push(color);

      if (room.guesses.length >= room.maxGuesses) {
        // Calculate total score for all guesses
        let roundScore = 0;
        const targetRow = room.targetColor.row;
        const targetCol = room.targetColor.col;

        room.guesses.forEach((g: any) => {
          const guessRow = g.row;
          const guessCol = g.col;
          const isCorrect = Math.abs(targetRow - guessRow) <= 1 && Math.abs(targetCol - guessCol) <= 1;
          if (isCorrect) {
            roundScore += 1;
          }
        });

        room.scores[socket.id] += roundScore;
        room.players[guesserIndex].score = room.scores[socket.id];
        
        room.gameState = "results";
        io.to(roomId).emit("room-update", room);
      } else {
        io.to(roomId).emit("room-update", room);
      }
    });

    socket.on("next-round", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.cueGiverIndex = (room.cueGiverIndex + 1) % 2;
      room.gameState = "picking";
      room.targetColor = null;
      room.guesses = [];
      room.round += 1;
      io.to(roomId).emit("room-update", room);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
