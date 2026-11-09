# CompilerX — Visual Compiler Workbench
**Problem Statement PS-06: ThreeAddrGen (Compiler Design Hackathon)**

CompilerX is a full-stack, educational mini-compiler and interactive visual workbench built with **React 19, TypeScript, and Vite**. It translates a restricted, strongly-typed C-like language into an **Abstract Syntax Tree (AST)**, **Postfix Notation**, and **Three-Address Code (TAC)**, demonstrating **Syntax-Directed Translation (SDT)**, synthesized/inherited attributes, and **Dragon Book Boolean short-circuit evaluation with backpatching**.

All compiler phases run client-side in pure TypeScript with zero external APIs, zero backend dependencies, and zero mocked/fabricated outputs.

---

## Key Features

1. **Deterministic Compiler Pipeline**:
   - **Lexical Analyzer (Lexer)**: Tokenizes keywords, identifiers, integer/float literals, arithmetic/relational/logical operators, comments (`//` and `/* */`), with 1-based line and column tracking.
   - **Recursive Descent Parser**: Builds a strongly-typed AST with operator precedence climbing across 7 levels.
   - **Postfix Generator**: Traverses expression AST subtrees in postorder (Left, Right, Root) to generate postfix representation without parentheses.
   - **Three-Address Code Generator**: Emits numbered TAC quadruples using temporary variables (`t1`, `t2`, ...) and labels (`L1`, `L2`, ...).
   - **Syntax-Directed Definition (SDD)**: Tracks synthesized attributes (`place`, `type`, `postfix`) and inherited attributes (`begin`, `next`).
   - **Dragon Book Boolean Backpatching**: Implements `makelist`, `merge`, and `backpatch` for short-circuit evaluation of `&&`, `||`, and `!`.

2. **Professional Developer Tool Interface**:
   - Dark IDE aesthetic inspired by JetBrains, Compiler Explorer, and VS Code.
   - Live source code editor with line numbers, error indicators, cursor position tracking, and keyboard shortcuts (`⌘/Ctrl + Enter` to compile, `Tab` for 2-space indentation).
   - Preset selector with 6 real-world programs covering arithmetic precedence, parenthesized floats, if-else, while loops, Boolean short-circuits, and nested control flow.

3. **Multi-Tab Workbench**:
   - **AST Visualization**: Expandable/collapsible interactive tree hierarchy with color-coded node type badges, real-time node inspector drawer, search filtering, and raw JSON AST toggle.
   - **Three-Address Code (TAC)**: Dual view modes (Numbered Listing & Quadruples Table), syntax-highlighted tokens, copy-to-clipboard, `.tac` file download, and backpatched jump highlighting.
   - **Postfix Notation**: Expression-by-expression breakdown with an **interactive stack evaluation simulator** (Step, Pause, Auto-Play) showing operand pushes and operator applications.
   - **SDT & Backpatching Trace**: Live backpatching event sequence, patched jump instructions table, SDT attribute inspector, and compilation pipeline timeline.
   - **Grammar & Specification Guide**: Interactive modal detailing the BNF grammar, precedence table, SDD rules, and backpatching mechanisms.

4. **Robust Diagnostics & Zero Fake Results**:
   - Immediate detection of lexical errors (invalid characters, unterminated comments) and syntax errors (missing semicolons, unmatched braces/parentheses).
   - Exact line and column pointers with code snippet caret indicators (`^`).
   - If parsing fails, no fabricated AST or TAC is displayed.

---

## Supported Language Subset

CompilerX deliberately targets a well-defined, educational C-like subset:

### 1. Data Types & Declarations
- `int`: Signed integers (e.g., `int x = 10;`, `int a, b = 2;`)
- `float`: IEEE floating-point numbers (e.g., `float pi = 3.14;`)

### 2. Operators & Precedence (Lowest to Highest)
| Level | Operator | Description | Associativity |
|---|---|---|---|
| 1 | `\|\|` | Logical OR (short-circuit) | Left |
| 2 | `&&` | Logical AND (short-circuit) | Left |
| 3 | `==`, `!=` | Equality & Inequality | Left |
| 4 | `<`, `<=`, `>`, `>=` | Relational Comparisons | Left |
| 5 | `+`, `-` | Additive Operators | Left |
| 6 | `*`, `/` | Multiplicative Operators | Left |
| 7 | `!`, `-` (unary) | Logical NOT & Unary Negation | Right |
| 8 | `( ... )` | Parentheses / Primary expressions | N/A |

### 3. Control Flow Statements
- `if (condition) stmt`
- `if (condition) stmt else stmt`
- `while (condition) stmt`
- `{ stmt1; stmt2; ... }` (Block statements)
- `identifier = expression;` (Assignments)

