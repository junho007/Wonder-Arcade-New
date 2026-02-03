
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from '../../App';
import { Microscope, Play, RotateCcw, Zap, Target, Trash2, MousePointer2, Sparkles, Activity, Cpu } from 'lucide-react';

// --- CONFIG ---
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const POPULATION_SIZE = 50;
const LIFESPAN = 400; // frames
const MUTATION_RATE = 0.02;
const TARGET_RADIUS = 25;

interface Vector { x: number; y: number; }
interface DNA { instructions: Vector[]; }
interface Dot {
  pos: Vector;
  vel: Vector;
  acc: Vector;
  dna: DNA;
  fitness: number;
  dead: boolean;
  reachedTarget: boolean;
  isBest: boolean;
  path: Vector[];
}

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const WonderLab: React.FC<{ onBack: () => void, onToast: (m: string) => void }> = ({ onBack, onToast }) => {
  const [generation, setGeneration] = useState(1);
  const [bestFitness, setBestFitness] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // State Refs
  const population = useRef<Dot[]>([]);
  const lastBestPath = useRef<Vector[]>([]);
  const frameCount = useRef(0);
  const walls = useRef<Wall[]>([]);
  const target = useRef<Vector>({ x: CANVAS_WIDTH / 2, y: 70 });
  const startPos = useRef<Vector>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60 });
  
  // Interaction
  const isDrawing = useRef(false);
  const currentWall = useRef<Wall | null>(null);
  const requestRef = useRef<number | null>(null);

  // --- AUDIO ---
  const playSFX = (type: 'crash' | 'evolve' | 'success') => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else if (type === 'evolve') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  // --- GENETICS ---
  const createRandomDNA = (): DNA => ({
    instructions: Array.from({ length: LIFESPAN }, () => {
      const angle = Math.random() * Math.PI * 2;
      const mag = 0.45; // Fixed push magnitude
      return { x: Math.cos(angle) * mag, y: Math.sin(angle) * mag };
    })
  });

  const createDot = (dna?: DNA): Dot => ({
    pos: { ...startPos.current },
    vel: { x: 0, y: 0 },
    acc: { x: 0, y: 0 },
    dna: dna || createRandomDNA(),
    fitness: 0,
    dead: false,
    reachedTarget: false,
    isBest: false,
    path: []
  });

  const initPopulation = () => {
    population.current = Array.from({ length: POPULATION_SIZE }, () => createDot());
    lastBestPath.current = [];
    frameCount.current = 0;
    setGeneration(1);
    setBestFitness(0);
  };

  // Fix: Added missing resetGen function
  const resetGen = () => {
    initPopulation();
    setIsSimulating(false);
    playSFX('evolve');
    onToast("Genome Wiped");
  };

  // Fix: Added missing clearWalls function
  const clearWalls = () => {
    walls.current = [];
    playSFX('crash');
    onToast("Arena Cleared");
  };

  const calculateFitness = (dot: Dot) => {
    const dx = dot.pos.x - target.current.x;
    const dy = dot.pos.y - target.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Fitness calculation: 1 / distance squared, with massive rewards for success
    let fit = 1 / (dist + 1); // Avoid division by zero
    
    if (dot.reachedTarget) {
      // Reward finishing and reward doing it FAST
      fit = 100 + (LIFESPAN - dot.path.length);
    } else if (dot.dead) {
      fit *= 0.1; // Heavy penalty for crashing
    }
    dot.fitness = fit;
  };

  const evolve = () => {
    let totalFitness = 0;
    let maxFit = 0;
    let bestDotIdx = 0;

    population.current.forEach((dot, i) => {
      calculateFitness(dot);
      totalFitness += dot.fitness;
      if (dot.fitness > maxFit) {
        maxFit = dot.fitness;
        bestDotIdx = i;
      }
    });

    const normalizedFitness = Math.min(100, Math.floor((maxFit / 150) * 100));
    setBestFitness(normalizedFitness);
    lastBestPath.current = population.current[bestDotIdx].path;

    const newPop: Dot[] = [];
    
    // Elite Cloning
    const eliteDNA = JSON.parse(JSON.stringify(population.current[bestDotIdx].dna));
    const elite = createDot(eliteDNA);
    elite.isBest = true;
    newPop.push(elite);

    // Mating Pool selection
    while (newPop.length < POPULATION_SIZE) {
      let r = Math.random() * totalFitness;
      let parent: Dot = population.current[0];
      for (const dot of population.current) {
        r -= dot.fitness;
        if (r <= 0) {
          parent = dot;
          break;
        }
      }

      // Clone & Mutate
      const childDNA: DNA = JSON.parse(JSON.stringify(parent.dna));
      childDNA.instructions.forEach((ins, idx) => {
        if (Math.random() < MUTATION_RATE) {
          const angle = Math.random() * Math.PI * 2;
          childDNA.instructions[idx] = { x: Math.cos(angle) * 0.45, y: Math.sin(angle) * 0.45 };
        }
      });
      newPop.push(createDot(childDNA));
    }

    population.current = newPop;
    frameCount.current = 0;
    setGeneration(g => g + 1);
    playSFX('evolve');
  };

  const linePointDist = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
    let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((x - (x1 + t * (x2 - x1))) ** 2 + (y - (y1 + t * (y2 - y1))) ** 2);
  };

  const updateSim = useCallback(() => {
    if (!isSimulating) return;

    for (let s = 0; s < simSpeed; s++) {
      if (frameCount.current >= LIFESPAN) {
        evolve();
        break;
      }

      let allDead = true;
      population.current.forEach(dot => {
        if (!dot.dead && !dot.reachedTarget) {
          allDead = false;
          const acc = dot.dna.instructions[frameCount.current];
          dot.vel.x += acc.x;
          dot.vel.y += acc.y;
          
          // Max Velocity
          const speed = Math.sqrt(dot.vel.x ** 2 + dot.vel.y ** 2);
          const maxSpeed = 4.5;
          if (speed > maxSpeed) {
            dot.vel.x = (dot.vel.x / speed) * maxSpeed;
            dot.vel.y = (dot.vel.y / speed) * maxSpeed;
          }

          dot.pos.x += dot.vel.x;
          dot.pos.y += dot.vel.y;
          dot.path.push({ ...dot.pos });

          // Collisions
          walls.current.forEach(w => {
            if (linePointDist(dot.pos.x, dot.pos.y, w.x1, w.y1, w.x2, w.y2) < 5) {
              dot.dead = true;
              playSFX('crash');
            }
          });

          if (dot.pos.x < 0 || dot.pos.x > CANVAS_WIDTH || dot.pos.y < 0 || dot.pos.y > CANVAS_HEIGHT) {
            dot.dead = true;
          }

          const dx = dot.pos.x - target.current.x;
          const dy = dot.pos.y - target.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < TARGET_RADIUS) {
            dot.reachedTarget = true;
            playSFX('success');
            onToast("DATA CORE ACCESSED");
          }
        }
      });

      if (allDead) {
        evolve();
      }

      frameCount.current++;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // UI Grid
      ctx.strokeStyle = 'rgba(231, 205, 120, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_WIDTH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
      }

      // Draw Previous Best Path (Ghost Trail)
      if (lastBestPath.current.length > 0) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startPos.current.x, startPos.current.y);
        lastBestPath.current.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Walls (Energy Barriers)
      ctx.lineWidth = 4;
      walls.current.forEach(w => {
        ctx.strokeStyle = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
        // Endpoints
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(w.x1, w.y1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w.x2, w.y2, 3, 0, Math.PI * 2); ctx.fill();
      });
      if (currentWall.current) {
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(currentWall.current.x1, currentWall.current.y1); ctx.lineTo(currentWall.current.x2, currentWall.current.y2); ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Draw Target (Neural Core)
      ctx.save();
      ctx.translate(target.current.x, target.current.y);
      ctx.rotate(Date.now() / 1000);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for(let i=0; i<6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const x = Math.cos(angle) * TARGET_RADIUS;
        const y = Math.sin(angle) * TARGET_RADIUS;
        if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      ctx.shadowBlur = 20; ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.fill();
      ctx.restore();

      // Draw Agents (Drones)
      population.current.forEach(dot => {
        if (dot.reachedTarget) return; 
        
        ctx.save();
        ctx.translate(dot.pos.x, dot.pos.y);
        const angle = Math.atan2(dot.vel.y, dot.vel.x);
        ctx.rotate(angle + Math.PI / 2);
        
        const agentColor = dot.isBest ? '#10b981' : dot.dead ? '#4b1515' : '#E7CD78';
        ctx.fillStyle = agentColor;
        if (dot.isBest) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#10b981';
        }
        
        // Ship Shape
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 7);
        ctx.lineTo(-5, 7);
        ctx.closePath();
        ctx.fill();
        
        // Engine Glow if alive
        if(!dot.dead) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.6;
            ctx.fillRect(-2, 5, 4, 3);
        }
        
        ctx.restore();
      });
    }

    requestRef.current = requestAnimationFrame(updateSim);
  }, [isSimulating, simSpeed, onToast]);

  useEffect(() => {
    initPopulation();
    requestRef.current = requestAnimationFrame(updateSim);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  useEffect(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(updateSim);
  }, [updateSim]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    isDrawing.current = true;
    currentWall.current = { x1: x, y1: y, x2: x, y2: y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current || !currentWall.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    currentWall.current.x2 = e.clientX - rect.left;
    currentWall.current.y2 = e.clientY - rect.top;
  };

  const handleMouseUp = () => {
    if (currentWall.current) {
        const dx = currentWall.current.x2 - currentWall.current.x1;
        const dy = currentWall.current.y2 - currentWall.current.y1;
        if (Math.sqrt(dx*dx + dy*dy) > 10) walls.current.push(currentWall.current);
    }
    isDrawing.current = false;
    currentWall.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 pt-24 relative overflow-hidden select-none">
      <BackButton onClick={onBack} />

      <header className="mb-6 text-center z-10 w-full flex flex-col items-center">
        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2 flex items-center gap-3">
          <Activity className="text-[#E7CD78]" />
          Wonder Evolution
        </h2>
        
        <div className="flex gap-6 md:gap-12 items-center justify-center bg-zinc-900/50 px-8 py-4 rounded-3xl border border-zinc-800 backdrop-blur-md">
            <div className="text-center">
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Iteration</p>
                <p className="text-2xl font-bold text-[#E7CD78]">{generation}</p>
            </div>
            <div className="text-center">
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Neural Sync</p>
                <p className="text-2xl font-bold text-white">{bestFitness}%</p>
            </div>
            <div className="text-center">
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Speed</p>
                <p className="text-2xl font-bold text-[#E7CD78]">{simSpeed}x</p>
            </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-6xl">
        
        {/* SIMULATION ARENA */}
        <div className="relative border-4 border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl bg-black group">
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            className="max-w-full h-auto cursor-crosshair block"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
          
          {/* Lifespan Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-900/50 overflow-hidden">
             <div 
               className="h-full bg-[#E7CD78] transition-all duration-100 ease-linear shadow-[0_0_10px_#E7CD78]" 
               style={{ width: `${(frameCount.current / LIFESPAN) * 100}%` }} 
             />
          </div>

          {!isSimulating && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-20 p-8 text-center">
               <Cpu size={64} className="text-[#E7CD78] mb-6 animate-pulse" />
               <h3 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tighter">Evolution Protocol</h3>
               <p className="text-zinc-400 text-sm max-w-xs mb-10 leading-relaxed font-medium">
                 Watch a swarm of drones use <span className="text-[#E7CD78] font-bold">Genetic Algorithms</span> to learn how to reach the data core.
               </p>
               <button onClick={() => setIsSimulating(true)} className="group bg-[#E7CD78] text-black px-12 py-5 rounded-full font-inter font-bold flex items-center gap-4 shadow-[0_0_30px_rgba(231,205,120,0.3)] transition-all hover:scale-105 active:scale-95 text-sm">
                 <Play fill="currentColor" size={20} /> Start Training
               </button>
               <div className="mt-8 flex items-center gap-3 text-zinc-500 text-[10px] uppercase font-bold tracking-[0.3em]">
                  <MousePointer2 size={12} /> Drag to place energy walls
               </div>
            </div>
          )}
        </div>

        {/* SIDEBAR PANEL */}
        <div className="flex flex-col gap-6 w-full lg:w-80">
           <div className="bg-zinc-900/60 p-6 rounded-[2rem] border border-zinc-800 backdrop-blur-xl">
              <h4 className="text-zinc-500 font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
                <Zap size={14} className="text-[#E7CD78]" /> Lab Controls
              </h4>
              
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-3 text-zinc-400">
                    <span className="tracking-widest">Temporal Warp</span>
                    <span className="text-[#E7CD78]">{simSpeed}x</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" 
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#E7CD78]"
                  />
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`w-full py-4 rounded-2xl font-inter font-bold transition-all text-xs flex items-center justify-center gap-3 ${
                        isSimulating ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-[#E7CD78] text-black shadow-lg'
                    }`}
                  >
                    {isSimulating ? "Pause Matrix" : "Resume Matrix"}
                  </button>
                  <button 
                    onClick={resetGen}
                    className="w-full py-4 border border-zinc-800 text-zinc-500 font-inter font-bold rounded-2xl flex items-center justify-center gap-3 text-xs hover:text-white hover:border-white transition-all"
                  >
                    <RotateCcw size={16} /> Wipe Genome
                  </button>
                  <button 
                    onClick={clearWalls}
                    className="w-full py-4 border border-zinc-800 text-red-500/80 font-inter font-bold rounded-2xl flex items-center justify-center gap-3 text-xs hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                  >
                    <Trash2 size={16} /> Clear Arena
                  </button>
                </div>
              </div>
           </div>

           <div className="bg-zinc-900/60 p-6 rounded-[2rem] border border-zinc-800 backdrop-blur-xl">
              <h4 className="text-zinc-500 font-black uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-[#E7CD78]" /> Machine Learning 101
              </h4>
              <div className="space-y-4">
                 <FeatureInfo label="Selection" text="Only the closest drones get to reproduce." />
                 <FeatureInfo label="Mutation" text="Small random changes help discover new paths." />
                 <FeatureInfo label="Lineage" text="The green drone is the 'Elite' from last gen." />
              </div>
           </div>
        </div>
      </div>

      <div className="mt-8 text-zinc-700 font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">
        Wonder Neural Network v11.4 • Sandbox Mode
      </div>
    </div>
  );
};

const FeatureInfo: React.FC<{ label: string, text: string }> = ({ label, text }) => (
    <div className="space-y-1">
        <p className="text-[10px] text-white font-black uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{text}</p>
    </div>
);

export default WonderLab;
