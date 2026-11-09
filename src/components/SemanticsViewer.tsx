// ============================================================================
// CompilerX — Semantics & Symbol Table Viewer Component
// Visualizes lexical scopes, symbol tables, type checking, and static warnings.
// ============================================================================

import React, { useState } from 'react';
import { SemanticAnalysisResult, SymbolInfo, Scope } from '../compiler/semantics/symbolTable';
import {
  ShieldAlert,
  ShieldCheck,
  FolderTree,
  Table,
  Search,
  Hash,
  AlertTriangle,
  Info,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface SemanticsViewerProps {
  semantics: SemanticAnalysisResult | null;
}

export const SemanticsViewer: React.FC<SemanticsViewerProps> = ({ semantics }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolInfo | null>(null);

  if (!semantics) {
    return (
      <div className="empty-state">
        <FolderTree size={40} className="empty-icon text-muted" />
        <h3>No Semantic Data Available</h3>
        <p>Compile valid source code to inspect lexical scopes and symbol tables.</p>
      </div>
    );
  }

  const symbols = semantics.symbolList;
  const filteredSymbols = symbols.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.dataType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesScope = selectedScopeId === 'all' || s.scopeId === selectedScopeId;
    return matchesSearch && matchesScope;
  });

  const semanticErrors = semantics.diagnostics.filter(d => d.severity === 'error');
  const semanticWarnings = semantics.diagnostics.filter(d => d.severity === 'warning');

  return (
    <div className="semantics-workspace">
      {/* Top Header & Stats */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div className="viewer-title">
            <ShieldCheck size={18} className="text-emerald" />
            <h2>Semantic Analysis & Symbol Table</h2>
          </div>
          <div className="viewer-badges">
            <span className="badge badge-purple">
              <FolderTree size={12} /> {semantics.allScopes.length} Scopes
            </span>
            <span className="badge badge-cyan">
              <Table size={12} /> {symbols.length} Symbols
            </span>
            {semanticErrors.length > 0 ? (
              <span className="badge badge-rose">
                <ShieldAlert size={12} /> {semanticErrors.length} Errors
              </span>
            ) : (
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} /> Type Clean
              </span>
            )}
            {semanticWarnings.length > 0 && (
              <span className="badge badge-amber">
                <AlertTriangle size={12} /> {semanticWarnings.length} Warnings
              </span>
            )}
          </div>
        </div>
        <p className="viewer-description">
          Tracks lexical scoping hierarchies, variable bindings, declared vs. inferred types, and static warnings (uninitialized reads, unused variables, duplicate declarations).
        </p>
      </div>

      {/* Semantic Diagnostics Alert (if any) */}
      {semantics.diagnostics.length > 0 && (
        <div className="semantic-diagnostics-box">
          <div className="box-title">
            <AlertTriangle size={14} className="text-amber" />
            <span>Static Semantic Diagnostics ({semantics.diagnostics.length})</span>
          </div>
          <div className="diagnostics-list">
            {semantics.diagnostics.map((diag, i) => (
              <div key={i} className={`diagnostic-card severity-${diag.severity}`}>
                <div className="diag-meta">
                  <span className={`diag-badge ${diag.severity}`}>{diag.severity.toUpperCase()}</span>
                  <span className="diag-pos">Line {diag.line}:{diag.column}</span>
                </div>
                <div className="diag-msg">{diag.message}</div>
                {diag.snippet && <pre className="diag-snippet">{diag.snippet}</pre>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column View: Symbol Table + Scope Details */}
      <div className="semantics-grid">
        {/* Left Column: Filterable Symbol Table */}
        <div className="symbol-table-container card-panel">
          <div className="panel-toolbar">
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Filter symbols..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field"
              />
            </div>
            <select
              value={selectedScopeId}
              onChange={e => setSelectedScopeId(e.target.value)}
              className="select-field"
            >
              <option value="all">All Scopes</option>
              {semantics.allScopes.map(sc => (
                <option key={sc.id} value={sc.id}>
                  {sc.id} (Level {sc.level})
                </option>
              ))}
            </select>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Identifier</th>
                  <th>Type</th>
                  <th>Scope</th>
                  <th>Declared</th>
                  <th>Initialized</th>
                  <th>Reads</th>
                  <th>Writes</th>
                </tr>
              </thead>
              <tbody>
                {filteredSymbols.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No symbols matched the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSymbols.map((sym, idx) => (
                    <tr
                      key={`${sym.name}-${sym.scopeId}-${idx}`}
                      onClick={() => setSelectedSymbol(sym)}
                      className={`table-row-interactive ${selectedSymbol?.name === sym.name && selectedSymbol?.scopeId === sym.scopeId ? 'selected-row' : ''}`}
                    >
                      <td>
                        <strong className="text-cyan font-mono">{sym.name}</strong>
                      </td>
                      <td>
                        <span className={`type-tag ${sym.dataType}`}>{sym.dataType}</span>
                      </td>
                      <td>
                        <span className="scope-tag font-mono">{sym.scopeId}</span>
                      </td>
                      <td>Line {sym.declaredLoc.line}</td>
                      <td>
                        {sym.isInitialized ? (
                          <span className="status-pill status-yes">Yes</span>
                        ) : (
                          <span className="status-pill status-no">No</span>
                        )}
                      </td>
                      <td className="font-mono">{sym.readCount}</td>
                      <td className="font-mono">{sym.writeCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Scope Hierarchy & Selected Symbol Inspector */}
        <div className="scope-hierarchy-container">
          {/* Selected Symbol Inspector */}
          {selectedSymbol ? (
            <div className="card-panel inspector-panel mb-4">
              <div className="card-title">
                <Info size={14} className="text-cyan" />
                <span>Symbol Inspector: <span className="text-cyan font-mono">{selectedSymbol.name}</span></span>
              </div>
              <div className="inspector-details">
                <div className="detail-row">
                  <span className="label">Data Type:</span>
                  <span className="value font-mono text-purple">{selectedSymbol.dataType}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Scope ID:</span>
                  <span className="value font-mono text-cyan">{selectedSymbol.scopeId} (Level {selectedSymbol.scopeLevel})</span>
                </div>
                <div className="detail-row">
                  <span className="label">Declared At:</span>
                  <span className="value">Line {selectedSymbol.declaredLoc.line}, Column {selectedSymbol.declaredLoc.column}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Initialized:</span>
                  <span className="value">{selectedSymbol.isInitialized ? 'Yes (Has initial value)' : 'No (Uninitialized)'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Read References:</span>
                  <span className="value">{selectedSymbol.readCount} read access(es)</span>
                </div>
                <div className="detail-row">
                  <span className="label">Write References:</span>
                  <span className="value">{selectedSymbol.writeCount} assignment(s)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-panel inspector-placeholder mb-4">
              <Table size={20} className="text-muted mb-2" />
              <p className="text-muted text-sm">Click any symbol row to inspect its attributes.</p>
            </div>
          )}

          {/* Scope Hierarchy Tree */}
          <div className="card-panel scope-tree-card">
            <div className="card-title">
              <Layers size={14} className="text-purple" />
              <span>Lexical Scopes Hierarchy</span>
            </div>
            <div className="scopes-tree">
              {semantics.allScopes.map(sc => (
                <div
                  key={sc.id}
                  className={`scope-node level-${sc.level} ${selectedScopeId === sc.id ? 'active-scope' : ''}`}
                  onClick={() => setSelectedScopeId(sc.id)}
                  style={{ marginLeft: `${sc.level * 16}px` }}
                >
                  <div className="scope-node-header">
                    <span className="scope-dot"></span>
                    <span className="scope-title font-mono">{sc.id}</span>
                    <span className="scope-level-badge">Lvl {sc.level}</span>
                  </div>
                  <div className="scope-symbols-count">
                    {sc.symbols.size} symbol(s) defined
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
