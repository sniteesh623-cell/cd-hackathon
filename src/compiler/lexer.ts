// ============================================================================
// CompilerX — Lexer (Lexical Analyzer)
// Tokenizes restricted C-like language with accurate line & column tracking
// ============================================================================

import { Token, TokenType, SourceLocation, CompilerDiagnostic } from './types';

const KEYWORDS: Record<string, TokenType> = {
  int: 'KW_INT',
  float: 'KW_FLOAT',
  if: 'KW_IF',
  else: 'KW_ELSE',
  while: 'KW_WHILE',
};

export class Lexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private column = 1;
  private diagnostics: CompilerDiagnostic[] = [];

  constructor(source: string) {
    this.source = source;
  }

  private isEOF(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(offset = 0): string {
    const idx = this.pos + offset;
    return idx < this.source.length ? this.source[idx] : '\0';
  }

  private advance(): string {
    if (this.isEOF()) return '\0';
    const char = this.source[this.pos++];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private currentLoc(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos,
    };
  }

  private createSnippet(lineNum: number, colNum: number): string {
    const lines = this.source.split(/\r?\n/);
    const lineText = lines[lineNum - 1] || '';
    const pointer = ' '.repeat(Math.max(0, colNum - 1)) + '^';
    return `${lineText}\n${pointer}`;
  }

  public tokenize(): { tokens: Token[]; diagnostics: CompilerDiagnostic[] } {
    const tokens: Token[] = [];
    this.diagnostics = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isEOF()) {
      const char = this.peek();

      // Whitespace
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
        continue;
      }

      // Comments: // or /* ... */
      if (char === '/' && this.peek(1) === '/') {
        this.advance(); // consume /
        this.advance(); // consume /
        while (!this.isEOF() && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      if (char === '/' && this.peek(1) === '*') {
        const commentStart = this.currentLoc();
        this.advance(); // consume /
        this.advance(); // consume *
        let terminated = false;
        while (!this.isEOF()) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance(); // consume *
            this.advance(); // consume /
            terminated = true;
            break;
          }
          this.advance();
        }
        if (!terminated) {
          this.diagnostics.push({
            phase: 'lexer',
            severity: 'error',
            message: 'Unterminated multi-line comment /* ... */',
            line: commentStart.line,
            column: commentStart.column,
            snippet: this.createSnippet(commentStart.line, commentStart.column),
          });
        }
        continue;
      }

      const startLoc = this.currentLoc();

      // Numbers (int or float)
      if (this.isDigit(char)) {
        let numStr = '';
        let isFloat = false;

        while (this.isDigit(this.peek())) {
          numStr += this.advance();
        }

        if (this.peek() === '.' && this.isDigit(this.peek(1))) {
          isFloat = true;
          numStr += this.advance(); // consume '.'
          while (this.isDigit(this.peek())) {
            numStr += this.advance();
          }
        }

        tokens.push({
          type: isFloat ? 'FLOAT_LITERAL' : 'INT_LITERAL',
          value: numStr,
          loc: startLoc,
        });
        continue;
      }

      // Identifiers and Keywords
      if (this.isAlphaOrUnderscore(char)) {
        let idStr = '';
        while (this.isAlphaNumeric(this.peek())) {
          idStr += this.advance();
        }

        const keywordType = KEYWORDS[idStr];
        tokens.push({
          type: keywordType || 'IDENTIFIER',
          value: idStr,
          loc: startLoc,
        });
        continue;
      }

      // Two-character operators
      const twoChar = char + this.peek(1);
      if (twoChar === '<=') {
        this.advance(); this.advance();
        tokens.push({ type: 'OP_LE', value: '<=', loc: startLoc });
        continue;
      }
      if (twoChar === '>=') {
        this.advance(); this.advance();
        tokens.push({ type: 'OP_GE', value: '>=', loc: startLoc });
        continue;
      }
      if (twoChar === '==') {
        this.advance(); this.advance();
        tokens.push({ type: 'OP_EQ', value: '==', loc: startLoc });
        continue;
      }
      if (twoChar === '!=') {
        this.advance(); this.advance();
        tokens.push({ type: 'OP_NE', value: '!=', loc: startLoc });
        continue;
      }
      if (twoChar === '&&') {
        this.advance(); this.advance();
        tokens.push({ type: 'OP_AND', value: '&&', loc: startLoc });
        continue;
      }
      if (twoChar === '||') {
        this.advance(); this.advance();
        tokens.push({ type: 'OP_OR', value: '||', loc: startLoc });
        continue;
      }

      // Single-character operators & punctuation
      switch (char) {
        case '+':
          this.advance();
          tokens.push({ type: 'OP_PLUS', value: '+', loc: startLoc });
          break;
        case '-':
          this.advance();
          tokens.push({ type: 'OP_MINUS', value: '-', loc: startLoc });
          break;
        case '*':
          this.advance();
          tokens.push({ type: 'OP_MUL', value: '*', loc: startLoc });
          break;
        case '/':
          this.advance();
          tokens.push({ type: 'OP_DIV', value: '/', loc: startLoc });
          break;
        case '=':
          this.advance();
          tokens.push({ type: 'OP_ASSIGN', value: '=', loc: startLoc });
          break;
        case '<':
          this.advance();
          tokens.push({ type: 'OP_LT', value: '<', loc: startLoc });
          break;
        case '>':
          this.advance();
          tokens.push({ type: 'OP_GT', value: '>', loc: startLoc });
          break;
        case '!':
          this.advance();
          tokens.push({ type: 'OP_NOT', value: '!', loc: startLoc });
          break;
        case ';':
          this.advance();
          tokens.push({ type: 'SEMICOLON', value: ';', loc: startLoc });
          break;
        case ',':
          this.advance();
          tokens.push({ type: 'COMMA', value: ',', loc: startLoc });
          break;
        case '(':
          this.advance();
          tokens.push({ type: 'LPAREN', value: '(', loc: startLoc });
          break;
        case ')':
          this.advance();
          tokens.push({ type: 'RPAREN', value: ')', loc: startLoc });
          break;
        case '{':
          this.advance();
          tokens.push({ type: 'LBRACE', value: '{', loc: startLoc });
          break;
        case '}':
          this.advance();
          tokens.push({ type: 'RBRACE', value: '}', loc: startLoc });
          break;
        default: {
          const badChar = this.advance();
          this.diagnostics.push({
            phase: 'lexer',
            severity: 'error',
            message: `Unexpected character '${badChar}' (ASCII ${badChar.charCodeAt(0)})`,
            line: startLoc.line,
            column: startLoc.column,
            snippet: this.createSnippet(startLoc.line, startLoc.column),
          });
          tokens.push({
            type: 'ERROR',
            value: badChar,
            loc: startLoc,
          });
          break;
        }
      }
    }

    tokens.push({
      type: 'EOF',
      value: '<EOF>',
      loc: this.currentLoc(),
    });

    return { tokens, diagnostics: this.diagnostics };
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlphaOrUnderscore(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_'
    );
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlphaOrUnderscore(char) || this.isDigit(char);
  }
}
