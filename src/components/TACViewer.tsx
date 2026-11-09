// ============================================================================
// CompilerX — TACViewer Component
// Three-Address Code listing, Quadruples Table, copy TAC, and download
// ============================================================================

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  ListOrdered,
  TableProperties,
  Sparkles,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { TACInstruction, BackpatchRecord } from '../compiler/types';

interface TACViewerProps {
  instructions: TACInstruction[];
  tacText: string;
  backpatchRecords: BackpatchRecord[];
}

export const TACViewer: React.FC<TACViewerProps> = ({
  instructions,
  tacText,
  backpatchRecords,
}) => {
  const [viewMode, setViewMode] = useState<'numbered' | 'table'>('numbered');
  const [copied, setCopied] = useState(false);
  const [highlightBackpatched, setHighlightBackpatched] = useState(true);

  if (instructions.length === 0) {
    return (
      <div className="empty-state-card">
        <Terminal size={36} className="text-dim mb-3" />
        <h3 className="empty-title">No Three-Address Code Generated</h3>
        <p className="empty-desc">
          Run the compiler on a valid program to generate Three-Address Code instructions with temporary variables (t1, t2) and control-flow labels (L1, L2).
        </p>
      </div>
    );
  }

  const patchedIndices = new Set(backpatchRecords.map(r => r.instructionIndex));

  const handleCopy = () => {
    navigator.clipboard.writeText(tacText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([tacText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program.tac';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tac-viewer-container">
      {/* Top Toolbar */}
      <div className="tac-toolbar">
        <div className="tac-toolbar-left">
          <div className="tac-summary-badges">
            <span className="badge badge-cyan">{instructions.length} Instructions</span>
            <span className="badge badge-emerald">
              {instructions.filter(i => i.op === 'label').length} Labels
            </span>
            <span className="badge badge-purple">
              {instructions.filter(i => i.result?.startsWith('t') || i.arg1?.startsWith('t') || i.arg2?.startsWith('t')).length} Temp Usages
            </span>
          </div>

          <label className="checkbox-toggle" title="Highlight jumps resolved by Boolean backpatching">
            <input
              type="checkbox"
              checked={highlightBackpatched}
              onChange={e => setHighlightBackpatched(e.target.checked)}
            />
            <span className="checkbox-label">
              <Sparkles size={12} className="text-amber" /> Highlight Backpatched
            </span>
          </label>
        </div>

        <div className="tac-toolbar-right">
          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              onClick={() => setViewMode('numbered')}
              className={`toggle-btn ${viewMode === 'numbered' ? 'active' : ''}`}
              title="Numbered Code Listing"
            >
              <ListOrdered size={13} />
              <span>Listing</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              title="Quadruples / Instruction Table"
            >
              <TableProperties size={13} />
              <span>Quads Table</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="btn btn-secondary btn-sm"
            title="Copy Three-Address Code to clipboard"
            id="btn-copy-tac"
          >
            {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy TAC'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="btn btn-secondary btn-sm"
            title="Download .tac file"
            id="btn-download-tac"
          >
            <Download size={13} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main TAC Content */}
      <div className="tac-content-pane">
        {viewMode === 'numbered' ? (
          <div className="tac-numbered-list font-mono">
            {instructions.map(instr => {
              const isLabel = instr.op === 'label';
              const isBackpatched = highlightBackpatched && patchedIndices.has(instr.index);
              const isJump = instr.op === 'goto' || instr.op === 'if_goto';

              return (
                <div
                  key={instr.index}
                  className={`tac-line-row ${isLabel ? 'tac-label-row' : ''} ${
                    isBackpatched ? 'tac-backpatched-row' : ''
                  }`}
                >
                  <span className="tac-line-number">{instr.index}.</span>

                  <div className="tac-instruction-body">
                    {renderInstructionWithHighlights(instr)}
                  </div>

                  {/* Comment / Backpatch reason */}
                  {instr.comment && (
                    <span className="tac-comment font-mono">
                      // {instr.comment}
                    </span>
                  )}

                  {isBackpatched && (
                    <span className="badge badge-amber text-xs" title="Target patched during short-circuit backpatching">
                      backpatched → {instr.target}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="tac-table-wrapper font-mono">
            <table className="tac-quad-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Operator (Op)</th>
                  <th>Arg 1</th>
                  <th>Arg 2</th>
                  <th>Result / Target</th>
                  <th>Annotated TAC</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {instructions.map(instr => {
                  const isPatched = highlightBackpatched && patchedIndices.has(instr.index);
                  return (
                    <tr
                      key={instr.index}
                      className={isPatched ? 'row-backpatched' : ''}
                    >
                      <td className="text-dim font-bold">{instr.index}</td>
                      <td>
                        <span className="badge badge-purple">{instr.op}</span>
                      </td>
                      <td className="text-cyan">{instr.arg1 ?? '—'}</td>
                      <td className="text-cyan">{instr.arg2 ?? '—'}</td>
                      <td>
                        {instr.op === 'label' || instr.op === 'goto' || instr.op === 'if_goto' ? (
                          <span className="badge badge-emerald font-bold">
                            {instr.target ?? '—'}
                          </span>
                        ) : (
                          <span className="text-primary font-bold">{instr.result ?? '—'}</span>
                        )}
                      </td>
                      <td className="text-secondary">{instr.rawText}</td>
                      <td className="text-muted text-xs">{instr.comment ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Syntax Highlighting for Numbered TAC line
// ----------------------------------------------------------------------------
function renderInstructionWithHighlights(instr: TACInstruction): React.ReactNode {
  if (instr.op === 'label') {
    return <span className="tac-tok-label font-bold text-emerald">{instr.target}:</span>;
  }

  if (instr.op === 'goto') {
    return (
      <>
        <span className="tac-tok-kw text-amber font-semibold">goto</span>{' '}
        <span className="tac-tok-target text-emerald font-bold">{instr.target}</span>
      </>
    );
  }

  if (instr.op === 'if_goto') {
    return (
      <>
        <span className="tac-tok-kw text-amber font-semibold">if</span>{' '}
        <span className="tac-tok-var text-cyan">{instr.arg1}</span>{' '}
        <span className="tac-tok-op text-secondary font-bold">{instr.relop}</span>{' '}
        <span className="tac-tok-var text-cyan">{instr.arg2}</span>{' '}
        <span className="tac-tok-kw text-amber font-semibold">goto</span>{' '}
        <span className="tac-tok-target text-emerald font-bold">{instr.target}</span>
      </>
    );
  }

  if (instr.op === '=') {
    return (
      <>
        <span className="tac-tok-dest text-primary font-semibold">{instr.result}</span>{' '}
        <span className="tac-tok-assign text-muted">=</span>{' '}
        <span className="tac-tok-arg text-cyan">{instr.arg1}</span>
      </>
    );
  }

  if (instr.op === 'decl') {
    return (
      <>
        <span className="tac-tok-dest text-primary font-semibold">{instr.result}</span>
        {instr.arg1 && (
          <>
            {' '}
            <span className="tac-tok-assign text-muted">=</span>{' '}
            <span className="tac-tok-arg text-cyan">{instr.arg1}</span>
          </>
        )}
      </>
    );
  }

  if (instr.op === 'uminus') {
    return (
      <>
        <span className="tac-tok-dest text-primary font-semibold">{instr.result}</span>{' '}
        <span className="tac-tok-assign text-muted">=</span>{' '}
        <span className="tac-tok-op text-rose">-</span>
        <span className="tac-tok-arg text-cyan">{instr.arg1}</span>
      </>
    );
  }

  // Binary arithmetic: result = arg1 op arg2
  return (
    <>
      <span className="tac-tok-dest text-primary font-semibold">{instr.result}</span>{' '}
      <span className="tac-tok-assign text-muted">=</span>{' '}
      <span className="tac-tok-arg text-cyan">{instr.arg1}</span>{' '}
      <span className="tac-tok-op text-purple font-bold">{instr.op}</span>{' '}
      <span className="tac-tok-arg text-cyan">{instr.arg2}</span>
    </>
  );
}
