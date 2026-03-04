export interface Color {
  id: string;
  hex: string;
  row: number;
  col: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: 'waiting' | 'picking' | 'guessing' | 'results';
  round: number;
  scores: Record<string, number>;
  cueGiverIndex: number;
  targetColor: Color | null;
  guesses: Color[];
  maxGuesses: number;
}
