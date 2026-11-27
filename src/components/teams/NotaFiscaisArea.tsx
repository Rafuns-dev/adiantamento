import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { CadastroPrestador, NotaFiscalEquipe, NotaEquipeStatus } from '../../types';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { isImageFile, isPdfFile, isXmlFile } from '../../utils/fileHelpers';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Download,
  Maximize2,
  Edit3,
  Trash2,
  Send,
  Eye,
  Upload,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  X,
} from 'lucide-react';

export const NotaFiscaisArea: React.FC = () => {
  const {
    currentUser,
    cadastros,
    notasEquipe,
    createNotaEquipe,
    updateNotaEquipe,
    releaseNotaForComprovante,
    deleteNotaEquipe,
    logDownloadAuditoria,
    resolveAuthenticatedStorageUrl,
  } = useApp();

  // Search & filters
  const [providerQuery, setProviderQuery] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | NotaEquipeStatus>('ALL');
  const [filterPrestadorId, setFilterPrestadorId] = useState('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Form / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaFiscalEquipe | null>(null);
  const [selectedPrestador, setSelectedPrestador] = useState<CadastroPrestador | null>(null);
  const [numero, setNumero] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Fullscreen & Document Viewer
  const [fullscreenNota, setFullscreenNota] = useState<NotaFiscalEquipe | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    fileName: string;
    fileData?: string;
    details: Array<{ label: string; value: string }>;
  } | null>(null);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'financeiro';
  const canCreateNota = currentUser.role === 'vistoria_nota' || isAdmin;

  // NEVER expose CPF, RG, or filiação — only nome, funcao, cnpj, empresa
  const filteredProviders = useMemo(() => {
    const q = providerQuery.trim().toLowerCase();
    if (!q) return cadastros;
    return cadastros.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.cnpj.toLowerCase().includes(q) ||
        c.funcao.toLowerCase().includes(q) ||
        c.empresa.toLowerCase().includes(q)
    );
  }, [cadastros, providerQuery]);

  const filteredNotas = useMemo(() => {
    return notasEquipe.filter((n) => {
      if (filterStatus !== 'ALL' && n.status !== filterStatus) return false;
      if (filterPrestadorId !== 'ALL' && n.prestadorId !== filterPrestadorId) return false;
      if (dateStart && n.dataEmissao < dateStart) return false;
      if (dateEnd && n.dataEmissao > dateEnd) return false;
      if (listSearch.trim()) {
        const q = listSearch.trim().toLowerCase();
        const match =
          n.numero.toLowerCase().includes(q) ||
          n.prestadorNome.toLowerCase().includes(q) ||
          n.prestadorCnpj.toLowerCase().includes(q) ||
          n.descricao.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [notasEquipe, filterStatus, filterPrestadorId, dateStart, dateEnd, listSearch]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  const openCreateModal = (prestador: CadastroPrestador) => {
    setEditingNota(null);
    setSelectedPrestador(prestador);
    setNumero('');
    setDataEmissao(new Date().toISOString().slice(0, 10));
    setValor('');
    setDescricao('');
    setObservacoes('');
    setSelectedFile(null);
    setUploadProgress(0);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (nota: NotaFiscalEquipe) => {
    const prest = cadastros.find((c) => c.id === nota.prestadorId) || null;
    setEditingNota(nota);
    setSelectedPrestador(prest);
    setNumero(nota.numero);
    setDataEmissao(nota.dataEmissao);
    setValor(String(nota.valor));
    setDescricao(nota.descricao);
    setObservacoes(nota.observacoes || '');
    setSelectedFile(null);
    setUploadProgress(0);
    setFormError('');
    setModalOpen(true);
  };

  const validateDateNotBeyond90Days = (dateStr: string): boolean => {
    const chosen = new Date(dateStr + 'T00:00:00');
    const maxFuture = new Date();
    maxFuture.setHours(0, 0, 0, 0);
    maxFuture.setDate(maxFuture.getDate() + 90);
    return chosen <= maxFuture;
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('');
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validType = isPdfFile(file) || isXmlFile(file) || isImageFile(file);
    if (!validType) {
      setFormError('Envie foto (JPG, PNG, WEBP), PDF ou XML da Nota Fiscal.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setFormError('O arquivo excede o limite máximo de 15 MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedPrestador) {
      setFormError('É obrigatório selecionar um prestador cadastrado.');
      return;
    }
    if (!validateDateNotBeyond90Days(dataEmissao)) {
      setFormError('A data de emissão não pode ultrapassar 90 dias no futuro.');
      return;
    }
    const parsedValor = parseFloat(valor);
    if (isNaN(parsedValor) || parsedValor <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    setSaving(true);
    try {
      if (editingNota) {
        await updateNotaEquipe(
          editingNota.id,
          {
            numero,
            dataEmissao,
            valor: parsedValor,
            descricao,
            observacoes,
          },
          selectedFile,
          setUploadProgress
        );
        showToast(`Nota ${numero} atualizada com sucesso.`);
      } else {
        await createNotaEquipe(
          {
            prestadorId: selectedPrestador.id,
            numero,
            dataEmissao,
            valor: parsedValor,
            descricao,
            observacoes,
          },
          selectedFile,
          setUploadProgress
        );
        showToast(`Nota ${numero} registrada (emitida antes do serviço).`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar nota fiscal.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    const rows = filteredNotas.map((n) => ({
      'Número NF': n.numero,
      Prestador: n.prestadorNome,
      Empresa: n.prestadorEmpresa || '-',
      Função: n.prestadorFuncao || '-',
      CNPJ: n.prestadorCnpj,
      'Data Emissão': n.dataEmissao,
      'Valor (R$)': n.valor,
      Status: n.status,
      Descrição: n.descricao,
      Observações: n.observacoes || '',
      'Emitido Por': n.criadoPorNome,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notas Fiscais');
    XLSX.writeFile(wb, `ameta_notas_fiscais_${new Date().toISOString().slice(0, 10)}.xlsx`);
    logDownloadAuditoria(
      'nota',
      'exportacao-excel',
      `Exportação Excel com ${rows.length} notas fiscais`
    );
    showToast('Planilha Excel exportada com sucesso.');
  };

  const handleOpenAttachment = async (nota: NotaFiscalEquipe) => {
    let resolvedData = nota.arquivoData;
    if (!resolvedData && nota.arquivoPath) {
      const authUrl = await resolveAuthenticatedStorageUrl(nota.arquivoPath);
      if (authUrl) resolvedData = authUrl;
    }
    await logDownloadAuditoria(
      'nota',
      nota.id,
      `Visualização/Download do anexo da nota ${nota.numero}`
    );
    setViewingDoc({
      title: `Nota Fiscal ${nota.numero} — ${nota.prestadorNome}`,
      fileName: nota.arquivoNome || nota.arquivoPath || `nota_${nota.numero}.pdf`,
      fileData: resolvedData,
      details: [
        { label: 'Prestador', value: nota.prestadorNome },
        { label: 'CNPJ', value: nota.prestadorCnpj },
        { label: 'Data de Emissão', value: new Date(nota.dataEmissao).toLocaleDateString('pt-BR') },
        { label: 'Valor', value: `R$ ${nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { label: 'Status', value: nota.status },
      ],
    });
  };

  const getStatusBadge = (status: NotaEquipeStatus) => {
    if (status === 'Emitida') {
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    }
    if (status === 'Aguardando comprovante') {
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    }
    return 'bg-teal-100 text-teal-800 border border-teal-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            <span>Notas Fiscais — Vistoriador Externo</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre notas emitidas antes do serviço, anexe PDF/XML e encaminhe para o Vistoriador AMETA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Provider Selector (Strict privacy: nome, funcao, cnpj, empresa ONLY) */}
      {canCreateNota && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Selecionar Prestador para Registrar Nota
              </h3>
              <p className="text-xs text-slate-500">
                Busque por nome, CNPJ ou função. Dados pessoais sensíveis ficam ocultos.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, CNPJ ou função..."
                value={providerQuery}
                onChange={(e) => setProviderQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
            {filteredProviders.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500">
                Nenhum prestador encontrado para esta busca.
              </div>
            ) : (
              filteredProviders.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm truncate">{p.nome}</div>
                    <div className="text-xs font-semibold text-indigo-700 truncate">{p.funcao}</div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.empresa}</span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500">
                      CNPJ: {p.cnpj}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateModal(p)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar nota</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Filters & List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              Notas Fiscais Registradas ({filteredNotas.length})
            </h3>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              Regra: Nota emitida antes do serviço
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="relative lg:col-span-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar NF, CNPJ ou descrição..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <select
              value={filterPrestadorId}
              onChange={(e) => setFilterPrestadorId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="ALL">Todos os prestadores</option>
              {cadastros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | NotaEquipeStatus)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="ALL">Todos os status</option>
              <option value="Emitida">Emitida</option>
              <option value="Aguardando comprovante">Aguardando comprovante</option>
              <option value="Comprovada">Comprovada</option>
            </select>

            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              title="Data inicial"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />

            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              title="Data final"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-5">Nota / Selo</th>
                <th className="py-3.5 px-5">Prestador</th>
                <th className="py-3.5 px-5">Emissão</th>
                <th className="py-3.5 px-5">Valor</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNotas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhuma nota fiscal encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredNotas.map((nota) => {
                  const canEdit =
                    isAdmin ||
                    (currentUser.role === 'vistoria_nota' &&
                      nota.criadoPorUid === currentUser.id &&
                      nota.status === 'Emitida');
                  const canRelease = canCreateNota && nota.status === 'Emitida';

                  return (
                    <tr key={nota.id} className="hover:bg-slate-50/80">
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900 text-sm">{nota.numero}</div>
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3" />
                          Nota emitida antes do serviço ({new Date(nota.dataEmissao).toLocaleDateString('pt-BR')})
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{nota.prestadorNome}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {nota.prestadorCnpj}
                        </div>
                      </td>
                      <td className="py-4 px-5 tabular-nums text-slate-700">
                        {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-5 font-extrabold text-slate-900 tabular-nums">
                        R$ {nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block ${getStatusBadge(
                            nota.status
                          )}`}
                        >
                          {nota.status}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setFullscreenNota(nota)}
                            title="Visualizar em tela cheia"
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          {(nota.arquivoNome || nota.arquivoPath || nota.arquivoData) && (
                            <button
                              onClick={() => handleOpenAttachment(nota)}
                              title="Abrir anexo da nota"
                              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-teal-400" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(nota)}
                              title="Editar nota"
                              className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canRelease && (
                            <button
                              onClick={() => {
                                releaseNotaForComprovante(nota.id);
                                showToast(`Nota ${nota.numero} liberada para Comprovantes.`);
                              }}
                              title="Enviar para Comprovantes (Vistoria Ameta)"
                              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1 transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>Liberar Comp.</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                deleteNotaEquipe(nota.id);
                                showToast(`Nota ${nota.numero} excluída.`);
                              }}
                              title="Excluir nota (Admin)"
                              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Create / Edit Modal */}
      {modalOpen && selectedPrestador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">
                  {editingNota ? `Editar Nota ${editingNota.numero}` : 'Registrar Nota Fiscal'}
                </h3>
                <p className="text-xs text-indigo-300">
                  {selectedPrestador.nome} • {selectedPrestador.empresa} ({selectedPrestador.cnpj})
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Regra de negócio: esta nota será marcada como "Nota emitida antes do serviço".
                </span>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Número da Nota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NF-2026-205"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Data de Emissão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Valor (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Descrição do Serviço <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva o serviço técnico que será executado..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Informações adicionais de faturamento..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Anexo Opcional da Nota (Foto, PDF ou XML, máx. 15 MB)
                </label>
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-4 text-center">
                  <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
                  <input
                    type="file"
                    accept="image/*,.pdf,.xml"
                    onChange={handleFilePick}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-[11px] font-bold text-indigo-700 mt-2">
                      Selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  {saving && uploadProgress > 0 && (
                    <div className="mt-2 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold shadow-md"
                >
                  {saving ? 'Salvando...' : editingNota ? 'Salvar Alterações' : 'Registrar Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Detail Modal */}
      {fullscreenNota && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-7 py-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-extrabold">Nota Fiscal {fullscreenNota.numero}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${getStatusBadge(
                      fullscreenNota.status
                    )}`}
                  >
                    {fullscreenNota.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Nota emitida antes do serviço •{' '}
                    {new Date(fullscreenNota.dataEmissao).toLocaleDateString('pt-BR')}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setFullscreenNota(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto space-y-6 text-sm flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Prestador
                  </span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {fullscreenNota.prestadorNome}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    CNPJ
                  </span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    {fullscreenNota.prestadorCnpj}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Valor da Nota
                  </span>
                  <span className="font-extrabold text-teal-700 text-lg tabular-nums mt-1 block">
                    R${' '}
                    {fullscreenNota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Registrado por
                  </span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {fullscreenNota.criadoPorNome}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-500 block mb-1">
                    Descrição do Serviço
                  </span>
                  <p className="text-slate-800 leading-relaxed">{fullscreenNota.descricao}</p>
                </div>
                {fullscreenNota.observacoes && (
                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-xs font-bold uppercase text-slate-500 block mb-1">
                      Observações
                    </span>
                    <p className="text-slate-700">{fullscreenNota.observacoes}</p>
                  </div>
                )}
              </div>

              {(fullscreenNota.arquivoNome || fullscreenNota.arquivoPath) && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 block">
                      Arquivo Anexado
                    </span>
                    <span className="text-xs font-mono text-indigo-700">
                      {fullscreenNota.arquivoNome || fullscreenNota.arquivoPath}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenAttachment(fullscreenNota)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visualizar / Baixar</span>
                  </button>
                </div>
              )}
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
