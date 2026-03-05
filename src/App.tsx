import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'motion/react';
import { Users, RotateCcw, CheckCircle2, AlertCircle, Palette } from 'lucide-react';
import { GameRoom, Color } from './types';
import { COLOR_GRID } from './constants';

const socket: Socket = io();

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    socket.on('connect', () => {
      setConnectionError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection Error:', err);
      setConnectionError('Unable to connect to game server. If you are on Render, make sure your Web Service is active.');
    });

    socket.on('room-update', (updatedRoom: GameRoom) => {
      setRoom(updatedRoom);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('room-update');
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName && roomId) {
      socket.emit('join-room', { roomId, playerName });
      setIsJoined(true);
    }
  };

  const handlePickColor = (color: Color) => {
    if (room && room.gameState === 'picking' && socket.id === room.players[room.cueGiverIndex].id) {
      socket.emit('pick-color', { roomId: room.id, color });
    }
  };

  const handleGuessColor = (color: Color) => {
    if (room && room.gameState === 'guessing' && socket.id !== room.players[room.cueGiverIndex].id) {
      socket.emit('guess-color', { roomId: room.id, color });
    }
  };

  const handleNextRound = () => {
    if (room) {
      socket.emit('next-round', { roomId: room.id });
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
              <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
              <p className="text-sm text-black/60 mb-6 leading-relaxed">
                {connectionError}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-black text-white py-3 rounded-xl font-bold"
              >
                Try Again
              </button>
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

  const isCueGiver = socket.id === room.players[room.cueGiverIndex]?.id;

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
                    {p.id === socket.id ? 'You' : 'Opponent'}
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-700">Target was:</span>
                            <div 
                              className="w-6 h-6 rounded-md border border-black/10" 
                              style={{ backgroundColor: room.targetColor?.hex }}
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">Round Score</p>
                            <p className="text-xl font-black text-emerald-900">
                              +{room.guesses.filter(g => {
                                if (!room.targetColor) return false;
                                return Math.abs(room.targetColor.row - g.row) <= 1 && Math.abs(room.targetColor.col - g.col) <= 1;
                              }).length}
                            </p>
                          </div>
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
                        {room.gameState === 'results' && (() => {
                          if (!room.targetColor) return null;
                          const targetRow = room.targetColor.row;
                          const targetCol = room.targetColor.col;
                          const guessRow = g.row;
                          const guessCol = g.col;
                          const isCorrect = Math.abs(targetRow - guessRow) <= 1 && Math.abs(targetCol - guessCol) <= 1;
                          
                          return isCorrect ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <AlertCircle size={16} className="text-black/20" />
                          );
                        })()}
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
                    
                    // Show target to Cue Giver during guessing, or to everyone during results
                    const showTargetIndicator = isTarget && (room.gameState === 'results' || (room.gameState === 'guessing' && isCueGiver));
                    
                    // Highlight the 3x3 "win zone"
                    const isInWinZone = (() => {
                      if (!room.targetColor) return false;
                      const targetRow = room.targetColor.row;
                      const targetCol = room.targetColor.col;
                      const currentRow = color.row;
                      const currentCol = color.col;
                      return Math.abs(targetRow - currentRow) <= 1 && Math.abs(targetCol - currentCol) <= 1;
                    })();

                    const showWinZone = isInWinZone && (room.gameState === 'results' || (room.gameState === 'guessing' && isCueGiver));
                    
                    const borderClasses = (() => {
                      if (!showWinZone || !room.targetColor) return '';
                      const targetRow = room.targetColor.row;
                      const targetCol = room.targetColor.col;
                      const currentRow = color.row;
                      const currentCol = color.col;
                      
                      let classes = 'after:absolute after:inset-0 after:pointer-events-none ';
                      if (targetRow - currentRow === 1) classes += 'after:border-t-2 ';
                      if (targetRow - currentRow === -1) classes += 'after:border-b-2 ';
                      if (targetCol - currentCol === 1) classes += 'after:border-l-2 ';
                      if (targetCol - currentCol === -1) classes += 'after:border-r-2 ';
                      
                      return classes + 'after:border-white after:border-solid';
                    })();

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
                          ${borderClasses}
                        `}
                        style={{ backgroundColor: color.hex }}
                      >
                        {showWinZone && !isTarget && (
                          <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                        )}
                        {showTargetIndicator && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className={`rounded-full shadow-sm ${room.gameState === 'results' ? 'w-1.5 h-1.5 bg-black' : 'w-1 h-1 bg-black/40'}`} />
                          </div>
                        )}
                        {isGuess && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2 h-2 rounded-full bg-white shadow-sm border border-black/20" />
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
