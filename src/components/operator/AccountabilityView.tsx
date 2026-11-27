import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../StatusBadge';
import { Receipt, Plus, Trash2, Calculator, CheckCircle2, Eye, X, Lock, AlertCircle } from 'lucide-react';
import { AdvanceRequest, ExpenseCategory, ExpenseItem } from '../../types';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { prepareUploadFile } from '../../utils/fileHelpers';

export const AccountabilityView: React.FC = () => {
  const { requests, currentUser, submitAccountability } = useApp();

  if (!currentUser) return null;

  const myRequests = requests.filter((r) => r.operatorId === currentUser.id);
  const eligibleRequests = myRequests.filter(
    (r) =>
      r.status === 'Pago' ||
      r.status === 'Aguardando prestação de contas' ||
      r.status === 'Prestação devolvida para ajustes' ||
      Boolean(r.accountability)
  );

  // Não abre nenhum preenchimento automaticamente — só quando clicar na solicitação
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  // Expense form state
  const [category, setCategory] = useState<ExpenseCategory>('Hospedagem');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptData, setReceiptData] = useState<string | undefined>(undefined);
  const [readingFile, setReadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseItem | null>(null);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [successMsg, setSuccessMsg] = useState(false);

  const selectedReq = eligibleRequests.find((r) => r.id === selectedReqId) || null;

  const isRequestAlreadySent = (req: AdvanceRequest): boolean =>
    Boolean(req.accountability) && req.status !== 'Prestação devolvida para ajustes';

  const handleSelectRequest = (req: AdvanceRequest) => {
    setSelectedReqId(req.id);
    setExpenses(req.accountability?.expenses || []);
    setSuccessMsg(false);
    setErrorMsg('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || readingFile) return;
    const newItem: ExpenseItem = {
      id: 'exp-' + Date.now() + Math.random().toString(36).substr(2, 3),
      category,
      date,
      amount: parseFloat(amount),
      description,
      receiptUrl: receiptUrl || 'comprovante.pdf',
      receiptData,
    };
    setExpenses((prev) => [...prev, newItem]);
    setAmount('');
    setDescription('');
    setReceiptUrl('');
    setReceiptData(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const isAlreadySent = selectedReq ? isRequestAlreadySent(selectedReq) : false;
  const activeExpenses = isAlreadySent
    ? selectedReq?.accountability?.expenses || []
    : expenses;

  const totalExpenses = activeExpenses.reduce((acc, item) => acc + item.amount, 0);
  const advanceAmount = selectedReq?.amountRequested || 0;
  const balanceDiff = advanceAmount - totalExpenses;

  const handleSubmitAccountability = async () => {
    if (!selectedReq || expenses.length === 0 || isAlreadySent || submitting) return;
    setErrorMsg('');
    setSubmitting(true);
    const ok = await submitAccountability(selectedReq.id, expenses);
    setSubmitting(false);
    if (!ok) {
      setErrorMsg('Não foi possível salvar os comprovantes no Firebase. Tente reduzir o tamanho ou quantidade de anexos.');
      return;
    }
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-teal-600" />
            <span>Prestação de Contas de Viagem</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clique em uma solicitação abaixo para preencher ou visualizar a prestação de contas enviada.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span className="text-sm font-semibold">
            Prestação de contas enviada com sucesso para análise do financeiro!
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Select Request */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Selecione a Solicitação para Prestação de Contas
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {eligibleRequests.length === 0 ? (
            <div className="col-span-3 text-xs text-slate-500 py-4">
              Nenhuma solicitação com pagamento liberado para prestação de contas no momento.
            </div>
          ) : (
            eligibleRequests.map((req) => {
              const sent = isRequestAlreadySent(req);
              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => handleSelectRequest(req)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedReq?.id === req.id
                      ? 'border-teal-600 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <span className="font-extrabold text-slate-900 text-sm">{req.code}</span>
                    {sent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Enviado
                      </span>
                    ) : (
                      <StatusBadge status={req.status} />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">{req.destination}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="text-xs font-bold text-teal-700">
                      Adiantamento: R${' '}
                      {req.amountRequested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {sent ? 'Clique p/ visualizar' : 'Clique p/ preencher'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedReq && (
        <div className="space-y-4">
          {/* Request Selected Bar */}
          <div className="bg-white rounded-2xl px-6 py-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-extrabold text-slate-900 text-sm">{selectedReq.code}</span>
              <span className="text-xs text-slate-600">{selectedReq.destination}</span>
              <StatusBadge status={selectedReq.status} />
              {isAlreadySent && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Prestação de Contas Enviada
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedReqId(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Fechar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Add expenses (only if not yet sent) & list */}
            <div className="lg:col-span-2 space-y-6">
              {!isAlreadySent ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-teal-600" />
                    <span>Adicionar Lançamento de Despesa</span>
                  </h3>

                  <form
                    onSubmit={handleAddExpense}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
                  >
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Categoria <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                      >
                        <option value="Hospedagem">Hospedagem</option>
                        <option value="Combustível">Combustível</option>
                        <option value="Alimentação">Alimentação</option>
                        <option value="Almoço">Almoço</option>
                        <option value="Pedágios">Pedágios</option>
                        <option value="Estacionamento">Estacionamento</option>
                        <option value="Outras despesas">Outras despesas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Data da Despesa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Valor Efetivamente Gasto (R$) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="150.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Comprovante (Foto ou Arquivo)
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf,.xml"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setErrorMsg('');
                          setReadingFile(true);
                          try {
                            const prepared = await prepareUploadFile(file, 1200, 0.72);
                            setReceiptUrl(prepared.file.name || file.name);
                            setReceiptData(prepared.dataUrl);
                          } catch {
                            setErrorMsg('Não foi possível ler a imagem/arquivo selecionado.');
                          } finally {
                            setReadingFile(false);
                          }
                        }}
                        className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1.5"
                      />
                      {readingFile && (
                        <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                          Processando foto...
                        </span>
                      )}
                      {!readingFile && receiptUrl && (
                        <span className="text-[10px] text-teal-700 font-semibold mt-1 block">
                          Selecionado: {receiptUrl}
                        </span>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Descrição Detalhada <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Abastecimento Posto BR Rodovia SP-280"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={readingFile}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{readingFile ? 'Processando foto...' : 'Adicionar Despesa'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-extrabold text-teal-900">
                      Prestação de Contas já Enviada
                    </h3>
                    <p className="text-xs text-teal-800 mt-0.5">
                      Os lançamentos abaixo foram enviados para o Financeiro e estão em modo somente
                      leitura ({selectedReq.status}).
                    </p>
                  </div>
                </div>
              )}

              {/* Expenses List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Lançamentos Registrados ({activeExpenses.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Descrição</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Nenhuma despesa lançada ainda. Utilize o formulário acima.
                          </td>
                        </tr>
                      ) : (
                        activeExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-800">{exp.category}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(exp.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{exp.description}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingExpense(exp)}
                                  title="Visualizar Comprovante"
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-teal-400" />
                                </button>
                                {!isAlreadySent && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExpense(exp.id)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
            </div>

            {/* Right col: Calculations & Summary */}
            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-6">
                <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Calculator className="w-5 h-5 text-teal-400" />
                  <span>Resumo Financeiro</span>
                </h3>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Valor Adiantado:</span>
                    <span className="font-bold text-white">
                      R$ {advanceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total de Despesas:</span>
                    <span className="font-bold text-teal-400">
                      R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <span className="text-slate-400 text-xs block mb-1">Balanço / Diferença:</span>
                    {balanceDiff > 0 ? (
                      <div className="bg-amber-950/60 border border-amber-800 text-amber-300 p-3.5 rounded-xl text-xs">
                        <strong className="block text-sm font-bold mb-1">Saldo a Devolver:</strong>
                        R$ {balanceDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Adiantamento maior que despesas)
                      </div>
                    ) : balanceDiff < 0 ? (
                      <div className="bg-indigo-950/60 border border-indigo-800 text-indigo-300 p-3.5 rounded-xl text-xs">
                        <strong className="block text-sm font-bold mb-1">
                          Valor Excedente (Reembolso):
                        </strong>
                        R${' '}
                        {Math.abs(balanceDiff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                        (Despesas maiores que adiantamento)
                      </div>
                    ) : (
                      <div className="bg-teal-950/60 border border-teal-800 text-teal-300 p-3.5 rounded-xl text-xs font-bold">
                        Contas zeradas perfeitamente!
                      </div>
                    )}
                  </div>
                </div>

                {isAlreadySent ? (
                  <div className="w-full py-3 bg-teal-900/60 border border-teal-700 text-teal-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Enviado ({selectedReq.status})</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitAccountability}
                    disabled={expenses.length === 0 || submitting || readingFile}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-900/40 transition-all"
                  >
                    {submitting ? 'Enviando comprovantes...' : 'Enviar Prestação de Contas'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingExpense && (
        <DocumentViewerModal
          title={`Comprovante: ${viewingExpense.category}`}
          fileName={viewingExpense.receiptUrl || 'comprovante.pdf'}
          fileData={viewingExpense.receiptData}
          details={[
            { label: 'Categoria', value: viewingExpense.category },
            { label: 'Data', value: new Date(viewingExpense.date).toLocaleDateString('pt-BR') },
            { label: 'Descrição', value: viewingExpense.description },
            { label: 'Valor', value: `R$ ${viewingExpense.amount.toFixed(2)}` },
          ]}
          onClose={() => setViewingExpense(null)}
        />
      )}
    </div>
  );
};
