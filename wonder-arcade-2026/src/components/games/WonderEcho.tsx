
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from '../../App';
import { History, Target, RefreshCcw, Skull, Play, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const CANVAS_SIZE = 600;
const PLAYER_SIZE = 16;
const SHARD_SIZE = 12;
const ECHO_DELAY_FRAMES = 300; // 5 seconds at 60fps

interface Point { x: number; y: number; }

const WonderEcho: React.FC<{ onBack: () => void, onToast: (m: string) => void }> = ({ onBack, onToast }) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [activeEchoes, setActiveEchoes] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const player = useRef({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, vx: 0, vy: 0 });
  const history = useRef<Point[]>([]);
  const shards = useRef<Point[]>([]);
  const keys = useRef<{ [key: string]: boolean }>({});
  const requestRef = useRef<number | null>(null);
  const lastShardTime = useRef(0);

  // Virtual Joystick State
  const [joystick, setJoystick] = useState<{ active: boolean, x: number, y: number, currentX: number, currentY: number } | null>(null);

  const playSFX = (type: 'collect' | 'spawn' | 'crash') => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'collect') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else if (type === 'spawn') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const spawnShard = useCallback(() => {
    const padding = 50;
    shards.current.push({
      x: padding + Math.random() * (CANVAS_SIZE - padding * 2),
      y: padding + Math.random() * (CANVAS_SIZE - padding * 2)
    });
  }, []);

  const initializeGame = () => {
    player.current = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, vx: 0, vy: 0 };
    history.current = Array(1).fill({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });
    shards.current = [];
    spawnShard();
    spawnShard();
    setScore(0);
    setActiveEchoes(0);
    setGameState('playing');
    lastShardTime.current = Date.now();
  };

  const update = useCallback(() => {
    if (gameState !== 'playing') return;

    const speed = 4.5;
    if (keys.current['ArrowUp'] || keys.current['w']) player.current.vy = -speed;
    else if (keys.current['ArrowDown'] || keys.current['s']) player.current.vy = speed;
    else player.current.vy = 0;

    if (keys.current['ArrowLeft'] || keys.current['a']) player.current.vx = -speed;
    else if (keys.current['ArrowRight'] || keys.current['d']) player.current.vx = speed;
    else player.current.vx = 0;

    player.current.x += player.current.vx;
    player.current.y += player.current.vy;

    player.current.x = Math.max(PLAYER_SIZE, Math.min(CANVAS_SIZE - PLAYER_SIZE, player.current.x));
    player.current.y = Math.max(PLAYER_SIZE, Math.min(CANVAS_SIZE - PLAYER_SIZE, player.current.y));

    history.current.push({ x: player.current.x, y: player.current.y });

    shards.current.forEach((shard, idx) => {
      const dx = player.current.x - shard.x;
      const dy = player.current.y - shard.y;
      if (Math.sqrt(dx * dx + dy * dy) < PLAYER_SIZE + SHARD_SIZE) {
        shards.current.splice(idx, 1);
        setScore(s => {
          const newScore = s + 100;
          if (newScore > 0 && newScore % 500 === 0) {
            setActiveEchoes(prev => prev + 1);
            playSFX('spawn');
            onToast(`ECHO ${Math.floor(newScore / 500)} SYNCHRONIZED`);
          }
          return newScore;
        });
        playSFX('collect');
        spawnShard();
      }
    });

    const now = Date.now();
    if (now - lastShardTime.current > 10000) {
        lastShardTime.current = now;
        if (shards.current.length < 5) spawnShard();
    }

    for (let i = 1; i <= activeEchoes; i++) {
      const delay = i * ECHO_DELAY_FRAMES;
      const hIdx = history.current.length - delay;
      if (hIdx >= 0) {
        const echoPos = history.current[hIdx];
        const dx = player.current.x - echoPos.x;
        const dy = player.current.y - echoPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < PLAYER_SIZE * 0.9) {
          setGameState('gameOver');
          playSFX('crash');
        }
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.strokeStyle = 'rgba(231, 205, 120, 0.05)';
      ctx.lineWidth = 1;
      const pulse = Math.sin(Date.now() / 1000) * 0.5 + 0.5;
      ctx.globalAlpha = 0.1 + pulse * 0.1;
      for(let i=0; i<CANVAS_SIZE; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      for (let i = 1; i <= activeEchoes; i++) {
        const delay = i * ECHO_DELAY_FRAMES;
        const hIdx = history.current.length - delay;
        if (hIdx >= 0) {
          const echoPos = history.current[hIdx];
          const jitterX = (Math.random() - 0.5) * 4;
          const jitterY = (Math.random() - 0.5) * 4;
          
          ctx.save();
          ctx.translate(echoPos.x + jitterX, echoPos.y + jitterY);
          ctx.rotate(Math.sin(Date.now() / 100 + i) * 0.2);
          
          ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 243, 255, 0.4)' : 'rgba(239, 68, 68, 0.4)';
          ctx.fillRect(-PLAYER_SIZE/2 - 2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 243, 255, 0.4)';
          ctx.fillRect(-PLAYER_SIZE/2 + 2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
          
          ctx.restore();
        }
      }

      shards.current.forEach(shard => {
        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(Date.now() / 500);
        ctx.fillStyle = '#E7CD78'; 
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#E7CD78';
        ctx.beginPath();
        ctx.moveTo(0, -SHARD_SIZE);
        ctx.lineTo(SHARD_SIZE, 0);
        ctx.lineTo(0, SHARD_SIZE);
        ctx.lineTo(-SHARD_SIZE, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      ctx.save();
      ctx.translate(player.current.x, player.current.y);
      ctx.fillStyle = '#00f3ff'; 
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f3ff';
      ctx.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-PLAYER_SIZE/4, -PLAYER_SIZE/4, PLAYER_SIZE/2, PLAYER_SIZE/2);
      ctx.restore();
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, activeEchoes, spawnShard, onToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // Virtual Joystick Logic
  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== 'playing') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setJoystick({ active: true, x: clientX, y: clientY, currentX: clientX, currentY: clientY });
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystick || !joystick.active) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setJoystick({ ...joystick, currentX: clientX, currentY: clientY });

    const dx = clientX - joystick.x;
    const dy = clientY - joystick.y;
    const threshold = 15;

    // Reset keys
    keys.current['ArrowUp'] = false;
    keys.current['ArrowDown'] = false;
    keys.current['ArrowLeft'] = false;
    keys.current['ArrowRight'] = false;

    if (Math.abs(dx) > threshold) {
      if (dx > 0) keys.current['ArrowRight'] = true;
      else keys.current['ArrowLeft'] = true;
    }
    if (Math.abs(dy) > threshold) {
      if (dy > 0) keys.current['ArrowDown'] = true;
      else keys.current['ArrowUp'] = true;
    }
  };

  const handleJoystickEnd = () => {
    setJoystick(null);
    keys.current['ArrowUp'] = false;
    keys.current['ArrowDown'] = false;
    keys.current['ArrowLeft'] = false;
    keys.current['ArrowRight'] = false;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 pt-24 relative overflow-hidden select-none touch-none"
         onMouseMove={handleJoystickMove}
         onMouseUp={handleJoystickEnd}
         onTouchMove={handleJoystickMove}
         onTouchEnd={handleJoystickEnd}
    >
      <BackButton onClick={onBack} />

      <header className="mb-6 text-center z-10 w-full flex flex-col items-center">
        <h2 className="text-2xl sm:text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Wonder Echo</h2>
        <div className="flex gap-4 sm:gap-10 items-center justify-center scale-90 sm:scale-100">
            <div className="text-center">
                <p className="text-[8px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-1">Active Echoes</p>
                <p className="text-xl sm:text-3xl font-bold text-red-500 animate-pulse">{activeEchoes}</p>
            </div>
            <div className="text-center">
                <p className="text-[8px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-1">Data Transmission</p>
                <p className="text-xl sm:text-3xl font-bold text-[#E7CD78]">{score}</p>
            </div>
        </div>
      </header>

      <div className="relative border-4 border-zinc-800 rounded-xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl bg-black w-full max-w-[600px] aspect-square">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="w-full h-full cursor-none" />

        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 sm:p-12 text-center z-20 animate-in fade-in duration-500">
             <div className="bg-zinc-900/50 p-6 sm:p-8 rounded-[2rem] border border-[#E7CD78]/20 max-w-sm">
                <History size={40} className="text-[#E7CD78] mb-4 sm:mb-6 mx-auto animate-spin-slow" />
                <h3 className="text-xl sm:text-3xl font-black text-white mb-4 sm:mb-6 uppercase italic tracking-tighter">Temporal Mission</h3>
                
                <div className="space-y-3 sm:space-y-4 text-left mb-8 sm:mb-10 scale-90 sm:scale-100 origin-left">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="bg-[#E7CD78] text-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-black">!</div>
                        <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-tight">Touch & Drag anywhere to dodge.</p>
                    </div>
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="bg-[#E7CD78] text-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-black">!</div>
                        <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-tight">Every 500pts adds a <span className="text-red-500 font-bold">Ghost Echo</span>.</p>
                    </div>
                </div>

                <button onClick={initializeGame} className="w-full py-4 sm:py-5 bg-[#E7CD78] text-black font-inter font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(231,205,120,0.3)] flex items-center justify-center gap-3 text-xs sm:text-sm">
                    <Play size={18} fill="currentColor" /> Start Simulation
                </button>
             </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-20 animate-in fade-in duration-500">
             <Skull size={48} className="text-red-500 mb-6 animate-bounce" />
             <h3 className="text-2xl sm:text-4xl font-black text-white mb-2 uppercase italic leading-none tracking-tighter">Paradox Error</h3>
             
             <div className="flex gap-4 sm:gap-6 mb-8 sm:mb-12 scale-90 sm:scale-100">
               <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 sm:px-8 sm:py-5 rounded-3xl text-center min-w-[100px] sm:min-w-[140px]">
                 <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Data</p>
                 <p className="text-white text-xl sm:text-3xl font-bold">{score}</p>
               </div>
               <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 sm:px-8 sm:py-5 rounded-3xl text-center min-w-[100px] sm:min-w-[140px]">
                 <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Echoes</p>
                 <p className="text-red-500 text-xl sm:text-3xl font-bold">{activeEchoes}</p>
               </div>
             </div>
             
             <button onClick={initializeGame} className="w-full max-w-xs py-4 sm:py-5 bg-white text-black font-inter font-bold rounded-full flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95 text-xs sm:text-sm">
                <RefreshCcw size={18} /> Retry Timeline
             </button>
          </div>
        )}

        {/* Joystick Interaction Overlay */}
        {gameState === 'playing' && (
          <div 
            className="absolute inset-0 z-10"
            onMouseDown={handleJoystickStart}
            onTouchStart={handleJoystickStart}
          />
        )}
      </div>

      {/* Visual Joystick Element */}
      {joystick && joystick.active && (
        <div 
          className="fixed pointer-events-none z-[100]"
          style={{ left: joystick.x - 40, top: joystick.y - 40 }}
        >
          <div className="w-20 h-20 bg-white/5 border-2 border-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
            <div 
              className="w-10 h-10 bg-[#00f3ff] rounded-full shadow-[0_0_15px_#00f3ff] transition-transform duration-75"
              style={{ 
                transform: `translate(${Math.min(30, Math.max(-30, joystick.currentX - joystick.x))}px, ${Math.min(30, Math.max(-30, joystick.currentY - joystick.y))}px)` 
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-6 text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">
        <p className="animate-pulse">Touch & Drag anywhere to control movement</p>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
      
      {/* Bottom spacer for mobile */}
      <div className="h-16 sm:hidden" />
    </div>
  );
};

export default WonderEcho;
