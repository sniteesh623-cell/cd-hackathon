// ============================================================================
// CompilerX — EditorPanel Component
// Source code editor with line numbers, sample picker, error highlighting & shortcuts
// ============================================================================

import React, { useRef, useEffect, useState } from 'react';
import {
  Code,
  Sparkles,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { SampleProgram, SAMPLE_PROGRAMS } from '../compiler/samples';
import { CompilerDiagnostic } from '../compiler/types';

interface EditorPanelProps {
  sourceCode: string;
  onChangeSource: (code: string) => void;
  onSelectSample: (sample: SampleProgram) => void;
  selectedSampleId: string;
  diagnostics: CompilerDiagnostic[];
  onRunCompiler: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  sourceCode,
  onChangeSource,
  onSelectSample,
  selectedSampleId,
  diagnostics,
  onRunCompiler,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);

  const lines = sourceCode.split('\n');
  const errorLines = new Set(
    diagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.line)
  );

  // Sync gutter scroll with textarea
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Track cursor position
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = sourceCode.substring(0, pos);
    const lineNum = textBefore.split('\n').length;
    const colNum = pos - textBefore.lastIndexOf('\n');
    setCursorPos({ line: lineNum, col: colNum });
  };

  // Keyboard handling: Tab inserts 2 spaces, Cmd/Ctrl+Enter runs compiler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRunCompiler();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newCode =
        sourceCode.substring(0, start) + '  ' + sourceCode.substring(end);
      onChangeSource(newCode);

      // Restore cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            start + 2;
        }
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    onChangeSource('');
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="editor-panel-container">
      {/* Editor Top Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <div className="editor-label">
            <Code size={14} className="text-cyan" />
            <span>Source Code</span>
          </div>

          {/* Sample Selector */}
          <div className="sample-select-wrapper">
            <Sparkles size={13} className="sample-icon" />
            <select
              value={selectedSampleId}
              onChange={e => {
                const sample = SAMPLE_PROGRAMS.find(s => s.id === e.target.value);
                if (sample) onSelectSample(sample);
              }}
              className="sample-select"
              id="sample-program-select"
            >
              {SAMPLE_PROGRAMS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolbar Quick Actions */}
        <div className="editor-toolbar-right">
          <button
            onClick={handleCopy}
            className="btn btn-ghost btn-sm"
            title="Copy Source Code"
            id="btn-copy-source"
          >
            {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleClear}
            className="btn btn-ghost btn-sm text-dim hover-text-rose"
            title="Clear Editor"
            id="btn-clear-source"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Editor Workspace (Gutter + Textarea) */}
      <div className="editor-body">
        {/* Line Numbers Gutter */}
        <div ref={gutterRef} className="editor-gutter">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const hasError = errorLines.has(lineNum);
            const isCursorLine = cursorPos.line === lineNum;

            return (
              <div
                key={idx}
                className={`gutter-line ${isCursorLine ? 'gutter-active' : ''} ${
                  hasError ? 'gutter-error' : ''
                }`}
              >
                {hasError && <AlertTriangle size={10} className="gutter-error-icon" />}
                <span className="gutter-number">{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Code Textarea */}
        <textarea
          ref={textareaRef}
          value={sourceCode}
          onChange={e => onChangeSource(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          placeholder="// Enter C-like code here...
int a = 10;
int b = 20;
int c = a + b * 2;
"
          className="editor-textarea font-mono"
          id="source-code-editor"
        />
      </div>

      {/* Editor Footer Status Bar */}
      <div className="editor-footer">
        <div className="editor-footer-left">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="footer-dot">•</span>
          <span>{lines.length} lines</span>
          <span className="footer-dot">•</span>
          <span>{sourceCode.length} chars</span>
        </div>
        <div className="editor-footer-right">
          <span className="shortcut-hint">Press <kbd>⌘↵</kbd> to compile</span>
        </div>
      </div>
    </div>
  );
};
