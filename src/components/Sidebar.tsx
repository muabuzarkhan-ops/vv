import React from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  FileUp, 
  Database, 
  Lightbulb, 
  RefreshCw 
} from 'lucide-react';
import { UserState } from '../types';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  user: UserState | null;
  pendingSyncCount: number;
}

export default function Sidebar({ activeView, onViewChange, user, pendingSyncCount }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'import', label: 'Import Notes', icon: Sparkles },
    { id: 'documents', label: 'Documents', icon: FileUp },
    { id: 'records', label: 'Records db', icon: Database },
    { id: 'insights', label: 'Insights AI', icon: Lightbulb },
    { id: 'sync', label: 'Sync & Auth', icon: RefreshCw },
  ];

  return (
    <aside className="w-full lg:w-64 bg-brand-dark text-neutral-100 flex flex-col h-auto lg:h-screen sticky top-0 border-r border-[#153630] shrink-0 z-10 transition-all shadow-xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#153630] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white relative overflow-hidden bg-gradient-to-tr from-brand-emerald to-[#0d7f8b] shadow-md shrink-0 border border-white/10">
          <span className="relative z-10 text-lg tracking-tight font-extrabold text-white">A</span>
          <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full bg-[#f0c24d] -translate-x-[20%] -translate-y-[80%] opacity-80" />
        </div>
        <div>
          <h1 className="font-sans font-bold text-sm leading-tight tracking-tight text-white uppercase">ANESVAD (NTDs)</h1>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="p-4 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar shrink-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap lg:w-full cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white rounded-xl border border-white/5 font-bold shadow-md'
                  : 'text-[#b9d4ca] hover:text-white hover:bg-white/5 rounded-xl'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-brand-emerald' : 'text-[#6e9d8c]'}`} />
              <span>{item.label}</span>
              {item.id === 'sync' && pendingSyncCount > 0 && (
                <span className="ml-auto bg-brand-emerald text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {pendingSyncCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile footer label */}
      <div className="mt-auto p-4 hidden lg:flex flex-col gap-3.5 border-t border-[#153630]">
        {user ? (
          <div className="bg-brand-emerald/10 p-3.5 rounded-xl border border-brand-emerald/20 flex flex-col gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-[0.2em]">
                AF
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-brand-emerald/80 tracking-[0.2em]">Anesvad</span>
                <span className="text-[10px] uppercase text-white font-bold tracking-[0.2em]">Foundation</span>
              </div>
            </div>
            <div className="bg-brand-emerald/10 p-3.5 rounded-xl border border-brand-emerald/20 flex flex-col gap-1 text-xs">
              <span className="text-brand-emerald font-extrabold tracking-wider text-[9px] uppercase">SIGNED OPERATOR</span>
              <span className="text-white font-bold overflow-hidden text-ellipsis whitespace-nowrap text-xs">{user.name}</span>
              <span className="text-[#a1beba] overflow-hidden text-ellipsis whitespace-nowrap uppercase text-[10px] font-mono mt-0.5">{user.role} • {user.org}</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#1a3832]/30 p-3.5 rounded-xl border border-[#234b43]/35 flex flex-col gap-1 text-xs text-[#a2bcc0]">
            <span className="text-brand-grey font-bold tracking-wider uppercase text-[9px] font-mono">WORKSPACE ID</span>
            <span className="text-neutral-300 font-medium text-xs">Offline Workspace Mode</span>
          </div>
        )}

        <div className="bg-[#0c2420]/50 p-3 rounded-xl border border-[#123831]/50 text-[11px] text-[#7da597] leading-relaxed">
          <p className="font-bold text-white mb-1 uppercase tracking-wide text-[9px]">Taxonomy range:</p>
          West Africa country tracking, disease focus, and evidence metrics.
        </div>
      </div>
    </aside>
  );
}
