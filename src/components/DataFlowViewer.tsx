// ============================================================================
// CompilerX — Data-Flow Analysis Interactive Viewer
// Displays Reaching Definitions & Live Variables with fixed-point iteration playback.
// ============================================================================

import React, { useState } from 'react';
import { DataFlowAnalysisResult } from '../compiler/dataflow/dataflow';
import {
  Activity,
  GitCommit,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Table,
  CheckCircle2,
  HelpCircle,
  Clock,
} from 'lucide-react';

interface DataFlowViewerProps {
  dataFlow: DataFlowAnalysisResult | null;
}

export const DataFlowViewer: React.FC<DataFlowViewerProps> = ({ dataFlow }) => {
  const [analysisType, setAnalysisType] = useState<'reaching' | 'live'>('reaching');
  const [currentIteration, setCurrentIteration] = useState(0);

  if (!dataFlow) {
    return (
      <div className="empty-state">
        <Activity size={40} className="empty-icon text-muted" />
        <h3>No Data-Flow Analysis Available</h3>
        <p>Compile source code to run iterative fixed-point data-flow analyses.</p>
      </div>
    );
  }

  const isReaching = analysisType === 'reaching';
  const activeAnalysis = isReaching ? dataFlow.reachingDefinitions : dataFlow.liveVariables;
  const iterations = activeAnalysis.iterations;
  const maxIteration = iterations.length - 1;
  const snapshot = iterations[Math.min(currentIteration, maxIteration)] || iterations[0];

  return (
    <div className="dataflow-workspace">
      {/* Top Header */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div className="viewer-title">
            <Activity size={18} className="text-emerald" />
            <h2>Data-Flow Analysis & Convergence Engine</h2>
          </div>
          <div className="viewer-badges">
            <span className="badge badge-emerald">
              <Clock size={12} /> Converged in {activeAnalysis.totalIterations} Round(s)
            </span>
            <span className="badge badge-cyan">
              <Table size={12} /> {activeAnalysis.blockDataFlow.length} Blocks Analyzed
            </span>
            <span className="badge badge-purple">
              <CheckCircle2 size={12} /> Fixed-Point Verified
            </span>
          </div>
        </div>
        <p className="viewer-description">
          Calculates program data-flow properties using classical lattice meet operators and transfer functions solved by fixed-point worklist iteration.
        </p>

        {/* Analysis Type Toggle Buttons */}
        <div className="view-mode-tabs mt-2">
          <button
            className={`mode-btn ${isReaching ? 'active' : ''}`}
            onClick={() => { setAnalysisType('reaching'); setCurrentIteration(0); }}
          >
            <GitCommit size={13} /> Reaching Definitions (Forward, May)
          </button>
          <button
            className={`mode-btn ${!isReaching ? 'active' : ''}`}
            onClick={() => { setAnalysisType('live'); setCurrentIteration(0); }}
          >
            <Activity size={13} /> Live Variables Analysis (Backward, May)
          </button>
        </div>
      </div>

      {/* Mathematical Formulation Card */}
      <div className="card-panel formula-card mb-4">
        <div className="formula-header">
          <HelpCircle size={14} className="text-cyan mr-1" />
          <span className="font-bold text-xs uppercase text-light">
            {isReaching ? 'Reaching Definitions Equations:' : 'Live Variables Equations:'}
          </span>
        </div>
        <div className="formula-content font-mono text-xs">
          {isReaching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
              <div><strong>IN[B]</strong> = ⋃ &#123; OUT[P] | P ∈ Preds(B) &#125;</div>
              <div><strong>OUT[B]</strong> = GEN[B] ∪ (IN[B] \ KILL[B])</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
              <div><strong>OUT[B]</strong> = ⋃ &#123; IN[S] | S ∈ Succs(B) &#125;</div>
              <div><strong>IN[B]</strong> = USE[B] ∪ (OUT[B] \ DEF[B])</div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Fixed-Point Stepper Bar */}
      <div className="card-panel stepper-card mb-4">
        <div className="stepper-controls">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-light">Fixed-Point Iteration:</span>
            <span className="badge badge-cyan font-mono">
              Round {snapshot.iteration} of {maxIteration}
            </span>
            {snapshot.converged && (
              <span className="badge badge-emerald">
                <CheckCircle2 size={11} /> Converged (Lattice Stable)
              </span>
            )}
          </div>

          <div className="stepper-buttons flex items-center gap-1">
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentIteration <= 0}
              onClick={() => setCurrentIteration(0)}
              title="Reset to Round 0"
            >
              <RotateCcw size={12} />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentIteration <= 0}
              onClick={() => setCurrentIteration(prev => Math.max(0, prev - 1))}
              title="Previous Iteration"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={currentIteration >= maxIteration}
              onClick={() => setCurrentIteration(prev => Math.min(maxIteration, prev + 1))}
              title="Next Iteration"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Stepper Progress Range Slider */}
        <div className="stepper-slider-wrapper mt-3">
          <input
            type="range"
            min={0}
            max={maxIteration}
            value={currentIteration}
            onChange={e => setCurrentIteration(parseInt(e.target.value, 10))}
            className="w-full accent-cyan"
          />
          <div className="flex justify-between text-xs text-muted mt-1 font-mono">
            <span>Round 0 (Initial)</span>
            <span>Round {maxIteration} (Fixed Point)</span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="card-panel">
        <div className="card-title mb-3">
          <Table size={15} className="text-cyan" />
          <span>
            {isReaching ? 'Reaching Definitions Set Matrix' : 'Live Variables Set Matrix'} (Round {snapshot.iteration})
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Block ID</th>
                <th>{isReaching ? 'GEN[B]' : 'USE[B]'}</th>
                <th>{isReaching ? 'KILL[B]' : 'DEF[B]'}</th>
                <th>IN[B] (Round {snapshot.iteration})</th>
                <th>OUT[B] (Round {snapshot.iteration})</th>
              </tr>
            </thead>
            <tbody>
              {activeAnalysis.blockDataFlow.map(b => {
                const state = snapshot.blockStates.find(s => s.blockId === b.blockId);
                const currentIn = state ? state.inSet : b.inSet;
                const currentOut = state ? state.outSet : b.outSet;

                return (
                  <tr key={b.blockId}>
                    <td>
                      <strong className="text-cyan font-mono">{b.blockId}</strong>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-emerald">
                        {b.gen.length > 0 ? `{ ${b.gen.join(', ')} }` : '∅'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-rose">
                        {b.kill.length > 0 ? `{ ${b.kill.join(', ')} }` : '∅'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-purple">
                        {currentIn.length > 0 ? `{ ${currentIn.join(', ')} }` : '∅'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-cyan">
                        {currentOut.length > 0 ? `{ ${currentOut.join(', ')} }` : '∅'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reaching Definitions Index Legend (if in Reaching mode) */}
      {isReaching && dataFlow.reachingDefinitions.definitions.length > 0 && (
        <div className="card-panel mt-4">
          <div className="card-title mb-2">
            <GitCommit size={14} className="text-purple" />
            <span>Definition Identifier Index (d1, d2, ...)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {dataFlow.reachingDefinitions.definitions.map(def => (
              <div key={def.id} className="def-index-pill font-mono text-xs">
                <span className="badge badge-purple">{def.id}</span>
                <span className="text-cyan font-bold">{def.variable}</span>
                <span className="text-muted">=</span>
                <span className="text-light truncate">{def.instructionText}</span>
                <span className="text-muted text-2xs ml-auto">({def.blockId})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
