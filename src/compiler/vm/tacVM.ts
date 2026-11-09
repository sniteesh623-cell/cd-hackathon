// ============================================================================
// CompilerX — TAC Virtual Machine & Time-Travel Debugger Engine
// Executes Three-Address Code with full environment tracking, reversible snapshots,
// and breakpoint support.
// ============================================================================

import { TACInstruction } from '../types';

export type VMStatus = 'ready' | 'running' | 'paused' | 'halted' | 'error';

export interface VMLogEntry {
  step: number;
  pc: number;
  instructionText: string;
  effect: string;
}

export interface VMSnapshot {
  step: number;
  pc: number;
  memory: Record<string, number>;
  log: VMLogEntry[];
  status: VMStatus;
}

export class TACVirtualMachine {
  private instructions: TACInstruction[] = [];
  private labelToPC: Map<string, number> = new Map();
  private pc = 1;
  private memory: Map<string, number> = new Map();
  private history: VMSnapshot[] = [];
  private log: VMLogEntry[] = [];
  private status: VMStatus = 'ready';
  private stepCount = 0;
  private breakpoints: Set<number> = new Set();
  private maxSteps = 10000;
  private errorMessage: string | null = null;

  constructor(instructions: TACInstruction[] = []) {
    this.load(instructions);
  }

  public load(instructions: TACInstruction[]): void {
    this.instructions = instructions;
    this.labelToPC.clear();
    this.memory.clear();
    this.history = [];
    this.log = [];
    this.pc = 1;
    this.stepCount = 0;
    this.status = instructions.length > 0 ? 'ready' : 'halted';
    this.errorMessage = null;

    // Index all labels
    instructions.forEach(instr => {
      if (instr.op === 'label' && instr.target) {
        this.labelToPC.set(instr.target, instr.index);
      }
    });

    // Save initial snapshot
    this.saveSnapshot();
  }

  public getPC(): number {
    return this.pc;
  }

  public getStatus(): VMStatus {
    return this.status;
  }

  public getMemory(): Record<string, number> {
    const mem: Record<string, number> = {};
    this.memory.forEach((val, key) => {
      mem[key] = val;
    });
    return mem;
  }

  public getLog(): VMLogEntry[] {
    return [...this.log];
  }

