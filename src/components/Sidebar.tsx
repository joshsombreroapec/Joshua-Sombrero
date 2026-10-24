import React from 'react';
import { User } from 'firebase/auth';
import {
  LayoutDashboard,
  Search,
  Building2,
  Settings2,
  TableProperties,
  RotateCw,
  X,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
} from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ConnectionStatus } from '../lib/types';

export type ActiveTab = 'dashboard' | 'reports' | 'directory' | 'projects' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  user: User | null;
  onAuthChange: (user: User | null) => void;
  connectionStatus: ConnectionStatus | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  user,
  onAuthChange,
  connectionStatus,
  isRefreshing,
  onRefresh,
  mobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Management Report',
      icon: FileText,
      badge: null,
    },
    {
      id: 'directory' as ActiveTab,
      label: 'Units Directory',
      icon: Search,
      badge: connectionStatus?.totalRecords ? `${connectionStatus.totalRecords.toLocaleString()}` : null,
    },
    {
      id: 'projects' as ActiveTab,
      label: 'Projects',
      icon: Building2,
      badge: '37',
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Database Sync',
      icon: Settings2,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 z-50 bg-[#0F172A] text-slate-100 flex flex-col border-r border-[#CBD5E1]/20 transition-all duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-18' : 'w-64 md:w-68'}`}
      >
        {/* Header / Brand & Collapse Toggle */}
        <div className="p-3.5 border-b border-[#CBD5E1]/20 flex items-center justify-between gap-2 bg-[#0F172A]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/aistudio/image_9ffff062.png"
              alt="PWG"
              className="w-9 h-9 rounded-xl object-contain bg-[#1E293B] border border-[#CBD5E1]/30 shadow-xs shrink-0"
            />
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">
                  PWG Energization
                </h1>
                <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shadow-[0_0_6px_#2563EB] animate-pulse"></span>
                  Power-Water Group
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Expand / Collapse Button */}
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden md:flex p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[#2563EB]" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Mobile close */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Status Bar */}
        <div className={`py-2.5 bg-[#1E293B]/70 border-b border-[#CBD5E1]/20 ${isCollapsed ? 'px-2 text-center' : 'px-5'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <TableProperties className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Sheet: <code className="text-white font-mono font-bold">DATA</code>
                </span>
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Refresh spreadsheet data"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-blue-100 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer font-bold"
                >
                  <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#38bdf8]' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-blue-200 font-semibold">
                <span>Total Units:</span>
                <span className="font-extrabold text-white font-mono">
                  {connectionStatus?.totalRecords ? connectionStatus.totalRecords.toLocaleString() : 'Loading...'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#1e68f3] shadow-[0_0_8px_#1e68f3] animate-pulse" title="Google Sheets live synced" />
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Sync now"
                className="p-1 text-blue-200 hover:text-white rounded hover:bg-white/10 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1e68f3]' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-bold shadow-md shadow-[#2563EB]/30'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono ${
                      isActive
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-black/40 text-slate-200 font-bold'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* External Quick Link & User Profile */}
        {!isCollapsed ? (
          <div className="px-3 py-2 border-t border-[#CBD5E1]/20 space-y-2">
            <a
              href="https://docs.google.com/spreadsheets/d/1ejSR8lencQKuBu60ozZ99yIrP2OBU91-PmkawRNz8FM/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors group font-semibold"
            >
              <span className="flex items-center gap-2 truncate">
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563EB] shrink-0" />
                <span className="truncate">Open Spreadsheet</span>
              </span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-slate-200 font-mono font-bold">DATA</span>
            </a>

            {/* Joshua Sombrero designation */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-slate-200">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                JS
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-semibold text-white tracking-wide truncate">
                  Joshua Sombrero
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-2 py-2 border-t border-[#CBD5E1]/20 flex flex-col items-center gap-2">
            <a
              href="https://docs.google.com/spreadsheets/d/1ejSR8lencQKuBu60ozZ99yIrP2OBU91-PmkawRNz8FM/edit"
              target="_blank"
              rel="noopener noreferrer"
              title="Open Spreadsheet"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <div
              title="Joshua Sombrero"
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs cursor-default"
            >
              JS
            </div>
          </div>
        )}

        {/* Footer with Auth */}
        <div className={`p-2.5 border-t border-[#CBD5E1]/20 bg-black/25 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <GoogleSignInButton user={user} onAuthChange={onAuthChange} compact={true} />
        </div>
      </aside>
    </>
  );
};
