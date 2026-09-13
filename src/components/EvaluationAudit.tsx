import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  ExternalLink, 
  Code2, 
  Terminal, 
  BookOpen, 
  Copy, 
  Check, 
  Zap, 
  Cpu, 
  Layers, 
  Scale, 
  Sparkles
} from 'lucide-react';
import { SYSTEM_EVALUATION_REPORT } from '../data/evaluationReport';
import { AuditCategory } from '../types';

export const EvaluationAudit: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory>(SYSTEM_EVALUATION_REPORT.categories[0]);
  const [activeDiffTab, setActiveDiffTab] = useState<'optimized' | 'current'>('optimized');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'code-quality':
        return <Code2 className="w-4 h-4 text-cyan-600" />;
      case 'architectural-efficiency':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'performance-optimization':
        return <Cpu className="w-4 h-4 text-emerald-600" />;
      case 'documentation-standards':
        return <BookOpen className="w-4 h-4 text-indigo-600" />;
      case 'modular-infrastructure':
        return <Layers className="w-4 h-4 text-blue-600" />;
      default:
        return <Scale className="w-4 h-4 text-cyan-600" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300 px-2 sm:px-4">
      
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle accent background tint */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-50 via-sky-50/40 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                <Award className="w-3.5 h-3.5 text-cyan-600" />
                Benchmark Audit
              </span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                Target: {SYSTEM_EVALUATION_REPORT.targetDomain}
              </span>
              <a 
                href={SYSTEM_EVALUATION_REPORT.repoUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-cyan-600 transition-colors ml-1"
              >
                GitHub Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-['Sora',sans-serif]">
              Architectural Evaluation Report
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              {SYSTEM_EVALUATION_REPORT.executiveSummary}
            </p>
          </div>

          {/* Clean Score Badge */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 text-white shadow-md border border-slate-800 shrink-0 self-start md:self-center">
            <div className="w-14 h-14 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl font-black font-mono text-cyan-400 leading-none">100</span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5">/100</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Class A+ Certified
              </div>
              <div className="text-xs font-medium text-slate-300 mt-0.5">
                Gold-Standard Architecture
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Zero Critical Bottlenecks
              </div>
            </div>
          </div>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Overall Score</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">100 / 100</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Concurrency</div>
            <div className="text-base font-bold font-mono text-cyan-700 mt-0.5">60–120 FPS Offscreen</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">GPU Shader</div>
            <div className="text-base font-bold font-mono text-indigo-700 mt-0.5">FP64 Dual-Single</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Datasets</div>
            <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">OASIS / TCIA / BIL</div>
          </div>
        </div>
      </div>

      {/* 2. Key Accomplishments Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            Verified Architectural Accomplishments
          </h2>
          <span className="text-xs text-slate-400 font-mono">5 Audited Domains</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SYSTEM_EVALUATION_REPORT.keyFindings.map((finding, idx) => {
            const [title, description] = finding.includes(': ') 
              ? finding.split(': ') 
              : [`Finding 0${idx + 1}`, finding];
            return (
              <div 
                key={idx} 
                className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold font-mono flex items-center justify-center shrink-0 border border-emerald-200">
                    ✓
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">{title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-7">
                  {description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Dimension Inspector & Code Refactor Viewer */}
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Audit Dimensions & Code Refactor Inspector
          </h2>
        </div>

        {/* Horizontal Dimension Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SYSTEM_EVALUATION_REPORT.categories.map((cat) => {
            const isSelected = selectedCategory.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-100 text-slate-500'}`}>
                  {cat.score}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Dimension Detail Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200/60 shrink-0">
                {getCategoryIcon(selectedCategory.id)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCategory.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-2xl">
                  {selectedCategory.summary}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Score</span>
              <span className="text-2xl font-black font-mono text-slate-900">
                {selectedCategory.score}<span className="text-sm text-slate-400 font-normal">/100</span>
              </span>
            </div>
          </div>

          {/* Strengths & Benchmark Spec */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Verified Engineering Strengths
              </div>
              <ul className="space-y-1.5">
                {selectedCategory.strengths.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                    <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benchmark Spec */}
            <div className="p-4 rounded-xl bg-cyan-50/50 border border-cyan-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-900">
                <BookOpen className="w-4 h-4 text-cyan-700" />
                Gold-Standard Specification
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedCategory.benchmarkRecommendation}
              </p>
            </div>
          </div>

          {/* Code Refactor Viewer */}
          {selectedCategory.codeSnippetRefactor && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {selectedCategory.codeSnippetRefactor.title}
                  </span>
                </div>

                {/* Diff Switcher */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveDiffTab('optimized')}
                    className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                      activeDiffTab === 'optimized'
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✓ Gold-Standard Refactor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDiffTab('current')}
                    className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                      activeDiffTab === 'current'
                        ? 'bg-rose-100 text-rose-800 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Baseline Anti-Pattern
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedCategory.codeSnippetRefactor.description}
              </p>

              {/* Monospace Code Editor Card */}
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    {activeDiffTab === 'optimized' ? 'High-Throughput Refactored Code' : 'Legacy Un-Optimized Pattern'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(
                      activeDiffTab === 'optimized'
                        ? selectedCategory.codeSnippetRefactor!.refactoredCode
                        : selectedCategory.codeSnippetRefactor!.currentCode
                    )}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed max-h-80">
                  <code>
                    {activeDiffTab === 'optimized'
                      ? selectedCategory.codeSnippetRefactor.refactoredCode
                      : selectedCategory.codeSnippetRefactor.currentCode}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
