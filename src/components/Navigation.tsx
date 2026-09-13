import React from 'react';
import { 
  BarChart3, 
  Layers, 
  Sparkles, 
  Grid3X3, 
  SplitSquareVertical, 
  Activity, 
  Cpu, 
  CheckCircle2 
} from 'lucide-react';
import { AppTab } from '../types';

interface NavigationProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: AppTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'evaluation', label: 'Architectural Audit', icon: <BarChart3 className="w-4 h-4" />, badge: 'Gold Standard' },
    { id: 'roadmap', label: 'WebGL Throughput Roadmap', icon: <Cpu className="w-4 h-4" />, badge: '5 Phases' },
    { id: 'fractals', label: 'WebGL Fractal Engine', icon: <Sparkles className="w-4 h-4" />, badge: 'GPU 60fps' },
    { id: 'box-counter', label: 'Box-Counting Studio', icon: <Grid3X3 className="w-4 h-4" />, badge: 'D-Calc' },
    { id: 'image-compare', label: 'Image Compare', icon: <SplitSquareVertical className="w-4 h-4" />, badge: 'SSIM' },
    { id: 'brain-tumors', label: 'Brain Tumor Evidence', icon: <Activity className="w-4 h-4" />, badge: 'Clinical MRI' }
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Project Target */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  Fractals Precision Platform
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Gold Standard
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>Target: fractals.ai-aarti.com</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400">aartisr/fractals-web</span>
              </div>
            </div>
          </div>

          {/* System Telemetry Badges */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 font-mono">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>WebGL 2.0 ES 3.0</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sample Datasets Active</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-cyan-400/20 text-cyan-200'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
