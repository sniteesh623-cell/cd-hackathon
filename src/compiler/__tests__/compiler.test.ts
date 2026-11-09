// ============================================================================
// CompilerX — Unit & Integration Test Suite
// Verifies all 8 critical compiler scenarios requested in the specification
// ============================================================================

import { describe, it, expect } from 'vitest';
import { compileSource } from '../index';

describe('CompilerX — Compiler Pipeline Tests', () => {
  // Test 1: Arithmetic Operator Precedence: a + b * c
  it('1. Correctly enforces arithmetic operator precedence (a + b * c)', () => {
    const code = `
      int a = 1;
      int b = 2;
      int c = 3;
      int res = a + b * c;
    `;
    const result = compileSource(code);
    expect(result.success).toBe(true);
    expect(result.ast).not.toBeNull();

    // In postfix, a + b * c must evaluate to "a b c * +"
    const resPostfix = result.postfixList.find(p => p.sourceExpr.includes('res = ...'));
    expect(resPostfix).toBeDefined();
    expect(resPostfix?.postfixString).toBe('a b c * +');

    // In TAC, b * c must be computed into t1 before adding to a
    // Expect: t1 = b * c; t2 = a + t1; res = t2
    const tacStr = result.tacText;
    expect(tacStr).toMatch(/t1 = b \* c/);
    expect(tacStr).toMatch(/t2 = a \+ t1/);
    expect(tacStr).toMatch(/res = t2/);
  });

  // Test 2: Parenthesized Expression: (a + b) * c
  it('2. Correctly enforces parenthesized expression precedence ((a + b) * c)', () => {
    const code = `
      int a = 1;
      int b = 2;
      int c = 3;
      int res = (a + b) * c;
    `;
    const result = compileSource(code);
    expect(result.success).toBe(true);

    // In postfix, (a + b) * c must be "a b + c *"
    const resPostfix = result.postfixList.find(p => p.sourceExpr.includes('res = ...'));
    expect(resPostfix?.postfixString).toBe('a b + c *');

    // In TAC, a + b must be computed first into t1, then multiplied by c
    const tacStr = result.tacText;
    expect(tacStr).toMatch(/t1 = a \+ b/);
    expect(tacStr).toMatch(/t2 = t1 \* c/);
    expect(tacStr).toMatch(/res = t2/);
  });

  // Test 3: Assignment and Declarations
  it('3. Translates variable declarations with and without initialization, and assignments', () => {
    const code = `
      int x;
      float pi = 3.14;
      x = 42;
    `;
    const result = compileSource(code);
    expect(result.success).toBe(true);
    expect(result.ast?.body.length).toBe(3);

    const tacStr = result.tacText;
    expect(tacStr).toMatch(/pi = 3\.14/);
    expect(tacStr).toMatch(/x = 42/);
  });

  // Test 4: If-Else Translation
  it('4. Translates if-else statement with labels, jumps, and short-circuit condition', () => {
    const code = `
      int x = 10;
      int y = 0;
      if (x > 5) {
        y = 1;
      } else {
        y = 2;
      }
    `;
    const result = compileSource(code);
    expect(result.success).toBe(true);

    const tac = result.tacInstructions;
    // Must contain conditional jump "if x > 5 goto L..."
    const ifJump = tac.find(i => i.op === 'if_goto' && i.arg1 === 'x' && i.arg2 === '5');
    expect(ifJump).toBeDefined();
    expect(ifJump?.target).toMatch(/^L\d+$/);

    // Must contain unconditional jump for else skip
    const elseSkip = tac.find(i => i.op === 'goto');
    expect(elseSkip).toBeDefined();

    // Must have backpatch events
    expect(result.backpatchEvents.length).toBeGreaterThan(0);
    expect(result.backpatchRecords.length).toBeGreaterThan(0);
  });

  // Test 5: While-Loop Translation
  it('5. Translates while-loop with header label, back-jump, and exit backpatching', () => {
    const code = `
      int count = 0;
      while (count < 10) {
        count = count + 1;
      }
    `;
    const result = compileSource(code);
    expect(result.success).toBe(true);

    const tac = result.tacInstructions;
    // Should have loop header label
    const labels = tac.filter(i => i.op === 'label');
    expect(labels.length).toBeGreaterThanOrEqual(2);

    // Loop must have a jump back to loop header
    const backJump = tac.find(i => i.op === 'goto' && i.target === labels[0].target);
    expect(backJump).toBeDefined();

    // Condition falselist must be patched to loop exit label
    const patchedExit = result.backpatchRecords.find(r => r.listType === 'falselist');
    expect(patchedExit).toBeDefined();
  });

  // Test 6: Nested Control Flow
  it('6. Correctly compiles nested control flow (if inside while loop)', () => {
    const code = `
      int i = 0;
      int sum = 0;
      while (i < 5) {
        if (i == 2) {
          sum = sum + 10;
        } else {
          sum = sum + 1;
        }
        i = i + 1;
      }
    `;
    const result = compileSource(code);
    expect(result.success).toBe(true);
    expect(result.stats.labelCount).toBeGreaterThanOrEqual(4);
    expect(result.stats.temporaryCount).toBeGreaterThan(0);

    // Ensure all goto statements have resolved target labels (not "_")
    for (const instr of result.tacInstructions) {
      if (instr.op === 'goto' || instr.op === 'if_goto') {
        expect(instr.target).toBeDefined();
        expect(instr.target).not.toBe('_');
      }
    }
  });

  // Test 7: Boolean AND/OR short-circuit translation and backpatching
  it('7. Emits correct short-circuit jumps and backpatches for (a < 10 && b > 20 || !c)', () => {
    const code = `
      int a = 5;
      int b = 25;
      int c = 0;
      int ans = 0;
      if (a < 10 && b > 20 || !c) {
        ans = 1;
      }
    `;
    const result = compileSource(code);
    expect(result.success).toBe(true);

    // Verify backpatching operations occurred: makelist, merge, backpatch
    const actions = result.backpatchEvents.map(e => e.action);
    expect(actions).toContain('makelist');
    expect(actions).toContain('merge');
    expect(actions).toContain('backpatch');

    // Every jump instruction in TAC must have a resolved label
    const jumps = result.tacInstructions.filter(i => i.op === 'goto' || i.op === 'if_goto');
    for (const j of jumps) {
      expect(j.target).toMatch(/^L\d+$/);
    }
  });

  // Test 8: Invalid Syntax and Lexical Errors
  it('8. Reports clear diagnostics for lexical and syntax errors without crashing or fabricating AST', () => {
    // 8a: Lexical error (unsupported character like '@')
    const badLex = `
      int x = 10 @ 5;
    `;
    const lexResult = compileSource(badLex);
    expect(lexResult.success).toBe(false);
    expect(lexResult.ast).toBeNull();
    expect(lexResult.diagnostics.length).toBeGreaterThan(0);
    expect(lexResult.diagnostics[0].phase).toBe('lexer');
    expect(lexResult.diagnostics[0].message).toContain('@');

    // 8b: Syntax error (missing semicolon)
    const badSyntax = `
      int a = 5
      int b = 10;
    `;
    const synResult = compileSource(badSyntax);
    expect(synResult.success).toBe(false);
    expect(synResult.ast).toBeNull();
    expect(synResult.diagnostics.length).toBeGreaterThan(0);
    expect(synResult.diagnostics.some(d => d.phase === 'parser')).toBe(true);

    // 8c: Unmatched parentheses
    const badParen = `
      int a = (5 + 3;
    `;
    const parenResult = compileSource(badParen);
    expect(parenResult.success).toBe(false);
    expect(parenResult.ast).toBeNull();
  });
});
