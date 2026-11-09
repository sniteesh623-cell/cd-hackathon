// ============================================================================
// CompilerX — Control Flow Graph (CFG) Interactive Visualizer
// Renders basic blocks, branch edges, dominator trees, and detected loops.
// ============================================================================

import React, { useState } from 'react';
import { ControlFlowGraph, BasicBlock, LoopInfo } from '../compiler/cfg/basicBlock';
import {
  Network,
  GitBranch,
  Repeat,
  ArrowRight,
  ArrowDown,
  Layers,
  Info,
  CornerDownRight,
  CheckCircle,
} from 'lucide-react';

interface CFGViewerProps {
  cfg: ControlFlowGraph | null;
}

export const CFGViewer: React.FC<CFGViewerProps> = ({ cfg }) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'blocks' | 'dominators' | 'loops'>('blocks');

  if (!cfg || cfg.blocks.length === 0) {
    return (
      <div className="empty-state">
        <Network size={40} className="empty-icon text-muted" />
        <h3>No Control Flow Graph Available</h3>
        <p>Compile source code to generate basic blocks and construct the CFG.</p>
      </div>
    );
  }

  const selectedBlock = cfg.blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="cfg-workspace">
      {/* Top Header & Stats */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div className="viewer-title">
            <Network size={18} className="text-cyan" />
            <h2>Control Flow Graph (CFG) Engine</h2>
          </div>
          <div className="viewer-badges">
            <span className="badge badge-cyan">
              <Layers size={12} /> {cfg.blocks.length} Basic Blocks
            </span>
            <span className="badge badge-purple">
              <GitBranch size={12} /> {cfg.edges.length} Directed Edges
            </span>
            {cfg.loops.length > 0 && (
              <span className="badge badge-amber">
                <Repeat size={12} /> {cfg.loops.length} Natural Loop(s)
              </span>
            )}
            <span className="badge badge-emerald">
              <CheckCircle size={12} /> Entry: {cfg.entryBlockId}
            </span>
          </div>
        </div>
        <p className="viewer-description">
          Partitions Three-Address Code into maximal straight-line Basic Blocks using leader identification, constructs directed branch edges, and computes dominator trees & natural loops.
        </p>

        {/* View Mode Tabs */}
        <div className="view-mode-tabs mt-2">
          <button
            className={`mode-btn ${viewMode === 'blocks' ? 'active' : ''}`}
            onClick={() => setViewMode('blocks')}
          >
            <Layers size={13} /> Basic Block Flow Graph
          </button>
          <button
            className={`mode-btn ${viewMode === 'dominators' ? 'active' : ''}`}
            onClick={() => setViewMode('dominators')}
          >
            <GitBranch size={13} /> Dominator Tree & IDom
          </button>
          <button
            className={`mode-btn ${viewMode === 'loops' ? 'active' : ''}`}
            onClick={() => setViewMode('loops')}
          >
            <Repeat size={13} /> Loop Analysis ({cfg.loops.length})
          </button>
        </div>
      </div>

      {/* View 1: Basic Block Graph */}
      {viewMode === 'blocks' && (
        <div className="cfg-grid">
          {/* Left Column: Visual Blocks Layout */}
          <div className="cfg-blocks-column">
            {cfg.blocks.map((block, idx) => {
              const isSelected = selectedBlockId === block.id;
              const isLoopHeader = cfg.loops.some(l => l.header === block.id);
              const outgoingEdges = cfg.edges.filter(e => e.from === block.id);

              return (
                <div key={block.id} className="cfg-block-wrapper">
                  <div
                    className={`cfg-block-card ${isSelected ? 'selected-block' : ''} ${block.isEntry ? 'entry-block' : ''} ${block.isExit ? 'exit-block' : ''}`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    {/* Card Header */}
                    <div className="block-card-header">
                      <div className="block-title">
                        <span className="block-id font-mono">{block.id}</span>
                        <span className="block-name">{block.name}</span>
                      </div>
                      <div className="block-tags">
                        {block.isEntry && <span className="tag-entry">ENTRY</span>}
                        {block.isExit && <span className="tag-exit">EXIT</span>}
                        {isLoopHeader && <span className="tag-loop"><Repeat size={10} /> LOOP</span>}
                      </div>
                    </div>

                    {/* Instruction Listing */}
                    <div className="block-instructions font-mono">
                      {block.instructions.length === 0 ? (
                        <div className="empty-block text-muted">// (Empty Block)</div>
                      ) : (
                        block.instructions.map(instr => (
                          <div key={instr.index} className="block-instr-line">
                            <span className="instr-num">{instr.index}.</span>
                            <span className={`instr-text ${instr.op === 'label' ? 'text-amber' : instr.op.includes('goto') ? 'text-cyan' : ''}`}>
                              {instr.rawText}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Successor & Predecessor Footers */}
                    <div className="block-card-footer">
                      <div className="footer-links">
                        <span className="link-label">Preds:</span>
                        {block.predecessors.length > 0 ? (
                          block.predecessors.map(p => (
                            <span key={p} className="link-badge pred-badge" onClick={(e) => { e.stopPropagation(); setSelectedBlockId(p); }}>
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted text-xs">none</span>
                        )}
                      </div>

                      <div className="footer-links">
                        <span className="link-label">Succs:</span>
                        {outgoingEdges.length > 0 ? (
                          outgoingEdges.map((e, eIdx) => (
                            <span
                              key={`${e.to}-${eIdx}`}
                              className={`link-badge succ-badge edge-${e.type}`}
                              onClick={(eClick) => { eClick.stopPropagation(); setSelectedBlockId(e.to); }}
                            >
                              {e.type === 'true' && '✓ '}
                              {e.type === 'false' && '✗ '}
                              {e.to}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted text-xs">none</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Flow Arrow to Next Sequential Block */}
                  {idx < cfg.blocks.length - 1 && (
                    <div className="cfg-flow-arrow">
                      <ArrowDown size={14} className="text-muted" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Block Inspector */}
          <div className="cfg-inspector-column">
            {selectedBlock ? (
              <div className="card-panel inspector-panel">
                <div className="card-title">
                  <Info size={14} className="text-cyan" />
                  <span>Block Inspector: <span className="text-cyan font-mono">{selectedBlock.name}</span></span>
                </div>

                <div className="inspector-details">
                  <div className="detail-row">
                    <span className="label">Block ID:</span>
                    <span className="value font-mono text-cyan">{selectedBlock.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Role:</span>
                    <span className="value">
                      {selectedBlock.isEntry ? 'Entry Block' : selectedBlock.isExit ? 'Exit Block' : 'Internal Basic Block'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Instructions:</span>
                    <span className="value">{selectedBlock.instructions.length} TAC lines</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Immediate Dominator:</span>
                    <span className="value font-mono text-purple">
                      {selectedBlock.immediateDominator || 'None (Root)'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">All Dominators:</span>
                    <span className="value font-mono">
                      [{selectedBlock.dominators.join(', ')}]
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Predecessors:</span>
                    <span className="value font-mono">
                      {selectedBlock.predecessors.length > 0 ? selectedBlock.predecessors.join(', ') : 'None'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Successors:</span>
                    <span className="value font-mono">
                      {selectedBlock.successors.length > 0 ? selectedBlock.successors.join(', ') : 'None'}
                    </span>
                  </div>
                </div>

                {/* Instructions breakdown */}
                <div className="mt-3">
                  <span className="label font-bold text-xs uppercase text-muted mb-1 block">Full Instruction Listing:</span>
                  <div className="inspector-instr-list font-mono text-xs">
                    {selectedBlock.instructions.map(i => (
                      <div key={i.index} className="py-1 border-b border-subtle">
                        <span className="text-muted mr-2">#{i.index}</span>
                        <span className="text-light">{i.rawText}</span>
                        {i.comment && <span className="text-muted italic ml-2">// {i.comment}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-panel inspector-placeholder">
                <Network size={24} className="text-muted mb-2" />
                <p className="text-muted text-sm">Select any Basic Block card on the left to inspect its flow and dominance properties.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Dominator Tree & IDom */}
      {viewMode === 'dominators' && (
        <div className="dominator-tree-view card-panel">
          <div className="card-title">
            <GitBranch size={16} className="text-purple" />
            <span>Dominance Hierarchy & Immediate Dominators (IDom)</span>
          </div>
          <p className="text-muted text-xs mb-4">
            A node <em>d</em> dominates a node <em>n</em> (written <code>d dom n</code>) if every path from the entry node to <em>n</em> must go through <em>d</em>.
          </p>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Immediate Dominator (IDom)</th>
                  <th>Complete Dominator Set Dom(B)</th>
                  <th>Direct Dominated Children</th>
                </tr>
              </thead>
              <tbody>
                {cfg.blocks.map(b => {
                  const children = cfg.dominatorTree.get(b.id) || [];
                  return (
                    <tr key={b.id}>
                      <td><strong className="text-cyan font-mono">{b.id}</strong></td>
                      <td>
                        {b.immediateDominator ? (
                          <span className="badge badge-purple font-mono">{b.immediateDominator}</span>
                        ) : (
                          <span className="text-muted">None (Entry)</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs">[{b.dominators.join(', ')}]</span>
                      </td>
                      <td>
                        {children.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {children.map(ch => (
                              <span key={ch} className="badge badge-cyan font-mono text-xs">{ch}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted text-xs">Leaf</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Natural Loops Analysis */}
      {viewMode === 'loops' && (
        <div className="loops-view card-panel">
          <div className="card-title">
            <Repeat size={16} className="text-amber" />
            <span>Natural Loops & Back-Edge Detection</span>
          </div>

          {cfg.loops.length === 0 ? (
            <div className="empty-state py-8">
              <CheckCircle size={32} className="text-emerald mb-2" />
              <h4>No Cycles or Natural Loops Detected</h4>
              <p className="text-muted text-xs">The current control flow graph is a Directed Acyclic Graph (DAG) with linear branching.</p>
            </div>
          ) : (
            <div className="loops-list">
              {cfg.loops.map((loop, idx) => (
                <div key={idx} className="loop-card">
                  <div className="loop-header">
                    <span className="loop-num">Loop #{idx + 1}</span>
                    <span className="badge badge-amber font-mono">Header: {loop.header}</span>
                    <span className="badge badge-purple font-mono">
                      Back-edge: {loop.backEdge.from} → {loop.backEdge.to}
                    </span>
                  </div>

                  <div className="loop-blocks mt-2">
                    <span className="text-xs text-muted mr-2">Blocks participating in natural loop:</span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {loop.blocks.map(bId => (
                        <span key={bId} className="badge badge-cyan font-mono">{bId}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
