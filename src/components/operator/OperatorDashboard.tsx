import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { TimelineModal } from '../TimelineModal';
import {
  FileText,
  Clock,
  CheckCircle2,
  FileCheck,
  DollarSign,
  Receipt,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';
import { AdvanceRequest } from '../../types';

interface OperatorDashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ setCurrentTab }) => {
  const { requests, currentUser } = useApp();
  const [selectedRequestForTimeline, setSelectedRequestForTimeline] = useState<AdvanceRequest | null>(null);

  if (!currentUser) return null;

  const myRequests = requests.filter(r => r.operatorId === currentUser.id);

  const totalSolicitacoes = myRequests.length;
  const emAnalise = myRequests.filter(r => r.status.includes('análise') || r.status === 'Solicitação enviada').length;
  const aprovadas = myRequests.filter(r => r.status.includes('Autorizado') || r.status.includes('Aguardando pagamento') || r.status === 'Pago').length;
  const nfPendentes = myRequests.filter(r => r.status === 'Autorizado emitir Nota Fiscal').length;
  const pagamentosRecebidos = myRequests.filter(r => r.status === 'Pago' || r.status === 'Finalizado').length;
  const prestacaoPendentes = myRequests.filter(r => r.status === 'Pago' || r.status.includes('prestação')).length;

  const recentRequests = myRequests.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs uppercase tracking-wider mb-2">
            <span>Portal do Vistoriador Externo</span>
            <span>•</span>
            <span>AMETA Vistorias</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Olá, {currentUser.name}
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Acompanhe suas solicitações de adiantamentos, envio de Notas Fiscais e prestações de contas de forma rápida e segura.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('op-new-request')}
            className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Nova Solicitação</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">Total Realizadas</span>
            <span className="text-2xl font-black text-slate-900">{totalSolicitacoes}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">Em Análise / Andamento</span>
            <span className="text-2xl font-black text-slate-900">{emAnalise}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">NF Pendentes de Envio</span>
            <span className="text-2xl font-black text-slate-900">{nfPendentes}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">Adiantamentos Pagos</span>
            <span className="text-2xl font-black text-slate-900">{pagamentosRecebidos}</span>
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Suas Solicitações Recentes</h3>
            <p className="text-xs text-slate-500">Últimos adiantamentos cadastrados no sistema</p>
          </div>
          <button
            onClick={() => setCurrentTab('op-requests')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Código / Destino</th>
                <th className="py-3.5 px-6">Período</th>
                <th className="py-3.5 px-6">Valor Solicitado</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    Nenhuma solicitação encontrada. Clique em "Nova Solicitação" para começar.
                  </td>
                </tr>
              ) : (
                recentRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block">{req.code}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {req.destination}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(req.startDate).toLocaleDateString('pt-BR')} a {new Date(req.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {req.amountRequested > 0 ? (
                        `R$ ${req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-xs font-semibold text-amber-700">
                          Aguardando Coordenador
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedRequestForTimeline(req)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Linha do Tempo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequestForTimeline && (
        <TimelineModal request={selectedRequestForTimeline} onClose={() => setSelectedRequestForTimeline(null)} />
      )}
    </div>
  );
};
