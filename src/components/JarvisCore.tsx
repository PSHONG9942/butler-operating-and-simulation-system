import React, { useEffect, useRef } from 'react';

export type CoreState = 'idling' | 'listening' | 'thinking' | 'speaking';

interface JarvisCoreProps {
  state: CoreState;
  volume?: number; // 0 to 1, for voice visualizer reactivity
}

// Global helper to play synthesized audio via Web Audio API
export function playSynthSound(type: 'click' | 'powerup' | 'processing' | 'speechStart') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } 
    else if (type === 'powerup') {
      const duration = 0.8;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + duration);
      
      osc2.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + duration);
      osc2.stop(audioCtx.currentTime + duration);
    }
    else if (type === 'speechStart') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    }
  } catch (e) {
    console.error('Audio synthesis not supported or interaction deferred.', e);
  }
}

export const JarvisCore: React.FC<JarvisCoreProps> = ({ state, volume = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  // Track rotation angles locally
  const angle1 = useRef(0);
  const angle2 = useRef(0);
  const angle3 = useRef(0);
  const pulseFactor = useRef(1);
  const pulseDirection = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = 240;
      canvas.height = 240;
    };
    resizeCanvas();

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Select core colors based on state
      let glowColor = 'rgba(0, 240, 255, 0.4)';
      let mainColor = '#00f0ff';
      let secColor = 'rgba(0, 240, 255, 0.2)';
      let rotationMultiplier = 1;

      if (state === 'thinking') {
        glowColor = 'rgba(255, 183, 0, 0.4)';
        mainColor = '#ffb700';
        secColor = 'rgba(255, 183, 0, 0.2)';
        rotationMultiplier = 2.5;
      } else if (state === 'listening') {
        glowColor = 'rgba(0, 240, 255, 0.7)';
        mainColor = '#00f0ff';
        secColor = 'rgba(0, 240, 255, 0.3)';
        rotationMultiplier = 0.5;
      } else if (state === 'speaking') {
        glowColor = 'rgba(0, 240, 255, 0.5)';
        mainColor = '#00f0ff';
        secColor = 'rgba(0, 240, 255, 0.2)';
        rotationMultiplier = 1.2;
      }

      // Update rotation angles
      angle1.current += 0.005 * rotationMultiplier;
      angle2.current -= 0.008 * rotationMultiplier;
      angle3.current += 0.012 * rotationMultiplier;

      // Update pulse factors
      if (state === 'listening') {
        // Pulse strongly based on volume or simulated audio levels
        pulseFactor.current = 1.0 + (volume * 0.4) + Math.sin(Date.now() / 80) * 0.05;
      } else if (state === 'speaking') {
        // Simulated voice amplitude wave
        pulseFactor.current = 1.0 + Math.abs(Math.sin(Date.now() / 120)) * 0.25;
      } else if (state === 'thinking') {
        pulseFactor.current = 1.05 + Math.sin(Date.now() / 50) * 0.05;
      } else {
        // Steady idle breathing pulse
        pulseFactor.current += 0.003 * pulseDirection.current;
        if (pulseFactor.current > 1.08 || pulseFactor.current < 0.95) {
          pulseDirection.current *= -1;
        }
      }

      // Glow effect configuration
      ctx.shadowBlur = 15;
      ctx.shadowColor = mainColor;

      const baseRadius = 70 * pulseFactor.current;

      // DRAWING LAYER 1: Ambient Backdrop Glowing Circle
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius - 10, 0, Math.PI * 2);
      ctx.fillStyle = secColor;
      ctx.fill();

      // DRAWING LAYER 2: Outer Tick Marks Ring (Slow rotating)
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = mainColor;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle1.current);
      for (let i = 0; i < 24; i++) {
        ctx.rotate((Math.PI * 2) / 24);
        ctx.beginPath();
        // Skip some ticks to create spaces
        if (i % 6 !== 0) {
          ctx.moveTo(0, -(baseRadius + 12));
          ctx.lineTo(0, -(baseRadius + 16));
          ctx.stroke();
        }
      }
      ctx.restore();

      // DRAWING LAYER 3: Main Fragmented Interrupted Circle (Clockwise)
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = mainColor;
      ctx.beginPath();
      // Draw arcs with gaps
      ctx.arc(cx, cy, baseRadius, angle2.current, angle2.current + Math.PI * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, angle2.current + Math.PI * 0.9, angle2.current + Math.PI * 1.5);
      ctx.stroke();

      // DRAWING LAYER 4: Inner Counter-Rotating Ring with Triangles (Counter-clockwise)
      const innerRadius = baseRadius - 20;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1;
      ctx.strokeStyle = mainColor;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle3.current);
      
      // Draw inner continuous but thin circle
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw three node triangles pointing inwards
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, -innerRadius);
        ctx.lineTo(-6, -innerRadius + 8);
        ctx.lineTo(6, -innerRadius + 8);
        ctx.closePath();
        ctx.fillStyle = mainColor;
        ctx.fill();
      }
      ctx.restore();

      // DRAWING LAYER 5: Central Core Pulsing Circle
      ctx.shadowBlur = 20;
      ctx.beginPath();
      const coreSize = 14 * (state === 'speaking' ? pulseFactor.current * 1.1 : pulseFactor.current);
      ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();

      // Draw minor details: Central crosshairs
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
      ctx.stroke();

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [state, volume]);

  const handleCoreClick = () => {
    playSynthSound('click');
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 relative" style={{ zIndex: 5 }}>
      {/* Outer Holographic Orbit HUD Glow */}
      <div 
        onClick={handleCoreClick}
        className="cursor-pointer relative flex items-center justify-center rounded-full transition-all duration-500"
        style={{
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(0,240,255,0.03) 0%, transparent 70%)',
          border: '1px solid rgba(0, 240, 255, 0.05)',
          boxShadow: state === 'listening' 
            ? '0 0 30px rgba(0, 240, 255, 0.15)' 
            : state === 'thinking'
            ? '0 0 30px rgba(255, 183, 0, 0.15)'
            : 'none'
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        
        {/* Sleek rotating tech details around canvas */}
        <div className="absolute inset-0 pointer-events-none rounded-full border border-dashed border-cyan-500 opacity-20 animate-spin" style={{ animationDuration: '30s' }} />
        <div className="absolute inset-4 pointer-events-none rounded-full border border-dotted border-cyan-400 opacity-10 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
      </div>

      {/* State Status Display text */}
      <div className="mt-4 text-center">
        <span 
          className="text-xs uppercase tracking-widest font-semibold"
          style={{
            fontFamily: 'var(--font-hud)',
            color: state === 'thinking' ? 'var(--gold-neon)' : 'var(--cyan-neon)',
            textShadow: `0 0 6px ${state === 'thinking' ? 'var(--gold-glow)' : 'var(--cyan-neon-glow)'}`
          }}
        >
          {state === 'idling' && 'SYS STATE: STANDBY'}
          {state === 'listening' && 'SYS STATE: LISTENING'}
          {state === 'thinking' && 'SYS STATE: ANALYZING'}
          {state === 'speaking' && 'SYS STATE: RESPONSE_TRANSMITTING'}
        </span>
      </div>
    </div>
  );
};
