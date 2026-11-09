// ============================================================================
// CompilerX — ASTVisualizer Component
// Interactive hierarchical AST visualizer with expandable nodes, badges,
// SDT attributes inspection, node search, and JSON view toggle.
// ============================================================================

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Code2,
  Search,
  Maximize2,
  Minimize2,
  FileJson,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ProgramNode,
  ASTNode,
  StatementNode,
  ExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IdentifierNode,
  LiteralNode,
  VarDeclarationNode,
  AssignmentStatementNode,
  IfStatementNode,
  WhileStatementNode,
  BlockStatementNode,
} from '../compiler/types';

interface ASTVisualizerProps {
  ast: ProgramNode | null;
}

export const ASTVisualizer: React.FC<ASTVisualizerProps> = ({ ast }) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<ASTNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'json'>('tree');

  if (!ast) {
    return (
      <div className="empty-state-card">
        <Layers size={36} className="text-dim mb-3" />
        <h3 className="empty-title">No Abstract Syntax Tree</h3>
        <p className="empty-desc">
          Enter valid C-like source code and press <strong>Run Compiler</strong> to generate and visualize the AST hierarchy.
        </p>
      </div>
    );
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: prev[nodeId] === undefined ? false : !prev[nodeId],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    const collectIds = (node: ASTNode) => {
      allExpanded[node.id] = true;
      getChildren(node).forEach(child => collectIds(child.node));
    };
    collectIds(ast);
    setExpandedNodes(allExpanded);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  return (
    <div className="ast-visualizer-container">
      {/* Visualizer Top Toolbar */}
      <div className="ast-toolbar">
        <div className="ast-toolbar-left">
          {/* Search filter */}
          <div className="search-input-wrapper">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Filter nodes by type or identifier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
              id="ast-search-input"
            />
          </div>

          <button
            onClick={expandAll}
            className="btn btn-secondary btn-sm"
            title="Expand All Nodes"
          >
            <Maximize2 size={12} />
            <span>Expand All</span>
          </button>

          <button
            onClick={collapseAll}
            className="btn btn-secondary btn-sm"
            title="Collapse All Nodes"
          >
            <Minimize2 size={12} />
            <span>Collapse</span>
          </button>
        </div>

        <div className="ast-toolbar-right">
          <div className="view-mode-toggle">
            <button
              onClick={() => setViewMode('tree')}
              className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
              title="Tree Hierarchy View"
            >
              <Layers size={13} />
              <span>Tree</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`toggle-btn ${viewMode === 'json' ? 'active' : ''}`}
              title="Raw JSON AST View"
            >
              <FileJson size={13} />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ast-content-layout">
        {viewMode === 'json' ? (
          <div className="json-ast-viewer font-mono">
            <pre>{JSON.stringify(ast, null, 2)}</pre>
          </div>
        ) : (
          <div className="ast-tree-scroll-pane">
            <div className="tree-root">
              <TreeNodeItem
                node={ast}
                label="Program"
                isRoot={true}
                expandedNodes={expandedNodes}
                onToggle={toggleNode}
                onSelect={setSelectedNode}
                selectedNodeId={selectedNode?.id}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        )}

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="node-inspector-drawer">
            <div className="inspector-header">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-cyan" />
                <span className="font-semibold">Node Inspector</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <div className="inspector-body font-mono">
              <div className="inspector-row">
                <span className="inspector-label">Type:</span>
                <span className="inspector-value badge badge-cyan">{selectedNode.type}</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-label">Node ID:</span>
                <span className="inspector-value text-secondary">{selectedNode.id}</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-label">Location:</span>
                <span className="inspector-value text-secondary">
                  Line {selectedNode.loc.line}, Col {selectedNode.loc.column}
                </span>
              </div>

              {/* Attributes Section */}
              {selectedNode.attributes && (
                <div className="inspector-section">
                  <span className="inspector-section-title">
                    <Sparkles size={12} className="text-amber" /> SDT Attributes:
                  </span>
                  {selectedNode.attributes.place && (
                    <div className="attr-pill attr-place">
                      <span className="attr-key">place (temp/var):</span>
                      <span className="attr-val font-bold">{selectedNode.attributes.place}</span>
                    </div>
                  )}
                  {selectedNode.attributes.postfix && (
                    <div className="attr-pill attr-postfix">
                      <span className="attr-key">postfix:</span>
                      <span className="attr-val font-bold">{selectedNode.attributes.postfix}</span>
                    </div>
                  )}
                  {selectedNode.attributes.truelist && selectedNode.attributes.truelist.length > 0 && (
                    <div className="attr-pill attr-truelist">
                      <span className="attr-key">truelist:</span>
                      <span className="attr-val font-bold">[{selectedNode.attributes.truelist.join(', ')}]</span>
                    </div>
                  )}
                  {selectedNode.attributes.falselist && selectedNode.attributes.falselist.length > 0 && (
                    <div className="attr-pill attr-falselist">
                      <span className="attr-key">falselist:</span>
                      <span className="attr-val font-bold">[{selectedNode.attributes.falselist.join(', ')}]</span>
                    </div>
                  )}
                  {selectedNode.attributes.begin && (
                    <div className="attr-pill attr-inherited">
                      <span className="attr-key">begin label (inherited):</span>
                      <span className="attr-val font-bold">{selectedNode.attributes.begin}</span>
                    </div>
                  )}
                  {selectedNode.attributes.next && (
                    <div className="attr-pill attr-inherited">
                      <span className="attr-key">next label (inherited):</span>
                      <span className="attr-val font-bold">{selectedNode.attributes.next}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Recursive Tree Node Component
// ----------------------------------------------------------------------------

interface ChildEntry {
  label: string;
  node: ASTNode;
}

function getChildren(node: ASTNode): ChildEntry[] {
  const children: ChildEntry[] = [];

  switch (node.type) {
    case 'Program':
      node.body.forEach((stmt, idx) => children.push({ label: `stmt[${idx}]`, node: stmt }));
      break;

    case 'VarDeclaration':
      node.declarations.forEach(decl => {
        children.push({ label: 'id', node: decl.id });
        if (decl.init) children.push({ label: 'init', node: decl.init });
      });
      break;

    case 'AssignmentStatement':
      children.push({ label: 'target', node: node.target });
      children.push({ label: 'value', node: node.value });
      break;

    case 'IfStatement':
      children.push({ label: 'condition', node: node.condition });
      children.push({ label: 'consequent', node: node.consequent });
      if (node.alternate) children.push({ label: 'alternate', node: node.alternate });
      break;

    case 'WhileStatement':
      children.push({ label: 'condition', node: node.condition });
      children.push({ label: 'body', node: node.body });
      break;

    case 'BlockStatement':
      node.body.forEach((stmt, idx) => children.push({ label: `body[${idx}]`, node: stmt }));
      break;

    case 'ExpressionStatement':
      children.push({ label: 'expr', node: node.expression });
      break;

    case 'BinaryExpression':
      children.push({ label: 'left', node: node.left });
      children.push({ label: 'right', node: node.right });
      break;

    case 'UnaryExpression':
      children.push({ label: 'argument', node: node.argument });
      break;
  }

  return children;
}

function getNodeBadgeClass(type: string): string {
  switch (type) {
    case 'Program':
      return 'badge-slate';
    case 'VarDeclaration':
      return 'badge-purple';
    case 'AssignmentStatement':
      return 'badge-cyan';
    case 'IfStatement':
      return 'badge-amber';
    case 'WhileStatement':
      return 'badge-cyan';
    case 'BlockStatement':
      return 'badge-slate';
    case 'BinaryExpression':
      return 'badge-purple';
    case 'UnaryExpression':
      return 'badge-rose';
    case 'Identifier':
      return 'badge-emerald';
    case 'Literal':
      return 'badge-rose';
    default:
      return 'badge-slate';
  }
}

interface TreeNodeItemProps {
  node: ASTNode;
  label?: string;
  isRoot?: boolean;
  expandedNodes: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (node: ASTNode) => void;
  selectedNodeId?: string;
  searchQuery: string;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  label,
  expandedNodes,
  onToggle,
  onSelect,
  selectedNodeId,
  searchQuery,
}) => {
  const children = getChildren(node);
  const hasChildren = children.length > 0;
  // Default expanded unless explicitly false
  const isExpanded = expandedNodes[node.id] !== false;
  const isSelected = selectedNodeId === node.id;

  // Search match logic
  const matchesSearch =
    searchQuery === '' ||
    node.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.type === 'Identifier' && node.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (node.type === 'BinaryExpression' && node.operator.includes(searchQuery));

  return (
    <div className={`tree-node-wrapper ${!matchesSearch ? 'search-dimmed' : ''}`}>
      <div
        className={`tree-node-row ${isSelected ? 'node-selected' : ''}`}
        onClick={() => onSelect(node)}
      >
        {/* Expand / Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={e => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="expand-toggle-btn"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="expand-spacer" />
        )}

        {/* Branch relation label */}
        {label && <span className="branch-label">{label}:</span>}

        {/* Node type badge */}
        <span className={`badge ${getNodeBadgeClass(node.type)}`}>
          {node.type}
        </span>

        {/* Node specific value summary */}
        {node.type === 'Identifier' && (
          <span className="node-value-id font-mono font-bold">"{node.name}"</span>
        )}
        {node.type === 'Literal' && (
          <span className="node-value-lit font-mono font-bold">
            {node.raw} <span className="text-dim text-xs">({node.dataType})</span>
          </span>
        )}
        {node.type === 'BinaryExpression' && (
          <span className="node-value-op font-mono font-bold">
            op: <span className="text-amber">'{node.operator}'</span>
          </span>
        )}
        {node.type === 'UnaryExpression' && (
          <span className="node-value-op font-mono font-bold">
            op: <span className="text-amber">'{node.operator}'</span>
          </span>
        )}
        {node.type === 'VarDeclaration' && (
          <span className="node-value-type font-mono text-xs text-secondary">
            type: {node.dataType}
          </span>
        )}

        {/* Inline synthesized attribute badge */}
        {node.attributes?.place && (
          <span className="node-attr-tag" title="Synthesized attribute place">
            place: {node.attributes.place}
          </span>
        )}
      </div>

      {/* Children Nodes */}
      {hasChildren && isExpanded && (
        <div className="tree-node-children">
          {children.map((child, idx) => (
            <TreeNodeItem
              key={`${child.node.id}_${idx}`}
              node={child.node}
              label={child.label}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedNodeId={selectedNodeId}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};
