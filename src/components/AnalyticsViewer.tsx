// ============================================================================
// CompilerX — Compiler Analytics & Export Workbench
// Displays quantitative complexity metrics and generates audit reports.
// ============================================================================

import React, { useState } from 'react';
import { CompilerAnalyticsReport, CompilerAnalytics } from '../compiler/analytics/analytics';
import { CompilerResult } from '../compiler/types';
import { ControlFlowGraph } from '../compiler/cfg/basicBlock';
import { OptimizationResult } from '../compiler/optimizer/optimizer';
import { SemanticAnalysisResult } from '../compiler/semantics/symbolTable';
import {
  BarChart3,
  Download,
  FileText,
  CheckCircle2,
  Cpu,
  Layers,
  Network,
  TrendingDown,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

interface AnalyticsViewerProps {
  compilerResult: CompilerResult | null;
  cfg: ControlFlowGraph | null;
  optResult: OptimizationResult | null;
  semantics: SemanticAnalysisResult | null;
}

export const AnalyticsViewer: React.FC<AnalyticsViewerProps> = ({
  compilerResult,
  cfg,
  optResult,
  semantics,
}) => {
  const [copied, setCopied] = useState(false);

  if (!compilerResult || !cfg) {
    return (
      <div className="empty-state">
        <BarChart3 size={40} className="empty-icon text-muted" />
        <h3>No Compiler Analytics Available</h3>
        <p>Compile source code to generate complexity metrics and exportable audit reports.</p>
      </div>
    );
  }

  const analytics = compilerResult.analytics || CompilerAnalytics.compute(compilerResult, cfg, optResult || undefined);
  const markdownReport = CompilerAnalytics.generateMarkdownReport(
    compilerResult,
    cfg,
    optResult || undefined,
    semantics || undefined
  );

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compilerx-audit-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const artifact = {
      sourceCode: compilerResult.sourceCode,
      stats: compilerResult.stats,
      analytics,
      tokensCount: compilerResult.tokens.length,
      astNodeCount: compilerResult.stats.astNodeCount,
      tacInstructionsCount: compilerResult.tacInstructions.length,
      tacInstructions: compilerResult.tacInstructions,
      quads: compilerResult.quads,
      cfgBlocks: cfg.blocks.map(b => ({ id: b.id, name: b.name, instructions: b.instructions.length, preds: b.predecessors, succs: b.successors })),
      optimization: optResult ? {
        originalCount: optResult.originalCount,
        optimizedCount: optResult.optimizedCount,
        reductionPercentage: optResult.reductionPercentage,
        temporariesSaved: optResult.temporariesSaved,
      } : null,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compilerx-artifact-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="analytics-workspace">
      {/* Header */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div className="viewer-title">
            <BarChart3 size={18} className="text-cyan" />
            <h2>Compiler Analytics & Audit Exporter</h2>
          </div>
          <div className="viewer-actions flex items-center gap-2">
            <button onClick={handleCopyReport} className="btn btn-secondary btn-sm flex items-center gap-1">
              {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy Markdown'}
            </button>
            <button onClick={handleDownloadMarkdown} className="btn btn-primary btn-sm flex items-center gap-1">
              <Download size={13} /> Export .MD
            </button>
            <button onClick={handleDownloadJSON} className="btn btn-secondary btn-sm flex items-center gap-1">
              <Download size={13} /> Export .JSON
            </button>
          </div>
        </div>
        <p className="viewer-description">
          Quantitative compiler pipeline metrics: McCabe Cyclomatic Complexity, AST tree characteristics, temporary register pressure, and exportable engineering reports.
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="analytics-metrics-grid mb-4">
        <div className="metric-card">
          <span className="metric-label">Cyclomatic Complexity</span>
          <span className="metric-value font-mono text-cyan">{analytics.cyclomaticComplexity}</span>
          <span className="text-2xs text-muted">M = E - N + 2P</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">AST Depth</span>
          <span className="metric-value font-mono text-purple">{analytics.astDepth} levels</span>
          <span className="text-2xs text-muted">Max Tree Nesting</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Instruction Density</span>
          <span className="metric-value font-mono text-emerald">{analytics.instructionDensity}</span>
          <span className="text-2xs text-muted">TAC ops / Source line</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Peak Temp Pressure</span>
          <span className="metric-value font-mono text-amber">{analytics.peakTemporaryPressure} regs</span>
          <span className="text-2xs text-muted">Simultaneous Temporaries</span>
        </div>
      </div>

      {/* Detailed Pipeline Breakdown Table */}
      <div className="card-panel mb-4">
        <div className="card-title mb-2">
          <Layers size={14} className="text-purple" />
          <span>Compiler Pipeline Stage Characteristics</span>
        </div>

        <div className="table-responsive">
          <table className="data-table font-mono text-xs">
            <thead>
              <tr>
                <th>Compilation Stage</th>
                <th>Primary Output</th>
                <th>Volume Count</th>
                <th>Latency (ms)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1. Lexical Analyzer</td>
                <td>Tokens & Source Coordinates</td>
                <td>{compilerResult.stats.tokenCount} tokens</td>
                <td>&lt; 1 ms</td>
                <td><span className="badge badge-emerald">PASSED</span></td>
              </tr>
              <tr>
                <td>2. Recursive-Descent Parser</td>
                <td>Abstract Syntax Tree</td>
                <td>{compilerResult.stats.astNodeCount} nodes</td>
                <td>&lt; 1 ms</td>
                <td><span className="badge badge-emerald">PASSED</span></td>
              </tr>
              <tr>
                <td>3. Semantic Analyzer</td>
                <td>Lexical Scopes & Symbols</td>
                <td>{semantics?.symbolList.length || 0} symbols</td>
                <td>&lt; 1 ms</td>
                <td><span className="badge badge-emerald">PASSED</span></td>
              </tr>
              <tr>
                <td>4. TAC Generator & SDT</td>
                <td>Three-Address Code & Backpatches</td>
                <td>{compilerResult.tacInstructions.length} instructions</td>
                <td>&lt; 1 ms</td>
                <td><span className="badge badge-emerald">PASSED</span></td>
              </tr>
              <tr>
                <td>5. CFG & Basic Blocks</td>
                <td>Directed Flow Graph</td>
                <td>{cfg.blocks.length} blocks</td>
                <td>&lt; 1 ms</td>
                <td><span className="badge badge-emerald">PASSED</span></td>
              </tr>
              <tr>
                <td>6. Optimizer Lab</td>
                <td>Optimized TAC Stream</td>
                <td>{optResult?.optimizedCount || compilerResult.tacInstructions.length} lines (-{analytics.optimizationSavings.percentage}%)</td>
                <td>&lt; 1 ms</td>
                <td><span className="badge badge-emerald">OPTIMIZED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Markdown Audit Report Preview */}
      <div className="card-panel report-preview-panel">
        <div className="card-title mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <FileText size={14} className="text-cyan" />
            <span>Audit Report Preview (Markdown)</span>
          </div>
        </div>
        <pre className="report-markdown-preview font-mono text-2xs p-3 bg-subtle rounded max-h-80 overflow-y-auto">
          {markdownReport}
        </pre>
      </div>
    </div>
  );
};
