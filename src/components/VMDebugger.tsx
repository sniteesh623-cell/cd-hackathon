// ============================================================================
// CompilerX — TAC Virtual Machine & Interactive Debugger Component
// Step execution, time-travel history rewinding, breakpoint triggers, and live variable watches.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { TACInstruction } from '../compiler/types';
import { TACVirtualMachine, VMStatus, VMLogEntry } from '../compiler/vm/tacVM';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  CircleDot,
  Terminal,
  Eye,
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

interface VMDebuggerProps {
  instructions: TACInstruction[];
}

export const VMDebugger: React.FC<VMDebuggerProps> = ({ instructions }) => {
  const [vm] = useState<TACVirtualMachine>(() => new TACVirtualMachine(instructions));
  const [pc, setPc] = useState<number>(1);
  const [status, setStatus] = useState<VMStatus>('ready');
  const [memory, setMemory] = useState<Record<string, number>>({});
  const [log, setLog] = useState<VMLogEntry[]>([]);
  const [stepCount, setStepCount] = useState<number>(0);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [execSpeedMs, setExecSpeedMs] = useState<number>(400);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state from VM instance
  const syncState = () => {
    setPc(vm.getPC());
    setStatus(vm.getStatus());
    setMemory(vm.getMemory());
    setLog(vm.getLog());
    setStepCount(vm.getStepCount());
    setBreakpoints(vm.getBreakpoints());
  };

  // When instruction prop changes, reload VM
  useEffect(() => {
    vm.load(instructions);
    syncState();
  }, [instructions]);

  // Handle single step forward
  const handleStepForward = () => {
    vm.stepForward();
    syncState();
  };

  // Handle step backward (time travel)
  const handleStepBackward = () => {
    vm.stepBackward();
    syncState();
  };

  // Handle reset
  const handleReset = () => {
    setAutoPlay(false);
    if (timerRef.current) clearInterval(timerRef.current);
    vm.reset();
    syncState();
  };

  // Handle toggle breakpoint
  const handleToggleBreakpoint = (lineNum: number) => {
    vm.toggleBreakpoint(lineNum);
    setBreakpoints(vm.getBreakpoints());
  };

  // Auto-play timer effect
  useEffect(() => {
    if (autoPlay) {
      timerRef.current = setInterval(() => {
        if (!vm.canStepForward() || vm.getStatus() === 'halted' || vm.getStatus() === 'error') {
          setAutoPlay(false);
          syncState();
          return;
        }

        const ok = vm.stepForward();
        syncState();

        if (!ok || vm.getBreakpoints().includes(vm.getPC())) {
          setAutoPlay(false);
        }
      }, execSpeedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, execSpeedMs, vm]);

  const canStepBack = vm.canStepBackward();
  const canStepFwd = vm.canStepForward();

  return (
    <div className="vm-workspace">
      {/* Top Header */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <div className="viewer-title">
            <Cpu size={18} className="text-purple" />
            <h2>TAC Virtual Machine & Runtime Debugger</h2>
          </div>
          <div className="viewer-badges">
            <span className={`badge ${status === 'running' ? 'badge-cyan' : status === 'halted' ? 'badge-emerald' : status === 'error' ? 'badge-rose' : 'badge-purple'}`}>
              <Activity size={12} /> Status: {status.toUpperCase()}
            </span>
            <span className="badge badge-cyan font-mono">
              PC: #{pc}
            </span>
            <span className="badge badge-amber font-mono">
              Cycle: {stepCount}
            </span>
            {breakpoints.length > 0 && (
              <span className="badge badge-rose">
                <CircleDot size={12} /> {breakpoints.length} Breakpoint(s)
              </span>
            )}
          </div>
        </div>
        <p className="viewer-description">
          In-browser register and memory execution engine for Three-Address Code. Step forward, rewind past states using time-travel snapshots, and set breakpoints.
        </p>

        {/* Debugger Control Toolbar */}
        <div className="vm-controls-bar mt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {autoPlay ? (
              <button onClick={() => setAutoPlay(false)} className="btn btn-warning btn-sm flex items-center gap-1">
                <Pause size={14} /> Pause
              </button>
            ) : (
              <button
                onClick={() => setAutoPlay(true)}
                disabled={!canStepFwd}
                className="btn btn-primary btn-sm flex items-center gap-1"
              >
                <Play size={14} /> Run / Continue
              </button>
            )}

            <button
              onClick={handleStepBackward}
              disabled={!canStepBack}
              className="btn btn-secondary btn-sm flex items-center gap-1"
              title="Time-Travel: Step Backward 1 Instruction"
            >
              <SkipBack size={14} /> Step Back
            </button>

            <button
              onClick={handleStepForward}
              disabled={!canStepFwd}
              className="btn btn-secondary btn-sm flex items-center gap-1"
              title="Execute Next Instruction"
            >
              <SkipForward size={14} /> Step Next
            </button>

            <button
              onClick={handleReset}
              className="btn btn-secondary btn-sm flex items-center gap-1"
              title="Reset Virtual Machine"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Speed:</span>
            <button
              className={`speed-btn ${execSpeedMs === 800 ? 'active' : ''}`}
              onClick={() => setExecSpeedMs(800)}
            >
              0.5x
            </button>
            <button
              className={`speed-btn ${execSpeedMs === 400 ? 'active' : ''}`}
              onClick={() => setExecSpeedMs(400)}
            >
              1x
            </button>
            <button
              className={`speed-btn ${execSpeedMs === 150 ? 'active' : ''}`}
              onClick={() => setExecSpeedMs(150)}
            >
              3x
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert (if any) */}
      {status === 'error' && vm.getErrorMessage() && (
        <div className="error-banner mb-4">
          <AlertCircle size={16} className="text-rose" />
          <span>Runtime Fault: {vm.getErrorMessage()}</span>
        </div>
      )}

      {/* Debugger Workspace 2-Column Grid */}
      <div className="vm-grid">
        {/* Left Column: TAC Instruction Stepper Listing */}
        <div className="card-panel vm-code-panel">
          <div className="card-title mb-2">
            <Terminal size={14} className="text-cyan" />
            <span>TAC Instruction Stream (Click line number to toggle Breakpoint)</span>
          </div>

          <div className="vm-instruction-stream font-mono text-xs">
            {instructions.map(instr => {
              const isCurrentPC = instr.index === pc;
              const hasBreakpoint = breakpoints.includes(instr.index);

              return (
                <div
                  key={instr.index}
                  className={`vm-instr-row ${isCurrentPC ? 'current-pc-row' : ''} ${hasBreakpoint ? 'breakpoint-row' : ''}`}
                >
                  {/* Breakpoint toggle gutter */}
                  <span
                    className={`bp-gutter ${hasBreakpoint ? 'bp-active' : ''}`}
                    onClick={() => handleToggleBreakpoint(instr.index)}
                    title={hasBreakpoint ? 'Remove Breakpoint' : 'Add Breakpoint'}
                  >
                    {hasBreakpoint ? '●' : '○'}
                  </span>

                  {/* PC Arrow Indicator */}
                  <span className="pc-arrow">
                    {isCurrentPC ? '▶' : ' '}
                  </span>

                  {/* Line Number */}
                  <span className="instr-index-col">{instr.index}.</span>

                  {/* Code */}
                  <span className="instr-code-col font-bold">
                    {instr.rawText}
                  </span>

                  {/* Comment */}
                  {instr.comment && (
                    <span className="instr-comment-col text-muted italic ml-auto truncate">
                      // {instr.comment}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Variable Watch & Execution Log */}
        <div className="vm-side-column">
          {/* Live Variable & Register Watch Table */}
          <div className="card-panel variable-watch-panel mb-4">
            <div className="card-title mb-2">
              <Eye size={14} className="text-emerald" />
              <span>Live Variable & Register Watch ({Object.keys(memory).length})</span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Identifier</th>
                    <th>Kind</th>
                    <th>Current Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(memory).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted text-xs">
                        No variables allocated yet. Step forward to initialize memory.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(memory).map(([varName, val]) => {
                      const isTemp = /^t\d+$/.test(varName);
                      return (
                        <tr key={varName} className="font-mono">
                          <td>
                            <strong className={isTemp ? 'text-purple' : 'text-cyan'}>
                              {varName}
                            </strong>
                          </td>
                          <td>
                            <span className="text-2xs text-muted">
                              {isTemp ? 'Temporary' : 'Variable'}
                            </span>
                          </td>
                          <td>
                            <span className="font-bold text-light bg-subtle px-2 py-0.5 rounded">
                              {val}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execution Log */}
          <div className="card-panel vm-log-panel">
            <div className="card-title mb-2">
              <Terminal size={14} className="text-amber" />
              <span>Step Execution Event Log ({log.length})</span>
            </div>

            <div className="vm-log-box font-mono text-2xs">
              {log.length === 0 ? (
                <div className="text-muted p-2">Ready for execution.</div>
              ) : (
                log.slice().reverse().map(entry => (
                  <div key={entry.step} className="vm-log-line">
                    <span className="text-muted mr-1">[{entry.step}]</span>
                    <span className="text-cyan mr-1">#{entry.pc}:</span>
                    <span className="text-light mr-2 font-bold">{entry.instructionText}</span>
                    <span className="text-emerald">↳ {entry.effect}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
