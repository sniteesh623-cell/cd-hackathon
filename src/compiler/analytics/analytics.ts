// ============================================================================
// CompilerX — Compiler Analytics & Export Engine
// Computes cyclomatic complexity, temporary register pressure, AST metrics,
// and exports markdown & JSON compilation reports.
// ============================================================================

import { CompilerResult, ASTNode } from '../types';
import { ControlFlowGraph } from '../cfg/basicBlock';
import { OptimizationResult } from '../optimizer/optimizer';
import { SemanticAnalysisResult } from '../semantics/symbolTable';

export interface CompilerAnalyticsReport {
  cyclomaticComplexity: number;
  astDepth: number;
  averageFanout: number;
  instructionDensity: number;
  peakTemporaryPressure: number;
  branchCount: number;
  basicBlockCount: number;
  optimizationSavings: {
    instructionsRemoved: number;
    percentage: number;
    temporariesSaved: number;
  };
  summary: string;
}

export class CompilerAnalytics {
  public static calculateASTDepth(node: ASTNode | null): number {
    if (!node) return 0;
    let maxChildDepth = 0;

    switch (node.type) {
      case 'Program':
        for (const s of node.body) maxChildDepth = Math.max(maxChildDepth, this.calculateASTDepth(s));
        break;
      case 'VarDeclaration':
        for (const d of node.declarations) {
          maxChildDepth = Math.max(maxChildDepth, this.calculateASTDepth(d.id));
          if (d.init) maxChildDepth = Math.max(maxChildDepth, this.calculateASTDepth(d.init));
        }
        break;
      case 'AssignmentStatement':
        maxChildDepth = Math.max(
          this.calculateASTDepth(node.target),
          this.calculateASTDepth(node.value)
        );
        break;
      case 'IfStatement':
        maxChildDepth = Math.max(
          this.calculateASTDepth(node.condition),
          this.calculateASTDepth(node.consequent),
          node.alternate ? this.calculateASTDepth(node.alternate) : 0
        );
        break;
      case 'WhileStatement':
        maxChildDepth = Math.max(
          this.calculateASTDepth(node.condition),
          this.calculateASTDepth(node.body)
        );
        break;
      case 'BlockStatement':
        for (const s of node.body) maxChildDepth = Math.max(maxChildDepth, this.calculateASTDepth(s));
        break;
      case 'ExpressionStatement':
        maxChildDepth = this.calculateASTDepth(node.expression);
        break;
      case 'BinaryExpression':
        maxChildDepth = Math.max(
          this.calculateASTDepth(node.left),
          this.calculateASTDepth(node.right)
        );
        break;
      case 'UnaryExpression':
        maxChildDepth = this.calculateASTDepth(node.argument);
        break;
    }

    return 1 + maxChildDepth;
  }

  public static compute(
    result: CompilerResult,
    cfg: ControlFlowGraph,
    optResult?: OptimizationResult
  ): CompilerAnalyticsReport {
    // 1. Cyclomatic Complexity: M = E - N + 2P (where P=1 for a single program)
    const E = cfg.edges.length;
    const N = cfg.blocks.length;
    const cyclomaticComplexity = Math.max(1, E - N + 2);

    // 2. AST Depth & Fanout
    const astDepth = this.calculateASTDepth(result.ast);
    const nonLeafCount = Math.max(1, result.stats.astNodeCount - result.stats.tokenCount);
    const averageFanout = Math.round((result.stats.astNodeCount / nonLeafCount) * 10) / 10;

    // 3. Instruction Density: TAC instructions per non-empty source line
    const sourceLines = result.sourceCode.split(/\r?\n/).filter(l => l.trim().length > 0).length;
    const instructionDensity = sourceLines > 0
      ? Math.round((result.tacInstructions.length / sourceLines) * 100) / 100
      : 0;

    // 4. Temporary Pressure: maximum simultaneous active temporaries
    const temps = new Set<string>();
    result.tacInstructions.forEach(i => {
      if (i.result && /^t\d+$/.test(i.result)) temps.add(i.result);
      if (i.arg1 && /^t\d+$/.test(i.arg1)) temps.add(i.arg1);
      if (i.arg2 && /^t\d+$/.test(i.arg2)) temps.add(i.arg2);
    });
    const peakTemporaryPressure = temps.size;

    // 5. Branch count
    const branchCount = cfg.edges.filter(e => e.type === 'true' || e.type === 'false').length / 2;

    const optSavings = {
      instructionsRemoved: optResult ? optResult.originalCount - optResult.optimizedCount : 0,
      percentage: optResult?.reductionPercentage ?? 0,
      temporariesSaved: optResult?.temporariesSaved ?? 0,
    };

    const summary = `Compiled ${result.stats.tokenCount} tokens into ${result.stats.astNodeCount} AST nodes and ${result.tacInstructions.length} TAC instructions across ${N} basic blocks (Cyclomatic Complexity: ${cyclomaticComplexity}). Optimization reduced code by ${optSavings.percentage}%.`;

    return {
      cyclomaticComplexity,
      astDepth,
      averageFanout,
      instructionDensity,
      peakTemporaryPressure,
      branchCount,
      basicBlockCount: N,
      optimizationSavings: optSavings,
      summary,
    };
  }