  public getStepCount(): number {
    return this.stepCount;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getBreakpoints(): number[] {
    return Array.from(this.breakpoints).sort((a, b) => a - b);
  }

  public toggleBreakpoint(instrIndex: number): void {
    if (this.breakpoints.has(instrIndex)) {
      this.breakpoints.delete(instrIndex);
    } else {
      this.breakpoints.add(instrIndex);
    }
  }

  public clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  public canStepBackward(): boolean {
    return this.history.length > 1;
  }

  public canStepForward(): boolean {
    return this.status !== 'halted' && this.status !== 'error' && this.pc <= this.instructions.length;
  }

  private saveSnapshot(): void {
    const memCopy: Record<string, number> = {};
    this.memory.forEach((v, k) => {
      memCopy[k] = v;
    });

    this.history.push({
      step: this.stepCount,
      pc: this.pc,
      memory: memCopy,
      log: [...this.log],
      status: this.status,
    });
  }

  private evaluateOperand(opStr?: string): number {
    if (!opStr) return 0;
    const trimmed = opStr.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    return this.memory.get(trimmed) ?? 0;
  }

  // --------------------------------------------------------------------------
  // Step Forward (Single instruction execution)
  // --------------------------------------------------------------------------
  public stepForward(): boolean {
    if (!this.canStepForward()) return false;

    const instr = this.instructions.find(i => i.index === this.pc);
    if (!instr) {
      this.status = 'halted';
      return false;
    }

    this.stepCount++;
    const currentPC = this.pc;
    let nextPC = currentPC + 1;
    let effectDesc = '';

    try {
      switch (instr.op) {
        case 'decl': {
          const varName = instr.result!;
          const initVal = instr.arg1 ? this.evaluateOperand(instr.arg1) : 0;
          this.memory.set(varName, initVal);
          effectDesc = `Allocated ${varName} = ${initVal}`;
          break;
        }

        case '=': {
          const dest = instr.result!;
          const val = this.evaluateOperand(instr.arg1);
          this.memory.set(dest, val);
          effectDesc = `${dest} = ${val}`;
          break;
        }

        case '+':
        case '-':
        case '*':
        case '/': {
          const dest = instr.result!;
          const v1 = this.evaluateOperand(instr.arg1);
          const v2 = this.evaluateOperand(instr.arg2);
          let res = 0;
          if (instr.op === '+') res = v1 + v2;
          else if (instr.op === '-') res = v1 - v2;
          else if (instr.op === '*') res = v1 * v2;
          else if (instr.op === '/') {
            if (v2 === 0) throw new Error(`Division by zero in '${instr.rawText}'`);
            res = v1 / v2;
          }
          this.memory.set(dest, res);
          effectDesc = `${dest} = ${v1} ${instr.op} ${v2} => ${res}`;
          break;
        }

        case 'uminus': {
          const dest = instr.result!;
          const v1 = this.evaluateOperand(instr.arg1);
          const res = -v1;
          this.memory.set(dest, res);
          effectDesc = `${dest} = -${v1} => ${res}`;
          break;
        }

        case 'label': {
          effectDesc = `Passed label ${instr.target}`;
          break;
        }

        case 'goto': {
          const target = instr.target;
          if (!target || !this.labelToPC.has(target)) {
            throw new Error(`Unresolved jump target '${target}'`);
          }
          nextPC = this.labelToPC.get(target)!;
          effectDesc = `Jumped unconditionally to ${target} (line ${nextPC})`;
          break;
        }

        case 'if_goto': {
          const v1 = this.evaluateOperand(instr.arg1);
          const v2 = this.evaluateOperand(instr.arg2);
          const relop = instr.relop || '==';
          let conditionMet = false;

          switch (relop) {
            case '<': conditionMet = v1 < v2; break;
            case '<=': conditionMet = v1 <= v2; break;
            case '>': conditionMet = v1 > v2; break;
            case '>=': conditionMet = v1 >= v2; break;
            case '==': conditionMet = v1 === v2; break;
            case '!=': conditionMet = v1 !== v2; break;
          }

          if (conditionMet) {
            const target = instr.target;
            if (!target || !this.labelToPC.has(target)) {
              throw new Error(`Unresolved jump target '${target}'`);
            }
            nextPC = this.labelToPC.get(target)!;
            effectDesc = `Condition true (${v1} ${relop} ${v2}): branched to ${target} (line ${nextPC})`;
          } else {
            effectDesc = `Condition false (${v1} ${relop} ${v2}): fallthrough to line ${nextPC}`;
          }
          break;
        }

        case 'if_true_goto': {
          const v = this.evaluateOperand(instr.arg1);
          if (v !== 0) {
            const target = instr.target;
            if (!target || !this.labelToPC.has(target)) throw new Error(`Unresolved target '${target}'`);
            nextPC = this.labelToPC.get(target)!;
            effectDesc = `Condition true (${v} != 0): branched to ${target}`;
          } else {
            effectDesc = `Condition false: fallthrough`;
          }
          break;
        }

        case 'if_false_goto': {
          const v = this.evaluateOperand(instr.arg1);
          if (v === 0) {
            const target = instr.target;
            if (!target || !this.labelToPC.has(target)) throw new Error(`Unresolved target '${target}'`);
            nextPC = this.labelToPC.get(target)!;
            effectDesc = `Condition false (${v} == 0): branched to ${target}`;
          } else {
            effectDesc = `Condition true: fallthrough`;
          }
          break;
        }

        case 'nop': {
          effectDesc = 'No operation';
          break;
        }
      }

      this.log.push({
        step: this.stepCount,
        pc: currentPC,
        instructionText: instr.rawText,
        effect: effectDesc,
      });

      this.pc = nextPC;

      if (this.pc > this.instructions.length) {
        this.status = 'halted';
      }

      this.saveSnapshot();
      return true;
    } catch (err: unknown) {
      this.status = 'error';
      this.errorMessage = err instanceof Error ? err.message : String(err);
      this.log.push({
        step: this.stepCount,
        pc: currentPC,
        instructionText: instr.rawText,
        effect: `Runtime Error: ${this.errorMessage}`,
      });
      this.saveSnapshot();
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Step Backward (Time-Travel Debugging)
  // --------------------------------------------------------------------------
  public stepBackward(): boolean {
    if (!this.canStepBackward()) return false;

    // Pop the current snapshot
    this.history.pop();
    const prevSnapshot = this.history[this.history.length - 1];

    this.pc = prevSnapshot.pc;
    this.stepCount = prevSnapshot.step;
    this.status = prevSnapshot.status;
    this.log = [...prevSnapshot.log];
    this.memory.clear();
    Object.entries(prevSnapshot.memory).forEach(([k, v]) => {
      this.memory.set(k, v);
    });

    return true;
  }

  // --------------------------------------------------------------------------
  // Run to Completion / Next Breakpoint
  // --------------------------------------------------------------------------
  public run(): { stepsRun: number; finalStatus: VMStatus } {
    let stepsRun = 0;
    this.status = 'running';

    while (this.canStepForward() && stepsRun < this.maxSteps) {
      // Check if current PC hit a breakpoint (and not just started from it)
      if (stepsRun > 0 && this.breakpoints.has(this.pc)) {
        this.status = 'paused';
        break;
      }

      const ok = this.stepForward();
      stepsRun++;
      if (!ok) break;

      // Check if after stepping we are now at a breakpoint
      if (this.breakpoints.has(this.pc)) {
        this.status = 'paused';
        break;
      }
    }

    if (stepsRun >= this.maxSteps) {
      this.status = 'error';
      this.errorMessage = `Execution exceeded safety limit of ${this.maxSteps} cycles (possible infinite loop)`;
    }

    return { stepsRun, finalStatus: this.status };
  }

  // --------------------------------------------------------------------------
  // Reset VM to initial state
  // --------------------------------------------------------------------------
  public reset(): void {
    this.load(this.instructions);
  }
}
