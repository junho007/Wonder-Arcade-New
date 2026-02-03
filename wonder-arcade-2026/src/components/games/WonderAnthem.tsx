
import React, { useState, useEffect, useRef } from 'react';
import { BackButton } from '../../App';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ShoppingBag } from 'lucide-react';

const SONG_URL = "https://www.dropbox.com/scl/fi/5zv9to370f60074zq541y/WCG.mp3?rlkey=rv8qrfafndw6o8xgetdsu7zww&st=svnw06o2&raw=1";
const LOGO_URL = "https://static.wixstatic.com/media/dd7d19_73e84821574d4385aa042822a131be52~mv2.png";

const LYRICS = [
  { time: 0, text: "Yeah. You know who it is. WCG. Let’s go." },
  { time: 10, text: "I got the connection, yeah, you know where to be" },
  { time: 15, text: "Unlock the whole world with the WCG." },
  { time: 20, text: "We never lagging, no, we moving so fast" },
  { time: 23, text: "Top-up the future, forget about the past." },
  { time: 24, text: "Yeah, we got the keys, yeah, we set you free" },
  { time: 27, text: "Everything you need is at WCG. (W-C-G)" },
  { time: 30, text: "Look, I was stuck in the lobby, waiting for a load" },
  { time: 33, text: "Running out of credits, gonna crash the mode" },
  { time: 35, text: "But then I found the plug, yeah, the real supply" },
  { time: 37, text: "No waiting in line, we just touching the sky." },
  { time: 39, text: "Whether it’s the vouchers or the gaming loot" },
  { time: 42, text: "We loading up the clip before you even shoot" },
  { time: 44, text: "It’s a lifestyle, yeah, we leveling up" },
  { time: 46, text: "Pouring digital gold inside of the cup." },
  { time: 49, text: "Don't stress the price, we keeping it nice" },
  { time: 51, text: "WCG the only one you gotta ring twice." },
  { time: 54, text: "From the console to the mobile screen" },
  { time: 56, text: "We the cleanest team that you ever seen." },
  { time: 58, text: "I got the connection, yeah, you know where to be" },
  { time: 63, text: "Unlock the whole world with the WCG." },
  { time: 68, text: "We never lagging, no, we moving so fast" },
  { time: 70, text: "Top-up the future, forget about the past." },
  { time: 72, text: "Yeah, we got the keys, yeah, we set you free" },
  { time: 75, text: "Everything you need is at WCG. (W-C-G)" },
  { time: 77, text: "Ay, check the stats, check the dashboard" },
  { time: 79, text: "We giving you the things that they can’t afford" },
  { time: 82, text: "Safe and secure, yeah, the lock is tight" },
  { time: 84, text: "We keeping it glowing in the middle of the night." },
  { time: 86, text: "Top tier, premier, entertainment king" },
  { time: 89, text: "You don’t need a genie or a diamond ring" },
  { time: 90, text: "You just need the link, you just need the click" },
  { time: 93, text: "WCG dropping and we making it stick." },
  { time: 95, text: "Game over? Nah, we press reset" },
  { time: 97, text: "This the best bet that you ever gonna get." },
  { time: 101, text: "We connect the world. (WCG...)" },
  { time: 102, text: "We connect the game. (WCG...)" },
  { time: 103, text: "Put respect on the name. W... C... G..." },
  { time: 106, text: "I got the connection, yeah, you know where to be" },
  { time: 111, text: "Unlock the whole world with the WCG." },
  { time: 116, text: "We never lagging, no, we moving so fast" },
  { time: 118, text: "Top-up the future, forget about the past." },
  { time: 121, text: "Yeah, we got the keys, yeah, we set you free" },
  { time: 123, text: "Everything you need is at WCG." },
  { time: 127, text: "WCG. Top it up. Unlock it. Yeah." }
];

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const WonderAnthem: React.FC<{ onBack: () => void, onMall: () => void }> = ({ onBack, onMall }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Sync state with audio element
  const onTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      setCurrentTime(current);
      
      let newIndex = 0;
      for (let i = 0; i < LYRICS.length; i++) {
        if (current >= LYRICS[i].time) {
          newIndex = i;
        } else {
          break;
        }
      }
      
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setError(null);
    }
  };

  // Center active lyric line
  useEffect(() => {
    if (lyricsContainerRef.current) {
      const activeElement = lyricsContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        const container = lyricsContainerRef.current;
        const offset = activeElement.offsetTop - (container.clientHeight / 2) + (activeElement.clientHeight / 2);
        container.scrollTo({
          top: offset,
          behavior: 'smooth'
        });
      }
    }
  }, [activeIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Cleanup to prevent "media removed" error
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setError(null);
        } catch (e: any) {
          // Check for interruption error specifically
          if (e.name !== 'AbortError') {
            console.error("Playback failed", e);
            setError("Playback failed. Re-link audio.");
          }
          setIsPlaying(false);
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const onAudioError = () => {
    setError("Failed to load audio source.");
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-[#0A0A0A] p-6 pt-24 overflow-hidden select-none relative font-sans">
      <BackButton onClick={onBack} />
      
      <audio 
        ref={audioRef} 
        src={SONG_URL} 
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onError={onAudioError}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      <div className="flex flex-col lg:flex-row items-center gap-12 w-full max-w-7xl h-full flex-1 z-10 mb-20">
        
        {/* PLAYER SECTION */}
        <div className="flex flex-col items-center justify-center gap-8 w-full lg:w-1/3 animate-in fade-in slide-in-from-left-8 duration-700">
          
          {/* THUMPING LOGO */}
          <div className="relative">
            <div className={`w-64 h-64 md:w-80 md:h-80 bg-zinc-900 rounded-3xl flex items-center justify-center border-2 border-[#E7CD78]/20 gold-glow overflow-hidden shadow-2xl transition-all duration-300 ${isPlaying ? 'animate-thump scale-105' : 'scale-100 opacity-60'}`}>
               <img 
                 src={LOGO_URL} 
                 alt="WCG Logo" 
                 className="w-[85%] h-[85%] object-contain drop-shadow-2xl" 
               />
               <div className="absolute inset-0 bg-gradient-to-br from-[#E7CD78]/10 via-transparent to-black/40 pointer-events-none" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">WONDER ANTHEM</h2>
            <p className="text-[#E7CD78] text-xs font-bold tracking-[0.3em] uppercase opacity-70 italic">Official Theme • Premium Master</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-500 text-[10px] font-bold uppercase px-4 py-2 rounded-full animate-pulse">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-4 w-full max-sm bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800 shadow-2xl backdrop-blur-xl">
            
            {/* SEEK BAR */}
            <div className="w-full flex flex-col gap-2">
              <input 
                type="range"
                min="0"
                max={duration || 100}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#E7CD78] hover:accent-white transition-all"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-8 mt-2">
              <button className="text-zinc-600 hover:text-white transition-colors active:scale-90 font-inter font-bold"><SkipBack size={24} /></button>
              <button 
                onClick={togglePlay}
                className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] font-inter font-bold"
              >
                {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} className="ml-1" fill="currentColor" />}
              </button>
              <button className="text-zinc-600 hover:text-white transition-colors active:scale-90 font-inter font-bold"><SkipForward size={24} /></button>
            </div>

            <div className="w-full flex items-center gap-4 px-2 mt-4">
               <button onClick={() => setIsMuted(!isMuted)} className="text-[#E7CD78] hover:scale-110 transition-transform font-inter font-bold">
                 {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
               </button>
               <input 
                 type="range" min="0" max="1" step="0.01" 
                 value={volume} 
                 onChange={(e) => setVolume(parseFloat(e.target.value))}
                 className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#E7CD78]"
               />
            </div>

            <button 
              onClick={onMall} 
              className="w-full mt-4 py-4 bg-[#E7CD78] text-black font-inter font-bold rounded-full flex items-center justify-center gap-2 hover:bg-white transition-all shadow-xl text-xs active:scale-95"
            >
              <ShoppingBag size={14} /> Official Shop
            </button>
          </div>
        </div>

        {/* LYRICS SECTION */}
        <div className="relative flex-1 w-full h-[50vh] lg:h-[75vh] flex flex-col items-center border-l border-zinc-900/50 lg:pl-12">
          <div 
            ref={lyricsContainerRef}
            className="w-full h-full overflow-y-auto py-[40vh] space-y-4 no-scrollbar scroll-smooth px-4"
          >
            {LYRICS.map((lyric, idx) => {
              const isActive = idx === activeIndex;
              let style = "opacity-50 text-zinc-500";
              if (isActive) {
                style = "opacity-100 text-[#E7CD78] drop-shadow-[0_0_12px_rgba(231,205,120,0.3)]";
              }

              return (
                <div 
                  key={idx}
                  className={`
                    text-xl lg:text-2xl font-semibold leading-loose transition-all duration-500 text-center whitespace-normal break-words
                    ${style}
                  `}
                >
                  {lyric.text}
                </div>
              );
            })}
          </div>
          {/* FADE OVERLAYS */}
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#0A0A0A] to-transparent pointer-events-none z-20" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none z-20" />
        </div>
      </div>

      {/* VISUALIZER BARS */}
      <div className="fixed bottom-0 left-0 w-full h-24 flex items-end justify-center gap-2 px-8 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i} 
            className={`w-4 md:w-6 bg-gradient-to-t from-[#E7CD78]/5 to-[#E7CD78]/30 rounded-t-lg transition-all duration-300 ${isPlaying ? 'animate-visual-v3' : 'h-2'}`}
            style={{ 
              animationDelay: `${i * 0.08}s`,
              animationDuration: `${0.4 + Math.random() * 0.5}s`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes thump {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(1.1); }
        }
        .animate-thump {
          animation: thump 0.6s ease-in-out infinite;
        }
        @keyframes visual-v3 {
          0% { height: 10%; opacity: 0.2; }
          100% { height: 80%; opacity: 0.8; }
        }
        .animate-visual-v3 {
          animation: visual-v3 ease-in-out infinite alternate;
        }
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #E7CD78;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(231,205,120,0.4);
          margin-top: -7px;
          border: 2px solid white;
        }
        input[type=range]::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #E7CD78;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(231,205,120,0.4);
        }
      `}</style>
    </div>
  );
};

export default WonderAnthem;