  public static generateMarkdownReport(
    result: CompilerResult,
    cfg: ControlFlowGraph,
    optResult?: OptimizationResult,
    semantics?: SemanticAnalysisResult
  ): string {
    const analytics = this.compute(result, cfg, optResult);

    return `# CompilerX — Comprehensive Compiler Audit Report

## 1. Executive Summary
- **Compilation Status**: ${result.success ? 'SUCCESS (Passed all front-end and IR phases)' : 'FAILED'}
- **Source Size**: ${result.sourceCode.length} characters (${result.sourceCode.split(/\r?\n/).length} lines)
- **Compilation Time**: ${result.stats.compileTimeMs} ms
- **Summary**: ${analytics.summary}

---

## 2. Pipeline Metrics & Quantitative Characteristics
| Metric | Measurement | Description |
|---|---|---|
| **Token Count** | ${result.stats.tokenCount} | Lexed tokens including keywords and literals |
| **AST Nodes** | ${result.stats.astNodeCount} | Total nodes in Abstract Syntax Tree |
| **AST Tree Depth** | ${analytics.astDepth} | Maximum nesting depth of syntax tree |
| **Basic Blocks** | ${analytics.basicBlockCount} | Leader-partitioned straight-line segments |
| **CFG Edges** | ${cfg.edges.length} | Directed control flow transitions |
| **Cyclomatic Complexity** | ${analytics.cyclomaticComplexity} | McCabe metric (E - N + 2) |
| **Instruction Density** | ${analytics.instructionDensity} | TAC instructions per source code line |
| **Temporaries Used** | ${result.stats.temporaryCount} | Register allocations (t1, t2, ...) |
| **Backpatch Operations** | ${result.backpatchRecords.length} | Resolved jumps in short-circuit evaluation |

---

## 3. Semantic Analysis & Scoping
- **Total Scopes**: ${semantics ? semantics.allScopes.length : 1}
- **Registered Symbols**: ${semantics ? semantics.symbolList.length : 0}
- **Semantic Diagnostics**: ${semantics ? semantics.diagnostics.length : 0}

${semantics && semantics.symbolList.length > 0 ? `
### Symbol Table
| Name | Type | Scope | Line | Initialized | Reads | Writes |
|---|---|---|---|---|---|---|
${semantics.symbolList.map(s => `| \`${s.name}\` | \`${s.dataType}\` | \`${s.scopeId}\` | ${s.declaredLoc.line} | ${s.isInitialized ? 'Yes' : 'No'} | ${s.readCount} | ${s.writeCount} |`).join('\n')}
` : ''}

---

## 4. Control Flow Graph Topology
- **Entry Block**: \`${cfg.entryBlockId}\`
- **Exit Block**: \`${cfg.exitBlockId}\`
- **Detected Natural Loops**: ${cfg.loops.length}
${cfg.loops.map((l, idx) => `- Loop #${idx + 1}: Header \`${l.header}\`, Back-edge \`${l.backEdge.from} -> ${l.backEdge.to}\`, Blocks: [${l.blocks.join(', ')}]`).join('\n')}

---

## 5. Optimizer Lab Results
- **Original TAC Lines**: ${optResult ? optResult.originalCount : result.tacInstructions.length}
- **Optimized TAC Lines**: ${optResult ? optResult.optimizedCount : result.tacInstructions.length}
- **Reduction Percentage**: ${analytics.optimizationSavings.percentage}%
- **Temporaries Saved**: ${analytics.optimizationSavings.temporariesSaved}
- **Passes Executed**: ${optResult ? optResult.passHistory.length : 0}

${optResult && optResult.passHistory.length > 0 ? `
### Optimization Passes Applied
${optResult.passHistory.map(p => `- **${p.passName}**: ${p.description}`).join('\n')}
` : ''}

---

## 6. Generated Three-Address Code
\`\`\`text
${result.tacText}
\`\`\`

---
*Generated by CompilerX Visual Compiler Workbench — Advanced Compiler Engineering Platform.*
`;
  }
}
