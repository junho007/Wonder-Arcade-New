
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from '../../App';
import { Download, Sparkles, Fingerprint, Zap } from 'lucide-react';

const CANVAS_SIZE = 600;

const WonderSigil: React.FC<{ onBack: () => void, onToast: (m: string) => void }> = ({ onBack, onToast }) => {
  const [seed, setSeed] = useState("WCG");
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const rotationRef = useRef(0);

  // Deterministic hash from string
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; 
    }
    return Math.abs(hash);
  };

  const playSFX = (type: 'generate' | 'success') => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'generate') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const drawSigil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const hash = getHash(seed || "WCG");

    // Clear
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Derived Parameters
    const numArms = (hash % 10) + 3; // 3 to 12 arms
    const layers = (hash % 5) + 3; // 3 to 8 layers
    const rotationSpeed = ((hash % 10) + 2) * 0.001;
    const complexity = (hash % 50) + 20;
    const secondaryColor = hash % 2 === 0 ? '#00f3ff' : '#E7CD78';
    
    rotationRef.current += rotationSpeed;

    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.rotate(rotationRef.current);

    for (let i = 0; i < numArms; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 / numArms) * i);

      // Draw mirrored lines for symmetry
      [1, -1].forEach(mirror => {
        ctx.save();
        ctx.scale(1, mirror);

        for (let l = 1; l <= layers; l++) {
          const radius = (CANVAS_SIZE / 2.5) * (l / layers);
          const weight = (layers - l + 1) * 0.5;
          
          ctx.beginPath();
          ctx.lineWidth = weight;
          ctx.strokeStyle = l % 2 === 0 ? '#E7CD78' : secondaryColor;
          ctx.shadowBlur = 15;
          ctx.shadowColor = ctx.strokeStyle;

          // Main Arm Line
          ctx.moveTo(0, 0);
          const x = Math.cos(l * 0.5) * radius;
          const y = Math.sin(l * 0.5) * radius;
          ctx.lineTo(x, y);
          ctx.stroke();

          // Sub-details
          if (l > 1) {
            ctx.beginPath();
            ctx.arc(x, y, (hash % 15) + 2, 0, Math.PI * 2);
            ctx.stroke();

            // Geometric connectors
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - complexity, y + (complexity / 2));
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      ctx.restore();
    }

    // Outer Circle Decor
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E7CD78';
    ctx.setLineDash([10, 20]);
    ctx.arc(0, 0, CANVAS_SIZE / 2.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    frameRef.current = requestAnimationFrame(drawSigil);
  }, [seed]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(drawSigil);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [drawSigil]);

  const handleGenerate = () => {
    setIsGenerating(true);
    playSFX('generate');
    setTimeout(() => {
      setIsGenerating(false);
      onToast("Identity Recalibrated");
    }, 400);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `sigil-${seed || 'WCG'}.png`;
    link.href = canvas.toDataURL();
    link.click();
    playSFX('success');
    onToast("Sigil Encrypted & Saved");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 pt-24 relative overflow-hidden select-none font-sans">
      <BackButton onClick={onBack} />

      <header className="mb-10 text-center z-10">
        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Wonder Sigil</h2>
        <p className="text-[#E7CD78] text-xs font-bold tracking-[0.4em] uppercase opacity-50">Generative Cryptographic Identity</p>
      </header>

      <div className="w-full max-w-2xl bg-zinc-900/40 p-8 rounded-[3rem] border border-zinc-800 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-8 animate-in zoom-in duration-500">
        
        <div className="relative group">
          <canvas 
            ref={canvasRef} 
            width={CANVAS_SIZE} 
            height={CANVAS_SIZE} 
            className={`w-64 h-64 md:w-96 md:h-96 rounded-full border-4 border-[#E7CD78]/10 shadow-[0_0_80px_rgba(231,205,120,0.1)] bg-black transition-all duration-500 ${isGenerating ? 'scale-90 blur-sm grayscale' : 'scale-100'}`}
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#E7CD78]/5 to-transparent pointer-events-none" />
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={48} className="text-[#E7CD78] animate-spin" />
            </div>
          )}
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <label className="block text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black text-center">Identity Data Key</label>
            <div className="relative">
              <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={20} />
              <input 
                type="text" 
                maxLength={20}
                value={seed}
                onChange={(e) => setSeed(e.target.value.toUpperCase())}
                className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-[#E7CD78] font-mono text-xl focus:border-[#E7CD78] outline-none transition-all placeholder:opacity-20"
                placeholder="INPUT ID..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handleGenerate}
              className="py-4 bg-white text-black font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:bg-[#E7CD78] transition-all shadow-xl active:scale-95 text-xs"
            >
              <Zap size={16} fill="currentColor" /> Generate
            </button>
            <button 
              onClick={handleDownload}
              className="py-4 bg-[#E7CD78] text-black font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:bg-white transition-all shadow-xl active:scale-95 text-xs"
            >
              <Download size={16} /> Download
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 text-zinc-600 font-black uppercase tracking-[0.6em] text-[10px] animate-pulse">
        Deterministic Geometry Matrix v1.0
      </div>
    </div>
  );
};

export default WonderSigil;
