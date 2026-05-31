import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Activity, HelpCircle } from 'lucide-react';
import { playSynthSound } from './JarvisCore';

interface SimulationDeckProps {
  currentSim: 'pendulum' | 'gravity' | 'swarm' | 'life';
  onSimChange: (sim: 'pendulum' | 'gravity' | 'swarm' | 'life') => void;
}

export const SimulationDeck: React.FC<SimulationDeckProps> = ({ 
  currentSim, 
  onSimChange 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [particlesCount, setParticlesCount] = useState(250);
  const animationFrameId = useRef<number | null>(null);

  // Simulation parameters & state history refs to preserve between renders
  const simState = useRef<any>({});

  const handleSimSelect = (sim: 'pendulum' | 'gravity' | 'swarm' | 'life') => {
    playSynthSound('click');
    onSimChange(sim);
    // Reset state for new simulation
    simState.current = {};
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fluid resize handler
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 600) * (window.devicePixelRatio || 1);
      canvas.height = (rect?.height || 300) * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial setups for different simulation engines
    const initSimulation = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      if (currentSim === 'pendulum') {
        // Double pendulum parameters: length1, length2, mass1, mass2, theta1, theta2, vel1, vel2, traceTrail
        simState.current = {
          l1: Math.min(w, h) * 0.22,
          l2: Math.min(w, h) * 0.22,
          m1: 20,
          m2: 20,
          t1: Math.PI / 2,
          t2: Math.PI / 2 + 0.1,
          v1: 0,
          v2: 0,
          g: 0.8, // gravity factor
          trail: [] as {x: number, y: number}[]
        };
      } 
      else if (currentSim === 'gravity') {
        // Gravity well parameters: Massive sun in center, orbiting planets
        const planets = [];
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 120;
          const orbitalSpeed = Math.sqrt(0.8 * 800 / dist); // circular orbit approximation
          planets.push({
            x: w / 2 + Math.cos(angle) * dist,
            y: h / 2 + Math.sin(angle) * dist,
            vx: -Math.sin(angle) * orbitalSpeed,
            vy: Math.cos(angle) * orbitalSpeed,
            radius: 2 + Math.random() * 3,
            color: `rgba(0, 240, 255, ${0.4 + Math.random() * 0.6})`,
            trail: [] as {x: number, y: number}[]
          });
        }
        simState.current = {
          sun: { x: w / 2, y: h / 2, mass: 800, radius: 15 },
          planets
        };
      } 
      else if (currentSim === 'swarm') {
        // Particle Swarm parameters
        const particles = [];
        for (let i = 0; i < particlesCount; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: 1 + Math.random() * 1.5
          });
        }
        simState.current = { particles, mouseX: w / 2, mouseY: h / 2 };

        const handleMouseMove = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          simState.current.mouseX = e.clientX - rect.left;
          simState.current.mouseY = e.clientY - rect.top;
        };
        canvas.addEventListener('mousemove', handleMouseMove);
        return () => canvas.removeEventListener('mousemove', handleMouseMove);
      } 
      else if (currentSim === 'life') {
        // Conway's Game of life grid setup
        const cols = Math.floor(w / 8);
        const rows = Math.floor(h / 8);
        let grid = Array(rows).fill(null).map(() => 
          Array(cols).fill(null).map(() => Math.random() > 0.85 ? 1 : 0)
        );
        simState.current = { grid, cols, rows, lastUpdate: 0 };
      }
    };

    const cleanupMouseMove = initSimulation();

    // MAIN ANIMATION LOOP
    const run = () => {
      if (!ctx || !canvas) return;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)'; // slight trail bleed
      ctx.fillRect(0, 0, w, h);

      // Draw subtle telemetry HUD background on simulation screen
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Draw grid
      for (let x = 0; x < w; x += 40) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 40) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      if (isPlaying) {
        // Run specific physics calculations multiple times per frame for speed multiplier
        for (let step = 0; step < speed; step++) {
          // A. DOUBLE PENDULUM SWING
          if (currentSim === 'pendulum' && simState.current.l1) {
            const p = simState.current;
            // Lagrangian equations of motion for double pendulum (derived via Runge-Kutta/Euler step)
            const num1 = -p.g * (2 * p.m1 + p.m2) * Math.sin(p.t1) - p.m2 * p.g * Math.sin(p.t1 - 2 * p.t2) - 2 * Math.sin(p.t1 - p.t2) * p.m2 * (p.v2 * p.v2 * p.l2 + p.v1 * p.v1 * p.l1 * Math.cos(p.t1 - p.t2));
            const den1 = p.l1 * (2 * p.m1 + p.m2 - p.m2 * Math.cos(2 * p.t1 - 2 * p.t2));
            const a1 = num1 / den1;

            const num2 = 2 * Math.sin(p.t1 - p.t2) * (p.v1 * p.v1 * p.l1 * (p.m1 + p.m2) + p.g * (p.m1 + p.m2) * Math.cos(p.t1) + p.v2 * p.v2 * p.l2 * p.m2 * Math.cos(p.t1 - p.t2));
            const den2 = p.l2 * (2 * p.m1 + p.m2 - p.m2 * Math.cos(2 * p.t1 - 2 * p.t2));
            const a2 = num2 / den2;

            p.v1 += a1 * 0.05;
            p.v2 += a2 * 0.05;
            p.t1 += p.v1 * 0.05;
            p.t2 += p.v2 * 0.05;

            // Apply friction/air dampening
            p.v1 *= 0.999;
            p.v2 *= 0.999;
          }
          // B. ORBITAL GRAVITY MECHANICS
          else if (currentSim === 'gravity' && simState.current.sun) {
            const p = simState.current;
            p.planets.forEach((planet: any) => {
              const dx = p.sun.x - planet.x;
              const dy = p.sun.y - planet.y;
              const distSq = dx * dx + dy * dy;
              const dist = Math.sqrt(distSq);
              
              if (dist > 5) {
                // Newton's law: F = G*M/r^2 (G normalized to 1)
                const force = p.sun.mass / distSq;
                planet.vx += (dx / dist) * force * 0.1;
                planet.vy += (dy / dist) * force * 0.1;
              }
              
              planet.x += planet.vx * 0.8;
              planet.y += planet.vy * 0.8;

              // Store trail history
              if (step === 0) {
                planet.trail.push({ x: planet.x, y: planet.y });
                if (planet.trail.length > 50) planet.trail.shift();
              }
            });
          }
          // C. QUANTUM SWARM
          else if (currentSim === 'swarm' && simState.current.particles) {
            const p = simState.current;
            p.particles.forEach((part: any) => {
              const dx = p.mouseX - part.x;
              const dy = p.mouseY - part.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              // Gravity pull to cursor
              if (dist > 2) {
                part.vx += (dx / dist) * 0.12;
                part.vy += (dy / dist) * 0.12;
              }

              // Random quantum fluctuations
              part.vx += (Math.random() - 0.5) * 0.3;
              part.vy += (Math.random() - 0.5) * 0.3;

              // Apply drag
              part.vx *= 0.94;
              part.vy *= 0.94;

              part.x += part.vx;
              part.y += part.vy;

              // Boundary wrap
              if (part.x < 0) part.x = w;
              if (part.x > w) part.x = 0;
              if (part.y < 0) part.y = h;
              if (part.y > h) part.y = 0;
            });
          }
          // D. GAME OF LIFE STEPS
          else if (currentSim === 'life' && simState.current.grid) {
            const p = simState.current;
            // Control generation throttle (updates life every 8 frames for visual readability)
            const now = Date.now();
            if (now - p.lastUpdate > 100 / speed) {
              const next = p.grid.map((row: number[], rIdx: number) =>
                row.map((cell: number, cIdx: number) => {
                  let neighbors = 0;
                  for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                      if (i === 0 && j === 0) continue;
                      const r = (rIdx + i + p.rows) % p.rows;
                      const c = (cIdx + j + p.cols) % p.cols;
                      neighbors += p.grid[r][c];
                    }
                  }
                  if (cell === 1 && (neighbors < 2 || neighbors > 3)) return 0;
                  if (cell === 0 && neighbors === 3) return 1;
                  return cell;
                })
              );
              p.grid = next;
              p.lastUpdate = now;
            }
          }
        }
      }

      // RENDER SECTION
      // A. RENDER DOUBLE PENDULUM
      if (currentSim === 'pendulum' && simState.current.l1) {
        const p = simState.current;
        const cx = w / 2;
        const cy = h / 3;

        const x1 = cx + p.l1 * Math.sin(p.t1);
        const y1 = cy + p.l1 * Math.cos(p.t1);
        const x2 = x1 + p.l2 * Math.sin(p.t2);
        const y2 = y1 + p.l2 * Math.cos(p.t2);

        // Store trail
        if (isPlaying) {
          p.trail.push({ x: x2, y: y2 });
          if (p.trail.length > 350) p.trail.shift();
        }

        // Render Trail
        if (p.trail.length > 1) {
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          const grad = ctx.createLinearGradient(cx, cy, x2, y2);
          grad.addColorStop(0, 'rgba(0, 240, 255, 0.05)');
          grad.addColorStop(1, 'rgba(255, 183, 0, 0.8)');
          ctx.strokeStyle = grad;
          ctx.stroke();
        }

        // Draw rods
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw pivot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw Bob 1
        ctx.fillStyle = 'var(--cyan-neon)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'var(--cyan-neon)';
        ctx.beginPath();
        ctx.arc(x1, y1, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw Bob 2 (Chaos indicator)
        ctx.fillStyle = 'var(--gold-neon)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'var(--gold-neon)';
        ctx.beginPath();
        ctx.arc(x2, y2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // B. RENDER ORBITAL GRAVITY
      else if (currentSim === 'gravity' && simState.current.sun) {
        const p = simState.current;

        // Draw bent mesh grid lines representing curved Spacetime!
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.035)';
        ctx.lineWidth = 1;
        for (let x = 20; x < w; x += 30) {
          ctx.beginPath();
          for (let y = 0; y < h; y += 10) {
            const dx = p.sun.x - x;
            const dy = p.sun.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Curvature pull factor
            const curve = Math.min(25, 400 / dist);
            const px = x + (dx / dist) * curve;
            const py = y + (dy / dist) * curve;
            if (y === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Draw Sun (heavy gravity source)
        ctx.fillStyle = 'var(--gold-neon)';
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'var(--gold-neon)';
        ctx.beginPath();
        ctx.arc(p.sun.x, p.sun.y, p.sun.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw orbiting planets & trails
        p.planets.forEach((planet: any) => {
          ctx.shadowBlur = 0;
          if (planet.trail.length > 1) {
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(planet.trail[0].x, planet.trail[0].y);
            for (let i = 1; i < planet.trail.length; i++) {
              ctx.lineTo(planet.trail[i].x, planet.trail[i].y);
            }
            ctx.stroke();
          }

          ctx.fillStyle = planet.color;
          ctx.shadowBlur = 5;
          ctx.shadowColor = planet.color;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      }
      // C. RENDER QUANTUM SWARM
      else if (currentSim === 'swarm' && simState.current.particles) {
        const p = simState.current;

        // Draw interactive geometric constellation web lines
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        for (let i = 0; i < p.particles.length; i++) {
          for (let j = i + 1; j < p.particles.length; j++) {
            const p1 = p.particles[i];
            const p2 = p.particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Link if close
            if (dist < 40) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }

        // Draw quantum nodes
        ctx.fillStyle = 'var(--cyan-neon)';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'var(--cyan-neon)';
        p.particles.forEach((part: any) => {
          ctx.beginPath();
          ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw attractive target indicator
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 183, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.mouseX, p.mouseY, 15, 0, Math.PI * 2);
        ctx.moveTo(p.mouseX - 20, p.mouseY); ctx.lineTo(p.mouseX + 20, p.mouseY);
        ctx.moveTo(p.mouseX, p.mouseY - 20); ctx.lineTo(p.mouseX, p.mouseY + 20);
        ctx.stroke();
      }
      // D. RENDER CONWAY'S GAME OF LIFE
      else if (currentSim === 'life' && simState.current.grid) {
        const p = simState.current;
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'var(--cyan-neon)';
        
        for (let r = 0; r < p.rows; r++) {
          for (let c = 0; c < p.cols; c++) {
            if (p.grid[r][c] === 1) {
              ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
              ctx.fillRect(c * 8 + 1, r * 8 + 1, 6, 6);
            }
          }
        }
        ctx.shadowBlur = 0;
      }

      animationFrameId.current = requestAnimationFrame(run);
    };

    run();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      cleanupMouseMove?.();
    };
  }, [currentSim, isPlaying, speed, particlesCount]);

  return (
    <div className="cyber-panel h-full flex flex-col p-4 relative" style={{ gridColumn: '2 / 3', gridRow: '3 / 4', zIndex: 5 }}>
      {/* Corner decorations */}
      <div className="tech-corner corner-tl" />
      <div className="tech-corner corner-tr" />
      <div className="tech-corner corner-bl" />
      <div className="tech-corner corner-br" />

      {/* Header controls layout */}
      <div className="flex items-center justify-between border-b border-cyan-900 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="text-cyan-400 animate-pulse" size={16} />
          <h2 className="font-semibold text-xs tracking-wider" style={{ fontFamily: 'var(--font-hud)' }}>
            VISUAL SIMULATION MAIN DECK
          </h2>
        </div>

        {/* Engine switcher buttons */}
        <div className="flex gap-1">
          <button 
            onClick={() => handleSimSelect('pendulum')}
            className={`text-[9px] font-mono px-2 py-0.5 border rounded transition-all focus:outline-none ${
              currentSim === 'pendulum' ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-transparent border-cyan-950 text-slate-400 hover:text-cyan-400'
            }`}
          >
            CHAOS_PENDULUM
          </button>
          <button 
            onClick={() => handleSimSelect('gravity')}
            className={`text-[9px] font-mono px-2 py-0.5 border rounded transition-all focus:outline-none ${
              currentSim === 'gravity' ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-transparent border-cyan-950 text-slate-400 hover:text-cyan-400'
            }`}
          >
            SPACETIME_GRAVITY
          </button>
          <button 
            onClick={() => handleSimSelect('swarm')}
            className={`text-[9px] font-mono px-2 py-0.5 border rounded transition-all focus:outline-none ${
              currentSim === 'swarm' ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-transparent border-cyan-950 text-slate-400 hover:text-cyan-400'
            }`}
          >
            QUANTUM_SWARM
          </button>
          <button 
            onClick={() => handleSimSelect('life')}
            className={`text-[9px] font-mono px-2 py-0.5 border rounded transition-all focus:outline-none ${
              currentSim === 'life' ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-transparent border-cyan-950 text-slate-400 hover:text-cyan-400'
            }`}
          >
            GAME_OF_LIFE
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="flex-1 bg-slate-950/60 rounded border border-cyan-950/80 overflow-hidden relative">
        <canvas ref={canvasRef} />
        
        {/* Floating live HUD parameters overlay on Canvas */}
        <div className="absolute top-2 left-2 pointer-events-none font-mono text-[9px] text-cyan-400/80 space-y-0.5 bg-black/40 p-1.5 rounded border border-cyan-950/40">
          <div>ENGINE: {currentSim.toUpperCase()}_V1.4</div>
          <div>FPS: 60.0 hz (STEADY)</div>
          <div>INTEGRATION: {speed > 1 ? `RUNGE_KUTTA_4x` : `VERLET_1x`}</div>
          <div>SOLVER_STEP: 0.05s</div>
        </div>

        {/* Legend / explanation */}
        <div className="absolute bottom-2 right-2 pointer-events-none font-mono text-[8px] text-slate-500 bg-black/35 px-1.5 py-0.5 rounded">
          {currentSim === 'pendulum' && 'Double bob swinging chaotic gravitational system.'}
          {currentSim === 'gravity' && 'Newtonian spacetime mesh warped by massive singularity.'}
          {currentSim === 'swarm' && 'Interactive quantum nodes orbiting kinetic attractor.'}
          {currentSim === 'life' && 'Self-organizing mathematical cellular growth engine.'}
        </div>
      </div>

      {/* Footer Simulation Deck control bars */}
      <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-cyan-900/40 font-mono text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {/* Pause / Play */}
          <button 
            onClick={() => { playSynthSound('click'); setIsPlaying(!isPlaying); }}
            className="p-1 rounded bg-cyan-950/40 border border-cyan-950 hover:border-cyan-500 text-cyan-400 transition-all focus:outline-none"
            title={isPlaying ? "Pause Simulation" : "Play Simulation"}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          {/* Reset */}
          <button 
            onClick={() => { playSynthSound('click'); simState.current = {}; }}
            className="p-1 rounded bg-cyan-950/40 border border-cyan-950 hover:border-cyan-500 text-cyan-400 transition-all focus:outline-none"
            title="Reset Simulation"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Sliders for customization */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          {/* Speed slider */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]">SOLVE_RATE:</span>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={speed} 
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              className="w-16 h-1 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-[9px] font-bold text-cyan-400">{speed}x</span>
          </div>

          {/* Swarm specific sliders */}
          {currentSim === 'swarm' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px]">NODES:</span>
              <input 
                type="range" 
                min="50" 
                max="400" 
                value={particlesCount} 
                onChange={(e) => setParticlesCount(parseInt(e.target.value))}
                className="w-16 h-1 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-[9px] font-bold text-cyan-400">{particlesCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
