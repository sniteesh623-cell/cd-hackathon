// ============================================================================
// CompilerX — Data-Flow Analysis Engine
// Implements Reaching Definitions, Live Variables, and Available Expressions
// with step-by-step fixed-point iteration history for interactive inspection.
// ============================================================================

import { BasicBlock, ControlFlowGraph } from '../cfg/basicBlock';
import { TACInstruction } from '../types';

export interface Definition {
  id: string;             // e.g. "d1", "d2"
  variable: string;
  instrIndex: number;
  instructionText: string;
  blockId: string;
}

export interface IterationSnapshot {
  iteration: number;
  blockStates: {
    blockId: string;
    inSet: string[];
    outSet: string[];
  }[];
  converged: boolean;
}

export interface BlockDataFlow<T> {
  blockId: string;
  gen: T[];
  kill: T[];
  inSet: T[];
  outSet: T[];
}

export interface ReachingDefsResult {
  definitions: Definition[];
  blockDataFlow: BlockDataFlow<string>[]; // uses definition IDs (e.g. "d1")
  iterations: IterationSnapshot[];
  totalIterations: number;
}

export interface LiveVariablesResult {
  variables: string[];
  blockDataFlow: BlockDataFlow<string>[]; // uses variable names (e.g. "x", "t1")
  iterations: IterationSnapshot[];
  totalIterations: number;
}

export interface DataFlowAnalysisResult {
  reachingDefinitions: ReachingDefsResult;
  liveVariables: LiveVariablesResult;
}

export class DataFlowAnalyzer {
  public static analyze(cfg: ControlFlowGraph, allInstructions: TACInstruction[]): DataFlowAnalysisResult {
    const reachingDefs = this.computeReachingDefinitions(cfg, allInstructions);
    const liveVars = this.computeLiveVariables(cfg);

    return {
      reachingDefinitions: reachingDefs,
      liveVariables: liveVars,
    };
  }

  // --------------------------------------------------------------------------
  // 1. Reaching Definitions Analysis (Forward, Union)
  // --------------------------------------------------------------------------
  private static computeReachingDefinitions(
    cfg: ControlFlowGraph,
    allInstructions: TACInstruction[]
  ): ReachingDefsResult {
    // 1. Collect all definitions: instructions that define a variable or temporary
    const defs: Definition[] = [];
    let defCounter = 0;

    allInstructions.forEach(instr => {
      // Definitions occur on =, +, -, *, /, uminus, decl
      const targetVar = instr.result;
      if (targetVar && instr.op !== 'label' && instr.op !== 'if_goto' && instr.op !== 'goto') {
        const block = cfg.blocks.find(b => b.instructions.some(i => i.index === instr.index));
        defs.push({
          id: `d${++defCounter}`,
          variable: targetVar,
          instrIndex: instr.index,
          instructionText: instr.rawText,
          blockId: block ? block.id : 'unknown',
        });
      }
    });

    // 2. Compute GEN and KILL sets for each block
    const blockGen = new Map<string, Set<string>>();
    const blockKill = new Map<string, Set<string>>();

    cfg.blocks.forEach(block => {
      const genSet = new Set<string>();
      const killSet = new Set<string>();

      // Within the block, earlier defs of the same variable are killed by later defs
      const blockDefs = defs.filter(d => d.blockId === block.id);
      const varToLastDef = new Map<string, string>();

      blockDefs.forEach(d => {
        varToLastDef.set(d.variable, d.id);
      });

      varToLastDef.forEach((defId, variable) => {
        genSet.add(defId);
        // Kill all OTHER definitions of this variable across the entire program
        defs.forEach(d => {
          if (d.variable === variable && d.id !== defId) {
            killSet.add(d.id);
          }
        });
      });

      blockGen.set(block.id, genSet);
      blockKill.set(block.id, killSet);
    });

    // 3. Fixed-Point Iteration (Forward analysis)
    // IN[B] = Union of OUT[P] for all P in Predecessors(B)
    // OUT[B] = GEN[B] Union (IN[B] \ KILL[B])
    const inMap = new Map<string, Set<string>>();
    const outMap = new Map<string, Set<string>>();

    cfg.blocks.forEach(b => {
      inMap.set(b.id, new Set());
      outMap.set(b.id, new Set(blockGen.get(b.id) || []));
    });

    const iterations: IterationSnapshot[] = [];
    let iteration = 0;
    let changed = true;

    // Record initial state
    iterations.push({
      iteration: 0,
      blockStates: cfg.blocks.map(b => ({
        blockId: b.id,
        inSet: Array.from(inMap.get(b.id) || []).sort(),
        outSet: Array.from(outMap.get(b.id) || []).sort(),
      })),
      converged: false,
    });

    while (changed && iteration < 30) {
      iteration++;
      changed = false;

      for (const block of cfg.blocks) {
        // IN[B] = Union_{P in Preds} OUT[P]
        const newIn = new Set<string>();
        for (const predId of block.predecessors) {
          const predOut = outMap.get(predId) || new Set();
          predOut.forEach(d => newIn.add(d));
        }

        // OUT[B] = GEN[B] Union (IN[B] \ KILL[B])
        const gen = blockGen.get(block.id) || new Set();
        const kill = blockKill.get(block.id) || new Set();
        const newOut = new Set<string>(gen);

        newIn.forEach(d => {
          if (!kill.has(d)) {
            newOut.add(d);
          }
        });

        const oldIn = inMap.get(block.id)!;
        const oldOut = outMap.get(block.id)!;

        if (newIn.size !== oldIn.size || Array.from(newIn).some(x => !oldIn.has(x)) ||
            newOut.size !== oldOut.size || Array.from(newOut).some(x => !oldOut.has(x))) {
          changed = true;
          inMap.set(block.id, newIn);
          outMap.set(block.id, newOut);
        }
      }

      iterations.push({
        iteration,
        blockStates: cfg.blocks.map(b => ({
          blockId: b.id,
          inSet: Array.from(inMap.get(b.id) || []).sort(),
          outSet: Array.from(outMap.get(b.id) || []).sort(),
        })),
        converged: !changed,
      });
    }

    const blockDataFlow: BlockDataFlow<string>[] = cfg.blocks.map(b => ({
      blockId: b.id,
      gen: Array.from(blockGen.get(b.id) || []).sort(),
      kill: Array.from(blockKill.get(b.id) || []).sort(),
      inSet: Array.from(inMap.get(b.id) || []).sort(),
      outSet: Array.from(outMap.get(b.id) || []).sort(),
    }));

    return {
      definitions: defs,
      blockDataFlow,
      iterations,
      totalIterations: iterations.length - 1,
    };
  }

