// ============================================================================
// CompilerX — Optimization Lab Interactive Workbench
// Configure passes, run multi-round optimization pipelines, and inspect diffs.
// ============================================================================

import React, { useState } from 'react';
import {
  OptimizationResult,
  OptimizationConfig,
  Optimizer,
  DEFAULT_OPTIMIZATION_CONFIG,
} from '../compiler/optimizer/optimizer';
import { TACInstruction } from '../compiler/types';
import {
  Zap,
  Sliders,
  Check,
  TrendingDown,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  History,
  CheckCircle2,
} from 'lucide-react';

interface OptimizerLabProps {
  initialResult: OptimizationResult | null;
  originalInstructions: TACInstruction[];
}

export const OptimizerLab: React.FC<OptimizerLabProps> = ({
  initialResult,
  originalInstructions,
}) => {
  const [config, setConfig] = useState<OptimizationConfig>(DEFAULT_OPTIMIZATION_CONFIG);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(initialResult);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'history'>('side-by-side');

  // Re-run optimization when toggles change or run button clicked
  const handleToggle = (key: keyof OptimizationConfig) => {
    const newConfig = { ...config, [key]: !config[key] };
    setConfig(newConfig);
    const updated = Optimizer.optimize(originalInstructions, newConfig);
    setOptResult(updated);
  };

  const handleReset = () => {
    setConfig(DEFAULT_OPTIMIZATION_CONFIG);
    const updated = Optimizer.optimize(originalInstructions, DEFAULT_OPTIMIZATION_CONFIG);
    setOptResult(updated);
  };

  if (!optResult || originalInstructions.length === 0) {
    return (
      <div className="empty-state">
        <Zap size={40} className="empty-icon text-muted" />
        <h3>No Optimization Data Available</h3>
        <p>Compile source code to launch the TAC Optimization Lab.</p>
      </div>
    );
  }

  return (
    <div className="optimizer-workspace">
      {/* Top Header */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div className="viewer-title">
            <Zap size={18} className="text-amber" />
            <h2>TAC Optimization Lab & Pass Pipeline</h2>
          </div>
          <div className="viewer-badges">
            <span className="badge badge-emerald">
              <TrendingDown size={12} /> {optResult.reductionPercentage}% Code Reduction
            </span>
            <span className="badge badge-purple">
              <Sparkles size={12} /> {optResult.temporariesSaved} Temps Saved
            </span>
            <span className="badge badge-cyan">
              <History size={12} /> {optResult.passHistory.length} Passes Applied
            </span>
          </div>
        </div>
        <p className="viewer-description">
          Modular multi-pass compiler optimization lab. Toggle individual passes, inspect algebraic simplifications, constant folding, common subexpressions, and dead code pruning.
        </p>

        {/* View Mode Toggle */}
        <div className="view-mode-tabs mt-2">
          <button
            className={`mode-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => setViewMode('side-by-side')}
          >
            <Layers size={13} /> Side-by-Side Diff Comparison
          </button>
          <button
            className={`mode-btn ${viewMode === 'history' ? 'active' : ''}`}
            onClick={() => setViewMode('history')}
          >
            <History size={13} /> Pass Transformation Audit ({optResult.passHistory.length})
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="opt-metrics-grid mb-4">
        <div className="metric-card">
          <span className="metric-label">Original TAC Lines</span>
          <span className="metric-value font-mono text-light">{optResult.originalCount}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Optimized TAC Lines</span>
          <span className="metric-value font-mono text-cyan">{optResult.optimizedCount}</span>
        </div>
        <div className="metric-card highlight-card">
          <span className="metric-label">Instruction Reduction</span>
          <span className="metric-value font-mono text-emerald">-{optResult.reductionPercentage}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Temporaries Pruned</span>
          <span className="metric-value font-mono text-purple">{optResult.temporariesSaved}</span>
        </div>
      </div>

      {/* Pass Control Bar (Toggles) */}
      <div className="card-panel pass-controls-panel mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders size={15} className="text-cyan" />
            <span className="font-bold text-xs uppercase tracking-wide text-light">Active Compiler Passes:</span>
          </div>
          <button onClick={handleReset} className="btn btn-secondary btn-xs flex items-center gap-1">
            <RotateCcw size={11} /> Reset Defaults
          </button>
        </div>

        <div className="pass-checkboxes-grid">
          <label className={`pass-toggle-label ${config.constantFolding ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.constantFolding}
              onChange={() => handleToggle('constantFolding')}
            />
            <span>Constant Folding</span>
          </label>

          <label className={`pass-toggle-label ${config.constantPropagation ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.constantPropagation}
              onChange={() => handleToggle('constantPropagation')}
            />
            <span>Constant Propagation</span>
          </label>

          <label className={`pass-toggle-label ${config.algebraicSimplification ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.algebraicSimplification}
              onChange={() => handleToggle('algebraicSimplification')}
            />
            <span>Algebraic Identities</span>
          </label>

          <label className={`pass-toggle-label ${config.copyPropagation ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.copyPropagation}
              onChange={() => handleToggle('copyPropagation')}
            />
            <span>Copy Propagation</span>
          </label>

          <label className={`pass-toggle-label ${config.commonSubexpressionElimination ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.commonSubexpressionElimination}
              onChange={() => handleToggle('commonSubexpressionElimination')}
            />
            <span>CSE (Common Subexpr)</span>
          </label>

          <label className={`pass-toggle-label ${config.deadCodeElimination ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.deadCodeElimination}
              onChange={() => handleToggle('deadCodeElimination')}
            />
            <span>Dead Code Elimination</span>
          </label>
        </div>
      </div>

      {/* Main View: Side-by-Side Diff */}
      {viewMode === 'side-by-side' && (
        <div className="opt-diff-grid">
          {/* Left Column: Original TAC */}
          <div className="card-panel diff-panel">
            <div className="card-title text-muted mb-2">
              <span>Original Three-Address Code ({optResult.originalCount} lines)</span>
            </div>
            <div className="code-listing-box font-mono text-xs">
              {optResult.originalInstructions.map(instr => (
                <div key={instr.index} className="code-line">
                  <span className="line-num">{instr.index}.</span>
                  <span className="line-code">{instr.rawText}</span>
                  {instr.comment && <span className="line-comment">// {instr.comment}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Optimized TAC */}
          <div className="card-panel diff-panel highlight-panel">
            <div className="card-title text-emerald mb-2">
              <Sparkles size={14} className="text-emerald mr-1" />
              <span>Optimized Three-Address Code ({optResult.optimizedCount} lines)</span>
            </div>
            <div className="code-listing-box font-mono text-xs">
              {optResult.optimizedInstructions.map(instr => {
                const wasChanged = instr.comment && (instr.comment.includes('Folded') || instr.comment.includes('Algebraic') || instr.comment.includes('CSE'));
                return (
                  <div key={instr.index} className={`code-line ${wasChanged ? 'optimized-line' : ''}`}>
                    <span className="line-num">{instr.index}.</span>
                    <span className="line-code font-bold">{instr.rawText}</span>
                    {instr.comment && <span className="line-comment text-emerald font-sans">// {instr.comment}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* View 2: Pass History Timeline */}
      {viewMode === 'history' && (
        <div className="card-panel">
          <div className="card-title mb-3">
            <History size={16} className="text-cyan" />
            <span>Optimization Pass Transformation Log</span>
          </div>

          {optResult.passHistory.length === 0 ? (
            <div className="empty-state py-8">
              <CheckCircle2 size={32} className="text-emerald mb-2" />
              <h4>No Transformations Required</h4>
              <p className="text-muted text-xs">The generated code is already canonical and minimal under active pass settings.</p>
            </div>
          ) : (
            <div className="pass-history-list">
              {optResult.passHistory.map((pass, pIdx) => (
                <div key={pIdx} className="pass-log-card">
                  <div className="pass-log-header">
                    <span className="badge badge-amber font-mono">Pass #{pIdx + 1}</span>
                    <span className="pass-name font-bold text-light">{pass.passName}</span>
                    <span className="badge badge-emerald ml-auto">
                      {pass.changesMade} modification(s)
                    </span>
                  </div>
                  <p className="pass-desc text-xs text-muted mt-1">{pass.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
