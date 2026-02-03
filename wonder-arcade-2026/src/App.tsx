
import React, { useState, useEffect } from 'react';
import { LayoutGrid, Layers, CreditCard, Sparkles, ChevronLeft, Target, Music, Zap, Skull, Ghost, Play, ShoppingBag, Fingerprint, Shield, History, Eye, Brain, HelpCircle } from 'lucide-react';
import { AppView, ChallengeData } from './types';
import Wonder2048 from './components/games/Wonder2048';
import WonderStack from './components/games/WonderStack';
import WonderID from './components/games/WonderID';
import WonderAnthem from './components/games/WonderAnthem';
import WonderAPM from './components/games/WonderAPM';
import WonderSigil from './components/games/WonderSigil';
import WonderAura from './components/games/WonderAura';
import WonderRun from './components/games/WonderRun';
import WonderCipher from './components/games/WonderCipher';
import WonderEcho from './components/games/WonderEcho';
import WonderOracle from './components/games/WonderOracle';
import WonderFate from './components/games/WonderFate';

const WONDERMALL_URL = "https://www.wcg2u.com/home";

export const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="fixed top-4 left-4 sm:top-6 sm:left-6 z-[150] flex items-center gap-2 bg-[#161616]/90 backdrop-blur-md border border-zinc-800 text-[#E7CD78] px-3 py-2 sm:px-5 sm:py-2.5 rounded-full hover:bg-zinc-800 transition-all font-inter font-bold text-[10px] sm:text-[11px] group shadow-2xl"
  >
    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
    <span className="hidden sm:inline">Back to Menu</span>
    <span className="sm:hidden">Back</span>
  </button>
);

const WonderMallButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[150] flex items-center gap-2 bg-[#161616]/90 backdrop-blur-md border border-[#E7CD78]/30 text-[#E7CD78] px-3 py-2 sm:px-5 sm:py-2.5 rounded-full hover:bg-[#E7CD78] hover:text-black hover:border-[#E7CD78] transition-all font-inter font-bold text-[10px] sm:text-[11px] group shadow-2xl"
  >
    <ShoppingBag size={14} />
    <span className="hidden sm:inline">Wonder Mall</span>
    <span className="sm:hidden">Mall</span>
  </button>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('menu');
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const user = params.get('user');
    const score = params.get('score');

    if (mode === 'challenge' && user && score) {
      setChallenge({
        mode: 'challenge',
        user,
        score: parseInt(score, 10)
      });
    }
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleMallRedirect = () => {
    window.open(WONDERMALL_URL, '_blank');
  };

  const renderView = () => {
    switch (currentView) {
      case '2048':
        return <Wonder2048 onBack={() => setCurrentView('menu')} challenge={challenge} onToast={showToast} onMall={handleMallRedirect} />;
      case 'stack':
        return <WonderStack onBack={() => setCurrentView('menu')} challenge={challenge} onToast={showToast} onMall={handleMallRedirect} />;
      case 'id':
        return <WonderID onBack={() => setCurrentView('menu')} />;
      case 'anthem':
        return <WonderAnthem onBack={() => setCurrentView('menu')} onMall={handleMallRedirect} />;
      case 'apm':
        return <WonderAPM onBack={() => setCurrentView('menu')} />;
      case 'aura':
        return <WonderAura onBack={() => setCurrentView('menu')} onMall={handleMallRedirect} />;
      case 'run':
        return <WonderRun onBack={() => setCurrentView('menu')} onMall={handleMallRedirect} />;
      case 'sigil':
        return <WonderSigil onBack={() => setCurrentView('menu')} onToast={showToast} />;
      case 'cipher':
        return <WonderCipher onBack={() => setCurrentView('menu')} onToast={showToast} />;
      case 'echo':
        return <WonderEcho onBack={() => setCurrentView('menu')} onToast={showToast} />;
      case 'oracle':
        return <WonderOracle onBack={() => setCurrentView('menu')} onToast={showToast} />;
      case 'fate':
        return <WonderFate onBack={() => setCurrentView('menu')} onToast={showToast} />;
      default:
        return <MainMenu onSelect={setCurrentView} challenge={challenge} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-[#E7CD78] selection:bg-[#E7CD78] selection:text-[#0E0E0E]">
      <WonderMallButton onClick={handleMallRedirect} />
      
      {challenge && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white py-2 flex items-center justify-center gap-3 animate-pulse shadow-lg text-center px-4">
          <Target size={18} />
          <span className="font-bold tracking-wider uppercase text-sm">
            Target: Beat {challenge.user}'s Score of {challenge.score}!
          </span>
          <button 
            onClick={() => setChallenge(null)}
            className="ml-4 text-xs bg-black/20 hover:bg-black/40 px-2 py-1 rounded font-inter font-bold"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {toast && (
        <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#E7CD78] text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-center whitespace-nowrap text-xs md:text-sm">
          {toast}
        </div>
      )}

      {renderView()}
    </div>
  );
};

const MainMenu: React.FC<{ onSelect: (view: AppView) => void, challenge: ChallengeData | null }> = ({ onSelect, challenge }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20 sm:py-12 flex flex-col items-center justify-center min-h-screen">
      <header className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tighter mb-4 text-white">
          WONDER<span className="text-[#E7CD78]">ARCADE</span>
        </h1>
        <p className="text-zinc-500 text-xs md:text-lg uppercase tracking-[0.3em] font-light max-w-[280px] sm:max-w-none mx-auto leading-relaxed">
          Premium Gaming Experience • Cyber-Luxury Edition
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-6xl">
        <MenuCard 
          title="Wonder 2048" 
          description="Deluxe Puzzle" 
          icon={<LayoutGrid className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('2048')} 
        />
        <MenuCard 
          title="Wonder Stack" 
          description="High-Stakes" 
          icon={<Layers className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('stack')} 
        />
        <MenuCard 
          title="Wonder Fate" 
          description="Oracle System" 
          icon={<HelpCircle className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('fate')} 
        />
        <MenuCard 
          title="Wonder Oracle" 
          description="Predict Duel" 
          icon={<Eye className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('oracle')} 
        />
        <MenuCard 
          title="Wonder Run" 
          description="3D Platformer" 
          icon={<Play className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('run')} 
        />
        <MenuCard 
          title="Wonder Echo" 
          description="Ghost Survival" 
          icon={<History className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('echo')} 
        />
        <MenuCard 
          title="Wonder APM" 
          description="Reflex Test" 
          icon={<Zap className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('apm')} 
        />
        <MenuCard 
          title="Wonder Anthem" 
          description="Official Theme" 
          icon={<Music className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('anthem')} 
        />
        <MenuCard 
          title="Wonder Cipher" 
          description="Encryption" 
          icon={<Shield className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('cipher')} 
        />
        <MenuCard 
          title="Wonder ID" 
          description="Esports Pro" 
          icon={<CreditCard className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('id')} 
        />
        <MenuCard 
          title="Wonder Sigil" 
          description="Identity" 
          icon={<Fingerprint className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('sigil')} 
        />
        <MenuCard 
          title="Wonder Aura" 
          description="Art Soul" 
          icon={<Ghost className="w-5 h-5 sm:w-8 sm:h-8" />} 
          onClick={() => onSelect('aura')} 
        />
      </div>

      <footer className="mt-12 text-zinc-600 text-[8px] sm:text-[10px] tracking-widest uppercase">
        Ver 12.0 • Cyber-Luxury Build
      </footer>
    </div>
  );
};

const MenuCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; highlight?: boolean }> = ({ title, description, icon, onClick, highlight }) => {
  return (
    <button 
      onClick={onClick}
      className={`group relative flex flex-col items-start p-4 sm:p-6 rounded-2xl transition-all duration-300 overflow-hidden shadow-2xl border font-inter font-bold ${
        highlight 
        ? 'bg-[#E7CD78]/5 border-[#E7CD78]/40 hover:bg-[#E7CD78]/10 hover:border-[#E7CD78]' 
        : 'bg-[#161616] border-zinc-800 hover:border-[#E7CD78] hover:bg-[#1a1a1a]'
      }`}
    >
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-all duration-500 transform group-hover:-translate-y-1 group-hover:translate-x-1 ${highlight ? 'text-[#E7CD78] opacity-30' : ''}`}>
        {icon}
      </div>
      <div className={`mb-3 sm:mb-6 p-2 sm:p-3 rounded-xl transition-colors duration-300 ${highlight ? 'bg-[#E7CD78] text-black' : 'bg-zinc-900 group-hover:bg-[#E7CD78] group-hover:text-black'}`}>
        {icon}
      </div>
      <h3 className={`text-xs sm:text-xl font-bold mb-1 transition-colors ${highlight ? 'text-[#E7CD78]' : 'text-white group-hover:text-[#E7CD78]'}`}>
        {title}
      </h3>
      <p className="text-zinc-500 uppercase text-[7px] sm:text-[10px] font-bold tracking-widest">{description}</p>
    </button>
  );
};

export default App;
