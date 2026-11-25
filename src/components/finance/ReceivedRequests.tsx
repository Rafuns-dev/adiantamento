import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import {
  FileText,
  CheckCircle2,
  FileCheck,
  Eye,
  MapPin,
  Calendar,
  User,
  ClipboardList,
  Clock,
  X,
  Search,
} from 'lucide-react';
import { AdvanceRequest } from '../../types';

function calcDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

export const ReceivedRequests: React.FC = () => {
  const { requests, approveRequest, rejectRequest, returnRequestForAdjustment, authorizeInvoice } = useApp();

  const [detailReq, setDetailReq] = useState<AdvanceRequest | null>(null);
  const [activeModalReq, setActiveModalReq] = useState<AdvanceRequest | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'return' | 'authorize' | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [approvedAmountInput, setApprovedAmountInput] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [selectedName, setSelectedName] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const uniqueNames = Array.from(new Set(requests.map(r => r.operatorName))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  const filteredRequests = requests.filter(req => {
    const matchesName =
      !nameFilter.trim() ||
      req.operatorName.toLowerCase().includes(nameFilter.trim().toLowerCase());
    const matchesSelect = selectedName === 'todos' || req.operatorName === selectedName;
    const matchesStatus = statusFilter === 'todos' || req.status === statusFilter;
    return matchesName && matchesSelect && matchesStatus;
  });

  const openActionModal = (
    req: AdvanceRequest,
    action: 'approve' | 'reject' | 'return' | 'authorize'
  ) => {
    setDetailReq(null);
    setActiveModalReq(req);
    setModalAction(action);
    setCommentInput('');
    setApprovedAmountInput(req.amountRequested > 0 ? String(req.amountRequested) : '');
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalReq || !modalAction) return;

    if (modalAction === 'approve') {
      const parsedAmount = approvedAmountInput ? parseFloat(approvedAmountInput) : undefined;
      if (activeModalReq.amountRequested <= 0 && (!parsedAmount || parsedAmount <= 0)) {
        alert('Informe o valor definido pelo Coordenador para esta solicitação.');
        return;
      }
      approveRequest(activeModalReq.id, commentInput, parsedAmount);
    } else if (modalAction === 'reject') {
      if (!commentInput) {
        alert('Informe a justificativa da rejeição.');
        return;
      }
      rejectRequest(activeModalReq.id, commentInput);
    } else if (modalAction === 'return') {
      if (!commentInput) {
        alert('Informe o que precisa ser corrigido.');
        return;
      }
      returnRequestForAdjustment(activeModalReq.id, commentInput);
    } else if (modalAction === 'authorize') {
      authorizeInvoice(activeModalReq.id, commentInput || 'Favor emitir NF conforme dados da solicitação.');
    }

    setActiveModalReq(null);
    setModalAction(null);
    setCommentInput('');
    setApprovedAmountInput('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 shrink-0" />
            <span>Solicitações de Adiantamento Recebidas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Abra a solicitação para conferir os acionamentos e calcular o valor antes de aprovar, rejeitar, devolver ou autorizar.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-56">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Filtrar por nome..."
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 w-full"
            />
            {nameFilter && (
              <button
                type="button"
                onClick={() => setNameFilter('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                title="Limpar filtro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedName}
            onChange={e => setSelectedName(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="todos">Todos os nomes</option>
            {uniqueNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Código / Solicitante</th>
                <th className="py-3.5 px-6">Destino / Acionamentos / Atividades</th>
                <th className="py-3.5 px-6">Valor</th>
                <th className="py-3.5 px-6">Status Atual</th>
                <th className="py-3.5 px-6 text-right">Ações Financeiras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    Nenhuma solicitação encontrada para o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr
                    key={req.id}
                    onClick={() => setDetailReq(req)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block">{req.code}</span>
                      <span className="text-xs text-slate-600 font-semibold block">{req.operatorName}</span>
                      {req.requesterRole === 'vistoria_ameta' && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          Vistoriador AMETA
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 max-w-md">
                      <span className="font-medium text-slate-800 text-xs block">{req.destination}</span>
                      <span className="text-[11px] text-slate-600 block line-clamp-2">{req.purpose}</span>
                      {req.activities && (
                        <span className="mt-1.5 block text-[11px] text-teal-900 bg-teal-50/70 border border-teal-100 rounded-lg px-2.5 py-1.5 whitespace-pre-line line-clamp-2">
                          <strong className="font-semibold">Atividades:</strong> {req.activities}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {req.amountRequested > 0 ? (
                        `R$ ${req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="inline-block text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                          A definir pelo Coordenador
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={req.status} />
                    </td>
                    <td
                      className="py-4 px-6 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => setDetailReq(req)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Abrir
                        </button>

                        {req.status === 'Solicitação enviada' && (
                          <>
                            <button
                              onClick={() => openActionModal(req, 'approve')}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                            </button>
                            <button
                              onClick={() => openActionModal(req, 'return')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-colors"
                            >
                              Ajustes
                            </button>
                            <button
                              onClick={() => openActionModal(req, 'reject')}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}

                        {req.status === 'Em análise financeira' && !req.invoiceAuthorized && (
                          <button
                            onClick={() => openActionModal(req, 'authorize')}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> Autorizar NF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Detail Modal (Open before approving) */}
      {detailReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[11px] uppercase tracking-wider text-teal-400 font-bold block truncate">
                  Detalhes da Solicitação para Análise e Cálculo
                </span>
                <h3 className="text-base sm:text-lg font-extrabold flex flex-wrap items-center gap-x-2 mt-0.5">
                  <span>{detailReq.code}</span>
                  <span className="text-slate-400 text-xs sm:text-sm font-normal">• {detailReq.operatorName}</span>
                </h3>
              </div>
              <button
                onClick={() => setDetailReq(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              {/* Top summary grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold uppercase block">Solicitante</span>
                    <span className="font-bold text-slate-900">{detailReq.operatorName}</span>
                    <span className="block text-[11px] text-slate-500">
                      {detailReq.requesterRole === 'vistoria_ameta' ? 'Vistoriador AMETA' : 'Vistoriador Externo'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold uppercase block">Destino da Viagem</span>
                    <span className="font-bold text-slate-900">{detailReq.destination}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold uppercase block">Período</span>
                    <span className="font-bold text-slate-900">
                      {new Date(detailReq.startDate).toLocaleDateString('pt-BR')} a{' '}
                      {new Date(detailReq.endDate).toLocaleDateString('pt-BR')}
                    </span>
                    {calcDays(detailReq.startDate, detailReq.endDate) && (
                      <span className="ml-2 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {calcDays(detailReq.startDate, detailReq.endDate)}{' '}
                        {calcDays(detailReq.startDate, detailReq.endDate) === 1 ? 'dia' : 'dias'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-semibold uppercase block mb-1">Status & Valor</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={detailReq.status} />
                    <span className="text-xs font-bold text-slate-900">
                      {detailReq.amountRequested > 0
                        ? `R$ ${detailReq.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'A definir pelo Coordenador'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acionamentos Solicitados */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                  <ClipboardList className="w-4 h-4 text-amber-700" />
                  <span>Acionamentos Solicitados</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 whitespace-pre-line leading-relaxed">
                  {detailReq.purpose}
                </p>
              </div>

              {/* Atividades (if Vistoriador AMETA) */}
              {detailReq.activities && (
                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-900 block">
                    Atividades para Justificar o Adiantamento
                  </span>
                  <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {detailReq.activities}
                  </p>
                </div>
              )}

              {/* Descrição da Necessidade */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Descrição da Necessidade / Observações
                </span>
                <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                  {detailReq.description?.trim() ? detailReq.description : 'Nenhuma observação adicional informada.'}
                </p>
              </div>

              {/* Histórico */}
              {detailReq.history.length > 0 && (
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Histórico da Solicitação
                  </span>
                  <div className="space-y-2">
                    {detailReq.history.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{item.title}</span>
                          <span className="text-slate-500"> • {item.authorName}</span>
                          {item.comment && <p className="text-slate-600 mt-0.5">{item.comment}</p>}
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(item.date).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setDetailReq(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
              >
                Fechar
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {detailReq.status === 'Solicitação enviada' && (
                  <>
                    <button
                      onClick={() => openActionModal(detailReq, 'reject')}
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => openActionModal(detailReq, 'return')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Devolver p/ Ajustes
                    </button>
                    <button
                      onClick={() => openActionModal(detailReq, 'approve')}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aprovar e Definir Valor
                    </button>
                  </>
                )}

                {detailReq.status === 'Em análise financeira' && !detailReq.invoiceAuthorized && (
                  <button
                    onClick={() => openActionModal(detailReq, 'authorize')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <FileCheck className="w-4 h-4" /> Autorizar NF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {activeModalReq && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {modalAction === 'approve' && 'Aprovar Solicitação'}
                  {modalAction === 'reject' && 'Rejeitar Solicitação'}
                  {modalAction === 'return' && 'Devolver para Ajustes'}
                  {modalAction === 'authorize' && 'Autorizar Emissão de Nota Fiscal'}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeModalReq.code} • {activeModalReq.operatorName} • {activeModalReq.destination}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveModalReq(null);
                  setModalAction(null);
                  setApprovedAmountInput('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Read-only Acionamentos & Details visible while calculating/approving */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold uppercase tracking-wider">
                <span>Acionamentos Solicitados</span>
                <span>
                  {new Date(activeModalReq.startDate).toLocaleDateString('pt-BR')} a{' '}
                  {new Date(activeModalReq.endDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-slate-900 font-semibold whitespace-pre-line">{activeModalReq.purpose}</p>
              {activeModalReq.description && (
                <p className="text-slate-700 pt-1.5 border-t border-amber-200/70 whitespace-pre-line">
                  <strong className="font-semibold">Obs.:</strong> {activeModalReq.description}
                </p>
              )}
            </div>

            {activeModalReq.activities && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 text-xs space-y-1">
                <span className="font-bold text-teal-900 uppercase tracking-wider block">
                  Atividades Informadas (Justificativa)
                </span>
                <p className="text-slate-800 whitespace-pre-line">{activeModalReq.activities}</p>
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4 text-xs">
              {modalAction === 'approve' && (
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Valor Definido pelo Coordenador (R$){' '}
                    {activeModalReq.amountRequested <= 0 && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required={activeModalReq.amountRequested <= 0}
                    placeholder="Ex: 1500.00"
                    value={approvedAmountInput}
                    onChange={e => setApprovedAmountInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {modalAction === 'authorize' ? 'Orientações para o Operador sobre a NF' : 'Justificativa / Comentários'}
                  {modalAction !== 'authorize' && modalAction !== 'approve' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  required={modalAction === 'reject' || modalAction === 'return'}
                  placeholder={
                    modalAction === 'authorize'
                      ? 'Ex: Emitir NF de serviços de vistoria com retenções legais.'
                      : modalAction === 'return'
                      ? 'Informe o que precisa ser corrigido...'
                      : 'Justificativa...'
                  }
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalReq(null);
                    setModalAction(null);
                    setApprovedAmountInput('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md ${
                    modalAction === 'reject' ? 'bg-red-600 hover:bg-red-500' : modalAction === 'return' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-teal-600 hover:bg-teal-500'
                  }`}
                >
                  Confirmar Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
