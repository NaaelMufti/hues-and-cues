import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Pusher from "pusher";
import dotenv from "dotenv";

dotenv.config();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "",
  useTLS: true,
});

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Stateless Game API
  // In a serverless environment, we don't store 'rooms' in memory.
  // Instead, we broadcast actions, and clients maintain the state, 
  // or we use an external DB. For this demo, we'll broadcast state updates.

  app.post("/api/game/action", async (req, res) => {
    const { roomId, action, payload } = req.body;

    if (!roomId || !action) {
      return res.status(400).json({ error: "Missing roomId or action" });
    }

    // Broadcast the action to everyone in the room via Pusher
    try {
      await pusher.trigger(`room-${roomId}`, `game-event`, {
        action,
        payload,
        senderId: payload.senderId,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Pusher error:", error);
      res.status(500).json({ error: "Failed to broadcast action" });
    }
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
