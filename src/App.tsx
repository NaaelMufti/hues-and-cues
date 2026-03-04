import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'motion/react';
import { Users, RotateCcw, CheckCircle2, AlertCircle, Palette } from 'lucide-react';
import { GameRoom, Color, Player } from './types';
import { COLOR_GRID } from './constants';

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || '';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || '';

export default function App() {
  const [playerId] = useState(() => uuidv4());
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const roomRef = useRef<GameRoom | null>(null);
  roomRef.current = room;

  useEffect(() => {
    if (!isJoined || !roomId) return;

    if (!PUSHER_KEY) {
      setConnectionError('Pusher keys are missing. Please configure PUSHER_KEY and PUSHER_CLUSTER in your environment variables.');
      return;
    }

    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind('game-event', (data: { action: string, payload: any, senderId: string }) => {
      const { action, payload, senderId } = data;
      
      // Don't process our own events if we already updated locally (optimistic)
      // but for simplicity here we process everything to ensure sync
      
      setRoom(prev => {
        if (!prev && action !== 'JOIN') return null;
        
        const newRoom = prev ? { ...prev } : {
          id: roomId,
          players: [],
          gameState: 'waiting' as const,
          round: 1,
          scores: {},
          cueGiverIndex: 0,
          targetColor: null,
          guesses: [],
          maxGuesses: 3,
        };

        switch (action) {
          case 'JOIN':
            if (!newRoom.players.find(p => p.id === payload.id)) {
              newRoom.players.push({ id: payload.id, name: payload.name, score: 0 });
              newRoom.scores[payload.id] = 0;
            }
            if (newRoom.players.length === 2 && newRoom.gameState === 'waiting') {
              newRoom.gameState = 'picking';
            }
            // If we are the existing player, send our state to the new player
            if (prev && senderId !== playerId) {
              sendAction('SYNC_STATE', { state: newRoom });
            }
            break;

          case 'SYNC_STATE':
            if (senderId !== playerId) {
              return payload.state;
            }
            break;

          case 'PICK_COLOR':
            newRoom.targetColor = payload.color;
            newRoom.gameState = 'guessing';
            newRoom.guesses = [];
            break;

          case 'GUESS_COLOR':
            newRoom.guesses.push(payload.color);
            const isCorrect = payload.color.id === newRoom.targetColor?.id;
            if (isCorrect || newRoom.guesses.length >= newRoom.maxGuesses) {
              if (isCorrect) {
                newRoom.scores[senderId] = (newRoom.scores[senderId] || 0) + 1;
                const pIndex = newRoom.players.findIndex(p => p.id === senderId);
                if (pIndex !== -1) newRoom.players[pIndex].score = newRoom.scores[senderId];
              }
              newRoom.gameState = 'results';
            }
            break;

          case 'NEXT_ROUND':
            newRoom.cueGiverIndex = (newRoom.cueGiverIndex + 1) % 2;
            newRoom.gameState = 'picking';
            newRoom.targetColor = null;
            newRoom.guesses = [];
            newRoom.round += 1;
            break;
        }

        return newRoom;
      });
    });

    // Initial Join
    sendAction('JOIN', { id: playerId, name: playerName });

    return () => {
      pusher.unsubscribe(`room-${roomId}`);
      pusher.disconnect();
    };
  }, [isJoined, roomId]);

  const sendAction = async (action: string, payload: any) => {
    try {
      await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          action,
          payload: { ...payload, senderId: playerId },
        }),
      });
    } catch (err) {
      console.error('Failed to send action:', err);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName && roomId) {
      setIsJoined(true);
    }
  };

  const handlePickColor = (color: Color) => {
    if (room && room.gameState === 'picking' && playerId === room.players[room.cueGiverIndex].id) {
      sendAction('PICK_COLOR', { color });
    }
  };

  const handleGuessColor = (color: Color) => {
    if (room && room.gameState === 'guessing' && playerId !== room.players[room.cueGiverIndex].id) {
      sendAction('GUESS_COLOR', { color });
    }
  };

  const handleNextRound = () => {
    if (room) {
      sendAction('NEXT_ROUND', {});
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-black/5"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-black rounded-xl">
              <Palette className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Hues & Cues Online</h1>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-black/50 mb-1.5">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-black/50 mb-1.5">Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                placeholder="Enter room ID"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-black/90 transition-all flex items-center justify-center gap-2"
            >
              <Users size={20} />
              Join Game
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {connectionError ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-8 rounded-2xl shadow-xl border border-red-100"
            >
              <AlertCircle className="text-red-500 w-12 h-12 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Configuration Required</h2>
              <p className="text-sm text-black/60 mb-6 leading-relaxed">
                {connectionError}
              </p>
              <a 
                href="https://dashboard.pusher.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-black text-white py-3 rounded-xl font-bold text-center"
              >
                Get Pusher Keys
              </a>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mb-4"></div>
              <div className="text-black/50 font-medium">Connecting to room...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isCueGiver = playerId === room.players[room.cueGiverIndex]?.id;

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black/10 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-black text-white p-2 rounded-lg">
              <Palette size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Hues & Cues</h1>
              <p className="text-xs text-black/50 font-mono uppercase tracking-widest">Room: {room.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              {room.players.map((p) => (
                <div key={p.id} className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold tracking-tighter text-black/40">
                    {p.id === playerId ? 'You' : 'Opponent'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{p.name}</span>
                    <span className="bg-black text-white px-2 py-0.5 rounded text-xs font-mono">{p.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {room.gameState === 'waiting' ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-black/5 shadow-sm">
            <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <Users className="text-black/20" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Waiting for opponent...</h2>
            <p className="text-black/50">Share the Room ID <span className="font-mono font-bold text-black">{room.id}</span> with a friend.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar: Status & Clues */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Game Status</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8F8F7] rounded-2xl border border-black/5">
                    <p className="text-sm font-medium mb-1">
                      {isCueGiver ? "You are the Cue Giver" : `${room.players[room.cueGiverIndex].name} is picking`}
                    </p>
                    <p className="text-xs text-black/50 leading-relaxed">
                      {room.gameState === 'picking' 
                        ? (isCueGiver ? "Select a color from the grid to hide it." : "Wait for them to select a color.")
                        : (isCueGiver ? "Wait for guesses." : `You have ${room.maxGuesses - room.guesses.length} guesses left.`)}
                    </p>
                  </div>

                  {room.gameState === 'guessing' && !isCueGiver && (
                    <div className="flex gap-1">
                      {[...Array(room.maxGuesses)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-2 flex-1 rounded-full ${i < room.guesses.length ? 'bg-black' : 'bg-black/10'}`}
                        />
                      ))}
                    </div>
                  )}

                  {room.gameState === 'results' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-sm font-bold text-emerald-900 mb-1">Round Over!</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-700">Target was:</span>
                          <div 
                            className="w-6 h-6 rounded-md border border-black/10" 
                            style={{ backgroundColor: room.targetColor?.hex }}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleNextRound}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-black/90 transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={18} />
                        Next Round
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Guesses History */}
              {(room.gameState === 'guessing' || room.gameState === 'results') && (
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Guesses</h3>
                  <div className="space-y-3">
                    {room.guesses.length === 0 && (
                      <p className="text-xs text-black/30 italic">No guesses yet...</p>
                    )}
                    {room.guesses.map((g, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-[#F8F8F7] rounded-xl border border-black/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-black/10 shadow-sm" style={{ backgroundColor: g.hex }} />
                          <span className="text-xs font-mono font-bold">Guess {i + 1}</span>
                        </div>
                        {room.targetColor?.id === g.id ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={16} className="text-black/20" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content: Color Grid */}
            <div className="lg:col-span-3">
              <div className="bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight">The Spectrum</h2>
                  <div className="flex items-center gap-2 text-xs font-mono text-black/40">
                    <span className="w-2 h-2 rounded-full bg-black/10" />
                    16 Rows × 30 Columns
                  </div>
                </div>

                <div 
                  className="grid gap-1 select-none"
                  style={{ 
                    gridTemplateColumns: `repeat(30, minmax(0, 1fr))`,
                  }}
                >
                  {COLOR_GRID.map((color) => {
                    const isTarget = room.targetColor?.id === color.id;
                    const isGuess = room.guesses.some(g => g.id === color.id);
                    const canInteract = (room.gameState === 'picking' && isCueGiver) || (room.gameState === 'guessing' && !isCueGiver);
                    
                    return (
                      <motion.div
                        key={color.id}
                        whileHover={canInteract ? { scale: 1.2, zIndex: 10 } : {}}
                        onClick={() => {
                          if (room.gameState === 'picking') handlePickColor(color);
                          if (room.gameState === 'guessing') handleGuessColor(color);
                        }}
                        className={`
                          aspect-square rounded-sm cursor-pointer transition-shadow relative
                          ${canInteract ? 'hover:shadow-lg' : 'cursor-default'}
                          ${isTarget && room.gameState === 'results' ? 'ring-2 ring-black ring-offset-2 z-20' : ''}
                        `}
                        style={{ backgroundColor: color.hex }}
                      >
                        {isGuess && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white shadow-sm border border-black/20" />
                          </div>
                        )}
                        {isTarget && room.gameState === 'results' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-8 pt-6 border-t border-black/5 flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-black/10 border border-black/10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-white border border-black/20 shadow-sm flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-black/20" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Your Guesses</span>
                  </div>
                  {room.gameState === 'results' && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-black ring-2 ring-black ring-offset-1" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Target Color</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
