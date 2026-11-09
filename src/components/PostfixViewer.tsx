// ============================================================================
// CompilerX — PostfixViewer Component
// Postorder expression traversal display with interactive stack evaluation simulation
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Binary,
  Copy,
  Check,
  Play,
  RotateCcw,
  StepForward,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PostfixItem } from '../compiler/types';

interface PostfixViewerProps {
  postfixList: PostfixItem[];
}

interface StackStep {
  token: string;
  action: string;
  stackAfter: string[];
}

export const PostfixViewer: React.FC<PostfixViewerProps> = ({ postfixList }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Keep selected index valid
  const currentItem = postfixList[selectedIdx] || postfixList[0];

  // Build simulation steps for the currently selected expression
  const simulationSteps = React.useMemo(() => {
    if (!currentItem) return [];
    const steps: StackStep[] = [];
    const stack: string[] = [];

    const isOp = (t: string) =>
      ['+', '-', '*', '/', '<', '<=', '>', '>=', '==', '!=', '&&', '||', '!', 'neg'].includes(t);

    for (const token of currentItem.postfixTokens) {
      if (!isOp(token)) {
        stack.push(token);
        steps.push({
          token,
          action: `Push operand '${token}' onto stack`,
          stackAfter: [...stack],
        });
      } else if (token === 'neg' || token === '!') {
        const arg = stack.pop() || 'arg';
        const res = `(${token} ${arg})`;
        stack.push(res);
        steps.push({
          token,
          action: `Pop '${arg}', apply unary '${token}', push '${res}'`,
          stackAfter: [...stack],
        });
      } else {
        const right = stack.pop() || 'r';
        const left = stack.pop() || 'l';
        const res = `(${left} ${token} ${right})`;
        stack.push(res);
        steps.push({
          token,
          action: `Pop '${right}' and '${left}', apply '${token}', push intermediate result`,
          stackAfter: [...stack],
        });
      }
    }

    return steps;
  }, [currentItem]);

  // Reset step when changing selected expression
  useEffect(() => {
    setStepIdx(0);
    setIsPlaying(false);
  }, [selectedIdx]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStepIdx(prev => {
        if (prev < simulationSteps.length - 1) return prev + 1;
        setIsPlaying(false);
        return prev;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [isPlaying, simulationSteps.length]);

  if (postfixList.length === 0) {
    return (
      <div className="empty-state-card">
        <Binary size={36} className="text-dim mb-3" />
        <h3 className="empty-title">No Expressions for Postfix Notation</h3>
        <p className="empty-desc">
          Add arithmetic or conditional expressions to your source code and run the compiler to see postfix postorder traversal and stack evaluation.
        </p>
      </div>
    );
  }

  const handleCopyAll = () => {
    const text = postfixList
      .map(p => `${p.sourceExpr}  -->  ${p.postfixString}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStep = simulationSteps[stepIdx];

  return (
    <div className="postfix-viewer-container">
      {/* Top Bar */}
      <div className="postfix-toolbar">
        <div className="postfix-toolbar-left">
          <span className="badge badge-purple">{postfixList.length} Expressions</span>
          <span className="text-secondary text-xs">
            Generated via postorder AST traversal (Left → Right → Root)
          </span>
        </div>

        <div className="postfix-toolbar-right">
          <button
            onClick={handleCopyAll}
            className="btn btn-secondary btn-sm"
            id="btn-copy-postfix"
          >
            {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy All Postfix'}</span>
          </button>
        </div>
      </div>

      <div className="postfix-main-layout">
        {/* Left List of Expressions */}
        <div className="postfix-list-pane">
          <h4 className="pane-section-title">Program Expressions</h4>
          <div className="expression-cards-container">
            {postfixList.map((item, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <div
                  key={item.expressionId}
                  onClick={() => setSelectedIdx(idx)}
                  className={`expression-card ${isSelected ? 'card-selected' : ''}`}
                >
                  <div className="card-header-row">
                    <span className="badge badge-slate text-xs">{item.nodeType}</span>
                    <span className="text-dim text-xs">Expr #{idx + 1}</span>
                  </div>

                  <div className="source-expr-preview font-mono text-secondary">
                    {item.sourceExpr}
                  </div>

                  <div className="postfix-result-preview font-mono">
                    <span className="text-dim text-xs mr-2">Postfix:</span>
                    <span className="text-cyan font-bold">{item.postfixString}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Interactive Stack Simulator */}
        <div className="postfix-sim-pane">
          <div className="sim-header">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-cyan" />
              <h4 className="pane-section-title mb-0">Stack Evaluation Simulator</h4>
            </div>

            {/* Controls */}
            <div className="sim-controls">
              <button
                onClick={() => setStepIdx(0)}
                className="btn btn-ghost btn-sm"
                title="Reset simulation"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>

              <button
                onClick={() => setStepIdx(prev => Math.min(simulationSteps.length - 1, prev + 1))}
                disabled={stepIdx >= simulationSteps.length - 1}
                className="btn btn-secondary btn-sm"
                title="Step forward one token"
              >
                <StepForward size={13} />
                <span>Step</span>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`btn btn-sm ${isPlaying ? 'btn-secondary' : 'btn-primary'}`}
              >
                <Play size={13} className={isPlaying ? 'animate-pulse' : ''} />
                <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
              </button>
            </div>
          </div>

          {/* Current Expression Banner */}
          <div className="sim-expr-banner font-mono">
            <div className="text-xs text-muted mb-1">Evaluating Postfix Tokens:</div>
            <div className="postfix-tokens-stream">
              {currentItem.postfixTokens.map((tok, i) => {
                const isCurrent = i === stepIdx;
                const isPassed = i < stepIdx;
                return (
                  <span
                    key={i}
                    className={`token-pill ${isCurrent ? 'pill-active' : ''} ${
                      isPassed ? 'pill-passed' : ''
                    }`}
                  >
                    {tok}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Stack Visualization */}
          <div className="stack-visual-container">
            <div className="stack-column font-mono">
              <div className="stack-top-label">
                <span>Top of Stack</span>
                <span className="text-cyan text-xs">▲</span>
              </div>

              <div className="stack-elements-frame">
                {currentStep?.stackAfter && currentStep.stackAfter.length > 0 ? (
                  currentStep.stackAfter
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                      <div key={idx} className="stack-item-box animate-in">
                        <span className="stack-item-idx text-dim text-xs">
                          [{currentStep.stackAfter.length - 1 - idx}]
                        </span>
                        <span className="stack-item-val font-bold text-cyan">{item}</span>
                      </div>
                    ))
                ) : (
                  <div className="stack-empty-notice text-dim">
                    Stack is empty. Click <strong>Step</strong> to begin evaluation.
                  </div>
                )}
              </div>

              <div className="stack-bottom-plate">Stack Bottom</div>
            </div>

            {/* Action Explanation Box */}
            <div className="sim-explanation-card">
              <div className="expl-title flex items-center gap-2">
                <Sparkles size={14} className="text-amber" />
                <span>Step {stepIdx + 1} of {simulationSteps.length}</span>
              </div>

              <div className="expl-body font-mono text-secondary">
                {currentStep ? currentStep.action : 'Press Step or Auto Play to observe stack actions.'}
              </div>

              <div className="expl-summary text-muted text-xs">
                {currentItem.explanation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
