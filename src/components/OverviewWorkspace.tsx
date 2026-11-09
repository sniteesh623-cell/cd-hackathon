// ============================================================================
// CompilerX — Overview Workspace (Apple Style Dashboard)
// Executive architecture summary, interactive pipeline map, and sample programs.
// ============================================================================

import React from 'react';
import { CompilerResult } from '../compiler/types';
import { SampleProgram, SAMPLE_PROGRAMS } from '../compiler/samples';
import { WorkspaceDestination } from './Sidebar';
import {
  Compass,
  ArrowRight,
  Code2,
  Layers,
  ShieldCheck,
  Terminal,
  Zap,
  Network,
  Activity,
  Cpu,
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  FileCode,
  BookOpen,
} from 'lucide-react';

interface OverviewWorkspaceProps {
  compilerResult: CompilerResult | null;
  onSelectWorkspace: (dest: WorkspaceDestination) => void;
  onSelectSample: (sample: SampleProgram) => void;
  selectedSampleId: string;
}

export const OverviewWorkspace: React.FC<OverviewWorkspaceProps> = ({
  compilerResult,
  onSelectWorkspace,
  onSelectSample,
  selectedSampleId,
}) => {
  const stats = compilerResult?.stats;
  const analytics = compilerResult?.analytics;

  const pipelineStages = [
    { title: '1. Source & Lexer', desc: `${stats?.tokenCount || 0} tokens emitted`, dest: 'workbench' as const, icon: Code2 },
    { title: '2. Parser & AST', desc: `${stats?.astNodeCount || 0} tree nodes`, dest: 'ast' as const, icon: Layers },
    { title: '3. Semantics & Scope', desc: `${compilerResult?.semantics?.symbolList.length || 0} registered symbols`, dest: 'symbols' as const, icon: ShieldCheck },
    { title: '4. Three-Address Code', desc: `${compilerResult?.tacInstructions.length || 0} instructions`, dest: 'ir' as const, icon: Terminal },
    { title: '5. Control Flow Graph', desc: `${compilerResult?.cfg?.blocks.length || 0} basic blocks`, dest: 'cfg' as const, icon: Network },
    { title: '6. Data-Flow Analysis', desc: 'Reaching defs & live vars', dest: 'dataflow' as const, icon: Activity },
    { title: '7. Optimization Lab', desc: `-${compilerResult?.optimization?.reductionPercentage || 0}% reduction`, dest: 'optimizer' as const, icon: Zap },
    { title: '8. Virtual Machine', desc: 'Step execution & debug', dest: 'vm' as const, icon: Cpu },
  ];

  return (
    <div className="overview-container">
      {/* Hero Banner (Apple-style Typography) */}
      <div className="overview-hero">
        <div className="hero-pill">
          <Sparkles size={13} className="text-cyan" />
          <span>Compiler Design Hackathon — Problem Statement PS-06</span>
        </div>
        <h1 className="hero-title">CompilerX Visual Workbench</h1>
        <p className="hero-subtitle">
          An interactive compiler platform translating restricted C-like code into syntax-directed
          Three-Address Code, control-flow graphs, data-flow lattices, and reversible VM execution.
        </p>

        <div className="hero-actions">
          <button onClick={() => onSelectWorkspace('workbench')} className="btn btn-primary">
            <Code2 size={15} /> Open Compiler Workbench
          </button>
          <button onClick={() => onSelectWorkspace('vm')} className="btn btn-secondary">
            <Cpu size={15} /> Launch VM Debugger
          </button>
          <button onClick={() => onSelectWorkspace('docs')} className="btn btn-ghost">
            <BookOpen size={15} /> Grammar Specification
          </button>
        </div>
      </div>

      {/* Quantitative Health Grid */}
      <div className="overview-stats-grid">
        <div className="overview-stat-card">
          <span className="stat-label">Compilation Status</span>
          <div className="stat-value-row">
            {compilerResult?.success ? (
              <span className="text-emerald flex items-center gap-1 font-semibold text-base">
                <CheckCircle2 size={16} /> Verified Clean
              </span>
            ) : (
              <span className="text-rose font-semibold text-base">Compilation Errors</span>
            )}
          </div>
          <span className="stat-desc">Parsed & validated deterministically</span>
        </div>

        <div className="overview-stat-card">
          <span className="stat-label">Pipeline Latency</span>
          <div className="stat-value-row font-mono text-cyan text-xl font-bold">
            {stats?.compileTimeMs || 0} ms
          </div>
          <span className="stat-desc">Zero external APIs, pure in-memory execution</span>
        </div>

        <div className="overview-stat-card">
          <span className="stat-label">Cyclomatic Complexity</span>
          <div className="stat-value-row font-mono text-purple text-xl font-bold">
            M = {analytics?.cyclomaticComplexity || 1}
          </div>
          <span className="stat-desc">McCabe metric based on basic block edges</span>
        </div>

        <div className="overview-stat-card">
          <span className="stat-label">Optimization Yield</span>
          <div className="stat-value-row font-mono text-emerald text-xl font-bold">
            -{compilerResult?.optimization?.reductionPercentage || 0}%
          </div>
          <span className="stat-desc">Instructions eliminated via constant folding & CSE</span>
        </div>
      </div>

      {/* Interactive Pipeline Architecture Stages */}
      <div className="overview-section">
        <div className="section-header">
          <Compass size={16} className="text-cyan" />
          <h2>End-to-End Compiler Pipeline Stages</h2>
          <span className="text-xs text-muted ml-auto">Click any stage to open its dedicated workspace</span>
        </div>

        <div className="pipeline-stages-grid">
          {pipelineStages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.title}
                className="pipeline-stage-card"
                onClick={() => onSelectWorkspace(stage.dest)}
              >
                <div className="stage-card-top">
                  <div className="stage-icon-box">
                    <Icon size={16} />
                  </div>
                  <ArrowRight size={13} className="stage-arrow text-muted" />
                </div>
                <div className="stage-title">{stage.title}</div>
                <div className="stage-desc">{stage.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick-Load Curated Sample Programs */}
      <div className="overview-section">
        <div className="section-header">
          <FileCode size={16} className="text-purple" />
          <h2>Curated Demonstration Programs</h2>
        </div>

        <div className="samples-grid">
          {SAMPLE_PROGRAMS.map(sample => {
            const isSelected = sample.id === selectedSampleId;
            return (
              <div
                key={sample.id}
                className={`sample-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectSample(sample);
                  onSelectWorkspace('workbench');
                }}
              >
                <div className="sample-card-header">
                  <span className="sample-name">{sample.name}</span>
                  <span className={`sample-cat-pill cat-${sample.category.toLowerCase().replace(/\s+/g, '-')}`}>
                    {sample.category}
                  </span>
                </div>
                <p className="sample-desc">{sample.description}</p>
                <div className="sample-card-footer">
                  <span className="text-xs text-cyan font-medium flex items-center gap-1">
                    Load into Workbench <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
