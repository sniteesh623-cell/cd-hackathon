// ============================================================================
// CompilerX — WorkbenchView Component (Xcode Split Workspace)
// Unified primary coding environment with contextual results inspector.
// ============================================================================

import React, { useState } from 'react';
import { EditorPanel } from './EditorPanel';
import { TACViewer } from './TACViewer';
import { ASTVisualizer } from './ASTVisualizer';
import { PostfixViewer } from './PostfixViewer';
import { TranslationTrace } from './TranslationTrace';
import { CompilerResult } from '../compiler/types';
import { SampleProgram } from '../compiler/samples';
import {
  Terminal,
  Layers,
  Binary,
  GitMerge,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WorkbenchViewProps {
  sourceCode: string;
  onChangeSource: (code: string) => void;
  onSelectSample: (sample: SampleProgram) => void;
  selectedSampleId: string;
  compilerResult: CompilerResult | null;
  onRunCompiler: () => void;
}

export type WorkbenchResultTab = 'tac' | 'ast' | 'postfix' | 'trace';

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  sourceCode,
  onChangeSource,
  onSelectSample,
  selectedSampleId,
  compilerResult,
  onRunCompiler,
}) => {
  const [activeResultTab, setActiveResultTab] = useState<WorkbenchResultTab>('tac');
  const [showDiagnosticsDrawer, setShowDiagnosticsDrawer] = useState(false);

  const errorCount = compilerResult?.diagnostics.filter(d => d.severity === 'error').length ?? 0;
  const warningCount = compilerResult?.diagnostics.filter(d => d.severity === 'warning').length ?? 0;

  return (
    <div className="workbench-view-container">
      {/* Split Workspace: Left Editor + Right Contextual Results */}
      <div className="workbench-split-body">
        {/* Left Half: Source Editor */}
        <div className="workbench-pane workbench-editor-pane">
          <EditorPanel
            sourceCode={sourceCode}
            onChangeSource={onChangeSource}
            onSelectSample={onSelectSample}
            selectedSampleId={selectedSampleId}
            diagnostics={compilerResult?.diagnostics ?? []}
            onRunCompiler={onRunCompiler}
          />
        </div>

        {/* Right Half: Contextual Results Inspector */}
        <div className="workbench-pane workbench-results-pane">
          {/* Segmented Control Header (macOS / Xcode Tab Bar) */}
          <div className="results-segmented-bar">
            <div className="segmented-group">
              <button
                onClick={() => setActiveResultTab('tac')}
                className={`segmented-tab ${activeResultTab === 'tac' ? 'active' : ''}`}
              >
                <Terminal size={13} />
                <span>Three-Address Code</span>
                {compilerResult?.success && (
                  <span className="seg-badge">{compilerResult.stats.tacInstructionCount}</span>
                )}
              </button>

              <button
                onClick={() => setActiveResultTab('ast')}
                className={`segmented-tab ${activeResultTab === 'ast' ? 'active' : ''}`}
              >
                <Layers size={13} />
                <span>AST</span>
                {compilerResult?.success && (
                  <span className="seg-badge">{compilerResult.stats.astNodeCount}</span>
                )}
              </button>

              <button
                onClick={() => setActiveResultTab('postfix')}
                className={`segmented-tab ${activeResultTab === 'postfix' ? 'active' : ''}`}
              >
                <Binary size={13} />
                <span>Postfix</span>
                {compilerResult?.success && (
                  <span className="seg-badge">{compilerResult.postfixList.length}</span>
                )}
              </button>

              <button
                onClick={() => setActiveResultTab('trace')}
                className={`segmented-tab ${activeResultTab === 'trace' ? 'active' : ''}`}
              >
                <GitMerge size={13} />
                <span>SDT Trace</span>
                {compilerResult?.success && (
                  <span className="seg-badge">{compilerResult.backpatchRecords.length}</span>
                )}
              </button>
            </div>

            {/* Quick Diagnostic Pill in Segmented Bar */}
            {(errorCount > 0 || warningCount > 0) && (
              <button
                onClick={() => setShowDiagnosticsDrawer(!showDiagnosticsDrawer)}
                className={`drawer-toggle-btn ${errorCount > 0 ? 'has-error' : 'has-warning'}`}
                title="Toggle Diagnostics Drawer"
              >
                <AlertTriangle size={12} />
                <span>
                  {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : `${warningCount} warning${warningCount > 1 ? 's' : ''}`}
                </span>
                {showDiagnosticsDrawer ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
            )}
          </div>

          {/* Active Result Panel Body */}
          <div className="results-content-area">
            {activeResultTab === 'tac' && (
              <TACViewer
                instructions={compilerResult?.tacInstructions ?? []}
                tacText={compilerResult?.tacText ?? ''}
                backpatchRecords={compilerResult?.backpatchRecords ?? []}
              />
            )}

            {activeResultTab === 'ast' && (
              <ASTVisualizer ast={compilerResult?.ast ?? null} />
            )}

            {activeResultTab === 'postfix' && (
              <PostfixViewer postfixList={compilerResult?.postfixList ?? []} />
            )}

            {activeResultTab === 'trace' && (
              <TranslationTrace
                backpatchEvents={compilerResult?.backpatchEvents ?? []}
                backpatchRecords={compilerResult?.backpatchRecords ?? []}
                sdtTraces={compilerResult?.sdtTraces ?? []}
                stats={
                  compilerResult?.stats ?? {
                    sourceLength: 0,
                    tokenCount: 0,
                    astNodeCount: 0,
                    temporaryCount: 0,
                    labelCount: 0,
                    tacInstructionCount: 0,
                    backpatchCount: 0,
                    compileTimeMs: 0,
                  }
                }
                tokens={compilerResult?.tokens ?? []}
              />
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Diagnostics Drawer (Xcode Console Style) */}
      {showDiagnosticsDrawer && compilerResult?.diagnostics && (
        <div className="diagnostics-drawer">
          <div className="drawer-header">
            <span className="font-bold text-xs uppercase text-muted">
              Compiler Diagnostics ({compilerResult.diagnostics.length})
            </span>
            <button
              onClick={() => setShowDiagnosticsDrawer(false)}
              className="drawer-close-btn"
            >
              ✕
            </button>
          </div>
          <div className="drawer-body">
            {compilerResult.diagnostics.map((diag, idx) => (
              <div key={idx} className={`drawer-diag-row ${diag.severity}`}>
                <span className="diag-severity-tag">{diag.severity.toUpperCase()}</span>
                <span className="diag-loc">Line {diag.line}:{diag.column}</span>
                <span className="diag-text">{diag.message}</span>
                {diag.snippet && <pre className="diag-drawer-snippet font-mono">{diag.snippet}</pre>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
