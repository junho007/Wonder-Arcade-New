
import React, { useState, useMemo } from 'react';
import { BackButton } from '../../App';
import { Shield, Target, User, Gamepad2, Medal, Wifi, QrCode } from 'lucide-react';

interface RoleStats {
  aim: number;
  macro: number;
  toxic: number;
  clutch: number;
  luck: number;
}

const ROLES: { id: string; label: string; title: string; icon: React.ReactNode; stats: RoleStats }[] = [
  { 
    id: 'fragger', 
    label: 'Fragger', 
    title: 'The Executioner', 
    icon: <Target className="w-4 h-4" />,
    stats: { aim: 90, macro: 40, toxic: 75, clutch: 60, luck: 50 }
  },
  { 
    id: 'tank', 
    label: 'Tank', 
    title: 'The Meat Shield', 
    icon: <Shield className="w-4 h-4" />,
    stats: { aim: 40, macro: 85, toxic: 30, clutch: 70, luck: 60 }
  },
  { 
    id: 'support', 
    label: 'Support', 
    title: 'The Silent Savior', 
    icon: <User className="w-4 h-4" />,
    stats: { aim: 50, macro: 95, toxic: 10, clutch: 55, luck: 80 }
  },
  { 
    id: 'sniper', 
    label: 'Sniper', 
    title: 'Ghost of the Field', 
    icon: <Target className="w-4 h-4" />,
    stats: { aim: 100, macro: 30, toxic: 50, clutch: 85, luck: 40 }
  },
];

const GAMES = ['Valorant', 'League of Legends', 'Counter-Strike 2', 'Overwatch 2', 'Apex Legends'];

