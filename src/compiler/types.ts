// ============================================================================
// CompilerX — Visual Compiler Workbench
// Type Definitions for Lexer, Parser, AST, Postfix, TAC, SDT, and Backpatching
// ============================================================================

export type TokenType =
  // Keywords
  | 'KW_INT'
  | 'KW_FLOAT'
  | 'KW_IF'
  | 'KW_ELSE'
  | 'KW_WHILE'
  
  // Identifiers & Literals
  | 'IDENTIFIER'
  | 'INT_LITERAL'
  | 'FLOAT_LITERAL'
  
  // Arithmetic Operators
  | 'OP_PLUS'      // +
  | 'OP_MINUS'     // -
  | 'OP_MUL'       // *
  | 'OP_DIV'       // /
  | 'OP_ASSIGN'    // =
  
  // Relational Operators
  | 'OP_LT'        // <
  | 'OP_GT'        // >
  | 'OP_LE'        // <=
  | 'OP_GE'        // >=
  | 'OP_EQ'        // ==
  | 'OP_NE'        // !=
  
  // Boolean Operators
  | 'OP_AND'       // &&
  | 'OP_OR'        // ||
  | 'OP_NOT'       // !
  
  // Punctuation & Delimiters
  | 'SEMICOLON'    // ;
  | 'COMMA'        // ,
  | 'LPAREN'       // (
  | 'RPAREN'       // )
  | 'LBRACE'       // {
  | 'RBRACE'       // }
  
  // Special
  | 'EOF'
  | 'ERROR';

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface Token {
  type: TokenType;
  value: string;
  loc: SourceLocation;
}

export interface CompilerDiagnostic {
  phase: 'lexer' | 'parser' | 'tac' | 'semantic';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
  snippet?: string;
}

// ----------------------------------------------------------------------------
// AST Node Types (Discriminated Unions)
// ----------------------------------------------------------------------------

export type DataType = 'int' | 'float';

export interface BaseASTNode {
  id: string;
  loc: SourceLocation;
  // Synthesized and inherited attributes recorded for SDT inspection
  attributes?: {
    type?: string;
    place?: string;      // synthesized: temp or var name holding result
    truelist?: number[];  // synthesized: jump instructions to patch on true
    falselist?: number[]; // synthesized: jump instructions to patch on false
    nextlist?: number[];  // synthesized: jump instructions to patch on next
    begin?: string;      // inherited: loop header label
    next?: string;       // inherited: exit target label
    postfix?: string;    // synthesized: postfix representation
    [key: string]: unknown;
  };
}

export interface ProgramNode extends BaseASTNode {
  type: 'Program';
  body: StatementNode[];
}

export interface VarDeclarator {
  id: IdentifierNode;
  init?: ExpressionNode;
}

export interface VarDeclarationNode extends BaseASTNode {
  type: 'VarDeclaration';
  dataType: DataType;
  declarations: VarDeclarator[];
}

export interface AssignmentStatementNode extends BaseASTNode {
  type: 'AssignmentStatement';
  target: IdentifierNode;
  value: ExpressionNode;
}

export interface IfStatementNode extends BaseASTNode {
  type: 'IfStatement';
  condition: ExpressionNode;
  consequent: StatementNode;
  alternate?: StatementNode;
}

export interface WhileStatementNode extends BaseASTNode {
  type: 'WhileStatement';
  condition: ExpressionNode;
  body: StatementNode;
}

export interface BlockStatementNode extends BaseASTNode {
  type: 'BlockStatement';
  body: StatementNode[];
}

export interface ExpressionStatementNode extends BaseASTNode {
  type: 'ExpressionStatement';
  expression: ExpressionNode;
}

export type StatementNode =
  | VarDeclarationNode
  | AssignmentStatementNode
  | IfStatementNode
  | WhileStatementNode
  | BlockStatementNode
  | ExpressionStatementNode;

export type BinaryOperator =
  | '+' | '-' | '*' | '/'
  | '<' | '<=' | '>' | '>=' | '==' | '!='
  | '&&' | '||';

export interface BinaryExpressionNode extends BaseASTNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export type UnaryOperator = '-' | '!';

export interface UnaryExpressionNode extends BaseASTNode {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  argument: ExpressionNode;
}

export interface IdentifierNode extends BaseASTNode {
  type: 'Identifier';
  name: string;
}

