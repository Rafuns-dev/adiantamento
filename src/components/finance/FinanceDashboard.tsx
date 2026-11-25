import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import {
  LayoutDashboard,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  Users,
  ShieldAlert
} from 'lucide-react';

interface FinanceDashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ setCurrentTab }) => {
  const { requests, users } = useApp();

  const totalRequested = requests.reduce((acc, r) => acc + r.amountRequested, 0);
  const totalApproved = requests.filter(r => r.status !== 'Rejeitado' && r.status !== 'Cancelado').reduce((acc, r) => acc + r.amountRequested, 0);
  const totalPaid = requests.filter(r => r.payment).reduce((acc, r) => acc + (r.payment?.amountPaid || 0), 0);
  const waitingPayment = requests.filter(r => r.status === 'Aguardando pagamento').reduce((acc, r) => acc + r.amountRequested, 0);

  const inAnalysis = requests.filter(r => r.status === 'Solicitação enviada' || r.status === 'Em análise financeira').length;
  const nfPending = requests.filter(r => r.status === 'Nota Fiscal em conferência').length;
  const accPending = requests.filter(r => r.status === 'Prestação em análise').length;
  const finishedCount = requests.filter(r => r.status === 'Finalizado').length;

  const operatorsCount = users.filter(u => u.role === 'operador' && u.active).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider mb-2">
            <span>Painel Financeiro & Administrativo</span>
            <span>•</span>
            <span>AMETA Gestão Corporativa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Visão Geral de Adiantamentos e Viagens
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Monitore solicitações, autorize Notas Fiscais, registre pagamentos e audite prestações de contas em tempo real.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('fin-received')}
            className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all hover:scale-105"
          >
            <FileText className="w-5 h-5" />
            <span>Analisar Solicitações ({requests.filter(r => r.status === 'Solicitação enviada').length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">Total Solicitado (Mês)</span>
            <span className="text-xl font-black text-slate-900">
              R$ {totalRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">Total Pago Efetivamente</span>
            <span className="text-xl font-black text-teal-700">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">Aguardando Pagamento</span>
            <span className="text-xl font-black text-slate-900">
              R$ {waitingPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">
              Vistoriadores Externos Ativos
            </span>
            <span className="text-xl font-black text-slate-900">{operatorsCount}</span>
          </div>
        </div>
      </div>

      {/* Secondary Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setCurrentTab('fin-received')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-teal-500 cursor-pointer transition-all"
        >
          <span className="text-slate-500 text-xs font-medium block mb-1">Solicitações em Análise</span>
          <span className="text-2xl font-black text-slate-900">{inAnalysis}</span>
          <span className="text-[11px] text-teal-600 font-semibold block mt-2">Clique para analisar →</span>
        </div>

        <div
          onClick={() => setCurrentTab('fin-conf-nf')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-teal-500 cursor-pointer transition-all"
        >
          <span className="text-slate-500 text-xs font-medium block mb-1">NFs Pendentes de Conferência</span>
          <span className="text-2xl font-black text-slate-900">{nfPending}</span>
          <span className="text-[11px] text-teal-600 font-semibold block mt-2">Conferir Notas Fiscais →</span>
        </div>

        <div
          onClick={() => setCurrentTab('fin-accountability')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-teal-500 cursor-pointer transition-all"
        >
          <span className="text-slate-500 text-xs font-medium block mb-1">Prestações em Análise</span>
          <span className="text-2xl font-black text-slate-900">{accPending}</span>
          <span className="text-[11px] text-teal-600 font-semibold block mt-2">Analisar despesas →</span>
        </div>

        <div
          onClick={() => setCurrentTab('fin-reports')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-teal-500 cursor-pointer transition-all"
        >
          <span className="text-slate-500 text-xs font-medium block mb-1">Processos Finalizados</span>
          <span className="text-2xl font-black text-teal-700">{finishedCount}</span>
          <span className="text-[11px] text-teal-600 font-semibold block mt-2">Ver relatórios →</span>
        </div>
      </div>
    </div>
  );
};
