// ============================================================================
// CompilerX — Visual Compiler Workbench
// Main React Application & Apple × Xcode × Linear Architecture
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, WorkspaceDestination } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { OverviewWorkspace } from './components/OverviewWorkspace';
import { WorkbenchView } from './components/WorkbenchView';
import { ASTVisualizer } from './components/ASTVisualizer';
import { TACViewer } from './components/TACViewer';
import { SemanticsViewer } from './components/SemanticsViewer';
import { CFGViewer } from './components/CFGViewer';
import { DataFlowViewer } from './components/DataFlowViewer';
import { OptimizerLab } from './components/OptimizerLab';
import { VMDebugger } from './components/VMDebugger';
import { TranslationTrace } from './components/TranslationTrace';
import { AnalyticsViewer } from './components/AnalyticsViewer';
import { DocsWorkspace } from './components/DocsWorkspace';
import { HelpModal } from './components/HelpModal';

import { compileSource } from './compiler';
import { CompilerResult } from './compiler/types';
import { SampleProgram, SAMPLE_PROGRAMS } from './compiler/samples';
import './App.css';

export function App() {
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceDestination>('workbench');
  const [selectedSample, setSelectedSample] = useState<SampleProgram>(SAMPLE_PROGRAMS[0]);
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_PROGRAMS[0].code);
  const [compilerResult, setCompilerResult] = useState<CompilerResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('compilerx_theme') as 'dark' | 'light') || 'dark';
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('compilerx_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Compile callback
  const handleRunCompiler = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const result = compileSource(sourceCode);
      setCompilerResult(result);
      setIsRunning(false);
    }, 10);
  }, [sourceCode]);

  // Initial compile on mount
  useEffect(() => {
    handleRunCompiler();
  }, []);

  // Global Keyboard Shortcuts (⌘K for palette, ⌘B for sidebar, ⌘Enter to run)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // ⌘B / Ctrl+B: Toggle Sidebar
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
      // ⌘Enter / Ctrl+Enter: Run Compiler
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCompiler();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleRunCompiler]);

  // Sample selection
  const handleSelectSample = (sample: SampleProgram) => {
    setSelectedSample(sample);
    setSourceCode(sample.code);
    setTimeout(() => {
      const result = compileSource(sample.code);
      setCompilerResult(result);
    }, 10);
  };

  const handleResetCode = () => {
    handleSelectSample(SAMPLE_PROGRAMS[0]);
  };

  return (
    <div className="app-container" data-theme={theme}>
      {/* Collapsible Sidebar Navigation (Linear × Xcode) */}
      <Sidebar
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={setCurrentWorkspace}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        stats={{
          tacCount: compilerResult?.stats.tacInstructionCount,
          astCount: compilerResult?.stats.astNodeCount,
          symbolCount: compilerResult?.semantics?.symbolList.length,
          blockCount: compilerResult?.cfg?.blocks.length,
        }}
      />

      {/* Main Content Area */}
      <div className="main-content-wrapper">
        {/* Xcode Header Bar */}
        <Header
          compilerResult={compilerResult}
          isRunning={isRunning}
          onRunCompiler={handleRunCompiler}
          onResetCode={handleResetCode}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          currentWorkspace={currentWorkspace}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(false)}
          selectedSampleId={selectedSample.id}
          onSelectSample={handleSelectSample}
        />

        {/* Dynamic Workspace Viewport */}
        <main className="workspace-viewport">
          {currentWorkspace === 'overview' && (
            <OverviewWorkspace
              compilerResult={compilerResult}
              onSelectWorkspace={setCurrentWorkspace}
              onSelectSample={handleSelectSample}
              selectedSampleId={selectedSample.id}
            />
          )}

          {currentWorkspace === 'workbench' && (
            <WorkbenchView
              sourceCode={sourceCode}
              onChangeSource={setSourceCode}
              onSelectSample={handleSelectSample}
              selectedSampleId={selectedSample.id}
              compilerResult={compilerResult}
              onRunCompiler={handleRunCompiler}
            />
          )}

          {currentWorkspace === 'ast' && (
            <ASTVisualizer ast={compilerResult?.ast ?? null} />
          )}

          {currentWorkspace === 'symbols' && (
            <SemanticsViewer semantics={compilerResult?.semantics ?? null} />
          )}

          {currentWorkspace === 'ir' && (
            <TACViewer
              instructions={compilerResult?.tacInstructions ?? []}
              tacText={compilerResult?.tacText ?? ''}
              backpatchRecords={compilerResult?.backpatchRecords ?? []}
            />
          )}

          {currentWorkspace === 'trace' && (
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

          {currentWorkspace === 'optimizer' && (
            <OptimizerLab
              initialResult={compilerResult?.optimization ?? null}
              originalInstructions={compilerResult?.tacInstructions ?? []}
            />
          )}

          {currentWorkspace === 'cfg' && (
            <CFGViewer cfg={compilerResult?.cfg ?? null} />
          )}

          {currentWorkspace === 'dataflow' && (
            <DataFlowViewer dataFlow={compilerResult?.dataFlow ?? null} />
          )}

          {currentWorkspace === 'vm' && (
            <VMDebugger instructions={compilerResult?.tacInstructions ?? []} />
          )}

          {currentWorkspace === 'analytics' && (
            <AnalyticsViewer
              compilerResult={compilerResult}
              cfg={compilerResult?.cfg ?? null}
              optResult={compilerResult?.optimization ?? null}
              semantics={compilerResult?.semantics ?? null}
            />
          )}

          {currentWorkspace === 'docs' && (
            <DocsWorkspace />
          )}
        </main>
      </div>

      {/* Global Raycast / Linear Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectWorkspace={setCurrentWorkspace}
        onSelectSample={handleSelectSample}
        onRunCompiler={handleRunCompiler}
        onResetCode={handleResetCode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* BNF Grammar & Backpatching Specification Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

export default App;
