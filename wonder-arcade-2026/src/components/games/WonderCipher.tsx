
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from '../../App';
import { Shield, Lock, Terminal, Copy, RefreshCcw, Zap } from 'lucide-react';

const GRID_COLS = 32;
const GRID_ROWS = 12;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

const WonderCipher: React.FC<{ onBack: () => void, onToast: (m: string) => void }> = ({ onBack, onToast }) => {
  const [input, setInput] = useState("");
  const [isScrambling, setIsScrambling] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- AUDIO ENGINE ---
  const playClick = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500 + Math.random() * 500, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  const playScramble = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    noise.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  };

  // --- LOGIC ---
  const getBits = useCallback((text: string) => {
    let bits = "";
    for (let i = 0; i < text.length; i++) {
      bits += text.charCodeAt(i).toString(2).padStart(8, '0');
    }
    return bits.padEnd(TOTAL_CELLS, '0').split('').slice(0, TOTAL_CELLS);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    if (val.length < input.length || input === "") {
        playScramble();
        setIsScrambling(true);
        setTimeout(() => setIsScrambling(false), 300);
    } else {
        playClick();
    }
    setInput(val);
  };

  const handleCopy = () => {
    const hex = input.split('').map(c => c.charCodeAt(0).toString(16).toUpperCase()).join(' ');
    navigator.clipboard.writeText(hex || "00");
    playScramble();
    onToast("HEX TRANSMISSION COPIED");
  };

  const bitArray = getBits(input);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 pt-24 relative overflow-hidden select-none">
      <BackButton onClick={onBack} />

      {/* BACKGROUND DECOR */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E7CD78 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <header className="mb-10 text-center z-10">
        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2 flex items-center justify-center gap-4">
          <Shield className="text-[#E7CD78]" size={32} />
          Wonder Cipher
        </h2>
        <div className="flex gap-6 items-center justify-center text-[10px] font-black uppercase tracking-[0.4em]">
            <span className="flex items-center gap-2 text-[#E7CD78] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E7CD78]" /> Encryption Level: High
            </span>
            <span className="text-zinc-600 flex items-center gap-2">
                <Lock size={12} /> Secure Connection Established
            </span>
        </div>
      </header>

      <div className="w-full max-w-4xl bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-8 animate-in zoom-in duration-500">
        
        {/* DATA VISUALIZER GRID */}
        <div 
          className="grid gap-1.5 bg-black/50 p-6 rounded-2xl border border-zinc-800 shadow-inner overflow-hidden w-full h-auto min-h-[300px]"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
        >
          {bitArray.map((bit, idx) => {
            const isActive = bit === '1';
            const randomActive = isScrambling ? Math.random() > 0.5 : isActive;
            
            return (
              <div 
                key={idx}
                className={`
                  aspect-square rounded-[2px] transition-all duration-300 transform
                  ${randomActive 
                    ? 'bg-[#E7CD78] shadow-[0_0_8px_#E7CD78] scale-100' 
                    : 'bg-zinc-900/50 scale-[0.85]'}
                  hover:bg-[#00f3ff] hover:shadow-[0_0_12px_#00f3ff] hover:z-10 hover:scale-125
                `}
              />
            );
          })}
        </div>

        {/* CONTROLS */}
        <div className="w-full flex flex-col gap-6 max-w-2xl">
          <div className="space-y-4">
            <label className="block text-[12px] text-zinc-400 uppercase tracking-[0.4em] font-black text-center">Transmission Input Module</label>
            <div className="relative">
              <Terminal className="absolute left-6 top-1/2 -translate-y-1/2 text-[#E7CD78] opacity-60" size={24} />
              <input 
                type="text" 
                maxLength={48}
                value={input}
                onChange={handleInput}
                className="w-full bg-black border-2 border-zinc-800 rounded-[2rem] py-6 pl-16 pr-8 text-[#E7CD78] text-2xl focus:border-[#E7CD78] outline-none transition-all placeholder:text-zinc-600 placeholder:opacity-100 uppercase tracking-widest font-bold shadow-inner"
                placeholder="INPUT DATA SEQUENCE..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => { setInput(""); playScramble(); setIsScrambling(true); setTimeout(() => setIsScrambling(false), 500); }}
              className="flex-1 py-4 bg-zinc-900 text-zinc-400 font-inter font-bold rounded-full border border-zinc-800 hover:text-white hover:border-white transition-all flex items-center justify-center gap-3 text-xs"
            >
              <RefreshCcw size={16} /> Reset Matrix
            </button>
            <button 
              onClick={handleCopy}
              className="flex-1 py-4 bg-[#E7CD78] text-black font-inter font-bold rounded-full flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl text-xs"
            >
              <Copy size={16} /> Copy Hex Data
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center gap-10">
        <div className="flex flex-col items-center">
             <p className="text-zinc-600 font-black uppercase tracking-[0.6em] text-[10px] animate-pulse">Encoding Algorithm v4.22</p>
        </div>
      </div>

      <style>{`
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        .animate-glitch {
          animation: glitch 0.2s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default WonderCipher;
