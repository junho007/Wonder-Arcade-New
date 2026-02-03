
import React, { useState, useEffect, useRef } from 'react';
import { BackButton } from '../../App';
import { Sparkles, RefreshCcw, HelpCircle, Cpu, Send, ArrowRight, Terminal } from 'lucide-react';

type FateStatus = 'idle' | 'thinking' | 'revealed';

interface FateAnswer {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

const ANSWERS: FateAnswer[] = [
  // YES - GOLD
  { text: "ABSOLUTELY", type: 'positive' },
  { text: "THE SYSTEM AGREES", type: 'positive' },
  { text: "YES", type: 'positive' },
  { text: "PROCEED", type: 'positive' },
  { text: "DESTINY CONFIRMED", type: 'positive' },
  
  // NO - RED
  { text: "NO", type: 'negative' },
  { text: "IMPOSSIBLE", type: 'negative' },
  { text: "ACCESS DENIED", type: 'negative' },
  { text: "DON'T DO IT", type: 'negative' },
  { text: "FATAL ERROR", type: 'negative' },
  
  // MAYBE - CYAN
  { text: "UNCERTAIN", type: 'neutral' },
  { text: "ASK AGAIN", type: 'neutral' },
  { text: "DATA HAZZY", type: 'neutral' },
  { text: "UNKNOWN VARIABLE", type: 'neutral' }
];

const WonderFate: React.FC<{ onBack: () => void, onToast: (m: string) => void }> = ({ onBack, onToast }) => {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<FateStatus>('idle');
  const [answer, setAnswer] = useState<FateAnswer | null>(null);
  const [errorShake, setErrorShake] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio Engine
  const playSFX = (type: 'type' | 'thinking' | 'reveal' | 'error') => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'type') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000 + Math.random() * 500, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    } else if (type === 'thinking') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 2);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    } else if (type === 'reveal') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  const drawEye = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    const centerX = w / 2;
    const centerY = h / 2;
    const time = Date.now();
    
    let rotStep = status === 'thinking' ? 0.15 : 0.01;
    rotationRef.current += rotStep;
    
    ctx.save();
    ctx.translate(centerX, centerY);

    const scale = status === 'thinking' ? 1.15 : 1 + Math.sin(time / 800) * 0.05;
    ctx.scale(scale, scale);

    const rings = [50, 75, 100];
    rings.forEach((r, i) => {
      ctx.save();
      ctx.rotate(rotationRef.current * (i % 2 === 0 ? 1 : -1));
      ctx.strokeStyle = '#E7CD78';
      ctx.lineWidth = 1;
      ctx.setLineDash([15, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = '#E7CD78';
      for(let j=0; j<4; j++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.arc(r, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    const corePulse = 20 + Math.sin(time / 200) * 8;
    ctx.fillStyle = '#E7CD78';
    ctx.shadowBlur = status === 'thinking' ? 60 : 30;
    ctx.shadowColor = '#E7CD78';
    ctx.beginPath();
    ctx.arc(0, 0, corePulse, 0, Math.PI * 2);
    ctx.fill();

    if (status === 'thinking') {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#FFF';
      ctx.fillRect((Math.random()-0.5)*120, (Math.random()-0.5)*120, 50, 2);
    }

    ctx.restore();
    requestRef.current = requestAnimationFrame(drawEye);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawEye);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [status]);

  const handleConsult = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (status === 'thinking' || status === 'revealed') return;

    if (!question.trim()) {
      setErrorShake(true);
      playSFX('error');
      setTimeout(() => setErrorShake(false), 500);
      onToast("Question Required");
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setStatus('thinking');
    playSFX('thinking');

    setTimeout(() => {
      const res = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
      setAnswer(res);
      setStatus('revealed');
      playSFX('reveal');
      onToast("Matrix Response Received");
    }, 2000);
  };

  const reset = () => {
    setStatus('idle');
    setAnswer(null);
    setQuestion("");
    onToast("System Ready");
  };

  const handleInputFocus = () => {
    if (status === 'revealed') {
      reset();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 pt-16 relative overflow-hidden select-none font-inter font-bold">
      <BackButton onClick={onBack} />

      {/* HEADER - Reduced margin */}
      <header className="mb-6 text-center z-20 animate-in fade-in duration-1000">
        <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[1em] mb-2 flex items-center justify-center gap-2">
          <Sparkles size={12} className="text-[#E7CD78]" /> Wonder Fate
        </h2>
        <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase leading-none">The System Oracle</h1>
      </header>

      {/* MAIN VISUALIZATION AREA - MORPHING - Reduced size and margin */}
      <div className="relative w-full max-w-lg aspect-square flex items-center justify-center mb-6">
        
        {/* State A: THE EYE - Visible in Idle/Thinking */}
        <div className={`absolute transition-all duration-700 ease-in-out transform ${status === 'revealed' ? 'opacity-0 scale-50 blur-3xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
          <canvas 
            ref={canvasRef} 
            width={500} 
            height={500} 
            className="w-full max-w-[320px] h-auto drop-shadow-[0_0_40px_rgba(231,205,120,0.2)]"
          />
        </div>

        {/* State B: THE ANSWER - Visible in Revealed */}
        {status === 'revealed' && answer && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500">
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">The Matrix Replies:</p>
            <h3 
              className={`text-4xl md:text-6xl font-black uppercase tracking-tighter italic transition-all duration-500 leading-tight
                ${answer.type === 'positive' ? 'text-[#E7CD78] drop-shadow-[0_0_25px_#E7CD78]' : 
                  answer.type === 'negative' ? 'text-red-500 drop-shadow-[0_0_25px_#ef4444]' : 
                  'text-cyan-400 drop-shadow-[0_0_25px_#22d3ee]'}`}
            >
              {answer.text}
            </h3>
            <div className="mt-8">
              <button 
                onClick={reset}
                className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all text-sm font-inter font-bold border border-zinc-800 px-8 py-3 rounded-full hover:border-[#E7CD78] hover:bg-zinc-900 group"
              >
                <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Consult Again
              </button>
            </div>
          </div>
        )}

        {/* PROGRESS BAR (Thinking) */}
        {status === 'thinking' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-pulse">
            <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-[#E7CD78] animate-progress shadow-[0_0_10px_#E7CD78]" style={{ width: '45%' }} />
            </div>
            <p className="text-[#E7CD78] text-[9px] font-black uppercase tracking-[0.8em] mt-3">Computing Probability...</p>
          </div>
        )}
      </div>

      {/* INPUT AREA - Tighter spacing */}
      <div className={`w-full max-w-lg z-20 flex flex-col items-center transition-all duration-500 ${status === 'revealed' ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        <form onSubmit={handleConsult} className={`w-full relative group transition-transform ${errorShake ? 'animate-shake' : ''}`}>
          <div className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-300 ${status === 'revealed' ? 'text-zinc-800' : 'text-zinc-700 group-focus-within:text-[#E7CD78]'}`}>
            <HelpCircle size={22} />
          </div>
          <input 
            ref={inputRef}
            type="text" 
            value={question}
            onFocus={handleInputFocus}
            onChange={(e) => { setQuestion(e.target.value.toUpperCase()); if(status === 'idle') playSFX('type'); }}
            disabled={status === 'thinking'}
            className="w-full bg-[#0a0a0a] border-2 rounded-[1.25rem] py-5 pl-16 pr-6 text-white text-lg font-bold placeholder:text-zinc-800 outline-none transition-all duration-300 uppercase tracking-wide border-zinc-800 focus:border-[#E7CD78] hover:border-[#E7CD78] focus:shadow-[0_0_20px_rgba(231,205,120,0.15)] hover:shadow-[0_0_15px_rgba(231,205,120,0.1)] disabled:opacity-50"
            placeholder="Type your inquiry..."
          />
        </form>

        <div className="w-full mt-4">
          <button 
            onClick={() => handleConsult()}
            disabled={status === 'thinking' || status === 'revealed'}
            className={`w-full py-5 rounded-[1.25rem] font-inter font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98]
              ${status === 'thinking' ? 'bg-zinc-900 text-zinc-600 cursor-allowed' : 
                'bg-[#E7CD78] text-black hover:bg-white hover:text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]'}`}
          >
            {status === 'thinking' ? (
              <>
                <Cpu size={20} className="animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                Consult the System <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* FOOTER - Reduced margin */}
      <footer className="mt-10 flex flex-col items-center gap-2 text-zinc-800 font-black uppercase tracking-[0.6em] text-[8px]">
        <div className="flex items-center gap-3">
          <Terminal size={12} /> 
          <span>Kernel Sync: Established</span>
        </div>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-12px); }
          40% { transform: translateX(12px); }
          60% { transform: translateX(-12px); }
          80% { transform: translateX(12px); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out infinite;
        }
        .animate-progress {
          animation: progress 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default WonderFate;
