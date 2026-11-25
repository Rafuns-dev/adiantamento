import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { TimelineModal } from '../TimelineModal';
import { History, FileText, Calendar, MapPin, Eye } from 'lucide-react';
import { AdvanceRequest } from '../../types';

export const OperatorHistory: React.FC = () => {
  const { requests, currentUser } = useApp();
  const [selectedReq, setSelectedReq] = useState<AdvanceRequest | null>(null);

  if (!currentUser) return null;

  const myRequests = requests.filter(r => r.operatorId === currentUser.id);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" />
            <span>Meu Histórico Completo</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Histórico geral de todas as suas solicitações, Notas Fiscais, pagamentos e prestações de contas.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Código / Finalidade</th>
                <th className="py-3.5 px-6">Destino</th>
                <th className="py-3.5 px-6">Data Criação</th>
                <th className="py-3.5 px-6">Valor</th>
                <th className="py-3.5 px-6">Status Final</th>
                <th className="py-3.5 px-6 text-right">Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    Nenhum registro encontrado no histórico.
                  </td>
                </tr>
              ) : (
                myRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block">{req.code}</span>
                      <span className="text-xs text-slate-500 truncate max-w-xs block">{req.purpose}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-700">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {req.destination}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      R$ {req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedReq(req)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Histórico</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReq && (
        <TimelineModal request={selectedReq} onClose={() => setSelectedReq(null)} />
      )}
    </div>
  );
};
