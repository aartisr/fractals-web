import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { EvaluationAudit } from './components/EvaluationAudit';
import { RoadmapView } from './components/RoadmapView';
import { WebGLFractalStudio } from './components/WebGLFractalStudio';
import { BoxCounterStudio } from './components/BoxCounterStudio';
import { ImageCompareStudio } from './components/ImageCompareStudio';
import { TumorMorphometryStudio } from './components/TumorMorphometryStudio';
import { AppTab } from './types';
import { Github, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('evaluation');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header Navigation */}
      <Navigation currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'evaluation' && <EvaluationAudit />}
        {currentTab === 'roadmap' && <RoadmapView />}
        {currentTab === 'fractals' && <WebGLFractalStudio />}
        {currentTab === 'box-counter' && <BoxCounterStudio />}
        {currentTab === 'image-compare' && <ImageCompareStudio />}
        {currentTab === 'brain-tumors' && <TumorMorphometryStudio />}
      </main>

      {/* Gold-Standard Scientific Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400 font-mono">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Fractals Precision Platform (Gold-Standard Specification)</span>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-500 hidden sm:inline">Target: fractals.ai-aarti.com & aartisr/fractals-web</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://github.com/aartisr/fractals-web"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Original Repo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-1 text-emerald-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>IEEE / ACM Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
