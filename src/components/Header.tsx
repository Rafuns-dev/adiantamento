import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, LogOut, Shield, UserCheck, FileSpreadsheet, Camera, Menu } from 'lucide-react';
import { ROLE_META } from '../utils/roleConfig';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { currentUser, logout, notifications, markNotificationAsRead } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!currentUser) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const roleMeta = ROLE_META[currentUser.role];

  const renderRoleIcon = () => {
    if (currentUser.role === 'vistoria_nota') {
      return <FileSpreadsheet className="w-4 h-4 text-indigo-600" />;
    }
    if (currentUser.role === 'vistoria_ameta') {
      return <Camera className="w-4 h-4 text-teal-600" />;
    }
    if (currentUser.role === 'operador') {
      return <UserCheck className="w-4 h-4 text-sky-600" />;
    }
    return <Shield className="w-4 h-4 text-purple-600" />;
  };

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 z-20 shadow-xs shrink-0">
      {/* Left: Mobile Menu Button & User Role Badge */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu"
          className="md:hidden w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          className={`flex items-center gap-1.5 sm:gap-2 border px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold min-w-0 ${roleMeta.headerBadgeClass}`}
        >
          <span className="shrink-0">{renderRoleIcon()}</span>
          <span className="sm:hidden truncate">{roleMeta.shortLabel}</span>
          <span className="hidden sm:inline truncate">Perfil: {roleMeta.label}</span>
        </div>
      </div>

      {/* Right: Notifications, Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notificações"
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed left-3 right-3 top-[4.25rem] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Notificações</h4>
                <span className="text-xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-md tabular-nums">
                  {unreadCount} novas
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Nenhuma notificação no momento
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.read ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{n.title}</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">{n.date}</span>
                      </div>
                      <p className="text-xs text-slate-600">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-md">
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">{currentUser.name}</span>
            <span className="text-[11px] text-slate-500 block">{currentUser.email}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sair do Sistema"
          aria-label="Sair do Sistema"
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