export interface LiteralNode extends BaseASTNode {
  type: 'Literal';
  value: number;
  raw: string;
  dataType: DataType;
}

export type ExpressionNode =
  | BinaryExpressionNode
  | UnaryExpressionNode
  | IdentifierNode
  | LiteralNode;

export type ASTNode = ProgramNode | StatementNode | ExpressionNode;

// ----------------------------------------------------------------------------
// Three-Address Code (TAC) Types
// ----------------------------------------------------------------------------

export type TACOp =
  | '+' | '-' | '*' | '/' | 'uminus'
  | '='               // simple assignment: result = arg1
  | 'decl'            // variable declaration: decl type result [= arg1]
  | 'if_goto'         // if arg1 relop arg2 goto target
  | 'if_false_goto'   // if !arg1 goto target
  | 'if_true_goto'    // if arg1 goto target
  | 'goto'            // unconditional goto target
  | 'label'           // target label (e.g., L1:)
  | 'nop';

export interface TACInstruction {
  index: number;         // 1-based instruction index
  op: TACOp;
  arg1?: string;
  arg2?: string;
  relop?: string;        // For if_goto: <, >, <=, >=, ==, !=
  result?: string;       // Variable, temporary (t1), or destination
  target?: string;       // Label name (L1, L2) or unresolved placeholder
  rawText: string;       // Formatted human-readable string
  comment?: string;      // SDD explanation or origin
  astNodeId?: string;    // Link to originating AST node
}

// ----------------------------------------------------------------------------
// Boolean Translation & Backpatching Event Types
// ----------------------------------------------------------------------------

export type BackpatchActionType = 'makelist' | 'merge' | 'backpatch';

export interface BackpatchEvent {
  step: number;
  action: BackpatchActionType;
  description: string;
  listName?: 'truelist' | 'falselist' | 'nextlist';
  indices: number[];           // Instruction addresses involved
  targetLabel?: string;        // The label patched into the jump
  astNodeId?: string;
  conditionSnippet?: string;
}

export interface BackpatchRecord {
  instructionIndex: number;
  originalInstruction: string;
  patchedInstruction: string;
  targetLabel: string;
  listType: 'truelist' | 'falselist' | 'nextlist';
  condition: string;
}

// ----------------------------------------------------------------------------
// Postfix Notation Types
// ----------------------------------------------------------------------------

export interface PostfixItem {
  expressionId: string;
  sourceExpr: string;
  postfixTokens: string[];
  postfixString: string;
  explanation: string;
  nodeType: string;
}

// ----------------------------------------------------------------------------
// SDT Attribute Trace Types
// ----------------------------------------------------------------------------

export interface SDTAttributeTrace {
  step: number;
  nodeId: string;
  nodeType: string;
  ruleApplied: string;
  attributeType: 'synthesized' | 'inherited';
  attributeName: string;
  attributeValue: string;
  explanation: string;
}

// ----------------------------------------------------------------------------
// Compiler Results & Statistics
// ----------------------------------------------------------------------------

export interface CompilerStatistics {
  sourceLength: number;
  tokenCount: number;
  astNodeCount: number;
  temporaryCount: number;
  labelCount: number;
  tacInstructionCount: number;
  backpatchCount: number;
  compileTimeMs: number;
}

export interface CompilerResult {
  success: boolean;
  sourceCode: string;
  tokens: Token[];
  ast: ProgramNode | null;
  postfixList: PostfixItem[];
  tacInstructions: TACInstruction[];
  tacText: string;
  backpatchEvents: BackpatchEvent[];
  backpatchRecords: BackpatchRecord[];
  sdtTraces: SDTAttributeTrace[];
  diagnostics: CompilerDiagnostic[];
  stats: CompilerStatistics;
  
  // CompilerX Ascension Extensions
  quads?: import('./ir/quad').Quadruple[];
  semantics?: import('./semantics/symbolTable').SemanticAnalysisResult | null;
  cfg?: import('./cfg/basicBlock').ControlFlowGraph | null;
  dataFlow?: import('./dataflow/dataflow').DataFlowAnalysisResult | null;
  optimization?: import('./optimizer/optimizer').OptimizationResult | null;
  analytics?: import('./analytics/analytics').CompilerAnalyticsReport | null;
}

