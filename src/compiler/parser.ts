// ============================================================================
// CompilerX — Parser (Recursive Descent Parser)
// Constructs an Abstract Syntax Tree with full operator precedence & diagnostics
// ============================================================================

import {
  Token,
  TokenType,
  ProgramNode,
  StatementNode,
  ExpressionNode,
  VarDeclarationNode,
  AssignmentStatementNode,
  IfStatementNode,
  WhileStatementNode,
  BlockStatementNode,
  ExpressionStatementNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IdentifierNode,
  LiteralNode,
  DataType,
  CompilerDiagnostic,
  SourceLocation,
  BinaryOperator,
  UnaryOperator,
} from './types';

export class Parser {
  private tokens: Token[];
  private source: string;
  private current = 0;
  private idCounter = 1;
  private diagnostics: CompilerDiagnostic[] = [];

  constructor(tokens: Token[], source: string) {
    this.tokens = tokens;
    this.source = source;
  }

  private nextId(prefix = 'node'): string {
    return `${prefix}_${this.idCounter++}`;
  }

  private peek(): Token {
    return this.tokens[this.current] || this.tokens[this.tokens.length - 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1] || this.tokens[0];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private createSnippet(lineNum: number, colNum: number): string {
    const lines = this.source.split(/\r?\n/);
    const lineText = lines[lineNum - 1] || '';
    const pointer = ' '.repeat(Math.max(0, colNum - 1)) + '^';
    return `${lineText}\n${pointer}`;
  }

  private error(token: Token, message: string): Error {
    const diag: CompilerDiagnostic = {
      phase: 'parser',
      severity: 'error',
      message,
      line: token.loc.line,
      column: token.loc.column,
      snippet: this.createSnippet(token.loc.line, token.loc.column),
    };
    this.diagnostics.push(diag);
    return new Error(`[Parse Error] ${message} at line ${token.loc.line}:${token.loc.column}`);
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  // Panic-mode error recovery
  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === 'SEMICOLON') return;

      switch (this.peek().type) {
        case 'KW_INT':
        case 'KW_FLOAT':
        case 'KW_IF':
        case 'KW_WHILE':
        case 'LBRACE':
        case 'RBRACE':
          return;
      }
      this.advance();
    }
  }

  public parse(): { ast: ProgramNode | null; diagnostics: CompilerDiagnostic[] } {
    this.diagnostics = [];
    this.current = 0;
    this.idCounter = 1;

    const statements: StatementNode[] = [];
    const startLoc = this.peek().loc;

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) {
          statements.push(stmt);
        }
      } catch {
        this.synchronize();
      }
    }

    const program: ProgramNode = {
      id: this.nextId('prog'),
      type: 'Program',
      body: statements,
      loc: startLoc,
    };

    return {
      ast: this.diagnostics.length === 0 ? program : null,
      diagnostics: this.diagnostics,
    };
  }

  // --------------------------------------------------------------------------
  // Statement Parsing
  // --------------------------------------------------------------------------

  private parseStatement(): StatementNode {
    if (this.match('KW_INT', 'KW_FLOAT')) {
      const typeToken = this.previous();
      const dataType: DataType = typeToken.type === 'KW_INT' ? 'int' : 'float';
      return this.parseVarDeclaration(dataType, typeToken.loc);
    }

    if (this.match('KW_IF')) {
      return this.parseIfStatement(this.previous().loc);
    }

    if (this.match('KW_WHILE')) {
      return this.parseWhileStatement(this.previous().loc);
    }

    if (this.match('LBRACE')) {
      return this.parseBlockStatement(this.previous().loc);
    }

    // Assignment or Expression Statement
    if (this.check('IDENTIFIER') && this.tokens[this.current + 1]?.type === 'OP_ASSIGN') {
      return this.parseAssignmentStatement();
    }

    return this.parseExpressionStatement();
  }

  private parseVarDeclaration(dataType: DataType, loc: SourceLocation): VarDeclarationNode {
    const declarations: { id: IdentifierNode; init?: ExpressionNode }[] = [];

    do {
      const idToken = this.consume('IDENTIFIER', "Expected variable name in declaration");
      const idNode: IdentifierNode = {
        id: this.nextId('id'),
        type: 'Identifier',
        name: idToken.value,
        loc: idToken.loc,
      };

      let init: ExpressionNode | undefined;
      if (this.match('OP_ASSIGN')) {
        init = this.parseExpression();
      }

      declarations.push({ id: idNode, init });
    } while (this.match('COMMA'));

    this.consume('SEMICOLON', "Expected ';' after variable declaration");

    return {
      id: this.nextId('decl'),
      type: 'VarDeclaration',
      dataType,
      declarations,
      loc,
    };
  }

  private parseAssignmentStatement(): AssignmentStatementNode {
    const idToken = this.consume('IDENTIFIER', "Expected identifier before '='");
    const target: IdentifierNode = {
      id: this.nextId('id'),
      type: 'Identifier',
      name: idToken.value,
      loc: idToken.loc,
    };

    this.consume('OP_ASSIGN', "Expected '=' after identifier in assignment");
    const value = this.parseExpression();
    this.consume('SEMICOLON', "Expected ';' after assignment expression");

    return {
      id: this.nextId('assign'),
      type: 'AssignmentStatement',
      target,
      value,
      loc: idToken.loc,
    };
  }

  private parseIfStatement(loc: SourceLocation): IfStatementNode {
    this.consume('LPAREN', "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume('RPAREN', "Expected ')' after if condition");

    const consequent = this.parseStatement();
    let alternate: StatementNode | undefined;

    if (this.match('KW_ELSE')) {
      alternate = this.parseStatement();
    }

    return {
      id: this.nextId('if'),
      type: 'IfStatement',
      condition,
      consequent,
      alternate,
      loc,
    };
  }

  private parseWhileStatement(loc: SourceLocation): WhileStatementNode {
    this.consume('LPAREN', "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume('RPAREN', "Expected ')' after while condition");

    const body = this.parseStatement();

    return {
      id: this.nextId('while'),
      type: 'WhileStatement',
      condition,
      body,
      loc,
    };
  }

  private parseBlockStatement(loc: SourceLocation): BlockStatementNode {
    const body: StatementNode[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      body.push(this.parseStatement());
    }
    this.consume('RBRACE', "Expected '}' to close block statement");

    return {
      id: this.nextId('block'),
      type: 'BlockStatement',
      body,
      loc,
    };
  }

  private parseExpressionStatement(): ExpressionStatementNode {
    const expr = this.parseExpression();
    this.consume('SEMICOLON', "Expected ';' after expression");
    return {
      id: this.nextId('expr_stmt'),
      type: 'ExpressionStatement',
      expression: expr,
      loc: expr.loc,
    };
  }

  // --------------------------------------------------------------------------
  // Expression Parsing (Precedence Hierarchy)
  // --------------------------------------------------------------------------

  public parseExpression(): ExpressionNode {
    return this.parseLogicalOr();
  }

  // Logical OR: expr || expr
  private parseLogicalOr(): ExpressionNode {
    let expr = this.parseLogicalAnd();

    while (this.match('OP_OR')) {
      const opToken = this.previous();
      const right = this.parseLogicalAnd();
      expr = {
        id: this.nextId('bin_or'),
        type: 'BinaryExpression',
        operator: '||',
        left: expr,
        right,
        loc: opToken.loc,
      };
    }

    return expr;
  }

  // Logical AND: expr && expr
  private parseLogicalAnd(): ExpressionNode {
    let expr = this.parseEquality();

    while (this.match('OP_AND')) {
      const opToken = this.previous();
      const right = this.parseEquality();
      expr = {
        id: this.nextId('bin_and'),
        type: 'BinaryExpression',
        operator: '&&',
        left: expr,
        right,
        loc: opToken.loc,
      };
    }

    return expr;
  }

  // Equality: == | !=
  private parseEquality(): ExpressionNode {
    let expr = this.parseRelational();

    while (this.match('OP_EQ', 'OP_NE')) {
      const opToken = this.previous();
      const op: BinaryOperator = opToken.value as BinaryOperator;
      const right = this.parseRelational();
      expr = {
        id: this.nextId('bin_eq'),
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: opToken.loc,
      };
    }

    return expr;
  }

  // Relational: < | <= | > | >=
  private parseRelational(): ExpressionNode {
    let expr = this.parseAdditive();

    while (this.match('OP_LT', 'OP_LE', 'OP_GT', 'OP_GE')) {
      const opToken = this.previous();
      const op: BinaryOperator = opToken.value as BinaryOperator;
      const right = this.parseAdditive();
      expr = {
        id: this.nextId('bin_rel'),
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: opToken.loc,
      };
    }

    return expr;
  }

  // Additive: + | -
  private parseAdditive(): ExpressionNode {
    let expr = this.parseMultiplicative();

    while (this.match('OP_PLUS', 'OP_MINUS')) {
      const opToken = this.previous();
      const op: BinaryOperator = opToken.value as BinaryOperator;
      const right = this.parseMultiplicative();
      expr = {
        id: this.nextId('bin_add'),
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: opToken.loc,
      };
    }

    return expr;
  }

  // Multiplicative: * | /
  private parseMultiplicative(): ExpressionNode {
    let expr = this.parseUnary();

    while (this.match('OP_MUL', 'OP_DIV')) {
      const opToken = this.previous();
      const op: BinaryOperator = opToken.value as BinaryOperator;
      const right = this.parseUnary();
      expr = {
        id: this.nextId('bin_mul'),
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right,
        loc: opToken.loc,
      };
    }

    return expr;
  }

  // Unary: ! | -
  private parseUnary(): ExpressionNode {
    if (this.match('OP_NOT', 'OP_MINUS')) {
      const opToken = this.previous();
      const op: UnaryOperator = opToken.value as UnaryOperator;
      const argument = this.parseUnary();
      return {
        id: this.nextId('unary'),
        type: 'UnaryExpression',
        operator: op,
        argument,
        loc: opToken.loc,
      };
    }

    return this.parsePrimary();
  }

  // Primary: Identifier, Int, Float, or (Expression)
  private parsePrimary(): ExpressionNode {
    if (this.match('INT_LITERAL')) {
      const token = this.previous();
      return {
        id: this.nextId('lit'),
        type: 'Literal',
        value: parseInt(token.value, 10),
        raw: token.value,
        dataType: 'int',
        loc: token.loc,
      };
    }

    if (this.match('FLOAT_LITERAL')) {
      const token = this.previous();
      return {
        id: this.nextId('lit'),
        type: 'Literal',
        value: parseFloat(token.value),
        raw: token.value,
        dataType: 'float',
        loc: token.loc,
      };
    }

    if (this.match('IDENTIFIER')) {
      const token = this.previous();
      return {
        id: this.nextId('id'),
        type: 'Identifier',
        name: token.value,
        loc: token.loc,
      };
    }

    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', "Expected ')' after parenthesized expression");
      return expr;
    }

    throw this.error(this.peek(), `Unexpected token '${this.peek().value}' where an expression was expected`);
  }
}
