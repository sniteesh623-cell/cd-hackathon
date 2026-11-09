// ============================================================================
// CompilerX — Sample Programs
// Bundled real-world programs exercising every aspect of the compiler pipeline
// ============================================================================

export interface SampleProgram {
  id: string;
  name: string;
  category: 'Arithmetic' | 'Control Flow' | 'Booleans' | 'Optimization' | 'Complex';
  description: string;
  code: string;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'arithmetic-basic',
    name: '1. Basic Arithmetic & Precedence',
    category: 'Arithmetic',
    description: 'Demonstrates multiplication higher precedence over addition, temporary variable allocation (t1, t2), and postorder postfix generation.',
    code: `// Sample 1: Basic Arithmetic & Precedence
int a = 5;
int b = 10;
int c = 20;

// Multiplication happens before addition: t1 = b * c, t2 = a + t1
int result = a + b * c;
int x = result + 100;
`,
  },
  {
    id: 'arithmetic-parentheses',
    name: '2. Parentheses & Float Arithmetic',
    category: 'Arithmetic',
    description: 'Shows parenthesized grouping forcing addition before multiplication, float literal types, and unary minus.',
    code: `// Sample 2: Parentheses & Float Arithmetic
float a = 12.5;
float b = 3.5;
float c = 2.0;

// Parentheses override default precedence:
float val = (a + b) * (c - 1.0) / 4.0;
float negVal = -val + 50.0;
`,
  },
  {
    id: 'if-else-relational',
    name: '3. If-Else with Relational Condition',
    category: 'Control Flow',
    description: 'Illustrates relational test (<, >, ==), jump instruction generation, true and false branches, and exit backpatching.',
    code: `// Sample 3: If-Else Statement
int x = 15;
int max = 0;

if (x > 10) {
    max = x;
} else {
    max = 10;
}
`,
  },
  {
    id: 'while-loop',
    name: '4. While Loop Accumulator',
    category: 'Control Flow',
    description: 'Generates loop header label, condition test, body execution, unconditional jump back to header, and falselist backpatching to exit label.',
    code: `// Sample 4: While Loop Accumulator
int i = 0;
int sum = 0;

while (i < 10) {
    sum = sum + i;
    i = i + 1;
}
`,
  },
  {
    id: 'boolean-short-circuit',
    name: '5. Short-Circuit Booleans (&&, ||, !)',
    category: 'Booleans',
    description: 'Dragon Book Boolean backpatching: short-circuit jump lists, makelist, merge, and backpatch operations for compound conditions.',
    code: `// Sample 5: Short-Circuit Boolean Evaluation
int a = 5;
int b = 25;
int flag = 0;
int outcome = 0;

if (a < 10 && b > 20 || !flag) {
    outcome = 1;
} else {
    outcome = 2;
}
`,
  },
  {
    id: 'nested-control-flow',
    name: '6. Nested Control Flow (While + If)',
    category: 'Complex',
    description: 'Complex nested constructs showing multiple levels of inherited next labels and label management.',
    code: `// Sample 6: Nested Control Flow
int i = 0;
int total = 0;

while (i < 5) {
    if (i == 2) {
        total = total + 10;
    } else {
        total = total + 1;
    }
    i = i + 1;
}
`,
  },
  {
    id: 'opt-benchmark',
    name: '7. Optimization Benchmark (Folding, CSE & DCE)',
    category: 'Optimization',
    description: 'Exercises Constant Folding (2+3*4), Algebraic Simplification (x*1, y+0), Common Subexpression Elimination, and Dead Code Elimination.',
    code: `// Sample 7: Optimization Benchmark
int a = 2 + 3 * 4;
int b = 10;
int x = (a + b) * 1;
int y = (a + b) + 0;
int deadVal = a * 100;
int finalRes = x + y;
`,
  },
  {
    id: 'fibonacci-vm',
    name: '8. Fibonacci Generator (VM Execution & Loops)',
    category: 'Complex',
    description: 'Generates first N terms of Fibonacci sequence. Perfect for stepping through in the TAC Virtual Machine & Debugger.',
    code: `// Sample 8: Fibonacci Sequence Calculator
int n = 7;
int first = 0;
int second = 1;
int count = 2;
int next = 0;

while (count <= n) {
    next = first + second;
    first = second;
    second = next;
    count = count + 1;
}
`,
  },
  {
    id: 'scoping-semantics',
    name: '9. Scoping, Shadowing & Diagnostics',
    category: 'Complex',
    description: 'Demonstrates lexical scoping hierarchies, variable shadowing in inner blocks, and static diagnostic warnings for unused variables.',
    code: `// Sample 9: Lexical Scoping & Shadowing
int x = 100;
int unusedVar = 42;

{
    int x = 200;
    int innerVal = x + 50;
}

int finalX = x + 10;
`,
  },
];
