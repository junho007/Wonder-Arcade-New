
import React, { useState, useEffect, useRef } from 'react';
import { BackButton } from '../../App';
import { Skull, AlertTriangle, Cpu, ShoppingBag } from 'lucide-react';

const GAMES = ["MLBB", "Valorant", "PUBG", "League of Legends", "CS2"];
const ROLES = ["Jungler", "Camper", "Healer", "Feeder", "Fragger", "Lurker"];
const RANKS = ["Bronze", "Silver", "Gold", "Epic", "Legend", "Mythic"];

const OPENERS = [
  "Detecting 0.5 KDA...",
  "System analysis complete...",
  "Oh, look who it is...",
  "Scanning for skill... Error 404.",
  "Preparing to terminate ego...",
  "Initializing burn protocols..."
];

const INSULTS = [
  "You play {role} in {rank}? My grandmother aims better with a rotary phone.",
  "Your map awareness is like my battery life: non-existent.",
  "I've seen bots play better than you in {game}. Truly embarrassing.",
  "You really logged in today just to miss every shot?",
  "Mythic? More like 'Misclick' rank for you.",
  "Your gaming sense is slower than a 56k modem in 1995.",
  "Installing your skill... 0% completed (Stuck forever)."
];

const CLOSERS = [
  "Please uninstall. For everyone's sake.",
  "Go play Candy Crush, it's safer.",
  "My circuits actually hurt watching your gameplay.",
  "GG WP (Get Good, Well Please leave).",
  "Simulation terminated for lack of quality content.",
  "Even the lag feels bad for you."
];

const WonderRoast: React.FC<{ onBack: () => void, onMall: () => void }> = ({ onBack, onMall }) => {
  const [selectedGame, setSelectedGame] = useState(GAMES[0]);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [selectedRank, setSelectedRank] = useState(RANKS[0]);
  const [roastText, setRoastText] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<number | null>(null);

  const generateRoast = () => {
    const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
    const insultTemplate = INSULTS[Math.floor(Math.random() * INSULTS.length)];
    const insult = insultTemplate
      .replace("{role}", selectedRole)
      .replace("{rank}", selectedRank)
      .replace("{game}", selectedGame);
    const closer = CLOSERS[Math.floor(Math.random() * CLOSERS.length)];

    const fullRoast = `${opener}\n\n${insult}\n\n${closer}`;
    setRoastText(fullRoast);
    setDisplayedText("");
    setIsTyping(true);
  };

  useEffect(() => {
    if (isTyping && displayedText.length < roastText.length) {
      timerRef.current = window.setTimeout(() => {
        setDisplayedText(roastText.slice(0, displayedText.length + 1));
      }, 30);
    } else if (displayedText.length === roastText.length) {
      setIsTyping(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTyping, displayedText, roastText]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-4xl mx-auto overflow-hidden bg-[#050505] pt-24">
      <BackButton onClick={onBack} />

      <header className="mb-12 text-center relative z-10">
        <div className="flex items-center justify-center mb-4">
           <Cpu className="w-16 h-16 text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        </div>
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">WONDER <span className="text-red-600">ROAST</span></h2>
        <p className="text-red-400 font-bold uppercase tracking-[0.4em] text-xs mt-2 font-mono drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">Terminal v6.6.6 • Toxic Personality Matrix</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full relative z-10">
        <div className="space-y-6 bg-zinc-900/40 p-8 rounded-2xl border border-red-900/30 backdrop-blur-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-red-700 font-bold mb-2">Primary Target Game</label>
              <select 
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full bg-black border border-red-900/20 text-red-500 font-mono p-3 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              >
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-red-700 font-bold mb-2">Failure Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`p-2 text-[10px] font-inter font-bold border transition-all ${selectedRole === r ? 'bg-red-900/40 border-red-600 text-red-500' : 'bg-black/40 border-zinc-800 text-zinc-600 hover:border-red-900/40'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-red-700 font-bold mb-2">Skill Floor (Rank)</label>
              <select 
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value)}
                className="w-full bg-black border border-red-900/20 text-red-500 font-mono p-3 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
              >
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={generateRoast}
            disabled={isTyping}
            className="w-full py-5 bg-red-600 hover:bg-red-500 text-black font-inter font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(220,38,38,0.2)] group"
          >
            <Skull size={20} className="group-hover:rotate-12 transition-transform" />
            Roast Me
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative flex-1 bg-black border-2 border-red-900/40 rounded-2xl overflow-hidden p-8 font-mono shadow-2xl min-h-[300px]">
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-20" />
            <div className="relative z-10 text-red-500 whitespace-pre-wrap h-full overflow-y-auto no-scrollbar">
              {!roastText && !isTyping && (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-4">
                   <AlertTriangle size={48} />
                   <p className="uppercase tracking-[0.2em] text-sm font-bold">Waiting for input sequence...</p>
                </div>
              )}
              {displayedText}
              {isTyping && <span className="animate-pulse bg-red-600 ml-1 px-1">_</span>}
            </div>
          </div>
          
          {roastText && !isTyping && (
            <button 
              onClick={onMall}
              className="w-full py-4 bg-[#E7CD78] text-black font-inter font-bold rounded-xl transition-all flex items-center justify-center gap-3 hover:scale-[1.02] shadow-xl animate-in slide-in-from-bottom-2"
            >
              <ShoppingBag size={18} />
              Refuel at WonderMall
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WonderRoast;
