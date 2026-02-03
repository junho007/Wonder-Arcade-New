
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from '../../App';
import { Target, RefreshCcw, Skull, Play, Heart, Zap, Eye } from 'lucide-react';

const CANVAS_SIZE = 600;
const PLAYER_SIZE = 12;
const ORACLE_X = CANVAS_SIZE / 2;
const ORACLE_Y = CANVAS_SIZE / 2;

type OracleState = 'aiming' | 'locked' | 'firing' | 'cooldown';

const WonderOracle: React.FC<{ onBack: () => void, onToast: (m: string) => void }> = ({ onBack, onToast }) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('wonderoracle-best')) || 0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Game Refs
  const player = useRef({ x: 100, y: 100, vx: 0, vy: 0, prevX: 100, prevY: 100 });
  const oracle = useRef<{ state: OracleState, timer: number, target: { x: number, y: number }, angle: number }>({
    state: 'aiming',
    timer: 0,
    target: { x: 0, y: 0 },
    angle: 0
  });
  const keys = useRef<{ [key: string]: boolean }>({});
  const requestRef = useRef<number | null>(null);
  const shakeRef = useRef(0);
  const lastStateRef = useRef<OracleState>('aiming');

  // Virtual Joystick State
  const [joystick, setJoystick] = useState<{ active: boolean, x: number, y: number, currentX: number, currentY: number } | null>(null);

  // Audio Synthesizer
  const playSFX = (type: 'charge' | 'fire' | 'hit' | 'near-miss') => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'charge') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    } else if (type === 'fire') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    } else if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    } else if (type === 'near-miss') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const initializeGame = () => {
    player.current = { x: 100, y: 100, vx: 0, vy: 0, prevX: 100, prevY: 100 };
    oracle.current = { state: 'aiming', timer: 1500, target: { x: 0, y: 0 }, angle: 0 };
    setScore(0);
    setLives(3);
    setGameState('playing');
    shakeRef.current = 0;
  };

  const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((px - (x1 + t * (x2 - x1))) * (px - (x1 + t * (x2 - x1))) + (py - (y1 + t * (y2 - y1))) * (py - (y1 + t * (y2 - y1))));
  };

  const update = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    const speed = 5.5;
    player.current.prevX = player.current.x;
    player.current.prevY = player.current.y;

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

    const dt = 16.67;
    oracle.current.timer -= dt;

    const difficultyMultiplier = Math.max(0.4, 1 - score / 1000);
    const AIM_TIME = 1500 * difficultyMultiplier;
    const LOCK_TIME = 500 * difficultyMultiplier;
    const FIRE_TIME = 300;
    const COOLDOWN_TIME = 800;

    if (oracle.current.state === 'aiming') {
      if (lastStateRef.current !== 'aiming') playSFX('charge');
      const dx = player.current.x - player.current.prevX;
      const dy = player.current.y - player.current.prevY;
      oracle.current.target.x = player.current.x + (dx * 30);
      oracle.current.target.y = player.current.y + (dy * 30);
      if (oracle.current.timer <= 0) {
        oracle.current.state = 'locked';
        oracle.current.timer = LOCK_TIME;
      }
    } else if (oracle.current.state === 'locked') {
      if (oracle.current.timer <= 0) {
        oracle.current.state = 'firing';
        oracle.current.timer = FIRE_TIME;
        playSFX('fire');
      }
    } else if (oracle.current.state === 'firing') {
      const laserDist = distToSegment(
        player.current.x, player.current.y, 
        ORACLE_X, ORACLE_Y, 
        oracle.current.target.x, oracle.current.target.y
      );
      if (laserDist < PLAYER_SIZE + 5) {
        setLives(l => {
          const next = l - 1;
          shakeRef.current = 15;
          playSFX('hit');
          if (next <= 0) setGameState('gameOver');
          return next;
        });
        oracle.current.state = 'cooldown';
        oracle.current.timer = COOLDOWN_TIME;
      }
      if (oracle.current.timer <= 0) {
        setScore(s => s + 10);
        oracle.current.state = 'cooldown';
        oracle.current.timer = COOLDOWN_TIME;
        const finalLaserDist = distToSegment(
          player.current.x, player.current.y, 
          ORACLE_X, ORACLE_Y, 
          oracle.current.target.x, oracle.current.target.y
        );
        if (finalLaserDist < 40) playSFX('near-miss');
      }
    } else if (oracle.current.state === 'cooldown') {
      if (oracle.current.timer <= 0) {
        oracle.current.state = 'aiming';
        oracle.current.timer = AIM_TIME;
      }
    }
    
    lastStateRef.current = oracle.current.state;
    if (shakeRef.current > 0) shakeRef.current *= 0.9;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.save();
      if (shakeRef.current > 1) {
          ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      }
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.strokeStyle = 'rgba(231, 205, 120, 0.05)';
      ctx.lineWidth = 1;
      for(let i=0; i<CANVAS_SIZE; i+=50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
      }
      ctx.save();
      ctx.translate(ORACLE_X, ORACLE_Y);
      const rot = time / 1000;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E7CD78';
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(rot);
      ctx.strokeStyle = 'rgba(231, 205, 120, 0.5)';
      ctx.strokeRect(-40, -40, 80, 80);
      ctx.rotate(-rot * 2.5);
      ctx.strokeRect(-35, -35, 70, 70);
      const pupilGlow = oracle.current.state === 'aiming' ? '#E7CD78' : 
                        oracle.current.state === 'locked' ? '#ff6600' :
                        oracle.current.state === 'firing' ? '#ff0000' : '#333';
      ctx.fillStyle = pupilGlow;
      ctx.shadowBlur = oracle.current.state === 'firing' ? 30 : 10;
      ctx.shadowColor = pupilGlow;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (oracle.current.state !== 'cooldown') {
        ctx.beginPath();
        ctx.moveTo(ORACLE_X, ORACLE_Y);
        const angle = Math.atan2(oracle.current.target.y - ORACLE_Y, oracle.current.target.x - ORACLE_X);
        const farX = ORACLE_X + Math.cos(angle) * 1000;
        const farY = ORACLE_Y + Math.sin(angle) * 1000;
        ctx.lineTo(farX, farY);
        if (oracle.current.state === 'aiming') {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (oracle.current.state === 'locked') {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ff0000';
          ctx.beginPath(); ctx.arc(oracle.current.target.x, oracle.current.target.y, 4, 0, Math.PI * 2); ctx.fill();
        } else if (oracle.current.state === 'firing') {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 12;
          ctx.shadowBlur = 40;
          ctx.shadowColor = '#ff0000';
          ctx.stroke();
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 18;
          ctx.globalAlpha = 0.3;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.save();
      ctx.translate(player.current.x, player.current.y);
      const moveAngle = Math.atan2(player.current.vy, player.current.vx);
      if (Math.abs(player.current.vx) > 0.1 || Math.abs(player.current.vy) > 0.1) {
        ctx.rotate(moveAngle + Math.PI / 2);
      }
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(0, -PLAYER_SIZE);
      ctx.lineTo(PLAYER_SIZE, PLAYER_SIZE);
      ctx.lineTo(-PLAYER_SIZE, PLAYER_SIZE);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, score]);

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

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('wonderoracle-best', score.toString());
    }
  }, [score, highScore]);

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 pt-24 relative overflow-hidden select-none font-sans touch-none"
         onMouseMove={handleJoystickMove}
         onMouseUp={handleJoystickEnd}
         onTouchMove={handleJoystickMove}
         onTouchEnd={handleJoystickEnd}
    >
      <BackButton onClick={onBack} />

      <header className="mb-6 text-center z-10 w-full flex flex-col items-center">
        <h2 className="text-2xl sm:text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Wonder Oracle</h2>
        <div className="flex gap-4 sm:gap-10 items-center justify-center scale-90 sm:scale-100">
            <div className="text-center">
                <p className="text-[8px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-1">Lives</p>
                <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                        <Heart key={i} size={14} fill={i < lives ? "#E7CD78" : "transparent"} className={i < lives ? "text-[#E7CD78]" : "text-zinc-800"} />
                    ))}
                </div>
            </div>
            <div className="text-center">
                <p className="text-[8px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-1">Score</p>
                <p className="text-xl sm:text-3xl font-bold text-[#E7CD78]">{score}</p>
            </div>
            <div className="text-center">
                <p className="text-[8px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-black mb-1">Record</p>
                <p className="text-xl sm:text-3xl font-bold text-zinc-500">{highScore}</p>
            </div>
        </div>
      </header>

      <div className="relative border-4 border-zinc-800 rounded-xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl bg-black w-full max-w-[600px] aspect-square">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="w-full h-full cursor-none" />

        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 sm:p-12 text-center z-20 animate-in fade-in duration-500">
             <div className="bg-zinc-900/50 p-6 sm:p-8 rounded-[2rem] border border-[#E7CD78]/20 max-w-sm">
                <Eye size={40} className="text-[#E7CD78] mb-4 sm:mb-6 mx-auto animate-pulse" />
                <h3 className="text-xl sm:text-3xl font-black text-white mb-4 sm:mb-6 uppercase italic tracking-tighter">Initiate Duel</h3>
                
                <div className="space-y-3 sm:space-y-4 text-left mb-8 sm:mb-10 scale-90 sm:scale-100 origin-left">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="bg-[#E7CD78] text-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-black italic">!</div>
                        <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-tight">The Oracle <span className="text-[#E7CD78] font-bold">predicts</span> your path.</p>
                    </div>
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="bg-[#E7CD78] text-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-black italic">!</div>
                        <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-tight">Touch anywhere to move.</p>
                    </div>
                </div>

                <button onClick={initializeGame} className="w-full py-4 sm:py-5 bg-[#E7CD78] text-black font-inter font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(231,205,120,0.3)] flex items-center justify-center gap-3 text-xs sm:text-sm">
                    <Play size={18} fill="currentColor" /> Enter Arena
                </button>
             </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-20 animate-in fade-in duration-500">
             <Skull size={48} className="text-red-500 mb-6 animate-bounce" />
             <h3 className="text-2xl sm:text-4xl font-black text-white mb-2 uppercase italic leading-none tracking-tighter">Prediction Confirmed</h3>
             
             <div className="flex gap-4 sm:gap-6 mb-8 sm:mb-12 scale-90 sm:scale-100">
               <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 sm:px-8 sm:py-5 rounded-3xl text-center min-w-[100px] sm:min-w-[140px]">
                 <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Dodges</p>
                 <p className="text-white text-xl sm:text-3xl font-bold">{score}</p>
               </div>
               <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 sm:px-8 sm:py-5 rounded-3xl text-center min-w-[100px] sm:min-w-[140px]">
                 <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Best</p>
                 <p className="text-[#E7CD78] text-xl sm:text-3xl font-bold">{highScore}</p>
               </div>
             </div>
             
             <button onClick={initializeGame} className="w-full max-w-xs py-4 sm:py-5 bg-white text-black font-inter font-bold rounded-full flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95 text-xs sm:text-sm">
                <RefreshCcw size={18} /> Resume Duel
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
              className="w-10 h-10 bg-[#E7CD78] rounded-full shadow-[0_0_15px_#E7CD78] transition-transform duration-75"
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

      {/* Bottom spacer for mobile */}
      <div className="h-16 sm:hidden" />
    </div>
  );
};

export default WonderOracle;
