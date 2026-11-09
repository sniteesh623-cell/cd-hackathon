// ============================================================================
// CompilerX — Optimization Lab & Modular Pass Manager
// Implements Constant Folding, Constant Propagation, Copy Propagation,
// Common Subexpression Elimination, Dead Code Elimination & Algebraic Simplification.
// ============================================================================

import { TACInstruction, TACOp } from '../types';

export interface PassRecord {
  passName: string;
  description: string;
  changesMade: number;
  beforeInstructions: TACInstruction[];
  afterInstructions: TACInstruction[];
}

export interface OptimizationResult {
  originalInstructions: TACInstruction[];
  optimizedInstructions: TACInstruction[];
  passHistory: PassRecord[];
  totalChanges: number;
  reductionPercentage: number;
  originalCount: number;
  optimizedCount: number;
  temporariesSaved: number;
}

export interface OptimizationConfig {
  constantFolding: boolean;
  constantPropagation: boolean;
  copyPropagation: boolean;
  commonSubexpressionElimination: boolean;
  deadCodeElimination: boolean;
  algebraicSimplification: boolean;
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  constantFolding: true,
  constantPropagation: true,
  copyPropagation: true,
  commonSubexpressionElimination: true,
  deadCodeElimination: true,
  algebraicSimplification: true,
};

export class Optimizer {
  // Helper to deep copy TAC instructions
  private static cloneInstructions(instrs: TACInstruction[]): TACInstruction[] {
    return instrs.map(i => ({ ...i }));
  }

  // Renumber instruction indices sequentially
  private static renumber(instrs: TACInstruction[]): TACInstruction[] {
    return instrs.map((instr, idx) => ({
      ...instr,
      index: idx + 1,
    }));
  }

