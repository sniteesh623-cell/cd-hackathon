// ============================================================================
// CompilerX — Control Flow Graph (CFG) Engine & Basic Block Partitioner
// Identifies leaders, forms basic blocks, computes dominators, and detects loops
// ============================================================================

import { TACInstruction } from '../types';

export type EdgeType = 'fallthrough' | 'true' | 'false' | 'unconditional';

export interface CFGEdge {
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
}

export interface BasicBlock {
  id: string;              // e.g. "B0", "B1"
  name: string;            // e.g. "Block 0 (Entry)", "Block 1 [L1]"
  instructions: TACInstruction[];
  predecessors: string[];  // Block IDs
  successors: string[];    // Block IDs
  isEntry?: boolean;
  isExit?: boolean;
  dominators: string[];    // Block IDs that dominate this block
  immediateDominator: string | null;
}

export interface LoopInfo {
  header: string;          // Loop header block ID
  backEdge: { from: string; to: string };
  blocks: string[];        // All block IDs belonging to natural loop
}

export interface ControlFlowGraph {
  blocks: BasicBlock[];
  edges: CFGEdge[];
  entryBlockId: string;
  exitBlockId: string;
  loops: LoopInfo[];
  dominatorTree: Map<string, string[]>; // parentId -> childrenIds
}

