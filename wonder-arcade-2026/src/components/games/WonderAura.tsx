
import React, { useState, useEffect, useRef } from 'react';
import { BackButton } from '../../App';
import { Ghost, Sparkles, ChevronRight, Zap, Target, Coffee, ShoppingBag } from 'lucide-react';

type Playstyle = 'Aggressive' | 'Tactical' | 'Chill';
type Range = 'Melee' | 'Sniper' | 'Support';
type Speed = 'Fast' | 'Slow';

interface AuraConfig {
  playstyle: Playstyle;
  range: Range;
  speed: Speed;
}

const ADJECTIVES = ["Crimson", "Ethereal", "Static", "Zenith", "Neon", "Spectral", "Infinite", "Primal"];
const NOUNS = ["Storm", "Void", "Engine", "Pulse", "Wraith", "Blade", "Guardian", "Wanderer"];

const WonderAura: React.FC<{ onBack: () => void, onMall: () => void }> = ({ onBack, onMall }) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<AuraConfig>({ playstyle: 'Chill', range: 'Support', speed: 'Slow' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [auraName, setAuraName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  const startGeneration = () => {
    setIsGenerating(true);
    setAuraName(`${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`);
    setTimeout(() => {
      setStep(4);
      setIsGenerating(false);
    }, 2000);
  };

  useEffect(() => {
    if (step !== 4 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let particles: Particle[] = [];
    const particleCount = config.range === 'Melee' ? 80 : config.range === 'Sniper' ? 40 : 120;
    
    const color = config.playstyle === 'Aggressive' ? '#EF4444' : 
                  config.playstyle === 'Tactical' ? '#3B82F6' : '#10B981';

    class Particle {
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      life: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 5 + 2;
        const speedMult = config.speed === 'Fast' ? 4 : 1;
        this.vx = (Math.random() - 0.5) * speedMult;
        this.vy = (Math.random() - 0.5) * speedMult;
        this.life = Math.random() * 0.5 + 0.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        if (config.range === 'Melee') {
          ctx.moveTo(this.x, this.y - this.size * 2);
          ctx.lineTo(this.x + this.size, this.y);
          ctx.lineTo(this.x, this.y + this.size * 2);
          ctx.lineTo(this.x - this.size, this.y);
          ctx.closePath();
        } else if (config.range === 'Sniper') {
          ctx.moveTo(this.x - 20, this.y);
          ctx.lineTo(this.x + 20, this.y);
        } else {
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        }
        ctx.fillStyle = color;
        ctx.globalAlpha = this.life * 0.5;
        ctx.fill();
        if (config.range === 'Sniper') {
           ctx.strokeStyle = color;
           ctx.stroke();
        }
      }
    }

    const init = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      particles = Array.from({ length: particleCount }, () => new Particle());
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      requestRef.current = requestAnimationFrame(animate);
    };

    init();
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [step, config]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <BackButton onClick={onBack} />

      <header className="mb-12 text-center">
        <h2 className="text-4xl font-extrabold text-white tracking-tighter uppercase italic">Wonder Aura</h2>
        <p className="text-[#E7CD78] uppercase tracking-widest text-xs mt-2 opacity-50">Generative Personality Art</p>
      </header>

      <div className="w-full max-w-xl relative min-h-[500px] flex items-center justify-center">
        {step === 1 && (
          <QuestionStep 
            title="Define your playstyle" 
            options={[
              { id: 'Aggressive', label: 'Aggressive', icon: <Zap />, desc: 'Power & Pressure' },
              { id: 'Tactical', label: 'Tactical', icon: <Target />, desc: 'Strategy & Control' },
              { id: 'Chill', label: 'Chill', icon: <Coffee />, desc: 'Vibe & Support' }
            ]} 
            onSelect={(id) => { setConfig({ ...config, playstyle: id as Playstyle }); setStep(2); }} 
          />
        )}

        {step === 2 && (
          <QuestionStep 
            title="Select your range" 
            options={[
              { id: 'Melee', label: 'Melee', icon: <Zap />, desc: 'Chaos & Impact' },
              { id: 'Sniper', label: 'Sniper', icon: <Target />, desc: 'Precision & Focus' },
              { id: 'Support', label: 'Support', icon: <Sparkles />, desc: 'Harmony & Flow' }
            ]} 
            onSelect={(id) => { setConfig({ ...config, range: id as Range }); setStep(3); }} 
          />
        )}

        {step === 3 && (
          <QuestionStep 
            title="How fast is your mind?" 
            options={[
              { id: 'Fast', label: 'Frenzied', icon: <Zap />, desc: 'High Velocity' },
              { id: 'Slow', label: 'Measured', icon: <Ghost />, desc: 'Calm Floating' }
            ]} 
            onSelect={(id) => { setConfig({ ...config, speed: id as Speed }); startGeneration(); }} 
          />
        )}

        {isGenerating && (
          <div className="flex flex-col items-center gap-6 animate-pulse">
             <div className="w-24 h-24 border-4 border-[#E7CD78] border-t-transparent rounded-full animate-spin" />
             <p className="uppercase tracking-[0.5em] font-black text-[#E7CD78]">Distilling Soul...</p>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center w-full animate-in zoom-in duration-1000">
            <div className="relative w-full aspect-square max-w-md rounded-full overflow-hidden border-4 border-[#E7CD78]/20 shadow-[0_0_100px_rgba(231,205,120,0.1)]">
              <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            
            <div className="mt-8 text-center flex flex-col items-center">
               <p className="text-zinc-600 uppercase text-[10px] tracking-widest font-black mb-1">Your Unique Aura</p>
               <h3 className="text-5xl font-black text-[#E7CD78] uppercase tracking-tighter italic drop-shadow-xl mb-8">{auraName}</h3>
               
               <div className="flex flex-col sm:flex-row gap-4">
                 <button 
                    onClick={() => setStep(1)}
                    className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full hover:border-[#E7CD78] hover:text-[#E7CD78] transition-all text-[10px] font-inter font-bold"
                 >
                   Re-Manifest
                 </button>
                 <button 
                    onClick={onMall}
                    className="px-8 py-3 bg-[#E7CD78] text-black rounded-full hover:scale-105 transition-all text-[10px] font-inter font-bold flex items-center gap-2 shadow-xl"
                 >
                   <ShoppingBag size={14} /> Shop the Look
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface Option { id: string; label: string; icon: React.ReactNode; desc: string; }
const QuestionStep: React.FC<{ title: string; options: Option[]; onSelect: (id: string) => void }> = ({ title, options, onSelect }) => (
  <div className="w-full flex flex-col items-center animate-in slide-in-from-right-10 duration-500">
    <h3 className="text-3xl font-black text-white mb-10 uppercase tracking-tight">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {options.map(opt => (
        <button key={opt.id} onClick={() => onSelect(opt.id)} className="group p-8 bg-[#161616] border border-zinc-800 rounded-3xl hover:border-[#E7CD78] transition-all hover:bg-[#1a1a1a] flex flex-col items-center text-center shadow-lg font-inter font-bold">
          <div className="mb-6 p-4 bg-zinc-900 rounded-2xl group-hover:bg-[#E7CD78] group-hover:text-black transition-colors">{opt.icon}</div>
          <span className="text-xl font-bold text-white mb-1">{opt.label}</span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">{opt.desc}</span>
        </button>
      ))}
    </div>
  </div>
);

export default WonderAura;
