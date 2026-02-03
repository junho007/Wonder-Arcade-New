
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BackButton } from '../../App';
import { Coffee, Leaf, Utensils, Flame } from 'lucide-react';

type ButtonType = 'teh' | 'nasi' | 'roti' | 'maggi';

interface ButtonConfig {
  type: ButtonType;
  label: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
}

const BUTTONS: ButtonConfig[] = [
  { type: 'teh', label: 'Teh Tarik', icon: <Coffee />, color: 'bg-[#8B4513]', activeColor: 'bg-[#CD853F]' },
  { type: 'nasi', label: 'Nasi Lemak', icon: <Leaf />, color: 'bg-[#228B22]', activeColor: 'bg-[#32CD32]' },
  { type: 'roti', label: 'Roti Canai', icon: <Utensils />, color: 'bg-[#DAA520]', activeColor: 'bg-[#FFD700]' },
  { type: 'maggi', label: 'Maggi Goreng', icon: <Flame />, color: 'bg-[#B22222]', activeColor: 'bg-[#FF4500]' },
];

const WonderMamak: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [sequence, setSequence] = useState<ButtonType[]>([]);
  const [userSequence, setUserSequence] = useState<ButtonType[]>([]);
  const [activeButton, setActiveButton] = useState<ButtonType | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'playing' | 'gameOver'>('idle');
  const [message, setMessage] = useState('Order up?');
  const sequenceIndex = useRef(0);

  const startNextLevel = useCallback((currentSequence: ButtonType[]) => {
    const nextItem = BUTTONS[Math.floor(Math.random() * BUTTONS.length)].type;
    const newSequence = [...currentSequence, nextItem];
    setSequence(newSequence);
    setGameState('showing');
    setUserSequence([]);
    sequenceIndex.current = 0;
  }, []);

  const playSequence = useCallback(async () => {
    setMessage('Wait...');
    for (let i = 0; i < sequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600 - Math.min(sequence.length * 30, 400)));
      setActiveButton(sequence[i]);
      await new Promise(resolve => setTimeout(resolve, 400));
      setActiveButton(null);
    }
    setGameState('playing');
    setMessage('Your Turn!');
  }, [sequence]);

  useEffect(() => {
    if (gameState === 'showing') {
      playSequence();
    }
  }, [gameState, playSequence]);

  const handleButtonClick = (type: ButtonType) => {
    if (gameState !== 'playing') return;

    setActiveButton(type);
    setTimeout(() => setActiveButton(null), 150);

    const newUserSequence = [...userSequence, type];
    setUserSequence(newUserSequence);

    if (type !== sequence[newUserSequence.length - 1]) {
      setGameState('gameOver');
      setMessage('Aiya! Wrong order!');
      return;
    }

    if (newUserSequence.length === sequence.length) {
      setGameState('idle');
      setMessage('Correct!');
      setTimeout(() => startNextLevel(sequence), 1000);
    }
  };

  const resetGame = () => {
    startNextLevel([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <BackButton onClick={onBack} />

      <header className="mb-12 text-center">
        <h2 className="text-4xl font-extrabold text-white tracking-tighter uppercase">Wonder Mamak</h2>
        <p className="text-zinc-500 uppercase tracking-widest text-sm mt-2 font-mono">Memory Challenge</p>
      </header>

      <div className="flex flex-col items-center gap-8 w-full">
        <div className="bg-zinc-900/80 px-8 py-4 rounded-full border border-zinc-800 gold-glow min-w-[200px] text-center">
          <p className={`text-xl font-bold uppercase tracking-widest ${gameState === 'gameOver' ? 'text-red-500' : 'text-[#E7CD78]'}`}>
            {message}
          </p>
          {gameState !== 'idle' && gameState !== 'gameOver' && (
            <p className="text-xs text-zinc-500 mt-1 uppercase font-mono">Score: {sequence.length}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 w-full max-w-[400px]">
          {BUTTONS.map((btn) => (
            <button
              key={btn.type}
              onClick={() => handleButtonClick(btn.type)}
              disabled={gameState !== 'playing'}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-3xl border-2 border-transparent transition-all duration-150
                ${activeButton === btn.type ? `${btn.activeColor} scale-105 shadow-2xl brightness-125` : `${btn.color} opacity-80 hover:opacity-100`}
                shadow-lg group
              `}
            >
              <div className={`p-4 rounded-full bg-black/20 mb-3 group-hover:scale-110 transition-transform ${activeButton === btn.type ? 'animate-pulse' : ''}`}>
                {btn.icon}
              </div>
              <span className="font-black uppercase tracking-widest text-xs text-white drop-shadow-md">
                {btn.label}
              </span>
            </button>
          ))}
        </div>

        {gameState === 'idle' && (
          <button
            onClick={resetGame}
            className="px-12 py-4 bg-[#E7CD78] text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest shadow-xl"
          >
            Start Ordering
          </button>
        )}

        {gameState === 'gameOver' && (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
            <p className="text-white text-3xl font-black font-mono">SCORE: {sequence.length - 1}</p>
            <button
              onClick={resetGame}
              className="px-12 py-4 bg-[#E7CD78] text-black font-black rounded-full hover:scale-105 transition-transform uppercase tracking-widest"
            >
              Try Again Boss?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WonderMamak;
