import React, { useState, useEffect } from 'react';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ChatTerminal } from './components/ChatTerminal';
import { JarvisCore, playSynthSound, type CoreState } from './components/JarvisCore';
import { SimulationDeck } from './components/SimulationDeck';
import { Shield, Cpu, Volume2, ShieldAlert, Settings, X } from 'lucide-react';

function App() {
  const [coreState, setCoreState] = useState<CoreState>('idling');
  const [currentSim, setCurrentSim] = useState<'pendulum' | 'gravity' | 'swarm' | 'life'>('gravity');
  const [dateTimeStr, setDateTimeStr] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [isLiveConnection, setIsLiveConnection] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    const key = 'AIzaSyCDb6KCFTV5cHPYbVS80V1_a4uh-37d9Cs';
    localStorage.setItem('boss_api_key', key);
    return key;
  });

  // Live real-time ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', 
        hour12: false 
      };
      setDateTimeStr(`SYS_CHRONO: ${now.toLocaleDateString('en-US', options).toUpperCase()}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ping backend to check if live server is running
  useEffect(() => {
    const checkServer = async () => {
      try {
        const host = window.location.hostname;
        const res = await fetch(`http://${host}:5000/api/metrics`);
        if (res.ok) {
          setIsLiveConnection(true);
        } else {
          setIsLiveConnection(false);
        }
      } catch {
        setIsLiveConnection(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleActivation = () => {
    setIsActivated(true);
    // Play sci-fi synthesizer start chime
    playSynthSound('powerup');
    
    // Vocal welcome greeting
    setTimeout(() => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        let voice = voices.find(v => v.name.includes('Google UK English Male')) ||
                     voices.find(v => v.name.includes('Microsoft George')) ||
                     voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male')) ||
                     voices.find(v => v.lang === 'en-GB') ||
                     voices[0];

        const utterance = new SpeechSynthesisUtterance("Welcome back, sir. I am B.O.S.S., your Butler Operating and Simulation System. All local gadgets and spacetime gravity simulations are online.");
        if (voice) {
          utterance.voice = voice;
        }
        utterance.pitch = 0.82;
        utterance.rate = 0.94;
        
        utterance.onstart = () => setCoreState('speaking');
        utterance.onend = () => setCoreState('idling');
        utterance.onerror = () => setCoreState('idling');
        window.speechSynthesis.speak(utterance);
      }
    }, 1000);
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden text-slate-100 bg-[#020617]">
      {/* 1. ACTIVATION SHIELD OVERLAY */}
      {!isActivated && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md">
          {/* Cyber glowing orb */}
          <div className="relative flex items-center justify-center w-48 h-48 mb-8 rounded-full border border-cyan-500/20 bg-slate-900/30 shadow-[0_0_60px_rgba(0,240,255,0.08)]">
            <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40 animate-spin" style={{ animationDuration: '40s' }} />
            <div className="absolute inset-4 rounded-full border border-dotted border-cyan-400/25 animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }} />
            
            <button 
              onClick={handleActivation}
              className="z-10 flex flex-col items-center justify-center w-36 h-36 rounded-full border-2 border-cyan-400 bg-cyan-950/20 text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none cursor-pointer"
            >
              <Cpu size={32} className="animate-pulse mb-1.5" />
              <span className="text-[10px] tracking-widest font-black font-hud">ACTIVATE</span>
              <span className="text-[7px] text-cyan-400/60 font-mono tracking-widest mt-0.5">B.O.S.S.</span>
            </button>
          </div>

          <h1 className="font-hud text-base tracking-widest text-cyan-400 mb-2" style={{ textShadow: '0 0 10px rgba(0,240,255,0.2)' }}>
            CONVERSATIONAL CORE & GADGET INTERFACE
          </h1>
          <p className="font-mono text-[9px] text-slate-500 max-w-xs text-center leading-normal">
            AUTHORIZE AUDIO AND SPEECH HARDWARE CHANNELS TO BOOTSTRAP TACTICAL DASHBOARD
          </p>
        </div>
      )}

      {/* 2. MAIN APPLICATION HUD VIEW */}
      {isActivated && (
        <div className="hud-container animate-fade-in">
          {/* A. HEADER SYSTEM BAR */}
          <header className="cyber-panel col-span-3 flex items-center justify-between px-4 relative">
            {/* Tech Corners */}
            <div className="tech-corner corner-tl" />
            <div className="tech-corner corner-tr" />
            <div className="tech-corner corner-bl" />
            <div className="tech-corner corner-br" />

            {/* Title & Status */}
            <div className="flex items-center gap-3">
              <Shield className="text-cyan-400 animate-pulse" size={18} />
              <div className="flex flex-col">
                <h1 
                  className="text-xs font-black tracking-wider leading-none text-cyan-400" 
                  style={{ fontFamily: 'var(--font-hud)', textShadow: '0 0 6px var(--cyan-neon-glow)' }}
                >
                  B.O.S.S. OPERATIONAL SYSTEMS CENTRAL COMMAND DECK
                </h1>
                <span className="text-[8px] font-mono text-slate-500 mt-1 leading-none">
                  BUTLER OPERATING & SIMULATION SYSTEM // PROTOCOL: EXCELLENCE
                </span>
              </div>
            </div>

            {/* Time / Chronometer & Live Connection Indicator */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-cyan-950/60">
                  {dateTimeStr || 'SYS_CHRONO: BOOTING...'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[9px] font-mono">
                <span className={`pulse-indicator ${isLiveConnection ? '' : 'gold'}`} />
                <span className={isLiveConnection ? 'text-cyan-400' : 'text-amber-500 font-bold'}>
                  {isLiveConnection ? 'LOCAL SERVER: ONLINE' : 'SIMULATED DATA (OFFLINE SERVER)'}
                </span>
              </div>

              <button
                onClick={() => { playSynthSound('click'); setIsSettingsOpen(true); }}
                className="p-1.5 rounded bg-cyan-950/30 border border-cyan-900/60 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-950/20 transition-all focus:outline-none cursor-pointer"
                title="Cognitive Mainframe Authorization Settings"
              >
                <Settings size={13} className="animate-pulse" />
              </button>
            </div>
          </header>

          {/* B. LEFT HAND PANEL: Chat / Vocal Terminal */}
          <section className="col-span-1 row-span-2">
            <ChatTerminal 
              onStateChange={setCoreState}
              onSimulationChange={setCurrentSim}
              isLive={isLiveConnection}
            />
          </section>

          {/* C. CENTER HUD AREA: Circular Arc Reactor Core */}
          <section className="col-span-1 flex flex-col justify-center items-center py-2 relative">
            <JarvisCore state={coreState} />
            
            {/* Visual tech crosshairs floating behind core */}
            <div className="absolute pointer-events-none opacity-5 flex items-center justify-center">
              <div className="border border-cyan-500 w-[350px] h-[350px] rounded-full" />
              <div className="absolute border border-cyan-400 w-[200px] h-[200px] rounded-full" />
              <div className="absolute border-l border-cyan-300 h-[450px]" />
              <div className="absolute border-t border-cyan-300 w-[450px]" />
            </div>

            {/* Diagnostic system overlays */}
            <div className="absolute top-2 left-6 pointer-events-none font-mono text-[8px] text-cyan-500/50 space-y-1">
              <div>// CORE SYMMETRY: DYNAMIC</div>
              <div>// MATRIX AMPLITUDE: BREATHING</div>
              <div>// BENEDICT SOUND FILTER: LOADED</div>
            </div>
            
            <div className="absolute bottom-2 right-6 pointer-events-none font-mono text-[8px] text-cyan-500/50 text-right space-y-1">
              <div>VECTOR ATTRACTOR: STANDBY //</div>
              <div>GRAVITY INDEX G: 0.8 //</div>
              <div>SPEECH SYNTH LOCK: 100% //</div>
            </div>
          </section>

          {/* D. RIGHT HAND PANEL: live gadget metrics & diagnostics */}
          <section className="col-span-1 row-span-2">
            <TelemetryPanel />
          </section>

          {/* E. CENTER BOTTOM: Physics Canvas simulations */}
          <SimulationDeck 
            currentSim={currentSim}
            onSimChange={setCurrentSim}
          />
        </div>
      )}

      {/* 3. SETTINGS DRAWERS OVERLAY */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-80 h-full bg-[#081226]/95 border-l border-cyan-950 p-6 flex flex-col relative animate-slide-in">
            {/* Tech corners */}
            <div className="tech-corner corner-tl" />
            <div className="tech-corner corner-bl" />
            
            <div className="flex justify-between items-center border-b border-cyan-900/60 pb-3 mb-6">
              <div className="flex items-center gap-2">
                <Settings className="text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} size={16} />
                <h2 className="font-hud text-xs tracking-wider text-cyan-400">COGNITIVE CONFIG</h2>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-6 font-mono text-xs text-slate-300">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-cyan-400 tracking-wider">Gemini API Key authorization</label>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setApiKey(val);
                    localStorage.setItem('boss_api_key', val);
                  }}
                  className="w-full bg-slate-950 border border-cyan-950 focus:border-cyan-500 rounded p-2 text-cyan-400 outline-none text-[10px] tracking-widest"
                  placeholder="Paste your GEMINI_API_KEY..."
                  style={{ background: 'rgba(2,6,23,0.9)', color: 'var(--cyan-neon)', borderColor: 'var(--cyan-dim)' }}
                />
                <p className="text-[8px] text-slate-500 leading-normal mt-1">
                  STRICTLY SAVED LOCALLY IN CLIENT BROWSER STORAGE. NEVER SENT TO ANY UNSANCTIONED SERVERS.
                </p>
              </div>

              <div className="bg-cyan-950/20 p-3 rounded border border-cyan-900/40 space-y-2 text-[10px] leading-normal text-cyan-200">
                <div className="font-bold text-cyan-400 text-[10px] mb-1">REAL-TIME COGNITION SYNC:</div>
                Connecting your API Key authorizes infinite, generative thinking! B.O.S.S. will hold actual contextual conversations, wittily parsing your prompts and automatically controlling the HUD canvas sims based on its thoughts.
              </div>
            </div>

            <div className="pt-4 border-t border-cyan-900/40">
              <button 
                onClick={() => { playSynthSound('click'); setIsSettingsOpen(false); }}
                className="w-full neon-btn text-center"
              >
                SAVE & ESTABLISH SYNC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
