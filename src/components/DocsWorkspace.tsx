// ============================================================================
// CompilerX — Grammar & Documentation Workspace
// Clear documentation of BNF grammar, SDD semantic rules, and backpatching.
// ============================================================================

import React from 'react';
import { BookOpen, Layers, Terminal, GitMerge, Keyboard } from 'lucide-react';

export const DocsWorkspace: React.FC = () => {
  return (
    <div className="docs-workspace">
      {/* Header */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div className="viewer-title">
            <BookOpen size={18} className="text-purple" />
            <h2>Language Specification & Compiler Documentation</h2>
          </div>
          <span className="badge badge-purple">PS-06 ThreeAddrGen</span>
        </div>
        <p className="viewer-description">
          Formal syntax specification, operator precedence rules, syntax-directed translation definitions (SDD), and Dragon Book backpatching procedures.
        </p>
      </div>

      <div className="docs-content-grid">
        {/* BNF Grammar Card */}
        <div className="card-panel">
          <div className="card-title mb-3">
            <Layers size={14} className="text-cyan" />
            <span>Context-Free Grammar (BNF)</span>
          </div>

          <div className="bnf-box font-mono text-xs">
            <div className="bnf-group">
              <span className="bnf-nonterminal">&lt;Program&gt;</span>
              <span className="bnf-arrow">::=</span>
              <span className="bnf-production">&lt;StatementList&gt;</span>
            </div>
            <div className="bnf-group">
              <span className="bnf-nonterminal">&lt;Statement&gt;</span>
              <span className="bnf-arrow">::=</span>
              <span className="bnf-production">&lt;VarDecl&gt; | &lt;Assignment&gt; | &lt;IfStmt&gt; | &lt;WhileStmt&gt; | &lt;Block&gt;</span>
            </div>
            <div className="bnf-group">
              <span className="bnf-nonterminal">&lt;VarDecl&gt;</span>
              <span className="bnf-arrow">::=</span>
              <span className="bnf-production">( 'int' | 'float' ) &lt;IdentList&gt; ';'</span>
            </div>
            <div className="bnf-group">
              <span className="bnf-nonterminal">&lt;Assignment&gt;</span>
              <span className="bnf-arrow">::=</span>
              <span className="bnf-production">&lt;Identifier&gt; '=' &lt;Expression&gt; ';'</span>
            </div>
            <div className="bnf-group">
              <span className="bnf-nonterminal">&lt;IfStmt&gt;</span>
              <span className="bnf-arrow">::=</span>
              <span className="bnf-production">'if' '(' &lt;Condition&gt; ')' &lt;Statement&gt; [ 'else' &lt;Statement&gt; ]</span>
            </div>
            <div className="bnf-group">
              <span className="bnf-nonterminal">&lt;WhileStmt&gt;</span>
              <span className="bnf-arrow">::=</span>
              <span className="bnf-production">'while' '(' &lt;Condition&gt; ')' &lt;Statement&gt;</span>
            </div>
            <div className="bnf-group">
              <span className="bnf-nonterminal">&lt;Block&gt;</span>
              <span className="bnf-arrow">::=</span>
              <span className="bnf-production">'{' &lt;StatementList&gt; '}'</span>
            </div>
          </div>
        </div>

        {/* Operator Precedence Table */}
        <div className="card-panel">
          <div className="card-title mb-3">
            <Terminal size={14} className="text-emerald" />
            <span>Operator Precedence Hierarchy (Highest to Lowest)</span>
          </div>

          <div className="table-responsive">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Operators</th>
                  <th>Description</th>
                  <th>Associativity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>8</td>
                  <td className="font-mono text-cyan">( ... )</td>
                  <td>Parentheses / Grouping</td>
                  <td>N/A</td>
                </tr>
                <tr>
                  <td>7</td>
                  <td className="font-mono text-cyan">! , -</td>
                  <td>Logical NOT & Unary Minus</td>
                  <td>Right-to-Left</td>
                </tr>
                <tr>
                  <td>6</td>
                  <td className="font-mono text-cyan">* , /</td>
                  <td>Multiplication & Division</td>
                  <td>Left-to-Right</td>
                </tr>
                <tr>
                  <td>5</td>
                  <td className="font-mono text-cyan">+ , -</td>
                  <td>Addition & Subtraction</td>
                  <td>Left-to-Right</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td className="font-mono text-cyan">&lt; , &lt;= , &gt; , &gt;=</td>
                  <td>Relational Comparisons</td>
                  <td>Left-to-Right</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td className="font-mono text-cyan">== , !=</td>
                  <td>Equality & Inequality</td>
                  <td>Left-to-Right</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td className="font-mono text-cyan">&amp;&amp;</td>
                  <td>Logical AND (Short-Circuit)</td>
                  <td>Left-to-Right</td>
                </tr>
                <tr>
                  <td>1</td>
                  <td className="font-mono text-cyan">||</td>
                  <td>Logical OR (Short-Circuit)</td>
                  <td>Left-to-Right</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Backpatching Rules */}
        <div className="card-panel">
          <div className="card-title mb-3">
            <GitMerge size={14} className="text-amber" />
            <span>Dragon Book Backpatching Mechanics</span>
          </div>

          <div className="docs-text text-xs text-secondary leading-relaxed">
            <p className="mb-2">
              Boolean conditions in CompilerX are translated dynamically without temporary values using jump target lists:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li><strong><code>B.truelist</code></strong>: List of jump instruction indices that must transfer control when condition B evaluates to true.</li>
              <li><strong><code>B.falselist</code></strong>: List of jump instruction indices that transfer control when condition B evaluates to false.</li>
              <li><strong><code>makelist(i)</code></strong>: Instantiates a list with a single instruction index <code>[i]</code>.</li>
              <li><strong><code>merge(p1, p2)</code></strong>: Concatenates two address lists into a unified set.</li>
              <li><strong><code>backpatch(p, L)</code></strong>: Patches label <code>L</code> into the target field of every jump instruction referenced in list <code>p</code>.</li>
            </ul>
          </div>
        </div>

        {/* Keyboard Shortcuts Card */}
        <div className="card-panel">
          <div className="card-title mb-3">
            <Keyboard size={14} className="text-purple" />
            <span>Keyboard Shortcuts & IDE Navigation</span>
          </div>

          <div className="shortcuts-list grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="shortcut-item flex items-center justify-between p-2 rounded bg-tertiary">
              <span className="text-secondary">Run Compiler Pipeline</span>
              <kbd className="kbd-shortcut">⌘ + Enter</kbd>
            </div>
            <div className="shortcut-item flex items-center justify-between p-2 rounded bg-tertiary">
              <span className="text-secondary">Open Command Palette</span>
              <kbd className="kbd-shortcut">⌘ + K</kbd>
            </div>
            <div className="shortcut-item flex items-center justify-between p-2 rounded bg-tertiary">
              <span className="text-secondary">Toggle Sidebar</span>
              <kbd className="kbd-shortcut">⌘ + B</kbd>
            </div>
            <div className="shortcut-item flex items-center justify-between p-2 rounded bg-tertiary">
              <span className="text-secondary">Indentation</span>
              <kbd className="kbd-shortcut">Tab (2 spaces)</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
