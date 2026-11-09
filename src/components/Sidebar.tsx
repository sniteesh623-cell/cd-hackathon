// ============================================================================
// CompilerX — Sidebar Component (Linear × Xcode Style)
// Elegant collapsible navigation with organized workspace categories.
// ============================================================================

import React from 'react';
import {
  Compass,
  Code2,
  Layers,
  ShieldCheck,
  Terminal,
  GitMerge,
  Zap,
  Network,
  Activity,
  Cpu,
  BarChart3,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Command,
  Search,
} from 'lucide-react';

export type WorkspaceDestination =
  | 'overview'
  | 'workbench'
  | 'ast'
  | 'symbols'
  | 'ir'
  | 'trace'
  | 'optimizer'
  | 'cfg'
  | 'dataflow'
  | 'vm'
  | 'analytics'
  | 'docs';

interface NavItem {
  id: WorkspaceDestination;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentWorkspace: WorkspaceDestination;
  onSelectWorkspace: (dest: WorkspaceDestination) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  stats?: {
    tacCount?: number;
    astCount?: number;
    symbolCount?: number;
    blockCount?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentWorkspace,
  onSelectWorkspace,
  isCollapsed,
  onToggleCollapse,
  theme,
  onToggleTheme,
  onOpenCommandPalette,
  stats,
}) => {
  const sections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', icon: Compass },
        { id: 'workbench', label: 'Compiler Workbench', icon: Code2, badge: stats?.tacCount ? `${stats.tacCount} TAC` : undefined },
      ],
    },
    {
      title: 'Frontend & Syntax',
      items: [
        { id: 'ast', label: 'AST Explorer', icon: Layers, badge: stats?.astCount ? `${stats.astCount}` : undefined },
        { id: 'symbols', label: 'Symbol Table', icon: ShieldCheck, badge: stats?.symbolCount ? `${stats.symbolCount}` : undefined },
        { id: 'docs', label: 'Grammar & Docs', icon: BookOpen },
      ],
    },
    {
      title: 'Intermediate Code',
      items: [
        { id: 'ir', label: 'Intermediate Code', icon: Terminal },
        { id: 'trace', label: 'Translation & Backpatch', icon: GitMerge },
      ],
    },
    {
      title: 'Optimization & CFG',
      items: [
        { id: 'optimizer', label: 'Optimization Lab', icon: Zap },
        { id: 'cfg', label: 'Control Flow Graph', icon: Network, badge: stats?.blockCount ? `${stats.blockCount}` : undefined },
        { id: 'dataflow', label: 'Data Flow Analysis', icon: Activity },
      ],
    },
    {
      title: 'Runtime & Metrics',
      items: [
        { id: 'vm', label: 'Execution & Debugger', icon: Cpu },
        { id: 'analytics', label: 'Compiler Analytics', icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-row">
        <div className="brand-group" onClick={() => onSelectWorkspace('overview')}>
          <div className="brand-icon">
            <span className="brand-dot"></span>
          </div>
          {!isCollapsed && (
            <div className="brand-meta">
              <span className="brand-name">CompilerX</span>
              <span className="brand-badge-pill">v2.0</span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="sidebar-collapse-btn"
          title={isCollapsed ? 'Expand Sidebar (⌘B)' : 'Collapse Sidebar (⌘B)'}
        >
          {isCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Quick Search Button (Linear Style) */}
      {!isCollapsed && (
        <button className="sidebar-search-btn" onClick={onOpenCommandPalette}>
          <Search size={13} className="text-muted" />
          <span>Quick actions...</span>
          <kbd className="kbd-shortcut">⌘K</kbd>
        </button>
      )}

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section.title} className="nav-section">
            {!isCollapsed && <span className="nav-section-title">{section.title}</span>}
            <div className="nav-items-group">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = currentWorkspace === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectWorkspace(item.id)}
                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={15} className={`nav-icon ${isActive ? 'text-accent' : ''}`} />
                    {!isCollapsed && <span className="nav-label">{item.label}</span>}
                    {!isCollapsed && item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button
          onClick={onToggleTheme}
          className="sidebar-footer-btn"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>
    </aside>
  );
};
