
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from '../../App';
import { ShoppingBag, Trophy, RefreshCcw, Heart, Skull, Play, Zap, ArrowRight, ArrowUp, Timer, ChevronLeft, ChevronRight } from 'lucide-react';

// --- CONFIG & CONSTANTS ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const LEVEL_WIDTH = 20000; 
const GRAVITY = 0.55;
const JUMP_POWER = -13;
const PLAYER_SPEED = 6;
const GIANT_DURATION = 15000; 

const BGM_URL = "https://cdn.pixabay.com/audio/2022/01/21/audio_23395d9859.mp3"; 

interface Rect { x: number; y: number; w: number; h: number; }
interface Enemy { x: number; y: number; w: number; h: number; minX: number; maxX: number; speed: number; dir: number; active: boolean; }
interface Powerup { x: number; y: number; size: number; active: boolean; }
interface Particle { x: number; y: number; opacity: number; size: number; color: string; vx: number; vy: number; }

const generatePlatforms = (): Rect[] => {
  const plats: Rect[] = [{ x: 0, y: 440, w: 1200, h: 60 }];
  const MAX_JUMP_HEIGHT = 135; 
  const MAX_DROP_DEPTH = 160;
  const MAX_GAP_X = 220;       
  const MIN_GAP_X = 85;
  const MIN_Y = 120;
  const MAX_Y = 440;
  let prevPlat = plats[0];

  while (prevPlat.x + prevPlat.w < LEVEL_WIDTH - 1500) {
    const type = Math.random();
    const gapX = MIN_GAP_X + Math.random() * (MAX_GAP_X - MIN_GAP_X);
    const nextX = prevPlat.x + prevPlat.w + gapX;
    const minY = Math.max(MIN_Y, prevPlat.y - MAX_JUMP_HEIGHT);
    const maxY = Math.min(MAX_Y, prevPlat.y + MAX_DROP_DEPTH);
    const nextY = minY + Math.random() * (maxY - minY);
    const nextW = type < 0.6 ? 400 + Math.random() * 400 : 200 + Math.random() * 100;
    plats.push({ x: nextX, y: nextY, w: nextW, h: 40 });
    prevPlat = plats[plats.length - 1];
  }
  plats.push({ x: LEVEL_WIDTH - 1200, y: 440, w: 1200, h: 60 });
  return plats;
};

const INITIAL_PLATFORMS = generatePlatforms();

const generateEntities = (plats: Rect[]) => {
  const enemies: Enemy[] = [];
  const powerups: Powerup[] = [];
  plats.forEach((p, i) => {
    if (i === 0 || i === plats.length - 1) return;
    if (p.w > 250 && Math.random() > 0.45) {
      enemies.push({
        x: p.x + 50 + Math.random() * (p.w - 100), y: p.y - 40, w: 40, h: 40,
        minX: p.x + 10, maxX: p.x + p.w - 50,
        speed: 1.5 + Math.random() * 3, dir: 1, active: true
      });
    }
    if (p.y < 300 && Math.random() > 0.7) {
      powerups.push({ x: p.x + p.w / 2 - 12, y: p.y - 65, size: 25, active: true });
    }
  });
  return { enemies, powerups };
};

const { enemies: INITIAL_ENEMIES, powerups: INITIAL_POWERUPS } = generateEntities(INITIAL_PLATFORMS);
const GOAL_X = LEVEL_WIDTH - 200;

