import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CadastroPrestador, ComprovanteServico, NotaFiscalEquipe } from '../../types';
import { DocumentViewerModal } from '../DocumentViewerModal';
import { downloadFile } from '../../utils/fileHelpers';
import {
  ClipboardList,
  Search,
  Maximize2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Camera,
  Eye,
  X,
  Clock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface CadastrosFullViewProps {
  onOpenPublicForm?: () => void;
}

export const CadastrosFullView: React.FC<CadastrosFullViewProps> = ({ onOpenPublicForm }) => {
  const {
    currentUser,
    cadastros,
    notasEquipe,
    comprovantes,
    concluirCadastro,
    logDownloadAuditoria,
    resolveAuthenticatedStorageUrl,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pendente' | 'Em andamento' | 'Concluído'>(
    'ALL'
  );
  const [selectedCadastro, setSelectedCadastro] = useState<CadastroPrestador | null>(null);
  const [activeBlockTab, setActiveBlockTab] = useState<'notas' | 'comprovantes'>('notas');
  const [toastMsg, setToastMsg] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    fileName: string;
    fileData?: string;
    details: Array<{ label: string; value: string }>;
  } | null>(null);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'financeiro';

  const filteredCadastros = useMemo(() => {
    return cadastros.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          c.nome.toLowerCase().includes(q) ||
          c.empresa.toLowerCase().includes(q) ||
          c.cnpj.toLowerCase().includes(q) ||
          c.cpf.toLowerCase().includes(q) ||
          c.funcao.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cadastros, statusFilter, search]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  const getCadastroStatusClass = (status: CadastroPrestador['status']) => {
    if (status === 'Concluído') return 'bg-teal-100 text-teal-800 border border-teal-200';
    if (status === 'Em andamento') return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    return 'bg-amber-100 text-amber-800 border border-amber-200';
  };

  const handleViewNotaFile = async (nota: NotaFiscalEquipe) => {
    let data = nota.arquivoData;
    if (!data && nota.arquivoPath) {
      const authUrl = await resolveAuthenticatedStorageUrl(nota.arquivoPath);
      if (authUrl) data = authUrl;
    }
    await logDownloadAuditoria('nota', nota.id, `Visualização de nota ${nota.numero} no cadastro`);
    setViewingDoc({
      title: `Nota Fiscal ${nota.numero}`,
      fileName: nota.arquivoNome || nota.arquivoPath || `nota_${nota.numero}.pdf`,
      fileData: data,
      details: [
        { label: 'Prestador', value: nota.prestadorNome },
        { label: 'Data Emissão', value: new Date(nota.dataEmissao).toLocaleDateString('pt-BR') },
        { label: 'Valor', value: `R$ ${nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      ],
    });
  };

  const handleViewCompFile = async (comp: ComprovanteServico) => {
    let data = comp.arquivoData;
    if (!data && comp.arquivoPath) {
      const authUrl = await resolveAuthenticatedStorageUrl(comp.arquivoPath);
      if (authUrl) data = authUrl;
    }
    await logDownloadAuditoria(
      'comprovante',
      comp.id,
      `Visualização de comprovante ${comp.arquivoNome || comp.id} no cadastro`
    );
    setViewingDoc({
      title: `Comprovante — ${comp.categoria ? comp.categoria + ' • ' : ''}${comp.arquivoNome || comp.id}`,
      fileName: comp.arquivoNome || comp.arquivoPath,
      fileData: data,
      details: [
        ...(comp.categoria ? [{ label: 'Categoria', value: comp.categoria }] : []),
        { label: 'Data', value: new Date(comp.data).toLocaleDateString('pt-BR') },
        { label: 'Descrição', value: comp.descricao },
        ...(comp.valor !== undefined
          ? [{ label: 'Valor', value: `R$ ${comp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }]
          : []),
        { label: 'Enviado por', value: comp.criadoPorNome },
      ],
    });
  };

  const handleBaixarTudo = async (
    cad: CadastroPrestador,
    notas: NotaFiscalEquipe[],
    comps: ComprovanteServico[]
  ) => {
    // 1. Download full dossier summary + trigger downloads of attached files
    const dossierDetails = [
      { label: 'Nome', value: cad.nome },
      { label: 'CPF / RG', value: `${cad.cpf} / ${cad.rg}` },
      { label: 'Empresa / CNPJ', value: `${cad.empresa} (${cad.cnpj})` },
      { label: 'Função', value: cad.funcao },
      { label: 'Dados Bancários / PIX', value: `${cad.dadosBancarios} | PIX: ${cad.chavePix}` },
      { label: 'Notas Emitidas', value: notas.map((n) => `${n.numero} (R$ ${n.valor.toFixed(2)})`).join('; ') || 'Nenhuma' },
      { label: 'Comprovantes Anexados', value: comps.map((c) => c.arquivoNome || c.descricao).join('; ') || 'Nenhum' },
    ];
    const dossierText = dossierDetails.map((d) => `${d.label}: ${d.value}`).join('\n');
    downloadFile(
      `dossie_${cad.nome.replace(/\s+/g, '_').toLowerCase()}.txt`,
      undefined,
      dossierText
    );

    for (const n of notas) {
      if (n.arquivoData || n.arquivoPath) {
        let data = n.arquivoData;
        if (!data && n.arquivoPath) {
          const authUrl = await resolveAuthenticatedStorageUrl(n.arquivoPath);
          if (authUrl) data = authUrl;
        }
        downloadFile(
          n.arquivoNome || `nota_${n.numero}.pdf`,
          data,
          `Nota Fiscal: ${n.numero}\nPrestador: ${n.prestadorNome}`
        );
      }
    }

    for (const c of comps) {
      let data = c.arquivoData;
      if (!data && c.arquivoPath) {
        const authUrl = await resolveAuthenticatedStorageUrl(c.arquivoPath);
        if (authUrl) data = authUrl;
      }
      downloadFile(
        c.arquivoNome || `comprovante_${c.id}.pdf`,
        data,
        `Descrição: ${c.descricao}\nEnviado por: ${c.criadoPorNome}`
      );
    }

    await logDownloadAuditoria(
      'cadastro',
      cad.id,
      `Download completo do dossiê de ${cad.nome} (${notas.length} notas, ${comps.length} comprovantes)`
    );
    showToast('Arquivos e dossiê baixados e registrados na auditoria.');
  };

  const handleConcluir = async (cad: CadastroPrestador) => {
    await concluirCadastro(cad.id);
    setSelectedCadastro((prev) =>
      prev
        ? {
            ...prev,
            status: 'Concluído',
            concluidoEm: new Date().toISOString(),
            concluidoPorUid: currentUser.id,
            concluidoPorNome: currentUser.name,
          }
        : null
    );
    showToast(`Cadastro de ${cad.nome} marcado como Concluído!`);
  };

  // Compute timeline & blocks for selectedCadastro
  const cadNotas = selectedCadastro
    ? notasEquipe.filter((n) => n.prestadorId === selectedCadastro.id)
    : [];
  const cadComps = selectedCadastro
    ? comprovantes.filter((c) => c.prestadorId === selectedCadastro.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-teal-600" />
            <span>Cadastros de Prestadores e Fluxo Completo</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe os 16 dados cadastrais, linha do tempo (Cadastro → Nota → Comprovantes →
            Concluído) e baixe documentos.
          </p>
        </div>
        {onOpenPublicForm && (
          <button
            onClick={onOpenPublicForm}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-teal-400" />
            <span>Abrir Formulário Público (16 campos)</span>
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {(['ALL', 'Pendente', 'Em andamento', 'Concluído'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todos' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar nome, CPF, CNPJ, empresa ou função..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>
      </div>

      {/* Cadastros Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Prestador / Função</th>
                <th className="py-3.5 px-6">Empresa / CNPJ</th>
                <th className="py-3.5 px-6">Notas / Comprovantes</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCadastros.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Nenhum cadastro encontrado.
                  </td>
                </tr>
              ) : (
                filteredCadastros.map((cad) => {
                  const notasCount = notasEquipe.filter((n) => n.prestadorId === cad.id).length;
                  const compsCount = comprovantes.filter((c) => c.prestadorId === cad.id).length;
                  return (
                    <tr key={cad.id} className="hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{cad.nome}</div>
                        <div className="text-slate-600">{cad.funcao}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">{cad.empresa}</div>
                        <div className="font-mono tabular-nums text-slate-500">{cad.cnpj}</div>
                      </td>
                      <td className="py-4 px-6 tabular-nums">
                        <span className="font-bold text-indigo-700">{notasCount} nota(s)</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="font-bold text-teal-700">
                          {compsCount} comprovante(s)
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${getCadastroStatusClass(
                            cad.status
                          )}`}
                        >
                          {cad.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedCadastro(cad);
                            setActiveBlockTab('notas');
                          }}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                          <span>Tela Cheia</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full-Screen Cadastro Modal */}
      {selectedCadastro && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="bg-slate-900 text-white px-7 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-extrabold">{selectedCadastro.nome}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${getCadastroStatusClass(
                      selectedCadastro.status
                    )}`}
                  >
                    {selectedCadastro.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {selectedCadastro.funcao} • {selectedCadastro.empresa} ({selectedCadastro.cnpj})
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => handleBaixarTudo(selectedCadastro, cadNotas, cadComps)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-teal-400" />
                  <span>Baixar Tudo</span>
                </button>
                {isAdmin && selectedCadastro.status !== 'Concluído' && (
                  <button
                    onClick={() => handleConcluir(selectedCadastro)}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar como Concluído</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCadastro(null)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-7 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Workflow Timeline: Cadastro -> Nota emitida -> Comprovantes -> Concluído */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h4 className="font-extrabold text-slate-900 text-sm mb-4">
                  Linha do Tempo do Fluxo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Step 1: Cadastro */}
                  <div className="p-4 rounded-xl bg-white border border-teal-300">
                    <div className="flex items-center gap-2 font-bold text-teal-800">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      <span>1. Cadastro</span>
                    </div>
                    <p className="text-slate-600 mt-2">
                      {new Date(selectedCadastro.criadoEm).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      Formulário público (16 campos)
                    </p>
                  </div>

                  {/* Step 2: Nota emitida */}
                  {(() => {
                    const firstNota = cadNotas[cadNotas.length - 1] || cadNotas[0];
                    return (
                      <div
                        className={`p-4 rounded-xl bg-white border ${
                          firstNota ? 'border-indigo-300' : 'border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          {firstNota ? (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          )}
                          <span>2. Nota emitida</span>
                        </div>
                        <p className="text-slate-600 mt-2">
                          {firstNota
                            ? `${new Date(firstNota.criadoEm).toLocaleString('pt-BR')} (${firstNota.numero})`
                            : 'Aguardando emissão'}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          {firstNota ? `Por ${firstNota.criadoPorNome}` : 'Vistoriador Externo – Notas'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 3: Comprovantes */}
                  {(() => {
                    const firstComp = cadComps[cadComps.length - 1] || cadComps[0];
                    return (
                      <div
                        className={`p-4 rounded-xl bg-white border ${
                          firstComp ? 'border-teal-300' : 'border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          {firstComp ? (
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          )}
                          <span>3. Comprovantes</span>
                        </div>
                        <p className="text-slate-600 mt-2">
                          {firstComp
                            ? `${new Date(firstComp.criadoEm).toLocaleString('pt-BR')} (${cadComps.length} arquivo(s))`
                            : 'Aguardando comprovação'}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          {firstComp
                            ? `Por ${firstComp.criadoPorNome}`
                            : 'Vistoriador AMETA'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 4: Concluído */}
                  <div
                    className={`p-4 rounded-xl bg-white border ${
                      selectedCadastro.status === 'Concluído'
                        ? 'border-purple-300'
                        : 'border-slate-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      {selectedCadastro.status === 'Concluído' ? (
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400" />
                      )}
                      <span>4. Concluído</span>
                    </div>
                    <p className="text-slate-600 mt-2">
                      {selectedCadastro.concluidoEm
                        ? new Date(selectedCadastro.concluidoEm).toLocaleString('pt-BR')
                        : 'Aguardando conclusão (Fin. & Coord.)'}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {selectedCadastro.concluidoPorNome
                        ? `Por ${selectedCadastro.concluidoPorNome}`
                        : 'Financeiro & Coordenação'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 16 Fields Grid */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Ficha Cadastral Completa (16 campos)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ['1. Nome', selectedCadastro.nome],
                    ['2. CPF', selectedCadastro.cpf],
                    ['3. RG', selectedCadastro.rg],
                    ['4. Nascimento', selectedCadastro.dataNascimento],
                    ['5. Filiação (Mãe)', selectedCadastro.filiacaoMae],
                    ['6. Filiação (Pai)', selectedCadastro.filiacaoPai],
                    ['7. Função', selectedCadastro.funcao],
                    ['8. Empresa', selectedCadastro.empresa],
                    ['9. CNPJ', selectedCadastro.cnpj],
                    ['10. Telefone', selectedCadastro.telefone],
                    ['11. E-mail', selectedCadastro.email],
                    ['12. CEP', selectedCadastro.cep],
                    ['13. Endereço', selectedCadastro.endereco],
                    ['14. Cidade / UF', selectedCadastro.cidadeUf],
                    ['15. Dados Bancários', selectedCadastro.dadosBancarios],
                    ['16. Chave PIX', selectedCadastro.chavePix],
                  ].map(([label, val]) => (
                    <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        {label}
                      </span>
                      <span className="font-semibold text-slate-900 mt-0.5 block break-words">
                        {val || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs / Blocks: Notas fiscais & Comprovantes */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50">
                  <button
                    onClick={() => setActiveBlockTab('notas')}
                    className={`px-6 py-3.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors ${
                      activeBlockTab === 'notas'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Notas fiscais ({cadNotas.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveBlockTab('comprovantes')}
                    className={`px-6 py-3.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-colors ${
                      activeBlockTab === 'comprovantes'
                        ? 'border-teal-600 text-teal-700 bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Comprovantes ({cadComps.length})</span>
                  </button>
                </div>

                <div className="p-5">
                  {activeBlockTab === 'notas' ? (
                    cadNotas.length === 0 ? (
                      <div className="py-8 text-center text-slate-500">
                        Nenhuma nota fiscal emitida para este prestador ainda.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cadNotas.map((nota) => (
                          <div
                            key={nota.id}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {nota.numero}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                  <ShieldCheck className="w-3 h-3" />
                                  Nota emitida antes do serviço (
                                  {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')})
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                                  {nota.status}
                                </span>
                              </div>
                              <p className="text-slate-700">{nota.descricao}</p>
                              <p className="text-[11px] text-slate-500">
                                Valor:{' '}
                                <strong className="text-slate-900 tabular-nums">
                                  R$ {nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </strong>{' '}
                                • Emitida por {nota.criadoPorNome} em{' '}
                                {new Date(nota.criadoEm).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            {(nota.arquivoNome || nota.arquivoPath || nota.arquivoData) && (
                              <button
                                onClick={() => handleViewNotaFile(nota)}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-400" />
                                <span>Ver Anexo</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  ) : cadComps.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      Nenhum comprovante anexado para este prestador ainda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cadComps.map((comp) => (
                        <div
                          key={comp.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {comp.categoria && (
                                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                                  {comp.categoria}
                                </span>
                              )}
                              {comp.valor !== undefined && (
                                <span className="font-extrabold text-slate-900 text-xs tabular-nums">
                                  R$ {comp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-900 truncate">
                              {comp.arquivoNome || comp.arquivoPath}
                            </p>
                            <p className="text-slate-700 line-clamp-2">{comp.descricao}</p>
                            <p className="text-[11px] text-slate-500">
                              {new Date(comp.data).toLocaleDateString('pt-BR')} • Por{' '}
                              {comp.criadoPorNome}
                            </p>
                          </div>
                          <button
                            onClick={() => handleViewCompFile(comp)}
                            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold flex items-center gap-1.5 shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
