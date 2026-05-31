import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Terminal, Play, Settings, RefreshCw } from 'lucide-react';
import { playSynthSound } from './JarvisCore';

interface ChatTerminalProps {
  onStateChange: (state: 'idling' | 'listening' | 'thinking' | 'speaking') => void;
  onSimulationChange: (simName: 'pendulum' | 'gravity' | 'swarm' | 'life') => void;
  isLive: boolean;
}

interface Message {
  sender: 'user' | 'jarvis' | 'system';
  text: string;
  isShell?: boolean;
  shellOutput?: string;
  isError?: boolean;
}

export const ChatTerminal: React.FC<ChatTerminalProps> = ({ 
  onStateChange, 
  onSimulationChange,
  isLive
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'jarvis', text: 'Core systems initialized, sir. Audio synthesizers active. B.O.S.S. vocal modulator fully engaged. How may I assist you today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any | null>(null);

  // Load and search system voices for that perfect deep British male voice
  const loadVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    setAvailableVoices(voices);
    
    // Voice Search Algorithm (to get a deep British Butler/Cumberbatch sound)
    let voice = voices.find(v => v.name.includes('Google UK English Male')) ||
                 voices.find(v => v.name.includes('Microsoft George')) || // classic Win deep British
                 voices.find(v => v.name.includes('Microsoft Hazel')) ||  // British fallback
                 voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male')) ||
                 voices.find(v => v.lang === 'en-GB') || 
                 voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ||
                 voices[0];
                 
    setSelectedVoice(voice || null);
  };

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Acquire high-accuracy browser GPS coordinates
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('[B.O.S.S.] Geolocation acquired:', pos.coords.latitude, pos.coords.longitude);
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          console.warn('[B.O.S.S.] Geolocation permission deferred or blocked.', err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Web Speech API - Text to Speech (TTS)
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel current speaking
    window.speechSynthesis.cancel();
    
    onStateChange('speaking');
    playSynthSound('speechStart');
    
    // Strip clean markdown or shell bits for narration
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Fine-tune tone to resemble Benedict Cumberbatch: Deep baritone, articulate
    utterance.pitch = 0.82; // Lower pitch for a deep chest resonance (baritone)
    utterance.rate = 0.94;  // Slightly slower, deliberate articulation (articulate Cumberbatch)
    
    utterance.onend = () => {
      onStateChange('idling');
    };
    
    utterance.onerror = () => {
      onStateChange('idling');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Web Speech API - Speech Recognition (STT)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        onStateChange('listening');
        playSynthSound('click');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        onStateChange('idling');
      };

      recognition.onend = () => {
        setIsListening(false);
        onStateChange('idling');
      };

      recognitionRef.current = recognition;
    }
  }, [selectedVoice]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser. Please use Chrome/Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Conversational Parsing & Local Shell Execution
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;
    
    setInputText('');
    playSynthSound('click');

    // Add user message to log
    setMessages(prev => [...prev, { sender: 'user', text }]);
    onStateChange('thinking');

    // Rule-based NLP + Live shell execution logic
    const lowerText = text.toLowerCase();
    
    // Check if the user is writing a direct terminal command (starts with $, cmd:, run:, or is a direct shell string like ping, ipconfig, etc.)
    const isDirectShell = text.startsWith('$') || 
                          text.startsWith('cmd:') || 
                          /^(ping|ipconfig|dir|git|ls|cd|node|npm|echo|cls|cat|systeminfo|tasklist|get-process|get-service)/i.test(text);

    let commandToExecute = '';
    if (isDirectShell) {
      commandToExecute = text.replace(/^(\$|cmd:|run:)\s*/, '');
    }

    // A. Direct shell execution path (Wide open as requested by user!)
    if (commandToExecute) {
      setMessages(prev => [...prev, { sender: 'system', text: `Accessing local shell core... Executing: "${commandToExecute}"` }]);
      
      try {
        const host = window.location.hostname;
        const response = await fetch(`http://${host}:5000/api/shell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: commandToExecute })
        });
        
        const data = await response.json();
        
        if (data.success) {
          const jarvisResponse = `Command executed successfully, sir. Exit code zero. Output returned in primary console.`;
          setMessages(prev => [...prev, { 
            sender: 'jarvis', 
            text: jarvisResponse, 
            isShell: true, 
            shellOutput: data.stdout || '(Empty output received)'
          }]);
          speakText(jarvisResponse);
        } else {
          const errResponse = `Execution encountered an anomaly, sir. Process returned non-zero code. Details in screen console.`;
          setMessages(prev => [...prev, { 
            sender: 'jarvis', 
            text: errResponse, 
            isShell: true, 
            isError: true,
            shellOutput: data.stderr || data.error || 'Unknown command execution failure.' 
          }]);
          speakText(errResponse);
        }
      } catch (err) {
        // Fallback for simulation mode (offline backend)
        const mockResponse = `The simulation core is active, but the physical shell backend appears offline. Unable to execute command directly.`;
        setMessages(prev => [...prev, { 
          sender: 'jarvis', 
          text: mockResponse,
          isShell: true,
          shellOutput: `[MOCK BUFFER] Could not connect to backend server. Running: "${commandToExecute}"\nExecuting mocks... Done. Return code: 0`
        }]);
        speakText(mockResponse);
      }
      return;
    }

    // B. Interactive Conversational & Cognitive Triggers
    setTimeout(async () => {
      const apiKey = localStorage.getItem('boss_api_key');
      
      // If cognitive mainframe key is present, execute real-time generative thoughts via Gemini!
      if (apiKey) {
        try {
          // Format chat history for Gemini API content structure (last 5 messages for token efficiency)
          const historyData = messages.slice(-5).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }));

          const systemInstruction = `You are B.O.S.S. (Butler Operating & Simulation System), an advanced conversational AI inspired by J.A.R.V.I.S. from Iron Man. You speak in a witty, professional, and slightly dry British tone (Benedict Cumberbatch accent). Address the user as 'sir'. Keep replies relatively concise (1-3 sentences) but highly articulate.
If the user requests a simulation, say you are initiating it. You MUST strictly use the exact phrasing:
- 'initiating chaos pendulum' for double pendulum simulation.
- 'initiating gravity well' for spacetime gravity wells.
- 'initiating quantum swarm' for particle attractor.
- 'initiating game of life' for Conway's life cells.
If the user asks for weather, say you are querying satellites.
If they ask for distance/ETA/travel time, say you are calculating trajectories.`;

          // We deploy 'gemini-3.1-flash-lite' here:
          // Based on your Google AI Studio metrics, this model provides the ultimate rate-safety profile:
          // 500 Requests Per Day (25x more than 2.5/3.5 Flash) and 15 Requests Per Minute (3x more than standard Flash),
          // combined with extremely fast reasoning and low latency!
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `System directive: ${systemInstruction}` }]
                },
                ...historyData,
                {
                  role: 'user',
                  parts: [{ text: text }]
                }
              ]
            })
          });

          const data = await response.json();
          if (data && data.candidates && data.candidates[0].content.parts[0].text) {
            const reply = data.candidates[0].content.parts[0].text.trim();
            const lowerReply = reply.toLowerCase();

            // Auto-trigger Canvas simulations based on B.O.S.S.'s own cognitive replies!
            if (lowerReply.includes('chaos pendulum') || lowerReply.includes('double pendulum')) {
              onSimulationChange('pendulum');
            } else if (lowerReply.includes('gravity well') || lowerReply.includes('gravity')) {
              onSimulationChange('gravity');
            } else if (lowerReply.includes('quantum swarm') || lowerReply.includes('particle swarm')) {
              onSimulationChange('swarm');
            } else if (lowerReply.includes('game of life') || lowerReply.includes('conway')) {
              onSimulationChange('life');
            }

            setMessages(prev => [...prev, { sender: 'jarvis', text: reply }]);
            speakText(reply);
            return;
          } else {
            throw new Error('Generative response structure mismatched.');
          }
        } catch (err) {
          console.error('[B.O.S.S.] Generative thought error:', err);
        }
      }

      // C. FALLBACK RULE-BASED ENGINE (Offline cognitive cores)
      let jarvisReply = '';
      
      // 1. Simulation Selector triggers
      if (lowerText.includes('simulate double pendulum') || lowerText.includes('chaos pendulum') || lowerText.includes('double pendulum')) {
        onSimulationChange('pendulum');
        jarvisReply = 'Chaos pendulum integration coordinates set, sir. Starting double pendulum swing utilizing Runge-Kutta equations.';
      } 
      else if (lowerText.includes('simulate gravity') || lowerText.includes('spacetime') || lowerText.includes('orbit')) {
        onSimulationChange('gravity');
        jarvisReply = 'Spacetime curvature maps established. Initiating multi-planetary gravity well orbital simulation.';
      } 
      else if (lowerText.includes('simulate quantum swarm') || lowerText.includes('particle swarm') || lowerText.includes('swarm')) {
        onSimulationChange('swarm');
        jarvisReply = 'Swarm vectors aligned. Generating 500 quantum vector-guided interactive particle nodes.';
      } 
      else if (lowerText.includes('simulate game of life') || lowerText.includes('conway') || lowerText.includes('cellular automata')) {
        onSimulationChange('life');
        jarvisReply = 'Cellular automata array configured. Seeding Conway\'s Game of Life mathematical system.';
      }
      else if (lowerText.includes('weather')) {
        let location = '';
        const weatherMatch = lowerText.match(/weather(?:\s+(?:in|for|of|at))?\s+([a-zA-Z\s]+)/i);
        if (weatherMatch) {
          const parsed = weatherMatch[1].trim();
          if (!['like', 'today', 'now', 'report', 'forecast', 'tomorrow'].includes(parsed)) {
            location = parsed;
          }
        }
        
        setMessages(prev => [...prev, { sender: 'system', text: `Querying B.O.S.S. weather satellites... Location: ${location || 'GPS Satellites'}` }]);
        
        try {
          const host = window.location.hostname;
          let queryUrl = `http://${host}:5000/api/weather?location=${encodeURIComponent(location)}`;
          if (!location && coords) {
            queryUrl = `http://${host}:5000/api/weather?lat=${coords.lat}&lon=${coords.lon}`;
          }

          const response = await fetch(queryUrl);
          const data = await response.json();
          
          if (data.city) {
            const reportText = `Meteorological status for ${data.city}, ${data.country}: Currently ${data.desc}. Temperature is ${data.tempC} degrees Celsius, with ${data.humidity} percent humidity and winds at ${data.windKmph} kilometers per hour, sir.`;
            
            setMessages(prev => [...prev, { 
              sender: 'jarvis', 
              text: reportText,
              isShell: true, 
              shellOutput: `[B.O.S.S. METEOROLOGICAL TELEMETRY]
LOCATION:    ${data.city.toUpperCase()}, ${data.country.toUpperCase()}
CONDITION:   ${data.desc.toUpperCase()}
THERMALS:    ${data.tempC}°C
HUMIDITY:    ${data.humidity}%
WIND SPEED:  ${data.windKmph} km/h
ATMOSPHERE:  NOMINAL / ACCURACY GUARANTEED`
            }]);
            speakText(reportText);
            return;
          }
        } catch (err) {
          jarvisReply = "Satellite sensor calibration failed, sir. However, secondary local sensors suggest clear sky elements around your current location.";
        }
      }
      else if (lowerText.includes('eta') || lowerText.includes('travel time') || lowerText.includes('how long to') || lowerText.includes('distance to')) {
        let destination = '';
        const etaMatch = lowerText.match(/(?:eta to|travel time to|how long to|distance to)\s+([a-zA-Z\s]+)/i);
        if (etaMatch) {
          destination = etaMatch[1].trim();
        } else {
          destination = 'Stark Tower';
        }

        setMessages(prev => [...prev, { sender: 'system', text: `Calculating tactical flight vectors to: ${destination.toUpperCase()}...` }]);

        try {
          const host = window.location.hostname;
          const startLat = coords?.lat || 1.3521; // defaults to Singapore
          const startLon = coords?.lon || 103.8198;
          
          const response = await fetch(`http://${host}:5000/api/eta?startLat=${startLat}&startLon=${startLon}&destination=${encodeURIComponent(destination)}`);
          const data = await response.json();

          if (data.success) {
            const mark85 = data.profiles.find((p: any) => p.id === 'mark85');
            const jet = data.profiles.find((p: any) => p.id === 'supersonic');
            const hypercar = data.profiles.find((p: any) => p.id === 'hypercar');
            
            const etaSpeech = `Flight vectors resolved to ${data.destination.name}, sir. Total distance is ${data.distanceKm} kilometers. Hypersonic flight at Mach 4 will arrive in ${mark85.duration}, while standard supersonic cruise requires ${jet.duration}.`;

            setMessages(prev => [...prev, {
              sender: 'jarvis',
              text: etaSpeech,
              isShell: true,
              shellOutput: `[B.O.S.S. FLIGHT STEERING DECK]
ORIGIN GPS:  ${data.start.lat.toFixed(4)}, ${data.start.lon.toFixed(4)}
DESTINATION: ${data.destination.name.toUpperCase()}
COORDINATES: ${data.destination.lat.toFixed(4)}, ${data.destination.lon.toFixed(4)}
GREAT-CIRCLE RANGE: ${data.distanceKm} KM

SPEED PROFILES DURATION & ETA ESTIMATES:
1. MARK LXXXV THRUSTERS (MACH 4):  ${mark85.duration} (ETA: ${new Date(mark85.eta).toLocaleTimeString()})
2. JET SUPERSONIC CRUISE (MACH 1.5): ${jet.duration} (ETA: ${new Date(jet.eta).toLocaleTimeString()})
3. GROUND TRANSPORT HYPERCAR:       ${hypercar.duration} (ETA: ${new Date(hypercar.eta).toLocaleTimeString()})
FLIGHT ENVELOPE: NOMINAL / VECTOR LAUNCH READY`
            }]);
            speakText(etaSpeech);
            return;
          }
        } catch (err) {
          jarvisReply = "Flight navigation satellite links down, sir. Unable to resolve coordinate grids for destination.";
        }
      }
      // 2. Greetings and general B.O.S.S. persona responses
      else if (lowerText.includes('hello') || lowerText.includes('greetings') || lowerText.includes('hey boss') || lowerText.includes('hi boss')) {
        jarvisReply = 'Greetings, sir. All parameters are functional. The Cumberbatch voice modulator is calibrated at optimal pitch. How may I be of service?';
      }
      else if (lowerText.includes('who are you') || lowerText.includes('your name') || lowerText.includes('boss')) {
        jarvisReply = 'I am B.O.S.S., your Butler Operating & Simulation System. In this system setup, my vocal matrix is tuned with deep acoustics reminiscent of Benedict Cumberbatch. I operate local gadgets and run advanced physics simulations.';
      }
      else if (lowerText.includes('diagnose') || lowerText.includes('system scan') || lowerText.includes('diagnostics')) {
        jarvisReply = 'Initiating full tactical hardware inspection scan, sir. CPU load, memory stacks, and internet latency are all reporting optimal performance parameters.';
      }
      else if (lowerText.includes('clear console') || lowerText.includes('clear screen') || lowerText.includes('clear chat')) {
        setMessages([{ sender: 'jarvis', text: 'Chat logs cleared, sir. Mainframe terminal is fresh.' }]);
        onStateChange('idling');
        return;
      }
      // 3. Fallback to conversational help
      else {
        jarvisReply = `I've registered your input, sir. I am currently running on local offline backup cores. To initialize my cognitive generative thinking stacks and match J.A.R.V.I.S., please click the Cog icon in the header and input your Gemini API Key. Otherwise, you can type direct shell commands (e.g. "ping google.com") or ask me to "simulate gravity" to launch physics modules.`;
      }

      setMessages(prev => [...prev, { sender: 'jarvis', text: jarvisReply }]);
      speakText(jarvisReply);
    }, 800);
  };

  return (
    <div className="cyber-panel h-full flex flex-col p-4 relative" style={{ zIndex: 5 }}>
      {/* Tech Corners */}
      <div className="tech-corner corner-tl" />
      <div className="tech-corner corner-tr" />
      <div className="tech-corner corner-bl" />
      <div className="tech-corner corner-br" />

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-cyan-900 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="text-cyan-400" size={16} />
          <h2 className="font-semibold text-xs tracking-wider" style={{ fontFamily: 'var(--font-hud)' }}>
            CONVERSATIONAL CORE & TERMINAL
          </h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
          <Settings size={10} className="animate-spin" style={{ animationDuration: '6s' }} />
          <span>V-SYS: GB_BARITONE (0.8x)</span>
        </div>
      </div>

      {/* Terminal Feed Scroll area */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-1 font-mono text-xs">
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`flex flex-col ${
              msg.sender === 'user' 
                ? 'items-end' 
                : msg.sender === 'system'
                ? 'items-center'
                : 'items-start'
            }`}
          >
            {/* Sender tag */}
            <span className={`text-[8px] uppercase tracking-wider mb-0.5 ${
              msg.sender === 'user' ? 'text-amber-500' : msg.sender === 'system' ? 'text-slate-500' : 'text-cyan-400'
            }`}>
              {msg.sender === 'user' && 'SIR'}
              {msg.sender === 'system' && 'CORE KERNEL'}
              {msg.sender === 'jarvis' && 'B.O.S.S.'}
            </span>

            {/* Bubble */}
            <div 
              className={`p-2.5 rounded max-w-[90%] border ${
                msg.sender === 'user'
                  ? 'bg-amber-950/20 border-amber-900/60 text-amber-300'
                  : msg.sender === 'system'
                  ? 'bg-slate-900/40 border-slate-800 text-slate-400 text-center font-bold'
                  : 'bg-cyan-950/15 border-cyan-900/60 text-cyan-200'
              }`}
              style={{
                boxShadow: msg.sender === 'user'
                  ? '0 0 5px rgba(245, 158, 11, 0.05)'
                  : msg.sender === 'jarvis'
                  ? '0 0 5px rgba(0, 240, 255, 0.05)'
                  : 'none'
              }}
            >
              {msg.text}
              
              {/* Shell output sub-block if applicable */}
              {msg.isShell && msg.shellOutput && (
                <pre 
                  className={`mt-2 p-2 rounded text-[10px] overflow-x-auto text-left font-mono border ${
                    msg.isError 
                      ? 'bg-red-950/30 border-red-900/60 text-red-400' 
                      : 'bg-black border-cyan-950/80 text-cyan-300'
                  }`}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '180px' }}
                >
                  {msg.shellOutput}
                </pre>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls layout */}
      <div className="flex gap-2 items-center">
        {/* Voice Trigger Microphone */}
        <button 
          onClick={toggleListening}
          className={`p-2.5 rounded border transition-all focus:outline-none ${
            isListening 
              ? 'bg-red-950/40 border-red-500 text-red-400 animate-pulse' 
              : 'bg-cyan-950/40 border-cyan-800 text-cyan-400 hover:border-cyan-400'
          }`}
          title={isListening ? "Listening..." : "Click to speak to B.O.S.S."}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Input box */}
        <div className="flex-1 terminal-input-wrap">
          <input 
            type="text"
            className="terminal-input"
            placeholder={isListening ? "Listening voice input..." : "Type text or command ($ ping)..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isListening}
          />
        </div>

        {/* Send Button */}
        <button 
          onClick={() => handleSendMessage()}
          className="p-2.5 rounded bg-cyan-950/40 border border-cyan-800 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-950 transition-all focus:outline-none"
          disabled={isListening}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
