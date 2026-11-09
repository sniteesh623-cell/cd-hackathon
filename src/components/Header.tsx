// ============================================================================
// CompilerX — Header Component (Apple × Xcode Style)
// Restrained, uncluttered navigation bar with essential actions & status.
// ============================================================================

import React from 'react';
import {
  Play,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Command,
  PanelLeft,
  ChevronRight,
} from 'lucide-react';
import { CompilerResult } from '../compiler/types';
import { SampleProgram, SAMPLE_PROGRAMS } from '../compiler/samples';
import { WorkspaceDestination } from './Sidebar';

interface HeaderProps {
  compilerResult: CompilerResult | null;
  isRunning: boolean;
  onRunCompiler: () => void;
  onResetCode: () => void;
  onOpenHelp: () => void;
  onOpenCommandPalette: () => void;
  currentWorkspace: WorkspaceDestination;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  selectedSampleId: string;
  onSelectSample: (sample: SampleProgram) => void;
}

const WORKSPACE_TITLES: Record<WorkspaceDestination, string> = {
  overview: 'Overview',
  workbench: 'Compiler Workbench',
  ast: 'AST Explorer',
  symbols: 'Symbol Table',
  ir: 'Intermediate Code',
  trace: 'Translation & Backpatching',
  optimizer: 'Optimization Lab',
  cfg: 'Control Flow Graph',
  dataflow: 'Data Flow Analysis',
  vm: 'Execution & Debugger',
  analytics: 'Compiler Analytics',
  docs: 'Grammar & Documentation',
};

export const Header: React.FC<HeaderProps> = ({
  compilerResult,
  isRunning,
  onRunCompiler,
  onResetCode,
  onOpenHelp,
  onOpenCommandPalette,
  currentWorkspace,
  isSidebarCollapsed,
  onToggleSidebar,
  selectedSampleId,
  onSelectSample,
}) => {
  const isSuccess = compilerResult?.success ?? false;
  const hasResult = compilerResult !== null;

  return (
    <header className="header-container">
      {/* Left: Sidebar Toggle + Xcode-style Breadcrumb + Sample Picker */}
      <div className="header-left">
        {isSidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="header-icon-btn mr-1"
            title="Expand Sidebar (⌘B)"
          >
            <PanelLeft size={16} />
          </button>
        )}

        <div className="header-breadcrumb">
          <span className="breadcrumb-root">CompilerX</span>
          <ChevronRight size={13} className="text-dim" />
          <span className="breadcrumb-current">{WORKSPACE_TITLES[currentWorkspace]}</span>
        </div>

        {/* Sample Program Dropdown */}
        <div className="header-sample-picker">
          <select
            value={selectedSampleId}
            onChange={e => {
              const sample = SAMPLE_PROGRAMS.find(s => s.id === e.target.value);
              if (sample) onSelectSample(sample);
            }}
            className="header-select font-mono"
            title="Select sample program"
          >
            {SAMPLE_PROGRAMS.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center: Quiet Compilation Status Pill */}
      <div className="header-center">
        {hasResult ? (
          isSuccess ? (
            <div className="status-pill-minimal status-success">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>{compilerResult.stats.compileTimeMs}ms</span>
              <span className="pill-dot">•</span>
              <span>{compilerResult.stats.tacInstructionCount} TAC lines</span>
            </div>
          ) : (
            <div className="status-pill-minimal status-error">
              <AlertCircle size={13} className="text-rose" />
              <span>Compilation Error</span>
              <span className="pill-dot">•</span>
              <span>{compilerResult.diagnostics.length} diagnostic(s)</span>
            </div>
          )
        ) : (
          <div className="status-pill-minimal status-idle">
            <span className="pill-dot-idle" />
            <span>Ready</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="header-right">
        {/* Command Palette Trigger Button */}
        <button
          onClick={onOpenCommandPalette}
          className="header-palette-btn"
          title="Open Command Palette (⌘K)"
        >
          <Command size={13} />
          <span className="text-muted">⌘K</span>
        </button>

        <button
          onClick={onResetCode}
          className="header-icon-btn"
          title="Reset to default code"
        >
          <RotateCcw size={14} />
        </button>

        <button
          onClick={onOpenHelp}
          className="header-icon-btn"
          title="Open Language & Grammar Specification"
        >
          <BookOpen size={14} />
        </button>

        {/* Primary Run Compiler Button */}
        <button
          onClick={onRunCompiler}
          disabled={isRunning}
          className="btn btn-primary btn-sm btn-run-apple"
          title="Run Compiler Pipeline (⌘ + Enter)"
        >
          <Play size={13} className={isRunning ? 'animate-spin' : ''} />
          <span className="font-semibold">Run</span>
          <kbd className="header-kbd">⌘↵</kbd>
        </button>
      </div>
    </header>
  );
};
