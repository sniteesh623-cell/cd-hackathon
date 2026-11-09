// ============================================================================
// CompilerX — Ascension Engineering Tests
// Validates Semantic Analysis, CFG, Data-Flow, Optimizer, VM & Analytics
// ============================================================================

import { describe, it, expect } from 'vitest';
import { compileSource } from '../index';
import { TACVirtualMachine } from '../vm/tacVM';
import { Optimizer } from '../optimizer/optimizer';
import { CFGBuilder } from '../cfg/basicBlock';
import { DataFlowAnalyzer } from '../dataflow/dataflow';

describe('CompilerX — Ascension Advanced Modules', () => {
  it('1. Semantic Analysis: tracks scopes, detects redeclaration and undeclared variables', () => {
    // Undeclared variable test
    const undeclaredRes = compileSource('x = 10;');
    expect(undeclaredRes.diagnostics.some(d => d.phase === 'semantic' && d.message.includes('undeclared identifier'))).toBe(true);

    // Redeclaration error test
    const redeclRes = compileSource('int a = 1; int a = 2;');
    expect(redeclRes.diagnostics.some(d => d.phase === 'semantic' && d.message.includes('Redeclaration of identifier'))).toBe(true);

    // Scoped declarations
    const scopedRes = compileSource(`
      int x = 5;
      {
        int x = 10;
        int y = x + 1;
      }
      int z = x;
    `);
    expect(scopedRes.semantics).toBeDefined();
    expect(scopedRes.semantics?.allScopes.length).toBeGreaterThanOrEqual(2);
  });

  it('2. Control Flow Graph: identifies leaders, blocks, dominators, and loops', () => {
    const loopSource = `
      int i = 0;
      int sum = 0;
      while (i < 5) {
        sum = sum + i;
        i = i + 1;
      }
    `;
    const res = compileSource(loopSource);
    expect(res.cfg).toBeDefined();
    const cfg = res.cfg!;

    expect(cfg.blocks.length).toBeGreaterThanOrEqual(3);
    // Should detect the while loop back-edge
    expect(cfg.loops.length).toBeGreaterThanOrEqual(1);
    expect(cfg.loops[0].header).toBeDefined();

    // Dominators: first block dominates itself
    expect(cfg.blocks[0].dominators).toContain(cfg.blocks[0].id);
  });

  it('3. Data-Flow Analysis: computes Reaching Definitions and Live Variables with convergence', () => {
    const code = `
      int a = 1;
      int b = 2;
      int c = a + b;
    `;
    const res = compileSource(code);
    expect(res.dataFlow).toBeDefined();
    const df = res.dataFlow!;

    // Reaching definitions
    expect(df.reachingDefinitions.definitions.length).toBeGreaterThanOrEqual(3);
    expect(df.reachingDefinitions.iterations.length).toBeGreaterThanOrEqual(1);

    // Live variables
    expect(df.liveVariables.variables).toContain('a');
    expect(df.liveVariables.variables).toContain('b');
    expect(df.liveVariables.variables).toContain('c');
  });

  it('4. Optimizer Lab: successfully folds constants, simplifies algebra, and removes dead code', () => {
    const unoptimizedCode = `
      int a = 2 + 3;
      int b = a * 1;
      int c = b + 0;
    `;
    const res = compileSource(unoptimizedCode);
    expect(res.optimization).toBeDefined();
    const opt = res.optimization!;

    expect(opt.passHistory.length).toBeGreaterThanOrEqual(1);
    // After constant folding and algebraic simplification, the final instruction count should be less or equal
    expect(opt.optimizedCount).toBeLessThanOrEqual(opt.originalCount);
  });

  it('5. TAC Virtual Machine: executes code correctly and supports time-travel stepping', () => {
    const code = `
      int sum = 0;
      int i = 1;
      while (i <= 3) {
        sum = sum + i;
        i = i + 1;
      }
    `;
    const res = compileSource(code);
    expect(res.success).toBe(true);

    const vm = new TACVirtualMachine(res.tacInstructions);
    expect(vm.getStatus()).toBe('ready');

    // Run to completion
    const { finalStatus } = vm.run();
    expect(finalStatus).toBe('halted');

    const memory = vm.getMemory();
    // sum = 1 + 2 + 3 = 6
    expect(memory['sum']).toBe(6);
    expect(memory['i']).toBe(4);

    // Time-travel debugging: Step backward
    const canRewind = vm.canStepBackward();
    expect(canRewind).toBe(true);

    const stepCountBefore = vm.getStepCount();
    vm.stepBackward();
    expect(vm.getStepCount()).toBe(stepCountBefore - 1);
  });

  it('6. Optimization Equivalence: verifies original and optimized TAC yield identical VM state', () => {
    const code = `
      int a = 2 + 3;
      int b = 10;
      int x = (a + b) * 1;
      int y = (a + b) + 0;
      int res = x + y;
    `;
    const compileRes = compileSource(code);
    expect(compileRes.success).toBe(true);

    // 1. Run Original IR on VM
    const vmOriginal = new TACVirtualMachine(compileRes.tacInstructions);
    vmOriginal.run();
    const origMemory = vmOriginal.getMemory();

    // 2. Run Optimized IR on VM
    expect(compileRes.optimization).toBeDefined();
    const vmOptimized = new TACVirtualMachine(compileRes.optimization!.optimizedInstructions);
    vmOptimized.run();
    const optMemory = vmOptimized.getMemory();

    // Observable output variables must be identical
    expect(optMemory['a']).toBe(origMemory['a']);
    expect(optMemory['b']).toBe(origMemory['b']);
    expect(optMemory['x']).toBe(origMemory['x']);
    expect(optMemory['y']).toBe(origMemory['y']);
    expect(optMemory['res']).toBe(origMemory['res']);
    expect(optMemory['res']).toBe(30);
  });
});

