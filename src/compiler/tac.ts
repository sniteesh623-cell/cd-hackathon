// ============================================================================
// CompilerX — Three-Address Code Generator, SDT & Backpatching Engine
// Implements syntax-directed translation, synthesized/inherited attributes,
// boolean short-circuit evaluation, and makelist / merge / backpatch logic.
// ============================================================================

import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IdentifierNode,
  LiteralNode,
  TACInstruction,
  BackpatchEvent,
  BackpatchRecord,
  SDTAttributeTrace,
  TACOp,
} from './types';

interface BooleanAttr {
  truelist: number[];   // list of 1-based instruction indices
  falselist: number[];  // list of 1-based instruction indices
}

export class TACGenerator {
  private instructions: TACInstruction[] = [];
  private tempCount = 0;
  private labelCount = 0;
  private stepCount = 0;

  public backpatchEvents: BackpatchEvent[] = [];
  public backpatchRecords: BackpatchRecord[] = [];
  public sdtTraces: SDTAttributeTrace[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.instructions = [];
    this.tempCount = 0;
    this.labelCount = 0;
    this.stepCount = 0;
    this.backpatchEvents = [];
    this.backpatchRecords = [];
    this.sdtTraces = [];
  }

  // --------------------------------------------------------------------------
  // Helpers: Temporary & Label Generators
  // --------------------------------------------------------------------------

  private newTemp(): string {
    return `t${++this.tempCount}`;
  }

  private newLabel(): string {
    return `L${++this.labelCount}`;
  }

  public getTempCount(): number {
    return this.tempCount;
  }

  public getLabelCount(): number {
    return this.labelCount;
  }

  // Current next instruction index (1-based)
  private nextInstrIndex(): number {
    return this.instructions.length + 1;
  }

  // Emit an instruction
  private emit(
    op: TACOp,
    arg1?: string,
    arg2?: string,
    result?: string,
    target?: string,
    relop?: string,
    comment?: string,
    astNodeId?: string
  ): number {
    const idx = this.nextInstrIndex();
    const raw = this.formatInstruction(idx, op, arg1, arg2, result, target, relop);

    const instr: TACInstruction = {
      index: idx,
      op,
      arg1,
      arg2,
      result,
      target,
      relop,
      rawText: raw,
      comment,
      astNodeId,
    };

    this.instructions.push(instr);
    return idx;
  }

  private formatInstruction(
    idx: number,
    op: TACOp,
    arg1?: string,
    arg2?: string,
    result?: string,
    target?: string,
    relop?: string
  ): string {
    switch (op) {
      case 'label':
        return `${target}:`;
      case '=':
        return `${result} = ${arg1}`;
      case 'decl':
        return arg1 ? `${result} = ${arg1}` : `decl ${result}`;
      case '+':
      case '-':
      case '*':
      case '/':
        return `${result} = ${arg1} ${op} ${arg2}`;
      case 'uminus':
        return `${result} = -${arg1}`;
      case 'if_goto':
        return `if ${arg1} ${relop || '=='} ${arg2} goto ${target || '_'}`;
      case 'if_true_goto':
        return `if ${arg1} goto ${target || '_'}`;
      case 'if_false_goto':
        return `if !${arg1} goto ${target || '_'}`;
      case 'goto':
        return `goto ${target || '_'}`;
      case 'nop':
        return `nop`;
    }
  }

  // --------------------------------------------------------------------------
  // Backpatching Operations: makelist, merge, backpatch
  // --------------------------------------------------------------------------

  private makelist(instrIndex: number, listName?: 'truelist' | 'falselist', snippet?: string, nodeId?: string): number[] {
    const list = [instrIndex];
    this.backpatchEvents.push({
      step: ++this.stepCount,
      action: 'makelist',
      description: `makelist(${instrIndex}) created ${listName || 'list'} [${instrIndex}]`,
      listName,
      indices: list,
      conditionSnippet: snippet,
      astNodeId: nodeId,
    });
    return list;
  }

  private merge(p1: number[], p2: number[], listName?: 'truelist' | 'falselist', nodeId?: string): number[] {
    const merged = Array.from(new Set([...p1, ...p2]));
    this.backpatchEvents.push({
      step: ++this.stepCount,
      action: 'merge',
      description: `merge([${p1.join(', ')}], [${p2.join(', ')}]) -> [${merged.join(', ')}]`,
      listName,
      indices: merged,
      astNodeId: nodeId,
    });
    return merged;
  }