const RadarChart: React.FC<{ stats: RoleStats }> = ({ stats }) => {
  const points = useMemo(() => {
    const keys: (keyof RoleStats)[] = ['aim', 'macro', 'toxic', 'clutch', 'luck'];
    const center = 50;
    const radius = 40;
    
    return keys.map((key, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
      const value = stats[key] / 100;
      const x = center + radius * value * Math.cos(angle);
      const y = center + radius * value * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  }, [stats]);

  return (
    <div className="relative w-32 h-32 opacity-80 group-hover:opacity-100 transition-opacity">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(231,205,120,0.4)]">
        {/* Background Hexagon */}
        <polygon
          points="50,10 88,38 73,83 27,83 12,38"
          className="fill-none stroke-zinc-800 stroke-[0.5]"
        />
        <circle cx="50" cy="50" r="20" className="fill-none stroke-zinc-800 stroke-[0.5]" />
        
        {/* Data Shape */}
        <polygon
          points={points}
          className="fill-[#E7CD78]/40 stroke-[#E7CD78] stroke-1"
        />
        
        {/* Labels (Small) */}
        <text x="50" y="8" textAnchor="middle" className="fill-zinc-600 text-[6px] font-bold uppercase">Aim</text>
        <text x="92" y="38" textAnchor="start" className="fill-zinc-600 text-[6px] font-bold uppercase">Mac</text>
        <text x="75" y="90" textAnchor="middle" className="fill-zinc-600 text-[6px] font-bold uppercase">Tox</text>
        <text x="25" y="90" textAnchor="middle" className="fill-zinc-600 text-[6px] font-bold uppercase">Clu</text>
        <text x="8" y="38" textAnchor="end" className="fill-zinc-600 text-[6px] font-bold uppercase">Luc</text>
      </svg>
    </div>
  );
};

const WonderID: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [ign, setIgn] = useState('PLAYER_ONE');
  const [game, setGame] = useState(GAMES[0]);
  const [role, setRole] = useState(ROLES[0]);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-6xl mx-auto print:p-0 pt-24">
      <div className="print:hidden">
        <BackButton onClick={onBack} />
      </div>

      <header className="mb-12 text-center print:hidden">
        <h2 className="text-4xl font-extrabold text-white tracking-tighter uppercase">Wonder ID <span className="text-[#E7CD78] text-sm align-top ml-2 px-2 py-0.5 border border-[#E7CD78] rounded-md">PRO v2.5</span></h2>
        <p className="text-zinc-500 uppercase tracking-widest text-sm mt-2">Professional Esports Credential</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full items-center">
        {/* Left Side: Inputs */}
        <div className="space-y-8 bg-zinc-900/50 p-10 rounded-3xl gold-border print:hidden">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">In-Game Name</label>
            <input 
              type="text" 
              maxLength={15}
              value={ign}
              onChange={(e) => setIgn(e.target.value.toUpperCase())}
              className="w-full bg-black border border-zinc-800 focus:border-[#E7CD78] outline-none rounded-xl px-5 py-4 text-white font-mono text-xl transition-colors"
              placeholder="YOUR IGN..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Main Game</label>
              <select 
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full bg-black border border-zinc-800 focus:border-[#E7CD78] outline-none rounded-xl px-4 py-4 text-white text-sm transition-colors cursor-pointer appearance-none"
              >
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Preferred Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-inter font-bold transition-all ${
                      role.id === r.id ? 'bg-[#E7CD78] border-[#E7CD78] text-black' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    {r.icon}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Preview */}
        <div className="flex flex-col items-center gap-8 animate-in slide-in-from-right-10 duration-700 w-full">
          {/* THE CARD */}
          <div className="relative w-full aspect-[1.6/1] max-w-[540px] bg-[#0A0A0A] rounded-[2rem] p-10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-[1px] border-[#E7CD78]/30 group transition-all duration-500 hover:shadow-[#E7CD78]/10 hover:border-[#E7CD78]/60">
            
            {/* Texture & Noise Layers */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #FFF, #FFF 1px, transparent 1px, transparent 10px)' }} />
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />

            {/* Holofoil Shine Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none bg-gradient-to-tr from-transparent via-[#E7CD78]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            {/* Content Container */}
            <div className="relative h-full flex flex-col justify-between z-10">
              
              {/* Top Row: Chip, Contactless, Logo */}
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                  {/* EMV CHIP */}
                  <div className="w-12 h-9 bg-gradient-to-br from-[#E7CD78] to-[#B8860B] rounded-md relative overflow-hidden border border-black/20 shadow-inner">
                    <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-black/30" />
                    <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/30" />
                    <div className="absolute inset-2 border border-black/20 rounded-sm" />
                  </div>
                  {/* CONTACTLESS */}
                  <Wifi className="text-[#E7CD78] rotate-90 w-5 h-5 opacity-40 group-hover:opacity-80 transition-opacity" />
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[#E7CD78] font-black text-lg tracking-tighter leading-none">WONDER ARCADE</h4>
                    <Medal className="text-[#E7CD78] w-5 h-5" />
                  </div>
                  <span className="text-zinc-600 text-[8px] uppercase tracking-[0.3em] font-black">Elite License</span>
                  <div className="mt-2 bg-[#E7CD78]/10 border border-[#E7CD78]/20 px-2 py-0.5 rounded text-[8px] text-[#E7CD78] font-bold uppercase">
                    SEA / MYS
                  </div>
                </div>
              </div>

              {/* Middle Row: Name & Role Stats */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <div className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] mb-1 font-bold">PRO GAMER NAME</div>
                  <h3 className="text-4xl font-black text-white font-mono tracking-tighter mb-2 truncate drop-shadow-lg">
                    {ign || 'PLAYER_ONE'}
                  </h3>
                  <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-[#E7CD78] animate-pulse" />
                    <span className="text-zinc-300 text-[10px] font-bold uppercase tracking-widest italic">
                      {role.title}
                    </span>
                  </div>
                </div>
                
                {/* RADAR CHART */}
                <div className="shrink-0">
                  <RadarChart stats={role.stats} />
                </div>
              </div>

              {/* Bottom Row: Game & QR Code */}
              <div className="flex justify-between items-end border-t border-zinc-800/50 pt-6">
                <div className="flex gap-8">
                  <div>
                    <div className="text-zinc-600 text-[8px] uppercase tracking-widest font-black mb-1">Main Discipline</div>
                    <div className="text-zinc-300 text-xs font-bold uppercase tracking-wider">{game}</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 text-[8px] uppercase tracking-widest font-black mb-1">Issue Date</div>
                    <div className="text-zinc-300 text-xs font-mono font-bold tracking-wider">03/2024</div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="p-1 bg-white rounded-sm mb-1 group-hover:scale-105 transition-transform duration-300">
                    <QrCode className="text-black w-8 h-8" />
                  </div>
                  <span className="text-[6px] text-zinc-600 font-bold uppercase tracking-widest">Scan to Verify</span>
                </div>
              </div>
            </div>
            
            {/* Gloss Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-black/20" />
          </div>

          <div className="flex flex-col items-center gap-4 print:hidden">
            <p className="text-zinc-500 text-xs italic font-light tracking-widest text-center max-w-xs">
              This card is a property of WonderMall Security. Unauthorized cloning is strictly prohibited.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={handlePrint}
                className="px-10 py-4 bg-[#E7CD78] text-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-[0_10px_30px_rgba(231,205,120,0.3)] flex items-center gap-3 text-sm font-inter font-bold"
              >
                {isPrinting ? 'Preparing...' : 'Print License'}
              </button>
              <button 
                className="p-4 bg-zinc-900 border border-zinc-800 text-[#E7CD78] rounded-full hover:bg-zinc-800 transition-colors font-inter font-bold"
                title="Save as Image"
              >
                <QrCode size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden Print Layout optimization */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .min-h-screen { min-height: auto !important; height: auto !important; }
          #root > div { background: white !important; }
          .gold-border { border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
};

export default WonderID;