const WonderRun: React.FC<{ onBack: () => void, onMall: () => void }> = ({ onBack, onMall }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'cleared' | 'gameover'>('idle');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [powerupTimer, setPowerupTimer] = useState(0);
  const [bestTime, setBestTime] = useState(() => Number(localStorage.getItem('wonderrun-besttime')) || 0);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("00:00.00");

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const player = useRef({ 
    x: 50, y: 300, vx: 0, vy: 0, 
    baseW: 32, baseH: 32, 
    currentW: 32, currentH: 32,
    onGround: false, isSuper: false,
    bobOffset: 0, facing: 1 
  });

  const levelState = useRef({
    enemies: JSON.parse(JSON.stringify(INITIAL_ENEMIES)) as Enemy[],
    powerups: JSON.parse(JSON.stringify(INITIAL_POWERUPS)) as Powerup[]
  });

  const cameraX = useRef(0);
  const startTime = useRef(0);
  const elapsedFinal = useRef(0);
  const keys = useRef<{ [key: string]: boolean }>({});
  const particles = useRef<Particle[]>([]);
  const killParticles = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const bgm = new Audio();
    bgm.src = BGM_URL;
    bgm.loop = true;
    bgm.volume = 0.3;
    bgm.crossOrigin = "anonymous";
    bgmRef.current = bgm;
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => { 
      bgm.pause(); 
      bgm.src = "";
      bgmRef.current = null; 
    };
  }, []);

  const playSFX = (freq1: number, freq2: number, type: OscillatorType = 'square', dur: number = 0.1) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq1, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  };

  const spawnKillParticles = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
      killParticles.current.push({
        x, y, opacity: 1, size: Math.random() * 6 + 2, color: '#00FFFF',
        vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14
      });
    }
  };

  const resetPosition = useCallback(() => {
    player.current.x = 50;
    player.current.y = 300;
    player.current.vx = 0;
    player.current.vy = 0;
    cameraX.current = 0;
    levelState.current.enemies = JSON.parse(JSON.stringify(INITIAL_ENEMIES));
    levelState.current.powerups = JSON.parse(JSON.stringify(INITIAL_POWERUPS));
    setPowerupTimer(0);
  }, []);

  const handleDeath = useCallback(() => {
    playSFX(200, 40, 'sawtooth', 0.4);
    setLives(prev => {
      const next = prev - 1;
      if (next <= 0) { 
        setGameState('gameover'); 
        bgmRef.current?.pause(); 
        elapsedFinal.current = Date.now() - startTime.current;
        return 0; 
      }
      resetPosition(); return next;
    });
  }, [resetPosition]);

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    const dec = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${dec.toString().padStart(2, '0')}`;
  };

  const update = useCallback(() => {
    if (gameState !== 'playing') {
        if (gameState !== 'idle') {
           requestRef.current = requestAnimationFrame(update);
        }
        return;
    };
    frameRef.current++;
    const p = player.current;
    const currentElapsed = Date.now() - startTime.current;
    setCurrentTimeDisplay(formatElapsedTime(currentElapsed));

    if (keys.current['ArrowLeft'] || keys.current['MobileLeft']) { p.vx = -PLAYER_SPEED; p.facing = -1; }
    else if (keys.current['ArrowRight'] || keys.current['MobileRight']) { p.vx = PLAYER_SPEED; p.facing = 1; }
    else p.vx *= 0.82;

    if ((keys.current['ArrowUp'] || keys.current[' '] || keys.current['MobileJump']) && p.onGround) {
      p.vy = JUMP_POWER; p.onGround = false; playSFX(150, 600, 'square', 0.1);
    }

    p.vy += GRAVITY; p.x += p.vx; p.y += p.vy;

    if (Math.abs(p.vx) > 0.5 || !p.onGround) {
      particles.current.push({ 
        x: p.x + p.currentW / 2, y: p.y + p.currentH, opacity: 1, 
        size: Math.random() * 4 + 2, color: p.isSuper ? '#E7CD78' : '#3B82F6',
        vx: (Math.random() - 0.5) * 2, vy: Math.random() * -2
      });
    }
    particles.current.forEach(part => { part.x += part.vx; part.y += part.vy; part.opacity -= 0.045; part.size *= 0.95; });
    particles.current = particles.current.filter(part => part.opacity > 0);

    killParticles.current.forEach(part => { part.x += part.vx; part.y += part.vy; part.opacity -= 0.03; part.vx *= 0.96; part.vy *= 0.96; });
    killParticles.current = killParticles.current.filter(part => part.opacity > 0);

    p.onGround = false;
    for (const plat of INITIAL_PLATFORMS) {
      if (p.x < plat.x + plat.w && p.x + p.currentW > plat.x && p.y < plat.y + plat.h && p.y + p.currentH > plat.y) {
        if (p.vy > 0 && p.y + p.currentH - p.vy <= plat.y + 15) {
          p.y = plat.y - p.currentH; p.vy = 0; p.onGround = true;
        } else if (p.vy < 0 && p.y - p.vy >= plat.y + plat.h - 15) { p.y = plat.y + plat.h; p.vy = 0; }
      }
    }

    const wasSuper = p.isSuper;
    if (powerupTimer > 0) {
      setPowerupTimer(prev => Math.max(0, prev - 16.67));
      if (!wasSuper) {
        const currentFeet = p.y + p.currentH;
        p.currentW = p.baseW * 2.3;
        p.currentH = p.baseH * 2.3;
        p.y = currentFeet - p.currentH; 
        p.isSuper = true;
      }
    } else if (wasSuper) {
      const currentFeet = p.y + p.currentH;
      p.currentW = p.baseW;
      p.currentH = p.baseH;
      p.y = currentFeet - p.currentH;
      p.isSuper = false;
    }

    levelState.current.powerups.forEach(pu => {
      if (pu.active && p.x < pu.x + pu.size && p.x + p.currentW > pu.x && p.y < pu.y + pu.size && p.y + p.currentH > pu.y) {
        pu.active = false; setPowerupTimer(GIANT_DURATION); setScore(s => s + 500); playSFX(900, 1500, 'sine', 0.3);
      }
    });

    levelState.current.enemies.forEach(e => {
      if (!e.active) return;
      e.x += e.dir * e.speed;
      if (e.x >= e.maxX) e.dir = -1;
      if (e.x <= e.minX) e.dir = 1;
      if (p.x < e.x + e.w && p.x + p.currentW > e.x && p.y < e.y + e.h && p.y + p.currentH > e.y) {
        if (p.isSuper) { 
            setScore(s => s + 1000); 
            e.active = false; 
            spawnKillParticles(e.x + e.w/2, e.y + e.h/2);
            playSFX(120, 20, 'sawtooth', 0.2); 
        } else { handleDeath(); }
      }
    });

    if (p.x >= GOAL_X) { 
        setGameState('cleared'); 
        bgmRef.current?.pause();
        const finishTime = Date.now() - startTime.current;
        elapsedFinal.current = finishTime;
        if (bestTime === 0 || finishTime < bestTime) {
            setBestTime(finishTime);
            localStorage.setItem('wonderrun-besttime', finishTime.toString());
        }
    }
    if (p.y > CANVAS_HEIGHT + 150) handleDeath();
    cameraX.current = Math.max(0, Math.min(LEVEL_WIDTH - CANVAS_WIDTH, p.x - CANVAS_WIDTH / 3));

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#0c0c2a'); 
      skyGrad.addColorStop(1, '#25295c'); 
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const p1 = -cameraX.current * 0.15;
      ctx.fillStyle = '#1b2245';
      for(let i=0; i<60; i++) {
        const bx = (i * 80) + (p1 % 80);
        const bh = 40 + (Math.sin(i * 1.5) + 1) * 80;
        ctx.fillRect(bx, CANVAS_HEIGHT - bh, 4, bh);
        ctx.fillStyle = '#4f4ec1';
        ctx.fillRect(bx - 1, CANVAS_HEIGHT - bh, 6, 2);
        ctx.fillStyle = '#1b2245';
      }

      const p2 = -cameraX.current * 0.4;
      for(let i=0; i<40; i++) {
        const bx = (i * 150) + (p2 % 150);
        const bh = 120 + (Math.cos(i * 1.1) + 1) * 130;
        const bw = 50 + (Math.sin(i * 0.7) + 1) * 20;
        ctx.fillStyle = '#2d336a'; 
        ctx.fillRect(bx, CANVAS_HEIGHT - bh, bw, bh);
        ctx.fillStyle = (i % 2 === 0) ? '#60a5fa' : '#c084fc';
        ctx.globalAlpha = 0.6;
        if (Math.sin(i) > 0) ctx.fillRect(bx + bw/2 - 1, CANVAS_HEIGHT - bh, 2, bh);
        else ctx.fillRect(bx, CANVAS_HEIGHT - bh + 20, bw, 2);
        ctx.globalAlpha = 1.0;
      }

      const p3 = -cameraX.current * 0.75;
      for(let i=0; i<20; i++) {
        const bx = (i * 400) + (p3 % 400);
        const bh = 220 + (Math.sin(i * 0.9) + 1) * 150;
        const bw = 120 + (Math.cos(i * 1.3) + 1) * 60;
        ctx.fillStyle = '#08081f'; 
        ctx.fillRect(bx, CANVAS_HEIGHT - bh, bw, bh);
        ctx.fillStyle = '#fef9c3';
        ctx.shadowBlur = 12; ctx.shadowColor = '#fde047';
        for(let wy=40; wy < bh - 40; wy += 60) {
            if (Math.sin(i * 7 + wy) > 0.3) ctx.fillRect(bx + bw - 20, CANVAS_HEIGHT - bh + wy, 6, 4);
        }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#34d399'; 
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx, CANVAS_HEIGHT - bh);
        ctx.lineTo(bx + bw, CANVAS_HEIGHT - bh);
        ctx.stroke();
      }

      ctx.save(); ctx.translate(-cameraX.current, 0);
      ctx.shadowBlur = 10; ctx.shadowColor = '#E7CD78'; ctx.fillStyle = '#E7CD78';
      INITIAL_PLATFORMS.forEach(plat => { 
          if (plat.x + plat.w > cameraX.current - 200 && plat.x < cameraX.current + CANVAS_WIDTH + 200) {
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h); 
            ctx.strokeStyle = '#FFF'; 
            ctx.lineWidth = 2;
            ctx.strokeRect(plat.x, plat.y, plat.w, plat.h); 
          }
      });
      ctx.shadowBlur = 0;

      levelState.current.powerups.forEach(pu => {
        if (pu.active) {
          ctx.save(); ctx.translate(pu.x + pu.size/2, pu.y + pu.size/2);
          ctx.rotate(frameRef.current * 0.12); 
          const scale = 1 + Math.sin(frameRef.current * 0.2) * 0.35; ctx.scale(scale, scale);
          ctx.shadowBlur = 30; ctx.shadowColor = '#FFD700'; ctx.fillStyle = '#FFD700'; ctx.beginPath();
          ctx.moveTo(0, -pu.size/2); ctx.lineTo(pu.size/2, 0); ctx.lineTo(0, pu.size/2); ctx.lineTo(-pu.size/2, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      });

      killParticles.current.forEach(part => {
        ctx.globalAlpha = part.opacity; ctx.fillStyle = part.color; ctx.fillRect(part.x, part.y, part.size, part.size);
      });
      ctx.globalAlpha = 1;

      levelState.current.enemies.forEach(e => {
        if (!e.active) return;
        if (e.x + e.w > cameraX.current - 100 && e.x < cameraX.current + CANVAS_WIDTH + 100) {
          ctx.save(); const bob = Math.sin(Date.now() * 0.008) * 15; ctx.translate(e.x + e.w/2, e.y + e.h/2 + bob);
          ctx.beginPath(); ctx.arc(0, 0, e.w/2, Math.PI, 0); ctx.lineTo(e.w/2, e.h/2); ctx.lineTo(-e.w/2, e.h/2); ctx.closePath();
          ctx.fillStyle = 'rgba(0, 255, 255, 0.8)'; ctx.shadowBlur = 20; ctx.shadowColor = '#00FFFF'; ctx.fill();
          ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-8, -6, 4, 0, Math.PI * 2); ctx.arc(8, -6, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      });

      ctx.fillStyle = '#10B981'; ctx.shadowBlur = 40; ctx.shadowColor = '#10B981'; ctx.fillRect(GOAL_X, 80, 10, 360);
      ctx.beginPath(); ctx.moveTo(GOAL_X, 80); ctx.lineTo(GOAL_X + 110, 150); ctx.lineTo(GOAL_X, 220); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;

      particles.current.forEach(part => { ctx.globalAlpha = part.opacity; ctx.fillStyle = part.color; ctx.fillRect(part.x, part.y, part.size, part.size); });
      ctx.globalAlpha = 1;

      const dp = (x: number, y: number, w: number, h: number, bob: number, facing: number) => {
        ctx.save(); ctx.translate(x + w/2, y + h/2 + bob); ctx.scale(facing, 1);
        if (p.isSuper) { ctx.shadowBlur = 40; ctx.shadowColor = '#E7CD78'; }
        ctx.fillStyle = '#ff0000'; ctx.fillRect(-w/2, -h/2, w*0.85, h*0.22); 
        ctx.fillStyle = '#ffccaa'; ctx.fillRect(-w/4, -h/2 + h*0.22, w*0.65, h*0.35); 
        ctx.fillStyle = '#000'; ctx.fillRect(w/12, -h/2 + h*0.3, 5, 7); 
        ctx.fillStyle = '#0000ff'; ctx.fillRect(-w/3.5, -h/2 + h*0.55, w*0.75, h*0.45); 
        ctx.fillStyle = '#ff0000'; ctx.fillRect(-w/2, -h/2 + h*0.55, w*0.25, h*0.35); 
        ctx.restore();
      };
      dp(p.x, p.y, p.currentW, p.currentH, p.bobOffset, p.facing);
      ctx.restore();
    }
    requestRef.current = requestAnimationFrame(update);
  }, [gameState, handleDeath, powerupTimer, bestTime]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => { 
      keys.current[e.key] = true; 
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', handleDown); 
    window.addEventListener('keyup', handleUp);
    requestRef.current = requestAnimationFrame(update);
    return () => { 
      window.removeEventListener('keydown', handleDown); 
      window.removeEventListener('keyup', handleUp); 
      if (requestRef.current) cancelAnimationFrame(requestRef.current); 
    };
  }, [update]);

  const startSimulation = () => {
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    setGameState('playing'); setLives(3); setScore(0); resetPosition();
    startTime.current = Date.now();
    bgmRef.current?.play().catch(e => console.warn("Audio Context blocked", e));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const setMobileKey = (key: string, value: boolean) => {
    keys.current[key] = value;
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-start min-h-screen bg-[#000000] pt-12 md:pt-24 p-4 md:p-6 relative overflow-hidden text-zinc-100 touch-none">
      <BackButton onClick={() => { bgmRef.current?.pause(); onBack(); }} />
      
      {/* HUD V22 - Optimized for Web & Mobile */}
      <div className="w-full max-w-6xl flex flex-row justify-between items-center mb-4 md:mb-6 px-2 md:px-4 z-20 gap-2">
        <div className="flex flex-col items-start">
          <h2 className="text-lg md:text-4xl font-black text-white italic tracking-tighter uppercase leading-none flex items-center gap-2">
             Wonder Run <span className="text-[#E7CD78] drop-shadow-[0_0_10px_#E7CD78] hidden sm:inline">V22</span>
          </h2>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart key={i} size={16} className={i < lives ? "text-[#E7CD78] fill-[#E7CD78]" : "text-zinc-900"} />
            ))}
          </div>
        </div>

        <div className="bg-black/80 border border-zinc-800 px-3 md:px-8 py-1.5 md:py-3 rounded-xl md:rounded-2xl text-center shadow-xl backdrop-blur-md flex items-center gap-2 md:gap-4">
           <Timer className="text-[#E7CD78]" size={16} />
           <div className="flex flex-col items-center">
             <p className="text-[6px] md:text-[8px] text-zinc-500 font-bold tracking-widest uppercase leading-none mb-0.5">Time</p>
             <p className="text-white font-mono text-sm md:text-3xl font-black">{currentTimeDisplay}</p>
           </div>
        </div>
        
        <div className="flex flex-col items-end gap-1.5 md:gap-2">
            <div className="bg-black/80 border border-zinc-800 px-3 md:px-6 py-1 md:py-2 rounded-xl md:rounded-2xl text-center shadow-xl backdrop-blur-md">
               <p className="text-[6px] md:text-[9px] text-zinc-500 font-bold tracking-widest uppercase leading-none">Credits</p>
               <p className="text-[#E7CD78] font-mono text-sm md:text-2xl font-black">{score}</p>
            </div>
            {/* RESTORED GIANT MODE HUD V22 */}
            {powerupTimer > 0 && (
                <div className="w-28 sm:w-40 md:w-56 bg-zinc-950 h-5 rounded-full border border-zinc-800 overflow-hidden relative shadow-[0_0_20px_rgba(231,205,120,0.2)]">
                    <div className="absolute inset-y-0 left-0 bg-[#E7CD78] shadow-[0_0_10px_#E7CD78]" style={{ width: `${(powerupTimer / GIANT_DURATION) * 100}%` }} />
                    <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] font-black text-black tracking-widest uppercase pointer-events-none">
                        GIANT: <span className="ml-1">{(powerupTimer / 1000).toFixed(1)}s</span>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="relative border-2 md:border-4 border-[#E7CD78]/20 rounded-xl md:rounded-[3rem] overflow-hidden bg-black shadow-2xl max-w-full">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full h-auto cursor-none bg-[#0a0a20]" />

        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-50 p-6">
             <div className="bg-slate-900/95 p-6 md:p-8 rounded-2xl border border-[#E7CD78] shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
                <Play size={48} className="text-[#E7CD78] mx-auto mb-4 md:mb-6 animate-pulse" />
                <h3 className="text-xl md:text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Cyber Drive</h3>
                <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-6 md:mb-8 leading-relaxed">
                  Avoid the drones. Reach the green beacon at 20,000m.
                </p>
                <button onClick={startSimulation} className="px-10 py-3 bg-[#E7CD78] text-black font-inter font-bold rounded-full hover:scale-105 transition-all text-sm shadow-xl"> 
                   Initialize 
                </button>
             </div>
          </div>
        )}

        {gameState === 'cleared' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-50 p-6">
             <div className="bg-slate-900/95 p-8 rounded-2xl border border-[#E7CD78] shadow-2xl max-w-sm w-full text-center">
                <Trophy size={48} className="text-[#E7CD78] mx-auto mb-6 animate-bounce" />
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Sector Clear</h3>
                <div className="flex flex-col gap-3">
                   <button onClick={startSimulation} className="w-full py-3 bg-white text-black font-inter font-bold rounded-full text-xs">Try Again</button>
                   <button onClick={onMall} className="w-full py-3 bg-[#E7CD78] text-black font-inter font-bold rounded-full text-xs flex items-center justify-center gap-2"><ShoppingBag size={14}/> WonderMall</button>
                </div>
             </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-50 p-6">
             <div className="bg-slate-900/95 p-8 rounded-2xl border border-red-600 shadow-2xl max-w-sm w-full text-center">
                <Skull size={48} className="text-red-600 mx-auto mb-6 animate-pulse" />
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter leading-none text-red-600">Link Severed</h3>
                <button onClick={startSimulation} className="w-full py-3 bg-white text-black font-inter font-bold rounded-full text-xs flex items-center justify-center gap-3">
                  <RefreshCcw size={16} /> Reboot
                </button>
             </div>
          </div>
        )}
      </div>

      {/* MOBILE CONTROLS V22 - Ergonomic Placement */}
      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-between items-end pointer-events-none md:hidden z-50">
          <div className="flex gap-4 pointer-events-auto">
              <button 
                onPointerDown={() => setMobileKey('MobileLeft', true)}
                onPointerUp={() => setMobileKey('MobileLeft', false)}
                onPointerLeave={() => setMobileKey('MobileLeft', false)}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-900/80 backdrop-blur-lg rounded-full border-2 border-zinc-700/50 flex items-center justify-center active:bg-[#E7CD78]/40 active:border-[#E7CD78] transition-all font-inter font-bold"
              >
                <ChevronLeft className="text-[#E7CD78]" size={36} />
              </button>
              <button 
                onPointerDown={() => setMobileKey('MobileRight', true)}
                onPointerUp={() => setMobileKey('MobileRight', false)}
                onPointerLeave={() => setMobileKey('MobileRight', false)}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-900/80 backdrop-blur-lg rounded-full border-2 border-zinc-700/50 flex items-center justify-center active:bg-[#E7CD78]/40 active:border-[#E7CD78] transition-all font-inter font-bold"
              >
                <ChevronRight className="text-[#E7CD78]" size={36} />
              </button>
          </div>
          <div className="pointer-events-auto">
              <button 
                onPointerDown={() => setMobileKey('MobileJump', true)}
                onPointerUp={() => setMobileKey('MobileJump', false)}
                onPointerLeave={() => setMobileKey('MobileJump', false)}
                className="w-20 h-20 sm:w-24 sm:h-24 bg-[#E7CD78]/20 backdrop-blur-lg rounded-full border-2 border-[#E7CD78]/60 flex items-center justify-center active:bg-[#E7CD78]/60 transition-all shadow-[0_0_30px_rgba(231,205,120,0.3)] font-inter font-bold"
              >
                <ArrowUp className="text-[#E7CD78]" size={42} />
              </button>
          </div>
      </div>

      <div className="mt-8 hidden md:flex gap-12 text-zinc-500 font-black uppercase tracking-[0.5em] z-20">
        <div className="flex items-center gap-3 bg-black/40 px-6 py-2 rounded-xl border border-zinc-800">
            <ArrowRight size={18} className="text-[#E7CD78]" />
            <span className="text-[10px]">MOVE</span>
        </div>
        <div className="flex items-center gap-3 bg-black/40 px-6 py-2 rounded-xl border border-zinc-800">
            <ArrowUp size={18} className="text-[#E7CD78]" />
            <span className="text-[10px]">JUMP</span>
        </div>
      </div>
      
      <div className="fixed bottom-2 md:bottom-8 left-1/2 -translate-x-1/2 w-[80%] md:w-[60%] h-1.5 bg-zinc-950 rounded-full overflow-hidden shadow-2xl border border-zinc-900">
        <div className="h-full bg-gradient-to-r from-slate-900 via-[#E7CD78] to-white transition-all duration-300 shadow-[0_0_10px_#E7CD78]" style={{ width: `${(cameraX.current / (LEVEL_WIDTH - CANVAS_WIDTH)) * 100}%` }} />
      </div>
    </div>
  );
};

export default WonderRun;
