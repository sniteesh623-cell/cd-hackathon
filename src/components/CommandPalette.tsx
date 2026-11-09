// ============================================================================
// CompilerX — Command Palette Component (Raycast × Linear Style)
// Instant keyboard-driven navigation across workspaces, actions, and samples.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceDestination } from './Sidebar';
import { SampleProgram, SAMPLE_PROGRAMS } from '../compiler/samples';
import {
  Search,
  Code2,
  Layers,
  ShieldCheck,
  Terminal,
  Zap,
  Network,
  Activity,
  Cpu,
  BarChart3,
  BookOpen,
  Compass,
  Play,
  RotateCcw,
  Sun,
  Moon,
  FileCode2,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkspace: (dest: WorkspaceDestination) => void;
  onSelectSample: (sample: SampleProgram) => void;
  onRunCompiler: () => void;
  onResetCode: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Workspace' | 'Action' | 'Sample Program';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectWorkspace,
  onSelectSample,
  onRunCompiler,
  onResetCode,
  theme,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const allItems: PaletteItem[] = [
    // Actions
    {
      id: 'act-run',
      title: 'Run Compiler Pipeline',
      subtitle: 'Compile active source through lexer, parser, SDT, and TAC',
      category: 'Action',
      icon: Play,
      action: () => { onRunCompiler(); onClose(); },
    },
    {
      id: 'act-reset',
      title: 'Reset Code',
      subtitle: 'Restore active code to initial state',
      category: 'Action',
      icon: RotateCcw,
      action: () => { onResetCode(); onClose(); },
    },
    {
      id: 'act-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle interface color palette',
      category: 'Action',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => { onToggleTheme(); onClose(); },
    },

    // Workspaces
    { id: 'ws-overview', title: 'Go to Overview', subtitle: 'Pipeline architecture & summary', category: 'Workspace', icon: Compass, action: () => { onSelectWorkspace('overview'); onClose(); } },
    { id: 'ws-workbench', title: 'Go to Compiler Workbench', subtitle: 'Primary source editor & output panes', category: 'Workspace', icon: Code2, action: () => { onSelectWorkspace('workbench'); onClose(); } },
    { id: 'ws-ast', title: 'Go to AST Explorer', subtitle: 'Interactive syntax tree visualizer', category: 'Workspace', icon: Layers, action: () => { onSelectWorkspace('ast'); onClose(); } },
    { id: 'ws-symbols', title: 'Go to Symbol Table', subtitle: 'Lexical scopes & symbol matrix', category: 'Workspace', icon: ShieldCheck, action: () => { onSelectWorkspace('symbols'); onClose(); } },
    { id: 'ws-ir', title: 'Go to Intermediate Code', subtitle: 'Three-Address Code & Quadruple table', category: 'Workspace', icon: Terminal, action: () => { onSelectWorkspace('ir'); onClose(); } },
    { id: 'ws-optimizer', title: 'Go to Optimization Lab', subtitle: 'Pass toggles, side-by-side diffs & metrics', category: 'Workspace', icon: Zap, action: () => { onSelectWorkspace('optimizer'); onClose(); } },
    { id: 'ws-cfg', title: 'Go to Control Flow Graph', subtitle: 'Basic blocks, dominators & natural loops', category: 'Workspace', icon: Network, action: () => { onSelectWorkspace('cfg'); onClose(); } },
    { id: 'ws-dataflow', title: 'Go to Data Flow Analysis', subtitle: 'Reaching definitions & live variables', category: 'Workspace', icon: Activity, action: () => { onSelectWorkspace('dataflow'); onClose(); } },
    { id: 'ws-vm', title: 'Go to Execution & Debugger', subtitle: 'In-browser TAC VM with time-travel', category: 'Workspace', icon: Cpu, action: () => { onSelectWorkspace('vm'); onClose(); } },
    { id: 'ws-analytics', title: 'Go to Compiler Analytics', subtitle: 'McCabe complexity & report exporter', category: 'Workspace', icon: BarChart3, action: () => { onSelectWorkspace('analytics'); onClose(); } },
    { id: 'ws-docs', title: 'Go to Grammar & Documentation', subtitle: 'BNF grammar, SDD rules & specifications', category: 'Workspace', icon: BookOpen, action: () => { onSelectWorkspace('docs'); onClose(); } },

    // Samples
    ...SAMPLE_PROGRAMS.map(s => ({
      id: `sample-${s.id}`,
      title: `Load Sample: ${s.name}`,
      subtitle: s.description,
      category: 'Sample Program' as const,
      icon: FileCode2,
      action: () => { onSelectSample(s); onSelectWorkspace('workbench'); onClose(); },
    })),
  ];

  const filteredItems = allItems.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-modal" onClick={e => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="palette-search-row">
          <Search size={16} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, workspace, or sample..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="palette-input"
          />
          <kbd className="palette-esc-badge" onClick={onClose}>ESC</kbd>
        </div>

        {/* Results List */}
        <div className="palette-results-list">
          {filteredItems.length === 0 ? (
            <div className="palette-empty-state">No matching commands or destinations found.</div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? 'selected' : ''}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="palette-item-icon">
                    <Icon size={14} />
                  </div>
                  <div className="palette-item-text">
                    <div className="palette-item-title">{item.title}</div>
                    <div className="palette-item-subtitle">{item.subtitle}</div>
                  </div>
                  <span className="palette-item-category">{item.category}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="palette-footer">
          <span className="footer-hint"><strong>↑↓</strong> to navigate</span>
          <span className="footer-hint"><strong>↵</strong> to select</span>
          <span className="footer-hint"><strong>esc</strong> to dismiss</span>
        </div>
      </div>
    </div>
  );
};
