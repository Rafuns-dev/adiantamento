import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { Receipt, CheckCircle2, XCircle, Calculator, Send, AlertCircle, DollarSign, Eye, Search, X } from 'lucide-react';
import { AdvanceRequest, RefundData, ExpenseItem } from '../../types';

export const AccountabilityReview: React.FC = () => {
  const {
    requests,
    reviewAccountabilityExpense,
    reviewAccountability,
    registerRefund,
    approveReimbursement,
    finalizeAccountability
  } = useApp();

  const [activeReq, setActiveReq] = useState<AdvanceRequest | null>(null);
  const [comment, setComment] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<'PIX' | 'Depósito' | 'Desconto em folha/repasse'>('PIX');
  const [refundReceipt, setRefundReceipt] = useState('comprovante_devolucao.pdf');
  const [viewingExpenseDoc, setViewingExpenseDoc] = useState<ExpenseItem | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [selectedName, setSelectedName] = useState('todos');

  const allPendingAccountabilities = requests.filter(
    r =>
      r.status === 'Prestação em análise' ||
      r.status === 'Aguardando devolução de saldo' ||
      r.status === 'Aguardando aprovação de reembolso' ||
      r.accountability
  );

  const uniqueNames = Array.from(
    new Set(allPendingAccountabilities.map(r => r.operatorName))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const pendingAccountabilities = allPendingAccountabilities.filter(r => {
    const matchesSearch =
      !nameFilter.trim() || r.operatorName.toLowerCase().includes(nameFilter.trim().toLowerCase());
    const matchesSelect = selectedName === 'todos' || r.operatorName === selectedName;
    return matchesSearch && matchesSelect;
  });

  const handleApproveFull = (req: AdvanceRequest) => {
    reviewAccountability(req.id, true, comment || 'Prestação de contas conferida e aprovada.');
    setActiveReq(null);
    setComment('');
  };

  const handleRejectFull = (req: AdvanceRequest) => {
    if (!comment) {
      alert('Informe o motivo da devolução para ajustes.');
      return;
    }
    reviewAccountability(req.id, false, comment);
    setActiveReq(null);
    setComment('');
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq) return;
    registerRefund(activeReq.id, {
      amount: parseFloat(refundAmount || '0'),
      date: new Date().toISOString().substring(0, 10),
      method: refundMethod,
      receiptUrl: refundReceipt
    });
    setActiveReq(null);
  };

  const handleReimburse = (req: AdvanceRequest) => {
    approveReimbursement(req.id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 shrink-0" />
            <span>Análise de Prestações de Contas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Confira despesas reais, aprove itens, gerencie saldos a devolver e reembolsos excedentes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-52">
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pendingAccountabilities.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            Nenhuma prestação de contas pendente de análise no momento.
          </div>
        ) : (
          pendingAccountabilities.map(req => {
            const acc = req.accountability;
            if (!acc) return null;

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-900 text-base">{req.code}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mb-1">Operador: {req.operatorName}</p>
                  <p className="text-xs text-slate-500 mb-4">{req.destination}</p>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valor Adiantado:</span>
                      <span className="font-bold">R$ {req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Despesas Aprovadas:</span>
                      <span className="font-bold text-teal-600">R$ {acc.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Balanço:</span>
                      <span className={`font-extrabold ${acc.balanceType === 'saldo_a_devolver' ? 'text-amber-600' : acc.balanceType === 'excedente' ? 'text-indigo-600' : 'text-teal-600'}`}>
                        {acc.balanceType === 'saldo_a_devolver' && `Saldo a devolver: R$ ${acc.balanceAmount.toFixed(2)}`}
                        {acc.balanceType === 'excedente' && `Excedente (Reembolso): R$ ${acc.balanceAmount.toFixed(2)}`}
                        {acc.balanceType === 'zerado' && 'Contas Zeradas'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setActiveReq(req)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Receipt className="w-4 h-4" /> Detalhar e Analisar Despesas
                  </button>

                  {req.status === 'Aguardando devolução de saldo' && !acc.refundDetails && (
                    <button
                      onClick={() => { setActiveReq(req); setRefundAmount(String(acc.balanceAmount)); }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Registrar Devolução de Saldo
                    </button>
                  )}

                  {req.status === 'Aguardando aprovação de reembolso' && acc.reimbursementStatus !== 'aprovado' && (
                    <button
                      onClick={() => handleReimburse(req)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Aprovar Reembolso de Excedente
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Detail & Review */}
      {activeReq && activeReq.accountability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Análise de Despesas • {activeReq.code}</h3>
                <p className="text-xs text-slate-400">{activeReq.operatorName} • {activeReq.destination}</p>
              </div>
              <button onClick={() => setActiveReq(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <span className="text-slate-500 block">Adiantamento:</span>
                  <span className="font-bold text-slate-900 text-sm">R$ {activeReq.amountRequested.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Despesas:</span>
                  <span className="font-bold text-teal-600 text-sm">R$ {activeReq.accountability.totalExpenses.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Balanço:</span>
                  <span className="font-bold text-indigo-600 text-sm capitalize">{activeReq.accountability.balanceType.replace(/_/g, ' ')}: R$ {activeReq.accountability.balanceAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Expenses table with item approval */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Status Item</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeReq.accountability.expenses.map(exp => (
                      <tr key={exp.id}>
                        <td className="p-3 font-bold text-slate-800">{exp.category}</td>
                        <td className="p-3 text-slate-600">{new Date(exp.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 text-slate-700">{exp.description}</td>
                        <td className="p-3 font-bold text-slate-900">R$ {exp.amount.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${exp.approved !== false ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'}`}>
                            {exp.approved !== false ? 'Aprovado' : 'Reprovado'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1 flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingExpenseDoc(exp)}
                            className="px-2 py-1 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 flex items-center gap-1"
                            title="Ver Comprovante Anexado"
                          >
                            <Eye className="w-3 h-3 text-teal-400" />
                            <span>Comprovante</span>
                          </button>
                          <button
                            onClick={() => reviewAccountabilityExpense(activeReq.id, exp.id, true)}
                            className="px-2 py-1 bg-teal-100 text-teal-800 rounded font-bold hover:bg-teal-200"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => reviewAccountabilityExpense(activeReq.id, exp.id, false, 'Comprovante inconsistente')}
                            className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold hover:bg-red-200"
                          >
                            Reprovar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingExpenseDoc && (
                <DocumentViewerModal
                  title={`Comprovante: ${viewingExpenseDoc.category}`}
                  fileName={viewingExpenseDoc.receiptUrl || 'comprovante.pdf'}
                  fileData={viewingExpenseDoc.receiptData}
                  details={[
                    { label: 'Categoria', value: viewingExpenseDoc.category },
                    { label: 'Data', value: new Date(viewingExpenseDoc.date).toLocaleDateString('pt-BR') },
                    { label: 'Descrição', value: viewingExpenseDoc.description },
                    { label: 'Valor', value: `R$ ${viewingExpenseDoc.amount.toFixed(2)}` }
                  ]}
                  onClose={() => setViewingExpenseDoc(null)}
                />
              )}

              {/* Refund registration if needed */}
              {activeReq.status === 'Aguardando devolução de saldo' && !activeReq.accountability.refundDetails && (
                <form onSubmit={handleRefundSubmit} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-amber-900 text-sm">Registrar Devolução de Saldo pelo Operador</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Valor Devolvido (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={refundAmount}
                        onChange={e => setRefundAmount(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Forma</label>
                      <select
                        value={refundMethod}
                        onChange={e => setRefundMethod(e.target.value as any)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Depósito">Depósito</option>
                        <option value="Desconto em folha/repasse">Desconto em folha/repasse</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg shadow-sm">
                    Confirmar Devolução e Finalizar Processo
                  </button>
                </form>
              )}

              {/* Comments and Final Approval */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <label className="block font-bold uppercase tracking-wider text-slate-700">Comentários / Justificativa da Análise</label>
                <textarea
                  rows={2}
                  placeholder="Comentário sobre a prestação..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleRejectFull(activeReq)}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500"
                  >
                    Devolver para Ajustes
                  </button>
                  <button
                    onClick={() => handleApproveFull(activeReq)}
                    className="px-5 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-500"
                  >
                    Aprovar Prestação Completa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
