import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { TimelineModal } from '../TimelineModal';
import { FileText, Search, Filter, Calendar, MapPin, Eye, ArrowUpDown } from 'lucide-react';
import { AdvanceRequest } from '../../types';

export const MyRequests: React.FC = () => {
  const { requests, currentUser } = useApp();

  if (!currentUser) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedRequest, setSelectedRequest] = useState<AdvanceRequest | null>(null);

  const myRequests = requests.filter(r => r.operatorId === currentUser.id);

  const filteredRequests = myRequests.filter(req => {
    const matchesSearch =
      req.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.purpose.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 shrink-0" />
            <span>Minhas Solicitações de Adiantamento</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulte todas as suas solicitações, histórico e status atualizado.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-56">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Pesquisar código, destino..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 w-full"
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="Solicitação enviada">Solicitação enviada</option>
              <option value="Em análise financeira">Em análise financeira</option>
              <option value="Autorizado emitir Nota Fiscal">Autorizado emitir NF</option>
              <option value="Nota Fiscal enviada">Nota Fiscal enviada</option>
              <option value="Aguardando pagamento">Aguardando pagamento</option>
              <option value="Pago">Pago</option>
              <option value="Prestação em análise">Prestação em análise</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Rejeitado">Rejeitado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Código / Acionamentos</th>
                <th className="py-3.5 px-6">Destino</th>
                <th className="py-3.5 px-6">Período</th>
                <th className="py-3.5 px-6">Valor Solicitado</th>
                <th className="py-3.5 px-6">Status Atual</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    Nenhuma solicitação encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{req.code}</span>
                        {req.project && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {req.project}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 truncate max-w-xs block mt-0.5">{req.purpose}</span>
                      {req.activities && (
                        <span className="text-[11px] text-teal-700 truncate max-w-xs block mt-0.5">
                          Atividades: {req.activities}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {req.destination}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(req.startDate).toLocaleDateString('pt-BR')} a {new Date(req.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {req.amountRequested > 0 ? (
                        `R$ ${req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-xs font-semibold text-amber-700 italic">
                          Aguardando Coordenador
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <TimelineModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </div>
  );
};