export class CFGBuilder {
  public static build(instructions: TACInstruction[]): ControlFlowGraph {
    if (instructions.length === 0) {
      const emptyEntry: BasicBlock = {
        id: 'B_ENTRY',
        name: 'ENTRY',
        instructions: [],
        predecessors: [],
        successors: ['B_EXIT'],
        isEntry: true,
        dominators: ['B_ENTRY'],
        immediateDominator: null,
      };
      const emptyExit: BasicBlock = {
        id: 'B_EXIT',
        name: 'EXIT',
        instructions: [],
        predecessors: ['B_ENTRY'],
        successors: [],
        isExit: true,
        dominators: ['B_ENTRY', 'B_EXIT'],
        immediateDominator: 'B_ENTRY',
      };
      return {
        blocks: [emptyEntry, emptyExit],
        edges: [{ from: 'B_ENTRY', to: 'B_EXIT', type: 'fallthrough' }],
        entryBlockId: 'B_ENTRY',
        exitBlockId: 'B_EXIT',
        loops: [],
        dominatorTree: new Map([['B_ENTRY', ['B_EXIT']]]),
      };
    }

    // 1. Identify Leaders (Dragon Book algorithm)
    // Rule a: The first instruction is a leader
    // Rule b: Any instruction that is the target of a conditional or unconditional jump is a leader
    // Rule c: Any instruction that immediately follows a jump is a leader
    const leaders = new Set<number>();
    leaders.add(1);

    // Map labels to instruction indices
    const labelToIdx = new Map<string, number>();
    instructions.forEach(instr => {
      if (instr.op === 'label' && instr.target) {
        labelToIdx.set(instr.target, instr.index);
      }
    });

    instructions.forEach((instr, idx) => {
      const isJump = ['goto', 'if_goto', 'if_true_goto', 'if_false_goto'].includes(instr.op);
      if (isJump) {
        // Target is a leader
        if (instr.target) {
          const targetIdx = labelToIdx.get(instr.target);
          if (targetIdx) {
            leaders.add(targetIdx);
          }
        }
        // Next instruction is a leader
        if (idx + 1 < instructions.length) {
          leaders.add(instructions[idx + 1].index);
        }
      } else if (instr.op === 'label') {
        // A label instruction itself starts a block
        leaders.add(instr.index);
      }
    });

    const sortedLeaders = Array.from(leaders).sort((a, b) => a - b);

    // 2. Partition into Basic Blocks
    const rawBlocks: BasicBlock[] = [];
    for (let i = 0; i < sortedLeaders.length; i++) {
      const startIdx = sortedLeaders[i];
      const nextLeaderIdx = i + 1 < sortedLeaders.length ? sortedLeaders[i + 1] : instructions.length + 1;
      
      const blockInstrs = instructions.filter(
        instr => instr.index >= startIdx && instr.index < nextLeaderIdx
      );

      const blockId = `B${i}`;
      const labelInstr = blockInstrs.find(instr => instr.op === 'label');
      const blockName = labelInstr?.target ? `Block ${i} [${labelInstr.target}]` : `Block ${i}`;

      rawBlocks.push({
        id: blockId,
        name: blockName,
        instructions: blockInstrs,
        predecessors: [],
        successors: [],
        isEntry: i === 0,
        dominators: [],
        immediateDominator: null,
      });
    }

    // Map instruction index to block ID
    const instrToBlock = new Map<number, string>();
    rawBlocks.forEach(b => {
      b.instructions.forEach(instr => {
        instrToBlock.set(instr.index, b.id);
      });
    });

    // Map label name to block ID
    const labelToBlock = new Map<string, string>();
    rawBlocks.forEach(b => {
      b.instructions.forEach(instr => {
        if (instr.op === 'label' && instr.target) {
          labelToBlock.set(instr.target, b.id);
        }
      });
    });

    // 3. Construct Edges
    const edges: CFGEdge[] = [];

    rawBlocks.forEach((block, idx) => {
      if (block.instructions.length === 0) return;
      const lastInstr = block.instructions[block.instructions.length - 1];

      if (lastInstr.op === 'goto') {
        // Unconditional jump to target
        if (lastInstr.target && labelToBlock.has(lastInstr.target)) {
          const targetBlock = labelToBlock.get(lastInstr.target)!;
          edges.push({ from: block.id, to: targetBlock, type: 'unconditional' });
        }
      } else if (['if_goto', 'if_true_goto', 'if_false_goto'].includes(lastInstr.op)) {
        // Conditional branch: True edge to target
        if (lastInstr.target && labelToBlock.has(lastInstr.target)) {
          const targetBlock = labelToBlock.get(lastInstr.target)!;
          edges.push({
            from: block.id,
            to: targetBlock,
            type: 'true',
            label: `${lastInstr.arg1 || ''} ${lastInstr.relop || ''} ${lastInstr.arg2 || ''}`.trim(),
          });
        }
        // False edge: fallthrough to next block
        if (idx + 1 < rawBlocks.length) {
          edges.push({
            from: block.id,
            to: rawBlocks[idx + 1].id,
            type: 'false',
            label: 'else',
          });
        }
      } else {
        // Normal sequential instruction: fallthrough to next block
        if (idx + 1 < rawBlocks.length) {
          edges.push({ from: block.id, to: rawBlocks[idx + 1].id, type: 'fallthrough' });
        }
      }
    });

    // Link predecessors and successors
    edges.forEach(e => {
      const src = rawBlocks.find(b => b.id === e.from);
      const dst = rawBlocks.find(b => b.id === e.to);
      if (src && !src.successors.includes(e.to)) {
        src.successors.push(e.to);
      }
      if (dst && !dst.predecessors.includes(e.from)) {
        dst.predecessors.push(e.from);
      }
    });

    // Create explicit Exit Block if needed or designate last block
    const exitBlockId = rawBlocks[rawBlocks.length - 1].id;
    rawBlocks[rawBlocks.length - 1].isExit = true;

    // 4. Dominance Analysis (Fixed-Point Iteration)
    const allBlockIds = rawBlocks.map(b => b.id);
    const domMap = new Map<string, Set<string>>();

    rawBlocks.forEach((b, idx) => {
      if (idx === 0) {
        domMap.set(b.id, new Set([b.id]));
      } else {
        domMap.set(b.id, new Set(allBlockIds));
      }
    });

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 1; i < rawBlocks.length; i++) {
        const b = rawBlocks[i];
        const preds = b.predecessors;
        let intersectSet: Set<string>;

        if (preds.length === 0) {
          intersectSet = new Set();
        } else {
          intersectSet = new Set(domMap.get(preds[0]) || []);
          for (let p = 1; p < preds.length; p++) {
            const predDom = domMap.get(preds[p]) || new Set();
            for (const item of Array.from(intersectSet)) {
              if (!predDom.has(item)) {
                intersectSet.delete(item);
              }
            }
          }
        }

        const newDom = new Set([b.id, ...Array.from(intersectSet)]);
        const oldDom = domMap.get(b.id)!;

        if (newDom.size !== oldDom.size || Array.from(newDom).some(x => !oldDom.has(x))) {
          domMap.set(b.id, newDom);
          changed = true;
        }
      }
    }

    // Assign dominators to blocks and compute immediate dominator (idom)
    rawBlocks.forEach(b => {
      const doms = Array.from(domMap.get(b.id) || []);
      b.dominators = doms;

      // Immediate dominator: strict dominator of b that does not strictly dominate any other strict dominator of b
      const strictDoms = doms.filter(d => d !== b.id);
      let idom: string | null = null;
      for (const d of strictDoms) {
        const dDoms = domMap.get(d) || new Set();
        const dominatesOther = strictDoms.some(other => other !== d && (domMap.get(other)?.has(d) ?? false));
        if (!dominatesOther) {
          idom = d;
          break;
        }
      }
      b.immediateDominator = idom;
    });

    // 5. Construct Dominator Tree (parent -> children)
    const dominatorTree = new Map<string, string[]>();
    rawBlocks.forEach(b => {
      if (b.immediateDominator) {
        const children = dominatorTree.get(b.immediateDominator) || [];
        children.push(b.id);
        dominatorTree.set(b.immediateDominator, children);
      }
    });

    // 6. Detect Natural Loops (Back-edges A -> B where B dominates A)
    const loops: LoopInfo[] = [];
    edges.forEach(e => {
      const srcBlock = rawBlocks.find(b => b.id === e.from);
      if (srcBlock && srcBlock.dominators.includes(e.to)) {
        // Back-edge found! e.to is the loop header
        const loopHeader = e.to;
        const loopBlocks = new Set<string>([loopHeader, e.from]);
        const stack: string[] = [e.from];

        while (stack.length > 0) {
          const currId = stack.pop()!;
          const currBlock = rawBlocks.find(b => b.id === currId);
          if (currBlock) {
            for (const pred of currBlock.predecessors) {
              if (!loopBlocks.has(pred)) {
                loopBlocks.add(pred);
                stack.push(pred);
              }
            }
          }
        }

        loops.push({
          header: loopHeader,
          backEdge: { from: e.from, to: e.to },
          blocks: Array.from(loopBlocks),
        });
      }
    });

    return {
      blocks: rawBlocks,
      edges,
      entryBlockId: rawBlocks[0].id,
      exitBlockId,
      loops,
      dominatorTree,
    };
  }
}
