
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from '../../App';
import { ChallengeData } from '../../types';
import { RefreshCcw, Layers, Trophy, Zap, ShoppingBag } from 'lucide-react';

const BLOCK_HEIGHT = 45;
const CANVAS_WIDTH = 450;
const CANVAS_HEIGHT = 700;
const INITIAL_WIDTH = 260;
const PERFECT_THRESHOLD = 3;

interface Block {
  x: number;
  y: number;
  width: number;
  color: string;
}

interface SlicedPart {
  x: number;
  y: number;
  width: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  opacity: number;
}

const WonderStack: React.FC<{ onBack: () => void, challenge: ChallengeData | null, onToast: (m: string) => void, onMall: () => void }> = ({ onBack, challenge, onToast, onMall }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem('wonderstack-best')) || 0);
  const [combo, setCombo] = useState(0);
  const [perfectMsg, setPerfectMsg] = useState<{ x: number, y: number } | null>(null);

  const blocks = useRef<Block[]>([]);
  const currentBlock = useRef<Block | null>(null);
  const slicedParts = useRef<SlicedPart[]>([]);
  const direction = useRef<1 | -1>(1);
  const speed = useRef(4.5);
  const cameraY = useRef(0);
  const targetCameraY = useRef(0);
  const requestRef = useRef<number | null>(null);

  const playNote = (isPerfect: boolean, comboCount: number) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Musical scale logic: if perfect, pitch goes up. If slice, pitch resets low.
    const baseFreq = isPerfect ? 220 : 110;
    const freq = baseFreq * Math.pow(1.05946, isPerfect ? comboCount * 1.5 : 0);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  };

  const spawnSlice = (x: number, y: number, width: number, dir: number) => {
    slicedParts.current.push({
      x, y, width,
      vx: dir * 3,
      vy: -1,
      rotation: 0,
      vr: (Math.random() - 0.5) * 0.2,
      opacity: 1
    });
  };

  const initializeGame = useCallback(() => {
    const startY = CANVAS_HEIGHT - BLOCK_HEIGHT * 2.5;
    blocks.current = [{
      x: (CANVAS_WIDTH - INITIAL_WIDTH) / 2,
      y: startY + BLOCK_HEIGHT,
      width: INITIAL_WIDTH,
      color: '#E7CD78'
    }];
    currentBlock.current = {
      x: 0,
      y: startY,
      width: INITIAL_WIDTH,
      color: '#E7CD78'
    };
    slicedParts.current = [];
    direction.current = 1;
    speed.current = 4.5;
    cameraY.current = 0;
    targetCameraY.current = 0;
    setScore(0);
    setCombo(0);
    setGameState('playing');
  }, []);

  const handleAction = useCallback(() => {
    if (gameState === 'idle') { initializeGame(); return; }
    if (gameState === 'gameOver' || !currentBlock.current) return;

    const active = currentBlock.current;
    const top = blocks.current[blocks.current.length - 1];
    const diff = active.x - top.x;
    const absDiff = Math.abs(diff);

    if (absDiff >= active.width) {
      setGameState('gameOver');
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem('wonderstack-best', score.toString());
      }
      return;
    }

    let isPerfect = false;
    if (absDiff <= PERFECT_THRESHOLD) {
      active.x = top.x;
      isPerfect = true;
      setCombo(c => c + 1);
      setPerfectMsg({ x: active.x + active.width / 2, y: active.y });
      setTimeout(() => setPerfectMsg(null), 600);
    } else {
      const sliceWidth = absDiff;
      const dir = diff > 0 ? 1 : -1;
      
      if (diff > 0) {
        spawnSlice(active.x + active.width - sliceWidth, active.y, sliceWidth, dir);
        active.width -= sliceWidth;
      } else {
        spawnSlice(active.x, active.y, sliceWidth, dir);
        active.width -= sliceWidth;
        active.x = top.x;
      }
      setCombo(0);
    }

    playNote(isPerfect, combo);
    blocks.current.push({ ...active });
    setScore(s => s + 1);
    speed.current = Math.min(11, 4.5 + (blocks.current.length / 7));

    if (blocks.current.length > 5) {
      targetCameraY.current = (blocks.current.length - 5) * BLOCK_HEIGHT;
    }

    currentBlock.current = {
      x: direction.current === 1 ? -active.width : CANVAS_WIDTH,
      y: active.y - BLOCK_HEIGHT,
      width: active.width,
      color: '#E7CD78'
    };
  }, [gameState, initializeGame, score, bestScore, combo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  const update = useCallback(() => {
    cameraY.current += (targetCameraY.current - cameraY.current) * 0.1;

    if (gameState === 'playing' && currentBlock.current) {
      const b = currentBlock.current;
      b.x += direction.current * speed.current;
      if (b.x + b.width > CANVAS_WIDTH) direction.current = -1;
      else if (b.x < 0) direction.current = 1;
    }

    slicedParts.current.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.25;
      s.rotation += s.vr;
      s.opacity -= 0.02;
    });
    slicedParts.current = slicedParts.current.filter(s => s.opacity > 0);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Cyber Grid Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.strokeStyle = 'rgba(231, 205, 120, 0.05)';
      ctx.lineWidth = 1;
      const scrollOffset = (cameraY.current % 50);
      for (let i = -50; i < CANVAS_HEIGHT + 50; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i + scrollOffset); ctx.lineTo(CANVAS_WIDTH, i + scrollOffset); ctx.stroke();
      }
      for (let i = 0; i < CANVAS_WIDTH; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, cameraY.current);

      // Draw Stacked Blocks
      blocks.current.forEach((b, i) => {
        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BLOCK_HEIGHT);
        grad.addColorStop(0, '#E7CD78');
        grad.addColorStop(0.5, '#B8860B');
        grad.addColorStop(1, '#8B6508');
        ctx.fillStyle = grad;
        ctx.fillRect(b.x, b.y, b.width, BLOCK_HEIGHT - 3);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(b.x, b.y, b.width, 3);
      });

      // Draw Active Block
      if (currentBlock.current && gameState === 'playing') {
        const b = currentBlock.current;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#E7CD78';
        ctx.fillStyle = '#E7CD78';
        ctx.fillRect(b.x, b.y, b.width, BLOCK_HEIGHT - 3);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(b.x, b.y, b.width, 5);
      }

      // Draw Slices
      slicedParts.current.forEach(s => {
        ctx.save();
        ctx.translate(s.x + s.width / 2, s.y + BLOCK_HEIGHT / 2);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-s.width / 2, -BLOCK_HEIGHT / 2, s.width, BLOCK_HEIGHT - 3);
        ctx.restore();
      });

      ctx.restore();
    }
    requestRef.current = requestAnimationFrame(update);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 relative overflow-hidden select-none font-sans pt-24 touch-none" onClick={handleAction}>
      <BackButton onClick={onBack} />

      <div className="absolute top-28 flex flex-col items-center pointer-events-none z-10 w-full">
        <div className="text-white/5 text-[150px] font-black absolute -top-20 leading-none">
          {score.toString().padStart(2, '0')}
        </div>
        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Wonder Stack</h2>
        <div className="flex gap-4">
           <div className="bg-zinc-900/50 px-4 py-1 rounded-full border border-zinc-800">
              <p className="text-[#E7CD78] font-mono text-lg font-bold">LVL {score}</p>
           </div>
           {combo > 1 && (
             <div className="bg-[#E7CD78] px-4 py-1 rounded-full text-black font-black flex items-center gap-1 animate-bounce">
                <Zap size={14} fill="currentColor" /> x{combo}
             </div>
           )}
        </div>
      </div>

      <div className="relative cursor-pointer transition-transform duration-75">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="rounded-[3rem] border-2 border-[#E7CD78]/20 shadow-[0_40px_100px_rgba(0,0,0,1)] bg-black max-w-full h-auto" 
        />

        {perfectMsg && (
          <div 
            className="absolute text-[#E7CD78] font-black text-3xl uppercase tracking-tighter italic animate-out fade-out slide-out-to-top-12 duration-500"
            style={{ left: perfectMsg.x, top: perfectMsg.y - 40, transform: 'translateX(-50%)' }}
          >
            PERFECT!
          </div>
        )}

        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-8 rounded-[3rem] z-20 text-center">
             <Layers size={64} className="text-[#E7CD78] mb-8 animate-pulse" />
             <h3 className="text-3xl font-black text-white mb-2 uppercase italic">Build Protocol</h3>
             <p className="text-zinc-500 text-[11px] uppercase tracking-[0.4em] mb-12 leading-relaxed">
                Reflex Engineering. <br/> Sync blocks to achieve maximum height.
             </p>
             <button onClick={(e) => { e.stopPropagation(); initializeGame(); }} className="px-12 py-4 bg-[#E7CD78] text-black font-inter font-bold rounded-full hover:scale-110 transition-transform shadow-2xl">
                Initiate Build
             </button>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 rounded-[3rem] z-20 animate-in fade-in duration-500">
             <Trophy size={64} className="text-[#E7CD78] mb-6 animate-bounce" />
             <h3 className="text-3xl font-black text-white mb-2 uppercase italic leading-none">System Failure</h3>
             <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-8">Structural collapse detected</p>
             
             <div className="flex gap-4 mb-10">
               <div className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl text-center">
                 <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Score</p>
                 <p className="text-white font-mono text-3xl font-bold">{score}</p>
               </div>
               <div className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl text-center">
                 <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Record</p>
                 <p className="text-[#E7CD78] font-mono text-3xl font-bold">{bestScore}</p>
               </div>
             </div>
             
             <div className="flex flex-col gap-3 w-full max-w-[260px]">
               <button onClick={(e) => { e.stopPropagation(); initializeGame(); }} className="w-full py-4 bg-white text-black font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl">
                  <RefreshCcw size={18} /> Re-Stack
               </button>
               <button onClick={(e) => { e.stopPropagation(); onMall(); }} className="w-full py-4 bg-[#E7CD78] text-black font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl">
                  <ShoppingBag size={18} /> Wonder Mall
               </button>
             </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-zinc-600 font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">
        Space / Click to Stack
      </div>
    </div>
  );
};

export default WonderStack;
