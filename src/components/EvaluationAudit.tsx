import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Code2, 
  Terminal, 
  BookOpen, 
  ChevronRight, 
  ExternalLink,
  Award
} from 'lucide-react';
import { SYSTEM_EVALUATION_REPORT } from '../data/evaluationReport';
import { AuditCategory } from '../types';

export const EvaluationAudit: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory>(SYSTEM_EVALUATION_REPORT.categories[0]);
  const [activeDiffTab, setActiveDiffTab] = useState<'current' | 'nobel'>('nobel');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Award className="w-3.5 h-3.5" />
                Nobel-Cadre Architectural Evaluation
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                Target: {SYSTEM_EVALUATION_REPORT.targetDomain}
              </span>
              <a 
                href={SYSTEM_EVALUATION_REPORT.repoUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
              >
                GitHub Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
              Code Quality, Architectural Efficiency & Throughput Audit
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {SYSTEM_EVALUATION_REPORT.executiveSummary}
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex sm:flex-col items-center justify-center p-5 rounded-xl bg-slate-800/80 border border-slate-700 text-center min-w-[160px] shadow-xl">
            <div className="text-4xl font-extrabold text-cyan-400 font-mono tracking-tighter">
              {SYSTEM_EVALUATION_REPORT.overallScore}
              <span className="text-lg font-normal text-slate-400">/100</span>
            </div>
            <div className="text-xs font-medium text-slate-300 mt-1 uppercase tracking-wider">
              Composite Quality
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 font-mono">
              Grade: Class A- (Production Ready with Refactors)
            </div>
          </div>
        </div>

        {/* Key Findings Strip */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Priority Architectural Findings
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SYSTEM_EVALUATION_REPORT.keyFindings.map((finding, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-800"
              >
                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-mono text-cyan-300 shrink-0 mt-0.5">
                  0{idx + 1}
                </div>
                <span>{finding}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid & Drilldown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Category Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Evaluation Dimensions
          </div>
          {SYSTEM_EVALUATION_REPORT.categories.map((cat) => {
            const isSelected = selectedCategory.id === cat.id;
            return (
              <div
                key={cat.id}
                id={`cat-card-${cat.id}`}
                onClick={() => setSelectedCategory(cat)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-100">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">{cat.score}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                  {cat.summary}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    cat.status === 'EXCELLENT' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : cat.status === 'CRITICAL_BOTTLENECK'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {cat.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Drill-down & Code Refactor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedCategory.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCategory.summary}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400 uppercase">Domain Score</span>
                <div className="text-2xl font-bold font-mono text-cyan-400">{selectedCategory.score}/100</div>
              </div>
            </div>

            {/* Strengths & Vulnerabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  Demonstrated Strengths
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {selectedCategory.strengths.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400">
                  <XCircle className="w-4 h-4" />
                  Identified Bottlenecks & Risks
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {selectedCategory.vulnerabilities.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Nobel-Cadre Specification */}
            <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-800/30 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                <BookOpen className="w-4 h-4" />
                Nobel-Cadre Engineering Standard
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedCategory.nobelCadreRecommendation}
              </p>
            </div>

            {/* Code Refactor Diff if present */}
            {selectedCategory.codeSnippetRefactor && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      {selectedCategory.codeSnippetRefactor.title}
                    </span>
                  </div>
                  <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                    <button
                      onClick={() => setActiveDiffTab('current')}
                      className={`px-2.5 py-1 text-xs font-mono rounded ${
                        activeDiffTab === 'current'
                          ? 'bg-rose-500/20 text-rose-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Current Anti-Pattern
                    </button>
                    <button
                      onClick={() => setActiveDiffTab('nobel')}
                      className={`px-2.5 py-1 text-xs font-mono rounded ${
                        activeDiffTab === 'nobel'
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Nobel Refactor
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  {selectedCategory.codeSnippetRefactor.description}
                </p>

                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                  <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      {activeDiffTab === 'current' ? 'Legacy Implementation' : 'High-Throughput Architecture'}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      activeDiffTab === 'current' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {activeDiffTab === 'current' ? 'Legacy' : 'Optimized'}
                    </span>
                  </div>
                  <pre className="p-4 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed max-h-80">
                    <code>
                      {activeDiffTab === 'current'
                        ? selectedCategory.codeSnippetRefactor.currentCode
                        : selectedCategory.codeSnippetRefactor.nobelCode}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