  // Format instruction text from parts
  private static format(instr: TACInstruction): string {
    switch (instr.op) {
      case 'label':
        return `${instr.target}:`;
      case '=':
        return `${instr.result} = ${instr.arg1}`;
      case 'decl':
        return instr.arg1 ? `${instr.result} = ${instr.arg1}` : `decl ${instr.result}`;
      case '+':
      case '-':
      case '*':
      case '/':
        return `${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
      case 'uminus':
        return `${instr.result} = -${instr.arg1}`;
      case 'if_goto':
        return `if ${instr.arg1} ${instr.relop || '=='} ${instr.arg2} goto ${instr.target || '_'}`;
      case 'if_true_goto':
        return `if ${instr.arg1} goto ${instr.target || '_'}`;
      case 'if_false_goto':
        return `if !${instr.arg1} goto ${instr.target || '_'}`;
      case 'goto':
        return `goto ${instr.target || '_'}`;
      case 'nop':
        return `nop`;
    }
  }

  // --------------------------------------------------------------------------
  // Pass 1: Constant Folding
  // E.g. t1 = 3 + 5  =>  t1 = 8
  // --------------------------------------------------------------------------
  public static passConstantFolding(instructions: TACInstruction[]): { instructions: TACInstruction[]; changes: number } {
    let changes = 0;
    const output = this.cloneInstructions(instructions);

    for (let i = 0; i < output.length; i++) {
      const instr = output[i];
      if (['+', '-', '*', '/'].includes(instr.op) && instr.arg1 && instr.arg2 && instr.result) {
        const isNum1 = /^-?\d+(\.\d+)?$/.test(instr.arg1);
        const isNum2 = /^-?\d+(\.\d+)?$/.test(instr.arg2);

        if (isNum1 && isNum2) {
          const v1 = parseFloat(instr.arg1);
          const v2 = parseFloat(instr.arg2);
          let folded: number | null = null;

          if (instr.op === '+') folded = v1 + v2;
          else if (instr.op === '-') folded = v1 - v2;
          else if (instr.op === '*') folded = v1 * v2;
          else if (instr.op === '/' && v2 !== 0) folded = v1 / v2;

          if (folded !== null) {
            const foldedStr = Number.isInteger(folded) ? String(folded) : folded.toFixed(4).replace(/\.?0+$/, '');
            output[i] = {
              ...instr,
              op: '=',
              arg1: foldedStr,
              arg2: undefined,
              comment: `Folded: ${instr.arg1} ${instr.op} ${instr.arg2} -> ${foldedStr}`,
            };
            output[i].rawText = this.format(output[i]);
            changes++;
          }
        }
      } else if (instr.op === 'uminus' && instr.arg1 && /^-?\d+(\.\d+)?$/.test(instr.arg1) && instr.result) {
        const val = -parseFloat(instr.arg1);
        const valStr = Number.isInteger(val) ? String(val) : String(val);
        output[i] = {
          ...instr,
          op: '=',
          arg1: valStr,
          comment: `Folded: -${instr.arg1} -> ${valStr}`,
        };
        output[i].rawText = this.format(output[i]);
        changes++;
      }
    }

    return { instructions: output, changes };
  }

  // --------------------------------------------------------------------------
  // Pass 2: Algebraic Simplification & Strength Reduction
  // E.g. x + 0 -> x, x * 1 -> x, x * 0 -> 0, x - 0 -> x
  // --------------------------------------------------------------------------
  public static passAlgebraicSimplification(instructions: TACInstruction[]): { instructions: TACInstruction[]; changes: number } {
    let changes = 0;
    const output = this.cloneInstructions(instructions);

    for (let i = 0; i < output.length; i++) {
      const instr = output[i];
      if (!instr.arg1 || !instr.arg2 || !instr.result) continue;

      // x + 0 or 0 + x => x
      if (instr.op === '+') {
        if (instr.arg2 === '0') {
          output[i] = { ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: 'Algebraic: x + 0 -> x' };
          output[i].rawText = this.format(output[i]);
          changes++;
        } else if (instr.arg1 === '0') {
          output[i] = { ...instr, op: '=', arg1: instr.arg2, arg2: undefined, comment: 'Algebraic: 0 + x -> x' };
          output[i].rawText = this.format(output[i]);
          changes++;
        }
      }
      // x - 0 => x
      else if (instr.op === '-' && instr.arg2 === '0') {
        output[i] = { ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: 'Algebraic: x - 0 -> x' };
        output[i].rawText = this.format(output[i]);
        changes++;
      }
      // x * 1 or 1 * x => x
      else if (instr.op === '*') {
        if (instr.arg2 === '1') {
          output[i] = { ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: 'Algebraic: x * 1 -> x' };
          output[i].rawText = this.format(output[i]);
          changes++;
        } else if (instr.arg1 === '1') {
          output[i] = { ...instr, op: '=', arg1: instr.arg2, arg2: undefined, comment: 'Algebraic: 1 * x -> x' };
          output[i].rawText = this.format(output[i]);
          changes++;
        } else if (instr.arg1 === '0' || instr.arg2 === '0') {
          output[i] = { ...instr, op: '=', arg1: '0', arg2: undefined, comment: 'Algebraic: x * 0 -> 0' };
          output[i].rawText = this.format(output[i]);
          changes++;
        }
      }
      // x / 1 => x
      else if (instr.op === '/' && instr.arg2 === '1') {
        output[i] = { ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: 'Algebraic: x / 1 -> x' };
        output[i].rawText = this.format(output[i]);
        changes++;
      }
    }

    return { instructions: output, changes };
  }

  // --------------------------------------------------------------------------
  // Pass 3: Constant Propagation (Local within straight-line segments)
  // E.g. x = 5; y = x + 2  =>  x = 5; y = 5 + 2
  // --------------------------------------------------------------------------
  public static passConstantPropagation(instructions: TACInstruction[]): { instructions: TACInstruction[]; changes: number } {
    let changes = 0;
    const output = this.cloneInstructions(instructions);
    const constMap = new Map<string, string>(); // varName -> literalString

    for (let i = 0; i < output.length; i++) {
      const instr = output[i];

      // Jump or label resets local constant knowledge across control flow boundaries
      if (['label', 'goto', 'if_goto', 'if_true_goto', 'if_false_goto'].includes(instr.op)) {
        constMap.clear();
        continue;
      }

      // Propagate into arg1
      if (instr.arg1 && constMap.has(instr.arg1)) {
        const cVal = constMap.get(instr.arg1)!;
        instr.arg1 = cVal;
        instr.rawText = this.format(instr);
        changes++;
      }

      // Propagate into arg2
      if (instr.arg2 && constMap.has(instr.arg2)) {
        const cVal = constMap.get(instr.arg2)!;
        instr.arg2 = cVal;
        instr.rawText = this.format(instr);
        changes++;
      }

      // If instruction assigns a constant literal: record it
      if ((instr.op === '=' || instr.op === 'decl') && instr.result && instr.arg1) {
        if (/^-?\d+(\.\d+)?$/.test(instr.arg1)) {
          constMap.set(instr.result, instr.arg1);
        } else {
          constMap.delete(instr.result);
        }
      } else if (instr.result) {
        // Any other assignment invalidates previous constant for this result
        constMap.delete(instr.result);
      }
    }

    return { instructions: output, changes };
  }

  // --------------------------------------------------------------------------
  // Pass 4: Copy Propagation
  // E.g. t1 = y; z = t1 + 1 => z = y + 1 (when safe)
  // --------------------------------------------------------------------------
  public static passCopyPropagation(instructions: TACInstruction[]): { instructions: TACInstruction[]; changes: number } {
    let changes = 0;
    const output = this.cloneInstructions(instructions);
    const copyMap = new Map<string, string>(); // dest -> src

    for (let i = 0; i < output.length; i++) {
      const instr = output[i];

      if (['label', 'goto', 'if_goto', 'if_true_goto', 'if_false_goto'].includes(instr.op)) {
        copyMap.clear();
        continue;
      }

      // Replace arg1 if mapped
      if (instr.arg1 && copyMap.has(instr.arg1)) {
        instr.arg1 = copyMap.get(instr.arg1)!;
        instr.rawText = this.format(instr);
        changes++;
      }

      // Replace arg2 if mapped
      if (instr.arg2 && copyMap.has(instr.arg2)) {
        instr.arg2 = copyMap.get(instr.arg2)!;
        instr.rawText = this.format(instr);
        changes++;
      }

      // If instruction is simple copy assignment: result = arg1 (where arg1 is variable or temporary)
      if (instr.op === '=' && instr.result && instr.arg1 && !/^-?\d+(\.\d+)?$/.test(instr.arg1)) {
        copyMap.set(instr.result, instr.arg1);
      } else if (instr.result) {
        copyMap.delete(instr.result);
        // Also remove any mappings where the source was modified!
        for (const [dest, src] of Array.from(copyMap.entries())) {
          if (src === instr.result) {
            copyMap.delete(dest);
          }
        }
      }
    }

    return { instructions: output, changes };
  }

  // --------------------------------------------------------------------------
  // Pass 5: Common Subexpression Elimination (CSE - Local / Value Numbering)
  // E.g. t1 = a + b; ... t2 = a + b => t2 = t1 (if a and b untouched)
  // --------------------------------------------------------------------------
  public static passCommonSubexpressionElimination(instructions: TACInstruction[]): { instructions: TACInstruction[]; changes: number } {
    let changes = 0;
    const output = this.cloneInstructions(instructions);
    // Expr key (e.g. "a + b") -> temporary name (e.g. "t1")
    const exprMap = new Map<string, string>();

    for (let i = 0; i < output.length; i++) {
      const instr = output[i];

      if (['label', 'goto', 'if_goto', 'if_true_goto', 'if_false_goto'].includes(instr.op)) {
        exprMap.clear();
        continue;
      }

      if (['+', '-', '*', '/'].includes(instr.op) && instr.arg1 && instr.arg2 && instr.result) {
        // Commutative operators (+ and *) can normalize operands
        let key = `${instr.arg1} ${instr.op} ${instr.arg2}`;
        if (['+', '*'].includes(instr.op) && instr.arg1 > instr.arg2) {
          key = `${instr.arg2} ${instr.op} ${instr.arg1}`;
        }

        if (exprMap.has(key)) {
          const existingTemp = exprMap.get(key)!;
          output[i] = {
            ...instr,
            op: '=',
            arg1: existingTemp,
            arg2: undefined,
            comment: `CSE: replaced redundant computation with ${existingTemp}`,
          };
          output[i].rawText = this.format(output[i]);
          changes++;
        } else {
          exprMap.set(key, instr.result);
        }
      }

      // If any operand was modified, remove expressions containing it
      if (instr.result) {
        for (const [key] of Array.from(exprMap.entries())) {
          if (key.includes(instr.result)) {
            exprMap.delete(key);
          }
        }
      }
    }

    return { instructions: output, changes };
  }

  // --------------------------------------------------------------------------
  // Pass 6: Dead Code Elimination (DCE)
  // Removes assignments to compiler temporaries (t1, t2) that are never subsequently read
  // --------------------------------------------------------------------------
  public static passDeadCodeElimination(instructions: TACInstruction[]): { instructions: TACInstruction[]; changes: number } {
    let changes = 0;
    let current = this.cloneInstructions(instructions);
    let passChanged = true;

    while (passChanged) {
      passChanged = false;
      // 1. Gather all reads of variables/temporaries
      const readSet = new Set<string>();
      current.forEach(instr => {
        if (instr.arg1 && !/^-?\d+(\.\d+)?$/.test(instr.arg1)) readSet.add(instr.arg1);
        if (instr.arg2 && !/^-?\d+(\.\d+)?$/.test(instr.arg2)) readSet.add(instr.arg2);
      });

      // 2. Filter out assignments to temporaries that are never read
      const nextInstrs: TACInstruction[] = [];
      for (const instr of current) {
        const isTempAssignment = instr.result && /^t\d+$/.test(instr.result) && instr.op !== 'label' && instr.op !== 'if_goto';
        if (isTempAssignment && !readSet.has(instr.result!)) {
          // Dead temporary assignment!
          changes++;
          passChanged = true;
          // Omit instruction
          continue;
        }
        nextInstrs.push(instr);
      }
      current = nextInstrs;
    }

    return { instructions: current, changes };
  }

  // --------------------------------------------------------------------------
  // Optimization Pipeline Runner
  // --------------------------------------------------------------------------
  public static optimize(
    instructions: TACInstruction[],
    config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
  ): OptimizationResult {
    const originalCount = instructions.length;
    let current = this.cloneInstructions(instructions);
    const passHistory: PassRecord[] = [];
    let totalChanges = 0;

    // Run passes iteratively until fixed-point (up to 5 rounds)
    for (let round = 1; round <= 4; round++) {
      let roundChanges = 0;

      // 1. Constant Propagation
      if (config.constantPropagation) {
        const before = this.cloneInstructions(current);
        const { instructions: next, changes } = this.passConstantPropagation(current);
        if (changes > 0) {
          current = next;
          roundChanges += changes;
          passHistory.push({
            passName: `Round ${round}: Constant Propagation`,
            description: `Propagated known constant values into variable and temporary uses (${changes} substitution(s))`,
            changesMade: changes,
            beforeInstructions: before,
            afterInstructions: this.cloneInstructions(current),
          });
        }
      }

      // 2. Algebraic Simplification
      if (config.algebraicSimplification) {
        const before = this.cloneInstructions(current);
        const { instructions: next, changes } = this.passAlgebraicSimplification(current);
        if (changes > 0) {
          current = next;
          roundChanges += changes;
          passHistory.push({
            passName: `Round ${round}: Algebraic Simplification`,
            description: `Applied identity laws (e.g. x + 0, x * 1, x * 0) to reduce computation (${changes} change(s))`,
            changesMade: changes,
            beforeInstructions: before,
            afterInstructions: this.cloneInstructions(current),
          });
        }
      }

      // 3. Constant Folding
      if (config.constantFolding) {
        const before = this.cloneInstructions(current);
        const { instructions: next, changes } = this.passConstantFolding(current);
        if (changes > 0) {
          current = next;
          roundChanges += changes;
          passHistory.push({
            passName: `Round ${round}: Constant Folding`,
            description: `Evaluated constant arithmetic expressions at compile-time (${changes} folded)`,
            changesMade: changes,
            beforeInstructions: before,
            afterInstructions: this.cloneInstructions(current),
          });
        }
      }

      // 4. Copy Propagation
      if (config.copyPropagation) {
        const before = this.cloneInstructions(current);
        const { instructions: next, changes } = this.passCopyPropagation(current);
        if (changes > 0) {
          current = next;
          roundChanges += changes;
          passHistory.push({
            passName: `Round ${round}: Copy Propagation`,
            description: `Propagated direct assignment copies across operand uses (${changes} substitution(s))`,
            changesMade: changes,
            beforeInstructions: before,
            afterInstructions: this.cloneInstructions(current),
          });
        }
      }

      // 5. Common Subexpression Elimination
      if (config.commonSubexpressionElimination) {
        const before = this.cloneInstructions(current);
        const { instructions: next, changes } = this.passCommonSubexpressionElimination(current);
        if (changes > 0) {
          current = next;
          roundChanges += changes;
          passHistory.push({
            passName: `Round ${round}: Common Subexpression Elimination`,
            description: `Eliminated redundant identical arithmetic operations within basic blocks (${changes} eliminated)`,
            changesMade: changes,
            beforeInstructions: before,
            afterInstructions: this.cloneInstructions(current),
          });
        }
      }

      // 6. Dead Code Elimination
      if (config.deadCodeElimination) {
        const before = this.cloneInstructions(current);
        const { instructions: next, changes } = this.passDeadCodeElimination(current);
        if (changes > 0) {
          current = next;
          roundChanges += changes;
          passHistory.push({
            passName: `Round ${round}: Dead Code Elimination`,
            description: `Pruned assignments to unused temporaries and dead expressions (${changes} removed)`,
            changesMade: changes,
            beforeInstructions: before,
            afterInstructions: this.cloneInstructions(current),
          });
        }
      }

      totalChanges += roundChanges;
      if (roundChanges === 0) break; // Reached fixed point
    }

    const renumbered = this.renumber(current);
    const optimizedCount = renumbered.length;
    const reduction = originalCount > 0 ? Math.round(((originalCount - optimizedCount) / originalCount) * 100) : 0;

    // Estimate temporaries saved
    const origTemps = new Set(instructions.map(i => i.result).filter(r => r && /^t\d+$/.test(r))).size;
    const optTemps = new Set(renumbered.map(i => i.result).filter(r => r && /^t\d+$/.test(r))).size;
    const temporariesSaved = Math.max(0, origTemps - optTemps);

    return {
      originalInstructions: instructions,
      optimizedInstructions: renumbered,
      passHistory,
      totalChanges,
      reductionPercentage: reduction,
      originalCount,
      optimizedCount,
      temporariesSaved,
    };
  }
}
