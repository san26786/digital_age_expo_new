'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Cpu, Users, Award } from 'lucide-react';

export function B2BGrowthFlywheel() {
  const [activeFlywheelNode, setActiveFlywheelNode] = useState<number | null>(null);
  const [flywheelRotation, setFlywheelRotation] = useState(0);

  useEffect(() => {
    const rotInterval = setInterval(() => {
      setFlywheelRotation(prev => (prev + 0.35) % 360);
    }, 45);
    return () => clearInterval(rotInterval);
  }, []);

  const nodes = [
    {
      id: 0,
      title: "Roadmap",
      desc: "Define your growth path & formulate core technical strategies.",
      shortDesc: "Define growth path",
      icon: MapPin,
      color: "var(--color-fuchsia-500)", // brand-pink
      positionStyle: { top: '50%', left: '77.5%' }
    },
    {
      id: 1,
      title: "Systems",
      desc: "Install elite automated infrastructures & cloud solutions.",
      shortDesc: "Install operations",
      icon: Cpu,
      color: "var(--color-cyan-accent)", // cyan
      positionStyle: { top: '77.5%', left: '50%' }
    },
    {
      id: 2,
      title: "Ecosystem",
      desc: "Connect with strategic corporate partners & suppliers.",
      shortDesc: "Connect network",
      icon: Users,
      color: "var(--color-fuchsia-500)", // brand-pink
      positionStyle: { top: '50%', left: '22.5%' }
    },
    {
      id: 3,
      title: "Authority",
      desc: "Dominate your niche and solidify key thought leadership.",
      shortDesc: "Dominate market",
      icon: Award,
      color: "var(--color-cyan-accent)", // cyan
      positionStyle: { top: '22.5%', left: '50%' }
    }
  ];

  return (
    <section className="relative py-20 px-6 overflow-hidden bg-slate-950 border-y border-slate-900">
      {/* Dynamic light bursts */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Interactive Flywheel Visualization */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-[420px] md:h-[420px] flex items-center justify-center">
              
              {/* Rotating Outer Dashed/Gradient Orbit */}
              <div 
                className="absolute inset-0 transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${flywheelRotation}deg)` }}
              >
                <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
                  <circle 
                    cx="200" 
                    cy="200" 
                    r="160" 
                    stroke="url(#flywheel-grad-comp)" 
                    strokeWidth="2" 
                    strokeDasharray="12 8" 
                    className="opacity-40"
                  />
                  <defs>
                    <linearGradient id="flywheel-grad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-fuchsia-500)" />
                      <stop offset="50%" stopColor="var(--color-cyan-accent)" />
                      <stop offset="100%" stopColor="var(--color-fuchsia-500)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Pulsing Central Glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse" />
              </div>

              {/* Central B2B Badge */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="w-24 h-24 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center shadow-2xl">
                  <div className="text-center">
                    <span className="text-fuchsia-500 font-black text-2xl block tracking-tight">B2B</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">Flywheel</span>
                  </div>
                </div>
              </div>

              {/* Satellite Nodes */}
              {nodes.map((node) => {
                const IconComponent = node.icon;
                const isActive = activeFlywheelNode === node.id;
                return (
                  <button 
                    key={node.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10 outline-none ${
                      isActive ? 'scale-115' : 'hover:scale-105'
                    }`}
                    style={node.positionStyle}
                    onMouseEnter={() => setActiveFlywheelNode(node.id)}
                    onMouseLeave={() => setActiveFlywheelNode(null)}
                    id={`flywheel-node-${node.id}`}
                  >
                    <div className="text-center">
                      <div 
                        className={`w-14 h-14 rounded-xl border flex items-center justify-center mx-auto mb-1.5 transition-all duration-300 ${
                          isActive 
                            ? 'border-fuchsia-500 bg-fuchsia-500/20 shadow-lg shadow-fuchsia-500/20 text-fuchsia-400' 
                            : 'border-slate-800 bg-slate-950 text-slate-300'
                        }`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-white whitespace-nowrap uppercase tracking-wider">{node.title}</p>
                      <p className="text-[9px] text-slate-500 whitespace-nowrap hidden sm:block">{node.shortDesc}</p>
                    </div>
                  </button>
                );
              })}

              {/* Connector Paths */}
              <div 
                className="absolute inset-0 pointer-events-none z-0"
                style={{ transform: `rotate(${flywheelRotation}deg)` }}
              >
                <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
                  <path d="M 310 200 Q 254.4 254.4 200 310" stroke="var(--color-cyan-accent)" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-30" />
                  <path d="M 200 310 Q 145.6 254.4 90 200" stroke="var(--color-fuchsia-500)" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-30" />
                  <path d="M 90 200 Q 145.6 145.6 200 90" stroke="var(--color-cyan-accent)" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-30" />
                  <path d="M 200 90 Q 254.4 145.6 310 200" stroke="var(--color-fuchsia-500)" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-30" />
                </svg>
              </div>

            </div>
          </div>

          {/* Content Description */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-bold text-fuchsia-400 uppercase tracking-wider font-mono">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-fuchsia-400" />
              <span>The Growth Flywheel</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight uppercase font-display">
              A System Where <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-accent">Every Part</span> Feeds the Next
            </h2>
            
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Most businesses operate in isolated silos. The Digital Age Expo connects your roadmap, operational systems, commercial ecosystem, and industry authority into one self-reinforcing enterprise engine. When one sector accelerates, your entire business expands.
            </p>

            {/* Dynamic Features List */}
            <div className="space-y-4">
              {nodes.map((node) => {
                const isActive = activeFlywheelNode === node.id;
                return (
                  <div 
                    key={node.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? 'border-fuchsia-500/40 bg-fuchsia-500/5 translate-x-2 shadow-md shadow-fuchsia-500/5' 
                        : 'border-slate-900 bg-slate-950/40 hover:border-slate-800 hover:bg-slate-950/80'
                    }`}
                    onMouseEnter={() => setActiveFlywheelNode(node.id)}
                    onMouseLeave={() => setActiveFlywheelNode(null)}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-slate-900 border border-slate-800">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: node.color }} />
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-sm uppercase tracking-wider">{node.title} Milestones</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{node.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
