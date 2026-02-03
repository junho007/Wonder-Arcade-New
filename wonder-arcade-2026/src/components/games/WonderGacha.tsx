
import React, { useState } from 'react';
import { BackButton } from '../../App';
import { Sparkles, RefreshCcw, Dice6, Palette, MessageCircle } from 'lucide-react';

const PREDICTIONS = [
  "Your aim will be true today.",
  "Avoid Solo Queue at all costs.",
  "A massive win streak is on your horizon.",
  "Check your ping before starting rank.",
  "That skin you want? It will drop soon.",
  "Communicate more; carry the team.",
  "Today is a good day to touch grass, then win.",
  "Your reflex time is at an all-time peak."
];

const ITEMS = [
  "Mechanical Keyboard",
  "Golden Energy Drink",
  "High-Performance Mousepad",
  "Limited Edition Controller",
  "RGB Gaming Chair",
  "Ultra-Wide Monitor",
  "Legendary Weapon Skin",
  "Noise-Canceling Headset"
];

const COLORS = [
  { name: 'Phantom Violet', hex: '#6D28D9' },
  { name: 'Apex Gold', hex: '#E7CD78' },
  { name: 'Health Kit Red', hex: '#EF4444' },
  { name: 'Mana Blue', hex: '#3B82F6' },
  { name: 'Neon Emerald', hex: '#10B981' },
  { name: 'Cyber Punk Pink', hex: '#EC4899' },
];

const WonderGacha: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [result, setResult] = useState<{
    prediction: string;
    item: string;
    color: { name: string, hex: string };
  } | null>(null);

  const handleReveal = () => {
    setIsRevealing(true);
    setResult(null);

    // Simulated "Shake" then show result
    setTimeout(() => {
      const randomPrediction = PREDICTIONS[Math.floor(Math.random() * PREDICTIONS.length)];
      const randomItem = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

      setResult({
        prediction: randomPrediction,
        item: randomItem,
        color: randomColor
      });
      setIsRevealing(false);
    }, 600);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <BackButton onClick={onBack} />

      <header className="mb-16 text-center">
        <h2 className="text-4xl font-extrabold text-white tracking-tighter uppercase">WONDER GACHA</h2>
        <p className="text-zinc-500 uppercase tracking-widest text-sm mt-2">Daily Gaming Fortune Fate</p>
      </header>

      <div className="flex flex-col items-center">
        <div className={`transition-all duration-300 ${isRevealing ? 'animate-bounce' : ''}`}>
          <button
            onClick={handleReveal}
            disabled={isRevealing}
            className={`
              relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 
              ${isRevealing ? 'scale-110 rotate-12' : 'hover:scale-105 active:scale-95'}
              bg-zinc-900 border-4 border-[#E7CD78] gold-glow overflow-hidden
            `}
          >
            <Sparkles className={`w-16 h-16 text-[#E7CD78] ${isRevealing ? 'animate-pulse' : ''}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#E7CD78]/20 to-transparent" />
          </button>
        </div>

        {!result && !isRevealing && (
          <p className="mt-12 text-zinc-500 animate-pulse uppercase tracking-[0.3em] font-bold text-xs">
            Tap to spin your fate
          </p>
        )}

        {isRevealing && (
          <p className="mt-12 text-[#E7CD78] uppercase tracking-[0.3em] font-bold text-lg animate-pulse">
            CALIBRATING DESTINY...
          </p>
        )}

        {result && !isRevealing && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-in zoom-in duration-500">
            <FortuneCard 
              icon={<MessageCircle className="text-[#E7CD78]" />} 
              label="Prediction" 
              value={result.prediction} 
            />
            <FortuneCard 
              icon={<Palette style={{ color: result.color.hex }} />} 
              label="Lucky Color" 
              value={result.color.name} 
              extra={<div className="w-4 h-4 rounded-full mt-2" style={{ backgroundColor: result.color.hex }} />}
            />
            <FortuneCard 
              icon={<Dice6 className="text-[#E7CD78]" />} 
              label="Lucky Item" 
              value={result.item} 
            />
          </div>
        )}

        {result && (
          <button 
            onClick={handleReveal}
            className="mt-16 flex items-center gap-3 text-zinc-500 hover:text-[#E7CD78] transition-colors uppercase tracking-widest text-xs font-bold"
          >
            <RefreshCcw size={14} /> Spin Again
          </button>
        )}
      </div>
    </div>
  );
};

const FortuneCard: React.FC<{ icon: React.ReactNode; label: string; value: string; extra?: React.ReactNode }> = ({ icon, label, value, extra }) => (
  <div className="bg-zinc-900/80 p-8 rounded-3xl border border-zinc-800 flex flex-col items-center text-center shadow-xl hover:border-[#E7CD78]/50 transition-colors">
    <div className="mb-4 p-4 bg-black rounded-2xl border border-zinc-800">
      {icon}
    </div>
    <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">{label}</div>
    <div className="text-white font-bold leading-tight">{value}</div>
    {extra}
  </div>
);

export default WonderGacha;
