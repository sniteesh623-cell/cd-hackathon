// ============================================================================
// CompilerX — Postfix Generator
// Traverses AST in postorder to produce postfix notation for expressions
// ============================================================================

import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IdentifierNode,
  LiteralNode,
  PostfixItem,
} from './types';

export class PostfixGenerator {
  private items: PostfixItem[] = [];

  public generate(program: ProgramNode): PostfixItem[] {
    this.items = [];
    this.traverseStatements(program.body);
    return this.items;
  }

  private traverseStatements(statements: StatementNode[]): void {
    for (const stmt of statements) {
      this.traverseStatement(stmt);
    }
  }

  private traverseStatement(stmt: StatementNode): void {
    switch (stmt.type) {
      case 'VarDeclaration':
        for (const decl of stmt.declarations) {
          if (decl.init) {
            this.recordExpression(
              decl.init,
              `Declaration Init: ${decl.id.name} = ...`,
              'VarDeclaration'
            );
          }
        }
        break;

      case 'AssignmentStatement':
        this.recordExpression(
          stmt.value,
          `Assignment: ${stmt.target.name} = ...`,
          'AssignmentStatement'
        );
        break;

      case 'IfStatement':
        this.recordExpression(
          stmt.condition,
          `If Condition`,
          'IfStatement'
        );
        this.traverseStatement(stmt.consequent);
        if (stmt.alternate) {
          this.traverseStatement(stmt.alternate);
        }
        break;

      case 'WhileStatement':
        this.recordExpression(
          stmt.condition,
          `While Condition`,
          'WhileStatement'
        );
        this.traverseStatement(stmt.body);
        break;

      case 'BlockStatement':
        this.traverseStatements(stmt.body);
        break;

      case 'ExpressionStatement':
        this.recordExpression(
          stmt.expression,
          `Expression Statement`,
          'ExpressionStatement'
        );
        break;
    }
  }

  private recordExpression(
    expr: ExpressionNode,
    label: string,
    nodeType: string
  ): void {
    const tokens: string[] = [];
    this.toPostfixTokens(expr, tokens);
    const postfixStr = tokens.join(' ');
    const sourceExpr = this.toInfixString(expr);

    const explanation = this.generateExplanation(expr, tokens);

    // Save synthesized postfix attribute on node
    if (!expr.attributes) expr.attributes = {};
    expr.attributes.postfix = postfixStr;

    this.items.push({
      expressionId: expr.id,
      sourceExpr: `${label} [ ${sourceExpr} ]`,
      postfixTokens: tokens,
      postfixString: postfixStr,
      explanation,
      nodeType,
    });
  }

  public toPostfixTokens(expr: ExpressionNode, tokens: string[]): void {
    switch (expr.type) {
      case 'Literal':
        tokens.push(expr.raw);
        break;

      case 'Identifier':
        tokens.push(expr.name);
        break;

      case 'UnaryExpression':
        this.toPostfixTokens(expr.argument, tokens);
        tokens.push(expr.operator === '-' ? 'neg' : expr.operator);
        break;

      case 'BinaryExpression':
        this.toPostfixTokens(expr.left, tokens);
        this.toPostfixTokens(expr.right, tokens);
        tokens.push(expr.operator);
        break;
    }
  }

  public toInfixString(expr: ExpressionNode): string {
    switch (expr.type) {
      case 'Literal':
        return expr.raw;
      case 'Identifier':
        return expr.name;
      case 'UnaryExpression':
        return `${expr.operator}(${this.toInfixString(expr.argument)})`;
      case 'BinaryExpression':
        return `(${this.toInfixString(expr.left)} ${expr.operator} ${this.toInfixString(expr.right)})`;
    }
  }

  private generateExplanation(expr: ExpressionNode, tokens: string[]): string {
    if (expr.type === 'Literal' || expr.type === 'Identifier') {
      return `Single operand evaluation: push ${tokens[0]} onto stack.`;
    }

    const opCount = tokens.filter(t => ['+', '-', '*', '/', '<', '<=', '>', '>=', '==', '!=', '&&', '||', '!', 'neg'].includes(t)).length;
    return `Evaluated in postorder using ${opCount} operator application(s). Operands are pushed first, then operators pop the most recent operands and push intermediate results, eliminating parentheses.`;
  }
}