  private backpatch(list: number[], targetLabel: string, listType: 'truelist' | 'falselist' | 'nextlist' = 'truelist', explanation = ''): void {
    if (!list || list.length === 0) return;

    this.backpatchEvents.push({
      step: ++this.stepCount,
      action: 'backpatch',
      description: `backpatch([${list.join(', ')}], ${targetLabel}) ${explanation ? `— ${explanation}` : ''}`,
      listName: listType,
      indices: [...list],
      targetLabel,
    });

    for (const idx of list) {
      const instr = this.instructions.find(i => i.index === idx);
      if (instr) {
        const originalRaw = instr.rawText;
        instr.target = targetLabel;
        instr.rawText = this.formatInstruction(
          instr.index,
          instr.op,
          instr.arg1,
          instr.arg2,
          instr.result,
          instr.target,
          instr.relop
        );

        this.backpatchRecords.push({
          instructionIndex: idx,
          originalInstruction: originalRaw,
          patchedInstruction: instr.rawText,
          targetLabel,
          listType,
          condition: instr.comment || instr.rawText,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // SDT Attribute Trace Recorder
  // --------------------------------------------------------------------------

  private recordSDT(
    nodeId: string,
    nodeType: string,
    ruleApplied: string,
    attributeType: 'synthesized' | 'inherited',
    attributeName: string,
    attributeValue: string,
    explanation: string
  ): void {
    this.sdtTraces.push({
      step: ++this.stepCount,
      nodeId,
      nodeType,
      ruleApplied,
      attributeType,
      attributeName,
      attributeValue,
      explanation,
    });
  }

  // --------------------------------------------------------------------------
  // Program Generation Entry Point
  // --------------------------------------------------------------------------

  public generate(program: ProgramNode): {
    instructions: TACInstruction[];
    tacText: string;
    backpatchEvents: BackpatchEvent[];
    backpatchRecords: BackpatchRecord[];
    sdtTraces: SDTAttributeTrace[];
  } {
    this.reset();

    for (const stmt of program.body) {
      this.translateStatement(stmt);
    }

    // Number instructions cleanly
    const tacText = this.instructions
      .map(i => `${i.index}. ${i.rawText}`)
      .join('\n');

    return {
      instructions: this.instructions,
      tacText,
      backpatchEvents: this.backpatchEvents,
      backpatchRecords: this.backpatchRecords,
      sdtTraces: this.sdtTraces,
    };
  }

  // --------------------------------------------------------------------------
  // Statements Translation
  // --------------------------------------------------------------------------

  private translateStatement(stmt: StatementNode, nextLabel?: string): void {
    if (!stmt.attributes) stmt.attributes = {};

    switch (stmt.type) {
      case 'VarDeclaration': {
        this.recordSDT(
          stmt.id,
          'VarDeclaration',
          'S -> D ;',
          'synthesized',
          'type',
          stmt.dataType,
          `Declared ${stmt.dataType} variables`
        );

        for (const decl of stmt.declarations) {
          if (decl.init) {
            const initPlace = this.translateExpression(decl.init);
            this.emit('decl', initPlace, undefined, decl.id.name, undefined, undefined, `Init ${decl.id.name}`, stmt.id);
            this.recordSDT(
              decl.id.id,
              'VarDeclarator',
              'D -> id = E',
              'synthesized',
              'place',
              decl.id.name,
              `Initialized ${decl.id.name} with value in ${initPlace}`
            );
          } else {
            // Optional allocation note
            this.recordSDT(
              decl.id.id,
              'VarDeclarator',
              'D -> id',
              'synthesized',
              'place',
              decl.id.name,
              `Declared ${decl.id.name} without initialization`
            );
          }
        }
        break;
      }

      case 'AssignmentStatement': {
        const exprPlace = this.translateExpression(stmt.value);
        this.emit('=', exprPlace, undefined, stmt.target.name, undefined, undefined, `Assign to ${stmt.target.name}`, stmt.id);

        stmt.attributes.place = stmt.target.name;
        this.recordSDT(
          stmt.id,
          'AssignmentStatement',
          'S -> id = E ;',
          'synthesized',
          'place',
          stmt.target.name,
          `Computed ${stmt.value.type} into ${exprPlace}, assigned to variable ${stmt.target.name}`
        );
        break;
      }

      case 'IfStatement': {
        this.translateIfStatement(stmt, nextLabel);
        break;
      }

      case 'WhileStatement': {
        this.translateWhileStatement(stmt, nextLabel);
        break;
      }

      case 'BlockStatement': {
        this.translateBlockStatement(stmt, nextLabel);
        break;
      }

      case 'ExpressionStatement': {
        const place = this.translateExpression(stmt.expression);
        stmt.attributes.place = place;
        break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // If-Else Translation with Short-Circuit Backpatching
  // --------------------------------------------------------------------------

  private translateIfStatement(stmt: import('./types').IfStatementNode, inheritedNext?: string): void {
    const nextL = inheritedNext || this.newLabel();
    const trueLabel = this.newLabel();

    stmt.attributes = {
      ...stmt.attributes,
      next: nextL,
      begin: trueLabel,
    };

    this.recordSDT(
      stmt.id,
      'IfStatement',
      'S -> if ( B ) S1 [else S2]',
      'inherited',
      'next',
      nextL,
      `If statement inherits exit label ${nextL}`
    );

    // Translate Boolean condition B
    const bAttr = this.translateBooleanExpression(stmt.condition);

    // Emit trueLabel marker before consequent (S1)
    this.emit('label', undefined, undefined, undefined, trueLabel, undefined, `Target for B.truelist`);
    this.backpatch(bAttr.truelist, trueLabel, 'truelist', `Control passes to 'if' body on true condition`);

    if (stmt.alternate) {
      const falseLabel = this.newLabel();

      // Translate S1
      this.translateStatement(stmt.consequent, nextL);

      // Jump over alternate after executing consequent
      const skipAltIdx = this.emit('goto', undefined, undefined, undefined, undefined, undefined, `Jump over else body`);

      // Emit falseLabel marker before alternate (S2)
      this.emit('label', undefined, undefined, undefined, falseLabel, undefined, `Target for B.falselist`);
      this.backpatch(bAttr.falselist, falseLabel, 'falselist', `Control passes to 'else' body on false condition`);

      // Translate S2
      this.translateStatement(stmt.alternate, nextL);

      // Backpatch the skip jump to exit
      this.backpatch([skipAltIdx], nextL, 'nextlist', `After 'if' body, jump to statement exit`);

      // Emit exit label if not inherited or at end
      if (!inheritedNext) {
        this.emit('label', undefined, undefined, undefined, nextL, undefined, `Exit label for if-else`);
      }
    } else {
      // No else branch: false jumps directly to exit
      this.translateStatement(stmt.consequent, nextL);
      this.backpatch(bAttr.falselist, nextL, 'falselist', `No else branch: jump directly to exit label`);

      if (!inheritedNext) {
        this.emit('label', undefined, undefined, undefined, nextL, undefined, `Exit label for if`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // While Translation with Backpatching
  // --------------------------------------------------------------------------

  private translateWhileStatement(stmt: import('./types').WhileStatementNode, inheritedNext?: string): void {
    const beginLabel = this.newLabel();
    const bodyLabel = this.newLabel();
    const exitLabel = inheritedNext || this.newLabel();

    stmt.attributes = {
      ...stmt.attributes,
      begin: beginLabel,
      next: exitLabel,
    };

    this.recordSDT(
      stmt.id,
      'WhileStatement',
      'S -> while ( B ) S1',
      'inherited',
      'begin',
      beginLabel,
      `Loop header target set to ${beginLabel}`
    );
    this.recordSDT(
      stmt.id,
      'WhileStatement',
      'S -> while ( B ) S1',
      'inherited',
      'next',
      exitLabel,
      `Loop exit target set to ${exitLabel}`
    );

    // Emit loop header label
    this.emit('label', undefined, undefined, undefined, beginLabel, undefined, `Loop header`);

    // Translate Boolean condition B
    const bAttr = this.translateBooleanExpression(stmt.condition);

    // Emit body label
    this.emit('label', undefined, undefined, undefined, bodyLabel, undefined, `Loop body start`);
    this.backpatch(bAttr.truelist, bodyLabel, 'truelist', `Condition true: execute loop body`);

    // Translate loop body S1
    this.translateStatement(stmt.body, beginLabel);

    // Jump back to loop header
    this.emit('goto', undefined, undefined, undefined, beginLabel, undefined, `Loop back to header`);

    // Backpatch falselist to exitLabel
    this.backpatch(bAttr.falselist, exitLabel, 'falselist', `Condition false: exit loop`);

    if (!inheritedNext) {
      this.emit('label', undefined, undefined, undefined, exitLabel, undefined, `Loop exit`);
    }
  }

  // --------------------------------------------------------------------------
  // Block Statement Translation
  // --------------------------------------------------------------------------

  private translateBlockStatement(stmt: import('./types').BlockStatementNode, nextLabel?: string): void {
    for (let i = 0; i < stmt.body.length; i++) {
      const isLast = i === stmt.body.length - 1;
      this.translateStatement(stmt.body[i], isLast ? nextLabel : undefined);
    }
  }

  // --------------------------------------------------------------------------
  // Boolean Expression Translation (Short-Circuit Evaluation)
  // --------------------------------------------------------------------------

  private translateBooleanExpression(expr: ExpressionNode): BooleanAttr {
    if (!expr.attributes) expr.attributes = {};

    // 1. Logical OR: B1 || B2
    if (expr.type === 'BinaryExpression' && expr.operator === '||') {
      const b1 = this.translateBooleanExpression(expr.left);
      
      // Marker label for B2
      const mLabel = this.newLabel();
      this.emit('label', undefined, undefined, undefined, mLabel, undefined, `Marker for right branch of ||`);
      this.backpatch(b1.falselist, mLabel, 'falselist', `Short-circuit ||: if left is false, evaluate right`);

      const b2 = this.translateBooleanExpression(expr.right);

      const truelist = this.merge(b1.truelist, b2.truelist, 'truelist', expr.id);
      const falselist = b2.falselist;

      expr.attributes.truelist = truelist;
      expr.attributes.falselist = falselist;

      this.recordSDT(
        expr.id,
        'BinaryExpression (||)',
        'B -> B1 || M B2',
        'synthesized',
        'truelist, falselist',
        `truelist=[${truelist.join(', ')}], falselist=[${falselist.join(', ')}]`,
        `Short-circuit OR: merged truelists; falselist = B2.falselist`
      );

      return { truelist, falselist };
    }

    // 2. Logical AND: B1 && B2
    if (expr.type === 'BinaryExpression' && expr.operator === '&&') {
      const b1 = this.translateBooleanExpression(expr.left);

      // Marker label for B2
      const mLabel = this.newLabel();
      this.emit('label', undefined, undefined, undefined, mLabel, undefined, `Marker for right branch of &&`);
      this.backpatch(b1.truelist, mLabel, 'truelist', `Short-circuit &&: if left is true, evaluate right`);

      const b2 = this.translateBooleanExpression(expr.right);

      const truelist = b2.truelist;
      const falselist = this.merge(b1.falselist, b2.falselist, 'falselist', expr.id);

      expr.attributes.truelist = truelist;
      expr.attributes.falselist = falselist;

      this.recordSDT(
        expr.id,
        'BinaryExpression (&&)',
        'B -> B1 && M B2',
        'synthesized',
        'truelist, falselist',
        `truelist=[${truelist.join(', ')}], falselist=[${falselist.join(', ')}]`,
        `Short-circuit AND: merged falselists; truelist = B2.truelist`
      );

      return { truelist, falselist };
    }

    // 3. Logical NOT: ! B1
    if (expr.type === 'UnaryExpression' && expr.operator === '!') {
      const b1 = this.translateBooleanExpression(expr.argument);
      const truelist = b1.falselist;
      const falselist = b1.truelist;

      expr.attributes.truelist = truelist;
      expr.attributes.falselist = falselist;

      this.recordSDT(
        expr.id,
        'UnaryExpression (!)',
        'B -> ! B1',
        'synthesized',
        'truelist, falselist',
        `truelist=[${truelist.join(', ')}], falselist=[${falselist.join(', ')}]`,
        `Inverted truelist and falselist for Boolean NOT`
      );

      return { truelist, falselist };
    }

    // 4. Relational Expression: E1 relop E2 (<, <=, >, >=, ==, !=)
    if (
      expr.type === 'BinaryExpression' &&
      ['<', '<=', '>', '>=', '==', '!='].includes(expr.operator)
    ) {
      const leftPlace = this.translateExpression(expr.left);
      const rightPlace = this.translateExpression(expr.right);

      const condStr = `${leftPlace} ${expr.operator} ${rightPlace}`;

      const ifIdx = this.emit(
        'if_goto',
        leftPlace,
        rightPlace,
        undefined,
        undefined,
        expr.operator,
        condStr,
        expr.id
      );

      const gotoIdx = this.emit(
        'goto',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        `False jump for ${condStr}`,
        expr.id
      );

      const truelist = this.makelist(ifIdx, 'truelist', condStr, expr.id);
      const falselist = this.makelist(gotoIdx, 'falselist', `not (${condStr})`, expr.id);

      expr.attributes.truelist = truelist;
      expr.attributes.falselist = falselist;

      this.recordSDT(
        expr.id,
        'BinaryExpression (Relational)',
        'B -> E1 relop E2',
        'synthesized',
        'truelist, falselist',
        `truelist=[${truelist}], falselist=[${falselist}]`,
        `Emitted conditional jump at #${ifIdx} and unconditional jump at #${gotoIdx}`
      );

      return { truelist, falselist };
    }

    // 5. Single primary expression as condition (e.g., if (x))
    const place = this.translateExpression(expr);
    const ifIdx = this.emit(
      'if_goto',
      place,
      '0',
      undefined,
      undefined,
      '!=',
      `${place} != 0`,
      expr.id
    );
    const gotoIdx = this.emit(
      'goto',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `${place} == 0`,
      expr.id
    );

    const truelist = this.makelist(ifIdx, 'truelist', `${place} != 0`, expr.id);
    const falselist = this.makelist(gotoIdx, 'falselist', `${place} == 0`, expr.id);

    expr.attributes.truelist = truelist;
    expr.attributes.falselist = falselist;

    return { truelist, falselist };
  }

  // --------------------------------------------------------------------------
  // Arithmetic Expression Translation (Synthesized place / temporaries)
  // --------------------------------------------------------------------------

  private translateExpression(expr: ExpressionNode): string {
    if (!expr.attributes) expr.attributes = {};

    switch (expr.type) {
      case 'Literal': {
        const place = expr.raw;
        expr.attributes.place = place;
        expr.attributes.type = expr.dataType;
        this.recordSDT(
          expr.id,
          'Literal',
          'E -> num',
          'synthesized',
          'place',
          place,
          `Literal value ${place} synthesized as operand`
        );
        return place;
      }

      case 'Identifier': {
        const place = expr.name;
        expr.attributes.place = place;
        this.recordSDT(
          expr.id,
          'Identifier',
          'E -> id',
          'synthesized',
          'place',
          place,
          `Variable identifier ${place} synthesized as operand`
        );
        return place;
      }

      case 'UnaryExpression': {
        if (expr.operator === '-') {
          const argPlace = this.translateExpression(expr.argument);
          const temp = this.newTemp();
          this.emit('uminus', argPlace, undefined, temp, undefined, undefined, `Unary minus: ${temp} = -${argPlace}`, expr.id);

          expr.attributes.place = temp;
          this.recordSDT(
            expr.id,
            'UnaryExpression',
            'E -> - E1',
            'synthesized',
            'place',
            temp,
            `Allocated temp ${temp} = -${argPlace}`
          );
          return temp;
        }
        // If '!' used in value context: compute 1 or 0 via short-circuit
        return this.translateBooleanToValue(expr);
      }

      case 'BinaryExpression': {
        // Arithmetic operators: +, -, *, /
        if (['+', '-', '*', '/'].includes(expr.operator)) {
          const leftPlace = this.translateExpression(expr.left);
          const rightPlace = this.translateExpression(expr.right);
          const temp = this.newTemp();

          this.emit(
            expr.operator as TACOp,
            leftPlace,
            rightPlace,
            temp,
            undefined,
            undefined,
            `${temp} = ${leftPlace} ${expr.operator} ${rightPlace}`,
            expr.id
          );

          expr.attributes.place = temp;
          this.recordSDT(
            expr.id,
            'BinaryExpression (Arithmetic)',
            `E -> E1 ${expr.operator} E2`,
            'synthesized',
            'place',
            temp,
            `Synthesized new temp ${temp} = ${leftPlace} ${expr.operator} ${rightPlace}`
          );
          return temp;
        }

        // Relational or Boolean operators used in an assignment context
        return this.translateBooleanToValue(expr);
      }
    }
  }

  // Converts a boolean condition expression into an integer value (0 or 1)
  private translateBooleanToValue(expr: ExpressionNode): string {
    const bAttr = this.translateBooleanExpression(expr);
    const temp = this.newTemp();
    const trueL = this.newLabel();
    const nextL = this.newLabel();

    this.emit('label', undefined, undefined, undefined, trueL, undefined, `Bool true branch`);
    this.backpatch(bAttr.truelist, trueL, 'truelist', `Assign 1 on condition true`);
    this.emit('=', '1', undefined, temp, undefined, undefined, `${temp} = 1`);
    this.emit('goto', undefined, undefined, undefined, nextL, undefined, `Jump to end of boolean expr`);

    const falseL = this.newLabel();
    this.emit('label', undefined, undefined, undefined, falseL, undefined, `Bool false branch`);
    this.backpatch(bAttr.falselist, falseL, 'falselist', `Assign 0 on condition false`);
    this.emit('=', '0', undefined, temp, undefined, undefined, `${temp} = 0`);

    this.emit('label', undefined, undefined, undefined, nextL, undefined, `End of boolean expr evaluation`);

    expr.attributes = {
      ...expr.attributes,
      place: temp,
    };

    return temp;
  }
}
