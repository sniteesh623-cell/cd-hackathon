// ============================================================================
// CompilerX — TranslationTrace Component
// SDT Synthesized/Inherited Attributes, Backpatching Event Stream & Patched Jumps Table
// ============================================================================

import React, { useState } from 'react';
import {
  GitMerge,
  Sparkles,
  Layers,
  ArrowRight,
  ListTree,
  Table,
  CheckCircle2,
  Workflow,
  Search,
} from 'lucide-react';
import {
  BackpatchEvent,
  BackpatchRecord,
  SDTAttributeTrace,
  CompilerStatistics,
  Token,
} from '../compiler/types';

interface TranslationTraceProps {
  backpatchEvents: BackpatchEvent[];
  backpatchRecords: BackpatchRecord[];
  sdtTraces: SDTAttributeTrace[];
  stats: CompilerStatistics;
  tokens: Token[];
}

export const TranslationTrace: React.FC<TranslationTraceProps> = ({
  backpatchEvents,
  backpatchRecords,
  sdtTraces,
  stats,
  tokens,
}) => {
  const [activeTab, setActiveTab] = useState<'backpatch' | 'sdt' | 'pipeline' | 'tokens'>('backpatch');
  const [sdtFilter, setSdtFilter] = useState<'all' | 'synthesized' | 'inherited'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSdt = sdtTraces.filter(trace => {
    const matchesFilter = sdtFilter === 'all' || trace.attributeType === sdtFilter;
    const matchesSearch =
      searchQuery === '' ||
      trace.nodeType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trace.attributeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trace.ruleApplied.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="trace-container">
      {/* Sub-tabs header */}
      <div className="trace-subtabs-bar">
        <button
          onClick={() => setActiveTab('backpatch')}
          className={`trace-tab-btn ${activeTab === 'backpatch' ? 'active' : ''}`}
        >
          <GitMerge size={14} className="text-amber" />
          <span>Boolean Backpatching ({backpatchRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sdt')}
          className={`trace-tab-btn ${activeTab === 'sdt' ? 'active' : ''}`}
        >
          <Sparkles size={14} className="text-cyan" />
          <span>SDT Attributes ({sdtTraces.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          className={`trace-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
        >
          <Workflow size={14} className="text-emerald" />
          <span>Pipeline Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('tokens')}
          className={`trace-tab-btn ${activeTab === 'tokens' ? 'active' : ''}`}
        >
          <ListTree size={14} className="text-purple" />
          <span>Scanned Tokens ({tokens.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="trace-content-body">
        {/* TAB 1: Boolean Short-Circuit & Backpatching */}
        {activeTab === 'backpatch' && (
          <div className="backpatch-tab-pane">
            {/* Header info */}
            <div className="callout-card mb-4">
              <div className="callout-title flex items-center gap-2">
                <GitMerge size={16} className="text-amber" />
                <span className="font-semibold">Dragon Book Short-Circuit Backpatching</span>
              </div>
              <p className="callout-text text-secondary text-xs">
                During syntax-directed translation of Boolean conditions (relational comparisons, <code>&&</code>, <code>||</code>, <code>!</code>), jump instructions are initially emitted without targets. A <code>truelist</code> and <code>falselist</code> of instruction addresses are generated (<code>makelist</code>), merged when conditions compound (<code>merge</code>), and patched to their real target labels (<code>backpatch</code>) when target statement labels become known.
              </p>
            </div>

            {backpatchRecords.length === 0 ? (
              <div className="empty-state-card">
                <GitMerge size={32} className="text-dim mb-2" />
                <h4 className="empty-title">No Backpatching in this Program</h4>
                <p className="empty-desc">
                  This program does not contain conditional flow or Boolean expressions. Load <strong>Sample 3 (If-Else)</strong>, <strong>Sample 4 (While)</strong>, or <strong>Sample 5 (Boolean Short-Circuit)</strong> to see backpatching in action.
                </p>
              </div>
            ) : (
              <div className="backpatch-tables-split">
                {/* Patched Jump Instructions Table */}
                <div className="backpatch-section">
                  <h4 className="section-heading flex items-center gap-2">
                    <Table size={14} className="text-cyan" />
                    <span>Patched Jump Instructions Table</span>
                  </h4>
                  <div className="table-responsive font-mono">
                    <table className="trace-data-table">
                      <thead>
                        <tr>
                          <th>Instr #</th>
                          <th>List Type</th>
                          <th>Unpatched Instruction</th>
                          <th>Target Label</th>
                          <th>Patched Instruction</th>
                          <th>Condition / Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backpatchRecords.map((rec, i) => (
                          <tr key={i}>
                            <td className="font-bold text-amber">#{rec.instructionIndex}</td>
                            <td>
                              <span
                                className={`badge ${
                                  rec.listType === 'truelist' ? 'badge-emerald' : 'badge-rose'
                                }`}
                              >
                                {rec.listType}
                              </span>
                            </td>
                            <td className="text-muted">{rec.originalInstruction}</td>
                            <td>
                              <span className="badge badge-emerald font-bold">
                                {rec.targetLabel}
                              </span>
                            </td>
                            <td className="text-primary font-bold">{rec.patchedInstruction}</td>
                            <td className="text-secondary text-xs">{rec.condition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Backpatching Event Stream */}
                <div className="backpatch-section mt-4">
                  <h4 className="section-heading flex items-center gap-2">
                    <Workflow size={14} className="text-amber" />
                    <span>Backpatching Event Sequence ({backpatchEvents.length} operations)</span>
                  </h4>
                  <div className="event-stream-container font-mono">
                    {backpatchEvents.map((evt, idx) => {
                      const isMakelist = evt.action === 'makelist';
                      const isMerge = evt.action === 'merge';
                      const isBackpatch = evt.action === 'backpatch';

                      return (
                        <div key={idx} className="event-stream-row">
                          <span className="event-step-num">{evt.step}.</span>
                          <span
                            className={`badge ${
                              isMakelist
                                ? 'badge-cyan'
                                : isMerge
                                ? 'badge-purple'
                                : 'badge-amber'
                            }`}
                          >
                            {evt.action}
                          </span>
                          <span className="event-desc text-secondary">
                            {evt.description}
                          </span>
                          {evt.targetLabel && (
                            <span className="badge badge-emerald ml-auto font-bold">
                              → {evt.targetLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Syntax-Directed Definition (SDD) Attributes */}
        {activeTab === 'sdt' && (
          <div className="sdt-tab-pane">
            <div className="sdt-toolbar">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSdtFilter('all')}
                  className={`btn btn-sm ${sdtFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  All ({sdtTraces.length})
                </button>
                <button
                  onClick={() => setSdtFilter('synthesized')}
                  className={`btn btn-sm ${sdtFilter === 'synthesized' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Synthesized ({sdtTraces.filter(t => t.attributeType === 'synthesized').length})
                </button>
                <button
                  onClick={() => setSdtFilter('inherited')}
                  className={`btn btn-sm ${sdtFilter === 'inherited' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Inherited ({sdtTraces.filter(t => t.attributeType === 'inherited').length})
                </button>
              </div>

              <div className="search-input-wrapper">
                <Search size={13} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter attributes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="table-responsive font-mono mt-3">
              <table className="trace-data-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>AST Node</th>
                    <th>Grammar Production Rule</th>
                    <th>Kind</th>
                    <th>Attribute Name</th>
                    <th>Attribute Value</th>
                    <th>Compiler Action & Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSdt.map(trace => (
                    <tr key={trace.step}>
                      <td className="text-dim">{trace.step}</td>
                      <td>
                        <span className="badge badge-slate">{trace.nodeType}</span>
                      </td>
                      <td className="text-cyan font-bold">{trace.ruleApplied}</td>
                      <td>
                        <span
                          className={`badge ${
                            trace.attributeType === 'synthesized'
                              ? 'badge-purple'
                              : 'badge-amber'
                          }`}
                        >
                          {trace.attributeType}
                        </span>
                      </td>
                      <td className="text-secondary font-bold">{trace.attributeName}</td>
                      <td className="text-primary font-bold">{trace.attributeValue}</td>
                      <td className="text-muted text-xs">{trace.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Pipeline Timeline */}
        {activeTab === 'pipeline' && (
          <div className="pipeline-tab-pane">
            <div className="pipeline-steps-timeline">
              <div className="timeline-card">
                <div className="timeline-header">
                  <div className="timeline-step-badge">1</div>
                  <h4 className="timeline-title">Lexical Analysis (Lexer)</h4>
                  <span className="badge badge-emerald ml-auto">Passed</span>
                </div>
                <p className="timeline-desc text-secondary">
                  Scanned <strong>{tokens.length}</strong> tokens including keywords, identifiers, numeric literals, operators, and delimiters. Tracked source line and column numbers.
                </p>
              </div>

              <div className="timeline-connector" />

              <div className="timeline-card">
                <div className="timeline-header">
                  <div className="timeline-step-badge">2</div>
                  <h4 className="timeline-title">Syntactic Analysis (Recursive Descent Parser)</h4>
                  <span className="badge badge-emerald ml-auto">Passed</span>
                </div>
                <p className="timeline-desc text-secondary">
                  Constructed Abstract Syntax Tree with <strong>{stats.astNodeCount}</strong> typed nodes according to operator precedence levels. No syntax errors detected.
                </p>
              </div>

              <div className="timeline-connector" />

              <div className="timeline-card">
                <div className="timeline-header">
                  <div className="timeline-step-badge">3</div>
                  <h4 className="timeline-title">Postorder Traversal (Postfix Generator)</h4>
                  <span className="badge badge-emerald ml-auto">Passed</span>
                </div>
                <p className="timeline-desc text-secondary">
                  Traversed subtrees in postorder (Left, Right, Operator) to convert infix expressions into postfix notation without parentheses.
                </p>
              </div>

              <div className="timeline-connector" />

              <div className="timeline-card">
                <div className="timeline-header">
                  <div className="timeline-step-badge">4</div>
                  <h4 className="timeline-title">Syntax-Directed Translation & Attribute Evaluation</h4>
                  <span className="badge badge-emerald ml-auto">Passed</span>
                </div>
                <p className="timeline-desc text-secondary">
                  Computed <strong>{sdtTraces.length}</strong> attribute instances: synthesized temporary places (<code>t1</code>, <code>t2</code>...), and inherited control-flow target labels (<code>begin</code>, <code>next</code>).
                </p>
              </div>

              <div className="timeline-connector" />

              <div className="timeline-card">
                <div className="timeline-header">
                  <div className="timeline-step-badge">5</div>
                  <h4 className="timeline-title">Three-Address Code Generation & Backpatching</h4>
                  <span className="badge badge-emerald ml-auto">Passed</span>
                </div>
                <p className="timeline-desc text-secondary">
                  Emitted <strong>{stats.tacInstructionCount}</strong> numbered Three-Address Code quadruples with <strong>{stats.temporaryCount}</strong> temporaries and <strong>{stats.labelCount}</strong> labels. Resolved <strong>{stats.backpatchCount}</strong> short-circuit jumps.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Scanned Tokens */}
        {activeTab === 'tokens' && (
          <div className="tokens-tab-pane font-mono">
            <div className="table-responsive">
              <table className="trace-data-table">
                <thead>
                  <tr>
                    <th>Index</th>
                    <th>Token Type</th>
                    <th>Lexeme Value</th>
                    <th>Line</th>
                    <th>Column</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((tok, i) => (
                    <tr key={i}>
                      <td className="text-dim">{i + 1}</td>
                      <td>
                        <span className="badge badge-cyan">{tok.type}</span>
                      </td>
                      <td className="text-primary font-bold">"{tok.value}"</td>
                      <td className="text-secondary">{tok.loc.line}</td>
                      <td className="text-secondary">{tok.loc.column}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
