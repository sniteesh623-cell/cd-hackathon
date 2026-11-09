// ============================================================================
// CompilerX — Advanced Semantic Analysis & Symbol Table Engine
// Implements lexical scoping, symbol tracking, type checking, and static warnings
// ============================================================================

import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IdentifierNode,
  LiteralNode,
  DataType,
  SourceLocation,
  CompilerDiagnostic,
} from '../types';

export interface SymbolInfo {
  name: string;
  dataType: DataType;
  scopeId: string;
  scopeLevel: number;
  declaredLoc: SourceLocation;
  isInitialized: boolean;
  readCount: number;
  writeCount: number;
  constantValue?: number;
}

export class Scope {
  public readonly id: string;
  public readonly level: number;
  public readonly parent: Scope | null;
  public readonly children: Scope[] = [];
  public readonly symbols: Map<string, SymbolInfo> = new Map();

  constructor(id: string, level: number, parent: Scope | null = null) {
    this.id = id;
    this.level = level;
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
  }

  public define(symbol: SymbolInfo): boolean {
    if (this.symbols.has(symbol.name)) {
      return false; // Redeclaration error in same scope
    }
    this.symbols.set(symbol.name, symbol);
    return true;
  }

  public resolve(name: string): SymbolInfo | undefined {
    let current: Scope | null = this;
    while (current) {
      if (current.symbols.has(name)) {
        return current.symbols.get(name);
      }
      current = current.parent;
    }
    return undefined;
  }

  public getAllSymbolsInScope(): SymbolInfo[] {
    return Array.from(this.symbols.values());
  }

  public getAllSymbolsFlat(): SymbolInfo[] {
    const list: SymbolInfo[] = [...this.getAllSymbolsInScope()];
    for (const child of this.children) {
      list.push(...child.getAllSymbolsFlat());
    }
    return list;
  }
}

export interface SemanticAnalysisResult {
  globalScope: Scope;
  allScopes: Scope[];
  symbolList: SymbolInfo[];
  diagnostics: CompilerDiagnostic[];
  inferredTypes: Map<string, DataType>; // nodeId -> DataType
}

export class SemanticAnalyzer {
  private scopeCounter = 0;
  private currentScope: Scope;
  private allScopes: Scope[] = [];
  private diagnostics: CompilerDiagnostic[] = [];
  private inferredTypes: Map<string, DataType> = new Map();
  private source: string;

  constructor(source: string = '') {
    this.source = source;
    const rootScope = new Scope('scope_0', 0, null);
    this.currentScope = rootScope;
    this.allScopes.push(rootScope);
  }

  private nextScopeId(): string {
    return `scope_${++this.scopeCounter}`;
  }

  private enterScope(): Scope {
    const newScope = new Scope(this.nextScopeId(), this.currentScope.level + 1, this.currentScope);
    this.allScopes.push(newScope);
    this.currentScope = newScope;
    return newScope;
  }

  private exitScope(): void {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
  }

  private createSnippet(lineNum: number, colNum: number): string {
    if (!this.source) return '';
    const lines = this.source.split(/\r?\n/);
    const lineText = lines[lineNum - 1] || '';
    const pointer = ' '.repeat(Math.max(0, colNum - 1)) + '^';
    return `${lineText}\n${pointer}`;
  }

  private addDiagnostic(
    severity: 'error' | 'warning' | 'info',
    message: string,
    loc: SourceLocation
  ): void {
    this.diagnostics.push({
      phase: 'semantic',
      severity,
      message,
      line: loc.line,
      column: loc.column,
      snippet: this.createSnippet(loc.line, loc.column),
    });
  }

  public analyze(program: ProgramNode): SemanticAnalysisResult {
    this.scopeCounter = 0;
    this.diagnostics = [];
    this.allScopes = [];
    this.inferredTypes.clear();

    const rootScope = new Scope('scope_0', 0, null);
    this.currentScope = rootScope;
    this.allScopes.push(rootScope);

    // Pass 1: Walk AST and validate declarations, scoping, and type consistency
    this.visitStatements(program.body);

    // Pass 2: Analyze symbol usage (unused variables, unread writes)
    this.performUsageAnalysis(rootScope);

    return {
      globalScope: rootScope,
      allScopes: this.allScopes,
      symbolList: rootScope.getAllSymbolsFlat(),
      diagnostics: this.diagnostics,
      inferredTypes: this.inferredTypes,
    };
  }

  private visitStatements(statements: StatementNode[]): void {
    for (const stmt of statements) {
      this.visitStatement(stmt);
    }
  }

