// ============================================================================
// CompilerX — DiagnosticsBar Component
// Bottom statistics dock & compiler diagnostics error alert panel
// ============================================================================

import React from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Layers,
  FileCode2,
  Variable,
  Tag,
  ListOrdered,
  GitMerge,
  Terminal,
} from 'lucide-react';
import { CompilerDiagnostic, CompilerStatistics } from '../compiler/types';

interface DiagnosticsBarProps {
  diagnostics: CompilerDiagnostic[];
  stats: CompilerStatistics | null;
  success: boolean;
}

export const DiagnosticsBar: React.FC<DiagnosticsBarProps> = ({
  diagnostics,
  stats,
  success,
}) => {
  const errors = diagnostics.filter(d => d.severity === 'error');
  const hasErrors = errors.length > 0;

  return (
    <div className="diagnostics-bar-container">
      {/* If Errors: Red Diagnostic Alert Drawer */}
      {hasErrors && (
        <div className="diagnostics-error-banner">
          <div className="error-banner-header">
            <AlertOctagon size={16} className="text-rose animate-bounce" />
            <span className="font-bold text-rose">
              Compilation Failed ({errors.length} Error{errors.length > 1 ? 's' : ''})
            </span>
          </div>

          <div className="error-items-list">
            {errors.map((err, i) => (
              <div key={i} className="error-item-card font-mono">
                <div className="error-item-title">
                  <span className="badge badge-rose text-xs uppercase">{err.phase} error</span>
                  <span className="error-pos text-secondary">
                    Line {err.line}, Column {err.column}
                  </span>
                  <span className="error-message text-primary font-semibold">
                    {err.message}
                  </span>
                </div>

                {err.snippet && (
                  <div className="error-snippet-box">
                    <pre className="error-snippet-code">{err.snippet}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compiler Metrics / Statistics Footer */}
      <div className="stats-dock-row">
        <div className="stats-group">
          {success ? (
            <div className="stat-pill text-emerald">
              <CheckCircle2 size={13} />
              <span className="font-bold">Zero Errors</span>
            </div>
          ) : (
            <div className="stat-pill text-rose">
              <AlertOctagon size={13} />
              <span className="font-bold">{errors.length} Error(s)</span>
            </div>
          )}

          <div className="stat-divider" />

          {/* Token count */}
          <div className="stat-item" title="Total lexical tokens processed">
            <FileCode2 size={13} className="text-purple" />
            <span className="stat-label">Tokens:</span>
            <span className="stat-value font-mono">{stats?.tokenCount ?? 0}</span>
          </div>

          {/* AST Nodes */}
          <div className="stat-item" title="AST total nodes constructed">
            <Layers size={13} className="text-cyan" />
            <span className="stat-label">AST Nodes:</span>
            <span className="stat-value font-mono">{stats?.astNodeCount ?? 0}</span>
          </div>

          {/* Temporaries */}
          <div className="stat-item" title="Intermediate temporaries allocated (t1, t2...)">
            <Variable size={13} className="text-cyan" />
            <span className="stat-label">Temporaries:</span>
            <span className="stat-value font-mono font-bold text-cyan">
              {stats?.temporaryCount ?? 0}
            </span>
          </div>

          {/* Labels */}
          <div className="stat-item" title="Control-flow labels allocated (L1, L2...)">
            <Tag size={13} className="text-emerald" />
            <span className="stat-label">Labels:</span>
            <span className="stat-value font-mono font-bold text-emerald">
              {stats?.labelCount ?? 0}
            </span>
          </div>

          {/* TAC Instructions */}
          <div className="stat-item" title="Generated Three-Address Code quadruples">
            <ListOrdered size={13} className="text-amber" />
            <span className="stat-label">TAC Lines:</span>
            <span className="stat-value font-mono font-bold text-amber">
              {stats?.tacInstructionCount ?? 0}
            </span>
          </div>

          {/* Backpatches */}
          <div className="stat-item" title="Short-circuit jumps backpatched">
            <GitMerge size={13} className="text-rose" />
            <span className="stat-label">Backpatches:</span>
            <span className="stat-value font-mono font-bold text-rose">
              {stats?.backpatchCount ?? 0}
            </span>
          </div>
        </div>

        {/* Compile Time */}
        <div className="stat-time-pill" title="Execution duration in milliseconds">
          <Clock size={12} className="text-secondary" />
          <span className="font-mono text-secondary">
            {stats ? `${stats.compileTimeMs} ms` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
