import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { FileCheck, CheckCircle2, XCircle, Eye, Search, X } from 'lucide-react';
import { AdvanceRequest } from '../../types';

export const InvoiceReview: React.FC = () => {
  const { requests, reviewInvoice } = useApp();

  const [activeReq, setActiveReq] = useState<AdvanceRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isApproving, setIsApproving] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    fileName: string;
    fileData?: string;
    secondaryAttachment?: { label: string; fileName: string; fileData?: string };
    details: Array<{ label: string; value: string }>;
  } | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [selectedName, setSelectedName] = useState('todos');

  const allInvoices = requests.filter(
    r => r.status === 'Nota Fiscal enviada' || r.status === 'Nota Fiscal em conferência' || r.invoice
  );

  const uniqueNames = Array.from(new Set(allInvoices.map(r => r.operatorName))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  const pendingInvoices = allInvoices.filter(r => {
    const matchesSearch =
      !nameFilter.trim() || r.operatorName.toLowerCase().includes(nameFilter.trim().toLowerCase());
    const matchesSelect = selectedName === 'todos' || r.operatorName === selectedName;
    return matchesSearch && matchesSelect;
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq) return;
    reviewInvoice(activeReq.id, isApproving, reviewComment);
    setActiveReq(null);
    setReviewComment('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 shrink-0" />
            <span>Conferência de Notas Fiscais</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare os dados da Nota Fiscal enviada com o valor autorizado antes de liberar para pagamento.
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
        {pendingInvoices.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            {nameFilter.trim() || selectedName !== 'todos'
              ? 'Nenhuma Nota Fiscal encontrada para o nome filtrado.'
              : 'Nenhuma Nota Fiscal pendente de conferência no momento.'}
          </div>
        ) : (
          pendingInvoices.map(req => {
            const inv = req.invoice;
            if (!inv) return null;

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
                      <span className="text-slate-500">Valor Autorizado:</span>
                      <span className="font-bold text-slate-900">
                        {req.amountRequested > 0
                          ? `R$ ${req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'Sem valor prévio'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">NF nº:</span>
                      <span className="font-bold text-teal-700">{inv.number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CNPJ Emissor:</span>
                      <span className="font-mono">{inv.cnpj}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data Emissão:</span>
                      <span>{new Date(inv.emissionDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Valor da NF:</span>
                      <span className="font-extrabold text-teal-600">
                        R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() =>
                      setViewingDoc({
                        title: `Nota Fiscal nº ${inv.number} (${req.code})`,
                        fileName: inv.pdfUrl || 'nota_fiscal.pdf',
                        fileData: inv.pdfData,
                        secondaryAttachment: inv.xmlUrl
                          ? { label: 'XML da NF', fileName: inv.xmlUrl, fileData: inv.xmlData }
                          : undefined,
                        details: [
                          { label: 'Operador', value: req.operatorName },
                          { label: 'NF nº', value: inv.number },
                          { label: 'CNPJ', value: inv.cnpj },
                          { label: 'Valor NF', value: `R$ ${inv.amount.toFixed(2)}` }
                        ]
                      })
                    }
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Eye className="w-4 h-4 text-teal-400" /> Visualizar Nota Fiscal Anexada
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setActiveReq(req); setIsApproving(true); }}
                      className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aprovar NF
                    </button>
                    <button
                      onClick={() => { setActiveReq(req); setIsApproving(false); }}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Devolver / Corrigir
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {viewingDoc && (
        <DocumentViewerModal
          title={viewingDoc.title}
          fileName={viewingDoc.fileName}
          fileData={viewingDoc.fileData}
          secondaryAttachment={viewingDoc.secondaryAttachment}
          details={viewingDoc.details}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {isApproving ? 'Aprovar Nota Fiscal' : 'Devolver Nota Fiscal para Correção'}
                </h3>
                <p className="text-xs text-slate-500">{activeReq.code} • {activeReq.invoice?.number}</p>
              </div>
              <button onClick={() => setActiveReq(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {isApproving ? 'Observação (Opcional)' : 'Motivo da Devolução / Correção'} {!isApproving && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  required={!isApproving}
                  placeholder={isApproving ? 'Ex: NF conferida e aprovada sem divergências.' : 'Informe o motivo da devolução para o operador...'}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
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
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md ${isApproving ? 'bg-teal-600 hover:bg-teal-500' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  Confirmar {isApproving ? 'Aprovação' : 'Devolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
