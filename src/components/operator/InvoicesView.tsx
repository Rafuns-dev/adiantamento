import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { FileCheck2, Upload, AlertCircle, CheckCircle2, FileText, Send, Eye } from 'lucide-react';
import { AdvanceRequest } from '../../types';
import { readFileAsDataUrl } from '../../utils/fileHelpers';

export const InvoicesView: React.FC = () => {
  const { requests, currentUser, submitInvoice } = useApp();

  if (!currentUser) return null;

  const [activeRequest, setActiveRequest] = useState<AdvanceRequest | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [emissionDate, setEmissionDate] = useState('');
  const [amount, setAmount] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [xmlFileName, setXmlFileName] = useState('');
  const [xmlData, setXmlData] = useState<string | undefined>(undefined);
  const [successMsg, setSuccessMsg] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    fileName: string;
    fileData?: string;
    secondaryAttachment?: { label: string; fileName: string; fileData?: string };
    details: Array<{ label: string; value: string }>;
  } | null>(null);

  // Show all operator requests so they can submit or check invoices
  const myRequests = requests.filter(r => r.operatorId === currentUser.id && r.status !== 'Rejeitado' && r.status !== 'Cancelado');

  const handleOpenModal = (req: AdvanceRequest) => {
    setActiveRequest(req);
    setInvoiceNumber(req.invoice?.number || '');
    setCnpj(req.invoice?.cnpj || currentUser.cpfCnpj);
    setEmissionDate(req.invoice?.emissionDate || new Date().toISOString().substring(0, 10));
    setAmount(req.invoice?.amount ? String(req.invoice.amount) : String(req.amountRequested));
    setFileName(req.invoice?.pdfUrl || '');
    setFileData(req.invoice?.pdfData);
    setXmlFileName(req.invoice?.xmlUrl || '');
    setXmlData(req.invoice?.xmlData);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const dataUrl = await readFileAsDataUrl(f);
      if (f.name.toLowerCase().endsWith('.xml')) {
        setXmlFileName(f.name);
        setXmlData(dataUrl);
      } else {
        setFileName(f.name);
        setFileData(dataUrl);
      }
    }
  };

  const handleSendInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;
    submitInvoice(activeRequest.id, {
      number: invoiceNumber,
      cnpj,
      emissionDate,
      amount: parseFloat(amount),
      pdfUrl: fileName || 'nota_fiscal.pdf',
      pdfData: fileData,
      xmlUrl: xmlFileName || undefined,
      xmlData: xmlData
    });
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setActiveRequest(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-teal-600" />
            <span>Notas Fiscais de Adiantamentos (DFE)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Envie e anexe os arquivos PDF e XML das Notas Fiscais para conferência do financeiro.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span className="text-sm font-semibold">Nota Fiscal enviada para conferência com sucesso!</span>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myRequests.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            Nenhuma solicitação encontrada para envio de Nota Fiscal.
          </div>
        ) : (
          myRequests.map(req => {
            const hasInvoice = !!req.invoice;
            const isAuthorized = req.status === 'Autorizado emitir Nota Fiscal' || req.status === 'Nota Fiscal devolvida para correção' || hasInvoice || req.status === 'Em análise financeira';

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-900 text-base">{req.code}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">{req.destination}</p>
                  <p className="text-xs text-slate-500 mb-4">{req.purpose}</p>

                  <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valor Solicitado:</span>
                      <span className="font-bold text-teal-600">
                        R$ {req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {req.invoiceObservation && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-500 block mb-0.5 font-semibold">Instrução do Financeiro:</span>
                        <p className="text-slate-700 italic">{req.invoiceObservation}</p>
                      </div>
                    )}
                    {hasInvoice && (
                      <div className="pt-2 border-t border-slate-200 text-slate-700 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">NF nº:</span>
                          <span className="font-bold">{req.invoice?.number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">CNPJ:</span>
                          <span className="font-mono">{req.invoice?.cnpj}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Status NF:</span>
                          <span className={`font-bold capitalize ${req.invoice?.status === 'aprovado' ? 'text-teal-600' : req.invoice?.status === 'devolvido' ? 'text-red-600' : 'text-amber-600'}`}>
                            {req.invoice?.status}
                          </span>
                        </div>
                        {req.invoice?.reviewComment && (
                          <div className="mt-1 p-2 bg-red-50 text-red-800 rounded-lg">
                            <span className="font-semibold block">Motivo devolução:</span>
                            {req.invoice.reviewComment}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {hasInvoice && (
                    <button
                      onClick={() => setViewingDoc({
                        title: `Nota Fiscal nº ${req.invoice?.number}`,
                        fileName: req.invoice?.pdfUrl || 'nota_fiscal.pdf',
                        fileData: req.invoice?.pdfData,
                        secondaryAttachment: req.invoice?.xmlUrl
                          ? { label: 'XML da NF', fileName: req.invoice.xmlUrl, fileData: req.invoice.xmlData }
                          : undefined,
                        details: [
                          { label: 'Número da NF', value: req.invoice?.number || '' },
                          { label: 'CNPJ Emissor', value: req.invoice?.cnpj || '' },
                          { label: 'Data de Emissão', value: req.invoice?.emissionDate || '' },
                          { label: 'Valor', value: `R$ ${(req.invoice?.amount || 0).toFixed(2)}` },
                          { label: 'Status', value: req.invoice?.status || '' }
                        ]
                      })}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Eye className="w-4 h-4 text-teal-400" />
                      <span>Visualizar Nota Fiscal Anexada</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenModal(req)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{hasInvoice ? 'Atualizar / Enviar Nova NF' : 'Enviar Nota Fiscal (Anexar)'}</span>
                  </button>
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

      {/* Modal for Invoice Upload */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Envio de Nota Fiscal</h3>
                <p className="text-xs text-slate-500">Solicitação: {activeRequest.code} - {activeRequest.destination}</p>
              </div>
              <button
                onClick={() => setActiveRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Número da Nota Fiscal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 000452"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  CNPJ do Emissor (PJ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 12.345.678/0001-90"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Data de Emissão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={emissionDate}
                    onChange={e => setEmissionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Valor da NF (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Anexar Arquivo PDF / XML <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-teal-300 rounded-xl p-5 text-center bg-teal-50/30 hover:bg-teal-50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <span className="text-xs text-slate-700 font-bold block">Clique para selecionar arquivos do computador</span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    PDF / XML suportados ({fileName || 'Nenhum PDF'}{xmlFileName ? ` • ${xmlFileName}` : ''})
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xml,.jpg,.png"
                    onChange={handleFileChange}
                    className="mt-3 w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar para Conferência</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
