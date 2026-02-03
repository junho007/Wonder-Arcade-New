
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackButton } from '../../App';
import { Tile, ChallengeData } from '../../types';
import { Trophy, Share2, ShoppingBag, RefreshCcw, RotateCcw, Clock } from 'lucide-react';

const GRID_SIZE = 4;
const MAX_UNDO = 2;

const Wonder2048: React.FC<{ onBack: () => void, challenge: ChallengeData | null, onToast: (m: string) => void, onMall: () => void }> = ({ onBack, challenge, onToast, onMall }) => {
  const [grid, setGrid] = useState<(Tile | null)[]>(new Array(GRID_SIZE * GRID_SIZE).fill(null));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem('wonder2048-best')) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [history, setHistory] = useState<{ grid: (Tile | null)[]; score: number }[]>([]);
  const [hasBeatenChallenge, setHasBeatenChallenge] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const nextId = useRef(0);
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  const playMergeSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio Context blocked or unsupported");
    }
  }, []);

  const createTile = (row: number, col: number, value: number): Tile => ({
    id: nextId.current++,
    row,
    col,
    value,
  });

  const addRandomTile = useCallback((currentGrid: (Tile | null)[]) => {
    const emptyIndices = currentGrid
      .map((tile, idx) => (tile === null ? idx : null))
      .filter((idx): idx is number => idx !== null);

    if (emptyIndices.length === 0) return currentGrid;

    const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const newGrid = [...currentGrid];
    const row = Math.floor(randomIndex / GRID_SIZE);
    const col = randomIndex % GRID_SIZE;
    newGrid[randomIndex] = createTile(row, col, Math.random() < 0.9 ? 2 : 4);
    return newGrid;
  }, []);

  const initializeGame = useCallback(() => {
    let newGrid = new Array(GRID_SIZE * GRID_SIZE).fill(null);
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setSeconds(0);
    setHistory([]);
    setGameOver(false);
    setHasBeatenChallenge(false);
    setGameStarted(true);
  }, [addRandomTile]);

  useEffect(() => {
    if (!gameStarted) {
      initializeGame();
    }
  }, [initializeGame, gameStarted]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('wonder2048-best', score.toString());
    }
    if (challenge && score > challenge.score && !hasBeatenChallenge) {
      setHasBeatenChallenge(true);
    }
  }, [score, bestScore, challenge, hasBeatenChallenge]);

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    setGrid((prevGrid) => {
      let moved = false;
      const newGrid = [...prevGrid];
      let newScoreValue = score;
      let mergedThisMove = false;

      const isVertical = direction === 'up' || direction === 'down';
      const isReverse = direction === 'right' || direction === 'down';

      for (let i = 0; i < GRID_SIZE; i++) {
        const line: (Tile | null)[] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
          const idx = isVertical ? (j * GRID_SIZE + i) : (i * GRID_SIZE + j);
          line.push(prevGrid[idx]);
        }

        if (isReverse) line.reverse();
        const filtered = line.filter((t): t is Tile => t !== null);
        const newLine: (Tile | null)[] = [];

        for (let k = 0; k < filtered.length; k++) {
          if (k < filtered.length - 1 && filtered[k].value === filtered[k + 1].value) {
            const mergedVal = filtered[k].value * 2;
            newScoreValue += mergedVal;
            const mergedTile = createTile(0, 0, mergedVal);
            newLine.push(mergedTile);
            k++;
            moved = true;
            mergedThisMove = true;
          } else {
            newLine.push({ ...filtered[k] });
          }
        }

        while (newLine.length < GRID_SIZE) newLine.push(null);
        if (isReverse) newLine.reverse();

        for (let j = 0; j < GRID_SIZE; j++) {
          const idx = isVertical ? (j * GRID_SIZE + i) : (i * GRID_SIZE + j);
          const tile = newLine[j];
          if (tile) {
            tile.row = Math.floor(idx / GRID_SIZE);
            tile.col = idx % GRID_SIZE;
          }
          if (!moved && (
            (prevGrid[idx] === null && tile !== null) ||
            (prevGrid[idx] !== null && tile === null) ||
            (prevGrid[idx]?.value !== tile?.value)
          )) moved = true;
          newGrid[idx] = tile;
        }
      }

      if (moved) {
        setHistory(h => {
          const nextHist = [...h, { grid: JSON.parse(JSON.stringify(prevGrid)), score: score }];
          if (nextHist.length > MAX_UNDO) return nextHist.slice(1);
          return nextHist;
        });

        if (mergedThisMove) playMergeSound();
        
        setScore(newScoreValue);
        const finalGrid = addRandomTile(newGrid);
        
        const hasMoves = finalGrid.some((tile, idx) => {
          if (tile === null) return true;
          const col = idx % GRID_SIZE;
          const neighbors = [idx - GRID_SIZE, idx + GRID_SIZE, col > 0 ? idx - 1 : -1, col < 3 ? idx + 1 : -1];
          return neighbors.some(n => n >= 0 && n < 16 && (finalGrid[n] === null || finalGrid[n]?.value === tile.value));
        });
        if (!hasMoves) setGameOver(true);
        return finalGrid;
      }
      return prevGrid;
    });
  }, [gameOver, score, addRandomTile, playMergeSound]);

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setGrid(last.grid);
    setScore(last.score);
    setHistory(h => h.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowUp': move('up'); break;
        case 'ArrowDown': move('down'); break;
        case 'ArrowLeft': move('left'); break;
        case 'ArrowRight': move('right'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const formatTime = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleChallenge = () => {
    const playerName = prompt("Enter your name:", "Gamer") || "Gamer";
    const shareUrl = `${window.location.origin}${window.location.pathname}?mode=challenge&user=${encodeURIComponent(playerName)}&score=${score}`;
    navigator.clipboard.writeText(shareUrl).then(() => { onToast("Link Copied!"); });
  };

  const handleTouchStart = (e: React.TouchEvent) => touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  };

  const getTileStyles = (value: number) => {
    const base = "absolute w-full h-full flex items-center justify-center text-3xl font-bold rounded-lg transition-all duration-100 ease-in-out font-mono ";
    if (value === 2) return base + "bg-[#2A2A2A] text-white";
    if (value === 4) return base + "bg-[#444444] text-white";
    if (value === 8) return base + "bg-white text-black";
    if (value === 16) return base + "bg-[#FDF5D6] text-black";
    if (value === 32) return base + "bg-[#D4AF37] text-black";
    if (value === 64) return base + "bg-[#E7CD78] text-black";
    if (value >= 128 && value < 2048) return base + "bg-[#E7CD78] text-black gold-glow scale-105";
    if (value >= 2048) return base + "animate-gradient-x bg-gradient-to-r from-[#E7CD78] via-[#FDF5D6] to-[#E7CD78] text-black gold-glow scale-110";
    return base + "bg-zinc-800";
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-6 select-none touch-none pt-24 pb-20" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <BackButton onClick={onBack} />
      
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-full flex flex-col md:flex-row justify-between items-center md:items-end mb-8 gap-4">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter leading-none">WONDER 2048</h2>
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mt-1 font-bold">Deluxe Tier Edition</p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <div className="flex gap-2">
              <ScoreBox label="SCORE" value={score.toString()} />
              <ScoreBox label="BEST" value={bestScore.toString()} />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 min-w-[100px] text-center flex items-center justify-center gap-2">
              <Clock size={12} className="text-[#E7CD78]" />
              <span className="text-white font-mono text-sm font-bold">{formatTime(seconds)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8 w-full">
          <button 
            onClick={undo} 
            disabled={history.length === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border transition-all font-inter font-bold text-[11px] ${
              history.length > 0 ? 'bg-zinc-900 border-[#E7CD78]/40 text-[#E7CD78] hover:bg-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-700 opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={14} /> Undo ({history.length})
          </button>
          <button 
            onClick={initializeGame}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black rounded-xl font-inter font-bold text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RefreshCcw size={14} /> New Game
          </button>
        </div>

        <div className="relative bg-[#1a1a1a] p-3 rounded-xl gold-border shadow-2xl w-full aspect-square max-h-[85vw] md:max-h-none">
          <div className="grid grid-cols-4 grid-rows-4 gap-3 w-full h-full">
            {Array.from({ length: 16 }).map((_, i) => <div key={i} className="bg-zinc-900 rounded-lg" />)}
          </div>
          <div className="absolute inset-3 pointer-events-none">
            {grid.map((tile) => tile && (
              <div key={tile.id} style={{ width: 'calc(25% - 9px)', height: 'calc(25% - 9px)', top: `${tile.row * 25}%`, left: `${tile.col * 25}%` }} className="absolute transition-all duration-100 p-1">
                <div className={getTileStyles(tile.value)}>{tile.value}</div>
              </div>
            ))}
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-sm animate-in fade-in duration-500 px-6 text-center">
              <h3 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase tracking-tighter">Simulation Ended</h3>
              <p className="text-[#E7CD78] text-xl font-mono mb-2 tracking-widest">Score: {score}</p>
              <p className="text-zinc-500 text-sm font-mono mb-8 tracking-widest">Time: {formatTime(seconds)}</p>
              
              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <button onClick={initializeGame} className="w-full py-4 bg-white text-black font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-all text-sm">
                  <RefreshCcw size={16} /> Re-Link System
                </button>
                <button onClick={onMall} className="w-full py-4 bg-[#E7CD78] text-black font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl text-sm">
                  <ShoppingBag size={16} /> Visit WonderMall
                </button>
                <button onClick={handleChallenge} className="w-full py-3 bg-zinc-900 text-zinc-500 border border-zinc-800 font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:border-zinc-700 transition-all text-[11px]">
                  <Share2 size={14} /> Send Challenge
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Added bottom whitespace for better balance */}
        <div className="h-20 sm:h-32 w-full" />
      </div>
    </div>
  );
};

const ScoreBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 min-w-[80px] text-center">
    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">{label}</div>
    <div className="text-white font-mono text-lg font-bold leading-none">{value}</div>
  </div>
);

export default Wonder2048;