---

## Boolean Short-Circuit Evaluation & Backpatching

CompilerX implements the standard **Dragon Book (Aho, Lam, Sethi, Ullman)** backpatching scheme:

- **Attributes of Boolean Condition `B`**:
  - `B.truelist`: List of instruction addresses containing jumps to the true destination once known.
  - `B.falselist`: List of instruction addresses containing jumps to the false destination once known.
- **Backpatching Operations**:
  - `makelist(i)`: Creates a list containing single instruction address `i`.
  - `merge(p1, p2)`: Combines lists `p1` and `p2`.
  - `backpatch(p, L)`: Inserts label `L` as the jump target for all instructions in address list `p`.

### Production Semantic Actions:
- **`B -> B1 || M B2`**:
  ```text
  backpatch(B1.falselist, M.label);
  B.truelist = merge(B1.truelist, B2.truelist);
  B.falselist = B2.falselist;
  ```
- **`B -> B1 && M B2`**:
  ```text
  backpatch(B1.truelist, M.label);
  B.truelist = B2.truelist;
  B.falselist = merge(B1.falselist, B2.falselist);
  ```
- **`B -> ! B1`**:
  ```text
  B.truelist = B1.falselist;
  B.falselist = B1.truelist;
  ```
- **`B -> E1 relop E2`**:
  ```text
  i = emit('if', E1.place, relop, E2.place, 'goto _');
  j = emit('goto _');
  B.truelist = makelist(i);
  B.falselist = makelist(j);
  ```

---

## Project Structure

```
CD HACKATHON/
├── index.html                  # HTML entry point with metadata
├── package.json                # Dependencies: React 19, Lucide, Vitest, Vite
├── tsconfig.json               # TypeScript workspace config
├── vite.config.ts              # Vite bundler config
├── src/
│   ├── main.tsx                # React DOM root render
│   ├── App.tsx                 # Main application state and layout
│   ├── App.css                 # Comprehensive dark IDE workbench styling
│   ├── index.css               # Design system tokens and custom scrollbars
│   ├── compiler/
│   │   ├── types.ts            # Discriminated unions for AST, TAC, Tokens, SDT
│   │   ├── lexer.ts            # Tokenizer with line/col tracking
│   │   ├── parser.ts           # Recursive-descent parser with precedence climbing
│   │   ├── postfix.ts          # Postorder expression traversal
│   │   ├── tac.ts              # TAC generator, SDT attributes & backpatching
│   │   ├── index.ts            # Compiler pipeline coordinator
│   │   ├── samples.ts          # Bundled sample programs
│   │   └── __tests__/
│   │       └── compiler.test.ts # 8 comprehensive Vitest integration tests
│   └── components/
│       ├── Header.tsx          # Top bar with status and controls
│       ├── EditorPanel.tsx     # Gutter, line numbers, error highlights
│       ├── ASTVisualizer.tsx   # Interactive tree hierarchy & node inspector
│       ├── TACViewer.tsx       # Numbered listing, quads table, copy/download
│       ├── PostfixViewer.tsx   # Postfix list & interactive stack simulator
│       ├── TranslationTrace.tsx# Backpatching logs, SDT inspector & timeline
│       ├── DiagnosticsBar.tsx  # Bottom metrics dock & error alerts
│       └── HelpModal.tsx       # Grammar and backpatching specification modal
```

---

## Ascension Platform (CompilerX v2.0 Upgrades)

CompilerX has been elevated into a full compiler engineering and static analysis workbench:

1. **Advanced Semantic Analysis & Symbol Tables**:
   - Hierarchical lexical scoping tree (`scope_0`, `scope_1`, ...) with parent/child pointers.
   - Comprehensive symbol tables tracking identifier, data type (`int`, `float`), declared line/column, initialization status, and read/write reference counts.
   - Real-time diagnostics for duplicate declarations in same scope, undeclared identifier access, and uninitialized reads.

2. **Control Flow Graph (CFG) Engine**:
   - Leader identification and basic block partitioner (`B0`, `B1`, ...).
   - Computes dominator sets $\text{Dom}(B)$ and Immediate Dominators ($\text{IDom}$) via fixed-point iteration.
   - Detects natural loops via back-edges ($A \to B$ where $B \text{ dom } A$).
   - Interactive card-based flow graph with color-coded branch edges (True, False, Fallthrough).

3. **Data-Flow Analysis Engine**:
   - **Reaching Definitions**: Forward May-analysis ($\text{GEN}$, $\text{KILL}$, $\text{IN}$, $\text{OUT}$).
   - **Live Variables**: Backward May-analysis ($\text{USE}$, $\text{DEF}$, $\text{IN}$, $\text{OUT}$).
   - Step-by-step fixed-point iteration carousel showing lattice convergence round by round.

