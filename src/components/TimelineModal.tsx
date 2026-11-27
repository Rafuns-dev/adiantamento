import React from 'react';
import { AdvanceRequest } from '../types';
import { X, CheckCircle, Clock, Shield, User, FileText, DollarSign } from 'lucide-react';

interface TimelineModalProps {
  request: AdvanceRequest;
  onClose: () => void;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ request, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-400 font-semibold">Linha do Tempo e Auditoria</div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span>{request.code}</span>
              <span className="text-slate-400 text-sm font-normal">• {request.destination}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 block text-xs">Solicitante</span>
                <span className="font-semibold text-slate-800">{request.operatorName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Valor Solicitado</span>
                <span className="font-semibold text-teal-600">
                  {request.amountRequested > 0
                    ? `R$ ${request.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'A definir pelo Coordenador'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Período</span>
                <span className="font-semibold text-slate-800">
                  {new Date(request.startDate).toLocaleDateString('pt-BR')} a {new Date(request.endDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Status Atual</span>
                <span className="font-semibold text-indigo-600">{request.status}</span>
              </div>
              {request.project && (
                <div>
                  <span className="text-slate-500 block text-xs">Projeto</span>
                  <span className="font-semibold text-teal-700">{request.project}</span>
                </div>
              )}
            </div>
            {request.activities && (
              <div className="pt-3 border-t border-slate-200">
                <span className="text-slate-500 block text-xs font-semibold mb-1">
                  Atividades para Justificar o Adiantamento
                </span>
                <p className="text-xs text-slate-800 whitespace-pre-line">{request.activities}</p>
              </div>
            )}
          </div>

          {/* Timeline list */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {request.history.map((item, index) => (
              <div key={item.id || index} className="relative flex items-start gap-4">
                {/* Bullet */}
                <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs shadow-sm ring-4 ring-white">
                  <CheckCircle className="w-3 h-3" />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      {item.title}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(item.date).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                    <span className="flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      <User className="w-3 h-3" /> {item.authorName}
                    </span>
                    <span className="uppercase text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">
                      {item.authorRole}
                    </span>
                  </div>

                  {item.comment && (
                    <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg">
                      <span className="font-semibold block mb-0.5">Observação / Justificativa:</span>
                      {item.comment}
                    </div>
                  )}

                  {item.statusBefore && item.statusAfter && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">{item.statusBefore}</span>
                      <span>→</span>
                      <span className="bg-teal-50 text-teal-700 font-medium px-2 py-0.5 rounded">{item.statusAfter}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
