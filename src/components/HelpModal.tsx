// ============================================================================
// CompilerX — HelpModal Component
// Specification Guide, Grammar Reference, SDD Rules, & Backpatching Documentation
// ============================================================================

import React from 'react';
import {
  BookOpen,
  X,
  CheckCircle2,
  AlertTriangle,
  Code2,
  GitMerge,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-cyan" />
            <h3 className="modal-title">CompilerX Specification & Guide</h3>
            <span className="badge badge-purple text-xs">PS-06 ThreeAddrGen</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body font-sans">
          {/* Section 1: Supported Language Subset */}
          <div className="guide-section">
            <h4 className="guide-section-title text-cyan flex items-center gap-2">
              <Code2 size={16} />
              <span>Supported Language Grammar</span>
            </h4>
            <p className="text-secondary text-sm mb-3">
              CompilerX implements a real compiler pipeline for a deliberately restricted, strongly-typed C-like educational language subset:
            </p>

            <div className="grammar-grid">
              <div className="grammar-card">
                <span className="grammar-card-title">Data Types</span>
                <ul className="grammar-list text-xs text-secondary font-mono">
                  <li><code>int</code>: 32-bit signed integer literals (e.g. <code>42</code>, <code>0</code>)</li>
                  <li><code>float</code>: IEEE floating-point literals (e.g. <code>3.14</code>, <code>0.5</code>)</li>
                </ul>
              </div>

              <div className="grammar-card">
                <span className="grammar-card-title">Declarations & Assignments</span>
                <ul className="grammar-list text-xs text-secondary font-mono">
                  <li><code>int a = 10, b = 20;</code></li>
                  <li><code>float val = 4.5;</code></li>
                  <li><code>x = a + b * 2;</code></li>
                </ul>
              </div>

              <div className="grammar-card">
                <span className="grammar-card-title">Control Flow Statements</span>
                <ul className="grammar-list text-xs text-secondary font-mono">
                  <li><code>if (condition) stmt</code></li>
                  <li><code>if (condition) stmt else stmt</code></li>
                  <li><code>while (condition) stmt</code></li>
                  <li><code>{`{ stmt1; stmt2; }`}</code> (block statements)</li>
                </ul>
              </div>

              <div className="grammar-card">
                <span className="grammar-card-title">Operators & Precedence</span>
                <ul className="grammar-list text-xs text-secondary font-mono">
                  <li>Logical OR: <code>||</code> (Lowest precedence)</li>
                  <li>Logical AND: <code>&&</code></li>
                  <li>Equality: <code>==</code>, <code>!=</code></li>
                  <li>Relational: <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code></li>
                  <li>Additive: <code>+</code>, <code>-</code></li>
                  <li>Multiplicative: <code>*</code>, <code>/</code></li>
                  <li>Unary: <code>!</code>, <code>-</code> (Highest precedence)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2: Dragon Book Boolean Backpatching */}
          <div className="guide-section mt-4">
            <h4 className="guide-section-title text-amber flex items-center gap-2">
              <GitMerge size={16} />
              <span>Boolean Short-Circuit & Backpatching Rules</span>
            </h4>
            <p className="text-secondary text-sm mb-3">
              Standard translation of Boolean expressions in C uses short-circuit evaluation. Rather than evaluating every subexpression, jumps occur as soon as the outcome is known:
            </p>

            <div className="backpatch-rule-box font-mono text-xs">
              <div className="rule-row">
                <span className="rule-badge badge badge-cyan">makelist(i)</span>
                <span className="text-secondary">Creates a new list containing single instruction index <code>i</code>.</span>
              </div>
              <div className="rule-row">
                <span className="rule-badge badge badge-purple">merge(p1, p2)</span>
                <span className="text-secondary">Concatenates address lists <code>p1</code> and <code>p2</code> into a combined list.</span>
              </div>
              <div className="rule-row">
                <span className="rule-badge badge badge-amber">backpatch(p, L)</span>
                <span className="text-secondary">Fills label <code>L</code> as the jump target for all instructions indexed in <code>p</code>.</span>
              </div>
            </div>

            <div className="sdd-table-container font-mono text-xs mt-3">
              <table className="trace-data-table">
                <thead>
                  <tr>
                    <th>Grammar Production</th>
                    <th>Semantic Rules & Backpatching Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-cyan font-bold">B → B1 || M B2</td>
                    <td>
                      <code>backpatch(B1.falselist, M.label);</code><br />
                      <code>B.truelist = merge(B1.truelist, B2.truelist);</code><br />
                      <code>B.falselist = B2.falselist;</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-cyan font-bold">B → B1 && M B2</td>
                    <td>
                      <code>backpatch(B1.truelist, M.label);</code><br />
                      <code>B.truelist = B2.truelist;</code><br />
                      <code>B.falselist = merge(B1.falselist, B2.falselist);</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-cyan font-bold">B → ! B1</td>
                    <td>
                      <code>B.truelist = B1.falselist;</code><br />
                      <code>B.falselist = B1.truelist;</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-cyan font-bold">B → E1 relop E2</td>
                    <td>
                      <code>i = emit('if', E1.place, relop, E2.place, 'goto _');</code><br />
                      <code>j = emit('goto _');</code><br />
                      <code>B.truelist = makelist(i); B.falselist = makelist(j);</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Honest Limitations */}
          <div className="guide-section mt-4">
            <h4 className="guide-section-title text-rose flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>Architectural Scope & Limitations</span>
            </h4>
            <div className="callout-card callout-card-rose text-xs text-secondary">
              <p className="mb-2">
                CompilerX is specifically engineered for <strong>PS-06 ThreeAddrGen</strong> focusing on syntax-directed translation, three-address code generation, postorder traversal, and Boolean backpatching.
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>No pointer arithmetic:</strong> Pointers (<code>*p</code>, <code>&amp;x</code>) are excluded.</li>
                <li><strong>No function definitions:</strong> Focus is on intra-procedural translation and control-flow graphs.</li>
                <li><strong>Deterministic client-side compilation:</strong> Runs 100% locally in browser TypeScript with 0 network calls or mock servers.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary btn-sm">
            Got it, Let's Compile
          </button>
        </div>
      </div>
    </div>
  );
};