4. **TAC Optimization Lab**:
   - **Constant Folding**: Evaluates constant arithmetic and comparison expressions at compile-time.
   - **Constant Propagation**: Propagates known constants into variable and temporary uses.
   - **Algebraic Identities**: Simplifies $x + 0 \to x$, $x \times 1 \to x$, $x \times 0 \to 0$, $x / 1 \to x$.
   - **Copy Propagation**: Eliminates redundant intermediate variable copies.
   - **Common Subexpression Elimination (CSE)**: Value numbering within basic blocks.
   - **Dead Code Elimination (DCE)**: Prunes assignments to unused temporaries.
   - Side-by-side diff view with code reduction percentage and temporary savings counters.

5. **TAC Virtual Machine & Debugger**:
   - In-browser runtime engine with program counter, environment memory store, and execution limits.
   - Stepping controls: Run, Pause, Step Next, Reset, and speed slider.
   - **Time-Travel Debugging**: Step Backward using reversible execution snapshots.
   - Interactive breakpoints by clicking line numbers in the instruction gutter.
   - Live Variable & Register Watch window with real-time value updates.

6. **Compiler Analytics & Audit Exporter**:
   - Computes **McCabe Cyclomatic Complexity** ($M = E - N + 2P$).
   - Calculates AST tree depth, instruction density, and peak temporary register pressure.
   - One-click export of comprehensive Markdown audit reports (`.md`) and JSON compilation artifacts (`.json`).

---

## 10 Integrated Workspaces

1. **Three-Address Code (TAC)**: Dual view of generated instructions & quadruples table.
2. **AST Visualizer**: Interactive collapsible syntax tree with search and node inspector.
3. **Symbol Table**: Scoping hierarchy tree, symbol table matrix, and static diagnostics.
4. **Control Flow Graph**: Basic blocks layout, dominator tree table, and loop analysis.
5. **Data-Flow Analysis**: Reaching definitions & live variables matrices with iteration slider.
6. **Optimizer Lab**: Pass toggles, pass transformation audit log, and side-by-side diff.
7. **VM & Debugger**: In-browser execution engine, time-travel stepper, and live watch window.
8. **Postfix Notation**: Postfix expressions with interactive stack evaluation simulator.
9. **SDT & Backpatching**: Dragon Book `makelist`, `merge`, and `backpatch` event timelines.
10. **Analytics & Audit**: Complexity metrics, pipeline characteristics, and report export.

---

## Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite
Runs all 14 compiler unit, integration, and optimization tests:
```bash
npm test
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## Verification Test Scenarios (14 Automated Tests)

The automated test suites (`src/compiler/__tests__/compiler.test.ts` & `src/compiler/__tests__/ascension.test.ts`) verify:
1. **Arithmetic Operator Precedence**: `a + b * c` generates `t1 = b * c; t2 = a + t1`. Postfix: `a b c * +`.
2. **Parenthesized Expressions**: `(a + b) * c` generates `t1 = a + b; t2 = t1 * c`. Postfix: `a b + c *`.
3. **Declarations & Assignments**: Handles uninitialized declarations, initializations, and reassignments.
4. **If-Else Translation**: Emits condition jumps, then-branch label, skip jump, else-branch label, and exit label.
5. **While-Loop Translation**: Emits loop header label, condition test, body execution, unconditional backward jump, and exit backpatching.
6. **Nested Control Flow**: Nested while loops with inner if-else constructs, ensuring all labels and jumps are resolved.
7. **Boolean AND/OR Short-Circuiting**: Tests `(a < 10 && b > 20 || !c)` verifying `makelist`, `merge`, and `backpatch` actions.
8. **Diagnostics & Error Handling**: Invalid characters and syntax errors return precise line/column locations without fabricating AST/TAC.
9. **Semantic Scoping & Duplicate Declarations**: Tracks lexical scopes, variable shadowing in inner blocks, and flags redeclarations.
10. **Control Flow Graph Engine**: Identifies leaders, basic blocks, computes dominators, and detects natural loop back-edges.
11. **Data-Flow Analysis**: Computes Reaching Definitions and Live Variables across iterative fixed-point passes.
12. **Optimizer Lab**: Folds constants, simplifies algebraic identities, eliminates common subexpressions and dead temporaries.
13. **Virtual Machine Runtime**: Executes TAC instructions deterministically with environment memory updates.
14. **Optimization Semantic Equivalence**: Proves that executing original vs. optimized TAC on the VM yields identical final memory state.

