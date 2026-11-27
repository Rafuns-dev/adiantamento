import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { DollarSign, Send, Upload, CheckCircle2, Calendar, Search, X } from 'lucide-react';
import { AdvanceRequest, PaymentData } from '../../types';
import { prepareUploadFile } from '../../utils/fileHelpers';

export const PaymentsManagement: React.FC = () => {
  const { requests, registerPayment } = useApp();

  const [activeReq, setActiveReq] = useState<AdvanceRequest | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [method, setMethod] = useState<'PIX' | 'Transferência Bancária' | 'DOC/TED'>('PIX');
  const [transactionId, setTransactionId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptData, setReceiptData] = useState<string | undefined>(undefined);
  const [successMsg, setSuccessMsg] = useState(false);

  const [nameFilter, setNameFilter] = useState('');
  const [selectedName, setSelectedName] = useState('todos');

  const allPendingPayments = requests.filter(r => r.status === 'Aguardando pagamento');
  const uniqueNames = Array.from(new Set(allPendingPayments.map(r => r.operatorName))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  const pendingPayments = allPendingPayments.filter(r => {
    const matchesSearch =
      !nameFilter.trim() || r.operatorName.toLowerCase().includes(nameFilter.trim().toLowerCase());
    const matchesSelect = selectedName === 'todos' || r.operatorName === selectedName;
    return matchesSearch && matchesSelect;
  });

  const handleOpenPayment = (req: AdvanceRequest) => {
    setActiveReq(req);
    const defaultAmount =
      req.amountRequested > 0 ? req.amountRequested : req.invoice?.amount || 0;
    setAmountPaid(defaultAmount > 0 ? String(defaultAmount) : '');
    setMethod(req.invoice?.paymentPreference === 'Depósito' ? 'Transferência Bancária' : 'PIX');
    setTransactionId('PIX' + Math.floor(Math.random() * 1000000000));
    setReceiptUrl('comprovante_banco.pdf');
    setReceiptData(undefined);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const prepared = await prepareUploadFile(file, 1280, 0.75);
    setReceiptUrl(prepared.file.name || file.name);
    setReceiptData(prepared.dataUrl);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq) return;
    const ok = await registerPayment(activeReq.id, {
      amountPaid: parseFloat(amountPaid),
      date,
      method,
      transactionId,
      receiptUrl,
      receiptData
    });
    if (!ok) return;
    setSuccessMsg(true);
    setActiveReq(null);
    setTimeout(() => {
      setSuccessMsg(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 shrink-0" />
            <span>Gestão de Pagamentos de Adiantamentos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre transferências e adiantamentos para solicitações com Nota Fiscal aprovada.
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

      {successMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span className="text-sm font-semibold">Pagamento registrado com sucesso! Status atualizado para "Pago".</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pendingPayments.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            Nenhuma solicitação aguardando pagamento no momento.
          </div>
        ) : (
          pendingPayments.map(req => (
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
                    <span className="text-slate-500">NF Aprovada nº:</span>
                    <span className="font-bold">{req.invoice?.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CNPJ Favorecido:</span>
                    <span className="font-mono">{req.invoice?.cnpj}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold">Valor a Pagar:</span>
                    <span className="font-extrabold text-teal-600 text-base">
                      {(req.amountRequested > 0 ? req.amountRequested : req.invoice?.amount || 0) > 0
                        ? `R$ ${(req.amountRequested > 0 ? req.amountRequested : req.invoice?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : 'A definir'}
                    </span>
                  </div>
                  {req.invoice?.paymentPreference && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recebimento Solicitado:</span>
                        <span className="font-bold text-slate-900">{req.invoice.paymentPreference}</span>
                      </div>
                      {req.invoice.paymentDetails && (
                        <div className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 whitespace-pre-line">
                          <span className="font-semibold text-slate-500 block mb-0.5">
                            {req.invoice.paymentPreference === 'PIX' ? 'Dados / Chave PIX:' : 'Dados Bancários:'}
                          </span>
                          {req.invoice.paymentDetails}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleOpenPayment(req)}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <DollarSign className="w-4 h-4" /> Registrar Pagamento
              </button>
            </div>
          ))
        )}
      </div>

      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Registrar Pagamento</h3>
                <p className="text-xs text-slate-500">{activeReq.code} • {activeReq.operatorName}</p>
              </div>
              <button onClick={() => setActiveReq(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
              {activeReq.invoice?.paymentPreference && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-teal-800">
                      Dados informados na Nota Fiscal
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white font-bold text-[10px]">
                      {activeReq.invoice.paymentPreference}
                    </span>
                  </div>
                  {activeReq.invoice.paymentDetails && (
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-line pt-1">
                      {activeReq.invoice.paymentDetails}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Valor Efetivamente Pago (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Data do Pagamento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Forma de Pagamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={method}
                    onChange={e => setMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="DOC/TED">DOC/TED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Identificador da Transação / Comprovante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PIX9876543212026"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Anexo do Comprovante (PDF, JPG ou PNG)
                </label>
                <div className="border-2 border-dashed border-teal-200 bg-teal-50/30 rounded-xl p-3.5 text-center">
                  <Upload className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-500 cursor-pointer"
                  />
                  {receiptUrl && (
                    <span className="text-[11px] font-semibold text-teal-700 block mt-1.5">
                      Selecionado: {receiptUrl}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveReq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Registrar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