  // --------------------------------------------------------------------------
  // 2. Live Variables Analysis (Backward, Union)
  // --------------------------------------------------------------------------
  private static computeLiveVariables(cfg: ControlFlowGraph): LiveVariablesResult {
    // 1. Collect all variable names (excluding pure numbers)
    const allVars = new Set<string>();
    const isVar = (s?: string) => s && !/^-?\d+(\.\d+)?$/.test(s) && !s.startsWith('L');

    cfg.blocks.forEach(b => {
      b.instructions.forEach(i => {
        if (isVar(i.arg1)) allVars.add(i.arg1!);
        if (isVar(i.arg2)) allVars.add(i.arg2!);
        if (isVar(i.result)) allVars.add(i.result!);
      });
    });

    // 2. Compute DEF and USE sets per block
    // USE[B]: variables read before any write in B
    // DEF[B]: variables written before any read in B
    const blockUse = new Map<string, Set<string>>();
    const blockDef = new Map<string, Set<string>>();

    cfg.blocks.forEach(b => {
      const useSet = new Set<string>();
      const defSet = new Set<string>();

      b.instructions.forEach(instr => {
        // Read operands: arg1 and arg2
        const reads = [instr.arg1, instr.arg2].filter(isVar) as string[];
        reads.forEach(r => {
          if (!defSet.has(r)) {
            useSet.add(r);
          }
        });

        // Written operand: result
        if (isVar(instr.result) && instr.op !== 'label' && instr.op !== 'if_goto') {
          if (!useSet.has(instr.result!)) {
            defSet.add(instr.result!);
          }
        }
      });

      blockUse.set(b.id, useSet);
      blockDef.set(b.id, defSet);
    });

    // 3. Backward Fixed-Point Iteration
    // OUT[B] = Union of IN[S] for all S in Successors(B)
    // IN[B] = USE[B] Union (OUT[B] \ DEF[B])
    const inMap = new Map<string, Set<string>>();
    const outMap = new Map<string, Set<string>>();

    cfg.blocks.forEach(b => {
      inMap.set(b.id, new Set(blockUse.get(b.id) || []));
      outMap.set(b.id, new Set());
    });

    const iterations: IterationSnapshot[] = [];
    let iteration = 0;
    let changed = true;

    iterations.push({
      iteration: 0,
      blockStates: cfg.blocks.map(b => ({
        blockId: b.id,
        inSet: Array.from(inMap.get(b.id) || []).sort(),
        outSet: Array.from(outMap.get(b.id) || []).sort(),
      })),
      converged: false,
    });

    while (changed && iteration < 30) {
      iteration++;
      changed = false;

      // Iterate backwards through blocks
      for (let i = cfg.blocks.length - 1; i >= 0; i--) {
        const block = cfg.blocks[i];

        // OUT[B] = Union_{S in Succs} IN[S]
        const newOut = new Set<string>();
        for (const succId of block.successors) {
          const succIn = inMap.get(succId) || new Set();
          succIn.forEach(v => newOut.add(v));
        }

        // IN[B] = USE[B] Union (OUT[B] \ DEF[B])
        const use = blockUse.get(block.id) || new Set();
        const def = blockDef.get(block.id) || new Set();
        const newIn = new Set<string>(use);

        newOut.forEach(v => {
          if (!def.has(v)) {
            newIn.add(v);
          }
        });

        const oldIn = inMap.get(block.id)!;
        const oldOut = outMap.get(block.id)!;

        if (newIn.size !== oldIn.size || Array.from(newIn).some(x => !oldIn.has(x)) ||
            newOut.size !== oldOut.size || Array.from(newOut).some(x => !oldOut.has(x))) {
          changed = true;
          inMap.set(block.id, newIn);
          outMap.set(block.id, newOut);
        }
      }

      iterations.push({
        iteration,
        blockStates: cfg.blocks.map(b => ({
          blockId: b.id,
          inSet: Array.from(inMap.get(b.id) || []).sort(),
          outSet: Array.from(outMap.get(b.id) || []).sort(),
        })),
        converged: !changed,
      });
    }

    const blockDataFlow: BlockDataFlow<string>[] = cfg.blocks.map(b => ({
      blockId: b.id,
      gen: Array.from(blockUse.get(b.id) || []).sort(), // for live vars, gen is use
      kill: Array.from(blockDef.get(b.id) || []).sort(), // kill is def
      inSet: Array.from(inMap.get(b.id) || []).sort(),
      outSet: Array.from(outMap.get(b.id) || []).sort(),
    }));

    return {
      variables: Array.from(allVars).sort(),
      blockDataFlow,
      iterations,
      totalIterations: iterations.length - 1,
    };
  }
}
