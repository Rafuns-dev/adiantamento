import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  DollarSign,
  Receipt,
  History,
  Users,
  ShieldAlert,
  BarChart3,
  FileCheck2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Camera,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { ROLE_META } from '../utils/roleConfig';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  accentActive?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  onCloseMobile,
}) => {
  const { requests, notasEquipe, currentUser } = useApp();

  if (!currentUser) return null;

  const role = currentUser.role;
  const roleMeta = ROLE_META[role];

  const notasAguardandoComp = notasEquipe.filter((n) => n.status === 'Aguardando comprovante').length;
  const ametaAguardandoComp = requests.filter(
    (r) =>
      r.requesterRole === 'vistoria_ameta' &&
      r.status === 'Aguardando comprovante'
  ).length;

  // Equipe de Vistoria – Notas (isolada)
  const vistoriaNotaMenuItems: MenuItem[] = [
    {
      id: 'nota-dashboard',
      label: 'Início',
      icon: <LayoutDashboard className="w-5 h-5" />,
      accentActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40',
    },
    {
      id: 'nota-fiscais',
      label: 'Notas fiscais',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      badge: notasEquipe.filter((n) => n.status === 'Emitida').length,
      accentActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40',
    },
  ];

  // Equipe Vistoria Ameta – Comprovantes (isolada)
  const vistoriaAmetaMenuItems: MenuItem[] = [
    {
      id: 'ameta-dashboard',
      label: 'Início',
      icon: <LayoutDashboard className="w-5 h-5" />,
      accentActive: 'bg-teal-600 text-white shadow-lg shadow-teal-950/40',
    },
    {
      id: 'ameta-comprovantes',
      label: 'Comprovantes',
      icon: <Camera className="w-5 h-5" />,
      badge: notasAguardandoComp,
      accentActive: 'bg-teal-600 text-white shadow-lg shadow-teal-950/40',
    },
    {
      id: 'ameta-new-request',
      label: 'Solicitar Adiantamento',
      icon: <FilePlus className="w-5 h-5" />,
      accentActive: 'bg-teal-600 text-white shadow-lg shadow-teal-950/40',
    },
    {
      id: 'ameta-requests',
      label: 'Minhas Solicitações',
      icon: <FileText className="w-5 h-5" />,
      badge: requests.filter((r) => r.operatorId === currentUser.id).length,
      accentActive: 'bg-teal-600 text-white shadow-lg shadow-teal-950/40',
    },
  ];

  const operatorMenuItems: MenuItem[] = [
    { id: 'op-dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'op-new-request', label: 'Nova Solicitação', icon: <FilePlus className="w-5 h-5" /> },
    {
      id: 'op-requests',
      label: 'Minhas Solicitações',
      icon: <FileText className="w-5 h-5" />,
      badge: requests.filter((r) => r.operatorId === currentUser.id).length,
    },
    { id: 'op-invoices', label: 'Notas Fiscais (DFE)', icon: <FileCheck2 className="w-5 h-5" /> },
    { id: 'op-payments', label: 'Meus Pagamentos', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'op-accountability', label: 'Prestação de Contas', icon: <Receipt className="w-5 h-5" /> },
    { id: 'op-history', label: 'Meu Histórico', icon: <History className="w-5 h-5" /> },
  ];

  const financeAndAdminMenuItems: MenuItem[] = [
    { id: 'fin-dashboard', label: 'Dashboard Fin. & Coord.', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'nota-fiscais',
      label: 'Notas fiscais (Vist. Externo)',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      badge: notasEquipe.filter((n) => n.status === 'Emitida').length,
    },
    {
      id: 'ameta-comprovantes',
      label: 'Comprovantes (Vist. AMETA)',
      icon: <Camera className="w-5 h-5" />,
      badge: ametaAguardandoComp,
    },
    {
      id: 'fin-received',
      label: 'Solicitações Recebidas',
      icon: <FileText className="w-5 h-5" />,
      badge: requests.filter((r) => r.status === 'Solicitação enviada').length,
    },
    {
      id: 'fin-auth-nf',
      label: 'Autorizações de NF',
      icon: <FileCheck2 className="w-5 h-5" />,
      badge: requests.filter(
        (r) =>
          r.requesterRole !== 'vistoria_ameta' &&
          (r.status === 'Em análise financeira' || r.status === 'Autorizado emitir Nota Fiscal')
      ).length,
    },
    {
      id: 'fin-conf-nf',
      label: 'Conferência de NFs',
      icon: <Receipt className="w-5 h-5" />,
      badge: requests.filter((r) => r.status === 'Nota Fiscal em conferência').length,
    },
    {
      id: 'fin-payments',
      label: 'Pagamentos',
      icon: <DollarSign className="w-5 h-5" />,
      badge: requests.filter((r) => r.status === 'Aguardando pagamento').length,
    },
    {
      id: 'fin-accountability',
      label: 'Prestações de Contas',
      icon: <CheckCircle className="w-5 h-5" />,
      badge: requests.filter(
        (r) =>
          r.status === 'Prestação em análise' ||
          r.status === 'Aguardando devolução de saldo' ||
          r.status === 'Aguardando aprovação de reembolso'
      ).length,
    },
    { id: 'fin-reports', label: 'Relatórios', icon: <BarChart3 className="w-5 h-5" /> },
    ...(role === 'admin' || role === 'financeiro'
      ? [{ id: 'fin-users', label: 'Usuários', icon: <Users className="w-5 h-5" /> }]
      : []),
    { id: 'fin-audit', label: 'Histórico e Auditoria', icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  let menuItems: MenuItem[] = financeAndAdminMenuItems;
  if (role === 'vistoria_nota') menuItems = vistoriaNotaMenuItems;
  else if (role === 'vistoria_ameta') menuItems = vistoriaAmetaMenuItems;
  else if (role === 'operador') menuItems = operatorMenuItems;

  const isDesktopCollapsed = collapsed;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 shrink-0 border-r border-slate-800 md:static md:translate-x-0 md:z-30 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${isDesktopCollapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        {/* Brand Header */}
        <div className="h-16 sm:h-20 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div
            className={`flex items-center gap-3 overflow-hidden ${
              isDesktopCollapsed ? 'md:justify-center md:w-full' : ''
            }`}
          >
            <img
              src="/assets/aistudio/images_feb6fbd0.png"
              alt="AMETA Serviços"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl bg-white p-1 shadow-md shrink-0"
            />
            <div className={`leading-tight min-w-0 ${isDesktopCollapsed ? 'md:hidden' : ''}`}>
              <span className="font-extrabold text-white text-lg tracking-wider block">AMETA</span>
              <span className="text-[10px] uppercase tracking-widest text-teal-400 font-semibold block truncate">
                {roleMeta.shortLabel}
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="md:hidden text-slate-400 hover:text-white p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Button */}
          {!isDesktopCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {isDesktopCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = currentTab === item.id;
            const activeClass =
              item.accentActive || 'bg-teal-600 text-white shadow-lg shadow-teal-900/30';
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  onCloseMobile();
                }}
                title={isDesktopCollapsed ? item.label : undefined}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? activeClass
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span
                  className={`${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                  } transition-colors shrink-0`}
                >
                  {item.icon}
                </span>
                <span
                  className={`truncate flex-1 text-left ${
                    isDesktopCollapsed ? 'md:hidden' : ''
                  }`}
                >
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-bold tabular-nums ${
                      isActive
                        ? 'bg-black/25 text-white'
                        : 'bg-slate-800 text-teal-400 border border-slate-700'
                    } ${isDesktopCollapsed ? 'md:hidden' : ''}`}
                  >
                    {item.badge}
                  </span>
                )}
                {isDesktopCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="hidden md:flex absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] font-bold items-center justify-center tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer User Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className={`flex items-center gap-3 ${isDesktopCollapsed ? 'md:hidden' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-sm shrink-0">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <h5 className="text-sm font-semibold text-white truncate">{currentUser.name}</h5>
              <p className="text-xs text-slate-400 truncate">{roleMeta.label}</p>
            </div>
          </div>
          {isDesktopCollapsed && (
            <div className="hidden md:flex justify-center" title={currentUser.name}>
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-sm">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
