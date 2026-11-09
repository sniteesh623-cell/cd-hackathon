// ============================================================================
// CompilerX — Visual Compiler Workbench
// Main Compiler Pipeline Coordinator (PS-06 ThreeAddrGen & Ascension Platform)
// ============================================================================

import { Lexer } from './lexer';
import { Parser } from './parser';
import { PostfixGenerator } from './postfix';
import { TACGenerator } from './tac';
import { SemanticAnalyzer, SemanticAnalysisResult } from './semantics/symbolTable';
import { QuadGenerator, Quadruple } from './ir/quad';
import { CFGBuilder, ControlFlowGraph } from './cfg/basicBlock';
import { DataFlowAnalyzer, DataFlowAnalysisResult } from './dataflow/dataflow';
import { Optimizer, OptimizationResult } from './optimizer/optimizer';
import { CompilerAnalytics, CompilerAnalyticsReport } from './analytics/analytics';
import { TACVirtualMachine } from './vm/tacVM';
import {
  CompilerResult,
  CompilerStatistics,
  ProgramNode,
  ASTNode,
} from './types';

export * from './types';
export * from './lexer';
export * from './parser';
export * from './postfix';
export * from './tac';
export * from './semantics/symbolTable';
export * from './ir/quad';
export * from './cfg/basicBlock';
export * from './dataflow/dataflow';
export * from './optimizer/optimizer';
export * from './vm/tacVM';
export * from './analytics/analytics';

export function countASTNodes(node: ASTNode | null): number {
  if (!node) return 0;
  let count = 1;

  switch (node.type) {
    case 'Program':
      for (const stmt of node.body) count += countASTNodes(stmt);
      break;
    case 'VarDeclaration':
      for (const decl of node.declarations) {
        count += countASTNodes(decl.id);
        if (decl.init) count += countASTNodes(decl.init);
      }
      break;
    case 'AssignmentStatement':
      count += countASTNodes(node.target);
      count += countASTNodes(node.value);
      break;
    case 'IfStatement':
      count += countASTNodes(node.condition);
      count += countASTNodes(node.consequent);
      if (node.alternate) count += countASTNodes(node.alternate);
      break;
    case 'WhileStatement':
      count += countASTNodes(node.condition);
      count += countASTNodes(node.body);
      break;
    case 'BlockStatement':
      for (const stmt of node.body) count += countASTNodes(stmt);
      break;
    case 'ExpressionStatement':
      count += countASTNodes(node.expression);
      break;
    case 'BinaryExpression':
      count += countASTNodes(node.left);
      count += countASTNodes(node.right);
      break;
    case 'UnaryExpression':
      count += countASTNodes(node.argument);
      break;
    case 'Identifier':
    case 'Literal':
      break;
  }

  return count;
}