  private visitStatement(stmt: StatementNode): void {
    switch (stmt.type) {
      case 'VarDeclaration': {
        const declaredType = stmt.dataType;
        for (const decl of stmt.declarations) {
          const varName = decl.id.name;
          const loc = decl.id.loc;

          const symbol: SymbolInfo = {
            name: varName,
            dataType: declaredType,
            scopeId: this.currentScope.id,
            scopeLevel: this.currentScope.level,
            declaredLoc: loc,
            isInitialized: !!decl.init,
            readCount: 0,
            writeCount: decl.init ? 1 : 0,
          };

          const defined = this.currentScope.define(symbol);
          if (!defined) {
            this.addDiagnostic(
              'error',
              `Redeclaration of identifier '${varName}' in the same scope (${this.currentScope.id})`,
              loc
            );
          }

          if (decl.init) {
            const initType = this.visitExpression(decl.init);
            if (initType && initType !== declaredType) {
              this.addDiagnostic(
                'warning',
                `Type mismatch in initialization of '${varName}': declared '${declaredType}' but initialized with expression of type '${initType}'`,
                loc
              );
            }
          }

          this.inferredTypes.set(decl.id.id, declaredType);
        }
        break;
      }

      case 'AssignmentStatement': {
        const varName = stmt.target.name;
        const targetLoc = stmt.target.loc;
        const symbol = this.currentScope.resolve(varName);

        if (!symbol) {
          this.addDiagnostic(
            'error',
            `Assignment to undeclared identifier '${varName}'`,
            targetLoc
          );
        } else {
          symbol.writeCount++;
          symbol.isInitialized = true;
          this.inferredTypes.set(stmt.target.id, symbol.dataType);

          const valueType = this.visitExpression(stmt.value);
          if (valueType && valueType !== symbol.dataType) {
            this.addDiagnostic(
              'warning',
              `Assigning expression of type '${valueType}' to variable '${varName}' of declared type '${symbol.dataType}'`,
              targetLoc
            );
          }
        }
        break;
      }

      case 'IfStatement': {
        this.visitExpression(stmt.condition);
        this.visitStatement(stmt.consequent);
        if (stmt.alternate) {
          this.visitStatement(stmt.alternate);
        }
        break;
      }

      case 'WhileStatement': {
        this.visitExpression(stmt.condition);
        this.visitStatement(stmt.body);
        break;
      }

      case 'BlockStatement': {
        this.enterScope();
        this.visitStatements(stmt.body);
        this.exitScope();
        break;
      }

      case 'ExpressionStatement': {
        this.visitExpression(stmt.expression);
        break;
      }
    }
  }

  private visitExpression(expr: ExpressionNode): DataType {
    switch (expr.type) {
      case 'Literal': {
        this.inferredTypes.set(expr.id, expr.dataType);
        return expr.dataType;
      }

      case 'Identifier': {
        const symbol = this.currentScope.resolve(expr.name);
        if (!symbol) {
          this.addDiagnostic(
            'error',
            `Use of undeclared identifier '${expr.name}'`,
            expr.loc
          );
          return 'int'; // Fallback type
        }

        symbol.readCount++;
        if (!symbol.isInitialized) {
          this.addDiagnostic(
            'warning',
            `Identifier '${expr.name}' is read before it has been initialized with a value`,
            expr.loc
          );
        }

        this.inferredTypes.set(expr.id, symbol.dataType);
        return symbol.dataType;
      }

      case 'UnaryExpression': {
        const argType = this.visitExpression(expr.argument);
        const resType: DataType = expr.operator === '!' ? 'int' : argType;
        this.inferredTypes.set(expr.id, resType);
        return resType;
      }

      case 'BinaryExpression': {
        const leftType = this.visitExpression(expr.left);
        const rightType = this.visitExpression(expr.right);

        // Relational & Boolean operators produce integer boolean (0 or 1)
        if (['<', '<=', '>', '>=', '==', '!=', '&&', '||'].includes(expr.operator)) {
          this.inferredTypes.set(expr.id, 'int');
          return 'int';
        }

        // Arithmetic operators: if either operand is float, promote to float
        const resultType: DataType = (leftType === 'float' || rightType === 'float') ? 'float' : 'int';
        this.inferredTypes.set(expr.id, resultType);
        return resultType;
      }
    }
  }

  private performUsageAnalysis(scope: Scope): void {
    for (const symbol of scope.symbols.values()) {
      if (symbol.readCount === 0) {
        this.addDiagnostic(
          'warning',
          `Variable '${symbol.name}' is declared but never read (unused variable)`,
          symbol.declaredLoc
        );
      }
    }

    for (const child of scope.children) {
      this.performUsageAnalysis(child);
    }
  }
}
