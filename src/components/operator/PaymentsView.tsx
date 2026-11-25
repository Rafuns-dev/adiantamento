import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DollarSign, Calendar, Download, Eye } from 'lucide-react';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { downloadFile } from '../../utils/fileHelpers';

export const PaymentsView: React.FC = () => {
  const { requests, currentUser } = useApp();
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    fileName: string;
    fileData?: string;
    details: Array<{ label: string; value: string }>;
  } | null>(null);

  if (!currentUser) return null;

  const myRequests = requests.filter(r => r.operatorId === currentUser.id && r.payment);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-teal-600" />
            <span>Meus Pagamentos Recebidos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulte os comprovantes e detalhes dos adiantamentos transferidos pela AMETA.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Solicitação / Destino</th>
                <th className="py-3.5 px-6">Valor Pago</th>
                <th className="py-3.5 px-6">Data do Pagamento</th>
                <th className="py-3.5 px-6">Forma / Transação</th>
                <th className="py-3.5 px-6 text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    Nenhum pagamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                myRequests.map(req => {
                  const details = [
                    { label: 'Solicitação', value: req.code },
                    { label: 'Destino', value: req.destination },
                    { label: 'Valor Pago', value: `R$ ${(req.payment?.amountPaid || 0).toFixed(2)}` },
                    { label: 'Forma', value: req.payment?.method || '' },
                    { label: 'Transação', value: req.payment?.transactionId || '' },
                  ];
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{req.code}</span>
                        <span className="text-xs text-slate-500 block">{req.destination}</span>
                      </td>
                      <td className="py-4 px-6 font-bold text-teal-600 text-base tabular-nums">
                        R$ {req.payment?.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-700">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {req.payment?.date ? new Date(req.payment.date).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <span className="font-semibold text-slate-800 block">{req.payment?.method}</span>
                        <span className="font-mono text-[11px] text-slate-500">{req.payment?.transactionId}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setViewingDoc({
                                title: `Comprovante de Pagamento — ${req.code}`,
                                fileName: req.payment?.receiptUrl || 'comprovante_pagamento.pdf',
                                fileData: req.payment?.receiptData,
                                details,
                              })
                            }
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-400" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            onClick={() =>
                              downloadFile(
                                req.payment?.receiptUrl || 'comprovante_pagamento.pdf',
                                req.payment?.receiptData,
                                details.map(d => `${d.label}: ${d.value}`).join('\n')
                              )
                            }
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingDoc && (
        <DocumentViewerModal
          title={viewingDoc.title}
          fileName={viewingDoc.fileName}
          fileData={viewingDoc.fileData}
          details={viewingDoc.details}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
};