export function compileSource(sourceCode: string): CompilerResult {
  const startTime = performance.now();

  // 1. Lexical Analysis
  const lexer = new Lexer(sourceCode);
  const { tokens, diagnostics: lexerDiagnostics } = lexer.tokenize();

  // If fatal lexical error occurred
  if (lexerDiagnostics.some(d => d.severity === 'error')) {
    const elapsed = performance.now() - startTime;
    return {
      success: false,
      sourceCode,
      tokens,
      ast: null,
      postfixList: [],
      tacInstructions: [],
      tacText: '',
      backpatchEvents: [],
      backpatchRecords: [],
      sdtTraces: [],
      diagnostics: lexerDiagnostics,
      stats: {
        sourceLength: sourceCode.length,
        tokenCount: tokens.length,
        astNodeCount: 0,
        temporaryCount: 0,
        labelCount: 0,
        tacInstructionCount: 0,
        backpatchCount: 0,
        compileTimeMs: Math.round(elapsed * 100) / 100,
      },
      quads: [],
      semantics: null,
      cfg: null,
      dataFlow: null,
      optimization: null,
      analytics: null,
    };
  }

  // 2. Syntactic Analysis (Parser)
  const parser = new Parser(tokens, sourceCode);
  const { ast, diagnostics: parserDiagnostics } = parser.parse();

  let allDiagnostics = [...lexerDiagnostics, ...parserDiagnostics];

  if (!ast || parserDiagnostics.some(d => d.severity === 'error')) {
    const elapsed = performance.now() - startTime;
    return {
      success: false,
      sourceCode,
      tokens,
      ast: null,
      postfixList: [],
      tacInstructions: [],
      tacText: '',
      backpatchEvents: [],
      backpatchRecords: [],
      sdtTraces: [],
      diagnostics: allDiagnostics,
      stats: {
        sourceLength: sourceCode.length,
        tokenCount: tokens.length,
        astNodeCount: 0,
        temporaryCount: 0,
        labelCount: 0,
        tacInstructionCount: 0,
        backpatchCount: 0,
        compileTimeMs: Math.round(elapsed * 100) / 100,
      },
      quads: [],
      semantics: null,
      cfg: null,
      dataFlow: null,
      optimization: null,
      analytics: null,
    };
  }

  // 3. Semantic Analysis (Scoping, Type Checking & Static Warnings)
  const semanticAnalyzer = new SemanticAnalyzer(sourceCode);
  const semantics: SemanticAnalysisResult = semanticAnalyzer.analyze(ast);
  allDiagnostics = [...allDiagnostics, ...semantics.diagnostics];

  // 4. Postfix Generation (Postorder Traversal)
  const postfixGen = new PostfixGenerator();
  const postfixList = postfixGen.generate(ast);

  // 5. Three-Address Code, SDT, and Backpatching
  const tacGen = new TACGenerator();
  const {
    instructions: tacInstructions,
    tacText,
    backpatchEvents,
    backpatchRecords,
    sdtTraces,
  } = tacGen.generate(ast);

  // 6. Quadruple Intermediate Representation
  const quads: Quadruple[] = QuadGenerator.fromTAC(tacInstructions);

  // 7. Control Flow Graph (Basic Block Partitioner, Dominance & Loops)
  const cfg: ControlFlowGraph = CFGBuilder.build(tacInstructions);

  // 8. Data-Flow Analysis (Reaching Definitions & Live Variables)
  const dataFlow: DataFlowAnalysisResult = DataFlowAnalyzer.analyze(cfg, tacInstructions);

  // 9. Optimization Lab (Pass Pipeline)
  const optimization: OptimizationResult = Optimizer.optimize(tacInstructions);

  // 10. Compiler Analytics Report
  const analytics: CompilerAnalyticsReport = CompilerAnalytics.compute(
    {
      success: true,
      sourceCode,
      tokens,
      ast,
      postfixList,
      tacInstructions,
      tacText,
      backpatchEvents,
      backpatchRecords,
      sdtTraces,
      diagnostics: allDiagnostics,
      stats: {
        sourceLength: sourceCode.length,
        tokenCount: tokens.length,
        astNodeCount: countASTNodes(ast),
        temporaryCount: tacGen.getTempCount(),
        labelCount: tacGen.getLabelCount(),
        tacInstructionCount: tacInstructions.length,
        backpatchCount: backpatchRecords.length,
        compileTimeMs: 0,
      },
    },
    cfg,
    optimization
  );

  const elapsed = performance.now() - startTime;
  const astNodeCount = countASTNodes(ast);

  const stats: CompilerStatistics = {
    sourceLength: sourceCode.length,
    tokenCount: tokens.length,
    astNodeCount,
    temporaryCount: tacGen.getTempCount(),
    labelCount: tacGen.getLabelCount(),
    tacInstructionCount: tacInstructions.length,
    backpatchCount: backpatchRecords.length,
    compileTimeMs: Math.round(elapsed * 100) / 100,
  };

  return {
    success: true,
    sourceCode,
    tokens,
    ast,
    postfixList,
    tacInstructions,
    tacText,
    backpatchEvents,
    backpatchRecords,
    sdtTraces,
    diagnostics: allDiagnostics,
    stats,
    quads,
    semantics,
    cfg,
    dataFlow,
    optimization,
    analytics,
  };
}
