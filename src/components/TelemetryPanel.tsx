import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Battery, RefreshCw, XCircle, ShieldCheck } from 'lucide-react';

interface SystemMetrics {
  cpu: number;
  ram: {
    usedPercent: number;
    totalGB: number;
    freeGB: number;
  };
  battery: {
    level: number;
    isCharging: boolean;
  };
  timestamp: string;
}

interface ProcessItem {
  id: number;
  name: string;
  cpu: number;
  ramMB: number;
}

interface DiagnosticsData {
  os: string;
  disk: {
    totalGB: number;
    freeGB: number;
    usedPercent: number;
  };
  network: {
    status: string;
    latency: number;
  };
}

export const TelemetryPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch telemetry from local backend
  const fetchTelemetry = async () => {
    try {
      const host = window.location.hostname;
      const mRes = await fetch(`http://${host}:5000/api/metrics`);
      const mData = await mRes.json();
      
      const pRes = await fetch(`http://${host}:5000/api/processes`);
      const pData = await pRes.json();

      const dRes = await fetch(`http://${host}:5000/api/diagnostics`);
      const dData = await dRes.json();

      if (mData.success) {
        setMetrics(mData);
        setIsLive(true);
      }
      if (pData.success) {
        setProcesses(pData.processes);
      }
      if (dData.success) {
        setDiagnostics(dData);
      }
      setLoading(false);
    } catch (e) {
      // Fallback to mock data if server isn't running
      setIsLive(false);
      setLoading(false);
      generateMockData();
    }
  };

  const generateMockData = () => {
    // Elegant floating mock metrics
    const simulatedCpu = Math.round(15 + Math.sin(Date.now() / 2000) * 10 + Math.random() * 5);
    const simulatedRam = Math.round(52 + Math.cos(Date.now() / 5000) * 3);
    setMetrics({
      cpu: simulatedCpu,
      ram: {
        usedPercent: simulatedRam,
        totalGB: 16,
        freeGB: Math.round(16 * (1 - simulatedRam / 100) * 10) / 10,
      },
      battery: {
        level: 88,
        isCharging: true
      },
      timestamp: new Date().toISOString()
    });

    setProcesses([
      { id: 1042, name: 'boss_core.exe', cpu: simulatedCpu * 0.4, ramMB: 480 },
      { id: 4120, name: 'chrome', cpu: 4.8, ramMB: 940 },
      { id: 9812, name: 'node_sandbox', cpu: 2.1, ramMB: 320 },
      { id: 2888, name: 'explorer', cpu: 0.2, ramMB: 160 },
      { id: 5044, name: 'system_idle', cpu: 85.0, ramMB: 16 },
    ]);

    setDiagnostics({
      os: 'Windows 11 HUD Simulator',
      disk: {
        totalGB: 512,
        freeGB: 286,
        usedPercent: 44
      },
      network: {
        status: 'ONLINE',
        latency: 14 + Math.round(Math.random() * 8)
      }
    });
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2500);
    return () => clearInterval(interval);
  }, []);

  // Process Killer: utilizes the full-access API shell endpoint of B.O.S.S.
  const terminateProcess = async (id: number, name: string) => {
    try {
      setActionMessage(`Terminating PID ${id}...`);
      if (isLive) {
        const host = window.location.hostname;
        const response = await fetch(`http://${host}:5000/api/shell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `Stop-Process -Id ${id} -Force` })
        });
        const data = await response.json();
        if (data.success) {
          setActionMessage(`Process ${name} (PID ${id}) terminated successfully.`);
        } else {
          setActionMessage(`Failed: ${data.error || 'Access denied.'}`);
        }
      } else {
        // Mock kill in simulation mode
        setProcesses(prev => prev.filter(p => p.id !== id));
        setActionMessage(`[MOCK] Process ${name} terminated.`);
      }
      setTimeout(() => setActionMessage(null), 3000);
      fetchTelemetry();
    } catch (err) {
      console.error(err);
      setActionMessage('Execution failed.');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const triggerSafeAction = async (action: 'notepad' | 'calc' | 'mspaint') => {
    try {
      setActionMessage(`Launching ${action}...`);
      if (isLive) {
        const host = window.location.hostname;
        const response = await fetch(`http://${host}:5000/api/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        const data = await response.json();
        if (data.success) {
          setActionMessage(data.message);
        }
      } else {
        setActionMessage(`[MOCK] Executed request: Open ${action}.`);
      }
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="cyber-panel h-full flex flex-col items-center justify-center font-mono text-cyan-400 text-xs">
        <RefreshCw className="animate-spin mb-2" size={18} />
        ESTABLISHING TELEMETRY CONNECTION...
      </div>
    );
  }

  // Radial Gauge calculations
  const calculateStroke = (percentage: number) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    return { circumference, offset };
  };

  return (
    <div className="cyber-panel h-full flex flex-col p-4 relative" style={{ zIndex: 5 }}>
      {/* Tech Corners Decoration */}
      <div className="tech-corner corner-tl" />
      <div className="tech-corner corner-tr" />
      <div className="tech-corner corner-bl" />
      <div className="tech-corner corner-br" />

      {/* Header telemetry banner */}
      <div className="flex items-center justify-between border-b border-cyan-900 pb-2 mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="text-cyan-400 animate-pulse" size={16} />
          <h2 className="font-semibold text-xs tracking-wider" style={{ fontFamily: 'var(--font-hud)' }}>
            HARDWARE TELEMETRY
          </h2>
        </div>
        <span 
          className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
            isLive 
              ? 'bg-cyan-950/40 border-cyan-500 text-cyan-400' 
              : 'bg-amber-950/40 border-amber-500 text-amber-400'
          }`}
        >
          {isLive ? 'LIVE DECK' : 'SIM HUD MODE'}
        </span>
      </div>

      {/* 1. Circle Radial Metrics row */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          {/* CPU Metric */}
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" className="stroke-slate-900 fill-none" strokeWidth="3" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="32" 
                  className="stroke-cyan-500 fill-none transition-all duration-500" 
                  strokeWidth="3.5"
                  strokeDasharray={calculateStroke(metrics.cpu).circumference}
                  strokeDashoffset={calculateStroke(metrics.cpu).offset}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 4px var(--cyan-neon))' }}
                />
              </svg>
              <div className="absolute flex flex-col justify-center items-center font-mono">
                <span className="text-xs font-bold text-cyan-400">{metrics.cpu}%</span>
                <span className="text-[8px] text-slate-400">CPU</span>
              </div>
            </div>
          </div>

          {/* RAM Metric */}
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" className="stroke-slate-900 fill-none" strokeWidth="3" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="32" 
                  className="stroke-amber-500 fill-none transition-all duration-500" 
                  strokeWidth="3.5"
                  strokeDasharray={calculateStroke(metrics.ram.usedPercent).circumference}
                  strokeDashoffset={calculateStroke(metrics.ram.usedPercent).offset}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(255, 183, 0, 0.4))' }}
                />
              </svg>
              <div className="absolute flex flex-col justify-center items-center font-mono">
                <span className="text-xs font-bold text-amber-400">{metrics.ram.usedPercent}%</span>
                <span className="text-[8px] text-slate-400">RAM</span>
              </div>
            </div>
          </div>

          {/* Battery Metric */}
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" className="stroke-slate-900 fill-none" strokeWidth="3" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="32" 
                  className="stroke-emerald-500 fill-none transition-all duration-500" 
                  strokeWidth="3.5"
                  strokeDasharray={calculateStroke(metrics.battery.level).circumference}
                  strokeDashoffset={calculateStroke(metrics.battery.level).offset}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' }}
                />
              </svg>
              <div className="absolute flex flex-col justify-center items-center font-mono">
                <span className="text-xs font-bold text-emerald-400">{metrics.battery.level}%</span>
                <span className="text-[7px] text-slate-400 leading-tight">
                  {metrics.battery.isCharging ? 'CHARGING' : 'DC POWER'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. OS details & Disk HUD section */}
      {diagnostics && (
        <div className="bg-slate-950/50 p-2.5 rounded border border-cyan-950/60 text-[11px] font-mono mb-4 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">PLATFORM ARCH:</span>
            <span className="text-cyan-400 truncate max-w-[170px]" title={diagnostics.os}>
              {diagnostics.os.replace('Microsoft ', '')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">STORAGE DECK C:</span>
            <span className="text-cyan-400">
              {diagnostics.disk.freeGB} GB FREE / {diagnostics.disk.totalGB} GB
            </span>
          </div>
          {/* Visual Bar for storage */}
          <div className="w-full h-1 bg-slate-900 rounded overflow-hidden mt-1">
            <div 
              className="h-full bg-cyan-500" 
              style={{ width: `${diagnostics.disk.usedPercent}%`, boxShadow: '0 0 5px var(--cyan-neon)' }} 
            />
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-slate-400">SYS LATENCY ping:</span>
            <span className="text-emerald-400 font-bold">{diagnostics.network.latency} ms</span>
          </div>
        </div>
      )}

      {/* 3. Top Active Processes Monitor */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="font-hud text-[10px] text-cyan-400 tracking-wider mb-2 border-b border-cyan-950/60 pb-1 flex justify-between">
          <span>ACTIVE PROCESS SCHEDULER</span>
          <span className="text-slate-400">PID MATCH</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
          {processes.map(proc => (
            <div 
              key={`${proc.id}-${proc.name}`}
              className="flex justify-between items-center p-1.5 rounded bg-slate-950/30 hover:bg-slate-950/60 border border-slate-900 transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                <span className="text-slate-500">{proc.id}</span>
                <span className="text-slate-200 truncate">{proc.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-semibold">{proc.ramMB} MB</span>
                <button 
                  onClick={() => terminateProcess(proc.id, proc.name)}
                  className="text-slate-500 hover:text-red-500 transition-colors focus:outline-none"
                  title="Terminate process via local powershell"
                >
                  <XCircle size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action alerts / Local System Operations panel */}
      <div className="mt-4 pt-3 border-t border-cyan-900/60">
        <div className="flex gap-1.5 justify-center mb-2">
          <button 
            onClick={() => triggerSafeAction('calc')}
            className="text-[9px] font-mono px-2 py-1 bg-slate-950/60 border border-cyan-950 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-950/10 rounded transition-all focus:outline-none"
          >
            CALCULATOR
          </button>
          <button 
            onClick={() => triggerSafeAction('notepad')}
            className="text-[9px] font-mono px-2 py-1 bg-slate-950/60 border border-cyan-950 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-950/10 rounded transition-all focus:outline-none"
          >
            NOTEPAD
          </button>
          <button 
            onClick={() => triggerSafeAction('mspaint')}
            className="text-[9px] font-mono px-2 py-1 bg-slate-950/60 border border-cyan-950 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-950/10 rounded transition-all focus:outline-none"
          >
            PAINT
          </button>
        </div>

        {/* Floating operations log console */}
        <div 
          className="h-7 px-2 flex items-center bg-cyan-950/20 border border-cyan-900/40 rounded text-[9px] font-mono text-cyan-300 truncate"
          style={{ textShadow: '0 0 2px var(--cyan-neon-glow)' }}
        >
          {actionMessage ? (
            <span className="flex items-center gap-1">
              <ShieldCheck className="animate-pulse text-emerald-400" size={10} />
              {actionMessage}
            </span>
          ) : (
            <span className="opacity-45">SYSTEM HUD MONITORS: NOMINAL STATS</span>
          )}
        </div>
      </div>
    </div>
  );
};
