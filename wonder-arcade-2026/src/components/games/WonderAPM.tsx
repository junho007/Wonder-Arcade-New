
import React, { useState, useEffect, useRef } from 'react';
import { BackButton } from '../../App';
import { Zap } from 'lucide-react';

const WonderAPM: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10.00);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const timerRef = useRef<number | null>(null);
  const rippleIdRef = useRef(0);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState === 'finished') return;

    if (gameState === 'idle') {
      setGameState('playing');
      startTimer();
    }

    setTaps(prev => prev + 1);

    // Create ripple effect
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
    
    const newRipple = { id: rippleIdRef.current++, x, y };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  const startTimer = () => {
    const startTime = Date.now();
    const duration = 10000;
    
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('finished');
      }
    }, 10);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getRank = () => {
    if (taps < 40) return { title: "NPC Speed", color: "text-zinc-500", glow: "shadow-zinc-500/20" };
    if (taps < 60) return { title: "Casual Gamer", color: "text-blue-500", glow: "shadow-blue-500/20" };
    if (taps < 80) return { title: "Ranked Demon", color: "text-purple-500", glow: "shadow-purple-500/20" };
    return { title: "PRO PLAYER", color: "text-[#E7CD78]", glow: "shadow-[#E7CD78]/20", special: true };
  };

  const rank = getRank();

  const resetGame = () => {
    setTaps(0);
    setTimeLeft(10.00);
    setGameState('idle');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-4xl mx-auto overflow-hidden pt-24">
      <BackButton onClick={onBack} />

      <header className="mb-12 text-center">
        <h2 className="text-4xl font-extrabold text-white tracking-tighter uppercase">Wonder APM</h2>
        <p className="text-zinc-500 uppercase tracking-widest text-sm mt-2 font-mono">Taps-Per-Minute Test</p>
      </header>

      <div className="flex flex-col items-center gap-12 w-full">
        <div className="flex gap-12 items-center">
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-1">Time Remaining</p>
            <p className="text-5xl font-mono font-bold text-white w-32">{timeLeft.toFixed(2)}s</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-1">Live Taps</p>
            <p className="text-5xl font-mono font-bold text-[#E7CD78] w-24">{taps}</p>
          </div>
        </div>

        <div className="relative">
          <button
            onMouseDown={handleTap}
            onTouchStart={handleTap}
            disabled={gameState === 'finished'}
            className={`
              relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-75 overflow-hidden
              ${gameState === 'playing' ? 'animate-pulse scale-105' : 'hover:scale-105 active:scale-95'}
              ${gameState === 'finished' ? 'opacity-50 grayscale cursor-not-allowed' : 'bg-gradient-to-br from-[#1a1a1a] to-black border-4 border-[#E7CD78] gold-glow'}
            `}
          >
            <Zap className={`w-16 h-16 text-[#E7CD78] mb-4 ${gameState === 'playing' ? 'animate-bounce' : ''}`} />
            <span className="font-black text-white text-xl uppercase tracking-tighter">
              {gameState === 'idle' ? 'START' : gameState === 'playing' ? 'TAP ME!' : 'LOCKED'}
            </span>
            
            {ripples.map(ripple => (
              <span
                key={ripple.id}
                className="absolute bg-white/30 rounded-full animate-ping pointer-events-none"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: '40px',
                  height: '40px',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </button>
        </div>

        {gameState === 'finished' && (
          <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500 text-center">
            <div className={`p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl ${rank.glow}`}>
              <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-black mb-2">Final Rank</p>
              <h3 className={`text-5xl font-black uppercase tracking-tighter ${rank.color} ${rank.special ? 'animate-pulse' : ''}`}>
                {rank.title}
              </h3>
              <p className="text-white font-mono text-xl mt-4">{taps} TAPS IN 10s</p>
            </div>
            
            <button
              onClick={resetGame}
              className="px-12 py-4 bg-[#E7CD78] text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest shadow-xl"
            >
              Re-calibrate Speed
            </button>
          </div>
        )}

        {gameState === 'idle' && (
          <p className="text-zinc-500 uppercase tracking-[0.4em] font-bold text-xs animate-pulse">
            The clock starts on the first tap
          </p>
        )}
      </div>
    </div>
  );
};

export default WonderAPM;
