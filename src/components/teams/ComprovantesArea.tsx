import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ComprovanteServico, ExpenseCategory, NotaFiscalEquipe } from '../../types';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { downloadFile, readFileAsDataUrl } from '../../utils/fileHelpers';
import {
  Camera,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  X,
  Plus,
  Calculator,
} from 'lucide-react';

interface StagedComprovanteItem {
  localId: string;
  categoria: ExpenseCategory;
  data: string;
  valor: number;
  descricao: string;
  file: File;
  previewUrl?: string;
}

export const ComprovantesArea: React.FC = () => {
  const {
    currentUser,
    cadastros,
    notasEquipe,
    comprovantes,
    createComprovante,
    deleteComprovante,
    logDownloadAuditoria,
    resolveAuthenticatedStorageUrl,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'Aguardando comprovante' | 'Comprovada' | 'ALL'>(
    'Aguardando comprovante'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNota, setSelectedNota] = useState<NotaFiscalEquipe | null>(null);

  // External-style Expense/Receipt form state
  const [categoria, setCategoria] = useState<ExpenseCategory>('Hospedagem');
  const [dataServico, setDataServico] = useState(new Date().toISOString().slice(0, 10));
  const [valorInput, setValorInput] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; previewUrl?: string }>>([]);
  const [stagedItems, setStagedItems] = useState<StagedComprovanteItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Preview Modal
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    fileName: string;
    fileData?: string;
    details: Array<{ label: string; value: string }>;
  } | null>(null);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'financeiro';
  const canAttach = currentUser.role === 'vistoria_ameta' || isAdmin;

  const notasList = useMemo(() => {
    return notasEquipe.filter((n) => {
      if (statusFilter !== 'ALL' && n.status !== statusFilter) return false;
      if (statusFilter === 'ALL' && n.status === 'Emitida') {
        if (!isAdmin) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const match =
          n.numero.toLowerCase().includes(q) ||
          n.prestadorNome.toLowerCase().includes(q) ||
          n.prestadorCnpj.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [notasEquipe, statusFilter, searchTerm, isAdmin]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  // Safe provider lookup without exposing CPF, RG, or filiação
  const getSafeProviderMeta = (prestadorId: string) => {
    const c = cadastros.find((p) => p.id === prestadorId);
    return {
      nome: c?.nome || selectedNota?.prestadorNome || '-',
      funcao: c?.funcao || selectedNota?.prestadorFuncao || '-',
      empresa: c?.empresa || selectedNota?.prestadorEmpresa || '-',
      cnpj: c?.cnpj || selectedNota?.prestadorCnpj || '-',
    };
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validItems: Array<{ file: File; previewUrl?: string }> = [];
    for (const file of files) {
      const validMime =
        file.type === 'application/pdf' ||
        file.type === 'image/jpeg' ||
        file.type === 'image/png';
      if (!validMime) {
        setErrorMsg(`Arquivo "${file.name}" rejeitado. Apenas PDF, JPG ou PNG são permitidos.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`Arquivo "${file.name}" ultrapassa o limite de 10 MB.`);
        return;
      }
      let previewUrl: string | undefined;
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        previewUrl = await readFileAsDataUrl(file);
      }
      validItems.push({ file, previewUrl });
    }

    setSelectedFiles((prev) => [...prev, ...validItems]);
    e.target.value = '';
  };

  const buildItemsFromCurrentForm = (): StagedComprovanteItem[] | null => {
    if (!descricao.trim()) {
      setErrorMsg('Informe a descrição detalhada da despesa/comprovante.');
      return null;
    }
    const parsedValor = parseFloat(valorInput);
    if (Number.isNaN(parsedValor) || parsedValor <= 0) {
      setErrorMsg('Informe um valor efetivamente gasto válido maior que zero.');
      return null;
    }
    if (selectedFiles.length === 0) {
      setErrorMsg('Selecione pelo menos um arquivo de comprovante (PDF, JPG ou PNG).');
      return null;
    }

    return selectedFiles.map((item, idx) => ({
      localId: `stg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      categoria,
      data: dataServico,
      valor: parsedValor,
      descricao:
        selectedFiles.length > 1
          ? `${descricao.trim()} (${idx + 1}/${selectedFiles.length})`
          : descricao.trim(),
      file: item.file,
      previewUrl: item.previewUrl,
    }));
  };

  const handleAddToList = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const newItems = buildItemsFromCurrentForm();
    if (!newItems) return;

    setStagedItems((prev) => [...prev, ...newItems]);
    setValorInput('');
    setDescricao('');
    setSelectedFiles([]);
  };

  const handleRemoveStaged = (localId: string) => {
    setStagedItems((prev) => prev.filter((item) => item.localId !== localId));
  };

  const sendItemsToServer = async (itemsToSend: StagedComprovanteItem[]) => {
    if (!selectedNota) {
      setErrorMsg('É obrigatório selecionar uma nota fiscal existente.');
      return;
    }
    if (itemsToSend.length === 0) {
      setErrorMsg('Adicione pelo menos um lançamento com arquivo para enviar.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setErrorMsg('');
    try {
      for (let i = 0; i < itemsToSend.length; i++) {
        const item = itemsToSend[i];
        await createComprovante(
          {
            notaId: selectedNota.id,
            prestadorId: selectedNota.prestadorId,
            categoria: item.categoria,
            valor: item.valor,
            descricao: item.descricao,
            data: item.data,
          },
          item.file,
          (pct) => {
            const totalPct = Math.round(((i + pct / 100) / itemsToSend.length) * 100);
            setProgress(totalPct);
          }
        );
      }

      setSelectedNota((prev) => (prev ? { ...prev, status: 'Comprovada' } : null));
      setStagedItems([]);
      setSelectedFiles([]);
      setValorInput('');
      setDescricao('');
      showToast(
        `${itemsToSend.length} comprovante(s) enviado(s) e nota ${selectedNota.numero} marcada como Comprovada!`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar comprovante.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendAll = async () => {
    setErrorMsg('');
    let itemsToSend = [...stagedItems];
    // If the user filled the form and clicked Enviar directly without clicking Adicionar first
    if (itemsToSend.length === 0 || selectedFiles.length > 0 || (descricao.trim() && valorInput)) {
      if (selectedFiles.length > 0 || descricao.trim() || valorInput) {
        const currentFormItems = buildItemsFromCurrentForm();
        if (!currentFormItems) return;
        itemsToSend = [...itemsToSend, ...currentFormItems];
      }
    }
    await sendItemsToServer(itemsToSend);
  };

  const handleViewComprovante = async (comp: ComprovanteServico) => {
    let data = comp.arquivoData;
    if (!data && comp.arquivoPath) {
      const authUrl = await resolveAuthenticatedStorageUrl(comp.arquivoPath);
      if (authUrl) data = authUrl;
    }
    await logDownloadAuditoria(
      'comprovante',
      comp.id,
      `Visualização do comprovante ${comp.arquivoNome || comp.arquivoPath}`
    );
    setViewingDoc({
      title: `Comprovante: ${comp.categoria || comp.arquivoNome || 'Arquivo'}`,
      fileName: comp.arquivoNome || comp.arquivoPath,
      fileData: data,
      details: [
        { label: 'Categoria', value: comp.categoria || 'Comprovante de Serviço' },
        { label: 'Data', value: new Date(comp.data).toLocaleDateString('pt-BR') },
        { label: 'Descrição', value: comp.descricao },
        {
          label: 'Valor',
          value:
            comp.valor !== undefined
              ? `R$ ${comp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : 'Não informado',
        },
      ],
    });
  };

  const handleViewStaged = (item: StagedComprovanteItem) => {
    setViewingDoc({
      title: `Comprovante: ${item.categoria}`,
      fileName: item.file.name,
      fileData: item.previewUrl,
      details: [
        { label: 'Categoria', value: item.categoria },
        { label: 'Data', value: new Date(item.data).toLocaleDateString('pt-BR') },
        { label: 'Descrição', value: item.descricao },
        { label: 'Valor', value: `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    });
  };

  const handleDownloadComprovante = async (comp: ComprovanteServico) => {
    let data = comp.arquivoData;
    if (!data && comp.arquivoPath) {
      const authUrl = await resolveAuthenticatedStorageUrl(comp.arquivoPath);
      if (authUrl) data = authUrl;
    }
    await logDownloadAuditoria(
      'comprovante',
      comp.id,
      `Download do comprovante ${comp.arquivoNome || comp.arquivoPath}`
    );
    downloadFile(
      comp.arquivoNome || 'comprovante.pdf',
      data,
      `Categoria: ${comp.categoria || '-'}\nDescrição: ${comp.descricao}\nValor: R$ ${(comp.valor || 0).toFixed(2)}\nData: ${comp.data}\nEnviado por: ${comp.criadoPorNome}`
    );
    showToast('Download registrado na auditoria.');
  };

  const notaComprovantes = selectedNota
    ? comprovantes.filter((c) => c.notaId === selectedNota.id)
    : [];

  const totalSentAmount = notaComprovantes.reduce((acc, c) => acc + (c.valor || 0), 0);
  const totalStagedAmount = stagedItems.reduce((acc, s) => acc + s.valor, 0);
  const totalCombinedAmount = totalSentAmount + totalStagedAmount;
  const noteAmount = selectedNota?.valor || 0;
  const balanceDiff = noteAmount - totalCombinedAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Camera className="w-6 h-6 text-teal-600" />
            <span>Comprovantes de Serviço — Vistoriador AMETA</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione uma nota fiscal existente para lançar despesas e anexar comprovantes
            (PDF, JPG ou PNG até 10 MB).
          </p>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {(['Aguardando comprovante', 'Comprovada', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todas elegíveis' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar nota, prestador ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {notasList.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            Nenhuma nota fiscal encontrada neste filtro.
          </div>
        ) : (
          notasList.map((nota) => {
            const countComp = comprovantes.filter((c) => c.notaId === nota.id).length;
            const safeMeta = getSafeProviderMeta(nota.prestadorId);
            return (
              <div
                key={nota.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-teal-400 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 text-base">{nota.numero}</span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        nota.status === 'Comprovada'
                          ? 'bg-teal-100 text-teal-800 border border-teal-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {nota.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-800">{safeMeta.nome}</div>
                    <div className="text-xs text-teal-700 font-semibold">{safeMeta.funcao}</div>
                    <div className="text-xs text-slate-500">{safeMeta.empresa}</div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500">
                      CNPJ: {safeMeta.cnpj}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valor da Nota:</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        R$ {nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Comprovantes anexados:</span>
                      <span className="font-bold text-teal-700 tabular-nums">{countComp}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedNota(nota);
                    setSelectedFiles([]);
                    setStagedItems([]);
                    setValorInput('');
                    setDescricao('');
                    setErrorMsg('');
                    setProgress(0);
                  }}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {canAttach ? 'Abrir Nota e Anexar Comprovantes' : 'Visualizar Comprovantes'}
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Note Modal: External-matched Comprovantes / Expense Launch UI */}
      {selectedNota && (
        <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-4 flex items-center justify-center backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg truncate">
                  Nota {selectedNota.numero} • {getSafeProviderMeta(selectedNota.prestadorId).nome}
                </h3>
                <p className="text-xs text-teal-300 truncate">
                  {getSafeProviderMeta(selectedNota.prestadorId).empresa} • CNPJ:{' '}
                  {getSafeProviderMeta(selectedNota.prestadorId).cnpj}
                </p>
              </div>
              <button
                onClick={() => setSelectedNota(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-xs flex-1 bg-slate-50/50">
              {/* Read-only Note Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider">
                    Dados da Nota Fiscal (Somente Leitura)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Nota emitida antes do serviço (
                    {new Date(selectedNota.dataEmissao).toLocaleDateString('pt-BR')})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block">Valor:</span>
                    <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                      R${' '}
                      {selectedNota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status Atual:</span>
                    <span className="font-bold text-teal-700">{selectedNota.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Emitida por:</span>
                    <span className="font-bold text-slate-800">{selectedNota.criadoPorNome}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block">Descrição do Serviço:</span>
                  <p className="text-slate-800 mt-0.5">{selectedNota.descricao}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 cols: Form + Table matching Vistoriador Externo */}
                <div className="lg:col-span-2 space-y-6">
                  {canAttach && (
                    <form
                      onSubmit={handleAddToList}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Plus className="w-5 h-5 text-teal-600" />
                          <span>Adicionar Lançamento de Despesa / Comprovante</span>
                        </h4>
                        <span className="text-[11px] font-semibold text-teal-800">
                          PDF, JPG ou PNG • Máx. 10 MB • Imutável após envio
                        </span>
                      </div>

                      {errorMsg && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 font-semibold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Categoria <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value as ExpenseCategory)}
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
                            value={dataServico}
                            onChange={(e) => setDataServico(e.target.value)}
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
                            min="0.01"
                            required
                            placeholder="150.00"
                            value={valorInput}
                            onChange={(e) => setValorInput(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Comprovante (Arquivo) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFilesSelected}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1.5"
                          />
                          {selectedFiles.length > 0 && (
                            <span className="text-[10px] text-teal-700 font-semibold mt-1 block">
                              Selecionado(s): {selectedFiles.map((f) => f.file.name).join(', ')}
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
                            placeholder="Ex: Abastecimento Posto BR Rodovia SP-280 ou Relatório fotográfico"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>

                        {selectedFiles.length > 0 && (
                          <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {selectedFiles.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-xl border border-slate-200 bg-slate-50 relative"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center"
                                >
                                  ✕
                                </button>
                                {item.file.type.startsWith('image/') && item.previewUrl ? (
                                  <img
                                    src={item.previewUrl}
                                    alt={item.file.name}
                                    className="w-full h-16 object-cover rounded-lg mb-1"
                                  />
                                ) : (
                                  <div className="w-full h-16 rounded-lg bg-slate-200 flex items-center justify-center mb-1">
                                    <FileText className="w-6 h-6 text-slate-600" />
                                  </div>
                                )}
                                <p className="text-[10px] font-bold text-slate-800 truncate">
                                  {item.file.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="sm:col-span-2 flex flex-wrap justify-end gap-2.5 pt-1">
                          <button
                            type="submit"
                            disabled={uploading}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Adicionar à Lista</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleSendAll}
                            disabled={uploading || (stagedItems.length === 0 && selectedFiles.length === 0)}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>
                              {uploading
                                ? 'Enviando...'
                                : stagedItems.length > 0
                                  ? `Enviar Comprovantes (${stagedItems.length})`
                                  : 'Enviar Comprovante(s)'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {uploading && (
                        <div className="space-y-1 pt-2">
                          <div className="flex justify-between text-[11px] font-bold text-teal-800">
                            <span>Enviando comprovantes...</span>
                            <span className="tabular-nums">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-teal-600 h-2.5 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </form>
                  )}

                  {/* Lançamentos / Comprovantes Table (matching Externo) */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Lançamentos / Comprovantes ({notaComprovantes.length + stagedItems.length})
                      </h4>
                      {stagedItems.length > 0 && (
                        <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                          {stagedItems.length} pendente(s) de envio
                        </span>
                      )}
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
                          {notaComprovantes.length === 0 && stagedItems.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500">
                                Nenhum comprovante lançado ainda. Utilize o formulário acima.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {stagedItems.map((item) => (
                                <tr key={item.localId} className="bg-amber-50/40 hover:bg-amber-50/70">
                                  <td className="py-3 px-4 font-bold text-slate-800">
                                    {item.categoria}
                                    <span className="block text-[10px] font-semibold text-amber-700">
                                      Não enviado
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 tabular-nums">
                                    {new Date(item.data).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="py-3 px-4 text-slate-700">
                                    <span className="block">{item.descricao}</span>
                                    <span className="text-[10px] text-slate-400">{item.file.name}</span>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-900 tabular-nums">
                                    R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleViewStaged(item)}
                                        title="Visualizar Comprovante"
                                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-teal-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveStaged(item.localId)}
                                        title="Remover da lista"
                                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {notaComprovantes.map((comp) => (
                                <tr key={comp.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-bold text-slate-800">
                                    {comp.categoria || 'Comprovante'}
                                    <span className="block text-[10px] font-semibold text-teal-700">
                                      Enviado
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 tabular-nums">
                                    {new Date(comp.data).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="py-3 px-4 text-slate-700">
                                    <span className="block">{comp.descricao}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {comp.arquivoNome || comp.arquivoPath} • {comp.criadoPorNome}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-900 tabular-nums">
                                    {comp.valor !== undefined
                                      ? `R$ ${comp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                      : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleViewComprovante(comp)}
                                        title="Visualizar Comprovante"
                                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-teal-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadComprovante(comp)}
                                        title="Baixar Arquivo"
                                        className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            deleteComprovante(comp.id);
                                            showToast('Comprovante excluído pelo administrador.');
                                          }}
                                          title="Excluir (Admin)"
                                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right col: Resumo Financeiro (matching Externo) */}
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-6">
                    <h4 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Calculator className="w-5 h-5 text-teal-400" />
                      <span>Resumo Financeiro</span>
                    </h4>

                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Valor da Nota:</span>
                        <span className="font-bold text-white tabular-nums">
                          R$ {noteAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total de Comprovantes:</span>
                        <span className="font-bold text-teal-400 tabular-nums">
                          R${' '}
                          {totalCombinedAmount.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <span className="text-slate-400 text-xs block mb-1">
                          Balanço / Diferença:
                        </span>
                        {balanceDiff > 0 ? (
                          <div className="bg-amber-950/60 border border-amber-800 text-amber-300 p-3.5 rounded-xl text-xs">
                            <strong className="block text-sm font-bold mb-1">
                              Saldo Restante da Nota:
                            </strong>
                            R$ {balanceDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        ) : balanceDiff < 0 ? (
                          <div className="bg-indigo-950/60 border border-indigo-800 text-indigo-300 p-3.5 rounded-xl text-xs">
                            <strong className="block text-sm font-bold mb-1">
                              Valor Excedente:
                            </strong>
                            R${' '}
                            {Math.abs(balanceDiff).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        ) : (
                          <div className="bg-teal-950/60 border border-teal-800 text-teal-300 p-3.5 rounded-xl text-xs font-bold">
                            Valores conferem perfeitamente!
                          </div>
                        )}
                      </div>
                    </div>

                    {canAttach && stagedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSendAll}
                        disabled={uploading}
                        className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-900/40 transition-all"
                      >
                        {uploading
                          ? 'Enviando...'
                          : `Enviar Comprovantes (${stagedItems.length})`}
                      </button>
                    )}

                    {notaComprovantes.length > 0 && stagedItems.length === 0 && (
                      <div className="w-full py-3 bg-teal-900/60 border border-teal-700 text-teal-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{notaComprovantes.length} comprovante(s) enviado(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
