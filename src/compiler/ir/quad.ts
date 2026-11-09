// ============================================================================
// CompilerX — Quadruple & Typed Intermediate Representation (IR)
// Represents 3-Address Code as structured, strongly-typed Quadruples
// ============================================================================

import { TACInstruction, TACOp, DataType } from '../types';

export type OperandKind = 'constant' | 'temporary' | 'variable' | 'label' | 'none';

export interface QuadOperand {
  raw: string;
  kind: OperandKind;
  dataType?: DataType;
  numericValue?: number;
}

export interface Quadruple {
  id: number;
  op: TACOp;
  arg1?: QuadOperand;
  arg2?: QuadOperand;
  result?: QuadOperand;
  target?: string;
  relop?: string;
  rawText: string;
  comment?: string;
  astNodeId?: string;
}

export function classifyOperand(opStr?: string): QuadOperand | undefined {
  if (!opStr) return undefined;
  const trimmed = opStr.trim();
  if (!trimmed) return undefined;

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const isFloat = trimmed.includes('.');
    return {
      raw: trimmed,
      kind: 'constant',
      dataType: isFloat ? 'float' : 'int',
      numericValue: parseFloat(trimmed),
    };
  }

  // Temporary (e.g., t1, t2)
  if (/^t\d+$/.test(trimmed)) {
    return {
      raw: trimmed,
      kind: 'temporary',
    };
  }

  // Label (e.g., L1, L2)
  if (/^L\d+$/.test(trimmed)) {
    return {
      raw: trimmed,
      kind: 'label',
    };
  }

  // Named variable
  return {
    raw: trimmed,
    kind: 'variable',
  };
}

export class QuadGenerator {
  public static fromTAC(instructions: TACInstruction[]): Quadruple[] {
    return instructions.map(instr => {
      const quad: Quadruple = {
        id: instr.index,
        op: instr.op,
        arg1: classifyOperand(instr.arg1),
        arg2: classifyOperand(instr.arg2),
        result: classifyOperand(instr.result),
        target: instr.target,
        relop: instr.relop,
        rawText: instr.rawText,
        comment: instr.comment,
        astNodeId: instr.astNodeId,
      };
      return quad;
    });
  }

  public static toFormattedTable(quads: Quadruple[]): string {
    const header = '| #  | Operator | Arg 1     | Arg 2     | Result / Dest | Target |';
    const sep    = '|----|----------|-----------|-----------|---------------|--------|';
    const rows = quads.map(q => {
      const idx = String(q.id).padEnd(2);
      const op = String(q.op).padEnd(8);
      const a1 = (q.arg1?.raw || '-').padEnd(9);
      const a2 = (q.arg2?.raw || '-').padEnd(9);
      const res = (q.result?.raw || '-').padEnd(13);
      const tgt = (q.target || '-').padEnd(6);
      return `| ${idx} | ${op} | ${a1} | ${a2} | ${res} | ${tgt} |`;
    });
    return [header, sep, ...rows].join('\n');
  }
}
